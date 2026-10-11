// Gelaende der 3D-Ansicht: Boden, gerodete Flaechen, Seen, Fluesse, Felsen, Adern, Baeume.
// Gehoert zur Grafik (siehe GEMINI.md). Wird von tools/bundle.mjs mit den
// anderen Dateien zu einem Skript zusammengefuegt -- Bezeichner aus frueheren
// Dateien (gl, MAP, KARTE, ...) sind dort global. Exporte gibt es nur fuer die
// Tests unter Node.

function abstandZuSegment(px, pz, x1, z1, x2, z2) {
  const dx = x2 - x1, dz = z2 - z1;
  const l2 = dx * dx + dz * dz;
  if (l2 === 0) return Math.hypot(px - x1, pz - z1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (pz - z1) * dz) / l2));
  return Math.hypot(px - (x1 + t * dx), pz - (z1 + t * dz));
}

/**
 * Boden: Landschaftsraster mit naturnahen Farbverlaeufen -- Wiesen, feuchte
 * Uferstreifen an Seen und Fluessen, kiesige Furten, Felsauslaeufer und Wege.
 * Passt sich der in KARTE gewaehlten Karte an (Klassisch oder Flusstal).
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

  const istFlusstal = KARTE && (KARTE.schluessel === 'flusstal' || (KARTE.furten && KARTE.furten.length > 0));
  const hindernisse = (KARTE && KARTE.hindernisse) || [];
  const waldKreise = (KARTE && KARTE.wald) || [];
  const wiesenKreise = (KARTE && KARTE.wiesen) || [];
  const furten = (KARTE && KARTE.furten) || [];

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

      // Zonen der Karte: Wald & helle Wiesen
      if (waldKreise.length > 0) {
        // Waldzonen: dunkler, moosiger Waldboden
        let inWald = 0;
        for (const w of waldKreise) {
          const d = Math.hypot(wx - w.x * DM, wz - w.y * DM);
          const rW = w.r * DM;
          if (d < rW) inWald = Math.max(inWald, 1 - d / rW);
        }
        if (inWald > 0) {
          const wF = inWald * 0.7;
          r = r * (1 - wF) + 0.12 * wF;
          gr = gr * (1 - wF) + 0.21 * wF;
          b = b * (1 - wF) + 0.10 * wF;
        }
      }

      if (wiesenKreise.length > 0) {
        // Helle Wiesen: sonnige, gelbgruene Lichtungen
        let inWiese = 0;
        for (const w of wiesenKreise) {
          const d = Math.hypot(wx - w.x * DM, wz - w.y * DM);
          const rWi = w.r * DM;
          if (d < rWi) inWiese = Math.max(inWiese, 1 - d / rWi);
        }
        if (inWiese > 0) {
          const mF = inWiese * 0.6;
          r = r * (1 - mF) + 0.28 * mF;
          gr = gr * (1 - mF) + 0.39 * mF;
          b = b * (1 - mF) + 0.16 * mF;
        }
      }

      if (furten.length > 0) {
        // Kiesige Furten: heller Sand und Steine
        let inFurt = 0;
        for (const f of furten) {
          const d = Math.hypot(wx - f.x * DM, wz - f.y * DM);
          if (d < 60) inFurt = Math.max(inFurt, 1 - d / 60);
        }
        if (inFurt > 0) {
          const fF = inFurt * 0.85;
          r = r * (1 - fF) + 0.38 * fF;
          gr = gr * (1 - fF) + 0.33 * fF;
          b = b * (1 - fF) + 0.24 * fF;
        }
      }

      // Naehe zu Seen / Fluss: feuchter, dunkler Uferboden
      let dSee = 9999;
      for (const h of hindernisse) {
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

      // Naehe zu Felsen: Schotter, Geroell und trockener Boden
      let dFels = 9999;
      for (const h of hindernisse) {
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

      // Marschpfade je nach Karte
      let dPfad = 9999;
      if (istFlusstal) {
        // Auf Flusstal: Pfade fuehren von den Basen ueber die Furten
        const f1 = furten[0] ? [furten[0].x * DM, furten[0].y * DM] : [240, 1170];
        const f2 = furten[1] ? [furten[1].x * DM, furten[1].y * DM] : [1760, 830];
        const segs = [
          [[300, 300], [220, 680]], [[220, 680], f1], [f1, [550, 1480]], [[550, 1480], [1700, 1700]],
          [[300, 300], [680, 220]], [[680, 220], [1480, 550]], [[1480, 550], f2], [f2, [1780, 1320]], [[1780, 1320], [1700, 1700]]
        ];
        for (const [p1, p2] of segs) {
          const d = abstandZuSegment(wx, wz, p1[0], p1[1], p2[0], p2[1]);
          if (d < dPfad) dPfad = d;
        }
      } else {
        // Klassisch: gerade Marschachse zwischen den Basen
        dPfad = Math.abs(wx - wz) / Math.SQRT2;
      }

      const wegRausch = rauschen(i, j, 5, 8);
      const pfadBreite = istFlusstal ? 32 : 45;
      if (dPfad < pfadBreite + wegRausch * 12 && wx > 220 && wx < 1780 && wz > 220 && wz < 1780 && dSee > 2 && dFels > 2) {
        const uferFade = Math.min(1.0, (dSee - 2) / 25);
        const felsFade = Math.min(1.0, (dFels - 2) / 20);
        const wegFaktor = Math.max(0, 1 - dPfad / (pfadBreite + wegRausch * 12)) * 0.45 * uferFade * felsFade;
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

// Deko: Baeume und Schilf je nach Karte (wird nach Kartenwechsel von ui3d.js neu gerufen)
export let DEKO = [];
export let DEKO_SCHILF = [];

export function baueDeko() {
  DEKO.length = 0;
  DEKO_SCHILF.length = 0;
  let s = 12345;
  const r = () => ((s = (Math.imul(s, 1103515245) + 12345) | 0) >>> 8) / 16777216;

  const istFlusstal = KARTE && (KARTE.schluessel === 'flusstal' || (KARTE.wald && KARTE.wald.length > 0));
  const hindernisse = (KARTE && KARTE.hindernisse) || [];
  const waldKreise = (KARTE && KARTE.wald) || [];
  const furten = (KARTE && KARTE.furten) || [];

  function istImWeg(x, z, puffer = 12) {
    if (x < 40 || x > 1960 || z < 40 || z > 1960) return true;
    // Basen frei halten
    if (Math.hypot(x - 300, z - 300) < 320 || Math.hypot(x - 1700, z - 1700) < 320) return true;
    // Furten frei halten
    for (const f of furten) {
      if (Math.hypot(x - f.x * DM, z - f.y * DM) < 55) return true;
    }
    // Felsen und Wasser (Fluss & Seen) strikt meiden
    for (const h of hindernisse) {
      if (Math.hypot(x - h.x * DM, z - h.y * DM) < h.r * DM + puffer) return true;
    }
    return false;
  }

  // 1. Schilf an den Ufern von Seen und Fluessen
  for (const h of hindernisse) {
    if (h.art === 'see') {
      const cx = h.x * DM;
      const cz = h.y * DM;
      const cr = h.r * DM;
      const anzahl = h.fluss ? Math.floor(6 + r() * 5) : Math.floor(8 + r() * 6);

      for (let k = 0; k < anzahl; k++) {
        const wnk = (k / anzahl) * Math.PI * 2 + (r() - 0.5) * 0.45;
        const dist = cr * (0.95 + r() * 0.12);
        const px = cx + Math.cos(wnk) * dist;
        const pz = cz + Math.sin(wnk) * dist;

        if (px < 40 || px > 1960 || pz < 40 || pz > 1960) continue;
        if (Math.hypot(px - 300, pz - 300) < 310 || Math.hypot(px - 1700, pz - 1700) < 310) continue;

        let naheFurt = false;
        for (const f of furten) {
          if (Math.hypot(px - f.x * DM, pz - f.y * DM) < 52) {
            naheFurt = true;
            break;
          }
        }
        if (naheFurt) continue;

        let imTiefenWasser = false;
        for (const o of hindernisse) {
          if (o !== h && o.art === 'see') {
            if (Math.hypot(px - o.x * DM, pz - o.y * DM) < o.r * DM * 0.86) {
              imTiefenWasser = true;
              break;
            }
          }
        }
        if (imTiefenWasser) continue;

        let aufFels = false;
        for (const o of hindernisse) {
          if (o.art === 'fels' && Math.hypot(px - o.x * DM, pz - o.y * DM) < o.r * DM + 6) {
            aufFels = true;
            break;
          }
        }
        if (aufFels) continue;

        DEKO_SCHILF.push([px, pz, 1.1 + r() * 0.7, r() * 6.28]);
      }
    }
  }

  // 2. Baeume
  if (istFlusstal) {
    // Flusstal: Dichter Wald in den Wald-Zonen laut KARTE.wald
    for (const w of waldKreise) {
      const zx = w.x * DM;
      const zz = w.y * DM;
      const zr = w.r * DM;
      const anzahl = Math.floor(18 + r() * 12);
      for (let k = 0; k < anzahl; k++) {
        const dist = Math.sqrt(r()) * (zr * 0.9);
        const wnk = r() * Math.PI * 2;
        const x = zx + Math.cos(wnk) * dist;
        const z = zz + Math.sin(wnk) * dist;
        if (!istImWeg(x, z, 14)) {
          DEKO.push([x, z, 2.0 + r() * 2.8, r() * 6.28]);
        }
      }
    }
    // Vereinzelte Ufer- und Randbaeume (abseits der Wiesen)
    for (let k = 0; k < 80; k++) {
      const x = r() * MAP * DM;
      const z = r() * MAP * DM;
      // Nicht mitten auf den hellen Wiesen
      const aufWiese = (KARTE.wiesen || []).some((w) => Math.hypot(x - w.x * DM, z - w.y * DM) < w.r * DM * 0.7);
      if (!aufWiese && !istImWeg(x, z, 14)) {
        DEKO.push([x, z, 1.8 + r() * 2.4, r() * 6.28]);
      }
    }
  } else {
    // Klassische Karte: Waldschwerpunkte (Haine) an Flanken und Ecken
    const waldZentren = [
      [250, 1200], [300, 1550], [600, 1750], [900, 1800],
      [1200, 250], [1550, 300], [1750, 600], [1800, 900],
      [150, 800], [800, 150], [1850, 1400], [1400, 1850],
    ];

    for (let i = 0; i < 300; i++) {
      let x, z;
      if (i < 200) {
        const zentrum = waldZentren[i % waldZentren.length];
        const radius = 60 + r() * 160;
        const winkel = r() * Math.PI * 2;
        x = zentrum[0] + Math.cos(winkel) * radius;
        z = zentrum[1] + Math.sin(winkel) * radius;
      } else {
        x = r() * MAP * DM;
        z = r() * MAP * DM;
      }
      const nahAchse = Math.abs(x + z - 2000) < 320;
      if (!nahAchse && !istImWeg(x, z, 20)) {
        DEKO.push([x, z, 2.2 + r() * 2.6, r() * 6.28]);
      }
    }
  }
}

// Initial beim Modulstart initialisieren
baueDeko();

/** Boden und gerodete Flaechen -- vor Schatten und Domaenen gezeichnet. */
export function zeichneBoden(world) {
  if (bodenModell) {
    bodenModell.inst.push(0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0);
    zeichneInstanzen(bodenModell);
  }
  gl.depthMask(false);
  for (const c of world.cleared) instanz('scheibe', c.x * DM, 0.05, c.y * DM, 0, c.r * DM, [0.36, 0.3, 0.2], 1, 1, 0.32);
  zeichneInstanzen(MODELLE.scheibe);
  gl.depthMask(true);
}

/**
 * Seen, Fluesse, Furten, Felsen, Adern und Baeume -- nach den Domaenen, vor Gebaeuden
 * und Einheiten.
 */
export function zeichneGelaende(world, now) {
  gl.depthMask(false);

  const hindernisse = world.hindernisse || [];
  const zeit = (now || 0) * 0.001;

  // 1. Seen und Fluesse
  for (const h of hindernisse) {
    if (h.art === 'see') {
      const rM = h.r * DM;
      if (h.fluss) {
        // Flussbett: dunkler Kies- und Schlickgrund
        instanz('scheibe', h.x * DM, 0.08, h.y * DM, 0, rM * 1.02, [0.18, 0.22, 0.16], 1, 1, 0.95);
        if (MODELLE.wasser) {
          // Strömende Wasseroberfläche mit prozeduralen Wellen & Sonnenglanz
          instanz('wasser', h.x * DM, 0.13, h.y * DM, 0, rM * 0.98, [0.12, 0.32, 0.46], 1, 1, 0.94, zeit);
          // Versetzte Strömungskräuselung
          instanz('wasser', h.x * DM, 0.15, h.y * DM, (zeit * 0.25) % 6.28, rM * 0.94, [0.18, 0.42, 0.54], 1, 1, 0.78, zeit + 2.0);
        } else {
          instanz('scheibe', h.x * DM, 0.12, h.y * DM, 0, rM * 0.99, [0.10, 0.27, 0.40], 1, 1, 0.96);
          const puls = 0.94 + 0.06 * Math.sin(zeit * 3.0 + h.x * 0.05 + h.y * 0.05);
          instanz('scheibe', h.x * DM, 0.14, h.y * DM, (zeit * 1.0) % 6.28, rM * 0.93, [0.16, 0.36, 0.48], 1, puls, 0.72);
        }
      } else {
        // Standsee: Ufersaum (feuchter Sand/Schlick)
        instanz('scheibe', h.x * DM, 0.07, h.y * DM, 0, rM * 1.04, [0.26, 0.24, 0.18], 1, 1, 0.92);
        if (MODELLE.wasser) {
          // Tiefes Wasser mit sanften Wellen und Glanz
          instanz('wasser', h.x * DM, 0.12, h.y * DM, 0, rM * 0.98, [0.10, 0.28, 0.40], 1, 1, 0.94, zeit * 0.6);
          // Schimmernde Oberflaeche
          instanz('wasser', h.x * DM, 0.14, h.y * DM, (zeit * 0.08) % 6.28, rM * 0.95, [0.16, 0.38, 0.49], 1, 1, 0.75, zeit * 0.6 + 1.5);
        } else {
          instanz('scheibe', h.x * DM, 0.12, h.y * DM, 0, rM * 0.98, [0.11, 0.27, 0.39], 1, 1, 0.94);
          const puls = 0.95 + 0.05 * Math.sin(zeit * 2.0 + h.x);
          instanz('scheibe', h.x * DM, 0.15, h.y * DM, (zeit * 0.3) % 6.28, rM * 0.95, [0.18, 0.38, 0.48], 1, puls, 0.7);
        }
      }
    }
  }

  // 2. Furten: flache Kiesbaenke mit sanftem Uebertritt
  const furten = (KARTE && KARTE.furten) || [];
  for (const f of furten) {
    instanz('scheibe', f.x * DM, 0.09, f.y * DM, 0, 48, [0.44, 0.38, 0.28], 1, 1, 0.85);
  }

  zeichneInstanzen(MODELLE.scheibe);
  if (MODELLE.wasser) zeichneInstanzen(MODELLE.wasser);
  gl.depthMask(true);

  // 3. Felsen: kantige Felsformationen
  for (const h of hindernisse) {
    if (h.art === 'fels') {
      const rot = ((h.x * 7 + h.y * 3) % 628) / 100;
      instanz('fels', h.x * DM, 0, h.y * DM, rot, h.r * DM, [1, 1, 1]);
    }
  }

  // 4. Adern: Fron und Goetterblut
  for (const d of (world.deposits || [])) {
    const key = d.kind === 'goetterblut' ? 'blutAder' : 'fronAder';
    const s = d.kind === 'goetterblut' ? 9 : 6;
    instanz(key, d.x * DM, 0, d.y * DM, ((d.x + d.y) % 7) * 0.9, s, [1, 1, 1], 1, d.takenBy ? 0.55 : 1);
  }

  // 5. Deko-Baeume (aus gewaehlter Karte via baueDeko)
  for (const [x, z, s, r] of DEKO) instanz('baum', x, 0, z, r, s, [1, 1, 1]);

  // 6. Schilf an Ufern von Seen und Fluessen
  if (MODELLE.schilf) {
    for (const [x, z, s, r] of DEKO_SCHILF) {
      instanz('schilf', x, 0.05, z, r, s, [1, 1, 1]);
    }
    zeichneInstanzen(MODELLE.schilf);
  }
}

