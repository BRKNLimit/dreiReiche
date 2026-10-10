// Einfacher Gegner. Bewusst dumm: er soll Druck erzeugen, damit sich die
// Domänenmechanik unter Stress zeigt. Nutzt nur issue(), nie direkten Zugriff.
// Nur Integer-Arithmetik und rng() -- dieselben Regeln wie die Simulation.

import { issue, dist2, isqrt, isCleared, anchorRadius, inDomain, rng, cosDeg, sinDeg } from './sim.js';
import { BUILDINGS, UNITS, FACTIONS, MAP } from './defs.js';

const PLAN = {
  mensch: { anker: 'turm', kraft: 'schmiede', fron: 'saege', blut: 'schacht', fabrik: 'kaserne', leicht: 'landwehr', schwer: 'soeldner' },
  gott: { anker: 'hain', kraft: 'quelle', fron: 'moos', blut: 'blutwurz', fabrik: 'dickicht', leicht: 'schratt', schwer: 'geweihter' },
};

export function createAI(player = 1, seed = 1) {
  return { player, next: 20, welle: 0, zug: 0, seed: seed | 0, unterwegs: [], welleZiel: 0 };
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
  // Fabriken nach Spielzeit, nicht nach Vorrat: wer spart, soll nicht weniger bauen.
  const fabrikZiel = 1 + (minute >= 6 ? 1 : 0) + (minute >= 11 ? 1 : 0);
  const fronZiel = zahl(plan.fabrik) === 0 ? 1 : 3;
  const ader = freieAder(world, haupt, 'fron');

  // Goetterblut liegt in der Mitte. Ein Schacht braucht Gegenwart, also muss
  // die Ader in einer versorgten eigenen Domaene liegen -- hier zaehlt Reichweite.
  // Erst wenn Fron-Foerderung und Fabrik stehen -- sonst frisst der Vorstoss die Wirtschaft.
  const wirtschaftSteht = zahl(plan.fabrik) > 0 && (zahl(plan.fron) >= 3 || !ader);
  const blutZiel = !wirtschaftSteht ? 0 : minute >= 12 ? 2 : 1;
  const vene = zahl(plan.blut) < blutZiel ? freieAder(world, haupt, 'goetterblut') : null;
  const veneBereit = vene && versorgt(world, ai.player, vene);

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
        : veneBereit
          ? plan.blut
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

  // 3b. Goetterblut: Schacht auf die Ader, oder die Domaene zur Ader schieben.
  if (veneBereit && fron >= kosten(plan.blut) && bilanz >= BUILDINGS[plan.blut].gegenwartIn) {
    return bau(plan.blut, vene.x, vene.y);
  }
  const ankerImBau = bauten.some((b) => !b.done && BUILDINGS[b.type].anchor);
  if (vene && !veneBereit && !ankerImBau && fron >= kosten(plan.anker) + 100) {
    // Lohnt der Vorstoss? Nur wenn zwei neue Anker die Luecke schliessen.
    // Sonst warten: wachsende Kreise oder Anker am Rand bringen die Ader naeher.
    // Dieselbe Regel fuer alle -- der Startradius der Fraktion entscheidet.
    const platz = vorstoss(world, ai.player, haupt, vene, plan.anker);
    const start = FACTIONS[p.faction].growth.start;
    if (platz && dist2(platz.x, platz.y, vene.x, vene.y) <= 4 * start * start) {
      return bau(plan.anker, platz.x, platz.y);
    }
  }

  // 4. Anker. Die Zahl steigt mit der Zeit. Jeder neue Anker kommt an den
  //    Rand der eigenen Domaene, moeglichst weit weg von den bestehenden --
  //    sonst ueberdecken sich die Kreise und Wachstum bringt keine Flaeche.
  const ankerZiel = 2 + minute;
  if (zahl(plan.anker) < ankerZiel && fron >= kosten(plan.anker) + 250) {
    const platz = randplatz(world, ai, haupt, front, bauten, plan.anker);
    if (platz) return bau(plan.anker, platz.x, platz.y);
  }

  // 5. Stockende Baustelle: einen Anker dazwischensetzen.
  const steht = bauten.find((b) => !b.done && b.powered === 0);
  if (steht && fron >= kosten(plan.anker)) {
    const quelle = naechsteVersorgte(world, bauten, steht);
    if (quelle) {
      const x = quelle.x + (((steht.x - quelle.x) / 2) | 0);
      const y = quelle.y + (((steht.y - quelle.y) / 2) | 0);
      if (!BUILDINGS[plan.anker].needsGrowth || !isCleared(world, x, y)) return bau(plan.anker, x, y);
    }
  }

  // 6. Produktion: zwei leichte auf eine schwere, soweit die Fabrik sie kennt.
  //    Solange die Wirtschaft unvollstaendig ist, wird fuer den naechsten
  //    Bau gespart statt alles in Einheiten zu stecken.
  const sparen = naechster ? kosten(naechster) : vene ? kosten(plan.anker) + 100 : 0;
  let rest = fron;
  let blutRest = p.goetterblut;
  const blutSchwer = UNITS[plan.schwer].cost.goetterblut || 0;
  const tiefe = fron > 900 ? 3 : fron > 400 ? 2 : 1;
  for (const f of bauten) {
    if (!f.done || !BUILDINGS[f.type].buildList || f.queue.length >= tiefe) continue;
    const liste = BUILDINGS[f.type].buildList;
    // Schwer, sobald Goetterblut reicht -- reichlich Blut heisst nur noch schwer.
    const schwerMoeglich = blutRest >= blutSchwer;
    const reichlich = blutSchwer > 0 && blutRest >= 3 * blutSchwer;
    const wunsch = schwerMoeglich && (ai.zug % 3 === 2 || reichlich) ? plan.schwer : plan.leicht;
    const unit = liste.includes(wunsch) ? wunsch : liste.includes(plan.leicht) ? plan.leicht : null;
    if (!unit || rest - UNITS[unit].cost.fron < sparen) continue;
    rest -= UNITS[unit].cost.fron;
    blutRest -= UNITS[unit].cost.goetterblut || 0;
    ai.zug++;
    issue(world, { type: 'produce', player: ai.player, id: f.id, unit });
  }

  // 7. Verteidigung: Feinde nahe eigener Gebaeude ziehen alle Truppen an,
  //    die nicht gerade mit einer Welle unterwegs sind.
  const bedrohung = naechsterEindringling(world, ai.player, bauten);
  if (bedrohung) {
    const ids = einheiten.filter((u) => !ai.unterwegs.includes(u.id)).map((u) => u.id);
    if (ids.length) issue(world, { type: 'attack', player: ai.player, ids, x: bedrohung.x, y: bedrohung.y });
  }

  // 8. Angriff in wachsenden Wellen. Erstes Ziel ist ein gegnerischer
  //    Foerderbau fuer Goetterblut -- die Mitte entscheidet --, sonst das
  //    Hauptgebaeude. Faellt das Ziel, zieht die Welle zum naechsten weiter.
  ai.unterwegs = ai.unterwegs.filter((id) => einheiten.some((u) => u.id === id));
  const daheimStehend = einheiten.filter((u) => !ai.unterwegs.includes(u.id));
  const angriff = gegnerFoerderung(world, ai.player, haupt) || ziel;
  if (ai.unterwegs.length && angriff && !world.entities.some((e) => e.id === ai.welleZiel && !e.dead)) {
    ai.welleZiel = angriff.id;
    issue(world, { type: 'attack', player: ai.player, ids: ai.unterwegs.slice(), x: angriff.x, y: angriff.y });
  }
  if (!bedrohung && daheimStehend.length >= 8 + ai.welle * 3 && angriff) {
    ai.welle++;
    ai.welleZiel = angriff.id;
    const ids = daheimStehend.map((u) => u.id);
    ai.unterwegs.push(...ids);
    issue(world, { type: 'attack', player: ai.player, ids, x: angriff.x, y: angriff.y });
    return;
  }

  // 9. Sammeln am vordersten Anker. Wer wartet, wartet an der Grenze -- dort,
  //    wo die eigene Domaene dem Gegner am naechsten ist.
  if (!bedrohung && ziel) {
    const vorn = vordersterAnker(world, bauten, ziel);
    if (vorn) {
      const ids = daheimStehend
        .filter((u) => dist2(u.x, u.y, vorn.x, vorn.y) > 700 * 700)
        .map((u) => u.id);
      if (ids.length) issue(world, { type: 'move', player: ai.player, ids, x: vorn.x, y: vorn.y });
    }
  }
}

/**
 * Bauplatz fuer einen Anker: in der eigenen Domaene (sonst steht die
 * Baustelle ohne Gegenwart), im Halbkreis Richtung Front, und dort, wo der
 * naechste eigene Anker am weitesten weg ist.
 */
function randplatz(world, ai, haupt, front, bauten, typ) {
  const def = BUILDINGS[typ];
  const anker = bauten.filter((b) => BUILDINGS[b.type].anchor);
  const versatz = (rng(ai) % 9) - 4;
  let best = null;
  let bestS = -1;
  for (let g = -90; g <= 90; g += 10) {
    const grad = front + g + versatz;
    for (let d = 1000; d <= 14000; d += 400) {
      const x = grenze(haupt.x + (((d * cosDeg(grad)) / 1000) | 0));
      const y = grenze(haupt.y + (((d * sinDeg(grad)) / 1000) | 0));
      if (!inDomain(world, ai.player, x, y)) continue;
      if (def.needsGrowth && isCleared(world, x, y)) continue;
      if (blockiert(world, x, y, def.radius)) continue;
      let s = Infinity;
      for (const a of anker) s = Math.min(s, dist2(x, y, a.x, a.y));
      if (s > bestS) {
        bestS = s;
        best = { x, y };
      }
    }
  }
  return best;
}

/** Liegt der Punkt im Kreis eines eigenen fertigen Ankers, dessen Netz Gegenwart hat? */
function versorgt(world, me, pt) {
  for (const e of world.entities) {
    if (e.dead || e.player !== me || e.kind !== 'building') continue;
    const r = anchorRadius(world, e);
    if (r === 0 || dist2(pt.x, pt.y, e.x, e.y) > r * r) continue;
    const reg = world.regions[e.region];
    if (reg && reg.supply > 0) return true;
  }
  return false;
}

/**
 * Bauplatz fuer einen Anker auf dem Weg zu einer Ader: der Punkt der eigenen
 * Domaene, der ihr am naechsten liegt. Gesucht wird auf der Linie von der
 * Ader zum Hauptgebaeude, mit etwas seitlichem Spielraum.
 */
function vorstoss(world, me, haupt, ziel, typ) {
  const def = BUILDINGS[typ];
  const dx = haupt.x - ziel.x;
  const dy = haupt.y - ziel.y;
  const d = isqrt(dx * dx + dy * dy);
  if (d === 0) return null;
  for (let s = 0; s <= d; s += 300) {
    for (const quer of [0, 300, -300, 600, -600]) {
      const x = grenze(ziel.x + (((dx * s - dy * quer) / d) | 0));
      const y = grenze(ziel.y + (((dy * s + dx * quer) / d) | 0));
      if (!inDomain(world, me, x, y)) continue;
      if (def.needsGrowth && isCleared(world, x, y)) continue;
      if (blockiert(world, x, y, def.radius)) continue;
      return { x, y };
    }
  }
  return null;
}

/** Steht hier schon ein Gebaeude im Weg? Dieselbe Regel wie tryPlace(). */
function blockiert(world, x, y, radius) {
  for (const e of world.entities) {
    if (e.dead || e.kind !== 'building') continue;
    const min = radius + BUILDINGS[e.type].radius + 20;
    if (dist2(x, y, e.x, e.y) < min * min) return true;
  }
  return false;
}

/** Fertiger Anker, der dem Ziel am naechsten steht. */
function vordersterAnker(world, bauten, ziel) {
  let best = null;
  let bestD = Infinity;
  for (const b of bauten) {
    if (!b.done || anchorRadius(world, b) === 0) continue;
    const dd = dist2(b.x, b.y, ziel.x, ziel.y);
    if (dd < bestD) {
      bestD = dd;
      best = b;
    }
  }
  return best;
}

/**
 * Feindliche Einheit, die einem eigenen Gebaeude am naechsten gekommen ist --
 * oder die irgendwo in der eigenen Domaene steht. Eine grosse Domaene ist
 * damit auch ein grosses Gebiet, das verteidigt wird.
 */
function naechsterEindringling(world, me, bauten) {
  const nah = 3000 * 3000;
  let best = null;
  let bestD = nah;
  let drin = null;
  for (const o of world.entities) {
    if (o.dead || o.player === me || o.kind !== 'unit') continue;
    if (!drin && inDomain(world, me, o.x, o.y)) drin = o;
    for (const b of bauten) {
      const dd = dist2(o.x, o.y, b.x, b.y);
      if (dd < bestD) {
        bestD = dd;
        best = o;
      }
    }
  }
  return best || drin;
}

/** Naechster gegnerischer Foerderbau fuer Goetterblut, vom eigenen Hauptgebaeude aus. */
function gegnerFoerderung(world, me, haupt) {
  let best = null;
  let bestD = Infinity;
  for (const e of world.entities) {
    if (e.dead || e.player === me || e.kind !== 'building' || !BUILDINGS[e.type].blutOut) continue;
    const dd = dist2(e.x, e.y, haupt.x, haupt.y);
    if (dd < bestD) {
      bestD = dd;
      best = e;
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
  return [grenze(haupt.x + (((r * cosDeg(grad)) / 1000) | 0)), grenze(haupt.y + (((r * sinDeg(grad)) / 1000) | 0))];
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
