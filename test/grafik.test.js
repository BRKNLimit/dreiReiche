// Tests fuer die Grafik-Dateien (siehe GEMINI.md): Modelle und Icons muessen
// vollstaendig und gueltig sein, sonst bricht die 3D-Ansicht oder die Oberflaeche.

import test from 'node:test';
import assert from 'node:assert/strict';
import { UNITS, BUILDINGS, FAEHIGKEITEN } from '../src/sim/defs.js';
import { MODELLE_DEF, WALDGOTT_VARIANTEN } from '../src/modelle3d.js';
import { baueModell } from '../src/render3d.js';
import { ICONS } from '../src/icons.js';
import '../src/platzhalter.js'; // Platzhalter fuer Neues, bis Gemini echte Modelle und Icons liefert

// Modelle, die die Oberflaeche ausser Einheiten und Gebaeuden braucht
const KARTE_UND_EFFEKTE = ['scheibe', 'fronAder', 'blutAder', 'baum', 'pfeil', 'kugel', 'stein', 'fels', 'staubwolke'];

// Groessenbudget je Modell in Ecken (drei je Dreieck): ein Heer hat Hunderte Einheiten.
const ECKEN_EINHEIT = 6000;
const ECKEN_GEBAEUDE = 9000;

/** Prueft ein Teil eines Modells; liefert eine Fehlermeldung oder ''. */
function teilFehler(t) {
  const [form, masse, pos, farbe, team = 0, dreh = [0, 0, 0]] = t;
  const zahl = (v) => typeof v === 'number' && Number.isFinite(v);
  const laenge = { q: 3, z: 4, k: 2, s: 2 }[form];
  if (!laenge) return 'unbekannte Form ' + form;
  if (!Array.isArray(masse) || masse.length !== laenge || !masse.every(zahl)) return 'Masse passen nicht zur Form ' + form;
  if (!Array.isArray(pos) || pos.length !== 3 || !pos.every(zahl)) return 'Position braucht [x, y, z]';
  if (!/^#[0-9a-fA-F]{6}$/.test(farbe)) return 'Farbe braucht #rrggbb: ' + farbe;
  if (!zahl(team) || team < 0 || (team > 1 && team !== 2)) return 'team ist 0..1 oder GLUEHT (2)';
  if (!Array.isArray(dreh) || dreh.length !== 3 || !dreh.every(zahl)) return 'Drehung braucht [rx, ry, rz]';
  return '';
}

function pruefeModell(name, teile, budget) {
  assert.ok(Array.isArray(teile) && teile.length > 0, name + ': keine Teile');
  for (const t of teile) {
    const f = teilFehler(t);
    assert.equal(f, '', `${name}: ${f}`);
  }
  const ecken = baueModell(teile).length / 10;
  assert.ok(ecken <= budget, `${name}: ${ecken} Ecken, erlaubt ${budget}`);
}

test('jede Einheit, jedes Gebaeude, Karte und Effekte haben ein gueltiges Modell', () => {
  for (const k of Object.keys(UNITS)) pruefeModell(k, MODELLE_DEF[k], ECKEN_EINHEIT);
  for (const k of Object.keys(BUILDINGS)) pruefeModell(k, MODELLE_DEF[k], ECKEN_GEBAEUDE);
  for (const k of KARTE_UND_EFFEKTE) pruefeModell(k, MODELLE_DEF[k], ECKEN_GEBAEUDE);
});

test('Waldgott-Varianten fuer die Stil-Auswahl sind gueltig', () => {
  const namen = Object.keys(WALDGOTT_VARIANTEN);
  assert.ok(namen.length >= 1);
  for (const n of namen) pruefeModell('Waldgott ' + n, WALDGOTT_VARIANTEN[n], ECKEN_EINHEIT);
});

test('Icons: Ressourcen, Einheiten, Gebaeude und Faehigkeiten, jedes ein sicheres SVG', () => {
  const brauche = ['skillpunkte', 'gegenwart', 'goetterblut', 'fron', ...Object.keys(UNITS), ...Object.keys(BUILDINGS), ...Object.keys(FAEHIGKEITEN)];
  for (const k of brauche) {
    const svg = ICONS[k];
    assert.ok(typeof svg === 'string', 'Icon fehlt: ' + k);
    assert.ok(/^<svg[\s>]/.test(svg.trim()), k + ': beginnt nicht mit <svg');
    assert.ok(svg.includes('viewBox="0 0 24 24"'), k + ': braucht viewBox="0 0 24 24"');
    assert.ok(!/<svg[^>]*\s(width|height)=/.test(svg), k + ': keine feste Groesse am <svg>, die setzt die Oberflaeche');
    assert.ok(!/<script|on\w+=|href=["']?(https?:|\/\/)/i.test(svg), k + ': keine Skripte, Ereignisse oder externen Verweise');
  }
});
