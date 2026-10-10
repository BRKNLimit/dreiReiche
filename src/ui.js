// Darstellung und Eingabe. Aendert den Simulationszustand nie direkt,
// sondern nur ueber issue(). Wird von tools/bundle.mjs mit der Sim
// zusammengefuegt -- deshalb hier keine Imports.

const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
const mini = document.getElementById('mini');
const mctx = mini.getContext('2d');

let meFaction = 'mensch';
let world, ai, aiMe;
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

function neu(f) {
  meFaction = f;
  const gegner = f === 'mensch' ? 'gott' : 'mensch';
  world = createWorld({ seed: (Date.now() / 1000) | 0, factions: [f, gegner] });
  ai = createAI(1, world.seed);
  aiMe = null;
  sel = [];
  placing = null;
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
        if (e.player !== ME || e.kind !== 'building' || !e.done) continue;
        if (!BUILDINGS[e.type].buildList) continue;
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
  const i = '1234'.indexOf(e.key);
  if (i >= 0 && liste[i]) placing = liste[i];
  if (e.key === 'Escape') {
    placing = null;
    sel = [];
  }
  if (e.key === ' ') {
    paused = !paused;
    e.preventDefault();
  }
  if (e.key === '+') speed = Math.min(8, speed * 2);
  if (e.key === '-') speed = Math.max(0.5, speed / 2);
  if ((e.key === 'q' || e.key === 'w') && sel.length === 1) {
    const b = byId(world, sel[0]);
    if (b && b.kind === 'building' && b.done && BUILDINGS[b.type].buildList) {
      const l = BUILDINGS[b.type].buildList;
      const u = e.key === 'q' ? l[1] : l[2] || l[1];
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
    ? ['schmiede', 'saege', 'turm', 'kaserne']
    : ['quelle', 'moos', 'hain', 'dickicht'];
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
      stepAI(ai, world);
      step(world);
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
    ctx.globalAlpha = p === ME ? 0.65 : 0.4;
    ctx.strokeStyle = col;
    ctx.lineWidth = p === ME ? 1.5 : 1;
    ctx.stroke();
    ctx.restore();
  }
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
      const r = Math.max(2.5, def.radius * cam.z);
      ctx.fillStyle = col;
      ctx.beginPath();
      if (def.worker) ctx.arc(x, y, r * 0.8, 0, Math.PI * 2);
      else if (def.hp > 500) ctx.rect(x - r, y - r * 0.9, r * 2, r * 1.8);
      else {
        ctx.moveTo(x, y - r);
        ctx.lineTo(x + r, y + r);
        ctx.lineTo(x - r, y + r);
        ctx.closePath();
      }
      ctx.fill();
      if (e.hp < e.maxHp) {
        ctx.fillStyle = '#000';
        ctx.fillRect(x - r, y - r - 4, r * 2, 2);
        ctx.fillStyle = '#8fc46a';
        ctx.fillRect(x - r, y - r - 4, (r * 2 * e.hp) / e.maxHp, 2);
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
  const x = w2sx(hover.x);
  const y = w2sy(hover.y);
  const r = Math.max(4, def.radius * cam.z);
  const drin = inDomain(world, ME, hover.x, hover.y);
  const gerodet = def.needsGrowth && isCleared(world, hover.x, hover.y);
  const col = gerodet ? COL.bad : drin ? FACTIONS[meFaction].color : COL.gold;

  if (def.anchor) {
    ctx.strokeStyle = col;
    ctx.globalAlpha = 0.45;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(x, y, FACTIONS[meFaction].growth.start * cam.z, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  ctx.strokeStyle = col;
  ctx.lineWidth = 2;
  ctx.strokeRect(x - r, y - r, r * 2, r * 2);
  ctx.fillStyle = COL.text;
  ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
  ctx.textAlign = 'center';
  const txt = gerodet
    ? def.name + ' — gerodeter Boden trägt nicht'
    : drin
      ? def.name
      : def.name + ' — außerhalb der Domäne';
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
      <span class="rs">${r.throttled ? drossel(r) : 'stabil'}</span></div>`;
  }
  if (!rows) rows = '<div class="reg"><span class="rn">keine Domäne</span></div>';

  document.getElementById('hud').innerHTML = `
    <div class="fac">${FACTIONS[meFaction].name}</div>
    <div class="res">
      <b>Fron</b><span>${p.fron}</span>
      <b>Götterblut</b><span>${p.goetterblut}</span>
      <b>Einheiten</b><span>${world.entities.filter((e) => e.kind === 'unit' && e.player === ME).length}</span>
      <b>Zeit</b><span>${(world.tick / 600).toFixed(1)} min${paused ? ' ⏸' : ''} ×${speed}</span>
    </div>
    <div class="regs">${rows}</div>
    ${world.over ? `<div class="over">${world.winner === ME ? 'Gewonnen' : 'Verloren'}</div>` : ''}`;
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
document.getElementById('asMensch').onclick = () => neu('mensch');
document.getElementById('asGott').onclick = () => neu('gott');
neu('mensch');
resize();
requestAnimationFrame(frame);
