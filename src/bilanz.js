// Bilanz: Siege und Niederlagen, die Tagesherausforderung und Erfolge --
// alles im Browser gespeichert, nur Oberflaeche.

const BILANZ_SPEICHER = 'dreiReiche.bilanz';

export function bilanzLesen() {
  try {
    const b = JSON.parse(localStorage.getItem(BILANZ_SPEICHER) || 'null');
    if (b && b.partien) return b;
  } catch {
    /* kaputt oder gesperrt: neu anfangen */
  }
  return { partien: { mensch: [0, 0], gott: [0, 0] }, erfolge: {}, tage: {}, gewonnenMit: {} };
}
function bilanzSchreiben(b) {
  try {
    localStorage.setItem(BILANZ_SPEICHER, JSON.stringify(b));
  } catch {
    /* ohne Speicher eben nur fuer diese Sitzung */
  }
}

// ------------------------------------------------------------ Tagesherausforderung

const STILNAME = { sturm: 'Sturm', standard: 'Standard', burg: 'Burg' };
const STUFENNAME = { leicht: 'leicht', mittel: 'mittel', schwer: 'schwer' };

/** Fuer jeden Tag dieselbe Partie fuer alle: Zufallskarte, Volk und Gegner aus dem Datum. */
export function tagesHerausforderung(datum = new Date()) {
  const tag = datum.getFullYear() * 10000 + (datum.getMonth() + 1) * 100 + datum.getDate();
  let h = tag;
  const wuerfel = (n) => {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    return h % n;
  };
  const volk = wuerfel(2) ? 'gott' : 'mensch';
  const stil = ['sturm', 'standard', 'burg'][wuerfel(3)];
  const stufe = wuerfel(3) === 0 ? 'schwer' : 'mittel';
  return { tag, seed: tag, volk, stil, stufe, karte: 'zufall', datum: `${datum.getDate()}.${datum.getMonth() + 1}.` };
}

function zeitText(min) {
  const s = Math.round(min * 60);
  return `${(s / 60) | 0}:${String(s % 60).padStart(2, '0')}`;
}

// ------------------------------------------------------------ Erfolge

/** info: { gewonnen, volk, stufe, karte, minuten, verluste, ausgebildet, online, tages, kampagneFertig } */
export const ERFOLGE = [
  { id: 'erster-sieg', name: 'Erster Sieg', text: 'Gewinne eine Partie.', pruef: (i) => i.gewonnen },
  { id: 'zwei-seelen', name: 'Zwei Seelen', text: 'Gewinne mit beiden Völkern.', pruef: (i, b) => b.gewonnenMit.mensch && b.gewonnenMit.gott },
  { id: 'haerteprobe', name: 'Härteprobe', text: 'Gewinne gegen die KI auf „schwer“.', pruef: (i) => i.gewonnen && !i.online && !i.mission && i.stufe === 'schwer' },
  { id: 'sturmlauf', name: 'Sturmlauf', text: 'Gewinne in weniger als 15 Minuten.', pruef: (i) => i.gewonnen && !i.mission && i.minuten < 15 },
  { id: 'eiserne-linie', name: 'Eiserne Linie', text: 'Gewinne mit weniger als 10 Verlusten.', pruef: (i) => i.gewonnen && !i.mission && i.verluste < 10 },
  { id: 'langer-atem', name: 'Langer Atem', text: 'Gewinne eine Partie, die länger als 45 Minuten dauert.', pruef: (i) => i.gewonnen && i.minuten > 45 },
  { id: 'heerfuehrer', name: 'Heerführer', text: 'Bilde in einer Partie mehr als 100 Einheiten aus.', pruef: (i) => i.ausgebildet > 100 },
  { id: 'fremdes-land', name: 'Fremdes Land', text: 'Gewinne auf einer Zufallskarte.', pruef: (i) => i.gewonnen && i.karte === 'zufall' },
  { id: 'tageswerk', name: 'Tageswerk', text: 'Schaffe eine Tagesherausforderung.', pruef: (i) => i.gewonnen && i.tages },
  { id: 'mensch-zu-mensch', name: 'Von Mensch zu Mensch', text: 'Gewinne eine Online-Partie.', pruef: (i) => i.gewonnen && i.online },
  { id: 'die-rodung', name: 'Die Rodung', text: 'Schließe die Kampagne der Menschen ab.', pruef: (i) => i.kampagneFertig === 'rodung' },
  { id: 'zorn-des-waldes', name: 'Der Zorn des Waldes', text: 'Schließe die Kampagne des Gottes ab.', pruef: (i) => i.kampagneFertig === 'zorn' },
];

/** Partie eintragen; liefert die Erfolge, die dabei neu dazukamen. */
export function partieErfassen(info) {
  const b = bilanzLesen();
  if (!info.mission) {
    const p = b.partien[info.volk] || (b.partien[info.volk] = [0, 0]);
    p[info.gewonnen ? 0 : 1]++;
  }
  if (info.gewonnen) b.gewonnenMit[info.volk] = true;
  if (info.tages && info.gewonnen) {
    const alt = b.tage[info.tages];
    if (!alt || info.minuten < alt) b.tage[info.tages] = Math.round(info.minuten * 100) / 100;
  }
  const neu = [];
  for (const e of ERFOLGE) {
    if (b.erfolge[e.id] || !e.pruef(info, b)) continue;
    b.erfolge[e.id] = new Date().toISOString().slice(0, 10);
    neu.push(e);
  }
  bilanzSchreiben(b);
  return neu;
}

// ------------------------------------------------------------ Anzeige

/** Zeile im Startbildschirm: Tagesherausforderung, Bilanz, Erfolge. */
export function bilanzHtml() {
  const b = bilanzLesen();
  const h = tagesHerausforderung();
  const best = b.tage[h.tag];
  const volk = h.volk === 'mensch' ? 'Menschen' : 'Gott';
  const zahl = Object.keys(b.erfolge).length;
  const [ms, mn] = b.partien.mensch || [0, 0];
  const [gs, gn] = b.partien.gott || [0, 0];
  return `<div class="bilanz">
    <div><b>📅 Tagesherausforderung ${h.datum}</b> ${volk} gegen ${STILNAME[h.stil]} (${STUFENNAME[h.stufe]}) auf einer Karte, die es nur heute gibt
      <button id="tagesStart">Annehmen</button>${best ? ` <span class="ok">Bestzeit heute ${zeitText(best)}</span>` : ''}</div>
    <div><b>🏆 Erfolge ${zahl}/${ERFOLGE.length}</b> <button id="erfolgeZeigen">ansehen</button>
      <span>Bilanz: Menschen ${ms}:${mn} · Gott ${gs}:${gn}</span></div>
  </div>`;
}

export function erfolgeHtml() {
  const b = bilanzLesen();
  return `<div class="vorwort erfolge"><div class="kapitel">Bilanz</div><h1>Erfolge</h1>
    <ul>${ERFOLGE.map((e) => `<li class="${b.erfolge[e.id] ? 'ok' : 'zu'}"><b>${b.erfolge[e.id] ? '🏆' : '🔒'} ${e.name}</b><span>${e.text}${b.erfolge[e.id] ? ` · ${b.erfolge[e.id]}` : ''}</span></li>`).join('')}</ul>
    <div class="go"><button id="erfolgeZurueck">Zurück</button></div></div>`;
}

/** Hinweis fuer den Endbildschirm. */
export function neueErfolgeHtml(liste) {
  if (!liste.length) return '';
  return `<div class="neueErfolge">${liste.map((e) => `<div>🏆 <b>Neuer Erfolg: ${e.name}</b> — ${e.text}</div>`).join('')}</div>`;
}
