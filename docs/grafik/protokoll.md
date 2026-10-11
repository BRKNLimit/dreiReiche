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
### Runde 2: Vollständiger Satz handgefertigter SVG-Icons (Aufgabe 2)
- **Was war schwach:** Fast alle Einheiten, Gebäude und Fähigkeiten nutzten lediglich Platzhalterkreise mit Buchstabenkürzeln ("Ba", "So", "Hb" etc.), und `gegenwart` war lediglich ein einfacher Blitz. In der UI fehlte visuelle Erkennbarkeit.
- **Was wurde geändert:** In `src/icons.js` wurden sämtliche 38 Platzhalter sowie `gegenwart` durch detaillierte, semantisch treffende Vektor-Icons (SVG) ersetzt:
  - **Ressourcen:** `gegenwart` als pulsierender Äther-/Domänen-Nexus mit rotierenden Flussschwingen (deutlich verschieden von der Glühbirne für `skillpunkte`).
  - **Einheiten:** Individuelle Silhouetten für alle Menschen- und Gott-Einheiten mit Fraktionsfarb-Akzenten (`#d8b06a` Gold, `#8fb86a` Waldgrün), z.B. Sense & Ähre für den Bauer, Ritterschild & Klinge für den Soldat, Waldgott mit Hörnern, Augen und gekreuzten Klauen.
  - **Gebäude:** Prägnante Architektur- und Natur-Icons (z.B. Langhaus mit Giebelbalken für die Thingstätte, Förderturm mit Blut für den Blutschacht, Weltenbaum mit glimmendem Kern für den Herzbaum, Stonehenge-Trilithen für den Steinkreis).
  - **Kommandanten-Fähigkeiten:** Kriegshorn mit Schallwellen (`schlachtruf`), dreifacher Schildwall (`schildwall`), Sturmstiefel mit Schwingen (`ansturm`), emporschnellende Wurzelgreifer (`wurzelgriff`), umrankter Heiltropfen (`lebenssaft`), heulender Mondwolf (`rudelruf`).
- **Wie geprüft:** `npm test` und `npm run smoke` (inklusive `tools/smoke-galerie.mjs`) grün; alle 42 Icons sind valides SVG mit `viewBox="0 0 24 24"`, skalieren sauber von 20 px bis 64 px und zeigen klare Erkennbarkeit auf dunklem Hintergrund.

