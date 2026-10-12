# Auftrag an Gemini: Resonit, Meilenstein 1 — Vanguard gegen Kranor

Der Nutzer hat entschieden, dass das Spiel **Resonit** wird. Grundlage ist
dein Kompendium, jetzt in `docs/resonit/kompendium.md`. Gebaut wird auf dem
Kern dieses Repos; der Plan steht in `docs/resonit/plan.md` (bitte ganz
lesen). Dein Ordner `resonit-scifi` bleibt Ideen- und Modellquelle. Dort
weiterzubauen ist nicht mehr nötig.

Die Fantasy-Runde 2 (`docs/umbau/auftrag-gemini.md`) entfällt. An
Menschen, Gott und Todesgott arbeitest du nicht mehr.

Arbeitsweise wie immer: ohne Rückfragen, selbst entscheiden, Protokoll
(`docs/grafik/protokoll.md`), kleine Commits, pushen auf `gemini/grafik`.
Vorher `git fetch && git merge origin/main`.

## Was du heute schon verwenden kannst

Der Kern hat die Systeme des Kompendiums schon. Die Schlüssel heißen seit
0.42 wie im Kompendium (Plan T2 ist erledigt):

| Resonit | Schlüssel in den Daten |
| --- | --- |
| Energie (Fluss, Netz, Drossel-Leiter) | `energieIn` (Verbrauch), `energieOut` (Erzeugung) |
| Masse | `cost.masse`, `masseOut` (Extraktor) |
| Resonit | `cost.resonit`, `resonitOut` (an Adern der Art `resonit`) |
| Netzknoten (Netz wächst um ihn) | Rolle `anker`, Feld `anchor`, Volksfeld `growth` |
| Drossel-Stufe eines Verbrauchers | `prio`: `PRIO.werk` (Fabrik) → `segen` → `wehr` (Schild) → `zorn` (Geschütz) |

Mechaniken, die nutzbar sind (`docs/umbau/stand.md`): Luft (`weapon.ziele`,
`fliegt`), Schild, Fernschlag und Abwehr (Bastille, Raketenabwehr),
Prototypen (`hoechstens`, Werkstatt), Regeneration, Auren, Flächenschaden,
Verlangsamen. Erlaubt sind nur Felder aus `FELDER`; `npm test` prüft das.

## Pakete

### S1 Daten: `src/sim/voelker/vanguard.js` und `kranor.js`

- Je Volk eine Datei nach dem Muster von `mensch.js` (`VOLK_VANGUARD`,
  `VOLK_KRANOR`), dann in **`src/sim/voelker/index.js`** hinten an
  `VOELKER` anhängen. Das Bundle nimmt neue Dateien von selbst mit.
- **Rümpfe mit fester Bestückung als normale Einheiten.** Module kommen
  erst mit Mechanik R3. Beispiele: Picket (leicht, Späher und Raids),
  Palisade (Rückgrat), Redoubt (schwer). Beim Kranor Auger, Ripper und
  Dragline. Wo eine Bestückung im Kompendium wichtig ist, darf es zwei
  Varianten eines Rumpfs geben (z. B. Palisade mit Kanone, Palisade mit
  Haubitze).
- **Rollen (R0 ist da):** Pflicht sind nur Gebäude `anker`, `kraft`,
  `masse`, `resonit`, `fabrik` und Einheiten `bauer`, `leicht`. Alles andere
  ist frei — besetze es nur, wo das Kompendium es vorsieht (`turm`, `flak`,
  `schild`, `luftfabrik`, `schlag`, `abwehr`, `werkstatt`, `prototyp` …).
  Schreine (`zorn`, `wehr`) und `forschung` braucht Resonit nicht. Die
  Lücken des Kompendiums gelten, z. B. hat der Kranor **keine** Jäger und
  Bomber. Fehlen `fern` oder `schwer`, mischt die KI ihr Heer aus allem, was
  die Fabrik ausbildet — halte die `buildList` also bewusst.
- **Kommandant:** je Volk ein Kommandant (ACU-artig, baut). Dazu eine
  Domäne (`growth`), Werte nach dem Muster der Fantasy-Völker.
- **Kein Tech-Baum:** `skills` darf leer sein (`{}`), `lernen: []`.
  Freischaltungen gibt es nicht, alles ist ab Minute eins baubar.
- **Ist-Werte:** `node tools/istwerte.mjs` zeigt die Werte der
  Fantasy-Völker als Maßstab. Schreib Werte nie aus dem Gedächtnis ab.
- **Messen:** `node tools/sweep.mjs 36 45 Ausgang stile voelker=vanguard-kranor`,
  Ziel 45–55 %. Das Ergebnis kommt vollständig ins Protokoll. Gegen die
  Fantasy-Völker musst du nicht messen.

### S2 Grafik für Vanguard und Kranor

Für jede Einheit und jedes Gebäude ein Modell in `src/modelle3d.js`, ein
Icon und eine 2D-Figur, im Stil von `GEMINI.md` → „Stil Resonit“. Rümpfe
müssen aus großer Höhe an der Silhouette erkennbar sein. Teamfarbe
sichtbar. Budgets wie bisher. Modelle aus `resonit-scifi` darfst du ins
Format von `src/modelle3d.js` übertragen.

### S3 Galerie

Eine Ansicht je neuem Volk mit allen Gebäuden und Einheiten.

### S4 Wünsche (nicht selbst bauen)

Was Oberfläche oder Mechanik braucht, gehört nach `docs/grafik/wuensche.md`.
Dazu gehören Begriffe wie „Energie“ statt „Gegenwart“ in der Anzeige (das
macht Claude mit T1), Menüeinträge für die neuen Völker und Ressourcen-Icons
im Sci-Fi-Stil (die Icons `energie`, `masse`, `resonit` darfst du
gleich neu zeichnen: Blitz, Masse-Barren, Kristall).

## Abnahme durch Claude

Tests und Smoke grün, Shader im Browser geprüft, Messung mit 36 × 45 im
Protokoll, Ist-Werte nicht erfunden. Was davon fehlt, geht zurück.
