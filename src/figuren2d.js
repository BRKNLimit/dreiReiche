// Figuren der 2D-Draufsicht: Einheiten und Gebaeude. Gehoert Gemini (siehe
// GEMINI.md). src/ui.js ruft beide Funktionen fuer jede sichtbare Entity auf;
// liefern sie false, zeichnet ui.js die einfache Form (Dreieck, Quadrat).
// Gezeichnet wird nur der Koerper -- Lebensbalken, Auswahl, Baulinien,
// Warnungen macht ui.js darueber.
//
//   ctx    CanvasRenderingContext2D (Bildschirm-Pixel)
//   e      die Entity (lesen, nie aendern): e.type, e.player, e.hp, e.maxHp,
//          e.done (Gebaeude fertig?), e.progress, e.powered (0..1000)
//   def    UNITS[e.type] bzw. BUILDINGS[e.type]
//   x, y   Mitte auf dem Schirm; r Radius in Pixeln (schon mit Zoom)
//   farbe  Volksfarbe als '#rrggbb' (Menschen gold, Gott gruen)
//   zoom   Pixel je Dezimeter (cam.z); zeit: performance.now() in ms

const blick2d = new Map();
const posVorher2d = new Map();

/** Ermittelt die Blickrichtung der Einheit in Bogenmass. */
function einheitWinkel(e) {
  const v = posVorher2d.get(e.id);
  if (v && (Math.abs(e.x - v[0]) + Math.abs(e.y - v[1]) > 4)) {
    const w = Math.atan2(e.y - v[1], e.x - v[0]);
    blick2d.set(e.id, w);
    posVorher2d.set(e.id, [e.x, e.y]);
    return w;
  }
  if (!v) posVorher2d.set(e.id, [e.x, e.y]);
  if (blick2d.has(e.id)) return blick2d.get(e.id);
  // Ruhewinkel nach Fraktion / Spieler
  const w = e.player === 0 ? Math.PI / 4 : -3 * Math.PI / 4;
  blick2d.set(e.id, w);
  return w;
}

/** Zeichnet eine Einheit in der 2D-Draufsicht. */
export function zeichneEinheit2d(ctx, e, def, x, y, r, farbe, zoom, zeit) {
  if (r < 2) return false;

  ctx.save();
  ctx.translate(x, y);

  // Bei sehr kleinem Zoom: klare kompakte Form
  if (r < 5.5) {
    ctx.fillStyle = farbe;
    ctx.beginPath();
    if (def.commander) {
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else if (def.worker) {
      ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
      ctx.fill();
    } else if (def.fliegt) {
      ctx.moveTo(r, 0);
      ctx.lineTo(-r, -r * 0.7);
      ctx.lineTo(-r * 0.5, 0);
      ctx.lineTo(-r, r * 0.7);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
    ctx.restore();
    return true;
  }

  // Volle Figur mit Ausrichtung
  const w = einheitWinkel(e);
  ctx.rotate(w);

  const t = zeit || 0;
  const typ = e.type;

  switch (typ) {
    case 'bauer': {
      // Bauer: Tunika, Filz-/Strohhut, vorstehende Sense
      // Schultern
      ctx.fillStyle = farbe;
      ctx.beginPath();
      ctx.ellipse(-r * 0.1, 0, r * 0.65, r * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
      // Strohhut
      ctx.fillStyle = '#bfa16b';
      ctx.strokeStyle = '#85642f';
      ctx.lineWidth = Math.max(1, r * 0.15);
      ctx.beginPath();
      ctx.arc(-r * 0.05, 0, r * 0.58, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Hutspitze
      ctx.fillStyle = '#85642f';
      ctx.beginPath();
      ctx.arc(-r * 0.05, 0, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
      // Sense: Holzschaft und geschwungene Stahlklinge
      ctx.strokeStyle = '#5a3d24';
      ctx.lineWidth = Math.max(1, r * 0.18);
      ctx.beginPath();
      ctx.moveTo(-r * 0.4, r * 0.8);
      ctx.lineTo(r * 0.95, r * 0.95);
      ctx.stroke();
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = Math.max(1.2, r * 0.22);
      ctx.beginPath();
      ctx.moveTo(r * 0.95, r * 0.95);
      ctx.quadraticCurveTo(r * 1.35, r * 0.5, r * 1.1, -r * 0.1);
      ctx.stroke();
      break;
    }

    case 'soldat': {
      // Soldat: Ruestung, Beckenhaube, Dreiecksschild links, Schwert rechts
      // Schultern & Harnisch
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.6, r * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
      // Helm (Eisenhut)
      ctx.fillStyle = '#94a3b8';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = Math.max(1, r * 0.15);
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Dreiecksschild (links, in Volksfarbe)
      ctx.fillStyle = farbe;
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = Math.max(1, r * 0.12);
      ctx.beginPath();
      ctx.moveTo(-r * 0.35, -r * 0.95);
      ctx.lineTo(r * 0.65, -r * 0.8);
      ctx.lineTo(r * 0.85, -r * 0.3);
      ctx.lineTo(-r * 0.35, -r * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Schwertklinge (rechts nach vorn)
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = Math.max(1.2, r * 0.2);
      ctx.beginPath();
      ctx.moveTo(0, r * 0.65);
      ctx.lineTo(r * 1.35, r * 0.65);
      ctx.stroke();
      // Parierstange
      ctx.strokeStyle = farbe;
      ctx.lineWidth = Math.max(1, r * 0.16);
      ctx.beginPath();
      ctx.moveTo(r * 0.2, r * 0.45);
      ctx.lineTo(r * 0.2, r * 0.85);
      ctx.stroke();
      break;
    }

    case 'jaeger': {
      // Jaeger: Gruener Jagdrock, Federhut, gespannter Bogen nach vorn
      // Schultern
      ctx.fillStyle = '#2d5a27';
      ctx.beginPath();
      ctx.ellipse(-r * 0.1, 0, r * 0.55, r * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
      // Jagdhut mit Krempe
      ctx.fillStyle = '#3f7038';
      ctx.beginPath();
      ctx.ellipse(-r * 0.1, 0, r * 0.42, r * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      // Fasanenfeder am Hut
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = Math.max(1, r * 0.16);
      ctx.beginPath();
      ctx.moveTo(-r * 0.1, -r * 0.1);
      ctx.lineTo(-r * 0.7, -r * 0.55);
      ctx.stroke();
      // Jagdbogen nach vorn
      ctx.strokeStyle = '#854d0e';
      ctx.lineWidth = Math.max(1, r * 0.18);
      ctx.beginPath();
      ctx.arc(r * 0.45, 0, r * 0.75, -Math.PI * 0.45, Math.PI * 0.45);
      ctx.stroke();
      // Sehne
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(r * 0.95, -r * 0.65);
      ctx.lineTo(r * 0.35, 0);
      ctx.lineTo(r * 0.95, r * 0.65);
      ctx.stroke();
      // Koecher auf dem Ruecken
      ctx.fillStyle = farbe;
      ctx.fillRect(-r * 0.6, -r * 0.25, r * 0.3, r * 0.5);
      break;
    }

    case 'soeldner': {
      // Soeldner: Schaller-Helm, Eisenbrust, maechtige Hellebarde
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.ellipse(-r * 0.1, 0, r * 0.7, r * 0.95, 0, 0, Math.PI * 2);
      ctx.fill();
      // Schaller-Helm
      ctx.fillStyle = '#64748b';
      ctx.strokeStyle = farbe;
      ctx.lineWidth = Math.max(1, r * 0.14);
      ctx.beginPath();
      ctx.arc(-r * 0.1, 0, r * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Hellebardenschaft
      ctx.strokeStyle = '#5c3a21';
      ctx.lineWidth = Math.max(1.2, r * 0.22);
      ctx.beginPath();
      ctx.moveTo(-r * 0.4, r * 0.6);
      ctx.lineTo(r * 1.5, r * 0.6);
      ctx.stroke();
      // Hellebarden-Axtblatt
      ctx.fillStyle = '#cbd5e1';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(r * 1.0, r * 0.6);
      ctx.quadraticCurveTo(r * 1.25, r * 1.2, r * 1.45, r * 0.85);
      ctx.lineTo(r * 1.35, r * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Stossdorn
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = Math.max(1, r * 0.2);
      ctx.beginPath();
      ctx.moveTo(r * 1.35, r * 0.6);
      ctx.lineTo(r * 1.85, r * 0.6);
      ctx.stroke();
      break;
    }

    case 'katapult': {
      // Balliste: Holzrahmen, 4 Raeder, Spannfedern mit Bogenarmen, Bolzen
      // Holzrahmen
      ctx.fillStyle = '#5c3a21';
      ctx.fillRect(-r * 0.85, -r * 0.45, r * 1.8, r * 0.9);
      // 4 Raeder
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-r * 0.7, -r * 0.85, r * 0.45, r * 0.35);
      ctx.fillRect(-r * 0.7, r * 0.5, r * 0.45, r * 0.35);
      ctx.fillRect(r * 0.35, -r * 0.85, r * 0.45, r * 0.35);
      ctx.fillRect(r * 0.35, r * 0.5, r * 0.45, r * 0.35);
      // Bogenarme
      ctx.strokeStyle = farbe;
      ctx.lineWidth = Math.max(1.5, r * 0.25);
      ctx.beginPath();
      ctx.arc(r * 0.7, 0, r * 0.85, -Math.PI * 0.45, Math.PI * 0.45);
      ctx.stroke();
      // Sehne & Wuchtiger Bolzen
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(r * 1.15, -r * 0.7);
      ctx.lineTo(r * 0.1, 0);
      ctx.lineTo(r * 1.15, r * 0.7);
      ctx.stroke();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = Math.max(1.5, r * 0.22);
      ctx.beginPath();
      ctx.moveTo(-r * 0.1, 0);
      ctx.lineTo(r * 1.5, 0);
      ctx.stroke();
      break;
    }

    case 'held': {
      // Held: Prunkruestung, roter Umhang, goldene Krone, Runenschwert
      // Roter Umhang
      ctx.fillStyle = '#991b1b';
      ctx.beginPath();
      ctx.moveTo(-r * 0.3, -r * 0.8);
      ctx.lineTo(-r * 1.1, -r * 0.6);
      ctx.lineTo(-r * 1.1, r * 0.6);
      ctx.lineTo(-r * 0.3, r * 0.8);
      ctx.closePath();
      ctx.fill();
      // Vergoldete Schultern
      ctx.fillStyle = farbe;
      ctx.beginPath();
      ctx.ellipse(-r * 0.1, 0, r * 0.75, r * 1.1, 0, 0, Math.PI * 2);
      ctx.fill();
      // Grosshelm
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(-r * 0.05, 0, r * 0.55, 0, Math.PI * 2);
      ctx.fill();
      // Goldene Krone mit Zacken
      ctx.fillStyle = farbe;
      ctx.beginPath();
      ctx.arc(-r * 0.05, 0, r * 0.42, 0, Math.PI * 2);
      ctx.fill();
      // Runenschwert (beidhaendig nach vorn)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = Math.max(1.5, r * 0.25);
      ctx.beginPath();
      ctx.moveTo(r * 0.25, 0);
      ctx.lineTo(r * 1.7, 0);
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(r * 0.3, 0);
      ctx.lineTo(r * 1.6, 0);
      ctx.stroke();
      break;
    }

    case 'dryade': {
      // Dryade: Zartes Rankenkleid, Bluetenkrone, schwebende Sporen
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.5, r * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
      // Helle Birkenkrone
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2);
      ctx.fill();
      // Bluetenkranz
      ctx.fillStyle = '#ec4899';
      for (let i = 0; i < 5; i++) {
        const phi = (i / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(Math.cos(phi) * r * 0.45, Math.sin(phi) * r * 0.45, r * 0.16, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'wolf': {
      // Wolf: Schlanker Raubtierkoerper, 4 Laeufe, Kopf mit Ohren, Rute
      ctx.fillStyle = '#3f3f46';
      // Rumpf
      ctx.beginPath();
      ctx.ellipse(-r * 0.1, 0, r * 0.75, r * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      // 4 Pfoten
      ctx.fillStyle = '#27272a';
      ctx.fillRect(-r * 0.5, -r * 0.65, r * 0.35, r * 0.25);
      ctx.fillRect(-r * 0.5, r * 0.4, r * 0.35, r * 0.25);
      ctx.fillRect(r * 0.1, -r * 0.65, r * 0.35, r * 0.25);
      ctx.fillRect(r * 0.1, r * 0.4, r * 0.35, r * 0.25);
      // Kopf mit Schnauze nach vorn
      ctx.fillStyle = '#52525b';
      ctx.beginPath();
      ctx.moveTo(r * 0.25, -r * 0.3);
      ctx.lineTo(r * 0.95, 0);
      ctx.lineTo(r * 0.25, r * 0.3);
      ctx.closePath();
      ctx.fill();
      // Spitze Ohren
      ctx.fillStyle = farbe;
      ctx.beginPath();
      ctx.moveTo(r * 0.15, -r * 0.3);
      ctx.lineTo(r * 0.4, -r * 0.55);
      ctx.lineTo(r * 0.35, -r * 0.15);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(r * 0.15, r * 0.3);
      ctx.lineTo(r * 0.4, r * 0.55);
      ctx.lineTo(r * 0.35, r * 0.15);
      ctx.closePath();
      ctx.fill();
      // Rute hinten
      ctx.strokeStyle = '#27272a';
      ctx.lineWidth = Math.max(1.2, r * 0.2);
      ctx.beginPath();
      ctx.moveTo(-r * 0.7, 0);
      ctx.quadraticCurveTo(-r * 1.1, r * 0.2, -r * 1.3, -r * 0.1);
      ctx.stroke();
      break;
    }

    case 'waldgeist':
    case 'waldgeist_fruehling':
    case 'waldgeist_sommer':
    case 'waldgeist_herbst':
    case 'waldgeist_winter': {
      // Waldgeist: Jahreszeiten-Krone, Schlingbogen, pulsierender Kern
      const pal = typ.includes('herbst') ? '#ea580c' : typ.includes('winter') ? '#38bdf8' : typ.includes('sommer') ? '#15803d' : '#84cc16';
      ctx.fillStyle = pal;
      ctx.beginPath();
      ctx.ellipse(-r * 0.1, 0, r * 0.55, r * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
      // Geistkern
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(-r * 0.05, 0, r * 0.35, 0, Math.PI * 2);
      ctx.fill();
      // Bogen aus Ranken
      ctx.strokeStyle = '#854d0e';
      ctx.lineWidth = Math.max(1, r * 0.16);
      ctx.beginPath();
      ctx.arc(r * 0.4, 0, r * 0.65, -Math.PI * 0.45, Math.PI * 0.45);
      ctx.stroke();
      break;
    }

    case 'ent': {
      // Ent: Knorriger Baumriese von oben, maechtige Baumkrone mit Astarmen
      ctx.fillStyle = '#3f2e1e';
      // Dicke Aststulpen
      ctx.beginPath();
      ctx.arc(-r * 0.1, 0, r * 0.75, 0, Math.PI * 2);
      ctx.fill();
      // Dichte Laubkrone
      ctx.fillStyle = farbe;
      for (let i = 0; i < 6; i++) {
        const phi = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(Math.cos(phi) * r * 0.5, Math.sin(phi) * r * 0.5, r * 0.48, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#14532d';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.52, 0, Math.PI * 2);
      ctx.fill();
      // Glimmende Augen
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(r * 0.4, -r * 0.2, r * 0.12, 0, Math.PI * 2);
      ctx.arc(r * 0.4, r * 0.2, r * 0.12, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'wurzelbrecher': {
      // Wurzelbrecher: Gepanzertes Belagerungsmonstrum, Rammkopf, 4 Pfahlwurzeln
      ctx.fillStyle = '#261b14';
      ctx.beginPath();
      ctx.ellipse(-r * 0.1, 0, r * 0.85, r * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      // 4 Wurzelstelzen
      ctx.strokeStyle = '#452c1a';
      ctx.lineWidth = Math.max(1.5, r * 0.25);
      ctx.beginPath();
      ctx.moveTo(-r * 0.4, -r * 0.85); ctx.lineTo(-r * 0.1, 0); ctx.lineTo(-r * 0.4, r * 0.85);
      ctx.moveTo(r * 0.4, -r * 0.85); ctx.lineTo(r * 0.1, 0); ctx.lineTo(r * 0.4, r * 0.85);
      ctx.stroke();
      // Wuchtiger Rammbalken-Kopf vorn
      ctx.fillStyle = '#573822';
      ctx.fillRect(r * 0.45, -r * 0.4, r * 0.65, r * 0.8);
      // Gluehendes Erdherz
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'rabe': {
      // Rabe: Eleganter schwarzer Vogel im Segelflug von oben
      ctx.fillStyle = '#0f172a';
      // Schwingen
      ctx.beginPath();
      ctx.moveTo(r * 0.6, 0);
      ctx.quadraticCurveTo(0, -r * 1.3, -r * 0.4, -r * 1.4);
      ctx.lineTo(-r * 0.2, -r * 0.4);
      ctx.lineTo(-r * 0.7, 0);
      ctx.lineTo(-r * 0.2, r * 0.4);
      ctx.lineTo(-r * 0.4, r * 1.4);
      ctx.quadraticCurveTo(0, r * 1.3, r * 0.6, 0);
      ctx.closePath();
      ctx.fill();
      // Rumpf & Schnabel
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.45, r * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = farbe;
      ctx.beginPath();
      ctx.moveTo(r * 0.35, -r * 0.08);
      ctx.lineTo(r * 0.85, 0);
      ctx.lineTo(r * 0.35, r * 0.08);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'waldgott': {
      // Waldgott: Riese mit weitem Mantel, Maechtigem Kathedralen-Geweih & Glutherz
      // Schwarzer Mantel
      ctx.fillStyle = '#09080c';
      ctx.beginPath();
      ctx.ellipse(-r * 0.1, 0, r * 0.85, r * 0.95, 0, 0, Math.PI * 2);
      ctx.fill();
      // Golden gluehendes Herz
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(-r * 0.05, 0, r * 0.32, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fffbeb';
      ctx.beginPath();
      ctx.arc(-r * 0.05, 0, r * 0.14, 0, Math.PI * 2);
      ctx.fill();
      // Ausladendes Geweih
      ctx.strokeStyle = '#44382c';
      ctx.lineWidth = Math.max(1.2, r * 0.18);
      ctx.beginPath();
      // Hauptstangen links und rechts
      ctx.moveTo(r * 0.2, -r * 0.25);
      ctx.lineTo(r * 0.7, -r * 0.85);
      ctx.lineTo(r * 0.4, -r * 1.25);
      ctx.moveTo(r * 0.5, -r * 0.6);
      ctx.lineTo(r * 0.95, -r * 0.75);
      ctx.moveTo(r * 0.2, r * 0.25);
      ctx.lineTo(r * 0.7, r * 0.85);
      ctx.lineTo(r * 0.4, r * 1.25);
      ctx.moveTo(r * 0.5, r * 0.6);
      ctx.lineTo(r * 0.95, r * 0.75);
      ctx.stroke();
      // Gluehende Geweihspitzen
      ctx.fillStyle = '#fbbf24';
      for (const [gx, gy] of [[r * 0.4, -r * 1.25], [r * 0.95, -r * 0.75], [r * 0.4, r * 1.25], [r * 0.95, r * 0.75]]) {
        ctx.beginPath();
        ctx.arc(gx, gy, r * 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }


    // ----------------------------------------------------------- Totenreich & Neue Einheiten
    case 'todesgott': {
      // Schattencape
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.ellipse(-r * 0.15, 0, r * 0.8, r * 0.9, 0, 0, Math.PI * 2);
          ctx.fill();
          // Aschgraue Kapuze
          ctx.fillStyle = '#334155';
          ctx.beginPath();
          ctx.ellipse(0, 0, r * 0.55, r * 0.65, 0, 0, Math.PI * 2);
          ctx.fill();
          // Dunkles Antlitz & Glühende Zyan-Augen
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.ellipse(r * 0.15, 0, r * 0.3, r * 0.4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(r * 0.22, -r * 0.18, r * 0.12, r * 0.12);
          ctx.fillRect(r * 0.22, r * 0.06, r * 0.12, r * 0.12);
          // Seelensensen beidseitig
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = Math.max(1.2, r * 0.16);
          ctx.beginPath();
          ctx.moveTo(-r * 0.6, r * 0.75); ctx.lineTo(r * 1.1, r * 0.75);
          ctx.moveTo(-r * 0.6, -r * 0.75); ctx.lineTo(r * 1.1, -r * 0.75);
          ctx.stroke();
          // Zyan-Klingen
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = Math.max(1.5, r * 0.22);
          ctx.beginPath();
          ctx.arc(r * 1.0, r * 0.3, r * 0.45, 0, Math.PI * 0.7);
          ctx.stroke();
      break;
    }

    case 'totengraeber': {
      ctx.fillStyle = '#334155';
          ctx.beginPath();
          ctx.ellipse(0, 0, r * 0.6, r * 0.8, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#64748b';
          ctx.beginPath();
          ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2);
          ctx.fill();
          // Schaufel
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = Math.max(1, r * 0.16);
          ctx.beginPath();
          ctx.moveTo(-r * 0.7, -r * 0.6); ctx.lineTo(r * 0.9, -r * 0.6);
          ctx.stroke();
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(r * 0.7, -r * 0.8, r * 0.35, r * 0.4);
          // Laterne
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(-r * 0.4, r * 0.5, r * 0.2, 0, Math.PI * 2);
          ctx.fill();
      break;
    }

    case 'skelettkrieger': {
      ctx.fillStyle = '#e2e8f0';
          ctx.beginPath();
          ctx.ellipse(-r * 0.1, 0, r * 0.5, r * 0.75, 0, 0, Math.PI * 2);
          ctx.fill();
          // Rippen
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(-r * 0.3, -r * 0.3); ctx.lineTo(r * 0.1, -r * 0.3);
          ctx.moveTo(-r * 0.3, 0); ctx.lineTo(r * 0.1, 0);
          ctx.moveTo(-r * 0.3, r * 0.3); ctx.lineTo(r * 0.1, r * 0.3);
          ctx.stroke();
          // Schädel
          ctx.fillStyle = '#f8fafc';
          ctx.beginPath();
          ctx.arc(r * 0.2, 0, r * 0.35, 0, Math.PI * 2);
          ctx.fill();
          // Schwert
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = Math.max(1, r * 0.18);
          ctx.beginPath();
          ctx.moveTo(r * 0.1, r * 0.6); ctx.lineTo(r * 1.25, r * 0.6);
          ctx.stroke();
          // Schild mit Fraktionsfarbe
          ctx.fillStyle = farbe;
          ctx.fillRect(-r * 0.2, -r * 0.8, r * 0.4, r * 0.25);
      break;
    }

    case 'aasgeier': {
      ctx.fillStyle = '#1e293b';
          ctx.beginPath();
          ctx.moveTo(r * 0.9, 0);
          ctx.lineTo(-r * 0.7, -r * 1.2);
          ctx.lineTo(-r * 0.2, 0);
          ctx.lineTo(-r * 0.7, r * 1.2);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#e2e8f0';
          ctx.beginPath();
          ctx.arc(r * 0.5, 0, r * 0.28, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = farbe;
          ctx.fillRect(-r * 0.4, -r * 0.1, r * 0.3, r * 0.2);
      break;
    }

    case 'klageweib': {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
          ctx.beginPath();
          ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#bae6fd';
          ctx.beginPath();
          ctx.ellipse(-r * 0.1, 0, r * 0.5, r * 0.65, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(r * 0.2, 0, r * 0.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(r * 0.25, 0, r * 0.12, 0, Math.PI * 2);
          ctx.fill();
      break;
    }

    case 'grabwaechter': {
      ctx.fillStyle = '#090d16';
          ctx.beginPath();
          ctx.ellipse(0, 0, r * 0.75, r * 0.95, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = farbe;
          ctx.lineWidth = 1.4;
          ctx.stroke();
          // Axt
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = Math.max(1.5, r * 0.22);
          ctx.beginPath();
          ctx.moveTo(-r * 0.3, r * 0.75); ctx.lineTo(r * 1.3, r * 0.75);
          ctx.stroke();
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(r * 0.9, r * 0.5, r * 0.4, r * 0.5);
      break;
    }

    case 'knochentitan': {
      ctx.fillStyle = '#475569';
          ctx.beginPath();
          ctx.ellipse(-r * 0.1, 0, r * 0.85, r * 0.95, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#cbd5e1';
          ctx.beginPath();
          ctx.arc(r * 0.2, 0, r * 0.6, 0, Math.PI * 2);
          ctx.fill();
          // Hörner
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.moveTo(r * 0.5, -r * 0.7); ctx.lineTo(r * 1.3, -r * 0.85); ctx.lineTo(r * 0.7, -r * 0.3); ctx.closePath(); ctx.fill();
          ctx.beginPath();
          ctx.moveTo(r * 0.5, r * 0.7); ctx.lineTo(r * 1.3, r * 0.85); ctx.lineTo(r * 0.7, r * 0.3); ctx.closePath(); ctx.fill();
      break;
    }

    case 'fluggleiter': {
      // Rumpf & Tragflächen
          ctx.fillStyle = farbe;
          ctx.beginPath();
          ctx.moveTo(r * 1.1, 0);
          ctx.lineTo(-r * 0.3, -r * 1.1);
          ctx.lineTo(-r * 0.8, -r * 1.1);
          ctx.lineTo(-r * 0.3, 0);
          ctx.lineTo(-r * 0.8, r * 1.1);
          ctx.lineTo(-r * 0.3, r * 1.1);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#78350f';
          ctx.fillRect(-r * 0.7, -r * 0.15, r * 1.4, r * 0.3);
          ctx.fillStyle = '#94a3b8';
          ctx.beginPath(); ctx.arc(r * 0.8, 0, r * 0.15, 0, Math.PI * 2); ctx.fill();
      break;
    }

    case 'brandballon': {
      ctx.fillStyle = farbe;
          ctx.beginPath();
          ctx.ellipse(0, 0, r * 0.9, r * 0.6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#78350f';
          ctx.fillRect(-r * 0.4, -r * 0.25, r * 0.8, r * 0.5);
          ctx.fillStyle = '#ef4444';
          ctx.beginPath(); ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2); ctx.fill();
      break;
    }

    case 'dampfkoloss': {
      ctx.fillStyle = '#243b53';
          ctx.fillRect(-r * 0.8, -r * 0.7, r * 1.6, r * 1.4);
          ctx.strokeStyle = farbe;
          ctx.lineWidth = Math.max(1.5, r * 0.15);
          ctx.strokeRect(-r * 0.8, -r * 0.7, r * 1.6, r * 1.4);
          // Kanonenrohre
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(r * 0.6, -r * 0.4, r * 0.6, r * 0.2);
          ctx.fillRect(r * 0.6, r * 0.2, r * 0.6, r * 0.2);
          ctx.fillStyle = '#f97316';
          ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2); ctx.fill();
      break;
    }

    case 'hornissenschwarm': {
      for (const [dx, dy] of [[r * 0.3, 0], [-r * 0.3, -r * 0.4], [-r * 0.3, r * 0.4]]) {
            ctx.fillStyle = '#eab308';
            ctx.beginPath(); ctx.ellipse(dx, dy, r * 0.35, r * 0.2, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#15803d';
            ctx.fillRect(dx - r * 0.1, dy - r * 0.2, r * 0.2, r * 0.4);
          }
      break;
    }

    case 'walddrache': {
      ctx.fillStyle = '#15803d';
          ctx.beginPath();
          ctx.moveTo(r * 1.0, 0);
          ctx.lineTo(-r * 0.2, -r * 1.2);
          ctx.lineTo(-r * 0.8, 0);
          ctx.lineTo(-r * 0.2, r * 1.2);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = farbe;
          ctx.beginPath(); ctx.arc(r * 0.3, 0, r * 0.35, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#84cc16';
          ctx.beginPath(); ctx.arc(r * 0.7, 0, r * 0.15, 0, Math.PI * 2); ctx.fill();
      break;
    }

    case 'weltenbaum_ent': {
      ctx.fillStyle = '#5c4028';
          ctx.beginPath(); ctx.ellipse(0, 0, r * 0.85, r * 0.95, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#15803d';
          ctx.beginPath(); ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = farbe;
          ctx.beginPath(); ctx.arc(r * 0.4, 0, r * 0.3, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(r * 0.5, -r * 0.15, r * 0.12, r * 0.12);
          ctx.fillRect(r * 0.5, r * 0.03, r * 0.12, r * 0.12);
      break;
    }

    case 'schattenflieger': {
      ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.moveTo(r * 1.0, 0);
          ctx.lineTo(-r * 0.4, -r * 1.15);
          ctx.lineTo(-r * 0.7, -r * 0.7);
          ctx.lineTo(-r * 0.3, 0);
          ctx.lineTo(-r * 0.7, r * 0.7);
          ctx.lineTo(-r * 0.4, r * 1.15);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath(); ctx.arc(r * 0.4, 0, r * 0.2, 0, Math.PI * 2); ctx.fill();
      break;
    }

    case 'pestschwinge': {
      ctx.fillStyle = '#1e293b';
          ctx.beginPath();
          ctx.moveTo(r * 0.9, 0);
          ctx.lineTo(-r * 0.3, -r * 1.2);
          ctx.lineTo(-r * 0.7, 0);
          ctx.lineTo(-r * 0.3, r * 1.2);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#334155';
          ctx.beginPath(); ctx.ellipse(-r * 0.1, 0, r * 0.45, r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#10b981';
          ctx.beginPath(); ctx.arc(-r * 0.1, 0, r * 0.25, 0, Math.PI * 2); ctx.fill();
      break;
    }

    case 'knochendrache': {
      ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.moveTo(r * 1.2, 0);
          ctx.lineTo(-r * 0.2, -r * 1.3);
          ctx.lineTo(-r * 0.8, -r * 0.6);
          ctx.lineTo(-r * 0.5, 0);
          ctx.lineTo(-r * 0.8, r * 0.6);
          ctx.lineTo(-r * 0.2, r * 1.3);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = Math.max(1.2, r * 0.12);
          ctx.stroke();
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2); ctx.fill();
      break;
    }

    default: {
      ctx.fillStyle = farbe;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }

  ctx.restore();
  return true;
}

/** Zeichnet ein Gebaeude in der 2D-Draufsicht. */
export function zeichneGebaeude2d(ctx, e, def, x, y, r, farbe, zoom, zeit) {
  if (r < 2) return false;

  ctx.save();
  ctx.translate(x, y);

  const istBaustelle = !e.done;
  const powerFactor = e.done ? (e.powered != null ? e.powered / 1000 : 1) : 1;

  // Baustellen: halbtransparent
  if (istBaustelle) {
    ctx.globalAlpha = 0.55;
  }

  const typ = e.type;

  // Grundriss & Koerper je nach Gebaeudetyp
  switch (typ) {
    // Menschen
    case 'halle': {
      // Langhaus mit Giebeldach und Firstkreuzen
      ctx.fillStyle = '#3e2d1d';
      ctx.fillRect(-r * 0.9, -r * 0.65, r * 1.8, r * 1.3);
      // Schieferdach / Holzschindeln
      ctx.fillStyle = '#6b4f32';
      ctx.beginPath();
      ctx.moveTo(-r * 0.9, -r * 0.65);
      ctx.lineTo(0, -r * 0.85);
      ctx.lineTo(r * 0.9, -r * 0.65);
      ctx.lineTo(r * 0.9, r * 0.65);
      ctx.lineTo(0, r * 0.85);
      ctx.lineTo(-r * 0.9, r * 0.65);
      ctx.closePath();
      ctx.fill();
      // Firstbalken
      ctx.strokeStyle = farbe;
      ctx.lineWidth = Math.max(1, r * 0.15);
      ctx.beginPath();
      ctx.moveTo(-r * 0.9, 0);
      ctx.lineTo(r * 0.9, 0);
      ctx.stroke();
      break;
    }

    case 'grenzstein': {
      // Steinerner Monolith
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.rect(-r * 0.65, -r * 0.65, r * 1.3, r * 1.3);
      ctx.fill();
      // Innere goldene Schutzrunen
      ctx.strokeStyle = farbe;
      ctx.lineWidth = Math.max(1, r * 0.18);
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.42, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }

    case 'wachturm': {
      // Runder Wehrturm mit Zinnenkranz
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.88, 0, Math.PI * 2);
      ctx.fill();
      // Wehrgang-Dach
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
      ctx.fill();
      // Zinnen
      ctx.strokeStyle = farbe;
      ctx.lineWidth = Math.max(1, r * 0.14);
      ctx.stroke();
      break;
    }

    case 'schmiede': {
      // Werkstatt mit lodernder Esse
      ctx.fillStyle = '#4b3f36';
      ctx.fillRect(-r * 0.8, -r * 0.7, r * 1.6, r * 1.4);
      // Lodernder Ofenkern
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.arc(r * 0.25, -r * 0.2, r * 0.38, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(r * 0.25, -r * 0.2, r * 0.18, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'saege': {
      // Saegewerk mit Holzstapeln
      ctx.fillStyle = '#5c4028';
      ctx.fillRect(-r * 0.85, -r * 0.65, r * 1.7, r * 1.3);
      // Rundholzstaemme
      ctx.strokeStyle = '#85562e';
      ctx.lineWidth = Math.max(1, r * 0.18);
      ctx.beginPath();
      ctx.moveTo(-r * 0.7, -r * 0.3); ctx.lineTo(r * 0.7, -r * 0.3);
      ctx.moveTo(-r * 0.7, 0.1); ctx.lineTo(r * 0.7, 0.1);
      ctx.stroke();
      break;
    }

    case 'kaserne': {
      // Geviert mit Innenhof
      ctx.fillStyle = '#475569';
      ctx.fillRect(-r * 0.9, -r * 0.75, r * 1.8, r * 1.5);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-r * 0.45, -r * 0.35, r * 0.9, r * 0.7);
      ctx.strokeStyle = farbe;
      ctx.lineWidth = Math.max(1, r * 0.12);
      ctx.strokeRect(-r * 0.9, -r * 0.75, r * 1.8, r * 1.5);
      break;
    }

    case 'schacht': {
      // Foerderschacht mit Seilwinde und Goetterblut
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
      ctx.fill();
      // Holz-A-Balken
      ctx.strokeStyle = '#854d0e';
      ctx.lineWidth = Math.max(1, r * 0.16);
      ctx.beginPath();
      ctx.moveTo(-r * 0.7, -r * 0.7); ctx.lineTo(r * 0.7, r * 0.7);
      ctx.moveTo(-r * 0.7, r * 0.7); ctx.lineTo(r * 0.7, -r * 0.7);
      ctx.stroke();
      break;
    }

    case 'banner': {
      // Standarte / Banner
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = farbe;
      ctx.fillRect(-r * 0.2, -r * 0.8, r * 0.95, r * 0.6);
      break;
    }

    case 'kapelle': {
      // Basilika-Kreuzform
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-r * 0.8, -r * 0.35, r * 1.6, r * 0.7);
      ctx.fillRect(-r * 0.35, -r * 0.75, r * 0.7, r * 1.5);
      ctx.strokeStyle = farbe;
      ctx.lineWidth = 1;
      ctx.strokeRect(-r * 0.8, -r * 0.35, r * 1.6, r * 0.7);
      break;
    }

    case 'skriptorium': {
      // Achteckiges Studierhaus
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const phi = (i / 8) * Math.PI * 2;
        const px = Math.cos(phi) * r * 0.85;
        const py = Math.sin(phi) * r * 0.85;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'spaehposten': {
      // Holzhochsitz auf 4 Pfosten
      ctx.fillStyle = '#5c4028';
      ctx.fillRect(-r * 0.75, -r * 0.75, r * 1.5, r * 1.5);
      ctx.fillStyle = '#3a2718';
      ctx.fillRect(-r * 0.5, -r * 0.5, r * 1.0, r * 1.0);
      ctx.strokeStyle = farbe;
      ctx.lineWidth = 1;
      ctx.strokeRect(-r * 0.75, -r * 0.75, r * 1.5, r * 1.5);
      break;
    }

    // Gott
    case 'herzbaum': {
      // Urbaum: Grosse Wurzelarme und leuchtende Lebenskrone
      ctx.fillStyle = '#2f2015';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
      ctx.fill();
      // Laubkrone
      ctx.fillStyle = farbe;
      for (let i = 0; i < 6; i++) {
        const phi = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(Math.cos(phi) * r * 0.55, Math.sin(phi) * r * 0.55, r * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      // Herzglut
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'hain': {
      // Drei Baeume
      ctx.fillStyle = farbe;
      const bPos = [[-r * 0.35, -r * 0.3], [r * 0.35, -r * 0.3], [0, r * 0.4]];
      for (const [bx, by] of bPos) {
        ctx.beginPath();
        ctx.arc(bx, by, r * 0.52, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'waechterbaum': {
      // Dornen-Baum mit Waecheraugen
      ctx.fillStyle = '#261a12';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.75, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#452a1c';
      ctx.lineWidth = Math.max(1, r * 0.16);
      for (let i = 0; i < 6; i++) {
        const phi = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(phi) * r * 1.05, Math.sin(phi) * r * 1.05);
        ctx.stroke();
      }
      // Augen
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(-r * 0.2, 0, r * 0.12, 0, Math.PI * 2);
      ctx.arc(r * 0.2, 0, r * 0.12, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'quelle': {
      // Klarer Quellsee
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.88, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'moos': {
      // Moospolster
      ctx.fillStyle = '#166534';
      ctx.beginPath();
      ctx.arc(-r * 0.2, -r * 0.1, r * 0.6, 0, Math.PI * 2);
      ctx.arc(r * 0.25, r * 0.1, r * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'dickicht': {
      // Dornengestruepp
      ctx.fillStyle = '#14532d';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1e3a1f';
      ctx.lineWidth = Math.max(1, r * 0.15);
      for (let i = 0; i < 8; i++) {
        const phi = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(phi) * r * 0.95, Math.sin(phi) * r * 0.95);
        ctx.stroke();
      }
      break;
    }

    case 'blutwurz': {
      // Blutrote Knollenwurzel
      ctx.fillStyle = '#451a1a';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.75, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'dornenschrein': {
      // Schrein des Zorns
      ctx.fillStyle = '#1f2937';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.75, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'eiche': {
      // Raunende Eiche
      ctx.fillStyle = '#3e2d1d';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'steinkreis': {
      // 7 Megalithen im Kreis
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
      ctx.fill();
      // Steine
      ctx.fillStyle = '#64748b';
      for (let i = 0; i < 7; i++) {
        const phi = (i / 7) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(Math.cos(phi) * r * 0.65, Math.sin(phi) * r * 0.65, r * 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
      // Schutzlicht in der Mitte
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2);
      ctx.fill();
      break;
    }


    // ----------------------------------------------------------- Totenreich & Neue Gebäude
    case 'nekropole': {
      ctx.fillStyle = '#0f172a';
          ctx.fillRect(-r * 0.9, -r * 0.9, r * 1.8, r * 1.8);
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = Math.max(1.5, r * 0.1);
          ctx.strokeRect(-r * 0.9, -r * 0.9, r * 1.8, r * 1.8);
          ctx.fillStyle = '#1e293b';
          ctx.beginPath(); ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath(); ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2); ctx.fill();
      break;
    }

    case 'grabhuegel': {
      ctx.fillStyle = '#1e293b';
          ctx.beginPath(); ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = Math.max(1.2, r * 0.12);
          ctx.stroke();
          ctx.fillStyle = '#475569';
          ctx.fillRect(-r * 0.25, -r * 0.35, r * 0.5, r * 0.7);
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(-r * 0.08, -r * 0.2, r * 0.16, r * 0.4);
      break;
    }

    case 'knochenturm': {
      ctx.fillStyle = '#0f172a';
          ctx.beginPath(); ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = Math.max(1.2, r * 0.15);
          ctx.stroke();
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath(); ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2); ctx.fill();
      break;
    }

    case 'seelenbrunnen': {
      ctx.fillStyle = '#1e293b';
          ctx.beginPath(); ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#0284c7';
          ctx.beginPath(); ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#bae6fd';
          ctx.beginPath(); ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2); ctx.fill();
      break;
    }

    case 'knochenmuehle': {
      ctx.fillStyle = '#1e293b';
          ctx.beginPath(); ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = Math.max(1.5, r * 0.15);
          const rot = (zeit || 0) * 0.0015;
          for (let i = 0; i < 4; i++) {
            const a = rot + (i * Math.PI) / 2;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * r * 0.75, Math.sin(a) * r * 0.75); ctx.stroke();
          }
      break;
    }

    case 'fleischwurz': {
      ctx.fillStyle = '#450a0a';
          ctx.beginPath(); ctx.arc(0, 0, r * 0.75, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#dc2626';
          ctx.lineWidth = Math.max(1.5, r * 0.18);
          for (let i = 0; i < 5; i++) {
            const a = (i * Math.PI * 2) / 5;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95); ctx.stroke();
          }
      break;
    }

    case 'katakombe': {
      ctx.fillStyle = '#090d16';
          ctx.fillRect(-r * 0.8, -r * 0.8, r * 1.6, r * 1.6);
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = Math.max(1.2, r * 0.12);
          ctx.strokeRect(-r * 0.8, -r * 0.8, r * 1.6, r * 1.6);
          ctx.fillStyle = '#000000';
          ctx.fillRect(-r * 0.45, -r * 0.45, r * 0.9, r * 0.9);
      break;
    }

    case 'pestaltar': {
      ctx.fillStyle = '#1e293b';
          ctx.fillRect(-r * 0.75, -r * 0.5, r * 1.5, r * 1.0);
          ctx.fillStyle = '#10b981';
          ctx.beginPath(); ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2); ctx.fill();
      break;
    }

    case 'ossuarium': {
      ctx.fillStyle = '#334155';
          ctx.fillRect(-r * 0.85, -r * 0.85, r * 1.7, r * 1.7);
          ctx.fillStyle = '#e2e8f0';
          for (let dx = -0.5; dx <= 0.5; dx += 0.5) {
            for (let dy = -0.5; dy <= 0.5; dy += 0.5) {
              ctx.beginPath(); ctx.arc(dx * r, dy * r, r * 0.16, 0, Math.PI * 2); ctx.fill();
            }
          }
      break;
    }

    case 'totenarchiv': {
      ctx.fillStyle = '#0f172a';
          ctx.beginPath(); ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(-r * 0.4, -r * 0.25, r * 0.8, r * 0.5);
      break;
    }

    case 'ballonhalle': {
      ctx.fillStyle = '#243b53';
          ctx.fillRect(-r * 0.9, -r * 0.75, r * 1.8, r * 1.5);
          ctx.strokeStyle = farbe;
          ctx.lineWidth = Math.max(1.5, r * 0.12);
          ctx.strokeRect(-r * 0.9, -r * 0.75, r * 1.8, r * 1.5);
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(-r * 0.5, r * 0.2, r * 1.0, r * 0.55);
      break;
    }

    case 'flakbatterie': {
      ctx.fillStyle = '#334155';
          ctx.beginPath(); ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = farbe;
          ctx.lineWidth = Math.max(1.2, r * 0.12);
          ctx.stroke();
          // 4 Rohre
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = Math.max(1.5, r * 0.18);
          for (const a of [-0.6, -0.2, 0.2, 0.6]) {
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(a) * r * 0.9, -Math.cos(a) * r * 0.9); ctx.stroke();
          }
      break;
    }

    case 'schildturm': {
      ctx.fillStyle = '#243b53';
          ctx.beginPath(); ctx.arc(0, 0, r * 0.75, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath(); ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 2]);
          ctx.beginPath(); ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]);
      break;
    }

    case 'aetherwandler': {
      ctx.fillStyle = '#243b53';
          ctx.fillRect(-r * 0.8, -r * 0.8, r * 1.6, r * 1.6);
          ctx.fillStyle = '#0284c7';
          ctx.beginPath(); ctx.arc(-r * 0.3, 0, r * 0.35, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#1fd35a';
          ctx.beginPath(); ctx.arc(r * 0.3, 0, r * 0.35, 0, Math.PI * 2); ctx.fill();
      break;
    }

    case 'grossgiesserei': {
      ctx.fillStyle = '#1e293b';
          ctx.fillRect(-r * 0.95, -r * 0.8, r * 1.9, r * 1.6);
          ctx.fillStyle = '#f97316';
          ctx.fillRect(-r * 0.4, -r * 0.3, r * 0.8, r * 0.6);
          ctx.strokeStyle = farbe;
          ctx.lineWidth = Math.max(1.2, r * 0.1);
          ctx.strokeRect(-r * 0.95, -r * 0.8, r * 1.9, r * 1.6);
      break;
    }

    case 'belagerungsmoerser': {
      ctx.fillStyle = '#243b53';
          ctx.beginPath(); ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(-r * 0.25, -r * 0.85, r * 0.5, r * 1.1);
          ctx.strokeStyle = farbe;
          ctx.lineWidth = Math.max(1.2, r * 0.12);
          ctx.stroke();
      break;
    }

    case 'abfangposten': {
      ctx.fillStyle = '#243b53';
          ctx.fillRect(-r * 0.8, -r * 0.8, r * 1.6, r * 1.6);
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2); ctx.fill();
      break;
    }

    case 'wipfelhorst': {
      ctx.fillStyle = '#15803d';
          ctx.beginPath(); ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#5c4028';
          ctx.beginPath(); ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = farbe;
          ctx.beginPath(); ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2); ctx.fill();
      break;
    }

    case 'sporenwerfer': {
      ctx.fillStyle = '#14532d';
          ctx.beginPath(); ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2); ctx.fill();
          for (let i = 0; i < 3; i++) {
            const a = (i * Math.PI * 2) / 3;
            ctx.fillStyle = '#a3e635';
            ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, r * 0.2, 0, Math.PI * 2); ctx.fill();
          }
      break;
    }

    case 'hainschild': {
      ctx.fillStyle = '#15803d';
          ctx.beginPath(); ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#84cc16';
          ctx.beginPath(); ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#a3e635';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 2]);
          ctx.beginPath(); ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]);
      break;
    }

    case 'bluetenkelch': {
      ctx.fillStyle = '#15803d';
          for (let i = 0; i < 6; i++) {
            const a = (i * Math.PI * 2) / 6;
            ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.35, 0, Math.PI * 2); ctx.fill();
          }
          ctx.fillStyle = '#facc15';
          ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2); ctx.fill();
      break;
    }

    case 'lebensschmiede': {
      ctx.fillStyle = '#5c4028';
          ctx.beginPath(); ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#22c55e';
          ctx.beginPath(); ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2); ctx.fill();
      break;
    }

    case 'zornwurzel': {
      ctx.fillStyle = '#3f2e1a';
          ctx.beginPath(); ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#ef4444';
          ctx.beginPath(); ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2); ctx.fill();
      break;
    }

    case 'himmelsdorn': {
      ctx.fillStyle = '#14532d';
          ctx.beginPath(); ctx.arc(0, 0, r * 0.75, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#a3e635';
          ctx.beginPath(); ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2); ctx.fill();
      break;
    }

    case 'wipfelausguck': {
      ctx.fillStyle = '#78350f';
          ctx.beginPath(); ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#fef08a';
          ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2); ctx.fill();
      break;
    }

    case 'knochenhorst': {
      ctx.fillStyle = '#0f172a';
          ctx.beginPath(); ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = Math.max(1.2, r * 0.12);
          ctx.stroke();
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath(); ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2); ctx.fill();
      break;
    }

    case 'seelenspeier': {
      ctx.fillStyle = '#0f172a';
          ctx.beginPath(); ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2); ctx.fill();
          for (let i = 0; i < 3; i++) {
            const a = (i * Math.PI * 2) / 3;
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.45, r * 0.18, 0, Math.PI * 2); ctx.fill();
          }
      break;
    }

    case 'seelenkuppel': {
      ctx.fillStyle = '#0f172a';
          ctx.beginPath(); ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath(); ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 2]);
          ctx.beginPath(); ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]);
      break;
    }

    case 'entropieofen': {
      ctx.fillStyle = '#0f172a';
          ctx.fillRect(-r * 0.8, -r * 0.8, r * 1.6, r * 1.6);
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(-r * 0.35, -r * 0.35, r * 0.7, r * 0.7);
      break;
    }

    case 'fossilienwerk': {
      ctx.fillStyle = '#0f172a';
          ctx.fillRect(-r * 0.9, -r * 0.85, r * 1.8, r * 1.7);
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = Math.max(1.2, r * 0.12);
          ctx.strokeRect(-r * 0.9, -r * 0.85, r * 1.8, r * 1.7);
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath(); ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2); ctx.fill();
      break;
    }

    case 'seuchenmoerser': {
      ctx.fillStyle = '#0f172a';
          ctx.beginPath(); ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#10b981';
          ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2); ctx.fill();
      break;
    }

    case 'schattenschirm': {
      ctx.fillStyle = '#0f172a';
          ctx.beginPath(); ctx.arc(0, 0, r * 0.75, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath(); ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2); ctx.fill();
      break;
    }

    case 'geisterturm': {
      ctx.fillStyle = '#0f172a';
          ctx.beginPath(); ctx.arc(0, 0, r * 0.75, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath(); ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2); ctx.fill();
      break;
    }

    default: {
      ctx.fillStyle = farbe;
      ctx.fillRect(-r * 0.8, -r * 0.8, r * 1.6, r * 1.6);
      break;
    }
  }

  // Baustelle: Holzgeruest ueber dem Bauplatz
  if (istBaustelle) {
    ctx.strokeStyle = '#854d0e';
    ctx.lineWidth = Math.max(1, r * 0.12);
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(-r * 0.9, -r * 0.9, r * 1.8, r * 1.8);
    ctx.beginPath();
    ctx.moveTo(-r * 0.9, -r * 0.9); ctx.lineTo(r * 0.9, r * 0.9);
    ctx.moveTo(-r * 0.9, r * 0.9); ctx.lineTo(r * 0.9, -r * 0.9);
    ctx.stroke();
    ctx.setLineDash([]);
  } else if (powerFactor < 1) {
    // Gebaeude ohne Gegenwart: spuerbar dunkler abgetoent
    ctx.fillStyle = 'rgba(0, 0, 0, ' + (0.45 * (1 - powerFactor)).toFixed(2) + ')';
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.05, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
  return true;
}
