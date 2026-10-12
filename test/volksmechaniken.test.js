// M3 Volks-Mechaniken: regeneration, aura, weapon.flaeche, weapon.verlangsamt
// und auferstehen. Die Volksdateien benutzen sie (noch) nicht -- die Testdaten
// werden zur Laufzeit in UNITS/BUILDINGS eingetragen und am Ende wieder entfernt.
//
// Radien bleiben unter dem groessten vorhandenen: die Nachbarsuche in sim.js
// rechnet GROESSTER_RADIUS einmal beim Laden aus.

import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, spawnUnit, spawnBuilding, step, hash, aurenSammeln, auraWert, auraAn } from '../src/sim/sim.js';
import { UNITS, BUILDINGS, FACTIONS } from '../src/sim/defs.js';
import { zustandSichern, zustandLaden } from '../src/spielstand.js';
import { einheitKarte, gebaeudeKarte, auswahlKopf } from '../src/ui-gemeinsam.js';
import { neueEffekte, effekteAusEreignissen } from '../src/effekte.js';

const EINHEIT = (zusatz) => ({ name: 'Test', desc: '', faction: 'mensch', hp: 200, radius: 20, speed: 40, cost: { fron: 40 }, buildTime: 50, ...zusatz });
const SCHUETZE = (weapon) => EINHEIT({ kampf: 'fern', weapon: { range: 400, damage: 20, cooldown: 5, ziele: 'beide', ...weapon } });
const GEBAEUDE = (zusatz) => ({ name: 'Testbau', desc: '', short: 'TST', faction: 'mensch', hp: 1000, radius: 30, cost: { fron: 100 }, buildTime: 50, ...zusatz });
// Aura mit grossem Umkreis: Quelle und Empfaenger duerfen weit auseinander stehen
const AURA = (art, wert, radius = 800) => EINHEIT({ aura: { art, wert, radius } });

const TEST_EINHEITEN = {
  tziel: EINHEIT({ hp: 300 }), // ohne alles: nimmt nur Schaden, laeuft mit speed 40
  tflieger: EINHEIT({ hp: 300, radius: 14, fliegt: true }),
  treg: EINHEIT({ regeneration: 60 }), // 60 LP/min = 1 LP je 10 Ticks
  treg7: EINHEIT({ regeneration: 7 }),
  treg1: EINHEIT({ regeneration: 1 }),
  taheil: AURA('heilung', 60),
  taheil2: AURA('heilung', 30),
  tatempo: AURA('tempo', 500),
  tatempo2: AURA('tempo', 300),
  taschaden: AURA('schaden', 500),
  taschaden2: AURA('schaden', 300),
  taschutz: AURA('schutz', 500),
  taklein: AURA('schaden', 500, 100), // kleiner Umkreis fuer Rand und Quelle selbst
  // Schuetzen: 20 Schaden, schiessen im ersten Tick
  tfern: SCHUETZE({}),
  tfernaura: EINHEIT({ kampf: 'fern', weapon: { range: 400, damage: 20, cooldown: 5, ziele: 'beide' }, aura: { art: 'schaden', wert: 500, radius: 100 } }),
  tflaeche: SCHUETZE({ damage: 100, flaeche: { radius: 200, anteil: 500 } }),
  tflaeche_boden: SCHUETZE({ damage: 100, ziele: 'boden', flaeche: { radius: 200, anteil: 500 } }),
  // schiessen genau einmal (Abklingzeit lang) und bremsen
  tbremse: SCHUETZE({ damage: 10, cooldown: 5000, verlangsamt: { dauer: 30, wert: 500 } }),
  tbremse_stark: SCHUETZE({ damage: 10, cooldown: 5000, verlangsamt: { dauer: 20, wert: 800 } }),
  tbremse_schwach: SCHUETZE({ damage: 10, cooldown: 5000, verlangsamt: { dauer: 100, wert: 200 } }),
  tbremse_alles: SCHUETZE({ damage: 10, cooldown: 5000, verlangsamt: { dauer: 100, wert: 1000 } }),
  tbremse_flaeche: SCHUETZE({ damage: 100, cooldown: 5000, flaeche: { radius: 200, anteil: 500 }, verlangsamt: { dauer: 30, wert: 500 } }),
  // aus den Gefallenen aufgestanden
  tskel: EINHEIT({ faction: 'tod', hp: 100 }),
};
const TEST_GEBAEUDE = {
  // regeneration: ohne Bedarf immer voll versorgt, mit Bedarf anteilig
  tregbau: GEBAEUDE({ regeneration: 60 }),
  tregnetz: GEBAEUDE({ regeneration: 60, gegenwartIn: 128 }), // Halle + Schmiede liefern 64: halb versorgt
  tschild: GEBAEUDE({ schild: { kapazitaet: 120, radius: 400, laden: 1 }, gegenwartIn: 1 }), // ohne Netz laedt er nicht
  // Auren von Gebaeuden: fertig und versorgt
  tauraschmiede: GEBAEUDE({ aura: { art: 'tempo', wert: 500, radius: 800 } }),
  taurabau: GEBAEUDE({ aura: { art: 'heilung', wert: 60, radius: 800 } }),
  tauranetz: GEBAEUDE({ aura: { art: 'tempo', wert: 500, radius: 800 }, gegenwartIn: 128 }),
  // Anker des Totenreichs (hier fuer Spieler 0 mit Volk 'tod'): jede 3. Seele steht auf
  tanker: GEBAEUDE({ faction: 'tod', anchor: true, radius: 48, auferstehen: { alle: 3, einheit: 'tskel', dauer: 100 } }),
  tanker_bleibt: GEBAEUDE({ faction: 'tod', anchor: true, radius: 48, auferstehen: { alle: 1, einheit: 'tskel', dauer: 0 } }),
};

Object.assign(UNITS, TEST_EINHEITEN);
Object.assign(BUILDINGS, TEST_GEBAEUDE);
after(() => {
  for (const k of Object.keys(TEST_EINHEITEN)) delete UNITS[k];
  for (const k of Object.keys(TEST_GEBAEUDE)) delete BUILDINGS[k];
});

const bare = (factions = ['mensch', 'gott']) => createWorld({ empty: true, factions });
/** Einheit, die sich nicht bewegen kann: bleibt, wo sie ist (Wurzelgriff). */
const fest = (e) => {
  e.gebundenBis = 1e9;
  return e;
};
const schritte = (w, n) => {
  for (let i = 0; i < n; i++) step(w);
};
/** Einheit des Spielers, fest und mit weniger Leben. */
const verletzt = (w, p, typ, x, y, hp) => {
  const e = fest(spawnUnit(w, p, typ, x, y));
  e.hp = hp;
  return e;
};
/** Halle und Schmiede der Menschen: zusammen 64 Gegenwart in der Naehe von (3000, 3000). */
function netz(w) {
  spawnBuilding(w, 0, FACTIONS.mensch.haupt, 3000, 3000, true);
  spawnBuilding(w, 0, FACTIONS.mensch.rollen.kraft, 3000, 3600, true);
}
const eventsVon = (w, t) => w.events.filter((ev) => ev.t === t);

// ================================================================ Regeneration

test('Regeneration: 60 LP/min heilen 1 LP je 10 Ticks, 60 LP in einer Minute, nie ueber maxHp', () => {
  const w = bare();
  const u = verletzt(w, 0, 'treg', 5000, 5000, 100);
  schritte(w, 9);
  assert.equal(u.hp, 100, 'noch nichts nach 9 Ticks');
  step(w);
  assert.equal(u.hp, 101, 'das erste LP nach 10 Ticks');
  schritte(w, 590);
  assert.equal(u.hp, 160, 'genau 60 LP nach 600 Ticks');
  schritte(w, 3000);
  assert.equal(u.hp, 200, 'bei maxHp ist Schluss');
  assert.equal(u.regRest, 0, 'voll: kein Rest bleibt liegen');
});

test('Regeneration: der Rest unter einem LP geht nicht verloren (7 LP/min, 1 LP/min)', () => {
  const w = bare();
  const a = verletzt(w, 0, 'treg7', 5000, 5000, 50);
  const b = verletzt(w, 0, 'treg1', 5200, 5000, 50);
  schritte(w, 100);
  assert.equal(a.hp, 51, '7 LP/min sind nach 100 Ticks 1,17 LP');
  assert.equal(b.hp, 50, '1 LP/min nach 100 Ticks noch nichts');
  schritte(w, 500);
  assert.equal(a.hp, 57, 'nach 600 Ticks genau 7 LP');
  assert.equal(b.hp, 51, 'nach 600 Ticks genau 1 LP');
});

test('Regeneration: nur wer lebt und verletzt ist; ohne das Feld bleibt alles beim Alten', () => {
  const w = bare();
  const ohne = verletzt(w, 0, 'tziel', 5000, 5000, 100);
  const heil = fest(spawnUnit(w, 0, 'treg', 5200, 5000));
  const tot = verletzt(w, 0, 'treg', 5400, 5000, 100);
  tot.dead = true; // schon gefallen, wird in diesem Tick aufgeraeumt
  schritte(w, 700);
  assert.equal(ohne.hp, 100);
  assert.equal(heil.hp, 200, 'unverletzt bleibt unverletzt');
  assert.equal(tot.hp, 100, 'Tote heilen nicht');
});

test('Regeneration: ein Gebaeude heilt nur fertig und anteilig zu seiner Versorgung', () => {
  // ohne Bedarf: voll versorgt
  const w = bare();
  const fertig = spawnBuilding(w, 0, 'tregbau', 5000, 5000, true);
  const baustelle = spawnBuilding(w, 0, 'tregbau', 5400, 5000, false);
  fertig.hp = 500;
  baustelle.hp = 50;
  schritte(w, 600);
  assert.equal(fertig.hp, 560, '60 LP in einer Minute');
  assert.equal(baustelle.hp, 50, 'eine Baustelle heilt nicht');

  // mit Bedarf: Halle + Schmiede decken die Haelfte
  const w2 = bare();
  netz(w2);
  const g = spawnBuilding(w2, 0, 'tregnetz', 3500, 3000, true);
  g.hp = 500;
  schritte(w2, 600);
  assert.equal(g.powered, 500, 'halb versorgt');
  assert.equal(g.hp, 530, 'halbe Heilung: 30 LP in einer Minute');

  // ohne Gegenwart gar nicht
  const w3 = bare();
  const k = spawnBuilding(w3, 0, 'tregnetz', 3500, 3000, true);
  k.hp = 500;
  schritte(w3, 600);
  assert.equal(k.powered, 0);
  assert.equal(k.hp, 500);
});

// ================================================================ Aura

test('Aura: ohne Aura in der Welt ist die Liste leer und fragt nichts', () => {
  const w = bare();
  spawnUnit(w, 0, 'tziel', 5000, 5000);
  spawnBuilding(w, 0, 'tregbau', 5400, 5000, true);
  const auren = aurenSammeln(w);
  assert.equal(auren.length, 0);
  assert.equal(auraWert(auren, w.entities[0], 'tempo'), 0);
  assert.deepEqual(auraAn(w, w.entities[0]), { heilung: 0, tempo: 0, schaden: 0, schutz: 0 });
});

test('Aura Schaden: eigene Einheiten im Umkreis, die Quelle selbst eingeschlossen', () => {
  // Quelle ist der Schuetze selbst: 20 Schaden + 50 % = 30
  const w = bare();
  const ziel = fest(spawnUnit(w, 1, 'tziel', 5300, 5000));
  fest(spawnUnit(w, 0, 'tfernaura', 5000, 5000));
  step(w);
  assert.equal(ziel.hp, 300 - 30, 'die Quelle selbst bekommt ihre Aura');

  // eine fremde Quelle (andere Einheit) im Umkreis
  const w2 = bare();
  const z2 = fest(spawnUnit(w2, 1, 'tziel', 5300, 5000));
  fest(spawnUnit(w2, 0, 'tfern', 5000, 5000));
  fest(spawnUnit(w2, 0, 'taschaden', 4500, 5000));
  step(w2);
  assert.equal(z2.hp, 300 - 30, 'eine andere Einheit als Quelle, 50 m vom Schuetzen, im Umkreis von 80 m');
});

test('Aura Schaden: am Rand noch, einen dm weiter nicht; Feinde und Fremde nichts', () => {
  const lauf = (quellePlayer, abstand) => {
    const w = bare();
    const ziel = fest(spawnUnit(w, 1, 'tziel', 5300, 5000));
    fest(spawnUnit(w, 0, 'tfern', 5000, 5000));
    fest(spawnUnit(w, quellePlayer, 'taklein', 5000, 5000 + abstand)); // Umkreis 100
    step(w);
    return 300 - ziel.hp;
  };
  assert.equal(lauf(0, 100), 30, 'genau am Rand');
  assert.equal(lauf(0, 101), 20, 'einen dm zu weit');
  // Die Quelle des Gegners steht fuer den Schuetzen unerreichbar fern (er schiesst auf das Ziel); ihr
  // Umkreis (80 m) reicht aber ueber den Schuetzen -- die Aura gilt trotzdem nur den Eigenen der Quelle.
  const w = bare();
  const ziel = fest(spawnUnit(w, 1, 'tziel', 5300, 5000));
  fest(spawnUnit(w, 0, 'tfern', 5000, 5000));
  fest(spawnUnit(w, 1, 'taschaden', 5000, 5600)); // Umkreis 80 m, 60 m vom Schuetzen
  step(w);
  assert.equal(300 - ziel.hp, 20, 'Aura des Gegners wirkt nicht auf meinen Schuetzen');
});

test('Aura: mehrere derselben Art addieren sich nicht, es zaehlt die staerkste', () => {
  const w = bare();
  const ziel = fest(spawnUnit(w, 1, 'tziel', 5300, 5000));
  fest(spawnUnit(w, 0, 'tfern', 5000, 5000));
  fest(spawnUnit(w, 0, 'taschaden', 4800, 5000)); // +500
  fest(spawnUnit(w, 0, 'taschaden2', 4800, 5100)); // +300
  fest(spawnUnit(w, 0, 'taschaden', 4800, 5200)); // noch einmal +500
  step(w);
  assert.equal(ziel.hp, 300 - 30, '+50 %, nicht +130 %');
  // verschiedene Arten dagegen wirken nebeneinander: Schaden und Schutz
  const w2 = bare();
  const z2 = fest(spawnUnit(w2, 1, 'tziel', 5300, 5000));
  fest(spawnUnit(w2, 1, 'taschutz', 5900, 5000)); // fern genug, dass der Schuetze das Ziel nimmt
  fest(spawnUnit(w2, 0, 'tfern', 5000, 5000));
  fest(spawnUnit(w2, 0, 'taschaden', 4800, 5000));
  step(w2);
  assert.equal(z2.hp, 300 - 15, '20 + 50 % = 30, davon 50 % Schutz = 15');
});

test('Aura Schutz: die Einheit nimmt weniger Schaden, nur eigene Quellen', () => {
  const w = bare();
  const ziel = fest(spawnUnit(w, 1, 'tziel', 5300, 5000));
  fest(spawnUnit(w, 1, 'taschutz', 5900, 5000)); // 600 vom Schuetzen: nicht das Ziel
  fest(spawnUnit(w, 0, 'tfern', 5000, 5000));
  step(w);
  assert.equal(ziel.hp, 300 - 10, '20 Schaden, 50 % weniger');
  // Schutzaura des Angreifers hilft dem Ziel nicht
  const w2 = bare();
  const z2 = fest(spawnUnit(w2, 1, 'tziel', 5300, 5000));
  fest(spawnUnit(w2, 0, 'taschutz', 4900, 5000));
  fest(spawnUnit(w2, 0, 'tfern', 5000, 5000));
  step(w2);
  assert.equal(z2.hp, 300 - 20);
});

test('Aura Tempo: ein Schritt wird schneller, die staerkste zaehlt, Ansturm kommt dazu', () => {
  const geh = (w, e) => {
    e.tx = 9000;
    e.ty = 5000;
    e.arrived = false;
    const x0 = e.x;
    step(w);
    return e.x - x0;
  };
  const w = bare();
  assert.equal(geh(w, spawnUnit(w, 0, 'tziel', 5000, 5000)), 40, 'ohne Aura: Grundtempo 40');
  const w2 = bare();
  const a = spawnUnit(w2, 0, 'tziel', 5000, 5000);
  fest(spawnUnit(w2, 0, 'tatempo', 5000, 5400));
  fest(spawnUnit(w2, 0, 'tatempo2', 5000, 5500));
  assert.equal(geh(w2, a), 60, '+50 % (die staerkere), nicht +80 %');
  const w3 = bare();
  const b = spawnUnit(w3, 0, 'tziel', 5000, 5000);
  fest(spawnUnit(w3, 0, 'tatempo', 5000, 5400));
  b.tempoBis = 100;
  b.tempoWert = 250; // Ansturm
  assert.equal(geh(w3, b), 70, '1000 + 500 (Aura) + 250 (Ansturm) = 175 %');
  const w4 = bare();
  const c = spawnUnit(w4, 0, 'tziel', 5000, 5000);
  fest(spawnUnit(w4, 1, 'tatempo', 5000, 5400));
  assert.equal(geh(w4, c), 40, 'Aura des Gegners beschleunigt nicht');
});

test('Aura eines Gebaeudes: nur fertig, nur versorgt und anteilig; Heilaura trifft Einheiten, nie Gebaeude', () => {
  const geh = (w, e) => {
    e.tx = 9000;
    e.ty = e.y; // waagerecht, damit der Weg gleich dem Tempo ist
    e.arrived = false;
    const x0 = e.x;
    step(w);
    return e.x - x0;
  };
  // fertig, ohne Bedarf: volle Staerke
  const w = bare();
  spawnBuilding(w, 0, 'tauraschmiede', 5000, 5400, true);
  assert.equal(geh(w, spawnUnit(w, 0, 'tziel', 5000, 5000)), 60);
  // Baustelle: keine Aura
  const w2 = bare();
  spawnBuilding(w2, 0, 'tauraschmiede', 5000, 5400, false);
  assert.equal(geh(w2, spawnUnit(w2, 0, 'tziel', 5000, 5000)), 40);
  // halb versorgt: +25 %
  const w3 = bare();
  netz(w3);
  const s = spawnBuilding(w3, 0, 'tauranetz', 3500, 3000, true);
  const u = spawnUnit(w3, 0, 'tziel', 3500, 3400);
  assert.equal(geh(w3, u), 50, '40 * 1250 / 1000');
  assert.equal(s.powered, 500);
  // ohne Gegenwart: nichts
  const w4 = bare();
  spawnBuilding(w4, 0, 'tauranetz', 3500, 3000, true);
  assert.equal(geh(w4, spawnUnit(w4, 0, 'tziel', 3500, 3400)), 40);

  // Heilaura: Einheit heilt, Gebaeude daneben nicht
  const w5 = bare();
  spawnBuilding(w5, 0, 'taurabau', 5000, 5400, true);
  const e = verletzt(w5, 0, 'tziel', 5000, 5000, 100);
  const quelle = w5.entities.find((x) => x.type === 'taurabau');
  quelle.hp = 500; // die Quelle selbst ist ein Gebaeude im eigenen Umkreis
  schritte(w5, 600);
  assert.equal(e.hp, 160, '60 LP/min aus der Aura');
  assert.equal(quelle.hp, 500, 'Auren gelten Einheiten -- ein Gebaeude im Umkreis heilt nicht');
});

test('Aura Heilung: LP pro Minute mit Rest, nicht addiert, eigene Regeneration kommt dazu', () => {
  const w = bare();
  const u = verletzt(w, 0, 'tziel', 5000, 5000, 100);
  fest(spawnUnit(w, 0, 'taheil', 5000, 5300));
  fest(spawnUnit(w, 0, 'taheil2', 5000, 5400));
  schritte(w, 600);
  assert.equal(u.hp, 160, 'die staerkere (60), nicht beide (90)');

  const w2 = bare();
  const r = verletzt(w2, 0, 'treg', 5000, 5000, 50);
  fest(spawnUnit(w2, 0, 'taheil', 5000, 5300));
  schritte(w2, 600);
  assert.equal(r.hp, 50 + 60 + 60, 'Regeneration (60) und Aura (60) sind verschiedene Quellen');

  // fremde Aura heilt nicht
  const w3 = bare();
  const f = verletzt(w3, 0, 'tziel', 5000, 5000, 100);
  fest(spawnUnit(w3, 1, 'taheil', 5000, 5300));
  schritte(w3, 600);
  assert.equal(f.hp, 100);
});

// ================================================================ Flaechentreffer

/** Aufstellung: Schuetze (Spieler 0) bei x 5000, Hauptziel A bei 5300; ringsum Beteiligte. */
function flaechenLage(schuetze) {
  const w = bare();
  const s = fest(spawnUnit(w, 0, schuetze, 5000, 5000));
  const a = fest(spawnUnit(w, 1, 'tziel', 5300, 5000));
  const b = fest(spawnUnit(w, 1, 'tziel', 5300, 5150)); // 150 von A, weiter vom Schuetzen
  const c = fest(spawnUnit(w, 1, 'tziel', 5300, 5250)); // 250 von A: ausserhalb
  const eigen = fest(spawnUnit(w, 0, 'tziel', 5300, 4900)); // 100 von A, aber meine
  const flug = fest(spawnUnit(w, 1, 'tflieger', 5400, 5000)); // 100 von A, in der Luft
  return { w, s, a, b, c, eigen, flug };
}

test('Flaeche: das Ziel voll, jeder Feind im Umkreis anteilig, ausserhalb und Eigene nichts', () => {
  const { w, s, a, b, c, eigen, flug } = flaechenLage('tflaeche');
  step(w);
  assert.equal(a.hp, 300 - 100, 'Ziel: voller Schaden');
  assert.equal(b.hp, 300 - 50, 'im Umkreis: 50 %');
  assert.equal(c.hp, 300, 'ausserhalb des Umkreises');
  assert.equal(eigen.hp, 300, 'eigene Einheiten bleiben heil');
  assert.equal(flug.hp, 300 - 50, 'Flieger im Umkreis, die Waffe erreicht Luft');
  assert.equal(s.hp, s.maxHp);
  const ev = eventsVon(w, 'flaeche');
  assert.equal(ev.length, 1);
  assert.deepEqual({ x: ev[0].x, y: ev[0].y, radius: ev[0].radius, von: ev[0].von }, { x: 5300, y: 5000, radius: 200, von: s.id });
});

test('Flaeche: nur was die Waffe erreicht -- eine Bodenwaffe laesst Flieger im Umkreis in Ruhe', () => {
  const { w, a, b, flug } = flaechenLage('tflaeche_boden');
  step(w);
  assert.equal(a.hp, 200);
  assert.equal(b.hp, 250);
  assert.equal(flug.hp, 300);
});

test('Flaeche: Rand zaehlt, ein dm weiter nicht -- gemessen Mitte zu Mitte um das Ziel', () => {
  const lauf = (abstand) => {
    const w = bare();
    fest(spawnUnit(w, 0, 'tflaeche', 5000, 5000));
    fest(spawnUnit(w, 1, 'tziel', 5300, 5000));
    const n = fest(spawnUnit(w, 1, 'tziel', 5300, 5000 + abstand));
    step(w);
    return 300 - n.hp;
  };
  assert.equal(lauf(200), 50);
  assert.equal(lauf(201), 0);
});

test('Flaeche: jedes Ziel mit seinen eigenen Abzuegen -- Schildwall und Schild des Getroffenen', () => {
  const { w, a, b, c } = flaechenLage('tflaeche');
  b.wehrBis = 1e9;
  b.wehrWert = 500; // Schildwall: halber Schaden
  // c steht ausserhalb; b bekommt statt 50 nur 25
  step(w);
  assert.equal(a.hp, 200);
  assert.equal(b.hp, 300 - 25, '50 nach Anteil, davon 50 % Schildwall');
  assert.equal(c.hp, 300);

  // Ein Schild des Getroffenen faengt auch den Splitter ab: Mitte (5300, 5400), Umkreis 400 --
  // A (400 entfernt, Rand) und B (250) liegen darin. Erst nimmt er A's 100, dann von B's 50 den Rest
  const l = flaechenLage('tflaeche');
  const sg = spawnBuilding(l.w, 1, 'tschild', 5300, 5400, true);
  sg.schildPunkte = 120;
  step(l.w);
  assert.equal(sg.schildPunkte, 0);
  assert.equal(l.a.hp, 300, 'A: ganz vom Schild gehalten');
  assert.equal(l.b.hp, 300 - 30, 'B: 50 - 20 Restpunkte des Schilds');
});

test('Flaeche: wer an den Splittern faellt, faellt wie im Kampf (Ereignis died, aus der Welt)', () => {
  const { w, b } = flaechenLage('tflaeche');
  b.hp = 40;
  step(w);
  assert.ok(b.dead);
  assert.ok(!w.entities.includes(b));
  assert.ok(w.events.some((ev) => ev.t === 'died' && ev.id === b.id));
});

// ================================================================ Verlangsamt

test('Verlangsamt: ein Treffer bremst dauer Ticks lang, danach laeuft die Einheit wieder normal', () => {
  const w = bare();
  const z = spawnUnit(w, 1, 'tziel', 5300, 5000); // laeuft nach rechts, weg vom Schuetzen
  fest(spawnUnit(w, 0, 'tbremse', 5000, 5000));
  z.tx = 9000;
  z.ty = 5000;
  z.arrived = false;
  const schritt = () => {
    const x0 = z.x;
    step(w);
    return z.x - x0;
  };
  assert.equal(schritt(), 40, 'Tick 0: der Treffer faellt erst nach der Bewegung');
  assert.equal(z.langsamBis, 30);
  assert.equal(z.langsamWert, 500);
  assert.equal(z.hp, 290);
  assert.equal(schritt(), 20, 'gebremst um 50 %');
  for (let t = 2; t < 30; t++) assert.equal(schritt(), 20);
  assert.equal(schritt(), 40, 'Tick 30: vorbei');
});

test('Verlangsamt: staerker gewinnt, gleich stark frischt auf, schwaecher aendert nichts', () => {
  const treffer = (vorher, schuetze) => {
    const w = bare();
    const z = fest(spawnUnit(w, 1, 'tziel', 5300, 5000));
    Object.assign(z, vorher);
    fest(spawnUnit(w, 0, schuetze, 5000, 5000));
    step(w);
    return [z.langsamBis, z.langsamWert];
  };
  assert.deepEqual(treffer({ langsamBis: 100, langsamWert: 500 }, 'tbremse_stark'), [20, 800], 'staerker: ersetzt, auch wenn kuerzer');
  assert.deepEqual(treffer({ langsamBis: 100, langsamWert: 500 }, 'tbremse_schwach'), [100, 500], 'schwaecher: aendert nichts');
  assert.deepEqual(treffer({ langsamBis: 5, langsamWert: 500 }, 'tbremse'), [30, 500], 'gleich stark: frischt auf');
  assert.deepEqual(treffer({ langsamBis: 0, langsamWert: 900 }, 'tbremse_schwach'), [100, 200], 'abgelaufen: der neue gilt, auch wenn schwaecher');
  assert.deepEqual(treffer({}, 'tbremse'), [30, 500], 'frisch gebremst');
});

test('Verlangsamt: nur Einheiten -- ein Gebaeude wird nicht gebremst (und auch nicht gebucht)', () => {
  const w = bare();
  const g = spawnBuilding(w, 1, 'tregbau', 5300, 5000, true);
  fest(spawnUnit(w, 0, 'tbremse', 5000, 5000));
  step(w);
  assert.equal(g.hp, g.maxHp - 10, 'getroffen');
  assert.equal(g.langsamBis, undefined);
});

test('Verlangsamt: mit Tempo-Aura und Ansturm verrechnet, nie unter 20 % des Tempos', () => {
  const geh = (vorher, mitAura) => {
    const w = bare();
    const z = spawnUnit(w, 1, 'tziel', 5000, 5000);
    Object.assign(z, vorher);
    if (mitAura) fest(spawnUnit(w, 1, 'tatempo', 5000, 5600));
    z.tx = 9000;
    z.ty = 5000;
    z.arrived = false;
    step(w);
    return z.x - 5000;
  };
  assert.equal(geh({ langsamBis: 100, langsamWert: 500 }, false), 20, 'gebremst um 50 %');
  assert.equal(geh({ langsamBis: 100, langsamWert: 500 }, true), 40, 'Aura +50 % hebt die Bremse genau auf');
  assert.equal(geh({ langsamBis: 100, langsamWert: 500, tempoBis: 100, tempoWert: 250 }, false), 30, 'Ansturm +25 %, Bremse -50 %: 75 %');
  assert.equal(geh({ langsamBis: 100, langsamWert: 1000 }, false), 8, 'ganz gebremst: Boden bei 20 %');
  assert.equal(geh({ langsamBis: 100, langsamWert: 1000 }, true), 20, 'Aura +50 %, Bremse -100 %: 50 %');
  assert.equal(geh({ langsamBis: 0, langsamWert: 1000 }, false), 40, 'abgelaufen');
});

test('Verlangsamt: der Flaechentreffer bremst auch die Getroffenen im Umkreis', () => {
  const w = bare();
  fest(spawnUnit(w, 0, 'tbremse_flaeche', 5000, 5000));
  const a = fest(spawnUnit(w, 1, 'tziel', 5300, 5000));
  const b = fest(spawnUnit(w, 1, 'tziel', 5300, 5150));
  const c = fest(spawnUnit(w, 1, 'tziel', 5300, 5250));
  step(w);
  assert.equal(a.langsamWert, 500);
  assert.equal(b.langsamWert, 500);
  assert.ok(!c.langsamBis, 'ausserhalb: nicht gebremst');
});

// ================================================================ Auferstehen

/** Gefallene: n Einheiten des Spielers an einem Ort, gleich als gefallen markiert -- cleanup() zaehlt sie im naechsten Tick. */
function faelle(w, spieler, anzahl, x, y) {
  const liste = [];
  for (let i = 0; i < anzahl; i++) {
    const u = spawnUnit(w, spieler, 'tziel', x + i * 3, y);
    u.dead = true;
    liste.push(u);
  }
  return liste;
}
/** Welt mit Spieler 0 = Totenreich und einem Anker bei (5000, 5000), Spieler 1 = Menschen. */
function totenreich(typ = 'tanker') {
  const w = bare(['tod', 'mensch']);
  const b = spawnBuilding(w, 0, typ, 5000, 5000, true);
  return { w, b };
}
const aufgestandene = (w) => w.entities.filter((e) => e.aufgestanden);

test('Auferstehen: jede alle-te Seele steht am Ort des Gefallenen als Einheit des Besitzers auf', () => {
  const { w, b } = totenreich();
  const f = faelle(w, 1, 7, 5100, 5200); // Gegner fallen im Umkreis: Seelen zaehlen, gleich wessen
  step(w);
  assert.equal(b.seelen, 7);
  const neu = aufgestandene(w);
  assert.equal(neu.length, 2, 'die 3. und die 6. Seele');
  assert.deepEqual(neu.map((e) => [e.x, e.y]), [[f[2].x, f[2].y], [f[5].x, f[5].y]], 'am Ort des Gefallenen');
  for (const e of neu) {
    assert.equal(e.type, 'tskel');
    assert.equal(e.player, 0, 'fuer den Besitzer des Ankers');
    assert.ok(e.beschworen, 'herbeigerufen: kein Unterhalt');
    assert.equal(e.vergehtBei, w.tick - 1 + 100, 'vergeht nach dauer Ticks (Tick des Aufstehens + 100)');
    assert.equal(e.hp, 100);
  }
  const ev = eventsVon(w, 'auferstanden');
  assert.equal(ev.length, 2);
  assert.deepEqual({ von: ev[0].von, player: ev[0].player, type: ev[0].type, x: ev[0].x, y: ev[0].y, id: ev[0].id }, { von: b.id, player: 0, type: 'tskel', x: f[2].x, y: f[2].y, id: neu[0].id });
});

test('Auferstehen: zaehlt ueber Ticks hinweg weiter -- die Seelen sind ein Zaehler, kein Takt', () => {
  const { w, b } = totenreich();
  faelle(w, 1, 2, 5100, 5200);
  step(w);
  assert.equal(aufgestandene(w).length, 0);
  faelle(w, 1, 2, 5100, 5200); // 3. und 4. Seele: die 3. steht auf
  step(w);
  assert.equal(b.seelen, 4);
  assert.equal(aufgestandene(w).length, 1);
});

test('Auferstehen: ausserhalb des Umkreises zaehlt nichts; eigene Gefallene zaehlen wie fremde', () => {
  const { w, b } = totenreich();
  faelle(w, 1, 5, 9000, 9000); // weit weg
  step(w);
  assert.equal(b.seelen, 0);
  assert.equal(aufgestandene(w).length, 0);
  faelle(w, 0, 3, 5100, 5200); // eigene Einheiten
  step(w);
  assert.equal(b.seelen, 3);
  assert.equal(aufgestandene(w).length, 1);
});

test('Auferstehen: Aufgestandene zaehlen beim eigenen Tod nicht als Seele -- keine Endlosschleife', () => {
  const { w, b } = totenreich('tanker_bleibt'); // alle 1: jede Seele steht auf
  faelle(w, 1, 1, 5100, 5200);
  step(w);
  assert.equal(b.seelen, 1);
  const erste = aufgestandene(w);
  assert.equal(erste.length, 1);
  // der Aufgestandene faellt: keine Seele, kein neuer Aufgestandener
  erste[0].dead = true;
  schritte(w, 3);
  assert.equal(b.seelen, 1);
  assert.equal(aufgestandene(w).length, 0);
  // ein gewoehnlicher Gefallener zaehlt weiter
  faelle(w, 1, 1, 5100, 5200);
  step(w);
  assert.equal(b.seelen, 2);
  assert.equal(aufgestandene(w).length, 1);
});

test('Auferstehen: vergeht nach dauer Ticks, ohne zu zaehlen; dauer 0 bleibt', () => {
  const { w, b } = totenreich();
  faelle(w, 1, 3, 5100, 5200);
  step(w);
  const u = aufgestandene(w)[0];
  schritte(w, 98);
  assert.ok(!u.dead, 'noch da');
  schritte(w, 5);
  assert.ok(!w.entities.includes(u), 'nach 100 Ticks vergangen');
  assert.equal(b.seelen, 3, 'Vergehen ist keine Seele');

  const { w: w2 } = totenreich('tanker_bleibt');
  faelle(w2, 1, 1, 5100, 5200);
  step(w2);
  const dauer = aufgestandene(w2)[0];
  assert.equal(dauer.vergehtBei, 0);
  schritte(w2, 2000);
  assert.ok(w2.entities.includes(dauer) && !dauer.dead, 'dauer 0: bleibt');
});

test('Auferstehen: nur ein Anker, der Seelen zaehlt (growth.perTod) -- bei den Menschen steht nichts auf', () => {
  const w = bare(['mensch', 'gott']); // Spieler 0 ist kein Totenreich
  const b = spawnBuilding(w, 0, 'tanker', 5000, 5000, true);
  faelle(w, 1, 6, 5100, 5200);
  step(w);
  assert.equal(b.seelen, 0);
  assert.equal(aufgestandene(w).length, 0);
});

test('Auferstehen: Baustelle zaehlt nicht; ein Anker ohne das Feld zaehlt weiter wie bisher', () => {
  const w = bare(['tod', 'mensch']);
  const bau = spawnBuilding(w, 0, 'tanker', 5000, 5000, false);
  faelle(w, 1, 3, 5100, 5200);
  step(w);
  assert.equal(bau.seelen, 0);
  assert.equal(aufgestandene(w).length, 0);

  const w2 = bare(['tod', 'mensch']);
  const huegel = spawnBuilding(w2, 0, FACTIONS.tod.rollen.anker, 5000, 5000, true);
  faelle(w2, 1, 6, 5100, 5200);
  step(w2);
  assert.equal(huegel.seelen, 6);
  assert.equal(aufgestandene(w2).length, 0);
});

test('Auferstehen: im Gefecht -- ein echter Schuetze fuellt die Zaehlung, daraus stehen zwei auf', () => {
  const { w, b } = totenreich();
  const ziele = [];
  for (let i = 0; i < 6; i++) ziele.push(fest(spawnUnit(w, 1, 'tziel', 5100 + i * 5, 5100)));
  for (const z of ziele) z.hp = 10;
  fest(spawnUnit(w, 0, 'tfern', 4900, 5100));
  schritte(w, 80);
  assert.equal(b.seelen, 6, 'sechs Gefallene gezaehlt');
  assert.equal(w.entities.filter((e) => e.type === 'tskel' && e.player === 0).length, 2, 'zwei sind aufgestanden');
});

// ================================================================ Pruefsumme, Spielstand, Determinismus

test('Pruefsumme: Rest der Regeneration und Verlangsamung gehen in den Hash, Welten ohne bleiben unberuehrt', () => {
  const lauf = (typ, hp) => {
    const w = bare();
    verletzt(w, 0, typ, 5000, 5000, hp);
    schritte(w, 15);
    return hash(w);
  };
  assert.notEqual(lauf('treg7', 50), lauf('treg1', 50), 'verschiedener Rest, verschiedene Summe');
  assert.equal(lauf('tziel', 100), lauf('tziel', 100));
  const a = bare();
  const b = bare();
  const za = fest(spawnUnit(a, 1, 'tziel', 5000, 5000));
  const zb = fest(spawnUnit(b, 1, 'tziel', 5000, 5000));
  assert.equal(hash(a), hash(b));
  zb.langsamBis = 50;
  zb.langsamWert = 300;
  assert.notEqual(hash(a), hash(b), 'gebremst zaehlt');
  za.langsamBis = 50;
  za.langsamWert = 301;
  assert.notEqual(hash(a), hash(b), 'auch die Staerke');
  // unberuehrte Entities mischen nichts Neues ein
  const c = bare();
  const d = bare();
  spawnUnit(c, 0, 'soldat', 5000, 5000);
  spawnUnit(d, 0, 'soldat', 5000, 5000);
  assert.equal(hash(c), hash(d));
});

/** Eine Lage mit allem: Heilung, Aura, Flaeche, Bremse, Seelen kurz vor der naechsten Auferstehung. */
function ganzeLage() {
  const w = bare(['tod', 'mensch']);
  const anker = spawnBuilding(w, 0, 'tanker', 5000, 5000, true);
  anker.seelen = 2; // die naechste Seele ist die 3.
  verletzt(w, 0, 'treg7', 4900, 5000, 150);
  verletzt(w, 0, 'tziel', 4900, 5100, 50);
  fest(spawnUnit(w, 0, 'taheil', 4950, 5050));
  const walker = spawnUnit(w, 0, 'tziel', 4800, 4800);
  walker.tx = 6000;
  walker.ty = 5000;
  walker.arrived = false;
  fest(spawnUnit(w, 0, 'tatempo', 4800, 4900));
  fest(spawnUnit(w, 0, 'tfern', 4700, 5000));
  fest(spawnUnit(w, 1, 'tbremse_flaeche', 5300, 5050)); // trifft einmal die Heil-Aura-Quelle und bremst im Umkreis
  for (let i = 0; i < 4; i++) fest(spawnUnit(w, 1, 'tziel', 5000 + i * 40, 5100 + i * 30)).hp = 120;
  return w;
}
const lauf = (w, n) => {
  const h = [];
  for (let i = 0; i < n; i++) {
    step(w);
    h.push(hash(w));
  }
  return h;
};

test('Spielstand: gespeicherte Welt mit allem laeuft bitgleich weiter', () => {
  const w = ganzeLage();
  let aufgestanden = 0;
  let gebremst = 0;
  const zaehle = () => {
    aufgestanden += eventsVon(w, 'auferstanden').length;
    gebremst += w.entities.filter((e) => e.langsamBis > w.tick).length;
  };
  for (let t = 0; t < 25; t++) {
    step(w);
    zaehle();
  }
  // mitten im Gefecht sichern: die Bremse wirkt noch, der Anker zaehlt
  const geladen = zustandLaden(JSON.parse(JSON.stringify(zustandSichern(w, [null, null])))).world;
  assert.equal(hash(geladen), hash(w));
  const a = [];
  const b = [];
  for (let t = 0; t < 300; t++) {
    step(w);
    step(geladen);
    a.push(hash(w));
    b.push(hash(geladen));
    zaehle();
  }
  assert.deepEqual(b, a);
  assert.ok(aufgestanden > 0, 'in der Lage steht etwas auf');
  assert.ok(gebremst > 0, 'in der Lage wird etwas gebremst');
  assert.ok(w.entities.find((e) => e.type === 'treg7').hp > 100, 'und geheilt, trotz Splitter');
});

test('Spielstand: alte Staende ohne die neuen Felder laufen ohne Fehler (undefined statt NaN)', () => {
  const w = ganzeLage();
  const alt = JSON.parse(JSON.stringify(zustandSichern(w, [null, null])));
  for (const e of alt.world.entities) {
    delete e.regRest;
    delete e.langsamBis;
    delete e.langsamWert;
  }
  const geladen = zustandLaden(alt).world;
  schritte(geladen, 300);
  for (const e of geladen.entities) {
    assert.ok(Number.isFinite(e.hp) && Number.isFinite(e.x) && Number.isFinite(e.y), `${e.type}: Zahlen bleiben Zahlen`);
  }
  assert.ok(Number.isInteger(hash(geladen)));
});

test('Partie mit allen fuenf Mechaniken ist deterministisch', () => {
  const a = lauf(ganzeLage(), 400);
  const b = lauf(ganzeLage(), 400);
  assert.deepEqual(a, b);
  assert.notEqual(a[0], a[399], 'es hat sich etwas getan');
});

// ================================================================ Oberflaeche

test('Oberflaeche: Info-Karten nennen Regeneration, Aura, Flaeche, Bremse und Auferstehen', () => {
  const w = bare(['tod', 'mensch']);
  const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const heiler = text(einheitKarte(w, 0, 'treg'));
  assert.match(heiler, /Regeneration heilt 60 LP\/min/);
  const aura = text(einheitKarte(w, 0, 'tatempo'));
  assert.match(aura, /Aura \+50 % Tempo in 80 m/);
  assert.match(text(einheitKarte(w, 0, 'taschutz')), /Aura −50 % genommener Schaden in 80 m/);
  assert.match(text(einheitKarte(w, 0, 'taheil')), /Aura heilt 60 LP\/min in 80 m/);
  const fl = text(einheitKarte(w, 0, 'tbremse_flaeche'));
  assert.match(fl, /Fläche trifft auch im Umkreis 20 m mit 50 %/);
  assert.match(fl, /Bremst 3 s um 50 %/);
  const anker = text(gebaeudeKarte(w, 0, 'tanker'));
  assert.match(anker, /Auferstehen Jede 3\. Seele steht als Test auf, vergeht nach 10 s/);
  assert.match(text(gebaeudeKarte(w, 0, 'tanker_bleibt')), /Auferstehen Jede Seele steht als Test auf\b(?!, vergeht)/);
  assert.match(text(gebaeudeKarte(w, 0, 'tregnetz')), /Regeneration heilt 60 LP\/min, nur versorgt/);
});

test('Oberflaeche: die Auswahl zeigt Verlangsamung und wirkende Auren', () => {
  const w = bare();
  const u = fest(spawnUnit(w, 0, 'tziel', 5000, 5000));
  assert.doesNotMatch(auswahlKopf(w, u), /verlangsamt|Aura/);
  u.langsamBis = w.tick + 30;
  u.langsamWert = 300;
  assert.match(auswahlKopf(w, u), /verlangsamt −30 % \(noch 3 s\)/);
  fest(spawnUnit(w, 0, 'tatempo', 5100, 5000));
  fest(spawnUnit(w, 0, 'taschaden', 5100, 5100));
  const kopf = auswahlKopf(w, u);
  assert.match(kopf, /Aura: Tempo \+50 %, Schaden \+50 %/);
});

test('Ereignisse: geheilt etwa einmal je Sekunde und Geheilten, nur wer gerade heilt', () => {
  const w = bare();
  const heil = verletzt(w, 0, 'treg', 5000, 5000, 100);
  const voll = fest(spawnUnit(w, 0, 'treg', 5200, 5000));
  let n = 0;
  for (let t = 0; t < 100; t++) {
    step(w);
    for (const ev of eventsVon(w, 'geheilt')) {
      assert.equal(ev.id, heil.id, 'der Unverletzte meldet nichts');
      assert.deepEqual([ev.player, ev.x, ev.y], [0, 5000, 5000]);
      n++;
    }
  }
  assert.equal(n, 10);
  assert.equal(voll.hp, voll.maxHp);
});

test('Effekte: geheilt, flaeche und auferstanden werden zu Partikeln, Ringen und Klang -- ohne Ausnahme', () => {
  const fx = neueEffekte();
  const w = bare();
  const ort = { x: 5000, y: 5000 };
  w.events.push(
    { t: 'geheilt', id: 1, player: 0, ...ort },
    { t: 'flaeche', von: 1, player: 0, ...ort, radius: 200 },
    { t: 'auferstanden', id: 2, von: 3, player: 0, type: 'tskel', ...ort },
  );
  effekteAusEreignissen(fx, w, 0, () => true, { x: 5000, y: 5000, weite: 3000 }, () => true);
  assert.ok(fx.partikel.length > 0);
  assert.equal(fx.ringe.length, 2, 'Flaeche und Aufstehen je ein Ring');
  // ausser Sicht: nichts
  const fy = neueEffekte();
  effekteAusEreignissen(fy, w, 0, () => false, { x: 5000, y: 5000, weite: 3000 }, () => true);
  assert.equal(fy.partikel.length + fy.ringe.length, 0);
});
