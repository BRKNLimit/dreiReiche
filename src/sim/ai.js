// Einfacher Gegner. Bewusst dumm: er soll Druck erzeugen, damit sich die
// Domänenmechanik unter Stress zeigt. Nutzt nur issue(), nie direkten Zugriff.

import { issue, findDeposit, dist2, isCleared } from './sim.js';
import { BUILDINGS, MAP } from './defs.js';

const PLAN = {
  mensch: { anker: 'turm', kraft: 'schmiede', fron: 'saege', fabrik: 'kaserne', einheiten: ['landwehr', 'soeldner'] },
  gott: { anker: 'hain', kraft: 'quelle', fron: 'moos', fabrik: 'dickicht', einheiten: ['schratt', 'geweihter'] },
};

export function createAI(player = 1) {
  return { player, next: 20, welle: 0 };
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
  const fron = p.fron;

  // Bauordnung: Fron, dann Gegenwart, dann Anker nach vorn, dann Fabrik.
  if (zahl(plan.fron) < 3 && fron > BUILDINGS[plan.fron].cost.fron) {
    const ader = freieAder(world, haupt, 'fron');
    if (ader) {
      issue(world, { type: 'build', player: ai.player, building: plan.fron, x: ader.x, y: ader.y });
      return;
    }
  }
  if (zahl(plan.kraft) < 1 + zahl(plan.fabrik) && fron > BUILDINGS[plan.kraft].cost.fron) {
    const q = nahe(haupt, 1100 + zahl(plan.kraft) * 300, zahl(plan.kraft) * 83);
    issue(world, { type: 'build', player: ai.player, building: plan.kraft, x: q.x, y: q.y });
    return;
  }
  if (zahl(plan.anker) < 3 && fron > BUILDINGS[plan.anker].cost.fron + 200) {
    const ziel = gegnerHaupt(world, ai.player);
    const schritt = 1800 + zahl(plan.anker) * 1500;
    const a = richtung(haupt, ziel || haupt, schritt);
    // Der Gott kann nicht auf gerodetem Boden pflanzen.
    if (!BUILDINGS[plan.anker].needsGrowth || !isCleared(world, a.x, a.y)) {
      issue(world, { type: 'build', player: ai.player, building: plan.anker, x: a.x, y: a.y });
      return;
    }
  }
  if (zahl(plan.fabrik) < 2 && fron > BUILDINGS[plan.fabrik].cost.fron) {
    const q = nahe(haupt, 1500, 200 + zahl(plan.fabrik) * 70);
    issue(world, { type: 'build', player: ai.player, building: plan.fabrik, x: q.x, y: q.y });
    return;
  }

  // Stockende Baustelle: einen Anker dazwischensetzen.
  const steht = bauten.find((b) => !b.done && b.powered === 0);
  if (steht && fron > BUILDINGS[plan.anker].cost.fron) {
    const quelle = naechsteVersorgte(world, bauten, steht);
    if (quelle) {
      const m = { x: (quelle.x + steht.x) >> 1, y: (quelle.y + steht.y) >> 1 };
      if (!BUILDINGS[plan.anker].needsGrowth || !isCleared(world, m.x, m.y)) {
        issue(world, { type: 'build', player: ai.player, building: plan.anker, x: m.x, y: m.y });
        return;
      }
    }
  }

  // Produktion
  for (const f of bauten.filter((b) => b.done && BUILDINGS[b.type].buildList)) {
    if (f.queue.length < (fron > 900 ? 4 : 2)) {
      const u = (world.tick / 22) % 3 === 0 ? plan.einheiten[0] : plan.einheiten[1];
      issue(world, { type: 'produce', player: ai.player, id: f.id, unit: u });
    }
  }

  // Angriff
  if (einheiten.length >= 5 + ai.welle * 2) {
    ai.welle++;
    const ziel = gegnerHaupt(world, ai.player);
    if (ziel) {
      issue(world, {
        type: 'move',
        player: ai.player,
        ids: einheiten.map((u) => u.id),
        x: ziel.x,
        y: ziel.y,
      });
    }
  }
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

function nahe(von, radius, winkel) {
  const a = (winkel * Math.PI) / 180;
  return { x: grenze(von.x + Math.cos(a) * radius), y: grenze(von.y + Math.sin(a) * radius) };
}

function richtung(von, zu, schritt) {
  const dx = zu.x - von.x;
  const dy = zu.y - von.y;
  const d = Math.max(1, Math.round(Math.sqrt(dx * dx + dy * dy)));
  return { x: grenze(von.x + (dx * schritt) / d), y: grenze(von.y + (dy * schritt) / d) };
}
