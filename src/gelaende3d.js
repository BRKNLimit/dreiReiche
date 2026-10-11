// Gelaende der 3D-Ansicht: Boden, gerodete Flaechen, Seen, Felsen, Adern, Baeume.
// Gehoert zur Grafik (siehe GEMINI.md). Wird von tools/bundle.mjs mit den
// anderen Dateien zu einem Skript zusammengefuegt -- Bezeichner aus frueheren
// Dateien (gl, MAP, KARTE, ...) sind dort global. Exporte gibt es nur fuer die
// Tests unter Node.

/**
 * Boden: Landschaftsraster mit naturnahen Farbverlaeufen -- Wiesen, feuchte
 * Uferstreifen an Seen, steinige Felsauslaeufer und ausgetretene Wege.
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
    const wx = i * g;
    for (let j = 0; j <= n; j++) {
      const wz = j * g;
      // Natuerliches Rauschen fuer Wiesenvarianz
      const k = 0.6 * rauschen(i, j, 9, 1) + 0.3 * rauschen(i, j, 4, 2) + 0.1 * rauschen(i, j, 2, 5);
      const trocken = rauschen(i, j, 13, 3);

      // Basis-Wiesenfarbe: saftiges Gras mit warmen Spitzen
      let r = 0.21 + 0.08 * k + 0.05 * trocken;
      let gr = 0.32 + 0.11 * k;
      let b = 0.14 + 0.04 * k;

      // Naehe zu Seen: feuchter, dunkler Uferboden
      let dSee = 9999;
      for (const h of KARTE.hindernisse) {
        if (h.art === 'see') {
          const d = Math.hypot(wx - h.x * DM, wz - h.y * DM) - h.r * DM;
          if (d < dSee) dSee = d;
        }
      }
      if (dSee < 60) {
        const ufer = Math.max(0, 1 - dSee / 60);
        r = r * (1 - 0.35 * ufer) + 0.16 * ufer;
        gr = gr * (1 - 0.25 * ufer) + 0.24 * ufer;
        b = b * (1 - 0.2 * ufer) + 0.15 * ufer;
      }

      // Naehe zu Felsen: Schotter, Geröll und trockener Boden
      let dFels = 9999;
      for (const h of KARTE.hindernisse) {
        if (h.art === 'fels') {
          const d = Math.hypot(wx - h.x * DM, wz - h.y * DM) - h.r * DM;
          if (d < dFels) dFels = d;
        }
      }
      if (dFels < 35) {
        const felsUfer = Math.max(0, 1 - dFels / 35);
        r = r * (1 - 0.4 * felsUfer) + 0.28 * felsUfer;
        gr = gr * (1 - 0.3 * felsUfer) + 0.29 * felsUfer;
        b = b * (1 - 0.3 * felsUfer) + 0.23 * felsUfer;
      }

      // Hauptpfad / Marschachse zwischen den Basen: erdiger Weg
      const dAchse = Math.abs(wx - wz) / Math.SQRT2;
      const wegRausch = rauschen(i, j, 5, 8);
      if (dAchse < 45 + wegRausch * 15 && wx > 250 && wx < 1750) {
        const wegFaktor = Math.max(0, 1 - dAchse / (45 + wegRausch * 15)) * 0.45;
        r = r * (1 - wegFaktor) + 0.34 * wegFaktor;
        gr = gr * (1 - wegFaktor) + 0.27 * wegFaktor;
        b = b * (1 - wegFaktor) + 0.17 * wegFaktor;
      }

      farbe[i].push([r, gr, b]);
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

// Deko: Baeume in Waldstuecken und Hainen an den Kartenraendern
export const DEKO = (() => {
  const d = [];
  let s = 12345;
  const r = () => ((s = (Math.imul(s, 1103515245) + 12345) | 0) >>> 8) / 16777216;

  // Waldschwerpunkte (Haine) an Flanken und Ecken
  const waldZentren = [
    [250, 1200], [300, 1550], [600, 1750], [900, 1800],
    [1200, 250], [1550, 300], [1750, 600], [1800, 900],
    [150, 800], [800, 150], [1850, 1400], [1400, 1850],
  ];

  for (let i = 0; i < 300; i++) {
    let x, z;
    if (i < 200) {
      // In Hainen konzentriert
      const zentrum = waldZentren[i % waldZentren.length];
      const radius = 60 + r() * 160;
      const winkel = r() * Math.PI * 2;
      x = zentrum[0] + Math.cos(winkel) * radius;
      z = zentrum[1] + Math.sin(winkel) * radius;
    } else {
      // Vereinzelte Randbaeume
      x = r() * MAP * DM;
      z = r() * MAP * DM;
    }

    // Abstand zu Basen, Mittelachse, Felsen und Seen wahren
    const nahBasis = Math.hypot(x - 300, z - 300) < 500 || Math.hypot(x - 1700, z - 1700) < 500;
    const nahAchse = Math.abs(x + z - 2000) < 320;
    const imWeg = KARTE.hindernisse.some((h) => Math.hypot(x - h.x * DM, z - h.y * DM) < h.r * DM + 20);
    if (x < 40 || x > 1960 || z < 40 || z > 1960 || nahBasis || nahAchse || imWeg) continue;

    d.push([x, z, 2.2 + r() * 2.6, r() * 6.28]);
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
 * Einheiten. Die Kollisionskreise der Simulation bestimmen die begehbare
 * Grenze; die sichtbaren Kanten entsprechen ihr bis auf < 10 %.
 */
export function zeichneGelaende(world, now) {
  // Seen: Uferring und lebendige Wasseroberflaeche mit sanftem Schimmer
  gl.depthMask(false);
  for (const h of world.hindernisse) {
    if (h.art === 'see') {
      const rM = h.r * DM;
      // Ufersaum (feuchter Sand/Schilfrand)
      instanz('scheibe', h.x * DM, 0.08, h.y * DM, 0, rM * 1.04, [0.28, 0.26, 0.19], 1, 1, 0.9);
      // Tiefes Wasser
      instanz('scheibe', h.x * DM, 0.12, h.y * DM, 0, rM * 0.98, [0.11, 0.27, 0.39], 1, 1, 0.94);
      // Schimmernde, lebendige Oberflaeche
      const puls = 0.95 + 0.05 * Math.sin((now || 0) * 0.002 + h.x);
      instanz('scheibe', h.x * DM, 0.15, h.y * DM, ((now || 0) * 0.0003) % 6.28, rM * 0.95, [0.18, 0.38, 0.48], 1, puls, 0.7);
    }
  }
  zeichneInstanzen(MODELLE.scheibe);
  gl.depthMask(true);

  // Felsen: zusammenhaengende Felsformationen
  for (const h of world.hindernisse) {
    if (h.art === 'fels') {
      const rot = ((h.x * 7 + h.y * 3) % 628) / 100;
      instanz('fels', h.x * DM, 0, h.y * DM, rot, h.r * DM, [1, 1, 1]);
    }
  }

  // Adern: Fron und Goetterblut
  for (const d of world.deposits) {
    const key = d.kind === 'goetterblut' ? 'blutAder' : 'fronAder';
    const s = d.kind === 'goetterblut' ? 9 : 6;
    instanz(key, d.x * DM, 0, d.y * DM, ((d.x + d.y) % 7) * 0.9, s, [1, 1, 1], 1, d.takenBy ? 0.55 : 1);
  }

  // Deko-Baeume
  for (const [x, z, s, r] of DEKO) instanz('baum', x, 0, z, r, s, [1, 1, 1]);
}
