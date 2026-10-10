// Parameter-Sweep: dieselben KI-Partien unter verschiedenen Einstellungen.
// Jede Einstellung laeuft in einem eigenen Worker mit eigener Kopie der
// Module -- Aenderungen an FACTIONS/UNITS/RULES bleiben dort.
//
//   node tools/sweep.mjs                    alle Einstellungen, 12 Seeds
//   node tools/sweep.mjs 6 45 malus         nur Einstellungen mit "malus" im Namen
//   node tools/sweep.mjs 40 45 "" stile     jede Partie mit einer der neun
//                                           Stil-Paarungen (sturm/standard/burg)
//
// Ausgabe je Einstellung: Siege Menschen : Gott, Sitzplatz-Bilanz, Dauer,
// und jede einzelne Partie als <Sieger><Minute>, z. B. G21 = Gott nach 21 min.

import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { availableParallelism } from 'node:os';

// Name -> Aenderungen. g/m: Wachstum Gott/Menschen, rules: RULES, units/buildings: Werte.
export const CONFIGS = {
  Ausgang: {},
  'ohne Blutkosten': { units: { soeldner: { cost: { goetterblut: 0 } }, ent: { cost: { goetterblut: 0 } } } },
  // Kommandant: langsamer bzw. weniger zaeh -- macht das den Vorstoss riskanter?
  'Kdt langsam': { units: { held: { speed: 16 }, waldgott: { speed: 15 } } },
  'Kdt 4000 HP': { units: { held: { hp: 4000 }, waldgott: { hp: 4000 } } },
  'Kdt langsam + 4000 HP': { units: { held: { speed: 16, hp: 4000 }, waldgott: { speed: 15, hp: 4000 } } },
  'ohne Kommandant': { rules: { kommandanten: false } },
  'Gott start 850': { g: { start: 850 } },
  'Gott start 900': { g: { start: 900 } },
  'Gott start 925': { g: { start: 925 } },
  'Gott start 950': { g: { start: 950 } },
  'Gott start 975': { g: { start: 975 } },
  'Gott start 1000': { g: { start: 1000 } },
  'Gott max 3900': { g: { max: 3900 } },
  'Gott max 7000': { g: { max: 7000 } },
  'Ankerkraft 1': { rules: { ankerKraft: 1 } },
  'Ankerkraft 1 + max 3900': { rules: { ankerKraft: 1 }, g: { max: 3900 } },
  'Ankerkraft 1 + max 7000': { rules: { ankerKraft: 1 }, g: { max: 7000 } },
  'Ankerkraft 2': { rules: { ankerKraft: 2 } },
  // Schreine: staerker bzw. ohne Wirkung -- wie viel traegt der Heimvorteil?
  'Schreine aus': { buildings: { banner: { buff: { zorn: 0 } }, kapelle: { buff: { wehr: 0 } }, dornenschrein: { buff: { zorn: 0 } }, steinkreis: { buff: { wehr: 0 } } } },
  'Gott-Schreine wie Menschen': { buildings: { dornenschrein: { buff: { zorn: 250 } }, steinkreis: { buff: { wehr: 200 } } } },
  // Lange Partien: Hauptgebaeude vierfach so zaeh -- zaehlt max dann?
  'lang': { buildings: { halle: { hp: 20000 }, herzbaum: { hp: 20000 } } },
  'lang + max 3900': { buildings: { halle: { hp: 20000 }, herzbaum: { hp: 20000 } }, g: { max: 3900 } },
  'lang + max 7000': { buildings: { halle: { hp: 20000 }, herzbaum: { hp: 20000 } }, g: { max: 7000 } },
  'malus 800': { rules: { fremdMalus: 800 } },
  'malus 650': { rules: { fremdMalus: 650 } },
};

// Feste Seed-Reihe, damit Laeufe vergleichbar bleiben.
const SEEDS = Array.from({ length: 200 }, (_, i) => 11 + i * 12);

if (isMainThread) {
  const nSeeds = Number(process.argv[2] ?? 12);
  const maxMin = Number(process.argv[3] ?? 45);
  const filter = process.argv[4] ?? '';
  const stile = process.argv[5] === 'stile';
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
        const w = new Worker(new URL(import.meta.url), { workerData: { name, seeds, maxMin, stile } });
        w.on('message', (r) => (results[name] = r));
        w.on('error', (e) => (results[name] = { error: e.message }));
        w.on('exit', step);
      };
      step();
    });
  await Promise.all(Array.from({ length: Math.min(limit, names.length) }, run));

  console.log(`${seeds.length} Seeds × 2 Sitzplätze, Abbruch nach ${maxMin} min${stile ? ', Stil-Paarungen reihum' : ''}\n`);
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
      ` Ø ${r.avg} min`,
      ` ${r.blutInfo}`
    );
    console.log(' '.repeat(35) + r.games.join(' '));
    if (stile && names.length === 1) {
      // Matrix: Zeilen = Stil der Menschen, Spalten = Stil des Gottes, Siegquote Menschen
      const st = ['sturm', 'standard', 'burg'];
      console.log('');
      console.log('  Siegquote Menschen   Gott: ' + st.map((x) => x.padStart(9)).join(''));
      for (const ms of st) {
        const zellen = st.map((gs) => {
          const z = r.paar[ms + '/' + gs];
          return (z ? Math.round((100 * z.m) / z.n) + ' %' : '—').padStart(9);
        });
        console.log('  Menschen ' + ms.padEnd(10) + '        ' + zellen.join(''));
      }
    }
  }
} else {
  const { name, seeds, maxMin, stile } = workerData;
  const { createWorld, step } = await import('../src/sim/sim.js');
  const { createAI, stepAI, STILE } = await import('../src/sim/ai.js');
  const stilNamen = Object.keys(STILE);
  const { FACTIONS, UNITS, BUILDINGS, RULES } = await import('../src/sim/defs.js');
  const c = CONFIGS[name];
  Object.assign(FACTIONS.gott.growth, c.g || {});
  Object.assign(FACTIONS.mensch.growth, c.m || {});
  Object.assign(RULES, c.rules || {});
  // units: { typ: { feld: wert } } -- Objekte werden zusammengefuehrt, Zahlen ersetzt
  for (const [u, werte] of Object.entries(c.units || {})) {
    for (const [k, v] of Object.entries(werte)) {
      if (typeof v === 'object') Object.assign(UNITS[u][k], v);
      else UNITS[u][k] = v;
    }
  }
  for (const [b, werte] of Object.entries(c.buildings || {})) Object.assign(BUILDINGS[b], werte);

  const games = [];
  let m = 0;
  let g = 0;
  let seat0 = 0;
  let n = 0;
  let sum = 0;
  // Erste Minute mit Goetterblut je Fraktion, nur Partien, in denen es dazu kam.
  const blut = { mensch: [], gott: [] };
  // Siege der Menschen je Paarung "menschStil/gottStil"
  const paar = {};
  for (let k = 0; k < seeds.length; k++) {
    const seed = seeds[k];
    // Mit "stile": Paarung reihum; der Stil gehoert zur Fraktion, nicht zum
    // Sitzplatz, beide Sitzplaetze spielen dieselbe Paarung.
    const st = stile ? { mensch: stilNamen[k % 3], gott: stilNamen[((k / 3) | 0) % 3] } : { mensch: 'standard', gott: 'standard' };
    for (const f of [
      ['mensch', 'gott'],
      ['gott', 'mensch'],
    ]) {
      const w = createWorld({ factions: f, seed });
      const ais = [createAI(0, seed, st[f[0]]), createAI(1, seed + 1, st[f[1]])];
      const erst = [-1, -1];
      while (!w.over && w.tick < maxMin * 600) {
        stepAI(ais[0], w);
        stepAI(ais[1], w);
        step(w);
        for (let p = 0; p < 2; p++) if (erst[p] < 0 && w.players[p].goetterblut > 0) erst[p] = w.tick;
      }
      for (let p = 0; p < 2; p++) if (erst[p] >= 0) blut[f[p]].push(erst[p] / 600);
      const min = Math.round(w.tick / 600);
      if (!w.over) {
        games.push('—' + min);
        continue;
      }
      const fac = w.players[w.winner].faction;
      const pk = st.mensch + '/' + st.gott;
      paar[pk] = paar[pk] || { m: 0, n: 0 };
      paar[pk].n++;
      if (fac === 'mensch') paar[pk].m++;
      games.push((fac === 'mensch' ? 'M' : 'G') + min);
      if (fac === 'mensch') m++;
      else g++;
      if (w.winner === 0) seat0++;
      n++;
      sum += w.tick / 600;
    }
  }
  const median = (a) => (a.length ? a.sort((x, y) => x - y)[a.length >> 1].toFixed(1) : '—');
  const blutInfo = `Blut: M ${blut.mensch.length}× ab ${median(blut.mensch)}, G ${blut.gott.length}× ab ${median(blut.gott)} min`;
  parentPort.postMessage({ m, g, seat0, n, avg: n ? (sum / n).toFixed(1) : '—', games, blutInfo, paar });
}
