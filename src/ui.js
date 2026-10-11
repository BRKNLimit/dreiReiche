// Darstellung und Eingabe. Gelaende-Zeichnung liegt in src/gelaende2d.js
// (siehe GEMINI.md). Aendert den Simulationszustand nie direkt,
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
let gegnerStufe = 'mittel'; // Schwierigkeit der Gegner-KI, im Startbildschirm waehlbar
let karteSchluessel = 'klassisch'; // Karte, im Startbildschirm waehlbar
const ME = 0;
let skillsOffen = false; // T: Skillbaum
let skillSig = ''; // zuletzt gezeichneter Stand des Skillbaums
let zielen = null; // Griff gewaehlt: naechster Klick ist das Ziel (Faehigkeit)
const wirkungen = []; // Faehigkeits-Einsaetze, eine Sekunde lang sichtbar
let karteTyp = null; // Gebaeude unter der Maus in der Bauleiste
let nebel = neuerNebel(true, ME); // Nebel des Krieges; beim Zuschauen aus
let nebelFrame = 0; // Zaehler, damit das Nebelbild je Frame nur einmal entsteht
const verborgen = (e) => imNebel(nebel, e, ME);
let karteHtml = ''; // zuletzt gezeigte Info-Karte
let selPlan = null; // gewaehlter eigener Bauplan (kein Gebaeude, daher nicht in sel)
let gruppen = {}; // Steuergruppen: Ziffer -> Ids
let aufnahme = null; // laufende Aufnahme (src/aufnahme.js)
let wiederholung = null; // abgespielte Wiederholung, sonst null
let wdhZeiger = 0;
let verlauf = neuerVerlauf(); // fuer den Siegbildschirm
let endeGezeigt = false;
const fx = neueEffekte(); // Geschosse, Treffer, Klaenge (src/effekte.js)
// Was der Spieler sehen darf -- Eigenes immer, sonst was im Nebel sichtbar ist.
const sichtbarFx = (e) => !nebel.an || e.player === ME || sieht(nebel, e.x, e.y);
/** Hoerer in der Bildmitte; man hoert etwas weiter, als man sieht. */
const hoerer2d = () => ({ x: cam.x, y: cam.y, weite: (Math.max(cv.clientWidth, cv.clientHeight) / cam.z) * 0.9 });
const imBild2d = (x, y) => {
  const sx = w2sx(x);
  const sy = w2sy(y);
  return sx >= 0 && sy >= 0 && sx <= cv.clientWidth && sy <= cv.clientHeight;
};
// Ton geht erst nach einer Eingabe an (Browser-Regel)
addEventListener('pointerdown', () => tonAn(fx));
addEventListener('keydown', () => tonAn(fx));

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

function neu(f, zuschauen = false, wdh = null) {
  // Wiederholung: dieselben Startwerte wie bei der Aufnahme
  if (wdh) {
    karteSchluessel = wdh.karte;
    gegnerStil = wdh.stil;
    gegnerStufe = wdh.stufe;
  }
  meFaction = f;
  const gegner = f === 'mensch' ? 'gott' : 'mensch';
  karteWaehlen(karteSchluessel);
  world = createWorld({ seed: wdh ? wdh.seed : (Date.now() / 1000) | 0, factions: [f, gegner], karte: karteSchluessel });
  ai = createAI(1, world.seed, gegnerStil, gegnerStufe);
  // Zuschauen: dieselbe KI spielt auch die eigene Seite.
  aiMe = zuschauen ? createAI(0, world.seed + 1) : null;
  nebel = neuerNebel(!zuschauen && !wdh, ME);
  wiederholung = wdh;
  wdhZeiger = 0;
  wiederholungsHinweis = '';
  aufnahme = wdh ? null : neueAufnahme({ seed: world.seed, factions: [f, gegner], karte: karteSchluessel, stil: gegnerStil, stufe: gegnerStufe, zuschauen });
  verlauf = neuerVerlauf();
  endeGezeigt = false;
  angriff = false;
  zeigeAuswertung = false;
  stats = neueStats();
  sel = [];
  placing = null;
  skillsOffen = false;
  skillSig = '';
  selPlan = null;
  leistenSig = '';
  gruppen = {};
  effekteLeeren(fx);
  zielen = null;
  wirkungen.length = 0;
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
    zielen = null;
    if (sel.length) befehl(s2wx(mx) | 0, s2wy(my) | 0, e.shiftKey);
    return;
  }
  if (e.button === 1) {
    drag = { pan: true, sx: mx, sy: my, cx: cam.x, cy: cam.y };
    return;
  }
  if (zielen) {
    issue(world, { type: 'faehigkeit', player: ME, faehigkeit: zielen, x: s2wx(mx) | 0, y: s2wy(my) | 0 });
    zielen = null;
    return;
  }
  if (placing) {
    // Ausgewaehlte Erbauer bekommen den Auftrag und gehen hin.
    // Shift: in die Reihe der Erbauer, und weiter setzen
    issue(world, { type: 'build', player: ME, building: placing, x: s2wx(mx) | 0, y: s2wy(my) | 0, ids: erbauer(), anhaengen: e.shiftKey });
    if (!e.shiftKey) placing = null;
    return;
  }
  if (angriff && sel.length) {
    issue(world, { type: 'attack', player: ME, ids: sel.slice(), x: s2wx(mx) | 0, y: s2wy(my) | 0, anhaengen: e.shiftKey });
    if (!e.shiftKey) angriff = false;
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
    selPlan = null;
    if (!box && picked.length === 0) {
      for (const e of world.entities) {
        if (e.player !== ME || e.kind !== 'building') continue;
        if (Math.hypot(w2sx(e.x) - x1, w2sy(e.y) - y1) < BUILDINGS[e.type].radius * cam.z + 12) {
          sel = [e.id];
          drag = null;
          return;
        }
      }
      for (const q of world.plaene) {
        if (q.player !== ME) continue;
        if (Math.hypot(w2sx(q.x) - x1, w2sy(q.y) - y1) < BUILDINGS[q.type].radius * cam.z + 12) {
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
  if (!world) return;
  const g = steuergruppe(e, gruppen, sel, world, ME);
  if (g) {
    sel = g.sel;
    selPlan = null;
    const m = g.springe ? auswahlMitte(world, sel) : null;
    if (m) {
      cam.x = m.x;
      cam.y = m.y;
    }
    return;
  }
  if (e.ctrlKey || e.metaKey) return;
  const liste = bauListe();
  const i = '1234567890'.indexOf(e.key);
  if (i >= 0 && liste[i] && erbauer().length && !gesperrt(world, ME, liste[i])) placing = liste[i];
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
    wirkeFaehigkeit(FACTIONS[meFaction].faehigkeiten[fi]);
    return;
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
  if (e.key === 'm') stummSchalten(fx);
  if (e.key === '.') naechsterUntaetiger();
  if (e.key === 'F2') {
    e.preventDefault();
    sel = heerAuswahl(world, ME);
    selPlan = null;
  }
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

/** Faehigkeit des Kommandanten ausloesen: ein Griff braucht ein Ziel, alles andere wirkt sofort. */
function wirkeFaehigkeit(id) {
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
  if (b && world) wirkeFaehigkeit(b.dataset.faeh);
};
let faehHtml = '';

/** Knoepfe zeigen, solange der eigene Kommandant gewaehlt ist. */
function faehPanel() {
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

/** Ausgewaehlte eigene Fabriken, die Einheiten ausbilden koennen. */
function fabriken() {
  return sel
    .map((id) => byId(world, id))
    .filter((e) => e && e.kind === 'building' && e.player === ME && e.done && BUILDINGS[e.type]?.buildList);
}

/** Leisten neu zeichnen, sobald sich Auswahl, Skills oder Warteschlange aendern. */
function leisten() {
  const fabs = fabriken();
  const qSig = fabs.map((f) => f.queue.join()).join(';');
  const sig = sel.join() + '|' + selPlan + '|' + skillSignatur(world, ME) + '|' + qSig;
  if (sig === leistenSig) return;
  leistenSig = sig;
  renderBar();
}

/** Skillbaum und Sperren neu zeichnen, sobald sich daran etwas aendert. */
function skillPanel() {
  const el = document.getElementById('skills');
  el.hidden = !skillsOffen;
  const sig = skillSignatur(world, ME) + (skillsOffen ? '|offen' : '');
  if (sig === skillSig) return;
  skillSig = sig;
  renderBar();
  if (skillsOffen) el.innerHTML = skillBaumHtml(world, ME);
}

mini.addEventListener('contextmenu', (e) => e.preventDefault());
mini.addEventListener('mousedown', (e) => {
  const x = ((e.offsetX / mini.clientWidth) * MAP) | 0;
  const y = ((e.offsetY / mini.clientHeight) * MAP) | 0;
  // Rechtsklick: die Auswahl dorthin schicken (mit A scharf: Angriffsbewegung)
  if (e.button === 2) {
    if (angriff && sel.length) {
      issue(world, { type: 'attack', player: ME, ids: sel.slice(), x, y });
      angriff = false;
    } else if (sel.length) befehl(x, y, e.shiftKey);
    return;
  }
  cam.x = x;
  cam.y = y;
});

// Untaetige Arbeiter: Knopf mit Anzahl, Taste . waehlt reihum den naechsten.
let untaetigSig = '';
let untaetigZeiger = 0;
function untaetigAnzeigen() {
  const n = untaetigeArbeiter(world, ME).length;
  const sig = n + '|' + meFaction;
  if (sig === untaetigSig) return;
  untaetigSig = sig;
  const b = document.getElementById('untaetig');
  b.hidden = n === 0;
  b.innerHTML = n ? untaetigHtml(world, ME, n) : '';
}
function naechsterUntaetiger() {
  const liste = untaetigeArbeiter(world, ME);
  if (!liste.length) return;
  const u = liste[untaetigZeiger++ % liste.length];
  sel = [u.id];
  selPlan = null;
  cam.x = u.x;
  cam.y = u.y;
}
document.getElementById('untaetig').onclick = () => naechsterUntaetiger();


/** Ausgewaehlte eigene Einheiten, die bauen koennen. */
function erbauer() {
  return sel.filter((id) => {
    const e = byId(world, id);
    return e && e.kind === 'unit' && UNITS[e.type].build;
  });
}

/**
 * Rechtsklick: auf eine eigene Baustelle -- Erbauer helfen mit, die anderen
 * gehen hin. Sonst: alle bewegen sich dorthin.
 */
function befehl(x, y, anhaengen = false) {
  const site =
    world.entities.find(
      (b) =>
        b.kind === 'building' &&
        b.player === ME &&
        !b.dead &&
        (!b.done || b.hp < b.maxHp) &&
        (b.x - x) ** 2 + (b.y - y) ** 2 <= (BUILDINGS[b.type].radius + 60) ** 2
    ) || world.plaene.find((q) => q.player === ME && (q.x - x) ** 2 + (q.y - y) ** 2 <= (BUILDINGS[q.type].radius + 60) ** 2);
  const bauer = site ? erbauer() : [];
  const rest = sel.filter((id) => !bauer.includes(id));
  if (bauer.length) issue(world, { type: 'bauen', player: ME, ids: bauer, id: site.id, anhaengen });
  if (rest.length) issue(world, { type: 'move', player: ME, ids: rest, x, y, anhaengen });
  // Gewaehlte Fabriken: Sammelpunkt fuer neue Einheiten
  const fabs = gewaehlteFabriken(world, sel, ME);
  if (fabs.length) issue(world, { type: 'sammelpunkt', player: ME, ids: fabs, x, y });
}

function bauListe() {
  return meFaction === 'mensch'
    ? ['schmiede', 'saege', 'grenzstein', 'kaserne', 'schacht', 'banner', 'kapelle', 'wachturm', 'skriptorium', 'spaehposten']
    : ['quelle', 'moos', 'hain', 'dickicht', 'blutwurz', 'dornenschrein', 'steinkreis', 'waechterbaum', 'eiche'];
}

function renderBar() {
  const bar = document.getElementById('builds');
  const fabs = fabriken();
  if (erbauer().length) {
    bar.innerHTML = bauleisteHtml(world, ME, bauListe());
  } else if (fabs.length) {
    bar.innerHTML = ausbildungsleisteHtml(world, ME, fabs);
  } else {
    bar.innerHTML = '';
  }
  document.getElementById('gruppen').innerHTML = gruppenHtml(world, sel);
  if (!erbauer().length && !fabs.length) karteTyp = placing = null;
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
        const frei = fabs.filter((f) => f.queue.length < 8);
        const ziel = frei.reduce((best, f) => (!best || f.queue.length < best.queue.length ? f : best), null);
        if (ziel) issue(world, { type: 'produce', player: ME, id: ziel.id, unit: u });
      }
    };
    b.onmouseenter = () => (karteTyp = b.dataset.produce);
    b.onmouseleave = () => (karteTyp = null);
  }
}

// ------------------------------------------------------------ Schleife
function frame(now) {
  const dt = Math.max(0, Math.min(250, now - last)); // nie rueckwaerts, nie mehr als eine Viertelsekunde
  last = now;
  if (!paused && !world.over) {
    acc += dt * speed;
    let guard = 0;
    while (acc >= TICK_MS && guard++ < 12) {
      if (wiederholung) wdhZeiger = abspielen(wiederholung, world, wdhZeiger);
      else if (aufnahme) aufnehmen(aufnahme, world);
      if (aiMe) stepAI(aiMe, world);
      stepAI(ai, world);
      step(world);
      verlaufFortschreiben(verlauf, world);
      if (wiederholung && world.tick >= wiederholung.ende && !world.over) paused = true;
      for (const ev of world.events) if (ev.t === 'faehigkeit') wirkungen.push({ ...ev, bis: world.tick + 12 });
      effekteAusEreignissen(fx, world, ME, sichtbarFx, hoerer2d(), imBild2d);
      zaehle();
      acc -= TICK_MS;
      sel = sel.filter((id) => byId(world, id));
    }
  }
  effekteFortschreiben(fx, paused ? 0 : (dt * speed) / 1000, world, hoerer2d());
  if (world.over && !endeGezeigt) zeigeEnde();
  draw();
  requestAnimationFrame(frame);
}

// ------------------------------------------------------------ Zeichnen
function draw() {
  const W = cv.clientWidth;
  const H = cv.clientHeight;
  ctx.fillStyle = COL.bg;
  ctx.fillRect(0, 0, W, H);
  nebelAktualisieren(nebel, world);
  nebelFrame++;

  // Beben: die ganze Karte zittert kurz
  const [bx, by] = bebenVersatz(fx);
  ctx.save();
  ctx.translate(bx, by);
  drawGrid(W, H);
  drawCleared();
  drawDomains();
  drawHindernisse();
  drawDeposits();
  drawSchreine();
  drawEntities();
  drawPlaene();
  drawWirkungen();
  drawNebel();
  ctx.restore();
  drawSelection();
  if (placing) drawGhost();
  drawHud();
  skillPanel();
  leisten();
  untaetigAnzeigen();
  faehPanel();
  infoKarte();
  drawMini();
}

/** Nebel ueber die Karte legen: unbekannt fast schwarz, erkundet gedaempft, weich hochskaliert. */
function nebelMalen(ziel, x, y, groesse) {
  if (!nebel.an) return;
  const bild = nebelBild(nebel, nebelFrame);
  if (!bild) return;
  ziel.imageSmoothingEnabled = true;
  if ('imageSmoothingQuality' in ziel) ziel.imageSmoothingQuality = 'high';
  ziel.drawImage(bild, x, y, groesse, groesse);
}

function drawNebel() {
  nebelMalen(ctx, w2sx(0), w2sy(0), MAP * cam.z);
}

/** Info-Karte: Gebaeude oder Einheit unter der Maus in der Leiste, sonst das, was gerade gesetzt wird. */
function infoKarte() {
  const typ = karteTyp || placing;
  const html = typ ? (UNITS[typ] ? einheitKarte(world, ME, typ) : gebaeudeKarte(world, ME, typ)) : '';
  if (html === karteHtml) return;
  karteHtml = html;
  const el = document.getElementById('karte');
  el.innerHTML = html;
  el.hidden = !html;
}

/** Eigene Bauplaene: gestrichelte Umrisse; Erbauer auf dem Weg dorthin mit gepunkteter Linie. */
function drawPlaene() {
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = FACTIONS[meFaction].color;
  for (const q of world.plaene) {
    if (q.player !== ME) continue;
    const r = Math.max(4, BUILDINGS[q.type].radius * cam.z);
    ctx.globalAlpha = q.id === selPlan ? 1 : 0.6;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(w2sx(q.x) - r, w2sy(q.y) - r, r * 2, r * 2);
  }
  ctx.globalAlpha = 0.5;
  ctx.setLineDash([2, 5]);
  ctx.beginPath();
  for (const u of world.entities) {
    if (u.player !== ME || u.kind !== 'unit' || !u.auftrag) continue;
    const q = planVon(world, u.auftrag);
    if (!q) continue;
    ctx.moveTo(w2sx(u.x), w2sy(u.y));
    ctx.lineTo(w2sx(q.x), w2sy(q.y));
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}

/** Wirkungskreise fertiger Schreine, gestrichelt in der Farbe ihres Volkes. */
function drawSchreine() {
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 6]);
  for (const e of world.entities) {
    if (e.dead || e.kind !== 'building' || !e.done || verborgen(e)) continue;
    const buff = BUILDINGS[e.type].buff;
    if (!buff) continue;
    ctx.strokeStyle = FACTIONS[world.players[e.player].faction].color;
    ctx.globalAlpha = e.powered ? 0.45 : 0.15;
    ctx.beginPath();
    ctx.arc(w2sx(e.x), w2sy(e.y), buff.radius * cam.z, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}

/** Faehigkeiten: Einsatzringe, gerufene und festgehaltene Einheiten. */
function drawWirkungen() {
  while (wirkungen.length && wirkungen[0].bis < world.tick) wirkungen.shift();
  ctx.lineWidth = 2;
  for (const w of wirkungen) {
    const t = 1 - (w.bis - world.tick) / 12;
    ctx.strokeStyle = faehigkeitFarbe(w.art);
    ctx.globalAlpha = 1 - t;
    ctx.beginPath();
    ctx.arc(w2sx(w.x), w2sy(w.y), w.r * cam.z * (0.4 + 0.6 * t), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.lineWidth = 1.5;
  for (const e of world.entities) {
    if (e.dead || e.kind !== 'unit' || verborgen(e)) continue;
    const art = markierung(e);
    if (!art) continue;
    ctx.strokeStyle = faehigkeitFarbe(art);
    ctx.beginPath();
    ctx.arc(w2sx(e.x), w2sy(e.y), Math.max(4, UNITS[e.type].radius * cam.z) + 3, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/** Welche Faehigkeit wirkt gerade auf einer Einheit (fuer ihre Markierung)? */
function markierung(e) {
  const t = world.tick;
  return e.gebundenBis > t ? 'griff' : e.wehrBis > t ? 'wehr' : e.rufBis > t ? 'ruf' : e.tempoBis > t ? 'tempo' : e.beschworen ? 'rufen' : null;
}



/** Die Domäne ist die wichtigste Linie im Spiel -- also die auffälligste. */
function drawDomains() {
  for (let p = 0; p < 2; p++) {
    const col = FACTIONS[world.players[p].faction].color;
    const anker = world.entities.filter(
      (e) => !e.dead && e.player === p && e.kind === 'building' && anchorRadius(world, e) > 0 &&
        (p === ME || !nebel.an || nebel.bekannt.has(e.id))
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
    ctx.globalAlpha = aderBesetzt(nebel, world, d, ME) ? 0.3 : 0.85;
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
  // Gegnerische Gebaeude im Nebel: dort, wo man sie zuletzt gesehen hat.
  ctx.globalAlpha = 0.4;
  for (const b of nebel.bekannt.values()) {
    if (nebel.kunde.jetzt.has(b.id)) continue;
    const r = Math.max(4, BUILDINGS[b.type].radius * cam.z);
    ctx.strokeStyle = FACTIONS[world.players[b.player].faction].color;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(w2sx(b.x) - r, w2sy(b.y) - r, r * 2, r * 2);
  }
  ctx.globalAlpha = 1;
  for (const e of world.entities) {
    if (verborgen(e)) continue;
    const col = FACTIONS[world.players[e.player].faction].color;
    const x = w2sx(e.x);
    const y = w2sy(e.y);
    if (x < -60 || y < -60 || x > cv.clientWidth + 60 || y > cv.clientHeight + 60) continue;

    if (e.kind === 'building') {
      const def = BUILDINGS[e.type];
      const r = Math.max(4, def.radius * cam.z);
      // Figur aus src/figuren2d.js (Gemini), sonst ein Quadrat
      if (!zeichneGebaeude2d(ctx, e, def, x, y, r, col, cam.z, performance.now())) {
        ctx.fillStyle = e.done ? '#1d2118' : '#171a13';
        ctx.strokeStyle = col;
        ctx.lineWidth = def.vital ? 2.5 : 1.5;
        ctx.beginPath();
        ctx.rect(x - r, y - r, r * 2, r * 2);
        ctx.fill();
        if (!e.done) ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

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
      if (def.build) {
        // Baulinie zur Baustelle, an der er gerade baut
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
      // Figur aus src/figuren2d.js (Gemini), sonst die einfache Form
      if (!zeichneEinheit2d(ctx, e, def, x, y, r, col, cam.z, performance.now())) {
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
      }
      // Getroffen: kurz weiss aufblitzen
      const bl = blitzVon(fx, e.id);
      if (bl) {
        ctx.globalAlpha = bl * 0.85;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, r + 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
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

  // Geschosse, Hiebe, Funken, Staub (src/effekte.js); Hoehe hebt auf dem Schirm an
  zeichneEffekte(fx, ctx, (x, y, h) => [w2sx(x), w2sy(y) - h * cam.z], cam.z, true, (id) => {
    const e = byId(world, id);
    return e ? [e.x, e.y] : null;
  });
}

function drawSelection() {
  // Wegpunkte gewaehlter Einheiten: Linie von Ziel zu Ziel
  ctx.strokeStyle = '#e8dcc0';
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.6;
  ctx.setLineDash([2, 4]);
  for (const id of sel) {
    const u = byId(world, id);
    if (!u || u.kind !== 'unit' || !u.wege.length) continue;
    ctx.beginPath();
    ctx.moveTo(w2sx(u.tx), w2sy(u.ty));
    for (const [x, y] of u.wege) ctx.lineTo(w2sx(x), w2sy(y));
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  // Sammelpunkte gewaehlter Fabriken: gestrichelte Linie und Fahne
  ctx.strokeStyle = FACTIONS[meFaction].color;
  ctx.fillStyle = FACTIONS[meFaction].color;
  ctx.lineWidth = 1.5;
  for (const id of gewaehlteFabriken(world, sel, ME)) {
    const b = byId(world, id);
    if (b.sammelX < 0) continue;
    const sx = w2sx(b.sammelX);
    const sy = w2sy(b.sammelY);
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(w2sx(b.x), w2sy(b.y));
    ctx.lineTo(sx, sy);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx, sy - 16);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sx, sy - 16);
    ctx.lineTo(sx + 10, sy - 12);
    ctx.lineTo(sx, sy - 8);
    ctx.fill();
  }
  if (zielen) {
    // Griff scharf: Wirkungskreis am Mauszeiger, rot ausser Reichweite.
    const f = FAEHIGKEITEN[zielen];
    const k = kommandantVon(world, ME);
    const drin = k && (hover.x - k.x) ** 2 + (hover.y - k.y) ** 2 <= f.reichweite ** 2;
    ctx.strokeStyle = drin ? '#9a7a4a' : COL.bad;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(w2sx(hover.x), w2sy(hover.y), f.radius * cam.z, 0, Math.PI * 2);
    ctx.stroke();
    if (k) {
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(w2sx(k.x), w2sy(k.y), f.reichweite * cam.z, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
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
    // Einzeln gewaehlte Fernkaempfer und Tuerme: Reichweite gestrichelt
    if (sel.length === 1 && def.kampf === 'fern') {
      ctx.setLineDash([3, 5]);
      ctx.beginPath();
      ctx.arc(w2sx(e.x), w2sy(e.y), (def.weapon.range + def.radius) * cam.z, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
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
    if (dep && !aderBesetzt(nebel, world, dep, ME)) {
      gx = dep.x;
      gy = dep.y;
    } else ohneAder = true;
  }
  const x = w2sx(gx);
  const y = w2sy(gy);
  const r = Math.max(4, def.radius * cam.z);
  const drin = inDomain(world, ME, gx, gy);
  const gerodet = def.needsGrowth && isCleared(world, gx, gy);
  const fels = aufHindernis(world, gx, gy, def.radius);
  const col = gerodet || ohneAder || fels ? COL.bad : drin ? FACTIONS[meFaction].color : COL.gold;

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
    : fels
    ? def.name + ' — auf Fels und Wasser wird nicht gebaut'
    : gerodet
    ? def.name + ' — gerodeter Boden trägt nicht'
    : def.name +
      (drin || !def.gegenwartIn ? '' : ' — außerhalb der Domäne: ohne Gegenwart') +
      (erbauer().length ? '' : ' — keine Erbauer gewählt: die Baustelle wartet');
  ctx.fillText(txt, x, y - r - 8);
}

// ------------------------------------------------------------ HUD
function drawHud() {
  // Wenig Text: Kommandant und Zeit; Rest nur bei Bedarf (Auswahl, Warnungen, Auswertung).
  document.getElementById('ressourcen').innerHTML = ressourcenHtml(world, ME);
  document.getElementById('hud').innerHTML = `
    <div class="res">
      ${kommandantZeile()}
      <b>Zeit</b><span>${(world.tick / 600).toFixed(1)} min${paused ? ' ⏸' : ''}${speed !== 1 ? ' ×' + speed : ''}${wiederholung ? ' · Wiederholung' : aiMe ? ' · Zuschauen' : ''}</span>
    </div>
    ${warnungenHtml(world, ME)}${wiederholungsHinweis ? `<div class="warn"><span>${wiederholungsHinweis}</span></div>` : ''}
    ${auswahlHtml()}
    ${world.over ? `<div class="over">${world.winner === ME ? 'Gewonnen' : 'Verloren'}</div>` : ''}
    ${world.over || zeigeAuswertung ? flaecheHtml() + auswertungHtml() : ''}`;
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
  if (selPlan) {
    const q = planVon(world, selPlan);
    if (q) return planHtml(world, q);
    selPlan = null;
  }
  if (sel.length !== 1) return '';
  const e = byId(world, sel[0]);
  if (!e) return '';
  if (e.kind === 'unit') return `<div class="sel">${auswahlKopf(world, e)}${einheitKarte(world, ME, e.type)}</div>`;
  const def = BUILDINGS[e.type];
  const zustand = !e.done
    ? baustelleText(world, e)
    : e.powered < 1000
      ? `gedrosselt ${Math.round(e.powered / 10)} %`
      : 'versorgt';
  const tasten = ausbildungHtml(world, ME, e.type);
  const reparatur = reparaturText(world, e);
  const abriss = def.vital ? '' : '<kbd>Entf</kbd> abreißen';
  return `<div class="sel">${auswahlKopf(world, e)} · ${zustand}${reparatur}${e.queue.length ? ` · ${e.queue.length} in Auftrag` : ''}
    ${tasten}<div class="keys">${abriss}</div></div>`;
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
  for (const h of world.hindernisse) {
    mctx.fillStyle = h.art === 'see' ? '#2c5670' : '#4c4e42';
    mctx.beginPath();
    mctx.arc(h.x * s, h.y * s, h.r * s, 0, Math.PI * 2);
    mctx.fill();
  }
  for (let p = 0; p < 2; p++) {
    mctx.fillStyle = FACTIONS[world.players[p].faction].color;
    mctx.globalAlpha = 0.18;
    for (const e of world.entities) {
      if (e.player !== p || e.kind !== 'building') continue;
      if (p !== ME && nebel.an && !nebel.bekannt.has(e.id)) continue;
      const r = anchorRadius(world, e);
      if (!r) continue;
      mctx.beginPath();
      mctx.arc(e.x * s, e.y * s, r * s, 0, Math.PI * 2);
      mctx.fill();
    }
    mctx.globalAlpha = 1;
    for (const e of world.entities) {
      if (e.player !== p || verborgen(e)) continue;
      const sz = e.kind === 'building' ? 3 : 2;
      mctx.fillRect(e.x * s - sz / 2, e.y * s - sz / 2, sz, sz);
    }
  }
  nebelMalen(mctx, 0, 0, mini.width);
  zeichnePings(fx, mctx, mini.width / MAP);
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
        Jeder Grenzstein deckt ab Bauende <b>${meter(gm.start)}</b> ab — fest, sofort, überall gleich.
        Sägewerke roden den Boden; dort pflanzt der Gott keinen Hain.
        Schreine: Kriegsbanner +${pz('banner')} Schaden, Kapelle −${pw('kapelle')} Schaden.</p></div>
      <div><h2 style="color:${FACTIONS.gott.color}">Wald- und Wiesengott</h2>
        <p>Ein Hain beginnt bei <b>${meter(gg.start)}</b> und wächst um ${meter(proMin)} pro Minute,
        nach ${bis.toLocaleString('de')} Minuten auf <b>${meter(gg.max)}</b>.
        Wenige starke Einheiten: Dryaden, Wölfe, Waldgeister, Ents.
        Schreine: Dornenschrein +${pz('dornenschrein')} Schaden, Steinkreis −${pw('steinkreis')} Schaden.</p></div>
    </div>
    <p>Für beide gilt: Ein gesetztes Gebäude ist erst ein <b>Bauplan</b> — ohne Kosten, ohne Sicht.
    Gebaut und bezahlt wird, sobald ein <b>Erbauer</b> (Arbeiter oder Kommandant) daneben steht; wer
    weggeht, baut nicht weiter. Mit <kbd>Shift</kbd> reiht man mehrere Pläne hintereinander. Gegenwart fließt nur in der Domäne —
    Fabriken, Förderung und Schreine brauchen sie. Schreine wirken auf eigene Einheiten in ihrem Umkreis (${meter(BUILDINGS.banner.buff.radius)}), solange die in der eigenen Domäne stehen. Götterblut liegt in der
    Kartenmitte; schwere Einheiten brauchen es.</p>
    <p>Jede Seite hat einen <b>Kommandanten</b> — ${UNITS[FACTIONS.mensch.kommandant].name} bzw.
    ${UNITS[FACTIONS.gott.kommandant].name}: extrem stark, und er baut mit voller Kraft, wo
    immer er steht. <b>Fällt er, ist die Partie verloren.</b> Ob er hinten baut oder
    vorn kämpft, entscheidest du.</p>
    <p>Jede Einheit kostet laufend <b>Unterhalt</b> in Fron — große Heere fressen die Wirtschaft.
    Mit der Zeit kommen <b>Skillpunkte</b> (<kbd>T</kbd>): Sie schalten Fernkämpfer, schwere Einheiten,
    Schreine, Verbesserungen und drei Fähigkeiten des Kommandanten frei — Kommandant wählen, dann
    <kbd>Q</kbd>–<kbd>E</kbd> oder die Knöpfe. Wer lange lebt,
    sammelt ein wenig Erfahrung.</p>
    <p class="achten">Die Domäne ist das Werkzeug, nicht das Ziel: Wann fordert sie eine Entscheidung — und wann nervt sie?</p>
    <div class="stil">Gegner:
      ${Object.keys(STILE)
        .map((s) => `<label><input type="radio" name="stil" value="${s}"${s === gegnerStil ? ' checked' : ''}> ${STIL_NAMEN[s]}</label>`)
        .join('')}
    </div>
    <div class="stil">Schwierigkeit:
      ${Object.keys(STUFEN)
        .map((s) => `<label><input type="radio" name="stufe" value="${s}"${s === gegnerStufe ? ' checked' : ''}> ${STUFEN_NAMEN[s]}</label>`)
        .join('')}
    </div>
    <div class="stil">Karte:
      ${Object.keys(KARTEN)
        .map((k) => `<label><input type="radio" name="karte" value="${k}"${k === karteSchluessel ? ' checked' : ''}> ${KARTEN[k].name}</label>`)
        .join('')}
    </div>
${wiederholungWahlHtml()}
    <div class="go">
      <button id="introMensch">Als Menschen spielen</button>
      <button id="introGott">Als Gott spielen</button>
      <button id="introSchau">Zuschauen</button>
    </div>`;
}
const STIL_NAMEN = { sturm: 'Sturm — greift früh an', standard: 'Standard', burg: 'Burg — baut aus, greift spät an' };
const STUFEN_NAMEN = {
  leicht: 'Leicht — reagiert langsam, baut wenig aus',
  mittel: 'Mittel',
  schwer: 'Schwer — schnell, baut früh aus',
};
function starte(f, zuschauen) {
  const gewaehlt = document.querySelector?.('#intro input[name="stil"]:checked');
  if (gewaehlt) gegnerStil = gewaehlt.value;
  const stufe = document.querySelector?.('#intro input[name="stufe"]:checked');
  if (stufe) gegnerStufe = stufe.value;
  const karte = document.querySelector?.('#intro input[name="karte"]:checked');
  if (karte) karteSchluessel = karte.value;
  document.getElementById('intro').style.display = 'none';
  paused = false;
  neu(f, zuschauen);
}

// ------------------------------------------------------------ Spielende und Wiederholungen
/** Siegbildschirm ueber dem Spielfeld. */
function zeigeEnde() {
  endeGezeigt = true;
  if (aufnahme) aufnahmeAbschliessen(aufnahme, world);
  const el = document.getElementById('intro');
  el.innerHTML = siegHtml(world, verlauf, ME, !!aufnahme, !!wiederholung);
  el.style.display = '';
  const knopf = (id, f) => {
    const b = document.getElementById(id);
    if (b) b.onclick = f;
  };
  knopf('endeSpeichern', () => aufnahmeSpeichern(aufnahme));
  knopf('endeKarte', () => (el.style.display = 'none'));
  knopf('endeNochmal', () => startbildschirm());
}

/** Startbildschirm zeigen und verdrahten. */
function startbildschirm() {
  const el = document.getElementById('intro');
  el.innerHTML = introHtml();
  el.style.display = '';
  document.getElementById('introMensch').onclick = () => starte('mensch', false);
  document.getElementById('introGott').onclick = () => starte('gott', false);
  document.getElementById('introSchau').onclick = () => starte('mensch', true);
  const datei = document.getElementById('wiederholungDatei');
  if (datei) datei.onchange = () => wiederholungLaden(datei);
  paused = true;
}

/** Eine Wiederholung aus einer Datei laden und abspielen. */
function wiederholungLaden(eingabe) {
  const datei = eingabe.files && eingabe.files[0];
  if (!datei) return;
  const meldung = document.getElementById('wiederholungMeldung');
  datei.text().then((text) => {
    const r = aufnahmeLesen(text);
    if (r.fehler) {
      if (meldung) meldung.textContent = r.fehler;
      return;
    }
    document.getElementById('intro').style.display = 'none';
    paused = false;
    neu(r.a.factions[0], !!r.a.zuschauen, r.a);
    wiederholungsHinweis = r.warnung;
  });
}
let wiederholungsHinweis = '';
startbildschirm();

document.getElementById('asMensch').onclick = () => neu('mensch');
document.getElementById('asGott').onclick = () => neu('gott');
document.getElementById('zuschauen').onclick = () => neu(meFaction, true);
neu('mensch');
resize();
requestAnimationFrame(frame);
