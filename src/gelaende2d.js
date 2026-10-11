// Gelaende der 2D-Ansicht: Boden, gerodete Flaechen, Felsen und Seen.
// Gehoert zur Grafik (siehe GEMINI.md). Wird von tools/bundle.mjs mit den
// anderen Dateien zu einem Skript zusammengefuegt -- Bezeichner aus frueheren
// Dateien (gl, MAP, KARTE, ...) sind dort global. Exporte gibt es nur fuer die
// Tests unter Node.
// Globale aus ui.js: ctx, cam, w2sx, w2sy, s2wx, s2wy, COL, world.

export function drawGrid(W, H) {
  const s = 2000;
  ctx.strokeStyle = COL.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = Math.floor(s2wx(0) / s) * s; x < s2wx(W) + s; x += s) {
    const sx = Math.round(w2sx(x)) + 0.5;
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, H);
  }
  for (let y = Math.floor(s2wy(0) / s) * s; y < s2wy(H) + s; y += s) {
    const sy = Math.round(w2sy(y)) + 0.5;
    ctx.moveTo(0, sy);
    ctx.lineTo(W, sy);
  }
  ctx.stroke();
  ctx.strokeStyle = '#2a3022';
  ctx.lineWidth = 2;
  ctx.strokeRect(w2sx(0), w2sy(0), MAP * cam.z, MAP * cam.z);
}

export function drawCleared() {
  ctx.fillStyle = COL.cleared;
  for (const c of world.cleared) {
    ctx.beginPath();
    ctx.arc(w2sx(c.x), w2sy(c.y), c.r * cam.z, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Felsen und Seen: unpassierbar, nicht bebaubar. */
export function drawHindernisse() {
  for (const h of world.hindernisse) {
    ctx.fillStyle = h.art === 'see' ? '#1d3a4d' : '#34352d';
    ctx.strokeStyle = h.art === 'see' ? '#2c5670' : '#4c4e42';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(w2sx(h.x), w2sy(h.y), h.r * cam.z, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}
