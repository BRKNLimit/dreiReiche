// Gelaende der 3D-Ansicht: Boden, gerodete Flaechen, Seen, Felsen, Adern, Baeume.
// Gehoert zur Grafik (siehe GEMINI.md). Wird von tools/bundle.mjs mit den
// anderen Dateien zu einem Skript zusammengefuegt -- Bezeichner aus frueheren
// Dateien (gl, MAP, KARTE, ...) sind dort global. Exporte gibt es nur fuer die
// Tests unter Node.

/**
 * Boden: Raster mit Farbe je Eckpunkt aus zwei Rauschlagen -- die Farben
 * verlaufen weich zwischen den Ecken, deterministisch, ohne Textur.
 */
export function baueBoden() {
  const n = 90;
  const g = (MAP * DM) / n;
  const hash = (i, j) => {
    let h = (i * 374761393 + j * 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  };
  // Wertrauschen: Gitterwerte alle 'schritt' Ecken, dazwischen weich
  const rauschen = (i, j, schritt, salz) => {
    const gi = Math.floor(i / schritt);
    const gj = Math.floor(j / schritt);
    const fi = i / schritt - gi;
    const fj = j / schritt - gj;
    const w = (t) => t * t * (3 - 2 * t);
    const v = (a, b) => hash(a * 7 + salz, b * 13 + salz);
    const o = v(gi, gj) + (v(gi + 1, gj) - v(gi, gj)) * w(fi);
    const u = v(gi, gj + 1) + (v(gi + 1, gj + 1) - v(gi, gj + 1)) * w(fi);
    return o + (u - o) * w(fj);
  };
  const farbe = [];
  for (let i = 0; i <= n; i++) {
    farbe.push([]);
    for (let j = 0; j <= n; j++) {
      const k = 0.65 * rauschen(i, j, 9, 1) + 0.35 * rauschen(i, j, 3, 2);
      const trocken = rauschen(i, j, 14, 3);
      farbe[i].push([0.2 + 0.07 * k + 0.06 * trocken, 0.3 + 0.1 * k, 0.15 + 0.04 * k]);
    }
  }
  const v = [];
  const ecke = (i, j) => v.push(i * g, 0, j * g, 0, 1, 0, ...farbe[i][j], 0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      ecke(i, j);
      ecke(i + 1, j + 1);
      ecke(i + 1, j);
      ecke(i, j);
      ecke(i, j + 1);
      ecke(i + 1, j + 1);
    }
  }
  return ladeModell(new Float32Array(v));
}

// Deko: Baeume am Kartenrand und in Ecken -- nur Bild, kein Hindernis.
export const DEKO = (() => {
  const d = [];
  let s = 12345;
  const r = () => ((s = (Math.imul(s, 1103515245) + 12345) | 0) >>> 8) / 16777216;
  for (let i = 0; i < 260; i++) {
    const x = r() * MAP * DM;
    const z = r() * MAP * DM;
    // Nicht auf Basen, Mittelachse, Felsen und Seen
    const nahBasis = Math.hypot(x - 300, z - 300) < 520 || Math.hypot(x - 1700, z - 1700) < 520;
    const nahAchse = Math.abs(x + z - 2000) < 360;
    const imWeg = KARTE.hindernisse.some((h) => Math.hypot(x - h.x * DM, z - h.y * DM) < h.r * DM + 25);
    if (nahBasis || nahAchse || imWeg) continue;
    d.push([x, z, 2.5 + r() * 2.5, r() * 6.28]);
  }
  return d;
})();

/** Boden und gerodete Flaechen -- vor Schatten und Domaenen gezeichnet. */
export function zeichneBoden(world) {
  bodenModell.inst.push(0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0);
  zeichneInstanzen(bodenModell);
  gl.depthMask(false);
  for (const c of world.cleared) instanz('scheibe', c.x * DM, 0.05, c.y * DM, 0, c.r * DM, [0.36, 0.3, 0.2], 1, 1, 0.32);
  zeichneInstanzen(MODELLE.scheibe);
  gl.depthMask(true);
}

/**
 * Seen, Felsen, Adern und Baeume -- nach den Domaenen, vor Gebaeuden und
 * Einheiten. Felsen, Adern und Baeume werden nur vorgemerkt (instanz) und mit
 * allen anderen Modellen gezeichnet. Kollision und Wege bestimmt die
 * Simulation (Kreise in KARTE.hindernisse); hier geht es nur ums Aussehen.
 */
export function zeichneGelaende(world, now) {
  // Seen: flache Scheiben knapp ueber dem Boden; Felsen: Brocken in Felsgroesse
  gl.depthMask(false);
  for (const h of world.hindernisse) {
    if (h.art === 'see') instanz('scheibe', h.x * DM, 0.1, h.y * DM, 0, h.r * DM, [0.16, 0.32, 0.44], 1, 1, 0.95);
  }
  zeichneInstanzen(MODELLE.scheibe);
  gl.depthMask(true);
  for (const h of world.hindernisse) {
    if (h.art === 'fels') instanz('fels', h.x * DM, 0, h.y * DM, ((h.x * 7 + h.y * 3) % 628) / 100, h.r * DM, [1, 1, 1]);
  }
  // Adern
  for (const d of world.deposits) {
    const key = d.kind === 'goetterblut' ? 'blutAder' : 'fronAder';
    const s = d.kind === 'goetterblut' ? 9 : 6;
    instanz(key, d.x * DM, 0, d.y * DM, ((d.x + d.y) % 7) * 0.9, s, [1, 1, 1], 1, d.takenBy ? 0.55 : 1);
  }
  // Deko-Baeume
  for (const [x, z, s, r] of DEKO) instanz('baum', x, 0, z, r, s, [1, 1, 1]);
}
