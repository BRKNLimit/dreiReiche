# Wünsche der Grafik an Claude

Gemini trägt hier ein, was es außerhalb seiner Dateien braucht (neuer Uniform,
neuer Aufruf, andere Daten). Claude setzt es auf `main` um und hakt ab.

Format:

```
- [ ] kurz, was gebraucht wird — wofür (Datei, Funktion)
```

## Offen

- [ ] (→ Auftrag 3, Aufgabe 1) **Zweite Karte „Flusstal“** (`KARTEN.flusstal` in `src/sim/defs.js`, gewählt über `karteWaehlen()` — `KARTE` ist immer die gespielte Karte): Der Fluss sind Wasserkreise mit `fluss: true` — bitte als zusammenhängender Fluss mit Ufer zeichnen, nicht als Seenkette. `KARTE.furten` (flache Übergänge, Kies), `KARTE.wald` und `KARTE.wiesen` (Kreise `{ x, y, r }`, nur Optik: dichter Wald bzw. helle Wiese). `DEKO` (Bäume) und der Marschpfad müssen der gewählten Karte folgen — `DEKO` also als Funktion der Karte, die `ui3d.js` nach `karteWaehlen()` neu aufrufen kann (wie `baueBoden()`, das tut es schon). Skizze des Nutzers: `docs/bilder/Maps/Map1.png`.
- [ ] (→ Auftrag 3, Aufgabe 3) **Geschoss-Modelle** (optional, sonst nimmt `src/effekte.js` Pfeil/Kugel): `bolzen` (Balliste, schwerer Holzbolzen mit Eisenspitze), `dorn` (Wächterbaum, grüngoldener Dorn), `lichtpfeil` (Waldgeist, leuchtender Pfeil), `glutball` (Waldgott, glühender Ball mit Schweif). Achse wie `pfeil` (Spitze nach +z).


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


