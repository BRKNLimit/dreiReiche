# Die drei Reiche — Prototyp 0.7

1v1-RTS-Prototyp. Mittelalter, Elder Gods. **Menschen gegen Wald- und
Wiesengott.** Er existiert, um **eine Frage** zu beantworten: Fühlt sich eine
Domäne, deren Radius bei einer Fraktion fest ist und bei der anderen mit der
Zeit wächst, tatsächlich unterschiedlich an?

## Loslegen

```bash
npm test          # 45 Tests: Ankerregel, Domäne, Drosselleiter, Götterblut, KI, Fairness
npm run bundle    # baut dist/resonit.html (eine Datei, kein Server)
npm run smoke     # fährt die Oberfläche headless 1000 Frames
npm run match     # KI gegen KI, beide Sitzplätze: node tools/match.mjs [seeds] [minuten]
npm run sweep     # Einstellungen vergleichen: node tools/sweep.mjs [seeds] [minuten] [filter]
```

`dist/resonit.html` öffnet direkt im Browser. Kein Build, keine
Abhängigkeiten, kein `npm install`.

## Steuerung

| Eingabe | Wirkung |
| --- | --- |
| Linksklick / Ziehen | Einheiten wählen |
| Rechtsklick | Bewegen (Einheiten stellen Feinde erst am Ziel) |
| `A`, dann Linksklick | Angriffsbewegung: unterwegs jeden Feind stellen |
| Mittlere Maustaste | Karte schieben · Mausrad zoomen |
| `1`–`5` | Gebäude wählen, dann Linksklick setzen (`5` = Förderbau auf Götterblut) |
| Gebäude anklicken, `Q` / `W` | Einheiten bauen (schwere kosten Götterblut) |
| Gebäude anklicken, `Entf` | Abreißen: Baustelle ¾, fertig ½ der Kosten zurück |
| `I` | Auswertung: Reibung, Kampfort, Anker, Götterblut (am Ende automatisch) |
| Leertaste | Pause · `+` / `−` Tempo |
| Knöpfe unten rechts | Seite wechseln und neu starten · „Zuschauen“: KI gegen KI |

## Der Kern

Die gesamte Asymmetrie steckt in `anchorRadius()` in `src/sim/sim.js` und drei
Zahlen pro Fraktion:

| Fraktion | start | max | perTick |
| --- | --- | --- | --- |
| Menschen | 2600 | 2600 | 0 |
| Gott | 950 | 5200 | 1 |

Eine dritte Fraktion ist eine dritte Zeile. Siehe `docs/konzept.md`.

## Was läuft

- Deterministische Simulation, fester Zeitschritt (10 Hz), nur Integer
- Domäne als Vereinigung von Ankerkreisen, getrennte Teile sind getrennte Netze
- Drosselleiter Werk → Segen → Wehr → Zorn, anteilig statt binär, mit
  Mindestfluss für Baustellen
- Fron, Roden sperrt Haine aus, Heimvorteil für den Gott
- Götterblut: Adern auf der Mittelachse, Förderbau braucht versorgte Domäne,
  schwere Einheiten kosten Götterblut
- Abriss mit Teilerstattung
- Gebäude sind Hindernisse: Einheiten gleiten seitlich herum (kein Pathfinding)
- Einheiten verfolgen Feinde nahe ihres Befehlspunkts (an der Leine),
  Angriffsbewegung verfolgt auch unterwegs
- Faire Simulation: Befehle reihum, Kampf gleichzeitig, punktsymmetrische
  Rundung — per Spiegeltest geprüft
- Gegner-KI mit Gegenwart-Bilanz, Vorstoß zu den Adern, Verteidigung und
  Angriffswellen
- Domänengrenze als eine Außenkante der Kreisvereinigung, ohne innere Bögen
- HUD mit Domänenfläche beider Seiten und Verlauf; Vorschauring zeigt, wie
  weit wachsende Anker in zwei Minuten reichen
- Startbildschirm mit der einen Frage und den Regeln, Zahlen aus den Daten
- Karte 2000 × 2000 m

## Was bewusst fehlt

Pathfinding, Gelände, Fog of War, Todesgott, Bergung,
Netzwerk. Siehe `docs/scope.md` — dort stehen auch die offenen Balance-Befunde.

## Struktur

```
src/sim/defs.js   Daten: Fraktionen, Gebäude, Einheiten, Prioritäten
src/sim/sim.js    Simulationskern — engine-frei, deterministisch
src/sim/ai.js     Gegner
src/ui.js         Canvas-Darstellung und Eingabe
src/shell.html    Rahmen und Styles
tools/bundle.mjs  fügt alles zu einer HTML-Datei zusammen
tools/smoke.mjs   fährt die Oberfläche ohne Browser
tools/match.mjs   KI gegen KI, misst Siege, Dauer, Fläche, Kampfort
tools/sweep.mjs   Einstellungen parallel vergleichen
docs/konzept.md   das Designdokument
docs/scope.md     Umfang, Befunde, bekannte Schwächen
test/             node:test
```

Die Simulation kennt die Oberfläche nicht. `src/sim/` lässt sich unverändert
nach C# portieren, wenn es später in eine Engine umzieht.
