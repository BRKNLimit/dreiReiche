// M1 Luftebene: weapon.ziele ('boden' | 'luft' | 'beide'), bewaffnete Flieger,
// Flak. Die Volksdateien haben (noch) keine Flieger mit Waffe -- die Testdaten
// werden zur Laufzeit in UNITS/BUILDINGS/FACTIONS eingetragen und am Ende
// wieder entfernt (node --test startet jede Testdatei in einem eigenen
// Prozess, aber aufgeraeumt wird trotzdem).
//
// Radien bleiben unter dem groessten vorhandenen: die Nachbarsuche in sim.js
// rechnet GROESSTER_RADIUS einmal beim Laden aus.

import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, spawnUnit, spawnBuilding, step, issue, hash, erreicht, zieleVon } from '../src/sim/sim.js';
import { UNITS, BUILDINGS, FACTIONS } from '../src/sim/defs.js';
import { createAI, stepAI } from '../src/sim/ai.js';

const TEST_EINHEITEN = {
  // Bomber: fliegt, trifft nur Boden (auch Gebaeude)
  tbomber: {
    name: 'Testbomber', desc: '', faction: 'mensch', hp: 400, radius: 14, speed: 40, cost: { fron: 60 },
    buildTime: 50, kampf: 'fern', fliegt: true, weapon: { range: 200, damage: 40, cooldown: 5, ziele: 'boden' },
  },
  // Luftjaeger: fliegt, trifft nur Flieger
  tjaeger: {
    name: 'Testjaeger', desc: '', faction: 'mensch', hp: 300, radius: 14, speed: 40, cost: { fron: 70 },
    buildTime: 50, kampf: 'fern', fliegt: true, weapon: { range: 200, damage: 40, cooldown: 5, ziele: 'luft' },
  },
  // Fernkaempfer, der nur Boden trifft (ziele schlaegt kampf)
  tschuetze: {
    name: 'Testschuetze', desc: '', faction: 'mensch', hp: 200, radius: 20, speed: 30, cost: { fron: 40 },
    buildTime: 50, kampf: 'fern', weapon: { range: 400, damage: 20, cooldown: 5, ziele: 'boden' },
  },
  // Nahkaempfer, der Flieger trifft (ziele schlaegt kampf)
  tspeer: {
    name: 'Testspeer', desc: '', faction: 'mensch', hp: 200, radius: 20, speed: 30, cost: { fron: 40 },
    buildTime: 50, kampf: 'nah', weapon: { range: 20, damage: 20, cooldown: 5, ziele: 'beide' },
  },
};
const TEST_GEBAEUDE = {
  // Flak: trifft nur Flieger
  tflak: {
    name: 'Testflak', desc: '', short: 'FLK', faction: 'mensch', hp: 2000, radius: 30, cost: { fron: 100 },
    buildTime: 50, kampf: 'fern', weapon: { range: 700, damage: 50, cooldown: 5, ziele: 'luft' },
  },
  tluftfabrik: {
    name: 'Testluftfabrik', desc: '', short: 'LFB', faction: 'mensch', hp: 1000, radius: 40, cost: { fron: 200 },
    buildTime: 100, gegenwartIn: 5, buildList: ['tbomber', 'tjaeger'],
  },
};

Object.assign(UNITS, TEST_EINHEITEN);
Object.assign(BUILDINGS, TEST_GEBAEUDE);
// Die Tests setzen Rollen der Menschen auf Testtypen -- danach wieder wie vorher
// (das Volk kann diese Rollen in seiner Datei wirklich haben)
const ROLLEN_VORHER = { ...FACTIONS.mensch.rollen };
after(() => {
  for (const k of Object.keys(TEST_EINHEITEN)) delete UNITS[k];
  for (const k of Object.keys(TEST_GEBAEUDE)) delete BUILDINGS[k];
  for (const r of Object.keys(FACTIONS.mensch.rollen)) delete FACTIONS.mensch.rollen[r];
  Object.assign(FACTIONS.mensch.rollen, ROLLEN_VORHER);
});

function bare() {
  return createWorld({ empty: true, factions: ['mensch', 'gott'] });
}
/** Einheit, die sich nicht bewegen kann: bleibt, wo sie ist (Wurzelgriff). */
function festgehalten(e) {
  e.gebundenBis = 1e9;
  return e;
}
const schritte = (w, n) => {
  for (let i = 0; i < n; i++) step(w);
};

test('ziele: ohne Angabe wie bisher (nah nur Boden, fern beides), sonst nach Angabe', () => {
  assert.equal(zieleVon(UNITS.soldat), 'boden');
  assert.equal(zieleVon(UNITS.jaeger), 'beide');
  assert.equal(zieleVon(BUILDINGS.wachturm), 'beide');
  assert.equal(zieleVon(UNITS.tbomber), 'boden');
  assert.equal(zieleVon(UNITS.tjaeger), 'luft');
  assert.equal(zieleVon(UNITS.tschuetze), 'boden', 'ziele schlaegt kampf: fern');
  assert.equal(zieleVon(UNITS.tspeer), 'beide', 'ziele schlaegt kampf: nah');
});

test('erreicht(): wer wen treffen kann -- Gebaeude zaehlen als Boden', () => {
  const w = bare();
  const luft = spawnUnit(w, 1, 'rabe', 9000, 9000);
  const boden = spawnUnit(w, 1, 'wolf', 9500, 9000);
  const haus = spawnBuilding(w, 1, 'moos', 9000, 9500, true);
  const von = (typ, art = 'unit') => (art === 'unit' ? spawnUnit(w, 0, typ, 3000, 3000) : spawnBuilding(w, 0, typ, 3000, 3000, true));
  const tabelle = [
    // [Schuetze, trifft Luft, trifft Boden, trifft Gebaeude]
    [von('soldat'), false, true, true],
    [von('jaeger'), true, true, true],
    [von('tschuetze'), false, true, true],
    [von('tspeer'), true, true, true],
    [von('tbomber'), false, true, true],
    [von('tjaeger'), true, false, false],
    [von('wachturm', 'building'), true, true, true],
    [von('tflak', 'building'), true, false, false],
  ];
  for (const [e, l, b, g] of tabelle) {
    assert.equal(erreicht(e, luft), l, `${e.type} -> Flieger`);
    assert.equal(erreicht(e, boden), b, `${e.type} -> Bodeneinheit`);
    assert.equal(erreicht(e, haus), g, `${e.type} -> Gebaeude`);
  }
});

test('Nahkaempfer trifft keinen Flieger, auch nicht mit Angriffsbefehl; mit ziele beide schon', () => {
  const w = bare();
  const flieger = festgehalten(spawnUnit(w, 1, 'tjaeger', 6000, 6000));
  const s = spawnUnit(w, 0, 'soldat', 6000 + UNITS.soldat.radius + UNITS.tjaeger.radius + 5, 6000);
  issue(w, { type: 'angreifen', player: 0, ids: [s.id], id: flieger.id });
  step(w);
  assert.equal(s.ziel, 0, 'gezielter Angriff auf einen Flieger wird abgelehnt');
  issue(w, { type: 'attack', player: 0, ids: [s.id], x: 6000, y: 6000 });
  schritte(w, 60);
  assert.equal(flieger.hp, flieger.maxHp, 'unversehrt');
  const speer = spawnUnit(w, 0, 'tspeer', 6000 - UNITS.tspeer.radius - UNITS.tjaeger.radius - 5, 6000);
  issue(w, { type: 'angreifen', player: 0, ids: [speer.id], id: flieger.id });
  step(w);
  assert.equal(speer.ziel, flieger.id, 'ziele beide: der Speer darf');
  schritte(w, 40);
  assert.ok(flieger.hp < flieger.maxHp, 'und trifft');
});

test('Flak trifft Flieger, aber keinen Bodentruppler und kein Gebaeude', () => {
  const w = bare();
  const flak = spawnBuilding(w, 0, 'tflak', 5000, 5000, true);
  const soldat = festgehalten(spawnUnit(w, 1, 'soldat', 5400, 5000)); // in Flak-Reichweite, aber ausser Reichweite eigener Waffen
  const haus = spawnBuilding(w, 1, 'moos', 5000, 5500, true); // ebenfalls in Reichweite
  const flieger = festgehalten(spawnUnit(w, 1, 'rabe', 5300, 5300));
  schritte(w, 30);
  assert.ok(flieger.dead, 'der Flieger faellt');
  assert.equal(soldat.hp, soldat.maxHp, 'der Soldat bleibt heil');
  assert.equal(haus.hp, haus.maxHp, 'das Gebaeude bleibt heil');
  assert.equal(flak.hp, flak.maxHp);
});

test('Bomber (ziele boden) trifft Boden und Gebaeude, keinen Flieger -- auch nicht den naeheren', () => {
  const w = bare();
  const bomber = festgehalten(spawnUnit(w, 0, 'tbomber', 5000, 5000));
  const naeher = festgehalten(spawnUnit(w, 1, 'rabe', 5050, 5000)); // Flieger (unbewaffnet, ein Treffer toetet), naeher
  const soldat = festgehalten(spawnUnit(w, 1, 'soldat', 5000, 5150));
  schritte(w, 20);
  assert.ok(!naeher.dead, 'der Flieger wird nicht beschossen');
  assert.ok(soldat.hp < soldat.maxHp, 'der Soldat schon');
  // Gebaeude
  const w2 = bare();
  spawnUnit(w2, 0, 'tbomber', 5000, 5000);
  const haus = spawnBuilding(w2, 1, 'moos', 5000, 5150, true);
  schritte(w2, 20);
  assert.ok(haus.hp < haus.maxHp, 'Gebaeude sind Boden');
  assert.equal(bomber.hp, bomber.maxHp);
});

test('Luftjaeger (ziele luft) jagt Flieger und ignoriert Boden und Gebaeude', () => {
  const w = bare();
  spawnUnit(w, 0, 'tjaeger', 5000, 5000);
  const soldat = festgehalten(spawnUnit(w, 1, 'soldat', 5080, 5000)); // naeher, aber Boden
  const haus = spawnBuilding(w, 1, 'moos', 5000, 5100, true);
  const feind = spawnUnit(w, 1, 'tbomber', 5600, 5000); // Flieger, weiter weg, ausser Reichweite
  festgehalten(feind);
  schritte(w, 400);
  // Der Flieger stand 600 weg, die Waffe reicht 200: er musste verfolgt werden
  assert.ok(feind.dead, 'der gegnerische Flieger wird verfolgt und faellt');
  assert.equal(soldat.hp, soldat.maxHp, 'der Soldat bleibt heil');
  assert.equal(haus.hp, haus.maxHp, 'das Gebaeude bleibt heil');
});

test('niemand bleibt an einem unerreichbaren Ziel haengen', () => {
  const w = bare();
  // Soldat soll zu einem Punkt, ein gegnerischer Flieger schwebt in Verfolgungsnaehe
  const flieger = festgehalten(spawnUnit(w, 1, 'tjaeger', 7000, 7400));
  const s = spawnUnit(w, 0, 'soldat', 7000, 6000);
  issue(w, { type: 'attack', player: 0, ids: [s.id], x: 7000, y: 7000 });
  schritte(w, 400);
  assert.ok(s.arrived, 'angekommen');
  assert.ok(Math.abs(s.x - 7000) < 100 && Math.abs(s.y - 7000) < 100, 'am Befehlspunkt, nicht beim Flieger');
  // Luftjaeger gegen Bodenziel: angreifen wird abgelehnt, Angriffsbewegung endet am Punkt
  const j = spawnUnit(w, 0, 'tjaeger', 3000, 3000);
  const boden = spawnUnit(w, 1, 'soldat', 3500, 3000);
  issue(w, { type: 'angreifen', player: 0, ids: [j.id], id: boden.id });
  step(w);
  assert.equal(j.ziel, 0);
  issue(w, { type: 'attack', player: 0, ids: [j.id], x: 4000, y: 3000 });
  schritte(w, 200);
  assert.ok(j.arrived);
  assert.equal(boden.hp, boden.maxHp, 'nichts getroffen');
});

test('Zielwahl der Tuerme und Schuetzen: ein Flieger in Reichweite verdraengt den Boden nicht', () => {
  const w = bare();
  // Der Schuetze (nur Boden) hat einen Flieger naeher und einen Soldaten weiter: er schiesst auf den Soldaten
  const sch = festgehalten(spawnUnit(w, 0, 'tschuetze', 5000, 5000));
  const naeher = festgehalten(spawnUnit(w, 1, 'tjaeger', 5060, 5000));
  const soldat = festgehalten(spawnUnit(w, 1, 'soldat', 5300, 5000));
  schritte(w, 20);
  assert.equal(naeher.hp, naeher.maxHp);
  assert.ok(soldat.hp < soldat.maxHp);
  assert.equal(sch.hp, sch.maxHp);
});

test('Partie mit Fliegern, Flak und Gefecht ist deterministisch', () => {
  const lauf = () => {
    const w = bare();
    spawnBuilding(w, 0, 'tflak', 4000, 4000, true);
    spawnBuilding(w, 1, 'tflak', 6000, 6000, true);
    const eigene = [];
    const feinde = [];
    for (let i = 0; i < 4; i++) {
      eigene.push(spawnUnit(w, 0, ['tbomber', 'tjaeger', 'soldat', 'jaeger'][i], 4200 + i * 90, 4100 - i * 40).id);
      feinde.push(spawnUnit(w, 1, ['tjaeger', 'tbomber', 'wolf', 'tschuetze'][i], 5900 - i * 90, 5900 + i * 40).id);
    }
    issue(w, { type: 'attack', player: 0, ids: eigene, x: 6000, y: 6000 });
    issue(w, { type: 'attack', player: 1, ids: feinde, x: 4000, y: 4000 });
    let schuesse = 0;
    for (let t = 0; t < 500; t++) {
      step(w);
      schuesse += w.events.filter((ev) => ev.t === 'shot').length;
    }
    return { h: hash(w), n: w.entities.length, schuesse };
  };
  const a = lauf();
  const b = lauf();
  assert.deepEqual(a, b);
  assert.ok(a.schuesse > 20, 'es wurde gekaempft');
});

// ---------------------------------------------------------------- KI

/** Volk Mensch bekommt Rollen fuer die Testflieger (die echten Volksdateien gehoeren Gemini). */
function rollenSetzen() {
  Object.assign(FACTIONS.mensch.rollen, { luftfabrik: 'tluftfabrik', flak: 'tflak', bomber: 'tbomber', luftjaeger: 'tjaeger' });
}

test('KI: Luftfabrik erst im mittleren Spiel, Flak erst wenn Flieger bekannt sind', () => {
  rollenSetzen();
  const w = createWorld({ seed: 7, factions: ['mensch', 'mensch'] });
  const ais = [createAI(0, 7, 'standard'), createAI(1, 8, 'standard')];
  for (let t = 0; t < 4000; t++) {
    stepAI(ais[0], w);
    stepAI(ais[1], w);
    step(w);
  }
  const zahl = (typ, p) => w.entities.filter((e) => e.kind === 'building' && e.type === typ && e.player === p).length;
  assert.equal(zahl('tluftfabrik', 0) + zahl('tluftfabrik', 1), 0, 'vor Minute 7 keine Luftfabrik');
  assert.equal(zahl('tflak', 0) + zahl('tflak', 1), 0, 'ohne bekannte Flieger keine Flak');
});

test('KI: baut Luftfabrik, bildet Flieger aus und stellt Flak, sobald sie Flieger gesehen hat', () => {
  rollenSetzen();
  const w = createWorld({ seed: 7, factions: ['mensch', 'gott'] });
  const ais = [createAI(0, 7, 'standard'), createAI(1, 8, 'standard')];
  let flieger = 0;
  let fabrik = false;
  let flak = false;
  for (let t = 0; t < 12000 && !w.over; t++) {
    if (t === 3000) spawnUnit(w, 1, 'rabe', 3300, 3000); // ein gegnerischer Flieger ueber der Basis
    stepAI(ais[0], w);
    stepAI(ais[1], w);
    step(w);
    if (t % 20 === 0) {
      fabrik ||= w.entities.some((e) => e.type === 'tluftfabrik' && e.player === 0);
      flak ||= w.entities.some((e) => e.type === 'tflak' && e.player === 0);
      flieger = Math.max(flieger, w.entities.filter((e) => (e.type === 'tbomber' || e.type === 'tjaeger') && e.player === 0).length);
    }
  }
  assert.ok(fabrik, 'Luftfabrik gebaut');
  assert.ok(flak, 'Flak gebaut');
  assert.ok(flieger > 0, 'Flieger ausgebildet');
});
