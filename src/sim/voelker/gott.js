// Gott: alle Daten dieses Volks -- Gebaeude, Einheiten, Skillbaum,
// Faehigkeiten des Kommandanten und die Bau-Rollen fuer die KI. Nur Daten,
// keine Logik (CLAUDE.md, Regel 3). Erlaubte Felder stehen in FELDER in
// src/sim/defs.js; test/daten.test.js prueft jede Datei dagegen.

import { PRIO } from '../grund.js';

export const VOLK_GOTT = {
  schluessel: 'gott',
  volk: {
    name: 'Wald- und Wiesengott',
    color: '#7fb069',
    // Radius waechst mit dem Alter des Ankers. Frueh winzig, spaet riesig.
    // 1 dm/Tick: nach gut 7 Minuten (4250 Ticks) am Maximum.
    // start 950 statt 900: bei 160 KI-Partien ausgeglichen (docs/scope.md).
    growth: { start: 950, max: 5200, perTick: 1 },
    kommandant: 'waldgott',
    haupt: 'herzbaum',
    kurz: 'Gott',
    bauten: ['quelle', 'moos', 'hain', 'dickicht', 'blutwurz', 'dornenschrein', 'steinkreis', 'waechterbaum', 'eiche', 'wipfelausguck'],
    faehigkeiten: ['wurzelgriff', 'lebenssaft', 'rudelruf'],
  },
  // Rollen der gemeinsamen Basis: welches eigene Gebaeude bzw. welche
  // eigene Einheit diese Rolle spielt. Die KI baut nach Rollen.
  rollen: { anker: 'hain', kraft: 'quelle', fron: 'moos', blut: 'blutwurz', fabrik: 'dickicht', zorn: 'dornenschrein', wehr: 'steinkreis', turm: 'waechterbaum', forschung: 'eiche', posten: 'wipfelausguck', bauer: 'dryade', leicht: 'wolf', fern: 'waldgeist', schwer: 'ent', belagerung: 'wurzelbrecher', rabe: 'rabe' },
  lernen: ['waldgeister', 'dornen', 'faenge', 'rinde', 'wurzelgriff', 'saftfluss', 'steine', 'sporensaat', 'wucherwurzeln', 'reissklauen', 'borke', 'keimkraft', 'lebenssaft', 'wurzelbrecher', 'ents', 'genuegsamkeit', 'rudelruf', 'uralte_haine', 'tiefwaldschrecken', 'schwarmbrut', 'wildwuchs', 'lebensader', 'weltenwurz'],
  gebaeude: {
    herzbaum: {
      name: 'Herzbaum',
      sicht: 1300, // Sichtweite (Nebel des Krieges)
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
      buildList: ['dryade', 'wolf', 'rabe'],
      vital: true,
    },
    hain: {
      name: 'Hain',
      sicht: 900, // Sichtweite (Nebel des Krieges)
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
      sicht: 1200, // Sichtweite (Nebel des Krieges)
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
    wipfelausguck: {
      name: 'Wipfelausguck',
      sicht: 2100,
      desc: 'Spähposten: Weitsicht ins Umland von den Kronen uralter Bäume.',
      short: 'WAU',
      faction: 'gott',
      hp: 400,
      radius: 26,
      cost: { fron: 70 },
      buildTime: 90,
    },
  },
  einheiten: {
    // Wenige, teuer, langsam ausgebildet -- jede einzelne zaehlt.
    waldgott: {
      name: 'Waldgott',
      sicht: 1000, // Sichtweite (Nebel des Krieges)
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
    // Vorgabe des Nutzers: Der Gott spaeht mit Raben -- schnell, billig, haelt
    // kaum einen Treffer aus; faellt einer, kommt der naechste. Fliegt: ueber
    // Fels, Wasser und Gebaeude, Nahkaempfer erreichen ihn nicht, Fernkaempfer
    // und Tuerme holen ihn mit einem Schuss herunter. Werte sind Designzahlen.
    rabe: {
      name: 'Rabe',
      sicht: 1000, // Sichtweite (Nebel des Krieges): 100 m, vom Nutzer gesenkt (0.28: 150 m)
      desc: 'Späher: fliegt schnell über Fels, Wasser und Mauern. Ein Schuss holt ihn herunter. Kämpft nicht.',
      faction: 'gott',
      hp: 8,
      radius: 12,
      speed: 52,
      cost: { fron: 35 },
      unterhalt: 2, // Fron pro Minute, solange er lebt
      buildTime: 60,
      fliegt: true,
    },
    waldgeist: {
      name: 'Waldgeist',
      sicht: 1000, // Sichtweite (Nebel des Krieges)
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
  },
  skills: {
    // Ast: Einheiten
    waldgeister: {
      faction: 'gott', ast: 'einheiten', name: 'Waldgeister rufen', kosten: 1, frei: ['waldgeist'],
      desc: 'Das Dickicht ruft Waldgeister — sie werfen Licht aus der Ferne.',
    },
    sporensaat: {
      faction: 'gott', ast: 'einheiten', name: 'Sporensaat', kosten: 1, braucht: ['waldgeister'], wirkung: { ausbildung: 180 },
      desc: 'Fruchtbare Waldsporen treiben im Dickicht: Waldgeister und Wölfe formieren sich schneller.',
    },
    wurzelbrecher: {
      faction: 'gott', ast: 'einheiten', name: 'Wurzelbrecher wecken', kosten: 2, braucht: ['waldgeister'], frei: ['wurzelbrecher'],
      desc: 'Das Dickicht weckt Wurzelbrecher — sie sprengen Mauern von innen.',
    },
    ents: {
      faction: 'gott', ast: 'einheiten', name: 'Ents erwecken', kosten: 2, braucht: ['waldgeister'], frei: ['ent'],
      desc: 'Das Dickicht erweckt Ents — uralt, gewaltig, genährt von Götterblut.',
    },
    tiefwaldschrecken: {
      faction: 'gott', ast: 'einheiten', name: 'Tiefwaldzorn', kosten: 2, braucht: ['ents', 'wurzelbrecher'], wirkung: { schaden: 140 },
      desc: 'Uralte Bäume und Wurzelungetüme schlagen mit der Gewalt brechender Stämme zu.',
    },
    schwarmbrut: {
      faction: 'gott', ast: 'einheiten', name: 'Schwarmbrut', kosten: 2, braucht: ['sporensaat'], wirkung: { ausbildung: 200, schaden: 60 },
      desc: 'Nimmersatte Schwärme brechen aus dem Geäst hervor und überfluten die Lichtungen.',
    },

    // Ast: Gebäude
    dornen: {
      faction: 'gott', ast: 'gebaeude', name: 'Dornenschrein', kosten: 1, frei: ['dornenschrein'],
      desc: 'Schrein des Zorns: Dornen schärfen, wer in ihrer Nähe kämpft.',
    },
    steine: {
      faction: 'gott', ast: 'gebaeude', name: 'Steinkreis', kosten: 1, frei: ['steinkreis'],
      desc: 'Schrein der Wehr: Alte Steine halten Schaden fern.',
    },
    wucherwurzeln: {
      faction: 'gott', ast: 'gebaeude', name: 'Wucherwurzeln', kosten: 1, braucht: ['saftfluss'], wirkung: { foerderung: 140, ausbildung: 80 },
      desc: 'Tief greifende Moosfasern und Wurzeln durchziehen den Boden und speisen Haine.',
    },
    uralte_haine: {
      faction: 'gott', ast: 'gebaeude', name: 'Uralte Haine', kosten: 2, braucht: ['steine', 'wucherwurzeln'], wirkung: { schutz: 100 },
      desc: 'Bemooste Megalithen und knorrige Eichenkronen schlucken feindliche Geschosse.',
    },
    lebensader: {
      faction: 'gott', ast: 'gebaeude', name: 'Lebensader', kosten: 2, braucht: ['uralte_haine'], wirkung: { foerderung: 160, schutz: 80 },
      desc: 'Das pulsierende Herz der Natur lässt Erde, Moos und Baumsaft unerschöpflich quellen.',
    },

    // Ast: Verbesserungen
    faenge: {
      faction: 'gott', ast: 'verbesserung', name: 'Scharfe Fänge', kosten: 1, wirkung: { schaden: 100 },
      desc: 'Krallen und Zähne für alle.',
    },
    reissklauen: {
      faction: 'gott', ast: 'verbesserung', name: 'Reißkrallen', kosten: 2, braucht: ['faenge'], wirkung: { schaden: 150 },
      desc: 'Krumme, gehärtete Hornklauen zerfetzen Harnische und Schilde.',
    },
    borke: {
      faction: 'gott', ast: 'verbesserung', name: 'Borkenhaut', kosten: 1, braucht: ['faenge'], wirkung: { schutz: 100 },
      desc: 'Rinde statt Haut für alle.',
    },
    moosmantel: {
      faction: 'gott', ast: 'verbesserung', name: 'Lebendiges Moos', kosten: 2, braucht: ['borke'], wirkung: { schutz: 100, ausbildung: 100 },
      desc: 'Dichte, feuchte Moospolster schließen Wunden im Kampf rasch wieder.',
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
    wildwuchs: {
      faction: 'gott', ast: 'verbesserung', name: 'Urtümlicher Wildwuchs', kosten: 3, braucht: ['reissklauen', 'keimkraft'], wirkung: { ausbildung: 220, schaden: 100 },
      desc: 'Die wilde Wut des Waldes: Unfassbare Vermehrungsflut und raubtierhafte Wildheit.',
    },

    // Ast: Kommandant
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
    weltenwurz: {
      faction: 'gott', ast: 'kommandant', name: 'Weltenwurz', kosten: 2, braucht: ['lebenssaft', 'rudelruf'], wirkung: { kdtSchutz: 250, schaden: 80 },
      desc: 'Die Wurzeln des Titanen greifen tief in das Weltenherz: Der Waldgott wird nahezu unbezwingbar.',
    },
  },
  faehigkeiten: {
    wurzelgriff: { name: 'Wurzelgriff', art: 'griff', reichweite: 1600, radius: 600, dauer: 80, abklingen: 700 },
    lebenssaft: { name: 'Lebenssaft', art: 'heilung', radius: 900, wert: 300, abklingen: 900 },
    rudelruf: { name: 'Rudelruf', art: 'rufen', einheit: 'wolf', anzahl: 3, dauer: 400, abklingen: 1200 },
  },
};
