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

export const FACTIONS = {
  mensch: {
    name: 'Menschen',
    color: '#d8b06a',
    // Radius steht bei Bauende fest. Planbar, sofort, ueberall gleich.
    growth: { start: 2600, max: 2600, perTick: 0 },
    kommandant: 'held',
    faehigkeiten: ['schlachtruf', 'schildwall', 'ansturm'], // Reihenfolge = Tasten Q, W, E
  },
  gott: {
    name: 'Wald- und Wiesengott',
    color: '#7fb069',
    // Radius waechst mit dem Alter des Ankers. Frueh winzig, spaet riesig.
    // 1 dm/Tick: nach gut 7 Minuten (4250 Ticks) am Maximum.
    // start 950 statt 900: bei 160 KI-Partien ausgeglichen (docs/scope.md).
    growth: { start: 950, max: 5200, perTick: 1 },
    kommandant: 'waldgott',
    faehigkeiten: ['wurzelgriff', 'lebenssaft', 'rudelruf'],
  },
};

// desc: ein, zwei Saetze fuer die Info-Karte; Zahlen setzt die Oberflaeche
// aus den Daten dazu, damit der Text nie veraltet.
export const BUILDINGS = {
  // --------------------------------------------------------------- Menschen
  halle: {
    name: 'Thingstätte',
    desc: 'Hauptgebäude der Menschen. Fällt sie, ist die Partie verloren. Trägt die Startbasis und bildet Bauern und Soldaten aus.',
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
  grenzstein: {
    name: 'Grenzstein',
    desc: 'Anker: dehnt die Domäne aus, sofort in voller Größe. Nur in der Domäne fließt Gegenwart.',
    short: 'GRZ',
    faction: 'mensch',
    hp: 800,
    radius: 48,
    anchor: true,
    cost: { fron: 120 },
    buildTime: 150,
  },
  wachturm: {
    name: 'Wachturm',
    desc: 'Verteidigung: Schützen schießen Pfeile auf Feinde in Reichweite. Braucht Gegenwart — ohne schweigt er.',
    short: 'WTM',
    faction: 'mensch',
    hp: 3000,
    radius: 40,
    gegenwartIn: 10,
    prio: PRIO.zorn, // Waffen fallen zuletzt
    cost: { fron: 300 },
    buildTime: 250,
    kampf: 'fern',
    // Haelt allein eine fruehe Welle von rund 600 Fron auf, faellt gegen die
    // doppelte (Messung in docs/scope.md). Schiesst nur mit Gegenwart.
    weapon: { range: 900, damage: 60, cooldown: 4 },
  },
  schmiede: {
    name: 'Schmiede',
    desc: 'Liefert Gegenwart in ihr Domänennetz — Kraft für Fabriken, Förderung und Schreine.',
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
    desc: 'Fördert Fron auf einem Steinvorkommen. Rodet den Boden ringsum; dort pflanzt der Gott keinen Hain.',
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
    desc: 'Fabrik: bildet alle Einheiten der Menschen aus. Braucht viel Gegenwart.',
    short: 'KAS',
    faction: 'mensch',
    hp: 1500,
    radius: 80,
    gegenwartIn: 55,
    prio: PRIO.werk,
    cost: { fron: 400 },
    buildTime: 340,
    buildList: ['soldat', 'jaeger', 'soeldner', 'katapult'], // Bauern bildet die Thingstaette aus
  },
  schacht: {
    name: 'Blutschacht',
    desc: 'Fördert Götterblut — nur auf einer Götterblut-Ader. Die Adern liegen in der Kartenmitte.',
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
    desc: 'Schrein des Zorns: Eigene Einheiten im Umkreis teilen mehr Schaden aus, solange sie in der eigenen Domäne stehen.',
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
    desc: 'Schrein der Wehr: Eigene Einheiten im Umkreis nehmen weniger Schaden, solange sie in der eigenen Domäne stehen.',
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
  skriptorium: {
    name: 'Skriptorium',
    desc: 'Forschung: Mönche schreiben, sammeln und ordnen — Skillpunkte kommen schneller. Braucht Gegenwart.',
    short: 'SKR',
    faction: 'mensch',
    hp: 900,
    radius: 55,
    gegenwartIn: 20,
    prio: PRIO.segen,
    cost: { fron: 250 },
    buildTime: 230,
    forschung: 500, // Promille zusaetzlich zum Grundtakt der Skillpunkte
  },

  // --------------------------------------------------------------- Gott
  herzbaum: {
    name: 'Herzbaum',
    desc: 'Hauptgebäude des Gottes. Fällt er, ist die Partie verloren. Seine Domäne wächst mit der Zeit; er ruft Dryaden und Wölfe.',
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
    desc: 'Anker: dehnt die Domäne aus — klein am Anfang, wächst mit der Zeit. Nur auf ungerodetem Boden.',
    short: 'HAI',
    faction: 'gott',
    hp: 600,
    radius: 48,
    anchor: true,
    cost: { fron: 110 },
    buildTime: 190,
    needsGrowth: true, // nur auf ungerodetem Boden
  },
  waechterbaum: {
    name: 'Wächterbaum',
    desc: 'Verteidigung: schleudert Dornen auf Feinde in Reichweite. Braucht Gegenwart — ohne schläft er.',
    short: 'WBA',
    faction: 'gott',
    hp: 3000,
    radius: 40,
    gegenwartIn: 10,
    prio: PRIO.zorn, // Waffen fallen zuletzt
    cost: { fron: 300 },
    buildTime: 250,
    kampf: 'fern',
    // Haelt allein eine fruehe Welle von rund 600 Fron auf, faellt gegen die
    // doppelte (Messung in docs/scope.md). Schiesst nur mit Gegenwart.
    weapon: { range: 900, damage: 60, cooldown: 4 },
  },
  quelle: {
    name: 'Quellgrund',
    desc: 'Liefert Gegenwart in ihr Domänennetz — Kraft für Fabriken, Förderung und Schreine.',
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
    desc: 'Fördert Fron auf einem Steinvorkommen.',
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
    desc: 'Fabrik: ruft alle Geschöpfe des Waldes. Braucht viel Gegenwart.',
    short: 'DIC',
    faction: 'gott',
    hp: 1500,
    radius: 80,
    gegenwartIn: 55,
    prio: PRIO.werk,
    cost: { fron: 400 },
    buildTime: 340,
    buildList: ['wolf', 'waldgeist', 'ent', 'wurzelbrecher'], // Dryaden ruft der Herzbaum
  },
  blutwurz: {
    name: 'Blutwurz',
    desc: 'Fördert Götterblut — nur auf einer Götterblut-Ader. Die Adern liegen in der Kartenmitte.',
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
    desc: 'Schrein des Zorns: Eigene Einheiten im Umkreis teilen mehr Schaden aus, solange sie in der eigenen Domäne stehen.',
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
    desc: 'Schrein der Wehr: Eigene Einheiten im Umkreis nehmen weniger Schaden, solange sie in der eigenen Domäne stehen.',
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
  eiche: {
    name: 'Raunende Eiche',
    desc: 'Forschung: Die alte Eiche flüstert, was der Wald weiß — Skillpunkte kommen schneller. Braucht Gegenwart.',
    short: 'EIC',
    faction: 'gott',
    hp: 900,
    radius: 55,
    gegenwartIn: 20,
    prio: PRIO.segen,
    cost: { fron: 250 },
    buildTime: 230,
    forschung: 500, // Promille zusaetzlich zum Grundtakt der Skillpunkte
  },
};

// unterhalt: laufende Kosten in Fron pro Minute. Grosse Heere fressen die
// Wirtschaft -- keine harte Obergrenze, aber eine spuerbare Bremse.
// kampf: 'nah' schlaegt erst bei Beruehrung zu, 'fern' schiesst aus der Ferne.
// weapon.range: Abstand von Rand zu Rand, in dem getroffen wird.
// weapon.gebaeude: Schaden gegen Gebaeude, wenn er vom Schaden gegen
// Einheiten abweicht (Belagerung); weapon.vorrang 'gebaeude': greift
// Gebaeude in Reichweite zuerst an.
export const UNITS = {
  // ------------------------------------------------------------- Menschen
  // Viele, guenstig, schnell ausgebildet. Staerke kommt aus der Zahl.
  bauer: {
    name: 'Bauer',
    desc: 'Arbeiter: baut Gebäude, auch außerhalb der Domäne. Kämpft nur zur Not.',
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
    kampf: 'nah',
    weapon: { range: 20, damage: 4, cooldown: 8 },
  },
  soldat: {
    name: 'Soldat',
    desc: 'Günstiger Nahkämpfer — die Masse des Heeres.',
    faction: 'mensch',
    hp: 215,
    radius: 26,
    speed: 30,
    cost: { fron: 45 },
    unterhalt: 9, // Fron pro Minute, solange sie lebt
    buildTime: 80,
    kampf: 'nah',
    weapon: { range: 20, damage: 9, cooldown: 6 },
  },
  jaeger: {
    name: 'Jäger',
    desc: 'Fernkämpfer: schießt aus der zweiten Reihe, hält wenig aus.',
    faction: 'mensch',
    hp: 180,
    radius: 24,
    speed: 32,
    cost: { fron: 55 },
    unterhalt: 10, // Fron pro Minute, solange sie lebt
    buildTime: 100,
    kampf: 'fern',
    weapon: { range: 480, damage: 13, cooldown: 8 },
  },
  soeldner: {
    name: 'Söldner',
    desc: 'Schwer gerüstet und teuer, bezahlt mit Götterblut.',
    faction: 'mensch',
    hp: 620,
    radius: 32,
    speed: 26,
    // Schwere Einheiten kosten Goetterblut: Eskalation liegt auf der Karte,
    // nicht in einem Menue (docs/konzept.md). Designentscheidung, siehe scope.md.
    cost: { fron: 130, goetterblut: 10 },
    unterhalt: 24, // Fron pro Minute, solange sie lebt
    buildTime: 190,
    kampf: 'nah',
    weapon: { range: 25, damage: 26, cooldown: 8 },
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
    desc: 'Kommandant der Menschen: baut mit voller Kraft und kämpft stark. Einmalig — fällt er, ist die Partie verloren.',
    faction: 'mensch',
    hp: 6000,
    radius: 36,
    speed: 24,
    cost: { fron: 0 },
    buildTime: 0,
    kampf: 'nah',
    weapon: { range: 30, damage: 45, cooldown: 6 },
    commander: true,
    build: { power: 1000 },
  },

  // ------------------------------------------------------------- Gott
  // Wenige, teuer, langsam ausgebildet -- jede einzelne zaehlt.
  waldgott: {
    name: 'Waldgott',
    desc: 'Der Gott selbst: baut mit voller Kraft und kämpft stark. Einmalig — fällt er, ist die Partie verloren.',
    faction: 'gott',
    hp: 6000,
    radius: 40,
    speed: 22,
    cost: { fron: 0 },
    buildTime: 0,
    kampf: 'fern',
    weapon: { range: 380, damage: 42, cooldown: 6 },
    commander: true,
    build: { power: 1000 },
  },
  dryade: {
    name: 'Dryade',
    desc: 'Arbeiterin: lässt Gebäude wachsen, auch außerhalb der Domäne.',
    faction: 'gott',
    hp: 350,
    radius: 28,
    speed: 28,
    cost: { fron: 90 },
    unterhalt: 12, // Fron pro Minute, solange sie lebt
    buildTime: 180,
    worker: true,
    build: { power: 700 },
    kampf: 'nah',
    weapon: { range: 20, damage: 8, cooldown: 7 },
  },
  wolf: {
    name: 'Wolf',
    desc: 'Schneller, zäher Nahkämpfer.',
    faction: 'gott',
    hp: 540,
    radius: 30,
    speed: 34,
    cost: { fron: 130 },
    unterhalt: 24, // Fron pro Minute, solange sie lebt
    buildTime: 210,
    kampf: 'nah',
    weapon: { range: 20, damage: 22, cooldown: 6 },
  },
  waldgeist: {
    name: 'Waldgeist',
    desc: 'Fernkämpfer: wirft Licht aus großer Entfernung.',
    faction: 'gott',
    hp: 480,
    radius: 30,
    speed: 26,
    cost: { fron: 130 },
    unterhalt: 24, // Fron pro Minute, solange sie lebt
    buildTime: 240,
    kampf: 'fern',
    weapon: { range: 520, damage: 24, cooldown: 8 },
  },
  ent: {
    name: 'Ent',
    desc: 'Uralt, gewaltig und langsam, genährt von Götterblut.',
    faction: 'gott',
    hp: 2100,
    radius: 66, // maechtig gross
    speed: 16,
    cost: { fron: 300, goetterblut: 20 },
    unterhalt: 56, // Fron pro Minute, solange sie lebt
    buildTime: 480,
    kampf: 'nah',
    weapon: { range: 40, damage: 52, cooldown: 10 },
  },
  // Belagerung: wenig gegen Einheiten, viel gegen Gebaeude.
  katapult: {
    name: 'Katapult',
    desc: 'Belagerung: wirft Steine weiter, als ein Turm schießt. Gegen Einheiten fast nutzlos, langsam und verwundbar.',
    faction: 'mensch',
    hp: 500,
    radius: 40,
    speed: 14,
    cost: { fron: 250 },
    unterhalt: 30, // Fron pro Minute, solange sie lebt
    buildTime: 300,
    kampf: 'fern',
    weapon: { range: 1000, damage: 8, cooldown: 30, gebaeude: 260, vorrang: 'gebaeude' },
  },
  wurzelbrecher: {
    name: 'Wurzelbrecher',
    desc: 'Belagerung: ein Knäuel uralter Wurzeln, sehr zäh, sprengt Gebäude von innen. Gegen Einheiten schwach.',
    faction: 'gott',
    hp: 3200,
    radius: 50,
    speed: 14,
    cost: { fron: 280 },
    unterhalt: 32, // Fron pro Minute, solange sie lebt
    buildTime: 320,
    kampf: 'nah',
    weapon: { range: 30, damage: 12, cooldown: 10, gebaeude: 240, vorrang: 'gebaeude' },
  },
};

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

export const SKILLS = {
  // --------------------------------------------------------------- Menschen
  belagerungsbau: {
    faction: 'mensch', ast: 'einheiten', name: 'Belagerungsbau', kosten: 2, braucht: ['bogenbau'], frei: ['katapult'],
    desc: 'Die Kaserne baut Katapulte — sie werfen Steine weiter, als ein Turm schießt.',
  },
  bogenbau: {
    faction: 'mensch', ast: 'einheiten', name: 'Bogenbau', kosten: 1, frei: ['jaeger'],
    desc: 'Die Kaserne bildet Jäger aus — Fernkämpfer hinter der Linie.',
  },
  soeldnervertraege: {
    faction: 'mensch', ast: 'einheiten', name: 'Söldnerverträge', kosten: 2, braucht: ['bogenbau'], frei: ['soeldner'],
    desc: 'Die Kaserne wirbt Söldner an — schwer gerüstet, bezahlt mit Götterblut.',
  },
  kriegsbanner: {
    faction: 'mensch', ast: 'gebaeude', name: 'Kriegsbanner', kosten: 1, frei: ['banner'],
    desc: 'Schrein des Zorns: Wer unter dem Banner kämpft, schlägt härter zu.',
  },
  kapellenbau: {
    faction: 'mensch', ast: 'gebaeude', name: 'Kapellenbau', kosten: 1, frei: ['kapelle'],
    desc: 'Schrein der Wehr: Gebete schützen, wer in der Nähe kämpft.',
  },
  klingen: {
    faction: 'mensch', ast: 'verbesserung', name: 'Geschliffene Klingen', kosten: 1, wirkung: { schaden: 100 },
    desc: 'Bessere Waffen für alle.',
  },
  kettenhemden: {
    faction: 'mensch', ast: 'verbesserung', name: 'Kettenhemden', kosten: 1, braucht: ['klingen'], wirkung: { schutz: 100 },
    desc: 'Bessere Rüstung für alle.',
  },
  fronvoegte: {
    faction: 'mensch', ast: 'verbesserung', name: 'Fronvögte', kosten: 1, wirkung: { foerderung: 200 },
    desc: 'Strenge Aufsicht in Sägewerk und Schacht.',
  },
  drillmeister: {
    faction: 'mensch', ast: 'verbesserung', name: 'Drillmeister', kosten: 1, braucht: ['fronvoegte'], wirkung: { ausbildung: 250 },
    desc: 'Rekruten lernen schneller.',
  },
  sold: {
    faction: 'mensch', ast: 'verbesserung', name: 'Sold und Ordnung', kosten: 2, braucht: ['drillmeister'], wirkung: { unterhalt: 250 },
    desc: 'Ein geordnetes Heer kostet weniger.',
  },
  heldenmut: {
    faction: 'mensch', ast: 'kommandant', name: 'Heldenmut', kosten: 1, wirkung: { kdtSchutz: 200 },
    desc: 'Der Held hält mehr aus.',
  },
  schlachtruf: {
    faction: 'mensch', ast: 'kommandant', name: 'Schlachtruf', kosten: 2, braucht: ['heldenmut'], faehigkeit: 'schlachtruf',
    desc: 'Der Held reißt alle um sich mit.',
  },
  schildwall: {
    faction: 'mensch', ast: 'kommandant', name: 'Schildwall', kosten: 2, braucht: ['heldenmut'], faehigkeit: 'schildwall',
    desc: 'Auf seinen Ruf schließen sich die Reihen.',
  },
  ansturm: {
    faction: 'mensch', ast: 'kommandant', name: 'Ansturm', kosten: 2, braucht: ['schlachtruf'], faehigkeit: 'ansturm',
    desc: 'Der Held stürmt voran, und alle folgen.',
  },

  // --------------------------------------------------------------- Gott
  wurzelbrecher: {
    faction: 'gott', ast: 'einheiten', name: 'Wurzelbrecher wecken', kosten: 2, braucht: ['waldgeister'], frei: ['wurzelbrecher'],
    desc: 'Das Dickicht weckt Wurzelbrecher — sie sprengen Mauern von innen.',
  },
  waldgeister: {
    faction: 'gott', ast: 'einheiten', name: 'Waldgeister rufen', kosten: 1, frei: ['waldgeist'],
    desc: 'Das Dickicht ruft Waldgeister — sie werfen Licht aus der Ferne.',
  },
  ents: {
    faction: 'gott', ast: 'einheiten', name: 'Ents erwecken', kosten: 2, braucht: ['waldgeister'], frei: ['ent'],
    desc: 'Das Dickicht erweckt Ents — uralt, gewaltig, genährt von Götterblut.',
  },
  dornen: {
    faction: 'gott', ast: 'gebaeude', name: 'Dornenschrein', kosten: 1, frei: ['dornenschrein'],
    desc: 'Schrein des Zorns: Dornen schärfen, wer in ihrer Nähe kämpft.',
  },
  steine: {
    faction: 'gott', ast: 'gebaeude', name: 'Steinkreis', kosten: 1, frei: ['steinkreis'],
    desc: 'Schrein der Wehr: Alte Steine halten Schaden fern.',
  },
  faenge: {
    faction: 'gott', ast: 'verbesserung', name: 'Scharfe Fänge', kosten: 1, wirkung: { schaden: 100 },
    desc: 'Krallen und Zähne für alle.',
  },
  borke: {
    faction: 'gott', ast: 'verbesserung', name: 'Borkenhaut', kosten: 1, braucht: ['faenge'], wirkung: { schutz: 100 },
    desc: 'Rinde statt Haut für alle.',
  },
  saftfluss: {
    faction: 'gott', ast: 'verbesserung', name: 'Saftfluss', kosten: 1, wirkung: { foerderung: 200 },
    desc: 'Moos und Blutwurz treiben kräftiger.',
  },
  keimkraft: {
    faction: 'gott', ast: 'verbesserung', name: 'Keimkraft', kosten: 1, braucht: ['saftfluss'], wirkung: { ausbildung: 250 },
    desc: 'Was im Dickicht wächst, wächst schneller.',
  },
  genuegsamkeit: {
    faction: 'gott', ast: 'verbesserung', name: 'Genügsamkeit', kosten: 2, braucht: ['keimkraft'], wirkung: { unterhalt: 250 },
    desc: 'Die Geschöpfe des Waldes brauchen weniger.',
  },
  rinde: {
    faction: 'gott', ast: 'kommandant', name: 'Uralte Rinde', kosten: 1, wirkung: { kdtSchutz: 200 },
    desc: 'Der Waldgott hält mehr aus.',
  },
  wurzelgriff: {
    faction: 'gott', ast: 'kommandant', name: 'Wurzelgriff', kosten: 2, braucht: ['rinde'], faehigkeit: 'wurzelgriff',
    desc: 'Wurzeln brechen aus dem Boden und halten Feinde fest.',
  },
  lebenssaft: {
    faction: 'gott', ast: 'kommandant', name: 'Lebenssaft', kosten: 2, braucht: ['rinde'], faehigkeit: 'lebenssaft',
    desc: 'Der Wald gibt seinen Geschöpfen Kraft zurück.',
  },
  rudelruf: {
    faction: 'gott', ast: 'kommandant', name: 'Rudelruf', kosten: 2, braucht: ['wurzelgriff'], faehigkeit: 'rudelruf',
    desc: 'Ein Heulen, und das Rudel kommt.',
  },
};

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
export const FAEHIGKEITEN = {
  schlachtruf: { name: 'Schlachtruf', art: 'ruf', radius: 900, dauer: 150, wert: 300, abklingen: 900 },
  schildwall: { name: 'Schildwall', art: 'wehr', radius: 900, dauer: 150, wert: 350, abklingen: 900 },
  ansturm: { name: 'Ansturm', art: 'tempo', radius: 900, dauer: 100, wert: 500, abklingen: 700 },
  wurzelgriff: { name: 'Wurzelgriff', art: 'griff', reichweite: 1600, radius: 600, dauer: 80, abklingen: 700 },
  lebenssaft: { name: 'Lebenssaft', art: 'heilung', radius: 900, wert: 300, abklingen: 900 },
  rudelruf: { name: 'Rudelruf', art: 'rufen', einheit: 'wolf', anzahl: 3, dauer: 400, abklingen: 1200 },
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

export const KARTE = {
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
};

/** Alle Ressourcen, die gelagert werden. Gegenwart fliesst und gehoert nicht dazu. */
export const RESOURCES = ['fron', 'goetterblut'];

/** Alle Gebäude bzw. Einheiten einer Fraktion. */
export function buildingsOf(f) {
  return Object.keys(BUILDINGS).filter((k) => BUILDINGS[k].faction === f);
}
export function unitsOf(f) {
  return Object.keys(UNITS).filter((k) => UNITS[k].faction === f);
}
