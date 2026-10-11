import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step, hash, issue } from '../src/sim/sim.js';
import { BUILDINGS, UNITS, KARTEN } from '../src/sim/defs.js';
import { createAI, stepAI } from '../src/sim/ai.js';
import { MISSIONEN, missionVon, missionPruefen, missionGeschafft, kampagneStand, zieleHtml, naechsteMeldung } from '../src/kampagne.js';

function missionsWelt(m, seed = 7) {
  const world = createWorld({ seed, factions: [m.volk, m.volk === 'mensch' ? 'gott' : 'mensch'], karte: m.karte });
  m.aufbau(world);
  const ai = m.ki === false ? null : createAI(1, world.seed, m.stil, m.stufe);
  return { world, ai };
}

test('Kampagne: jede Mission baut auf freiem Boden auf und laeuft deterministisch', () => {
  for (const m of MISSIONEN) {
    const laeufe = [0, 1].map(() => {
      const { world, ai } = missionsWelt(m);
      for (const e of world.entities) {
        const r = e.kind === 'building' ? BUILDINGS[e.type].radius : UNITS[e.type].radius || 0;
        for (const h of KARTEN[m.karte].hindernisse) {
          const dx = e.x - h.x;
          const dy = e.y - h.y;
          assert.ok(dx * dx + dy * dy >= (h.r + r) * (h.r + r), `${m.id}: ${e.type} bei ${e.x},${e.y} steht im Hindernis`);
        }
      }
      for (let t = 0; t < 900; t++) {
        if (ai) stepAI(ai, world);
        if (m.takt) m.takt(world);
        step(world);
      }
      return hash(world);
    });
    assert.equal(laeufe[0], laeufe[1], m.id);
  }
});

test('Kampagne: Ziele werden der Reihe nach erfuellt, erledigt bleibt erledigt', () => {
  const m = missionVon('fuss-fassen');
  const { world } = missionsWelt(m);
  const stand = m.ziele.map(() => false);
  const held = world.entities.find((e) => e.type === 'held');
  // Steuergruppe schon belegt, aber der Held noch nicht gewaehlt: nichts zaehlt
  assert.equal(missionPruefen(m, stand, world, 0, { sel: [], gruppen: { 1: [1, 2, 3, 4] } }), false);
  assert.deepEqual(stand, m.ziele.map(() => false));
  missionPruefen(m, stand, world, 0, { sel: [held.id], gruppen: {} });
  assert.equal(stand[0], true);
  missionPruefen(m, stand, world, 0, { sel: [], gruppen: {} });
  assert.equal(stand[0], true, 'Abwaehlen nimmt das Ziel nicht zurueck');
  assert.match(zieleHtml(m, stand, world), /Sägewerk/);
  assert.doesNotMatch(zieleHtml(m, stand, world), /Kaserne/, 'spaetere Ziele sind noch verborgen');
});

test('Kampagne: Vorposten zerstoert erfuellt das letzte Lernziel', () => {
  const m = missionVon('fuss-fassen');
  const { world } = missionsWelt(m);
  assert.equal(world.vorposten.length, 3);
  const letztes = m.ziele[m.ziele.length - 1];
  assert.equal(letztes.erfuellt(world, 0, { sel: [], gruppen: {} }), false);
  for (const id of world.vorposten) world.entities.find((e) => e.id === id).dead = true;
  assert.equal(letztes.erfuellt(world, 0, { sel: [], gruppen: {} }), true);
});

test('Kampagne: Standhalten zaehlt die Zeit, der Gott schickt Wellen', () => {
  const m = missionVon('wut-des-waldes');
  const { world, ai } = missionsWelt(m);
  const stand = [false];
  const gerufen = () => world.entities.filter((e) => e.player === 1 && e.beschworen).length;
  for (let t = 0; t < 1800; t++) {
    stepAI(ai, world);
    if (world.tick === 600) assert.equal(gerufen(), 0);
    m.takt(world);
    if (world.tick === 600) assert.ok(gerufen() >= 4, 'erste Welle bei Minute 1');
    step(world);
  }
  assert.equal(missionPruefen(m, stand, world, 0, {}), false);
  world.tick = 6000;
  assert.equal(missionPruefen(m, stand, world, 0, {}), true);
});

test('Kampagne: Fortschritt wird gespeichert und schaltet die naechste Mission frei', () => {
  const speicher = {};
  globalThis.localStorage = { getItem: (k) => speicher[k] ?? null, setItem: (k, v) => (speicher[k] = String(v)) };
  try {
    assert.equal(kampagneStand(), 0);
    missionGeschafft(MISSIONEN[1]);
    assert.equal(kampagneStand(), 2);
    missionGeschafft(MISSIONEN[0]);
    assert.equal(kampagneStand(), 2, 'eine fruehere Mission setzt nicht zurueck');
  } finally {
    delete globalThis.localStorage;
  }
});

test('Kampagne: Wiederholung einer Mission -- gleiche Befehle, gleicher Ausgang', () => {
  const m = missionVon('der-waldgott');
  const lauf = () => {
    const { world, ai } = missionsWelt(m, 99);
    const held = world.entities.find((e) => e.type === 'held');
    for (let t = 0; t < 600; t++) {
      if (t === 10) issue(world, { type: 'move', player: 0, ids: [held.id], x: 9000, y: 9000 });
      stepAI(ai, world);
      step(world);
    }
    return hash(world);
  };
  assert.equal(lauf(), lauf());
});

test('Kampagne: Funksprueche kommen einzeln, der Reihe nach, jeder nur einmal', () => {
  for (const m of MISSIONEN) {
    assert.ok((m.meldungen || []).length >= 3, m.id + ': zu wenig Funksprueche');
    const { world } = missionsWelt(m);
    for (const mld of m.meldungen) {
      assert.ok(mld.wer && mld.text, m.id);
      mld.wann(world, 0, m.ziele.map(() => false)); // darf auf einer frischen Welt nicht werfen
    }
  }
  const m = missionVon('wut-des-waldes');
  const { world, ai } = missionsWelt(m);
  const gezeigt = [];
  const reihe = [];
  for (let t = 0; t < 700; t++) {
    const mld = naechsteMeldung(m, gezeigt, world, 0, [false]);
    if (mld) reihe.push(mld.wer + '@' + world.tick);
    stepAI(ai, world);
    m.takt(world);
    step(world);
  }
  assert.deepEqual(reihe, ['Vögtin Hedwig@30', 'Hauptmann Gerold@600']);
  assert.equal(naechsteMeldung(m, gezeigt, world, 0, [false]), null, 'nichts doppelt');
});
