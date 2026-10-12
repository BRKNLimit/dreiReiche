# Die drei Reiche — Prototyp 0.40

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
npm test          # 111 Tests: Ankerregel, Domäne, Drosselleiter, Götterblut, Unterhalt, Erfahrung, Skillbaum, KI, Fairness
npm run bundle    # baut dist/resonit.html und dist/drei-reiche-3d.html
npm run smoke     # fährt 2D, 3D und Galerie headless
npm run galerie   # nur die Galerie (dist/galerie.html): Modelle und Icons zur Stil-Auswahl
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
der Draufsicht. Oben links die Ressourcenleiste: freie Skillpunkte,
Gegenwart-Überschuss, Götterblut, Fron.

## Kampagne

Ganz oben im Startbildschirm: **„Die Rodung“**, vier Missionen aus Sicht
der Menschen — von der Lernmission bis zum Kampf gegen den eingegrabenen
Waldgott — und **„Der Zorn des Waldes“**, drei Missionen aus Sicht des
Gottes. Ziele stehen links oben im HUD, geschaffte Missionen schalten die
nächste frei.

## Online

„🌐 Online gegen einen Menschen“ im Startbildschirm: Einer klickt **Spiel
eröffnen** (Volk wählen, Karte wie im Startbildschirm gewählt) und schickt
den Code per Chat, der andere klickt **Beitreten**, fügt ihn ein und
schickt die Antwort zurück. Dann geht es los — ohne Server, Browser zu
Browser. Beide brauchen denselben Stand des Spiels. Hinter manchen
Firmen- oder Mobilfunk-Routern kommt keine direkte Verbindung zustande.

## Völker

Drei Völker, jede Paarung spielbar (Startbildschirm: eigenes Volk über die
Knöpfe, Gegner-Volk darüber). Der Unterschied steckt in einer Regel — wie
die Domäne eines Ankers wächst:

- **Menschen:** sofort voll und fest. Viele günstige Einheiten.
- **Wald- und Wiesengott:** klein am Anfang, wächst mit der Zeit. Wenige starke Einheiten.
- **Todesgott:** klein am Anfang, wächst mit jedem, der in ihrem Umkreis fällt.
  Massen von Skeletten — seine Grabhügel werden dort groß, wo gekämpft wird.

## Karten

Im Startbildschirm: **Klassisch**, **Flusstal** (nach der Skizze des
Nutzers), **⚄ Zufall** (jedes Spiel eine neue, faire Karte) und eigene
Karten (✎). Eigene Karten malt man im **Karteneditor**
(`dist/karteneditor.html`): alles wird um die Mitte gespiegelt, und die
Prüfung sagt sofort, ob die Karte spielbar ist. „Spielen“ öffnet sie im
Spiel; als JSON lässt sie sich weitergeben.

## Steuerung

| Eingabe | Wirkung |
| --- | --- |
| `H` oder `?` unten rechts | Steuerung einblenden |
| Linksklick / Ziehen | Einheiten wählen (Auswahl zeigt Werte, Fabriken ihre Ausbildungsliste) |
| `Strg`+`1`–`0`, `1`–`0` | Steuergruppe speichern, abrufen (zweimal: Kamera hin). Eine belegte Gruppe geht vor der Bautaste |
| Fabrik gewählt + Rechtsklick | Sammelpunkt für neue Einheiten |
| `M` | Ton an/aus |
| Icon in der Leiste unten | Je Einheitentyp der Auswahl ein Icon mit Anzahl; ein Klick behält nur diesen Typ |
| Bauleiste überfahren | Info-Karte: Kosten, Bauzeit, Gegenwart, Wirkung, Sperre. Die Bauleiste erscheint nur, wenn ein Erbauer gewählt ist |
| Rechtsklick | Bewegen (Einheiten stellen Feinde erst am Ziel) · auf einen Feind: gezielt angreifen |
| `Shift`+Rechtsklick | Wegpunkt anhängen (auch mit `A`) |
| `S` | Stopp |
| `F2` | ganzes Heer wählen |
| `F5`, `F9` | Spielstand speichern, laden (beim Schließen speichert das Spiel von selbst) |
| `F10` | Menü: speichern, laden, aufgeben, Hauptmenü |
| `N` | Musik an/aus |
| `P` | 3D: Fotomodus (Klick speichert ein Bild) |
| `.` | nächster untätiger Arbeiter (Knopf unten rechts zeigt die Anzahl) |
| Rechtsklick auf die Minikarte | Auswahl dorthin schicken |
| `A`, dann Linksklick | Angriffsbewegung: unterwegs jeden Feind stellen |
| Mittlere Maustaste | Karte schieben · Mausrad zoomen |
| Erbauer gewählt, `1`–`0` | Gebäude wählen, dann Linksklick setzen (`3` Anker, `5` Förderbau auf Götterblut, `6` `7` Schreine, `8` Verteidigung, `9` Forschung, `0` Spähposten der Menschen) |
| Gebäude setzen | Erst ein **Bauplan**: kostet nichts, sieht nichts, nur für einen selbst sichtbar. Bezahlt und begonnen wird, sobald ein Erbauer daneben ankommt — fehlt Fron, wartet er. **Ohne Erbauer wächst keine Baustelle**; wer weggeht, baut nicht weiter |
| `Shift` + Gebäude setzen | Baureihe: der Plan kommt hinten in die Reihe der Erbauer, danach geht es direkt zum nächsten |
| Bauplan anklicken, `Entf` | Plan verwerfen |
| Erbauer gewählt + Rechtsklick auf eigenen Plan / eigene Baustelle | Mitbauen (mit `Shift` in die Reihe) |
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
| Aufklärung | Spähposten (Gebäude, sieht 200 m) | Rabe (Einheit aus dem Herzbaum, sieht 100 m) |

| Kampf | Menschen | Gott |
| --- | --- | --- |
| Nahkampf | Bauer, Soldat, Söldner, Held | Dryade, Wolf, Ent, Wurzelbrecher |
| Fernkampf | Jäger, Balliste | Waldgeist, Waldgott |
| Späher, ohne Waffe | — | Rabe: fliegt über Fels, Wasser und Mauern, nur Fernkampf trifft ihn, ein Schuss holt ihn herunter |
| Belagerung (Gebäude zuerst) | Balliste | Wurzelbrecher |

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
- Nebel des Krieges: Sichtweite je Einheit und Gebäude, weiche Ränder, die
  beim Auf- und Zudecken überblenden; Erkundetes bleibt gedämpft, gegnerische
  Gebäude bleiben, wo man sie zuletzt sah. Die KI sieht nur, was ihre
  Einheiten und Gebäude sehen (`src/sim/kunde.js`)
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
  Gegner-Stil (Sturm, Standard, Burg) und Schwierigkeit (leicht, mittel,
  schwer) wählbar
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
