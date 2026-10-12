// R2 Feuerleitnetz: Eine Waffe zielt nur auf das, was ihr Spieler gerade sieht
// (RULES.feuerleitnetz). Testdaten (Artillerie, Spaeher, Ziele) werden zur
// Laufzeit in UNITS/BUILDINGS eingetragen und am Ende wieder entfernt.

import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import {
  createWorld, step, hash, issue, spawnUnit, spawnBuilding, sichtGitter, sichtweite,
} from '../src/sim/sim.js';
import { createAI, stepAI } from '../src/sim/ai.js';
import { UNITS, BUILDINGS, RULES, MAP } from '../src/sim/defs.js';
import { ZELLE } from '../src/sim/weg.js';
import { zustandSichern, zustandLaden } from '../src/spielstand.js';
import { einheitKarte, gebaeudeKarte } from '../src/ui-gemeinsam.js';

const EINHEIT = (zusatz) => ({ name: 'Test', desc: '', faction: 'mensch', hp: 400, radius: 20, speed: 40, cost: { masse: 40 }, buildTime: 50, ...zusatz });
// Artillerie: schiesst 1500 weit, sieht nur 600
const ARTI = { kampf: 'fern', sicht: 600, weapon: { range: 1500, damage: 50, cooldown: 5, ziele: 'boden' } };
const TEST_EINHEITEN = {
  fl_arti: EINHEIT({ ...ARTI }),
  fl_flaeche: EINHEIT({ ...ARTI, weapon: { ...ARTI.weapon, flaeche: { radius: 300, anteil: 500 } } }),
  fl_spaeher: EINHEIT({ sicht: 2000, speed: 0 }), // ohne Waffe, sieht weit
  fl_blinker: EINHEIT({ sicht: 300, speed: 0 }), // sieht nur nahe
  fl_ziel: EINHEIT({ faction: 'gott', hp: 100000 }),
  fl_lauf: EINHEIT({ faction: 'gott', hp: 100000, speed: 60 }),
};
const TEST_GEBAEUDE = {
  fl_turm: { name: 'Fernturm', desc: '', short: 'FT', faction: 'mensch', hp: 2000, radius: 30, cost: { masse: 100 }, buildTime: 50, sicht: 600, kampf: 'fern', weapon: { range: 1500, damage: 50, cooldown: 5, ziele: 'boden' } },
  fl_klotz: { name: 'Klotz', desc: '', short: 'KL', faction: 'gott', hp: 100000, radius: 300, cost: { masse: 100 }, buildTime: 50 },
};
Object.assign(UNITS, TEST_EINHEITEN);
Object.assign(BUILDINGS, TEST_GEBAEUDE);
const SCHALTER = RULES.feuerleitnetz;
after(() => {
  for (const k of Object.keys(TEST_EINHEITEN)) delete UNITS[k];
  for (const k of Object.keys(TEST_GEBAEUDE)) delete BUILDINGS[k];
  RULES.feuerleitnetz = SCHALTER;
});

const leer = (...f) => createWorld({ empty: true, factions: f.length ? f : ['mensch', 'gott'] });
const schritte = (w, n) => {
  for (let i = 0; i < n; i++) step(w);
};
/** Verlorene Lebenspunkte */
const schaden = (e) => e.maxHp - e.hp;
const zelleVon = (x, y) => ((y / ZELLE) | 0) * (MAP / ZELLE) + ((x / ZELLE) | 0);

/** Das Gitter, Zelle fuer Zelle gemessen -- wie es vor dem zeilenweisen Fuellen war. */
function gitterLangsam(world, player) {
  const n = MAP / ZELLE;
  const g = new Uint8Array(n * n);
  for (const e of world.entities) {
    if (e.dead || e.player !== player) continue;
    const r = sichtweite(e, world);
    for (let cy = 0; cy < n; cy++) {
      for (let cx = 0; cx < n; cx++) {
        const mx = cx * ZELLE + (ZELLE >> 1) - e.x;
        const my = cy * ZELLE + (ZELLE >> 1) - e.y;
        if (mx * mx + my * my <= r * r) g[cy * n + cx] = 1;
      }
    }
  }
  return g;
}

test('Sichtgitter: das zeilenweise Fuellen trifft genau dieselben Zellen wie das Messen jeder Zelle', () => {
  const w = leer('mensch', 'gott');
  // Mitten auf der Karte, an Rand und Ecken, auf Zellgrenzen, Baustellen, grosse und kleine Sicht
  const orte = [[5000, 5000], [300, 300], [19700, 19700], [300, 19700], [200, 8000], [8100, 8100], [8000, 8000], [9999, 10001], [12345, 678]];
  for (let i = 0; i < orte.length; i++) {
    const [x, y] = orte[i];
    spawnUnit(w, 0, i % 2 ? 'fl_spaeher' : 'fl_arti', x, y);
    spawnBuilding(w, 0, i % 3 ? 'fl_turm' : 'fl_klotz', x + 40, y + 70, i % 2 === 0); // fertig und Baustelle (Sicht 400)
  }
  spawnUnit(w, 1, 'fl_spaeher', 10000, 10000);
  const a = sichtGitter(w, 0);
  const b = gitterLangsam(w, 0);
  assert.equal(a.length, b.length);
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) assert.fail(`Zelle ${i}: ${a[i]} statt ${b[i]}`);
  assert.deepEqual(sichtGitter(w, 1), gitterLangsam(w, 1));
  assert.ok(a.some((v) => v) && a.some((v) => !v));
});

test('Feuerleitnetz: Artillerie schiesst nicht ins Ungesehene, sobald ein Spaeher das Ziel sieht, schon', () => {
  const w = leer();
  const arti = spawnUnit(w, 0, 'fl_arti', 5000, 5000);
  const ziel = spawnUnit(w, 1, 'fl_ziel', 6200, 5000); // in Reichweite (1500), ausser Sicht (600)
  schritte(w, 60);
  assert.equal(schaden(ziel), 0, 'ohne Sicht kein Schuss');
  assert.equal(arti.x, 5000, 'und sie rueckt auch nicht vor: sie weiss von nichts');
  const spaeher = spawnUnit(w, 0, 'fl_spaeher', 5600, 5500); // sieht 2000 weit
  schritte(w, 20);
  assert.ok(schaden(ziel) > 0, 'der Spaeher sieht, die Artillerie schiesst');
  const nach = schaden(ziel);
  spaeher.dead = true;
  schritte(w, 20);
  assert.equal(schaden(ziel), nach, 'faellt der Spaeher, hoert das Feuer auf');
});

test('Feuerleitnetz: ein Turm mit Reichweite ueber der Sicht braucht ebenfalls einen Spaeher', () => {
  const w = leer();
  spawnBuilding(w, 0, 'fl_turm', 5000, 5000, true);
  const ziel = spawnUnit(w, 1, 'fl_ziel', 6300, 5000);
  schritte(w, 40);
  assert.equal(schaden(ziel), 0);
  spawnUnit(w, 0, 'fl_spaeher', 5000, 5400);
  schritte(w, 20);
  assert.ok(schaden(ziel) > 0);
});

test('Feuerleitnetz: nur das Sehen zaehlt, nicht das Schiessen -- ein Spaeher des Gegners hilft nicht', () => {
  const w = leer();
  spawnUnit(w, 0, 'fl_arti', 5000, 5000);
  const ziel = spawnUnit(w, 1, 'fl_ziel', 6200, 5000);
  spawnUnit(w, 1, 'fl_spaeher', 6200, 6000); // der Gegner sieht Artillerie und Ziel, das hilft ihr nicht
  schritte(w, 40);
  assert.equal(schaden(ziel), 0);
});

test('Feuerleitnetz: Zielwahl nimmt das Naechste unter den Gesehenen, nicht das Naechste ueberhaupt', () => {
  const w = leer();
  spawnUnit(w, 0, 'fl_arti', 5000, 5000);
  const nah = spawnUnit(w, 1, 'fl_ziel', 6000, 5000); // naeher, aber ungesehen
  const fern = spawnUnit(w, 1, 'fl_ziel', 6000, 5000 + 1000); // weiter weg ...
  spawnUnit(w, 0, 'fl_blinker', 6000, 6100); // ... und von einem Blinker gesehen (Sicht 300)
  schritte(w, 20);
  assert.equal(schaden(nah), 0);
  assert.ok(schaden(fern) > 0);
});

test('Feuerleitnetz: ein Gebaeude sieht man, sobald sein Rand in Sicht ist', () => {
  const w = leer();
  spawnUnit(w, 0, 'fl_arti', 5000, 5000);
  const klotz = spawnBuilding(w, 1, 'fl_klotz', 6500, 5000, true); // Radius 300: Mitte 1500 entfernt
  spawnUnit(w, 0, 'fl_blinker', 6500, 5500); // Sicht 300: erreicht den Rand (Mitte + 300 nach unten), nicht die Mitte
  assert.equal(sichtGitter(w, 0)[zelleVon(klotz.x, klotz.y)], 0, 'die Mitte liegt im Dunkeln');
  schritte(w, 20);
  assert.ok(schaden(klotz) > 0, 'der Rand genuegt');
});

test('Feuerleitnetz: gezielter Angriff verliert das Ziel aus der Sicht nicht, die Einheit geht zur letzten bekannten Stelle', () => {
  const w = leer();
  const arti = spawnUnit(w, 0, 'fl_arti', 5000, 5000);
  const spaeher = spawnUnit(w, 0, 'fl_spaeher', 5300, 5000);
  const ziel = spawnUnit(w, 1, 'fl_lauf', 9000, 5000); // 4000 entfernt, vom Spaeher aus 3700: ausser Sicht (2000)
  spaeher.x = 7500; // jetzt sieht der Spaeher das Ziel
  issue(w, { type: 'angreifen', player: 0, ids: [arti.id], id: ziel.id });
  schritte(w, 3);
  assert.equal(arti.ziel, ziel.id);
  assert.equal(arti.tx, ziel.x, 'solange gesehen, folgt sie dem Ziel');
  const letzte = [ziel.x, ziel.y];
  spaeher.dead = true; // Sicht weg ...
  ziel.tx = 9000;
  ziel.ty = 12000; // ... und das Ziel zieht ab
  ziel.arrived = false;
  schritte(w, 5);
  assert.equal(arti.ziel, ziel.id, 'der Auftrag bricht nicht ab');
  assert.deepEqual([arti.tx, arti.ty], letzte, 'sie kennt nur die letzte gesehene Stelle');
  const x0 = arti.x;
  schritte(w, 5);
  assert.ok(arti.x > x0, 'und geht hin');
  schritte(w, 400);
  assert.equal(arti.ziel, 0, 'dort angekommen und nichts zu sehen: der Auftrag ist zu Ende');
  assert.equal(arti.arrived, true);
  assert.deepEqual([arti.x, arti.y], letzte);
});

test('Feuerleitnetz: gezielter Angriff auf Ungesehenes laeuft los und schiesst, sobald die Einheit selbst sieht', () => {
  const w = leer();
  const arti = spawnUnit(w, 0, 'fl_arti', 3000, 5000);
  const ziel = spawnUnit(w, 1, 'fl_ziel', 7000, 5000);
  issue(w, { type: 'angreifen', player: 0, ids: [arti.id], id: ziel.id }); // Ziel und letzte Stelle gibt der Befehl
  schritte(w, 150);
  assert.ok(schaden(ziel) > 0, 'nach 4000 Entfernung: eigene Sicht 600, erst dann zielt sie');
  assert.equal(arti.ziel, ziel.id);
});

test('Feuerleitnetz: ein Flaechentreffer trifft am Einschlagort auch Ungesehenes, nur das Ziel braucht Sicht', () => {
  const w = leer();
  spawnUnit(w, 0, 'fl_flaeche', 4800, 5000);
  const a = spawnUnit(w, 1, 'fl_ziel', 6000, 5000);
  const b = spawnUnit(w, 1, 'fl_ziel', 6230, 5000); // 230 neben a, im Splash (300), ausser Sicht des Blinkers
  spawnUnit(w, 0, 'fl_blinker', 5900, 5000); // Sicht 300: sieht a (Zellmitte gut 220 entfernt), b liegt gut 410 entfernt
  const g = sichtGitter(w, 0);
  assert.equal(g[zelleVon(a.x, a.y)], 1);
  assert.equal(g[zelleVon(b.x, b.y)], 0);
  schritte(w, 1);
  assert.equal(schaden(a), 50);
  assert.equal(schaden(b), 25, 'die Haelfte, trotz fehlender Sicht');
  // Ohne a gibt es kein Ziel: b allein ist unsichtbar
  const v = leer();
  spawnUnit(v, 0, 'fl_flaeche', 4800, 5000);
  const b2 = spawnUnit(v, 1, 'fl_ziel', 6230, 5000);
  schritte(v, 30);
  assert.equal(schaden(b2), 0);
});

test('Feuerleitnetz aus: wie vor R2, auch Ungesehenes in Reichweite wird getroffen', () => {
  RULES.feuerleitnetz = false;
  try {
    const w = leer();
    spawnUnit(w, 0, 'fl_arti', 5000, 5000);
    const ziel = spawnUnit(w, 1, 'fl_ziel', 6200, 5000);
    schritte(w, 20);
    assert.ok(schaden(ziel) > 0);
    const v = leer();
    const arti = spawnUnit(v, 0, 'fl_arti', 3000, 5000);
    const z2 = spawnUnit(v, 1, 'fl_ziel', 7000, 5000);
    issue(v, { type: 'angreifen', player: 0, ids: [arti.id], id: z2.id });
    schritte(v, 3);
    assert.equal(arti.tx, z2.x, 'ohne Netz folgt sie dem Ziel auch im Dunkeln');
  } finally {
    RULES.feuerleitnetz = SCHALTER;
  }
});

test('Feuerleitnetz: sieht jeder alles, ist an und aus bitgleich (KI gegen KI)', () => {
  // Alles mit riesiger Sicht: dann darf der Schalter nichts aendern
  const alt = [];
  for (const t of [UNITS, BUILDINGS]) for (const k of Object.keys(t)) alt.push([t[k], t[k].sicht]);
  for (const [d] of alt) d.sicht = 30000;
  try {
    const lauf = (an) => {
      RULES.feuerleitnetz = an;
      const w = createWorld({ seed: 5, factions: ['mensch', 'gott'] });
      const ais = [createAI(0, 5, 'sturm'), createAI(1, 6, 'standard')];
      for (let t = 0; t < 3500; t++) {
        for (const a of ais) stepAI(a, w);
        step(w);
      }
      return hash(w);
    };
    assert.equal(lauf(true), lauf(false));
  } finally {
    for (const [d, s] of alt) {
      if (s === undefined) delete d.sicht;
      else d.sicht = s;
    }
    RULES.feuerleitnetz = SCHALTER;
  }
});

test('Feuerleitnetz: drei Spieler -- die Sicht gehoert jedem einzeln', () => {
  const w = createWorld({ empty: true, factions: ['mensch', 'gott', 'tod'], karte: 'dreiReiche' });
  const a0 = spawnUnit(w, 0, 'fl_arti', 5000, 5000);
  const a1 = spawnUnit(w, 1, 'fl_arti', 5000, 6600);
  const z = spawnUnit(w, 2, 'fl_ziel', 6000, 5800); // beide Artillerien haben es in Reichweite, keine sieht es
  schritte(w, 20);
  assert.equal(schaden(z), 0);
  spawnUnit(w, 0, 'fl_spaeher', 5000, 5100); // Spieler 0 sieht (Sicht 2000)
  assert.equal(sichtGitter(w, 0)[zelleVon(z.x, z.y)], 1);
  assert.equal(sichtGitter(w, 1)[zelleVon(z.x, z.y)], 0, 'Spieler 1 sieht dort weiter nichts');
  assert.equal(sichtGitter(w, 2)[zelleVon(z.x, z.y)], 1, 'der Besitzer sieht sich selbst');
  schritte(w, 1);
  assert.equal(schaden(z), 50, 'nur die Artillerie von Spieler 0 schiesst');
  assert.ok(a0.cooldown > 0);
  assert.equal(a1.cooldown, 0, 'Spieler 1 hat nichts gesehen und nicht geschossen');
});

test('Feuerleitnetz: Spielstand mitten im Gefecht (gezielter Angriff ins Dunkle) laeuft bitgenau weiter', () => {
  const baue = () => {
    const w = leer();
    const arti = spawnUnit(w, 0, 'fl_arti', 5000, 5000);
    const sp = spawnUnit(w, 0, 'fl_spaeher', 7500, 5000);
    const ziel = spawnUnit(w, 1, 'fl_lauf', 9000, 5000);
    spawnUnit(w, 1, 'fl_ziel', 7400, 5300);
    issue(w, { type: 'angreifen', player: 0, ids: [arti.id], id: ziel.id });
    schritte(w, 4);
    sp.dead = true; // das Ziel verschwindet aus der Sicht ...
    ziel.tx = 9000;
    ziel.ty = 14000;
    ziel.arrived = false;
    schritte(w, 30); // ... und die Artillerie ist unterwegs zur letzten Stelle
    return w;
  };
  const w = baue();
  assert.ok(w.entities.find((e) => e.type === 'fl_arti').ziel, 'mitten im Auftrag');
  const g = zustandLaden(JSON.parse(JSON.stringify(zustandSichern(w, [null, null])))).world;
  assert.equal(hash(g), hash(w));
  for (let t = 0; t < 400; t++) {
    step(w);
    step(g);
    assert.equal(hash(g), hash(w), `Tick ${w.tick}`);
  }
});

test('Feuerleitnetz: dieselben Befehle, dieselbe Partie -- zweimal gespielt, gleiche Summe', () => {
  const lauf = () => {
    const w = createWorld({ seed: 9, factions: ['mensch', 'gott'] });
    const ais = [createAI(0, 9, 'sturm'), createAI(1, 10, 'burg')];
    for (let t = 0; t < 4000; t++) {
      for (const a of ais) stepAI(a, w);
      step(w);
    }
    return hash(w);
  };
  assert.equal(lauf(), lauf());
});

test('Infokarte: Katapult braucht Aufklaerung (Reichweite 1000 ueber Sicht 700), Soldat nicht, ohne Netz nirgends', () => {
  const w = leer();
  const kat = einheitKarte(w, 0, 'katapult');
  assert.match(kat, /braucht Aufklärung/);
  assert.doesNotMatch(einheitKarte(w, 0, 'soldat'), /braucht Aufklärung/);
  assert.doesNotMatch(gebaeudeKarte(w, 0, 'wachturm'), /braucht Aufklärung/, 'Turm: Sicht 1200 reicht');
  assert.match(einheitKarte(w, 0, 'fl_arti'), /braucht Aufklärung/);
  assert.match(gebaeudeKarte(w, 0, 'fl_turm'), /braucht Aufklärung/);
  RULES.feuerleitnetz = false;
  try {
    assert.doesNotMatch(einheitKarte(w, 0, 'katapult'), /braucht Aufklärung/);
  } finally {
    RULES.feuerleitnetz = SCHALTER;
  }
});
