// 3D-Ansicht. Dieselbe Simulation wie die 2D-Ansicht, gezeichnet mit WebGL 2
// ohne Bibliothek: Modelle aus Grundkoerpern (Quader, Zylinder, Kegel, Kugel),
// flach schattiert, instanziert gezeichnet. Aendert den Simulationszustand
// nie direkt, nur ueber issue(). Wird von tools/bundle.mjs mit der Sim
// zusammengefuegt -- deshalb hier keine Imports.
//
// Koordinaten: Simulation in Dezimetern (x, y). Szene in Metern: x -> x,
// y -> z, Hoehe ist y. Modelle schauen entlang +z.
//
// Grafik liegt in eigenen Dateien (siehe GEMINI.md): src/render3d.js
// (Renderer, Shader), src/modelle3d.js (Modelle), src/gelaende3d.js (Boden,
// Gelaende). Hier: Spielstand, Eingabe, Zeichnen von Einheiten und Gebaeuden.

const cv3 = document.getElementById('cv3d');
const ov = document.getElementById('overlay');
const octx = ov.getContext('2d');
const mini3 = document.getElementById('mini');
const mctx3 = mini3.getContext('2d');
const gl = cv3.getContext('webgl2', { antialias: true, stencil: true });

const ME = 0;
// Darstellungsmassstab: Einheiten und Gebaeude groesser als ihr Kollisionskreis,
// wie in jedem RTS -- sonst sind 3 m grosse Soldaten auf 2 km Karte Punkte.
const ZEIGE_EINHEIT = 1.6;
const ZEIGE_GEBAEUDE = 1.25;
let meFaction = 'mensch';
let world, ai, aiMe;
let gegnerStil = 'standard';
let gegnerStufe = 'mittel'; // Schwierigkeit der Gegner-KI, im Startbildschirm waehlbar
let paused = true;
let speed = 1;
let acc = 0;
let last = performance.now();
let sel = [];
let drag = null;
let placing = null;
let angriff = false;
let skillsOffen = false; // T: Skillbaum
let skillSig = ''; // zuletzt gezeichneter Stand des Skillbaums
let zielen = null; // Griff gewaehlt: naechster Klick ist das Ziel (Faehigkeit)
let wirkungen = []; // Faehigkeits-Einsaetze, eine Sekunde lang sichtbar
let karteTyp = null; // Gebaeude unter der Maus in der Bauleiste
let nebel = neuerNebel(true); // Nebel des Krieges; beim Zuschauen aus
const verborgen = (e) => e.player !== ME && !sieht(nebel, e.x, e.y);
const nebelHell = new Uint8Array(NEBEL_N * NEBEL_N);
let nebelTex = null;
let karteHtml = ''; // zuletzt gezeigte Info-Karte
let selPlan = null; // gewaehlter eigener Bauplan (kein Gebaeude, daher nicht in sel)
let hover = { x: 0, y: 0 }; // Boden unter der Maus, Dezimeter
let maus = { x: 0, y: 0 }; // Bildschirm, CSS-Pixel
const tastenGehalten = new Set();
const vorher = new Map(); // id -> [x, y] vor dem letzten Tick, fuer Interpolation
const blick = new Map(); // id -> Blickrichtung in Bogenmass
let schuesse = []; // { ax, ay, bx, by, farbe, t }
let staub = []; // { x, y, r, t }
const ausfall = new Map(); // id -> Zeitpunkt des letzten Schusses (ms), fuer den Ruck nach vorn

const kam = { x: 420, z: 420, dist: 300, yaw: -Math.PI * 0.75, pitch: 0.95 };

const teamFarbe = (p) => HEX(FACTIONS[world.players[p].faction].color);

// ------------------------------------------------------------ Kamera
let VP = new Float32Array(16);
let VP_INV = new Float32Array(16);
function kameraMatrix() {
  const w = cv3.clientWidth;
  const h = cv3.clientHeight;
  const cp = Math.cos(kam.pitch);
  const eye = [kam.x + Math.sin(kam.yaw) * cp * kam.dist, Math.sin(kam.pitch) * kam.dist, kam.z + Math.cos(kam.yaw) * cp * kam.dist];
  const proj = m4persp(0.75, w / h, 2, 6000);
  const view = m4look(eye, [kam.x, 0, kam.z], [0, 1, 0]);
  VP = m4mul(proj, view);
  VP_INV = m4inv(VP);
}
/** Weltpunkt (Meter) -> Bildschirm (CSS-Pixel) oder null hinter der Kamera. */
function aufSchirm(x, y, z) {
  const m = VP;
  const cx = m[0] * x + m[4] * y + m[8] * z + m[12];
  const cy = m[1] * x + m[5] * y + m[9] * z + m[13];
  const cw = m[3] * x + m[7] * y + m[11] * z + m[15];
  if (cw <= 0.1) return null;
  return [((cx / cw + 1) / 2) * cv3.clientWidth, ((1 - cy / cw) / 2) * cv3.clientHeight];
}
/** Bildschirm -> Punkt auf dem Boden (Dezimeter). */
function aufBoden(sx, sy) {
  const nx = (sx / cv3.clientWidth) * 2 - 1;
  const ny = 1 - (sy / cv3.clientHeight) * 2;
  const m = VP_INV;
  const p = (z) => {
    const x = m[0] * nx + m[4] * ny + m[8] * z + m[12];
    const y = m[1] * nx + m[5] * ny + m[9] * z + m[13];
    const zz = m[2] * nx + m[6] * ny + m[10] * z + m[14];
    const w = m[3] * nx + m[7] * ny + m[11] * z + m[15];
    return [x / w, y / w, zz / w];
  };
  const a = p(-1);
  const b = p(1);
  const t = a[1] / (a[1] - b[1]);
  return { x: ((a[0] + (b[0] - a[0]) * t) / DM) | 0, y: ((a[2] + (b[2] - a[2]) * t) / DM) | 0 };
}

// ------------------------------------------------------------ Spielstart
function neu(f, zuschauen = false) {
  meFaction = f;
  const gegner = f === 'mensch' ? 'gott' : 'mensch';
  world = createWorld({ seed: (Date.now() / 1000) | 0, factions: [f, gegner] });
  ai = createAI(1, world.seed, gegnerStil, gegnerStufe);
  aiMe = zuschauen ? createAI(0, world.seed + 1) : null;
  nebel = neuerNebel(!zuschauen);
  sel = [];
  selPlan = null;
  leistenSig = '';
  placing = null;
  angriff = false;
  skillsOffen = false;
  skillSig = '';
  zielen = null;
  wirkungen = [];
  vorher.clear();
  blick.clear();
  schuesse = [];
  staub = [];
  kam.x = 420;
  kam.z = 420;
  kam.dist = 300;
  kam.yaw = -Math.PI * 0.75;
  renderBar();
}

/** Ausgewaehlte eigene Einheiten, die bauen koennen. */
function erbauer3() {
  return sel.filter((id) => {
    const e = byId(world, id);
    return e && e.kind === 'unit' && UNITS[e.type].build;
  });
}

/** Rechtsklick: auf eigene Baustelle -- Erbauer helfen mit, sonst bewegen. */
function befehl3(x, y, anhaengen = false) {
  const site =
    world.entities.find(
      (b) =>
        b.kind === 'building' &&
        b.player === ME &&
        !b.dead &&
        (!b.done || b.hp < b.maxHp) &&
        (b.x - x) ** 2 + (b.y - y) ** 2 <= (BUILDINGS[b.type].radius + 80) ** 2
    ) || world.plaene.find((q) => q.player === ME && (q.x - x) ** 2 + (q.y - y) ** 2 <= (BUILDINGS[q.type].radius + 80) ** 2);
  const bauer = site ? erbauer3() : [];
  const rest = sel.filter((id) => !bauer.includes(id));
  if (bauer.length) issue(world, { type: 'bauen', player: ME, ids: bauer, id: site.id, anhaengen });
  if (rest.length) issue(world, { type: 'move', player: ME, ids: rest, x, y });
}

function bauListe() {
  return meFaction === 'mensch'
    ? ['schmiede', 'saege', 'grenzstein', 'kaserne', 'schacht', 'banner', 'kapelle', 'wachturm', 'skriptorium']
    : ['quelle', 'moos', 'hain', 'dickicht', 'blutwurz', 'dornenschrein', 'steinkreis', 'waechterbaum', 'eiche'];
}

/** Ausgewaehlte eigene Fabriken, die Einheiten ausbilden koennen. */
function fabriken3() {
  return sel
    .map((id) => byId(world, id))
    .filter((e) => e && e.kind === 'building' && e.player === ME && e.done && BUILDINGS[e.type]?.buildList);
}

function renderBar() {
  const bar = document.getElementById('builds');
  const fabs = fabriken3();
  if (erbauer3().length) {
    bar.innerHTML = bauleisteHtml(world, ME, bauListe());
  } else if (fabs.length) {
    bar.innerHTML = ausbildungsleisteHtml(world, ME, fabs);
  } else {
    bar.innerHTML = '';
  }
  document.getElementById('gruppen').innerHTML = gruppenHtml(world, sel);
  if (!erbauer3().length && !fabs.length) karteTyp = placing = null;
  for (const b of bar.querySelectorAll('[data-b]')) {
    b.onclick = () => {
      if (!gesperrt(world, ME, b.dataset.b)) placing = b.dataset.b;
    };
    b.onmouseenter = () => (karteTyp = b.dataset.b);
    b.onmouseleave = () => (karteTyp = null);
  }
  for (const b of bar.querySelectorAll('[data-produce]')) {
    b.onclick = () => {
      const u = b.dataset.produce;
      if (!gesperrt(world, ME, u) && fabs.length) {
        // Auf die ausgewaehlte Fabrik mit der kuerzesten Warteschlange verteilen (Supreme Commander-Stil)
        const frei = fabs.filter((f) => f.queue.length < 8);
        const ziel = frei.reduce((best, f) => (!best || f.queue.length < best.queue.length ? f : best), null);
        if (ziel) issue(world, { type: 'produce', player: ME, id: ziel.id, unit: u });
      }
    };
    b.onmouseenter = () => (karteTyp = b.dataset.produce);
    b.onmouseleave = () => (karteTyp = null);
  }
}

/** Info-Karte: Gebaeude oder Einheit unter der Maus in der Leiste, sonst das, was gerade gesetzt wird. */
function infoKarte3() {
  const typ = karteTyp || placing;
  const html = typ ? (UNITS[typ] ? einheitKarte(world, ME, typ) : gebaeudeKarte(world, ME, typ)) : '';
  if (html === karteHtml) return;
  karteHtml = html;
  const el = document.getElementById('karte');
  el.innerHTML = html;
  el.hidden = !html;
}

/** Faehigkeit des Kommandanten ausloesen: ein Griff braucht ein Ziel, alles andere wirkt sofort. */
function wirkeFaehigkeit3(id) {
  if (!faehigkeitenVon(world, ME).includes(id) || faehigkeitWarten(world, ME, id)) return;
  if (FAEHIGKEITEN[id].art === 'griff') {
    zielen = id;
    placing = null;
    angriff = false;
  } else {
    issue(world, { type: 'faehigkeit', player: ME, faehigkeit: id, x: 0, y: 0 });
  }
}

// Knoepfe der Faehigkeiten: ein Klick loest aus.
document.getElementById('faehigkeiten').onclick = (ev) => {
  const b = ev.target && ev.target.closest ? ev.target.closest('[data-faeh]') : null;
  if (b && world) wirkeFaehigkeit3(b.dataset.faeh);
};
let faehHtml = '';

/** Knoepfe zeigen, solange der eigene Kommandant gewaehlt ist. */
function faehPanel3() {
  const k = kommandantVon(world, ME);
  const html = k && sel.includes(k.id) ? faehigkeitenHtml(world, ME) : '';
  if (html === faehHtml) return;
  faehHtml = html;
  const el = document.getElementById('faehigkeiten');
  el.innerHTML = html;
  el.hidden = !html;
}

// Skillbaum: ein Klick auf einen lernbaren Skill lernt ihn.
document.getElementById('skills').onclick = (ev) => {
  const b = ev.target && ev.target.closest ? ev.target.closest('[data-skill]') : null;
  if (b && world) issue(world, { type: 'lernen', player: ME, skill: b.dataset.skill });
};


// Untere Leiste: Auswahl je Typ (Klick behaelt nur diesen Typ), Bauleiste nur mit Erbauern.
let leistenSig = '';
document.getElementById('gruppen').onclick = (ev) => {
  const b = ev.target && ev.target.closest ? ev.target.closest('[data-gruppe]') : null;
  if (b && world) sel = sel.filter((id) => byId(world, id)?.type === b.dataset.gruppe);
};
document.getElementById('hilfeKnopf').onclick = () => {
  const h = document.getElementById('hilfe');
  h.hidden = !h.hidden;
};

/** Leisten neu zeichnen, sobald sich Auswahl, Skills oder Warteschlange aendern. */
function leisten3() {
  const fabs = fabriken3();
  const qSig = fabs.map((f) => f.queue.join()).join(';');
  const sig = sel.join() + '|' + selPlan + '|' + skillSignatur(world, ME) + '|' + qSig;
  if (sig === leistenSig) return;
  leistenSig = sig;
  renderBar();
}

/** Skillbaum und Sperren neu zeichnen, sobald sich daran etwas aendert. */
function skillPanel3() {
  const el = document.getElementById('skills');
  el.hidden = !skillsOffen;
  const sig = skillSignatur(world, ME) + (skillsOffen ? '|offen' : '');
  if (sig === skillSig) return;
  skillSig = sig;
  renderBar();
  if (skillsOffen) el.innerHTML = skillBaumHtml(world, ME);
}

// ------------------------------------------------------------ Eingabe
cv3.addEventListener('contextmenu', (e) => e.preventDefault());
cv3.addEventListener('mousedown', (e) => {
  const mx = e.offsetX;
  const my = e.offsetY;
  const p = aufBoden(mx, my);
  if (e.button === 2) {
    placing = null;
    zielen = null;
    if (sel.length) {
      if (angriff) issue(world, { type: 'attack', player: ME, ids: sel.slice(), x: p.x, y: p.y });
      else befehl3(p.x, p.y, e.shiftKey);
    }
    angriff = false;
    return;
  }
  if (e.button === 1) {
    drag = { pan: true, sx: mx, sy: my, x0: kam.x, z0: kam.z };
    e.preventDefault();
    return;
  }
  if (zielen) {
    issue(world, { type: 'faehigkeit', player: ME, faehigkeit: zielen, x: p.x, y: p.y });
    zielen = null;
    return;
  }
  if (placing) {
    // Ausgewaehlte Erbauer bekommen den Auftrag und gehen hin.
    // Shift: in die Reihe der Erbauer, und weiter setzen
    issue(world, { type: 'build', player: ME, building: placing, x: p.x, y: p.y, ids: erbauer3(), anhaengen: e.shiftKey });
    if (!e.shiftKey) placing = null;
    return;
  }
  if (angriff && sel.length) {
    issue(world, { type: 'attack', player: ME, ids: sel.slice(), x: p.x, y: p.y });
    angriff = false;
    return;
  }
  drag = { sx: mx, sy: my, x: mx, y: my, add: e.shiftKey };
});
addEventListener('mousemove', (e) => {
  const r = cv3.getBoundingClientRect();
  maus = { x: e.clientX - r.left, y: e.clientY - r.top };
  if (!drag) return;
  if (drag.pan) {
    // Verschieben in Blickrichtung: Bildschirm-Pixel -> Meter grob nach Zoom
    const k = kam.dist / 700;
    const dx = (maus.x - drag.sx) * k;
    const dy = (maus.y - drag.sy) * k;
    const c = Math.cos(kam.yaw);
    const s = Math.sin(kam.yaw);
    // Boden greifen: nach rechts ziehen schiebt die Karte nach rechts
    kam.x = drag.x0 - dx * c - dy * s;
    kam.z = drag.z0 + dx * s - dy * c;
  } else {
    drag.x = maus.x;
    drag.y = maus.y;
  }
});
addEventListener('mouseup', () => {
  if (drag && !drag.pan) {
    const x1 = Math.min(drag.sx, drag.x);
    const x2 = Math.max(drag.sx, drag.x);
    const y1 = Math.min(drag.sy, drag.y);
    const y2 = Math.max(drag.sy, drag.y);
    const box = x2 - x1 > 5 || y2 - y1 > 5;
    const picked = [];
    let naechste = null;
    let bestD = 22 * 22;
    for (const e of world.entities) {
      if (e.player !== ME || e.kind !== 'unit') continue;
      const [ex, ey] = lage(e);
      const s = aufSchirm(ex * DM, 1, ey * DM);
      if (!s) continue;
      if (box) {
        if (s[0] >= x1 && s[0] <= x2 && s[1] >= y1 && s[1] <= y2) picked.push(e.id);
      } else {
        const dd = (s[0] - x1) ** 2 + (s[1] - y1) ** 2;
        if (dd < bestD) {
          bestD = dd;
          naechste = e.id;
        }
      }
    }
    if (naechste) picked.push(naechste);
    selPlan = null;
    if (!box && !picked.length) {
      const p = aufBoden(x1, y1);
      for (const e of world.entities) {
        if (e.player !== ME || e.kind !== 'building') continue;
        const r = BUILDINGS[e.type].radius + 40;
        if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 <= r * r) {
          sel = [e.id];
          drag = null;
          return;
        }
      }
      for (const q of world.plaene) {
        if (q.player !== ME) continue;
        const r = BUILDINGS[q.type].radius + 40;
        if ((q.x - p.x) ** 2 + (q.y - p.y) ** 2 <= r * r) {
          selPlan = q.id;
          sel = [];
          drag = null;
          return;
        }
      }
    }
    sel = drag.add ? [...new Set([...sel, ...picked])] : picked;
  }
  drag = null;
});
cv3.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    kam.dist = Math.max(45, Math.min(1500, kam.dist * (e.deltaY < 0 ? 0.88 : 1.14)));
  },
  { passive: false }
);
addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
    tastenGehalten.add(e.key);
    e.preventDefault();
  }
  if (!world) return;
  const i = '123456789'.indexOf(e.key);
  if (i >= 0 && bauListe()[i] && erbauer3().length && !gesperrt(world, ME, bauListe()[i])) placing = bauListe()[i];
  if (e.key === 'h') document.getElementById('hilfeKnopf').onclick();
  if (e.key === 'Escape') {
    placing = null;
    angriff = false;
    zielen = null;
    skillsOffen = false;
    sel = [];
    selPlan = null;
    document.getElementById('hilfe').hidden = true;
  }
  if (e.key === 't') skillsOffen = !skillsOffen;
  // Kommandant gewaehlt: Q, W, E loesen seine Faehigkeiten aus.
  const kdtGewaehlt = kommandantVon(world, ME);
  const fi = 'qwe'.indexOf(e.key);
  if (fi >= 0 && kdtGewaehlt && sel.includes(kdtGewaehlt.id)) {
    wirkeFaehigkeit3(FACTIONS[meFaction].faehigkeiten[fi]);
    return;
  }
  if (e.key === ' ') {
    paused = !paused;
    e.preventDefault();
  }
  if (e.key === '+') speed = Math.min(8, speed * 2);
  if (e.key === '-') speed = Math.max(0.5, speed / 2);
  if (e.key === 'a' && sel.some((id) => byId(world, id)?.kind === 'unit')) {
    angriff = true;
    placing = null;
  }
  if (e.key === 'k') {
    const k = kommandantVon(world, ME);
    if (k) {
      sel = [k.id];
      kam.x = k.x * DM;
      kam.z = k.y * DM;
    }
  }
  if ((e.key === 'Delete' || e.key === 'Backspace') && selPlan) {
    issue(world, { type: 'planWeg', player: ME, id: selPlan });
    selPlan = null;
  }
  if ((e.key === 'Delete' || e.key === 'Backspace') && sel.length === 1) {
    const b = byId(world, sel[0]);
    if (b && b.kind === 'building') issue(world, { type: 'demolish', player: ME, id: b.id });
  }
  const slot = 'qwer'.indexOf(e.key);
  if (slot >= 0 && sel.length === 1) {
    const b = byId(world, sel[0]);
    if (b && b.kind === 'building' && b.done && BUILDINGS[b.type].buildList) {
      const u = BUILDINGS[b.type].buildList[slot];
      if (u) issue(world, { type: 'produce', player: ME, id: b.id, unit: u });
    }
  }
});
addEventListener('keyup', (e) => tastenGehalten.delete(e.key));
mini3.addEventListener('mousedown', (e) => {
  kam.x = (e.offsetX / mini3.clientWidth) * MAP * DM;
  kam.z = (e.offsetY / mini3.clientHeight) * MAP * DM;
});

function kameraTasten(dt) {
  const v = (kam.dist / 300) * 0.35 * dt;
  const c = Math.cos(kam.yaw);
  const s = Math.sin(kam.yaw);
  // vorwaerts = weg von der Kamera, auf dem Boden
  const fx = -s;
  const fz = -c;
  const rx = -c;
  const rz = s;
  if (tastenGehalten.has('ArrowUp')) {
    kam.x += fx * v;
    kam.z += fz * v;
  }
  if (tastenGehalten.has('ArrowDown')) {
    kam.x -= fx * v;
    kam.z -= fz * v;
  }
  if (tastenGehalten.has('ArrowLeft')) {
    kam.x += rx * v;
    kam.z += rz * v;
  }
  if (tastenGehalten.has('ArrowRight')) {
    kam.x -= rx * v;
    kam.z -= rz * v;
  }
  kam.x = Math.max(0, Math.min(MAP * DM, kam.x));
  kam.z = Math.max(0, Math.min(MAP * DM, kam.z));
}

// ------------------------------------------------------------ Schleife
/** Interpolierte Lage einer Einheit in Dezimetern. */
let alphaTick = 0;
function lage(e) {
  const v = vorher.get(e.id);
  if (!v || e.kind !== 'unit') return [e.x, e.y];
  return [v[0] + (e.x - v[0]) * alphaTick, v[1] + (e.y - v[1]) * alphaTick];
}

function tick() {
  for (const e of world.entities) if (e.kind === 'unit') vorher.set(e.id, [e.x, e.y]);
  if (aiMe) stepAI(aiMe, world);
  stepAI(ai, world);
  step(world);
  for (const ev of world.events) {
    if (ev.t === 'shot') {
      const a = byId(world, ev.from);
      const b = byId(world, ev.to);
      if (!a || !b) continue;
      // Fernkaempfer schiessen sichtbar: Jaeger Pfeile, Waldgeist und Waldgott
      // Lichtkugeln. Sonst ein kurzer Blitz zwischen Angreifer und Ziel.
      const art =
        a.type === 'katapult'
          ? 'stein'
          : a.type === 'jaeger' || a.type === 'wachturm' || a.type === 'waechterbaum'
            ? 'pfeil'
            : a.type === 'waldgeist' || a.type === 'waldgott'
              ? 'kugel'
              : 'blitz';
      const dauer = art === 'blitz' ? 0.22 : art === 'stein' ? 0.9 : 0.4;
      if (verborgen(a) && verborgen(b)) continue;
      schuesse.push({ a: ev.from, b: ev.to, ax: a.x, ay: a.y, bx: b.x, by: b.y, farbe: teamFarbe(a.player), t: dauer, dauer, art });
      // Schuetzen schauen zum Ziel
      if (a.kind === 'unit') {
        blick.set(a.id, Math.atan2(b.x - a.x, b.y - a.y));
        ausfall.set(a.id, performance.now());
      }
    } else if (ev.t === 'died') {
      staub.push({ x: ev.x, y: ev.y, r: ev.kind === 'unit' ? 2.5 : 8, t: 0 });
      vorher.delete(ev.id);
    } else if (ev.t === 'faehigkeit') {
      wirkungen.push({ ...ev, bis: world.tick + 12 });
    }
  }
  sel = sel.filter((id) => byId(world, id));
}

function frame(now) {
  const dt = Math.min(250, now - last);
  last = now;
  if (!paused && !world.over) {
    acc += dt * speed;
    let guard = 0;
    while (acc >= TICK_MS && guard++ < 12) {
      tick();
      acc -= TICK_MS;
    }
    if (guard >= 12) acc = 0;
  }
  alphaTick = paused || world.over ? 1 : Math.min(1, acc / TICK_MS);
  kameraTasten(dt);
  if (!document.hidden) {
    zeichne(now, dt);
    zeichneUeberlagerung(now);
    zeichneHud();
    skillPanel3();
    leisten3();
    faehPanel3();
    infoKarte3();
    zeichneMini();
  }
  requestAnimationFrame(frame);
}

// ------------------------------------------------------------ Zeichnen 3D
function groesse() {
  const d = devicePixelRatio || 1;
  const w = cv3.clientWidth;
  const h = cv3.clientHeight;
  if (cv3.width !== ((w * d) | 0) || cv3.height !== ((h * d) | 0)) {
    cv3.width = (w * d) | 0;
    cv3.height = (h * d) | 0;
    ov.width = cv3.width;
    ov.height = cv3.height;
  }
}

function zeichne(now, dt) {
  groesse();
  kameraMatrix();
  const hover0 = aufBoden(maus.x, maus.y);
  hover = hover0;

  gl.viewport(0, 0, cv3.width, cv3.height);
  gl.clearColor(NEBEL[0], NEBEL[1], NEBEL[2], 1);
  gl.clearStencil(0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.disable(gl.CULL_FACE);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  gl.useProgram(PROG);
  gl.uniformMatrix4fv(gl.getUniformLocation(PROG, 'uVP'), false, VP);
  const l = [0.45, 1, 0.3];
  const ll = Math.hypot(...l);
  gl.uniform3f(gl.getUniformLocation(PROG, 'uLicht'), l[0] / ll, l[1] / ll, l[2] / ll);
  gl.uniform3f(gl.getUniformLocation(PROG, 'uNebel'), ...NEBEL);
  // Nebel des Krieges als Textur, eine Zelle je Texel
  nebelAktualisieren(nebel, world, ME);
  nebelHelligkeit(nebel, nebelHell);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, nebelTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, NEBEL_N, NEBEL_N, 0, gl.RED, gl.UNSIGNED_BYTE, nebelHell);
  gl.uniform1i(gl.getUniformLocation(PROG, 'uSicht'), 0);
  gl.uniform1f(gl.getUniformLocation(PROG, 'uKarte'), MAP * DM);

  zeichneBoden(world); // src/gelaende3d.js

  // Schatten: dunkle Scheiben unter allem, was steht oder laeuft -- billig und
  // macht Bodenkontakt und Tiefe lesbar.
  gl.depthMask(false);
  for (const e of world.entities) {
    if (verborgen(e)) continue;
    const def = e.kind === 'unit' ? UNITS[e.type] : BUILDINGS[e.type];
    const [x, y] = lage(e);
    const r = def.radius * DM * (e.kind === 'unit' ? 1.05 * ZEIGE_EINHEIT : 1.25 * ZEIGE_GEBAEUDE);
    instanz('scheibe', x * DM + r * 0.12, 0.06, y * DM + r * 0.08, 0, r, [0, 0, 0], 1, 1, e.kind === 'unit' ? 0.32 : 0.26);
  }
  zeichneInstanzen(MODELLE.scheibe);
  gl.depthMask(true);

  zeichneDomaenen();

  zeichneGelaende(world, now); // src/gelaende3d.js: Seen, Felsen, Adern, Baeume

  // Gebaeude und Einheiten
  const t = now / 1000;
  // Eigene Bauplaene: durchscheinend, nur fuer den eigenen Spieler sichtbar
  for (const q of world.plaene) {
    if (q.player !== ME) continue;
    const r = BUILDINGS[q.type].radius * DM * ZEIGE_GEBAEUDE;
    instanz(q.type, q.x * DM, 0, q.y * DM, 0.4, r, teamFarbe(ME), 1, q.id === selPlan ? 1.5 : 1.2, 0.35);
  }
  // Gegnerische Gebaeude im Nebel: dort, wo man sie zuletzt gesehen hat, matt.
  for (const b of nebel.bekannt.values()) {
    if (sieht(nebel, b.x, b.y)) continue;
    const r = BUILDINGS[b.type].radius * DM * ZEIGE_GEBAEUDE;
    instanz(b.type, b.x * DM, 0, b.y * DM, (b.id % 4) * (Math.PI / 2) + 0.4, r, teamFarbe(b.player), 1, 0.6);
  }
  for (const e of world.entities) {
    if (verborgen(e)) continue;
    const team = teamFarbe(e.player);
    if (e.kind === 'building') {
      const def = BUILDINGS[e.type];
      const r = def.radius * DM * ZEIGE_GEBAEUDE;
      if (e.done) instanz(e.type, e.x * DM, 0, e.y * DM, (e.id % 4) * (Math.PI / 2) + 0.4, r, team);
      else {
        const f = Math.min(1, e.progress / (def.buildTime * 1000));
        instanz(e.type, e.x * DM, 0, e.y * DM, (e.id % 4) * (Math.PI / 2) + 0.4, r, team, 0.15 + 0.85 * f, 0.55);
      }
      continue;
    }
    const def = UNITS[e.type];
    const [x, y] = lage(e);
    const v = vorher.get(e.id);
    const bewegt = v && Math.abs(e.x - v[0]) + Math.abs(e.y - v[1]) > 8; // Rempeln im Pulk zaehlt nicht
    if (bewegt) {
      const ziel = Math.atan2(e.x - v[0], e.y - v[1]);
      const alt = blick.has(e.id) ? blick.get(e.id) : ziel;
      let d = ziel - alt;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      blick.set(e.id, alt + d * Math.min(1, dt / 120));
    }
    const s = def.radius * DM * ZEIGE_EINHEIT;
    const schwebt = e.type === 'waldgeist' ? 0.5 + Math.sin(t * 2 + e.id) * 0.25 : 0;
    const gleitet = e.type === 'waldgeist' || e.type === 'waldgott';
    const huepf = bewegt && !gleitet ? Math.abs(Math.sin(t * 9 + e.id)) * 0.12 * s : 0;
    const schritt = bewegt && !gleitet ? Math.sin(t * 9 + e.id) : 0;
    // Ausfall: kurz nach vorn beim Schuss oder Hieb
    const seit = now - (ausfall.get(e.id) || -1e9);
    const ruck = seit < 220 ? Math.sin((seit / 220) * Math.PI) * 0.4 * s : 0;
    const w = blick.get(e.id) || 0;
    instanz(e.type, x * DM + Math.sin(w) * ruck, schwebt * s + huepf, y * DM + Math.cos(w) * ruck, w, s, team, 1, 1, 1, schritt);
  }

  // Platzierungs-Geist
  if (placing) {
    const def = BUILDINGS[placing];
    let gx = hover.x;
    let gy = hover.y;
    let ok = true;
    if (def.needs) {
      const dep = findDeposit(world, hover.x, hover.y, def.needs);
      if (dep && !dep.takenBy) {
        gx = dep.x;
        gy = dep.y;
      } else ok = false;
    }
    if (def.needsGrowth && isCleared(world, gx, gy)) ok = false;
    if (aufHindernis(world, gx, gy, def.radius)) ok = false;
    const farbe = ok ? teamFarbe(ME) : [0.8, 0.3, 0.2];
    instanz(placing, gx * DM, 0, gy * DM, 0.4, def.radius * DM * ZEIGE_GEBAEUDE, farbe, 1, ok ? 1.1 : 0.8, 0.55);
  }

  // Erst alles ausser Einheiten, dann Einheiten zweimal: wo Gebaeude oder
  // Baeume davor stehen als Umriss in Teamfarbe, dann ganz normal.
  for (const k of Object.keys(MODELLE)) if (k !== 'staubwolke' && !UNITS[k]) zeichneInstanzen(MODELLE[k]);
  const roentgen = gl.getUniformLocation(PROG, 'uRoentgen');
  gl.depthFunc(gl.GREATER);
  gl.depthMask(false);
  gl.uniform1f(roentgen, 1);
  for (const k of Object.keys(UNITS)) zeichneInstanzen(MODELLE[k], true);
  gl.uniform1f(roentgen, 0);
  gl.depthFunc(gl.LEQUAL);
  gl.depthMask(true);
  for (const k of Object.keys(UNITS)) zeichneInstanzen(MODELLE[k]);

  // Staub gefallener Einheiten
  gl.depthMask(false);
  staub = staub.filter((p) => (p.t += dt / 1000) < 0.9);
  for (const p of staub) instanz('staubwolke', p.x * DM, p.r * 0.4, p.y * DM, 0, p.r * (0.6 + p.t), [1, 1, 1], 0.6, 1, 0.5 * (1 - p.t / 0.9));
  zeichneInstanzen(MODELLE.staubwolke);
  gl.depthMask(true);

  zeichneSchuesse(dt);
}

/**
 * Domaenen: je Spieler die Vereinigung aller Ankerkreise -- Flaeche einmal
 * eingefaerbt, dazu nur die Aussenkante. Mit dem Stencil-Puffer:
 * 1) Kreise markieren, 2) Flaeche dort einmal zeichnen, 3) etwas groessere
 * Kreise nur ausserhalb der Markierung -- das ist der Rand.
 */
function zeichneDomaenen() {
  gl.enable(gl.STENCIL_TEST);
  gl.depthMask(false);
  const randBreite = Math.max(1.2, kam.dist * 0.006);
  for (let p = 0; p < 2; p++) {
    const anker = world.entities.filter(
      (e) => e.player === p && e.kind === 'building' && anchorRadius(world, e) > 0 && (p === ME || !nebel.an || nebel.bekannt.has(e.id))
    );
    if (!anker.length) continue;
    const team = teamFarbe(p);
    const kreise = (plus, alpha) => {
      for (const e of anker) instanz('scheibe', e.x * DM, 0.15 + p * 0.02, e.y * DM, 0, anchorRadius(world, e) * DM + plus, team, 1, 1, alpha);
      zeichneInstanzen(MODELLE.scheibe);
    };
    gl.clear(gl.STENCIL_BUFFER_BIT);
    gl.colorMask(false, false, false, false);
    gl.stencilFunc(gl.ALWAYS, 1, 0xff);
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
    kreise(0, 1);
    gl.colorMask(true, true, true, true);
    gl.stencilFunc(gl.EQUAL, 1, 0xff);
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.INCR);
    kreise(0, p === ME ? 0.08 : 0.06);
    gl.stencilFunc(gl.EQUAL, 0, 0xff);
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.INCR);
    kreise(randBreite, p === ME ? 0.85 : 0.6);
  }
  gl.disable(gl.STENCIL_TEST);
  gl.depthMask(true);
}

function zeichneSchuesse(dt) {
  schuesse = schuesse.filter((s) => (s.t -= dt / 1000) > 0);
  const v = [];
  for (const s of schuesse) {
    const a = byId(world, s.a);
    const b = byId(world, s.b);
    const [ax, ay] = a ? lage(a) : [s.ax, s.ay];
    const [bx, by] = b ? lage(b) : [s.bx, s.by];
    if (s.art !== 'blitz') {
      // Geschoss im Bogen vom Schuetzen zum Ziel
      const f = 1 - s.t / s.dauer;
      const bogen = Math.sin(f * Math.PI) * (s.art === 'pfeil' ? 3 : s.art === 'stein' ? 12 : 1.2);
      const w = Math.atan2(bx - ax, by - ay);
      const x = ax + (bx - ax) * f;
      const y = ay + (by - ay) * f;
      // Geschosse uebertrieben gross, sonst sind sie aus Spielhoehe unsichtbar
      instanz(s.art, x * DM, 2 + bogen, y * DM, w, s.art === 'pfeil' ? 2.8 : s.art === 'stein' ? 3.2 : 2.4, s.farbe, 1, s.art === 'kugel' ? 1.4 : 1);
      continue;
    }
    const al = Math.min(1, s.t / 0.22);
    v.push(ax * DM, 1.4, ay * DM, s.farbe[0], s.farbe[1], s.farbe[2], al);
    v.push(bx * DM, 1.0, by * DM, 1, 0.95, 0.8, al);
  }
  zeichneInstanzen(MODELLE.pfeil);
  zeichneInstanzen(MODELLE.kugel);
  zeichneInstanzen(MODELLE.stein);
  // Baulinien: Erbauer zu ihrer Baustelle
  for (const e of world.entities) {
    if (e.kind !== 'unit' || !e.baut) continue;
    const site = byId(world, e.baut);
    if (!site) continue;
    const [ux, uy] = lage(e);
    const f = teamFarbe(e.player);
    v.push(ux * DM, 2, uy * DM, f[0], f[1], f[2], 0.7);
    v.push(site.x * DM, 1, site.y * DM, f[0], f[1], f[2], 0.15);
  }
  if (!v.length) return;
  gl.useProgram(PROG_L);
  gl.uniformMatrix4fv(gl.getUniformLocation(PROG_L, 'uVP'), false, VP);
  gl.bindVertexArray(linienVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, linienPuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(v), gl.DYNAMIC_DRAW);
  gl.drawArrays(gl.LINES, 0, v.length / 7);
  gl.bindVertexArray(null);
}

// ------------------------------------------------------------ Ueberlagerung (2D)
/** Kreis auf dem Boden (Mitte und Radius in Dezimetern), als Linienzug ins Overlay. */
function bodenKreis(x, y, r) {
  octx.beginPath();
  let offen = false;
  for (let i = 0; i <= 48; i++) {
    const w = (i / 48) * Math.PI * 2;
    const s = aufSchirm((x + Math.cos(w) * r) * DM, 0.3, (y + Math.sin(w) * r) * DM);
    if (!s) {
      offen = false;
      continue;
    }
    if (offen) octx.lineTo(s[0], s[1]);
    else octx.moveTo(s[0], s[1]);
    offen = true;
  }
  octx.stroke();
}

/** Schrein-Umkreise, Faehigkeits-Einsaetze, gerufene und festgehaltene Einheiten, Zielkreis. */
function zeichneWirkungen() {
  octx.lineWidth = 1;
  octx.setLineDash([6, 6]);
  for (const e of world.entities) {
    if (e.dead || e.kind !== 'building' || !e.done || !BUILDINGS[e.type].buff || verborgen(e)) continue;
    octx.strokeStyle = FACTIONS[world.players[e.player].faction].color;
    octx.globalAlpha = e.powered ? 0.5 : 0.18;
    bodenKreis(e.x, e.y, BUILDINGS[e.type].buff.radius);
  }
  octx.setLineDash([]);
  wirkungen = wirkungen.filter((w) => w.bis >= world.tick);
  octx.lineWidth = 2.5;
  for (const w of wirkungen) {
    const t = 1 - (w.bis - world.tick) / 12;
    octx.strokeStyle = faehigkeitFarbe(w.art);
    octx.globalAlpha = 1 - t;
    bodenKreis(w.x, w.y, w.r * (0.4 + 0.6 * t));
  }
  octx.globalAlpha = 1;
  octx.lineWidth = 1.5;
  for (const e of world.entities) {
    if (e.dead || e.kind !== 'unit' || verborgen(e)) continue;
    const t = world.tick;
    const art = e.gebundenBis > t ? 'griff' : e.wehrBis > t ? 'wehr' : e.rufBis > t ? 'ruf' : e.tempoBis > t ? 'tempo' : e.beschworen ? 'rufen' : null;
    if (!art) continue;
    const [x, y] = lage(e);
    const m = aufSchirm(x * DM, 0.2, y * DM);
    if (!m) continue;
    octx.strokeStyle = faehigkeitFarbe(art);
    octx.beginPath();
    octx.ellipse(m[0], m[1], 9, 5, 0, 0, Math.PI * 2);
    octx.stroke();
  }
  if (zielen) {
    const f = FAEHIGKEITEN[zielen];
    const k = kommandantVon(world, ME);
    const drin = k && (hover.x - k.x) ** 2 + (hover.y - k.y) ** 2 <= f.reichweite ** 2;
    octx.strokeStyle = drin ? '#9a7a4a' : '#c4603f';
    octx.lineWidth = 2;
    bodenKreis(hover.x, hover.y, f.radius);
    if (k) {
      octx.lineWidth = 1;
      octx.setLineDash([4, 4]);
      bodenKreis(k.x, k.y, f.reichweite);
      octx.setLineDash([]);
    }
  }
}

function zeichneUeberlagerung(now) {
  const d = devicePixelRatio || 1;
  octx.setTransform(d, 0, 0, d, 0, 0);
  octx.clearRect(0, 0, ov.width, ov.height);
  zeichneWirkungen();
  // Auswahlringe
  octx.lineWidth = 1.5;
  octx.strokeStyle = '#f0f4e8';
  for (const id of sel) {
    const e = byId(world, id);
    if (!e) continue;
    const [x, y] = lage(e);
    const r = (e.kind === 'unit' ? UNITS[e.type].radius * ZEIGE_EINHEIT : BUILDINGS[e.type].radius * ZEIGE_GEBAEUDE) * DM * 1.4;
    const m = aufSchirm(x * DM, 0.2, y * DM);
    const rr = aufSchirm(x * DM + r, 0.2, y * DM);
    if (!m || !rr) continue;
    const rad = Math.max(6, Math.hypot(rr[0] - m[0], rr[1] - m[1]));
    octx.beginPath();
    octx.ellipse(m[0], m[1], rad, rad * 0.55, 0, 0, Math.PI * 2);
    octx.stroke();
  }
  // Lebensbalken: beschaedigt, ausgewaehlt oder Kommandant; Baufortschritt
  for (const e of world.entities) {
    if (verborgen(e)) continue;
    const def = e.kind === 'unit' ? UNITS[e.type] : BUILDINGS[e.type];
    const zeigen = e.hp < e.maxHp || sel.includes(e.id) || def.commander || (e.kind === 'building' && !e.done);
    if (!zeigen) continue;
    const [x, y] = lage(e);
    const hoehe = e.kind === 'unit' ? def.radius * DM * ZEIGE_EINHEIT * (def.commander ? 3.6 : 2.6) : def.radius * DM * ZEIGE_GEBAEUDE * 3.2;
    const s = aufSchirm(x * DM, hoehe, y * DM);
    if (!s) continue;
    const w = def.commander ? 44 : e.kind === 'building' ? 34 : 18;
    octx.fillStyle = 'rgba(0,0,0,.7)';
    octx.fillRect(s[0] - w / 2 - 1, s[1] - 1, w + 2, 5);
    const anteil = e.hp / e.maxHp;
    octx.fillStyle = anteil < 0.34 ? '#c4603f' : e.player === ME ? '#8fc46a' : '#d07a5a';
    octx.fillRect(s[0] - w / 2, s[1], w * anteil, 3);
    if (e.kind === 'building' && !e.done) {
      const f = Math.min(1, e.progress / (def.buildTime * 1000));
      octx.fillStyle = '#d8b06a';
      octx.fillRect(s[0] - w / 2, s[1] + 4, w * f, 2);
    }
    if (def.commander) {
      octx.fillStyle = '#e8dcc0';
      octx.font = '11px ui-sans-serif, system-ui, sans-serif';
      octx.textAlign = 'center';
      octx.fillText(def.name, s[0], s[1] - 5);
    }
  }
  // Auswahlrahmen
  if (drag && !drag.pan) {
    octx.strokeStyle = '#c8d8b0';
    octx.setLineDash([4, 3]);
    octx.strokeRect(drag.sx, drag.sy, drag.x - drag.sx, drag.y - drag.sy);
    octx.setLineDash([]);
  }
  // Angriffs-Fadenkreuz
  if (angriff) {
    octx.strokeStyle = '#c4603f';
    octx.beginPath();
    octx.arc(maus.x, maus.y, 10, 0, Math.PI * 2);
    octx.moveTo(maus.x - 15, maus.y);
    octx.lineTo(maus.x + 15, maus.y);
    octx.moveTo(maus.x, maus.y - 15);
    octx.lineTo(maus.x, maus.y + 15);
    octx.stroke();
  }
  if (placing) {
    octx.fillStyle = '#d8dcd0';
    octx.font = '12px ui-sans-serif, system-ui, sans-serif';
    octx.textAlign = 'center';
    const drin = inDomain(world, ME, hover.x, hover.y);
    const def = BUILDINGS[placing];
    const text =
      def.name +
      (drin || !def.gegenwartIn ? '' : ' — außerhalb der Domäne: ohne Gegenwart') +
      (erbauer3().length ? '' : ' — keine Erbauer gewählt: die Baustelle wartet');
    octx.fillText(text, maus.x, maus.y - 24);
  }
}

// ------------------------------------------------------------ HUD und Minikarte
function zeichneHud() {
  const p = world.players[ME];
  const k = kommandantVon(world, ME);
  let auswahl = '';
  const plan = selPlan ? planVon(world, selPlan) : null;
  if (selPlan && !plan) selPlan = null;
  if (plan) auswahl = planHtml(world, plan);
  else if (sel.length === 1) {
    const e = byId(world, sel[0]);
    if (e && e.kind === 'building') {
      const def = BUILDINGS[e.type];
      const zustand = !e.done
        ? baustelleText(world, e)
        : e.powered < 1000
          ? `gedrosselt ${Math.round(e.powered / 10)} %`
          : 'versorgt';
      const tasten = ausbildungHtml(world, ME, e.type);
      auswahl = `<div class="sel">${auswahlKopf(world, e)} · ${zustand}${reparaturText(world, e)}${e.queue.length ? ` · ${e.queue.length} in Auftrag` : ''}
        ${tasten}<div class="keys">${def.vital ? '' : '<kbd>Entf</kbd> abreißen'}</div></div>`;
    } else if (e) {
      auswahl = `<div class="sel">${auswahlKopf(world, e)}${einheitKarte(world, ME, e.type)}</div>`;
    }
  }
  // Wenig Text: Kommandant und Zeit; Rest nur bei Bedarf (Auswahl, Warnungen).
  document.getElementById('ressourcen').innerHTML = ressourcenHtml(world, ME);
  document.getElementById('hud').innerHTML = `
    <div class="res">
      ${k ? `<b>${UNITS[k.type].name} <kbd>K</kbd></b><span>${Math.round((100 * k.hp) / k.maxHp)} %</span>` : ''}
      <b>Zeit</b><span>${(world.tick / 600).toFixed(1)} min${paused ? ' ⏸' : ''}${speed !== 1 ? ' ×' + speed : ''}${aiMe ? ' · Zuschauen' : ''}</span>
    </div>
    ${warnungenHtml(world, ME)}
    ${auswahl}
    ${world.over ? `<div class="over">${world.winner === ME ? 'Gewonnen' : 'Verloren'}</div>` : ''}`;
}

function zeichneMini() {
  const W = mini3.width;
  mctx3.fillStyle = '#0b0d08';
  mctx3.fillRect(0, 0, W, W);
  const s = W / MAP;
  for (const h of world.hindernisse) {
    mctx3.fillStyle = h.art === 'see' ? '#2c5670' : '#4c4e42';
    mctx3.beginPath();
    mctx3.arc(h.x * s, h.y * s, h.r * s, 0, Math.PI * 2);
    mctx3.fill();
  }
  for (let p = 0; p < 2; p++) {
    mctx3.fillStyle = FACTIONS[world.players[p].faction].color;
    mctx3.globalAlpha = 0.18;
    for (const e of world.entities) {
      if (e.player !== p || e.kind !== 'building') continue;
      if (p !== ME && nebel.an && !nebel.bekannt.has(e.id)) continue;
      const r = anchorRadius(world, e);
      if (!r) continue;
      mctx3.beginPath();
      mctx3.arc(e.x * s, e.y * s, r * s, 0, Math.PI * 2);
      mctx3.fill();
    }
    mctx3.globalAlpha = 1;
    for (const e of world.entities) {
      if (e.player !== p || verborgen(e)) continue;
      const sz = e.kind === 'building' ? 4 : UNITS[e.type].commander ? 6 : 2.5;
      mctx3.fillRect(e.x * s - sz / 2, e.y * s - sz / 2, sz, sz);
    }
  }
  // Nebel auf der Minikarte: Zelle fuer Zelle abgedunkelt
  if (nebel.an) {
    const z = W / NEBEL_N;
    for (let i = 0; i < nebelHell.length; i++) {
      if (nebelHell[i] === 255) continue;
      mctx3.fillStyle = nebelHell[i] ? 'rgba(11,13,8,0.45)' : 'rgba(11,13,8,0.88)';
      mctx3.fillRect((i % NEBEL_N) * z, ((i / NEBEL_N) | 0) * z, z + 0.5, z + 0.5);
    }
  }
  // Kamera-Ziel
  mctx3.strokeStyle = '#e8dcc0';
  mctx3.lineWidth = 2;
  mctx3.beginPath();
  mctx3.arc((kam.x / DM) * s, (kam.z / DM) * s, Math.max(6, (kam.dist / DM) * s * 0.35), 0, Math.PI * 2);
  mctx3.stroke();
}

// ------------------------------------------------------------ Startbildschirm
const STIL_NAMEN3 = { sturm: 'Sturm — greift früh an', standard: 'Standard', burg: 'Burg — baut aus, greift spät an' };
function introHtml3() {
  return `<h1>Die drei Reiche — 3D</h1>
    <p class="frage">Fördern, aufbauen, ausbreiten — und Hauptgebäude oder Kommandant des Gegners zerstören.</p>
    <p>Menschen: viele günstige Einheiten. Wald- und Wiesengott: wenige starke. Die Domäne
    (farbige Fläche) zeigt, wo Gegenwart fließt; Schreine stärken eigene Einheiten in ihrem Umkreis, soweit er in der Domäne liegt. Fällt der Kommandant,
    ist die Partie verloren.</p>
    <p>Erbauer (Arbeiter oder Kommandant) wählen, dann Gebäude setzen: Das ist erst ein <b>Bauplan</b>
    — ohne Kosten, ohne Sicht. Gebaut und bezahlt wird, sobald ein Erbauer daneben steht; wer weggeht,
    baut nicht weiter. Mit <kbd>Shift</kbd> reiht man mehrere Pläne hintereinander.</p>
    <p>Jede Einheit kostet laufend <b>Unterhalt</b> in Fron — große Heere fressen die Wirtschaft.
    Mit der Zeit kommen <b>Skillpunkte</b> (<kbd>T</kbd>): Sie schalten Fernkämpfer, schwere Einheiten,
    Schreine, Verbesserungen und drei Fähigkeiten des Kommandanten frei — Kommandant wählen, dann
    <kbd>Q</kbd>–<kbd>E</kbd> oder die Knöpfe. Wer lange lebt,
    sammelt ein wenig Erfahrung.</p>
    <p style="color:var(--dim)">Dieselbe Simulation wie die 2D-Ansicht — Modelle sind bewusst einfach.</p>
    <div class="stil">Gegner:
      ${Object.keys(STILE)
        .map((s) => `<label><input type="radio" name="stil" value="${s}"${s === gegnerStil ? ' checked' : ''}> ${STIL_NAMEN3[s]}</label>`)
        .join('')}
    </div>
    <div class="stil">Schwierigkeit:
      ${Object.keys(STUFEN)
        .map((s) => `<label><input type="radio" name="stufe" value="${s}"${s === gegnerStufe ? ' checked' : ''}> ${STUFEN_NAMEN[s]}</label>`)
        .join('')}
    </div>
    <div class="go">
      <button id="introMensch">Als Menschen spielen</button>
      <button id="introGott">Als Gott spielen</button>
      <button id="introSchau">Zuschauen</button>
    </div>`;
}
const STUFEN_NAMEN = {
  leicht: 'Leicht — reagiert langsam, baut wenig aus',
  mittel: 'Mittel',
  schwer: 'Schwer — schnell, baut früh aus',
};
function starte3(f, zuschauen) {
  const gewaehlt = document.querySelector?.('#intro input[name="stil"]:checked');
  if (gewaehlt) gegnerStil = gewaehlt.value;
  const stufe = document.querySelector?.('#intro input[name="stufe"]:checked');
  if (stufe) gegnerStufe = stufe.value;
  document.getElementById('intro').style.display = 'none';
  paused = false;
  neu(f, zuschauen);
}

// ------------------------------------------------------------ Start
if (!gl) {
  document.getElementById('nogl').style.display = 'grid';
  document.getElementById('intro').style.display = 'none';
} else {
  initGL();
  // Nebel des Krieges: eine Textur, eine Zelle je Texel (siehe zeichne)
  nebelTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, nebelTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  document.getElementById('intro').innerHTML = introHtml3();
  document.getElementById('introMensch').onclick = () => starte3('mensch', false);
  document.getElementById('introGott').onclick = () => starte3('gott', false);
  document.getElementById('introSchau').onclick = () => starte3('mensch', true);
  neu('mensch', true);
  paused = true;
  requestAnimationFrame(frame);
}
