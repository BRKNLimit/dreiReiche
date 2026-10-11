// Gelaende der 2D-Ansicht: Boden, gerodete Flaechen, Felsen und Seen.
// Gehoert zur Grafik (siehe GEMINI.md). Wird von tools/bundle.mjs mit den
// anderen Dateien zu einem Skript zusammengefuegt -- Bezeichner aus frueheren
// Dateien (gl, MAP, KARTE, ...) sind dort global. Exporte gibt es nur fuer die
// Tests unter Node.
// Globale aus ui.js: ctx, cam, w2sx, w2sy, s2wx, s2wy, COL, world.

/**
 * Natuerlicher Boden der Karte: statt eines Rasternetzes zeigt die Draufsicht
 * eine zusammenhaengende Gelaendekarte mit Wiesen, Pfad und Kartenrahmen.
 */
export function drawGrid(W, H) {
  const x0 = w2sx(0);
  const y0 = w2sy(0);
  const sz = MAP * cam.z;

  // Sichtbarer Bereich der Karte
  if (x0 + sz < 0 || x0 > W || y0 + sz < 0 || y0 > H) return;

  ctx.save();

  // Kartenuntergrund: saftige Wiesenflaeche
  ctx.fillStyle = '#1c2819';
  ctx.fillRect(Math.max(0, x0), Math.max(0, y0), Math.min(W - x0, sz), Math.min(H - y0, sz));

  // Ausgetretener Marschpfad zwischen den beiden Basen (Diagonale)
  ctx.beginPath();
  ctx.moveTo(w2sx(3000), w2sy(3000));
  ctx.quadraticCurveTo(w2sx(10000 + 400), w2sy(10000 - 400), w2sx(17000), w2sy(17000));
  ctx.strokeStyle = '#2b261b';
  ctx.lineWidth = Math.max(12, 500 * cam.z);
  ctx.lineCap = 'round';
  ctx.stroke();

  // Schmalere Wegspur
  ctx.beginPath();
  ctx.moveTo(w2sx(3000), w2sy(3000));
  ctx.quadraticCurveTo(w2sx(10000 + 400), w2sy(10000 - 400), w2sx(17000), w2sy(17000));
  ctx.strokeStyle = '#383122';
  ctx.lineWidth = Math.max(5, 220 * cam.z);
  ctx.stroke();

  // Edler Kartenrahmen mit Eckverzierungen statt Rasternetz
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
 * Felsen und Seen: organische Formen statt reiner Kreise.
 * Die Kanten weichen hoechstens etwa 8 % vom Kollisionskreis ab.
 */
export function drawHindernisse() {
  ctx.save();

  // 1. Seen: Ufersaum, tiefes Wasser und Uferlinie
  for (const h of world.hindernisse) {
    if (h.art !== 'see') continue;
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

  // 2. Felsen: kantige, polygonale Felsformationen mit Schattierung
  for (const h of world.hindernisse) {
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
