// Baut aus den Sim-Modulen und den Oberflaechen je eine einzelne HTML-Datei.
// Einzige Quelle der Wahrheit bleiben die Dateien unter src/ -- hier wird
// nur zusammengefuegt, nichts umgeschrieben.
//
//   dist/resonit.html         2D-Ansicht   (src/shell.html   + src/ui.js)
//   dist/drei-reiche-3d.html  3D-Ansicht   (src/shell3d.html + src/ui3d.js)
// Beide bekommen src/ui-gemeinsam.js vor der eigenen Oberflaeche.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Entfernt Modul-Syntax, damit alles in einem Skript-Gueltigkeitsbereich lebt. */
function strip(src) {
  return src
    .replace(/^\s*import[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^\s*export\s+/gm, '')
    .replace(/^\s*export\s*\{[^}]*\};?\s*$/gm, '');
}

const defs = strip(await readFile(join(root, 'src/sim/defs.js'), 'utf8'));
const sim = strip(await readFile(join(root, 'src/sim/sim.js'), 'utf8'));
const ai = strip(await readFile(join(root, 'src/sim/ai.js'), 'utf8'));
const gemeinsam = strip(await readFile(join(root, 'src/ui-gemeinsam.js'), 'utf8'));

const SEITEN = [
  ['src/shell.html', 'src/ui.js', 'dist/resonit.html'],
  ['src/shell3d.html', 'src/ui3d.js', 'dist/drei-reiche-3d.html'],
];

await mkdir(join(root, 'dist'), { recursive: true });
for (const [shellPfad, uiPfad, ziel] of SEITEN) {
  const shell = await readFile(join(root, shellPfad), 'utf8');
  const ui = await readFile(join(root, uiPfad), 'utf8');
  const out = shell.replace('/*__SIM__*/', [defs, sim, ai, gemeinsam, ui].join('\n\n/* ---------------------------------- */\n\n'));
  await writeFile(join(root, ziel), out);
  console.log(ziel + ' geschrieben (' + (out.length / 1024).toFixed(0) + ' KB)');
}
