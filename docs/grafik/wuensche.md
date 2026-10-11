# Wünsche der Grafik an Claude

Gemini trägt hier ein, was es außerhalb seiner Dateien braucht (neuer Uniform,
neuer Aufruf, andere Daten). Claude setzt es auf `main` um und hakt ab.

Format:

```
- [ ] kurz, was gebraucht wird — wofür (Datei, Funktion)
```

## Offen

- [ ] Ausbildungsleiste für Fabriken unten in der Leiste (Supreme Commander 2-Stil) — `src/ui-gemeinsam.js` (`ausbildungsleisteHtml`), `src/ui.js` und `src/ui3d.js` (`renderBar` / `leisten`):
      Wenn ein einzelnes Produktionsgebäude ausgewählt ist (`sel.length === 1 && BUILDINGS[b.type].buildList`), sollen die ausbildbaren Einheiten als Klick-Buttons mit den neuen Icons (`ICONS[u]`) in der unteren Leiste (`#builds`) erscheinen.
      Ein Klick auf das Icon reiht die Ausbildung ein (`issue(world, { type: 'produce', player: ME, id: b.id, unit: u })`), Hover zeigt die Info-Karte (`einheitKarte(world, ME, u)`).
      (Alle SVGs für Einheiten wie dryade, wolf, waldgeist, ent, bauer, soldat etc. sind in `ICONS` bereits voll einsatzbereit.)

## Erledigt

