import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step, hash, issue } from '../src/sim/sim.js';
import { createAI, stepAI } from '../src/sim/ai.js';
import { zufallsKarte } from '../src/sim/kartenbau.js';
import { zustandSichern, zustandLaden, spielstandText, spielstandLesen } from '../src/spielstand.js';

function weiter(world, ais, ticks, protokoll) {
  for (let t = 0; t < ticks; t++) {
    for (const a of ais) if (a) stepAI(a, world);
    step(world);
    if (protokoll && world.tick % 50 === 0) protokoll.push(hash(world));
  }
}

/** Partie bis `bis` spielen, sichern, dann Original und Geladenes nebeneinander weiterlaufen lassen. */
function gleichNachLaden(opts, bis, danach) {
  const world = createWorld(opts);
  const ais = [createAI(0, opts.seed + 1, 'sturm'), createAI(1, opts.seed, 'standard')];
  weiter(world, ais, bis);
  const text = JSON.stringify(zustandSichern(world, ais));
  const geladen = zustandLaden(JSON.parse(text));
  assert.equal(hash(geladen.world), hash(world), 'gleicher Stand direkt nach dem Laden');
  const a = [];
  const b = [];
  weiter(world, ais, danach, a);
  weiter(geladen.world, geladen.ais, danach, b);
  assert.deepEqual(b, a);
}

test('Spielstand: frueh, mitten im Kampf und spaet geladen -- laeuft bitgenau weiter', () => {
  gleichNachLaden({ seed: 11, factions: ['mensch', 'gott'] }, 1500, 1500);
  gleichNachLaden({ seed: 12, factions: ['gott', 'mensch'] }, 7000, 2000);
  gleichNachLaden({ seed: 13, factions: ['mensch', 'gott'] }, 14000, 2000);
});

test('Spielstand: Flusstal und Zufallskarte bringen ihre Karte mit', () => {
  gleichNachLaden({ seed: 21, factions: ['mensch', 'gott'], karte: 'flusstal' }, 4000, 1500);
  const daten = zufallsKarte(77);
  gleichNachLaden({ seed: 22, factions: ['gott', 'mensch'], karte: 'zufall', karteDaten: daten }, 4000, 1500);
});

test('Spielstand: offene Befehle und Plaene ueberstehen das Speichern', () => {
  const world = createWorld({ seed: 31, factions: ['mensch', 'gott'] });
  const held = world.entities.find((e) => e.type === 'held');
  weiter(world, [null, null], 20);
  issue(world, { type: 'build', player: 0, ids: [held.id], building: 'saege', x: 4800, y: 2200 });
  issue(world, { type: 'move', player: 0, ids: [held.id], x: 6000, y: 6000, anhaengen: true });
  const geladen = zustandLaden(JSON.parse(JSON.stringify(zustandSichern(world, [null, null]))));
  const a = [];
  const b = [];
  weiter(world, [], 600, a);
  weiter(geladen.world, [], 600, b);
  assert.deepEqual(b, a);
});

test('Spielstand: Text mit Kennung, fremde Texte werden abgelehnt', () => {
  const world = createWorld({ seed: 41 });
  const text = spielstandText(world, [null, createAI(1, 41)], { mission: null });
  const r = spielstandLesen(text);
  assert.ok(r.s && !r.fehler);
  assert.equal(r.s.zustand.world.tick, 0);
  assert.ok(spielstandLesen('{"format":"etwas anderes"}').fehler);
  assert.ok(spielstandLesen('kein json').fehler);
});
