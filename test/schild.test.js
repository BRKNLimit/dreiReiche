// M2 Schild: Gebaeudefeld schild { kapazitaet, radius, laden }. Schaden an
// Eigenem im Umkreis trifft zuerst den Schild, der sich mit Gegenwart auflaedt.
// Die Volksdateien haben (noch) kein Schildgebaeude -- die Testdaten werden zur
// Laufzeit in UNITS/BUILDINGS/FACTIONS eingetragen und am Ende wieder entfernt.
//
// Radien bleiben unter dem groessten vorhandenen: die Nachbarsuche in sim.js
// rechnet GROESSTER_RADIUS einmal beim Laden aus.

import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, spawnUnit, spawnBuilding, step, hash } from '../src/sim/sim.js';
import { UNITS, BUILDINGS, FACTIONS } from '../src/sim/defs.js';
import { createAI, stepAI } from '../src/sim/ai.js';

const SCHILD = { kapazitaet: 300, radius: 800, laden: 5 };
const TEST_EINHEITEN = {
  // Schuetze: trifft Boden und Luft, genau 20 Schaden je Schuss, schiesst im ersten Tick
  tfern: {
    name: 'Testfern', desc: '', faction: 'gott', hp: 200, radius: 20, speed: 30, cost: { masse: 40 },
    buildTime: 50, kampf: 'fern', weapon: { range: 400, damage: 20, cooldown: 5, ziele: 'beide' },
  },
  // Flieger ohne Waffe
  tflug: {
    name: 'Testflug', desc: '', faction: 'mensch', hp: 100, radius: 14, speed: 40, cost: { masse: 20 },
    buildTime: 50, fliegt: true,
  },
};
const TEST_GEBAEUDE = {
  // Schildgenerator ohne Gegenwartsbedarf: laedt immer voll
  tschild: {
    name: 'Testschild', desc: '', short: 'SCH', faction: 'mensch', hp: 1000, radius: 30, cost: { masse: 100 },
    buildTime: 50, schild: SCHILD,
  },
  // Schildgenerator mit geringem Bedarf, damit ihn eine Halle voll versorgt
  tschildgw: {
    name: 'Testschild mit Gegenwart', desc: '', short: 'SCG', faction: 'mensch', hp: 1000, radius: 30, cost: { masse: 100 },
    buildTime: 50, energieIn: 1, schild: SCHILD,
  },
  // ... und einer mit hohem Bedarf: die Schmiede (40) deckt nur ein Hundertstel, er bleibt gedrosselt
  tschildviel: {
    name: 'Testschild gierig', desc: '', short: 'SCV', faction: 'mensch', hp: 1000, radius: 30, cost: { masse: 100 },
    buildTime: 50, energieIn: 4000, schild: { kapazitaet: 100000, radius: 800, laden: 50 },
  },
  // fuer die KI: kleiner Bedarf
  tschildki: {
    name: 'Testschild KI', desc: '', short: 'SCK', faction: 'mensch', hp: 800, radius: 30, cost: { masse: 100 },
    buildTime: 50, energieIn: 2, schild: SCHILD,
  },
};

Object.assign(UNITS, TEST_EINHEITEN);
Object.assign(BUILDINGS, TEST_GEBAEUDE);
// Die Tests setzen die Schild-Rolle der Menschen -- danach wieder wie vorher
const ROLLEN_VORHER = { ...FACTIONS.mensch.rollen };
after(() => {
  for (const k of Object.keys(TEST_EINHEITEN)) delete UNITS[k];
  for (const k of Object.keys(TEST_GEBAEUDE)) delete BUILDINGS[k];
  for (const r of Object.keys(FACTIONS.mensch.rollen)) delete FACTIONS.mensch.rollen[r];
  Object.assign(FACTIONS.mensch.rollen, ROLLEN_VORHER);
});

function bare() {
  return createWorld({ empty: true, factions: ['mensch', 'gott'] });
}
/** Einheit, die sich nicht bewegen kann: bleibt, wo sie ist (Wurzelgriff). */
function festgehalten(e) {
  e.gebundenBis = 1e9;
  return e;
}
const schritte = (w, n) => {
  for (let i = 0; i < n; i++) step(w);
};
/**
 * Ein Schildgebaeude (Spieler 0) mit festen Punkten. Ohne Anker und Kraft in der
 * Naehe ist es unversorgt und laedt nicht -- die Punkte aendern sich nur durch Treffer.
 */
function geladen(w, x, y, punkte = SCHILD.kapazitaet, typ = 'tschildgw') {
  const s = spawnBuilding(w, 0, typ, x, y, true);
  s.schildPunkte = punkte;
  return s;
}
/** Feindlicher Schuetze (Spieler 1), der genau 20 Schaden je Schuss austeilt, nach rechts versetzt. */
function schuetze(w, x, y) {
  return festgehalten(spawnUnit(w, 1, 'tfern', x, y));
}
const schildEreignisse = (w) => w.events.filter((ev) => ev.t === 'schild');

test('Schild faengt ab, der Rest trifft die LP', () => {
  const w = bare();
  const s = geladen(w, 5000, 5000, 15);
  const soldat = festgehalten(spawnUnit(w, 0, 'soldat', 5200, 5000));
  schuetze(w, 5560, 5000); // erreicht den Soldaten (360), nicht das Gebaeude (560)
  step(w);
  assert.equal(s.schildPunkte, 0, 'alle 15 Punkte verbraucht');
  assert.equal(soldat.hp, soldat.maxHp - 5, '20 Schaden - 15 abgefangen = 5');
  assert.equal(s.hp, s.maxHp);
  const ev = schildEreignisse(w);
  assert.equal(ev.length, 1);
  assert.deepEqual(
    { id: ev[0].id, von: ev[0].von, x: ev[0].x, y: ev[0].y, wert: ev[0].wert },
    { id: soldat.id, von: s.id, x: 5200, y: 5000, wert: 15 },
  );
});

test('voller Schild haelt den ganzen Schuss, die LP bleiben heil', () => {
  const w = bare();
  const s = geladen(w, 5000, 5000);
  const soldat = festgehalten(spawnUnit(w, 0, 'soldat', 5200, 5000));
  schuetze(w, 5560, 5000);
  step(w);
  assert.equal(soldat.hp, soldat.maxHp);
  assert.equal(s.schildPunkte, SCHILD.kapazitaet - 20);
  assert.equal(schildEreignisse(w)[0].wert, 20);
});

test('das Schildgebaeude schuetzt sich selbst', () => {
  const w = bare();
  const s = geladen(w, 5000, 5000);
  schuetze(w, 5400, 5000); // erreicht das Gebaeude (400 < 400 + 20 + 30)
  schritte(w, 3);
  assert.equal(s.hp, s.maxHp, 'LP unberuehrt');
  assert.equal(s.schildPunkte, SCHILD.kapazitaet - 20, 'ein Schuss (Abklingzeit 5 Ticks), vom eigenen Schild gehalten');
});

test('Flieger im Umkreis sind geschuetzt', () => {
  const w = bare();
  const s = geladen(w, 5000, 5000);
  const flieger = festgehalten(spawnUnit(w, 0, 'tflug', 5300, 5000));
  schuetze(w, 5600, 5000);
  step(w);
  assert.equal(flieger.hp, flieger.maxHp);
  assert.equal(s.schildPunkte, SCHILD.kapazitaet - 20);
});

test('der Schild schuetzt keine Feinde: Schaden an Einheiten des Gegners geht voll auf die LP', () => {
  const w = bare();
  const s = geladen(w, 5000, 5000);
  // Spieler 1 steht in der Kuppel von Spieler 0; Spieler 0 schiesst darauf
  const feind = festgehalten(spawnUnit(w, 1, 'soldat', 5200, 5000));
  festgehalten(spawnUnit(w, 0, 'tfern', 5560, 5000)); // Test-Einheit gehoert Spieler 0, schiesst auf den Feind
  step(w);
  assert.equal(feind.hp, feind.maxHp - 20);
  assert.equal(s.schildPunkte, SCHILD.kapazitaet, 'unberuehrt');
  assert.equal(schildEreignisse(w).length, 0);
});

test('nichts ausserhalb des Umkreises wird geschuetzt, am Rand schon', () => {
  const w = bare();
  const s = geladen(w, 5000, 5000);
  const drin = festgehalten(spawnUnit(w, 0, 'soldat', 5000 + SCHILD.radius, 5000)); // genau am Rand
  const draussen = festgehalten(spawnUnit(w, 0, 'soldat', 5000, 5000 + SCHILD.radius + 1)); // einen dm zu weit
  schuetze(w, 5000 + SCHILD.radius + 360, 5000); // erreicht nur den Randsoldaten
  step(w);
  assert.equal(drin.hp, drin.maxHp, 'am Rand: geschuetzt');
  assert.equal(s.schildPunkte, SCHILD.kapazitaet - 20);
  const w2 = bare();
  const s2 = geladen(w2, 5000, 5000);
  const aussen = festgehalten(spawnUnit(w2, 0, 'soldat', 5000, 5000 + SCHILD.radius + 1));
  schuetze(w2, 5000, 5000 + SCHILD.radius + 1 + 360);
  step(w2);
  assert.equal(aussen.hp, aussen.maxHp - 20, 'ausserhalb: voller Schaden');
  assert.equal(s2.schildPunkte, SCHILD.kapazitaet);
  assert.equal(draussen.hp, draussen.maxHp, 'der ferne Soldat der ersten Welt wurde nie beschossen');
});

test('ein Schild fremder Besitzer schuetzt nicht, auch wenn er ueber dem Ziel steht', () => {
  const w = bare();
  const s = spawnBuilding(w, 1, 'tschild', 5000, 5000, true); // gehoert Spieler 1
  s.schildPunkte = SCHILD.kapazitaet;
  const soldat = festgehalten(spawnUnit(w, 0, 'soldat', 5200, 5000)); // Spieler 0
  schuetze(w, 5560, 5000);
  step(w);
  assert.equal(soldat.hp, soldat.maxHp - 20);
  assert.equal(s.schildPunkte, SCHILD.kapazitaet);
});

test('Ueberlappung: der Schild mit der kleinsten Id faengt zuerst, der Rest geht nicht auf den naechsten', () => {
  const w = bare();
  const a = geladen(w, 5000, 5000, 10);
  const b = geladen(w, 5100, 5000, 100); // spaeter gebaut: groessere Id
  assert.ok(a.id < b.id);
  const soldat = festgehalten(spawnUnit(w, 0, 'soldat', 5200, 5000));
  schuetze(w, 5560, 5000);
  step(w);
  assert.equal(a.schildPunkte, 0);
  assert.equal(b.schildPunkte, 100, 'B bleibt unberuehrt');
  assert.equal(soldat.hp, soldat.maxHp - 10, 'Rest von 10 geht auf die LP');
  schritte(w, 6); // naechster Schuss (Abklingzeit 5): A ist leer, B ist dran
  assert.equal(b.schildPunkte, 80);
  assert.equal(soldat.hp, soldat.maxHp - 10);
});

test('leerer Schild haelt nichts', () => {
  const w = bare();
  const s = geladen(w, 5000, 5000, 0);
  const soldat = festgehalten(spawnUnit(w, 0, 'soldat', 5200, 5000));
  schuetze(w, 5560, 5000);
  step(w);
  assert.equal(soldat.hp, soldat.maxHp - 20);
  assert.equal(s.schildPunkte, 0);
  assert.equal(schildEreignisse(w).length, 0);
});

test('eine Baustelle schuetzt nicht, auch nicht mit Schildpunkten', () => {
  const w = bare();
  const s = spawnBuilding(w, 0, 'tschild', 5000, 5000, false);
  s.schildPunkte = SCHILD.kapazitaet;
  const soldat = festgehalten(spawnUnit(w, 0, 'soldat', 5200, 5000));
  schuetze(w, 5560, 5000);
  step(w);
  assert.equal(soldat.hp, soldat.maxHp - 20);
  assert.equal(s.schildPunkte, SCHILD.kapazitaet);
});

test('fertig gebaut startet der Schild leer', () => {
  const w = bare();
  const s = spawnBuilding(w, 0, 'tschild', 5000, 5000, true);
  assert.equal(s.schildPunkte, 0);
  assert.equal(spawnBuilding(w, 0, 'halle', 3000, 3000, true).schildPunkte, 0, 'Gebaeude ohne Schild: 0, ohne Wirkung');
});

test('Laden: voll mit Gegenwart bis zur Kapazitaet, gedrosselt anteilig, ohne Gegenwart gar nicht', () => {
  // mit Gegenwart: Halle (Anker) und Schmiede (Kraft) versorgen den Generator voll
  const netz = (w) => {
    spawnBuilding(w, 0, FACTIONS.mensch.haupt, 3000, 3000, true);
    spawnBuilding(w, 0, FACTIONS.mensch.rollen.kraft, 3000, 3600, true);
  };
  const w = bare();
  netz(w);
  const s = spawnBuilding(w, 0, 'tschildgw', 3500, 3000, true);
  schritte(w, 20);
  assert.equal(s.powered, 1000);
  assert.equal(s.schildPunkte, 20 * SCHILD.laden, 'laden je Tick');
  schritte(w, 100);
  assert.equal(s.schildPunkte, SCHILD.kapazitaet, 'nicht ueber die Kapazitaet');

  // ohne Gegenwart: kein Anker in der Naehe, der Bedarf bleibt ungedeckt
  const w2 = bare();
  const s2 = spawnBuilding(w2, 0, 'tschildgw', 3500, 3000, true);
  schritte(w2, 100);
  assert.equal(s2.powered, 0);
  assert.equal(s2.schildPunkte, 0);

  // gedrosselt: anteilig zur Versorgung, der Rest unter einem Punkt geht nicht verloren
  const w3 = bare();
  netz(w3);
  const s3 = spawnBuilding(w3, 0, 'tschildviel', 3500, 3000, true);
  schritte(w3, 100);
  assert.ok(s3.powered > 0 && s3.powered < 100, `stark gedrosselt (powered ${s3.powered})`);
  // 50 Punkte je Tick bei so wenig Promille sind unter einem Punkt je Tick: ohne Rest ginge alles verloren
  assert.equal(s3.schildPunkte, Math.floor((100 * 50 * s3.powered) / 1000));
  assert.ok(s3.schildPunkte > 0);
});

test('ein geladener Schild behaelt seine Punkte, wenn die Gegenwart ausfaellt', () => {
  const w = bare();
  const s = spawnBuilding(w, 0, 'tschildgw', 3500, 3000, true); // kein Anker: powered 0
  s.schildPunkte = 120;
  schritte(w, 50);
  assert.equal(s.schildPunkte, 120);
});

test('Schilde laden auch waehrend sie getroffen werden', () => {
  const w = bare();
  const s = geladen(w, 5000, 5000, 100, 'tschild');
  schuetze(w, 5400, 5000);
  // tschild hat keinen Bedarf: powered 1000, laedt 5 je Tick; der Schuetze schiesst alle 6 Ticks (Abklingzeit 5)
  schritte(w, 60);
  assert.equal(s.hp, s.maxHp);
  assert.ok(s.schildPunkte > 100, 'Laden gewinnt gegen einen Schuetzen');
});

test('Pruefsumme: Schildpunkte gehen in den Hash, Welten ohne Schild bleiben unberuehrt', () => {
  const a = bare();
  const b = bare();
  geladen(a, 5000, 5000, 100);
  geladen(b, 5000, 5000, 101);
  assert.notEqual(hash(a), hash(b));
  const c = bare();
  const d = bare();
  spawnBuilding(c, 0, 'halle', 3000, 3000, true);
  spawnBuilding(d, 0, 'halle', 3000, 3000, true);
  assert.equal(hash(c), hash(d));
});

test('Partie mit Schilden und Gefecht ist deterministisch', () => {
  const lauf = () => {
    const w = bare();
    spawnBuilding(w, 0, FACTIONS.mensch.haupt, 3000, 3000, true);
    spawnBuilding(w, 0, 'tschildgw', 3600, 3200, true);
    spawnBuilding(w, 0, 'tschildgw', 3500, 3700, true);
    spawnBuilding(w, 1, FACTIONS.gott.haupt, 9000, 9000, true);
    const eigene = [];
    const feinde = [];
    for (let i = 0; i < 4; i++) {
      eigene.push(spawnUnit(w, 0, ['soldat', 'jaeger', 'tflug', 'soldat'][i], 3700 + i * 90, 3400 - i * 40).id);
      feinde.push(spawnUnit(w, 1, ['tfern', 'tfern', 'wolf', 'tfern'][i], 4300 - i * 90, 3500 + i * 40).id);
    }
    let abgefangen = 0;
    for (let t = 0; t < 600; t++) {
      step(w);
      for (const ev of w.events) if (ev.t === 'schild') abgefangen += ev.wert;
    }
    return { h: hash(w), n: w.entities.length, abgefangen };
  };
  const x = lauf();
  const y = lauf();
  assert.deepEqual(x, y);
  assert.ok(x.abgefangen > 0, 'Schilde haben abgefangen');
});

// ---------------------------------------------------------------- KI

test('KI: Schildgenerator beim Hauptgebaeude erst ab Minute 10, nur mit der Rolle', () => {
  const lauf = (mitRolle, bisTick) => {
    if (mitRolle) FACTIONS.mensch.rollen.schild = 'tschildki';
    else delete FACTIONS.mensch.rollen.schild;
    const w = createWorld({ seed: 7, factions: ['mensch', 'mensch'] });
    const ais = [createAI(0, 7, 'standard'), createAI(1, 8, 'standard')];
    let erster = -1;
    for (let t = 0; t < bisTick && !w.over; t++) {
      stepAI(ais[0], w);
      stepAI(ais[1], w);
      step(w);
      if (erster < 0 && t % 10 === 0 && w.entities.some((e) => e.type === 'tschildki' && e.player === 0)) erster = t;
    }
    return { erster, haupt: w.entities.find((e) => e.kind === 'building' && e.player === 0 && BUILDINGS[e.type].vital) };
  };
  const ohne = lauf(false, 9000);
  assert.equal(ohne.erster, -1, 'ohne Rolle baut sie nichts');
  const mit = lauf(true, 9000);
  assert.ok(mit.erster >= 6000, `nicht vor Minute 10 (gebaut bei Tick ${mit.erster})`);
  assert.ok(mit.erster > 0, 'und dann wird einer gebaut');
});
