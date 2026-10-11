// Modell-Galerie: zeigt Modelle drehend nebeneinander, damit der Nutzer den
// Grafikstil auswaehlen kann -- zuerst die Varianten des Waldgotts, dann
// alle Einheiten, Gebaeude, Karte und Effekte, dazu die Icons.
// Gehoert zur Grafik (siehe GEMINI.md). Nutzt denselben Renderer wie die
// 3D-Ansicht (src/render3d.js) und dieselben Modelle (src/modelle3d.js).
// Wird von tools/bundle.mjs zu dist/galerie.html zusammengefuegt.

const leinwand = document.getElementById('leinwand');
const gl = leinwand.getContext('webgl2', { antialias: true, stencil: true });
const TEAMFARBE = { mensch: HEX('#d8b06a'), gott: HEX('#8fb86a') };
const WEISS = [1, 1, 1];
let ansicht = 'waldgott';
let gehenAktiv = false;
let schilderSig = '';
let festerWinkel = null; // aus dem Anker (#einheiten&winkel=0.5 oder #einheiten/winkel=0.5): stehendes Bild fuer Vergleiche
const masse = {}; // Modell -> { hoehe, breite } fuer die Kamera

/** Ein Modell laden und seine Ausdehnung merken. */
function lade(key, teile) {
  const daten = baueModell(teile);
  let hoehe = 0.1;
  let breite = 0.1;
  for (let i = 0; i < daten.length; i += 10) {
    hoehe = Math.max(hoehe, daten[i + 1]);
    breite = Math.max(breite, Math.abs(daten[i]), Math.abs(daten[i + 2]));
  }
  MODELLE[key] = ladeModell(daten);
  masse[key] = { hoehe, breite };
}

/** Was in der aktuellen Ansicht gezeigt wird: Modell, Name, Farbe. */
function eintraege() {
  if (ansicht === 'waldgott') {
    return Object.keys(WALDGOTT_VARIANTEN).map((n) => ({ key: 'variante:' + n, name: n, team: TEAMFARBE.gott }));
  }
  if (ansicht === 'einheiten') {
    const res = [];
    for (const k of Object.keys(UNITS)) {
      if (k === 'waldgeist') {
        res.push(
          { key: 'waldgeist_fruehling', name: 'Waldgeist (Frühling)', team: TEAMFARBE.gott },
          { key: 'waldgeist_sommer', name: 'Waldgeist (Sommer)', team: TEAMFARBE.gott },
          { key: 'waldgeist_herbst', name: 'Waldgeist (Herbst)', team: TEAMFARBE.gott },
          { key: 'waldgeist_winter', name: 'Waldgeist (Winter)', team: TEAMFARBE.gott }
        );
      } else {
        res.push({ key: k, name: UNITS[k].name, team: TEAMFARBE[UNITS[k].faction] });
      }
    }
    return res;
  }
  if (ansicht === 'gebaeude') {
    return Object.keys(BUILDINGS).map((k) => ({ key: k, name: BUILDINGS[k].name, team: TEAMFARBE[BUILDINGS[k].faction] }));
  }
  const reste = Object.keys(MODELLE_DEF).filter((k) => !UNITS[k] && !BUILDINGS[k] && k !== 'scheibe');
  return reste.map((k) => ({ key: k, name: k, team: WEISS }));
}

/** Raster: so viele Spalten, dass die Zellen etwa quadratisch werden. */
function raster(n, w, h) {
  const spalten = Math.max(1, Math.round(Math.sqrt((n * w) / h)));
  const zeilen = Math.ceil(n / spalten);
  return { spalten, zeilen, zw: w / spalten, zh: h / zeilen };
}

/** Namensschilder als HTML ueber den Zellen; nur neu, wenn sich etwas aendert. */
function schilder(liste, r) {
  const sig = ansicht + '|' + liste.length + '|' + Math.round(r.zw) + 'x' + Math.round(r.zh);
  if (sig === schilderSig) return;
  schilderSig = sig;
  document.getElementById('schilder').innerHTML = liste
    .map((e, i) => {
      const x = (i % r.spalten) * r.zw;
      const y = Math.floor(i / r.spalten) * r.zh;
      return `<div class="schild" style="left:${x}px;top:${y}px">${e.name}</div>`;
    })
    .join('');
}

/** Ein Bild: jede Zelle mit eigener Kamera, das Modell dreht sich langsam. */
function bild(now) {
  requestAnimationFrame(bild);
  if (ansicht === 'icons') return;
  const d = devicePixelRatio || 1;
  const w = leinwand.clientWidth;
  const h = leinwand.clientHeight;
  if (leinwand.width !== ((w * d) | 0) || leinwand.height !== ((h * d) | 0)) {
    leinwand.width = (w * d) | 0;
    leinwand.height = (h * d) | 0;
  }
  const liste = eintraege();
  const r = raster(liste.length, w, h);
  schilder(liste, r);

  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.disable(gl.CULL_FACE);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.enable(gl.SCISSOR_TEST);
  gl.scissor(0, 0, leinwand.width, leinwand.height);
  gl.clearColor(NEBEL[0], NEBEL[1], NEBEL[2], 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.useProgram(PROG);
  const l = [0.45, 1, 0.3];
  const ll = Math.hypot(...l);
  gl.uniform3f(gl.getUniformLocation(PROG, 'uLicht'), l[0] / ll, l[1] / ll, l[2] / ll);
  gl.uniform3f(gl.getUniformLocation(PROG, 'uNebel'), ...NEBEL);
  gl.uniform1f(gl.getUniformLocation(PROG, 'uRoentgen'), 0);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, sichtTex);
  gl.uniform1i(gl.getUniformLocation(PROG, 'uSicht'), 0);
  gl.uniform1f(gl.getUniformLocation(PROG, 'uKarte'), 1e6);

  const drehung = festerWinkel ?? (now / 1000) * 0.6;
  liste.forEach((e, i) => {
    if (!MODELLE[e.key]) return;
    const x = (i % r.spalten) * r.zw;
    const y = Math.floor(i / r.spalten) * r.zh;
    // GL zaehlt von unten
    const vx = Math.round(x * d);
    const vy = Math.round((h - y - r.zh) * d);
    const vw = Math.round(r.zw * d) - 2;
    const vh = Math.round(r.zh * d) - 2;
    gl.viewport(vx, vy, vw, vh);
    gl.scissor(vx, vy, vw, vh);
    gl.clearColor(0.09, 0.11, 0.08, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const m = masse[e.key];
    const gross = Math.max(m.hoehe, m.breite * 2);
    const abstand = gross * 1.7 + 0.5;
    const ziel = [0, m.hoehe * 0.45, 0];
    const auge = [0, m.hoehe * 0.45 + abstand * 0.45, abstand];
    const vp = m4mul(m4persp(0.7, vw / vh, 0.05, 200), m4look(auge, ziel, [0, 1, 0]));
    gl.uniformMatrix4fv(gl.getUniformLocation(PROG, 'uVP'), false, vp);
    // Boden-Scheibe als Standflaeche
    instanz('scheibe', 0, 0, 0, 0, m.breite * 1.3, [0.2, 0.25, 0.16], 1, 1, 1);
    zeichneInstanzen(MODELLE.scheibe);
    // Im Stand stehen alle Modelle still, nur der Waldgott atmet sanft;
    // echter Gang wird ueber den Knopf 'Gehen' zugeschaltet.
    const istWaldgott = ansicht === 'waldgott' || e.key === 'waldgott' || e.key.startsWith('variante:');
    const schritt = (ansicht === 'waldgott' || ansicht === 'einheiten')
      ? (gehenAktiv ? Math.sin(now * 0.003) : (istWaldgott ? Math.sin(now * 0.002) * 0.5 : 0))
      : 0;
    instanz(e.key, 0, 0, 0, drehung, 1, e.team, 1, 1, 1, schritt);
    zeichneInstanzen(MODELLE[e.key]);
  });
  gl.disable(gl.SCISSOR_TEST);
}

/** Icons in drei Groessen, ohne WebGL. */
function iconsZeigen() {
  const namen = {
    ...Object.fromEntries(Object.entries(UNITS).map(([k, u]) => [k, u.name])),
    ...Object.fromEntries(Object.entries(BUILDINGS).map(([k, b]) => [k, b.name])),
    skillpunkte: 'Skillpunkte',
    gegenwart: 'Gegenwart',
    goetterblut: 'Götterblut',
    fron: 'Fron',
    ton: 'Ton (an)',
    stumm: 'Stumm',
    hilfe: 'Hilfe',
    wiederholung: 'Wiederholung',
    sammelpunkt: 'Sammelpunkt',
    steuergruppe: 'Steuergruppe',
  };
  document.getElementById('icons').innerHTML = Object.entries(ICONS)
    .map(
      ([k, svg]) => `<div class="ic"><div class="reihe">
        <span style="width:20px;height:20px">${svg}</span>
        <span style="width:36px;height:36px">${svg}</span>
        <span style="width:64px;height:64px">${svg}</span></div><b>${namen[k] || k}</b></div>`
    )
    .join('');
}

function wechsle(neu) {
  ansicht = neu;
  schilderSig = '';
  for (const b of document.querySelectorAll('#kopf [data-ansicht]')) b.className = b.dataset.ansicht === neu ? 'an' : '';
  const icons = neu === 'icons';
  document.getElementById('icons').style.display = icons ? 'grid' : 'none';
  leinwand.style.display = icons ? 'none' : 'block';
  document.getElementById('schilder').style.display = icons ? 'none' : 'block';
  document.getElementById('hinweis').textContent =
    neu === 'waldgott' ? 'Welche Variante gefällt dir am besten? Nenne ihren Buchstaben.' : 'Teamfarbe: Menschen gold, Gott grün.';
  if (icons) iconsZeigen();
}

let sichtTex = null;
function start() {
  for (const b of document.querySelectorAll('#kopf [data-ansicht]')) b.onclick = () => wechsle(b.dataset.ansicht);
  const btnGehen = document.getElementById('btn-gehen');
  if (btnGehen) {
    btnGehen.onclick = () => {
      gehenAktiv = !gehenAktiv;
      btnGehen.textContent = 'Gehen: ' + (gehenAktiv ? 'An' : 'Aus');
      btnGehen.className = gehenAktiv ? 'an' : '';
    };
  }
  if (!gl) {
    document.getElementById('nogl').style.display = 'flex';
    return;
  }
  initGL();
  for (const [k, teile] of Object.entries(MODELLE_DEF)) lade(k, teile);
  for (const [n, teile] of Object.entries(WALDGOTT_VARIANTEN)) lade('variante:' + n, teile);
  // Kein Nebel in der Galerie: eine weisse Sicht-Textur
  sichtTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, sichtTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, 1, 1, 0, gl.RED, gl.UNSIGNED_BYTE, new Uint8Array([255]));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  // Ansicht aus dem Anker der Adresse, z. B. galerie.html#icons
  const [anker, ...optionen] = (typeof location !== 'undefined' ? location.hash.slice(1) : '').split(/[&/]/);
  for (const o of optionen) if (o.startsWith('winkel=')) festerWinkel = parseFloat(o.slice(7)) || 0;
  if (['waldgott', 'einheiten', 'gebaeude', 'karte', 'icons'].includes(anker)) wechsle(anker);
  requestAnimationFrame(bild);
}
start();
