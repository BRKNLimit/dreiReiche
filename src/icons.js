// Icons: Ressourcen, Einheiten, Gebaeude, Faehigkeiten, Skills.
// Gehoert zur Grafik (siehe GEMINI.md). Wird von tools/bundle.mjs mit den
// anderen Dateien zu einem Skript zusammengefuegt -- Bezeichner aus frueheren
// Dateien (gl, MAP, KARTE, ...) sind dort global. Exporte gibt es nur fuer die
// Tests unter Node.
//
// Jedes Icon ist ein SVG-String mit viewBox="0 0 24 24", ohne feste Groesse
// (die Oberflaeche setzt sie per CSS). Stil: der Entwurf des Nutzers fuer die
// Ressourcenleiste (docs/bilder/ressourcenleiste-entwurf.png) -- klare Formen,
// kraeftige Farben, lesbar ab 20 px. Einheiten und Gebaeude: helle Silhouette,
// Fraktionsfarbe als Akzent (Menschen #d8b06a, Gott #8fb86a).

/** Platzhalter: Kreis mit Kuerzel, bis ein richtiges Icon da ist. */
function platzhalter(text, farbe) {
  return `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="${farbe}" stroke-width="1.6"/><text x="12" y="16" text-anchor="middle" font-size="10" font-family="sans-serif" fill="${farbe}">${text}</text></svg>`;
}
const M = '#d8b06a';
const G = '#8fb86a';

export const ICONS = {
  // Ressourcenleiste
  skillpunkte: `<svg viewBox="0 0 24 24" fill="none" stroke="#f7b55a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1.8v2M4.6 4.8l1.3 1.3M19.4 4.8l-1.3 1.3M2.2 11h2M19.8 11h2"/><path d="M8.3 16.2a6.2 6.2 0 1 1 7.4 0c-.8.6-1.1 1.3-1.1 2.1v.7H9.4v-.7c0-.8-.3-1.5-1.1-2.1z"/><path d="M9.4 19.6h5.2"/><path d="M9.9 21.6h4.2"/></svg>`,
  gegenwart: `<svg viewBox="0 0 24 24"><path d="M13.2 1.8 4.6 13.6h6.1l-1.5 8.6 9.2-12.4h-6.3z" fill="#8fd8ff" stroke="#d8f4ff" stroke-width=".8" stroke-linejoin="round"/></svg>`,
  goetterblut: `<svg viewBox="0 0 24 24"><path d="M12 2.2 6 12.6a6.9 6.9 0 1 0 12 0z" fill="#ff3434"/></svg>`,
  fron: `<svg viewBox="0 0 24 24"><path d="M2.5 6.4 6.6 4.3l3.2 2.1-.9 5.2-4.7 1.9z" fill="#c9ffe0"/><path d="M9.8 5.1 14.6 2.2l5 1.9 1.1 5.9-4.6 3.8-5.4-2.1z" fill="#e6fff0"/><path d="M14.6 2.2l5 1.9-3.4 3.3z" fill="#7dffae"/><path d="M3.4 13.8 9.6 11.4l5.3 2.1-2.2 6.3H6z" fill="#1fd35a"/><path d="M9.6 11.4l5.3 2.1-4.1 1.6z" fill="#9dffc2"/><path d="M14.9 13.6l6-3.2 1.1 6.4-4.2 3.3h-4.1z" fill="#0fae3e"/><path d="M3.4 13.8 6 19.8H3z" fill="#078a2c"/></svg>`,
  // Einheiten
  bauer: platzhalter('Ba', M),
  soldat: platzhalter('So', M),
  jaeger: platzhalter('Jä', M),
  soeldner: platzhalter('Sö', M),
  katapult: platzhalter('Ka', M),
  held: platzhalter('He', M),
  dryade: platzhalter('Dr', G),
  wolf: platzhalter('Wo', G),
  waldgeist: platzhalter('Wg', G),
  ent: platzhalter('En', G),
  wurzelbrecher: platzhalter('Wb', G),
  waldgott: platzhalter('Go', G),
  // Gebaeude
  halle: platzhalter('Th', M),
  grenzstein: platzhalter('Gr', M),
  wachturm: platzhalter('Wt', M),
  schmiede: platzhalter('Sm', M),
  saege: platzhalter('Sä', M),
  kaserne: platzhalter('Ks', M),
  schacht: platzhalter('Bs', M),
  banner: platzhalter('Kb', M),
  kapelle: platzhalter('Kp', M),
  skriptorium: platzhalter('Sk', M),
  herzbaum: platzhalter('Hb', G),
  hain: platzhalter('Ha', G),
  waechterbaum: platzhalter('Wä', G),
  quelle: platzhalter('Qu', G),
  moos: platzhalter('Mo', G),
  dickicht: platzhalter('Di', G),
  blutwurz: platzhalter('Bw', G),
  dornenschrein: platzhalter('Ds', G),
  steinkreis: platzhalter('Sk', G),
  eiche: platzhalter('Ei', G),
  // Faehigkeiten der Kommandanten
  schlachtruf: platzhalter('Ru', M),
  schildwall: platzhalter('Sw', M),
  ansturm: platzhalter('An', M),
  wurzelgriff: platzhalter('Wu', G),
  lebenssaft: platzhalter('Ls', G),
  rudelruf: platzhalter('Rr', G),
};
