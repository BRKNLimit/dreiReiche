# Pakete für Sonnet (Mechaniken)

Rahmen: `docs/umbau/konzept.md`, Regeln: `CLAUDE.md` (deterministisch, nur
Integer, Daten statt Klassen, Befehle statt Zustände). Jedes Paket:

- Feld(er) in `FELDER` (`src/sim/defs.js`) eintragen, mit Kommentar, was es tut.
- In `src/sim/sim.js` umsetzen (KI/Oberfläche, wo das Paket es sagt).
- Tests in Isolation in einer eigenen Datei `test/<paket>.test.js`; Testdaten
  dürfen Einträge in `UNITS`/`BUILDINGS` zur Laufzeit ergänzen (und wieder
  löschen).
- Die Volksdateien (`src/sim/voelker/`) **nicht** ändern — Inhalte schreibt
  Gemini. Ausnahme: ein Paket sagt es ausdrücklich.
- Ohne neue Inhalte muss alles bitgleich bleiben: `node tools/referenz.mjs`
  vor und nach dem Paket vergleichen.
- `npm test` und `npm run smoke` grün; Exit-Codes getrennt prüfen.
- Kurzer Bericht am Ende: was, wo, wie geprüft, offene Punkte.

## M1 Luftebene

Heute: Flieger (`fliegt: true`) fliegen geradeaus, drängeln nicht, und nur
Fernkämpfer und Türme erreichen sie (`erreicht()` in `sim.js`). Kein Flieger
hat eine Waffe.

1. `weapon.ziele`: `'boden'` | `'luft'` | `'beide'`. Ohne Angabe wie heute:
   `kampf: 'nah'` → nur Boden, `kampf: 'fern'` → beides. `erreicht(e, o)`
   richtet sich danach. Gebäude sind Boden.
2. Flieger mit Waffe kämpfen wie andere Einheiten (Zielwahl, Verfolgen,
   gezielter Angriff, Angriffsbewegung). Ein Flieger ist für `ziele: 'boden'`
   unerreichbar, für `'luft'` und `'beide'` erreichbar.
3. Flak: ein Gebäude mit Waffe und `ziele: 'luft'` greift nur Flieger an.
4. Zielwahl überall (`nearestEnemy`, Verfolgen, Türme, KI-Wellen-Ziele) darf
   nur Erreichbares wählen — sonst bleiben Einheiten an Fliegern hängen.
5. `ROLLEN.frei` um `luftfabrik`, `flak` (Gebäude) und `luftjaeger`,
   `bomber` (Einheiten) erweitern; die KI nutzt sie, **wenn** ein Volk sie
   hat: Luftfabrik ab dem mittleren Spiel, Flieger in die Mischung, Flak in
   der Basis, sobald die Kunde gegnerische Flieger kennt (`kunde.einheiten`
   oder `kunde.gesehen` mit `fliegt`). Rolle `rabe` heißt weiter `rabe`.
6. Tests: Nahkämpfer trifft keinen Flieger; Flak trifft keinen Bodentruppler,
   wohl aber Flieger; Bomber (`ziele: 'boden'`) trifft Boden, keinen Flieger;
   Luftjäger (`ziele: 'luft'`) jagt Flieger, ignoriert Boden; Einheit bleibt
   nicht an unerreichbarem Ziel hängen; Partie mit Fliegern deterministisch.
7. Oberfläche: Info-Karte nennt „trifft: Boden / Luft / beides“
   (`waffeZeilen` in `src/ui-gemeinsam.js`).

## M1 — abgenommen und gemergt (12.10.)

Offener Punkt aus M1, für später (M7): Ein unbewaffneter Späher zieht in der
KI weiter alle Kämpfer an (Altverhalten, Prüfsummen). Nicht jetzt ändern.

## M2 Schild

1. Gebäudefeld `schild: { kapazitaet, radius, laden }` (ganze Zahlen):
   `kapazitaet` höchste Schildpunkte, `radius` Umkreis in dm (Mitte zu
   Mitte), `laden` Punkte pro Tick bei voller Versorgung — skaliert mit
   `powered` (Promille), ohne Gegenwart lädt nichts. Ein Schildgebäude hat
   wie andere `gegenwartIn` und `prio` (Wehr).
2. Zustand am Gebäude: `schildPunkte` (in `spawnBuilding` mit 0 anlegen,
   fertig gebaut startet leer und lädt auf; in `hash()` aufnehmen).
3. Schaden: Überall, wo eine Entity Schaden nimmt (Kampf, Belagerung,
   Fähigkeiten — such alle Stellen, an denen `hp` sinkt), fängt zuerst ein
   Schild ab: ein fertiges, eigenes (gleicher Spieler) Schildgebäude mit
   `schildPunkte > 0`, in dessen Umkreis das Ziel steht; bei mehreren das mit
   der kleinsten Id. Er fängt `min(schaden, schildPunkte)` ab, der Rest geht
   auf `hp`. Das Schildgebäude schützt sich selbst mit. Flieger auch.
4. Ereignis `{ t: 'schild', id, x, y, wert }` je Abfangen (für Effekte).
5. `FELDER.gebaeude` um `schild`, neues `FELDER.schild = ['kapazitaet',
   'radius', 'laden']`; `ROLLEN.frei` um `schild: 'gebaeude'`;
   `test/daten.test.js` prüft die Unterfelder.
6. KI: hat ein Volk die Rolle `schild`, baut sie eins beim Hauptgebäude,
   sobald die Wirtschaft steht und ab Minute 10 (Designzahl, kennzeichnen).
7. Oberfläche (`src/ui.js`, `src/ui3d.js`, `src/ui-gemeinsam.js`): Kuppel
   als Kreis um gewählte und eigene Schildgebäude (2D: Kreislinie,
   Deckkraft nach Ladung; 3D: Modell `schildkuppel`, falls es ein Modell
   dieses Namens gibt — sonst ein Ring auf dem Overlay), Info-Karte des
   Gebäudes: „Schild: x / y, lädt z pro s, Umkreis r m“. Effekt beim
   Abfangen in `src/effekte.js` (kurzes Aufleuchten am Ziel).
8. Tests (`test/schild.test.js`, Testtypen zur Laufzeit): fängt ab und der
   Rest trifft; lädt mit Gegenwart, ohne nicht; schützt keine Feinde und
   nichts außerhalb; Überlappung nimmt kleinste Id; leerer Schild hält
   nichts; Partie mit Schild deterministisch; `node tools/referenz.mjs`
   bitgleich.

## M2 — abgenommen und gemergt (12.10.)

## M4 Fernschlag und Abwehr

1. Gebäudefeld `schlag: { laden, flug, reichweite, radius, schaden, kosten }`
   (ganze Zahlen; `kosten` wie `cost`, z. B. `{ goetterblut: 40 }`):
   `laden` Ticks bis zum nächsten Schlag bei voller Versorgung (skaliert mit
   `powered`, Fortschritt in Tausendsteln wie beim Schild), `flug` Ticks vom
   Abschuss bis zum Einschlag, `reichweite` (dm, vom Gebäude zum Ziel),
   `radius` (dm) und `schaden` am Einschlag.
2. Befehl `{ type: 'schlag', player, id, x, y }`: gilt nur, wenn das Gebäude
   eigen, fertig und geladen ist, das Ziel in Reichweite liegt und der
   Spieler `kosten` bezahlen kann — dann bezahlt, Ladung auf 0, ein Eintrag
   in `world.schlaege` (`{ von, player, x, y, landet, radius, schaden }`),
   Ereignis `{ t: 'schlagStart', … }`. Ziel braucht keine Sicht.
3. Einschlag zum Tick `landet`: Zuerst die Abwehr — ein fertiges, geladenes
   Gebäude mit `abwehr: { radius, laden }` eines **anderen** Spielers, in
   dessen Umkreis das Ziel liegt (kleinste Id), fängt ab: seine Ladung auf 0,
   Ereignis `{ t: 'abgefangen', … }`, kein Schaden. Sonst Schaden an
   **allen** Entities (beide Seiten) im Radius — gleich hoch im ganzen
   Kreis —, durch Schilde (M2, `schildFaengt`), Ereignis `{ t: 'schlag', x,
   y, radius }`. Tote wie im Kampf (Seelen, Ereignisse `died`).
4. Zustand: `schlagLadung` bzw. `abwehrLadung` am Gebäude (nur bei Gebäuden
   mit dem Feld in `hash()` einmischen), `world.schlaege` in `hash()` und im
   Spielstand (ist schlichtes JSON). Referenz bleibt bitgleich.
5. `FELDER`: `gebaeude` um `schlag`, `abwehr`; `FELDER.schlag`,
   `FELDER.abwehr`; `ROLLEN.frei` um `schlag`, `abwehr` (Gebäude);
   `test/daten.test.js` prüft die Unterfelder (`schlag.kosten` wie `cost`).
6. KI: Rolle `schlag` ab Minute 20, wenn die Wirtschaft steht — feuert, wenn
   geladen und bezahlbar, auf das wertvollste bekannte Ziel aus der Kunde
   (Hauptgebäude oder dichteste Gebäudegruppe), möglichst außerhalb bekannter
   gegnerischer Abwehr. Rolle `abwehr`: eine beim Hauptgebäude, sobald die
   Kunde ein gegnerisches Schlag-Gebäude kennt. Designzahlen kennzeichnen.
7. Oberfläche: Schlag-Gebäude gewählt → Knopf „Fernschlag“ (und Taste F),
   dann Klick aufs Ziel wie beim Zielen der Fähigkeiten; Ladung im
   `auswahlKopf`; ein Schlag im Anflug ist für **alle** sichtbar (roter
   Kreis am Ziel mit Countdown, Warnung im HUD); Einschlag mit großem Effekt
   und Beben (`src/effekte.js`), Abfangen mit eigenem Effekt.
8. Tests (`test/fernschlag.test.js`): Befehl nur geladen/in Reichweite/
   bezahlbar; Einschlag trifft beide Seiten im Radius, nichts außerhalb;
   Abwehr fängt ab und muss neu laden; eigene Abwehr fängt eigenen Schlag
   nicht; Schild nimmt zuerst; Laden skaliert mit Versorgung; Spielstand
   mit Schlag im Flug lädt bitgleich weiter; Referenz bitgleich.

## M5 Prototypen

1. Einheitenfeld `hoechstens`: wie viele davon ein Spieler gleichzeitig haben
   darf — lebende plus in Ausbildung. Ein `produce`-Befehl darüber hinaus
   wird abgelehnt.
2. `ROLLEN.frei` um `werkstatt` (Gebäude) und `prototyp` (Einheit).
3. KI: Werkstatt ab Minute 18, wenn die Wirtschaft steht und Götterblut
   fließt; Prototyp ausbilden, sobald möglich; er zieht mit den Wellen.
4. Oberfläche: Ausbildungsknopf zeigt „1/1“ und ist gesperrt, wenn voll;
   Info-Karte nennt „höchstens n gleichzeitig“.
5. Tests: Grenze bei lebenden und bestellten; nach dem Tod wieder frei.

## M4, M5 — abgenommen und gemergt (12.10.)

## M3 Volks-Mechaniken

Sie machen die Völker verschieden (Konzept Abschnitt 3). Jede ist ein Feld,
in Isolation getestet; ohne Inhalte bleibt die Referenz bitgleich (Zustand
nur einmischen, wo das Feld existiert).

1. **`regeneration`** (Einheit und Gebäude): LP pro Minute, ganzzahlig über
   einen Tausendstel-Rest wie beim Schild (`regRest`). Nur lebend, fertig,
   unter `maxHp`. Gebäude regenerieren nur versorgt (anteilig `powered`).
2. **`aura: { art, wert, radius }`** (Einheit und Gebäude): wirkt auf eigene
   Einheiten im Umkreis (Mitte zu Mitte), die Quelle eingeschlossen.
   `art`: `heilung` (LP pro Minute), `tempo`, `schaden`, `schutz` (Promille).
   Mehrere Auren derselben Art addieren sich **nicht** — es zählt die
   stärkste. Gebäude-Auren nur fertig und anteilig versorgt. Füge sie dort
   ein, wo Schlachtruf, Schildwall, Ansturm und die Schreine heute wirken
   (Schaden, Schutz, Tempo), damit alles an einer Stelle verrechnet wird.
3. **`weapon.flaeche: { radius, anteil }`**: Ein Treffer trifft zusätzlich
   jeden Feind im `radius` um das Ziel, den die Waffe erreicht (`erreicht`),
   mit `anteil` Promille des Schadens (nach den Abzügen des jeweiligen
   Ziels, durch dessen Schild).
4. **`weapon.verlangsamt: { dauer, wert }`**: Ein Treffer bremst das Ziel
   (nur Einheiten) `dauer` Ticks lang um `wert` Promille; ein neuer Treffer
   frischt auf, stärker gewinnt. Wirkt mit Tempo-Auren und Ansturm zusammen
   (verrechnen, nicht unter 20 % Tempo fallen lassen — kennzeichnen).
5. **`auferstehen: { alle, einheit, dauer }`** (Gebäude, gedacht für Anker
   des Totenreichs): Zählt dieses Gebäude eine Seele (`seelen`, perTod,
   `seelenZaehlen`), steht bei jeder `alle`-ten am Ort des Gefallenen eine
   `einheit` für den Besitzer auf — herbeigerufen (kein Unterhalt,
   `beschworen`), vergeht nach `dauer` Ticks (0 = bleibt). Aufgestandene
   zählen beim eigenen Tod nicht als Seele (sonst eine Endlosschleife).
   Ereignis `{ t: 'auferstanden', … }`.
6. `FELDER`: `einheit` und `gebaeude` um `regeneration`, `aura`;
   `gebaeude` um `auferstehen`; `weapon` um `flaeche`, `verlangsamt`; dazu
   `FELDER.aura`, `FELDER.auraArt`, `FELDER.flaeche`, `FELDER.verlangsamt`,
   `FELDER.auferstehen`; `test/daten.test.js` prüft sie.
7. Oberfläche: Info-Karten nennen alles („heilt 60 LP/min“, „Aura: +20 %
   Tempo in 80 m“, „trifft auch im Umkreis 30 m mit 40 %“, „bremst 3 s um
   30 %“, „jede 4. Seele steht als Skelettkrieger auf“); verlangsamte
   Einheiten im `auswahlKopf`; Effekte in `src/effekte.js` (Heilfunken,
   Aufstehen aus dem Boden, Flächentreffer).
8. KI: braucht nichts Eigenes — die Felder wirken von selbst.
9. Tests je Mechanik (`test/volksmechaniken.test.js`) inkl. Spielstand und
   Determinismus; Referenz bitgleich.

## M3 — abgenommen und gemergt (12.10.)

## M8 Oberfläche — abgenommen und gemergt (12.10.)

1. **Bauleiste in Gruppen.** Mit den neuen Rollen hat jedes Volk bald ~19
   Gebäude, die Tasten 1–0 reichen nicht. Drei Gruppen, abgeleitet aus den
   Rollen (`FACTIONS[f].rollen`): **Wirtschaft** (kraft, fron, blut,
   umwandler, anker, forschung, posten), **Militär** (fabrik, luftfabrik,
   werkstatt, turm, flak), **Besonderes** (zorn, wehr, schild, schlag,
   abwehr und alles in `bauten` ohne Rolle). Reihenfolge innerhalb einer
   Gruppe wie in `bauten`. Oberfläche: kleine Reiter über der Bauleiste,
   **Tab** wechselt die Gruppe (Shift+Tab zurück), 1–0 bauen in der
   aktiven Gruppe. Gilt in 2D und 3D; die Hilfe (H) nennt Tab. Ohne Erbauer
   bleibt die Leiste wie heute (Ausbildung).
2. **Modelle von Gemini einbinden** (stehen in `src/modelle3d.js`):
   `schildkuppel` in 3D statt des Rings (Größe nach `schild.radius`,
   Deckkraft nach Ladung — falls das Modell keine Transparenz kann, den Ring
   behalten und die Kuppel zusätzlich zeigen); `fernschlag` als Geschoss im
   Flug (Bogen vom Gebäude zum Ziel, Ankunft zum Einschlagtick); `flak` als
   Treffereffekt der Flak-Waffe (`ziele: 'luft'`). In 2D reichen Kreise.
   Danach den Wunsch in `docs/grafik/wuensche.md` abhaken.

## M6 Tech-Baum — abgenommen und gemergt (12.10.)

1. Neue Wirkungen in `skill.wirkung` (Promille wie die vorhandenen):
   `tempo`, `reichweite`, `sicht`, `baukraft` und `regeneration` (LP/min
   dazu, absolut). Dazu **`nur: [typen]`** am Skill: dann wirkt die Wirkung
   nur auf diese Einheiten-/Gebäudetypen (sonst aufs ganze Volk wie heute).
   Alles in `bonus()` bzw. dort, wo Tempo, Reichweite, Sicht, Baukraft und
   Regeneration heute berechnet werden — eine Stelle je Größe.
2. `FELDER.skill` um `nur`, `FELDER.wirkung` um die neuen; `daten.test.js`
   prüft, dass `nur` eigene Typen nennt.
3. Oberfläche Skillbaum (T): vier Spalten (Äste), darin die Stufen nach
   Tiefe der `braucht`-Kette, Linien zu den Voraussetzungen, scrollbar, die
   Karte zeigt Wirkung inkl. „nur für …“. Muss mit ~28 Skills je Volk gut
   lesbar bleiben.
4. Tests je Wirkung und für `nur`; Referenz bitgleich.

## M7 KI

Genaue Aufträge folgen nach Abnahme von M1/M2 (Konzept Abschnitt 2).

(M7 wartet, bis Gemini die neuen Rollen in die Völker eingetragen hat (G3a) —
ohne sie lässt sich die KI nicht messen. Vorher kommt M9.)

## M9 Mehrspieler: 3 und 4 Spieler — abgenommen und gemergt (12.10.)

Gemini hat die Karten `dreiReiche` (3 Basen) und `vierlande` (4 Basen) in
`KARTEN` eingetragen (`spieler`, `basen: [{x, y}]`). Das Spiel kann bisher
nur zwei Spieler. Ziel: **Jeder gegen jeden** mit 2–4 Spielern, ein Mensch
und bis zu drei KIs, in 2D und 3D. Online und Kampagne bleiben bei zwei.

1. **Simulation:** `createWorld({ factions: [...] })` legt so viele Spieler
   an, wie Völker übergeben werden (höchstens `karteDaten.spieler`, sonst 2;
   Karten ohne `spieler` haben 2). `setupMap` nimmt die Startplätze aus
   `karteDaten.basen`, ohne sie wie heute (3000,3000)/(MAP-3000,MAP-3000).
   Hat eine Karte für 3–4 Spieler nur 2 Völker, spielen sie auf den ersten
   beiden Basen. Sieg: Wer kein Hauptgebäude und keinen Kommandanten mehr
   hat, scheidet aus (`alive: false`), seine Einheiten und Gebäude bleiben
   bis zur Zerstörung stehen oder verfallen nach einer Designzahl (kennzeichnen);
   gewonnen hat der letzte Übrige. Überall `p < 2`, `1 - p` usw. auf
   `world.players.length` umstellen.
2. **Kunde:** Die möglichen Startplätze der Gegner sind alle Basen außer der
   eigenen (wie in StarCraft bekannt) — nicht mehr „gegenüber“. Bei zwei
   Spielern gilt weiter genau die eine Gegenbasis (bitgleich).
3. **KI:** wählt ein Ziel unter mehreren Gegnern (Designzahl, kennzeichnen:
   z. B. der nächste bekannte, bei Angriff auf die eigene Basis der
   Angreifer), Verteidigung gegen jeden. Nur über die Kunde.
4. **Oberfläche (2D und 3D):** Startmenü zeigt bei Karten mit mehr als zwei
   Basen bis zu drei Gegner (Volk je Gegner, „keiner“ möglich); Farben für
   bis zu vier Spieler (`teamFarbe` o. ä.), Minikarte, HUD-Werte (Stärke,
   Domäne) je Spieler, Ende-Bildschirm „Gewonnen/Verloren/ausgeschieden“,
   Beobachter und Wiederholung mit N Spielern. Speichern/Laden mit N.
5. **Werkzeuge:** `tools/match.mjs` und `tools/sweep.mjs` können eine
   Karte mit N Spielern fahren (z. B. `spieler=3 karte=dreiReiche`);
   die Zwei-Spieler-Messungen bleiben unverändert.
6. **Bitgleich:** `node tools/referenz.mjs` unverändert für zwei Spieler.
   Tests: 3 und 4 Spieler deterministisch (Spielstand mitten im Gefecht),
   Ausscheiden, Sieg des Letzten, Kunde ohne Blick auf fremde Entities,
   KI-gegen-KI-Partie mit 4 Spielern endet ohne Hänger.

## R0 Rollen optional, KI robust (Resonit, `docs/resonit/plan.md`)

Resonit kennt „Keine Pendants“: Nicht jedes Volk hat jede Rolle (der Kranor
hat z. B. keine Jäger und Bomber, kein Volk hat Schreine oder einen
Tech-Baum). Heute verlangt `ROLLEN` 14 Pflichtrollen, und die KI nimmt viele
davon als gegeben (`plan.turm`, `plan.zorn`, `plan.forschung`,
`plan.belagerung`, `plan.schwer` …).

1. **Pflicht bleiben nur:** Gebäude `anker`, `kraft`, `fron`, `blut`,
   `fabrik`; Einheiten `bauer`, `leicht`. Alles andere wandert nach
   `ROLLEN.frei` (Art Gebäude/Einheit bleibt geprüft). `test/daten.test.js`
   und `test/grid.test.js` entsprechend.
2. **KI ohne fehlende Rollen:** Jede Stelle in `src/sim/ai.js`, die eine
   Rolle nutzt, muss ohne sie sinnvoll weiterspielen: kein Turm → Heer
   verteidigt; keine Forschung → keine Skillpunkte-Gebäude; kein `fern`/
   `schwer`/`belagerung` → Heer aus dem, was die Fabriken ausbilden
   (`buildList`), z. B. nach Kosten und Waffe gemischt (Designzahlen
   kennzeichnen). Volk ohne Skills (`skills: {}`, `lernen: []`) und ohne
   Fähigkeiten (`faehigkeiten: []`) muss gehen.
3. **Oberfläche:** Hat ein Volk keine Skills, verschwinden Glühbirne,
   Skillbaum-Taste T und Skill-Hinweise; ohne Fähigkeiten die Q/W/E-Leiste.
   Kodex und Infokarten ohne Fehler.
4. **Tests:** ein Testvolk zur Laufzeit (nur Pflichtrollen, keine Skills,
   keine Fähigkeiten, z. B. aus Menschen-Daten abgeleitet, im `after()`
   wieder entfernt): KI gegen KI und gegen Menschen 30 min ohne Hänger, sie
   baut ein Heer und greift an; Oberflächen-Helfer ohne Fehler.
   `node tools/referenz.mjs` bitgleich.

## R1 Wracks und Bergung (Resonit, Kompendium „Masse und Wracks“)

Masse ist lagerbar, aber der Witz ist die Rückgewinnung: Jedes große
Gefecht wird zum zweiten Kampf um das Trümmerfeld.

1. **Wrack:** Fällt eine Einheit (nicht „vergangen“, nicht beschworen),
   bleibt ein Wrack mit `masse` = Anteil ihrer Kosten (`RULES.wrackAnteil`,
   Designzahl, Vorschlag 700 Promille). Gebäude ebenso (eigener Anteil
   `RULES.wrackAnteilGebaeude`, Vorschlag 500). Wracks liegen in
   `world.wracks` (stabile Reihenfolge, eigene ids), gehören niemandem,
   sind für alle sichtbar, sobald gesehen (Kunde: wie gesehene Gebäude
   merken), und vergehen nicht von selbst.
2. **Bergung:** Ein Erbauer (`build`) oder eine Einheit mit dem neuen Feld
   `bergung: { kraft }` (Masse pro Minute, Datenfeld in `FELDER`) birgt ein
   Wrack per Rechtsklick (Befehl `bergen`) — nur auf Befehl, nicht
   automatisch (so wenig vorgeben wie möglich). Erbauer bergen mit ihrer Baukraft umgerechnet (Designzahl). Die Masse
   geht dem Spieler zu, das Wrack schrumpft und verschwindet bei 0.
   Shift-Ketten (Routen, `wege`) wie beim Bauen.
3. **Hindernis/Deckung:** Wracks sind kein Weg-Hindernis (das wäre ein neues
   Wegfindungssystem) — nur sichtbar und bergbar. Deckung ist nicht Teil
   von R1.
4. **Darstellung:** 2D ein dunkler, zerklüfteter Fleck mit Größe nach
   Masse; 3D ein Platzhalter-Modell `wrack` (Gemini bekommt einen Wunsch in
   `docs/grafik/wuensche.md` für ein echtes Modell), Infokarte beim
   Überfahren („Wrack — 120 Masse“), Bergungs-Cursor. In Geminis Dateien
   nichts ändern: Platzhalter in `src/platzhalter.js`.
5. **KI:** schickt einen Erbauer zu Wracks in der eigenen Domäne, wenn
   untätig (Designzahl kennzeichnen) — nur über die Kunde.
6. **Spielstand, Hash, Wiederholung, Netz:** `world.wracks` gehört dazu.
   Zwei-Spieler-Referenz **ändert sich** (Wracks verändern die Wirtschaft) —
   das ist hier erlaubt: alte und neue Zeile im Bericht, und eine Messung
   `node tools/sweep.mjs 36 45 Ausgang stile` (mensch-gott) vorher/nachher.
7. **Tests:** Wrack entsteht mit richtiger Masse, Bergung zahlt aus und
   endet, zwei Berger teilen sich ein Wrack deterministisch, Spielstand
   mitten in der Bergung bitgenau, Kunde sieht ungesehene Wracks nicht.
