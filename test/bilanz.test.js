import test from 'node:test';
import assert from 'node:assert/strict';
import { tagesHerausforderung, partieErfassen, bilanzLesen, ERFOLGE } from '../src/bilanz.js';
import { zufallsKarte, kartenFehler } from '../src/sim/kartenbau.js';

function mitSpeicher(f) {
  const speicher = {};
  globalThis.localStorage = { getItem: (k) => speicher[k] ?? null, setItem: (k, v) => (speicher[k] = String(v)) };
  try {
    f();
  } finally {
    delete globalThis.localStorage;
  }
}

test('Tagesherausforderung: gleicher Tag, gleiche Partie; die Karte ist spielbar', () => {
  const a = tagesHerausforderung(new Date(2026, 9, 12));
  const b = tagesHerausforderung(new Date(2026, 9, 12, 23, 59));
  assert.deepEqual(a, b);
  assert.equal(a.tag, 20261012);
  const tage = new Set();
  for (let d = 1; d <= 20; d++) {
    const h = tagesHerausforderung(new Date(2026, 9, d));
    tage.add(h.volk + h.stil + h.stufe);
    assert.deepEqual(kartenFehler(zufallsKarte(h.seed)), [], 'Karte vom ' + h.datum);
  }
  assert.ok(tage.size >= 4, 'die Tage unterscheiden sich');
});

test('Bilanz: Siege zaehlen, Erfolge kommen genau einmal', () => {
  mitSpeicher(() => {
    const sieg = { gewonnen: true, volk: 'mensch', stufe: 'schwer', karte: 'zufall', minuten: 12, verluste: 3, ausgebildet: 40, online: false, tages: 20261012, mission: null, kampagneFertig: null };
    const neu1 = partieErfassen(sieg).map((e) => e.id);
    for (const id of ['erster-sieg', 'haerteprobe', 'sturmlauf', 'eiserne-linie', 'fremdes-land', 'tageswerk']) assert.ok(neu1.includes(id), id);
    assert.ok(!neu1.includes('zwei-seelen'));
    assert.deepEqual(partieErfassen(sieg), [], 'nichts doppelt');
    const neu2 = partieErfassen({ ...sieg, volk: 'gott', tages: 0, minuten: 50 }).map((e) => e.id);
    assert.ok(neu2.includes('zwei-seelen') && neu2.includes('langer-atem'));
    partieErfassen({ ...sieg, gewonnen: false, volk: 'gott', tages: 0 });
    const b = bilanzLesen();
    assert.deepEqual(b.partien.mensch, [2, 0]);
    assert.deepEqual(b.partien.gott, [1, 1]);
    assert.equal(b.tage[20261012], 12);
    assert.equal(Object.keys(b.erfolge).length, 8);
    assert.equal(ERFOLGE.length, 12);
  });
});

test('Bilanz: Kampagne abgeschlossen, Missionen zaehlen nicht als Partie', () => {
  mitSpeicher(() => {
    const neu = partieErfassen({ gewonnen: true, volk: 'gott', stufe: 'leicht', karte: 'klassisch', minuten: 30, verluste: 50, ausgebildet: 10, mission: 'zorn-des-waldes', kampagneFertig: 'zorn' }).map((e) => e.id);
    assert.ok(neu.includes('zorn-des-waldes'));
    assert.deepEqual(bilanzLesen().partien.gott, [0, 0]);
  });
});
