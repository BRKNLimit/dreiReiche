// Platzhalter fuer Modelle und Icons neuer Einheiten und Gebaeude, bis Gemini
// echte liefert (Wunsch in docs/grafik/wuensche.md). Fuellt nur Luecken: Was
// in src/modelle3d.js oder src/icons.js steht, gewinnt. Wird von
// tools/bundle.mjs nach diesen Dateien eingefuegt; in der Draufsicht gibt es
// keine Modelle, daher die typeof-Pruefung. Derzeit nur das Wrack (R1).

import { ICONS } from './icons.js';
import { MODELLE_DEF } from './modelle3d.js';

// Schluessel -> SVG mit viewBox="0 0 24 24"
const PLATZHALTER_ICONS = {
  // Wrack (R1): ein Haufen verbogener Platten
  wrack: `<svg viewBox="0 0 24 24">
    <path d="M2.5 20 L6 13 L9 16 L12.5 8 L15.5 15 L18 12 L21.5 20 Z" fill="#3a3835" stroke="#8d8578" stroke-width="1.3" stroke-linejoin="round"/>
    <path d="M6 13 L9.5 18 M12.5 8 L12 17 M18 12 L15 18" fill="none" stroke="#6b6458" stroke-width="1"/>
    <circle cx="14.2" cy="16.5" r="1" fill="#ff7a2a"/>
  </svg>`,
};
for (const [k, v] of Object.entries(PLATZHALTER_ICONS)) ICONS[k] ??= v;

// Andere Schluessel im Spiel als in Geminis Entwurf (Totenreich): Faehigkeit -> Icon
const ICON_NAMEN = { grabeskaelte: 'grabesklaelte', seelenrausch: 'seelenernte' };
for (const [k, v] of Object.entries(ICON_NAMEN)) ICONS[k] ??= ICONS[v];

// Schluessel -> Teile wie in src/modelle3d.js. Team 2 ist GLUEHT (leuchtet selbst);
// die Konstante steht in der Draufsicht nicht zur Verfuegung, daher die Zahl.
const PLATZHALTER_MODELLE = {
  // Wrack (R1): flacher Schrotthaufen, Radius 1, gehoert niemandem (kein Teamanteil)
  wrack: [
    ['z', [0.78, 0.98, 0.12, 9], [0, 0.06, 0], '#2b2926'],
    ['k', [0.3, 6], [0, 0.14, 0], '#34312d'],
    ['q', [0.7, 0.07, 0.36], [0.12, 0.24, 0.06], '#3d3b37', 0, [0.15, 0.5, 0.35]],
    ['q', [0.46, 0.06, 0.62], [-0.3, 0.2, -0.2], '#4b3b2e', 0, [-0.25, -0.7, 0.2]],
    ['q', [0.1, 0.1, 0.9], [0.26, 0.3, -0.26], '#59564f', 0, [0.4, 0.9, -0.3]],
    ['q', [0.09, 0.09, 0.7], [-0.16, 0.28, 0.3], '#3d3a36', 0, [-0.3, 1.6, 0.4]],
    ['q', [0.3, 0.18, 0.26], [0.42, 0.12, 0.34], '#46433e', 0, [0.1, 0.8, 0.2]],
    ['k', [0.07, 4], [0.05, 0.3, 0.16], '#ff7a2a', 2],
    ['k', [0.05, 4], [-0.36, 0.14, 0.1], '#ff7a2a', 2],
  ],
};
if (typeof MODELLE_DEF !== 'undefined') {
  for (const [k, v] of Object.entries(PLATZHALTER_MODELLE)) MODELLE_DEF[k] ??= v;
}
