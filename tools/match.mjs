// KI gegen KI, headless. Misst, was die Balance-Befunde in docs/scope.md
// behaupten, statt sie zu schaetzen. Beide Sitzplaetze, mehrere Seeds.
//
//   node tools/match.mjs            Standard: 3 Seeds, beide Sitzplaetze
//   node tools/match.mjs 10 30      10 Seeds, Abbruch nach 30 Minuten

import { createWorld, step, byId, anchorRadius, inDomain, inForeignDomain } from '../src/sim/sim.js';
import { createAI, stepAI } from '../src/sim/ai.js';
import { MAP } from '../src/sim/defs.js';

const seeds = Number(process.argv[2] ?? 3);
const maxMin = Number(process.argv[3] ?? 30);

function play(factions, seed) {
  const w = createWorld({ factions, seed });
  const ais = [createAI(0, seed), createAI(1, seed + 1)];
  const units = [{}, {}];
  const snaps = [];
  // Wo wird gekaempft? Schuesse aus eigener, fremder oder keiner Domaene.
  const schuss = [{ heim: 0, fremd: 0, alle: 0 }, { heim: 0, fremd: 0, alle: 0 }];
  while (!w.over && w.tick < maxMin * 600) {
    stepAI(ais[0], w);
    stepAI(ais[1], w);
    step(w);
    for (const ev of w.events) {
      if (ev.t === 'shot') {
        const sh = byId(w, ev.from);
        if (!sh) continue;
        const z = schuss[sh.player];
        z.alle++;
        if (inDomain(w, sh.player, sh.x, sh.y)) z.heim++;
        else if (inForeignDomain(w, sh.player, sh.x, sh.y)) z.fremd++;
        continue;
      }
      if (ev.t !== 'spawned') continue;
      const u = byId(w, ev.id);
      units[u.player][u.type] = (units[u.player][u.type] || 0) + 1;
    }
    if (w.tick % 1800 === 0) snaps.push(snapshot(w));
  }
  return { w, units, snaps, schuss };
}

/** Flaeche der Domaene in Hektar: Vereinigung der Kreise, auf 20-m-Raster. */
function vereinigung(w, player) {
  let n = 0;
  for (let y = 100; y < MAP; y += 200) for (let x = 100; x < MAP; x += 200) if (inDomain(w, player, x, y)) n++;
  return Math.round(n * 0.04);
}

function snapshot(w) {
  const per = w.players.map((p) => {
    const bs = w.entities.filter((e) => e.player === p.id && e.kind === 'building');
    const anker = bs.filter((e) => anchorRadius(w, e) > 0);
    const flaeche = vereinigung(w, p.id);
    return {
      fron: p.fron,
      bauten: bs.length,
      baustellen: bs.filter((e) => !e.done).length,
      anker: anker.length,
      ha: flaeche,
      einheiten: w.entities.filter((e) => e.player === p.id && e.kind === 'unit').length,
    };
  });
  return { min: w.tick / 600, per };
}

const fmtUnits = (u) =>
  Object.entries(u)
    .map(([k, v]) => `${k} ${v}`)
    .join(', ') || '—';

const wins = { mensch: 0, gott: 0, offen: 0 };
const ort = { mensch: { heim: 0, fremd: 0, alle: 0 }, gott: { heim: 0, fremd: 0, alle: 0 } };
const zeiten = [];
for (let s = 0; s < seeds; s++) {
  for (const f of [
    ['mensch', 'gott'],
    ['gott', 'mensch'],
  ]) {
    const seed = 1000 + s * 7;
    const { w, units, snaps, schuss } = play(f, seed);
    for (let p = 0; p < 2; p++) for (const k of ['heim', 'fremd', 'alle']) ort[f[p]][k] += schuss[p][k];
    const sieger = w.winner >= 0 ? w.players[w.winner].faction : 'offen';
    wins[sieger]++;
    if (w.winner >= 0) zeiten.push(w.tick / 600);
    console.log(
      `Seed ${seed} ${f[0]} vs ${f[1]}: ${sieger === 'offen' ? 'kein Sieger' : 'Sieger ' + sieger} nach ${(w.tick / 600).toFixed(1)} min`
    );
    for (let p = 0; p < 2; p++) console.log(`   ${f[p].padEnd(6)} produziert: ${fmtUnits(units[p])}`);
    for (const sn of snaps.slice(0, 4)) {
      const t = sn.per
        .map(
          (x, p) =>
            `${f[p]}: fron ${x.fron}, bauten ${x.bauten} (${x.baustellen} offen), anker ${x.anker} ${x.ha} ha, einh ${x.einheiten}`
        )
        .join(' | ');
      console.log(`   ${String(sn.min).padStart(2)} min  ${t}`);
    }
  }
}
const avg = zeiten.length ? (zeiten.reduce((a, b) => a + b, 0) / zeiten.length).toFixed(1) : '—';
console.log(`\nSiege: Menschen ${wins.mensch} · Gott ${wins.gott} · offen ${wins.offen} · Ø Dauer ${avg} min`);
for (const f of ['mensch', 'gott']) {
  const o = ort[f];
  const pct = (x) => (o.alle ? Math.round((100 * x) / o.alle) : 0) + ' %';
  console.log(
    `Schuesse ${f.padEnd(6)}: ${pct(o.heim)} aus eigener Domaene, ${pct(o.fremd)} aus fremder, ${pct(o.alle - o.heim - o.fremd)} aus Niemandsland`
  );
}
