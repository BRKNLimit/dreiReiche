# Die drei Reiche — Regeln für Gemini (Grafik und Inhalte)

Du arbeitest an einem RTS-Prototyp im Browser: Menschen gegen den Wald- und
Wiesengott, WebGL 2 ohne Bibliothek, alles läuft offline aus einer HTML-Datei.
**Du bist für Grafik und Inhalte zuständig** (60 % des Umbaus der Völker).
Claude (Technik, Prüfung, Merges) und ein Sonnet-Agent (Mechaniken) arbeiten
parallel in anderen Dateien. Den aktuellen Auftrag findest du in
**`docs/umbau/auftrag-gemini.md`**, den Rahmen in `docs/umbau/konzept.md`,
was schon nutzbar ist in `docs/umbau/stand.md` (erledigt:
`docs/grafik/auftrag*.md`). Drei Völker: Menschen, Wald- und Wiesengott,
Todesgott.

**Lies diese Datei zu Beginn jeder Sitzung neu** — nach
`git fetch && git merge origin/main`. Sie ändert sich zwischen den Runden.

## Arbeitsweise: ohne Rückfragen

**Frag nie, ob du etwas tun darfst, und warte nie auf Bestätigung.** Der
Nutzer ist oft nicht da (er schläft, während du arbeitest) — jede Rückfrage
hält die Arbeit bis zum Morgen an. Das gilt für alles: Dateien ändern,
Tests laufen lassen, committen, pushen, die nächste Aufgabe anfangen. Sätze
wie „Soll ich …?“ oder „Darf ich …?“ gibt es nicht; „Ich mache jetzt …“ und
dann tun. Du arbeitest in deinem
eigenen Ordner auf deinem eigenen Branch; Claude prüft alles vor dem Merge —
Fehler sind billig. Entscheide selbst, schreib die Entscheidung ins
Protokoll, mach weiter. Bündle Befehle: `npm test && npm run smoke` als ein
Aufruf, `git add … && git commit -m … && git push` als einer. Lies Dateien mit
deinen Lese-Werkzeugen statt mit Shell-Befehlen.

## Befehle

```bash
npm test          # alle Tests, auch test/grafik.test.js (Modelle, Icons)
npm run smoke     # baut dist/*.html und fährt 2D, 3D und Galerie headless
npm run galerie   # nur die Galerie bauen und prüfen
```

Ansehen: `dist/galerie.html` (Stil-Auswahl, Modelle, Icons),
`dist/drei-reiche-3d.html` (das Spiel in 3D), `dist/resonit.html` (2D).
Kein `npm install` nötig, keine Abhängigkeiten.

## Deine Dateien — nur diese änderst du

| Datei | Inhalt |
| --- | --- |
| `src/modelle3d.js` | Alle 3D-Modelle (`MODELLE_DEF`) und die Waldgott-Varianten (`WALDGOTT_VARIANTEN`) |
| `src/render3d.js` | Renderer: Geometrie, Shader, Licht, Instanzen |
| `src/gelaende3d.js` | Boden, gerodete Flächen, Seen, Felsen, Adern, Bäume in 3D |
| `src/gelaende2d.js` | Boden, gerodete Flächen, Felsen, Seen in der 2D-Draufsicht |
| `src/icons.js` | Alle Icons als SVG |
| `src/figuren2d.js` | Einheiten und Gebäude in der 2D-Draufsicht (`zeichneEinheit2d`, `zeichneGebaeude2d`) |
| `src/galerie.js`, `src/galerie.html` | Die Galerie |
| `docs/grafik/` | Dein Protokoll, deine Wünsche an Claude, Stil-Notizen |
| `docs/bilder/` | Bilder (Screenshots, Vorlagen) |
| `src/sim/voelker/*.js` | **Inhalte** der drei Völker (Gebäude, Einheiten, Skills, Rollen) — nur mit Feldern aus `FELDER` und nur, was `docs/umbau/stand.md` freigibt |
| `docs/umbau/entwurf-*.md` | Deine Inhaltsentwürfe je Volk |
| `erweiterungen/` | Dein Todesgott-Entwurf (Archiv) |

**Nicht anfassen:** `src/sim/**` außer `src/sim/voelker/` (deterministische Simulation), `src/ui.js`,
`src/ui3d.js`, `src/ui-gemeinsam.js`, `src/shell*.html`, `test/grid.test.js`,
`tools/**`, `package.json`, `CLAUDE.md`, `README.md`, `CHANGELOG.md`.
Brauchst du dort etwas (neuer Uniform, neuer Aufruf, andere Daten), trag es
in `docs/grafik/wuensche.md` ein — Claude setzt es um.

## Schnittstellen — die dürfen nicht brechen

**`src/modelle3d.js`**
- `MODELLE_DEF` braucht jeden Schlüssel aus `UNITS` und `BUILDINGS`
  (`src/sim/defs.js`) und dazu `scheibe`, `fronAder`, `blutAder`, `baum`,
  `pfeil`, `kugel`, `stein`, `fels`, `staubwolke`. Neue Schlüssel sind erlaubt.
- Ein Modell ist eine Liste von Teilen
  `[form, masse, position, farbe, team, drehung]`:
  `'q'` Quader `[b, h, t]`, `'z'` Zylinder/Kegel `[rOben, rUnten, h, segmente]`,
  `'k'` Kugel `[r, segmente]`, `'s'` Scheibe `[r, segmente]`;
  Farbe immer `'#rrggbb'`; `team` 0..1 = Anteil der Fraktionsfarbe,
  `GLUEHT` (2) = leuchtet selbst; Drehung `[rx, ry, rz]` in Bogenmaß.
- y ist oben, Modelle schauen entlang **+z**. Maßstab 1 = Radius der Einheit
  bzw. des Gebäudes. Füße bzw. Fundament bei y = 0.
- Budget: höchstens 6000 Ecken je Einheit, 9000 je Gebäude (prüft der Test).
  Ein Heer hat Hunderte Einheiten — kein Detail, das man aus Spielhöhe nicht
  sieht.

**`src/render3d.js`** — diese Namen nutzt `src/ui3d.js` und dürfen bleiben,
wie sie sind: `DM`, `HEX`, `NEBEL`, `m4mul`, `m4persp`, `m4look`, `m4inv`,
`baueModell`, `ladeModell`, `initGL`, `instanz(key, x, y, z, rot, scale, team,
yScale, hell, alpha, schritt)`, `zeichneInstanzen(m, behalten)`, `MODELLE`,
`PROG`, `PROG_L`, `bodenModell`, `linienVao`, `linienPuffer`. Der Shader `PROG`
braucht weiter die Attribute 0–5 (Ecke: Position, Normale, Farbe+team;
Instanz: 12 Floats) und die Uniforms `uVP`, `uLicht`, `uNebel`, `uRoentgen`
(1 = verdeckte Einheit als Umriss in Teamfarbe), `uSicht` (Nebel des
Krieges, R8-Textur 256 × 256 auf Einheit 0, linear gefiltert, schon mit
weichen Rändern und Überblendung: 1 = sichtbar, 0,47 = erkundet, 0 = unbekannt)
und `uKarte` (Kartengröße in m). Wie du daraus Licht, Material und Nebel berechnest, ist deine Sache.

**`src/gelaende3d.js`** — `baueBoden()`, `DEKO`, `zeichneBoden(world)`,
`zeichneGelaende(world, now)`. **`src/gelaende2d.js`** — `drawGrid(W, H)`,
`drawCleared()`, `drawHindernisse()`.
Felsen und Seen kommen aus `world.hindernisse` (Kreise mit `x`, `y`, `r` in
Dezimetern, `art: 'fels' | 'see'`). **Die Kreise sind die Wahrheit:** Einheiten
laufen genau bis an ihren Rand. Organisch aussehen darf es, aber die
sichtbare Kante darf nicht mehr als etwa 10 % vom Kreis abweichen.

**`src/icons.js`** — `ICONS` braucht `skillpunkte`, `gegenwart`,
`goetterblut`, `fron`, jeden Schlüssel aus `UNITS`, `BUILDINGS` und
`FAEHIGKEITEN`. Jedes Icon: SVG-String mit `viewBox="0 0 24 24"`, ohne
`width`/`height` am `<svg>`, ohne Skripte und externe Verweise.

## Regeln

1. **Vor jedem Commit:** `npm test` und `npm run smoke` grün. Nie mit roten
   Tests committen.
2. **Eigener Arbeitsordner `drei-reiche/resonit-gemini`** (git worktree auf
   dem Branch `gemini/grafik`); Claude arbeitet in `drei-reiche/resonit` auf
   `main`. Wechsle nie den Branch und arbeite nie im Ordner von Claude.
   Kleine Commits mit deutscher Nachricht, was und warum, dann `git push`. Kein Force-Push, kein Merge nach `main` — das macht der Nutzer oder
   Claude. Hol dir Claudes Stand regelmäßig: `git fetch && git merge origin/main`
   (Konflikte sollte es nicht geben, die Dateien sind getrennt).
3. **Offline:** keine Bibliotheken, keine CDNs, keine nachgeladenen Dateien,
   keine Texturen aus dem Netz. Prozedural erzeugen (Rauschen im Shader,
   Farbverläufe je Ecke) ist erlaubt und erwünscht.
4. **Leistung:** 60 Bilder pro Sekunde mit 300 Einheiten auf einem normalen
   Laptop. Lieber eine gute Form als viele kleine Teile.
5. **Lesbarkeit vor Schönheit:** Aus Spielhöhe muss man jede Einheit an der
   Silhouette erkennen, und die Fraktionsfarbe (Menschen gold `#d8b06a`, Gott
   grün `#8fb86a`) muss sichtbar sein.
6. **Code wie der vorhandene:** deutsche Bezeichner und Kommentare, zwei
   Leerzeichen, Semikolons, einfache Anführungszeichen. Kommentare erklären
   das Warum.
7. Trag jede Arbeitsrunde in `docs/grafik/protokoll.md` ein: was, warum,
   wie geprüft.
8. **Inhalte ja, Regeln nein.** Einheiten, Gebäude, Werte und Skill-Bäume
   entwirfst und pflegst du im Rahmen von `docs/umbau/konzept.md` —
   aber nur mit Feldern aus `FELDER` (`src/sim/defs.js`, geprüft von
   `test/daten.test.js`). Neue Mechaniken (neue Felder, neue Regeln)
   erfindest du nicht: als Wunsch in `docs/grafik/wuensche.md`. Werte
   änderst du nur mit Messung (`tools/sweep.mjs … voelker=a-b`, alle
   Paarungen 45–55 %) im Protokoll. Keine neuen Völker.
9. **Shader im echten Browser prüfen:** Die Smoke-Tests haben kein echtes
   WebGL. Nach Änderungen an Shadern `dist/drei-reiche-3d.html` einmal im
   Browser öffnen und die Konsole auf Fehler ansehen.
10. **Begriffe:** Nie „Das Dritte Reich“ (auch nicht als Wortspiel auf „Die
    drei Reiche“) — der Ausdruck steht im Deutschen für den
    Nationalsozialismus.

## Stil (Vorgaben des Nutzers)

- **Waldgott:** riesig, dunkel, unheimlich. Fast schwarzer Mantel ohne
  sichtbare Füße, unten zerfasert wie Wurzeln; hoher Kragen, hängende Ärmel;
  schwarzer Kopf mit glühenden gelben Augen und verzweigtem Geweih; lange,
  golden leuchtende Hände mit Klauenfingern, vor dem Körper gekreuzt. Warmes
  orangefarbenes Licht, düster und ehrfurchtgebietend. **Kein grüner
  Waldgeist.** Vorlage: `docs/bilder/vorlagen/waldgott-vorlage.png` (nur
  lokal, nicht im Repo).
- **Maßstab für alle Modelle: Waldgott G.2 Glutherz und der Rabe** (vom
  Nutzer gewählt). Fließende Formen statt Klötze, echte Gliedmaßen mit
  Beinen, die gehen, keine schwankenden Körper. Einzelheiten und Vorlagen je
  Einheit in `docs/grafik/auftrag-2.md`.
- Weitere Gott-Einheiten und -Gebäude greifen diese dunkle, golden glühende
  Ästhetik auf. Die Menschen: Mittelalter, Holz, Stein, Eisen.
- **Waldgeist in vier Jahreszeiten:** Modelle `waldgeist_fruehling`,
  `waldgeist_sommer`, `waldgeist_herbst`, `waldgeist_winter`;
  `ui3d.js` wählt je Einheit eine (fehlt eine, nimmt es `waldgeist`).
- Icons: wie der Entwurf der Ressourcenleiste
  (`docs/bilder/ressourcenleiste-entwurf.png`) — klare Formen, kräftige
  Farben, auf dunklem Blau (`#021722`) lesbar, ab 20 px erkennbar.
- Die Karte soll organisch und echt wirken, nicht nach Pixelbrei: natürliche
  Übergänge, Felsformationen statt Kugelketten, Seen mit Ufer, weiche
  Nebelränder.
