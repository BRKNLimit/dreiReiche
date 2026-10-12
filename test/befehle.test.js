import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step, issue, spawnUnit, planVon } from '../src/sim/sim.js';
import { routeVon, mitmachen } from '../src/ui-gemeinsam.js';

/** Leere Partie mit zwei Bauern der Menschen. */
function partie() {
  const w = createWorld({ empty: true, factions: ['mensch', 'gott'] });
  w.players[0].fron = 5000;
  const a = spawnUnit(w, 0, 'bauer', 3000, 3000);
  const b = spawnUnit(w, 0, 'bauer', 3100, 3000);
  return { w, a, b };
}
const plaene = (w) => w.plaene.map((q) => q.type);

test('Bauplan ohne Erbauer verschwindet, wenn sein Erbauer ohne Shift woanders hin soll', () => {
  const { w, a } = partie();
  issue(w, { type: 'build', player: 0, ids: [a.id], building: 'grenzstein', x: 9000, y: 9000 });
  step(w);
  assert.deepEqual(plaene(w), ['grenzstein']);
  issue(w, { type: 'move', player: 0, ids: [a.id], x: 4000, y: 3000 });
  step(w);
  assert.deepEqual(plaene(w), []);
});

test('... auch die ganze Baureihe; ein zweiter Erbauer haelt seinen Plan am Leben', () => {
  const { w, a, b } = partie();
  issue(w, { type: 'build', player: 0, ids: [a.id, b.id], building: 'grenzstein', x: 9000, y: 9000 });
  issue(w, { type: 'build', player: 0, ids: [a.id], building: 'wachturm', x: 9600, y: 9000, anhaengen: true });
  step(w);
  assert.deepEqual(plaene(w).sort(), ['grenzstein', 'wachturm']);
  issue(w, { type: 'stopp', player: 0, ids: [a.id] });
  step(w);
  assert.deepEqual(plaene(w), ['grenzstein'], 'den Grenzstein soll b noch bauen, den Wachturm niemand mehr');
  // Ein neuer Bauauftrag ohne Shift ersetzt den alten -- der verwaiste Plan geht
  issue(w, { type: 'build', player: 0, ids: [b.id], building: 'kaserne', x: 6000, y: 3000 });
  step(w);
  assert.deepEqual(plaene(w), ['kaserne']);
});

test('Shift+Bewegen haengt die Route hinter die Bauauftraege, der Plan bleibt', () => {
  const { w, a } = partie();
  issue(w, { type: 'build', player: 0, ids: [a.id], building: 'grenzstein', x: 5000, y: 3000 });
  step(w);
  issue(w, { type: 'move', player: 0, ids: [a.id], x: 7000, y: 7000, anhaengen: true });
  issue(w, { type: 'attack', player: 0, ids: [a.id], x: 8000, y: 7000, anhaengen: true });
  step(w);
  assert.deepEqual(plaene(w), ['grenzstein']);
  assert.deepEqual(routeVon(w, a).map((p) => p[2]), ['start', 'bau', 'geh', 'angriff']);
  // bauen, dann losgehen
  for (let t = 0; t < 3000 && (a.auftrag || a.wege.length || !a.arrived); t++) step(w);
  assert.ok(w.entities.some((e) => e.type === 'grenzstein' && e.done), 'gebaut');
  assert.equal(a.tx, 8000);
});

test('Rechtsklick auf eine eigene Einheit: mitbauen oder ihre Route mitlaufen', () => {
  const { w, a, b } = partie();
  const s = spawnUnit(w, 0, 'soldat', 3000, 3200);
  issue(w, { type: 'build', player: 0, ids: [a.id], building: 'grenzstein', x: 5000, y: 3000 });
  step(w);
  mitmachen(w, 0, [b.id, s.id], a, false);
  step(w);
  assert.equal(b.auftrag, a.auftrag, 'der Bauer baut mit');
  assert.deepEqual([s.tx, s.ty], [5000, 3000], 'der Soldat geht hin');
  // Einer laeuft eine Route, ein anderer schliesst sich an
  const s2 = spawnUnit(w, 0, 'soldat', 3000, 3400);
  issue(w, { type: 'move', player: 0, ids: [s.id], x: 6000, y: 6000 });
  issue(w, { type: 'move', player: 0, ids: [s.id], x: 7000, y: 6000, anhaengen: true });
  step(w);
  mitmachen(w, 0, [s2.id], s, false);
  step(w);
  assert.deepEqual([s2.tx, s2.ty, s2.wege.length], [6000, 6000, 1]);
  assert.ok(planVon(w, a.auftrag));
});
