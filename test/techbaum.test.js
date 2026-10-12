// M6 Tech-Baum: neue Wirkungen im Skillbaum (tempo, reichweite, sicht, baukraft,
// regeneration) und das Feld nur: [typen], das jede Wirkung auf einzelne Typen
// beschraenkt. Die Volksdateien benutzen sie (noch) nicht -- Testtypen und
// Testskills werden zur Laufzeit eingetragen und am Ende wieder entfernt, gelernt
// wird ueber world.players[p].gelernt wie in test/grid.test.js.
//
// Radien bleiben unter dem groessten vorhandenen: die Nachbarsuche in sim.js
// rechnet GROESSTER_RADIUS einmal beim Laden aus.

import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import {
  createWorld, spawnUnit, spawnBuilding, step, hash, issue, bonus, waffenReichweite, reichweite, sichtweite, sichtGitter,
  foerderungProMin, unterhaltProMin, computeRegions, distributeGegenwart,
} from '../src/sim/sim.js';
import { sichtQuellen } from '../src/sim/kunde.js';
import { UNITS, BUILDINGS, SKILLS, RULES, AESTE } from '../src/sim/defs.js';
import { zustandSichern, zustandLaden } from '../src/spielstand.js';
import { skillWirkung, skillTiefe, skillStufen, skillBaumHtml, skillLinien, einheitKarte } from '../src/ui-gemeinsam.js';

const EINHEIT = (zusatz) => ({ name: 'Test', desc: '', faction: 'mensch', hp: 300, radius: 20, speed: 40, cost: { fron: 40 }, buildTime: 50, ...zusatz });
const SCHUETZE = (zusatz) => EINHEIT({ kampf: 'fern', weapon: { range: 400, damage: 20, cooldown: 5, ziele: 'beide' }, ...zusatz });
const GEBAEUDE = (zusatz) => ({ name: 'Testbau', desc: '', short: 'TST', faction: 'mensch', hp: 1000, radius: 30, cost: { fron: 100 }, buildTime: 50, ...zusatz });

const TEST_EINHEITEN = {
  ta: EINHEIT({}), // ohne alles, laeuft mit speed 40
  tb: EINHEIT({}), // dasselbe, zweiter Typ (fuer nur)
  tgegner: EINHEIT({ faction: 'gott', hp: 5000 }),
  tfern: SCHUETZE({}),
  tfern2: SCHUETZE({}),
  tun1: EINHEIT({ unterhalt: 60 }), // 60 Fron pro Minute
  tun2: EINHEIT({ unterhalt: 60 }),
  treg: EINHEIT({ regeneration: 60 }),
};
const TEST_GEBAEUDE = {
  tturm: GEBAEUDE({ kampf: 'fern', weapon: { range: 400, damage: 20, cooldown: 5, ziele: 'beide' } }),
  tbau: GEBAEUDE({ hp: 1000 }),
  tbaunetz: GEBAEUDE({ hp: 1000, gegenwartIn: 128 }), // Halle + Schmiede liefern 64: halb versorgt
  tfoerder: GEBAEUDE({ fronOut: 600 }),
  tfoerder2: GEBAEUDE({ fronOut: 600 }),
  tfabrik: GEBAEUDE({ buildList: ['ta', 'tb'] }),
  tsicht: GEBAEUDE({ sicht: 1000 }),
};
// Testskills: je einer pro Fall, ohne Voraussetzungen
const TEST_SKILLS = {};
const skill = (id, wirkung, nur) => {
  TEST_SKILLS[id] = { faction: 'mensch', ast: 'verbesserung', name: id, desc: '', kosten: 1, wirkung, ...(nur ? { nur } : {}) };
};
skill('s_tempo', { tempo: 500 });
skill('s_tempo_ta', { tempo: 500 }, ['ta']);
skill('s_tempo_300', { tempo: 300 });
skill('s_reichweite', { reichweite: 500 });
skill('s_reichweite_tfern', { reichweite: 500 }, ['tfern']);
skill('s_reichweite_tb', { reichweite: 500 }, ['tb']);
skill('s_sicht', { sicht: 500 });
skill('s_sicht_ta', { sicht: 500 }, ['ta', 'tsicht']);
skill('s_bau', { baukraft: 500 });
skill('s_bau_held', { baukraft: 500 }, ['held']);
skill('s_bau_bauer', { baukraft: 500 }, ['bauer']);
skill('s_reg', { regeneration: 60 });
skill('s_reg_ta', { regeneration: 60 }, ['ta']);
skill('s_reg_tbau', { regeneration: 60 }, ['tbau', 'tbaunetz']);
skill('s_schaden_tfern', { schaden: 500 }, ['tfern']);
skill('s_schutz_ta', { schutz: 500 }, ['ta']);
skill('s_unterhalt_tun1', { unterhalt: 500 }, ['tun1']);
skill('s_foerder_tfoerder', { foerderung: 500 }, ['tfoerder']);
skill('s_ausbildung_ta', { ausbildung: 1000 }, ['ta']); // gilt fuer die Einheit ta
skill('s_ausbildung_fabrik', { ausbildung: 1000 }, ['tfabrik']); // gilt fuer die Fabrik
skill('s_global_a', { tempo: 100 });
skill('s_global_b', { tempo: 50 });

Object.assign(UNITS, TEST_EINHEITEN);
Object.assign(BUILDINGS, TEST_GEBAEUDE);
Object.assign(SKILLS, TEST_SKILLS);
const SKILLS_EXTRA = []; // weitere Skills, die einzelne Tests eintragen
after(() => {
  for (const k of Object.keys(TEST_EINHEITEN)) delete UNITS[k];
  for (const k of Object.keys(TEST_GEBAEUDE)) delete BUILDINGS[k];
  for (const k of Object.keys(TEST_SKILLS)) delete SKILLS[k];
  for (const k of SKILLS_EXTRA) delete SKILLS[k];
  RULES.skills = true;
});

const bare = () => createWorld({ empty: true, factions: ['mensch', 'gott'] });
const schritte = (w, n) => {
  for (let i = 0; i < n; i++) step(w);
};
/** Einheit, die sich nicht bewegen kann (Wurzelgriff): bleibt, wo sie ist. */
const fest = (e) => {
  e.gebundenBis = 1e9;
  return e;
};
const lerne = (w, p, ...ids) => w.players[p].gelernt.push(...ids);

// ================================================================ bonus() und nur

test('bonus: ohne nur zaehlt fuer alle, mit nur nur fuer die genannten Typen', () => {
  const w = bare();
  lerne(w, 0, 's_tempo', 's_tempo_ta');
  assert.equal(bonus(w, 0, 'tempo', 'ta'), 1000, 'ta: beide');
  assert.equal(bonus(w, 0, 'tempo', 'tb'), 500, 'tb: nur das fuers ganze Volk');
  assert.equal(bonus(w, 0, 'tempo'), 500, 'ohne Typ: nur das fuers ganze Volk');
  assert.equal(bonus(w, 1, 'tempo', 'ta'), 0, 'der andere Spieler hat nichts');
  assert.equal(bonus(w, 0, 'reichweite', 'ta'), 0, 'andere Wirkung: nichts');
});

test('bonus: Skills ohne nur addieren sich; ein Skill mit nur zaehlt ohne Typ nie', () => {
  const w = bare();
  lerne(w, 0, 's_global_a', 's_global_b', 's_tempo_ta');
  assert.equal(bonus(w, 0, 'tempo'), 150);
  assert.equal(bonus(w, 0, 'tempo', 'tb'), 150);
  assert.equal(bonus(w, 0, 'tempo', 'ta'), 650);
});

test('bonus: zweiter Typ (Ausbildung: Fabrik und Einheit)', () => {
  const w = bare();
  lerne(w, 0, 's_ausbildung_ta');
  assert.equal(bonus(w, 0, 'ausbildung', 'tfabrik', 'ta'), 1000, 'Einheit steht in nur');
  assert.equal(bonus(w, 0, 'ausbildung', 'tfabrik', 'tb'), 0);
  assert.equal(bonus(w, 0, 'ausbildung', 'tfabrik'), 0);
  const v = bare();
  lerne(v, 0, 's_ausbildung_fabrik');
  assert.equal(bonus(v, 0, 'ausbildung', 'tfabrik', 'tb'), 1000, 'Fabrik steht in nur');
});

test('bonus: RULES.skills aus -- keine Wirkung', () => {
  const w = bare();
  lerne(w, 0, 's_tempo');
  RULES.skills = false;
  try {
    assert.equal(bonus(w, 0, 'tempo', 'ta'), 0);
  } finally {
    RULES.skills = true;
  }
});

// ================================================================ Tempo

/** Wie weit lief die Einheit im dritten Tick nach dem Befehl (dm)? Optional gebremst (langsam) oder im Ansturm. */
function tempoSchritt(typ, gelernt, langsam = 0, ansturm = 0) {
  const w = bare();
  lerne(w, 0, ...gelernt);
  const u = spawnUnit(w, 0, typ, 2000, 5000);
  issue(w, { type: 'move', player: 0, ids: [u.id], x: 9000, y: 5000 });
  if (langsam) {
    u.langsamBis = 1e9;
    u.langsamWert = langsam;
  }
  if (ansturm) {
    u.tempoBis = 1e9;
    u.tempoWert = ansturm;
  }
  schritte(w, 2);
  const x = u.x;
  step(w);
  return u.x - x;
}

test('Tempo: +500 Promille -- 40 dm je Tick werden 60', () => {
  assert.equal(tempoSchritt('ta', []), 40);
  assert.equal(tempoSchritt('ta', ['s_tempo']), 60);
});

test('Tempo nur: wirkt auf den genannten Typ, nicht auf den anderen', () => {
  assert.equal(tempoSchritt('ta', ['s_tempo_ta']), 60);
  assert.equal(tempoSchritt('tb', ['s_tempo_ta']), 40);
});

test('Tempo: addiert sich zu Ansturm und Bremse, nie unter 20 % des Grundtempos', () => {
  assert.equal(tempoSchritt('ta', ['s_tempo_300'], 800), 20, '1000 + 300 - 800 = 500 Promille von 40');
  assert.equal(tempoSchritt('ta', ['s_tempo_300'], 0, 200), 60, 'Ansturm +200 und Skill +300: 1500');
  assert.equal(tempoSchritt('ta', ['s_global_b'], 1000), 8, 'nie unter 20 %: 40 * 200 / 1000');
});

// ================================================================ Reichweite

/** Trifft ein Schuetze (Typ typ) ein festes Ziel im Abstand abstand (Mitte zu Mitte)? */
function trifftAuf(typ, abstand, gelernt) {
  const w = bare();
  lerne(w, 0, ...gelernt);
  fest(spawnUnit(w, 0, typ, 5000, 5000));
  const z = fest(spawnUnit(w, 1, 'tgegner', 5000 + abstand, 5000));
  schritte(w, 3);
  return z.hp < z.maxHp;
}

test('Reichweite: +500 Promille auf 400 -- der Schuss reicht 200 dm weiter', () => {
  // Mitte zu Mitte: Reichweite plus beide Radien (20 + 20)
  assert.ok(!trifftAuf('tfern', 500, []), '400 + 40 = 440: bei 500 nichts');
  assert.ok(trifftAuf('tfern', 440, []));
  assert.ok(trifftAuf('tfern', 500, ['s_reichweite']), '600 + 40');
  assert.ok(!trifftAuf('tfern', 650, ['s_reichweite']));
  assert.ok(trifftAuf('tfern', 640, ['s_reichweite']));
});

test('Reichweite nur: wirkt auf den genannten Typ, nicht auf den anderen', () => {
  assert.ok(trifftAuf('tfern', 500, ['s_reichweite_tfern']));
  assert.ok(!trifftAuf('tfern2', 500, ['s_reichweite_tfern']));
  assert.ok(!trifftAuf('tfern', 500, ['s_reichweite_tb']), 'ein Skill fuer andere Typen aendert nichts');
});

test('Reichweite: Tuerme (Gebaeude mit Waffe) auch', () => {
  const trifft = (gelernt) => {
    const w = bare();
    lerne(w, 0, ...gelernt);
    spawnBuilding(w, 0, 'tturm', 5000, 5000, true);
    const z = fest(spawnUnit(w, 1, 'tgegner', 5000 + 500, 5000)); // Reichweite 400 + 30 + 20 = 450
    schritte(w, 3);
    return z.hp < z.maxHp;
  };
  assert.ok(!trifft([]));
  assert.ok(trifft(['s_reichweite']));
});

test('Reichweite: reichweite() und waffenReichweite() rechnen ganzzahlig, ohne Skill die Grundwerte', () => {
  const w = bare();
  const s = spawnUnit(w, 0, 'tfern', 5000, 5000);
  const z = spawnUnit(w, 1, 'tgegner', 6000, 5000);
  assert.equal(waffenReichweite(w, s), 400);
  assert.equal(reichweite(s, z), 440);
  assert.equal(reichweite(s, z, w), 440);
  lerne(w, 0, 's_reichweite');
  assert.equal(waffenReichweite(w, s), 600);
  assert.equal(reichweite(s, z, w), 640);
  assert.equal(reichweite(s, z), 440, 'ohne world immer die Grundreichweite');
  const v = bare();
  lerne(v, 0, 's_global_a'); // kein Reichweite-Skill
  assert.equal(waffenReichweite(v, spawnUnit(v, 0, 'tfern', 5000, 5000)), 400);
});

test('Reichweite: ein gezielter Angriff bleibt erst in der groesseren Reichweite stehen', () => {
  const abstandAmEnde = (gelernt) => {
    const w = bare();
    lerne(w, 0, ...gelernt);
    const s = spawnUnit(w, 0, 'tfern', 3000, 5000);
    const z = fest(spawnUnit(w, 1, 'tgegner', 6000, 5000));
    s.ziel = z.id; // gezielter Angriff
    schritte(w, 120);
    return z.x - s.x;
  };
  const ohne = abstandAmEnde([]);
  const mit = abstandAmEnde(['s_reichweite']);
  assert.ok(ohne <= 430 && ohne > 380, `ohne Skill steht er knapp vor 440 (${ohne})`);
  assert.ok(mit <= 630 && mit > 580, `mit Skill knapp vor 640 (${mit})`);
});

// ================================================================ Sicht

test('Sicht: sichtweite(e, world) legt die Wirkung auf die Grundsicht, ohne world bleibt sie', () => {
  const w = bare();
  const a = spawnUnit(w, 0, 'ta', 5000, 5000);
  assert.equal(sichtweite(a), 900);
  assert.equal(sichtweite(a, w), 900);
  lerne(w, 0, 's_sicht');
  assert.equal(sichtweite(a, w), 1350, '900 + 50 %');
  assert.equal(sichtweite(a), 900);
  const v = bare();
  lerne(v, 0, 's_sicht_ta');
  assert.equal(sichtweite(spawnUnit(v, 0, 'ta', 5000, 5000), v), 1350);
  assert.equal(sichtweite(spawnUnit(v, 0, 'tb', 5000, 5000), v), 900, 'nur fuer ta');
});

test('Sicht: Gebaeude mit eigener Sicht, Baustellen, und der andere Spieler sieht nicht mehr', () => {
  const w = bare();
  lerne(w, 0, 's_sicht_ta');
  const turm = spawnBuilding(w, 0, 'tsicht', 5000, 5000, true);
  const site = spawnBuilding(w, 0, 'tsicht', 7000, 5000, false);
  assert.equal(sichtweite(turm, w), 1500, '1000 + 50 %');
  assert.equal(sichtweite(site, w), 600, 'Baustelle 400 + 50 %');
  const gegner = spawnUnit(w, 1, 'tgegner', 5000, 5000);
  assert.equal(sichtweite(gegner, w), 900);
});

test('Sicht: das Sichtfeld und die Sichtquellen der Kunde wachsen mit', () => {
  const zaehle = (g) => g.reduce((s, z) => s + z, 0);
  const w = bare();
  const u = spawnUnit(w, 0, 'ta', 8000, 8000);
  const vorher = zaehle(sichtGitter(w, 0));
  assert.deepEqual(sichtQuellen(w, 0), [u.x, u.y, 900]);
  lerne(w, 0, 's_sicht');
  assert.ok(zaehle(sichtGitter(w, 0)) > vorher * 2, 'Kreis mit 1,5-fachem Radius: gut doppelt so viele Zellen');
  assert.deepEqual(sichtQuellen(w, 0), [u.x, u.y, 1350]);
});

// ================================================================ Baukraft

/** Baufortschritt, den die Baustelle im vierten Tick mit Erbauer typ bekommt. */
function bauSchritt(typ, gelernt) {
  const w = bare();
  lerne(w, 0, ...gelernt);
  spawnBuilding(w, 0, 'grenzstein', 15000, 15000, true);
  spawnBuilding(w, 0, 'schmiede', 15800, 15000, true);
  const b = spawnBuilding(w, 0, 'kaserne', 16600, 15600, false);
  const u = spawnUnit(w, 0, typ, b.x + BUILDINGS[b.type].radius + UNITS[typ].radius + 20, b.y);
  issue(w, { type: 'bauen', player: 0, ids: [u.id], id: b.id });
  schritte(w, 3);
  const p = b.progress;
  step(w);
  return b.progress - p;
}

test('Baukraft: +500 Promille -- der Kommandant baut mit 1500 statt 1000', () => {
  assert.equal(bauSchritt('held', []), 1000);
  assert.equal(bauSchritt('held', ['s_bau']), 1500);
});

test('Baukraft nur: wirkt auf den genannten Erbauer, nicht auf den anderen', () => {
  const kraft = UNITS.bauer.build.power;
  assert.equal(bauSchritt('held', ['s_bau_held']), 1500);
  assert.equal(bauSchritt('held', ['s_bau_bauer']), 1000);
  assert.equal(bauSchritt('bauer', []), kraft);
  assert.equal(bauSchritt('bauer', ['s_bau_bauer']), kraft + (((kraft * 500) / 1000) | 0));
  assert.equal(bauSchritt('bauer', ['s_bau_held']), kraft);
});

test('Baukraft: auch das Reparieren geht schneller', () => {
  const repariere = (gelernt) => {
    const w = bare();
    lerne(w, 0, ...gelernt);
    const b = spawnBuilding(w, 0, 'grenzstein', 15000, 15000, true);
    b.hp = 100;
    const u = spawnUnit(w, 0, 'held', b.x + BUILDINGS[b.type].radius + UNITS.held.radius + 20, b.y);
    issue(w, { type: 'bauen', player: 0, ids: [u.id], id: b.id });
    schritte(w, 50);
    return b.hp - 100;
  };
  const ohne = repariere([]);
  const mit = repariere(['s_bau']);
  assert.ok(ohne > 0, 'es wird repariert');
  assert.ok(mit > ohne, `mit Skill mehr (${mit} gegen ${ohne})`);
});

// ================================================================ Regeneration

test('Regeneration: +60 LP/min heilen 1 LP je 10 Ticks, absolut -- auch ohne eigene Regeneration', () => {
  const w = bare();
  lerne(w, 0, 's_reg');
  const u = fest(spawnUnit(w, 0, 'ta', 5000, 5000));
  u.hp = 100;
  schritte(w, 9);
  assert.equal(u.hp, 100);
  step(w);
  assert.equal(u.hp, 101);
  schritte(w, 590);
  assert.equal(u.hp, 160, 'eine Minute: 60 LP');
});

test('Regeneration: addiert sich zur eigenen der Einheit, nie ueber maxHp', () => {
  const w = bare();
  lerne(w, 0, 's_reg');
  const u = fest(spawnUnit(w, 0, 'treg', 5000, 5000));
  u.hp = 100;
  schritte(w, 100);
  assert.equal(u.hp, 120, '60 + 60 LP/min: 2 LP je 10 Ticks');
  u.hp = u.maxHp - 3;
  schritte(w, 200);
  assert.equal(u.hp, u.maxHp);
});

test('Regeneration nur: wirkt auf den genannten Typ und nur fuer den eigenen Spieler', () => {
  const w = bare();
  lerne(w, 0, 's_reg_ta');
  const a = fest(spawnUnit(w, 0, 'ta', 5000, 5000));
  const b = fest(spawnUnit(w, 0, 'tb', 5100, 5000));
  a.hp = b.hp = 100;
  schritte(w, 100);
  assert.equal(a.hp, 110);
  assert.equal(b.hp, 100, 'tb nicht');
  const g = bare();
  const gegner = fest(spawnUnit(g, 1, 'tgegner', 5000, 5000));
  gegner.hp = 100;
  lerne(g, 0, 's_reg');
  schritte(g, 100);
  assert.equal(gegner.hp, 100, 'der andere Spieler nicht');
});

test('Regeneration: Gebaeude nur versorgt (anteilig), eine Baustelle gar nicht', () => {
  const w = bare();
  lerne(w, 0, 's_reg_tbau');
  const frei = spawnBuilding(w, 0, 'tbau', 3000, 3000, true);
  const baustelle = spawnBuilding(w, 0, 'tbau', 3300, 3000, false);
  frei.hp = 500;
  baustelle.hp = 50;
  schritte(w, 100);
  assert.equal(frei.hp, 510, 'ohne Bedarf voll versorgt: 60 LP/min');
  assert.equal(baustelle.hp, 50, 'Baustelle regeneriert nicht');
  // mit Bedarf und halber Versorgung: halb so viel
  const v = bare();
  lerne(v, 0, 's_reg_tbau');
  spawnBuilding(v, 0, 'halle', 3000, 3000, true);
  spawnBuilding(v, 0, 'schmiede', 3000, 3600, true);
  const halb = spawnBuilding(v, 0, 'tbaunetz', 3600, 3000, true);
  halb.hp = 500;
  computeRegions(v);
  distributeGegenwart(v);
  schritte(v, 200);
  assert.ok(halb.powered > 400 && halb.powered < 600, `halb versorgt (${halb.powered})`);
  assert.ok(halb.hp > 500 && halb.hp <= 520, `etwa halb so schnell (${halb.hp})`);
});

// ================================================================ die bisherigen Wirkungen mit nur

test('Schaden nur: +500 Promille nur fuer den genannten Schuetzen', () => {
  const schaden = (typ) => {
    const w = bare();
    lerne(w, 0, 's_schaden_tfern');
    fest(spawnUnit(w, 0, typ, 5000, 5000));
    const z = fest(spawnUnit(w, 1, 'tgegner', 5300, 5000));
    step(w);
    return z.maxHp - z.hp;
  };
  assert.equal(schaden('tfern'), 30);
  assert.equal(schaden('tfern2'), 20);
});

test('Schutz nur: nimmt weniger Schaden nur der genannte Typ', () => {
  const genommen = (typ) => {
    const w = bare();
    lerne(w, 0, 's_schutz_ta');
    const z = fest(spawnUnit(w, 0, typ, 5300, 5000));
    fest(spawnUnit(w, 1, 'tfern', 5000, 5000)); // der Gegner schiesst: 20 Schaden
    step(w);
    return z.maxHp - z.hp;
  };
  assert.equal(genommen('ta'), 10, '20 Schaden, halbiert');
  assert.equal(genommen('tb'), 20);
});

test('Unterhalt nur: Ersparnis nur fuer den genannten Typ', () => {
  const kosten = (typ) => {
    const w = bare();
    lerne(w, 0, 's_unterhalt_tun1');
    w.players[0].fron = 10000;
    spawnUnit(w, 0, typ, 3000, 3000);
    schritte(w, 600);
    return 10000 - w.players[0].fron;
  };
  assert.equal(kosten('tun1'), 30, '60 Fron/min, halbiert');
  assert.equal(kosten('tun2'), 60);
  const w = bare();
  lerne(w, 0, 's_unterhalt_tun1');
  spawnUnit(w, 0, 'tun1', 3000, 3000);
  spawnUnit(w, 0, 'tun2', 3100, 3000);
  assert.equal(unterhaltProMin(w, 0), 90);
});

test('Foerderung nur: mehr Fron nur aus dem genannten Foerderbau', () => {
  const fron = (typ) => {
    const w = bare();
    lerne(w, 0, 's_foerder_tfoerder');
    w.players[0].fron = 0;
    spawnBuilding(w, 0, typ, 3000, 3000, true);
    schritte(w, 600);
    return w.players[0].fron;
  };
  assert.equal(fron('tfoerder'), 900);
  assert.equal(fron('tfoerder2'), 600);
  const w = bare();
  lerne(w, 0, 's_foerder_tfoerder');
  spawnBuilding(w, 0, 'tfoerder', 3000, 3000, true);
  spawnBuilding(w, 0, 'tfoerder2', 3500, 3000, true);
  step(w);
  assert.equal(foerderungProMin(w, 0), 900 + 600);
});

test('Ausbildung nur: schneller fuer die genannte Einheit bzw. Fabrik', () => {
  const fortschritt = (einheit, gelernt) => {
    const w = bare();
    lerne(w, 0, ...gelernt);
    const f = spawnBuilding(w, 0, 'tfabrik', 3000, 3000, true);
    issue(w, { type: 'produce', player: 0, id: f.id, unit: einheit });
    step(w);
    return f.queueProgress;
  };
  assert.equal(fortschritt('ta', []), 1000);
  assert.equal(fortschritt('ta', ['s_ausbildung_ta']), 2000);
  assert.equal(fortschritt('tb', ['s_ausbildung_ta']), 1000, 'tb nicht');
  assert.equal(fortschritt('tb', ['s_ausbildung_fabrik']), 2000, 'die Fabrik schon');
});

// ================================================================ Determinismus und Spielstand

function langeLage() {
  const w = bare();
  lerne(w, 0, 's_tempo_ta', 's_reichweite_tfern', 's_sicht', 's_bau_held', 's_reg_ta', 's_schaden_tfern', 's_unterhalt_tun1');
  lerne(w, 1, 's_global_a');
  spawnBuilding(w, 0, 'halle', 3000, 3000, true);
  const ta = spawnUnit(w, 0, 'ta', 3300, 3000);
  ta.hp = 100;
  spawnUnit(w, 0, 'tfern', 3400, 3100);
  spawnUnit(w, 0, 'tun1', 3500, 3100);
  spawnUnit(w, 1, 'tgegner', 4100, 3000);
  issue(w, { type: 'attack', player: 0, ids: w.entities.filter((e) => e.player === 0 && e.kind === 'unit').map((e) => e.id), x: 4100, y: 3000 });
  return w;
}

test('Determinismus: gleiche Lage mit Skills, gleicher Verlauf', () => {
  const a = langeLage();
  const b = langeLage();
  for (let t = 0; t < 300; t++) {
    step(a);
    step(b);
    assert.equal(hash(a), hash(b));
  }
});

test('Spielstand: mit Skills mitten im Gefecht gesichert laeuft bitgleich weiter', () => {
  const w = langeLage();
  schritte(w, 80);
  const geladen = zustandLaden(JSON.parse(JSON.stringify(zustandSichern(w, [null, null])))).world;
  assert.equal(hash(geladen), hash(w));
  for (let t = 0; t < 200; t++) {
    step(w);
    step(geladen);
    assert.equal(hash(geladen), hash(w));
  }
});

// ================================================================ Oberflaeche: Karten, Stufen, Linien

test('Karte: die neuen Wirkungen mit "nur fuer ..." und ohne', () => {
  assert.equal(skillWirkung(SKILLS.s_tempo), '+50 % Tempo');
  assert.equal(skillWirkung(SKILLS.s_tempo_ta), '+50 % Tempo — nur für Test');
  assert.equal(skillWirkung(SKILLS.s_reichweite), '+50 % Reichweite');
  assert.equal(skillWirkung(SKILLS.s_sicht), '+50 % Sicht');
  assert.equal(skillWirkung(SKILLS.s_bau), '+50 % Baukraft');
  assert.equal(skillWirkung(SKILLS.s_reg), '+60 LP/min Regeneration');
  assert.equal(skillWirkung(SKILLS.s_sicht_ta), '+50 % Sicht — nur für Test, Testbau');
  // bisherige Wirkungen: ohne nur wie gehabt, mit nur ohne "aller Einheiten"
  assert.equal(skillWirkung(SKILLS.klingen), '+10 % Schaden aller Einheiten');
  assert.equal(skillWirkung(SKILLS.s_schaden_tfern), '+50 % Schaden — nur für Test');
  assert.equal(skillWirkung(SKILLS.s_schutz_ta), '−50 % genommener Schaden — nur für Test');
  // mehrere Wirkungen in einem Skill: "nur für ..." einmal am Ende
  SKILLS_EXTRA.push('s_mehrere');
  SKILLS.s_mehrere = { faction: 'mensch', ast: 'verbesserung', name: 'Mehrere', desc: '', kosten: 1, wirkung: { tempo: 100, reichweite: 200 }, nur: ['ta', 'tb'] };
  assert.equal(skillWirkung(SKILLS.s_mehrere), '+10 % Tempo · +20 % Reichweite — nur für Test, Test');
});

test('Info-Karte: nennt Wirkungen aus dem Skillbaum, die fuer den Typ gelten', () => {
  const w = bare();
  assert.ok(!einheitKarte(w, 0, 'ta').includes('Skills'));
  lerne(w, 0, 's_tempo_ta', 's_reg_ta');
  const k = einheitKarte(w, 0, 'ta');
  assert.ok(k.includes('Tempo +50 %') && k.includes('Regeneration +60 LP/min'));
  assert.ok(!einheitKarte(w, 0, 'tb').includes('Skills'), 'tb: nichts');
});

/** ~28 Skills fuer das Volk: vier Aeste, Ketten bis Tiefe 4, auch Voraussetzungen ueber Aeste hinweg. */
function grosserBaum() {
  const ids = [];
  Object.keys(AESTE).forEach((ast, a) => {
    for (let k = 0; k < 7; k++) {
      const id = `g_${a}_${k}`;
      const braucht = k === 0 ? undefined : k < 3 ? [`g_${a}_0`] : k < 5 ? [`g_${a}_${k - 2}`] : [`g_${a}_${k - 1}`, `g_${(a + 1) % 4}_0`];
      SKILLS[id] = { faction: 'mensch', ast, name: id, desc: 'Beschreibung', kosten: 1, wirkung: { tempo: 100 }, ...(braucht ? { braucht } : {}) };
      ids.push(id);
      SKILLS_EXTRA.push(id);
    }
  });
  return ids;
}
const GROSSER_BAUM = grosserBaum();

test('Stufen: Tiefe der braucht-Kette, Stufe 0 zuerst, jeder Skill genau einmal', () => {
  assert.equal(skillTiefe('g_0_0'), 0);
  assert.equal(skillTiefe('g_0_1'), 1);
  assert.equal(skillTiefe('g_0_3'), 2, 'g_0_3 braucht g_0_1');
  assert.equal(skillTiefe('g_0_5'), 3, 'braucht g_0_4 (Tiefe 2) und g_1_0');
  assert.equal(skillTiefe('g_0_6'), 4);
  const stufen = skillStufen('mensch');
  for (const ast of Object.keys(AESTE)) {
    const folge = stufen[ast].map((s) => s.stufe);
    assert.deepEqual(folge, [...folge].sort((a, b) => a - b), `${ast}: aufsteigend`);
    assert.ok(stufen[ast].every((s) => s.ids.length > 0), `${ast}: keine leere Stufe`);
  }
  const gesehen = Object.values(stufen).flatMap((l) => l.flatMap((s) => s.ids));
  assert.equal(new Set(gesehen).size, gesehen.length, 'nichts doppelt');
  for (const id of GROSSER_BAUM) assert.ok(gesehen.includes(id), `${id} fehlt`);
  const null0 = stufen.einheiten.find((s) => s.stufe === 0).ids.filter((i) => i.startsWith('g_'));
  assert.deepEqual(null0, ['g_0_0']);
});

test('Stufen: ein Kreis in den Daten haengt nichts auf', () => {
  SKILLS.k_a = { faction: 'mensch', ast: 'verbesserung', name: 'A', desc: '', kosten: 1, braucht: ['k_b'] };
  SKILLS.k_b = { faction: 'mensch', ast: 'verbesserung', name: 'B', desc: '', kosten: 1, braucht: ['k_a'] };
  SKILLS_EXTRA.push('k_a', 'k_b');
  assert.ok(Number.isInteger(skillTiefe('k_a')));
  assert.ok(Number.isInteger(skillTiefe('k_b')));
});

test('Skillbaum: vier Spalten, Stufen darin, ein Knopf je Skill mit seinen Voraussetzungen', () => {
  const w = bare();
  const html = skillBaumHtml(w, 0);
  assert.equal((html.match(/<div class="ast">/g) || []).length, 4);
  assert.ok((html.match(/<div class="stufe">/g) || []).length >= 8, 'mehrere Stufen je Ast');
  assert.ok(html.includes('<svg class="linien"'));
  const alle = Object.values(SKILLS).filter((s) => s.faction === 'mensch').length;
  assert.equal((html.match(/data-skill="/g) || []).length, alle);
  assert.ok(html.includes('data-skill="g_0_5" data-braucht="g_0_4 g_1_0"'));
  assert.ok(alle >= 28, `mindestens 28 Skills: ${alle}`);
});

/** Attrappe eines DOM-Knopfes mit fester Lage, damit skillLinien messen kann. */
function knopf(id, braucht, x, y, gelernt = false) {
  return {
    dataset: { skill: id, braucht },
    classList: { contains: (k) => gelernt && k === 'gelernt' },
    getBoundingClientRect: () => ({ left: x, top: y, right: x + 100, bottom: y + 50, width: 100, height: 50 }),
  };
}

test('Linien: eine je Voraussetzung, gruen bei gelernter, seitlich bei gleicher Hoehe', () => {
  const knoepfe = [knopf('a', '', 0, 0, true), knopf('b', 'a', 0, 100), knopf('c', 'a b', 150, 100), knopf('d', 'c', 300, 100), knopf('x', 'gibtsnicht', 0, 300)];
  const svg = {
    attr: {},
    innerHTML: '',
    setAttribute(k, v) {
      this.attr[k] = v;
    },
  };
  const feld = { getBoundingClientRect: () => ({ left: 0, top: 0 }), querySelectorAll: () => knoepfe, scrollWidth: 450, scrollHeight: 400 };
  const el = { querySelector: (s) => (s === '.aeste' ? feld : s === '.linien' ? svg : null) };
  skillLinien(el);
  const pfade = [...svg.innerHTML.matchAll(/<path class="([^"]*)" d="([^"]+)"\/>/g)];
  assert.equal(pfade.length, 4, 'a->b, a->c, b->c, c->d; "gibtsnicht" zaehlt nicht');
  assert.equal(pfade.filter((p) => p[1] === 'ok').length, 2, 'beide Linien von a (gelernt) gruen');
  assert.ok(pfade[0][2].startsWith('M50 50 C'), 'von der Unterkante der Voraussetzung');
  assert.deepEqual(svg.attr, { width: 450, height: 400 });
  // ohne DOM: nichts, keine Ausnahme
  skillLinien({});
  skillLinien(null);
});
