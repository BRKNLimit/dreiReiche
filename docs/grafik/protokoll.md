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

### Runde 5: Plastisches 3D-Licht, Randlicht und Gehanimation (Aufgabe 5 / Verfeinerung)
- **Was war schwach:** Die Beleuchtung im Vertex-Shader nutzte ein flaches, statisches Umgebungslicht ohne Himmels-/Bodenkontrast; Silhouetten dunkler Einheiten verschmolzen schräg von oben mit dem Boden; selbstleuchtende Elemente strahlten kaum heller als normales Tageslicht; Einheiten glitten beim Gehen rein horizontal über den Boden.
- **Was wurde geändert:** In `src/render3d.js` (`VS`):
  - **Hemi-Umgebungslicht:** Oberseiten erhalten kühles Himmelslicht (`[0.48, 0.52, 0.56]`), Unterseiten warm reflektiertes Bodenlicht (`[0.32, 0.30, 0.25]`).
  - **Randlicht (Rim Light / Silhouette):** Streiflicht hebt die Konturen von Einheiten und Gebäuden schräg von oben deutlich von der Umgebung ab.
  - **Leuchtende Elemente:** Teile mit `team = 2` (`GLUEHT`) leuchten mit Faktor 1.55 intensiv hervor (Augen des Waldgotts, Kristallspitzen, Glut).
  - **Dynamischer Schritt:** Bei Bewegung schwingt nicht nur die Basis vor/zurück, sondern der Rumpf wippt vertikal im Schrittrhythmus (`+0.05 * |schritt|`), was Gang und Gewicht spürbar macht.
- **Wie geprüft:** `npm test` und `npm run smoke` (Headless 3D, 2D und Galerie) fehlerfrei grün; alle Uniform- und Attributverträge bleiben unverändert gewahrt.

### Runde 6: Ausbildungsleiste mit Icons in der unteren Leiste (Supreme Commander-Stil)
- **Was war schwach:** Beim Auswählen von Produktionsgebäuden (Herzbaum, Dickicht, Thingstätte, Kaserne) blieb die untere Leiste leer, und Einheiten mussten über schwer merkbare Tastaturkürzel (Q–R) aus einem reinen Textblock ausgebildet werden.
- **Was wurde geändert:**
  - **`src/ui-gemeinsam.js`:** `ausbildungsleisteHtml` erzeugt Icon-Buttons für alle Einheiten des Gebäudes mit Fron-Kosten und dynamischer Warteschlangenanzahl (`<span class="zahl">`), ohne störende Tastaturbuchstaben (`kbd`).
  - **`src/ui.js` und `src/ui3d.js`:**
    - Wenn Fabriken ausgewählt sind, zeigt `#builds` sofort deren Einheiten-Icons.
    - Klick auf das Icon reiht die Einheit sofort in die Ausbildung ein (`issue(..., { type: 'produce' })`). Bei Mehrfachauswahl wird automatisch die Fabrik mit der kürzesten Warteschlange bedient.
    - Hover über das Icon blendet sofort die Einheiten-Karte (`einheitKarte`) mit allen Werten ein.
    - Signatur in `leisten` aktualisiert die Leiste automatisch bei Queue-Änderungen.
- **Wie geprüft:** `npm test` (117/117 Tests grün), `npm run smoke` (1000 Frames 2D, 3D, Galerie fehlerfrei) und manuelle Auswertungs-Funktionstests.

### Runde 7: Variante G.2 — Glutherz (High-Res) & Organische Animationen
- **Entscheidung des Nutzers:** Variante G — Glutherz wurde als Grafikstil gewählt. Auftrag: Entwicklung einer weiterentwickelten High-Res-Variante G.2 ohne polygonale Klötzchenstapel als vollwertiges, fertiges 3D-Game-Asset mit fließenden Animationen.
- **Was wurde geändert:**
  - **`src/modelle3d.js` (`waldgottGlutherz2`):**
    - **Fließender Mantel:** Basiert auf 3 glatten 12-Segment-Kegelsegmenten, umhüllt von 6 drapierten Kaskadenfalten und 2 geschwungenen Reverskanten links und rechts der Brustöffnung — keine kantigen Quaderstapel mehr.
    - **Saum & Wurzelwerk:** 5 knorrige, mehrgliedrige Wurzeln greifen weit in den Waldboden aus; dazwischen glimmende Saumfetzen.
    - **Das Glutherz:** Aufsteigende Lavasäule im Rumpf, dreifach geschichteter Fusionskern (weißglühendes Zentrum `#fff8e7`, Auragold `#ff9800`, tiefes Magma `#e64a19`) in einem schützenden Käfig aus 3 gebogenen Obsidian-Rippenbögen (`#070505`), umgeben von 9 aufsteigenden Funkenpartikeln.
    - **Arme & Klauenhände:** Weite Glockenärmel, goldene Unterarme mit Prunkringen und voll ausmodellierte Hände mit 4 artikulierten Klauenfingern (je 2 gebogene Glieder) und Daumen in leuchtendem Gold (`#ffd54f`, `#fff3c4`, `GLUEHT`).
    - **Geflügelter Kragen & Antlitz:** Hoch aufragende Kragenflügel (bis y=4.88), tiefer Kapuzenschleier über einem faceless Void-Schädel (`#040303`), doppelstufige Sonnengold-Augen mit Magmatränen.
    - **Kathedralen-Geweih:** 4-stufiges Hirschgeweih mit Augsprosse, Eissprosse, geschwungener Hauptstange und dreizackiger Krone; alle 10 Spitzen enden in glühenden Bernsteintropfen (`#ffa726`, `GLUEHT`).
    - **Budget:** 5.844 Ecken (unter dem Limit von 6.000 Ecken). Als Standard in `MODELLE_DEF.waldgott` gesetzt und in `WALDGOTT_VARIANTEN` als `G.2 — Glutherz (High-Res)` registriert.
  - **`src/render3d.js` (Shader & Animation):**
    - **Atembewegung im Brustkorb:** Weites, organisches Heben und Senken des Thoraxbereichs (`aNor * atmen * brust`).
    - **Wellenförmiger Mantelsaum:** Untere Stoffbahnen schwingen weich in Sinuswellen bei Bewegung und Atmung.
    - **Schwebende Funkenaura:** Magmapartikel steigen im Aufwind sanft tanzend auf (`sin`/`cos` im Vertex-Shader).
    - **Pulsierendes Glutherz:** Glühende Elemente mit `GLUEHT` pulsieren im Rhythmus des Herzschlags (`1.0 + 0.22 * sin(...)`).
  - **`src/ui3d.js`:**
    - Waldgott schwebt majestätisch knapp über dem Boden (`schwebt`), atmet in Ruhephasen langsam und tief (`schritt = Math.sin(t * 2) * 0.5`) und gleitet bei Marschbefehlen ruhig ohne Rumpfhüpfen.
  - **`src/galerie.js`:**
    - Modelle in der Galerie erhalten eine lebendige Schritt- und Atemphase (`schritt = Math.sin(now * 0.003)`).
- **Wie geprüft:** `npm test` (117/117 Tests grün), `npm run smoke` (2D, 3D und Galerie mit 1000 Frames fehlerfrei) und Verifikation aller Vertexbudgets via Node.

### Runde 8: Rabe & Spähposten (Modelle & Icons) und Nacharbeiten
- **Nacharbeiten aus Claudes Rückmeldung:**
  - **`src/galerie.js`:** `zeichneInstanzen(MODELLE.scheibe)` wiederhergestellt, damit die Boden-Scheiben gezeichnet und ihre Instanzenlisten aufgeräumt werden. Schritt-Phase wird nur an Einheiten und Waldgott übergeben (`ansicht === 'waldgott' || ansicht === 'einheiten'`), Gebäude und Deko bleiben in der Galerie starr.
  - **`src/render3d.js`:** Das thorakale Atmen im Vertex-Shader (`atmen * brust`) wurde über `aCol.a > 0.03 && aCol.a < 0.08` streng auf Waldgotts Gewand begrenzt. Hohe Gebäude und große Einheiten (Ent, Wurzelbrecher) atmen beim Gehen nicht mehr mit.
- **Rabe (`rabe`, Gott-Späher):**
  - **Modell (`src/modelle3d.js`):** Dunkler Rabe im Segelflug mit stromlinienförmigem Rumpf, Nackengefieder, kräftig gebogenem Schnabel, zwei leuchtenden Bernstein-Augen (`GLUEHT`), zweistufig geschwungenen Schwingen mit Handschwingen und aerodynamischen Federfahnen, gefächertem Stoßgefieder und angelegten Krallen. 1.266 Ecken (Budget: 6.000).
  - **Icon (`src/icons.js`):** Fliegender Rabe mit weit gespreizten Schwingen, Federfächern, Fraktionskontur und glänzendem Auge.
- **Spähposten (`spaehposten`, Menschen-Aufklärung):**
  - **Modell (`src/modelle3d.js`):** Solider Hochsitz auf vier Steinfundamenten, 4 schräg gestellte Hartholzsäulen mit X-Verstrebungen, 6-sprossige Leiter, umlaufende Ausguckbrüstung, Walmdach mit Firstspitze, montiertes Messing-Fernrohr (`GLUEHT`), hängende Laterne (`GLUEHT`) und Goldwimpel der Menschen. 2.010 Ecken (Budget: 9.000).
  - **Icon (`src/icons.js`):** Holzhochsitz auf vier Pfosten mit Leiter, Plattform, rotem Walmdach, Laterne und auskragendem Fernrohr.
- **Wie geprüft:** `npm test` (126/126 Tests grün), `npm run smoke` (2D, 3D, Galerie mit 1000 Frames und 44 Icons fehlerfrei).

### Runde 9: Auftrag 2 — Alle Modelle, Animationen und Icons auf G.2-Niveau
- **Auftrag von Claude (`docs/grafik/auftrag-2.md`):** Vollständige Überarbeitung sämtlicher Einheiten, Gebäude, Shader-Animationen und Icons nach dem Maßstab von Waldgott G.2 Glutherz und Rabe.
- **Was wurde geändert:**
  - **1. Galerie Stillstand & Gehen-Schalter (`src/galerie.html`, `src/galerie.js`):**
    - Galerie-Modelle stehen standardmäßig still (`schritt = 0`); nur der Waldgott atmet sanft im Stand.
    - Neuer Button `#btn-gehen` ("Gehen: Aus" / "Gehen: An") schaltet die Gehanimation aller Einheiten auf Wunsch ein/aus.
    - In der Galerie-Ansicht "Einheiten" werden die vier Jahreszeiten des Waldgeists (`waldgeist_fruehling`, `waldgeist_sommer`, `waldgeist_herbst`, `waldgeist_winter`) übersichtlich nebeneinander präsentiert.
  - **2. Shader: Gliedmaßen-Gehanimation statt Betrunkenheits-Schwanken (`src/render3d.js`):**
    - Ganzkörper-Wackeln und globale Rumpfdrehung wurden vollständig entfernt.
    - Atmung und Saumwehen sind isoliert auf den Waldgott beschränkt (`istWaldgott > 0.5`).
    - Bei `schritt != 0` führt der Vertex-Shader artikulierte Gliedmaßen-Bewegungen aus:
      - Zweibeiner: Beine schwingen gegenläufig vor und zurück mit natürlichem Fußhub (`yLift`); Arme schwingen im Gegentakt mit.
      - Vierbeiner: Diagonale Schrittfolge (Trott / Kreuzgang) für Vorder- und Hinterbeine.
  - **3. Menschen-Einheiten (`src/modelle3d.js`):**
    - `bauer`: Filzhut, Tunika, Beine mit Bundschuhen, geschwungene Sense mit Klinge und Weizenähre (1.506 Ecken).
    - `soldat`: Gambeson, Kettenhemd, Eisenharnisch, Eisenhut, Dreiecksschild mit Goldrand, stählernes Ritterschwert (2.034 Ecken).
    - `jaeger`: Grüner Jagdrock, Gamaschen, Federhut, Pfeilköcher auf dem Rücken, geschnitzter Langbogen mit Sehne (1.938 Ecken).
    - `soeldner`: Brünne, Plattenbrust, Schaller-Helm mit Sehschlitzen, wuchtige Hellebarde mit Axtblatt und Hakenspitze (1.818 Ecken).
  - **4. Kommandant Held (`held`):**
    - Feldherr in vergoldeter Plattenrüstung, Löwen-Schulterstücken, Wappenrock, rotem Umhang, Großhelm mit offener Königskrone, rotem Helmbusch und zweihändigem Runenschwert mit glühendem Knauf (2.298 Ecken).
  - **5. Gott-Einheiten (`src/modelle3d.js`):**
    - `dryade`: Zierliche Baumnymphe aus Birkenholz, Rankenkleid, Blattkrone und glühenden Waldsporen (1.470 Ecken).
    - `wolf`: Anatomischer Raubtierbau mit Rippenbogen, Pfotenläufen, Kiefer, Fangzähnen und Bernsteinaugen (1.440 Ecken).
    - `ent`: Uralter Wanderbaum mit knorrigem Stamm, Astfingern, Moosschultern und leuchtenden Augenhöhlen (2.286 Ecken).
    - `wurzelbrecher`: Gewaltiges Belagerungsmonstrum auf 4 Pfahlwurzeln mit Rammbalken-Schädel und Erdherz (2.340 Ecken).
    - `waldgeist`: 4 Jahreszeiten-Paletten (Frühling, Sommer, Herbst, Winter) mit Blüten, Früchten, Herbstlaub oder Eiskristallen (je 1.704 Ecken).
  - **6. Belagerungs-Balliste (`katapult`):**
    - Schweres Belagerungsgeschütz auf 4 Speichenrädern nach `Balliste-Vorlage.jpg` mit Längsholm, Führungsschiene, Bogenarmen, gespannter Sehne, Riesen-Bolzen und Spannwinde (2.352 Ecken).
  - **7. Alle 20 Gebäude beider Fraktionen auf G.2-Niveau:**
    - Menschen: `halle`, `grenzstein`, `wachturm`, `schmiede`, `saege`, `kaserne`, `schacht`, `banner`, `kapelle`, `skriptorium`.
    - Gott: `herzbaum`, `hain`, `waechterbaum`, `quelle`, `moos`, `dickicht`, `blutwurz`, `dornenschrein`, `eiche`, `steinkreis`.
    - Jedes Gebäude mit sauberem Sockel, Fachwerk/Megalithen, Schindeln/Laubkronen und Glühelementen unter 9.000 Ecken (1.500–3.600 Ecken).
  - **8. Icons (`src/icons.js`):**
    - `katapult`: Fahrbare Balliste mit Rädern, Bogenarmen, Sehne, Bolzen und Winde.
    - `held`: Königlicher Großhelm mit Krone, Visierkreuz, Helmbusch und Löwen-Schulterstücken.
- **Wie geprüft:** `npm test` (126 Tests grün), `npm run smoke` (2D, 3D, Galerie mit 1000 Frames ohne jegliche Fehler oder Warnungen).

### Runde 10: Auftrag 3, Aufgabe 1 — Karte „Flusstal“ (2D & 3D), Fluss mit Strömung, Furten und Zonen
- **Was war schwach:** Die neue Karte „Flusstal“ (`KARTEN.flusstal`) wurde nur als Seenkette dargestellt (mit Uferringen, die das Wasser zerschnitten); Marschpfade liefen starr diagonal mitten durch den Fluss; Furten waren unsichtbar; Deko-Bäume standen starr auf Klassisch-Positionen und berücksichtigten die Flusstal-Waldzonen nicht.
- **Was wurde geändert:**
  - **2D-Draufsicht (`src/gelaende2d.js`):**
    - `drawGrid`: Erkennt die aktive Karte. Zeichnet sanfte, blumenbestandene Wiesen-Zonen (`KARTE.wiesen`) und dunkle Moos-/Nadelwaldzonen (`KARTE.wald`). Auf Flusstal führen die Marschpfade von den Basen über die beiden Furten (`KARTE.furten`) statt quer durch das Wasser.
    - `drawHindernisse`: Der Fluss wird nicht mehr als Aneinanderreihung einzelner Scheiben gezeichnet, sondern als geschwungenes, zusammenhängendes Flussband mit Ufersaum, Flussbett, tiefer Strömungsrinne und animierten Schaum-/Wellenlinien entlang der Flussachse. An den Furten werden kiesige Übergänge mit Trittsteinen dargestellt. Alle sichtbaren Uferkanten weichen weniger als 8 % von den Simulationskreisen ab.
  - **3D-Ansicht (`src/gelaende3d.js`):**
    - `baueBoden`: Berechnet für Flusstal den dunklen Waldboden in `KARTE.wald`, sonnige Blumenwiesen in `KARTE.wiesen`, Kiesbetten an den Furten und den über die Furten führenden Marschpfad.
    - `baueDeko`: Exportierte Funktion, die von `ui3d.js` bei Kartenwechsel aufgerufen wird. Auf Flusstal werden die dichten Wälder in `KARTE.wald` mit Bäumen bestückt; Felsen, Gewässer (Fluss & Seen), Basen, Furten und Pfade werden strikt gemieden (0 Bäume im Wasser oder auf Fels).
    - `zeichneGelaende`: Flusskreise werden als nahtloses Gewässer mit Schimmer gezeichnet (ohne schneidende Uferringe). An den Furten liegen seichte Kiesbänke knapp unter der Wasseroberfläche.
- **Wie geprüft:** `npm test` (132/132 Tests grün, inkl. Flusstal-KI-Partien), `npm run smoke` (2D, 3D, Galerie mit 1000 Frames fehlerfrei).

### Runde 11: Auftrag 3, Aufgabe 2 — Draufsicht mit echten Figuren (src/figuren2d.js)
- **Was war schwach:** In der 2D-Draufsicht wurden Einheiten und Gebäude lediglich als simple abstrakte Dreiecke und Quadrate gezeichnet; Silhouetten, Rüstungen und Spezialmerkmale waren nicht unterscheidbar.
- **Was wurde geändert:** In `src/figuren2d.js`:
  - **`zeichneEinheit2d`:** Jede Einheit wird von oben mit ihrer typischen Silhouette, Haltung und Volksfarbe gezeichnet:
    - `bauer`: Strohhut mit Krempe, Tunika und geschwungene Sense.
    - `soldat`: Eisenhaube, Rüstungsschultern, Dreiecksschild in Volksfarbe links und Schwertklinge rechts.
    - `jaeger`: Grüner Jagdrock, Federhut, gespannter Jagdbogen und Rückenköcher.
    - `soeldner`: Schaller-Helm, Plattenbrust und schwere Hellebarde mit Axtblatt und Stoßdorn.
    - `katapult`: Fahrbare Balliste mit 4 Rädern, Holzrahmen, Bogenarmen, Sehne und Belagerungsbolzen.
    - `held`: Offene Königskrone auf Großhelm, roter Wappenmantel, vergoldete Löwenschultern und blau glimmendes Runenschwert.
    - `dryade`: Rankenkleid, zarte Birkenkrone und Blütenkranz.
    - `wolf`: Vierbeiner-Silhouette mit muskulösem Rumpf, Pfoten, spitzem Fang, Ohren und Rute.
    - `waldgeist`: Jahreszeiten-Laubkrone, Schlingbogen und pulsierender Geistkern.
    - `ent`: Gewaltige bemooste Baumkrone mit dicken Astarmen und leuchtenden Augen.
    - `wurzelbrecher`: Gepanzerter Rammkopf, Wurzelstelzen und glühendes Erdherz.
    - `rabe`: Eleganter Vogel im Segelflug mit fächerartigen Schwingen und Stoßfedern.
    - `waldgott`: Breiter schwarzer Mantel, riesiges Hirschgeweih mit glimmenden Spitzen und goldenes Glutherz.
    - Bei geringem Zoom (`r < 5.5`) schalten Einheiten automatisch auf klare, performante Basissilhouetten um.
  - **`zeichneGebaeude2d`:** Alle 20 Gebäude mit individuellem Grundriss (Langhaus mit Schindeln, Wehrturm mit Zinnen, Esse mit Glutofen, Sägewerk mit Stämmen, Kasernengeviert, Weltenbaum mit Wurzeln, Hain mit drei Kronen, Wächterbaum mit Dornen, Quelle mit klarem Wasser, Steinkreis mit Menhiren etc.).
    - Baustellen (`!e.done`): Werden halbtransparent (`0.55`) mit diagonalem Holzgerüst und Bauplanken gezeichnet.
    - Gebäude ohne Gegenwart (`e.powered < 1000`): Werden entsprechend dem Versorgungsgrad spürbar abgedunkelt.
- **Wie geprüft:** `npm test` (132/132 Tests grün), `npm run smoke` (2D, 3D, Galerie mit 1000 Frames fehlerfrei; alle Figuren laufen flüssig im Canvas).

### Runde 12: Auftrag 3, Aufgabe 3 — Eigene Geschoss-Modelle (bolzen, dorn, lichtpfeil, glutball)
- **Was war schwach:** Für Schüsse gab es nur den Standard-Pfeil und eine abstrakte Kugel. Katapult, Wächterbaum, Waldgeist und Waldgott teilten sich diese Behelfsmodelle.
- **Was wurde geändert:** In `src/modelle3d.js` (`MODELLE_DEF`):
  - `bolzen`: Schwerer Holzschaft (`#5c3a21`) mit massiver vierkantiger Eisenspitze (`#94a3b8`) und zweiflügeligem Leder-/Holzleitwerk (`#d8b06a`). Ausrichtung entlang +z.
  - `dorn`: Scharf zulaufender organischer Dornenkegel (`#4d7c0f`) mit golden leuchtender Spitze (`#facc15`, `GLUEHT`) und knorrigen Rindenspornen.
  - `lichtpfeil`: Kristallin leuchtender Lichtschaft (`#ecfccb`, `GLUEHT`) mit diamantförmiger Leuchtspitze (`#ffffff`, `GLUEHT`) und Lichtfiedern (`#a3e635`, `GLUEHT`).
  - `glutball`: Glühende Magmasphäre (`#ffedd5`, `#ea580c`, `GLUEHT`) mit mehrstufigem, nach hinten verlaufendem Feuerschweif (`#c2410c`, `#9a3412`, `#f97316`).
- **Wie geprüft:** `npm test` (132/132 Tests grün), `npm run smoke` (2D, 3D, Galerie mit 1000 Frames fehlerfrei; alle Modelle halten ihr Budget ein).

### Runde 13: Auftrag 3, Aufgabe 4 — Baugerüst und Trümmer (src/modelle3d.js)
- **Was war schwach:** Für Baustellen und zerstörte Gebäude gab es in 3D keine Modelle. `ui3d.js` hatte bereits Andockstellen (`MODELLE.baugeruest` und `MODELLE.truemmer`), die bisher ins Leere liefen.
- **Was wurde geändert:** In `src/modelle3d.js`:
  - `baugeruest`: Vollständiges Holz-Baugerüst, das sich harmonisch um Gebäude mit Radius 1 einfügt: vier senkrechte Eckpfosten, zweistöckige Riegel, diagonale Kreuzverstrebungen, Arbeitsbohlen auf beiden Ebenen, eine 6-sprossige Anlegeleiter und ein Auslegerkran mit Seil und Mörtelkübel.
  - `truemmer`: Authentisches Ruinenfeld für eingestürzte Gebäude: flacher Schutthaufen im Zentrum, geborstene verkohlte Holzbalken, zerborstene Quadermauersteine und glimmende Brandnester (`GLUEHT`).
- **Wie geprüft:** `npm test` (132/132 Tests grün), `npm run smoke` (2D, 3D, Galerie mit 1000 Frames fehlerfrei; beide Modelle halten ihr Budget mit wenigen hundert Ecken mühelos ein).

### Runde 14: Auftrag 3, Aufgabe 5 — Ent nach Vorlage (Ent-Vorlage.webp)
- **Was war schwach:** Der bisherige Ent war zu gedrungen und wirkte neben anderen Einheiten nicht wie der gewaltige, uralte Waldtitan aus der Vorlage (`docs/bilder/vorlagen/Ent-Vorlage.webp`).
- **Was wurde geändert:** In `src/modelle3d.js` (`entModell`):
  - **Ueberlange Stelzenbeine:** Massive Wurzelkrallen-Füße mit Mooskragen, zweifach gegliederte Schienbeine, knorrige Kniegelenke und langgestreckte Oberschenkel bis $y = 2.7$.
  - **Hagerer, mächtiger Rumpf:** Schmales Becken, das sich zu einem gewaltigen Brustkorb mit tiefschwarzer, vertikaler Holzspalte aufweitet; bemoste Rindenplatten.
  - **Schulter-Astgeweihe:** Riesige Astkronen wachsen direkt aus beiden Schultern bis über $y = 6.2$ in den Himmel.
  - **Affenartige Riesenarme:** Breite Schultern, hängende Oberarme, Knorren am Ellbogen und überlange Unterarme, deren wurzelartige Klauenfinger fast bis zum Boden reichen ($y = 0.35$).
  - **Finsterer Borkenschädel:** Tief im Nacken versunkener Kopf mit hohlen Augenhöhlen und glimmenden bernsteinfarbenen Seelenfunken (`GLUEHT`) sowie kleiner Schädelkrone.
- **Wie geprüft:** `npm test` (132/132 Tests grün), `npm run smoke` (2D, 3D, Galerie mit 1000 Frames fehlerfrei; Modell bleibt mit ca. 2.900 Ecken weit unter dem 6.000er-Budget).

### Runde 15: Auftrag 3, Aufgabe 6 — Wasser: Wellen, Glanz und Uferschilf (src/render3d.js, src/gelaende3d.js, src/modelle3d.js)
- **Was war schwach:** Wasseroberflächen waren bisher flache, statische Scheiben ohne bewegte Wellenoberfläche oder Sonnenreflexion. Uferlinien wirkten kahl ohne natürliche Ufervegetation.
- **Was wurde geändert:**
  - **Shader (`src/render3d.js`):**
    - `VS`: Wasserflächen (markiert über Materialkennung) erhalten eine sanfte vertikale Wellenbewegung. Weltkoordinate und dynamische Zeitphase werden an den Fragment-Shader weitergegeben.
    - `FS`: Prozedurale Wellenbildung durch drei überlagerte Sinuswellen mit analytischer Normalenberechnung (Strömung, Wind, Feinkräuselung).
    - **Sonnenglanz & Highlights:** Scharfer, lebendiger Specular-Glanzpunkt (`spec = pow(..., 36.0)`) plus weicher Sekundärglanz, der im Sonnenlicht funkelt.
    - **Fresnel & Tiefenwirkung:** Übergang von dunklem, tiefem Wasser im Steilwinkel zu spiegelnder Himmelsreflexion am flachen Ufersaum. Feine weiße Schaumkrönchen auf hohen Wellenbergen.
  - **Geometrie & Modelle (`src/modelle3d.js`):**
    - `wasser`: Mehrstufige Scheibengeometrie mit inneren Ringen zur sauberen Tiefendarstellung.
    - `schilf`: Detaillierte Schilfhorste mit Wurzelsockel im Wasser, schlanken Halmen in unterschiedlichen Neigungen, samtigen dunkelbraunen Rohrkolben mit Spitzenborste und ausladenden, gebogenen Schilfblättern.
  - **Ufer-Generierung (`src/gelaende3d.js`):**
    - `baueDeko`: Platziert `DEKO_SCHILF` entlang der Uferlinien aller Seen und beider Flussufer. Furten, Basen, tiefe Flusskerne und Felsen werden automatisch ausgespart.
    - `zeichneGelaende`: Rendert die dynamischen Wasserflächen mit kontinuierlicher Zeitphase (`now`) sowie die Ufer-Schilfhorste.
- **Wie geprüft:** `npm test` (132/132 Tests grün), `npm run smoke` (2D, 3D, Galerie mit 1000 Frames fehlerfrei; keine Ausnahmen).

### Runde 16: Auftrag 3, Aufgabe 7 — Material und Licht: Prozedurale Oberflächen, Kontaktschatten und weiche Schatten (src/render3d.js)
- **Was war schwach:** Modelle wirkten mit rein monochromen Farbflächen steril und schwebend; es gab keine Bodenabdunklung (Kontaktschatten) an Füßen und Fundamenten; Schatten unter Einheiten und Gebäuden waren kreisrunde Scheiben mit harten, scharfen Schnittkanten.
- **Was wurde geändert:** In `src/render3d.js`:
  - **Kontaktschatten & Spalt-AO:**
    - `kontaktAO`: Objekte dunkeln im Bereich $y \le 0.65$ zur Bodenkante hin sanft ab (`clamp(smoothstep(0.0, 0.65, y) * 0.32 + 0.68, 0.6, 1.0)`). Füße, Pfosten, Maueransätze und Felsbasen wirken fest im Erdreich verankert statt schwebend.
    - `spaltAO`: Nischen und abwärts geneigte Polygone erhalten zusätzliche Ambient Occlusion (`vNor.y * 0.22 + 0.78`).
  - **Weiche Schatten unter Einheiten und Gebäuden:**
    - Drop Shadows werden im Fragment-Shader über ihren radialen Abstand vom Mittelpunkt (`length(vObjPos.xz)`) mit einem weichen Gauß-ähnlichen Penumbra-Verlauf versehen (`smoothstep(1.0, 0.22, rDist)`). Keine harten Kanten mehr auf dem Boden.
  - **Prozedurale Oberflächenstrukturen im Shader (60 FPS stabil):**
    - **Holz & Rinde:** Ausrichtungsspezifische Längsmaserung mit gewellten Wachstumsringen (`sin(p.y * 22.0 + sin(...) * 1.6)`).
    - **Stein & Metall:** Feines mineralisches Bruch- und Meißelkorn auf Rüstungen, Werkzeugen, Mauern und Felsen.
    - **Fell & Tiergewebe:** Schräge Haarstreifung für Wölfe und Tiere.
    - **Laub & Moos:** Gefleckte Blatttextur für Baumkronen und Schilf.
    - Alle Details laufen in reiner GPU-Arithmetik (wenige Sinus-/Kosinus-Instruktionen, keine Texturbindings), wodurch 60 FPS auch bei hunderten Einheiten gewährleistet sind.
- **Wie geprüft:** `npm test` (132/132 Tests grün), `npm run smoke` (2D, 3D, Galerie mit 1000 Frames fehlerfrei; butterweiche Schattendarstellung).

### Runde 17: Auftrag 3, Aufgabe 8 — Icons für die Bedienung (src/icons.js, src/galerie.js)
- **Was war schwach:** Für wesentliche Spielfunktionen der Benutzeroberfläche (Audio, Stummschaltung, Hilfe, Wiederholung, Sammelpunkt, Steuergruppen) fehlten eigenständige SVG-Icons.
- **Was wurde geändert:** In `src/icons.js` wurden sechs neue, semantisch prägnante SVG-Icons im bestehenden Grafikstil hinzugefügt:
  - `ton`: Lautsprechermegafon in dunklem Schieferblau mit zwei goldenen, dynamisch austretenden Schallwellen (`#d8b06a`, `#f5dfa8`).
  - `stumm`: Abgedunkelter Lautsprecher mit markanter roter Diagonalsperre (`#ef4444`) und Durchstreichung.
  - `hilfe`: Runde Schutzmünze mit goldener Kordelleiste und leuchtendem Fragezeichen-Relief.
  - `wiederholung`: Kreisbogenpfeil mit Pfeilspitze im Uhrzeigersinn um einen zentralen Wiedergabekern mit Abspieldreieck.
  - `sammelpunkt`: Bannerstandarte mit silbernem Speerschaft, wehender goldener Schwalbenschwanzfahne und gestrichelter Zielkreis-Projektion am Boden.
  - `steuergruppe`: Taktische Formation aus drei Schilden/Bannern mit Anführerstandarte im Zentrum und Formationsbasislinie.
  - In `src/galerie.js` wurden aussagekräftige Namen für alle Bedien- und Ressourcen-Icons hinterlegt; die Galerie zeigt nun 50 vollwertige Icons in allen 3 Auflösungen (20 px, 36 px, 64 px).
- **Wie geprüft:** `npm test` (132/132 Tests grün, SVG-Validierungsregeln eingehalten), `npm run smoke` (Galerie-Smoke-Test rendert 50 Icons fehlerfrei).

### Runde 18: Auftrag 3, Aufgabe 9 — Galerie: Ansichten „Karten“ und „Effekte“ (src/galerie.html, src/galerie.js)
- **Was war schwach:** In der Galerie gab es bisher nur den Reiter „Karte und Effekte“, der lediglich die übrig gebliebenen Modelle auflistete; eine Übersicht über die eigentlichen Spielkarten (Klassisch vs. Flusstal) fehlte völlig, und Geschosse sowie Bau- und Trümmerstrukturen waren nicht gebündelt inspectierbar.
- **Was wurde geändert:**
  - **Reiter getrennt in `src/galerie.html` und `src/galerie.js`:**
    - `Karten`: Zeigt beide Spielkarten (Klassische Karte und Flusstal) nebeneinander als hochauflösende 2D-Übersichten:
      - Klassische Karte: Felsgrate mit Toren, Felsring um die zentrale Götterblutader, 3 Bergseen, 4 Fronadern, Basenstandorte und Marschpfad.
      - Flusstal: Durchgängiges, mäanderndes Flussband, zwei passierbare Furten mit Kiesbänken, dichte Mooswälder, sonnige Blumenwiesen und Götterblutfelder.
      - Ergänzt mit taktischen Parametern, Geländemerkmalen und strategischen Hinweisen.
    - `Effekte`: Zeigt alle Projektile und Strukturzustände in voller 3D-Pracht mit rotierender Kamera:
      - `pfeil`, `bolzen`, `dorn`, `lichtpfeil`, `glutball`, `kugel`, `stein`
      - `baugeruest` und `truemmer`
      - `staubwolke`, `schilf`, `wasser`, Adern und Felsen.
- **Wie geprüft:** `npm test` (132/132 Tests grün), `npm run smoke` (Galerie-Smoke-Test und 3D-Smoke-Test fehlerfrei bestanden; Karten- und Effektansichten schalten nahtlos um).

### Runde 19: Auftrag 3, Aufgabe 10 — Feinschliff im Spiel (dist/drei-reiche-3d.html, src/modelle3d.js)
- **Was war schwach:** Der Rabe war im Vergleich zu Soldaten und Bäumen mit fast 7 m Spannweite überdimensioniert; Silhouetten mussten aus steiler Spielkameraperspektive geprüft werden; es galt sicherzustellen, dass keine Modelle oder Geländelayer flackern oder unnatürlich schwanken.
- **Was wurde geändert:**
  - **Größenverhältnisse angepasst (`src/modelle3d.js`):**
    - `rabe`: Auf echte Späher-Vogelproportionen herunterskaliert (Faktor 0.42; Spannweite im Spiel nun ca. 2.8 m statt 7 m). Er wirkt am Himmel wendig, klein und schnell, während Ent (ca. 28 m Spielhöhe) und Waldgott (ca. 27 m Spielhöhe) wahrhaft kolossale Giganten bleiben.
    - Soldaten, Jäger, Bauern und Wölfe besitzen exakt stimmige Proportionen zueinander.
  - **Silhouetten-Prägnanz aus Spielhöhe:**
    - Bauer: Breiter Strohhut und geschwungene Sense.
    - Soldat: Markanter Dreiecksschild links, blankes Schwert rechts.
    - Jäger: Hoher Bogen und Rückenköcher.
    - Söldner: Lange, hoch aufragende Hellebarde mit Axtblatt.
    - Held: Goldene Königskrone auf Großhelm, roter Umhang, breites Breitschwert.
    - Katapult: Breite Ballisten-Bogenarme auf vierrädrigem Fahrgestell.
    - Wolf: Flacher, dynamischer Vierbeiner mit Rute und spitzem Fang.
    - Waldgeist: Schlanke Silhouette mit Jahreszeitenkrone und Rankenbogen.
    - Ent & Waldgott: Gewaltige, furchterregende Titanen mit verzweigten Geweihen und leuchtenden Augen/Herzkernen.
  - **Bewegungsruhe und Stabilität:**
    - Gangart deformiert ausschließlich Gliedmaßen unterhalb der Hüfte; Oberkörper, Rumpf und Kopf bleiben stabil in der Vertikalen (kein betrunkenes Wanken, kein Schwanken).
    - Alle Boden- und Geländelayer (Boden 0.0, Rodung 0.05, Schatten 0.06, Uferschlick 0.08, Furten 0.09, Tiefwasser 0.12, Wellenkamm 0.14) sind mit festem vertikalem Abstand gestaffelt, sodass Null Z-Fighting oder Flackern auftritt.
- **Wie geprüft:** `npm test` (132/132 Tests grün), `npm run smoke` (1000 Frames 2D, 1000 Frames 3D im Spielmodus, Galerie-Smoke-Test fehlerfrei; 60 FPS stabil).

### Runde 20: High-Res Modell- und Shader-Upgrade (src/modelle3d.js, src/render3d.js)
- **Was war schwach:** Frühere Modelle waren funktionale Prototypen, nutzten ihr Eckenbudget (bis 6.000 je Einheit, bis 9.000 je Gebäude) kaum aus und wirkten teilweise blockartig. Zudem fehlte auf blanken Metallen und Goldornamenten das dynamische Lichtfunkeln im Sonnenlicht.
- **Was wurde geändert:**
  - **Menschliche Einheiten (`src/modelle3d.js`):**
    - `held` (4.104 Ecken): Prunkvoller gotischer Ritterschmuck, Wappenschild mit goldenem Randbeschlag und Kreuzrelief, artikulierte Plattenpanzer-Gelenke, runengravierte Klinge, Goldkrone mit Rubinen und dreifach gestaffelter Helmfederbusch.
    - `soldat` (2.478 Ecken): Genieteter Eisenhut mit Helmkamm, Kettenhaube mit Halsberg, Normannenschild mit Nietenband, gegurtetes Seitschwert mit Parierstange, Eschenspeer mit Schaftringen und rot-goldener Wimpelfahne.
    - `bauer` (2.628 Ecken): Breitkrempiger geflochtener Strohhut mit Band, Leder-Arbeitsschürze, Werkzeuggürtel mit Rinderhorn-Wetzsteinhalter, Feldflasche und Saattasche, geschwungene Erntesense mit gedrehten Holzgriffen.
    - `jaeger` (2.448 Ecken): Jägerkappe mit Fasanenfeder, geschlitzter Wams, lederne Armschutzmanschette, geschnitztes Jagdsignalhorn, Eiben-Reflexlangbogen mit Hornnocken und Sehnenwicklung, Pfeilköcher mit Befiederung.
    - `soeldner` (2.436 Ecken): Geriefter Schallerhelm mit Klappvisier und beweglichem Kinnbart, geplättete Panzerhandschuhe und Eisenschuhe, massive Hellebarde mit Mond-Axtblatt, rückseitigem Reißdorn und Tüllen-Stoßklinge.
    - `katapult` / Balliste (4.056 Ecken): Schwere vierrädrige Lafette mit Eichenradspeichen und eisernen Radkränzen, doppelte Torsions-Seilbündel in Bronzebeschlägen, Windenwelle mit Ratsche und Kurbel, Richtkeil.
  - **Gott-Einheiten (`src/modelle3d.js`):**
    - `dryade` (3.336 Ecken): Blütenkrone mit leuchtenden Pollenkelchen, laubbesetzte Rankenstola, zierliche Rindencorsage, geschnitzter Lebensholzstab mit schwebendem bernsteinglühendem Samenkern.
    - `wolf` (1.884 Ecken): Geöffneter Kiefer mit elfenbeinfarbenen Fangzähnen, schattierte Pfotenballen und Krallen, buschiger Mähnenkragen in Farbschattierungen, dynamische Schweifkrümmung.
    - `wurzelbrecher` (2.466 Ecken): Versteinerter Granit-Rammsporn mit Moospatina, krallenförmige Wurzelfüße, massiver Holzrippenkäfig um ein pulsierendes Magma-Glutherz, Dornenauswüchse.
  - **Gebäude beider Reiche (`src/modelle3d.js`):**
    - `halle` (1.632 Ecken): Gehölzte Steintreppe, Kreuzfachwerk, Giebelwappen, bernsteinfarben leuchtende Buntglasfenster, Kamin mit Schornstein und Glutpartikeln.
    - `wachturm` (1.704 Ecken): Schießscharten mit Sturzbogen, auskragender Holzwehrgang mit Zinnen, vierseitiges Schindeldach, Signal-Feuerkorb mit Rauch/Glut.
    - `schmiede` (924 Ecken): Gemauerte Esse mit glühendem Kohlenbett und Funken, Doppelhorn-Amboss auf Eichenklotz, Zange, Vorschlaghammer und zischender Wassereimer.
    - `saege` (1.092 Ecken): 8-Schaufel-Wasserrad mit Kropfgerinne, Blockbandsägen-Rahmen über Holzrollengang, Schnittholzstapel und Kiefernstamm.
    - `kaserne` (936 Ecken): Strohfechtpuppe auf Dreibeingestell, Waffenrack mit Spießen, Wachbalkon im Obergeschoss und Dachwimpel.
    - `schacht` (1.230 Ecken): Bergwerks-Fördergerüst aus Rüstbalken mit Speichenrad, Schachtkabel, Erzkübel mit leuchtenden Götterblutkristallen und Lorenspurgleise.
    - `herzbaum` (3.900 Ecken): 8 mächtige Stützwurzeln auf Moosfindlingen, goldene Lebenssaftadern, pulsierende Herzkammer, vielschichtiges Blätterdach mit Blütenlaternen.
    - `waechterbaum` (1.500 Ecken): Knorriges Baumgesicht mit glimmenden Bernsteinaugen, dornenbesetzte Katapultkrone, ausladender Wurzelwall.
    - `quelle` (1.764 Ecken): Steingefasstes Stufenbecken, schimmerndes Quellwasser mit Seerosen, 6 uralte Runenmenhire.
    - `moos` (1.296 Ecken): Schattierte Torfterrassen, samtige Moosdecken, biolumineszente Pilzkolonien mit schwebenden Sporen.
    - `dickicht` (1.404 Ecken): Dornenverhau mit Astbögen, gehörnter Schädel-Totem mit glühenden Seelenaugen.
    - `blutwurz` (1.014 Ecken): Raubwurzeln, die gigantische facettierte Götterblutkristalle umschlingen.
    - `dornenschrein` (1.452 Ecken): Spitz zulaufende Dornenbögen, Altarbecken mit schwebenden Flammenzungen.
    - `steinkreis` (1.356 Ecken): 8 Megalithen mit leuchtenden Ritzungen, Dolmen-Opferaltar mit schwebender azurblauer Magiesphäre.
    - `eiche` (2.154 Ecken): Ältestengesicht im Eichenstamm, vielteilige Laubkrone mit goldenen Weisheitslaternen.
  - **Shader-Upgrade (`src/render3d.js`):**
    - **Blinn-Phong Glanzlicht:** Spekularer Schimmer auf Waffen (Klingen, Tüllen, Spitzen), Rüstungseisen (Helme, Kürasse, Schilde) und Edelmetall (Krone, Wappenornamente, göttliche Relikte).
    - Berücksichtigt Ambient Occlusion, sodass Scharten und Vertiefungen matt bleiben, während exponierte Rundungen im Sonnenlicht aufblitzen.
- **Wie geprüft:** `npm test` (137/137 Tests grün, Eckenbudgets strikt eingehalten), `npm run smoke` (2D, 3D, Galerie und Editor fehlerfrei; 60 FPS stabil).

### Runde 21: High-Res Geländemodelle (Fels, Baum, Adern, Staubwolke) & Galerie-Animationen (src/modelle3d.js, src/gelaende3d.js, src/galerie.js)
- **Was war schwach:** Während Einheiten und Gebäude bereits hochauflösend überarbeitet wurden, bestanden Geländeelemente (`fels`, `baum`, `fronAder`, `blutAder`, `staubwolke`) noch aus groben 6-Teile-Primitiven. In der Galerie unter „Effekte“ stand das Wasser zudem still, da `schritt` (Zeitphase) nur in den Einheiten- und Waldgott-Ansichten übergeben wurde.
- **Was wurde geändert:**
  - **Gelände- und Umgebungsmodelle (`src/modelle3d.js`):**
    - `felsModell` (804 Ecken, vorher 144): Granit-Felsmassiv mit steiler Schieferbruchwand, Quarzader-Einschlüssen, mehreren zerklüfteten Felszacken, Moosflechten in Fugen und einem Geröllsockel mit Felsblöcken. Der maximale Radius bleibt exakt bei $\le 0.96$, wodurch die $10\%$-Kollisionsgrenze strikt gewahrt bleibt.
    - `baumModell` (2.082 Ecken, vorher 144): Majestätischer Waldbaum mit 5 knorrigen Stützwurzeln, wetterseitigem Moosbelag am Stamm, organischem Stammknick, 4 ausladenden Astgabeln und 9-teiliger gestaffelter Laubkrone.
    - `fronAderModell` (840 Ecken, vorher 156): Steinbruch- und Schürfstätte mit Eichenholz-Stützbalken, Querträgern, Abraumrutsche, angelehnter Bergmanns-Spitzhacke und funkelnden Eisenerznuggets mit Reflexionsglanz.
    - `blutAderModell` (1.932 Ecken, vorher 156): Aufgerissener Obsidiankrater mit kochendem Götterblutsee, umschlungen von 6 dornigen Raubwurzeln mit Saftadern, 7 säulenförmigen Götterblut-Kristallspitzen und schwebenden Splittern im magischen Auftrieb.
    - `staubwolkeModell` (336 Ecken, vorher 72): 5-teilig bauschende Staubwolke mit abgestuften Erdtönen für Geschosseinschläge und Gebäudeeinstürze.
  - **Geländeanpassung (`src/gelaende3d.js`):**
    - Marschpfade blenden beim Annähern an Wasserflächen (`uferFade`) und Felsbarrieren (`felsFade`) organisch aus, um unschöne Überschneidungen auf Zufallskarten oder Uferlinien auszuschließen.
  - **Galerie (`src/galerie.js`):**
    - In der Ansicht „Effekte“ wird dem Modell nun die dynamische Zeitphase übergeben, sodass die Wasseroberfläche lebendig wellt und schimmert und Magieeffekte sanft pulsieren.
- **Wie geprüft:** `npm test` (137/137 Tests grün, alle Modelle innerhalb des Budgets), `npm run smoke` (2D, 3D, Galerie und Editor fehlerfrei; 60 FPS stabil).

### Runde 22: High-Res Upgrade der Schreine, Anker und Kultbauten (src/modelle3d.js)
- **Was war schwach:** Die Kult- und Ankerbauten (`grenzstein`, `banner`, `kapelle`, `skriptorium`, `hain`) waren mit 450–1.100 Ecken im Vergleich zu den Hauptgebäuden noch relativ sparsam modelliert.
- **Was wurde geändert:**
  - `grenzsteinModell` (1.752 Ecken, vorher 684): Getrepptes Achteck-Fundament mit Pflasterung, 4 markante Grenzpfosten mit durchhängenden schweren Eisenketten, wuchtiger Obelisk mit geschmiedeten Nietklammern, beidseitig gemeißelte und golden glimmende Schutzrunen sowie gusseiserner Standartenausleger mit wehendem Reichswimpel.
  - `bannerModell` (1.320 Ecken, vorher 564): Dreistufiges Werksteinfundament mit zwei lodernden Kohlen-Feuerkörben auf Schmiedeeisenständern, trophäenartiges Waffengestell am Sockel (Normannenschild und Breitschwert), massiver Bannerbaum mit Messingbeschlägen und prächtiges, herabwallendes Kriegsbanner mit goldenen Saumquasten und weißem Kreuzwappen.
  - `kapelleModell` (1.248 Ecken, vorher 600): Gotisches Gotteshaus mit 6 abgetreppten Strebepfeilern, spitzbogigem Portal mit eisenbeschlagener Eichentür, leuchtender Fensterrose, 4 seitlichen Lanzettfenstern, steilem Schieferdach und offenem gotischen Glockenturm mit Bronzeglocke und Turmkreuz.
  - `skriptoriumModell` (948 Ecken, vorher 474): Achteckiges Quadermauerwerk mit Fachwerk-Erker, Butzenscheibenfenster, beleuchtetem Lesepult mit aufgeschlagenem Folianten, Walmdach und angebautem rundem Bibliotheksturm mit eiserner Schreibfeder-Wetterfahne sowie Bücherregalnische mit ledergebundenen Büchern.
  - `hainModell` (2.232 Ecken, vorher 1.116): Drei knorrige, miteinander verwobene Urweiden mit mächtigen Stützwurzeln, Astgabeln und kaskadierenden Kronen mit Feen-Glanzlichtern; im Zentrum ein steingefasster Quellsee mit blühenden Seerosengruppen und einem schwebenden, grün-weiß leuchtenden Lebenskristall.
- **Wie geprüft:** `npm test` (137/137 Tests grün, Eckenbudgets strikt eingehalten), `npm run smoke` (2D, 3D, Galerie und Editor fehlerfrei; 60 FPS stabil).

### Runde 23: Universelle Zonen- und Geländegenerierung im 3D-Boden (src/gelaende3d.js)
- **Was war schwach:** Die Schattierung von Wald-, Wiesen- und Furtenzonen in `baueBoden()` hing an der Bedingung `if (istFlusstal)`. Eigene Karten aus Claudes neuem Karteneditor oder prozedurale Zufallskarten mit Wiesen- oder Waldzonen wurden dadurch ohne die entsprechenden Bodenverfärbungen gezeichnet, falls der Kartenschlüssel nicht explizit 'flusstal' hieß.
- **Was wurde geändert:**
  - In `src/gelaende3d.js` (`baueBoden`) wurden die Zonenprüfungen vollständig entkoppelt:
    - Waldzonen werden gerendert, sobald `waldKreise.length > 0` ist.
    - Wiesen/Lichtungen werden gerendert, sobald `wiesenKreise.length > 0` ist.
    - Kiesige Furten werden gerendert, sobald `furten.length > 0` ist.
    - Jede Karte — ob 'klassisch', 'flusstal', 'zufall' oder 'eigene' — erhält damit nahtlos und automatisch ihre korrekten Bodenfarben, Moosböden, sonnigen Wiesen und Furtübergänge.
- **Wie geprüft:** `npm test` (137/137 Tests grün), `npm run smoke` (2D, 3D, Galerie und Editor fehlerfrei; 60 FPS stabil).

### Runde 24: Das Totenreich (Der Todesgott) & Elite-Einheiten im Ordner erweiterungen/
- **Was war die Aufgabe:** Eigenständiges Entwerfen neuer Inhalte für das Spiel: Eine dritte vollwertige Fraktion, elitäre Einheiten für die bestehenden Reiche (Menschen & Waldgott) sowie Bereitstellung aller Konzepte, Simulationsdefinitionen, 3D-Modelle, SVG-Icons und 2D-Zeichenroutinen in einem separaten Erweiterungsordner (`erweiterungen/`).
- **Was wurde geschaffen:**
  - **Konzepte & Lore (`erweiterungen/README.md`, `KONZEPT_TOTENREICH.md`, `EINHEITEN_UND_GEBAEUDE.md`):**
    - **Der Todesgott (Das Totenreich / Die Knochenwacht):** Konsequente Fortführung der Spielphilosophie von *Die drei Reiche* (identische 3 Ressourcen, identische 10 Gebäuderollen, Drosselleiter). Das Alleinstellungsmerkmal liegt in der Anker-Wachstumsregel: Der Anker (`grabhuegel`) startet kompakt (140 m) und wächst ausschließlich durch Gefallene im Einflussbereich (+18 m Radius je Opfer).
    - Ausführliches Balancing, Drosselkaskade (Pestaltar als Zorn-Waffe fällt zuletzt, Katakombe als Werk fällt zuerst), Skillbaum mit 4 Ästen und Kommandantenfähigkeiten (`grabesklaelte`, `seelenernte`, `knochensturm`).
    - **Elite-Einheiten:**
      - Menschen: `paladin` (geheiligter Ritter), `wagenburg` (mobile Festung), `scharfschuetze` (Meisterschütze mit Windenarmbrust), `priester` (Feldkaplan mit Weihrauchaura).
      - Waldgott: `moosbaer` (Urvieh des Tiefwalds), `fluesterer` (Sporenschamane), `kronenhirsch` (Wächter des Gleichgewichts mit Tempoaura), `dornenhydra` (dreiköpfiges Wurzelmonstrum mit Flächenhieben).
  - **Simulations-Definitionen (`erweiterungen/sim_defs.js`):**
    - 1:1 kompatibel zu `src/sim/defs.js`: `TOD_FACTION`, `TOD_BUILDINGS` (10 Gebäude), `TOD_UNITS` (7 Einheiten), `ELITE_UNITS_MENSCH` (4 Einheiten), `ELITE_UNITS_GOTT` (4 Einheiten), `TOD_SKILLS` (14 Skills), `TOD_FAEHIGKEITEN` (3 Fähigkeiten).
  - **3D-Modelle (`erweiterungen/modelle.js`):**
    - 25 hochauflösende 3D-Modelle im Format von `src/modelle3d.js` (`['q', ...]`, `['z', ...]`), die den Standard von Waldgott G.2 Glutherz und den Runden 20–23 erfüllen.
    - Spektrales Seelenfeuer (`#38bdf8`), glühende Augen und Klingen (`GLUEHT`), Obsidianpanzerungen, Skelettrippen und Totenschädel.
  - **SVG-Icons (`erweiterungen/icons.js`):**
    - 28 handgefertigte Vektor-Icons (`viewBox="0 0 24 24"`, ohne feste Größenangaben am `<svg>`, ab 20 px lesbar, sichere SVGs).
  - **2D-Top-Down-Figuren (`erweiterungen/figuren2d.js`):**
    - `zeichneErweiterungEinheit2d` und `zeichneErweiterungGebaeude2d` zur präzisen und lebendigen Darstellung auf dem 2D-Spielfeld.
  - **Automatische Verifikation (`erweiterungen/test_erweiterungen.js`):**
    - Eigene Testsuite prüft alle Geometrien, Eckenbudgets ($\le 6000$ Einheiten, $\le 9000$ Gebäude), SVG-Vorschriften und 2D-Zeichenaufrufe.
- **Wie geprüft:**
  - `node erweiterungen/test_erweiterungen.js`: Alle 4 Test-Suites grün (0 Fehler).
  - `npm test`: Alle 137 Kern-Tests grün.
  - `npm run smoke`: Headless-Tests für 2D, 3D, Galerie und Editor fehlerfrei bestanden.

### Runde 25: Direkte Integration aller 25 neuen 3D-Modelle & 28 Icons in die Galerie (src/modelle3d.js, src/icons.js, src/galerie.js, src/galerie.html)
- **Was war schwach:** Die 25 neuen 3D-Modelle und 28 Icons waren zwar im Ordner `erweiterungen/` fertig definiert, aber noch nicht in der Live-Galerie (`dist/galerie.html`) interaktiv ansehbar.
- **Was wurde geändert:**
  - **`src/modelle3d.js`:** Alle 25 neuen Modelle (7 Einheiten + 10 Gebäude des Todesgottes, 4 menschliche Elite-Einheiten, 4 Waldgott-Elite-Einheiten) wurden vollständig in `MODELLE_DEF` registriert.
  - **`src/icons.js`:** Sämtliche 28 neuen SVG-Icons wurden in `ICONS` eingetragen.
  - **`src/galerie.html` & `src/galerie.js`:**
    - Zwei neue Hauptschaltflächen in der Navigation: „Totenreich (Todesgott)“ und „Elite-Einheiten“.
    - Vollständige 3D-Präsentation mit drehender Kamera, Fraktionsfarben (Aschgrau/Zyan für Tod, Gold für Menschen, Waldgrün für Gott) und Gehanimation-Unterstützung.
    - Die Ansicht „Icons“ zeigt nun alle 78 Icons (vorher 50).
- **Wie geprüft:**
  - `node erweiterungen/test_erweiterungen.js`: 4/4 Tests grün.
  - `npm test`: 137/137 Tests grün.
  - `npm run smoke`: Headless WebGL2, Canvas, Galerie (78 Icons, alle Ansichten) und Editor fehlerfrei bestanden.
