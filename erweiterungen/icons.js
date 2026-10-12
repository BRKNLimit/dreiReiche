// Icons fuer die Erweiterungen: Todesgott & Elite-Einheiten.
// Gehoert zur Grafik (siehe GEMINI.md).
//
// Jedes Icon ist ein gueltiger SVG-String mit viewBox="0 0 24 24", ohne width/height,
// ohne externe Verweise, lesbar ab 20 px auf dunklem Hintergrund (#021722).

const IC_KNOCHEN = '#e2e8f0';
const IC_KNOCHEN_D = '#94a3b8';
const IC_SCHATTEN = '#0f172a';
const IC_ASCHE = '#475569';
const IC_ZYAN = '#38bdf8';
const IC_ZYAN_HELL = '#bae6fd';
const IC_ZYAN_GLOW = '#0284c7';
const IC_BLUT = '#ef4444';
const IC_BLUT_D = '#991b1b';

const IC_M_GOLD = '#d8b06a';
const IC_M_HELL = '#fef08a';
const IC_M_STAHL = '#cbd5e1';
const IC_M_HOLZ = '#78350f';

const IC_G_GRUEN = '#8fb86a';
const IC_G_HELL = '#bbf7d0';
const IC_G_MOOS = '#15803d';
const IC_G_HOLZ = '#573418';

export const EXPANSION_ICONS = {
  // ============================================================= Todesgott: Gebäude
  nekropole: `<svg viewBox="0 0 24 24">
    <!-- Nekropole: Gewaltiges Mausoleum mit Knochengiebel und Seelenauge -->
    <path d="M3 21 L21 21 L19 11 L12 4 L5 11 Z" fill="${IC_SCHATTEN}" stroke="${IC_ASCHE}" stroke-width="1.2"/>
    <path d="M7 11 L12 6.5 L17 11" fill="none" stroke="${IC_KNOCHEN}" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M10 21 L10 14 C10 12.8 14 12.8 14 14 L14 21 Z" fill="${IC_SCHATTEN}" stroke="${IC_ZYAN}" stroke-width="1"/>
    <!-- Spektrales Seelenfeuer im Giebel -->
    <circle cx="12" cy="9.5" r="2.2" fill="${IC_ZYAN}" opacity="0.3"/>
    <circle cx="12" cy="9.5" r="1.2" fill="${IC_ZYAN_HELL}"/>
    <!-- Pfeiler -->
    <line x1="5.5" y1="12" x2="5.5" y2="20.5" stroke="${IC_KNOCHEN_D}" stroke-width="1"/>
    <line x1="18.5" y1="12" x2="18.5" y2="20.5" stroke="${IC_KNOCHEN_D}" stroke-width="1"/>
  </svg>`,

  grabhuegel: `<svg viewBox="0 0 24 24">
    <!-- Grabhügel: Gewölbter Hügel mit Monolith und Runen -->
    <path d="M2 20 C4 14, 20 14, 22 20 Z" fill="${IC_SCHATTEN}" stroke="${IC_ASCHE}" stroke-width="1.2"/>
    <path d="M10 8 L14 7 L15 18 L9 18 Z" fill="${IC_ASCHE}" stroke="${IC_KNOCHEN}" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M12 9.5 L12 15 M10.8 11.5 L13.2 11.5" stroke="${IC_ZYAN}" stroke-width="1.2" stroke-linecap="round"/>
    <!-- Schädel am Hügelfuß -->
    <circle cx="6.5" cy="18" r="1.4" fill="${IC_KNOCHEN}"/>
    <circle cx="17.5" cy="18.5" r="1.3" fill="${IC_KNOCHEN}"/>
  </svg>`,

  knochenturm: `<svg viewBox="0 0 24 24">
    <!-- Knochenturm: Schlanke Knochensäule mit Speerspitze -->
    <path d="M8 21 L9.5 7 L12 2 L14.5 7 L16 21 Z" fill="${IC_SCHATTEN}" stroke="${IC_KNOCHEN}" stroke-width="1.2"/>
    <!-- Rippenbögen am Schaft -->
    <path d="M8.5 17 Q12 15 15.5 17" fill="none" stroke="${IC_KNOCHEN}" stroke-width="1.2"/>
    <path d="M9 13 Q12 11 15 13" fill="none" stroke="${IC_KNOCHEN}" stroke-width="1.2"/>
    <path d="M9.5 9 Q12 7.5 14.5 9" fill="none" stroke="${IC_KNOCHEN}" stroke-width="1.2"/>
    <!-- Glühender Kristallsporn -->
    <polygon points="12,1.5 13.5,6 10.5,6" fill="${IC_ZYAN_HELL}"/>
  </svg>`,

  seelenbrunnen: `<svg viewBox="0 0 24 24">
    <!-- Seelenbrunnen: Dunkle Schale mit wirbelndem Zyan -->
    <ellipse cx="12" cy="17" rx="8" ry="4" fill="${IC_SCHATTEN}" stroke="${IC_KNOCHEN_D}" stroke-width="1.4"/>
    <ellipse cx="12" cy="15.5" rx="6.5" ry="2.6" fill="${IC_ZYAN_GLOW}"/>
    <path d="M12 5 C15 9, 8 11, 12 15" fill="none" stroke="${IC_ZYAN_HELL}" stroke-width="2" stroke-linecap="round"/>
    <circle cx="10" cy="7" r="1.2" fill="${IC_ZYAN_HELL}"/>
    <circle cx="14.5" cy="8.5" r="1" fill="${IC_ZYAN}"/>
    <circle cx="12" cy="4" r="0.8" fill="#ffffff"/>
  </svg>`,

  knochenmuehle: `<svg viewBox="0 0 24 24">
    <!-- Knochenmühle: Mahlwerk aus Knochenrädern -->
    <circle cx="12" cy="12" r="7" fill="${IC_SCHATTEN}" stroke="${IC_KNOCHEN}" stroke-width="1.4"/>
    <circle cx="12" cy="12" r="2.5" fill="${IC_ASCHE}" stroke="${IC_ZYAN}" stroke-width="1"/>
    <!-- Speichen aus Oberschenkelknochen -->
    <line x1="12" y1="5" x2="12" y2="19" stroke="${IC_KNOCHEN}" stroke-width="1.6"/>
    <line x1="5" y1="12" x2="19" y2="12" stroke="${IC_KNOCHEN}" stroke-width="1.6"/>
    <line x1="7" y1="7" x2="17" y2="17" stroke="${IC_KNOCHEN}" stroke-width="1.2"/>
    <line x1="7" y1="17" x2="17" y2="7" stroke="${IC_KNOCHEN}" stroke-width="1.2"/>
  </svg>`,

  fleischwurz: `<svg viewBox="0 0 24 24">
    <!-- Fleischwurz: Aus Rissen quellende Blutwurzeln -->
    <path d="M3 21 C8 20, 16 20, 21 21" stroke="${IC_ASCHE}" stroke-width="2"/>
    <path d="M12 21 C10 14, 7 10, 5 7" fill="none" stroke="${IC_BLUT}" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M12 21 C13 15, 17 11, 19 6" fill="none" stroke="${IC_BLUT}" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M12 21 L12 8" stroke="${IC_BLUT_D}" stroke-width="2" stroke-linecap="round"/>
    <circle cx="5" cy="7" r="1.5" fill="${IC_BLUT}"/>
    <circle cx="19" cy="6" r="1.5" fill="${IC_BLUT}"/>
    <circle cx="12" cy="7" r="1.8" fill="${IC_BLUT}"/>
  </svg>`,

  katakombe: `<svg viewBox="0 0 24 24">
    <!-- Katakombe: Gewölbter Treppenabgang in die Grüfte -->
    <path d="M4 21 L4 11 C4 6.5 20 6.5 20 11 L20 21 Z" fill="${IC_SCHATTEN}" stroke="${IC_KNOCHEN}" stroke-width="1.4"/>
    <!-- Abwärtsstufen -->
    <path d="M6 18 L18 18 M7 15 L17 15 M8 12 L16 12" stroke="${IC_ASCHE}" stroke-width="1.4"/>
    <!-- Flackernde Grabkerze / Laterne -->
    <circle cx="12" cy="8.5" r="1.6" fill="${IC_ZYAN}"/>
    <circle cx="12" cy="8.5" r="0.8" fill="${IC_ZYAN_HELL}"/>
  </svg>`,

  pestaltar: `<svg viewBox="0 0 24 24">
    <!-- Pestaltar: Schwarzer Steintisch mit Schädel & Dämpfen -->
    <path d="M4 14 L20 14 L18 20 L6 20 Z" fill="${IC_SCHATTEN}" stroke="${IC_KNOCHEN_D}" stroke-width="1.4"/>
    <!-- Schädel auf dem Altar -->
    <path d="M10 11 C10 8.5 14 8.5 14 11 C14 12.5 13.5 13 13.5 14 L10.5 14 C10.5 13 10 12.5 10 11 Z" fill="${IC_KNOCHEN}"/>
    <circle cx="11.2" cy="10.8" r="0.6" fill="${IC_SCHATTEN}"/>
    <circle cx="12.8" cy="10.8" r="0.6" fill="${IC_SCHATTEN}"/>
    <!-- Aufsteigende Giftdämpfe -->
    <path d="M11 7 Q9 5 11 3" fill="none" stroke="${IC_ZYAN}" stroke-width="1.2" stroke-linecap="round"/>
    <path d="M13 7 Q15 5 13 3" fill="none" stroke="${IC_ZYAN}" stroke-width="1.2" stroke-linecap="round"/>
  </svg>`,

  ossuarium: `<svg viewBox="0 0 24 24">
    <!-- Ossuarium: Schreinwand aus gestapelten Knochen -->
    <rect x="4" y="5" width="16" height="15" rx="1.5" fill="${IC_SCHATTEN}" stroke="${IC_ASCHE}" stroke-width="1.4"/>
    <!-- Knochengittermuster -->
    <circle cx="8" cy="9" r="1.5" fill="${IC_KNOCHEN}"/>
    <circle cx="12" cy="9" r="1.5" fill="${IC_KNOCHEN}"/>
    <circle cx="16" cy="9" r="1.5" fill="${IC_KNOCHEN}"/>
    <circle cx="8" cy="15" r="1.5" fill="${IC_KNOCHEN}"/>
    <circle cx="12" cy="15" r="1.5" fill="${IC_KNOCHEN}"/>
    <circle cx="16" cy="15" r="1.5" fill="${IC_KNOCHEN}"/>
    <line x1="5" y1="12" x2="19" y2="12" stroke="${IC_KNOCHEN_D}" stroke-width="1"/>
  </svg>`,

  totenarchiv: `<svg viewBox="0 0 24 24">
    <!-- Totenarchiv: Buch der Toten auf Steinsockel -->
    <path d="M3 17 L12 14 L21 17 L21 7 L12 4 L3 7 Z" fill="${IC_SCHATTEN}" stroke="${IC_KNOCHEN}" stroke-width="1.3" stroke-linejoin="round"/>
    <line x1="12" y1="4" x2="12" y2="14" stroke="${IC_KNOCHEN}" stroke-width="1.3"/>
    <!-- Glühende Runen auf den Seiten -->
    <path d="M5.5 8 L9.5 7 M5.5 10.5 L9.5 9.5 M5.5 13 L9.5 12" stroke="${IC_ZYAN}" stroke-width="1" stroke-linecap="round"/>
    <path d="M14.5 7 L18.5 8 M14.5 9.5 L18.5 10.5 M14.5 12 L18.5 13" stroke="${IC_ZYAN}" stroke-width="1" stroke-linecap="round"/>
  </svg>`,

  // ============================================================= Todesgott: Einheiten
  todesgott: `<svg viewBox="0 0 24 24">
    <!-- Todesgott: Kapuze mit leuchtenden Augen und gekreuzten Seelensensen -->
    <path d="M4 22 C6 14, 8 6, 12 3 C16 6, 18 14, 20 22 Z" fill="${IC_SCHATTEN}" stroke="${IC_ASCHE}" stroke-width="1.2"/>
    <!-- Gesichtsöffnung im Schatten -->
    <path d="M9 9 C9 7 15 7 15 9 C15 13 13.5 15 12 15 C10.5 15 9 13 9 9 Z" fill="#000000"/>
    <!-- Glühende spektrale Augen -->
    <ellipse cx="10.8" cy="9.8" rx="0.8" ry="1.1" fill="${IC_ZYAN_HELL}"/>
    <ellipse cx="13.2" cy="9.8" rx="0.8" ry="1.1" fill="${IC_ZYAN_HELL}"/>
    <!-- Seelensense -->
    <path d="M3 4 C7 2, 11 3, 13 5 C10 6, 6 5, 3 4 Z" fill="${IC_ZYAN}"/>
    <line x1="13" y1="5" x2="18" y2="20" stroke="${IC_KNOCHEN}" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,

  totengraeber: `<svg viewBox="0 0 24 24">
    <!-- Totengräber: Schaufel und Friedhofslaterne -->
    <path d="M7 21 L16 4" stroke="${IC_M_HOLZ}" stroke-width="2" stroke-linecap="round"/>
    <path d="M15 6 L18 3 L20 5 L17 8 Z" fill="${IC_M_STAHL}" stroke="${IC_M_STAHL}" stroke-width="1"/>
    <!-- Schaufelblatt -->
    <path d="M5 18 L7 15 L10 18 L8 21 Z" fill="${IC_M_STAHL}"/>
    <!-- Laterne -->
    <rect x="13" y="11" width="5" height="7" rx="1" fill="${IC_SCHATTEN}" stroke="${IC_KNOCHEN}" stroke-width="1"/>
    <circle cx="15.5" cy="14.5" r="1.5" fill="${IC_ZYAN}"/>
  </svg>`,

  skelettkrieger: `<svg viewBox="0 0 24 24">
    <!-- Skelettkrieger: Gebleichter Totenschädel mit Krummschwert -->
    <path d="M7 11 C7 6.5 17 6.5 17 11 C17 14 15.5 15 14.5 16 L9.5 16 C8.5 15 7 14 7 11 Z" fill="${IC_KNOCHEN}" stroke="${IC_KNOCHEN_D}" stroke-width="1"/>
    <!-- Augenhöhlen -->
    <circle cx="9.8" cy="10.5" r="1.2" fill="${IC_SCHATTEN}"/>
    <circle cx="14.2" cy="10.5" r="1.2" fill="${IC_SCHATTEN}"/>
    <!-- Nasenöffnung & Zähne -->
    <polygon points="12,12.5 11.4,13.5 12.6,13.5" fill="${IC_SCHATTEN}"/>
    <line x1="10" y1="16" x2="10" y2="18" stroke="${IC_KNOCHEN}" stroke-width="1"/>
    <line x1="12" y1="16" x2="12" y2="18" stroke="${IC_KNOCHEN}" stroke-width="1"/>
    <line x1="14" y1="16" x2="14" y2="18" stroke="${IC_KNOCHEN}" stroke-width="1"/>
    <!-- Gekrümmtes Schwert -->
    <path d="M3 21 C5 14, 9 9, 17 4 C15 7, 11 14, 7 21 Z" fill="${IC_M_STAHL}"/>
  </svg>`,

  aasgeier: `<svg viewBox="0 0 24 24">
    <!-- Aasgeier: Ausgebreitete Schwingen, kahler Hals -->
    <path d="M2 10 C6 7, 10 9, 12 12 C14 9, 18 7, 22 10 C18 14, 14 14, 12 18 C10 14, 6 14, 2 10 Z" fill="${IC_SCHATTEN}" stroke="${IC_ASCHE}" stroke-width="1.2"/>
    <circle cx="12" cy="7.5" r="1.8" fill="${IC_KNOCHEN}"/>
    <path d="M12 8.5 L10.5 10.5 L12 10 Z" fill="${IC_KNOCHEN_D}"/>
  </svg>`,

  klageweib: `<svg viewBox="0 0 24 24">
    <!-- Klageweib: Schwebende spektrale Gestalt mit Seelenwehen -->
    <path d="M8 22 C6 17, 8 9, 12 5 C16 9, 18 17, 16 22 C14 19, 10 19, 8 22 Z" fill="${IC_ZYAN}" opacity="0.35"/>
    <path d="M9 20 C8 15, 10 9, 12 7 C14 9, 16 15, 15 20 Z" fill="${IC_ZYAN_HELL}"/>
    <circle cx="12" cy="6" r="2.2" fill="${IC_KNOCHEN}"/>
    <ellipse cx="12" cy="6.8" rx="0.7" ry="1.2" fill="${IC_SCHATTEN}"/> <!-- Offener Schrei -->
    <!-- Schallwellen -->
    <path d="M6 5 C4 7, 4 10, 6 12" fill="none" stroke="${IC_ZYAN}" stroke-width="1.2" stroke-linecap="round"/>
    <path d="M18 5 C20 7, 20 10, 18 12" fill="none" stroke="${IC_ZYAN}" stroke-width="1.2" stroke-linecap="round"/>
  </svg>`,

  grabwaechter: `<svg viewBox="0 0 24 24">
    <!-- Grabwächter: Schwerer Obsidianhelm mit Hörnern und Axt -->
    <path d="M6 13 L6 10 C6 6, 18 6, 18 10 L18 13 L16 15 L16 19 L8 19 L8 15 Z" fill="${IC_SCHATTEN}" stroke="${IC_KNOCHEN}" stroke-width="1.4"/>
    <line x1="8" y1="12" x2="16" y2="12" stroke="${IC_ZYAN}" stroke-width="1.6"/>
    <!-- Hörner -->
    <path d="M6 9 C3 8, 3 4, 5 3 C6 5, 6 7, 7 8" fill="${IC_KNOCHEN}"/>
    <path d="M18 9 C21 8, 21 4, 19 3 C18 5, 18 7, 17 8" fill="${IC_KNOCHEN}"/>
  </svg>`,

  knochentitan: `<svg viewBox="0 0 24 24">
    <!-- Knochentitan: Gigantischer gehörnter Monolith-Schädel -->
    <path d="M4 14 C3 8, 8 4, 12 3 C16 4, 21 8, 20 14 C19 18, 16 21, 12 21 C8 21, 5 18, 4 14 Z" fill="${IC_KNOCHEN}" stroke="${IC_ASCHE}" stroke-width="1.4"/>
    <circle cx="8.5" cy="11.5" r="2" fill="${IC_SCHATTEN}"/>
    <circle cx="15.5" cy="11.5" r="2" fill="${IC_SCHATTEN}"/>
    <circle cx="8.5" cy="11.5" r="0.9" fill="${IC_ZYAN}"/>
    <circle cx="15.5" cy="11.5" r="0.9" fill="${IC_ZYAN}"/>
    <!-- Stoßzähne / Rammspitzen -->
    <path d="M7 16 L5 22 L8 19 Z" fill="${IC_KNOCHEN_D}"/>
    <path d="M17 16 L19 22 L16 19 Z" fill="${IC_KNOCHEN_D}"/>
  </svg>`,

  // ============================================================= Elite: Menschen
  paladin: `<svg viewBox="0 0 24 24">
    <!-- Paladin: Geheiligter Großhelm mit Sonnenkreuz -->
    <path d="M5 14 L5 8 C5 4, 19 4, 19 8 L19 14 C19 19, 12 22, 12 22 C12 22, 5 19, 5 14 Z" fill="${IC_M_STAHL}" stroke="${IC_M_GOLD}" stroke-width="1.5"/>
    <!-- Kreuzförmiges Sehvisier in Gold -->
    <line x1="7" y1="10.5" x2="17" y2="10.5" stroke="${IC_M_GOLD}" stroke-width="1.8"/>
    <line x1="12" y1="6.5" x2="12" y2="16.5" stroke="${IC_M_GOLD}" stroke-width="1.8"/>
    <!-- Gloriole / Sonnenstrahl oben -->
    <circle cx="12" cy="3" r="1.5" fill="${IC_M_HELL}"/>
  </svg>`,

  wagenburg: `<svg viewBox="0 0 24 24">
    <!-- Wagenburg: Eisenbeschlagener Wehrturmwagen -->
    <rect x="3" y="7" width="18" height="10" rx="1.5" fill="${IC_M_HOLZ}" stroke="${IC_M_STAHL}" stroke-width="1.5"/>
    <!-- Schießscharten -->
    <rect x="5.5" y="10" width="2.5" height="4" fill="#000000"/>
    <rect x="10.8" y="10" width="2.5" height="4" fill="#000000"/>
    <rect x="16" y="10" width="2.5" height="4" fill="#000000"/>
    <!-- Schwere Eisenräder -->
    <circle cx="6.5" cy="18" r="3" fill="${IC_M_STAHL}" stroke="#000000" stroke-width="1"/>
    <circle cx="17.5" cy="18" r="3" fill="${IC_M_STAHL}" stroke="#000000" stroke-width="1"/>
    <!-- Zinnenkranz -->
    <path d="M4 7 L4 4 L7 4 L7 7 L10 7 L10 4 L14 4 L14 7 L17 7 L17 4 L20 4 L20 7" fill="none" stroke="${IC_M_GOLD}" stroke-width="1.2"/>
  </svg>`,

  scharfschuetze: `<svg viewBox="0 0 24 24">
    <!-- Meisterschütze: Schwere Windenarmbrust mit Fadenkreuz -->
    <path d="M3 10 C8 16, 16 16, 21 10" fill="none" stroke="${IC_M_STAHL}" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="3" y1="10" x2="21" y2="10" stroke="${IC_M_GOLD}" stroke-width="1.2"/>
    <rect x="10.8" y="5" width="2.4" height="15" fill="${IC_M_HOLZ}"/>
    <!-- Zieloptik / Fadenkreuz -->
    <circle cx="12" cy="7" r="3" fill="none" stroke="${IC_M_GOLD}" stroke-width="1.2"/>
    <line x1="12" y1="3" x2="12" y2="11" stroke="${IC_M_GOLD}" stroke-width="0.8"/>
    <line x1="8" y1="7" x2="16" y2="7" stroke="${IC_M_GOLD}" stroke-width="0.8"/>
  </svg>`,

  priester: `<svg viewBox="0 0 24 24">
    <!-- Lichtpriester: Weihrauchfass und segnende Aura -->
    <circle cx="12" cy="16" r="4" fill="${IC_M_GOLD}" stroke="${IC_M_HELL}" stroke-width="1.2"/>
    <!-- Kette zum Rauchfass -->
    <line x1="12" y1="4" x2="12" y2="12" stroke="${IC_M_STAHL}" stroke-width="1.4" stroke-dasharray="1.5 1"/>
    <!-- Aufsteigender Weihrauchdampf -->
    <path d="M9 13 Q7 9 10 6" fill="none" stroke="${IC_M_HELL}" stroke-width="1.2" stroke-linecap="round"/>
    <path d="M15 13 Q17 9 14 6" fill="none" stroke="${IC_M_HELL}" stroke-width="1.2" stroke-linecap="round"/>
    <!-- Heiligenschein -->
    <circle cx="12" cy="4" r="2" fill="${IC_M_GOLD}"/>
  </svg>`,

  // ============================================================= Elite: Waldgott
  moosbaer: `<svg viewBox="0 0 24 24">
    <!-- Moosbär: Mächtiger Bärenkopf mit Moosfell und Zähnen -->
    <path d="M4 11 C3 7, 7 4, 9 6 C11 4, 13 4, 15 6 C17 4, 21 7, 20 11 C21 16, 17 21, 12 21 C7 21, 3 16, 4 11 Z" fill="${IC_G_MOOS}" stroke="${IC_G_GRUEN}" stroke-width="1.4"/>
    <!-- Schnauze & Fänge -->
    <ellipse cx="12" cy="15" rx="3.5" ry="2.8" fill="${IC_G_HOLZ}"/>
    <circle cx="12" cy="13.8" r="1.2" fill="#000000"/>
    <polygon points="10.2,16.5 11,18 11.5,16.5" fill="#ffffff"/>
    <polygon points="13.8,16.5 13,18 12.5,16.5" fill="#ffffff"/>
    <!-- Augen -->
    <circle cx="8.5" cy="10.5" r="1" fill="${IC_G_HELL}"/>
    <circle cx="15.5" cy="10.5" r="1" fill="${IC_G_HELL}"/>
  </svg>`,

  fluesterer: `<svg viewBox="0 0 24 24">
    <!-- Flüsterer: Uralte geschnitzte Holzmaske mit Baumhörnern -->
    <path d="M7 6 C7 4, 17 4, 17 6 L16 17 C16 20, 8 20, 8 17 Z" fill="${IC_G_HOLZ}" stroke="${IC_G_GRUEN}" stroke-width="1.4"/>
    <ellipse cx="10" cy="11" rx="1.2" ry="1.8" fill="${IC_G_HELL}"/>
    <ellipse cx="14" cy="11" rx="1.2" ry="1.8" fill="${IC_G_HELL}"/>
    <!-- Sporenranken -->
    <path d="M4 8 Q6 4 8 7" fill="none" stroke="${IC_G_GRUEN}" stroke-width="1.5"/>
    <path d="M20 8 Q18 4 16 7" fill="none" stroke="${IC_G_GRUEN}" stroke-width="1.5"/>
  </svg>`,

  kronenhirsch: `<svg viewBox="0 0 24 24">
    <!-- Kronenhirsch: Ausladendes verzweigtes Geweih mit Stern -->
    <path d="M12 21 L10 14 L14 14 Z" fill="${IC_G_HOLZ}"/>
    <!-- Geweihstangen -->
    <path d="M10 14 C8 10, 4 8, 3 4 M6 8 C8 6, 8 4, 7 2 M6 10 C4 11, 2 10, 2 8" fill="none" stroke="${IC_G_GRUEN}" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M14 14 C16 10, 20 8, 21 4 M18 8 C16 6, 16 4, 17 2 M18 10 C20 11, 22 10, 22 8" fill="none" stroke="${IC_G_GRUEN}" stroke-width="1.6" stroke-linecap="round"/>
    <!-- Glänzender Stern zwischen den Stangen -->
    <circle cx="12" cy="7" r="1.8" fill="${IC_G_HELL}"/>
  </svg>`,

  dornenhydra: `<svg viewBox="0 0 24 24">
    <!-- Dornenhydra: Drei zischende Schlangenköpfe aus Ranken -->
    <path d="M5 21 C5 14, 8 11, 8 6" fill="none" stroke="${IC_G_MOOS}" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M12 21 L12 4" stroke="${IC_G_GRUEN}" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M19 21 C19 14, 16 11, 16 6" fill="none" stroke="${IC_G_MOOS}" stroke-width="2.2" stroke-linecap="round"/>
    <!-- Köpfe mit Dornenmäulern -->
    <circle cx="8" cy="6" r="2" fill="${IC_G_HOLZ}"/>
    <circle cx="12" cy="4" r="2.2" fill="${IC_G_HOLZ}"/>
    <circle cx="16" cy="6" r="2" fill="${IC_G_HOLZ}"/>
    <circle cx="8" cy="5.5" r="0.7" fill="${IC_G_HELL}"/>
    <circle cx="12" cy="3.5" r="0.8" fill="${IC_G_HELL}"/>
    <circle cx="16" cy="5.5" r="0.7" fill="${IC_G_HELL}"/>
  </svg>`,

  // ============================================================= Fähigkeiten: Todesgott
  grabesklaelte: `<svg viewBox="0 0 24 24">
    <!-- Grabeskälte: Gefrierende Reifkristalle und Eisklauen -->
    <line x1="12" y1="2" x2="12" y2="22" stroke="${IC_ZYAN}" stroke-width="1.8"/>
    <line x1="2" y1="12" x2="22" y2="12" stroke="${IC_ZYAN}" stroke-width="1.8"/>
    <line x1="5" y1="5" x2="19" y2="19" stroke="${IC_ZYAN}" stroke-width="1.4"/>
    <line x1="5" y1="19" x2="19" y2="5" stroke="${IC_ZYAN}" stroke-width="1.4"/>
    <!-- Verzweigungen an den Eiskristallspitzen -->
    <path d="M10 4 L12 2 L14 4 M10 20 L12 22 L14 20" stroke="${IC_ZYAN_HELL}" stroke-width="1.2" fill="none"/>
    <path d="M4 10 L2 12 L4 14 M20 10 L22 12 L20 14" stroke="${IC_ZYAN_HELL}" stroke-width="1.2" fill="none"/>
    <circle cx="12" cy="12" r="2.5" fill="${IC_ZYAN_HELL}"/>
  </svg>`,

  seelenernte: `<svg viewBox="0 0 24 24">
    <!-- Seelenrausch: Mahlstrom kreisender Geister -->
    <path d="M12 3 C17 3, 21 7, 21 12 C21 17, 17 21, 12 21 C7 21, 3 17, 3 12" fill="none" stroke="${IC_ZYAN}" stroke-width="2" stroke-linecap="round" stroke-dasharray="8 4"/>
    <circle cx="12" cy="12" r="4.5" fill="${IC_SCHATTEN}" stroke="${IC_ZYAN_HELL}" stroke-width="1.4"/>
    <circle cx="12" cy="12" r="2" fill="${IC_ZYAN_HELL}"/>
  </svg>`,

  knochensturm: `<svg viewBox="0 0 24 24">
    <!-- Knochensturm: Aufwirbelnder Tornado aus Gebeinen und Klingen -->
    <path d="M4 5 L20 5 M6 9 L18 9 M7 13 L17 13 M9 17 L15 17 M11 21 L13 21" stroke="${IC_KNOCHEN}" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M5 4 L8 8 M19 4 L16 8" stroke="${IC_ZYAN}" stroke-width="1.4"/>
    <path d="M7 12 L9 15 M17 12 L15 15" stroke="${IC_ZYAN}" stroke-width="1.4"/>
  </svg>`,
};
