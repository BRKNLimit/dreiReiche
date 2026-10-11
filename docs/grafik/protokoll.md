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

### Runde 3: Organische 3D-Landschaft, weicher Nebel und Geländemodelle (Aufgabe 3)
- **Was war schwach:** Der 3D-Boden war ein monochromes Rauschgitter ohne Landschaftszonen; Seen waren flache Einzelscheiben ohne Ufer; Felsen bestanden aus vier Kugeln; Adern waren simple Kugelhäufchen; Bäume standen völlig gleichförmig verstreut; der Nebel des Krieges zeigte harte 20-Meter-Blockkanten.
- **Was wurde geändert:**
  - **Shader (`src/render3d.js`):** Nebel des Krieges wird im Fragment-Shader durch Mehrfach-Sampling weichgezeichnet, sodass runde, organische Sichtränder statt pixeliger Kanten entstehen.
  - **Boden (`src/gelaende3d.js`):** `baueBoden` berechnet Wiesenvielfalt, feuchte dunkle Uferzonen an Seen, schottrige Übergänge an Felsen sowie erdig-braune Trampelpfade entlang der Hauptmarschachse zwischen den Basen.
  - **Seen & Ufer:** Seen erhalten einen Ufersaum aus Schilf/Sand, tiefes Wasser und eine animiert schimmernde, durchscheinende Oberfläche.
  - **Deko-Wälder:** Bäume sind in natürlichen Hainen/Waldstücken an den Flanken gruppiert statt gleichmäßig gestreut.
  - **Modelle (`src/modelle3d.js`):**
    - `fels`: Kantige, geschichtete Felsformationen mit steilen Facetten und Sockelmoos (unter Einhaltung der Kollisionskreise < 10%).
    - `baum`: Detaillierterer Stamm mit Wurzelansatz und mehrstufiger Laub-/Nadelkrone.
    - `fronAder`: Steinbruch-Fundstelle mit Holzabstützungen und schimmernden Eisenerz-Einschlüssen.
    - `blutAder`: Tiefschwarzer Obsidianspalt mit leuchtenden roten Kristallspitzen (`GLUEHT`).
- **Wie geprüft:** `npm test` und `npm run smoke` (1000 Frames im Headless WebGL) ohne Fehler bestanden; alle Modelle halten ihr Ecken-Budget ein.

### Runde 4: Organische 2D-Karte und Kartenästhetik (Aufgabe 4)
- **Was war schwach:** In der 2D-Draufsicht lag ein starres Koordinaten-Rasternetz über der gesamten Ansicht; der Boden war strukturlos; Felsen und Seen waren rein mathematische Kreise; Rodungsflächen wirkten starr kreisförmig.
- **Was wurde geändert:** In `src/gelaende2d.js`:
  - **Boden & Pfade (`drawGrid`):** Das starre Gitternetz wurde entfernt. Stattdessen gibt es einen echten Wiesenuntergrund, einen sichtbaren ausgetretenen Marschpfad zwischen den Basen und einen kartografischen Rahmen mit doppelter Zierleiste.
  - **Seen (`drawHindernisse`):** Geschwungene Uferkonturen mit Schilfsaum, Wassertiefe und Innenkern (unter 8 % Abweichung vom Simulationskreis).
  - **Felsen (`drawHindernisse`):** Kantige, polygonale Felsformationen mit Gratlinien, Facetten-Schattierung und Sonnenkanten.
  - **Gerodete Flächen (`drawCleared`):** Natürlich ausgefranste Rodungsinseln mit organischem Rand.
- **Wie geprüft:** `npm test` und `npm run smoke` (1000 Frames im Headless Canvas) fehlerfrei; alle sichtbaren Kanten entsprechen den mathematischen Kollisionskreisen bis auf < 8 %.



