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

// Mindestfluss fuer Werk, in Promille der Versorgung einer Domaene.
// Ohne ihn kann Segen die gesamte Gegenwart binden, und die Baustelle der
// Quelle, die das aendern wuerde, steht fuer immer still. Werk faellt weiter
// zuerst -- aber nie ganz auf null, solange ueberhaupt Gegenwart fliesst.
export const WERK_FLOOR = 125;

export const FACTIONS = {
  mensch: {
    name: 'Menschen',
    color: '#d8b06a',
    // Radius steht bei Bauende fest. Planbar, sofort, ueberall gleich.
    growth: { start: 2600, max: 2600, perTick: 0 },
  },
  gott: {
    name: 'Wald- und Wiesengott',
    color: '#7fb069',
    // Radius waechst mit dem Alter des Ankers. Frueh winzig, spaet riesig.
    // 1 dm/Tick: nach 10 Minuten (6000 Ticks) am Maximum.
    growth: { start: 900, max: 5200, perTick: 1 },
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
    cost: { fron: 180 },
    buildTime: 300,
    weapon: { range: 480, damage: 26, cooldown: 8 },
  },

  // Gott
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
    cost: { fron: 190 },
    buildTime: 325,
    weapon: { range: 440, damage: 24, cooldown: 9 },
    homeBonus: 1500,
  },
};

export const START_FRON = 900;

/** Alle Gebäude bzw. Einheiten einer Fraktion. */
export function buildingsOf(f) {
  return Object.keys(BUILDINGS).filter((k) => BUILDINGS[k].faction === f);
}
export function unitsOf(f) {
  return Object.keys(UNITS).filter((k) => UNITS[k].faction === f);
}
