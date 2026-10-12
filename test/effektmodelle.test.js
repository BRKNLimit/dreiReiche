// M8: Flak-Treffereffekt in src/effekte.js. Eine Waffe mit weapon.ziele 'luft'
// laesst am getroffenen Flieger eine Splitterwolke entstehen (3D zeigt dafuer
// das Modell 'flak'); andere Waffen nicht. Testtypen zur Laufzeit.

import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { UNITS, BUILDINGS } from '../src/sim/defs.js';
import { neueEffekte, effekteAusEreignissen, effekteFortschreiben, effekteLeeren } from '../src/effekte.js';

const TEST_EINHEITEN = {
  tflieger: { name: 'Testflieger', desc: '', faction: 'gott', hp: 100, radius: 14, speed: 40, cost: { fron: 20 }, buildTime: 50, fliegt: true },
  tjaeger: { name: 'Testjaeger', desc: '', faction: 'mensch', hp: 100, radius: 14, speed: 40, cost: { fron: 20 }, buildTime: 50, fliegt: true, weapon: { range: 300, damage: 5, cooldown: 10, ziele: 'luft' } },
  tbomber: { name: 'Testbomber', desc: '', faction: 'mensch', hp: 100, radius: 14, speed: 40, cost: { fron: 20 }, buildTime: 50, fliegt: true, weapon: { range: 50, damage: 5, cooldown: 10, ziele: 'boden' } },
  tbodenziel: { name: 'Testziel', desc: '', faction: 'gott', hp: 100, radius: 14, speed: 40, cost: { fron: 20 }, buildTime: 50 },
};
const TEST_GEBAEUDE = {
  // knapper Eintrag wie eine Flak: Waffe nur gegen Flieger, kein WAFFEN-Eintrag (also Hieb am Ziel)
  tflak: { name: 'Testflak', desc: '', short: 'FLK', faction: 'mensch', hp: 100, radius: 30, cost: { fron: 10 }, buildTime: 50, weapon: { range: 800, damage: 5, cooldown: 10, ziele: 'luft' } },
};
Object.assign(UNITS, TEST_EINHEITEN);
Object.assign(BUILDINGS, TEST_GEBAEUDE);
after(() => {
  for (const k of Object.keys(TEST_EINHEITEN)) delete UNITS[k];
  for (const k of Object.keys(TEST_GEBAEUDE)) delete BUILDINGS[k];
});

const hoerer = { x: 0, y: 0, weite: 10000 };
const alleSichtbar = () => true;
function weltMit(...entities) {
  return { entities, events: [], tick: 1 };
}
const ent = (id, kind, type, player, x, y) => ({ id, kind, type, player, x, y, hp: 100, maxHp: 100 });
function schuss(fx, a, b) {
  const w = weltMit(a, b);
  w.events.push({ t: 'shot', from: a.id, to: b.id });
  effekteAusEreignissen(fx, w, 0, alleSichtbar, hoerer, () => true);
  return w;
}

test('Flak-Gebaeude trifft Flieger: Splitterwolke am Ziel', () => {
  const fx = neueEffekte();
  schuss(fx, ent(1, 'building', 'tflak', 0, 1000, 1000), ent(2, 'unit', 'tflieger', 1, 1200, 1000));
  assert.equal(fx.wolken.length, 1);
  assert.deepEqual({ x: fx.wolken[0].x, y: fx.wolken[0].y, typ: fx.wolken[0].typ }, { x: 1200, y: 1000, typ: 'tflieger' });
});

test('Luftjaeger (ziele luft) loest dieselbe Wolke aus', () => {
  const fx = neueEffekte();
  schuss(fx, ent(1, 'unit', 'tjaeger', 0, 1000, 1000), ent(2, 'unit', 'tflieger', 1, 1200, 1000));
  assert.equal(fx.wolken.length, 1);
});

test('Waffe mit Geschoss: die Wolke erscheint beim Einschlag, nicht beim Abschuss', () => {
  const fx = neueEffekte();
  // WAFFEN['wachturm'] hat ein Geschoss; ein Gebaeude gleichen Namens ist hier nur ein Waffenmuster
  const alt = BUILDINGS.wachturm.weapon;
  BUILDINGS.wachturm.weapon = { ...alt, ziele: 'luft' };
  try {
    const w = schuss(fx, ent(1, 'building', 'wachturm', 0, 1000, 1000), ent(2, 'unit', 'tflieger', 1, 1300, 1000));
    assert.equal(fx.geschosse.length, 1);
    assert.equal(fx.wolken.length, 0, 'noch im Flug');
    for (let i = 0; i < 40 && fx.geschosse.length; i++) effekteFortschreiben(fx, 0.05, w, hoerer);
    assert.equal(fx.geschosse.length, 0, 'eingeschlagen');
    assert.equal(fx.wolken.length, 1, 'und jetzt die Wolke');
    assert.equal(fx.wolken[0].typ, 'tflieger');
  } finally {
    BUILDINGS.wachturm.weapon = alt;
  }
});

test('Bomber (ziele boden), Boden-Waffe und Flak auf Gebaeude: keine Wolke', () => {
  const fx = neueEffekte();
  schuss(fx, ent(1, 'unit', 'tbomber', 0, 1000, 1000), ent(2, 'unit', 'tbodenziel', 1, 1020, 1000));
  schuss(fx, ent(3, 'unit', 'soldat', 0, 1000, 1000), ent(4, 'unit', 'tbodenziel', 1, 1020, 1000));
  schuss(fx, ent(5, 'building', 'tflak', 0, 1000, 1000), ent(6, 'building', 'tflak', 1, 1020, 1000));
  assert.equal(fx.wolken.length, 0);
});

test('Wolke lebt kurz, verschwindet beim Fortschreiben und beim Leeren', () => {
  const fx = neueEffekte();
  const w = schuss(fx, ent(1, 'building', 'tflak', 0, 1000, 1000), ent(2, 'unit', 'tflieger', 1, 1200, 1000));
  effekteFortschreiben(fx, 0.2, w, hoerer);
  assert.equal(fx.wolken.length, 1, 'nach 0,2 s noch da');
  effekteFortschreiben(fx, 0.25, w, hoerer);
  assert.equal(fx.wolken.length, 0, 'nach 0,45 s weg');
  schuss(fx, ent(1, 'building', 'tflak', 0, 1000, 1000), ent(2, 'unit', 'tflieger', 1, 1200, 1000));
  effekteLeeren(fx);
  assert.equal(fx.wolken.length, 0);
});

test('Wolken sind begrenzt', () => {
  const fx = neueEffekte();
  for (let i = 0; i < 100; i++) schuss(fx, ent(1, 'building', 'tflak', 0, 1000, 1000), ent(2, 'unit', 'tflieger', 1, 1200, 1000));
  assert.ok(fx.wolken.length <= 60);
});
