// M5 Prototypen: Einheitenfeld hoechstens -- so viele davon darf ein Spieler
// zugleich haben (lebende plus in Ausbildung). Ein produce darueber hinaus
// wird abgelehnt. Die Volksdateien haben (noch) keinen Prototyp -- die
// Testdaten werden zur Laufzeit eingetragen und am Ende wieder entfernt.

import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, spawnUnit, spawnBuilding, step, hash, issue, anzahlVon, vollBesetzt } from '../src/sim/sim.js';
import { UNITS, BUILDINGS, FACTIONS } from '../src/sim/defs.js';
import { createAI, stepAI } from '../src/sim/ai.js';

const TEST_EINHEITEN = {
  // Prototyp: hoechstens 2, braucht etwas Goetterblut; kein Angriff, nur zum Zaehlen
  tproto: { name: 'Testprototyp', desc: '', faction: 'mensch', hp: 500, radius: 20, speed: 30, cost: { fron: 50, goetterblut: 5 }, buildTime: 20, hoechstens: 2 },
  // Prototyp mit Grenze 1 (wie im Konzept: einer je Volk)
  tkoloss: { name: 'Testkoloss', desc: '', faction: 'mensch', hp: 900, radius: 20, speed: 20, cost: { fron: 60 }, buildTime: 20, hoechstens: 1 },
  // ohne Grenze
  tfuss: { name: 'Testfuss', desc: '', faction: 'mensch', hp: 100, radius: 20, speed: 30, cost: { fron: 5 }, buildTime: 20 },
};
const TEST_GEBAEUDE = {
  twerk: {
    name: 'Testwerkstatt', desc: '', short: 'WRK', faction: 'mensch', hp: 800, radius: 30, cost: { fron: 100 }, buildTime: 50,
    buildList: ['tproto', 'tkoloss', 'tfuss'],
  },
  // fuer die KI: kleiner Bedarf, bildet nur den Prototyp aus
  twerkki: {
    name: 'Testwerkstatt KI', desc: '', short: 'WKI', faction: 'mensch', hp: 800, radius: 30, cost: { fron: 100 }, buildTime: 50, gegenwartIn: 2,
    buildList: ['tkoloss'],
  },
  tblutki: { name: 'Testschacht', desc: '', short: 'BLU', faction: 'mensch', hp: 400, radius: 30, cost: { fron: 100 }, buildTime: 50 },
};

Object.assign(UNITS, TEST_EINHEITEN);
Object.assign(BUILDINGS, TEST_GEBAEUDE);
after(() => {
  for (const k of Object.keys(TEST_EINHEITEN)) delete UNITS[k];
  for (const k of Object.keys(TEST_GEBAEUDE)) delete BUILDINGS[k];
  delete FACTIONS.mensch.rollen.werkstatt;
  delete FACTIONS.mensch.rollen.prototyp;
});

function bare() {
  const w = createWorld({ empty: true, factions: ['mensch', 'gott'] });
  w.players[0].goetterblut = 100;
  return w;
}
const schritte = (w, n) => {
  for (let i = 0; i < n; i++) step(w);
};
const bestelle = (w, werk, einheit, player = 0) => issue(w, { type: 'produce', player, id: werk.id, unit: einheit });

test('Grenze bei bestellten: die dritte Bestellung wird abgelehnt und kostet nichts', () => {
  const w = bare();
  const werk = spawnBuilding(w, 0, 'twerk', 3000, 3000, true);
  bestelle(w, werk, 'tproto');
  bestelle(w, werk, 'tproto');
  bestelle(w, werk, 'tproto');
  step(w);
  assert.deepEqual(werk.queue, ['tproto', 'tproto']);
  assert.equal(w.players[0].fron, 1100 - 100);
  assert.equal(w.players[0].goetterblut, 100 - 10);
  assert.equal(anzahlVon(w, 0, 'tproto'), 2);
  assert.ok(vollBesetzt(w, 0, 'tproto'));
});

test('Grenze bei lebenden plus bestellten', () => {
  const w = bare();
  const werk = spawnBuilding(w, 0, 'twerk', 3000, 3000, true);
  spawnUnit(w, 0, 'tproto', 3500, 3500); // eine lebt schon
  assert.equal(anzahlVon(w, 0, 'tproto'), 1);
  bestelle(w, werk, 'tproto');
  bestelle(w, werk, 'tproto');
  step(w);
  assert.deepEqual(werk.queue, ['tproto'], 'nur eine weitere');
  assert.ok(vollBesetzt(w, 0, 'tproto'));
});

test('Grenze 1: einer, solange er lebt oder bestellt ist; nach dem Tod wieder frei', () => {
  const w = bare();
  const werk = spawnBuilding(w, 0, 'twerk', 3000, 3000, true);
  bestelle(w, werk, 'tkoloss');
  step(w);
  assert.deepEqual(werk.queue, ['tkoloss']);
  bestelle(w, werk, 'tkoloss');
  step(w);
  assert.equal(werk.queue.length, 1, 'zweiter abgelehnt');
  // ausgebildet: er lebt jetzt, die Warteschlange ist leer -- die Grenze gilt weiter
  schritte(w, 30);
  assert.equal(werk.queue.length, 0);
  const lebt = w.entities.filter((e) => e.type === 'tkoloss');
  assert.equal(lebt.length, 1);
  assert.equal(anzahlVon(w, 0, 'tkoloss'), 1, 'nicht doppelt gezaehlt (Schlange leer, Einheit lebt)');
  bestelle(w, werk, 'tkoloss');
  step(w);
  assert.equal(werk.queue.length, 0, 'gesperrt, solange er lebt');
  // er faellt
  lebt[0].hp = 0;
  lebt[0].dead = true;
  step(w);
  assert.equal(anzahlVon(w, 0, 'tkoloss'), 0);
  bestelle(w, werk, 'tkoloss');
  step(w);
  assert.deepEqual(werk.queue, ['tkoloss'], 'wieder frei');
});

test('Grenze zaehlt ueber alle Gebaeude des Spielers, nicht die des Gegners', () => {
  const w = bare();
  const a = spawnBuilding(w, 0, 'twerk', 3000, 3000, true);
  const b = spawnBuilding(w, 0, 'twerk', 3300, 3000, true);
  bestelle(w, a, 'tkoloss');
  bestelle(w, b, 'tkoloss');
  step(w);
  assert.equal(a.queue.length + b.queue.length, 1, 'zwei Werkstaetten, ein Koloss');
  // ein Gegner mit gleichem Typ zaehlt nicht mit
  spawnUnit(w, 1, 'tkoloss', 9000, 9000);
  assert.equal(anzahlVon(w, 1, 'tkoloss'), 1);
  assert.equal(anzahlVon(w, 0, 'tkoloss'), 1);
});

test('Ohne hoechstens keine Grenze (nur die Schlange von acht)', () => {
  const w = bare();
  const werk = spawnBuilding(w, 0, 'twerk', 3000, 3000, true);
  for (let i = 0; i < 10; i++) bestelle(w, werk, 'tfuss');
  step(w);
  assert.equal(werk.queue.length, 8);
  assert.ok(!vollBesetzt(w, 0, 'tfuss'));
});

test('Abriss der Werkstatt gibt den bestellten Platz frei', () => {
  const w = bare();
  const werk = spawnBuilding(w, 0, 'twerk', 3000, 3000, true);
  bestelle(w, werk, 'tkoloss');
  step(w);
  assert.ok(vollBesetzt(w, 0, 'tkoloss'));
  issue(w, { type: 'demolish', player: 0, id: werk.id });
  step(w);
  assert.ok(!vollBesetzt(w, 0, 'tkoloss'));
});

test('Pruefsumme: Einheiten mit hoechstens aendern nichts am Hash', () => {
  const a = bare();
  const b = bare();
  spawnUnit(a, 0, 'tproto', 3000, 3000);
  spawnUnit(b, 0, 'tproto', 3000, 3000);
  assert.equal(hash(a), hash(b));
});

// ---------------------------------------------------------------- KI

/**
 * Spieler 0 (mensch) mit allem, was die KI vor der Werkstatt baut (Kraft,
 * Fabriken, Schreine, Tuerme, Forschung, Posten) -- sonst baut sie erst das,
 * und bei jedem Bau endet ihr Zug. Die Bauten stehen weit weg, damit der Platz
 * am Hauptgebaeude frei bleibt. Werkstatt- und Prototyp-Rolle gesetzt; Minute minute.
 */
function kiLage(minute = 19, mitRollen = true) {
  if (mitRollen) {
    FACTIONS.mensch.rollen.werkstatt = 'twerkki';
    FACTIONS.mensch.rollen.prototyp = 'tkoloss';
  } else {
    delete FACTIONS.mensch.rollen.werkstatt;
    delete FACTIONS.mensch.rollen.prototyp;
  }
  const rollen = FACTIONS.mensch.rollen;
  const w = bare();
  spawnBuilding(w, 0, FACTIONS.mensch.haupt, 3000, 3000, true);
  const vorher = [...Array(12).fill('kraft'), ...Array(8).fill('anker'), 'fabrik', 'fabrik', 'fabrik', 'zorn', 'wehr', 'turm', 'turm', 'forschung', 'forschung', 'posten'];
  vorher.forEach((r, i) => spawnBuilding(w, 0, rollen[r], 9000 + (i % 6) * 500, 9000 + ((i / 6) | 0) * 500, true));
  w.tick = minute * 600;
  return w;
}
/** Zusaetzlich ein fertiger Goetterblut-Schacht -- Goetterblut fliesst. */
function mitSchacht(w) {
  spawnBuilding(w, 0, FACTIONS.mensch.rollen.blut, 12000, 9000, true);
  return w;
}
const befehle = (w, t) => w.pending.filter((c) => c.type === t);
const neueKi = () => {
  const ai = createAI(0, 7, 'standard');
  ai.next = 0;
  return ai;
};

test('KI: baut die Werkstatt erst ab Minute 18 und wenn Goetterblut fliesst (ein fertiger Schacht)', () => {
  // Schacht fehlt
  const w1 = kiLage();
  stepAI(neueKi(), w1);
  assert.equal(befehle(w1, 'build').filter((c) => c.building === 'twerkki').length, 0, 'ohne Schacht keine Werkstatt');
  // Schacht steht, aber zu frueh
  const w2 = mitSchacht(kiLage(17));
  stepAI(neueKi(), w2);
  assert.equal(befehle(w2, 'build').filter((c) => c.building === 'twerkki').length, 0, 'vor Minute 18 keine');
  // Schacht steht, Minute 19
  const w3 = mitSchacht(kiLage(19));
  stepAI(neueKi(), w3);
  const bau = befehle(w3, 'build').filter((c) => c.building === 'twerkki');
  assert.equal(bau.length, 1);
  assert.ok(Math.hypot(bau[0].x - 3000, bau[0].y - 3000) < 3000, 'beim Hauptgebaeude');
  // und nur eine: steht schon eine, baut sie keine zweite
  const w4 = mitSchacht(kiLage(19));
  spawnBuilding(w4, 0, 'twerkki', 5000, 5000, true);
  stepAI(neueKi(), w4);
  assert.equal(befehle(w4, 'build').filter((c) => c.building === 'twerkki').length, 0);
});

test('KI: bildet den Prototyp aus, sobald die Werkstatt steht -- und nicht mehr als erlaubt', () => {
  const w = kiLage();
  const werk = spawnBuilding(w, 0, 'twerkki', 4000, 3000, true);
  stepAI(neueKi(), w);
  const p = befehle(w, 'produce').filter((c) => c.id === werk.id);
  assert.equal(p.length, 1);
  assert.equal(p[0].unit, 'tkoloss');
  // einer lebt: keine weitere Bestellung
  const w2 = kiLage();
  const werk2 = spawnBuilding(w2, 0, 'twerkki', 4000, 3000, true);
  spawnUnit(w2, 0, 'tkoloss', 3500, 3500);
  stepAI(neueKi(), w2);
  assert.equal(befehle(w2, 'produce').filter((c) => c.id === werk2.id).length, 0);
  // einer bestellt: auch keine
  const w3 = kiLage();
  const werk3 = spawnBuilding(w3, 0, 'twerkki', 4000, 3000, true);
  werk3.queue.push('tkoloss');
  stepAI(neueKi(), w3);
  assert.equal(befehle(w3, 'produce').filter((c) => c.id === werk3.id).length, 0);
});

test('KI: ohne die Rollen baut sie weder Werkstatt noch Prototyp', () => {
  const w = mitSchacht(kiLage(19, false));
  spawnBuilding(w, 0, 'twerkki', 5000, 5000, true); // eine Werkstatt steht trotzdem -- das Volk hat die Rolle nicht
  stepAI(neueKi(), w);
  assert.equal(befehle(w, 'build').filter((c) => c.building === 'twerkki').length, 0);
  assert.equal(befehle(w, 'produce').filter((c) => c.unit === 'tkoloss').length, 0);
});
