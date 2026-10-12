// Simulationskern. Engine-frei, deterministisch, nur Integer-Arithmetik.
// Siehe CLAUDE.md fuer die Regeln, die dieser Code einhalten muss.

import { BUILDINGS, UNITS, FACTIONS, MAP, PRIO, START_FRON, RULES, RESOURCES, SKILLS, FAEHIGKEITEN, KARTEN } from './defs.js';
import { wegGitter, wegpunkt, ZELLE } from './weg.js';

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
  const def = BUILDINGS[e.type];
  if (!def.anchor || !e.done) return 0;
  const g = FACTIONS[world.players[e.player].faction].growth;
  const age = world.tick - e.doneAt;
  // anchorMin: Hauptgebaeude tragen mindestens die eigene Startbasis.
  // perTod (Totenreich): jede im Umkreis gefallene Einheit dehnt den Anker aus, siehe seelenZaehlen()
  return Math.max(def.anchorMin || 0, Math.min(g.max, g.start + age * g.perTick + (e.seelen || 0) * (g.perTod || 0)));
}

const PER_MIN = 600 * 1000;

// ------------------------------------------------------------------ Weltbau

export function createWorld(opts = {}) {
  const f0 = opts.factions?.[0] ?? 'mensch';
  const f1 = opts.factions?.[1] ?? 'gott';
  // Eine der festen Karten -- oder eigene Daten (Zufallskarte, Editor),
  // gleiches Format wie KARTEN in defs.js, gepruefte mit kartenFehler().
  const karte = opts.karteDaten ? opts.karte || 'eigen' : KARTEN[opts.karte] ? opts.karte : 'klassisch';
  const daten = opts.karteDaten || KARTEN[karte];
  const world = {
    tick: 0,
    seed: opts.seed ?? 12345,
    karte, // Schluessel in KARTEN, sonst 'zufall' oder 'eigen'
    karteDaten: daten, // die Kartendaten selbst (unveraenderlich)
    nextId: 1,
    entities: [],
    players: [
      { id: 0, faction: f0, fron: START_FRON, goetterblut: 0, alive: true, gelernt: [], faehigkeitBereit: [0, 0, 0], forschung: 0, reparaturAcc: 0 },
      { id: 1, faction: f1, fron: START_FRON, goetterblut: 0, alive: true, gelernt: [], faehigkeitBereit: [0, 0, 0], forschung: 0, reparaturAcc: 0 },
    ],
    deposits: [],
    plaene: [], // Bauplaene: { id, kind: 'plan', player, type, x, y } -- noch kein Gebaeude
    schlaege: [], // Fernschlaege im Flug (M4): { von, player, x, y, landet, radius, schaden }
    baubeginnRunde: 0, // Vorrang beim gleichzeitigen Baubeginn, siehe erschaffen()
    hindernisse: opts.empty ? [] : daten.hindernisse, // Felsen, Seen, Fluss -- unveraenderlich
    cleared: [], // gerodete Flaechen: { x, y, r }
    regions: [],
    pending: [],
    befehlsRunde: 0, // zaehlt Ticks mit Befehlen mehrerer Spieler, siehe applyCommands
    events: [],
    over: false,
    winner: -1,
  };
  world.weg = wegGitter(world.hindernisse); // Wegfindung, aus den Hindernissen abgeleitet
  if (!opts.empty) setupMap(world);
  return world;
}

function setupMap(world) {
  const lo = 3000;
  const hi = MAP - 3000;

  for (let p = 0; p < 2; p++) {
    const f = world.players[p].faction;
    const home = FACTIONS[f].haupt;
    spawnBuilding(world, p, home, p === 0 ? lo : hi, p === 0 ? lo : hi, true);
  }
  if (RULES.kommandanten) for (let p = 0; p < 2; p++) spawnKommandant(world, p);

  for (const a of world.karteDaten.adern) world.deposits.push({ x: a.x, y: a.y, kind: a.kind, takenBy: 0 });
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
    hilfe: 0, // Baukraft der Erbauer in diesem Tick, siehe erschaffen()
    flick: 0, // angefangene Reparatur in Milli-LP
    queueProgress: 0,
    sammelX: -1, // Sammelpunkt fuer neue Einheiten; -1: keiner
    sammelY: -1,
    seelen: 0, // Gefallene im Umkreis (nur Anker mit growth.perTod)
    schildPunkte: 0, // Schild (def.schild): faengt Schaden ab; fertig gebaut startet er leer
    schildRest: 0, // Rest des Ladens in Tausendsteln, damit gedrosseltes Laden nicht verloren geht
    schlagLadung: 0, // Fernschlag (def.schlag): geladene Ticks, bei schlag.laden ist er bereit
    schlagRest: 0, // Rest des Ladens in Tausendsteln, wie schildRest
    abwehrLadung: 0, // Abwehr (def.abwehr): geladene Ticks, bei abwehr.laden faengt sie einen Schlag ab
    abwehrRest: 0,
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
    arrived: true, // hat den Befehlspunkt erreicht -- erst dann wird verfolgt
    auftrag: 0, // Bauplan oder Baustelle, an dem dieser Erbauer arbeiten soll (0 = keiner)
    reihe: [], // weitere Auftraege, der Reihe nach (Shift beim Setzen)
    wege: [], // weitere Wegpunkte [x, y, angriff], der Reihe nach (Shift beim Bewegen)
    aggro: false, // Angriffsbewegung: unterwegs jeden Feind in der Naehe stellen
    ziel: 0, // gezielter Angriff: Id des Ziels, bis es faellt
    befX: x | 0, // Ziel des letzten Bewegungsbefehls -- wer dasselbe hat, gehoert zur Gruppe
    befY: y | 0,
    seit: world.tick, // fuer die Erfahrung
    rufBis: 0, // Schlachtruf wirkt bis zu diesem Tick
    rufWert: 0,
    gebundenBis: 0, // Wurzelgriff haelt fest bis zu diesem Tick
    wehrBis: 0, // Schildwall
    wehrWert: 0,
    tempoBis: 0, // Ansturm
    tempoWert: 0,
    vergehtBei: 0, // herbeigerufene Einheiten vergehen bei diesem Tick (0 = nie)
    beschworen: false, // herbeigerufen: kein Unterhalt
    cooldown: 0,
    dead: false,
  };
  world.entities.push(e);
  return e;
}

/**
 * Setzt den Kommandanten eines Spielers neben sein Hauptgebaeude, zur
 * Kartenmitte hin. Einmalig zu Spielbeginn -- es gibt keinen zweiten.
 */
export function spawnKommandant(world, player) {
  let haupt = null;
  for (let i = 0; i < world.entities.length; i++) {
    const e = world.entities[i];
    if (!e.dead && e.player === player && e.kind === 'building' && BUILDINGS[e.type].vital) haupt = e;
  }
  if (!haupt) return null;
  const type = FACTIONS[world.players[player].faction].kommandant;
  const off = BUILDINGS[haupt.type].radius + 250;
  const dx = (MAP >> 1) - haupt.x;
  const dy = (MAP >> 1) - haupt.y;
  const d = isqrt(dx * dx + dy * dy) || 1;
  const x = clamp(haupt.x + (((dx * off) / d) | 0));
  const y = clamp(haupt.y + (((dy * off) / d) | 0));
  const u = spawnUnit(world, player, type, x, y);
  world.events.push({ t: 'spawned', id: u.id });
  return u;
}

/**
 * Bauauftrag: Jeder genannte eigene Erbauer (UNITS[...].build) geht zur
 * Baustelle und baut sie. Ein Auftrag je Einheit -- der neue ersetzt den alten.
 */
function beauftrage(world, player, ids, site, anhaengen = false) {
  for (let k = 0; k < ids.length; k++) {
    const e = byId(world, ids[k]);
    if (!e || e.dead || e.kind !== 'unit' || e.player !== player || !UNITS[e.type].build) continue;
    // Shift: hinten anhaengen, wenn der Erbauer schon etwas zu tun hat.
    if (anhaengen && e.auftrag) {
      if (e.auftrag !== site.id && !e.reihe.includes(site.id)) e.reihe.push(site.id);
      continue;
    }
    auftraegeAufgeben(world, e, site.id);
    e.auftrag = site.id;
    e.reihe = [];
    e.wege = [];
    e.ziel = 0;
    e.tx = site.x;
    e.ty = site.y;
    e.arrived = false;
    e.aggro = false;
  }
}

/**
 * Neuer Befehl ohne Shift: Der Erbauer laesst Auftrag und Baureihe fallen.
 * Plaene, die danach niemand mehr bauen soll, verschwinden -- wie ein
 * abgebrochener Bauauftrag. Begonnene Baustellen bleiben stehen.
 */
function auftraegeAufgeben(world, e, ausser = 0) {
  const alt = e.auftrag ? [e.auftrag, ...e.reihe] : e.reihe.slice();
  e.auftrag = 0;
  e.reihe = [];
  for (const id of alt) {
    if (id === ausser) continue;
    const plan = planVon(world, id);
    if (!plan) continue;
    let gebraucht = false;
    for (let i = 0; i < world.entities.length && !gebraucht; i++) {
      const u = world.entities[i];
      gebraucht = !u.dead && u.kind === 'unit' && (u.auftrag === id || u.reihe.includes(id));
    }
    if (!gebraucht) world.plaene = world.plaene.filter((q) => q !== plan);
  }
}

/** Ein Bauplan des Spielers mit dieser id, sonst null. */
export function planVon(world, id) {
  for (let i = 0; i < world.plaene.length; i++) if (world.plaene[i].id === id) return world.plaene[i];
  return null;
}

/**
 * Bauplan setzen: nur ein Plan auf der Karte, fuer den Gegner unsichtbar --
 * keine Kosten, keine Sicht, kein Leben, kein Hindernis. Gebaut wird er erst,
 * wenn ein Erbauer daneben anfaengt (erschaffen). Geprueft wird nur, ob der
 * Platz jetzt frei ist; beim Baubeginn noch einmal.
 */
export function planen(world, player, type, x, y) {
  const def = BUILDINGS[type];
  const p = world.players[player];
  if (!def || def.vital || def.faction !== p.faction || gesperrt(world, player, type)) return null;
  if (x < 200 || y < 200 || x > MAP - 200 || y > MAP - 200) return null;
  // Geprueft wird nur, was der Spieler wissen kann: eigene Gebaeude, eigene
  // Adern, Hindernisse. Ein gegnerisches Gebaeude im Nebel verraet sich nicht
  // durch einen abgelehnten Plan -- der Erbauer findet es vor Ort, dann
  // verfaellt der Plan.
  if (def.needs) {
    const dep = findDeposit(world, x, y, def.needs);
    if (!dep || (dep.takenBy !== 0 && byId(world, dep.takenBy)?.player === player)) return null;
    x = dep.x;
    y = dep.y;
  }
  if (def.needsGrowth && isCleared(world, x, y)) return null;
  for (let i = 0; i < world.entities.length; i++) {
    const e = world.entities[i];
    if (e.dead || e.kind !== 'building' || e.player !== player) continue;
    const min = def.radius + BUILDINGS[e.type].radius;
    if (dist2(x, y, e.x, e.y) < min * min) return null;
  }
  if (aufHindernis(world, x, y, def.radius)) return null;
  for (let i = 0; i < world.plaene.length; i++) {
    const q = world.plaene[i];
    const min = def.radius + BUILDINGS[q.type].radius;
    if (q.player === player && dist2(x, y, q.x, q.y) < min * min) return null;
  }
  const plan = { id: world.nextId++, kind: 'plan', player, type, x, y };
  world.plaene.push(plan);
  return plan;
}

/** Plan entfernen; wer ihn bauen sollte, geht zum naechsten Auftrag. */
function planEntfernen(world, plan) {
  world.plaene = world.plaene.filter((q) => q !== plan);
  for (let i = 0; i < world.entities.length; i++) {
    const u = world.entities[i];
    if (u.kind !== 'unit' || u.player !== plan.player) continue;
    u.reihe = u.reihe.filter((id) => id !== plan.id);
    if (u.auftrag === plan.id) naechsterAuftrag(world, u);
  }
}

/**
 * Baubeginn: Aus dem Plan wird eine Baustelle, jetzt wird bezahlt. Fehlt die
 * Fron, wartet der Plan (null). Ist der Platz inzwischen belegt, verfaellt er.
 */
function baubeginn(world, plan) {
  if (!canAfford(world.players[plan.player], BUILDINGS[plan.type].cost)) return null;
  world.plaene = world.plaene.filter((q) => q !== plan);
  const b = tryPlace(world, plan.player, plan.type, plan.x, plan.y);
  if (!b) {
    world.plaene.push(plan);
    planEntfernen(world, plan);
    return null;
  }
  // Alle Auftraege auf den Plan zeigen jetzt auf die Baustelle.
  for (let i = 0; i < world.entities.length; i++) {
    const u = world.entities[i];
    if (u.kind !== 'unit' || u.player !== plan.player) continue;
    if (u.auftrag === plan.id) u.auftrag = b.id;
    for (let k = 0; k < u.reihe.length; k++) if (u.reihe[k] === plan.id) u.reihe[k] = b.id;
  }
  return b;
}

/** Der naechste Auftrag aus der Reihe, sonst keiner. */
function naechsterAuftrag(world, u) {
  u.auftrag = 0;
  while (u.reihe.length) {
    const id = u.reihe.shift();
    const z = byId(world, id) || planVon(world, id);
    if (!z || z.dead || (z.kind === 'building' && z.done && z.hp >= z.maxHp)) continue;
    u.auftrag = id;
    u.tx = z.x;
    u.ty = z.y;
    u.arrived = false;
    u.aggro = false;
    return;
  }
  // Baureihe fertig, aber Wegpunkte (Shift): von hier aus weiter -- die Mitte
  // des Gebaeudes, das Ziel des Bauauftrags, erreicht er nie.
  if (u.wege.length) {
    u.tx = u.x;
    u.ty = u.y;
    u.arrived = true;
  }
}

/** Der lebende Kommandant eines Spielers, oder null. */
export function kommandantVon(world, player) {
  for (let i = 0; i < world.entities.length; i++) {
    const e = world.entities[i];
    if (!e.dead && e.player === player && e.kind === 'unit' && UNITS[e.type].commander) return e;
  }
  return null;
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
 * Befehle reihum: Geben in einem Tick mehrere Spieler Befehle, beginnt jedes
 * Mal ein anderer. Wollen zwei dieselbe Ader im selben Tick, gewinnt nicht
 * immer derselbe Sitzplatz. Ein eigener Zaehler statt der Tick-Paritaet --
 * die KI handelt alle 22 Ticks, also immer in geraden Ticks, und haette so
 * jeden Gleichstand Spieler 0 zugeschlagen.
 * Innerhalb eines Spielers bleibt die Reihenfolge seiner Befehle erhalten.
 */
function applyCommands(world) {
  const n = world.players.length;
  let mehrere = false;
  for (let i = 1; i < world.pending.length && !mehrere; i++) {
    if (world.pending[i].player !== world.pending[0].player) mehrere = true;
  }
  if (mehrere) world.befehlsRunde++;
  for (let k = 0; k < n; k++) {
    const player = (world.befehlsRunde + k) % n;
    for (let i = 0; i < world.pending.length; i++) {
      if (world.pending[i].player === player) applyCommand(world, world.pending[i]);
    }
  }
  world.pending.length = 0;
}

function applyCommand(world, c) {
  {
    if (c.type === 'move' || c.type === 'attack') {
      for (let k = 0; k < c.ids.length; k++) {
        const e = byId(world, c.ids[k]);
        if (e && e.kind === 'unit' && e.player === c.player && !e.dead) {
          // Shift: hinten anhaengen, solange die Einheit unterwegs ist oder noch baut --
          // die Wegpunkte kommen nach den Bauauftraegen dran
          if (c.anhaengen && (e.auftrag || !e.arrived || e.wege.length)) {
            if (e.wege.length < 8) e.wege.push([c.x | 0, c.y | 0, c.type === 'attack' ? 1 : 0]);
            continue;
          }
          e.wege = [];
          e.ziel = 0;
          e.tx = c.x | 0;
          e.ty = c.y | 0;
          e.befX = e.tx;
          e.befY = e.ty;
          e.arrived = false;
          e.aggro = c.type === 'attack';
          auftraegeAufgeben(world, e); // ein neuer Befehl ersetzt den Bauauftrag
        }
      }
    } else if (c.type === 'angreifen') {
      // Gezielter Angriff auf eine feindliche Entity -- verfolgen, bis sie faellt.
      const t = byId(world, c.id);
      if (t && !t.dead && t.player !== c.player) {
        for (let k = 0; k < c.ids.length; k++) {
          const e = byId(world, c.ids[k]);
          if (!e || e.dead || e.kind !== 'unit' || e.player !== c.player || !UNITS[e.type].weapon || !erreicht(e, t)) continue;
          e.ziel = t.id;
          e.tx = e.befX = t.x;
          e.ty = e.befY = t.y;
          e.arrived = false;
          e.aggro = false;
          auftraegeAufgeben(world, e);
          e.wege = [];
        }
      }
    } else if (c.type === 'stopp') {
      // Stehen bleiben: kein Ziel, kein Auftrag, keine Wege.
      for (let k = 0; k < c.ids.length; k++) {
        const e = byId(world, c.ids[k]);
        if (!e || e.dead || e.kind !== 'unit' || e.player !== c.player) continue;
        e.tx = e.befX = e.x;
        e.ty = e.befY = e.y;
        e.arrived = true;
        e.aggro = false;
        e.ziel = 0;
        auftraegeAufgeben(world, e);
        e.wege = [];
      }
    } else if (c.type === 'build') {
      // Ein Bauplan; mit ids bekommen die genannten Erbauer den Auftrag dafuer
      // (anhaengen: hinten in ihre Reihe).
      const plan = planen(world, c.player, c.building, c.x | 0, c.y | 0);
      if (plan && c.ids) beauftrage(world, c.player, c.ids, plan, !!c.anhaengen);
    } else if (c.type === 'bauen') {
      // An einem eigenen Plan oder einer Baustelle bauen, ein beschaedigtes Gebaeude reparieren.
      const plan = planVon(world, c.id);
      const b = plan || byId(world, c.id);
      const geht = plan
        ? plan.player === c.player
        : b && b.kind === 'building' && b.player === c.player && !b.dead && (!b.done || b.hp < b.maxHp);
      if (geht) beauftrage(world, c.player, c.ids, b, !!c.anhaengen);
    } else if (c.type === 'planWeg') {
      const plan = planVon(world, c.id);
      if (plan && plan.player === c.player) planEntfernen(world, plan);
    } else if (c.type === 'demolish') {
      demolish(world, c.player, c.id);
    } else if (c.type === 'aufgeben') {
      // Aufgeben zaehlt wie ein gefallener Kommandant
      world.players[c.player].alive = false;
      const rest = world.players.filter((p) => p.alive);
      if (rest.length === 1) {
        world.over = true;
        world.winner = rest[0].id;
      }
    } else if (c.type === 'lernen') {
      if (kannLernen(world, c.player, c.skill)) world.players[c.player].gelernt.push(c.skill);
    } else if (c.type === 'faehigkeit') {
      wirke(world, c.player, c.faehigkeit, c.x | 0, c.y | 0);
    } else if (c.type === 'sammelpunkt') {
      // Sammelpunkt eigener Fabriken; x < 0 hebt ihn auf.
      for (let k = 0; k < c.ids.length; k++) {
        const b = byId(world, c.ids[k]);
        if (!b || b.dead || b.kind !== 'building' || b.player !== c.player || !BUILDINGS[b.type].buildList) continue;
        b.sammelX = c.x < 0 ? -1 : clamp(c.x | 0);
        b.sammelY = c.x < 0 ? -1 : clamp(c.y | 0);
      }
    } else if (c.type === 'produce') {
      const e = byId(world, c.id);
      if (e && e.player === c.player && e.done && !e.dead) {
        const def = BUILDINGS[e.type];
        if (def.buildList && def.buildList.includes(c.unit) && e.queue.length < 8 && !gesperrt(world, c.player, c.unit) && !vollBesetzt(world, c.player, c.unit)) {
          const p = world.players[c.player];
          if (canAfford(p, UNITS[c.unit].cost)) {
            pay(p, UNITS[c.unit].cost, 1000);
            e.queue.push(c.unit);
          }
        }
      }
    } else if (c.type === 'schlag') {
      schlagAbfeuern(world, c.player, c.id, c.x | 0, c.y | 0);
    }
  }
}

/**
 * Wie viele Einheiten dieses Typs hat der Spieler: lebende plus die in der
 * Warteschlange seiner Gebaeude (M5, hoechstens). Bestellte zaehlen schon,
 * sonst liessen sich beliebig viele auf einmal bestellen.
 */
export function anzahlVon(world, player, typ) {
  let n = 0;
  for (let i = 0; i < world.entities.length; i++) {
    const e = world.entities[i];
    if (e.dead || e.player !== player) continue;
    if (e.kind === 'unit') {
      if (e.type === typ) n++;
    } else if (e.kind === 'building') {
      for (let k = 0; k < e.queue.length; k++) if (e.queue[k] === typ) n++;
    }
  }
  return n;
}

/** Hat der Spieler schon so viele dieser Einheit, wie er (hoechstens) haben darf? Ohne Grenze nie. */
export function vollBesetzt(world, player, typ) {
  const h = UNITS[typ].hoechstens;
  return !!h && anzahlVon(world, player, typ) >= h;
}

/**
 * Platzierung. Bauen ausserhalb der eigenen Domaene ist erlaubt -- die
 * Baustelle hat dann nur keine Gegenwart und steht still. Genau darum geht es.
 */
export function tryPlace(world, player, type, x, y) {
  const def = BUILDINGS[type];
  if (!def || def.vital) return null;
  if (def.faction !== world.players[player].faction) return null;
  if (gesperrt(world, player, type)) return null;
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
  if (aufHindernis(world, x, y, def.radius)) return null;

  pay(p, def.cost, 1000);
  const b = spawnBuilding(world, player, type, x, y, false);
  if (dep) dep.takenBy = b.id;
  return b;
}

/** Sichtweite einer Einheit oder eines Gebaeudes im Nebel des Krieges. */
export function sichtweite(e) {
  const def = e.kind === 'unit' ? UNITS[e.type] : BUILDINGS[e.type];
  if (e.kind === 'building' && !e.done) return 400;
  return def.sicht || (e.kind === 'unit' ? 900 : 700);
}

/**
 * Was ein Spieler gerade sieht: 1 je Zelle (dasselbe Gitter wie die
 * Wegfindung), deren Mitte in Sichtweite einer eigenen Einheit oder eines
 * eigenen Gebaeudes liegt. Die Simulation selbst kennt keinen Nebel -- das
 * ist eine Sicht fuer Oberflaechen und eine spaetere, ehrliche KI.
 */
export function sichtGitter(world, player) {
  const n = MAP / ZELLE;
  const g = new Uint8Array(n * n);
  for (let i = 0; i < world.entities.length; i++) {
    const e = world.entities[i];
    if (e.dead || e.player !== player) continue;
    const r = sichtweite(e);
    const x0 = Math.max(0, ((e.x - r) / ZELLE) | 0);
    const x1 = Math.min(n - 1, ((e.x + r) / ZELLE) | 0);
    const y0 = Math.max(0, ((e.y - r) / ZELLE) | 0);
    const y1 = Math.min(n - 1, ((e.y + r) / ZELLE) | 0);
    for (let cy = y0; cy <= y1; cy++) {
      const my = cy * ZELLE + (ZELLE >> 1) - e.y;
      for (let cx = x0; cx <= x1; cx++) {
        const mx = cx * ZELLE + (ZELLE >> 1) - e.x;
        if (mx * mx + my * my <= r * r) g[cy * n + cx] = 1;
      }
    }
  }
  return g;
}

/** Ueberschneidet ein Kreis (x, y, r) einen Felsen oder See? */
export function aufHindernis(world, x, y, r) {
  for (let i = 0; i < world.hindernisse.length; i++) {
    const h = world.hindernisse[i];
    const min = r + h.r;
    if (dist2(x, y, h.x, h.y) < min * min) return true;
  }
  return false;
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

/** Gegenwart, die ein Anker mit diesem Radius spendet (RULES.ankerKraft). */
export function ankerGegenwart(r) {
  return ((r * RULES.ankerKraft) / 1000) | 0;
}

/**
 * Erfahrung in Promille: je volle Minute seit Entstehung (Einheit) bzw.
 * Bauende (Gebaeude) RULES.erfahrungProMin, hoechstens RULES.erfahrungMax.
 * Baustellen haben keine.
 */
export function erfahrung(world, e) {
  const seit = e.kind === 'unit' ? e.seit : e.done ? e.doneAt : -1;
  if (seit < 0) return 0;
  return Math.min(RULES.erfahrungMax, (((world.tick - seit) / 600) | 0) * RULES.erfahrungProMin);
}

// ------------------------------------------------------------- Skillbaum

/**
 * Bisher verdiente Skillpunkte: skillStart, dann einer je skillTakt Ticks
 * Grundtakt. Forschungsgebaeude legen etwas drauf, siehe forschungProTick.
 */
export function skillPunkte(world, player) {
  if (!RULES.skills) return 0;
  return RULES.skillStart + ((world.players[player].forschung / (RULES.skillTakt * 1000)) | 0);
}

/** Forschung je Tick in Promille des Grundtakts: 1000 plus die versorgten Forschungsgebaeude. */
export function forschungProTick(world, player) {
  let s = 1000;
  for (let i = 0; i < world.entities.length; i++) {
    const e = world.entities[i];
    if (e.dead || e.kind !== 'building' || !e.done || e.player !== player) continue;
    const f = BUILDINGS[e.type].forschung;
    if (f) s += ((f * e.powered) / 1000) | 0;
  }
  return s;
}

/** Noch nicht ausgegebene Skillpunkte. */
export function skillFrei(world, player) {
  const g = world.players[player].gelernt;
  let aus = 0;
  for (let i = 0; i < g.length; i++) aus += SKILLS[g[i]].kosten;
  return skillPunkte(world, player) - aus;
}

/**
 * Ist ein Einheiten- oder Gebaeudetyp fuer diesen Spieler noch gesperrt?
 * Gesperrt ist, was ein Skill der eigenen Fraktion freischaltet, solange
 * keiner dieser Skills gelernt ist.
 */
export function gesperrt(world, player, typ) {
  if (!RULES.skills) return false;
  const pl = world.players[player];
  let sperrt = false;
  for (const id in SKILLS) {
    const s = SKILLS[id];
    if (s.faction !== pl.faction || !s.frei || !s.frei.includes(typ)) continue;
    if (pl.gelernt.includes(id)) return false;
    sperrt = true;
  }
  return sperrt;
}

/** Summe einer Wirkung in Promille ueber alle gelernten Skills. */
export function bonus(world, player, art) {
  if (!RULES.skills) return 0;
  const g = world.players[player].gelernt;
  let s = 0;
  for (let i = 0; i < g.length; i++) {
    const w = SKILLS[g[i]].wirkung;
    if (w && w[art]) s += w[art];
  }
  return s;
}

/** Kann der Spieler diesen Skill jetzt lernen? */
export function kannLernen(world, player, id) {
  const s = SKILLS[id];
  const pl = world.players[player];
  if (!RULES.skills || !s || s.faction !== pl.faction || pl.gelernt.includes(id)) return false;
  if (s.braucht) for (let i = 0; i < s.braucht.length; i++) if (!pl.gelernt.includes(s.braucht[i])) return false;
  return skillFrei(world, player) >= s.kosten;
}

/** Gelernte Faehigkeiten des Kommandanten, in der Reihenfolge der Fraktion. */
export function faehigkeitenVon(world, player) {
  const pl = world.players[player];
  return FACTIONS[pl.faction].faehigkeiten.filter((id) => pl.gelernt.some((g) => SKILLS[g].faehigkeit === id));
}

/** Ticks, bis eine Faehigkeit wieder bereit ist; 0 = bereit. */
export function faehigkeitWarten(world, player, id) {
  const pl = world.players[player];
  const slot = FACTIONS[pl.faction].faehigkeiten.indexOf(id);
  return slot < 0 ? 0 : Math.max(0, pl.faehigkeitBereit[slot] - world.tick);
}

/**
 * Der Kommandant setzt eine gelernte Faehigkeit ein. Ein Griff wirkt um einen
 * Zielpunkt in Reichweite, alles andere um ihn selbst. Danach klingt sie ab.
 */
function wirke(world, player, id, x, y) {
  const pl = world.players[player];
  const slot = FACTIONS[pl.faction].faehigkeiten.indexOf(id);
  const k = kommandantVon(world, player);
  if (slot < 0 || !k || world.tick < pl.faehigkeitBereit[slot] || !faehigkeitenVon(world, player).includes(id)) return;
  const f = FAEHIGKEITEN[id];
  if (f.art === 'griff') {
    if (dist2(k.x, k.y, x, y) > f.reichweite * f.reichweite) return;
  } else {
    x = k.x;
    y = k.y;
  }
  pl.faehigkeitBereit[slot] = world.tick + f.abklingen;
  if (f.art === 'rufen') {
    // Vor dem Kommandanten, Richtung Kartenmitte, nebeneinander -- punktsymmetrisch.
    let dx = (MAP >> 1) - k.x;
    let dy = (MAP >> 1) - k.y;
    const d = isqrt(dx * dx + dy * dy) || 1;
    const abst = UNITS[k.type].radius + UNITS[f.einheit].radius + 40;
    for (let n = 0; n < f.anzahl; n++) {
      const quer = (n - ((f.anzahl - 1) >> 1)) * (UNITS[f.einheit].radius * 2 + 20);
      const u = spawnUnit(world, player, f.einheit, clamp(k.x + (((dx * abst - dy * quer) / d) | 0)), clamp(k.y + (((dy * abst + dx * quer) / d) | 0)));
      u.vergehtBei = world.tick + f.dauer;
      u.beschworen = true;
    }
    world.events.push({ t: 'faehigkeit', art: f.art, player, x, y, r: abst * 2 });
    return;
  }
  for (let i = 0; i < world.entities.length; i++) {
    const e = world.entities[i];
    if (e.dead || e.kind !== 'unit' || dist2(e.x, e.y, x, y) > f.radius * f.radius) continue;
    if (e.player === player) {
      if (f.art === 'ruf') {
        e.rufBis = world.tick + f.dauer;
        e.rufWert = f.wert;
      } else if (f.art === 'wehr') {
        e.wehrBis = world.tick + f.dauer;
        e.wehrWert = f.wert;
      } else if (f.art === 'tempo') {
        e.tempoBis = world.tick + f.dauer;
        e.tempoWert = f.wert;
      } else if (f.art === 'heilung') {
        e.hp = Math.min(e.maxHp, e.hp + f.wert);
      }
    } else if (f.art === 'griff') {
      e.gebundenBis = world.tick + f.dauer;
    }
  }
  world.events.push({ t: 'faehigkeit', art: f.art, player, x, y, r: f.radius });
}

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

/**
 * Schrein-Wirkung an einem Punkt fuer einen Spieler: der staerkste eigene
 * fertige Schrein, in dessen Umkreis (buff.radius) der Punkt liegt, anteilig
 * zu seiner Versorgung. Schreine stapeln nicht. Ausserhalb der eigenen
 * Domaene nichts -- Heimvorteil heisst daheim, nahe den Schreinen.
 */
export function buffAt(world, player, x, y) {
  let zorn = 0;
  let wehr = 0;
  for (let i = 0; i < world.entities.length; i++) {
    const e = world.entities[i];
    if (e.dead || e.player !== player || e.kind !== 'building' || !e.done || !e.powered) continue;
    const buff = BUILDINGS[e.type].buff;
    if (!buff || dist2(x, y, e.x, e.y) > buff.radius * buff.radius) continue;
    const z = (((buff.zorn || 0) * e.powered) / 1000) | 0;
    const w = (((buff.wehr || 0) * e.powered) / 1000) | 0;
    if (z > zorn) zorn = z;
    if (w > wehr) wehr = w;
  }
  if ((zorn || wehr) && !inDomain(world, player, x, y)) return { zorn: 0, wehr: 0 };
  return { zorn, wehr };
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
      if (e.anchorR > 0) supply += ankerGegenwart(e.anchorR);
      const d = demandOf(e);
      if (d > 0) demand[prioOf(e)] += d;
    }

    reg.supply = supply;
    reg.demand = demand[0] + demand[1] + demand[2] + demand[3];
    reg.byPrio = demand;

    // Mindestfluss: ein kleiner Teil bleibt fuer Werk (Fabriken) reserviert,
    // damit sie in einer ueberbuchten Domaene nie ganz stillstehen.
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
  if (!e.done) return 0; // Baustellen baut der Erbauer, nicht die Gegenwart
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
  erschaffen(world);

  for (let i = 0; i < world.entities.length; i++) {
    const e = world.entities[i];
    if (e.dead || e.kind !== 'building') continue;
    const def = BUILDINGS[e.type];

    if (!e.done) {
      // Leben waechst mit dem Fortschritt, Schaden bleibt aber stehen:
      // es kommt nur der Zuwachs dazu, nicht der Sollwert.
      // Fortschritt gibt es nur, solange Erbauer mit Auftrag daneben stehen
      // und daran arbeiten -- Gegenwart allein baut nichts.
      const need = def.buildTime * 1000;
      const before = siteHp(def, e.progress, need);
      e.progress += e.hilfe;
      e.hilfe = 0;
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
    if (e.hilfe) {
      reparieren(world, e);
      e.hilfe = 0;
    }
    if (def.forschung) pl.forschung += ((def.forschung * e.powered) / 1000) | 0;
    if (def.schild) schildLaden(e, def.schild);
    if (def.schlag) ladungWeiter(e, 'schlag', def.schlag.laden);
    if (def.abwehr) ladungWeiter(e, 'abwehr', def.abwehr.laden);
    if (def.fronOut || def.blutOut) {
      const mehr = 1000 + bonus(world, e.player, 'foerderung');
      if (def.fronOut) pl.fronAcc = (pl.fronAcc || 0) + (((def.fronOut * e.powered * mehr) / 1000) | 0);
      if (def.blutOut) pl.blutAcc = (pl.blutAcc || 0) + (((def.blutOut * e.powered * mehr) / 1000) | 0);
    }

    if (e.queue.length > 0) {
      e.queueProgress += ((e.powered * (1000 + bonus(world, e.player, 'ausbildung'))) / 1000) | 0;
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
        if (e.sammelX >= 0) {
          // Zum Sammelpunkt, als waere es ein Bewegungsbefehl.
          u.tx = u.befX = e.sammelX;
          u.ty = u.befY = e.sammelY;
          u.arrived = false;
        }
        world.events.push({ t: 'spawned', id: u.id });
      }
    }
  }

  // Unterhalt: laufend Fron je lebender Einheit. Wer nicht zahlen kann,
  // steht bei null -- kaufen geht dann nichts mehr.
  const weniger = [];
  for (let p = 0; p < world.players.length; p++) weniger.push(1000 - bonus(world, p, 'unterhalt'));
  for (let i = 0; i < world.entities.length; i++) {
    const e = world.entities[i];
    if (e.dead || e.kind !== 'unit' || e.beschworen) continue;
    const u = UNITS[e.type].unterhalt;
    if (u) world.players[e.player].unterhaltAcc = (world.players[e.player].unterhaltAcc || 0) + u * weniger[e.player];
  }
  for (let p = 0; p < world.players.length; p++) {
    const pl = world.players[p];
    if (pl.unterhaltAcc >= PER_MIN) {
      pl.fron = Math.max(0, pl.fron - ((pl.unterhaltAcc / PER_MIN) | 0));
      pl.unterhaltAcc %= PER_MIN;
    }
  }

  for (let p = 0; p < world.players.length; p++) {
    const pl = world.players[p];
    pl.forschung += 1000; // Grundtakt der Skillpunkte
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
  einschlaege(world);
  cleanup(world);

  world.tick++;
  return world;
}

/**
 * Schild laden: `laden` Punkte pro Tick bei voller Versorgung, anteilig zu
 * powered. Ohne Gegenwart (powered 0) lädt nichts; der Rest unter einem Punkt
 * bleibt in schildRest stehen, sonst lüde ein Schild mit laden 1 gedrosselt nie.
 * Was schon im Schild ist, bleibt auch ohne Gegenwart erhalten.
 */
function schildLaden(e, s) {
  if (e.schildPunkte >= s.kapazitaet) {
    e.schildRest = 0;
    return;
  }
  const t = e.schildRest + s.laden * e.powered;
  const plus = (t / 1000) | 0;
  e.schildRest = t - plus * 1000;
  e.schildPunkte = Math.min(s.kapazitaet, e.schildPunkte + plus);
}

/**
 * Schild fängt Schaden ab: das erste fertige, eigene Schildgebäude mit Punkten,
 * in dessen Umkreis das Ziel steht (die Liste ist nach Id geordnet, also gilt
 * bei Überlappung die kleinste Id). Er nimmt min(Schaden, Punkte), der Rest
 * geht weiter auf die LP. Das Schildgebäude steht in der Mitte seiner Kuppel
 * und schützt sich damit selbst; Flieger zählen wie alles andere nach ihrer Lage.
 * Gibt den Schaden zurück, der durchkommt.
 */
function schildFaengt(world, schilde, ziel, dmg) {
  for (let i = 0; i < schilde.length; i++) {
    const s = schilde[i];
    if (s.schildPunkte <= 0 || s.player !== ziel.player) continue;
    const r = BUILDINGS[s.type].schild.radius;
    if (dist2(ziel.x, ziel.y, s.x, s.y) > r * r) continue;
    const ab = Math.min(dmg, s.schildPunkte);
    s.schildPunkte -= ab;
    world.events.push({ t: 'schild', id: ziel.id, von: s.id, x: ziel.x, y: ziel.y, wert: ab });
    return dmg - ab;
  }
  return dmg;
}

/**
 * Ladung eines Gebaeudes weiterzaehlen (Fernschlag, Abwehr): ein Tick je Tick
 * bei voller Versorgung, anteilig zu powered; der Rest unter einem Tick bleibt
 * in <feld>Rest stehen (wie beim Schild). Ohne Gegenwart laedt nichts, was
 * schon geladen ist, bleibt.
 */
function ladungWeiter(e, feld, max) {
  if (e[feld + 'Ladung'] >= max) {
    e[feld + 'Rest'] = 0;
    return;
  }
  const t = e[feld + 'Rest'] + e.powered;
  const plus = (t / 1000) | 0;
  e[feld + 'Rest'] = t - plus * 1000;
  e[feld + 'Ladung'] = Math.min(max, e[feld + 'Ladung'] + plus);
}

/** Ist der Fernschlag dieses Gebaeudes geladen und das Gebaeude fertig? */
export function schlagBereit(e) {
  const s = e.kind === 'building' && !e.dead && e.done ? BUILDINGS[e.type].schlag : null;
  return !!s && e.schlagLadung >= s.laden;
}

/**
 * Fernschlag abfeuern (Befehl 'schlag'): nur ein eigenes, fertiges, geladenes
 * Schlaggebaeude, ein Ziel auf der Karte in Reichweite, und der Spieler muss
 * die Kosten zahlen koennen. Das Ziel braucht keine Sicht -- wer blind feuert,
 * trifft eben auch ins Leere. Der Schlag geht als Eintrag in world.schlaege
 * (Radius und Schaden werden mitgenommen, das Gebaeude darf inzwischen fallen)
 * und schlaegt nach flug Ticks ein, siehe einschlaege().
 */
function schlagAbfeuern(world, player, id, x, y) {
  const e = byId(world, id);
  if (!e || e.player !== player || !schlagBereit(e)) return false;
  const s = BUILDINGS[e.type].schlag;
  if (x < 0 || y < 0 || x > MAP || y > MAP) return false;
  if (dist2(e.x, e.y, x, y) > s.reichweite * s.reichweite) return false;
  const p = world.players[player];
  const kosten = s.kosten || {};
  if (!canAfford(p, kosten)) return false;
  pay(p, kosten, 1000);
  e.schlagLadung = 0;
  e.schlagRest = 0;
  const landet = world.tick + s.flug;
  world.schlaege.push({ von: e.id, player, x, y, landet, radius: s.radius, schaden: s.schaden });
  world.events.push({ t: 'schlagStart', von: e.id, player, bx: e.x, by: e.y, x, y, landet, radius: s.radius });
  return true;
}

/**
 * Einschlaege dieses Ticks, in der Reihenfolge des Abschusses. Zuerst die
 * Abwehr: das erste (kleinste Id) fertige, geladene Abwehrgebaeude eines
 * ANDEREN Spielers, in dessen Umkreis das Ziel liegt, faengt den Schlag ab --
 * seine Ladung ist danach leer, es ist kein Schaden. Sonst trifft der Schlag
 * jede Entity beider Seiten, deren Mitte im Kreis liegt, mit dem vollen
 * Schaden (kein Abfall zum Rand, keine Abzuege ausser den Schilden: die
 * fangen zuerst, wie im Kampf). Gefallene wie im Kampf -- cleanup() zaehlt
 * die Seelen und raeumt auf.
 */
function einschlaege(world) {
  if (!world.schlaege.length) return;
  const bleibt = [];
  for (let i = 0; i < world.schlaege.length; i++) {
    const s = world.schlaege[i];
    if (s.landet > world.tick) {
      bleibt.push(s);
      continue;
    }
    let abwehr = null;
    for (let k = 0; k < world.entities.length && !abwehr; k++) {
      const b = world.entities[k];
      if (b.dead || b.kind !== 'building' || !b.done || b.player === s.player) continue;
      const a = BUILDINGS[b.type].abwehr;
      if (a && b.abwehrLadung >= a.laden && dist2(b.x, b.y, s.x, s.y) <= a.radius * a.radius) abwehr = b;
    }
    if (abwehr) {
      abwehr.abwehrLadung = 0;
      abwehr.abwehrRest = 0;
      world.events.push({ t: 'abgefangen', von: s.von, abwehr: abwehr.id, player: s.player, x: s.x, y: s.y, radius: s.radius, ax: abwehr.x, ay: abwehr.y });
      continue;
    }
    const schilde = world.entities.filter((e) => !e.dead && e.kind === 'building' && e.done && BUILDINGS[e.type].schild);
    const getroffen = [];
    for (let k = 0; k < world.entities.length; k++) {
      const e = world.entities[k];
      if (e.dead || dist2(e.x, e.y, s.x, s.y) > s.radius * s.radius) continue;
      e.hp -= s.schaden > 0 && schilde.length ? schildFaengt(world, schilde, e, s.schaden) : s.schaden;
      getroffen.push(e);
    }
    world.events.push({ t: 'schlag', player: s.player, x: s.x, y: s.y, radius: s.radius, schaden: s.schaden });
    for (let k = 0; k < getroffen.length; k++) {
      const e = getroffen[k];
      if (e.hp <= 0 && !e.dead) {
        e.dead = true;
        world.events.push({ t: 'died', id: e.id, kind: e.kind, type: e.type, player: e.player, x: e.x, y: e.y });
      }
    }
  }
  world.schlaege = bleibt;
}

/**
 * Reparatur: die Baukraft der Erbauer daneben wird zu Leben, gegen Fron.
 * Ohne Fron keine Reparatur.
 */
function reparieren(world, e) {
  const pl = world.players[e.player];
  if (pl.fron <= 0 || e.hp >= e.maxHp) return;
  e.flick += e.hilfe * RULES.reparaturProTick;
  const lp = Math.min((e.flick / 1000) | 0, e.maxHp - e.hp);
  e.flick %= 1000;
  if (lp <= 0) return;
  e.hp += lp;
  pl.reparaturAcc += lp;
  const kosten = (pl.reparaturAcc / RULES.reparaturLpJeFron) | 0;
  if (kosten) {
    pl.fron = Math.max(0, pl.fron - kosten);
    pl.reparaturAcc %= RULES.reparaturLpJeFron;
  }
}

// Wie nah ein Erbauer an seiner Baustelle stehen muss: Spielraum zwischen
// dem Rand der Baustelle und seinem eigenen Rand, in Dezimetern.
const BAU_NAH = 60;

/**
 * Erschaffen: Jeder Erbauer gibt seinem Bauauftrag seine Baukraft, in und
 * ausserhalb der Domaene, aber nur, solange er direkt daneben steht. Das ist
 * der einzige Baufortschritt: Wer nicht daneben steht oder weggeht, baut
 * nicht. Fertig oder zerstoert: Auftrag erledigt. Lagen vom Tickbeginn, also
 * reihenfolgefrei.
 */
function erschaffen(world) {
  const n = world.players.length;
  // 1. Baubeginn: Plaene, neben denen ein Erbauer steht, werden Baustellen.
  //    Reihum nach Spielern -- wollen zwei im selben Tick dieselbe Ader,
  //    entscheidet nicht der Listenplatz (wie bei den Befehlen).
  const start = [];
  for (let i = 0; i < world.entities.length; i++) {
    const u = world.entities[i];
    if (u.dead || u.kind !== 'unit' || !u.auftrag || !UNITS[u.type].build) continue;
    const plan = planVon(world, u.auftrag);
    if (!plan) continue;
    const nah = BUILDINGS[plan.type].radius + UNITS[u.type].radius + BAU_NAH;
    if (dist2(u.x, u.y, plan.x, plan.y) <= nah * nah && !start.includes(plan)) start.push(plan);
  }
  let mehrere = false;
  for (let i = 1; i < start.length && !mehrere; i++) if (start[i].player !== start[0].player) mehrere = true;
  if (mehrere) world.baubeginnRunde++;
  for (let k = 0; k < n; k++) {
    const player = (world.baubeginnRunde + k) % n;
    for (const plan of start) if (plan.player === player && planVon(world, plan.id)) baubeginn(world, plan);
  }
  // 2. Bauen und Reparieren.
  for (let i = 0; i < world.entities.length; i++) {
    const u = world.entities[i];
    if (u.dead || u.kind !== 'unit' || !u.auftrag) continue;
    const b = UNITS[u.type].build;
    u.baut = 0;
    if (b && planVon(world, u.auftrag)) continue; // unterwegs zum Plan oder wartet auf Fron
    const site = byId(world, u.auftrag);
    // Fertig gebaut und heil: Auftrag erledigt, weiter mit dem naechsten. Beschaedigt: reparieren.
    if (!b || !site || site.dead || (site.done && site.hp >= site.maxHp)) {
      naechsterAuftrag(world, u);
      continue;
    }
    const nah = BUILDINGS[site.type].radius + UNITS[u.type].radius + BAU_NAH;
    if (dist2(u.x, u.y, site.x, site.y) > nah * nah) continue;
    site.hilfe += b.power;
    u.baut = site.id;
  }
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

// Verfolgung: Wer seinen Befehlspunkt erreicht hat, geht auf Feinde in
// Reichweite + CHASE los, entfernt sich aber hoechstens LEASH vom
// Befehlspunkt und kehrt danach dorthin zurueck. Ein Bewegungsbefehl hat
// Vorrang: Unterwegs wird nur im Vorbeigehen geschossen. Bei einer
// Angriffsbewegung ('attack') wird auch unterwegs verfolgt, ohne Leine,
// danach geht es weiter zum Ziel.
const CHASE = 600;
const LEASH = 1500;

// ------------------------------------------------------------------ Raster
// Nachbarsuche ueber ein grobes Raster statt "jeder gegen jeden". Die
// Ergebnisse muessen exakt dieselben bleiben (Determinismus, Wiederholungen):
// Wo die Reihenfolge zaehlt, werden die Kandidaten nach ihrem Index in der
// urspruenglichen Liste sortiert -- dieselbe Reihenfolge wie die volle Schleife.
const RASTER = 500; // dm je Zelle
const RASTER_N = Math.ceil(MAP / RASTER) + 1;
// Groesster Radius einer Entity -- so weit kann ein Rand ueber die Zelle hinausragen.
const GROESSTER_EINHEIT = Math.max(...Object.values(UNITS).map((d) => d.radius));
const GROESSTER_RADIUS = Math.max(GROESSTER_EINHEIT, ...Object.values(BUILDINGS).map((d) => d.radius));

/** Raster ueber eine Liste: je Zelle die Indizes in der Liste, aufsteigend. */
function raster(liste) {
  const zellen = new Array(RASTER_N * RASTER_N);
  for (let i = 0; i < liste.length; i++) {
    const e = liste[i];
    const k = zelleVon(e.y) * RASTER_N + zelleVon(e.x);
    (zellen[k] || (zellen[k] = [])).push(i);
  }
  return zellen;
}
function zelleVon(v) {
  const c = (v / RASTER) | 0;
  return c < 0 ? 0 : c >= RASTER_N ? RASTER_N - 1 : c;
}
/**
 * Indizes aller Eintraege in Zellen, die das Quadrat um (x, y) mit Halbweite
 * w beruehren; mit sortieren aufsteigend (wo die Reihenfolge zaehlt).
 */
function nachbarn(zellen, x, y, w, sortieren = true) {
  const x0 = zelleVon(x - w);
  const x1 = zelleVon(x + w);
  const y0 = zelleVon(y - w);
  const y1 = zelleVon(y + w);
  const out = [];
  for (let cy = y0; cy <= y1; cy++) {
    for (let cx = x0; cx <= x1; cx++) {
      const z = zellen[cy * RASTER_N + cx];
      if (z) for (let k = 0; k < z.length; k++) out.push(z[k]);
    }
  }
  if (sortieren && (y1 > y0 || x1 > x0)) return Int32Array.from(out).sort();
  return out;
}

function moveUnits(world) {
  // Erst alle Ziele aus denselben Ausgangslagen, dann alle bewegen --
  // sonst haengt die Verfolgung von der Reihenfolge in der Liste ab.
  const us = [];
  for (let i = 0; i < world.entities.length; i++) {
    const e = world.entities[i];
    if (!e.dead && e.kind === 'unit') us.push(e);
  }
  const gx = new Int32Array(us.length);
  const gy = new Int32Array(us.length);
  const alle = world.entities.filter((e) => !e.dead);
  const alleRaster = raster(alle);
  for (let i = 0; i < us.length; i++) {
    const e = us[i];
    gx[i] = e.tx;
    gy[i] = e.ty;
    const w = UNITS[e.type].weapon;
    if (e.ziel) {
      // Gezielter Angriff: dem Ziel nach, in Reichweite stehen bleiben
      const t = byId(world, e.ziel);
      if (!t || t.dead) {
        e.ziel = 0;
        e.tx = e.befX = gx[i] = e.x;
        e.ty = e.befY = gy[i] = e.y;
        e.arrived = true;
        continue;
      }
      e.tx = gx[i] = t.x;
      e.ty = gy[i] = t.y;
      const nah = reichweite(e, t) - 10;
      if (dist2(e.x, e.y, t.x, t.y) <= nah * nah) {
        gx[i] = e.x;
        gy[i] = e.y;
      }
      continue;
    }
    if (!w || !(e.arrived || e.aggro) || e.auftrag) continue; // wer baut, jagt nicht
    const leine = e.arrived ? LEASH + w.range : MAP * 2;
    const o = chaseTarget(alle, alleRaster, e, w.range + CHASE, leine);
    if (!o) continue;
    const nah = reichweite(e, o) - 10;
    if (dist2(e.x, e.y, o.x, o.y) > nah * nah) {
      gx[i] = o.x;
      gy[i] = o.y;
    } else {
      gx[i] = e.x; // in Reichweite: stehen bleiben und schiessen
      gy[i] = e.y;
    }
  }
  // Ankunft im Pulk -- aus den Lagen vom Tickbeginn, also reihenfolgefrei:
  // (1) Wer eine angekommene Einheit derselben Gruppe beruehrt, ist auch da.
  //     Sonst draengeln alle um denselben Punkt, den nur einer erreicht.
  // (2) Wer angekommen ist und nur ein wenig weggeschoben wurde, bleibt, wo
  //     er ist -- statt zurueckzulaufen und die Nachbarn wieder zu schieben.
  const da = new Uint8Array(us.length);
  const usRaster = raster(us);
  for (let i = 0; i < us.length; i++) {
    const e = us[i];
    if (gx[i] !== e.tx || gy[i] !== e.ty) continue; // jagt gerade
    const r = UNITS[e.type].radius;
    if (e.arrived) {
      if (dist2(e.x, e.y, e.tx, e.ty) <= 4 * r * r) da[i] = 2;
      continue;
    }
    if (e.auftrag) continue;
    for (const j of nachbarn(usRaster, e.x, e.y, r + GROESSTER_EINHEIT + 8, false)) {
      const o = us[j];
      if (j === i || !o.arrived || o.player !== e.player || o.befX !== e.befX || o.befY !== e.befY) continue;
      const min = r + UNITS[o.type].radius + 8;
      if (dist2(e.x, e.y, o.x, o.y) <= min * min) {
        da[i] = 1;
        break;
      }
    }
  }
  for (let i = 0; i < us.length; i++) {
    if (!da[i]) continue;
    const e = us[i];
    e.arrived = true;
    e.tx = e.x;
    e.ty = e.y;
    gx[i] = e.x;
    gy[i] = e.y;
  }

  for (let i = 0; i < us.length; i++) {
    const e = us[i];
    if (e.gebundenBis > world.tick) continue; // Wurzelgriff: festgehalten
    let speed = UNITS[e.type].speed;
    if (e.tempoBis > world.tick) speed = ((speed * (1000 + e.tempoWert)) / 1000) | 0; // Ansturm
    // Wegfindung: direkt, wenn nichts im Weg ist, sonst den naechsten Wegpunkt.
    // Wer fliegt, fliegt geradeaus.
    if ((gx[i] !== e.x || gy[i] !== e.y) && !UNITS[e.type].fliegt) {
      const [wx, wy] = wegpunkt(world.weg, e.x, e.y, gx[i], gy[i]);
      gx[i] = wx;
      gy[i] = wy;
    }
    const dx = gx[i] - e.x;
    const dy = gy[i] - e.y;
    const d = isqrt(dx * dx + dy * dy);
    if (d <= speed) {
      e.x = gx[i];
      e.y = gy[i];
    } else {
      e.x += ((dx * speed) / d) | 0;
      e.y += ((dy * speed) / d) | 0;
    }
    if (e.x === e.tx && e.y === e.ty) e.arrived = true;
  }
  // Angekommen und weitere Wegpunkte: zum naechsten
  for (let i = 0; i < us.length; i++) {
    const e = us[i];
    if (!e.arrived || !e.wege.length || e.auftrag) continue;
    const [x, y, angriff] = e.wege.shift();
    e.tx = e.befX = x;
    e.ty = e.befY = y;
    e.arrived = false;
    e.aggro = angriff === 1;
  }
  separate(world);
}

/**
 * Naechster Feind, dessen Rand hoechstens r vom eigenen Rand entfernt ist und
 * der nicht weiter als leash vom Befehlspunkt liegt.
 */
function chaseTarget(alle, alleRaster, e, r, leash) {
  let best = null;
  let bestD = Infinity;
  let bestRang = 1;
  const re = radiusVon(e);
  const gebaeudeZuerst = UNITS[e.type].weapon.vorrang === 'gebaeude';
  for (const i of nachbarn(alleRaster, e.x, e.y, r + re + GROESSTER_RADIUS)) {
    const o = alle[i];
    if (o.dead || o.player === e.player || !erreicht(e, o)) continue;
    const dd = dist2(e.x, e.y, o.x, o.y);
    const rr = r + re + radiusVon(o);
    if (dd > rr * rr) continue;
    const rang = gebaeudeZuerst && o.kind === 'building' ? 0 : 1;
    if (rang > bestRang || (rang === bestRang && dd >= bestD)) continue;
    if (dist2(e.tx, e.ty, o.x, o.y) > leash * leash) continue;
    bestRang = rang;
    bestD = dd;
    best = o;
  }
  return best;
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
  // Stoesse sind Ganzzahl-Summen -- die Reihenfolge der Paare aendert nichts.
  const usRaster = raster(us);
  for (let i = 0; i < us.length; i++) {
    for (const j of nachbarn(usRaster, us[i].x, us[i].y, 2 * GROESSTER_EINHEIT, false)) {
      if (j <= i) continue;
      const a = us[i];
      const b = us[j];
      if (UNITS[a.type].fliegt || UNITS[b.type].fliegt) continue; // in der Luft drängelt niemand
      const min = UNITS[a.type].radius + UNITS[b.type].radius;
      const dd = dist2(a.x, a.y, b.x, b.y);
      if (dd >= min * min) continue;
      if (dd === 0) {
        // Genau uebereinander: auseinanderschieben, quer zur Richtung der
        // Kartenmitte -- punktsymmetrisch, die aeltere Einheit nach links.
        const s = a.x + a.y < MAP ? 1 : -1;
        const q = (min >> 1) || 1;
        px[i] += s * q;
        py[i] -= s * q;
        px[j] -= s * q;
        py[j] += s * q;
        continue;
      }
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
  const gebaeude = world.entities.filter((b) => !b.dead && b.kind === 'building');
  for (let i = 0; i < us.length; i++) umgehen(world, us[i], gebaeude);
}

/**
 * Gebaeude sind fest. Wer hineingeraet, wird an den Rand geschoben und
 * gleitet seitlich in die Richtung, in der sein Ziel liegt -- ein Ersatz
 * fuer Pathfinding auf offener Karte. Liegt das Ziel im Gebaeude selbst
 * (Angriff aufs Hauptgebaeude), bleibt die Einheit am Rand stehen.
 */
function umgehen(world, u, gebaeude) {
  if (UNITS[u.type].fliegt) return; // ueber Fels, Wasser und Mauern hinweg
  const ur = UNITS[u.type].radius;
  const slide = UNITS[u.type].speed >> 1;
  // Felsen und Seen schieben genauso hinaus wie Gebaeude, nur ohne Seitwaertsgleiten.
  for (let i = 0; i < world.hindernisse.length; i++) {
    const h = world.hindernisse[i];
    const min = ur + h.r;
    let ox = u.x - h.x;
    let oy = u.y - h.y;
    const dd = ox * ox + oy * oy;
    if (dd >= min * min) continue;
    let d = isqrt(dd);
    if (d === 0) {
      // genau in der Mitte: punktsymmetrisch hinausschieben
      ox = h.x + h.y < MAP ? 1 : -1;
      oy = 0;
      d = 1;
    }
    u.x = clamp(h.x + (((ox * min) / d) | 0));
    u.y = clamp(h.y + (((oy * min) / d) | 0));
  }
  for (let i = 0; i < gebaeude.length; i++) {
    const b = gebaeude[i];
    const min = ur + BUILDINGS[b.type].radius;
    let ox = u.x - b.x;
    let oy = u.y - b.y;
    const dd = ox * ox + oy * oy;
    if (dd >= min * min) continue;
    let d = isqrt(dd);
    if (d === 0) {
      // genau in der Mitte (Baustelle entsteht auf ihrem Erbauer): punktsymmetrisch hinausschieben
      ox = b.x + b.y < MAP ? 1 : -1;
      oy = 0;
      d = 1;
    }
    let nx = b.x + (((ox * min) / d) | 0);
    let ny = b.y + (((oy * min) / d) | 0);
    if (dist2(u.tx, u.ty, b.x, b.y) >= min * min) {
      // Tangente in Richtung des Ziels
      const dot = -oy * (u.tx - u.x) + ox * (u.ty - u.y);
      const s = dot >= 0 ? 1 : -1;
      nx += ((-oy * s * slide) / d) | 0;
      ny += ((ox * s * slide) / d) | 0;
    }
    u.x = clamp(nx);
    u.y = clamp(ny);
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
  const alle = world.entities.filter((e) => !e.dead);
  const alleRaster = raster(alle);
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
    // Schiessende Gebaeude brauchen Gegenwart -- gedrosselt schwaecher, ohne gar nicht.
    if (e.kind === 'building' && !e.powered) continue;
    // Gezielter Angriff geht vor, sobald das Ziel in Reichweite ist
    let target = null;
    if (e.kind === 'unit' && e.ziel) {
      const t = byId(world, e.ziel);
      if (t && !t.dead) {
        const r = reichweite(e, t);
        if (dist2(e.x, e.y, t.x, t.y) <= r * r) target = t;
      }
    }
    if (!target) target = nearestEnemy(alle, alleRaster, e);
    if (!target) continue;

    let dmg = target.kind === 'building' && def.weapon.gebaeude ? def.weapon.gebaeude : def.weapon.damage;
    if (e.kind === 'building') dmg = ((dmg * e.powered) / 1000) | 0;
    // Heimvorteil: auf eigenem Boden staerker. Der Gott lebt davon.
    // Zorn: ein versorgter Schrein im Netz, in dem der Schuetze steht.
    const zorn = buffAt(world, e.player, e.x, e.y).zorn;
    if (zorn) dmg = ((dmg * (1000 + zorn)) / 1000) | 0;
    // Erfahrung: wer lange lebt, trifft ein wenig haerter.
    const erf = erfahrung(world, e);
    if (erf) dmg = ((dmg * (1000 + erf)) / 1000) | 0;
    // Skills: Verbesserung des ganzen Volkes, Schlachtruf.
    const sb = bonus(world, e.player, 'schaden');
    if (sb) dmg = ((dmg * (1000 + sb)) / 1000) | 0;
    if (e.kind === 'unit' && e.rufBis > world.tick) dmg = ((dmg * (1000 + e.rufWert)) / 1000) | 0;
    // Fremder Boden: wer in einer gegnerischen Domaene steht, schlaegt
    // schwaecher zu. Gilt fuer alle Fraktionen gleich.
    if (RULES.fremdMalus < 1000 && inForeignDomain(world, e.player, e.x, e.y)) {
      dmg = ((dmg * RULES.fremdMalus) / 1000) | 0;
    }
    e.cooldown = def.weapon.cooldown;
    shots.push(target, dmg);
    world.events.push({ t: 'shot', from: e.id, to: target.id });
  }

  // Schilde (M2): einmal eingesammelt, die Punkte werden Schuss fuer Schuss
  // verbraucht -- in Reihenfolge der Schuetzen, wie auch der Rest hier.
  const schilde = shots.length ? world.entities.filter((e) => !e.dead && e.kind === 'building' && e.done && BUILDINGS[e.type].schild) : [];

  // Wehr: ein versorgter Schrein im Netz, in dem das Ziel steht.
  for (let i = 0; i < shots.length; i += 2) {
    const t = shots[i];
    const wehr = buffAt(world, t.player, t.x, t.y).wehr;
    let dmg = wehr ? ((shots[i + 1] * (1000 - wehr)) / 1000) | 0 : shots[i + 1];
    // ... und steckt ein wenig mehr weg.
    const erf = erfahrung(world, t);
    if (erf) dmg = ((dmg * (1000 - erf)) / 1000) | 0;
    // Skills: Schutz des ganzen Volkes, dazu der des Kommandanten.
    if (t.kind === 'unit') {
      let sch = bonus(world, t.player, 'schutz');
      if (UNITS[t.type].commander) sch += bonus(world, t.player, 'kdtSchutz');
      if (sch) dmg = ((dmg * (1000 - sch)) / 1000) | 0;
      if (t.wehrBis > world.tick) dmg = ((dmg * (1000 - t.wehrWert)) / 1000) | 0; // Schildwall
    }
    // Zuletzt der Schild: er faengt ab, was nach allen Abzuegen noch ankommt.
    if (dmg > 0 && schilde.length) dmg = schildFaengt(world, schilde, t, dmg);
    t.hp -= dmg;
  }
  for (let i = 0; i < shots.length; i += 2) {
    const target = shots[i];
    if (target.hp <= 0 && !target.dead) {
      target.dead = true;
      world.events.push({
        t: 'died',
        id: target.id,
        kind: target.kind,
        type: target.type,
        player: target.player,
        x: target.x,
        y: target.y,
      });
    }
  }
}

/**
 * Was die Waffe einer Definition trifft: 'boden', 'luft' oder 'beide'. Ohne
 * weapon.ziele wie bisher -- Nahkampf nur Boden, Fernkampf beides.
 */
export function zieleVon(def) {
  return def.weapon.ziele || (def.kampf === 'fern' ? 'beide' : 'boden');
}

/**
 * Kann e o ueberhaupt treffen? Fliegende Einheiten sind Luftziele, alles
 * andere (auch Gebaeude) Bodenziele; weapon.ziele sagt, was e davon trifft.
 * Jede Zielwahl (Verfolgen, Kampf, gezielter Angriff, die KI) fragt hier --
 * sonst bleibt jemand an einem Feind haengen, den er nie treffen kann.
 */
export function erreicht(e, o) {
  const z = zieleVon(e.kind === 'unit' ? UNITS[e.type] : BUILDINGS[e.type]);
  return o.kind === 'unit' && UNITS[o.type].fliegt ? z !== 'boden' : z !== 'luft';
}

/** Groesse einer Einheit oder eines Gebaeudes, Dezimeter. */
function radiusVon(e) {
  return e.kind === 'unit' ? UNITS[e.type].radius : BUILDINGS[e.type].radius;
}

/**
 * Wie weit die Mitten hoechstens auseinander sein duerfen, damit e o trifft:
 * Reichweite (Rand zu Rand) plus beide Raender. Nahkampf heisst Beruehrung.
 */
export function reichweite(e, o) {
  const def = e.kind === 'unit' ? UNITS[e.type] : BUILDINGS[e.type];
  return def.weapon.range + radiusVon(e) + radiusVon(o);
}

/** Naechster Feind, den e mit seiner Waffe erreicht -- Belagerung nimmt Gebaeude zuerst. */
function nearestEnemy(alle, alleRaster, e) {
  const w = (e.kind === 'unit' ? UNITS[e.type] : BUILDINGS[e.type]).weapon;
  const gebaeudeZuerst = w.vorrang === 'gebaeude';
  let best = null;
  let bestD = Infinity;
  let bestRang = 1;
  for (const i of nachbarn(alleRaster, e.x, e.y, w.range + radiusVon(e) + GROESSTER_RADIUS)) {
    const o = alle[i];
    if (o.dead || o.player === e.player || !erreicht(e, o)) continue;
    const dd = dist2(e.x, e.y, o.x, o.y);
    const r = reichweite(e, o);
    if (dd > r * r) continue;
    const rang = gebaeudeZuerst && o.kind === 'building' ? 0 : 1;
    if (rang < bestRang || (rang === bestRang && dd <= bestD)) {
      bestRang = rang;
      bestD = dd;
      best = o;
    }
  }
  return best;
}

function cleanup(world) {
  // Herbeigerufene Einheiten vergehen nach ihrer Zeit.
  for (let i = 0; i < world.entities.length; i++) {
    const e = world.entities[i];
    if (e.dead || !e.vergehtBei || world.tick < e.vergehtBei) continue;
    e.dead = true;
    e.vergangen = true; // vergangen, nicht gefallen -- zaehlt nicht als Seele
    world.events.push({ t: 'died', id: e.id, kind: e.kind, type: e.type, player: e.player, x: e.x, y: e.y });
  }
  let any = false;
  for (let i = 0; i < world.entities.length; i++) {
    if (world.entities[i].dead) {
      any = true;
      break;
    }
  }
  if (!any) return;

  seelenZaehlen(world);
  for (let i = 0; i < world.entities.length; i++) {
    const e = world.entities[i];
    if (!e.dead) continue;
    for (let d = 0; d < world.deposits.length; d++) {
      if (world.deposits[d].takenBy === e.id) world.deposits[d].takenBy = 0;
    }
    // Hauptgebaeude und Kommandant sind vital: Faellt einer, ist die Partie verloren.
    const vital = e.kind === 'building' ? BUILDINGS[e.type].vital : UNITS[e.type].commander;
    if (vital) world.players[e.player].alive = false;
  }
  world.entities = world.entities.filter((e) => !e.dead);

  const alive = world.players.filter((p) => p.alive);
  if (alive.length === 1) {
    world.over = true;
    world.winner = alive[0].id;
  }
}

/**
 * Totenreich: Jede Einheit, die in diesem Tick gefallen ist, zaehlt als Seele
 * fuer jeden fertigen Anker mit growth.perTod, in dessen Umkreis sie lag --
 * gleich welchen Spielers. Herbeigerufene, die nur vergehen, zaehlen nicht.
 * Reihenfolge nach Array-Index, deterministisch.
 */
function seelenZaehlen(world) {
  const anker = [];
  for (let i = 0; i < world.entities.length; i++) {
    const b = world.entities[i];
    if (b.dead || b.kind !== 'building' || !b.done || !BUILDINGS[b.type].anchor) continue;
    if (FACTIONS[world.players[b.player].faction].growth.perTod) anker.push([b, anchorRadius(world, b)]);
  }
  if (!anker.length) return;
  for (let i = 0; i < world.entities.length; i++) {
    const u = world.entities[i];
    if (!u.dead || u.kind !== 'unit' || u.vergangen) continue;
    for (const [b, r] of anker) if (dist2(u.x, u.y, b.x, b.y) <= r * r) b.seelen++;
  }
}

// ------------------------------------------------------------- Hilfsabfragen

/** Unterhalt aller lebenden Einheiten eines Spielers, Fron pro Minute. */
export function unterhaltProMin(world, player) {
  let s = 0;
  for (let i = 0; i < world.entities.length; i++) {
    const e = world.entities[i];
    if (!e.dead && e.kind === 'unit' && e.player === player) s += UNITS[e.type].unterhalt || 0;
  }
  return ((s * (1000 - bonus(world, player, 'unterhalt'))) / 1000) | 0;
}

/** Foerderung eines Spielers in Fron pro Minute, so wie sie gerade laeuft. */
export function foerderungProMin(world, player) {
  let s = 0;
  for (let i = 0; i < world.entities.length; i++) {
    const e = world.entities[i];
    if (e.dead || e.kind !== 'building' || !e.done || e.player !== player) continue;
    const out = BUILDINGS[e.type].fronOut;
    if (out) s += ((out * e.powered) / 1000) | 0;
  }
  return ((s * (1000 + bonus(world, player, 'foerderung'))) / 1000) | 0;
}

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

// Feste Nummer je Skill fuer den Hash.
const SKILL_NR = {};
Object.keys(SKILLS).forEach((id, i) => (SKILL_NR[id] = i + 1));

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
      mix(e.arrived ? 1 : 0);
      mix(e.aggro ? 1 : 0);
      mix(e.auftrag || 0);
      mix(e.reihe.length);
      for (const id of e.reihe) mix(id);
      mix(e.seit);
      mix(e.befX);
      mix(e.ziel);
      mix(e.wege.length);
      for (let k = 0; k < e.wege.length; k++) mix(e.wege[k][0] * 3 + e.wege[k][1] * 7 + e.wege[k][2]);
      mix(e.befY);
      mix(e.rufBis);
      mix(e.gebundenBis);
      mix(e.wehrBis);
      mix(e.tempoBis);
      mix(e.vergehtBei);
    } else {
      mix(e.doneAt);
      mix(e.progress);
      mix(e.flick);
      mix(e.queueProgress);
      mix(e.sammelX);
      mix(e.sammelY);
      mix(e.queue.length);
      mix(e.powered);
      mix(e.seelen || 0);
      // Nur Schildgebaeude: Partien ohne Schild behalten ihre Pruefsumme.
      if (BUILDINGS[e.type].schild) {
        mix(e.schildPunkte);
        mix(e.schildRest);
      }
      // Ebenso Fernschlag und Abwehr: nur Gebaeude mit dem Feld.
      if (BUILDINGS[e.type].schlag) {
        mix(e.schlagLadung);
        mix(e.schlagRest);
      }
      if (BUILDINGS[e.type].abwehr) {
        mix(e.abwehrLadung);
        mix(e.abwehrRest);
      }
    }
  }
  for (let p = 0; p < world.players.length; p++) {
    mix(world.players[p].fron);
    mix(world.players[p].goetterblut);
    mix(world.players[p].fronAcc || 0);
    mix(world.players[p].blutAcc || 0);
    mix(world.players[p].unterhaltAcc || 0);
    for (const t of world.players[p].faehigkeitBereit) mix(t);
    mix(world.players[p].forschung);
    mix(world.players[p].reparaturAcc);
    for (const id of world.players[p].gelernt) mix(SKILL_NR[id]);
  }
  for (let i = 0; i < world.deposits.length; i++) mix(world.deposits[i].takenBy);
  for (const p of world.plaene) {
    mix(p.id);
    mix(p.x);
    mix(p.y);
  }
  // Fernschlaege im Flug: nur, wenn welche fliegen -- Partien ohne behalten ihre Pruefsumme.
  for (const s of world.schlaege) {
    mix(s.von);
    mix(s.player);
    mix(s.x);
    mix(s.y);
    mix(s.landet);
    mix(s.radius);
    mix(s.schaden);
  }
  mix(world.baubeginnRunde);
  mix(world.cleared.length);
  mix(world.befehlsRunde);
  mix(world.seed);
  return h >>> 0;
}
