# Stand des Umbaus — welche Mechaniken nutzbar sind

**Seit 12.10.2026 wird das Spiel Resonit** (`docs/resonit/plan.md`). Die Mechaniken unten gelten weiter; die Fantasy-Völker werden nicht mehr nachgestellt.

Pflegt Claude nach jedem Merge. Inhalte (Gemini, `src/sim/voelker/`) dürfen
nur Mechaniken mit „nutzbar“ verwenden; `test/daten.test.js` prüft die Felder.

| Mechanik | Felder | Stand |
| --- | --- | --- |
| Grundlage | Volksdateien, `FELDER`, `ROLLEN`, `test/daten.test.js` | nutzbar |
| umwandler (Gegenwart → Fron) | `gegenwartIn` + `fronOut` ohne `needs` | nutzbar (reine Daten) |
| posten (weite Sicht) | `sicht` | nutzbar (reine Daten) |
| M1 Luftebene | `weapon.ziele` (`boden`/`luft`/`beide`), Flieger mit `weapon` kämpfen, Rollen `luftfabrik`, `flak` (Gebäude), `luftjaeger`, `bomber` (Einheiten) — die KI nutzt sie, wenn ein Volk sie hat | **nutzbar** (seit 12.10.) |
| M2 Schild | `schild: { kapazitaet, radius, laden }` (laden je Tick bei voller Versorgung, braucht `gegenwartIn`), Rolle `schild` (Gebäude) — die KI baut einen ab Minute 10 | **nutzbar** (seit 12.10.) |
| M3 Volks-Mechaniken | `regeneration` (LP/min, Einheit und Gebäude), `aura: { art: heilung/tempo/schaden/schutz, wert, radius }` (stärkste je Art zählt), `weapon.flaeche: { radius, anteil }`, `weapon.verlangsamt: { dauer, wert }`, `auferstehen: { alle, einheit, dauer }` (nur an Ankern mit perTod) | **nutzbar** (seit 12.10.) — aber Änderungen an **bestehenden** Einheiten erst nach Freigabe der Entwürfe durch den Nutzer |
| M4 Fernschlag, Abwehr | `schlag: { laden, flug, reichweite, radius, schaden, kosten }`, `abwehr: { radius, laden }` (laden in Ticks bei voller Versorgung), Rollen `schlag`, `abwehr` — Einschlag trifft beide Seiten, Schilde zuerst; die KI baut ab Minute 20 bzw. bei Bedarf | **nutzbar** (seit 12.10.) |
| M5 Prototypen | `hoechstens` (Einheit: lebende + bestellte), Rollen `werkstatt` (Gebäude), `prototyp` (Einheit) — die KI baut die Werkstatt ab Minute 18 | **nutzbar** (seit 12.10.) |
| M6 Tech-Baum | `wirkung.tempo/reichweite/sicht/baukraft` (Promille), `wirkung.regeneration` (LP/min, absolut), `nur: [eigene Typen]` am Skill (dann nur für diese, sonst ganzes Volk; gilt auch für die alten Wirkungen) — der Skillbaum ordnet nach `braucht`-Tiefe und zieht Linien | **nutzbar** (seit 12.10.) — `regeneration` bitte mit `nur` (sonst heilt sie auch alle Gebäude); `schutz` wirkt nur auf Einheiten |
| M7 KI | — | in Arbeit (Sonnet) |
| R0 Rollen optional | Pflicht nur `anker`, `kraft`, `fron`, `blut`, `fabrik`, `bauer`, `leicht`; alles andere frei (auch `turm`, `zorn`, `wehr`, `forschung`, `fern`, `schwer`, `belagerung`, `umwandler`). `rollen`, `lernen`, `skills`, `faehigkeiten` dürfen fehlen bzw. leer sein — die KI mischt ihr Heer dann aus dem, was die Fabriken ausbilden; ohne Skills keine Glühbirne und kein T | **nutzbar** (seit 12.10.) |
| M9 Mehrspieler | Karten mit `spieler` und `basen: [{x, y}]` fassen 3–4 Spieler (`maxSpieler`, `startplatz`), Ausscheiden und Verfall, Kunde mit `gegnerPlaetze` | **nutzbar** (seit 12.10.) |
| M8 Oberfläche | Bauleiste in Gruppen aus den Rollen (Wirtschaft, Militär, Besonderes; Tab wechselt), Reihenfolge wie `bauten`, volkseigene Gebäude ohne Rolle unter „Besonderes“; Modelle `schildkuppel`, `fernschlag`, `flak` eingebunden | **nutzbar** (seit 12.10.) |

## Messungen

| Stand | Menschen : Gott | Todesgott : Menschen | Todesgott : Gott |
| --- | --- | --- | --- |
| 0.39 (vor dem Umbau) | 32 : 25 | 42 : 30 | 34 : 25 |
| + Spähposten für Gott und Tod (Gemini, Runde 28) | 38 : 24 | 32 : 40 | 33 : 29 |
| + Skillbäume 22 je Volk (Gemini, Runde 30) | 44 : 26 | 30 : 42 | 36 : 34 |

KI gegen KI, 36 Seeds × 2 Sitzplätze, 45 min, Stil-Paarungen (`tools/sweep.mjs 36 45 Ausgang stile voelker=…`). Nach den Skillbäumen gewinnt Tod gegen Gott auffällig oft schon in Minute 4 (Seeds paarweise „M4 M4“) — vermutlich fällt der Kommandant früh; mit dem Wechsel zu Resonit nicht weiter verfolgt. Messungen mit weniger Partien (Gemini: 10 Seeds × 30 min) streuen zu stark für Aussagen — bitte immer diese Einstellung.
