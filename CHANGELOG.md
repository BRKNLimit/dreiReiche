# Änderungen

Messwerte: KI gegen KI, beide Sitzplätze, Menschen : Gott. Details und
Tabellen in `docs/scope.md`.

## 0.37 — Tagesherausforderung und Erfolge

- **📅 Tagesherausforderung** im Startbildschirm: jeden Tag eine neue
  Zufallskarte mit festem Volk und Gegner — aus dem Datum berechnet, also
  für alle gleich. Bestzeit des Tages wird gemerkt.
- **🏆 Erfolge** (12): Erster Sieg, Zwei Seelen, Härteprobe, Sturmlauf,
  Eiserne Linie, Langer Atem, Heerführer, Fremdes Land, Tageswerk, Von
  Mensch zu Mensch und je einer für beide Kampagnen. Neue Erfolge stehen
  auf dem Endbildschirm; die Übersicht und die Bilanz (Siege : Niederlagen
  je Volk) im Startbildschirm. Alles im Browser gespeichert
  (`src/bilanz.js`), Zuschauen und Wiederholungen zählen nicht.
- **Beobachter-Tafel** beim Zuschauen und in Wiederholungen (Sicht „Alles“):
  Fron, Förderung, Götterblut, Heer, Einheiten, Gebäude und Skills beider
  Seiten, wer vorn liegt, steht hell.
- Lernmission „Fuß fassen“: die Schmiede ist jetzt ein eigener Schritt —
  ohne ihre Gegenwart stand die Kaserne fast still.
- **2D ⇄ 3D mitten in der Partie:** Der Knopf „3D“ bzw. „2D“ nimmt eine
  laufende Partie mit (auch Missionen und Zuschauen) — Spielstand sichern,
  andere Ansicht öffnen, dort sofort weiter, Kamera an derselben Stelle.
- **Kartenvorschau** im Startbildschirm: Wald, Wiesen, Wasser, Fels, Furten,
  Adern und beide Basen der gewählten Karte.
- **Fotomodus in 3D** (P): blendet die ganze Oberfläche aus, die Kamera
  bleibt frei, ein Klick speichert das Bild als PNG.
- **Einstellungen** im Menü (F10): Lautstärke von Effekten und Musik
  getrennt, Bildschirmwackeln an/aus — gespeichert.
- **Doppelklick** auf eine Einheit wählt alle dieses Typs im Bild; ein
  einfacher Klick in 2D wählt jetzt nur die nächste Einheit (wie in 3D),
  nicht den ganzen Haufen. **Shift+Klick** auf ein Ausbildungs-Icon bestellt
  fünf, verteilt auf die gewählten Fabriken.
- **📖 Kodex** im Startbildschirm: alle Einheiten und Gebäude beider Völker
  mit Icon und Karte (Kosten, Werte, was sie freischaltet) — aus den Daten,
  also immer aktuell.
- Endbildschirm: „Zufallskarte“ statt „zufall“.
- **„✨ Neu in 0.37“** im Startbildschirm — einmal, bis man „Verstanden“
  klickt. Der Startbildschirm schneidet lange Inhalte oben nicht mehr ab.

## 0.36 — Musik und Zeitleiste für Wiederholungen

- **Wiederholungen mit Zeitleiste:** Regler zum Springen (vor und zurück),
  −30 s / +30 s, Tempo ×1 bis ×16, Abspielen/Anhalten — und die **Sicht**:
  alles, oder mit Nebel durch die Augen der Menschen oder des Gottes
  (Ressourcen und HUD dieses Spielers, Kamera an seiner Basis).
  Zurückspringen geht über einen Stand je Minute (`src/spielstand.js`)
  und spult von dort ohne Effekte vor — danach geht die Partie bitgenau
  so weiter wie vorher (im Browser geprüft, 2D und 3D).

- **Erzeugte Musik** (`src/musik.js`): keine Dateien, alles WebAudio nach
  einfachen Regeln — Flächen, Bass und eine Melodie, die als Zufallsweg über
  die Tonleiter wandert. Die Menschen klingen dorisch mit gezupfter Laute,
  der Gott pentatonisch mit Flöte und Atem. Wird gekämpft, kommen Trommeln
  und Rasseln dazu und die Melodie wird dichter; danach klingt es ab.
- **N** schaltet die Musik an und aus (bleibt gespeichert), **M** weiter
  den ganzen Ton.

## 0.35 — Online gegen einen Menschen

- **Online-Mehrspieler** (Startbildschirm, „🌐 Online gegen einen
  Menschen“): Einer eröffnet und wählt Volk und Karte, der andere tritt
  bei. Ohne Server — die beiden tauschen zwei Codes per Chat oder Mail aus
  (Angebot und Antwort, je rund 700 Zeichen), dann verbindet WebRTC die
  Browser direkt. Ein öffentlicher STUN-Server hilft nur, die eigene Adresse
  hinter dem Router zu finden. 2D und 3D können gegeneinander spielen.
- **Gleichschritt** (`src/netz.js`): Über das Netz gehen nur Befehle. Was
  man in Tick T befiehlt, wirkt in Tick T + 3 auf beiden Rechnern (300 ms
  Puffer); fehlt der Zug des anderen, wartet das Spiel („Warte auf den
  Mitspieler …“). Alle 10 s tauschen beide eine Prüfsumme — laufen die
  Welten auseinander, steht es im HUD. Getrennte Verbindung ebenso.
- Online gibt es keine Pause, kein Tempo und keine Spielstände; Aufgeben
  geht über das Menü (F10) und ist ein Befehl wie jeder andere. Die
  Wiederholung einer Online-Partie enthält die Befehle beider.
- **Chat:** Online öffnet Enter ein Eingabefeld, Enter sendet. Nachrichten
  erscheinen oben mit dem Namen des Volks (sicher als Text, kein HTML).
- Tippen in Textfeldern (Codes, Chat) löst keine Tastenkürzel mehr aus.
- Die Spielregeln im Startbildschirm lassen sich aufklappen — die Knöpfe
  stehen ohne Scrollen im Bild.
- Der Gast spielt Sitzplatz 1: Kamera an der eigenen Basis, im 3D von der
  eigenen Seite aus.
- Tests mit einem simulierten, wackeligen Netz (zufällige Verzögerung):
  beide Seiten bleiben über 2500 Ticks bitgleich; eine absichtlich
  verstimmte Welt wird an der nächsten Prüfsumme erkannt. Im Browser mit
  zwei Tabs (2D gegen 3D) verbunden, gespielt und getrennt.

## 0.34 — Spielstände

- **F5 speichert, F9 lädt** — in 2D und 3D, auch mitten in einer Mission.
  Beim Schließen oder Wegschalten speichert das Spiel von selbst (ab einer
  Minute, nicht beim Zuschauen oder Abspielen). Im Startbildschirm steht
  dann **▶ Fortsetzen** mit Volk, Mission, Spielzeit und Uhrzeit.
- Gespeichert wird der Zustand selbst (`src/spielstand.js`), nicht die
  Befehle — auch eine Stunde Partie lädt sofort. Wegfindung und Hindernisse
  werden aus der Karte neu gebaut, Verweise auf Einheiten werden zu Ids und
  zurück. Ein geladenes Spiel läuft **bitgenau** so weiter wie das
  gesicherte (Tests: früh, mitten im Kampf, spät, Flusstal, Zufallskarte,
  offene Befehle). Die Aufnahme läuft mit — eine Wiederholung bleibt
  vollständig.
- **Funksprüche in den Missionen:** Vögtin Hedwig, Hauptmann Gerold und
  Kundschafterin Mira (Menschen), die Alte Eiche und Kra der Rabe (Gott)
  melden sich, wenn etwas passiert — erste Welle, Ents in Sicht, ein
  Wächterbaum fällt, der Held taucht auf. Oben in der Mitte, mit Hinweiston,
  jeder nur einmal (auch über Speichern und Laden hinweg).
- **Pausenmenü** (F10 oder ☰ unten rechts): Weiter, Speichern, letzten
  Stand laden, Steuerung, Aufgeben, Hauptmenü. Wer ins Hauptmenü geht,
  kann dort fortsetzen. Aufgeben ist ein Befehl der Simulation
  (`aufgeben`, zählt wie ein gefallener Kommandant).
- `npm run serve`: kleiner Server für `dist/` unter
  http://localhost:8765/ (manche Vorschaufenster öffnen große Dateien nicht
  direkt).

## 0.33 — Zwei Kampagnen: „Die Rodung“ und „Der Zorn des Waldes“

- **Kampagne** mit vier Missionen aus Sicht der Menschen, ganz oben im
  Startbildschirm. Jede Mission hat ein Vorwort, Ziele mit Haken im HUD und
  ein Nachwort; geschaffte Missionen schalten die nächste frei (im Browser
  gespeichert).
  1. **Fuß fassen** — Lernmission ohne gegnerische KI: Held wählen,
     Sägewerk, Bauern, Kaserne, Soldaten, Steuergruppe, dann den Vorposten
     des Waldes (Hain und zwei Wölfe) zerstören. Die Ziele kommen der Reihe
     nach.
  2. **Die Wut des Waldes** — zehn Minuten standhalten: kleine Siedlung,
     ein Turm, sechs Soldaten und zwei Jäger gegen den Gott (Sturm, schwer)
     und fünf zusätzliche Angriffswellen mit Countdown im HUD.
  3. **Blut der Götter** — Flusstal: zwei Blutschächte bauen und 300
     Götterblut sammeln (Gott: Standard, mittel).
  4. **Der Waldgott** — der Gott hat sich mit vier Wächterbäumen, zwei
     Quellgründen und einem Steinkreis eingegraben (Burg, mittel).
- **Zweite Kampagne „Der Zorn des Waldes“** aus Sicht des Gottes, drei
  Missionen:
  1. **Erwachen** — Lernmission: Waldgott wählen, Moosgrube, Hain,
     Dryaden, Wölfe, Steuergruppe, dann die Holzfäller am Grat vertreiben.
  2. **Axt und Feuer** — die drei Sägewerke an der Siedlung der Menschen
     zerstören (Zähler im HUD; Menschen: Standard, leicht).
  3. **Der Zorn des Waldes** — die befestigte Siedlung (vier Türme,
     Garnison, Kapelle, Schmiede) fällen (Burg, leicht).
- Missionen sind reine Oberfläche (`src/kampagne.js`): Startlage und
  Wellen entstehen deterministisch, Wiederholungen einer Mission spielen
  darum genau gleich ab.
- Abgestimmt mit der KI auf der Spielerseite (6 Seeds, Designzahlen):
  Wer nichts tut, verliert Mission 2 nach gut 8 Minuten, die KI hält sie
  6 von 6; Mission 3 schafft die KI 3 von 6, Mission 4 2 von 6. Gott:
  „Axt und Feuer“ 4 von 6, das Finale 6 von 6 (auf „mittel“ nur 1 von 6 —
  die Garnison macht es auf „leicht“ trotzdem lang, 26–58 min).
- **Notfix 3D:** Seit Geminis Wasser (Aufgabe 6) startete die 3D-Ansicht
  nicht mehr — eine Shader-Uniform hatte im Vertex- und Fragment-Shader
  verschiedene Genauigkeit. Behoben (ein Wort in `src/render3d.js`), und
  ein neuer Test prüft das künftig, weil die Smoke-Tests kein echtes WebGL
  haben.

## 0.32 — Zufallskarten und Karteneditor

- **Zufallskarten:** Im Startbildschirm „⚄ Zufall“ — jedes Spiel eine neue
  Karte: Fluss mit Furten, Felsgrate, Felsgruppen, Seen, Adern, Wald und
  Wiesen, immer punktsymmetrisch und damit fair. `src/sim/kartenbau.js`
  baut sie deterministisch; Wiederholungen bringen ihre Karte mit.
- **Karteneditor** (`dist/karteneditor.html`, Link im Startbildschirm):
  Felsen, Seen, Fluss (Punkte klicken, Enter), Furten, Fron- und
  Götterblut-Adern, Wald, Wiesen, Radierer — alles wird automatisch
  gespiegelt. Ziehen malt, Mausrad ändert die Größe, Strg+Z nimmt zurück.
  Die Prüfung läuft mit: Weg zwischen den Basen, freie Startbasis, freie
  Adern. Speichern im Browser, Export/Import als JSON, eine Zufallskarte als
  Vorlage. „Spielen“ öffnet die Karte direkt im Spiel (2D oder 3D).
- Eigene Karten erscheinen im Startbildschirm (✎); Kartendateien lassen sich
  dort auch laden.
- Messung auf 72 verschiedenen Zufallskarten: Menschen 27 : Gott 28, 17
  offen — die KI kommt mit beliebigen Karten zurecht
  (`tools/sweep.mjs … karte=zufall`).

## 0.31 — Balance, Bedienung, doppelt so schnell

- **Balance:** Unterhalt der Menschen um ein Viertel gesenkt (Bauer 4→3,
  Soldat 9→7, Jäger 10→8, Söldner 24→18 Fron/min; Designzahlen). Gemessen
  (36 Seeds, Stil-Paarungen): klassische Karte Menschen 22 : Gott 38 →
  **33 : 28**, Flusstal 18 : 36 → **29 : 27**. Sechs Stellschrauben im
  Vergleich in `docs/scope.md`, Abschnitt 22.
- **Gezielter Angriff:** Rechtsklick auf einen sichtbaren Feind — die
  Auswahl verfolgt genau dieses Ziel und schießt zuerst darauf.
- **Stopp** (`S`), **Wegpunkte** (Shift+Rechtsklick hängt Ziele an, auch mit
  `A`), **ganzes Heer wählen** (`F2`), **untätige Arbeiter** (`.` und ein
  Knopf mit Anzahl), **Rechtsklick auf die Minikarte** schickt die Auswahl.
- **Simulation bis doppelt so schnell:** Raumraster für die Nachbarsuche
  (Gefecht mit 300 Einheiten 4,9 → 2,0 ms je Tick), Ergebnisse bitgenau wie
  vorher — vier ganze KI-Partien alt gegen neu verglichen.
- Gefallene Einheiten sinken in 3D kurz zu Boden; Andockstellen für Geminis
  Baugerüst, Trümmer, Bäume je Karte und die Figuren der Draufsicht
  (`src/figuren2d.js`). Auftrag 3 an Gemini (`docs/grafik/auftrag-3.md`).

## 0.30 — Steuergruppen, Effekte, zweite Karte, Wiederholungen

- **Steuergruppen:** Strg+Ziffer speichert die Auswahl, Ziffer ruft sie ab,
  zweimal schnell springt die Kamera hin. Eine belegte Gruppe geht vor; ist
  sie leer, bleibt die Ziffer eine Bautaste.
- **Sammelpunkte:** Fabrik wählen, Rechtsklick — neue Einheiten laufen
  dorthin (Fahne und Linie zeigen ihn).
- **Projektile und Treffer** (`src/effekte.js`): je Schütze ein eigenes
  Geschoss — Pfeil, Ballistenbolzen, Dorn, Lichtpfeil, Glutball —,
  Nahkämpfer hauen am Ziel (Klinge, Biss, Wucht). Funken, Splitter, Glut,
  Staub, Druckringe; Getroffene blitzen auf; schwere Einschläge und
  einstürzende Gebäude lassen das Bild beben.
- **Klänge**, synthetisch erzeugt (WebAudio, keine Dateien): Sehnen, Klingen,
  Einschläge, Einsturz, „fertig“, neue Einheit; leiser mit Abstand, links
  und rechts nach Lage. Horn und Ping auf der Minikarte, wenn Eigenes
  außerhalb des Bildes angegriffen wird. `M` schaltet den Ton.
- **Zweite Karte „Flusstal“** nach der Skizze des Nutzers: ein Fluss vom
  linken Rand durch die Mitte zum rechten Rand, nur an zwei Furten
  passierbar; Grat am Ufer, Felsmassiv im Wald, Götterblut in den Wiesen
  jenseits des Flusses. Wald und Wiesen nur Optik. Wahl im Startbildschirm;
  `tools/sweep.mjs … karte=flusstal`.
- **Wiederholungen:** Jede Partie wird mitgeschrieben (Startwerte und die
  Befehle des Spielers — Simulation und KI sind deterministisch). Am Ende
  als Datei speichern, im Startbildschirm laden und ansehen.
- **Siegbildschirm** mit Zahlen beider Seiten und dem Verlauf von Heer,
  Förderung und Gebäuden.
- Katapult heißt jetzt **Balliste**; Waldgeister wählen je Einheit eine
  Jahreszeit, sobald Gemini die Modelle liefert.
- Auftrag 2 an Gemini (`docs/grafik/auftrag-2.md`): alle Modelle auf das
  Niveau von Waldgott G.2, ohne Rückfragen.

## 0.29 — Rabe sieht weniger, Waldgott G.2

- Rabe sieht 100 statt 150 m (Vorgabe des Nutzers). Messung: Menschen 22 :
  Gott 38, 12 von 72 offen — fast wie mit voller Sicht (25 : 38).
- **Waldgott „G.2 Glutherz“** von Gemini, die gewählte Variante: fließender
  Mantel, Glutherz im Rippenkäfig, Klauenhände, Geweih mit glühenden
  Spitzen; atmet, der Saum schwingt, Funken steigen auf.
- Echte Modelle und Icons für **Rabe** und **Spähposten** von Gemini (statt
  Platzhaltern); Atmen nur noch beim Waldgott, Galerie-Scheiben wieder da.

## 0.28 — Spähposten und Rabe

- **Spähposten** (Menschen, Taste `0`): Hochsitz, sieht 200 m (ein Zehntel
  der Karte), 90 Fron, kämpft nicht, braucht keine Gegenwart, steht auch
  außerhalb der Domäne.
- **Rabe** (Gott, aus dem Herzbaum): Späher ohne Waffe, 35 Fron, 8 LP,
  schnellste Einheit, sieht 150 m. **Fliegt** über Fels, Wasser und Mauern;
  Nahkämpfer erreichen ihn nicht, ein Schuss eines Fernkämpfers oder Turms
  holt ihn herunter.
- KI: Raben spähen die Adern der Gegenseite aus und meiden bekannte Türme;
  die Menschen setzen einen Posten an den Domänenrand.
- **Türme ohne Gegenwart** schießen nicht — jetzt als Warnung im HUD. Die
  Reichweite war nicht das Problem: Wachturm und Wächterbaum treffen auf
  90 m, Jäger 48 m, Waldgeister 52 m. Ein versorgter Wächterbaum erledigt
  fünf anrückende Jäger allein.
- Messung: Menschen 12 : Gott 46 (vorher 17 : 31) — die Raben verschaffen
  dem Gott das Wissen, wo die Förderung der Menschen steht.
  `docs/scope.md`, Abschnitt 20.
- Modelle und Icons für Rabe und Spähposten sind Platzhalter
  (`src/platzhalter.js`), bis Gemini echte liefert.

## 0.27 — Nebel des Krieges für alle, Geminis Grafik

- **Weicher Nebel:** feines Sichtfeld (256 × 256) mit weichen, runden
  Rändern, das beim Auf- und Zudecken überblendet — 2D, 3D, Minikarte.
- **Die KI sieht nichts, was sie nicht sieht.** `src/sim/kunde.js` hält
  fest, was ein Spieler weiß: Sicht, gesehene Gebäude und Einheiten, wo der
  Gegner beginnt. Die KI nutzt nur das (Test: Ungesehenes ändert keinen
  Befehl). Sie sucht gegnerische Förderbauten an den Adern auf der
  gegnerischen Seite und merkt sich gesehene Einheiten 10 Minuten.
- **Nichts verrät Ungesehenes:** Baupläne werden nur gegen Eigenes und die
  Karte geprüft (ein ungesehenes gegnerisches Gebäude findet der Erbauer vor
  Ort), Adern im Nebel zeigen nicht, ob sie besetzt sind.
- Messung: Menschen 17 : Gott 31, 24 von 72 offen (volle Sicht: 25 : 38).
  Im Nebel tut sich die Menschen-KI schwerer — `docs/scope.md`, Abschnitt 19.
- **Grafik von Gemini** (Branch `gemini/grafik`, gemergt): vollständiger
  Icon-Satz, organische 2D-Karte (Ufer, Felsfacetten, Marschpfad),
  3D-Landschaft mit Waldstücken und Ufern, Hemi- und Randlicht, sechs
  Waldgott-Varianten in der Galerie, Ausbildungsleiste mit Einheiten-Icons
  für Fabriken.

## 0.26 — Baupläne, Baureihen, Auswahlleiste

- **Baupläne:** Ein gesetztes Gebäude ist erst ein Plan — kein Gebäude,
  keine Kosten, keine Sicht, für den Gegner unsichtbar. Erst wenn ein
  Erbauer daneben ankommt, wird bezahlt und die Baustelle entsteht. Fehlt
  Fron, wartet er. Wer einen Plan in die gegnerische Basis setzt, sieht
  dort nichts mehr. Ein Plan auf inzwischen belegtem Platz verfällt.
  Gleichzeitige Baubeginne werden reihum vergeben (`baubeginnRunde`), wie
  Befehle.
- **Baureihen:** Mit `Shift` gesetzte Pläne (oder Shift-Rechtsklick auf
  Plan/Baustelle) kommen hinten in die Reihe der Erbauer; nach dem ersten
  Gebäude geht es direkt zum nächsten. Ohne Shift ersetzt ein neuer Auftrag
  die Reihe, ebenso jeder Bewegungsbefehl.
- **Auswahlleiste unten:** je Einheitentyp der Auswahl ein Icon mit Anzahl;
  ein Klick behält nur diesen Typ aus der Auswahl.
- **Bauleiste nur mit Erbauern**, als Icons mit Kosten und Taste.
- **Weniger Text:** Das HUD zeigt nur Kommandant und Zeit, dazu Auswahl und
  Warnungen, wenn Gegenwart knapp ist. Netze, Fläche, Fron/min und die
  lange Tastenzeile sind weg — Steuerung über `H` oder `?`, Flächen in der
  Auswertung (`I`).
- **Pulk:** Dicht stehende Gruppen kommen zur Ruhe. Wer am Ziel eine schon
  angekommene Einheit desselben Befehls berührt, ist auch angekommen; wer
  angekommen ist und nur leicht geschoben wird, bleibt stehen. Vorher
  drängelten alle um denselben Punkt. In 3D drehen sich Einheiten nicht mehr
  beim Rempeln.
- KI rechnet ihre Pläne wie Baustellen mit (Kosten zurückgelegt, kein
  Doppelplan). Zwei KI-Fehler behoben: Eine Ader mit eigenem Plan galt als
  frei — die KI setzte den Plan jeden Zug neu und produzierte nichts mehr
  (bis 3000 Fron gehortet). Pläne ohne Erbauer an unsicherer Stelle
  verwirft sie jetzt, statt sie zu verteidigen.
- Messung (36 Seeds, Stil-Paarungen): Menschen 25 : Gott 38, 0.25 hatte
  25 : 32 — die Menschen gewinnen gleich oft, der Gott entscheidet mehr
  vorher offene Partien. Details in `docs/scope.md`, Abschnitt 18.

## 0.25 — Vorbereitung für Gemini, Ressourcenleiste

- **Grafik in eigenen Dateien**, damit Gemini parallel daran arbeiten kann:
  `src/render3d.js` (Renderer, Shader), `src/modelle3d.js` (Modelle,
  Waldgott-Varianten), `src/gelaende3d.js` und `src/gelaende2d.js`
  (Gelände), `src/icons.js` (Icons). Regeln in `GEMINI.md`, Auftrag und
  Masterprompt in `docs/grafik/auftrag.md`.
- **Galerie** `dist/galerie.html`: Waldgott-Varianten, Einheiten, Gebäude,
  Karte und Icons nebeneinander, drehend — für die Wahl des Grafikstils.
- `test/grafik.test.js` prüft Modelle (Format, Vollständigkeit, Budget) und
  Icons; Galerie-Smoke-Test. Fand gleich einen Fehler: Kurzfarben wie `#555`
  wurden als NaN gelesen.
- **Ressourcenleiste:** Glühbirne = freie Skillpunkte, eigenes Icon für
  Gegenwart, feste Breiten — die Leiste wächst nicht mehr mit den Zahlen.

## 0.24 — Schwierigkeitsgrade

- Gegner-KI in drei Stufen (`STUFEN` in `ai.js`), nur über Verhalten,
  ohne Boni bei Ressourcen oder Werten:
  - **Leicht:** entscheidet halb so oft, 70 % der Arbeiter, zweite Fabrik ab
    Minute 8, keine dritte, baut kaum aus, erster Turm ab Minute 10, keine
    Fähigkeiten, keine Reparatur, greift seltener an.
  - **Mittel:** die KI bis 0.23.
  - **Schwer:** entscheidet doppelt so oft, 130 % der Arbeiter, Fabriken ab
    Minute 4 und 8, baut ab Minute 6 und 11 aus, greift früher an.
- Auswahl auf dem Startbildschirm beider Ansichten, HUD nennt sie.
- `tools/sweep.mjs … stufen` lässt die Stufen gegeneinander spielen.
- Messung (32 Seeds, beide Fraktionen und Sitzplätze): Schwer schlägt
  Mittel in 90 %, Mittel schlägt Leicht in 93 % der entschiedenen Partien.

## 0.23 — Nebel des Krieges

- Jede Einheit und jedes Gebäude sieht in einem Umkreis (`sicht` in
  `defs.js`; Einheiten 90 m, Gebäude 70 m, Baustellen 40 m; Türme 120 m,
  Hauptgebäude 130 m, Fernkämpfer und Kommandanten 100 m).
- `sichtGitter()` in der Simulation liefert, was ein Spieler sieht; die
  Simulation selbst bleibt ohne Nebel.
- Beide Ansichten: Unbekanntes ist fast schwarz, Erkundetes gedämpft,
  Sichtbares klar. Gegnerische Einheiten nur in Sicht; gegnerische Gebäude
  dort, wo man sie zuletzt gesehen hat (matt); gegnerische Domänen nur von
  bekannten Ankern. Minikarte ebenso. In 3D als Textur im Shader.
- Beim Zuschauen ist der Nebel aus. Die KI sieht weiter alles.

## 0.22 — Karte mit Felsen und Seen, Wegfindung

- **Neue Karte** (`KARTE` in `defs.js`, punktsymmetrisch): vor jeder Basis
  ein Felsgrat mit breitem Tor zur Mitte und zwei Seitenpfaden; ein Felsring
  um die große Götterblut-Ader mit vier Zugängen; zwei Seen; Götterblut auch
  an den Seitenrändern; je Basis fünf Fron-Vorkommen in der Grunddomäne.
  Felsen und Seen sind unpassierbar und nicht bebaubar.
- **Wegfindung** (`src/sim/weg.js`): Gitter mit 20-m-Zellen, je Ziel ein
  Flussfeld (Dijkstra vom Ziel aus). Wer sein Ziel sieht, läuft gerade; sonst
  zum weitesten sichtbaren Punkt entlang des Feldes. Ganzzahlig und
  punktsymmetrisch — auch für Punkte genau auf Zellgrenzen.
- Einheiten auf exakt demselben Punkt werden jetzt auseinandergeschoben.
  Vorher stapelten sie sich unbemerkt — ein Vorteil für die Masse, der die
  Menschen in KI-Partien um 14 Siege gestärkt hatte. Ausgeglichen mit Soldat
  215 LP und Wolf 540 LP.
- KI: zieht Wellen gegen Förderbauten, die kein Turm deckt, und von der
  Welle aus zum nächsten; spart für Gegenwart, wenn sie fehlt; Förderbauten
  gehen der Baustellen-Obergrenze vor; mehr Arbeiter; plant nicht auf Felsen.
- Darstellung: Felsen und Seen in beiden Ansichten und auf der Minikarte.
- Messung (128 Partien): Menschen 48 : Gott 47, 33 offen, Ø 31 min.

## 0.21 — Belagerung

- **Katapult** (Menschen): Fernkampf, 100 m — weiter als jeder Turm —,
  260 Schaden gegen Gebäude alle 3 s, gegen Einheiten fast nutzlos, 500 LP,
  langsam. 250 Fron.
- **Wurzelbrecher** (Gott): Nahkampf, 3200 LP, 240 Schaden gegen Gebäude
  je Sekunde, gegen Einheiten schwach. Bricht allein einen versorgten Turm.
  280 Fron.
- Belagerer greifen Gebäude in Reichweite zuerst an (`weapon.vorrang`),
  eigener Schaden gegen Gebäude (`weapon.gebaeude`). Freizuschalten im
  Einheiten-Ast (Belagerungsbau, Wurzelbrecher wecken).
- Kaserne und Dickicht bilden jetzt Soldat/Wolf, Fernkämpfer, schwere und
  Belagerungseinheit aus; Bauern und Dryaden kommen nur noch aus den
  Hauptgebäuden.
- KI baut je feindlichem Turm einen Belagerer, höchstens drei.
- 3D-Modelle für beide, das Katapult wirft Steine im hohen Bogen.
- Messung (128 Partien): Menschen 71 : Gott 57, Sitz 0 gewinnt 61, Ø 23 min.

## 0.20 — Drei Fähigkeiten je Kommandant

- Jeder Kommandant hat drei aktive Fähigkeiten, jede ein eigener Skill im
  Kommandanten-Ast:
  - **Held:** Schlachtruf (+30 % Schaden, 15 s), Schildwall (−35 %
    genommener Schaden, 15 s), Ansturm (+50 % Tempo, 10 s) — jeweils für
    eigene Einheiten im Umkreis von 90 m.
  - **Waldgott:** Wurzelgriff (Feinde um einen Zielpunkt stehen 8 s fest),
    Lebenssaft (eigene Einheiten im Umkreis bekommen 300 LP zurück),
    Rudelruf (drei Wölfe für 40 s, ohne Unterhalt).
- Ist der eigene Kommandant gewählt, erscheinen drei Knöpfe mit Zustand
  (bereit, Abklingzeit, im Skillbaum gesperrt); Tasten `Q` `W` `E`.
  `F` entfällt. Jede Fähigkeit hat ihre eigene Abklingzeit und Farbe.
- KI lernt die neuen Fähigkeiten zuletzt und setzt alle sechs ein.
- Messung (127 Partien): Menschen 59 : Gott 68, Ø 26 min.

## 0.19 — Ressourcenleiste, Silhouetten, große Ents

- **Ressourcenleiste** nach dem Entwurf des Nutzers in beiden Ansichten:
  dunkle Leiste oben links, Glühbirne = Gegenwart-Überschuss aller Netze,
  Tropfen = Götterblut, Kristalle = Fron; knappe Werte rot, Einzelheiten im
  Tooltip.
- 3D: Kamera dreht nicht mehr (Schieben und Zoomen bleiben).
- 3D: Einheiten hinter Gebäuden und Bäumen bleiben als Umriss in Teamfarbe
  sichtbar.
- Ents sind mächtig groß (Radius 66 statt 44) — auch in der Simulation.
  Ein Test prüft den ganzen Weg: Skills lernen, Götterblut zahlen, im
  Dickicht ausbilden, zuschlagen.

## 0.18 — Starke Türme, Reparatur

- **Wachturm und Wächterbaum** halten allein eine frühe Welle von rund
  600 Fron auf und fallen gegen die anderthalb- bis doppelte Menge: 3000 LP,
  60 Schaden alle 0,4 s, 90 m Reichweite. Dafür 300 Fron und 25 s Bauzeit.
- **Reparatur:** Erbauer (Arbeiter, Kommandant) reparieren beschädigte
  eigene Gebäude, solange sie daneben stehen — Erbauer wählen, Rechtsklick
  aufs Gebäude. 3 LP je Tick bei voller Baukraft, 1 Fron je 20 LP, ohne Fron
  keine Reparatur (`RULES.reparaturProTick`, `reparaturLpJeFron`).
  Die Auswahl zeigt, ob repariert wird, oder wie man jemanden schickt.
- KI: spart für Turm (ab Minute 3) und Forschung (ab Minute 4), repariert
  sichere beschädigte Gebäude, zählt feindliche Türme beim Angriffsentscheid
  mit.
- Waldgeist 24 statt 26 Schaden (nach Messung).
- Messung (126 entschiedene Partien): Menschen 59 : Gott 67, Ø 24 min.

## 0.17 — Gebäude je Rolle, Nah- und Fernkampf

- Jede Fraktion hat jetzt dieselben zehn Rollen (Vorbild Supreme Commander 2):

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
  | Nahkampf | Bauer, Soldat, Söldner, Held | Dryade, Wolf, Ent |
  | Fernkampf | Jäger | Waldgeist, Waldgott |

- **Grenzstein** ist der neue Anker der Menschen (Werte des bisherigen
  Wachturms). Der **Wachturm** und der **Wächterbaum** schießen auf Feinde
  bis 60 m vom Rand, brauchen dafür Gegenwart (Zorn-Stufe, zuletzt
  gedrosselt) und schweigen ohne sie.
- **Skriptorium** und **Raunende Eiche** beschleunigen die Skillpunkte um je
  50 %, solange sie versorgt sind. Skillpunkte sind dafür jetzt ein
  Forschungsvorrat je Spieler statt einer reinen Zeitrechnung.
- **Nah- und Fernkampf:** Reichweite zählt jetzt von Rand zu Rand.
  Nahkämpfer schlagen erst bei Berührung zu (2 bis 4 m), Fernkämpfer
  schießen weit (Jäger 48 m, Waldgeist 52 m, Waldgott 38 m). Jede Einheit
  trägt `kampf: 'nah' | 'fern'`.
- Werte nach Messung: Wolf 600 LP, Dryade wieder 70 % Baukraft.
- Bauleiste `1`–`9`; Info-Karten zeigen Kampfart, Schaden je Schuss oder
  Schlag, Reichweite und Forschung; gewählte Fernkämpfer und Türme zeigen
  ihre Reichweite. 3D-Modelle für die fünf neuen Gebäude.
- KI baut ab Minute 3 Forschung und ab Minute 6 einen Turm zur Front.
- Messung (128 Partien): Menschen 63 : Gott 65, Sitz 0 gewinnt 53, Ø 20 min.

## 0.16 — Gebaut wird nur von Erbauern

- **Baufortschritt gibt es nur, solange Erbauer mit Auftrag direkt daneben
  stehen** (Arbeiter oder Kommandant) — in und außerhalb der Domäne.
  Gegenwart allein baut nichts mehr. Die Baustelle beginnt, wenn der
  Erbauer ankommt; geht er weg, steht sie still.
- Baustellen ziehen keine Gegenwart mehr. Der Mindestfluss
  (`RULES.werkFloor`) hält nur noch Fabriken am Laufen.
- Dryade baut mit 60 statt 70 % Kraft (Designzahl, nach Messung).
- Oberfläche: Eine gewählte Baustelle zeigt, wie viele Erbauer bauen oder
  unterwegs sind — oder warnt, dass sie wartet. Die Info-Karte nennt die
  Bauzeit mit Kommandant und mit einem Arbeiter. Beim Setzen ohne gewählte
  Erbauer erscheint ein Hinweis.
- KI: Arbeiterzahl nach Baukraft (mehr Bauern als Dryaden), Verteilung auf
  die Baustelle mit den wenigsten Erbauern, nicht mehr offene Baustellen als
  Erbauer.
- Messung (64 Partien): Menschen 33 : Gott 31, Sitz 0 gewinnt 31, Ø 16,5 min.

## 0.15 — Info-Karten: wissen, was man baut

- Jede Einheit und jedes Gebäude hat eine Beschreibung (`desc` in
  `defs.js`); die Zahlen setzt die Oberfläche aus den Daten dazu.
- **Info-Karte** beim Überfahren der Bauleiste und beim Platzieren: Kosten,
  Bauzeit, Leben, Gegenwart (braucht/liefert), Domäne, Förderung,
  Standort, Rodung, Schrein-Wirkung, was die Fabrik ausbildet — und ob es
  gesperrt ist und welcher Skill es freischaltet.
- Bauleiste zeigt die Kosten direkt auf den Knöpfen.
- Gewählte Fabrik: Ausbildungsliste mit Kosten, Zeit und Unterhalt je
  Einheit. Gewählte Einheit: Leben, Erfahrung, Schaden je Schlag und pro
  Sekunde, Reichweite, Tempo, Unterhalt, Baukraft.
- Startbildschirm erklärt Unterhalt, Skillpunkte und Erfahrung.
- Alles in `src/ui-gemeinsam.js`, dieselben Karten in 2D und 3D.

## 0.14 — Skillpunkte und Skillbaum

- **Skillpunkte mit der Zeit:** einer zu Beginn, dann einer alle 2 Minuten
  (`RULES.skillStart`, `skillTakt`).
- **Skillbaum je Fraktion** (`SKILLS` in `defs.js`), vier Äste:
  - *Einheiten:* Jäger, Söldner bzw. Waldgeist, Ent sind gesperrt, bis sie
    gelernt sind (Söldner und Ent brauchen den ersten Skill).
  - *Gebäude:* die beiden Schreine je Fraktion.
  - *Verbesserungen:* +10 % Schaden, −10 % genommener Schaden, +20 %
    Förderung, 25 % schnellere Ausbildung, −25 % Unterhalt — als Kette mit
    Voraussetzungen.
  - *Kommandant:* −20 % genommener Schaden, dann die aktive Fähigkeit:
    **Schlachtruf** (Held: eigene Einheiten im Umkreis von 90 m teilen 15 s
    lang 30 % mehr Schaden aus) bzw. **Wurzelgriff** (Waldgott: Feinde im
    Umkreis von 60 m um einen Punkt stehen 8 s lang fest).
- Neue Befehle `lernen` und `faehigkeit`; gesperrte Typen lassen sich
  weder bauen noch ausbilden.
- Oberfläche (2D und 3D): `T` öffnet den Skillbaum, ein Klick lernt; `F`
  setzt die Fähigkeit ein (Wurzelgriff mit Zielkreis). HUD zeigt freie
  Punkte, Zeit bis zum nächsten und die Bereitschaft der Fähigkeit.
  Gesperrte Gebäude und Einheiten sind ausgegraut. Schreine zeigen ihren
  Wirkungskreis, Fähigkeiten einen Ring.
- KI lernt in fester Reihenfolge, achtet auf Sperren und setzt die Fähigkeit
  ein, wenn ihr Kommandant im Kampf steht.
- Messung (64 Partien): Menschen 33 : Gott 31, Sitz 0 gewinnt 31, Ø 15 min;
  ohne Skillbaum 29 : 35.

## 0.13 — Erfahrung

- Einheiten und fertige Gebäude sammeln Erfahrung: je volle Minute am
  Leben 1 %, höchstens 10 % (`RULES.erfahrungProMin`, `erfahrungMax`).
  Erfahrung erhöht den ausgeteilten und senkt den genommenen Schaden.
- Auswahl zeigt Lebenspunkte und Erfahrung, jetzt auch für einzelne
  Einheiten. Gemeinsame Texte beider Ansichten in `src/ui-gemeinsam.js`.
- Messung (64 Partien): Menschen 29 : Gott 35 mit, ohne und mit doppelter
  Erfahrung — in KI-Partien wirkt sie nicht spürbar.

## 0.12 — Mehr RTS: Unterhalt, schnellere Wirtschaft, Schreine im Umkreis

- **Unterhalt:** Jede Einheit kostet laufend Fron pro Minute (Bauer 4,
  Soldat 9, Jäger 10, Söldner 24, Dryade 12, Wolf 24, Waldgeist 24, Ent 56;
  Kommandanten nichts). Keine harte Obergrenze: Das Heer wächst, bis der
  Unterhalt die Förderung auffrisst. Wer nicht zahlen kann, steht bei null
  und kann nichts mehr kaufen; Einheiten gehen nicht verloren. Das HUD zeigt
  Förderung, Unterhalt und Saldo pro Minute.
- **Weniger Ausbreitung:** Hauptgebäude tragen eine Grunddomäne von 400 m
  (`anchorMin`), die die ganze Startbasis abdeckt. Anker braucht man zum
  Ausgreifen, nicht für Strom daheim.
- **Schnellere Wirtschaft:** Förderung 240 → 360 Fron pro Minute, Bauzeiten
  der Gebäude × 0,7, der Einheiten × 0,8, Startfron 900 → 1100.
- **Schreine wirken im Umkreis** (300 m um den Schrein, in der eigenen
  Domäne) statt im ganzen Domänennetz. Die Basis ist stark, Außenposten und
  Förderbauten sind angreifbar.
- Einheitenwerte per Duell nachgezogen: Wolf 540 LP / 22 Schaden, Jäger
  180 LP / 13 Schaden, Waldgeist 480 LP / 26 Schaden für 130 Fron.
- KI: greift an, wenn das Heer satt ist (Unterhalt ≥ 80 % der Förderung),
  nimmt ab Minute 9 und 15 ein viertes und fünftes Fron-Vorkommen, sucht
  freie Plätze statt besetzter und sperrt abgelehnte Bauplätze für zwei
  Minuten (vorher hing sie an einem besetzten Platz fest und baute keine
  Einheiten mehr).
- `tools/sweep.mjs` verteilt jetzt auch eine einzelne Einstellung auf alle
  Kerne; neue Einstellungen für Unterhalt, Grunddomäne und Schrein-Umkreis.
- Messung (64 Partien): Menschen 29 : Gott 35, Sitz 0 gewinnt 29, Ø 17 min,
  keine Partie offen.

## 0.11 — Bauaufträge

- Erbauer (Bauer, Dryade, Kommandant) bauen nur ihren Auftrag und nur direkt
  daneben; ein Auftrag je Einheit, ein neuer Befehl ersetzt ihn. Aufträge
  beim Platzieren mit ausgewählten Erbauern oder per Rechtsklick auf eine
  eigene Baustelle. Baulinien in beiden Ansichten.
- Sitzvorteil beseitigt: Der Vorrang bei gleichzeitigen Befehlen wechselt
  jetzt per Zähler statt nach Tick-Parität (die KI handelt immer in geraden
  Ticks), und gleich weite Adern wählt die KI punktsymmetrisch.
- Messung (160 Partien): Menschen 74 : Gott 77, Sitz 0 gewinnt 84 von 151.

## 0.10 — Viele gegen wenige, Schreine, 3D-Ansicht

- Neue Einheiten nach Vorgabe des Nutzers: Menschen viele günstige (Bauer,
  Soldat, Jäger, Söldner), Gott wenige starke (Dryade, Wolf, Waldgeist,
  Ent); Werte per Duell bei gleichem Fron abgestimmt.
- Arbeiter bauen wie der Kommandant, nur schwächer; die KI verteilt sie auf
  Baustellen. Produktion `Q`–`R` für alle vier Plätze einer Fabrik.
- Heimvorteil aus Gebäuden: Schreine für Zorn und Wehr (Drossel-Stufen, die
  vorher ungenutzt waren), wirken im eigenen Domänennetz. `homeBonus` und
  `RULES.tiefeVoll` entfernt.
- KI: Wellen und Leibwache nach Heereswert statt Kopfzahl, Angriff nur mit
  Überlegenheit gegen den Verteidiger samt Schreinen, Heer geht vor Sparen,
  höchstens acht eigene Anker.
- **3D-Ansicht** `dist/drei-reiche-3d.html`: WebGL 2 ohne Bibliothek,
  Modelle aus Grundkörpern für alle Einheiten und Gebäude, Interpolation
  zwischen den Ticks, Schrittbewegung und Ausfall beim Angriff, Schatten,
  Pfeile und Lichtkugeln als Geschosse,
  Domänen per Stencil, RTS-Kamera, dieselbe Steuerung.
  Eigener Smoke-Test.
- Messung: Menschen 51 : Gott 106; ohne Kommandant 160 : 0.

## 0.9 — Kommandanten

- Held (Menschen) und Waldgott: je einer, einmalig, nach Vorbild der ACU aus
  Supreme Commander. 6000 Leben, starke Waffe, baut die nächste eigene
  Baustelle mit voller Kraft — auch außerhalb der Domäne (Außenposten).
  Fällt er, ist die Partie verloren.
- KI: Kommandant geht nicht mit Wellen, hat eine Leibwache, zieht sich unter
  halbem Leben zurück. Stil Sturm schickt ihn nach vorn (Außenposten an den
  Adern), Standard und Burg lassen ihn beim Hauptgebäude bauen.
- UI: `K` wählt ihn aus, Baulinie zur Baustelle, Lebensbalken, HUD-Zeile.
- Messung: Menschen 28 : Gott 122 (ohne Kommandant 60 : 100); der Held
  fällt meist zu Hause. Spiegeltest vergleicht jetzt bis zur ersten
  Ader-Belegung statt fester Tickzahl.

## 0.8 — Werkzeuge für den Selbsttest

- Startbildschirm: die eine Frage, beide Fraktionen, Zahlen aus `defs.js`;
  Gegner-Stil wählbar (Sturm, Standard, Burg).
- Auswertung (`I`, am Ende automatisch): Reibung durch gedrosselte und
  stillstehende Baustellen, Kampfort, Anker, erstes Götterblut.
- Domänengrenze als eine Außenkante der Kreisvereinigung; gepunkteter
  Vorschauring zeigt, wie weit wachsende Anker in zwei Minuten reichen.
- KI-Stile und Stil-Matrix im Sweep. Befund: früher Angriff dominiert.

## 0.7 — Spielbarkeit

- Angriffsbewegung (`A` + Klick); die KI nutzt sie für Wellen und Abwehr.
- Einheiten verfolgen Feinde nahe ihres Befehlspunkts (an der Leine).
- Gebäude sind Hindernisse, Einheiten gleiten seitlich herum.
- Zuschauen-Modus: KI gegen KI in der Oberfläche.
- KI greift gegnerische Götterblut-Förderung gezielt an.
- Experimente `RULES.ankerKraft` und `RULES.tiefeVoll` (aus): beide lassen
  `max` wirkungslos.

## 0.6 — Balance

- Gott-Startradius 900 → 950: ausgeglichen bei 160 Partien (76 : 84), bevor
  die Angriffsbewegung kam (danach 60 : 100).

## 0.5 — Fairness und Götterblut

- Sitz 0 gewann bis zu 66 von 80 Partien. Ursachen: Rundung der Summe statt
  des Versatzes, feste Befehlsreihenfolge, Kampf und Wegschieben
  nacheinander, Spawnwinkel nach Entitäts-ID. Alles behoben, Spiegeltest
  als Unit-Test.
- Götterblut: Blutschacht und Blutwurz auf den Adern der Mittelachse,
  brauchen versorgte Domäne. **Designentscheidung:** schwere Einheiten
  kosten 10 Götterblut, ihr Fron-Preis sinkt auf 130/135 (vorher pro Fron
  schlechter als leichte).
- Kosten allgemein über alle Ressourcen, Abriss erstattet auch Götterblut.

## 0.4 — Abriss, fremder Boden, Fläche *(Ursprungssitzung)*

- Abriss mit Teilerstattung (`Entf`).
- `RULES.fremdMalus`: Schaden in fremder Domäne, offene Konzeptfrage (aus).
- HUD zeigt Domänenfläche beider Seiten mit Verlauf.
- KI setzt Anker an den Domänenrand und sammelt sich an der Front.
- `match.mjs` misst die echte Fläche (Vereinigung) und den Kampfort.

## 0.3 — Die alten Befunde waren ein Fehler

- `npm test` fand unter Windows 0 Tests und meldete Erfolg.
- Mindestfluss für Baustellen: Segen konnte alle Gegenwart binden; die
  Baustelle der rettenden Quelle stand für immer still. Daran scheiterte
  die Menschen-KI in jeder Partie — „der Gott gewinnt immer“ war kein
  Balance-Befund.
- Tempo: Förderung pro Minute statt pro Tick, Bauzeiten ×6 bzw. ×5;
  Partien dauern nun lange genug, dass Wachstum wirkt.
- Schaden an Baustellen bleibt bestehen; KI nur noch mit Ganzzahlen.

## 0.2 — Ausgangsstand aus `drei-reiche.zip`
