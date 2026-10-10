// Baut aus den Sim-Modulen und der Oberflaeche eine einzelne HTML-Datei.
// Einzige Quelle der Wahrheit bleiben die Dateien unter src/ -- hier wird
// nur zusammengefuegt, nichts umgeschrieben.

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
const ui = await readFile(join(root, 'src/ui.js'), 'utf8');
const shell = await readFile(join(root, 'src/shell.html'), 'utf8');

const out = shell.replace(
  '/*__SIM__*/',
  [defs, sim, ai, ui].join('\n\n/* ---------------------------------- */\n\n')
);

await mkdir(join(root, 'dist'), { recursive: true });
await writeFile(join(root, 'dist/resonit.html'), out);
console.log('dist/resonit.html geschrieben (' + (out.length / 1024).toFixed(0) + ' KB)');
