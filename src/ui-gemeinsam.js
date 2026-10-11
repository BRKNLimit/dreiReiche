// Gemeinsame Texte fuer beide Oberflaechen (2D und 3D). Liest den Zustand,
// aendert ihn nie. tools/bundle.mjs fuegt diese Datei vor ui.js bzw. ui3d.js ein.

import { BUILDINGS, UNITS, FACTIONS, RULES, SKILLS, AESTE, FAEHIGKEITEN } from './sim/defs.js';
import { erfahrung, skillFrei, kannLernen, faehigkeitVon, gesperrt } from './sim/sim.js';

const prozent = (promille) => Math.round(promille / 10) + ' %';
const sekunden = (ticks) => Math.round(ticks / 10) + ' s';
const meterText = (dm) => Math.round(dm / 10) + ' m';

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

/** Alles, was man vor dem Bau eines Gebaeudes wissen muss. */
export function gebaeudeKarte(world, player, typ) {
  const d = BUILDINGS[typ];
  const z = [];
  if (!d.vital) z.push(['Kosten', kostenText(d.cost)], ['Bauzeit', sekunden(d.buildTime)]);
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
  if (d.buildList) z.push(['Bildet aus', d.buildList.map((u) => UNITS[u].name).join(', ')]);
  return karte(d.name, d.desc, z, sperrText(world, player, typ));
}

/** Alles, was man vor der Ausbildung einer Einheit wissen muss. */
export function einheitKarte(world, player, typ) {
  const d = UNITS[typ];
  const z = [];
  if (!d.commander) z.push(['Kosten', kostenText(d.cost)], ['Ausbildung', sekunden(d.buildTime)]);
  if (d.unterhalt) z.push(['Unterhalt', d.unterhalt + ' Fron/min']);
  z.push(['Leben', d.hp + ' LP']);
  if (d.weapon) {
    const w = d.weapon;
    z.push(['Schaden', `${w.damage} je Schlag, ${((w.damage * 10) / w.cooldown).toFixed(1)} pro s`]);
    z.push(['Reichweite', meterText(w.range)]);
  }
  z.push(['Tempo', tempo(d.speed)]);
  if (d.build) z.push(['Baut', d.build.power >= 1000 ? 'mit voller Kraft' : `mit ${prozent(d.build.power)} Kraft`]);
  return karte(d.name, d.desc, z, sperrText(world, player, typ));
}

/** Ausbildungsliste einer Fabrik: Taste, Name, Kosten, Zeit, Unterhalt. */
export function ausbildungHtml(world, player, typ) {
  const liste = BUILDINGS[typ].buildList;
  if (!liste) return '';
  return liste
    .map((u, i) => {
      const d = UNITS[u];
      if (gesperrt(world, player, u)) return `<div class="zeile zu"><kbd>${'QWER'[i]}</kbd> <s>${d.name}</s> — ${sperrText(world, player, u)}</div>`;
      return `<div class="zeile"><kbd>${'QWER'[i]}</kbd> <b>${d.name}</b> · ${kostenText(d.cost)} · ${sekunden(d.buildTime)} · ${d.unterhalt} Fron/min</div>`;
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
  if (e.kind === 'unit' && e.gebundenBis > world.tick) teile.push('festgehalten');
  return `<b>${def.name}</b> — ${teile.join(' · ')}`;
}

// ------------------------------------------------------------ Skillbaum

/** Was eine Faehigkeit tut, Zahlen aus den Daten. */
export function faehigkeitText(id) {
  const f = FAEHIGKEITEN[id];
  if (f.art === 'ruf') {
    return `${f.name}: Eigene Einheiten im Umkreis von ${meterText(f.radius)} teilen ${sekunden(f.dauer)} lang ${prozent(f.wert)} mehr Schaden aus. Alle ${sekunden(f.abklingen)}.`;
  }
  return `${f.name}: Feinde im Umkreis von ${meterText(f.radius)} um einen Punkt (bis ${meterText(f.reichweite)} vom Kommandanten) stehen ${sekunden(f.dauer)} lang fest. Alle ${sekunden(f.abklingen)}.`;
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
  const bis = sekunden(RULES.skillTakt - (world.tick % RULES.skillTakt));
  return `<b>Skillpunkte <kbd>T</kbd></b><span${frei > 0 ? ' class="hell"' : ''}>${frei} frei · nächster in ${bis}</span>`;
}

/** HUD-Zeile: Faehigkeit des Kommandanten, sobald gelernt. */
export function faehigkeitZeile(world, player) {
  const id = faehigkeitVon(world, player);
  if (!id) return '';
  const rest = world.players[player].faehigkeitBereit - world.tick;
  return `<b>${FAEHIGKEITEN[id].name} <kbd>F</kbd></b><span${rest <= 0 ? ' class="hell"' : ''}>${rest <= 0 ? 'bereit' : 'in ' + sekunden(rest)}</span>`;
}
