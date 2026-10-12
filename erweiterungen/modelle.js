// 3D-Modelle fuer die Erweiterungen: Todesgott (Das Totenreich) & Elite-Einheiten.
// Gehoert zur Grafik (siehe GEMINI.md).
//
// Ein Modell ist eine Liste von Teilen: [form, masse, position, farbe, team, drehung]
//   form   'q' Quader [b, h, t] | 'z' Zylinder/Kegel [rOben, rUnten, h, seg] |
//          'k' Kugel [r, seg] | 's' Scheibe [r, seg]
//   position [x, y, z] Mitte; y ist oben, Modell schaut entlang +z
//   farbe  '#rrggbb'
//   team   0..1 Anteil Volksfarbe; GLUEHT (2) = leuchtet selbst
//   drehung [rx, ry, rz] in Bogenmass

export const GLUEHT = 2;

// Farbpalette Todesgott & Knochenreich
const KNOCHEN = '#e2e8f0';
const KNOCHEN_D = '#94a3b8';
const SCHATTEN = '#090d16';
const SCHATTEN2 = '#161f30';
const ASCHE = '#334155';
const ASCHE2 = '#475569';
const ZYAN = '#38bdf8';
const ZYAN_HELL = '#bae6fd';
const OBSIDIAN = '#111827';
const BLUT = '#dc2626';
const BLUT_D = '#7f1d1d';

// Farbpalette Menschen & Gott (fuer Elite)
const STAHL = '#94a3b8';
const STAHL_HELL = '#e2e8f0';
const GOLD = '#d8b06a';
const GOLD_HELL = '#fde047';
const HOLZ = '#5c3a21';
const HOLZ_D = '#3b2414';
const WALDGRUEN = '#15803d';
const MOOS = '#166534';
const BLATT = '#86efac';

/** Teil entlang der Strecke a -> b. */
function stab(a, b, dicke, farbe, team = 0, seg = 0, spitz = 1) {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l = Math.hypot(d[0], d[1], d[2]) || 1e-6;
  const rx = Math.asin(Math.max(-1, Math.min(1, d[2] / l)));
  const rz = Math.atan2(-d[0], d[1]);
  const mitte = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  if (seg) return ['z', [dicke * spitz, dicke, l, seg], mitte, farbe, team, [rx, 0, rz]];
  const [bq, tq] = Array.isArray(dicke) ? dicke : [dicke, dicke];
  return ['q', [bq, l, tq], mitte, farbe, team, [rx, 0, rz]];
}

// =============================================================================
// TODESGOTT EINHEITEN
// =============================================================================

/** Todesgott: Uralter Avatar der Entropie mit zerfledderter Schattencape, Hörnerkrone und Seelensensen */
function todesgottModell() {
  const t = [];
  // Bodenwirbel / Schattensaum
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    t.push(['z', [0.35, 0.5, 0.45, 5], [Math.cos(a) * 0.4, 0.22, Math.sin(a) * 0.4], SCHATTEN, 0.1]);
  }
  // Schattengewand Rumpf
  t.push(['z', [0.28, 0.48, 1.4, 8], [0, 0.9, 0], SCHATTEN, 0.15]);
  // Aschgrauer Schulterkragen
  t.push(['z', [0.42, 0.28, 0.35, 7], [0, 1.55, 0], ASCHE, 0.2]);

  // Rippenbogen / Skelettbrustpanzer
  for (let r = 0; r < 4; r++) {
    const y = 1.1 + r * 0.12;
    t.push(['q', [0.32 - r * 0.02, 0.04, 0.28], [0, y, 0.12], KNOCHEN, 0.1]);
  }
  // Wirbelsäule
  t.push(['z', [0.06, 0.06, 0.7, 5], [0, 1.25, -0.1], KNOCHEN_D]);

  // Kopf & Kapuze
  t.push(['k', [0.24, 7], [0, 1.82, 0.05], SCHATTEN]);
  t.push(['k', [0.18, 6], [0, 1.82, 0.12], KNOCHEN]); // Schädel im Innern
  // Glühende Zyan-Augen
  t.push(['k', [0.035, 4], [-0.07, 1.84, 0.26], ZYAN_HELL, GLUEHT]);
  t.push(['k', [0.035, 4], [0.07, 1.84, 0.26], ZYAN_HELL, GLUEHT]);

  // Hörnerkrone
  for (const s of [1, -1]) {
    t.push(stab([s * 0.12, 1.95, 0.05], [s * 0.32, 2.3, -0.05], 0.05, KNOCHEN, 0, 5, 0.5));
    t.push(stab([s * 0.32, 2.3, -0.05], [s * 0.42, 2.55, 0.1], 0.03, KNOCHEN, 0, 4, 0.2));
  }

  // Skelett-Arme und Hände mit Seelensensen
  for (const s of [1, -1]) {
    // Oberarm
    t.push(stab([s * 0.35, 1.55, 0], [s * 0.55, 1.15, 0.15], 0.06, KNOCHEN, 0, 5));
    // Unterarm
    t.push(stab([s * 0.55, 1.15, 0.15], [s * 0.45, 0.75, 0.45], 0.05, KNOCHEN, 0, 5));
    // Sense Schaft
    t.push(stab([s * 0.45, 0.2, 0.3], [s * 0.45, 2.1, 0.6], 0.035, OBSIDIAN, 0, 4));
    // Sensenblatt mit Spektralglut
    t.push(stab([s * 0.45, 2.05, 0.6], [s * 0.1, 2.25, 1.05], [0.02, 0.18], ZYAN, GLUEHT));
    t.push(stab([s * 0.1, 2.25, 1.05], [s * 0.0, 1.95, 1.25], [0.015, 0.12], ZYAN_HELL, GLUEHT));
  }
  return t;
}

/** Totengräber: Buckliger Diener mit Schaufel und Seelenlaterne */
function totengraeberModell() {
  const t = [];
  // Beine in zerschlissener Hose
  for (const s of [1, -1]) {
    t.push(stab([s * 0.12, 0.8, 0], [s * 0.14, 0.4, 0.02], 0.1, ASCHE, 0.1, 5));
    t.push(stab([s * 0.14, 0.4, 0.02], [s * 0.15, 0.08, 0], 0.09, SCHATTEN, 0, 5));
    t.push(['q', [0.12, 0.09, 0.22], [s * 0.15, 0.05, 0.06], '#1c1917']);
  }
  // Buckliger Rumpf
  t.push(['k', [0.32, 6], [0, 1.1, -0.08], ASCHE]);
  t.push(['z', [0.26, 0.32, 0.6, 6], [0, 0.95, 0], SCHATTEN2, 0.15]);

  // Kopf mit Schlappkapuze
  t.push(['k', [0.18, 6], [0, 1.35, 0.18], ASCHE]);
  t.push(['k', [0.12, 5], [0, 1.32, 0.26], KNOCHEN_D]); // verhärmtes Gesicht

  // Rechter Arm mit Schaufel
  t.push(stab([0.28, 1.25, 0], [0.38, 0.9, 0.2], 0.065, ASCHE, 0, 5));
  t.push(stab([0.38, 0.9, 0.2], [0.32, 0.6, 0.4], 0.055, KNOCHEN, 0, 5));
  // Schaufelstiel
  t.push(stab([0.32, 0.1, 0.25], [0.32, 1.6, 0.55], 0.03, HOLZ, 0, 4));
  // Schaufelblatt
  t.push(['q', [0.24, 0.3, 0.02], [0.32, 0.15, 0.25], STAHL, 0, [0.3, 0, 0]]);

  // Linker Arm mit hängender Laterne
  t.push(stab([-0.28, 1.25, 0], [-0.38, 0.95, 0.15], 0.065, ASCHE, 0, 5));
  t.push(stab([-0.38, 0.95, 0.15], [-0.35, 0.65, 0.3], 0.055, KNOCHEN, 0, 5));
  // Laterne
  t.push(stab([-0.35, 0.65, 0.3], [-0.35, 0.45, 0.3], 0.015, '#1e293b', 0, 3));
  t.push(['q', [0.14, 0.2, 0.14], [-0.35, 0.35, 0.3], SCHATTEN, 0]);
  t.push(['k', [0.06, 5], [-0.35, 0.35, 0.3], ZYAN_HELL, GLUEHT]);
  return t;
}

/** Skelettkrieger: Vollständiges Knochengerüst mit Krummschwert und Buckler */
function skelettkriegerModell() {
  const t = [];
  // Beine aus Röhrenknochen
  for (const s of [1, -1]) {
    // Oberschenkel
    t.push(stab([s * 0.12, 0.85, 0], [s * 0.12, 0.45, 0.02], 0.05, KNOCHEN, 0, 5));
    // Kniegelenk
    t.push(['k', [0.04, 4], [s * 0.12, 0.45, 0.02], KNOCHEN_D]);
    // Unterschenkel
    t.push(stab([s * 0.12, 0.45, 0.02], [s * 0.12, 0.08, 0], 0.045, KNOCHEN, 0, 5));
    // Fußknochen
    t.push(['q', [0.08, 0.04, 0.18], [s * 0.12, 0.03, 0.06], KNOCHEN]);
  }

  // Becken
  t.push(['q', [0.3, 0.12, 0.18], [0, 0.9, 0], KNOCHEN]);
  // Wirbelsäule
  t.push(stab([0, 0.95, 0], [0, 1.45, 0.02], 0.06, KNOCHEN, 0, 5));
  // Brustkorb mit 4 Rippenpaaren
  for (let i = 0; i < 4; i++) {
    const y = 1.1 + i * 0.08;
    t.push(['z', [0.18 - i * 0.01, 0.18 - i * 0.01, 0.04, 6], [0, y, 0.03], KNOCHEN, 0.05]);
  }

  // Totenschädel & Kiefer
  t.push(['k', [0.16, 6], [0, 1.62, 0.05], KNOCHEN]);
  t.push(['q', [0.11, 0.09, 0.12], [0, 1.51, 0.12], KNOCHEN]); // Kiefer
  // Dunkle Augenhöhlen
  t.push(['k', [0.03, 4], [-0.05, 1.63, 0.18], SCHATTEN]);
  t.push(['k', [0.03, 4], [0.05, 1.63, 0.18], SCHATTEN]);

  // Rechter Arm mit Krummschwert
  t.push(stab([0.22, 1.4, 0], [0.38, 1.05, 0.1], 0.04, KNOCHEN, 0, 5));
  t.push(stab([0.38, 1.05, 0.1], [0.45, 0.75, 0.35], 0.035, KNOCHEN, 0, 5));
  // Schwertgriff & Klinge
  t.push(stab([0.45, 0.75, 0.35], [0.5, 0.6, 0.85], [0.03, 0.12], STAHL, 0));
  t.push(stab([0.5, 0.6, 0.85], [0.55, 0.85, 1.25], [0.025, 0.1], STAHL_HELL, 0.1));

  // Linker Arm mit verrottetem Bucklerschild
  t.push(stab([-0.22, 1.4, 0], [-0.35, 1.1, 0.1], 0.04, KNOCHEN, 0, 5));
  t.push(stab([-0.35, 1.1, 0.1], [-0.3, 0.85, 0.3], 0.035, KNOCHEN, 0, 5));
  t.push(['s', [0.26, 7], [-0.35, 0.85, 0.35], ASCHE2, 0.2, [0, 0.4, 0]]);
  t.push(['k', [0.07, 4], [-0.35, 0.85, 0.37], KNOCHEN]);
  return t;
}

/** Aasgeier: Fliegender Todesvogel mit zerrupften Schwingen und nacktem Hals */
function aasgeierModell() {
  const t = [];
  // Rumpf
  t.push(['z', [0.12, 0.22, 0.55, 6], [0, 0.9, 0], SCHATTEN, 0.1, [0.3, 0, 0]]);
  // Nackter Skeletthals
  t.push(stab([0, 0.95, 0.2], [0, 1.18, 0.45], 0.06, KNOCHEN_D, 0, 5));
  // Kopf & Hakenschnabel
  t.push(['k', [0.1, 5], [0, 1.22, 0.48], KNOCHEN]);
  t.push(stab([0, 1.2, 0.52], [0, 1.1, 0.72], 0.045, '#475569', 0, 4, 0.2)); // Schnabel
  // Glühende Augen
  t.push(['k', [0.02, 3], [-0.05, 1.23, 0.52], ZYAN_HELL, GLUEHT]);
  t.push(['k', [0.02, 3], [0.05, 1.23, 0.52], ZYAN_HELL, GLUEHT]);

  // Breite, zerfetzte Schwingen
  for (const s of [1, -1]) {
    // Innenflügel
    t.push(['q', [0.45, 0.04, 0.35], [s * 0.32, 0.95, 0.05], SCHATTEN2, 0.1, [0, 0, s * 0.15]]);
    // Außenflügel
    t.push(['q', [0.55, 0.03, 0.28], [s * 0.75, 1.05, -0.05], SCHATTEN, 0.1, [0, 0, s * 0.25]]);
    // Schwungfedern Spitzen
    for (let f = 0; f < 4; f++) {
      t.push(['z', [0.03, 0, 0.3, 3], [s * (0.95 + f * 0.08), 1.1, -0.15 + f * 0.08], ASCHE, 0, [0.4, 0, s * 0.4]]);
    }
  }
  // Stoßfedern hinten
  t.push(['q', [0.25, 0.03, 0.35], [0, 0.8, -0.35], SCHATTEN, 0, [-0.2, 0, 0]]);
  return t;
}

/** Klageweib: Schwebende spektrale Geistergestalt aus wirbelndem Zyannebel */
function klageweibModell() {
  const t = [];
  // Schwebender Nebelkegel unten (keine Beine)
  for (let i = 0; i < 6; i++) {
    const y = 0.2 + i * 0.18;
    const r = 0.35 - i * 0.03;
    t.push(['z', [r * 0.8, r, 0.2, 6], [0, y, 0], ZYAN, GLUEHT]);
  }
  // Spektraler Rumpf
  t.push(['z', [0.18, 0.24, 0.6, 6], [0, 1.1, 0], ZYAN_HELL, GLUEHT]);
  // Verwehtes Totenhemd
  t.push(['z', [0.28, 0.38, 0.7, 5], [0, 0.9, -0.15], SCHATTEN2, 0.2, [0.3, 0, 0]]);

  // Wehklagender Kopf mit Totenschleier
  t.push(['k', [0.16, 6], [0, 1.5, 0.05], KNOCHEN]);
  t.push(['z', [0.2, 0.15, 0.3, 5], [0, 1.55, -0.05], ASCHE, 0.1]); // Schleier
  // Aufgerissenes Klagemaul
  t.push(['k', [0.06, 5], [0, 1.44, 0.16], SCHATTEN]);
  t.push(['k', [0.03, 4], [0, 1.44, 0.14], ZYAN, GLUEHT]); // Inneres Geisterfeuer
  // Augen
  t.push(['k', [0.03, 3], [-0.06, 1.52, 0.16], ZYAN_HELL, GLUEHT]);
  t.push(['k', [0.03, 3], [0.06, 1.52, 0.16], ZYAN_HELL, GLUEHT]);

  // Ausgestreckte Klagearme nach vorn
  for (const s of [1, -1]) {
    t.push(stab([s * 0.22, 1.35, 0], [s * 0.28, 1.3, 0.45], 0.045, ZYAN_HELL, GLUEHT));
    t.push(stab([s * 0.28, 1.3, 0.45], [s * 0.25, 1.25, 0.85], 0.035, ZYAN, GLUEHT));
  }
  return t;
}

/** Grabwächter: Schwer gepanzerter Hüne aus Obsidian und blutgeätztem Stahl */
function grabwaechterModell() {
  const t = [];
  // Massive Beinschienen
  for (const s of [1, -1]) {
    t.push(stab([s * 0.2, 0.9, 0], [s * 0.2, 0.45, 0.02], 0.16, OBSIDIAN, 0.1, 6));
    t.push(['k', [0.11, 5], [s * 0.2, 0.45, 0.08], STAHL]);
    t.push(stab([s * 0.2, 0.45, 0.02], [s * 0.2, 0.1, 0], 0.15, OBSIDIAN, 0, 6));
    t.push(['q', [0.22, 0.14, 0.34], [s * 0.2, 0.07, 0.1], '#0f172a']);
  }

  // Wuchtiger Rumpf
  t.push(['q', [0.65, 0.7, 0.45], [0, 1.2, 0], OBSIDIAN, 0.1]);
  // Blutader-Runen auf der Brustplatte
  t.push(['q', [0.35, 0.06, 0.02], [0, 1.3, 0.24], BLUT, GLUEHT]);
  t.push(['q', [0.06, 0.4, 0.02], [0, 1.25, 0.24], BLUT, GLUEHT]);

  // Gewaltige Schulterpanzer mit Knochenstacheln
  for (const s of [1, -1]) {
    t.push(['k', [0.24, 6], [s * 0.48, 1.5, 0], OBSIDIAN]);
    t.push(stab([s * 0.48, 1.55, 0], [s * 0.72, 1.85, 0], 0.07, KNOCHEN, 0, 4, 0.3));
  }

  // Gehörnter Großhelm
  t.push(['q', [0.32, 0.36, 0.34], [0, 1.7, 0.05], OBSIDIAN]);
  t.push(['q', [0.22, 0.05, 0.04], [0, 1.68, 0.23], ZYAN_HELL, GLUEHT]); // Sehschlitz
  for (const s of [1, -1]) {
    t.push(stab([s * 0.16, 1.85, 0], [s * 0.38, 2.15, -0.1], 0.06, KNOCHEN, 0, 5, 0.4));
  }

  // Zweihändige schwere Grabesaxt
  t.push(stab([0.45, 0.2, 0.1], [0.45, 2.2, 0.5], 0.05, HOLZ_D, 0, 5));
  // Axtblätter vorn und hinten
  t.push(['q', [0.04, 0.65, 0.4], [0.45, 1.9, 0.7], STAHL, 0.1]);
  t.push(['q', [0.04, 0.35, 0.25], [0.45, 1.9, 0.25], STAHL_HELL, 0.1]);
  return t;
}

/** Knochentitan: Gigantischer vierbeiniger Koloss aus verdichteten Schädeln und Rammspornen */
function knochentitanModell() {
  const t = [];
  // 4 massive Säulenbeine
  for (const sx of [1, -1]) {
    for (const sz of [1, -1]) {
      const x = sx * 0.55;
      const z = sz * 0.6;
      t.push(stab([x, 1.1, z], [x, 0.5, z], 0.24, KNOCHEN, 0, 6));
      t.push(['k', [0.16, 5], [x, 0.5, z], KNOCHEN_D]);
      t.push(stab([x, 0.5, z], [x, 0.1, z], 0.22, KNOCHEN, 0, 6));
      t.push(['q', [0.32, 0.14, 0.36], [x, 0.07, z], SCHATTEN]);
    }
  }

  // Gewaltiger Rumpfpanzer aus Knochenplatten
  t.push(['q', [1.2, 0.75, 1.5], [0, 1.25, 0], ASCHE, 0.1]);
  t.push(['z', [0.55, 0.7, 0.8, 6], [0, 1.55, 0], KNOCHEN, 0.15, [Math.PI / 2, 0, 0]]);

  // Gewaltiger Rammschädel vorn
  t.push(['k', [0.48, 7], [0, 1.35, 0.95], KNOCHEN]);
  // Rammhörner
  for (const s of [1, -1]) {
    t.push(stab([s * 0.35, 1.45, 1.1], [s * 0.65, 1.6, 1.75], 0.16, SCHATTEN, 0, 5, 0.3));
  }
  // Glühender Seelenkern im Brustinnern
  t.push(['k', [0.24, 6], [0, 1.2, 0.2], ZYAN, GLUEHT]);
  return t;
}

// =============================================================================
// TODESGOTT GEBÄUDE
// =============================================================================

/** Nekropole: Hauptgebäude - Gewaltiges Mausoleum mit Säulengang und Seelenfeuerkuppel */
function nekropoleModell() {
  const t = [];
  // Stufenfundament
  t.push(['q', [2.0, 0.2, 2.0], [0, 0.1, 0], SCHATTEN]);
  t.push(['q', [1.8, 0.2, 1.8], [0, 0.3, 0], ASCHE]);
  t.push(['q', [1.6, 0.2, 1.6], [0, 0.5, 0], SCHATTEN2]);

  // Hauptquader des Mausoleums
  t.push(['q', [1.3, 1.1, 1.3], [0, 1.15, 0], OBSIDIAN, 0.1]);

  // 8 Ecksäulen aus Knochenrippen
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const x = Math.cos(a) * 0.82;
    const z = Math.sin(a) * 0.82;
    t.push(['z', [0.08, 0.1, 1.2, 5], [x, 1.2, z], KNOCHEN, 0.05]);
  }

  // Kuppel & Seelenfeuerschale
  t.push(['z', [0.65, 0.75, 0.3, 8], [0, 1.85, 0], ASCHE, 0.1]);
  t.push(['k', [0.45, 7], [0, 2.15, 0], KNOCHEN]);
  // Glühende Seelenflamme an der Spitze
  t.push(['k', [0.22, 6], [0, 2.7, 0], ZYAN_HELL, GLUEHT]);
  t.push(['z', [0.05, 0.18, 0.5, 5], [0, 2.9, 0], ZYAN, GLUEHT]);
  return t;
}

/** Grabhügel: Anker - Steinkreis um einen Erdhügel mit leuchtendem Monolithen */
function grabhuegelModell() {
  const t = [];
  // Runder Erdhügel
  t.push(['z', [0.8, 1.1, 0.45, 8], [0, 0.22, 0], SCHATTEN, 0.1]);
  t.push(['k', [0.75, 7], [0, 0.35, 0], ASCHE]);

  // Steinkreis aus Menhiren ringsum
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const x = Math.cos(a) * 0.95;
    const z = Math.sin(a) * 0.95;
    t.push(['q', [0.2, 0.55, 0.18], [x, 0.35, z], OBSIDIAN, 0, [0, a, 0.1]]);
    // Knochenschädel zu Füßen
    t.push(['k', [0.08, 4], [x * 0.85, 0.15, z * 0.85], KNOCHEN]);
  }

  // Zentraler Seelenmonolith
  t.push(['q', [0.28, 1.1, 0.24], [0, 0.85, 0], OBSIDIAN, 0.1]);
  t.push(['q', [0.1, 0.65, 0.04], [0, 0.9, 0.13], ZYAN, GLUEHT]); // Runenlinie
  t.push(['k', [0.12, 5], [0, 1.45, 0], ZYAN_HELL, GLUEHT]);
  return t;
}

/** Knochenturm: Verteidigung - Turm aus Wirbelsäule und Speerschleuder */
function knochenturmModell() {
  const t = [];
  // Sockel
  t.push(['z', [0.65, 0.85, 0.4, 7], [0, 0.2, 0], SCHATTEN]);

  // Schlanker Turmschaft mit Knochenrippen
  for (let s = 0; s < 5; s++) {
    const y = 0.5 + s * 0.38;
    const r = 0.45 - s * 0.04;
    t.push(['z', [r * 0.9, r, 0.36, 6], [0, y, 0], KNOCHEN, 0.05]);
  }

  // Plattform mit Knochenzinnen
  t.push(['z', [0.55, 0.4, 0.18, 7], [0, 2.45, 0], ASCHE, 0.1]);
  for (let z = 0; z < 5; z++) {
    const a = (z / 5) * Math.PI * 2;
    t.push(['q', [0.12, 0.25, 0.08], [Math.cos(a) * 0.52, 2.62, Math.sin(a) * 0.52], KNOCHEN]);
  }

  // Knochenspeerschleuder & Zyan-Kristall
  t.push(stab([0, 2.5, 0], [0, 2.9, 0.4], 0.08, OBSIDIAN, 0, 4));
  t.push(['z', [0.04, 0.12, 0.45, 5], [0, 2.9, 0.4], ZYAN_HELL, GLUEHT, [0.4, 0, 0]]);
  return t;
}

/** Seelenbrunnen: Gegenwart - Becken mit wirbelndem Zyan-Wasser */
function seelenbrunnenModell() {
  const t = [];
  // Äußerer Beckenring
  t.push(['z', [0.95, 1.05, 0.45, 8], [0, 0.22, 0], SCHATTEN]);
  t.push(['s', [0.85, 8], [0, 0.42, 0], ZYAN, GLUEHT]); // Seelenwasserfläche

  // 4 Bogenpfeiler aus Rippenknochen
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const x = Math.cos(a) * 0.85;
    const z = Math.sin(a) * 0.85;
    t.push(stab([x, 0.4, z], [x * 0.5, 1.2, z * 0.5], 0.1, KNOCHEN, 0, 5));
  }

  // Schwebender Seelenkristall in der Mitte
  t.push(['k', [0.24, 6], [0, 0.9, 0], ZYAN_HELL, GLUEHT]);
  return t;
}

/** Knochenmühle: Fron-Förderer - Zermahlende Knochenräder */
function knochenmuehleModell() {
  const t = [];
  // Fundament
  t.push(['q', [1.4, 0.35, 1.4], [0, 0.17, 0], SCHATTEN]);
  // Mahltrichter
  t.push(['z', [0.65, 0.35, 0.6, 7], [0, 0.65, 0], ASCHE, 0.1]);

  // Zwei vertikale Mahlräder aus Schädeln
  for (const s of [1, -1]) {
    t.push(['z', [0.45, 0.45, 0.18, 8], [s * 0.4, 0.75, 0], KNOCHEN, 0.05, [0, 0, Math.PI / 2]]);
    t.push(['k', [0.12, 5], [s * 0.4, 0.75, 0], OBSIDIAN]);
  }
  // Schütte mit Schotter
  t.push(['q', [0.4, 0.2, 0.6], [0, 0.35, 0.65], KNOCHEN_D, 0, [0.3, 0, 0]]);
  return t;
}

/** Fleischwurz: Götterblut-Förderer - Pulsierende chthonische Blutwurzel */
function fleischwurzModell() {
  const t = [];
  // Dunkler Krater
  t.push(['z', [0.85, 1.1, 0.3, 7], [0, 0.15, 0], SCHATTEN]);

  // Fleischiger Wurzelstock
  t.push(['k', [0.55, 6], [0, 0.45, 0], BLUT_D, 0.1]);

  // Verzweigte Blutadern nach oben
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    t.push(stab([Math.cos(a) * 0.35, 0.4, Math.sin(a) * 0.35], [Math.cos(a) * 0.6, 1.1, Math.sin(a) * 0.6], 0.12, BLUT, GLUEHT, 5, 0.5));
  }
  // Zentraler Herzkelch
  t.push(['z', [0.28, 0.15, 0.6, 6], [0, 0.95, 0], BLUT, GLUEHT]);
  t.push(['k', [0.18, 5], [0, 1.3, 0], '#ff4d4d', GLUEHT]);
  return t;
}

/** Katakombe: Fabrik - Kryptaportal mit absteigenden Stufen */
function katakombeModell() {
  const t = [];
  // Gruftportal Sockel
  t.push(['q', [1.7, 0.3, 1.7], [0, 0.15, 0], SCHATTEN]);
  // Kryptawände
  t.push(['q', [0.35, 1.2, 1.4], [-0.65, 0.8, 0], OBSIDIAN, 0.1]);
  t.push(['q', [0.35, 1.2, 1.4], [0.65, 0.8, 0], OBSIDIAN, 0.1]);
  t.push(['q', [1.4, 1.2, 0.35], [0, 0.8, -0.65], OBSIDIAN, 0.1]);
  // Gruftdach mit Knochenkreuz
  t.push(['q', [1.7, 0.25, 1.7], [0, 1.5, 0], ASCHE]);
  t.push(['q', [0.12, 0.5, 0.12], [0, 1.85, 0], KNOCHEN]);
  t.push(['q', [0.35, 0.12, 0.12], [0, 1.95, 0], KNOCHEN]);

  // Abgang in die Schwärze & Grünes Fackelfeuer
  t.push(['q', [0.8, 0.05, 0.9], [0, 0.3, 0.1], '#000000']);
  t.push(['k', [0.08, 4], [-0.55, 1.1, 0.65], ZYAN, GLUEHT]);
  t.push(['k', [0.08, 4], [0.55, 1.1, 0.65], ZYAN, GLUEHT]);
  return t;
}

/** Pestaltar: Zorn-Schrein - Opferplatte mit aufsteigenden Giftdämpfen */
function pestaltarModell() {
  const t = [];
  // Stufensockel
  t.push(['q', [1.3, 0.2, 1.3], [0, 0.1, 0], SCHATTEN]);
  t.push(['q', [1.0, 0.3, 1.0], [0, 0.35, 0], OBSIDIAN]);
  // Altarplatte
  t.push(['q', [1.1, 0.15, 0.7], [0, 0.55, 0], ASCHE, 0.1]);

  // 4 Opferschalen an den Ecken
  for (const sx of [1, -1]) {
    for (const sz of [1, -1]) {
      t.push(['z', [0.12, 0.08, 0.25, 5], [sx * 0.45, 0.7, sz * 0.25], KNOCHEN]);
      t.push(['k', [0.07, 4], [sx * 0.45, 0.85, sz * 0.25], ZYAN, GLUEHT]);
    }
  }
  // Schädeltotem auf dem Altar
  t.push(['k', [0.16, 5], [0, 0.75, 0], KNOCHEN]);
  return t;
}

/** Ossuarium: Wehr-Schrein - Kapelle aus dichten Schädel- und Knochenwänden */
function ossuariumModell() {
  const t = [];
  // Fundament
  t.push(['q', [1.4, 0.25, 1.4], [0, 0.12, 0], SCHATTEN]);
  // 4 Eckpfeiler aus Schädeln
  for (const sx of [1, -1]) {
    for (const sz of [1, -1]) {
      t.push(['z', [0.18, 0.22, 1.1, 6], [sx * 0.5, 0.75, sz * 0.5], KNOCHEN, 0.05]);
    }
  }
  // Knochenwände dazwischen
  t.push(['q', [0.8, 0.8, 0.15], [0, 0.7, -0.5], KNOCHEN_D, 0.1]);
  t.push(['q', [0.15, 0.8, 0.8], [-0.5, 0.7, 0], KNOCHEN_D, 0.1]);
  t.push(['q', [0.15, 0.8, 0.8], [0.5, 0.7, 0], KNOCHEN_D, 0.1]);

  // Gewölbtes Knochendach
  t.push(['z', [0.65, 0.75, 0.35, 7], [0, 1.45, 0], ASCHE, 0.1]);
  t.push(['k', [0.35, 6], [0, 1.65, 0], KNOCHEN]);
  return t;
}

/** Totenarchiv: Forschung - Oktogonales Skriptorium mit schwebendem Buch der Toten */
function totenarchivModell() {
  const t = [];
  // Sockel
  t.push(['z', [0.85, 0.95, 0.3, 8], [0, 0.15, 0], SCHATTEN]);
  // 6 Säulen
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    t.push(['z', [0.08, 0.1, 1.2, 5], [Math.cos(a) * 0.75, 0.85, Math.sin(a) * 0.75], OBSIDIAN]);
  }
  // Kuppeldach
  t.push(['z', [0.2, 0.85, 0.5, 8], [0, 1.65, 0], ASCHE, 0.1]);

  // Zentrales Lesepult mit Foliant
  t.push(['z', [0.15, 0.22, 0.7, 6], [0, 0.5, 0], OBSIDIAN]);
  // Offenes Zauberbuch mit Zyan-Seiten
  t.push(['q', [0.35, 0.05, 0.25], [0, 0.9, 0], KNOCHEN, 0, [0.3, 0, 0]]);
  t.push(['k', [0.08, 4], [0, 1.05, 0], ZYAN_HELL, GLUEHT]);
  return t;
}

// =============================================================================
// ELITE-EINHEITEN (MENSCHEN & WALDGOTT)
// =============================================================================

/** Paladin: Elite-Ritter in vergoldetem Vollharnisch mit Großschwert */
function paladinModell() {
  const t = [];
  // Gepanzerte Beine
  for (const s of [1, -1]) {
    t.push(stab([s * 0.15, 0.9, 0], [s * 0.15, 0.45, 0.02], 0.12, STAHL, 0.2, 6));
    t.push(['k', [0.07, 5], [s * 0.15, 0.45, 0.08], GOLD]);
    t.push(stab([s * 0.15, 0.45, 0.02], [s * 0.15, 0.08, 0], 0.11, STAHL, 0.1, 6));
    t.push(['q', [0.14, 0.1, 0.24], [s * 0.15, 0.05, 0.06], STAHL_HELL]);
  }
  // Geharnischter Rumpf mit Goldbesatz
  t.push(['q', [0.45, 0.55, 0.3], [0, 1.2, 0], STAHL, 0.25]);
  t.push(['q', [0.2, 0.4, 0.04], [0, 1.22, 0.16], GOLD, GLUEHT]); // Sonnenkreuz

  // Großhelm mit goldener Helmzier
  t.push(['z', [0.15, 0.18, 0.32, 6], [0, 1.62, 0.02], STAHL_HELL]);
  t.push(['q', [0.18, 0.04, 0.02], [0, 1.62, 0.18], '#0f172a']); // Sehschlitz
  t.push(['q', [0.04, 0.2, 0.25], [0, 1.85, 0], GOLD, 0.3]); // Helmbusch

  // Schild am linken Arm
  t.push(stab([-0.25, 1.35, 0], [-0.38, 1.05, 0.2], 0.06, STAHL, 0, 5));
  t.push(['q', [0.04, 0.7, 0.45], [-0.42, 1.0, 0.25], GOLD, 0.4, [0, 0.2, 0]]);

  // Großschwert am rechten Arm
  t.push(stab([0.25, 1.35, 0], [0.38, 1.05, 0.2], 0.06, STAHL, 0, 5));
  t.push(stab([0.38, 0.8, 0.1], [0.42, 0.6, 1.35], [0.03, 0.14], STAHL_HELL, 0.1));
  t.push(['q', [0.28, 0.04, 0.04], [0.4, 0.7, 0.4], GOLD]); // Parierstange
  return t;
}

/** Wagenburg: Schwere fahrbare Festung mit Zinnen und Armbrustscharten */
function wagenburgModell() {
  const t = [];
  // 4 schwere Eisenräder
  for (const sx of [1, -1]) {
    for (const sz of [1, -1]) {
      t.push(['z', [0.3, 0.3, 0.12, 8], [sx * 0.65, 0.3, sz * 0.7], '#1e293b', 0, [0, 0, Math.PI / 2]]);
      t.push(['k', [0.08, 4], [sx * 0.65, 0.3, sz * 0.7], GOLD]);
    }
  }
  // Achsen & Fahrgestell
  t.push(['q', [1.2, 0.12, 1.6], [0, 0.3, 0], HOLZ_D]);

  // Massiver Holzkasten
  t.push(['q', [1.1, 0.8, 1.5], [0, 0.8, 0], HOLZ, 0.2]);
  // Eisenbeschläge ringsum
  t.push(['q', [1.14, 0.08, 1.54], [0, 0.5, 0], STAHL]);
  t.push(['q', [1.14, 0.08, 1.54], [0, 1.1, 0], STAHL]);

  // Schießscharten vorn und seitlich
  t.push(['q', [0.3, 0.16, 0.05], [0, 0.9, 0.76], '#000000']);

  // Zinnenkrone oben
  for (let z = -0.6; z <= 0.6; z += 0.4) {
    t.push(['q', [0.08, 0.25, 0.2], [-0.55, 1.3, z], HOLZ]);
    t.push(['q', [0.08, 0.25, 0.2], [0.55, 1.3, z], HOLZ]);
  }
  // Bannerstange mit Fahne
  t.push(stab([0.45, 1.2, -0.65], [0.45, 2.2, -0.65], 0.03, HOLZ, 0, 4));
  t.push(['q', [0.02, 0.35, 0.45], [0.45, 1.95, -0.4], GOLD, GLUEHT]);
  return t;
}

/** Scharfschütze: Meisterschütze mit schwerer Windenarmbrust */
function scharfschuetzeModell() {
  const t = [];
  // Kniende/geduckte Haltung
  t.push(stab([-0.12, 0.7, 0], [-0.14, 0.35, 0.15], 0.09, '#3f4f34', 0.15, 5));
  t.push(stab([-0.14, 0.35, 0.15], [-0.12, 0.08, 0], 0.08, '#1e293b', 0, 5));
  t.push(stab([0.15, 0.7, 0], [0.2, 0.2, -0.2], 0.09, '#3f4f34', 0.15, 5));

  // Tarnumhang Rumpf
  t.push(['z', [0.24, 0.32, 0.6, 6], [0, 0.75, 0], '#2d3d25', 0.2]);
  // Kopf mit Kapuze
  t.push(['k', [0.15, 6], [0, 1.15, 0.08], '#3f4f34']);

  // Gewaltige Windenarmbrust im Anschlag nach vorn (+z)
  t.push(['q', [0.1, 0.12, 0.95], [0.05, 1.05, 0.55], HOLZ_D]);
  // Stahlbogen
  t.push(['q', [0.85, 0.06, 0.05], [0.05, 1.05, 0.9], STAHL, 0, [0, 0, 0.05]]);
  // Zielfernrohr auf der Armbrust
  t.push(['z', [0.025, 0.025, 0.4, 4], [0.05, 1.14, 0.5], GOLD, 0, [Math.PI / 2, 0, 0]]);
  return t;
}

/** Lichtpriester: Feldkaplan mit prunkvoller Stola und Weihrauchfass */
function priesterModell() {
  const t = [];
  // Weiße Priesterrobe bis zum Boden
  t.push(['z', [0.26, 0.46, 1.2, 7], [0, 0.65, 0], '#f8fafc', 0.1]);
  // Goldene Stola vorn und hinten
  t.push(['q', [0.24, 1.1, 0.04], [0, 0.7, 0.22], GOLD, GLUEHT]);

  // Kopf & Tonsur
  t.push(['k', [0.16, 6], [0, 1.4, 0.02], '#fbcfe8']);
  t.push(['z', [0.18, 0.18, 0.06, 6], [0, 1.48, 0], '#475569']); // Haarkranz

  // Hände: Rechts segnend erhoben, Links Weihrauchfass
  t.push(stab([0.25, 1.15, 0], [0.35, 1.45, 0.25], 0.05, '#f8fafc', 0, 5));
  t.push(['k', [0.04, 4], [0.35, 1.45, 0.25], GOLD, GLUEHT]); // Heiligenschein der Hand

  // Kette & Weihrauchfass links
  t.push(stab([-0.25, 1.15, 0], [-0.35, 0.95, 0.2], 0.05, '#f8fafc', 0, 5));
  t.push(stab([-0.35, 0.95, 0.2], [-0.35, 0.45, 0.3], 0.015, GOLD, 0, 3)); // Kette
  t.push(['z', [0.08, 0.04, 0.18, 5], [-0.35, 0.38, 0.3], GOLD, GLUEHT]);
  return t;
}

/** Moosbär: Gewalttätiges Urvieh des Tiefwalds */
function moosbaerModell() {
  const t = [];
  // 4 kräftige Bärenbeine
  for (const sx of [1, -1]) {
    for (const sz of [1, -1]) {
      const x = sx * 0.45;
      const z = sz * 0.55;
      t.push(stab([x, 0.9, z], [x, 0.4, z], 0.18, MOOS, 0.1, 6));
      t.push(stab([x, 0.4, z], [x, 0.1, z], 0.16, WALDGRUEN, 0, 6));
      t.push(['q', [0.22, 0.12, 0.3], [x, 0.06, z + 0.05], '#0f172a']);
    }
  }

  // Wuchtiger Rumpf mit Moosbuckel
  t.push(['k', [0.65, 7], [0, 1.15, -0.1], MOOS]);
  t.push(['z', [0.55, 0.65, 1.1, 7], [0, 1.1, 0.1], WALDGRUEN, 0.15, [Math.PI / 2, 0, 0]]);

  // Mächtiger Bärenkopf & Schnauze
  t.push(['k', [0.38, 6], [0, 1.25, 0.75], MOOS]);
  t.push(['z', [0.18, 0.26, 0.4, 5], [0, 1.15, 1.05], HOLZ_D, 0, [Math.PI / 2, 0, 0]]);
  // Reißzähne
  t.push(['z', [0.03, 0, 0.12, 3], [-0.1, 1.05, 1.2], '#ffffff', 0, [0.3, 0, 0]]);
  t.push(['z', [0.03, 0, 0.12, 3], [0.1, 1.05, 1.2], '#ffffff', 0, [0.3, 0, 0]]);
  // Glühende Augen
  t.push(['k', [0.04, 3], [-0.16, 1.35, 0.95], BLATT, GLUEHT]);
  t.push(['k', [0.04, 3], [0.16, 1.35, 0.95], BLATT, GLUEHT]);
  return t;
}

/** Flüsterer des Dickichts: Ältester Waldschamane */
function fluestererModell() {
  const t = [];
  // Rindenmantel
  t.push(['z', [0.24, 0.44, 1.3, 6], [0, 0.7, 0], HOLZ, 0.1]);
  // Mooskragen & Flechten
  t.push(['z', [0.38, 0.24, 0.3, 6], [0, 1.3, 0], MOOS, 0.2]);

  // Geschnitzte Holzmaske
  t.push(['k', [0.16, 6], [0, 1.5, 0.05], HOLZ_D]);
  t.push(['q', [0.18, 0.24, 0.04], [0, 1.5, 0.18], HOLZ]);
  t.push(['k', [0.03, 3], [-0.06, 1.52, 0.2], BLATT, GLUEHT]);
  t.push(['k', [0.03, 3], [0.06, 1.52, 0.2], BLATT, GLUEHT]);

  // Verästeltes Hirschhorn auf der Maske
  for (const s of [1, -1]) {
    t.push(stab([s * 0.1, 1.62, 0.05], [s * 0.28, 1.95, -0.05], 0.04, HOLZ, 0, 4, 0.4));
  }

  // Schamanenstab mit schwebendem Irrlicht
  t.push(stab([0.35, 0.1, 0.2], [0.35, 1.9, 0.4], 0.035, HOLZ_D, 0, 4));
  t.push(['k', [0.12, 5], [0.35, 2.05, 0.4], BLATT, GLUEHT]);
  return t;
}

/** Kronenhirsch: Majestätischer Bote des Waldes mit leuchtender Geweihkrone */
function kronenhirschModell() {
  const t = [];
  // 4 grazile Hirschbeine
  for (const sx of [1, -1]) {
    for (const sz of [1, -1]) {
      const x = sx * 0.22;
      const z = sz * 0.45;
      t.push(stab([x, 0.9, z], [x, 0.45, z], 0.06, HOLZ, 0, 5));
      t.push(stab([x, 0.45, z], [x, 0.08, z], 0.05, HOLZ_D, 0, 5));
      t.push(['q', [0.08, 0.06, 0.12], [x, 0.03, z + 0.02], GOLD, GLUEHT]);
    }
  }

  // Schlanker Rumpf
  t.push(['z', [0.24, 0.28, 0.95, 6], [0, 0.95, 0], HOLZ, 0.15, [Math.PI / 2, 0, 0]]);
  // Hals aufrecht nach vorn
  t.push(stab([0, 1.05, 0.35], [0, 1.55, 0.65], 0.14, HOLZ, 0, 5));

  // Edler Kopf
  t.push(['k', [0.15, 6], [0, 1.6, 0.78], HOLZ]);
  t.push(['z', [0.07, 0.12, 0.25, 4], [0, 1.55, 0.95], HOLZ_D, 0, [Math.PI / 2, 0, 0]]);

  // Gewaltige, weit verzweigte Geweihkrone
  for (const s of [1, -1]) {
    t.push(stab([s * 0.08, 1.7, 0.75], [s * 0.35, 2.2, 0.65], 0.045, GOLD, GLUEHT, 4));
    t.push(stab([s * 0.35, 2.2, 0.65], [s * 0.55, 2.55, 0.8], 0.035, GOLD, GLUEHT, 4));
    t.push(stab([s * 0.35, 2.2, 0.65], [s * 0.25, 2.65, 0.45], 0.03, GOLD, GLUEHT, 4));
  }
  // Schwebender Sonnenstern im Geweih
  t.push(['k', [0.1, 5], [0, 2.25, 0.65], GOLD_HELL, GLUEHT]);
  return t;
}

/** Dornenhydra: Dreiköpfiges dorniges Wurzelmonstrum */
function dornenhydraModell() {
  const t = [];
  // Zentraler dorniger Wurzelknoten
  t.push(['k', [0.65, 7], [0, 0.7, 0], MOOS]);
  for (let b = 0; b < 6; b++) {
    const a = (b / 6) * Math.PI * 2;
    t.push(stab([0, 0.6, 0], [Math.cos(a) * 0.85, 0.15, Math.sin(a) * 0.85], 0.14, HOLZ_D, 0, 5));
  }

  // Drei schlangenartige Hälse mit Köpfen
  const halsWinkel = [-0.45, 0, 0.45];
  for (let h = 0; h < 3; h++) {
    const w = halsWinkel[h];
    const xEnde = Math.sin(w) * 0.75;
    const zEnde = Math.cos(w) * 0.85;

    // Geschwungener Hals
    t.push(stab([xEnde * 0.3, 0.8, zEnde * 0.3], [xEnde, 1.45, zEnde], 0.12, WALDGRUEN, 0, 5));
    // Kopf mit Dornengebiss
    t.push(['k', [0.2, 6], [xEnde, 1.5, zEnde + 0.1], HOLZ]);
    // Aufgerissenes Maul
    t.push(['z', [0.08, 0.16, 0.25, 4], [xEnde, 1.48, zEnde + 0.26], WALDGRUEN, 0, [Math.PI / 2, 0, 0]]);
    // Glühende Augen
    t.push(['k', [0.035, 3], [xEnde - 0.08, 1.56, zEnde + 0.2], BLATT, GLUEHT]);
    t.push(['k', [0.035, 3], [xEnde + 0.08, 1.56, zEnde + 0.2], BLATT, GLUEHT]);
  }
  return t;
}

// =============================================================================
// EXPORTE ALLER MODELLE
// =============================================================================
export const ERWEITERUNGEN_MODELLE = {
  // Todesgott Einheiten
  todesgott: todesgottModell(),
  totengraeber: totengraeberModell(),
  skelettkrieger: skelettkriegerModell(),
  aasgeier: aasgeierModell(),
  klageweib: klageweibModell(),
  grabwaechter: grabwaechterModell(),
  knochentitan: knochentitanModell(),

  // Todesgott Gebäude
  nekropole: nekropoleModell(),
  grabhuegel: grabhuegelModell(),
  knochenturm: knochenturmModell(),
  seelenbrunnen: seelenbrunnenModell(),
  knochenmuehle: knochenmuehleModell(),
  fleischwurz: fleischwurzModell(),
  katakombe: katakombeModell(),
  pestaltar: pestaltarModell(),
  ossuarium: ossuariumModell(),
  totenarchiv: totenarchivModell(),

  // Elite Einheiten: Menschen
  paladin: paladinModell(),
  wagenburg: wagenburgModell(),
  scharfschuetze: scharfschuetzeModell(),
  priester: priesterModell(),

  // Elite Einheiten: Waldgott
  moosbaer: moosbaerModell(),
  fluesterer: fluestererModell(),
  kronenhirsch: kronenhirschModell(),
  dornenhydra: dornenhydraModell(),
};
