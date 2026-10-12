// M4 Fernschlag und Abwehr: Gebaeudefeld schlag { laden, flug, reichweite,
// radius, schaden, kosten } mit dem Befehl 'schlag' auf einen Punkt, und
// abwehr { radius, laden }, die einen gegnerischen Schlag abfaengt.
// Die Volksdateien haben (noch) kein solches Gebaeude -- die Testdaten werden
// zur Laufzeit in UNITS/BUILDINGS/FACTIONS eingetragen und am Ende wieder
// entfernt. Radien bleiben unter dem groessten vorhandenen (GROESSTER_RADIUS
// in sim.js wird einmal beim Laden berechnet).

import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, spawnUnit, spawnBuilding, step, hash, issue, schlagBereit } from '../src/sim/sim.js';
import { UNITS, BUILDINGS, FACTIONS } from '../src/sim/defs.js';
import { createAI, stepAI } from '../src/sim/ai.js';
import { zustandSichern, zustandLaden } from '../src/spielstand.js';

const SCHLAG = { laden: 20, flug: 30, reichweite: 5000, radius: 300, schaden: 100, kosten: { fron: 10, goetterblut: 5 } };
const TEST_EINHEITEN = {
  // ohne Waffe: nimmt nur Schaden. Zwei Seiten, damit Spieler 0 und 1 je eine haben.
  tziel0: { name: 'Testziel', desc: '', faction: 'mensch', hp: 300, radius: 20, speed: 30, cost: { fron: 40 }, buildTime: 50 },
  tziel1: { name: 'Testziel', desc: '', faction: 'gott', hp: 300, radius: 20, speed: 30, cost: { fron: 40 }, buildTime: 50 },
  tflug1: { name: 'Testflieger', desc: '', faction: 'gott', hp: 300, radius: 14, speed: 40, cost: { fron: 20 }, buildTime: 50, fliegt: true },
};
const TEST_GEBAEUDE = {
  // ohne Gegenwartsbedarf: laedt immer voll
  tschlag: { name: 'Testschlag', desc: '', short: 'SLG', faction: 'mensch', hp: 1000, radius: 30, cost: { fron: 100 }, buildTime: 50, schlag: SCHLAG },
  // mit kleinem Bedarf, damit ihn ein Netz voll versorgt
  tschlagnetz: { name: 'Testschlag mit Gegenwart', desc: '', short: 'SLN', faction: 'mensch', hp: 1000, radius: 30, cost: { fron: 100 }, buildTime: 50, gegenwartIn: 1, schlag: SCHLAG },
  // ... und einer mit hohem Bedarf: bleibt gedrosselt
  tschlagviel: {
    name: 'Testschlag gierig', desc: '', short: 'SLV', faction: 'mensch', hp: 1000, radius: 30, cost: { fron: 100 }, buildTime: 50, gegenwartIn: 4000,
    schlag: { ...SCHLAG, laden: 100000 },
  },
  // fuer die KI: kleiner Bedarf, kostet nur Fron
  tschlagki: {
    name: 'Testschlag KI', desc: '', short: 'SLK', faction: 'mensch', hp: 800, radius: 30, cost: { fron: 100 }, buildTime: 50, gegenwartIn: 2,
    schlag: { ...SCHLAG, reichweite: 9000, kosten: { fron: 10 } },
  },
  tabwehr0: { name: 'Testabwehr', desc: '', short: 'ABW', faction: 'mensch', hp: 1000, radius: 30, cost: { fron: 100 }, buildTime: 50, abwehr: { radius: 400, laden: 40 } },
  tabwehr1: { name: 'Testabwehr', desc: '', short: 'ABW', faction: 'gott', hp: 1000, radius: 30, cost: { fron: 100 }, buildTime: 50, abwehr: { radius: 400, laden: 40 } },
  // Abwehr mit Bedarf, aber ohne Netz: lädt nie -- die Ladung bleibt, wie sie gesetzt wird
  tabwehrnetz: { name: 'Testabwehr ohne Netz', desc: '', short: 'ABN', faction: 'gott', hp: 1000, radius: 30, cost: { fron: 100 }, buildTime: 50, gegenwartIn: 1, abwehr: { radius: 400, laden: 40 } },
  tabwehrki: { name: 'Testabwehr KI', desc: '', short: 'ABK', faction: 'mensch', hp: 800, radius: 30, cost: { fron: 100 }, buildTime: 50, gegenwartIn: 2, abwehr: { radius: 400, laden: 40 } },
  // Schild des Spielers 1; ohne Netz geladen, lädt also nicht nach
  tschild1: { name: 'Testschild', desc: '', short: 'SCH', faction: 'gott', hp: 1000, radius: 30, cost: { fron: 100 }, buildTime: 50, gegenwartIn: 1, schild: { kapazitaet: 60, radius: 500, laden: 1 } },
  // Ziel mit wenig Leben
  tturm1: { name: 'Testbau', desc: '', short: 'TST', faction: 'gott', hp: 80, radius: 30, cost: { fron: 100 }, buildTime: 50 },
};

Object.assign(UNITS, TEST_EINHEITEN);
Object.assign(BUILDINGS, TEST_GEBAEUDE);
after(() => {
  for (const k of Object.keys(TEST_EINHEITEN)) delete UNITS[k];
  for (const k of Object.keys(TEST_GEBAEUDE)) delete BUILDINGS[k];
  delete FACTIONS.mensch.rollen.schlag;
  delete FACTIONS.mensch.rollen.abwehr;
});

function bare() {
  const w = createWorld({ empty: true, factions: ['mensch', 'gott'] });
  w.players[0].goetterblut = 100;
  w.players[1].goetterblut = 100;
  return w;
}
const festgehalten = (e) => {
  e.gebundenBis = 1e9;
  return e;
};
const schritte = (w, n) => {
  for (let i = 0; i < n; i++) step(w);
};
/** Schlaggebaeude des Spielers 0, sofort geladen. */
function bereit(w, x = 3000, y = 3000, typ = 'tschlag') {
  const b = spawnBuilding(w, 0, typ, x, y, true);
  b.schlagLadung = BUILDINGS[typ].schlag.laden;
  return b;
}
/** Abwehr mit gesetzter Ladung (Spieler 1 = Gott, sonst Mensch). */
function abwehr(w, player, x, y, ladung = 40, typ = player === 1 ? 'tabwehr1' : 'tabwehr0') {
  const b = spawnBuilding(w, player, typ, x, y, true);
  b.abwehrLadung = ladung;
  return b;
}
const schiesse = (w, b, x, y, player = 0) => issue(w, { type: 'schlag', player, id: b.id, x, y });
const ereignisse = (w, t) => w.events.filter((ev) => ev.t === t);

// ---------------------------------------------------------------- Befehl

test('Befehl: nur ein geladenes Gebaeude feuert; Ladung und Kosten wie gesagt', () => {
  const w = bare();
  const b = spawnBuilding(w, 0, 'tschlag', 3000, 3000, true);
  schiesse(w, b, 5000, 3000);
  step(w);
  assert.equal(w.schlaege.length, 0, 'ungeladen: nichts');
  assert.equal(w.players[0].fron, 1100, 'nichts bezahlt');
  schritte(w, SCHLAG.laden); // der Befehl geht mit dem naechsten Tick: bis dahin ist die Ladung voll
  assert.equal(b.schlagLadung, SCHLAG.laden);
  assert.ok(schlagBereit(b));
  const fron = w.players[0].fron;
  schiesse(w, b, 5000, 3000);
  step(w);
  assert.equal(w.schlaege.length, 1);
  assert.deepEqual(
    { von: w.schlaege[0].von, player: w.schlaege[0].player, x: w.schlaege[0].x, y: w.schlaege[0].y, radius: w.schlaege[0].radius, schaden: w.schlaege[0].schaden },
    { von: b.id, player: 0, x: 5000, y: 3000, radius: SCHLAG.radius, schaden: SCHLAG.schaden },
  );
  assert.equal(w.schlaege[0].landet, w.tick - 1 + SCHLAG.flug, 'landet nach flug Ticks, vom Tick des Befehls gerechnet');
  // leer, und im Abschusstick zaehlt schon der erste Ladetick (Befehle gelten vor dem Laden)
  assert.equal(b.schlagLadung, 1, 'Ladung leer');
  assert.ok(!schlagBereit(b));
  assert.equal(w.players[0].fron, fron - 10);
  assert.equal(w.players[0].goetterblut, 95);
  const start = ereignisse(w, 'schlagStart');
  assert.equal(start.length, 1);
  assert.deepEqual({ von: start[0].von, x: start[0].x, y: start[0].y, player: start[0].player }, { von: b.id, x: 5000, y: 3000, player: 0 });
  // noch einmal sofort: leer, also nichts
  schiesse(w, b, 5000, 3000);
  step(w);
  assert.equal(w.schlaege.length, 1);
});

test('Befehl: Reichweite vom Gebaeude zum Ziel, am Rand noch, einen dm weiter nicht', () => {
  const w = bare();
  const b = bereit(w, 3000, 3000);
  schiesse(w, b, 3000 + SCHLAG.reichweite + 1, 3000);
  step(w);
  assert.equal(w.schlaege.length, 0, 'einen dm zu weit');
  assert.ok(schlagBereit(b), 'und die Ladung bleibt');
  schiesse(w, b, 3000 + SCHLAG.reichweite, 3000);
  step(w);
  assert.equal(w.schlaege.length, 1);
});

test('Befehl: nicht bezahlbar -- Fron oder Goetterblut zu wenig -- wird abgelehnt, geladen bleibt geladen', () => {
  const w = bare();
  const b = bereit(w);
  w.players[0].goetterblut = 4;
  schiesse(w, b, 4000, 3000);
  step(w);
  assert.equal(w.schlaege.length, 0);
  assert.equal(w.players[0].goetterblut, 4);
  assert.ok(schlagBereit(b));
  w.players[0].goetterblut = 5;
  w.players[0].fron = 9;
  schiesse(w, b, 4000, 3000);
  step(w);
  assert.equal(w.schlaege.length, 0, 'Fron fehlt');
  w.players[0].fron = 10;
  schiesse(w, b, 4000, 3000);
  step(w);
  assert.equal(w.schlaege.length, 1);
  assert.equal(w.players[0].fron, 0);
  assert.equal(w.players[0].goetterblut, 0);
});

test('Befehl: nur das eigene, fertige Gebaeude; Ziele ausserhalb der Karte nicht', () => {
  const w = bare();
  const fremd = bereit(w); // gehoert Spieler 0
  schiesse(w, fremd, 4000, 3000, 1); // Spieler 1 versucht es
  step(w);
  assert.equal(w.schlaege.length, 0, 'fremdes Gebaeude');
  const baustelle = spawnBuilding(w, 0, 'tschlag', 3500, 3000, false);
  baustelle.schlagLadung = SCHLAG.laden;
  schiesse(w, baustelle, 4000, 3000);
  step(w);
  assert.equal(w.schlaege.length, 0, 'Baustelle');
  const ohne = spawnBuilding(w, 0, 'halle', 3000, 4000, true);
  schiesse(w, ohne, 4000, 3000);
  step(w);
  assert.equal(w.schlaege.length, 0, 'Gebaeude ohne schlag');
  schiesse(w, fremd, -10, 3000);
  step(w);
  assert.equal(w.schlaege.length, 0, 'ausserhalb der Karte');
  schiesse(w, { id: 999999 }, 4000, 3000);
  step(w); // unbekannte Id: kein Absturz
  assert.equal(w.schlaege.length, 0);
});

test('Befehl: das Ziel braucht keine Sicht -- auch ein leerer Punkt ist erlaubt', () => {
  const w = bare();
  const b = bereit(w);
  schiesse(w, b, 7000, 3000 + 2000);
  step(w);
  assert.equal(w.schlaege.length, 1);
});

// ---------------------------------------------------------------- Einschlag

test('Einschlag: nach flug Ticks, trifft beide Seiten im Kreis gleich hart, nichts ausserhalb', () => {
  const w = bare();
  const b = bereit(w, 3000, 3000);
  const eigene = festgehalten(spawnUnit(w, 0, 'tziel0', 5000, 3000)); // Mitte
  const feind = festgehalten(spawnUnit(w, 1, 'tziel1', 5000 + SCHLAG.radius, 3000)); // genau am Rand
  const draussen = festgehalten(spawnUnit(w, 1, 'tziel1', 5000, 3000 + SCHLAG.radius + 1)); // einen dm zu weit
  const bau = spawnBuilding(w, 1, 'tturm1', 5000 - 100, 3000 + 100, true); // Gebaeude zaehlt auch
  bau.hp = bau.maxHp = 500;
  schiesse(w, b, 5000, 3000);
  step(w); // Abschuss
  schritte(w, SCHLAG.flug - 1);
  assert.equal(eigene.hp, 300, 'noch im Flug');
  assert.equal(w.schlaege.length, 1);
  step(w); // Einschlag
  assert.equal(w.schlaege.length, 0, 'eingeschlagen');
  assert.equal(eigene.hp, 300 - SCHLAG.schaden, 'Eigene im Kreis nehmen Schaden');
  assert.equal(feind.hp, 300 - SCHLAG.schaden, 'am Rand noch getroffen, gleich hoch');
  assert.equal(bau.hp, 500 - SCHLAG.schaden, 'Gebaeude auch');
  assert.equal(draussen.hp, 300);
  const ev = ereignisse(w, 'schlag');
  assert.equal(ev.length, 1);
  assert.deepEqual({ x: ev[0].x, y: ev[0].y, radius: ev[0].radius }, { x: 5000, y: 3000, radius: SCHLAG.radius });
});

test('Einschlag: Flieger im Kreis werden getroffen, das Schlaggebaeude darf inzwischen fallen', () => {
  const w = bare();
  const b = bereit(w, 3000, 3000);
  const flieger = festgehalten(spawnUnit(w, 1, 'tflug1', 5000, 3000));
  schiesse(w, b, 5000, 3000);
  step(w);
  b.dead = true; // abgerissen, zerstoert -- der Schlag ist unterwegs
  schritte(w, SCHLAG.flug);
  assert.equal(flieger.hp, 300 - SCHLAG.schaden);
});

test('Einschlag: wer fallen muss, faellt wie im Kampf -- Ereignis died, aus der Welt', () => {
  const w = bare();
  const b = bereit(w, 3000, 3000);
  const schwach = festgehalten(spawnUnit(w, 1, 'tziel1', 5000, 3000));
  schwach.hp = SCHLAG.schaden; // genau tot
  const knapp = festgehalten(spawnUnit(w, 0, 'tziel0', 5100, 3000));
  knapp.hp = SCHLAG.schaden + 1;
  const turm = spawnBuilding(w, 1, 'tturm1', 4900, 3000, true); // 80 LP
  schiesse(w, b, 5000, 3000);
  schritte(w, SCHLAG.flug + 1);
  assert.ok(!w.entities.includes(schwach));
  assert.ok(!w.entities.includes(turm));
  assert.equal(knapp.hp, 1);
  assert.ok(w.entities.includes(knapp));
  // das Ereignis steht im Tick des Einschlags (steps vorher: Abschuss + flug - 1, hier der letzte)
  const w2 = bare();
  const b2 = bereit(w2, 3000, 3000);
  const z = festgehalten(spawnUnit(w2, 1, 'tziel1', 5000, 3000));
  z.hp = 1;
  schiesse(w2, b2, 5000, 3000);
  schritte(w2, SCHLAG.flug + 1);
  const tod = ereignisse(w2, 'died');
  assert.equal(tod.length, 1);
  assert.deepEqual({ id: tod[0].id, kind: tod[0].kind, player: tod[0].player }, { id: z.id, kind: 'unit', player: 1 });
});

test('Einschlag: ein gefallenes Hauptgebaeude beendet die Partie wie im Kampf', () => {
  const w = bare();
  const b = bereit(w, 3000, 3000);
  spawnBuilding(w, 0, FACTIONS.mensch.haupt, 3000, 5000, true);
  const haupt1 = spawnBuilding(w, 1, FACTIONS.gott.haupt, 5000, 3000, true);
  haupt1.hp = 50;
  schiesse(w, b, 5000, 3000);
  schritte(w, SCHLAG.flug + 1);
  assert.ok(w.over);
  assert.equal(w.winner, 0);
});

test('Schild: nimmt zuerst, der Rest geht auf die LP -- nur der Schild des Opfers, nicht der des Schuetzen', () => {
  const w = bare();
  const b = bereit(w, 3000, 3000);
  // Schild von Spieler 1 neben dem Kreis (600 vom Ziel, Kuppel 500): selbst nicht getroffen, deckt aber den Feind bei 5100
  const s = spawnBuilding(w, 1, 'tschild1', 5600, 3000, true);
  s.schildPunkte = 60; // kapazitaet 60, ohne Netz: laedt nicht nach
  const feind = festgehalten(spawnUnit(w, 1, 'tziel1', 5100, 3000));
  const eigene = festgehalten(spawnUnit(w, 0, 'tziel0', 4900, 3000)); // im Kreis, aber nicht unter dem Schild von Spieler 1
  schiesse(w, b, 5000, 3000);
  schritte(w, SCHLAG.flug + 1);
  assert.equal(s.schildPunkte, 0, 'der Schild gab alles her');
  assert.equal(feind.hp, 300 - (SCHLAG.schaden - 60), 'der Rest, den die 60 Punkte nicht deckten');
  assert.equal(eigene.hp, 300 - SCHLAG.schaden, 'der Schild des Gegners schuetzt keine fremden Einheiten');
  assert.equal(s.hp, s.maxHp, 'der Schild stand ausserhalb des Kreises');
  const ev = ereignisse(w, 'schild');
  assert.equal(ev.length, 1);
  assert.equal(ev[0].wert, 60);
  // genug Punkte: der ganze Schlag bleibt am Schild haengen
  const w2 = bare();
  const b2 = bereit(w2, 3000, 3000);
  const s2 = spawnBuilding(w2, 1, 'tschild1', 5600, 3000, true);
  s2.schildPunkte = 250; // mehr als die Kapazitaet: gesetzt, nicht geladen
  const f2 = festgehalten(spawnUnit(w2, 1, 'tziel1', 5100, 3000));
  schiesse(w2, b2, 5000, 3000);
  schritte(w2, SCHLAG.flug + 1);
  assert.equal(f2.hp, 300);
  assert.equal(s2.schildPunkte, 150);
});

// ---------------------------------------------------------------- Abwehr

test('Abwehr: faengt ab, kein Schaden, die Ladung ist leer und muss neu laden', () => {
  const w = bare();
  const b = bereit(w, 3000, 3000);
  const a = abwehr(w, 1, 5200, 3000); // Ziel liegt 200 entfernt, Radius 400
  const feind = festgehalten(spawnUnit(w, 1, 'tziel1', 5000, 3000));
  schiesse(w, b, 5000, 3000);
  schritte(w, SCHLAG.flug + 1);
  assert.equal(feind.hp, 300, 'kein Schaden');
  assert.equal(w.schlaege.length, 0);
  assert.equal(a.abwehrLadung, 0, 'Ladung leer; die Abwehr laedt erst im naechsten Tick wieder');
  step(w);
  assert.equal(a.abwehrLadung, 1);
  // dieselbe Lage noch einmal, den Tick des Ereignisses abfangen
  const w2 = bare();
  const b2 = bereit(w2, 3000, 3000);
  abwehr(w2, 1, 5200, 3000);
  schiesse(w2, b2, 5000, 3000);
  schritte(w2, SCHLAG.flug + 1);
  const ev2 = ereignisse(w2, 'abgefangen');
  assert.equal(ev2.length, 1);
  assert.deepEqual({ x: ev2[0].x, y: ev2[0].y, player: ev2[0].player, ax: ev2[0].ax, ay: ev2[0].ay }, { x: 5000, y: 3000, player: 0, ax: 5200, ay: 3000 });
  assert.equal(ereignisse(w2, 'schlag').length, 0, 'und kein Einschlag');
});

test('Abwehr: neu laden dauert laden Ticks; die naechste Rakete schlaegt dann durch', () => {
  const w = bare();
  const b = bereit(w, 3000, 3000);
  const a = abwehr(w, 1, 5200, 3000);
  const feind = festgehalten(spawnUnit(w, 1, 'tziel1', 5000, 3000));
  schiesse(w, b, 5000, 3000);
  schritte(w, SCHLAG.flug + 1);
  assert.equal(feind.hp, 300);
  // zweiter Schlag: die Abwehr ist noch leer (Ladung zaehlt hoch)
  b.schlagLadung = SCHLAG.laden;
  schiesse(w, b, 5000, 3000);
  schritte(w, SCHLAG.flug + 1);
  assert.ok(a.abwehrLadung < 40, 'war nicht wieder voll');
  assert.equal(feind.hp, 300 - SCHLAG.schaden, 'der zweite Schlag trifft');
  // und nach genug Zeit ist sie wieder bereit
  schritte(w, 40);
  assert.equal(a.abwehrLadung, 40);
});

test('Abwehr: ungeladen faengt nichts, ausserhalb ihres Umkreises auch nicht', () => {
  const w = bare();
  const b = bereit(w, 3000, 3000);
  abwehr(w, 1, 5200, 3000, 39); // ein Tick fehlt: laedt im Einschlagstick nach -- schon vorher voll
  const feind = festgehalten(spawnUnit(w, 1, 'tziel1', 5000, 3000));
  schiesse(w, b, 5000, 3000);
  schritte(w, SCHLAG.flug + 1);
  assert.equal(feind.hp, 300, 'sie hat bis zum Einschlag voll geladen');

  const w2 = bare();
  const b2 = bereit(w2, 3000, 3000);
  const a2 = spawnBuilding(w2, 1, 'tabwehrnetz', 5200, 3000, true); // Bedarf ohne Netz: laedt nicht
  a2.abwehrLadung = 39;
  const f2 = festgehalten(spawnUnit(w2, 1, 'tziel1', 5000, 3000));
  schiesse(w2, b2, 5000, 3000);
  schritte(w2, SCHLAG.flug + 1);
  assert.equal(f2.hp, 300 - SCHLAG.schaden, 'ungeladen: schlaegt durch');
  assert.equal(a2.abwehrLadung, 39, 'und bleibt, wie sie war');

  const w3 = bare();
  const b3 = bereit(w3, 3000, 3000);
  abwehr(w3, 1, 5000 + 401, 3000); // Ziel 401 vom Gebaeude: knapp ausserhalb
  const f3 = festgehalten(spawnUnit(w3, 1, 'tziel1', 5000, 3000));
  schiesse(w3, b3, 5000, 3000);
  schritte(w3, SCHLAG.flug + 1);
  assert.equal(f3.hp, 300 - SCHLAG.schaden, 'Ziel ausserhalb der Abwehr');
  const w4 = bare();
  const b4 = bereit(w4, 3000, 3000);
  abwehr(w4, 1, 5000 + 400, 3000); // Ziel genau am Rand: gedeckt
  const f4 = festgehalten(spawnUnit(w4, 1, 'tziel1', 5000, 3000));
  schiesse(w4, b4, 5000, 3000);
  schritte(w4, SCHLAG.flug + 1);
  assert.equal(f4.hp, 300);
});

test('Abwehr: die eigene faengt den eigenen Schlag nicht', () => {
  const w = bare();
  const b = bereit(w, 3000, 3000);
  const a = abwehr(w, 0, 5200, 3000, 40, 'tabwehr0'); // Spieler 0: gleicher Besitzer wie der Schlag
  const feind = festgehalten(spawnUnit(w, 1, 'tziel1', 5000, 3000));
  schiesse(w, b, 5000, 3000);
  schritte(w, SCHLAG.flug + 1);
  assert.equal(feind.hp, 300 - SCHLAG.schaden);
  assert.equal(a.abwehrLadung, 40, 'unberuehrt');
});

test('Abwehr: bei mehreren fängt die mit der kleinsten Id, die andere bleibt geladen', () => {
  const w = bare();
  const b = bereit(w, 3000, 3000);
  const a1 = abwehr(w, 1, 5100, 3000);
  const a2 = abwehr(w, 1, 5200, 3000);
  assert.ok(a1.id < a2.id);
  const feind = festgehalten(spawnUnit(w, 1, 'tziel1', 5000, 3000));
  schiesse(w, b, 5000, 3000);
  schritte(w, SCHLAG.flug + 1);
  assert.equal(feind.hp, 300);
  assert.ok(a1.abwehrLadung < 40);
  assert.equal(a2.abwehrLadung, 40);
});

test('Abwehr: hat die erste schon abgefangen, nimmt die zweite den naechsten Schlag im selben Tick', () => {
  const w = bare();
  const b1 = bereit(w, 3000, 3000);
  const b2 = bereit(w, 3000, 3200);
  const a1 = abwehr(w, 1, 5100, 3000);
  const a2 = abwehr(w, 1, 5200, 3000);
  const feind = festgehalten(spawnUnit(w, 1, 'tziel1', 5000, 3000));
  schiesse(w, b1, 5000, 3000);
  schiesse(w, b2, 5000, 3000);
  schritte(w, SCHLAG.flug + 1);
  assert.equal(feind.hp, 300, 'beide abgefangen');
  assert.equal(w.schlaege.length, 0);
  assert.ok(a1.abwehrLadung < 40 && a2.abwehrLadung < 40);
});

// ---------------------------------------------------------------- Laden

test('Laden: voll mit Gegenwart eins je Tick bis zur Grenze, gedrosselt anteilig, ohne Gegenwart gar nicht', () => {
  const netz = (w) => {
    spawnBuilding(w, 0, FACTIONS.mensch.haupt, 3000, 3000, true);
    spawnBuilding(w, 0, FACTIONS.mensch.rollen.kraft, 3000, 3600, true);
  };
  const w = bare();
  netz(w);
  const b = spawnBuilding(w, 0, 'tschlagnetz', 3500, 3000, true);
  schritte(w, 8);
  assert.equal(b.powered, 1000);
  assert.equal(b.schlagLadung, 8);
  schritte(w, 50);
  assert.equal(b.schlagLadung, SCHLAG.laden, 'nicht ueber die Grenze');

  const w2 = bare(); // ohne Anker: nichts versorgt
  const b2 = spawnBuilding(w2, 0, 'tschlagnetz', 3500, 3000, true);
  schritte(w2, 100);
  assert.equal(b2.powered, 0);
  assert.equal(b2.schlagLadung, 0);

  const w3 = bare();
  netz(w3);
  const b3 = spawnBuilding(w3, 0, 'tschlagviel', 3500, 3000, true);
  schritte(w3, 200);
  assert.ok(b3.powered > 0 && b3.powered < 100, `stark gedrosselt (powered ${b3.powered})`);
  // unter einem Tick Ladung je Tick: ohne Rest ginge alles verloren
  assert.equal(b3.schlagLadung, Math.floor((200 * b3.powered) / 1000));
  assert.ok(b3.schlagLadung > 0);
});

test('Laden: gerade fertig gebautes Gebaeude startet leer; geladene Ladung bleibt ohne Gegenwart erhalten', () => {
  const w = bare();
  const b = spawnBuilding(w, 0, 'tschlagnetz', 3500, 3000, true);
  assert.equal(b.schlagLadung, 0);
  b.schlagLadung = 12; // kein Netz: powered 0
  schritte(w, 50);
  assert.equal(b.schlagLadung, 12);
  assert.equal(spawnBuilding(bare(), 0, 'halle', 3000, 3000, true).schlagLadung, 0, 'ohne schlag: 0, ohne Wirkung');
});

// ---------------------------------------------------------------- Pruefsumme, Spielstand, Determinismus

test('Pruefsumme: Ladung und Schlaege im Flug gehen in den Hash, Welten ohne bleiben unberuehrt', () => {
  const a = bare();
  const b = bare();
  bereit(a);
  bereit(b);
  assert.equal(hash(a), hash(b));
  b.entities[0].schlagLadung = 5;
  assert.notEqual(hash(a), hash(b), 'Ladung zaehlt');
  const c = bare();
  const d = bare();
  spawnBuilding(c, 0, 'halle', 3000, 3000, true);
  spawnBuilding(d, 0, 'halle', 3000, 3000, true);
  assert.equal(hash(c), hash(d));
  const e = bare();
  const f = bare();
  abwehr(e, 1, 4000, 4000, 10);
  abwehr(f, 1, 4000, 4000, 11);
  assert.notEqual(hash(e), hash(f), 'Abwehrladung zaehlt');
  const g = bare();
  const h = bare();
  spawnBuilding(g, 0, 'halle', 3000, 3000, true);
  spawnBuilding(h, 0, 'halle', 3000, 3000, true);
  h.schlaege.push({ von: 1, player: 0, x: 5000, y: 5000, landet: 50, radius: 300, schaden: 100 });
  assert.notEqual(hash(g), hash(h), 'ein Schlag im Flug zaehlt');
});

test('Spielstand: ein Schlag im Flug ueberlebt Sichern und Laden, der Einschlag bleibt bitgleich', () => {
  const w = bare();
  const b = bereit(w, 3000, 3000);
  festgehalten(spawnUnit(w, 1, 'tziel1', 5000, 3000));
  abwehr(w, 1, 8000, 8000);
  schiesse(w, b, 5000, 3000);
  schritte(w, 11);
  assert.equal(w.schlaege.length, 1);
  const geladen = zustandLaden(JSON.parse(JSON.stringify(zustandSichern(w, [null, null])))).world;
  assert.equal(hash(geladen), hash(w));
  assert.deepEqual(geladen.schlaege, w.schlaege);
  const a = [];
  const c = [];
  for (let t = 0; t < 40; t++) {
    step(w);
    step(geladen);
    a.push(hash(w));
    c.push(hash(geladen));
  }
  assert.deepEqual(c, a);
  assert.equal(w.schlaege.length, 0);
  assert.equal(w.entities.find((e) => e.type === 'tziel1').hp, 300 - SCHLAG.schaden);
  // alte Staende ohne Feld bekommen eine leere Liste
  const alt = JSON.parse(JSON.stringify(zustandSichern(bare(), [null, null])));
  delete alt.world.schlaege;
  assert.deepEqual(zustandLaden(alt).world.schlaege, []);
});

test('Partie mit Schlaegen, Abwehr und Schild ist deterministisch', () => {
  const lauf = () => {
    const w = bare();
    spawnBuilding(w, 0, FACTIONS.mensch.haupt, 3000, 3000, true);
    spawnBuilding(w, 1, FACTIONS.gott.haupt, 6000, 3000, true);
    const b = bereit(w, 3500, 3000);
    const b2 = bereit(w, 3500, 3400);
    abwehr(w, 1, 6200, 3000);
    for (let i = 0; i < 6; i++) {
      spawnUnit(w, 0, 'soldat', 5600 + i * 40, 3000 + i * 60);
      spawnUnit(w, 1, 'wolf', 6000 + i * 40, 3100 + i * 60);
    }
    let treffer = 0;
    for (let t = 0; t < 400; t++) {
      if (t % 60 === 5) {
        for (const g of [b, b2]) {
          g.schlagLadung = SCHLAG.laden;
          schiesse(w, g, 5700 + (t % 3) * 100, 3200);
        }
      }
      step(w);
      for (const ev of w.events) if (ev.t === 'schlag') treffer++;
    }
    return { h: hash(w), n: w.entities.length, treffer };
  };
  const x = lauf();
  const y = lauf();
  assert.deepEqual(x, y);
  assert.ok(x.treffer > 0, 'es hat eingeschlagen');
});

// ---------------------------------------------------------------- KI

/** Spieler 0 (mensch) mit Hauptgebaeude, Kraft und Fabrik -- sonst baut die KI zuerst die. Gegner steht in Sicht. */
function kiLage() {
  FACTIONS.mensch.rollen.schlag = 'tschlagki';
  FACTIONS.mensch.rollen.abwehr = 'tabwehrki';
  const w = bare();
  spawnBuilding(w, 0, FACTIONS.mensch.haupt, 3000, 3000, true);
  spawnBuilding(w, 0, FACTIONS.mensch.rollen.kraft, 3000, 3700, true);
  spawnBuilding(w, 0, FACTIONS.mensch.rollen.fabrik, 3700, 3000, true);
  return w;
}
const befehle = (w, t) => w.pending.filter((c) => c.type === t);
function ki() {
  const ai = createAI(0, 7, 'standard');
  ai.next = 0;
  return ai;
}

test('KI: feuert auf das gegnerische Hauptgebaeude, wenn sie es sieht, es in Reichweite liegt und alles bezahlbar ist', () => {
  const w = kiLage();
  const schlag = spawnBuilding(w, 0, 'tschlagki', 3000, 4200, true);
  schlag.schlagLadung = SCHLAG.laden;
  const haupt1 = spawnBuilding(w, 1, FACTIONS.gott.haupt, 3000 + 4400, 4200, true);
  festgehalten(spawnUnit(w, 0, 'tziel0', haupt1.x - 800, haupt1.y)); // sieht es, steht aber ausserhalb des Kreises (300)
  w.players[0].goetterblut = 0;
  const ai = ki();
  stepAI(ai, w);
  const s = befehle(w, 'schlag');
  assert.equal(s.length, 1);
  assert.deepEqual({ id: s[0].id, x: s[0].x, y: s[0].y, player: s[0].player }, { id: schlag.id, x: haupt1.x, y: haupt1.y, player: 0 });
});

test('KI: haelt den Schlag zurueck -- ungeladen, zu weit, zu teuer, eigene im Kreis, bekannte Abwehr, nichts Wertvolles', () => {
  const lage = (aendere) => {
    const w = kiLage();
    const schlag = spawnBuilding(w, 0, 'tschlagki', 3000, 4200, true);
    schlag.schlagLadung = SCHLAG.laden;
    const haupt1 = spawnBuilding(w, 1, FACTIONS.gott.haupt, 3000 + 4400, 4200, true);
    festgehalten(spawnUnit(w, 0, 'tziel0', haupt1.x - 800, haupt1.y));
    aendere(w, schlag, haupt1);
    const ai = ki();
    stepAI(ai, w);
    return befehle(w, 'schlag').length;
  };
  assert.equal(lage(() => {}), 1, 'Vergleich: die Grundlage feuert');
  assert.equal(lage((w, s) => (s.schlagLadung = SCHLAG.laden - 1)), 0, 'ungeladen');
  assert.equal(lage((w, s, h) => (h.x = 3000 + 9100)), 0, 'ausser Reichweite (9000)');
  assert.equal(lage((w) => (w.players[0].fron = 9)), 0, 'zu wenig Fron');
  assert.equal(lage((w, s, h) => spawnUnit(w, 0, 'tziel0', h.x + 100, h.y)), 0, 'eigene Einheit im Kreis');
  assert.equal(lage((w, s, h) => abwehr(w, 1, h.x + 100, h.y + 100)), 0, 'bekannte Abwehr deckt das Ziel');
  // Eine einzelne, billige Huette lohnt den Schlag nicht (Mindestwert), das Hauptgebaeude schon
  assert.equal(
    lage((w, s, h) => {
      h.dead = true;
      spawnBuilding(w, 1, 'tturm1', h.x, h.y, true);
    }),
    0,
    'ein einzelnes billiges Gebaeude (100 Fron) lohnt den Schlag nicht',
  );
});

test('KI: zieht die Kosten des Schlags von dem ab, was die Produktion ausgeben darf', () => {
  const w = kiLage();
  const schlag = spawnBuilding(w, 0, 'tschlagki', 3000, 4200, true);
  schlag.schlagLadung = SCHLAG.laden;
  const haupt1 = spawnBuilding(w, 1, FACTIONS.gott.haupt, 3000 + 4400, 4200, true);
  festgehalten(spawnUnit(w, 0, 'tziel0', haupt1.x - 800, haupt1.y));
  w.players[0].fron = 10; // reicht genau fuer den Schlag (kosten.fron 10) und fuer nichts sonst
  const ai = ki();
  stepAI(ai, w);
  assert.equal(befehle(w, 'schlag').length, 1);
  assert.equal(befehle(w, 'produce').length, 0, 'fuer die Produktion bleibt nichts');
});

test('KI: Fernschlag-Gebaeude erst ab Minute 20, nur mit der Rolle', () => {
  const lauf = (bisTick) => {
    FACTIONS.mensch.rollen.schlag = 'tschlagki';
    const w = createWorld({ seed: 7, factions: ['mensch', 'mensch'] });
    w.players[0].goetterblut = 500;
    const ais = [createAI(0, 7, 'standard'), createAI(1, 8, 'standard')];
    let erster = -1;
    for (let t = 0; t < bisTick && !w.over; t++) {
      stepAI(ais[0], w);
      stepAI(ais[1], w);
      step(w);
      if (erster < 0 && t % 10 === 0 && w.entities.some((e) => e.type === 'tschlagki' && e.player === 0)) erster = t;
    }
    return erster;
  };
  const erster = lauf(14000);
  assert.ok(erster > 0, 'und dann wird einer gebaut');
  assert.ok(erster >= 12000, `nicht vor Minute 20 (gebaut bei Tick ${erster})`);
  delete FACTIONS.mensch.rollen.schlag;
});

test('KI: Abwehr beim Hauptgebaeude erst, wenn die Kunde ein gegnerisches Schlag-Gebaeude kennt', () => {
  const w = kiLage();
  const ai = ki();
  stepAI(ai, w);
  assert.equal(befehle(w, 'build').filter((c) => c.building === 'tabwehrki').length, 0, 'ohne Kenntnis keine');
  // Gegner hat ein Schlag-Gebaeude in Sicht der KI (eine eigene Einheit steht daneben)
  const w2 = kiLage();
  const feind = spawnBuilding(w2, 1, 'tschlag', 7000, 7000, true);
  festgehalten(spawnUnit(w2, 0, 'tziel0', feind.x - 500, feind.y));
  stepAI(ki(), w2);
  const bau = befehle(w2, 'build').filter((c) => c.building === 'tabwehrki');
  assert.equal(bau.length, 1);
  assert.ok(Math.hypot(bau[0].x - 3000, bau[0].y - 3000) < 2000, 'beim Hauptgebaeude');
});
