# Was dieser Prototyp beantwortet — und was nicht

## Die eine Frage

> Fühlt sich eine Domäne, deren Radius bei einer Fraktion fest ist und bei der
> anderen mit der Zeit wächst, tatsächlich unterschiedlich an?

Alles im Code dient dieser Frage. Was sie nicht berührt, fehlt absichtlich.

## Befunde aus den Testläufen (Stand 0.3)

Gemessen mit `npm run match` bzw. einem Sweep über 12 Seeds × beide
Sitzplätze = 24 KI-Partien je Einstellung, Abbruch nach 45 Minuten.

**Die alten Befunde aus 0.2 waren ein Fehler, keine Balance.** „Der Gott
gewinnt immer“, „beide horten Fron“ und „die Menschen bauen kaum Anker“ hatten
eine Ursache: Zwei Sägewerke banden die gesamte Gegenwart der Thingstätte
(Segen), alle Baustellen (Werk) bekamen null, auch die Schmiede, die das
gelöst hätte. Die Menschen-KI baute in keiner Partie eine einzige Einheit.
Behoben durch den Mindestfluss (`WERK_FLOOR`, siehe `docs/konzept.md`).

**Das Tempo war zu hoch, um die Frage zu stellen.** Ein Sägewerk lieferte
4200 Fron pro Minute, Gebäude standen nach 3,5 Sekunden, Partien endeten nach
3–5 Minuten — bevor ein Hain auch nur die Hälfte seines Wachstums erreicht.
Jetzt: Förderung pro Minute (240), Bauzeiten ×6 bzw. ×5. Partien dauern
8–34 Minuten, im Mittel um 20.

**Ausgangseinstellung: 12 : 12.** Der Sitzplatz entscheidet nur noch schwach
(Spieler 0 gewinnt 14 von 24). Vorher waren Karte und KI-Bauwinkel
asymmetrisch und Spieler 1 gewann 20 von 24.

**Die Balance steht auf einer Messerschneide:**

| Einstellung | Menschen : Gott |
| --- | --- |
| Ausgang (Gott start 900, homeBonus 1500) | 12 : 12 |
| Gott start 600 | 6 : 0 (von 6, alle in Minute 8) |
| Gott start 1000 | 5 : 19 |
| homeBonus 1250 | 21 : 3 |
| homeBonus 1000 | 6 : 0 (von 6) |
| Menschen-Radius 3000 statt 2600 | 13 : 11 |
| Gott max 3900 statt 5200 | 14 : 10 |
| Gott max 7000 statt 5200 | 13 : 11 |

**Was das für die eine Frage heißt:** Entschieden wird über den *frühen*
Radius und den Heimvorteil, kaum über die große späte Domäne. `max` bewegt
das Ergebnis um höchstens zwei Partien. Die Fläche des Gottes überholt die
der Menschen um Minute 5 und ist ab Minute 12 mehr als doppelt so groß — aber
die KI nutzt diese Fläche nicht, sie kämpft nahe der eigenen Basis. Ob ein
Mensch am Steuer die späte Domäne ausspielt, kann nur Selbstspielen zeigen.

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

1. **Selbst spielen** und notieren, wann die Domäne fordert statt zu nerven —
   besonders: Lohnt es sich als Gott, Haine früh weit vorn zu pflanzen?
2. Entscheiden, ob die Messerschneide gewollt ist. Wenn nicht: `homeBonus`
   flacher machen (z. B. 1300) und dafür `start` leicht anheben.
3. KI, die die große Domäne nutzt (vorgeschobene Quellen, Kämpfe an der
   Grenze), sonst misst `npm run match` den späten Radius nicht.
4. Erst danach Todesgott, Götterblut oder Gelände.

## Bekannte Schwächen

- Die KI nutzt die späte Gott-Domäne nicht; `max` ist in KI-Partien fast
  wirkungslos.
- Einheiten laufen durch Gebäude hindurch.
- Gerodeter Boden erholt sich nie wieder — der Wurzler kann das noch nicht.
- Arbeiter (Köhler, Wurzler) haben keine Funktion; Gebäude entstehen per
  Befehl.
- Gebäude lassen sich nicht abreißen.
