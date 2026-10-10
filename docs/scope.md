# Was dieser Prototyp beantwortet — und was nicht

## Die eine Frage

> Fühlt sich eine Domäne, deren Radius bei einer Fraktion fest ist und bei der
> anderen mit der Zeit wächst, tatsächlich unterschiedlich an?

Alles im Code dient dieser Frage. Was sie nicht berührt, fehlt absichtlich.

## Befunde aus den Testläufen

**Der Gott gewinnt beide Sitzpositionen.** In KI-gegen-KI-Partien mit
identischem Seed siegt der Wald- und Wiesengott nach rund fünf Minuten,
unabhängig davon, welche Fraktion auf Platz eins sitzt. Verdächtig sind das
Radiuswachstum (900 → 5200) und der Heimvorteil von 1,5 in Kombination. Erste
Stellschraube wäre `FACTIONS.gott.growth.perTick` oder `homeBonus`.

**Beide Seiten horten Fron.** Nach fünf Minuten liegen über 30 000 ungenutzt
herum. Das ist ein KI-Problem, zeigt aber auch, dass Fron zu wenig Druck
erzeugt.

**Die Menschen bauen kaum Anker.** Die KI priorisiert Wirtschaft so stark,
dass sie ihren eigentlichen Vorteil — viele feste Kreise sofort — nicht
ausspielt. Die Bauordnung in `src/sim/ai.js` ist dafür verantwortlich.

## Bewusst weggelassen

| Fehlt | Warum | Aufwand später |
| --- | --- | --- |
| Pathfinding | Einheiten fahren gerade; auf offener Karte reicht das | hoch |
| Gelände und Wälder als Karte | Roden ist derzeit ein Kreis, kein Gelände | mittel |
| Fog of War | Verdeckt den Test eher, als dass er schärft | mittel |
| Todesgott | Dritte Fraktion erst nach dem Fundament | niedrig (eine Zahl) |
| Götterblut-Verbrauch | Wird gefördert, aber noch nicht ausgegeben | niedrig |
| Bergung der Gefallenen | Gehört zum Todesgott | niedrig |
| Belagerung, Distanzeinheiten | Dritte und vierte Rolle pro Fraktion | niedrig |
| Netzwerk | Determinismus ist vorbereitet, Lockstep fehlt | hoch |

## Nächste sinnvolle Schritte

1. **Selbst spielen** und notieren, wann die Domäne fordert statt zu nerven.
2. Die Balance zwischen Wachstum und Heimvorteil prüfen — der Gott gewinnt
   derzeit zu verlässlich.
3. Erst danach entscheiden, ob Todesgott, Götterblut-Verbrauch oder Gelände
   als Nächstes kommen.

## Bekannte Schwächen

- Die KI hortet Fron und baut zu wenige Anker.
- Der Seed beeinflusst nichts: Karte und KI sind vollständig zufallsfrei. Gut
  für den Determinismustest, schlecht für Abwechslung.
- Einheiten laufen durch Gebäude hindurch.
- Gerodeter Boden erholt sich nie wieder — der Wurzler kann das noch nicht.
- `src/sim/ai.js` nutzt Gleitkomma für Bauplatzwahl. Vor Multiplayer auf
  Integer umstellen.
