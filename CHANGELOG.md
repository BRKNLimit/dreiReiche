# Änderungen

Messwerte: KI gegen KI, beide Sitzplätze, Menschen : Gott. Details und
Tabellen in `docs/scope.md`.

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
