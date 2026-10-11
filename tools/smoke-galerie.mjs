// Laeuft die Galerie ohne Browser? Minimaler DOM- und WebGL-Ersatz, alle
// Ansichten einmal durchschalten und je ein paar Bilder zeichnen.

import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = await readFile(join(root, 'dist/galerie.html'), 'utf8');
const code = html.match(/<script>([\s\S]*?)<\/script>/)[1];

/** Nimmt jeden Aufruf an und liefert passende Platzhalter zurueck. */
function platzhalter(werte = {}) {
  return new Proxy(werte, {
    get(t, k) {
      if (k in t) return t[k];
      if (typeof k === 'string' && /^[A-Z_0-9]+$/.test(k)) return 1; // GL-Konstanten
      return (...args) => {
        if (k === 'getShaderParameter' || k === 'getProgramParameter') return true;
        if (k === 'getError') return 0;
        if (k === 'getUniformLocation' || String(k).startsWith('create')) return {};
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
const el = (id) => ({ id, innerHTML: '', textContent: '', style: {}, dataset: {}, className: '' });
const knoepfe = ['waldgott', 'einheiten', 'gebaeude', 'karte', 'icons'].map((a) => ({ ...el('k' + a), dataset: { ansicht: a } }));
const nodes = {
  leinwand: { ...el('leinwand'), width: 1200, height: 700, clientWidth: 1200, clientHeight: 700, getContext: () => gl },
  schilder: el('schilder'),
  icons: el('icons'),
  hinweis: el('hinweis'),
  nogl: el('nogl'),
};
globalThis.document = {
  getElementById: (id) => nodes[id] ?? el(id),
  querySelectorAll: (s) => (s.includes('data-ansicht') ? knoepfe : []),
};
globalThis.window = globalThis;
globalThis.devicePixelRatio = 1;
let clock = 0;
globalThis.performance = { now: () => clock };
let frameFn = null;
globalThis.requestAnimationFrame = (f) => {
  frameFn = f;
};

const fehler = [];
try {
  new Function(code)();
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
for (const k of knoepfe) {
  try {
    k.onclick();
  } catch (e) {
    fehler.push(e);
  }
  laufe(30);
}
if (fehler.length) {
  console.log('FEHLER:');
  for (const e of fehler.slice(0, 5)) console.log(' ', e.message, '\n   ', (e.stack || '').split('\n')[1]);
  process.exit(1);
}
console.log('Galerie-Smoke-Test ok — alle Ansichten gezeichnet, keine Ausnahmen.');
console.log('Icons in der Galerie:', (nodes.icons.innerHTML.match(/class="ic"/g) || []).length);
