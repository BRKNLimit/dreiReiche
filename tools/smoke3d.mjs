// Laeuft die gebuendelte 3D-Ansicht ohne Browser: WebGL 2 und Canvas 2D
// werden durch Platzhalter ersetzt, die jeden Aufruf annehmen. Faengt
// Laufzeitfehler in Szene, Eingabe und HUD, bevor jemand die Seite oeffnet --
// ob es gut aussieht, zeigt nur der Browser.

import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = await readFile(join(root, 'dist/drei-reiche-3d.html'), 'utf8');
const code = html.match(/<script>([\s\S]*?)<\/script>/)[1];

const aufrufe = new Set();
/** Nimmt jeden Aufruf an und liefert passende Platzhalter zurueck. */
function platzhalter(werte = {}) {
  return new Proxy(werte, {
    get(t, k) {
      if (k in t) return t[k];
      if (typeof k === 'string' && /^[A-Z_0-9]+$/.test(k)) return 1; // GL-Konstanten
      aufrufe.add(String(k));
      return (...args) => {
        if (k === 'getShaderParameter' || k === 'getProgramParameter') return true;
        if (k === 'getError') return 0;
        if (k === 'getUniformLocation' || k.startsWith('create')) return {};
        return undefined;
      };
    },
    set(t, k, v) {
      t[k] = v;
      return true;
    },
  });
}
const gl = platzhalter({ canvas: null });
const ctx2d = platzhalter({ globalAlpha: 1, lineWidth: 1, font: '', textAlign: '', fillStyle: '', strokeStyle: '' });

const handlers = [];
function makeCanvas(w = 1280, h = 720, art = '2d') {
  return {
    width: w,
    height: h,
    clientWidth: w,
    clientHeight: h,
    style: {},
    getContext: (typ) => (typ === 'webgl2' ? gl : ctx2d),
    addEventListener: (t, f) => handlers.push([t, f]),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: w, height: h }),
  };
}
function makeEl(id) {
  const el = {
    id,
    innerHTML: '',
    onclick: null,
    style: {},
    dataset: {},
    addEventListener: (t, f) => handlers.push([t, f]),
    querySelectorAll: () =>
      [...String(el.innerHTML).matchAll(/data-b="([^"]+)"/g)].map((m) => ({ dataset: { b: m[1] }, onclick: null })),
  };
  return el;
}
const nodes = {
  cv3d: makeCanvas(1280, 720),
  overlay: makeCanvas(1280, 720),
  mini: makeCanvas(340, 340),
  hud: makeEl('hud'),
  builds: makeEl('builds'),
  intro: makeEl('intro'),
  nogl: makeEl('nogl'),
  introMensch: makeEl('introMensch'),
  introGott: makeEl('introGott'),
  introSchau: makeEl('introSchau'),
  skills: makeEl('skills'),
  karte: makeEl('karte'),
  ressourcen: makeEl('ressourcen'),
  faehigkeiten: makeEl('faehigkeiten'),
  gruppen: makeEl('gruppen'),
  hilfe: makeEl('hilfe'),
  hilfeKnopf: makeEl('hilfeKnopf'),
};
globalThis.document = {
  getElementById: (id) => nodes[id] ?? makeEl(id),
  querySelectorAll: () => [],
  hidden: false,
};
globalThis.window = globalThis;
globalThis.devicePixelRatio = 1;
globalThis.addEventListener = (t, f) => handlers.push([t, f]);
let clock = 0;
globalThis.performance = { now: () => clock };
let frameFn = null;
globalThis.requestAnimationFrame = (f) => {
  frameFn = f;
};

const fehler = [];
process.on('uncaughtException', (e) => fehler.push(e));
try {
  new Function(code)();
  nodes.introSchau.onclick(); // Zuschauen: beide Seiten spielt die KI
} catch (e) {
  console.log('FEHLER beim Start:', e.message, '\n   ', (e.stack || '').split('\n')[1]);
  process.exit(1);
}
const laufe = (n) => {
  for (let i = 0; i < n && frameFn; i++) {
    const f = frameFn;
    frameFn = null;
    clock += 16.7;
    try {
      f(clock);
    } catch (e) {
      fehler.push(e);
      break;
    }
  }
};
laufe(400);
const feuer = (typ, ev) => {
  for (const [t, f] of handlers) {
    if (t !== typ) continue;
    try {
      f(ev);
    } catch (e) {
      fehler.push(e);
    }
  }
};
const basis = { offsetX: 640, offsetY: 360, clientX: 640, clientY: 360, shiftKey: false, preventDefault() {} };
feuer('keydown', { ...basis, key: '3' });
feuer('mousemove', { ...basis, clientX: 600, clientY: 300 });
feuer('mousedown', { ...basis, button: 0 });
feuer('mousedown', { ...basis, button: 0 });
feuer('mousemove', { ...basis, clientX: 800, clientY: 500 });
feuer('mouseup', { ...basis, button: 0 });
feuer('keydown', { ...basis, key: 'k' });
feuer('keydown', { ...basis, key: 'a' });
feuer('mousedown', { ...basis, button: 2 });
feuer('wheel', { ...basis, deltaY: -100 });
feuer('keydown', { ...basis, key: 'ArrowUp' });
feuer('keydown', { ...basis, key: ',' });
feuer('mousedown', { ...basis, button: 1, shiftKey: true });
feuer('mousemove', { ...basis, clientX: 700, clientY: 360 });
feuer('mouseup', { ...basis, button: 1 });
feuer('keyup', { ...basis, key: 'ArrowUp' });
// Skillbaum: oeffnen, einen Skill per Klick lernen, Faehigkeit
feuer('keydown', { ...basis, key: 't' });
if (nodes.skills.onclick) nodes.skills.onclick(({ target: { closest: () => ({ dataset: { skill: 'bogenbau' } }) } }));
feuer('keydown', { ...basis, key: 'f' });
laufe(600);

if (fehler.length) {
  console.log('FEHLER:');
  for (const e of fehler.slice(0, 5)) console.log(' ', e.message, '\n   ', (e.stack || '').split('\n')[1]);
  process.exit(1);
}
console.log('3D-Smoke-Test ok — 1000 Frames, Eingaben verarbeitet, keine Ausnahmen.');
console.log('HUD-Ausgabe vorhanden:', nodes.hud.innerHTML.length > 0);
