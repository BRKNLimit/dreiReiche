// R3 Chassis und Module (docs/umbau/pakete-sonnet.md). Ein Testvolk zur Laufzeit
// mit einem Rumpf (zwei Steckplaetze: gross, klein) und sechs Modulen; kein
// bestehendes Volk hat Module. Geprueft wird die Ableitung (Kosten, LP, Sicht, Waffe,
// Tempo), Produktion mit und ohne Bestueckung, Umruesten (Kosten, Dauer, ungueltige
// Befehle), Spielstand mitten im Umruesten, Hash und die Datenpruefung der Module.

import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step, spawnBuilding, spawnUnit, issue, hash, anzahlVon, bonus, byId } from '../src/sim/sim.js';
import { BUILDINGS, UNITS, FACTIONS, MODULE, RUEMPFE, RULES, SKILLS, FELDER, huelleAnlegen, variante, bestueckungTyp, rumpfVon } from '../src/sim/defs.js';
import { createAI, stepAI } from '../src/sim/ai.js';
import { zustandSichern, zustandLaden } from '../src/spielstand.js';
import { einheitKarte, auswahlKopf, gruppenHtml, kodexZeigen } from '../src/ui-gemeinsam.js';

const V = 'rtest';
const klon = (q, ueber = {}) => ({ ...structuredClone(q), faction: V, ...ueber });

const T_GEBAEUDE = {
  rhalle: klon(BUILDINGS.halle, { buildList: ['rbauer', 'rleicht'] }),
  ranker: klon(BUILDINGS.grenzstein),
  rkraft: klon(BUILDINGS.schmiede),
  rfron: klon(BUILDINGS.saege),
  rblut: klon(BUILDINGS.schacht),
  // Fabrik ohne Energiebedarf: Ausbildung dauert genau buildTime
  rfabrik: { ...klon(BUILDINGS.kaserne, { buildList: ['rleicht', 'rrumpf'] }), energieIn: 0 },
  rwerk: klon(BUILDINGS.schmiede, { umruesten: true, radius: 60 }),
};
const T_EINHEITEN = {
  rbauer: klon(UNITS.bauer),
  rleicht: klon(UNITS.soldat),
  rkdt: klon(UNITS.held),
  rrumpf: {
    name: 'Testrumpf', desc: 'Rumpf mit zwei Steckplaetzen.', faction: V, hp: 600, radius: 30, speed: 24, cost: { masse: 100 },
    unterhalt: 5, buildTime: 100, slots: ['gross', 'klein'], bestueckung: ['rkanone', 'rgatling'], hoechstens: 3,
  },
};
const T_MODULE = {
  rkanone: { name: 'Kanone', groesse: 'gross', cost: { masse: 80 }, buildTime: 60, kampf: 'fern', weapon: { range: 600, damage: 30, cooldown: 12 }, hp: 100 },
  rhaubitze: { name: 'Haubitze', groesse: 'gross', cost: { masse: 120, resonit: 5 }, buildTime: 120, kampf: 'fern', weapon: { range: 900, damage: 45, cooldown: 20, flaeche: { radius: 100, anteil: 500 } }, speed: -100, nur: ['rrumpf'] },
  rgatling: { name: 'Gatling', groesse: 'klein', cost: { masse: 40 }, buildTime: 20, kampf: 'fern', weapon: { range: 300, damage: 5, cooldown: 3 } },
  rradar: { name: 'Radar', groesse: 'klein', cost: { masse: 50 }, buildTime: 30, sicht: 2200, regeneration: 12 },
  rkran: { name: 'Bergungskran', groesse: 'klein', cost: { masse: 30 }, buildTime: 25, bergung: { kraft: 120 } },
  // Modul, das auf einen anderen Rumpf nur passte (nur), und eines, das einem anderen Volk gehoert
  rnurAnderer: { name: 'Nur fuer andere', groesse: 'klein', cost: { masse: 10 }, buildTime: 5, nur: ['gibtsnicht'] },
};
const T_ROLLEN = { anker: 'ranker', kraft: 'rkraft', masse: 'rfron', resonit: 'rblut', fabrik: 'rfabrik', bauer: 'rbauer', leicht: 'rleicht' };
const T_VOLK = {
  name: 'Rtest', color: '#88aacc', growth: { start: 2600, max: 2600, perTick: 0 }, kommandant: 'rkdt', haupt: 'rhalle',
  kurz: 'Rtest', bauten: ['rkraft', 'rfron', 'ranker', 'rfabrik', 'rblut', 'rwerk'], faehigkeiten: [], rollen: T_ROLLEN, lernen: [],
};

Object.assign(BUILDINGS, T_GEBAEUDE);
Object.assign(UNITS, T_EINHEITEN);
FACTIONS[V] = T_VOLK;
for (const [k, m] of Object.entries(T_MODULE)) MODULE[k] = { ...m, faction: V };
MODULE.rfremd = { name: 'Fremdmodul', groesse: 'klein', cost: { masse: 10 }, buildTime: 5, faction: 'mensch' };
assert.ok(huelleAnlegen('rrumpf'), 'der Testrumpf ist gueltig');

after(() => {
  for (const k of Object.keys(UNITS)) if (k === 'rrumpf' || k.startsWith('rrumpf|')) delete UNITS[k];
  delete RUEMPFE.rrumpf;
  for (const k of Object.keys(T_GEBAEUDE)) delete BUILDINGS[k];
  for (const k of Object.keys(T_EINHEITEN)) delete UNITS[k];
  for (const k of [...Object.keys(T_MODULE), 'rfremd']) delete MODULE[k];
  delete FACTIONS[V];
});

const STD = 'rrumpf';
const H = 'rrumpf|rhaubitze|rradar';

function neu(seed = 1, gegner = 'mensch') {
  variante(H);
  const w = createWorld({ seed, factions: [V, gegner] });
  w.players[0].masse = 5000;
  w.players[0].resonit = 100;
  return w;
}
const lauf = (w, n) => {
  for (let i = 0; i < n; i++) step(w);
};
const hauptV = (w) => w.entities.find((e) => e.player === 0 && e.type === 'rhalle');

test('Ableitung: Standardbestueckung hat den Schluessel des Rumpfs, Kosten und Bauzeit sind Summen', () => {
  const d = UNITS[STD];
  assert.equal(d.rumpf, STD);
  assert.deepEqual(d.bestueckung, ['rkanone', 'rgatling']);
  assert.deepEqual(d.cost, { masse: 100 + 80 + 40 });
  assert.equal(d.buildTime, 100 + 60 + 20);
  assert.equal(d.hp, 600 + 100);
  assert.equal(d.name, 'Testrumpf');
  assert.equal(d.unterhalt, 5);
  assert.equal(d.speed, 24);
  assert.equal(d.radius, 30);
  assert.equal(d.hoechstens, 3, 'Felder des Rumpfs bleiben');
  assert.deepEqual(d.weapon, { range: 600, damage: 30, cooldown: 12 }, 'die erste Waffe in Steckplatz-Reihenfolge');
  assert.equal(d.kampf, 'fern');
  assert.equal(d.sicht, undefined, 'kein Modul mit Sicht: es bleibt bei der Grundsicht');
  // Die Rohdaten bleiben unberuehrt
  assert.equal(RUEMPFE[STD].hp, 600);
  assert.deepEqual(RUEMPFE[STD].cost, { masse: 100 });
});

test('Ableitung: andere Bestueckung — Summen, Maximum der Sicht, Tempo in Promille, Waffe des ersten Waffenmoduls', () => {
  const d = variante(H);
  assert.equal(UNITS[H], d);
  assert.deepEqual(d.cost, { masse: 100 + 120 + 50, resonit: 5 });
  assert.equal(d.buildTime, 100 + 120 + 30);
  assert.equal(d.hp, 600);
  assert.equal(d.sicht, 2200, 'Maximum');
  assert.equal(d.speed, Math.floor((24 * 900) / 1000), 'speed -100 Promille');
  assert.equal(d.regeneration, 12);
  assert.equal(d.weapon.damage, 45);
  assert.ok(d.weapon.flaeche);
  assert.equal(d.rumpf, STD);
  assert.deepEqual(d.bestueckung, ['rhaubitze', 'rradar']);
  assert.equal(d.name, 'Testrumpf (Haubitze, Radar)');
  // Ohne Waffenmodul und ohne eigene Waffe des Rumpfs: unbewaffnet; Bergung kommt vom Modul
  const k = variante('rrumpf|-|rkran');
  assert.equal(k.weapon, undefined);
  assert.deepEqual(k.bergung, { kraft: 120 });
  assert.deepEqual(k.cost, { masse: 100 + 30 });
  // Waffe aus dem zweiten Steckplatz, wenn der erste keine hat
  assert.equal(variante('rrumpf|-|rgatling').weapon.damage, 5);
  // Alle Zahlen ganz
  for (const x of [d, k]) for (const v of [x.hp, x.speed, x.buildTime, x.cost.masse]) assert.ok(Number.isInteger(v));
});

test('Ableitung: eine reine Funktion des Schluessels; ungueltige Schluessel ergeben nichts', () => {
  const a = variante(H);
  delete UNITS[H];
  const b = variante(H);
  assert.notEqual(a, b);
  assert.deepEqual(a, b, 'nach dem Loeschen kommt dasselbe heraus');
  assert.equal(bestueckungTyp(STD, ['rkanone', 'rgatling']), STD, 'Standard: der Rumpf-Schluessel');
  assert.equal(bestueckungTyp(STD, ['rhaubitze', 'rradar']), H);
  assert.equal(bestueckungTyp(STD, ['', '']), 'rrumpf|-|-');
  for (const schlecht of [
    ['rkanone'], // zu kurz
    ['rkanone', 'rgatling', 'rradar'], // zu lang
    ['rgatling', 'rgatling'], // klein in grossem Steckplatz
    ['rkanone', 'rkanone'], // gross in kleinem
    ['rkanone', 'gibtsnicht'], // unbekannt
    ['rkanone', 'rfremd'], // anderes Volk
    ['rkanone', 'rnurAnderer'], // nur: passt nicht auf diesen Rumpf
    ['rkanone', 'constructor'], // kein Eigenschaftsname der Prototypen
    ['rkanone', 7],
    'rkanone',
    null,
  ]) assert.equal(bestueckungTyp(STD, schlecht), null, JSON.stringify(schlecht));
  assert.equal(bestueckungTyp('rleicht', ['rkanone']), null, 'kein Rumpf');
  assert.equal(bestueckungTyp('constructor', []), null);
  assert.equal(variante('rrumpf|rkanone|rgatling'), null, 'die Standardbestueckung hat keinen Schluessel mit |');
  assert.equal(variante('rrumpf|rkanone'), null);
  assert.equal(variante('rrumpf|x|y'), null);
  assert.equal(variante('constructor'), null);
  assert.equal(rumpfVon(H), STD);
  assert.equal(rumpfVon('rleicht'), 'rleicht');
});

test('Produktion: ohne Angabe die Standardbestueckung, mit Angabe die Variante; gebucht wird ihr Preis', () => {
  const w = neu();
  const fab = spawnBuilding(w, 0, 'rfabrik', 3800, 3000, true);
  const m0 = w.players[0].masse;
  issue(w, { type: 'produce', player: 0, id: fab.id, unit: STD });
  step(w);
  assert.deepEqual(fab.queue, [STD]);
  assert.equal(w.players[0].masse, m0 - 220);
  issue(w, { type: 'produce', player: 0, id: fab.id, unit: STD, bestueckung: ['rhaubitze', 'rradar'] });
  step(w);
  assert.deepEqual(fab.queue, [STD, H]);
  assert.equal(w.players[0].masse, m0 - 220 - 270);
  assert.equal(w.players[0].resonit, 100 - 5);
  // Ungueltig: nichts in der Schlange, nichts bezahlt
  const vorher = w.players[0].masse;
  for (const best of [['rgatling', 'rgatling'], ['rkanone'], ['rkanone', 'rfremd']]) {
    issue(w, { type: 'produce', player: 0, id: fab.id, unit: STD, bestueckung: best });
  }
  issue(w, { type: 'produce', player: 0, id: fab.id, unit: 'rleicht', bestueckung: ['rkanone'] }); // kein Rumpf
  issue(w, { type: 'produce', player: 0, id: fab.id, unit: 'rbauer' }); // nicht in der buildList
  step(w);
  assert.equal(fab.queue.length, 2);
  assert.equal(w.players[0].masse, vorher);
  // Die Einheiten entstehen als diese Typen (Bauzeit je Variante)
  lauf(w, 185);
  assert.equal(w.entities.filter((e) => e.player === 0 && e.type === STD).length, 1);
  lauf(w, 250);
  const h = w.entities.find((e) => e.player === 0 && e.type === H);
  assert.ok(h, 'die Haubitzen-Variante steht auf dem Feld');
  assert.equal(h.maxHp, 600);
  assert.equal(h.hp, 600);
});

test('Produktion: hoechstens zaehlt alle Varianten eines Rumpfs, gesperrte und fremde Ruempfe gehen nicht', () => {
  const w = neu();
  const fab = spawnBuilding(w, 0, 'rfabrik', 3800, 3000, true);
  for (const best of [undefined, ['rhaubitze', 'rradar'], ['rkanone', 'rradar'], ['rkanone', 'rkran']]) {
    issue(w, { type: 'produce', player: 0, id: fab.id, unit: STD, ...(best ? { bestueckung: best } : {}) });
  }
  step(w);
  assert.equal(fab.queue.length, 3, 'hoechstens 3 gleichzeitig, ueber alle Varianten');
  assert.equal(anzahlVon(w, 0, STD), 3);
  assert.equal(anzahlVon(w, 0, H), 3, 'die Variante fragt nach ihrem Rumpf');
  // Der Gegner (Menschen) darf den Rumpf nicht bestellen
  const kaserne = spawnBuilding(w, 1, 'kaserne', 15000, 15000, true);
  issue(w, { type: 'produce', player: 1, id: kaserne.id, unit: STD });
  step(w);
  assert.equal(kaserne.queue.length, 0);
});

/** Welt mit Werkstatt und einer Einheit in der Naehe; gibt { w, werk, u } */
function werkstatt(typ = STD, abstand = 150) {
  const w = neu(2);
  const werk = spawnBuilding(w, 0, 'rwerk', 4500, 3000, true);
  const u = spawnUnit(w, 0, typ, werk.x - 60 - 30 - abstand, werk.y);
  return { w, werk, u };
}

test('Umruesten: die Einheit geht zur Werkstatt, bezahlt das neue Modul, steht buildTime Ticks und ist danach die Variante', () => {
  const { w, werk, u } = werkstatt(STD, 1500);
  u.hp = 350; // halbes Leben
  const m0 = w.players[0].masse;
  issue(w, { type: 'umruesten', player: 0, id: u.id, slot: 1, modul: 'rradar' });
  step(w);
  assert.ok(u.umruest, 'Auftrag angenommen');
  assert.equal(w.players[0].masse, m0, 'noch nichts bezahlt: sie ist unterwegs');
  assert.equal(u.type, STD);
  let n = 0;
  while (!u.umruest.bis && n++ < 500) step(w);
  assert.ok(u.umruest.bis, 'angekommen und begonnen');
  assert.equal(w.players[0].masse, m0 - 50, 'bezahlt: volle Kosten des neuen Moduls');
  assert.equal(u.umruest.bis - w.tick, 29, 'Dauer = buildTime des Moduls: begonnen im Tick t, fertig im Tick t + 30');
  const x = u.x;
  lauf(w, 29);
  assert.equal(u.type, STD, 'noch nicht fertig');
  assert.equal(u.x, x, 'sie steht');
  step(w);
  assert.equal(u.type, 'rrumpf|rkanone|rradar');
  assert.equal(u.umruest, undefined);
  assert.equal(u.maxHp, 700);
  assert.equal(u.hp, 350, 'LP behalten ihr Verhaeltnis (350/700 vorher wie nachher)');
  assert.ok(w.events.some((e) => e.t === 'umgeruestet' && e.id === u.id));
  assert.equal(UNITS[u.type].sicht, 2200);
  assert.equal(werk.dead, false);
});

test('Umruesten: Erstattung des alten Moduls ist eine Regel, standardmaessig verloren', () => {
  assert.equal(RULES.umruestErstattung, 0);
  RULES.umruestErstattung = 500;
  try {
    const { w, u } = werkstatt();
    const m0 = w.players[0].masse;
    issue(w, { type: 'umruesten', player: 0, id: u.id, slot: 0, modul: 'rhaubitze' });
    lauf(w, 3);
    assert.equal(w.players[0].masse, m0 - 120 + 40, 'Haubitze 120 gezahlt, halbe Kanone (80 -> 40) zurueck');
  } finally {
    RULES.umruestErstattung = 0;
  }
});

test('Umruesten: ungueltige Befehle werden abgelehnt', () => {
  const { w, u, werk } = werkstatt();
  const fremd = spawnUnit(w, 1, 'soldat', 8000, 8000);
  const bauer = spawnUnit(w, 0, 'rbauer', 4000, 3500);
  const falsch = [
    { id: fremd.id, slot: 0, modul: 'rkanone' }, // fremde Einheit
    { id: bauer.id, slot: 0, modul: 'rkanone' }, // kein Rumpf
    { id: u.id, slot: 2, modul: 'rkanone' }, // Steckplatz gibt es nicht
    { id: u.id, slot: -1, modul: 'rgatling' },
    { id: u.id, slot: 0.5, modul: 'rkanone' },
    { id: u.id, slot: '0', modul: 'rhaubitze' },
    { id: u.id, slot: 0, modul: 'rgatling' }, // falsche Groesse
    { id: u.id, slot: 1, modul: 'rkanone' },
    { id: u.id, slot: 0, modul: 'unbekannt' },
    { id: u.id, slot: 0, modul: 'rkanone' }, // schon drin
    { id: u.id, slot: 1, modul: 'rfremd' }, // anderes Volk
    { id: u.id, slot: 1, modul: 'rnurAnderer' }, // passt nicht auf den Rumpf
    { id: u.id, slot: 0, modul: 'constructor' },
    { id: u.id, slot: 0, modul: null },
    { id: 99999, slot: 0, modul: 'rhaubitze' },
  ];
  for (const f of falsch) issue(w, { type: 'umruesten', player: 0, ...f });
  step(w);
  for (const e of [u, bauer, fremd]) assert.equal(e.umruest, undefined);
  // Gegner darf meine Einheit nicht umruesten
  issue(w, { type: 'umruesten', player: 1, id: u.id, slot: 0, modul: 'rhaubitze' });
  step(w);
  assert.equal(u.umruest, undefined);
  // Nicht bezahlbar: Haubitze braucht Resonit
  w.players[0].resonit = 4;
  issue(w, { type: 'umruesten', player: 0, id: u.id, slot: 0, modul: 'rhaubitze' });
  step(w);
  assert.equal(u.umruest, undefined);
  w.players[0].resonit = 100;
  // Ohne Werkstatt: nichts. Mit einer unfertigen auch nicht.
  werk.dead = true;
  w.entities = w.entities.filter((e) => !e.dead);
  issue(w, { type: 'umruesten', player: 0, id: u.id, slot: 0, modul: 'rhaubitze' });
  step(w);
  assert.equal(u.umruest, undefined, 'keine Werkstatt');
  spawnBuilding(w, 0, 'rwerk', 4500, 3000, false);
  issue(w, { type: 'umruesten', player: 0, id: u.id, slot: 0, modul: 'rhaubitze' });
  step(w);
  assert.equal(u.umruest, undefined, 'Baustelle zaehlt nicht');
});

test('Umruesten: mittendrin keine neuen Befehle; unterwegs hebt ein Befehl den Auftrag ohne Kosten auf', () => {
  const { w, u } = werkstatt(STD, 1500);
  const m0 = w.players[0].masse;
  issue(w, { type: 'umruesten', player: 0, id: u.id, slot: 0, modul: 'rhaubitze' });
  step(w);
  assert.ok(u.umruest && !u.umruest.bis);
  issue(w, { type: 'move', player: 0, ids: [u.id], x: 1000, y: 1000 });
  step(w);
  assert.equal(u.umruest, undefined, 'ein Bewegungsbefehl hebt auf');
  assert.equal(w.players[0].masse, m0);
  // Nochmal, diesmal bis zum Beginn
  const { w: w2, u: u2 } = werkstatt();
  issue(w2, { type: 'umruesten', player: 0, id: u2.id, slot: 0, modul: 'rhaubitze' });
  lauf(w2, 3);
  assert.ok(u2.umruest.bis);
  const x = u2.x;
  issue(w2, { type: 'move', player: 0, ids: [u2.id], x: 1000, y: 1000 });
  issue(w2, { type: 'stopp', player: 0, ids: [u2.id] });
  issue(w2, { type: 'umruesten', player: 0, id: u2.id, slot: 1, modul: 'rradar' }); // auch kein zweiter Umbau
  lauf(w2, 5);
  assert.ok(u2.umruest.bis, 'laeuft weiter');
  assert.equal(u2.umruest.modul, 'rhaubitze');
  assert.equal(u2.x, x);
  assert.notEqual(u2.tx, 1000);
  lauf(w2, 130);
  assert.equal(u2.type, 'rrumpf|rhaubitze|rgatling');
});

test('Umruesten: wer umgeruestet wird, kaempft nicht; danach schon', () => {
  const { w, u } = werkstatt();
  const feind = spawnUnit(w, 1, 'soldat', u.x + 300, u.y);
  feind.hp = feind.maxHp = 100000;
  issue(w, { type: 'stopp', player: 1, ids: [feind.id] });
  issue(w, { type: 'umruesten', player: 0, id: u.id, slot: 0, modul: 'rhaubitze' });
  lauf(w, 100);
  assert.ok(u.umruest && u.umruest.bis, 'noch dabei (Haubitze braucht 120 Ticks)');
  assert.equal(feind.hp, 100000, 'kein Schuss waehrend des Umruestens');
  lauf(w, 80);
  assert.equal(u.type, 'rrumpf|rhaubitze|rgatling');
  assert.ok(feind.hp < 100000, 'die neue Waffe schiesst');
});

test('Umruesten: fehlt das Geld bei der Ankunft, endet der Auftrag ohne Kosten; fehlt die Werkstatt, ebenso', () => {
  const { w, u } = werkstatt(STD, 1500);
  issue(w, { type: 'umruesten', player: 0, id: u.id, slot: 0, modul: 'rhaubitze' });
  step(w);
  w.players[0].masse = 10;
  lauf(w, 400);
  assert.equal(u.umruest, undefined);
  assert.ok(w.players[0].masse <= 10, 'nichts bezahlt (hoechstens Unterhalt abgezogen)');
  assert.equal(u.type, STD);
  const { w: w2, werk, u: u2 } = werkstatt(STD, 1500);
  issue(w2, { type: 'umruesten', player: 0, id: u2.id, slot: 1, modul: 'rradar' });
  step(w2);
  const m = w2.players[0].masse;
  werk.dead = true;
  lauf(w2, 5);
  assert.equal(u2.umruest, undefined);
  assert.equal(w2.players[0].masse, m);
});

test('Umruesten: eine begonnene Arbeit endet auch, wenn die Werkstatt faellt', () => {
  const { w, werk, u } = werkstatt();
  issue(w, { type: 'umruesten', player: 0, id: u.id, slot: 1, modul: 'rkran' });
  lauf(w, 3);
  assert.ok(u.umruest.bis);
  werk.hp = 0;
  werk.dead = true;
  lauf(w, 40);
  assert.equal(u.type, 'rrumpf|rkanone|rkran');
});

test('Hash und Spielstand: Varianten und ein laufendes Umruesten sind Teil des Zustands, ein geladener Stand laeuft bitgleich weiter', () => {
  const bauen = () => {
    const { w, u } = werkstatt(STD, 600);
    spawnUnit(w, 0, H, 3500, 3500); // eine Variante gleich zu Beginn
    issue(w, { type: 'umruesten', player: 0, id: u.id, slot: 1, modul: 'rradar' });
    return { w, u };
  };
  // Der Hash unterscheidet Standard und Variante
  const a = neu(3);
  const b = neu(3);
  spawnUnit(a, 0, STD, 3500, 3500);
  spawnUnit(b, 0, H, 3500, 3500);
  assert.notEqual(hash(a), hash(b));
  // Zweimal dasselbe, gleicher Hash
  const l1 = bauen();
  const l2 = bauen();
  lauf(l1.w, 200);
  lauf(l2.w, 200);
  assert.equal(hash(l1.w), hash(l2.w));
  // Sichern mitten im Umruesten, danach in einem "neuen Lauf" laden (die Variante gibt es dort noch nicht)
  const l3 = bauen();
  lauf(l3.w, 40);
  assert.ok(l3.u.umruest.bis > l3.w.tick, 'mitten im Umruesten');
  const stand = JSON.stringify(zustandSichern(l3.w, []));
  for (const k of Object.keys(UNITS)) if (k.startsWith('rrumpf|')) delete UNITS[k];
  const geladen = zustandLaden(JSON.parse(stand)).world;
  assert.ok(UNITS[H], 'die Variante wurde aus dem Stand neu abgeleitet');
  assert.equal(hash(geladen), hash(l3.w));
  lauf(l3.w, 100);
  lauf(geladen, 100);
  assert.equal(hash(geladen), hash(l3.w));
  assert.equal(byId(geladen, l3.u.id).type, 'rrumpf|rkanone|rradar');
});

test('Skills mit nur: [Rumpf] wirken auch auf Varianten des Rumpfs', () => {
  SKILLS.rtestskill = { faction: V, ast: 'einheiten', name: 'T', desc: '', kosten: 1, wirkung: { schaden: 100 }, nur: ['rrumpf'] };
  try {
    const w = neu();
    w.players[0].gelernt.push('rtestskill');
    assert.equal(bonus(w, 0, 'schaden', STD), 100);
    assert.equal(bonus(w, 0, 'schaden', H), 100);
    assert.equal(bonus(w, 0, 'schaden', 'rleicht'), 0);
  } finally {
    delete SKILLS.rtestskill;
  }
});

test('KI: ein Volk mit Rumpf in der Fabrik bildet die Standardbestueckung aus, die Partie ist deterministisch', () => {
  const partie = () => {
    const w = createWorld({ seed: 9, factions: [V, 'mensch'] });
    const ais = [createAI(0, 9, 'standard'), createAI(1, 10, 'standard')];
    const gesehen = {};
    for (let t = 0; t < 9000 && !w.over; t++) {
      for (const a of ais) stepAI(a, w);
      step(w);
      if (t % 100 === 0) for (const e of w.entities) if (e.player === 0 && e.kind === 'unit') gesehen[e.type] = 1;
    }
    return { h: hash(w), gesehen };
  };
  const a = partie();
  const b = partie();
  assert.equal(a.h, b.h);
  assert.ok(a.gesehen[STD], 'die KI bildet den Rumpf aus');
  assert.deepEqual(Object.keys(a.gesehen).filter((k) => k.includes('|')), [], 'nur Standardbestueckung');
});

test('Datenpruefung: FELDER kennt die Felder, Schluessel der Varianten enthalten kein Feld des Rumpfs doppelt', () => {
  for (const f of ['slots', 'bestueckung']) assert.ok(FELDER.einheit.includes(f));
  assert.ok(FELDER.gebaeude.includes('umruesten'));
  for (const m of Object.values(T_MODULE)) for (const k of Object.keys(m)) assert.ok(FELDER.modul.includes(k), k);
  assert.deepEqual(FELDER.groesse, ['klein', 'gross']);
});

test('Oberflaeche: Karten, Auswahlkopf und Kodex kennen Rumpf, Module und Umruesten', () => {
  const w = neu();
  const werk = spawnBuilding(w, 0, 'rwerk', 4500, 3000, true);
  const u = spawnUnit(w, 0, H, werk.x - 100, werk.y);
  assert.doesNotThrow(() => einheitKarte(w, 0, STD));
  const karte = einheitKarte(w, 0, H);
  assert.ok(/Haubitze/.test(karte) && /Radar/.test(karte), 'Bestueckung steht auf der Karte');
  assert.ok(/Steckplatz|Bestückung/.test(karte));
  issue(w, { type: 'umruesten', player: 0, id: u.id, slot: 1, modul: 'rkran' });
  lauf(w, 3);
  assert.ok(/rüstet um/.test(auswahlKopf(w, u)));
  assert.doesNotThrow(() => gruppenHtml(w, [u.id]));
  const el = { innerHTML: '', querySelector: () => null };
  assert.doesNotThrow(() => kodexZeigen(el, () => {}, V, null));
  assert.ok(el.innerHTML.includes('Testrumpf') && el.innerHTML.includes('Haubitze'), 'Kodex nennt Rumpf und Module');
  assert.ok(!el.innerHTML.includes('Testrumpf (') && !el.innerHTML.includes('data-kodex="rrumpf|'), 'Varianten stehen nicht einzeln im Kodex');
  assert.doesNotThrow(() => kodexZeigen(el, () => {}, V, 'rhaubitze'));
});
