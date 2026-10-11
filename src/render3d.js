// Renderer der 3D-Ansicht: Mathematik, Geometrie aus Grundkoerpern, Shader, Instanzen.
// Gehoert zur Grafik (siehe GEMINI.md). Wird von tools/bundle.mjs mit den
// anderen Dateien zu einem Skript zusammengefuegt -- Bezeichner aus frueheren
// Dateien (gl, MAP, KARTE, ...) sind dort global. Exporte gibt es nur fuer die
// Tests unter Node.

export const DM = 0.1; // Dezimeter -> Meter
export const HEX = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
// Farbe von Ferne und Hintergrund (Dunst)
const NEBEL = [0.07, 0.08, 0.06];

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
export function baueModell(teile) {
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
out vec2 vWelt;
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
  vWelt = r.xz;
}`;
const FS = `#version 300 es
precision mediump float;
in vec4 vCol;
in float vTiefe;
in vec3 vTeam;
in vec2 vWelt;
uniform vec3 uNebel;
uniform float uRoentgen; // 1: verdeckte Einheit als Umriss in Teamfarbe
uniform sampler2D uSicht; // Nebel des Krieges: 1 sichtbar, 0.47 erkundet, 0 unbekannt
uniform float uKarte; // Kantenlaenge der Karte in Metern
out vec4 o;
void main() {
  if (uRoentgen > 0.5) {
    o = vec4(mix(vTeam, vec3(1.0), 0.3), 0.5);
    return;
  }
  float f = clamp((vTiefe - 700.0) / 1600.0, 0.0, 0.55);
  // Weiche, runde Nebelraender statt blockiger Rasterkanten
  vec2 uv = clamp(vWelt / uKarte, 0.0, 1.0);
  vec2 ts = vec2(textureSize(uSicht, 0));
  vec2 d = 0.55 / max(ts, vec2(1.0));
  float s0 = texture(uSicht, uv).r;
  float s1 = texture(uSicht, uv + vec2(d.x, 0.0)).r;
  float s2 = texture(uSicht, uv - vec2(d.x, 0.0)).r;
  float s3 = texture(uSicht, uv + vec2(0.0, d.y)).r;
  float s4 = texture(uSicht, uv - vec2(0.0, d.y)).r;
  float sicht = (s0 * 2.0 + s1 + s2 + s3 + s4) * (1.0 / 6.0);
  o = vec4(mix(vCol.rgb, uNebel, f) * mix(0.16, 1.0, sicht), vCol.a);
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
export function ladeModell(daten) {
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

function initGL() {
  PROG = programm(VS, FS);
  PROG_L = programm(VS_LINIE, FS_LINIE);
  for (const [k, teile] of Object.entries(MODELLE_DEF)) MODELLE[k] = ladeModell(baueModell(teile));
  bodenModell = typeof baueBoden === 'function' ? baueBoden() : null; // die Galerie hat kein Gelaende
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

