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
    <!-- Fahrgestell / Räder -->
    <line x1="2" y1="18.5" x2="22" y2="18.5" stroke="${IC_HOLZ}" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="5.5" cy="19" r="2.5" fill="#334e68" stroke="${IC_M}" stroke-width="1.4"/>
    <circle cx="18.5" cy="19" r="2.5" fill="#334e68" stroke="${IC_M}" stroke-width="1.4"/>
    <!-- Stützrahmen -->
    <path d="M8 18 L12 9 L15 18" stroke="${IC_HOLZ}" stroke-width="2" fill="none" stroke-linejoin="round"/>
    <!-- Wurfarm und Korb mit Stein -->
    <line x1="7" y1="14" x2="19" y2="5" stroke="${IC_M}" stroke-width="2" stroke-linecap="round"/>
    <circle cx="20" cy="4" r="2.2" fill="${IC_STEIN}" stroke="${IC_SILBER}" stroke-width="0.6"/>
    <rect x="5.5" y="13" width="3" height="3" rx="0.5" fill="${IC_STEIN_D}"/>
  </svg>`,

  held: `<svg viewBox="0 0 24 24">
    <!-- Ritterhelm mit goldener Krone und Schirm -->
    <path d="M6 13 C6 8, 8 5, 12 5 C16 5, 18 8, 18 13 L18 16 C18 19, 15 20, 12 20 C9 20, 6 19, 6 16 Z" fill="${IC_SILBER}" stroke="${IC_SILBER_D}" stroke-width="0.8"/>
    <!-- Sehschlitze / Visier -->
    <path d="M8.5 12.5 H15.5 M12 11 V16" stroke="#102a43" stroke-width="1.4" stroke-linecap="round"/>
    <!-- Goldene Krone auf dem Scheitel -->
    <path d="M6.5 6 L8.5 3 L12 5 L15.5 3 L17.5 6 Z" fill="${IC_M}" stroke="${IC_M_HELL}" stroke-width="0.5"/>
    <circle cx="12" cy="5" r="1" fill="#fff"/>
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
};
