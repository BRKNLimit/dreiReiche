// Geschosse, Treffer, Klaenge -- fuer beide Oberflaechen. Nur Darstellung:
// liest die Ereignisse der Simulation (shot, died, built, spawned) und
// aendert den Zustand nie. Kein Determinismus noetig, darum Math.random fuer
// Streuung. Klaenge werden mit WebAudio erzeugt, ohne Dateien.
//
// Die Simulation trifft sofort; das Geschoss ist die Erzaehlung davon. Es
// fliegt vom Schuetzen zum Ziel und schlaegt dort ein -- erst dann Funken,
// Aufblitzen, Klang.

import { UNITS, BUILDINGS } from './sim/defs.js';

// Je Schuetze: Geschoss (Art, Tempo in dm/s, Bogenhoehe je dm Flugweite,
// Farbe, Groesse), oder Hieb am Ziel; dazu Treffer-Art, Beben, Klaenge.
// Unbekannte Typen nehmen DEFAULT.
const WAFFEN = {
  jaeger: { geschoss: 'pfeil', tempo: 1100, bogen: 0.14, farbe: '#e8dcc0', groesse: 1, treffer: 'splitter', ab: 'sehne', auf: 'pfeil' },
  wachturm: { geschoss: 'pfeil', tempo: 1300, bogen: 0.1, farbe: '#f0e6c8', groesse: 1.3, treffer: 'splitter', ab: 'sehne', auf: 'pfeil' },
  katapult: { geschoss: 'bolzen', tempo: 900, bogen: 0.06, farbe: '#5a4a3a', groesse: 2.2, treffer: 'wucht', beben: 6, ab: 'balliste', auf: 'krach' },
  waechterbaum: { geschoss: 'dorn', tempo: 1200, bogen: 0.12, farbe: '#a8d870', groesse: 1.3, treffer: 'splitter', ab: 'zisch', auf: 'pfeil' },
  waldgeist: { geschoss: 'licht', tempo: 1200, bogen: 0.05, farbe: '#d8ffb0', groesse: 1, treffer: 'magie', ab: 'glanz', auf: 'glanz' },
  waldgott: { geschoss: 'glut', tempo: 800, bogen: 0.18, farbe: '#ff9a3a', groesse: 2, treffer: 'glut', beben: 3, ab: 'feuer', auf: 'glutschlag' },
  soldat: { hieb: 'klinge', treffer: 'funken', auf: 'klinge' },
  soeldner: { hieb: 'klinge', treffer: 'funken', beben: 1, auf: 'klinge', schwer: true },
  held: { hieb: 'klinge', treffer: 'funken', beben: 2, auf: 'klinge', farbe: '#ffd870', schwer: true },
  bauer: { hieb: 'stumpf', treffer: 'staub', auf: 'stumpf' },
  dryade: { hieb: 'stumpf', treffer: 'blatt', auf: 'stumpf' },
  wolf: { hieb: 'biss', treffer: 'biss', auf: 'biss' },
  ent: { hieb: 'wucht', treffer: 'wucht', beben: 5, auf: 'krach', schwer: true },
  wurzelbrecher: { hieb: 'wucht', treffer: 'wucht', beben: 6, auf: 'krach', schwer: true },
};
const DEFAULT = { hieb: 'stumpf', treffer: 'staub', auf: 'stumpf' };

// Partikel je Treffer-Art: Anzahl, Farben, Tempo (dm/s), Steigen, Lebensdauer (s), Groesse (dm)
const TREFFER = {
  splitter: { n: 5, farben: ['#c8a878', '#8a6a48'], tempo: 120, auf: 60, dauer: 0.45, groesse: 6 },
  funken: { n: 7, farben: ['#fff2b0', '#ffd060', '#ffffff'], tempo: 220, auf: 90, dauer: 0.3, groesse: 4, leuchtet: true },
  staub: { n: 5, farben: ['#9a8a6a', '#6a604a'], tempo: 70, auf: 30, dauer: 0.6, groesse: 10 },
  blatt: { n: 6, farben: ['#9ac46a', '#6a9a4a', '#c8d878'], tempo: 90, auf: 50, dauer: 0.8, groesse: 7 },
  biss: { n: 6, farben: ['#8a2a2a', '#c84a3a'], tempo: 110, auf: 40, dauer: 0.4, groesse: 5 },
  magie: { n: 9, farben: ['#e8ffd0', '#b0f080', '#ffffff'], tempo: 140, auf: 120, dauer: 0.6, groesse: 5, leuchtet: true, ring: 1 },
  glut: { n: 12, farben: ['#ffb040', '#ff7020', '#ffe080'], tempo: 160, auf: 160, dauer: 0.8, groesse: 6, leuchtet: true, ring: 2 },
  wucht: { n: 14, farben: ['#8a7a5a', '#5a5040', '#b0a080'], tempo: 200, auf: 140, dauer: 0.9, groesse: 12, ring: 3 },
  stein: { n: 8, farben: ['#9a9a90', '#6a6a64'], tempo: 160, auf: 120, dauer: 0.7, groesse: 8 },
};

// Wie lange Gefallene zu Boden sinken und Truemmer liegen bleiben (s)
export const FALLEN = 1.6;
export const TRUEMMER = 45;

export function neueEffekte() {
  return {
    geschosse: [], // { art, a, b, ax, ay, bx, by, t, dauer, bogen, farbe, groesse, w }
    hiebe: [], // { x, y, w, t, dauer, farbe, art }
    partikel: [], // { x, y, h, vx, vy, vh, t, dauer, farbe, groesse, leuchtet }
    ringe: [], // { x, y, r, t, dauer, farbe }
    blitze: new Map(), // Id -> Zeitpunkt des letzten Treffers (ms)
    pings: [], // Angriffe ausserhalb des Bildes, fuer die Minikarte: { x, y, t }
    gefallen: [], // gerade gefallene Einheiten, sinken zu Boden: { id, type, player, x, y, t }
    truemmer: [], // Reste zerstoerter Gebaeude: { id, type, x, y, t }
    beben: 0,
    jetzt: 0,
    ton: null,
    stumm: leseStumm(),
    zuletzt: {}, // Klangart -> ms
    warnungBis: 0,
  };
}

function leseStumm() {
  try {
    return localStorage.getItem('dreiReiche.stumm') === '1';
  } catch {
    return false;
  }
}

/** Alles Sichtbare verwerfen (neue Partie); der Ton bleibt an. */
export function effekteLeeren(fx) {
  fx.geschosse = [];
  fx.hiebe = [];
  fx.partikel = [];
  fx.ringe = [];
  fx.pings = [];
  fx.gefallen = [];
  fx.truemmer = [];
  fx.blitze.clear();
  fx.beben = 0;
}

/** Ton an/aus (Taste M). */
export function stummSchalten(fx) {
  fx.stumm = !fx.stumm;
  try {
    localStorage.setItem('dreiReiche.stumm', fx.stumm ? '1' : '0');
  } catch {
    /* ohne Speicher eben nur fuer diese Sitzung */
  }
  return fx.stumm;
}

/**
 * Ereignisse eines Ticks in Effekte uebersetzen.
 *   ich       eigener Sitzplatz (fuer Warnungen und eigene Klaenge)
 *   sichtbar  (entity) -> true, wenn man sie sehen darf (Nebel)
 *   hoerer    { x, y, weite } -- Mitte des Bildes und wie weit man hoert (dm)
 *   imBild    (x, y) -> true, wenn der Punkt gerade auf dem Schirm ist
 */
export function effekteAusEreignissen(fx, world, ich, sichtbar, hoerer, imBild) {
  const byId = (id) => world.entities.find((e) => e.id === id);
  for (const ev of world.events) {
    if (ev.t === 'shot') {
      const a = byId(ev.from);
      const b = byId(ev.to);
      if (!a || !b) continue;
      // Angriff auf Eigenes, das man gerade nicht sieht: Horn und Ping
      if (b.player === ich && a.player !== ich && !imBild(b.x, b.y) && fx.jetzt >= fx.warnungBis) {
        fx.warnungBis = fx.jetzt + 12000;
        fx.pings.push({ x: b.x, y: b.y, t: 0 });
        klang(fx, 'warnung', 0.7, 0);
      }
      if (!sichtbar(a) && !sichtbar(b)) continue;
      const w = WAFFEN[a.type] || DEFAULT;
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      if (w.geschoss) {
        const dauer = Math.max(0.12, Math.min(1.4, d / w.tempo));
        fx.geschosse.push({
          art: w.geschoss, a: a.id, b: b.id, ax: a.x, ay: a.y, bx: b.x, by: b.y, t: 0, dauer,
          bogen: d * w.bogen, farbe: w.farbe, groesse: w.groesse, waffe: a.type, ziel: b.kind,
        });
        raum(fx, w.ab, a.x, a.y, hoerer, 0.5);
      } else {
        einschlag(fx, w, b.x, b.y, b.kind, Math.atan2(b.y - a.y, b.x - a.x), hoerer);
        fx.blitze.set(b.id, fx.jetzt);
      }
    } else if (ev.t === 'died') {
      if (!sichtbar(ev)) continue;
      const gebaeude = ev.kind === 'building';
      partikel(fx, gebaeude ? 'stein' : 'staub', ev.x, ev.y, gebaeude ? 3 : 1.4);
      if (gebaeude) fx.truemmer.push({ id: ev.id, type: ev.type, x: ev.x, y: ev.y, t: 0 });
      else fx.gefallen.push({ id: ev.id, type: ev.type, player: ev.player, x: ev.x, y: ev.y, t: 0 });
      if (gebaeude) {
        fx.ringe.push({ x: ev.x, y: ev.y, r: 600, t: 0, dauer: 0.9, farbe: '#c8b890' });
        beben(fx, 9, ev.x, ev.y, hoerer);
      }
      raum(fx, gebaeude ? 'einsturz' : 'tod', ev.x, ev.y, hoerer, gebaeude ? 1 : 0.6);
    } else if (ev.t === 'built') {
      const b = byId(ev.id);
      if (b && b.player === ich) klang(fx, 'fertig', 0.5, 0);
    } else if (ev.t === 'spawned') {
      const u = byId(ev.id);
      if (u && u.player === ich && world.tick > 5) klang(fx, 'einheit', 0.25, 0);
    }
  }
}

/** Treffer am Ziel: Partikel, Ring, Beben, Klang. */
function einschlag(fx, w, x, y, zielArt, richtung, hoerer) {
  const art = zielArt === 'building' && w.treffer !== 'glut' && w.treffer !== 'magie' ? 'stein' : w.treffer;
  partikel(fx, art, x, y, w.schwer ? 1.5 : 1, richtung);
  const t = TREFFER[art];
  if (t.ring) fx.ringe.push({ x, y, r: 120 + t.ring * 90, t: 0, dauer: 0.35 + t.ring * 0.1, farbe: t.farben[0] });
  if (w.hieb) fx.hiebe.push({ x, y, w: richtung, t: 0, dauer: 0.18, farbe: w.farbe || '#ffffff', art: w.hieb });
  if (w.beben) beben(fx, w.beben, x, y, hoerer);
  raum(fx, w.auf, x, y, hoerer, w.schwer ? 0.8 : 0.5);
}

function partikel(fx, art, x, y, menge = 1, richtung = null) {
  const t = TREFFER[art] || TREFFER.staub;
  const n = Math.round(t.n * menge);
  for (let i = 0; i < n; i++) {
    // Streuung, mit Richtung leicht nach hinten vom Schuetzen weg
    const w = richtung === null ? Math.random() * Math.PI * 2 : richtung + (Math.random() - 0.5) * 2.2;
    const v = t.tempo * (0.4 + Math.random() * 0.8) * Math.sqrt(menge);
    fx.partikel.push({
      x: x + (Math.random() - 0.5) * 20, y: y + (Math.random() - 0.5) * 20, h: 8 + Math.random() * 10,
      vx: Math.cos(w) * v, vy: Math.sin(w) * v, vh: t.auf * (0.5 + Math.random()),
      t: 0, dauer: t.dauer * (0.7 + Math.random() * 0.6),
      farbe: t.farben[i % t.farben.length], groesse: t.groesse * (0.6 + Math.random() * 0.8) * Math.sqrt(menge),
      leuchtet: !!t.leuchtet,
    });
  }
  if (fx.partikel.length > 1500) fx.partikel.splice(0, fx.partikel.length - 1500);
}

/** Beben nach Staerke, schwaecher mit Abstand zur Bildmitte. */
function beben(fx, staerke, x, y, hoerer) {
  const f = Math.max(0, 1 - Math.hypot(x - hoerer.x, y - hoerer.y) / hoerer.weite);
  fx.beben = Math.min(14, Math.max(fx.beben, staerke * f));
}

/** Zeit fortschreiben: Geschosse schlagen ein, Partikel fallen, Ringe weiten sich. */
export function effekteFortschreiben(fx, dt, world, hoerer) {
  fx.jetzt += dt * 1000;
  const lebt = [];
  for (const g of fx.geschosse) {
    g.t += dt;
    if (g.t < g.dauer) {
      lebt.push(g);
      continue;
    }
    const b = world.entities.find((e) => e.id === g.b);
    const x = b ? b.x : g.bx;
    const y = b ? b.y : g.by;
    einschlag(fx, WAFFEN[g.waffe] || DEFAULT, x, y, g.ziel, Math.atan2(y - g.ay, x - g.ax), hoerer);
    if (b) fx.blitze.set(b.id, fx.jetzt);
  }
  fx.geschosse = lebt;
  fx.hiebe = fx.hiebe.filter((h) => (h.t += dt) < h.dauer);
  for (const p of fx.partikel) {
    p.t += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.h = Math.max(0, p.h + p.vh * dt);
    p.vh -= 400 * dt; // Schwere
    p.vx *= 1 - 2 * dt;
    p.vy *= 1 - 2 * dt;
  }
  fx.partikel = fx.partikel.filter((p) => p.t < p.dauer);
  fx.ringe = fx.ringe.filter((r) => (r.t += dt) < r.dauer);
  fx.pings = fx.pings.filter((p) => (p.t += dt) < 3);
  fx.gefallen = fx.gefallen.filter((g) => (g.t += dt) < FALLEN);
  fx.truemmer = fx.truemmer.filter((g) => (g.t += dt) < TRUEMMER);
  if (fx.truemmer.length > 60) fx.truemmer.splice(0, fx.truemmer.length - 60);
  fx.beben = Math.max(0, fx.beben - dt * 30);
}

/** Wie stark eine Entity gerade aufblitzt (0..1) -- kurz nach einem Treffer. */
export function blitzVon(fx, id) {
  const t = fx.blitze.get(id);
  if (t === undefined) return 0;
  const f = 1 - (fx.jetzt - t) / 140;
  if (f <= 0) {
    fx.blitze.delete(id);
    return 0;
  }
  return f;
}

/** Versatz des Bildes durch Beben, in Pixeln. */
export function bebenVersatz(fx) {
  if (fx.beben <= 0) return [0, 0];
  return [(Math.random() - 0.5) * fx.beben, (Math.random() - 0.5) * fx.beben];
}

/** Lage eines Geschosses: [x, y, h] in dm und Flugwinkel -- fuer beide Oberflaechen. */
export function geschossLage(g, lageVon) {
  const a = lageVon(g.a);
  const b = lageVon(g.b);
  const ax = a ? a[0] : g.ax;
  const ay = a ? a[1] : g.ay;
  const bx = b ? b[0] : g.bx;
  const by = b ? b[1] : g.by;
  const f = Math.min(1, g.t / g.dauer);
  return [ax + (bx - ax) * f, ay + (by - ay) * f, 15 + Math.sin(f * Math.PI) * g.bogen, Math.atan2(bx - ax, by - ay)];
}

/**
 * Partikel, Ringe, Hiebe (und in 2D die Geschosse) auf eine Zeichenflaeche.
 *   proj(x, y, h) -> [px, py] oder null; massstab: Pixel je dm am Boden
 */
export function zeichneEffekte(fx, ctx, proj, massstab, mitGeschossen, lageVon) {
  ctx.save();
  // Ringe am Boden
  for (const r of fx.ringe) {
    const f = r.t / r.dauer;
    const p = proj(r.x, r.y, 0);
    if (!p) continue;
    ctx.globalAlpha = 0.6 * (1 - f);
    ctx.strokeStyle = r.farbe;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(p[0], p[1], Math.max(1, r.r * f * massstab), Math.max(1, r.r * f * massstab * 0.6), 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Hiebe: kurzer Bogen am Ziel
  for (const h of fx.hiebe) {
    const f = h.t / h.dauer;
    const p = proj(h.x, h.y, 12);
    if (!p) continue;
    const r = Math.max(6, 40 * massstab) * (h.art === 'wucht' ? 1.8 : 1);
    ctx.globalAlpha = 1 - f;
    ctx.strokeStyle = h.art === 'biss' ? '#ff8a6a' : h.farbe;
    ctx.lineWidth = h.art === 'wucht' ? 4 : 2.5;
    ctx.beginPath();
    const w = h.w + Math.PI;
    ctx.arc(p[0], p[1], r, w - 0.9 + f * 0.6, w + 0.9 + f * 0.6);
    ctx.stroke();
  }
  // Geschosse (nur 2D -- in 3D sind es Modelle)
  if (mitGeschossen) {
    for (const g of fx.geschosse) {
      const [x, y, hoehe] = geschossLage(g, lageVon);
      const p = proj(x, y, hoehe);
      const q = proj(x - (g.bx - g.ax) * 0.04, y - (g.by - g.ay) * 0.04, hoehe);
      if (!p || !q) continue;
      ctx.globalAlpha = 1;
      ctx.strokeStyle = g.farbe;
      ctx.fillStyle = g.farbe;
      if (g.art === 'licht' || g.art === 'glut') {
        ctx.globalCompositeOperation = 'lighter';
        ctx.beginPath();
        ctx.arc(p[0], p[1], Math.max(2, 2.2 * g.groesse), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = Math.max(1.5, 1.5 * g.groesse);
        ctx.beginPath();
        ctx.moveTo(q[0], q[1]);
        ctx.lineTo(p[0], p[1]);
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      } else {
        ctx.lineWidth = g.art === 'bolzen' ? 3 : 1.5;
        ctx.beginPath();
        ctx.moveTo(q[0], q[1]);
        ctx.lineTo(p[0], p[1]);
        ctx.stroke();
      }
    }
  }
  // Partikel
  for (const p of fx.partikel) {
    const s = proj(p.x, p.y, p.h);
    if (!s) continue;
    const f = p.t / p.dauer;
    ctx.globalAlpha = 1 - f * f;
    ctx.fillStyle = p.farbe;
    if (p.leuchtet) ctx.globalCompositeOperation = 'lighter';
    const g = Math.max(2, p.groesse * massstab * 1.4);
    ctx.fillRect(s[0] - g / 2, s[1] - g / 2, g, g);
    if (p.leuchtet) ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
}

/** Pings auf der Minikarte: Angriffe auf Eigenes ausserhalb des Bildes. */
export function zeichnePings(fx, ctx, massstab) {
  ctx.save();
  ctx.strokeStyle = '#ff5a3a';
  ctx.lineWidth = 2;
  for (const p of fx.pings) {
    const f = (p.t % 1) / 1;
    ctx.globalAlpha = 1 - f;
    ctx.beginPath();
    ctx.arc(p.x * massstab, p.y * massstab, 4 + f * 14, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

// ------------------------------------------------------------ Klaenge

/** Ton einschalten -- Browser erlauben Audio erst nach einer Eingabe. */
export function tonAn(fx) {
  if (fx.ton || typeof AudioContext === 'undefined') return;
  try {
    fx.ton = new AudioContext();
    fx.master = fx.ton.createGain();
    fx.master.gain.value = 0.5;
    fx.master.connect(fx.ton.destination);
  } catch {
    fx.ton = null;
  }
}

/** Klang an einem Ort: leiser mit Abstand, links/rechts nach Lage im Bild. */
function raum(fx, art, x, y, hoerer, laut) {
  if (!art) return;
  const d = Math.hypot(x - hoerer.x, y - hoerer.y);
  const f = 1 - d / hoerer.weite;
  if (f <= 0) return;
  const pan = Math.max(-1, Math.min(1, (x - hoerer.x) / (hoerer.weite * 0.6)));
  klang(fx, art, laut * f, pan);
}

function klang(fx, art, laut, pan) {
  const ton = fx.ton;
  if (!ton || fx.stumm || laut <= 0.02) return;
  // Nicht zu viele gleichzeitig: je Art hoechstens alle 45 ms
  if (fx.zuletzt[art] && fx.jetzt - fx.zuletzt[art] < 45) return;
  fx.zuletzt[art] = fx.jetzt;
  const t0 = ton.currentTime;
  const aus = ton.createGain();
  aus.gain.value = laut;
  let ziel = aus;
  if (ton.createStereoPanner) {
    const p = ton.createStereoPanner();
    p.pan.value = pan;
    aus.connect(p);
    p.connect(fx.master);
  } else aus.connect(fx.master);
  const R = REZEPTE[art];
  if (R) R(ton, ziel, t0);
}

/** Rauschen mit Filter und Huellkurve. */
function rauschen(ton, ziel, t0, dauer, typ, frequenz, q = 1, laut = 1) {
  const n = Math.max(1, Math.floor(ton.sampleRate * dauer));
  const puffer = ton.createBuffer(1, n, ton.sampleRate);
  const d = puffer.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const quelle = ton.createBufferSource();
  quelle.buffer = puffer;
  const filter = ton.createBiquadFilter();
  filter.type = typ;
  filter.frequency.value = frequenz;
  filter.Q.value = q;
  const g = ton.createGain();
  g.gain.setValueAtTime(laut, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dauer);
  quelle.connect(filter);
  filter.connect(g);
  g.connect(ziel);
  quelle.start(t0);
  quelle.stop(t0 + dauer);
}

/** Schwingung mit Tonhoehen-Verlauf und Huellkurve. */
function ton1(ton, ziel, t0, dauer, form, von, bis, laut = 0.5, start = 0) {
  const o = ton.createOscillator();
  o.type = form;
  o.frequency.setValueAtTime(von, t0 + start);
  o.frequency.exponentialRampToValueAtTime(Math.max(1, bis), t0 + start + dauer);
  const g = ton.createGain();
  g.gain.setValueAtTime(0.0001, t0 + start);
  g.gain.exponentialRampToValueAtTime(laut, t0 + start + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + start + dauer);
  o.connect(g);
  g.connect(ziel);
  o.start(t0 + start);
  o.stop(t0 + start + dauer + 0.02);
}

const REZEPTE = {
  sehne: (t, z, t0) => {
    rauschen(t, z, t0, 0.05, 'bandpass', 2400, 2, 0.6);
    ton1(t, z, t0, 0.09, 'triangle', 260, 120, 0.35);
  },
  pfeil: (t, z, t0) => rauschen(t, z, t0, 0.06, 'lowpass', 700, 1, 0.8),
  balliste: (t, z, t0) => {
    ton1(t, z, t0, 0.18, 'triangle', 140, 60, 0.6);
    rauschen(t, z, t0, 0.12, 'bandpass', 900, 1, 0.5);
  },
  krach: (t, z, t0) => {
    ton1(t, z, t0, 0.35, 'sine', 90, 30, 0.9);
    rauschen(t, z, t0, 0.3, 'lowpass', 500, 0.7, 0.9);
  },
  zisch: (t, z, t0) => rauschen(t, z, t0, 0.1, 'highpass', 3500, 1, 0.4),
  glanz: (t, z, t0) => {
    ton1(t, z, t0, 0.18, 'sine', 900, 1500, 0.18);
    ton1(t, z, t0, 0.2, 'sine', 1350, 2000, 0.1, 0.03);
  },
  feuer: (t, z, t0) => rauschen(t, z, t0, 0.25, 'bandpass', 450, 0.8, 0.7),
  glutschlag: (t, z, t0) => {
    rauschen(t, z, t0, 0.35, 'lowpass', 900, 0.8, 0.9);
    ton1(t, z, t0, 0.3, 'sawtooth', 120, 50, 0.25);
  },
  klinge: (t, z, t0) => {
    ton1(t, z, t0, 0.14, 'square', 1250 + Math.random() * 300, 900, 0.12);
    ton1(t, z, t0, 0.12, 'triangle', 1900, 1500, 0.1);
    rauschen(t, z, t0, 0.04, 'highpass', 2500, 1, 0.4);
  },
  stumpf: (t, z, t0) => rauschen(t, z, t0, 0.07, 'lowpass', 420, 1, 0.9),
  biss: (t, z, t0) => {
    rauschen(t, z, t0, 0.09, 'bandpass', 900, 1.5, 0.6);
    ton1(t, z, t0, 0.1, 'sawtooth', 170, 110, 0.15);
  },
  tod: (t, z, t0) => ton1(t, z, t0, 0.18, 'sine', 110, 45, 0.5),
  einsturz: (t, z, t0) => {
    rauschen(t, z, t0, 0.9, 'lowpass', 300, 0.7, 1);
    ton1(t, z, t0, 0.7, 'sine', 70, 25, 0.8);
  },
  fertig: (t, z, t0) => {
    ton1(t, z, t0, 0.25, 'sine', 660, 660, 0.25);
    ton1(t, z, t0, 0.35, 'sine', 990, 990, 0.2, 0.12);
  },
  einheit: (t, z, t0) => ton1(t, z, t0, 0.08, 'sine', 520, 700, 0.18),
  warnung: (t, z, t0) => {
    ton1(t, z, t0, 0.45, 'sawtooth', 220, 210, 0.18);
    ton1(t, z, t0, 0.45, 'sawtooth', 330, 320, 0.12, 0.05);
  },
};

/** Geschoss-Modell in 3D: eigene Modelle, sonst das naechstliegende vorhandene. */
export function geschossModell(art, modelle) {
  const wahl = { pfeil: ['pfeil'], bolzen: ['bolzen', 'pfeil'], dorn: ['dorn', 'pfeil'], licht: ['lichtpfeil', 'kugel'], glut: ['glutball', 'kugel'] }[art] || ['kugel'];
  for (const k of wahl) if (modelle[k]) return k;
  return null;
}

export { WAFFEN };
// Fuer Tests und Galerie: welche Typen eine eigene Waffe haben
export const WAFFEN_TYPEN = Object.keys(WAFFEN).filter((k) => UNITS[k] || BUILDINGS[k]);
