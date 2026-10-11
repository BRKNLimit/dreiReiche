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
out vec3 vNor;
out vec2 vWasserInfo; // x: istWasser, y: Zeit/Phase
out vec3 vObjPos;
out float vWeltY;
void main() {
  vTeam = iC.rgb;
  float c = cos(iA.w), s = sin(iA.w);
  vec3 a = aPos;

  float istWaldgott = (aCol.a > 0.03 && aCol.a < 0.08) ? 1.0 : 0.0;
  float istWasser = (aCol.a > 0.74 && aCol.a < 0.80) ? 1.0 : 0.0;
  vWasserInfo = vec2(istWasser, iC.w);

  if (istWasser > 0.5) {
    // Sanfte vertikale Wellenbewegung im Wasser
    vec2 wp = iA.xz + vec2(c * a.x + s * a.z, -s * a.x + c * a.z) * iB.x;
    float t = iC.w * 1.8;
    float w1 = sin(wp.x * 0.28 + wp.y * 0.22 + t * 2.0) * 0.06;
    float w2 = cos(wp.x * 0.18 - wp.y * 0.32 + t * 1.5) * 0.04;
    a.y += w1 + w2;
  } else if (istWaldgott > 0.5) {
    // 1. Waldgott: schwebender Mantel mit Wurzeln, organisches Brustkorb-Atmen
    float saum = max(0.0, 0.85 - a.y);
    a.z += iC.w * 0.22 * saum;
    a.x += sin(iC.w * 3.14159 + a.y * 3.5) * 0.03 * saum;
    float atmen = sin(iC.w * 3.14159265);
    float brust = smoothstep(1.5, 2.7, a.y) * smoothstep(4.2, 2.7, a.y);
    a.x += aNor.x * atmen * 0.025 * brust;
    a.z += aNor.z * atmen * 0.035 * brust;
  } else if (abs(iC.w) > 0.001) {
    // 2. Echter Gang fuer Zweibeiner und Vierbeiner (Beine vor/zurueck, Arme gegengleich)
    float maxHip = aPos.y > 1.0 ? 1.85 : 0.90;
    if (aPos.y < maxHip) {
      float beinX = smoothstep(0.03, 0.12, abs(aPos.x));
      float beinFade = clamp((maxHip - aPos.y) / maxHip, 0.0, 1.0) * beinX;
      float phase = 0.0;
      if (abs(aPos.z) > 0.22 && aPos.y < 0.90) {
        // Vierbeiner: diagonaler Kreuzgang (VL + HR gegen VR + HL)
        float xSign = aPos.x > 0.0 ? 1.0 : -1.0;
        float zSign = aPos.z > 0.0 ? 1.0 : -1.0;
        phase = xSign * zSign;
      } else {
        // Zweibeiner: linkes und rechtes Bein gegenphasig
        phase = aPos.x < 0.0 ? 1.0 : -1.0;
      }
      float stride = phase * iC.w * 0.36 * beinFade;
      float lift = max(0.0, stride * 0.6) * beinFade * 0.16;
      a.y += lift;
      a.z += stride;
    }
    // Arme schwingen gegenphasig zu den Beinen
    if (aPos.y >= 0.70 && aPos.y <= 1.55 && abs(aPos.x) > 0.22 && abs(aPos.z) < 0.40) {
      float armFade = smoothstep(0.22, 0.38, abs(aPos.x)) * smoothstep(1.55, 1.25, aPos.y) * smoothstep(0.70, 0.95, aPos.y);
      float armSign = aPos.x < 0.0 ? -1.0 : 1.0;
      a.z += armSign * iC.w * 0.16 * armFade;
    }
  }

  // 3. Aufsteigende Glut- und Funkenpartikel schweben lebendig im magischen Auftrieb
  if (aCol.a > 1.5 && a.y > 1.4 && abs(iC.w) > 0.001) {
    a.y += sin(iC.w * 3.14159 + aPos.x * 6.0 + aPos.z * 5.0) * 0.05;
    a.x += cos(iC.w * 2.5 + aPos.y * 4.0) * 0.025;
    a.z += sin(iC.w * 2.0 + aPos.y * 4.0) * 0.025;
  }

  vec3 p = a * vec3(iB.x, iB.x * iB.y, iB.x);
  vec3 r = vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z) + iA.xyz;
  vec3 n = normalize(vec3(c * aNor.x + s * aNor.z, aNor.y / max(iB.y, 0.05), -s * aNor.x + c * aNor.z));
  vNor = n;
  vObjPos = aPos;
  vWeltY = r.y;

  // Selbstleuchtende Teile behalten ihre eigene Farbe, ohne Fraktionsfarbe.
  float team = (aCol.a > 1.5 || istWasser > 0.5) ? 0.0 : aCol.a;
  vec3 col = mix(aCol.rgb, iC.rgb, team) * iB.z;

  if (istWasser > 0.5) {
    // Wasser erhaelt die Basisfarbe direkt; Schattierung & Glanz erfolgen im Fragment-Shader
    vCol = vec4(col, iB.w);
  } else if (aCol.a > 1.5) {
    // Magisch gluehende Elemente (Augen, Kristalle, Glutherz) pulsieren im Atemrhythmus
    float puls = 1.0 + 0.22 * sin(iC.w * 3.14159265);
    vCol = vec4(col * 1.55 * puls, iB.w);
  } else {
    // Hemi-Umgebungslicht (kühler Himmel oben, warmer Erdboden unten)
    vec3 ambient = mix(vec3(0.32, 0.30, 0.25), vec3(0.48, 0.52, 0.56), n.y * 0.5 + 0.5);
    float d = max(dot(n, uLicht), 0.0);
    vec3 sonne = vec3(0.85, 0.82, 0.75) * d;
    // Randlicht (Rim Light) hebt Silhouetten aus Spielhöhe plastisch hervor
    float rim = pow(1.0 - max(dot(n, vec3(0.0, 0.8, 0.6)), 0.0), 2.2) * 0.24;
    vCol = vec4(col * (ambient + sonne) + col * rim, iB.w);
  }

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
in vec3 vNor;
in vec2 vWasserInfo;
in vec3 vObjPos;
in float vWeltY;
uniform highp vec3 uLicht; // highp wie im Vertex-Shader -- sonst bricht das Linken ab (Notfix Claude)
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

  // 1. Weiche Schatten unter Einheiten und Gebaeuden (flache, halbtransparente dunkle Scheiben)
  float istSchatten = (max(vCol.r, max(vCol.g, vCol.b)) < 0.02 && vCol.a < 0.45 && abs(vNor.y) > 0.85) ? 1.0 : 0.0;
  if (istSchatten > 0.5) {
    float rDist = length(vObjPos.xz);
    float weich = smoothstep(1.0, 0.22, rDist);
    o = vec4(vec3(0.0), vCol.a * weich);
    return;
  }

  vec3 farbe = vCol.rgb;

  // 2. Dynamische Wasseroberflaeche: bewegte Wellen, Glanz, Schaumkronen, Reflexion
  if (vWasserInfo.x > 0.5) {
    float t = vWasserInfo.y * 1.6;
    vec2 wp = vWelt * 0.22;

    float a1 = wp.x * 0.85 + wp.y * 0.52 + t * 2.2;
    float a2 = -wp.x * 0.48 + wp.y * 0.88 + t * 1.7;
    float a3 = wp.x * 1.65 - wp.y * 1.42 + t * 3.4;

    float s1 = sin(a1), c1 = cos(a1);
    float s2 = sin(a2), c2 = cos(a2);
    float s3 = sin(a3), c3 = cos(a3);

    float dHdx = 0.85 * c1 * 0.14 - 0.48 * c2 * 0.09 + 1.65 * c3 * 0.05;
    float dHdz = 0.52 * c1 * 0.14 + 0.88 * c2 * 0.09 - 1.42 * c3 * 0.05;

    vec3 wN = normalize(vec3(-dHdx * 3.2, 1.0, -dHdz * 3.2));
    vec3 blick = normalize(vec3(0.08, 1.35, 0.95));

    // Reflektierter Sonnenstrahl & scharfer Glanzpunkt
    vec3 refLicht = reflect(-uLicht, wN);
    float spec = pow(max(dot(refLicht, blick), 0.0), 36.0);
    float glanz = spec * 1.8;
    float specBreit = pow(max(dot(refLicht, blick), 0.0), 8.0) * 0.35;

    // Weiche Fresnel-Reflexion des Himmels
    float fresnel = pow(1.0 - max(dot(wN, blick), 0.0), 2.5);

    vec3 tiefesWasser = farbe * 0.75;
    vec3 himmelSpiegel = vec3(0.32, 0.62, 0.78);
    vec3 basisWasser = mix(tiefesWasser, himmelSpiegel, fresnel * 0.65);

    // Zarte Schaumkronen auf hohen Wellenkaemmen
    float schaumKamm = max(0.0, s1 * 0.5 + s2 * 0.35 + s3 * 0.15 - 0.68) * 2.2;
    vec3 schaum = vec3(0.88, 0.94, 0.98) * schaumKamm * 0.45;

    vec3 sonnenGlanz = vec3(1.0, 0.95, 0.82) * (glanz + specBreit);
    farbe = basisWasser + sonnenGlanz + schaum;
  } else {
    // 3. Feste Oberflaechen: Kontaktschatten, Spalt-AO und prozedurale Texturen (60 FPS stabil)
    float bodenDist = max(0.0, vWeltY);
    // Kontaktschatten: Objekte dunkeln am Boden sanft ab (feste Erdverbundenheit)
    float kontaktAO = clamp(smoothstep(0.0, 0.65, bodenDist) * 0.32 + 0.68, 0.60, 1.0);
    // Spalt-AO: Abwaerts zeigende / tiefere Nischen werden schattiert
    float spaltAO = clamp(vNor.y * 0.22 + 0.78, 0.58, 1.0);
    float ao = kontaktAO * spaltAO;

    // Prozedurale Oberflaechenstruktur (Holzmaserung, Stein, Rinde, Fell)
    // Nur fuer normale Materialien, nicht fuer selbstleuchtende Magieteile
    if (vCol.a <= 1.5) {
      vec3 p = vObjPos;
      float rausch = 0.0;

      // A. Holz & Rinde (warme Brauntoene: r > b, g > b)
      if (farbe.r > farbe.b * 1.25 && farbe.g > farbe.b * 1.05) {
        float maser = sin(p.y * 22.0 + sin(p.x * 12.0 + p.z * 12.0) * 1.6);
        float feinfaser = cos(p.y * 48.0 + p.x * 18.0);
        rausch = (maser * 0.65 + feinfaser * 0.35) * 0.065;
      }
      // B. Stein & Metall (neutrale Grautoene: r ~= g ~= b)
      else if (abs(farbe.r - farbe.g) < 0.08 && abs(farbe.g - farbe.b) * 0.9 < 0.08) {
        float korn1 = sin(p.x * 30.0 + p.y * 26.0);
        float korn2 = cos(p.z * 32.0 - p.y * 22.0);
        rausch = (korn1 * 0.5 + korn2 * 0.5) * 0.055;
      }
      // C. Fell & organisches Gewebe (Pelz von Woelfen, Reittieren etc.)
      else if (farbe.r > 0.12 && farbe.g < farbe.r * 1.1) {
        float fell1 = sin((p.x + p.y + p.z) * 42.0);
        float fell2 = cos((p.x - p.y + p.z) * 36.0);
        rausch = (fell1 * 0.55 + fell2 * 0.45) * 0.045;
      }
      // D. Laub & Wiese (Gruentoene)
      else if (farbe.g > farbe.r * 1.08 && farbe.g > farbe.b * 1.08) {
        float blatt = sin(p.x * 25.0 + p.z * 25.0) * cos(p.y * 25.0);
        rausch = blatt * 0.05;
      }
      else {
        rausch = (sin(p.x * 22.0) * cos(p.y * 22.0 + p.z * 18.0)) * 0.035;
      }

      farbe = clamp(farbe * (1.0 + rausch) * ao, 0.0, 1.0);

      // 4. Metall- und Goldschimmer: Blinn-Phong Glanzlicht fuer Waffen, Ruestungen und Ornamente
      vec3 blick = normalize(vec3(0.0, 1.25, 0.95));
      vec3 halb = normalize(uLicht + blick);
      vec3 n = normalize(vNor);
      float nDotH = max(dot(n, halb), 0.0);

      if (abs(farbe.r - farbe.g) < 0.08 && abs(farbe.g - farbe.b) < 0.08 && farbe.r > 0.28) {
        float metallGlanz = pow(nDotH, 22.0) * (0.38 * smoothstep(0.28, 0.70, farbe.r));
        farbe += vec3(0.85, 0.92, 1.0) * metallGlanz * ao;
      } else if (farbe.r > 0.60 && farbe.g > 0.42 && farbe.b < 0.32) {
        float goldGlanz = pow(nDotH, 18.0) * 0.45;
        farbe += vec3(1.0, 0.85, 0.35) * goldGlanz * ao;
      }
    }
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
  o = vec4(mix(farbe, uNebel, f) * mix(0.16, 1.0, sicht), vCol.a);
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

