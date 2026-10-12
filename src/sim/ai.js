// Einfacher Gegner. Bewusst dumm: er soll Druck erzeugen, damit sich die
// Domänenmechanik unter Stress zeigt. Nutzt nur issue(), nie direkten Zugriff.
// Nur Integer-Arithmetik und rng() -- dieselben Regeln wie die Simulation.
// Vom Gegner weiss die KI nur, was ihre Einheiten und Gebaeude sehen oder
// gesehen haben (src/sim/kunde.js) -- der Nebel gilt auch fuer sie.

import {
  issue, dist2, isqrt, isCleared, anchorRadius, ankerGegenwart, inDomain, rng, cosDeg, sinDeg,
  unterhaltProMin, foerderungProMin, aufHindernis, gesperrt, kannLernen, faehigkeitenVon, faehigkeitWarten,
  erreicht, zieleVon, canAfford, anzahlVon, schlagBereit,
} from './sim.js';
import { neueKunde, aufklaeren, vermutetesHaupt, bekanntBei, gegnerPlaetze } from './kunde.js';
import { BUILDINGS, UNITS, FACTIONS, MAP, FAEHIGKEITEN } from './defs.js';


// Reihenfolge der Ausbildung; "schwer" nur mit Goetterblut.
const MISCHUNG = ['leicht', 'fern', 'leicht', 'fern', 'schwer'];

/** Heereswert in Fron -- Wellen und Leibwache zaehlen Wert, nicht Koepfe. */
const wert = (units) => units.reduce((s, u) => s + UNITS[u.type].cost.fron, 0);

/** Schiesst das Gebaeude auf Bodenziele? Eine Flak deckt kein Gebaeude und haelt keine Bodenwelle auf. */
const bodenTurm = (typ) => !!BUILDINGS[typ].weapon && zieleVon(BUILDINGS[typ]) !== 'luft';

/** Kann die Einheit Gebaeude angreifen? Reine Luftjaeger koennen es nicht -- sie ziehen nicht mit Wellen. */
const trifftBoden = (u) => zieleVon(UNITS[u.type]) !== 'luft';

/** Ein bewaffneter Flieger (ein Spaeher hat keine Waffe). */
const kampfFlieger = (typ) => !!UNITS[typ].fliegt && !!UNITS[typ].weapon;

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

/**
 * Schwierigkeitsgrade -- nur Verhalten, keine Boni bei Ressourcen oder Werten.
 *   takt:       Ticks zwischen zwei Entscheidungen (Reaktionszeit)
 *   arbeiter:   Promille der Arbeiter-Baukraft, die gehalten wird
 *   fabriken:   Minuten, ab denen die zweite und dritte Fabrik kommen
 *   ausbau:     Minuten, ab denen das vierte und fuenfte Fron-Vorkommen dran sind
 *   turmAb:     ab dieser Minute der erste Turm
 *   satt:       Unterhalt in Promille der Foerderung, ab dem das Heer losgeht
 *   welle:      Promille des Wellenwerts aus dem Stil
 *   faehigkeiten, reparatur: setzt sie ein bzw. repariert
 * "mittel" ist die KI bis Version 0.23.
 */
export const STUFEN = {
  leicht: {
    takt: 44, arbeiter: 700, fabriken: [8, 99], ausbau: [12, 99], turmAb: 10, satt: 950, welle: 1500,
    faehigkeiten: false, reparatur: false,
  },
  mittel: {
    takt: 22, arbeiter: 1000, fabriken: [6, 11], ausbau: [9, 15], turmAb: 3, satt: 800, welle: 1000,
    faehigkeiten: true, reparatur: true,
  },
  schwer: {
    takt: 11, arbeiter: 1300, fabriken: [4, 8], ausbau: [6, 11], turmAb: 3, satt: 700, welle: 900,
    faehigkeiten: true, reparatur: true,
  },
};

export function createAI(player = 1, seed = 1, stil = 'standard', stufe = 'mittel') {
  return {
    player, next: 20, welle: 0, zug: 0, seed: seed | 0, unterwegs: [], welleZiel: 0, stil: STILE[stil],
    stufe: STUFEN[stufe], letzterBau: null, gesperrt: [],
    // Ziel der laufenden Welle: Gebaeude-Id (0 = vermutetes Hauptgebaeude), Ort, und ob es das Hauptgebaeude ist
    welleX: 0, welleY: 0, welleAufHaupt: false,
    // Raben: wie viele es beim letzten Zug gab, und ab wann nach einem Verlust ein neuer kommt
    rabenVorher: 0, rabeAb: 0,
    // Gegner, auf den sie zielt (Spielernummer, -1 noch keiner), und seit wann -- bei mehr als zwei Spielern
    gegner: -1, gegnerSeit: 0,
    kunde: neueKunde(player),
  };
}

// Mindestens so lange bleibt die KI bei einem Gegner, bevor sie zu einem
// anderen wechselt, der sie angreift (Ticks, 2 min). Designzahl, ungemessen:
// ohne das springt das Ziel (und mit ihm die Bauausrichtung zur Front) hin und
// her, sobald zwei Gegner abwechselnd vor der Tuer stehen.
const GEGNER_WECHSEL = 1200;

/**
 * Der Gegner, auf den die KI gerade zielt -- nur aus dem, was die Kunde kennt.
 * Mit einem lebenden Gegner ist die Wahl trivial (Verhalten wie bei zwei
 * Spielern). Mit mehreren (Designzahl, ungemessen): wer die KI angreift --
 * ein gesehener Kaempfer in ihrer Domaene --, wird ihr Ziel, sonst der
 * naechste: der, dessen Hauptgebaeude (gesehen, sonst Startplatz) dem eigenen
 * am naechsten steht. Sie bleibt bei ihm, bis er ausscheidet oder (nach
 * GEGNER_WECHSEL) ein anderer sie angreift. Liefert { player, x, y } oder null.
 */
function waehleGegner(ai, world, kunde, haupt) {
  let kand = gegnerPlaetze(world, ai.player, haupt, true);
  if (!kand.length) kand = gegnerPlaetze(world, ai.player, haupt);
  if (!kand.length) return null;
  let wahl = kand.length === 1 ? kand[0] : kand.find((c) => c.player === ai.gegner) || null;
  if (kand.length > 1 && (!wahl || world.tick - ai.gegnerSeit >= GEGNER_WECHSEL)) {
    // Angreifer: der naechste gesehene Kaempfer in der eigenen Domaene
    let nah = null;
    let nahD = Infinity;
    for (const o of kunde.einheiten) {
      if (!UNITS[o.type].weapon || !kand.some((c) => c.player === o.player) || !inDomain(world, ai.player, o.x, o.y)) continue;
      const dd = dist2(o.x, o.y, haupt.x, haupt.y);
      if (dd < nahD) {
        nahD = dd;
        nah = o;
      }
    }
    if (nah) wahl = kand.find((c) => c.player === nah.player);
  }
  if (!wahl) {
    let bestD = Infinity;
    for (const c of kand) {
      const bekannt = kunde.gebaeude.find((g) => g.player === c.player && BUILDINGS[g.type].vital) || c;
      const dd = dist2(bekannt.x, bekannt.y, haupt.x, haupt.y);
      if (dd < bestD) {
        bestD = dd;
        wahl = c;
      }
    }
  }
  if (wahl.player !== ai.gegner) {
    ai.gegner = wahl.player;
    ai.gegnerSeit = world.tick;
  }
  return wahl;
}

export function stepAI(ai, world) {
  if (world.over || world.tick < ai.next) return;
  ai.next = world.tick + ai.stufe.takt;

  const p = world.players[ai.player];
  if (!p.alive) return; // ausgeschieden: seine Reste verfallen, geplant wird nichts mehr
  const plan = FACTIONS[p.faction].rollen; // Bau-Rollen (src/sim/voelker/)
  const mine = world.entities.filter((e) => e.player === ai.player && !e.dead);
  const haupt = mine.find((e) => e.kind === 'building' && BUILDINGS[e.type].vital);
  if (!haupt) return;
  const kunde = aufklaeren(ai.kunde, world);

  // Eigene Bauplaene zaehlen wie Baustellen: Sie werden bezahlt, sobald ein
  // Arbeiter anfaengt, und sollen nicht doppelt gesetzt werden.
  const plaene = world.plaene
    .filter((q) => q.player === ai.player)
    .map((q) => ({
      id: q.id, kind: 'building', type: q.type, player: q.player, x: q.x, y: q.y,
      done: false, plan: true, powered: 1000, hp: 1, maxHp: 1, queue: [], progress: 0, region: -1,
    }));
  const gebaeude = mine.filter((e) => e.kind === 'building');
  const bauten = gebaeude.concat(plaene);
  const einheiten = mine.filter((e) => e.kind === 'unit');
  // Der Kommandant kaempft mit, baut aber vor allem: er geht nicht mit Wellen.
  const kdt = einheiten.find((u) => UNITS[u.type].commander) || null;
  // Arbeiter bauen, Kaempfer kaempfen -- Wellen, Wache und Abwehr ohne Arbeiter.
  const arbeiter = einheiten.filter((u) => UNITS[u.type].worker);
  const kaempfer = einheiten.filter((u) => !UNITS[u.type].worker && u !== kdt && UNITS[u.type].weapon);
  // Spaeher: Flieger ohne Waffe. Bewaffnete Flieger sind Kaempfer wie alle.
  const raben = einheiten.filter((u) => UNITS[u.type].fliegt && !UNITS[u.type].weapon);
  // Bewaffnete gegnerische Flieger, die die Kunde kennt (gesehen enthaelt auch
  // die, die man gerade sieht)
  const feindFlieger = kunde.gesehen.filter((o) => kampfFlieger(o.type)).length;
  const feindLuft = kunde.gesehen.filter((o) => UNITS[o.type].fliegt).length;
  const zahl = (t) => bauten.filter((b) => b.type === t).length;
  const kosten = (t) => BUILDINGS[t].cost.fron;
  const fron = p.fron;
  const minute = (world.tick / 600) | 0;
  const frei = (t) => !gesperrt(world, ai.player, t);

  const sicher = (pt, r) => feindeBei(kunde, pt, r) === 0;
  // Erbauer je Baustelle -- Baustellen wachsen nur, solange jemand daran arbeitet.
  const helfer = {};
  for (const u of einheiten) if (u.auftrag) helfer[u.auftrag] = (helfer[u.auftrag] || 0) + 1;
  const offen = bauten.filter((b) => !b.done);

  // Ein Plan, zu dem niemand unterwegs ist und bei dem Feinde stehen, bindet
  // nur Fron und Bauplaetze -- anders als eine Baustelle zerstoert ihn auch
  // niemand. Verwerfen; gebaut wird spaeter, wo es sicher ist.
  for (const q of plaene) {
    if (!helfer[q.id] && !sicher(q, 1200)) issue(world, { type: 'planWeg', player: ai.player, id: q.id });
  }

  // 0a. Arbeiter: Wer einen Auftrag hat, bleibt dabei. Freie gehen zur
  //     sicheren Baustelle mit den wenigsten Erbauern, bei Gleichstand zur
  //     naechsten; gibt es keine, reparieren sie ein sicheres beschaedigtes
  //     Gebaeude; sonst zurueck zum Hauptgebaeude.
  const baustellen = offen.filter((b) => sicher(b, 1200)).sort((a, b) => a.id - b.id);
  const kaputt = ai.stufe.reparatur
    ? bauten.filter((b) => b.done && b.hp < b.maxHp && sicher(b, 1200)).sort((a, b) => a.id - b.id)
    : [];
  const ziele = baustellen.length ? baustellen : kaputt;
  for (const u of arbeiter.slice().sort((a, b) => a.id - b.id)) {
    if (u.auftrag && (baustellen.some((b) => b.id === u.auftrag) || kaputt.some((b) => b.id === u.auftrag))) continue;
    if (ziele.length) {
      const site = wenigsteHelfer(ziele, helfer, u);
      helfer[site.id] = (helfer[site.id] || 0) + 1;
      issue(world, { type: 'bauen', player: ai.player, ids: [u.id], id: site.id });
    } else if (!u.auftrag && dist2(u.x, u.y, haupt.x, haupt.y) > 900 * 900 && (u.tx !== haupt.x || u.ty !== haupt.y)) {
      issue(world, { type: 'move', player: ai.player, ids: [u.id], x: haupt.x, y: haupt.y });
    }
  }

  // 0. Skillbaum: der naechste Skill der festen Reihenfolge, sobald die
  //    Punkte reichen -- wird gespart, nicht uebersprungen.
  const naechsterSkill = FACTIONS[p.faction].lernen.find((id) => !p.gelernt.includes(id));
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
  // Das gegnerische Hauptgebaeude -- gesehen oder dort vermutet, wo der Gegner beginnt.
  // Bei mehreren Gegnern das des gewaehlten (waehleGegner).
  const gegnerWahl = waehleGegner(ai, world, kunde, haupt);
  if (!gegnerWahl) return;
  const ziel = vermutetesHaupt(kunde, haupt, gegnerWahl.player, gegnerWahl);

  // Raben spaehen: jeder fliegt zur Ader auf der gegnerischen Seite, die am
  // laengsten keiner gesehen hat, sonst zum gegnerischen Hauptgebaeude.
  const vergeben = [];
  for (const r of raben) {
    if (!r.arrived) {
      vergeben.push(r.tx * MAP + r.ty);
      continue;
    }
    const z = spaehziel(world, kunde, r, haupt, ziel, vergeben);
    vergeben.push(z.x * MAP + z.y);
    if (r.tx !== z.x || r.ty !== z.y) issue(world, { type: 'move', player: ai.player, ids: [r.id], x: z.x, y: z.y });
  }
  // 0b. Fernschlag (hat das Volk einen): jeder geladene, bezahlbare feuert auf
  //     das wertvollste Ziel, das die Kunde kennt. Die Kosten werden unten von
  //     dem abgezogen, was die Produktion ausgeben darf -- der Befehl wirkt
  //     erst im naechsten Tick, sonst bestellte sie dasselbe Goetterblut noch einmal.
  let schlagFron = 0;
  let schlagBlut = 0;
  for (const b of gebaeude) {
    if (!schlagBereit(b)) continue;
    const s = BUILDINGS[b.type].schlag;
    if (!canAfford({ fron: fron - schlagFron, goetterblut: p.goetterblut - schlagBlut }, s.kosten || {})) continue;
    const z = schlagZiel(kunde, b, s, mine, ziel);
    if (!z) continue;
    issue(world, { type: 'schlag', player: ai.player, id: b.id, x: z.x, y: z.y });
    schlagFron += (s.kosten && s.kosten.fron) || 0;
    schlagBlut += (s.kosten && s.kosten.goetterblut) || 0;
  }
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
    // Foerderung geht immer vor -- ohne sie fehlt spaeter alles.
    if (offen.length >= Math.max(1, erbauerZahl) && building !== plan.fron) return false;
    if (ai.gesperrt.some((g) => g.building === building && dist2(g.x, g.y, x, y) < 200 * 200)) return false;
    issue(world, { type: 'build', player: ai.player, building, x, y });
    ai.letzterBau = { building, x, y };
    return true;
  };

  // Wer keine Fabrik hat, baut sie zuerst nach der ersten Foerderung -- ohne
  // Armee ist jede Wirtschaft nur Beute.
  // Fabriken nach Spielzeit, nicht nach Vorrat: wer spart, soll nicht weniger bauen.
  const [fab2, fab3] = ai.stufe.fabriken;
  const [aus4, aus5] = ai.stufe.ausbau;
  const fabrikZiel = 1 + (minute >= fab2 ? 1 : 0) + (minute >= fab3 ? 1 : 0);
  const fronZiel = zahl(plan.fabrik) === 0 ? 1 : 3 + (minute >= aus4 ? 1 : 0) + (minute >= aus5 ? 1 : 0);
  const ader = freieAder(world, haupt, 'fron', plaene, kunde);

  // Goetterblut liegt in der Mitte. Ein Schacht braucht Gegenwart, also muss
  // die Ader in einer versorgten eigenen Domaene liegen -- hier zaehlt Reichweite.
  // Erst wenn Fron-Foerderung und Fabrik stehen -- sonst frisst der Vorstoss die Wirtschaft.
  const wirtschaftSteht = zahl(plan.fabrik) > 0 && (zahl(plan.fron) >= 3 || !ader);
  const blutZiel = !wirtschaftSteht ? 0 : minute >= 12 ? 2 : 1;
  const vene = zahl(plan.blut) < blutZiel ? freieAder(world, haupt, 'goetterblut', plaene, kunde) : null;
  const veneBereit = vene && versorgt(world, ai.player, vene);

  // 1. Foerderung, aber nur mit Deckung.
  if (ader && zahl(plan.fron) < fronZiel && fron >= kosten(plan.fron)) {
    if (bilanz >= BUILDINGS[plan.fron].gegenwartIn && bau(plan.fron, ader.x, ader.y)) return;
  }

  // 2. Quelle, wenn der naechste Verbraucher nicht gedeckt waere.
  // Verteidigung und Forschung: je eins frueh, je ein zweites ab Minute 12.
  // Der Turm kommt vor der Forschung -- er haelt allein eine fruehe Welle auf.
  const turmZiel = minute >= Math.max(12, ai.stufe.turmAb) ? 2 : minute >= ai.stufe.turmAb ? 1 : 0;
  const forschungZiel = minute >= 12 ? 2 : minute >= 4 ? 1 : 0;
  const naechster =
    ader && zahl(plan.fron) < fronZiel
      ? plan.fron
      : zahl(plan.fabrik) < fabrikZiel
        ? plan.fabrik
        : zahl(plan.turm) < turmZiel
          ? plan.turm
          : veneBereit
            ? plan.blut
            : zahl(plan.forschung) < forschungZiel
              ? plan.forschung
              : ader && zahl(plan.fron) < 3
                ? plan.fron
                : null;
  const bedarf = naechster ? BUILDINGS[naechster].gegenwartIn : 0;
  if (bilanz < bedarf && fron >= kosten(plan.kraft)) {
    const n = zahl(plan.kraft);
    const platz = daheimFrei(world, kunde, haupt, plan.kraft, 700 + n * 250, front + 40 + n * 83);
    if (platz && bau(plan.kraft, ...platz)) return;
  }

  // 3. Fabrik
  if (zahl(plan.fabrik) < fabrikZiel && fron >= kosten(plan.fabrik) && bilanz >= BUILDINGS[plan.fabrik].gegenwartIn) {
    const n = zahl(plan.fabrik);
    const platz = daheimFrei(world, kunde, haupt, plan.fabrik, 900, front + 200 + n * 70);
    if (platz && bau(plan.fabrik, ...platz)) return;
  }

  // 3a. Schreine: ab Minute 5 je einer fuer Zorn und Wehr beim Hauptgebaeude --
  //     dort wird verteidigt, dort zaehlt der Heimvorteil.
  if (minute >= 5 && zahl(plan.fabrik) > 0) {
    for (const [rolle, grad] of [['zorn', 120], ['wehr', -120]]) {
      const typ = plan[rolle];
      if (zahl(typ) > 0 || !frei(typ) || fron < kosten(typ) || bilanz < BUILDINGS[typ].gegenwartIn) continue;
      const platz = daheimFrei(world, kunde, haupt, typ, 600, front + grad);
      if (platz && bau(typ, ...platz)) return;
    }
  }

  // 3c. Verteidigung: ein Turm vor dem Hauptgebaeude zur Front hin.
  const tb = BUILDINGS[plan.turm];
  if (zahl(plan.turm) < turmZiel && fron >= tb.cost.fron && bilanz >= tb.gegenwartIn) {
    const platz = daheimFrei(world, kunde, haupt, plan.turm, 1600, front + (zahl(plan.turm) ? 30 : -30));
    if (platz && bau(plan.turm, ...platz)) return;
  }

  // 3c2. Flak (hat das Volk eine): sobald die Kunde gegnerische Flieger kennt,
  //      eine beim Hauptgebaeude, zwei bei mehreren bewaffneten Fliegern.
  //      Vorher waere sie totes Geld -- sie trifft nichts am Boden.
  if (plan.flak && frei(plan.flak) && feindLuft) {
    const flakZiel = feindFlieger >= 3 ? 2 : 1;
    const fk = BUILDINGS[plan.flak];
    if (zahl(plan.flak) < flakZiel && fron >= fk.cost.fron && bilanz >= (fk.gegenwartIn || 0)) {
      const platz = daheimFrei(world, kunde, haupt, plan.flak, 1000, front + 150 + zahl(plan.flak) * 120);
      if (platz && bau(plan.flak, ...platz)) return;
    }
  }

  // 3d. Forschung beim Hauptgebaeude -- mehr Skillpunkte.
  const fb = BUILDINGS[plan.forschung];
  if (zahl(plan.forschung) < forschungZiel && fron >= fb.cost.fron && bilanz >= fb.gegenwartIn) {
    const platz = daheimFrei(world, kunde, haupt, plan.forschung, 800, front + 180 + zahl(plan.forschung) * 60);
    if (platz && bau(plan.forschung, ...platz)) return;
  }

  // 3e. Spaehposten: einer ab Minute 4 am Rand der Domaene, Richtung Gegner --
  //     er sieht kommen, was angreift. Vorgeschobene Posten an den Adern
  //     kosteten die KI mehr Erbauer, als ihr das Wissen brachte (docs/scope.md,
  //     Abschnitt 20).
  if (plan.posten && frei(plan.posten)) {
    const postenZiel = minute >= 4 ? 1 : 0;
    if (zahl(plan.posten) < postenZiel && fron >= kosten(plan.posten)) {
      const platz = postenPlatz(world, kunde, haupt, ziel, gebaeude, plan.posten);
      if (platz && bau(plan.posten, platz.x, platz.y)) return;
    }
  }

  // 3f. Luftfabrik (hat das Volk eine): eine ab dem mittleren Spiel, wenn die
  //     Wirtschaft steht -- Flieger kosten wie das Heer am Boden Fron und
  //     Unterhalt und sollen die Bodenfabriken nicht ersetzen.
  if (plan.luftfabrik && frei(plan.luftfabrik) && wirtschaftSteht && minute >= 7) {
    const lf = BUILDINGS[plan.luftfabrik];
    if (zahl(plan.luftfabrik) < 1 && fron >= lf.cost.fron && bilanz >= (lf.gegenwartIn || 0)) {
      const platz = daheimFrei(world, kunde, haupt, plan.luftfabrik, 900, front + 270);
      if (platz && bau(plan.luftfabrik, ...platz)) return;
    }
  }

  // 3g. Schildgenerator (hat das Volk einen): einer beim Hauptgebaeude, wenn die
  //     Wirtschaft steht und ab Minute 10 -- vorher waere Fron fuer Schutz
  //     verschwendet, den noch niemand braucht. Minute 10: Designzahl, nicht gemessen.
  if (plan.schild && frei(plan.schild) && wirtschaftSteht && minute >= 10) {
    const sg = BUILDINGS[plan.schild];
    if (zahl(plan.schild) < 1 && fron >= sg.cost.fron && bilanz >= (sg.gegenwartIn || 0)) {
      const platz = daheimFrei(world, kunde, haupt, plan.schild, 500, front + 330);
      if (platz && bau(plan.schild, ...platz)) return;
    }
  }

  // Kann der Bau bezahlt werden? Wie fron >= cost.fron, aber auch das Goetterblut der teuren Bauten.
  const bezahlbar = (t) => fron >= BUILDINGS[t].cost.fron && p.goetterblut >= (BUILDINGS[t].cost.goetterblut || 0) && bilanz >= (BUILDINGS[t].gegenwartIn || 0);

  // 3h. Fernschlag (hat das Volk einen): einer beim Hauptgebaeude, wenn die
  //     Wirtschaft steht und ab Minute 20 -- er kostet Goetterblut und lohnt erst,
  //     wenn es etwas Grosses zu treffen gibt. Minute 20: Designzahl, nicht gemessen.
  if (plan.schlag && frei(plan.schlag) && wirtschaftSteht && minute >= 20 && zahl(plan.schlag) < 1 && bezahlbar(plan.schlag)) {
    const platz = daheimFrei(world, kunde, haupt, plan.schlag, 1100, front + 240);
    if (platz && bau(plan.schlag, ...platz)) return;
  }

  // 3i. Abwehr (hat das Volk eine): eine beim Hauptgebaeude, sobald die Kunde ein
  //     gegnerisches Schlag-Gebaeude kennt -- vorher faengt sie nichts ab.
  if (plan.abwehr && frei(plan.abwehr) && zahl(plan.abwehr) < 1 && bezahlbar(plan.abwehr) && kunde.gebaeude.some((b) => BUILDINGS[b.type].schlag)) {
    const platz = daheimFrei(world, kunde, haupt, plan.abwehr, 500, front + 90);
    if (platz && bau(plan.abwehr, ...platz)) return;
  }

  // 3j. Werkstatt (hat das Volk eine): eine ab Minute 18, wenn die Wirtschaft steht
  //     und Goetterblut fliesst (ein fertiger Schacht) -- Prototypen kosten Blut.
  //     Minute 18: Designzahl, nicht gemessen.
  if (plan.werkstatt && frei(plan.werkstatt) && wirtschaftSteht && minute >= 18 && zahl(plan.werkstatt) < 1 && bezahlbar(plan.werkstatt)) {
    if (bauten.some((b) => b.done && b.type === plan.blut)) {
      const platz = daheimFrei(world, kunde, haupt, plan.werkstatt, 1000, front + 300);
      if (platz && bau(plan.werkstatt, ...platz)) return;
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
        const platz = nahePlatz(world, kunde, vene, haupt, Math.min(start >> 1, 600), BUILDINGS[plan.anker].radius, plan.anker);
        if (platz && bau(plan.anker, platz.x, platz.y)) return;
      }
    } else {
      const reg = world.regions[posten.region];
      const quelleDa = bauten.some(
        (b) => BUILDINGS[b.type].gegenwartOut && dist2(b.x, b.y, posten.x, posten.y) <= start * start
      );
      if (posten.done && (!reg || reg.supply === 0) && !quelleDa && fron >= kosten(plan.kraft)) {
        const platz = nahePlatz(world, kunde, posten, haupt, 350, BUILDINGS[plan.kraft].radius, plan.kraft, 90);
        if (platz && bau(plan.kraft, platz.x, platz.y)) return;
      }
    }
  } else if (vene && !veneBereit && !ankerImBau && fron >= kosten(plan.anker) + 100) {
    // Lohnt der Vorstoss? Nur wenn zwei neue Anker die Luecke schliessen.
    // Sonst warten: wachsende Kreise oder Anker am Rand bringen die Ader naeher.
    // Dieselbe Regel fuer alle -- der Startradius der Fraktion entscheidet.
    const platz = vorstoss(world, kunde, haupt, vene, plan.anker);
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
    const platz = randplatz(world, ai, kunde, haupt, front, bauten, plan.anker);
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
      const frei = !blockiert(world, kunde, x, y, BUILDINGS[plan.anker].radius);
      if (frei && (!BUILDINGS[plan.anker].needsGrowth || !isCleared(world, x, y)) && bau(plan.anker, x, y)) return;
    }
  }

  // 6. Produktion. Erst genug Arbeiter, dann Kaempfer in fester Mischung;
  //    schwer nur mit Goetterblut. Solange die Wirtschaft unvollstaendig ist,
  //    wird fuer den naechsten Bau gespart.
  // Ist das Heer kleiner als eine Welle, wird nicht gespart: ohne Truppen ist
  // jede Wirtschaft nur Beute (und der Kommandant schutzlos).
  const wellenWert = ((ai.stil.welle * ai.stufe.welle) / 1000) | 0;
  const heerSchwach = minute >= 5 && wert(kaempfer) < wellenWert;
  // Fehlt Gegenwart fuer den naechsten Bau, wird zuerst fuer die Quelle gespart.
  const sparen = heerSchwach
    ? 0
    : naechster && bilanz < bedarf
      ? kosten(plan.kraft)
      : naechster
        ? kosten(naechster)
        : vene
          ? kosten(plan.anker) + 100
          : 0;
  // Was die eigenen Plaene beim Baubeginn kosten, bleibt liegen.
  // ... und was ein eben befohlener Fernschlag kostet.
  let rest = fron - plaene.reduce((s, q) => s + kosten(q.type), 0) - schlagFron;
  let blutRest = p.goetterblut - schlagBlut;
  const blutSchwer = UNITS[plan.schwer].cost.goetterblut || 0;
  const tiefe = fron > 900 ? 3 : fron > 400 ? 2 : 1;
  // Raben: einer ab Minute 2, ein zweiter ab Minute 10 -- billig, und wer
  // faellt, wird ersetzt.
  if (plan.rabe && haupt.done && BUILDINGS[haupt.type].buildList?.includes(plan.rabe)) {
    // Faellt einer, kommt der naechste erst nach 90 s -- sonst fliegt die KI
    // Rabe um Rabe in dieselben Schuetzen.
    if (raben.length < ai.rabenVorher) ai.rabeAb = world.tick + 900;
    ai.rabenVorher = raben.length;
    const rabenZiel = world.tick < ai.rabeAb ? 0 : minute >= 10 ? 2 : minute >= 2 ? 1 : 0;
    let bestellt = raben.length;
    for (const b of gebaeude) bestellt += b.queue ? b.queue.filter((u) => u === plan.rabe).length : 0;
    const k = UNITS[plan.rabe].cost.fron;
    if (bestellt < rabenZiel && rest >= k && haupt.queue.length < tiefe) {
      rest -= k;
      issue(world, { type: 'produce', player: ai.player, id: haupt.id, unit: plan.rabe });
    }
  }
  // Arbeiter nach Baukraft: Bauern bauen schwaecher als Dryaden, also mehr davon.
  const zielKraft = (((1600 + (minute >= 6 ? 1200 : 0) + (minute >= 12 ? 1200 : 0)) * ai.stufe.arbeiter) / 1000) | 0;
  const arbeiterZiel = Math.ceil(zielKraft / UNITS[plan.bauer].build.power);
  let arbeiterBestellt = arbeiter.length;
  for (const b of bauten) arbeiterBestellt += b.queue ? b.queue.filter((u) => u === plan.bauer).length : 0;
  // Wert der Flieger (stehende und bestellte) und des Bodenheeres, fuer die Luftfabrik
  let fliegerWert = wert(kaempfer.filter((u) => kampfFlieger(u.type)));
  for (const b of bauten) for (const q of b.queue || []) if (kampfFlieger(q)) fliegerWert += UNITS[q].cost.fron;
  const bodenWert = wert(kaempfer) - wert(kaempfer.filter((u) => kampfFlieger(u.type)));
  for (const f of bauten) {
    if (!f.done || !BUILDINGS[f.type].buildList || f.queue.length >= tiefe) continue;
    const liste = BUILDINGS[f.type].buildList;
    let unit = null;
    if (plan.werkstatt && f.type === plan.werkstatt) {
      // Prototyp: sobald moeglich, aber nie mehr, als das Volk haben darf
      // (hoechstens; ohne Angabe einer). Er kostet Goetterblut und wird nicht
      // gegen das Sparen fuer den naechsten Bau aufgerechnet -- er ist selten.
      const pt = plan.prototyp;
      if (pt && liste.includes(pt) && frei(pt) && anzahlVon(world, ai.player, pt) < (UNITS[pt].hoechstens || 1) && blutRest >= (UNITS[pt].cost.goetterblut || 0)) {
        unit = pt;
      }
    } else if (plan.luftfabrik && f.type === plan.luftfabrik) {
      // Flieger: Bomber gegen alles am Boden; Luftjaeger erst, wenn der Gegner
      // bewaffnete Flieger hat, dann im Wechsel mit den Bombern. Der Flieger-
      // Anteil bleibt unter dem Wert des Bodenheeres (plus ein Grundstock),
      // damit die Luftfabrik die Bodenfabriken nicht ausblutet.
      const moeglich = (rolle) => (plan[rolle] && liste.includes(plan[rolle]) && frei(plan[rolle]) ? plan[rolle] : null);
      const bomber = moeglich('bomber');
      const jaeger = feindFlieger ? moeglich('luftjaeger') : null;
      const anzahl = (t) => einheiten.filter((u) => u.type === t).length + bauten.reduce((s, b) => s + (b.queue ? b.queue.filter((q) => q === t).length : 0), 0);
      if (fliegerWert <= bodenWert + 300) {
        unit = jaeger && (!bomber || anzahl(jaeger) <= anzahl(bomber)) ? jaeger : bomber;
        if (unit) fliegerWert += UNITS[unit].cost.fron;
      }
    } else if (arbeiterBestellt < arbeiterZiel && liste.includes(plan.bauer)) {
      unit = plan.bauer;
      arbeiterBestellt++;
    } else {
      // Schwer, sobald Goetterblut reicht -- reichlich Blut heisst nur noch schwer.
      // Sonst die naechste Rolle der Mischung, die diese Fabrik bauen kann.
      // Belagerung, solange der Gegner Tuerme hat: je Turm eine, hoechstens drei.
      const feindTuerme = kunde.gebaeude.filter((o) => bodenTurm(o.type)).length;
      const belagerer = einheiten.filter((u) => u.type === plan.belagerung).length;
      if (feindTuerme && belagerer < Math.min(3, feindTuerme) && frei(plan.belagerung) && liste.includes(plan.belagerung)) {
        unit = plan.belagerung;
      }
      const schwerMoeglich = blutRest >= blutSchwer && frei(plan.schwer);
      const reichlich = schwerMoeglich && blutSchwer > 0 && blutRest >= 3 * blutSchwer;
      if (!unit && reichlich && liste.includes(plan.schwer)) unit = plan.schwer;
      for (let k = 0; !unit && k < MISCHUNG.length; k++) {
        const rolle = MISCHUNG[(ai.zug + k) % MISCHUNG.length];
        if (rolle === 'schwer' && !schwerMoeglich) continue;
        if (liste.includes(plan[rolle]) && frei(plan[rolle])) {
          unit = plan[rolle];
          ai.zug += k + 1;
        }
      }
    }
    if (!unit || rest - UNITS[unit].cost.fron < (unit === plan.prototyp ? 0 : sparen)) continue;
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
    (kdt.hp * 2 < kdt.maxHp || (feindeBei(kunde, kdt, 1200) >= 2 && !inDomain(world, ai.player, kdt.x, kdt.y)));

  // 6a. Faehigkeiten des Kommandanten, sobald bereit: Rufe (Zorn, Wehr,
  //     Tempo), wenn genug eigene Kaempfer bei ihm stehen und Feinde nahe
  //     sind; Heilung, wenn viele Verletzte bei ihm sind; das Rudel, wenn
  //     Feinde nahe sind; ein Griff auf den dichtesten Haufen Feinde.
  for (const id of kdt && ai.stufe.faehigkeiten ? faehigkeitenVon(world, ai.player) : []) {
    if (faehigkeitWarten(world, ai.player, id)) continue;
    const f = FAEHIGKEITEN[id];
    const wirken = (x, y) => issue(world, { type: 'faehigkeit', player: ai.player, faehigkeit: id, x, y });
    const nah = (u, r) => dist2(u.x, u.y, kdt.x, kdt.y) <= r * r;
    if (f.art === 'griff') {
      let best = null;
      let bestN = 3;
      for (const o of kunde.einheiten) {
        if (!nah(o, f.reichweite)) continue;
        const n = feindeBei(kunde, o, f.radius);
        if (n > bestN) {
          bestN = n;
          best = o;
        }
      }
      if (best) wirken(best.x, best.y);
    } else if (f.art === 'heilung') {
      if (einheiten.filter((u) => nah(u, f.radius) && u.hp * 10 < u.maxHp * 7).length >= 4) wirken(kdt.x, kdt.y);
    } else if (f.art === 'rufen') {
      if (feindeBei(kunde, kdt, 1200) >= 3) wirken(kdt.x, kdt.y);
    } else if (kaempfer.filter((u) => nah(u, f.radius)).length >= 5 && feindeBei(kunde, kdt, f.radius) >= 3) {
      wirken(kdt.x, kdt.y);
    }
  }

  // 7. Verteidigung: Feinde nahe eigener Gebaeude ziehen alle Truppen an,
  //    die nicht gerade mit einer Welle unterwegs sind. Der Kommandant
  //    kaempft nur auf eigenem Boden mit.
  // Verteidigt wird, was steht -- ein Plan ist noch nichts.
  const bedrohung = naechsterEindringling(world, kunde, gebaeude, (o) => !kampfFlieger(o.type) || kaempfer.some((u) => erreicht(u, o)));
  if (bedrohung) {
    const imHinterland = (pt) => dist2(pt.x, pt.y, haupt.x, haupt.y) <= HINTEN * HINTEN;
    const kdtHilft =
      kdt &&
      !rueckzug &&
      inDomain(world, ai.player, bedrohung.x, bedrohung.y) &&
      (ai.stil.kdtVorn || imHinterland(bedrohung));
    // Nur wer die Bedrohung trifft, geht hin. Ausnahme wie bisher: ein
    // Spaeher ohne Waffe zieht alle an (Altverhalten der Referenzpartien).
    const spaeher = UNITS[bedrohung.type].fliegt && !UNITS[bedrohung.type].weapon;
    const ids = kaempfer
      .concat(kdtHilft ? [kdt] : [])
      .filter((u) => !ai.unterwegs.includes(u.id) && (spaeher || erreicht(u, bedrohung)))
      .map((u) => u.id);
    if (ids.length) issue(world, { type: 'attack', player: ai.player, ids, x: bedrohung.x, y: bedrohung.y });
  }

  // 8. Angriff in wachsenden Wellen. Erstes Ziel ist ein gegnerischer
  //    Foerderbau fuer Goetterblut -- die Mitte entscheidet --, sonst das
  //    Hauptgebaeude. Faellt das Ziel, zieht die Welle zum naechsten weiter.
  ai.unterwegs = ai.unterwegs.filter((id) => einheiten.some((u) => u.id === id));
  // Leibwache: Wer seinen Kommandanten verliert, verliert die Partie. Die ihm
  // naechsten Einheiten bleiben bei ihm, nur der Rest geht mit Wellen.
  const daheimAlle = kaempfer.filter((u) => !ai.unterwegs.includes(u.id) && trifftBoden(u));
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
  const angriff = angriffsziel(kunde, haupt, ziel.player) || vermuteteFoerderung(world, kunde, haupt, ziel, haupt) || ziel;
  const welleAuf = (z) => {
    ai.welleZiel = z.id;
    ai.welleX = z.x;
    ai.welleY = z.y;
    ai.welleAufHaupt = !!(z.vermutet || BUILDINGS[z.type].vital);
  };
  // Faellt das Ziel einer laufenden Welle -- man sieht seinen Platz leer --,
  // zieht sie zum Foerderbau, der ihr selbst am naechsten ist, nicht quer
  // ueber die Karte zu dem, der dem eigenen Hauptgebaeude am naechsten waere.
  // Geht sie aufs Hauptgebaeude, weil sie nichts Besseres kannte, und sieht
  // unterwegs einen Foerderbau, nimmt sie den.
  if (ai.unterwegs.length) {
    const welle = einheiten.filter((u) => ai.unterwegs.includes(u.id));
    const mitte = {
      x: (welle.reduce((s, u) => s + u.x, 0) / welle.length) | 0,
      y: (welle.reduce((s, u) => s + u.y, 0) / welle.length) | 0,
    };
    const bekannt = kunde.gebaeude.some((b) => b.id === ai.welleZiel);
    const besser = angriffsziel(kunde, mitte, ziel.player) || vermuteteFoerderung(world, kunde, mitte, ziel, haupt);
    if (!bekannt || (ai.welleAufHaupt && besser)) {
      const weiter = besser || ziel;
      if (weiter.id !== ai.welleZiel || weiter.x !== ai.welleX || weiter.y !== ai.welleY) {
        welleAuf(weiter);
        issue(world, { type: 'attack', player: ai.player, ids: ai.unterwegs.slice(), x: weiter.x, y: weiter.y });
      }
    }
  }
  // Nur angreifen, wenn die Welle das gegnerische Heer daheim samt dessen
  // Heimvorteil uebertrifft -- sonst zerschellt sie an der Verteidigung.
  // Ausser das Heer ist satt: Der Unterhalt frisst die Foerderung fast ganz,
  // es waechst nicht mehr. Dann bringt Warten nichts, und es geht los.
  const gegnerDaheim = heimHeer(kunde, haupt, ziel);
  const satt = minute >= 8 && unterhaltProMin(world, ai.player) * 1000 >= foerderungProMin(world, ai.player) * ai.stufe.satt;
  const genug = satt
    ? wellenWert
    : Math.max(wellenWert, ((gegnerDaheim * 12) / 10) | 0);
  if (!bedrohung && wert(daheimStehend) >= genug && angriff) {
    ai.welle++;
    welleAuf(angriff);
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
function randplatz(world, ai, kunde, haupt, front, bauten, typ) {
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
      if (blockiert(world, kunde, x, y, def.radius)) continue;
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
function vorstoss(world, kunde, haupt, ziel, typ) {
  const def = BUILDINGS[typ];
  const dx = haupt.x - ziel.x;
  const dy = haupt.y - ziel.y;
  const d = isqrt(dx * dx + dy * dy);
  if (d === 0) return null;
  for (let s = 0; s <= d; s += 300) {
    for (const quer of [0, 300, -300, 600, -600]) {
      const x = grenze(ziel.x + (((dx * s - dy * quer) / d) | 0));
      const y = grenze(ziel.y + (((dy * s + dx * quer) / d) | 0));
      if (!inDomain(world, kunde.player, x, y)) continue;
      if (def.needsGrowth && isCleared(world, x, y)) continue;
      if (blockiert(world, kunde, x, y, def.radius)) continue;
      return { x, y };
    }
  }
  return null;
}

/**
 * Freier Bauplatz im Abstand abstand von um, zuerst Richtung Heimat, dann
 * seitlich gedreht. Ohne Ader-Pflicht; Hain nicht auf gerodetem Boden.
 */
function nahePlatz(world, kunde, um, haupt, abstand, radius, typ, drehung = 0) {
  const basis = winkel(um, haupt);
  for (const g of [0, 40, -40, 80, -80, 120, -120, 180]) {
    const grad = basis + drehung + g;
    const x = grenze(um.x + (((abstand * cosDeg(grad)) / 1000) | 0));
    const y = grenze(um.y + (((abstand * sinDeg(grad)) / 1000) | 0));
    if (BUILDINGS[typ].needsGrowth && isCleared(world, x, y)) continue;
    if (blockiert(world, kunde, x, y, radius)) continue;
    // Nicht auf eine Ader bauen, die noch gebraucht wird.
    if (world.deposits.some((d) => dist2(d.x, d.y, x, y) < (radius + 120) * (radius + 120))) continue;
    return { x, y };
  }
  return null;
}

/**
 * Steht hier schon ein Gebaeude, Fels oder See im Weg? Dieselbe Regel wie
 * tryPlace(), aber nur mit dem, was die KI weiss: eigene Gebaeude und Plaene,
 * gesehene gegnerische Gebaeude.
 */
function blockiert(world, kunde, x, y, radius) {
  if (aufHindernis(world, x, y, radius)) return true;
  for (const e of world.entities.concat(world.plaene)) {
    if (e.dead || e.player !== kunde.player || (e.kind !== 'building' && e.kind !== 'plan')) continue;
    const min = radius + BUILDINGS[e.type].radius + 20;
    if (dist2(x, y, e.x, e.y) < min * min) return true;
  }
  return bekanntBei(kunde, x, y, radius + 20);
}

// So viel Heereswert zaehlt ein versorgter feindlicher Turm: er haelt allein
// eine fruehe Welle von rund 600 Fron auf (Messung in docs/scope.md).
const TURM_WERT = 600;

/**
 * Geschaetzter Wert des gegnerischen Heers daheim, aus dem, was die KI
 * gesehen hat: gesehene Tuerme, und Kaempfer, die zuletzt naeher an seinem
 * Hauptgebaeude standen als am eigenen -- gewichtet mit gesehenen Schreinen
 * dort (Zorn und Wehr, der staerkste je Art). Arbeiter zaehlen nicht.
 */
function heimHeer(kunde, haupt, gegner) {
  let summe = 0;
  // Mit mehreren Gegnern zaehlt nur, was dem gewaehlten gehoert (gegner.player)
  const seiner = (o) => gegner.player === undefined || o.player === gegner.player;
  for (const b of kunde.gebaeude) if (b.done && b.powered && bodenTurm(b.type) && seiner(b)) summe += TURM_WERT;
  for (const o of kunde.gesehen) {
    const d = UNITS[o.type];
    if (!seiner(o) || d.worker || !d.weapon || dist2(o.x, o.y, gegner.x, gegner.y) >= dist2(o.x, o.y, haupt.x, haupt.y)) continue;
    let zorn = 0;
    let wehr = 0;
    for (const s of kunde.gebaeude) {
      const buff = BUILDINGS[s.type].buff;
      if (!buff || !s.done || dist2(o.x, o.y, s.x, s.y) > buff.radius * buff.radius) continue;
      zorn = Math.max(zorn, buff.zorn || 0);
      wehr = Math.max(wehr, buff.wehr || 0);
    }
    const kosten = d.commander ? 600 : d.cost.fron;
    summe += ((((kosten * (1000 + zorn)) / 1000) * 1000) / (1000 - wehr)) | 0;
  }
  return summe;
}

// Fernschlag der KI (Designzahlen, nicht gemessen): so viel zaehlt ein getroffenes
// Hauptgebaeude zusaetzlich zu seinen Kosten, und so viel Gebaeudewert (Fron) muss
// ein Schlag mindestens treffen, sonst bleibt er geladen.
const SCHLAG_HAUPT = 1000;
const SCHLAG_MINDEST = 300;

/**
 * Ziel fuer einen Fernschlag aus dem, was die Kunde kennt: die Mitte des
 * gegnerischen Gebaeudes, in dessen Schlagkreis der meiste Wert steht (Kosten
 * in Fron, das Hauptgebaeude mit Zuschlag) -- das Hauptgebaeude oder die
 * dichteste Gruppe. Nicht gewaehlt wird, was ausser Reichweite liegt, was
 * eigene Truppen oder Bauten im Kreis haette, und was eine bekannte fertige
 * gegnerische Abwehr deckt: sie finge den Schlag ab (ob sie gerade geladen ist,
 * weiss die KI nicht). Ist das Hauptgebaeude noch ungesehen, gilt der Ort, wo
 * der Gegner beginnt. Gleichwertige Ziele entscheidet die Reihenfolge der Kunde.
 */
function schlagZiel(kunde, von, s, eigene, gegnerHaupt) {
  const abwehr = kunde.gebaeude.filter((b) => b.done && BUILDINGS[b.type].abwehr);
  const kandidaten = gegnerHaupt.vermutet ? kunde.gebaeude.concat([gegnerHaupt]) : kunde.gebaeude;
  let best = null;
  let bestWert = SCHLAG_MINDEST - 1;
  for (const c of kandidaten) {
    if (dist2(von.x, von.y, c.x, c.y) > s.reichweite * s.reichweite) continue;
    if (eigene.some((o) => dist2(o.x, o.y, c.x, c.y) <= s.radius * s.radius)) continue;
    if (abwehr.some((a) => dist2(a.x, a.y, c.x, c.y) <= BUILDINGS[a.type].abwehr.radius ** 2)) continue;
    let wert = c.vermutet ? SCHLAG_HAUPT : 0;
    for (const b of kunde.gebaeude) {
      if (dist2(b.x, b.y, c.x, c.y) > s.radius * s.radius) continue;
      wert += BUILDINGS[b.type].cost.fron + (BUILDINGS[b.type].vital ? SCHLAG_HAUPT : 0);
    }
    if (wert > bestWert) {
      bestWert = wert;
      best = c;
    }
  }
  return best;
}

/** Gesehene feindliche Kaempfer im Umkreis r um einen Punkt. */
function feindeBei(kunde, pt, r) {
  let n = 0;
  for (const o of kunde.einheiten) {
    if (!UNITS[o.type].weapon) continue;
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

/**
 * Wohin ein Rabe fliegt: zur Ader auf der gegnerischen Seite, die die KI am
 * laengsten nicht gesehen hat (nie gesehen zuerst), bei Gleichstand zur
 * naechsten; keine, die schon ein anderer Rabe anfliegt. Sonst zum
 * gegnerischen Hauptgebaeude.
 */
function spaehziel(world, kunde, rabe, haupt, gegner, vergeben) {
  let best = null;
  let bestT = Infinity;
  let bestD = Infinity;
  let bestSeite = Infinity;
  const mx = (MAP >> 1) - rabe.x;
  const my = (MAP >> 1) - rabe.y;
  for (let i = 0; i < world.deposits.length; i++) {
    const d = world.deposits[i];
    if (dist2(d.x, d.y, gegner.x, gegner.y) >= dist2(d.x, d.y, haupt.x, haupt.y)) continue;
    if (vergeben.includes(d.x * MAP + d.y)) continue;
    if (unterTurm(kunde, d.x, d.y, 300)) continue; // ein Turm holt ihn herunter
    const t = kunde.adern[i] ?? -1;
    if (t >= 0 && kunde.tick - t < 600) continue; // gerade erst gesehen
    const dd = dist2(d.x, d.y, rabe.x, rabe.y);
    const seite = mx * (d.y - rabe.y) - my * (d.x - rabe.x);
    if (t < bestT || (t === bestT && (dd < bestD || (dd === bestD && seite < bestSeite)))) {
      bestT = t;
      bestD = dd;
      bestSeite = seite;
      best = d;
    }
  }
  return best ? { x: best.x, y: best.y } : { x: gegner.x, y: gegner.y };
}

/**
 * Platz fuer einen Spaehposten: vom vordersten eigenen Anker aus Richtung
 * Gegner, gut innerhalb der Domaene, frei und nicht auf einer Ader.
 */
function postenPlatz(world, kunde, haupt, richtung, gebaeude, typ) {
  const vorn = vordersterAnker(world, gebaeude, richtung) || haupt;
  const dx = richtung.x - vorn.x;
  const dy = richtung.y - vorn.y;
  const d = isqrt(dx * dx + dy * dy);
  if (d === 0) return null;
  const r = BUILDINGS[typ].radius;
  for (const s of [1600, 1200, 2000, 800]) {
    for (const quer of [0, 400, -400]) {
      const x = grenze(vorn.x + (((dx * s - dy * quer) / d) | 0));
      const y = grenze(vorn.y + (((dy * s + dx * quer) / d) | 0));
      if (blockiert(world, kunde, x, y, r)) continue;
      if (world.deposits.some((q) => dist2(q.x, q.y, x, y) < (r + 120) * (r + 120))) continue;
      return { x, y };
    }
  }
  return null;
}

/** Liegt der Punkt (mit Abstand rand) in Reichweite eines bekannten gegnerischen Turms? */
function unterTurm(kunde, x, y, rand) {
  return kunde.gebaeude.some((t) => {
    const w = BUILDINGS[t.type].weapon;
    if (!bodenTurm(t.type)) return false;
    const r = w.range + BUILDINGS[t.type].radius + rand;
    return dist2(x, y, t.x, t.y) <= r * r;
  });
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
 * Gesehene feindliche Einheit, die einem eigenen Gebaeude am naechsten
 * gekommen ist -- oder die irgendwo in der eigenen Domaene steht. Eine grosse
 * Domaene ist damit auch ein grosses Gebiet, das verteidigt wird. Nur, was
 * die eigenen Kaempfer ueberhaupt treffen koennen (abwehrbar) -- einem Flieger,
 * den kein eigener Kaempfer erreicht, laeuft niemand hinterher.
 */
function naechsterEindringling(world, kunde, bauten, abwehrbar) {
  const nah = 3000 * 3000;
  let best = null;
  let bestD = nah;
  let drin = null;
  for (const o of kunde.einheiten) {
    if (!abwehrbar(o)) continue;
    if (!drin && inDomain(world, kunde.player, o.x, o.y)) drin = o;
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

/**
 * Wer keinen gegnerischen Foerderbau kennt, sucht ihn dort, wo er stehen
 * muss: an den Adern auf der gegnerischen Seite (naeher an dessen
 * Hauptgebaeude als am eigenen), die man seit drei Minuten nicht gesehen hat --
 * die naechste vom Punkt von aus. Sonst null.
 */
function vermuteteFoerderung(world, kunde, von, gegner, haupt) {
  let best = null;
  let bestD = Infinity;
  let bestSeite = Infinity;
  // Gleich weite Adern entscheidet die Seite, wie in freieAder() -- punktsymmetrisch.
  const mx = (MAP >> 1) - von.x;
  const my = (MAP >> 1) - von.y;
  for (let i = 0; i < world.deposits.length; i++) {
    const d = world.deposits[i];
    if (dist2(d.x, d.y, gegner.x, gegner.y) >= dist2(d.x, d.y, haupt.x, haupt.y)) continue;
    const zuletzt = kunde.adern[i] ?? -1;
    if (zuletzt >= 0 && kunde.tick - zuletzt < 1800) continue;
    const dd = dist2(d.x, d.y, von.x, von.y);
    const seite = mx * (d.y - von.y) - my * (d.x - von.x);
    if (dd < bestD || (dd === bestD && seite < bestSeite)) {
      bestD = dd;
      bestSeite = seite;
      best = { id: 0, x: d.x, y: d.y, vermutet: true, ader: true };
    }
  }
  return best;
}

/**
 * Ziel einer Welle: ein gesehener gegnerischer Foerderbau, moeglichst einer,
 * den kein gesehener Turm deckt -- Wirtschaft treffen statt an Mauern
 * zerschellen --, dann Goetterblut vor Fron, dann der naechste vom Punkt von aus.
 */
function angriffsziel(kunde, von, spieler = -1) {
  let best = null;
  let bestRang = Infinity;
  let bestD = Infinity;
  for (const e of kunde.gebaeude) {
    const d = BUILDINGS[e.type];
    if (!d.fronOut && !d.blutOut) continue;
    // Mit mehreren Gegnern nur Bauten des gewaehlten (spieler); deckt ein Turm nur der Besitzer des Ziels
    if (spieler >= 0 && e.player !== spieler) continue;
    const gedeckt = kunde.gebaeude.some(
      (t) => t.done && t.player === e.player && bodenTurm(t.type) && dist2(t.x, t.y, e.x, e.y) <= (BUILDINGS[t.type].weapon.range + 400) ** 2
    );
    const rang = (gedeckt ? 2 : 0) + (d.blutOut ? 0 : 1);
    const dd = dist2(e.x, e.y, von.x, von.y);
    if (rang < bestRang || (rang === bestRang && dd < bestD)) {
      bestRang = rang;
      bestD = dd;
      best = e;
    }
  }
  return best;
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
export function freieAder(world, von, kind, plaene, kunde) {
  let best = null;
  let bestD = Infinity;
  let bestSeite = Infinity;
  const mx = (MAP >> 1) - von.x;
  const my = (MAP >> 1) - von.y;
  for (const d of world.deposits) {
    if (d.kind !== kind) continue;
    // Besetzt ist, was man weiss: ein eigener Bau darauf oder ein gesehener
    // gegnerischer. Einen ungesehenen findet erst der Erbauer vor Ort.
    if (d.takenBy !== 0 && (kunde.gebaeude.some((b) => b.id === d.takenBy) || world.entities.some((e) => e.id === d.takenBy && e.player === kunde.player))) continue;
    // Eine Ader mit eigenem Plan ist schon vergeben -- sonst setzt die KI den
    // Plan jeden Zug neu, die Simulation lehnt ab, und es bleibt beim Sparen.
    if (plaene.some((q) => dist2(q.x, q.y, d.x, d.y) < 100 * 100)) continue;
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
function daheimFrei(world, kunde, haupt, typ, radius, grad) {
  const r = BUILDINGS[typ].radius;
  for (let k = 0; k < 15; k++) {
    const [x, y] = daheim(world, haupt, radius + ((k / 3) | 0) * 250, grad + [0, 35, -35][k % 3]);
    if (blockiert(world, kunde, x, y, r)) continue;
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
