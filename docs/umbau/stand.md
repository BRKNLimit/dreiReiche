# Stand des Umbaus — welche Mechaniken nutzbar sind

Pflegt Claude nach jedem Merge. Inhalte (Gemini, `src/sim/voelker/`) dürfen
nur Mechaniken mit „nutzbar“ verwenden; `test/daten.test.js` prüft die Felder.

| Mechanik | Felder | Stand |
| --- | --- | --- |
| Grundlage | Volksdateien, `FELDER`, `ROLLEN`, `test/daten.test.js` | nutzbar |
| umwandler (Gegenwart → Fron) | `gegenwartIn` + `fronOut` ohne `needs` | nutzbar (reine Daten) |
| posten (weite Sicht) | `sicht` | nutzbar (reine Daten) |
| M1 Luftebene | `weapon.ziele` (`boden`/`luft`/`beide`), Flieger mit `weapon` kämpfen, Rollen `luftfabrik`, `flak` (Gebäude), `luftjaeger`, `bomber` (Einheiten) — die KI nutzt sie, wenn ein Volk sie hat | **nutzbar** (seit 12.10.) |
| M2 Schild | `schild: { kapazitaet, radius, laden }` (laden je Tick bei voller Versorgung, braucht `gegenwartIn`), Rolle `schild` (Gebäude) — die KI baut einen ab Minute 10 | **nutzbar** (seit 12.10.); ein Modell `schildkuppel` wäre schön (3D zeigt bisher einen Ring) |
| M3 Volks-Mechaniken | `regeneration`, `aura`, `auferstehen`, `flaechenschaden`, `verlangsamt` | geplant |
| M4 Fernschlag, Abwehr | `schlag`, `abwehr` | in Arbeit (Sonnet) |
| M5 Prototypen | `hoechstens` | in Arbeit (Sonnet) |
| M6 Tech-Baum | `wirkung.tempo/reichweite/sicht/baukraft/regeneration`, `nur` | geplant |
| M7 KI | — | geplant |
| M8 Oberfläche | — | geplant |

## Messungen

| Stand | Menschen : Gott | Todesgott : Menschen | Todesgott : Gott |
| --- | --- | --- | --- |
| 0.39 (vor dem Umbau) | 32 : 25 | 42 : 30 | 34 : 25 |
| + Spähposten für Gott und Tod (Gemini, Runde 28) | 38 : 24 | 32 : 40 | 33 : 29 |

KI gegen KI, 36 Seeds × 2 Sitzplätze, 45 min, Stil-Paarungen (`tools/sweep.mjs 36 45 Ausgang stile voelker=…`). Messungen mit weniger Partien (Gemini: 10 Seeds × 30 min) streuen zu stark für Aussagen — bitte immer diese Einstellung.
