// Gemeinsame Texte fuer beide Oberflaechen (2D und 3D). Liest den Zustand,
// aendert ihn nie. tools/bundle.mjs fuegt diese Datei vor ui.js bzw. ui3d.js ein.

import { BUILDINGS, UNITS, FACTIONS, RULES, SKILLS, AESTE, FAEHIGKEITEN, MAP, PRIO_NAMES } from './sim/defs.js';
import {
  erfahrung, skillFrei, kannLernen, faehigkeitenVon, faehigkeitWarten, gesperrt, forschungProTick,
  gridReport, foerderungProMin, unterhaltProMin, byId, canAfford,
} from './sim/sim.js';
import { neueKunde, aufklaeren, inSicht } from './sim/kunde.js';
import { ICONS } from './icons.js';
import { zufallsKarte, kartenFehler } from './sim/kartenbau.js';

const prozent = (promille) => Math.round(promille / 10) + ' %';
const sekunden = (ticks) => Math.round(ticks / 10) + ' s';
const meterText = (dm) => Math.round(dm / 10) + ' m';

// ------------------------------------------------------------ Nebel des Krieges
// Was man weiss, kommt aus src/sim/kunde.js -- dieselbe Sicht, mit der auch
// die KI spielt. Hier nur die Darstellung: ein feines Sichtfeld mit weichem
// Rand, das beim Auf- und Zudecken ueberblendet, und das Erkundete.

/** Kantenlaenge des Sichtfelds in Zellen (eine Zelle knapp 8 m). */
export const NEBEL_N = 256;
const NEBEL_Z = MAP / NEBEL_N;
// Breite des weichen Rands (dm) und Tempo der Ueberblendung (je Sekunde)
const NEBEL_KANTE = 220;
const NEBEL_TEMPO = 6;
// Helligkeit des Erkundeten, 0..1 (sichtbar 1, unbekannt 0)
const NEBEL_ERKUNDET = 0.47;

export function neuerNebel(an, player) {
  const n = NEBEL_N * NEBEL_N;
  const hell = new Uint8Array(n);
  if (!an) hell.fill(255);
  return {
    an,
    kunde: neueKunde(player),
    bekannt: new Map(), // zuletzt gesehene gegnerische Gebaeude nach Id
    ziel: new Float32Array(n), // Sicht jetzt, 0..1
    anzeige: new Float32Array(n), // Sicht, wie sie gerade gezeigt wird (blendet zum Ziel)
    erkundet: new Float32Array(n),
    hell, // 0..255 je Zelle: was Karte und Textur zeigen
    tick: -1,
    zeit: 0,
    bild: null, // Canvas mit dem Nebel, je Frame einmal gemalt
    bildFrame: -1,
  };
}

/**
 * Je Frame: Wissen und Sichtfeld auf den Stand des Ticks bringen (nur wenn
 * ein neuer Tick da ist), dann die Anzeige zum Ziel ueberblenden.
 */
export function nebelAktualisieren(nebel, world) {
  if (!nebel.an) return;
  if (nebel.tick !== world.tick) {
    nebel.tick = world.tick;
    aufklaeren(nebel.kunde, world);
    nebel.bekannt = new Map(nebel.kunde.gebaeude.map((b) => [b.id, b]));
    sichtfeld(nebel);
  }
  const jetzt = typeof performance !== 'undefined' ? performance.now() : 0;
  const dt = nebel.zeit ? Math.min(0.25, (jetzt - nebel.zeit) / 1000) : 1;
  nebel.zeit = jetzt;
  const a = dt >= 1 ? 1 : 1 - Math.exp(-dt * NEBEL_TEMPO);
  const { ziel, anzeige, erkundet, hell } = nebel;
  for (let i = 0; i < ziel.length; i++) {
    const s = (anzeige[i] += (ziel[i] - anzeige[i]) * a);
    const e = erkundet[i] * NEBEL_ERKUNDET;
    hell[i] = ((s > e ? s : e) * 255) | 0;
  }
}

/** Sichtfeld aus den Quellen: je Zelle der beste Wert, weicher Rand, Erkundetes merken. */
function sichtfeld(nebel) {
  const z = nebel.ziel;
  z.fill(0);
  const q = nebel.kunde.quellen;
  const n = NEBEL_N;
  for (let i = 0; i < q.length; i += 3) {
    const x = q[i];
    const y = q[i + 1];
    const aussen = q[i + 2] + NEBEL_KANTE / 2;
    const x0 = Math.max(0, Math.floor((x - aussen) / NEBEL_Z));
    const x1 = Math.min(n - 1, Math.floor((x + aussen) / NEBEL_Z));
    const y0 = Math.max(0, Math.floor((y - aussen) / NEBEL_Z));
    const y1 = Math.min(n - 1, Math.floor((y + aussen) / NEBEL_Z));
    for (let cy = y0; cy <= y1; cy++) {
      const my = (cy + 0.5) * NEBEL_Z - y;
      for (let cx = x0; cx <= x1; cx++) {
        const mx = (cx + 0.5) * NEBEL_Z - x;
        const v = (aussen - Math.sqrt(mx * mx + my * my)) / NEBEL_KANTE;
        if (v <= 0) continue;
        const w = v >= 1 ? 1 : v * v * (3 - 2 * v);
        const k = cy * n + cx;
        if (w > z[k]) z[k] = w;
      }
    }
  }
  const e = nebel.erkundet;
  for (let i = 0; i < z.length; i++) if (z[i] > e[i]) e[i] = z[i];
}

/** Liegt der Punkt gerade in eigener Sicht? Ohne Nebel immer. */
export function sieht(nebel, x, y) {
  return !nebel.an || inSicht(nebel.kunde.quellen, x, y);
}

/** Ist diese gegnerische Entity gerade verborgen? Eigene nie, ohne Nebel nie. */
export function imNebel(nebel, e, ich) {
  return nebel.an && e.player !== ich && !nebel.kunde.jetzt.has(e.id);
}

/** Ist die Ader besetzt -- soweit man es weiss? Ein eigener Bau darauf oder ein gesehener gegnerischer. */
export function aderBesetzt(nebel, world, d, ich) {
  if (!d.takenBy) return false;
  if (!nebel.an || nebel.bekannt.has(d.takenBy)) return true;
  const b = byId(world, d.takenBy);
  return !!b && b.player === ich;
}

/**
 * Der Nebel als Bild (NEBEL_N × NEBEL_N), zum Hochskalieren: unbekannt fast
 * schwarz, erkundet halb, sichtbar frei. Je Frame nur einmal gemalt.
 */
export function nebelBild(nebel, frame) {
  if (typeof document === 'undefined' || !document.createElement) return null;
  if (!nebel.bild) {
    nebel.bild = document.createElement('canvas');
    nebel.bild.width = NEBEL_N;
    nebel.bild.height = NEBEL_N;
  }
  if (nebel.bildFrame === frame) return nebel.bild;
  nebel.bildFrame = frame;
  const c = nebel.bild.getContext && nebel.bild.getContext('2d');
  const img = c && c.createImageData ? c.createImageData(NEBEL_N, NEBEL_N) : null;
  if (!img || !img.data) return null;
  const h = nebel.hell;
  for (let i = 0; i < h.length; i++) {
    img.data[i * 4] = 11;
    img.data[i * 4 + 1] = 13;
    img.data[i * 4 + 2] = 8;
    img.data[i * 4 + 3] = (225 * (255 - h[i])) / 255;
  }
  c.putImageData(img, 0, 0);
  return nebel.bild;
}

// ------------------------------------------------------------ Ressourcenleiste
// Nach dem Entwurf des Nutzers: dunkle Leiste oben links, rechts rund
// auslaufend; Gluehbirne = freie Skillpunkte, Blitz = Gegenwart, Tropfen =
// Goetterblut, gruene Kristalle = Fron. Icons in src/icons.js.
/** Ressourcenleiste: freie Skillpunkte, Gegenwart-Ueberschuss aller Netze, Goetterblut, Fron. */
export function ressourcenHtml(world, player) {
  const p = world.players[player];
  let angebot = 0;
  let bedarf = 0;
  for (const r of gridReport(world, player)) {
    angebot += r.supply;
    bedarf += r.demand;
  }
  const frei = angebot - bedarf;
  const plus = foerderungProMin(world, player);
  const minus = unterhaltProMin(world, player);
  const eintrag = (icon, wert, titel, klasse = '') =>
    `<div class="ri" title="${titel}">${icon}<span class="${klasse}">${wert}</span></div>`;
  return (
    eintrag(ICONS.skillpunkte, skillFrei(world, player), `Skillpunkte, die du ausgeben kannst (T) — nächster in ${naechsterPunkt(world, player)}`, skillFrei(world, player) > 0 ? 'frei' : '') +
    eintrag(ICONS.gegenwart, frei, `Gegenwart: ${angebot} geliefert, ${bedarf} gebraucht`, frei < 0 ? 'knapp' : '') +
    eintrag(ICONS.goetterblut, p.goetterblut, 'Götterblut') +
    eintrag(ICONS.fron, p.fron, `Fron: +${plus} Förderung, −${minus} Unterhalt pro Minute`, plus - minus < 0 ? 'knapp' : '')
  );
}

// ------------------------------------------------------------ Karten: fest, Zufall, eigene

const KARTEN_SPEICHER = 'dreiReiche.karten';

/** Vom Editor gewaehlte Karte (einmalig), sonst die klassische. */
export function vorgewaehlteKarte() {
  try {
    const k = localStorage.getItem('dreiReiche.karteWahl');
    if (k) {
      localStorage.removeItem('dreiReiche.karteWahl');
      return k;
    }
  } catch {
    /* ohne Speicher eben die Vorgabe */
  }
  return 'klassisch';
}

/** Eigene Karten aus dem Speicher des Browsers (vom Editor oder geladen). */
export function eigeneKarten() {
  try {
    const l = JSON.parse(localStorage.getItem(KARTEN_SPEICHER) || '[]');
    return Array.isArray(l) ? l : [];
  } catch {
    return [];
  }
}

/** Eine eigene Karte speichern (gleicher Name ersetzt); liefert ihre Nummer. */
export function eigeneKarteSpeichern(daten) {
  const l = eigeneKarten().filter((k) => k.name !== daten.name);
  l.push(daten);
  try {
    localStorage.setItem(KARTEN_SPEICHER, JSON.stringify(l));
  } catch {
    /* ohne Speicher nur fuer diese Sitzung */
  }
  return l.length - 1;
}

/**
 * Welche Karte gespielt wird: { schluessel, daten }. schluessel ist ein
 * Name aus KARTEN, 'zufall' (neu gebaut zur Zahl seed) oder 'eigen:<Nummer>';
 * eine Wiederholung bringt ihre Karte selbst mit.
 */
export function karteFuerSpiel(schluessel, wdh, seed) {
  if (wdh) return { schluessel: wdh.karte, daten: wdh.karteDaten || KARTEN[wdh.karte] || KARTEN.klassisch };
  if (schluessel === 'zufall') return { schluessel: 'zufall', daten: zufallsKarte(seed) };
  if (schluessel.startsWith('eigen:')) {
    const d = eigeneKarten()[Number(schluessel.slice(6))];
    if (d && !kartenFehler(d).length) return { schluessel: 'eigen', daten: d };
  }
  return KARTEN[schluessel] ? { schluessel, daten: KARTEN[schluessel] } : { schluessel: 'klassisch', daten: KARTEN.klassisch };
}

/** Kartenwahl fuer den Startbildschirm: feste Karten, Zufall, eigene, laden, Editor. */
export function kartenWahlHtml(gewaehlt) {
  const knopf = (wert, name) =>
    `<label><input type="radio" name="karte" value="${wert}"${wert === gewaehlt ? ' checked' : ''}> ${name}</label>`;
  const eigene = eigeneKarten().map((k, i) => knopf('eigen:' + i, '✎ ' + k.name)).join('');
  return `<div class="kartenwahl"><canvas id="kartenVorschau" width="132" height="132" title="Vorschau der Karte"></canvas>
    <div class="stil">Karte:
      ${Object.keys(KARTEN).map((k) => knopf(k, KARTEN[k].name)).join('')}
      ${knopf('zufall', '⚄ Zufall — jedes Spiel neu')}
      ${eigene}
    </div></div>
    <div class="stil">Eigene Karte: <a class="btn" href="karteneditor.html">Karteneditor öffnen</a>
      laden: <input type="file" id="karteDatei" accept=".json,application/json"> <span id="karteMeldung"></span></div>`;
}

/** Kleine Draufsicht einer Karte: Wald, Wiesen, Wasser, Fels, Furten, Adern, beide Basen. */
export function karteVorschauMalen(leinwand, daten, zufall = false) {
  const g = leinwand && leinwand.getContext ? leinwand.getContext('2d') : null;
  if (!g || !g.fillRect) return;
  const n = leinwand.width;
  const s = n / MAP;
  const kreis = (x, y, r, farbe) => {
    g.fillStyle = farbe;
    g.beginPath();
    g.arc(x * s, y * s, Math.max(1, r * s), 0, Math.PI * 2);
    g.fill();
  };
  g.fillStyle = '#2b3322';
  g.fillRect(0, 0, n, n);
  for (const w of daten.wiesen || []) kreis(w.x, w.y, w.r, '#3c4a28');
  for (const w of daten.wald || []) kreis(w.x, w.y, w.r, '#223019');
  for (const h of daten.hindernisse) kreis(h.x, h.y, h.r, h.art === 'fels' ? '#6b6a62' : '#2f5a78');
  for (const f of daten.furten || []) kreis(f.x, f.y, 260, '#8a7f5c');
  for (const a of daten.adern) kreis(a.x, a.y, 230, a.kind === 'goetterblut' ? '#b04a4a' : '#d8b06a');
  // Startbasen: oben links Sitzplatz 1, unten rechts Sitzplatz 2 (wie in der Draufsicht)
  for (const [x, y] of [[3000, 3000], [MAP - 3000, MAP - 3000]]) {
    g.strokeStyle = '#e8e2cf';
    g.lineWidth = 1.5;
    g.beginPath();
    g.arc(x * s, y * s, 5, 0, Math.PI * 2);
    g.stroke();
  }
  if (zufall) {
    g.fillStyle = 'rgba(16, 18, 13, .55)';
    g.fillRect(0, 0, n, n);
    g.fillStyle = '#e8e2cf';
    g.font = '600 13px sans-serif';
    g.textAlign = 'center';
    g.fillText('jedes Spiel neu', n / 2, n / 2 + 4);
  }
}

/** Vorschau an die Kartenwahl haengen: zeigt die gewaehlte Karte, wechselt mit ihr. */
export function kartenVorschauVerdrahten(el) {
  const leinwand = document.getElementById('kartenVorschau');
  if (!leinwand) return;
  const malen = () => {
    const wahl = document.querySelector ? document.querySelector('#intro input[name="karte"]:checked') : null;
    const schluessel = wahl ? wahl.value : 'klassisch';
    const k = schluessel === 'zufall' ? { daten: zufallsKarte(7) } : karteFuerSpiel(schluessel, null, 0);
    karteVorschauMalen(leinwand, k.daten, schluessel === 'zufall');
  };
  const knoepfe = el.querySelectorAll ? el.querySelectorAll('input[name="karte"]') : [];
  for (const k of knoepfe) k.addEventListener('change', malen);
  malen();
}

/** Eine Kartendatei laden, pruefen und speichern; ruft fertig(meldung) auf. */
export function karteDateiLaden(eingabe, fertig) {
  const datei = eingabe.files && eingabe.files[0];
  if (!datei) return;
  datei.text().then((text) => {
    let d;
    try {
      d = JSON.parse(text);
    } catch {
      return fertig('Keine Karte (kein JSON).');
    }
    if (!d || !Array.isArray(d.hindernisse) || !Array.isArray(d.adern)) return fertig('Keine Karte der drei Reiche.');
    const fehler = kartenFehler(d);
    if (fehler.length) return fertig('Nicht spielbar: ' + fehler[0]);
    d.name = d.name || datei.name.replace(/\.json$/, '');
    eigeneKarteSpeichern(d);
    fertig('');
  });
}

// ------------------------------------------------------------ Steuergruppen

/**
 * Steuergruppen wie in jedem RTS: Strg+Ziffer speichert die Auswahl, Ziffer
 * ruft sie ab, zweimal schnell springt die Kamera hin. Eine belegte Gruppe
 * geht vor; ist sie leer, bleibt die Ziffer eine Bautaste. Liefert null, wenn
 * die Taste keine Gruppe betrifft, sonst { sel, springe }.
 */
export function steuergruppe(ereignis, gruppen, sel, world, ich) {
  const m = /^Digit([0-9])$/.exec(ereignis.code || '');
  if (!m) return null;
  const n = m[1];
  const eigen = (id) => {
    const e = byId(world, id);
    return e && !e.dead && e.player === ich;
  };
  if (ereignis.ctrlKey || ereignis.metaKey) {
    if (ereignis.preventDefault) ereignis.preventDefault();
    gruppen[n] = sel.filter(eigen);
    return { sel, springe: false };
  }
  const g = (gruppen[n] || []).filter(eigen);
  gruppen[n] = g;
  if (!g.length) return null;
  const jetzt = typeof performance !== 'undefined' ? performance.now() : 0;
  const springe = gruppen.letzte === n && jetzt - gruppen.zeit < 400;
  gruppen.letzte = n;
  gruppen.zeit = jetzt;
  return { sel: g.slice(), springe };
}

/** Mitte einer Auswahl (fuer den Kamerasprung). */
export function auswahlMitte(world, sel) {
  let x = 0;
  let y = 0;
  let n = 0;
  for (const id of sel) {
    const e = byId(world, id);
    if (!e) continue;
    x += e.x;
    y += e.y;
    n++;
  }
  return n ? { x: x / n, y: y / n } : null;
}

/** Das ganze eigene Heer: alle Kaempfer ohne Arbeiter, Kommandant und Spaeher (Taste F2). */
export function heerAuswahl(world, ich) {
  return world.entities
    .filter((e) => !e.dead && e.kind === 'unit' && e.player === ich && UNITS[e.type].weapon && !UNITS[e.type].worker && !UNITS[e.type].commander)
    .map((e) => e.id);
}

/**
 * Feind unter dem Mauszeiger (Weltkoordinaten, Toleranz in dm), den man sehen
 * darf -- Ziel fuer einen gezielten Angriff. Einheiten vor Gebaeuden.
 */
export function feindBei(world, x, y, toleranz, ich, sichtbar) {
  let best = null;
  let bestD = Infinity;
  for (const e of world.entities) {
    if (e.dead || e.player === ich || !sichtbar(e)) continue;
    const r = (e.kind === 'unit' ? UNITS[e.type].radius : BUILDINGS[e.type].radius) + toleranz;
    const d = (e.x - x) ** 2 + (e.y - y) ** 2;
    if (d > r * r) continue;
    const rang = e.kind === 'unit' ? 0 : 1;
    if (!best || rang < best.rang || (rang === best.rang && d < bestD)) {
      best = { e, rang };
      bestD = d;
    }
  }
  return best ? best.e : null;
}

/** Eigene Arbeiter, die nichts tun: kein Auftrag, keine Reihe, angekommen. */
export function untaetigeArbeiter(world, ich) {
  return world.entities.filter(
    (e) => !e.dead && e.kind === 'unit' && e.player === ich && UNITS[e.type].worker && !e.auftrag && !e.reihe.length && e.arrived
  );
}

/** Knopf fuer untaetige Arbeiter: Icon des Arbeiters und Anzahl. */
export function untaetigHtml(world, ich, n) {
  const typ = Object.keys(UNITS).find((k) => UNITS[k].worker && UNITS[k].faction === world.players[ich].faction);
  return `${ICONS[typ] || ''}<span class="zahl">${n}</span>`;
}

/** Leiste der belegten Steuergruppen: Icon und Ziffer je Gruppe, Klick waehlt sie. */
export function steuergruppenHtml(gruppen, world) {
  const out = [];
  for (const n of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']) {
    const g = (gruppen[n] || []).filter((id) => byId(world, id));
    if (!g.length) continue;
    out.push(`<button class="ikon klein" data-sg="${n}" title="Steuergruppe ${n}: ${g.length} (Taste ${n})">${ICONS.steuergruppe || ''}<kbd>${n}</kbd><span class="zahl">${g.length}</span></button>`);
  }
  return out.join('');
}

/** Gewaehlte eigene Fabriken -- ein Rechtsklick setzt ihren Sammelpunkt. */
export function gewaehlteFabriken(world, sel, ich) {
  return sel.filter((id) => {
    const b = byId(world, id);
    return b && !b.dead && b.kind === 'building' && b.player === ich && BUILDINGS[b.type].buildList;
  });
}

// ------------------------------------------------------------ Untere Leiste

/** Je Einheitentyp der Auswahl ein Knopf mit Icon und Anzahl; ein Klick behaelt nur diesen Typ. */
export function gruppenHtml(world, auswahl) {
  const zahl = {};
  for (const id of auswahl) {
    const e = byId(world, id);
    if (e && e.kind === 'unit') zahl[e.type] = (zahl[e.type] || 0) + 1;
  }
  return Object.keys(UNITS)
    .filter((t) => zahl[t])
    .map((t) => `<button class="ikon" data-gruppe="${t}" title="${UNITS[t].name} — nur diese auswählen">${ICONS[t]}<span class="zahl">${zahl[t]}</span></button>`)
    .join('');
}

/** Bauleiste als Icons mit Kosten und Taste; Namen und Werte zeigt die Info-Karte. */
// ------------------------------------------------------------ Beobachter (Zuschauen, Wiederholung)
/** Beide Seiten auf einen Blick: Vorrat, Foerderung, Heer, Einheiten, Gebaeude, Skills. */
export function beobachterHtml(world) {
  const z = [0, 1].map((p) => {
    const pl = world.players[p];
    let heer = 0;
    let einheiten = 0;
    let gebaeude = 0;
    for (const e of world.entities) {
      if (e.dead || e.player !== p) continue;
      if (e.kind === 'building') gebaeude++;
      else {
        einheiten++;
        const u = UNITS[e.type];
        if (u.weapon && !u.worker && !u.commander) heer += u.cost.fron;
      }
    }
    return {
      name: pl.faction === 'mensch' ? 'Menschen' : 'Gott',
      farbe: FACTIONS[pl.faction].color,
      fron: pl.fron | 0,
      foerderung: Math.round(foerderungProMin(world, p)),
      blut: pl.goetterblut | 0,
      heer,
      einheiten,
      gebaeude,
      skills: pl.gelernt.length,
    };
  });
  const zeile = (titel, k) => {
    const a = z[0][k];
    const b = z[1][k];
    return `<tr><td>${titel}</td><td${a > b ? ' class="vorn"' : ''}>${a}</td><td${b > a ? ' class="vorn"' : ''}>${b}</td></tr>`;
  };
  return `<table class="beobachter"><tr><th></th><th style="color:${z[0].farbe}">${z[0].name}</th><th style="color:${z[1].farbe}">${z[1].name}</th></tr>
    ${zeile('Fron', 'fron')}${zeile('Förderung/min', 'foerderung')}${zeile('Götterblut', 'blut')}${zeile('Heer (Fron)', 'heer')}${zeile('Einheiten', 'einheiten')}${zeile('Gebäude', 'gebaeude')}${zeile('Skills', 'skills')}</table>`;
}

// ------------------------------------------------------------ Was ist neu? (einmal je Stand)
export const NEUHEITEN = {
  version: '0.37',
  punkte: [
    '<b>Zwei Kampagnen</b> mit Geschichte, Zielen und Funksprüchen — „Die Rodung“ (Menschen) und „Der Zorn des Waldes“ (Gott)',
    '<b>Online gegen einen Menschen</b> — ohne Server: zwei Codes per Chat austauschen, im Spiel Enter für Nachrichten',
    '<b>Spielstände</b>: F5 speichert, F9 lädt, beim Schließen automatisch — oben „Fortsetzen“',
    '<b>Pausenmenü</b> (F10 oder ☰) mit Aufgeben und Hauptmenü',
    '<b>Musik</b>, die das Spiel selbst erzeugt, mit Trommeln im Kampf (N schaltet)',
    '<b>Wiederholungen</b> mit Zeitleiste: springen, bis ×16, durch die Augen eines Spielers',
    '<b>Tagesherausforderung</b> und <b>12 Erfolge</b>',
    '<b>Zufallskarten</b> und der <b>Karteneditor</b>; Geminis High-Res-Modelle und Wasser',
    '<b>2D ⇄ 3D</b> mitten in der Partie wechseln, <b>Fotomodus</b> in 3D (P), Kartenvorschau, Beobachter-Tafel beim Zuschauen',
    'Bedienung: gezielter Angriff (Rechtsklick auf Feind), S = Stopp, Shift = Wegpunkte, F2 = ganzes Heer, . = untätiger Arbeiter',
  ],
};
export function neuheitenHtml() {
  let gesehen = NEUHEITEN.version;
  try {
    gesehen = localStorage.getItem('dreiReiche.neuheiten');
  } catch {
    /* ohne Speicher keine Hinweise */
  }
  if (gesehen === NEUHEITEN.version) return '';
  return `<div class="neuheiten"><b>✨ Neu in ${NEUHEITEN.version}</b>
    <ul>${NEUHEITEN.punkte.map((p) => `<li>${p}</li>`).join('')}</ul>
    <button id="neuheitenOk">Verstanden</button></div>`;
}
export function neuheitenGesehen() {
  try {
    localStorage.setItem('dreiReiche.neuheiten', NEUHEITEN.version);
  } catch {
    /* nur fuer diese Sitzung */
  }
}

// ------------------------------------------------------------ Einstellungen
const EINSTELLUNGEN = 'dreiReiche.einstellungen';
export function einstellungenLesen() {
  const grund = { effekte: 100, musik: 100, beben: true };
  try {
    return { ...grund, ...JSON.parse(localStorage.getItem(EINSTELLUNGEN) || '{}') };
  } catch {
    return grund;
  }
}
/** Einstellungen auf Effekte und Musik anwenden (und merken, wenn speichern). */
export function einstellungenAnwenden(e, fx, musik, speichern = false) {
  effekteLautstaerke(fx, e.effekte / 100);
  musik.laut = e.musik / 100;
  musik.ziel = -1; // neu einblenden
  fx.ohneBeben = !e.beben;
  if (!speichern) return;
  try {
    localStorage.setItem(EINSTELLUNGEN, JSON.stringify(e));
  } catch {
    /* nur fuer diese Sitzung */
  }
}
export function einstellungenHtml(e) {
  return `<div class="vorwort einstellungen"><div class="kapitel">Menü</div><h1>Einstellungen</h1>
    <label>Effekte <input type="range" id="einstEffekte" min="0" max="100" value="${e.effekte}"> <span>${e.effekte} %</span></label>
    <label>Musik <input type="range" id="einstMusik" min="0" max="100" value="${e.musik}"> <span>${e.musik} %</span></label>
    <label><input type="checkbox" id="einstBeben"${e.beben ? ' checked' : ''}> Bildschirm wackelt bei schweren Treffern</label>
    <p class="leise">M schaltet allen Ton aus, N nur die Musik.</p>
    <div class="go"><button id="einstZurueck">Zurück</button></div></div>`;
}
/** Einstellungen im Overlay verdrahten; zurueck() wenn fertig. */
export function einstellungenVerdrahten(fx, musik, zurueck) {
  const e = einstellungenLesen();
  const regler = (id, schluessel) => {
    const r = document.getElementById(id);
    r.oninput = () => {
      e[schluessel] = Number(r.value);
      r.nextElementSibling.textContent = r.value + ' %';
      einstellungenAnwenden(e, fx, musik, true);
    };
  };
  regler('einstEffekte', 'effekte');
  regler('einstMusik', 'musik');
  document.getElementById('einstBeben').onchange = (ev) => {
    e.beben = ev.target.checked;
    einstellungenAnwenden(e, fx, musik, true);
  };
  document.getElementById('einstZurueck').onclick = zurueck;
}

/** Pausenmenue (F10, Knopf unten rechts); laufend: Partie kann gespeichert und aufgegeben werden. */
export function menueHtml(laufend, hatStand, speicherbar = true) {
  return `<div class="vorwort"><div class="kapitel">Pause</div><h1>Menü</h1>
    <div class="go menue">
      <button id="menueWeiter">Weiter</button>
      ${laufend && speicherbar ? '<button id="menueSpeichern">Speichern (F5)</button>' : ''}
      ${hatStand ? '<button id="menueLaden">Letzten Spielstand laden (F9)</button>' : ''}
      <button id="menueHilfe">Steuerung (H)</button>
      <button id="menueEinstellungen">Einstellungen</button>
      ${laufend ? '<button id="menueAufgeben">Aufgeben</button>' : ''}
      <button id="menueHaupt">Hauptmenü</button>
    </div></div>`;
}

export function bauleisteHtml(world, player, liste) {
  return liste
    .map((t, i) => {
      const zu = gesperrt(world, player, t);
      return `<button class="ikon${zu ? ' zu' : ''}" data-b="${t}" title="${BUILDINGS[t].name}${zu ? ' — gesperrt, Skillbaum (T)' : ''}">${ICONS[t]}<span class="kosten">${BUILDINGS[t].cost.fron}</span><kbd>${(i + 1) % 10}</kbd></button>`;
    })
    .join('');
}

/** Ausbildungsleiste fuer Fabriken: Icons zum Anklicken mit Kosten und Warteschlange, ohne Tastenkuerzel (wie Supreme Commander). */
export function ausbildungsleisteHtml(world, player, fabriken) {
  const fListe = Array.isArray(fabriken) ? fabriken : [fabriken];
  if (!fListe.length) return '';
  const typ = fListe[0].type;
  const liste = BUILDINGS[typ]?.buildList;
  if (!liste) return '';
  return liste
    .map((u) => {
      const d = UNITS[u];
      const zu = gesperrt(world, player, u);
      const inQueue = fListe.reduce((sum, f) => sum + f.queue.filter((q) => q === u).length, 0);
      const zahlHtml = inQueue ? `<span class="zahl">${inQueue}</span>` : '';
      return `<button class="ikon${zu ? ' zu' : ''}" data-produce="${u}" title="${d.name}${zu ? ' — gesperrt, Skillbaum (T)' : ''}">${ICONS[u]}<span class="kosten">${d.cost.fron}</span>${zahlHtml}</button>`;
    })
    .join('');
}

/** Statt einer Liste aller Netze: nur Warnungen, wo Gegenwart fehlt. */
export function warnungenHtml(world, player) {
  const out = [];
  for (const r of gridReport(world, player)) {
    if (!r.throttled) continue;
    let stufe = '';
    for (let i = 3; i >= 0 && !stufe; i--) if (r.satPrio[i] < 1000) stufe = PRIO_NAMES[i];
    out.push(`<div class="warn">${ICONS.gegenwart}<span>Gegenwart knapp ${r.supply}/${r.demand} — ${stufe} gedrosselt</span></div>`);
  }
  // Tuerme ohne Gegenwart schlafen -- das sieht man ihnen sonst nicht an.
  const schlafen = {};
  for (const e of world.entities) {
    if (e.dead || e.player !== player || e.kind !== 'building' || !e.done || !BUILDINGS[e.type].weapon || e.powered) continue;
    schlafen[e.type] = (schlafen[e.type] || 0) + 1;
  }
  for (const [t, n] of Object.entries(schlafen)) {
    out.push(`<div class="warn">${ICONS[t]}<span>${n}× ${BUILDINGS[t].name} ohne Gegenwart — schießt nicht</span></div>`);
  }
  return out.join('');
}

/** Auswahl eines eigenen Bauplans: was ihm fehlt. */
export function planHtml(world, plan) {
  const d = BUILDINGS[plan.type];
  let unterwegs = 0;
  let inReihe = 0;
  for (const u of world.entities) {
    if (u.dead || u.kind !== 'unit' || u.player !== plan.player) continue;
    if (u.auftrag === plan.id) unterwegs++;
    else if (u.reihe.includes(plan.id)) inReihe++;
  }
  const zustand = unterwegs
    ? canAfford(world.players[plan.player], d.cost)
      ? `${unterwegs} Erbauer unterwegs`
      : `<span class="warn">wartet auf Fron (${kostenText(d.cost)})</span>`
    : inReihe
      ? `${inReihe} Erbauer ${inReihe === 1 ? 'hat' : 'haben'} ihn in der Reihe`
      : '<span class="warn">wartet auf Erbauer — Erbauer wählen, Rechtsklick</span>';
  return `<div class="sel"><b>Bauplan: ${d.name}</b> — ${zustand}<div class="keys"><kbd>Entf</kbd> verwerfen</div></div>`;
}

// ------------------------------------------------------------ Info-Karten

/** Kosten als Text: "120 Fron" oder "130 Fron + 10 Götterblut". */
export function kostenText(cost) {
  return cost.fron + ' Fron' + (cost.goetterblut ? ` + ${cost.goetterblut} Götterblut` : '');
}

const tempo = (v) => (v >= 32 ? 'sehr schnell' : v >= 28 ? 'schnell' : v >= 24 ? 'mittel' : v >= 20 ? 'gemächlich' : 'langsam');

/** Gesperrt? Dann der Hinweis, welcher Skill es freischaltet. */
function sperrText(world, player, typ) {
  if (!gesperrt(world, player, typ)) return '';
  const f = world.players[player].faction;
  const namen = Object.values(SKILLS)
    .filter((s) => s.faction === f && s.frei && s.frei.includes(typ))
    .map((s) => s.name);
  return 'Gesperrt — im Skillbaum (T): ' + namen.join(' oder ');
}

function karte(titel, desc, zeilen, sperre) {
  return `<div class="karte"><b>${titel}</b><i>${desc || ''}</i>${sperre ? `<div class="sperre">${sperre}</div>` : ''}
    <div class="kz">${zeilen.map(([a, b]) => `<span>${a}</span><span>${b}</span>`).join('')}</div></div>`;
}

/** Waffe einer Einheit oder eines Gebaeudes: Kampfart, Schaden, Reichweite. */
function waffeZeilen(d) {
  const w = d.weapon;
  const fern = d.kampf === 'fern';
  return [
    ['Kampf', fern ? 'Fernkampf' : 'Nahkampf'],
    ['Schaden', `${w.damage} je ${fern ? 'Schuss' : 'Schlag'}, ${((w.damage * 10) / w.cooldown).toFixed(1)} pro s`],
    ['Reichweite', fern ? meterText(w.range) : 'Berührung'],
  ];
}

/** Alles, was man vor dem Bau eines Gebaeudes wissen muss. */
export function gebaeudeKarte(world, player, typ) {
  const d = BUILDINGS[typ];
  const z = [];
  if (!d.vital) {
    // Gebaut wird nur von Erbauern: Bauzeit fuer den Kommandanten und einen Arbeiter allein.
    const kdt = UNITS[FACTIONS[d.faction].kommandant];
    const arb = Object.values(UNITS).find((u) => u.faction === d.faction && u.worker);
    const dauer = (u) => `${u.name} ${sekunden(Math.ceil((d.buildTime * 1000) / u.build.power))}`;
    z.push(['Kosten', kostenText(d.cost)], ['Bauzeit', `${dauer(kdt)} · ${dauer(arb)} (allein)`]);
  }
  z.push(['Leben', d.hp + ' LP']);
  if (d.gegenwartIn) z.push(['Gegenwart', 'braucht ' + d.gegenwartIn]);
  if (d.gegenwartOut) z.push(['Gegenwart', 'liefert ' + d.gegenwartOut]);
  if (d.anchor) {
    const g = FACTIONS[d.faction].growth;
    const start = Math.max(d.anchorMin || 0, g.start);
    z.push(['Domäne', g.perTick && g.max > start ? `${meterText(start)}, wächst bis ${meterText(g.max)}` : meterText(start)]);
  }
  if (d.fronOut) z.push(['Förderung', d.fronOut + ' Fron/min']);
  if (d.blutOut) z.push(['Förderung', d.blutOut + ' Götterblut/min']);
  if (d.needs) z.push(['Standort', d.needs === 'fron' ? 'auf einem Steinvorkommen' : 'auf einer Götterblut-Ader']);
  if (d.needsGrowth) z.push(['Standort', 'nur auf ungerodetem Boden']);
  if (d.clears) z.push(['Rodet', meterText(d.clears) + ' ringsum']);
  if (d.buff) {
    const was = d.buff.zorn ? `+${prozent(d.buff.zorn)} Schaden` : `−${prozent(d.buff.wehr)} genommener Schaden`;
    z.push(['Wirkung', `${was} im Umkreis von ${meterText(d.buff.radius)}`]);
  }
  if (d.weapon) z.push(...waffeZeilen(d));
  if (d.forschung) z.push(['Forschung', `Skillpunkte ${prozent(d.forschung)} schneller`]);
  if (d.sicht >= 1500) z.push(['Sicht', meterText(d.sicht)]);
  if (d.buildList) z.push(['Bildet aus', d.buildList.map((u) => `${UNITS[u].name} (${UNITS[u].kampf === 'fern' ? 'fern' : UNITS[u].kampf ? 'nah' : 'Späher'})`).join(', ')]);
  return karte(d.name, d.desc, z, sperrText(world, player, typ));
}

/** Alles, was man vor der Ausbildung einer Einheit wissen muss. */
export function einheitKarte(world, player, typ) {
  const d = UNITS[typ];
  const z = [];
  if (!d.commander) z.push(['Kosten', kostenText(d.cost)], ['Ausbildung', sekunden(d.buildTime)]);
  if (d.unterhalt) z.push(['Unterhalt', d.unterhalt + ' Fron/min']);
  z.push(['Leben', d.hp + ' LP']);
  if (d.weapon) z.push(...waffeZeilen(d));
  z.push(['Tempo', tempo(d.speed)]);
  if (d.sicht >= 1500 || !d.weapon) z.push(['Sicht', meterText(d.sicht)]);
  if (d.fliegt) z.push(['Fliegt', 'über Fels, Wasser und Mauern; nur Fernkampf trifft']);
  if (d.build) z.push(['Baut', d.build.power >= 1000 ? 'mit voller Kraft' : `mit ${prozent(d.build.power)} Kraft`]);
  return karte(d.name, d.desc, z, sperrText(world, player, typ));
}

/**
 * Zustand einer Baustelle: Fortschritt und wer daran arbeitet. Ohne Erbauer
 * geht nichts voran -- dann der Hinweis, wie man einen schickt.
 */
export function baustelleText(world, e) {
  const pct = Math.min(100, Math.floor(e.progress / (BUILDINGS[e.type].buildTime * 10)));
  let am = 0;
  let weg = 0;
  for (const u of world.entities) {
    if (u.dead || u.kind !== 'unit' || u.auftrag !== e.id) continue;
    if (u.baut === e.id) am++;
    else weg++;
  }
  const wer = am
    ? `${am} Erbauer ${am === 1 ? 'baut' : 'bauen'}${weg ? `, ${weg} unterwegs` : ''}`
    : weg
      ? `${weg} Erbauer unterwegs`
      : '<span class="warn">wartet auf Erbauer — Erbauer wählen, Rechtsklick auf die Baustelle</span>';
  return `Baustelle ${pct} % · ${wer}`;
}

/** Beschaedigtes Gebaeude: wird es repariert, oder wie schickt man jemanden? Leer, wenn heil. */
export function reparaturText(world, e) {
  if (!e.done || e.hp >= e.maxHp) return '';
  let am = 0;
  for (const u of world.entities) if (!u.dead && u.kind === 'unit' && u.auftrag === e.id && u.baut === e.id) am++;
  if (am) return ` · ${am} Erbauer reparier${am === 1 ? 't' : 'en'}`;
  return ' · <span class="warn">beschädigt — Erbauer wählen, Rechtsklick repariert</span>';
}

/** Ausbildungsliste einer Fabrik: Taste, Name, Kosten, Zeit, Unterhalt. */
export function ausbildungHtml(world, player, typ) {
  const liste = BUILDINGS[typ].buildList;
  if (!liste) return '';
  return liste
    .map((u, i) => {
      const d = UNITS[u];
      if (gesperrt(world, player, u)) return `<div class="zeile zu"><kbd>${'QWER'[i]}</kbd> <s>${d.name}</s> — ${sperrText(world, player, u)}</div>`;
      return `<div class="zeile"><kbd>${'QWER'[i]}</kbd> <b>${d.name}</b> (${d.kampf === 'fern' ? 'Fernkampf' : 'Nahkampf'}) · ${kostenText(d.cost)} · ${sekunden(d.buildTime)} · ${d.unterhalt} Fron/min</div>`;
    })
    .join('');
}

/** Erfahrung als kurzer Text, leer ohne Erfahrung. */
export function erfahrungText(world, e) {
  const erf = erfahrung(world, e);
  return erf ? `Erfahrung +${prozent(erf)}` : '';
}

/** Kopfzeile einer einzelnen Auswahl: Name, Leben, Erfahrung. */
export function auswahlKopf(world, e) {
  const def = e.kind === 'unit' ? UNITS[e.type] : BUILDINGS[e.type];
  const teile = [`${e.hp}/${e.maxHp} LP`];
  const erf = erfahrungText(world, e);
  if (erf) teile.push(erf);
  if (e.kind === 'unit' && e.rufBis > world.tick) teile.push('Schlachtruf');
  if (e.kind === 'unit' && e.wehrBis > world.tick) teile.push('Schildwall');
  if (e.kind === 'unit' && e.tempoBis > world.tick) teile.push('Ansturm');
  if (e.kind === 'unit' && e.beschworen) teile.push(`vergeht in ${sekunden(e.vergehtBei - world.tick)}`);
  if (e.kind === 'unit' && e.gebundenBis > world.tick) teile.push('festgehalten');
  return `<b>${def.name}</b> — ${teile.join(' · ')}`;
}

// ------------------------------------------------------------ Skillbaum

/** Was eine Faehigkeit tut, Zahlen aus den Daten. */
export function faehigkeitText(id) {
  const f = FAEHIGKEITEN[id];
  const um = `Eigene Einheiten im Umkreis von ${meterText(f.radius)}`;
  const was = {
    ruf: () => `${um} teilen ${sekunden(f.dauer)} lang ${prozent(f.wert)} mehr Schaden aus.`,
    wehr: () => `${um} nehmen ${sekunden(f.dauer)} lang ${prozent(f.wert)} weniger Schaden.`,
    tempo: () => `${um} laufen ${sekunden(f.dauer)} lang ${prozent(f.wert)} schneller.`,
    heilung: () => `${um} bekommen sofort ${f.wert} LP zurück.`,
    griff: () => `Feinde im Umkreis von ${meterText(f.radius)} um einen Punkt (bis ${meterText(f.reichweite)} vom Kommandanten) stehen ${sekunden(f.dauer)} lang fest.`,
    rufen: () => `${f.anzahl} ${UNITS[f.einheit].name === 'Wolf' ? 'Wölfe' : UNITS[f.einheit].name} erscheinen für ${sekunden(f.dauer)}, ohne Unterhalt.`,
  }[f.art]();
  return `${f.name}: ${was} Alle ${sekunden(f.abklingen)}.`;
}

/**
 * Knoepfe fuer die drei Faehigkeiten des Kommandanten: Taste, Name und
 * Zustand (bereit, Abklingzeit oder noch im Skillbaum gesperrt).
 */
export function faehigkeitenHtml(world, player) {
  const ids = FACTIONS[world.players[player].faction].faehigkeiten;
  const gelernt = faehigkeitenVon(world, player);
  return ids
    .map((id, i) => {
      const f = FAEHIGKEITEN[id];
      const kann = gelernt.includes(id);
      const warten = kann ? faehigkeitWarten(world, player, id) : 0;
      const zustand = !kann ? 'Skillbaum' : warten ? sekunden(warten) : 'bereit';
      const klasse = !kann ? 'zu' : warten ? 'wartet' : 'bereit';
      return `<button class="faeh ${klasse}" data-faeh="${id}" title="${faehigkeitText(id)}"${kann && !warten ? '' : ' disabled'}>
        <kbd>${'QWE'[i]}</kbd> ${f.name}<small>${zustand}</small></button>`;
    })
    .join('');
}

/** Was ein Skill bewirkt, Zahlen aus den Daten. */
export function skillWirkung(sk) {
  const teile = [];
  if (sk.frei) teile.push('Schaltet frei: ' + sk.frei.map((t) => (UNITS[t] || BUILDINGS[t]).name).join(', '));
  const w = sk.wirkung || {};
  if (w.schaden) teile.push(`+${prozent(w.schaden)} Schaden aller Einheiten`);
  if (w.schutz) teile.push(`−${prozent(w.schutz)} genommener Schaden aller Einheiten`);
  if (w.kdtSchutz) teile.push(`−${prozent(w.kdtSchutz)} genommener Schaden des Kommandanten`);
  if (w.foerderung) teile.push(`+${prozent(w.foerderung)} Förderung`);
  if (w.ausbildung) teile.push(`${prozent(w.ausbildung)} schnellere Ausbildung`);
  if (w.unterhalt) teile.push(`−${prozent(w.unterhalt)} Unterhalt`);
  if (sk.faehigkeit) teile.push(faehigkeitText(sk.faehigkeit));
  return teile.join(' · ');
}

/** Aendert sich, sobald sich am Skillbaum etwas aendert -- dann neu zeichnen. */
export function skillSignatur(world, player) {
  return world.players[player].gelernt.join() + '|' + skillFrei(world, player);
}

/** Der Skillbaum eines Spielers: vier Aeste, jeder Skill ein Knopf. */
export function skillBaumHtml(world, player) {
  const pl = world.players[player];
  const frei = skillFrei(world, player);
  const spalten = Object.entries(AESTE)
    .map(([ast, titel]) => {
      const karten = Object.entries(SKILLS)
        .filter(([, sk]) => sk.faction === pl.faction && sk.ast === ast)
        .map(([id, sk]) => {
          const gelernt = pl.gelernt.includes(id);
          const kann = kannLernen(world, player, id);
          const fehlt = (sk.braucht || []).filter((b) => !pl.gelernt.includes(b)).map((b) => SKILLS[b].name);
          const fuss = gelernt
            ? 'gelernt'
            : (fehlt.length ? 'braucht ' + fehlt.join(', ') + ' · ' : '') + `${sk.kosten} Punkt${sk.kosten > 1 ? 'e' : ''}`;
          return `<button class="skill ${gelernt ? 'gelernt' : kann ? 'kann' : 'zu'}" data-skill="${id}"${kann ? '' : ' disabled'}>
            <b>${sk.name}</b><span class="sw">${skillWirkung(sk)}</span><i>${sk.desc}</i><span class="sk">${fuss}</span></button>`;
        })
        .join('');
      return `<div class="ast"><h3>${titel}</h3>${karten}</div>`;
    })
    .join('');
  const takt = Math.round(RULES.skillTakt / 600);
  return `<div class="skopf"><b>Skillbaum</b> — ${frei} Punkt${frei === 1 ? '' : 'e'} frei, alle ${takt} min ein neuer · Klick lernt · <kbd>T</kbd> schließt</div>
    <div class="aeste">${spalten}</div>`;
}

/** Zeit bis zum naechsten Skillpunkt, als Text. */
function naechsterPunkt(world, player) {
  const je = RULES.skillTakt * 1000;
  return sekunden(Math.ceil((je - (world.players[player].forschung % je)) / forschungProTick(world, player)));
}

/** Farbe einer Faehigkeit fuer Ringe und Markierungen. */
export function faehigkeitFarbe(art) {
  return { ruf: '#f5b23c', wehr: '#8ab4ff', tempo: '#e8f0d8', heilung: '#7ddc7a', griff: '#9a7a4a', rufen: '#c9a0e0' }[art];
}
