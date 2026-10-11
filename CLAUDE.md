# Die drei Reiche — Architekturregeln

RTS-Prototyp. Mittelalter, Elder Gods. Zwei Fraktionen: Menschen und
Wald- und Wiesengott. Ein Todesgott ist entworfen, aber zurückgestellt.

Ziel ist ein klassisches RTS: Ressourcen sammeln, aufbauen, ausbreiten,
den Gegner bekämpfen, seine Gebäude und seinen Anführer zerstören. **Die
Domäne ist die zentrale Mechanik, nicht das Ziel.** Menschen spielen mit
vielen günstigen Einheiten, der Gott mit wenigen starken; der Heimvorteil
kommt aus Schreinen in der Domäne, nicht aus den Einheiten.

Leitlinie des Nutzers: **so wenig vorgeben wie möglich.** Keine Boni oder
Mali, die eine Spielweise vorschreiben; KI-Schwächen nicht mit neuen Regeln
flicken.

## Die Domänen-Regel

Die Asymmetrie der Domäne steckt in `anchorRadius()` in `src/sim/sim.js`
und den drei Zahlen in `FACTIONS[...].growth`:

| Fraktion | start | max | perTick | Wirkung |
| --- | --- | --- | --- | --- |
| Menschen | 2600 | 2600 | 0 | Fest ab Bauende, planbar |
| Gott | 950 | 5200 | 1 | Früh winzig, nach gut 7 min am Maximum |

Eine dritte Fraktion ist eine dritte Zeile, kein drittes Regelwerk. Wenn eine
Fraktionsidee ein eigenes System braucht, ist die Idee falsch, nicht das
System — siehe `docs/konzept.md`, Abschnitt "Wo Asymmetrie erlaubt ist".

## Harte Regeln

1. **Die Simulation ist engine-frei.** `src/sim/` importiert nichts aus
   `src/ui.js` oder `src/ui3d.js`, kein `document`, kein `window`.
   Dieselben Dateien laufen headless unter Node, in der Draufsicht und in
   der 3D-Ansicht.

2. **Die Simulation ist deterministisch.** Gleicher Startzustand + gleiche
   Befehlsfolge = exakt gleicher Endzustand. Voraussetzung für späteres
   Lockstep-Multiplayer.
   - Nur Integer-Arithmetik. Kein `Math.random`, kein `Math.sqrt`, kein
     `Date.now`, keine Gleitkommazahlen in Zustandsfeldern.
   - Zufall nur über `rng(state)`; Wurzeln über `isqrt()`.
   - Iteration in stabiler Reihenfolge (Array-Index, nie `Object.keys` auf
     dynamischen Objekten, nie `Set`-Iteration).
   - Das gilt auch für `src/sim/ai.js`: Winkel über `cosDeg`/`sinDeg`,
     Zufall über `rng(ai)` mit eigenem Seed.

3. **Einheiten und Gebäude sind Daten, keine Klassen.** Alles in
   `src/sim/defs.js`. Eine neue Einheit ist ein Eintrag, keine Logik. Wenn
   eine neue Einheit Logikänderungen erzwingt, sind die Daten zu dünn.

4. **Fester Zeitschritt.** `TICK_MS = 100` (10 Hz). Rendering interpoliert und
   ändert den Zustand nie.

5. **Befehle, nicht Zustände.** Eingaben werden zu Befehlen (`issue()`) und
   wirken im nächsten Tick.

## Einheiten

- Entfernungen in **Dezimetern** (1 dm = 0,1 m), Integer. Karte 2000 × 2000 m.
- Zeiten (`buildTime`, `cooldown`) in Ticks. Gegenwart als Integer pro Tick;
  sie ist ein Fluss und wird nie gespeichert. Förderung (`fronOut`,
  `blutOut`) in Einheiten **pro Minute**.
- Versorgungsgrad (`powered`) in Promille, 1000 = voll.
- `RULES` in `defs.js`: Regeln, die für alle Fraktionen gelten (`werkFloor`,
  `fremdMalus`, `ankerKraft`, `kommandanten`). Ein Objekt, damit `tools/sweep.mjs`
  sie umschalten kann.

## Begriffe

| Code | Design |
| --- | --- |
| `gegenwart` | Energie, nicht lagerbar, fließt in der Domäne |
| `fron` | Masse: Holz, Stein, Hände |
| `goetterblut` | Die umkämpfte dritte Ressource |
| `anchor` | Gebäude, das Domäne projiziert |
| `cleared` | Gerodeter Boden — dort pflanzt der Gott keinen Hain |

## Bewusst weggelassen (v1)

Höhen im Gelände, Todesgott, Bergung der Gefallenen, Netzwerk. Die KI
sieht durch den Nebel des Krieges (er ist nur eine Sicht der Oberfläche).
Siehe `docs/scope.md`.

## Teststrategie

`npm test` muss grün sein, bevor etwas als fertig gilt. Jede Eigenschaft der
Ankerregel braucht einen Test, der sie in Isolation zeigt.
`npm run smoke` fährt beide Oberflächen headless je 1000 Frames.
`npm run match` lässt KI gegen KI spielen (beide Sitzplätze, mehrere Seeds).
`npm run sweep` vergleicht Einstellungen aus `tools/sweep.mjs` parallel.
Balance-Aussagen in `docs/scope.md` nur mit Messung von dort, nie geschätzt.
