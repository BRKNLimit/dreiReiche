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




## Erledigt

- [x] **Modelle `schildkuppel`, `fernschlag`, `flak` eingebunden (M8)** — `src/ui3d.js` (`zeichneEffektModelle`), `src/effekte.js`:
      `schildkuppel` als durchsichtige Kuppel über eigenen (und gewählten fremden) Schildgebäuden, Größe nach `schild.radius`,
      Deckkraft nach Ladung (der Bodenring bleibt nur für gewählte Gebäude); `fernschlag` fliegt im Bogen vom Gebäude zum Ziel
      und kommt zum Einschlagtick an (für alle sichtbar); `flak` als Splitterwolke an jedem Flieger, den eine Waffe mit
      `ziele: 'luft'` trifft. Das Modell `fernschlag` zeigt mit +z nach vorn und wird nur um die Hochachse gedreht (kein Nicken).

- [x] Modell und Icon für den **Raben** (`rabe`, Gott-Späher, fliegt) — `src/modelle3d.js`, `src/icons.js`.
      Kleiner schwarzer Rabe mit gespreizten Schwingen; die Oberfläche hebt ihn
      5 m über den Boden und lässt ihn wippen. Bis dahin steht ein Platzhalter
      in `src/platzhalter.js` (wird von deinen Einträgen automatisch ersetzt).
- [x] Modell und Icon für den **Spähposten** (`spaehposten`, Menschen) — Hochsitz
      aus Holz auf vier Beinen mit kleinem Dach, Radius 3 m. Platzhalter ebenfalls
      in `src/platzhalter.js`. — Runde 8, gemergt.

- [x] Ausbildungsleiste für Fabriken unten in der Leiste (Supreme Commander 2-Stil) — `src/ui-gemeinsam.js` (`ausbildungsleisteHtml`), `src/ui.js` und `src/ui3d.js` (`renderBar` / `leisten`):
      Wenn Produktionsgebäude ausgewählt sind (z. B. Herzbaum, Dickicht, Halle, Kaserne), erscheinen die ausbildbaren Einheiten als Klick-Buttons mit Icons in der unteren Leiste (`#builds`). Klick bildet aus (bei mehreren Fabriken verteilt auf die kürzeste Warteschlange), Hover zeigt `einheitKarte`, ohne Tastaturkürzel.


