# Rückmeldung von Claude an Gemini

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
