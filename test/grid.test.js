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
} from '../src/sim/sim.js';
import { FACTIONS, BUILDINGS, UNITS, RULES } from '../src/sim/defs.js';
import { createAI, stepAI } from '../src/sim/ai.js';

function bare(f0 = 'mensch', f1 = 'gott') {
  return createWorld({ empty: true, factions: [f0, f1] });
}

test('isqrt liefert exakte Integer-Wurzeln', () => {
  assert.equal(isqrt(144), 12);
  assert.equal(isqrt(145), 12);
  assert.equal(isqrt(1000000), 1000);
});

// ---------------------------------------------------- Die eine Regel

test('Menschen-Anker hat sofort vollen Radius und wächst nicht', () => {
  const w = bare();
  const t = spawnBuilding(w, 0, 'turm', 5000, 5000, true);
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
  const tm = spawnBuilding(wm, 0, 'turm', 5000, 5000, true);
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
  const t = spawnBuilding(w, 0, 'turm', 5000, 5000, false);
  computeRegions(w);
  assert.equal(anchorRadius(w, t), 0);
  assert.equal(inDomain(w, 0, 5000, 5000), false);
});

// ---------------------------------------------------- Domäne und Regionen

test('Gebäude im Ankerkreis bilden eine Region', () => {
  const w = bare();
  spawnBuilding(w, 0, 'turm', 5000, 5000, true);
  spawnBuilding(w, 0, 'schmiede', 6500, 5000, true);
  computeRegions(w);
  assert.equal(w.regions.length, 1);
});

test('eine entfernte Vorwärtsstellung ist eine eigene Region', () => {
  const w = bare();
  spawnBuilding(w, 0, 'turm', 5000, 5000, true);
  spawnBuilding(w, 0, 'schmiede', 15000, 15000, true);
  computeRegions(w);
  distributeGegenwart(w);
  assert.equal(w.regions.length, 2);
  const remote = gridReport(w, 0).find((r) => r.size === 1 && r.supply === 40);
  assert.ok(remote, 'die Außenstelle steht für sich');
});

test('Domänen verschiedener Spieler verbinden sich nie', () => {
  const w = bare();
  spawnBuilding(w, 0, 'turm', 5000, 5000, true);
  spawnBuilding(w, 1, 'hain', 5400, 5000, true);
  computeRegions(w);
  assert.equal(w.regions.length, 2);
});

// ---------------------------------------------------- Drosselleiter

test('Drosselleiter: Werk fällt vor Segen', () => {
  const w = bare();
  spawnBuilding(w, 0, 'turm', 5000, 5000, true);
  spawnBuilding(w, 0, 'schmiede', 5800, 5000, true); // +40
  const saege = spawnBuilding(w, 0, 'saege', 5000, 5800, true); // 14, Segen
  const kaserne = spawnBuilding(w, 0, 'kaserne', 6200, 5600, true); // 55, Werk
  kaserne.queue.push('landwehr');

  computeRegions(w);
  distributeGegenwart(w);

  assert.equal(saege.powered, 1000, 'Segen bleibt versorgt');
  assert.ok(kaserne.powered < 1000, 'Werk wird gedrosselt');
  assert.equal(kaserne.powered, Math.floor(((40 - 14) * 1000) / 55));
});

test('eine Baustelle ohne Gegenwart macht keinen Fortschritt', () => {
  const w = bare();
  const b = spawnBuilding(w, 0, 'kaserne', 15000, 15000, false);
  for (let i = 0; i < BUILDINGS.kaserne.buildTime * 3; i++) step(w);
  assert.equal(b.done, false);
  assert.equal(b.progress, 0);
});

test('dieselbe Baustelle mit Gegenwart wird fertig', () => {
  const w = bare();
  spawnBuilding(w, 0, 'turm', 15000, 15000, true);
  spawnBuilding(w, 0, 'schmiede', 15800, 15000, true);
  const b = spawnBuilding(w, 0, 'kaserne', 16600, 15600, false);
  for (let i = 0; i < BUILDINGS.kaserne.buildTime + 1; i++) step(w);
  assert.equal(b.done, true);
});

// ---------------------------------------------------- Roden

test('ein Sägewerk rodet den Boden und sperrt Haine aus', () => {
  const w = bare();
  spawnBuilding(w, 0, 'turm', 5000, 5000, true);
  spawnBuilding(w, 0, 'schmiede', 5800, 5000, true);
  w.deposits.push({ x: 5000, y: 6200, kind: 'fron', takenBy: 0 });
  const s = tryPlace(w, 0, 'saege', 5000, 6200);
  assert.ok(s, 'Sägewerk steht');
  assert.equal(isCleared(w, 5000, 6200), false, 'erst nach Fertigstellung');

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
  assert.equal(tryPlace(w, 1, 'turm', 9000, 9000), null, 'Gott baut keinen Turm');
});

// ---------------------------------------------------- Heimvorteil

test('der Schratt schlägt in der eigenen Domäne härter zu', () => {
  // Im eigenen Hain-Kreis
  const a = bare('gott', 'mensch');
  spawnBuilding(a, 0, 'hain', 5000, 5000, true);
  spawnUnit(a, 0, 'schratt', 5100, 5000);
  const ziel1 = spawnUnit(a, 1, 'landwehr', 5300, 5000);
  const hp1 = ziel1.hp;
  step(a);

  // Dasselbe Gefecht ohne Domäne
  const b = bare('gott', 'mensch');
  spawnUnit(b, 0, 'schratt', 15100, 15000);
  const ziel2 = spawnUnit(b, 1, 'landwehr', 15300, 15000);
  const hp2 = ziel2.hp;
  step(b);

  const schadenDrin = hp1 - ziel1.hp;
  const schadenDraussen = hp2 - ziel2.hp;
  assert.ok(
    schadenDrin > schadenDraussen,
    `zuhause mehr Schaden: ${schadenDrin} gegen ${schadenDraussen}`
  );
});

// ---------------------------------------------------- Determinismus

test('Simulation ist deterministisch über zwei Durchläufe', () => {
  const run = () => {
    const w = createWorld({ seed: 777 });
    const halle = w.entities.find((e) => e.player === 0);
    const baum = w.entities.find((e) => e.player === 1);
    issue(w, { type: 'produce', player: 0, id: halle.id, unit: 'landwehr' });
    issue(w, { type: 'produce', player: 1, id: baum.id, unit: 'schratt' });
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

test('überbuchte Domäne: Baustellen bekommen trotzdem den Mindestfluss', () => {
  // Thingstätte liefert 24, zwei Sägewerke wollen 28 Segen -- ohne
  // Mindestfluss bliebe für die Schmiede-Baustelle nichts.
  const w = bare();
  spawnBuilding(w, 0, 'halle', 5000, 5000, true);
  spawnBuilding(w, 0, 'saege', 5000, 6000, true);
  spawnBuilding(w, 0, 'saege', 6000, 5000, true);
  const schmiede = spawnBuilding(w, 0, 'schmiede', 4000, 5000, false);
  computeRegions(w);
  distributeGegenwart(w);
  assert.ok(schmiede.powered > 0, 'Werk steht nicht still');

  for (let i = 0; i < BUILDINGS.schmiede.buildTime * 40 && !schmiede.done; i++) step(w);
  assert.equal(schmiede.done, true, 'die Quelle wird fertig und löst die Überbuchung');
});

test('ohne Überbuchung ändert der Mindestfluss nichts an der Leiter', () => {
  const w = bare();
  spawnBuilding(w, 0, 'turm', 5000, 5000, true);
  spawnBuilding(w, 0, 'schmiede', 5800, 5000, true);
  const saege = spawnBuilding(w, 0, 'saege', 5000, 5800, true);
  computeRegions(w);
  distributeGegenwart(w);
  assert.equal(saege.powered, 1000);
});

// ---------------------------------------------------- Baustellen

test('Schaden an einer Baustelle bleibt bestehen', () => {
  const w = bare();
  spawnBuilding(w, 0, 'turm', 5000, 5000, true);
  spawnBuilding(w, 0, 'schmiede', 5800, 5000, true);
  const b = spawnBuilding(w, 0, 'kaserne', 6000, 5800, false);
  for (let i = 0; i < 20; i++) step(w);
  const vorher = b.hp;
  b.hp -= 100;
  step(w);
  assert.ok(b.hp < vorher, `Schaden heilt nicht weg: ${vorher} -> ${b.hp}`);
});

test('eine unbeschädigte Baustelle ist bei Fertigstellung voll', () => {
  const w = bare();
  spawnBuilding(w, 0, 'turm', 5000, 5000, true);
  spawnBuilding(w, 0, 'schmiede', 5800, 5000, true);
  const b = spawnBuilding(w, 0, 'kaserne', 6000, 5800, false);
  for (let i = 0; i < BUILDINGS.kaserne.buildTime + 1; i++) step(w);
  assert.equal(b.done, true);
  assert.equal(b.hp, BUILDINGS.kaserne.hp);
});

// ---------------------------------------------------- KI

test('beide KIs bauen eine Wirtschaft und beide Einheitentypen', () => {
  const w = createWorld({ seed: 4242 });
  const ais = [createAI(0, 1), createAI(1, 2)];
  const typen = [new Set(), new Set()];
  for (let i = 0; i < 600 * 12 && !w.over; i++) {
    stepAI(ais[0], w);
    stepAI(ais[1], w);
    step(w);
    for (const e of w.entities) if (e.kind === 'unit') typen[e.player].add(e.type);
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
    const lw = spawnUnit(w, 0, 'landwehr', 5100, 5000); // Mensch steht darin
    const ziel = spawnUnit(w, 1, 'wurzler', 5300, 5000);
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
    assert.equal(voll, UNITS.landwehr.weapon.damage);
    assert.equal(halb, (UNITS.landwehr.weapon.damage * 500 / 1000) | 0);
  } finally {
    RULES.fremdMalus = alt;
  }
});
