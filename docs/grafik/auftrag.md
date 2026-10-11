# Masterprompt für Gemini

Diesen Text als erste Nachricht an Gemini geben (Gemini CLI im Ordner
`drei-reiche/resonit` starten). Hat Gemini keinen Zugriff aufs Repo, siehe
„Ohne Repo-Zugriff“ ganz unten.

---

Du bist der Grafik-Entwickler für das Browser-RTS „Die drei Reiche“ in diesem
Repository. Lies zuerst `GEMINI.md` vollständig — dort stehen deine Dateien,
die Schnittstellen, die du nicht brechen darfst, die Regeln und der Stil.
Lies dann `src/modelle3d.js`, `src/render3d.js`, `src/gelaende3d.js`,
`src/gelaende2d.js`, `src/icons.js` und `src/galerie.js`. Sieh dir die
Vorlagen in `docs/bilder/` an.

Arbeite auf dem Branch `gemini/grafik`. Parallel arbeitet Claude auf `main` an
Spiellogik und Bedienung — fass seine Dateien nicht an, schreib Wünsche in
`docs/grafik/wuensche.md`.

## Deine Aufgaben, in dieser Reihenfolge

**1. Waldgott-Varianten für die Stil-Auswahl.**
Lege in `WALDGOTT_VARIANTEN` (in `src/modelle3d.js`) mindestens fünf
Varianten an — `A — bisher` bleibt. Jede Variante steht für eine andere
Richtung des Grafikstils des ganzen Spiels, zum Beispiel: düster-realistisch
nah an der Vorlage; kantiges Low-Poly mit kräftigen Flächen; schlanker
Schattenriese, sehr hoch; Rinde und Moos unter dem Mantel; verspielt-
stilisiert mit großen Formen. Gib jeder einen Namen der Form
`'B — Schattenriese'`. Alle halten sich an die Vorgaben in `GEMINI.md`
(Mantel, Geweih, gelbe Augen, goldene Klauenhände).
*Fertig, wenn:* `npm test` grün; `dist/galerie.html` zeigt alle Varianten
drehend; jede ist aus Spielhöhe (etwa 60 px hoch) als Waldgott erkennbar und
klar von den anderen verschieden.
Der Nutzer wählt dann eine Variante — **warte darauf nicht**, mach mit
Aufgabe 2 weiter.

**2. Icons.**
Ersetze in `src/icons.js` alle Platzhalter: jede Einheit, jedes Gebäude, jede
Fähigkeit und `gegenwart` (Energie, die in der Domäne fließt — muss sich
deutlich von `skillpunkte`, der Glühbirne, unterscheiden). Stil wie der
Entwurf der Ressourcenleiste. Die Oberfläche soll mit weniger Text auskommen,
die Icons tragen sie.
*Fertig, wenn:* `npm test` grün; in der Galerie unter „Icons“ ist jedes Icon
bei 20 px erkennbar und von den anderen unterscheidbar; die Fraktion ist am
Akzent erkennbar.

**3. Organische Karte in 3D** (`src/gelaende3d.js`, Shader in `src/render3d.js`).
Der Boden soll wie echte Landschaft wirken: Wiese, Erde, Wege, trockene und
feuchte Stellen, weiche Übergänge. Felsgrate als zusammenhängende
Felsformationen statt einzelner Brocken, Seen mit unregelmäßigem Ufer und
Wasser, Adern als sichtbare Fundstellen, Bäume in Waldstücken. Der Nebel des
Krieges hat weiche, runde Ränder statt Pixelbrei (in der Textur sind es
20-m-Zellen; glätte im Shader).
*Fertig, wenn:* `npm run smoke` grün; im Spiel stimmen sichtbare Kanten mit den
Kreisen der Simulation überein (höchstens etwa 10 % Abweichung); flüssig mit
300 Einheiten.

**4. Organische Karte in 2D** (`src/gelaende2d.js`).
Dieselbe Idee für die Draufsicht: kein Rasternetz, natürlicher Boden,
Felsen und Seen als Formen statt Kreise.
*Fertig, wenn:* `npm run smoke` grün; die Draufsicht wirkt wie eine Karte.

**5. Alle Modelle im gewählten Stil.**
Sobald der Nutzer eine Waldgott-Variante gewählt hat (er sagt es dir, oder es
steht in `docs/grafik/protokoll.md` unter „Entscheidungen“): Waldgott ersetzen
und alle Einheiten, Gebäude, Adern, Bäume, Felsen und Geschosse in diesem Stil
neu bauen. Einheiten an der Silhouette unterscheidbar, Fraktionsfarbe sichtbar,
eine gemeinsame Farbpalette je Fraktion.
*Fertig, wenn:* `npm test` und `npm run smoke` grün; in der Galerie sehen alle
Einheiten und Gebäude aus wie aus einem Guss.

## Danach: verbessern, bis dein Budget aufgebraucht ist

Wenn alle Aufgaben erledigt sind — oder während du auf die Wahl des Nutzers
wartest — **hörst du nicht auf.** Arbeite in Runden, so lange, bis dein Budget
vollständig verbraucht ist:

1. Öffne die Galerie und das Spiel und such die **schwächste** Stelle: das
   Modell, das am wenigsten nach dem Stil aussieht, das Icon, das man am
   schlechtesten erkennt, die Stelle der Karte, die am künstlichsten wirkt,
   das Licht, das am flachsten ist.
2. Verbessere genau diese Stelle.
3. `npm test` und `npm run smoke` — grün, sonst zurück zu 2.
4. Commit mit deutscher Nachricht, Eintrag in `docs/grafik/protokoll.md`
   (was war schwach, was hast du geändert, wie geprüft).
5. Zurück zu 1.

Ideen für die Runden, wenn dir nichts Schwächeres auffällt: Licht und
Schatten (weichere Schattierung, Umgebungslicht, Randlicht für Silhouetten),
Animation über die vorhandenen Mittel (Wippen, Schritt, Ausfall), Geschosse
und Treffer, Leuchten der Gott-Teile, Wasser, Gebäude im Bau
(Baugerüst-Optik), zerstörte Gebäude, Farbe der Domänen, kleine Details an
Gebäuden, die aus Spielhöhe wirken, weitere Waldgott-Varianten.
**Melde dich nicht mit „fertig“, solange Budget übrig ist — es gibt immer eine
schwächste Stelle.** Halte dich dabei an alle Regeln aus `GEMINI.md`.

---

## Ohne Repo-Zugriff

Kann Gemini keine Dateien lesen oder schreiben, gib ihm `GEMINI.md`, den Inhalt
von `src/modelle3d.js` und `src/icons.js` und die Bilder aus `docs/bilder/` mit
und bitte nur um Aufgabe 1 und 2: „Antworte mit dem vollständigen neuen Inhalt
von `WALDGOTT_VARIANTEN` bzw. `ICONS` als JavaScript.“ Claude baut die Antwort
dann ein und prüft sie mit den Tests.
