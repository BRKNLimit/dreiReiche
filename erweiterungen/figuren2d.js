// Figuren der 2D-Draufsicht fuer die Erweiterungen: Todesgott & Elite-Einheiten.
// Gehoert zur Grafik (siehe GEMINI.md).
//
// Rendert Einheiten und Gebaeude praezise auf dem 2D-Canvas.
//   ctx    CanvasRenderingContext2D (Pixel)
//   e      Entity: e.type, e.player, e.hp, e.maxHp, e.done, e.progress, e.powered
//   def    Definition aus sim_defs.js
//   x, y   Mitte auf dem Schirm; r Radius in Pixeln
//   farbe  Volksfarbe (#8b9bb4 fuer Tod, #d8b06a fuer Menschen, #8fb86a fuer Gott)
//   zoom   Pixel je Dezimeter
//   zeit   performance.now() in ms

const blick2d = new Map();
const posVorher2d = new Map();

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
  const w = e.player === 0 ? Math.PI / 4 : -3 * Math.PI / 4;
  blick2d.set(e.id, w);
  return w;
}

/** Zeichnet eine Erweiterungs-Einheit in der 2D-Draufsicht. */
export function zeichneErweiterungEinheit2d(ctx, e, def, x, y, r, farbe, zoom, zeit) {
  if (r < 2) return false;

  ctx.save();
  ctx.translate(x, y);

  if (r < 5.5) {
    ctx.fillStyle = farbe;
    ctx.beginPath();
    if (def.commander) {
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 1.2;
      ctx.stroke();
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
    }
    ctx.restore();
    return true;
  }

  const winkel = def.fliegt ? (zeit * 0.002) : einheitWinkel(e);
  ctx.rotate(winkel);

  const t = zeit * 0.001;

  switch (e.type) {
    // ----------------------------------------------------------- Todesgott
    case 'todesgott': {
      // Schwarze zerschlissene Schattencape
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
      // Seelensense an der Seite
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = Math.max(1.2, r * 0.18);
      ctx.beginPath();
      ctx.moveTo(-r * 0.6, r * 0.75);
      ctx.lineTo(r * 1.1, r * 0.75);
      ctx.stroke();
      // Klinge mit Zyan-Glut
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = Math.max(1.5, r * 0.25);
      ctx.beginPath();
      ctx.arc(r * 1.0, r * 0.3, r * 0.45, 0, Math.PI * 0.7);
      ctx.stroke();
      break;
    }

    case 'totengraeber': {
      // Robe & Schaufel
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
      ctx.moveTo(-r * 0.7, -r * 0.6);
      ctx.lineTo(r * 0.9, -r * 0.6);
      ctx.stroke();
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(r * 0.7, -r * 0.8, r * 0.35, r * 0.4);
      break;
    }

    case 'skelettkrieger': {
      // Bleiche Knochenbrust & Helm
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.ellipse(-r * 0.1, 0, r * 0.5, r * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
      // Dunkle Rippen
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-r * 0.3, -r * 0.4); ctx.lineTo(r * 0.1, -r * 0.4);
      ctx.moveTo(-r * 0.3, 0); ctx.lineTo(r * 0.1, 0);
      ctx.moveTo(-r * 0.3, r * 0.4); ctx.lineTo(r * 0.1, r * 0.4);
      ctx.stroke();
      // Schädel
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(r * 0.2, 0, r * 0.35, 0, Math.PI * 2);
      ctx.fill();
      // Knochenschwert & Schild
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = Math.max(1, r * 0.18);
      ctx.beginPath();
      ctx.moveTo(r * 0.1, r * 0.6);
      ctx.lineTo(r * 1.25, r * 0.6);
      ctx.stroke();
      // Knochenschild
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-r * 0.2, -r * 0.8, r * 0.4, r * 0.25);
      break;
    }

    case 'aasgeier': {
      // Ausgebreitete Schwingen
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(r * 0.9, 0);
      ctx.lineTo(-r * 0.7, -r * 1.2);
      ctx.lineTo(-r * 0.2, 0);
      ctx.lineTo(-r * 0.7, r * 1.2);
      ctx.closePath();
      ctx.fill();
      // Weißer Schädel
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(r * 0.5, 0, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'klageweib': {
      // Spektraler Schemen mit Schwingen aus Nebel
      ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#bae6fd';
      ctx.beginPath();
      ctx.ellipse(-r * 0.1, 0, r * 0.5, r * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();
      // Geisterkopf
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
      // Gewaltige Obsidianpanzerung
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.75, r * 0.95, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ef4444'; // Blutader-Insignie
      ctx.lineWidth = 1.2;
      ctx.stroke();
      // Schwere Breitaxt
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = Math.max(1.5, r * 0.22);
      ctx.beginPath();
      ctx.moveTo(-r * 0.3, r * 0.75);
      ctx.lineTo(r * 1.3, r * 0.75);
      ctx.stroke();
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(r * 0.9, r * 0.5, r * 0.4, r * 0.5);
      break;
    }

    case 'knochentitan': {
      // Gewaltiger Schädelkoloss
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.ellipse(-r * 0.1, 0, r * 0.85, r * 0.95, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(r * 0.2, 0, r * 0.6, 0, Math.PI * 2);
      ctx.fill();
      // Rammhörner vorn
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(r * 0.5, -r * 0.7);
      ctx.lineTo(r * 1.3, -r * 0.85);
      ctx.lineTo(r * 0.7, -r * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(r * 0.5, r * 0.7);
      ctx.lineTo(r * 1.3, r * 0.85);
      ctx.lineTo(r * 0.7, r * 0.3);
      ctx.closePath();
      ctx.fill();
      break;
    }

    // ----------------------------------------------------------- Elite: Menschen
    case 'paladin': {
      // Glänzender Plattenpanzer mit Goldwappen
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.7, r * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
      // Ordenswappen & Kreuz
      ctx.fillStyle = '#d8b06a';
      ctx.fillRect(-r * 0.35, -r * 0.15, r * 0.7, r * 0.3);
      ctx.fillRect(-r * 0.15, -r * 0.35, r * 0.3, r * 0.7);
      // Prachthelm mit Goldfeder
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
      ctx.fill();
      // Zweihandschwert
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = Math.max(1.5, r * 0.22);
      ctx.beginPath();
      ctx.moveTo(-r * 0.2, r * 0.75);
      ctx.lineTo(r * 1.45, r * 0.75);
      ctx.stroke();
      break;
    }

    case 'wagenburg': {
      // Rechteckiger Holzkasten mit Eisenverstrebung
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-r * 0.9, -r * 0.7, r * 1.8, r * 1.4);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = Math.max(1.5, r * 0.18);
      ctx.strokeRect(-r * 0.9, -r * 0.7, r * 1.8, r * 1.4);
      // Schießscharten
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(r * 0.7, -r * 0.4, r * 0.25, r * 0.25);
      ctx.fillRect(r * 0.7, r * 0.15, r * 0.25, r * 0.25);
      // Goldene Fahne
      ctx.fillStyle = '#d8b06a';
      ctx.beginPath();
      ctx.moveTo(-r * 0.4, 0);
      ctx.lineTo(r * 0.2, -r * 0.3);
      ctx.lineTo(r * 0.2, r * 0.3);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'scharfschuetze': {
      // Tarnumhang
      ctx.fillStyle = '#3f6212';
      ctx.beginPath();
      ctx.ellipse(-r * 0.15, 0, r * 0.6, r * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      // Übergroße Armbrust
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = Math.max(1.5, r * 0.24);
      ctx.beginPath();
      ctx.moveTo(r * 0.1, 0);
      ctx.lineTo(r * 1.4, 0);
      ctx.stroke();
      ctx.strokeStyle = '#d8b06a';
      ctx.lineWidth = Math.max(1.2, r * 0.16);
      ctx.beginPath();
      ctx.arc(r * 1.1, 0, r * 0.6, -Math.PI * 0.4, Math.PI * 0.4);
      ctx.stroke();
      break;
    }

    case 'priester': {
      // Weiße und goldene Festrobe
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.65, r * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      // Goldene Stola
      ctx.fillStyle = '#d8b06a';
      ctx.fillRect(-r * 0.2, -r * 0.6, r * 0.4, r * 1.2);
      // Weihrauch-Aura (pulsierend)
      ctx.strokeStyle = 'rgba(216, 176, 106, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.95 + Math.sin(t * 3) * 1.5, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }

    // ----------------------------------------------------------- Elite: Waldgott
    case 'moosbaer': {
      // Breiter, massiger Moospelz
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.ellipse(-r * 0.1, 0, r * 0.8, r * 0.95, 0, 0, Math.PI * 2);
      ctx.fill();
      // Wuchtiger Kopf mit Pranken
      ctx.fillStyle = '#3f2e1a';
      ctx.beginPath();
      ctx.arc(r * 0.45, 0, r * 0.45, 0, Math.PI * 2);
      ctx.fill();
      // Mooskragen
      ctx.strokeStyle = '#86efac';
      ctx.lineWidth = Math.max(1.2, r * 0.16);
      ctx.stroke();
      break;
    }

    case 'fluesterer': {
      // Robe aus Flechten und Ranken
      ctx.fillStyle = '#166534';
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.6, r * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
      // Hölzerner Runenstab
      ctx.strokeStyle = '#854d0e';
      ctx.lineWidth = Math.max(1.2, r * 0.18);
      ctx.beginPath();
      ctx.moveTo(-r * 0.4, r * 0.65);
      ctx.lineTo(r * 1.2, r * 0.65);
      ctx.stroke();
      ctx.fillStyle = '#86efac';
      ctx.beginPath();
      ctx.arc(r * 1.1, r * 0.65, r * 0.25, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'kronenhirsch': {
      // Schlanker athletischer Körper
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.ellipse(-r * 0.2, 0, r * 0.5, r * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      // Hirschkopf
      ctx.fillStyle = '#92400e';
      ctx.beginPath();
      ctx.ellipse(r * 0.35, 0, r * 0.3, r * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      // Gewaltiges golden-grünes Geweih
      ctx.strokeStyle = '#8fb86a';
      ctx.lineWidth = Math.max(1.2, r * 0.16);
      ctx.beginPath();
      ctx.moveTo(r * 0.35, -r * 0.2);
      ctx.lineTo(r * 0.75, -r * 0.8);
      ctx.lineTo(r * 1.1, -r * 0.95);
      ctx.moveTo(r * 0.35, r * 0.2);
      ctx.lineTo(r * 0.75, r * 0.8);
      ctx.lineTo(r * 1.1, r * 0.95);
      ctx.stroke();
      break;
    }

    case 'dornenhydra': {
      // Zentraler Dornenstrunk
      ctx.fillStyle = '#14532d';
      ctx.beginPath();
      ctx.arc(-r * 0.2, 0, r * 0.7, 0, Math.PI * 2);
      ctx.fill();
      // Drei Schlangenköpfe fächerförmig nach vorn
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = Math.max(1.5, r * 0.2);
      for (const w of [-0.4, 0, 0.4]) {
        ctx.beginPath();
        ctx.moveTo(-r * 0.2, 0);
        ctx.lineTo(Math.cos(w) * r * 1.25, Math.sin(w) * r * 1.25);
        ctx.stroke();
        ctx.fillStyle = '#8fb86a';
        ctx.beginPath();
        ctx.arc(Math.cos(w) * r * 1.25, Math.sin(w) * r * 1.25, r * 0.25, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    default:
      ctx.restore();
      return false;
  }

  ctx.restore();
  return true;
}

/** Zeichnet ein Erweiterungs-Gebäude in der 2D-Draufsicht. */
export function zeichneErweiterungGebaeude2d(ctx, e, def, x, y, r, farbe, zoom, zeit) {
  if (r < 2) return false;

  ctx.save();
  ctx.translate(x, y);

  if (!e.done) {
    ctx.globalAlpha = 0.55;
  }

  switch (e.type) {
    case 'nekropole': {
      // Rechteckiger Basiskomplex mit Innenhof
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-r * 0.9, -r * 0.9, r * 1.8, r * 1.8);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = Math.max(1.5, r * 0.1);
      ctx.strokeRect(-r * 0.9, -r * 0.9, r * 1.8, r * 1.8);
      // Giebel & Knochenpfeiler
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
      ctx.fill();
      // Seelenfeuer im Zentrum
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'grabhuegel': {
      // Runder Erdhügel mit Monolith
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2);
      ctx.fill();
      // Knochenkranz
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = Math.max(1.2, r * 0.12);
      ctx.stroke();
      // Monolith im Zentrum
      ctx.fillStyle = '#475569';
      ctx.fillRect(-r * 0.25, -r * 0.35, r * 0.5, r * 0.7);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-r * 0.08, -r * 0.2, r * 0.16, r * 0.4);
      break;
    }

    case 'knochenturm': {
      // Achteckige Basis
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = Math.max(1.2, r * 0.15);
      ctx.stroke();
      // Kristallspitze
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'seelenbrunnen': {
      // Brunnenring
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
      ctx.fill();
      // Wirbelndes Zyan-Wasser
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#bae6fd';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'knochenmuehle': {
      // Mahlwerk mit 4 Knochenspeichen
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = Math.max(1.5, r * 0.15);
      const rot = (zeit || 0) * 0.0015;
      for (let i = 0; i < 4; i++) {
        const a = rot + (i * Math.PI) / 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * r * 0.75, Math.sin(a) * r * 0.75);
        ctx.stroke();
      }
      break;
    }

    case 'fleischwurz': {
      // Fleischiger Kern
      ctx.fillStyle = '#450a0a';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.75, 0, Math.PI * 2);
      ctx.fill();
      // Blutranken
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = Math.max(1.5, r * 0.18);
      for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95);
        ctx.stroke();
      }
      break;
    }

    case 'katakombe': {
      // Grufteingang
      ctx.fillStyle = '#090d16';
      ctx.fillRect(-r * 0.8, -r * 0.8, r * 1.6, r * 1.6);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = Math.max(1.2, r * 0.12);
      ctx.strokeRect(-r * 0.8, -r * 0.8, r * 1.6, r * 1.6);
      // Abstiegstreppe
      ctx.fillStyle = '#000000';
      ctx.fillRect(-r * 0.45, -r * 0.45, r * 0.9, r * 0.9);
      break;
    }

    case 'pestaltar': {
      // Altarplatte
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-r * 0.75, -r * 0.5, r * 1.5, r * 1.0);
      // Grünes Giftlicht
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'ossuarium': {
      // Knochenschrein
      ctx.fillStyle = '#334155';
      ctx.fillRect(-r * 0.85, -r * 0.85, r * 1.7, r * 1.7);
      ctx.fillStyle = '#e2e8f0';
      for (let dx = -0.5; dx <= 0.5; dx += 0.5) {
        for (let dy = -0.5; dy <= 0.5; dy += 0.5) {
          ctx.beginPath();
          ctx.arc(dx * r, dy * r, r * 0.16, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }

    case 'totenarchiv': {
      // Krypta mit Folianten
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-r * 0.4, -r * 0.25, r * 0.8, r * 0.5);
      break;
    }

    default:
      ctx.restore();
      return false;
  }

  ctx.restore();
  return true;
}
