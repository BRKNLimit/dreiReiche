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
// Zeichenaufrufe je Modell mitzaehlen: jedes Modell hat sein eigenes VAO (createVertexArray
// liefert je Aufruf ein neues Objekt), drawArraysInstanced zaehlt die Instanzen auf dem gerade gebundenen.
let gebundenesVao = null;
const gezeichnet = new Map(); // VAO -> Instanzen insgesamt
const gl = platzhalter({
  canvas: null,
  bindVertexArray: (v) => {
    gebundenesVao = v;
  },
  drawArraysInstanced: (modus, von, anzahl, n) => {
    gezeichnet.set(gebundenesVao, (gezeichnet.get(gebundenesVao) || 0) + n);
  },
});
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
    focus() {},
    blur() {},
    onclick: null,
    style: {},
    dataset: {},
    addEventListener: (t, f) => handlers.push([t, f]),
    // erkennt Selektoren der Form [data-name]: eine Attrappe je Treffer im HTML, mit dataset.name
    querySelectorAll: (sel) => {
      const name = /\[data-([\w-]+)\]/.exec(sel || '')?.[1] || 'b';
      const schluessel = name.replace(/-(\w)/g, (_, c) => c.toUpperCase());
      return [...String(el.innerHTML).matchAll(new RegExp(`data-${name}="([^"]+)"`, 'g'))].map((m) => ({ dataset: { [schluessel]: m[1] }, onclick: null }));
    },
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
  untaetig: makeEl('untaetig'),
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

// Browser-Speicher fuer Spielstaende (F5/F9) und Kampagne
const speicher = {};
globalThis.localStorage = { getItem: (k) => speicher[k] ?? null, setItem: (k, v) => (speicher[k] = String(v)), removeItem: (k) => delete speicher[k] };
const fehler = [];
process.on('uncaughtException', (e) => fehler.push(e));
try {
  // Zugriff auf Innenleben der Seite fuer die Pruefungen unten: eine Zeile hinten an das Skript
  new Function(
    code +
      `\n;globalThis.__t = { MODELLE, BUILDINGS, UNITS, spawnBuilding, spawnUnit, issue, fx,
        get world() { return world; }, get ME() { return ME; },
        get sel() { return sel; }, set sel(v) { sel = v; }, get placing() { return placing; }, set placing(v) { placing = v; },
        get gruppe() { return bauGruppeSchl; },
        // Mehrspieler: neue Partie auf der gewaehlten Karte (ohne Startbildschirm), Tempo und Pause setzen
        neuSpiel(f, zuschauen, karte, mehr) { karteSchluessel = karte; gegnerVolk = 'auto'; gegnerWahlMehr[0] = mehr[0]; gegnerWahlMehr[1] = mehr[1]; paused = false; speed = 8; neu(f, zuschauen); },
        get ais() { return ais; } };`
  )();
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
// Spielstand: F5 speichert, F9 laedt -- danach muss es weiterlaufen
feuer('keydown', { ...basis, key: 'F5' });
if (!speicher['dreiReiche.spielstand']) fehler.push(new Error('F5 hat nichts gespeichert'));
feuer('keydown', { ...basis, key: 'F9' });
laufe(600);

// ---- Bauleiste in Gruppen: Erbauer gewaehlt, Tab wechselt, Ziffern bauen aus der aktiven Gruppe
const T = globalThis.__t;
const hauptgebaeude = T.world.entities.find((e) => e.kind === 'building' && e.player === T.ME && T.BUILDINGS[e.type].vital);
const bauer = T.world.entities.find((e) => e.kind === 'unit' && e.player === T.ME && T.UNITS[e.type].build);
const pruefe = (bedingung, text) => {
  if (!bedingung) fehler.push(new Error('Smoke: ' + text));
};
if (!hauptgebaeude || !bauer) {
  fehler.push(new Error('Smoke: kein Hauptgebaeude oder Erbauer fuer die Bauleisten-Pruefung'));
} else {
  const aktiverReiter = () => /class="reiter-knopf aktiv" data-reiter="(\w+)"/.exec(nodes.builds.innerHTML)?.[1];
  T.placing = null;
  T.sel = [bauer.id];
  laufe(3);
  pruefe((nodes.builds.innerHTML.match(/data-reiter=/g) || []).length === 3, 'Bauleiste ohne drei Reiter');
  pruefe(aktiverReiter() === 'wirtschaft', 'erste Gruppe ist nicht Wirtschaft');
  pruefe(/data-b="/.test(nodes.builds.innerHTML), 'Bauleiste ohne Gebaeude');
  feuer('keydown', { ...basis, key: 'Tab', code: 'Tab' });
  laufe(3);
  pruefe(aktiverReiter() === 'militaer' && T.gruppe === 'militaer', 'Tab wechselt nicht zu Militaer');
  pruefe(!nodes.builds.innerHTML.includes('data-b="saege"') && /data-b="(kaserne|dickicht|katakombe)"/.test(nodes.builds.innerHTML), 'Militaer zeigt falsche Gebaeude');
  feuer('keydown', { ...basis, key: '1', code: 'Digit1' });
  pruefe(T.placing && ['kaserne', 'dickicht', 'katakombe'].includes(T.placing), `Taste 1 in Militaer baut ${T.placing}`);
  T.placing = null;
  feuer('keydown', { ...basis, key: 'Tab', code: 'Tab', shiftKey: true });
  laufe(3);
  pruefe(aktiverReiter() === 'wirtschaft', 'Umschalt+Tab geht nicht zurueck');
  feuer('keydown', { ...basis, key: 'Tab', code: 'Tab', shiftKey: true });
  laufe(3);
  pruefe(aktiverReiter() === 'besonderes', 'Umschalt+Tab von vorn geht nicht reihum');
  T.sel = [];
  laufe(3);
  pruefe(nodes.builds.innerHTML === '', 'ohne Erbauer bleibt die Leiste leer');
  feuer('keydown', { ...basis, key: 'Tab', code: 'Tab' }); // ohne Erbauer: Tab wird nicht verschluckt
  pruefe(T.gruppe === 'besonderes', 'Tab ohne Erbauer wechselte die Gruppe');

  // ---- Effektmodelle: Schildkuppel, Fernschlag im Flug, Flak-Wolke -- werden sie wirklich gezeichnet?
  const x = hauptgebaeude.x;
  const y = hauptgebaeude.y;
  const andere = 1 - T.ME;
  T.UNITS.testflieger = { name: 'Testflieger', desc: '', faction: 'gott', hp: 100000, radius: 14, speed: 1, cost: { fron: 1 }, buildTime: 50, fliegt: true };
  T.BUILDINGS.testkuppel = { ...T.BUILDINGS[hauptgebaeude.type], name: 'Testkuppel', vital: false, anchor: false, schild: { kapazitaet: 1000, radius: 600, laden: 1 } };
  T.BUILDINGS.testschlag = { ...T.BUILDINGS.testkuppel, name: 'Testschlag', schild: undefined, schlag: { laden: 5, flug: 60, reichweite: 9000, radius: 300, schaden: 1, kosten: {} } };
  T.BUILDINGS.testflak = { ...T.BUILDINGS.testkuppel, name: 'Testflak', schild: undefined, hp: 100000, weapon: { range: 900, damage: 1, cooldown: 3, ziele: 'luft' } };
  const kuppel = T.spawnBuilding(T.world, T.ME, 'testkuppel', x + 700, y, true);
  kuppel.schildPunkte = 700;
  const schlag = T.spawnBuilding(T.world, T.ME, 'testschlag', x - 700, y, true);
  schlag.schlagLadung = 5;
  const flak = T.spawnBuilding(T.world, T.ME, 'testflak', x, y + 700, true);
  const flieger = T.spawnUnit(T.world, andere, 'testflieger', x + 300, y + 700);
  T.issue(T.world, { type: 'schlag', player: T.ME, id: schlag.id, x: x - 700 + 4000, y });
  const vao = (name) => T.MODELLE[name]?.vao;
  const anzahl = (name) => gezeichnet.get(vao(name)) || 0;
  const davor = { schildkuppel: anzahl('schildkuppel'), fernschlag: anzahl('fernschlag'), flak: anzahl('flak') };
  for (let i = 0; i < 30; i++) laufe(20); // 600 Frames = gut 100 Ticks: der Schlag (60 Ticks Flug) landet
  pruefe(T.MODELLE.schildkuppel && T.MODELLE.fernschlag && T.MODELLE.flak, 'Modelle schildkuppel/fernschlag/flak fehlen in MODELLE');
  pruefe(anzahl('schildkuppel') > davor.schildkuppel, 'Schildkuppel wurde nicht gezeichnet');
  pruefe(anzahl('fernschlag') > davor.fernschlag, 'Fernschlag im Flug wurde nicht gezeichnet');
  pruefe(anzahl('flak') > davor.flak, `Flak-Wolke wurde nicht gezeichnet (Flieger ${flieger.hp}/${flieger.maxHp})`);
  // aufraeumen, damit der Rest der Pruefung nichts davon sieht
  for (const k of ['testkuppel', 'testschlag', 'testflak']) delete T.BUILDINGS[k];
  delete T.UNITS.testflieger;
  for (const e of [kuppel, schlag, flak, flieger]) e.dead = true;
  console.log('Modelle gezeichnet (Instanzen):', `schildkuppel ${anzahl('schildkuppel')}, fernschlag ${anzahl('fernschlag')}, flak ${anzahl('flak')}`);
}

// ---- Vier Spieler auf Vierlande (Mensch + drei KIs), Spielstand, Zuschauen, drei Spieler
{
  try {
    nodes.intro.style.display = 'none';
    T.neuSpiel('mensch', false, 'vierlande', ['auto', 'auto']);
    pruefe(T.world.players.length === 4, `Vierlande mit ${T.world.players.length} Spielern`);
    pruefe(T.ais.filter(Boolean).length === 3 && !T.ais[0], 'Vierlande: drei KIs, der Mensch auf Sitz 0');
    laufe(300);
    pruefe(nodes.hud.innerHTML.includes('spielerleiste'), 'Vierlande: keine Spielerleiste im HUD');
    delete speicher['dreiReiche.spielstand'];
    feuer('keydown', { ...basis, key: 'F5' });
    pruefe(!!speicher['dreiReiche.spielstand'], 'Vierlande: F5 hat nichts gespeichert');
    feuer('keydown', { ...basis, key: 'F9' });
    pruefe(T.world.players.length === 4 && T.ais.length === 4, 'Vierlande: Laden stellt den Stand nicht her');
    laufe(200);
    T.neuSpiel('mensch', true, 'vierlande', ['gott', 'tod']);
    pruefe(T.ais.filter(Boolean).length === 4, 'Zuschauen auf Vierlande: nicht vier KIs');
    laufe(200);
    pruefe((nodes.hud.innerHTML.match(/<th/g) || []).length >= 5, 'Zuschauen auf Vierlande: Beobachter ohne vier Spalten');
    T.neuSpiel('tod', false, 'dreiReiche', ['auto', 'auto']);
    pruefe(T.world.players.length === 3, `Drei Reiche mit ${T.world.players.length} Spielern`);
    laufe(300);
  } catch (e) {
    fehler.push(e);
  }
}

if (fehler.length) {
  console.log('FEHLER:');
  for (const e of fehler.slice(0, 5)) console.log(' ', e.message, '\n   ', (e.stack || '').split('\n')[1]);
  process.exit(1);
}
console.log('3D-Smoke-Test ok — 1000 Frames, Eingaben verarbeitet, 3 und 4 Spieler, keine Ausnahmen.');
console.log('HUD-Ausgabe vorhanden:', nodes.hud.innerHTML.length > 0);
