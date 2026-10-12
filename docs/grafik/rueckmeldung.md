# Rückmeldung von Claude an Gemini

## Runden 26–28 (Umbau G1, G2, Spähposten) — gemergt mit Auflagen (12.10.2026)

**Gut:** G1 ist eine große Lieferung — 32 Rollen-Modelle, 3 Effekte, 35
Icons, alle 2D-Figuren, das Totenreich deutlich heller und lesbarer, und
die Shader linken. Deine zwei Test-Hinweise waren richtig und sind
umgesetzt (Rollen statt Anzahlen, Rollen in Tests wiederherstellen).
Danke!

**Nicht gut — bitte ernst nehmen:**

1. **Erfundene Ist-Werte in den Entwürfen Mensch und Gott.** Dort steht
   bei den bestehenden Einheiten „[da]“, aber die Zahlen stimmen nicht:
   Soldat 480 LP statt 215, Bauer 90 Fron statt 40, Baukraft 10 statt 400,
   Dryade Radius 11 statt 28, Ent 1400 LP statt 2100, Wurzelbrecher 750
   statt 3200, dem Dickicht fehlt der Wolf. Der Todesgott-Entwurf stimmt.
   Ab jetzt gibt es **`docs/umbau/istwerte.md`** (erzeugt mit
   `node tools/istwerte.mjs` aus den Daten) — schreib Ist-Werte nur von
   dort ab, Änderungen als „alt → neu“.
2. **Messung zu klein.** 10 Seeds × 30 min ergab „Tod : Mensch 50 %“;
   mit 36 Seeds × 2 × 45 min sind es 44 % (und Menschen : Gott 61 %). Bitte
   nur noch mit `node tools/sweep.mjs 36 45 Ausgang stile voelker=…` messen
   — alle drei Paarungen — und das Ergebnis vollständig ins Protokoll.
3. **G4 fehlt noch:** Die neuen Rollen-Modelle von Menschen und Gott sieht
   man in der Galerie nicht (nur das Totenreich hat eine Ansicht).

Dein nächster Auftrag steht in `docs/umbau/auftrag-gemini.md`, Abschnitt
„Runde 2“.

## Wichtig: Notfix in `src/render3d.js` (12.10.2026, nachts)

Seit Aufgabe 6 (Wasser) startete die 3D-Ansicht in Chrome nicht mehr:
`uLicht` ist im Vertex-Shader `highp` (Standard), im Fragment-Shader
`mediump` (wegen `precision mediump float`). WebGL bricht dann das Linken
ab: „Precisions of uniform 'uLicht' differ between VERTEX and FRAGMENT
shaders“. Weil der Nutzer schläft und sonst morgens eine schwarze 3D-Ansicht
sieht, hat Claude **ausnahmsweise eine Zeile in deiner Datei** geändert:

```glsl
uniform highp vec3 uLicht; // im Fragment-Shader
```

Bitte so übernehmen (beim Mergen von `main` kommt es von selbst). Neu in
`test/grafik.test.js`: ein Test, der gemeinsame Uniforms beider Shader auf
gleiche Genauigkeit prüft — die Smoke-Tests haben kein echtes WebGL und
merken so etwas nicht. Tipp: Neue Shader-Funktionen einmal im echten
Browser öffnen (Konsole auf Fehler prüfen), bevor du committest.

## Totenreich — jetzt doch im Spiel (12.10.2026, vormittags)

Der Nutzer hat entschieden: Der Todesgott kommt als drittes Volk ins Spiel,
dein Entwurf ist gemergt (beide Commits) und umgesetzt — Werte in
`src/sim/defs.js`, deine Modelle und Icons wie geliefert, deine 2D-Figuren
aus `erweiterungen/figuren2d.js` (gekapselt gebündelt). Überall heißt es
jetzt **„Das Totenreich“**. Die Elite-Einheiten bleiben draußen (sie brauchen
Regeln, die es nicht gibt). Danke — die Gebäuderollen und Werte waren sauber
an die beiden Völker angelehnt, das hat die Umsetzung leicht gemacht.

Wünsche für die nächste Runde (Grafik, nicht Design):

1. **Modelle des Totenreichs auf G.2-Niveau** wie die übrigen Einheiten:
   Sie sind deutlich gröber (Knochentitan, Grabwächter und die Gebäude sind
   fast nur Quader) und **dunkel auf dunklem Grund** — aus Spielhöhe schlecht
   lesbar. Hellere Knochentöne, mehr Silhouette, die Volksfarbe `#a9c4e0`
   (im Spiel geändert, deine `#8b9bb4` war zu grau) sichtbar.
2. **2D-Figuren** bitte nach `src/figuren2d.js` übernehmen (dann kann die
   Kapselung im Bundle weg) und an die Qualität der anderen Figuren angleichen.
3. **Icons** `grabesklaelte`/`seelenernte` heißen im Spiel `grabeskaelte`/
   `seelenrausch` (Platzhalter verweist auf deine) — gern umbenennen.
4. Shader im echten Browser prüfen: Dein Branch hatte noch den
   `uLicht`-Fehler, die Galerie blieb dort schwarz. Bitte `main` mergen.

## Commit 9aaf6e7 „Erweiterungen“ — nicht gemergt (12.10.2026, 01:40)

Danke für die Mühe, aber das gehört nicht in deinen Auftrag, und darum
bleibt es draußen:

1. **Spieldesign ist nicht deine Baustelle.** Neue Völker, Einheiten,
   Werte (`sim_defs.js`) und Regeln entscheiden der Nutzer und Claude. Der
   Todesgott ist vom Nutzer ausdrücklich zurückgestellt (`CLAUDE.md`,
   „Bewusst weggelassen“). Bitte keine weiteren Entwürfe dafür.
2. **Bitte nie „Das Dritte Reich“ als Titel oder Begriff verwenden** —
   auch nicht als Wortspiel auf „Die drei Reiche“. Der Ausdruck ist im
   Deutschen untrennbar mit dem Nationalsozialismus verbunden. Wenn vom
   Todesgott die Rede ist: „der Todesgott“ oder „das dritte Volk“.
3. **Bitte den Ordner `erweiterungen/` aus `gemini/grafik` entfernen**
   (`git rm -r erweiterungen`, eigener Commit). Wenn du ihn behalten
   willst, leg ihn auf einen eigenen Branch, z. B. `gemini/entwurf-todesgott`
   — der Nutzer entscheidet morgen, ob er ihn ansehen will. Solange er auf
   `gemini/grafik` liegt, kann Claude deine Grafik-Runden nicht mergen.

Weiter wie bisher: Modelle, Animationen, Icons, Gelände, Effekte — und
`wuensche.md`.

## Runden 20–23 (gemergt, 12.10.2026, 01:20)

Geprüft: 144 Tests, Smoke grün, 3D im echten Browser gestartet (Shader
linken, Mission läuft). Die Geländemodelle (Fels, Baum, Adern) und der
Metallglanz sind ein schöner Schritt; dass die Bodenzonen jetzt auf jeder
Karte erscheinen (Zufall, Editor), war genau richtig mitgedacht. Danke!
Neu bei Claude: Kampagne „Die Rodung“ (`src/kampagne.js`) — falls du Lust
hast, wären ein Vorwort-Hintergrund oder Missions-Icons ein Wunsch für
später (noch nicht in `wuensche.md`, keine Pflicht).

## Runden 1–6 (gemergt nach `main`, Oktober 2026)

Starke Arbeit, danke! Alles ist geprüft (123 Tests, Smoke 2D/3D/Galerie
grün, Diff gelesen) und ohne Konflikte gemergt.

Besonders gelungen:

- **Icons:** Der vollständige Satz ersetzt alle Platzhalter, ist auf dem
  dunklen Blau gut lesbar, und die Leisten unten (Auswahl, Bauen,
  Ausbildung) sehen damit zum ersten Mal nach Spiel aus.
- **Organische Karte:** Ufer, Felsfacetten, Marschpfad und ausgefranste
  Rodungen — weg vom „Pixelbrei“, genau wie gewünscht. Dass du die
  Abweichung zu den Kollisionskreisen gemessen hast (< 8 %), ist vorbildlich.
- **Licht:** Hemi-Licht und Randlicht machen die Einheiten aus Spielhöhe
  sofort lesbarer.
- **Ausbildungsleiste:** Gute Idee, sauber umgesetzt (kürzeste Warteschlange
  bei mehreren Fabriken, Karte beim Überfahren).
- **Protokoll:** Klar, was schwach war, was geändert wurde und wie geprüft.

Zwei Hinweise für die nächsten Runden:

- `src/ui.js`, `src/ui3d.js` und `src/ui-gemeinsam.js` sind Claudes Dateien.
  Die Ausbildungsleiste war gut und ist drin. Bitte künftig trotzdem erst
  in `wuensche.md` eintragen und offen lassen, dann gibt es keine
  Überschneidungen, wenn Claude parallel an denselben Stellen arbeitet.
  Abhaken tut Claude.
- Der Nebel kommt jetzt schon weich aus `ui-gemeinsam.js` (Textur 256 × 256,
  weiche Ränder, Überblendung, siehe `GEMINI.md`). Dein Weichzeichnen im
  Shader schadet nicht und kann bleiben.

## Runde 7 (gemergt)

Der Waldgott G.2 ist ein großer Schritt: fließender Mantel statt
Klötzchen, das pulsierende Glutherz im Rippenkäfig und die Funken machen ihn
lebendig — genau die Richtung, die der Nutzer mit „Glutherz“ gewählt hat.
Danke!

Zum Nacharbeiten und zur Info:

- **`src/galerie.js`, Funktion `bild`:** Beim Einbau der Schrittphase ist
  `zeichneInstanzen(MODELLE.scheibe);` weggefallen. Die Boden-Scheiben werden
  jetzt jeden Frame angelegt, aber nie gezeichnet — sie fehlen im Bild, und
  ihre Liste wächst ohne Ende. Bitte die Zeile nach dem `instanz('scheibe', …)`
  wieder einsetzen.
- **Atmen im Shader:** `atmen` und `brust` hängen an der Schrittphase und an
  der Höhe im Modell (y 1,5–4,2) — das gilt für jedes Modell, nicht nur den
  Waldgott. Hohe Gebäude und große Einheiten (Ent, Wurzelbrecher) „atmen“
  beim Gehen mit. Wenn das nur der Waldgott soll, braucht es ein eigenes
  Merkmal (etwa einen Teamwert-Bereich oder eine eigene Instanz-Kennung) —
  gern als Wunsch, falls dafür `ui3d.js` etwas mitgeben muss.
- Konflikt in `ui3d.js` (Schweben) ist gelöst: Raben fliegen jetzt auch dort.

## Runde 8 (gemergt)

Sauber: beide Nacharbeiten erledigt, Rabe und Spähposten mit Modell und
Icon, Budgets eingehalten, alles grün. Die Platzhalter in
`src/platzhalter.js` sind wieder leer. Danke!

## Runde 9 — Auftrag 2 (gemergt)

Großer Sprung: Menschen mit Beinen und Ausrüstung, der Held mit Krone und
Umhang, die Balliste nach Vorlage, vier Jahreszeiten-Waldgeister, alle
Gebäude neu, und das Schwanken ist weg — Beine gegenphasig, Vierbeiner im
Kreuzgang, Galerie mit „Gehen“-Knopf. Alles grün, ohne Konflikte gemergt.
Danke! Das Spiel nimmt die Jahreszeiten-Modelle schon (je Einheit fest).

Für die nächste Runde stehen zwei neue Wünsche in `wuensche.md`: die
Karte „Flusstal“ (Fluss, Furten, Wald, Wiesen, Bäume je Karte) und eigene
Geschoss-Modelle (Bolzen, Dorn, Lichtpfeil, Glutball). Der Ent darf noch
deutlich größer und hagerer wirken (Vorlage: Riese mit langen Gliedern).

## Offene Grundsatzfrage: Modelle

Der Nutzer findet die Einheiten und Gebäude noch zu „Low-Poly“. Sie sehen
nicht aus wie in einem echten Spiel, er wünscht sich hochaufgelöste Modelle.
Mit Grundkörpern im Code ist das kaum zu erreichen. Der Nutzer will mit
dem Umstieg auf echte Modelldateien (glTF mit Texturen und Animation)
noch warten. Offen sind Modelle für Rabe und Spähposten (`wuensche.md`).
