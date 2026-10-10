// Datenschicht. Keine Logik hier drin.
// Alle Werte Integer. Entfernungen in Dezimetern, Zeiten in Ticks (10 Hz),
// Gegenwart pro Tick, Foerderung (fronOut, blutOut) pro Minute.
//
// Zwei Fraktionen, dieselben Systeme, dieselben Ressourcen. Der einzige
// strukturelle Unterschied steckt in anchor.growth -- siehe FACTIONS.

export const TICK_MS = 100;
export const MAP = 20000; // 2000 m -- Mittelalter, Fusstruppen

// Gegenwart-Prioritaet: wer zuerst bedient wird, wird zuletzt gedrosselt.
// Drosselleiter: Bauwerke zuerst, dann Segnungen, dann Wehr, zuletzt Zorn.
export const PRIO = {
  zorn: 0, // Waffen -- fallen als Letztes
  wehr: 1, // Schutzzauber
  segen: 2, // Foerderung, Produktion
  werk: 3, // Baustellen und Fabriken -- fallen zuerst
};

export const PRIO_NAMES = ['Zorn', 'Wehr', 'Segen', 'Werk'];

// Regeln, die fuer alle Fraktionen gleich gelten. Ein Objekt, damit Messungen
// (tools/match.mjs) sie umschalten koennen, ohne die Datei zu aendern.
export const RULES = {
  // Mindestfluss fuer Werk, in Promille der Versorgung einer Domaene.
  // Ohne ihn kann Segen die gesamte Gegenwart binden, und die Baustelle der
  // Quelle, die das aendern wuerde, steht fuer immer still. Werk faellt weiter
  // zuerst -- aber nie ganz auf null, solange ueberhaupt Gegenwart fliesst.
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

  // Heimvorteil nach Tiefe: volle Wirkung erst so viele dm vom Rand der
  // eigenen Domaene entfernt, am Rand keine. Ein grosser Radius macht die
  // Domaene tief -- so koennte der spaete Radius im Gefecht zaehlen.
  // 0 = aus: drinnen voller Bonus, draussen keiner.
  tiefeVoll: 0,

  // Jeder Spieler beginnt mit seinem Kommandanten (UNITS mit commander).
  // Aus nur fuer Vergleichsmessungen.
  kommandanten: true,
};

export const FACTIONS = {
  mensch: {
    name: 'Menschen',
    color: '#d8b06a',
    // Radius steht bei Bauende fest. Planbar, sofort, ueberall gleich.
    growth: { start: 2600, max: 2600, perTick: 0 },
    kommandant: 'held',
  },
  gott: {
    name: 'Wald- und Wiesengott',
    color: '#7fb069',
    // Radius waechst mit dem Alter des Ankers. Frueh winzig, spaet riesig.
    // 1 dm/Tick: nach gut 7 Minuten (4250 Ticks) am Maximum.
    // start 950 statt 900: bei 160 KI-Partien ausgeglichen (docs/scope.md).
    growth: { start: 950, max: 5200, perTick: 1 },
    kommandant: 'waldgott',
  },
};

export const BUILDINGS = {
  // --------------------------------------------------------------- Menschen
  halle: {
    name: 'Thingstätte',
    short: 'HAL',
    faction: 'mensch',
    hp: 5000,
    radius: 90,
    anchor: true,
    gegenwartOut: 24,
    cost: { fron: 0 },
    buildTime: 0,
    buildList: ['koehler', 'landwehr'],
    vital: true,
  },
  turm: {
    name: 'Wachturm',
    short: 'TRM',
    faction: 'mensch',
    hp: 800,
    radius: 48,
    anchor: true,
    cost: { fron: 120 },
    buildTime: 210,
  },
  schmiede: {
    name: 'Schmiede',
    short: 'SCM',
    faction: 'mensch',
    hp: 900,
    radius: 60,
    gegenwartOut: 40,
    cost: { fron: 280 },
    buildTime: 330,
  },
  saege: {
    name: 'Sägewerk',
    short: 'SÄG',
    faction: 'mensch',
    hp: 700,
    radius: 55,
    gegenwartIn: 14,
    prio: PRIO.segen,
    fronOut: 240, // Fron pro Minute bei voller Versorgung
    cost: { fron: 150 },
    buildTime: 240,
    needs: 'fron',
    clears: 2200, // rodet den Boden ringsum -- nimmt dem Gott Wachstumsgrund
  },
  kaserne: {
    name: 'Kaserne',
    short: 'KAS',
    faction: 'mensch',
    hp: 1500,
    radius: 80,
    gegenwartIn: 55,
    prio: PRIO.werk,
    cost: { fron: 400 },
    buildTime: 480,
    buildList: ['koehler', 'landwehr', 'soeldner'],
  },
  schacht: {
    name: 'Blutschacht',
    short: 'BLS',
    faction: 'mensch',
    hp: 900,
    radius: 60,
    gegenwartIn: 20,
    prio: PRIO.segen,
    blutOut: 40, // Goetterblut pro Minute bei voller Versorgung
    cost: { fron: 250 },
    buildTime: 300,
    needs: 'goetterblut', // nur auf einer Ader -- und die liegen in der Mitte
  },

  // --------------------------------------------------------------- Gott
  herzbaum: {
    name: 'Herzbaum',
    short: 'HRZ',
    faction: 'gott',
    hp: 5000,
    radius: 90,
    anchor: true,
    gegenwartOut: 24,
    cost: { fron: 0 },
    buildTime: 0,
    buildList: ['wurzler', 'schratt'],
    vital: true,
  },
  hain: {
    name: 'Hain',
    short: 'HAI',
    faction: 'gott',
    hp: 600,
    radius: 48,
    anchor: true,
    cost: { fron: 110 },
    buildTime: 270,
    needsGrowth: true, // nur auf ungerodetem Boden
  },
  quelle: {
    name: 'Quellgrund',
    short: 'QUE',
    faction: 'gott',
    hp: 800,
    radius: 60,
    gegenwartOut: 40,
    cost: { fron: 280 },
    buildTime: 330,
  },
  moos: {
    name: 'Moosgrube',
    short: 'MOS',
    faction: 'gott',
    hp: 700,
    radius: 55,
    gegenwartIn: 14,
    prio: PRIO.segen,
    fronOut: 240, // Fron pro Minute bei voller Versorgung
    cost: { fron: 150 },
    buildTime: 240,
    needs: 'fron',
  },
  dickicht: {
    name: 'Dickicht',
    short: 'DIC',
    faction: 'gott',
    hp: 1500,
    radius: 80,
    gegenwartIn: 55,
    prio: PRIO.werk,
    cost: { fron: 400 },
    buildTime: 480,
    buildList: ['wurzler', 'schratt', 'geweihter'],
  },
  blutwurz: {
    name: 'Blutwurz',
    short: 'BLW',
    faction: 'gott',
    hp: 900,
    radius: 60,
    gegenwartIn: 20,
    prio: PRIO.segen,
    blutOut: 40,
    cost: { fron: 250 },
    buildTime: 300,
    needs: 'goetterblut',
  },
};

export const UNITS = {
  // Menschen
  koehler: {
    name: 'Köhler',
    faction: 'mensch',
    hp: 200,
    radius: 26,
    speed: 32,
    cost: { fron: 55 },
    buildTime: 140,
    worker: true,
  },
  landwehr: {
    name: 'Landwehr',
    faction: 'mensch',
    hp: 260,
    radius: 28,
    speed: 30,
    cost: { fron: 70 },
    buildTime: 150,
    weapon: { range: 420, damage: 11, cooldown: 6 },
  },
  soeldner: {
    name: 'Söldner',
    faction: 'mensch',
    hp: 620,
    radius: 32,
    speed: 26,
    // Schwere Einheiten kosten Goetterblut: Eskalation liegt auf der Karte,
    // nicht in einem Menue (docs/konzept.md). Designentscheidung, siehe scope.md.
    cost: { fron: 130, goetterblut: 10 }, // war 180: pro Fron schlechter als Landwehr
    buildTime: 300,
    weapon: { range: 480, damage: 26, cooldown: 8 },
  },

  // Kommandanten -- Designentscheidung, siehe docs/scope.md. Vorbild ist die
  // ACU aus Supreme Commander: eine extrem starke Einheit, die auch baut.
  // Jeder Spieler hat genau einen, einmalig: Faellt er, ist die Partie
  // verloren. Sonst gibt die Regel nichts vor -- ob er hinten baut oder
  // vorn kaempft, entscheidet der Spieler.
  //   build: die naechste eigene Baustelle in Reichweite waechst mit seiner
  //          Kraft (Promille je Tick, wie volle Gegenwart), auch ausserhalb
  //          der Domaene -- so entstehen Aussenposten.
  held: {
    name: 'Held',
    faction: 'mensch',
    hp: 6000, // etwa zehn Soeldner
    radius: 36,
    speed: 24,
    cost: { fron: 0 },
    buildTime: 0,
    weapon: { range: 480, damage: 45, cooldown: 6 }, // gut zwei Soeldner
    commander: true,
    build: { range: 500, power: 1000 },
  },

  // Gott
  waldgott: {
    name: 'Waldgott',
    faction: 'gott',
    hp: 6000,
    radius: 40,
    speed: 22,
    cost: { fron: 0 },
    buildTime: 0,
    weapon: { range: 440, damage: 42, cooldown: 6 },
    homeBonus: 1500,
    commander: true,
    build: { range: 500, power: 1000 },
  },
  wurzler: {
    name: 'Wurzler',
    faction: 'gott',
    hp: 230,
    radius: 26,
    speed: 28,
    cost: { fron: 55 },
    buildTime: 140,
    worker: true,
  },
  schratt: {
    name: 'Schratt',
    faction: 'gott',
    hp: 300,
    radius: 28,
    speed: 32,
    cost: { fron: 70 },
    buildTime: 150,
    weapon: { range: 380, damage: 10, cooldown: 6 },
    homeBonus: 1500, // in eigener Domaene: Schaden x1,5
  },
  geweihter: {
    name: 'Geweihter',
    faction: 'gott',
    hp: 820,
    radius: 34,
    speed: 20,
    cost: { fron: 135, goetterblut: 10 }, // war 190
    buildTime: 325,
    weapon: { range: 440, damage: 24, cooldown: 9 },
    homeBonus: 1500,
  },
};

export const START_FRON = 900;

/** Alle Ressourcen, die gelagert werden. Gegenwart fliesst und gehoert nicht dazu. */
export const RESOURCES = ['fron', 'goetterblut'];

/** Alle Gebäude bzw. Einheiten einer Fraktion. */
export function buildingsOf(f) {
  return Object.keys(BUILDINGS).filter((k) => BUILDINGS[k].faction === f);
}
export function unitsOf(f) {
  return Object.keys(UNITS).filter((k) => UNITS[k].faction === f);
}
