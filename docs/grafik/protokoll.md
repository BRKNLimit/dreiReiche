# Protokoll der Grafik

## Entscheidungen

Hier trägt der Nutzer (oder Claude in seinem Auftrag) ein, was entschieden ist —
etwa die gewählte Waldgott-Variante.

- noch keine

## Runden

Gemini trägt jede Arbeitsrunde ein: was war schwach, was wurde geändert, wie
geprüft (Tests, Galerie, Spiel).

### Runde 1: Waldgott-Varianten für die Stil-Auswahl (Aufgabe 1)
- **Was war schwach:** Es gab nur eine einzige Waldgott-Darstellung (`A — bisher`), wodurch noch keine Stil-Auswahl für das Projekt möglich war.
- **Was wurde geändert:** In `src/modelle3d.js` wurden 6 neue Varianten (`B` bis `G`) nach den Vorgaben der Vorlage modelliert:
  - `B — Schattenriese`: Extrem schlank und über 6 m hoch, langer fransiger Mantel, geschwungenes Geweih.
  - `C — Vorlage, düster-realistisch`: Angelehnt an `docs/bilder/vorlagen/waldgott-vorlage.png`, hoher Kragen, vielgliedrige Falten, vierfach verzweigtes Geweih, gekreuzte Klauenhände mit Gelenken.
  - `D — Kantiges Low-Poly`: Klare geometrische Facetten, markante eckige Flächen und Zacken.
  - `E — Rinde und Moos`: Offener Mantel mit knorrigem Rinden-Körper, herabhängendes Moos, leuchtende Bodenpilze an den Wurzeln.
  - `F — Verspielt, große Formen`: Glockenmantel, runde Formen, breite Augen und Geweihschaufeln.
  - `G — Glutherz`: Im geöffneten Mantel glimmt ein orangefarbener Glutkern mit Funken und glühenden Geweihspitzen.
  - In `src/galerie.js` wurde die Möglichkeit ergänzt, feste Blickwinkel für Vergleiche zu nutzen.
- **Wie geprüft:** `npm test` und `npm run smoke` erfolgreich ausgeführt; alle Varianten halten das Ecken-Budget (höchstens 5.712 von 6.000 erlaubten Ecken) und rotieren fehlerfrei in `dist/galerie.html`.

