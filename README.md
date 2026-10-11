# Die drei Reiche — Prototyp 0.23

1v1-RTS-Prototyp. Mittelalter, Elder Gods. **Menschen gegen Wald- und
Wiesengott.** Ressourcen fördern, aufbauen, ausbreiten — und Hauptgebäude
oder Kommandant des Gegners zerstören. Die Menschen spielen mit vielen
günstigen Einheiten, der Gott mit wenigen starken. Zentrale Mechanik ist die
**Domäne**: Ihr Radius steht bei den Menschen fest und wächst beim Gott mit
der Zeit; in ihr fließt Gegenwart, und dort wirken die Schreine. Jede
Einheit kostet laufend Unterhalt — große Heere fressen die Wirtschaft.
Mit der Zeit kommen Skillpunkte; der Skillbaum schaltet Einheiten, Schreine,
Verbesserungen und eine Fähigkeit des Kommandanten frei.

## Loslegen

```bash
npm test          # 107 Tests: Ankerregel, Domäne, Drosselleiter, Götterblut, Unterhalt, Erfahrung, Skillbaum, KI, Fairness
npm run bundle    # baut dist/resonit.html und dist/drei-reiche-3d.html
npm run smoke     # fährt beide Oberflächen headless je 1000 Frames
npm run match     # KI gegen KI, beide Sitzplätze: node tools/match.mjs [seeds] [minuten]
npm run sweep     # Einstellungen vergleichen: node tools/sweep.mjs [seeds] [minuten] [filter] [stile]
```

`dist/resonit.html` (Draufsicht) und `dist/drei-reiche-3d.html` (3D) öffnen
direkt im Browser. Kein Build, keine Abhängigkeiten, kein `npm install`, auch
kein Internet: Die 3D-Ansicht zeichnet mit WebGL 2 ohne Bibliothek.

## 3D-Ansicht

Dieselbe Simulation, gezeichnet mit einfachen Modellen aus Grundkörpern —
bewusst rudimentär. Einheiten drehen sich in Laufrichtung und wippen beim
Gehen, Schüsse sind Linien, Domänen eine Fläche mit Außenkante.
Pfeiltasten oder mittlere Maustaste schieben, Mausrad zoomt. Einheiten
hinter Gebäuden bleiben als Umriss sichtbar. Sonst dieselbe Steuerung wie in
der Draufsicht. Oben links die Ressourcenleiste: Gegenwart-Überschuss,
Götterblut, Fron.

## Steuerung

| Eingabe | Wirkung |
| --- | --- |
| Bauleiste überfahren | Info-Karte: Kosten, Bauzeit, Gegenwart, Wirkung, Sperre |
| Linksklick / Ziehen | Einheiten wählen (Auswahl zeigt Werte, Fabriken ihre Ausbildungsliste) |
| Rechtsklick | Bewegen (Einheiten stellen Feinde erst am Ziel) |
| `A`, dann Linksklick | Angriffsbewegung: unterwegs jeden Feind stellen |
| Mittlere Maustaste | Karte schieben · Mausrad zoomen |
| `1`–`9` | Gebäude wählen, dann Linksklick setzen (`3` Anker, `5` Förderbau auf Götterblut, `6` `7` Schreine, `8` Verteidigung, `9` Forschung) |
| Erbauer gewählt + Gebäude setzen | Bauer, Dryade oder Kommandant bekommen den Bauauftrag, gehen hin und bauen direkt daneben — ein Auftrag je Einheit. **Ohne Erbauer wächst keine Baustelle**, auch nicht in der Domäne; wer weggeht, baut nicht weiter |
| Erbauer gewählt + Rechtsklick auf eigene Baustelle | Mitbauen |
| Erbauer gewählt + Rechtsklick auf beschädigtes eigenes Gebäude | Reparieren (kostet etwas Fron) |
| Gebäude anklicken, `Q` / `W` | Einheiten bauen (schwere kosten Götterblut) |
| Gebäude anklicken, `Entf` | Abreißen: Baustelle ¾, fertig ½ der Kosten zurück |
| `K` | Kommandant wählen und hinspringen |
| `T` | Skillbaum: freie Punkte, ein Klick lernt; Gesperrtes ist ausgegraut |
| Kommandant gewählt: `Q` `W` `E` oder Knöpfe | Seine drei Fähigkeiten (im Skillbaum freischalten); Wurzelgriff mit Linksklick aufs Ziel |
| `I` | Auswertung: Reibung, Kampfort, Anker, Götterblut (am Ende automatisch) |
| Leertaste | Pause · `+` / `−` Tempo |
| Knöpfe unten rechts | Seite wechseln und neu starten · „Zuschauen“: KI gegen KI |

## Gebäude und Einheiten

| Rolle | Menschen | Gott |
| --- | --- | --- |
| Hauptgebäude (vital) | Thingstätte | Herzbaum |
| Anker (Domäne) | Grenzstein | Hain |
| Verteidigung (schießt) | Wachturm | Wächterbaum |
| Gegenwart, ortsunabhängig | Schmiede | Quellgrund |
| Fron, auf Steinvorkommen | Sägewerk | Moosgrube |
| Götterblut, auf Ader | Blutschacht | Blutwurz |
| Fabrik | Kaserne | Dickicht |
| Schrein des Zorns | Kriegsbanner | Dornenschrein |
| Schrein der Wehr | Kapelle | Steinkreis |
| Forschung (Skillpunkte) | Skriptorium | Raunende Eiche |

| Kampf | Menschen | Gott |
| --- | --- | --- |
| Nahkampf | Bauer, Soldat, Söldner, Held | Dryade, Wolf, Ent, Wurzelbrecher |
| Fernkampf | Jäger, Katapult | Waldgeist, Waldgott |
| Belagerung (Gebäude zuerst) | Katapult | Wurzelbrecher |

Reichweite zählt von Rand zu Rand: Nahkämpfer müssen ran, Fernkämpfer
schießen weit. Was gesperrt ist, schaltet der Skillbaum frei.

## Die Domäne

Die Asymmetrie der Domäne steckt in `anchorRadius()` in `src/sim/sim.js` und
drei Zahlen pro Fraktion:

| Fraktion | start | max | perTick |
| --- | --- | --- | --- |
| Menschen | 2600 | 2600 | 0 |
| Gott | 950 | 5200 | 1 |

Eine dritte Fraktion ist eine dritte Zeile. Siehe `docs/konzept.md`.

## Was läuft

- Deterministische Simulation, fester Zeitschritt (10 Hz), nur Integer
- Domäne als Vereinigung von Ankerkreisen, getrennte Teile sind getrennte Netze
- Drosselleiter Werk → Segen → Wehr → Zorn, anteilig statt binär, mit
  Mindestfluss für Fabriken
- Gebaut wird nur von Erbauern (Arbeiter, Kommandant), die mit Auftrag
  daneben stehen
- Fron, Roden sperrt Haine aus, Heimvorteil für den Gott
- Götterblut: Adern auf der Mittelachse, Förderbau braucht versorgte Domäne,
  schwere Einheiten kosten Götterblut
- Kommandanten nach Vorbild der ACU: Held und Waldgott, extrem stark, bauen
  mit voller Kraft; fällt er, ist die Partie verloren
- Menschen: viele günstige Einheiten (Bauer, Soldat, Jäger, Söldner); Gott:
  wenige starke (Dryade, Wolf, Waldgeist, Ent). Arbeiter bauen wie der
  Kommandant, nur schwächer
- Heimvorteil aus Schreinen: Zorn (mehr Schaden) und Wehr (weniger Schaden)
  für eigene Einheiten im Umkreis von 300 m, soweit er in der eigenen Domäne liegt
- Unterhalt: Jede Einheit kostet Fron pro Minute; das HUD zeigt Förderung,
  Unterhalt und Saldo
- Hauptgebäude tragen eine Grunddomäne von 400 m für die ganze Startbasis
- Erfahrung: Wer lange lebt, wird ein wenig stärker (1 % je Minute, höchstens 10 %)
- Skillbaum je Fraktion mit vier Ästen (Einheiten, Gebäude, Verbesserungen,
  Kommandant); Punkte kommen mit der Zeit; Schlachtruf und Wurzelgriff
- Abriss mit Teilerstattung
- Karte mit Felsgraten, Felsring um die Mitte und Seen; Wegfindung über
  Flussfelder, Gebäude umgleiten Einheiten seitlich
- Nebel des Krieges: Sichtweite je Einheit und Gebäude, Erkundetes bleibt
  gedämpft, gegnerische Gebäude bleiben, wo man sie zuletzt sah
- Einheiten verfolgen Feinde nahe ihres Befehlspunkts (an der Leine),
  Angriffsbewegung verfolgt auch unterwegs
- Faire Simulation: Befehle reihum, Kampf gleichzeitig, punktsymmetrische
  Rundung — per Spiegeltest geprüft
- Gegner-KI mit Gegenwart-Bilanz, Vorstoß zu den Adern, Verteidigung und
  Angriffswellen
- Domänengrenze als eine Außenkante der Kreisvereinigung, ohne innere Bögen
- HUD mit Domänenfläche beider Seiten und Verlauf; Vorschauring zeigt, wie
  weit wachsende Anker in zwei Minuten reichen
- Startbildschirm mit der einen Frage und den Regeln, Zahlen aus den Daten;
  Gegner-Stil wählbar (Sturm, Standard, Burg)
- Karte 2000 × 2000 m

## Was bewusst fehlt

Höhen im Gelände, Todesgott, Bergung,
Netzwerk. Siehe `docs/scope.md` — dort stehen auch die offenen Balance-Befunde.

## Struktur

```
src/sim/defs.js   Daten: Fraktionen, Gebäude, Einheiten, Prioritäten
src/sim/sim.js    Simulationskern — engine-frei, deterministisch
src/sim/ai.js     Gegner
src/ui.js         Draufsicht: Canvas-Darstellung und Eingabe
src/ui3d.js       3D-Ansicht: WebGL 2, Modelle aus Grundkörpern
src/shell.html    Rahmen und Styles (Draufsicht)
src/shell3d.html  Rahmen und Styles (3D)
tools/bundle.mjs  fügt alles zu einer HTML-Datei zusammen
tools/smoke.mjs   fährt die Draufsicht ohne Browser
tools/smoke3d.mjs fährt die 3D-Ansicht ohne Browser (WebGL als Platzhalter)
tools/match.mjs   KI gegen KI, misst Siege, Dauer, Fläche, Kampfort
tools/sweep.mjs   Einstellungen parallel vergleichen
docs/konzept.md   das Designdokument
docs/scope.md     Umfang, Befunde, bekannte Schwächen
CHANGELOG.md      was sich in welcher Version geändert hat
test/             node:test
```

Die Simulation kennt die Oberfläche nicht. `src/sim/` lässt sich unverändert
nach C# portieren, wenn es später in eine Engine umzieht.
