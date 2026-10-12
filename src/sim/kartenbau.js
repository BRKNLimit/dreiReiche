// Kartenbau: Zufallskarten und die Pruefung eigener Karten. Deterministisch
// wie die Simulation (nur Integer, rng() mit eigenem Seed) -- dieselbe Zahl
// ergibt auf jedem Rechner dieselbe Karte, Wiederholungen bleiben gueltig.
//
// Jede Karte ist punktsymmetrisch um die Mitte: Was auf der einen Haelfte
// liegt, liegt gespiegelt auf der anderen. Beide Sitzplaetze spielen damit
// dieselbe Karte, nur gedreht -- fair, ohne dass man es pruefen muss.

import { MAP } from './defs.js';
import { rng, isqrt, cosDeg, sinDeg } from './sim.js';
import { wegGitter, ZELLE } from './weg.js';

// Hauptgebaeude stehen fest an zwei Ecken (siehe setupMap in sim.js).
export const BASIS = [
  { x: 3000, y: 3000 },
  { x: MAP - 3000, y: MAP - 3000 },
];
// Um jede Basis bleibt so viel Platz frei (dm): Grunddomaene des Hauptgebaeudes.
const BASIS_FREI = 4300;

const kbSpiegel = (o) => ({ ...o, x: MAP - o.x, y: MAP - o.y });
/** Liste mit Spiegelbildern; was genau auf der Mitte liegt, nur einmal. */
export function spiegelPaare(liste) {
  const out = [];
  for (const o of liste) {
    out.push(o);
    if (o.x * 2 !== MAP || o.y * 2 !== MAP) out.push(kbSpiegel(o));
  }
  return out;
}

/** Leere Karte -- Ausgangspunkt fuer den Editor. Fuenf Adern je Basis wie auf der klassischen Karte. */
export function leereKarte(name = 'Eigene Karte') {
  return {
    name,
    hindernisse: [],
    adern: spiegelPaare(BASIS_ADERN),
    wald: [],
    wiesen: [],
    furten: [],
  };
}
const BASIS_ADERN = [
  { x: 4800, y: 2200, kind: 'masse' },
  { x: 2200, y: 4800, kind: 'masse' },
  { x: 6200, y: 4500, kind: 'masse' },
  { x: 6700, y: 2100, kind: 'masse' },
  { x: 2100, y: 6700, kind: 'masse' },
];

// ------------------------------------------------------------ Pruefung

/**
 * Karten von vor 0.42 nennen die Adern noch 'fron' und 'goetterblut': auf die
 * heutigen Namen 'masse' und 'resonit' umschreiben (in der Karte selbst).
 * Eigene Karten aus dem Speicher und geladene Dateien laufen hier durch.
 */
export function alteNamen(k) {
  if (k && Array.isArray(k.adern)) {
    for (const a of k.adern) {
      if (a.kind === 'fron') a.kind = 'masse';
      else if (a.kind === 'goetterblut') a.kind = 'resonit';
    }
  }
  return k;
}

/**
 * Was an einer Karte nicht stimmt, als Liste von Saetzen; leer heisst
 * spielbar. Prueft Symmetrie, freie Startbasen, freie Adern und ob man von
 * Basis zu Basis kommt.
 */
export function kartenFehler(k) {
  alteNamen(k);
  const fehler = [];
  for (const [name, liste] of [['Hindernis', k.hindernisse], ['Ader', k.adern]]) {
    for (const o of liste) {
      if (o.x < 0 || o.y < 0 || o.x > MAP || o.y > MAP) fehler.push(`${name} ausserhalb der Karte bei ${o.x},${o.y}`);
      if (!liste.some((p) => p.x === MAP - o.x && p.y === MAP - o.y && (p.kind || p.art) === (o.kind || o.art))) {
        fehler.push(`${name} bei ${o.x},${o.y} hat kein Spiegelbild`);
      }
    }
  }
  for (const b of BASIS) {
    if (k.hindernisse.some((h) => (h.x - b.x) ** 2 + (h.y - b.y) ** 2 < (h.r + 1800) ** 2)) {
      fehler.push('Ein Hindernis steht in der Startbasis');
      break;
    }
  }
  for (const d of k.adern) {
    if (k.hindernisse.some((h) => (d.x - h.x) ** 2 + (d.y - h.y) ** 2 < (h.r + 150) ** 2)) {
      fehler.push(`Ader bei ${d.x},${d.y} liegt in einem Hindernis`);
    }
  }
  if (k.adern.filter((d) => d.kind === 'masse').length < 6) fehler.push('Zu wenige Fron-Adern (mindestens drei je Seite)');
  if (!verbunden(k.hindernisse, BASIS[0], BASIS[1])) fehler.push('Von Basis zu Basis gibt es keinen Weg');
  return fehler;
}

/** Gibt es einen Weg zwischen zwei Punkten? Breitensuche ueber das Wegegitter. */
export function verbunden(hindernisse, a, b) {
  const N = MAP / ZELLE;
  const { frei } = wegGitter(hindernisse);
  const start = ((a.y / ZELLE) | 0) * N + ((a.x / ZELLE) | 0);
  const ziel = ((b.y / ZELLE) | 0) * N + ((b.x / ZELLE) | 0);
  if (!frei[start] || !frei[ziel]) return false;
  const gesehen = new Uint8Array(N * N);
  const schlange = [start];
  gesehen[start] = 1;
  for (let i = 0; i < schlange.length; i++) {
    const c = schlange[i];
    if (c === ziel) return true;
    const cx = c % N;
    const cy = (c / N) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
      const n = ny * N + nx;
      if (gesehen[n] || !frei[n]) continue;
      gesehen[n] = 1;
      schlange.push(n);
    }
  }
  return false;
}

// ------------------------------------------------------------ Bausteine

/** Kreiskette entlang eines Linienzugs (Fluss oder Grat), ohne Kreise nahe den Luecken. */
export function kette(punkte, r, abstand, art, luecken = [], frei = 0) {
  const out = [];
  for (let i = 0; i + 1 < punkte.length; i++) {
    const [x0, y0] = punkte[i];
    const [x1, y1] = punkte[i + 1];
    const l = isqrt((x1 - x0) ** 2 + (y1 - y0) ** 2);
    const n = Math.max(1, ((l + (abstand >> 1)) / abstand) | 0);
    const bis = i + 2 === punkte.length ? n : n - 1;
    for (let k = 0; k <= bis; k++) {
      const x = (x0 + ((x1 - x0) * k) / n) | 0;
      const y = (y0 + ((y1 - y0) * k) / n) | 0;
      if (luecken.some((f) => (f.x - x) ** 2 + (f.y - y) ** 2 < frei * frei)) continue;
      const h = { x, y, r, art };
      if (art === 'see' && frei) h.fluss = true;
      out.push(h);
    }
  }
  return out;
}

// ------------------------------------------------------------ Zufallskarten

/**
 * Eine Zufallskarte zur Zahl seed. Gebaut wird eine Haelfte, gespiegelt die
 * andere; misslingt die Pruefung (kein Weg, Ader im Fels), wird mit dem
 * naechsten Zufall neu gebaut.
 */
export function zufallsKarte(seed) {
  const z = { seed: seed | 0 || 1 };
  for (let versuch = 0; versuch < 40; versuch++) {
    const k = baueZufallsKarte(z, seed);
    if (!kartenFehler(k).length) return k;
  }
  // Notfall: eine Karte ohne Hindernisse ist immer spielbar
  const k = leereKarte('Zufall ' + seed);
  k.adern = k.adern.concat(spiegelPaare([{ x: 10000, y: 6500, kind: 'masse' }]), [{ x: 10000, y: 10000, kind: 'resonit' }]);
  return k;
}

const kbZufall = (z, von, bis) => von + (rng(z) % (bis - von + 1));
const kbFrei = (k, x, y, r) =>
  x > 400 && y > 400 && x < MAP - 400 && y < MAP - 400 &&
  !BASIS.some((b) => (x - b.x) ** 2 + (y - b.y) ** 2 < (r + BASIS_FREI) ** 2) &&
  !k.hindernisse.some((h) => (x - h.x) ** 2 + (y - h.y) ** 2 < (r + h.r + 300) ** 2);

function baueZufallsKarte(z, seed) {
  const k = { name: 'Zufall ' + seed, hindernisse: [], adern: [], wald: [], wiesen: [], furten: [] };
  const haelfte = []; // Hindernisse der einen Haelfte, gespiegelt am Ende
  const ziel = { hindernisse: haelfte };

  // Fluss quer durch die Mitte, mit Furten (in jeder zweiten Karte)
  const mitFluss = kbZufall(z, 0, 9) < 5;
  if (mitFluss) {
    const y0 = kbZufall(z, 9000, 15000);
    const punkte = [[0, y0]];
    const n = 4;
    for (let i = 1; i < n; i++) {
      const x = ((10000 * i) / n) | 0;
      const y = (y0 + ((10000 - y0) * i) / n + kbZufall(z, -1200, 1200)) | 0;
      punkte.push([x, y]);
    }
    punkte.push([9650, 9800]);
    // eine Furt nahe dem Rand, manchmal eine zweite naeher zur Mitte
    const furten = [];
    const i1 = 1;
    furten.push({ x: (punkte[0][0] + punkte[i1][0]) >> 1, y: (punkte[0][1] + punkte[i1][1]) >> 1 });
    if (kbZufall(z, 0, 1)) furten.push({ x: punkte[2][0], y: punkte[2][1] });
    haelfte.push(...kette(punkte, 300, 400, 'see', furten, 520));
    k.furten.push(...spiegelPaare(furten));
  }
  // Mitte: Felsring, See oder Fluss
  const mitte = mitFluss ? 'fluss' : ['ring', 'see', 'offen'][kbZufall(z, 0, 2)];
  if (mitte === 'fluss') {
    k.hindernisse.push({ x: 10000, y: 10000, r: 300, art: 'see', fluss: true });
  } else if (mitte === 'ring') {
    const r = kbZufall(z, 1100, 1500);
    for (const [dx, dy] of [[r, 0], [-r, 0], [0, r], [0, -r]]) k.hindernisse.push({ x: 10000 + dx, y: 10000 + dy, r: 480, art: 'fels' });
  } else if (mitte === 'see') {
    k.hindernisse.push({ x: 10000, y: 10000, r: kbZufall(z, 700, 1200), art: 'see' });
  }
  // Grate
  for (let i = kbZufall(z, 1, 3); i > 0; i--) {
    for (let t = 0; t < 12; t++) {
      const x0 = kbZufall(z, 1000, 15000);
      const y0 = kbZufall(z, 1000, 15000);
      const w = kbZufall(z, 0, 359);
      const l = kbZufall(z, 2500, 6000);
      const x1 = x0 + (((l * cosDeg(w)) / 1000) | 0);
      const y1 = y0 + (((l * sinDeg(w)) / 1000) | 0);
      if (!kbFrei(ziel, x0, y0, 600) || !kbFrei(ziel, x1, y1, 600) || !kbFrei(ziel, (x0 + x1) >> 1, (y0 + y1) >> 1, 600)) continue;
      const n = Math.max(4, (l / 450) | 0);
      const luecke = kbZufall(z, 1, n - 2);
      const teile = kette([[x0, y0], [x1, y1]], kbZufall(z, 330, 450), (l / n) | 0, 'fels');
      haelfte.push(...teile.filter((_, j) => j !== luecke && j !== luecke + 1));
      break;
    }
  }
  // Felsgruppen und Seen
  for (let i = kbZufall(z, 2, 4); i > 0; i--) {
    for (let t = 0; t < 12; t++) {
      const x = kbZufall(z, 1500, 17000);
      const y = kbZufall(z, 1500, 17000);
      if (!kbFrei(ziel, x, y, 1200)) continue;
      for (let j = kbZufall(z, 2, 4); j > 0; j--) {
        haelfte.push({ x: x + kbZufall(z, -700, 700), y: y + kbZufall(z, -700, 700), r: kbZufall(z, 450, 850), art: 'fels' });
      }
      break;
    }
  }
  for (let i = kbZufall(z, 0, 2); i > 0; i--) {
    for (let t = 0; t < 12; t++) {
      const r = kbZufall(z, 700, 1400);
      const x = kbZufall(z, 1500, 17000);
      const y = kbZufall(z, 1500, 17000);
      if (!kbFrei(ziel, x, y, r)) continue;
      haelfte.push({ x, y, r, art: 'see' });
      break;
    }
  }
  k.hindernisse.push(...spiegelPaare(haelfte));

  // Adern: die fuenf an der Basis, weitere auf der Karte, Goetterblut
  const adern = BASIS_ADERN.slice();
  const aderFrei = (x, y) =>
    kbFrei(k, x, y, 200) && !adern.some((d) => (d.x - x) ** 2 + (d.y - y) ** 2 < 2200 * 2200) &&
    !adern.some((d) => (MAP - d.x - x) ** 2 + (MAP - d.y - y) ** 2 < 2200 * 2200) &&
    (x + y < MAP - 1500 || x + y > MAP + 1500); // nicht zu nah an der Mittellinie, sonst stoesst sie an ihr Spiegelbild
  let masse = kbZufall(z, 3, 5);
  for (let t = 0; t < 200 && masse > 0; t++) {
    const x = kbZufall(z, 1000, 19000);
    const y = kbZufall(z, 1000, 19000);
    if (!aderFrei(x, y)) continue;
    adern.push({ x, y, kind: 'masse' });
    masse--;
  }
  const mitteFrei = mitte === 'ring' || mitte === 'offen';
  if (mitteFrei) k.adern.push({ x: 10000, y: 10000, kind: 'resonit' });
  let resonit = mitteFrei ? kbZufall(z, 0, 1) : 1;
  for (let t = 0; t < 200 && resonit > 0; t++) {
    const x = kbZufall(z, 1500, 18500);
    const y = kbZufall(z, 1500, 18500);
    if (!aderFrei(x, y)) continue;
    // Goetterblut liegt nicht vor der eigenen Haustuer
    const dA = (x - BASIS[0].x) ** 2 + (y - BASIS[0].y) ** 2;
    if (dA < 9000 * 9000) continue;
    adern.push({ x, y, kind: 'resonit' });
    resonit--;
  }
  k.adern.push(...spiegelPaare(adern));

  // Optik: Wald und Wiesen
  for (let i = kbZufall(z, 3, 6); i > 0; i--) k.wald.push({ x: kbZufall(z, 1000, 19000), y: kbZufall(z, 1000, 9500), r: kbZufall(z, 1500, 3200) });
  for (let i = kbZufall(z, 1, 3); i > 0; i--) k.wiesen.push({ x: kbZufall(z, 1000, 19000), y: kbZufall(z, 1000, 9500), r: kbZufall(z, 1500, 3000) });
  k.wald = spiegelPaare(k.wald);
  k.wiesen = spiegelPaare(k.wiesen);
  return k;
}
