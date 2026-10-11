// Laeuft der Karteneditor ohne Browser? Minimaler DOM- und Canvas-Ersatz;
// jedes Werkzeug einmal benutzen, einen Fluss mit Furt ziehen, Zurueck,
// Zufall, Speichern -- und die Karte muss danach spielbar sein.

import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = await readFile(join(root, 'dist/karteneditor.html'), 'utf8');
const code = html.match(/<script>([\s\S]*?)<\/script>/)[1];

const ctxStub = new Proxy(
  {},
  {
    get(t, k) {
      if (k in t) return t[k];
      if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') return () => ({ addColorStop() {} });
      if (k === 'measureText') return () => ({ width: 10 });
      if (k === 'getImageData' || k === 'createImageData') return (w = 1, h = 1) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h });
      return () => {};
    },
    set(t, k, v) {
      t[k] = v;
      return true;
    },
  }
);
const handlers = [];
const el = (id) => ({
  id,
  innerHTML: '',
  textContent: '',
  value: '',
  disabled: false,
  style: {},
  dataset: {},
  onclick: null,
  querySelectorAll: () => [],
  addEventListener: (t, f) => handlers.push([id, t, f]),
});
const cv = { ...el('cv'), clientWidth: 1000, clientHeight: 800, width: 0, height: 0, getContext: () => ctxStub };
const nodes = { cv };
// Nur Elemente, die es in der Seite wirklich gibt -- ein Tippfehler in einer Id soll auffallen.
const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
globalThis.document = {
  getElementById: (id) => nodes[id] ?? (ids.has(id) ? (nodes[id] = el(id)) : null),
  createElement: () => ({ ...el('x'), click() {}, getContext: () => ctxStub }),
  querySelectorAll: () => [],
};
globalThis.window = globalThis;
globalThis.devicePixelRatio = 1;
globalThis.addEventListener = (t, f) => handlers.push(['window', t, f]);
const speicher = {};
globalThis.localStorage = { getItem: (k) => speicher[k] ?? null, setItem: (k, v) => (speicher[k] = String(v)), removeItem: (k) => delete speicher[k] };
let frameFn = null;
globalThis.requestAnimationFrame = (f) => (frameFn = f);
globalThis.location = { href: '' };

try {
  new Function(code + '\n;globalThis.__editor = { get karte() { return entwurf; }, waehle, kartenFehler };')();
} catch (e) {
  console.log('FEHLER beim Start:', e.message, '\n   ', (e.stack || '').split('\n')[1]);
  process.exit(1);
}
const fehler = [];
const an = (ziel, typ) => handlers.filter(([id, t]) => id === ziel && t === typ).map(([, , f]) => f);
const maus = (typ, x, y, button = 0) => {
  for (const f of an('cv', typ)) f({ offsetX: x, offsetY: y, button, preventDefault() {}, deltaY: 1 });
};
const taste = (key, extra = {}) => {
  for (const f of an('window', 'keydown')) f({ key, target: {}, preventDefault() {}, ...extra });
};
const bild = () => {
  const f = frameFn;
  frameFn = null;
  if (f) f(0);
};
try {
  const E = globalThis.__editor;
  // Jedes Werkzeug einmal, Felsen mit Ziehen
  taste('1');
  maus('mousedown', 500, 300);
  maus('mousemove', 540, 320);
  maus('mousemove', 600, 340);
  for (const f of an('window', 'mouseup')) f({});
  for (const k of ['2', '5', '6', '7', '8']) {
    taste(k);
    maus('mousedown', 650, 250);
    bild();
  }
  // Fluss quer zur Mitte, dann eine Furt hinein
  taste('3');
  maus('mousedown', 120, 500);
  maus('mousedown', 300, 450);
  maus('mousedown', 500, 400);
  taste('Enter');
  const mitFluss = E.karte.hindernisse.filter((h) => h.fluss).length;
  taste('4');
  maus('mousedown', 300, 450);
  if (!E.karte.furten.length || E.karte.hindernisse.filter((h) => h.fluss).length >= mitFluss) fehler.push(new Error('Furt hat den Fluss nicht geoeffnet'));
  // Radierer und Strg+Z
  const vorher = E.karte.hindernisse.length;
  taste('9');
  maus('mousedown', 520, 310);
  taste('z', { ctrlKey: true });
  if (E.karte.hindernisse.length !== vorher) fehler.push(new Error('Strg+Z hat den Radierer nicht zurueckgenommen'));
  maus('wheel', 500, 300);
  bild();
  // Zufall, Speichern, Spielen
  nodes.zufall.onclick();
  if (E.kartenFehler(E.karte).length) fehler.push(new Error('Zufallskarte im Editor nicht spielbar'));
  nodes.speichern.onclick();
  if (!JSON.parse(speicher['dreiReiche.karten'] || '[]').length) fehler.push(new Error('nicht gespeichert'));
  nodes.spielen2d.onclick();
  if (location.href !== 'resonit.html' || !speicher['dreiReiche.karteWahl']) fehler.push(new Error('Spielen oeffnet das Spiel nicht'));
  for (let i = 0; i < 20; i++) bild();
} catch (e) {
  fehler.push(e);
}
if (fehler.length) {
  for (const e of fehler) console.log('FEHLER:', e.message, '\n   ', (e.stack || '').split('\n')[1]);
  process.exit(1);
}
console.log('Editor-Smoke-Test ok — Werkzeuge, Fluss mit Furt, Strg+Z, Zufall, Speichern, Spielen.');
