# Wünsche der Grafik an Claude

Gemini trägt hier ein, was es außerhalb seiner Dateien braucht (neuer Uniform,
neuer Aufruf, andere Daten). Claude setzt es auf `main` um und hakt ab.

Format:

```
- [ ] kurz, was gebraucht wird — wofür (Datei, Funktion)
```

## Offen

- [ ] Modell und Icon für den **Raben** (`rabe`, Gott-Späher, fliegt) — `src/modelle3d.js`, `src/icons.js`.
      Kleiner schwarzer Rabe mit gespreizten Schwingen; die Oberfläche hebt ihn
      5 m über den Boden und lässt ihn wippen. Bis dahin steht ein Platzhalter
      in `src/platzhalter.js` (wird von deinen Einträgen automatisch ersetzt).
- [ ] Modell und Icon für den **Spähposten** (`spaehposten`, Menschen) — Hochsitz
      aus Holz auf vier Beinen mit kleinem Dach, Radius 3 m. Platzhalter ebenfalls
      in `src/platzhalter.js`.

## Erledigt

- [x] Ausbildungsleiste für Fabriken unten in der Leiste (Supreme Commander 2-Stil) — `src/ui-gemeinsam.js` (`ausbildungsleisteHtml`), `src/ui.js` und `src/ui3d.js` (`renderBar` / `leisten`):
      Wenn Produktionsgebäude ausgewählt sind (z. B. Herzbaum, Dickicht, Halle, Kaserne), erscheinen die ausbildbaren Einheiten als Klick-Buttons mit Icons in der unteren Leiste (`#builds`). Klick bildet aus (bei mehreren Fabriken verteilt auf die kürzeste Warteschlange), Hover zeigt `einheitKarte`, ohne Tastaturkürzel.


