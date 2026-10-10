// Parameter-Sweep: dieselben KI-Partien unter verschiedenen Einstellungen.
// Jede Einstellung laeuft in einem eigenen Worker mit eigener Kopie der
// Module -- Aenderungen an FACTIONS/UNITS/RULES bleiben dort.
//
//   node tools/sweep.mjs                    alle Einstellungen, 12 Seeds
//   node tools/sweep.mjs 6 45 malus         nur Einstellungen mit "malus" im Namen
//
// Ausgabe je Einstellung: Siege Menschen : Gott, Sitzplatz-Bilanz, Dauer,
// und jede einzelne Partie als <Sieger><Minute>, z. B. G21 = Gott nach 21 min.

import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { availableParallelism } from 'node:os';

// Name -> Aenderungen. g/m: Wachstum Gott/Menschen, hb: homeBonus, rules: RULES.
export const CONFIGS = {
  Ausgang: {},
  'homeBonus 1250': { hb: 1250 },
  'homeBonus 1300 + Gott start 1000': { hb: 1300, g: { start: 1000 } },
  'Gott start 1000': { g: { start: 1000 } },
  'Gott max 3900': { g: { max: 3900 } },
  'Gott max 7000': { g: { max: 7000 } },
  'malus 800': { rules: { fremdMalus: 800 } },
  'malus 650': { rules: { fremdMalus: 650 } },
  'malus 800 + homeBonus 1250': { rules: { fremdMalus: 800 }, hb: 1250 },
};

const SEEDS = [11, 23, 37, 41, 53, 67, 71, 89, 97, 101, 113, 127, 131, 149, 157, 163];

if (isMainThread) {
  const nSeeds = Number(process.argv[2] ?? 12);
  const maxMin = Number(process.argv[3] ?? 45);
  const filter = process.argv[4] ?? '';
  const names = Object.keys(CONFIGS).filter((n) => n.includes(filter));
  const seeds = SEEDS.slice(0, nSeeds);
  const limit = Math.max(1, availableParallelism() - 1);

  const results = {};
  let next = 0;
  const run = () =>
    new Promise((resolve) => {
      const step = () => {
        if (next >= names.length) return resolve();
        const name = names[next++];
        const w = new Worker(new URL(import.meta.url), { workerData: { name, seeds, maxMin } });
        w.on('message', (r) => (results[name] = r));
        w.on('error', (e) => (results[name] = { error: e.message }));
        w.on('exit', step);
      };
      step();
    });
  await Promise.all(Array.from({ length: Math.min(limit, names.length) }, run));

  console.log(`${seeds.length} Seeds × 2 Sitzplätze, Abbruch nach ${maxMin} min\n`);
  for (const name of names) {
    const r = results[name];
    if (r.error) {
      console.log(name.padEnd(34), 'FEHLER', r.error);
      continue;
    }
    console.log(
      name.padEnd(34),
      `M ${String(r.m).padStart(2)} : G ${String(r.g).padStart(2)}`,
      ` Sitz 0 gewinnt ${r.seat0}/${r.n}`,
      ` Ø ${r.avg} min`
    );
    console.log(' '.repeat(35) + r.games.join(' '));
  }
} else {
  const { name, seeds, maxMin } = workerData;
  const { createWorld, step } = await import('../src/sim/sim.js');
  const { createAI, stepAI } = await import('../src/sim/ai.js');
  const { FACTIONS, UNITS, RULES } = await import('../src/sim/defs.js');
  const c = CONFIGS[name];
  Object.assign(FACTIONS.gott.growth, c.g || {});
  Object.assign(FACTIONS.mensch.growth, c.m || {});
  if (c.hb !== undefined) {
    for (const k of Object.keys(UNITS)) if (UNITS[k].homeBonus) UNITS[k].homeBonus = c.hb;
  }
  Object.assign(RULES, c.rules || {});

  const games = [];
  let m = 0;
  let g = 0;
  let seat0 = 0;
  let n = 0;
  let sum = 0;
  for (const seed of seeds) {
    for (const f of [
      ['mensch', 'gott'],
      ['gott', 'mensch'],
    ]) {
      const w = createWorld({ factions: f, seed });
      const ais = [createAI(0, seed), createAI(1, seed + 1)];
      while (!w.over && w.tick < maxMin * 600) {
        stepAI(ais[0], w);
        stepAI(ais[1], w);
        step(w);
      }
      const min = Math.round(w.tick / 600);
      if (!w.over) {
        games.push('—' + min);
        continue;
      }
      const fac = w.players[w.winner].faction;
      games.push((fac === 'mensch' ? 'M' : 'G') + min);
      if (fac === 'mensch') m++;
      else g++;
      if (w.winner === 0) seat0++;
      n++;
      sum += w.tick / 600;
    }
  }
  parentPort.postMessage({ m, g, seat0, n, avg: n ? (sum / n).toFixed(1) : '—', games });
}
