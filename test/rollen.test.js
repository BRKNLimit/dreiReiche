// R0 Rollen optional, KI robust (docs/umbau/pakete-sonnet.md). Pflicht sind nur
// anker, kraft, masse, resonit, fabrik, bauer, leicht; alles andere darf fehlen.
// Ein Testvolk mit nur diesen Rollen, ohne Skills und ohne Faehigkeiten wird
// zur Laufzeit aus den Menschen abgeleitet (eigene Typen, eigene Faction) und im
// after() wieder entfernt. Es spielt KI gegen KI und gegen einen untaetigen
// Menschen; die Oberflaechen-Helfer kommen mit ihm zurecht.

import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step, spawnBuilding } from '../src/sim/sim.js';
import { BUILDINGS, UNITS, FACTIONS, ROLLEN, SKILLS } from '../src/sim/defs.js';
import { createAI, stepAI } from '../src/sim/ai.js';
import {
  hatSkills, hatFaehigkeiten, rollenKlassen, ressourcenHtml, faehigkeitenHtml, skillBaumHtml, beobachterHtml,
  bauGruppen, bauleisteHtml, ausbildungsleisteHtml, gebaeudeKarte, einheitKarte, kodexZeigen, auswahlKopf,
} from '../src/ui-gemeinsam.js';

const V = 'testvolk';
const klon = (q, ueber = {}) => ({ ...structuredClone(q), faction: V, ...ueber });

// Gebaeude und Einheiten des Testvolks: Kopien der Menschen unter eigenem Namen
const T_GEBAEUDE = {
  thalle: klon(BUILDINGS.halle, { buildList: ['tbauer', 'tleicht'] }),
  tanker: klon(BUILDINGS.grenzstein),
  tkraft: klon(BUILDINGS.schmiede),
  tfron: klon(BUILDINGS.saege),
  tblut: klon(BUILDINGS.schacht),
  // Die Fabrik bildet mehr aus, als Rollen nennen: einen Fernkaempfer und einen
  // schweren Kaempfer (kostet Goetterblut) -- ohne Rolle fern/schwer
  tfabrik: klon(BUILDINGS.kaserne, { buildList: ['tleicht', 'tfern', 'tschwer'] }),
};
const T_EINHEITEN = {
  tbauer: klon(UNITS.bauer),
  tleicht: klon(UNITS.soldat),
  tfern: klon(UNITS.jaeger),
  tschwer: klon(UNITS.soeldner),
  tkdt: klon(UNITS.held),
};
const T_ROLLEN = { anker: 'tanker', kraft: 'tkraft', masse: 'tfron', resonit: 'tblut', fabrik: 'tfabrik', bauer: 'tbauer', leicht: 'tleicht' };
const T_VOLK = {
  name: 'Testvolk', color: '#88aacc', growth: { start: 2600, max: 2600, perTick: 0 }, kommandant: 'tkdt', haupt: 'thalle',
  kurz: 'Testvolk', bauten: ['tkraft', 'tfron', 'tanker', 'tfabrik', 'tblut'], faehigkeiten: [],
  rollen: T_ROLLEN, lernen: [],
};

Object.assign(BUILDINGS, T_GEBAEUDE);
Object.assign(UNITS, T_EINHEITEN);
FACTIONS[V] = T_VOLK;

// Mensch ohne einzelne freie Rollen (zweiter Test) -- danach wieder wie vorher
const ROLLEN_VORHER = { ...FACTIONS.mensch.rollen };
after(() => {
  for (const k of Object.keys(T_GEBAEUDE)) delete BUILDINGS[k];
  for (const k of Object.keys(T_EINHEITEN)) delete UNITS[k];
  delete FACTIONS[V];
  for (const r of Object.keys(FACTIONS.mensch.rollen)) delete FACTIONS.mensch.rollen[r];
  Object.assign(FACTIONS.mensch.rollen, ROLLEN_VORHER);
});

/** KI-Partie: Sitz 0 und 1 mit KI (oder null = untaetig), n Ticks oder bis zum Ende. */
function partie(fraktionen, kis, ticks, seed = 7) {
  const w = createWorld({ seed, factions: fraktionen });
  const ais = kis.map((k, i) => (k ? createAI(i, seed + i, k) : null));
  const gesehen = fraktionen.map(() => ({})); // je Sitz: welche Einheitentypen es je gab
  const gebaut = fraktionen.map(() => ({})); // je Sitz: welche Gebaeudetypen es je gab
  let spitze = fraktionen.map(() => 0); // je Sitz: groesstes Heer (bewaffnet, ohne Erbauer)
  for (let t = 0; t < ticks && !w.over; t++) {
    for (const a of ais) if (a) stepAI(a, w);
    step(w);
    if (t % 100 === 0) {
      const heer = fraktionen.map(() => 0);
      for (const e of w.entities) {
        if (e.dead) continue;
        if (e.kind === 'building') {
          gebaut[e.player][e.type] = (gebaut[e.player][e.type] || 0) + 1;
          continue;
        }
        if (e.kind !== 'unit') continue;
        gesehen[e.player][e.type] = (gesehen[e.player][e.type] || 0) + 1;
        const u = UNITS[e.type];
        if (u.weapon && !u.worker && !u.commander) heer[e.player]++;
      }
      spitze = spitze.map((s, i) => Math.max(s, heer[i]));
    }
  }
  return { w, ais, gesehen, gebaut, spitze };
}

test('ROLLEN: Pflicht sind genau Anker, Kraft, Foerderung, Blut, Fabrik, Erbauer und Leichte; der Rest ist frei', () => {
  assert.deepEqual(ROLLEN.gebaeude, ['anker', 'kraft', 'masse', 'resonit', 'fabrik']);
  assert.deepEqual(ROLLEN.einheit, ['bauer', 'leicht']);
  for (const r of ['turm', 'zorn', 'wehr', 'forschung', 'fern', 'schwer', 'belagerung']) assert.ok(ROLLEN.frei[r], `${r} ist frei`);
  assert.equal(ROLLEN.frei.turm, 'gebaeude');
  assert.equal(ROLLEN.frei.schwer, 'einheit');
});

test('Testvolk: nur Pflichtrollen, keine Skills, keine Faehigkeiten -- und die Spielwelt entsteht', () => {
  assert.deepEqual(Object.keys(FACTIONS[V].rollen).sort(), [...ROLLEN.gebaeude, ...ROLLEN.einheit].sort());
  assert.equal(Object.values(SKILLS).filter((s) => s.faction === V).length, 0);
  const w = createWorld({ seed: 1, factions: [V, 'mensch'] });
  assert.equal(w.players[0].faction, V);
  assert.ok(w.entities.some((e) => e.player === 0 && e.type === 'thalle'));
  assert.ok(w.entities.some((e) => e.player === 0 && e.type === 'tkdt'));
});

test('KI ohne freie Rollen: Testvolk gegen Mensch, 30 min -- Wirtschaft, Fabrik, Heer, Angriffe, kein Absturz', (t) => {
  const { w, ais, gesehen, spitze } = partie([V, 'mensch'], ['standard', 'standard'], 18000);
  t.diagnostic(`Tick ${w.tick}, Sieger ${w.winner}, Heer-Spitze ${spitze}, Wellen ${ais[0].welle}, Einheiten ${JSON.stringify(gesehen[0])}`);
  assert.ok(w.tick > 3000, 'die Partie laeuft');
  // Pflichtbauten stehen oder standen
  for (const t of ['tfron', 'tfabrik', 'tkraft', 'tanker']) {
    assert.ok(w.entities.some((e) => e.player === 0 && e.type === t) || w.over, `${t} gebaut`);
  }
  // Nie ein Turm, nie etwas, das das Volk nicht hat
  for (const e of w.entities) if (e.player === 0) assert.equal(UNITS[e.type]?.faction ?? BUILDINGS[e.type].faction, V, `${e.type} gehoert dem Testvolk`);
  assert.ok(spitze[0] >= 8, `die KI baut ein Heer (groesstes: ${spitze[0]})`);
  assert.ok(ais[0].welle >= 1, `die KI greift an (Wellen: ${ais[0].welle})`);
  // Das Heer besteht nicht nur aus der einen Pflichteinheit: Fern- und Schwerkaempfer ohne Rolle werden mitgemischt
  assert.ok(gesehen[0].tleicht > 0, 'Leichte');
  assert.ok(gesehen[0].tfern > 0, 'Fernkaempfer aus der Fabrik, obwohl keine Rolle');
});

test('KI ohne freie Rollen: zwei Testvoelker gegeneinander, 30 min -- ohne Haenger, mit Kampf', (t) => {
  const { w, ais, spitze } = partie([V, V], ['sturm', 'burg'], 18000, 11);
  t.diagnostic(`Tick ${w.tick}, Sieger ${w.winner}, Heer-Spitze ${spitze}, Wellen ${ais[0].welle}/${ais[1].welle}`);
  assert.ok(w.tick > 3000);
  assert.ok(spitze[0] >= 5 && spitze[1] >= 5, `beide bauen ein Heer (${spitze})`);
  // Gekaempft wurde: irgendwo fehlt Leben, oder jemand ist gefallen
  const verletzt = w.entities.some((e) => !e.dead && e.hp < e.maxHp && e.player >= 0);
  assert.ok(w.over || verletzt || ais[0].welle + ais[1].welle > 0, 'Kampf');
});

test('KI ohne freie Rollen gegen einen untaetigen Menschen: sie greift an und gewinnt', (t) => {
  const { w, ais } = partie([V, 'mensch'], ['sturm', null], 18000, 5);
  t.diagnostic(`Tick ${w.tick}, Sieger ${w.winner}, Wellen ${ais[0].welle}`);
  assert.ok(ais[0].welle >= 1, 'Welle');
  assert.ok(w.over, 'der untaetige Mensch geht in 30 min unter');
  assert.equal(w.winner, 0);
});

test('Mensch ohne Turm, Forschung, Schreine und Belagerung: die KI baut sie nicht und spielt sonst weiter', () => {
  for (const r of ['turm', 'forschung', 'zorn', 'wehr', 'belagerung']) delete FACTIONS.mensch.rollen[r];
  try {
    const { gebaut, spitze } = partie(['mensch', 'gott'], ['standard', 'standard'], 12000, 3);
    for (const t of ['wachturm', 'skriptorium', 'banner', 'kapelle']) assert.equal(gebaut[0][t], undefined, `${t} wurde nicht gebaut`);
    assert.ok(gebaut[0].kaserne && gebaut[0].saege, 'Fabrik und Foerderung schon');
    assert.ok(spitze[0] >= 6, 'Heer aus dem Rest');
  } finally {
    Object.assign(FACTIONS.mensch.rollen, ROLLEN_VORHER);
  }
});

test('Oberflaeche ohne Skills und Faehigkeiten: Glühbirne, T und Q/W/E-Leiste fehlen, der Rest geht', () => {
  assert.equal(hatSkills(V), false);
  assert.equal(hatFaehigkeiten(V), false);
  assert.equal(hatSkills('mensch'), true);
  assert.equal(hatFaehigkeiten('mensch'), true);
  assert.equal(rollenKlassen(V), 'ohne-skills ohne-faehigkeiten');
  assert.equal(rollenKlassen('mensch'), '');

  const w = createWorld({ seed: 2, factions: [V, 'mensch'] });
  const res = ressourcenHtml(w, 0);
  assert.ok(!/Skillpunkte/.test(res), 'keine Skillpunkte in der Leiste');
  assert.ok(/Energie/.test(res) && /Masse/.test(res), 'Energie und Masse bleiben');
  assert.ok(/Skillpunkte/.test(ressourcenHtml(w, 1)), 'der Mensch behaelt sie');
  assert.equal(faehigkeitenHtml(w, 0), '');
  assert.doesNotThrow(() => skillBaumHtml(w, 0));
  assert.ok(!/Skills<\/td>/.test(beobachterHtml(createWorld({ seed: 2, factions: [V, V] }))), 'Beobachter ohne Skill-Zeile');
  assert.ok(/Skills<\/td>/.test(beobachterHtml(w)), 'mit einem Volk mit Skills bleibt die Zeile');

  // Bauleiste und Ausbildung
  const gr = bauGruppen(V);
  assert.deepEqual(gr.flatMap((g) => g.liste).sort(), [...FACTIONS[V].bauten].sort());
  assert.ok(!/undefined/.test(bauleisteHtml(w, 0, gr, gr[0].schluessel)), 'Typen ohne Icon geben keinen Text "undefined" aus');
  const fab = spawnBuilding(w, 0, 'tfabrik', 4000, 4000, true);
  const hall = w.entities.find((e) => e.player === 0 && e.type === 'thalle');
  const ausb = ausbildungsleisteHtml(w, 0, [fab, hall]);
  assert.ok(/data-produce="tfern"/.test(ausb) && !/undefined/.test(ausb), 'Ausbildung zeigt die Einheiten der Fabrik, ohne Text "undefined"');

  // Info-Karten, Auswahlkopf und Kodex fuer jeden Typ des Volks
  for (const t of Object.keys(T_GEBAEUDE)) assert.doesNotThrow(() => gebaeudeKarte(w, 0, t), t);
  for (const t of Object.keys(T_EINHEITEN)) assert.doesNotThrow(() => einheitKarte(w, 0, t), t);
  for (const e of w.entities) if (e.player === 0) assert.doesNotThrow(() => auswahlKopf(w, e), e.type);
  const el = { innerHTML: '', querySelector: () => null };
  assert.doesNotThrow(() => kodexZeigen(el, () => {}, V, null));
  assert.ok(el.innerHTML.includes('Testvolk'));
  assert.doesNotThrow(() => kodexZeigen(el, () => {}, V, 'tfern'));
  assert.doesNotThrow(() => kodexZeigen(el, () => {}, V, 'thalle'));
});
