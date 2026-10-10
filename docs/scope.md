# Was dieser Prototyp beantwortet — und was nicht

## Die eine Frage

> Fühlt sich eine Domäne, deren Radius bei einer Fraktion fest ist und bei der
> anderen mit der Zeit wächst, tatsächlich unterschiedlich an?

Alles im Code dient dieser Frage. Was sie nicht berührt, fehlt absichtlich.

## Befunde (Stand 0.7)

Messbasis: `npm run sweep -- 80 45`, also 80 Seeds × beide Sitzplätze =
160 KI-Partien je Einstellung, Abbruch nach 45 Minuten. Bei 160 Partien
liegt das Rauschen bei etwa ±6 Siegen; kleinere Unterschiede bedeuten nichts.

### 1. Fairness: Sitz 0 hatte einen eingebauten Vorteil

Mit 80 statt 24 Partien wurde sichtbar: Spieler 0 gewann bis zu 66 von 80,
egal mit welcher Fraktion. Ein Spiegeltest (gleiche Fraktion, gleicher
KI-Seed, Spieler 1 muss Spieler 0 punktgespiegelt folgen) fand die Ursachen:

- **Rundung:** `haupt.x + versatz | 0` rundet die Summe ab statt den
  Versatz zur Null hin — jede Position rückte 1 dm Richtung Spieler 0.
- **Reihenfolge:** Befehle von Spieler 0 galten zuerst; im Kampf schoss, wer
  früher in der Liste stand, zuerst; das Wegschieben überlappender Einheiten
  lief nacheinander.
- **Erscheinungsort** neuer Einheiten hing an der Entitäts-ID.

Jetzt: Versätze zur Null gerundet, Befehle reihum (jeder Tick beginnt ein
anderer Spieler), Kampf und Wegschieben gleichzeitig, Einheiten treten zur
Kartenmitte hin aus. Der Spiegeltest ist ein Unit-Test. Sitz 0 gewinnt in
allen Einstellungen 72–86 von 160.

*Alle Tabellen unter „Verlauf“ sind vor dieser Korrektur gemessen.*

### 2. Götterblut gibt der Reichweite einen Zweck

Vorher hatte die große späte Domäne nichts zu gewinnen: Fron liegt nahe den
Basen, Götterblut wurde nicht gefördert. `max` bewegte das Ergebnis nicht.

Jetzt gibt es je Fraktion einen Förderbau (Blutschacht, Blutwurz), der nur
auf einer Götterblut-Ader steht und wie jeder Verbraucher Gegenwart braucht.
Die Adern liegen auf der Mittelachse. Wer fördern will, muss seine Domäne bis
dorthin schieben — hier zählt Reichweite.

> **Designentscheidung, offen für dich:** Schwere Einheiten (Söldner,
> Geweihter) kosten 10 Götterblut. Das setzt „Eskalation kommt aus dem
> Götterblut“ aus `konzept.md` um, ohne Tech-Tree. Ohne diese Kosten ist
> Götterblut wertlos; mit ihnen entscheidet die Mitte über die Qualität.

**Messung, wann zum ersten Mal Götterblut fließt** (Median):

| | Menschen | Gott |
| --- | --- | --- |
| erste Förderung | Minute 6,9 (160 von 160 Partien) | Minute 14,6 (121 von 160) |

Das ist der erste klare, messbare Unterschied, den die eine Regel erzeugt:
Ein Turm deckt ab Bauende 260 m, zwei Türme reichen bis zur Mitte. Ein Hain
startet mit 95 m; der Gott braucht entweder sechs Haine oder Geduld — und
holt sich die Mitte später mit Truppen, denn die KI greift Förderbauten
gezielt an.

### 3. Schwere Einheiten waren pro Fron schlechter

Duell auf neutralem Boden, gleich viel Fron auf beiden Seiten
(1400 bzw. 2800 Fron, Rest-HP des Siegers, + = schwer gewinnt):

| Preis schwer | 180 (alt) | 150 | 130 | 115 |
| --- | --- | --- | --- | --- |
| Landwehr gegen Söldner | −52 % | −23 % | +20 % | +49 % |
| Schratt gegen Geweihter | −61 % | −28 % | +18 % | +45 % |

18 Schratte schlugen 6 Geweihte und verloren einen. Götterblut hätte also
den Zugang zu *schlechteren* Einheiten freigeschaltet. Jetzt: Söldner 130,
Geweihter 135 Fron (+ 10 Götterblut) — deutlich, aber nicht erdrückend
besser. *Auch das ist eine Zahl für dich.*

### 4. Aktueller Stand der Balance

Seit Einheiten Feinde verfolgen, die KI mit Angriffsbewegung vorrückt und
gegnerische Förderbauten angreift, reagiert das Spiel glatt auf den
Startradius des Gottes — die Messerschneide aus 0.4 ist weg:

| Gott start | 900 | 925 | **950** | 975 | 1000 |
| --- | --- | --- | --- | --- | --- |
| ohne Angriffsbewegung | 102 : 58 | 95 : 65 | 76 : 84 | 68 : 91 | 47 : 113 |
| mit Angriffsbewegung | 99 : 61 | 76 : 84 | **60 : 100** | 54 : 106 | 51 : 109 |

Jeder Schritt von 25 dm verschiebt fünf bis zehn Prozentpunkte. Der
Ausgleichspunkt liegt zwischen 925 und 950 und wandert mit dem
KI-Verhalten. **Standard ist jetzt 950** (vorher 900) — eine
Parameteränderung, die du zurücknehmen kannst.

| Einstellung (sonst Standard) | Menschen : Gott | Ø Dauer | Gott fördert |
| --- | --- | --- | --- |
| **Ausgang** | **60 : 100** | 14,6 min | 100 von 160 |
| ohne Götterblut-Kosten | 4 : 156 | 12,7 min | 74 |
| homeBonus 1250 | 66 : 94 | 15,7 min | 112 |
| Gott max 3900 | 59 : 101 | 14,6 min | 88 |
| Gott max 7000 | 60 : 100 | 14,6 min | 100 |
| fremdMalus 800 | 80 : 80 | 16,0 min | 118 |
| fremdMalus 650 | 121 : 39 | 16,6 min | 98 |

- **Götterblut-Kosten halten die Partie zusammen.** Ohne sie gewinnt der
  Gott 156 von 160: Sein Heimvorteil wirkt auf jede Einheit, und schwere
  Einheiten wären für beide billig. Mit ihnen gleicht der frühe Zugang der
  Menschen zur Mitte den Heimvorteil aus.
- **`max` bleibt im Rauschen.** Die Partien sind entschieden, bevor die
  großen Kreise zählen.
- **`fremdMalus` trifft vor allem den Gott**, der seit der
  Angriffsbewegung meist auf fremdem Boden angreift.

Fläche als Vereinigung der Kreise, Median aus 20 Partien (Stand vor der
Verfolgung, Gott start 900):

| Minute | 3 | 6 | 9 | 12 |
| --- | --- | --- | --- | --- |
| Menschen | 50 ha | 79 ha | 110 ha | 108 ha |
| Gott | 25 ha | 57 ha | 88 ha | 120 ha |

Der Gott überholt um Minute 11–12, die Partien enden im Mittel bei 16.

### 5. Die KI ist das Messinstrument — und dominiert es

Zwei KI-Strategien für den Weg zur Ader, beide fraktionsneutral (je 24
Partien, noch vor der Fairness-Korrektur gemessen):

- *Immer vorstoßen* (Anker um Anker zur Ader): Menschen 21 : 3. Der Gott
  verbrennt Fron in Hainen und kommt trotzdem erst in Minute 11 an.
- *Nur vorstoßen, wenn zwei Anker mit eigenem Startradius die Lücke
  schließen*, sonst warten: Gott 20 : 4.

Ein Strategiewechsel bewegt das Ergebnis stärker als jeder Parameter. Die
Verfolgung allein verschob den Ausgang von 45 : 35 auf 64 : 16, das gezielte
Angreifen von Förderbauten zurück auf 54 : 26 (je 80 Partien); die
Angriffsbewegung bei Gott start 950 von 76 : 84 auf 60 : 100 (je 160).
Balance-Aussagen aus KI-Partien sind Hinweise, keine Wahrheit — deshalb
wird der Startradius nicht nach jeder KI-Änderung nachgestellt.

### 6. Wann zählt der späte Radius? Vier Versuche, kein Effekt

Der Höchstradius des Gottes (`max`) ist die Hälfte der einen Regel. In
keiner Messung hat er das Ergebnis bewegt. Vier Versuche, ihn wirksam zu
machen (je 160 Partien, Menschen : Gott bei max 3900 / 5200 / 7000):

| Versuch | 3900 | 5200 | 7000 |
| --- | --- | --- | --- |
| Standard | 59 : 101 | 60 : 100 | 60 : 100 |
| Ankerkraft 1: jeder Anker spendet Gegenwart nach Radius | 21 : 139 | 19 : 141 | 18 : 142 |
| Lange Partien: Hauptgebäude vierfach so zäh | 58 : 102 | 60 : 100 | 60 : 100 |
| Heimvorteil nach Tiefe, voll ab 150 m | 59 : 101 | 60 : 100 | 60 : 100 |
| Heimvorteil nach Tiefe, voll ab 300 m | 66 : 94 | 64 : 96 | 64 : 96 |

- **Ankerkraft** (`RULES.ankerKraft`, aus): `konzept.md` nennt „Schreine und
  Anker“ als Herkunft der Gegenwart, gespendet haben bisher nur die
  Hauptgebäude. Eingeschaltet kippt die Balance hart — bei Stufe 1 zum Gott,
  bei Stufe 2 überrennen die Menschen ihn in jeder Partie nach 5,5 Minuten,
  weil ein Turm die volle Gegenwart ab Bauende liefert. `max` bleibt wirkungslos.
- **Lange Partien** verlängern sich nur um 1,4 Minuten: Entschieden wird,
  wenn eine Armee zusammenbricht; das Hauptgebäude fällt danach ohnehin.
- **Heimvorteil nach Tiefe** (`RULES.tiefeVoll`, aus): am Rand der eigenen
  Domäne kein Bonus, ab der angegebenen Tiefe der volle. Wirkungslos, weil
  der Gott entweder tief zu Hause verteidigt oder auf fremdem Boden angreift
  — nie in dem Ring, den nur der späte Radius abdeckt.
- `fremdMalus` (Abschnitt 4) verlängert Partien ebenfalls, ohne dass `max` wirkt.

**Befund:** Entschieden wird zwischen Minute 5 und 15. Ein Hain erreicht
seinen Höchstradius erst gut sieben Minuten nach Bauende, und was jenseits
von 390 m liegt, trägt zu keinem Gefecht und keiner Ressource bei. Der
Unterschied zwischen den Fraktionen liegt im *frühen* Verlauf: Startradius,
Reichweite zur Mitte, Heimvorteil. Wenn das Wachstum selbst spürbar werden
soll, braucht der späte Radius etwas, das nur er erreicht — etwa Adern oder
Ziele, die nur eine große Domäne versorgt. Mehr Kampfkraft in der Fläche
reicht nicht, solange dort nicht gekämpft wird. Das ist eine Designfrage,
keine Zahl.

## Verlauf (vor der Fairness-Korrektur gemessen)

**0.2 → 0.3: Die alten Befunde waren ein Fehler.** „Der Gott gewinnt immer“,
„beide horten Fron“ und „die Menschen bauen kaum Anker“ hatten eine Ursache:
Zwei Sägewerke banden die gesamte Gegenwart der Thingstätte, alle Baustellen
bekamen null. Behoben durch den Mindestfluss (`RULES.werkFloor`).

**Das Tempo war zu hoch.** 4200 Fron pro Minute je Sägewerk, Gebäude nach
3,5 Sekunden, Partien nach 3–5 Minuten. Jetzt Förderung pro Minute (240),
Bauzeiten ×6 bzw. ×5.

**Ohne Götterblut** (Stand 0.4, 24 Partien je Zeile):

| Einstellung | Menschen : Gott |
| --- | --- |
| Ausgang | 11–14 : 10–13 |
| Gott start 1000 | 5 : 19 |
| homeBonus 1250 | 21 : 3 |
| Gott max 3900 / 5200 / 7000 | 13 : 11 / 14 : 10 / 15 : 9 |
| fremdMalus 800 / 650 | 12–13 : 11–12 / 14–15 : 9–10 |

Damals: Der Gott holte bei der Fläche bis Minute 10 auf, überholte aber
nicht; rund 60–67 % aller Schüsse fielen in der Domäne des Gegners.

*Korrektur aus 0.4:* Die frühere Angabe „ab Minute 12 mehr als doppelt so
groß“ beruhte auf der Summe der Kreisflächen und zählte Überlappungen
mehrfach.

## Bewusst weggelassen

| Fehlt | Warum | Aufwand später |
| --- | --- | --- |
| Pathfinding | Einheiten fahren gerade; auf offener Karte reicht das | hoch |
| Gelände und Wälder als Karte | Roden ist derzeit ein Kreis, kein Gelände | mittel |
| Fog of War | Verdeckt den Test eher, als dass er schärft | mittel |
| Todesgott | Dritte Fraktion erst nach dem Fundament | niedrig (eine Zahl) |
| Weitere Götterblut-Verwendung | Bisher nur schwere Einheiten | niedrig |
| Bergung der Gefallenen | Gehört zum Todesgott | niedrig |
| Belagerung, Distanzeinheiten | Dritte und vierte Rolle pro Fraktion | niedrig |
| Netzwerk | Determinismus ist vorbereitet, Lockstep fehlt | hoch |

## Nächste sinnvolle Schritte

1. **Selbst spielen.** Das HUD zeigt Fläche und Götterblut beider Seiten.
   Fragen: Ist das Rennen um die Mitte als Mensch spannend oder trivial? Ist
   Warten als Gott eine Entscheidung oder ein Zwang? Wer erst schauen will:
   „Zuschauen“ lässt die KI beide Seiten spielen.
2. **Über die zwei Designzahlen entscheiden:** Götterblut-Kosten schwerer
   Einheiten (10) und ihr Fron-Preis (130/135).
3. Wenn der späte Radius mehr tragen soll: Partien verlängern sich mit
   `fremdMalus` (Angriffe werden teurer), oder Götterblut wird stärker.
4. Erst danach Todesgott oder Gelände.

## Bekannte Schwächen

- Die KI greift in Wellen an (erst Förderbauten, dann das Hauptgebäude) und
  hält keine Grenze.
- Gerodeter Boden erholt sich nie wieder — der Wurzler kann das noch nicht.
- Arbeiter (Köhler, Wurzler) haben keine Funktion; Gebäude entstehen per
  Befehl.
