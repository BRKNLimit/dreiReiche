// Simulationskern. Engine-frei, deterministisch, nur Integer-Arithmetik.
// Siehe CLAUDE.md fuer die Regeln, die dieser Code einhalten muss.

import { BUILDINGS, UNITS, FACTIONS, MAP, PRIO, START_FRON, RULES, RESOURCES } from './defs.js';

// ---------------------------------------------------------------- Mathematik

/** Deterministischer PRNG (mulberry32). Veraendert state.seed. */
export function rng(state) {
  state.seed = (state.seed + 0x6d2b79f5) | 0;
  let t = state.seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) % 1000000;
}

/** Integer-Wurzel. Kein Math.sqrt: Gleitkomma ist nicht plattformstabil. */
export function isqrt(n) {
  if (n <= 0) return 0;
  let x = n;
  let y = (x + 1) >> 1;
  while (y < x) {
    x = y;
    y = (x + ((n / x) | 0)) >> 1;
  }
  return x;
}

export function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function dist(ax, ay, bx, by) {
  return isqrt(dist2(ax, ay, bx, by));
}

// ------------------------------------------------- DIE EINE REGEL

/**
 * Der Radius eines Ankers. Das ist die gesamte Asymmetrie zwischen den
 * Fraktionen: eine Zeile, drei Zahlen aus FACTIONS[f].growth.
 *
 *   Menschen -> start == max, perTick 0  -> fest ab Bauende
 *   Gott     -> start klein, waechst     -> frueh winzig, spaet riesig
 */
export function anchorRadius(world, e) {
  if (!BUILDINGS[e.type].anchor || !e.done) return 0;
  const g = FACTIONS[world.players[e.player].faction].growth;
  const age = world.tick - e.doneAt;
  return Math.min(g.max, g.start + age * g.perTick);
}

const PER_MIN = 600 * 1000;

// ------------------------------------------------------------------ Weltbau

export function createWorld(opts = {}) {
  const f0 = opts.factions?.[0] ?? 'mensch';
  const f1 = opts.factions?.[1] ?? 'gott';
  const world = {
    tick: 0,
    seed: opts.seed ?? 12345,
    nextId: 1,
    entities: [],
    players: [
      { id: 0, faction: f0, fron: START_FRON, goetterblut: 0, alive: true },
      { id: 1, faction: f1, fron: START_FRON, goetterblut: 0, alive: true },
    ],
    deposits: [],
    cleared: [], // gerodete Flaechen: { x, y, r }
    regions: [],
    pending: [],
    events: [],
    over: false,
    winner: -1,
  };
  if (!opts.empty) setupMap(world);
  return world;
}

function setupMap(world) {
  const lo = 3000;
  const hi = MAP - 3000;

  for (let p = 0; p < 2; p++) {
    const f = world.players[p].faction;
    const home = f === 'mensch' ? 'halle' : 'herzbaum';
    spawnBuilding(world, p, home, p === 0 ? lo : hi, p === 0 ? lo : hi, true);
  }

  const spots = [
    [lo + 1800, lo - 800],
    [lo - 800, lo + 1800],
    [lo + 3200, lo + 1500],
    [hi - 1800, hi + 800],
    [hi + 800, hi - 1800],
    [hi - 3200, hi - 1500],
    // Mitte: punktsymmetrisch, je eine Ader naeher an jedem Spieler.
    [MAP >> 1, (MAP >> 1) - 2600],
    [MAP >> 1, (MAP >> 1) + 2600],
  ];
  for (const [x, y] of spots) {
    world.deposits.push({ x: clamp(x), y: clamp(y), kind: 'fron', takenBy: 0 });
  }
  // Goetterblut: drei Adern auf der Mittelachse, der Streitpunkt.
  world.deposits.push({ x: MAP >> 1, y: MAP >> 1, kind: 'goetterblut', takenBy: 0 });
  world.deposits.push({ x: (MAP >> 1) - 3400, y: (MAP >> 1) + 3400, kind: 'goetterblut', takenBy: 0 });
  world.deposits.push({ x: (MAP >> 1) + 3400, y: (MAP >> 1) - 3400, kind: 'goetterblut', takenBy: 0 });
}

function clamp(v) {
  return Math.max(300, Math.min(MAP - 300, v));
}

export function spawnBuilding(world, player, type, x, y, finished = false) {
  const def = BUILDINGS[type];
  const e = {
    id: world.nextId++,
    kind: 'building',
    type,
    player,
    x: x | 0,
    y: y | 0,
    hp: finished ? def.hp : Math.max(1, def.hp / 10) | 0,
    maxHp: def.hp,
    done: finished,
    doneAt: finished ? 0 : -1,
    progress: finished ? def.buildTime * 1000 : 0,
    region: -1,
    powered: 1000,
    queue: [],
    spawned: 0,
    queueProgress: 0,
    cooldown: 0,
    dead: false,
  };
  world.entities.push(e);
  if (finished && def.clears) clearGround(world, e);
  return e;
}

export function spawnUnit(world, player, type, x, y) {
  const def = UNITS[type];
  const e = {
    id: world.nextId++,
    kind: 'unit',
    type,
    player,
    x: x | 0,
    y: y | 0,
    hp: def.hp,
    maxHp: def.hp,
    tx: x | 0,
    ty: y | 0,
    cooldown: 0,
    dead: false,
  };
  world.entities.push(e);
  return e;
}

/** Ein Saegewerk rodet den Boden ringsum. Dort kann der Gott nicht pflanzen. */
function clearGround(world, e) {
  world.cleared.push({ x: e.x, y: e.y, r: BUILDINGS[e.type].clears });
  world.events.push({ t: 'cleared', x: e.x, y: e.y, r: BUILDINGS[e.type].clears });
}

export function isCleared(world, x, y) {
  for (let i = 0; i < world.cleared.length; i++) {
    const c = world.cleared[i];
    if (dist2(x, y, c.x, c.y) <= c.r * c.r) return true;
  }
  return false;
}

// ------------------------------------------------------------------ Befehle

export function issue(world, cmd) {
  world.pending.push(cmd);
}

/**
 * Befehle reihum: in jedem Tick beginnt ein anderer Spieler. Wollen zwei
 * dieselbe Ader im selben Tick, gewinnt nicht immer derselbe Sitzplatz.
 * Innerhalb eines Spielers bleibt die Reihenfolge seiner Befehle erhalten.
 */
function applyCommands(world) {
  const n = world.players.length;
  for (let k = 0; k < n; k++) {
    const player = (world.tick + k) % n;
    for (let i = 0; i < world.pending.length; i++) {
      if (world.pending[i].player === player) applyCommand(world, world.pending[i]);
    }
  }
  world.pending.length = 0;
}

function applyCommand(world, c) {
  {
    if (c.type === 'move') {
      for (let k = 0; k < c.ids.length; k++) {
        const e = byId(world, c.ids[k]);
        if (e && e.kind === 'unit' && e.player === c.player && !e.dead) {
          e.tx = c.x | 0;
          e.ty = c.y | 0;
        }
      }
    } else if (c.type === 'build') {
      tryPlace(world, c.player, c.building, c.x | 0, c.y | 0);
    } else if (c.type === 'demolish') {
      demolish(world, c.player, c.id);
    } else if (c.type === 'produce') {
      const e = byId(world, c.id);
      if (e && e.player === c.player && e.done && !e.dead) {
        const def = BUILDINGS[e.type];
        if (def.buildList && def.buildList.includes(c.unit) && e.queue.length < 8) {
          const p = world.players[c.player];
          if (canAfford(p, UNITS[c.unit].cost)) {
            pay(p, UNITS[c.unit].cost, 1000);
            e.queue.push(c.unit);
          }
        }
      }
    }
  }
}

/**
 * Platzierung. Bauen ausserhalb der eigenen Domaene ist erlaubt -- die
 * Baustelle hat dann nur keine Gegenwart und steht still. Genau darum geht es.
 */
export function tryPlace(world, player, type, x, y) {
  const def = BUILDINGS[type];
  if (!def || def.vital) return null;
  if (def.faction !== world.players[player].faction) return null;
  const p = world.players[player];
  if (!canAfford(p, def.cost)) return null;
  if (x < 200 || y < 200 || x > MAP - 200 || y > MAP - 200) return null;

  let dep = null;
  if (def.needs) {
    dep = findDeposit(world, x, y, def.needs);
    if (!dep || dep.takenBy !== 0) return null;
    x = dep.x;
    y = dep.y;
  }
  // Ein Hain braucht ungerodeten Boden.
  if (def.needsGrowth && isCleared(world, x, y)) return null;

  for (let i = 0; i < world.entities.length; i++) {
    const e = world.entities[i];
    if (e.dead || e.kind !== 'building') continue;
    const min = def.radius + BUILDINGS[e.type].radius;
    if (dist2(x, y, e.x, e.y) < min * min) return null;
  }

  pay(p, def.cost, 1000);
  const b = spawnBuilding(world, player, type, x, y, false);
  if (dep) dep.takenBy = b.id;
  return b;
}

/**
 * Abriss. Ein Ausweg aus Fehlplanungen: Baustellen bringen drei Viertel der
 * Kosten zurueck, fertige Gebaeude die Haelfte, Bauauftraege voll. Gerodeter
 * Boden bleibt gerodet. Hauptgebaeude lassen sich nicht abreissen.
 */
export function demolish(world, player, id) {
  const e = byId(world, id);
  if (!e || e.dead || e.kind !== 'building' || e.player !== player) return false;
  const def = BUILDINGS[e.type];
  if (def.vital) return false;
  const p = world.players[player];
  const vorher = p.fron;
  pay(p, def.cost, e.done ? -500 : -750);
  for (let i = 0; i < e.queue.length; i++) pay(p, UNITS[e.queue[i]].cost, -1000);
  e.dead = true;
  world.events.push({ t: 'demolished', id: e.id, x: e.x, y: e.y, fron: p.fron - vorher });
  return true;
}

/** Reicht der Vorrat fuer diese Kosten? Kosten sind { ressource: menge }. */
export function canAfford(p, cost) {
  for (let i = 0; i < RESOURCES.length; i++) {
    const r = RESOURCES[i];
    if ((cost[r] || 0) > p[r]) return false;
  }
  return true;
}

/** Zieht Kosten ab (promille > 0) oder erstattet sie anteilig (promille < 0). */
function pay(p, cost, promille) {
  for (let i = 0; i < RESOURCES.length; i++) {
    const r = RESOURCES[i];
    if (cost[r]) p[r] -= ((cost[r] * promille) / 1000) | 0;
  }
}

export function findDeposit(world, x, y, kind, maxDist = 700) {
  let best = null;
  let bestD = maxDist * maxDist;
  for (let i = 0; i < world.deposits.length; i++) {
    const d = world.deposits[i];
    if (d.kind !== kind) continue;
    const dd = dist2(x, y, d.x, d.y);
    if (dd <= bestD) {
      bestD = dd;
      best = d;
    }
  }
  return best;
}

export function byId(world, id) {
  for (let i = 0; i < world.entities.length; i++) {
    if (world.entities[i].id === id) return world.entities[i];
  }
  return null;
}

// ------------------------------------------------------- Domäne und Gegenwart

/** Liegt der Punkt in der Domäne dieses Spielers? */
export function inDomain(world, player, x, y) {
  for (let i = 0; i < world.entities.length; i++) {
    const e = world.entities[i];
    if (e.dead || e.player !== player || e.kind !== 'building') continue;
    const r = anchorRadius(world, e);
    if (r > 0 && dist2(x, y, e.x, e.y) <= r * r) return true;
  }
  return false;
}

/** Liegt der Punkt in der Domaene irgendeines anderen Spielers? */
export function inForeignDomain(world, player, x, y) {
  for (let p = 0; p < world.players.length; p++) {
    if (p !== player && inDomain(world, p, x, y)) return true;
  }
  return false;
}

/**
 * Regionen: zusammenhaengende Teile einer Domäne. Zwei Gebäude gehoeren
 * zusammen, wenn sich ihre Ankerkreise ueberschneiden -- oder wenn ein
 * Nicht-Anker im Kreis eines Ankers steht.
 */
export function computeRegions(world) {
  const bs = [];
  for (let i = 0; i < world.entities.length; i++) {
    const e = world.entities[i];
    if (!e.dead && e.kind === 'building') {
      e.region = -1;
      e.anchorR = anchorRadius(world, e);
      bs.push(e);
    }
  }

  const linked = (a, b) => {
    if (a.player !== b.player) return false;
    const d2 = dist2(a.x, a.y, b.x, b.y);
    const ra = a.anchorR;
    const rb = b.anchorR;
    if (ra > 0 && rb > 0) return d2 <= (ra + rb) * (ra + rb);
    if (ra > 0) return d2 <= ra * ra;
    if (rb > 0) return d2 <= rb * rb;
    return false; // zwei Nicht-Anker verbinden sich nie direkt
  };

  const regions = [];
  for (let i = 0; i < bs.length; i++) {
    if (bs[i].region !== -1) continue;
    const idx = regions.length;
    const members = [];
    const stack = [bs[i]];
    bs[i].region = idx;
    while (stack.length) {
      const cur = stack.pop();
      members.push(cur);
      for (let j = 0; j < bs.length; j++) {
        const other = bs[j];
        if (other.region !== -1) continue;
        if (linked(cur, other)) {
          other.region = idx;
          stack.push(other);
        }
      }
    }
    members.sort((a, b) => a.id - b.id);
    regions.push({
      index: idx,
      player: members[0].player,
      members,
      supply: 0,
      demand: 0,
      byPrio: [0, 0, 0, 0],
      satPrio: [1000, 1000, 1000, 1000],
    });
  }
  world.regions = regions;
  return regions;
}

export function distributeGegenwart(world) {
  for (let r = 0; r < world.regions.length; r++) {
    const reg = world.regions[r];
    let supply = 0;
    const demand = [0, 0, 0, 0];

    for (let i = 0; i < reg.members.length; i++) {
      const e = reg.members[i];
      const def = BUILDINGS[e.type];
      if (e.done && def.gegenwartOut) supply += def.gegenwartOut;
      const d = demandOf(e);
      if (d > 0) demand[prioOf(e)] += d;
    }

    reg.supply = supply;
    reg.demand = demand[0] + demand[1] + demand[2] + demand[3];
    reg.byPrio = demand;

    // Mindestfluss: ein kleiner Teil bleibt fuer Werk reserviert, damit eine
    // ueberbuchte Domaene sich selbst aus dem Loch bauen kann.
    const reserve = Math.min(demand[PRIO.werk], ((supply * RULES.werkFloor) / 1000) | 0);
    let left = supply - reserve;
    for (let p = 0; p < 4; p++) {
      if (p === PRIO.werk) left += reserve;
      if (demand[p] === 0) {
        reg.satPrio[p] = 1000;
        continue;
      }
      if (left >= demand[p]) {
        reg.satPrio[p] = 1000;
        left -= demand[p];
      } else {
        reg.satPrio[p] = ((left * 1000) / demand[p]) | 0;
        left = 0;
      }
    }

    for (let i = 0; i < reg.members.length; i++) {
      const e = reg.members[i];
      e.powered = demandOf(e) > 0 ? reg.satPrio[prioOf(e)] : 1000;
    }
  }
}

function demandOf(e) {
  const def = BUILDINGS[e.type];
  if (!e.done) return Math.max(8, (def.gegenwartIn || 20) >> 1);
  if (!def.gegenwartIn) return 0;
  if (def.buildList && e.queue.length === 0) return 0;
  return def.gegenwartIn;
}

function prioOf(e) {
  const def = BUILDINGS[e.type];
  if (!e.done) return PRIO.werk;
  return def.prio === undefined ? PRIO.segen : def.prio;
}

// --------------------------------------------------------------- Tick

export function step(world) {
  if (world.over) return world;
  world.events.length = 0;
  applyCommands(world);
  computeRegions(world);
  distributeGegenwart(world);

  for (let i = 0; i < world.entities.length; i++) {
    const e = world.entities[i];
    if (e.dead || e.kind !== 'building') continue;
    const def = BUILDINGS[e.type];

    if (!e.done) {
      // Leben waechst mit dem Fortschritt, Schaden bleibt aber stehen:
      // es kommt nur der Zuwachs dazu, nicht der Sollwert.
      const need = def.buildTime * 1000;
      const before = siteHp(def, e.progress, need);
      e.progress += e.powered;
      e.hp = Math.min(def.hp, e.hp + siteHp(def, e.progress, need) - before);
      if (e.progress >= need) {
        e.done = true;
        e.doneAt = world.tick;
        if (def.clears) clearGround(world, e);
        world.events.push({ t: 'built', id: e.id });
      }
      continue;
    }

    const pl = world.players[e.player];
    if (def.fronOut) pl.fronAcc = (pl.fronAcc || 0) + def.fronOut * e.powered;
    if (def.blutOut) pl.blutAcc = (pl.blutAcc || 0) + def.blutOut * e.powered;

    if (e.queue.length > 0) {
      e.queueProgress += e.powered;
      const need = UNITS[e.queue[0]].buildTime * 1000;
      if (e.queueProgress >= need) {
        const type = e.queue.shift();
        e.queueProgress = 0;
        // Einheiten treten zur Kartenmitte hin aus, seitlich gestreut nach
        // einem Zaehler je Gebaeude. Punktsymmetrisch: beide Sitzplaetze
        // erhalten dieselbe Lage. Versatz zur Null hin runden, nicht die Summe.
        const off = def.radius + 90;
        const quer = ((e.spawned % 5) - 2) * 60;
        e.spawned++;
        let dx = (MAP >> 1) - e.x;
        let dy = (MAP >> 1) - e.y;
        let d = isqrt(dx * dx + dy * dy);
        if (d === 0) {
          dx = 1;
          dy = 0;
          d = 1;
        }
        const ux = e.x + (((dx * off - dy * quer) / d) | 0);
        const uy = e.y + (((dy * off + dx * quer) / d) | 0);
        const u = spawnUnit(world, e.player, type, clamp(ux), clamp(uy));
        world.events.push({ t: 'spawned', id: u.id });
      }
    }
  }

  for (let p = 0; p < world.players.length; p++) {
    const pl = world.players[p];
    // Foerderung ist pro Minute angegeben, powered in Promille: 600 Ticks x 1000.
    if (pl.fronAcc) {
      pl.fron += (pl.fronAcc / PER_MIN) | 0;
      pl.fronAcc %= PER_MIN;
    }
    if (pl.blutAcc) {
      pl.goetterblut += (pl.blutAcc / PER_MIN) | 0;
      pl.blutAcc %= PER_MIN;
    }
  }

  moveUnits(world);
  combat(world);
  cleanup(world);

  world.tick++;
  return world;
}

/** Leben einer Baustelle beim Fortschritt progress: ein Zehntel bis voll. */
function siteHp(def, progress, need) {
  const frac = Math.min(1000, ((progress * 1000) / need) | 0);
  const base = (def.hp / 10) | 0;
  return base + (((def.hp - base) * frac) / 1000) | 0;
}

/** Cosinus in Promille aus einer festen Tabelle. Kein Gleitkomma im Zustand. */
export function cosDeg(a) {
  return COS[((a % 360) + 360) % 360];
}
export function sinDeg(a) {
  return COS[(((a + 270) % 360) + 360) % 360];
}
const COS = (() => {
  const t = new Int32Array(360);
  for (let i = 0; i < 360; i++) t[i] = Math.round(Math.cos((i * Math.PI) / 180) * 1000);
  return t;
})();

function moveUnits(world) {
  for (let i = 0; i < world.entities.length; i++) {
    const e = world.entities[i];
    if (e.dead || e.kind !== 'unit') continue;
    const def = UNITS[e.type];
    const dx = e.tx - e.x;
    const dy = e.ty - e.y;
    const d = isqrt(dx * dx + dy * dy);
    if (d <= def.speed) {
      e.x = e.tx;
      e.y = e.ty;
      continue;
    }
    e.x += ((dx * def.speed) / d) | 0;
    e.y += ((dy * def.speed) / d) | 0;
  }
  separate(world);
}

function separate(world) {
  const us = [];
  for (let i = 0; i < world.entities.length; i++) {
    const e = world.entities[i];
    if (!e.dead && e.kind === 'unit') us.push(e);
  }
  // Alle Stoesse aus denselben Ausgangslagen, dann gemeinsam anwenden --
  // sonst haengt das Ergebnis von der Reihenfolge in der Liste ab.
  const px = new Int32Array(us.length);
  const py = new Int32Array(us.length);
  for (let i = 0; i < us.length; i++) {
    for (let j = i + 1; j < us.length; j++) {
      const a = us[i];
      const b = us[j];
      const min = UNITS[a.type].radius + UNITS[b.type].radius;
      const dd = dist2(a.x, a.y, b.x, b.y);
      if (dd >= min * min || dd === 0) continue;
      const d = isqrt(dd) || 1;
      const push = ((min - d) / 2) | 0 || 1;
      const nx = (((a.x - b.x) * push) / d) | 0;
      const ny = (((a.y - b.y) * push) / d) | 0;
      px[i] += nx;
      py[i] += ny;
      px[j] -= nx;
      py[j] -= ny;
    }
  }
  for (let i = 0; i < us.length; i++) {
    us[i].x = clamp(us[i].x + px[i]);
    us[i].y = clamp(us[i].y + py[i]);
  }
}

/**
 * Kampf wird gleichzeitig aufgeloest: erst waehlt jeder Schuetze sein Ziel,
 * dann trifft alles auf einmal. Sonst schoesse, wer frueher in der Liste
 * steht, zuerst -- und Spieler 0, dessen Befehle zuerst gelten, gewaenne
 * jeden Gleichstand.
 */
function combat(world) {
  const shots = [];
  for (let i = 0; i < world.entities.length; i++) {
    const e = world.entities[i];
    if (e.dead) continue;
    const def = e.kind === 'unit' ? UNITS[e.type] : BUILDINGS[e.type];
    if (!def.weapon) continue;
    if (e.kind === 'building' && !e.done) continue;
    if (e.cooldown > 0) {
      e.cooldown--;
      continue;
    }
    const target = nearestEnemy(world, e, def.weapon.range);
    if (!target) continue;

    let dmg = def.weapon.damage;
    // Heimvorteil: auf eigenem Boden staerker. Der Gott lebt davon.
    if (def.homeBonus && inDomain(world, e.player, e.x, e.y)) {
      dmg = ((dmg * def.homeBonus) / 1000) | 0;
    }
    // Fremder Boden: wer in einer gegnerischen Domaene steht, schlaegt
    // schwaecher zu. Gilt fuer alle Fraktionen gleich.
    if (RULES.fremdMalus < 1000 && inForeignDomain(world, e.player, e.x, e.y)) {
      dmg = ((dmg * RULES.fremdMalus) / 1000) | 0;
    }
    e.cooldown = def.weapon.cooldown;
    shots.push(target, dmg);
    world.events.push({ t: 'shot', from: e.id, to: target.id });
  }

  for (let i = 0; i < shots.length; i += 2) shots[i].hp -= shots[i + 1];
  for (let i = 0; i < shots.length; i += 2) {
    const target = shots[i];
    if (target.hp <= 0 && !target.dead) {
      target.dead = true;
      world.events.push({ t: 'died', id: target.id, x: target.x, y: target.y });
    }
  }
}

function nearestEnemy(world, e, range) {
  let best = null;
  let bestD = range * range;
  for (let i = 0; i < world.entities.length; i++) {
    const o = world.entities[i];
    if (o.dead || o.player === e.player) continue;
    const dd = dist2(e.x, e.y, o.x, o.y);
    if (dd <= bestD) {
      bestD = dd;
      best = o;
    }
  }
  return best;
}

function cleanup(world) {
  let any = false;
  for (let i = 0; i < world.entities.length; i++) {
    if (world.entities[i].dead) {
      any = true;
      break;
    }
  }
  if (!any) return;

  for (let i = 0; i < world.entities.length; i++) {
    const e = world.entities[i];
    if (!e.dead) continue;
    for (let d = 0; d < world.deposits.length; d++) {
      if (world.deposits[d].takenBy === e.id) world.deposits[d].takenBy = 0;
    }
    if (e.kind === 'building' && BUILDINGS[e.type].vital) {
      world.players[e.player].alive = false;
    }
  }
  world.entities = world.entities.filter((e) => !e.dead);

  const alive = world.players.filter((p) => p.alive);
  if (alive.length === 1) {
    world.over = true;
    world.winner = alive[0].id;
  }
}

// ------------------------------------------------------------- Hilfsabfragen

export function gridReport(world, player) {
  const out = [];
  for (let i = 0; i < world.regions.length; i++) {
    const r = world.regions[i];
    if (r.player !== player) continue;
    out.push({
      index: r.index,
      supply: r.supply,
      demand: r.demand,
      satPrio: r.satPrio.slice(),
      size: r.members.length,
      x: r.members[0].x,
      y: r.members[0].y,
      throttled: r.demand > r.supply,
    });
  }
  return out;
}

export function hash(world) {
  let h = 2166136261;
  const mix = (v) => {
    h ^= v | 0;
    h = Math.imul(h, 16777619);
  };
  mix(world.tick);
  for (let i = 0; i < world.entities.length; i++) {
    const e = world.entities[i];
    mix(e.id);
    mix(e.x);
    mix(e.y);
    mix(e.hp);
    mix(e.done ? 1 : 0);
    mix(e.cooldown);
    if (e.kind === 'unit') {
      mix(e.tx);
      mix(e.ty);
    } else {
      mix(e.progress);
      mix(e.queueProgress);
      mix(e.queue.length);
      mix(e.powered);
    }
  }
  for (let p = 0; p < world.players.length; p++) {
    mix(world.players[p].fron);
    mix(world.players[p].goetterblut);
    mix(world.players[p].fronAcc || 0);
    mix(world.players[p].blutAcc || 0);
  }
  for (let i = 0; i < world.deposits.length; i++) mix(world.deposits[i].takenBy);
  mix(world.cleared.length);
  mix(world.seed);
  return h >>> 0;
}
