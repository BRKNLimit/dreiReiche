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
    // Farbverlaeufe (Wald und Wiesen der Karten Flusstal, Drei Reiche, Vierlande)
    createRadialGradient: () => ({ addColorStop() {} }),
    createLinearGradient: () => ({ addColorStop() {} }),
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
    focus() {},
    blur() {},
    onclick: null,
    dataset: {},
    style: {},
    addEventListener: (t, f) => handlers.push([t, f]),
    // Baut aus dem gesetzten innerHTML die data-b-Knoepfe nach,
    // damit renderBar() denselben Weg geht wie im Browser; ebenso die
    // Missionsknoepfe (gemerkt, damit der Test sie druecken kann).
    querySelectorAll: (wahl = '') => {
      if (wahl.includes('data-mission')) {
        el.missionKnoepfe = [...String(el.innerHTML).matchAll(/data-mission="([^"]+)"/g)].map((m) => ({ dataset: { mission: m[1] }, onclick: null }));
        return el.missionKnoepfe;
      }
      if (wahl.includes('data-reiter')) {
        return [...String(el.innerHTML).matchAll(/data-reiter="([^"]+)"/g)].map((m) => ({ dataset: { reiter: m[1] }, onclick: null }));
      }
      return [...String(el.innerHTML).matchAll(/data-b="([^"]+)"/g)].map((m) => ({
        dataset: { b: m[1] },
        onclick: null,
      }));
    },
    insertAdjacentHTML(wo, html) {
      el.innerHTML += html;
    },
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
  ressourcen: makeEl('ressourcen'),
  faehigkeiten: makeEl('faehigkeiten'),
  gruppen: makeEl('gruppen'),
  hilfe: makeEl('hilfe'),
  hilfeKnopf: makeEl('hilfeKnopf'),
  untaetig: makeEl('untaetig'),
};

globalThis.document = {
  getElementById: (id) => nodes[id] ?? (nodes[id] = makeEl(id)), // wie im Browser: dieselbe Id, dasselbe Element
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

// Browser-Speicher fuer Spielstaende (F5/F9) und Kampagne
const speicher = {};
globalThis.localStorage = { getItem: (k) => speicher[k] ?? null, setItem: (k, v) => (speicher[k] = String(v)), removeItem: (k) => delete speicher[k] };
const errors = [];
process.on('uncaughtException', (e) => errors.push(e));

try {
  // Zugriff auf Innenleben der Seite fuer die Bauleisten-Pruefung unten: eine Zeile hinten an das Skript
  new Function(
    code +
      `\n;globalThis.__t = { BUILDINGS, UNITS,
        get world() { return world; }, get ME() { return ME; },
        get sel() { return sel; }, set sel(v) { sel = v; }, get placing() { return placing; }, set placing(v) { placing = v; },
        get gruppe() { return bauGruppeSchl; },
        // Mehrspieler: neue Partie auf der gewaehlten Karte (ohne Startbildschirm), Tempo und Pause setzen
        neuSpiel(f, zuschauen, karte, mehr) { karteSchluessel = karte; gegnerVolk = 'auto'; gegnerWahlMehr[0] = mehr[0]; gegnerWahlMehr[1] = mehr[1]; paused = false; speed = 8; neu(f, zuschauen); },
        get ais() { return ais; }, get verlauf() { return verlauf; } };`
  )();
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
// Spielstand: F5 speichert, F9 laedt -- danach muss es weiterlaufen
fire('keydown', { ...base, key: 'F5' });
if (!speicher['dreiReiche.spielstand']) errors.push(new Error('F5 hat nichts gespeichert'));
fire('keydown', { ...base, key: 'F9' });
// Online-Dialog ohne WebRTC (Node): muss sauber melden statt abzustuerzen
if (nodes.onlineEroeffnen && nodes.onlineEroeffnen.onclick) nodes.onlineEroeffnen.onclick();

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

// Bauleiste in Gruppen: Erbauer gewaehlt, Tab / Umschalt+Tab wechseln, Ziffern bauen aus der aktiven Gruppe
{
  const T = globalThis.__t;
  const bauer = T.world.entities.find((e) => e.kind === 'unit' && e.player === T.ME && T.UNITS[e.type].build);
  const pruefe = (bedingung, text) => {
    if (!bedingung) errors.push(new Error('Smoke: ' + text));
  };
  const aktiverReiter = () => /class="reiter-knopf aktiv" data-reiter="(\w+)"/.exec(nodes.builds.innerHTML)?.[1];
  const weiter = (n) => {
    for (let i = 0; i < n && frameFn; i++) {
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
  };
  if (!bauer) errors.push(new Error('Smoke: kein Erbauer fuer die Bauleisten-Pruefung'));
  else {
    T.placing = null;
    T.sel = [bauer.id];
    weiter(3);
    pruefe((nodes.builds.innerHTML.match(/data-reiter=/g) || []).length === 3, 'Bauleiste ohne drei Reiter');
    pruefe(aktiverReiter() === 'wirtschaft', 'erste Gruppe ist nicht Wirtschaft');
    fire('keydown', { ...base, key: 'Tab', code: 'Tab' });
    weiter(3);
    pruefe(aktiverReiter() === 'militaer' && T.gruppe === 'militaer', 'Tab wechselt nicht zu Militaer');
    pruefe(!nodes.builds.innerHTML.includes('data-b="saege"') && nodes.builds.innerHTML.includes('data-b="kaserne"'), 'Militaer zeigt falsche Gebaeude');
    fire('keydown', { ...base, key: '1', code: 'Digit1' });
    pruefe(T.placing === 'kaserne', `Taste 1 in Militaer baut ${T.placing}`);
    T.placing = null;
    fire('keydown', { ...base, key: 'Tab', code: 'Tab', shiftKey: true });
    weiter(3);
    pruefe(aktiverReiter() === 'wirtschaft', 'Umschalt+Tab geht nicht zurueck');
    fire('keydown', { ...base, key: '1', code: 'Digit1' });
    pruefe(T.placing === 'schmiede', `Taste 1 in Wirtschaft baut ${T.placing}`);
    T.placing = null;
    T.sel = [];
    weiter(3);
  }
}

// Mission 2 der Kampagne: Vorwort, Los, mit Tempo x8 bis nach der ersten Welle
const wut = (nodes.intro.missionKnoepfe || []).find((b) => b.dataset.mission === 'wut-des-waldes');
if (!wut || !wut.onclick) errors.push(new Error('Kampagnen-Knopf fehlt im Startbildschirm'));
else {
  try {
    missionSpielen();
  } catch (e) {
    errors.push(e);
  }
}
function missionSpielen() {
  // Knopf aus dem Startbildschirm: Mission waehlen, Vorwort bestaetigen
  wut.onclick();
  if (!nodes.missionLos || !nodes.missionLos.onclick) throw new Error('Vorwort ohne Los-Knopf');
  nodes.missionLos.onclick();
  for (let i = 0; i < 3; i++) fire('keydown', { ...base, key: '+' });
  let funk = false;
  for (let i = 0; i < 160 && frameFn; i++) {
    const f = frameFn;
    frameFn = null;
    clock += 100;
    f(clock);
    if (nodes.funk && nodes.funk.innerHTML.includes('funkspruch')) funk = true;
  }
  if (!nodes.hud.innerHTML.includes('Halte zehn Minuten stand')) throw new Error('Missionsziel fehlt im HUD');
  if (!funk) throw new Error('kein Funkspruch in der Mission');
}

// Vier Spieler auf Vierlande (Mensch + drei KIs), dann dieselbe Karte nur mit Zuschauen und
// drei Spieler auf Drei Reiche: Spielerleiste, Auswertung (I), Spielstand speichern und laden
{
  const T = globalThis.__t;
  const pruefe = (bedingung, text) => {
    if (!bedingung) errors.push(new Error('Smoke: ' + text));
  };
  const weiter = (n, dt = 100) => {
    for (let i = 0; i < n && frameFn; i++) {
      const f = frameFn;
      frameFn = null;
      clock += dt;
      try {
        f(clock);
      } catch (e) {
        errors.push(e);
        break;
      }
    }
  };
  try {
    nodes.intro.style.display = 'none';
    T.neuSpiel('mensch', false, 'vierlande', ['auto', 'auto']);
    pruefe(T.world.players.length === 4, `Vierlande mit ${T.world.players.length} Spielern`);
    pruefe(T.ais.filter(Boolean).length === 3 && !T.ais[0], 'Vierlande: drei KIs, der Mensch auf Sitz 0');
    weiter(300);
    pruefe(nodes.hud.innerHTML.includes('spielerleiste'), 'Vierlande: keine Spielerleiste im HUD');
    fire('keydown', { ...base, key: 'i' });
    weiter(3);
    pruefe(nodes.hud.innerHTML.includes('Auswertung') && nodes.hud.innerHTML.includes('Domäne'), 'Vierlande: keine Auswertung');
    fire('keydown', { ...base, key: 'i' });
    delete speicher['dreiReiche.spielstand'];
    fire('keydown', { ...base, key: 'F5' });
    pruefe(!!speicher['dreiReiche.spielstand'], 'Vierlande: F5 hat nichts gespeichert');
    const tickVorher = T.world.tick;
    fire('keydown', { ...base, key: 'F9' });
    pruefe(T.world.players.length === 4 && T.ais.length === 4 && T.world.tick <= tickVorher, 'Vierlande: Laden stellt den Stand nicht her');
    weiter(200);
    // Zuschauen: vier KIs, Beobachter-Tafel mit vier Spalten
    T.neuSpiel('mensch', true, 'vierlande', ['gott', 'tod']);
    pruefe(T.ais.filter(Boolean).length === 4, 'Zuschauen auf Vierlande: nicht vier KIs');
    weiter(200);
    pruefe((nodes.hud.innerHTML.match(/<th/g) || []).length >= 5, 'Zuschauen auf Vierlande: Beobachter ohne vier Spalten');
    // Drei Spieler, Gegner 3 abgewaehlt ('keiner'): dreiReiche fasst drei, vierlande dann nur drei
    T.neuSpiel('gott', false, 'vierlande', ['auto', 'keiner']);
    pruefe(T.world.players.length === 3, `Gegner 3 auf "keiner" ergibt ${T.world.players.length} Spieler`);
    T.neuSpiel('tod', false, 'dreiReiche', ['auto', 'auto']);
    pruefe(T.world.players.length === 3, `Drei Reiche mit ${T.world.players.length} Spielern`);
    weiter(300);
  } catch (e) {
    errors.push(e);
  }
}

if (errors.length) {
  console.log('FEHLER:');
  for (const e of errors.slice(0, 5)) console.log(' ', e.message, '\n   ', (e.stack || '').split('\n')[1]);
  process.exit(1);
}
console.log('Smoke-Test ok — 1000 Frames, Eingaben, Spielstand, Online-Dialog, Mission mit Welle, 3 und 4 Spieler — keine Ausnahmen.');
console.log('Canvas-Aufrufe:', [...calls].sort().join(', '));
console.log('HUD-Ausgabe vorhanden:', nodes.hud.innerHTML.length > 0);
