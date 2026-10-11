import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step, hash, issue } from '../src/sim/sim.js';
import { neuerGleichschritt, gsSenden, gsBereit, gsEmpfangen, gsEinsetzen, gsNachSchritt } from '../src/netz.js';

/** Zwei Spieler ueber ein simuliertes Netz mit zufaelliger Verzoegerung (in Bildern). */
function partie({ ticks, maxVerzoegerung, stoerung = null }) {
  let zufall = 12345;
  const wuerfel = (n) => {
    zufall = (zufall * 1103515245 + 12345) & 0x7fffffff;
    return zufall % n;
  };
  const config = { seed: 99, factions: ['mensch', 'gott'], karte: 'klassisch' };
  const seiten = [0, 1].map((ich) => ({
    ich,
    world: createWorld(config),
    gs: neuerGleichschritt(ich),
    post: [], // ankommende Nachrichten: [Bild, msg]
    gewartet: 0,
  }));
  let bild = 0;
  const senden = (von) => (msg) => seiten[1 - von].post.push([bild + wuerfel(maxVerzoegerung + 1), JSON.parse(JSON.stringify(msg))]);
  while (seiten.some((s) => s.world.tick < ticks)) {
    bild++;
    for (const s of seiten) {
      // Post zustellen, was faellig ist (in Reihenfolge des Eingangs, wie ein geordneter Kanal)
      while (s.post.length && s.post[0][0] <= bild) gsEmpfangen(s.gs, s.post.shift()[1]);
      if (s.world.tick >= ticks) continue;
      // Ab und zu ein Befehl des Spielers: Einheiten irgendwohin schicken
      if (wuerfel(7) === 0) {
        const eigene = s.world.entities.filter((e) => e.player === s.ich && e.kind === 'unit');
        if (eigene.length) issue(s.world, { type: 'move', player: s.ich, ids: [eigene[wuerfel(eigene.length)].id], x: 2000 + wuerfel(16000), y: 2000 + wuerfel(16000) });
      }
      if (wuerfel(40) === 0) {
        const kdt = s.world.entities.find((e) => e.player === s.ich && (e.type === 'held' || e.type === 'waldgott'));
        const typ = s.ich === 0 ? 'grenzstein' : 'hain';
        if (kdt) issue(s.world, { type: 'build', player: s.ich, ids: [kdt.id], building: typ, x: kdt.x + 600 - wuerfel(1200), y: kdt.y + 600 - wuerfel(1200) });
      }
      // Ein Tick je Bild, wenn moeglich
      gsSenden(s.gs, s.world, senden(s.ich));
      if (!gsBereit(s.gs, s.world.tick)) {
        s.gewartet++;
        continue;
      }
      const offen = gsEinsetzen(s.gs, s.world);
      step(s.world);
      if (stoerung && s.ich === 1 && s.world.tick === stoerung) s.world.players[1].fron += 1; // absichtlich verstimmt
      gsNachSchritt(s.gs, s.world, offen, senden(s.ich));
    }
    if (bild > ticks * 20) throw new Error('haengt');
  }
  // Restliche Post zustellen (Pruefsummen)
  for (const s of seiten) while (s.post.length) gsEmpfangen(s.gs, s.post.shift()[1]);
  return seiten;
}

test('Online: zwei Seiten mit wackeligem Netz bleiben bitgleich', () => {
  const [a, b] = partie({ ticks: 2500, maxVerzoegerung: 4 });
  assert.equal(a.world.tick, 2500);
  assert.equal(hash(a.world), hash(b.world));
  assert.equal(a.gs.asynchron, -1);
  assert.equal(b.gs.asynchron, -1);
  // Es wurde wirklich gespielt, und beide haben auf einander gewartet
  assert.ok(a.world.entities.length > 4 && b.world.plaene.length + b.world.entities.length > 4);
  assert.ok(a.gewartet + b.gewartet > 0, 'bei Verzoegerung muss jemand warten');
});

test('Online: eine verstimmte Welt wird an der Pruefsumme erkannt', () => {
  const [a, b] = partie({ ticks: 600, maxVerzoegerung: 1, stoerung: 150 });
  assert.equal(a.gs.asynchron, 200);
  assert.equal(b.gs.asynchron, 200);
});
