// Platzhalter fuer Modelle und Icons neuer Einheiten und Gebaeude, bis Gemini
// echte liefert (Wunsch in docs/grafik/wuensche.md). Fuellt nur Luecken: Was
// in src/modelle3d.js oder src/icons.js steht, gewinnt. Wird von
// tools/bundle.mjs nach diesen Dateien eingefuegt; in der Draufsicht gibt es
// keine Modelle, daher die typeof-Pruefung.

import { ICONS } from './icons.js';
import { MODELLE_DEF } from './modelle3d.js';

const PLATZHALTER_ICONS = {
  rabe: '<svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M2 10c3-2 6-2 8 0l2 3 2-3c2-2 5-2 8 0-3 0-5 1-7 4l-3 4-3-4C7 11 5 10 2 10z" fill="#24232b" stroke="#8fb86a" stroke-width="1"/><circle cx="12" cy="12" r="1" fill="#e8d04a"/></svg>',
  spaehposten: '<svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22l3-12M18 22l-3-12M8 16h8" stroke="#a07a4a" stroke-width="1.6"/><path d="M5 10h14l-2-3H7z" fill="#7a5a3a" stroke="#d8b06a" stroke-width="1"/><path d="M8 7l4-4 4 4" stroke="#d8b06a" stroke-width="1.2"/><circle cx="12" cy="8.6" r="1.2" fill="#f0e6c8"/></svg>',
};
for (const [k, v] of Object.entries(PLATZHALTER_ICONS)) ICONS[k] ??= v;

if (typeof MODELLE_DEF !== 'undefined') {
  const SCHWARZ = '#24232b';
  const HOLZ_P = '#7a5a3a';
  const PLATZHALTER_MODELLE = {
    // Rabe: Rumpf, zwei Schwingen, Schnabel -- die Flughoehe setzt die Oberflaeche
    rabe: [
      ['k', [0.35, 6], [0, 0.4, 0], SCHWARZ, 0.25],
      ['k', [0.22, 6], [0, 0.5, 0.38], SCHWARZ],
      ['z', [0, 0.08, 0.3, 4], [0, 0.48, 0.66], '#c8a040', 0, [Math.PI / 2, 0, 0]],
      ['q', [1.3, 0.05, 0.45], [0.75, 0.45, 0], SCHWARZ, 0.25, [0, 0, 0.25]],
      ['q', [1.3, 0.05, 0.45], [-0.75, 0.45, 0], SCHWARZ, 0.25, [0, 0, -0.25]],
      ['q', [0.35, 0.04, 0.4], [0, 0.4, -0.45], SCHWARZ],
    ],
    // Spaehposten: Hochsitz auf vier Beinen mit Dach
    spaehposten: [
      ['q', [0.1, 2.2, 0.1], [0.45, 1.1, 0.45], HOLZ_P],
      ['q', [0.1, 2.2, 0.1], [-0.45, 1.1, 0.45], HOLZ_P],
      ['q', [0.1, 2.2, 0.1], [0.45, 1.1, -0.45], HOLZ_P],
      ['q', [0.1, 2.2, 0.1], [-0.45, 1.1, -0.45], HOLZ_P],
      ['q', [1.2, 0.12, 1.2], [0, 2.2, 0], HOLZ_P, 0.4],
      ['q', [1.2, 0.45, 0.06], [0, 2.5, 0.58], HOLZ_P],
      ['q', [1.2, 0.45, 0.06], [0, 2.5, -0.58], HOLZ_P],
      ['z', [0, 0.95, 0.6, 4], [0, 3.1, 0], '#8c3a2a', 0.5, [0, Math.PI / 4, 0]],
    ],
  };
  for (const [k, v] of Object.entries(PLATZHALTER_MODELLE)) MODELLE_DEF[k] ??= v;
}
