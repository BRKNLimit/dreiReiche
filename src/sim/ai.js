// Einfacher Gegner. Bewusst dumm: er soll Druck erzeugen, damit sich die
// Domänenmechanik unter Stress zeigt. Nutzt nur issue(), nie direkten Zugriff.
// Nur Integer-Arithmetik und rng() -- dieselben Regeln wie die Simulation.

import { issue, dist2, isqrt, isCleared, anchorRadius, rng, cosDeg, sinDeg } from './sim.js';
import { BUILDINGS, UNITS, MAP } from './defs.js';

const PLAN = {
  mensch: { anker: 'turm', kraft: 'schmiede', fron: 'saege', fabrik: 'kaserne', leicht: 'landwehr', schwer: 'soeldner' },
  gott: { anker: 'hain', kraft: 'quelle', fron: 'moos', fabrik: 'dickicht', leicht: 'schratt', schwer: 'geweihter' },
};

export function createAI(player = 1, seed = 1) {
  return { player, next: 20, welle: 0, zug: 0, seed: seed | 0, unterwegs: [] };
}

export function stepAI(ai, world) {
  if (world.over || world.tick < ai.next) return;
  ai.next = world.tick + 22;

  const p = world.players[ai.player];
  const plan = PLAN[p.faction];
  const mine = world.entities.filter((e) => e.player === ai.player && !e.dead);
  const haupt = mine.find((e) => e.kind === 'building' && BUILDINGS[e.type].vital);
  if (!haupt) return;

  const bauten = mine.filter((e) => e.kind === 'building');
  const einheiten = mine.filter((e) => e.kind === 'unit');
  const zahl = (t) => bauten.filter((b) => b.type === t).length;
  const kosten = (t) => BUILDINGS[t].cost.fron;
  const fron = p.fron;
  const minute = (world.tick / 600) | 0;

  // Geplante Gegenwart-Bilanz: alles, was steht oder entsteht, als waere es
  // fertig. Wer Verbraucher setzt, ohne Quellen nachzuziehen, ueberbucht.
  let bilanz = 0;
  for (const b of bauten) {
    const d = BUILDINGS[b.type];
    bilanz += (d.gegenwartOut || 0) - (d.gegenwartIn || 0);
  }
  const ziel = gegnerHaupt(world, ai.player);
  // Alle Bauwinkel relativ zur Front, damit beide Sitzplaetze gleich spielen.
  const front = winkel(haupt, ziel || { x: MAP >> 1, y: MAP >> 1 });
  const bau = (building, x, y) => issue(world, { type: 'build', player: ai.player, building, x, y });

  // Wer keine Fabrik hat, baut sie zuerst nach der ersten Foerderung -- ohne
  // Armee ist jede Wirtschaft nur Beute.
  const fabrikZiel = Math.min(3, 1 + ((fron / 1500) | 0));
  const fronZiel = zahl(plan.fabrik) === 0 ? 1 : 3;
  const ader = freieAder(world, haupt, 'fron');

  // 1. Foerderung, aber nur mit Deckung.
  if (ader && zahl(plan.fron) < fronZiel && fron >= kosten(plan.fron)) {
    if (bilanz >= BUILDINGS[plan.fron].gegenwartIn) return bau(plan.fron, ader.x, ader.y);
  }

  // 2. Quelle, wenn der naechste Verbraucher nicht gedeckt waere.
  const naechster =
    ader && zahl(plan.fron) < fronZiel
      ? plan.fron
      : zahl(plan.fabrik) < fabrikZiel
        ? plan.fabrik
        : ader && zahl(plan.fron) < 3
          ? plan.fron
          : null;
  const bedarf = naechster ? BUILDINGS[naechster].gegenwartIn : 0;
  if (bilanz < bedarf && fron >= kosten(plan.kraft)) {
    const n = zahl(plan.kraft);
    return bau(plan.kraft, ...daheim(world, haupt, 700 + n * 250, front + 40 + n * 83));
  }

  // 3. Fabrik
  if (zahl(plan.fabrik) < fabrikZiel && fron >= kosten(plan.fabrik) && bilanz >= BUILDINGS[plan.fabrik].gegenwartIn) {
    const n = zahl(plan.fabrik);
    return bau(plan.fabrik, ...daheim(world, haupt, 900, front + 200 + n * 70));
  }

  // 4. Anker. Die Zahl steigt mit der Zeit, ausgebreitet in einem Faecher
  //    Richtung Gegner -- der eigentliche Vorteil fester Kreise.
  const ankerZiel = 2 + minute;
  if (zahl(plan.anker) < ankerZiel && fron >= kosten(plan.anker) + 150) {
    const n = zahl(plan.anker);
    const basis = front;
    const streu = (rng(ai) % 41) - 20;
    const faecher = ((n % 5) - 2) * 25 + streu;
    const schritt = 1800 + ((n / 5) | 0) * 1700 + (rng(ai) % 600);
    const x = grenze(haupt.x + ((schritt * cosDeg(basis + faecher)) / 1000) | 0);
    const y = grenze(haupt.y + ((schritt * sinDeg(basis + faecher)) / 1000) | 0);
    if (!BUILDINGS[plan.anker].needsGrowth || !isCleared(world, x, y)) return bau(plan.anker, x, y);
  }

  // 5. Stockende Baustelle: einen Anker dazwischensetzen.
  const steht = bauten.find((b) => !b.done && b.powered === 0);
  if (steht && fron >= kosten(plan.anker)) {
    const quelle = naechsteVersorgte(world, bauten, steht);
    if (quelle) {
      const x = (quelle.x + steht.x) >> 1;
      const y = (quelle.y + steht.y) >> 1;
      if (!BUILDINGS[plan.anker].needsGrowth || !isCleared(world, x, y)) return bau(plan.anker, x, y);
    }
  }

  // 6. Produktion: zwei leichte auf eine schwere, soweit die Fabrik sie kennt.
  //    Solange die Wirtschaft unvollstaendig ist, wird fuer den naechsten
  //    Bau gespart statt alles in Einheiten zu stecken.
  const sparen = naechster ? kosten(naechster) : 0;
  let rest = fron;
  const tiefe = fron > 900 ? 3 : 1;
  for (const f of bauten) {
    if (!f.done || !BUILDINGS[f.type].buildList || f.queue.length >= tiefe) continue;
    const liste = BUILDINGS[f.type].buildList;
    const wunsch = ai.zug % 3 === 2 ? plan.schwer : plan.leicht;
    const unit = liste.includes(wunsch) ? wunsch : liste.includes(plan.leicht) ? plan.leicht : null;
    if (!unit || rest - UNITS[unit].cost.fron < sparen) continue;
    rest -= UNITS[unit].cost.fron;
    ai.zug++;
    issue(world, { type: 'produce', player: ai.player, id: f.id, unit });
  }

  // 7. Verteidigung: Feinde nahe eigener Gebaeude ziehen alle Truppen an,
  //    die nicht gerade mit einer Welle unterwegs sind.
  const bedrohung = naechsterEindringling(world, ai.player, bauten);
  if (bedrohung) {
    const ids = einheiten.filter((u) => !ai.unterwegs.includes(u.id)).map((u) => u.id);
    if (ids.length) issue(world, { type: 'move', player: ai.player, ids, x: bedrohung.x, y: bedrohung.y });
  }

  // 8. Angriff in wachsenden Wellen. Wer schon unterwegs ist, bleibt dabei.
  ai.unterwegs = ai.unterwegs.filter((id) => einheiten.some((u) => u.id === id));
  const daheimStehend = einheiten.filter((u) => !ai.unterwegs.includes(u.id));
  if (!bedrohung && daheimStehend.length >= 8 + ai.welle * 3 && ziel) {
    ai.welle++;
    const ids = daheimStehend.map((u) => u.id);
    ai.unterwegs.push(...ids);
    issue(world, { type: 'move', player: ai.player, ids, x: ziel.x, y: ziel.y });
  }
}

/** Feindliche Einheit, die einem eigenen Gebaeude am naechsten gekommen ist. */
function naechsterEindringling(world, me, bauten) {
  const nah = 3000 * 3000;
  let best = null;
  let bestD = nah;
  for (const o of world.entities) {
    if (o.dead || o.player === me || o.kind !== 'unit') continue;
    for (const b of bauten) {
      const dd = dist2(o.x, o.y, b.x, b.y);
      if (dd < bestD) {
        bestD = dd;
        best = o;
      }
    }
  }
  return best;
}

function gegnerHaupt(world, me) {
  return world.entities.find(
    (e) => e.player !== me && !e.dead && e.kind === 'building' && BUILDINGS[e.type].vital
  );
}

function naechsteVersorgte(world, bauten, zu) {
  let best = null;
  let bestD = Infinity;
  for (const b of bauten) {
    if (!b.done) continue;
    const reg = world.regions[b.region];
    if (!reg || reg.supply === 0) continue;
    const dd = dist2(b.x, b.y, zu.x, zu.y);
    if (dd < bestD) {
      bestD = dd;
      best = b;
    }
  }
  return best;
}

function freieAder(world, von, kind) {
  let best = null;
  let bestD = Infinity;
  for (const d of world.deposits) {
    if (d.kind !== kind || d.takenBy !== 0) continue;
    const dd = dist2(von.x, von.y, d.x, d.y);
    if (dd < bestD) {
      bestD = dd;
      best = d;
    }
  }
  return best;
}

const grenze = (v) => Math.max(400, Math.min(MAP - 400, v | 0));

/** Platz um das Hauptgebaeude, aber innerhalb der eigenen Domaene, solange sie klein ist. */
function daheim(world, haupt, radius, grad) {
  const r = Math.min(radius, Math.max(300, anchorRadius(world, haupt) - 150));
  return [grenze(haupt.x + ((r * cosDeg(grad)) / 1000) | 0), grenze(haupt.y + ((r * sinDeg(grad)) / 1000) | 0)];
}

/** Richtung von a nach b in ganzen Grad, ueber eine Integer-Suche in der Tabelle. */
function winkel(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = isqrt(dx * dx + dy * dy);
  if (d === 0) return 0;
  let best = 0;
  let bestS = -Infinity;
  for (let g = 0; g < 360; g++) {
    const s = dx * cosDeg(g) + dy * sinDeg(g);
    if (s > bestS) {
      bestS = s;
      best = g;
    }
  }
  return best;
}
