// Spielstaende: eine laufende Partie als Text sichern und genau dort
// weiterspielen -- fuer beide Oberflaechen.
//
// Gespeichert wird der Zustand selbst (Welt und KI), nicht die Befehle: Eine
// lange Partie nachzuspielen dauerte zu lange. Was sich aus der Karte
// ableiten laesst (Wegfindung, Hindernisse), wird beim Laden neu gebaut;
// Verweise auf Entities (Regionen, die Kunde der KI) werden zu Ids und zurueck.
// Ein geladener Stand laeuft bitgenau so weiter wie der gesicherte -- das
// prueft test/spielstand.test.js.

import { KARTEN } from './sim/defs.js';
import { wegGitter } from './sim/weg.js';

const STAND_FORMAT = 'drei-reiche-spielstand';
const STAND_SIM = typeof SPIEL_STAND !== 'undefined' ? SPIEL_STAND : 'dev';

/** Welt und KIs (null erlaubt) zu einem Objekt, das sich als JSON speichern laesst. */
export function zustandSichern(world, ais) {
  const lebend = new Set(world.entities.map((e) => e.id));
  const w = { ...world };
  delete w.weg; // aus den Hindernissen ableitbar
  delete w.hindernisse;
  w.karteDaten = KARTEN[world.karte] && KARTEN[world.karte] === world.karteDaten ? null : world.karteDaten;
  w.leer = world.hindernisse.length === 0 && world.karteDaten.hindernisse.length > 0; // createWorld({ empty })
  // Regionen: Mitglieder als Id; wer in diesem Tick fiel, ist nicht mehr in entities und bleibt als Kopie
  w.regions = world.regions.map((r) => ({ ...r, members: r.members.map((e) => (lebend.has(e.id) ? e.id : { ...e })) }));
  const ki = ais.map((a) =>
    a ? { ...a, kunde: { ...a.kunde, jetzt: [...a.kunde.jetzt], einheiten: a.kunde.einheiten.map((e) => (lebend.has(e.id) ? e.id : { ...e })) } } : null
  );
  return JSON.parse(JSON.stringify({ world: w, ais: ki }));
}

/** Gegenstueck zu zustandSichern: liefert { world, ais }. */
export function zustandLaden(z) {
  const world = JSON.parse(JSON.stringify(z.world));
  world.karteDaten = world.karteDaten || KARTEN[world.karte];
  world.hindernisse = world.leer ? [] : world.karteDaten.hindernisse;
  delete world.leer;
  world.weg = wegGitter(world.hindernisse);
  const nachId = new Map(world.entities.map((e) => [e.id, e]));
  const zurueck = (x) => (typeof x === 'number' ? nachId.get(x) : x);
  for (const r of world.regions) r.members = r.members.map(zurueck);
  const ais = z.ais.map((a) => {
    if (!a) return null;
    const k = JSON.parse(JSON.stringify(a));
    k.kunde.jetzt = new Set(k.kunde.jetzt);
    k.kunde.einheiten = k.kunde.einheiten.map(zurueck);
    return k;
  });
  return { world, ais };
}

/** Ganzer Spielstand als Text: Zustand plus, was die Oberflaeche braucht (extra). */
export function spielstandText(world, ais, extra) {
  return JSON.stringify({ format: STAND_FORMAT, stand: STAND_SIM, zeit: Date.now(), zustand: zustandSichern(world, ais), extra });
}

/** Text pruefen; liefert { s } oder { fehler }, bei anderem Stand mit Warnung. */
export function spielstandLesen(text) {
  let s;
  try {
    s = JSON.parse(text);
  } catch {
    return { fehler: 'Kein Spielstand (kein JSON).' };
  }
  if (!s || s.format !== STAND_FORMAT || !s.zustand) return { fehler: 'Kein Spielstand der drei Reiche.' };
  return { s, warnung: s.stand !== STAND_SIM ? 'Gespeichert mit einem anderen Stand des Spiels — es kann Fehler geben.' : '' };
}

// ------------------------------------------------------------ Schnellspeicher im Browser
const SCHNELL = 'dreiReiche.spielstand';

export function schnellSpeichern(text) {
  try {
    localStorage.setItem(SCHNELL, text);
    return true;
  } catch {
    return false; // voll oder gesperrt
  }
}
export function schnellLaden() {
  try {
    return localStorage.getItem(SCHNELL);
  } catch {
    return null;
  }
}

/** Knopf "Fortsetzen" fuer den Startbildschirm, wenn es einen Spielstand gibt. */
export function fortsetzenHtml() {
  const info = schnellInfo();
  return info ? `<div class="fortsetzen"><button id="standFortsetzen">▶ Fortsetzen</button> <span>${info}</span></div>` : '';
}

/** Lohnt sich ein automatischer Spielstand? Nur fuer laufende eigene Partien ab einer Minute. */
export function autoSpeichernSinnvoll(world, zuschauen, wiederholung) {
  return !!world && !world.over && !zuschauen && !wiederholung && world.tick >= 600;
}

/** Kurzbeschreibung des Schnellspeichers fuer den Startbildschirm, '' wenn keiner da ist. */
export function schnellInfo() {
  const t = schnellLaden();
  if (!t) return '';
  const r = spielstandLesen(t);
  if (r.fehler) return '';
  const w = r.s.zustand.world;
  const wann = new Date(r.s.zeit);
  const uhr = `${wann.getDate()}.${wann.getMonth() + 1}. ${wann.getHours()}:${String(wann.getMinutes()).padStart(2, '0')}`;
  const volk = w.players[0].faction === 'mensch' ? 'Menschen' : 'Gott';
  const mission = r.s.extra && r.s.extra.missionTitel ? ` · ${r.s.extra.missionTitel}` : '';
  return `${volk}${mission}, ${(w.tick / 600).toFixed(1).replace('.', ',')} min — gespeichert ${uhr}`;
}
