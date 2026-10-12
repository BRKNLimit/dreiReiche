// KI gegen KI, headless. Misst, was die Balance-Befunde in docs/scope.md
// behaupten, statt sie zu schaetzen. Beide Sitzplaetze, mehrere Seeds.
//
//   node tools/match.mjs            Standard: 3 Seeds, beide Sitzplaetze
//   node tools/match.mjs 10 30      10 Seeds, Abbruch nach 30 Minuten
//   node tools/match.mjs 3 40 spieler=3 karte=dreiReiche    jeder gegen jeden, 3 Spieler
//   node tools/match.mjs 3 40 spieler=4 karte=vierlande     ... und 4 (Voelker reihum, Sitz reihum)

import { createWorld, step, byId, anchorRadius, inDomain, inForeignDomain } from '../src/sim/sim.js';
import { createAI, stepAI } from '../src/sim/ai.js';
import { MAP } from '../src/sim/defs.js';

const zahlen = process.argv.slice(2).filter((a) => !a.includes('='));
const opt = (name, std) => (process.argv.find((a) => a.startsWith(name + '=')) || '').slice(name.length + 1) || std;
const seeds = Number(zahlen[0] ?? 3);
const maxMin = Number(zahlen[1] ?? 30);
const spieler = Number(opt('spieler', 2));
const karteName = opt('karte', spieler === 4 ? 'vierlande' : spieler === 3 ? 'dreiReiche' : 'klassisch');

if (spieler > 2) {
  mehrspieler();
  process.exit(0);
}

/** Jeder gegen jeden: Voelker reihum (mensch, gott, tod, mensch ...), je Seed um einen Sitz verschoben. */
function mehrspieler() {
  const reihe = ['mensch', 'gott', 'tod', 'mensch'];
  const siege = {};
  const sitze = Array(spieler).fill(0);
  let offen = 0;
  for (let s = 0; s < seeds; s++) {
    const seed = 1000 + s * 7;
    const f = Array.from({ length: spieler }, (_, i) => reihe[(i + s) % reihe.length]);
    const w = createWorld({ factions: f, seed, karte: karteName });
    const stile = ['sturm', 'standard', 'burg'];
    const ais = f.map((_, i) => createAI(i, seed + i, stile[(i + s) % 3]));
    const aus = [];
    while (!w.over && w.tick < maxMin * 600) {
      for (const a of ais) stepAI(a, w);
      step(w);
      for (const ev of w.events) if (ev.t === 'ausgeschieden') aus.push(`${f[ev.player]}(${ev.player}) ${(w.tick / 600).toFixed(1)} min`);
    }
    const sieger = w.winner >= 0 ? `${f[w.winner]} (Sitz ${w.winner})` : 'kein Sieger';
    if (w.winner >= 0) {
      siege[f[w.winner]] = (siege[f[w.winner]] || 0) + 1;
      sitze[w.winner]++;
    } else offen++;
    console.log(`Seed ${seed} ${f.join(' / ')}: ${sieger} nach ${(w.tick / 600).toFixed(1)} min; ausgeschieden: ${aus.join(', ') || '—'}`);
  }
  console.log(`\nSiege je Volk: ${Object.entries(siege).map(([k, v]) => `${k} ${v}`).join(' · ') || '—'} · offen ${offen}`);
  console.log(`Siege je Sitz: ${sitze.map((v, i) => `${i}: ${v}`).join(' · ')}`);
}

function play(factions, seed) {
  const w = createWorld({ factions, seed, karte: karteName });
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
      masse: p.masse,
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
            `${f[p]}: masse ${x.masse}, bauten ${x.bauten} (${x.baustellen} offen), anker ${x.anker} ${x.ha} ha, einh ${x.einheiten}`
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
