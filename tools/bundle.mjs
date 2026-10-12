// Baut aus den Sim-Modulen und den Oberflaechen je eine einzelne HTML-Datei.
// Einzige Quelle der Wahrheit bleiben die Dateien unter src/ -- hier wird
// nur zusammengefuegt, nichts umgeschrieben.
//
//   dist/resonit.html         2D-Ansicht   (src/shell.html)
//   dist/drei-reiche-3d.html  3D-Ansicht   (src/shell3d.html)
//   dist/galerie.html         Modell-Galerie fuer die Stil-Auswahl (src/galerie.html)
//   dist/karteneditor.html    Karteneditor (src/editorshell.html)
//
// Die Reihenfolge zaehlt: spaetere Dateien nutzen Bezeichner der frueheren.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Dateien mit eigenen Hilfsnamen, die sich mit anderen beissen wuerden: in eine
// Funktion gekapselt, nur ihre Exporte werden sichtbar.
const GEKAPSELT = []; // derzeit keine
function kapseln(src) {
  const namen = [...src.matchAll(/^export\s+(?:async\s+)?(?:function|const|let|class)\s+(\w+)/gm)].map((m) => m[1]);
  return `const { ${namen.join(', ')} } = (() => {\n${strip(src)}\nreturn { ${namen.join(', ')} };\n})();`;
}

/** Entfernt Modul-Syntax, damit alles in einem Skript-Gueltigkeitsbereich lebt. */
function strip(src) {
  return src
    .replace(/^\s*import[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^\s*export\s+/gm, '')
    .replace(/^\s*export\s*\{[^}]*\};?\s*$/gm, '');
}

const SIM = ['src/sim/grund.js', 'src/sim/voelker/mensch.js', 'src/sim/voelker/gott.js', 'src/sim/voelker/tod.js', 'src/sim/defs.js', 'src/sim/weg.js', 'src/sim/sim.js', 'src/sim/kunde.js', 'src/sim/kartenbau.js', 'src/sim/ai.js'];
const SEITEN = [
  ['src/shell.html', [...SIM, 'src/icons.js', 'src/platzhalter.js', 'src/ui-gemeinsam.js', 'src/effekte.js', 'src/musik.js', 'src/aufnahme.js', 'src/kampagne.js', 'src/spielstand.js', 'src/netz.js', 'src/bilanz.js', 'src/gelaende2d.js', 'src/figuren2d.js', 'src/ui.js'], 'dist/resonit.html'],
  [
    'src/shell3d.html',
    [...SIM, 'src/icons.js', 'src/ui-gemeinsam.js', 'src/effekte.js', 'src/musik.js', 'src/aufnahme.js', 'src/kampagne.js', 'src/spielstand.js', 'src/netz.js', 'src/bilanz.js', 'src/render3d.js', 'src/modelle3d.js', 'src/platzhalter.js', 'src/gelaende3d.js', 'src/ui3d.js'],
    'dist/drei-reiche-3d.html',
  ],
  ['src/galerie.html', ['src/sim/grund.js', 'src/sim/voelker/mensch.js', 'src/sim/voelker/gott.js', 'src/sim/voelker/tod.js', 'src/sim/defs.js', 'src/icons.js', 'src/render3d.js', 'src/modelle3d.js', 'src/platzhalter.js', 'src/galerie.js'], 'dist/galerie.html'],
  ['src/editorshell.html', [...SIM, 'src/icons.js', 'src/ui-gemeinsam.js', 'src/gelaende2d.js', 'src/editor.js'], 'dist/karteneditor.html'],
];

await mkdir(join(root, 'dist'), { recursive: true });
// Stand der Simulation: Pruefsumme der Sim-Dateien. Eine Wiederholung passt
// nur zum selben Stand (src/aufnahme.js).
const pruef = createHash('sha1');
for (const f of SIM) pruef.update(await readFile(join(root, f), 'utf8'));
const STAND_ZEILE = `const SPIEL_STAND = '${pruef.digest('hex').slice(0, 10)}';`;
for (const [shellPfad, dateien, ziel] of SEITEN) {
  const shell = await readFile(join(root, shellPfad), 'utf8');
  const teile = [];
  if (dateien.includes('src/sim/sim.js')) teile.push(STAND_ZEILE);
  for (const f of dateien) {
    const src = await readFile(join(root, f), 'utf8');
    teile.push(GEKAPSELT.includes(f) ? kapseln(src) : strip(src));
  }
  const out = shell.replace('/*__SIM__*/', teile.join('\n\n/* ---------------------------------- */\n\n'));
  await writeFile(join(root, ziel), out);
  console.log(ziel + ' geschrieben (' + (out.length / 1024).toFixed(0) + ' KB)');
}
