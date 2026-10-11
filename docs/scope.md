# Was dieser Prototyp beantwortet — und was nicht

## Die eine Frage

> Fühlt sich eine Domäne, deren Radius bei einer Fraktion fest ist und bei der
> anderen mit der Zeit wächst, tatsächlich unterschiedlich an?

Alles im Code dient dieser Frage. Was sie nicht berührt, fehlt absichtlich.

## Befunde (Stand 0.10)

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

### 7. Drei KI-Stile: früher Angriff dominiert

Damit Befunde nicht an einer KI-Strategie hängen, gibt es drei
fraktionsneutrale Stile (`STILE` in `ai.js`): *Sturm* (erste Welle mit
5 Einheiten, wenige Anker), *Standard*, *Burg* (erste Welle mit 14, viele
Anker). `npm run sweep -- 180 45 Ausgang stile` lässt alle neun Paarungen
spielen (358 Partien):

| Siegquote Menschen | Gott Sturm | Gott Standard | Gott Burg |
| --- | --- | --- | --- |
| **Menschen Sturm** | 100 % | 100 % | 100 % |
| Menschen Standard | 0 % | 30 % | 75 % |
| Menschen Burg | 0 % | 100 % | 87 % |

- **Wer früh angreift, gewinnt** — gegen jeden anderen Stil, bei beiden
  Fraktionen. Greifen beide früh an, gewinnen immer die Menschen: ihre
  Grundeinheiten sind außerhalb der Gott-Domäne stärker (18 Landwehr schlagen
  18 Schratte), und ihre Domäne steht ab Minute 0.
- **`max` bleibt auch hier wirkungslos:** Die Matrix ist bei 3900, 5200 und
  7000 bis auf einzelne Partien gleich.
- **Die Stufen Zorn und Wehr der Drosselleiter sind ungenutzt** — kein
  Gebäude hat Waffen oder Schilde. Eine Verteidigungsanlage je Fraktion
  würde sie mit Leben füllen und frühe Angriffe bremsen. Das ist neuer
  Inhalt, also deine Entscheidung.

### 8. Kommandanten (Stand 0.9)

> **Designentscheidung des Nutzers:** Jede Seite hat einen Kommandanten nach
> dem Vorbild der ACU aus Supreme Commander — der **Held** und der
> **Waldgott** selbst. Extrem stark (6000 Leben, etwa zehn Söldner; Schaden
> wie gut zwei Söldner), er baut, und sein Verlust bedeutet die Niederlage.
> Einmalig, keine Rückkehr. Sonst gibt die Regel nichts vor: Ob er hinten
> baut oder vorn kämpft (ACU-Rush), entscheidet der Spieler.

Bauen heißt: Die nächste eigene Baustelle in 50 m Umkreis wächst mit seiner
Kraft, so schnell wie bei voller Gegenwart — **auch außerhalb der Domäne**.
So entstehen Außenposten: ein Anker dort, wo die Domäne nicht hinreicht, dann
eine Quelle, dann ein Schacht. In der Domäne baut er zusätzlich zur
Gegenwart, also etwa doppelt so schnell.

*Zwischenstände, die wieder entfernt wurden:* ein beweglicher Anker (der
Kommandant trägt die Domäne mit sich), Aura, Heilung in der eigenen
Domäne, ein Hinterland-Bonus mit Schutz. Alle verworfen nach der Vorgabe
„so wenig vorgeben wie möglich“.

**Messung** (KI gegen KI, 160 bzw. 358 Partien):

| Einstellung | Menschen : Gott | Ø Dauer |
| --- | --- | --- |
| ohne Kommandant (zum Vergleich) | 60 : 100 | 14,6 min |
| **mit Kommandant** | **28 : 122** | 17,1 min |

- **Wie Partien enden** (60 Partien): 45-mal fällt der Held *zu Hause*, nur
  2-mal der Waldgott. Ein vitaler Kommandant macht die Schlacht um die
  eigene Basis zur Entscheidung — und dort verteidigt der Gott mit
  Heimvorteil, die Menschen nicht.
- **Kommandant vorn oder hinten**, bei gleichen Angriffswellen: Menschen
  32 % gegen 18 %, Gott 99 % gegen 82 %. Vorn lohnt sich für beide.
- **Stil-Matrix:** Sturm (frühe Wellen, Kommandant vorn) gewinnt weiter gegen
  alles; im Sturm-Spiegel siegen die Menschen. Ein langsamerer Kommandant
  (16 statt 24) oder weniger Leben (4000) ändern die Matrix kaum — die
  Dominanz früher Angriffe hängt nicht am Kommandanten.

**Offen für dich:**
- Die Menschen verlieren mit Kommandant deutlich öfter. Hebel ohne neue
  Regel wären Zahlen (Startradius oder Heimvorteil des Gottes); mit neuer
  Regel eine Verteidigungsanlage — die Stufen Zorn und Wehr der
  Drosselleiter sind weiter ungenutzt.
- Der ACU-Rush ist in KI-Partien nicht riskant, sondern stark. Ob er das für
  Menschen am Steuer auch ist, zeigt nur Selbstspielen.

### 9. Viele gegen wenige, Heimvorteil aus Schreinen (Stand 0.10)

> **Vorgaben des Nutzers:** Menschen haben viele günstige Einheiten (Bauer,
> Soldat, Jäger, Söldner), der Gott wenige starke (Dryade, Wolf, Waldgeist,
> Ent). Das Ziel ist ein klassisches RTS; die Domäne ist Mechanik, nicht
> Ziel. Heimvorteil und Flächenboni kommen aus gebauten Gebäuden in der
> Domäne, nicht aus den Einheiten.

**Umgesetzt:**
- Arbeiter (Bauer, Dryade) bauen wie der Kommandant, nur mit weniger Kraft
  (400 bzw. 700 Promille) — derselbe Mechanismus, keine neue Regel.
- `homeBonus` ist aus allen Einheiten verschwunden. Stattdessen Schreine:
  Kriegsbanner und Dornenschrein (Zorn: +25 % bzw. +45 % Schaden),
  Kapelle und Steinkreis (Wehr: −20 % bzw. −30 % genommener Schaden). Ein
  versorgter Schrein wirkt auf alle eigenen Einheiten im selben
  Domänennetz, anteilig zur Versorgung, und stapelt nicht. Sie hängen an den
  Drossel-Stufen Wehr und Zorn, die vorher ungenutzt waren. *Die
  Schreinwerte sind Designzahlen.*
- Das Tiefen-Experiment (`RULES.tiefeVoll`) ist mit dem `homeBonus` entfallen.

**Abstimmung per Duell** (gleich viel Fron, neutraler Boden, Rest-Fronwert
des Siegers; + = Menschen, − = Gott):

| Paarung | 1500 Fron | 3000 Fron |
| --- | --- | --- |
| Soldat gegen Wolf (33 gegen 11) | −5 bis −13 % | −11 bis −15 % |
| Jäger gegen Waldgeist | −7 bis −19 % | −17 bis −21 % |
| Soldat+Jäger gegen Wolf+Waldgeist | +27 bis +42 % | +16 bis +27 % |
| Söldner gegen Ent | −29 bis −32 % | −21 bis −24 % |

Einzeln liegen die Paarungen nah beieinander; gemischt sind die Menschen
stärker — Soldaten halten auf, Jäger schießen dahinter. Auf eigenem Boden
gleichen das die Schreine des Gottes aus.

**KI gegen KI** (160 Partien, Menschen : Gott):

| Einstellung | Ergebnis | Ø Dauer |
| --- | --- | --- |
| Ausgang | 51 : 106 | 21,3 min |
| ohne Kommandant | 160 : 0 | 8,9 min |
| Schreine ohne Wirkung | 50 : 108 | 18,4 min |
| Gott-Schreine so schwach wie die der Menschen | 61 : 96 | 20,9 min |

- **Ohne Kommandanten überrennt die Masse den Gott** in jeder Partie, im
  Mittel nach 9 Minuten. Mit Kommandanten kippt es zum Gott: Der vitale
  Held fällt, wenn die Basis der Menschen überrannt wird, der Waldgott steht
  sicherer.
- **Die Schreine ändern in KI-Partien fast nichts** (51 gegen 50). Die KI
  baut je einen ab Minute 5 beim Hauptgebäude; wie viel sie Menschen am
  Steuer bringen, zeigt nur das Spielen.

**Offen für dich:** Die Balance hängt stark am Kommandanten — ohne ihn sind
die Menschen weit überlegen, mit ihm deutlich unterlegen. Hebel ohne neue
Regel: Einheiten- und Schreinwerte, Startradius.

### 10. Mehr RTS: Unterhalt, Grunddomäne, Schreine im Umkreis (Stand 0.12)

> **Vorgaben des Nutzers:** Es fühlt sich zu sehr nach Ausbreitungsspiel an
> (ständig Türme und Haine, Wirtschaft zu langsam). Kein Heer aus 500
> Einheiten, aber ein Mittelweg — als Bremse **Unterhalt in Fron**.

**Umgesetzt** (*alle Zahlen sind Designzahlen*): Grunddomäne 400 m für
Hauptgebäude, Förderung 360 statt 240, Bauzeiten × 0,7 bzw. × 0,8,
Startfron 1100, Unterhalt je Einheit (etwa ein Fünftel ihres Preises pro
Minute), Schreine mit 300 m Umkreis.

**Was die Messung dabei aufdeckte** (16 Seeds × 2 Sitzplätze, falls nicht
anders angegeben):

| Stand | Menschen : Gott | offen | Ø Dauer |
| --- | --- | --- | --- |
| Unterhalt, KI greift nur mit Überlegenheit an (2 Seeds) | 0 : 0 | 4 von 4 | — |
| + Angriff, wenn das Heer satt ist | 0 : 31 | 1 | 23 min |
| + Einheitenwerte nachgezogen | 1 : 27 | 4 | 32 min |
| + Schreine im Umkreis statt im ganzen Netz | 7 : 5 | 20 | 38 min |
| + viertes und fünftes Fron-Vorkommen (KI höchstens 5 Anker) | 25 : 7 | 0 | 24 min |
| KI höchstens 6 Anker | 21 : 11 | 0 | 21 min |
| KI höchstens 7 Anker (32 Seeds) | 44 : 20 | 0 | 20 min |
| **KI höchstens 8 Anker (32 Seeds) — Ausgang** | **29 : 35** | 0 | 17 min |

- **Unterhalt deckelt das Heer, und gleiche Heere greifen nicht an.** Beide
  Seiten wuchsen bis zum Gleichgewicht aus Förderung und Unterhalt (rund 90
  Menschen- bzw. 40 Gott-Einheiten) und warteten auf eine Überlegenheit, die
  nie kam. Die KI greift jetzt an, wenn ihr Heer satt ist (Unterhalt ≥ 80 %
  der Förderung) — Warten bringt dann nichts mehr.
- **Ein KI-Fehler:** Fiel eine Quelle, rechnete die KI für die nächste einen
  besetzten Platz aus, die Simulation lehnte ab, und die KI versuchte es
  jeden Zug neu, statt Einheiten zu bauen (Gott mit 4500 Fron und leeren
  Fabriken). Jetzt sucht sie freie Plätze und sperrt abgelehnte für zwei
  Minuten.
- **Mit Schreinen im ganzen Netz** war die Basis des Gottes uneinnehmbar
  (+45 % Schaden, −30 % genommen, also rund doppelte Kampfkraft überall in
  seiner Domäne); mit Umkreis ausgeglichen, aber zäh: Der Angreifer
  verliert, beide bauen sechs Minuten auf, dann greift der andere an.
- **Den Ausschlag gibt die Wirtschaft:** Erst mit mehr Vorkommen kippen die
  Patts. Die Ankergrenze der KI entscheidet dabei, ob der Gott eine
  Götterblut-Ader erreicht (bei 5 Ankern nur nach gewonnener Partie, bei 8
  in 61 von 64 Partien, Median Minute 10,5).

**Schrein-Umkreis** (vor dem Ausbau der Vorkommen gemessen):

| Einstellung | Menschen : Gott | offen |
| --- | --- | --- |
| Umkreis 200 m | 9 : 6 | 17 |
| Umkreis 300 m (Ausgang) | 7 : 5 | 20 |
| Umkreis 450 m | 6 : 7 | 19 |
| ganze Domäne | 1 : 28 | 3 |
| Gott-Schreine so schwach wie die der Menschen | 9 : 5 | 18 |
| Schreine ohne Wirkung | 13 : 18 | 1 |

**Duelle** (3000 Fron, neutraler Boden, Restwert; + = Menschen): Soldaten
gegen Wölfe +561, Jäger gegen Wölfe −923, Söldner gegen Ents −1151,
KI-Mischung gegen KI-Mischung +1040, KI-Mischung gegen reine Wölfe −505.

**Stil-Paarungen** (45 Seeds, Siegquote der Menschen):

| Menschen \ Gott | Sturm | Standard | Burg |
| --- | --- | --- | --- |
| Sturm | 100 % | 100 % | 100 % |
| Standard | 0 % | 40 % | 70 % |
| Burg | 0 % | 50 % | 50 % |

Früher Angriff dominiert wie in Abschnitt 7, mit schnellerer Wirtschaft
noch deutlicher. **Offen für dich:** Ist das ein Problem der KI-Stile oder
des Spiels? Gegen einen Menschen am Steuer zeigt das nur Spielen.

### 11. Erfahrung (Stand 0.13)

> **Vorgabe des Nutzers:** Erfahrung für Gebäude und Einheiten — je länger
> am Leben, umso stärker, aber nur minimal.

Je volle Minute 1 % mehr ausgeteilter und 1 % weniger genommener Schaden,
höchstens 10 % (*Designzahlen*, `RULES.erfahrungProMin` und
`erfahrungMax`). KI gegen KI, 32 Seeds × 2 Sitzplätze:

| Einstellung | Menschen : Gott | Sitz 0 | Ø Dauer |
| --- | --- | --- | --- |
| ohne Erfahrung | 29 : 35 | 29 | 17,0 min |
| 1 % je Minute, höchstens 10 % (Ausgang) | 29 : 35 | 27 | 17,3 min |
| doppelt (2 %, höchstens 20 %) | 29 : 35 | 29 | 17,1 min |

Die Erfahrung entscheidet keine KI-Partie. Die Heere der KI leben selten
lange; ob sie Spielern, die ihr Heer schonen, etwas bringt, zeigt nur
Spielen.

### 12. Skillpunkte und Skillbaum (Stand 0.14)

> **Vorgaben des Nutzers:** Skillpunkte, mit denen man Neues freischaltet,
> und ein Skillbaum. Punkte kommen mit der Zeit. Der Baum schaltet neue
> Einheiten, neue Gebäude, Verbesserungen und Kommandanten-Fähigkeiten frei.

*Alle Zahlen im Baum sind Designzahlen.* Die KI lernt in fester Reihenfolge
(Fernkämpfer, Zorn-Schrein, Schaden, Kommandant mit Fähigkeit, Förderung,
Wehr-Schrein, schwere Einheiten, Rest). KI gegen KI, 32 Seeds × 2
Sitzplätze:

| Einstellung | Menschen : Gott | Sitz 0 | Ø Dauer |
| --- | --- | --- | --- |
| ohne Skillbaum (alles frei, keine Verbesserungen) | 29 : 35 | 27 | 17,3 min |
| mit Skillbaum | 33 : 31 | 31 | 14,9 min |

Die Partien werden kürzer: Die Verbesserungen kommen früh, und wer
angreift, hat sie genauso wie der Verteidiger. Die Fähigkeiten setzt die KI
selten ein, denn ihr Kommandant bleibt im Stil „Standard“ daheim; sie kommen
erst um Minute 8 bis 10.

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

1. **Selbst spielen.** Der Startbildschirm erklärt die Regel; im Spiel zeigen
   HUD und Vorschauringe, wie die Domänen wachsen; `I` öffnet die Auswertung
   (Reibung, Kampfort, Anker, Götterblut). Gegner-Stil wählbar. Fragen: Ist
   das Rennen um die Mitte als Mensch spannend oder trivial? Ist Warten als
   Gott eine Entscheidung oder ein Zwang? „Zuschauen“ lässt die KI beide
   Seiten spielen.
2. **Drei Designentscheidungen**, die keine Messung abnehmen kann:
   - *Götterblut-Kosten* schwerer Einheiten (10) und ihr Fron-Preis
     (130/135) — Abschnitte 2 und 3.
   - *Was soll der späte Radius bewirken?* Vier Versuche ohne Effekt
     (Abschnitt 6). Er braucht etwas, das nur er erreicht.
   - *Früher Angriff dominiert* (Abschnitt 7). Die Stufen Zorn und Wehr der
     Drosselleiter sind ungenutzt — eine Verteidigungsanlage je Fraktion
     läge nahe.
   - *Kommandanten*: Die Menschen verlieren mit ihnen öfter (Abschnitt 8).
3. Erst danach Todesgott oder Gelände.

## Bekannte Schwächen

- Die KI greift in Wellen an (erst Förderbauten, dann das Hauptgebäude) und
  hält keine Grenze.
- Gerodeter Boden erholt sich nie wieder — der Wurzler kann das noch nicht.
- Arbeiter (Köhler, Wurzler) haben keine Funktion; Gebäude entstehen per
  Befehl.
