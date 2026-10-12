// R1 Wracks und Bergung: Gefallene lassen einen Teil ihrer Masse liegen, Erbauer
// und Einheiten mit `bergung` holen sie auf Befehl. Testdaten (eine
// Bergungseinheit) werden zur Laufzeit in UNITS eingetragen und am Ende
// entfernt.

import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import {
  createWorld, step, issue, hash, spawnUnit, spawnBuilding, demolish, wrackVon, bergKraft, byId,
} from '../src/sim/sim.js';
import { createAI, stepAI } from '../src/sim/ai.js';
import { neueKunde, aufklaeren } from '../src/sim/kunde.js';
import { zustandSichern, zustandLaden } from '../src/spielstand.js';
import { UNITS, RULES } from '../src/sim/defs.js';
import { routeVon } from '../src/ui-gemeinsam.js';

UNITS.tberger = {
  name: 'Testberger', desc: '', faction: 'mensch', hp: 100, radius: 20, speed: 30, cost: { masse: 50 },
  buildTime: 50, kampf: 'nah', bergung: { kraft: 1200 },
};
const ANTEIL_VORHER = [RULES.wrackAnteil, RULES.wrackAnteilGebaeude];
// Ohne Unterhalt, damit die Masse der Spieler nur von der Bergung abhaengt
const UNTERHALT = Object.keys(UNITS).map((k) => [k, UNITS[k].unterhalt]);
for (const k of Object.keys(UNITS)) UNITS[k].unterhalt = 0;
after(() => {
  for (const [k, u] of UNTERHALT) if (UNITS[k]) UNITS[k].unterhalt = u;
  delete UNITS.tberger;
  [RULES.wrackAnteil, RULES.wrackAnteilGebaeude] = ANTEIL_VORHER;
});

/** Leere Partie (nur Menschen und Gott), freie Hand: nichts steht ausser dem, was der Test setzt. */
const leer = () => createWorld({ empty: true, factions: ['mensch', 'gott'] });
/** Eine gefallene Einheit: wie im Kampf, die Aufraeumschleife der Simulation erledigt den Rest. */
function faellt(w, e) {
  e.dead = true;
  step(w);
}
/** Ein Wrack von 31 Masse (ein Soldat, 700 Promille von 45) an diese Stelle. */
function wrackBei(w, x, y, typ = 'soldat') {
  const s = spawnUnit(w, 1, typ, x, y);
  faellt(w, s);
  return w.wracks[w.wracks.length - 1];
}

test('Wrack: ein gefallener Soldat laesst 700 Promille seiner Kosten liegen, an seiner Stelle', () => {
  const w = leer();
  const s = spawnUnit(w, 1, 'soldat', 4000, 5000);
  faellt(w, s);
  assert.equal(w.wracks.length, 1);
  const k = w.wracks[0];
  assert.equal(k.masse, 31, '45 x 700 / 1000, abgerundet');
  assert.deepEqual([k.x, k.y, k.typ, k.art, k.kind], [4000, 5000, 'soldat', 'unit', 'wrack']);
  assert.ok(k.id > s.id, 'eigene id aus demselben Zaehler');
  assert.ok(!byId(w, k.id), 'ein Wrack ist keine Entity');
  assert.equal(w.entities.filter((e) => !e.dead && e.type === 'soldat').length, 0);
});

test('Wrack: ein fertiges Gebaeude laesst 500 Promille liegen, eine Baustelle nichts', () => {
  const w = leer();
  const b = spawnBuilding(w, 1, 'grenzstein', 6000, 6000, true);
  faellt(w, b);
  assert.equal(w.wracks.length, 1);
  assert.equal(w.wracks[0].masse, 60, '120 x 500 / 1000');
  assert.equal(w.wracks[0].art, 'building');
  const baustelle = spawnBuilding(w, 1, 'grenzstein', 7000, 6000, false);
  faellt(w, baustelle);
  assert.equal(w.wracks.length, 1, 'eine Baustelle laesst nichts liegen');
});

test('Wrack: Beschworene, Vergangene, Abgerissene, Kommandanten und kostenlose Hauptgebaeude nicht', () => {
  const w = leer();
  const rufen = spawnUnit(w, 0, 'wolf', 3000, 3000);
  rufen.beschworen = true;
  rufen.vergehtBei = w.tick + 3;
  for (let t = 0; t < 6; t++) step(w);
  assert.ok(rufen.dead, 'vergangen');
  const b = spawnBuilding(w, 0, 'grenzstein', 5000, 5000, true);
  w.players[0].masse = 0;
  assert.ok(demolish(w, 0, b.id));
  step(w);
  const kdt = spawnUnit(w, 1, 'held', 6000, 6000);
  faellt(w, kdt);
  const haupt = spawnBuilding(w, 1, 'halle', 9000, 9000, true);
  faellt(w, haupt);
  assert.equal(w.wracks.length, 0);
});

test('Wrack: Anteil 0 schaltet Wracks ab, die Welt zaehlt dann keine ids dafuer', () => {
  const w = leer();
  RULES.wrackAnteil = 0;
  RULES.wrackAnteilGebaeude = 0;
  const vorher = w.nextId;
  const s = spawnUnit(w, 1, 'soldat', 4000, 5000);
  faellt(w, s);
  RULES.wrackAnteil = ANTEIL_VORHER[0];
  RULES.wrackAnteilGebaeude = ANTEIL_VORHER[1];
  assert.equal(w.wracks.length, 0);
  assert.equal(w.nextId, vorher + 1, 'nur die Einheit selbst hat eine id gebraucht');
});

test('Wrack: ein Flieger ueber einem See laesst nichts liegen, was keiner holen koennte', () => {
  const w = leer();
  UNITS.tflieger = { ...UNITS.soldat, name: 'Testflieger', fliegt: true };
  const see = { x: 8000, y: 8000, r: 800, art: 'see' };
  w.hindernisse = [see];
  const ueberSee = spawnUnit(w, 1, 'tflieger', 8000, 8000);
  faellt(w, ueberSee);
  const amUfer = spawnUnit(w, 1, 'tflieger', 5000, 5000);
  faellt(w, amUfer);
  delete UNITS.tflieger;
  assert.equal(w.wracks.length, 1);
  assert.equal(w.wracks[0].x, 5000);
});

test('Wrack: aus einem echten Gefecht, Summe der Wracks = Anteil der Gefallenen', () => {
  const w = leer();
  const a = [];
  const b = [];
  for (let i = 0; i < 4; i++) {
    a.push(spawnUnit(w, 0, 'soldat', 5000, 5000 + i * 60));
    b.push(spawnUnit(w, 1, 'soldat', 5100, 5000 + i * 60));
  }
  for (let t = 0; t < 600 && w.entities.filter((e) => !e.dead && e.type === 'soldat').length > 3; t++) step(w);
  const gefallen = 8 - w.entities.filter((e) => !e.dead && e.type === 'soldat').length;
  assert.ok(gefallen >= 5, 'es ist gestorben worden');
  assert.equal(w.wracks.length, gefallen);
  assert.equal(w.wracks.reduce((s, k) => s + k.masse, 0), gefallen * 31);
});

test('Bergung: nur auf Befehl -- ein Bauer neben einem Wrack tut von selbst nichts', () => {
  const w = leer();
  const k = wrackBei(w, 4000, 4000);
  const bauer = spawnUnit(w, 0, 'bauer', 4010, 4000);
  const vorher = w.players[0].masse;
  for (let t = 0; t < 300; t++) step(w);
  assert.equal(w.players[0].masse, vorher);
  assert.equal(k.masse, 31);
  assert.equal(bauer.auftrag, 0);
});

test('Bergung: Befehl bergen schickt den Bauer hin, zahlt die ganze Masse aus, das Wrack verschwindet', () => {
  const w = leer();
  const k = wrackBei(w, 4600, 4000);
  const bauer = spawnUnit(w, 0, 'bauer', 4000, 4000);
  assert.equal(bergKraft(UNITS.bauer), 200, 'Baukraft 400 x 500 / 1000');
  const vorher = w.players[0].masse;
  issue(w, { type: 'bergen', player: 0, ids: [bauer.id], id: k.id });
  step(w);
  assert.equal(bauer.auftrag, k.id);
  assert.equal(bauer.arrived, false, 'er geht hin');
  let meldung = 0;
  for (let t = 0; t < 2000 && wrackVon(w, k.id); t++) {
    step(w);
    meldung += w.events.filter((e) => e.t === 'geborgen').length;
  }
  assert.equal(meldung, 1, 'Ereignis geborgen');
  assert.equal(wrackVon(w, k.id), null, 'leer geborgen, weg');
  assert.equal(w.wracks.length, 0);
  assert.equal(w.players[0].masse - vorher, 31, 'genau die Masse des Wracks');
  step(w);
  assert.equal(bauer.auftrag, 0, 'danach ist er untaetig');
});

test('Bergung: dauert so lange, wie Masse und Bergekraft sagen', () => {
  const w = leer();
  const k = wrackBei(w, 4000, 4000, 'wolf'); // 130 x 0,7 = 91
  assert.equal(k.masse, 91);
  const bauer = spawnUnit(w, 0, 'bauer', 4010, 4000);
  issue(w, { type: 'bergen', player: 0, ids: [bauer.id], id: k.id });
  let ticks = 0;
  while (wrackVon(w, k.id) && ticks < 5000) {
    step(w);
    ticks++;
  }
  // 91 Masse bei 200 je Minute = 27,3 s = 273 Ticks (plus der Befehlstick)
  assert.ok(ticks >= 273 && ticks <= 280, `Ticks: ${ticks}`);
});

test('Bergung: ein Soldat kann nicht bergen, eine Einheit mit bergung schon (eigene Kraft)', () => {
  const w = leer();
  const k = wrackBei(w, 4000, 4000);
  const soldat = spawnUnit(w, 0, 'soldat', 4010, 4000);
  issue(w, { type: 'bergen', player: 0, ids: [soldat.id], id: k.id });
  for (let t = 0; t < 100; t++) step(w);
  assert.equal(soldat.auftrag, 0);
  assert.equal(k.masse, 31);
  const b = spawnUnit(w, 0, 'tberger', 4010, 4040);
  assert.equal(bergKraft(UNITS.tberger), 1200);
  issue(w, { type: 'bergen', player: 0, ids: [b.id], id: k.id });
  const vorher = w.players[0].masse;
  for (let t = 0; t < 100 && wrackVon(w, k.id); t++) step(w);
  assert.equal(wrackVon(w, k.id), null);
  assert.equal(w.players[0].masse - vorher, 31);
});

test('Bergung: fremde und unbekannte Befehle bewirken nichts', () => {
  const w = leer();
  const k = wrackBei(w, 4000, 4000);
  const fremd = spawnUnit(w, 1, 'bauer', 4010, 4000);
  issue(w, { type: 'bergen', player: 0, ids: [fremd.id], id: k.id });
  issue(w, { type: 'bergen', player: 0, ids: [fremd.id], id: 999999 });
  step(w);
  assert.equal(fremd.auftrag, 0, 'nicht seine Einheit');
});

test('Bergung: zwei Berger teilen sich ein Wrack, die Summe stimmt auf die Masse genau', () => {
  const w = leer();
  const k = wrackBei(w, 4000, 4000, 'wolf'); // 91 Masse
  const a = spawnUnit(w, 0, 'bauer', 4010, 4000);
  const b = spawnUnit(w, 0, 'bauer', 3990, 4000);
  const c = spawnUnit(w, 1, 'bauer', 4000, 4030); // auch der Gegner darf (Wracks gehoeren niemandem)
  issue(w, { type: 'bergen', player: 0, ids: [a.id, b.id], id: k.id });
  issue(w, { type: 'bergen', player: 1, ids: [c.id], id: k.id });
  const v0 = w.players[0].masse;
  const v1 = w.players[1].masse;
  let ticks = 0;
  while (wrackVon(w, k.id) && ticks < 2000) {
    step(w);
    ticks++;
  }
  const g0 = w.players[0].masse - v0;
  const g1 = w.players[1].masse - v1;
  // Was unter einer ganzen Masse bleibt, liegt im Zaehler (masseAcc) -- Gesamtsumme in Promille-Masse pro Minute
  const PRO_MASSE = 600000;
  const summe = (g0 + g1) * PRO_MASSE + w.players[0].masseAcc + w.players[1].masseAcc;
  assert.equal(summe, 91 * PRO_MASSE, 'nicht mehr und nicht weniger als im Wrack war');
  assert.ok(g0 > g1, 'zwei Berger bekommen mehr als einer');
  assert.ok(ticks < 100, `zu dritt rasch (${ticks})`);
});

test('Bergung: dieselben Befehle, dieselbe Aufteilung (bitgleich), auch bei umgekehrter Befehlsreihenfolge der ids', () => {
  const lauf = (ids) => {
    const w = leer();
    const k = wrackBei(w, 4000, 4000, 'wolf');
    const a = spawnUnit(w, 0, 'bauer', 4010, 4000);
    const b = spawnUnit(w, 0, 'bauer', 3990, 4000);
    const c = spawnUnit(w, 1, 'bauer', 4000, 4030);
    const all = [a.id, b.id, c.id];
    issue(w, { type: 'bergen', player: 0, ids: ids.map((i) => all[i]).filter((id) => id !== c.id), id: k.id });
    issue(w, { type: 'bergen', player: 1, ids: [c.id], id: k.id });
    for (let t = 0; t < 60; t++) step(w);
    return [hash(w), w.players[0].masse, w.players[1].masse, w.wracks.map((x) => x.fein)];
  };
  assert.deepEqual(lauf([0, 1, 2]), lauf([0, 1, 2]));
  assert.deepEqual(lauf([0, 1, 2]), lauf([1, 0, 2]));
});

test('Bergung: Shift haengt das naechste Wrack an die Reihe, die Route zeigt beide', () => {
  const w = leer();
  const k1 = wrackBei(w, 4300, 4000);
  const k2 = wrackBei(w, 4600, 4300);
  const bauer = spawnUnit(w, 0, 'bauer', 4000, 4000);
  issue(w, { type: 'bergen', player: 0, ids: [bauer.id], id: k1.id });
  issue(w, { type: 'bergen', player: 0, ids: [bauer.id], id: k2.id, anhaengen: true });
  step(w);
  assert.deepEqual([bauer.auftrag, bauer.reihe], [k1.id, [k2.id]]);
  assert.deepEqual(routeVon(w, bauer).map((p) => p[2]), ['start', 'berge', 'berge']);
  const vorher = w.players[0].masse;
  for (let t = 0; t < 3000 && w.wracks.length; t++) step(w);
  assert.equal(w.wracks.length, 0);
  assert.equal(w.players[0].masse - vorher, 62, 'beide');
  step(w);
  assert.equal(bauer.auftrag, 0);
});

test('Bergung: ein neuer Befehl bricht das Bergen ab, das Wrack behaelt, was noch da ist', () => {
  const w = leer();
  const k = wrackBei(w, 4000, 4000, 'wolf');
  const bauer = spawnUnit(w, 0, 'bauer', 4010, 4000);
  issue(w, { type: 'bergen', player: 0, ids: [bauer.id], id: k.id });
  for (let t = 0; t < 50; t++) step(w);
  const rest = k.masse;
  assert.ok(rest < 91 && rest > 0);
  issue(w, { type: 'move', player: 0, ids: [bauer.id], x: 6000, y: 6000 });
  for (let t = 0; t < 50; t++) step(w);
  assert.equal(k.masse, rest);
  assert.equal(bauer.auftrag, 0);
});

test('Bergung: ein Bauauftrag geht vor, wenn der Spieler ihn gibt (ersetzt den Bergeauftrag)', () => {
  const w = leer();
  const k = wrackBei(w, 4000, 4000);
  const bauer = spawnUnit(w, 0, 'bauer', 4010, 4000);
  issue(w, { type: 'bergen', player: 0, ids: [bauer.id], id: k.id });
  step(w);
  issue(w, { type: 'build', player: 0, ids: [bauer.id], building: 'grenzstein', x: 5000, y: 3000 });
  step(w);
  assert.ok(w.plaene.length === 1 && bauer.auftrag === w.plaene[0].id);
});

test('Hash und Spielstand: ein Wrack mitten in der Bergung geht bitgenau durchs Speichern', () => {
  const w = leer();
  const k = wrackBei(w, 4300, 4000, 'wolf');
  const bauer = spawnUnit(w, 0, 'bauer', 4000, 4000);
  const h0 = hash(w);
  issue(w, { type: 'bergen', player: 0, ids: [bauer.id], id: k.id });
  for (let t = 0; t < 60; t++) step(w);
  assert.ok(k.fein < k.voll * 600 && k.fein > 0, 'mitten drin');
  assert.notEqual(hash(w), h0);
  const text = JSON.stringify(zustandSichern(w, [null, null]));
  const g = zustandLaden(JSON.parse(text));
  assert.equal(hash(g.world), hash(w));
  assert.deepEqual(g.world.wracks, w.wracks);
  for (let t = 0; t < 300; t++) {
    step(w);
    step(g.world);
    assert.equal(hash(g.world), hash(w), `Tick ${w.tick}`);
  }
  assert.equal(w.wracks.length, 0);
  assert.equal(g.world.players[0].masse, w.players[0].masse);
  // Der Hash haengt am Wrack: ein anderer Bestand, eine andere Summe
  const a = leer();
  const b = leer();
  wrackBei(a, 4000, 4000);
  wrackBei(b, 4000, 4000);
  assert.equal(hash(a), hash(b));
  a.wracks[0].fein -= 600;
  assert.notEqual(hash(a), hash(b));
});

test('Spielstand: ein alter Stand ohne Wracks laedt als leere Liste', () => {
  const w = leer();
  const z = JSON.parse(JSON.stringify(zustandSichern(w, [null, null])));
  delete z.world.wracks;
  assert.deepEqual(zustandLaden(z).world.wracks, []);
});

test('Kunde: ein Wrack kennt nur, wer es gesehen hat -- und vergisst es, wo er hinsieht und nichts liegt', () => {
  const w = leer();
  const k = wrackBei(w, 9000, 9000);
  const kunde = neueKunde(0);
  const spaeher = spawnUnit(w, 0, 'soldat', 2000, 2000);
  aufklaeren(kunde, w);
  assert.equal(kunde.wracks.length, 0, 'ungesehen');
  // hingehen und sehen
  spaeher.x = 8600;
  spaeher.y = 9000;
  step(w);
  aufklaeren(kunde, w);
  assert.deepEqual(kunde.wracks.map((x) => [x.id, x.masse]), [[k.id, 31]]);
  // weggehen: bleibt in Erinnerung, mit der zuletzt gesehenen Masse
  spaeher.x = 2000;
  spaeher.y = 2000;
  k.fein -= 600;
  k.masse = 30;
  step(w);
  aufklaeren(kunde, w);
  assert.deepEqual(kunde.wracks.map((x) => [x.id, x.masse]), [[k.id, 31]]);
  // es verschwindet, ohne dass er es sieht: er weiss es nicht
  w.wracks.length = 0;
  step(w);
  aufklaeren(kunde, w);
  assert.equal(kunde.wracks.length, 1);
  // zurueck: dort liegt nichts mehr
  spaeher.x = 8600;
  spaeher.y = 9000;
  step(w);
  aufklaeren(kunde, w);
  assert.equal(kunde.wracks.length, 0);
});

test('Kunde: ein Wrack in Sicht zeigt die Masse von jetzt', () => {
  const w = leer();
  const k = wrackBei(w, 4000, 4000, 'wolf');
  spawnUnit(w, 0, 'bauer', 4300, 4000);
  const kunde = neueKunde(0);
  aufklaeren(kunde, w);
  assert.equal(kunde.wracks[0].masse, 91);
  w.wracks[0].fein -= 6000;
  w.wracks[0].masse = 81;
  step(w);
  aufklaeren(kunde, w);
  assert.equal(kunde.wracks[0].masse, 81);
  assert.equal(kunde.wracks[0].tick, w.tick, 'gerade gesehen');
  assert.equal(k.id, kunde.wracks[0].id);
});

test('KI: ein untaetiger Arbeiter holt ein Wrack in der eigenen Domaene, nur auf Grund der Kunde', () => {
  const w = createWorld({ seed: 5, factions: ['mensch', 'gott'] });
  const ai = createAI(0, 5, 'standard');
  const haupt = w.entities.find((e) => e.player === 0 && e.kind === 'building');
  const bauer = spawnUnit(w, 0, 'bauer', haupt.x + 400, haupt.y + 400);
  // eigene Domaene und im Blick der Hauptgebaeude: ein Wrack naeher als alles andere
  const k = wrackBei(w, haupt.x + 500, haupt.y + 500);
  // ... und eins weit draussen, das niemand gesehen hat
  const fern = wrackBei(w, 14000, 14000);
  let angenommen = false;
  for (let t = 0; t < 400 && !angenommen; t++) {
    stepAI(ai, w);
    step(w);
    angenommen = w.entities.some((u) => u.kind === 'unit' && u.player === 0 && !u.dead && u.auftrag === k.id);
  }
  assert.ok(angenommen, 'ein Arbeiter ging zum Wrack');
  for (const u of w.entities) if (u.kind === 'unit' && !u.dead) assert.notEqual(u.auftrag, fern.id, 'das ferne Wrack kennt die KI nicht');
  assert.ok(bauer);
});

test('KI gegen KI: Partien mit Wracks sind deterministisch, es wird geborgen', () => {
  const lauf = () => {
    const w = createWorld({ seed: 3, factions: ['mensch', 'gott'] });
    const ais = [createAI(0, 3, 'sturm'), createAI(1, 4, 'burg')];
    let geborgen = 0;
    for (let t = 0; t < 7000 && !w.over; t++) {
      for (const a of ais) stepAI(a, w);
      step(w);
      geborgen += w.events.filter((e) => e.t === 'geborgen').length;
    }
    return { h: hash(w), geborgen, wracks: w.wracks.length };
  };
  const a = lauf();
  const b = lauf();
  assert.deepEqual(a, b);
  assert.ok(a.wracks > 0, 'es liegen Wracks');
  assert.ok(a.geborgen > 0, 'die KI hat welche geborgen');
});
