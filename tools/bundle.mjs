// Baut aus den Sim-Modulen und den Oberflaechen je eine einzelne HTML-Datei.
// Einzige Quelle der Wahrheit bleiben die Dateien unter src/ -- hier wird
// nur zusammengefuegt, nichts umgeschrieben.
//
//   dist/resonit.html         2D-Ansicht   (src/shell.html)
//   dist/drei-reiche-3d.html  3D-Ansicht   (src/shell3d.html)
//   dist/galerie.html         Modell-Galerie fuer die Stil-Auswahl (src/galerie.html)
//
// Die Reihenfolge zaehlt: spaetere Dateien nutzen Bezeichner der frueheren.

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

const SIM = ['src/sim/defs.js', 'src/sim/weg.js', 'src/sim/sim.js', 'src/sim/kunde.js', 'src/sim/ai.js'];
const SEITEN = [
  ['src/shell.html', [...SIM, 'src/icons.js', 'src/ui-gemeinsam.js', 'src/gelaende2d.js', 'src/ui.js'], 'dist/resonit.html'],
  [
    'src/shell3d.html',
    [...SIM, 'src/icons.js', 'src/ui-gemeinsam.js', 'src/render3d.js', 'src/modelle3d.js', 'src/gelaende3d.js', 'src/ui3d.js'],
    'dist/drei-reiche-3d.html',
  ],
  ['src/galerie.html', ['src/sim/defs.js', 'src/icons.js', 'src/render3d.js', 'src/modelle3d.js', 'src/galerie.js'], 'dist/galerie.html'],
];

await mkdir(join(root, 'dist'), { recursive: true });
for (const [shellPfad, dateien, ziel] of SEITEN) {
  const shell = await readFile(join(root, shellPfad), 'utf8');
  const teile = [];
  for (const f of dateien) teile.push(strip(await readFile(join(root, f), 'utf8')));
  const out = shell.replace('/*__SIM__*/', teile.join('\n\n/* ---------------------------------- */\n\n'));
  await writeFile(join(root, ziel), out);
  console.log(ziel + ' geschrieben (' + (out.length / 1024).toFixed(0) + ' KB)');
}
