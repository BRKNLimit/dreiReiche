// Kampagnen: "Die Rodung" (vier Missionen aus Sicht der Menschen, die in
// den Wald des Gottes vordringen) und "Der Zorn des Waldes" (drei aus Sicht
// des Gottes, der sie wieder vertreibt). Nur Oberflaeche -- die Simulation kennt keine
// Missionen. Eine Mission legt fest, auf welcher Karte gegen welche KI
// gespielt wird, baut vor dem ersten Tick die Startlage auf (aufbau, darf
// die Welt veraendern -- deterministisch, darum auch in Wiederholungen
// gleich) und prueft ihre Ziele in jedem Bild.

import { BUILDINGS } from './sim/defs.js';
import { spawnBuilding, spawnUnit, findDeposit, issue } from './sim/sim.js';

/** Fertiges Gebaeude setzen; Foerderbauten belegen ihre Ader. */
function kmBaue(world, p, typ, x, y) {
  const b = spawnBuilding(world, p, typ, x, y, true);
  if (BUILDINGS[typ].needs) {
    const d = findDeposit(world, x, y, BUILDINGS[typ].needs);
    if (d) d.takenBy = b.id;
  }
  return b;
}
// Mission 2 -- Designzahlen, mit der KI auf beiden Seiten abgestimmt (siehe CHANGELOG 0.33)
const WUT = { fron: 900, soldaten: 6, jaeger: 2, ersteWelle: 600, wellenTakt: 1200, wellen: 5 };

/** Ticks als m:ss */
function uhr(t) {
  const s = Math.max(0, Math.ceil(t / 10));
  return ((s / 60) | 0) + ':' + String(s % 60).padStart(2, '0');
}

const kmZahl = (world, p, typ, fertig = true) => world.entities.filter((e) => !e.dead && e.player === p && e.type === typ && (!fertig || e.kind !== 'building' || e.done)).length;

const RODUNG = [
  {
    id: 'fuss-fassen',
    titel: 'Fuß fassen',
    volk: 'mensch',
    karte: 'klassisch',
    stil: 'burg',
    stufe: 'leicht',
    ki: false, // der Wald schlaeft noch
    vorwort: `Der Winter war lang. Hinter dem Grat liegt der alte Wald, und mit ihm
      Holz, Stein und Land für alle. Die Ältesten sagen, der Wald gehöre einem Gott.
      Die Ältesten sagen viel. <b>Errichte eine Siedlung, bilde ein Heer aus und vertreibe
      den Vorposten des Waldes.</b> Ich führe dich Schritt für Schritt.`,
    nachwort: `Der Hain ist gefallen. Zum ersten Mal knackt der Wald nicht nur unter
      den Äxten — er antwortet. In der Nacht heulen Wölfe, näher als je zuvor.`,
    aufbau(world) {
      // Vorposten des Gottes vor dem Grat: ein Hain, zwei Woelfe
      spawnBuilding(world, 1, 'hain', 9200, 6800, true);
      spawnUnit(world, 1, 'wolf', 9000, 7300);
      spawnUnit(world, 1, 'wolf', 9500, 7200);
      world.vorposten = world.entities.filter((e) => e.player === 1 && (e.type === 'hain' || e.type === 'wolf')).map((e) => e.id);
    },
    ziele: [
      { text: 'Wähle deinen Helden (Taste <kbd>K</kbd>)', erfuellt: (w, ich, c) => c.sel.some((id) => w.entities.find((e) => e.id === id && e.type === 'held')) },
      { text: 'Baue ein Sägewerk auf eine Steinader (Held wählen, <kbd>2</kbd>, Klick auf eine Ader)', erfuellt: (w, ich) => kmZahl(w, ich, 'saege') >= 1 },
      { text: 'Bilde zwei Bauern aus (Thingstätte anklicken, Bauer-Icon unten)', erfuellt: (w, ich) => kmZahl(w, ich, 'bauer') >= 2 },
      { text: 'Baue eine Kaserne (Taste <kbd>4</kbd>)', erfuellt: (w, ich) => kmZahl(w, ich, 'kaserne') >= 1 },
      { text: 'Bilde sechs Soldaten aus', erfuellt: (w, ich) => kmZahl(w, ich, 'soldat') >= 6 },
      { text: 'Fasse dein Heer zur Steuergruppe 1 zusammen (wählen, <kbd>Strg</kbd>+<kbd>1</kbd>)', erfuellt: (w, ich, c) => (c.gruppen['1'] || []).length >= 4 },
      { text: 'Zerstöre den Vorposten des Waldes (Rechtsklick auf einen Feind greift ihn gezielt an)', erfuellt: (w) => (w.vorposten || []).every((id) => !w.entities.some((e) => e.id === id && !e.dead)) },
    ],
    sieg: 'ziele',
  },
  {
    id: 'wut-des-waldes',
    titel: 'Die Wut des Waldes',
    volk: 'mensch',
    karte: 'klassisch',
    stil: 'sturm',
    stufe: 'schwer',
    vorwort: `Der Gott ist erwacht, und er greift an — Welle um Welle. Die Siedlung
      steht, ein Turm ist bemannt, Verstärkung ist unterwegs.
      <b>Halte zehn Minuten stand.</b> Fällt der Held, fällt die Siedlung.`,
    nachwort: `Die Glocken läuten. Die Verstärkung ist da, und der Wald zieht sich
      zurück — für jetzt. Aber am Fluss haben die Späher etwas gefunden: rote
      Adern im Gestein, die in der Nacht glimmen.`,
    aufbau(world) {
      world.players[0].fron = WUT.fron;
      kmBaue(world, 0, 'saege', 4800, 2200);
      kmBaue(world, 0, 'saege', 2200, 4800);
      kmBaue(world, 0, 'schmiede', 3100, 4400);
      kmBaue(world, 0, 'kaserne', 4400, 3300);
      kmBaue(world, 0, 'wachturm', 5200, 4600);
      for (let i = 0; i < WUT.soldaten; i++) spawnUnit(world, 0, 'soldat', 4700 + (i % 4) * 90, 4700 + ((i / 4) | 0) * 90);
      for (let i = 0; i < WUT.jaeger; i++) spawnUnit(world, 0, 'jaeger', 4400 + i * 90, 4950);
      // Der Gott hat sich vorbereitet
      kmBaue(world, 1, 'waechterbaum', 15800, 15500);
      kmBaue(world, 1, 'waechterbaum', 15500, 15800);
    },
    // Wellen: zusaetzlich zur KI, herbeigerufen (kein Unterhalt), sie ziehen auf die Thingstaette
    takt(world) {
      const n = world.tick >= WUT.ersteWelle && (world.tick - WUT.ersteWelle) % WUT.wellenTakt === 0 ? (world.tick - WUT.ersteWelle) / WUT.wellenTakt + 1 : 0;
      if (!n || n > WUT.wellen) return;
      const ids = [];
      const ruf = (typ, k) => {
        for (let i = 0; i < k; i++) {
          const u = spawnUnit(world, 1, typ, 14600 + (ids.length % 6) * 110, 15000 + ((ids.length / 6) | 0) * 110);
          u.beschworen = true;
          ids.push(u.id);
        }
      };
      ruf('wolf', 2 + n);
      ruf('dryade', n);
      ruf('waldgeist', Math.max(0, n - 2));
      ruf('ent', n >= 5 ? 1 : 0);
      issue(world, { type: 'attack', player: 1, ids, x: 3000, y: 3000 });
    },
    hinweis(world) {
      const seit = world.tick - WUT.ersteWelle;
      const n = seit < 0 ? 0 : ((seit / WUT.wellenTakt) | 0) + 1; // Wellen bisher
      const frisch = n && seit - (n - 1) * WUT.wellenTakt < 150; // die letzte kam vor weniger als 15 s
      if (frisch) return n === WUT.wellen ? 'Die letzte Welle greift an!' : `Welle ${n} von ${WUT.wellen} greift an!`;
      return n < WUT.wellen ? `Nächste Welle in ${uhr(WUT.ersteWelle + n * WUT.wellenTakt - world.tick)}` : '';
    },
    ziele: [{ text: 'Halte zehn Minuten stand', erfuellt: (w) => w.tick >= 6000, zeit: 6000 }],
    sieg: 'ziele',
  },
  {
    id: 'blut-der-goetter',
    titel: 'Blut der Götter',
    volk: 'mensch',
    karte: 'flusstal',
    stil: 'standard',
    stufe: 'mittel',
    vorwort: `Das Flusstal. Jenseits der Furten glimmt das Götterblut in den Wiesen —
      der Stoff, aus dem Söldner gemacht werden und Belagerungsgerät. Der Gott
      weiß, was dort liegt, und er wird es verteidigen.
      <b>Errichte zwei Blutschächte und sammle 300 Götterblut.</b>`,
    nachwort: `Rotes Gold füllt die Truhen. Mit ihm lassen sich Ballisten bauen, die
      weiter schießen als jeder Wächterbaum. Es ist Zeit, den Gott selbst zu stellen.`,
    aufbau(world) {
      world.players[0].fron += 500;
    },
    ziele: [
      { text: 'Errichte zwei Blutschächte auf Götterblut-Adern', erfuellt: (w, ich) => kmZahl(w, ich, 'schacht') >= 2 },
      { text: 'Sammle 300 Götterblut', erfuellt: (w, ich) => w.players[ich].goetterblut >= 300 },
    ],
    sieg: 'ziele',
  },
  {
    id: 'der-waldgott',
    titel: 'Der Waldgott',
    volk: 'mensch',
    karte: 'klassisch',
    stil: 'burg',
    stufe: 'mittel',
    vorwort: `Im Herzen des Waldes steht er: riesig, dunkel, mit glühenden Augen und
      goldenen Klauen. Seine Wächterbäume säumen den Weg, sein Herzbaum pulsiert.
      <b>Besiege den Waldgott oder zerstöre den Herzbaum.</b> Nimm Ballisten mit.`,
    nachwort: `Der Wald schweigt. Wo der Herzbaum stand, wächst im Frühjahr Gras.
      Die Ältesten sagen, ein Gott stirbt nicht — er wartet. <b>Ende der Kampagne.</b>
      Wie es aus seiner Sicht aussah, erzählt „Der Zorn des Waldes“.`,
    aufbau(world) {
      world.players[0].fron = 2000;
      // Der Gott hat sich eingegraben: Waechterbaeume am Weg zum Herzbaum, Quellen fuer ihre Kraft
      for (const [x, y] of [[15600, 15900], [15900, 15600], [16400, 14600], [14600, 16400]]) kmBaue(world, 1, 'waechterbaum', x, y);
      kmBaue(world, 1, 'quelle', 17600, 15900);
      kmBaue(world, 1, 'quelle', 15900, 17600);
      kmBaue(world, 1, 'steinkreis', 16400, 16400);
    },
    ziele: [{ text: 'Besiege den Waldgott oder zerstöre den Herzbaum', erfuellt: (w, ich) => w.over && w.winner === ich }],
    sieg: 'standard',
  },
];

// Holzfaeller am Grat (Lernmission Gott): Saegewerk auf der Mittelader, Grenzstein, zwei Soldaten
const GRAT = [10000, 7400];
// Saegewerke an der Siedlung der Menschen (gespiegelte Adern der Startbasis)
const SIEDLUNG_SAEGEN = [[15200, 17800], [17800, 15200], [13800, 15500]];

const ZORN = [
  {
    id: 'erwachen',
    titel: 'Erwachen',
    volk: 'gott',
    karte: 'klassisch',
    stil: 'burg',
    stufe: 'leicht',
    ki: false, // die Menschen ahnen nichts
    vorwort: `Hundert Winter hast du geschlafen, unter Moos und Wurzeln. Jetzt weckt
      dich ein Geräusch, das du nicht kennst: Äxte. Am Grat haben Menschen ein
      Sägewerk gebaut, mitten auf deinem Stein. <b>Sammle deine Kraft, rufe deine
      Geschöpfe und vertreibe die Holzfäller.</b> Ich zeige dir, wie.`,
    nachwort: `Das Sägewerk brennt, die Holzfäller fliehen über den Grat. Aber
      hinter ihnen, in der Ebene, rauchen hundert Schornsteine. Sie werden
      wiederkommen — mit mehr Äxten.`,
    aufbau(world) {
      const w = kmBaue(world, 1, 'saege', GRAT[0], GRAT[1]);
      const g = spawnBuilding(world, 1, 'grenzstein', GRAT[0] - 700, GRAT[1] - 300, true);
      const a = spawnUnit(world, 1, 'soldat', GRAT[0] - 300, GRAT[1] - 400);
      const b = spawnUnit(world, 1, 'soldat', GRAT[0] + 200, GRAT[1] - 450);
      world.vorposten = [w.id, g.id, a.id, b.id];
    },
    ziele: [
      { text: 'Wähle den Waldgott (Taste <kbd>K</kbd>)', erfuellt: (w, ich, c) => c.sel.some((id) => w.entities.find((e) => e.id === id && e.type === 'waldgott')) },
      { text: 'Errichte eine Moosgrube auf einer Steinader (Waldgott wählen, <kbd>2</kbd>, Klick auf eine Ader)', erfuellt: (w, ich) => kmZahl(w, ich, 'moos') >= 1 },
      { text: 'Pflanze einen Hain (Taste <kbd>3</kbd>) — deine Domäne wächst mit seinem Alter', erfuellt: (w, ich) => kmZahl(w, ich, 'hain') >= 1 },
      { text: 'Rufe drei Dryaden (Herzbaum anklicken, Dryaden-Icon unten)', erfuellt: (w, ich) => kmZahl(w, ich, 'dryade') >= 3 },
      { text: 'Rufe zwei Wölfe', erfuellt: (w, ich) => kmZahl(w, ich, 'wolf') >= 2 },
      { text: 'Fasse deine Geschöpfe zur Steuergruppe 1 zusammen (wählen, <kbd>Strg</kbd>+<kbd>1</kbd>)', erfuellt: (w, ich, c) => (c.gruppen['1'] || []).length >= 4 },
      { text: 'Vertreibe die Holzfäller vom Grat (Rechtsklick auf einen Feind greift ihn gezielt an)', erfuellt: (w) => (w.vorposten || []).every((id) => !w.entities.some((e) => e.id === id && !e.dead)) },
    ],
    sieg: 'ziele',
  },
  {
    id: 'axt-und-feuer',
    titel: 'Axt und Feuer',
    volk: 'gott',
    karte: 'klassisch',
    stil: 'standard',
    stufe: 'leicht',
    vorwort: `Sie sind wiedergekommen. An ihrer Siedlung kreischen drei Sägewerke
      Tag und Nacht, und jeder Stamm, der fällt, ist ein Stück von dir.
      <b>Zerstöre die drei Sägewerke an der Siedlung der Menschen.</b> Ein Rabe
      (Herzbaum) findet sie im Nebel.`,
    nachwort: `Stille an der Siedlung. Doch die Menschen lernen schnell: Sie bauen
      Türme aus Stein und schicken Boten in die Ebene. Bald kommt ihr Held — mit
      allem, was sie haben.`,
    aufbau(world) {
      world.players[0].fron += 400;
      world.saegen = SIEDLUNG_SAEGEN.map(([x, y]) => kmBaue(world, 1, 'saege', x, y).id);
    },
    ziele: [
      {
        text: 'Zerstöre die drei Sägewerke an der Siedlung der Menschen',
        erfuellt: (w) => (w.saegen || []).every((id) => !w.entities.some((e) => e.id === id && !e.dead)),
        zaehler: (w) => `${(w.saegen || []).filter((id) => !w.entities.some((e) => e.id === id && !e.dead)).length}/3`,
      },
    ],
    sieg: 'ziele',
  },
  {
    id: 'zorn-des-waldes',
    titel: 'Der Zorn des Waldes',
    volk: 'gott',
    karte: 'klassisch',
    stil: 'burg',
    stufe: 'leicht',
    vorwort: `Der Held der Menschen hat sich eingegraben: vier Wachtürme aus Stein, eine
      Garnison, eine Kapelle, eine Schmiede, die Tag und Nacht glüht. Sie glauben, Mauern halten
      einen Wald auf. <b>Besiege den Helden oder zerstöre die Thingstätte.</b>
      Ents brechen Mauern, Wurzelbrecher erst recht.`,
    nachwort: `Wo die Thingstätte stand, sprießen im Frühjahr Birken. Die Menschen
      erzählen sich noch lange von dem Winter, in dem der Wald zurückkam.
      <b>Ende der Kampagne.</b> Danke fürs Spielen!`,
    aufbau(world) {
      world.players[0].fron = 2000;
      for (const [x, y] of [[15600, 15900], [15900, 15600], [16400, 14600], [14600, 16400]]) kmBaue(world, 1, 'wachturm', x, y);
      // und eine Garnison
      for (let i = 0; i < 8; i++) spawnUnit(world, 1, 'soldat', 15300 - (i % 4) * 90, 15300 - ((i / 4) | 0) * 90);
      for (let i = 0; i < 4; i++) spawnUnit(world, 1, 'jaeger', 15600 - i * 90, 15050);
      kmBaue(world, 1, 'schmiede', 17600, 15900);
      kmBaue(world, 1, 'kapelle', 16400, 16400);
      kmBaue(world, 1, 'kaserne', 15900, 17600);
    },
    ziele: [{ text: 'Besiege den Helden oder zerstöre die Thingstätte', erfuellt: (w, ich) => w.over && w.winner === ich }],
    sieg: 'standard',
  },
];

export const KAMPAGNEN = [
  { id: 'rodung', titel: 'Die Rodung', volk: 'mensch', missionen: RODUNG, speicher: 'dreiReiche.kampagne', niederlage: 'Der Held ist gefallen — oder die Thingstätte.' },
  { id: 'zorn', titel: 'Der Zorn des Waldes', volk: 'gott', missionen: ZORN, speicher: 'dreiReiche.kampagne.zorn', niederlage: 'Der Waldgott ist gefallen — oder der Herzbaum.' },
];
for (const k of KAMPAGNEN) for (const m of k.missionen) m.kampagne = k;
export const MISSIONEN = KAMPAGNEN.flatMap((k) => k.missionen);

export function missionVon(id) {
  return MISSIONEN.find((m) => m.id === id) || null;
}
const nummer = (m) => m.kampagne.missionen.indexOf(m);
const naechsteVon = (m) => m.kampagne.missionen[nummer(m) + 1] || null;

/** Wie viele Missionen einer Kampagne geschafft sind (die naechste ist freigeschaltet). */
export function kampagneStand(k = KAMPAGNEN[0]) {
  try {
    return Number(localStorage.getItem(k.speicher)) || 0;
  } catch {
    return 0;
  }
}
export function missionGeschafft(m) {
  const i = nummer(m);
  try {
    if (i + 1 > kampagneStand(m.kampagne)) localStorage.setItem(m.kampagne.speicher, String(i + 1));
  } catch {
    /* ohne Speicher eben nicht freigeschaltet */
  }
}

/** Ziele pruefen: welche erfuellt, ob die Mission gewonnen ist. Erledigt bleibt erledigt. */
export function missionPruefen(m, stand, world, ich, kontext) {
  for (let i = 0; i < m.ziele.length; i++) {
    if (stand[i]) continue;
    // Der Reihe nach: erst wenn alle vorigen erledigt sind (wie in einer Lernmission)
    if (i > 0 && !stand[i - 1]) break;
    if (m.ziele[i].erfuellt(world, ich, kontext)) stand[i] = true;
  }
  return stand.every(Boolean);
}

/** Abschnitt fuer den Startbildschirm: je Kampagne eine Zeile. */
export function kampagneHtml() {
  return KAMPAGNEN.map((k) => {
    const fertig = kampagneStand(k);
    return `<div class="kampagne ${k.volk}"><b>${k.volk === 'gott' ? '🌳' : '⚔'} ${k.titel}</b>
    ${k.missionen.map((m, i) => `<button data-mission="${m.id}"${i > fertig ? ' disabled' : ''}>${i < fertig ? '✔' : i === fertig ? '▶' : '🔒'} ${i + 1}. ${m.titel}</button>`).join('')}
  </div>`;
  }).join('');
}

export function vorwortHtml(m) {
  return `<div class="vorwort ${m.volk}"><div class="kapitel">Kampagne „${m.kampagne.titel}“ · Mission ${nummer(m) + 1} von ${m.kampagne.missionen.length}</div>
    <h1>${m.titel}</h1>
    <p>${m.vorwort}</p>
    <div class="go"><button id="missionLos">Los</button><button id="missionZurueck">Zurück</button></div></div>`;
}

/** Ziele im HUD: erledigt abgehakt, das aktuelle hervorgehoben. */
export function zieleHtml(m, stand, world) {
  let aktuell = stand.findIndex((s) => !s);
  return `<div class="ziele"><b>${m.titel}</b>${m.ziele
    .map((z, i) => {
      if (i > aktuell && aktuell >= 0) return '';
      const rest = z.zeit && !stand[i] ? ` <span class="zeit">${uhr(z.zeit - world.tick)}</span>` : z.zaehler && !stand[i] ? ` <span class="zeit">${z.zaehler(world)}</span>` : '';
      return `<div class="${stand[i] ? 'ok' : 'jetzt'}">${stand[i] ? '✔' : '○'} ${z.text}${rest}</div>`;
    })
    .join('')}${m.hinweis && m.hinweis(world) ? `<div class="hinweis">${m.hinweis(world)}</div>` : ''}</div>`;
}

export function missionEndeHtml(m, gewonnen) {
  const i = nummer(m);
  const naechste = naechsteVon(m);
  return gewonnen
    ? `<div class="vorwort ${m.volk}"><div class="kapitel">Mission ${i + 1} geschafft</div><h1>${m.titel}</h1><p>${m.nachwort}</p>
      <div class="go">${naechste ? `<button id="missionWeiter">Weiter: ${naechste.titel}</button>` : ''}<button id="endeKarte">Karte ansehen</button><button id="endeNochmal">Hauptmenü</button></div></div>`
    : `<div class="vorwort ${m.volk}"><div class="kapitel">Mission ${i + 1} verloren</div><h1>${m.titel}</h1><p>${m.kampagne.niederlage} Versuch es noch einmal.</p>
      <div class="go"><button id="missionNochmal">Nochmal</button><button id="endeKarte">Karte ansehen</button><button id="endeNochmal">Hauptmenü</button></div></div>`;
}

// ------------------------------------------------------------ Verdrahtung (beide Oberflaechen)
const knopfAn = (id, f) => {
  const b = document.getElementById(id);
  if (b) b.onclick = f;
};

/** Knoepfe der Kampagne im Startbildschirm: waehle(m) zeigt das Vorwort. */
export function kampagneVerdrahten(el, waehle) {
  const knoepfe = el.querySelectorAll ? el.querySelectorAll('[data-mission]') : [];
  for (const b of knoepfe) b.onclick = () => waehle(missionVon(b.dataset.mission));
}

/** Vorwort einer Mission ueber dem Spielfeld; los() startet sie, zurueck() geht zum Startbildschirm. */
export function vorwortZeigen(el, m, los, zurueck) {
  el.innerHTML = vorwortHtml(m);
  el.style.display = '';
  knopfAn('missionLos', () => {
    el.style.display = 'none';
    los();
  });
  knopfAn('missionZurueck', zurueck);
}

/** Ende einer Mission: Nachwort oder Niederlage; k.waehle(m) zeigt ein Vorwort, k.menue den Startbildschirm. */
export function missionEndeZeigen(el, m, gewonnen, k) {
  if (gewonnen) missionGeschafft(m);
  el.innerHTML = missionEndeHtml(m, gewonnen);
  el.style.display = '';
  knopfAn('missionWeiter', () => k.waehle(naechsteVon(m)));
  knopfAn('missionNochmal', () => k.waehle(m));
  knopfAn('endeKarte', () => (el.style.display = 'none'));
  knopfAn('endeNochmal', k.menue);
}
