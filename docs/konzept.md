# Die drei Reiche — Konzept

Stand: 2026-10-11. Lebende Fassung liegt als Claude-Doc vor; diese Datei ist
die Arbeitskopie fürs Repository.

## Ziel

Ein klassisches RTS: Ressourcen sammeln, aufbauen, ausbreiten, den Gegner
bekämpfen, seine Gebäude und seinen Anführer zerstören. **Die Domäne ist
eine Mechanik, nicht das Ziel** — sie bestimmt, wo Gegenwart fließt, wo
Fabriken und Förderung laufen und wo Schreine wirken.

## Prämisse

Drei Mächte teilen sich ein Land, unter dem etwas Älteres liegt. Keine von
ihnen ist böse, und genau daraus entsteht der Konflikt.

**Die Menschen** kämpfen ums Überleben. Sie roden, bauen, erweitern — nicht
aus Gier, sondern weil der Winter kommt und die Dörfer wachsen. Dass jeder
gerodete Hain einem Gott Kraft nimmt, verstehen sie nicht.

**Der Wald- und Wiesengott** verteidigt, was ihm gehört. Er greift nicht an,
er nimmt zurück. Was gerodet wurde, wächst nach, wenn man ihn lässt — und er
hat Zeit. Für ihn sind die Menschen kein Feind, sondern eine Wunde.

**Der Todesgott** wartet und profitiert von beiden. Für den Prototyp
zurückgestellt; der Entwurf steht unten.

Für den Prototyp bleiben **Menschen gegen Wald- und Wiesengott**. Die
Menschen müssen expandieren, um zu überleben, der Gott muss zurücknehmen, um
zu bestehen. Keiner von beiden kann aufhören.

## Gemeinsames Fundament

Alle Fraktionen spielen nach **denselben Regeln** mit **denselben
Ressourcen**. Keine hat ein System, das die anderen nicht haben. Das ist die
Grundbedingung dafür, dass Balancing möglich bleibt.

| Ressource | Typ | Begrenzt | Herkunft |
| --- | --- | --- | --- |
| Gegenwart | Fluss, nicht lagerbar | Wie viel gleichzeitig läuft | Schreine und Anker |
| Fron | Bestand, lagerbar | Wie viel insgesamt investiert ist | Holz, Stein, Hände |
| Götterblut | Nur erobert | Die Qualitätsobergrenze | Adern im Boden |

### Die Domäne

Jede Fraktion projiziert aus ihren Ankern eine Domäne. Innerhalb fließt
Gegenwart, außerhalb nicht. Getrennte Domänenteile sind getrennte Netze: Eine
Vorwärtsstellung ohne Verbindung hat ihre eigene, meist leere Versorgung.

### Die Drosselleiter

Reicht die Gegenwart in einem Domänenteil nicht für alles, versiegt sie in
fester Reihenfolge:

1. **Werk** — Baustellen und Fabriken stocken zuerst
2. **Segen** — Produktion, Förderung, Heilung
3. **Wehr** — Schutzzauber und Schilde (Schreine wie Kapelle, Steinkreis)
4. **Zorn** — Waffen zuletzt (Schreine wie Kriegsbanner, Dornenschrein)

### Heimvorteil kommt aus Gebäuden

Kein Heimvorteil steckt in den Einheiten selbst. Er entsteht in der Domäne,
durch gebaute **Schreine**: Ein versorgter Schrein stärkt alle eigenen
Einheiten in seinem Umkreis (300 m), soweit sie in der eigenen Domäne
stehen — Zorn-Schreine mit mehr Schaden, Wehr-Schreine mit weniger
genommenem Schaden. Er hängt an den letzten Stufen der Drosselleiter; wer
das Netz schneidet oder die Gegenwart abgräbt, nimmt dem Gegner den
Heimvorteil. Beide Fraktionen haben beide Schreine; beim Gott wirken sie
stärker. Der Umkreis macht die Basis stark und lässt Außenposten
angreifbar — gekämpft wird um die Karte, nicht nur vor der Haustür.

### Erfahrung

Einheiten und Gebäude, die lange leben, werden ein wenig stärker: Sie teilen
mehr Schaden aus und stecken mehr weg, je Minute ein Prozent, höchstens
zehn. Bewusst klein — ein altes Heer ist etwas wert, aber kein Grund, nie
anzugreifen.

### Unterhalt statt Obergrenze

Jede Einheit kostet laufend Fron. Es gibt keine harte Obergrenze für das
Heer, aber eine spürbare Bremse: Wer viel unter Waffen hält, hat nichts
mehr für Neues. Ein Heer, das nicht mehr wächst, muss etwas tun. Wer mehr
Vorkommen hält, kann sich mehr leisten — Ausbreitung lohnt sich wegen der
Wirtschaft, nicht als Selbstzweck.

### Kommandanten

Jede Seite hat einen Kommandanten nach Vorbild der ACU aus Supreme
Commander: extrem stark, er baut (auch außerhalb der Domäne), und sein
Verlust bedeutet die Niederlage. Ob er hinten baut oder vorn kämpft,
entscheidet der Spieler.

Ein Gott lässt seine Waffen als Letztes fallen.

**Mindestfluss.** Ein Achtel der Gegenwart eines Domänenteils erreicht immer
die Baustellen, solange es welche gibt. Ohne diese Reserve kann eine
überbuchte Domäne sich nicht mehr selbst retten: Die Förderung bindet alles,
und die Baustelle der neuen Quelle steht für immer still. Werk fällt weiter
zuerst — nur nicht ganz auf null.

### Kein Tech-Tree, keine Zeitalter

Was gebaut werden kann, kann ab Minute eins gebaut werden. Eskalation kommt
aus dem Götterblut — und das liegt auf der Karte, nicht in einem Menü.

## Eine Regel, ein Parameter

Die gesamte Asymmetrie steckt in **einer Variablen**: wie sich der Radius
eines Ankers über die Zeit verändert. Siehe `anchorRadius()` in
`src/sim/sim.js`.

| Fraktion | Anker | Radius wächst durch | Spielgefühl |
| --- | --- | --- | --- |
| Menschen | Wachturm | gar nicht — fest bei Bau | Sofort da, überall gleich, planbar |
| Wald- und Wiesengott | Hain, Herzbaum | Zeit | Langsam klein, später riesig |
| *Todesgott (später)* | *Grabhügel* | *Tode im Umkreis* | *Wächst nur, wo gekämpft wird* |

Zwei Zahlen erzeugen zwei völlig verschiedene Partien, ohne dass irgendwo ein
Sondersystem nötig wäre. Eine dritte Fraktion ist eine dritte Zahl, kein
drittes Regelwerk.

## Menschen

**Anker:** Wachturm. Fester Radius ab Bauende, mittelgroß, billig. Menschen
decken Fläche ab, indem sie viele kleine Anker setzen.

**Quelle der Gegenwart:** Keine Gottheit, sondern Feuer und Arbeit —
Schmieden. Funktioniert überall gleich gut, ortsunabhängig.

**Fron** gewinnen sie durch Roden. Jedes Sägewerk entfernt Boden, auf dem der
Gott wachsen könnte. Sie schaden ihm, indem sie ihre Wirtschaft betreiben,
nicht indem sie angreifen.

**Einheiten: viele, günstig.** Stärke kommt aus der Zahl.

**Im Prototyp:** Thingstätte, Wachturm, Schmiede, Sägewerk, Kaserne,
Blutschacht, Kriegsbanner, Kapelle · Held (Kommandant), Bauer, Soldat, Jäger,
Söldner.

**Später:** Wagenburg, Armbrust, Priester, Bergung der Gefallenen.

## Wald- und Wiesengott

**Anker:** Hain und Herzbaum. Winziger Startradius, der mit der Zeit wächst.
Ein Herzbaum, den man zwanzig Minuten stehen lässt, deckt ein halbes Tal ab.
Einer, der nach drei Minuten fällt, hat nichts gebracht.

**Quelle der Gegenwart:** Quellgrund. Seine Stärke ist Alter, nicht Tempo.

**Fron** nimmt er kaum. Auf gerodetem Boden kann er keinen Hain pflanzen.

**Einheiten: wenige, stark.** Jede einzelne zählt.

**Heimvorteil** über Schreine — Dornenschrein und Steinkreis wirken bei ihm
stärker als die Schreine der Menschen.

**Im Prototyp:** Herzbaum, Hain, Quellgrund, Moosgrube, Dickicht, Blutwurz,
Dornenschrein, Steinkreis · Waldgott (Kommandant), Dryade, Wolf, Waldgeist,
Ent.

**Später:** Dornwerfer, Moosbär, Flüsterer, aktives Überwuchern von Gerodetem.

## Todesgott — zurückgestellt

Nicht im Prototyp. Bleibt als Vormerkung, weil die Mechanik trägt und sich
später als dritte Zahl in dieselbe Regel einfügt.

Er führt keinen Krieg, er folgt einem. Jeder Tote auf der Karte — gleich
welcher Fraktion — schiebt seine Grenze weiter. Grabhügel starten bei fast
null und wachsen ausschließlich durch Tode im Umkreis. Seine Wirtschaft ist
das Schlachtfeld der anderen.

**Seine Schwäche:** Werden Gefallene geborgen, bekommt er nichts.

## Wo Asymmetrie erlaubt ist

| Ebene | Erlaubt? | Begründung |
| --- | --- | --- |
| Ressourcen | **Nein** | Alle nutzen Gegenwart, Fron, Götterblut |
| Systeme | **Nein** | Alle haben Domäne, Anker, Drosselleiter |
| Parameter | **Ja, stark** | Radiuswachstum, Kosten, Raten |
| Einheitenwerte | **Ja** | Leben, Schaden, Tempo, Reichweite |
| Einheitenrollen | **Ja, sparsam** | Jede hat Arbeiter, leicht, Fernkampf, schwer, Kommandant |

Eine Fraktion darf eine schwache Rolle haben. Keine Fraktion darf ein System
weniger haben als die anderen. Fehlt eine Einheitenrolle, justierst du Zahlen.
Fehlt ein System, hast du kein Verfahren mehr, um zu entscheiden, ob etwas zu
stark ist.

## Offene Fragen

- **Wie sichtbar ist eine Domänengrenze?** Im Prototyp: harte Kante, eine
  Linie um die Vereinigung aller Ankerkreise.
- **Was passiert außerhalb der eigenen Domäne?** Derzeit: normal kämpfen,
  nur die Schreine wirken nicht. Alternative (`RULES.fremdMalus`): alle
  werden schwächer — das macht die Grenze zum eigentlichen Schlachtfeld.
- **Wird der Todesgott durch Tode in fremden Domänen gefüttert?** Wenn ja, in
  Dreierpartien übermächtig. Wenn nein, verliert er seine Pointe.
- **Kartengröße.** Derzeit 2 × 2 km. Für Fußtruppen vermutlich richtig,
  ungetestet.
- **Wie viele Einheiten pro Fraktion?** Im Prototyp vier plus Kommandant.
