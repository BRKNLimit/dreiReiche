// Wiederholungen und Spielverlauf -- fuer beide Oberflaechen.
//
// Die Simulation ist deterministisch, und die KI auch: Wer Startwerte (Seed,
// Voelker, Karte, KI-Stil und -Stufe) und die Befehle des Spielers mit ihrem
// Tick kennt, kann die ganze Partie nachspielen. Mehr steht in einer
// Wiederholung nicht. Sie passt nur zum selben Stand der Simulation -- den
// haelt SPIEL_STAND fest (Pruefsumme der Sim-Dateien, von tools/bundle.mjs).

import { foerderungProMin } from './sim/sim.js';
import { UNITS, FACTIONS, KARTEN } from './sim/defs.js';

export const STAND = typeof SPIEL_STAND !== 'undefined' ? SPIEL_STAND : 'dev';
const FORMAT = 'drei-reiche-wiederholung';

/** Eine neue Aufnahme; start: { seed, factions, karte, stil, stufe, zuschauen } */
export function neueAufnahme(start) {
  return { format: FORMAT, stand: STAND, ...start, befehle: [], ende: 0, sieger: -1 };
}

/**
 * Vor den KI-Zuegen eines Ticks: die Befehle des Spielers festhalten, die
 * seit dem letzten Tick eingegangen sind (die der KI kommen erst danach dazu).
 */
export function aufnehmen(a, world) {
  for (const c of world.pending) a.befehle.push([world.tick, JSON.parse(JSON.stringify(c))]);
}

/** Beim Abspielen: die aufgenommenen Befehle dieses Ticks einreihen. Liefert den neuen Zeiger. */
export function abspielen(a, world, zeiger) {
  world.pending.length = 0; // Eingaben waehrend der Wiederholung zaehlen nicht
  while (zeiger < a.befehle.length && a.befehle[zeiger][0] <= world.tick) {
    world.pending.push(JSON.parse(JSON.stringify(a.befehle[zeiger][1])));
    zeiger++;
  }
  return zeiger;
}

export function aufnahmeAbschliessen(a, world) {
  a.ende = world.tick;
  a.sieger = world.winner;
}

/** Als Datei herunterladen. */
export function aufnahmeSpeichern(a) {
  if (typeof Blob === 'undefined' || typeof URL === 'undefined') return;
  const blob = new Blob([JSON.stringify(a)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const min = Math.round(a.ende / 600);
  link.download = `drei-reiche-${a.factions.join('-gegen-')}-${KARTEN[a.karte]?.name || a.karte}-${min}min.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Text einer Datei pruefen; liefert { a } oder { fehler }, bei anderem Stand mit Warnung. */
export function aufnahmeLesen(text) {
  let a;
  try {
    a = JSON.parse(text);
  } catch {
    return { fehler: 'Keine Wiederholung (kein JSON).' };
  }
  if (!a || a.format !== FORMAT || !Array.isArray(a.befehle) || !Array.isArray(a.factions)) {
    return { fehler: 'Keine Wiederholung der drei Reiche.' };
  }
  const warnung =
    a.stand !== STAND ? 'Aufgenommen mit einem anderen Stand des Spiels — die Partie kann anders verlaufen.' : '';
  return { a, warnung };
}

// ------------------------------------------------------------ Verlauf fuer den Siegbildschirm

export function neuerVerlauf() {
  return { minuten: [], verluste: [0, 0], getoetet: [0, 0], gebaeudeVerloren: [0, 0], ausgebildet: [0, 0] };
}

/** Nach jedem Tick: Verluste zaehlen, einmal je Minute Heer, Foerderung und Gebaeude festhalten. */
export function verlaufFortschreiben(v, world) {
  for (const ev of world.events) {
    if (ev.t === 'died') {
      if (ev.kind === 'unit') {
        v.verluste[ev.player]++;
        v.getoetet[1 - ev.player]++;
      } else v.gebaeudeVerloren[ev.player]++;
    } else if (ev.t === 'spawned') {
      const u = world.entities.find((e) => e.id === ev.id);
      if (u && !UNITS[u.type].commander) v.ausgebildet[u.player]++;
    }
  }
  if (world.tick % 600 === 0 || world.over) {
    v.minuten.push(
      [0, 1].map((p) => {
        let heer = 0;
        let gebaeude = 0;
        for (const e of world.entities) {
          if (e.dead || e.player !== p) continue;
          if (e.kind === 'building') gebaeude++;
          else if (UNITS[e.type].weapon && !UNITS[e.type].worker && !UNITS[e.type].commander) heer += UNITS[e.type].cost.fron;
        }
        return { heer, foerderung: foerderungProMin(world, p), gebaeude };
      })
    );
  }
}

/** Kleines Liniendiagramm beider Seiten als SVG. */
function diagramm(titel, reihe0, reihe1, farbe0, farbe1) {
  const B = 260;
  const H = 90;
  const n = Math.max(reihe0.length, 2);
  const max = Math.max(1, ...reihe0, ...reihe1);
  const pfad = (r) =>
    r.map((w, i) => `${i ? 'L' : 'M'}${((i / (n - 1)) * B).toFixed(1)},${(H - (w / max) * (H - 6) - 3).toFixed(1)}`).join(' ');
  return `<div class="diagramm"><b>${titel}</b>
    <svg viewBox="0 0 ${B} ${H}" preserveAspectRatio="none">
      <path d="${pfad(reihe0)}" fill="none" stroke="${farbe0}" stroke-width="2"/>
      <path d="${pfad(reihe1)}" fill="none" stroke="${farbe1}" stroke-width="2"/>
    </svg><span>höchstens ${Math.round(max)}</span></div>`;
}

/**
 * Siegbildschirm: Ergebnis, Zahlen beider Seiten, Verlauf von Heer,
 * Foerderung und Gebaeuden. Knoepfe: endeSpeichern, endeNochmal, endeKarte.
 */
export function siegHtml(world, v, ich, mitAufnahme, wiederholung) {
  const f = world.players.map((p) => FACTIONS[p.faction]);
  const min = (world.tick / 600).toFixed(1).replace('.', ',');
  const titel = wiederholung ? `Wiederholung: ${f[world.winner]?.name || '—'} gewinnt` : world.winner === ich ? 'Sieg' : 'Niederlage';
  const zeile = (name, a, b) => `<tr><td>${name}</td><td>${a}</td><td>${b}</td></tr>`;
  const reihe = (k, p) => v.minuten.map((m) => m[p][k]);
  return `<h1>${titel}</h1>
    <p>nach ${min} Minuten auf der Karte ${KARTEN[world.karte]?.name || world.karte}</p>
    <table class="sieg">
      <tr><th></th><th style="color:${f[0].color}">${f[0].name}</th><th style="color:${f[1].color}">${f[1].name}</th></tr>
      ${zeile('Ausgebildet', v.ausgebildet[0], v.ausgebildet[1])}
      ${zeile('Getötet', v.getoetet[0], v.getoetet[1])}
      ${zeile('Verloren', v.verluste[0], v.verluste[1])}
      ${zeile('Gebäude verloren', v.gebaeudeVerloren[0], v.gebaeudeVerloren[1])}
    </table>
    <div class="diagramme">
      ${diagramm('Heer (Fron)', reihe('heer', 0), reihe('heer', 1), f[0].color, f[1].color)}
      ${diagramm('Förderung (Fron/min)', reihe('foerderung', 0), reihe('foerderung', 1), f[0].color, f[1].color)}
      ${diagramm('Gebäude', reihe('gebaeude', 0), reihe('gebaeude', 1), f[0].color, f[1].color)}
    </div>
    <div class="go">
      ${mitAufnahme ? '<button id="endeSpeichern">Wiederholung speichern</button>' : ''}
      <button id="endeKarte">Karte ansehen</button>
      <button id="endeNochmal">Neue Partie</button>
    </div>`;
}

/** Datei-Auswahl fuer den Startbildschirm. */
export function wiederholungWahlHtml() {
  return `<div class="stil">Wiederholung ansehen: <input type="file" id="wiederholungDatei" accept=".json,application/json"> <span id="wiederholungMeldung"></span></div>`;
}
