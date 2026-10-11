// Gemeinsame Texte fuer beide Oberflaechen (2D und 3D). Liest den Zustand,
// aendert ihn nie. tools/bundle.mjs fuegt diese Datei vor ui.js bzw. ui3d.js ein.

import { BUILDINGS, UNITS, FACTIONS, RULES, SKILLS, AESTE, FAEHIGKEITEN } from './sim/defs.js';
import {
  erfahrung, skillFrei, kannLernen, faehigkeitenVon, faehigkeitWarten, gesperrt, forschungProTick,
  gridReport, foerderungProMin, unterhaltProMin,
} from './sim/sim.js';

const prozent = (promille) => Math.round(promille / 10) + ' %';
const sekunden = (ticks) => Math.round(ticks / 10) + ' s';
const meterText = (dm) => Math.round(dm / 10) + ' m';

// ------------------------------------------------------------ Ressourcenleiste
// Nach dem Entwurf des Nutzers: dunkle Leiste oben links, rechts rund
// auslaufend; Gluehbirne = Gegenwart (Energie), Tropfen = Goetterblut,
// gruene Kristalle = Fron (Masse).
const ICON_GEGENWART = `<svg viewBox="0 0 24 24" fill="none" stroke="#f7b55a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1.8v2M4.6 4.8l1.3 1.3M19.4 4.8l-1.3 1.3M2.2 11h2M19.8 11h2"/><path d="M8.3 16.2a6.2 6.2 0 1 1 7.4 0c-.8.6-1.1 1.3-1.1 2.1v.7H9.4v-.7c0-.8-.3-1.5-1.1-2.1z"/><path d="M9.4 19.6h5.2"/><path d="M9.9 21.6h4.2"/></svg>`;
const ICON_BLUT = `<svg viewBox="0 0 24 24"><path d="M12 2.2 6 12.6a6.9 6.9 0 1 0 12 0z" fill="#ff3434"/></svg>`;
const ICON_FRON = `<svg viewBox="0 0 24 24"><path d="M2.5 6.4 6.6 4.3l3.2 2.1-.9 5.2-4.7 1.9z" fill="#c9ffe0"/><path d="M9.8 5.1 14.6 2.2l5 1.9 1.1 5.9-4.6 3.8-5.4-2.1z" fill="#e6fff0"/><path d="M14.6 2.2l5 1.9-3.4 3.3z" fill="#7dffae"/><path d="M3.4 13.8 9.6 11.4l5.3 2.1-2.2 6.3H6z" fill="#1fd35a"/><path d="M9.6 11.4l5.3 2.1-4.1 1.6z" fill="#9dffc2"/><path d="M14.9 13.6l6-3.2 1.1 6.4-4.2 3.3h-4.1z" fill="#0fae3e"/><path d="M3.4 13.8 6 19.8H3z" fill="#078a2c"/></svg>`;

/** Ressourcenleiste: Gegenwart-Ueberschuss aller Netze, Goetterblut, Fron. */
export function ressourcenHtml(world, player) {
  const p = world.players[player];
  let angebot = 0;
  let bedarf = 0;
  for (const r of gridReport(world, player)) {
    angebot += r.supply;
    bedarf += r.demand;
  }
  const frei = angebot - bedarf;
  const plus = foerderungProMin(world, player);
  const minus = unterhaltProMin(world, player);
  const eintrag = (icon, wert, titel, klasse = '') =>
    `<div class="ri" title="${titel}">${icon}<span class="${klasse}">${wert}</span></div>`;
  return (
    eintrag(ICON_GEGENWART, frei, `Gegenwart: ${angebot} geliefert, ${bedarf} gebraucht`, frei < 0 ? 'knapp' : '') +
    eintrag(ICON_BLUT, p.goetterblut, 'Götterblut') +
    eintrag(ICON_FRON, p.fron, `Fron: +${plus} Förderung, −${minus} Unterhalt pro Minute`, plus - minus < 0 ? 'knapp' : '')
  );
}

// ------------------------------------------------------------ Info-Karten

/** Kosten als Text: "120 Fron" oder "130 Fron + 10 Götterblut". */
export function kostenText(cost) {
  return cost.fron + ' Fron' + (cost.goetterblut ? ` + ${cost.goetterblut} Götterblut` : '');
}

const tempo = (v) => (v >= 32 ? 'sehr schnell' : v >= 28 ? 'schnell' : v >= 24 ? 'mittel' : v >= 20 ? 'gemächlich' : 'langsam');

/** Gesperrt? Dann der Hinweis, welcher Skill es freischaltet. */
function sperrText(world, player, typ) {
  if (!gesperrt(world, player, typ)) return '';
  const f = world.players[player].faction;
  const namen = Object.values(SKILLS)
    .filter((s) => s.faction === f && s.frei && s.frei.includes(typ))
    .map((s) => s.name);
  return 'Gesperrt — im Skillbaum (T): ' + namen.join(' oder ');
}

function karte(titel, desc, zeilen, sperre) {
  return `<div class="karte"><b>${titel}</b><i>${desc || ''}</i>${sperre ? `<div class="sperre">${sperre}</div>` : ''}
    <div class="kz">${zeilen.map(([a, b]) => `<span>${a}</span><span>${b}</span>`).join('')}</div></div>`;
}

/** Waffe einer Einheit oder eines Gebaeudes: Kampfart, Schaden, Reichweite. */
function waffeZeilen(d) {
  const w = d.weapon;
  const fern = d.kampf === 'fern';
  return [
    ['Kampf', fern ? 'Fernkampf' : 'Nahkampf'],
    ['Schaden', `${w.damage} je ${fern ? 'Schuss' : 'Schlag'}, ${((w.damage * 10) / w.cooldown).toFixed(1)} pro s`],
    ['Reichweite', fern ? meterText(w.range) : 'Berührung'],
  ];
}

/** Alles, was man vor dem Bau eines Gebaeudes wissen muss. */
export function gebaeudeKarte(world, player, typ) {
  const d = BUILDINGS[typ];
  const z = [];
  if (!d.vital) {
    // Gebaut wird nur von Erbauern: Bauzeit fuer den Kommandanten und einen Arbeiter allein.
    const kdt = UNITS[FACTIONS[d.faction].kommandant];
    const arb = Object.values(UNITS).find((u) => u.faction === d.faction && u.worker);
    const dauer = (u) => `${u.name} ${sekunden(Math.ceil((d.buildTime * 1000) / u.build.power))}`;
    z.push(['Kosten', kostenText(d.cost)], ['Bauzeit', `${dauer(kdt)} · ${dauer(arb)} (allein)`]);
  }
  z.push(['Leben', d.hp + ' LP']);
  if (d.gegenwartIn) z.push(['Gegenwart', 'braucht ' + d.gegenwartIn]);
  if (d.gegenwartOut) z.push(['Gegenwart', 'liefert ' + d.gegenwartOut]);
  if (d.anchor) {
    const g = FACTIONS[d.faction].growth;
    const start = Math.max(d.anchorMin || 0, g.start);
    z.push(['Domäne', g.perTick && g.max > start ? `${meterText(start)}, wächst bis ${meterText(g.max)}` : meterText(start)]);
  }
  if (d.fronOut) z.push(['Förderung', d.fronOut + ' Fron/min']);
  if (d.blutOut) z.push(['Förderung', d.blutOut + ' Götterblut/min']);
  if (d.needs) z.push(['Standort', d.needs === 'fron' ? 'auf einem Steinvorkommen' : 'auf einer Götterblut-Ader']);
  if (d.needsGrowth) z.push(['Standort', 'nur auf ungerodetem Boden']);
  if (d.clears) z.push(['Rodet', meterText(d.clears) + ' ringsum']);
  if (d.buff) {
    const was = d.buff.zorn ? `+${prozent(d.buff.zorn)} Schaden` : `−${prozent(d.buff.wehr)} genommener Schaden`;
    z.push(['Wirkung', `${was} im Umkreis von ${meterText(d.buff.radius)}`]);
  }
  if (d.weapon) z.push(...waffeZeilen(d));
  if (d.forschung) z.push(['Forschung', `Skillpunkte ${prozent(d.forschung)} schneller`]);
  if (d.buildList) z.push(['Bildet aus', d.buildList.map((u) => `${UNITS[u].name} (${UNITS[u].kampf === 'fern' ? 'fern' : 'nah'})`).join(', ')]);
  return karte(d.name, d.desc, z, sperrText(world, player, typ));
}

/** Alles, was man vor der Ausbildung einer Einheit wissen muss. */
export function einheitKarte(world, player, typ) {
  const d = UNITS[typ];
  const z = [];
  if (!d.commander) z.push(['Kosten', kostenText(d.cost)], ['Ausbildung', sekunden(d.buildTime)]);
  if (d.unterhalt) z.push(['Unterhalt', d.unterhalt + ' Fron/min']);
  z.push(['Leben', d.hp + ' LP']);
  if (d.weapon) z.push(...waffeZeilen(d));
  z.push(['Tempo', tempo(d.speed)]);
  if (d.build) z.push(['Baut', d.build.power >= 1000 ? 'mit voller Kraft' : `mit ${prozent(d.build.power)} Kraft`]);
  return karte(d.name, d.desc, z, sperrText(world, player, typ));
}

/**
 * Zustand einer Baustelle: Fortschritt und wer daran arbeitet. Ohne Erbauer
 * geht nichts voran -- dann der Hinweis, wie man einen schickt.
 */
export function baustelleText(world, e) {
  const pct = Math.min(100, Math.floor(e.progress / (BUILDINGS[e.type].buildTime * 10)));
  let am = 0;
  let weg = 0;
  for (const u of world.entities) {
    if (u.dead || u.kind !== 'unit' || u.auftrag !== e.id) continue;
    if (u.baut === e.id) am++;
    else weg++;
  }
  const wer = am
    ? `${am} Erbauer ${am === 1 ? 'baut' : 'bauen'}${weg ? `, ${weg} unterwegs` : ''}`
    : weg
      ? `${weg} Erbauer unterwegs`
      : '<span class="warn">wartet auf Erbauer — Erbauer wählen, Rechtsklick auf die Baustelle</span>';
  return `Baustelle ${pct} % · ${wer}`;
}

/** Beschaedigtes Gebaeude: wird es repariert, oder wie schickt man jemanden? Leer, wenn heil. */
export function reparaturText(world, e) {
  if (!e.done || e.hp >= e.maxHp) return '';
  let am = 0;
  for (const u of world.entities) if (!u.dead && u.kind === 'unit' && u.auftrag === e.id && u.baut === e.id) am++;
  if (am) return ` · ${am} Erbauer reparier${am === 1 ? 't' : 'en'}`;
  return ' · <span class="warn">beschädigt — Erbauer wählen, Rechtsklick repariert</span>';
}

/** Ausbildungsliste einer Fabrik: Taste, Name, Kosten, Zeit, Unterhalt. */
export function ausbildungHtml(world, player, typ) {
  const liste = BUILDINGS[typ].buildList;
  if (!liste) return '';
  return liste
    .map((u, i) => {
      const d = UNITS[u];
      if (gesperrt(world, player, u)) return `<div class="zeile zu"><kbd>${'QWER'[i]}</kbd> <s>${d.name}</s> — ${sperrText(world, player, u)}</div>`;
      return `<div class="zeile"><kbd>${'QWER'[i]}</kbd> <b>${d.name}</b> (${d.kampf === 'fern' ? 'Fernkampf' : 'Nahkampf'}) · ${kostenText(d.cost)} · ${sekunden(d.buildTime)} · ${d.unterhalt} Fron/min</div>`;
    })
    .join('');
}

/** Erfahrung als kurzer Text, leer ohne Erfahrung. */
export function erfahrungText(world, e) {
  const erf = erfahrung(world, e);
  return erf ? `Erfahrung +${prozent(erf)}` : '';
}

/** Kopfzeile einer einzelnen Auswahl: Name, Leben, Erfahrung. */
export function auswahlKopf(world, e) {
  const def = e.kind === 'unit' ? UNITS[e.type] : BUILDINGS[e.type];
  const teile = [`${e.hp}/${e.maxHp} LP`];
  const erf = erfahrungText(world, e);
  if (erf) teile.push(erf);
  if (e.kind === 'unit' && e.rufBis > world.tick) teile.push('Schlachtruf');
  if (e.kind === 'unit' && e.wehrBis > world.tick) teile.push('Schildwall');
  if (e.kind === 'unit' && e.tempoBis > world.tick) teile.push('Ansturm');
  if (e.kind === 'unit' && e.beschworen) teile.push(`vergeht in ${sekunden(e.vergehtBei - world.tick)}`);
  if (e.kind === 'unit' && e.gebundenBis > world.tick) teile.push('festgehalten');
  return `<b>${def.name}</b> — ${teile.join(' · ')}`;
}

// ------------------------------------------------------------ Skillbaum

/** Was eine Faehigkeit tut, Zahlen aus den Daten. */
export function faehigkeitText(id) {
  const f = FAEHIGKEITEN[id];
  const um = `Eigene Einheiten im Umkreis von ${meterText(f.radius)}`;
  const was = {
    ruf: () => `${um} teilen ${sekunden(f.dauer)} lang ${prozent(f.wert)} mehr Schaden aus.`,
    wehr: () => `${um} nehmen ${sekunden(f.dauer)} lang ${prozent(f.wert)} weniger Schaden.`,
    tempo: () => `${um} laufen ${sekunden(f.dauer)} lang ${prozent(f.wert)} schneller.`,
    heilung: () => `${um} bekommen sofort ${f.wert} LP zurück.`,
    griff: () => `Feinde im Umkreis von ${meterText(f.radius)} um einen Punkt (bis ${meterText(f.reichweite)} vom Kommandanten) stehen ${sekunden(f.dauer)} lang fest.`,
    rufen: () => `${f.anzahl} ${UNITS[f.einheit].name === 'Wolf' ? 'Wölfe' : UNITS[f.einheit].name} erscheinen für ${sekunden(f.dauer)}, ohne Unterhalt.`,
  }[f.art]();
  return `${f.name}: ${was} Alle ${sekunden(f.abklingen)}.`;
}

/**
 * Knoepfe fuer die drei Faehigkeiten des Kommandanten: Taste, Name und
 * Zustand (bereit, Abklingzeit oder noch im Skillbaum gesperrt).
 */
export function faehigkeitenHtml(world, player) {
  const ids = FACTIONS[world.players[player].faction].faehigkeiten;
  const gelernt = faehigkeitenVon(world, player);
  return ids
    .map((id, i) => {
      const f = FAEHIGKEITEN[id];
      const kann = gelernt.includes(id);
      const warten = kann ? faehigkeitWarten(world, player, id) : 0;
      const zustand = !kann ? 'Skillbaum' : warten ? sekunden(warten) : 'bereit';
      const klasse = !kann ? 'zu' : warten ? 'wartet' : 'bereit';
      return `<button class="faeh ${klasse}" data-faeh="${id}" title="${faehigkeitText(id)}"${kann && !warten ? '' : ' disabled'}>
        <kbd>${'QWE'[i]}</kbd> ${f.name}<small>${zustand}</small></button>`;
    })
    .join('');
}

/** Was ein Skill bewirkt, Zahlen aus den Daten. */
export function skillWirkung(sk) {
  const teile = [];
  if (sk.frei) teile.push('Schaltet frei: ' + sk.frei.map((t) => (UNITS[t] || BUILDINGS[t]).name).join(', '));
  const w = sk.wirkung || {};
  if (w.schaden) teile.push(`+${prozent(w.schaden)} Schaden aller Einheiten`);
  if (w.schutz) teile.push(`−${prozent(w.schutz)} genommener Schaden aller Einheiten`);
  if (w.kdtSchutz) teile.push(`−${prozent(w.kdtSchutz)} genommener Schaden des Kommandanten`);
  if (w.foerderung) teile.push(`+${prozent(w.foerderung)} Förderung`);
  if (w.ausbildung) teile.push(`${prozent(w.ausbildung)} schnellere Ausbildung`);
  if (w.unterhalt) teile.push(`−${prozent(w.unterhalt)} Unterhalt`);
  if (sk.faehigkeit) teile.push(faehigkeitText(sk.faehigkeit));
  return teile.join(' · ');
}

/** Aendert sich, sobald sich am Skillbaum etwas aendert -- dann neu zeichnen. */
export function skillSignatur(world, player) {
  return world.players[player].gelernt.join() + '|' + skillFrei(world, player);
}

/** Der Skillbaum eines Spielers: vier Aeste, jeder Skill ein Knopf. */
export function skillBaumHtml(world, player) {
  const pl = world.players[player];
  const frei = skillFrei(world, player);
  const spalten = Object.entries(AESTE)
    .map(([ast, titel]) => {
      const karten = Object.entries(SKILLS)
        .filter(([, sk]) => sk.faction === pl.faction && sk.ast === ast)
        .map(([id, sk]) => {
          const gelernt = pl.gelernt.includes(id);
          const kann = kannLernen(world, player, id);
          const fehlt = (sk.braucht || []).filter((b) => !pl.gelernt.includes(b)).map((b) => SKILLS[b].name);
          const fuss = gelernt
            ? 'gelernt'
            : (fehlt.length ? 'braucht ' + fehlt.join(', ') + ' · ' : '') + `${sk.kosten} Punkt${sk.kosten > 1 ? 'e' : ''}`;
          return `<button class="skill ${gelernt ? 'gelernt' : kann ? 'kann' : 'zu'}" data-skill="${id}"${kann ? '' : ' disabled'}>
            <b>${sk.name}</b><span class="sw">${skillWirkung(sk)}</span><i>${sk.desc}</i><span class="sk">${fuss}</span></button>`;
        })
        .join('');
      return `<div class="ast"><h3>${titel}</h3>${karten}</div>`;
    })
    .join('');
  const takt = Math.round(RULES.skillTakt / 600);
  return `<div class="skopf"><b>Skillbaum</b> — ${frei} Punkt${frei === 1 ? '' : 'e'} frei, alle ${takt} min ein neuer · Klick lernt · <kbd>T</kbd> schließt</div>
    <div class="aeste">${spalten}</div>`;
}

/** HUD-Zeile: freie Skillpunkte und Zeit bis zum naechsten. */
export function skillZeile(world, player) {
  if (!RULES.skills) return '';
  const frei = skillFrei(world, player);
  const je = RULES.skillTakt * 1000;
  const bis = sekunden(Math.ceil((je - (world.players[player].forschung % je)) / forschungProTick(world, player)));
  return `<b>Skillpunkte <kbd>T</kbd></b><span${frei > 0 ? ' class="hell"' : ''}>${frei} frei · nächster in ${bis}</span>`;
}

/** Farbe einer Faehigkeit fuer Ringe und Markierungen. */
export function faehigkeitFarbe(art) {
  return { ruf: '#f5b23c', wehr: '#8ab4ff', tempo: '#e8f0d8', heilung: '#7ddc7a', griff: '#9a7a4a', rufen: '#c9a0e0' }[art];
}
