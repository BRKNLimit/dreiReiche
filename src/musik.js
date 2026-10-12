// Musik -- erzeugt, nicht abgespielt: WebAudio-Klaenge nach einfachen Regeln,
// keine Dateien. Jedes Volk hat seine Farbe: die Menschen dorisch mit
// Lautenzupfen, der Gott pentatonisch mit Floete und Flaechen. Wird gekaempft,
// kommen Trommeln dazu und die Melodie wird dichter; danach klingt es wieder ab.
// Nur Oberflaeche -- Zufall darf hier Math.random sein.

const MUSIK_TEMPO = 76; // Schlaege pro Minute
const MUSIK_VORLAUF = 0.6; // so weit im Voraus planen (s)
const MUSIK_LAUT = 0.16;

// Grundton (MIDI), Tonleiter (Halbtoene), vier Akkorde zu je zwei Takten
const MUSIK_STIMMUNG = {
  mensch: {
    grund: 50, // D
    leiter: [0, 2, 3, 5, 7, 9, 10], // dorisch
    akkorde: [[0, 7, 15], [-2, 5, 14], [3, 10, 15], [5, 12, 17]], // Dm C F G
    instrument: 'laute',
  },
  gott: {
    grund: 45, // A
    leiter: [0, 2, 4, 7, 9], // pentatonisch
    akkorde: [[0, 7, 14], [5, 12, 19], [-3, 4, 12], [2, 9, 14]],
    instrument: 'floete',
  },
  tod: {
    grund: 47, // H
    leiter: [0, 1, 3, 5, 7, 8, 10], // phrygisch
    akkorde: [[0, 7, 15], [1, 8, 13], [-2, 5, 13], [-4, 3, 12]],
    instrument: 'glocke',
  },
};
const musikHz = (midi) => 440 * 2 ** ((midi - 69) / 12);

export function neueMusik() {
  return { an: leseMusik(), laut: 1, bus: null, ziel: -1, naechster: 0, achtel: 0, stufe: 4, kampf: 0, volk: 'mensch' };
}

function leseMusik() {
  try {
    return localStorage.getItem('dreiReiche.musik') !== '0';
  } catch {
    return true;
  }
}

/** Musik an/aus (Taste N); der Ton insgesamt bleibt bei M. */
export function musikSchalten(mu) {
  mu.an = !mu.an;
  try {
    localStorage.setItem('dreiReiche.musik', mu.an ? '1' : '0');
  } catch {
    /* nur fuer diese Sitzung */
  }
  return mu.an;
}

/** Je Tick: Schuesse treiben die Spannung hoch (beide Seiten sind immer beteiligt). */
export function musikEreignisse(mu, world) {
  let n = 0;
  for (const ev of world.events) if (ev.t === 'shot') n++;
  mu.kampf = Math.min(1, mu.kampf + n * 0.012);
}

/** Je Bild: Lautstaerke nachfuehren, Spannung abklingen lassen, die naechsten Noten planen. */
export function musikFortschreiben(mu, fx, volk, dt) {
  const ton = fx.ton;
  if (!ton) return;
  if (!mu.bus) musikAufbauen(mu, ton);
  mu.kampf *= Math.exp(-dt / 12);
  const ziel = mu.an && !fx.stumm ? MUSIK_LAUT * mu.laut : 0;
  if (ziel !== mu.ziel) {
    mu.bus.gain.setTargetAtTime(ziel, ton.currentTime, 0.6);
    mu.ziel = ziel;
  }
  if (!ziel) return;
  if (MUSIK_STIMMUNG[volk]) mu.volk = volk;
  const dauer = 60 / MUSIK_TEMPO / 2; // ein Achtel
  if (mu.naechster < ton.currentTime) mu.naechster = ton.currentTime + 0.05;
  while (mu.naechster < ton.currentTime + MUSIK_VORLAUF) {
    musikAchtel(mu, ton, mu.naechster, dauer);
    mu.naechster += dauer;
    mu.achtel++;
  }
}

/** Ausgang mit etwas Raum: Echo mit Rueckkopplung, gedaempft. */
function musikAufbauen(mu, ton) {
  mu.bus = ton.createGain();
  mu.bus.gain.value = 0;
  mu.bus.connect(ton.destination);
  mu.trocken = ton.createGain();
  mu.trocken.connect(mu.bus);
  const echo = ton.createDelay(1);
  echo.delayTime.value = (60 / MUSIK_TEMPO) * 0.75;
  const rueck = ton.createGain();
  rueck.gain.value = 0.32;
  const daempfer = ton.createBiquadFilter();
  daempfer.type = 'lowpass';
  daempfer.frequency.value = 1800;
  mu.trocken.connect(echo);
  echo.connect(daempfer);
  daempfer.connect(rueck);
  rueck.connect(echo);
  daempfer.connect(mu.bus);
}

function musikAchtel(mu, ton, t, dauer) {
  const s = MUSIK_STIMMUNG[mu.volk];
  const i = mu.achtel;
  const akkord = s.akkorde[((i / 16) | 0) % s.akkorde.length];
  const k = mu.kampf;
  // Flaeche: alle zwei Takte ein neuer Akkord
  if (i % 16 === 0) for (const n of akkord) musikFlaeche(ton, mu.trocken, musikHz(s.grund + n), t, dauer * 16, 0.045);
  // Bass auf jedem Taktanfang
  if (i % 8 === 0) musikBass(ton, mu.trocken, musikHz(s.grund - 12 + akkord[0]), t, dauer * 6, 0.11 + k * 0.05);
  // Melodie: Zufallsweg auf der Tonleiter, auf schweren Zeiten lieber Akkordtoene
  const dichte = 0.22 + k * 0.3;
  if (Math.random() < (i % 2 === 0 ? dichte : dichte * 0.4)) {
    mu.stufe = Math.max(0, Math.min(s.leiter.length * 2 - 1, mu.stufe + [-2, -1, -1, 1, 1, 2][(Math.random() * 6) | 0]));
    let midi = s.grund + 12 + 12 * ((mu.stufe / s.leiter.length) | 0) + s.leiter[mu.stufe % s.leiter.length];
    if (i % 8 === 0) midi = s.grund + 12 + akkord[(Math.random() * akkord.length) | 0];
    const laenge = dauer * (Math.random() < 0.3 ? 3 : 1.6);
    if (s.instrument === 'laute') musikLaute(ton, mu.trocken, musikHz(midi), t, laenge, 0.13);
    else if (s.instrument === 'glocke') musikGlocke(ton, mu.trocken, musikHz(midi), t, laenge * 2.5, 0.08);
    else musikFloete(ton, mu.trocken, musikHz(midi), t, laenge * 1.4, 0.09);
  }
  // Trommeln, wenn gekaempft wird
  if (k > 0.2 && i % 4 === 0) musikTrommel(ton, mu.trocken, t, { gott: 55, tod: 45 }[mu.volk] || 75, 0.35 * k);
  if (k > 0.45 && i % 4 === 2) musikRassel(ton, mu.trocken, t, 0.08 * k, mu.volk === 'gott' ? 5000 : 2200);
  if (k > 0.7 && i % 2 === 1) musikRassel(ton, mu.trocken, t, 0.05 * k, 6500);
}

function huelle(ton, t, an, halten, aus, laut) {
  const g = ton.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(laut, t + an);
  g.gain.setValueAtTime(laut, t + an + halten);
  g.gain.exponentialRampToValueAtTime(0.0001, t + an + halten + aus);
  return g;
}

function musikFlaeche(ton, ziel, f, t, dauer, laut) {
  const g = huelle(ton, t, 1.8, Math.max(0.1, dauer - 3), 1.6, laut);
  const filter = ton.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 900;
  for (const verstimmt of [-6, 6]) {
    const o = ton.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = f;
    o.detune.value = verstimmt;
    o.connect(filter);
    o.start(t);
    o.stop(t + dauer + 0.2);
  }
  filter.connect(g);
  g.connect(ziel);
}

function musikBass(ton, ziel, f, t, dauer, laut) {
  const o = ton.createOscillator();
  o.type = 'triangle';
  o.frequency.value = f;
  const g = huelle(ton, t, 0.03, dauer * 0.5, dauer * 0.5, laut);
  o.connect(g);
  g.connect(ziel);
  o.start(t);
  o.stop(t + dauer + 0.1);
}

/** Gezupft: heller Anschlag, der Filter schliesst sich schnell. */
function musikLaute(ton, ziel, f, t, dauer, laut) {
  const o = ton.createOscillator();
  o.type = 'sawtooth';
  o.frequency.value = f;
  const filter = ton.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(f * 8, t);
  filter.frequency.exponentialRampToValueAtTime(f * 1.2, t + 0.35);
  const g = huelle(ton, t, 0.005, 0.02, dauer + 0.6, laut);
  o.connect(filter);
  filter.connect(g);
  g.connect(ziel);
  o.start(t);
  o.stop(t + dauer + 0.8);
}

/** Geblasen: weicher Einsatz, leichtes Vibrato, ein Hauch Atem. */
function musikFloete(ton, ziel, f, t, dauer, laut) {
  const o = ton.createOscillator();
  o.type = 'sine';
  o.frequency.value = f;
  const vib = ton.createOscillator();
  vib.frequency.value = 5.2;
  const vibTiefe = ton.createGain();
  vibTiefe.gain.value = f * 0.006;
  vib.connect(vibTiefe);
  vibTiefe.connect(o.frequency);
  const g = huelle(ton, t, 0.12, dauer * 0.6, dauer * 0.5, laut);
  o.connect(g);
  g.connect(ziel);
  o.start(t);
  vib.start(t);
  o.stop(t + dauer * 1.2 + 0.2);
  vib.stop(t + dauer * 1.2 + 0.2);
  musikRassel(ton, ziel, t, laut * 0.25, 3000, 0.12); // Atem
}

/** Angeschlagen: Grundton und ein unharmonischer Teilton, langes Ausklingen. */
function musikGlocke(ton, ziel, f, t, dauer, laut) {
  for (const [faktor, anteil] of [[1, 1], [2.76, 0.35], [5.4, 0.12]]) {
    const o = ton.createOscillator();
    o.type = 'sine';
    o.frequency.value = f * faktor;
    const g = huelle(ton, t, 0.004, 0.01, dauer, laut * anteil);
    o.connect(g);
    g.connect(ziel);
    o.start(t);
    o.stop(t + dauer + 0.1);
  }
}

function musikTrommel(ton, ziel, t, f, laut) {
  const o = ton.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(f * 2, t);
  o.frequency.exponentialRampToValueAtTime(f * 0.6, t + 0.25);
  const g = huelle(ton, t, 0.004, 0.02, 0.32, laut);
  o.connect(g);
  g.connect(ziel);
  o.start(t);
  o.stop(t + 0.4);
}

function musikRassel(ton, ziel, t, laut, frequenz, dauer = 0.06) {
  const n = Math.max(1, Math.floor(ton.sampleRate * dauer));
  const puffer = ton.createBuffer(1, n, ton.sampleRate);
  const d = puffer.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const q = ton.createBufferSource();
  q.buffer = puffer;
  const filter = ton.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = frequenz;
  const g = huelle(ton, t, 0.003, 0.005, dauer, laut);
  q.connect(filter);
  filter.connect(g);
  g.connect(ziel);
  q.start(t);
  q.stop(t + dauer + 0.05);
}
