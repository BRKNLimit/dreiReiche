# Auftrag an Gemini: Umbau der Völker (dein Anteil: 60 %)

Lies zuerst `docs/umbau/konzept.md` ganz — das ist der Rahmen. Der Nutzer
will, dass die drei Völker sich deutlich verschieden spielen: gleiche Basis
(Rollen), Unterschiede durch Spezialisierung, großen Tech-Baum, eigene
Einheiten, Gebäude und Prototypen. Sonnet baut die Mechaniken (M1–M8),
Claude prüft und merged. **Du machst die Inhalte und die ganze Grafik.**

Arbeitsweise wie immer: ohne Rückfragen, selbst entscheiden, ins Protokoll
schreiben (`docs/grafik/protokoll.md`), kleine Commits, pushen auf
`gemini/grafik`. Vorher `git fetch && git merge origin/main` — **wichtig**:
dort liegt die neue Datenstruktur (`src/sim/voelker/`) und der Shader-Fix,
ohne den deine Galerie schwarz bleibt.

## Was bisher schief ging — bitte diesmal anders

Beim Todesgott-Entwurf standen Felder in den Werten, die das Spiel nicht
kennt (Heilung, Auren, Flächenschaden …), das Konzept widersprach den eigenen
Zahlen, und die Balance war ungemessen (48 : 22). Deshalb gilt jetzt:

1. **Nur Felder aus `FELDER`** (`src/sim/defs.js`). `npm test` prüft das in
   `test/daten.test.js` — ist er rot, wirkt dein Inhalt nicht. Welche
   Mechaniken schon nutzbar sind, steht in **`docs/umbau/stand.md`**; alles
   andere ist erst Entwurf.
2. **Messen statt schätzen:** Jede Werteänderung mit
   `node tools/sweep.mjs 36 45 Ausgang stile voelker=a-b` messen (alle drei
   Paarungen: `mensch-gott`, `tod-mensch`, `tod-gott`). Ziel: jede Paarung
   zwischen 45 und 55 %. Ergebnis ins Protokoll.
3. **Shader im echten Browser prüfen** (Konsole), nicht nur Smoke-Tests.

## Pakete

### G1 Grafik für die neue Basis (sofort, größter Teil)

Für **jedes der drei Völker** Modell (G.2-Niveau, hell und lesbar aus
Spielhöhe, Volksfarbe sichtbar), Icon und 2D-Figur für:

- Gebäude der neuen Rollen: `luftfabrik`, `flak`, `schild`, `umwandler`,
  `werkstatt`, `schlag`, `abwehr`, dazu `posten` für Gott und Todesgott.
- Einheiten: `luftjaeger`, `bomber`, `prototyp` (ein Prototyp je Volk).
- Effekte: Schildkuppel (halbtransparent, `schildkuppel`), Fernschlag
  (Geschoss `fernschlag`, Einschlag), Flak-Geschoss (`flak`).

Schlüssel (Namen der Modelle/Icons) wählst du selbst, deutsch,
klein geschrieben, eindeutig über alle Völker hinweg (z. B. Menschen
`ballonhalle`, Gott `nistbaum`, Tod `gruftturm`) — und trägst sie in deinen
Inhaltsentwurf (G2) ein. Die Richtung je Volk steht in Konzept Abschnitt 3.

Außerdem: **Totenreich-Modelle auf G.2-Niveau** (sie sind deutlich gröber
als der Rest und dunkel auf dunklem Grund) und die 2D-Figuren des
Totenreichs aus `erweiterungen/figuren2d.js` nach `src/figuren2d.js`
übernehmen (Claude passt danach das Bundle an).

### G2 Inhaltsentwurf je Volk (sofort, parallel zu G1)

Je Volk eine Datei `docs/umbau/entwurf-mensch.md`, `…-gott.md`, `…-tod.md`:

- Für jede Rolle der Basis: Schlüssel, Name, Zweck, Werte (hp, Kosten,
  Waffe …) — mit Begründung im Vergleich zu vorhandenen Einheiten.
- Volkseigenes: Einheiten, Gebäude, Prototyp — was macht das Volk anders?
- Tech-Baum: vier Äste (Einheiten, Gebäude, Verbesserungen, Kommandant),
  je 6–8 Knoten, mit `braucht`, `kosten`, `frei`/`wirkung`.
- Jedes Feld markiert: **[da]** gibt es schon (in `FELDER`), **[Mx]** kommt
  mit Mechanik Mx (Konzept Abschnitt 2). Erfinde keine Felder außerhalb des
  Konzepts; brauchst du etwas Neues, schreib es als Wunsch in
  `docs/grafik/wuensche.md`.

Der Nutzer nickt die Entwürfe ab, bevor sie ins Spiel kommen.

### G3 Inhalte ins Spiel (sobald `docs/umbau/stand.md` die Mechanik freigibt)

In `src/sim/voelker/<volk>.js` eintragen, was abgenickt und freigegeben
ist — `rollen` und `lernen` mit pflegen, `npm test` grün, Balance gemessen
(siehe oben). Bestehende Werte änderst du nur mit Messung im Protokoll.

### G4 Galerie und Kodex

Galerie: eine Ansicht je Volk mit allen Gebäuden und Einheiten (alt und
neu). Kodex-Texte sind die `desc`-Felder in den Volksdateien — kurz,
anschaulich, ohne Zahlen (die setzt die Oberfläche dazu).

## Abnahme durch Claude

Tests und Smoke grün, Shader im Browser geprüft, `test/daten.test.js` grün,
Messungen im Protokoll. Was davon fehlt, geht zurück.
