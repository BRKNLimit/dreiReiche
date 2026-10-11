// Platzhalter fuer Modelle und Icons neuer Einheiten und Gebaeude, bis Gemini
// echte liefert (Wunsch in docs/grafik/wuensche.md). Fuellt nur Luecken: Was
// in src/modelle3d.js oder src/icons.js steht, gewinnt. Wird von
// tools/bundle.mjs nach diesen Dateien eingefuegt; in der Draufsicht gibt es
// keine Modelle, daher die typeof-Pruefung. Derzeit leer -- alles hat ein
// echtes Modell und Icon.

import { ICONS } from './icons.js';
import { MODELLE_DEF } from './modelle3d.js';

// Schluessel -> SVG mit viewBox="0 0 24 24"
const PLATZHALTER_ICONS = {};
for (const [k, v] of Object.entries(PLATZHALTER_ICONS)) ICONS[k] ??= v;

// Schluessel -> Teile wie in src/modelle3d.js
const PLATZHALTER_MODELLE = {};
if (typeof MODELLE_DEF !== 'undefined') {
  for (const [k, v] of Object.entries(PLATZHALTER_MODELLE)) MODELLE_DEF[k] ??= v;
}
