// Einfacher Gegner. Bewusst dumm: er soll Druck erzeugen, damit sich die
// Domänenmechanik unter Stress zeigt. Nutzt nur issue(), nie direkten Zugriff.
// Nur Integer-Arithmetik und rng() -- dieselben Regeln wie die Simulation.

import {
  issue, dist2, isqrt, isCleared, anchorRadius, ankerGegenwart, inDomain, buffAt, rng, cosDeg, sinDeg,
  unterhaltProMin, foerderungProMin, gesperrt, kannLernen, faehigkeitVon,
} from './sim.js';
import { BUILDINGS, UNITS, FACTIONS, MAP, FAEHIGKEITEN } from './defs.js';

const PLAN = {
  mensch: {
    anker: 'turm', kraft: 'schmiede', fron: 'saege', blut: 'schacht', fabrik: 'kaserne',
    zorn: 'banner', wehr: 'kapelle',
    bauer: 'bauer', leicht: 'soldat', fern: 'jaeger', schwer: 'soeldner',
  },
  gott: {
    anker: 'hain', kraft: 'quelle', fron: 'moos', blut: 'blutwurz', fabrik: 'dickicht',
    zorn: 'dornenschrein', wehr: 'steinkreis',
    bauer: 'dryade', leicht: 'wolf', fern: 'waldgeist', schwer: 'ent',
  },
};

// Reihenfolge im Skillbaum: erst die Fernkaempfer, dann Zorn und Schaden,
// der Kommandant mit seiner Faehigkeit, Wirtschaft, Wehr, die schweren
// Einheiten, der Rest. Fraktionsgleich.
const LERNEN = {
  mensch: [
    'bogenbau', 'kriegsbanner', 'klingen', 'heldenmut', 'schlachtruf', 'fronvoegte',
    'kapellenbau', 'soeldnervertraege', 'kettenhemden', 'drillmeister', 'sold',
  ],
  gott: [
    'waldgeister', 'dornen', 'faenge', 'rinde', 'wurzelgriff', 'saftfluss',
    'steine', 'ents', 'borke', 'keimkraft', 'genuegsamkeit',
  ],
};

// Reihenfolge der Ausbildung; "schwer" nur mit Goetterblut.
const MISCHUNG = ['leicht', 'fern', 'leicht', 'fern', 'schwer'];

/** Heereswert in Fron -- Wellen und Leibwache zaehlen Wert, nicht Koepfe. */
const wert = (units) => units.reduce((s, u) => s + UNITS[u.type].cost.fron, 0);

/**
 * Spielstile, fraktionsneutral. Messungen mit nur einem Stil messen vor
 * allem diesen Stil (docs/scope.md); tools/sweep.mjs kann alle Paarungen
 * gegeneinander spielen lassen.
 *   welle:     Heereswert (Fron), ab dem eine Welle losgeht -- mindestens;
 *              gegen ein starkes Heer daheim mehr. Wert statt Koepfe, sonst
 *              griffe der Gott mit seinen wenigen starken Einheiten nie an
 *   ankerAb:   Fron-Polster, ab dem zusaetzliche Anker gesetzt werden
 *   ankerTakt: Minuten je zusaetzlichem Anker
 *   kdtVorn:   Kommandant geht nach vorn (kaempft, baut Aussenposten an
 *              den Adern) statt hinten beim Hauptgebaeude zu bauen
 *   wache:     so viel Heereswert bleibt mindestens als Leibwache beim
 *              Kommandanten, mehr bei grossem Heer (drei Zehntel)
 */
export const STILE = {
  sturm: { welle: 300, ankerAb: 400, ankerTakt: 2, kdtVorn: true, wache: 120 },
  standard: { welle: 550, ankerAb: 250, ankerTakt: 1, kdtVorn: false, wache: 220 },
  burg: { welle: 900, ankerAb: 150, ankerTakt: 1, kdtVorn: false, wache: 320 },
};

// So viele Anker setzt die KI hoechstens von sich aus (ohne Vorstoss zur Ader).
const ANKER_HOECHSTENS = 8;

// Wie weit "hinten" fuer die KI reicht: Umkreis um das eigene Hauptgebaeude.
const HINTEN = 3000;

export function createAI(player = 1, seed = 1, stil = 'standard') {
  return {
    player, next: 20, welle: 0, zug: 0, seed: seed | 0, unterwegs: [], welleZiel: 0, stil: STILE[stil],
    letzterBau: null, gesperrt: [],
  };
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
  // Arbeiter bauen, Kaempfer kaempfen -- Wellen, Wache und Abwehr ohne Arbeiter.
  const arbeiter = einheiten.filter((u) => UNITS[u.type].worker);
  const kaempfer = einheiten.filter((u) => !UNITS[u.type].worker && u !== kdt);
  const zahl = (t) => bauten.filter((b) => b.type === t).length;
  const kosten = (t) => BUILDINGS[t].cost.fron;
  const fron = p.fron;
  const minute = (world.tick / 600) | 0;
  const frei = (t) => !gesperrt(world, ai.player, t);

  const sicher = (pt, r) => feindeBei(world, ai.player, pt, r) === 0;
  // Erbauer je Baustelle -- Baustellen wachsen nur, solange jemand daran arbeitet.
  const helfer = {};
  for (const u of einheiten) if (u.auftrag) helfer[u.auftrag] = (helfer[u.auftrag] || 0) + 1;
  const offen = bauten.filter((b) => !b.done);

  // 0a. Arbeiter: Wer einen Auftrag hat, bleibt dabei. Freie gehen zur
  //     sicheren Baustelle mit den wenigsten Erbauern, bei Gleichstand zur
  //     naechsten; ohne Baustelle zurueck zum Hauptgebaeude.
  const baustellen = offen.filter((b) => sicher(b, 1200)).sort((a, b) => a.id - b.id);
  for (const u of arbeiter.slice().sort((a, b) => a.id - b.id)) {
    if (u.auftrag && baustellen.some((b) => b.id === u.auftrag)) continue;
    if (baustellen.length) {
      const site = wenigsteHelfer(baustellen, helfer, u);
      helfer[site.id] = (helfer[site.id] || 0) + 1;
      issue(world, { type: 'bauen', player: ai.player, ids: [u.id], id: site.id });
    } else if (!u.auftrag && dist2(u.x, u.y, haupt.x, haupt.y) > 900 * 900 && (u.tx !== haupt.x || u.ty !== haupt.y)) {
      issue(world, { type: 'move', player: ai.player, ids: [u.id], x: haupt.x, y: haupt.y });
    }
  }

  // 0. Skillbaum: der naechste Skill der festen Reihenfolge, sobald die
  //    Punkte reichen -- wird gespart, nicht uebersprungen.
  const naechsterSkill = LERNEN[p.faction].find((id) => !p.gelernt.includes(id));
  if (naechsterSkill && kannLernen(world, ai.player, naechsterSkill)) {
    issue(world, { type: 'lernen', player: ai.player, skill: naechsterSkill });
  }

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
  // Abgelehnte Bauten merken: Steht nach einem Bauauftrag nichts an der
  // Stelle, sperrt die KI den Platz fuer zwei Minuten und plant weiter --
  // sonst wiederholt sie einen Auftrag, den die Simulation jedes Mal ablehnt,
  // und kommt nie zur Produktion.
  if (ai.letzterBau) {
    const l = ai.letzterBau;
    const r = BUILDINGS[l.building].radius + 200;
    if (!bauten.some((b) => b.type === l.building && dist2(b.x, b.y, l.x, l.y) <= r * r)) {
      ai.gesperrt.push({ building: l.building, x: l.x, y: l.y, bis: world.tick + 1200 });
    }
    ai.letzterBau = null;
  }
  ai.gesperrt = ai.gesperrt.filter((g) => g.bis > world.tick);
  // Nicht mehr offene Baustellen als Erbauer: Eine Baustelle ohne Erbauer
  // bindet nur Fron.
  const erbauerZahl = arbeiter.length + (kdt ? 1 : 0);
  const bau = (building, x, y) => {
    if (offen.length >= Math.max(1, erbauerZahl)) return false;
    if (ai.gesperrt.some((g) => g.building === building && dist2(g.x, g.y, x, y) < 200 * 200)) return false;
    issue(world, { type: 'build', player: ai.player, building, x, y });
    ai.letzterBau = { building, x, y };
    return true;
  };

  // Wer keine Fabrik hat, baut sie zuerst nach der ersten Foerderung -- ohne
  // Armee ist jede Wirtschaft nur Beute.
  // Fabriken nach Spielzeit, nicht nach Vorrat: wer spart, soll nicht weniger bauen.
  const fabrikZiel = 1 + (minute >= 6 ? 1 : 0) + (minute >= 11 ? 1 : 0);
  const fronZiel = zahl(plan.fabrik) === 0 ? 1 : 3 + (minute >= 9 ? 1 : 0) + (minute >= 15 ? 1 : 0);
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
    if (bilanz >= BUILDINGS[plan.fron].gegenwartIn && bau(plan.fron, ader.x, ader.y)) return;
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
    const platz = daheimFrei(world, haupt, plan.kraft, 700 + n * 250, front + 40 + n * 83);
    if (platz && bau(plan.kraft, ...platz)) return;
  }

  // 3. Fabrik
  if (zahl(plan.fabrik) < fabrikZiel && fron >= kosten(plan.fabrik) && bilanz >= BUILDINGS[plan.fabrik].gegenwartIn) {
    const n = zahl(plan.fabrik);
    const platz = daheimFrei(world, haupt, plan.fabrik, 900, front + 200 + n * 70);
    if (platz && bau(plan.fabrik, ...platz)) return;
  }

  // 3a. Schreine: ab Minute 5 je einer fuer Zorn und Wehr beim Hauptgebaeude --
  //     dort wird verteidigt, dort zaehlt der Heimvorteil.
  if (minute >= 5 && zahl(plan.fabrik) > 0) {
    for (const [rolle, grad] of [['zorn', 120], ['wehr', -120]]) {
      const typ = plan[rolle];
      if (zahl(typ) > 0 || !frei(typ) || fron < kosten(typ) || bilanz < BUILDINGS[typ].gegenwartIn) continue;
      const platz = daheimFrei(world, haupt, typ, 600, front + grad);
      if (platz && bau(typ, ...platz)) return;
    }
  }

  // 3b. Goetterblut: Schacht auf die Ader, oder die Domaene zur Ader schieben.
  if (veneBereit && fron >= kosten(plan.blut) && bilanz >= BUILDINGS[plan.blut].gegenwartIn) {
    if (bau(plan.blut, vene.x, vene.y)) return;
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
        if (platz && bau(plan.anker, platz.x, platz.y)) return;
      }
    } else {
      const reg = world.regions[posten.region];
      const quelleDa = bauten.some(
        (b) => BUILDINGS[b.type].gegenwartOut && dist2(b.x, b.y, posten.x, posten.y) <= start * start
      );
      if (posten.done && (!reg || reg.supply === 0) && !quelleDa && fron >= kosten(plan.kraft)) {
        const platz = nahePlatz(world, posten, haupt, 350, BUILDINGS[plan.kraft].radius, plan.kraft, 90);
        if (platz && bau(plan.kraft, platz.x, platz.y)) return;
      }
    }
  } else if (vene && !veneBereit && !ankerImBau && fron >= kosten(plan.anker) + 100) {
    // Lohnt der Vorstoss? Nur wenn zwei neue Anker die Luecke schliessen.
    // Sonst warten: wachsende Kreise oder Anker am Rand bringen die Ader naeher.
    // Dieselbe Regel fuer alle -- der Startradius der Fraktion entscheidet.
    const platz = vorstoss(world, ai.player, haupt, vene, plan.anker);
    const start = FACTIONS[p.faction].growth.start;
    if (platz && dist2(platz.x, platz.y, vene.x, vene.y) <= 4 * start * start) {
      if (bau(plan.anker, platz.x, platz.y)) return;
    }
  }

  // 4. Anker. Die Zahl steigt mit der Zeit. Jeder neue Anker kommt an den
  //    Rand der eigenen Domaene, moeglichst weit weg von den bestehenden --
  //    sonst ueberdecken sich die Kreise und Wachstum bringt keine Flaeche.
  // Gedeckelt: spaet im Spiel braucht es Truppen, nicht den zwanzigsten Anker.
  const ankerZiel = Math.min(ANKER_HOECHSTENS, 2 + ((minute / ai.stil.ankerTakt) | 0));
  if (zahl(plan.anker) < ankerZiel && fron >= kosten(plan.anker) + ai.stil.ankerAb) {
    const platz = randplatz(world, ai, haupt, front, bauten, plan.anker);
    if (platz && bau(plan.anker, platz.x, platz.y)) return;
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
      const frei = !blockiert(world, x, y, BUILDINGS[plan.anker].radius);
      if (frei && (!BUILDINGS[plan.anker].needsGrowth || !isCleared(world, x, y)) && bau(plan.anker, x, y)) return;
    }
  }

  // 6. Produktion. Erst genug Arbeiter, dann Kaempfer in fester Mischung;
  //    schwer nur mit Goetterblut. Solange die Wirtschaft unvollstaendig ist,
  //    wird fuer den naechsten Bau gespart.
  // Ist das Heer kleiner als eine Welle, wird nicht gespart: ohne Truppen ist
  // jede Wirtschaft nur Beute (und der Kommandant schutzlos).
  const heerSchwach = minute >= 5 && wert(kaempfer) < ai.stil.welle;
  const sparen = heerSchwach ? 0 : naechster ? kosten(naechster) : vene ? kosten(plan.anker) + 100 : 0;
  let rest = fron;
  let blutRest = p.goetterblut;
  const blutSchwer = UNITS[plan.schwer].cost.goetterblut || 0;
  const tiefe = fron > 900 ? 3 : fron > 400 ? 2 : 1;
  // Arbeiter nach Baukraft: Bauern bauen schwaecher als Dryaden, also mehr davon.
  const zielKraft = 1200 + (minute >= 6 ? 800 : 0) + (minute >= 12 ? 800 : 0);
  const arbeiterZiel = Math.ceil(zielKraft / UNITS[plan.bauer].build.power);
  let arbeiterBestellt = arbeiter.length;
  for (const b of bauten) arbeiterBestellt += b.queue ? b.queue.filter((u) => u === plan.bauer).length : 0;
  for (const f of bauten) {
    if (!f.done || !BUILDINGS[f.type].buildList || f.queue.length >= tiefe) continue;
    const liste = BUILDINGS[f.type].buildList;
    let unit = null;
    if (arbeiterBestellt < arbeiterZiel && liste.includes(plan.bauer)) {
      unit = plan.bauer;
      arbeiterBestellt++;
    } else {
      // Schwer, sobald Goetterblut reicht -- reichlich Blut heisst nur noch schwer.
      // Sonst die naechste Rolle der Mischung, die diese Fabrik bauen kann.
      const schwerMoeglich = blutRest >= blutSchwer && frei(plan.schwer);
      const reichlich = schwerMoeglich && blutSchwer > 0 && blutRest >= 3 * blutSchwer;
      if (reichlich && liste.includes(plan.schwer)) unit = plan.schwer;
      for (let k = 0; !unit && k < MISCHUNG.length; k++) {
        const rolle = MISCHUNG[(ai.zug + k) % MISCHUNG.length];
        if (rolle === 'schwer' && !schwerMoeglich) continue;
        if (liste.includes(plan[rolle]) && frei(plan[rolle])) {
          unit = plan[rolle];
          ai.zug += k + 1;
        }
      }
    }
    if (!unit || rest - UNITS[unit].cost.fron < sparen) continue;
    rest -= UNITS[unit].cost.fron;
    blutRest -= UNITS[unit].cost.goetterblut || 0;
    issue(world, { type: 'produce', player: ai.player, id: f.id, unit });
  }

  // Der Kommandant ist vital: Wer ihn verliert, verliert die Partie.
  // Rueckzug bei halbem Leben oder wenn er draussen auf Feinde trifft.
  // Rueckzug unter halbem Leben oder wenn er draussen auf Feinde trifft.
  // Eine KI-Entscheidung, keine Regel: Heilung gibt es nicht.
  const rueckzug =
    kdt &&
    (kdt.hp * 2 < kdt.maxHp || (feindeBei(world, ai.player, kdt, 1200) >= 2 && !inDomain(world, ai.player, kdt.x, kdt.y)));

  // 6a. Faehigkeit des Kommandanten: ein Ruf, wenn genug eigene Kaempfer
  //     bei ihm stehen und Feinde nahe sind; ein Griff auf den dichtesten
  //     Haufen Feinde in Reichweite.
  const faeh = kdt && world.tick >= p.faehigkeitBereit ? faehigkeitVon(world, ai.player) : null;
  if (faeh) {
    const f = FAEHIGKEITEN[faeh];
    if (f.art === 'ruf') {
      const eigene = kaempfer.filter((u) => dist2(u.x, u.y, kdt.x, kdt.y) <= f.radius * f.radius).length;
      if (eigene >= 5 && feindeBei(world, ai.player, kdt, f.radius) >= 3) {
        issue(world, { type: 'faehigkeit', player: ai.player, x: kdt.x, y: kdt.y });
      }
    } else {
      let best = null;
      let bestN = 3;
      for (const o of world.entities) {
        if (o.dead || o.player === ai.player || o.kind !== 'unit') continue;
        if (dist2(o.x, o.y, kdt.x, kdt.y) > f.reichweite * f.reichweite) continue;
        const n = feindeBei(world, ai.player, o, f.radius);
        if (n > bestN) {
          bestN = n;
          best = o;
        }
      }
      if (best) issue(world, { type: 'faehigkeit', player: ai.player, x: best.x, y: best.y });
    }
  }

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
    const ids = kaempfer
      .concat(kdtHilft ? [kdt] : [])
      .filter((u) => !ai.unterwegs.includes(u.id))
      .map((u) => u.id);
    if (ids.length) issue(world, { type: 'attack', player: ai.player, ids, x: bedrohung.x, y: bedrohung.y });
  }

  // 8. Angriff in wachsenden Wellen. Erstes Ziel ist ein gegnerischer
  //    Foerderbau fuer Goetterblut -- die Mitte entscheidet --, sonst das
  //    Hauptgebaeude. Faellt das Ziel, zieht die Welle zum naechsten weiter.
  ai.unterwegs = ai.unterwegs.filter((id) => einheiten.some((u) => u.id === id));
  // Leibwache: Wer seinen Kommandanten verliert, verliert die Partie. Die ihm
  // naechsten Einheiten bleiben bei ihm, nur der Rest geht mit Wellen.
  const daheimAlle = kaempfer.filter((u) => !ai.unterwegs.includes(u.id));
  const nachNaehe = kdt
    ? daheimAlle
        .slice()
        .sort((a, b) => dist2(a.x, a.y, kdt.x, kdt.y) - dist2(b.x, b.y, kdt.x, kdt.y) || a.id - b.id)
    : daheimAlle;
  const wacheWert = kdt ? Math.max(ai.stil.wache, ((wert(nachNaehe) * 3) / 10) | 0) : 0;
  let wacheZahl = 0;
  for (let w = 0; wacheZahl < nachNaehe.length && w < wacheWert; wacheZahl++) w += UNITS[nachNaehe[wacheZahl].type].cost.fron;
  const wache = nachNaehe.slice(0, wacheZahl);
  const daheimStehend = nachNaehe.slice(wacheZahl);
  const angriff = gegnerFoerderung(world, ai.player, haupt) || ziel;
  if (ai.unterwegs.length && angriff && !world.entities.some((e) => e.id === ai.welleZiel && !e.dead)) {
    ai.welleZiel = angriff.id;
    issue(world, { type: 'attack', player: ai.player, ids: ai.unterwegs.slice(), x: angriff.x, y: angriff.y });
  }
  // Nur angreifen, wenn die Welle das gegnerische Heer daheim samt dessen
  // Heimvorteil uebertrifft -- sonst zerschellt sie an der Verteidigung.
  // Ausser das Heer ist satt: Der Unterhalt frisst die Foerderung fast ganz,
  // es waechst nicht mehr. Dann bringt Warten nichts, und es geht los.
  const gegnerDaheim = heimHeer(world, ai.player);
  const satt = minute >= 8 && unterhaltProMin(world, ai.player) * 10 >= foerderungProMin(world, ai.player) * 8;
  const genug = satt
    ? ai.stil.welle
    : Math.max(ai.stil.welle, ((gegnerDaheim * 12) / 10) | 0);
  if (!bedrohung && wert(daheimStehend) >= genug && angriff) {
    ai.welle++;
    ai.welleZiel = angriff.id;
    const ids = daheimStehend.map((u) => u.id);
    ai.unterwegs.push(...ids);
    issue(world, { type: 'attack', player: ai.player, ids, x: angriff.x, y: angriff.y });
    return;
  }

  // 9a. Kommandant: bei Gefahr heim. Sonst bleibt er bei seinem Bauauftrag
  //     oder geht zur sicheren Baustelle mit den wenigsten Erbauern, sonst zu
  //     einer sicheren Ader, sonst an die Front.
  if (kdt && rueckzug) {
    if (kdt.tx !== haupt.x || kdt.ty !== haupt.y) {
      issue(world, { type: 'move', player: ai.player, ids: [kdt.id], x: haupt.x, y: haupt.y });
    }
  } else if (kdt && !bedrohung && !ai.stil.kdtVorn) {
    // Hinten: in der Naehe des Hauptgebaeudes bleiben, dort beim Bauen helfen.
    const innen = HINTEN - 400;
    const nahe = offen.filter((b) => dist2(b.x, b.y, haupt.x, haupt.y) <= innen * innen);
    const site = nahe.find((b) => b.id === kdt.auftrag) || (nahe.length ? wenigsteHelfer(nahe, helfer, kdt) : null);
    if (site) {
      if (kdt.auftrag !== site.id) issue(world, { type: 'bauen', player: ai.player, ids: [kdt.id], id: site.id });
    } else if (!kdt.auftrag && dist2(kdt.x, kdt.y, haupt.x, haupt.y) > innen * innen && (kdt.tx !== haupt.x || kdt.ty !== haupt.y)) {
      issue(world, { type: 'move', player: ai.player, ids: [kdt.id], x: haupt.x, y: haupt.y });
    }
  } else if (kdt && !bedrohung) {
    const sichere = offen.filter((b) => sicher(b, 1500));
    const site = sichere.find((b) => b.id === kdt.auftrag) || (sichere.length ? wenigsteHelfer(sichere, helfer, kdt) : null);
    const vorn = ziel ? vordersterAnker(world, bauten, ziel) : null;
    if (site) {
      if (kdt.auftrag !== site.id) issue(world, { type: 'bauen', player: ai.player, ids: [kdt.id], id: site.id });
    } else {
      const hin = vene && !veneBereit && sicher(vene, 2000) ? vene : vorn;
      if (hin && !kdt.auftrag && dist2(kdt.x, kdt.y, hin.x, hin.y) > 700 * 700 && (kdt.tx !== hin.x || kdt.ty !== hin.y)) {
        issue(world, { type: 'move', player: ai.player, ids: [kdt.id], x: hin.x, y: hin.y });
      }
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

/**
 * Wert des gegnerischen Heers, das in seiner eigenen Domaene steht, gewichtet
 * mit der Wirkung seiner Schreine dort (Zorn und Wehr). Arbeiter zaehlen nicht.
 */
function heimHeer(world, me) {
  let summe = 0;
  for (const o of world.entities) {
    if (o.dead || o.player === me || o.kind !== 'unit') continue;
    const d = UNITS[o.type];
    if (d.worker || !d.weapon || !inDomain(world, o.player, o.x, o.y)) continue;
    const kosten = d.commander ? 600 : d.cost.fron;
    const b = buffAt(world, o.player, o.x, o.y);
    summe += ((((kosten * (1000 + b.zorn)) / 1000) * 1000) / (1000 - b.wehr)) | 0;
  }
  return summe;
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

/**
 * Baustelle mit den wenigsten Erbauern (ohne den Fragenden selbst), bei
 * Gleichstand die naechste, dann die aeltere.
 */
function wenigsteHelfer(baustellen, helfer, u) {
  let best = null;
  let bestN = Infinity;
  let bestD = Infinity;
  for (const b of baustellen) {
    const n = (helfer[b.id] || 0) - (u.auftrag === b.id ? 1 : 0);
    const d = dist2(b.x, b.y, u.x, u.y);
    if (n < bestN || (n === bestN && d < bestD)) {
      bestN = n;
      bestD = d;
      best = b;
    }
  }
  return best;
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

/**
 * Naechste freie Ader. Gleich weite Adern (die seitlichen Goetterblut-Adern
 * liegen fuer beide Basen gleich weit) entscheidet die Seite, relativ zur
 * Richtung zur Kartenmitte -- punktsymmetrisch, nicht die Listenreihenfolge,
 * die beide Sitzplaetze verschieden behandeln wuerde.
 */
function freieAder(world, von, kind) {
  let best = null;
  let bestD = Infinity;
  let bestSeite = Infinity;
  const mx = (MAP >> 1) - von.x;
  const my = (MAP >> 1) - von.y;
  for (const d of world.deposits) {
    if (d.kind !== kind || d.takenBy !== 0) continue;
    const dd = dist2(von.x, von.y, d.x, d.y);
    const seite = mx * (d.y - von.y) - my * (d.x - von.x);
    if (dd < bestD || (dd === bestD && seite < bestSeite)) {
      bestD = dd;
      bestSeite = seite;
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

/**
 * Wie daheim(), aber nur ein freier Platz: Ist er belegt -- etwa weil ein
 * zerstoerter Bau die Zaehlung verschoben hat --, weiter aussen und seitlich
 * suchen. Ohne freien Platz null, sonst haengt die KI an einem Bau fest, den
 * die Simulation jedes Mal ablehnt.
 */
function daheimFrei(world, haupt, typ, radius, grad) {
  const r = BUILDINGS[typ].radius;
  for (let k = 0; k < 15; k++) {
    const [x, y] = daheim(world, haupt, radius + ((k / 3) | 0) * 250, grad + [0, 35, -35][k % 3]);
    if (blockiert(world, x, y, r)) continue;
    if (world.deposits.some((d) => dist2(d.x, d.y, x, y) < (r + 120) * (r + 120))) continue;
    return [x, y];
  }
  return null;
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
