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
    // Grunddomaene: deckt die ganze Startbasis mit ihren drei Steinhaufen --
    // Anker braucht man zum Ausgreifen, nicht fuer Strom daheim.
    anchorMin: 4000,
    short: 'HAL',
    faction: 'mensch',
    hp: 5000,
    radius: 90,
    anchor: true,
    gegenwartOut: 24,
    cost: { fron: 0 },
    buildTime: 0,
    buildList: ['bauer', 'soldat'],
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
    buildTime: 150,
  },
  schmiede: {
    name: 'Schmiede',
    short: 'SCM',
    faction: 'mensch',
    hp: 900,
    radius: 60,
    gegenwartOut: 40,
    cost: { fron: 280 },
    buildTime: 230,
  },
  saege: {
    name: 'Sägewerk',
    short: 'SÄG',
    faction: 'mensch',
    hp: 700,
    radius: 55,
    gegenwartIn: 14,
    prio: PRIO.segen,
    fronOut: 360, // Fron pro Minute bei voller Versorgung
    cost: { fron: 150 },
    buildTime: 170,
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
    buildTime: 340,
    buildList: ['bauer', 'soldat', 'jaeger', 'soeldner'],
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
    buildTime: 210,
    needs: 'goetterblut', // nur auf einer Ader -- und die liegen in der Mitte
  },
  // Schreine: Heimvorteil kommt aus der Domaene, nicht aus den Einheiten.
  // Ein versorgter Schrein staerkt alle eigenen Einheiten, die im selben
  // Domaenennetz stehen -- zorn: mehr Schaden, wehr: weniger Schaden
  // genommen (Promille, mit der Versorgung skaliert, stapelt nicht).
  // Sie haengen an den letzten Stufen der Drosselleiter. Designzahlen.
  banner: {
    name: 'Kriegsbanner',
    short: 'BAN',
    faction: 'mensch',
    hp: 600,
    radius: 40,
    gegenwartIn: 15,
    prio: PRIO.zorn,
    cost: { fron: 160 },
    buildTime: 170,
    buff: { zorn: 250, radius: 3000 },
  },
  kapelle: {
    name: 'Kapelle',
    short: 'KAP',
    faction: 'mensch',
    hp: 700,
    radius: 50,
    gegenwartIn: 15,
    prio: PRIO.wehr,
    cost: { fron: 160 },
    buildTime: 170,
    buff: { wehr: 200, radius: 3000 },
  },

  // --------------------------------------------------------------- Gott
  herzbaum: {
    name: 'Herzbaum',
    anchorMin: 4000, // wie die Thingstaette; waechst darueber hinaus bis max
    short: 'HRZ',
    faction: 'gott',
    hp: 5000,
    radius: 90,
    anchor: true,
    gegenwartOut: 24,
    cost: { fron: 0 },
    buildTime: 0,
    buildList: ['dryade', 'wolf'],
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
    buildTime: 190,
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
    buildTime: 230,
  },
  moos: {
    name: 'Moosgrube',
    short: 'MOS',
    faction: 'gott',
    hp: 700,
    radius: 55,
    gegenwartIn: 14,
    prio: PRIO.segen,
    fronOut: 360, // Fron pro Minute bei voller Versorgung
    cost: { fron: 150 },
    buildTime: 170,
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
    buildTime: 340,
    buildList: ['dryade', 'wolf', 'waldgeist', 'ent'],
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
    buildTime: 210,
    needs: 'goetterblut',
  },
  // Beim Gott staerker: sein Wald ist sein Heimvorteil.
  dornenschrein: {
    name: 'Dornenschrein',
    short: 'DOR',
    faction: 'gott',
    hp: 600,
    radius: 40,
    gegenwartIn: 15,
    prio: PRIO.zorn,
    cost: { fron: 160 },
    buildTime: 170,
    buff: { zorn: 450, radius: 3000 },
  },
  steinkreis: {
    name: 'Steinkreis',
    short: 'STK',
    faction: 'gott',
    hp: 700,
    radius: 50,
    gegenwartIn: 15,
    prio: PRIO.wehr,
    cost: { fron: 160 },
    buildTime: 170,
    buff: { wehr: 300, radius: 3000 },
  },
};

// unterhalt: laufende Kosten in Fron pro Minute. Grosse Heere fressen die
// Wirtschaft -- keine harte Obergrenze, aber eine spuerbare Bremse.
export const UNITS = {
  // ------------------------------------------------------------- Menschen
  // Viele, guenstig, schnell ausgebildet. Staerke kommt aus der Zahl.
  bauer: {
    name: 'Bauer',
    faction: 'mensch',
    hp: 150,
    radius: 24,
    speed: 30,
    cost: { fron: 40 },
    unterhalt: 4, // Fron pro Minute, solange sie lebt
    buildTime: 80,
    worker: true,
    // Baut wie der Kommandant, nur schwaecher -- auch ausserhalb der Domaene.
    build: { power: 400 },
    weapon: { range: 300, damage: 4, cooldown: 8 },
  },
  soldat: {
    name: 'Soldat',
    faction: 'mensch',
    hp: 200,
    radius: 26,
    speed: 30,
    cost: { fron: 45 },
    unterhalt: 9, // Fron pro Minute, solange sie lebt
    buildTime: 80,
    weapon: { range: 380, damage: 9, cooldown: 6 },
  },
  jaeger: {
    name: 'Jäger',
    faction: 'mensch',
    hp: 180,
    radius: 24,
    speed: 32,
    cost: { fron: 55 },
    unterhalt: 10, // Fron pro Minute, solange sie lebt
    buildTime: 100,
    weapon: { range: 540, damage: 13, cooldown: 8 },
  },
  soeldner: {
    name: 'Söldner',
    faction: 'mensch',
    hp: 620,
    radius: 32,
    speed: 26,
    // Schwere Einheiten kosten Goetterblut: Eskalation liegt auf der Karte,
    // nicht in einem Menue (docs/konzept.md). Designentscheidung, siehe scope.md.
    cost: { fron: 130, goetterblut: 10 },
    unterhalt: 24, // Fron pro Minute, solange sie lebt
    buildTime: 190,
    weapon: { range: 480, damage: 26, cooldown: 8 },
  },

  // Kommandanten -- Designentscheidung, siehe docs/scope.md. Vorbild ist die
  // ACU aus Supreme Commander: eine extrem starke Einheit, die auch baut.
  // Jeder Spieler hat genau einen, einmalig: Faellt er, ist die Partie
  // verloren. Sonst gibt die Regel nichts vor -- ob er hinten baut oder
  // vorn kaempft, entscheidet der Spieler.
  //   build: Baukraft (Promille je Tick, wie volle Gegenwart). Gebaut wird
  //          nur der eigene Bauauftrag, und nur direkt daneben -- auch
  //          ausserhalb der Domaene, so entstehen Aussenposten.
  held: {
    name: 'Held',
    faction: 'mensch',
    hp: 6000,
    radius: 36,
    speed: 24,
    cost: { fron: 0 },
    buildTime: 0,
    weapon: { range: 480, damage: 45, cooldown: 6 },
    commander: true,
    build: { power: 1000 },
  },

  // ------------------------------------------------------------- Gott
  // Wenige, teuer, langsam ausgebildet -- jede einzelne zaehlt.
  waldgott: {
    name: 'Waldgott',
    faction: 'gott',
    hp: 6000,
    radius: 40,
    speed: 22,
    cost: { fron: 0 },
    buildTime: 0,
    weapon: { range: 440, damage: 42, cooldown: 6 },
    commander: true,
    build: { power: 1000 },
  },
  dryade: {
    name: 'Dryade',
    faction: 'gott',
    hp: 350,
    radius: 28,
    speed: 28,
    cost: { fron: 90 },
    unterhalt: 12, // Fron pro Minute, solange sie lebt
    buildTime: 180,
    worker: true,
    build: { power: 700 },
    weapon: { range: 380, damage: 8, cooldown: 7 },
  },
  wolf: {
    name: 'Wolf',
    faction: 'gott',
    hp: 540,
    radius: 30,
    speed: 34,
    cost: { fron: 130 },
    unterhalt: 24, // Fron pro Minute, solange sie lebt
    buildTime: 210,
    weapon: { range: 260, damage: 22, cooldown: 6 },
  },
  waldgeist: {
    name: 'Waldgeist',
    faction: 'gott',
    hp: 480,
    radius: 30,
    speed: 26,
    cost: { fron: 130 },
    unterhalt: 24, // Fron pro Minute, solange sie lebt
    buildTime: 240,
    weapon: { range: 600, damage: 26, cooldown: 8 },
  },
  ent: {
    name: 'Ent',
    faction: 'gott',
    hp: 2100,
    radius: 44,
    speed: 16,
    cost: { fron: 300, goetterblut: 20 },
    unterhalt: 56, // Fron pro Minute, solange sie lebt
    buildTime: 480,
    weapon: { range: 360, damage: 52, cooldown: 10 },
  },
};

export const START_FRON = 1100;

/** Alle Ressourcen, die gelagert werden. Gegenwart fliesst und gehoert nicht dazu. */
export const RESOURCES = ['fron', 'goetterblut'];

/** Alle Gebäude bzw. Einheiten einer Fraktion. */
export function buildingsOf(f) {
  return Object.keys(BUILDINGS).filter((k) => BUILDINGS[k].faction === f);
}
export function unitsOf(f) {
  return Object.keys(UNITS).filter((k) => UNITS[k].faction === f);
}
