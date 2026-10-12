// M9 Mehrspieler: 3 und 4 Spieler, jeder gegen jeden. Karten Drei Reiche (3 Basen)
// und Vierlande (4 Basen); zwei Spieler bleiben, wie sie waren (tools/referenz.mjs).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createWorld, step, hash, issue, maxSpieler, startplatz, spawnUnit, kommandantVon, VERFALL, byId,
} from '../src/sim/sim.js';
import { createAI, stepAI } from '../src/sim/ai.js';
import { neueKunde, aufklaeren, gegnerPlaetze, vermutetesHaupt } from '../src/sim/kunde.js';
import { KARTEN, FACTIONS, BUILDINGS, MAP } from '../src/sim/defs.js';
import { zustandSichern, zustandLaden } from '../src/spielstand.js';
import { neuerVerlauf, verlaufFortschreiben, siegHtml } from '../src/aufnahme.js';
import {
  spielerFarbe, gegnerVolkListe, kisErzeugen, beobachterHtml, spielerLeisteHtml, endeAnzeige, spielerStand,
  gegnerVolkHtml, neuerNebel, nebelAktualisieren,
} from '../src/ui-gemeinsam.js';

const VIER = ['mensch', 'gott', 'tod', 'mensch'];
const DREI = ['mensch', 'gott', 'tod'];

/** KIs fuer alle Sitze, Seeds wie in tools/match.mjs. */
const kis = (w, seed = 1) => w.players.map((_, p) => createAI(p, seed + p, ['sturm', 'standard', 'burg'][p % 3]));
function lauf(w, ais, ticks) {
  for (let t = 0; t < ticks && !w.over; t++) {
    for (const a of ais) stepAI(a, w);
    step(w);
  }
}
const haupt = (w, p) => w.entities.find((e) => !e.dead && e.player === p && e.kind === 'building' && BUILDINGS[e.type].vital);
/** Spieler p scheidet aus: Hauptgebaeude und Kommandant fallen (wie im Kampf, die Aufraeumschleife der Simulation erledigt den Rest). */
function ausscheiden(w, p) {
  haupt(w, p).dead = true;
  const k = kommandantVon(w, p);
  if (k) k.dead = true;
}

// ------------------------------------------------------------ Welt

test('Welt: so viele Spieler wie Voelker, hoechstens so viele wie die Karte Basen hat', () => {
  assert.equal(maxSpieler(KARTEN.klassisch), 2);
  assert.equal(maxSpieler(KARTEN.dreiReiche), 3);
  assert.equal(maxSpieler(KARTEN.vierlande), 4);
  assert.equal(createWorld({ factions: VIER, karte: 'vierlande' }).players.length, 4);
  assert.equal(createWorld({ factions: DREI, karte: 'dreiReiche' }).players.length, 3);
  // zu viele Voelker fuer die Karte: die ersten, die Platz haben
  assert.equal(createWorld({ factions: VIER, karte: 'dreiReiche' }).players.length, 3);
  assert.equal(createWorld({ factions: VIER, karte: 'klassisch' }).players.length, 2);
  assert.equal(createWorld({ factions: VIER, karte: 'flusstal' }).players.length, 2);
  // zu wenige: zwei Voelker auf einer 4-Spieler-Karte spielen auf den ersten beiden Basen
  const zwei = createWorld({ factions: ['mensch', 'gott'], karte: 'vierlande' });
  assert.equal(zwei.players.length, 2);
  const b = KARTEN.vierlande.basen;
  assert.deepEqual([haupt(zwei, 0).x, haupt(zwei, 0).y, haupt(zwei, 1).x, haupt(zwei, 1).y], [b[0].x, b[0].y, b[1].x, b[1].y]);
  // ohne Angabe wie immer Menschen gegen Gott
  assert.deepEqual(createWorld({}).players.map((p) => p.faction), ['mensch', 'gott']);
});

test('Welt: Hauptgebaeude und Kommandanten stehen auf den Basen der Karte, jeder auf seiner', () => {
  for (const [karte, fraktionen] of [['dreiReiche', DREI], ['vierlande', VIER]]) {
    const w = createWorld({ factions: fraktionen, karte, seed: 5 });
    const basen = KARTEN[karte].basen;
    for (let p = 0; p < fraktionen.length; p++) {
      const h = haupt(w, p);
      assert.deepEqual([h.x, h.y], [basen[p].x, basen[p].y], `${karte}: Hauptgebaeude von ${p}`);
      assert.equal(h.type, FACTIONS[fraktionen[p]].haupt);
      const k = kommandantVon(w, p);
      assert.ok(k, `${karte}: Kommandant von ${p}`);
      assert.ok((k.x - h.x) ** 2 + (k.y - h.y) ** 2 > 0, 'der Kommandant steht neben dem Hauptgebaeude, nicht darauf');
    }
    assert.equal(w.entities.filter((e) => e.kind === 'building').length, fraktionen.length);
  }
});

test('Welt: zwei Spieler auf Karten ohne Basen behalten die Ecken (3000 und MAP-3000)', () => {
  const w = createWorld({ factions: ['mensch', 'gott'] });
  assert.deepEqual(startplatz(KARTEN.klassisch, 0), { x: 3000, y: 3000 });
  assert.deepEqual(startplatz(KARTEN.klassisch, 1), { x: MAP - 3000, y: MAP - 3000 });
  assert.deepEqual([haupt(w, 0).x, haupt(w, 0).y, haupt(w, 1).x, haupt(w, 1).y], [3000, 3000, MAP - 3000, MAP - 3000]);
});

test('Welt: jeder Spieler hat sein eigenes Fron-Vorkommen in der Naehe seiner Basis', () => {
  const w = createWorld({ factions: VIER, karte: 'vierlande' });
  for (let p = 0; p < 4; p++) {
    const h = haupt(w, p);
    const nah = w.deposits.filter((d) => d.kind === 'masse' && (d.x - h.x) ** 2 + (d.y - h.y) ** 2 < 5000 * 5000);
    assert.ok(nah.length >= 5, `Basis ${p} hat ${nah.length} Adern in Reichweite`);
  }
});

// ------------------------------------------------------------ Determinismus, Speichern

test('Determinismus: dieselbe Partie mit 3 und 4 KIs ergibt dieselbe Pruefsumme', () => {
  for (const [karte, f] of [['dreiReiche', DREI], ['vierlande', VIER]]) {
    const lauf1 = () => {
      const w = createWorld({ factions: f, karte, seed: 21 });
      lauf(w, kis(w, 21), 4000);
      return hash(w);
    };
    assert.equal(lauf1(), lauf1(), karte);
  }
  // ein anderer Seed ergibt eine andere Partie
  const a = createWorld({ factions: VIER, karte: 'vierlande', seed: 1 });
  const b = createWorld({ factions: VIER, karte: 'vierlande', seed: 2 });
  lauf(a, kis(a, 1), 1500);
  lauf(b, kis(b, 2), 1500);
  assert.notEqual(hash(a), hash(b));
});

/** Bis `bis` spielen, sichern, dann Original und Geladenes nebeneinander weiterlaufen lassen. */
function gleichNachLaden(opts, bis, danach) {
  const w = createWorld(opts);
  const ais = kis(w, opts.seed);
  lauf(w, ais, bis);
  const text = JSON.stringify(zustandSichern(w, ais));
  const g = zustandLaden(JSON.parse(text));
  assert.equal(g.world.players.length, w.players.length);
  assert.equal(g.ais.length, w.players.length);
  assert.equal(hash(g.world), hash(w), 'gleicher Stand direkt nach dem Laden');
  const spur = (welt, a) => {
    const s = [];
    for (let t = 0; t < danach && !welt.over; t++) {
      for (const k of a) stepAI(k, welt);
      step(welt);
      if (welt.tick % 50 === 0) s.push(hash(welt));
    }
    return s;
  };
  assert.deepEqual(spur(g.world, g.ais), spur(w, ais));
  assert.deepEqual(g.world.players.map((p) => p.alive), w.players.map((p) => p.alive));
}

test('Spielstand: 3 und 4 Spieler mitten im Gefecht gesichert und geladen laufen bitgenau weiter', () => {
  gleichNachLaden({ factions: VIER, karte: 'vierlande', seed: 9 }, 9000, 1800); // vor dem ersten Ausscheiden (Tick 9575) gesichert
  gleichNachLaden({ factions: DREI, karte: 'dreiReiche', seed: 3 }, 5000, 2000);
});

test('Spielstand: ein Stand nach dem Ausscheiden verfaellt weiter wie das Original', () => {
  const w = createWorld({ factions: VIER, karte: 'vierlande', seed: 5 });
  const ais = kis(w, 5);
  lauf(w, ais, 7000);
  const aus = w.players.findIndex((p) => !p.alive);
  assert.ok(aus >= 0, 'bis hierher ist jemand ausgeschieden');
  const g = zustandLaden(JSON.parse(JSON.stringify(zustandSichern(w, ais))));
  lauf(w, ais, 1500);
  lauf(g.world, g.ais, 1500);
  assert.equal(hash(g.world), hash(w));
});

// ------------------------------------------------------------ Ausscheiden und Sieg

test('Ausscheiden: wer Hauptgebaeude und Kommandant verliert, ist draussen -- die Partie geht weiter', () => {
  const w = createWorld({ factions: DREI, karte: 'dreiReiche', seed: 2 });
  step(w);
  ausscheiden(w, 1);
  step(w);
  assert.equal(w.players[1].alive, false);
  assert.equal(w.players[1].ausgeschiedenBei, 1);
  assert.equal(w.players[0].alive && w.players[2].alive, true);
  assert.equal(w.over, false, 'zwei sind noch dabei');
  assert.equal(w.winner, -1);
  assert.ok(w.events.some((e) => e.t === 'ausgeschieden' && e.player === 1), 'die Meldung kommt');
  // der Zaehler gilt nur einmal: ein weiteres Ausscheiden desselben aendert den Tick nicht
  step(w);
  assert.equal(w.players[1].ausgeschiedenBei, 1);
});

test('Sieg: gewonnen hat der letzte Uebrige; ohne Sieger, wenn alle zugleich fallen', () => {
  const w = createWorld({ factions: DREI, karte: 'dreiReiche', seed: 2 });
  ausscheiden(w, 1);
  step(w);
  assert.equal(w.over, false);
  ausscheiden(w, 2);
  step(w);
  assert.equal(w.over, true);
  assert.equal(w.winner, 0);
  // zwei fallen im selben Tick, der dritte bleibt
  const v = createWorld({ factions: VIER, karte: 'vierlande', seed: 2 });
  ausscheiden(v, 0);
  ausscheiden(v, 3);
  step(v);
  assert.equal(v.over, false, 'zwei sind noch dabei');
  ausscheiden(v, 1);
  step(v);
  assert.equal(v.over && v.winner, 2);
  // alle zugleich: Ende ohne Sieger, nicht fuer immer offen
  const x = createWorld({ factions: DREI, karte: 'dreiReiche', seed: 2 });
  for (let p = 0; p < 3; p++) ausscheiden(x, p);
  step(x);
  assert.equal(x.over, true);
  assert.equal(x.winner, -1);
});

test('Aufgeben zaehlt wie ein gefallener Kommandant -- bei drei Spielern endet die Partie erst mit dem letzten', () => {
  const w = createWorld({ factions: DREI, karte: 'dreiReiche', seed: 2 });
  issue(w, { type: 'aufgeben', player: 1 });
  step(w);
  assert.equal(w.players[1].alive, false);
  assert.equal(w.over, false);
  issue(w, { type: 'aufgeben', player: 2 });
  step(w);
  assert.equal(w.over, true);
  assert.equal(w.winner, 0);
});

test('Verfall: die Reste eines Ausgeschiedenen stehen noch, vergehen aber nach VERFALL Ticks -- ohne Seelen', () => {
  const w = createWorld({ factions: DREI, karte: 'dreiReiche', seed: 2 });
  const sold = spawnUnit(w, 1, 'soldat', 9000, 9000);
  ausscheiden(w, 1);
  step(w);
  const rest = () => w.entities.filter((e) => e.player === 1);
  assert.ok(rest().length > 0, 'die Einheit steht noch');
  const hp0 = byId(w, sold.id).hp;
  for (let t = 0; t < 20; t++) step(w);
  assert.ok(byId(w, sold.id).hp < hp0, 'sie verliert Leben');
  for (let t = 0; t < VERFALL + 5; t++) step(w);
  assert.equal(rest().length, 0, 'nach VERFALL ist nichts mehr da');
  assert.equal(w.over, false);
  assert.ok(w.players[0].alive && w.players[2].alive);
});

test('Verfall: er laeuft nur bei Ausgeschiedenen -- lebende Spieler verlieren nichts', () => {
  const w = createWorld({ factions: DREI, karte: 'dreiReiche', seed: 2 });
  const hp = haupt(w, 0).hp;
  for (let t = 0; t < 500; t++) step(w);
  assert.equal(haupt(w, 0).hp, hp);
  assert.equal(haupt(w, 2).hp, BUILDINGS[haupt(w, 2).type].hp);
});

test('Ausgeschiedene geben keine Befehle mehr, ihre KI plant nichts mehr', () => {
  const w = createWorld({ factions: DREI, karte: 'dreiReiche', seed: 2 });
  const sold = spawnUnit(w, 1, 'soldat', 9000, 9000);
  const ai = createAI(1, 3);
  ausscheiden(w, 1);
  step(w);
  issue(w, { type: 'move', player: 1, ids: [sold.id], x: 12000, y: 12000 });
  step(w);
  assert.notEqual(byId(w, sold.id).tx, 12000, 'der Befehl wirkt nicht');
  // KI: keine Befehle mehr
  w.tick = 100;
  ai.next = 0;
  stepAI(ai, w);
  assert.equal(w.pending.length, 0);
});

test('Pruefsumme: wer ausgeschieden ist, steht in der Pruefsumme (ab drei Spielern)', () => {
  const w = createWorld({ factions: DREI, karte: 'dreiReiche', seed: 2 });
  const v = createWorld({ factions: DREI, karte: 'dreiReiche', seed: 2 });
  assert.equal(hash(w), hash(v));
  v.players[2].alive = false;
  assert.notEqual(hash(w), hash(v));
});

test('Partie mit drei KIs endet mit genau einem Sieger, die anderen sind ausgeschieden', () => {
  const w = createWorld({ factions: DREI, karte: 'dreiReiche', seed: 3 });
  const ais = kis(w, 3);
  const aus = [];
  for (let t = 0; t < 20000 && !w.over; t++) {
    for (const a of ais) stepAI(a, w);
    step(w);
    for (const ev of w.events) if (ev.t === 'ausgeschieden') aus.push(ev.player);
  }
  assert.ok(w.over, 'die Partie endet');
  assert.ok(w.winner >= 0 && w.players[w.winner].alive);
  assert.equal(w.players.filter((p) => p.alive).length, 1);
  assert.deepEqual(aus.slice().sort(), [0, 1, 2].filter((p) => p !== w.winner));
});

// ------------------------------------------------------------ Kunde

test('Kunde: die moeglichen Startplaetze der Gegner sind alle Basen ausser der eigenen', () => {
  const w = createWorld({ factions: VIER, karte: 'vierlande' });
  const b = KARTEN.vierlande.basen;
  for (let p = 0; p < 4; p++) {
    const plaetze = gegnerPlaetze(w, p, haupt(w, p));
    assert.deepEqual(plaetze.map((q) => q.player), [0, 1, 2, 3].filter((q) => q !== p));
    for (const q of plaetze) assert.deepEqual([q.x, q.y], [b[q.player].x, b[q.player].y]);
  }
  // wer ausgeschieden ist, steht auf Wunsch nicht mehr in der Liste
  w.players[2].alive = false;
  assert.deepEqual(gegnerPlaetze(w, 0, haupt(w, 0), true).map((q) => q.player), [1, 3]);
  // drei Spieler auf Vierlande: nur die Basen der Mitspieler, die vierte Basis ist leer und unbekannt
  const drei = createWorld({ factions: DREI, karte: 'vierlande' });
  assert.deepEqual(gegnerPlaetze(drei, 0, haupt(drei, 0)).map((q) => q.player), [1, 2]);
});

test('Kunde: bei zwei Spielern gilt weiter genau die eine Gegenbasis, gegenueber dem eigenen Hauptgebaeude', () => {
  const w = createWorld({ factions: ['mensch', 'gott'] });
  const [q] = gegnerPlaetze(w, 0, haupt(w, 0));
  assert.deepEqual([q.player, q.x, q.y], [1, MAP - 3000, MAP - 3000]);
  const k = aufklaeren(neueKunde(0), w);
  const v = vermutetesHaupt(k, haupt(w, 0));
  assert.ok(v.vermutet);
  assert.deepEqual([v.x, v.y], [MAP - 3000, MAP - 3000]);
  // dasselbe mit Gegner und Platz
  const v2 = vermutetesHaupt(k, haupt(w, 0), 1, q);
  assert.deepEqual([v2.x, v2.y, v2.vermutet], [MAP - 3000, MAP - 3000, true]);
});

test('Kunde: ohne Sicht kennt sie nichts Fremdes; gesehen wird nur, was in Sichtweite steht', () => {
  const w = createWorld({ factions: VIER, karte: 'vierlande', seed: 4 });
  const k = aufklaeren(neueKunde(0), w);
  assert.equal(k.einheiten.length, 0);
  assert.equal(k.gebaeude.length, 0);
  assert.equal(k.gesehen.length, 0);
  assert.equal(k.jetzt.size, 0);
  for (let i = 0; i < k.quellen.length; i += 3) {
    // alle Sichtquellen sind eigene: nah an der eigenen Basis
    assert.ok((k.quellen[i] - 3000) ** 2 + (k.quellen[i + 1] - 3000) ** 2 < 2000 * 2000);
  }
  // Ein Spaeher von Spieler 2 steht dicht bei Basis 0, einer von Spieler 3 weit weg
  const nah = spawnUnit(w, 2, 'soldat', 3400, 3000);
  const fern = spawnUnit(w, 3, 'soldat', 9000, 9000);
  step(w);
  aufklaeren(k, w);
  assert.deepEqual(k.einheiten.map((u) => u.id), [nah.id]);
  assert.ok(k.jetzt.has(nah.id) && !k.jetzt.has(fern.id));
  assert.ok(!k.gesehen.some((u) => u.id === fern.id), 'Spieler 3 bleibt unbekannt');
  // Vermutetes Hauptgebaeude: erst der Startplatz, dann (nach Sicht) das Gebaeude des gewaehlten Gegners
  const h0 = haupt(w, 0);
  const plaetze = gegnerPlaetze(w, 0, h0);
  const zu2 = plaetze.find((q) => q.player === 2);
  assert.ok(vermutetesHaupt(k, h0, 2, zu2).vermutet);
  spawnUnit(w, 0, 'soldat', haupt(w, 2).x - 300, haupt(w, 2).y); // eigener Spaeher vor Basis 2
  step(w);
  aufklaeren(k, w);
  assert.equal(vermutetesHaupt(k, h0, 2, zu2).id, haupt(w, 2).id);
  assert.ok(vermutetesHaupt(k, h0, 1, plaetze.find((q) => q.player === 1)).vermutet, 'Basis 1 bleibt Vermutung');
  assert.ok(k.gebaeude.every((g) => g.player === 2));
});

// ------------------------------------------------------------ KI

test('KI: ohne anderen Anlass zielt sie auf den naechsten Gegner (nach Hauptgebaeude oder Startplatz)', () => {
  const w = createWorld({ factions: DREI, karte: 'dreiReiche', seed: 6 });
  const ais = kis(w, 6);
  w.tick = 30;
  for (const a of ais) stepAI(a, w);
  assert.equal(ais[0].gegner, 2, 'von der Ecke aus ist die Mitte naeher als die gegenueberliegende Ecke');
  assert.equal(ais[1].gegner, 2);
  assert.equal(ais[2].gegner, 0, 'gleich weit: der kleinere Sitz');
});

test('KI: wer sie in der eigenen Domaene angreift, wird ihr Ziel -- erst nach der Wechselfrist', () => {
  const w = createWorld({ factions: DREI, karte: 'dreiReiche', seed: 6 });
  const ai = createAI(0, 6);
  w.tick = 30;
  stepAI(ai, w);
  assert.equal(ai.gegner, 2);
  // ein Soldat von Spieler 1 steht neben dem Hauptgebaeude von Spieler 0
  spawnUnit(w, 1, 'soldat', 3500, 3000);
  w.tick = 60;
  ai.next = 0;
  stepAI(ai, w);
  assert.equal(ai.gegner, 2, 'zu frueh: sie bleibt bei ihrem Ziel');
  w.tick = ai.gegnerSeit + 1300;
  ai.next = 0;
  stepAI(ai, w);
  assert.equal(ai.gegner, 1, 'nach der Frist zielt sie auf den Angreifer');
  // ein Angriff ihres bisherigen Ziels aendert nichts, ein ausgeschiedener Gegner faellt aus der Wahl
  w.players[1].alive = false;
  w.tick += 100;
  ai.next = 0;
  stepAI(ai, w);
  assert.equal(ai.gegner, 2, 'der Ausgeschiedene ist kein Ziel mehr');
});

test('KI: jeder gegen jeden mit vier KIs auf Vierlande -- 30 Spielminuten ohne Fehler und Haenger', () => {
  const w = createWorld({ factions: VIER, karte: 'vierlande', seed: 9 });
  const ais = kis(w, 9);
  const befehle = [0, 0, 0, 0];
  let letzterWechsel = 0;
  let stand = hash(w);
  for (let t = 0; t < 18000 && !w.over; t++) {
    for (const a of ais) stepAI(a, w);
    for (const c of w.pending) befehle[c.player]++;
    step(w);
    if (t % 600 === 0) {
      const h = hash(w);
      if (h !== stand) letzterWechsel = t;
      stand = h;
    }
  }
  // gelaufen bis zum Ende oder zur Zeit; es hat sich bis zuletzt etwas bewegt
  assert.ok(w.over || w.tick === 18000, `Partie stand bei Tick ${w.tick}`);
  assert.ok(w.tick - letzterWechsel < 1800, 'kein Stillstand');
  assert.ok(befehle.every((n, p) => n > 100 || !w.players[p].alive || w.tick < 3000), `Befehle je Sitz: ${befehle}`);
  assert.ok(ais.reduce((s, a) => s + a.welle, 0) > 0, 'es gab Angriffswellen');
  // wer ausgeschieden ist, hat nichts mehr: nach VERFALL steht nichts mehr von ihm
  for (let p = 0; p < 4; p++) {
    const pl = w.players[p];
    if (pl.alive || w.tick - pl.ausgeschiedenBei < VERFALL + 10) continue;
    assert.equal(w.entities.filter((e) => e.player === p).length, 0, `Reste von Spieler ${p}`);
  }
  if (w.over) assert.equal(w.players.filter((p) => p.alive).length, w.winner >= 0 ? 1 : 0);
});

// ------------------------------------------------------------ Wiederholung

test('Wiederholung: eine Aufnahme mit vier Spielern ergibt beim Abspielen dieselbe Partie', async () => {
  const { neueAufnahme, aufnehmen, abspielen, aufnahmeLesen } = await import('../src/aufnahme.js');
  const start = { seed: 55, factions: VIER, karte: 'vierlande', stil: 'burg', stufe: 'mittel', zuschauen: false };
  // wie die Oberflaeche: Befehle des Menschen (Sitz 0), dann die KIs der anderen Sitze, dann der Schritt
  const spielen = (wdh) => {
    const w = createWorld({ seed: start.seed, factions: start.factions, karte: start.karte });
    const ais = kisErzeugen(w, 0, false, start.stil, start.stufe);
    const a = neueAufnahme(start);
    let zeiger = 0;
    for (let i = 0; i < 2500; i++) {
      if (!wdh && i % 300 === 50) {
        const k = kommandantVon(w, 0);
        if (k) issue(w, { type: 'move', player: 0, ids: [k.id], x: 4000 + i, y: 4500 });
        issue(w, { type: 'build', player: 0, building: 'saege', x: 6200, y: 2100, ids: k ? [k.id] : [] });
      }
      if (wdh) zeiger = abspielen(wdh, w, zeiger);
      else aufnehmen(a, w);
      for (const ai of ais) if (ai) stepAI(ai, w);
      step(w);
    }
    return { a, h: hash(w), n: w.players.length };
  };
  const erst = spielen(null);
  assert.equal(erst.n, 4);
  assert.ok(erst.a.befehle.length >= 10, 'Befehle aufgenommen');
  const gelesen = aufnahmeLesen(JSON.stringify(erst.a));
  assert.ok(gelesen.a && !gelesen.fehler);
  assert.deepEqual(gelesen.a.factions, VIER);
  assert.equal(spielen(gelesen.a).h, erst.h, 'gleicher Endzustand');
});

// ------------------------------------------------------------ Oberflaeche (gemeinsame Teile)

test('Spielerfarben: vier Spieler, vier verschiedene Farben -- auch mit gleichem Volk', () => {
  for (const f of [VIER, ['mensch', 'mensch', 'mensch', 'mensch'], ['tod', 'tod', 'gott', 'gott']]) {
    const w = createWorld({ factions: f, karte: 'vierlande' });
    const farben = w.players.map((_, p) => spielerFarbe(w, p));
    assert.equal(new Set(farben).size, 4, `${f}: ${farben}`);
  }
  // wo sich die Voelker unterscheiden, bleibt die Volksfarbe (wie vor dem Umbau)
  const w = createWorld({ factions: DREI, karte: 'dreiReiche' });
  assert.deepEqual(w.players.map((_, p) => spielerFarbe(w, p)), DREI.map((f) => FACTIONS[f].color));
  // der vierte Spieler (zweiter Mensch) hat keine blaue oder gruene Farbe: rot
  const v = createWorld({ factions: VIER, karte: 'vierlande' });
  const c = spielerFarbe(v, 3);
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  assert.ok(r > g && r > b, `Farbe ${c} ist rot`);
});

test('Oberflaeche: 2D und 3D bestimmen die Spielerfarbe mit derselben Funktion', () => {
  for (const datei of ['../src/ui.js', '../src/ui3d.js']) {
    const text = readFileSync(new URL(datei, import.meta.url), 'utf8');
    assert.ok(text.includes('spielerFarbe(world'), datei);
    assert.ok(!/FACTIONS\[world\.players\[[^\]]+\]\.faction\]\.color/.test(text), `${datei} nimmt die Volksfarbe noch direkt`);
  }
});

test('Oberflaeche: Gegner-Voelker -- bis zu drei, keiner moeglich, nie mehr als die Karte fasst', () => {
  assert.deepEqual(gegnerVolkListe('mensch', KARTEN.klassisch), ['gott']);
  assert.deepEqual(gegnerVolkListe('gott', KARTEN.klassisch, 'tod'), ['tod']);
  assert.deepEqual(gegnerVolkListe('mensch', KARTEN.vierlande), ['gott', 'tod', 'mensch']);
  assert.deepEqual(gegnerVolkListe('tod', KARTEN.vierlande), ['mensch', 'gott', 'tod']);
  assert.deepEqual(gegnerVolkListe('mensch', KARTEN.dreiReiche), ['gott', 'tod']);
  assert.deepEqual(gegnerVolkListe('mensch', KARTEN.vierlande, 'auto', ['keiner', 'auto']), ['gott', 'tod']);
  assert.deepEqual(gegnerVolkListe('mensch', KARTEN.vierlande, 'auto', ['keiner', 'keiner']), ['gott']);
  assert.deepEqual(gegnerVolkListe('mensch', KARTEN.vierlande, 'gott', ['gott', 'gott']), ['gott', 'gott', 'gott']);
  const html = gegnerVolkHtml('auto');
  assert.ok(html.includes('name="gegnerVolk2"') && html.includes('name="gegnerVolk3"') && html.includes('value="keiner"'));
});

test('Oberflaeche: KIs je Sitz -- der Mensch hat keine, beim Zuschauen auch Sitz 0, Seeds wie bisher', () => {
  const w = createWorld({ factions: VIER, karte: 'vierlande', seed: 100 });
  const ais = kisErzeugen(w, 0, false, 'burg', 'schwer');
  assert.equal(ais.length, 4);
  assert.equal(ais[0], null);
  assert.deepEqual(ais.slice(1).map((a) => a.player), [1, 2, 3]);
  assert.equal(ais[1].seed, 100);
  assert.deepEqual(new Set(ais.slice(1).map((a) => a.seed)).size, 3, 'jede KI mit eigenem Seed');
  const zu = kisErzeugen(w, 0, true, 'burg', 'schwer');
  assert.ok(zu.every(Boolean));
  assert.equal(zu[0].seed, 101);
  // zwei Spieler wie bisher: Sitz 1 mit dem Seed der Welt
  const w2 = createWorld({ factions: ['mensch', 'gott'], seed: 100 });
  const a2 = kisErzeugen(w2, 0, false, 'standard', 'mittel');
  assert.equal(a2.length, 2);
  assert.equal(a2[1].seed, 100);
});

test('Oberflaeche: Beobachter, Spielerleiste und Ende kennen alle Spieler', () => {
  const w = createWorld({ factions: VIER, karte: 'vierlande', seed: 1 });
  const beo = beobachterHtml(w);
  assert.equal((beo.match(/<th/g) || []).length, 5, 'Kopfzeile: leer und vier Spieler');
  assert.equal((beo.match(/<tr>/g) || []).length, 8, 'Kopf und sieben Zeilen');
  const leiste = spielerLeisteHtml(w, 0);
  assert.equal((leiste.match(/class="spieler"/g) || []).length, 4);
  assert.ok(leiste.includes('(du)'));
  assert.equal(spielerLeisteHtml(createWorld({}), 0), '', 'bei zwei Spielern bleibt das HUD wie es war');
  assert.equal(endeAnzeige(w, 0), '');
  ausscheiden(w, 0);
  step(w);
  assert.equal(spielerStand(w, 0), 'ausgeschieden');
  assert.match(endeAnzeige(w, 0), /Ausgeschieden/);
  assert.ok(spielerLeisteHtml(w, 0).includes('line-through'), 'der Ausgeschiedene ist durchgestrichen');
  assert.equal(spielerStand(w, 1), 'dabei');
  ausscheiden(w, 1);
  ausscheiden(w, 2);
  step(w);
  assert.equal(spielerStand(w, 3), 'gewonnen');
  assert.equal(endeAnzeige(w, 3), 'Gewonnen');
  assert.equal(spielerStand(w, 0), 'verloren', 'wer vorher ausschied, hat am Ende verloren');
  assert.equal(endeAnzeige(w, 0), 'Verloren');
});

test('Oberflaeche: wer ausscheidet, sieht ohne Nebel zu -- nur bei drei und mehr Spielern', () => {
  const w = createWorld({ factions: VIER, karte: 'vierlande' });
  const nebel = neuerNebel(true, 0);
  nebelAktualisieren(nebel, w);
  assert.equal(nebel.an, true);
  ausscheiden(w, 0);
  step(w);
  nebelAktualisieren(nebel, w);
  assert.equal(nebel.an, false);
  assert.equal(nebel.hell[0], 255);
  // zwei Spieler: der Nebel bleibt, auch wenn die Partie aus ist
  const z = createWorld({});
  const n2 = neuerNebel(true, 0);
  ausscheiden(z, 0);
  step(z);
  nebelAktualisieren(n2, z);
  assert.equal(n2.an, true);
});

test('Verlauf und Siegbildschirm: Zahlen und Diagramme je Spieler, Verfall zaehlt nicht als Verlust', () => {
  const w = createWorld({ factions: VIER, karte: 'vierlande', seed: 8 });
  const v = neuerVerlauf(4);
  assert.equal(v.verluste.length, 4);
  const ais = kis(w, 8);
  let verfallen = 0;
  for (let t = 0; t < 9000 && !w.over; t++) {
    // Spieler 3 scheidet nach 5 min aus (nicht mehr dem Verlauf der KI-Partie ueberlassen: seit den Wracks, R1, aendert sich der)
    if (t === 3000) ausscheiden(w, 3);
    for (const a of ais) stepAI(a, w);
    step(w);
    for (const ev of w.events) if (ev.t === 'died' && ev.vergangen) verfallen++;
    verlaufFortschreiben(v, w);
  }
  assert.ok(v.minuten.length >= 14 && v.minuten.every((m) => m.length === 4));
  assert.ok(v.ausgebildet.every((n) => n > 0));
  assert.ok(verfallen > 0, 'im Lauf sind Reste Ausgeschiedener verfallen');
  const gefallen = [0, 0, 0, 0];
  const ev = { t: 'died', kind: 'unit', player: 1, vergangen: true };
  const vor = v.verluste[1];
  w.events = [ev];
  verlaufFortschreiben(v, w);
  assert.equal(v.verluste[1], vor, 'Verfall zaehlt nicht');
  assert.equal(gefallen.length, 4);
  const html = siegHtml(w, v, 0, false, false);
  assert.equal((html.match(/<path /g) || []).length, 12, 'drei Diagramme mit je vier Linien');
  assert.ok(!html.includes('Getötet'), 'wer wen getoetet hat, steht bei mehr als zwei Spielern nicht fest');
  assert.equal((html.match(/<th/g) || []).length, 5);
  // zwei Spieler: wie bisher
  const z = createWorld({});
  const v2 = neuerVerlauf();
  assert.equal(v2.verluste.length, 2);
  assert.ok(siegHtml(z, v2, 0, false, false).includes('Getötet'));
});
