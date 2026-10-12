// Alle Voelker, die das Spiel kennt. Ein neues Volk: eigene Datei in diesem
// Ordner anlegen und hier eintragen -- sonst nirgends (defs.js setzt sie
// zusammen, tools/bundle.mjs nimmt jede Datei dieses Ordners mit).
// Die Reihenfolge bestimmt die Reihenfolge der Schluessel (und damit z. B.
// die Nummern der Skills im Spielstand): neue Voelker nur hinten anfuegen.

import { VOLK_MENSCH } from './mensch.js';
import { VOLK_GOTT } from './gott.js';
import { VOLK_TOD } from './tod.js';

export const VOELKER = [VOLK_MENSCH, VOLK_GOTT, VOLK_TOD];
