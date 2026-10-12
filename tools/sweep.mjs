// Parameter-Sweep: dieselben KI-Partien unter verschiedenen Einstellungen.
// Jede Einstellung laeuft in einem eigenen Worker mit eigener Kopie der
// Module -- Aenderungen an FACTIONS/UNITS/RULES bleiben dort.
//
//   node tools/sweep.mjs                    alle Einstellungen, 12 Seeds
//   node tools/sweep.mjs 6 45 malus         nur Einstellungen mit "malus" im Namen
//   node tools/sweep.mjs 32 45 Ausgang stile karte=flusstal   auf einer anderen Karte
//   node tools/sweep.mjs 32 45 Ausgang stile karte=zufall     jede Partie eine Zufallskarte
//   node tools/sweep.mjs 32 45 Ausgang stile voelker=tod-mensch  andere Volks-Paarung (Standard mensch-gott)
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
  // Balance 0.30 (Nebel, Spaeher): Die Menschen liegen hinten -- welche
  // Stellschraube bringt sie heran? Je eine Aenderung, sonst wie Ausgang.
  'B30 Ausgang': {},
  'B30 Gott-Schreine wie Menschen': { buildings: { dornenschrein: { buff: { zorn: 250 } }, steinkreis: { buff: { wehr: 200 } } } },
  'B30 Menschen-Schreine staerker': { buildings: { banner: { buff: { zorn: 350 } }, kapelle: { buff: { wehr: 250 } } } },
  'B30 Soldat 240 LP': { units: { soldat: { hp: 240 } } },
  'B30 Jaeger 15 Schaden': { units: { jaeger: { weapon: { damage: 15 } } } },
  'B30 Menschen-Unterhalt -25%': { units: { bauer: { unterhalt: 3 }, soldat: { unterhalt: 7 }, jaeger: { unterhalt: 8 }, soeldner: { unterhalt: 18 } } },
  'B30 Wolf 500 LP': { units: { wolf: { hp: 500 } } },
  'ohne Blutkosten': { units: { soeldner: { cost: { resonit: 0 } }, ent: { cost: { resonit: 0 } } } },
  // Kommandant: langsamer bzw. weniger zaeh -- macht das den Vorstoss riskanter?
  'Kdt langsam': { units: { held: { speed: 16 }, waldgott: { speed: 15 } } },
  'Kdt 4000 HP': { units: { held: { hp: 4000 }, waldgott: { hp: 4000 } } },
  'Kdt langsam + 4000 HP': { units: { held: { speed: 16, hp: 4000 }, waldgott: { speed: 15, hp: 4000 } } },
  'ohne Kommandant': { rules: { kommandanten: false } },
  // Wracks und Bergung (R1): ohne Wracks wie vor R1; sonst andere Anteile als im Ausgang
  'R1 ohne Wracks': { rules: { wrackAnteil: 0, wrackAnteilGebaeude: 0 } },
  'R1 Wracks 400': { rules: { wrackAnteil: 400, wrackAnteilGebaeude: 300 } },
  'R1 Wracks 1000': { rules: { wrackAnteil: 1000, wrackAnteilGebaeude: 700 } },
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
  // Karte (0.22): ohne Grat vor den Basen, ganz ohne Hindernisse
  'Tod perTod 120': { t: { perTod: 120 } },
  'Tod perTod 260': { t: { perTod: 260 } },
  'Tod start 2000': { t: { start: 2000 } },
  'Karte ohne Grat': { karte: 'ohneGrat' },
  'Karte ohne Hindernisse': { karte: 'leer' },
  'Karte leer, Adern wie 0.21': { karte: 'alt' },
  // Menschen nach der Trennung uebereinanderstehender Einheiten (0.22)
  'M: Soldat 240 LP, Jaeger 210': { units: { soldat: { hp: 240 }, jaeger: { hp: 210 } } },
  'M: Soldat 11 Schaden': { units: { soldat: { weapon: { damage: 11 } } } },
  'M: Soldat 240 LP 10 Schaden': { units: { soldat: { hp: 240, weapon: { damage: 10 } } } },
  'M: Bauer 550': { units: { bauer: { build: { power: 550 } } } },
  'Wolf 540 + Soldat 230': { units: { wolf: { hp: 540 }, soldat: { hp: 230 } } },
  'Wolf 500 LP': { units: { wolf: { hp: 500 } } },
  'Wolf 520 LP': { units: { wolf: { hp: 520 } } },
  'Wolf 540 + Soldat 215': { units: { wolf: { hp: 540 }, soldat: { hp: 215 } } },
  // Nah-/Fernkampf (0.17): Werte nachziehen
  'Wolf 24 Schaden': { units: { wolf: { weapon: { damage: 24 } } } },
  'Soldat 8 Schaden': { units: { soldat: { weapon: { damage: 8 } } } },
  'Waldgeist 30 Schaden': { units: { waldgeist: { weapon: { damage: 30 } } } },
  'Jaeger 12 Schaden': { units: { jaeger: { weapon: { damage: 12 } } } },
  'Jaeger 15 Schaden': { units: { jaeger: { weapon: { damage: 15 } } } },
  'Waldgeist 22 Schaden': { units: { waldgeist: { weapon: { damage: 22 } } } },
  'Waldgeist 26 Schaden': { units: { waldgeist: { weapon: { damage: 26 } } } },
  'Turm 200 Bauzeit': { buildings: { wachturm: { buildTime: 200 }, waechterbaum: { buildTime: 200 } } },
  'Dryade 650': { units: { dryade: { build: { power: 650 } } } },
  'Wolf 540 LP': { units: { wolf: { hp: 540 } } },
  // Baukraft der Arbeiter (0.16): seit nur noch Erbauer bauen
  'Bauer 500': { units: { bauer: { build: { power: 500 } } } },
  'Bauer 600': { units: { bauer: { build: { power: 600 } } } },
  'Dryade 600': { units: { dryade: { build: { power: 600 } } } },
  // Skillbaum (0.14): aus = alles frei, keine Verbesserungen
  'ohne Skills': { rules: { skills: false } },
  // Erfahrung (0.13): aus, doppelt
  'ohne Erfahrung': { rules: { erfahrungProMin: 0 } },
  'Erfahrung doppelt': { rules: { erfahrungProMin: 20, erfahrungMax: 200 } },
  // Schrein-Umkreis (0.12): klein, gross, ganze Domaene
  'Schreine 2000': { buildings: schreinRadius(2000) },
  'Schreine 4500': { buildings: schreinRadius(4500) },
  'Schreine ueberall': { buildings: schreinRadius(30000) },
  'Gott-Schreine 350/250': { buildings: { dornenschrein: { buff: { zorn: 350 } }, steinkreis: { buff: { wehr: 250 } } } },
  // Unterhalt (0.12): ohne, halb, doppelt
  'Unterhalt 0': { units: unterhalt(0) },
  'Unterhalt halb': { units: unterhalt(0.5) },
  'Unterhalt doppelt': { units: unterhalt(2) },
  // Grunddomaene der Hauptgebaeude (0.12)
  'ohne anchorMin': { buildings: { halle: { anchorMin: 0 }, herzbaum: { anchorMin: 0 } } },
  'anchorMin 3000': { buildings: { halle: { anchorMin: 3000 }, herzbaum: { anchorMin: 3000 } } },
  'anchorMin nur Menschen': { buildings: { herzbaum: { anchorMin: 0 } } },
};

/** Umkreis aller vier Schreine -- fuer die Configs oben. */
function schreinRadius(r) {
  return Object.fromEntries(['banner', 'kapelle', 'dornenschrein', 'steinkreis'].map((b) => [b, { buff: { radius: r } }]));
}

/** Unterhalt aller Einheiten mit einem Faktor -- fuer die Configs oben. */
function unterhalt(f) {
  const u = { bauer: 4, soldat: 9, jaeger: 10, soeldner: 24, dryade: 12, wolf: 24, waldgeist: 24, ent: 56 };
  return Object.fromEntries(Object.entries(u).map(([k, v]) => [k, { unterhalt: Math.round(v * f) }]));
}

// Feste Seed-Reihe, damit Laeufe vergleichbar bleiben.
const SEEDS = Array.from({ length: 200 }, (_, i) => 11 + i * 12);

if (isMainThread) {
  const nSeeds = Number(process.argv[2] ?? 12);
  const maxMin = Number(process.argv[3] ?? 45);
  const filter = process.argv[4] ?? '';
  const stile = process.argv[5] === 'stile';
  const stufen = process.argv[5] === 'stufen';
  const karte = (process.argv.find((a) => a.startsWith('karte=')) || 'karte=klassisch').slice(6);
  const spieler = Number((process.argv.find((a) => a.startsWith('spieler=')) || 'spieler=2').slice(8));
  // Mit mehr als zwei Spielern spielt jeder gegen jeden; Voelker reihum, wenn weniger genannt sind als Spieler
  const voelker = (process.argv.find((a) => a.startsWith('voelker=')) || (spieler > 2 ? 'voelker=mensch-gott-tod' : 'voelker=mensch-gott')).slice(8).split('-');
  const names = Object.keys(CONFIGS).filter((n) => n.includes(filter));
  const seeds = SEEDS.slice(0, nSeeds);
  const limit = Math.max(1, availableParallelism() - 1);

  // Jede Einstellung in Seed-Stuecke teilen, damit auch eine einzelne
  // Einstellung alle Kerne nutzt. Die Stuecke behalten ihre Seed-Position,
  // damit die Stil-Paarungen reihum dieselben bleiben.
  const stuecke = Math.max(1, Math.ceil((limit * 2) / names.length));
  const jobs = [];
  for (const name of names) {
    const groesse = Math.ceil(seeds.length / stuecke);
    for (let a = 0; a < seeds.length; a += groesse) jobs.push({ name, ab: a, seeds: seeds.slice(a, a + groesse) });
  }
  const teile = {};
  let next = 0;
  const run = () =>
    new Promise((resolve) => {
      const step = () => {
        if (next >= jobs.length) return resolve();
        const job = jobs[next++];
        const w = new Worker(new URL(import.meta.url), { workerData: { ...job, maxMin, stile, stufen, karte, voelker, spieler } });
        (teile[job.name] = teile[job.name] || []).push({ ab: job.ab, r: null });
        const platz = teile[job.name][teile[job.name].length - 1];
        w.on('message', (r) => (platz.r = r));
        w.on('error', (e) => (platz.r = { error: e.message }));
        w.on('exit', step);
      };
      step();
    });
  await Promise.all(Array.from({ length: Math.min(limit, jobs.length) }, run));

  // Stuecke einer Einstellung wieder zusammenfuehren
  const results = {};
  for (const name of names) {
    const liste = teile[name].sort((a, b) => a.ab - b.ab).map((t) => t.r);
    const fehler = liste.find((r) => r.error);
    if (fehler) {
      results[name] = fehler;
      continue;
    }
    if (spieler > 2) {
      const r = { mehr: true, siegeVolk: Array(spieler).fill(0), siegeSitz: Array(spieler).fill(0), n: 0, sum: 0, games: [] };
      for (const t of liste) {
        t.siegeVolk.forEach((v, i) => (r.siegeVolk[i] += v));
        t.siegeSitz.forEach((v, i) => (r.siegeSitz[i] += v));
        r.n += t.n;
        r.sum += t.sum;
        r.games.push(...t.games);
      }
      r.avg = r.n ? (r.sum / r.n).toFixed(1) : '—';
      results[name] = r;
      continue;
    }
    const r = { m: 0, g: 0, seat0: 0, n: 0, sum: 0, games: [], resonit: { a: [], b: [] }, paar: {} };
    for (const t of liste) {
      r.m += t.m;
      r.g += t.g;
      r.seat0 += t.seat0;
      r.n += t.n;
      r.sum += t.sum;
      r.games.push(...t.games);
      r.resonit.a.push(...t.resonit.a);
      r.resonit.b.push(...t.resonit.b);
      for (const [k, z] of Object.entries(t.paar)) {
        r.paar[k] = r.paar[k] || { m: 0, n: 0 };
        r.paar[k].m += z.m;
        r.paar[k].n += z.n;
      }
    }
    const median = (a) => (a.length ? a.sort((x, y) => x - y)[a.length >> 1].toFixed(1) : '—');
    r.avg = r.n ? (r.sum / r.n).toFixed(1) : '—';
    r.resonitInfo = `Blut: ${voelker[0]} ${r.resonit.a.length}× ab ${median(r.resonit.a)}, ${voelker[1]} ${r.resonit.b.length}× ab ${median(r.resonit.b)} min`;
    results[name] = r;
  }

  if (spieler > 2) {
    const liste = Array.from({ length: spieler }, (_, i) => voelker[i % voelker.length]);
    console.log(`${seeds.length} Seeds × ${spieler} Drehungen, jeder gegen jeden, Abbruch nach ${maxMin} min${stile ? ', Stile reihum' : ''}, Karte ${karte}, Völker ${liste.map((v, i) => `V${i + 1}=${v}`).join(' ')}\n`);
  } else console.log(`${seeds.length} Seeds × 2 Sitzplätze, Abbruch nach ${maxMin} min${stile ? ', Stil-Paarungen reihum' : ''}, Karte ${karte}, ${voelker[0]} (M) gegen ${voelker[1]} (G)\n`);
  for (const name of names) {
    const r = results[name];
    if (r.error) {
      console.log(name.padEnd(34), 'FEHLER', r.error);
      continue;
    }
    if (r.mehr) {
      console.log(name.padEnd(34), `Siege je Volk: ${r.siegeVolk.map((v, i) => `V${i + 1} ${v}`).join(' · ')}`, ` je Sitz: ${r.siegeSitz.map((v, i) => `${i}: ${v}`).join(' · ')}`, ` Ø ${r.avg} min`);
      console.log(' '.repeat(35) + r.games.join(' '));
      continue;
    }
    console.log(
      name.padEnd(34),
      `M ${String(r.m).padStart(2)} : G ${String(r.g).padStart(2)}`,
      ` Sitz 0 gewinnt ${r.seat0}/${r.n}`,
      ` Ø ${r.avg} min`,
      ` ${r.resonitInfo}`
    );
    console.log(' '.repeat(35) + r.games.join(' '));
    if (stufen && names.length === 1) {
      // Siegquote der staerkeren Stufe je Paarung, ueber beide Fraktionen und Sitzplaetze
      console.log('');
      for (const [k, z] of Object.entries(r.paar)) console.log(`  ${k.padEnd(16)} ${Math.round((100 * z.m) / z.n)} % von ${z.n}`);
    }
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
  const { name, seeds, ab, maxMin, stile, stufen, karte, voelker, spieler } = workerData;
  const [A, B] = voelker; // in der Ausgabe "M" und "G"
  const { createWorld, step } = await import('../src/sim/sim.js');
  const { zufallsKarte } = await import('../src/sim/kartenbau.js');
  const { createAI, stepAI, STILE } = await import('../src/sim/ai.js');
  const stilNamen = Object.keys(STILE);
  const { FACTIONS, UNITS, BUILDINGS, RULES, KARTEN } = await import('../src/sim/defs.js');
  const KARTE = KARTEN.klassisch; // die alten Karten-Versuche aendern die klassische Karte
  const c = CONFIGS[name];
  Object.assign(FACTIONS.gott.growth, c.g || {});
  Object.assign(FACTIONS.mensch.growth, c.m || {});
  Object.assign(FACTIONS.tod.growth, c.t || {});
  Object.assign(RULES, c.rules || {});
  // units/buildings: { typ: { feld: wert } } -- Objekte werden zusammengefuehrt, Zahlen ersetzt
  const mische = (ziel, aenderung) => {
    for (const [t, werte] of Object.entries(aenderung || {})) {
      for (const [k, v] of Object.entries(werte)) {
        if (typeof v === 'object' && ziel[t][k]) Object.assign(ziel[t][k], v);
        else ziel[t][k] = v;
      }
    }
  };
  // Karte: Grat vor den Basen weg (Felsen auf x+y = 13000 bzw. 27000) oder alles weg
  if (c.karte === 'ohneGrat') KARTE.hindernisse = KARTE.hindernisse.filter((h) => h.art !== 'fels' || (Math.abs(h.x + h.y - 13000) > 100 && Math.abs(h.x + h.y - 27000) > 100));
  if (c.karte === 'leer' || c.karte === 'alt') KARTE.hindernisse = [];
  if (c.karte === 'alt') {
    const f = (x, y) => ({ x, y, kind: 'masse' });
    KARTE.adern = [f(4800, 2200), f(2200, 4800), f(6200, 4500), f(15200, 17800), f(17800, 15200), f(13800, 15500), f(10000, 7400), f(10000, 12600),
      { x: 10000, y: 10000, kind: 'resonit' }, { x: 6600, y: 13400, kind: 'resonit' }, { x: 13400, y: 6600, kind: 'resonit' }];
  }
  mische(UNITS, c.units);
  mische(BUILDINGS, c.buildings);

  /**
   * Jeder gegen jeden mit N Spielern (spieler=3 karte=dreiReiche): je Seed spielt
   * jedes Volk der Liste auf jedem Sitz (N Partien, die Liste dreht sich), die Stile
   * wechseln reihum. Ausgewertet wird, welcher Platz der Volksliste gewinnt (V1, V2 ...)
   * und welcher Sitz.
   */
  async function mehrspieler() {
    const liste = Array.from({ length: spieler }, (_, i) => voelker[i % voelker.length]);
    const siegeVolk = Array(spieler).fill(0);
    const siegeSitz = Array(spieler).fill(0);
    let n = 0;
    let sum = 0;
    const games = [];
    for (let k = 0; k < seeds.length; k++) {
      const seed = seeds[k];
      for (let dreh = 0; dreh < spieler; dreh++) {
        const nr = Array.from({ length: spieler }, (_, i) => (i + dreh) % spieler); // Platz der Volksliste je Sitz
        const f = nr.map((i) => liste[i]);
        const w = createWorld({ factions: f, seed, karte });
        const st = stile ? nr.map((_, i) => stilNamen[(ab + k + i) % 3]) : nr.map(() => 'standard');
        const ais = f.map((_, i) => createAI(i, seed + i, st[i]));
        while (!w.over && w.tick < maxMin * 600) {
          for (const a of ais) stepAI(a, w);
          step(w);
        }
        const min = Math.round(w.tick / 600);
        if (!w.over || w.winner < 0) {
          games.push('—' + min);
          continue;
        }
        siegeVolk[nr[w.winner]]++;
        siegeSitz[w.winner]++;
        games.push(`V${nr[w.winner] + 1}s${w.winner}-${min}`);
        n++;
        sum += w.tick / 600;
      }
    }
    return { mehr: true, siegeVolk, siegeSitz, n, sum, games };
  }

  if (spieler > 2) {
    parentPort.postMessage(await mehrspieler());
  } else {
    const games = [];
    let m = 0;
    let g = 0;
    let seat0 = 0;
    let n = 0;
    let sum = 0;
    // Erste Minute mit Goetterblut je Fraktion, nur Partien, in denen es dazu kam.
    const resonit = { a: [], b: [] };
    // Siege der Menschen je Paarung "menschStil/gottStil"
    const paar = {};
    for (let k = 0; k < seeds.length; k++) {
      const seed = seeds[k];
      // Mit "stile": Paarung reihum; der Stil gehoert zur Fraktion, nicht zum
      // Sitzplatz, beide Sitzplaetze spielen dieselbe Paarung.
      const i = ab + k;
      const st = stile ? { [A]: stilNamen[i % 3], [B]: stilNamen[((i / 3) | 0) % 3] } : { [A]: 'standard', [B]: 'standard' };
      for (const f of [
        [A, B],
        [B, A],
      ]) {
        // karte=zufall: jede Partie auf einer eigenen Zufallskarte (zur Seed-Zahl)
        const w = karte === 'zufall' ? createWorld({ factions: f, seed, karte, karteDaten: zufallsKarte(seed) }) : createWorld({ factions: f, seed, karte });
        // Mit "stufen": je Seed eine Paarung -- schwer gegen mittel, mittel gegen leicht --,
        // die staerkere Stufe wechselt die Fraktion mit dem Sitzplatz.
        const paarung = [['schwer', 'mittel'], ['mittel', 'leicht']][(ab + k) % 2];
        const sf = f[0] === A ? 0 : 1; // Sitz von Volk A
        const stufeVon = (p) => (!stufen ? 'mittel' : (p === sf) === ((ab + k) % 4 < 2) ? paarung[0] : paarung[1]);
        const ais = [createAI(0, seed, st[f[0]], stufeVon(0)), createAI(1, seed + 1, st[f[1]], stufeVon(1))];
        const erst = [-1, -1];
        while (!w.over && w.tick < maxMin * 600) {
          stepAI(ais[0], w);
          stepAI(ais[1], w);
          step(w);
          for (let p = 0; p < 2; p++) if (erst[p] < 0 && w.players[p].resonit > 0) erst[p] = w.tick;
        }
        for (let p = 0; p < 2; p++) if (erst[p] >= 0) resonit[p === sf ? 'a' : 'b'].push(erst[p] / 600);
        const min = Math.round(w.tick / 600);
        if (!w.over) {
          games.push('—' + min);
          continue;
        }
        const gewinnerA = w.winner === sf; // auch bei gleichem Volk auf beiden Seiten eindeutig
        // Bei "stufen": paar zaehlt Siege der staerkeren Stufe je Paarung (Feld m).
        const pk = stufen ? paarung.join(' > ') : st[A] + '/' + st[B];
        paar[pk] = paar[pk] || { m: 0, n: 0 };
        paar[pk].n++;
        if (stufen ? stufeVon(w.winner) === paarung[0] : gewinnerA) paar[pk].m++;
        games.push((gewinnerA ? 'M' : 'G') + min);
        if (gewinnerA) m++;
        else g++;
        if (w.winner === 0) seat0++;
        n++;
        sum += w.tick / 600;
      }
    }
    parentPort.postMessage({ m, g, seat0, n, sum, games, resonit, paar });
  }
}
