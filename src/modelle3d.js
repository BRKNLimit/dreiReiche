// Modelle der 3D-Ansicht: jede Einheit, jedes Gebaeude, Karte und Effekte.
// Gehoert zur Grafik (siehe GEMINI.md). Wird von tools/bundle.mjs mit den
// anderen Dateien zu einem Skript zusammengefuegt -- Bezeichner aus frueheren
// Dateien (gl, MAP, KARTE, ...) sind dort global. Exporte gibt es nur fuer die
// Tests unter Node.
//
// Ein Modell ist eine Liste von Teilen: [form, masse, position, farbe, team, drehung]
//   form   'q' Quader [breite, hoehe, tiefe] | 'z' Zylinder/Kegel [rOben, rUnten,
//          hoehe, segmente] | 'k' Kugel [radius, segmente] | 's' Scheibe [radius, segmente]
//   position [x, y, z] der Teilmitte; y ist oben, das Modell schaut entlang +z
//   farbe  '#rrggbb'
//   team   0..1 Anteil der Fraktionsfarbe; GLUEHT (2) = leuchtet selbst
//   drehung [rx, ry, rz] in Bogenmass um die Teilmitte
// Massstab: 1 entspricht dem Radius der Einheit bzw. des Gebaeudes (die
// Ansicht vergroessert Einheiten um ZEIGE_EINHEIT, Gebaeude um ZEIGE_GEBAEUDE).

// Alle Modelle auf Grundflaechen-Radius 1, Boden bei y = 0; gezeichnet mit
// Massstab = Radius der Einheit bzw. des Gebaeudes in Metern.
const HAUT = '#d9b38c';
const HOLZ = '#6b4a2b';
const STEIN = '#8a8f86';
const EISEN = '#a7adb3';
const LAUB = '#3f7a35';
const LAUB2 = '#5c9a43';
const BLUT = '#a86fb5';
export const GLUEHT = 2; // als Teamanteil: Teil leuchtet selbst (siehe Shader)
const MANTEL = '#17130f';
const MANTEL2 = '#211a14';
const GOLD = '#f5b23c';
const GOLD2 = '#ffd36a';

/** Lange Klauenfinger einer Hand, von der Handflaeche aus nach unten. */
function klauen(x, y, z, seite) {
  const t = [];
  for (let i = 0; i < 4; i++) {
    const dx = x + seite * (i - 1.5) * 0.075;
    const laenge = 0.62 - Math.abs(i - 1.5) * 0.08;
    t.push(['q', [0.035, laenge, 0.035], [dx, y - laenge / 2, z + 0.04 * i], GOLD2, GLUEHT, [0.25, 0, seite * (i - 1.5) * 0.06]]);
  }
  // Daumen
  t.push(['q', [0.035, 0.32, 0.035], [x - seite * 0.17, y - 0.08, z + 0.05], GOLD2, GLUEHT, [0.4, 0, -seite * 0.7]]);
  return t;
}

/** Zerfaserter Saum: Spitzen, die nach unten zeigen, rund um den Mantel. */
function saum(r, y, n) {
  const t = [];
  for (let i = 0; i < n; i++) {
    const w = (i / n) * Math.PI * 2;
    const lang = 0.45 + ((i * 37) % 5) * 0.08;
    t.push(['z', [0.16, 0, lang, 4], [Math.cos(w) * r, y - lang / 2, Math.sin(w) * r], i % 2 ? MANTEL : MANTEL2, 0.05]);
  }
  return t;
}

export const MODELLE_DEF = {
  // ------------------------------------------------------------- Menschen
  bauer: [
    ['z', [0.45, 0.55, 1.1, 7], [0, 0.55, 0], '#8a6a3a', 0.6],
    ['k', [0.32, 7], [0, 1.4, 0], HAUT],
    ['z', [0, 0.6, 0.3, 8], [0, 1.72, 0], '#d8c26a'],
    ['q', [0.08, 1.8, 0.08], [0.5, 0.9, 0.2], HOLZ, 0, [0.15, 0, 0]],
  ],
  soldat: [
    ['z', [0.45, 0.55, 1.2, 7], [0, 0.6, 0], '#555555', 0.8],
    ['k', [0.32, 7], [0, 1.5, 0], HAUT],
    ['k', [0.34, 7], [0, 1.62, 0], EISEN],
    ['q', [0.07, 2.4, 0.07], [0.55, 1.2, 0.15], HOLZ],
    ['z', [0, 0.12, 0.3, 4], [0.55, 2.5, 0.15], EISEN],
    ['q', [0.12, 0.8, 0.6], [-0.55, 0.9, 0.1], '#555555', 0.9],
  ],
  jaeger: [
    ['z', [0.4, 0.5, 1.15, 7], [0, 0.58, 0], '#3d5a2a', 0.5],
    ['k', [0.3, 7], [0, 1.45, 0], HAUT],
    ['z', [0, 0.38, 0.5, 7], [0, 1.75, 0], '#2f4a22', 0.4],
    ['q', [0.06, 1.6, 0.12], [0.5, 1.1, 0.25], HOLZ, 0, [0, 0, 0.12]],
  ],
  soeldner: [
    ['q', [1.1, 1.3, 0.8], [0, 0.75, 0], '#444444', 0.75],
    ['k', [0.33, 7], [0, 1.65, 0], HAUT],
    ['z', [0.36, 0.36, 0.3, 8], [0, 1.85, 0], EISEN],
    ['q', [0.14, 1.6, 0.14], [0.7, 1.1, 0.3], EISEN, 0, [0.5, 0, 0]],
    ['q', [1.2, 0.3, 0.9], [0, 1.35, 0], EISEN],
  ],
  held: [
    ['z', [0.5, 0.65, 1.5, 8], [0, 0.75, 0], '#3a3a3a', 0.8],
    ['q', [1.0, 1.4, 0.12], [0, 0.95, -0.5], '#8c1f1f', 0.3],
    ['k', [0.36, 8], [0, 1.85, 0], HAUT],
    ['z', [0.3, 0.38, 0.3, 6], [0, 2.2, 0], '#d8b06a'],
    ['q', [0.12, 2.0, 0.12], [0.75, 1.3, 0.3], EISEN, 0, [0.3, 0, 0]],
    ['q', [1.4, 0.25, 0.7], [0, 1.6, 0], EISEN, 0.4],
  ],
  // ------------------------------------------------------------- Gott
  dryade: [
    ['z', [0.15, 0.6, 1.5, 8], [0, 0.75, 0], '#6fa35a', 0.5],
    ['k', [0.3, 7], [0, 1.7, 0], '#c9d99a'],
    ['k', [0.48, 7], [0, 1.85, -0.1], LAUB2, 0.4],
  ],
  wolf: [
    ['q', [0.7, 0.7, 1.6], [0, 0.85, 0], '#6d6f6a', 0.35],
    ['q', [0.5, 0.5, 0.6], [0, 1.15, 1.0], '#6d6f6a', 0.35],
    ['q', [0.25, 0.25, 0.4], [0, 1.05, 1.4], '#4a4b48'],
    ['z', [0, 0.12, 0.3, 4], [0.15, 1.5, 0.9], '#4a4b48'],
    ['z', [0, 0.12, 0.3, 4], [-0.15, 1.5, 0.9], '#4a4b48'],
    ['q', [0.15, 0.6, 0.15], [0.22, 0.3, 0.55], '#4a4b48'],
    ['q', [0.15, 0.6, 0.15], [-0.22, 0.3, 0.55], '#4a4b48'],
    ['q', [0.15, 0.6, 0.15], [0.22, 0.3, -0.55], '#4a4b48'],
    ['q', [0.15, 0.6, 0.15], [-0.22, 0.3, -0.55], '#4a4b48'],
    ['q', [0.15, 0.15, 0.7], [0, 1.0, -1.0], '#6d6f6a', 0, [0.6, 0, 0]],
  ],
  waldgeist: [
    ['k', [0.6, 8], [0, 1.4, 0], '#bfe8b0', 0.3],
    ['k', [0.25, 6], [0.6, 1.9, 0.2], '#e2f7d4', GLUEHT],
    ['k', [0.2, 6], [-0.55, 1.0, -0.2], '#e2f7d4', GLUEHT],
    ['z', [0.35, 0, 0.9, 7], [0, 0.6, 0], '#9ccf8a', 0.3],
  ],
  ent: [
    ['z', [0.45, 0.6, 2.2, 7], [0, 1.1, 0], HOLZ],
    ['k', [0.95, 7], [0, 2.6, 0], LAUB, 0.25],
    ['k', [0.6, 6], [0.5, 3.1, 0.2], LAUB2, 0.25],
    ['q', [0.25, 1.4, 0.25], [0.7, 1.6, 0], HOLZ, 0, [0, 0, -0.7]],
    ['q', [0.25, 1.4, 0.25], [-0.7, 1.6, 0], HOLZ, 0, [0, 0, 0.7]],
    ['q', [0.3, 0.5, 0.5], [0.3, 0.25, 0], HOLZ],
    ['q', [0.3, 0.5, 0.5], [-0.3, 0.25, 0], HOLZ],
  ],
  // Nach der Vorlage des Nutzers: dunkler Riese im Mantel, ohne Fuesse.
  waldgott: [
    // Mantel: unten weit, oben schmal, schwebt knapp ueber dem Boden
    ['z', [0.5, 0.95, 3.0, 9], [0, 1.85, 0], MANTEL, 0.08],
    ['z', [0.62, 0.5, 0.7, 9], [0, 3.2, -0.02], MANTEL2, 0.05],
    ...saum(0.88, 0.38, 14),
    // Haengende Aermel, bis zur Huefte
    ['z', [0.2, 0.34, 1.9, 6], [0.72, 2.45, 0.05], MANTEL2, 0.05, [0, 0, 0.16]],
    ['z', [0.2, 0.34, 1.9, 6], [-0.72, 2.45, 0.05], MANTEL2, 0.05, [0, 0, -0.16]],
    // Hoher Kragen zu beiden Seiten des Kopfes
    ['q', [0.32, 0.85, 0.1], [0.4, 3.75, -0.05], MANTEL, 0.05, [0, 0.35, -0.22]],
    ['q', [0.32, 0.85, 0.1], [-0.4, 3.75, -0.05], MANTEL, 0.05, [0, -0.35, 0.22]],
    ['q', [0.75, 0.7, 0.1], [0, 3.7, -0.3], MANTEL2, 0.05],
    // Kopf: schwarz, gluehende Augen
    ['k', [0.26, 8], [0, 3.95, 0.05], '#0b0908'],
    ['k', [0.055, 5], [0.085, 3.98, 0.29], '#ffd23a', GLUEHT],
    ['k', [0.055, 5], [-0.085, 3.98, 0.29], '#ffd23a', GLUEHT],
    // Geweih: zwei Hauptstangen mit Enden
    ['q', [0.07, 0.95, 0.07], [0.3, 4.48, 0], '#3a3028', 0, [0, 0, -0.55]],
    ['q', [0.07, 0.95, 0.07], [-0.3, 4.48, 0], '#3a3028', 0, [0, 0, 0.55]],
    ['q', [0.05, 0.6, 0.05], [0.62, 4.95, 0], '#3a3028', 0, [0, 0, -0.15]],
    ['q', [0.05, 0.6, 0.05], [-0.62, 4.95, 0], '#3a3028', 0, [0, 0, 0.15]],
    ['q', [0.045, 0.45, 0.045], [0.34, 4.95, 0.02], '#3a3028', 0, [0, 0, 0.35]],
    ['q', [0.045, 0.45, 0.045], [-0.34, 4.95, 0.02], '#3a3028', 0, [0, 0, -0.35]],
    ['q', [0.045, 0.45, 0.045], [0.82, 4.68, 0], '#3a3028', 0, [0, 0, -1.15]],
    ['q', [0.045, 0.45, 0.045], [-0.82, 4.68, 0], '#3a3028', 0, [0, 0, 1.15]],
    ['q', [0.04, 0.35, 0.04], [0.15, 4.62, 0.05], '#3a3028', 0, [0, 0, 0.5]],
    ['q', [0.04, 0.35, 0.04], [-0.15, 4.62, 0.05], '#3a3028', 0, [0, 0, -0.5]],
    // Gluehende Unterarme und Haende, vor dem Mantel gekreuzt
    ['z', [0.07, 0.1, 0.62, 5], [0.42, 2.6, 0.45], GOLD, GLUEHT, [1.0, 0, 0.55]],
    ['q', [0.26, 0.1, 0.3], [0.2, 2.42, 0.66], GOLD, GLUEHT, [0.35, 0, 0.3]],
    ...klauen(0.2, 2.36, 0.68, 1),
    ['z', [0.07, 0.1, 0.62, 5], [-0.44, 2.2, 0.42], GOLD, GLUEHT, [1.1, 0, -0.5]],
    ['q', [0.26, 0.1, 0.3], [-0.22, 2.0, 0.62], GOLD, GLUEHT, [0.4, 0, -0.3]],
    ...klauen(-0.22, 1.94, 0.64, -1),
  ],

  // ------------------------------------------------------------- Gebaeude Menschen
  halle: [
    ['q', [1.6, 0.8, 1.1], [0, 0.4, 0], '#7a5a3a'],
    ['z', [0, 1.0, 0.6, 4], [0, 1.1, 0], '#8c2f2f', 0.6, [0, Math.PI / 4, 0]],
    ['q', [0.25, 0.35, 0.05], [0, 0.18, 0.56], '#2a1d12'],
    ['q', [0.05, 0.9, 0.05], [0.7, 1.0, 0.4], HOLZ],
    ['q', [0.35, 0.22, 0.03], [0.88, 1.3, 0.4], '#d8b06a', 0.8],
  ],
  grenzstein: [
    ['z', [0.45, 0.6, 0.25, 6], [0, 0.12, 0], '#6d726a'],
    ['q', [0.5, 1.9, 0.35], [0, 1.15, 0], STEIN],
    ['z', [0, 0.3, 0.3, 4], [0, 2.25, 0], STEIN, 0, [0, Math.PI / 4, 0]],
    ['q', [0.05, 1.1, 0.05], [0.32, 2.3, 0], HOLZ],
    ['q', [0.5, 0.3, 0.03], [0.58, 2.65, 0], '#8c2f2f', 0.8],
  ],
  wachturm: [
    ['z', [0.55, 0.7, 2.6, 8], [0, 1.3, 0], STEIN],
    ['z', [0.78, 0.78, 0.25, 8], [0, 2.72, 0], '#6d726a'],
    ['q', [0.18, 0.3, 0.18], [0.62, 3.0, 0], STEIN],
    ['q', [0.18, 0.3, 0.18], [-0.62, 3.0, 0], STEIN],
    ['q', [0.18, 0.3, 0.18], [0, 3.0, 0.62], STEIN],
    ['q', [0.18, 0.3, 0.18], [0, 3.0, -0.62], STEIN],
    ['k', [0.2, 6], [0, 3.05, 0], '#d8c8a0', 0.6],
  ],
  schmiede: [
    ['q', [1.4, 0.8, 1.2], [0, 0.4, 0], '#6a5a4a'],
    ['z', [0.2, 0.25, 1.1, 6], [0.5, 1.2, -0.3], STEIN],
    ['k', [0.18, 6], [0.5, 1.8, -0.3], '#ff9a3a', GLUEHT],
    ['q', [1.5, 0.12, 1.3], [0, 0.85, 0], '#5a4030', 0.5],
  ],
  saege: [
    ['q', [1.4, 0.6, 1.0], [0, 0.3, 0], '#7a5a3a'],
    ['z', [0.2, 0.2, 1.6, 7], [0, 0.85, 0], '#8a6a3a', 0, [0, 0, Math.PI / 2]],
    ['z', [0.2, 0.2, 1.6, 7], [0, 0.85, 0.45], '#8a6a3a', 0, [0, 0, Math.PI / 2]],
    ['q', [1.5, 0.1, 1.1], [0, 0.65, 0], '#5a4030', 0.5],
  ],
  kaserne: [
    ['q', [1.8, 0.7, 1.0], [0, 0.35, 0], '#6a5a4a'],
    ['z', [0, 0.9, 0.5, 4], [0, 0.95, 0], '#8c2f2f', 0.6, [0, Math.PI / 4, 0]],
    ['q', [0.06, 1.6, 0.06], [0.8, 0.8, 0.5], HOLZ],
    ['q', [0.45, 0.3, 0.03], [1.03, 1.45, 0.5], '#d8b06a', 0.9],
  ],
  schacht: [
    ['q', [1.1, 0.25, 1.1], [0, 0.12, 0], STEIN],
    ['q', [0.12, 1.4, 0.12], [0.45, 0.7, 0.45], HOLZ],
    ['q', [0.12, 1.4, 0.12], [-0.45, 0.7, -0.45], HOLZ],
    ['q', [1.3, 0.12, 0.12], [0, 1.4, 0], HOLZ, 0, [0, Math.PI / 4, 0]],
    ['z', [0, 0.35, 0.8, 5], [0, 0.65, 0], BLUT],
  ],
  banner: [
    ['q', [0.1, 2.6, 0.1], [0, 1.3, 0], HOLZ],
    ['q', [0.9, 0.6, 0.04], [0.47, 2.25, 0], '#d8b06a', 0.9],
    ['z', [0.35, 0.45, 0.25, 6], [0, 0.12, 0], STEIN],
  ],
  kapelle: [
    ['q', [1.0, 0.8, 1.4], [0, 0.4, 0], '#d6d0c0'],
    ['z', [0, 0.85, 0.5, 4], [0, 1.05, 0], '#5a4a6a', 0.5, [0, Math.PI / 4, 0]],
    ['q', [0.35, 0.9, 0.35], [0, 1.1, 0.55], '#d6d0c0'],
    ['z', [0, 0.3, 0.5, 4], [0, 1.8, 0.55], '#5a4a6a', 0.5],
  ],
  // Skriptorium: Steinhaus mit Lesepult-Fenster und leuchtender Kerze
  skriptorium: [
    ['q', [1.3, 0.9, 1.0], [0, 0.45, 0], '#c8bea8'],
    ['z', [0, 0.95, 0.55, 4], [0, 1.18, 0], '#5a4a3a', 0.4, [0, Math.PI / 4, 0]],
    ['z', [0.25, 0.28, 1.4, 6], [0.55, 0.9, -0.3], '#c8bea8'],
    ['z', [0, 0.32, 0.4, 6], [0.55, 1.8, -0.3], '#5a4a3a', 0.4],
    ['q', [0.35, 0.3, 0.04], [-0.2, 0.55, 0.51], '#3a2a1a'],
    ['k', [0.07, 5], [-0.2, 0.6, 0.55], '#ffd36a', GLUEHT],
  ],
  // ------------------------------------------------------------- Gebaeude Gott
  herzbaum: [
    ['z', [0.35, 0.55, 2.2, 8], [0, 1.1, 0], HOLZ],
    ['k', [1.2, 8], [0, 2.8, 0], LAUB, 0.25],
    ['k', [0.8, 7], [0.7, 2.4, 0.3], LAUB2, 0.25],
    ['k', [0.8, 7], [-0.6, 2.5, -0.4], LAUB2, 0.25],
    ['z', [0.1, 0.25, 0.6, 5], [0.45, 0.2, 0], HOLZ, 0, [0, 0, -0.9]],
    ['z', [0.1, 0.25, 0.6, 5], [-0.45, 0.2, 0], HOLZ, 0, [0, 0, 0.9]],
  ],
  hain: [
    ['z', [0.1, 0.14, 0.8, 5], [0.35, 0.4, 0], HOLZ],
    ['z', [0, 0.45, 1.2, 6], [0.35, 1.2, 0], LAUB, 0.3],
    ['z', [0.1, 0.14, 0.6, 5], [-0.35, 0.3, 0.25], HOLZ],
    ['z', [0, 0.38, 1.0, 6], [-0.35, 0.95, 0.25], LAUB2, 0.3],
    ['z', [0.1, 0.14, 0.7, 5], [0, 0.35, -0.4], HOLZ],
    ['z', [0, 0.4, 1.1, 6], [0, 1.05, -0.4], LAUB, 0.3],
  ],
  // Waechterbaum: knorriger dunkler Stamm, Dornenkrone, gluehende Augen
  waechterbaum: [
    ['z', [0.25, 0.45, 2.2, 6], [0, 1.1, 0], '#2a2018'],
    ['z', [0, 0.12, 0.9, 4], [0.35, 2.2, 0], '#2a2018', 0, [0, 0, -0.6]],
    ['z', [0, 0.12, 0.9, 4], [-0.35, 2.2, 0], '#2a2018', 0, [0, 0, 0.6]],
    ['z', [0, 0.12, 0.8, 4], [0, 2.25, 0.35], '#2a2018', 0, [0.6, 0, 0]],
    ['z', [0, 0.12, 0.8, 4], [0, 2.25, -0.35], '#2a2018', 0, [-0.6, 0, 0]],
    ['k', [0.06, 5], [0.1, 1.7, 0.26], '#ffd23a', GLUEHT],
    ['k', [0.06, 5], [-0.1, 1.7, 0.26], '#ffd23a', GLUEHT],
  ],
  quelle: [
    ['z', [0.9, 0.9, 0.08, 10], [0, 0.04, 0], '#3a7fb0', 0.15],
    ['k', [0.25, 5], [0.85, 0.15, 0.2], STEIN],
    ['k', [0.22, 5], [-0.7, 0.12, 0.5], STEIN],
    ['k', [0.2, 5], [0.1, 0.1, -0.9], STEIN],
  ],
  moos: [
    ['k', [0.85, 7], [0, 0.15, 0], '#4f7a3a', 0.3],
    ['k', [0.35, 6], [0.4, 0.6, 0.2], '#6a9a4a'],
  ],
  dickicht: [
    ['k', [0.6, 6], [0.5, 0.5, 0], LAUB, 0.3],
    ['k', [0.55, 6], [-0.5, 0.45, 0.2], LAUB2, 0.3],
    ['k', [0.6, 6], [0, 0.55, -0.5], LAUB, 0.3],
    ['k', [0.45, 6], [0, 0.9, 0.3], LAUB2, 0.3],
  ],
  blutwurz: [
    ['k', [0.55, 6], [0, 0.2, 0], '#5a3a2a'],
    ['z', [0, 0.3, 1.2, 5], [0, 0.9, 0], BLUT],
    ['z', [0, 0.18, 0.8, 5], [0.35, 0.6, 0.1], BLUT, 0, [0, 0, -0.4]],
    ['z', [0, 0.18, 0.8, 5], [-0.3, 0.6, -0.1], BLUT, 0, [0, 0, 0.4]],
  ],
  dornenschrein: [
    ['z', [0.5, 0.6, 0.3, 6], [0, 0.15, 0], STEIN],
    ['z', [0, 0.18, 1.6, 4], [0, 1.05, 0], '#3a2a20', 0.3],
    ['z', [0, 0.12, 1.0, 4], [0.35, 0.7, 0], '#3a2a20', 0.3, [0, 0, -0.5]],
    ['z', [0, 0.12, 1.0, 4], [-0.35, 0.7, 0], '#3a2a20', 0.3, [0, 0, 0.5]],
    ['z', [0, 0.12, 1.0, 4], [0, 0.7, 0.35], '#3a2a20', 0.3, [0.5, 0, 0]],
  ],
  // Raunende Eiche: breite alte Eiche mit gluehenden Runen am Stamm
  eiche: [
    ['z', [0.45, 0.65, 1.6, 8], [0, 0.8, 0], HOLZ],
    ['k', [1.15, 8], [0, 2.2, 0], '#35602c', 0.25],
    ['k', [0.75, 7], [0.8, 1.9, 0.2], LAUB, 0.25],
    ['k', [0.75, 7], [-0.75, 1.95, -0.2], LAUB2, 0.25],
    ['q', [0.05, 0.35, 0.03], [0.12, 0.9, 0.5], '#f5b23c', GLUEHT],
    ['q', [0.05, 0.25, 0.03], [-0.12, 1.1, 0.5], '#f5b23c', GLUEHT],
    ['q', [0.18, 0.05, 0.03], [0, 0.65, 0.52], '#f5b23c', GLUEHT],
  ],
  steinkreis: [
    ['q', [0.25, 0.9, 0.18], [0.8, 0.45, 0], STEIN],
    ['q', [0.25, 0.9, 0.18], [-0.8, 0.45, 0], STEIN],
    ['q', [0.25, 0.9, 0.18], [0.4, 0.45, 0.7], STEIN],
    ['q', [0.25, 0.9, 0.18], [-0.4, 0.45, 0.7], STEIN],
    ['q', [0.25, 0.9, 0.18], [0.4, 0.45, -0.7], STEIN],
    ['q', [0.25, 0.9, 0.18], [-0.4, 0.45, -0.7], STEIN],
    ['k', [0.25, 6], [0, 0.3, 0], '#9ad0c0', 0.4],
  ],

  // ------------------------------------------------------------- Karte und Effekte
  scheibe: [['s', [1, 64], [0, 0, 0], '#ffffff', 1]],
  fronAder: [
    ['k', [0.45, 5], [0, 0.2, 0], STEIN],
    ['k', [0.35, 5], [0.55, 0.15, 0.2], '#7a7f76'],
    ['k', [0.3, 5], [-0.4, 0.12, -0.35], '#9a9f96'],
  ],
  blutAder: [
    ['z', [0, 0.22, 1.1, 5], [0, 0.55, 0], BLUT],
    ['z', [0, 0.18, 0.8, 5], [0.3, 0.4, 0.15], '#c58fd2', 0, [0, 0, -0.35]],
    ['z', [0, 0.16, 0.7, 5], [-0.3, 0.35, -0.1], '#8a4f9a', 0, [0.3, 0, 0.3]],
  ],
  baum: [
    ['z', [0.12, 0.18, 1.2, 5], [0, 0.6, 0], HOLZ],
    ['z', [0, 0.7, 1.8, 6], [0, 1.9, 0], '#2f5a2a'],
  ],
  staubwolke: [['k', [1, 6], [0, 0, 0], '#b0a890']],
  pfeil: [
    ['q', [0.05, 0.05, 1.0], [0, 0, 0], HOLZ],
    ['z', [0, 0.06, 0.18, 4], [0, 0, 0.55], EISEN, 0, [Math.PI / 2, 0, 0]],
    ['q', [0.16, 0.02, 0.18], [0, 0, -0.45], '#e8e2d0', 0.6],
  ],
  kugel: [
    ['k', [0.32, 6], [0, 0, 0], '#e2f7d4', GLUEHT],
    ['k', [0.16, 5], [0, 0, -0.35], '#bfe8b0', GLUEHT],
  ],
  stein: [['k', [0.45, 6], [0, 0, 0], STEIN]],
  // Fels: ein grosser und zwei kleinere Brocken, Groesse 1 = Felsradius
  fels: [
    ['k', [0.85, 6], [0, 0.35, 0], '#5c5e55'],
    ['k', [0.55, 5], [0.55, 0.3, 0.35], '#6c6e64'],
    ['k', [0.5, 5], [-0.5, 0.25, -0.4], '#53554c'],
    ['k', [0.35, 5], [0.2, 0.75, -0.2], '#74766b'],
  ],
  // Katapult: Holzrahmen auf vier Raedern, Wurfarm mit Schale
  katapult: [
    ['q', [1.2, 0.18, 0.7], [0, 0.45, 0], HOLZ],
    ['z', [0.22, 0.22, 0.1, 8], [0.42, 0.22, 0.4], '#4a3a2a', 0, [Math.PI / 2, 0, 0]],
    ['z', [0.22, 0.22, 0.1, 8], [-0.42, 0.22, 0.4], '#4a3a2a', 0, [Math.PI / 2, 0, 0]],
    ['z', [0.22, 0.22, 0.1, 8], [0.42, 0.22, -0.4], '#4a3a2a', 0, [Math.PI / 2, 0, 0]],
    ['z', [0.22, 0.22, 0.1, 8], [-0.42, 0.22, -0.4], '#4a3a2a', 0, [Math.PI / 2, 0, 0]],
    ['q', [0.12, 0.7, 0.12], [-0.2, 0.85, 0.25], HOLZ],
    ['q', [0.12, 0.7, 0.12], [-0.2, 0.85, -0.25], HOLZ],
    ['q', [0.1, 1.3, 0.1], [0.05, 1.05, 0], '#8a6a3a', 0, [0, 0, -0.9]],
    ['k', [0.18, 5], [0.55, 1.45, 0], STEIN],
    ['q', [0.5, 0.06, 0.6], [0, 0.56, 0], '#8c2f2f', 0.7],
  ],
  // Wurzelbrecher: gebuecktes Knaeuel aus dunklen Wurzeln mit gluehendem Kern
  wurzelbrecher: [
    ['k', [0.75, 7], [0, 0.75, 0], '#3a2a1e', 0.15],
    ['z', [0.1, 0.22, 1.0, 5], [0.55, 0.35, 0.3], '#2e2218', 0, [0.4, 0, -0.9]],
    ['z', [0.1, 0.22, 1.0, 5], [-0.55, 0.35, 0.3], '#2e2218', 0, [0.4, 0, 0.9]],
    ['z', [0.1, 0.22, 1.0, 5], [0.5, 0.35, -0.4], '#2e2218', 0, [-0.4, 0, -0.9]],
    ['z', [0.1, 0.22, 1.0, 5], [-0.5, 0.35, -0.4], '#2e2218', 0, [-0.4, 0, 0.9]],
    ['z', [0.14, 0.3, 1.2, 5], [0, 1.0, 0.65], '#2e2218', 0, [1.2, 0, 0]],
    ['k', [0.22, 6], [0, 0.85, 0.62], '#f5b23c', GLUEHT],
    ['z', [0, 0.12, 0.8, 4], [0.3, 1.5, -0.1], '#2e2218', 0, [0, 0, -0.5]],
    ['z', [0, 0.12, 0.8, 4], [-0.3, 1.5, -0.1], '#2e2218', 0, [0, 0, 0.5]],
  ],
};

// ------------------------------------------------------------- Bausteine
// Kleine Werkzeuge, damit Modelle aus wenigen, gut lesbaren Formen entstehen
// statt aus Dutzenden handgesetzter Quader.

/** Pseudozufall 0..1 aus Zahl und Salz -- deterministisch, Modelle bleiben stabil. */
function zufall(i, salz = 0) {
  const s = Math.sin(i * 12.9898 + salz * 78.233) * 43758.5453;
  return s - Math.floor(s);
}
const vPlus = (p, v, k = 1) => [p[0] + v[0] * k, p[1] + v[1] * k, p[2] + v[2] * k];
const vEinheit = (v) => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};

/**
 * Teil entlang der Strecke a -> b. seg 0: Quader mit Querschnitt dicke (Zahl
 * oder [breite, tiefe]); seg >= 3: Kegel mit Radius dicke bei a und
 * dicke * spitz bei b. Die Drehung folgt aus der Richtung (rx, dann rz).
 */
function stab(a, b, dicke, farbe, team = 0, seg = 0, spitz = 1) {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l = Math.hypot(d[0], d[1], d[2]) || 1e-6;
  const rx = Math.asin(Math.max(-1, Math.min(1, d[2] / l)));
  const rz = Math.atan2(-d[0], d[1]);
  const mitte = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  if (seg) return ['z', [dicke * spitz, dicke, l, seg], mitte, farbe, team, [rx, 0, rz]];
  const [bq, tq] = Array.isArray(dicke) ? dicke : [dicke, dicke];
  return ['q', [bq, l, tq], mitte, farbe, team, [rx, 0, rz]];
}

/**
 * Geweih einer Seite (seite +1 rechts, -1 links): jede Stange teilt sich in
 * eine steilere Fortsetzung und ein Ende nach aussen. glut: Farbe
 * gluehender Spitzen oder null; knorrig: Unregelmaessigkeit der Aeste.
 */
function geweih(basis, seite, o) {
  const { laenge = 0.55, dicke = 0.05, stufen = 3, spreiz = 0.55, start = 0.75, farbe = '#2b231c', seg = 3, team = 0, glut = null, knorrig = 0 } = o;
  const t = [];
  const ast = (p, w, l, d, s, nr) => {
    const zitter = knorrig * (zufall(nr, 7) - 0.5);
    const q = [p[0] + seite * Math.sin(w + zitter) * l, p[1] + Math.cos(w + zitter) * l, p[2] - l * 0.12 + knorrig * 0.2 * l * (zufall(nr, 9) - 0.5)];
    t.push(stab(p, q, d, farbe, team, seg, 0.6));
    if (s <= 0) {
      if (glut) t.push(['k', [d * 1.3, 4], q, glut, GLUEHT]);
      return;
    }
    ast(q, w - spreiz * 0.55, l * 0.8, d * 0.72, s - 1, nr * 2 + 1);
    ast(q, w + spreiz, l * 0.55, d * 0.6, s - 1, nr * 2 + 2);
  };
  ast(basis, start, laenge, dicke, stufen, 1);
  return t;
}

/**
 * Gluehende Klauenhand. w: Handgelenk, f: Fingerrichtung, s: quer ueber die
 * Hand, b: wohin sich die Spitzen kruemmen. Finger aus zwei Gliedern, die
 * Spitzen laufen spitz zu.
 */
function klauenhand(w, f, s, b, o = {}) {
  const { laenge = 0.6, finger = 4, dicke = 0.042, krumm = 0.25, farbe = GOLD, spitze = GOLD2, glieder = 2, seg = 3, breite = 0.24 } = o;
  f = vEinheit(f);
  s = vEinheit(s);
  const t = [];
  const knoechel = vPlus(w, f, 0.2);
  t.push(stab(w, knoechel, [breite, 0.07], farbe, GLUEHT));
  for (let i = 0; i < finger; i++) {
    const q = i - (finger - 1) / 2;
    const basis = vPlus(knoechel, s, q * (breite / finger));
    const l = laenge * (1 - Math.abs(q) * 0.12);
    if (glieder === 1) {
      t.push(stab(basis, vPlus(vPlus(basis, f, l), s, q * 0.05), dicke, spitze, GLUEHT, seg, 0.1));
      continue;
    }
    const mitte = vPlus(vPlus(basis, f, l * 0.55), s, q * 0.035);
    const ende = vPlus(vPlus(mitte, f, l * 0.45), b, krumm * l);
    t.push(stab(basis, mitte, dicke, farbe, GLUEHT, seg, 0.85));
    t.push(stab(mitte, ende, dicke * 0.85, spitze, GLUEHT, seg, 0.12));
  }
  // Daumen: kurz, schraeg zur anderen Seite
  const daumen = vPlus(vPlus(vPlus(w, f, 0.08), s, -breite * 0.75), f, laenge * 0.35);
  t.push(stab(vPlus(w, s, -breite * 0.35), daumen, dicke, spitze, GLUEHT, seg, 0.2));
  return t;
}

/** Zerfetzter Saum: haengende Stoffstreifen auf einem Kreis um mitte [x, z]. */
function fetzen(r, y, n, laenge, breite, farben, o = {}) {
  const { salz = 1, neig = 0.12, mitte = [0, 0], team = 0.05, glut = null } = o;
  const t = [];
  for (let i = 0; i < n; i++) {
    const w = ((i + zufall(i, salz) * 0.6) / n) * Math.PI * 2;
    const l = laenge * (0.55 + 0.6 * zufall(i, salz + 1));
    const rr = r + (Math.sin(neig) * l) / 2;
    const p = [mitte[0] + Math.cos(w) * rr, y - l / 2, mitte[1] + Math.sin(w) * rr];
    t.push(['q', [breite * (0.7 + 0.5 * zufall(i, salz + 2)), l, 0.04], p, farben[i % farben.length], team, [neig, -w - Math.PI / 2, 0]]);
    // Glimmende Enden an jedem dritten Streifen
    if (glut && i % 3 === 0) {
      const rEnde = r + Math.sin(neig) * l;
      t.push(['k', [0.05, 4], [mitte[0] + Math.cos(w) * rEnde, y - l, mitte[1] + Math.sin(w) * rEnde], glut, GLUEHT]);
    }
  }
  return t;
}

/** Senkrechte Falten auf einem Kegelmantel: dreikantige Leisten von unten nach oben. */
function falten(rU, rO, y0, y1, n, farbe, o = {}) {
  const { salz = 3, dicke = 0.06, team = 0.05, lassen = -1 } = o;
  const t = [];
  for (let i = 0; i < n; i++) {
    if (i === lassen) continue;
    const w = ((i + 0.5 + (zufall(i, salz) - 0.5) * 0.5) / n) * Math.PI * 2 + Math.PI / 2;
    const c = Math.cos(w);
    const s = Math.sin(w);
    const oben = y1 - (y1 - y0) * 0.25 * zufall(i, salz + 1);
    const rOben = rO + ((rU - rO) * (y1 - oben)) / (y1 - y0);
    t.push(stab([c * rU, y0, s * rU], [c * rOben, oben, s * rOben], dicke, farbe, team, 3, 0.3));
  }
  return t;
}

/** Wurzeln, die aus dem Saum in den Boden greifen: zwei Glieder, nach aussen duenner. */
function wurzeln(r, y, n, weite, dicke, farbe, salz = 5) {
  const t = [];
  for (let i = 0; i < n; i++) {
    const w = ((i + zufall(i, salz)) / n) * Math.PI * 2;
    const c = Math.cos(w);
    const s = Math.sin(w);
    const a = [c * r, y, s * r];
    const k = r + weite * (0.45 + 0.2 * zufall(i, salz + 1));
    const m = [c * k + s * 0.08, y * 0.35, s * k - c * 0.08];
    const e = [c * (r + weite * (0.9 + 0.3 * zufall(i, salz + 2))), 0.02, s * (r + weite)];
    t.push(stab(a, m, dicke, farbe, 0.05, 4, 0.7));
    t.push(stab(m, e, dicke * 0.7, farbe, 0.05, 4, 0.15));
  }
  return t;
}

// ------------------------------------------------------------- Waldgott-Varianten
// Jede Variante steht fuer eine Richtung des Grafikstils des ganzen Spiels.
// Gemeinsam (GEMINI.md): fast schwarzer Mantel ohne Fuesse, unten zerfasert,
// hoher Kragen, haengende Aermel, schwarzer Kopf, gelbe Augen, Geweih,
// gekreuzte gluehende Klauenhaende.

const AUGE = '#ffd23a';
const ARM_GLUT = '#c9742c';

/**
 * Zwei gekreuzte Unterarme mit Klauenhaenden vor dem Mantel. rechts/links:
 * [Ellbogen, Handgelenk]; die Finger zeigen schraeg nach unten zur anderen
 * Seite, die Spitzen kruemmen sich zum Betrachter.
 */
function gekreuzteHaende(o) {
  const { rechts, links, laenge = 0.6, hand = {} } = o;
  const t = [];
  for (const [ell, wrist, seite] of [[...rechts, 1], [...links, -1]]) {
    t.push(stab(ell, wrist, 0.075, ARM_GLUT, GLUEHT, 5, 0.85));
    t.push(...klauenhand(wrist, [-seite * 0.42, -1, 0.12], [1, seite * 0.42, 0], [0, 0, 1], { laenge, ...hand }));
  }
  return t;
}

/** B -- Schattenriese: sehr hoch und schmal, lange Aermel, riesiges Geweih. */
function waldgottSchattenriese() {
  const M1 = '#120f0d';
  const M2 = '#1b1612';
  return [
    ['z', [0.36, 0.72, 4.6, 8], [0, 3.1, 0], M1, 0.07],
    ['z', [0.28, 0.5, 0.32, 8], [0, 5.55, 0], M2, 0.06],
    ...falten(0.72, 0.36, 0.8, 5.4, 7, M2, { lassen: 0 }),
    ...fetzen(0.72, 0.85, 16, 0.7, 0.12, [M1, M2], { salz: 4, neig: 0.06 }),
    // Aermel bis fast zum Boden
    stab([0.42, 5.5, 0], [0.74, 2.2, 0.08], 0.12, M2, 0.05, 6, 2.2),
    stab([-0.42, 5.5, 0], [-0.74, 2.2, 0.08], 0.12, M2, 0.05, 6, 2.2),
    ...fetzen(0.22, 2.25, 6, 0.8, 0.09, [M1, M2], { salz: 8, neig: 0.04, mitte: [0.74, 0.08] }),
    ...fetzen(0.22, 2.25, 6, 0.8, 0.09, [M1, M2], { salz: 9, neig: 0.04, mitte: [-0.74, 0.08] }),
    // Kragen: zwei hohe Spitzen
    ['q', [0.3, 1.5, 0.06], [0.28, 6.05, -0.06], M1, 0.05, [0, 0.4, -0.16]],
    ['q', [0.3, 1.5, 0.06], [-0.28, 6.05, -0.06], M1, 0.05, [0, -0.4, 0.16]],
    // Kopf
    ['k', [0.2, 7], [0, 6.0, 0.03], '#080606'],
    ['z', [0.14, 0.04, 0.3, 5], [0, 5.78, 0.06], '#080606'],
    ['k', [0.045, 5], [0.07, 6.03, 0.2], AUGE, GLUEHT],
    ['k', [0.045, 5], [-0.07, 6.03, 0.2], AUGE, GLUEHT],
    ...geweih([0.1, 6.15, 0], 1, { laenge: 0.75, dicke: 0.045, start: 0.45, spreiz: 0.5 }),
    ...geweih([-0.1, 6.15, 0], -1, { laenge: 0.75, dicke: 0.045, start: 0.45, spreiz: 0.5 }),
    ...gekreuzteHaende({ rechts: [[0.55, 3.75, 0.2], [0.14, 3.35, 0.66]], links: [[-0.55, 3.35, 0.2], [-0.14, 2.95, 0.7]], laenge: 1.0 }),
  ];
}

/** C -- Nah an der Vorlage: breite Schultern, gerader Mantel, lange Fetzen. */
function waldgottVorlage() {
  const M1 = '#141110';
  const M2 = '#1e1814';
  const M3 = '#0b0908';
  return [
    ['z', [0.8, 1.0, 2.9, 10], [0, 2.15, 0], M1, 0.07],
    ['z', [0.58, 0.8, 0.3, 10], [0, 3.75, 0], M2, 0.06],
    // Schulterkanten, spitz nach aussen wie in der Vorlage
    ['q', [0.8, 0.2, 0.85], [0.62, 3.62, 0], M2, 0.06, [0, 0, -0.26]],
    ['q', [0.8, 0.2, 0.85], [-0.62, 3.62, 0], M2, 0.06, [0, 0, 0.26]],
    stab([0, 0.75, 1.0], [0, 3.55, 0.8], [0.14, 0.05], M3, 0),
    ...falten(1.0, 0.8, 0.7, 3.6, 10, M2, { lassen: 2 }),
    ...fetzen(1.0, 0.75, 22, 0.62, 0.17, [M1, M2, M3], { salz: 3, neig: 0.15 }),
    ...wurzeln(0.9, 0.35, 7, 0.55, 0.05, M3, 11),
    // Weite Aermel, unten zerfasert
    stab([0.95, 3.5, 0.05], [1.12, 1.15, 0.12], 0.2, M2, 0.05, 7, 2.1),
    stab([-0.95, 3.5, 0.05], [-1.12, 1.15, 0.12], 0.2, M2, 0.05, 7, 2.1),
    ...fetzen(0.38, 1.2, 7, 0.55, 0.12, [M1, M2], { salz: 5, mitte: [1.12, 0.12] }),
    ...fetzen(0.38, 1.2, 7, 0.55, 0.12, [M1, M2], { salz: 6, mitte: [-1.12, 0.12] }),
    // Hoher Kragen
    ['q', [0.42, 1.05, 0.07], [0.36, 4.1, -0.08], M1, 0.05, [-0.1, 0.5, -0.25]],
    ['q', [0.42, 1.05, 0.07], [-0.36, 4.1, -0.08], M1, 0.05, [-0.1, -0.5, 0.25]],
    ['q', [0.8, 0.95, 0.07], [0, 4.05, -0.34], M2, 0.05, [-0.15, 0, 0]],
    // Kopf mit schmalem Kinn
    ['k', [0.25, 8], [0, 4.15, 0.05], '#080606'],
    ['z', [0.18, 0.08, 0.28, 6], [0, 3.93, 0.1], '#080606'],
    ['k', [0.05, 5], [0.09, 4.18, 0.27], AUGE, GLUEHT],
    ['k', [0.05, 5], [-0.09, 4.18, 0.27], AUGE, GLUEHT],
    ...geweih([0.14, 4.35, 0], 1, { laenge: 0.58, dicke: 0.05 }),
    ...geweih([-0.14, 4.35, 0], -1, { laenge: 0.58, dicke: 0.05 }),
    ...gekreuzteHaende({ rechts: [[0.85, 2.6, 0.4], [0.24, 2.35, 1.04]], links: [[-0.85, 2.2, 0.4], [-0.2, 1.95, 1.06]], laenge: 0.72 }),
  ];
}

/** D -- Kantiges Low-Poly: wenige Segmente, grosse Flaechen, Splitter-Haende. */
function waldgottKantig() {
  const M1 = '#1a1512';
  const M2 = '#2a211a';
  const t = [
    ['z', [0.5, 1.05, 3.0, 5], [0, 2.0, 0], M1, 0.08, [0, Math.PI / 10, 0]],
    ['z', [0.0, 0.62, 0.45, 5], [0, 3.7, 0], M2, 0.06, [0, Math.PI / 10, 0]],
    // Schulterspitzen
    ['z', [0, 0.32, 0.9, 4], [0.68, 3.65, 0], M2, 0.06, [0, 0, -1.05]],
    ['z', [0, 0.32, 0.9, 4], [-0.68, 3.65, 0], M2, 0.06, [0, 0, 1.05]],
    stab([0.75, 3.45, 0], [0.98, 1.35, 0.1], 0.18, M1, 0.06, 4, 2.0),
    stab([-0.75, 3.45, 0], [-0.98, 1.35, 0.1], 0.18, M1, 0.06, 4, 2.0),
    // Kragen: zwei dreikantige Platten
    ['z', [0, 0.36, 1.2, 3], [0.34, 4.05, -0.12], M1, 0.05, [0, 0, -0.2]],
    ['z', [0, 0.36, 1.2, 3], [-0.34, 4.05, -0.12], M1, 0.05, [0, 0, 0.2]],
    // Kopf als Oktaeder
    ['z', [0, 0.26, 0.32, 4], [0, 4.26, 0.05], '#0a0807', 0, [0, Math.PI / 4, 0]],
    ['z', [0.26, 0, 0.38, 4], [0, 3.91, 0.05], '#0a0807', 0, [0, Math.PI / 4, 0]],
    // Schraege Augen
    ['q', [0.1, 0.045, 0.04], [0.085, 4.12, 0.25], AUGE, GLUEHT, [0, 0, 0.35]],
    ['q', [0.1, 0.045, 0.04], [-0.085, 4.12, 0.25], AUGE, GLUEHT, [0, 0, -0.35]],
    ...geweih([0.12, 4.38, 0], 1, { laenge: 0.68, dicke: 0.09, stufen: 2, spreiz: 0.75, seg: 3 }),
    ...geweih([-0.12, 4.38, 0], -1, { laenge: 0.68, dicke: 0.09, stufen: 2, spreiz: 0.75, seg: 3 }),
    ...gekreuzteHaende({
      rechts: [[0.8, 2.55, 0.35], [0.22, 2.3, 0.98]],
      links: [[-0.8, 2.15, 0.35], [-0.2, 1.9, 1.0]],
      laenge: 0.75,
      hand: { finger: 3, glieder: 1, dicke: 0.07, seg: 3 },
    }),
  ];
  // Saum: neun grosse dreieckige Zacken bis zum Boden
  for (let i = 0; i < 9; i++) {
    const w = (i / 9) * Math.PI * 2;
    t.push(['z', [0.24, 0, 0.6, 3], [Math.cos(w) * 0.95, 0.3, Math.sin(w) * 0.95], i % 2 ? M1 : M2, 0.06, [0, -w, 0]]);
  }
  return t;
}

/** E -- Rinde und Moos: offener Mantel ueber einem Rindenleib, Wurzeln statt Fuessen. */
function waldgottRinde() {
  const M1 = '#15110e';
  const M2 = '#201913';
  const RINDE = '#3a2a1c';
  const RINDE2 = '#24190f';
  const MOOS = '#33401f';
  return [
    ['z', [0.72, 0.98, 2.9, 9], [0, 2.15, 0], M1, 0.07],
    ['z', [0.52, 0.72, 0.3, 9], [0, 3.75, 0], M2, 0.06],
    // Rindenleib in der Manteloeffnung, mit Furchen
    stab([0, 0.75, 0.96], [0, 3.5, 0.72], [0.55, 0.1], RINDE, 0),
    stab([0.1, 0.8, 1.0], [0.06, 3.3, 0.77], 0.05, RINDE2, 0, 3, 0.4),
    stab([-0.12, 0.9, 1.0], [-0.05, 3.1, 0.79], 0.05, RINDE2, 0, 3, 0.4),
    stab([0.02, 1.5, 0.95], [-0.1, 3.4, 0.76], 0.04, RINDE2, 0, 3, 0.3),
    // Mantelkanten links und rechts der Oeffnung
    stab([0.33, 0.75, 0.97], [0.3, 3.55, 0.7], [0.12, 0.1], M2, 0.06),
    stab([-0.33, 0.75, 0.97], [-0.3, 3.55, 0.7], [0.12, 0.1], M2, 0.06),
    ...falten(0.98, 0.72, 0.7, 3.6, 8, M2, { lassen: 0 }),
    ...fetzen(0.98, 0.75, 12, 0.45, 0.16, [M1, M2], { salz: 12, neig: 0.18 }),
    ...wurzeln(0.85, 0.8, 9, 0.75, 0.13, '#2a1d13', 21),
    // Moos auf den Schultern, haengt in Baerten herab
    ['z', [0.18, 0.42, 0.2, 7], [0.5, 3.82, 0], MOOS, 0.2],
    ['z', [0.18, 0.42, 0.2, 7], [-0.5, 3.82, 0], MOOS, 0.2],
    ['z', [0.1, 0, 0.45, 4], [0.72, 3.5, 0.2], '#2c3a1a', 0.2],
    ['z', [0.1, 0, 0.4, 4], [-0.7, 3.52, -0.15], '#2c3a1a', 0.2],
    ['z', [0.08, 0, 0.35, 4], [0.55, 3.55, -0.3], '#2c3a1a', 0.2],
    // Aermel
    stab([0.85, 3.6, 0.05], [1.05, 1.5, 0.12], 0.19, M2, 0.05, 7, 1.9),
    stab([-0.85, 3.6, 0.05], [-1.05, 1.5, 0.12], 0.19, M2, 0.05, 7, 1.9),
    ...fetzen(0.34, 1.55, 6, 0.45, 0.12, [M1, M2], { salz: 13, mitte: [1.05, 0.12] }),
    ...fetzen(0.34, 1.55, 6, 0.45, 0.12, [M1, M2], { salz: 14, mitte: [-1.05, 0.12] }),
    // Kragen aus Rindenspitzen hinter dem Kopf
    stab([0.2, 3.8, -0.2], [0.55, 4.6, -0.3], 0.1, RINDE2, 0, 4, 0.1),
    stab([-0.2, 3.8, -0.2], [-0.55, 4.6, -0.3], 0.1, RINDE2, 0, 4, 0.1),
    stab([0.08, 3.8, -0.28], [0.22, 4.75, -0.42], 0.09, RINDE2, 0, 4, 0.1),
    stab([-0.08, 3.8, -0.28], [-0.22, 4.75, -0.42], 0.09, RINDE2, 0, 4, 0.1),
    // Kopf
    ['k', [0.25, 8], [0, 4.12, 0.05], '#080606'],
    ['z', [0.17, 0.07, 0.26, 6], [0, 3.92, 0.1], '#080606'],
    ['k', [0.05, 5], [0.09, 4.15, 0.27], AUGE, GLUEHT],
    ['k', [0.05, 5], [-0.09, 4.15, 0.27], AUGE, GLUEHT],
    ...geweih([0.14, 4.32, 0], 1, { laenge: 0.6, dicke: 0.065, farbe: RINDE, knorrig: 0.6 }),
    ...geweih([-0.14, 4.32, 0], -1, { laenge: 0.6, dicke: 0.065, farbe: RINDE, knorrig: 0.6 }),
    ['k', [0.09, 5], [0.42, 4.75, -0.05], MOOS, 0.2],
    ['k', [0.08, 5], [-0.38, 4.7, -0.05], MOOS, 0.2],
    // Gluehende Pilze an den Wurzeln: warmes Licht am Boden
    ['z', [0.1, 0.03, 0.07, 6], [1.2, 0.2, 0.5], '#ff9a3a', GLUEHT],
    ['z', [0.08, 0.03, 0.06, 6], [-0.9, 0.25, 0.9], '#ff9a3a', GLUEHT],
    ['z', [0.09, 0.03, 0.06, 6], [-0.5, 0.18, -1.2], '#ff9a3a', GLUEHT],
    ...gekreuzteHaende({ rechts: [[0.8, 2.6, 0.35], [0.24, 2.35, 1.02]], links: [[-0.8, 2.2, 0.35], [-0.2, 1.95, 1.04]], laenge: 0.7 }),
  ];
}

/** F -- Verspielt-stilisiert: Glockenmantel, grosser runder Kopf, grosse Augen. */
function waldgottVerspielt() {
  const M1 = '#1f1914';
  const M2 = '#2a221b';
  const t = [
    ['z', [0.4, 1.12, 2.3, 12], [0, 1.55, 0], M1, 0.1],
    ['z', [0.72, 0.42, 0.45, 12], [0, 2.85, 0], M2, 0.08],
    ['k', [0.55, 10], [0, 3.38, 0], '#0c0a09'],
    ['k', [0.14, 6], [0.2, 3.42, 0.47], AUGE, GLUEHT],
    ['k', [0.14, 6], [-0.2, 3.42, 0.47], AUGE, GLUEHT],
    ...geweih([0.25, 3.8, 0], 1, { laenge: 0.55, dicke: 0.13, stufen: 2, spreiz: 0.75, seg: 6, farbe: '#4a3a2c', start: 0.6 }),
    ...geweih([-0.25, 3.8, 0], -1, { laenge: 0.55, dicke: 0.13, stufen: 2, spreiz: 0.75, seg: 6, farbe: '#4a3a2c', start: 0.6 }),
    // Runde Aermel
    ['z', [0.16, 0.38, 1.4, 8], [0.78, 2.0, 0.1], M2, 0.08, [0, 0, 0.32]],
    ['z', [0.16, 0.38, 1.4, 8], [-0.78, 2.0, 0.1], M2, 0.08, [0, 0, -0.32]],
    // Faeustlinge mit drei dicken Krallen
    ['k', [0.2, 7], [0.22, 1.75, 0.98], GOLD, GLUEHT],
    ['k', [0.2, 7], [-0.24, 1.45, 1.0], GOLD, GLUEHT],
  ];
  for (const [x, y, s] of [[0.22, 1.75, 1], [-0.24, 1.45, -1]]) {
    for (let i = 0; i < 3; i++) {
      const a = [x + (i - 1) * 0.11, y - 0.12, 1.05];
      t.push(stab(a, [a[0] - s * 0.12, a[1] - 0.42, a[2] + 0.12], 0.075, GOLD2, GLUEHT, 5, 0.15));
    }
  }
  // Saum aus runden Wellen
  for (let i = 0; i < 12; i++) {
    const w = (i / 12) * Math.PI * 2;
    t.push(['k', [0.25, 6], [Math.cos(w) * 1.02, 0.3, Math.sin(w) * 1.02], i % 2 ? M1 : M2, 0.1]);
  }
  return t;
}

/**
 * G -- Glutherz: der Mantel steht vorn offen, darin glimmt ein Kern;
 * Funken steigen auf, Geweihspitzen und Saum glimmen.
 */
function waldgottGlutherz() {
  const M1 = '#130f0c';
  const M2 = '#1d1611';
  const GLUT = '#ff7a1e';
  const t = [
    // Gluehender Kern im Innern
    ['z', [0.32, 0.5, 2.3, 7], [0, 2.1, 0.05], GLUT, GLUEHT],
    ['k', [0.32, 7], [0, 2.7, 0.15], '#ffb347', GLUEHT],
  ];
  // Mantel aus Bahnen, vorn eine Luecke, durch die der Kern scheint
  const n = 9;
  const rU = 1.0;
  const rO = 0.62;
  const h = 3.0;
  for (let i = 1; i < n; i++) {
    const w = Math.PI / 2 + (i / n) * Math.PI * 2;
    const r = (rU + rO) / 2;
    const breite = 2 * rU * Math.tan(Math.PI / n) * 1.08;
    t.push(['q', [breite, h, 0.07], [Math.cos(w) * r, 0.75 + h / 2, Math.sin(w) * r], i % 2 ? M1 : M2, 0.07, [Math.atan((rU - rO) / h), -w - Math.PI / 2, 0]]);
  }
  t.push(
    ['z', [0.5, 0.7, 0.35, 9], [0, 3.85, 0], M2, 0.06],
    ...fetzen(1.0, 0.8, 18, 0.7, 0.16, [M1, M2], { salz: 31, neig: 0.15, glut: '#ff6a1a' }),
    // Aermel
    stab([0.85, 3.7, 0], [1.08, 1.4, 0.12], 0.19, M2, 0.05, 7, 2.0),
    stab([-0.85, 3.7, 0], [-1.08, 1.4, 0.12], 0.19, M2, 0.05, 7, 2.0),
    ...fetzen(0.36, 1.45, 6, 0.5, 0.12, [M1, M2], { salz: 32, mitte: [1.08, 0.12], glut: '#ff6a1a' }),
    ...fetzen(0.36, 1.45, 6, 0.5, 0.12, [M1, M2], { salz: 33, mitte: [-1.08, 0.12], glut: '#ff6a1a' }),
    // Kragen
    ['q', [0.4, 1.0, 0.07], [0.35, 4.2, -0.08], M1, 0.05, [-0.1, 0.5, -0.25]],
    ['q', [0.4, 1.0, 0.07], [-0.35, 4.2, -0.08], M1, 0.05, [-0.1, -0.5, 0.25]],
    // Kopf
    ['k', [0.25, 8], [0, 4.25, 0.05], '#080606'],
    ['z', [0.17, 0.07, 0.26, 6], [0, 4.04, 0.1], '#080606'],
    ['k', [0.05, 5], [0.09, 4.28, 0.27], AUGE, GLUEHT],
    ['k', [0.05, 5], [-0.09, 4.28, 0.27], AUGE, GLUEHT],
    ...geweih([0.14, 4.45, 0], 1, { laenge: 0.58, dicke: 0.05, glut: '#ff9a3a' }),
    ...geweih([-0.14, 4.45, 0], -1, { laenge: 0.58, dicke: 0.05, glut: '#ff9a3a' }),
    ...gekreuzteHaende({ rechts: [[0.85, 2.7, 0.4], [0.26, 2.45, 1.02]], links: [[-0.85, 2.3, 0.4], [-0.2, 2.05, 1.04]], laenge: 0.72 })
  );
  // Aufsteigende Funken
  for (let i = 0; i < 9; i++) {
    const w = zufall(i, 40) * Math.PI * 2;
    const r = 0.4 + zufall(i, 41) * 0.9;
    t.push(['q', [0.06, 0.06, 0.06], [Math.cos(w) * r, 1.0 + zufall(i, 42) * 3.6, Math.sin(w) * r + 0.3], i % 2 ? '#ffb347' : '#ff7a1e', GLUEHT, [0.7, w, 0.7]]);
  }
  return t;
}

/**
 * Varianten des Waldgotts fuer die Stil-Auswahl in dist/galerie.html. Der
 * Nutzer sucht die beste aus; sie wird dann MODELLE_DEF.waldgott. Vorlage:
 * docs/bilder/vorlagen/waldgott-vorlage.png (nur lokal).
 */
export const WALDGOTT_VARIANTEN = {
  'A — bisher': MODELLE_DEF.waldgott,
  'B — Schattenriese': waldgottSchattenriese(),
  'C — Vorlage, düster-realistisch': waldgottVorlage(),
  'D — Kantiges Low-Poly': waldgottKantig(),
  'E — Rinde und Moos': waldgottRinde(),
  'F — Verspielt, große Formen': waldgottVerspielt(),
  'G — Glutherz': waldgottGlutherz(),
};
