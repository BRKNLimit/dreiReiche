// Gelaende der 2D-Ansicht: Boden, gerodete Flaechen, Felsen und Seen.
// Gehoert zur Grafik (siehe GEMINI.md). Wird von tools/bundle.mjs mit den
// anderen Dateien zu einem Skript zusammengefuegt -- Bezeichner aus frueheren
// Dateien (gl, MAP, KARTE, ...) sind dort global. Exporte gibt es nur fuer die
// Tests unter Node.
// Globale aus ui.js: ctx, cam, w2sx, w2sy, s2wx, s2wy, COL, world.

/**
 * Natuerlicher Boden der Karte: statt eines Rasternetzes zeigt die Draufsicht
 * eine zusammenhaengende Gelaendekarte mit Wiesen, Pfad und Kartenrahmen.
 * Passt sich der gespielten Karte an (Klassisch oder Flusstal mit Wald/Wiesen/Furten).
 */
export function drawGrid(W, H) {
  const x0 = w2sx(0);
  const y0 = w2sy(0);
  const sz = MAP * cam.z;

  // Sichtbarer Bereich der Karte
  if (x0 + sz < 0 || x0 > W || y0 + sz < 0 || y0 > H) return;

  ctx.save();

  // Kartenuntergrund: saftige Grund-Wiesenflaeche
  ctx.fillStyle = '#1c2819';
  ctx.fillRect(Math.max(0, x0), Math.max(0, y0), Math.min(W - x0, sz), Math.min(H - y0, sz));

  const istFlusstal = KARTE && (KARTE.schluessel === 'flusstal' || (KARTE.furten && KARTE.furten.length > 0));

  // Optische Zonen: Wald (dunkel, moosig) und Wiesen (heller, Blumenwiesen)
  const waldKreise = (KARTE && KARTE.wald) || [];
  const wiesenKreise = (KARTE && KARTE.wiesen) || [];

  // 1. Helle Blumenwiesen
  for (const w of wiesenKreise) {
    const sx = w2sx(w.x);
    const sy = w2sy(w.y);
    const r = w.r * cam.z;
    const grad = ctx.createRadialGradient(sx, sy, r * 0.15, sx, sy, r);
    grad.addColorStop(0, '#283e1c');
    grad.addColorStop(0.7, '#213318');
    grad.addColorStop(1, '#1c2819');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();

    // Zarte Wildblumen-Sprenkel bei genuegend Zoom
    if (cam.z > 0.035) {
      const sprenkel = [
        [0.2, 0.35, '#f5d742'], [-0.3, 0.45, '#ffffff'], [0.45, -0.2, '#f5d742'],
        [-0.25, -0.4, '#e0e7ff'], [0.12, -0.15, '#f5d742'], [-0.4, 0.15, '#ffffff'],
        [0.3, 0.1, '#fbcfe8'], [-0.15, 0.25, '#fde047'], [0.0, -0.35, '#ffffff']
      ];
      for (const [dx, dy, col] of sprenkel) {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(sx + dx * r * 0.8, sy + dy * r * 0.8, Math.max(1, 1.2 * cam.z * 15), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 2. Dichter Waldgrund (dunkles Nadel- und Moosgruen)
  for (const w of waldKreise) {
    const sx = w2sx(w.x);
    const sy = w2sy(w.y);
    const r = w.r * cam.z;
    const grad = ctx.createRadialGradient(sx, sy, r * 0.25, sx, sy, r);
    grad.addColorStop(0, '#111a0f');
    grad.addColorStop(0.75, '#152113');
    grad.addColorStop(1, '#1c2819');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Ausgetretener Marschpfad je nach Karte
  if (istFlusstal) {
    // Auf Flusstal: Pfad fuehrt von den Basen ueber die Furten
    const f1 = KARTE.furten?.[0] || { x: 2400, y: 11700 };
    const f2 = KARTE.furten?.[1] || { x: 17600, y: 8300 };

    const pfadZuege = [
      // Marschroute ueber Furt 1 (West/Sued)
      [[3000, 3000], [2200, 6800], [f1.x, f1.y], [5500, 14800], [17000, 17000]],
      // Marschroute ueber Furt 2 (Nord/Ost)
      [[3000, 3000], [6800, 2200], [14800, 5500], [f2.x, f2.y], [17800, 13200], [17000, 17000]],
    ];

    for (const z of pfadZuege) {
      // Breitere Schotterbettung
      ctx.beginPath();
      ctx.moveTo(w2sx(z[0][0]), w2sy(z[0][1]));
      for (let i = 1; i < z.length; i++) ctx.lineTo(w2sx(z[i][0]), w2sy(z[i][1]));
      ctx.strokeStyle = '#2b251a';
      ctx.lineWidth = Math.max(7, 360 * cam.z);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Feine Trampelspur
      ctx.beginPath();
      ctx.moveTo(w2sx(z[0][0]), w2sy(z[0][1]));
      for (let i = 1; i < z.length; i++) ctx.lineTo(w2sx(z[i][0]), w2sy(z[i][1]));
      ctx.strokeStyle = '#3a3222';
      ctx.lineWidth = Math.max(3, 170 * cam.z);
      ctx.stroke();
    }
  } else {
    // Klassische Karte: Diagonale zwischen den Basen mit natuerlicher Biegung
    ctx.beginPath();
    ctx.moveTo(w2sx(3000), w2sy(3000));
    ctx.quadraticCurveTo(w2sx(10000 + 400), w2sy(10000 - 400), w2sx(17000), w2sy(17000));
    ctx.strokeStyle = '#2b261b';
    ctx.lineWidth = Math.max(12, 500 * cam.z);
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(w2sx(3000), w2sy(3000));
    ctx.quadraticCurveTo(w2sx(10000 + 400), w2sy(10000 - 400), w2sx(17000), w2sy(17000));
    ctx.strokeStyle = '#383122';
    ctx.lineWidth = Math.max(5, 220 * cam.z);
    ctx.stroke();
  }

  // Edler Kartenrahmen mit doppelter Zierleiste
  ctx.strokeStyle = '#3e4a36';
  ctx.lineWidth = Math.max(2, 3 * cam.z);
  ctx.strokeRect(x0, y0, sz, sz);

  // Innere Rahmenkante
  ctx.strokeStyle = '#283322';
  ctx.lineWidth = 1;
  const randAbstand = Math.max(4, 150 * cam.z);
  ctx.strokeRect(x0 + randAbstand, y0 + randAbstand, sz - randAbstand * 2, sz - randAbstand * 2);

  ctx.restore();
}

/** Gerodete Flaechen: holzige Rodungsinseln mit organischem Rand. */
export function drawCleared() {
  ctx.save();
  ctx.fillStyle = COL.cleared || '#3a3225';
  for (const c of world.cleared) {
    const sx = w2sx(c.x);
    const sy = w2sy(c.y);
    const r = c.r * cam.z;
    ctx.beginPath();
    // Leicht gezackter Rand der Rodung
    const seg = 14;
    for (let i = 0; i < seg; i++) {
      const w = (i / seg) * Math.PI * 2;
      const d = r * (0.95 + 0.08 * Math.sin(i * 3 + c.x * 0.01));
      const px = sx + Math.cos(w) * d;
      const py = sy + Math.sin(w) * d;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Felsen, Seen und Fluesse: organische Formen statt reiner Kreise.
 * Der Fluss wird als zusammenhaengendes Band mit Stroemung und Furten gezeichnet.
 * Kanten weichen hoechstens etwa 8 % vom Kollisionskreis ab.
 */
export function drawHindernisse() {
  ctx.save();

  const hindernisse = world.hindernisse || [];

  // 1. Fluss: Flussteil-Kreise zu zusammenhaengenden Flussbaendern verbinden
  const flussKreise = hindernisse.filter((h) => h.art === 'see' && h.fluss);
  if (flussKreise.length > 0) {
    // Entlang des Flussverlaufs sortieren (x steigt von West nach Ost)
    const sortiert = flussKreise.slice().sort((a, b) => a.x - b.x);

    // In zusammenhaengende Abschnitte aufteilen (Luecken > 650 dm markieren Furten)
    const straenge = [];
    let aktuellerStrang = [sortiert[0]];
    for (let i = 1; i < sortiert.length; i++) {
      const pAlt = sortiert[i - 1];
      const pNeu = sortiert[i];
      const d = Math.hypot(pNeu.x - pAlt.x, pNeu.y - pAlt.y);
      if (d < 680) {
        aktuellerStrang.push(pNeu);
      } else {
        straenge.push(aktuellerStrang);
        aktuellerStrang = [pNeu];
      }
    }
    if (aktuellerStrang.length) straenge.push(aktuellerStrang);

    const rBasis = flussKreise[0].r || 300;
    const rP = rBasis * cam.z;

    // A. Feuchter Ufersaum (ca. 4% ueber dem Kollisionskreis)
    for (const strang of straenge) {
      if (strang.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(w2sx(strang[0].x), w2sy(strang[0].y));
      for (let i = 1; i < strang.length; i++) ctx.lineTo(w2sx(strang[i].x), w2sy(strang[i].y));
      ctx.strokeStyle = '#223824';
      ctx.lineWidth = rP * 2 * 1.05;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }

    // B. Flussbett & Hauptwasser
    for (const strang of straenge) {
      if (strang.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(w2sx(strang[0].x), w2sy(strang[0].y));
      for (let i = 1; i < strang.length; i++) ctx.lineTo(w2sx(strang[i].x), w2sy(strang[i].y));
      ctx.strokeStyle = '#163a50';
      ctx.lineWidth = rP * 2 * 0.98;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }

    // C. Tiefe Stroemungsrinne
    for (const strang of straenge) {
      if (strang.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(w2sx(strang[0].x), w2sy(strang[0].y));
      for (let i = 1; i < strang.length; i++) ctx.lineTo(w2sx(strang[i].x), w2sy(strang[i].y));
      ctx.strokeStyle = '#0f2636';
      ctx.lineWidth = rP * 2 * 0.58;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }

    // D. Stroemungswellen / Schaumkanten entlang des Flusses
    for (const strang of straenge) {
      if (strang.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(w2sx(strang[0].x), w2sy(strang[0].y));
      for (let i = 1; i < strang.length; i++) ctx.lineTo(w2sx(strang[i].x), w2sy(strang[i].y));
      ctx.strokeStyle = '#286284';
      ctx.lineWidth = Math.max(1.2, 2.4 * cam.z);
      ctx.lineCap = 'round';
      ctx.setLineDash([Math.max(6, 160 * cam.z), Math.max(10, 240 * cam.z)]);
      ctx.lineDashOffset = -(((Date.now?.() || 0) * 0.06) % 100);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // E. Furten als flache, kiesige Uebergaenge mit Trittsteinen
    const furten = (KARTE && KARTE.furten) || [];
    for (const f of furten) {
      const fx = w2sx(f.x);
      const fy = w2sy(f.y);
      const rf = 480 * cam.z;

      // Helle Kiesbank
      ctx.beginPath();
      ctx.ellipse(fx, fy, rf * 1.1, rf * 0.75, Math.PI / 4, 0, Math.PI * 2);
      ctx.fillStyle = '#5c4f39';
      ctx.fill();
      ctx.strokeStyle = '#78684d';
      ctx.lineWidth = Math.max(1, 1.5 * cam.z);
      ctx.stroke();

      // Trittsteine und Geroell
      const steine = [[-0.4, -0.2], [0.35, 0.25], [-0.1, 0.3], [0.1, -0.3], [-0.2, 0.05], [0.2, -0.05]];
      for (const [dx, dy] of steine) {
        ctx.beginPath();
        ctx.arc(fx + dx * rf, fy + dy * rf, Math.max(1.5, 3.5 * cam.z), 0, Math.PI * 2);
        ctx.fillStyle = '#8a795f';
        ctx.fill();
      }
    }
  }

  // 2. Standgewaesser / Seen (nicht Fluss)
  for (const h of hindernisse) {
    if (h.art !== 'see' || h.fluss) continue;
    const sx = w2sx(h.x);
    const sy = w2sy(h.y);
    const r = h.r * cam.z;
    const seed = (h.x * 13 + h.y * 37) % 100;

    // Sand-/Schilf-Ufersaum (ca. 4% ueber dem Kreis)
    ctx.beginPath();
    const segUfer = 24;
    for (let i = 0; i < segUfer; i++) {
      const w = (i / segUfer) * Math.PI * 2;
      const dr = r * (1.02 + 0.05 * Math.sin(w * 5 + seed) + 0.03 * Math.cos(w * 3 + seed));
      const px = sx + Math.cos(w) * dr;
      const py = sy + Math.sin(w) * dr;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = '#263b27';
    ctx.fill();

    // Wasseroberflaeche
    ctx.beginPath();
    for (let i = 0; i < segUfer; i++) {
      const w = (i / segUfer) * Math.PI * 2;
      const dr = r * (0.97 + 0.05 * Math.sin(w * 5 + seed) + 0.03 * Math.cos(w * 3 + seed));
      const px = sx + Math.cos(w) * dr;
      const py = sy + Math.sin(w) * dr;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = '#17364a';
    ctx.fill();
    ctx.strokeStyle = '#295570';
    ctx.lineWidth = Math.max(1, 1.8 * cam.z);
    ctx.stroke();

    // Tiefenkern
    ctx.beginPath();
    ctx.arc(sx, sy, r * 0.65, 0, Math.PI * 2);
    ctx.fillStyle = '#0f2433';
    ctx.fill();
  }

  // 3. Felsen: kantige, polygonale Felsformationen mit Schattierung
  for (const h of hindernisse) {
    if (h.art !== 'fels') continue;
    const sx = w2sx(h.x);
    const sy = w2sy(h.y);
    const r = h.r * cam.z;
    const seed = (h.x * 19 + h.y * 31) % 100;

    // Kantiger Felskoerper (maximal +-7% Abweichung vom Kreis)
    const ecken = 10;
    const punkte = [];
    for (let i = 0; i < ecken; i++) {
      const w = (i / ecken) * Math.PI * 2;
      const radVar = 0.95 + 0.06 * Math.sin(i * 4 + seed) + 0.04 * Math.cos(i * 2 + seed);
      punkte.push([sx + Math.cos(w) * r * radVar, sy + Math.sin(w) * r * radVar]);
    }

    // Felsgrund
    ctx.beginPath();
    ctx.moveTo(punkte[0][0], punkte[0][1]);
    for (let i = 1; i < ecken; i++) ctx.lineTo(punkte[i][0], punkte[i][1]);
    ctx.closePath();
    ctx.fillStyle = '#3a3d36';
    ctx.fill();
    ctx.strokeStyle = '#52574d';
    ctx.lineWidth = Math.max(1.5, 2 * cam.z);
    ctx.stroke();

    // Felsgrate / Facetten innen zeichnen
    ctx.beginPath();
    ctx.moveTo(punkte[0][0], punkte[0][1]);
    ctx.lineTo(sx + r * 0.15, sy - r * 0.1);
    ctx.lineTo(punkte[4][0], punkte[4][1]);
    ctx.moveTo(sx + r * 0.15, sy - r * 0.1);
    ctx.lineTo(punkte[7][0], punkte[7][1]);
    ctx.strokeStyle = '#282b25';
    ctx.lineWidth = Math.max(1, 1.2 * cam.z);
    ctx.stroke();

    // Sonnenkante (Licht von oben links)
    ctx.beginPath();
    ctx.arc(sx - r * 0.2, sy - r * 0.2, r * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = '#4c5247';
    ctx.fill();
  }

  ctx.restore();
}
