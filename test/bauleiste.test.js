// M8 Bauleiste in Gruppen: Wirtschaft, Militaer, Besonderes -- abgeleitet aus
// den Rollen (FACTIONS[v].rollen), nicht aus eigenen Angaben. Die Volksdateien
// haben 9-10 Gebaeude; fuer ~19 werden Testgebaeude zur Laufzeit eingetragen
// und am Ende samt Rollen und Bauliste wiederhergestellt.

import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld } from '../src/sim/sim.js';
import { BUILDINGS, FACTIONS } from '../src/sim/defs.js';
import { BAU_GRUPPEN, bauGruppen, aktiveBauGruppe, naechsteBauGruppe, bauleisteHtml } from '../src/ui-gemeinsam.js';

const ROLLEN_VORHER = { ...FACTIONS.mensch.rollen };
const BAUTEN_VORHER = [...FACTIONS.mensch.bauten];

// Rolle -> Testtyp; dazu zwei Gebaeude ohne Rolle (volkseigen)
const TEST_ROLLEN = {
  umwandler: 'tumwandler', luftfabrik: 'tluftfabrik', werkstatt: 'twerkstatt', flak: 'tflak',
  schild: 'tschild', schlag: 'tschlag', abwehr: 'tabwehr',
};
const OHNE_ROLLE = ['tbesonderes1', 'tbesonderes2'];
const TEST_TYPEN = [...Object.values(TEST_ROLLEN), ...OHNE_ROLLE];

for (const t of TEST_TYPEN) {
  BUILDINGS[t] = { name: t, desc: '', short: 'TST', faction: 'mensch', hp: 100, radius: 20, cost: { fron: 10 }, buildTime: 50 };
}
after(() => {
  for (const t of TEST_TYPEN) delete BUILDINGS[t];
  for (const r of Object.keys(FACTIONS.mensch.rollen)) delete FACTIONS.mensch.rollen[r];
  Object.assign(FACTIONS.mensch.rollen, ROLLEN_VORHER);
  FACTIONS.mensch.bauten.length = 0;
  FACTIONS.mensch.bauten.push(...BAUTEN_VORHER);
});

/** Volle Bauliste des Menschen: die echten Gebaeude, dazu alle Testgebaeude hinten an. */
function vollerAusbau() {
  Object.assign(FACTIONS.mensch.rollen, TEST_ROLLEN);
  FACTIONS.mensch.bauten.length = 0;
  FACTIONS.mensch.bauten.push(...BAUTEN_VORHER, ...TEST_TYPEN);
}
function zuruecksetzen() {
  for (const r of Object.keys(TEST_ROLLEN)) delete FACTIONS.mensch.rollen[r];
  FACTIONS.mensch.bauten.length = 0;
  FACTIONS.mensch.bauten.push(...BAUTEN_VORHER);
}
const liste = (gruppen, schluessel) => (gruppen.find((g) => g.schluessel === schluessel) || { liste: [] }).liste;

test('echte Voelker: jedes Gebaeude in genau einer Gruppe, Reihenfolge wie in bauten, keine leere Gruppe', () => {
  for (const volk of ['mensch', 'gott', 'tod']) {
    const gr = bauGruppen(volk);
    assert.ok(gr.length >= 1);
    for (const g of gr) assert.ok(g.liste.length > 0, `${volk}: ${g.schluessel} leer`);
    const alle = gr.flatMap((g) => g.liste);
    assert.deepEqual([...alle].sort(), [...FACTIONS[volk].bauten].sort(), `${volk}: nichts fehlt, nichts doppelt`);
    for (const g of gr) {
      assert.deepEqual(g.liste, FACTIONS[volk].bauten.filter((t) => g.liste.includes(t)), `${volk}/${g.schluessel}: Reihenfolge wie in bauten`);
    }
  }
});

test('echte Voelker: Wirtschaft = Foerderung, Anker, Forschung, Posten; Militaer = Fabrik, Turm; Besonderes = Schreine', () => {
  const m = bauGruppen('mensch');
  assert.deepEqual(liste(m, 'wirtschaft'), ['schmiede', 'saege', 'grenzstein', 'schacht', 'skriptorium', 'spaehposten']);
  assert.deepEqual(liste(m, 'militaer'), ['kaserne', 'wachturm']);
  assert.deepEqual(liste(m, 'besonderes'), ['banner', 'kapelle']);
});

test('mit ~19 Gebaeuden: Rollen ordnen in die richtige Gruppe, ohne Rolle landet unter Besonderes', () => {
  vollerAusbau();
  try {
    const gr = bauGruppen('mensch');
    assert.deepEqual(gr.map((g) => g.schluessel), ['wirtschaft', 'militaer', 'besonderes']);
    // Wirtschaft: die echten sechs, dann der Umwandler
    assert.deepEqual(liste(gr, 'wirtschaft'), ['schmiede', 'saege', 'grenzstein', 'schacht', 'skriptorium', 'spaehposten', 'tumwandler']);
    // Militaer: Reihenfolge wie in bauten (Testtypen hinten in der Reihenfolge der Liste)
    assert.deepEqual(liste(gr, 'militaer'), ['kaserne', 'wachturm', 'tluftfabrik', 'twerkstatt', 'tflak']);
    assert.deepEqual(liste(gr, 'besonderes'), ['banner', 'kapelle', 'tschild', 'tschlag', 'tabwehr', 'tbesonderes1', 'tbesonderes2']);
    assert.equal(gr.flatMap((g) => g.liste).length, FACTIONS.mensch.bauten.length, 'nichts geht verloren');
    // jede Gruppe passt auf die Tasten 1-0
    for (const g of gr) assert.ok(g.liste.length <= 10);
  } finally {
    zuruecksetzen();
  }
});

test('Gruppe mit mehr als zehn Gebaeuden: Tasten nur fuer die ersten zehn, alle anklickbar', () => {
  vollerAusbau();
  const mehr = [];
  try {
    // zwoelf Gebaeude ohne Rolle -> alle unter Besonderes
    for (let i = 0; i < 12; i++) {
      const t = 'tviele' + i;
      BUILDINGS[t] = { ...BUILDINGS.tbesonderes1, name: t };
      mehr.push(t);
      FACTIONS.mensch.bauten.push(t);
    }
    const gr = bauGruppen('mensch');
    const bes = liste(gr, 'besonderes');
    assert.ok(bes.length > 10);
    const w = createWorld({ empty: true, factions: ['mensch', 'gott'] });
    const html = bauleisteHtml(w, 0, gr, 'besonderes');
    assert.equal((html.match(/data-b="/g) || []).length, bes.length, 'alle anklickbar');
    assert.equal((html.match(/<kbd>/g) || []).length, 10, 'Taste nur fuer die ersten zehn');
    assert.ok(html.includes('<kbd>0</kbd>'), 'der zehnte hat die 0');
  } finally {
    for (const t of mehr) delete BUILDINGS[t];
    zuruecksetzen();
  }
});

test('aktive Gruppe: unbekannter Schluessel faellt auf die erste; Tab geht reihum vor und zurueck', () => {
  const gr = bauGruppen('mensch');
  assert.equal(aktiveBauGruppe(gr, 'gibtesnicht'), gr[0]);
  assert.equal(aktiveBauGruppe(gr, 'militaer').schluessel, 'militaer');
  assert.equal(naechsteBauGruppe(gr, 'wirtschaft', 1), 'militaer');
  assert.equal(naechsteBauGruppe(gr, 'militaer', 1), 'besonderes');
  assert.equal(naechsteBauGruppe(gr, 'besonderes', 1), 'wirtschaft', 'reihum');
  assert.equal(naechsteBauGruppe(gr, 'wirtschaft', -1), 'besonderes', 'Shift+Tab von vorn nach hinten');
  assert.equal(naechsteBauGruppe(gr, 'unbekannt', 1), 'militaer', 'unbekannt zaehlt als erste');
  assert.equal(naechsteBauGruppe([], 'x', 1), 'x');
});

test('Bauleiste: Reiter nur bei mehr als einer Gruppe, die aktive ist markiert, 1-0 zaehlt in der Gruppe', () => {
  const w = createWorld({ empty: true, factions: ['mensch', 'gott'] });
  const gr = bauGruppen('mensch');
  const html = bauleisteHtml(w, 0, gr, 'militaer');
  assert.equal((html.match(/data-reiter="/g) || []).length, 3);
  assert.ok(html.includes('class="reiter-knopf aktiv" data-reiter="militaer"'));
  assert.ok(!html.includes('data-b="schmiede"'), 'nur die Gebaeude der aktiven Gruppe');
  assert.ok(html.includes('data-b="kaserne"') && html.includes('data-b="wachturm"'));
  assert.ok(html.indexOf('<kbd>1</kbd>') < html.indexOf('<kbd>2</kbd>'));
  assert.equal((html.match(/<kbd>/g) || []).length, 2);
  const einzeln = bauleisteHtml(w, 0, [gr[0]], 'wirtschaft');
  assert.ok(!einzeln.includes('data-reiter'), 'eine Gruppe: kein Reiter');
  assert.equal(bauleisteHtml(w, 0, [], 'wirtschaft'), '');
});

test('BAU_GRUPPEN: jede Rolle der Basis steht in hoechstens einer Gruppe', () => {
  const alle = BAU_GRUPPEN.flatMap((g) => g.rollen);
  assert.equal(new Set(alle).size, alle.length);
  for (const r of ['kraft', 'fron', 'blut', 'umwandler', 'anker', 'forschung', 'posten', 'fabrik', 'luftfabrik', 'werkstatt', 'turm', 'flak', 'zorn', 'wehr', 'schild', 'schlag', 'abwehr']) {
    assert.ok(alle.includes(r), `Rolle ${r} hat eine Gruppe`);
  }
});
