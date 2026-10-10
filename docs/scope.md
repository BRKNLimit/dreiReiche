# Was dieser Prototyp beantwortet — und was nicht

## Die eine Frage

> Fühlt sich eine Domäne, deren Radius bei einer Fraktion fest ist und bei der
> anderen mit der Zeit wächst, tatsächlich unterschiedlich an?

Alles im Code dient dieser Frage. Was sie nicht berührt, fehlt absichtlich.

## Befunde aus den Testläufen (Stand 0.4)

Gemessen mit `npm run match` bzw. einem Sweep über 12 Seeds × beide
Sitzplätze = 24 KI-Partien je Einstellung, Abbruch nach 45 Minuten.

**Die alten Befunde aus 0.2 waren ein Fehler, keine Balance.** „Der Gott
gewinnt immer“, „beide horten Fron“ und „die Menschen bauen kaum Anker“ hatten
eine Ursache: Zwei Sägewerke banden die gesamte Gegenwart der Thingstätte
(Segen), alle Baustellen (Werk) bekamen null, auch die Schmiede, die das
gelöst hätte. Die Menschen-KI baute in keiner Partie eine einzige Einheit.
Behoben durch den Mindestfluss (`RULES.werkFloor`, siehe `docs/konzept.md`).

**Das Tempo war zu hoch, um die Frage zu stellen.** Ein Sägewerk lieferte
4200 Fron pro Minute, Gebäude standen nach 3,5 Sekunden, Partien endeten nach
3–5 Minuten — bevor ein Hain auch nur die Hälfte seines Wachstums erreicht.
Jetzt: Förderung pro Minute (240), Bauzeiten ×6 bzw. ×5. Partien dauern
8–34 Minuten, im Mittel um 20.

**Ausgangseinstellung: ausgeglichen.** Über zwei Seed-Reihen 11 : 13 und
14 : 10. Der Sitzplatz entscheidet nur noch schwach (Spieler 0 gewinnt 13–14
von 24). Vorher waren Karte und KI-Bauwinkel asymmetrisch und Spieler 1
gewann 20 von 24.

**Die Balance steht auf einer Messerschneide.** Gemessen mit der KI aus 0.3
(vor Randplatzierung der Anker); die Tendenzen gelten weiter:

| Einstellung | Menschen : Gott |
| --- | --- |
| Ausgang (Gott start 900, homeBonus 1500) | 12 : 12 |
| Gott start 600 | 6 : 0 (von 6, alle in Minute 8) |
| Gott start 1000 | 5 : 19 |
| homeBonus 1250 | 21 : 3 |
| homeBonus 1300, start 900 / 1000 / 1100 | 16 : 8 / 9 : 15 / 6 : 18 |
| Menschen-Radius 3000 statt 2600 | 13 : 11 |

Ein flacherer Heimvorteil macht die Balance *nicht* robuster: Auch bei 1300
kippen 100 dm Startradius sechs bis sieben von 24 Partien.

**Der späte Radius entscheidet nichts — und liefert kaum Fläche.** Aktuelle
KI, 24 Partien je Zeile, Fläche als Vereinigung der Kreise in Minute 10:

| Gott max | Menschen : Gott | Fläche Menschen | Fläche Gott |
| --- | --- | --- | --- |
| 3900 | 13 : 11 | 104 ha | 91 ha |
| 5200 | 14 : 10 | 104 ha | 98 ha |
| 7000 | 15 : 9 | 104 ha | 98 ha |

Der Verlauf ist der eigentliche Unterschied der Fraktionen: In Minute 3 hat
der Gott 26 ha gegen 62 ha, bis Minute 10 holt er auf — überholt aber nicht.
Gründe:

- Ein neuer Hain muss *in* der eigenen Domäne stehen, sonst hat die Baustelle
  keine Gegenwart. Wachsen die Kreise später auf 520 m, überdecken sie sich
  fast ganz. Ein großer Radius macht die eigenen älteren Anker überflüssig.
- Die Basen liegen nahe der Kartenecke; ein Teil jedes großen Kreises liegt
  außerhalb der Karte.
- Die Menschen halten mit der Anzahl ihrer Türme mit.

*Korrektur:* Die frühere Angabe „ab Minute 12 mehr als doppelt so groß“
beruhte auf der Summe der Kreisflächen und zählte Überlappungen mehrfach.

**Wo gekämpft wird.** Rund 60–67 % aller Schüsse fallen in der Domäne des
Gegners, 32–39 % in der eigenen, fast nichts im Niemandsland. Entschieden wird
durch Angriffswellen auf das gegnerische Hauptgebäude, also auf fremdem Boden.

**Malus auf fremdem Boden** (`RULES.fremdMalus`, offene Frage aus dem
Konzept), gemessen mit der KI vor Randplatzierung:

| fremdMalus | Menschen : Gott | Ø Dauer |
| --- | --- | --- |
| 1000 (aus) | 11–12 : 12–13 | 13,5 min |
| 800 | 12–13 : 11–12 | 16 min |
| 650 | 14–15 : 9–10 | 23 min |

Der Malus verlängert Partien deutlich (Angriffe werden teurer), macht `max`
aber ebenfalls nicht wirksam. Standard bleibt 1000.

## Bewusst weggelassen

| Fehlt | Warum | Aufwand später |
| --- | --- | --- |
| Pathfinding | Einheiten fahren gerade; auf offener Karte reicht das | hoch |
| Gelände und Wälder als Karte | Roden ist derzeit ein Kreis, kein Gelände | mittel |
| Fog of War | Verdeckt den Test eher, als dass er schärft | mittel |
| Todesgott | Dritte Fraktion erst nach dem Fundament | niedrig (eine Zahl) |
| Götterblut-Förderung und -Verbrauch | Adern liegen auf der Karte, aber kein Gebäude fördert | niedrig |
| Bergung der Gefallenen | Gehört zum Todesgott | niedrig |
| Belagerung, Distanzeinheiten | Dritte und vierte Rolle pro Fraktion | niedrig |
| Netzwerk | Determinismus ist vorbereitet, Lockstep fehlt | hoch |

## Nächste sinnvolle Schritte

1. **Selbst spielen.** Das HUD zeigt jetzt die Fläche beider Domänen und
   ihren Verlauf. Frage: Fühlt sich der frühe Rückstand des Gottes als
   Spannung an — und lohnt es sich, Haine früh weit vorn zu pflanzen?
2. **Entscheiden, was der späte Radius bewirken soll.** Im jetzigen
   Regelwerk ist ein großer Radius vor allem Versorgung und Heimvorteil
   nahe der eigenen Basis. Kandidaten, jeweils für alle Fraktionen gleich:
   Anker dürfen außerhalb der Domäne mit eigener Kleinstversorgung entstehen
   (dann zählt Reichweite), oder der Heimvorteil hängt am Abstand zur
   Grenze statt nur an drinnen/draußen.
3. Erst danach Todesgott, Götterblut oder Gelände.

## Bekannte Schwächen

- Partien entscheiden sich durch Wellen auf das Hauptgebäude; die KI hält
  keine Grenze und erobert keine Fläche.
- Einheiten laufen durch Gebäude hindurch.
- Gerodeter Boden erholt sich nie wieder — der Wurzler kann das noch nicht.
- Arbeiter (Köhler, Wurzler) haben keine Funktion; Gebäude entstehen per
  Befehl.
