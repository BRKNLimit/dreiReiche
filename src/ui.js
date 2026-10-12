// Darstellung und Eingabe. Gelaende-Zeichnung liegt in src/gelaende2d.js
// (siehe GEMINI.md). Aendert den Simulationszustand nie direkt,
// sondern nur ueber issue(). Wird von tools/bundle.mjs mit der Sim
// zusammengefuegt -- deshalb hier keine Imports.

const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
const mini = document.getElementById('mini');
const mctx = mini.getContext('2d');

let meFaction = 'mensch';
let world, ais = []; // ais[sitz]: die KI auf dem Sitz, null fuer den Menschen (beim Zuschauen sitzt auch auf ME eine)
let angriff = false; // A gedrueckt: naechster Klick ist eine Angriffsbewegung
let stats; // Auswertung der Partie, siehe zaehle()
let zeigeAuswertung = false;
let gegnerStil = 'standard'; // Stil der Gegner-KI, im Startbildschirm waehlbar
let gegnerStufe = 'mittel'; // Schwierigkeit der Gegner-KI, im Startbildschirm waehlbar
let gegnerVolk = 'auto'; // Volk des Gegners, im Startbildschirm waehlbar (auto: das andere)
let karteSchluessel = vorgewaehlteKarte(); // Karte, im Startbildschirm waehlbar (oder vom Editor gewaehlt)
let ME = 0; // eigener Sitzplatz -- online als Gast 1
let skillsOffen = false; // T: Skillbaum
let hilfeKlassen = ''; // zuletzt gesetzte Klassen der Hilfe (ohne-skills, ohne-faehigkeiten)
let skillSig = ''; // zuletzt gezeichneter Stand des Skillbaums
let zielen = null; // Griff gewaehlt: naechster Klick ist das Ziel (Faehigkeit)
let schlagZielen = false; // Fernschlag scharf (Taste F): naechster Klick ist das Ziel
const wirkungen = []; // Faehigkeits-Einsaetze, eine Sekunde lang sichtbar
let karteTyp = null; // Gebaeude unter der Maus in der Bauleiste
let nebel = neuerNebel(true, ME); // Nebel des Krieges; beim Zuschauen aus
let nebelFrame = 0; // Zaehler, damit das Nebelbild je Frame nur einmal entsteht
const verborgen = (e) => imNebel(nebel, e, ME);
let karteHtml = ''; // zuletzt gezeigte Info-Karte
let selPlan = null; // gewaehlter eigener Bauplan (kein Gebaeude, daher nicht in sel)
let gruppen = {}; // Steuergruppen: Ziffer -> Ids
let letzterKlick = { id: 0, zeit: 0 }; // fuer den Doppelklick
/** Eigene Einheiten desselben Typs, die gerade auf dem Schirm sind. */
function gleicherTypImBild(id) {
  const e0 = byId(world, id);
  if (!e0) return [id];
  return world.entities.filter((e) => !e.dead && e.player === ME && e.type === e0.type && imBild2d(e.x, e.y)).map((e) => e.id);
}
let mission = null; // laufende Mission der Kampagne (src/kampagne.js), sonst null
let missionStand = []; // erledigte Ziele der Mission
let missionGewonnen = false; // Ziele erfuellt -- die Partie haelt an
let missionMeldungen = []; // Indizes der schon gezeigten Funksprueche
let netz = null; // Online-Partie (src/netz.js): { kanal, gs, zu, wartetSeit }
let tagesAktiv = null; // laufende Tagesherausforderung (src/bilanz.js), sonst null
let tagesStart = null; // beim naechsten neu() als Tagesherausforderung starten
let funkText = ''; // aktueller Funkspruch (HTML) und bis wann er steht
let funkBis = 0;
let funkGezeigt = null;
let aufnahme = null; // laufende Aufnahme (src/aufnahme.js)
let wiederholung = null; // abgespielte Wiederholung, sonst null
let wdhZeiger = 0;
let verlauf = neuerVerlauf(); // fuer den Siegbildschirm
let endeGezeigt = false;
const musik = neueMusik(); // erzeugte Musik (src/musik.js), Taste N
const fx = neueEffekte(); // Geschosse, Treffer, Klaenge (src/effekte.js)
einstellungenAnwenden(einstellungenLesen(), fx, musik); // Lautstaerken, Wackeln (Menue, Einstellungen)
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
let bauGruppeSchl = 'wirtschaft'; // aktive Gruppe der Bauleiste (BAU_GRUPPEN in ui-gemeinsam.js)
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

function neu(f, zuschauen = false, wdh = null, m = null, stand = null, online = null) {
  // Eine laufende Online-Partie endet mit jeder neuen
  const altesNetz = netz;
  netz = null;
  if (altesNetz && altesNetz.kanal && (!online || online.kanal !== altesNetz.kanal)) altesNetz.kanal.close();
  ME = online ? online.ich : 0;
  const ohneKI = !!online || !!(wdh && wdh.online); // online spielen zwei Menschen
  tagesAktiv = stand ? stand.extra.tages || null : online || wdh ? null : tagesStart;
  tagesStart = null;
  // Spielstand (src/spielstand.js): Welt und KI von dort, Einstellungen aus extra
  const geladen = stand ? zustandLaden(stand.zustand) : null;
  if (stand) {
    gegnerStil = stand.extra.gegnerStil;
    gegnerStufe = stand.extra.gegnerStufe;
    karteSchluessel = stand.extra.karteSchluessel;
    m = stand.extra.mission ? missionVon(stand.extra.mission) : null;
  }
  // Wiederholung: dieselben Startwerte wie bei der Aufnahme
  if (wdh) {
    karteSchluessel = wdh.karte;
    gegnerStil = wdh.stil;
    gegnerStufe = wdh.stufe;
  }
  // Mission: Karte, Gegner und Volk legt sie fest (auch beim Abspielen)
  if (wdh && wdh.mission) m = missionVon(wdh.mission);
  mission = m;
  missionStand = stand && stand.extra.missionStand ? stand.extra.missionStand : m ? m.ziele.map(() => false) : [];
  missionMeldungen = stand && stand.extra.missionMeldungen ? stand.extra.missionMeldungen : [];
  funkBis = 0;
  missionGewonnen = false;
  if (m) {
    karteSchluessel = m.karte;
    gegnerStil = m.stil;
    gegnerStufe = m.stufe;
    f = m.volk;
  }
  meFaction = f;
  if (online) meFaction = online.config.factions[online.ich]; // als Gast das zweite Volk
  const seed = online ? online.config.seed : geladen ? geladen.world.seed : wdh ? wdh.seed : tagesAktiv ? tagesAktiv.seed : (Date.now() / 1000) | 0;
  const karte = online
    ? { schluessel: online.config.karte, daten: online.config.karteDaten || KARTEN[online.config.karte] }
    : geladen
      ? { schluessel: geladen.world.karte, daten: geladen.world.karteDaten }
      : karteFuerSpiel(karteSchluessel, wdh, seed);
  karteWaehlen(karte.schluessel, karte.daten);
  // Die Gegner: online der eine Mitspieler, sonst aus Wiederholung, Spielstand oder Startbildschirm --
  // auf Karten fuer 3 und 4 Spieler bis zu drei.
  const gegner = online
    ? [online.config.factions[1]]
    : wdh
      ? wdh.factions.slice(1)
      : geladen
        ? geladen.world.players.slice(1).map((pl) => pl.faction)
        : gegnerVolkListe(f, karte.daten, m ? 'auto' : gegnerVolk, gegnerWahlMehr);
  world = geladen ? geladen.world : createWorld({ seed, factions: [f, ...gegner], karte: karte.schluessel, karteDaten: karte.daten });
  if (m && !geladen) m.aufbau(world);
  // Zuschauen: auch auf dem eigenen Sitz spielt eine KI.
  ais = ohneKI ? [] : geladen ? geladen.ais : m && m.ki === false ? [] : kisErzeugen(world, ME, zuschauen, gegnerStil, gegnerStufe);
  nebel = neuerNebel(!zuschauen && !wdh, ME);
  wiederholung = wdh;
  wdhZeiger = 0;
  wiederholungsHinweis = '';
  aufnahme = wdh ? null : neueAufnahme({ seed: world.seed, factions: [f, ...gegner], karte: karte.schluessel, karteDaten: KARTEN[karte.schluessel] ? null : karte.daten, stil: gegnerStil, stufe: gegnerStufe, zuschauen, mission: m ? m.id : null, online: !!online });
  netz = online ? { kanal: online.kanal, gs: neuerGleichschritt(online.ich), zu: '', wartetSeit: 0 } : null;
  wdhStaende = [];
  spulenBis = -1;
  wdhSicht = 'alle';
  verlauf = stand ? stand.extra.verlauf : neuerVerlauf(world.players.length);
  if (stand) aufnahme = stand.extra.aufnahme;
  endeGezeigt = false;
  angriff = false;
  zeigeAuswertung = false;
  stats = neueStats(world.players.length);
  sel = [];
  placing = null;
  skillsOffen = false;
  skillSig = '';
  selPlan = null;
  leistenSig = '';
  gruppen = stand ? stand.extra.gruppen : {};
  effekteLeeren(fx);
  zielen = null;
  schlagZielen = false;
  wirkungen.length = 0;
  flaeche = neueFlaeche(world.players.length);
  cam.x = 3000;
  cam.y = 3000;
  if (stand && stand.extra.cam) Object.assign(cam, stand.extra.cam);
  else if (stand && stand.extra.kam) {
    cam.x = stand.extra.kam.x * 10;
    cam.y = stand.extra.kam.z * 10;
  }
  if (ME === 1) {
    const heim = startplatz(world.karteDaten, 1);
    cam.x = heim.x;
    cam.y = heim.y;
  }
  renderBar();
  zeitleisteZeigen();
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
    schlagZielen = false;
    // Rechtsklick auf einen sichtbaren Feind: gezielter Angriff
    const feind = sel.length ? feindBei(world, s2wx(mx), s2wy(my), 8 / cam.z, ME, (o) => !verborgen(o)) : null;
    if (feind) issue(world, { type: 'angreifen', player: ME, ids: sel.slice(), id: feind.id });
    else if (sel.length) befehl(s2wx(mx) | 0, s2wy(my) | 0, e.shiftKey);
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
  if (schlagZielen) {
    // Fernschlag: das erste geladene Gebaeude der Auswahl, das das Ziel erreicht und bezahlbar ist.
    // Liegt das Ziel ausser Reichweite, bleibt man im Zielmodus (rot gezeichnet) und kann es noch einmal versuchen.
    const x = s2wx(mx) | 0;
    const y = s2wy(my) | 0;
    const b = schlagSchuetze(world, sel, ME, x, y);
    if (b) {
      issue(world, { type: 'schlag', player: ME, id: b.id, x, y });
      if (!e.shiftKey) schlagZielen = false;
    }
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
    let naechste = 0; // Klick: nur die naechste Einheit (Doppelklick waehlt alle ihres Typs)
    let bestD = 16;
    for (const e of world.entities) {
      if (e.player !== ME || e.kind !== 'unit') continue;
      const sx = w2sx(e.x);
      const sy = w2sy(e.y);
      if (box) {
        if (sx >= x1 && sx <= x2 && sy >= y1 && sy <= y2) picked.push(e.id);
      } else if (Math.hypot(sx - x1, sy - y1) < bestD) {
        bestD = Math.hypot(sx - x1, sy - y1);
        naechste = e.id;
      }
    }
    if (naechste) picked.push(naechste);
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
    // Doppelklick auf eine Einheit: alle eigenen dieses Typs, die gerade im Bild sind
    if (!box && picked.length === 1) {
      const jetzt = performance.now();
      const doppelt = letzterKlick.id === picked[0] && jetzt - letzterKlick.zeit < 350;
      letzterKlick = { id: picked[0], zeit: jetzt };
      if (doppelt) picked.splice(0, 1, ...gleicherTypImBild(picked[0]));
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
  if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return; // Tippen in Feldern ist kein Befehl
  if (e.key === 'F10' || (e.key === 'Escape' && menueOffen)) {
    e.preventDefault();
    menueZeigen();
    return;
  }
  if (menueOffen) return;
  if (netz && (e.key === ' ' || e.key === '+' || e.key === '-')) return; // online laeuft die Zeit fuer beide gleich
  if (netz && e.key === 'Enter') {
    e.preventDefault();
    chatFeld.hidden = false;
    chatFeld.focus();
    return;
  }
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
  // Tab / Shift+Tab: Bau-Gruppe wechseln (nur mit Erbauer; sonst springt der Browser-Fokus)
  if (e.key === 'Tab' && erbauer().length) {
    e.preventDefault();
    bauGruppeWechseln(naechsteBauGruppe(bauGruppen(meFaction), bauGruppeSchl, e.shiftKey ? -1 : 1));
    return;
  }
  const liste = bauListe();
  const i = '1234567890'.indexOf(e.key);
  if (i >= 0 && liste[i] && erbauer().length && !gesperrt(world, ME, liste[i])) placing = liste[i];
  if (e.key === 'h') document.getElementById('hilfeKnopf').onclick();
  if (e.key === 'F5') {
    e.preventDefault(); // sonst laedt der Browser die Seite neu
    standSpeichern();
  }
  if (e.key === 'F9') {
    e.preventDefault();
    const t = schnellLaden();
    if (t) standLaden(t);
    else standHinweis('Kein Spielstand gespeichert (F5 speichert)');
  }
  if (e.key === 'Escape') {
    placing = null;
    angriff = false;
    zielen = null;
    schlagZielen = false;
    skillsOffen = false;
    sel = [];
    selPlan = null;
    document.getElementById('hilfe').hidden = true;
  }
  if (e.key === 't' && hatSkills(meFaction)) skillsOffen = !skillsOffen;
  // Kommandant gewaehlt: Q, W, E loesen seine Faehigkeiten aus.
  const kdtGewaehlt = kommandantVon(world, ME);
  const fi = 'qwe'.indexOf(e.key);
  if (fi >= 0 && kdtGewaehlt && sel.includes(kdtGewaehlt.id) && hatFaehigkeiten(meFaction)) {
    wirkeFaehigkeit(FACTIONS[meFaction].faehigkeiten[fi]);
    return;
  }
  if (e.key === 'a' && sel.some((id) => byId(world, id)?.kind === 'unit')) {
    angriff = true;
    placing = null;
  }
  // F: Fernschlag scharf (nur mit einem geladenen, bezahlbaren Schlaggebaeude in der Auswahl)
  if (e.key === 'f') schlagScharf();
  if (e.key === ' ') {
    paused = !paused;
    e.preventDefault();
  }
  if (e.key === 'i') zeigeAuswertung = !zeigeAuswertung;
  if (e.key === 'n') {
    tonAn(fx);
    standHinweis(musikSchalten(musik) ? 'Musik an' : 'Musik aus');
  }
  if (e.key === 'm') {
    stummSchalten(fx);
    tonKnopfZeigen();
  }
  if (e.key === '.') naechsterUntaetiger();
  if (e.key === 's' && sel.length) issue(world, { type: 'stopp', player: ME, ids: sel.slice() });
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
  if (!id || !faehigkeitenVon(world, ME).includes(id) || faehigkeitWarten(world, ME, id)) return;
  if (FAEHIGKEITEN[id].art === 'griff') {
    zielen = id;
    placing = null;
    angriff = false;
  } else {
    issue(world, { type: 'faehigkeit', player: ME, faehigkeit: id, x: 0, y: 0 });
  }
}

/** Fernschlag scharf stellen (oder wieder abschalten): nur, wenn ein Schlaggebaeude der Auswahl feuern kann. */
function schlagScharf() {
  if (schlagZielen) {
    schlagZielen = false;
    return;
  }
  const kann = schlagGebaeude(world, sel, ME).some((b) => schlagSchuetze(world, [b.id], ME, b.x, b.y));
  if (!kann) return;
  schlagZielen = true;
  placing = null;
  angriff = false;
  zielen = null;
}

// Knoepfe der Faehigkeiten: ein Klick loest aus. Derselbe Platz traegt den Fernschlag-Knopf.
document.getElementById('faehigkeiten').onclick = (ev) => {
  const b = ev.target && ev.target.closest ? ev.target.closest('[data-faeh]') : null;
  if (b && world) wirkeFaehigkeit(b.dataset.faeh);
  if (world && ev.target && ev.target.closest && ev.target.closest('[data-schlag]')) schlagScharf();
};
let faehHtml = '';

/** Knoepfe zeigen, solange der eigene Kommandant oder ein Schlaggebaeude gewaehlt ist. */
function faehPanel() {
  const k = kommandantVon(world, ME);
  const html = (k && sel.includes(k.id) ? faehigkeitenHtml(world, ME) : '') + schlagKnopfHtml(world, sel, ME);
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
  const sig = sel.join() + '|' + selPlan + '|' + skillSignatur(world, ME) + '|' + qSig + '|' + grenzenSignatur(world, ME, fabs) + '|' + bauGruppeSchl + '|' + meFaction;
  if (sig === leistenSig) return;
  leistenSig = sig;
  renderBar();
}

/** Skillbaum und Sperren neu zeichnen, sobald sich daran etwas aendert. */
function skillPanel() {
  // Ohne Skills (R0) kein Skillbaum, und die Hilfe laesst T und die Faehigkeiten weg
  if (!hatSkills(meFaction)) skillsOffen = false;
  const klassen = rollenKlassen(meFaction);
  if (klassen !== hilfeKlassen) {
    hilfeKlassen = klassen;
    document.getElementById('hilfe').className = klassen;
  }
  const el = document.getElementById('skills');
  el.hidden = !skillsOffen;
  const sig = skillSignatur(world, ME) + (skillsOffen ? '|offen' : '');
  if (sig === skillSig) return;
  skillSig = sig;
  renderBar();
  if (skillsOffen) {
    el.innerHTML = skillBaumHtml(world, ME);
    skillLinien(el);
  }
}
// Fenstergroesse geaendert: die Karten reihen sich um, die Linien des Skillbaums muessen mit
addEventListener('resize', () => {
  const el = document.getElementById('skills');
  if (skillsOffen && el && !el.hidden) skillLinien(el);
});

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

// Ton und Hilfe als Icons; Steuergruppen-Leiste (Klick waehlt die Gruppe)
function tonKnopfZeigen() {
  document.getElementById('tonKnopf').innerHTML = ICONS[fx.stumm ? 'stumm' : 'ton'] || (fx.stumm ? '🔇' : '🔊');
}
document.getElementById('tonKnopf').onclick = () => {
  tonAn(fx);
  stummSchalten(fx);
  tonKnopfZeigen();
};
if (ICONS.hilfe) document.getElementById('hilfeKnopf').innerHTML = ICONS.hilfe;
tonKnopfZeigen();
document.getElementById('steuer').onclick = (ev) => {
  const b = ev.target && ev.target.closest ? ev.target.closest('[data-sg]') : null;
  if (!b || !world) return;
  sel = (gruppen[b.dataset.sg] || []).filter((id) => byId(world, id));
  selPlan = null;
};
let steuerSig = '';
function steuerAnzeigen() {
  const sig = Object.keys(gruppen).map((n) => n + ':' + (gruppen[n] || []).filter((id) => byId(world, id)).length).join(',');
  if (sig === steuerSig) return;
  steuerSig = sig;
  document.getElementById('steuer').innerHTML = steuergruppenHtml(gruppen, world);
}



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
  // Rechtsklick auf eine eigene Einheit: ihrem Auftrag anschliessen
  const freund = eigeneEinheitBei(world, ME, x, y, Math.max(40, 10 / cam.z), sel);
  if (freund) return mitmachen(world, ME, sel, freund, anhaengen);
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

/** Die Gebaeude der aktiven Bau-Gruppe (Tasten 1-0 bauen aus ihr). */
function bauListe() {
  const gr = aktiveBauGruppe(bauGruppen(meFaction), bauGruppeSchl);
  return gr ? gr.liste : [];
}

/** Tab / Shift+Tab, Klick auf einen Reiter: Bau-Gruppe wechseln. */
function bauGruppeWechseln(schluessel) {
  bauGruppeSchl = schluessel;
  renderBar();
}

function renderBar() {
  const bar = document.getElementById('builds');
  const fabs = fabriken();
  if (erbauer().length) {
    bar.innerHTML = bauleisteHtml(world, ME, bauGruppen(meFaction), bauGruppeSchl);
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
  for (const b of bar.querySelectorAll('[data-reiter]')) b.onclick = () => bauGruppeWechseln(b.dataset.reiter);
  for (const b of bar.querySelectorAll('[data-produce]')) {
    b.onclick = (ev) => ausbildenVerteilt(world, ME, fabs, b.dataset.produce, ev && ev.shiftKey ? 5 : 1); // Shift: fuenf
    b.onmouseenter = () => (karteTyp = b.dataset.produce);
    b.onmouseleave = () => (karteTyp = null);
  }
}

// ------------------------------------------------------------ Schleife
/** Ein Tick der Simulation; false, solange online der Mitspieler fehlt. still: ohne Effekte (Spulen). */
function tick2d(still = false) {
  let netzOffen = null; // online: eigene Befehle, die erst mit dem naechsten Tick gehen
  if (netz) {
    if (netz.zu) return false;
    gsSenden(netz.gs, world, netzPost);
    if (!gsBereit(netz.gs, world.tick)) {
      if (!netz.wartetSeit) netz.wartetSeit = performance.now();
      return false;
    }
    netz.wartetSeit = 0;
    netzOffen = gsEinsetzen(netz.gs, world);
  }
  wdhStandMerken();
  if (wiederholung) wdhZeiger = abspielen(wiederholung, world, wdhZeiger);
  else if (aufnahme) aufnehmen(aufnahme, world);
  for (const a of ais) if (a) stepAI(a, world);
  if (mission && mission.takt) mission.takt(world); // Missionsereignisse, auch beim Abspielen
  step(world);
  if (netz) gsNachSchritt(netz.gs, world, netzOffen, netzPost);
  verlaufFortschreiben(verlauf, world);
  if (wiederholung && world.tick >= wiederholung.ende && !world.over) paused = true;
  if (!still) {
    for (const ev of world.events) if (ev.t === 'faehigkeit') wirkungen.push({ ...ev, bis: world.tick + 12 });
    effekteAusEreignissen(fx, world, ME, sichtbarFx, hoerer2d(), imBild2d);
    musikEreignisse(musik, world);
  }
  zaehle();
  sel = sel.filter((id) => byId(world, id));
  return true;
}

function frame(now) {
  const dt = Math.max(0, Math.min(250, now - last)); // nie rueckwaerts, nie mehr als eine Viertelsekunde
  last = now;
  wdhSpulen(tick2d);
  if (spulenBis < 0 && !paused && !world.over && !missionGewonnen) {
    acc += dt * speed;
    let guard = 0;
    while (acc >= TICK_MS && guard++ < 12) {
      if (tick2d() === false) {
        acc = Math.min(acc, TICK_MS); // online: auf den Mitspieler warten
        break;
      }
      acc -= TICK_MS;
    }
  }
  effekteFortschreiben(fx, paused ? 0 : (dt * speed) / 1000, world, hoerer2d());
  musikFortschreiben(musik, fx, meFaction, dt / 1000);
  missionFortschritt();
  missionFunk();
  zeitleisteAktualisieren();
  if ((world.over || missionGewonnen) && !endeGezeigt) zeigeEnde();
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
  drawSchilde();
  drawSchlaege();
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
  steuerAnzeigen();
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
  ctx.strokeStyle = spielerFarbe(world, ME);
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
    ctx.strokeStyle = spielerFarbe(world, e.player);
    ctx.globalAlpha = e.powered ? 0.45 : 0.15;
    ctx.beginPath();
    ctx.arc(w2sx(e.x), w2sy(e.y), buff.radius * cam.z, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}

/**
 * Schildkuppeln als Kreis um eigene Schildgebaeude (gewaehlte kraeftiger), die
 * Deckkraft folgt der Ladung. Fremde nur, wenn man sie sieht und anklickt.
 */
function drawSchilde() {
  ctx.setLineDash([]);
  for (const e of world.entities) {
    if (e.dead || e.kind !== 'building' || !e.done || verborgen(e)) continue;
    const s = BUILDINGS[e.type].schild;
    if (!s) continue;
    const gewaehlt = sel.includes(e.id);
    if (e.player !== ME && !gewaehlt) continue;
    const fuell = Math.min(1, e.schildPunkte / s.kapazitaet);
    ctx.strokeStyle = '#7ab8ff';
    ctx.fillStyle = '#7ab8ff';
    ctx.lineWidth = gewaehlt ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.arc(w2sx(e.x), w2sy(e.y), s.radius * cam.z, 0, Math.PI * 2);
    ctx.globalAlpha = 0.1 + 0.6 * fuell;
    ctx.stroke();
    ctx.globalAlpha = 0.08 * fuell;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.lineWidth = 1;
}

/**
 * Fernschlaege im Flug: ein roter Kreis am Ziel, den alle sehen (auch im Nebel),
 * mit dem Countdown in Sekunden. Je naeher der Einschlag, desto dichter die Farbe.
 */
function drawSchlaege() {
  if (!world.schlaege.length) return;
  ctx.save();
  ctx.setLineDash([]);
  for (const s of world.schlaege) {
    const rest = Math.max(0, s.landet - world.tick);
    const x = w2sx(s.x);
    const y = w2sy(s.y);
    ctx.strokeStyle = '#e8503a';
    ctx.fillStyle = '#e8503a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, s.radius * cam.z, 0, Math.PI * 2);
    ctx.globalAlpha = 0.9;
    ctx.stroke();
    ctx.globalAlpha = 0.08 + 0.2 * Math.max(0, 1 - rest / 100);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.ceil(rest / 10) + ' s', x, y);
  }
  ctx.restore();
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
  for (let p = 0; p < world.players.length; p++) {
    const col = spielerFarbe(world, p);
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
    ctx.strokeStyle = spielerFarbe(world, b.player);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(w2sx(b.x) - r, w2sy(b.y) - r, r * 2, r * 2);
  }
  ctx.globalAlpha = 1;
  for (const e of world.entities) {
    if (verborgen(e)) continue;
    const col = spielerFarbe(world, e.player);
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
  // Routen gewaehlter Einheiten: ab der Einheit ueber Baustellen und Wegpunkte (Shift)
  const punkteGemalt = new Set();
  ctx.lineWidth = 1.2;
  ctx.globalAlpha = 0.75;
  for (const id of sel.slice(0, 60)) {
    const u = byId(world, id);
    if (!u || u.kind !== 'unit') continue;
    const route = routeVon(world, u);
    if (route.length < 2) continue;
    ctx.strokeStyle = '#e8dcc0';
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(w2sx(route[0][0]), w2sy(route[0][1]));
    for (const [x, y] of route.slice(1)) ctx.lineTo(w2sx(x), w2sy(y));
    ctx.stroke();
    ctx.setLineDash([]);
    for (const [x, y, art] of route.slice(1)) {
      const schluessel = x + ',' + y;
      if (punkteGemalt.has(schluessel)) continue;
      punkteGemalt.add(schluessel);
      ctx.fillStyle = art === 'angriff' ? '#e06a4a' : art === 'bau' ? '#d8b06a' : '#e8dcc0';
      ctx.beginPath();
      ctx.arc(w2sx(x), w2sy(y), 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  // Sammelpunkte gewaehlter Fabriken: gestrichelte Linie und Fahne
  ctx.strokeStyle = spielerFarbe(world, ME);
  ctx.fillStyle = spielerFarbe(world, ME);
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
  if (schlagZielen) {
    // Fernschlag scharf: Einschlagkreis am Mauszeiger, Reichweiten der bereiten Gebaeude gestrichelt;
    // rot, solange keins das Ziel erreicht. Ohne Schlaggebaeude in der Auswahl endet der Zielmodus.
    const gs = schlagGebaeude(world, sel, ME);
    if (!gs.length) schlagZielen = false;
    const schuetze = schlagSchuetze(world, sel, ME, hover.x, hover.y);
    const s = schuetze ? BUILDINGS[schuetze.type].schlag : gs.length ? BUILDINGS[gs[0].type].schlag : null;
    if (s) {
      ctx.strokeStyle = schuetze ? '#e8503a' : '#8a8a8a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(w2sx(hover.x), w2sy(hover.y), s.radius * cam.z, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;
      for (const b of gs) {
        if (!schlagBereit(b)) continue;
        ctx.beginPath();
        ctx.arc(w2sx(b.x), w2sy(b.y), BUILDINGS[b.type].schlag.reichweite * cam.z, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }
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
  const col = gerodet || ohneAder || fels ? COL.bad : drin ? spielerFarbe(world, ME) : COL.gold;

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
      <b>Zeit</b><span>${(world.tick / 600).toFixed(1)} min${paused ? ' ⏸' : ''}${speed !== 1 ? ' ×' + speed : ''}${wiederholung ? ' · Wiederholung' : ais[0] ? ' · Zuschauen' : netz ? ' · Online' : tagesAktiv ? ' · Tagesherausforderung' : ''}</span>
    </div>
    ${spielerLeisteHtml(world, wiederholung || ais[0] ? -1 : ME)}${(wiederholung && wdhSicht === 'alle') || ais[0] ? beobachterHtml(world) : ''}${mission ? zieleHtml(mission, missionStand, world) : ''}${netzHinweis()}${standMeldung && performance.now() < standMeldungBis ? `<div class="warn"><span>${standMeldung}</span></div>` : ''}${warnungenHtml(world, ME)}${wiederholungsHinweis ? `<div class="warn"><span>${wiederholungsHinweis}</span></div>` : ''}
    ${auswahlHtml()}
    ${(world.over || !(wiederholung || ais[0])) && endeAnzeige(world, ME) ? `<div class="over">${endeAnzeige(world, ME)}</div>` : ''}
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
function neueStats(n = 2) {
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
  return Array.from({ length: n }, seite);
}

function zaehle() {
  for (let p = 0; p < world.players.length; p++) {
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
  const gedrosselt = world.players.map(() => false);
  const still = world.players.map(() => false);
  for (const e of world.entities) {
    if (e.dead || e.kind !== 'building' || e.done) continue;
    if (e.powered === 0) still[e.player] = true;
    else if (e.powered < 1000) gedrosselt[e.player] = true;
  }
  for (let p = 0; p < world.players.length; p++) {
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
  // Du zuerst, dann die Gegner in Sitzreihenfolge
  const reihe = [ME, ...world.players.map((_, p) => p).filter((p) => p !== ME)];
  const zeile = (name, f) => `<b>${name}</b>${reihe.map((p) => `<span>${f(stats[p])}</span>`).join('')}`;
  const kopf = reihe.map((p, i) => `<span class="evh" style="color:${spielerFarbe(world, p)}">${i === 0 ? 'du' : reihe.length > 2 ? volkName(world.players[p].faction) : 'Gegner'}</span>`).join('');
  return `<div class="eval">
    <div class="fac">Auswertung${world.over ? '' : ' (I)'}</div>
    <div class="evg" style="grid-template-columns:1fr${' auto'.repeat(reihe.length)}">
      <b></b>${kopf}
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
let flaeche = neueFlaeche(2);
function neueFlaeche(n) {
  return { tick: -1, ha: Array(n).fill(0), verlauf: Array.from({ length: n }, () => []) };
}

function messeFlaeche() {
  if (flaeche.tick >= 0 && world.tick >= flaeche.tick && world.tick - flaeche.tick < 50) return;
  flaeche.tick = world.tick;
  const zellen = world.players.map(() => 0);
  for (let y = FLAECHE_RASTER >> 1; y < MAP; y += FLAECHE_RASTER) {
    for (let x = FLAECHE_RASTER >> 1; x < MAP; x += FLAECHE_RASTER) {
      for (let p = 0; p < world.players.length; p++) if (inDomain(world, p, x, y)) zellen[p]++;
    }
  }
  const zelleHa = (FLAECHE_RASTER * FLAECHE_RASTER) / 1e6; // dm² -> ha
  flaeche.ha = zellen.map((z) => Math.round(z * zelleHa));
  const n = Math.floor(world.tick / 300); // alle 30 s ein Punkt
  for (let p = 0; p < world.players.length; p++) {
    flaeche.verlauf[p][n] = flaeche.ha[p];
  }
}

function flaecheHtml() {
  messeFlaeche();
  const v = flaeche.verlauf;
  const len = Math.max(v[0].length, 2);
  const top = Math.max(1, ...v.flatMap((r) => r.filter(Number.isFinite)));
  const linie = (arr) =>
    arr
      .map((h, i) => (Number.isFinite(h) ? `${((i / (len - 1)) * 240).toFixed(1)},${(36 - (h / top) * 34).toFixed(1)}` : ''))
      .filter(Boolean)
      .join(' ');
  const farbe = (p) => spielerFarbe(world, p);
  const gegner = world.players.map((_, p) => p).filter((p) => p !== ME);
  return `<div class="area">
      <div class="res">
        <b>Domäne</b><span style="color:${farbe(ME)}">${flaeche.ha[ME]} ha</span>
        ${gegner.map((g) => `<b>${gegner.length > 1 ? volkName(world.players[g].faction) : 'Gegner'}</b><span style="color:${farbe(g)}">${flaeche.ha[g]} ha</span>`).join('')}
      </div>
      <svg viewBox="0 0 240 38" preserveAspectRatio="none" class="spark">
        ${gegner.map((g) => `<polyline points="${linie(v[g])}" fill="none" stroke="${farbe(g)}" stroke-width="1.2" opacity=".6"/>`).join('')}
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
  for (let p = 0; p < world.players.length; p++) {
    mctx.fillStyle = spielerFarbe(world, p);
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
    ${neuheitenHtml()}
    ${fortsetzenHtml()}
    ${kampagneHtml()}
    ${onlineHtml()}
    ${bilanzHtml()}
    ${kodexKnopfHtml()}
    <details class="regeln"><summary>Spielregeln in Kürze</summary>
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
    ${Object.keys(FACTIONS).some(hatSkills) ? `Mit der Zeit kommen <b>Skillpunkte</b> (<kbd>T</kbd>): Sie schalten Fernkämpfer, schwere Einheiten,
    Schreine, Verbesserungen und drei Fähigkeiten des Kommandanten frei — Kommandant wählen, dann
    <kbd>Q</kbd>–<kbd>E</kbd> oder die Knöpfe. Wer lange lebt,
    sammelt ein wenig Erfahrung.` : ''}</p>
    <p class="achten">Die Domäne ist das Werkzeug, nicht das Ziel: Wann fordert sie eine Entscheidung — und wann nervt sie?</p>
    </details>
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
    ${gegnerVolkHtml(gegnerVolk)}
    ${kartenWahlHtml(karteSchluessel)}
${wiederholungWahlHtml()}
    <div class="go">
      <button id="introMensch">Als Menschen spielen</button>
      <button id="introGott">Als Gott spielen</button>
      <button id="introTod">Als Todesgott spielen</button>
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
  const volk = gegnerWahlLesen(); // Gegner 1 (und, auf Karten fuer 3 und 4 Spieler, 2 und 3)
  if (volk) gegnerVolk = volk;
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
  if (mission && !wiederholung) {
    const gewonnen = missionGewonnen || world.winner === ME;
    const neue = ergebnisErfassen(gewonnen);
    missionEndeZeigen(el, mission, gewonnen, { waehle: missionWaehlen, menue: startbildschirm, welt: world });
    el.insertAdjacentHTML('beforeend', neueErfolgeHtml(neue));
    return;
  }
  const gewonnen = world.winner === ME;
  const neue = ergebnisErfassen(gewonnen);
  const tagesZeile = tagesAktiv && gewonnen ? `<div class="neueErfolge"><div>📅 <b>Tagesherausforderung geschafft</b> in ${(world.tick / 600).toFixed(1).replace('.', ',')} Minuten</div></div>` : '';
  el.innerHTML = siegHtml(world, verlauf, ME, !!aufnahme, !!wiederholung) + tagesZeile + neueErfolgeHtml(neue);
  el.style.display = '';
  const knopf = (id, f) => {
    const b = document.getElementById(id);
    if (b) b.onclick = f;
  };
  knopf('endeSpeichern', () => aufnahmeSpeichern(aufnahme));
  knopf('endeKarte', () => (el.style.display = 'none'));
  knopf('endeNochmal', () => startbildschirm());
}

// ------------------------------------------------------------ Kampagne (src/kampagne.js)
/** Vorwort zeigen; "Los" startet die Mission. */
function missionWaehlen(m) {
  paused = true;
  vorwortZeigen(document.getElementById('intro'), m, () => {
    paused = false;
    neu(m.volk, false, null, m);
  }, startbildschirm);
}

/** Funksprueche: faellige Meldung der Mission zeigen, neun Sekunden lang. */
function missionFunk() {
  if (mission && !world.over && !missionGewonnen) {
    const mld = naechsteMeldung(mission, missionMeldungen, world, ME, missionStand);
    if (mld) {
      funkText = funkHtml(mld);
      funkBis = performance.now() + 9000;
      meldungsKlang(fx);
    }
  }
  const zeigen = performance.now() < funkBis ? funkText : '';
  if (zeigen !== funkGezeigt) {
    document.getElementById('funk').innerHTML = zeigen;
    funkGezeigt = zeigen;
  }
}

/** Ziele pruefen (je Bild); sind alle erfuellt, ist die Mission gewonnen. */
function missionFortschritt() {
  if (!mission || wiederholung || world.over || missionGewonnen) return;
  if (missionPruefen(mission, missionStand, world, ME, { sel, gruppen }) && mission.sieg === 'ziele') missionGewonnen = true;
}

// ------------------------------------------------------------ Spielstaende (src/spielstand.js)
let standMeldung = '';
let standMeldungBis = 0;
function standHinweis(text) {
  standMeldung = text;
  standMeldungBis = performance.now() + 2500;
}
function standText() {
  return spielstandText(world, ais, {
    meFaction,
    zuschauen: !!ais[0],
    gegnerStil,
    gegnerStufe,
    karteSchluessel,
    mission: mission ? mission.id : null,
    missionTitel: mission ? mission.titel : '',
    missionStand,
    missionMeldungen,
    tages: tagesAktiv,
    aufnahme,
    verlauf,
    gruppen,
    cam: { x: cam.x, y: cam.y, z: cam.z },
  });
}
/** F5: Schnellspeichern (auch automatisch beim Verlassen der Seite). */
function standSpeichern() {
  if (netz) return standHinweis('Online gibt es keine Spielstände');
  if (!world || world.over || wiederholung || missionGewonnen) return standHinweis('Hier gibt es nichts zu speichern');
  standHinweis(schnellSpeichern(standText()) ? 'Gespeichert — F9 lädt' : 'Speichern fehlgeschlagen (Speicher voll?)');
}
/** F9 oder "Fortsetzen": Spielstand laden und weiterspielen. */
function standLaden(text) {
  if (netz && !netz.zu && !world.over) return standHinweis('Online gibt es keine Spielstände');
  const r = spielstandLesen(text || '');
  if (r.fehler) return standHinweis(r.fehler);
  document.getElementById('intro').style.display = 'none';
  paused = false;
  neu(r.s.extra.meFaction, r.s.extra.zuschauen, null, null, r.s);
  wiederholungsHinweis = r.warnung;
  standHinweis('Spielstand geladen');
}
function autoSpeichern() {
  if (autoSpeichernSinnvoll(world, !!ais[0], wiederholung) && !missionGewonnen && !netz) schnellSpeichern(standText());
}
addEventListener('pagehide', autoSpeichern);
addEventListener('visibilitychange', () => {
  if (document.hidden) autoSpeichern();
});

// ------------------------------------------------------------ Wiederholung: Zeitleiste, Springen, Sicht
let wdhStaende = []; // jede Minute ein Stand: { tick, zustand, zeiger, verlauf } -- zum Zurueckspringen
let spulenBis = -1; // Ziel beim Spulen (Tick), sonst -1
let wdhSicht = 'alle'; // 'alle' oder der Sitzplatz, durch dessen Augen man sieht
let reglerZieht = false;
const wdhZeit = (t) => {
  const s = Math.max(0, Math.round(t / 10));
  return ((s / 60) | 0) + ':' + String(s % 60).padStart(2, '0');
};
function wdhStandMerken() {
  if (!wiederholung || world.tick % 600 !== 0 || wdhStaende.some((s) => s.tick === world.tick)) return;
  wdhStaende.push({ tick: world.tick, zustand: zustandSichern(world, ais), zeiger: wdhZeiger, verlauf: JSON.parse(JSON.stringify(verlauf)) });
}
/** Zu einem Tick springen: zurueck ueber den letzten Stand davor, dann vorspulen. */
function wdhSpringen(ziel) {
  if (!wiederholung) return;
  ziel = Math.max(0, Math.min(wiederholung.ende, ziel | 0));
  let bester = null;
  for (const s of wdhStaende) if (s.tick <= ziel && (!bester || s.tick > bester.tick)) bester = s;
  if (bester && (ziel < world.tick || bester.tick > world.tick)) {
    const g = zustandLaden(bester.zustand);
    world = g.world;
    ais = g.ais;
    wdhZeiger = bester.zeiger;
    verlauf = JSON.parse(JSON.stringify(bester.verlauf));
    endeGezeigt = false;
    sel = [];
    effekteLeeren(fx);
    nebel = neuerNebel(wdhSicht !== 'alle', ME);
    wirkungen.length = 0;
    stats = neueStats(world.players.length);
  }
  spulenBis = ziel;
}
/** Je Bild: beim Spulen so viele Ticks wie in 30 ms passen, ohne Effekte. */
function wdhSpulen(tickFn) {
  if (spulenBis < 0) return;
  const bis = performance.now() + 30;
  while (world.tick < spulenBis && !world.over && performance.now() < bis) tickFn(true);
  if (world.tick >= spulenBis || world.over) spulenBis = -1;
}
/** Sicht in der Wiederholung: alles, oder mit Nebel durch die Augen eines Spielers. */
function wdhSichtSetzen(v) {
  wdhSicht = v;
  if (v !== 'alle') {
    ME = v;
    meFaction = world.players[v].faction;
    // Kamera zur Basis dieses Spielers
    const heim = world.entities.find((e) => e.player === v && e.kind === 'building' && BUILDINGS[e.type].vital);
    if (heim) {
      cam.x = heim.x;
      cam.y = heim.y;
    }
  }
  nebel = neuerNebel(v !== 'alle', ME);
  sel = [];
  leistenSig = '';
  zeitleisteZeigen();
}
function zeitleisteZeigen() {
  const el = document.getElementById('zeitleiste');
  if (!wiederholung) {
    el.hidden = true;
    el.innerHTML = '';
    return;
  }
  const name = (p) => volkName(world.players[p].faction);
  const knopf = (wert, text, an) => `<button data-${wert}${an ? ' class="an"' : ''}>${text}</button>`;
  el.innerHTML = `<button id="wdhSpiel" title="Abspielen / Anhalten (Leertaste)">⏯</button>
    <button data-sprung="-300" title="30 s zurück">−30 s</button><button data-sprung="300" title="30 s vor">+30 s</button>
    <input id="wdhRegler" type="range" min="0" max="${wiederholung.ende}" step="10" value="${world.tick}">
    <span id="wdhZeit"></span>
    <span class="gruppe">${[1, 2, 4, 8, 16].map((t) => knopf('tempo="' + t + '"', '×' + t, speed === t)).join('')}</span>
    <span class="gruppe">${knopf('sicht="alle"', 'Alles', wdhSicht === 'alle')}${world.players.map((_, p) => knopf('sicht="' + p + '"', name(p), wdhSicht === p)).join('')}</span>`;
  el.hidden = false;
  el.onclick = (e) => {
    const b = e.target.closest ? e.target.closest('button') : null;
    if (!b) return;
    if (b.id === 'wdhSpiel') paused = !paused;
    else if (b.dataset.sprung) wdhSpringen(world.tick + Number(b.dataset.sprung));
    else if (b.dataset.tempo) {
      speed = Number(b.dataset.tempo);
      zeitleisteZeigen();
    } else if (b.dataset.sicht) wdhSichtSetzen(b.dataset.sicht === 'alle' ? 'alle' : Number(b.dataset.sicht));
  };
  const regler = document.getElementById('wdhRegler');
  regler.onpointerdown = () => (reglerZieht = true);
  regler.onpointerup = () => (reglerZieht = false);
  regler.oninput = () => (document.getElementById('wdhZeit').textContent = `→ ${wdhZeit(Number(regler.value))} / ${wdhZeit(wiederholung.ende)}`);
  regler.onchange = () => {
    reglerZieht = false;
    wdhSpringen(Number(regler.value));
  };
}
/** Je Bild: Regler und Zeit nachfuehren (nicht, waehrend man zieht). */
function zeitleisteAktualisieren() {
  if (!wiederholung || reglerZieht) return;
  const regler = document.getElementById('wdhRegler');
  if (!regler) return;
  regler.value = world.tick;
  const text = `${wdhZeit(world.tick)} / ${wdhZeit(wiederholung.ende)}${spulenBis >= 0 ? ' · spule …' : paused ? ' · angehalten' : ''}`;
  const z = document.getElementById('wdhZeit');
  if (z.textContent !== text) z.textContent = text;
}

// ------------------------------------------------------------ Bilanz und Erfolge (src/bilanz.js)
/** Ende einer eigenen Partie eintragen (nicht beim Zuschauen oder Abspielen); liefert neue Erfolge. */
function ergebnisErfassen(gewonnen) {
  if (wiederholung || ais[0]) return [];
  const k = mission ? mission.kampagne : null;
  return partieErfassen({
    gewonnen,
    volk: meFaction,
    stufe: gegnerStufe,
    stil: gegnerStil,
    karte: world.karte,
    minuten: world.tick / 600,
    verluste: verlauf.verluste[ME],
    ausgebildet: verlauf.ausgebildet[ME],
    online: !!netz,
    tages: tagesAktiv ? tagesAktiv.tag : 0,
    mission: mission ? mission.id : null,
    kampagneFertig: k && gewonnen && k.missionen[k.missionen.length - 1] === mission ? k.id : null,
  });
}
function tagesAnnehmen() {
  const h = tagesHerausforderung();
  karteSchluessel = 'zufall';
  gegnerStil = h.stil;
  gegnerStufe = h.stufe;
  tagesStart = h;
  document.getElementById('intro').style.display = 'none';
  paused = false;
  neu(h.volk);
}

// ------------------------------------------------------------ Online (src/netz.js)
function netzPost(msg) {
  if (netz) netzSenden(netz.kanal, msg);
}
/** Hinweise im HUD: Warten auf den Mitspieler, getrennt, auseinandergelaufen. */
function netzHinweis() {
  if (!netz) return '';
  if (netz.zu) return `<div class="warn"><span>${netz.zu} — F10: Hauptmenü</span></div>`;
  if (netz.gs.asynchron >= 0) return `<div class="warn"><span>Die Partien sind auseinandergelaufen (Tick ${netz.gs.asynchron}) — bitte neu starten.</span></div>`;
  if (netz.wartetSeit && performance.now() - netz.wartetSeit > 700) return '<div class="warn"><span>Warte auf den Mitspieler …</span></div>';
  return '';
}
/** Rueckrufe fuer die Online-Dialoge: Karte aus dem Startbildschirm, Start, Nachrichten, Abbruch. */
function onlineRueckrufe() {
  return {
    karte: () => {
      const r = document.querySelector?.('#intro input[name="karte"]:checked');
      if (r) karteSchluessel = r.value;
      return karteFuerSpiel(karteSchluessel, null, (Date.now() / 1000) | 0);
    },
    start: (config, ich, kanal) => {
      document.getElementById('intro').style.display = 'none';
      paused = false;
      speed = 1;
      neu(config.factions[0], false, null, null, null, { config, ich, kanal });
    },
    nachricht: (msg) => {
      if (msg.t === 'chat') chatZeigen(FACTIONS[world.players[1 - ME].faction].name, msg.text);
      else if (netz) gsEmpfangen(netz.gs, msg);
    },
    zu: (grund) => {
      if (netz) netz.zu = grund || 'Verbindung zum Mitspieler getrennt';
    },
    zurueck: startbildschirm,
  };
}

// Chat (nur online): Enter oeffnet das Feld, Enter sendet, Esc schliesst
const chatFeld = document.getElementById('chat');
function chatZeigen(wer, text) {
  funkText = funkHtml({ wer, text: textSicher(text) });
  funkBis = performance.now() + 8000;
  meldungsKlang(fx);
}
function chatSchliessen() {
  chatFeld.value = '';
  chatFeld.hidden = true;
  chatFeld.blur();
}
chatFeld.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const text = chatFeld.value.trim().slice(0, 200);
    if (text && netz) {
      netzPost({ t: 'chat', text });
      chatZeigen('Du', text);
    }
    chatSchliessen();
  } else if (e.key === 'Escape') chatSchliessen();
});

// ------------------------------------------------------------ Pausenmenue (F10)
let menueOffen = false;
let pauseVorMenue = false;
function menueZeigen() {
  if (menueOffen) return menueSchliessen();
  const el = document.getElementById('intro');
  if (el.style.display !== 'none') return; // Start-, End- oder Missionsbildschirm ist offen
  menueOffen = true;
  pauseVorMenue = paused;
  if (!netz) paused = true; // online laeuft die Partie weiter
  const laufend = !world.over && !wiederholung && !missionGewonnen;
  el.innerHTML = menueHtml(laufend, !netz && !!schnellLaden(), !netz);
  el.style.display = '';
  const knopf = (id, f) => {
    const b = document.getElementById(id);
    if (b) b.onclick = f;
  };
  knopf('menueWeiter', menueSchliessen);
  knopf('menueSpeichern', () => {
    menueSchliessen();
    standSpeichern();
  });
  knopf('menueLaden', () => {
    menueOffen = false;
    standLaden(schnellLaden());
  });
  knopf('menueEinstellungen', () => {
    el.innerHTML = einstellungenHtml(einstellungenLesen());
    einstellungenVerdrahten(fx, musik, () => {
      menueOffen = false;
      paused = pauseVorMenue;
      el.style.display = 'none';
      menueZeigen();
    });
  });
  knopf('menueHilfe', () => {
    menueSchliessen();
    document.getElementById('hilfeKnopf').onclick();
  });
  knopf('menueAufgeben', () => {
    menueSchliessen();
    paused = false;
    issue(world, { type: 'aufgeben', player: ME });
  });
  knopf('menueHaupt', () => {
    menueOffen = false;
    autoSpeichern(); // "Fortsetzen" bringt einen zurueck
    startbildschirm();
  });
}
function menueSchliessen() {
  menueOffen = false;
  paused = pauseVorMenue;
  document.getElementById('intro').style.display = 'none';
}
document.getElementById('menueKnopf').onclick = menueZeigen;

// ------------------------------------------------------------ Ansicht wechseln
// Laeuft eine eigene Partie, nimmt der Knopf 2D/3D sie mit: Spielstand
// sichern, andere Seite mit #weiter oeffnen, dort sofort laden.
document.getElementById('ansichtWechsel').onclick = (e) => {
  const laeuft = world && !world.over && !wiederholung && !netz && !missionGewonnen && document.getElementById('intro').style.display === 'none';
  if (!laeuft || !schnellSpeichern(standText())) return; // sonst einfach die andere Seite
  e.preventDefault();
  location.href = e.currentTarget.getAttribute('href') + '#weiter';
};
function vonAndererAnsichtWeiter() {
  if (typeof location === 'undefined' || location.hash !== '#weiter') return;
  if (typeof history !== 'undefined' && history.replaceState) history.replaceState(null, '', location.pathname + location.search);
  const t = schnellLaden();
  if (t) standLaden(t);
}

/** Startbildschirm zeigen und verdrahten. */
function startbildschirm() {
  const el = document.getElementById('intro');
  el.innerHTML = introHtml();
  el.style.display = '';
  document.getElementById('introMensch').onclick = () => starte('mensch', false);
  document.getElementById('introGott').onclick = () => starte('gott', false);
  document.getElementById('introTod').onclick = () => starte('tod', false);
  document.getElementById('introSchau').onclick = () => starte('mensch', true);
  kampagneVerdrahten(el, missionWaehlen);
  kartenVorschauVerdrahten(el);
  const neuKnopf = document.getElementById('neuheitenOk');
  if (neuKnopf) {
    neuKnopf.onclick = () => {
      neuheitenGesehen();
      startbildschirm();
    };
  }
  const kodexKnopf = document.getElementById('kodexOeffnen');
  if (kodexKnopf) kodexKnopf.onclick = () => kodexZeigen(el, startbildschirm);
  const tagesKnopf = document.getElementById('tagesStart');
  if (tagesKnopf) tagesKnopf.onclick = tagesAnnehmen;
  const erfolgeKnopf = document.getElementById('erfolgeZeigen');
  if (erfolgeKnopf) {
    erfolgeKnopf.onclick = () => {
      el.innerHTML = erfolgeHtml();
      document.getElementById('erfolgeZurueck').onclick = startbildschirm;
    };
  }
  const eroeffnen = document.getElementById('onlineEroeffnen');
  if (eroeffnen) eroeffnen.onclick = () => onlineEroeffnen(el, onlineRueckrufe());
  const beitreten = document.getElementById('onlineBeitreten');
  if (beitreten) beitreten.onclick = () => onlineBeitreten(el, onlineRueckrufe());
  const weiterKnopf = document.getElementById('standFortsetzen');
  if (weiterKnopf) weiterKnopf.onclick = () => standLaden(schnellLaden());
  const datei = document.getElementById('wiederholungDatei');
  if (datei) datei.onchange = () => wiederholungLaden(datei);
  const kDatei = document.getElementById('karteDatei');
  if (kDatei) {
    kDatei.onchange = () =>
      karteDateiLaden(kDatei, (meldung) => {
        if (meldung) {
          const m = document.getElementById('karteMeldung');
          if (m) m.textContent = meldung;
        } else {
          karteSchluessel = 'eigen:' + (eigeneKarten().length - 1);
          startbildschirm();
        }
      });
  }
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
vonAndererAnsichtWeiter();
resize();
requestAnimationFrame(frame);
