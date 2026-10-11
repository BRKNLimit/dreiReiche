// Karteneditor. Eigene Karten malen: Felsen, Seen, Fluss mit Furten,
// Adern, Wald und Wiesen -- alles automatisch punktgespiegelt, mit
// laufender Pruefung (src/sim/kartenbau.js). Gespeichert wird im Browser
// (dieselbe Liste, die der Startbildschirm des Spiels zeigt) oder als Datei.
// Gezeichnet wird wie im Spiel, mit src/gelaende2d.js (Gemini); dafuer stellt
// diese Datei dieselben Namen bereit wie ui.js: ctx, cam, w2sx, w2sy, COL, world.
// Wird von tools/bundle.mjs mit der Sim zusammengefuegt -- keine Imports.

const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
const cam = { x: MAP / 2, y: MAP / 2, z: 0.03 };
const COL = { bg: '#12140f', cleared: '#2a2318', text: '#d8dcd0', bad: '#c4603f', gold: '#d8b06a' };
const w2sx = (x) => (x - cam.x) * cam.z + cv.clientWidth / 2;
const w2sy = (y) => (y - cam.y) * cam.z + cv.clientHeight / 2;
const s2wx = (x) => (x - cv.clientWidth / 2) / cam.z + cam.x;
const s2wy = (y) => (y - cv.clientHeight / 2) / cam.z + cam.y;

// Die Karte in Arbeit, und was gelaende2d.js als "world" erwartet
let entwurf = leereKarte('Meine Karte');
let world = { hindernisse: entwurf.hindernisse, cleared: [] };
const rueckSchritte = []; // fuer Strg+Z: fruehere Staende als JSON
let flussPunkte = []; // Punkte des Flusses, der gerade gezogen wird
let mausPunkt = null; // Weltpunkt unter der Maus
let malt = false;
let zuletztGemalt = null;

const WERKZEUGE = [
  { id: 'fels', name: 'Fels', taste: '1', groesse: 600 },
  { id: 'see', name: 'See', taste: '2', groesse: 1100 },
  { id: 'fluss', name: 'Fluss', taste: '3', groesse: 300 },
  { id: 'furt', name: 'Furt', taste: '4', groesse: 520 },
  { id: 'fron', name: 'Fron-Ader', taste: '5', groesse: 200 },
  { id: 'goetterblut', name: 'Götterblut', taste: '6', groesse: 200 },
  { id: 'wald', name: 'Wald', taste: '7', groesse: 2200 },
  { id: 'wiese', name: 'Wiese', taste: '8', groesse: 2000 },
  { id: 'weg', name: 'Radierer', taste: '9', groesse: 800 },
];
let werkzeug = WERKZEUGE[0];
const groessen = Object.fromEntries(WERKZEUGE.map((w) => [w.id, w.groesse]));

// ------------------------------------------------------------ Aendern

/** Vor jeder Aenderung: Stand merken (Strg+Z). */
function merken() {
  rueckSchritte.push(JSON.stringify(entwurf));
  if (rueckSchritte.length > 100) rueckSchritte.shift();
}
function rueckgaengig() {
  const alt = rueckSchritte.pop();
  if (!alt) return;
  entwurf = JSON.parse(alt);
  geaendert();
}
/** Nach jeder Aenderung: Darstellung und Pruefung auf den neuen Stand. */
function geaendert() {
  world = { hindernisse: entwurf.hindernisse, cleared: [] };
  karteWaehlen('eigen', entwurf);
  entwurfPruefen();
}

const rund = (v) => Math.max(0, Math.min(MAP, Math.round(v)));
const paar = (o) => spiegelPaare([o]);

/** Am Punkt setzen, was das Werkzeug setzt -- mit Spiegelbild. */
function setzen(x, y) {
  const r = groessen[werkzeug.id];
  x = rund(x);
  y = rund(y);
  if (werkzeug.id === 'fels' || werkzeug.id === 'see') {
    entwurf.hindernisse.push(...paar({ x, y, r, art: werkzeug.id }));
  } else if (werkzeug.id === 'fron' || werkzeug.id === 'goetterblut') {
    entwurf.adern.push(...paar({ x, y, kind: werkzeug.id }));
  } else if (werkzeug.id === 'wald') {
    entwurf.wald.push(...paar({ x, y, r }));
  } else if (werkzeug.id === 'wiese') {
    entwurf.wiesen.push(...paar({ x, y, r }));
  } else if (werkzeug.id === 'furt') {
    // Furt: Flusskreise hier (und gegenueber) entfernen, Uebergang merken
    const weg = (h) => h.fluss && ((h.x - x) ** 2 + (h.y - y) ** 2 < r * r || (h.x - (MAP - x)) ** 2 + (h.y - (MAP - y)) ** 2 < r * r);
    if (!entwurf.hindernisse.some(weg)) return false;
    entwurf.hindernisse = entwurf.hindernisse.filter((h) => !weg(h));
    entwurf.furten.push(...paar({ x, y }));
  } else if (werkzeug.id === 'weg') {
    const nah = (o, rr = 0) => (o.x - x) ** 2 + (o.y - y) ** 2 < (r + rr) ** 2 || (o.x - (MAP - x)) ** 2 + (o.y - (MAP - y)) ** 2 < (r + rr) ** 2;
    entwurf.hindernisse = entwurf.hindernisse.filter((h) => !nah(h, h.r));
    entwurf.adern = entwurf.adern.filter((d) => !nah(d));
    entwurf.wald = entwurf.wald.filter((w) => !nah(w));
    entwurf.wiesen = entwurf.wiesen.filter((w) => !nah(w));
    entwurf.furten = entwurf.furten.filter((f) => !nah(f));
  }
  return true;
}

/** Den gezogenen Fluss als Kette von Wasserkreisen setzen. */
function flussFertig() {
  if (flussPunkte.length >= 2) {
    merken();
    const kreise = kette(flussPunkte, groessen.fluss, Math.max(200, (groessen.fluss * 4) / 3) | 0, 'see');
    for (const h of kreise) h.fluss = true;
    entwurf.hindernisse.push(...spiegelPaare(kreise));
    geaendert();
  }
  flussPunkte = [];
}

// ------------------------------------------------------------ Pruefung und Seitenleiste

function entwurfPruefen() {
  const fehler = kartenFehler(entwurf);
  const el = document.getElementById('pruefung');
  el.innerHTML = fehler.length
    ? `<b class="bad">Noch nicht spielbar</b><ul>${[...new Set(fehler)].slice(0, 6).map((f) => `<li>${f}</li>`).join('')}</ul>`
    : '<b class="ok">✔ Spielbar</b> — fair gespiegelt, beide Basen verbunden.';
  const z = (l, f) => l.filter(f).length;
  document.getElementById('zahlen').textContent =
    `${z(entwurf.hindernisse, (h) => h.art === 'fels')} Felsen · ${z(entwurf.hindernisse, (h) => h.art === 'see')} Wasser · ` +
    `${z(entwurf.adern, (d) => d.kind === 'fron')} Fron · ${z(entwurf.adern, (d) => d.kind === 'goetterblut')} Götterblut · ${entwurf.furten.length} Furten`;
  document.getElementById('spielen2d').disabled = !!fehler.length;
  document.getElementById('spielen3d').disabled = !!fehler.length;
  return fehler;
}

function werkzeugeZeigen() {
  const el = document.getElementById('werkzeuge');
  el.innerHTML = WERKZEUGE.map(
    (w) => `<button data-w="${w.id}" class="${w === werkzeug ? 'an' : ''}">${w.name}<kbd>${w.taste}</kbd></button>`
  ).join('');
  for (const b of el.querySelectorAll('[data-w]')) b.onclick = () => waehle(b.dataset.w);
  const g = document.getElementById('groesse');
  g.value = groessen[werkzeug.id];
  document.getElementById('groesseWert').textContent = Math.round(groessen[werkzeug.id] / 10) + ' m';
}
function waehle(id) {
  if (werkzeug.id === 'fluss' && id !== 'fluss') flussFertig();
  werkzeug = WERKZEUGE.find((w) => w.id === id) || werkzeug;
  werkzeugeZeigen();
}

function listeZeigen() {
  const el = document.getElementById('liste');
  const l = eigeneKarten();
  el.innerHTML = l.length ? l.map((k, i) => `<button data-i="${i}">${k.name}</button>`).join('') : '<p>Noch keine.</p>';
  for (const b of el.querySelectorAll('[data-i]')) {
    b.onclick = () => {
      merken();
      entwurf = JSON.parse(JSON.stringify(eigeneKarten()[Number(b.dataset.i)]));
      for (const k of ['wald', 'wiesen', 'furten']) entwurf[k] = entwurf[k] || [];
      document.getElementById('name').value = entwurf.name;
      geaendert();
    };
  }
}

function kartenSpeichern() {
  entwurf.name = document.getElementById('name').value.trim() || 'Meine Karte';
  const i = eigeneKarteSpeichern(JSON.parse(JSON.stringify(entwurf)));
  listeZeigen();
  return i;
}

/** Speichern und im Spiel oeffnen -- der Startbildschirm hat sie dann gewaehlt. */
function kartenSpielen(seite) {
  if (entwurfPruefen().length) return;
  const i = kartenSpeichern();
  try {
    localStorage.setItem('dreiReiche.karteWahl', 'eigen:' + i);
  } catch {
    /* dann eben von Hand waehlen */
  }
  location.href = seite;
}

// ------------------------------------------------------------ Zeichnen

function groesseAnpassen() {
  const d = devicePixelRatio || 1;
  cv.width = cv.clientWidth * d;
  cv.height = cv.clientHeight * d;
  ctx.setTransform(d, 0, 0, d, 0, 0);
  cam.z = (Math.min(cv.clientWidth, cv.clientHeight) - 30) / MAP;
}

function zeichneEditor() {
  const W = cv.clientWidth;
  const H = cv.clientHeight;
  ctx.fillStyle = COL.bg;
  ctx.fillRect(0, 0, W, H);
  drawGrid(W, H); // src/gelaende2d.js: Boden, Wald, Wiesen, Pfad
  drawHindernisse(); // src/gelaende2d.js: Felsen, Seen, Fluss, Furten

  // Basen: Hauptgebaeude, Grunddomaene, freie Zone
  for (const [i, b] of BASIS.entries()) {
    ctx.strokeStyle = i ? '#8fb86a' : '#d8b06a';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(w2sx(b.x), w2sy(b.y), 4000 * cam.z, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fillRect(w2sx(b.x) - 7, w2sy(b.y) - 7, 14, 14);
  }
  // Adern
  for (const d of entwurf.adern) {
    ctx.fillStyle = d.kind === 'fron' ? '#9ab87a' : '#c0485a';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(w2sx(d.x), w2sy(d.y), Math.max(4, 160 * cam.z), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // Fluss in Arbeit
  if (flussPunkte.length) {
    ctx.strokeStyle = '#5a9ad8';
    ctx.lineWidth = Math.max(2, groessen.fluss * 2 * cam.z);
    ctx.globalAlpha = 0.6;
    for (const pts of [flussPunkte, flussPunkte.map(([x, y]) => [MAP - x, MAP - y])]) {
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(w2sx(x), w2sy(y)) : ctx.moveTo(w2sx(x), w2sy(y))));
      if (mausPunkt && pts === flussPunkte) ctx.lineTo(w2sx(mausPunkt.x), w2sy(mausPunkt.y));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  // Pinsel und sein Spiegelbild
  if (mausPunkt) {
    const r = groessen[werkzeug.id] * cam.z;
    ctx.strokeStyle = werkzeug.id === 'weg' ? COL.bad : '#f0e6c8';
    ctx.lineWidth = 1.5;
    for (const [x, y, alpha] of [[mausPunkt.x, mausPunkt.y, 1], [MAP - mausPunkt.x, MAP - mausPunkt.y, 0.45]]) {
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(w2sx(x), w2sy(y), Math.max(4, r), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  // Spiegelachse: die Mitte
  ctx.fillStyle = '#f0e6c8';
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.arc(w2sx(MAP / 2), w2sy(MAP / 2), 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  requestAnimationFrame(zeichneEditor);
}

// ------------------------------------------------------------ Eingabe

const weltpunkt = (e) => ({ x: s2wx(e.offsetX), y: s2wy(e.offsetY) });
cv.addEventListener('contextmenu', (e) => e.preventDefault());
cv.addEventListener('mousedown', (e) => {
  const p = weltpunkt(e);
  if (p.x < 0 || p.y < 0 || p.x > MAP || p.y > MAP) return;
  if (werkzeug.id === 'fluss') {
    if (e.button === 2) flussFertig();
    else flussPunkte.push([rund(p.x), rund(p.y)]);
    return;
  }
  if (e.button !== 0) return;
  merken();
  if (!setzen(p.x, p.y)) rueckSchritte.pop();
  zuletztGemalt = p;
  malt = ['fels', 'wald', 'wiese', 'weg'].includes(werkzeug.id);
  geaendert();
});
addEventListener('mouseup', () => (malt = false));
cv.addEventListener('mousemove', (e) => {
  mausPunkt = weltpunkt(e);
  // Ziehen malt: neuer Kreis, sobald man ein Stueck weiter ist
  if (malt && zuletztGemalt) {
    const abstand = Math.max(250, groessen[werkzeug.id] * 0.8);
    if ((mausPunkt.x - zuletztGemalt.x) ** 2 + (mausPunkt.y - zuletztGemalt.y) ** 2 >= abstand * abstand) {
      setzen(mausPunkt.x, mausPunkt.y);
      zuletztGemalt = mausPunkt;
      geaendert();
    }
  }
});
cv.addEventListener('mouseleave', () => (mausPunkt = null));
cv.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    const g = groessen[werkzeug.id] * (e.deltaY > 0 ? 0.9 : 1.1);
    groessen[werkzeug.id] = Math.max(150, Math.min(3500, Math.round(g / 10) * 10));
    werkzeugeZeigen();
  },
  { passive: false }
);
addEventListener('keydown', (e) => {
  if (e.target && e.target.tagName === 'INPUT') return;
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    e.preventDefault();
    rueckgaengig();
    return;
  }
  const w = WERKZEUGE.find((x) => x.taste === e.key);
  if (w) waehle(w.id);
  if (e.key === 'Enter') flussFertig();
  if (e.key === 'Escape') flussPunkte = [];
});
document.getElementById('groesse').oninput = (e) => {
  groessen[werkzeug.id] = Number(e.target.value);
  werkzeugeZeigen();
};
document.getElementById('rueck').onclick = rueckgaengig;
document.getElementById('neu').onclick = () => {
  merken();
  entwurf = leereKarte(document.getElementById('name').value || 'Meine Karte');
  geaendert();
};
document.getElementById('zufall').onclick = () => {
  merken();
  entwurf = zufallsKarte((Date.now() / 1000) | 0);
  document.getElementById('name').value = entwurf.name;
  geaendert();
};
document.getElementById('speichern').onclick = () => kartenSpeichern();
document.getElementById('spielen2d').onclick = () => kartenSpielen('resonit.html');
document.getElementById('spielen3d').onclick = () => kartenSpielen('drei-reiche-3d.html');
document.getElementById('exportieren').onclick = () => {
  entwurf.name = document.getElementById('name').value.trim() || 'Meine Karte';
  if (typeof Blob === 'undefined') return;
  const url = URL.createObjectURL(new Blob([JSON.stringify(entwurf)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = entwurf.name.replace(/[^\wäöüÄÖÜß -]/g, '') + '.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};
const dateiFeld = document.getElementById('datei');
document.getElementById('importieren').onclick = () => dateiFeld.click();
dateiFeld.onchange = () =>
  karteDateiLaden(dateiFeld, (meldung) => {
    if (meldung) {
      document.getElementById('pruefung').innerHTML = `<b class="bad">${meldung}</b>`;
      return;
    }
    const l = eigeneKarten();
    merken();
    entwurf = JSON.parse(JSON.stringify(l[l.length - 1]));
    document.getElementById('name').value = entwurf.name;
    listeZeigen();
    geaendert();
  });
addEventListener('resize', groesseAnpassen);

document.getElementById('name').value = entwurf.name;
groesseAnpassen();
werkzeugeZeigen();
listeZeigen();
geaendert();
requestAnimationFrame(zeichneEditor);
