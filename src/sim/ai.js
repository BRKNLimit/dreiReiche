// Einfacher Gegner. Bewusst dumm: er soll Druck erzeugen, damit sich die
// Domänenmechanik unter Stress zeigt. Nutzt nur issue(), nie direkten Zugriff.
// Nur Integer-Arithmetik und rng() -- dieselben Regeln wie die Simulation.

import { issue, dist2, isqrt, isCleared, anchorRadius, ankerGegenwart, inDomain, rng, cosDeg, sinDeg } from './sim.js';
import { BUILDINGS, UNITS, FACTIONS, MAP } from './defs.js';

const PLAN = {
  mensch: { anker: 'turm', kraft: 'schmiede', fron: 'saege', blut: 'schacht', fabrik: 'kaserne', leicht: 'landwehr', schwer: 'soeldner' },
  gott: { anker: 'hain', kraft: 'quelle', fron: 'moos', blut: 'blutwurz', fabrik: 'dickicht', leicht: 'schratt', schwer: 'geweihter' },
};

/**
 * Spielstile, fraktionsneutral. Messungen mit nur einem Stil messen vor
 * allem diesen Stil (docs/scope.md); tools/sweep.mjs kann alle Paarungen
 * gegeneinander spielen lassen.
 *   welle:     Truppen fuer die erste Welle, plus wellePlus je weitere
 *   ankerAb:   Fron-Polster, ab dem zusaetzliche Anker gesetzt werden
 *   ankerTakt: Minuten je zusaetzlichem Anker
 *   kdtVorn:   Kommandant geht nach vorn (kaempft, baut Aussenposten an
 *              den Adern) statt hinten beim Hauptgebaeude zu bauen
 *   wache:     so viele Einheiten bleiben mindestens als Leibwache beim
 *              Kommandanten, mehr bei grossem Heer (drei Zehntel)
 */
export const STILE = {
  sturm: { welle: 5, wellePlus: 2, ankerAb: 400, ankerTakt: 2, kdtVorn: true, wache: 2 },
  standard: { welle: 8, wellePlus: 3, ankerAb: 250, ankerTakt: 1, kdtVorn: false, wache: 3 },
  burg: { welle: 14, wellePlus: 4, ankerAb: 150, ankerTakt: 1, kdtVorn: false, wache: 4 },
};

// Wie weit "hinten" fuer die KI reicht: Umkreis um das eigene Hauptgebaeude.
const HINTEN = 3000;

export function createAI(player = 1, seed = 1, stil = 'standard') {
  return { player, next: 20, welle: 0, zug: 0, seed: seed | 0, unterwegs: [], welleZiel: 0, stil: STILE[stil] };
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
  // Der Kommandant kaempft mit, baut aber vor allem: er geht nicht mit Wellen.
  const kdt = einheiten.find((u) => UNITS[u.type].commander) || null;
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
    if (d.anchor) bilanz += ankerGegenwart(anchorRadius(world, b));
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
  if (kdt && ai.stil.kdtVorn && vene && !veneBereit) {
    // Aussenposten: Der Kommandant erschafft an der Ader, was die Domaene
    // nicht erreicht -- erst einen Anker, der sie abdeckt, dann eine Quelle
    // in dessen Kreis. Danach ist die Ader versorgt, der Schacht folgt oben.
    const start = FACTIONS[p.faction].growth.start;
    const posten = bauten.find((b) => BUILDINGS[b.type].anchor && dist2(b.x, b.y, vene.x, vene.y) <= start * start);
    if (!posten) {
      if (fron >= kosten(plan.anker)) {
        const platz = nahePlatz(world, vene, haupt, Math.min(start >> 1, 600), BUILDINGS[plan.anker].radius, plan.anker);
        if (platz) return bau(plan.anker, platz.x, platz.y);
      }
    } else {
      const reg = world.regions[posten.region];
      const quelleDa = bauten.some(
        (b) => BUILDINGS[b.type].gegenwartOut && dist2(b.x, b.y, posten.x, posten.y) <= start * start
      );
      if (posten.done && (!reg || reg.supply === 0) && !quelleDa && fron >= kosten(plan.kraft)) {
        const platz = nahePlatz(world, posten, haupt, 350, BUILDINGS[plan.kraft].radius, plan.kraft, 90);
        if (platz) return bau(plan.kraft, platz.x, platz.y);
      }
    }
  } else if (vene && !veneBereit && !ankerImBau && fron >= kosten(plan.anker) + 100) {
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
  const ankerZiel = 2 + ((minute / ai.stil.ankerTakt) | 0);
  if (zahl(plan.anker) < ankerZiel && fron >= kosten(plan.anker) + ai.stil.ankerAb) {
    const platz = randplatz(world, ai, haupt, front, bauten, plan.anker);
    if (platz) return bau(plan.anker, platz.x, platz.y);
  }

  // 5. Ohne Gegenwart: eine Baustelle oder ein fertiger Verbraucher ausserhalb
  //    des versorgten Netzes bekommt einen Anker dazwischen. Der Kommandant
  //    baut zwar auch dort fertig, aber fertig heisst noch nicht versorgt.
  //    Ausgenommen der Aussenposten an der Ader -- den versorgt er selbst.
  const postenStart = FACTIONS[p.faction].growth.start;
  const steht = bauten.find(
    (b) =>
      b.powered === 0 &&
      (!b.done || BUILDINGS[b.type].gegenwartIn) &&
      !(kdt && ai.stil.kdtVorn && vene && dist2(b.x, b.y, vene.x, vene.y) <= postenStart * postenStart)
  );
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

  // Der Kommandant ist vital: Wer ihn verliert, verliert die Partie.
  // Rueckzug bei halbem Leben oder wenn er draussen auf Feinde trifft.
  const sicher = (pt, r) => feindeBei(world, ai.player, pt, r) === 0;
  // Rueckzug unter halbem Leben oder wenn er draussen auf Feinde trifft.
  // Eine KI-Entscheidung, keine Regel: Heilung gibt es nicht.
  const rueckzug =
    kdt &&
    (kdt.hp * 2 < kdt.maxHp || (feindeBei(world, ai.player, kdt, 1200) >= 2 && !inDomain(world, ai.player, kdt.x, kdt.y)));

  // 7. Verteidigung: Feinde nahe eigener Gebaeude ziehen alle Truppen an,
  //    die nicht gerade mit einer Welle unterwegs sind. Der Kommandant
  //    kaempft nur auf eigenem Boden mit.
  const bedrohung = naechsterEindringling(world, ai.player, bauten);
  if (bedrohung) {
    const imHinterland = (pt) => dist2(pt.x, pt.y, haupt.x, haupt.y) <= HINTEN * HINTEN;
    const kdtHilft =
      kdt &&
      !rueckzug &&
      inDomain(world, ai.player, bedrohung.x, bedrohung.y) &&
      (ai.stil.kdtVorn || imHinterland(bedrohung));
    const ids = einheiten
      .filter((u) => !ai.unterwegs.includes(u.id) && (u !== kdt || kdtHilft))
      .map((u) => u.id);
    if (ids.length) issue(world, { type: 'attack', player: ai.player, ids, x: bedrohung.x, y: bedrohung.y });
  }

  // 8. Angriff in wachsenden Wellen. Erstes Ziel ist ein gegnerischer
  //    Foerderbau fuer Goetterblut -- die Mitte entscheidet --, sonst das
  //    Hauptgebaeude. Faellt das Ziel, zieht die Welle zum naechsten weiter.
  ai.unterwegs = ai.unterwegs.filter((id) => einheiten.some((u) => u.id === id));
  // Leibwache: Wer seinen Kommandanten verliert, verliert die Partie. Die ihm
  // naechsten Einheiten bleiben bei ihm, nur der Rest geht mit Wellen.
  const daheimAlle = einheiten.filter((u) => !ai.unterwegs.includes(u.id) && u !== kdt);
  const nachNaehe = kdt
    ? daheimAlle
        .slice()
        .sort((a, b) => dist2(a.x, a.y, kdt.x, kdt.y) - dist2(b.x, b.y, kdt.x, kdt.y) || a.id - b.id)
    : daheimAlle;
  const wacheZahl = kdt ? Math.min(nachNaehe.length, Math.max(ai.stil.wache, ((nachNaehe.length * 3) / 10) | 0)) : 0;
  const wache = nachNaehe.slice(0, wacheZahl);
  const daheimStehend = nachNaehe.slice(wacheZahl);
  const angriff = gegnerFoerderung(world, ai.player, haupt) || ziel;
  if (ai.unterwegs.length && angriff && !world.entities.some((e) => e.id === ai.welleZiel && !e.dead)) {
    ai.welleZiel = angriff.id;
    issue(world, { type: 'attack', player: ai.player, ids: ai.unterwegs.slice(), x: angriff.x, y: angriff.y });
  }
  if (!bedrohung && daheimStehend.length >= ai.stil.welle + ai.welle * ai.stil.wellePlus && angriff) {
    ai.welle++;
    ai.welleZiel = angriff.id;
    const ids = daheimStehend.map((u) => u.id);
    ai.unterwegs.push(...ids);
    issue(world, { type: 'attack', player: ai.player, ids, x: angriff.x, y: angriff.y });
    return;
  }

  // 9a. Kommandant: bei Gefahr heim. Sonst zur sicheren Baustelle, die ihn am
  //     noetigsten braucht (ohne Gegenwart zuerst), sonst zu einer sicheren
  //     Ader, sonst an die Front.
  if (kdt && rueckzug) {
    if (kdt.tx !== haupt.x || kdt.ty !== haupt.y) {
      issue(world, { type: 'move', player: ai.player, ids: [kdt.id], x: haupt.x, y: haupt.y });
    }
  } else if (kdt && !bedrohung && !ai.stil.kdtVorn) {
    // Hinten: in der Naehe des Hauptgebaeudes bleiben, dort beim Bauen helfen.
    const innen = HINTEN - 400;
    let site = null;
    for (const b of bauten) {
      if (b.done || dist2(b.x, b.y, haupt.x, haupt.y) > innen * innen) continue;
      if (!site || b.powered < site.powered) site = b;
    }
    const hin = site || haupt;
    const nah = site ? UNITS[kdt.type].build.range - 150 : innen;
    if (dist2(kdt.x, kdt.y, hin.x, hin.y) > nah * nah && (kdt.tx !== hin.x || kdt.ty !== hin.y)) {
      issue(world, { type: 'move', player: ai.player, ids: [kdt.id], x: hin.x, y: hin.y });
    }
  } else if (kdt && !bedrohung) {
    let site = null;
    for (const b of bauten) {
      if (b.done || !sicher(b, 1500)) continue;
      if (
        !site ||
        b.powered < site.powered ||
        (b.powered === site.powered && dist2(b.x, b.y, kdt.x, kdt.y) < dist2(site.x, site.y, kdt.x, kdt.y))
      ) {
        site = b;
      }
    }
    const reichweite = UNITS[kdt.type].build.range - 150;
    const vorn = ziel ? vordersterAnker(world, bauten, ziel) : null;
    const hin = site || (vene && !veneBereit && sicher(vene, 2000) ? vene : vorn);
    const nah = site ? reichweite : 700;
    if (hin && dist2(kdt.x, kdt.y, hin.x, hin.y) > nah * nah && (kdt.tx !== hin.x || kdt.ty !== hin.y)) {
      issue(world, { type: 'move', player: ai.player, ids: [kdt.id], x: hin.x, y: hin.y });
    }
  }

  // 9b. Leibwache folgt dem Kommandanten.
  if (kdt && !bedrohung) {
    const ids = wache.filter((u) => dist2(u.x, u.y, kdt.x, kdt.y) > 600 * 600).map((u) => u.id);
    if (ids.length) issue(world, { type: 'move', player: ai.player, ids, x: kdt.x, y: kdt.y });
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

/**
 * Freier Bauplatz im Abstand abstand von um, zuerst Richtung Heimat, dann
 * seitlich gedreht. Ohne Ader-Pflicht; Hain nicht auf gerodetem Boden.
 */
function nahePlatz(world, um, haupt, abstand, radius, typ, drehung = 0) {
  const basis = winkel(um, haupt);
  for (const g of [0, 40, -40, 80, -80, 120, -120, 180]) {
    const grad = basis + drehung + g;
    const x = grenze(um.x + (((abstand * cosDeg(grad)) / 1000) | 0));
    const y = grenze(um.y + (((abstand * sinDeg(grad)) / 1000) | 0));
    if (BUILDINGS[typ].needsGrowth && isCleared(world, x, y)) continue;
    if (blockiert(world, x, y, radius)) continue;
    // Nicht auf eine Ader bauen, die noch gebraucht wird.
    if (world.deposits.some((d) => dist2(d.x, d.y, x, y) < (radius + 120) * (radius + 120))) continue;
    return { x, y };
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

/** Feindliche Kaempfer im Umkreis r um einen Punkt. */
function feindeBei(world, me, pt, r) {
  let n = 0;
  for (const o of world.entities) {
    if (o.dead || o.player === me || o.kind !== 'unit' || !UNITS[o.type].weapon) continue;
    if (dist2(o.x, o.y, pt.x, pt.y) <= r * r) n++;
  }
  return n;
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
