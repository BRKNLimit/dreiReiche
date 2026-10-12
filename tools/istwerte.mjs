// Schreibt die Ist-Werte aller Voelker aus den Daten nach docs/umbau/istwerte.md --
// die Grundlage fuer Entwuerfe. Wer Werte aendern will, vergleicht mit dieser
// Datei, statt sie aus dem Gedaechtnis aufzuschreiben.
//   node tools/istwerte.mjs

import { writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VOELKER, FAEHIGKEITEN } from '../src/sim/defs.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const wert = (v) => (v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v).replace(/"/g, '').replace(/,/g, ', ') : String(v));
const tabelle = (eintraege, spalten) => {
  const zeilen = [`| Schlüssel | ${spalten.join(' | ')} |`, `| --- |${spalten.map(() => ' --- |').join('')}`];
  for (const [k, d] of Object.entries(eintraege)) zeilen.push(`| \`${k}\` | ${spalten.map((s) => wert(d[s]).replace(/\|/g, '/')).join(' | ')} |`);
  return zeilen.join('\n');
};

const teile = [
  '# Ist-Werte der Völker',
  '',
  'Erzeugt von `node tools/istwerte.mjs` aus `src/sim/voelker/*.js` — **nicht von Hand ändern**.',
  'Grundlage für jeden Entwurf: Was hier steht, ist im Spiel. Änderungen in Entwürfen als „alt → neu“ angeben.',
  '',
];
for (const v of VOELKER) {
  const vk = v.volk;
  const rollen = Object.entries(v.rollen).map(([r, t]) => `${r}: \`${t}\``).join(', ');
  teile.push(
    `## ${vk.name} (\`${v.schluessel}\`)`,
    '',
    `- Domäne: growth ${wert(vk.growth)} · Kommandant \`${vk.kommandant}\` · Hauptgebäude \`${vk.haupt}\``,
    `- Rollen: ${rollen}`,
    `- Fähigkeiten: ${vk.faehigkeiten.map((f) => `\`${f}\` ${wert(FAEHIGKEITEN[f])}`).join('; ')}`,
    '',
    '### Gebäude',
    '',
    tabelle(v.gebaeude, ['name', 'hp', 'radius', 'cost', 'buildTime', 'energieIn', 'energieOut', 'masseOut', 'resonitOut', 'weapon', 'buff', 'buildList', 'sicht', 'forschung', 'anchor', 'needs', 'schild', 'schlag', 'abwehr']),
    '',
    '### Einheiten',
    '',
    tabelle(v.einheiten, ['name', 'hp', 'radius', 'speed', 'cost', 'unterhalt', 'buildTime', 'kampf', 'weapon', 'sicht', 'build', 'fliegt', 'hoechstens']),
    '',
    '### Skills',
    '',
    tabelle(v.skills, ['name', 'ast', 'kosten', 'braucht', 'frei', 'wirkung', 'faehigkeit']),
    ''
  );
}
await writeFile(join(root, 'docs/umbau/istwerte.md'), teile.join('\n'));
console.log('docs/umbau/istwerte.md geschrieben');
