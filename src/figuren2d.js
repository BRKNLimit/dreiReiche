// Figuren der 2D-Draufsicht: Einheiten und Gebaeude. Gehoert Gemini (siehe
// GEMINI.md). src/ui.js ruft beide Funktionen fuer jede sichtbare Entity auf;
// liefern sie false, zeichnet ui.js die einfache Form (Dreieck, Quadrat).
// Gezeichnet wird nur der Koerper -- Lebensbalken, Auswahl, Baulinien,
// Warnungen macht ui.js darueber.
//
//   ctx    CanvasRenderingContext2D (Bildschirm-Pixel)
//   e      die Entity (lesen, nie aendern): e.type, e.player, e.hp, e.maxHp,
//          e.done (Gebaeude fertig?), e.progress, e.powered (0..1000)
//   def    UNITS[e.type] bzw. BUILDINGS[e.type]
//   x, y   Mitte auf dem Schirm; r Radius in Pixeln (schon mit Zoom)
//   farbe  Volksfarbe als '#rrggbb' (Menschen gold, Gott gruen)
//   zoom   Pixel je Dezimeter (cam.z); zeit: performance.now() in ms

/** Einheit zeichnen; true, wenn gezeichnet. */
export function zeichneEinheit2d(ctx, e, def, x, y, r, farbe, zoom, zeit) {
  return false;
}

/** Gebaeude zeichnen; true, wenn gezeichnet. */
export function zeichneGebaeude2d(ctx, e, def, x, y, r, farbe, zoom, zeit) {
  return false;
}
