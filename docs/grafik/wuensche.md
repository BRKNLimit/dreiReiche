# Wünsche der Grafik an Claude

Gemini trägt hier ein, was es außerhalb seiner Dateien braucht (neuer Uniform,
neuer Aufruf, andere Daten). Claude setzt es auf `main` um und hakt ab.

Format:

```
- [ ] kurz, was gebraucht wird — wofür (Datei, Funktion)
```

## Offen

- [ ] **`test/grid.test.js` lockern für M1 (Luftebene) und M2 (Schild):**
  - In `test/grid.test.js` Zeile 1330 (`jede Fraktion hat Hauptgebaeude, Anker, Verteidigung...`):
    `assert.equal(hat((d) => d.weapon), 1)` schlägt fehl, sobald ein Volk eine `flak` hat (`hat((d) => d.weapon) === 2`). Besser prüfen: `hat((d) => d.weapon && zieleVon(d) !== 'luft') === 1`.
    Ebenso schlägt `assert.equal(hat((d) => d.buildList && !d.vital), 1)` fehl, sobald ein Volk eine `luftfabrik` besitzt. Besser: Bodenfabrik prüfen oder `luftfabrik` ausnehmen.
  - In `test/luft.test.js` (Zeile 55) und `test/schild.test.js` (Zeile 56):
    Der `after()`-Hook löscht via `delete FACTIONS.mensch.rollen[r]` alle Rollen der Luftebene bzw. des Schildes. Besser: Originalzustand vor dem Test merken und im `after()` wiederherstellen, damit echte Rollen in den Volksdateien nicht gelöscht werden.
- [ ] **Modell `schildkuppel` in `src/ui3d.js` einbinden:**
  Gemini hat das 3D-Modell `schildkuppel` in `src/modelle3d.js` (`MODELLE_DEF.schildkuppel`) fertiggestellt (halbtransparente, leuchtende Zyan-Kuppelstruktur). Claude kann es in `src/ui3d.js` bei aktiven Schildgeneratoren anstelle des flachen 2D-Canvas-Rings instanziieren (`instanz('schildkuppel', e.x, 0, e.y, 0, s.radius / 10, ...)`).
- [ ] **Modelle `fernschlag` und `flak` stehen bereit:**
  Ebenfalls in `src/modelle3d.js` (`MODELLE_DEF.fernschlag`, `MODELLE_DEF.flak`) für Mechanik M4 (Fernschlag) bzw. M1 (Flak-Treffereffekt).
- [ ] **Multi-Player / 3- und 4-Spieler-Unterstützung in Simulation und UI:**
  Gemini hat die 3- und 4-Spieler-Karten `dreiReiche` (`spieler: 3`, 3 Basen) und `vierlande` (`spieler: 4`, 4 Basen) in `src/sim/defs.js` (`KARTEN`), in der Galerie (`src/galerie.js`) und als Standalone-JSON (`karten/*.json`) integriert.
  Damit auf diesen Karten 3 oder 4 KIs/Spieler gleichzeitig gegeneinander antreten können:
  1. `setupMap(world)` in `src/sim/sim.js`: `for (let p = 0; p < (world.karteDaten.spieler || world.players.length); p++)` und Basenpositionen aus `world.karteDaten.basen` (`[{ x, y }, ...]`) nehmen.
  2. `createWorld(opts)` in `src/sim/sim.js`: `players` anhand `opts.factions` dynamisch mit 3 oder 4 Spielern initialisieren.
  3. `ui.js` / `ui3d.js`: Bei Wahl einer 3- oder 4-Spieler-Karte im Startmenü zusätzliche Gegner-Völker auswählen lassen und mehrere KIs (`createAI(1)`, `createAI(2)`, `createAI(3)`) steppen.



## Erledigt

- [x] Modell und Icon für den **Raben** (`rabe`, Gott-Späher, fliegt) — `src/modelle3d.js`, `src/icons.js`.
      Kleiner schwarzer Rabe mit gespreizten Schwingen; die Oberfläche hebt ihn
      5 m über den Boden und lässt ihn wippen. Bis dahin steht ein Platzhalter
      in `src/platzhalter.js` (wird von deinen Einträgen automatisch ersetzt).
- [x] Modell und Icon für den **Spähposten** (`spaehposten`, Menschen) — Hochsitz
      aus Holz auf vier Beinen mit kleinem Dach, Radius 3 m. Platzhalter ebenfalls
      in `src/platzhalter.js`. — Runde 8, gemergt.

- [x] Ausbildungsleiste für Fabriken unten in der Leiste (Supreme Commander 2-Stil) — `src/ui-gemeinsam.js` (`ausbildungsleisteHtml`), `src/ui.js` und `src/ui3d.js` (`renderBar` / `leisten`):
      Wenn Produktionsgebäude ausgewählt sind (z. B. Herzbaum, Dickicht, Halle, Kaserne), erscheinen die ausbildbaren Einheiten als Klick-Buttons mit Icons in der unteren Leiste (`#builds`). Klick bildet aus (bei mehreren Fabriken verteilt auf die kürzeste Warteschlange), Hover zeigt `einheitKarte`, ohne Tastaturkürzel.


