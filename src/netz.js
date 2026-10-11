// Online-Mehrspieler: zwei Browser, eine Partie -- ohne eigenen Server.
//
// Gleichschritt (Lockstep): Beide Rechner rechnen dieselbe deterministische
// Simulation. Ueber das Netz gehen nur Befehle. Was ein Spieler in Tick T
// befiehlt, wirkt in Tick T + VERZUG auf beiden Seiten; ein Tick wird erst
// gerechnet, wenn die Befehle beider Spieler fuer ihn da sind. Alle
// PRUEF_TAKT Ticks tauschen beide eine Pruefsumme -- weicht sie ab, sind die
// Welten auseinandergelaufen ("asynchron").
//
// Verbindung: WebRTC-Datenkanal. Statt eines Vermittlungsservers tauschen die
// Spieler zwei Codes von Hand aus (Chat, Mail): der Gastgeber schickt ein
// Angebot, der Gast eine Antwort. Ein oeffentlicher STUN-Server hilft nur,
// die eigene Adresse hinter dem Router zu finden; die Spieldaten gehen direkt
// von Browser zu Browser.

import { hash } from './sim/sim.js';

export const VERZUG = 3; // Ticks zwischen Befehl und Wirkung (300 ms) -- deckt die Laufzeit im Netz
const PRUEF_TAKT = 100;
const STUN = [{ urls: 'stun:stun.l.google.com:19302' }];

// ------------------------------------------------------------ Gleichschritt (ohne Netz, testbar)

/** ich: eigener Sitzplatz (0 Gastgeber, 1 Gast). */
export function neuerGleichschritt(ich, verzug = VERZUG) {
  const zuege = {};
  for (let t = 0; t < verzug; t++) zuege[t] = [[], []]; // die ersten Ticks sind leer
  return { ich, verzug, zuege, gesendet: verzug - 1, eigeneHashes: {}, fremdeHashes: {}, asynchron: -1 };
}

function gsEintragen(g, tick, p, befehle) {
  if (!g.zuege[tick]) g.zuege[tick] = [null, null];
  g.zuege[tick][p] = befehle;
}

/**
 * Einmal je Tick vor dem Rechnen: die eigenen neuen Befehle fuer Tick
 * world.tick + verzug festlegen und abschicken. Was waehrend des Wartens dazukommt,
 * bleibt in world.pending und geht mit dem naechsten Tick.
 */
export function gsSenden(g, world, senden) {
  const ziel = world.tick + g.verzug;
  if (g.gesendet >= ziel) return;
  const eigene = JSON.parse(JSON.stringify(world.pending.filter((c) => c.player === g.ich)));
  world.pending.length = 0;
  gsEintragen(g, ziel, g.ich, eigene);
  g.gesendet = ziel;
  senden({ t: 'zug', tick: ziel, befehle: eigene });
}

/** Sind die Befehle beider Spieler fuer diesen Tick da? */
export function gsBereit(g, tick) {
  const z = g.zuege[tick];
  return !!z && !!z[0] && !!z[1];
}

/** Nachricht des Mitspielers verarbeiten. */
export function gsEmpfangen(g, msg) {
  if (msg.t === 'zug') gsEintragen(g, msg.tick, 1 - g.ich, msg.befehle);
  else if (msg.t === 'pruef') {
    g.fremdeHashes[msg.tick] = msg.h;
    gsVergleichen(g, msg.tick);
  }
}

/**
 * Befehle beider fuer den aktuellen Tick einsetzen (Gastgeber zuerst, auf
 * beiden Seiten gleich). Liefert die eigenen, noch nicht verschickten
 * Befehle -- nach step() mit gsNachSchritt wieder anhaengen.
 */
export function gsEinsetzen(g, world) {
  const z = g.zuege[world.tick];
  const offen = world.pending.splice(0);
  for (const c of z[0]) world.pending.push(c);
  for (const c of z[1]) world.pending.push(c);
  delete g.zuege[world.tick];
  return offen;
}

/** Nach step(): offene eigene Befehle zurueck, ab und zu die Pruefsumme tauschen. */
export function gsNachSchritt(g, world, offen, senden) {
  for (const c of offen) world.pending.push(c);
  if (world.tick % PRUEF_TAKT === 0) {
    g.eigeneHashes[world.tick] = hash(world);
    senden({ t: 'pruef', tick: world.tick, h: g.eigeneHashes[world.tick] });
    gsVergleichen(g, world.tick);
  }
}

function gsVergleichen(g, tick) {
  const a = g.eigeneHashes[tick];
  const b = g.fremdeHashes[tick];
  if (a === undefined || b === undefined) return;
  if (a !== b && g.asynchron < 0) g.asynchron = tick;
  delete g.eigeneHashes[tick];
  delete g.fremdeHashes[tick];
}

// ------------------------------------------------------------ Verbindung (nur im Browser)

/** Beschreibung als kurzer Text: JSON, gepackt (wenn der Browser es kann), Base64. */
async function packen(obj) {
  const text = JSON.stringify(obj);
  if (typeof CompressionStream === 'undefined') return 'J' + btoa(unescape(encodeURIComponent(text)));
  const strom = new Blob([text]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  const bytes = new Uint8Array(await new Response(strom).arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return 'D' + btoa(bin);
}
async function entpacken(code) {
  const c = (code || '').replace(/\s+/g, '');
  if (c[0] === 'J') return JSON.parse(decodeURIComponent(escape(atob(c.slice(1)))));
  if (c[0] !== 'D' || typeof DecompressionStream === 'undefined') throw new Error('Kein gültiger Code.');
  const bin = atob(c.slice(1));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const strom = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return JSON.parse(await new Response(strom).text());
}

/** Warten, bis alle Adressen gesammelt sind (hoechstens 5 s) -- dann passt alles in einen Code. */
function adressenSammeln(pc) {
  return new Promise((fertig) => {
    if (pc.iceGatheringState === 'complete') return fertig();
    const pruefe = () => {
      if (pc.iceGatheringState !== 'complete') return;
      pc.removeEventListener('icegatheringstatechange', pruefe);
      fertig();
    };
    pc.addEventListener('icegatheringstatechange', pruefe);
    setTimeout(fertig, 5000);
  });
}

function kanalVerdrahten(kanal, bei) {
  kanal.onopen = () => bei.offen(kanal);
  kanal.onmessage = (e) => bei.nachricht(JSON.parse(e.data));
  kanal.onclose = () => bei.zu();
}
function neueVerbindung(bei) {
  const pc = new RTCPeerConnection({ iceServers: STUN });
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'failed') bei.zu('Verbindung fehlgeschlagen — vielleicht lässt ein Router sie nicht durch.');
  };
  return pc;
}

/** Gastgeber: liefert { code, antwort(code) }; bei: { offen(kanal), nachricht(msg), zu(grund) }. */
export async function netzGastgeber(bei) {
  const pc = neueVerbindung(bei);
  const kanal = pc.createDataChannel('spiel', { ordered: true });
  kanalVerdrahten(kanal, bei);
  await pc.setLocalDescription(await pc.createOffer());
  await adressenSammeln(pc);
  return {
    pc,
    code: await packen(pc.localDescription),
    antwort: async (code) => pc.setRemoteDescription(await entpacken(code)),
  };
}

/** Gast: nimmt den Code des Gastgebers, liefert { code } (die Antwort). */
export async function netzGast(angebot, bei) {
  const pc = neueVerbindung(bei);
  pc.ondatachannel = (e) => kanalVerdrahten(e.channel, bei);
  await pc.setRemoteDescription(await entpacken(angebot));
  await pc.setLocalDescription(await pc.createAnswer());
  await adressenSammeln(pc);
  return { pc, code: await packen(pc.localDescription) };
}

export function netzSenden(kanal, msg) {
  if (kanal && kanal.readyState === 'open') kanal.send(JSON.stringify(msg));
}

// ------------------------------------------------------------ Startbildschirm und Dialoge

export function onlineHtml() {
  return `<div class="online"><b>🌐 Online gegen einen Menschen</b>
    <button id="onlineEroeffnen">Spiel eröffnen</button><button id="onlineBeitreten">Beitreten</button>
    <span>Beta — zwei Browser, Codes per Chat austauschen</span></div>`;
}

function gastgeberHtml(karteName) {
  return `<div class="vorwort online-dialog"><div class="kapitel">Online · Gastgeber</div><h1>Spiel eröffnen</h1>
    <p>Du spielst <label><input type="radio" name="onlineVolk" value="mensch" checked> Menschen</label>
    <label><input type="radio" name="onlineVolk" value="gott"> Gott</label> auf der Karte <b>${karteName}</b>.</p>
    <p>1. Schicke diesen Code deinem Mitspieler (Chat, Mail …):</p>
    <textarea id="onlineCode" readonly rows="3">Code wird erzeugt …</textarea>
    <div class="go"><button id="onlineKopieren" disabled>Kopieren</button></div>
    <p>2. Füge hier seine Antwort ein:</p>
    <textarea id="onlineAntwort" rows="3" placeholder="Antwort-Code"></textarea>
    <div class="go"><button id="onlineVerbinden">Verbinden</button><button id="onlineZurueck">Zurück</button></div>
    <p id="onlineStatus" class="status"></p></div>`;
}

function gastHtml() {
  return `<div class="vorwort online-dialog"><div class="kapitel">Online · Gast</div><h1>Beitreten</h1>
    <p>1. Füge den Code des Gastgebers ein:</p>
    <textarea id="onlineCode" rows="3" placeholder="Code des Gastgebers"></textarea>
    <div class="go"><button id="onlineWeiter">Weiter</button></div>
    <p>2. Schicke diese Antwort zurück:</p>
    <textarea id="onlineAntwort" readonly rows="3"></textarea>
    <div class="go"><button id="onlineKopieren" disabled>Kopieren</button><button id="onlineZurueck">Zurück</button></div>
    <p id="onlineStatus" class="status"></p></div>`;
}

const netzEl = (id) => document.getElementById(id);
function netzStatus(text) {
  const s = netzEl('onlineStatus');
  if (s) s.textContent = text;
}
function kopierKnopf(feld) {
  const k = netzEl('onlineKopieren');
  k.disabled = false;
  k.onclick = () => {
    netzEl(feld).select();
    if (navigator.clipboard) navigator.clipboard.writeText(netzEl(feld).value).catch(() => document.execCommand && document.execCommand('copy'));
    else if (document.execCommand) document.execCommand('copy');
    netzStatus('Kopiert.');
  };
}

/**
 * Dialog des Gastgebers. k: { karte() -> { schluessel, daten }, start(config, ich, kanal),
 * nachricht(msg), zu(grund), zurueck() }. Beim Verbinden schickt der Gastgeber die
 * Startwerte; beide beginnen gleichzeitig.
 */
export async function onlineEroeffnen(el, k) {
  const karte = k.karte();
  el.innerHTML = gastgeberHtml(karte.daten.name || karte.schluessel);
  el.style.display = '';
  netzEl('onlineZurueck').onclick = k.zurueck;
  let verbindung = null;
  let gestartet = false;
  const bei = {
    offen: (kanal) => {
      const volk = document.querySelector('input[name="onlineVolk"]:checked');
      const f = volk ? volk.value : 'mensch';
      const config = {
        t: 'start',
        stand: typeof SPIEL_STAND !== 'undefined' ? SPIEL_STAND : 'dev',
        seed: (Date.now() / 1000) | 0,
        factions: [f, f === 'mensch' ? 'gott' : 'mensch'],
        karte: karte.schluessel,
        karteDaten: karte.daten,
      };
      netzSenden(kanal, config);
      gestartet = true;
      k.start(config, 0, kanal);
    },
    nachricht: (msg) => k.nachricht(msg),
    zu: (grund) => (gestartet ? k.zu(grund) : netzStatus(grund || 'Verbindung getrennt.')),
  };
  try {
    verbindung = await netzGastgeber(bei);
  } catch (e) {
    netzStatus('Online geht in diesem Browser nicht: ' + e.message);
    return;
  }
  netzEl('onlineCode').value = verbindung.code;
  kopierKnopf('onlineCode');
  netzEl('onlineVerbinden').onclick = async () => {
    try {
      await verbindung.antwort(netzEl('onlineAntwort').value);
      netzStatus('Verbinde …');
    } catch (e) {
      netzStatus('Die Antwort passt nicht: ' + e.message);
    }
  };
}

/** Dialog des Gasts; k wie bei onlineEroeffnen (ohne karte). */
export function onlineBeitreten(el, k) {
  el.innerHTML = gastHtml();
  el.style.display = '';
  netzEl('onlineZurueck').onclick = k.zurueck;
  let gestartet = false;
  const bei = {
    offen: () => netzStatus('Verbunden — warte auf den Gastgeber …'),
    nachricht: (msg) => {
      if (msg.t === 'start') {
        const meinStand = typeof SPIEL_STAND !== 'undefined' ? SPIEL_STAND : 'dev';
        if (msg.stand !== meinStand) return netzStatus('Ihr habt verschiedene Stände des Spiels — beide bitte neu laden.');
        gestartet = true;
        k.start(msg, 1, bei.kanal);
      } else k.nachricht(msg);
    },
    zu: (grund) => (gestartet ? k.zu(grund) : netzStatus(grund || 'Verbindung getrennt.')),
  };
  const offen = bei.offen;
  bei.offen = (kanal) => {
    bei.kanal = kanal;
    offen(kanal);
  };
  netzEl('onlineWeiter').onclick = async () => {
    netzStatus('Erzeuge Antwort …');
    try {
      const v = await netzGast(netzEl('onlineCode').value, bei);
      netzEl('onlineAntwort').value = v.code;
      kopierKnopf('onlineAntwort');
      netzStatus('Schicke die Antwort zurück. Sobald der Gastgeber sie eingefügt hat, geht es los.');
    } catch (e) {
      netzStatus('Der Code passt nicht: ' + e.message);
    }
  };
}
