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
} from '../src/sim/sim.js';
import { FACTIONS, BUILDINGS, UNITS, RULES, MAP } from '../src/sim/defs.js';
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
  const a = spawnUnit(w, 0, 'landwehr', 5000, 5000);
  const b = spawnUnit(w, 1, 'landwehr', 5300, 5000);
  a.hp = UNITS.landwehr.weapon.damage; // stirbt am ersten Treffer
  b.hp = UNITS.landwehr.weapon.damage;
  step(w);
  assert.equal(a.dead, true);
  assert.equal(b.dead, true, 'beide treffen im selben Tick');
});

test('Befehle reihum: dieselbe Ader geht nicht immer an Spieler 0', () => {
  const sieger = [];
  for (let t = 0; t < 2; t++) {
    const w = bare('mensch', 'mensch');
    spawnBuilding(w, 0, 'halle', 5000, 5000, true);
    spawnBuilding(w, 1, 'halle', 15000, 15000, true);
    w.deposits.push({ x: 10000, y: 10000, kind: 'fron', takenBy: 0 });
    w.tick = t;
    issue(w, { type: 'build', player: 0, building: 'saege', x: 10000, y: 10000 });
    issue(w, { type: 'build', player: 1, building: 'saege', x: 10000, y: 10000 });
    step(w);
    const s = w.entities.find((e) => e.type === 'saege');
    sieger.push(s.player);
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
  for (let i = 0; i < 3800; i++) {
    stepAI(ais[0], w);
    stepAI(ais[1], w);
    step(w);
  }
  assert.equal(lage(1, true), lage(0, false));
  assert.equal(w.players[0].fron, w.players[1].fron);
});

// ---------------------------------------------------- Verfolgung

test('eine stehende Einheit verfolgt einen Feind knapp außer Reichweite', () => {
  const w = bare();
  const lw = spawnUnit(w, 0, 'landwehr', 5000, 5000);
  const ziel = spawnUnit(w, 1, 'wurzler', 5000 + UNITS.landwehr.weapon.range + 400, 5000);
  for (let i = 0; i < 60; i++) step(w);
  assert.ok(lw.x > 5000, 'geht auf den Feind zu');
  assert.ok(ziel.hp < ziel.maxHp || ziel.dead, 'und trifft ihn');
});

test('Verfolgung endet an der Leine und führt zum Befehlspunkt zurück', () => {
  const w = bare();
  const lw = spawnUnit(w, 0, 'landwehr', 5000, 5000);
  // Steht weit vom Befehlspunkt: wird nicht verfolgt.
  spawnUnit(w, 1, 'wurzler', 5000 + 1500 + UNITS.landwehr.weapon.range + 300, 5000);
  for (let i = 0; i < 60; i++) step(w);
  assert.equal(lw.x, 5000);
  assert.equal(lw.y, 5000);
});

test('ein Bewegungsbefehl hat Vorrang vor der Verfolgung', () => {
  const w = bare();
  const lw = spawnUnit(w, 0, 'landwehr', 5000, 5000);
  spawnUnit(w, 1, 'wurzler', 5000, 5000 + UNITS.landwehr.weapon.range + 300);
  issue(w, { type: 'move', player: 0, ids: [lw.id], x: 9000, y: 5000 });
  for (let i = 0; i < 20; i++) step(w);
  assert.equal(lw.y, 5000, 'läuft geradeaus weiter');
  assert.ok(lw.x > 5000);
});

test('eine Angriffsbewegung stellt Feinde unterwegs und zieht danach weiter', () => {
  const w = bare();
  const lw = spawnUnit(w, 0, 'landwehr', 5000, 5000);
  const ziel = spawnUnit(w, 1, 'wurzler', 5000, 5000 + UNITS.landwehr.weapon.range + 300);
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
  const lw = spawnUnit(w, 0, 'landwehr', 5000, 5000);
  issue(w, { type: 'move', player: 0, ids: [lw.id], x: 7000, y: 5000 });
  const min = BUILDINGS.kaserne.radius + UNITS.landwehr.radius;
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
  const lw = spawnUnit(w, 0, 'koehler', 5000, 5000);
  issue(w, { type: 'move', player: 0, ids: [lw.id], x: 6000, y: 5000 });
  for (let i = 0; i < 200; i++) step(w);
  const min = BUILDINGS.herzbaum.radius + UNITS.koehler.radius;
  const d = isqrt(dist2(lw.x, lw.y, b.x, b.y));
  assert.ok(d >= min - 2 && d <= min + UNITS.koehler.speed, `am Rand: ${d}`);
});

test('Ankerkraft: eingeschaltet spendet jeder Anker Gegenwart nach Radius', () => {
  const welt = () => {
    const w = bare();
    spawnBuilding(w, 0, 'turm', 5000, 5000, true);
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

test('Heimvorteil nach Tiefe: am Rand nichts, tief drinnen voll', () => {
  const gefecht = (abstand) => {
    const w = bare('gott', 'mensch');
    spawnBuilding(w, 0, 'herzbaum', 5000, 5000, true); // Radius = start
    const s = spawnUnit(w, 0, 'schratt', 5000 + abstand, 5000);
    const ziel = spawnUnit(w, 1, 'koehler', 5000 + abstand, 5300);
    const hp = ziel.hp;
    step(w);
    void s;
    return hp - ziel.hp;
  };
  const alt = RULES.tiefeVoll;
  try {
    RULES.tiefeVoll = 500;
    const r = FACTIONS.gott.growth.start;
    const basis = UNITS.schratt.weapon.damage;
    assert.equal(gefecht(r - 5), basis, 'am Rand: kein Bonus');
    assert.equal(gefecht(0), ((basis * UNITS.schratt.homeBonus) / 1000) | 0, 'tief drinnen: voll');
  } finally {
    RULES.tiefeVoll = alt;
  }
});
