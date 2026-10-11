// 3D-Ansicht. Dieselbe Simulation wie die 2D-Ansicht, gezeichnet mit WebGL 2
// ohne Bibliothek: Modelle aus Grundkoerpern (Quader, Zylinder, Kegel, Kugel),
// flach schattiert, instanziert gezeichnet. Aendert den Simulationszustand
// nie direkt, nur ueber issue(). Wird von tools/bundle.mjs mit der Sim
// zusammengefuegt -- deshalb hier keine Imports.
//
// Koordinaten: Simulation in Dezimetern (x, y). Szene in Metern: x -> x,
// y -> z, Hoehe ist y. Modelle schauen entlang +z.

const cv3 = document.getElementById('cv3d');
const ov = document.getElementById('overlay');
const octx = ov.getContext('2d');
const mini3 = document.getElementById('mini');
const mctx3 = mini3.getContext('2d');
const gl = cv3.getContext('webgl2', { antialias: true, stencil: true });

const ME = 0;
const DM = 0.1; // Dezimeter -> Meter
// Darstellungsmassstab: Einheiten und Gebaeude groesser als ihr Kollisionskreis,
// wie in jedem RTS -- sonst sind 3 m grosse Soldaten auf 2 km Karte Punkte.
const ZEIGE_EINHEIT = 1.6;
const ZEIGE_GEBAEUDE = 1.25;
let meFaction = 'mensch';
let world, ai, aiMe;
let gegnerStil = 'standard';
let paused = true;
let speed = 1;
let acc = 0;
let last = performance.now();
let sel = [];
let drag = null;
let placing = null;
let angriff = false;
let skillsOffen = false; // T: Skillbaum
let skillSig = ''; // zuletzt gezeichneter Stand des Skillbaums
let zielen = null; // Griff gewaehlt: naechster Klick ist das Ziel (Faehigkeit)
let wirkungen = []; // Faehigkeits-Einsaetze, eine Sekunde lang sichtbar
let karteTyp = null; // Gebaeude unter der Maus in der Bauleiste
let karteHtml = ''; // zuletzt gezeigte Info-Karte
let hover = { x: 0, y: 0 }; // Boden unter der Maus, Dezimeter
let maus = { x: 0, y: 0 }; // Bildschirm, CSS-Pixel
const tastenGehalten = new Set();
const vorher = new Map(); // id -> [x, y] vor dem letzten Tick, fuer Interpolation
const blick = new Map(); // id -> Blickrichtung in Bogenmass
let schuesse = []; // { ax, ay, bx, by, farbe, t }
let staub = []; // { x, y, r, t }
const ausfall = new Map(); // id -> Zeitpunkt des letzten Schusses (ms), fuer den Ruck nach vorn

const kam = { x: 420, z: 420, dist: 300, yaw: -Math.PI * 0.75, pitch: 0.95 };

const HEX = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
const teamFarbe = (p) => HEX(FACTIONS[world.players[p].faction].color);

// ------------------------------------------------------------ Mathematik
// Matrizen spaltenweise wie in WebGL: Element (Zeile r, Spalte c) an [c*4 + r].
function m4mul(a, b) {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
      o[c * 4 + r] = s;
    }
  }
  return o;
}
function m4persp(fovy, asp, n, f) {
  const t = 1 / Math.tan(fovy / 2);
  const nf = 1 / (n - f);
  return new Float32Array([t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) * nf, -1, 0, 0, 2 * f * n * nf, 0]);
}
function m4look(eye, at, up) {
  let zx = eye[0] - at[0];
  let zy = eye[1] - at[1];
  let zz = eye[2] - at[2];
  let l = Math.hypot(zx, zy, zz);
  zx /= l;
  zy /= l;
  zz /= l;
  let xx = up[1] * zz - up[2] * zy;
  let xy = up[2] * zx - up[0] * zz;
  let xz = up[0] * zy - up[1] * zx;
  l = Math.hypot(xx, xy, xz);
  xx /= l;
  xy /= l;
  xz /= l;
  const yx = zy * xz - zz * xy;
  const yy = zz * xx - zx * xz;
  const yz = zx * xy - zy * xx;
  return new Float32Array([
    xx, yx, zx, 0,
    xy, yy, zy, 0,
    xz, yz, zz, 0,
    -(xx * eye[0] + xy * eye[1] + xz * eye[2]),
    -(yx * eye[0] + yy * eye[1] + yz * eye[2]),
    -(zx * eye[0] + zy * eye[1] + zz * eye[2]),
    1,
  ]);
}
function m4inv(m) {
  const [a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23, a30, a31, a32, a33] = m;
  const b00 = a00 * a11 - a01 * a10;
  const b01 = a00 * a12 - a02 * a10;
  const b02 = a00 * a13 - a03 * a10;
  const b03 = a01 * a12 - a02 * a11;
  const b04 = a01 * a13 - a03 * a11;
  const b05 = a02 * a13 - a03 * a12;
  const b06 = a20 * a31 - a21 * a30;
  const b07 = a20 * a32 - a22 * a30;
  const b08 = a20 * a33 - a23 * a30;
  const b09 = a21 * a32 - a22 * a31;
  const b10 = a21 * a33 - a23 * a31;
  const b11 = a22 * a33 - a23 * a32;
  const det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  const d = 1 / det;
  return new Float32Array([
    (a11 * b11 - a12 * b10 + a13 * b09) * d,
    (a02 * b10 - a01 * b11 - a03 * b09) * d,
    (a31 * b05 - a32 * b04 + a33 * b03) * d,
    (a22 * b04 - a21 * b05 - a23 * b03) * d,
    (a12 * b08 - a10 * b11 - a13 * b07) * d,
    (a00 * b11 - a02 * b08 + a03 * b07) * d,
    (a32 * b02 - a30 * b05 - a33 * b01) * d,
    (a20 * b05 - a22 * b02 + a23 * b01) * d,
    (a10 * b10 - a11 * b08 + a13 * b06) * d,
    (a01 * b08 - a00 * b10 - a03 * b06) * d,
    (a30 * b04 - a31 * b02 + a33 * b00) * d,
    (a21 * b02 - a20 * b04 - a23 * b00) * d,
    (a11 * b07 - a10 * b09 - a12 * b06) * d,
    (a00 * b09 - a01 * b07 + a02 * b06) * d,
    (a31 * b01 - a30 * b03 - a32 * b00) * d,
    (a20 * b03 - a21 * b01 + a22 * b00) * d,
  ]);
}

// ------------------------------------------------------------ Geometrie
// Grundkoerper als Dreieckslisten [x,y,z, x,y,z, x,y,z, ...], um den
// Ursprung zentriert. Normalen entstehen spaeter je Dreieck (flach).
function geoQuader(w, h, d) {
  const x = w / 2;
  const y = h / 2;
  const z = d / 2;
  const P = [
    [-x, -y, -z], [x, -y, -z], [x, y, -z], [-x, y, -z],
    [-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z],
  ];
  const F = [[0, 1, 2, 3], [5, 4, 7, 6], [4, 0, 3, 7], [1, 5, 6, 2], [3, 2, 6, 7], [4, 5, 1, 0]];
  const t = [];
  for (const [a, b, c, e] of F) t.push(...P[a], ...P[b], ...P[c], ...P[a], ...P[c], ...P[e]);
  return t;
}
function geoZylinder(rOben, rUnten, h, seg) {
  const t = [];
  const y0 = -h / 2;
  const y1 = h / 2;
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * Math.PI * 2;
    const a1 = ((i + 1) / seg) * Math.PI * 2;
    const c0 = Math.cos(a0);
    const s0 = Math.sin(a0);
    const c1 = Math.cos(a1);
    const s1 = Math.sin(a1);
    const u0 = [c0 * rUnten, y0, s0 * rUnten];
    const u1 = [c1 * rUnten, y0, s1 * rUnten];
    const o0 = [c0 * rOben, y1, s0 * rOben];
    const o1 = [c1 * rOben, y1, s1 * rOben];
    if (rUnten > 0 || rOben > 0) t.push(...u0, ...u1, ...o1);
    if (rOben > 0) t.push(...u0, ...o1, ...o0);
    if (rOben > 0) t.push(0, y1, 0, ...o0, ...o1);
    if (rUnten > 0) t.push(0, y0, 0, ...u1, ...u0);
  }
  return t;
}
function geoKugel(r, seg) {
  const t = [];
  const ringe = Math.max(3, seg >> 1);
  const p = (i, j) => {
    const th = (i / ringe) * Math.PI;
    const ph = (j / seg) * Math.PI * 2;
    return [r * Math.sin(th) * Math.cos(ph), r * Math.cos(th), r * Math.sin(th) * Math.sin(ph)];
  };
  for (let i = 0; i < ringe; i++) {
    for (let j = 0; j < seg; j++) {
      const a = p(i, j);
      const b = p(i + 1, j);
      const c = p(i + 1, j + 1);
      const d = p(i, j + 1);
      if (i > 0) t.push(...a, ...b, ...d);
      if (i < ringe - 1) t.push(...d, ...b, ...c);
    }
  }
  return t;
}
function geoScheibe(r, seg) {
  const t = [];
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * Math.PI * 2;
    const a1 = ((i + 1) / seg) * Math.PI * 2;
    t.push(0, 0, 0, Math.cos(a1) * r, 0, Math.sin(a1) * r, Math.cos(a0) * r, 0, Math.sin(a0) * r);
  }
  return t;
}

/**
 * Ein Modell aus Teilen. Jedes Teil: [form, masse, position, farbe, team,
 * drehung]. form: 'q' Quader [w,h,d], 'z' Zylinder [rOben,rUnten,h,seg],
 * 'k' Kugel [r,seg], 's' Scheibe [r,seg]. team: Anteil der Fraktionsfarbe.
 * drehung: [rx, ry, rz] in Bogenmass, um die Teilmitte.
 * Ergebnis je Ecke: x,y,z, nx,ny,nz, r,g,b, team.
 */
function baueModell(teile) {
  const v = [];
  for (const [form, masse, pos, farbe, team = 0, dreh = [0, 0, 0]] of teile) {
    const roh =
      form === 'q' ? geoQuader(...masse) : form === 'z' ? geoZylinder(...masse) : form === 'k' ? geoKugel(...masse) : geoScheibe(...masse);
    const [rx, ry, rz] = dreh;
    const cx = Math.cos(rx);
    const sx = Math.sin(rx);
    const cy = Math.cos(ry);
    const sy = Math.sin(ry);
    const cz = Math.cos(rz);
    const sz = Math.sin(rz);
    const tf = (x, y, z) => {
      // erst um x, dann um z, dann um y
      let y1 = y * cx - z * sx;
      let z1 = y * sx + z * cx;
      let x2 = x * cz - y1 * sz;
      let y2 = x * sz + y1 * cz;
      let x3 = x2 * cy + z1 * sy;
      let z3 = -x2 * sy + z1 * cy;
      return [x3 + pos[0], y2 + pos[1], z3 + pos[2]];
    };
    const [r, g, b] = HEX(farbe);
    for (let i = 0; i < roh.length; i += 9) {
      const A = tf(roh[i], roh[i + 1], roh[i + 2]);
      const B = tf(roh[i + 3], roh[i + 4], roh[i + 5]);
      const C = tf(roh[i + 6], roh[i + 7], roh[i + 8]);
      let nx = (B[1] - A[1]) * (C[2] - A[2]) - (B[2] - A[2]) * (C[1] - A[1]);
      let ny = (B[2] - A[2]) * (C[0] - A[0]) - (B[0] - A[0]) * (C[2] - A[2]);
      let nz = (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]);
      const l = Math.hypot(nx, ny, nz) || 1;
      nx /= l;
      ny /= l;
      nz /= l;
      // Normale nach aussen drehen: weg von der Teilmitte. Flache Scheiben nach oben.
      const mx = (A[0] + B[0] + C[0]) / 3 - pos[0];
      const my = (A[1] + B[1] + C[1]) / 3 - pos[1];
      const mz = (A[2] + B[2] + C[2]) / 3 - pos[2];
      const aussen = form === 's' ? ny : nx * mx + ny * my + nz * mz;
      if (aussen < 0) {
        nx = -nx;
        ny = -ny;
        nz = -nz;
      }
      for (const P of [A, B, C]) v.push(P[0], P[1], P[2], nx, ny, nz, r, g, b, team);
    }
  }
  return new Float32Array(v);
}

// ------------------------------------------------------------ Modelle
// Alle Modelle auf Grundflaechen-Radius 1, Boden bei y = 0; gezeichnet mit
// Massstab = Radius der Einheit bzw. des Gebaeudes in Metern.
const HAUT = '#d9b38c';
const HOLZ = '#6b4a2b';
const STEIN = '#8a8f86';
const EISEN = '#a7adb3';
const LAUB = '#3f7a35';
const LAUB2 = '#5c9a43';
const BLUT = '#a86fb5';
const GLUEHT = 2; // als Teamanteil: Teil leuchtet selbst (siehe Shader)
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

const MODELLE_DEF = {
  // ------------------------------------------------------------- Menschen
  bauer: [
    ['z', [0.45, 0.55, 1.1, 7], [0, 0.55, 0], '#8a6a3a', 0.6],
    ['k', [0.32, 7], [0, 1.4, 0], HAUT],
    ['z', [0, 0.6, 0.3, 8], [0, 1.72, 0], '#d8c26a'],
    ['q', [0.08, 1.8, 0.08], [0.5, 0.9, 0.2], HOLZ, 0, [0.15, 0, 0]],
  ],
  soldat: [
    ['z', [0.45, 0.55, 1.2, 7], [0, 0.6, 0], '#555', 0.8],
    ['k', [0.32, 7], [0, 1.5, 0], HAUT],
    ['k', [0.34, 7], [0, 1.62, 0], EISEN],
    ['q', [0.07, 2.4, 0.07], [0.55, 1.2, 0.15], HOLZ],
    ['z', [0, 0.12, 0.3, 4], [0.55, 2.5, 0.15], EISEN],
    ['q', [0.12, 0.8, 0.6], [-0.55, 0.9, 0.1], '#555', 0.9],
  ],
  jaeger: [
    ['z', [0.4, 0.5, 1.15, 7], [0, 0.58, 0], '#3d5a2a', 0.5],
    ['k', [0.3, 7], [0, 1.45, 0], HAUT],
    ['z', [0, 0.38, 0.5, 7], [0, 1.75, 0], '#2f4a22', 0.4],
    ['q', [0.06, 1.6, 0.12], [0.5, 1.1, 0.25], HOLZ, 0, [0, 0, 0.12]],
  ],
  soeldner: [
    ['q', [1.1, 1.3, 0.8], [0, 0.75, 0], '#444', 0.75],
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
};

// ------------------------------------------------------------ WebGL
const VS = `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNor;
layout(location=2) in vec4 aCol;
layout(location=3) in vec4 iA; // x, y, z, Drehung
layout(location=4) in vec4 iB; // Massstab, Hoehenfaktor, Helligkeit, Alpha
layout(location=5) in vec4 iC; // Teamfarbe, w: Schrittphase (-1..1)
uniform mat4 uVP;
uniform vec3 uLicht;
out vec4 vCol;
out float vTiefe;
out vec3 vTeam;
void main() {
  vTeam = iC.rgb;
  float c = cos(iA.w), s = sin(iA.w);
  // Schritt: der untere Teil des Modells schwingt vor und zurueck -- Beine,
  // Rocksaum, Laeufe. Ohne Skelett, nur nach Hoehe im Modell.
  vec3 a = aPos;
  a.z += iC.w * 0.45 * max(0.0, 0.65 - a.y);
  vec3 p = a * vec3(iB.x, iB.x * iB.y, iB.x);
  vec3 r = vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z) + iA.xyz;
  vec3 n = normalize(vec3(c * aNor.x + s * aNor.z, aNor.y / max(iB.y, 0.05), -s * aNor.x + c * aNor.z));
  // Selbstleuchtende Teile behalten ihre eigene Farbe, ohne Fraktionsfarbe.
  float team = aCol.a > 1.5 ? 0.0 : aCol.a;
  vec3 col = mix(aCol.rgb, iC.rgb, team) * iB.z;
  float d = max(dot(n, uLicht), 0.0);
  // Teile mit Teamanteil > 1.5 leuchten selbst: Augen, Glut, Lichtkugeln.
  float licht = aCol.a > 1.5 ? 1.25 : 0.42 + 0.7 * d;
  vCol = vec4(col * licht, iB.w);
  gl_Position = uVP * vec4(r, 1.0);
  vTiefe = gl_Position.w;
}`;
const FS = `#version 300 es
precision mediump float;
in vec4 vCol;
in float vTiefe;
in vec3 vTeam;
uniform vec3 uNebel;
uniform float uRoentgen; // 1: verdeckte Einheit als Umriss in Teamfarbe
out vec4 o;
void main() {
  if (uRoentgen > 0.5) {
    o = vec4(mix(vTeam, vec3(1.0), 0.3), 0.5);
    return;
  }
  float f = clamp((vTiefe - 700.0) / 1600.0, 0.0, 0.55);
  o = vec4(mix(vCol.rgb, uNebel, f), vCol.a);
}`;
const VS_LINIE = `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec4 aCol;
uniform mat4 uVP;
out vec4 vCol;
void main() { vCol = aCol; gl_Position = uVP * vec4(aPos, 1.0); }`;
const FS_LINIE = `#version 300 es
precision mediump float;
in vec4 vCol;
out vec4 o;
void main() { o = vCol; }`;

function shader(typ, quelle) {
  const s = gl.createShader(typ);
  gl.shaderSource(s, quelle);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}
function programm(vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, shader(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, shader(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  return p;
}

let PROG;
let PROG_L;
const MODELLE = {};
let bodenModell;
let linienPuffer;
let linienVao;

/** Laedt ein Modell in die Grafikkarte: Eckpuffer, Instanzpuffer, VAO. */
function ladeModell(daten) {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const vb = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vb);
  gl.bufferData(gl.ARRAY_BUFFER, daten, gl.STATIC_DRAW);
  const st = 10 * 4;
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, st, 0);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 3, gl.FLOAT, false, st, 12);
  gl.enableVertexAttribArray(2);
  gl.vertexAttribPointer(2, 4, gl.FLOAT, false, st, 24);
  const ib = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, ib);
  const ist = 12 * 4;
  for (let k = 0; k < 3; k++) {
    gl.enableVertexAttribArray(3 + k);
    gl.vertexAttribPointer(3 + k, 4, gl.FLOAT, false, ist, k * 16);
    gl.vertexAttribDivisor(3 + k, 1);
  }
  gl.bindVertexArray(null);
  return { vao, ib, anzahl: daten.length / 10, inst: [], cap: 0 };
}

/**
 * Boden: Raster mit Farbe je Eckpunkt aus zwei Rauschlagen -- die Farben
 * verlaufen weich zwischen den Ecken, deterministisch, ohne Textur.
 */
function baueBoden() {
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
const DEKO = (() => {
  const d = [];
  let s = 12345;
  const r = () => ((s = (Math.imul(s, 1103515245) + 12345) | 0) >>> 8) / 16777216;
  for (let i = 0; i < 260; i++) {
    const x = r() * MAP * DM;
    const z = r() * MAP * DM;
    // Nicht auf Basen, Adern und Mittelachse
    const nahBasis = Math.hypot(x - 300, z - 300) < 520 || Math.hypot(x - 1700, z - 1700) < 520;
    const nahAchse = Math.abs(x + z - 2000) < 360;
    if (nahBasis || nahAchse) continue;
    d.push([x, z, 2.5 + r() * 2.5, r() * 6.28]);
  }
  return d;
})();

function initGL() {
  PROG = programm(VS, FS);
  PROG_L = programm(VS_LINIE, FS_LINIE);
  for (const [k, teile] of Object.entries(MODELLE_DEF)) MODELLE[k] = ladeModell(baueModell(teile));
  bodenModell = baueBoden();
  linienVao = gl.createVertexArray();
  gl.bindVertexArray(linienVao);
  linienPuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, linienPuffer);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 28, 12);
  gl.bindVertexArray(null);
}

/** Eine Instanz vormerken: Modell, Ort (m), Drehung, Massstab, Hoehe, Helligkeit, Alpha, Teamfarbe. */
function instanz(key, x, y, z, rot, scale, team, yScale = 1, hell = 1, alpha = 1, schritt = 0) {
  const m = MODELLE[key];
  if (!m) return;
  m.inst.push(x, y, z, rot, scale, yScale, hell, alpha, team[0], team[1], team[2], schritt);
}

function zeichneInstanzen(m, behalten = false) {
  const n = m.inst.length / 12;
  if (!n) return;
  gl.bindVertexArray(m.vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, m.ib);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(m.inst), gl.DYNAMIC_DRAW);
  gl.drawArraysInstanced(gl.TRIANGLES, 0, m.anzahl, n);
  if (!behalten) m.inst.length = 0;
}

// ------------------------------------------------------------ Kamera
let VP = new Float32Array(16);
let VP_INV = new Float32Array(16);
function kameraMatrix() {
  const w = cv3.clientWidth;
  const h = cv3.clientHeight;
  const cp = Math.cos(kam.pitch);
  const eye = [kam.x + Math.sin(kam.yaw) * cp * kam.dist, Math.sin(kam.pitch) * kam.dist, kam.z + Math.cos(kam.yaw) * cp * kam.dist];
  const proj = m4persp(0.75, w / h, 2, 6000);
  const view = m4look(eye, [kam.x, 0, kam.z], [0, 1, 0]);
  VP = m4mul(proj, view);
  VP_INV = m4inv(VP);
}
/** Weltpunkt (Meter) -> Bildschirm (CSS-Pixel) oder null hinter der Kamera. */
function aufSchirm(x, y, z) {
  const m = VP;
  const cx = m[0] * x + m[4] * y + m[8] * z + m[12];
  const cy = m[1] * x + m[5] * y + m[9] * z + m[13];
  const cw = m[3] * x + m[7] * y + m[11] * z + m[15];
  if (cw <= 0.1) return null;
  return [((cx / cw + 1) / 2) * cv3.clientWidth, ((1 - cy / cw) / 2) * cv3.clientHeight];
}
/** Bildschirm -> Punkt auf dem Boden (Dezimeter). */
function aufBoden(sx, sy) {
  const nx = (sx / cv3.clientWidth) * 2 - 1;
  const ny = 1 - (sy / cv3.clientHeight) * 2;
  const m = VP_INV;
  const p = (z) => {
    const x = m[0] * nx + m[4] * ny + m[8] * z + m[12];
    const y = m[1] * nx + m[5] * ny + m[9] * z + m[13];
    const zz = m[2] * nx + m[6] * ny + m[10] * z + m[14];
    const w = m[3] * nx + m[7] * ny + m[11] * z + m[15];
    return [x / w, y / w, zz / w];
  };
  const a = p(-1);
  const b = p(1);
  const t = a[1] / (a[1] - b[1]);
  return { x: ((a[0] + (b[0] - a[0]) * t) / DM) | 0, y: ((a[2] + (b[2] - a[2]) * t) / DM) | 0 };
}

// ------------------------------------------------------------ Spielstart
function neu(f, zuschauen = false) {
  meFaction = f;
  const gegner = f === 'mensch' ? 'gott' : 'mensch';
  world = createWorld({ seed: (Date.now() / 1000) | 0, factions: [f, gegner] });
  ai = createAI(1, world.seed, gegnerStil);
  aiMe = zuschauen ? createAI(0, world.seed + 1) : null;
  sel = [];
  placing = null;
  angriff = false;
  skillsOffen = false;
  skillSig = '';
  zielen = null;
  wirkungen = [];
  vorher.clear();
  blick.clear();
  schuesse = [];
  staub = [];
  kam.x = 420;
  kam.z = 420;
  kam.dist = 300;
  kam.yaw = -Math.PI * 0.75;
  renderBar();
}

/** Ausgewaehlte eigene Einheiten, die bauen koennen. */
function erbauer3() {
  return sel.filter((id) => {
    const e = byId(world, id);
    return e && e.kind === 'unit' && UNITS[e.type].build;
  });
}

/** Rechtsklick: auf eigene Baustelle -- Erbauer helfen mit, sonst bewegen. */
function befehl3(x, y) {
  const site = world.entities.find(
    (b) =>
      b.kind === 'building' &&
      b.player === ME &&
      !b.dead &&
      (!b.done || b.hp < b.maxHp) &&
      (b.x - x) ** 2 + (b.y - y) ** 2 <= (BUILDINGS[b.type].radius + 80) ** 2
  );
  const bauer = site ? erbauer3() : [];
  const rest = sel.filter((id) => !bauer.includes(id));
  if (bauer.length) issue(world, { type: 'bauen', player: ME, ids: bauer, id: site.id });
  if (rest.length) issue(world, { type: 'move', player: ME, ids: rest, x, y });
}

function bauListe() {
  return meFaction === 'mensch'
    ? ['schmiede', 'saege', 'grenzstein', 'kaserne', 'schacht', 'banner', 'kapelle', 'wachturm', 'skriptorium']
    : ['quelle', 'moos', 'hain', 'dickicht', 'blutwurz', 'dornenschrein', 'steinkreis', 'waechterbaum', 'eiche'];
}
function renderBar() {
  const bar = document.getElementById('builds');
  bar.innerHTML = bauListe()
    .map((t, i) => {
      const zu = gesperrt(world, ME, t);
      return `<button data-b="${t}"${zu ? ' class="zu"' : ''}>${BUILDINGS[t].name}<small>${BUILDINGS[t].cost.fron}</small><kbd>${i + 1}</kbd></button>`;
    })
    .join('');
  for (const b of bar.querySelectorAll('[data-b]')) {
    b.onclick = () => {
      if (!gesperrt(world, ME, b.dataset.b)) placing = b.dataset.b;
    };
    b.onmouseenter = () => (karteTyp = b.dataset.b);
    b.onmouseleave = () => (karteTyp = null);
  }
}

/** Info-Karte: Gebaeude unter der Maus in der Bauleiste, sonst das, was gerade gesetzt wird. */
function infoKarte3() {
  const typ = karteTyp || placing;
  const html = typ ? gebaeudeKarte(world, ME, typ) : '';
  if (html === karteHtml) return;
  karteHtml = html;
  const el = document.getElementById('karte');
  el.innerHTML = html;
  el.hidden = !html;
}

/** Faehigkeit des Kommandanten ausloesen: ein Griff braucht ein Ziel, alles andere wirkt sofort. */
function wirkeFaehigkeit3(id) {
  if (!faehigkeitenVon(world, ME).includes(id) || faehigkeitWarten(world, ME, id)) return;
  if (FAEHIGKEITEN[id].art === 'griff') {
    zielen = id;
    placing = null;
    angriff = false;
  } else {
    issue(world, { type: 'faehigkeit', player: ME, faehigkeit: id, x: 0, y: 0 });
  }
}

// Knoepfe der Faehigkeiten: ein Klick loest aus.
document.getElementById('faehigkeiten').onclick = (ev) => {
  const b = ev.target && ev.target.closest ? ev.target.closest('[data-faeh]') : null;
  if (b && world) wirkeFaehigkeit3(b.dataset.faeh);
};
let faehHtml = '';

/** Knoepfe zeigen, solange der eigene Kommandant gewaehlt ist. */
function faehPanel3() {
  const k = kommandantVon(world, ME);
  const html = k && sel.includes(k.id) ? faehigkeitenHtml(world, ME) : '';
  if (html === faehHtml) return;
  faehHtml = html;
  const el = document.getElementById('faehigkeiten');
  el.innerHTML = html;
  el.hidden = !html;
}

// Skillbaum: ein Klick auf einen lernbaren Skill lernt ihn.
document.getElementById('skills').onclick = (ev) => {
  const b = ev.target && ev.target.closest ? ev.target.closest('[data-skill]') : null;
  if (b && world) issue(world, { type: 'lernen', player: ME, skill: b.dataset.skill });
};

/** Skillbaum und Sperren neu zeichnen, sobald sich daran etwas aendert. */
function skillPanel3() {
  const el = document.getElementById('skills');
  el.hidden = !skillsOffen;
  const sig = skillSignatur(world, ME) + (skillsOffen ? '|offen' : '');
  if (sig === skillSig) return;
  skillSig = sig;
  renderBar();
  if (skillsOffen) el.innerHTML = skillBaumHtml(world, ME);
}

// ------------------------------------------------------------ Eingabe
cv3.addEventListener('contextmenu', (e) => e.preventDefault());
cv3.addEventListener('mousedown', (e) => {
  const mx = e.offsetX;
  const my = e.offsetY;
  const p = aufBoden(mx, my);
  if (e.button === 2) {
    placing = null;
    zielen = null;
    if (sel.length) {
      if (angriff) issue(world, { type: 'attack', player: ME, ids: sel.slice(), x: p.x, y: p.y });
      else befehl3(p.x, p.y);
    }
    angriff = false;
    return;
  }
  if (e.button === 1) {
    drag = { pan: true, sx: mx, sy: my, x0: kam.x, z0: kam.z };
    e.preventDefault();
    return;
  }
  if (zielen) {
    issue(world, { type: 'faehigkeit', player: ME, faehigkeit: zielen, x: p.x, y: p.y });
    zielen = null;
    return;
  }
  if (placing) {
    // Ausgewaehlte Erbauer bekommen den Auftrag und gehen hin.
    issue(world, { type: 'build', player: ME, building: placing, x: p.x, y: p.y, ids: erbauer3() });
    if (!e.shiftKey) placing = null;
    return;
  }
  if (angriff && sel.length) {
    issue(world, { type: 'attack', player: ME, ids: sel.slice(), x: p.x, y: p.y });
    angriff = false;
    return;
  }
  drag = { sx: mx, sy: my, x: mx, y: my, add: e.shiftKey };
});
addEventListener('mousemove', (e) => {
  const r = cv3.getBoundingClientRect();
  maus = { x: e.clientX - r.left, y: e.clientY - r.top };
  if (!drag) return;
  if (drag.pan) {
    // Verschieben in Blickrichtung: Bildschirm-Pixel -> Meter grob nach Zoom
    const k = kam.dist / 700;
    const dx = (maus.x - drag.sx) * k;
    const dy = (maus.y - drag.sy) * k;
    const c = Math.cos(kam.yaw);
    const s = Math.sin(kam.yaw);
    // Boden greifen: nach rechts ziehen schiebt die Karte nach rechts
    kam.x = drag.x0 - dx * c - dy * s;
    kam.z = drag.z0 + dx * s - dy * c;
  } else {
    drag.x = maus.x;
    drag.y = maus.y;
  }
});
addEventListener('mouseup', () => {
  if (drag && !drag.pan) {
    const x1 = Math.min(drag.sx, drag.x);
    const x2 = Math.max(drag.sx, drag.x);
    const y1 = Math.min(drag.sy, drag.y);
    const y2 = Math.max(drag.sy, drag.y);
    const box = x2 - x1 > 5 || y2 - y1 > 5;
    const picked = [];
    let naechste = null;
    let bestD = 22 * 22;
    for (const e of world.entities) {
      if (e.player !== ME || e.kind !== 'unit') continue;
      const [ex, ey] = lage(e);
      const s = aufSchirm(ex * DM, 1, ey * DM);
      if (!s) continue;
      if (box) {
        if (s[0] >= x1 && s[0] <= x2 && s[1] >= y1 && s[1] <= y2) picked.push(e.id);
      } else {
        const dd = (s[0] - x1) ** 2 + (s[1] - y1) ** 2;
        if (dd < bestD) {
          bestD = dd;
          naechste = e.id;
        }
      }
    }
    if (naechste) picked.push(naechste);
    if (!box && !picked.length) {
      const p = aufBoden(x1, y1);
      for (const e of world.entities) {
        if (e.player !== ME || e.kind !== 'building') continue;
        const r = BUILDINGS[e.type].radius + 40;
        if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 <= r * r) {
          sel = [e.id];
          drag = null;
          return;
        }
      }
    }
    sel = drag.add ? [...new Set([...sel, ...picked])] : picked;
  }
  drag = null;
});
cv3.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    kam.dist = Math.max(45, Math.min(1500, kam.dist * (e.deltaY < 0 ? 0.88 : 1.14)));
  },
  { passive: false }
);
addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
    tastenGehalten.add(e.key);
    e.preventDefault();
  }
  if (!world) return;
  const i = '123456789'.indexOf(e.key);
  if (i >= 0 && bauListe()[i] && !gesperrt(world, ME, bauListe()[i])) placing = bauListe()[i];
  if (e.key === 'Escape') {
    placing = null;
    angriff = false;
    zielen = null;
    skillsOffen = false;
    sel = [];
  }
  if (e.key === 't') skillsOffen = !skillsOffen;
  // Kommandant gewaehlt: Q, W, E loesen seine Faehigkeiten aus.
  const kdtGewaehlt = kommandantVon(world, ME);
  const fi = 'qwe'.indexOf(e.key);
  if (fi >= 0 && kdtGewaehlt && sel.includes(kdtGewaehlt.id)) {
    wirkeFaehigkeit3(FACTIONS[meFaction].faehigkeiten[fi]);
    return;
  }
  if (e.key === ' ') {
    paused = !paused;
    e.preventDefault();
  }
  if (e.key === '+') speed = Math.min(8, speed * 2);
  if (e.key === '-') speed = Math.max(0.5, speed / 2);
  if (e.key === 'a' && sel.some((id) => byId(world, id)?.kind === 'unit')) {
    angriff = true;
    placing = null;
  }
  if (e.key === 'k') {
    const k = kommandantVon(world, ME);
    if (k) {
      sel = [k.id];
      kam.x = k.x * DM;
      kam.z = k.y * DM;
    }
  }
  if ((e.key === 'Delete' || e.key === 'Backspace') && sel.length === 1) {
    const b = byId(world, sel[0]);
    if (b && b.kind === 'building') issue(world, { type: 'demolish', player: ME, id: b.id });
  }
  const slot = 'qwer'.indexOf(e.key);
  if (slot >= 0 && sel.length === 1) {
    const b = byId(world, sel[0]);
    if (b && b.kind === 'building' && b.done && BUILDINGS[b.type].buildList) {
      const u = BUILDINGS[b.type].buildList[slot];
      if (u) issue(world, { type: 'produce', player: ME, id: b.id, unit: u });
    }
  }
});
addEventListener('keyup', (e) => tastenGehalten.delete(e.key));
mini3.addEventListener('mousedown', (e) => {
  kam.x = (e.offsetX / mini3.clientWidth) * MAP * DM;
  kam.z = (e.offsetY / mini3.clientHeight) * MAP * DM;
});

function kameraTasten(dt) {
  const v = (kam.dist / 300) * 0.35 * dt;
  const c = Math.cos(kam.yaw);
  const s = Math.sin(kam.yaw);
  // vorwaerts = weg von der Kamera, auf dem Boden
  const fx = -s;
  const fz = -c;
  const rx = -c;
  const rz = s;
  if (tastenGehalten.has('ArrowUp')) {
    kam.x += fx * v;
    kam.z += fz * v;
  }
  if (tastenGehalten.has('ArrowDown')) {
    kam.x -= fx * v;
    kam.z -= fz * v;
  }
  if (tastenGehalten.has('ArrowLeft')) {
    kam.x += rx * v;
    kam.z += rz * v;
  }
  if (tastenGehalten.has('ArrowRight')) {
    kam.x -= rx * v;
    kam.z -= rz * v;
  }
  kam.x = Math.max(0, Math.min(MAP * DM, kam.x));
  kam.z = Math.max(0, Math.min(MAP * DM, kam.z));
}

// ------------------------------------------------------------ Schleife
/** Interpolierte Lage einer Einheit in Dezimetern. */
let alphaTick = 0;
function lage(e) {
  const v = vorher.get(e.id);
  if (!v || e.kind !== 'unit') return [e.x, e.y];
  return [v[0] + (e.x - v[0]) * alphaTick, v[1] + (e.y - v[1]) * alphaTick];
}

function tick() {
  for (const e of world.entities) if (e.kind === 'unit') vorher.set(e.id, [e.x, e.y]);
  if (aiMe) stepAI(aiMe, world);
  stepAI(ai, world);
  step(world);
  for (const ev of world.events) {
    if (ev.t === 'shot') {
      const a = byId(world, ev.from);
      const b = byId(world, ev.to);
      if (!a || !b) continue;
      // Fernkaempfer schiessen sichtbar: Jaeger Pfeile, Waldgeist und Waldgott
      // Lichtkugeln. Sonst ein kurzer Blitz zwischen Angreifer und Ziel.
      const art =
        a.type === 'jaeger' || a.type === 'wachturm' || a.type === 'waechterbaum'
          ? 'pfeil'
          : a.type === 'waldgeist' || a.type === 'waldgott'
            ? 'kugel'
            : 'blitz';
      const dauer = art === 'blitz' ? 0.22 : 0.4;
      schuesse.push({ a: ev.from, b: ev.to, ax: a.x, ay: a.y, bx: b.x, by: b.y, farbe: teamFarbe(a.player), t: dauer, dauer, art });
      // Schuetzen schauen zum Ziel
      if (a.kind === 'unit') {
        blick.set(a.id, Math.atan2(b.x - a.x, b.y - a.y));
        ausfall.set(a.id, performance.now());
      }
    } else if (ev.t === 'died') {
      staub.push({ x: ev.x, y: ev.y, r: ev.kind === 'unit' ? 2.5 : 8, t: 0 });
      vorher.delete(ev.id);
    } else if (ev.t === 'faehigkeit') {
      wirkungen.push({ ...ev, bis: world.tick + 12 });
    }
  }
  sel = sel.filter((id) => byId(world, id));
}

function frame(now) {
  const dt = Math.min(250, now - last);
  last = now;
  if (!paused && !world.over) {
    acc += dt * speed;
    let guard = 0;
    while (acc >= TICK_MS && guard++ < 12) {
      tick();
      acc -= TICK_MS;
    }
    if (guard >= 12) acc = 0;
  }
  alphaTick = paused || world.over ? 1 : Math.min(1, acc / TICK_MS);
  kameraTasten(dt);
  if (!document.hidden) {
    zeichne(now, dt);
    zeichneUeberlagerung(now);
    zeichneHud();
    skillPanel3();
    faehPanel3();
    infoKarte3();
    zeichneMini();
  }
  requestAnimationFrame(frame);
}

// ------------------------------------------------------------ Zeichnen 3D
function groesse() {
  const d = devicePixelRatio || 1;
  const w = cv3.clientWidth;
  const h = cv3.clientHeight;
  if (cv3.width !== ((w * d) | 0) || cv3.height !== ((h * d) | 0)) {
    cv3.width = (w * d) | 0;
    cv3.height = (h * d) | 0;
    ov.width = cv3.width;
    ov.height = cv3.height;
  }
}

const NEBEL = [0.07, 0.08, 0.06];
function zeichne(now, dt) {
  groesse();
  kameraMatrix();
  const hover0 = aufBoden(maus.x, maus.y);
  hover = hover0;

  gl.viewport(0, 0, cv3.width, cv3.height);
  gl.clearColor(NEBEL[0], NEBEL[1], NEBEL[2], 1);
  gl.clearStencil(0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.disable(gl.CULL_FACE);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  gl.useProgram(PROG);
  gl.uniformMatrix4fv(gl.getUniformLocation(PROG, 'uVP'), false, VP);
  const l = [0.45, 1, 0.3];
  const ll = Math.hypot(...l);
  gl.uniform3f(gl.getUniformLocation(PROG, 'uLicht'), l[0] / ll, l[1] / ll, l[2] / ll);
  gl.uniform3f(gl.getUniformLocation(PROG, 'uNebel'), ...NEBEL);

  // Boden
  bodenModell.inst.push(0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0);
  zeichneInstanzen(bodenModell);

  // Gerodeter Boden
  gl.depthMask(false);
  for (const c of world.cleared) instanz('scheibe', c.x * DM, 0.05, c.y * DM, 0, c.r * DM, [0.36, 0.3, 0.2], 1, 1, 0.32);
  zeichneInstanzen(MODELLE.scheibe);
  gl.depthMask(true);

  // Schatten: dunkle Scheiben unter allem, was steht oder laeuft -- billig und
  // macht Bodenkontakt und Tiefe lesbar.
  gl.depthMask(false);
  for (const e of world.entities) {
    const def = e.kind === 'unit' ? UNITS[e.type] : BUILDINGS[e.type];
    const [x, y] = lage(e);
    const r = def.radius * DM * (e.kind === 'unit' ? 1.05 * ZEIGE_EINHEIT : 1.25 * ZEIGE_GEBAEUDE);
    instanz('scheibe', x * DM + r * 0.12, 0.06, y * DM + r * 0.08, 0, r, [0, 0, 0], 1, 1, e.kind === 'unit' ? 0.32 : 0.26);
  }
  zeichneInstanzen(MODELLE.scheibe);
  gl.depthMask(true);

  zeichneDomaenen();

  // Adern
  for (const d of world.deposits) {
    const key = d.kind === 'goetterblut' ? 'blutAder' : 'fronAder';
    const s = d.kind === 'goetterblut' ? 9 : 6;
    instanz(key, d.x * DM, 0, d.y * DM, ((d.x + d.y) % 7) * 0.9, s, [1, 1, 1], 1, d.takenBy ? 0.55 : 1);
  }
  // Deko-Baeume
  for (const [x, z, s, r] of DEKO) instanz('baum', x, 0, z, r, s, [1, 1, 1]);

  // Gebaeude und Einheiten
  const t = now / 1000;
  for (const e of world.entities) {
    const team = teamFarbe(e.player);
    if (e.kind === 'building') {
      const def = BUILDINGS[e.type];
      const r = def.radius * DM * ZEIGE_GEBAEUDE;
      if (e.done) instanz(e.type, e.x * DM, 0, e.y * DM, (e.id % 4) * (Math.PI / 2) + 0.4, r, team);
      else {
        const f = Math.min(1, e.progress / (def.buildTime * 1000));
        instanz(e.type, e.x * DM, 0, e.y * DM, (e.id % 4) * (Math.PI / 2) + 0.4, r, team, 0.15 + 0.85 * f, 0.55);
      }
      continue;
    }
    const def = UNITS[e.type];
    const [x, y] = lage(e);
    const v = vorher.get(e.id);
    const bewegt = v && (v[0] !== e.x || v[1] !== e.y);
    if (bewegt) {
      const ziel = Math.atan2(e.x - v[0], e.y - v[1]);
      const alt = blick.has(e.id) ? blick.get(e.id) : ziel;
      let d = ziel - alt;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      blick.set(e.id, alt + d * Math.min(1, dt / 120));
    }
    const s = def.radius * DM * ZEIGE_EINHEIT;
    const schwebt = e.type === 'waldgeist' ? 0.5 + Math.sin(t * 2 + e.id) * 0.25 : 0;
    const gleitet = e.type === 'waldgeist' || e.type === 'waldgott';
    const huepf = bewegt && !gleitet ? Math.abs(Math.sin(t * 9 + e.id)) * 0.12 * s : 0;
    const schritt = bewegt && !gleitet ? Math.sin(t * 9 + e.id) : 0;
    // Ausfall: kurz nach vorn beim Schuss oder Hieb
    const seit = now - (ausfall.get(e.id) || -1e9);
    const ruck = seit < 220 ? Math.sin((seit / 220) * Math.PI) * 0.4 * s : 0;
    const w = blick.get(e.id) || 0;
    instanz(e.type, x * DM + Math.sin(w) * ruck, schwebt * s + huepf, y * DM + Math.cos(w) * ruck, w, s, team, 1, 1, 1, schritt);
  }

  // Platzierungs-Geist
  if (placing) {
    const def = BUILDINGS[placing];
    let gx = hover.x;
    let gy = hover.y;
    let ok = true;
    if (def.needs) {
      const dep = findDeposit(world, hover.x, hover.y, def.needs);
      if (dep && !dep.takenBy) {
        gx = dep.x;
        gy = dep.y;
      } else ok = false;
    }
    if (def.needsGrowth && isCleared(world, gx, gy)) ok = false;
    const farbe = ok ? teamFarbe(ME) : [0.8, 0.3, 0.2];
    instanz(placing, gx * DM, 0, gy * DM, 0.4, def.radius * DM * ZEIGE_GEBAEUDE, farbe, 1, ok ? 1.1 : 0.8, 0.55);
  }

  // Erst alles ausser Einheiten, dann Einheiten zweimal: wo Gebaeude oder
  // Baeume davor stehen als Umriss in Teamfarbe, dann ganz normal.
  for (const k of Object.keys(MODELLE)) if (k !== 'staubwolke' && !UNITS[k]) zeichneInstanzen(MODELLE[k]);
  const roentgen = gl.getUniformLocation(PROG, 'uRoentgen');
  gl.depthFunc(gl.GREATER);
  gl.depthMask(false);
  gl.uniform1f(roentgen, 1);
  for (const k of Object.keys(UNITS)) zeichneInstanzen(MODELLE[k], true);
  gl.uniform1f(roentgen, 0);
  gl.depthFunc(gl.LEQUAL);
  gl.depthMask(true);
  for (const k of Object.keys(UNITS)) zeichneInstanzen(MODELLE[k]);

  // Staub gefallener Einheiten
  gl.depthMask(false);
  staub = staub.filter((p) => (p.t += dt / 1000) < 0.9);
  for (const p of staub) instanz('staubwolke', p.x * DM, p.r * 0.4, p.y * DM, 0, p.r * (0.6 + p.t), [1, 1, 1], 0.6, 1, 0.5 * (1 - p.t / 0.9));
  zeichneInstanzen(MODELLE.staubwolke);
  gl.depthMask(true);

  zeichneSchuesse(dt);
}

/**
 * Domaenen: je Spieler die Vereinigung aller Ankerkreise -- Flaeche einmal
 * eingefaerbt, dazu nur die Aussenkante. Mit dem Stencil-Puffer:
 * 1) Kreise markieren, 2) Flaeche dort einmal zeichnen, 3) etwas groessere
 * Kreise nur ausserhalb der Markierung -- das ist der Rand.
 */
function zeichneDomaenen() {
  gl.enable(gl.STENCIL_TEST);
  gl.depthMask(false);
  const randBreite = Math.max(1.2, kam.dist * 0.006);
  for (let p = 0; p < 2; p++) {
    const anker = world.entities.filter((e) => e.player === p && e.kind === 'building' && anchorRadius(world, e) > 0);
    if (!anker.length) continue;
    const team = teamFarbe(p);
    const kreise = (plus, alpha) => {
      for (const e of anker) instanz('scheibe', e.x * DM, 0.15 + p * 0.02, e.y * DM, 0, anchorRadius(world, e) * DM + plus, team, 1, 1, alpha);
      zeichneInstanzen(MODELLE.scheibe);
    };
    gl.clear(gl.STENCIL_BUFFER_BIT);
    gl.colorMask(false, false, false, false);
    gl.stencilFunc(gl.ALWAYS, 1, 0xff);
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
    kreise(0, 1);
    gl.colorMask(true, true, true, true);
    gl.stencilFunc(gl.EQUAL, 1, 0xff);
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.INCR);
    kreise(0, p === ME ? 0.08 : 0.06);
    gl.stencilFunc(gl.EQUAL, 0, 0xff);
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.INCR);
    kreise(randBreite, p === ME ? 0.85 : 0.6);
  }
  gl.disable(gl.STENCIL_TEST);
  gl.depthMask(true);
}

function zeichneSchuesse(dt) {
  schuesse = schuesse.filter((s) => (s.t -= dt / 1000) > 0);
  const v = [];
  for (const s of schuesse) {
    const a = byId(world, s.a);
    const b = byId(world, s.b);
    const [ax, ay] = a ? lage(a) : [s.ax, s.ay];
    const [bx, by] = b ? lage(b) : [s.bx, s.by];
    if (s.art !== 'blitz') {
      // Geschoss im Bogen vom Schuetzen zum Ziel
      const f = 1 - s.t / s.dauer;
      const bogen = Math.sin(f * Math.PI) * (s.art === 'pfeil' ? 3 : 1.2);
      const w = Math.atan2(bx - ax, by - ay);
      const x = ax + (bx - ax) * f;
      const y = ay + (by - ay) * f;
      // Geschosse uebertrieben gross, sonst sind sie aus Spielhoehe unsichtbar
      instanz(s.art, x * DM, 2 + bogen, y * DM, w, s.art === 'pfeil' ? 2.8 : 2.4, s.farbe, 1, s.art === 'kugel' ? 1.4 : 1);
      continue;
    }
    const al = Math.min(1, s.t / 0.22);
    v.push(ax * DM, 1.4, ay * DM, s.farbe[0], s.farbe[1], s.farbe[2], al);
    v.push(bx * DM, 1.0, by * DM, 1, 0.95, 0.8, al);
  }
  zeichneInstanzen(MODELLE.pfeil);
  zeichneInstanzen(MODELLE.kugel);
  // Baulinien: Erbauer zu ihrer Baustelle
  for (const e of world.entities) {
    if (e.kind !== 'unit' || !e.baut) continue;
    const site = byId(world, e.baut);
    if (!site) continue;
    const [ux, uy] = lage(e);
    const f = teamFarbe(e.player);
    v.push(ux * DM, 2, uy * DM, f[0], f[1], f[2], 0.7);
    v.push(site.x * DM, 1, site.y * DM, f[0], f[1], f[2], 0.15);
  }
  if (!v.length) return;
  gl.useProgram(PROG_L);
  gl.uniformMatrix4fv(gl.getUniformLocation(PROG_L, 'uVP'), false, VP);
  gl.bindVertexArray(linienVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, linienPuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(v), gl.DYNAMIC_DRAW);
  gl.drawArrays(gl.LINES, 0, v.length / 7);
  gl.bindVertexArray(null);
}

// ------------------------------------------------------------ Ueberlagerung (2D)
/** Kreis auf dem Boden (Mitte und Radius in Dezimetern), als Linienzug ins Overlay. */
function bodenKreis(x, y, r) {
  octx.beginPath();
  let offen = false;
  for (let i = 0; i <= 48; i++) {
    const w = (i / 48) * Math.PI * 2;
    const s = aufSchirm((x + Math.cos(w) * r) * DM, 0.3, (y + Math.sin(w) * r) * DM);
    if (!s) {
      offen = false;
      continue;
    }
    if (offen) octx.lineTo(s[0], s[1]);
    else octx.moveTo(s[0], s[1]);
    offen = true;
  }
  octx.stroke();
}

/** Schrein-Umkreise, Faehigkeits-Einsaetze, gerufene und festgehaltene Einheiten, Zielkreis. */
function zeichneWirkungen() {
  octx.lineWidth = 1;
  octx.setLineDash([6, 6]);
  for (const e of world.entities) {
    if (e.dead || e.kind !== 'building' || !e.done || !BUILDINGS[e.type].buff) continue;
    octx.strokeStyle = FACTIONS[world.players[e.player].faction].color;
    octx.globalAlpha = e.powered ? 0.5 : 0.18;
    bodenKreis(e.x, e.y, BUILDINGS[e.type].buff.radius);
  }
  octx.setLineDash([]);
  wirkungen = wirkungen.filter((w) => w.bis >= world.tick);
  octx.lineWidth = 2.5;
  for (const w of wirkungen) {
    const t = 1 - (w.bis - world.tick) / 12;
    octx.strokeStyle = faehigkeitFarbe(w.art);
    octx.globalAlpha = 1 - t;
    bodenKreis(w.x, w.y, w.r * (0.4 + 0.6 * t));
  }
  octx.globalAlpha = 1;
  octx.lineWidth = 1.5;
  for (const e of world.entities) {
    if (e.dead || e.kind !== 'unit') continue;
    const t = world.tick;
    const art = e.gebundenBis > t ? 'griff' : e.wehrBis > t ? 'wehr' : e.rufBis > t ? 'ruf' : e.tempoBis > t ? 'tempo' : e.beschworen ? 'rufen' : null;
    if (!art) continue;
    const [x, y] = lage(e);
    const m = aufSchirm(x * DM, 0.2, y * DM);
    if (!m) continue;
    octx.strokeStyle = faehigkeitFarbe(art);
    octx.beginPath();
    octx.ellipse(m[0], m[1], 9, 5, 0, 0, Math.PI * 2);
    octx.stroke();
  }
  if (zielen) {
    const f = FAEHIGKEITEN[zielen];
    const k = kommandantVon(world, ME);
    const drin = k && (hover.x - k.x) ** 2 + (hover.y - k.y) ** 2 <= f.reichweite ** 2;
    octx.strokeStyle = drin ? '#9a7a4a' : '#c4603f';
    octx.lineWidth = 2;
    bodenKreis(hover.x, hover.y, f.radius);
    if (k) {
      octx.lineWidth = 1;
      octx.setLineDash([4, 4]);
      bodenKreis(k.x, k.y, f.reichweite);
      octx.setLineDash([]);
    }
  }
}

function zeichneUeberlagerung(now) {
  const d = devicePixelRatio || 1;
  octx.setTransform(d, 0, 0, d, 0, 0);
  octx.clearRect(0, 0, ov.width, ov.height);
  zeichneWirkungen();
  // Auswahlringe
  octx.lineWidth = 1.5;
  octx.strokeStyle = '#f0f4e8';
  for (const id of sel) {
    const e = byId(world, id);
    if (!e) continue;
    const [x, y] = lage(e);
    const r = (e.kind === 'unit' ? UNITS[e.type].radius * ZEIGE_EINHEIT : BUILDINGS[e.type].radius * ZEIGE_GEBAEUDE) * DM * 1.4;
    const m = aufSchirm(x * DM, 0.2, y * DM);
    const rr = aufSchirm(x * DM + r, 0.2, y * DM);
    if (!m || !rr) continue;
    const rad = Math.max(6, Math.hypot(rr[0] - m[0], rr[1] - m[1]));
    octx.beginPath();
    octx.ellipse(m[0], m[1], rad, rad * 0.55, 0, 0, Math.PI * 2);
    octx.stroke();
  }
  // Lebensbalken: beschaedigt, ausgewaehlt oder Kommandant; Baufortschritt
  for (const e of world.entities) {
    const def = e.kind === 'unit' ? UNITS[e.type] : BUILDINGS[e.type];
    const zeigen = e.hp < e.maxHp || sel.includes(e.id) || def.commander || (e.kind === 'building' && !e.done);
    if (!zeigen) continue;
    const [x, y] = lage(e);
    const hoehe = e.kind === 'unit' ? def.radius * DM * ZEIGE_EINHEIT * (def.commander ? 3.6 : 2.6) : def.radius * DM * ZEIGE_GEBAEUDE * 3.2;
    const s = aufSchirm(x * DM, hoehe, y * DM);
    if (!s) continue;
    const w = def.commander ? 44 : e.kind === 'building' ? 34 : 18;
    octx.fillStyle = 'rgba(0,0,0,.7)';
    octx.fillRect(s[0] - w / 2 - 1, s[1] - 1, w + 2, 5);
    const anteil = e.hp / e.maxHp;
    octx.fillStyle = anteil < 0.34 ? '#c4603f' : e.player === ME ? '#8fc46a' : '#d07a5a';
    octx.fillRect(s[0] - w / 2, s[1], w * anteil, 3);
    if (e.kind === 'building' && !e.done) {
      const f = Math.min(1, e.progress / (def.buildTime * 1000));
      octx.fillStyle = '#d8b06a';
      octx.fillRect(s[0] - w / 2, s[1] + 4, w * f, 2);
    }
    if (def.commander) {
      octx.fillStyle = '#e8dcc0';
      octx.font = '11px ui-sans-serif, system-ui, sans-serif';
      octx.textAlign = 'center';
      octx.fillText(def.name, s[0], s[1] - 5);
    }
  }
  // Auswahlrahmen
  if (drag && !drag.pan) {
    octx.strokeStyle = '#c8d8b0';
    octx.setLineDash([4, 3]);
    octx.strokeRect(drag.sx, drag.sy, drag.x - drag.sx, drag.y - drag.sy);
    octx.setLineDash([]);
  }
  // Angriffs-Fadenkreuz
  if (angriff) {
    octx.strokeStyle = '#c4603f';
    octx.beginPath();
    octx.arc(maus.x, maus.y, 10, 0, Math.PI * 2);
    octx.moveTo(maus.x - 15, maus.y);
    octx.lineTo(maus.x + 15, maus.y);
    octx.moveTo(maus.x, maus.y - 15);
    octx.lineTo(maus.x, maus.y + 15);
    octx.stroke();
  }
  if (placing) {
    octx.fillStyle = '#d8dcd0';
    octx.font = '12px ui-sans-serif, system-ui, sans-serif';
    octx.textAlign = 'center';
    const drin = inDomain(world, ME, hover.x, hover.y);
    const def = BUILDINGS[placing];
    const text =
      def.name +
      (drin || !def.gegenwartIn ? '' : ' — außerhalb der Domäne: ohne Gegenwart') +
      (erbauer3().length ? '' : ' — keine Erbauer gewählt: die Baustelle wartet');
    octx.fillText(text, maus.x, maus.y - 24);
  }
}

// ------------------------------------------------------------ HUD und Minikarte
function zeichneHud() {
  const p = world.players[ME];
  const k = kommandantVon(world, ME);
  let auswahl = '';
  if (sel.length === 1) {
    const e = byId(world, sel[0]);
    if (e && e.kind === 'building') {
      const def = BUILDINGS[e.type];
      const zustand = !e.done
        ? baustelleText(world, e)
        : e.powered < 1000
          ? `gedrosselt ${Math.round(e.powered / 10)} %`
          : 'versorgt';
      const tasten = ausbildungHtml(world, ME, e.type);
      auswahl = `<div class="sel">${auswahlKopf(world, e)} · ${zustand}${reparaturText(world, e)}${e.queue.length ? ` · ${e.queue.length} in Auftrag` : ''}
        ${tasten}<div class="keys">${def.vital ? '' : '<kbd>Entf</kbd> abreißen'}</div></div>`;
    } else if (e) {
      auswahl = `<div class="sel">${auswahlKopf(world, e)}${einheitKarte(world, ME, e.type)}</div>`;
    }
  } else if (sel.length > 1) {
    const zahl = {};
    for (const id of sel) {
      const e = byId(world, id);
      if (e) zahl[UNITS[e.type]?.name || e.type] = (zahl[UNITS[e.type]?.name || e.type] || 0) + 1;
    }
    auswahl = `<div class="sel">${Object.entries(zahl).map(([n, z]) => `${z}× ${n}`).join(' · ')}</div>`;
  }
  const einheiten = world.entities.filter((e) => e.kind === 'unit' && e.player === ME).length;
  document.getElementById('ressourcen').innerHTML = ressourcenHtml(world, ME);
  document.getElementById('hud').innerHTML = `
    <div class="fac">${FACTIONS[meFaction].name}${aiMe ? ' · Zuschauen' : ''} · Gegner ${gegnerStil}</div>
    <div class="res">
      <b title="Förderung minus Unterhalt der Einheiten">Fron/min</b><span>+${foerderungProMin(world, ME)} −${unterhaltProMin(world, ME)}</span>
      ${skillZeile(world, ME)}
      <b>Einheiten</b><span>${einheiten}</span>
      ${k ? `<b>${UNITS[k.type].name} <kbd>K</kbd></b><span>${Math.round((100 * k.hp) / k.maxHp)} %</span>` : ''}
      <b>Zeit</b><span>${(world.tick / 600).toFixed(1)} min${paused ? ' ⏸' : ''} ×${speed}</span>
    </div>
    ${auswahl}
    ${world.over ? `<div class="over">${world.winner === ME ? 'Gewonnen' : 'Verloren'}</div>` : ''}`;
}

function zeichneMini() {
  const W = mini3.width;
  mctx3.fillStyle = '#0b0d08';
  mctx3.fillRect(0, 0, W, W);
  const s = W / MAP;
  for (let p = 0; p < 2; p++) {
    mctx3.fillStyle = FACTIONS[world.players[p].faction].color;
    mctx3.globalAlpha = 0.18;
    for (const e of world.entities) {
      if (e.player !== p || e.kind !== 'building') continue;
      const r = anchorRadius(world, e);
      if (!r) continue;
      mctx3.beginPath();
      mctx3.arc(e.x * s, e.y * s, r * s, 0, Math.PI * 2);
      mctx3.fill();
    }
    mctx3.globalAlpha = 1;
    for (const e of world.entities) {
      if (e.player !== p) continue;
      const sz = e.kind === 'building' ? 4 : UNITS[e.type].commander ? 6 : 2.5;
      mctx3.fillRect(e.x * s - sz / 2, e.y * s - sz / 2, sz, sz);
    }
  }
  // Kamera-Ziel
  mctx3.strokeStyle = '#e8dcc0';
  mctx3.lineWidth = 2;
  mctx3.beginPath();
  mctx3.arc((kam.x / DM) * s, (kam.z / DM) * s, Math.max(6, (kam.dist / DM) * s * 0.35), 0, Math.PI * 2);
  mctx3.stroke();
}

// ------------------------------------------------------------ Startbildschirm
const STIL_NAMEN3 = { sturm: 'Sturm — greift früh an', standard: 'Standard', burg: 'Burg — baut aus, greift spät an' };
function introHtml3() {
  return `<h1>Die drei Reiche — 3D</h1>
    <p class="frage">Fördern, aufbauen, ausbreiten — und Hauptgebäude oder Kommandant des Gegners zerstören.</p>
    <p>Menschen: viele günstige Einheiten. Wald- und Wiesengott: wenige starke. Die Domäne
    (farbige Fläche) zeigt, wo Gegenwart fließt; Schreine stärken eigene Einheiten in ihrem Umkreis, soweit er in der Domäne liegt. Fällt der Kommandant,
    ist die Partie verloren.</p>
    <p>Gebäude entstehen nur, solange <b>Erbauer</b> (Arbeiter oder Kommandant) mit Auftrag daneben
    stehen: Erbauer wählen, dann Gebäude setzen oder Rechtsklick auf eine Baustelle.</p>
    <p>Jede Einheit kostet laufend <b>Unterhalt</b> in Fron — große Heere fressen die Wirtschaft.
    Mit der Zeit kommen <b>Skillpunkte</b> (<kbd>T</kbd>): Sie schalten Fernkämpfer, schwere Einheiten,
    Schreine, Verbesserungen und drei Fähigkeiten des Kommandanten frei — Kommandant wählen, dann
    <kbd>Q</kbd>–<kbd>E</kbd> oder die Knöpfe. Wer lange lebt,
    sammelt ein wenig Erfahrung.</p>
    <p style="color:var(--dim)">Dieselbe Simulation wie die 2D-Ansicht — Modelle sind bewusst einfach.</p>
    <div class="stil">Gegner:
      ${Object.keys(STILE)
        .map((s) => `<label><input type="radio" name="stil" value="${s}"${s === gegnerStil ? ' checked' : ''}> ${STIL_NAMEN3[s]}</label>`)
        .join('')}
    </div>
    <div class="go">
      <button id="introMensch">Als Menschen spielen</button>
      <button id="introGott">Als Gott spielen</button>
      <button id="introSchau">Zuschauen</button>
    </div>`;
}
function starte3(f, zuschauen) {
  const gewaehlt = document.querySelector?.('#intro input[name="stil"]:checked');
  if (gewaehlt) gegnerStil = gewaehlt.value;
  document.getElementById('intro').style.display = 'none';
  paused = false;
  neu(f, zuschauen);
}

// ------------------------------------------------------------ Start
if (!gl) {
  document.getElementById('nogl').style.display = 'grid';
  document.getElementById('intro').style.display = 'none';
} else {
  initGL();
  document.getElementById('intro').innerHTML = introHtml3();
  document.getElementById('introMensch').onclick = () => starte3('mensch', false);
  document.getElementById('introGott').onclick = () => starte3('gott', false);
  document.getElementById('introSchau').onclick = () => starte3('mensch', true);
  neu('mensch', true);
  paused = true;
  requestAnimationFrame(frame);
}
