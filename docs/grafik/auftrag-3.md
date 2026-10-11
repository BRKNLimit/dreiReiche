# Auftrag 3 für Gemini: Karten, Draufsicht, Effekte, Feinschliff

Der Nutzer schläft, während du arbeitest. **Niemand kann eine Rückfrage
beantworten.** Jede Frage, jedes „Soll ich …?“, jedes Warten auf Erlaubnis
hält die Arbeit bis zum Morgen an. Darum:

- **Frag nie. Warte nie. Bestätige dir nichts.** Du darfst alles, was in
  `GEMINI.md` als deine Dateien steht, ändern, testen, committen und pushen.
- Ist etwas unklar, entscheide selbst, schreib die Entscheidung ins
  Protokoll und mach weiter.
- Bündle Befehle: `npm test && npm run smoke` als *ein* Aufruf;
  `git add … && git commit -m "…" && git push` als *ein* Aufruf.
- Du bist erst fertig, wenn alle zehn Aufgaben erledigt sind. Danach gehst du
  von vorn durch und verbesserst weiter, solange dein Budget reicht.

## Zuerst

1. `git fetch && git merge origin/main` — Claude hat neue Andockstellen
   gebaut (siehe unten). Es gibt keine Konflikte, deine Dateien sind getrennt.
2. Lies `GEMINI.md` **neu und vollständig** (sie hat sich geändert), dann
   diese Datei, `docs/grafik/rueckmeldung.md` und `docs/grafik/wuensche.md`.

## Neue Andockstellen von Claude (schon eingebaut)

| Was | Wo | Was du tust |
| --- | --- | --- |
| 2D-Figuren | `src/figuren2d.js` (**gehört jetzt dir**) | `zeichneEinheit2d(...)`, `zeichneGebaeude2d(...)` — liefern `true`, wenn sie gezeichnet haben; sonst zeichnet `ui.js` Dreieck/Quadrat. Parameter im Kopf der Datei. |
| Baugerüst | `ui3d.js` zeichnet `MODELLE.baugeruest` auf jeder Baustelle (Maßstab = Gebäuderadius) | Modell `baugeruest` in `MODELLE_DEF` |
| Trümmer | `ui3d.js` zeichnet `MODELLE.truemmer` 45 s lang, wo ein Gebäude zerstört wurde | Modell `truemmer` |
| Gefallene | sinken 1,6 s zu Boden und verblassen (fertig) | nichts |
| Geschosse | `src/effekte.js` nimmt `bolzen`, `dorn`, `lichtpfeil`, `glutball`, wenn es sie gibt | vier Modelle, Spitze nach +z wie `pfeil` |
| Bäume je Karte | `ui3d.js` ruft nach einem Kartenwechsel `baueDeko()` auf, falls es die Funktion gibt (wie `baueBoden()`) | `DEKO` in `gelaende3d.js` als `let` und `export function baueDeko()`, die `KARTE` liest |
| Jahreszeiten | `ui3d.js` wählt `waldgeist_fruehling` … `_winter` je Einheit | (fertig) |

## Aufgaben

**1. Karte „Flusstal“ zeichnen** (2D und 3D). Daten in `KARTEN.flusstal`
(`src/sim/defs.js`, nur lesen); im Spiel ist `KARTE` immer die gespielte
Karte (`karteWaehlen()`), in 2D liest du `world.hindernisse`. Skizze:
`docs/bilder/Maps/Map1.png`.
- Der **Fluss** sind Wasserkreise mit `fluss: true` in einer Kette — zeichne
  ihn als *einen* zusammenhängenden Fluss mit Ufern und Strömung, nicht als
  Seenkette.
- **Furten** (`KARTE.furten`): flacher, heller Übergang mit Kies und Steinen.
- **Wald** (`KARTE.wald`, Kreise): dichter Wald aus vielen Bäumen; **Wiesen**
  (`KARTE.wiesen`): hell, Blumen. Nur Optik.
- Bäume (`DEKO`) und der Marschpfad folgen der gewählten Karte (`baueDeko()`),
  nie mehr im Wasser oder auf Felsen. Auf dem Flusstal führt der Pfad über
  die Furten.
- *Fertig, wenn:* Beide Karten sehen in 2D und 3D stimmig aus, Kanten
  weichen höchstens 10 % von den Kreisen der Simulation ab.

**2. Draufsicht mit echten Figuren** (`src/figuren2d.js`). Statt Dreiecken
und Quadraten: jede Einheit und jedes Gebäude als kleine Figur von oben —
klar an der Form erkennbar (Bauer mit Hut, Soldat mit Schild, Wolf, Ent als
Baumkrone …), Volksfarbe sichtbar, Baustellen halb durchsichtig mit Gerüst,
Gebäude ohne Gegenwart dunkler. Bei kleinem Zoom einfache Formen, bei großem
mehr Einzelheiten. *Fertig, wenn:* In `dist/resonit.html` erkennt man jede
Einheit bei normalem Zoom an der Form.

**3. Geschosse:** `bolzen` (schwerer Holzbolzen, Eisenspitze), `dorn`
(grüngoldener Dorn), `lichtpfeil` (leuchtender Pfeil, `GLUEHT`), `glutball`
(glühende Kugel mit Schweif, `GLUEHT`).

**4. Baugerüst und Trümmer:** `baugeruest` (Holzgerüst mit Leitern, passt um
ein Gebäude vom Radius 1), `truemmer` (Schutt, Balken, Steine, flach).

**5. Ent nach Vorlage:** deutlich größer und hagerer — sehr lange Beine und
Arme, Astgeweih an Schultern und Kopf, Moos, leere glimmende Augen
(`Ent-Vorlage.webp`). Er soll neben dem Wolf wie ein Riese wirken.

**6. Wasser:** Seen und Fluss mit bewegter Oberfläche (Wellen, Glanz), Ufer
mit Schilf; im Shader, prozedural, offline.

**7. Material und Licht:** prozedurale Oberflächen (Holzmaserung, Stein,
Rinde, Fell) über Farbverläufe je Ecke oder Rauschen im Shader; dunkler am
Boden (Kontaktschatten), weiche Schatten unter Einheiten und Gebäuden.
Leistung: 60 Bilder/s mit 300 Einheiten.

**8. Icons für die Bedienung:** `ton` (Lautsprecher), `stumm`, `hilfe`,
`wiederholung` (Filmrolle oder Kreispfeil), `sammelpunkt` (Fahne),
`steuergruppe` — Claude baut sie danach in die Leiste ein. Gleicher Stil wie
die übrigen Icons.

**9. Galerie:** eine Ansicht „Karten“ mit beiden Karten als Übersicht, eine
„Effekte“ mit allen Geschossen, Baugerüst und Trümmern.

**10. Feinschliff im Spiel:** Spiel `dist/drei-reiche-3d.html` (nicht nur
die Galerie) — jede Einheit aus Spielhöhe an der Silhouette erkennbar,
Größenverhältnisse stimmig (Ent und Waldgott riesig, Rabe klein), nichts
flackert oder schwankt.

Nach **jeder** Aufgabe: `npm test && npm run smoke`, Protokoll in
`docs/grafik/protokoll.md`, Commit, Push. Dann sofort die nächste Aufgabe.
Brauchst du von Claude etwas (anderer Aufruf, andere Daten): Eintrag in
`docs/grafik/wuensche.md` und **weitermachen** mit dem, was ohne geht.
