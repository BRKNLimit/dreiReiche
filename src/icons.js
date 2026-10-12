// Icons: Ressourcen, Einheiten, Gebaeude, Faehigkeiten, Skills.
// Gehoert zur Grafik (siehe GEMINI.md). Wird von tools/bundle.mjs mit den
// anderen Dateien zu einem Skript zusammengefuegt -- Bezeichner aus frueheren
// Dateien (gl, MAP, KARTE, ...) sind dort global. Exporte gibt es nur fuer die
// Tests unter Node.
//
// Jedes Icon ist ein SVG-String mit viewBox="0 0 24 24", ohne feste Groesse
// (die Oberflaeche setzt sie per CSS). Stil: der Entwurf des Nutzers fuer die
// Ressourcenleiste (docs/bilder/ressourcenleiste-entwurf.png) -- klare Formen,
// kraeftige Farben, auf dunklem Blau (#021722) lesbar, ab 20 px erkennbar.
// Einheiten und Gebaeude: helle Silhouette, Fraktionsfarbe als Akzent
// (Menschen #d8b06a, Gott #8fb86a).

const IC_M = '#d8b06a'; // Menschen-Akzent (Gold)
const IC_M_HELL = '#f5dfa8';
const IC_G = '#8fb86a'; // Gott-Akzent (Waldgruen)
const IC_G_HELL = '#c2f099';
const IC_SILBER = '#d9e2ec';
const IC_SILBER_D = '#829ab1';
const IC_HOLZ = '#8c532b';
const IC_HOLZ_D = '#543018';
const IC_STEIN = '#9aa5b1';
const IC_STEIN_D = '#627d98';
const IC_BLUT = '#ff3434';

export const ICONS = {
  // ------------------------------------------------------------- Ressourcen
  skillpunkte: `<svg viewBox="0 0 24 24" fill="none" stroke="#f7b55a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1.8v2M4.6 4.8l1.3 1.3M19.4 4.8l-1.3 1.3M2.2 11h2M19.8 11h2"/><path d="M8.3 16.2a6.2 6.2 0 1 1 7.4 0c-.8.6-1.1 1.3-1.1 2.1v.7H9.4v-.7c0-.8-.3-1.5-1.1-2.1z"/><path d="M9.4 19.6h5.2"/><path d="M9.9 21.6h4.2"/></svg>`,
  gegenwart: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="#38bdf8" stroke-width="2" stroke-dasharray="3.2 2.2"/><circle cx="12" cy="12" r="5" fill="#38bdf8" opacity="0.35"/><path d="M12 2.5a9.5 9.5 0 0 1 9.5 9.5M21.5 12a9.5 9.5 0 0 1-9.5 9.5M12 21.5A9.5 9.5 0 0 1 2.5 12M2.5 12A9.5 9.5 0 0 1 12 2.5" fill="none" stroke="#0ea5e9" stroke-width="1.6" stroke-linecap="round"/><circle cx="12" cy="12" r="3.2" fill="#e0f2fe"/><circle cx="12" cy="12" r="1.4" fill="#ffffff"/></svg>`,
  goetterblut: `<svg viewBox="0 0 24 24"><path d="M12 2.2 6 12.6a6.9 6.9 0 1 0 12 0z" fill="#ff3434"/></svg>`,
  fron: `<svg viewBox="0 0 24 24"><path d="M2.5 6.4 6.6 4.3l3.2 2.1-.9 5.2-4.7 1.9z" fill="#c9ffe0"/><path d="M9.8 5.1 14.6 2.2l5 1.9 1.1 5.9-4.6 3.8-5.4-2.1z" fill="#e6fff0"/><path d="M14.6 2.2l5 1.9-3.4 3.3z" fill="#7dffae"/><path d="M3.4 13.8 9.6 11.4l5.3 2.1-2.2 6.3H6z" fill="#1fd35a"/><path d="M9.6 11.4l5.3 2.1-4.1 1.6z" fill="#9dffc2"/><path d="M14.9 13.6l6-3.2 1.1 6.4-4.2 3.3h-4.1z" fill="#0fae3e"/><path d="M3.4 13.8 6 19.8H3z" fill="#078a2c"/></svg>`,

  // ----------------------------------------------------- Einheiten: Menschen
  bauer: `<svg viewBox="0 0 24 24">
    <!-- Sense: hölzerner Schaft, geschwungene Stahlklinge und Weizenähre -->
    <path d="M4 21 L18 4" stroke="${IC_HOLZ}" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M18 4 C15 1.5, 9 2, 7 5.5 C10 4, 15 4, 18 4 Z" fill="${IC_SILBER}" stroke="${IC_SILBER_D}" stroke-width="0.5"/>
    <!-- Goldene Getreideähre -->
    <path d="M11 19 Q15 17 19 13 Q17 17 11 19 Z" fill="${IC_M}"/>
    <circle cx="15.5" cy="14.5" r="1.3" fill="${IC_M_HELL}"/>
    <circle cx="17.5" cy="12.5" r="1.3" fill="${IC_M_HELL}"/>
    <circle cx="13.5" cy="16.5" r="1.3" fill="${IC_M_HELL}"/>
  </svg>`,

  soldat: `<svg viewBox="0 0 24 24">
    <!-- Dreiecksschild im Hintergrund mit Goldrand -->
    <path d="M6 3 L18 3 L18 12 C18 17.5 12 21.5 12 21.5 C12 21.5 6 17.5 6 12 Z" fill="#243b53" stroke="${IC_M}" stroke-width="1.8" stroke-linejoin="round"/>
    <!-- Silbernes Schwert im Vordergrund -->
    <path d="M12 5.5 L13.5 14 L10.5 14 Z" fill="${IC_SILBER}"/>
    <rect x="9" y="14" width="6" height="1.6" rx="0.6" fill="${IC_M}"/>
    <rect x="11.2" y="15.6" width="1.6" height="2.8" fill="${IC_HOLZ}"/>
    <circle cx="12" cy="19" r="1.1" fill="${IC_M}"/>
  </svg>`,

  jaeger: `<svg viewBox="0 0 24 24">
    <!-- Gespannter Jagdbogen mit goldener Nocke und Sehne -->
    <path d="M6 3 C15 7, 15 17, 6 21" fill="none" stroke="${IC_HOLZ}" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M6 3 L6 21" fill="none" stroke="${IC_SILBER}" stroke-width="1" stroke-dasharray="1 0"/>
    <circle cx="6" cy="3" r="1.4" fill="${IC_M}"/>
    <circle cx="6" cy="21" r="1.4" fill="${IC_M}"/>
    <!-- Pfeil -->
    <path d="M4 12 L20 12" stroke="${IC_M_HELL}" stroke-width="1.6"/>
    <path d="M20 12 L15.5 9.5 L16.8 12 L15.5 14.5 Z" fill="${IC_SILBER}" stroke="${IC_SILBER_D}" stroke-width="0.5"/>
    <path d="M4 10.5 L6 12 L4 13.5" fill="none" stroke="${IC_M}" stroke-width="1.4"/>
  </svg>`,

  soeldner: `<svg viewBox="0 0 24 24">
    <!-- Wuchtige doppelte Streitaxt / Hellebarde mit Goldornament -->
    <path d="M5 21 L19 4" stroke="${IC_HOLZ}" stroke-width="2.2" stroke-linecap="round"/>
    <!-- Breite Eisen-Axtklinge -->
    <path d="M14 6 C17 3, 22 4, 21.5 9 C18 8, 16 9, 14 10 Z" fill="${IC_SILBER}" stroke="${IC_SILBER_D}" stroke-width="0.5"/>
    <path d="M12 8 C9 6, 7 8, 8 11 C10 10.5, 11 11, 12 12 Z" fill="${IC_SILBER}" stroke="${IC_SILBER_D}" stroke-width="0.5"/>
    <circle cx="14" cy="8" r="1.8" fill="${IC_M}"/>
    <path d="M19 4 L21 2 L22 3.5 Z" fill="${IC_M}"/>
  </svg>`,

  katapult: `<svg viewBox="0 0 24 24">
    <!-- Schwere Belagerungs-Balliste auf Rädern -->
    <!-- Räder und Achse -->
    <rect x="1" y="14" width="2.5" height="7" rx="1.2" fill="#243b53" stroke="${IC_M}" stroke-width="1.1"/>
    <rect x="20.5" y="14" width="2.5" height="7" rx="1.2" fill="#243b53" stroke="${IC_M}" stroke-width="1.1"/>
    <rect x="3" y="16.5" width="18" height="2" rx="0.6" fill="${IC_HOLZ}" stroke="${IC_HOLZ_D}" stroke-width="0.5"/>
    <!-- Holzstollen & Schussrahmen -->
    <rect x="10.8" y="3" width="2.4" height="15.5" rx="0.6" fill="${IC_HOLZ}" stroke="${IC_HOLZ_D}" stroke-width="0.5"/>
    <path d="M4 6.5 L20 6.5" stroke="${IC_HOLZ_D}" stroke-width="2.2" stroke-linecap="round"/>
    <!-- Geschwungene Bogenarme mit Goldbeschlag -->
    <path d="M5.5 7.5 C1.5 6, 0.5 11, 2.5 14" fill="none" stroke="${IC_M}" stroke-width="2" stroke-linecap="round"/>
    <path d="M18.5 7.5 C22.5 6, 23.5 11, 21.5 14" fill="none" stroke="${IC_M}" stroke-width="2" stroke-linecap="round"/>
    <!-- Gespannte Sehne -->
    <path d="M2.5 14 L12 15 L21.5 14" fill="none" stroke="${IC_SILBER}" stroke-width="1.2" stroke-linejoin="round"/>
    <!-- Wuchtiger Bolzen mit gehärteter Stahlspitze und Befiederung -->
    <line x1="12" y1="2" x2="12" y2="15" stroke="${IC_SILBER}" stroke-width="1.8"/>
    <path d="M12 0.8 L9.8 4 L14.2 4 Z" fill="${IC_SILBER}" stroke="${IC_SILBER_D}" stroke-width="0.4"/>
    <path d="M10.2 13.5 L12 12 L13.8 13.5" fill="none" stroke="${IC_M_HELL}" stroke-width="1.3"/>
    <!-- Spannwinde & Sperrrad -->
    <circle cx="12" cy="16.5" r="1.5" fill="${IC_M}" stroke="${IC_M_HELL}" stroke-width="0.5"/>
  </svg>`,

  held: `<svg viewBox="0 0 24 24">
    <!-- Prunkvoller königlicher Großhelm mit Krone, Federbusch und Löwen-Schulterstücken -->
    <!-- Roter Wappenmantel / Umhang im Hintergrund -->
    <path d="M3 21 C5 17, 19 17, 21 21" stroke="#8c2f2f" stroke-width="3" stroke-linecap="round" fill="none"/>
    <!-- Goldene Löwen-Schulterstücke (Spalier) -->
    <path d="M3 16 C3 13.5, 6 13.5, 7.5 15 C6.5 18, 4.5 20, 2 21 C2.5 18.5, 2.8 17, 3 16 Z" fill="${IC_M}" stroke="${IC_M_HELL}" stroke-width="0.6"/>
    <path d="M21 16 C21 13.5, 18 13.5, 16.5 15 C17.5 18, 19.5 20, 22 21 C21.5 18.5, 21.2 17, 21 16 Z" fill="${IC_M}" stroke="${IC_M_HELL}" stroke-width="0.6"/>
    <!-- Helmkalotte aus poliertem Plattenstahl -->
    <path d="M7 10 C7 5.5, 17 5.5, 17 10 L17.2 15 C17.2 18, 15 19.5, 12 19.5 C9 19.5, 6.8 18, 6.8 15 Z" fill="${IC_SILBER}" stroke="${IC_SILBER_D}" stroke-width="0.8"/>
    <!-- Visier mit Kreuz-Verstärkung in Gold und Sehschlitzen -->
    <path d="M7.5 12.5 H16.5" stroke="${IC_M}" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M12 10.5 V16.5" stroke="${IC_M}" stroke-width="2.2" stroke-linecap="round"/>
    <line x1="8.2" y1="12.5" x2="11.2" y2="12.5" stroke="#102a43" stroke-width="1.1"/>
    <line x1="12.8" y1="12.5" x2="15.8" y2="12.5" stroke="#102a43" stroke-width="1.1"/>
    <circle cx="10" cy="15" r="0.4" fill="#102a43"/>
    <circle cx="14" cy="15" r="0.4" fill="#102a43"/>
    <!-- Prunkvolle goldene Königskrone auf dem Scheitel -->
    <path d="M6.2 8.5 L7.8 5 L10 7 L12 3.8 L14 7 L16.2 5 L17.8 8.5 Z" fill="${IC_M}" stroke="${IC_M_HELL}" stroke-width="0.6"/>
    <circle cx="12" cy="5.2" r="0.8" fill="#ffffff"/>
    <!-- Roter Helmbusch / Helmzier nach hinten fließend -->
    <path d="M12 3.5 C12 0.8, 14.5 0.5, 16.5 1.5 C15.5 2.5, 13.5 2.8, 12.5 3.5" fill="#dc2626"/>
  </svg>`,

  // --------------------------------------------------------- Einheiten: Gott
  dryade: `<svg viewBox="0 0 24 24">
    <!-- Zarte Geistergestalt aus Blättern und Ranken mit Blütenkrone -->
    <path d="M12 2 C13 5, 17 8, 16 13 C15 17, 12 21, 12 21 C12 21, 9 17, 8 13 C7 8, 11 5, 12 2 Z" fill="#2d5e2e" stroke="${IC_G}" stroke-width="1.2"/>
    <path d="M12 4 L12 18" stroke="${IC_G_HELL}" stroke-width="1.2" stroke-linecap="round"/>
    <!-- Schwingende Blätterflügel -->
    <path d="M12 9 C17 6, 21 8, 20 12 C18 14, 14 12, 12 11" fill="${IC_G}" opacity="0.85"/>
    <path d="M12 9 C7 6, 3 8, 4 12 C6 14, 10 12, 12 11" fill="${IC_G}" opacity="0.85"/>
    <circle cx="12" cy="6" r="1.5" fill="#fef08a"/>
  </svg>`,

  rabe: `<svg viewBox="0 0 24 24">
    <!-- Gott-Späher: Rabe im Flug mit weit gespreizten Schwingen und goldenem Auge -->
    <path d="M12 7 C14 5, 17 6, 22 4 C20 8, 18 11, 14 13 L15 16 C15 17, 13 19, 12 21 C11 19, 9 17, 9 16 L10 13 C6 11, 4 8, 2 4 C7 6, 10 5, 12 7 Z" fill="#15121e" stroke="${IC_G}" stroke-width="1.3" stroke-linejoin="round"/>
    <!-- Handschwingen / Federfächer -->
    <path d="M4 6.5 C8 8.5, 11 8, 12 9 C13 8, 16 8.5, 20 6.5" fill="none" stroke="${IC_G_HELL}" stroke-width="0.9"/>
    <!-- Kopf und Schnabel -->
    <path d="M12 4 L14 7 L10 7 Z" fill="#1c1924"/>
    <path d="M12 2 L13.5 5 L10.5 5 Z" fill="#181615" stroke="${IC_G}" stroke-width="0.5"/>
    <!-- Glänzendes Bernsteinauge -->
    <circle cx="12" cy="5.8" r="1.1" fill="#facc15"/>
    <circle cx="12" cy="5.8" r="0.4" fill="#ffffff"/>
  </svg>`,

  wolf: `<svg viewBox="0 0 24 24">
    <!-- Wolfskopf im Profil mit spitzen Ohren und fletschender Schnauze -->
    <path d="M3 17 L6 13 L5 7 L9 9 L15 6 L14 10 L20 13 L21 16 L17 15 L14 19 L8 19 L4 21 Z" fill="#1e293b" stroke="${IC_G}" stroke-width="1.5" stroke-linejoin="round"/>
    <!-- Glühendes Auge -->
    <circle cx="12.5" cy="10.5" r="1.3" fill="#facc15"/>
    <!-- Reißzahn & Kieferlinie -->
    <path d="M17 15 L16 17 L15 15" fill="#f8fafc"/>
    <path d="M8 13 C10 15, 13 14, 15 13" fill="none" stroke="${IC_G_HELL}" stroke-width="1"/>
  </svg>`,

  waldgeist: `<svg viewBox="0 0 24 24">
    <!-- Schwebender Natur-Irrwisch / Will-o'-the-wisp mit fließenden Ranken -->
    <path d="M12 3 C7 3, 5 8, 6 13 C7 17, 10 21, 12 22 C11 19, 13 17, 14 14 C17 14, 19 11, 19 8 C19 5, 16 3, 12 3 Z" fill="#14532d" stroke="${IC_G}" stroke-width="1.4"/>
    <circle cx="11.5" cy="8.5" r="3.2" fill="${IC_G_HELL}"/>
    <!-- Glühaugen -->
    <circle cx="10.5" cy="8.2" r="1" fill="#052e16"/>
    <circle cx="13.2" cy="8.2" r="1" fill="#052e16"/>
    <!-- Lichtfunken -->
    <circle cx="17.5" cy="17.5" r="1.2" fill="#fef08a"/>
    <circle cx="5.5" cy="17" r="0.9" fill="#fef08a"/>
  </svg>`,

  ent: `<svg viewBox="0 0 24 24">
    <!-- Gewaltiger Baumhirte: dicker Stamm, wuchtige Astschultern, Blätterkrone -->
    <path d="M6 21 L8 14 L5 9 L8 9 L9 13 L11 7 L13 7 L15 13 L16 9 L19 9 L16 14 L18 21 Z" fill="#382414" stroke="${IC_G}" stroke-width="1.5" stroke-linejoin="round"/>
    <!-- Rindenaugen -->
    <circle cx="10" cy="11.5" r="1.2" fill="#fde047"/>
    <circle cx="14" cy="11.5" r="1.2" fill="#fde047"/>
    <!-- Blätterkrone oben -->
    <path d="M9 5 C7 2, 17 2, 15 5 C18 4, 18 7, 15 7 C14 8, 10 8, 9 7 C6 7, 6 4, 9 5 Z" fill="${IC_G}" stroke="${IC_G_HELL}" stroke-width="0.8"/>
  </svg>`,

  wurzelbrecher: `<svg viewBox="0 0 24 24">
    <!-- Schwerer Rammbock aus verdrillten Wurzelsträngen mit dornigem Rammkopf -->
    <path d="M3 15 C6 14, 9 16, 12 14 C15 12, 18 13, 21 10 L22 13 C18 16, 14 15, 11 17 C8 19, 5 17, 3 17 Z" fill="#422513" stroke="${IC_G}" stroke-width="1.4"/>
    <!-- Knollenkopf mit Stoßdornen -->
    <path d="M18 7 L23 10 L22 14 L17 12 Z" fill="#2e190e" stroke="${IC_G}" stroke-width="1.4"/>
    <polygon points="23,10 24,6 20,8" fill="${IC_G_HELL}"/>
    <polygon points="22,14 24,16 20,15" fill="${IC_G_HELL}"/>
    <line x1="6" y1="15" x2="8" y2="19" stroke="${IC_G}" stroke-width="1.6" stroke-linecap="round"/>
  </svg>`,

  waldgott: `<svg viewBox="0 0 24 24">
    <!-- Unheimlicher Waldgott: schwarze Gestalt, lodernde Augen, mächtiges Hirschgeweih, gekreuzte Goldklauen -->
    <!-- Kapuzenmantel -->
    <path d="M7 21 L9 12 L12 9 L15 12 L17 21 Z" fill="#09090b" stroke="#27272a" stroke-width="1"/>
    <!-- Verzweigtes Geweih -->
    <path d="M11 8 C9 6, 7 5, 5 5 M7 5 C6 3, 5 2, 4 3 M7 5 C7 3, 8 2, 9 3" stroke="${IC_G_HELL}" stroke-width="1.3" stroke-linecap="round"/>
    <path d="M13 8 C15 6, 17 5, 19 5 M17 5 C18 3, 19 2, 20 3 M17 5 C17 3, 16 2, 15 3" stroke="${IC_G_HELL}" stroke-width="1.3" stroke-linecap="round"/>
    <!-- Kopf & gelbe Schlitzaugen -->
    <circle cx="12" cy="9.5" r="2.2" fill="#09090b"/>
    <ellipse cx="11.2" cy="9.3" rx="0.7" ry="0.4" fill="#facc15"/>
    <ellipse cx="12.8" cy="9.3" rx="0.7" ry="0.4" fill="#facc15"/>
    <!-- Gekreuzte goldene Klauenhände vor der Brust -->
    <path d="M8.5 15 L14 17.5 M15.5 15 L10 17.5" stroke="${IC_M}" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,

  // ------------------------------------------------------ Gebäude: Menschen
  halle: `<svg viewBox="0 0 24 24">
    <!-- Thingstätte / Langhaus: Giebel, gekreuzte Firstbalken und Portal -->
    <path d="M3 13 L12 5 L21 13 L21 21 L3 21 Z" fill="#243b53" stroke="${IC_M}" stroke-width="1.6" stroke-linejoin="round"/>
    <!-- Dachfirst mit gekreuzten Giebelenden -->
    <path d="M10 3 L14 7 M14 3 L10 7" stroke="${IC_M}" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M1.5 13.5 L12 4 L22.5 13.5" fill="none" stroke="${IC_M_HELL}" stroke-width="1.6" stroke-linecap="round"/>
    <!-- Rundbogentor -->
    <path d="M10 21 V15 C10 13.9 10.9 13 12 13 C13.1 13 14 13.9 14 15 V21" fill="${IC_M}" stroke="${IC_HOLZ_D}" stroke-width="0.8"/>
  </svg>`,

  grenzstein: `<svg viewBox="0 0 24 24">
    <!-- Behauener Obelisk auf Steinsockel mit goldener Grenzrune -->
    <rect x="5" y="19" width="14" height="3" rx="0.5" fill="${IC_STEIN_D}" stroke="${IC_M}" stroke-width="1"/>
    <polygon points="9,19 8,7 12,2 16,7 15,19" fill="${IC_STEIN}" stroke="${IC_SILBER_D}" stroke-width="0.8"/>
    <!-- Goldene Sonnenrune / Kompassrose -->
    <circle cx="12" cy="10" r="2.2" fill="${IC_M}"/>
    <line x1="12" y1="6.5" x2="12" y2="13.5" stroke="${IC_M_HELL}" stroke-width="1.1"/>
    <line x1="8.5" y1="10" x2="15.5" y2="10" stroke="${IC_M_HELL}" stroke-width="1.1"/>
  </svg>`,

  wachturm: `<svg viewBox="0 0 24 24">
    <!-- Hoher Wehrturm aus Stein mit Zinnen und Fahne -->
    <path d="M7 21 L8.5 7 L15.5 7 L17 21 Z" fill="${IC_STEIN}" stroke="${IC_STEIN_D}" stroke-width="0.8"/>
    <!-- Zinnenbekrönung -->
    <path d="M7 7 H17 V4 H15 V5.5 H13 V4 H11 V5.5 H9 V4 H7 Z" fill="${IC_STEIN}" stroke="${IC_M}" stroke-width="1.2" stroke-linejoin="round"/>
    <!-- Schießscharte & Tür -->
    <rect x="11.2" y="10" width="1.6" height="3.5" fill="#102a43"/>
    <path d="M10.5 21 V18 C10.5 17.2 11.2 16.5 12 16.5 C12.8 16.5 13.5 17.2 13.5 18 V21" fill="#102a43"/>
    <!-- Wimpel auf der Zinne -->
    <path d="M15 4 V1.5 L18 2.8 L15 3.8" fill="${IC_M}"/>
  </svg>`,

  spaehposten: `<svg viewBox="0 0 24 24">
    <!-- Vierbeiniger hölzerner Hochsitz mit Ausguck, Dach und Fernrohr -->
    <!-- Stützpfosten und Querstreben -->
    <path d="M5 22 L7.5 12 M19 22 L16.5 12" stroke="${IC_HOLZ}" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M6 17 L18 17 M7 14 L17 14" stroke="${IC_HOLZ_D}" stroke-width="1.2"/>
    <!-- Leiter mittig -->
    <line x1="12" y1="12" x2="12" y2="22" stroke="${IC_HOLZ_D}" stroke-width="1.2" stroke-dasharray="1.2 2"/>
    <!-- Ausguck-Plattform und Brüstung -->
    <rect x="5.5" y="9.5" width="13" height="3" fill="#243b53" stroke="${IC_M}" stroke-width="1.2" rx="0.5"/>
    <!-- Messing-Fernrohr auf der Brüstung -->
    <path d="M13 10 L19 6.5" stroke="${IC_M_HELL}" stroke-width="1.8" stroke-linecap="round"/>
    <circle cx="19.5" cy="6.2" r="1.1" fill="#fff" opacity="0.9"/>
    <!-- 4 Eckpfosten zum Dach -->
    <line x1="7" y1="9.5" x2="7" y2="6.5" stroke="${IC_HOLZ}" stroke-width="1.3"/>
    <line x1="17" y1="9.5" x2="17" y2="6.5" stroke="${IC_HOLZ}" stroke-width="1.3"/>
    <!-- Walmdach mit Giebel -->
    <polygon points="5,6.5 12,2 19,6.5" fill="#8c3528" stroke="${IC_M}" stroke-width="1.2" stroke-linejoin="round"/>
    <!-- Laterne am Ausguck -->
    <circle cx="8" cy="11" r="1.3" fill="#ffd54f"/>
  </svg>`,

  schmiede: `<svg viewBox="0 0 24 24">
    <!-- Massiver Amboss mit aufschlagendem Hammer und Funken -->
    <path d="M4 14 H16 C19 14, 21 16, 21 17 H3 C3 16, 4 14, 4 14 Z M7 17 L8 21 H16 L17 17 Z" fill="${IC_STEIN_D}" stroke="${IC_M}" stroke-width="1.2"/>
    <!-- Hammer -->
    <path d="M8 8 L14 3" stroke="${IC_HOLZ}" stroke-width="1.8" stroke-linecap="round"/>
    <rect x="12" y="2" width="5.5" height="3.2" rx="0.6" transform="rotate(35 14 3)" fill="${IC_SILBER}" stroke="${IC_SILBER_D}" stroke-width="0.6"/>
    <!-- Glut & Funken -->
    <polygon points="12,12 13,10 14,12" fill="#f97316"/>
    <circle cx="10" cy="10" r="0.8" fill="${IC_M_HELL}"/>
    <circle cx="16" cy="9" r="0.8" fill="${IC_M_HELL}"/>
  </svg>`,

  saege: `<svg viewBox="0 0 24 24">
    <!-- Kreissägeblatt / Gattersäge über gespaltenem Baumstamm -->
    <circle cx="12" cy="10" r="7" fill="${IC_SILBER}" stroke="${IC_M}" stroke-width="1.4" stroke-dasharray="2.5 1.5"/>
    <circle cx="12" cy="10" r="2.2" fill="#102a43" stroke="${IC_M}" stroke-width="1"/>
    <!-- Zersägter Stamm -->
    <rect x="3" y="16" width="18" height="5" rx="1.5" fill="${IC_HOLZ}" stroke="${IC_HOLZ_D}" stroke-width="0.8"/>
    <circle cx="6" cy="18.5" r="1.5" fill="${IC_M}"/>
    <!-- Sägespalt -->
    <line x1="12" y1="14" x2="12" y2="21" stroke="#fef08a" stroke-width="1.2"/>
  </svg>`,

  kaserne: `<svg viewBox="0 0 24 24">
    <!-- Wehrbau mit Satteldach und zwei gekreuzten Klingen über dem Tor -->
    <polygon points="2,11 12,3 22,11 20,11 20,21 4,21 4,11" fill="#334e68" stroke="${IC_M}" stroke-width="1.5" stroke-linejoin="round"/>
    <rect x="9.5" y="14" width="5" height="7" fill="#102a43"/>
    <!-- Gekreuzte Schwerter im Giebel -->
    <line x1="9" y1="8" x2="15" y2="12" stroke="${IC_SILBER}" stroke-width="1.4"/>
    <line x1="15" y1="8" x2="9" y2="12" stroke="${IC_SILBER}" stroke-width="1.4"/>
    <circle cx="12" cy="10" r="1" fill="${IC_M}"/>
  </svg>`,

  schacht: `<svg viewBox="0 0 24 24">
    <!-- Förderturm über Minenschacht mit rotem Bluttropfen -->
    <path d="M4 21 L9 6 L15 6 L20 21" stroke="${IC_HOLZ}" stroke-width="2" fill="none" stroke-linecap="round"/>
    <line x1="6.5" y1="14" x2="17.5" y2="14" stroke="${IC_HOLZ}" stroke-width="1.6"/>
    <!-- Förderrad oben -->
    <circle cx="12" cy="6" r="3" fill="none" stroke="${IC_M}" stroke-width="1.6"/>
    <!-- Abseilendes Gefäß / Tropfen -->
    <line x1="12" y1="9" x2="12" y2="15" stroke="${IC_SILBER}" stroke-width="1"/>
    <path d="M12 15 C10.5 17, 10.5 19, 12 20 C13.5 19, 13.5 17, 12 15 Z" fill="${IC_BLUT}"/>
  </svg>`,

  banner: `<svg viewBox="0 0 24 24">
    <!-- Standarte / Kriegsbanner an hoher Lanzenspitze mit Goldadler -->
    <line x1="6" y1="2" x2="6" y2="22" stroke="${IC_HOLZ}" stroke-width="2" stroke-linecap="round"/>
    <polygon points="6,2 8,4 6,5 4,4" fill="${IC_M}"/>
    <!-- Flatterndes Banner -->
    <path d="M7 4.5 H19 C17 8, 20 11.5, 17 15 H7 Z" fill="#991b1b" stroke="${IC_M}" stroke-width="1.4" stroke-linejoin="round"/>
    <!-- Adler / Wappensymbol auf dem Tuch -->
    <polygon points="12,7 14,9 12,11 10,9" fill="${IC_M_HELL}"/>
  </svg>`,

  kapelle: `<svg viewBox="0 0 24 24">
    <!-- Sakrales Gotteshaus mit hohem Dachreiter und Kreuz -->
    <polygon points="5,13 12,6 19,13 19,21 5,21" fill="#486581" stroke="${IC_M}" stroke-width="1.5" stroke-linejoin="round"/>
    <!-- Turmspitze mit Kreuz -->
    <polygon points="10,8 12,2 14,8" fill="${IC_M}"/>
    <line x1="12" y1="1" x2="12" y2="4" stroke="${IC_M_HELL}" stroke-width="1.2"/>
    <line x1="10.8" y1="2" x2="13.2" y2="2" stroke="${IC_M_HELL}" stroke-width="1.2"/>
    <!-- Rundbogenfenster / Rosette -->
    <circle cx="12" cy="12" r="2" fill="${IC_M_HELL}"/>
    <path d="M10.5 21 V17 C10.5 16.2 11.2 15.5 12 15.5 C12.8 15.5 13.5 16.2 13.5 17 V21" fill="#102a43"/>
  </svg>`,

  skriptorium: `<svg viewBox="0 0 24 24">
    <!-- Aufgeschlagenes Buch auf Schreibpult mit Schreibfeder -->
    <polygon points="4,18 20,18 17,21 7,21" fill="${IC_HOLZ_D}" stroke="${IC_M}" stroke-width="1"/>
    <!-- Buchseiten -->
    <path d="M4 14 C7 12, 11 13, 12 15 C13 13, 17 12, 20 14 L20 8 C17 6, 13 7, 12 9 C11 7, 7 6, 4 8 Z" fill="${IC_SILBER}" stroke="${IC_M}" stroke-width="1.2" stroke-linejoin="round"/>
    <!-- Schreibfeder -->
    <path d="M16 3 C18 3, 19 5, 17 9 L13 12" stroke="${IC_M_HELL}" stroke-width="1.5" stroke-linecap="round" fill="none"/>
  </svg>`,

  // --------------------------------------------------------- Gebäude: Gott
  herzbaum: `<svg viewBox="0 0 24 24">
    <!-- Monumentaler Weltenbaum mit pulsierendem Herz im Stamm -->
    <!-- Ausladende Laubkrone -->
    <path d="M12 2 C7 2, 3 6, 4 10 C4 13, 7 14, 8 14 C7 17, 5 20, 3 21 H21 C19 20, 17 17, 16 14 C17 14, 20 13, 20 10 C21 6, 17 2, 12 2 Z" fill="#166534" stroke="${IC_G}" stroke-width="1.4" stroke-linejoin="round"/>
    <!-- Mächtiger Stamm -->
    <path d="M9 15 L9 21 M15 15 L15 21" stroke="#382414" stroke-width="2.2"/>
    <!-- Glühendes Herz / Kern -->
    <path d="M12 12 C10.5 10.5, 9.5 12, 12 15 C14.5 12, 13.5 10.5, 12 12 Z" fill="#ef4444" stroke="#fecaca" stroke-width="0.6"/>
  </svg>`,

  hain: `<svg viewBox="0 0 24 24">
    <!-- Heiliger Hain: Kreis aus drei heiligen Bäumen mit schwebenden Lichtfunken -->
    <path d="M7 19 L7 12 M17 19 L17 12 M12 17 L12 8" stroke="#382414" stroke-width="2" stroke-linecap="round"/>
    <!-- Baumkronen -->
    <circle cx="7" cy="10" r="4" fill="#15803d" stroke="${IC_G}" stroke-width="1.2"/>
    <circle cx="17" cy="10" r="4" fill="#15803d" stroke="${IC_G}" stroke-width="1.2"/>
    <circle cx="12" cy="7" r="4.5" fill="#22c55e" stroke="${IC_G_HELL}" stroke-width="1.4"/>
    <line x1="3" y1="20" x2="21" y2="20" stroke="${IC_G}" stroke-width="1.6" stroke-linecap="round"/>
  </svg>`,

  waechterbaum: `<svg viewBox="0 0 24 24">
    <!-- Wehrhafter Baum mit Dornästen und finsterem Runenauge -->
    <path d="M12 21 V12 M8 21 L10 14 M16 21 L14 14" stroke="#271c14" stroke-width="2" stroke-linecap="round"/>
    <path d="M12 12 C8 9, 4 10, 3 6 M12 12 C16 9, 20 10, 21 6" stroke="${IC_G}" stroke-width="2" stroke-linecap="round"/>
    <path d="M12 12 C10 6, 8 4, 12 2 C16 4, 14 6, 12 12" fill="#14532d" stroke="${IC_G}" stroke-width="1.2"/>
    <!-- Wächterauge im Holz -->
    <ellipse cx="12" cy="10" rx="3.5" ry="2" fill="#052e16" stroke="${IC_G_HELL}" stroke-width="1"/>
    <circle cx="12" cy="10" r="1.2" fill="#eab308"/>
  </svg>`,

  quelle: `<svg viewBox="0 0 24 24">
    <!-- Heilige Quelle: Wasserfontäne aus bemoostem Steinbecken -->
    <ellipse cx="12" cy="18" rx="8" ry="3.5" fill="#0f172a" stroke="${IC_G}" stroke-width="1.5"/>
    <ellipse cx="12" cy="18" rx="5.5" ry="2" fill="#0284c7"/>
    <!-- Sprudelnde Fontäne und Tropfen -->
    <path d="M12 17 C10 12, 8 9, 8 7 C8 4, 11 3, 12 5 C13 3, 16 4, 16 7 C16 9, 14 12, 12 17 Z" fill="#38bdf8" stroke="#e0f2fe" stroke-width="0.8"/>
    <circle cx="6.5" cy="10.5" r="1" fill="#7dd3fc"/>
    <circle cx="17.5" cy="10.5" r="1" fill="#7dd3fc"/>
  </svg>`,

  moos: `<svg viewBox="0 0 24 24">
    <!-- Farnwedel und wuchernder Moosteppich mit Sporenkapseln -->
    <path d="M4 21 C6 14, 11 9, 19 6" stroke="${IC_G}" stroke-width="2.2" stroke-linecap="round" fill="none"/>
    <!-- Farnblätter -->
    <path d="M8 17 C10 15, 12 16, 11 18" stroke="${IC_G_HELL}" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M11 13 C13 11, 15 12, 14 14" stroke="${IC_G_HELL}" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M14 9 C16 7, 18 8, 17 10" stroke="${IC_G_HELL}" stroke-width="1.8" stroke-linecap="round"/>
    <!-- Leuchtende Sporen am Boden -->
    <circle cx="6" cy="20" r="1.6" fill="#a3e635"/>
    <circle cx="11" cy="20" r="1.4" fill="#a3e635"/>
    <circle cx="16" cy="20" r="1.8" fill="#a3e635"/>
  </svg>`,

  dickicht: `<svg viewBox="0 0 24 24">
    <!-- Undurchdringliches Dornengestrüpp mit kreuzenden Ranken -->
    <path d="M3 19 C7 15, 9 8, 13 4" stroke="#166534" stroke-width="2.2" stroke-linecap="round" fill="none"/>
    <path d="M21 19 C17 15, 15 8, 11 4" stroke="#14532d" stroke-width="2.2" stroke-linecap="round" fill="none"/>
    <path d="M4 8 C10 11, 14 11, 20 8" stroke="${IC_G}" stroke-width="2" stroke-linecap="round" fill="none"/>
    <!-- Dornenspitzen -->
    <polygon points="8,13 5,12 8,10" fill="${IC_G_HELL}"/>
    <polygon points="16,13 19,12 16,10" fill="${IC_G_HELL}"/>
    <polygon points="12,7 12,4 14,7" fill="${IC_G_HELL}"/>
  </svg>`,

  blutwurz: `<svg viewBox="0 0 24 24">
    <!-- Verwurzelte rote Gift-/Blutknolle mit Verzweigungen nach unten -->
    <path d="M8 10 C8 6, 16 6, 16 10 C16 14, 13 16, 12 21 C11 16, 8 14, 8 10 Z" fill="${IC_BLUT}" stroke="#fca5a5" stroke-width="1"/>
    <!-- Verzweigte Adern -->
    <path d="M10 13 L5 17 M14 13 L19 17 M12 17 L10 22 M12 17 L14 22" stroke="${IC_BLUT}" stroke-width="1.6" stroke-linecap="round"/>
    <!-- Grüner Spross oben -->
    <path d="M12 6 C10 3, 7 4, 8 2 C11 2, 12 5, 12 6 Z" fill="${IC_G}"/>
    <path d="M12 6 C14 3, 17 4, 16 2 C13 2, 12 5, 12 6 Z" fill="${IC_G}"/>
  </svg>`,

  dornenschrein: `<svg viewBox="0 0 24 24">
    <!-- Dornen-Baldachin / Schreinbogen mit schwebendem Relikt -->
    <path d="M4 21 C4 11, 9 4, 12 4 C15 4, 20 11, 20 21" fill="none" stroke="#271c14" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M5 18 C7 11, 10 6, 12 6 C14 6, 17 11, 19 18" fill="none" stroke="${IC_G}" stroke-width="1.2"/>
    <!-- Stacheln am Bogen -->
    <polygon points="6,12 3,11 6,10" fill="${IC_G_HELL}"/>
    <polygon points="18,12 21,11 18,10" fill="${IC_G_HELL}"/>
    <!-- Schwebender Naturkristall -->
    <polygon points="12,10 14,13 12,16 10,13" fill="${IC_G_HELL}" stroke="#ffffff" stroke-width="0.8"/>
  </svg>`,

  steinkreis: `<svg viewBox="0 0 24 24">
    <!-- Stonehenge-Monolithen mit Deckstein und leuchtender Mitte -->
    <!-- Pfeiler links und rechts -->
    <rect x="4" y="9" width="3.5" height="12" rx="0.5" fill="${IC_STEIN}" stroke="${IC_G}" stroke-width="1"/>
    <rect x="16.5" y="9" width="3.5" height="12" rx="0.5" fill="${IC_STEIN}" stroke="${IC_G}" stroke-width="1"/>
    <!-- Querliegender Deckstein oben -->
    <rect x="2.5" y="6" width="19" height="3.5" rx="0.8" fill="${IC_STEIN_D}" stroke="${IC_G}" stroke-width="1.2"/>
    <!-- Magisches Zentrum / Runenstein -->
    <circle cx="12" cy="15" r="2.8" fill="#14532d" stroke="${IC_G_HELL}" stroke-width="1.2"/>
    <circle cx="12" cy="15" r="1.2" fill="#facc15"/>
  </svg>`,

  eiche: `<svg viewBox="0 0 24 24">
    <!-- Uralte Eiche: gewaltiger, mächtiger Baum mit dichter Eichenkrone -->
    <path d="M12 3 C7 3, 3 7, 3 11 C3 14, 6 15, 8 16 L8 21 H16 L16 16 C18 15, 21 14, 21 11 C21 7, 17 3, 12 3 Z" fill="#1b4332" stroke="${IC_G}" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M10 16 L9 21 M14 16 L15 21" stroke="#382414" stroke-width="2"/>
    <!-- Eichel-Symbol im Zentrum -->
    <ellipse cx="12" cy="11" rx="2.5" ry="3.2" fill="#52b788"/>
    <path d="M9.5 9 C9.5 8, 14.5 8, 14.5 9 Z" fill="#2d6a4f"/>
  </svg>`,

  // ------------------------------------------------ Faehigkeiten (Kommandanten)
  schlachtruf: `<svg viewBox="0 0 24 24">
    <!-- Goldenes Kriegshorn mit tönenden Schallwellen -->
    <path d="M4 14 C7 13, 10 11, 15 7 L16 10 C11 14, 8 16, 4 17 Z" fill="${IC_M}" stroke="${IC_M_HELL}" stroke-width="0.8"/>
    <ellipse cx="15.5" cy="8.5" rx="1.5" ry="2.2" transform="rotate(-30 15.5 8.5)" fill="${IC_M_HELL}"/>
    <!-- Schallwellen -->
    <path d="M18 6 C20 8, 20 12, 18 14" fill="none" stroke="${IC_M_HELL}" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M21 4 C23.5 7, 23.5 15, 21 18" fill="none" stroke="${IC_M}" stroke-width="1.8" stroke-linecap="round"/>
  </svg>`,

  schildwall: `<svg viewBox="0 0 24 24">
    <!-- Drei überlappende Schilde mit Eisenbeschlägen und Goldbuckel -->
    <rect x="2" y="6" width="7" height="13" rx="3.5" fill="#334e68" stroke="${IC_M}" stroke-width="1.2"/>
    <rect x="15" y="6" width="7" height="13" rx="3.5" fill="#334e68" stroke="${IC_M}" stroke-width="1.2"/>
    <!-- Mittelschild im Vordergrund -->
    <rect x="8" y="4" width="8" height="16" rx="4" fill="#1e293b" stroke="${IC_M_HELL}" stroke-width="1.6"/>
    <circle cx="12" cy="12" r="2" fill="${IC_M}"/>
    <circle cx="5.5" cy="12.5" r="1.3" fill="${IC_M}"/>
    <circle cx="18.5" cy="12.5" r="1.3" fill="${IC_M}"/>
  </svg>`,

  ansturm: `<svg viewBox="0 0 24 24">
    <!-- Beflügelter Stiefel / Sturmpfeile für Geschwindigkeit -->
    <path d="M4 15 L10 15 L15 18 L19 18 L19 15 L13 11 L13 7 L8 7 L8 12 L4 12 Z" fill="${IC_SILBER}" stroke="${IC_M}" stroke-width="1.2" stroke-linejoin="round"/>
    <!-- Geschwindigkeits-Schweif / Schwingen -->
    <path d="M2 8 L8 8 M2 11 L7 11 M3 14 L6 14" stroke="${IC_M_HELL}" stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="10" cy="15" r="1" fill="${IC_M}"/>
  </svg>`,

  wurzelgriff: `<svg viewBox="0 0 24 24">
    <!-- Drei zupackende Holzkrallen / Wurzeln, die emporschnellen -->
    <path d="M4 21 C4 15, 8 11, 10 6 C8 8, 7 11, 6 15" fill="none" stroke="${IC_G}" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M20 21 C20 15, 16 11, 14 6 C16 8, 17 11, 18 15" fill="none" stroke="${IC_G}" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M12 21 C12 14, 11 9, 12 3 C13 7, 13 12, 12 21" fill="none" stroke="${IC_G_HELL}" stroke-width="2.4" stroke-linecap="round"/>
    <line x1="2" y1="21" x2="22" y2="21" stroke="#382414" stroke-width="2" stroke-linecap="round"/>
  </svg>`,

  lebenssaft: `<svg viewBox="0 0 24 24">
    <!-- Heilender Tropfen, umkränzt von zwei zarten Lebenskeimen -->
    <path d="M12 3 C8 9, 7 13, 12 19 C17 13, 16 9, 12 3 Z" fill="#22c55e" stroke="${IC_G_HELL}" stroke-width="1.2"/>
    <circle cx="12" cy="13" r="2.5" fill="#fef08a"/>
    <!-- Rankenblatt links -->
    <path d="M6 18 C6 13, 9 10, 10 11 C8 13, 8 16, 6 18 Z" fill="${IC_G}"/>
    <!-- Rankenblatt rechts -->
    <path d="M18 18 C18 13, 15 10, 14 11 C16 13, 16 16, 18 18 Z" fill="${IC_G}"/>
  </svg>`,

  rudelruf: `<svg viewBox="0 0 24 24">
    <!-- Heulender Wolf zum Vollmond mit weithin schallenden Rufwellen -->
    <circle cx="16" cy="8" r="5" fill="#fef08a" opacity="0.9"/>
    <!-- Heulender Kopf -->
    <path d="M4 21 L8 16 L9 13 L14 7 L15 10 L13 13 L16 15 L14 19 L11 21 Z" fill="#0f172a" stroke="${IC_G}" stroke-width="1.4" stroke-linejoin="round"/>
    <!-- Schallwellen -->
    <path d="M17 14 C19 15, 20 17, 20 20" fill="none" stroke="${IC_G_HELL}" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M20 11 C23 13, 23 18, 23 21" fill="none" stroke="${IC_G}" stroke-width="1.8" stroke-linecap="round"/>
  </svg>`,

  // ----------------------------------------------------------- Bedienung
  ton: `<svg viewBox="0 0 24 24">
    <!-- Lautsprecher aktiv: Schallaustritt mit zwei goldenen Schallwellen -->
    <path d="M4 9 L8 9 L13 4 L13 20 L8 15 L4 15 Z" fill="#243b53" stroke="${IC_M}" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M16 8 C17.8 9.5, 17.8 14.5, 16 16" fill="none" stroke="${IC_M_HELL}" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M19 5 C22.2 7.8, 22.2 16.2, 19 19" fill="none" stroke="${IC_M}" stroke-width="1.8" stroke-linecap="round"/>
  </svg>`,

  stumm: `<svg viewBox="0 0 24 24">
    <!-- Lautsprecher stummgeschaltet mit roter Diagonalsperre -->
    <path d="M4 9 L8 9 L13 4 L13 20 L8 15 L4 15 Z" fill="#1b2533" stroke="#64748b" stroke-width="1.6" stroke-linejoin="round"/>
    <line x1="3" y1="3" x2="21" y2="21" stroke="#ef4444" stroke-width="2.2" stroke-linecap="round"/>
    <line x1="16.5" y1="9.5" x2="20.5" y2="13.5" stroke="#ef4444" stroke-width="1.4" stroke-linecap="round"/>
    <line x1="20.5" y1="9.5" x2="16.5" y2="13.5" stroke="#ef4444" stroke-width="1.4" stroke-linecap="round"/>
  </svg>`,

  hilfe: `<svg viewBox="0 0 24 24">
    <!-- Hilfesymbol: Runde Schutzmünze mit leuchtendem Fragezeichen -->
    <circle cx="12" cy="12" r="9.5" fill="#102a43" stroke="${IC_M}" stroke-width="1.6"/>
    <path d="M9.5 8.5 C9.5 6.6, 10.8 5.2, 12.4 5.2 C14.0 5.2, 15.2 6.4, 15.2 7.8 C15.2 9.4, 13.6 10.4, 12.4 11.5 V13.2" fill="none" stroke="${IC_M_HELL}" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="12.4" cy="16.8" r="1.3" fill="${IC_M_HELL}"/>
  </svg>`,

  wiederholung: `<svg viewBox="0 0 24 24">
    <!-- Wiederholung / Replay: Kreispfeil um Wiedergabe-Kern -->
    <path d="M12 4 A8 8 0 1 1 5.6 7.4" fill="none" stroke="${IC_M}" stroke-width="2.2" stroke-linecap="round"/>
    <polygon points="2,7 6.5,2.5 7,7.8" fill="${IC_M_HELL}"/>
    <!-- Abspielkern -->
    <circle cx="12" cy="12" r="3.2" fill="#243b53" stroke="${IC_M_HELL}" stroke-width="1.2"/>
    <polygon points="11,10.2 14.2,12 11,13.8" fill="${IC_M_HELL}"/>
  </svg>`,

  sammelpunkt: `<svg viewBox="0 0 24 24">
    <!-- Sammelpunkt: Bannerstandarte mit Zielkreis am Boden -->
    <path d="M5 21 L5 3" stroke="${IC_SILBER}" stroke-width="2" stroke-linecap="round"/>
    <polygon points="5,2 3.8,4.5 6.2,4.5" fill="${IC_M}"/>
    <!-- Schwalbenschwanz-Fahne nach rechts wehend -->
    <path d="M5 4 L19 8.5 L15 11 L19 13.5 L5 13.5 Z" fill="${IC_M}" stroke="${IC_M_HELL}" stroke-width="1" stroke-linejoin="round"/>
    <circle cx="9.5" cy="8.8" r="1.4" fill="${IC_M_HELL}"/>
    <!-- Konzentrische Zielmarkierung am Boden -->
    <ellipse cx="6" cy="20.5" rx="4.5" ry="1.8" fill="none" stroke="${IC_M_HELL}" stroke-width="1.4" stroke-dasharray="2 1.5"/>
  </svg>`,

  steuergruppe: `<svg viewBox="0 0 24 24">
    <!-- Steuergruppe: Formations-Banner mit Gruppenleiter-Standarte -->
    <rect x="3" y="9" width="5.5" height="9" rx="1.5" fill="#243b53" stroke="${IC_M}" stroke-width="1.2"/>
    <rect x="15.5" y="9" width="5.5" height="9" rx="1.5" fill="#243b53" stroke="${IC_M}" stroke-width="1.2"/>
    <!-- Zentrales Fuehrungsbanner -->
    <rect x="8.5" y="4" width="7" height="12" rx="1.8" fill="#102a43" stroke="${IC_M_HELL}" stroke-width="1.5"/>
    <path d="M12 6.5 L12 11.5 M10 8 L12 6.5 L14 8" stroke="${IC_M_HELL}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
    <line x1="2" y1="20" x2="22" y2="20" stroke="${IC_M}" stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="5.7" cy="13" r="1" fill="${IC_M}"/>
    <circle cx="18.3" cy="13" r="1" fill="${IC_M}"/>
  </svg>`,

  // -------------------------------------------------- Todesgott: Gebäude
  nekropole: `<svg viewBox="0 0 24 24"><path d="M3 21 L21 21 L19 11 L12 4 L5 11 Z" fill="#0f172a" stroke="#475569" stroke-width="1.2"/><path d="M7 11 L12 6.5 L17 11" fill="none" stroke="#e2e8f0" stroke-width="1.4" stroke-linecap="round"/><path d="M10 21 L10 14 C10 12.8 14 12.8 14 14 L14 21 Z" fill="#0f172a" stroke="#38bdf8" stroke-width="1"/><circle cx="12" cy="9.5" r="2.2" fill="#38bdf8" opacity="0.3"/><circle cx="12" cy="9.5" r="1.2" fill="#bae6fd"/><line x1="5.5" y1="12" x2="5.5" y2="20.5" stroke="#94a3b8" stroke-width="1"/><line x1="18.5" y1="12" x2="18.5" y2="20.5" stroke="#94a3b8" stroke-width="1"/></svg>`,

  grabhuegel: `<svg viewBox="0 0 24 24"><path d="M2 20 C4 14, 20 14, 22 20 Z" fill="#0f172a" stroke="#475569" stroke-width="1.2"/><path d="M10 8 L14 7 L15 18 L9 18 Z" fill="#475569" stroke="#e2e8f0" stroke-width="1.2" stroke-linejoin="round"/><path d="M12 9.5 L12 15 M10.8 11.5 L13.2 11.5" stroke="#38bdf8" stroke-width="1.2" stroke-linecap="round"/><circle cx="6.5" cy="18" r="1.4" fill="#e2e8f0"/><circle cx="17.5" cy="18.5" r="1.3" fill="#e2e8f0"/></svg>`,

  knochenturm: `<svg viewBox="0 0 24 24"><path d="M8 21 L9.5 7 L12 2 L14.5 7 L16 21 Z" fill="#0f172a" stroke="#e2e8f0" stroke-width="1.2"/><path d="M8.5 17 Q12 15 15.5 17" fill="none" stroke="#e2e8f0" stroke-width="1.2"/><path d="M9 13 Q12 11 15 13" fill="none" stroke="#e2e8f0" stroke-width="1.2"/><path d="M9.5 9 Q12 7.5 14.5 9" fill="none" stroke="#e2e8f0" stroke-width="1.2"/><polygon points="12,1.5 13.5,6 10.5,6" fill="#bae6fd"/></svg>`,

  seelenbrunnen: `<svg viewBox="0 0 24 24"><ellipse cx="12" cy="17" rx="8" ry="4" fill="#0f172a" stroke="#94a3b8" stroke-width="1.4"/><ellipse cx="12" cy="15.5" rx="6.5" ry="2.6" fill="#0284c7"/><path d="M12 5 C15 9, 8 11, 12 15" fill="none" stroke="#bae6fd" stroke-width="2" stroke-linecap="round"/><circle cx="10" cy="7" r="1.2" fill="#bae6fd"/><circle cx="14.5" cy="8.5" r="1" fill="#38bdf8"/><circle cx="12" cy="4" r="0.8" fill="#ffffff"/></svg>`,

  knochenmuehle: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7" fill="#0f172a" stroke="#e2e8f0" stroke-width="1.4"/><circle cx="12" cy="12" r="2.5" fill="#475569" stroke="#38bdf8" stroke-width="1"/><line x1="12" y1="5" x2="12" y2="19" stroke="#e2e8f0" stroke-width="1.6"/><line x1="5" y1="12" x2="19" y2="12" stroke="#e2e8f0" stroke-width="1.6"/><line x1="7" y1="7" x2="17" y2="17" stroke="#e2e8f0" stroke-width="1.2"/><line x1="7" y1="17" x2="17" y2="7" stroke="#e2e8f0" stroke-width="1.2"/></svg>`,

  fleischwurz: `<svg viewBox="0 0 24 24"><path d="M3 21 C8 20, 16 20, 21 21" stroke="#475569" stroke-width="2"/><path d="M12 21 C10 14, 7 10, 5 7" fill="none" stroke="#ef4444" stroke-width="2.2" stroke-linecap="round"/><path d="M12 21 C13 15, 17 11, 19 6" fill="none" stroke="#ef4444" stroke-width="2.2" stroke-linecap="round"/><path d="M12 21 L12 8" stroke="#991b1b" stroke-width="2" stroke-linecap="round"/><circle cx="5" cy="7" r="1.5" fill="#ef4444"/><circle cx="19" cy="6" r="1.5" fill="#ef4444"/><circle cx="12" cy="7" r="1.8" fill="#ef4444"/></svg>`,

  katakombe: `<svg viewBox="0 0 24 24"><path d="M4 21 L4 11 C4 6.5 20 6.5 20 11 L20 21 Z" fill="#0f172a" stroke="#e2e8f0" stroke-width="1.4"/><path d="M6 18 L18 18 M7 15 L17 15 M8 12 L16 12" stroke="#475569" stroke-width="1.4"/><circle cx="12" cy="8.5" r="1.6" fill="#38bdf8"/><circle cx="12" cy="8.5" r="0.8" fill="#bae6fd"/></svg>`,

  pestaltar: `<svg viewBox="0 0 24 24"><path d="M4 14 L20 14 L18 20 L6 20 Z" fill="#0f172a" stroke="#94a3b8" stroke-width="1.4"/><path d="M10 11 C10 8.5 14 8.5 14 11 C14 12.5 13.5 13 13.5 14 L10.5 14 C10.5 13 10 12.5 10 11 Z" fill="#e2e8f0"/><circle cx="11.2" cy="10.8" r="0.6" fill="#0f172a"/><circle cx="12.8" cy="10.8" r="0.6" fill="#0f172a"/><path d="M11 7 Q9 5 11 3" fill="none" stroke="#38bdf8" stroke-width="1.2" stroke-linecap="round"/><path d="M13 7 Q15 5 13 3" fill="none" stroke="#38bdf8" stroke-width="1.2" stroke-linecap="round"/></svg>`,

  ossuarium: `<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="1.5" fill="#0f172a" stroke="#475569" stroke-width="1.4"/><circle cx="8" cy="9" r="1.5" fill="#e2e8f0"/><circle cx="12" cy="9" r="1.5" fill="#e2e8f0"/><circle cx="16" cy="9" r="1.5" fill="#e2e8f0"/><circle cx="8" cy="15" r="1.5" fill="#e2e8f0"/><circle cx="12" cy="15" r="1.5" fill="#e2e8f0"/><circle cx="16" cy="15" r="1.5" fill="#e2e8f0"/><line x1="5" y1="12" x2="19" y2="12" stroke="#94a3b8" stroke-width="1"/></svg>`,

  totenarchiv: `<svg viewBox="0 0 24 24"><path d="M3 17 L12 14 L21 17 L21 7 L12 4 L3 7 Z" fill="#0f172a" stroke="#e2e8f0" stroke-width="1.3" stroke-linejoin="round"/><line x1="12" y1="4" x2="12" y2="14" stroke="#e2e8f0" stroke-width="1.3"/><path d="M5.5 8 L9.5 7 M5.5 10.5 L9.5 9.5 M5.5 13 L9.5 12" stroke="#38bdf8" stroke-width="1" stroke-linecap="round"/><path d="M14.5 7 L18.5 8 M14.5 9.5 L18.5 10.5 M14.5 12 L18.5 13" stroke="#38bdf8" stroke-width="1" stroke-linecap="round"/></svg>`,

  // -------------------------------------------------- Todesgott: Einheiten
  todesgott: `<svg viewBox="0 0 24 24"><path d="M4 22 C6 14, 8 6, 12 3 C16 6, 18 14, 20 22 Z" fill="#0f172a" stroke="#475569" stroke-width="1.2"/><path d="M9 9 C9 7 15 7 15 9 C15 13 13.5 15 12 15 C10.5 15 9 13 9 9 Z" fill="#000000"/><ellipse cx="10.8" cy="9.8" rx="0.8" ry="1.1" fill="#bae6fd"/><ellipse cx="13.2" cy="9.8" rx="0.8" ry="1.1" fill="#bae6fd"/><path d="M3 4 C7 2, 11 3, 13 5 C10 6, 6 5, 3 4 Z" fill="#38bdf8"/><line x1="13" y1="5" x2="18" y2="20" stroke="#e2e8f0" stroke-width="1.5" stroke-linecap="round"/></svg>`,

  totengraeber: `<svg viewBox="0 0 24 24"><path d="M7 21 L16 4" stroke="#78350f" stroke-width="2" stroke-linecap="round"/><path d="M15 6 L18 3 L20 5 L17 8 Z" fill="#cbd5e1" stroke="#cbd5e1" stroke-width="1"/><path d="M5 18 L7 15 L10 18 L8 21 Z" fill="#cbd5e1"/><rect x="13" y="11" width="5" height="7" rx="1" fill="#0f172a" stroke="#e2e8f0" stroke-width="1"/><circle cx="15.5" cy="14.5" r="1.5" fill="#38bdf8"/></svg>`,

  skelettkrieger: `<svg viewBox="0 0 24 24"><path d="M7 11 C7 6.5 17 6.5 17 11 C17 14 15.5 15 14.5 16 L9.5 16 C8.5 15 7 14 7 11 Z" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1"/><circle cx="9.8" cy="10.5" r="1.2" fill="#0f172a"/><circle cx="14.2" cy="10.5" r="1.2" fill="#0f172a"/><polygon points="12,12.5 11.4,13.5 12.6,13.5" fill="#0f172a"/><line x1="10" y1="16" x2="10" y2="18" stroke="#e2e8f0" stroke-width="1"/><line x1="12" y1="16" x2="12" y2="18" stroke="#e2e8f0" stroke-width="1"/><line x1="14" y1="16" x2="14" y2="18" stroke="#e2e8f0" stroke-width="1"/><path d="M3 21 C5 14, 9 9, 17 4 C15 7, 11 14, 7 21 Z" fill="#cbd5e1"/></svg>`,

  aasgeier: `<svg viewBox="0 0 24 24"><path d="M2 10 C6 7, 10 9, 12 12 C14 9, 18 7, 22 10 C18 14, 14 14, 12 18 C10 14, 6 14, 2 10 Z" fill="#0f172a" stroke="#475569" stroke-width="1.2"/><circle cx="12" cy="7.5" r="1.8" fill="#e2e8f0"/><path d="M12 8.5 L10.5 10.5 L12 10 Z" fill="#94a3b8"/></svg>`,

  klageweib: `<svg viewBox="0 0 24 24"><path d="M8 22 C6 17, 8 9, 12 5 C16 9, 18 17, 16 22 C14 19, 10 19, 8 22 Z" fill="#38bdf8" opacity="0.35"/><path d="M9 20 C8 15, 10 9, 12 7 C14 9, 16 15, 15 20 Z" fill="#bae6fd"/><circle cx="12" cy="6" r="2.2" fill="#e2e8f0"/><ellipse cx="12" cy="6.8" rx="0.7" ry="1.2" fill="#0f172a"/><path d="M6 5 C4 7, 4 10, 6 12" fill="none" stroke="#38bdf8" stroke-width="1.2" stroke-linecap="round"/><path d="M18 5 C20 7, 20 10, 18 12" fill="none" stroke="#38bdf8" stroke-width="1.2" stroke-linecap="round"/></svg>`,

  grabwaechter: `<svg viewBox="0 0 24 24"><path d="M6 13 L6 10 C6 6, 18 6, 18 10 L18 13 L16 15 L16 19 L8 19 L8 15 Z" fill="#0f172a" stroke="#e2e8f0" stroke-width="1.4"/><line x1="8" y1="12" x2="16" y2="12" stroke="#38bdf8" stroke-width="1.6"/><path d="M6 9 C3 8, 3 4, 5 3 C6 5, 6 7, 7 8" fill="#e2e8f0"/><path d="M18 9 C21 8, 21 4, 19 3 C18 5, 18 7, 17 8" fill="#e2e8f0"/></svg>`,

  knochentitan: `<svg viewBox="0 0 24 24"><path d="M4 14 C3 8, 8 4, 12 3 C16 4, 21 8, 20 14 C19 18, 16 21, 12 21 C8 21, 5 18, 4 14 Z" fill="#e2e8f0" stroke="#475569" stroke-width="1.4"/><circle cx="8.5" cy="11.5" r="2" fill="#0f172a"/><circle cx="15.5" cy="11.5" r="2" fill="#0f172a"/><circle cx="8.5" cy="11.5" r="0.9" fill="#38bdf8"/><circle cx="15.5" cy="11.5" r="0.9" fill="#38bdf8"/><path d="M7 16 L5 22 L8 19 Z" fill="#94a3b8"/><path d="M17 16 L19 22 L16 19 Z" fill="#94a3b8"/></svg>`,

  // -------------------------------------------------- Elite: Menschen
  paladin: `<svg viewBox="0 0 24 24"><path d="M5 14 L5 8 C5 4, 19 4, 19 8 L19 14 C19 19, 12 22, 12 22 C12 22, 5 19, 5 14 Z" fill="#cbd5e1" stroke="#d8b06a" stroke-width="1.5"/><line x1="7" y1="10.5" x2="17" y2="10.5" stroke="#d8b06a" stroke-width="1.8"/><line x1="12" y1="6.5" x2="12" y2="16.5" stroke="#d8b06a" stroke-width="1.8"/><circle cx="12" cy="3" r="1.5" fill="#fef08a"/></svg>`,

  wagenburg: `<svg viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="10" rx="1.5" fill="#78350f" stroke="#cbd5e1" stroke-width="1.5"/><rect x="5.5" y="10" width="2.5" height="4" fill="#000000"/><rect x="10.8" y="10" width="2.5" height="4" fill="#000000"/><rect x="16" y="10" width="2.5" height="4" fill="#000000"/><circle cx="6.5" cy="18" r="3" fill="#cbd5e1" stroke="#000000" stroke-width="1"/><circle cx="17.5" cy="18" r="3" fill="#cbd5e1" stroke="#000000" stroke-width="1"/><path d="M4 7 L4 4 L7 4 L7 7 L10 7 L10 4 L14 4 L14 7 L17 7 L17 4 L20 4 L20 7" fill="none" stroke="#d8b06a" stroke-width="1.2"/></svg>`,

  scharfschuetze: `<svg viewBox="0 0 24 24"><path d="M3 10 C8 16, 16 16, 21 10" fill="none" stroke="#cbd5e1" stroke-width="2.5" stroke-linecap="round"/><line x1="3" y1="10" x2="21" y2="10" stroke="#d8b06a" stroke-width="1.2"/><rect x="10.8" y="5" width="2.4" height="15" fill="#78350f"/><circle cx="12" cy="7" r="3" fill="none" stroke="#d8b06a" stroke-width="1.2"/><line x1="12" y1="3" x2="12" y2="11" stroke="#d8b06a" stroke-width="0.8"/><line x1="8" y1="7" x2="16" y2="7" stroke="#d8b06a" stroke-width="0.8"/></svg>`,

  priester: `<svg viewBox="0 0 24 24"><circle cx="12" cy="16" r="4" fill="#d8b06a" stroke="#fef08a" stroke-width="1.2"/><line x1="12" y1="4" x2="12" y2="12" stroke="#cbd5e1" stroke-width="1.4" stroke-dasharray="1.5 1"/><path d="M9 13 Q7 9 10 6" fill="none" stroke="#fef08a" stroke-width="1.2" stroke-linecap="round"/><path d="M15 13 Q17 9 14 6" fill="none" stroke="#fef08a" stroke-width="1.2" stroke-linecap="round"/><circle cx="12" cy="4" r="2" fill="#d8b06a"/></svg>`,

  // -------------------------------------------------- Elite: Waldgott
  moosbaer: `<svg viewBox="0 0 24 24"><path d="M4 11 C3 7, 7 4, 9 6 C11 4, 13 4, 15 6 C17 4, 21 7, 20 11 C21 16, 17 21, 12 21 C7 21, 3 16, 4 11 Z" fill="#15803d" stroke="#8fb86a" stroke-width="1.4"/><ellipse cx="12" cy="15" rx="3.5" ry="2.8" fill="#573418"/><circle cx="12" cy="13.8" r="1.2" fill="#000000"/><polygon points="10.2,16.5 11,18 11.5,16.5" fill="#ffffff"/><polygon points="13.8,16.5 13,18 12.5,16.5" fill="#ffffff"/><circle cx="8.5" cy="10.5" r="1" fill="#bbf7d0"/><circle cx="15.5" cy="10.5" r="1" fill="#bbf7d0"/></svg>`,

  fluesterer: `<svg viewBox="0 0 24 24"><path d="M7 6 C7 4, 17 4, 17 6 L16 17 C16 20, 8 20, 8 17 Z" fill="#573418" stroke="#8fb86a" stroke-width="1.4"/><ellipse cx="10" cy="11" rx="1.2" ry="1.8" fill="#bbf7d0"/><ellipse cx="14" cy="11" rx="1.2" ry="1.8" fill="#bbf7d0"/><path d="M4 8 Q6 4 8 7" fill="none" stroke="#8fb86a" stroke-width="1.5"/><path d="M20 8 Q18 4 16 7" fill="none" stroke="#8fb86a" stroke-width="1.5"/></svg>`,

  kronenhirsch: `<svg viewBox="0 0 24 24"><path d="M12 21 L10 14 L14 14 Z" fill="#573418"/><path d="M10 14 C8 10, 4 8, 3 4 M6 8 C8 6, 8 4, 7 2 M6 10 C4 11, 2 10, 2 8" fill="none" stroke="#8fb86a" stroke-width="1.6" stroke-linecap="round"/><path d="M14 14 C16 10, 20 8, 21 4 M18 8 C16 6, 16 4, 17 2 M18 10 C20 11, 22 10, 22 8" fill="none" stroke="#8fb86a" stroke-width="1.6" stroke-linecap="round"/><circle cx="12" cy="7" r="1.8" fill="#bbf7d0"/></svg>`,

  dornenhydra: `<svg viewBox="0 0 24 24"><path d="M5 21 C5 14, 8 11, 8 6" fill="none" stroke="#15803d" stroke-width="2.2" stroke-linecap="round"/><path d="M12 21 L12 4" stroke="#8fb86a" stroke-width="2.4" stroke-linecap="round"/><path d="M19 21 C19 14, 16 11, 16 6" fill="none" stroke="#15803d" stroke-width="2.2" stroke-linecap="round"/><circle cx="8" cy="6" r="2" fill="#573418"/><circle cx="12" cy="4" r="2.2" fill="#573418"/><circle cx="16" cy="6" r="2" fill="#573418"/><circle cx="8" cy="5.5" r="0.7" fill="#bbf7d0"/><circle cx="12" cy="3.5" r="0.8" fill="#bbf7d0"/><circle cx="16" cy="5.5" r="0.7" fill="#bbf7d0"/></svg>`,

  // -------------------------------------------------- Fähigkeiten: Todesgott
  grabesklaelte: `<svg viewBox="0 0 24 24"><line x1="12" y1="2" x2="12" y2="22" stroke="#38bdf8" stroke-width="1.8"/><line x1="2" y1="12" x2="22" y2="12" stroke="#38bdf8" stroke-width="1.8"/><line x1="5" y1="5" x2="19" y2="19" stroke="#38bdf8" stroke-width="1.4"/><line x1="5" y1="19" x2="19" y2="5" stroke="#38bdf8" stroke-width="1.4"/><path d="M10 4 L12 2 L14 4 M10 20 L12 22 L14 20" stroke="#bae6fd" stroke-width="1.2" fill="none"/><path d="M4 10 L2 12 L4 14 M20 10 L22 12 L20 14" stroke="#bae6fd" stroke-width="1.2" fill="none"/><circle cx="12" cy="12" r="2.5" fill="#bae6fd"/></svg>`,
  grabeskaelte: `<svg viewBox="0 0 24 24"><line x1="12" y1="2" x2="12" y2="22" stroke="#38bdf8" stroke-width="1.8"/><line x1="2" y1="12" x2="22" y2="12" stroke="#38bdf8" stroke-width="1.8"/><line x1="5" y1="5" x2="19" y2="19" stroke="#38bdf8" stroke-width="1.4"/><line x1="5" y1="19" x2="19" y2="5" stroke="#38bdf8" stroke-width="1.4"/><path d="M10 4 L12 2 L14 4 M10 20 L12 22 L14 20" stroke="#bae6fd" stroke-width="1.2" fill="none"/><path d="M4 10 L2 12 L4 14 M20 10 L22 12 L20 14" stroke="#bae6fd" stroke-width="1.2" fill="none"/><circle cx="12" cy="12" r="2.5" fill="#bae6fd"/></svg>`,

  seelenernte: `<svg viewBox="0 0 24 24"><path d="M12 3 C17 3, 21 7, 21 12 C21 17, 17 21, 12 21 C7 21, 3 17, 3 12" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-dasharray="8 4"/><circle cx="12" cy="12" r="4.5" fill="#0f172a" stroke="#bae6fd" stroke-width="1.4"/><circle cx="12" cy="12" r="2" fill="#bae6fd"/></svg>`,
  seelenrausch: `<svg viewBox="0 0 24 24"><path d="M12 3 C17 3, 21 7, 21 12 C21 17, 17 21, 12 21 C7 21, 3 17, 3 12" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-dasharray="8 4"/><circle cx="12" cy="12" r="4.5" fill="#0f172a" stroke="#bae6fd" stroke-width="1.4"/><circle cx="12" cy="12" r="2" fill="#bae6fd"/></svg>`,

  knochensturm: `<svg viewBox="0 0 24 24"><path d="M4 5 L20 5 M6 9 L18 9 M7 13 L17 13 M9 17 L15 17 M11 21 L13 21" stroke="#e2e8f0" stroke-width="2.2" stroke-linecap="round"/><path d="M5 4 L8 8 M19 4 L16 8" stroke="#38bdf8" stroke-width="1.4"/><path d="M7 12 L9 15 M17 12 L15 15" stroke="#38bdf8" stroke-width="1.4"/></svg>`,

  // -------------------------------------------------- Neue Rollen: Menschen
  ballonhalle: `<svg viewBox="0 0 24 24"><path d="M2 21 L2 10 C2 5, 22 5, 22 10 L22 21 Z" fill="#243b53" stroke="${IC_M}" stroke-width="1.4"/><line x1="12" y1="5" x2="12" y2="2" stroke="${IC_M}" stroke-width="1.5"/><circle cx="12" cy="2" r="1.2" fill="${IC_M_HELL}"/><path d="M6 21 L6 13 C6 10, 18 10, 18 13 L18 21 Z" fill="#0f172a" stroke="${IC_SILBER}" stroke-width="1"/><path d="M2 13 C7 11, 17 11, 22 13" fill="none" stroke="${IC_M}" stroke-width="1"/></svg>`,

  flakbatterie: `<svg viewBox="0 0 24 24"><path d="M3 21 L21 21 L19 14 L5 14 Z" fill="#243b53" stroke="${IC_M}" stroke-width="1.2"/><path d="M8 14 L12 5 M11 14 L15 5 M13 14 L17 5 M16 14 L20 5" stroke="${IC_SILBER}" stroke-width="1.5" stroke-linecap="round"/><circle cx="12" cy="14" r="3" fill="#334155" stroke="${IC_M}" stroke-width="1"/></svg>`,

  schildturm: `<svg viewBox="0 0 24 24"><path d="M8 21 L10 9 L14 9 L16 21 Z" fill="#243b53" stroke="${IC_M}" stroke-width="1.2"/><circle cx="12" cy="7" r="3.5" fill="#38bdf8" opacity="0.4"/><circle cx="12" cy="7" r="2" fill="#bae6fd"/><path d="M6 8 C6 3, 18 3, 18 8" fill="none" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="2 1.5"/><line x1="12" y1="12" x2="12" y2="18" stroke="${IC_M}" stroke-width="1.2"/></svg>`,

  aetherwandler: `<svg viewBox="0 0 24 24"><rect x="4" y="8" width="7" height="12" rx="1.5" fill="#243b53" stroke="${IC_M}" stroke-width="1.2"/><circle cx="16.5" cy="14" r="4.5" fill="#0284c7" stroke="${IC_SILBER}" stroke-width="1.2"/><path d="M7.5 8 L7.5 4 L16.5 4 L16.5 9.5" fill="none" stroke="${IC_M}" stroke-width="1.4"/><circle cx="16.5" cy="14" r="2" fill="#1fd35a"/></svg>`,

  grossgiesserei: `<svg viewBox="0 0 24 24"><rect x="3" y="10" width="18" height="11" rx="1" fill="#243b53" stroke="${IC_M}" stroke-width="1.2"/><line x1="6" y1="10" x2="6" y2="4" stroke="${IC_SILBER}" stroke-width="2"/><line x1="10" y1="10" x2="10" y2="3" stroke="${IC_SILBER}" stroke-width="2"/><path d="M14 21 L14 14 L18 14 L18 21 Z" fill="#f97316"/><line x1="3" y1="13" x2="21" y2="13" stroke="${IC_M}" stroke-width="1"/></svg>`,

  belagerungsmoerser: `<svg viewBox="0 0 24 24"><path d="M3 21 L21 21 L18 16 L6 16 Z" fill="#243b53" stroke="${IC_M}" stroke-width="1.2"/><path d="M9 16 L17 6 L20 8.5 L12 18.5 Z" fill="${IC_SILBER}" stroke="${IC_SILBER_D}" stroke-width="0.8"/><circle cx="10" cy="16" r="3" fill="#0f172a" stroke="${IC_M}" stroke-width="1.2"/><circle cx="18.5" cy="7.2" r="1.6" fill="#f97316"/></svg>`,

  abfangposten: `<svg viewBox="0 0 24 24"><rect x="4" y="12" width="16" height="9" rx="1.5" fill="#243b53" stroke="${IC_M}" stroke-width="1.2"/><path d="M7 12 L10 5 L12 6 L9 13 Z" fill="${IC_SILBER}"/><path d="M12 12 L15 5 L17 6 L14 13 Z" fill="${IC_SILBER}"/><circle cx="12" cy="17" r="2" fill="#38bdf8"/><path d="M17 12 L17 8 L20 7" fill="none" stroke="${IC_M}" stroke-width="1.2"/></svg>`,

  fluggleiter: `<svg viewBox="0 0 24 24"><path d="M2 12 C8 10, 16 10, 22 12 L19 14 C14 13, 10 13, 5 14 Z" fill="${IC_M}" stroke="${IC_M_HELL}" stroke-width="0.8"/><rect x="11" y="5" width="2" height="14" rx="1" fill="#78350f"/><line x1="8" y1="18" x2="16" y2="18" stroke="${IC_M}" stroke-width="1.5"/><circle cx="12" cy="5" r="1.5" fill="${IC_SILBER}"/></svg>`,

  brandballon: `<svg viewBox="0 0 24 24"><ellipse cx="12" cy="10" rx="9" ry="5.5" fill="#243b53" stroke="${IC_M}" stroke-width="1.4"/><line x1="4" y1="10" x2="20" y2="10" stroke="${IC_M_HELL}" stroke-width="1"/><rect x="9.5" y="17" width="5" height="3" rx="0.8" fill="#78350f" stroke="${IC_M}" stroke-width="1"/><line x1="10" y1="15.5" x2="10" y2="17" stroke="${IC_SILBER}" stroke-width="0.8"/><line x1="14" y1="15.5" x2="14" y2="17" stroke="${IC_SILBER}" stroke-width="0.8"/><circle cx="12" cy="18.5" r="1" fill="#ef4444"/></svg>`,

  dampfkoloss: `<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="10" rx="2" fill="#243b53" stroke="${IC_M}" stroke-width="1.4"/><circle cx="12" cy="11" r="2.5" fill="#f97316"/><line x1="8" y1="6" x2="8" y2="2" stroke="${IC_SILBER}" stroke-width="2"/><line x1="16" y1="6" x2="16" y2="2" stroke="${IC_SILBER}" stroke-width="2"/><line x1="3" y1="11" x2="6" y2="11" stroke="${IC_SILBER}" stroke-width="2.5"/><line x1="18" y1="11" x2="21" y2="11" stroke="${IC_SILBER}" stroke-width="2.5"/><rect x="7" y="16" width="3" height="6" fill="#0f172a"/><rect x="14" y="16" width="3" height="6" fill="#0f172a"/></svg>`,

  // -------------------------------------------------- Neue Rollen: Wald- und Wiesengott
  wipfelhorst: `<svg viewBox="0 0 24 24"><path d="M12 22 L12 11 M8 22 C8 15, 10 13, 6 10 M16 22 C16 15, 14 13, 18 10" stroke="${IC_HOLZ}" stroke-width="2" stroke-linecap="round"/><ellipse cx="12" cy="9" rx="8" ry="4" fill="#15803d" stroke="${IC_G}" stroke-width="1.3"/><circle cx="12" cy="7" r="2" fill="${IC_G_HELL}"/></svg>`,

  sporenwerfer: `<svg viewBox="0 0 24 24"><path d="M6 21 C6 14, 18 14, 18 21 Z" fill="#14532d" stroke="${IC_G}" stroke-width="1.2"/><path d="M8 14 L7 6 C7 4, 11 4, 10 7 L11 14" fill="#15803d" stroke="${IC_G}" stroke-width="1"/><path d="M13 14 L14 5 C14 3, 18 3, 17 6 L16 14" fill="#15803d" stroke="${IC_G}" stroke-width="1"/><circle cx="8.5" cy="5" r="1.3" fill="#a3e635"/><circle cx="15.5" cy="4" r="1.3" fill="#a3e635"/></svg>`,

  hainschild: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="${IC_G}" stroke-width="1.8" stroke-dasharray="3 2"/><circle cx="12" cy="12" r="4" fill="#15803d" stroke="#a3e635" stroke-width="1.2"/><path d="M12 3 C12 7, 7 12, 12 12 C17 12, 12 7, 12 3 Z" fill="#84cc16"/></svg>`,

  bluetenkelch: `<svg viewBox="0 0 24 24"><path d="M12 21 C7 17, 4 12, 4 7 C8 8, 11 11, 12 15 C13 11, 16 8, 20 7 C20 12, 17 17, 12 21 Z" fill="#15803d" stroke="${IC_G}" stroke-width="1.3"/><circle cx="12" cy="10" r="2.5" fill="#facc15"/><circle cx="12" cy="10" r="1" fill="#ffffff"/></svg>`,

  lebensschmiede: `<svg viewBox="0 0 24 24"><path d="M4 21 C4 11, 20 11, 20 21 Z" fill="#14532d" stroke="${IC_G}" stroke-width="1.4"/><circle cx="12" cy="14" r="4.5" fill="#22c55e" opacity="0.4"/><circle cx="12" cy="14" r="2.2" fill="#86efac"/><path d="M12 5 L12 9 M9 7 L12 9 L15 7" stroke="${IC_G}" stroke-width="1.5" stroke-linecap="round"/></svg>`,

  zornwurzel: `<svg viewBox="0 0 24 24"><path d="M2 21 C6 18, 18 18, 22 21" stroke="${IC_HOLZ}" stroke-width="2"/><path d="M12 21 C10 13, 6 9, 7 3 C9 9, 13 11, 12 21 Z" fill="#78350f" stroke="${IC_G}" stroke-width="1.2"/><path d="M10 13 L5 8 M14 11 L19 7" stroke="#ef4444" stroke-width="1.8" stroke-linecap="round"/><circle cx="7" cy="3" r="1.5" fill="#ef4444"/></svg>`,

  himmelsdorn: `<svg viewBox="0 0 24 24"><path d="M10 21 L12 3 L14 21 Z" fill="#14532d" stroke="${IC_G}" stroke-width="1.2"/><path d="M8 17 L5 14 M16 15 L19 12 M9 11 L6 8 M15 9 L18 6" stroke="${IC_G}" stroke-width="1.6" stroke-linecap="round"/><circle cx="12" cy="3" r="1.3" fill="#a3e635"/></svg>`,

  wipfelausguck: `<svg viewBox="0 0 24 24"><line x1="12" y1="22" x2="12" y2="6" stroke="${IC_HOLZ}" stroke-width="2.5"/><polygon points="7,8 17,8 15,5 9,5" fill="#15803d" stroke="${IC_G}" stroke-width="1"/><circle cx="12" cy="3.5" r="2" fill="#fef08a"/><line x1="10" y1="12" x2="14" y2="12" stroke="${IC_G}" stroke-width="1.2"/><line x1="10" y1="16" x2="14" y2="16" stroke="${IC_G}" stroke-width="1.2"/></svg>`,

  hornissenschwarm: `<svg viewBox="0 0 24 24"><ellipse cx="12" cy="13" rx="3.5" ry="5" fill="#eab308" stroke="#0f172a" stroke-width="1.2"/><line x1="9" y1="11" x2="15" y2="11" stroke="#0f172a" stroke-width="1.2"/><line x1="9" y1="14" x2="15" y2="14" stroke="#0f172a" stroke-width="1.2"/><path d="M5 9 Q10 7 12 11 Q14 7 19 9" fill="none" stroke="${IC_G_HELL}" stroke-width="1.5"/><line x1="12" y1="18" x2="12" y2="21" stroke="#0f172a" stroke-width="1.5"/></svg>`,

  walddrache: `<svg viewBox="0 0 24 24"><path d="M3 15 C8 11, 14 13, 21 8 C17 14, 12 16, 5 20 Z" fill="#15803d" stroke="${IC_G}" stroke-width="1.3"/><path d="M12 12 C10 6, 16 4, 19 4 C17 7, 16 9, 12 12 Z" fill="${IC_G_HELL}"/><circle cx="19" cy="4.5" r="1" fill="#facc15"/><path d="M9 13 C6 8, 2 8, 3 11 Z" fill="${IC_G}"/></svg>`,

  weltenbaum_ent: `<svg viewBox="0 0 24 24"><rect x="6" y="8" width="12" height="12" rx="3" fill="#5c4028" stroke="${IC_G}" stroke-width="1.5"/><circle cx="12" cy="6" r="5" fill="#15803d" stroke="${IC_G_HELL}" stroke-width="1.2"/><circle cx="9.5" cy="12" r="1.3" fill="${IC_M_HELL}"/><circle cx="14.5" cy="12" r="1.3" fill="${IC_M_HELL}"/><path d="M12 14 L12 18" stroke="#3f2e1a" stroke-width="1.5"/><line x1="4" y1="12" x2="6" y2="14" stroke="${IC_HOLZ}" stroke-width="2"/><line x1="20" y1="12" x2="18" y2="14" stroke="${IC_HOLZ}" stroke-width="2"/></svg>`,

  // -------------------------------------------------- Neue Rollen: Totenreich
  knochenhorst: `<svg viewBox="0 0 24 24"><path d="M4 21 L8 12 L16 12 L20 21 Z" fill="#0f172a" stroke="#e2e8f0" stroke-width="1.2"/><ellipse cx="12" cy="11" rx="6" ry="3" fill="#1e293b" stroke="#38bdf8" stroke-width="1.2"/><line x1="7" y1="11" x2="5" y2="7" stroke="#e2e8f0" stroke-width="1.4"/><line x1="17" y1="11" x2="19" y2="7" stroke="#e2e8f0" stroke-width="1.4"/><circle cx="12" cy="10" r="1.5" fill="#bae6fd"/></svg>`,

  seelenspeier: `<svg viewBox="0 0 24 24"><path d="M4 21 L7 14 L17 14 L20 21 Z" fill="#0f172a" stroke="#475569" stroke-width="1.2"/><path d="M8 14 L9 6 L12 8 L11 14" fill="#e2e8f0"/><path d="M13 14 L15 5 L18 7 L16 14" fill="#e2e8f0"/><circle cx="10" cy="5.5" r="1.2" fill="#38bdf8"/><circle cx="16" cy="4.5" r="1.2" fill="#38bdf8"/></svg>`,

  seelenkuppel: `<svg viewBox="0 0 24 24"><path d="M3 21 C3 10, 21 10, 21 21 Z" fill="#0f172a" stroke="#38bdf8" stroke-width="1.5"/><path d="M7 21 C7 14, 17 14, 17 21" fill="none" stroke="#e2e8f0" stroke-width="1.2"/><circle cx="12" cy="13" r="3" fill="#38bdf8" opacity="0.4"/><circle cx="12" cy="13" r="1.5" fill="#bae6fd"/></svg>`,

  entropieofen: `<svg viewBox="0 0 24 24"><rect x="4" y="8" width="16" height="13" rx="1.5" fill="#0f172a" stroke="#475569" stroke-width="1.3"/><rect x="8" y="12" width="8" height="6" fill="#1e293b" stroke="#38bdf8" stroke-width="1"/><line x1="12" y1="12" x2="12" y2="18" stroke="#38bdf8" stroke-width="1"/><circle cx="12" cy="15" r="1.8" fill="#bae6fd"/><line x1="12" y1="8" x2="12" y2="3" stroke="#e2e8f0" stroke-width="2"/></svg>`,

  fossilienwerk: `<svg viewBox="0 0 24 24"><rect x="3" y="12" width="18" height="9" fill="#0f172a" stroke="#475569" stroke-width="1.2"/><path d="M5 12 Q12 5 19 12" fill="none" stroke="#e2e8f0" stroke-width="1.8"/><line x1="8" y1="9" x2="8" y2="12" stroke="#e2e8f0" stroke-width="1.2"/><line x1="12" y1="7" x2="12" y2="12" stroke="#e2e8f0" stroke-width="1.2"/><line x1="16" y1="9" x2="16" y2="12" stroke="#e2e8f0" stroke-width="1.2"/><circle cx="12" cy="16" r="2" fill="#38bdf8"/></svg>`,

  seuchenmoerser: `<svg viewBox="0 0 24 24"><path d="M3 21 L21 21 L18 16 L6 16 Z" fill="#0f172a" stroke="#475569" stroke-width="1.2"/><path d="M8 17 L16 7 L19 9 L11 19 Z" fill="#e2e8f0"/><circle cx="9" cy="17" r="3" fill="#1e293b" stroke="#e2e8f0" stroke-width="1"/><circle cx="17.5" cy="8" r="2" fill="#10b981"/></svg>`,

  schattenschirm: `<svg viewBox="0 0 24 24"><line x1="12" y1="21" x2="12" y2="8" stroke="#475569" stroke-width="2"/><ellipse cx="12" cy="7" rx="7" ry="4" fill="#0f172a" stroke="#38bdf8" stroke-width="1.4"/><circle cx="12" cy="7" r="1.8" fill="#bae6fd"/><path d="M6 7 Q12 2 18 7" fill="none" stroke="#38bdf8" stroke-width="1.2"/></svg>`,

  geisterturm: `<svg viewBox="0 0 24 24"><path d="M8 21 L10 8 L14 8 L16 21 Z" fill="#0f172a" stroke="#e2e8f0" stroke-width="1.2"/><circle cx="12" cy="5" r="3.2" fill="#38bdf8" opacity="0.4"/><circle cx="12" cy="5" r="1.8" fill="#bae6fd"/><line x1="12" y1="11" x2="12" y2="17" stroke="#38bdf8" stroke-width="1.2"/></svg>`,

  schattenflieger: `<svg viewBox="0 0 24 24"><path d="M2 13 C7 9, 11 11, 12 15 C13 11, 17 9, 22 13 C18 17, 14 16, 12 20 C10 16, 6 17, 2 13 Z" fill="#0f172a" stroke="#38bdf8" stroke-width="1.2"/><circle cx="12" cy="11" r="1.8" fill="#e2e8f0"/><ellipse cx="12" cy="11" rx="0.6" ry="1" fill="#38bdf8"/></svg>`,

  pestschwinge: `<svg viewBox="0 0 24 24"><path d="M3 11 C8 7, 13 9, 21 6 C17 12, 13 14, 5 18 Z" fill="#1e293b" stroke="#10b981" stroke-width="1.3"/><circle cx="12" cy="13" r="3.5" fill="#334155"/><circle cx="12" cy="14" r="1.5" fill="#10b981"/><circle cx="18" cy="7" r="1.2" fill="#e2e8f0"/></svg>`,

  knochendrache: `<svg viewBox="0 0 24 24"><path d="M2 9 C8 5, 14 7, 22 4 C18 11, 13 13, 3 17 Z" fill="none" stroke="#e2e8f0" stroke-width="1.5"/><line x1="7" y1="8" x2="7" y2="13" stroke="#e2e8f0" stroke-width="1.2"/><line x1="12" y1="7" x2="12" y2="12" stroke="#e2e8f0" stroke-width="1.2"/><line x1="17" y1="6" x2="17" y2="10" stroke="#e2e8f0" stroke-width="1.2"/><circle cx="19" cy="4.5" r="2" fill="#e2e8f0"/><circle cx="19" cy="4.5" r="0.8" fill="#38bdf8"/><circle cx="10" cy="12" r="1.5" fill="#38bdf8"/></svg>`,

  // -------------------------------------------------- Effekte
  schildkuppel: `<svg viewBox="0 0 24 24"><path d="M3 19 C3 8, 21 8, 21 19 Z" fill="#38bdf8" opacity="0.3" stroke="#38bdf8" stroke-width="1.8"/><circle cx="12" cy="14" r="3" fill="#bae6fd" opacity="0.5"/><path d="M7 19 C7 12, 17 12, 17 19" fill="none" stroke="#bae6fd" stroke-width="1.2" stroke-dasharray="2 2"/></svg>`,

  fernschlag: `<svg viewBox="0 0 24 24"><path d="M19 5 L14 10 L12 8 L17 3 Z" fill="#cbd5e1" stroke="#e2e8f0" stroke-width="1"/><path d="M12 8 L8 12 L7 11 L11 7 Z" fill="#64748b"/><path d="M8 12 L4 16 L3 21 L8 20 L12 16 Z" fill="#ef4444"/><circle cx="18" cy="4" r="1.5" fill="#facc15"/></svg>`,

  flak: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.5" fill="#facc15"/><line x1="12" y1="3" x2="12" y2="7" stroke="#ef4444" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="17" x2="12" y2="21" stroke="#ef4444" stroke-width="2" stroke-linecap="round"/><line x1="3" y1="12" x2="7" y2="12" stroke="#ef4444" stroke-width="2" stroke-linecap="round"/><line x1="17" y1="12" x2="21" y2="12" stroke="#ef4444" stroke-width="2" stroke-linecap="round"/><line x1="5.5" y1="5.5" x2="8.5" y2="8.5" stroke="#f97316" stroke-width="1.8" stroke-linecap="round"/><line x1="15.5" y1="15.5" x2="18.5" y2="18.5" stroke="#f97316" stroke-width="1.8" stroke-linecap="round"/><line x1="5.5" y1="18.5" x2="8.5" y2="15.5" stroke="#f97316" stroke-width="1.8" stroke-linecap="round"/><line x1="15.5" y1="8.5" x2="18.5" y2="5.5" stroke="#f97316" stroke-width="1.8" stroke-linecap="round"/></svg>`,
};


