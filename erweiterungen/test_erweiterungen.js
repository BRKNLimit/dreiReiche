// Test-Suite fuer alle Erweiterungen: Modelle, Icons, Simulation und 2D-Figuren.
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  TOD_FACTION,
  TOD_BUILDINGS,
  TOD_UNITS,
  ELITE_UNITS_MENSCH,
  ELITE_UNITS_GOTT,
  TOD_SKILLS,
  TOD_FAEHIGKEITEN,
} from './sim_defs.js';

import { ERWEITERUNGEN_MODELLE } from './modelle.js';
import { EXPANSION_ICONS } from './icons.js';
import { zeichneErweiterungEinheit2d, zeichneErweiterungGebaeude2d } from './figuren2d.js';
import { baueModell } from '../src/render3d.js';

const ECKEN_EINHEIT = 6000;
const ECKEN_GEBAEUDE = 9000;

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

test('Erweiterungen: Simulationsdefinitionen sind vollstaendig und valide', () => {
  assert.equal(TOD_FACTION.id, 'tod');
  assert.equal(Object.keys(TOD_BUILDINGS).length, 10);
  assert.equal(Object.keys(TOD_UNITS).length, 7);
  assert.equal(Object.keys(ELITE_UNITS_MENSCH).length, 4);
  assert.equal(Object.keys(ELITE_UNITS_GOTT).length, 4);
  assert.ok(Object.keys(TOD_SKILLS).length >= 10);
  assert.equal(Object.keys(TOD_FAEHIGKEITEN).length, 3);

  // Pruefe Schluesselattribute der Einheiten
  for (const [k, u] of Object.entries({ ...TOD_UNITS, ...ELITE_UNITS_MENSCH, ...ELITE_UNITS_GOTT })) {
    assert.ok(u.name, k + ' braucht name');
    assert.ok(typeof u.hp === 'number' && u.hp > 0, k + ' braucht hp');
    assert.ok(typeof u.radius === 'number' && u.radius > 0, k + ' braucht radius');
  }

  // Pruefe Schluesselattribute der Gebaeude
  for (const [k, b] of Object.entries(TOD_BUILDINGS)) {
    assert.ok(b.name, k + ' braucht name');
    assert.ok(typeof b.hp === 'number' && b.hp > 0, k + ' braucht hp');
    assert.ok(typeof b.radius === 'number' && b.radius > 0, k + ' braucht radius');
  }
});

test('Erweiterungen: Alle 3D-Modelle sind geometrisch gueltig und halten das Budget ein', () => {
  // Todesgott Einheiten
  for (const k of Object.keys(TOD_UNITS)) {
    pruefeModell(k, ERWEITERUNGEN_MODELLE[k], ECKEN_EINHEIT);
  }
  // Todesgott Gebaeude
  for (const k of Object.keys(TOD_BUILDINGS)) {
    pruefeModell(k, ERWEITERUNGEN_MODELLE[k], ECKEN_GEBAEUDE);
  }
  // Elite Einheiten
  for (const k of Object.keys(ELITE_UNITS_MENSCH)) {
    pruefeModell(k, ERWEITERUNGEN_MODELLE[k], ECKEN_EINHEIT);
  }
  for (const k of Object.keys(ELITE_UNITS_GOTT)) {
    pruefeModell(k, ERWEITERUNGEN_MODELLE[k], ECKEN_EINHEIT);
  }
});

test('Erweiterungen: Alle Icons sind gueltige, sichere SVGs mit viewBox 0 0 24 24', () => {
  const brauche = [
    ...Object.keys(TOD_BUILDINGS),
    ...Object.keys(TOD_UNITS),
    ...Object.keys(ELITE_UNITS_MENSCH),
    ...Object.keys(ELITE_UNITS_GOTT),
    ...Object.keys(TOD_FAEHIGKEITEN),
  ];
  for (const k of brauche) {
    const svg = EXPANSION_ICONS[k];
    assert.ok(typeof svg === 'string', 'Icon fehlt: ' + k);
    assert.ok(/^<svg[\s>]/.test(svg.trim()), k + ': beginnt nicht mit <svg');
    assert.ok(svg.includes('viewBox="0 0 24 24"'), k + ': braucht viewBox="0 0 24 24"');
    assert.ok(!/<svg[^>]*\s(width|height)=/.test(svg), k + ': keine feste Groesse am <svg>');
    assert.ok(!/<script|on\w+=|href=["']?(https?:|\/\/)/i.test(svg), k + ': keine unsicheren Tags');
  }
});

test('Erweiterungen: 2D-Zeichenroutinen fuer Einheiten und Gebaeude laufen fehlerfrei', () => {
  const mockCtx = {
    save() {},
    restore() {},
    translate() {},
    rotate() {},
    scale() {},
    beginPath() {},
    closePath() {},
    fill() {},
    stroke() {},
    arc() {},
    ellipse() {},
    rect() {},
    fillRect() {},
    strokeRect() {},
    moveTo() {},
    lineTo() {},
  };

  // Teste alle Einheiten in 2D
  for (const [typ, def] of Object.entries({ ...TOD_UNITS, ...ELITE_UNITS_MENSCH, ...ELITE_UNITS_GOTT })) {
    const entity = { id: 101, type: typ, player: 0, hp: def.hp, maxHp: def.hp, x: 50, y: 50 };
    const ok = zeichneErweiterungEinheit2d(mockCtx, entity, def, 100, 100, 12, '#8b9bb4', 1.0, 1234);
    assert.equal(ok, true, `zeichneErweiterungEinheit2d fehlgeschlagen fuer ${typ}`);
  }

  // Teste alle Gebaeude in 2D
  for (const [typ, def] of Object.entries(TOD_BUILDINGS)) {
    const entity = { id: 201, type: typ, player: 0, hp: def.hp, maxHp: def.hp, done: true, progress: 1000, powered: 1000 };
    const ok = zeichneErweiterungGebaeude2d(mockCtx, entity, def, 100, 100, 24, '#8b9bb4', 1.0, 1234);
    assert.equal(ok, true, `zeichneErweiterungGebaeude2d fehlgeschlagen fuer ${typ}`);
  }
});
