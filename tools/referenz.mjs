// Pruefsummen dreier KI-Partien (je 15 min, drei Volks-Paarungen). Wer nur
// Neues hinzufuegt (eine Mechanik, die noch kein Volk benutzt), darf sie
// nicht veraendern: vorher und nachher laufen lassen und vergleichen.
//   node tools/referenz.mjs

import { createWorld, step, hash } from '../src/sim/sim.js';
import { createAI, stepAI } from '../src/sim/ai.js';

const out = [];
for (const [f, seed] of [
  [['mensch', 'gott'], 3],
  [['tod', 'mensch'], 4],
  [['gott', 'tod'], 5],
]) {
  const w = createWorld({ seed, factions: f });
  const ais = [createAI(0, seed, 'sturm'), createAI(1, seed + 1, 'burg')];
  for (let t = 0; t < 9000 && !w.over; t++) {
    stepAI(ais[0], w);
    stepAI(ais[1], w);
    step(w);
  }
  out.push(`${f.join('-')}:${hash(w)}@${w.tick}`);
}
console.log(out.join(' '));
