# Umbau: gemeinsame Basis, Spezialisierung, großer Tech-Baum

Stand 12.10.2026. Anlass: Todesgott und Waldgott spielen sich zu ähnlich.
Vorbild des Nutzers: Supreme Commander 2 — alle Völker teilen eine Basis
(Masse, Energie, Forschung, Land-/Luftfabrik, Punkt- und Luftabwehr,
Schildgenerator, Massewandler, Atomrakete und Abwehr, Prototypen …), die
Unterschiede kommen aus **Spezialisierung**: einem umfassenden Tech-Baum
und volkseigenen Einheiten, Gebäuden und Prototypen.

Leitlinie bleibt: **so wenig vorgeben wie möglich** — keine pauschalen
Boni, die eine Spielweise erzwingen. Ein Volk ist anders, weil es andere
*Werkzeuge* hat, nicht weil seine Zahlen größer sind.

## 1. Die gemeinsame Basis (Rollen)

Jedes Volk besetzt jede Rolle mit einem eigenen Gebäude bzw. einer eigenen
Einheit (`rollen` in `src/sim/voelker/<volk>.js`, Liste `ROLLEN` in
`src/sim/defs.js`). Die KI baut nach Rollen. Gleiche Rolle heißt gleicher
Zweck, nicht gleiche Werte.

| Rolle | gibt es | Zweck | Mechanik |
| --- | --- | --- | --- |
| haupt, anker, kraft, fron, blut | ✔ | Hauptgebäude, Domäne, Gegenwart, Förderung | vorhanden |
| fabrik | ✔ | Bodeneinheiten | vorhanden |
| turm | ✔ | Abwehr gegen Bodenziele | vorhanden |
| zorn, wehr | ✔ | Schreine | vorhanden |
| forschung | ✔ | schneller Skillpunkte | vorhanden |
| posten | Menschen | weite Sicht | vorhanden, jetzt für alle |
| **luftfabrik** | neu | Flieger | M1 |
| **flak** | neu | Abwehr nur gegen Flieger | M1 |
| **schild** | neu | Schildkuppel über eigenen Gebäuden und Einheiten | M2 |
| **umwandler** | neu | Gegenwart → Fron, ohne Ader | geht schon (Daten) |
| **werkstatt** | neu | baut Prototypen | M5 |
| **schlag** | neu | Fernschlag: lädt lange, trifft einen Punkt sehr hart | M4 |
| **abwehr** | neu | fängt Fernschläge in ihrem Umkreis ab | M4 |

Einheiten-Rollen: bauer, leicht, fern, schwer, belagerung (vorhanden),
**spaeher** (Flieger, bisher „rabe“), **luftjaeger** (Flieger gegen
Flieger), **bomber** (Flieger gegen Boden), **prototyp** (einer je Volk zu
Beginn, mehr später).

Nicht im Umbau: **Wasser** (Schiffe brauchen eigene Karten und eine eigene
Wegfindung — später), **Mauern** (verändern die Wegfindung zur Laufzeit —
später).

## 2. Mechaniken (Technik)

Jede Mechanik ist ein Datenfeld (in `FELDER` eingetragen, in `sim.js`
umgesetzt, mit Test in Isolation). Erst wenn sie auf `main` ist, dürfen
Inhalte sie benutzen — `test/daten.test.js` lehnt unbekannte Felder ab.

- **M1 Luftebene:** `weapon.ziele` = `'boden' | 'luft' | 'beide'`
  (ohne Angabe wie bisher: Nahkampf nur Boden, Fernkampf beides). Flieger
  mit Waffe kämpfen. Flak: Gebäude mit `ziele: 'luft'`.
- **M2 Schild:** Gebäudefeld `schild: { kapazitaet, radius, laden }` —
  Schaden an Eigenem im Umkreis trifft zuerst den Schild, der sich mit
  Gegenwart wieder auflädt.
- **M3 Volks-Mechaniken** (machen die Völker verschieden, siehe 3):
  `regeneration` (LP pro Minute), `aura` (Wirkung auf Eigene im Umkreis:
  heilung, tempo, schaden, schutz), `auferstehen` (Anker: jede n-te Seele
  steht als Einheit wieder auf), `flaechenschaden` (Treffer verteilt sich),
  `verlangsamt` (Treffer bremst). Damit werden auch Geminis Elite-Einheiten
  möglich.
- **M4 Fernschlag und Abwehr:** `schlag: { laden, kosten, reichweite,
  radius, schaden }` mit Befehl „schlag“ auf einen Punkt; `abwehr:
  { radius, laden }` fängt einen Schlag ab, wenn geladen.
- **M5 Prototypen:** Einheitenfeld `hoechstens` (wie viele gleichzeitig
  leben dürfen).
- **M6 Tech-Baum:** mehr Wirkungen (`tempo`, `reichweite`, `sicht`,
  `baukraft`, `regeneration`) und `nur: [typen]`, damit ein Skill nur
  einzelne Einheiten verbessert; Stufen über `braucht`. Oberfläche: Baum
  mit Ästen und Stufen, scrollbar.
- **M7 KI:** spielt alle Rollen — Luft, Flak nach Bedarf (Kunde!), Schild an
  der Basis, Fernschlag und Abwehr, Prototyp im Spätspiel.
- **M8 Oberfläche:** Bauleiste in Gruppen (Wirtschaft, Militär, Spezial),
  Schild- und Ladeanzeigen, Zielen für den Fernschlag.

## 3. Spezialisierung je Volk (Richtung — Entwurf, der Nutzer entscheidet)

| | Menschen | Wald- und Wiesengott | Todesgott |
| --- | --- | --- | --- |
| Domäne | sofort voll, fest | wächst mit der Zeit | wächst mit den Toten |
| Stärke | Technik, Befestigung, Belagerung | Leben: Heilung, Wachstum, Beschwörung | Masse, Zermürbung, Auferstehung |
| eigene Mechanik | Schilde und Türme stärker im Baum, Belagerung | `regeneration`, `aura` (Heilung) | `auferstehen`, `verlangsamt`, Seuche (`flaechenschaden`) |
| Luft | Ballon/Flugmaschine | Schwärme (Vögel, Insekten) | Aasgeier, Knochendrache |
| Prototyp | Belagerungsturm / Dampfkoloss | Weltenbaum-Ent | Knochendrache |
| Spielgefühl | planen, absichern, durchbrechen | ausharren, heilen, spät überrollen | angreifen, Verluste in Stärke verwandeln |

Der Tech-Baum hat je Volk vier Äste mit je ~6–8 Knoten (heute 14 Skills je
Volk, künftig ~28): Einheiten, Gebäude (schaltet auch Basis-Rollen wie
Schild und Fernschlag frei), Verbesserungen (mit `nur`), Kommandant.

## 4. Arbeitsteilung (Vorgabe des Nutzers: 60 / 30 / 10)

| Wer | Anteil | Was | Wo |
| --- | --- | --- | --- |
| **Gemini** | 60 % | Inhalte: Volksdateien (neue Gebäude, Einheiten, Skills je Rolle und Spezialisierung, nur mit vorhandenen Feldern), alle Modelle, Icons, 2D-Figuren, Galerie, Kodex-Texte, Balance-Messung mit `tools/sweep.mjs` | Branch `gemini/grafik`, Worktree `resonit-gemini`, Auftrag `docs/umbau/auftrag-gemini.md` |
| **Sonnet** (Unteragent) | 30 % | Mechaniken M1–M8 nach diesem Konzept, je mit Tests und Eintrag in `FELDER` | eigener Worktree je Paket, Auftrag `docs/umbau/pakete-sonnet.md` |
| **Claude** | 10 % | Technik: Datenformat (`FELDER`, `ROLLEN`, Volksdateien), Prüfungen, Abnahme jedes Pakets (Tests, Prüfsummen, Messung), Merges, Konzept | `main` |

Abnahme für jedes Paket: `npm test` und `npm run smoke` grün; Prüfsummen
der Referenzpartien unverändert, wenn das Paket nur Neues hinzufügt;
Balance je Paarung zwischen 45 und 55 % (KI gegen KI, 36 Seeds × 2,
`tools/sweep.mjs … voelker=a-b`), sobald Inhalte sich ändern.

## 5. Reihenfolge

1. **Jetzt, parallel:** Sonnet M1 (Luftebene). Gemini: Modelle, Icons und
   2D-Figuren für alle neuen Rollen aller drei Völker, plus je Volk ein
   Inhaltsentwurf (Markdown) im Rahmen von Abschnitt 3 — der Nutzer nickt
   ihn ab.
2. Sonnet M2, M4, M5, M3, M6, M8; Gemini trägt nach jedem Merge die Inhalte
   ein, die die neue Mechanik braucht.
3. Sonnet M7 (KI für alles), dann Balance über alle Paarungen.
4. Danach: Port nach Godot 4 (eigene Planung) — erst wenn das Design steht.

## 6. Offene Entscheidungen des Nutzers

- Spezialisierungen in Abschnitt 3 — Richtung so?
- Fernschlag („Atomrakete“) und Abwehr — wirklich in die Basis?
- Prototypen: einer gleichzeitig oder mehrere?
- Wasser und Mauern später — einverstanden?
