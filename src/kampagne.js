// Kampagnen: "Die Rodung" (vier Missionen aus Sicht der Menschen, die in
// den Wald des Gottes vordringen) und "Der Zorn des Waldes" (drei aus Sicht
// des Gottes, der sie wieder vertreibt). Nur Oberflaeche -- die Simulation kennt keine
// Missionen. Eine Mission legt fest, auf welcher Karte gegen welche KI
// gespielt wird, baut vor dem ersten Tick die Startlage auf (aufbau, darf
// die Welt veraendern -- deterministisch, darum auch in Wiederholungen
// gleich) und prueft ihre Ziele in jedem Bild.

import { BUILDINGS } from './sim/defs.js';
import { spawnBuilding, spawnUnit, findDeposit, issue } from './sim/sim.js';

/** Fertiges Gebaeude setzen; Foerderbauten belegen ihre Ader. */
function kmBaue(world, p, typ, x, y) {
  const b = spawnBuilding(world, p, typ, x, y, true);
  if (BUILDINGS[typ].needs) {
    const d = findDeposit(world, x, y, BUILDINGS[typ].needs);
    if (d) d.takenBy = b.id;
  }
  return b;
}
// Mission 2 -- Designzahlen, mit der KI auf beiden Seiten abgestimmt (siehe CHANGELOG 0.33)
const WUT = { masse: 900, soldaten: 6, jaeger: 2, ersteWelle: 600, wellenTakt: 1200, wellen: 5 };

/** Ticks als m:ss */
function uhr(t) {
  const s = Math.max(0, Math.ceil(t / 10));
  return ((s / 60) | 0) + ':' + String(s % 60).padStart(2, '0');
}

// Figuren der Funksprueche
const HEDWIG = 'Vögtin Hedwig';
const GEROLD = 'Hauptmann Gerold';
const MIRA = 'Kundschafterin Mira';
const EICHE = 'Die Alte Eiche';
const KRA = 'Kra, der Rabe';

/** Steht eine eigene Einheit naeher als r an einer der lebenden Entities mit diesen Ids? */
function kmNahe(w, ich, ids, r) {
  const ziele = w.entities.filter((e) => !e.dead && ids.includes(e.id));
  return w.entities.some((u) => !u.dead && u.player === ich && u.kind === 'unit' && ziele.some((z) => (u.x - z.x) ** 2 + (u.y - z.y) ** 2 <= r * r));
}
const kmLebt = (w, id) => w.entities.some((e) => e.id === id && !e.dead);

const kmZahl = (world, p, typ, fertig = true) => world.entities.filter((e) => !e.dead && e.player === p && e.type === typ && (!fertig || e.kind !== 'building' || e.done)).length;

const RODUNG = [
  {
    id: 'fuss-fassen',
    titel: 'Fuß fassen',
    volk: 'mensch',
    karte: 'klassisch',
    stil: 'burg',
    stufe: 'leicht',
    ki: false, // der Wald schlaeft noch
    vorwort: `Der Winter war lang. Hinter dem Grat liegt der alte Wald, und mit ihm
      Holz, Stein und Land für alle. Die Ältesten sagen, der Wald gehöre einem Gott.
      Die Ältesten sagen viel. <b>Errichte eine Siedlung, bilde ein Heer aus und vertreibe
      den Vorposten des Waldes.</b> Ich führe dich Schritt für Schritt.`,
    nachwort: `Der Hain ist gefallen. Zum ersten Mal knackt der Wald nicht nur unter
      den Äxten — er antwortet. In der Nacht heulen Wölfe, näher als je zuvor.`,
    aufbau(world) {
      // Vorposten des Gottes vor dem Grat: ein Hain, zwei Woelfe
      spawnBuilding(world, 1, 'hain', 9200, 6800, true);
      spawnUnit(world, 1, 'wolf', 9000, 7300);
      spawnUnit(world, 1, 'wolf', 9500, 7200);
      world.vorposten = world.entities.filter((e) => e.player === 1 && (e.type === 'hain' || e.type === 'wolf')).map((e) => e.id);
    },
    ziele: [
      { text: 'Wähle deinen Helden (Taste <kbd>K</kbd>)', erfuellt: (w, ich, c) => c.sel.some((id) => w.entities.find((e) => e.id === id && e.type === 'held')) },
      { text: 'Baue ein Sägewerk auf eine Steinader (Held wählen, <kbd>2</kbd>, Klick auf eine Ader)', erfuellt: (w, ich) => kmZahl(w, ich, 'saege') >= 1 },
      { text: 'Baue eine Schmiede (Taste <kbd>1</kbd>) — sie liefert Gegenwart, die Kraft für Fabriken und Förderung', erfuellt: (w, ich) => kmZahl(w, ich, 'schmiede') >= 1 },
      { text: 'Bilde zwei Bauern aus (Thingstätte anklicken, Bauer-Icon unten)', erfuellt: (w, ich) => kmZahl(w, ich, 'bauer') >= 2 },
      { text: 'Baue eine Kaserne (Taste <kbd>4</kbd>)', erfuellt: (w, ich) => kmZahl(w, ich, 'kaserne') >= 1 },
      { text: 'Bilde sechs Soldaten aus', erfuellt: (w, ich) => kmZahl(w, ich, 'soldat') >= 6 },
      { text: 'Fasse dein Heer zur Steuergruppe 1 zusammen (wählen, <kbd>Strg</kbd>+<kbd>1</kbd>)', erfuellt: (w, ich, c) => (c.gruppen['1'] || []).length >= 4 },
      { text: 'Zerstöre den Vorposten des Waldes (Rechtsklick auf einen Feind greift ihn gezielt an)', erfuellt: (w) => (w.vorposten || []).every((id) => !w.entities.some((e) => e.id === id && !e.dead)) },
    ],
    meldungen: [
      { wer: HEDWIG, text: 'Willkommen am Grat, Herr. Die Leute warten auf Eure Befehle — zuerst ein Sägewerk, ohne Holz keine Siedlung.', wann: (w) => w.tick >= 20 },
      { wer: HEDWIG, text: 'Das Sägewerk läuft. Aber ohne Gegenwart steht bald alles still — die Schmiede liefert sie, die Thingstätte allein reicht nicht.', wann: (w, ich, s) => s[1] },
      { wer: HEDWIG, text: 'Die Esse glüht. Jetzt Hände: Die Thingstätte bildet Bauern aus, die bauen mit.', wann: (w, ich, s) => s[2] },
      { wer: GEROLD, text: 'Die Kaserne steht. Gebt mir ein halbes Dutzend Leute, und wir sehen nach, was hinter dem Grat heult.', wann: (w, ich, s) => s[4] },
      { wer: GEROLD, text: 'Wölfe! Und dahinter ein Hain, der letzte Woche noch nicht da war. Das ist kein gewöhnlicher Wald.', wann: (w, ich) => kmNahe(w, ich, w.vorposten || [], 1400) },
    ],
    sieg: 'ziele',
  },
  {
    id: 'wut-des-waldes',
    titel: 'Die Wut des Waldes',
    volk: 'mensch',
    karte: 'klassisch',
    stil: 'sturm',
    stufe: 'schwer',
    vorwort: `Der Gott ist erwacht, und er greift an — Welle um Welle. Die Siedlung
      steht, ein Turm ist bemannt, Verstärkung ist unterwegs.
      <b>Halte zehn Minuten stand.</b> Fällt der Held, fällt die Siedlung.`,
    nachwort: `Die Glocken läuten. Die Verstärkung ist da, und der Wald zieht sich
      zurück — für jetzt. Aber am Fluss haben die Späher etwas gefunden: rote
      Adern im Gestein, die in der Nacht glimmen.`,
    aufbau(world) {
      world.players[0].masse = WUT.masse;
      kmBaue(world, 0, 'saege', 4800, 2200);
      kmBaue(world, 0, 'saege', 2200, 4800);
      kmBaue(world, 0, 'schmiede', 3100, 4400);
      kmBaue(world, 0, 'kaserne', 4400, 3300);
      kmBaue(world, 0, 'wachturm', 5200, 4600);
      for (let i = 0; i < WUT.soldaten; i++) spawnUnit(world, 0, 'soldat', 4700 + (i % 4) * 90, 4700 + ((i / 4) | 0) * 90);
      for (let i = 0; i < WUT.jaeger; i++) spawnUnit(world, 0, 'jaeger', 4400 + i * 90, 4950);
      // Der Gott hat sich vorbereitet
      kmBaue(world, 1, 'waechterbaum', 15800, 15500);
      kmBaue(world, 1, 'waechterbaum', 15500, 15800);
    },
    // Wellen: zusaetzlich zur KI, herbeigerufen (kein Unterhalt), sie ziehen auf die Thingstaette
    takt(world) {
      const n = world.tick >= WUT.ersteWelle && (world.tick - WUT.ersteWelle) % WUT.wellenTakt === 0 ? (world.tick - WUT.ersteWelle) / WUT.wellenTakt + 1 : 0;
      if (!n || n > WUT.wellen) return;
      const ids = [];
      const ruf = (typ, k) => {
        for (let i = 0; i < k; i++) {
          const u = spawnUnit(world, 1, typ, 14600 + (ids.length % 6) * 110, 15000 + ((ids.length / 6) | 0) * 110);
          u.beschworen = true;
          ids.push(u.id);
        }
      };
      ruf('wolf', 2 + n);
      ruf('dryade', n);
      ruf('waldgeist', Math.max(0, n - 2));
      ruf('ent', n >= 5 ? 1 : 0);
      issue(world, { type: 'attack', player: 1, ids, x: 3000, y: 3000 });
    },
    hinweis(world) {
      const seit = world.tick - WUT.ersteWelle;
      const n = seit < 0 ? 0 : ((seit / WUT.wellenTakt) | 0) + 1; // Wellen bisher
      const frisch = n && seit - (n - 1) * WUT.wellenTakt < 150; // die letzte kam vor weniger als 15 s
      if (frisch) return n === WUT.wellen ? 'Die letzte Welle greift an!' : `Welle ${n} von ${WUT.wellen} greift an!`;
      return n < WUT.wellen ? `Nächste Welle in ${uhr(WUT.ersteWelle + n * WUT.wellenTakt - world.tick)}` : '';
    },
    ziele: [{ text: 'Halte zehn Minuten stand', erfuellt: (w) => w.tick >= 6000, zeit: 6000 }],
    meldungen: [
      { wer: HEDWIG, text: 'Die Wölfe heulen wieder, näher als je. Stellt die Leute an den Turm — dort sind wir am stärksten.', wann: (w) => w.tick >= 30 },
      { wer: GEROLD, text: 'Da kommen sie! Haltet die Linie, Jäger nach hinten!', wann: (w) => w.tick >= WUT.ersteWelle },
      { wer: HEDWIG, text: 'Halbzeit! Ein Bote: Die Verstärkung hat den Pass erreicht.', wann: (w) => w.tick >= 3000 },
      { wer: GEROLD, text: 'Ents! Bäume, die laufen … zielt auf die Wurzeln!', wann: (w) => w.entities.some((e) => !e.dead && e.type === 'ent' && e.player !== 0) && w.tick >= WUT.ersteWelle },
      { wer: GEROLD, text: 'Die letzte Welle — dann haben wir es geschafft!', wann: (w) => w.tick >= WUT.ersteWelle + (WUT.wellen - 1) * WUT.wellenTakt },
    ],
    sieg: 'ziele',
  },
  {
    id: 'resonit-der-goetter',
    titel: 'Blut der Götter',
    volk: 'mensch',
    karte: 'flusstal',
    stil: 'standard',
    stufe: 'mittel',
    vorwort: `Das Flusstal. Jenseits der Furten glimmt das Götterblut in den Wiesen —
      der Stoff, aus dem Söldner gemacht werden und Belagerungsgerät. Der Gott
      weiß, was dort liegt, und er wird es verteidigen.
      <b>Errichte zwei Blutschächte und sammle 300 Götterblut.</b>`,
    nachwort: `Rotes Gold füllt die Truhen. Mit ihm lassen sich Ballisten bauen, die
      weiter schießen als jeder Wächterbaum. Es ist Zeit, den Gott selbst zu stellen.`,
    aufbau(world) {
      world.players[0].masse += 500;
    },
    ziele: [
      { text: 'Errichte zwei Blutschächte auf Götterblut-Adern', erfuellt: (w, ich) => kmZahl(w, ich, 'schacht') >= 2 },
      { text: 'Sammle 300 Götterblut', erfuellt: (w, ich) => w.players[ich].resonit >= 300 },
    ],
    meldungen: [
      { wer: MIRA, text: 'Rotes Glimmen jenseits des Flusses. Hinüber kommt man nur an den Furten, wo es flach ist.', wann: (w) => w.tick >= 30 },
      { wer: MIRA, text: 'Der erste Schacht läuft. Der Wald wird das nicht mögen.', wann: (w, ich) => kmZahl(w, ich, 'schacht') >= 1 },
      { wer: HEDWIG, text: 'Die Truhen sind halb voll. Haltet die Schächte!', wann: (w, ich) => w.players[ich].resonit >= 150 },
    ],
    sieg: 'ziele',
  },
  {
    id: 'der-waldgott',
    titel: 'Der Waldgott',
    volk: 'mensch',
    karte: 'klassisch',
    stil: 'burg',
    stufe: 'mittel',
    vorwort: `Im Herzen des Waldes steht er: riesig, dunkel, mit glühenden Augen und
      goldenen Klauen. Seine Wächterbäume säumen den Weg, sein Herzbaum pulsiert.
      <b>Besiege den Waldgott oder zerstöre den Herzbaum.</b> Nimm Ballisten mit.`,
    nachwort: `Der Wald schweigt. Wo der Herzbaum stand, wächst im Frühjahr Gras.
      Die Ältesten sagen, ein Gott stirbt nicht — er wartet. <b>Ende der Kampagne.</b>
      Wie es aus seiner Sicht aussah, erzählt „Der Zorn des Waldes“.`,
    aufbau(world) {
      world.players[0].masse = 2000;
      // Der Gott hat sich eingegraben: Waechterbaeume am Weg zum Herzbaum, Quellen fuer ihre Kraft
      for (const [x, y] of [[15600, 15900], [15900, 15600], [16400, 14600], [14600, 16400]]) kmBaue(world, 1, 'waechterbaum', x, y);
      kmBaue(world, 1, 'quelle', 17600, 15900);
      kmBaue(world, 1, 'quelle', 15900, 17600);
      kmBaue(world, 1, 'steinkreis', 16400, 16400);
    },
    ziele: [{ text: 'Besiege den Waldgott oder zerstöre den Herzbaum', erfuellt: (w, ich) => w.over && w.winner === ich }],
    meldungen: [
      { wer: GEROLD, text: 'Seine Wächterbäume schießen weit. Ballisten schießen weiter — Bogenbau, dann Belagerungsbau im Skillbaum (T).', wann: (w) => w.tick >= 30 },
      { wer: GEROLD, text: 'Ein Wächterbaum ist gefallen! Weiter, solange sie wanken!', wann: (w, ich) => kmZahl(w, 1 - ich, 'waechterbaum') < 4 },
      { wer: MIRA, text: 'Ich habe ihn gesehen. Größer als die Thingstätte, und seine Augen … Herr, er sieht uns.', wann: (w, ich) => w.entities.some((e) => e.type === 'waldgott' && !e.dead && kmNahe(w, ich, [e.id], 1500)) },
    ],
    sieg: 'standard',
  },
];

// Holzfaeller am Grat (Lernmission Gott): Saegewerk auf der Mittelader, Grenzstein, zwei Soldaten
const GRAT = [10000, 7400];
// Saegewerke an der Siedlung der Menschen (gespiegelte Adern der Startbasis)
const SIEDLUNG_SAEGEN = [[15200, 17800], [17800, 15200], [13800, 15500]];

const ZORN = [
  {
    id: 'erwachen',
    titel: 'Erwachen',
    volk: 'gott',
    karte: 'klassisch',
    stil: 'burg',
    stufe: 'leicht',
    ki: false, // die Menschen ahnen nichts
    vorwort: `Hundert Winter hast du geschlafen, unter Moos und Wurzeln. Jetzt weckt
      dich ein Geräusch, das du nicht kennst: Äxte. Am Grat haben Menschen ein
      Sägewerk gebaut, mitten auf deinem Stein. <b>Sammle deine Kraft, rufe deine
      Geschöpfe und vertreibe die Holzfäller.</b> Ich zeige dir, wie.`,
    nachwort: `Das Sägewerk brennt, die Holzfäller fliehen über den Grat. Aber
      hinter ihnen, in der Ebene, rauchen hundert Schornsteine. Sie werden
      wiederkommen — mit mehr Äxten.`,
    aufbau(world) {
      const w = kmBaue(world, 1, 'saege', GRAT[0], GRAT[1]);
      const g = spawnBuilding(world, 1, 'grenzstein', GRAT[0] - 700, GRAT[1] - 300, true);
      const a = spawnUnit(world, 1, 'soldat', GRAT[0] - 300, GRAT[1] - 400);
      const b = spawnUnit(world, 1, 'soldat', GRAT[0] + 200, GRAT[1] - 450);
      world.vorposten = [w.id, g.id, a.id, b.id];
    },
    ziele: [
      { text: 'Wähle den Waldgott (Taste <kbd>K</kbd>)', erfuellt: (w, ich, c) => c.sel.some((id) => w.entities.find((e) => e.id === id && e.type === 'waldgott')) },
      { text: 'Errichte eine Moosgrube auf einer Steinader (Waldgott wählen, <kbd>2</kbd>, Klick auf eine Ader)', erfuellt: (w, ich) => kmZahl(w, ich, 'moos') >= 1 },
      { text: 'Pflanze einen Hain (Taste <kbd>3</kbd>) — deine Domäne wächst mit seinem Alter', erfuellt: (w, ich) => kmZahl(w, ich, 'hain') >= 1 },
      { text: 'Rufe drei Dryaden (Herzbaum anklicken, Dryaden-Icon unten)', erfuellt: (w, ich) => kmZahl(w, ich, 'dryade') >= 3 },
      { text: 'Rufe zwei Wölfe', erfuellt: (w, ich) => kmZahl(w, ich, 'wolf') >= 2 },
      { text: 'Fasse deine Geschöpfe zur Steuergruppe 1 zusammen (wählen, <kbd>Strg</kbd>+<kbd>1</kbd>)', erfuellt: (w, ich, c) => (c.gruppen['1'] || []).length >= 4 },
      { text: 'Vertreibe die Holzfäller vom Grat (Rechtsklick auf einen Feind greift ihn gezielt an)', erfuellt: (w) => (w.vorposten || []).every((id) => !w.entities.some((e) => e.id === id && !e.dead)) },
    ],
    meldungen: [
      { wer: EICHE, text: 'Du bist wach. Gut. Hörst du die Äxte? Erst Kraft, dann Zorn: eine Moosgrube auf dem Stein.', wann: (w) => w.tick >= 20 },
      { wer: EICHE, text: 'Der Hain wurzelt. Je älter er wird, desto weiter reicht dein Wald — Geduld ist deine Stärke.', wann: (w, ich, s) => s[2] },
      { wer: KRA, text: 'Kra! Menschen am Grat! Zwei mit Eisen, und ein Stein mit Zeichen drauf. Kra!', wann: (w, ich) => kmNahe(w, ich, w.vorposten || [], 1400) },
    ],
    sieg: 'ziele',
  },
  {
    id: 'axt-und-feuer',
    titel: 'Axt und Feuer',
    volk: 'gott',
    karte: 'klassisch',
    stil: 'standard',
    stufe: 'leicht',
    vorwort: `Sie sind wiedergekommen. An ihrer Siedlung kreischen drei Sägewerke
      Tag und Nacht, und jeder Stamm, der fällt, ist ein Stück von dir.
      <b>Zerstöre die drei Sägewerke an der Siedlung der Menschen.</b> Ein Rabe
      (Herzbaum) findet sie im Nebel.`,
    nachwort: `Stille an der Siedlung. Doch die Menschen lernen schnell: Sie bauen
      Türme aus Stein und schicken Boten in die Ebene. Bald kommt ihr Held — mit
      allem, was sie haben.`,
    aufbau(world) {
      world.players[0].masse += 400;
      world.saegen = SIEDLUNG_SAEGEN.map(([x, y]) => kmBaue(world, 1, 'saege', x, y).id);
    },
    ziele: [
      {
        text: 'Zerstöre die drei Sägewerke an der Siedlung der Menschen',
        erfuellt: (w) => (w.saegen || []).every((id) => !w.entities.some((e) => e.id === id && !e.dead)),
        zaehler: (w) => `${(w.saegen || []).filter((id) => !w.entities.some((e) => e.id === id && !e.dead)).length}/3`,
      },
    ],
    meldungen: [
      { wer: KRA, text: 'Kra! Drei Sägewerke, ganz hinten bei ihren Häusern. Ruf mich am Herzbaum, ich zeig sie dir!', wann: (w) => w.tick >= 30 },
      { wer: KRA, text: 'Eins brennt! Kra! Kra!', wann: (w) => (w.saegen || []).some((id) => !kmLebt(w, id)) },
      { wer: EICHE, text: 'Noch eines. Hör, wie still es wird.', wann: (w) => (w.saegen || []).filter((id) => !kmLebt(w, id)).length >= 2 },
    ],
    sieg: 'ziele',
  },
  {
    id: 'zorn-des-waldes',
    titel: 'Der Zorn des Waldes',
    volk: 'gott',
    karte: 'klassisch',
    stil: 'burg',
    stufe: 'leicht',
    vorwort: `Der Held der Menschen hat sich eingegraben: vier Wachtürme aus Stein, eine
      Garnison, eine Kapelle, eine Schmiede, die Tag und Nacht glüht. Sie glauben, Mauern halten
      einen Wald auf. <b>Besiege den Helden oder zerstöre die Thingstätte.</b>
      Ents brechen Mauern, Wurzelbrecher erst recht.`,
    nachwort: `Wo die Thingstätte stand, sprießen im Frühjahr Birken. Die Menschen
      erzählen sich noch lange von dem Winter, in dem der Wald zurückkam.
      <b>Ende der Kampagne.</b> Danke fürs Spielen!`,
    aufbau(world) {
      world.players[0].masse = 2000;
      for (const [x, y] of [[15600, 15900], [15900, 15600], [16400, 14600], [14600, 16400]]) kmBaue(world, 1, 'wachturm', x, y);
      // und eine Garnison
      for (let i = 0; i < 8; i++) spawnUnit(world, 1, 'soldat', 15300 - (i % 4) * 90, 15300 - ((i / 4) | 0) * 90);
      for (let i = 0; i < 4; i++) spawnUnit(world, 1, 'jaeger', 15600 - i * 90, 15050);
      kmBaue(world, 1, 'schmiede', 17600, 15900);
      kmBaue(world, 1, 'kapelle', 16400, 16400);
      kmBaue(world, 1, 'kaserne', 15900, 17600);
    },
    ziele: [{ text: 'Besiege den Helden oder zerstöre die Thingstätte', erfuellt: (w, ich) => w.over && w.winner === ich }],
    meldungen: [
      { wer: EICHE, text: 'Ihre Türme sind aus Stein. Ents brechen Stein — erwecke sie im Skillbaum (T).', wann: (w) => w.tick >= 30 },
      { wer: KRA, text: 'Ein Turm ist umgefallen! Steine überall! Kra!', wann: (w, ich) => kmZahl(w, 1 - ich, 'wachturm') < 4 },
      { wer: EICHE, text: 'Da ist er, ihr Held. Er hat Angst, und Angst macht Menschen gefährlich.', wann: (w, ich) => w.entities.some((e) => e.type === 'held' && !e.dead && kmNahe(w, ich, [e.id], 1500)) },
    ],
    sieg: 'standard',
  },
];

// ------------------------------------------------------------ Herausforderungen: Ueberleben
// Endlose Wellen, jede groesser: herbeigerufen (kein Unterhalt), sie ziehen
// auf das eigene Hauptgebaeude. Die KI des Gegners schlaeft; wer sein
// Hauptgebaeude faellt, gewinnt trotzdem. Designzahlen.
const UEBERLEBEN = { ersteWelle: 900, takt: 750, rekord: 'dreiReiche.ueberleben' };

/** Hauptgebaeude eines Spielers (oder null). */
const kmHaupt = (w, p) => w.entities.find((e) => !e.dead && e.player === p && e.kind === 'building' && BUILDINGS[e.type].vital) || null;

function ueberlebenWelle(world, ich) {
  const t = world.tick - UEBERLEBEN.ersteWelle;
  if (t < 0 || t % UEBERLEBEN.takt !== 0) return;
  const n = t / UEBERLEBEN.takt + 1;
  const feind = 1 - ich;
  const von = kmHaupt(world, feind);
  const ziel = kmHaupt(world, ich);
  if (!von || !ziel) return;
  const liste =
    world.players[feind].faction === 'gott'
      ? [['wolf', n], ['dryade', n - 1], ['waldgeist', n - 4], ['ent', (n / 6) | 0], ['wurzelbrecher', (n / 8) | 0]]
      : [['soldat', 3 + n], ['jaeger', n], ['soeldner', n - 2], ['katapult', (n / 4) | 0]];
  // Sammelplatz vor dem gegnerischen Hauptgebaeude, Richtung Kartenmitte
  const sx = von.x + (von.x < ziel.x ? 1100 : -1100);
  const sy = von.y + (von.y < ziel.y ? 1100 : -1100);
  const ids = [];
  for (const [typ, zahl] of liste) {
    for (let i = 0; i < zahl; i++) {
      const k = ids.length;
      const u = spawnUnit(world, feind, typ, sx + (k % 7) * 110 - 330, sy + ((k / 7) | 0) * 110 - 220);
      u.beschworen = true;
      ids.push(u.id);
    }
  }
  issue(world, { type: 'attack', player: feind, ids, x: ziel.x, y: ziel.y });
}
function ueberlebenHinweis(world) {
  const seit = world.tick - UEBERLEBEN.ersteWelle;
  const n = seit < 0 ? 0 : ((seit / UEBERLEBEN.takt) | 0) + 1;
  if (n && seit - (n - 1) * UEBERLEBEN.takt < 150) return `Welle ${n} greift an!`;
  return `Welle ${n + 1} in ${uhr(UEBERLEBEN.ersteWelle + n * UEBERLEBEN.takt - world.tick)}`;
}

/** Bester Stand (Ticks) im Ueberleben je Volk. */
export function ueberlebenRekord(volk) {
  try {
    return (JSON.parse(localStorage.getItem(UEBERLEBEN.rekord) || '{}')[volk]) || 0;
  } catch {
    return 0;
  }
}
/** Ergebnis eintragen; liefert true bei neuem Rekord. */
export function ueberlebenEintragen(volk, ticks) {
  if (ticks <= ueberlebenRekord(volk)) return false;
  try {
    const r = JSON.parse(localStorage.getItem(UEBERLEBEN.rekord) || '{}');
    r[volk] = ticks;
    localStorage.setItem(UEBERLEBEN.rekord, JSON.stringify(r));
  } catch {
    return false;
  }
  return true;
}

const HERAUSFORDERUNGEN = ['mensch', 'gott'].map((volk) => ({
  id: 'ueberleben-' + volk,
  titel: volk === 'mensch' ? 'Überleben als Menschen' : 'Überleben als Gott',
  volk,
  karte: 'klassisch',
  stil: 'standard',
  stufe: 'mittel',
  ki: false, // der Gegner baut nicht, er schickt nur Wellen
  ueberleben: true,
  vorwort:
    volk === 'mensch'
      ? `Der Wald hat aufgehört zu verhandeln. Alle <b>75 Sekunden</b> kommt eine neue Welle, jede größer als die letzte: Wölfe,
        Dryaden, Waldgeister, Ents. <b>Wie lange hältst du?</b> Wer den Herzbaum fällt,
        gewinnt.`
      : `Die Menschen haben ein Heerlager aufgeschlagen und schicken alle <b>75 Sekunden</b>
        eine neue Welle, jede größer als die letzte: Soldaten, Jäger, Söldner, Ballisten.
        <b>Wie lange hält dein Wald?</b> Wer die Thingstätte fällt, gewinnt.`,
  nachwort: 'Gewonnen! Das Hauptgebäude des Gegners ist gefallen — die Wellen hören auf.',
  aufbau(world) {
    world.players[0].masse += 300;
  },
  takt(world) {
    ueberlebenWelle(world, 0);
  },
  hinweis: ueberlebenHinweis,
  ziele: [{ text: 'Überlebe so lange du kannst — oder fälle das Hauptgebäude des Gegners', erfuellt: (w, ich) => w.over && w.winner === ich }],
  sieg: 'standard',
  meldungen: [
    { wer: volk === 'mensch' ? GEROLD : EICHE, text: volk === 'mensch' ? 'Da kommt die erste Welle. Das ist erst der Anfang — baut aus, solange ihr könnt!' : 'Sie kommen. Die ersten sind wenige — die nächsten werden mehr sein.', wann: (w) => w.tick >= UEBERLEBEN.ersteWelle },
    { wer: volk === 'mensch' ? HEDWIG : KRA, text: volk === 'mensch' ? 'Welle fünf! Die Ents kommen jetzt mit — wir brauchen Ballisten.' : 'Kra! Welle fünf! Sie haben Ballisten dabei, Kra!', wann: (w) => w.tick >= UEBERLEBEN.ersteWelle + 4 * UEBERLEBEN.takt },
    { wer: volk === 'mensch' ? GEROLD : EICHE, text: volk === 'mensch' ? 'Zehn Wellen. Wer das hier überlebt, erzählt es seinen Enkeln.' : 'Zehn Wellen, und du stehst noch. Der Wald ist älter als ihre Geduld.', wann: (w) => w.tick >= UEBERLEBEN.ersteWelle + 9 * UEBERLEBEN.takt },
  ],
}));

export const KAMPAGNEN = [
  { id: 'rodung', titel: 'Die Rodung', volk: 'mensch', missionen: RODUNG, speicher: 'dreiReiche.kampagne', niederlage: 'Der Held ist gefallen — oder die Thingstätte.' },
  { id: 'zorn', titel: 'Der Zorn des Waldes', volk: 'gott', missionen: ZORN, speicher: 'dreiReiche.kampagne.zorn', niederlage: 'Der Waldgott ist gefallen — oder der Herzbaum.' },
  { id: 'herausforderungen', titel: 'Herausforderungen', volk: 'beide', missionen: HERAUSFORDERUNGEN, speicher: 'dreiReiche.kampagne.herausforderungen', frei: true, niederlage: '' },
];
for (const k of KAMPAGNEN) for (const m of k.missionen) m.kampagne = k;
export const MISSIONEN = KAMPAGNEN.flatMap((k) => k.missionen);

export function missionVon(id) {
  return MISSIONEN.find((m) => m.id === id) || null;
}
const nummer = (m) => m.kampagne.missionen.indexOf(m);
const naechsteVon = (m) => m.kampagne.missionen[nummer(m) + 1] || null;

/** Wie viele Missionen einer Kampagne geschafft sind (die naechste ist freigeschaltet). */
export function kampagneStand(k = KAMPAGNEN[0]) {
  try {
    return Number(localStorage.getItem(k.speicher)) || 0;
  } catch {
    return 0;
  }
}
export function missionGeschafft(m) {
  const i = nummer(m);
  try {
    if (i + 1 > kampagneStand(m.kampagne)) localStorage.setItem(m.kampagne.speicher, String(i + 1));
  } catch {
    /* ohne Speicher eben nicht freigeschaltet */
  }
}

/** Ziele pruefen: welche erfuellt, ob die Mission gewonnen ist. Erledigt bleibt erledigt. */
export function missionPruefen(m, stand, world, ich, kontext) {
  for (let i = 0; i < m.ziele.length; i++) {
    if (stand[i]) continue;
    // Der Reihe nach: erst wenn alle vorigen erledigt sind (wie in einer Lernmission)
    if (i > 0 && !stand[i - 1]) break;
    if (m.ziele[i].erfuellt(world, ich, kontext)) stand[i] = true;
  }
  return stand.every(Boolean);
}

/** Naechster faelliger Funkspruch (jeder nur einmal); gezeigt: Indizes der schon gezeigten. */
export function naechsteMeldung(m, gezeigt, world, ich, stand) {
  const liste = m.meldungen || [];
  for (let i = 0; i < liste.length; i++) {
    if (gezeigt.includes(i)) continue;
    if (liste[i].wann(world, ich, stand)) {
      gezeigt.push(i);
      return liste[i];
    }
  }
  return null;
}

export function funkHtml(mld) {
  return `<div class="funkspruch"><b>${mld.wer}</b><span>${mld.text}</span></div>`;
}

/** Abschnitt fuer den Startbildschirm: je Kampagne eine Zeile. */
export function kampagneHtml() {
  return KAMPAGNEN.map((k) => {
    const fertig = kampagneStand(k);
    if (k.frei) {
      // Herausforderungen: alle offen, mit Rekord
      return `<div class="kampagne ${k.volk}"><b>⏳ ${k.titel}</b>
    ${k.missionen.map((m) => `<button data-mission="${m.id}">▶ ${m.titel}${ueberlebenRekord(m.volk) ? ` · Rekord ${uhr(ueberlebenRekord(m.volk))}` : ''}</button>`).join('')}
  </div>`;
    }
    return `<div class="kampagne ${k.volk}"><b>${k.volk === 'gott' ? '🌳' : '⚔'} ${k.titel}</b>
    ${k.missionen.map((m, i) => `<button data-mission="${m.id}"${i > fertig ? ' disabled' : ''}>${i < fertig ? '✔' : i === fertig ? '▶' : '🔒'} ${i + 1}. ${m.titel}</button>`).join('')}
  </div>`;
  }).join('');
}

export function vorwortHtml(m) {
  const kopf = m.kampagne.frei ? m.kampagne.titel + (ueberlebenRekord(m.volk) ? ` · Rekord ${uhr(ueberlebenRekord(m.volk))}` : '') : `Kampagne „${m.kampagne.titel}“ · Mission ${nummer(m) + 1} von ${m.kampagne.missionen.length}`;
  return `<div class="vorwort ${m.volk}"><div class="kapitel">${kopf}</div>
    <h1>${m.titel}</h1>
    <p>${m.vorwort}</p>
    <div class="go"><button id="missionLos">Los</button><button id="missionZurueck">Zurück</button></div></div>`;
}

/** Ziele im HUD: erledigt abgehakt, das aktuelle hervorgehoben. */
export function zieleHtml(m, stand, world) {
  let aktuell = stand.findIndex((s) => !s);
  return `<div class="ziele"><b>${m.titel}</b>${m.ziele
    .map((z, i) => {
      if (i > aktuell && aktuell >= 0) return '';
      const rest = z.zeit && !stand[i] ? ` <span class="zeit">${uhr(z.zeit - world.tick)}</span>` : z.zaehler && !stand[i] ? ` <span class="zeit">${z.zaehler(world)}</span>` : '';
      return `<div class="${stand[i] ? 'ok' : 'jetzt'}">${stand[i] ? '✔' : '○'} ${z.text}${rest}</div>`;
    })
    .join('')}${m.hinweis && m.hinweis(world) ? `<div class="hinweis">${m.hinweis(world)}</div>` : ''}</div>`;
}

export function missionEndeHtml(m, gewonnen, welt = null) {
  if (m.ueberleben) {
    const zeit = welt ? uhr(welt.tick) : '';
    const rekord = welt && ueberlebenEintragen(m.volk, welt.tick);
    return `<div class="vorwort ${m.volk}"><div class="kapitel">${m.kampagne.titel}</div><h1>${gewonnen ? 'Gewonnen nach ' + zeit : 'Überlebt: ' + zeit}</h1>
      <p>${gewonnen ? m.nachwort : `Bis Welle ${Math.max(0, Math.floor((welt ? welt.tick : 0) - UEBERLEBEN.ersteWelle) / UEBERLEBEN.takt + 1) | 0} hast du gehalten.`}
      ${rekord ? ' <b>Neuer Rekord!</b>' : ` Rekord: ${uhr(ueberlebenRekord(m.volk))}.`}</p>
      <div class="go"><button id="missionNochmal">Nochmal</button><button id="endeKarte">Karte ansehen</button><button id="endeNochmal">Hauptmenü</button></div></div>`;
  }
  const i = nummer(m);
  const naechste = naechsteVon(m);
  return gewonnen
    ? `<div class="vorwort ${m.volk}"><div class="kapitel">Mission ${i + 1} geschafft</div><h1>${m.titel}</h1><p>${m.nachwort}</p>
      <div class="go">${naechste ? `<button id="missionWeiter">Weiter: ${naechste.titel}</button>` : ''}<button id="endeKarte">Karte ansehen</button><button id="endeNochmal">Hauptmenü</button></div></div>`
    : `<div class="vorwort ${m.volk}"><div class="kapitel">Mission ${i + 1} verloren</div><h1>${m.titel}</h1><p>${m.kampagne.niederlage} Versuch es noch einmal.</p>
      <div class="go"><button id="missionNochmal">Nochmal</button><button id="endeKarte">Karte ansehen</button><button id="endeNochmal">Hauptmenü</button></div></div>`;
}

// ------------------------------------------------------------ Verdrahtung (beide Oberflaechen)
const knopfAn = (id, f) => {
  const b = document.getElementById(id);
  if (b) b.onclick = f;
};

/** Knoepfe der Kampagne im Startbildschirm: waehle(m) zeigt das Vorwort. */
export function kampagneVerdrahten(el, waehle) {
  const knoepfe = el.querySelectorAll ? el.querySelectorAll('[data-mission]') : [];
  for (const b of knoepfe) b.onclick = () => waehle(missionVon(b.dataset.mission));
}

/** Vorwort einer Mission ueber dem Spielfeld; los() startet sie, zurueck() geht zum Startbildschirm. */
export function vorwortZeigen(el, m, los, zurueck) {
  el.innerHTML = vorwortHtml(m);
  el.style.display = '';
  knopfAn('missionLos', () => {
    el.style.display = 'none';
    los();
  });
  knopfAn('missionZurueck', zurueck);
}

/** Ende einer Mission: Nachwort oder Niederlage; k.waehle(m) zeigt ein Vorwort, k.menue den Startbildschirm. */
export function missionEndeZeigen(el, m, gewonnen, k) {
  if (gewonnen) missionGeschafft(m);
  el.innerHTML = missionEndeHtml(m, gewonnen, k.welt);
  el.style.display = '';
  knopfAn('missionWeiter', () => k.waehle(naechsteVon(m)));
  knopfAn('missionNochmal', () => k.waehle(m));
  knopfAn('endeKarte', () => (el.style.display = 'none'));
  knopfAn('endeNochmal', k.menue);
}
