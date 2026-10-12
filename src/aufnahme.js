// Wiederholungen und Spielverlauf -- fuer beide Oberflaechen.
//
// Die Simulation ist deterministisch, und die KI auch: Wer Startwerte (Seed,
// Voelker, Karte, KI-Stil und -Stufe) und die Befehle des Spielers mit ihrem
// Tick kennt, kann die ganze Partie nachspielen. Mehr steht in einer
// Wiederholung nicht. Sie passt nur zum selben Stand der Simulation -- den
// haelt SPIEL_STAND fest (Pruefsumme der Sim-Dateien, von tools/bundle.mjs).

import { foerderungProMin } from './sim/sim.js';
import { UNITS, FACTIONS, KARTEN } from './sim/defs.js';
import { ICONS } from './icons.js';
import { spielerFarbe } from './ui-gemeinsam.js';

/** Name der Karte fuer Anzeigen und Dateinamen. */
const kartenName = (k) => KARTEN[k]?.name || { zufall: 'Zufallskarte', eigen: 'eigene Karte' }[k] || k;

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
  link.download = `drei-reiche-${a.factions.join('-gegen-')}-${kartenName(a.karte)}-${min}min.json`;
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

/** Verlauf fuer n Spieler (zwei, wenn nichts anderes gesagt wird). */
export function neuerVerlauf(n = 2) {
  const nullen = () => Array(n).fill(0);
  return { minuten: [], verluste: nullen(), getoetet: nullen(), gebaeudeVerloren: nullen(), ausgebildet: nullen() };
}

/** Nach jedem Tick: Verluste zaehlen, einmal je Minute Heer, Foerderung und Gebaeude festhalten. */
export function verlaufFortschreiben(v, world) {
  const n = world.players.length;
  for (const ev of world.events) {
    if (ev.t === 'died') {
      if (ev.vergangen) continue; // verfallen (Ausgeschiedene), nicht gefallen
      if (ev.kind === 'unit') {
        v.verluste[ev.player]++;
        // "Getoetet" kennt nur zwei Spieler: wer den Schuss tat, steht im Ereignis nicht.
        if (n === 2) v.getoetet[1 - ev.player]++;
      } else v.gebaeudeVerloren[ev.player]++;
    } else if (ev.t === 'spawned') {
      const u = world.entities.find((e) => e.id === ev.id);
      if (u && !UNITS[u.type].commander) v.ausgebildet[u.player]++;
    }
  }
  if (world.tick % 600 === 0 || world.over) {
    v.minuten.push(
      world.players.map((_, p) => {
        let heer = 0;
        let gebaeude = 0;
        for (const e of world.entities) {
          if (e.dead || e.player !== p) continue;
          if (e.kind === 'building') gebaeude++;
          else if (UNITS[e.type].weapon && !UNITS[e.type].worker && !UNITS[e.type].commander) heer += UNITS[e.type].cost.masse;
        }
        return { heer, foerderung: foerderungProMin(world, p), gebaeude };
      })
    );
  }
}

/** Kleines Liniendiagramm aller Seiten als SVG: reihen[p] ist die Zahlenreihe des Spielers p, farben[p] seine Farbe. */
function diagramm(titel, reihen, farben) {
  const B = 260;
  const H = 90;
  const n = Math.max(reihen[0].length, 2);
  const max = Math.max(1, ...reihen.flat());
  const pfad = (r) =>
    r.map((w, i) => `${i ? 'L' : 'M'}${((i / (n - 1)) * B).toFixed(1)},${(H - (w / max) * (H - 6) - 3).toFixed(1)}`).join(' ');
  return `<div class="diagramm"><b>${titel}</b>
    <svg viewBox="0 0 ${B} ${H}" preserveAspectRatio="none">
      ${reihen.map((r, p) => `<path d="${pfad(r)}" fill="none" stroke="${farben[p]}" stroke-width="2"/>`).join('\n      ')}
    </svg><span>höchstens ${Math.round(max)}</span></div>`;
}

/**
 * Siegbildschirm: Ergebnis, Zahlen aller Seiten, Verlauf von Heer,
 * Foerderung und Gebaeuden. Knoepfe: endeSpeichern, endeNochmal, endeKarte.
 * Bei drei und vier Spielern: Sieg, Niederlage (auch wer vorher ausschied), Farben je Spieler.
 */
export function siegHtml(world, v, ich, mitAufnahme, wiederholung) {
  const f = world.players.map((p) => FACTIONS[p.faction]);
  const farben = world.players.map((_, p) => spielerFarbe(world, p));
  const min = (world.tick / 600).toFixed(1).replace('.', ',');
  const titel = wiederholung ? `Wiederholung: ${f[world.winner]?.name || '—'} gewinnt` : world.winner === ich ? 'Sieg' : 'Niederlage';
  const zeile = (name, liste) => `<tr><td>${name}</td>${liste.map((a) => `<td>${a}</td>`).join('')}</tr>`;
  const reihen = (k) => world.players.map((_, p) => v.minuten.map((m) => (m[p] ? m[p][k] : 0)));
  // Wer gefallen ist, steht in der Kopfzeile durchgestrichen (nur bei mehr als zwei Spielern interessant)
  const kopf = world.players.map((pl, p) => `<th style="color:${farben[p]}${!pl.alive && world.players.length > 2 ? ';text-decoration:line-through' : ''}">${f[p].name}</th>`).join('');
  return `<h1>${titel}</h1>
    <p>nach ${min} Minuten auf der Karte ${kartenName(world.karte)}</p>
    <table class="sieg">
      <tr><th></th>${kopf}</tr>
      ${zeile('Ausgebildet', v.ausgebildet)}
      ${world.players.length === 2 ? zeile('Getötet', v.getoetet) : ''}
      ${zeile('Verloren', v.verluste)}
      ${zeile('Gebäude verloren', v.gebaeudeVerloren)}
    </table>
    <div class="diagramme">
      ${diagramm('Heer (Fron)', reihen('heer'), farben)}
      ${diagramm('Förderung (Fron/min)', reihen('foerderung'), farben)}
      ${diagramm('Gebäude', reihen('gebaeude'), farben)}
    </div>
    <div class="go">
      ${mitAufnahme ? `<button id="endeSpeichern" class="mitIcon">${ICONS.wiederholung || ''} Wiederholung speichern</button>` : ''}
      <button id="endeKarte">Karte ansehen</button>
      <button id="endeNochmal">Neue Partie</button>
    </div>`;
}

/** Datei-Auswahl fuer den Startbildschirm. */
export function wiederholungWahlHtml() {
  return `<div class="stil mitIcon">${ICONS.wiederholung || ''} Wiederholung ansehen: <input type="file" id="wiederholungDatei" accept=".json,application/json"> <span id="wiederholungMeldung"></span></div>`;
}
