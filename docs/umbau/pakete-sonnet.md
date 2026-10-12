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

## M3 Volks-Mechaniken · M6 Tech-Baum · M8 Oberfläche · M7 KI

Genaue Aufträge folgen nach Abnahme von M1/M2 (Konzept Abschnitt 2).
