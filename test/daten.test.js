// Prueft die Volksdateien (src/sim/voelker/*.js) gegen das, was das Spiel
// kennt: nur bekannte Felder, ganze Zahlen, Verweise auf Vorhandenes, jede
// Rolle der gemeinsamen Basis besetzt. Wer Inhalte schreibt (Gemini, Sonnet),
// bekommt hier sofort gesagt, was nicht wirken wuerde.

import test from 'node:test';
import assert from 'node:assert/strict';
import { VOELKER, FACTIONS, BUILDINGS, UNITS, SKILLS, FAEHIGKEITEN, FELDER, ROLLEN, AESTE } from '../src/sim/defs.js';

/** Felder eines Objekts gegen eine Liste pruefen. */
function nurBekannte(wo, obj, erlaubt) {
  for (const k of Object.keys(obj)) assert.ok(erlaubt.includes(k), `${wo}: Feld „${k}“ kennt das Spiel nicht (FELDER in src/sim/defs.js)`);
}
/**
 * Felder der Volks-Mechaniken (M3), fuer Gebaeude und Einheiten gleich: regeneration,
 * aura, weapon.flaeche, weapon.verlangsamt -- und fuer Gebaeude auferstehen.
 * Nullen oder Negatives taten nichts oder teilten durch null.
 */
function volksMechaniken(w, k, d) {
  if (d.regeneration !== undefined) assert.ok(d.regeneration > 0, w(`${k}.regeneration: muss eine positive Zahl sein`));
  if (d.aura) {
    nurBekannte(w(`${k}.aura`), d.aura, FELDER.aura);
    assert.ok(FELDER.auraArt.includes(d.aura.art), w(`${k}.aura.art: „${d.aura.art}“ ist keins von ${FELDER.auraArt}`));
    assert.ok(d.aura.wert > 0 && d.aura.radius > 0, w(`${k}.aura: wert und radius müssen positive Zahlen sein`));
  }
  if (d.weapon?.flaeche) {
    nurBekannte(w(`${k}.weapon.flaeche`), d.weapon.flaeche, FELDER.flaeche);
    const f = d.weapon.flaeche;
    assert.ok(f.radius > 0 && f.anteil > 0 && f.anteil <= 1000, w(`${k}.weapon.flaeche: radius > 0 und anteil 1..1000 Promille`));
  }
  if (d.weapon?.verlangsamt) {
    nurBekannte(w(`${k}.weapon.verlangsamt`), d.weapon.verlangsamt, FELDER.verlangsamt);
    const v = d.weapon.verlangsamt;
    assert.ok(v.dauer > 0 && v.wert > 0 && v.wert <= 1000, w(`${k}.weapon.verlangsamt: dauer > 0 und wert 1..1000 Promille`));
  }
  if (d.auferstehen) {
    nurBekannte(w(`${k}.auferstehen`), d.auferstehen, FELDER.auferstehen);
    const a = d.auferstehen;
    assert.ok(a.alle > 0 && a.dauer >= 0, w(`${k}.auferstehen: alle muss positiv, dauer darf 0 (bleibt) sein`));
    assert.ok(UNITS[a.einheit]?.faction === d.faction, w(`${k}.auferstehen.einheit: „${a.einheit}“ ist keine eigene Einheit`));
  }
}
/** Alle Zahlen (auch verschachtelt) ganz -- die Simulation rechnet nur mit Integern. */
function ganzzahlig(wo, wert) {
  if (typeof wert === 'number') assert.ok(Number.isInteger(wert), `${wo}: ${wert} ist keine ganze Zahl`);
  else if (wert && typeof wert === 'object') for (const [k, v] of Object.entries(wert)) ganzzahlig(`${wo}.${k}`, v);
}

test('Daten: jedes Volk nur mit Feldern, die das Spiel kennt, und nur ganzen Zahlen', () => {
  for (const v of VOELKER) {
    const w = (x) => `${v.schluessel}: ${x}`;
    nurBekannte(w('volk'), v.volk, FELDER.volk);
    nurBekannte(w('growth'), v.volk.growth, FELDER.growth);
    for (const [k, b] of Object.entries(v.gebaeude)) {
      nurBekannte(w(k), b, FELDER.gebaeude);
      for (const f of ['weapon', 'buff', 'cost', 'schild', 'schlag', 'abwehr']) if (b[f]) nurBekannte(w(`${k}.${f}`), b[f], FELDER[f]);
      // Ein Schild ohne eines seiner drei Felder tut nichts oder teilt durch null
      if (b.schild) for (const f of FELDER.schild) assert.ok(b.schild[f] > 0, w(`${k}.schild.${f}: muss eine positive Zahl sein`));
      // Fernschlag und Abwehr: alle Zahlen positiv (flug 0 schluege im selben Tick ein); kosten wie cost
      if (b.schlag) {
        for (const f of FELDER.schlag) if (f !== 'kosten') assert.ok(b.schlag[f] > 0, w(`${k}.schlag.${f}: muss eine positive Zahl sein`));
        assert.ok(b.schlag.kosten && typeof b.schlag.kosten === 'object', w(`${k}.schlag.kosten: fehlt (wie cost, auch { fron: 0 })`));
        nurBekannte(w(`${k}.schlag.kosten`), b.schlag.kosten, FELDER.cost);
      }
      if (b.abwehr) for (const f of FELDER.abwehr) assert.ok(b.abwehr[f] > 0, w(`${k}.abwehr.${f}: muss eine positive Zahl sein`));
      if (b.weapon?.ziele) assert.ok(FELDER.weaponZiele.includes(b.weapon.ziele), w(`${k}.weapon.ziele: „${b.weapon.ziele}“ ist keins von ${FELDER.weaponZiele}`));
      volksMechaniken(w, k, b);
      ganzzahlig(w(k), b);
    }
    for (const [k, u] of Object.entries(v.einheiten)) {
      nurBekannte(w(k), u, FELDER.einheit);
      for (const f of ['weapon', 'build', 'cost']) if (u[f]) nurBekannte(w(`${k}.${f}`), u[f], FELDER[f]);
      if (u.weapon?.ziele) assert.ok(FELDER.weaponZiele.includes(u.weapon.ziele), w(`${k}.weapon.ziele: „${u.weapon.ziele}“ ist keins von ${FELDER.weaponZiele}`));
      // hoechstens 0 sperrte die Einheit fuer immer
      if (u.hoechstens !== undefined) assert.ok(u.hoechstens > 0, w(`${k}.hoechstens: muss eine positive Zahl sein`));
      volksMechaniken(w, k, u);
      ganzzahlig(w(k), u);
    }
    for (const [k, s] of Object.entries(v.skills)) {
      nurBekannte(w(`Skill ${k}`), s, FELDER.skill);
      if (s.wirkung) {
        nurBekannte(w(`Skill ${k}.wirkung`), s.wirkung, FELDER.wirkung);
        for (const [art, wert] of Object.entries(s.wirkung)) assert.ok(wert > 0, w(`Skill ${k}.wirkung.${art}: muss eine positive Zahl sein`));
      }
      // nur (M6): eine Liste, und ohne Wirkung wuerde sie nichts einschraenken
      if (s.nur !== undefined) {
        assert.ok(Array.isArray(s.nur) && s.nur.length > 0, w(`Skill ${k}.nur: muss eine nichtleere Liste von Typen sein`));
        assert.ok(s.wirkung, w(`Skill ${k}.nur: ohne wirkung gibt es nichts zu beschraenken`));
      }
      assert.ok(AESTE[s.ast], w(`Skill ${k}: unbekannter Ast ${s.ast}`));
      ganzzahlig(w(`Skill ${k}`), s);
    }
    for (const [k, f] of Object.entries(v.faehigkeiten)) {
      nurBekannte(w(`Fähigkeit ${k}`), f, FELDER.faehigkeit);
      assert.ok(FELDER.faehigkeitArt.includes(f.art), w(`Fähigkeit ${k}: unbekannte Art ${f.art}`));
      ganzzahlig(w(`Fähigkeit ${k}`), f);
    }
  }
});

test('Daten: keine Namen doppelt -- sonst ueberschreibt ein Volk still das andere', () => {
  for (const teil of ['gebaeude', 'einheiten', 'skills', 'faehigkeiten']) {
    const gesehen = new Map();
    for (const v of VOELKER) {
      for (const k of Object.keys(v[teil])) {
        assert.ok(!gesehen.has(k), `${teil} „${k}“ gibt es bei ${gesehen.get(k)} und ${v.schluessel}`);
        gesehen.set(k, v.schluessel);
      }
    }
  }
  // Gebaeude und Einheiten teilen sich Modelle und Icons: auch dort keine Dopplung
  for (const k of Object.keys(BUILDINGS)) assert.ok(!UNITS[k], `„${k}“ ist Gebaeude und Einheit zugleich`);
});

test('Daten: jedes Volk besetzt alle Rollen der Basis mit Eigenem', () => {
  for (const v of VOELKER) {
    const f = v.schluessel;
    const eigen = (art, typ) => (art === 'gebaeude' ? BUILDINGS : UNITS)[typ]?.faction === f;
    for (const r of ROLLEN.gebaeude) assert.ok(eigen('gebaeude', v.rollen[r]), `${f}: Rolle ${r} braucht ein eigenes Gebaeude`);
    for (const r of ROLLEN.einheit) assert.ok(eigen('einheit', v.rollen[r]), `${f}: Rolle ${r} braucht eine eigene Einheit`);
    for (const [r, typ] of Object.entries(v.rollen)) {
      const art = ROLLEN.gebaeude.includes(r) ? 'gebaeude' : ROLLEN.einheit.includes(r) ? 'einheit' : ROLLEN.frei[r];
      assert.ok(art, `${f}: unbekannte Rolle ${r}`);
      assert.ok(eigen(art, typ), `${f}: Rolle ${r} -> ${typ} ist kein eigenes ${art === 'gebaeude' ? 'Gebaeude' : 'Einheit'}`);
    }
  }
});

test('Daten: alle Verweise zeigen auf Eigenes, das es gibt', () => {
  for (const v of VOELKER) {
    const f = v.schluessel;
    const vk = v.volk;
    assert.ok(BUILDINGS[vk.haupt]?.faction === f && BUILDINGS[vk.haupt].vital, `${f}: haupt muss ein eigenes vitales Gebaeude sein`);
    assert.ok(UNITS[vk.kommandant]?.faction === f && UNITS[vk.kommandant].commander, `${f}: kommandant muss eine eigene Kommandanten-Einheit sein`);
    for (const b of vk.bauten) assert.ok(BUILDINGS[b]?.faction === f && !BUILDINGS[b].vital, `${f}: Bauleiste ${b}`);
    for (const id of vk.faehigkeiten) assert.ok(FAEHIGKEITEN[id], `${f}: Fähigkeit ${id} fehlt`);
    for (const id of v.lernen) assert.ok(SKILLS[id]?.faction === f, `${f}: lernen ${id}`);
    for (const [k, b] of Object.entries(v.gebaeude)) {
      assert.equal(b.faction, f, `${k}: faction`);
      for (const u of b.buildList || []) assert.ok(UNITS[u]?.faction === f, `${k}: buildList ${u}`);
    }
    for (const [k, u] of Object.entries(v.einheiten)) assert.equal(u.faction, f, `${k}: faction`);
    for (const [k, s] of Object.entries(v.skills)) {
      assert.equal(s.faction, f, `Skill ${k}: faction`);
      for (const b of s.braucht || []) assert.ok(SKILLS[b]?.faction === f, `Skill ${k}: braucht ${b}`);
      for (const t of s.frei || []) assert.ok((UNITS[t] || BUILDINGS[t])?.faction === f, `Skill ${k}: frei ${t}`);
      for (const t of s.nur || []) assert.ok((UNITS[t] || BUILDINGS[t])?.faction === f, `Skill ${k}: nur ${t} ist kein eigener Typ`);
      if (s.faehigkeit) assert.ok(vk.faehigkeiten.includes(s.faehigkeit), `Skill ${k}: Fähigkeit ${s.faehigkeit}`);
    }
    for (const [k, fh] of Object.entries(v.faehigkeiten)) if (fh.einheit) assert.ok(UNITS[fh.einheit], `Fähigkeit ${k}: Einheit ${fh.einheit}`);
    // Jede Einheit muss irgendwo entstehen koennen (Fabrik, Kommandant oder Faehigkeit)
    const entsteht = new Set([
      vk.kommandant,
      ...Object.values(v.gebaeude).flatMap((b) => b.buildList || []),
      ...Object.values(v.faehigkeiten).map((x) => x.einheit),
      ...Object.values(v.gebaeude).map((b) => b.auferstehen?.einheit), // steht aus den Gefallenen auf (M3)
    ]);
    for (const k of Object.keys(v.einheiten)) assert.ok(entsteht.has(k), `${f}: ${k} entsteht nirgends`);
  }
  assert.deepEqual(Object.keys(FACTIONS), VOELKER.map((v) => v.schluessel));
});
