// Ruempfe und Module (R3): reine Funktionen, die aus einem Rumpf und seinen
// Modulen eine Einheit ableiten. Keine Imports und keine Zustandsfelder -- die
// Tabellen (MODULE, UNITS) bekommen die Funktionen als Parameter, damit defs.js
// sie beim Laden der Daten aufrufen kann, ohne dass die Dateien einander
// brauchen. Die Regeln der Ableitung stehen bei FELDER.modul in defs.js.
//
// Schluessel einer Variante:
//   Standardbestueckung   der Schluessel des Rumpfs, z. B. 'palisade'
//   andere Bestueckung    'palisade|haubitze|gatling' -- je Steckplatz in der
//                         Reihenfolge von `slots` ein Modul, '-' fuer leer
// Der Rumpf-Schluessel steht immer vor dem ersten '|' (3D-Modell, Icon und
// 2D-Figur kommen vom Rumpf).

const ruempfeHat = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

/** Tiefe Kopie reiner Daten (Zahlen, Texte, Listen, Objekte). */
function ruempfeKopie(x) {
  return JSON.parse(JSON.stringify(x));
}

/** Die Standardbestueckung eines Rumpfs als Liste: je Steckplatz ein Modul oder '' (leer). */
export function ruempfeStandard(huelle) {
  return huelle.slots.map((_, i) => (huelle.bestueckung && huelle.bestueckung[i]) || '');
}

/**
 * Passt diese Bestueckung auf den Rumpf? Leerer Text, wenn ja, sonst der Grund.
 * Je Steckplatz ein Modul der Groesse des Steckplatzes (oder '' fuer leer), vom
 * selben Volk wie der Rumpf, und wenn das Modul `nur` kennt, muss der Rumpf dazugehoeren.
 */
export function ruempfeFehler(huelleKey, huelle, liste, module) {
  const slots = huelle.slots;
  if (!Array.isArray(slots) || !slots.length) return 'der Rumpf hat keine Steckplätze (slots)';
  if (!Array.isArray(liste) || liste.length !== slots.length) return `die Bestückung braucht genau ${slots.length} Einträge`;
  for (let i = 0; i < slots.length; i++) {
    const id = liste[i];
    if (id === '') continue;
    if (typeof id !== 'string' || !ruempfeHat(module, id)) return `Modul „${id}“ gibt es nicht`;
    const m = module[id];
    if (m.groesse !== slots[i]) return `Modul „${id}“ ist ${m.groesse}, Steckplatz ${i + 1} ist ${slots[i]}`;
    if (m.faction !== huelle.faction) return `Modul „${id}“ gehört einem anderen Volk`;
    if (m.nur && !m.nur.includes(huelleKey)) return `Modul „${id}“ passt nicht auf diesen Rumpf (nur: ${m.nur.join(', ')})`;
  }
  return '';
}

/** Schluessel der Variante: der des Rumpfs bei Standardbestueckung, sonst Rumpf und Module mit '|'. */
export function ruempfeSchluessel(huelleKey, huelle, liste) {
  const std = ruempfeStandard(huelle);
  if (liste.every((id, i) => id === std[i])) return huelleKey;
  return [huelleKey, ...liste.map((id) => id || '-')].join('|');
}

/** Schluessel in Rumpf und Liste zerlegen; null, wenn er nicht die Form `rumpf|modul|...` hat. */
export function ruempfeTeile(key) {
  if (typeof key !== 'string' || key.indexOf('|') < 0) return null;
  const teile = key.split('|');
  return { huelle: teile[0], liste: teile.slice(1).map((t) => (t === '-' ? '' : t)) };
}

/**
 * Leitet die Einheit aus Rumpf und Modulen ab (die Bestueckung muss passen,
 * siehe ruempfeFehler). Das Ergebnis ist ein neues Objekt, die Daten bleiben
 * unveraendert. Regeln: FELDER.modul in defs.js.
 *
 * Zusaetzlich traegt die Einheit: `rumpf` (Schluessel des Rumpfs), `slots` und
 * `bestueckung` (je Steckplatz das Modul, '' = leer).
 */
export function ruempfeAbleiten(huelleKey, huelle, liste, module) {
  const d = ruempfeKopie(huelle);
  d.rumpf = huelleKey;
  d.bestueckung = liste.slice();
  const ms = liste.map((id) => (id ? module[id] : null));

  // Summen: Kosten, Bauzeit, Leben, Unterhalt, Regeneration; Maximum: Sicht
  let masse = huelle.cost.masse || 0;
  let resonit = huelle.cost.resonit || 0;
  let bauzeit = huelle.buildTime || 0;
  let hp = huelle.hp;
  let unterhalt = huelle.unterhalt || 0;
  let regeneration = huelle.regeneration || 0;
  let tempo = 0; // Promille, siehe unten
  let sicht = huelle.sicht || 0;
  for (let i = 0; i < ms.length; i++) {
    const m = ms[i];
    if (!m) continue;
    if (m.cost) {
      masse += m.cost.masse || 0;
      resonit += m.cost.resonit || 0;
    }
    bauzeit += m.buildTime || 0;
    hp += m.hp || 0;
    unterhalt += m.unterhalt || 0;
    regeneration += m.regeneration || 0;
    tempo += m.speed || 0;
    if ((m.sicht || 0) > sicht) sicht = m.sicht;
  }
  d.cost = huelle.cost.resonit !== undefined || resonit ? { masse, resonit } : { masse };
  d.buildTime = bauzeit;
  d.hp = Math.max(1, hp);
  if (unterhalt) d.unterhalt = unterhalt;
  if (regeneration) d.regeneration = regeneration;
  if (sicht) d.sicht = sicht;
  // Tempo: die Module verschieben es in Promille des Rumpftempos, nie unter 10 %, nie unter 1
  d.speed = Math.max(1, ((huelle.speed * Math.max(100, 1000 + tempo)) / 1000) | 0);

  // Die erste Waffe in Steckplatz-Reihenfolge; ohne Waffenmodul bleibt die des Rumpfs (falls er eine hat)
  for (let i = 0; i < ms.length; i++) {
    const m = ms[i];
    if (!m || !m.weapon) continue;
    d.weapon = ruempfeKopie(m.weapon);
    if (m.kampf) d.kampf = m.kampf;
    break;
  }
  // Alles andere (bergung, build, worker, aura): vom ersten Modul, das es hat, wenn der Rumpf es nicht hat
  for (const f of ['bergung', 'build', 'worker', 'aura']) {
    if (d[f] !== undefined) continue;
    for (let i = 0; i < ms.length; i++) {
      if (ms[i] && ms[i][f] !== undefined) {
        d[f] = ruempfeKopie(ms[i][f]);
        break;
      }
    }
  }

  // Name: der Rumpf; bei anderer Bestueckung dazu die Module
  const std = ruempfeStandard(huelle);
  if (!liste.every((id, i) => id === std[i])) {
    const namen = ms.filter(Boolean).map((m) => m.name);
    d.name = `${huelle.name} (${namen.length ? namen.join(', ') : 'unbestückt'})`;
  }
  return d;
}
