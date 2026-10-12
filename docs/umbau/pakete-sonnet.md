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

## M2 Schild (danach)

Gebäudefeld `schild: { kapazitaet, radius, laden }` (laden: Punkte pro Tick
bei voller Versorgung, braucht `gegenwartIn`). Schaden an eigenen Gebäuden
und Einheiten im Umkreis geht zuerst auf den Schild (bei Überlappung der mit
der kleinsten Id und Ladung > 0). Hash, Spielstand, Oberfläche (Kuppel und
Ladebalken), Tests.

## M4 Fernschlag und Abwehr · M5 Prototypen · M3 Volks-Mechaniken · M6 Tech-Baum · M8 Oberfläche · M7 KI

Genaue Aufträge folgen nach Abnahme von M1/M2 (Konzept Abschnitt 2).
