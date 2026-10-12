// Menschen: alle Daten dieses Volks -- Gebaeude, Einheiten, Skillbaum,
// Faehigkeiten des Kommandanten und die Bau-Rollen fuer die KI. Nur Daten,
// keine Logik (CLAUDE.md, Regel 3). Erlaubte Felder stehen in FELDER in
// src/sim/defs.js; test/daten.test.js prueft jede Datei dagegen.

import { PRIO } from '../grund.js';

export const VOLK_MENSCH = {
  schluessel: 'mensch',
  volk: {
    name: 'Menschen',
    color: '#d8b06a',
    // Radius steht bei Bauende fest. Planbar, sofort, ueberall gleich.
    growth: { start: 2600, max: 2600, perTick: 0 },
    kommandant: 'held',
    haupt: 'halle',
    kurz: 'Menschen',
    bauten: ['schmiede', 'saege', 'grenzstein', 'kaserne', 'schacht', 'banner', 'kapelle', 'wachturm', 'skriptorium', 'spaehposten'], // Bauleiste, Tasten 1-0
    faehigkeiten: ['schlachtruf', 'schildwall', 'ansturm'], // Reihenfolge = Tasten Q, W, E
  },
  // Rollen der gemeinsamen Basis: welches eigene Gebaeude bzw. welche
  // eigene Einheit diese Rolle spielt. Die KI baut nach Rollen.
  rollen: { anker: 'grenzstein', kraft: 'schmiede', fron: 'saege', blut: 'schacht', fabrik: 'kaserne', zorn: 'banner', wehr: 'kapelle', turm: 'wachturm', forschung: 'skriptorium', posten: 'spaehposten', bauer: 'bauer', leicht: 'soldat', fern: 'jaeger', schwer: 'soeldner', belagerung: 'katapult' },
  // Reihenfolge, in der die KI den Skillbaum lernt
  lernen: ['bogenbau', 'kriegsbanner', 'klingen', 'heldenmut', 'schlachtruf', 'fronvoegte', 'kapellenbau', 'belagerungsbau', 'soeldnervertraege', 'kettenhemden', 'drillmeister', 'sold', 'schildwall', 'ansturm'],
  gebaeude: {
    halle: {
      name: 'Thingstätte',
      sicht: 1300, // Sichtweite (Nebel des Krieges)
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
      sicht: 900, // Sichtweite (Nebel des Krieges)
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
      sicht: 1200, // Sichtweite (Nebel des Krieges)
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
    // Vorgabe des Nutzers: Die Menschen klaeren mit einem Hochsitz auf, der
    // weit sieht -- rund ein Zehntel der Karte. Kaempft nicht, braucht keine
    // Gegenwart, steht auch ausserhalb der Domaene. Werte sind Designzahlen.
    spaehposten: {
      name: 'Spähposten',
      sicht: 2000, // Sichtweite (Nebel des Krieges): 200 m
      desc: 'Hochsitz mit weiter Sicht: deckt rund 200 m im Umkreis auf. Kämpft nicht, braucht keine Gegenwart.',
      short: 'SPP',
      faction: 'mensch',
      hp: 500,
      radius: 30,
      cost: { fron: 90 },
      buildTime: 120,
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

  },
  einheiten: {
    // Viele, guenstig, schnell ausgebildet. Staerke kommt aus der Zahl.
    bauer: {
      name: 'Bauer',
      desc: 'Arbeiter: baut Gebäude, auch außerhalb der Domäne. Kämpft nur zur Not.',
      faction: 'mensch',
      hp: 150,
      radius: 24,
      speed: 30,
      cost: { fron: 40 },
      unterhalt: 3, // Fron pro Minute, solange sie lebt (0.31: 4 -> 3, Designzahl)
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
      unterhalt: 7, // Fron pro Minute, solange sie lebt (0.31: 9 -> 7, Designzahl)
      buildTime: 80,
      kampf: 'nah',
      weapon: { range: 20, damage: 9, cooldown: 6 },
    },
    jaeger: {
      name: 'Jäger',
      sicht: 1000, // Sichtweite (Nebel des Krieges)
      desc: 'Fernkämpfer: schießt aus der zweiten Reihe, hält wenig aus.',
      faction: 'mensch',
      hp: 180,
      radius: 24,
      speed: 32,
      cost: { fron: 55 },
      unterhalt: 8, // Fron pro Minute, solange sie lebt (0.31: 10 -> 8, Designzahl)
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
      unterhalt: 18, // Fron pro Minute, solange sie lebt (0.31: 24 -> 18, Designzahl)
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
      sicht: 1000, // Sichtweite (Nebel des Krieges)
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
    // Belagerung: wenig gegen Einheiten, viel gegen Gebaeude.
    katapult: {
      name: 'Balliste', // Schluessel bleibt katapult; Name nach Vorlage des Nutzers
      sicht: 700, // Sichtweite (Nebel des Krieges)
      desc: 'Belagerung: schießt schwere Bolzen weiter, als ein Turm reicht. Gegen Einheiten fast nutzlos, langsam und verwundbar.',
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
  },
  skills: {
    belagerungsbau: {
      faction: 'mensch', ast: 'einheiten', name: 'Belagerungsbau', kosten: 2, braucht: ['bogenbau'], frei: ['katapult'],
      desc: 'Die Kaserne baut Ballisten — sie schießen weiter, als ein Turm reicht.',
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

  },
  faehigkeiten: {
    schlachtruf: { name: 'Schlachtruf', art: 'ruf', radius: 900, dauer: 150, wert: 300, abklingen: 900 },
    schildwall: { name: 'Schildwall', art: 'wehr', radius: 900, dauer: 150, wert: 350, abklingen: 900 },
    ansturm: { name: 'Ansturm', art: 'tempo', radius: 900, dauer: 100, wert: 500, abklingen: 700 },
  },
};
