// Kunde: Was ein Spieler vom Gegner weiss. Die Simulation selbst kennt keinen
// Nebel -- sie sieht alles. Diese Sicht ist fuer die Oberflaechen und fuer
// die KI, die damit nichts weiss, was ein Spieler an ihrer Stelle nicht
// wuesste. Deterministisch wie die Simulation: nur Integer, nur Arrays in
// Entity-Reihenfolge; Sets nur zum Nachschlagen, nie zum Durchlaufen.
//
// Bekannt ist ohne Sicht nur die Karte selbst (Hindernisse, Adern) und, wie
// auf jeder Zwei-Spieler-Karte, wo der Gegner beginnt: punktsymmetrisch
// gegenueber dem eigenen Hauptgebaeude.

import { sichtweite, dist2 } from './sim.js';
import { BUILDINGS, MAP } from './defs.js';

// Wie lange eine gesehene Einheit in Erinnerung bleibt (Ticks, 10 min).
// Designzahl: Wer laenger nichts gesehen hat, weiss nicht, was dort steht.
// Kuerzer (3 min) unterschaetzt die KI das gegnerische Heer und schickt
// kleine Wellen in den Tod (docs/scope.md, Abschnitt 19).
export const VERGESSEN = 6000;

export function neueKunde(player) {
  return {
    player,
    tick: -1,
    // Sichtquellen: x, y, Sichtweite je eigener Einheit und eigenem Gebaeude
    quellen: [],
    // Gerade sichtbare gegnerische Entities (nur zum Nachschlagen)
    jetzt: new Set(),
    // Gerade sichtbare gegnerische Einheiten
    einheiten: [],
    // Zuletzt gesehene gegnerische Gebaeude: { id, type, player, x, y, done, powered, tick }
    gebaeude: [],
    // Zuletzt gesehene gegnerische Einheiten: { id, type, player, x, y, tick }
    gesehen: [],
    // Je Ader (Index in world.deposits) der Tick, an dem man sie zuletzt gesehen hat; -1 nie
    adern: [],
  };
}

/** Sichtquellen eines Spielers: [x, y, r, x, y, r, ...] */
export function sichtQuellen(world, player) {
  const q = [];
  for (let i = 0; i < world.entities.length; i++) {
    const e = world.entities[i];
    if (e.dead || e.player !== player) continue;
    q.push(e.x, e.y, sichtweite(e, world));
  }
  return q;
}

/** Liegt der Punkt in Sicht? Mit Rand: ein Gebaeude sieht man, sobald sein Rand in Sicht ist. */
export function inSicht(quellen, x, y, rand = 0) {
  for (let i = 0; i < quellen.length; i += 3) {
    const r = quellen[i + 2] + rand;
    if (dist2(x, y, quellen[i], quellen[i + 1]) <= r * r) return true;
  }
  return false;
}

/**
 * Kunde auf den Stand des Ticks bringen: was jetzt sichtbar ist, merken.
 * Vergessen wird, was man an seinem Platz nicht mehr sieht -- zerstoert oder
 * weitergezogen, das weiss man nicht --, und Einheiten nach VERGESSEN.
 */
export function aufklaeren(k, world) {
  if (k.tick === world.tick) return k;
  k.tick = world.tick;
  const q = sichtQuellen(world, k.player);
  k.quellen = q;
  const jetzt = new Set();
  const einheiten = [];
  for (let i = 0; i < world.entities.length; i++) {
    const e = world.entities[i];
    if (e.dead || e.player === k.player) continue;
    if (e.kind === 'unit') {
      if (!inSicht(q, e.x, e.y)) continue;
      jetzt.add(e.id);
      einheiten.push(e);
      const alt = k.gesehen.find((u) => u.id === e.id);
      if (alt) {
        alt.x = e.x;
        alt.y = e.y;
        alt.tick = world.tick;
      } else k.gesehen.push({ id: e.id, type: e.type, player: e.player, x: e.x, y: e.y, tick: world.tick });
    } else if (e.kind === 'building') {
      if (!inSicht(q, e.x, e.y, BUILDINGS[e.type].radius)) continue;
      jetzt.add(e.id);
      const alt = k.gebaeude.find((b) => b.id === e.id);
      if (alt) {
        alt.done = e.done;
        alt.powered = e.powered;
        alt.tick = world.tick;
      } else {
        k.gebaeude.push({ id: e.id, type: e.type, player: e.player, x: e.x, y: e.y, done: e.done, powered: e.powered, tick: world.tick });
      }
    }
  }
  k.jetzt = jetzt;
  k.einheiten = einheiten;
  k.gebaeude = k.gebaeude.filter((b) => jetzt.has(b.id) || !inSicht(q, b.x, b.y, BUILDINGS[b.type].radius));
  for (let i = 0; i < world.deposits.length; i++) {
    if (k.adern.length <= i) k.adern.push(-1);
    if (inSicht(q, world.deposits[i].x, world.deposits[i].y)) k.adern[i] = world.tick;
  }
  k.gesehen = k.gesehen.filter((u) => jetzt.has(u.id) || (world.tick - u.tick <= VERGESSEN && !inSicht(q, u.x, u.y)));
  return k;
}

/**
 * Das gegnerische Hauptgebaeude, soweit bekannt; sonst dort, wo der Gegner
 * beginnt -- gegenueber dem eigenen Hauptgebaeude.
 */
export function vermutetesHaupt(k, haupt) {
  const b = k.gebaeude.find((g) => BUILDINGS[g.type].vital);
  return b || { id: 0, x: MAP - haupt.x, y: MAP - haupt.y, vermutet: true };
}

/** Steht hier ein bekanntes gegnerisches Gebaeude im Weg (fuer Bauplaetze)? */
export function bekanntBei(k, x, y, r) {
  return k.gebaeude.some((b) => dist2(x, y, b.x, b.y) < (r + BUILDINGS[b.type].radius) ** 2);
}
