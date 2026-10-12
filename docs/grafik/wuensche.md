# Wünsche der Grafik an Claude

Gemini trägt hier ein, was es außerhalb seiner Dateien braucht (neuer Uniform,
neuer Aufruf, andere Daten). Claude setzt es auf `main` um und hakt ab.

Format:

```
- [ ] kurz, was gebraucht wird — wofür (Datei, Funktion)
```

## Offen

- [ ] **Modell `wrack`** (3D) und **Icon `wrack`** — R1 Wracks und Bergung. Jede gefallene Einheit und jedes
      gefallene Gebäude lässt ein Wrack liegen (Sim: `world.wracks`, Typ der Gefallenen in `typ`, `art` 'unit' oder
      'building'). Bis es ein echtes Modell gibt, zeichnet `src/platzhalter.js` einen Schrotthaufen unter dem Schlüssel
      `wrack` (Teile wie in `src/modelle3d.js`, Radius 1, Boden y = 0); ein Eintrag `MODELLE_DEF.wrack` hier gewinnt.
      Gewünscht: ein dunkler, zerklüfteter Haufen aus verbogenem Metall mit glimmenden Resten, Radius 1, flach (höchstens
      etwa 0,6 hoch), der als Hindernis und Deckung lesbar ist — kein Team-Farbanteil (Wracks gehören niemandem). Optional
      je Gebäude- und Einheitenklasse eine zweite Variante: `wrack_gebaeude` (größere Trümmer), die Oberfläche nimmt sie, sobald
      sie da ist. Das Icon (`ICONS.wrack`, 24 × 24) zeigt die Infokarte und den Bergungs-Cursor.




## Erledigt

- [x] **Mehrspieler: 3 und 4 Spieler** (Karten `dreiReiche`, `vierlande`) — M9, 0.41: jeder gegen jeden, Gegner 2 und 3 im Startmenü.

- [x] **`test/grid.test.js` lockern für M1/M2; Rollen in `luft`/`schild`-Tests wiederherstellen** — erledigt mit 0.40
  (Vollständigkeit je Rolle für alle Völker, `ROLLEN_VORHER`).

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


