// Datenschicht. Keine Logik hier drin.
// Alle Werte Integer. Entfernungen in Dezimetern, Zeiten in Ticks (10 Hz),
// Gegenwart pro Tick, Foerderung (fronOut, blutOut) pro Minute.
//
// Drei Voelker, dieselben Systeme, dieselben Ressourcen. Ihre Daten stehen in
// src/sim/voelker/*.js; hier werden sie zusammengesetzt, dazu Regeln, Karten
// und FELDER (welche Felder die Simulation kennt).

import { TICK_MS, MAP, PRIO, PRIO_NAMES } from './grund.js';
import { VOLK_MENSCH } from './voelker/mensch.js';
import { VOLK_GOTT } from './voelker/gott.js';
import { VOLK_TOD } from './voelker/tod.js';

export { TICK_MS, MAP, PRIO, PRIO_NAMES };

// Regeln, die fuer alle Fraktionen gleich gelten. Ein Objekt, damit Messungen
// (tools/match.mjs) sie umschalten koennen, ohne die Datei zu aendern.
export const RULES = {
  // Mindestfluss fuer Werk (Fabriken), in Promille der Versorgung einer
  // Domaene. Werk faellt weiter zuerst -- aber nie ganz auf null, solange
  // ueberhaupt Gegenwart fliesst. Eingefuehrt fuer Baustellen, die frueher
  // Gegenwart brauchten; seit 0.16 bauen nur Erbauer, und Baustellen ziehen
  // keine Gegenwart mehr.
  werkFloor: 125,

  // Schaden in fremder Domaene, in Promille. 1000 = kein Malus.
  // Offene Designfrage aus docs/konzept.md: Macht ein Malus die Grenze zum
  // eigentlichen Schlachtfeld? Messung in docs/scope.md.
  fremdMalus: 1000,

  // Gegenwart, die jeder fertige Anker spendet, pro 100 m Radius.
  // konzept.md nennt "Schreine und Anker" als Herkunft der Gegenwart; bisher
  // spendeten nur die Hauptgebaeude. Damit haengt die Wirtschaft an der
  // einen Regel: ein grosser Kreis traegt mehr als ein kleiner. 0 = aus.
  ankerKraft: 0,

  // Jeder Spieler beginnt mit seinem Kommandanten (UNITS mit commander).
  // Aus nur fuer Vergleichsmessungen.
  kommandanten: true,

  // Erfahrung: Wer lange lebt, wird ein wenig staerker -- teilt mehr Schaden
  // aus und nimmt weniger. Promille je voller Minute seit Entstehung (Einheit)
  // bzw. Bauende (Gebaeude), gedeckelt. Bewusst klein. 0 = aus.
  erfahrungProMin: 10,
  erfahrungMax: 100,

  // Reparatur: Erbauer mit Auftrag direkt neben einem beschaedigten fertigen
  // Gebaeude geben ihm Leben zurueck -- reparaturProTick LP je Tick bei voller
  // Baukraft. Je reparaturLpJeFron LP kostet es 1 Fron; ohne Fron keine
  // Reparatur.
  reparaturProTick: 3,
  reparaturLpJeFron: 20,

  // Skillbaum (SKILLS): Punkte kommen mit der Zeit -- skillStart zu Beginn,
  // dann einer je skillTakt Ticks. Forschungsgebaeude (forschung, Promille)
  // beschleunigen den Takt. Aus = alles frei, keine Verbesserungen; nur fuer
  // Vergleichsmessungen.
  skills: true,
  skillStart: 1,
  skillTakt: 1200,
};

export const FACTIONS = {};

// Die Voelker stehen je in einer Datei unter src/sim/voelker/. Hier werden
// sie zusammengesetzt -- die Reihenfolge der Voelker bestimmt die Reihenfolge
// der Schluessel (und damit z. B. die Nummern der Skills im Spielstand).
export const VOELKER = [VOLK_MENSCH, VOLK_GOTT, VOLK_TOD];

// sicht: Sichtweite im Nebel des Krieges, Dezimeter (sonst Einheiten 900,
// fertige Gebaeude 700, Baustellen 400).
// desc: ein, zwei Saetze fuer die Info-Karte; Zahlen setzt die Oberflaeche
// aus den Daten dazu, damit der Text nie veraltet.
export const BUILDINGS = {};

// unterhalt: laufende Kosten in Fron pro Minute. Grosse Heere fressen die
// Wirtschaft -- keine harte Obergrenze, aber eine spuerbare Bremse.
// kampf: 'nah' schlaegt erst bei Beruehrung zu, 'fern' schiesst aus der Ferne.
// weapon.range: Abstand von Rand zu Rand, in dem getroffen wird.
// weapon.gebaeude: Schaden gegen Gebaeude, wenn er vom Schaden gegen
// Einheiten abweicht (Belagerung); weapon.vorrang 'gebaeude': greift
// Gebaeude in Reichweite zuerst an.
export const UNITS = {};

// ------------------------------------------------------------- Skillbaum
// Je Fraktion ein Baum mit vier Aesten. Ein Skill kostet Punkte, braucht
// womoeglich andere Skills und
//   frei:        schaltet Einheiten oder Gebaeude frei -- was ein Skill
//                freischaltet, ist ohne ihn gesperrt; alles andere ist ab
//                Minute eins da
//   wirkung:     verbessert das ganze Volk, in Promille
//                schaden    mehr ausgeteilter Schaden aller Einheiten
//                schutz     weniger genommener Schaden aller Einheiten
//                kdtSchutz  weniger genommener Schaden des Kommandanten
//                foerderung mehr Fron und Goetterblut aus Foerderbauten
//                ausbildung schnellere Ausbildung in Fabriken
//                unterhalt  weniger Unterhalt
//   faehigkeit:  gibt dem Kommandanten eine aktive Faehigkeit (FAEHIGKEITEN)
// Die Reihenfolge der Eintraege ist die Anzeigereihenfolge.
export const AESTE = { einheiten: 'Einheiten', gebaeude: 'Gebäude', verbesserung: 'Verbesserungen', kommandant: 'Kommandant' };

export const SKILLS = {};

// Aktive Faehigkeiten der Kommandanten, je drei, freigeschaltet im
// Skillbaum (FACTIONS[...].faehigkeiten nennt sie in Tastenreihenfolge).
//   art 'ruf':     eigene Einheiten im Umkreis um den Kommandanten teilen
//                  dauer Ticks lang wert Promille mehr Schaden aus
//   art 'wehr':    ... nehmen dauer Ticks lang wert Promille weniger Schaden
//   art 'tempo':   ... laufen dauer Ticks lang wert Promille schneller
//   art 'heilung': ... bekommen sofort wert LP zurueck
//   art 'griff':   feindliche Einheiten im Umkreis um einen Zielpunkt
//                  (hoechstens reichweite vom Kommandanten) koennen sich dauer
//                  Ticks lang nicht bewegen -- kaempfen aber weiter
//   art 'rufen':   anzahl Einheiten vom Typ einheit erscheinen beim
//                  Kommandanten, ohne Unterhalt, und vergehen nach dauer Ticks
// abklingen: Ticks bis zum naechsten Einsatz.
export const FAEHIGKEITEN = {};

for (const v of VOELKER) {
  FACTIONS[v.schluessel] = Object.assign(v.volk, { rollen: v.rollen, lernen: v.lernen });
  Object.assign(BUILDINGS, v.gebaeude);
  Object.assign(UNITS, v.einheiten);
  Object.assign(SKILLS, v.skills);
  Object.assign(FAEHIGKEITEN, v.faehigkeiten);
}

// ------------------------------------------------------------- Felder und Rollen
// Welche Felder Simulation und Oberflaeche kennen. Ein Feld, das hier fehlt,
// wirkt nicht -- test/daten.test.js laesst in den Volksdateien darum nur diese
// zu. Wer eine Mechanik einbaut, traegt ihr Feld hier ein und setzt es in
// src/sim/sim.js um (siehe docs/umbau/konzept.md, Arbeitsteilung).
export const FELDER = {
  volk: ['name', 'color', 'growth', 'kommandant', 'haupt', 'kurz', 'bauten', 'faehigkeiten', 'rollen', 'lernen'],
  growth: ['start', 'max', 'perTick', 'perTod'],
  gebaeude: [
    'name', 'desc', 'short', 'faction', 'hp', 'radius', 'sicht', 'cost', 'buildTime',
    'anchor', 'anchorMin', 'vital', 'needs', 'needsGrowth', 'clears',
    'gegenwartIn', 'gegenwartOut', 'prio', 'fronOut', 'blutOut', 'forschung',
    'buildList', 'buff', 'kampf', 'weapon',
  ],
  einheit: ['name', 'desc', 'faction', 'hp', 'radius', 'speed', 'sicht', 'cost', 'unterhalt', 'buildTime', 'kampf', 'weapon', 'worker', 'build', 'commander', 'fliegt'],
  weapon: ['range', 'damage', 'cooldown', 'gebaeude', 'vorrang'],
  buff: ['zorn', 'wehr', 'radius'],
  build: ['power'],
  cost: ['fron', 'goetterblut'],
  skill: ['faction', 'ast', 'name', 'desc', 'kosten', 'braucht', 'frei', 'wirkung', 'faehigkeit'],
  wirkung: ['schaden', 'schutz', 'kdtSchutz', 'foerderung', 'ausbildung', 'unterhalt'],
  faehigkeit: ['name', 'art', 'radius', 'reichweite', 'dauer', 'wert', 'abklingen', 'einheit', 'anzahl'],
  faehigkeitArt: ['ruf', 'wehr', 'tempo', 'heilung', 'griff', 'rufen'],
};

// Die gemeinsame Basis: Rollen, die jedes Volk mit einem eigenen Gebaeude bzw.
// einer eigenen Einheit besetzt (rollen in der Volksdatei). Die KI baut nach
// Rollen; die Unterschiede der Voelker liegen darin, WIE sie eine Rolle fuellen,
// und in allem, was keine Rolle ist (eigene Einheiten, Gebaeude, Skillbaum).
export const ROLLEN = {
  gebaeude: ['anker', 'kraft', 'fron', 'blut', 'fabrik', 'turm', 'zorn', 'wehr', 'forschung'],
  einheit: ['bauer', 'leicht', 'fern', 'schwer', 'belagerung'],
  // nicht jedes Volk hat sie (noch)
  frei: { posten: 'gebaeude', rabe: 'einheit' },
};

export const START_FRON = 1100;

// ------------------------------------------------------------- Karte
// Punktsymmetrisch um die Kartenmitte -- beide Sitzplaetze spielen dieselbe
// Karte. hindernisse: Felsen und Seen als Kreise, unpassierbar und nicht
// bebaubar. adern: Fron- und Goetterblut-Vorkommen. Nur ganze Zahlen.
//
// Vor jeder Basis ein Felsgrat mit einem Tor zur Mitte und zwei Seitenpfaden;
// dahinter zwei Fron-Vorkommen zum Ausbauen. In der Mitte ein Felsring um die
// grosse Goetterblut-Ader, mit vier Zugaengen; zwei Seen; zwei weitere
// Goetterblut-Adern an den Seitenraendern.
const gespiegelt = (o) => ({ ...o, x: MAP - o.x, y: MAP - o.y });
const paarweise = (liste) => liste.flatMap((o) => [o, gespiegelt(o)]);

/** Felsgrat: n Felsen gleichmaessig von (x0,y0) nach (x1,y1), ohne die Luecken. */
function grat(x0, y0, x1, y1, n, r, luecken) {
  const out = [];
  for (let k = 0; k < n; k++) {
    if (luecken.includes(k)) continue;
    out.push({ x: x0 + (((x1 - x0) * k) / (n - 1)) | 0, y: y0 + (((y1 - y0) * k) / (n - 1)) | 0, r, art: 'fels' });
  }
  return out;
}

const KLASSISCH = {
  name: 'Klassisch',
  hindernisse: [
    // Grat vor jeder Basis: breites Tor in der Mitte, zwei Seitenpfade
    ...paarweise(grat(700, 12300, 12300, 700, 21, 560, [2, 3, 9, 10, 11, 17, 18])),
    // Felsring um die Mitte, Zugaenge diagonal
    { x: 11300, y: 10000, r: 500, art: 'fels' },
    { x: 8700, y: 10000, r: 500, art: 'fels' },
    { x: 10000, y: 11300, r: 500, art: 'fels' },
    { x: 10000, y: 8700, r: 500, art: 'fels' },
    // Seen zwischen Mitte und Seitenraendern
    ...paarweise([{ x: 7200, y: 12800, r: 1300, art: 'see' }]),
  ],
  adern: [
    // je Basis fuenf Vorkommen -- alle in der Grunddomaene des Hauptgebaeudes
    ...paarweise([
      { x: 4800, y: 2200, kind: 'fron' },
      { x: 2200, y: 4800, kind: 'fron' },
      { x: 6200, y: 4500, kind: 'fron' },
      { x: 6700, y: 2100, kind: 'fron' },
      { x: 2100, y: 6700, kind: 'fron' },
    ]),
    // Mitte: je eines naeher an jedem Spieler
    ...paarweise([{ x: 10000, y: 7400, kind: 'fron' }]),
    // Goetterblut: die grosse Ader im Felsring, zwei an den Seitenraendern
    { x: 10000, y: 10000, kind: 'goetterblut' },
    ...paarweise([{ x: 5200, y: 14800, kind: 'goetterblut' }]),
  ],
  wald: [],
  wiesen: [],
  furten: [],
};

/**
 * Fluss als Kette von Wasserkreisen entlang eines Linienzugs, mit Luecken an
 * den Furten (dort kein Kreis im Umkreis frei).
 */
function fluss(punkte, r, abstand, furten, frei) {
  const out = [];
  for (let i = 0; i + 1 < punkte.length; i++) {
    const [x0, y0] = punkte[i];
    const [x1, y1] = punkte[i + 1];
    const l = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(1, Math.round(l / abstand));
    // Beim letzten Stueck auch den Endpunkt, sonst bleibt dort eine Luecke
    const bis = i + 2 === punkte.length ? n : n - 1;
    for (let k = 0; k <= bis; k++) {
      const x = (x0 + ((x1 - x0) * k) / n) | 0;
      const y = (y0 + ((y1 - y0) * k) / n) | 0;
      if (furten.some((f) => (f.x - x) ** 2 + (f.y - y) ** 2 < frei * frei)) continue;
      out.push({ x, y, r, art: 'see', fluss: true });
    }
  }
  return out;
}

// Flusstal -- nach der Skizze des Nutzers (docs/bilder/Maps/Map1.png): die
// Basis oben links im Wald, ein Felsmassiv darin, ein Fluss vom linken Rand
// durch die Kartenmitte zum rechten Rand, nur an zwei Furten passierbar, am
// Suedufer ein Grat, dahinter Wiesen bis in die Ecken -- dort das Goetterblut.
// Punktsymmetrisch wie jede Karte; Wald und Wiesen sind nur Optik.
const FURT = { x: 2400, y: 11700 };
const FLUSS_HALB = [
  [0, 12600], [1200, 12200], [2400, 11700], [3600, 11200], [4800, 10700],
  [6000, 10100], [7200, 9600], [8400, 9400], [9300, 9600],
];
const FLUSSTAL = {
  name: 'Flusstal',
  hindernisse: [
    ...paarweise(fluss(FLUSS_HALB, 300, 400, [FURT], 520)),
    // Mitte des Flusses (liegt auf sich selbst gespiegelt -- nur einmal)
    { x: 9650, y: 9800, r: 300, art: 'see', fluss: true },
    { x: 10000, y: 10000, r: 300, art: 'see', fluss: true },
    { x: 10350, y: 10200, r: 300, art: 'see', fluss: true },
    // Grat am Suedufer, zwei Durchgaenge
    ...paarweise(grat(3800, 13600, 8600, 11400, 12, 380, [4, 8])),
    // Felsmassiv im Wald
    ...paarweise([
      { x: 10600, y: 3300, r: 700, art: 'fels' },
      { x: 11500, y: 4300, r: 900, art: 'fels' },
      { x: 12300, y: 5300, r: 650, art: 'fels' },
      { x: 10900, y: 5300, r: 550, art: 'fels' },
      { x: 12100, y: 3200, r: 500, art: 'fels' },
    ]),
  ],
  adern: [
    ...paarweise([
      // je Basis fuenf Vorkommen in der Grunddomaene, wie auf der klassischen Karte
      { x: 4800, y: 2200, kind: 'fron' },
      { x: 2200, y: 4800, kind: 'fron' },
      { x: 6200, y: 4500, kind: 'fron' },
      { x: 6700, y: 2100, kind: 'fron' },
      { x: 2100, y: 6700, kind: 'fron' },
      // im Wald: am Felsmassiv, Richtung Furt der Gegenseite, am Flussufer
      { x: 9200, y: 2000, kind: 'fron' },
      { x: 14200, y: 6200, kind: 'fron' },
      { x: 5600, y: 8200, kind: 'fron' },
      // Wiese jenseits des Flusses
      { x: 1600, y: 15400, kind: 'fron' },
      { x: 5200, y: 16200, kind: 'fron' },
      { x: 2800, y: 17400, kind: 'goetterblut' },
    ]),
  ],
  // Nur Optik: Wald und Wiesen als Kreise { x, y, r }, Furten als Punkte
  wald: paarweise([
    { x: 8500, y: 2600, r: 3200 },
    { x: 13500, y: 2800, r: 3000 },
    { x: 5000, y: 7600, r: 2600 },
    { x: 9500, y: 6600, r: 2800 },
    { x: 15800, y: 5200, r: 2200 },
    { x: 1800, y: 9600, r: 1800 },
  ]),
  wiesen: paarweise([
    { x: 2600, y: 16400, r: 3400 },
    { x: 6400, y: 14200, r: 2400 },
    { x: 9000, y: 12600, r: 1600 },
  ]),
  furten: paarweise([FURT]),
};

/** Alle Karten nach Schluessel; die erste ist die Vorgabe. */
export const KARTEN = { klassisch: KLASSISCH, flusstal: FLUSSTAL };

/**
 * Die gerade gespielte Karte, fuer die Darstellung (Boden, Baeume). Die
 * Simulation nimmt ihre Karte aus createWorld({ karte }); die Oberflaeche
 * waehlt sie hier mit karteWaehlen() dazu passend.
 */
export const KARTE = { schluessel: 'klassisch', ...KLASSISCH };
export function karteWaehlen(schluessel, daten = null) {
  Object.assign(KARTE, { schluessel, wald: [], wiesen: [], furten: [] }, daten || KARTEN[schluessel] || KLASSISCH);
  return KARTE;
}

/** Alle Ressourcen, die gelagert werden. Gegenwart fliesst und gehoert nicht dazu. */
export const RESOURCES = ['fron', 'goetterblut'];

/** Alle Gebäude bzw. Einheiten einer Fraktion. */
export function buildingsOf(f) {
  return Object.keys(BUILDINGS).filter((k) => BUILDINGS[k].faction === f);
}
export function unitsOf(f) {
  return Object.keys(UNITS).filter((k) => UNITS[k].faction === f);
}
