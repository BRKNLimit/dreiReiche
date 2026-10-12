// Datenschicht. Keine Logik hier drin.
// Alle Werte Integer. Entfernungen in Dezimetern, Zeiten in Ticks (10 Hz),
// Gegenwart pro Tick, Foerderung (masseOut, resonitOut) pro Minute.
//
// Drei Voelker, dieselben Systeme, dieselben Ressourcen. Ihre Daten stehen in
// src/sim/voelker/*.js; hier werden sie zusammengesetzt, dazu Regeln, Karten
// und FELDER (welche Felder die Simulation kennt).

import { TICK_MS, MAP, PRIO, PRIO_NAMES } from './grund.js';
import { VOELKER } from './voelker/index.js';

export { TICK_MS, MAP, PRIO, PRIO_NAMES, VOELKER };

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
  // Baukraft. Je reparaturLpJeMasse LP kostet es 1 Fron; ohne Fron keine
  // Reparatur.
  reparaturProTick: 3,
  reparaturLpJeMasse: 20,

  // Skillbaum (SKILLS): Punkte kommen mit der Zeit -- skillStart zu Beginn,
  // dann einer je skillTakt Ticks. Forschungsgebaeude (forschung, Promille)
  // beschleunigen den Takt. Aus = alles frei, keine Verbesserungen; nur fuer
  // Vergleichsmessungen.
  skills: true,
  skillStart: 1,
  skillTakt: 1200,

  // Wracks und Bergung (R1): Was eine gefallene Einheit oder ein gefallenes
  // fertiges Gebaeude liegen laesst, in Promille seiner Masse-Kosten.
  // Vergangene (Beschworene, Verfall Ausgeschiedener) und abgerissene
  // hinterlassen nichts. 0 = keine Wracks; die Partie ist dann bitgleich zu
  // der ohne Wrack-Regel. Designzahlen, ungemessen.
  wrackAnteil: 700,
  wrackAnteilGebaeude: 500,
  // Bergekraft eines Erbauers (UNITS[...].build), der kein eigenes bergung-
  // Feld hat: Masse pro Minute je 1000 Promille Baukraft. Designzahl,
  // ungemessen: ein Bauer (Baukraft 400) birgt 200 Masse je Minute, ein
  // Extraktor der Menschen foerdert 360.
  bergungProBaukraft: 500,

  // Feuerleitnetz (R2): Eine Waffe zielt nur auf das, was ihr Spieler gerade
  // sieht (mit irgendeiner eigenen Einheit oder einem eigenen Gebaeude, Gitter
  // der Wegfindung: die Zelle des Ziels, bei Gebaeuden auch ihr Rand). Gilt
  // fuer Zielwahl, gezielten Angriff und Verfolgen; ein Flaechentreffer trifft
  // am Einschlagort alles, und der Fernschlag zielt auf einen Punkt. Reicht
  // eine Waffe weiter als die Sicht, braucht sie einen Spaeher. false = wie
  // vor R2 (bitgleich).
  feuerleitnetz: true,
};

export const FACTIONS = {};

// Die Voelker stehen je in einer Datei unter src/sim/voelker/, die Liste in
// src/sim/voelker/index.js. Hier werden sie zusammengesetzt.

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
// weapon.ziele: 'boden' | 'luft' | 'beide' -- was die Waffe trifft (Gebaeude
// zaehlen als Boden, fliegt: true als Luft); ohne Angabe nach kampf.
// fliegt: ueber Fels, Wasser und Mauern; mit weapon kaempft ein Flieger wie
// jede andere Einheit, ohne bleibt er Spaeher.
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
//                tempo      schnellere Einheiten (zaehlt zu Ansturm und Tempo-Aura)
//                reichweite weiter schiessende Waffen (weapon.range)
//                sicht      weitere Sicht im Nebel des Krieges
//                baukraft   schnelleres Bauen und Reparieren der Erbauer
//                regeneration LP pro Minute dazu -- absolut, keine Promille;
//                           Gebaeude nur versorgt (anteilig powered)
//   nur:         [Typen] -- dann wirkt die Wirkung nur auf diese Einheiten-
//                bzw. Gebaeudetypen, sonst auf das ganze Volk. Bei ausbildung
//                gilt die Liste fuer die Fabrik und fuer die Einheit, die sie
//                ausbildet. (Ein Skill mit nur zaehlt bei Abfragen ohne Typ
//                nicht -- das ganze Volk sieht ihn nie.)
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
  // Ein Volk ohne freie Rollen, Skills oder Faehigkeiten darf die Felder weglassen (R0)
  FACTIONS[v.schluessel] = Object.assign(v.volk, { rollen: v.rollen || {}, lernen: v.lernen || [], faehigkeiten: v.volk.faehigkeiten || [] });
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
    'energieIn', 'energieOut', 'prio', 'masseOut', 'resonitOut', 'forschung',
    'buildList', 'buff', 'kampf', 'weapon', 'schild', 'schlag', 'abwehr', 'regeneration', 'aura', 'auferstehen',
  ],
  // hoechstens (M5): so viele Einheiten dieses Typs darf ein Spieler zugleich
  // haben -- lebende plus in Ausbildung. Ein produce darueber hinaus wird
  // abgelehnt (sim.js, anzahlVon). Fuer Prototypen; ohne Angabe keine Grenze.
  // regeneration (M3): LP pro Minute, die die Einheit bzw. das Gebaeude von
  // selbst zurueckbekommt (Gebaeude nur versorgt, anteilig zu powered).
  // aura (M3): wirkt auf eigene Einheiten im Umkreis, siehe FELDER.aura.
  einheit: ['name', 'desc', 'faction', 'hp', 'radius', 'speed', 'sicht', 'cost', 'unterhalt', 'buildTime', 'kampf', 'weapon', 'worker', 'build', 'commander', 'fliegt', 'hoechstens', 'regeneration', 'aura', 'bergung'],
  // bergung (R1): die Einheit birgt Wracks (Befehl 'bergen'); kraft ist die
  // Masse pro Minute. Erbauer (build) bergen auch ohne dieses Feld, mit ihrer
  // Baukraft umgerechnet (RULES.bergungProBaukraft). Geborgen wird nur auf Befehl.
  bergung: ['kraft'],
  // ziele: was die Waffe trifft (weaponZiele). Ohne Angabe nach kampf: 'nah'
  // trifft nur Boden, 'fern' beides. Gebaeude zaehlen als Boden -- eine Waffe
  // mit ziele 'luft' (Flak) greift also nie Gebaeude oder Bodeneinheiten an,
  // eine mit 'boden' (Bomber) nie einen Flieger.
  weapon: ['range', 'damage', 'cooldown', 'gebaeude', 'vorrang', 'ziele', 'flaeche', 'verlangsamt'],
  weaponZiele: ['boden', 'luft', 'beide'],
  // aura (M3): wirkt auf eigene Einheiten, deren Mitte im Umkreis liegt (Mitte zu
  // Mitte, die Quelle eingeschlossen). Mehrere Auren derselben Art addieren sich
  // nicht -- es zaehlt die staerkste. Gebaeude-Auren nur fertig und anteilig zu powered.
  //   art     heilung (wert = LP pro Minute) | tempo | schaden | schutz (wert = Promille)
  //   wert    Staerke, ganze Zahl
  //   radius  Umkreis in dm
  aura: ['art', 'wert', 'radius'],
  auraArt: ['heilung', 'tempo', 'schaden', 'schutz'],
  // weapon.flaeche (M3): ein Treffer trifft zusaetzlich jeden Feind im radius (dm)
  // um das Ziel, den die Waffe erreicht, mit anteil Promille des Schadens (nach
  // den Abzuegen des jeweiligen Ziels, durch dessen Schild).
  flaeche: ['radius', 'anteil'],
  // weapon.verlangsamt (M3): ein Treffer bremst das Ziel (nur Einheiten) dauer
  // Ticks lang um wert Promille; ein neuer, mindestens gleich starker Treffer
  // frischt auf, ein schwaecherer aendert nichts.
  verlangsamt: ['dauer', 'wert'],
  // auferstehen (M3): zaehlt dieses Gebaeude eine Seele (growth.perTod, Anker des
  // Totenreichs), steht bei jeder alle-ten am Ort des Gefallenen eine einheit
  // fuer den Besitzer auf -- herbeigerufen, kein Unterhalt, vergeht nach dauer
  // Ticks (0 = bleibt). Aufgestandene zaehlen beim eigenen Tod nicht als Seele.
  auferstehen: ['alle', 'einheit', 'dauer'],
  buff: ['zorn', 'wehr', 'radius'],
  // schild (M2): Schildkuppel eines Gebaeudes. Schaden an Eigenem im Umkreis
  // trifft zuerst den Schild (sim.js, combat), der sich mit Gegenwart auflaedt.
  //   kapazitaet  hoechste Schildpunkte (so viel Schaden faengt er ab)
  //   radius      Umkreis in dm, Mitte zu Mitte
  //   laden       Punkte pro Tick bei voller Versorgung (skaliert mit powered)
  schild: ['kapazitaet', 'radius', 'laden'],
  // schlag (M4): Fernschlag. Der Befehl 'schlag' feuert auf einen Punkt (ohne
  // Sicht), nach flug Ticks schlaegt er ein und trifft ALLE Entities im Kreis
  // gleich hart (durch Schilde), auch die eigenen.
  //   laden       Ticks bis zum naechsten Schlag bei voller Versorgung
  //               (skaliert mit powered, Fortschritt in Tausendsteln)
  //   flug        Ticks vom Abschuss bis zum Einschlag
  //   reichweite  dm, vom Gebaeude zum Ziel
  //   radius      dm, Umkreis des Einschlags (Mitte der Entity im Kreis)
  //   schaden     Schaden am Einschlag, im ganzen Kreis gleich
  //   kosten      zahlt der Spieler beim Abschuss, wie cost
  schlag: ['laden', 'flug', 'reichweite', 'radius', 'schaden', 'kosten'],
  // abwehr (M4): faengt einen gegnerischen Fernschlag ab, dessen Ziel in
  // ihrem Umkreis liegt -- danach muss sie neu laden.
  //   radius      dm, Umkreis (Mitte des Gebaeudes zum Ziel des Schlags)
  //   laden       Ticks bis zur naechsten Abwehr bei voller Versorgung
  abwehr: ['radius', 'laden'],
  build: ['power'],
  cost: ['masse', 'resonit'],
  // nur (M6): Liste eigener Einheiten-/Gebaeudetypen, auf die die wirkung des
  // Skills beschraenkt ist (sonst ganzes Volk). Siehe bonus() in sim.js.
  skill: ['faction', 'ast', 'name', 'desc', 'kosten', 'braucht', 'frei', 'wirkung', 'nur', 'faehigkeit'],
  // tempo, reichweite, sicht, baukraft: Promille; regeneration: LP pro Minute (M6).
  wirkung: ['schaden', 'schutz', 'kdtSchutz', 'foerderung', 'ausbildung', 'unterhalt', 'tempo', 'reichweite', 'sicht', 'baukraft', 'regeneration'],
  faehigkeit: ['name', 'art', 'radius', 'reichweite', 'dauer', 'wert', 'abklingen', 'einheit', 'anzahl'],
  faehigkeitArt: ['ruf', 'wehr', 'tempo', 'heilung', 'griff', 'rufen'],
};

// Die gemeinsame Basis: Rollen (rollen in der Volksdatei). Die KI baut nach
// Rollen; die Unterschiede der Voelker liegen darin, WIE sie eine Rolle fuellen,
// und in allem, was keine Rolle ist (eigene Einheiten, Gebaeude, Skillbaum).
// Pflicht (R0, "Keine Pendants"): nur was jede Partie braucht -- ein Netzknoten
// (anker), Energie (kraft), Masse (masse), Resonit (resonit), eine Fabrik, ein
// Erbauer und eine Einheit fuers Heer. Alles andere ist frei: ein Volk darf es
// haben, muss aber nicht -- die KI spielt ohne jede freie Rolle weiter.
export const ROLLEN = {
  gebaeude: ['anker', 'kraft', 'masse', 'resonit', 'fabrik'],
  einheit: ['bauer', 'leicht'],
  // Frei; die Art (Gebaeude/Einheit) wird geprueft.
  // turm/zorn/wehr/forschung: Verteidigung, Schreine, Gebaeude fuer Skillpunkte
  // fern/schwer/belagerung: Einheiten der Heeresmischung (fehlt fern oder
  // schwer, mischt die KI das Heer aus dem, was die Fabriken ausbilden)
  // luftfabrik/flak (M1): Fabrik der Flieger, Abwehr nur gegen Flieger.
  // luftjaeger/bomber: Flieger gegen Flieger bzw. gegen Boden; rabe bleibt der
  // unbewaffnete Spaeher.
  // schild (M2): Gebaeude mit Schildkuppel ueber Eigenem im Umkreis.
  // schlag/abwehr (M4): Fernschlag-Gebaeude bzw. das, was Fernschlaege abfaengt.
  // werkstatt/prototyp (M5): Gebaeude, das Prototypen ausbildet, und die
  // Einheit selbst (mit hoechstens).
  frei: {
    turm: 'gebaeude', zorn: 'gebaeude', wehr: 'gebaeude', forschung: 'gebaeude',
    posten: 'gebaeude', umwandler: 'gebaeude', luftfabrik: 'gebaeude', flak: 'gebaeude', schild: 'gebaeude', schlag: 'gebaeude', abwehr: 'gebaeude', werkstatt: 'gebaeude',
    fern: 'einheit', schwer: 'einheit', belagerung: 'einheit',
    rabe: 'einheit', luftjaeger: 'einheit', bomber: 'einheit', prototyp: 'einheit',
  },
};

export const START_MASSE = 1100;

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
      { x: 4800, y: 2200, kind: 'masse' },
      { x: 2200, y: 4800, kind: 'masse' },
      { x: 6200, y: 4500, kind: 'masse' },
      { x: 6700, y: 2100, kind: 'masse' },
      { x: 2100, y: 6700, kind: 'masse' },
    ]),
    // Mitte: je eines naeher an jedem Spieler
    ...paarweise([{ x: 10000, y: 7400, kind: 'masse' }]),
    // Goetterblut: die grosse Ader im Felsring, zwei an den Seitenraendern
    { x: 10000, y: 10000, kind: 'resonit' },
    ...paarweise([{ x: 5200, y: 14800, kind: 'resonit' }]),
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
      { x: 4800, y: 2200, kind: 'masse' },
      { x: 2200, y: 4800, kind: 'masse' },
      { x: 6200, y: 4500, kind: 'masse' },
      { x: 6700, y: 2100, kind: 'masse' },
      { x: 2100, y: 6700, kind: 'masse' },
      // im Wald: am Felsmassiv, Richtung Furt der Gegenseite, am Flussufer
      { x: 9200, y: 2000, kind: 'masse' },
      { x: 14200, y: 6200, kind: 'masse' },
      { x: 5600, y: 8200, kind: 'masse' },
      // Wiese jenseits des Flusses
      { x: 1600, y: 15400, kind: 'masse' },
      { x: 5200, y: 16200, kind: 'masse' },
      { x: 2800, y: 17400, kind: 'resonit' },
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

/** 4-fache Rotationssymmetrie um die Kartenmitte (90°, 180°, 270°). */
const rotVier = (liste) =>
  liste.flatMap((o) => {
    const r0 = o;
    const r1 = { ...o, x: MAP - o.y, y: o.x };
    const r2 = { ...o, x: MAP - o.x, y: MAP - o.y };
    const r3 = { ...o, x: o.y, y: MAP - o.x };
    const unique = [];
    for (const p of [r0, r1, r2, r3]) {
      if (!unique.some((q) => q.x === p.x && q.y === p.y)) unique.push(p);
    }
    return unique;
  });

// Drei Reiche (3 Spieler): Menschenfeste im Nordwesten, Nekropole im
// Südosten, Heiliger Weltenhain im Zentrum der Karte. Punktsymmetrisch um
// die Mitte; jede der drei Basen verfügt über ein volles Fron-Vorkommen.
const DREI_REICHE = {
  name: 'Drei Reiche (3P)',
  spieler: 3,
  basen: [
    { x: 3000, y: 3000 },
    { x: 17000, y: 17000 },
    { x: 10000, y: 10000 },
  ],
  hindernisse: paarweise([
    { x: 8000, y: 3500, r: 600, art: 'fels' },
    { x: 9200, y: 4200, r: 500, art: 'fels' },
    { x: 12500, y: 3000, r: 700, art: 'fels' },
    { x: 6200, y: 7800, r: 550, art: 'fels' },
    { x: 14500, y: 7000, r: 1200, art: 'see' },
  ]),
  adern: [
    // Basis 1 (NW) & Basis 2 (SE)
    ...paarweise([
      { x: 4800, y: 2200, kind: 'masse' },
      { x: 2200, y: 4800, kind: 'masse' },
      { x: 6200, y: 4500, kind: 'masse' },
      { x: 6700, y: 2100, kind: 'masse' },
      { x: 2100, y: 6700, kind: 'masse' },
    ]),
    // Basis 3 (Zentrum)
    ...paarweise([
      { x: 8600, y: 9200, kind: 'masse' },
      { x: 9200, y: 11400, kind: 'masse' },
      { x: 11400, y: 8600, kind: 'masse' },
    ]),
    // Externe Adern
    ...paarweise([
      { x: 15500, y: 4200, kind: 'masse' },
      { x: 14200, y: 5500, kind: 'resonit' },
      { x: 7400, y: 6800, kind: 'resonit' },
    ]),
  ],
  wald: paarweise([
    { x: 8500, y: 2600, r: 2400 },
    { x: 10000, y: 6500, r: 2000 },
  ]),
  wiesen: paarweise([
    { x: 14000, y: 5000, r: 2500 },
  ]),
  furten: [],
};

// Vierlande (4 Spieler): Vier Quadranten mit je einer Basis in den Ecken
// und weiten Toren zur umkämpften Mitte. Vollständig 4-fach rotationssymmetrisch.
const VIERLANDE = {
  name: 'Vierlande (4P)',
  spieler: 4,
  basen: [
    { x: 3000, y: 3000 },
    { x: 17000, y: 17000 },
    { x: 17000, y: 3000 },
    { x: 3000, y: 17000 },
  ],
  hindernisse: rotVier([
    { x: 9500, y: 5500, r: 550, art: 'fels' },
    { x: 10500, y: 5500, r: 550, art: 'fels' },
    { x: 10000, y: 4400, r: 600, art: 'fels' },
    { x: 10000, y: 3200, r: 650, art: 'fels' },
    { x: 7500, y: 2000, r: 900, art: 'see' },
  ]),
  adern: [
    // Basis-Fronadern (5 je Quadrant)
    ...rotVier([
      { x: 4800, y: 2200, kind: 'masse' },
      { x: 2200, y: 4800, kind: 'masse' },
      { x: 5800, y: 3600, kind: 'masse' },
      { x: 3600, y: 5800, kind: 'masse' },
      { x: 6200, y: 2100, kind: 'masse' },
    ]),
    // Ausbauadern
    ...rotVier([
      { x: 10000, y: 1600, kind: 'masse' },
    ]),
    // Götterblut
    { x: 10000, y: 10000, kind: 'resonit' },
    ...rotVier([
      { x: 7200, y: 7200, kind: 'resonit' },
    ]),
  ],
  wald: rotVier([
    { x: 6000, y: 1800, r: 1800 },
  ]),
  wiesen: rotVier([
    { x: 7200, y: 7200, r: 1600 },
  ]),
  furten: [],
};

/** Alle Karten nach Schluessel; die erste ist die Vorgabe. */
export const KARTEN = { klassisch: KLASSISCH, flusstal: FLUSSTAL, dreiReiche: DREI_REICHE, vierlande: VIERLANDE };

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
export const RESOURCES = ['masse', 'resonit'];

/** Alle Gebäude bzw. Einheiten einer Fraktion. */
export function buildingsOf(f) {
  return Object.keys(BUILDINGS).filter((k) => BUILDINGS[k].faction === f);
}
export function unitsOf(f) {
  return Object.keys(UNITS).filter((k) => UNITS[k].faction === f);
}
