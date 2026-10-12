# Stand des Umbaus — welche Mechaniken nutzbar sind

Pflegt Claude nach jedem Merge. Inhalte (Gemini, `src/sim/voelker/`) dürfen
nur Mechaniken mit „nutzbar“ verwenden; `test/daten.test.js` prüft die Felder.

| Mechanik | Felder | Stand |
| --- | --- | --- |
| Grundlage | Volksdateien, `FELDER`, `ROLLEN`, `test/daten.test.js` | nutzbar |
| umwandler (Gegenwart → Fron) | `gegenwartIn` + `fronOut` ohne `needs` | nutzbar (reine Daten) |
| posten (weite Sicht) | `sicht` | nutzbar (reine Daten) |
| M1 Luftebene | `weapon.ziele` (`boden`/`luft`/`beide`), Flieger mit `weapon` kämpfen, Rollen `luftfabrik`, `flak` (Gebäude), `luftjaeger`, `bomber` (Einheiten) — die KI nutzt sie, wenn ein Volk sie hat | **nutzbar** (seit 12.10.) |
| M2 Schild | `schild` | in Arbeit (Sonnet) |
| M3 Volks-Mechaniken | `regeneration`, `aura`, `auferstehen`, `flaechenschaden`, `verlangsamt` | geplant |
| M4 Fernschlag, Abwehr | `schlag`, `abwehr` | geplant |
| M5 Prototypen | `hoechstens` | geplant |
| M6 Tech-Baum | `wirkung.tempo/reichweite/sicht/baukraft/regeneration`, `nur` | geplant |
| M7 KI | — | geplant |
| M8 Oberfläche | — | geplant |
