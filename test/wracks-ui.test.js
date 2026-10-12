// R1 Wracks und Bergung, Oberflaechen-Helfer (src/ui-gemeinsam.js): was unter der
// Maus liegt, die Infokarte, wer bergen kann, Sicht mit und ohne Nebel,
// Mitmachen. Die Zeichnung selbst prueft nur der Rauchtest.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, step, issue, spawnUnit } from '../src/sim/sim.js';
import {
  mitmachen, bergerVon, wracksSichtbar, wrackJetzt, wrackGroesse, wrackKarte, neuerNebel, nebelAktualisieren, wrackBei,
} from '../src/ui-gemeinsam.js';

const leer = () => createWorld({ empty: true, factions: ['mensch', 'gott'] });
/** Ein Wrack von 31 Masse (ein gefallener Soldat des Gegners). */
function wrackAn(w, x, y) {
  const s = spawnUnit(w, 1, 'soldat', x, y);
  s.dead = true;
  step(w);
  return w.wracks[w.wracks.length - 1];
}

test('Oberflaeche: Wrack unter der Maus, Infokarte, Berger der Auswahl, Sicht mit und ohne Nebel', () => {
  const w = leer();
  const k = wrackAn(w, 4000, 4000);
  const bauer = spawnUnit(w, 0, 'bauer', 3000, 3000);
  const soldat = spawnUnit(w, 0, 'soldat', 3100, 3000);
  assert.deepEqual(bergerVon(w, [bauer.id, soldat.id], 0), [bauer.id], 'nur wer bergen kann');
  assert.deepEqual(bergerVon(w, [bauer.id], 1), [], 'nicht fuer einen fremden Sitz');
  // ohne Nebel (Beobachter): alle Wracks, auch ungesehene
  const frei = neuerNebel(false, 0);
  assert.deepEqual(wracksSichtbar(frei, w), w.wracks);
  assert.equal(wrackBei(frei, w, 4010, 4010, 0).id, k.id);
  assert.equal(wrackBei(frei, w, 4600, 4000, 0), null, 'daneben');
  // mit Nebel: erst, wenn die Kunde es gesehen hat
  const nebel = neuerNebel(true, 0);
  nebelAktualisieren(nebel, w);
  assert.equal(wracksSichtbar(nebel, w).length, 0);
  assert.equal(wrackBei(nebel, w, 4000, 4000, 0), null);
  bauer.x = 3700;
  bauer.y = 4000;
  step(w);
  nebelAktualisieren(nebel, w);
  assert.equal(wracksSichtbar(nebel, w).length, 1);
  assert.ok(wrackJetzt(nebel, wracksSichtbar(nebel, w)[0]));
  bauer.x = 2000;
  bauer.y = 2000;
  step(w);
  nebelAktualisieren(nebel, w);
  assert.equal(wracksSichtbar(nebel, w).length, 1, 'in Erinnerung');
  assert.ok(!wrackJetzt(nebel, wracksSichtbar(nebel, w)[0]));
  // Infokarte
  const karte = wrackKarte(w, k, [bauer.id], true);
  assert.ok(karte.includes('Wrack — 31 Masse') && karte.includes('Soldat') && karte.includes('1 Berger'));
  const ohne = wrackKarte(w, k, [], false);
  assert.ok(ohne.includes('Erbauer wählen') && ohne.includes('zuletzt gesehen'));
  assert.ok(wrackGroesse({ masse: 31 }) < wrackGroesse({ masse: 500 }), 'waechst mit der Masse');
});

test('Oberflaeche: Rechtsklick auf eine bergende Einheit schliesst sich ihrem Wrack an (mitmachen)', () => {
  const w = leer();
  const k1 = wrackAn(w, 4300, 4000);
  const k2 = wrackAn(w, 4600, 4300);
  const a = spawnUnit(w, 0, 'bauer', 4000, 4000);
  const b = spawnUnit(w, 0, 'bauer', 3900, 4000);
  const s = spawnUnit(w, 0, 'soldat', 3900, 4100);
  issue(w, { type: 'bergen', player: 0, ids: [a.id], id: k1.id });
  issue(w, { type: 'bergen', player: 0, ids: [a.id], id: k2.id, anhaengen: true });
  step(w);
  mitmachen(w, 0, [b.id, s.id], a, false);
  step(w);
  assert.deepEqual([b.auftrag, b.reihe], [k1.id, [k2.id]], 'der zweite Bauer birgt dieselbe Reihe');
  assert.deepEqual([s.tx, s.ty], [4300, 4000], 'der Soldat kann nicht bergen und geht hin');
});
