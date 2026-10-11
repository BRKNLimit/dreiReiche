import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createWorld,
  spawnBuilding,
  spawnUnit,
  computeRegions,
  distributeGegenwart,
  anchorRadius,
  inDomain,
  isCleared,
  tryPlace,
  step,
  issue,
  hash,
  gridReport,
  isqrt,
  inForeignDomain,
  dist2,
  unterhaltProMin,
  erfahrung,
  skillPunkte,
  skillFrei,
  gesperrt,
  kannLernen,
  spawnKommandant,
} from '../src/sim/sim.js';
import { FACTIONS, BUILDINGS, UNITS, RULES, MAP, SKILLS, FAEHIGKEITEN } from '../src/sim/defs.js';
import { createAI, stepAI } from '../src/sim/ai.js';

function bare(f0 = 'mensch', f1 = 'gott') {
  return createWorld({ empty: true, factions: [f0, f1] });
}

/** Ein Erbauer direkt neben der Baustelle, mit Auftrag. */
function erbauerDaneben(w, site, typ = 'held') {
  const u = spawnUnit(w, site.player, typ, site.x + BUILDINGS[site.type].radius + UNITS[typ].radius + 20, site.y);
  issue(w, { type: 'bauen', player: site.player, ids: [u.id], id: site.id });
  return u;
}

test('isqrt liefert exakte Integer-Wurzeln', () => {
  assert.equal(isqrt(144), 12);
  assert.equal(isqrt(145), 12);
  assert.equal(isqrt(1000000), 1000);
});

// ---------------------------------------------------- Die eine Regel

test('Menschen-Anker hat sofort vollen Radius und wächst nicht', () => {
  const w = bare();
  const t = spawnBuilding(w, 0, 'grenzstein', 5000, 5000, true);
  computeRegions(w);
  const r0 = anchorRadius(w, t);
  assert.equal(r0, FACTIONS.mensch.growth.start);

  for (let i = 0; i < 2000; i++) step(w);
  assert.equal(anchorRadius(w, t), r0, 'nach 2000 Ticks unverändert');
});

test('Gott-Anker startet klein und wächst mit der Zeit', () => {
  const w = bare('gott', 'mensch');
  const h = spawnBuilding(w, 0, 'hain', 5000, 5000, true);
  computeRegions(w);
  const r0 = anchorRadius(w, h);
  assert.equal(r0, FACTIONS.gott.growth.start);

  for (let i = 0; i < 600; i++) step(w);
  const r1 = anchorRadius(w, h);
  assert.ok(r1 > r0, `nach 1 Minute größer: ${r0} -> ${r1}`);
  assert.equal(r1, r0 + 600 * FACTIONS.gott.growth.perTick);
});

test('Gott-Anker hört beim Höchstradius auf zu wachsen', () => {
  const w = bare('gott', 'mensch');
  const h = spawnBuilding(w, 0, 'hain', 5000, 5000, true);
  for (let i = 0; i < 9000; i++) step(w);
  assert.equal(anchorRadius(w, h), FACTIONS.gott.growth.max);
});

test('die Fraktionen überholen sich: Gott ist erst kleiner, dann größer', () => {
  const wm = bare();
  const tm = spawnBuilding(wm, 0, 'grenzstein', 5000, 5000, true);
  const wg = bare('gott', 'mensch');
  const tg = spawnBuilding(wg, 0, 'hain', 5000, 5000, true);

  computeRegions(wm);
  computeRegions(wg);
  assert.ok(anchorRadius(wg, tg) < anchorRadius(wm, tm), 'am Anfang kleiner');

  for (let i = 0; i < 3000; i++) {
    step(wm);
    step(wg);
  }
  assert.ok(anchorRadius(wg, tg) > anchorRadius(wm, tm), 'nach 5 Minuten größer');
});

test('eine Baustelle zählt nicht als Anker', () => {
  const w = bare();
  const t = spawnBuilding(w, 0, 'grenzstein', 5000, 5000, false);
  computeRegions(w);
  assert.equal(anchorRadius(w, t), 0);
  assert.equal(inDomain(w, 0, 5000, 5000), false);
});

// ---------------------------------------------------- Domäne und Regionen

test('Gebäude im Ankerkreis bilden eine Region', () => {
  const w = bare();
  spawnBuilding(w, 0, 'grenzstein', 5000, 5000, true);
  spawnBuilding(w, 0, 'schmiede', 6500, 5000, true);
  computeRegions(w);
  assert.equal(w.regions.length, 1);
});

test('eine entfernte Vorwärtsstellung ist eine eigene Region', () => {
  const w = bare();
  spawnBuilding(w, 0, 'grenzstein', 5000, 5000, true);
  spawnBuilding(w, 0, 'schmiede', 15000, 15000, true);
  computeRegions(w);
  distributeGegenwart(w);
  assert.equal(w.regions.length, 2);
  const remote = gridReport(w, 0).find((r) => r.size === 1 && r.supply === 40);
  assert.ok(remote, 'die Außenstelle steht für sich');
});

test('Domänen verschiedener Spieler verbinden sich nie', () => {
  const w = bare();
  spawnBuilding(w, 0, 'grenzstein', 5000, 5000, true);
  spawnBuilding(w, 1, 'hain', 5400, 5000, true);
  computeRegions(w);
  assert.equal(w.regions.length, 2);
});

// ---------------------------------------------------- Drosselleiter

test('Drosselleiter: Werk fällt vor Segen', () => {
  const w = bare();
  spawnBuilding(w, 0, 'grenzstein', 5000, 5000, true);
  spawnBuilding(w, 0, 'schmiede', 5800, 5000, true); // +40
  const saege = spawnBuilding(w, 0, 'saege', 5000, 5800, true); // 14, Segen
  const kaserne = spawnBuilding(w, 0, 'kaserne', 6200, 5600, true); // 55, Werk
  kaserne.queue.push('soldat');

  computeRegions(w);
  distributeGegenwart(w);

  assert.equal(saege.powered, 1000, 'Segen bleibt versorgt');
  assert.ok(kaserne.powered < 1000, 'Werk wird gedrosselt');
  assert.equal(kaserne.powered, Math.floor(((40 - 14) * 1000) / 55));
});

test('ohne Erbauer kein Baufortschritt -- auch nicht in versorgter Domaene', () => {
  const w = bare();
  spawnBuilding(w, 0, 'grenzstein', 15000, 15000, true);
  spawnBuilding(w, 0, 'schmiede', 15800, 15000, true);
  const b = spawnBuilding(w, 0, 'kaserne', 16600, 15600, false);
  for (let i = 0; i < BUILDINGS.kaserne.buildTime * 3; i++) step(w);
  assert.equal(b.done, false);
  assert.equal(b.progress, 0);
});

test('mit einem Erbauer daneben wird sie fertig: buildTime bei voller Kraft', () => {
  const w = bare();
  spawnBuilding(w, 0, 'grenzstein', 15000, 15000, true);
  spawnBuilding(w, 0, 'schmiede', 15800, 15000, true);
  const b = spawnBuilding(w, 0, 'kaserne', 16600, 15600, false);
  erbauerDaneben(w, b, 'held');
  for (let i = 0; i < BUILDINGS.kaserne.buildTime - 1; i++) step(w);
  assert.equal(b.done, false, 'nicht schneller als buildTime');
  step(w);
  step(w);
  assert.equal(b.done, true);
});

test('in der Domaene: erst wenn der Erbauer ankommt, geht es los', () => {
  const w = bare();
  spawnBuilding(w, 0, 'halle', 5000, 5000, true);
  const bauer = spawnUnit(w, 0, 'bauer', 5000, 7500); // 250 m entfernt, in der Domaene
  issue(w, { type: 'build', player: 0, building: 'grenzstein', x: 7500, y: 5000, ids: [bauer.id] });
  step(w);
  const turm = w.entities.find((e) => e.type === 'grenzstein');
  for (let i = 0; i < 20; i++) step(w);
  assert.equal(turm.progress, 0, 'unterwegs wird nicht gebaut, Gegenwart hin oder her');
  for (let i = 0; i < 200; i++) step(w);
  assert.ok(turm.progress > 0, 'angekommen: es geht voran');
});

test('in der Domaene: wer weggeht, baut nicht weiter -- die Baustelle steht', () => {
  const w = bare();
  spawnBuilding(w, 0, 'halle', 5000, 5000, true);
  const turm = tryPlace(w, 0, 'grenzstein', 7000, 5000);
  const k = erbauerDaneben(w, turm, 'held');
  for (let i = 0; i < 20; i++) step(w);
  const stand = turm.progress;
  assert.ok(stand > 0, 'angefangen');
  issue(w, { type: 'move', player: 0, ids: [k.id], x: 3000, y: 5000 });
  for (let i = 0; i < BUILDINGS.grenzstein.buildTime * 3; i++) step(w);
  assert.equal(turm.progress, stand, 'kein Fortschritt ohne Erbauer');
  assert.equal(turm.done, false, 'und nicht trotzdem fertig');
});

test('mehrere Erbauer bauen zusammen schneller als einer', () => {
  const zeit = (zweiter) => {
    const w = bare();
    spawnBuilding(w, 0, 'halle', 5000, 5000, true);
    const b = tryPlace(w, 0, 'grenzstein', 7000, 5000);
    erbauerDaneben(w, b, 'bauer');
    if (zweiter) {
      const u = spawnUnit(w, 0, 'bauer', b.x - 100, b.y);
      issue(w, { type: 'bauen', player: 0, ids: [u.id], id: b.id });
    }
    let t = 0;
    while (!b.done && t < 5000) {
      step(w);
      t++;
    }
    return t;
  };
  assert.ok(zeit(true) * 3 < zeit(false) * 2, 'deutlich schneller zu zweit');
});

// ---------------------------------------------------- Roden

test('ein Sägewerk rodet den Boden und sperrt Haine aus', () => {
  const w = bare();
  spawnBuilding(w, 0, 'grenzstein', 5000, 5000, true);
  spawnBuilding(w, 0, 'schmiede', 5800, 5000, true);
  w.deposits.push({ x: 5000, y: 6200, kind: 'fron', takenBy: 0 });
  const s = tryPlace(w, 0, 'saege', 5000, 6200);
  assert.ok(s, 'Sägewerk steht');
  assert.equal(isCleared(w, 5000, 6200), false, 'erst nach Fertigstellung');
  erbauerDaneben(w, s);

  for (let i = 0; i < BUILDINGS.saege.buildTime + 1; i++) step(w);
  assert.equal(s.done, true);
  assert.equal(isCleared(w, 5000, 6200), true, 'der Boden ist gerodet');

  const hain = tryPlace(w, 1, 'hain', 5200, 6200);
  assert.equal(hain, null, 'auf gerodetem Boden wächst kein Hain');
});

test('abseits des gerodeten Bodens lässt sich ein Hain pflanzen', () => {
  const w = bare();
  const hain = tryPlace(w, 1, 'hain', 12000, 12000);
  assert.ok(hain, 'ungerodeter Boden trägt');
});

test('Fraktionen können nur ihre eigenen Gebäude bauen', () => {
  const w = bare();
  assert.equal(tryPlace(w, 0, 'hain', 9000, 9000), null, 'Mensch baut keinen Hain');
  assert.equal(tryPlace(w, 1, 'grenzstein', 9000, 9000), null, 'Gott baut keinen Turm');
});

// ---------------------------------------------------- Heimvorteil

// Ein Gefecht: Wolf (Gott) gegen Soldat, wahlweise mit Schreinen im Gott-Netz.
function schreinGefecht({ schreine = [], versorgt = true, wolfX = 5100 }) {
  const w = bare('gott', 'mensch');
  spawnBuilding(w, 0, 'herzbaum', 5000, 5000, true);
  if (!versorgt) w.entities[0].type = 'hain'; // ein Anker ohne Gegenwart
  schreine.forEach((t, i) => spawnBuilding(w, 0, t, 4700, 4800 + i * 200, true));
  const wolf = spawnUnit(w, 0, 'wolf', wolfX, 5000);
  const soldat = spawnUnit(w, 1, 'soldat', wolfX + 60, 5000); // Beruehrung
  const hp = [wolf.hp, soldat.hp];
  step(w);
  return { gegeben: hp[1] - soldat.hp, genommen: hp[0] - wolf.hp };
}

test('ohne Schrein kein Heimvorteil', () => {
  assert.equal(schreinGefecht({}).gegeben, UNITS.wolf.weapon.damage);
});

test('Zorn: ein versorgter Schrein staerkt Einheiten in seinem Umkreis', () => {
  const zorn = BUILDINGS.dornenschrein.buff.zorn;
  assert.equal(
    schreinGefecht({ schreine: ['dornenschrein'] }).gegeben,
    ((UNITS.wolf.weapon.damage * (1000 + zorn)) / 1000) | 0
  );
});

test('Zorn wirkt nicht ausserhalb der eigenen Domaene', () => {
  assert.equal(schreinGefecht({ schreine: ['dornenschrein'], wolfX: 12000 }).gegeben, UNITS.wolf.weapon.damage);
});

test('Zorn wirkt nicht ausserhalb des Schrein-Umkreises, auch in der eigenen Domaene', () => {
  // Herzbaum bei 5000 traegt bis 9000 (anchorMin), der Schrein bei 4700 reicht 3000 weit.
  const x = 4700 + BUILDINGS.dornenschrein.buff.radius + 300;
  assert.ok(x + 200 < 5000 + BUILDINGS.herzbaum.anchorMin, 'Wolf steht noch in der Domaene');
  assert.equal(schreinGefecht({ schreine: ['dornenschrein'], wolfX: x }).gegeben, UNITS.wolf.weapon.damage);
});

test('ein Schrein ohne Gegenwart wirkt nicht', () => {
  assert.equal(schreinGefecht({ schreine: ['dornenschrein'], versorgt: false }).gegeben, UNITS.wolf.weapon.damage);
});

test('Wehr: ein versorgter Schrein mindert den Schaden an eigenen Einheiten', () => {
  const ohne = schreinGefecht({}).genommen;
  const mit = schreinGefecht({ schreine: ['steinkreis'] }).genommen;
  const wehr = BUILDINGS.steinkreis.buff.wehr;
  assert.equal(mit, ((ohne * (1000 - wehr)) / 1000) | 0);
});

test('Schreine stapeln nicht: zwei gleiche wirken wie einer', () => {
  // Mit Quellgrund, damit beide voll versorgt sind -- sonst drosselt die Leiter.
  const einer = schreinGefecht({ schreine: ['quelle', 'dornenschrein'] }).gegeben;
  const zwei = schreinGefecht({ schreine: ['quelle', 'dornenschrein', 'dornenschrein'] }).gegeben;
  assert.equal(zwei, einer);
});

// ---------------------------------------------------- Determinismus

test('Simulation ist deterministisch über zwei Durchläufe', () => {
  const run = () => {
    const w = createWorld({ seed: 777 });
    const halle = w.entities.find((e) => e.player === 0);
    const baum = w.entities.find((e) => e.player === 1);
    issue(w, { type: 'produce', player: 0, id: halle.id, unit: 'soldat' });
    issue(w, { type: 'produce', player: 1, id: baum.id, unit: 'wolf' });
    issue(w, { type: 'build', player: 0, building: 'schmiede', x: 4200, y: 3000 });
    issue(w, { type: 'build', player: 1, building: 'hain', x: 14000, y: 15500 });
    for (let i = 0; i < 500; i++) {
      if (i === 150) {
        const ids = w.entities.filter((e) => e.kind === 'unit').map((e) => e.id);
        issue(w, { type: 'move', player: 0, ids, x: 10000, y: 10000 });
      }
      step(w);
    }
    return hash(w);
  };
  assert.equal(run(), run());
});

test('Verlust des Hauptgebäudes beendet die Partie', () => {
  const w = bare();
  const baum = spawnBuilding(w, 1, 'herzbaum', 5000, 5000, true);
  baum.hp = 20;
  spawnUnit(w, 0, 'soeldner', 5300, 5000);
  for (let i = 0; i < 50; i++) step(w);
  assert.equal(w.over, true);
  assert.equal(w.winner, 0);
});

test('Startkarte stellt beide Fraktionen auf', () => {
  const w = createWorld();
  assert.ok(w.entities.find((e) => e.type === 'halle'));
  assert.ok(w.entities.find((e) => e.type === 'herzbaum'));
  assert.ok(w.deposits.some((d) => d.kind === 'goetterblut'));
});

// ---------------------------------------------------- Mindestfluss

test('überbuchte Domäne: Fabriken bekommen trotzdem den Mindestfluss', () => {
  // Thingstätte liefert 24, zwei Sägewerke wollen 28 Segen -- ohne
  // Mindestfluss bliebe für die arbeitende Kaserne nichts.
  const w = bare();
  spawnBuilding(w, 0, 'halle', 5000, 5000, true);
  spawnBuilding(w, 0, 'saege', 5000, 6000, true);
  spawnBuilding(w, 0, 'saege', 6000, 5000, true);
  const kas = spawnBuilding(w, 0, 'kaserne', 4000, 5000, true);
  kas.queue.push('soldat');
  computeRegions(w);
  distributeGegenwart(w);
  assert.ok(kas.powered > 0, 'Werk steht nicht still');
});

test('Baustellen ziehen keine Gegenwart -- auch eine Quelle entsteht in überbuchter Domäne', () => {
  const w = bare();
  spawnBuilding(w, 0, 'halle', 5000, 5000, true);
  const s1 = spawnBuilding(w, 0, 'saege', 5000, 6000, true);
  spawnBuilding(w, 0, 'saege', 6000, 5000, true);
  computeRegions(w);
  distributeGegenwart(w);
  const vorher = s1.powered;
  const schmiede = spawnBuilding(w, 0, 'schmiede', 4000, 5000, false);
  computeRegions(w);
  distributeGegenwart(w);
  assert.equal(s1.powered, vorher, 'die Baustelle nimmt niemandem etwas');
  erbauerDaneben(w, schmiede);
  for (let i = 0; i < BUILDINGS.schmiede.buildTime + 2; i++) step(w);
  assert.equal(schmiede.done, true, 'der Erbauer baut sie fertig');
});

test('ohne Überbuchung ändert der Mindestfluss nichts an der Leiter', () => {
  const w = bare();
  spawnBuilding(w, 0, 'grenzstein', 5000, 5000, true);
  spawnBuilding(w, 0, 'schmiede', 5800, 5000, true);
  const saege = spawnBuilding(w, 0, 'saege', 5000, 5800, true);
  computeRegions(w);
  distributeGegenwart(w);
  assert.equal(saege.powered, 1000);
});

// ---------------------------------------------------- Baustellen

test('Schaden an einer Baustelle bleibt bestehen', () => {
  const w = bare();
  spawnBuilding(w, 0, 'grenzstein', 5000, 5000, true);
  spawnBuilding(w, 0, 'schmiede', 5800, 5000, true);
  const b = spawnBuilding(w, 0, 'kaserne', 6000, 5800, false);
  erbauerDaneben(w, b);
  for (let i = 0; i < 20; i++) step(w);
  const vorher = b.hp;
  b.hp -= 100;
  step(w);
  assert.ok(b.hp < vorher, `Schaden heilt nicht weg: ${vorher} -> ${b.hp}`);
});

test('eine unbeschädigte Baustelle ist bei Fertigstellung voll', () => {
  const w = bare();
  spawnBuilding(w, 0, 'grenzstein', 5000, 5000, true);
  spawnBuilding(w, 0, 'schmiede', 5800, 5000, true);
  const b = spawnBuilding(w, 0, 'kaserne', 6000, 5800, false);
  erbauerDaneben(w, b);
  for (let i = 0; i < BUILDINGS.kaserne.buildTime + 2; i++) step(w);
  assert.equal(b.done, true);
  assert.equal(b.hp, BUILDINGS.kaserne.hp);
});

// ---------------------------------------------------- KI

test('beide KIs bauen eine Wirtschaft und beide Einheitentypen', () => {
  // Mit Goetterblut im Vorrat: prueft die Produktionslogik, nicht das
  // Rennen um die Adern (das misst tools/sweep.mjs).
  const w = createWorld({ seed: 4242 });
  for (const p of w.players) p.goetterblut = 200;
  const ais = [createAI(0, 1), createAI(1, 2)];
  const typen = [new Set(), new Set()];
  for (let i = 0; i < 600 * 12 && !w.over; i++) {
    stepAI(ais[0], w);
    stepAI(ais[1], w);
    step(w);
    for (const e of w.entities) if (e.kind === 'unit' && !UNITS[e.type].commander) typen[e.player].add(e.type);
  }
  for (let p = 0; p < 2; p++) {
    assert.ok(typen[p].size >= 2, `Spieler ${p} baut mehr als einen Typ: ${[...typen[p]]}`);
  }
});

test('KI-Partie ist deterministisch', () => {
  const run = () => {
    const w = createWorld({ seed: 99 });
    const ais = [createAI(0, 5), createAI(1, 6)];
    for (let i = 0; i < 3000; i++) {
      stepAI(ais[0], w);
      stepAI(ais[1], w);
      step(w);
    }
    return hash(w);
  };
  assert.equal(run(), run());
});

// ---------------------------------------------------- Unterhalt

test('Unterhalt: jede lebende Einheit kostet laufend Fron', () => {
  const w = bare();
  w.players[0].fron = 1000;
  spawnUnit(w, 0, 'soldat', 3000, 3000);
  spawnUnit(w, 0, 'jaeger', 3100, 3000);
  const proMin = UNITS.soldat.unterhalt + UNITS.jaeger.unterhalt;
  assert.equal(unterhaltProMin(w, 0), proMin);
  for (let i = 0; i < 600; i++) step(w);
  assert.equal(w.players[0].fron, 1000 - proMin, 'nach einer Minute genau ein Minutenunterhalt');
  assert.equal(w.players[1].fron, bare().players[1].fron, 'der andere Spieler zahlt nichts');
});

test('Unterhalt: Fron faellt nicht unter null, die Einheiten bleiben', () => {
  const w = bare();
  w.players[0].fron = 5;
  const u = spawnUnit(w, 0, 'soldat', 3000, 3000);
  for (let i = 0; i < 1200; i++) step(w);
  assert.equal(w.players[0].fron, 0);
  assert.ok(!u.dead);
});

test('Unterhalt: jede Einheit hat einen, Kommandanten ausgenommen', () => {
  for (const [typ, d] of Object.entries(UNITS)) {
    if (d.commander) assert.ok(!d.unterhalt, typ + ' kostet keinen Unterhalt');
    else assert.ok(d.unterhalt > 0, typ + ' hat Unterhalt');
  }
});

// ---------------------------------------------------- Erfahrung

test('Erfahrung waechst je volle Minute und ist gedeckelt', () => {
  const w = bare();
  const u = spawnUnit(w, 0, 'soldat', 3000, 3000);
  assert.equal(erfahrung(w, u), 0);
  w.tick += 599;
  assert.equal(erfahrung(w, u), 0, 'erst nach einer vollen Minute');
  w.tick += 1;
  assert.equal(erfahrung(w, u), RULES.erfahrungProMin);
  w.tick += 600 * 1000;
  assert.equal(erfahrung(w, u), RULES.erfahrungMax);
});

test('Erfahrung: Baustellen haben keine, Gebaeude zaehlen ab Bauende', () => {
  const w = bare();
  const b = spawnBuilding(w, 0, 'grenzstein', 3000, 3000, false);
  w.tick += 6000;
  assert.equal(erfahrung(w, b), 0);
  b.done = true;
  b.doneAt = w.tick;
  w.tick += 1200;
  assert.equal(erfahrung(w, b), 2 * RULES.erfahrungProMin);
});

// Ein Schlag: Wolf gegen Soldat, beide wahlweise erfahren.
function erfahrenesGefecht(wolfAlt, soldatAlt) {
  const w = bare('gott', 'mensch');
  w.tick = 600 * 50;
  const wolf = spawnUnit(w, 0, 'wolf', 5000, 5000);
  const soldat = spawnUnit(w, 1, 'soldat', 5060, 5000); // Beruehrung
  soldat.cooldown = 1e9; // schlaegt nicht zurueck
  if (wolfAlt) wolf.seit = 0;
  if (soldatAlt) soldat.seit = 0;
  const hp = soldat.hp;
  step(w);
  return hp - soldat.hp;
}

test('Erfahrung: ein alter Wolf trifft haerter, ein alter Soldat steckt mehr weg', () => {
  const d = UNITS.wolf.weapon.damage;
  const m = RULES.erfahrungMax;
  assert.equal(erfahrenesGefecht(false, false), d);
  assert.equal(erfahrenesGefecht(true, false), ((d * (1000 + m)) / 1000) | 0);
  assert.equal(erfahrenesGefecht(false, true), ((d * (1000 - m)) / 1000) | 0);
});

// ---------------------------------------------------- Skillbaum

test('Skillpunkte: einer zu Beginn, dann einer je Takt', () => {
  const w = bare();
  assert.equal(skillPunkte(w, 0), RULES.skillStart);
  for (let i = 0; i < RULES.skillTakt * 3 - 1; i++) step(w);
  assert.equal(skillPunkte(w, 0), RULES.skillStart + 2);
  step(w);
  assert.equal(skillPunkte(w, 0), RULES.skillStart + 3);
});

test('Forschung: ein versorgtes Forschungsgebaeude bringt Skillpunkte schneller', () => {
  const zeit = (mit) => {
    const w = bare();
    spawnBuilding(w, 0, 'halle', 5000, 5000, true);
    spawnBuilding(w, 0, 'schmiede', 5800, 5000, true);
    if (mit) spawnBuilding(w, 0, 'skriptorium', 4200, 5000, true);
    let t = 0;
    while (skillPunkte(w, 0) < RULES.skillStart + 2) {
      step(w);
      t++;
    }
    return t;
  };
  const ohne = zeit(false);
  assert.equal(ohne, RULES.skillTakt * 2);
  const f = BUILDINGS.skriptorium.forschung;
  assert.equal(zeit(true), Math.ceil((RULES.skillTakt * 2 * 1000) / (1000 + f)));
});

test('Forschung: ohne Gegenwart forscht niemand', () => {
  const w = bare();
  spawnBuilding(w, 0, 'skriptorium', 15000, 15000, true); // weit weg von jeder Domaene
  for (let i = 0; i < RULES.skillTakt; i++) step(w);
  assert.equal(skillPunkte(w, 0), RULES.skillStart + 1, 'nur der Grundtakt');
});

test('Skillbaum: jede Fraktion hat alle vier Aeste, Voraussetzungen gibt es', () => {
  for (const f of ['mensch', 'gott']) {
    const eigene = Object.entries(SKILLS).filter(([, sk]) => sk.faction === f);
    for (const ast of ['einheiten', 'gebaeude', 'verbesserung', 'kommandant']) {
      assert.ok(eigene.some(([, sk]) => sk.ast === ast), f + ' hat den Ast ' + ast);
    }
    for (const [id, sk] of eigene) {
      for (const b of sk.braucht || []) assert.equal(SKILLS[b]?.faction, f, id + ' braucht einen eigenen Skill');
      if (sk.faehigkeit) assert.ok(FAEHIGKEITEN[sk.faehigkeit], id + ': Faehigkeit fehlt');
    }
  }
});

test('Skillbaum: Gesperrtes laesst sich weder ausbilden noch bauen, gelernt schon', () => {
  const w = bare();
  w.players[0].fron = 5000;
  const kas = spawnBuilding(w, 0, 'kaserne', 5000, 5000, true);
  assert.ok(gesperrt(w, 0, 'jaeger'));
  assert.ok(!gesperrt(w, 0, 'soldat'), 'Soldaten sind von Anfang an da');
  issue(w, { type: 'produce', player: 0, id: kas.id, unit: 'jaeger' });
  step(w);
  assert.equal(kas.queue.length, 0);
  assert.equal(tryPlace(w, 0, 'banner', 7000, 5000), null, 'Banner gesperrt');

  issue(w, { type: 'lernen', player: 0, skill: 'bogenbau' });
  step(w);
  assert.ok(!gesperrt(w, 0, 'jaeger'));
  issue(w, { type: 'produce', player: 0, id: kas.id, unit: 'jaeger' });
  step(w);
  assert.equal(kas.queue.length, 1);
});

test('Skillbaum: Lernen kostet Punkte, braucht Voraussetzungen, nur einmal', () => {
  const w = bare();
  assert.ok(!kannLernen(w, 0, 'soeldnervertraege'), 'braucht Bogenbau');
  assert.ok(!kannLernen(w, 0, 'waldgeister'), 'fremde Fraktion');
  issue(w, { type: 'lernen', player: 0, skill: 'bogenbau' });
  step(w);
  assert.equal(skillFrei(w, 0), RULES.skillStart - SKILLS.bogenbau.kosten);
  assert.ok(!kannLernen(w, 0, 'bogenbau'), 'nicht doppelt');
  issue(w, { type: 'lernen', player: 0, skill: 'klingen' });
  step(w);
  assert.deepEqual(w.players[0].gelernt, ['bogenbau'], 'ohne Punkte nichts');
});

test('Skillbaum: Verbesserungen wirken auf Schaden, Foerderung und Unterhalt', () => {
  // Schaden: Wolf mit Scharfen Faengen
  const ohne = erfahrenesGefecht(false, false);
  const w = bare('gott', 'mensch');
  w.players[0].gelernt.push('faenge');
  const wolf = spawnUnit(w, 0, 'wolf', 5000, 5000);
  const soldat = spawnUnit(w, 1, 'soldat', 5060, 5000); // Beruehrung
  soldat.cooldown = 1e9;
  const hp = soldat.hp;
  step(w);
  assert.equal(hp - soldat.hp, ((ohne * (1000 + SKILLS.faenge.wirkung.schaden)) / 1000) | 0);
  assert.ok(wolf);

  // Unterhalt: Sold und Ordnung
  const u = bare();
  u.players[0].gelernt.push('sold');
  u.players[0].fron = 1000;
  for (let i = 0; i < 4; i++) spawnUnit(u, 0, 'soldat', 3000 + i * 100, 3000);
  for (let i = 0; i < 600; i++) step(u);
  const voll = 4 * UNITS.soldat.unterhalt;
  assert.equal(1000 - u.players[0].fron, ((voll * (1000 - SKILLS.sold.wirkung.unterhalt)) / 1000) | 0);
});

test('Schlachtruf: eigene Einheiten nahe dem Helden schlagen haerter, dann klingt er ab', () => {
  const w = bare();
  spawnBuilding(w, 0, 'halle', 3000, 3000, true);
  spawnKommandant(w, 0);
  const held = w.entities.find((e) => e.type === 'held');
  w.players[0].gelernt.push('heldenmut', 'schlachtruf');
  const nah = spawnUnit(w, 0, 'soldat', held.x + 200, held.y);
  const fern = spawnUnit(w, 0, 'soldat', held.x + 5000, held.y);
  issue(w, { type: 'faehigkeit', player: 0, x: 0, y: 0 });
  step(w);
  const f = FAEHIGKEITEN.schlachtruf;
  assert.ok(nah.rufBis > w.tick && nah.rufWert === f.wert);
  assert.equal(fern.rufBis, 0);
  const bereit = w.players[0].faehigkeitBereit;
  issue(w, { type: 'faehigkeit', player: 0, x: 0, y: 0 });
  step(w);
  assert.equal(w.players[0].faehigkeitBereit, bereit, 'waehrend des Abklingens wirkungslos');
});

test('Wurzelgriff: Feinde im Umkreis bleiben stehen, aber nur in Reichweite', () => {
  const w = bare('gott', 'mensch');
  spawnBuilding(w, 0, 'herzbaum', 3000, 3000, true);
  spawnKommandant(w, 0);
  const gott = w.entities.find((e) => e.type === 'waldgott');
  w.players[0].gelernt.push('rinde', 'wurzelgriff');
  gott.cooldown = 1e9; // schlaegt nicht zu -- hier geht es um die Bewegung
  const ziel = { x: gott.x + 1300, y: gott.y };
  const feind = spawnUnit(w, 1, 'soldat', ziel.x, ziel.y);
  feind.cooldown = 1e9;
  issue(w, { type: 'move', player: 1, ids: [feind.id], x: ziel.x + 3000, y: ziel.y });
  issue(w, { type: 'faehigkeit', player: 0, x: ziel.x, y: ziel.y });
  step(w);
  const x = feind.x;
  for (let i = 0; i < 20; i++) step(w);
  assert.equal(feind.x, x, 'festgehalten');
  for (let i = 0; i < FAEHIGKEITEN.wurzelgriff.dauer; i++) step(w);
  assert.ok(feind.x > x, 'danach geht es weiter');

  const w2 = bare('gott', 'mensch');
  spawnBuilding(w2, 0, 'herzbaum', 3000, 3000, true);
  spawnKommandant(w2, 0);
  w2.players[0].gelernt.push('rinde', 'wurzelgriff');
  issue(w2, { type: 'faehigkeit', player: 0, x: 15000, y: 15000 });
  step(w2);
  assert.equal(w2.players[0].faehigkeitBereit, 0, 'ausser Reichweite wirkungslos');
});

test('ohne Skillbaum (RULES.skills aus) ist alles frei', () => {
  const vorher = RULES.skills;
  RULES.skills = false;
  try {
    const w = bare();
    assert.ok(!gesperrt(w, 0, 'soeldner'));
    assert.ok(!gesperrt(w, 0, 'banner'));
    assert.equal(skillPunkte(w, 0), 0);
  } finally {
    RULES.skills = vorher;
  }
});

// ---------------------------------------------------- Abriss

test('Abriss erstattet Kosten und gibt die Ader frei', () => {
  const w = bare();
  spawnBuilding(w, 0, 'halle', 5000, 5000, true);
  w.deposits.push({ x: 5000, y: 6200, kind: 'fron', takenBy: 0 });
  const vorher = w.players[0].fron;
  const s = tryPlace(w, 0, 'saege', 5000, 6200);
  assert.equal(w.players[0].fron, vorher - BUILDINGS.saege.cost.fron);
  issue(w, { type: 'demolish', player: 0, id: s.id });
  step(w);
  assert.equal(w.entities.includes(s), false, 'Gebäude ist weg');
  assert.equal(w.deposits[0].takenBy, 0, 'Ader wieder frei');
  const zurueck = ((BUILDINGS.saege.cost.fron * 750) / 1000) | 0;
  assert.equal(w.players[0].fron, vorher - BUILDINGS.saege.cost.fron + zurueck, 'Baustelle bringt drei Viertel zurück');
});

test('Hauptgebäude und fremde Gebäude lassen sich nicht abreißen', () => {
  const w = bare();
  const halle = spawnBuilding(w, 0, 'halle', 5000, 5000, true);
  const hain = spawnBuilding(w, 1, 'hain', 12000, 12000, true);
  issue(w, { type: 'demolish', player: 0, id: halle.id });
  issue(w, { type: 'demolish', player: 0, id: hain.id });
  step(w);
  assert.ok(w.entities.includes(halle));
  assert.ok(w.entities.includes(hain));
  assert.equal(w.over, false);
});

// ---------------------------------------------------- Fremder Boden

test('Malus in fremder Domäne wirkt nur, wenn eingeschaltet', () => {
  const gefecht = () => {
    const w = bare();
    spawnBuilding(w, 1, 'hain', 4300, 5000, true); // Gott-Domäne, Hain außer Reichweite
    const lw = spawnUnit(w, 0, 'soldat', 5100, 5000); // Mensch steht darin
    const ziel = spawnUnit(w, 1, 'dryade', 5160, 5000); // Beruehrung
    assert.equal(inForeignDomain(w, 0, lw.x, lw.y), true);
    const hp = ziel.hp;
    step(w);
    return hp - ziel.hp;
  };
  const alt = RULES.fremdMalus;
  try {
    RULES.fremdMalus = 1000;
    const voll = gefecht();
    RULES.fremdMalus = 500;
    const halb = gefecht();
    assert.equal(voll, UNITS.soldat.weapon.damage);
    assert.equal(halb, (UNITS.soldat.weapon.damage * 500 / 1000) | 0);
  } finally {
    RULES.fremdMalus = alt;
  }
});

// ---------------------------------------------------- Nah- und Fernkampf

test('Nahkampf trifft erst bei Beruehrung, Fernkampf aus der Ferne', () => {
  // Wolf und Soldat 2 m Rand zu Rand zu weit fuer einen Schlag, Jaeger trifft von weit.
  const w = bare('gott', 'mensch');
  const wolf = spawnUnit(w, 0, 'wolf', 5000, 5000);
  wolf.cooldown = 1e9; // schlaegt nicht -- hier zaehlt nur, wer trifft
  wolf.arrived = false; // und jagt nicht
  wolf.tx = wolf.x;
  wolf.ty = wolf.y;
  const abstand = UNITS.wolf.radius + UNITS.soldat.radius + UNITS.soldat.weapon.range + 30;
  const soldat = spawnUnit(w, 1, 'soldat', 5000 + abstand, 5000);
  soldat.arrived = false; // jagt nicht, steht nur da
  soldat.tx = soldat.x;
  soldat.ty = soldat.y;
  const jaeger = spawnUnit(w, 1, 'jaeger', 5000, 5000 + UNITS.jaeger.weapon.range + 40);
  jaeger.arrived = false;
  jaeger.tx = jaeger.x;
  jaeger.ty = jaeger.y;
  const hp = wolf.hp;
  step(w);
  assert.equal(hp - wolf.hp, UNITS.jaeger.weapon.damage, 'nur der Jaeger trifft');
  assert.equal(UNITS.soldat.kampf, 'nah');
  assert.equal(UNITS.jaeger.kampf, 'fern');
});

test('jede Einheit ist Nah- oder Fernkaempfer, jede Fraktion hat beides', () => {
  for (const f of ['mensch', 'gott']) {
    const arten = new Set(Object.values(UNITS).filter((u) => u.faction === f).map((u) => u.kampf));
    assert.deepEqual([...arten].sort(), ['fern', 'nah'], f);
  }
  for (const [typ, u] of Object.entries(UNITS)) assert.ok(u.kampf === 'nah' || u.kampf === 'fern', typ);
});

// ---------------------------------------------------- Verteidigung

function turmGefecht(versorgt) {
  const w = bare();
  if (versorgt) spawnBuilding(w, 0, 'halle', 5000, 5000, true);
  const turm = spawnBuilding(w, 0, 'wachturm', 6000, 5000, true);
  const wolf = spawnUnit(w, 1, 'wolf', 6000 + BUILDINGS.wachturm.radius + UNITS.wolf.radius + 400, 5000);
  wolf.arrived = false;
  wolf.tx = wolf.x;
  wolf.ty = wolf.y;
  const hp = wolf.hp;
  step(w);
  return { schaden: hp - wolf.hp, turm };
}

test('der Wachturm schiesst auf Feinde in Reichweite, solange er Gegenwart hat', () => {
  const { schaden, turm } = turmGefecht(true);
  assert.equal(turm.powered, 1000);
  assert.equal(schaden, BUILDINGS.wachturm.weapon.damage);
});

test('ohne Gegenwart schweigt der Wachturm', () => {
  const { schaden, turm } = turmGefecht(false);
  assert.equal(turm.powered, 0);
  assert.equal(schaden, 0);
});

/** Ein versorgter Wachturm gegen n Soldaten im Angriff: haelt er? */
function turmGegen(n) {
  const w = bare();
  spawnBuilding(w, 0, 'halle', 5000, 5000, true);
  const turm = spawnBuilding(w, 0, 'wachturm', 7000, 5000, true);
  const ids = [];
  for (let i = 0; i < n; i++) ids.push(spawnUnit(w, 1, 'soldat', 9500 + (i % 3) * 80, 4600 + ((i / 3) | 0) * 70).id);
  issue(w, { type: 'attack', player: 1, ids, x: turm.x, y: turm.y });
  for (let t = 0; t < 3000 && !turm.dead && w.entities.some((e) => !e.dead && e.player === 1); t++) step(w);
  return !turm.dead;
}

test('ein Turm haelt allein eine fruehe Welle auf, aber keine doppelte', () => {
  // 13 Soldaten sind knapp 600 Fron -- eine fruehe Welle.
  assert.ok(turmGegen(13), 'haelt 13 Soldaten');
  assert.ok(!turmGegen(26), 'faellt gegen 26');
});

// ---------------------------------------------------- Reparatur

function beschaedigt() {
  const w = bare();
  spawnBuilding(w, 0, 'halle', 5000, 5000, true);
  const turm = spawnBuilding(w, 0, 'wachturm', 6500, 5000, true);
  turm.hp = 1000;
  w.players[0].fron = 1000;
  return { w, turm };
}

test('Reparatur: ein Erbauer daneben gibt Leben zurueck und kostet Fron', () => {
  const { w, turm } = beschaedigt();
  erbauerDaneben(w, turm, 'held');
  for (let i = 0; i < 100; i++) step(w);
  const lp = turm.hp - 1000;
  assert.equal(lp, 100 * RULES.reparaturProTick, 'volle Baukraft: reparaturProTick je Tick');
  assert.equal(w.players[0].fron, 1000 - ((lp / RULES.reparaturLpJeFron) | 0));
});

test('Reparatur: ohne Erbauer daneben keine, und wer weggeht, hoert auf', () => {
  const { w, turm } = beschaedigt();
  for (let i = 0; i < 100; i++) step(w);
  assert.equal(turm.hp, 1000, 'heilt nicht von selbst');
  const k = erbauerDaneben(w, turm, 'held');
  for (let i = 0; i < 20; i++) step(w);
  const stand = turm.hp;
  assert.ok(stand > 1000);
  issue(w, { type: 'move', player: 0, ids: [k.id], x: 4000, y: 5000 });
  for (let i = 0; i < 100; i++) step(w);
  assert.equal(turm.hp, stand);
});

test('Reparatur: ohne Fron keine, und bei vollem Leben ist der Auftrag erledigt', () => {
  const { w, turm } = beschaedigt();
  w.players[0].fron = 0;
  const k = erbauerDaneben(w, turm, 'held');
  for (let i = 0; i < 50; i++) step(w);
  assert.equal(turm.hp, 1000, 'ohne Fron');
  w.players[0].fron = 1000;
  for (let i = 0; i < 2000 && k.auftrag; i++) step(w);
  assert.equal(turm.hp, turm.maxHp);
  assert.equal(k.auftrag, 0, 'Auftrag erledigt');
});

test('jede Fraktion hat Hauptgebaeude, Anker, Verteidigung, Gegenwart, Fron, Goetterblut, Fabrik, zwei Schreine, Forschung', () => {
  for (const f of ['mensch', 'gott']) {
    const b = Object.values(BUILDINGS).filter((d) => d.faction === f);
    const hat = (p) => b.filter(p).length;
    assert.equal(hat((d) => d.vital), 1, f + ' Hauptgebaeude');
    assert.equal(hat((d) => d.anchor && !d.vital), 1, f + ' Anker');
    assert.equal(hat((d) => d.weapon), 1, f + ' Verteidigung');
    assert.equal(hat((d) => d.gegenwartOut && !d.vital), 1, f + ' Gegenwart');
    assert.equal(hat((d) => d.fronOut), 1, f + ' Fron');
    assert.equal(hat((d) => d.blutOut), 1, f + ' Goetterblut');
    assert.equal(hat((d) => d.buildList && !d.vital), 1, f + ' Fabrik');
    assert.equal(hat((d) => d.buff && d.buff.zorn), 1, f + ' Zorn-Schrein');
    assert.equal(hat((d) => d.buff && d.buff.wehr), 1, f + ' Wehr-Schrein');
    assert.equal(hat((d) => d.forschung), 1, f + ' Forschung');
  }
});

// ---------------------------------------------------- Götterblut

function blutWelt() {
  const w = bare();
  spawnBuilding(w, 0, 'halle', 5000, 5000, true);
  spawnBuilding(w, 0, 'schmiede', 5800, 5000, true);
  w.deposits.push({ x: 5000, y: 6500, kind: 'goetterblut', takenBy: 0 });
  return w;
}

test('ein Blutschacht in versorgter Domäne fördert blutOut pro Minute', () => {
  const w = blutWelt();
  const s = spawnBuilding(w, 0, 'schacht', 5000, 6500, true);
  w.deposits[0].takenBy = s.id;
  for (let i = 0; i < 600; i++) step(w);
  assert.equal(w.players[0].goetterblut, BUILDINGS.schacht.blutOut);
});

test('ein Blutschacht außerhalb jeder Domäne fördert nichts', () => {
  const w = bare();
  spawnBuilding(w, 0, 'halle', 5000, 5000, true);
  spawnBuilding(w, 0, 'schacht', 14000, 14000, true);
  for (let i = 0; i < 600; i++) step(w);
  assert.equal(w.players[0].goetterblut, 0);
});

test('der Schacht steht nur auf einer Götterblut-Ader', () => {
  const w = blutWelt();
  assert.equal(tryPlace(w, 0, 'schacht', 7000, 7000), null, 'ohne Ader kein Schacht');
  const s = tryPlace(w, 0, 'schacht', 5100, 6400);
  assert.ok(s, 'nahe der Ader rastet er ein');
  assert.equal(s.x, 5000);
  assert.equal(s.y, 6500);
});

test('schwere Einheiten brauchen Götterblut', () => {
  const w = bare();
  w.players[0].gelernt.push('bogenbau', 'soeldnervertraege');
  const kas = spawnBuilding(w, 0, 'kaserne', 5000, 5000, true);
  w.players[0].fron = 5000;
  issue(w, { type: 'produce', player: 0, id: kas.id, unit: 'soeldner' });
  step(w);
  assert.equal(kas.queue.length, 0, 'ohne Götterblut kein Söldner');

  w.players[0].goetterblut = UNITS.soeldner.cost.goetterblut;
  const fron = w.players[0].fron;
  issue(w, { type: 'produce', player: 0, id: kas.id, unit: 'soeldner' });
  step(w);
  assert.equal(kas.queue.length, 1);
  assert.equal(w.players[0].goetterblut, 0);
  assert.equal(w.players[0].fron, fron - UNITS.soeldner.cost.fron);
});

test('Abriss erstattet auch das Götterblut wartender Aufträge', () => {
  const w = bare();
  spawnBuilding(w, 0, 'halle', 5000, 5000, true);
  const kas = spawnBuilding(w, 0, 'kaserne', 6000, 5000, true);
  w.players[0].fron = 5000;
  w.players[0].goetterblut = 30;
  issue(w, { type: 'produce', player: 0, id: kas.id, unit: 'soeldner' });
  step(w);
  issue(w, { type: 'demolish', player: 0, id: kas.id });
  step(w);
  assert.equal(w.players[0].goetterblut, 30);
});

// ---------------------------------------------------- Fairness

test('Kampf ist gleichzeitig: kein Erstschlag durch Listenplatz', () => {
  const w = bare('mensch', 'mensch');
  const a = spawnUnit(w, 0, 'soldat', 5000, 5000);
  const b = spawnUnit(w, 1, 'soldat', 5060, 5000); // Beruehrung
  a.hp = UNITS.soldat.weapon.damage; // stirbt am ersten Treffer
  b.hp = UNITS.soldat.weapon.damage;
  step(w);
  assert.equal(a.dead, true);
  assert.equal(b.dead, true, 'beide treffen im selben Tick');
});

test('Befehle reihum: umkaempfte Adern gehen abwechselnd an beide Sitzplaetze', () => {
  // Zwei Gleichstaende in derselben Partie, beide in geraden Ticks -- so wie
  // die KI handelt. Der Vorrang muss trotzdem wechseln.
  const w = bare('mensch', 'mensch');
  spawnBuilding(w, 0, 'halle', 5000, 5000, true);
  spawnBuilding(w, 1, 'halle', 15000, 15000, true);
  w.deposits.push({ x: 9000, y: 9000, kind: 'fron', takenBy: 0 }, { x: 11000, y: 11000, kind: 'fron', takenBy: 0 });
  const sieger = [];
  for (const [x, y] of [[9000, 9000], [11000, 11000]]) {
    while (w.tick % 2) step(w);
    issue(w, { type: 'build', player: 0, building: 'saege', x, y });
    issue(w, { type: 'build', player: 1, building: 'saege', x, y });
    step(w);
    sieger.push(w.entities.find((e) => e.type === 'saege' && e.x === x).player);
  }
  assert.deepEqual(sieger.sort(), [0, 1]);
});

test('Spiegelpartie bleibt punktsymmetrisch, bis eine geteilte Ader umkämpft ist', () => {
  // Gleiche Fraktion, gleicher KI-Seed: Spieler 1 muss Spieler 0 spiegeln.
  // Bricht das frueher, hat ein Sitzplatz einen eingebauten Vorteil.
  const w = createWorld({ factions: ['mensch', 'mensch'], seed: 5 });
  const ais = [createAI(0, 7), createAI(1, 7)];
  const lage = (p, spiegel) =>
    w.entities
      .filter((e) => e.player === p)
      .map((e) => `${e.type}:${spiegel ? MAP - e.x : e.x},${spiegel ? MAP - e.y : e.y}:${e.hp}`)
      .sort()
      .join(' ');
  // Bis zum ersten Zugriff auf eine Goetterblut-Ader: Die Adern liegen auf
  // der Spiegelachse, wer sie zuerst belegt, bricht die Symmetrie zu Recht.
  const belegt = () => w.deposits.some((d) => d.kind === 'goetterblut' && d.takenBy !== 0);
  let ticks = 0;
  while (ticks < 9000) {
    const vorher = { a: lage(0, false), b: lage(1, true), f0: w.players[0].fron, f1: w.players[1].fron };
    stepAI(ais[0], w);
    stepAI(ais[1], w);
    step(w);
    ticks++;
    if (belegt()) {
      assert.equal(vorher.b, vorher.a, 'Lage bis Tick ' + (ticks - 1));
      assert.equal(vorher.f1, vorher.f0);
      break;
    }
    assert.equal(lage(1, true), lage(0, false), 'Lage in Tick ' + ticks);
  }
  assert.ok(ticks > 1500, 'lange genug symmetrisch verglichen: ' + ticks + ' Ticks');
});

// ---------------------------------------------------- Verfolgung

test('eine stehende Einheit verfolgt einen Feind knapp außer Reichweite', () => {
  const w = bare();
  const lw = spawnUnit(w, 0, 'soldat', 5000, 5000);
  const ziel = spawnUnit(w, 1, 'dryade', 5000 + UNITS.soldat.weapon.range + 400, 5000);
  for (let i = 0; i < 60; i++) step(w);
  assert.ok(lw.x > 5000, 'geht auf den Feind zu');
  assert.ok(ziel.hp < ziel.maxHp || ziel.dead, 'und trifft ihn');
});

test('Verfolgung endet an der Leine und führt zum Befehlspunkt zurück', () => {
  const w = bare();
  const lw = spawnUnit(w, 0, 'soldat', 5000, 5000);
  // Steht weit vom Befehlspunkt: wird nicht verfolgt.
  spawnUnit(w, 1, 'dryade', 5000 + 1500 + UNITS.soldat.weapon.range + 300, 5000);
  for (let i = 0; i < 60; i++) step(w);
  assert.equal(lw.x, 5000);
  assert.equal(lw.y, 5000);
});

test('ein Bewegungsbefehl hat Vorrang vor der Verfolgung', () => {
  const w = bare();
  const lw = spawnUnit(w, 0, 'soldat', 5000, 5000);
  spawnUnit(w, 1, 'dryade', 5000, 5000 + UNITS.soldat.weapon.range + 300);
  issue(w, { type: 'move', player: 0, ids: [lw.id], x: 9000, y: 5000 });
  for (let i = 0; i < 20; i++) step(w);
  assert.equal(lw.y, 5000, 'läuft geradeaus weiter');
  assert.ok(lw.x > 5000);
});

test('eine Angriffsbewegung stellt Feinde unterwegs und zieht danach weiter', () => {
  const w = bare();
  const lw = spawnUnit(w, 0, 'soldat', 5000, 5000);
  const ziel = spawnUnit(w, 1, 'dryade', 5000, 5000 + UNITS.soldat.weapon.range + 300);
  ziel.cooldown = 1e9; // wehrt sich nicht -- hier geht es um die Bewegung
  ziel.hp = 120;
  issue(w, { type: 'attack', player: 0, ids: [lw.id], x: 9000, y: 5000 });
  for (let i = 0; i < 20; i++) step(w);
  assert.ok(lw.y > 5000, 'weicht zum Feind ab');
  for (let i = 0; i < 600 && !ziel.dead; i++) step(w);
  assert.equal(ziel.dead, true, 'der Feind fällt');
  for (let i = 0; i < 600; i++) step(w);
  assert.equal(lw.x, 9000, 'und das Ziel wird noch erreicht');
  assert.equal(lw.y, 5000);
});

// ---------------------------------------------------- Gebäude als Hindernis

test('Einheiten laufen um Gebäude herum statt hindurch', () => {
  const w = bare();
  const b = spawnBuilding(w, 0, 'kaserne', 6000, 5000, true);
  const lw = spawnUnit(w, 0, 'soldat', 5000, 5000);
  issue(w, { type: 'move', player: 0, ids: [lw.id], x: 7000, y: 5000 });
  const min = BUILDINGS.kaserne.radius + UNITS.soldat.radius;
  let drin = 0;
  for (let i = 0; i < 200; i++) {
    step(w);
    if (dist2(lw.x, lw.y, b.x, b.y) < (min - 2) * (min - 2)) drin++;
  }
  assert.equal(drin, 0, 'nie im Gebäude');
  assert.equal(lw.x, 7000, 'kommt trotzdem an');
  assert.equal(lw.y, 5000);
});

test('ein Ziel im Gebäude: Einheit bleibt am Rand stehen', () => {
  const w = bare();
  const b = spawnBuilding(w, 1, 'herzbaum', 6000, 5000, true);
  const lw = spawnUnit(w, 0, 'bauer', 5000, 5000);
  issue(w, { type: 'move', player: 0, ids: [lw.id], x: 6000, y: 5000 });
  for (let i = 0; i < 200; i++) step(w);
  const min = BUILDINGS.herzbaum.radius + UNITS.bauer.radius;
  const d = isqrt(dist2(lw.x, lw.y, b.x, b.y));
  assert.ok(d >= min - 2 && d <= min + UNITS.bauer.speed, `am Rand: ${d}`);
});

test('Ankerkraft: eingeschaltet spendet jeder Anker Gegenwart nach Radius', () => {
  const welt = () => {
    const w = bare();
    spawnBuilding(w, 0, 'grenzstein', 5000, 5000, true);
    computeRegions(w);
    distributeGegenwart(w);
    return w.regions[0].supply;
  };
  const alt = RULES.ankerKraft;
  try {
    RULES.ankerKraft = 0;
    assert.equal(welt(), 0, 'aus: ein Turm liefert nichts');
    RULES.ankerKraft = 2;
    assert.equal(welt(), ((FACTIONS.mensch.growth.start * 2) / 1000) | 0);
  } finally {
    RULES.ankerKraft = alt;
  }
});

test('ein Todesereignis nennt Art, Typ und Spieler', () => {
  const w = bare();
  spawnUnit(w, 0, 'soeldner', 5000, 5000);
  const opfer = spawnUnit(w, 1, 'dryade', 5070, 5000); // Beruehrung
  opfer.hp = 1;
  step(w);
  const ev = w.events.find((e) => e.t === 'died');
  assert.deepEqual([ev.kind, ev.type, ev.player], ['unit', 'dryade', 1]);
});

// ---------------------------------------------------- Kommandant

test('jeder Spieler beginnt mit genau einem Kommandanten seiner Fraktion', () => {
  const w = createWorld({ factions: ['mensch', 'gott'] });
  const k = w.entities.filter((e) => e.kind === 'unit' && UNITS[e.type].commander);
  assert.deepEqual(k.map((e) => [e.player, e.type]).sort(), [
    [0, FACTIONS.mensch.kommandant],
    [1, FACTIONS.gott.kommandant],
  ]);
});

test('der Kommandant baut seinen Auftrag auch außerhalb der Domäne', () => {
  const w = bare();
  spawnBuilding(w, 0, 'halle', 3000, 3000, true);
  const turm = tryPlace(w, 0, 'grenzstein', 12000, 12000);
  const k = spawnUnit(w, 0, 'held', 12200, 12000);
  issue(w, { type: 'bauen', player: 0, ids: [k.id], id: turm.id });
  for (let i = 0; i < BUILDINGS.grenzstein.buildTime + 10; i++) step(w);
  assert.equal(turm.done, true, 'fertig ohne Gegenwart, allein durch den Kommandanten');
  assert.equal(k.auftrag, 0, 'Auftrag erledigt');
});

test('ohne Auftrag baut ein Erbauer nichts, auch direkt daneben', () => {
  const w = bare();
  spawnBuilding(w, 0, 'halle', 3000, 3000, true);
  const turm = tryPlace(w, 0, 'grenzstein', 12000, 12000);
  spawnUnit(w, 0, 'held', 12100, 12000);
  for (let i = 0; i < 100; i++) step(w);
  assert.equal(turm.progress, 0);
});

test('ein Erbauer baut nur direkt daneben: erst hinlaufen, dann bauen', () => {
  const w = bare();
  spawnBuilding(w, 0, 'halle', 3000, 3000, true);
  const turm = tryPlace(w, 0, 'grenzstein', 12000, 12000);
  const b = spawnUnit(w, 0, 'bauer', 9000, 12000); // 300 m entfernt
  issue(w, { type: 'bauen', player: 0, ids: [b.id], id: turm.id });
  for (let i = 0; i < 20; i++) step(w);
  assert.equal(turm.progress, 0, 'unterwegs wird nicht gebaut');
  for (let i = 0; i < 200; i++) step(w);
  assert.ok(turm.progress > 0, 'angekommen: es geht voran');
  const nah = BUILDINGS.grenzstein.radius + UNITS.bauer.radius + 60;
  assert.ok((b.x - turm.x) ** 2 + (b.y - turm.y) ** 2 <= nah * nah, 'steht daneben');
});

test('ein Auftrag je Einheit: der neue ersetzt den alten', () => {
  const w = bare();
  spawnBuilding(w, 0, 'halle', 3000, 3000, true);
  const a = tryPlace(w, 0, 'grenzstein', 12000, 12000);
  const c = tryPlace(w, 0, 'grenzstein', 12000, 12600);
  const k = spawnUnit(w, 0, 'held', 12000, 12300); // zwischen beiden
  issue(w, { type: 'bauen', player: 0, ids: [k.id], id: a.id });
  issue(w, { type: 'bauen', player: 0, ids: [k.id], id: c.id });
  for (let i = 0; i < 60; i++) step(w);
  assert.equal(k.auftrag, c.id);
  assert.equal(a.progress, 0, 'der alte Auftrag bekommt nichts');
  assert.ok(c.progress > 0);
});

test('ein Bewegungsbefehl beendet den Bauauftrag', () => {
  const w = bare();
  spawnBuilding(w, 0, 'halle', 3000, 3000, true);
  const turm = tryPlace(w, 0, 'grenzstein', 12000, 12000);
  const k = spawnUnit(w, 0, 'held', 12100, 12000);
  issue(w, { type: 'bauen', player: 0, ids: [k.id], id: turm.id });
  for (let i = 0; i < 10; i++) step(w);
  const stand = turm.progress;
  assert.ok(stand > 0);
  issue(w, { type: 'move', player: 0, ids: [k.id], x: 12150, y: 12000 });
  for (let i = 0; i < 30; i++) step(w);
  assert.equal(k.auftrag, 0);
  assert.equal(turm.progress, stand, 'steht noch daneben, baut aber nicht mehr');
});

test('beim Platzieren bekommen ausgewaehlte Erbauer den Auftrag', () => {
  const w = bare();
  spawnBuilding(w, 0, 'halle', 3000, 3000, true);
  const b = spawnUnit(w, 0, 'bauer', 11800, 12000);
  const s = spawnUnit(w, 0, 'soldat', 11800, 12100);
  issue(w, { type: 'build', player: 0, building: 'grenzstein', x: 12000, y: 12000, ids: [b.id, s.id] });
  step(w);
  const turm = w.entities.find((e) => e.type === 'grenzstein');
  assert.equal(b.auftrag, turm.id, 'der Bauer baut');
  assert.equal(s.auftrag || 0, 0, 'der Soldat kann nicht bauen');
});

test('fällt der Kommandant, ist die Partie verloren', () => {
  const w = bare();
  spawnBuilding(w, 0, 'halle', 3000, 3000, true);
  spawnBuilding(w, 1, 'herzbaum', 17000, 17000, true);
  const k = spawnUnit(w, 1, 'waldgott', 10000, 10000);
  k.hp = 1;
  spawnUnit(w, 0, 'soeldner', 10300, 10000);
  for (let i = 0; i < 20 && !w.over; i++) step(w);
  assert.equal(w.over, true);
  assert.equal(w.winner, 0);
});

test('RULES.kommandanten = false: keine Kommandanten', () => {
  const alt = RULES.kommandanten;
  try {
    RULES.kommandanten = false;
    const w = createWorld();
    assert.equal(w.entities.some((e) => e.kind === 'unit'), false);
  } finally {
    RULES.kommandanten = alt;
  }
});
