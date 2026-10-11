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

/** Bauer: Mittelalterlicher Feldarbeiter auf zwei Beinen mit Leinenhemd, Bundhose, Strohhut und Sense. */
/** Bauer: Mittelalterlicher Feldarbeiter auf zwei Beinen mit Leinenhemd, Bundhose, Strohhut und geschmiedeter Sense. */
function bauerModell() {
  const t = [];
  const HOSE = '#5c4832';
  const STIEFEL = '#352416';
  const HEMD = '#8a6a3a';
  const HUT = '#c4aa5a';

  // Beine (zwei gegengleiche Beine mit Stiefeln und Schuhen)
  for (const s of [1, -1]) {
    t.push(stab([s * 0.13, 0.85, 0], [s * 0.13, 0.45, 0.02], 0.11, HOSE, 0.15, 6));
    t.push(['k', [0.065, 5], [s * 0.13, 0.45, 0.08], '#4a3824']);
    t.push(stab([s * 0.13, 0.45, 0.02], [s * 0.13, 0.08, 0], 0.10, STIEFEL, 0, 6));
    t.push(['q', [0.12, 0.08, 0.22], [s * 0.13, 0.04, 0.04], '#26170d']);
    t.push(['z', [0, 0.05, 0.08, 4], [s * 0.13, 0.04, 0.16], '#26170d', 0, [Math.PI / 2, 0, 0]]);
  }

  // Tunika-Saum, Lederguertel mit Schnalle, Kumpf (Wetzsteinbecher), Beutel und Trinkflasche
  t.push(
    ['z', [0.32, 0.38, 0.32, 8], [0, 0.78, 0], HEMD, 0.55],
    ['z', [0.31, 0.31, 0.07, 8], [0, 0.94, 0], '#2e1c0e'],
    ['q', [0.08, 0.06, 0.03], [0, 0.94, 0.32], '#d8b06a', 0.8],
    ['q', [0.11, 0.13, 0.09], [0.26, 0.88, 0.1], '#422a16'],
    // Holz-Kumpf fuer Wetzstein
    ['z', [0.05, 0.035, 0.18, 6], [-0.28, 0.82, 0.08], '#5a3d1c', 0, [0.2, 0, -0.3]],
    ['z', [0.02, 0.02, 0.12, 4], [-0.28, 0.90, 0.08], '#9ca3af', 0, [0.2, 0, -0.3]],
    // Ton-Trinkflasche
    ['k', [0.065, 5], [0.20, 0.86, -0.22], '#8a5a36']
  );

  // Oberkoerper (Leinenwams mit Weste)
  t.push(
    ['z', [0.36, 0.30, 0.52, 8], [0, 1.20, 0], HEMD, 0.55],
    ['q', [0.28, 0.42, 0.32], [0, 1.22, 0.02], '#6e5028', 0.6],
    ['z', [0.18, 0.22, 0.10, 8], [0, 1.44, 0], '#a47e4b', 0.5]
  );

  // Arme mit Handgelenken und Haenden
  t.push(
    stab([-0.32, 1.38, 0], [-0.34, 1.05, 0.06], 0.09, HEMD, 0.5, 5),
    stab([-0.34, 1.05, 0.06], [-0.22, 0.95, 0.26], 0.08, HAUT, 0, 5),
    ['k', [0.06, 5], [-0.22, 0.95, 0.26], HAUT],
    stab([0.32, 1.38, 0], [0.30, 1.08, 0.14], 0.09, HEMD, 0.5, 5),
    stab([0.30, 1.08, 0.14], [0.18, 1.18, 0.30], 0.08, HAUT, 0, 5),
    ['k', [0.06, 5], [0.18, 1.18, 0.30], HAUT]
  );

  // Kopf und Strohhut mit geflochtenem Rand
  t.push(
    ['z', [0.10, 0.11, 0.15, 6], [0, 1.50, 0.02], HAUT],
    ['k', [0.18, 7], [0, 1.66, 0.04], HAUT],
    ['z', [0.52, 0.52, 0.035, 12], [0, 1.76, 0.04], HUT, 0, [0.08, 0, 0]],
    ['z', [0.54, 0.54, 0.02, 12], [0, 1.77, 0.04], '#b59a4c', 0, [0.08, 0, 0]],
    ['z', [0.18, 0.26, 0.22, 8], [0, 1.88, 0.03], '#ad9348', 0, [0.08, 0, 0]],
    ['z', [0.27, 0.27, 0.04, 8], [0, 1.79, 0.035], '#5a3d1c']
  );

  // Sense (langer geschwungener Holzschaft mit Doppelgriff und geschmiedeter Stahlklinge)
  t.push(
    stab([0.22, 0.10, 0.20], [-0.26, 2.05, 0.30], 0.042, HOLZ, 0, 6),
    stab([0.18, 1.18, 0.30], [0.14, 1.18, 0.40], 0.024, '#4a2f18'),
    stab([-0.22, 0.95, 0.26], [-0.18, 0.95, 0.36], 0.024, '#4a2f18'),
    ['z', [0.052, 0.052, 0.08, 6], [-0.26, 2.05, 0.30], EISEN],
    ['q', [0.04, 0.08, 0.04], [-0.30, 2.08, 0.30], '#3a4047'],
    stab([-0.26, 2.05, 0.30], [-0.70, 2.14, 0.32], [0.075, 0.02], EISEN),
    stab([-0.26, 2.07, 0.30], [-0.70, 2.16, 0.32], [0.03, 0.03], '#383e44'),
    stab([-0.70, 2.14, 0.32], [-0.98, 1.92, 0.35], [0.055, 0.016], '#c2cbd4'),
    stab([-0.70, 2.16, 0.32], [-0.98, 1.94, 0.35], [0.025, 0.025], '#383e44'),
    stab([-0.98, 1.92, 0.35], [-1.15, 1.68, 0.37], [0.038, 0.012], '#dbe2ea')
  );

  return t;
}

/** Soldat: Zuverlaessiger Linien-Infanterist mit Kettenhemd, Eisenhut, Dreiecksschild, Seitenwehre und Stoßspeer. */
function soldatModell() {
  const t = [];
  const EISEN_D = '#50565e';
  const KETTE = '#626972';
  const STIEFEL = '#2e2218';

  // Beine
  for (const s of [1, -1]) {
    t.push(stab([s * 0.15, 0.85, 0], [s * 0.15, 0.45, 0.02], 0.12, KETTE, 0.25, 6));
    t.push(['k', [0.085, 5], [s * 0.15, 0.45, 0.10], EISEN]);
    t.push(stab([s * 0.15, 0.45, 0.02], [s * 0.15, 0.08, 0], 0.11, STIEFEL, 0, 6));
    t.push(['q', [0.13, 0.08, 0.23], [s * 0.15, 0.04, 0.05], '#201710']);
    t.push(['z', [0, 0.055, 0.09, 4], [s * 0.15, 0.04, 0.18], '#201710', 0, [Math.PI / 2, 0, 0]]);
  }

  // Gambeson- und Kettenpanzer-Rock, Lederguertel
  t.push(
    ['z', [0.36, 0.44, 0.34, 8], [0, 0.78, 0], EISEN_D, 0.35],
    ['z', [0.35, 0.35, 0.08, 8], [0, 0.94, 0], '#241a10'],
    ['q', [0.09, 0.07, 0.03], [0, 0.94, 0.36], '#d8b06a', 0.9]
  );

  // Seitenwehre: Kurzschwert in Lederscheide an der linken Huefte
  t.push(
    stab([-0.36, 0.92, 0.05], [-0.42, 0.48, -0.05], [0.05, 0.03], '#3d2516'),
    ['q', [0.14, 0.03, 0.03], [-0.36, 0.94, 0.05], EISEN],
    stab([-0.36, 0.94, 0.05], [-0.34, 1.08, 0.09], 0.025, '#2e1c0e'),
    ['k', [0.035, 4], [-0.34, 1.09, 0.09], EISEN]
  );

  // Eisen-Brustharnisch mit Wappenband in Teamfarbe
  t.push(
    ['z', [0.40, 0.33, 0.56, 8], [0, 1.24, 0], '#6c737d', 0.7],
    ['q', [0.22, 0.52, 0.36], [0, 1.24, 0.02], '#d8b06a', 0.9],
    ['q', [0.04, 0.54, 0.38], [0, 1.24, 0.02], '#ffffff', 0.5]
  );

  // Pauldrons (Schulterkacheln mit Nieten)
  for (const s of [1, -1]) {
    t.push(['k', [0.13, 6], [s * 0.36, 1.46, 0], EISEN]);
    t.push(['q', [0.15, 0.05, 0.20], [s * 0.36, 1.38, 0], EISEN_D]);
  }

  // Linker Arm mit Dreiecksschild
  t.push(
    stab([-0.36, 1.44, 0], [-0.40, 1.10, 0.12], 0.095, KETTE, 0.3, 5),
    stab([-0.40, 1.10, 0.12], [-0.32, 1.05, 0.32], 0.08, STIEFEL, 0, 5),
    ['q', [0.08, 0.84, 0.54], [-0.48, 1.12, 0.22], '#2c3540', 0.85, [0.1, 0, 0.08]],
    ['q', [0.09, 0.80, 0.16], [-0.48, 1.12, 0.22], '#d8b06a', 0.95, [0.1, 0, 0.08]],
    ['q', [0.09, 0.16, 0.50], [-0.48, 1.12, 0.22], '#d8b06a', 0.95, [0.1, 0, 0.08]],
    ['z', [0, 0.26, 0.40, 4], [-0.48, 0.65, 0.19], '#2c3540', 0.85, [0, 0, Math.PI / 4]],
    ['k', [0.05, 4], [-0.52, 1.12, 0.22], EISEN]
  );

  // Rechter Arm mit langem Stoßspeer samt Wimpel
  t.push(
    stab([0.36, 1.44, 0], [0.34, 1.08, 0.14], 0.095, KETTE, 0.3, 5),
    stab([0.34, 1.08, 0.14], [0.26, 1.05, 0.34], 0.08, STIEFEL, 0, 5),
    ['k', [0.065, 5], [0.26, 1.05, 0.34], '#3a3028'],
    stab([0.26, 0.05, 0.34], [0.26, 2.70, 0.34], 0.040, HOLZ, 0, 5),
    ['z', [0.05, 0.05, 0.10, 5], [0.26, 2.72, 0.34], EISEN],
    ['z', [0, 0.11, 0.42, 4], [0.26, 2.92, 0.34], '#d8dee6', 0, [0, Math.PI / 4, 0]],
    ['q', [0.02, 0.18, 0.42], [0.26, 2.62, 0.58], '#d8b06a', 0.9],
    ['z', [0, 0.08, 0.18, 3], [0.26, 2.62, 0.82], '#d8b06a', 0.9, [0, 0, Math.PI / 2]]
  );

  // Kopf, Kettenhaube und Eisenhut mit Rand
  t.push(
    ['z', [0.13, 0.17, 0.22, 7], [0, 1.52, 0], KETTE, 0.2],
    ['k', [0.18, 7], [0, 1.68, 0.04], HAUT],
    ['k', [0.21, 7], [0, 1.78, 0.02], EISEN],
    ['z', [0.46, 0.46, 0.035, 12], [0, 1.74, 0.02], EISEN, 0, [0.06, 0, 0]],
    ['q', [0.04, 0.22, 0.42], [0, 1.90, 0.02], '#8a949e'],
    ['q', [0.02, 0.18, 0.02], [0.18, 1.64, 0.04], '#241a10'],
    ['q', [0.02, 0.18, 0.02], [-0.18, 1.64, 0.04], '#241a10']
  );

  return t;
}

/** Jäger: Flinker Waldlaeufer mit Lederwams, Kapuzengugel, Jagdhorn, Langbogen und Pfeilkoecher auf dem Ruecken. */
function jaegerModell() {
  const t = [];
  const LEDER = '#3d2b1a';
  const GRUEN1 = '#2d4522';
  const GRUEN2 = '#3d5c2e';

  // Beine
  for (const s of [1, -1]) {
    t.push(stab([s * 0.13, 0.85, 0], [s * 0.13, 0.45, 0.02], 0.11, GRUEN1, 0.4, 6));
    t.push(stab([s * 0.13, 0.45, 0.02], [s * 0.13, 0.08, 0], 0.10, LEDER, 0, 6));
    t.push(['q', [0.12, 0.08, 0.22], [s * 0.13, 0.04, 0.04], '#24170d']);
    t.push(['z', [0, 0.05, 0.08, 4], [s * 0.13, 0.04, 0.16], '#24170d', 0, [Math.PI / 2, 0, 0]]);
  }

  // Wams-Schoss und Guertel mit Jagdmesser und Beutel
  t.push(
    ['z', [0.31, 0.36, 0.30, 8], [0, 0.78, 0], GRUEN2, 0.5],
    ['z', [0.30, 0.30, 0.07, 8], [0, 0.93, 0], LEDER],
    stab([0.22, 0.93, 0.18], [0.28, 0.68, 0.24], 0.035, '#2e1c0e'),
    ['q', [0.04, 0.09, 0.02], [0.24, 0.98, 0.16], EISEN],
    ['q', [0.10, 0.10, 0.08], [-0.22, 0.88, 0.14], '#281a10']
  );

  // Jagddoublon mit diagonaler Koecher-Bandraffung und Jagdhorn
  t.push(
    ['z', [0.35, 0.29, 0.50, 8], [0, 1.20, 0], GRUEN2, 0.5],
    ['q', [0.40, 0.06, 0.30], [0, 1.25, 0], LEDER, 0, [0.3, 0, 0.3]],
    ['z', [0.36, 0.42, 0.22, 8], [0, 1.45, -0.02], GRUEN1, 0.4],
    ['z', [0.03, 0.07, 0.24, 6], [-0.24, 1.02, 0.18], '#d8b06a', 0.8, [0.4, 0, 0.6]],
    ['k', [0.04, 4], [-0.28, 0.92, 0.26], '#5c3a1e']
  );

  // Pfeilkoecher auf dem Ruecken mit echten Pfeilen
  t.push(
    stab([0.16, 0.95, -0.22], [0.20, 1.65, -0.26], 0.085, LEDER, 0, 6),
    stab([0.20, 1.62, -0.26], [0.18, 1.90, -0.29], 0.025, HOLZ),
    stab([0.22, 1.62, -0.26], [0.24, 1.92, -0.27], 0.025, HOLZ),
    stab([0.18, 1.62, -0.24], [0.16, 1.88, -0.23], 0.025, HOLZ),
    ['q', [0.08, 0.12, 0.02], [0.18, 1.92, -0.29], '#f0ede6'],
    ['q', [0.08, 0.12, 0.02], [0.24, 1.94, -0.27], '#f0ede6'],
    ['q', [0.08, 0.12, 0.02], [0.16, 1.90, -0.23], '#f0ede6']
  );

  // Linker Arm mit Armschutz (Bracer) haelt den gespannten Jagdbogen
  t.push(
    stab([-0.32, 1.40, 0], [-0.38, 1.12, 0.18], 0.09, GRUEN1, 0.4, 5),
    stab([-0.38, 1.12, 0.18], [-0.34, 1.08, 0.32], 0.075, HAUT, 0, 5),
    ['q', [0.06, 0.14, 0.04], [-0.36, 1.10, 0.25], LEDER],
    ['k', [0.055, 5], [-0.34, 1.08, 0.32], HAUT],
    stab([-0.34, 1.08, 0.32], [-0.36, 1.65, 0.25], 0.038, '#6b4522', 0, 5),
    stab([-0.36, 1.65, 0.25], [-0.37, 2.05, 0.12], 0.028, '#82562d', 0, 5),
    ['k', [0.035, 4], [-0.37, 2.05, 0.12], '#e2e8f0'],
    stab([-0.34, 1.08, 0.32], [-0.36, 0.52, 0.25], 0.038, '#6b4522', 0, 5),
    stab([-0.36, 0.52, 0.25], [-0.37, 0.15, 0.12], 0.028, '#82562d', 0, 5),
    ['k', [0.035, 4], [-0.37, 0.15, 0.12], '#e2e8f0'],
    stab([-0.37, 2.05, 0.12], [-0.37, 0.15, 0.12], 0.012, '#ede8db')
  );

  // Rechter Arm mit Bogenhand
  t.push(
    stab([0.32, 1.40, 0], [0.35, 1.08, 0.10], 0.09, GRUEN1, 0.4, 5),
    stab([0.35, 1.08, 0.10], [0.15, 1.08, 0.16], 0.075, HAUT, 0, 5),
    ['k', [0.055, 5], [0.15, 1.08, 0.16], HAUT]
  );

  // Kopf mit Gugel-Kapuze und Feder
  t.push(
    ['z', [0.10, 0.11, 0.14, 6], [0, 1.50, 0.01], HAUT],
    ['k', [0.17, 7], [0, 1.66, 0.04], HAUT],
    ['k', [0.22, 7], [0, 1.70, -0.02], GRUEN1, 0.4],
    ['z', [0, 0.11, 0.22, 4], [0, 1.70, -0.20], GRUEN1, 0.4, [-0.55, 0, 0]],
    stab([0.18, 1.75, 0.05], [0.28, 2.05, -0.08], 0.015, '#c2410c'),
    ['q', [0.04, 0.18, 0.01], [0.24, 1.95, -0.05], '#f59e0b', 0, [0.3, 0, -0.3]]
  );

  return t;
}

/** Söldner: Geharnischter Plattenritter mit geripptem Brustpanzer, Barthelm, schweren Panzerhandschuhen und maechtiger Kriegshellebarde. */
function soeldnerModell() {
  const t = [];
  const STAHL = '#757d86';
  const STAHL_D = '#484f57';
  const GOLD_AKZ = '#d8b06a';

  // Beine mit Panzerroehren und Knielingen
  for (const s of [1, -1]) {
    t.push(stab([s * 0.16, 0.88, 0], [s * 0.16, 0.48, 0.02], 0.135, STAHL, 0.2, 6));
    t.push(['k', [0.095, 6], [s * 0.16, 0.48, 0.11], '#8e96a0']);
    t.push(['z', [0, 0.05, 0.08, 4], [s * 0.16, 0.48, 0.18], STAHL, 0, [Math.PI / 2, 0, 0]]);
    t.push(stab([s * 0.16, 0.48, 0.02], [s * 0.16, 0.08, 0], 0.125, STAHL_D, 0.2, 6));
    t.push(['q', [0.15, 0.09, 0.25], [s * 0.16, 0.05, 0.05], '#383e44']);
    t.push(['z', [0, 0.065, 0.10, 4], [s * 0.16, 0.05, 0.19], STAHL_D, 0, [Math.PI / 2, 0, 0]]);
  }

  // Kettenhemd-Saum und gestaffelte Tassetten
  t.push(
    ['z', [0.42, 0.50, 0.36, 8], [0, 0.80, 0], '#3a4047', 0.3],
    ['q', [0.20, 0.26, 0.04], [-0.18, 0.78, 0.26], STAHL, 0.4, [0.15, 0, 0]],
    ['q', [0.20, 0.26, 0.04], [0.18, 0.78, 0.26], STAHL, 0.4, [0.15, 0, 0]],
    ['q', [0.18, 0.03, 0.05], [-0.18, 0.66, 0.28], GOLD_AKZ, 0.8],
    ['q', [0.18, 0.03, 0.05], [0.18, 0.66, 0.28], GOLD_AKZ, 0.8]
  );

  // Wuchtiger gotischer Plattenpanzer mit Rippengrat
  t.push(
    ['z', [0.46, 0.38, 0.60, 8], [0, 1.28, 0], STAHL, 0.6],
    ['q', [0.06, 0.58, 0.42], [0, 1.28, 0.03], '#9ba4ad'],
    ['q', [0.24, 0.14, 0.42], [0, 1.42, 0.02], GOLD_AKZ, 0.8],
    ['z', [0.26, 0.32, 0.16, 8], [0, 1.54, 0], STAHL_D]
  );

  // Grosse gestufte Schulterkacheln (Pauldrons)
  for (const s of [1, -1]) {
    t.push(
      ['k', [0.17, 7], [s * 0.42, 1.50, 0], STAHL],
      ['q', [0.15, 0.05, 0.24], [s * 0.42, 1.42, 0], STAHL_D],
      ['q', [0.16, 0.04, 0.22], [s * 0.42, 1.34, 0], STAHL]
    );
  }

  // Beide Arme fuehren die schwere Hellebarde
  t.push(
    stab([-0.40, 1.48, 0], [-0.22, 1.22, 0.24], 0.11, STAHL, 0.3, 5),
    stab([0.40, 1.48, 0], [0.20, 1.20, 0.30], 0.11, STAHL, 0.3, 5),
    ['q', [0.10, 0.10, 0.10], [-0.14, 1.26, 0.40], '#40464d'],
    ['q', [0.10, 0.10, 0.10], [0.12, 1.20, 0.42], '#40464d']
  );

  // Kriegshellebarde (langer Schaft, Axtblatt, Rueckenhaken und Stossspitze)
  t.push(
    stab([0, 0.05, 0.45], [0, 2.85, 0.45], 0.045, '#422a16', 0, 6),
    ['z', [0.055, 0.055, 0.25, 6], [0, 2.50, 0.45], STAHL_D],
    ['q', [0.015, 0.45, 0.06], [0, 2.30, 0.45], STAHL],
    stab([0, 2.60, 0.45], [0, 3.25, 0.45], [0.08, 0.018], '#d8dee6'),
    ['z', [0, 0.04, 0.18, 4], [0, 3.32, 0.45], '#edf2f7', 0, [0, Math.PI / 4, 0]],
    ['q', [0.28, 0.38, 0.025], [-0.20, 2.68, 0.45], '#cbd5e1'],
    ['z', [0, 0.20, 0.42, 4], [-0.36, 2.68, 0.45], '#f1f5f9', 0, [0, 0, Math.PI / 2]],
    ['q', [0.16, 0.06, 0.025], [0.14, 2.68, 0.45], STAHL],
    ['z', [0, 0.05, 0.12, 4], [0.22, 2.62, 0.45], '#94a3b8', 0, [-0.5, 0, Math.PI / 2]]
  );

  // Schaller-Helm mit Sehschlitz und Kinnbart
  t.push(
    ['z', [0.15, 0.19, 0.24, 7], [0, 1.55, 0], STAHL_D, 0.2],
    ['z', [0.23, 0.25, 0.42, 8], [0, 1.78, 0.02], STAHL],
    ['k', [0.23, 8], [0, 1.94, 0.02], '#8c95a0'],
    ['q', [0.28, 0.035, 0.03], [0, 1.82, 0.26], '#141618'],
    ['q', [0.30, 0.015, 0.035], [0, 1.85, 0.26], GOLD_AKZ, 0.9],
    ['z', [0.26, 0.20, 0.16, 6], [0, 1.70, -0.22], STAHL, 0, [-0.65, 0, 0]]
  );

  return t;
}

/** Held: Majestaetischer Kommandant der Menschen mit vergoldeter Prunkruestung, Kronenhelm, Schulterloewen, Prunkschild, wehendem Purpurumhang und Runen-Breitschwert. */
function heldModell() {
  const t = [];
  const DUNKELSTAHL = '#2c3238';
  const STAHL_GLANZ = '#555d66';
  const GOLD_HELL = '#f5b23c';
  const PURPUR = '#8c1f1f';
  const RUBIN = '#e11d48';

  // 1. Beine mit Kniekacheln, Schienen und Eisenschuhen
  for (const s of [1, -1]) {
    t.push(stab([s * 0.17, 0.92, 0], [s * 0.17, 0.50, 0.02], 0.14, DUNKELSTAHL, 0.3, 6));
    t.push(['k', [0.11, 6], [s * 0.17, 0.50, 0.12], GOLD_HELL, GLUEHT]);
    t.push(['z', [0, 0.06, 0.10, 4], [s * 0.17, 0.50, 0.19], GOLD_HELL, GLUEHT, [Math.PI / 2, 0, 0]]);
    t.push(stab([s * 0.17, 0.50, 0.02], [s * 0.17, 0.08, 0], 0.13, STAHL_GLANZ, 0.3, 6));
    t.push(['q', [0.035, 0.38, 0.04], [s * 0.17, 0.28, 0.12], GOLD_HELL, GLUEHT]);
    t.push(['q', [0.16, 0.09, 0.26], [s * 0.17, 0.05, 0.05], '#1e2226']);
    t.push(['q', [0.14, 0.035, 0.14], [s * 0.17, 0.10, 0.09], GOLD_HELL, GLUEHT]);
    t.push(['z', [0, 0.07, 0.10, 4], [s * 0.17, 0.05, 0.21], DUNKELSTAHL, 0.3, [Math.PI / 2, 0, 0]]);
  }

  // 2. Prunkschoss, Guertel und gestaffelte Tassetten
  t.push(
    ['z', [0.44, 0.52, 0.38, 8], [0, 0.84, 0], DUNKELSTAHL, 0.5],
    ['z', [0.43, 0.43, 0.09, 8], [0, 0.96, 0], '#18120c'],
    ['q', [0.14, 0.09, 0.04], [0, 0.96, 0.44], GOLD_HELL, GLUEHT],
    ['q', [0.22, 0.28, 0.04], [-0.19, 0.80, 0.28], STAHL_GLANZ, 0.7, [0.15, 0, 0]],
    ['q', [0.22, 0.28, 0.04], [0.19, 0.80, 0.28], STAHL_GLANZ, 0.7, [0.15, 0, 0]],
    ['q', [0.18, 0.04, 0.05], [-0.19, 0.68, 0.30], GOLD_HELL, GLUEHT],
    ['q', [0.18, 0.04, 0.05], [0.19, 0.68, 0.30], GOLD_HELL, GLUEHT],
    ['q', [0.04, 0.24, 0.20], [-0.44, 0.82, 0], STAHL_GLANZ, 0.6, [0, 0, -0.15]],
    ['q', [0.04, 0.24, 0.20], [0.44, 0.82, 0], STAHL_GLANZ, 0.6, [0, 0, 0.15]]
  );

  // 3. Schwerer Prunkharnisch mit Wappenrelief
  t.push(
    ['z', [0.50, 0.40, 0.64, 8], [0, 1.32, 0], DUNKELSTAHL, 0.7],
    ['q', [0.08, 0.62, 0.46], [0, 1.32, 0.03], GOLD_HELL, GLUEHT],
    ['k', [0.13, 6], [0, 1.42, 0.27], GOLD_HELL, GLUEHT],
    ['q', [0.16, 0.03, 0.03], [0, 1.42, 0.36], RUBIN, GLUEHT],
    ['q', [0.03, 0.16, 0.03], [0, 1.42, 0.36], RUBIN, GLUEHT],
    ['z', [0.28, 0.34, 0.18, 8], [0, 1.56, 0], DUNKELSTAHL, 0.5]
  );

  // 4. Wehender Purpur-Umhang in edler Faltenstaffelung
  t.push(
    ['q', [0.46, 0.07, 0.07], [0, 1.58, -0.18], GOLD_HELL, GLUEHT],
    ['q', [0.94, 1.20, 0.06], [0, 0.96, -0.34], PURPUR, 0.4, [-0.15, 0, 0]],
    ['q', [1.08, 0.62, 0.05], [0, 0.45, -0.46], '#6b1414', 0.4, [-0.22, 0, 0]],
    ['q', [1.14, 0.06, 0.06], [0, 0.16, -0.52], GOLD_HELL, GLUEHT, [-0.22, 0, 0]],
    ['q', [0.12, 1.10, 0.08], [-0.44, 0.95, -0.32], '#781818', 0.4, [-0.14, 0, 0.08]],
    ['q', [0.12, 1.10, 0.08], [0.44, 0.95, -0.32], '#781818', 0.4, [-0.14, 0, -0.08]]
  );

  // 5. Vergoldete Loewenkopf-Schulterstuecke mit gestuften Panzerkacheln
  for (const s of [1, -1]) {
    t.push(
      ['k', [0.20, 7], [s * 0.46, 1.56, 0], GOLD_HELL, GLUEHT],
      ['q', [0.24, 0.10, 0.30], [s * 0.46, 1.46, 0], DUNKELSTAHL, 0.5],
      ['q', [0.26, 0.08, 0.32], [s * 0.46, 1.36, 0], STAHL_GLANZ, 0.6],
      ['z', [0, 0.05, 0.08, 4], [s * 0.56, 1.58, 0], GOLD_HELL, GLUEHT, [0, 0, s * Math.PI / 2]]
    );
  }

  // 6. Arme, Ellenbogenkacheln und Panzerhandschuhe
  t.push(
    stab([-0.44, 1.52, 0], [-0.38, 1.16, 0.18], 0.11, DUNKELSTAHL, 0.5, 5),
    ['k', [0.085, 5], [-0.42, 1.16, 0.16], GOLD_HELL, GLUEHT],
    stab([-0.38, 1.16, 0.18], [-0.28, 1.10, 0.38], 0.095, STAHL_GLANZ, 0.6, 5),
    ['k', [0.08, 5], [-0.28, 1.10, 0.38], '#353b42'],

    stab([0.44, 1.52, 0], [0.40, 1.15, 0.20], 0.11, DUNKELSTAHL, 0.5, 5),
    ['k', [0.085, 5], [0.44, 1.15, 0.18], GOLD_HELL, GLUEHT],
    stab([0.40, 1.15, 0.20], [0.24, 1.12, 0.42], 0.095, GOLD_HELL, GLUEHT, 5),
    ['k', [0.08, 5], [0.24, 1.12, 0.42], '#353b42']
  );

  // 7. Majestaetischer Prunk-Reiterschild auf dem linken Unterarm
  t.push(
    ['q', [0.07, 0.88, 0.56], [-0.52, 1.12, 0.26], '#1b222c', 0.85, [0.08, 0, 0.10]],
    ['q', [0.08, 0.84, 0.16], [-0.52, 1.12, 0.26], GOLD_HELL, GLUEHT, [0.08, 0, 0.10]],
    ['q', [0.08, 0.16, 0.52], [-0.52, 1.12, 0.26], GOLD_HELL, GLUEHT, [0.08, 0, 0.10]],
    ['z', [0, 0.27, 0.42, 4], [-0.52, 0.62, 0.22], '#1b222c', 0.85, [0, 0, Math.PI / 4]],
    ['z', [0, 0.08, 0.42, 4], [-0.52, 0.62, 0.22], GOLD_HELL, GLUEHT, [0, 0, Math.PI / 4]],
    ['k', [0.09, 5], [-0.56, 1.12, 0.26], GOLD_HELL, GLUEHT],
    ['k', [0.038, 4], [-0.58, 1.12, 0.26], RUBIN, GLUEHT]
  );

  // 8. Grosses Runen-Breitschwert in der Rechten
  t.push(
    stab([0.16, 1.20, 0.54], [0.16, 2.85, 0.54], [0.15, 0.032], '#d8dee6'),
    ['z', [0, 0.075, 0.26, 4], [0.16, 2.98, 0.54], '#edf2f7', 0, [0, Math.PI / 4, 0]],
    ['q', [0.03, 1.25, 0.038], [0.16, 2.10, 0.54], '#ffd700', GLUEHT],
    ['q', [0.74, 0.08, 0.08], [0.16, 1.22, 0.54], GOLD_HELL, GLUEHT],
    ['z', [0.06, 0.03, 0.10, 4], [-0.20, 1.26, 0.54], GOLD_HELL, GLUEHT, [0, 0, 0.3]],
    ['z', [0.06, 0.03, 0.10, 4], [0.52, 1.26, 0.54], GOLD_HELL, GLUEHT, [0, 0, -0.3]],
    stab([0.16, 1.22, 0.54], [0.16, 0.78, 0.54], 0.048, '#1e130a', 0, 5),
    ['k', [0.085, 6], [0.16, 0.74, 0.54], GOLD_HELL, GLUEHT],
    ['k', [0.042, 5], [0.16, 0.74, 0.58], RUBIN, GLUEHT]
  );

  // 9. Prunkvoller Grosshelm mit Krone und wehendem Helmbusch
  t.push(
    ['z', [0.17, 0.21, 0.26, 8], [0, 1.60, 0], DUNKELSTAHL, 0.3],
    ['z', [0.25, 0.27, 0.44, 8], [0, 1.86, 0.03], STAHL_GLANZ, 0.6],
    ['q', [0.28, 0.04, 0.04], [0, 1.86, 0.29], '#0f1114'],
    ['q', [0.18, 0.12, 0.035], [0, 1.76, 0.28], DUNKELSTAHL, 0.4],
    ['q', [0.02, 0.08, 0.04], [-0.06, 1.76, 0.29], '#0f1114'],
    ['q', [0.02, 0.08, 0.04], [0.06, 1.76, 0.29], '#0f1114'],
    ['z', [0.29, 0.29, 0.12, 8], [0, 1.94, 0.03], GOLD_HELL, GLUEHT],
    ['z', [0, 0.055, 0.16, 4], [0, 2.08, 0.31], GOLD_HELL, GLUEHT],
    ['z', [0, 0.055, 0.16, 4], [-0.21, 2.06, 0.18], GOLD_HELL, GLUEHT],
    ['z', [0, 0.055, 0.16, 4], [0.21, 2.06, 0.18], GOLD_HELL, GLUEHT],
    ['z', [0, 0.055, 0.14, 4], [-0.22, 2.04, -0.14], GOLD_HELL, GLUEHT],
    ['z', [0, 0.055, 0.14, 4], [0.22, 2.04, -0.14], GOLD_HELL, GLUEHT],
    ['k', [0.024, 4], [0, 2.08, 0.32], RUBIN, GLUEHT],
    ['k', [0.024, 4], [-0.21, 2.06, 0.19], RUBIN, GLUEHT],
    ['k', [0.024, 4], [0.21, 2.06, 0.19], RUBIN, GLUEHT],
    stab([0, 2.06, -0.05], [0, 2.48, -0.32], 0.085, PURPUR, 0.5, 5, 0.2),
    stab([0, 2.48, -0.32], [0, 2.82, -0.55], 0.065, '#991b1b', 0.5, 4, 0.1)
  );

  return t;
}

/** Dryade: Schlanke Baumfrau aus lebendiger Rinde und Wurzeln mit langem Wurzelhaar, Rankengewand, Bluetenkrone und leuchtendem Lebenssaat-Stab. */
function dryadeModell() {
  const t = [];
  const RINDE = '#5c432d';
  const RINDE_H = '#78593c';
  const RANKEN = '#6fa35a';
  const BLUETE = '#ffd23a';
  const KROSPE = '#f472b6';

  // Schlanke Beine mit Wurzelzehen
  for (const s of [1, -1]) {
    t.push(
      stab([s * 0.10, 0.85, 0], [s * 0.10, 0.40, 0.02], 0.08, RINDE, 0.3, 5),
      stab([s * 0.10, 0.40, 0.02], [s * 0.10, 0.06, 0], 0.065, RINDE_H, 0.3, 5),
      // Zarte Wurzelzehen
      stab([s * 0.10, 0.06, 0], [s * 0.08, 0.02, 0.15], 0.035, RINDE, 0.2, 4, 0.2),
      stab([s * 0.10, 0.06, 0], [s * 0.14, 0.02, 0.13], 0.035, RINDE, 0.2, 4, 0.2)
    );
  }

  // Wurzelgewand (lebendige, sich windende Rindenstraenge)
  const anzahlWurzeln = 8;
  for (let i = 0; i < anzahlWurzeln; i++) {
    const phi = (i / anzahlWurzeln) * Math.PI * 2 + 0.25;
    const cP = Math.cos(phi);
    const sP = Math.sin(phi);
    const p0 = [cP * 0.28, 0.80, sP * 0.28];
    const p1 = [cP * 0.48, 0.35, sP * 0.48];
    const p2 = [cP * 0.75, 0.02, sP * 0.75];
    t.push(
      stab(p0, p1, 0.065, RINDE_H, 0.4, 4, 0.8),
      stab(p1, p2, 0.052, RINDE, 0.3, 4, 0.2),
      ['k', [0.035, 4], [cP * 0.75, 0.02, sP * 0.75], RANKEN, 0.6]
    );
  }

  // Rinden-Korsett mit zarten Blattapplikationen
  t.push(
    ['z', [0.18, 0.24, 0.35, 8], [0, 1.05, 0], RINDE_H, 0.4],
    ['z', [0.22, 0.18, 0.32, 8], [0, 1.34, 0], RINDE, 0.4],
    ['k', [0.11, 5], [-0.10, 1.36, 0.12], RANKEN, 0.7],
    ['k', [0.11, 5], [0.10, 1.36, 0.12], RANKEN, 0.7],
    ['k', [0.04, 4], [0, 1.20, 0.20], KROSPE, GLUEHT] // Bluetenknoten
  );

  // Arme und Bluetenstab
  t.push(
    stab([-0.22, 1.38, 0], [-0.30, 1.05, 0.08], 0.06, RINDE_H, 0.3, 5),
    stab([-0.30, 1.05, 0.08], [-0.20, 0.80, 0.20], 0.05, '#c5b08c', 0, 5),
    ['k', [0.045, 5], [-0.20, 0.80, 0.20], '#c5b08c'],
    stab([0.22, 1.38, 0], [0.30, 1.12, 0.12], 0.06, RINDE_H, 0.3, 5),
    stab([0.30, 1.12, 0.12], [0.36, 1.32, 0.28], 0.05, '#c5b08c', 0, 5),
    ['k', [0.045, 5], [0.36, 1.32, 0.28], '#c5b08c'],

    // Gewundener Stab des Lebens mit leuchtendem Bernsteinkern
    stab([0.36, 0.10, 0.28], [0.36, 1.95, 0.28], 0.035, '#483321', 0, 5),
    stab([0.36, 1.95, 0.28], [0.32, 2.22, 0.26], 0.028, '#63472d', 0, 4),
    stab([0.36, 1.95, 0.28], [0.42, 2.22, 0.30], 0.028, '#63472d', 0, 4),
    ['k', [0.08, 6], [0.36, 2.15, 0.28], BLUETE, GLUEHT],
    ['k', [0.042, 5], [0.36, 2.15, 0.28], '#ffffff', GLUEHT],
    ['k', [0.12, 5], [0.36, 1.98, 0.28], RANKEN, 0.5]
  );

  // Kopf, zartes Rindengesicht, Bluetenkrone und herabwallendes Wurzelhaar
  t.push(
    ['z', [0.07, 0.08, 0.14, 6], [0, 1.50, 0], '#b8a07c'],
    ['k', [0.14, 7], [0, 1.64, 0.04], '#c5b08c'],
    // Leuchtende smaragdgruene Augen
    ['k', [0.024, 4], [-0.05, 1.66, 0.16], '#80ff72', GLUEHT],
    ['k', [0.024, 4], [0.05, 1.66, 0.16], '#80ff72', GLUEHT],
    // Bluetenkrone mit zarten Blueten
    ['z', [0.16, 0.16, 0.035, 8], [0, 1.74, 0.03], RANKEN, 0.7],
    ['k', [0.038, 4], [0, 1.76, 0.17], BLUETE, GLUEHT],
    ['k', [0.032, 4], [-0.12, 1.75, 0.12], KROSPE, GLUEHT],
    ['k', [0.032, 4], [0.12, 1.75, 0.12], KROSPE, GLUEHT],
    // Gewelltes Wurzelhaar
    stab([0, 1.74, 0.02], [-0.16, 1.38, -0.14], 0.055, '#3d2818', 0.2, 4, 0.6),
    stab([0, 1.74, 0.02], [0.16, 1.38, -0.14], 0.055, '#3d2818', 0.2, 4, 0.6),
    stab([-0.16, 1.38, -0.14], [-0.20, 0.90, -0.12], 0.042, '#3d2818', 0.2, 4, 0.3),
    stab([0.16, 1.38, -0.14], [0.20, 0.90, -0.12], 0.042, '#3d2818', 0.2, 4, 0.3)
  );

  return t;
}

/** Wolf: Dunkelbrauner, zotteliger Waldwolf mit kraeftiger Maehne, Fangzaehnen, bernsteinfarbenen Augen und 4 artikulierten Beinen. */
function wolfModell() {
  const t = [];
  const W_FELL = '#2e2722';
  const W_DUNKEL = '#1e1a16';
  const W_MAEHE = '#453b34';
  const AUGE_G = '#ffa000';

  // 4 artikulierte Beine mit Muskeln und Pfoten
  for (const s of [1, -1]) {
    // Vorderbeine
    t.push(
      stab([s * 0.24, 0.78, 0.50], [s * 0.24, 0.48, 0.46], 0.095, W_FELL, 0.2, 5),
      stab([s * 0.24, 0.48, 0.46], [s * 0.24, 0.16, 0.54], 0.08, W_DUNKEL, 0.1, 5),
      ['q', [0.12, 0.08, 0.18], [s * 0.24, 0.05, 0.60], '#181411'],
      ['z', [0, 0.04, 0.07, 3], [s * 0.24, 0.04, 0.70], '#181411', 0, [Math.PI / 2, 0, 0]],
      // Hinterbeine (kraeftige Keulen und abgewinkeltes Sprunggelenk)
      stab([s * 0.22, 0.76, -0.50], [s * 0.22, 0.50, -0.36], 0.11, W_FELL, 0.2, 5),
      stab([s * 0.22, 0.50, -0.36], [s * 0.22, 0.25, -0.56], 0.085, W_DUNKEL, 0.1, 5),
      stab([s * 0.22, 0.25, -0.56], [s * 0.22, 0.06, -0.48], 0.075, W_DUNKEL, 0.1, 5),
      ['q', [0.12, 0.08, 0.18], [s * 0.22, 0.05, -0.48], '#181411'],
      ['z', [0, 0.04, 0.07, 3], [s * 0.22, 0.04, -0.40], '#181411', 0, [-Math.PI / 2, 0, 0]]
    );
  }

  // Rumpf & Brustkorb mit dichter Nackenmaehne
  t.push(
    ['z', [0.36, 0.30, 0.72, 8], [0, 0.80, 0.16], W_FELL, 0.25, [0.14, 0, 0]],
    ['z', [0.26, 0.25, 0.62, 8], [0, 0.76, -0.36], W_DUNKEL, 0.25, [-0.14, 0, 0]],
    ['q', [0.34, 0.32, 0.52], [0, 1.02, 0.26], W_MAEHE, 0.3, [-0.28, 0, 0]],
    ['q', [0.30, 0.28, 0.42], [0, 1.15, 0.42], '#52463e', 0.3, [-0.38, 0, 0]],
    // Hals & Kopf
    stab([0, 0.92, 0.40], [0, 1.15, 0.75], 0.24, W_FELL, 0.2, 6),
    ['k', [0.20, 7], [0, 1.22, 0.88], W_DUNKEL, 0.15],
    // Schnauze mit Ober-/Unterkiefer
    ['z', [0.08, 0.15, 0.38, 5], [0, 1.14, 1.18], '#221c18', 0, [Math.PI / 2 + 0.1, 0, 0]],
    ['z', [0.06, 0.11, 0.28, 4], [0, 1.06, 1.16], '#181310', 0, [Math.PI / 2 + 0.15, 0, 0]],
    // Weisse Fangzaehne
    ['z', [0, 0.02, 0.05, 3], [-0.06, 1.07, 1.26], '#f8fafc', 0, [-Math.PI / 2, 0, 0]],
    ['z', [0, 0.02, 0.05, 3], [0.06, 1.07, 1.26], '#f8fafc', 0, [-Math.PI / 2, 0, 0]],
    ['k', [0.042, 5], [0, 1.16, 1.38], '#0d0b09'] // Nasenspiegel
  );

  // Aufgestellte Wolfsohren und glimmende Bernstein-Augen
  for (const s of [1, -1]) {
    t.push(
      ['z', [0, 0.075, 0.22, 4], [s * 0.13, 1.44, 0.84], W_MAEHE, 0, [0.35, 0, s * -0.2]],
      ['z', [0, 0.045, 0.15, 3], [s * 0.13, 1.42, 0.88], '#635347', 0, [0.35, 0, s * -0.2]],
      ['k', [0.038, 4], [s * 0.09, 1.25, 1.00], AUGE_G, GLUEHT],
      ['k', [0.018, 4], [s * 0.09, 1.25, 1.02], '#ffffff', GLUEHT]
    );
  }

  // Buschiger Schweif
  t.push(
    stab([0, 0.80, -0.62], [0, 0.52, -0.98], 0.13, W_FELL, 0.2, 5, 0.75),
    stab([0, 0.52, -0.98], [0, 0.25, -1.18], 0.10, W_DUNKEL, 0.15, 5, 0.5),
    stab([0, 0.25, -1.18], [0, 0.10, -1.30], 0.06, '#473c33', 0.15, 4, 0.15)
  );

  return t;
}

/**
 * Ent nach Vorlage (Ent-Vorlage.webp):
 * Gigantischer, hagerer Waldtitan mit ueberlangen Stelzenbeinen, tiefen Wurzelklauen,
 * gewaltigen Schulter-Astgeweihen bis ueber 6m Hoehe, herabhaengenden Klauenarmen
 * und leeren, bernsteinglimmenden Augen im verwitterten Borkenschaedel.
 */
function entModell() {
  const t = [];
  const BORK_TIEFSCHWARZ = '#18110b';
  const BORK_D = '#281d14';
  const BORK_M = '#3b2b1d';
  const BORK_H = '#543e2a';
  const MOOS = '#3b5c2a';
  const MOOS_H = '#557e3c';
  const AUGE_GLUT = '#f59e0b';

  // 1. Gewaltige ueberlange Stelzenbeine (y = 0 bis 2.7) mit Wurzelkrallen
  for (const s of [1, -1]) {
    // Wurzelbasis / Standfuss mit Mooskragen
    t.push(
      ['z', [0.28, 0.48, 0.35, 7], [s * 0.42, 0.17, 0], BORK_D],
      ['k', [0.32, 6], [s * 0.42, 0.12, 0.05], MOOS, 0.3],
      stab([s * 0.42, 0.22, 0], [s * 0.42 + s * 0.35, 0.02, 0.38], 0.12, BORK_D, 0, 5, 0.2),
      stab([s * 0.42, 0.22, 0], [s * 0.42 - s * 0.25, 0.02, 0.35], 0.11, BORK_D, 0, 5, 0.2),
      stab([s * 0.42, 0.22, 0], [s * 0.42, 0.02, -0.42], 0.13, BORK_D, 0, 5, 0.2),
      stab([s * 0.42, 0.22, 0], [s * 0.42 + s * 0.42, 0.02, -0.15], 0.10, BORK_D, 0, 5, 0.2)
    );

    // Schienbein (geteiltes Holz / Wurzelstraenge)
    t.push(
      stab([s * 0.40, 0.30, 0.04], [s * 0.38, 1.40, 0.02], 0.22, BORK_M, 0, 6, 0.9),
      stab([s * 0.45, 0.35, -0.08], [s * 0.36, 1.35, -0.04], 0.14, BORK_D, 0, 5, 0.8),
      // Moos am Schienbein
      ['k', [0.18, 5], [s * 0.38, 0.75, 0.16], MOOS_H, 0.35]
    );

    // Knorriges Knie
    t.push(
      ['k', [0.26, 6], [s * 0.38, 1.42, 0.06], BORK_D],
      ['z', [0.24, 0.22, 0.25, 5], [s * 0.38, 1.42, 0.08], BORK_H]
    );

    // Langer Oberschenkel (bis y = 2.7)
    t.push(
      stab([s * 0.38, 1.45, 0.04], [s * 0.32, 2.70, 0], 0.26, BORK_M, 0, 6, 0.85),
      stab([s * 0.44, 1.55, -0.06], [s * 0.30, 2.65, -0.04], 0.16, BORK_D, 0, 5, 0.75)
    );
  }

  // 2. Schmaler Beckenansatz & aufstrebender, maechtiger Brustkorb mit Holzspalte
  t.push(
    // Becken / Huefte (schmal und hager)
    ['z', [0.42, 0.48, 0.55, 7], [0, 2.85, 0], BORK_D],
    // Rumpf / Rindenpanzer (breit nach oben ausladend)
    ['z', [0.65, 0.42, 1.15, 8], [0, 3.65, 0.05], BORK_M],
    ['q', [0.35, 1.25, 0.22], [0, 3.65, 0.22], BORK_D],
    // Tiefe Schatten-Spalte / hohle Aushoehlung im Rumpf (wie in der Vorlage)
    ['q', [0.18, 0.85, 0.25], [0, 3.55, 0.32], BORK_TIEFSCHWARZ],
    // Ausladende Rindenplatten und Moos an der Brust
    ['k', [0.32, 6], [-0.35, 3.85, 0.25], MOOS, 0.35],
    ['k', [0.28, 6], [0.38, 3.75, 0.22], MOOS_H, 0.35],
    ['k', [0.25, 6], [0, 4.05, 0.28], MOOS, 0.3]
  );

  // 3. Schultern mit gigantischen Astgeweihen (hochragende Krone ueber 6m)
  for (const s of [1, -1]) {
    // Massive knorrige Holzschulter
    t.push(
      ['k', [0.38, 7], [s * 0.85, 4.35, 0], BORK_D],
      ['z', [0.30, 0.36, 0.55, 6], [s * 0.85, 4.45, 0], BORK_M],
      ['k', [0.26, 5], [s * 0.88, 4.65, 0.12], MOOS_H, 0.35]
    );

    // Hauptbalken des Schulter-Astgeweihs
    t.push(
      stab([s * 0.85, 4.50, 0], [s * 1.15, 5.45, -0.1], 0.16, BORK_D, 0, 5, 0.3),
      stab([s * 1.15, 5.45, -0.1], [s * 1.35, 6.25, -0.05], 0.09, BORK_M, 0, 4, 0.15),
      // Aufsteigende Nebenaeste
      stab([s * 0.95, 4.85, 0.08], [s * 1.25, 5.85, 0.25], 0.11, BORK_D, 0, 4, 0.2),
      stab([s * 1.25, 5.85, 0.25], [s * 1.45, 6.45, 0.40], 0.06, BORK_H, 0, 3, 0.1),
      stab([s * 0.75, 4.65, -0.12], [s * 0.95, 5.65, -0.35], 0.12, BORK_D, 0, 4, 0.2),
      stab([s * 0.95, 5.65, -0.35], [s * 1.10, 6.30, -0.45], 0.06, BORK_M, 0, 3, 0.1),
      stab([s * 1.05, 5.25, -0.05], [s * 1.45, 5.75, 0.05], 0.07, BORK_H, 0, 3, 0.1)
    );

    // 4. Gewaltige herabhaengende Affen-Arme (bis kurz ueber den Boden!)
    // Oberarm (Schulter zu Ellbogen bei y = 2.7)
    t.push(
      stab([s * 0.88, 4.25, 0], [s * 1.25, 2.75, 0.12], 0.25, BORK_M, 0, 6, 0.85),
      stab([s * 0.95, 4.10, -0.08], [s * 1.32, 2.70, 0.04], 0.16, BORK_D, 0, 5, 0.75),
      // Moos am Ellbogen
      ['k', [0.22, 5], [s * 1.28, 2.75, 0.18], MOOS, 0.35]
    );

    // Unterarm (Ellbogen zu Handgelenk bei y = 1.35)
    t.push(
      stab([s * 1.25, 2.75, 0.12], [s * 1.18, 1.40, 0.28], 0.20, BORK_D, 0, 6, 0.8),
      stab([s * 1.30, 2.65, 0.02], [s * 1.22, 1.35, 0.18], 0.13, BORK_M, 0, 5, 0.7),
      // Seitliche Rindensporne / Astknorren am Unterarm
      stab([s * 1.24, 2.15, 0.18], [s * 1.55, 2.45, 0.15], 0.08, BORK_D, 0, 4, 0.15)
    );

    // Riesige Hand & ueberlange Wurzelkrallen-Finger (reichen bis y = 0.35!)
    const hx = s * 1.18;
    const hy = 1.35;
    const hz = 0.28;
    t.push(
      ['k', [0.18, 5], [hx, hy, hz], BORK_D]
    );
    // 4 lange, gekruemmte Wurzelklaue-Finger
    const fingerWinkel = [-0.18, -0.06, 0.06, 0.18];
    for (let f = 0; f < 4; f++) {
      const fw = fingerWinkel[f];
      const mX = hx + fw * 0.25;
      const mY = hy - 0.55;
      const mZ = hz + 0.12 + Math.abs(fw) * 0.1;
      const tX = mX + fw * 0.15;
      const tY = mY - 0.45;
      const tZ = mZ + 0.10;
      t.push(
        stab([hx + fw * 0.12, hy, hz], [mX, mY, mZ], 0.065, BORK_D, 0, 4, 0.3),
        stab([mX, mY, mZ], [tX, tY, tZ], 0.045, BORK_M, 0, 3, 0.15)
      );
    }
  }

  // 5. Versunkener Kopf im Nacken mit leeren, glimmenden Augen
  t.push(
    // Nacken / Hals
    ['z', [0.28, 0.35, 0.45, 6], [0, 4.15, 0.08], BORK_D],
    // Verwitterter Borkenschaedel
    ['k', [0.34, 7], [0, 4.45, 0.18], BORK_D],
    // Tiefe, finstere Augenhoehlen
    ['q', [0.12, 0.08, 0.12], [-0.12, 4.52, 0.46], BORK_TIEFSCHWARZ],
    ['q', [0.12, 0.08, 0.12], [0.12, 4.52, 0.46], BORK_TIEFSCHWARZ],
    // Eerie glimmende Seelen-Funken tief in den Hoehlen (GLUEHT)
    ['k', [0.042, 4], [-0.12, 4.52, 0.48], AUGE_GLUT, GLUEHT],
    ['k', [0.042, 4], [0.12, 4.52, 0.48], AUGE_GLUT, GLUEHT],
    ['k', [0.018, 4], [-0.12, 4.52, 0.50], '#ffffff', GLUEHT],
    ['k', [0.018, 4], [0.12, 4.52, 0.50], '#ffffff', GLUEHT],
    // Aus dem Schaedel spriessende Astkrone
    stab([0, 4.70, 0.15], [-0.25, 5.45, 0.10], 0.07, BORK_D, 0, 4, 0.2),
    stab([-0.25, 5.45, 0.10], [-0.40, 5.95, 0.15], 0.045, BORK_M, 0, 3, 0.1),
    stab([0, 4.70, 0.15], [0.25, 5.45, 0.10], 0.07, BORK_D, 0, 4, 0.2),
    stab([0.25, 5.45, 0.10], [0.40, 5.95, 0.15], 0.045, BORK_M, 0, 3, 0.1),
    stab([0, 4.75, 0.10], [0, 5.60, -0.05], 0.065, BORK_D, 0, 3, 0.15)
  );

  return t;
}

/** Vier Jahreszeiten-Farbpaletten fuer die Waldgeister. */
const WALDGEIST_PALETTEN = {
  fruehling: {
    laub1: '#3f9a35',
    laub2: '#6ec448',
    wams: '#285820',
    stiefel: '#4a3b26',
    haut: '#f2dfc8',
    bogen: '#8a5e32',
    kristall: '#a8f578',
    haare: '#dce8a0',
    augen: '#80ff72'
  },
  sommer: {
    laub1: '#2d6824',
    laub2: '#e0b534',
    wams: '#8f7020',
    stiefel: '#3d2e1c',
    haut: '#ebd1b0',
    bogen: '#784e24',
    kristall: '#ffd23a',
    haare: '#f7e379',
    augen: '#ffea6c'
  },
  herbst: {
    laub1: '#b83b1d',
    laub2: '#d9741e',
    wams: '#632514',
    stiefel: '#382215',
    haut: '#eed8c2',
    bogen: '#543018',
    kristall: '#ff7a29',
    haare: '#c95420',
    augen: '#ffa53a'
  },
  winter: {
    laub1: '#5a788c',
    laub2: '#d8eaf5',
    wams: '#304250',
    stiefel: '#242f38',
    haut: '#edf4fa',
    bogen: '#8fa5b8',
    kristall: '#7be4ff',
    haare: '#ffffff',
    augen: '#9eeeff'
  }
};

/** Waldgeist: Elfenhafter Bogenschuetze in Laubgewand, geschwungenem Elfenbogen und leuchtendem Pfeil. */
function waldgeistModell(pal) {
  const t = [];

  // Schlanke Beine
  for (const s of [1, -1]) {
    t.push(stab([s * 0.12, 0.85, 0], [s * 0.12, 0.45, 0.02], 0.095, pal.wams, 0.3, 6));
    t.push(stab([s * 0.12, 0.45, 0.02], [s * 0.12, 0.08, 0], 0.085, pal.stiefel, 0, 6));
    t.push(['q', [0.11, 0.07, 0.20], [s * 0.12, 0.04, 0.04], '#1a1816']);
  }

  // Geschuppter Laubrock
  t.push(
    ['z', [0.28, 0.36, 0.32, 8], [0, 0.78, 0], pal.laub1, 0.6],
    ['z', [0.27, 0.27, 0.06, 8], [0, 0.94, 0], pal.stiefel],
    ['q', [0.16, 0.22, 0.02], [-0.14, 0.74, 0.24], pal.laub2, 0.8, [0.2, 0, -0.15]],
    ['q', [0.16, 0.22, 0.02], [0.14, 0.74, 0.24], pal.laub2, 0.8, [0.2, 0, 0.15]]
  );

  // Wams mit Blatt-Schulterkappen
  t.push(
    ['z', [0.31, 0.26, 0.50, 8], [0, 1.20, 0], pal.wams, 0.5],
    ['q', [0.18, 0.28, 0.03], [-0.34, 1.44, 0], pal.laub2, 0.8, [0, 0, -0.2]],
    ['q', [0.18, 0.28, 0.03], [0.34, 1.44, 0], pal.laub2, 0.8, [0, 0, 0.2]],
    ['q', [0.36, 0.05, 0.04], [0, 1.44, -0.14], pal.laub2, 0.8],
    ['q', [0.55, 0.85, 0.03], [0, 0.95, -0.22], pal.laub1, 0.6, [-0.14, 0, 0]],
    ['q', [0.65, 0.45, 0.025], [0, 0.48, -0.28], pal.laub2, 0.8, [-0.20, 0, 0]]
  );

  // Koecher mit Lichtpfeil
  t.push(
    stab([0.14, 0.95, -0.18], [0.18, 1.62, -0.22], 0.075, pal.stiefel, 0, 5),
    stab([0.18, 1.60, -0.22], [0.16, 1.88, -0.25], 0.022, pal.bogen),
    ['k', [0.045, 5], [0.16, 1.90, -0.25], pal.kristall, GLUEHT]
  );

  // Bogen und Arme
  t.push(
    stab([-0.30, 1.38, 0], [-0.36, 1.10, 0.16], 0.08, pal.wams, 0.4, 5),
    stab([-0.36, 1.10, 0.16], [-0.32, 1.06, 0.32], 0.068, pal.haut, 0, 5),
    ['k', [0.05, 5], [-0.32, 1.06, 0.32], pal.haut],
    stab([-0.32, 1.06, 0.32], [-0.34, 1.60, 0.24], 0.032, pal.bogen, 0, 4),
    stab([-0.34, 1.60, 0.24], [-0.35, 1.98, 0.12], 0.024, pal.laub2, 0, 4),
    stab([-0.32, 1.06, 0.32], [-0.34, 0.52, 0.24], 0.032, pal.bogen, 0, 4),
    stab([-0.34, 0.52, 0.24], [-0.35, 0.16, 0.12], 0.024, pal.laub2, 0, 4),
    stab([-0.35, 1.98, 0.12], [-0.35, 0.16, 0.12], 0.012, pal.kristall, GLUEHT),
    stab([-0.32, 1.06, 0.32], [-0.32, 1.06, 0.72], 0.020, pal.kristall, GLUEHT),
    ['k', [0.042, 5], [-0.32, 1.06, 0.74], pal.kristall, GLUEHT],
    stab([0.30, 1.38, 0], [0.32, 1.08, 0.10], 0.08, pal.wams, 0.4, 5),
    stab([0.32, 1.08, 0.10], [0.14, 1.08, 0.16], 0.068, pal.haut, 0, 5),
    ['k', [0.05, 5], [0.14, 1.08, 0.16], pal.haut]
  );

  // Kopf, Elfenohren, wehendes Haar und leuchtende Augen
  t.push(
    ['z', [0.08, 0.09, 0.13, 6], [0, 1.48, 0.01], pal.haut],
    ['k', [0.15, 7], [0, 1.64, 0.03], pal.haut],
    ['k', [0.19, 7], [0, 1.67, -0.02], pal.haare],
    ['z', [0.16, 0.16, 0.03, 7], [0, 1.68, 0.03], pal.laub2, 0.8],
    stab([-0.12, 1.65, 0.02], [-0.22, 1.74, -0.04], 0.025, pal.haut, 0, 3, 0.1),
    stab([0.12, 1.65, 0.02], [0.22, 1.74, -0.04], 0.025, pal.haut, 0, 3, 0.1)
  );
  for (const s of [1, -1]) {
    t.push(
      ['k', [0.026, 4], [s * 0.05, 1.65, 0.15], pal.augen, GLUEHT],
      ['k', [0.012, 4], [s * 0.05, 1.65, 0.16], '#ffffff', GLUEHT]
    );
  }

  return t;
}

/** Wurzelbrecher: Gebuecktes vierbeiniges Holz-Ungetuem mit Astzacken auf dem Ruecken, steinbewehrtem Rammschaedel, dicken Wurzelklauen und gluehendem Magmakern. */
function wurzelbrecherModell() {
  const t = [];
  const W_HOLZ = '#2b1f15';
  const W_DUNKEL = '#1d140e';
  const MOOS = '#546b32';
  const FELS_GRAU = '#525750';

  // 4 kraeftige Wurzelstampfer mit Greifklauen
  for (const s of [1, -1]) {
    // Vorderbeine (massive Kniebeugen)
    t.push(
      stab([s * 0.50, 0.95, 0.44], [s * 0.58, 0.48, 0.48], 0.22, W_HOLZ, 0, 6, 1.1),
      stab([s * 0.58, 0.48, 0.48], [s * 0.62, 0.08, 0.52], 0.24, W_DUNKEL, 0, 6, 1.25),
      ['z', [0.24, 0.28, 0.12, 6], [s * 0.62, 0.06, 0.52], '#160e0a'],
      // 3 Wurzelklauen je Vorderfuss
      ['z', [0, 0.06, 0.14, 4], [s * 0.62, 0.04, 0.68], '#160e0a', 0, [Math.PI / 2, 0, 0]],
      ['z', [0, 0.05, 0.12, 4], [s * 0.74, 0.04, 0.62], '#160e0a', 0, [Math.PI / 2, 0, s * 0.4]],
      ['z', [0, 0.05, 0.12, 4], [s * 0.50, 0.04, 0.62], '#160e0a', 0, [Math.PI / 2, 0, -s * 0.4]],

      // Hinterbeine
      stab([s * 0.46, 0.85, -0.44], [s * 0.54, 0.40, -0.48], 0.20, W_HOLZ, 0, 6, 1.1),
      stab([s * 0.54, 0.40, -0.48], [s * 0.56, 0.08, -0.52], 0.22, W_DUNKEL, 0, 6, 1.25),
      ['z', [0.22, 0.26, 0.12, 6], [s * 0.56, 0.06, -0.52], '#160e0a'],
      ['z', [0, 0.06, 0.14, 4], [s * 0.56, 0.04, -0.66], '#160e0a', 0, [-Math.PI / 2, 0, 0]]
    );
  }

  // Burl-Rumpf mit moosigem Buckel
  t.push(
    ['k', [0.68, 8], [0, 0.92, 0.02], W_HOLZ, 0.1],
    ['z', [0.62, 0.52, 1.20, 8], [0, 1.02, 0.05], W_DUNKEL, 0.15, [0.32, 0, 0]],
    ['k', [0.52, 7], [0, 1.30, -0.06], MOOS, 0.3],
    ['k', [0.38, 6], [0.26, 1.20, -0.20], '#637e38', 0.3],
    ['k', [0.38, 6], [-0.26, 1.20, -0.20], '#637e38', 0.3],

    // Magmakern & gluehende Spalten
    ['k', [0.26, 6], [0, 0.80, 0.42], '#ff9800', GLUEHT],
    ['k', [0.16, 5], [0, 0.80, 0.46], '#fff8e7', GLUEHT],
    ['q', [0.08, 0.35, 0.08], [-0.42, 0.85, 0.15], '#ff9800', GLUEHT, [0.3, 0.3, 0]],
    ['q', [0.08, 0.35, 0.08], [0.42, 0.85, 0.15], '#ff9800', GLUEHT, [0.3, -0.3, 0]],
    // Schutzrippen aus verhaertetem Kernholz
    stab([-0.35, 1.05, 0.38], [0, 0.72, 0.50], 0.06, W_DUNKEL),
    stab([0.35, 1.05, 0.38], [0, 0.72, 0.50], 0.06, W_DUNKEL),

    // Astzacken & Dornenspieße auf dem Rueckgrat
    stab([0, 1.40, 0.18], [0.10, 2.05, 0.14], 0.09, W_DUNKEL, 0, 5, 0.1),
    stab([0, 1.42, -0.08], [-0.14, 2.15, -0.14], 0.095, W_DUNKEL, 0, 5, 0.1),
    stab([0.20, 1.30, -0.16], [0.38, 1.95, -0.22], 0.08, W_HOLZ, 0, 4, 0.1),
    stab([-0.20, 1.30, -0.16], [-0.38, 1.95, -0.22], 0.08, W_HOLZ, 0, 4, 0.1),
    stab([0, 1.25, -0.45], [0, 1.82, -0.58], 0.085, W_DUNKEL, 0, 4, 0.1),

    // Rammschaedel mit massivem Granitsporn
    ['z', [0.38, 0.28, 0.65, 7], [0, 0.82, 0.72], W_HOLZ, 0.1, [0.72, 0, 0]],
    ['q', [0.56, 0.44, 0.34], [0, 0.86, 0.88], '#18100a'],
    // Granit-Rammsporn
    ['z', [0, 0.28, 0.42, 5], [0, 0.86, 1.12], FELS_GRAU, 0, [Math.PI / 2 + 0.15, 0, 0]],
    ['k', [0.18, 5], [0, 0.88, 1.04], '#3d423b']
  );
  for (const s of [1, -1]) {
    t.push(
      ['k', [0.05, 4], [s * 0.20, 0.88, 0.88], '#ffa000', GLUEHT],
      ['k', [0.024, 4], [s * 0.20, 0.88, 0.90], '#ffffff', GLUEHT]
    );
  }

  return t;
}

/** Balliste (katapult): Fahrbare Belagerungsballiste auf 4 eisenbereiften Speichenraedern mit Eichen-Lafette, Doppelbogen, Spannwinde und wuchtigem Belagerungsbolzen. */
/** Balliste (katapult): Fahrbare Belagerungsballiste auf 4 eisenbereiften Speichenraedern mit Eichen-Lafette, Torsionsbuendeln, Doppelbogen, Spannwinde und wuchtigem Belagerungsbolzen. */
function ballisteModell() {
  const t = [];
  const EICHE = '#5c4028';
  const EICHE_D = '#3a2717';
  const METALL = '#3a4047';
  const SEIL = '#a3845b';

  // 4 Raeder mit Naben, Holzspeichen und Eisenbeschlag
  for (const [rx, rz] of [[0.65, 0.58], [-0.65, 0.58], [0.65, -0.58], [-0.65, -0.58]]) {
    // Eisenbereifung & Felge
    t.push(
      ['z', [0.35, 0.35, 0.11, 12], [rx, 0.34, rz], METALL, 0, [Math.PI / 2, 0, 0]],
      ['z', [0.30, 0.30, 0.09, 10], [rx, 0.34, rz], EICHE, 0, [Math.PI / 2, 0, 0]],
      ['z', [0.10, 0.10, 0.15, 6], [rx, 0.34, rz], METALL, 0, [Math.PI / 2, 0, 0]]
    );
    // 4 Holzspeichen je Rad
    for (let sp = 0; sp < 4; sp++) {
      const wnk = (sp / 4) * Math.PI;
      const c = Math.cos(wnk), s = Math.sin(wnk);
      t.push(stab([rx, 0.34 - s * 0.26, rz - c * 0.26], [rx, 0.34 + s * 0.26, rz + c * 0.26], 0.042, EICHE_D));
    }
  }

  // Schwerer Eichen-Fahrgestellrahmen mit Eckbeschlaegen
  t.push(
    stab([-0.65, 0.34, 0.58], [0.65, 0.34, 0.58], 0.11, EICHE_D),
    stab([-0.65, 0.34, -0.58], [0.65, 0.34, -0.58], 0.11, EICHE_D),
    stab([-0.42, 0.38, -0.85], [-0.42, 0.38, 0.75], 0.13, EICHE),
    stab([0.42, 0.38, -0.85], [0.42, 0.38, 0.75], 0.13, EICHE),
    stab([-0.42, 0.38, 0], [0.42, 0.38, 0], 0.11, EICHE_D),
    ['q', [0.16, 0.16, 0.16], [-0.42, 0.38, 0.75], METALL],
    ['q', [0.16, 0.16, 0.16], [0.42, 0.38, 0.75], METALL],
    ['q', [0.16, 0.16, 0.16], [-0.42, 0.38, -0.85], METALL],
    ['q', [0.16, 0.16, 0.16], [0.42, 0.38, -0.85], METALL],
    // Eisenband-Verstaerkungen
    ['q', [0.03, 0.14, 0.35], [-0.43, 0.38, 0], METALL],
    ['q', [0.03, 0.14, 0.35], [0.43, 0.38, 0], METALL]
  );

  // Pfeilrinne (Lafettenwiege) mit Richtkeil
  t.push(
    stab([-0.28, 0.40, 0.35], [-0.22, 0.88, 0.35], 0.09, EICHE),
    stab([0.28, 0.40, 0.35], [0.22, 0.88, 0.35], 0.09, EICHE),
    stab([-0.28, 0.40, -0.50], [-0.22, 0.65, -0.50], 0.09, EICHE),
    stab([0.28, 0.40, -0.50], [0.22, 0.65, -0.50], 0.09, EICHE),
    // Fuehrungsbalken und staehlerne Pfeilnut
    stab([0, 0.68, -0.80], [0, 0.94, 0.82], [0.26, 0.14], EICHE),
    stab([0, 0.74, -0.80], [0, 1.00, 0.82], [0.10, 0.05], METALL),
    // Querriegel am Kopf
    ['q', [0.84, 0.22, 0.16], [0, 0.94, 0.75], EICHE_D],
    ['q', [0.45, 0.28, 0.05], [0, 0.72, 0.70], '#d8b06a', 0.9],
    // Richtkeil unter der Rinne
    ['z', [0, 0.14, 0.32, 4], [0, 0.62, 0.15], EICHE_D, 0, [Math.PI / 2, 0, 0]],

    // Torsionsbuendel (gedrehte Seilstraenge in Bronzebuechsen)
    ['z', [0.12, 0.12, 0.32, 8], [-0.34, 0.94, 0.75], SEIL],
    ['z', [0.14, 0.14, 0.06, 6], [-0.34, 1.12, 0.75], '#b45309'],
    ['z', [0.14, 0.14, 0.06, 6], [-0.34, 0.76, 0.75], '#b45309'],
    ['z', [0.12, 0.12, 0.32, 8], [0.34, 0.94, 0.75], SEIL],
    ['z', [0.14, 0.14, 0.06, 6], [0.34, 1.12, 0.75], '#b45309'],
    ['z', [0.14, 0.14, 0.06, 6], [0.34, 0.76, 0.75], '#b45309'],

    // Verbundboegen (Esche & Horn)
    stab([-0.40, 0.94, 0.75], [-1.05, 0.98, 0.45], 0.08, '#634427', 0, 5),
    stab([-1.05, 0.98, 0.45], [-1.48, 1.02, 0.05], 0.06, '#7a5532', 0, 5),
    ['k', [0.065, 5], [-1.48, 1.02, 0.05], METALL],
    stab([0.40, 0.94, 0.75], [1.05, 0.98, 0.45], 0.08, '#634427', 0, 5),
    stab([1.05, 0.98, 0.45], [1.48, 1.02, 0.05], 0.06, '#7a5532', 0, 5),
    ['k', [0.065, 5], [1.48, 1.02, 0.05], METALL],

    // Dicke Bogensehne
    stab([-1.48, 1.02, 0.05], [0, 0.82, -0.35], 0.018, '#ede8db'),
    stab([1.48, 1.02, 0.05], [0, 0.82, -0.35], 0.018, '#ede8db'),

    // Spannwinde mit Zahnrad, Sperrklinke und Doppel-Handkurbel
    ['z', [0.07, 0.07, 0.65, 6], [0, 0.68, -0.78], METALL, 0, [0, 0, Math.PI / 2]],
    ['z', [0.15, 0.15, 0.05, 10], [0.18, 0.68, -0.78], '#64748b', 0, [0, 0, Math.PI / 2]], // Zahnrad
    ['q', [0.04, 0.24, 0.04], [0.35, 0.76, -0.78], HOLZ],
    ['q', [0.04, 0.24, 0.04], [-0.35, 0.60, -0.78], HOLZ],
    ['k', [0.035, 4], [0.35, 0.88, -0.78], METALL],
    ['k', [0.035, 4], [-0.35, 0.48, -0.78], METALL],

    // Eingelegter Belagerungsbolzen mit Stahlspitze und Lederfiedern
    stab([0, 0.84, -0.30], [0, 1.06, 1.15], 0.055, HOLZ, 0, 5),
    ['z', [0, 0.13, 0.38, 4], [0, 1.10, 1.32], '#dce2e8', 0, [Math.PI / 2 + 0.14, 0, 0]],
    ['q', [0.22, 0.22, 0.02], [0, 0.85, -0.25], '#c2b396'],
    ['q', [0.02, 0.22, 0.22], [0, 0.85, -0.25], '#c2b396']
  );

  return t;
}

/** Halle (Thingstätte): Grosses Hauptgebaeude der Menschen mit Fachwerk, Schindeldach, Steinstufen, Kaminglut und Prunkbannern. */
function halleModell() {
  const t = [];
  const WAND = '#dfd6c8';
  const BALKEN = '#4a331c';
  const DACH = '#8c2f2f';
  const STEIN_F = '#484d47';
  const FENSTER_GLUT = '#fef08a';

  // 1. Feldstein-Fundamentsockel mit Eingangsstufen
  t.push(
    ['q', [2.3, 0.25, 1.9], [0, 0.125, 0], STEIN_F],
    ['q', [2.15, 0.15, 1.75], [0, 0.28, 0], '#5a6059'],
    // Eingangsstufen
    ['q', [0.85, 0.10, 0.40], [0, 0.05, 1.05], STEIN_F],
    ['q', [0.75, 0.10, 0.30], [0, 0.15, 0.98], '#5a6059']
  );

  // 2. Fachwerk-Erdgeschoss mit Holztor, Fenstern und Versteifungsstreben
  t.push(
    ['q', [1.95, 0.85, 1.55], [0, 0.78, 0], WAND],
    // Eckpfosten
    ['q', [0.12, 0.90, 0.12], [0.98, 0.80, 0.78], BALKEN],
    ['q', [0.12, 0.90, 0.12], [-0.98, 0.80, 0.78], BALKEN],
    ['q', [0.12, 0.90, 0.12], [0.98, 0.80, -0.78], BALKEN],
    ['q', [0.12, 0.90, 0.12], [-0.98, 0.80, -0.78], BALKEN],
    // Raehm- und Schwellerbalken
    ['q', [2.05, 0.10, 0.08], [0, 0.82, 0.79], BALKEN],
    ['q', [2.05, 0.10, 0.08], [0, 0.82, -0.79], BALKEN],
    ['q', [0.08, 0.10, 1.65], [0.99, 0.82, 0], BALKEN],
    ['q', [0.08, 0.10, 1.65], [-0.99, 0.82, 0], BALKEN],
    // Diagonale Andreaskreuze / Streben an der Front
    stab([-0.90, 0.40, 0.79], [-0.45, 1.15, 0.79], 0.055, BALKEN),
    stab([-0.45, 0.40, 0.79], [-0.90, 1.15, 0.79], 0.055, BALKEN),
    stab([0.90, 0.40, 0.79], [0.45, 1.15, 0.79], 0.055, BALKEN),
    stab([0.45, 0.40, 0.79], [0.90, 1.15, 0.79], 0.055, BALKEN),
    // Holztor mit Eisenbeschlag
    ['q', [0.58, 0.75, 0.06], [0, 0.65, 0.80], '#382212'],
    ['q', [0.60, 0.05, 0.07], [0, 0.85, 0.80], EISEN],
    ['q', [0.60, 0.05, 0.07], [0, 0.45, 0.80], EISEN],
    ['z', [0.06, 0.06, 0.08, 6], [0.18, 0.62, 0.84], '#ffd23a', GLUEHT],
    // Warm erleuchtete Sprossenfenster
    ['q', [0.26, 0.32, 0.04], [-0.68, 0.82, 0.80], FENSTER_GLUT, GLUEHT],
    ['q', [0.26, 0.32, 0.04], [0.68, 0.82, 0.80], FENSTER_GLUT, GLUEHT]
  );

  // 3. Grosses Schindeldach mit Firstbalken und Ziergiebeln
  t.push(
    ['z', [0.15, 1.40, 1.05, 4], [0, 1.72, 0], DACH, 0.6, [0, Math.PI / 4, 0]],
    ['q', [2.25, 0.12, 0.16], [0, 2.22, 0], BALKEN],
    ['z', [0, 0.14, 0.50, 4], [0, 2.38, 0.86], BALKEN, 0, [0.35, 0, 0]],
    ['z', [0, 0.14, 0.50, 4], [0, 2.38, -0.86], BALKEN, 0, [-0.35, 0, 0]],
    // Dachgauben
    ['z', [0.05, 0.28, 0.25, 4], [0.60, 1.70, 0.65], DACH, 0.6, [0.4, 0, 0]],
    ['z', [0.05, 0.28, 0.25, 4], [-0.60, 1.70, 0.65], DACH, 0.6, [0.4, 0, 0]]
  );

  // 4. Steinkamin mit Kaminglut und Funken
  t.push(
    ['q', [0.46, 1.95, 0.46], [0.65, 1.30, -0.45], STEIN_F],
    ['q', [0.52, 0.12, 0.52], [0.65, 2.30, -0.45], '#656b63'],
    ['k', [0.15, 6], [0.65, 2.40, -0.45], '#ff9800', GLUEHT],
    ['k', [0.06, 4], [0.65, 2.65, -0.45], '#ffd23a', GLUEHT]
  );

  // 5. Vordach-Eingang und symmetrische Prunkbanner
  t.push(
    ['q', [0.95, 0.08, 0.50], [0, 1.18, 1.00], BALKEN, 0, [0.25, 0, 0]],
    stab([-0.42, 0.25, 1.20], [-0.42, 1.18, 1.20], 0.07, BALKEN),
    stab([0.42, 0.25, 1.20], [0.42, 1.18, 1.20], 0.07, BALKEN),
    // Rechte Bannerstange
    stab([0.65, 0.25, 0.90], [0.65, 2.05, 0.90], 0.045, HOLZ),
    ['k', [0.05, 4], [0.65, 2.08, 0.90], GOLD, GLUEHT],
    ['q', [0.38, 0.65, 0.03], [0.84, 1.65, 0.90], '#d8b06a', 0.95],
    // Linke Bannerstange
    stab([-0.65, 0.25, 0.90], [-0.65, 2.05, 0.90], 0.045, HOLZ),
    ['k', [0.05, 4], [-0.65, 2.08, 0.90], GOLD, GLUEHT],
    ['q', [0.38, 0.65, 0.03], [-0.84, 1.65, 0.90], '#d8b06a', 0.95]
  );

  return t;
}

/** Grenzstein: Monolithischer Anker mit Runengravuren, Eisenklammern und Fahnenstandarte. */
function grenzsteinModell() {
  const t = [];
  const STEIN_D = '#4e544d';
  const STEIN_M = '#687067';
  const STEIN_H = '#828a80';

  t.push(
    ['z', [0.85, 1.05, 0.25, 8], [0, 0.125, 0], STEIN_D],
    ['z', [0.68, 0.85, 0.20, 8], [0, 0.32, 0], STEIN_M],
    ['z', [0.35, 0.55, 1.85, 6], [0, 1.30, 0], STEIN_H],
    ['z', [0, 0.35, 0.45, 6], [0, 2.38, 0], STEIN_D],
    ['z', [0.48, 0.48, 0.08, 6], [0, 0.90, 0], EISEN],
    ['z', [0.40, 0.40, 0.08, 6], [0, 1.70, 0], EISEN],
    ['q', [0.06, 0.45, 0.03], [0, 1.35, 0.45], '#ffd23a', GLUEHT],
    ['q', [0.18, 0.06, 0.03], [0, 1.45, 0.45], '#ffd23a', GLUEHT],
    ['q', [0.14, 0.05, 0.03], [0, 1.25, 0.45], '#ffd23a', GLUEHT],
    stab([0.35, 1.80, 0], [0.35, 2.95, 0], 0.045, HOLZ),
    ['k', [0.065, 5], [0.35, 2.98, 0], GOLD, GLUEHT],
    ['q', [0.55, 0.42, 0.03], [0.65, 2.65, 0], '#d8b06a', 0.95]
  );

  return t;
}

/** Wachturm: Runder Wehrturm mit Auskragung, Eichen-Wehrgang, Zinnen, Schindeldach und Signalbecken. */
function wachturmModell() {
  const t = [];
  const STEIN_T = '#5d635c';
  const BALKEN = '#4a331c';
  const DACH = '#8c2f2f';

  // 1. Mauerwerk-Sockel und Turmschaft
  t.push(
    ['z', [0.88, 1.10, 0.50, 12], [0, 0.25, 0], '#484e47'],
    ['z', [0.74, 0.88, 2.20, 12], [0, 1.55, 0], STEIN_T]
  );

  // Schiessscharten in alle 4 Himmelsrichtungen
  for (let i = 0; i < 4; i++) {
    const phi = (i / 4) * Math.PI * 2;
    t.push(['q', [0.06, 0.35, 0.12], [Math.cos(phi) * 0.78, 1.60, Math.sin(phi) * 0.78], '#1a1816', 0, [0, -phi, 0]]);
  }

  // 2. Kragsteine (Kragbalken) unter der Wehrplattform
  for (let i = 0; i < 10; i++) {
    const phi = (i / 10) * Math.PI * 2;
    t.push(['q', [0.14, 0.24, 0.26], [Math.cos(phi) * 0.78, 2.65, Math.sin(phi) * 0.78], '#383e37', 0, [0, -phi, 0.25]]);
  }

  // 3. Auskragender Holz-Wehrgang mit Schindeln und Scharten
  t.push(
    ['z', [1.10, 0.98, 0.15, 12], [0, 2.75, 0], BALKEN],
    ['z', [1.06, 1.06, 0.55, 12], [0, 3.05, 0], BALKEN]
  );
  for (let i = 0; i < 6; i++) {
    const phi = (i / 6) * Math.PI * 2;
    t.push(['q', [0.22, 0.32, 0.08], [Math.cos(phi) * 1.06, 3.12, Math.sin(phi) * 1.06], '#1a1816', 0, [0, -phi, 0]]);
  }

  // 4. Zeltdach, Wetterfahne und Signalbecken
  t.push(
    ['z', [0.10, 1.20, 0.95, 12], [0, 3.80, 0], DACH, 0.6],
    stab([0, 4.25, 0], [0, 4.90, 0], 0.035, EISEN),
    ['k', [0.06, 5], [0, 4.90, 0], GOLD, GLUEHT],
    ['q', [0.36, 0.22, 0.02], [0.20, 4.75, 0], '#d8b06a', 0.95],
    // Leuchtendes Signalbecken (Alarmfeuer)
    ['z', [0.14, 0.08, 0.18, 6], [0.85, 3.10, 0], EISEN],
    ['k', [0.09, 5], [0.85, 3.22, 0], '#ff8c00', GLUEHT]
  );

  return t;
}

/** Schmiede: Steinsockel, Esse mit Kohleglut, Amboss, Hammer und Wassertrog unter Pultdach. */
function schmiedeModell() {
  const t = [];
  const STEIN_S = '#58524a';
  const BALKEN = '#4e3825';

  t.push(
    // Pflastersteinboden
    ['q', [2.1, 0.18, 1.9], [0, 0.09, 0], '#3a342e'],

    // Esse (Schmiedefeuer) mit gemauerter Haube
    ['q', [0.90, 0.95, 0.90], [0.55, 0.55, -0.42], STEIN_S],
    ['q', [0.70, 0.12, 0.70], [0.55, 1.06, -0.42], '#70685e'],
    ['q', [0.55, 0.08, 0.55], [0.55, 0.98, -0.42], '#ff5722', GLUEHT],
    ['k', [0.20, 6], [0.55, 1.02, -0.42], '#ffeb3b', GLUEHT],
    ['z', [0.24, 0.32, 1.40, 8], [0.55, 1.78, -0.42], STEIN_S],
    ['z', [0.36, 0.26, 0.16, 8], [0.55, 2.50, -0.42], '#3a342e'],

    // Massiver Amboss auf Eichenholzklotz
    ['z', [0.24, 0.26, 0.44, 8], [-0.35, 0.30, 0.25], '#5a402a'],
    ['q', [0.28, 0.20, 0.48], [-0.35, 0.58, 0.25], EISEN],
    ['z', [0, 0.11, 0.24, 4], [-0.35, 0.58, 0.56], '#8b949e', 0, [Math.PI / 2, 0, 0]], // Amboss-Horn
    ['q', [0.08, 0.06, 0.16], [-0.35, 0.58, -0.04], EISEN], // Amboss-Finne
    // Vorschlaghammer auf dem Amboss
    stab([-0.42, 0.70, 0.22], [-0.18, 0.70, 0.22], 0.022, HOLZ),
    ['q', [0.07, 0.06, 0.06], [-0.42, 0.70, 0.22], EISEN],

    // Kuehltrog mit Wasser
    ['q', [0.46, 0.40, 0.80], [0.75, 0.28, 0.35], '#422c1b'],
    ['q', [0.40, 0.06, 0.74], [0.75, 0.38, 0.35], '#38bdf8', 0.2],

    // Zimmermanns-Pultdach mit Balkenstuetzen
    stab([-0.90, 0.18, 0.80], [-0.90, 1.50, 0.80], 0.11, BALKEN),
    stab([0.90, 0.18, 0.80], [0.90, 1.50, 0.80], 0.11, BALKEN),
    stab([-0.90, 0.18, -0.80], [-0.90, 1.50, -0.80], 0.11, BALKEN),
    ['q', [2.2, 0.10, 2.0], [0, 1.66, 0], '#5c3a24', 0.5, [0.12, 0, 0]],
    ['q', [0.06, 0.12, 2.0], [-0.90, 1.70, 0], BALKEN, 0, [0.12, 0, 0]]
  );

  return t;
}

/** Sägewerk: Zimmermannsgeruest mit rollendem Holzstamm, rotierendem Saegeblatt, Schnittholzstapel und Wasserrad. */
function saegeModell() {
  const t = [];
  const BALKEN = '#583e25';
  const BALKEN_H = '#725232';

  t.push(
    ['q', [2.1, 0.16, 1.9], [0, 0.08, 0], '#3e2b19'],

    // Saegebock und Stammbett
    stab([-0.65, 0.25, 0], [0.65, 0.25, 0], [0.24, 0.22], BALKEN),
    // Zu saegender Baumstamm
    ['z', [0.22, 0.22, 1.90, 8], [0, 0.48, 0], '#6e4c2b', 0, [Math.PI / 2, 0, 0]],
    ['z', [0.20, 0.20, 0.02, 8], [0, 0.48, 0.96], '#dfc49c', 0, [Math.PI / 2, 0, 0]],

    // Grosses staehlernes Kreissaegeblatt
    ['z', [0.50, 0.50, 0.03, 14], [0, 0.65, 0], '#c2cbd4', 0, [0, 0, Math.PI / 2]],
    ['z', [0.12, 0.12, 0.09, 8], [0, 0.65, 0], '#3a4047', 0, [0, 0, Math.PI / 2]],

    // Wasserrad an der Flanke mit 8 Schaufeln
    ['z', [0.65, 0.65, 0.22, 10], [1.14, 0.62, 0], '#422c19', 0, [0, 0, Math.PI / 2]],
    ['z', [0.75, 0.75, 0.04, 10], [1.14, 0.62, 0], '#5a3d24', 0, [0, 0, Math.PI / 2]],
    ['z', [0.08, 0.08, 0.45, 6], [0.95, 0.62, 0], EISEN, 0, [0, 0, Math.PI / 2]],

    // Schnittholz-Stapel (Brettstapel)
    ['q', [0.45, 0.35, 0.60], [-0.70, 0.28, 0.55], '#cbb28d'],
    ['q', [0.42, 0.04, 0.58], [-0.70, 0.48, 0.55], '#dfc49c'],

    // Tragende Zimmererbalken
    stab([-0.88, 0.16, 0.70], [-0.88, 1.40, 0.70], 0.11, BALKEN),
    stab([-0.88, 0.16, -0.70], [-0.88, 1.40, -0.70], 0.11, BALKEN),
    stab([0.88, 0.16, 0.70], [0.88, 1.40, 0.70], 0.11, BALKEN),
    stab([0.88, 0.16, -0.70], [0.88, 1.40, -0.70], 0.11, BALKEN),
    ['q', [2.2, 0.08, 1.8], [0, 1.52, 0], BALKEN_H, 0.5, [0.1, 0, 0]]
  );

  return t;
}

/** Kaserne: Wehrhafte Garnison mit Steinsockel, Fachwerk, Uebungsplatz, Waffenstaender und Wehrbalkon. */
function kaserneModell() {
  const t = [];
  const BRUCHSTEIN = '#555b54';
  const BALKEN = '#4a331c';
  const WAND = '#ded6c7';
  const DACH = '#8c2f2f';

  t.push(
    // 1. Mauerwerksockel & Fachwerkbau
    ['q', [2.35, 0.65, 1.55], [0, 0.325, 0], BRUCHSTEIN],
    ['q', [2.25, 0.70, 1.45], [0, 0.98, 0], WAND],
    // Fachwerkbalken
    ['q', [0.11, 0.70, 0.11], [1.12, 0.98, 0.72], BALKEN],
    ['q', [0.11, 0.70, 0.11], [-1.12, 0.98, 0.72], BALKEN],
    ['q', [0.11, 0.70, 0.11], [1.12, 0.98, -0.72], BALKEN],
    ['q', [0.11, 0.70, 0.11], [-1.12, 0.98, -0.72], BALKEN],

    // 2. Walmdach mit Gaube
    ['z', [0.15, 1.50, 0.80, 4], [0, 1.68, 0], DACH, 0.6, [0, Math.PI / 4, 0]],
    ['q', [0.40, 0.32, 0.40], [0, 1.68, 0.72], DACH, 0.6],

    // 3. Uebungsplatz: Waffenstaender mit Piken & Schilden
    stab([0.65, 0.1, 0.98], [0.65, 0.60, 0.98], 0.055, BALKEN),
    stab([1.20, 0.1, 0.98], [1.20, 0.60, 0.98], 0.055, BALKEN),
    stab([0.60, 0.48, 0.98], [1.25, 0.48, 0.98], 0.045, BALKEN),
    // Ruhende Speere im Staender
    stab([0.72, 0.1, 0.98], [0.72, 1.30, 0.98], 0.028, HOLZ),
    ['z', [0, 0.04, 0.12, 4], [0.72, 1.35, 0.98], EISEN],
    stab([0.92, 0.1, 0.98], [0.92, 1.30, 0.98], 0.028, HOLZ),
    ['z', [0, 0.04, 0.12, 4], [0.92, 1.35, 0.98], EISEN],
    stab([1.12, 0.1, 0.98], [1.12, 1.30, 0.98], 0.028, HOLZ),
    ['z', [0, 0.04, 0.12, 4], [1.12, 1.35, 0.98], EISEN],

    // Stroh-Uebungspuppe
    stab([-0.88, 0.1, 0.98], [-0.88, 0.95, 0.98], 0.075, HOLZ),
    ['q', [0.58, 0.09, 0.09], [-0.88, 0.78, 0.98], HOLZ],
    ['k', [0.14, 6], [-0.88, 1.08, 0.98], '#c2b08a'], // Strohkopf
    ['z', [0.18, 0.22, 0.35, 6], [-0.88, 0.75, 0.98], '#a3906b'], // Strohleib

    // Fahnenmast mit wehendem Banner
    stab([0, 0.65, 0.85], [0, 2.25, 0.85], 0.050, HOLZ),
    ['k', [0.06, 5], [0, 2.28, 0.85], GOLD, GLUEHT],
    ['q', [0.52, 0.70, 0.03], [0.28, 1.82, 0.85], '#d8b06a', 0.95]
  );

  return t;
}

/** Blutschacht: Steingefasste Foerderanlage mit A-Foerderbock, Seilscheibe, Foerderseil und Goetterblut-Kuebel. */
function schachtModell() {
  const t = [];
  const STEIN_M = '#4a444d';
  const BALKEN = '#4a3525';
  const BLUT_L = '#ef4444';

  t.push(
    // 1. Schachtmund mit Mauerfassung und Grubenhund-Geleisen
    ['z', [1.02, 1.22, 0.35, 10], [0, 0.175, 0], STEIN_M],
    ['z', [0.86, 0.86, 0.15, 10], [0, 0.35, 0], '#635c67'],
    ['z', [0.72, 0.42, 0.50, 10], [0, 0.05, 0], '#18121d'],
    // Gruben-Schienen
    stab([-0.25, 0.35, 0.85], [-0.25, 0.35, 1.35], 0.025, EISEN),
    stab([0.25, 0.35, 0.85], [0.25, 0.35, 1.35], 0.025, EISEN),

    // 2. Leuchtende Goetterblut-Kristallformationen in der Tiefe
    ['z', [0, 0.28, 0.75, 5], [0, 0.45, 0], BLUT_L, GLUEHT],
    ['z', [0, 0.16, 0.55, 5], [0.22, 0.35, 0.12], '#dc2626', GLUEHT, [0.2, 0.3, 0]],
    ['z', [0, 0.15, 0.50, 5], [-0.20, 0.32, -0.15], '#dc2626', GLUEHT, [-0.2, -0.3, 0]],

    // 3. A-Foerderbock aus schweren Eichenbalken mit Streben
    stab([-0.70, 0.35, 0.58], [-0.25, 2.25, 0], 0.11, BALKEN),
    stab([-0.70, 0.35, -0.58], [-0.25, 2.25, 0], 0.11, BALKEN),
    stab([0.70, 0.35, 0.58], [0.25, 2.25, 0], 0.11, BALKEN),
    stab([0.70, 0.35, -0.58], [0.25, 2.25, 0], 0.11, BALKEN),
    // Quertraeger und Querstreben
    stab([-0.35, 2.25, 0], [0.35, 2.25, 0], 0.12, BALKEN),
    stab([-0.50, 1.25, 0.35], [-0.50, 1.25, -0.35], 0.08, BALKEN),
    stab([0.50, 1.25, 0.35], [0.50, 1.25, -0.35], 0.08, BALKEN),

    // 4. Gusseiserne Seilscheibe (Foerderrad)
    ['z', [0.32, 0.32, 0.07, 10], [0, 2.15, 0], EISEN, 0, [0, 0, Math.PI / 2]],
    ['z', [0.08, 0.08, 0.22, 6], [0, 2.15, 0], '#334155', 0, [0, 0, Math.PI / 2]],
    // Foerderseil
    stab([0, 2.15, 0], [0, 1.05, 0], 0.025, '#c5cbd2'),

    // 5. Massiver Erzkuebel mit funkelnden Goetterblut-Kristallen
    ['z', [0.26, 0.18, 0.36, 8], [0, 0.88, 0], EISEN],
    ['k', [0.15, 6], [0, 1.05, 0], BLUT_L, GLUEHT],
    ['k', [0.08, 5], [0.06, 1.12, 0.05], '#ffffff', GLUEHT]
  );

  return t;
}

/** Kriegsbanner: Achteckiges Steinpodest mit prachtvoll herabwallender Standarte. */
function bannerModell() {
  const t = [];
  const STEIN_S = '#585e56';

  t.push(
    ['z', [0.75, 0.95, 0.25, 8], [0, 0.125, 0], STEIN_S],
    ['z', [0.55, 0.70, 0.20, 8], [0, 0.32, 0], '#727970'],
    ['z', [0.35, 0.42, 0.15, 8], [0, 0.48, 0], '#8a9288'],
    stab([0, 0.45, 0], [0, 3.10, 0], 0.065, HOLZ),
    ['k', [0.11, 6], [0, 3.16, 0], GOLD, GLUEHT],
    ['z', [0, 0.12, 0.25, 4], [0, 3.32, 0], GOLD, GLUEHT],
    ['q', [0.12, 0.06, 1.25], [0, 2.95, 0.58], HOLZ],
    ['q', [0.04, 1.45, 1.15], [0, 2.15, 0.58], '#d8b06a', 0.95],
    ['q', [0.05, 1.25, 0.22], [0, 2.22, 0.58], '#ffffff', 0.1],
    ['q', [0.05, 0.06, 1.15], [0, 1.40, 0.58], GOLD, GLUEHT]
  );

  return t;
}

/** Kapelle: Gotisches Gotteshaus mit Strebepfeilern, Schieferdach, Glockentuermchen und Rosette. */
function kapelleModell() {
  const t = [];
  const STEIN_K = '#ded8cc';
  const STEIN_D = '#756f64';
  const DACH = '#4a505b';

  t.push(
    ['q', [1.4, 0.22, 1.8], [0, 0.11, 0], STEIN_D],
    ['q', [1.2, 0.95, 1.6], [0, 0.68, 0], STEIN_K],
    ['q', [0.18, 0.95, 0.18], [0.65, 0.68, 0.8], STEIN_D],
    ['q', [0.18, 0.95, 0.18], [-0.65, 0.68, 0.8], STEIN_D],
    ['q', [0.18, 0.95, 0.18], [0.65, 0.68, -0.8], STEIN_D],
    ['q', [0.18, 0.95, 0.18], [-0.65, 0.68, -0.8], STEIN_D],
    ['z', [0.12, 0.95, 0.72, 4], [0, 1.48, 0], DACH, 0.5, [0, Math.PI / 4, 0]],
    ['q', [0.10, 0.08, 1.75], [0, 1.84, 0], STEIN_D],
    ['q', [0.38, 0.55, 0.38], [0, 1.95, 0.45], STEIN_K],
    ['z', [0, 0.32, 0.55, 4], [0, 2.45, 0.45], DACH, 0.5, [0, Math.PI / 4, 0]],
    ['k', [0.08, 5], [0, 1.95, 0.45], GOLD, GLUEHT],
    stab([0, 2.70, 0.45], [0, 3.05, 0.45], 0.03, GOLD, GLUEHT),
    ['q', [0.22, 0.03, 0.03], [0, 2.95, 0.45], GOLD, GLUEHT],
    ['q', [0.42, 0.65, 0.04], [0, 0.55, 0.81], '#382214'],
    ['k', [0.18, 6], [0, 1.05, 0.81], '#d8b06a', 0.8]
  );

  return t;
}

/** Skriptorium: Kloeoesterliche Schreibstube mit Erker-Lesefenster, Pergamentpult und Bibliotheksturm. */
function skriptoriumModell() {
  const t = [];
  const STEIN_S = '#c8beae';
  const BALKEN = '#4e3825';
  const DACH = '#5c4535';

  t.push(
    ['q', [1.6, 0.22, 1.3], [0, 0.11, 0], '#63594d'],
    ['q', [1.4, 0.95, 1.1], [0, 0.68, 0], STEIN_S],
    ['z', [0.12, 1.05, 0.65, 4], [0, 1.45, 0], DACH, 0.4, [0, Math.PI / 4, 0]],
    ['q', [0.55, 0.55, 0.22], [0, 0.75, 0.62], BALKEN],
    ['q', [0.45, 0.45, 0.04], [0, 0.75, 0.74], '#ffd23a', GLUEHT],
    ['q', [0.42, 0.04, 0.18], [0, 0.60, 0.62], '#3a2617'],
    ['k', [0.045, 5], [0.12, 0.66, 0.62], '#ffd54f', GLUEHT],
    ['z', [0.32, 0.36, 1.65, 7], [0.65, 0.95, -0.35], STEIN_S],
    ['z', [0, 0.42, 0.55, 7], [0.65, 2.05, -0.35], DACH, 0.4],
    ['k', [0.06, 5], [0.65, 2.35, -0.35], GOLD, GLUEHT]
  );

  return t;
}

/** Herzbaum: Gigantischer Urbaum mit Wurzelarmen, pulsierendem Magmakern, Runenadern und kaskadierender Laubkrone. */
function herzbaumModell() {
  const t = [];
  const STAMM = '#422c1b';
  const STAMM_D = '#281a0e';
  const LAUB_G1 = '#2d5e23';
  const LAUB_G2 = '#498c36';
  const GLUT = '#ff9800';
  const GOLD_SAFT = '#ffd23a';

  // 1. Gewaltiger Ur-Stamm mit Verjuengung
  t.push(
    ['z', [0.60, 1.05, 1.6, 12], [0, 0.85, 0], STAMM],
    ['z', [0.46, 0.60, 1.4, 12], [0, 2.25, 0.05], STAMM_D]
  );

  // 2. Acht maechtige Wurzelarme, die Felsen und Boden umklammern
  for (let i = 0; i < 8; i++) {
    const phi = (i / 8) * Math.PI * 2 + 0.20;
    const c = Math.cos(phi);
    const s = Math.sin(phi);
    t.push(
      stab([c * 0.80, 0.80, s * 0.80], [c * 1.45, 0.28, s * 1.45], 0.24, STAMM_D, 0, 6, 0.75),
      stab([c * 1.45, 0.28, s * 1.45], [c * 2.05, 0.02, s * 2.05], 0.18, STAMM, 0, 5, 0.2),
      // Moosige Felsen zwischen den Wurzeln
      ['k', [0.24, 5], [c * 1.30, 0.16, s * 1.30], '#4b5548', 0.2]
    );
  }

  // 3. Goldene Saftadern im Stamm (spiralförmig aufsteigend)
  for (let i = 0; i < 6; i++) {
    const w = (i / 6) * Math.PI * 2;
    const yH = 0.6 + i * 0.32;
    const rH = 0.85 - i * 0.06;
    t.push(
      ['q', [0.06, 0.28, 0.06], [Math.cos(w) * rH, yH, Math.sin(w) * rH], GOLD_SAFT, GLUEHT, [0, -w, 0.35]]
    );
  }

  // 4. Hoehle mit pulsierendem Magmakern (Herz des Waldes)
  t.push(
    ['k', [0.42, 8], [0, 1.45, 0.38], GLUT, GLUEHT],
    ['k', [0.26, 7], [0, 1.45, 0.46], '#fff8e7', GLUEHT],
    // Schutzwurzeln vor dem Herzen
    stab([-0.24, 1.75, 0.44], [0.24, 1.15, 0.46], 0.085, STAMM_D),
    stab([-0.24, 1.15, 0.44], [0.24, 1.75, 0.46], 0.085, STAMM_D)
  );

  // 5. Verzweigtes Astwerk
  for (const s of [1, -1]) {
    t.push(
      stab([0, 2.6, 0], [s * 0.90, 3.45, 0.25], 0.30, STAMM, 0, 6, 0.65),
      stab([s * 0.90, 3.45, 0.25], [s * 1.35, 4.10, 0.40], 0.20, STAMM_D, 0, 5, 0.4),
      stab([0, 2.6, 0], [s * 0.40, 3.55, -0.70], 0.28, STAMM, 0, 6, 0.65)
    );
  }

  // 6. Gewaltige, gestaffelte Laubkronen mit Bluetenlichtern
  t.push(
    ['k', [1.45, 10], [0, 3.9, 0], LAUB_G1, 0.3],
    ['k', [1.15, 9], [0.90, 3.6, 0.28], LAUB_G2, 0.35],
    ['k', [1.15, 9], [-0.90, 3.6, 0.28], LAUB_G2, 0.35],
    ['k', [1.05, 8], [0, 3.7, -0.90], LAUB_G1, 0.3],
    ['k', [0.95, 8], [0, 4.8, 0.12], LAUB_G2, 0.35],
    // Leuchtende Bluetensterne im Blaetterdach
    ['k', [0.14, 5], [0.75, 3.25, 0.85], '#ffd23a', GLUEHT],
    ['k', [0.14, 5], [-0.75, 3.25, 0.85], '#ffd23a', GLUEHT],
    ['k', [0.14, 5], [0, 4.45, 0.65], '#ffd23a', GLUEHT],
    ['k', [0.12, 5], [0.95, 4.10, -0.40], '#ffd23a', GLUEHT],
    ['k', [0.12, 5], [-0.95, 4.10, -0.40], '#ffd23a', GLUEHT]
  );

  return t;
}

/** Hain: Heiliger Dreier-Baumhain mit gewundenen Staemmen, Trauerweiden-Kronen und Quellkristall. */
function hainModell() {
  const t = [];
  const BARK = '#453020';
  const LAUB1 = '#326826';
  const LAUB2 = '#529638';

  const baeume = [
    [0.45, 0, 0.95],
    [-0.45, 0.35, 0.85],
    [0, -0.45, 0.90]
  ];
  for (let b = 0; b < baeume.length; b++) {
    const [bx, bz, hScale] = baeume[b];
    t.push(
      stab([bx * 1.3, 0.05, bz * 1.3], [bx, 0.8 * hScale, bz], 0.16, BARK, 0, 5, 0.75),
      stab([bx, 0.8 * hScale, bz], [bx * 0.7, 1.7 * hScale, bz * 0.7], 0.13, BARK, 0, 5, 0.65),
      ['k', [0.65 * hScale, 7], [bx * 0.7, 1.9 * hScale, bz * 0.7], b % 2 ? LAUB1 : LAUB2, 0.35],
      ['k', [0.45 * hScale, 6], [bx * 0.9, 1.6 * hScale, bz * 0.9], LAUB2, 0.35],
      ['k', [0.08, 4], [bx * 0.8, 1.4 * hScale, bz * 0.8], '#c2f099', GLUEHT]
    );
  }

  t.push(
    ['k', [0.85, 7], [0, 0.18, 0], '#3a5824', 0.25],
    ['k', [0.14, 5], [0.25, 0.32, 0.15], '#7be4ff', GLUEHT]
  );

  return t;
}

/** Wächterbaum: Knorriger Baumwaechter mit Dornenkrone, Rindenantlitz und 4 glimmenden Bernstein-Augen. */
function waechterbaumModell() {
  const t = [];
  const BARK_D = '#241a12';
  const AUGE = '#ffd23a';

  t.push(
    ['z', [0.36, 0.58, 2.2, 8], [0, 1.1, 0], BARK_D],
    ['z', [0.28, 0.36, 0.8, 8], [0, 2.4, 0], '#18120b']
  );

  // Knorrige Wurzeln am Boden
  for (let i = 0; i < 6; i++) {
    const phi = (i / 6) * Math.PI * 2;
    t.push(
      stab([Math.cos(phi) * 0.48, 0.45, Math.sin(phi) * 0.48], [Math.cos(phi) * 1.05, 0.02, Math.sin(phi) * 1.05], 0.15, BARK_D, 0, 5, 0.15)
    );
  }

  // Hoch aufragende Dornenspieße & Abschußhuelsen
  const dornen = [
    [0.45, 2.3, 0.1, 0.85, -0.65],
    [-0.45, 2.3, 0.1, 0.85, 0.65],
    [0.1, 2.4, 0.45, 0.65, 0.85],
    [0.1, 2.4, -0.45, -0.65, -0.85],
    [0.28, 2.7, 0.28, 0.75, -0.45],
    [-0.28, 2.7, -0.28, -0.75, 0.45]
  ];
  for (const [dx, dy, dz, rx, rz] of dornen) {
    t.push(
      stab([dx, dy, dz], [dx + rx * 0.65, dy + 0.85, dz + rz * 0.65], 0.085, BARK_D, 0, 4, 0.1),
      ['k', [0.035, 4], [dx + rx * 0.65, dy + 0.85, dz + rz * 0.65], '#ff9800', GLUEHT]
    );
  }

  // Antlitz im Stamm mit tiefliegenden Bernstein-Augen
  t.push(
    ['q', [0.24, 0.10, 0.14], [0, 1.88, 0.40], '#18120b'], // Braue
    ['k', [0.065, 5], [0.12, 1.75, 0.36], AUGE, GLUEHT],
    ['k', [0.065, 5], [-0.12, 1.75, 0.36], AUGE, GLUEHT],
    ['k', [0.024, 4], [0.12, 1.75, 0.39], '#ffffff', GLUEHT],
    ['k', [0.024, 4], [-0.12, 1.75, 0.39], '#ffffff', GLUEHT],
    // Rueckwaertige Wachaugen
    ['k', [0.060, 5], [0.32, 1.75, -0.14], AUGE, GLUEHT],
    ['k', [0.060, 5], [-0.32, 1.75, -0.14], AUGE, GLUEHT]
  );

  return t;
}

/** Quellgrund: Gestuftes Steinbecken, Menhire mit Runen, Seerosen und leuchtendes Quellwasser. */
function quelleModell() {
  const t = [];
  const STEIN_Q = '#525a58';
  const WASSER = '#38bdf8';

  // 1. Gestuftes Natursteinbecken
  t.push(
    ['z', [1.20, 1.30, 0.22, 12], [0, 0.11, 0], STEIN_Q],
    ['z', [0.98, 1.08, 0.18, 12], [0, 0.25, 0], '#636c6a'],
    // Kristallklare Wasserflaeche
    ['z', [0.92, 0.92, 0.05, 12], [0, 0.26, 0], WASSER, GLUEHT]
  );

  // 2. 6 uralte Runen-Menhire im Kreis
  for (let i = 0; i < 6; i++) {
    const phi = (i / 6) * Math.PI * 2;
    const c = Math.cos(phi);
    const s = Math.sin(phi);
    t.push(
      ['z', [0.16, 0.24, 0.88, 6], [c * 1.08, 0.46, s * 1.08], '#424a48', 0, [s * 0.15, 0, -c * 0.15]],
      ['k', [0.06, 4], [c * 1.08, 0.92, s * 1.08], '#80ff72', GLUEHT],
      ['q', [0.04, 0.25, 0.04], [c * 0.98, 0.55, s * 0.98], '#80ff72', GLUEHT, [0, -phi, 0]]
    );
  }

  // 3. Sprudelnde Quelle in der Mitte mit Seerosen
  t.push(
    ['k', [0.24, 7], [0, 0.32, 0], '#3a4240'],
    ['k', [0.16, 6], [0, 0.48, 0], '#e0f2fe', GLUEHT],
    // Seerosen-Blaetter und Blueten
    ['z', [0.14, 0.14, 0.015, 6], [0.45, 0.28, 0.25], '#2d6a26'],
    ['k', [0.04, 4], [0.45, 0.31, 0.25], '#f472b6', GLUEHT],
    ['z', [0.12, 0.12, 0.015, 6], [-0.40, 0.28, -0.30], '#2d6a26'],
    ['k', [0.035, 4], [-0.40, 0.31, -0.30], '#fbcfe8', GLUEHT]
  );

  return t;
}

/** Moosgrube: Torfterrassen mit Moosteppich und leuchtenden Sporenkappen. */
function moosModell() {
  const t = [];
  const MOOS1 = '#3d632c';
  const MOOS2 = '#588a38';
  const PILZ1 = '#38bdf8';
  const PILZ2 = '#a855f7';

  t.push(
    ['z', [1.15, 1.35, 0.25, 10], [0, 0.125, 0], '#2c2218'],
    ['k', [0.98, 8], [0, 0.25, 0], MOOS1, 0.3],
    ['k', [0.68, 7], [0.35, 0.45, 0.15], MOOS2, 0.35],
    ['k', [0.58, 7], [-0.35, 0.38, -0.2], MOOS1, 0.3]
  );

  const pilze = [
    [0.45, 0.65, 0.28, 0.15, PILZ1],
    [-0.25, 0.55, 0.35, 0.13, PILZ2],
    [0.10, 0.52, -0.42, 0.16, PILZ1],
    [-0.45, 0.48, -0.15, 0.12, PILZ2],
    [0.28, 0.42, -0.18, 0.10, '#34d399'],
    [-0.10, 0.44, 0.52, 0.11, '#fbbf24']
  ];
  for (const [px, py, pz, rP, farbe] of pilze) {
    t.push(
      stab([px, py - 0.12, pz], [px, py, pz], 0.04, '#e2e8f0'),
      ['k', [rP, 5], [px, py + 0.04, pz], farbe, GLUEHT],
      ['k', [rP * 0.45, 4], [px, py + 0.08, pz], '#ffffff', GLUEHT]
    );
  }

  return t;
}

/** Dickicht: Undurchdringliche Brombeer- und Dornenfestung mit Tierschaedel-Totem und goldenen Knospen. */
function dickichtModell() {
  const t = [];
  const DORN = '#2c1e14';
  const LAUB1 = '#285420';
  const LAUB2 = '#427830';
  const BLUETE = '#ffd23a';

  // Dichtes Gestruepp-Dach
  t.push(
    ['k', [0.88, 8], [0.35, 0.55, 0.1], LAUB1, 0.3],
    ['k', [0.84, 8], [-0.35, 0.50, 0.2], LAUB2, 0.3],
    ['k', [0.86, 8], [0, 0.62, -0.42], LAUB1, 0.3],
    ['k', [0.70, 7], [0, 1.00, 0.15], LAUB2, 0.35]
  );

  // Gewundene Dornenboegen
  for (let i = 0; i < 6; i++) {
    const phi = (i / 6) * Math.PI * 2;
    const c = Math.cos(phi), s = Math.sin(phi);
    t.push(
      stab([c * 0.95, 0.1, s * 0.95], [c * 0.55, 1.20, s * 0.55], 0.085, DORN, 0, 5, 0.7),
      ['k', [0.09, 4], [c * 0.55, 1.22, s * 0.55], BLUETE, GLUEHT]
    );
  }

  // Tierschaedel-Totem am Eingang (mit gluehenden Augen)
  t.push(
    stab([0, 0.1, 0.85], [0, 0.95, 0.85], 0.055, '#3a2717'),
    ['k', [0.12, 5], [0, 0.98, 0.88], '#e2e8f0'], // Schaedel
    ['z', [0.04, 0.08, 0.14, 4], [0, 0.94, 0.98], '#cbd5e1', 0, [Math.PI / 2, 0, 0]],
    ['k', [0.028, 4], [-0.05, 1.00, 0.96], BLUETE, GLUEHT],
    ['k', [0.028, 4], [0.05, 1.00, 0.96], BLUETE, GLUEHT]
  );

  return t;
}

/** Blutwurz: Schlingende Urwurzeln um riesigen glutroten Goetterblut-Kristall mit pulsierenden Adern. */
function blutwurzModell() {
  const t = [];
  const WURZ = '#3a2618';
  const WURZ_D = '#23150c';
  const BLUT_K = '#ef4444';

  t.push(['k', [0.90, 8], [0, 0.22, 0], WURZ_D]);

  // 6 schlingende Wurzelgreifer
  for (let i = 0; i < 6; i++) {
    const phi = (i / 6) * Math.PI * 2;
    const c = Math.cos(phi);
    const s = Math.sin(phi);
    t.push(
      stab([c * 0.80, 0.15, s * 0.80], [c * 0.38, 0.80, s * 0.38], 0.18, WURZ, 0, 5, 0.8),
      stab([c * 0.38, 0.80, s * 0.38], [-s * 0.28, 1.35, c * 0.28], 0.13, WURZ_D, 0, 4, 0.3)
    );
  }

  // Kristallspitzencluster des Goetterbluts
  t.push(
    ['z', [0, 0.38, 1.55, 6], [0, 1.00, 0], BLUT_K, GLUEHT],
    ['z', [0, 0.24, 1.05, 5], [0.28, 0.80, 0.18], '#dc2626', GLUEHT, [-0.2, 0.4, 0.2]],
    ['z', [0, 0.22, 0.95, 5], [-0.25, 0.75, -0.18], '#b91c1c', GLUEHT, [0.3, -0.3, -0.2]],
    ['z', [0, 0.18, 0.80, 5], [0.10, 0.70, -0.25], '#ef4444', GLUEHT, [-0.3, -0.2, 0.3]],
    // Glimmende Tropfen/Sporen
    ['k', [0.08, 4], [0.28, 1.35, 0.18], '#ff8c00', GLUEHT],
    ['k', [0.08, 4], [-0.25, 1.25, -0.18], '#ff8c00', GLUEHT]
  );

  return t;
}

/** Dornenschrein: Schrein des Zorns mit loderndem Feuerbecken und hochragenden, gekruemmten Eisenholzdornen. */
function dornenschreinModell() {
  const t = [];
  const DORN = '#261b14';
  const FEUER = '#ff9800';

  // Sockel und gemauertes Opferbecken
  t.push(
    ['z', [0.80, 1.05, 0.35, 8], [0, 0.175, 0], '#3a342e'],
    ['z', [0.60, 0.75, 0.25, 8], [0, 0.45, 0], '#221a14'],
    ['z', [0.46, 0.32, 0.32, 8], [0, 0.70, 0], EISEN],
    ['k', [0.30, 7], [0, 0.88, 0], FEUER, GLUEHT],
    ['k', [0.18, 6], [0, 0.96, 0], '#fff8e7', GLUEHT],
    // Aufsteigende Flammenzungen
    ['z', [0, 0.14, 0.35, 4], [0, 1.15, 0], '#ff5722', GLUEHT],
    ['z', [0, 0.08, 0.28, 4], [0.10, 1.10, 0.08], '#ffeb3b', GLUEHT],
    ['z', [0, 0.08, 0.28, 4], [-0.10, 1.10, -0.08], '#ffeb3b', GLUEHT]
  );

  // 6 hoch aufragende, sich zur Mitte kruemmende Dornenkrallen
  const pfeiler = [
    [0.55, 0.55, 0.9, -0.25],
    [-0.55, 0.55, 0.9, 0.25],
    [0.55, -0.55, -0.9, -0.25],
    [-0.55, -0.55, -0.9, 0.25],
    [0, 0.75, 1.05, 0],
    [0, -0.75, -1.05, 0]
  ];
  for (const [px, pz, hP, rotZ] of pfeiler) {
    t.push(
      stab([px, 0.35, pz], [px * 0.7, 1.9 + hP * 0.3, pz * 0.7], 0.15, DORN, 0, 5, 0.65),
      stab([px * 0.7, 1.9 + hP * 0.3, pz * 0.7], [px * 0.35, 2.4 + hP * 0.3, pz * 0.35], 0.10, DORN, 0, 4, 0.2),
      ['k', [0.065, 4], [px * 0.35, 2.42 + hP * 0.3, pz * 0.35], '#ffd23a', GLUEHT]
    );
  }

  return t;
}

/** Steinkreis: Schrein der Wehr mit 8 Menhiren, leuchtenden Schutzrunen, Dolmentisch und schwebender Sphaere. */
function steinkreisModell() {
  const t = [];
  const MEGALITH = '#606963';
  const MEGALITH_D = '#434b46';
  const RUNEN = '#80ff72';

  // Geweihter Grashuegel
  t.push(['z', [1.35, 1.45, 0.14, 12], [0, 0.07, 0], '#2e4526', 0.3]);

  // 8 monumentale Megalithen im Ring
  for (let i = 0; i < 8; i++) {
    const phi = (i / 8) * Math.PI * 2;
    const c = Math.cos(phi);
    const s = Math.sin(phi);
    const h = 1.15 + ((i * 17) % 5) * 0.12;
    t.push(
      ['q', [0.30, h, 0.24], [c * 1.08, h / 2 + 0.06, s * 1.08], i % 2 ? MEGALITH : MEGALITH_D, 0, [0, -phi, 0.08]],
      // Vertikale Schutzrunen-Gravur (GLUEHT)
      ['q', [0.04, 0.35, 0.04], [c * 0.96, h * 0.60, s * 0.96], RUNEN, GLUEHT, [0, -phi, 0]],
      ['k', [0.065, 4], [c * 0.96, h * 0.85, s * 0.96], RUNEN, GLUEHT]
    );
  }

  // Zentraler Dolmen-Opfertisch (zwei Tragsteine, ein Deckstein)
  t.push(
    ['q', [0.20, 0.50, 0.20], [-0.32, 0.25, 0], MEGALITH_D],
    ['q', [0.20, 0.50, 0.20], [0.32, 0.25, 0], MEGALITH_D],
    ['q', [0.95, 0.16, 0.60], [0, 0.58, 0], MEGALITH],
    // Magisch schwebende Kristallkugel
    ['k', [0.18, 7], [0, 0.92, 0], '#9eeeff', GLUEHT],
    ['k', [0.09, 5], [0, 0.92, 0], '#ffffff', GLUEHT]
  );

  return t;
}

/** Raunende Eiche: Ur-Eiche mit gewaltiger Krone, Greisengesicht im Stamm, Wurzeladern und goldenen Weisheitsrunen. */
function eicheModell() {
  const t = [];
  const STAMM = '#483321';
  const STAMM_D = '#2f2014';
  const LAUB_E1 = '#285222';
  const LAUB_E2 = '#3e7534';
  const GOLD_RUNEN = '#ffd23a';

  // 1. Knorriger Eichenstamm
  t.push(
    ['z', [0.68, 0.98, 1.8, 10], [0, 0.9, 0], STAMM],
    ['z', [0.54, 0.68, 1.2, 10], [0, 2.2, 0], STAMM_D]
  );
  // 6 maechtige Strebewurzeln
  for (let i = 0; i < 6; i++) {
    const phi = (i / 6) * Math.PI * 2 + 0.3;
    t.push(
      stab([Math.cos(phi) * 0.78, 0.65, Math.sin(phi) * 0.78], [Math.cos(phi) * 1.45, 0.02, Math.sin(phi) * 1.45], 0.24, STAMM_D, 0, 5, 0.2)
    );
  }

  // 2. Greisenantlitz im Holz
  t.push(
    ['z', [0.24, 0.14, 0.38, 6], [0, 1.05, 0.70], '#24180e'], // Kinn/Bart
    ['k', [0.22, 6], [0, 1.34, 0.66], STAMM],
    // Leuchtende Augen der Weisheit
    ['k', [0.048, 4], [-0.10, 1.38, 0.84], GOLD_RUNEN, GLUEHT],
    ['k', [0.048, 4], [0.10, 1.38, 0.84], GOLD_RUNEN, GLUEHT],
    ['k', [0.020, 4], [-0.10, 1.38, 0.87], '#ffffff', GLUEHT],
    ['k', [0.020, 4], [0.10, 1.38, 0.87], '#ffffff', GLUEHT],
    // In die Borke gekerbte Runenzeichen
    ['q', [0.05, 0.35, 0.03], [0.32, 1.65, 0.54], GOLD_RUNEN, GLUEHT, [0, 0.4, 0]],
    ['q', [0.05, 0.28, 0.03], [-0.32, 1.75, 0.54], GOLD_RUNEN, GLUEHT, [0, -0.4, 0]]
  );

  // 3. Ausladende, verzweigte Eichenkrone
  t.push(
    ['k', [1.50, 9], [0, 3.2, 0], LAUB_E1, 0.3],
    ['k', [1.20, 9], [0.95, 2.9, 0.35], LAUB_E2, 0.35],
    ['k', [1.20, 9], [-0.95, 2.9, -0.35], LAUB_E2, 0.35],
    ['k', [1.10, 8], [0, 2.8, 0.95], LAUB_E2, 0.35],
    ['k', [1.10, 8], [0, 2.8, -0.95], LAUB_E1, 0.3],
    ['k', [1.00, 8], [0, 4.1, 0], LAUB_E2, 0.35],
    // Leuchtende Weisheitslaternen in den Zweigen
    ['k', [0.12, 5], [0.60, 3.1, 0.98], GOLD_RUNEN, GLUEHT],
    ['k', [0.12, 5], [-0.70, 3.3, 0.88], GOLD_RUNEN, GLUEHT],
    ['k', [0.12, 5], [0, 4.15, 0.85], GOLD_RUNEN, GLUEHT],
    ['k', [0.10, 4], [0.85, 3.5, -0.45], GOLD_RUNEN, GLUEHT]
  );

  return t;
}

/** Baugeruest: Holzgeruest mit Leitern, Plattformen und Kranarm um ein Gebaeude vom Radius 1. */
function baugeruestModell() {
  const t = [];
  const HOLZ_P = '#6e4726';
  const HOLZ_B = '#8a5c32';
  const SEIL = '#d4c29a';

  // 4 vertikale Eckpfosten um Radius ~0.9
  const pfosten = [
    [0.82, 0.82], [-0.82, 0.82], [-0.82, -0.82], [0.82, -0.82]
  ];
  for (const [px, pz] of pfosten) {
    t.push(['z', [0.06, 0.07, 2.2, 5], [px, 1.1, pz], HOLZ_P]);
  }

  // Horizontale Riegel auf 2 Etagen (y=0.75 und y=1.5)
  for (let k = 0; k < 4; k++) {
    const p1 = pfosten[k];
    const p2 = pfosten[(k + 1) % 4];
    t.push(
      stab([p1[0], 0.75, p1[1]], [p2[0], 0.75, p2[1]], 0.05, HOLZ_P, 0, 4),
      stab([p1[0], 1.5, p1[1]], [p2[0], 1.5, p2[1]], 0.05, HOLZ_P, 0, 4)
    );
  }

  // Diagonale Kreuzstreben an 3 Seiten
  for (let k = 0; k < 3; k++) {
    const p1 = pfosten[k];
    const p2 = pfosten[(k + 1) % 4];
    t.push(
      stab([p1[0], 0.1, p1[1]], [p2[0], 1.45, p2[1]], 0.04, HOLZ_B, 0, 4),
      stab([p1[0], 1.45, p1[1]], [p2[0], 0.1, p2[1]], 0.04, HOLZ_B, 0, 4)
    );
  }

  // Arbeitsbohlen / Geruestbretter auf der 1. und 2. Ebene
  t.push(
    ['q', [1.75, 0.05, 0.35], [0, 0.77, 0.7], HOLZ_B],
    ['q', [0.35, 0.05, 1.75], [-0.7, 0.77, 0], HOLZ_B],
    ['q', [1.75, 0.05, 0.35], [0, 1.52, -0.7], HOLZ_B],
    ['q', [0.35, 0.05, 1.75], [0.7, 1.52, 0], HOLZ_B]
  );

  // Anlege-Leiter an der 4. Seite (von Boden zu Ebene 1)
  const lX = 0.88;
  t.push(
    stab([lX, 0, -0.2], [lX, 1.6, -0.1], 0.035, HOLZ_P, 0, 4),
    stab([lX, 0, 0.2], [lX, 1.6, 0.3], 0.035, HOLZ_P, 0, 4)
  );
  for (let s = 1; s <= 6; s++) {
    const hy = s * 0.23;
    t.push(['q', [0.03, 0.03, 0.38], [lX, hy, 0.05], HOLZ_B]);
  }

  // Ausleger-Kranarm oben mit Seil und Moertelkuebel
  t.push(
    ['q', [0.06, 0.06, 0.7], [0.82, 2.22, 0.55], HOLZ_P],
    ['q', [0.02, 0.55, 0.02], [0.82, 1.95, 0.85], SEIL],
    ['z', [0.12, 0.09, 0.18, 5], [0.82, 1.65, 0.85], '#524538']
  );

  return t;
}

/** Truemmer: Schutt, gebrochene Balken, Mauerwerk und glimmende Brandnester (flach). */
function truemmerModell() {
  const t = [];
  const SCHUTT = '#4d4842';
  const STEIN_D = '#5e656b';
  const STEIN_H = '#7e8790';
  const BALKEN = '#3b281a';
  const KOHLE = '#1c1510';
  const GLUT = '#ff5722';

  // Flacher Schutthaufen im Zentrum
  t.push(
    ['z', [0.72, 0.95, 0.16, 8], [0, 0.08, 0], SCHUTT],
    ['z', [0.45, 0.65, 0.14, 7], [0.1, 0.18, -0.05], '#38332c']
  );

  // Gebrochene, verkohlte Holzbalken
  t.push(
    ['q', [0.14, 0.12, 1.3], [0.15, 0.18, 0.1], BALKEN, 0, [0.12, 0.65, 0.15]],
    ['q', [0.12, 0.11, 1.1], [-0.2, 0.16, -0.15], KOHLE, 0, [-0.1, -0.85, 0.2]],
    ['q', [0.12, 0.1, 0.85], [0.35, 0.12, -0.3], BALKEN, 0, [0.2, 0.3, -0.1]],
    ['q', [0.1, 0.09, 0.75], [-0.35, 0.12, 0.35], KOHLE, 0, [-0.15, 1.2, 0.1]]
  );

  // Zerschlagene Mauerwerk-Quader
  t.push(
    ['q', [0.38, 0.28, 0.32], [-0.4, 0.18, -0.35], STEIN_D, 0, [0.1, 0.4, 0.1]],
    ['q', [0.32, 0.24, 0.35], [0.45, 0.16, 0.35], STEIN_H, 0, [-0.15, 0.55, -0.1]],
    ['q', [0.25, 0.22, 0.28], [0.55, 0.14, -0.15], STEIN_D, 0, [0.2, -0.3, 0.2]],
    ['q', [0.28, 0.2, 0.25], [-0.5, 0.14, 0.2], STEIN_H, 0, [-0.2, 0.7, -0.1]],
    ['k', [0.18, 5], [0.05, 0.24, -0.4], STEIN_D],
    ['k', [0.15, 5], [-0.15, 0.22, 0.45], STEIN_H]
  );

  // Glimmende Brandnester / Glutnester
  t.push(
    ['k', [0.09, 4], [0.12, 0.22, 0.05], GLUT, GLUEHT],
    ['k', [0.07, 4], [-0.18, 0.19, -0.1], GLUT, GLUEHT],
    ['k', [0.06, 4], [0.28, 0.16, -0.22], GLUT, GLUEHT]
  );

  return t;
}

/** Fels: Markante, kantige Granit-Felsformation mit Schichtungen, Geroellkragen und Moosspalten. */
function felsModell() {
  const t = [];
  const FELS_B = '#383b38';
  const FELS_M = '#4d524e';
  const FELS_H = '#666d67';
  const FELS_L = '#7c857e';
  const SCHIEFER = '#323533';
  const MOOS = '#2d3824';
  const QUARZ = '#94a09a';

  // 1. Verwitterter Sockel & Geroellkranz am Boden (Moos und Schutt)
  t.push(
    ['z', [0.82, 0.96, 0.30, 8], [0, 0.15, 0], MOOS],
    ['z', [0.65, 0.88, 0.45, 8], [0.04, 0.35, -0.02], FELS_B],
    // Geroellbrocken am Hangfuss
    ['q', [0.34, 0.22, 0.38], [0.55, 0.11, 0.42], FELS_M, 0, [0.15, 0.6, 0.1]],
    ['q', [0.38, 0.25, 0.32], [-0.52, 0.12, 0.45], FELS_H, 0, [-0.2, -0.4, 0.15]],
    ['q', [0.42, 0.20, 0.35], [-0.45, 0.10, -0.55], FELS_M, 0, [0.2, 0.8, -0.1]],
    ['q', [0.36, 0.22, 0.40], [0.52, 0.11, -0.48], FELS_H, 0, [-0.15, -0.7, 0.2]]
  );

  // 2. Massiver Hauptpfeiler mit steilen Facetten und Bruchspalten
  t.push(
    ['z', [0.42, 0.72, 1.45, 7], [-0.05, 0.85, 0.05], FELS_M, 0, [0.06, 0.3, -0.04]],
    ['z', [0.18, 0.48, 1.15, 6], [0.12, 1.10, -0.12], FELS_H, 0, [-0.08, 0.9, 0.12]],
    ['z', [0.04, 0.28, 0.75, 5], [0.18, 1.65, -0.15], FELS_L, 0, [-0.05, 0.5, 0.08]]
  );

  // 3. Markante Felsflanken und Schichtbloecke
  t.push(
    ['q', [0.72, 0.95, 0.62], [-0.28, 0.65, 0.18], SCHIEFER, 0, [0.12, 0.45, 0.18]],
    ['q', [0.65, 0.78, 0.68], [0.35, 0.55, -0.12], FELS_M, 0, [-0.18, -0.35, 0.08]],
    ['q', [0.48, 0.58, 0.52], [-0.25, 0.45, -0.35], FELS_H, 0, [0.22, 0.65, -0.15]],
    ['q', [0.55, 0.62, 0.48], [0.28, 0.42, 0.32], FELS_M, 0, [-0.12, -0.6, 0.2]],
    ['q', [0.12, 0.85, 0.06], [-0.08, 0.85, 0.42], QUARZ, 0, [0.1, 0.3, 0.22]],
    ['q', [0.28, 0.08, 0.32], [0.25, 0.95, 0.12], MOOS, 0, [-0.1, 0.4, 0.05]],
    ['q', [0.24, 0.08, 0.28], [-0.15, 1.15, -0.18], MOOS, 0, [0.15, -0.5, -0.1]]
  );

  return t;
}

/** Baum: Alter Waldbaum mit Wurzelanlaeufen, geschwungenem Stamm, Astgabeln und dichter Krone. */
function baumModell() {
  const t = [];
  const STAMM = '#48321e';
  const STAMM_D = '#322013';
  const MOOS = '#2d3d1f';
  const LAUB_D = '#1b3b18';
  const LAUB_M = '#275222';
  const LAUB_H = '#366930';
  const LAUB_L = '#488240';

  // 1. Knorrige Wurzelanlaeufe am Boden
  for (let i = 0; i < 5; i++) {
    const phi = (i / 5) * Math.PI * 2 + 0.25;
    const c = Math.cos(phi);
    const s = Math.sin(phi);
    t.push(
      stab([c * 0.25, 0.40, s * 0.25], [c * 0.65, 0.02, s * 0.65], 0.12, STAMM_D, 0, 5, 0.2),
      ['k', [0.10, 4], [c * 0.52, 0.08, s * 0.52], MOOS, 0.2]
    );
  }

  // 2. Stamm mit Biegung
  t.push(
    ['z', [0.22, 0.34, 0.95, 8], [0, 0.50, 0], STAMM],
    ['z', [0.16, 0.22, 0.85, 7], [0.04, 1.30, 0.02], STAMM_D, 0, [0.05, 0, -0.06]],
    ['q', [0.08, 0.90, 0.16], [-0.14, 0.70, 0], MOOS, 0.2, [0, 0, 0.08]]
  );

  // 3. Astgabeln
  t.push(
    stab([0.04, 1.65, 0.02], [0.45, 2.15, 0.20], 0.11, STAMM, 0, 4),
    stab([0.04, 1.65, 0.02], [-0.42, 2.10, -0.18], 0.11, STAMM, 0, 4),
    stab([0.04, 1.70, 0.02], [0.10, 2.30, -0.38], 0.09, STAMM_D, 0, 4),
    stab([0.04, 1.70, 0.02], [-0.12, 2.35, 0.35], 0.09, STAMM_D, 0, 4)
  );

  // 4. Gestaffelte Laubkrone
  t.push(
    ['k', [0.92, 8], [0.45, 2.30, 0.22], LAUB_D, 0.3],
    ['k', [0.88, 8], [-0.42, 2.25, -0.20], LAUB_M, 0.3],
    ['k', [0.82, 7], [0.12, 2.45, -0.40], LAUB_D, 0.3],
    ['k', [0.82, 7], [-0.14, 2.50, 0.38], LAUB_M, 0.35],
    ['k', [1.10, 9], [0, 2.75, 0], LAUB_M, 0.35],
    ['k', [0.85, 8], [0.35, 3.05, -0.15], LAUB_H, 0.35],
    ['k', [0.85, 8], [-0.32, 3.10, 0.18], LAUB_H, 0.35],
    ['k', [0.82, 8], [0, 3.55, 0], LAUB_H, 0.35],
    ['k', [0.55, 7], [0.08, 4.05, 0.05], LAUB_L, 0.4]
  );

  return t;
}

/** Fron-Ader: Steinbruch- und Erzabbau-Sohle mit Stuetzen, Schienen und Eisenerzglaenzern. */
function fronAderModell() {
  const t = [];
  const STEIN_D = '#3a3d3c';
  const STEIN_M = '#545956';
  const STEIN_H = '#707873';
  const BALKEN = '#4d331e';
  const ERZ = '#b8c0c8';
  const ERZ_GLANZ = '#e2e8f0';

  // 1. Steinbruchsohle & Abbauterrasse
  t.push(
    ['z', [0.75, 0.95, 0.25, 8], [0, 0.125, 0], STEIN_D],
    ['q', [0.65, 0.45, 0.55], [0.15, 0.30, -0.12], STEIN_M, 0, [0.15, 0.4, 0.1]],
    ['q', [0.55, 0.38, 0.52], [-0.28, 0.25, 0.22], STEIN_D, 0, [-0.1, 0.6, -0.15]],
    ['z', [0.22, 0.42, 0.48, 6], [0.38, 0.28, 0.28], STEIN_H, 0, [0.25, 0.2, 0.35]]
  );

  // 2. Gruben-Abstuetzbalken aus schwerem Eichenholz
  t.push(
    stab([-0.42, 0.12, -0.28], [-0.42, 0.72, -0.28], 0.09, BALKEN),
    stab([-0.12, 0.12, -0.42], [-0.12, 0.72, -0.42], 0.09, BALKEN),
    stab([-0.45, 0.70, -0.26], [-0.10, 0.70, -0.44], 0.08, BALKEN),
    stab([-0.42, 0.12, -0.28], [-0.12, 0.72, -0.42], 0.05, '#3b2413'),
    ['q', [0.18, 0.05, 0.75], [0.22, 0.25, -0.35], BALKEN, 0, [0.35, 0.4, 0]]
  );

  // 3. Freigelegte Eisenerzadern (funkelnd)
  t.push(
    ['k', [0.18, 6], [0.12, 0.52, -0.08], ERZ],
    ['k', [0.15, 5], [-0.18, 0.42, 0.26], ERZ],
    ['k', [0.12, 5], [0.32, 0.45, 0.18], ERZ_GLANZ],
    ['q', [0.12, 0.12, 0.12], [-0.05, 0.48, 0.35], ERZ_GLANZ, 0, [0.4, 0.4, 0.4]],
    ['q', [0.14, 0.14, 0.14], [0.25, 0.40, -0.22], ERZ, 0, [0.2, 0.6, 0.1]],
    ['k', [0.11, 4], [-0.45, 0.18, 0.12], ERZ],
    ['k', [0.09, 4], [0.48, 0.16, -0.15], ERZ_GLANZ],
    stab([0.38, 0.12, 0.42], [0.22, 0.62, 0.28], 0.025, '#5c3d25'),
    ['z', [0, 0.05, 0.22, 4], [0.22, 0.62, 0.28], '#22262a', 0, [0, 0.6, Math.PI / 2]]
  );

  return t;
}

/** Goetterblut-Ader: Reissender Obsidiankrater mit gluehendem Magmasee, Raubwurzeln und Kristallspitzen. */
function blutAderModell() {
  const t = [];
  const OBSIDIAN = '#15111c';
  const OBSIDIAN_H = '#231c2e';
  const WURZEL = '#261710';
  const BLUT_KERN = '#991b1b';
  const BLUT_KRISTALL = '#ef4444';
  const BLUT_HELL = '#fca5a5';
  const MAGMA = '#ffedd5';

  // 1. Zerrissener Obsidian-Krater
  t.push(
    ['z', [0.72, 0.94, 0.24, 8], [0, 0.12, 0], OBSIDIAN],
    ['q', [0.70, 0.35, 0.60], [0, 0.22, 0], OBSIDIAN_H, 0, [0.1, 0.5, 0.1]],
    ['q', [0.55, 0.30, 0.55], [-0.15, 0.25, -0.15], OBSIDIAN, 0, [-0.2, -0.4, 0.2]]
  );

  // 2. Kochender Goetterblut-See
  t.push(
    ['k', [0.48, 7], [0, 0.28, 0], BLUT_KERN, GLUEHT],
    ['k', [0.26, 6], [0, 0.34, 0], MAGMA, GLUEHT]
  );

  // 3. Raubwurzeln mit Saftadern
  for (let i = 0; i < 6; i++) {
    const phi = (i / 6) * Math.PI * 2 + 0.15;
    const c = Math.cos(phi);
    const s = Math.sin(phi);
    t.push(
      stab([c * 0.82, 0.05, s * 0.82], [c * 0.42, 0.42, s * 0.42], 0.12, WURZEL, 0, 4, 0.6),
      ['k', [0.045, 4], [c * 0.55, 0.30, s * 0.55], BLUT_KRISTALL, GLUEHT]
    );
  }

  // 4. Goetterblut-Kristallspitzen
  const kristalle = [
    [0.00, 0.85, 0.00, 1.55, 0.22, 0.08, 0.15, -0.05],
    [0.26, 0.65, 0.18, 1.25, 0.18, -0.22, 0.50, 0.32],
    [-0.24, 0.60, -0.16, 1.15, 0.17, 0.30, -0.40, -0.22],
    [-0.15, 0.52, 0.28, 0.95, 0.15, -0.38, 0.25, -0.28],
    [0.24, 0.48, -0.22, 0.88, 0.14, 0.22, 0.75, 0.24],
    [0.10, 0.42, 0.34, 0.72, 0.12, -0.15, -0.3, 0.40],
    [-0.32, 0.38, 0.05, 0.68, 0.11, 0.42, 0.15, -0.18]
  ];
  for (const [kx, ky, kz, kh, kd, rx, ry, rz] of kristalle) {
    t.push(
      ['z', [0.02, kd, kh, 6], [kx, ky, kz], BLUT_KRISTALL, GLUEHT, [rx, ry, rz]],
      ['k', [kd * 0.45, 4], [kx, ky + kh * 0.35, kz], BLUT_HELL, GLUEHT]
    );
  }

  // 5. Schwebende Splitter
  t.push(
    ['k', [0.065, 4], [0.12, 1.75, 0.08], MAGMA, GLUEHT],
    ['k', [0.055, 4], [-0.15, 1.62, -0.10], BLUT_HELL, GLUEHT],
    ['k', [0.045, 4], [0.05, 1.88, -0.12], MAGMA, GLUEHT],
    ['k', [0.045, 4], [-0.08, 1.55, 0.20], BLUT_KRISTALL, GLUEHT]
  );

  return t;
}

/** Staubwolke: Vielteilige aufwirbelnde Staubpartikelwolke. */
function staubwolkeModell() {
  return [
    ['k', [0.65, 6], [0, 0, 0], '#b8ae98'],
    ['k', [0.52, 6], [0.35, 0.15, 0.10], '#a89e88'],
    ['k', [0.48, 6], [-0.30, 0.12, -0.15], '#c4baa4'],
    ['k', [0.42, 5], [0.12, 0.35, -0.22], '#aba18c'],
    ['k', [0.38, 5], [-0.18, -0.15, 0.28], '#b0a692'],
  ];
}

export const MODELLE_DEF = {
  // Baustelle & Zerstoerung
  baugeruest: baugeruestModell(),
  truemmer: truemmerModell(),
  // ------------------------------------------------------------- Menschen
  bauer: bauerModell(),
  soldat: soldatModell(),
  jaeger: jaegerModell(),
  soeldner: soeldnerModell(),
  held: heldModell(),
  // ------------------------------------------------------------- Gott
  dryade: dryadeModell(),
  wolf: wolfModell(),
  waldgeist: waldgeistModell(WALDGEIST_PALETTEN.fruehling),
  waldgeist_fruehling: waldgeistModell(WALDGEIST_PALETTEN.fruehling),
  waldgeist_sommer: waldgeistModell(WALDGEIST_PALETTEN.sommer),
  waldgeist_herbst: waldgeistModell(WALDGEIST_PALETTEN.herbst),
  waldgeist_winter: waldgeistModell(WALDGEIST_PALETTEN.winter),
  ent: entModell(),
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
  halle: halleModell(),
  grenzstein: grenzsteinModell(),
  wachturm: wachturmModell(),
  schmiede: schmiedeModell(),
  saege: saegeModell(),
  kaserne: kaserneModell(),
  schacht: schachtModell(),
  banner: bannerModell(),
  kapelle: kapelleModell(),
  skriptorium: skriptoriumModell(),
  // ------------------------------------------------------------- Gebaeude Gott
  herzbaum: herzbaumModell(),
  hain: hainModell(),
  waechterbaum: waechterbaumModell(),
  quelle: quelleModell(),
  moos: moosModell(),
  dickicht: dickichtModell(),
  blutwurz: blutwurzModell(),
  dornenschrein: dornenschreinModell(),
  eiche: eicheModell(),
  steinkreis: steinkreisModell(),


  // ------------------------------------------------------------- Karte und Effekte
  scheibe: [['s', [1, 64], [0, 0, 0], '#ffffff', 1]],
  fronAder: fronAderModell(),
  blutAder: blutAderModell(),
  baum: baumModell(),
  staubwolke: staubwolkeModell(),
  pfeil: [
    ['q', [0.05, 0.05, 1.0], [0, 0, 0], HOLZ],
    ['z', [0, 0.06, 0.18, 4], [0, 0, 0.55], EISEN, 0, [Math.PI / 2, 0, 0]],
    ['q', [0.16, 0.02, 0.18], [0, 0, -0.45], '#e8e2d0', 0.6],
  ],
  // Geschosse nach Auftrag 3, Aufgabe 3 (Spitze nach +z):
  // Schwerer Belagerungsbolzen mit vierkantiger Eisenspitze und Holzleitwerk
  bolzen: [
    ['z', [0.07, 0.07, 1.4, 6], [0, 0, -0.05], '#5c3a21', 0, [Math.PI / 2, 0, 0]],
    ['z', [0, 0.13, 0.38, 4], [0, 0, 0.8], '#94a3b8', 0, [Math.PI / 2, 0, 0]],
    ['q', [0.12, 0.12, 0.12], [0, 0, 0.62], '#475569'],
    ['q', [0.28, 0.02, 0.32], [0, 0, -0.58], '#d8b06a', 0.8],
    ['q', [0.02, 0.28, 0.32], [0, 0, -0.58], '#d8b06a', 0.8],
  ],
  // Gruengoldener Dorn (Waechterbaum)
  dorn: [
    ['z', [0, 0.12, 1.3, 5], [0, 0, 0.1], '#4d7c0f', 0.3, [Math.PI / 2, 0, 0]],
    ['z', [0, 0.06, 0.45, 4], [0, 0, 0.75], '#facc15', GLUEHT, [Math.PI / 2, 0, 0]],
    ['z', [0, 0.04, 0.22, 4], [0.08, 0, 0.1], '#365314', 0, [0.4, 0, -0.6]],
    ['z', [0, 0.04, 0.22, 4], [-0.08, 0, -0.2], '#365314', 0, [-0.4, 0, 0.6]],
  ],
  // Leuchtender Waldgeist-Pfeil
  lichtpfeil: [
    ['q', [0.05, 0.05, 1.1], [0, 0, 0], '#ecfccb', GLUEHT],
    ['z', [0, 0.1, 0.32, 4], [0, 0, 0.65], '#ffffff', GLUEHT, [Math.PI / 2, 0, 0]],
    ['k', [0.12, 5], [0, 0, 0.55], '#bef264', GLUEHT],
    ['q', [0.24, 0.02, 0.28], [0, 0, -0.45], '#a3e635', GLUEHT],
    ['q', [0.02, 0.24, 0.28], [0, 0, -0.45], '#a3e635', GLUEHT],
  ],
  // Gluehende Magmakugel mit Feuerschweif (Waldgott)
  glutball: [
    ['k', [0.38, 7], [0, 0, 0.1], '#ffedd5', GLUEHT],
    ['k', [0.48, 7], [0, 0, 0.05], '#ea580c', GLUEHT],
    ['k', [0.32, 6], [0, 0, -0.32], '#c2410c', GLUEHT],
    ['k', [0.22, 5], [0, 0, -0.62], '#9a3412', GLUEHT],
    ['k', [0.12, 4], [0, 0, -0.88], '#431407', GLUEHT],
    ['z', [0.4, 0.1, 0.8, 6], [0, 0, -0.35], '#f97316', GLUEHT, [Math.PI / 2, 0, 0]],
  ],
  kugel: [
    ['k', [0.32, 6], [0, 0, 0], '#e2f7d4', GLUEHT],
    ['k', [0.16, 5], [0, 0, -0.35], '#bfe8b0', GLUEHT],
  ],
  stein: [['k', [0.45, 6], [0, 0, 0], STEIN]],
  // Fels: markante kantige Felsformation aus Pfeilern, Kanten und Schichtungen; Radius max. 1.0
  fels: felsModell(),
  // Balliste (katapult): Fahrbare Belagerungsballiste
  katapult: ballisteModell(),
  // Wurzelbrecher: massiges vierbeiniges Holz-Ungetuem mit Astzacken und Magmakern
  wurzelbrecher: wurzelbrecherModell(),
};


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
 * G.2 -- Glutherz (High-Res): Vollwertiges 3D-Asset fuer das Spiel.
 * Organischer Faltenwurf ohne polygonale Kloetzchen, fliessende Drapierung
 * mit Reverskanten, tiefgreifende Wurzeln im Boden, ein hochdetaillierter
 * pulsierender Magmakern in einem schuetzenden Obsidian-Brustkorb,
 * artikulierte goldene Klauenhaende und ein 4-fach verzweigtes Hirschgeweih
 * mit glimmenden Spitzen. Vollstaendig mit weichen Zylindern/Kegeln modelliert
 * (unter 6000 Ecken).
 */
function waldgottGlutherz2() {
  const M_AUSSEN = '#100c0a';
  const M_MITTEL = '#16110d';
  const M_FALTE = '#1e1610';
  const OBSIDIAN = '#070505';
  const GLUT_KERN = '#fff8e7';
  const GLUT_HELL = '#ff9800';
  const GLUT_FEUER = '#e64a19';
  const GLUT_DUNKEL = '#bf360c';
  const GOLD_ARM = '#d98b2b';
  const GOLD_KLAUE = '#ffd54f';
  const GOLD_SPITZE = '#fff3c4';
  const GEWEIH_HOLZ = '#211812';
  const GEWEIH_GLUT = '#ffa726';
  const AUGE_AUSSEN = '#ffb300';
  const AUGE_KERN = '#ffffff';

  const t = [];

  // 1. Mantel-Volumen: 3 glatte Kegelsegmente (12 Segmente fuer weiche Rundungen)
  t.push(
    ['z', [0.46, 0.64, 1.1, 12], [0, 3.25, -0.05], M_AUSSEN, 0.05],
    ['z', [0.64, 0.88, 1.3, 12], [0, 2.1, -0.06], M_MITTEL, 0.05],
    ['z', [0.88, 1.14, 1.1, 12], [0, 0.95, -0.07], M_AUSSEN, 0.05]
  );

  // Drapierte Kaskadenfalten entlang des Mantels
  const anzahlFalten = 6;
  for (let i = 0; i < anzahlFalten; i++) {
    const phi = 0.68 + (i / (anzahlFalten - 1)) * (Math.PI * 2 - 1.36);
    const cosP = Math.cos(phi);
    const sinP = Math.sin(phi);
    const pO = [cosP * 0.52, 3.4, sinP * 0.52 - 0.05];
    const pM = [cosP * 0.74, 2.1, sinP * 0.74 - 0.06];
    const pU = [cosP * 1.02, 0.7, sinP * 1.02 - 0.07];
    t.push(stab(pO, pM, 0.07, M_FALTE, 0.06, 3, 0.9));
    t.push(stab(pM, pU, 0.065, M_FALTE, 0.06, 3, 1.15));
  }
  // Gewoelbte Reverskanten links und rechts der Brustöffnung
  for (const seite of [1, -1]) {
    const kO = [seite * 0.38, 3.65, 0.22];
    const kM = [seite * 0.44, 2.5, 0.48];
    const kU = [seite * 0.56, 1.35, 0.72];
    const kEnd = [seite * 0.75, 0.4, 0.88];
    t.push(stab(kO, kM, 0.08, M_FALTE, 0.06, 3, 1.1));
    t.push(stab(kM, kU, 0.09, M_FALTE, 0.06, 3, 1.1));
    t.push(stab(kU, kEnd, 0.085, M_FALTE, 0.06, 3, 0.9));
  }

  // Kraeftige Wurzeln am Saum, die organisch in den Boden greifen
  const anzahlWurzeln = 5;
  for (let i = 0; i < anzahlWurzeln; i++) {
    const phi = (i / anzahlWurzeln) * Math.PI * 2 + zufall(i, 11) * 0.35;
    const cosP = Math.cos(phi);
    const sinP = Math.sin(phi);
    const rStart = 1.08;
    const p0 = [cosP * rStart, 0.45, sinP * rStart - 0.05];
    const p1 = [cosP * (rStart + 0.28) + sinP * 0.08, 0.18, sinP * (rStart + 0.28) - 0.05];
    const p2 = [cosP * (rStart + 0.58), 0.02, sinP * (rStart + 0.58) - 0.05];
    t.push(stab(p0, p1, 0.075, '#18120e', 0.04, 3, 0.75));
    t.push(stab(p1, p2, 0.056, '#18120e', 0.04, 3, 0.2));
  }
  // Glimmende Saumfetzen
  for (let i = 0; i < 6; i++) {
    const phi = (i / 6) * Math.PI * 2 + 0.3;
    const cosP = Math.cos(phi);
    const sinP = Math.sin(phi);
    const p0 = [cosP * 1.08, 0.55, sinP * 1.08 - 0.06];
    const l = 0.42 + zufall(i, 20) * 0.25;
    const p1 = [cosP * (1.12 + l * 0.15), 0.55 - l, sinP * (1.12 + l * 0.15) - 0.06];
    t.push(stab(p0, p1, 0.05, i % 2 ? M_AUSSEN : M_MITTEL, 0.05, 3, 0.1));
    if (i % 2 === 0) {
      t.push(['q', [0.05, 0.05, 0.05], p1, GLUT_HELL, GLUEHT]);
    }
  }

  // 2. Das Glutherz: Aufsteigende Lavasäule, Kern und Obsidian-Brustkorb
  t.push(
    ['z', [0.18, 0.34, 1.7, 6], [0, 1.45, 0.1], GLUT_DUNKEL, GLUEHT],
    ['z', [0.12, 0.22, 1.4, 5], [0, 1.6, 0.16], GLUT_FEUER, GLUEHT],
    ['k', [0.24, 6], [0, 2.65, 0.18], GLUT_KERN, GLUEHT],
    ['k', [0.34, 6], [0, 2.65, 0.18], GLUT_HELL, GLUEHT],
    ['k', [0.42, 6], [0, 2.65, 0.18], GLUT_FEUER, GLUEHT]
  );
  // Gebogene Rippenbögen um den glühenden Kern
  const rippenHoehen = [2.95, 2.6, 2.25];
  for (let r = 0; r < rippenHoehen.length; r++) {
    const yR = rippenHoehen[r];
    const weite = 0.38 + (r === 1 ? 0.05 : 0);
    for (const s of [1, -1]) {
      const pBack = [s * 0.24, yR, -0.05];
      const pMid = [s * weite, yR - 0.04, 0.28];
      const pFront = [s * 0.12, yR - 0.08, 0.48];
      t.push(stab(pBack, pMid, 0.048, OBSIDIAN, 0.02, 3, 0.9));
      t.push(stab(pMid, pFront, 0.042, OBSIDIAN, 0.02, 3, 0.6));
    }
  }
  // Aufsteigende Glut- und Funkenpartikel
  for (let i = 0; i < 9; i++) {
    const w = zufall(i, 40) * Math.PI * 2;
    const dist = 0.2 + zufall(i, 41) * 0.65;
    const yH = 1.6 + zufall(i, 42) * 3.2;
    const col = i % 3 === 0 ? GLUT_KERN : (i % 2 === 0 ? GLUT_HELL : GLUT_FEUER);
    t.push(['q', [0.048, 0.048, 0.048], [Math.cos(w) * dist, yH, Math.sin(w) * dist + 0.25], col, GLUEHT, [0.4, w, 0.4]]);
  }

  // 3. Weite Glockenärmel und artikulierte goldene Klauen
  for (const s of [1, -1]) {
    t.push(['k', [0.28, 5], [s * 0.68, 3.55, 0.02], M_AUSSEN, 0.05]);
    t.push(stab([s * 0.68, 3.55, 0.02], [s * 0.92, 2.3, 0.12], 0.21, M_MITTEL, 0.05, 4, 1.45));
    t.push(stab([s * 0.92, 2.3, 0.12], [s * 0.96, 1.4, 0.16], 0.26, M_AUSSEN, 0.05, 4, 0.7));
  }
  const armRechts = {
    ell: [0.85, 2.45, 0.32],
    wrist: [0.22, 2.22, 0.78],
    dirF: [-0.62, -0.65, 0.44],
    dirS: [0.55, -0.7, 0],
    dirB: [0.2, 0.3, 0.9]
  };
  const armLinks = {
    ell: [-0.85, 2.15, 0.32],
    wrist: [-0.18, 1.88, 0.82],
    dirF: [0.62, -0.65, 0.44],
    dirS: [-0.55, -0.7, 0],
    dirB: [0.2, 0.3, 0.9]
  };
  for (const arm of [armRechts, armLinks]) {
    t.push(stab(arm.ell, arm.wrist, 0.072, GOLD_ARM, GLUEHT, 4, 0.85));
    t.push(['z', [0.082, 0.082, 0.06, 4], arm.wrist, GOLD_KLAUE, GLUEHT]);
    const handMitte = vPlus(arm.wrist, vEinheit(arm.dirF), 0.14);
    t.push(stab(arm.wrist, handMitte, [0.18, 0.06], GOLD_ARM, GLUEHT));
    const uF = vEinheit(arm.dirF);
    const uS = vEinheit(arm.dirS);
    const uB = vEinheit(arm.dirB);
    for (let f = 0; f < 4; f++) {
      const q = f - 1.5;
      const basis = vPlus(handMitte, uS, q * 0.05);
      const l = 0.58 * (1 - Math.abs(q) * 0.1);
      const gelenk = vPlus(vPlus(basis, uF, l * 0.52), uS, q * 0.025);
      const spitze = vPlus(vPlus(gelenk, uF, l * 0.48), uB, 0.22);
      t.push(stab(basis, gelenk, 0.038, GOLD_KLAUE, GLUEHT, 3, 0.8));
      t.push(stab(gelenk, spitze, 0.030, GOLD_SPITZE, GLUEHT, 3, 0.12));
    }
    const dBasis = vPlus(handMitte, uS, -0.11);
    const dGelenk = vPlus(vPlus(dBasis, uF, 0.12), uS, -0.09);
    const dSpitze = vPlus(vPlus(dGelenk, uF, 0.18), uB, 0.12);
    t.push(stab(dBasis, dGelenk, 0.036, GOLD_KLAUE, GLUEHT, 3, 0.8));
    t.push(stab(dGelenk, dSpitze, 0.028, GOLD_SPITZE, GLUEHT, 3, 0.15));
  }

  // 4. Gefluegelter Kragen, Kapuzenschleier und gluehende Augen
  for (const s of [1, -1]) {
    const c0 = [s * 0.34, 3.8, 0.0];
    const c1 = [s * 0.42, 4.4, -0.12];
    const c2 = [s * 0.38, 4.88, -0.22];
    t.push(stab(c0, c1, [0.38, 0.06], M_AUSSEN, 0.05));
    t.push(stab(c1, c2, [0.26, 0.05], M_FALTE, 0.05));
  }
  t.push(
    ['q', [0.55, 0.85, 0.08], [0, 4.3, -0.32], M_AUSSEN, 0.05, [-0.18, 0, 0]],
    ['q', [0.42, 0.55, 0.07], [0, 4.85, -0.42], M_FALTE, 0.05, [-0.25, 0, 0]],
    ['k', [0.32, 6], [0, 4.34, 0.04], OBSIDIAN, 0.02],
    ['z', [0.30, 0.18, 0.35, 5], [0, 4.45, 0.12], OBSIDIAN, 0.02, [0.45, 0, 0]],
    ['k', [0.22, 6], [0, 4.22, 0.1], '#040303'],
    ['z', [0.15, 0.05, 0.28, 5], [0, 4.02, 0.14], '#040303']
  );
  for (const s of [1, -1]) {
    const eyePos = [s * 0.09, 4.24, 0.29];
    t.push(['k', [0.052, 4], eyePos, AUGE_AUSSEN, GLUEHT]);
    t.push(['k', [0.028, 4], [eyePos[0], eyePos[1], eyePos[2] + 0.02], AUGE_KERN, GLUEHT]);
    t.push(stab(eyePos, [eyePos[0] * 0.9, eyePos[1] - 0.16, eyePos[2] - 0.01], 0.018, GLUT_HELL, GLUEHT, 3, 0.1));
  }

  // 5. Majestaetisches Hirschgeweih mit glimmenden Spitzen
  function baueAst(basis, seite) {
    const bT = [];
    const p0 = basis;
    const p1 = [basis[0] + seite * 0.18, basis[1] + 0.35, basis[2] - 0.08];
    bT.push(stab(p0, p1, 0.062, GEWEIH_HOLZ, 0, 3, 0.85));
    const pAug = [p1[0] + seite * 0.08, p1[1] + 0.16, p1[2] + 0.26];
    bT.push(stab(p1, pAug, 0.042, GEWEIH_HOLZ, 0, 3, 0.2));
    bT.push(['q', [0.048, 0.048, 0.048], pAug, GEWEIH_GLUT, GLUEHT, [0.5, 0.5, 0]]);
    const p2 = [p1[0] + seite * 0.26, p1[1] + 0.38, p1[2] - 0.1];
    bT.push(stab(p1, p2, 0.052, GEWEIH_HOLZ, 0, 3, 0.85));
    const pEis = [p2[0] + seite * 0.32, p2[1] + 0.24, p2[2] + 0.05];
    bT.push(stab(p2, pEis, 0.038, GEWEIH_HOLZ, 0, 3, 0.2));
    bT.push(['q', [0.045, 0.045, 0.045], pEis, GEWEIH_GLUT, GLUEHT, [0.5, 0.5, 0]]);
    const pKroneBasis = [p2[0] + seite * 0.16, p2[1] + 0.42, p2[2] - 0.05];
    bT.push(stab(p2, pKroneBasis, 0.044, GEWEIH_HOLZ, 0, 3, 0.85));
    const spitzen = [
      [pKroneBasis[0] + seite * 0.05, pKroneBasis[1] + 0.32, pKroneBasis[2] + 0.1],
      [pKroneBasis[0] + seite * 0.22, pKroneBasis[1] + 0.38, pKroneBasis[2] - 0.05],
      [pKroneBasis[0] - seite * 0.12, pKroneBasis[1] + 0.28, pKroneBasis[2] - 0.15]
    ];
    for (const sp of spitzen) {
      bT.push(stab(pKroneBasis, sp, 0.034, GEWEIH_HOLZ, 0, 3, 0.15));
      bT.push(['q', [0.042, 0.042, 0.042], sp, GEWEIH_GLUT, GLUEHT, [0.5, 0.5, 0]]);
    }
    return bT;
  }
  t.push(...baueAst([0.13, 4.45, 0.02], 1));
  t.push(...baueAst([-0.13, 4.45, 0.02], -1));

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
  'G.2 — Glutherz (High-Res)': waldgottGlutherz2(),
};

// Das vom Nutzer gewaehlte finale Spiel-Asset: G.2 Glutherz (High-Res)
MODELLE_DEF.waldgott = WALDGOTT_VARIANTEN['G.2 — Glutherz (High-Res)'];

/** Rabe: Gott-Späher. Eleganter schwarzer Rabe mit weit gespreizten Schwingen und goldenen Augen. */
function rabeModell() {
  const SCHWARZ1 = '#131118';
  const SCHWARZ2 = '#1c1924';
  const SCHWARZ3 = '#282333';
  const SCHNABEL = '#181615';
  const AUGE_G = '#ffa000';
  const t = [];

  const F = 0.42; // Massstabsanpassung: echter Vogel (Spannweite ~2.8m im Spiel statt 7m)

  // Rumpf & Brust
  t.push(
    ['z', [0.22 * F, 0.36 * F, 0.72 * F, 8], [0, 0.44 * F, -0.05 * F], SCHWARZ1, 0.25, [-0.35, 0, 0]],
    ['k', [0.32 * F, 7], [0, 0.46 * F, 0.12 * F], SCHWARZ2, 0.25],
    // Hals
    ['z', [0.18 * F, 0.24 * F, 0.30 * F, 6], [0, 0.60 * F, 0.30 * F], SCHWARZ1, 0.2, [0.45, 0, 0]],
    // Kopf
    ['k', [0.20 * F, 7], [0, 0.70 * F, 0.44 * F], SCHWARZ2, 0.15],
    // Kraeftiger Rabenschnabel (gebogen)
    ['z', [0, 0.08 * F, 0.36 * F, 5], [0, 0.69 * F, 0.70 * F], SCHNABEL, 0, [Math.PI / 2 + 0.15, 0, 0]],
    ['z', [0, 0.065 * F, 0.28 * F, 4], [0, 0.64 * F, 0.66 * F], SCHNABEL, 0, [Math.PI / 2, 0, 0]],
    // Federschopf am Hinterkopf
    ['z', [0, 0.09 * F, 0.22 * F, 4], [0, 0.77 * F, 0.32 * F], SCHWARZ3, 0.2, [-0.8, 0, 0]]
  );

  // Leuchtende Bernstein-Augen (wie beim Waldgott)
  for (const s of [1, -1]) {
    t.push(
      ['k', [0.038 * F, 5], [s * 0.12 * F, 0.73 * F, 0.50 * F], AUGE_G, GLUEHT],
      ['k', [0.018 * F, 4], [s * 0.125 * F, 0.73 * F, 0.51 * F], '#ffffff', GLUEHT]
    );
  }

  // Schwingen: 2-stufig geschwungen mit Handschwingen und Federfahnen
  for (const s of [1, -1]) {
    t.push(stab([s * 0.18 * F, 0.48 * F, 0.15 * F], [s * 0.75 * F, 0.56 * F, 0.12 * F], [0.28 * F, 0.08 * F], SCHWARZ2, 0.25));
    t.push(stab([s * 0.75 * F, 0.56 * F, 0.12 * F], [s * 1.45 * F, 0.52 * F, -0.05 * F], [0.24 * F, 0.06 * F], SCHWARZ1, 0.25));
    t.push(stab([s * 1.45 * F, 0.52 * F, -0.05 * F], [s * 2.15 * F, 0.45 * F, -0.25 * F], [0.18 * F, 0.04 * F], SCHWARZ3, 0.25));

    t.push(
      ['q', [0.55 * F, 0.03 * F, 0.35 * F], [s * 0.65 * F, 0.52 * F, -0.08 * F], SCHWARZ1, 0.2, [0.15, 0, s * -0.1]],
      ['q', [0.65 * F, 0.03 * F, 0.40 * F], [s * 1.25 * F, 0.48 * F, -0.22 * F], SCHWARZ2, 0.2, [0.15, 0, s * -0.15]],
      ['q', [0.55 * F, 0.03 * F, 0.45 * F], [s * 1.75 * F, 0.44 * F, -0.38 * F], SCHWARZ3, 0.2, [0.15, 0, s * -0.2]]
    );
  }

  // Stossgefieder (Faecher-Schwanz)
  t.push(
    ['q', [0.22 * F, 0.03 * F, 0.65 * F], [0, 0.38 * F, -0.62 * F], SCHWARZ1, 0.2, [-0.22, 0, 0]],
    ['q', [0.18 * F, 0.03 * F, 0.58 * F], [0.14 * F, 0.38 * F, -0.58 * F], SCHWARZ2, 0.2, [-0.22, 0, -0.2]],
    ['q', [0.18 * F, 0.03 * F, 0.58 * F], [-0.14 * F, 0.38 * F, -0.58 * F], SCHWARZ2, 0.2, [-0.22, 0, 0.2]]
  );

  // Eingeholte Klauen am Bauch
  for (const s of [1, -1]) {
    t.push(['z', [0.03 * F, 0.05 * F, 0.22 * F, 4], [s * 0.12 * F, 0.25 * F, -0.05 * F], '#2a2218', 0, [0.8, 0, 0]]);
  }

  return t;
}

/** Spaehposten: Menschen-Hochsitz. Vierbeiniger Holzturm mit Bruestung, Leiter, Fernrohr und Laterne. */
function spaehpostenModell() {
  const HOLZ_D = '#4a331c';
  const t = [];

  // 1. Vier solide Stein-Fundamente und Pfosten
  const pfeilerPos = [
    [0.65, 0.65],
    [-0.65, 0.65],
    [0.65, -0.65],
    [-0.65, -0.65]
  ];
  for (const [px, pz] of pfeilerPos) {
    t.push(['z', [0.20, 0.26, 0.35, 6], [px, 0.175, pz], STEIN]);
    t.push(stab([px, 0.35, pz], [px * 0.8, 2.35, pz * 0.8], 0.13, HOLZ, 0, 4));
  }

  // 2. Diagonale X-Verstrebungen und Zargen
  const seiten = [
    [[0.65, 0.65], [-0.65, 0.65]],
    [[-0.65, 0.65], [-0.65, -0.65]],
    [[-0.65, -0.65], [0.65, -0.65]],
    [[0.65, -0.65], [0.65, 0.65]]
  ];
  for (let s = 0; s < seiten.length; s++) {
    const [pA, pB] = seiten[s];
    if (s !== 2) {
      t.push(stab([pA[0], 0.55, pA[1]], [pB[0] * 0.8, 2.15, pB[1] * 0.8], 0.065, HOLZ_D));
      t.push(stab([pB[0], 0.55, pB[1]], [pA[0] * 0.8, 2.15, pA[1] * 0.8], 0.065, HOLZ_D));
    }
    t.push(stab([pA[0] * 0.9, 1.35, pA[1] * 0.9], [pB[0] * 0.9, 1.35, pB[1] * 0.9], 0.08, HOLZ));
  }

  // 3. Leiter an der Rueckseite
  const lX = 0;
  const lZ = -0.62;
  t.push(stab([lX - 0.18, 0.05, lZ], [lX - 0.15, 2.35, lZ * 0.8], 0.05, HOLZ));
  t.push(stab([lX + 0.18, 0.05, lZ], [lX + 0.15, 2.35, lZ * 0.8], 0.05, HOLZ));
  for (let r = 1; r <= 6; r++) {
    const yR = r * 0.35;
    t.push(['q', [0.36, 0.04, 0.04], [lX, yR, lZ * (1 - yR * 0.08)], HOLZ_D]);
  }

  // 4. Ausguck-Plattform und Bruestung
  t.push(
    ['q', [1.45, 0.12, 1.45], [0, 2.38, 0], '#5c4028', 0.3],
    ['q', [1.52, 0.06, 1.52], [0, 2.44, 0], '#725234'],
    ['q', [1.42, 0.48, 0.06], [0, 2.70, 0.68], HOLZ],
    ['q', [1.42, 0.48, 0.06], [0, 2.70, -0.68], HOLZ],
    ['q', [0.06, 0.48, 1.42], [0.68, 2.70, 0], HOLZ],
    ['q', [0.06, 0.48, 1.42], [-0.68, 2.70, 0], HOLZ]
  );

  // 4 Eckpfosten zum Dach
  for (const [px, pz] of pfeilerPos) {
    t.push(stab([px * 0.75, 2.45, pz * 0.75], [px * 0.75, 3.45, pz * 0.75], 0.09, HOLZ));
  }

  // 5. Walmdach
  t.push(
    ['z', [0.08, 1.25, 0.75, 4], [0, 3.82, 0], '#8c3528', 0.6, [0, Math.PI / 4, 0]],
    ['q', [1.82, 0.06, 1.82], [0, 3.46, 0], HOLZ_D],
    ['z', [0, 0.08, 0.4, 5], [0, 4.38, 0], EISEN]
  );

  // 6. Ausruestung: Messing-Fernrohr, Laterne und Wimpel
  t.push(
    ['z', [0.03, 0.05, 0.32, 5], [0.15, 2.78, 0.48], HOLZ],
    ['z', [0.045, 0.075, 0.58, 6], [0.15, 3.02, 0.62], '#d4a236', GLUEHT, [0.35, 0, 0]],
    ['k', [0.078, 6], [0.15, 2.92, 0.85], '#ffd54f', GLUEHT],
    stab([0, 3.46, 0.85], [0, 3.25, 0.85], 0.02, EISEN),
    ['k', [0.11, 6], [0, 3.16, 0.85], '#ffd54f', GLUEHT],
    ['z', [0.14, 0.05, 0.08, 5], [0, 3.25, 0.85], EISEN],
    ['q', [0.45, 0.72, 0.03], [0.69, 2.05, 0], '#d8b06a', 0.9]
  );

  return t;
}

MODELLE_DEF.rabe = rabeModell();
MODELLE_DEF.spaehposten = spaehpostenModell();

/** Schilf: Schilfrohr und samtige Rohrkolben an den Ufern von Seen und Fluessen. */
function schilfModell() {
  const t = [];
  const GRUEN1 = '#4a622a';
  const GRUEN2 = '#5d7835';
  const GRUEN3 = '#3b5020';
  const STROH = '#7e7846';
  const KOLBEN = '#3d2516';
  const KOLBEN_H = '#523420';
  const SCHLICK = '#2b261d';

  // 1. Feuchter Wurzelsockel / Erdhuegel im Wasser
  t.push(
    ['z', [0.35, 0.55, 0.12, 6], [0, 0.05, 0], SCHLICK],
    ['k', [0.32, 5], [0.08, 0.06, -0.05], SCHLICK]
  );

  // 2. Halme mit Rohrkolben (verschiedene Hoehen und Neigungen)
  const halme = [
    // [x, z, h, rOben, rUnten, neigX, neigZ, farbe, mitKolben]
    [0.00, 0.00, 1.85, 0.022, 0.045, 0.04, -0.05, GRUEN1, true],
    [0.15, -0.08, 1.65, 0.020, 0.040, -0.08, 0.06, GRUEN2, true],
    [-0.14, 0.10, 1.95, 0.022, 0.045, 0.06, 0.08, GRUEN1, true],
    [0.08, 0.18, 1.45, 0.018, 0.038, 0.12, -0.06, STROH, true],
    [-0.18, -0.12, 1.55, 0.020, 0.040, -0.09, -0.09, GRUEN3, false],
    [0.22, 0.12, 1.30, 0.018, 0.035, 0.15, 0.08, GRUEN2, false],
    [-0.08, -0.22, 1.40, 0.018, 0.035, -0.14, 0.04, STROH, false],
    [0.25, -0.15, 1.20, 0.016, 0.032, -0.12, -0.12, GRUEN1, false],
  ];

  for (const [hx, hz, hh, ro, ru, nx, nz, col, kolb] of halme) {
    t.push(['z', [ro, ru, hh, 5], [hx, hh * 0.48, hz], col, 0, [nx, 0, nz]]);

    if (kolb) {
      const yKolb = hh * 0.82;
      t.push(['z', [0.052, 0.055, 0.38, 6], [hx + nx * yKolb, yKolb, hz + nz * yKolb], KOLBEN, 0, [nx, 0, nz]]);
      t.push(['k', [0.054, 5], [hx + nx * (yKolb + 0.19), yKolb + 0.19, hz + nz * (yKolb + 0.19)], KOLBEN_H, 0]);
      t.push(['k', [0.054, 5], [hx + nx * (yKolb - 0.19), yKolb - 0.19, hz + nz * (yKolb - 0.19)], KOLBEN, 0]);
      const ySpitze = yKolb + 0.28;
      t.push(['z', [0, 0.018, 0.22, 4], [hx + nx * ySpitze, ySpitze, hz + nz * ySpitze], STROH, 0, [nx, 0, nz]]);
    }
  }

  // 3. Ausladende Schilfblaetter
  const blaetter = [
    [0.10, 0.05, 1.10, 0.05, 0.28, 0.20, GRUEN2],
    [-0.12, 0.08, 1.25, 0.06, -0.25, 0.22, GRUEN1],
    [0.05, -0.12, 1.05, 0.05, 0.18, -0.30, GRUEN3],
    [-0.15, -0.06, 1.15, 0.05, -0.32, -0.18, STROH],
    [0.18, 0.14, 0.95, 0.045, 0.35, 0.15, GRUEN2],
    [-0.05, 0.20, 0.90, 0.045, -0.12, 0.38, GRUEN1],
  ];

  for (const [bx, bz, bh, bb, rx, rz, bcol] of blaetter) {
    t.push(['q', [bb, bh, 0.015], [bx, bh * 0.45, bz], bcol, 0, [rx, Math.atan2(bz, bx), rz]]);
  }

  return t;
}

/** Wasser: Mehrteilige Scheiben-Geometrie fuer Seen und Fluesse (Materialkennung team=0.77 fuer den Shader). */
function wasserModell() {
  const WASSER_FARBE = '#1b4b68';
  const WASSER_MAT = 0.77;
  return [
    ['s', [1.0, 48], [0, 0, 0], WASSER_FARBE, WASSER_MAT],
    ['s', [0.65, 36], [0, 0.01, 0], '#245a7c', WASSER_MAT],
    ['s', [0.35, 24], [0, 0.02, 0], '#2d688c', WASSER_MAT],
  ];
}

MODELLE_DEF.schilf = schilfModell();
MODELLE_DEF.wasser = wasserModell();



