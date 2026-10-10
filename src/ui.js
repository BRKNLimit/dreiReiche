// Darstellung und Eingabe. Aendert den Simulationszustand nie direkt,
// sondern nur ueber issue(). Wird von tools/bundle.mjs mit der Sim
// zusammengefuegt -- deshalb hier keine Imports.

const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
const mini = document.getElementById('mini');
const mctx = mini.getContext('2d');

let meFaction = 'mensch';
let world, ai, aiMe;
let angriff = false; // A gedrueckt: naechster Klick ist eine Angriffsbewegung
let stats; // Auswertung der Partie, siehe zaehle()
let zeigeAuswertung = false;
let gegnerStil = 'standard'; // Stil der Gegner-KI, im Startbildschirm waehlbar
const ME = 0;

const cam = { x: 3000, y: 3000, z: 0.038 };
let sel = [];
let drag = null;
let placing = null;
let hover = { x: 0, y: 0 };
let paused = false;
let speed = 1;
let acc = 0;
let last = performance.now();

const COL = {
  bg: '#12140f',
  grid: '#1b1f17',
  cleared: '#2a2318',
  text: '#d8dcd0',
  dim: '#7d8575',
  bad: '#c4603f',
  gold: '#d8b06a',
  blut: '#a86fb5',
};

function neu(f, zuschauen = false) {
  meFaction = f;
  const gegner = f === 'mensch' ? 'gott' : 'mensch';
  world = createWorld({ seed: (Date.now() / 1000) | 0, factions: [f, gegner] });
  ai = createAI(1, world.seed, gegnerStil);
  // Zuschauen: dieselbe KI spielt auch die eigene Seite.
  aiMe = zuschauen ? createAI(0, world.seed + 1) : null;
  angriff = false;
  zeigeAuswertung = false;
  stats = neueStats();
  sel = [];
  placing = null;
  flaeche = { tick: -1, ha: [0, 0], verlauf: [[], []] };
  cam.x = 3000;
  cam.y = 3000;
  renderBar();
}

function resize() {
  cv.width = cv.clientWidth * devicePixelRatio;
  cv.height = cv.clientHeight * devicePixelRatio;
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}
addEventListener('resize', resize);

const w2sx = (x) => (x - cam.x) * cam.z + cv.clientWidth / 2;
const w2sy = (y) => (y - cam.y) * cam.z + cv.clientHeight / 2;
const s2wx = (x) => (x - cv.clientWidth / 2) / cam.z + cam.x;
const s2wy = (y) => (y - cv.clientHeight / 2) / cam.z + cam.y;

// ------------------------------------------------------------ Eingabe
cv.addEventListener('contextmenu', (e) => e.preventDefault());

cv.addEventListener('mousedown', (e) => {
  const mx = e.offsetX;
  const my = e.offsetY;
  if (e.button === 2) {
    placing = null;
    angriff = false;
    if (sel.length) {
      issue(world, { type: 'move', player: ME, ids: sel.slice(), x: s2wx(mx) | 0, y: s2wy(my) | 0 });
    }
    return;
  }
  if (e.button === 1) {
    drag = { pan: true, sx: mx, sy: my, cx: cam.x, cy: cam.y };
    return;
  }
  if (placing) {
    issue(world, { type: 'build', player: ME, building: placing, x: s2wx(mx) | 0, y: s2wy(my) | 0 });
    if (!e.shiftKey) placing = null;
    return;
  }
  if (angriff && sel.length) {
    issue(world, { type: 'attack', player: ME, ids: sel.slice(), x: s2wx(mx) | 0, y: s2wy(my) | 0 });
    angriff = false;
    return;
  }
  drag = { sx: mx, sy: my, x: mx, y: my, add: e.shiftKey };
});

addEventListener('mousemove', (e) => {
  const r = cv.getBoundingClientRect();
  const mx = e.clientX - r.left;
  const my = e.clientY - r.top;
  hover = { x: s2wx(mx) | 0, y: s2wy(my) | 0 };
  if (!drag) return;
  if (drag.pan) {
    cam.x = drag.cx - (mx - drag.sx) / cam.z;
    cam.y = drag.cy - (my - drag.sy) / cam.z;
  } else {
    drag.x = mx;
    drag.y = my;
  }
});

addEventListener('mouseup', () => {
  if (drag && !drag.pan) {
    const x1 = Math.min(drag.sx, drag.x);
    const x2 = Math.max(drag.sx, drag.x);
    const y1 = Math.min(drag.sy, drag.y);
    const y2 = Math.max(drag.sy, drag.y);
    const box = x2 - x1 > 4 || y2 - y1 > 4;
    const picked = [];
    for (const e of world.entities) {
      if (e.player !== ME || e.kind !== 'unit') continue;
      const sx = w2sx(e.x);
      const sy = w2sy(e.y);
      if (box) {
        if (sx >= x1 && sx <= x2 && sy >= y1 && sy <= y2) picked.push(e.id);
      } else if (Math.hypot(sx - x1, sy - y1) < 16) picked.push(e.id);
    }
    if (!box && picked.length === 0) {
      for (const e of world.entities) {
        if (e.player !== ME || e.kind !== 'building') continue;
        if (Math.hypot(w2sx(e.x) - x1, w2sy(e.y) - y1) < BUILDINGS[e.type].radius * cam.z + 12) {
          sel = [e.id];
          drag = null;
          return;
        }
      }
    }
    sel = drag.add ? [...new Set([...sel, ...picked])] : picked;
  }
  drag = null;
});

cv.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    const wx = s2wx(e.offsetX);
    const wy = s2wy(e.offsetY);
    cam.z = Math.max(0.012, Math.min(0.2, cam.z * (e.deltaY < 0 ? 1.15 : 0.87)));
    cam.x = wx - (e.offsetX - cv.clientWidth / 2) / cam.z;
    cam.y = wy - (e.offsetY - cv.clientHeight / 2) / cam.z;
  },
  { passive: false }
);

addEventListener('keydown', (e) => {
  const liste = bauListe();
  const i = '1234567'.indexOf(e.key);
  if (i >= 0 && liste[i]) placing = liste[i];
  if (e.key === 'Escape') {
    placing = null;
    angriff = false;
    sel = [];
  }
  if (e.key === 'a' && sel.some((id) => byId(world, id)?.kind === 'unit')) {
    angriff = true;
    placing = null;
  }
  if (e.key === ' ') {
    paused = !paused;
    e.preventDefault();
  }
  if (e.key === 'i') zeigeAuswertung = !zeigeAuswertung;
  if (e.key === 'k') {
    const k = kommandantVon(world, ME);
    if (k) {
      sel = [k.id];
      cam.x = k.x;
      cam.y = k.y;
    }
  }
  if (e.key === '+') speed = Math.min(8, speed * 2);
  if (e.key === '-') speed = Math.max(0.5, speed / 2);
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

mini.addEventListener('mousedown', (e) => {
  cam.x = (e.offsetX / mini.clientWidth) * MAP;
  cam.y = (e.offsetY / mini.clientHeight) * MAP;
});

function bauListe() {
  return meFaction === 'mensch'
    ? ['schmiede', 'saege', 'turm', 'kaserne', 'schacht', 'banner', 'kapelle']
    : ['quelle', 'moos', 'hain', 'dickicht', 'blutwurz', 'dornenschrein', 'steinkreis'];
}

function renderBar() {
  const bar = document.getElementById('builds');
  bar.innerHTML = bauListe()
    .map((t, i) => `<button data-b="${t}">${BUILDINGS[t].name}<kbd>${i + 1}</kbd></button>`)
    .join('');
  for (const b of bar.querySelectorAll('[data-b]')) b.onclick = () => (placing = b.dataset.b);
}

// ------------------------------------------------------------ Schleife
function frame(now) {
  const dt = Math.min(250, now - last);
  last = now;
  if (!paused && !world.over) {
    acc += dt * speed;
    let guard = 0;
    while (acc >= TICK_MS && guard++ < 12) {
      if (aiMe) stepAI(aiMe, world);
      stepAI(ai, world);
      step(world);
      zaehle();
      acc -= TICK_MS;
      sel = sel.filter((id) => byId(world, id));
    }
  }
  draw();
  requestAnimationFrame(frame);
}

// ------------------------------------------------------------ Zeichnen
function draw() {
  const W = cv.clientWidth;
  const H = cv.clientHeight;
  ctx.fillStyle = COL.bg;
  ctx.fillRect(0, 0, W, H);

  drawGrid(W, H);
  drawCleared();
  drawDomains();
  drawDeposits();
  drawEntities();
  drawSelection();
  if (placing) drawGhost();
  drawHud();
  drawMini();
}

function drawGrid(W, H) {
  const s = 2000;
  ctx.strokeStyle = COL.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = Math.floor(s2wx(0) / s) * s; x < s2wx(W) + s; x += s) {
    const sx = Math.round(w2sx(x)) + 0.5;
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, H);
  }
  for (let y = Math.floor(s2wy(0) / s) * s; y < s2wy(H) + s; y += s) {
    const sy = Math.round(w2sy(y)) + 0.5;
    ctx.moveTo(0, sy);
    ctx.lineTo(W, sy);
  }
  ctx.stroke();
  ctx.strokeStyle = '#2a3022';
  ctx.lineWidth = 2;
  ctx.strokeRect(w2sx(0), w2sy(0), MAP * cam.z, MAP * cam.z);
}

function drawCleared() {
  ctx.fillStyle = COL.cleared;
  for (const c of world.cleared) {
    ctx.beginPath();
    ctx.arc(w2sx(c.x), w2sy(c.y), c.r * cam.z, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Die Domäne ist die wichtigste Linie im Spiel -- also die auffälligste. */
function drawDomains() {
  for (let p = 0; p < 2; p++) {
    const col = FACTIONS[world.players[p].faction].color;
    const anker = world.entities.filter(
      (e) => !e.dead && e.player === p && e.kind === 'building' && anchorRadius(world, e) > 0
    );
    if (!anker.length) continue;

    ctx.save();
    ctx.beginPath();
    for (const e of anker) {
      ctx.moveTo(w2sx(e.x) + anchorRadius(world, e) * cam.z, w2sy(e.y));
      ctx.arc(w2sx(e.x), w2sy(e.y), anchorRadius(world, e) * cam.z, 0, Math.PI * 2);
    }
    ctx.fillStyle = col;
    ctx.globalAlpha = p === ME ? 0.1 : 0.07;
    ctx.fill();
    ctx.restore();
    // Nur die Aussenkante der Vereinigung, keine inneren Boegen: die Grenze
    // ist die wichtigste Linie im Spiel (konzept.md, offene Frage).
    grenzlinie(anker, col, p === ME ? 2 : 1.5, p === ME ? 0.8 : 0.5);
    ctx.save();

    // Vorschau: so weit reicht jeder wachsende Anker in zwei Minuten.
    const g = FACTIONS[world.players[p].faction].growth;
    if (g.perTick > 0) {
      ctx.beginPath();
      for (const e of anker) {
        const r = anchorRadius(world, e);
        if (r >= g.max) continue;
        const spaeter = Math.min(g.max, r + g.perTick * VORSCHAU_TICKS) * cam.z;
        ctx.moveTo(w2sx(e.x) + spaeter, w2sy(e.y));
        ctx.arc(w2sx(e.x), w2sy(e.y), spaeter, 0, Math.PI * 2);
      }
      ctx.globalAlpha = p === ME ? 0.3 : 0.18;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }
}

const VORSCHAU_TICKS = 1200; // zwei Minuten

// Aussenkante einer Kreisvereinigung: auf einer eigenen Ebene alle Kreise
// doppelt so breit umranden, dann alle Kreisflaechen wieder ausstanzen.
// Uebrig bleibt die aeussere Haelfte der Linie -- nur dort, wo kein anderer
// Kreis liegt.
const randCv = document.createElement('canvas');
const rctx = randCv.getContext('2d');
function grenzlinie(anker, farbe, breite, alpha) {
  if (randCv.width !== cv.width || randCv.height !== cv.height) {
    randCv.width = cv.width;
    randCv.height = cv.height;
  }
  rctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  rctx.clearRect(0, 0, cv.clientWidth, cv.clientHeight);
  const kreise = () => {
    rctx.beginPath();
    for (const e of anker) {
      const r = anchorRadius(world, e) * cam.z;
      rctx.moveTo(w2sx(e.x) + r, w2sy(e.y));
      rctx.arc(w2sx(e.x), w2sy(e.y), r, 0, Math.PI * 2);
    }
  };
  rctx.globalCompositeOperation = 'source-over';
  rctx.strokeStyle = farbe;
  rctx.lineWidth = breite * 2;
  kreise();
  rctx.stroke();
  rctx.globalCompositeOperation = 'destination-out';
  kreise();
  rctx.fill();
  rctx.globalCompositeOperation = 'source-over';
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = alpha;
  ctx.drawImage(randCv, 0, 0);
  ctx.restore();
}

function drawDeposits() {
  for (const d of world.deposits) {
    const x = w2sx(d.x);
    const y = w2sy(d.y);
    const r = Math.max(3, (d.kind === 'goetterblut' ? 150 : 90) * cam.z);
    ctx.strokeStyle = d.kind === 'goetterblut' ? COL.blut : COL.dim;
    ctx.globalAlpha = d.takenBy ? 0.3 : 0.85;
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (d.kind === 'goetterblut') {
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        const px = x + Math.cos(a) * r;
        const py = y + Math.sin(a) * r;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath();
    } else ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function drawEntities() {
  for (const e of world.entities) {
    const col = FACTIONS[world.players[e.player].faction].color;
    const x = w2sx(e.x);
    const y = w2sy(e.y);
    if (x < -60 || y < -60 || x > cv.clientWidth + 60 || y > cv.clientHeight + 60) continue;

    if (e.kind === 'building') {
      const def = BUILDINGS[e.type];
      const r = Math.max(4, def.radius * cam.z);
      ctx.fillStyle = e.done ? '#1d2118' : '#171a13';
      ctx.strokeStyle = col;
      ctx.lineWidth = def.vital ? 2.5 : 1.5;
      ctx.beginPath();
      ctx.rect(x - r, y - r, r * 2, r * 2);
      ctx.fill();
      if (!e.done) ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      if (e.done && e.powered < 1000) {
        ctx.fillStyle = COL.bad;
        ctx.globalAlpha = 0.2 + 0.3 * Math.sin(performance.now() / 200);
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
        ctx.globalAlpha = 1;
      }
      if (r > 10) {
        ctx.fillStyle = COL.text;
        ctx.font = '9px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(def.short, x, y + 3);
      }
      if (!e.done) {
        const f = Math.min(1, e.progress / (def.buildTime * 1000));
        ctx.fillStyle = f > 0 ? col : COL.bad;
        ctx.fillRect(x - r, y + r + 2, Math.max(1, r * 2 * f), 2);
      }
      if (e.queue && e.queue.length) {
        ctx.fillStyle = COL.gold;
        const f = Math.min(1, e.queueProgress / (UNITS[e.queue[0]].buildTime * 1000));
        ctx.fillRect(x - r, y - r - 5, r * 2 * f, 3);
      }
    } else {
      const def = UNITS[e.type];
      const r = Math.max(def.commander ? 6 : 2.5, def.radius * cam.z);
      if (def.commander) {
        // Baulinie zur Baustelle, an der er gerade erschafft
        const site = e.baut ? byId(world, e.baut) : null;
        if (site) {
          ctx.strokeStyle = col;
          ctx.globalAlpha = 0.7;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(w2sx(site.x), w2sy(site.y));
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.globalAlpha = 1;
        }
        ctx.strokeStyle = COL.gold;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, r + 4, 0, Math.PI * 2);
        ctx.stroke();
        if (r > 8) {
          ctx.fillStyle = COL.text;
          ctx.font = '10px ui-sans-serif, system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(def.name, x, y + r + 16);
        }
      }
      ctx.fillStyle = col;
      ctx.beginPath();
      if (def.commander) ctx.arc(x, y, r, 0, Math.PI * 2);
      else if (def.worker) ctx.arc(x, y, r * 0.8, 0, Math.PI * 2);
      else if (def.hp > 500) ctx.rect(x - r, y - r * 0.9, r * 2, r * 1.8);
      else {
        ctx.moveTo(x, y - r);
        ctx.lineTo(x + r, y + r);
        ctx.lineTo(x - r, y + r);
        ctx.closePath();
      }
      ctx.fill();
      if (e.hp < e.maxHp || def.commander) {
        const bw = def.commander ? Math.max(24, r * 3) : r * 2;
        const by = y - r - (def.commander ? 10 : 4);
        ctx.fillStyle = '#000';
        ctx.fillRect(x - bw / 2, by, bw, def.commander ? 3 : 2);
        ctx.fillStyle = e.hp * 3 < e.maxHp ? COL.bad : '#8fc46a';
        ctx.fillRect(x - bw / 2, by, (bw * e.hp) / e.maxHp, def.commander ? 3 : 2);
      }
    }
  }

  ctx.strokeStyle = '#e8c87a';
  ctx.globalAlpha = 0.8;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const ev of world.events) {
    if (ev.t !== 'shot') continue;
    const a = byId(world, ev.from);
    const b = byId(world, ev.to);
    if (!a || !b) continue;
    ctx.moveTo(w2sx(a.x), w2sy(a.y));
    ctx.lineTo(w2sx(b.x), w2sy(b.y));
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawSelection() {
  if (angriff) {
    // Angriffsbewegung scharf: Fadenkreuz am Mauszeiger.
    const x = w2sx(hover.x);
    const y = w2sy(hover.y);
    ctx.strokeStyle = COL.bad;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.moveTo(x - 15, y);
    ctx.lineTo(x + 15, y);
    ctx.moveTo(x, y - 15);
    ctx.lineTo(x, y + 15);
    ctx.stroke();
  }
  ctx.strokeStyle = '#f0f4e8';
  ctx.lineWidth = 1;
  for (const id of sel) {
    const e = byId(world, id);
    if (!e) continue;
    const def = e.kind === 'unit' ? UNITS[e.type] : BUILDINGS[e.type];
    ctx.beginPath();
    ctx.arc(w2sx(e.x), w2sy(e.y), Math.max(5, def.radius * cam.z) + 4, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (drag && !drag.pan) {
    ctx.strokeStyle = '#c8d8b0';
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(drag.sx, drag.sy, drag.x - drag.sx, drag.y - drag.sy);
    ctx.setLineDash([]);
  }
}

function drawGhost() {
  const def = BUILDINGS[placing];
  // Foerderbauten rasten auf die naechste Ader ein, wie in tryPlace().
  let gx = hover.x;
  let gy = hover.y;
  let ohneAder = false;
  if (def.needs) {
    const dep = findDeposit(world, hover.x, hover.y, def.needs);
    if (dep && !dep.takenBy) {
      gx = dep.x;
      gy = dep.y;
    } else ohneAder = true;
  }
  const x = w2sx(gx);
  const y = w2sy(gy);
  const r = Math.max(4, def.radius * cam.z);
  const drin = inDomain(world, ME, gx, gy);
  const gerodet = def.needsGrowth && isCleared(world, gx, gy);
  const col = gerodet || ohneAder ? COL.bad : drin ? FACTIONS[meFaction].color : COL.gold;

  if (def.anchor) {
    ctx.strokeStyle = col;
    ctx.globalAlpha = 0.45;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(x, y, FACTIONS[meFaction].growth.start * cam.z, 0, Math.PI * 2);
    ctx.stroke();
    if (FACTIONS[meFaction].growth.max > FACTIONS[meFaction].growth.start) {
      ctx.globalAlpha = 0.2;
      ctx.setLineDash([2, 6]);
      ctx.beginPath();
      ctx.arc(x, y, FACTIONS[meFaction].growth.max * cam.z, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  ctx.strokeStyle = col;
  ctx.lineWidth = 2;
  ctx.strokeRect(x - r, y - r, r * 2, r * 2);
  ctx.fillStyle = COL.text;
  ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
  ctx.textAlign = 'center';
  const ader = def.needs === 'goetterblut' ? 'Götterblut-Ader' : 'Fron-Ader';
  const txt = ohneAder
    ? def.name + ' — braucht eine freie ' + ader
    : gerodet
    ? def.name + ' — gerodeter Boden trägt nicht'
    : drin
      ? def.name
      : def.name + ' — außerhalb der Domäne: nur der Kommandant baut hier';
  ctx.fillText(txt, x, y - r - 8);
}

// ------------------------------------------------------------ HUD
function drawHud() {
  const p = world.players[ME];
  const regionen = gridReport(world, ME);
  let rows = '';
  for (const r of regionen) {
    const pct = r.demand === 0 ? 100 : Math.min(100, Math.round((r.supply / r.demand) * 100));
    rows += `<div class="reg ${r.throttled ? 'bad' : 'ok'}">
      <span class="rn">Domäne ${r.index + 1}</span><span class="rb">${r.supply}/${r.demand}</span>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <span class="rs">${r.throttled ? drossel(r) : 'stabil'}${schreinText(r)}</span></div>`;
  }
  if (!rows) rows = '<div class="reg"><span class="rn">keine Domäne</span></div>';

  document.getElementById('hud').innerHTML = `
    <div class="fac">${FACTIONS[meFaction].name}${aiMe ? ' · Zuschauen' : ''} · Gegner ${gegnerStil}</div>
    <div class="res">
      <b>Fron</b><span>${p.fron}</span>
      <b>Götterblut</b><span>${p.goetterblut}</span>
      <b>Einheiten</b><span>${world.entities.filter((e) => e.kind === 'unit' && e.player === ME).length}</span>
      ${kommandantZeile()}
      <b>Zeit</b><span>${(world.tick / 600).toFixed(1)} min${paused ? ' ⏸' : ''} ×${speed}</span>
    </div>
    ${flaecheHtml()}
    ${auswahlHtml()}
    <div class="regs">${rows}</div>
    ${world.over ? `<div class="over">${world.winner === ME ? 'Gewonnen' : 'Verloren'}</div>` : ''}
    ${world.over || zeigeAuswertung ? auswertungHtml() : ''}`;
}

function kommandantZeile() {
  const k = kommandantVon(world, ME);
  if (!k) return '';
  const pct = Math.round((100 * k.hp) / k.maxHp);
  const farbe = pct < 34 ? COL.bad : COL.text;
  const baut = k.baut ? ' · baut' : '';
  return `<b>${UNITS[k.type].name} <kbd>K</kbd></b><span style="color:${farbe}">${pct} %${baut}</span>`;
}

// ------------------------------------------------------------ Auswertung
// Die Leitfrage beim Selbstspielen: Wann fordert die Domaene eine
// Entscheidung, wann nervt sie? Reibung (gedrosselte und stillstehende
// Baustellen), Kampfort, Anker und Goetterblut -- je Seite gezaehlt.
function neueStats() {
  const seite = () => ({
    blut: -1,
    heim: 0,
    fremd: 0,
    frei: 0,
    ankerGebaut: 0,
    ankerVerloren: 0,
    gebaut: 0,
    gefallen: 0,
    gedrosselt: 0,
    still: 0,
  });
  return [seite(), seite()];
}

function zaehle() {
  for (let p = 0; p < 2; p++) {
    if (stats[p].blut < 0 && world.players[p].goetterblut > 0) stats[p].blut = world.tick;
  }
  for (const ev of world.events) {
    if (ev.t === 'shot') {
      const s = byId(world, ev.from);
      if (!s) continue;
      const z = stats[s.player];
      if (inDomain(world, s.player, s.x, s.y)) z.heim++;
      else if (inForeignDomain(world, s.player, s.x, s.y)) z.fremd++;
      else z.frei++;
    } else if (ev.t === 'built') {
      const b = byId(world, ev.id);
      if (b && BUILDINGS[b.type].anchor) stats[b.player].ankerGebaut++;
    } else if (ev.t === 'spawned') {
      const u = byId(world, ev.id);
      if (u) stats[u.player].gebaut++;
    } else if (ev.t === 'died') {
      if (ev.kind === 'unit') stats[ev.player].gefallen++;
      else if (BUILDINGS[ev.type].anchor) stats[ev.player].ankerVerloren++;
    }
  }
  // Reibung: ein Tick zaehlt, wenn irgendeine Baustelle gedrosselt ist bzw.
  // ganz ohne Gegenwart steht (meist: ausserhalb der Domaene gebaut).
  const gedrosselt = [false, false];
  const still = [false, false];
  for (const e of world.entities) {
    if (e.dead || e.kind !== 'building' || e.done) continue;
    if (e.powered === 0) still[e.player] = true;
    else if (e.powered < 1000) gedrosselt[e.player] = true;
  }
  for (let p = 0; p < 2; p++) {
    if (gedrosselt[p]) stats[p].gedrosselt++;
    if (still[p]) stats[p].still++;
  }
}

function auswertungHtml() {
  const min = (t) => (t < 0 ? '—' : (t / 600).toFixed(1).replace('.', ','));
  const sek = (t) => Math.round(t / 10) + ' s';
  const ort = (z) => {
    const n = z.heim + z.fremd + z.frei;
    if (!n) return '—';
    const pct = (x) => Math.round((100 * x) / n);
    return `${pct(z.heim)}·${pct(z.fremd)}·${pct(z.frei)}`;
  };
  const a = stats[ME];
  const b = stats[1 - ME];
  const zeile = (name, f) => `<b>${name}</b><span>${f(a)}</span><span>${f(b)}</span>`;
  return `<div class="eval">
    <div class="fac">Auswertung${world.over ? '' : ' (I)'}</div>
    <div class="evg">
      <b></b><span class="evh">du</span><span class="evh">Gegner</span>
      ${zeile('Götterblut ab', (s) => min(s.blut))}
      ${zeile('Schüsse % heim·fremd·frei', ort)}
      ${zeile('Anker +/−', (s) => s.ankerGebaut + '/' + s.ankerVerloren)}
      ${zeile('Einheiten +/−', (s) => s.gebaut + '/' + s.gefallen)}
      ${zeile('Bau gedrosselt', (s) => sek(s.gedrosselt))}
      ${zeile('Bau ohne Gegenwart', (s) => sek(s.still))}
    </div></div>`;
}

// ------------------------------------------------------------ Domänenfläche
// Die Kernfrage des Prototyps, sichtbar gemacht: Wie groß ist welche Domäne
// gerade, und wie hat sich das entwickelt? Nur Anzeige, ändert nichts.
const FLAECHE_RASTER = 200; // dm, also 20 m × 20 m = 0,04 ha je Zelle
let flaeche = { tick: -1, ha: [0, 0], verlauf: [[], []] };

function messeFlaeche() {
  if (flaeche.tick >= 0 && world.tick >= flaeche.tick && world.tick - flaeche.tick < 50) return;
  flaeche.tick = world.tick;
  const zellen = [0, 0];
  for (let y = FLAECHE_RASTER >> 1; y < MAP; y += FLAECHE_RASTER) {
    for (let x = FLAECHE_RASTER >> 1; x < MAP; x += FLAECHE_RASTER) {
      for (let p = 0; p < 2; p++) if (inDomain(world, p, x, y)) zellen[p]++;
    }
  }
  const zelleHa = (FLAECHE_RASTER * FLAECHE_RASTER) / 1e6; // dm² -> ha
  flaeche.ha = zellen.map((z) => Math.round(z * zelleHa));
  const n = Math.floor(world.tick / 300); // alle 30 s ein Punkt
  for (let p = 0; p < 2; p++) {
    flaeche.verlauf[p][n] = flaeche.ha[p];
  }
}

function flaecheHtml() {
  messeFlaeche();
  const v = flaeche.verlauf;
  const len = Math.max(v[0].length, 2);
  const top = Math.max(1, ...v[0].filter(Number.isFinite), ...v[1].filter(Number.isFinite));
  const linie = (arr) =>
    arr
      .map((h, i) => (Number.isFinite(h) ? `${((i / (len - 1)) * 240).toFixed(1)},${(36 - (h / top) * 34).toFixed(1)}` : ''))
      .filter(Boolean)
      .join(' ');
  const farbe = (p) => FACTIONS[world.players[p].faction].color;
  const gegner = 1 - ME;
  return `<div class="area">
      <div class="res">
        <b>Domäne</b><span style="color:${farbe(ME)}">${flaeche.ha[ME]} ha</span>
        <b>Gegner</b><span style="color:${farbe(gegner)}">${flaeche.ha[gegner]} ha</span>
      </div>
      <svg viewBox="0 0 240 38" preserveAspectRatio="none" class="spark">
        <polyline points="${linie(v[gegner])}" fill="none" stroke="${farbe(gegner)}" stroke-width="1.2" opacity=".6"/>
        <polyline points="${linie(v[ME])}" fill="none" stroke="${farbe(ME)}" stroke-width="1.6"/>
      </svg></div>`;
}

function auswahlHtml() {
  if (sel.length !== 1) return '';
  const e = byId(world, sel[0]);
  if (!e || e.kind !== 'building') return '';
  const def = BUILDINGS[e.type];
  const zustand = !e.done
    ? `Baustelle ${Math.min(100, Math.floor(e.progress / (def.buildTime * 10)))} %`
    : e.powered < 1000
      ? `gedrosselt ${Math.round(e.powered / 10)} %`
      : 'versorgt';
  const tasten = def.buildList
    ? def.buildList
        .map((u, i) => `<kbd>${'QWER'[i]}</kbd> ${UNITS[u].name}${UNITS[u].cost.goetterblut ? ` (${UNITS[u].cost.goetterblut} Götterblut)` : ''}`)
        .join(' · ')
    : '';
  const abriss = def.vital ? '' : ' · <kbd>Entf</kbd> abreißen';
  return `<div class="sel"><b>${def.name}</b> — ${zustand}${e.queue.length ? ` · ${e.queue.length} in Auftrag` : ''}
    <div class="keys">${tasten}${abriss}</div></div>`;
}

/** Schrein-Wirkung eines Netzes fuer die HUD-Zeile. */
function schreinText(r) {
  const teile = [];
  if (r.zorn) teile.push('Zorn +' + Math.round(r.zorn / 10) + ' %');
  if (r.wehr) teile.push('Wehr −' + Math.round(r.wehr / 10) + ' %');
  return teile.length ? ' · ' + teile.join(' · ') : '';
}

function drossel(r) {
  for (let i = 3; i >= 0; i--) if (r.satPrio[i] < 1000) return PRIO_NAMES[i] + ' gedrosselt';
  return 'stabil';
}

function drawMini() {
  mctx.fillStyle = '#0b0d08';
  mctx.fillRect(0, 0, mini.width, mini.height);
  const s = mini.width / MAP;
  mctx.fillStyle = COL.cleared;
  for (const c of world.cleared) {
    mctx.beginPath();
    mctx.arc(c.x * s, c.y * s, c.r * s, 0, Math.PI * 2);
    mctx.fill();
  }
  for (let p = 0; p < 2; p++) {
    mctx.fillStyle = FACTIONS[world.players[p].faction].color;
    mctx.globalAlpha = 0.18;
    for (const e of world.entities) {
      if (e.player !== p || e.kind !== 'building') continue;
      const r = anchorRadius(world, e);
      if (!r) continue;
      mctx.beginPath();
      mctx.arc(e.x * s, e.y * s, r * s, 0, Math.PI * 2);
      mctx.fill();
    }
    mctx.globalAlpha = 1;
    for (const e of world.entities) {
      if (e.player !== p) continue;
      const sz = e.kind === 'building' ? 3 : 2;
      mctx.fillRect(e.x * s - sz / 2, e.y * s - sz / 2, sz, sz);
    }
  }
  mctx.strokeStyle = '#4a5442';
  mctx.strokeRect(
    (cam.x - cv.clientWidth / 2 / cam.z) * s,
    (cam.y - cv.clientHeight / 2 / cam.z) * s,
    (cv.clientWidth / cam.z) * s,
    (cv.clientHeight / cam.z) * s
  );
}

// ------------------------------------------------------------ Start
// ------------------------------------------------------------ Startbildschirm
// Zahlen kommen aus den Daten, damit der Text nie veraltet.
const meter = (dm) => Math.round(dm / 10) + ' m';
function introHtml() {
  const gm = FACTIONS.mensch.growth;
  const gg = FACTIONS.gott.growth;
  const proMin = gg.perTick * 600;
  const bis = Math.round(((gg.max - gg.start) / gg.perTick / 600) * 10) / 10;
  const pz = (b) => Math.round(BUILDINGS[b].buff.zorn / 10) + ' %';
  const pw = (b) => Math.round(BUILDINGS[b].buff.wehr / 10) + ' %';
  return `<h1>Die drei Reiche</h1>
    <p class="frage">Fördern, aufbauen, ausbreiten — und Hauptgebäude oder Kommandant des Gegners zerstören.</p>
    <div class="cols">
      <div><h2 style="color:${FACTIONS.mensch.color}">Menschen</h2>
        <p>Viele günstige Einheiten: Bauern, Soldaten, Jäger, Söldner.
        Jeder Wachturm deckt ab Bauende <b>${meter(gm.start)}</b> ab — fest, sofort, überall gleich.
        Sägewerke roden den Boden; dort pflanzt der Gott keinen Hain.
        Schreine: Kriegsbanner +${pz('banner')} Schaden, Kapelle −${pw('kapelle')} Schaden.</p></div>
      <div><h2 style="color:${FACTIONS.gott.color}">Wald- und Wiesengott</h2>
        <p>Ein Hain beginnt bei <b>${meter(gg.start)}</b> und wächst um ${meter(proMin)} pro Minute,
        nach ${bis.toLocaleString('de')} Minuten auf <b>${meter(gg.max)}</b>.
        Wenige starke Einheiten: Dryaden, Wölfe, Waldgeister, Ents.
        Schreine: Dornenschrein +${pz('dornenschrein')} Schaden, Steinkreis −${pw('steinkreis')} Schaden.</p></div>
    </div>
    <p>Für beide gilt: Gegenwart fließt nur in der Domäne — Fabriken, Förderung und Schreine brauchen
    sie. Schreine wirken auf eigene Einheiten im selben Domänennetz. Götterblut liegt in der
    Kartenmitte; schwere Einheiten brauchen es.</p>
    <p>Jede Seite hat einen <b>Kommandanten</b> — ${UNITS[FACTIONS.mensch.kommandant].name} bzw.
    ${UNITS[FACTIONS.gott.kommandant].name}: extrem stark, und er baut, was in seiner Nähe steht,
    auch außerhalb der Domäne. <b>Fällt er, ist die Partie verloren.</b> Ob er hinten baut oder
    vorn kämpft, entscheidest du.</p>
    <p class="achten">Die Domäne ist das Werkzeug, nicht das Ziel: Wann fordert sie eine Entscheidung — und wann nervt sie?</p>
    <div class="stil">Gegner:
      ${Object.keys(STILE)
        .map((s) => `<label><input type="radio" name="stil" value="${s}"${s === gegnerStil ? ' checked' : ''}> ${STIL_NAMEN[s]}</label>`)
        .join('')}
    </div>
    <div class="go">
      <button id="introMensch">Als Menschen spielen</button>
      <button id="introGott">Als Gott spielen</button>
      <button id="introSchau">Zuschauen</button>
    </div>`;
}
const STIL_NAMEN = { sturm: 'Sturm — greift früh an', standard: 'Standard', burg: 'Burg — baut aus, greift spät an' };
function starte(f, zuschauen) {
  const gewaehlt = document.querySelector?.('#intro input[name="stil"]:checked');
  if (gewaehlt) gegnerStil = gewaehlt.value;
  document.getElementById('intro').style.display = 'none';
  paused = false;
  neu(f, zuschauen);
}
const intro = document.getElementById('intro');
intro.innerHTML = introHtml();
document.getElementById('introMensch').onclick = () => starte('mensch', false);
document.getElementById('introGott').onclick = () => starte('gott', false);
document.getElementById('introSchau').onclick = () => starte('mensch', true);
paused = true;

document.getElementById('asMensch').onclick = () => neu('mensch');
document.getElementById('asGott').onclick = () => neu('gott');
document.getElementById('zuschauen').onclick = () => neu(meFaction, true);
neu('mensch');
resize();
requestAnimationFrame(frame);
