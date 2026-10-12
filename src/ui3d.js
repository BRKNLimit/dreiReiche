// 3D-Ansicht. Dieselbe Simulation wie die 2D-Ansicht, gezeichnet mit WebGL 2
// ohne Bibliothek: Modelle aus Grundkoerpern (Quader, Zylinder, Kegel, Kugel),
// flach schattiert, instanziert gezeichnet. Aendert den Simulationszustand
// nie direkt, nur ueber issue(). Wird von tools/bundle.mjs mit der Sim
// zusammengefuegt -- deshalb hier keine Imports.
//
// Koordinaten: Simulation in Dezimetern (x, y). Szene in Metern: x -> x,
// y -> z, Hoehe ist y. Modelle schauen entlang +z.
//
// Grafik liegt in eigenen Dateien (siehe GEMINI.md): src/render3d.js
// (Renderer, Shader), src/modelle3d.js (Modelle), src/gelaende3d.js (Boden,
// Gelaende). Hier: Spielstand, Eingabe, Zeichnen von Einheiten und Gebaeuden.

const cv3 = document.getElementById('cv3d');
const ov = document.getElementById('overlay');
const octx = ov.getContext('2d');
const mini3 = document.getElementById('mini');
const mctx3 = mini3.getContext('2d');
const gl = cv3.getContext('webgl2', { antialias: true, stencil: true });

let ME = 0; // eigener Sitzplatz -- online als Gast 1
// Darstellungsmassstab: Einheiten und Gebaeude groesser als ihr Kollisionskreis,
// wie in jedem RTS -- sonst sind 3 m grosse Soldaten auf 2 km Karte Punkte.
const ZEIGE_EINHEIT = 1.6;
const ZEIGE_GEBAEUDE = 1.25;
let meFaction = 'mensch';
let world, ai, aiMe;
let gegnerStil = 'standard';
let gegnerStufe = 'mittel'; // Schwierigkeit der Gegner-KI, im Startbildschirm waehlbar
let gegnerVolk = 'auto'; // Volk des Gegners, im Startbildschirm waehlbar (auto: das andere)
let karteSchluessel = vorgewaehlteKarte(); // Karte, im Startbildschirm waehlbar (oder vom Editor gewaehlt)
let paused = true;
let speed = 1;
let acc = 0;
let last = performance.now();
let sel = [];
let drag = null;
let placing = null;
let bauGruppeSchl = 'wirtschaft'; // aktive Gruppe der Bauleiste (BAU_GRUPPEN in ui-gemeinsam.js)
let angriff = false;
let skillsOffen = false; // T: Skillbaum
let skillSig = ''; // zuletzt gezeichneter Stand des Skillbaums
let zielen = null; // Griff gewaehlt: naechster Klick ist das Ziel (Faehigkeit)
let schlagZielen = false; // Fernschlag scharf (Taste F): naechster Klick ist das Ziel
let wirkungen = []; // Faehigkeits-Einsaetze, eine Sekunde lang sichtbar
let karteTyp = null; // Gebaeude unter der Maus in der Bauleiste
let nebel = neuerNebel(true, ME); // Nebel des Krieges; beim Zuschauen aus
let nebelFrame = 0; // Zaehler, damit das Nebelbild je Frame nur einmal entsteht
const verborgen = (e) => imNebel(nebel, e, ME);
let nebelTex = null;
let karteHtml = ''; // zuletzt gezeigte Info-Karte
let selPlan = null; // gewaehlter eigener Bauplan (kein Gebaeude, daher nicht in sel)
let gruppen = {}; // Steuergruppen: Ziffer -> Ids
let letzterKlick = { id: 0, zeit: 0 }; // fuer den Doppelklick
/** Eigene Einheiten desselben Typs, die gerade auf dem Schirm sind. */
function gleicherTypImBild(id) {
  const e0 = byId(world, id);
  if (!e0) return [id];
  return world.entities.filter((e) => !e.dead && e.player === ME && e.type === e0.type && imBild3d(e.x, e.y)).map((e) => e.id);
}
let mission = null; // laufende Mission der Kampagne (src/kampagne.js), sonst null
let missionStand = []; // erledigte Ziele der Mission
let missionGewonnen = false; // Ziele erfuellt -- die Partie haelt an
let missionMeldungen = []; // Indizes der schon gezeigten Funksprueche
let netz = null; // Online-Partie (src/netz.js): { kanal, gs, zu, wartetSeit }
let tagesAktiv = null; // laufende Tagesherausforderung (src/bilanz.js), sonst null
let tagesStart = null; // beim naechsten neu() als Tagesherausforderung starten
let funkText = ''; // aktueller Funkspruch (HTML) und bis wann er steht
let funkBis = 0;
let funkGezeigt = null;
let aufnahme = null; // laufende Aufnahme (src/aufnahme.js)
let wiederholung = null; // abgespielte Wiederholung, sonst null
let wdhZeiger = 0;
let verlauf = neuerVerlauf(); // fuer den Siegbildschirm
let endeGezeigt = false;
let hover = { x: 0, y: 0 }; // Boden unter der Maus, Dezimeter
let maus = { x: 0, y: 0 }; // Bildschirm, CSS-Pixel
const tastenGehalten = new Set();
const vorher = new Map(); // id -> [x, y] vor dem letzten Tick, fuer Interpolation
const blick = new Map(); // id -> Blickrichtung in Bogenmass
const musik = neueMusik(); // erzeugte Musik (src/musik.js), Taste N
const fx = neueEffekte(); // Geschosse, Treffer, Klaenge (src/effekte.js)
einstellungenAnwenden(einstellungenLesen(), fx, musik); // Lautstaerken, Wackeln (Menue, Einstellungen)
// Was der Spieler sehen darf -- Eigenes immer, sonst was im Nebel sichtbar ist.
const sichtbarFx = (e) => !nebel.an || e.player === ME || sieht(nebel, e.x, e.y);
/** Hoerer an der Kamera; je weiter weg die Kamera, desto weiter hoert man. */
const hoerer3d = () => ({ x: kam.x / DM, y: kam.z / DM, weite: (kam.dist / DM) * 2.2 });
const imBild3d = (x, y) => {
  const p = aufSchirm(x * DM, 0, y * DM);
  return !!p && p[0] >= 0 && p[1] >= 0 && p[0] <= cv3.clientWidth && p[1] <= cv3.clientHeight;
};
// Ton geht erst nach einer Eingabe an (Browser-Regel)
addEventListener('pointerdown', () => tonAn(fx));
addEventListener('keydown', () => tonAn(fx));
let staub = []; // { x, y, r, t }
const ausfall = new Map(); // id -> Zeitpunkt des letzten Schusses (ms), fuer den Ruck nach vorn

const kam = { x: 420, z: 420, dist: 300, yaw: -Math.PI * 0.75, pitch: 0.95 };

const teamFarbe = (p) => HEX(FACTIONS[world.players[p].faction].color);

// ------------------------------------------------------------ Kamera
let VP = new Float32Array(16);
let VP_INV = new Float32Array(16);
function kameraMatrix() {
  const w = cv3.clientWidth;
  const h = cv3.clientHeight;
  const cp = Math.cos(kam.pitch);
  const eye = [kam.x + Math.sin(kam.yaw) * cp * kam.dist, Math.sin(kam.pitch) * kam.dist, kam.z + Math.cos(kam.yaw) * cp * kam.dist];
  const proj = m4persp(0.75, w / h, 2, 6000);
  // Beben: Blickpunkt zittert kurz (Pixel grob in Meter am Boden)
  const [bx, by] = bebenVersatz(fx);
  const z = kam.dist * 0.0015;
  const view = m4look(eye, [kam.x + bx * z, by * z, kam.z + by * z], [0, 1, 0]);
  VP = m4mul(proj, view);
  VP_INV = m4inv(VP);
}
/** Weltpunkt (Meter) -> Bildschirm (CSS-Pixel) oder null hinter der Kamera. */
function aufSchirm(x, y, z) {
  const m = VP;
  const cx = m[0] * x + m[4] * y + m[8] * z + m[12];
  const cy = m[1] * x + m[5] * y + m[9] * z + m[13];
  const cw = m[3] * x + m[7] * y + m[11] * z + m[15];
  if (cw <= 0.1) return null;
  return [((cx / cw + 1) / 2) * cv3.clientWidth, ((1 - cy / cw) / 2) * cv3.clientHeight];
}
/** Bildschirm -> Punkt auf dem Boden (Dezimeter). */
function aufBoden(sx, sy) {
  const nx = (sx / cv3.clientWidth) * 2 - 1;
  const ny = 1 - (sy / cv3.clientHeight) * 2;
  const m = VP_INV;
  const p = (z) => {
    const x = m[0] * nx + m[4] * ny + m[8] * z + m[12];
    const y = m[1] * nx + m[5] * ny + m[9] * z + m[13];
    const zz = m[2] * nx + m[6] * ny + m[10] * z + m[14];
    const w = m[3] * nx + m[7] * ny + m[11] * z + m[15];
    return [x / w, y / w, zz / w];
  };
  const a = p(-1);
  const b = p(1);
  const t = a[1] / (a[1] - b[1]);
  return { x: ((a[0] + (b[0] - a[0]) * t) / DM) | 0, y: ((a[2] + (b[2] - a[2]) * t) / DM) | 0 };
}

// ------------------------------------------------------------ Spielstart
function neu(f, zuschauen = false, wdh = null, m = null, stand = null, online = null) {
  // Eine laufende Online-Partie endet mit jeder neuen
  const altesNetz = netz;
  netz = null;
  if (altesNetz && altesNetz.kanal && (!online || online.kanal !== altesNetz.kanal)) altesNetz.kanal.close();
  ME = online ? online.ich : 0;
  const ohneKI = !!online || !!(wdh && wdh.online); // online spielen zwei Menschen
  tagesAktiv = stand ? stand.extra.tages || null : online || wdh ? null : tagesStart;
  tagesStart = null;
  // Spielstand (src/spielstand.js): Welt und KI von dort, Einstellungen aus extra
  const geladen = stand ? zustandLaden(stand.zustand) : null;
  if (stand) {
    gegnerStil = stand.extra.gegnerStil;
    gegnerStufe = stand.extra.gegnerStufe;
    karteSchluessel = stand.extra.karteSchluessel;
    m = stand.extra.mission ? missionVon(stand.extra.mission) : null;
  }
  // Wiederholung: dieselben Startwerte wie bei der Aufnahme
  if (wdh) {
    karteSchluessel = wdh.karte;
    gegnerStil = wdh.stil;
    gegnerStufe = wdh.stufe;
  }
  // Mission: Karte, Gegner und Volk legt sie fest (auch beim Abspielen)
  if (wdh && wdh.mission) m = missionVon(wdh.mission);
  mission = m;
  missionStand = stand && stand.extra.missionStand ? stand.extra.missionStand : m ? m.ziele.map(() => false) : [];
  missionMeldungen = stand && stand.extra.missionMeldungen ? stand.extra.missionMeldungen : [];
  funkBis = 0;
  missionGewonnen = false;
  if (m) {
    karteSchluessel = m.karte;
    gegnerStil = m.stil;
    gegnerStufe = m.stufe;
    f = m.volk;
  }
  meFaction = f;
  if (online) meFaction = online.config.factions[online.ich]; // als Gast das zweite Volk
  const gegner = online
    ? online.config.factions[1]
    : wdh
      ? wdh.factions[1]
      : geladen
        ? geladen.world.players[1].faction
        : gegnerVolkFuer(f, m ? 'auto' : gegnerVolk);
  const seed = online ? online.config.seed : geladen ? geladen.world.seed : wdh ? wdh.seed : tagesAktiv ? tagesAktiv.seed : (Date.now() / 1000) | 0;
  const karte = online
    ? { schluessel: online.config.karte, daten: online.config.karteDaten || KARTEN[online.config.karte] }
    : geladen
      ? { schluessel: geladen.world.karte, daten: geladen.world.karteDaten }
      : karteFuerSpiel(karteSchluessel, wdh, seed);
  if (KARTE.schluessel !== karte.schluessel || KARTE.name !== karte.daten.name) {
    karteWaehlen(karte.schluessel, karte.daten);
    if (typeof baueBoden === 'function') bodenModell = baueBoden(); // src/gelaende3d.js liest KARTE
    if (typeof baueDeko === 'function') baueDeko(); // Baeume, Pfad je Karte (src/gelaende3d.js, Gemini)
  }
  world = geladen ? geladen.world : createWorld({ seed, factions: [f, gegner], karte: karte.schluessel, karteDaten: karte.daten });
  if (m && !geladen) m.aufbau(world);
  ai = ohneKI ? null : geladen ? geladen.ais[1] : m && m.ki === false ? null : createAI(1, world.seed, gegnerStil, gegnerStufe);
  aiMe = ohneKI ? null : geladen ? geladen.ais[0] : zuschauen ? createAI(0, world.seed + 1) : null;
  nebel = neuerNebel(!zuschauen && !wdh, ME);
  wiederholung = wdh;
  wdhZeiger = 0;
  wiederholungsHinweis = '';
  aufnahme = wdh ? null : neueAufnahme({ seed: world.seed, factions: [f, gegner], karte: karte.schluessel, karteDaten: KARTEN[karte.schluessel] ? null : karte.daten, stil: gegnerStil, stufe: gegnerStufe, zuschauen, mission: m ? m.id : null, online: !!online });
  netz = online ? { kanal: online.kanal, gs: neuerGleichschritt(online.ich), zu: '', wartetSeit: 0 } : null;
  wdhStaende = [];
  spulenBis = -1;
  wdhSicht = 'alle';
  verlauf = stand ? stand.extra.verlauf : neuerVerlauf();
  if (stand) aufnahme = stand.extra.aufnahme;
  endeGezeigt = false;
  sel = [];
  selPlan = null;
  gruppen = stand ? stand.extra.gruppen : {};
  leistenSig = '';
  placing = null;
  angriff = false;
  skillsOffen = false;
  skillSig = '';
  zielen = null;
  schlagZielen = false;
  wirkungen = [];
  vorher.clear();
  blick.clear();
  effekteLeeren(fx);
  staub = [];
  kam.x = 420;
  kam.z = 420;
  kam.dist = 300;
  kam.yaw = -Math.PI * 0.75;
  if (stand && stand.extra.kam) Object.assign(kam, stand.extra.kam);
  else if (stand && stand.extra.cam) {
    kam.x = stand.extra.cam.x * DM;
    kam.z = stand.extra.cam.y * DM;
  }
  if (ME === 1) {
    kam.x = MAP * DM - 420;
    kam.z = MAP * DM - 420;
    kam.yaw += Math.PI; // von der eigenen Seite aus
  }
  renderBar();
  zeitleisteZeigen();
}

/** Ausgewaehlte eigene Einheiten, die bauen koennen. */
function erbauer3() {
  return sel.filter((id) => {
    const e = byId(world, id);
    return e && e.kind === 'unit' && UNITS[e.type].build;
  });
}

/** Rechtsklick: auf eigene Baustelle -- Erbauer helfen mit, sonst bewegen. */
function befehl3(x, y, anhaengen = false) {
  // Rechtsklick auf eine eigene Einheit: ihrem Auftrag anschliessen
  const freund = eigeneEinheitBei(world, ME, x, y, 60, sel);
  if (freund) return mitmachen(world, ME, sel, freund, anhaengen);
  const site =
    world.entities.find(
      (b) =>
        b.kind === 'building' &&
        b.player === ME &&
        !b.dead &&
        (!b.done || b.hp < b.maxHp) &&
        (b.x - x) ** 2 + (b.y - y) ** 2 <= (BUILDINGS[b.type].radius + 80) ** 2
    ) || world.plaene.find((q) => q.player === ME && (q.x - x) ** 2 + (q.y - y) ** 2 <= (BUILDINGS[q.type].radius + 80) ** 2);
  const bauer = site ? erbauer3() : [];
  const rest = sel.filter((id) => !bauer.includes(id));
  if (bauer.length) issue(world, { type: 'bauen', player: ME, ids: bauer, id: site.id, anhaengen });
  if (rest.length) issue(world, { type: 'move', player: ME, ids: rest, x, y, anhaengen });
  // Gewaehlte Fabriken: Sammelpunkt fuer neue Einheiten
  const fabs = gewaehlteFabriken(world, sel, ME);
  if (fabs.length) issue(world, { type: 'sammelpunkt', player: ME, ids: fabs, x, y });
}

/** Die Gebaeude der aktiven Bau-Gruppe (Tasten 1-0 bauen aus ihr). */
function bauListe() {
  const gr = aktiveBauGruppe(bauGruppen(meFaction), bauGruppeSchl);
  return gr ? gr.liste : [];
}

/** Tab / Shift+Tab, Klick auf einen Reiter: Bau-Gruppe wechseln. */
function bauGruppeWechseln(schluessel) {
  bauGruppeSchl = schluessel;
  renderBar();
}

/** Ausgewaehlte eigene Fabriken, die Einheiten ausbilden koennen. */
function fabriken3() {
  return sel
    .map((id) => byId(world, id))
    .filter((e) => e && e.kind === 'building' && e.player === ME && e.done && BUILDINGS[e.type]?.buildList);
}

function renderBar() {
  const bar = document.getElementById('builds');
  const fabs = fabriken3();
  if (erbauer3().length) {
    bar.innerHTML = bauleisteHtml(world, ME, bauGruppen(meFaction), bauGruppeSchl);
  } else if (fabs.length) {
    bar.innerHTML = ausbildungsleisteHtml(world, ME, fabs);
  } else {
    bar.innerHTML = '';
  }
  document.getElementById('gruppen').innerHTML = gruppenHtml(world, sel);
  if (!erbauer3().length && !fabs.length) karteTyp = placing = null;
  for (const b of bar.querySelectorAll('[data-b]')) {
    b.onclick = () => {
      if (!gesperrt(world, ME, b.dataset.b)) placing = b.dataset.b;
    };
    b.onmouseenter = () => (karteTyp = b.dataset.b);
    b.onmouseleave = () => (karteTyp = null);
  }
  for (const b of bar.querySelectorAll('[data-reiter]')) b.onclick = () => bauGruppeWechseln(b.dataset.reiter);
  for (const b of bar.querySelectorAll('[data-produce]')) {
    b.onclick = (ev) => ausbildenVerteilt(world, ME, fabs, b.dataset.produce, ev && ev.shiftKey ? 5 : 1); // Shift: fuenf
    b.onmouseenter = () => (karteTyp = b.dataset.produce);
    b.onmouseleave = () => (karteTyp = null);
  }
}

/** Info-Karte: Gebaeude oder Einheit unter der Maus in der Leiste, sonst das, was gerade gesetzt wird. */
function infoKarte3() {
  const typ = karteTyp || placing;
  const html = typ ? (UNITS[typ] ? einheitKarte(world, ME, typ) : gebaeudeKarte(world, ME, typ)) : '';
  if (html === karteHtml) return;
  karteHtml = html;
  const el = document.getElementById('karte');
  el.innerHTML = html;
  el.hidden = !html;
}

/** Faehigkeit des Kommandanten ausloesen: ein Griff braucht ein Ziel, alles andere wirkt sofort. */
function wirkeFaehigkeit3(id) {
  if (!faehigkeitenVon(world, ME).includes(id) || faehigkeitWarten(world, ME, id)) return;
  if (FAEHIGKEITEN[id].art === 'griff') {
    zielen = id;
    placing = null;
    angriff = false;
  } else {
    issue(world, { type: 'faehigkeit', player: ME, faehigkeit: id, x: 0, y: 0 });
  }
}

/** Fernschlag scharf stellen (oder wieder abschalten): nur, wenn ein Schlaggebaeude der Auswahl feuern kann. */
function schlagScharf3() {
  if (schlagZielen) {
    schlagZielen = false;
    return;
  }
  const kann = schlagGebaeude(world, sel, ME).some((b) => schlagSchuetze(world, [b.id], ME, b.x, b.y));
  if (!kann) return;
  schlagZielen = true;
  placing = null;
  angriff = false;
  zielen = null;
}

// Knoepfe der Faehigkeiten: ein Klick loest aus. Derselbe Platz traegt den Fernschlag-Knopf.
document.getElementById('faehigkeiten').onclick = (ev) => {
  const b = ev.target && ev.target.closest ? ev.target.closest('[data-faeh]') : null;
  if (b && world) wirkeFaehigkeit3(b.dataset.faeh);
  if (world && ev.target && ev.target.closest && ev.target.closest('[data-schlag]')) schlagScharf3();
};
let faehHtml = '';

/** Knoepfe zeigen, solange der eigene Kommandant oder ein Schlaggebaeude gewaehlt ist. */
function faehPanel3() {
  const k = kommandantVon(world, ME);
  const html = (k && sel.includes(k.id) ? faehigkeitenHtml(world, ME) : '') + schlagKnopfHtml(world, sel, ME);
  if (html === faehHtml) return;
  faehHtml = html;
  const el = document.getElementById('faehigkeiten');
  el.innerHTML = html;
  el.hidden = !html;
}

// Skillbaum: ein Klick auf einen lernbaren Skill lernt ihn.
document.getElementById('skills').onclick = (ev) => {
  const b = ev.target && ev.target.closest ? ev.target.closest('[data-skill]') : null;
  if (b && world) issue(world, { type: 'lernen', player: ME, skill: b.dataset.skill });
};


// Untere Leiste: Auswahl je Typ (Klick behaelt nur diesen Typ), Bauleiste nur mit Erbauern.
let leistenSig = '';
document.getElementById('gruppen').onclick = (ev) => {
  const b = ev.target && ev.target.closest ? ev.target.closest('[data-gruppe]') : null;
  if (b && world) sel = sel.filter((id) => byId(world, id)?.type === b.dataset.gruppe);
};
document.getElementById('hilfeKnopf').onclick = () => {
  const h = document.getElementById('hilfe');
  h.hidden = !h.hidden;
};

/** Leisten neu zeichnen, sobald sich Auswahl, Skills oder Warteschlange aendern. */
function leisten3() {
  const fabs = fabriken3();
  const qSig = fabs.map((f) => f.queue.join()).join(';');
  const sig = sel.join() + '|' + selPlan + '|' + skillSignatur(world, ME) + '|' + qSig + '|' + grenzenSignatur(world, ME, fabs) + '|' + bauGruppeSchl + '|' + meFaction;
  if (sig === leistenSig) return;
  leistenSig = sig;
  renderBar();
}

/** Skillbaum und Sperren neu zeichnen, sobald sich daran etwas aendert. */
function skillPanel3() {
  const el = document.getElementById('skills');
  el.hidden = !skillsOffen;
  const sig = skillSignatur(world, ME) + (skillsOffen ? '|offen' : '');
  if (sig === skillSig) return;
  skillSig = sig;
  renderBar();
  if (skillsOffen) {
    el.innerHTML = skillBaumHtml(world, ME);
    skillLinien(el);
  }
}
// Fenstergroesse geaendert: die Karten reihen sich um, die Linien des Skillbaums muessen mit
addEventListener('resize', () => {
  const el = document.getElementById('skills');
  if (skillsOffen && el && !el.hidden) skillLinien(el);
});

// ------------------------------------------------------------ Eingabe
cv3.addEventListener('contextmenu', (e) => e.preventDefault());
// ------------------------------------------------------------ Fotomodus (P)
let fotoModus = false;
let fotoSpeichern = false; // im naechsten Bild direkt nach dem Zeichnen sichern
function fotoUmschalten() {
  fotoModus = !fotoModus;
  document.body.classList.toggle('foto', fotoModus);
  const h = document.getElementById('fotoHinweis');
  if (h) h.hidden = !fotoModus;
}
/** Direkt nach zeichne(): Leinwand als PNG herunterladen (WebGL behaelt das Bild nur bis zum naechsten Bild). */
function fotoSichern() {
  if (!fotoSpeichern || !cv3.toBlob) return;
  fotoSpeichern = false;
  cv3.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `drei-reiche-${(world.tick / 600).toFixed(1).replace('.', '-')}min.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }, 'image/png');
}

cv3.addEventListener('mousedown', (e) => {
  if (fotoModus && e.button === 0) {
    fotoSpeichern = true;
    return;
  }
  const mx = e.offsetX;
  const my = e.offsetY;
  const p = aufBoden(mx, my);
  if (e.button === 2) {
    placing = null;
    zielen = null;
    schlagZielen = false;
    if (sel.length) {
      // Rechtsklick auf einen sichtbaren Feind: gezielter Angriff
      const feind = angriff ? null : feindBei(world, p.x, p.y, 40, ME, (o) => !verborgen(o));
      if (angriff) issue(world, { type: 'attack', player: ME, ids: sel.slice(), x: p.x, y: p.y, anhaengen: e.shiftKey });
      else if (feind) issue(world, { type: 'angreifen', player: ME, ids: sel.slice(), id: feind.id });
      else befehl3(p.x, p.y, e.shiftKey);
    }
    angriff = false;
    return;
  }
  if (e.button === 1) {
    drag = { pan: true, sx: mx, sy: my, x0: kam.x, z0: kam.z };
    e.preventDefault();
    return;
  }
  if (zielen) {
    issue(world, { type: 'faehigkeit', player: ME, faehigkeit: zielen, x: p.x, y: p.y });
    zielen = null;
    return;
  }
  if (schlagZielen) {
    // Fernschlag: das erste geladene Gebaeude der Auswahl, das das Ziel erreicht und bezahlbar ist.
    // Liegt das Ziel ausser Reichweite, bleibt man im Zielmodus (grau gezeichnet) und kann es noch einmal versuchen.
    const b = schlagSchuetze(world, sel, ME, p.x, p.y);
    if (b) {
      issue(world, { type: 'schlag', player: ME, id: b.id, x: p.x, y: p.y });
      if (!e.shiftKey) schlagZielen = false;
    }
    return;
  }
  if (placing) {
    // Ausgewaehlte Erbauer bekommen den Auftrag und gehen hin.
    // Shift: in die Reihe der Erbauer, und weiter setzen
    issue(world, { type: 'build', player: ME, building: placing, x: p.x, y: p.y, ids: erbauer3(), anhaengen: e.shiftKey });
    if (!e.shiftKey) placing = null;
    return;
  }
  if (angriff && sel.length) {
    issue(world, { type: 'attack', player: ME, ids: sel.slice(), x: p.x, y: p.y, anhaengen: e.shiftKey });
    if (!e.shiftKey) angriff = false;
    return;
  }
  drag = { sx: mx, sy: my, x: mx, y: my, add: e.shiftKey };
});
addEventListener('mousemove', (e) => {
  const r = cv3.getBoundingClientRect();
  maus = { x: e.clientX - r.left, y: e.clientY - r.top };
  if (!drag) return;
  if (drag.pan) {
    // Verschieben in Blickrichtung: Bildschirm-Pixel -> Meter grob nach Zoom
    const k = kam.dist / 700;
    const dx = (maus.x - drag.sx) * k;
    const dy = (maus.y - drag.sy) * k;
    const c = Math.cos(kam.yaw);
    const s = Math.sin(kam.yaw);
    // Boden greifen: nach rechts ziehen schiebt die Karte nach rechts
    kam.x = drag.x0 - dx * c - dy * s;
    kam.z = drag.z0 + dx * s - dy * c;
  } else {
    drag.x = maus.x;
    drag.y = maus.y;
  }
});
addEventListener('mouseup', () => {
  if (drag && !drag.pan) {
    const x1 = Math.min(drag.sx, drag.x);
    const x2 = Math.max(drag.sx, drag.x);
    const y1 = Math.min(drag.sy, drag.y);
    const y2 = Math.max(drag.sy, drag.y);
    const box = x2 - x1 > 5 || y2 - y1 > 5;
    const picked = [];
    let naechste = null;
    let bestD = 22 * 22;
    for (const e of world.entities) {
      if (e.player !== ME || e.kind !== 'unit') continue;
      const [ex, ey] = lage(e);
      const s = aufSchirm(ex * DM, 1, ey * DM);
      if (!s) continue;
      if (box) {
        if (s[0] >= x1 && s[0] <= x2 && s[1] >= y1 && s[1] <= y2) picked.push(e.id);
      } else {
        const dd = (s[0] - x1) ** 2 + (s[1] - y1) ** 2;
        if (dd < bestD) {
          bestD = dd;
          naechste = e.id;
        }
      }
    }
    if (naechste) picked.push(naechste);
    selPlan = null;
    if (!box && !picked.length) {
      const p = aufBoden(x1, y1);
      for (const e of world.entities) {
        if (e.player !== ME || e.kind !== 'building') continue;
        const r = BUILDINGS[e.type].radius + 40;
        if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 <= r * r) {
          sel = [e.id];
          drag = null;
          return;
        }
      }
      for (const q of world.plaene) {
        if (q.player !== ME) continue;
        const r = BUILDINGS[q.type].radius + 40;
        if ((q.x - p.x) ** 2 + (q.y - p.y) ** 2 <= r * r) {
          selPlan = q.id;
          sel = [];
          drag = null;
          return;
        }
      }
    }
    // Doppelklick auf eine Einheit: alle eigenen dieses Typs, die gerade im Bild sind
    if (!box && picked.length === 1) {
      const jetzt = performance.now();
      const doppelt = letzterKlick.id === picked[0] && jetzt - letzterKlick.zeit < 350;
      letzterKlick = { id: picked[0], zeit: jetzt };
      if (doppelt) picked.splice(0, 1, ...gleicherTypImBild(picked[0]));
    }
    sel = drag.add ? [...new Set([...sel, ...picked])] : picked;
  }
  drag = null;
});
cv3.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    kam.dist = Math.max(45, Math.min(1500, kam.dist * (e.deltaY < 0 ? 0.88 : 1.14)));
  },
  { passive: false }
);
addEventListener('keydown', (e) => {
  if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return; // Tippen in Feldern ist kein Befehl
  if (e.key === 'F10' || (e.key === 'Escape' && menueOffen)) {
    e.preventDefault();
    menueZeigen();
    return;
  }
  if (menueOffen) return;
  if (netz && (e.key === ' ' || e.key === '+' || e.key === '-')) return; // online laeuft die Zeit fuer beide gleich
  if (e.key === 'p' || (e.key === 'Escape' && fotoModus)) {
    fotoUmschalten();
    return;
  }
  if (netz && e.key === 'Enter') {
    e.preventDefault();
    chatFeld.hidden = false;
    chatFeld.focus();
    return;
  }
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
    tastenGehalten.add(e.key);
    e.preventDefault();
  }
  if (!world) return;
  const g = steuergruppe(e, gruppen, sel, world, ME);
  if (g) {
    sel = g.sel;
    selPlan = null;
    const m = g.springe ? auswahlMitte(world, sel) : null;
    if (m) {
      kam.x = m.x * DM;
      kam.z = m.y * DM;
    }
    return;
  }
  if (e.ctrlKey || e.metaKey) return;
  // Tab / Shift+Tab: Bau-Gruppe wechseln (nur mit Erbauer; sonst springt der Browser-Fokus)
  if (e.key === 'Tab' && erbauer3().length) {
    e.preventDefault();
    bauGruppeWechseln(naechsteBauGruppe(bauGruppen(meFaction), bauGruppeSchl, e.shiftKey ? -1 : 1));
    return;
  }
  const i = '1234567890'.indexOf(e.key);
  if (i >= 0 && bauListe()[i] && erbauer3().length && !gesperrt(world, ME, bauListe()[i])) placing = bauListe()[i];
  if (e.key === 'h') document.getElementById('hilfeKnopf').onclick();
  if (e.key === 'F5') {
    e.preventDefault(); // sonst laedt der Browser die Seite neu
    standSpeichern();
  }
  if (e.key === 'F9') {
    e.preventDefault();
    const t = schnellLaden();
    if (t) standLaden(t);
    else standHinweis('Kein Spielstand gespeichert (F5 speichert)');
  }
  if (e.key === 'n') {
    tonAn(fx);
    standHinweis(musikSchalten(musik) ? 'Musik an' : 'Musik aus');
  }
  if (e.key === 'm') {
    stummSchalten(fx);
    tonKnopfZeigen();
  }
  if (e.key === '.') naechsterUntaetiger();
  if (e.key === 's' && sel.length) issue(world, { type: 'stopp', player: ME, ids: sel.slice() });
  if (e.key === 'F2') {
    e.preventDefault();
    sel = heerAuswahl(world, ME);
    selPlan = null;
  }
  if (e.key === 'Escape') {
    placing = null;
    angriff = false;
    zielen = null;
    schlagZielen = false;
    skillsOffen = false;
    sel = [];
    selPlan = null;
    document.getElementById('hilfe').hidden = true;
  }
  if (e.key === 't') skillsOffen = !skillsOffen;
  // Kommandant gewaehlt: Q, W, E loesen seine Faehigkeiten aus.
  const kdtGewaehlt = kommandantVon(world, ME);
  const fi = 'qwe'.indexOf(e.key);
  if (fi >= 0 && kdtGewaehlt && sel.includes(kdtGewaehlt.id)) {
    wirkeFaehigkeit3(FACTIONS[meFaction].faehigkeiten[fi]);
    return;
  }
  if (e.key === ' ') {
    paused = !paused;
    e.preventDefault();
  }
  if (e.key === '+') speed = Math.min(8, speed * 2);
  if (e.key === '-') speed = Math.max(0.5, speed / 2);
  if (e.key === 'a' && sel.some((id) => byId(world, id)?.kind === 'unit')) {
    angriff = true;
    placing = null;
  }
  // F: Fernschlag scharf (nur mit einem geladenen, bezahlbaren Schlaggebaeude in der Auswahl)
  if (e.key === 'f') schlagScharf3();
  if (e.key === 'k') {
    const k = kommandantVon(world, ME);
    if (k) {
      sel = [k.id];
      kam.x = k.x * DM;
      kam.z = k.y * DM;
    }
  }
  if ((e.key === 'Delete' || e.key === 'Backspace') && selPlan) {
    issue(world, { type: 'planWeg', player: ME, id: selPlan });
    selPlan = null;
  }
  if ((e.key === 'Delete' || e.key === 'Backspace') && sel.length === 1) {
    const b = byId(world, sel[0]);
    if (b && b.kind === 'building') issue(world, { type: 'demolish', player: ME, id: b.id });
  }
  const slot = 'qwer'.indexOf(e.key);
  if (slot >= 0 && sel.length === 1) {
    const b = byId(world, sel[0]);
    if (b && b.kind === 'building' && b.done && BUILDINGS[b.type].buildList) {
      const u = BUILDINGS[b.type].buildList[slot];
      if (u) issue(world, { type: 'produce', player: ME, id: b.id, unit: u });
    }
  }
});
addEventListener('keyup', (e) => tastenGehalten.delete(e.key));
mini3.addEventListener('contextmenu', (e) => e.preventDefault());
mini3.addEventListener('mousedown', (e) => {
  const x = ((e.offsetX / mini3.clientWidth) * MAP) | 0;
  const y = ((e.offsetY / mini3.clientHeight) * MAP) | 0;
  // Rechtsklick: die Auswahl dorthin schicken (mit A scharf: Angriffsbewegung)
  if (e.button === 2) {
    if (angriff && sel.length) {
      issue(world, { type: 'attack', player: ME, ids: sel.slice(), x, y });
      angriff = false;
    } else if (sel.length) befehl3(x, y, e.shiftKey);
    return;
  }
  kam.x = x * DM;
  kam.z = y * DM;
});

// Untaetige Arbeiter: Knopf mit Anzahl, Taste . waehlt reihum den naechsten.
let untaetigSig = '';
let untaetigZeiger = 0;
function untaetigAnzeigen() {
  const n = untaetigeArbeiter(world, ME).length;
  const sig = n + '|' + meFaction;
  if (sig === untaetigSig) return;
  untaetigSig = sig;
  const b = document.getElementById('untaetig');
  b.hidden = n === 0;
  b.innerHTML = n ? untaetigHtml(world, ME, n) : '';
}
function naechsterUntaetiger() {
  const liste = untaetigeArbeiter(world, ME);
  if (!liste.length) return;
  const u = liste[untaetigZeiger++ % liste.length];
  sel = [u.id];
  selPlan = null;
  kam.x = u.x * DM;
  kam.z = u.y * DM;
}
document.getElementById('untaetig').onclick = () => naechsterUntaetiger();

// Ton und Hilfe als Icons; Steuergruppen-Leiste (Klick waehlt die Gruppe)
function tonKnopfZeigen() {
  document.getElementById('tonKnopf').innerHTML = ICONS[fx.stumm ? 'stumm' : 'ton'] || (fx.stumm ? '🔇' : '🔊');
}
document.getElementById('tonKnopf').onclick = () => {
  tonAn(fx);
  stummSchalten(fx);
  tonKnopfZeigen();
};
if (ICONS.hilfe) document.getElementById('hilfeKnopf').innerHTML = ICONS.hilfe;
tonKnopfZeigen();
document.getElementById('steuer').onclick = (ev) => {
  const b = ev.target && ev.target.closest ? ev.target.closest('[data-sg]') : null;
  if (!b || !world) return;
  sel = (gruppen[b.dataset.sg] || []).filter((id) => byId(world, id));
  selPlan = null;
};
let steuerSig = '';
function steuerAnzeigen() {
  const sig = Object.keys(gruppen).map((n) => n + ':' + (gruppen[n] || []).filter((id) => byId(world, id)).length).join(',');
  if (sig === steuerSig) return;
  steuerSig = sig;
  document.getElementById('steuer').innerHTML = steuergruppenHtml(gruppen, world);
}



function kameraTasten(dt) {
  const v = (kam.dist / 300) * 0.35 * dt;
  const c = Math.cos(kam.yaw);
  const s = Math.sin(kam.yaw);
  // vorwaerts = weg von der Kamera, auf dem Boden
  const fx = -s;
  const fz = -c;
  const rx = -c;
  const rz = s;
  if (tastenGehalten.has('ArrowUp')) {
    kam.x += fx * v;
    kam.z += fz * v;
  }
  if (tastenGehalten.has('ArrowDown')) {
    kam.x -= fx * v;
    kam.z -= fz * v;
  }
  if (tastenGehalten.has('ArrowLeft')) {
    kam.x += rx * v;
    kam.z += rz * v;
  }
  if (tastenGehalten.has('ArrowRight')) {
    kam.x -= rx * v;
    kam.z -= rz * v;
  }
  kam.x = Math.max(0, Math.min(MAP * DM, kam.x));
  kam.z = Math.max(0, Math.min(MAP * DM, kam.z));
}

// ------------------------------------------------------------ Schleife
/** Interpolierte Lage einer Einheit in Dezimetern. */
let alphaTick = 0;
function lage(e) {
  const v = vorher.get(e.id);
  if (!v || e.kind !== 'unit') return [e.x, e.y];
  return [v[0] + (e.x - v[0]) * alphaTick, v[1] + (e.y - v[1]) * alphaTick];
}

/** Ein Tick der Simulation; online false, solange der Mitspieler fehlt. */
function tick(still = false) {
  let netzOffen = null; // online: eigene Befehle, die erst mit dem naechsten Tick gehen
  if (netz) {
    if (netz.zu) return false;
    gsSenden(netz.gs, world, netzPost);
    if (!gsBereit(netz.gs, world.tick)) {
      if (!netz.wartetSeit) netz.wartetSeit = performance.now();
      return false;
    }
    netz.wartetSeit = 0;
    netzOffen = gsEinsetzen(netz.gs, world);
  }
  for (const e of world.entities) if (e.kind === 'unit') vorher.set(e.id, [e.x, e.y]);
  wdhStandMerken();
  if (wiederholung) wdhZeiger = abspielen(wiederholung, world, wdhZeiger);
  else if (aufnahme) aufnehmen(aufnahme, world);
  if (aiMe) stepAI(aiMe, world);
  if (ai) stepAI(ai, world);
  if (mission && mission.takt) mission.takt(world); // Missionsereignisse, auch beim Abspielen
  step(world);
  if (netz) gsNachSchritt(netz.gs, world, netzOffen, netzPost);
  verlaufFortschreiben(verlauf, world);
  if (wiederholung && world.tick >= wiederholung.ende && !world.over) paused = true;
  for (const ev of world.events) {
    if (ev.t === 'shot') {
      const a = byId(world, ev.from);
      const b = byId(world, ev.to);
      if (!a || !b) continue;
      // Geschosse und Treffer macht src/effekte.js (siehe unten); hier nur:
      // Schuetzen schauen zum Ziel
      if (a.kind === 'unit') {
        blick.set(a.id, Math.atan2(b.x - a.x, b.y - a.y));
        ausfall.set(a.id, performance.now());
      }
    } else if (ev.t === 'died') {
      staub.push({ x: ev.x, y: ev.y, r: ev.kind === 'unit' ? 2.5 : 8, t: 0 });
      vorher.delete(ev.id);
    } else if (ev.t === 'faehigkeit') {
      wirkungen.push({ ...ev, bis: world.tick + 12 });
    }
  }
  if (!still) {
    effekteAusEreignissen(fx, world, ME, sichtbarFx, hoerer3d(), imBild3d);
    musikEreignisse(musik, world);
  }
  sel = sel.filter((id) => byId(world, id));
}

function frame(now) {
  const dt = Math.max(0, Math.min(250, now - last)); // nie rueckwaerts, nie mehr als eine Viertelsekunde
  last = now;
  wdhSpulen(tick);
  if (spulenBis < 0 && !paused && !world.over && !missionGewonnen) {
    acc += dt * speed;
    let guard = 0;
    while (acc >= TICK_MS && guard++ < 12) {
      if (tick() === false) {
        acc = Math.min(acc, TICK_MS); // online: auf den Mitspieler warten
        break;
      }
      acc -= TICK_MS;
    }
    if (guard >= 12) acc = 0;
  }
  alphaTick = paused || world.over ? 1 : Math.min(1, acc / TICK_MS);
  kameraTasten(dt);
  effekteFortschreiben(fx, paused || world.over ? 0 : (dt * speed) / 1000, world, hoerer3d());
  musikFortschreiben(musik, fx, meFaction, dt / 1000);
  missionFortschritt();
  missionFunk();
  if ((world.over || missionGewonnen) && !endeGezeigt) zeigeEnde();
  if (!document.hidden) {
    zeichne(now, dt);
    fotoSichern();
    if (fotoModus) octx.clearRect(0, 0, ov.width, ov.height);
    else zeichneUeberlagerung(now);
    zeichneHud();
    zeitleisteAktualisieren();
    skillPanel3();
    leisten3();
    untaetigAnzeigen();
    steuerAnzeigen();
    faehPanel3();
    infoKarte3();
    zeichneMini();
  }
  requestAnimationFrame(frame);
}

// ------------------------------------------------------------ Zeichnen 3D
function groesse() {
  const d = devicePixelRatio || 1;
  const w = cv3.clientWidth;
  const h = cv3.clientHeight;
  if (cv3.width !== ((w * d) | 0) || cv3.height !== ((h * d) | 0)) {
    cv3.width = (w * d) | 0;
    cv3.height = (h * d) | 0;
    ov.width = cv3.width;
    ov.height = cv3.height;
  }
}

// Jahreszeiten der Waldgeister, je Einheit fest nach ihrer Nummer.
const JAHRESZEITEN = ['fruehling', 'sommer', 'herbst', 'winter'];

/** Modell einer Einheit: Waldgeister in ihrer Jahreszeit, sofern es das Modell gibt. */
function modellVon(e) {
  if (e.type === 'waldgeist') {
    const k = 'waldgeist_' + JAHRESZEITEN[e.id % 4];
    if (MODELLE[k]) return k;
  }
  return e.type;
}

function zeichne(now, dt) {
  groesse();
  kameraMatrix();
  const hover0 = aufBoden(maus.x, maus.y);
  hover = hover0;

  gl.viewport(0, 0, cv3.width, cv3.height);
  gl.clearColor(NEBEL[0], NEBEL[1], NEBEL[2], 1);
  gl.clearStencil(0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.disable(gl.CULL_FACE);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  gl.useProgram(PROG);
  gl.uniformMatrix4fv(gl.getUniformLocation(PROG, 'uVP'), false, VP);
  const l = [0.45, 1, 0.3];
  const ll = Math.hypot(...l);
  gl.uniform3f(gl.getUniformLocation(PROG, 'uLicht'), l[0] / ll, l[1] / ll, l[2] / ll);
  gl.uniform3f(gl.getUniformLocation(PROG, 'uNebel'), ...NEBEL);
  // Nebel des Krieges als Textur, eine Zelle je Texel, linear gefiltert
  nebelAktualisieren(nebel, world);
  nebelFrame++;
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, nebelTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, NEBEL_N, NEBEL_N, 0, gl.RED, gl.UNSIGNED_BYTE, nebel.hell);
  gl.uniform1i(gl.getUniformLocation(PROG, 'uSicht'), 0);
  gl.uniform1f(gl.getUniformLocation(PROG, 'uKarte'), MAP * DM);

  zeichneBoden(world); // src/gelaende3d.js

  // Schatten: dunkle Scheiben unter allem, was steht oder laeuft -- billig und
  // macht Bodenkontakt und Tiefe lesbar.
  gl.depthMask(false);
  for (const e of world.entities) {
    if (verborgen(e)) continue;
    const def = e.kind === 'unit' ? UNITS[e.type] : BUILDINGS[e.type];
    const [x, y] = lage(e);
    const r = def.radius * DM * (e.kind === 'unit' ? 1.05 * ZEIGE_EINHEIT : 1.25 * ZEIGE_GEBAEUDE);
    instanz('scheibe', x * DM + r * 0.12, 0.06, y * DM + r * 0.08, 0, r, [0, 0, 0], 1, 1, e.kind === 'unit' ? 0.32 : 0.26);
  }
  zeichneInstanzen(MODELLE.scheibe);
  gl.depthMask(true);

  zeichneDomaenen();

  zeichneGelaende(world, now); // src/gelaende3d.js: Seen, Felsen, Adern, Baeume

  // Gebaeude und Einheiten
  const t = now / 1000;
  // Eigene Bauplaene: durchscheinend, nur fuer den eigenen Spieler sichtbar
  for (const q of world.plaene) {
    if (q.player !== ME) continue;
    const r = BUILDINGS[q.type].radius * DM * ZEIGE_GEBAEUDE;
    instanz(q.type, q.x * DM, 0, q.y * DM, 0.4, r, teamFarbe(ME), 1, q.id === selPlan ? 1.5 : 1.2, 0.35);
  }
  // Gegnerische Gebaeude im Nebel: dort, wo man sie zuletzt gesehen hat, matt.
  for (const b of nebel.bekannt.values()) {
    if (nebel.kunde.jetzt.has(b.id)) continue;
    const r = BUILDINGS[b.type].radius * DM * ZEIGE_GEBAEUDE;
    instanz(b.type, b.x * DM, 0, b.y * DM, (b.id % 4) * (Math.PI / 2) + 0.4, r, teamFarbe(b.player), 1, 0.6);
  }
  for (const e of world.entities) {
    if (verborgen(e)) continue;
    const team = teamFarbe(e.player);
    if (e.kind === 'building') {
      const def = BUILDINGS[e.type];
      const r = def.radius * DM * ZEIGE_GEBAEUDE;
      if (e.done) instanz(e.type, e.x * DM, 0, e.y * DM, (e.id % 4) * (Math.PI / 2) + 0.4, r, team, 1, 1 + blitzVon(fx, e.id));
      else {
        const f = Math.min(1, e.progress / (def.buildTime * 1000));
        instanz(e.type, e.x * DM, 0, e.y * DM, (e.id % 4) * (Math.PI / 2) + 0.4, r, team, 0.15 + 0.85 * f, 0.55);
        // Baugeruest um die Baustelle, sobald es ein Modell gibt (Gemini)
        if (MODELLE.baugeruest) instanz('baugeruest', e.x * DM, 0, e.y * DM, (e.id % 4) * (Math.PI / 2) + 0.4, r, team);
      }
      continue;
    }
    const def = UNITS[e.type];
    const [x, y] = lage(e);
    const v = vorher.get(e.id);
    const bewegt = v && Math.abs(e.x - v[0]) + Math.abs(e.y - v[1]) > 8; // Rempeln im Pulk zaehlt nicht
    if (bewegt) {
      const ziel = Math.atan2(e.x - v[0], e.y - v[1]);
      const alt = blick.has(e.id) ? blick.get(e.id) : ziel;
      let d = ziel - alt;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      blick.set(e.id, alt + d * Math.min(1, dt / 120));
    }
    const s = def.radius * DM * ZEIGE_EINHEIT;
    // Raben fliegen hoch, Waldgeister schweben, der Waldgott schwebt knapp ueber dem Boden
    const fliegt = UNITS[e.type].fliegt;
    // Waldgeister schweben, bis es die Bogenschuetzen in vier Jahreszeiten gibt -- die gehen.
    const geist = e.type === 'waldgeist' && !MODELLE.waldgeist_fruehling;
    const schwebt = fliegt
      ? 5 + Math.sin(t * 3 + e.id) * 0.4
      : geist
        ? 0.5 + Math.sin(t * 2 + e.id) * 0.25
        : e.type === 'waldgott'
          ? 0.08 + Math.sin(t * 1.8 + e.id) * 0.03
          : 0;
    const gleitet = fliegt || geist || e.type === 'waldgott';
    // Nur ein leichtes Auf und Ab beim Gehen -- den Schritt machen die Beine im Modell.
    const huepf = bewegt && !gleitet ? Math.abs(Math.sin(t * 9 + e.id)) * 0.04 * s : 0;
    const schritt = e.type === 'waldgott'
      ? (bewegt ? Math.sin(t * 4 + e.id) : Math.sin(t * 2 + e.id) * 0.5)
      : (bewegt && !gleitet ? Math.sin(t * 9 + e.id) : 0);
    // Ausfall: kurz nach vorn beim Schuss oder Hieb
    const seit = now - (ausfall.get(e.id) || -1e9);
    const ruck = seit < 220 ? Math.sin((seit / 220) * Math.PI) * 0.4 * s : 0;
    const w = blick.get(e.id) || 0;
    // Getroffen: kurz hell aufblitzen
    instanz(modellVon(e), x * DM + Math.sin(w) * ruck, schwebt * s + huepf, y * DM + Math.cos(w) * ruck, w, s, team, 1, 1 + 1.6 * blitzVon(fx, e.id), 1, schritt);
  }
  // Gefallene sinken zu Boden und verblassen
  for (const g of fx.gefallen) {
    if (!MODELLE[g.type] && !g.type.startsWith('waldgeist')) continue;
    const f = g.t / FALLEN;
    const s = UNITS[g.type].radius * DM * ZEIGE_EINHEIT;
    const w = blick.get(g.id) || 0;
    instanz(modellVon({ type: g.type, id: g.id }), g.x * DM, -f * 0.5 * s, g.y * DM, w, s, teamFarbe(g.player), 1 - f * 0.75, 0.55, 1 - f * f, 0);
  }
  // Truemmer zerstoerter Gebaeude, sobald es ein Modell gibt (Gemini)
  if (MODELLE.truemmer) {
    for (const g of fx.truemmer) {
      const r = BUILDINGS[g.type].radius * DM * ZEIGE_GEBAEUDE;
      const aus = Math.min(1, (TRUEMMER - g.t) / 5);
      instanz('truemmer', g.x * DM, 0, g.y * DM, (g.id % 4) * (Math.PI / 2) + 0.4, r, [0.45, 0.42, 0.38], 1, 1, aus);
    }
  }

  // Platzierungs-Geist
  if (placing) {
    const def = BUILDINGS[placing];
    let gx = hover.x;
    let gy = hover.y;
    let ok = true;
    if (def.needs) {
      const dep = findDeposit(world, hover.x, hover.y, def.needs);
      if (dep && !aderBesetzt(nebel, world, dep, ME)) {
        gx = dep.x;
        gy = dep.y;
      } else ok = false;
    }
    if (def.needsGrowth && isCleared(world, gx, gy)) ok = false;
    if (aufHindernis(world, gx, gy, def.radius)) ok = false;
    const farbe = ok ? teamFarbe(ME) : [0.8, 0.3, 0.2];
    instanz(placing, gx * DM, 0, gy * DM, 0.4, def.radius * DM * ZEIGE_GEBAEUDE, farbe, 1, ok ? 1.1 : 0.8, 0.55);
  }

  // Erst alles ausser Einheiten, dann Einheiten zweimal: wo Gebaeude oder
  // Baeume davor stehen als Umriss in Teamfarbe, dann ganz normal.
  // Einheiten-Modelle: jede Einheit und ihre Varianten (Waldgeist-Jahreszeiten)
  const istEinheit = (k) => UNITS[k] || UNITS[k.split('_')[0]];
  for (const k of Object.keys(MODELLE)) if (k !== 'staubwolke' && !istEinheit(k)) zeichneInstanzen(MODELLE[k]);
  const roentgen = gl.getUniformLocation(PROG, 'uRoentgen');
  gl.depthFunc(gl.GREATER);
  gl.depthMask(false);
  gl.uniform1f(roentgen, 1);
  for (const k of Object.keys(MODELLE)) if (istEinheit(k)) zeichneInstanzen(MODELLE[k], true);
  gl.uniform1f(roentgen, 0);
  gl.depthFunc(gl.LEQUAL);
  gl.depthMask(true);
  for (const k of Object.keys(MODELLE)) if (istEinheit(k)) zeichneInstanzen(MODELLE[k]);

  // Staub gefallener Einheiten
  gl.depthMask(false);
  staub = staub.filter((p) => (p.t += dt / 1000) < 0.9);
  for (const p of staub) instanz('staubwolke', p.x * DM, p.r * 0.4, p.y * DM, 0, p.r * (0.6 + p.t), [1, 1, 1], 0.6, 1, 0.5 * (1 - p.t / 0.9));
  zeichneInstanzen(MODELLE.staubwolke);
  gl.depthMask(true);

  zeichneEffektModelle();
  zeichneSchuesse();
}

// Anflug der Fernschlaege: Abschussort je Schlag, auch wenn das Gebaeude inzwischen fiel.
// Schluessel 'von:landet'; nur, was noch fliegt, bleibt in der Tabelle.
let schlagStart = new Map();
const KUPPEL_HOEHE = 0.7; // Kuppelmodell (Hoehe ~1,4 bei Radius 1) auf etwa Halbkugel stauchen

/**
 * Modelle der Gemini-Effekte (src/modelle3d.js), gezeichnet nach Gelaende und
 * Einheiten, ohne in den Tiefenpuffer zu schreiben, damit Durchsichtiges nichts verdeckt:
 *   schildkuppel  Kuppel ueber eigenen (und gewaehlten fremden) Schildgebaeuden,
 *                 Groesse nach schild.radius, Deckkraft nach Ladung
 *   fernschlag    der Schlag im Flug, im Bogen vom Gebaeude zum Ziel; fuer alle sichtbar
 *   flak          Splitterwolke am Flieger, den eine Flak-Waffe (ziele 'luft') traf
 */
function zeichneEffektModelle() {
  const genutzt = new Set();
  // Schildkuppeln (wie der Bodenring: eigene immer, fremde nur gewaehlt)
  if (MODELLE.schildkuppel) {
    for (const e of world.entities) {
      if (e.dead || e.kind !== 'building' || !e.done || verborgen(e)) continue;
      const s = BUILDINGS[e.type].schild;
      if (!s) continue;
      if (e.player !== ME && !sel.includes(e.id)) continue;
      const ladung = Math.min(1, e.schildPunkte / s.kapazitaet);
      // Mehrere Schichten im Modell addieren sich -- darum sehr durchsichtig; leer fast unsichtbar, voll deutlich
      instanz('schildkuppel', e.x * DM, 0, e.y * DM, 0, s.radius * DM, teamFarbe(e.player), KUPPEL_HOEHE, 1, 0.025 + 0.085 * ladung);
      genutzt.add('schildkuppel');
    }
  }
  // Fernschlaege im Flug
  const neu = new Map();
  const jetzt = world.tick - 1 + alphaTick; // gezeigter Zeitpunkt, wie bei lage()
  for (const s of world.schlaege) {
    const schluessel = s.von + ':' + s.landet;
    let start = schlagStart.get(schluessel);
    if (!start) {
      const b = byId(world, s.von);
      const d = b && BUILDINGS[b.type].schlag;
      // Ohne Gebaeude (nach einem Laden mitten im Flug, schon gefallen): von oben herab auf das Ziel
      start = d ? { x: b.x, y: b.y, tick: s.landet - d.flug } : { x: s.x, y: s.y, tick: s.landet - 30 };
    }
    neu.set(schluessel, start);
    if (!MODELLE.fernschlag) continue;
    const f = Math.max(0, Math.min(1, (jetzt - start.tick) / Math.max(1, s.landet - start.tick)));
    const weite = Math.hypot(s.x - start.x, s.y - start.y) * DM;
    const gipfel = Math.max(10, Math.min(90, weite * 0.3)); // Bogenhoehe in m
    const hoehe = 2 * (1 - f) + gipfel * 4 * f * (1 - f);
    // Blickrichtung wie bei den Geschossen; ohne Weite (von oben herab) senkrecht aufs Ziel
    const w = weite > 0 ? Math.atan2(s.x - start.x, s.y - start.y) : 0;
    const x = start.x + (s.x - start.x) * f;
    const y = start.y + (s.y - start.y) * f;
    instanz('fernschlag', x * DM, hoehe, y * DM, w, 5, teamFarbe(s.player), 1, 1.3);
    genutzt.add('fernschlag');
  }
  schlagStart = neu;
  // Flak: Splitterwolke blaeht sich auf und verblasst, in der Hoehe, in der Flieger schweben
  if (MODELLE.flak) {
    for (const w of fx.wolken) {
      const f = w.t / w.dauer;
      const hoehe = 5 * UNITS[w.typ].radius * DM * ZEIGE_EINHEIT;
      instanz('flak', w.x * DM, hoehe, w.y * DM, w.x + w.y, 2.5 + 4 * f, [1, 1, 1], 1, 1.4, 1 - f * f);
      genutzt.add('flak');
    }
  }
  if (!genutzt.size) return;
  gl.depthMask(false);
  for (const k of genutzt) zeichneInstanzen(MODELLE[k]);
  gl.depthMask(true);
}

/**
 * Domaenen: je Spieler die Vereinigung aller Ankerkreise -- Flaeche einmal
 * eingefaerbt, dazu nur die Aussenkante. Mit dem Stencil-Puffer:
 * 1) Kreise markieren, 2) Flaeche dort einmal zeichnen, 3) etwas groessere
 * Kreise nur ausserhalb der Markierung -- das ist der Rand.
 */
function zeichneDomaenen() {
  gl.enable(gl.STENCIL_TEST);
  gl.depthMask(false);
  const randBreite = Math.max(1.2, kam.dist * 0.006);
  for (let p = 0; p < 2; p++) {
    const anker = world.entities.filter(
      (e) => e.player === p && e.kind === 'building' && anchorRadius(world, e) > 0 && (p === ME || !nebel.an || nebel.bekannt.has(e.id))
    );
    if (!anker.length) continue;
    const team = teamFarbe(p);
    const kreise = (plus, alpha) => {
      for (const e of anker) instanz('scheibe', e.x * DM, 0.15 + p * 0.02, e.y * DM, 0, anchorRadius(world, e) * DM + plus, team, 1, 1, alpha);
      zeichneInstanzen(MODELLE.scheibe);
    };
    gl.clear(gl.STENCIL_BUFFER_BIT);
    gl.colorMask(false, false, false, false);
    gl.stencilFunc(gl.ALWAYS, 1, 0xff);
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
    kreise(0, 1);
    gl.colorMask(true, true, true, true);
    gl.stencilFunc(gl.EQUAL, 1, 0xff);
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.INCR);
    kreise(0, p === ME ? 0.08 : 0.06);
    gl.stencilFunc(gl.EQUAL, 0, 0xff);
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.INCR);
    kreise(randBreite, p === ME ? 0.85 : 0.6);
  }
  gl.disable(gl.STENCIL_TEST);
  gl.depthMask(true);
}

function zeichneSchuesse() {
  // Geschosse aus src/effekte.js als Modelle, uebertrieben gross -- sonst
  // sind sie aus Spielhoehe unsichtbar. Leuchtende im Bogen, Bolzen flach.
  const v = [];
  const genutzt = new Set();
  const lageVon = (id) => {
    const e = byId(world, id);
    return e ? lage(e) : null;
  };
  for (const g of fx.geschosse) {
    const k = geschossModell(g.art, MODELLE);
    if (!k) continue;
    const [x, y, h, w] = geschossLage(g, lageVon);
    instanz(k, x * DM, h * DM, y * DM, w, g.groesse * 2.6, HEX(g.farbe), 1, g.art === 'licht' || g.art === 'glut' ? 1.6 : 1);
    genutzt.add(k);
  }
  for (const k of genutzt) zeichneInstanzen(MODELLE[k]);
  // Baulinien: Erbauer zu ihrer Baustelle
  for (const e of world.entities) {
    if (e.kind !== 'unit' || !e.baut) continue;
    const site = byId(world, e.baut);
    if (!site) continue;
    const [ux, uy] = lage(e);
    const f = teamFarbe(e.player);
    v.push(ux * DM, 2, uy * DM, f[0], f[1], f[2], 0.7);
    v.push(site.x * DM, 1, site.y * DM, f[0], f[1], f[2], 0.15);
  }
  if (!v.length) return;
  gl.useProgram(PROG_L);
  gl.uniformMatrix4fv(gl.getUniformLocation(PROG_L, 'uVP'), false, VP);
  gl.bindVertexArray(linienVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, linienPuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(v), gl.DYNAMIC_DRAW);
  gl.drawArrays(gl.LINES, 0, v.length / 7);
  gl.bindVertexArray(null);
}

// ------------------------------------------------------------ Ueberlagerung (2D)
/** Kreis auf dem Boden (Mitte und Radius in Dezimetern), als Linienzug ins Overlay. */
function bodenKreis(x, y, r) {
  octx.beginPath();
  let offen = false;
  for (let i = 0; i <= 48; i++) {
    const w = (i / 48) * Math.PI * 2;
    const s = aufSchirm((x + Math.cos(w) * r) * DM, 0.3, (y + Math.sin(w) * r) * DM);
    if (!s) {
      offen = false;
      continue;
    }
    if (offen) octx.lineTo(s[0], s[1]);
    else octx.moveTo(s[0], s[1]);
    offen = true;
  }
  octx.stroke();
}

/** Schrein-Umkreise, Faehigkeits-Einsaetze, gerufene und festgehaltene Einheiten, Zielkreis. */
function zeichneWirkungen() {
  // Routen gewaehlter Einheiten: ab der Einheit ueber Baustellen und Wegpunkte (Shift)
  const punkteGemalt = new Set();
  octx.lineWidth = 1.3;
  for (const id of sel.slice(0, 60)) {
    const u = byId(world, id);
    if (!u || u.kind !== 'unit') continue;
    const route = routeVon(world, u);
    if (route.length < 2) continue;
    const [lx, ly] = lage(u);
    route[0] = [lx, ly, 'start'];
    const punkte = route.map(([x, y, art]) => [aufSchirm(x * DM, 0.3, y * DM), art, x + ',' + y]);
    if (punkte.some(([p]) => !p)) continue;
    octx.strokeStyle = 'rgba(232, 220, 192, .8)';
    octx.setLineDash([3, 4]);
    octx.beginPath();
    octx.moveTo(punkte[0][0][0], punkte[0][0][1]);
    for (const [p] of punkte.slice(1)) octx.lineTo(p[0], p[1]);
    octx.stroke();
    octx.setLineDash([]);
    for (const [p, art, schluessel] of punkte.slice(1)) {
      if (punkteGemalt.has(schluessel)) continue;
      punkteGemalt.add(schluessel);
      octx.fillStyle = art === 'angriff' ? '#e06a4a' : art === 'bau' ? '#d8b06a' : '#e8dcc0';
      octx.beginPath();
      octx.arc(p[0], p[1], 4, 0, Math.PI * 2);
      octx.fill();
    }
  }
  // Sammelpunkte gewaehlter Fabriken: gestrichelte Linie und Fahne
  octx.strokeStyle = FACTIONS[meFaction].color;
  octx.fillStyle = FACTIONS[meFaction].color;
  octx.lineWidth = 1.5;
  for (const id of gewaehlteFabriken(world, sel, ME)) {
    const b = byId(world, id);
    if (b.sammelX < 0) continue;
    const a = aufSchirm(b.x * DM, 0.3, b.y * DM);
    const z = aufSchirm(b.sammelX * DM, 0.3, b.sammelY * DM);
    if (!a || !z) continue;
    octx.setLineDash([4, 4]);
    octx.beginPath();
    octx.moveTo(a[0], a[1]);
    octx.lineTo(z[0], z[1]);
    octx.stroke();
    octx.setLineDash([]);
    octx.beginPath();
    octx.moveTo(z[0], z[1]);
    octx.lineTo(z[0], z[1] - 16);
    octx.stroke();
    octx.beginPath();
    octx.moveTo(z[0], z[1] - 16);
    octx.lineTo(z[0] + 10, z[1] - 12);
    octx.lineTo(z[0], z[1] - 8);
    octx.fill();
  }
  octx.lineWidth = 1;
  octx.setLineDash([6, 6]);
  for (const e of world.entities) {
    if (e.dead || e.kind !== 'building' || !e.done || !BUILDINGS[e.type].buff || verborgen(e)) continue;
    octx.strokeStyle = FACTIONS[world.players[e.player].faction].color;
    octx.globalAlpha = e.powered ? 0.5 : 0.18;
    bodenKreis(e.x, e.y, BUILDINGS[e.type].buff.radius);
  }
  octx.setLineDash([]);
  // Schildkuppeln: das Modell "schildkuppel" zeichnet zeichneEffektModelle(). Der
  // Bodenring bleibt, wo es das Modell nicht gibt, und fuer gewaehlte Schildgebaeude
  // als scharfe Kante des Umkreises. Eigene immer, fremde nur gewaehlt; Deckkraft nach Ladung.
  for (const e of world.entities) {
    if (e.dead || e.kind !== 'building' || !e.done || verborgen(e)) continue;
    const s = BUILDINGS[e.type].schild;
    if (!s) continue;
    const gewaehlt = sel.includes(e.id);
    if (e.player !== ME && !gewaehlt) continue;
    if (MODELLE.schildkuppel && !gewaehlt) continue;
    octx.strokeStyle = '#7ab8ff';
    octx.lineWidth = gewaehlt ? 3 : 1.5;
    octx.globalAlpha = 0.12 + 0.6 * Math.min(1, e.schildPunkte / s.kapazitaet);
    bodenKreis(e.x, e.y, s.radius);
  }
  octx.globalAlpha = 1;
  wirkungen = wirkungen.filter((w) => w.bis >= world.tick);
  octx.lineWidth = 2.5;
  for (const w of wirkungen) {
    const t = 1 - (w.bis - world.tick) / 12;
    octx.strokeStyle = faehigkeitFarbe(w.art);
    octx.globalAlpha = 1 - t;
    bodenKreis(w.x, w.y, w.r * (0.4 + 0.6 * t));
  }
  octx.globalAlpha = 1;
  octx.lineWidth = 1.5;
  for (const e of world.entities) {
    if (e.dead || e.kind !== 'unit' || verborgen(e)) continue;
    const t = world.tick;
    const art = e.gebundenBis > t ? 'griff' : e.wehrBis > t ? 'wehr' : e.rufBis > t ? 'ruf' : e.tempoBis > t ? 'tempo' : e.beschworen ? 'rufen' : null;
    if (!art) continue;
    const [x, y] = lage(e);
    const m = aufSchirm(x * DM, 0.2, y * DM);
    if (!m) continue;
    octx.strokeStyle = faehigkeitFarbe(art);
    octx.beginPath();
    octx.ellipse(m[0], m[1], 9, 5, 0, 0, Math.PI * 2);
    octx.stroke();
  }
  if (zielen) {
    const f = FAEHIGKEITEN[zielen];
    const k = kommandantVon(world, ME);
    const drin = k && (hover.x - k.x) ** 2 + (hover.y - k.y) ** 2 <= f.reichweite ** 2;
    octx.strokeStyle = drin ? '#9a7a4a' : '#c4603f';
    octx.lineWidth = 2;
    bodenKreis(hover.x, hover.y, f.radius);
    if (k) {
      octx.lineWidth = 1;
      octx.setLineDash([4, 4]);
      bodenKreis(k.x, k.y, f.reichweite);
      octx.setLineDash([]);
    }
  }
  // Fernschlaege im Flug: ein roter Kreis am Ziel mit Countdown -- fuer alle sichtbar, auch im Nebel
  for (const s of world.schlaege) {
    const rest = Math.max(0, s.landet - world.tick);
    octx.strokeStyle = '#e8503a';
    octx.lineWidth = 2.5;
    octx.globalAlpha = 0.5 + 0.5 * Math.max(0, 1 - rest / 100);
    bodenKreis(s.x, s.y, s.radius);
    const m = aufSchirm(s.x * DM, 0.3, s.y * DM);
    if (!m) continue;
    octx.save();
    octx.globalAlpha = 1;
    octx.fillStyle = '#e8503a';
    octx.font = 'bold 18px sans-serif';
    octx.textAlign = 'center';
    octx.textBaseline = 'middle';
    octx.fillText(Math.ceil(rest / 10) + ' s', m[0], m[1]);
    octx.restore();
  }
  octx.globalAlpha = 1;
  if (schlagZielen) {
    // Fernschlag scharf: Einschlagkreis am Mauszeiger, Reichweiten der bereiten Gebaeude gestrichelt;
    // rot, solange ein Gebaeude das Ziel erreicht, sonst grau. Ohne Schlaggebaeude in der Auswahl endet der Zielmodus.
    const gs = schlagGebaeude(world, sel, ME);
    if (!gs.length) schlagZielen = false;
    const schuetze = schlagSchuetze(world, sel, ME, hover.x, hover.y);
    const s = schuetze ? BUILDINGS[schuetze.type].schlag : gs.length ? BUILDINGS[gs[0].type].schlag : null;
    if (s) {
      octx.strokeStyle = schuetze ? '#e8503a' : '#8a8a8a';
      octx.lineWidth = 2;
      bodenKreis(hover.x, hover.y, s.radius);
      octx.lineWidth = 1;
      octx.setLineDash([4, 4]);
      for (const b of gs) if (schlagBereit(b)) bodenKreis(b.x, b.y, BUILDINGS[b.type].schlag.reichweite);
      octx.setLineDash([]);
    }
  }
}

function zeichneUeberlagerung(now) {
  const d = devicePixelRatio || 1;
  octx.setTransform(d, 0, 0, d, 0, 0);
  octx.clearRect(0, 0, ov.width, ov.height);
  // Hiebe, Funken, Staub, Ringe (src/effekte.js); Pixel je dm aus der Bildmitte
  const m0 = aufSchirm(kam.x, 0, kam.z);
  const m1 = aufSchirm(kam.x + 1, 0, kam.z);
  const pxJeDm = m0 && m1 ? Math.hypot(m1[0] - m0[0], m1[1] - m0[1]) * DM : 0.1;
  zeichneEffekte(fx, octx, (x, y, h) => aufSchirm(x * DM, h * DM, y * DM), pxJeDm, false, null);
  zeichneWirkungen();
  // Auswahlringe
  octx.lineWidth = 1.5;
  octx.strokeStyle = '#f0f4e8';
  for (const id of sel) {
    const e = byId(world, id);
    if (!e) continue;
    const [x, y] = lage(e);
    const r = (e.kind === 'unit' ? UNITS[e.type].radius * ZEIGE_EINHEIT : BUILDINGS[e.type].radius * ZEIGE_GEBAEUDE) * DM * 1.4;
    const m = aufSchirm(x * DM, 0.2, y * DM);
    const rr = aufSchirm(x * DM + r, 0.2, y * DM);
    if (!m || !rr) continue;
    const rad = Math.max(6, Math.hypot(rr[0] - m[0], rr[1] - m[1]));
    octx.beginPath();
    octx.ellipse(m[0], m[1], rad, rad * 0.55, 0, 0, Math.PI * 2);
    octx.stroke();
  }
  // Lebensbalken: beschaedigt, ausgewaehlt oder Kommandant; Baufortschritt
  for (const e of world.entities) {
    if (verborgen(e)) continue;
    const def = e.kind === 'unit' ? UNITS[e.type] : BUILDINGS[e.type];
    const zeigen = e.hp < e.maxHp || sel.includes(e.id) || def.commander || (e.kind === 'building' && !e.done);
    if (!zeigen) continue;
    const [x, y] = lage(e);
    const hoehe = e.kind === 'unit' ? def.radius * DM * ZEIGE_EINHEIT * (def.commander ? 3.6 : 2.6) : def.radius * DM * ZEIGE_GEBAEUDE * 3.2;
    const s = aufSchirm(x * DM, hoehe, y * DM);
    if (!s) continue;
    const w = def.commander ? 44 : e.kind === 'building' ? 34 : 18;
    octx.fillStyle = 'rgba(0,0,0,.7)';
    octx.fillRect(s[0] - w / 2 - 1, s[1] - 1, w + 2, 5);
    const anteil = e.hp / e.maxHp;
    octx.fillStyle = anteil < 0.34 ? '#c4603f' : e.player === ME ? '#8fc46a' : '#d07a5a';
    octx.fillRect(s[0] - w / 2, s[1], w * anteil, 3);
    if (e.kind === 'building' && !e.done) {
      const f = Math.min(1, e.progress / (def.buildTime * 1000));
      octx.fillStyle = '#d8b06a';
      octx.fillRect(s[0] - w / 2, s[1] + 4, w * f, 2);
    }
    if (def.commander) {
      octx.fillStyle = '#e8dcc0';
      octx.font = '11px ui-sans-serif, system-ui, sans-serif';
      octx.textAlign = 'center';
      octx.fillText(def.name, s[0], s[1] - 5);
    }
  }
  // Auswahlrahmen
  if (drag && !drag.pan) {
    octx.strokeStyle = '#c8d8b0';
    octx.setLineDash([4, 3]);
    octx.strokeRect(drag.sx, drag.sy, drag.x - drag.sx, drag.y - drag.sy);
    octx.setLineDash([]);
  }
  // Angriffs-Fadenkreuz
  if (angriff) {
    octx.strokeStyle = '#c4603f';
    octx.beginPath();
    octx.arc(maus.x, maus.y, 10, 0, Math.PI * 2);
    octx.moveTo(maus.x - 15, maus.y);
    octx.lineTo(maus.x + 15, maus.y);
    octx.moveTo(maus.x, maus.y - 15);
    octx.lineTo(maus.x, maus.y + 15);
    octx.stroke();
  }
  if (placing) {
    octx.fillStyle = '#d8dcd0';
    octx.font = '12px ui-sans-serif, system-ui, sans-serif';
    octx.textAlign = 'center';
    const drin = inDomain(world, ME, hover.x, hover.y);
    const def = BUILDINGS[placing];
    const text =
      def.name +
      (drin || !def.gegenwartIn ? '' : ' — außerhalb der Domäne: ohne Gegenwart') +
      (erbauer3().length ? '' : ' — keine Erbauer gewählt: die Baustelle wartet');
    octx.fillText(text, maus.x, maus.y - 24);
  }
}

// ------------------------------------------------------------ HUD und Minikarte
function zeichneHud() {
  const p = world.players[ME];
  const k = kommandantVon(world, ME);
  let auswahl = '';
  const plan = selPlan ? planVon(world, selPlan) : null;
  if (selPlan && !plan) selPlan = null;
  if (plan) auswahl = planHtml(world, plan);
  else if (sel.length === 1) {
    const e = byId(world, sel[0]);
    if (e && e.kind === 'building') {
      const def = BUILDINGS[e.type];
      const zustand = !e.done
        ? baustelleText(world, e)
        : e.powered < 1000
          ? `gedrosselt ${Math.round(e.powered / 10)} %`
          : 'versorgt';
      const tasten = ausbildungHtml(world, ME, e.type);
      auswahl = `<div class="sel">${auswahlKopf(world, e)} · ${zustand}${reparaturText(world, e)}${e.queue.length ? ` · ${e.queue.length} in Auftrag` : ''}
        ${tasten}<div class="keys">${def.vital ? '' : '<kbd>Entf</kbd> abreißen'}</div></div>`;
    } else if (e) {
      auswahl = `<div class="sel">${auswahlKopf(world, e)}${einheitKarte(world, ME, e.type)}</div>`;
    }
  }
  // Wenig Text: Kommandant und Zeit; Rest nur bei Bedarf (Auswahl, Warnungen).
  document.getElementById('ressourcen').innerHTML = ressourcenHtml(world, ME);
  document.getElementById('hud').innerHTML = `
    <div class="res">
      ${k ? `<b>${UNITS[k.type].name} <kbd>K</kbd></b><span>${Math.round((100 * k.hp) / k.maxHp)} %</span>` : ''}
      <b>Zeit</b><span>${(world.tick / 600).toFixed(1)} min${paused ? ' ⏸' : ''}${speed !== 1 ? ' ×' + speed : ''}${wiederholung ? ' · Wiederholung' : aiMe ? ' · Zuschauen' : netz ? ' · Online' : tagesAktiv ? ' · Tagesherausforderung' : ''}</span>
    </div>
    ${(wiederholung && wdhSicht === 'alle') || aiMe ? beobachterHtml(world) : ''}${mission ? zieleHtml(mission, missionStand, world) : ''}${netzHinweis()}${standMeldung && performance.now() < standMeldungBis ? `<div class="warn"><span>${standMeldung}</span></div>` : ''}${warnungenHtml(world, ME)}${wiederholungsHinweis ? `<div class="warn"><span>${wiederholungsHinweis}</span></div>` : ''}
    ${auswahl}
    ${world.over ? `<div class="over">${world.winner === ME ? 'Gewonnen' : 'Verloren'}</div>` : ''}`;
}

function zeichneMini() {
  const W = mini3.width;
  mctx3.fillStyle = '#0b0d08';
  mctx3.fillRect(0, 0, W, W);
  const s = W / MAP;
  for (const h of world.hindernisse) {
    mctx3.fillStyle = h.art === 'see' ? '#2c5670' : '#4c4e42';
    mctx3.beginPath();
    mctx3.arc(h.x * s, h.y * s, h.r * s, 0, Math.PI * 2);
    mctx3.fill();
  }
  for (let p = 0; p < 2; p++) {
    mctx3.fillStyle = FACTIONS[world.players[p].faction].color;
    mctx3.globalAlpha = 0.18;
    for (const e of world.entities) {
      if (e.player !== p || e.kind !== 'building') continue;
      if (p !== ME && nebel.an && !nebel.bekannt.has(e.id)) continue;
      const r = anchorRadius(world, e);
      if (!r) continue;
      mctx3.beginPath();
      mctx3.arc(e.x * s, e.y * s, r * s, 0, Math.PI * 2);
      mctx3.fill();
    }
    mctx3.globalAlpha = 1;
    for (const e of world.entities) {
      if (e.player !== p || verborgen(e)) continue;
      const sz = e.kind === 'building' ? 4 : UNITS[e.type].commander ? 6 : 2.5;
      mctx3.fillRect(e.x * s - sz / 2, e.y * s - sz / 2, sz, sz);
    }
  }
  // Nebel auf der Minikarte: dasselbe Bild wie auf der Karte
  const bild = nebel.an ? nebelBild(nebel, nebelFrame) : null;
  if (bild) {
    mctx3.imageSmoothingEnabled = true;
    mctx3.drawImage(bild, 0, 0, W, W);
  }
  zeichnePings(fx, mctx3, s);
  // Kamera-Ziel
  mctx3.strokeStyle = '#e8dcc0';
  mctx3.lineWidth = 2;
  mctx3.beginPath();
  mctx3.arc((kam.x / DM) * s, (kam.z / DM) * s, Math.max(6, (kam.dist / DM) * s * 0.35), 0, Math.PI * 2);
  mctx3.stroke();
}

// ------------------------------------------------------------ Startbildschirm
const STIL_NAMEN3 = { sturm: 'Sturm — greift früh an', standard: 'Standard', burg: 'Burg — baut aus, greift spät an' };
function introHtml3() {
  return `<h1>Die drei Reiche — 3D</h1>
    <p class="frage">Fördern, aufbauen, ausbreiten — und Hauptgebäude oder Kommandant des Gegners zerstören.</p>
    ${neuheitenHtml()}
    ${fortsetzenHtml()}
    ${kampagneHtml()}
    ${onlineHtml()}
    ${bilanzHtml()}
    ${kodexKnopfHtml()}
    <details class="regeln"><summary>Spielregeln in Kürze</summary>
    <p>Menschen: viele günstige Einheiten. Wald- und Wiesengott: wenige starke. Die Domäne
    (farbige Fläche) zeigt, wo Gegenwart fließt; Schreine stärken eigene Einheiten in ihrem Umkreis, soweit er in der Domäne liegt. Fällt der Kommandant,
    ist die Partie verloren.</p>
    <p>Erbauer (Arbeiter oder Kommandant) wählen, dann Gebäude setzen: Das ist erst ein <b>Bauplan</b>
    — ohne Kosten, ohne Sicht. Gebaut und bezahlt wird, sobald ein Erbauer daneben steht; wer weggeht,
    baut nicht weiter. Mit <kbd>Shift</kbd> reiht man mehrere Pläne hintereinander.</p>
    <p>Jede Einheit kostet laufend <b>Unterhalt</b> in Fron — große Heere fressen die Wirtschaft.
    Mit der Zeit kommen <b>Skillpunkte</b> (<kbd>T</kbd>): Sie schalten Fernkämpfer, schwere Einheiten,
    Schreine, Verbesserungen und drei Fähigkeiten des Kommandanten frei — Kommandant wählen, dann
    <kbd>Q</kbd>–<kbd>E</kbd> oder die Knöpfe. Wer lange lebt,
    sammelt ein wenig Erfahrung.</p>
    </details>
    <p style="color:var(--dim)">Dieselbe Simulation wie die 2D-Ansicht — Spielstände, Kampagnen und Wiederholungen passen in beide.</p>
    <div class="stil">Gegner:
      ${Object.keys(STILE)
        .map((s) => `<label><input type="radio" name="stil" value="${s}"${s === gegnerStil ? ' checked' : ''}> ${STIL_NAMEN3[s]}</label>`)
        .join('')}
    </div>
    <div class="stil">Schwierigkeit:
      ${Object.keys(STUFEN)
        .map((s) => `<label><input type="radio" name="stufe" value="${s}"${s === gegnerStufe ? ' checked' : ''}> ${STUFEN_NAMEN[s]}</label>`)
        .join('')}
    </div>
    ${gegnerVolkHtml(gegnerVolk)}
    ${kartenWahlHtml(karteSchluessel)}
${wiederholungWahlHtml()}
    <div class="go">
      <button id="introMensch">Als Menschen spielen</button>
      <button id="introGott">Als Gott spielen</button>
      <button id="introTod">Als Todesgott spielen</button>
      <button id="introSchau">Zuschauen</button>
    </div>`;
}
const STUFEN_NAMEN = {
  leicht: 'Leicht — reagiert langsam, baut wenig aus',
  mittel: 'Mittel',
  schwer: 'Schwer — schnell, baut früh aus',
};
function starte3(f, zuschauen) {
  const gewaehlt = document.querySelector?.('#intro input[name="stil"]:checked');
  if (gewaehlt) gegnerStil = gewaehlt.value;
  const stufe = document.querySelector?.('#intro input[name="stufe"]:checked');
  if (stufe) gegnerStufe = stufe.value;
  const volk = document.querySelector?.('#intro input[name="gegnerVolk"]:checked');
  if (volk) gegnerVolk = volk.value;
  const karte = document.querySelector?.('#intro input[name="karte"]:checked');
  if (karte) karteSchluessel = karte.value;
  document.getElementById('intro').style.display = 'none';
  paused = false;
  neu(f, zuschauen);
}


// ------------------------------------------------------------ Spielende und Wiederholungen
/** Siegbildschirm ueber dem Spielfeld. */
function zeigeEnde() {
  endeGezeigt = true;
  if (aufnahme) aufnahmeAbschliessen(aufnahme, world);
  const el = document.getElementById('intro');
  if (mission && !wiederholung) {
    const gewonnen = missionGewonnen || world.winner === ME;
    const neue = ergebnisErfassen(gewonnen);
    missionEndeZeigen(el, mission, gewonnen, { waehle: missionWaehlen, menue: startbildschirm, welt: world });
    el.insertAdjacentHTML('beforeend', neueErfolgeHtml(neue));
    return;
  }
  const gewonnen = world.winner === ME;
  const neue = ergebnisErfassen(gewonnen);
  const tagesZeile = tagesAktiv && gewonnen ? `<div class="neueErfolge"><div>📅 <b>Tagesherausforderung geschafft</b> in ${(world.tick / 600).toFixed(1).replace('.', ',')} Minuten</div></div>` : '';
  el.innerHTML = siegHtml(world, verlauf, ME, !!aufnahme, !!wiederholung) + tagesZeile + neueErfolgeHtml(neue);
  el.style.display = '';
  const knopf = (id, f) => {
    const b = document.getElementById(id);
    if (b) b.onclick = f;
  };
  knopf('endeSpeichern', () => aufnahmeSpeichern(aufnahme));
  knopf('endeKarte', () => (el.style.display = 'none'));
  knopf('endeNochmal', () => startbildschirm());
}

// ------------------------------------------------------------ Kampagne (src/kampagne.js)
/** Vorwort zeigen; "Los" startet die Mission. */
function missionWaehlen(m) {
  paused = true;
  vorwortZeigen(document.getElementById('intro'), m, () => {
    paused = false;
    neu(m.volk, false, null, m);
  }, startbildschirm);
}

/** Funksprueche: faellige Meldung der Mission zeigen, neun Sekunden lang. */
function missionFunk() {
  if (mission && !world.over && !missionGewonnen) {
    const mld = naechsteMeldung(mission, missionMeldungen, world, ME, missionStand);
    if (mld) {
      funkText = funkHtml(mld);
      funkBis = performance.now() + 9000;
      meldungsKlang(fx);
    }
  }
  const zeigen = performance.now() < funkBis ? funkText : '';
  if (zeigen !== funkGezeigt) {
    document.getElementById('funk').innerHTML = zeigen;
    funkGezeigt = zeigen;
  }
}

/** Ziele pruefen (je Bild); sind alle erfuellt, ist die Mission gewonnen. */
function missionFortschritt() {
  if (!mission || wiederholung || world.over || missionGewonnen) return;
  if (missionPruefen(mission, missionStand, world, ME, { sel, gruppen }) && mission.sieg === 'ziele') missionGewonnen = true;
}

// ------------------------------------------------------------ Spielstaende (src/spielstand.js)
let standMeldung = '';
let standMeldungBis = 0;
function standHinweis(text) {
  standMeldung = text;
  standMeldungBis = performance.now() + 2500;
}
function standText() {
  return spielstandText(world, [aiMe, ai], {
    meFaction,
    zuschauen: !!aiMe,
    gegnerStil,
    gegnerStufe,
    karteSchluessel,
    mission: mission ? mission.id : null,
    missionTitel: mission ? mission.titel : '',
    missionStand,
    missionMeldungen,
    tages: tagesAktiv,
    aufnahme,
    verlauf,
    gruppen,
    kam: { x: kam.x, z: kam.z, dist: kam.dist, yaw: kam.yaw },
  });
}
/** F5: Schnellspeichern (auch automatisch beim Verlassen der Seite). */
function standSpeichern() {
  if (netz) return standHinweis('Online gibt es keine Spielstände');
  if (!world || world.over || wiederholung || missionGewonnen) return standHinweis('Hier gibt es nichts zu speichern');
  standHinweis(schnellSpeichern(standText()) ? 'Gespeichert — F9 lädt' : 'Speichern fehlgeschlagen (Speicher voll?)');
}
/** F9 oder "Fortsetzen": Spielstand laden und weiterspielen. */
function standLaden(text) {
  if (netz && !netz.zu && !world.over) return standHinweis('Online gibt es keine Spielstände');
  const r = spielstandLesen(text || '');
  if (r.fehler) return standHinweis(r.fehler);
  document.getElementById('intro').style.display = 'none';
  paused = false;
  neu(r.s.extra.meFaction, r.s.extra.zuschauen, null, null, r.s);
  wiederholungsHinweis = r.warnung;
  standHinweis('Spielstand geladen');
}
function autoSpeichern() {
  if (autoSpeichernSinnvoll(world, !!aiMe, wiederholung) && !missionGewonnen && !netz) schnellSpeichern(standText());
}
addEventListener('pagehide', autoSpeichern);
addEventListener('visibilitychange', () => {
  if (document.hidden) autoSpeichern();
});

// ------------------------------------------------------------ Wiederholung: Zeitleiste, Springen, Sicht
let wdhStaende = []; // jede Minute ein Stand: { tick, zustand, zeiger, verlauf } -- zum Zurueckspringen
let spulenBis = -1; // Ziel beim Spulen (Tick), sonst -1
let wdhSicht = 'alle'; // 'alle' oder der Sitzplatz, durch dessen Augen man sieht
let reglerZieht = false;
const wdhZeit = (t) => {
  const s = Math.max(0, Math.round(t / 10));
  return ((s / 60) | 0) + ':' + String(s % 60).padStart(2, '0');
};
function wdhStandMerken() {
  if (!wiederholung || world.tick % 600 !== 0 || wdhStaende.some((s) => s.tick === world.tick)) return;
  wdhStaende.push({ tick: world.tick, zustand: zustandSichern(world, [aiMe, ai]), zeiger: wdhZeiger, verlauf: JSON.parse(JSON.stringify(verlauf)) });
}
/** Zu einem Tick springen: zurueck ueber den letzten Stand davor, dann vorspulen. */
function wdhSpringen(ziel) {
  if (!wiederholung) return;
  ziel = Math.max(0, Math.min(wiederholung.ende, ziel | 0));
  let bester = null;
  for (const s of wdhStaende) if (s.tick <= ziel && (!bester || s.tick > bester.tick)) bester = s;
  if (bester && (ziel < world.tick || bester.tick > world.tick)) {
    const g = zustandLaden(bester.zustand);
    world = g.world;
    aiMe = g.ais[0];
    ai = g.ais[1];
    wdhZeiger = bester.zeiger;
    verlauf = JSON.parse(JSON.stringify(bester.verlauf));
    endeGezeigt = false;
    sel = [];
    effekteLeeren(fx);
    nebel = neuerNebel(wdhSicht !== 'alle', ME);
    vorher.clear();
    blick.clear();
    staub = [];
    wirkungen = [];
  }
  spulenBis = ziel;
}
/** Je Bild: beim Spulen so viele Ticks wie in 30 ms passen, ohne Effekte. */
function wdhSpulen(tickFn) {
  if (spulenBis < 0) return;
  const bis = performance.now() + 30;
  while (world.tick < spulenBis && !world.over && performance.now() < bis) tickFn(true);
  if (world.tick >= spulenBis || world.over) spulenBis = -1;
}
/** Sicht in der Wiederholung: alles, oder mit Nebel durch die Augen eines Spielers. */
function wdhSichtSetzen(v) {
  wdhSicht = v;
  if (v !== 'alle') {
    ME = v;
    meFaction = world.players[v].faction;
    // Kamera zur Basis dieses Spielers
    const heim = world.entities.find((e) => e.player === v && e.kind === 'building' && BUILDINGS[e.type].vital);
    if (heim) {
      kam.x = heim.x * DM;
      kam.z = heim.y * DM;
    }
  }
  nebel = neuerNebel(v !== 'alle', ME);
  sel = [];
  leistenSig = '';
  zeitleisteZeigen();
}
function zeitleisteZeigen() {
  const el = document.getElementById('zeitleiste');
  if (!wiederholung) {
    el.hidden = true;
    el.innerHTML = '';
    return;
  }
  const name = (p) => volkName(world.players[p].faction);
  const knopf = (wert, text, an) => `<button data-${wert}${an ? ' class="an"' : ''}>${text}</button>`;
  el.innerHTML = `<button id="wdhSpiel" title="Abspielen / Anhalten (Leertaste)">⏯</button>
    <button data-sprung="-300" title="30 s zurück">−30 s</button><button data-sprung="300" title="30 s vor">+30 s</button>
    <input id="wdhRegler" type="range" min="0" max="${wiederholung.ende}" step="10" value="${world.tick}">
    <span id="wdhZeit"></span>
    <span class="gruppe">${[1, 2, 4, 8, 16].map((t) => knopf('tempo="' + t + '"', '×' + t, speed === t)).join('')}</span>
    <span class="gruppe">${knopf('sicht="alle"', 'Alles', wdhSicht === 'alle')}${knopf('sicht="0"', name(0), wdhSicht === 0)}${knopf('sicht="1"', name(1), wdhSicht === 1)}</span>`;
  el.hidden = false;
  el.onclick = (e) => {
    const b = e.target.closest ? e.target.closest('button') : null;
    if (!b) return;
    if (b.id === 'wdhSpiel') paused = !paused;
    else if (b.dataset.sprung) wdhSpringen(world.tick + Number(b.dataset.sprung));
    else if (b.dataset.tempo) {
      speed = Number(b.dataset.tempo);
      zeitleisteZeigen();
    } else if (b.dataset.sicht) wdhSichtSetzen(b.dataset.sicht === 'alle' ? 'alle' : Number(b.dataset.sicht));
  };
  const regler = document.getElementById('wdhRegler');
  regler.onpointerdown = () => (reglerZieht = true);
  regler.onpointerup = () => (reglerZieht = false);
  regler.oninput = () => (document.getElementById('wdhZeit').textContent = `→ ${wdhZeit(Number(regler.value))} / ${wdhZeit(wiederholung.ende)}`);
  regler.onchange = () => {
    reglerZieht = false;
    wdhSpringen(Number(regler.value));
  };
}
/** Je Bild: Regler und Zeit nachfuehren (nicht, waehrend man zieht). */
function zeitleisteAktualisieren() {
  if (!wiederholung || reglerZieht) return;
  const regler = document.getElementById('wdhRegler');
  if (!regler) return;
  regler.value = world.tick;
  const text = `${wdhZeit(world.tick)} / ${wdhZeit(wiederholung.ende)}${spulenBis >= 0 ? ' · spule …' : paused ? ' · angehalten' : ''}`;
  const z = document.getElementById('wdhZeit');
  if (z.textContent !== text) z.textContent = text;
}

// ------------------------------------------------------------ Bilanz und Erfolge (src/bilanz.js)
/** Ende einer eigenen Partie eintragen (nicht beim Zuschauen oder Abspielen); liefert neue Erfolge. */
function ergebnisErfassen(gewonnen) {
  if (wiederholung || aiMe) return [];
  const k = mission ? mission.kampagne : null;
  return partieErfassen({
    gewonnen,
    volk: meFaction,
    stufe: gegnerStufe,
    stil: gegnerStil,
    karte: world.karte,
    minuten: world.tick / 600,
    verluste: verlauf.verluste[ME],
    ausgebildet: verlauf.ausgebildet[ME],
    online: !!netz,
    tages: tagesAktiv ? tagesAktiv.tag : 0,
    mission: mission ? mission.id : null,
    kampagneFertig: k && gewonnen && k.missionen[k.missionen.length - 1] === mission ? k.id : null,
  });
}
function tagesAnnehmen() {
  const h = tagesHerausforderung();
  karteSchluessel = 'zufall';
  gegnerStil = h.stil;
  gegnerStufe = h.stufe;
  tagesStart = h;
  document.getElementById('intro').style.display = 'none';
  paused = false;
  neu(h.volk);
}

// ------------------------------------------------------------ Online (src/netz.js)
function netzPost(msg) {
  if (netz) netzSenden(netz.kanal, msg);
}
/** Hinweise im HUD: Warten auf den Mitspieler, getrennt, auseinandergelaufen. */
function netzHinweis() {
  if (!netz) return '';
  if (netz.zu) return `<div class="warn"><span>${netz.zu} — F10: Hauptmenü</span></div>`;
  if (netz.gs.asynchron >= 0) return `<div class="warn"><span>Die Partien sind auseinandergelaufen (Tick ${netz.gs.asynchron}) — bitte neu starten.</span></div>`;
  if (netz.wartetSeit && performance.now() - netz.wartetSeit > 700) return '<div class="warn"><span>Warte auf den Mitspieler …</span></div>';
  return '';
}
/** Rueckrufe fuer die Online-Dialoge: Karte aus dem Startbildschirm, Start, Nachrichten, Abbruch. */
function onlineRueckrufe() {
  return {
    karte: () => {
      const r = document.querySelector?.('#intro input[name="karte"]:checked');
      if (r) karteSchluessel = r.value;
      return karteFuerSpiel(karteSchluessel, null, (Date.now() / 1000) | 0);
    },
    start: (config, ich, kanal) => {
      document.getElementById('intro').style.display = 'none';
      paused = false;
      speed = 1;
      neu(config.factions[0], false, null, null, null, { config, ich, kanal });
    },
    nachricht: (msg) => {
      if (msg.t === 'chat') chatZeigen(FACTIONS[world.players[1 - ME].faction].name, msg.text);
      else if (netz) gsEmpfangen(netz.gs, msg);
    },
    zu: (grund) => {
      if (netz) netz.zu = grund || 'Verbindung zum Mitspieler getrennt';
    },
    zurueck: startbildschirm,
  };
}

// Chat (nur online): Enter oeffnet das Feld, Enter sendet, Esc schliesst
const chatFeld = document.getElementById('chat');
function chatZeigen(wer, text) {
  funkText = funkHtml({ wer, text: textSicher(text) });
  funkBis = performance.now() + 8000;
  meldungsKlang(fx);
}
function chatSchliessen() {
  chatFeld.value = '';
  chatFeld.hidden = true;
  chatFeld.blur();
}
chatFeld.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const text = chatFeld.value.trim().slice(0, 200);
    if (text && netz) {
      netzPost({ t: 'chat', text });
      chatZeigen('Du', text);
    }
    chatSchliessen();
  } else if (e.key === 'Escape') chatSchliessen();
});

// ------------------------------------------------------------ Pausenmenue (F10)
let menueOffen = false;
let pauseVorMenue = false;
function menueZeigen() {
  if (menueOffen) return menueSchliessen();
  const el = document.getElementById('intro');
  if (el.style.display !== 'none') return; // Start-, End- oder Missionsbildschirm ist offen
  menueOffen = true;
  pauseVorMenue = paused;
  if (!netz) paused = true; // online laeuft die Partie weiter
  const laufend = !world.over && !wiederholung && !missionGewonnen;
  el.innerHTML = menueHtml(laufend, !netz && !!schnellLaden(), !netz);
  el.style.display = '';
  const knopf = (id, f) => {
    const b = document.getElementById(id);
    if (b) b.onclick = f;
  };
  knopf('menueWeiter', menueSchliessen);
  knopf('menueSpeichern', () => {
    menueSchliessen();
    standSpeichern();
  });
  knopf('menueLaden', () => {
    menueOffen = false;
    standLaden(schnellLaden());
  });
  knopf('menueEinstellungen', () => {
    el.innerHTML = einstellungenHtml(einstellungenLesen());
    einstellungenVerdrahten(fx, musik, () => {
      menueOffen = false;
      paused = pauseVorMenue;
      el.style.display = 'none';
      menueZeigen();
    });
  });
  knopf('menueHilfe', () => {
    menueSchliessen();
    document.getElementById('hilfeKnopf').onclick();
  });
  knopf('menueAufgeben', () => {
    menueSchliessen();
    paused = false;
    issue(world, { type: 'aufgeben', player: ME });
  });
  knopf('menueHaupt', () => {
    menueOffen = false;
    autoSpeichern(); // "Fortsetzen" bringt einen zurueck
    startbildschirm();
  });
}
function menueSchliessen() {
  menueOffen = false;
  paused = pauseVorMenue;
  document.getElementById('intro').style.display = 'none';
}
document.getElementById('menueKnopf').onclick = menueZeigen;

// ------------------------------------------------------------ Ansicht wechseln
// Laeuft eine eigene Partie, nimmt der Knopf 2D/3D sie mit: Spielstand
// sichern, andere Seite mit #weiter oeffnen, dort sofort laden.
document.getElementById('ansichtWechsel').onclick = (e) => {
  const laeuft = world && !world.over && !wiederholung && !netz && !missionGewonnen && document.getElementById('intro').style.display === 'none';
  if (!laeuft || !schnellSpeichern(standText())) return; // sonst einfach die andere Seite
  e.preventDefault();
  location.href = e.currentTarget.getAttribute('href') + '#weiter';
};
function vonAndererAnsichtWeiter() {
  if (typeof location === 'undefined' || location.hash !== '#weiter') return;
  if (typeof history !== 'undefined' && history.replaceState) history.replaceState(null, '', location.pathname + location.search);
  const t = schnellLaden();
  if (t) standLaden(t);
}

/** Startbildschirm zeigen und verdrahten. */
function startbildschirm() {
  const el = document.getElementById('intro');
  el.innerHTML = introHtml3();
  el.style.display = '';
  document.getElementById('introMensch').onclick = () => starte3('mensch', false);
  document.getElementById('introGott').onclick = () => starte3('gott', false);
  document.getElementById('introTod').onclick = () => starte3('tod', false);
  document.getElementById('introSchau').onclick = () => starte3('mensch', true);
  kampagneVerdrahten(el, missionWaehlen);
  kartenVorschauVerdrahten(el);
  const neuKnopf = document.getElementById('neuheitenOk');
  if (neuKnopf) {
    neuKnopf.onclick = () => {
      neuheitenGesehen();
      startbildschirm();
    };
  }
  const kodexKnopf = document.getElementById('kodexOeffnen');
  if (kodexKnopf) kodexKnopf.onclick = () => kodexZeigen(el, startbildschirm);
  const tagesKnopf = document.getElementById('tagesStart');
  if (tagesKnopf) tagesKnopf.onclick = tagesAnnehmen;
  const erfolgeKnopf = document.getElementById('erfolgeZeigen');
  if (erfolgeKnopf) {
    erfolgeKnopf.onclick = () => {
      el.innerHTML = erfolgeHtml();
      document.getElementById('erfolgeZurueck').onclick = startbildschirm;
    };
  }
  const eroeffnen = document.getElementById('onlineEroeffnen');
  if (eroeffnen) eroeffnen.onclick = () => onlineEroeffnen(el, onlineRueckrufe());
  const beitreten = document.getElementById('onlineBeitreten');
  if (beitreten) beitreten.onclick = () => onlineBeitreten(el, onlineRueckrufe());
  const weiterKnopf = document.getElementById('standFortsetzen');
  if (weiterKnopf) weiterKnopf.onclick = () => standLaden(schnellLaden());
  const datei = document.getElementById('wiederholungDatei');
  if (datei) datei.onchange = () => wiederholungLaden(datei);
  const kDatei = document.getElementById('karteDatei');
  if (kDatei) {
    kDatei.onchange = () =>
      karteDateiLaden(kDatei, (meldung) => {
        if (meldung) {
          const m = document.getElementById('karteMeldung');
          if (m) m.textContent = meldung;
        } else {
          karteSchluessel = 'eigen:' + (eigeneKarten().length - 1);
          startbildschirm();
        }
      });
  }
  paused = true;
}

/** Eine Wiederholung aus einer Datei laden und abspielen. */
function wiederholungLaden(eingabe) {
  const datei = eingabe.files && eingabe.files[0];
  if (!datei) return;
  const meldung = document.getElementById('wiederholungMeldung');
  datei.text().then((text) => {
    const r = aufnahmeLesen(text);
    if (r.fehler) {
      if (meldung) meldung.textContent = r.fehler;
      return;
    }
    document.getElementById('intro').style.display = 'none';
    paused = false;
    neu(r.a.factions[0], !!r.a.zuschauen, r.a);
    wiederholungsHinweis = r.warnung;
  });
}
let wiederholungsHinweis = '';

// ------------------------------------------------------------ Start
if (!gl) {
  document.getElementById('nogl').style.display = 'grid';
  document.getElementById('intro').style.display = 'none';
} else {
  initGL();
  // Nebel des Krieges: eine Textur, eine Zelle je Texel (siehe zeichne)
  nebelTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, nebelTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  startbildschirm();
  neu('mensch', true);
  paused = true;
  vonAndererAnsichtWeiter();
  requestAnimationFrame(frame);
}
