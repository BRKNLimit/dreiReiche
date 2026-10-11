// Laeuft das gebuendelte Spiel ohne Browser: minimaler DOM-/Canvas-Ersatz,
// damit Laufzeitfehler in der Oberflaeche auffallen, bevor jemand klickt.

import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = await readFile(join(root, 'dist/resonit.html'), 'utf8');
const code = html.match(/<script>([\s\S]*?)<\/script>/)[1];

const calls = new Set();
const ctxStub = new Proxy(
  {
    canvas: null,
    globalAlpha: 1,
    lineWidth: 1,
    font: '',
    textAlign: '',
    fillStyle: '',
    strokeStyle: '',
  },
  {
    get(t, k) {
      if (k in t) return t[k];
      calls.add(String(k));
      return () => {};
    },
    set(t, k, v) {
      t[k] = v;
      return true;
    },
  }
);

function makeCanvas(w = 1280, h = 720) {
  return {
    width: w,
    height: h,
    clientWidth: w,
    clientHeight: h,
    style: {},
    dataset: {},
    getContext: () => ctxStub,
    addEventListener: (t, f) => handlers.push([t, f]),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: w, height: h }),
  };
}

const handlers = [];

/** Minimaler Element-Ersatz: kennt innerHTML, onclick und querySelectorAll. */
function makeEl(id) {
  const el = {
    id,
    innerHTML: '',
    onclick: null,
    dataset: {},
    style: {},
    addEventListener: (t, f) => handlers.push([t, f]),
    // Baut aus dem gesetzten innerHTML die data-b-Knoepfe nach,
    // damit renderBar() denselben Weg geht wie im Browser.
    querySelectorAll: () =>
      [...String(el.innerHTML).matchAll(/data-b="([^"]+)"/g)].map((m) => ({
        dataset: { b: m[1] },
        onclick: null,
      })),
  };
  return el;
}

const nodes = {
  cv: makeCanvas(1280, 640),
  mini: makeCanvas(340, 340),
  hud: makeEl('hud'),
  builds: makeEl('builds'),
  asMensch: makeEl('asMensch'),
  asGott: makeEl('asGott'),
  intro: makeEl('intro'),
  introMensch: makeEl('introMensch'),
  introGott: makeEl('introGott'),
  introSchau: makeEl('introSchau'),
  skills: makeEl('skills'),
  karte: makeEl('karte'),
};

globalThis.document = {
  getElementById: (id) => nodes[id] ?? makeEl(id),
  createElement: () => makeCanvas(1, 1),
  querySelectorAll: () => [],
};
globalThis.window = globalThis;
globalThis.devicePixelRatio = 1;
globalThis.addEventListener = (t, f) => handlers.push([t, f]);
globalThis.performance = { now: () => clock };

let clock = 0;
let frameFn = null;
globalThis.requestAnimationFrame = (f) => {
  frameFn = f;
};

const errors = [];
process.on('uncaughtException', (e) => errors.push(e));

try {
  new Function(code)();
  // Startbildschirm: wie ein Klick auf "Als Menschen spielen".
  nodes.introMensch.onclick();
} catch (e) {
  console.log('FEHLER beim Start:', e.message);
  console.log('   ', (e.stack || '').split('\n')[1]);
  process.exit(1);
}

// 600 Frames = 10 Sekunden Spielzeit bei 60 Hz
for (let i = 0; i < 600 && frameFn; i++) {
  const f = frameFn;
  frameFn = null;
  clock += 16.7;
  try {
    f(clock);
  } catch (e) {
    errors.push(e);
    break;
  }
}

// Eingaben simulieren: Bauen, Auswaehlen, Befehlen
const fire = (type, ev) => {
  for (const [t, f] of handlers) {
    if (t === type) {
      try {
        f(ev);
      } catch (e) {
        errors.push(e);
      }
    }
  }
};
const base = { offsetX: 400, offsetY: 300, clientX: 400, clientY: 300, preventDefault() {} };
fire('keydown', { ...base, key: '1' });
fire('mousedown', { ...base, button: 0, shiftKey: false });
fire('mousemove', { ...base, clientX: 500, clientY: 350 });
fire('mouseup', { ...base, button: 0 });
fire('mousedown', { ...base, button: 2 });
fire('wheel', { ...base, deltaY: -100 });
fire('keydown', { ...base, key: ' ' });
fire('keydown', { ...base, key: ' ' });
fire('keydown', { ...base, key: 'Escape' });
// Skillbaum: oeffnen, einen Skill per Klick lernen, Faehigkeit, schliessen
fire('keydown', { ...base, key: 't' });
if (nodes.skills.onclick) nodes.skills.onclick(({ target: { closest: () => ({ dataset: { skill: 'bogenbau' } }) } }));
fire('keydown', { ...base, key: 'f' });

for (let i = 0; i < 400 && frameFn; i++) {
  const f = frameFn;
  frameFn = null;
  clock += 16.7;
  try {
    f(clock);
  } catch (e) {
    errors.push(e);
    break;
  }
}

if (errors.length) {
  console.log('FEHLER:');
  for (const e of errors.slice(0, 5)) console.log(' ', e.message, '\n   ', (e.stack || '').split('\n')[1]);
  process.exit(1);
}
console.log('Smoke-Test ok — 1000 Frames, Eingaben verarbeitet, keine Ausnahmen.');
console.log('Canvas-Aufrufe:', [...calls].sort().join(', '));
console.log('HUD-Ausgabe vorhanden:', nodes.hud.innerHTML.length > 0);
