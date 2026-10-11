// Wegfindung. Ein Gitter ueber die Karte; Hindernisse (Felsen, Seen) sind
// unpassierbar. Ein Ziel bekommt ein Flussfeld -- Dijkstra vom Ziel aus --,
// dem jede Einheit folgt, bis sie ihr Ziel direkt sieht. Gebaeude stehen
// nicht im Gitter: um die gleiten Einheiten wie bisher herum (umgehen()).
//
// Nur Integer, feste Reihenfolge, und punktsymmetrisch: Die Karte ist es,
// also muessen beide Sitzplaetze gespiegelte Wege finden.
//  - Ein Punkt genau auf einer Zellgrenze gehoert zu beiden Nachbarzellen
//    (sonst landete er rechts, sein Spiegelbild aber links der Grenze).
//  - Gleich gute Nachbarn entscheidet zuerst die Richtung zum Ziel, dann die
//    Drehrichtung -- beides bleibt bei einer Drehung um die Mitte gleich.

import { MAP } from './defs.js';

export const ZELLE = 200; // Dezimeter je Zelle: 20 m
const N = MAP / ZELLE;
const SPIELRAUM = 60; // so viel Abstand halten Wege von Hindernissen
const UNENDLICH = 0x3fffffff;
const FELDER_HOECHSTENS = 64;

/** Gitter aus den Hindernissen: frei[i] = 1, wenn die Zellmitte begehbar ist. */
export function wegGitter(hindernisse) {
  const frei = new Uint8Array(N * N).fill(1);
  for (let k = 0; k < hindernisse.length; k++) {
    const h = hindernisse[k];
    const r = h.r + SPIELRAUM;
    const x0 = Math.max(0, ((h.x - r) / ZELLE) | 0);
    const x1 = Math.min(N - 1, ((h.x + r) / ZELLE) | 0);
    const y0 = Math.max(0, ((h.y - r) / ZELLE) | 0);
    const y1 = Math.min(N - 1, ((h.y + r) / ZELLE) | 0);
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const mx = cx * ZELLE + (ZELLE >> 1) - h.x;
        const my = cy * ZELLE + (ZELLE >> 1) - h.y;
        if (mx * mx + my * my <= r * r) frei[cy * N + cx] = 0;
      }
    }
  }
  return { frei, felder: new Map(), leer: hindernisse.length === 0 };
}

/**
 * Doppelte Zellkoordinate: gerade d = mitten in Zelle d/2, ungerade d = auf
 * der Grenze zwischen den Zellen (d-1)/2 und (d+1)/2. Spiegelt sich als 2N-2-d.
 */
function doppelt(v) {
  if (v <= 0) return 0;
  if (v >= MAP) return 2 * N - 2;
  return v % ZELLE === 0 ? 2 * (v / ZELLE) - 1 : 2 * ((v / ZELLE) | 0);
}

/** Die Zellen zu einem Punkt: eine, zwei oder (in einer Ecke) vier. */
function zellen(x, y) {
  const dx = doppelt(x);
  const dy = doppelt(y);
  const xs = dx & 1 ? [(dx - 1) >> 1, (dx + 1) >> 1] : [dx >> 1];
  const ys = dy & 1 ? [(dy - 1) >> 1, (dy + 1) >> 1] : [dy >> 1];
  const out = [];
  for (const cy of ys) for (const cx of xs) out.push(cy * N + cx);
  return out;
}

/** Ist der Punkt begehbar? Auf einer Grenze nur, wenn alle angrenzenden Zellen es sind. */
function punktFrei(weg, x, y) {
  for (const c of zellen(x, y)) if (!weg.frei[c]) return false;
  return true;
}

/** Liegt zwischen den beiden Punkten kein Hindernis? Abgetastet je halbe Zelle, ohne die Endpunkte. */
export function sichtfrei(weg, x0, y0, x1, y1) {
  if (weg.leer) return true;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const n = Math.max(1, (Math.max(Math.abs(dx), Math.abs(dy)) / (ZELLE >> 1)) | 0);
  for (let k = 1; k < n; k++) {
    if (!punktFrei(weg, x0 + (((dx * k) / n) | 0), y0 + (((dy * k) / n) | 0))) return false;
  }
  return true;
}

// Acht Nachbarn: gerade kosten 10, schraeg 14.
const NB = [
  [1, 0, 10], [-1, 0, 10], [0, 1, 10], [0, -1, 10],
  [1, 1, 14], [-1, 1, 14], [1, -1, 14], [-1, -1, 14],
];

/**
 * Darf man von Zelle (cx,cy) in Richtung (dx,dy) gehen? Nicht in Hindernisse
 * (ausser in eine Zielzelle, f = 0), schraeg nicht an Ecken vorbei.
 */
function begehbar(weg, f, cx, cy, dx, dy) {
  const nx = cx + dx;
  const ny = cy + dy;
  if (nx < 0 || ny < 0 || nx >= N || ny >= N) return false;
  const nb = ny * N + nx;
  if (!weg.frei[nb] && !(f && f[nb] === 0)) return false;
  if (dx && dy && (!weg.frei[cy * N + nx] || !weg.frei[ny * N + cx])) return false;
  return true;
}

/** Flussfeld zu einem Zielpunkt: Wegkosten jeder Zelle bis dorthin. Zwischengespeichert. */
function feld(weg, tx, ty) {
  const schluessel = doppelt(ty) * (2 * N) + doppelt(tx);
  const alt = weg.felder.get(schluessel);
  if (alt) return alt;
  const f = new Int32Array(N * N).fill(UNENDLICH);
  // Binaerer Heap aus (Kosten, Zelle), Gleichstand nach Zelle -- deterministisch.
  const hk = [];
  const hz = [];
  const vor = (a, b) => hk[a] < hk[b] || (hk[a] === hk[b] && hz[a] < hz[b]);
  const tausch = (a, b) => {
    [hk[a], hk[b]] = [hk[b], hk[a]];
    [hz[a], hz[b]] = [hz[b], hz[a]];
  };
  const push = (k, z) => {
    let i = hk.length;
    hk.push(k);
    hz.push(z);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!vor(i, p)) break;
      tausch(i, p);
      i = p;
    }
  };
  const pop = () => {
    const k = hk[0];
    const z = hz[0];
    const lk = hk.pop();
    const lz = hz.pop();
    if (hk.length) {
      hk[0] = lk;
      hz[0] = lz;
      let i = 0;
      for (;;) {
        const a = 2 * i + 1;
        const b = a + 1;
        let m = i;
        if (a < hk.length && vor(a, m)) m = a;
        if (b < hk.length && vor(b, m)) m = b;
        if (m === i) break;
        tausch(i, m);
        i = m;
      }
    }
    return [k, z];
  };
  for (const c of zellen(tx, ty)) {
    f[c] = 0;
    push(0, c);
  }
  while (hk.length) {
    const [k, c] = pop();
    if (k > f[c]) continue;
    const cx = c % N;
    const cy = (c / N) | 0;
    for (let i = 0; i < 8; i++) {
      const [dx, dy, kosten] = NB[i];
      if (!begehbar(weg, null, cx, cy, dx, dy)) continue;
      const nb = (cy + dy) * N + cx + dx;
      const nk = k + kosten;
      if (nk < f[nb]) {
        f[nb] = nk;
        push(nk, nb);
      }
    }
  }
  if (weg.felder.size >= FELDER_HOECHSTENS) weg.felder.delete(weg.felder.keys().next().value);
  weg.felder.set(schluessel, f);
  return f;
}

/** Mitte einer Zelle. */
const mitteX = (c) => (c % N) * ZELLE + (ZELLE >> 1);
const mitteY = (c) => ((c / N) | 0) * ZELLE + (ZELLE >> 1);

/**
 * Von mehreren Zellen die beste: niedrigste Kosten, dann am ehesten in
 * Zielrichtung (gx, gy) von (x, y) aus, dann links davon -- drehungsfest.
 */
function besteZelle(kandidaten, f, x, y, gx, gy) {
  let best = -1;
  let bk = UNENDLICH + 1;
  let bdot = -Infinity;
  let bkreuz = -Infinity;
  for (const c of kandidaten) {
    const ox = mitteX(c) - x;
    const oy = mitteY(c) - y;
    const dot = ox * gx + oy * gy;
    const kreuz = ox * gy - oy * gx;
    if (f[c] < bk || (f[c] === bk && (dot > bdot || (dot === bdot && kreuz > bkreuz)))) {
      best = c;
      bk = f[c];
      bdot = dot;
      bkreuz = kreuz;
    }
  }
  return best;
}

/** Naechste Zelle entlang des Feldes von Zelle c aus -- nur, wenn sie naeher am Ziel ist; sonst -1. */
function naechsteZelle(weg, f, c, x, y, gx, gy) {
  const cx = c % N;
  const cy = (c / N) | 0;
  const kandidaten = [];
  for (let i = 0; i < 8; i++) {
    const [dx, dy] = NB[i];
    if (!begehbar(weg, f, cx, cy, dx, dy)) continue;
    const nb = (cy + dy) * N + cx + dx;
    if (f[nb] < f[c]) kandidaten.push(nb);
  }
  return kandidaten.length ? besteZelle(kandidaten, f, x, y, gx, gy) : -1;
}

/**
 * Wohin eine Einheit bei (x, y) als Naechstes laeuft, um (tx, ty) zu
 * erreichen: direkt, wenn nichts im Weg ist, sonst zum weitesten Punkt
 * entlang des Flussfeldes, den sie noch direkt sieht.
 */
export function wegpunkt(weg, x, y, tx, ty) {
  if (weg.leer || sichtfrei(weg, x, y, tx, ty)) return [tx, ty];
  const f = feld(weg, tx, ty);
  const gx = tx - x;
  const gy = ty - y;
  let c = besteZelle(zellen(x, y), f, x, y, gx, gy);
  let px = tx;
  let py = ty;
  for (let s = 0; s < 8; s++) {
    const n = naechsteZelle(weg, f, c, x, y, gx, gy);
    if (n < 0) break;
    c = n;
    if (s > 0 && !sichtfrei(weg, x, y, mitteX(c), mitteY(c))) break;
    px = mitteX(c);
    py = mitteY(c);
    if (f[c] === 0) break;
  }
  return [px, py];
}
