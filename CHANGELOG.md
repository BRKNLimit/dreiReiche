# Änderungen

Messwerte: KI gegen KI, beide Sitzplätze, Menschen : Gott. Details und
Tabellen in `docs/scope.md`.

## 0.10 — Viele gegen wenige, Schreine, 3D-Ansicht

- Neue Einheiten nach Vorgabe des Nutzers: Menschen viele günstige (Bauer,
  Soldat, Jäger, Söldner), Gott wenige starke (Dryade, Wolf, Waldgeist,
  Ent); Werte per Duell bei gleichem Fron abgestimmt.
- Arbeiter bauen wie der Kommandant, nur schwächer; die KI verteilt sie auf
  Baustellen. Produktion `Q`–`R` für alle vier Plätze einer Fabrik.
- Heimvorteil aus Gebäuden: Schreine für Zorn und Wehr (Drossel-Stufen, die
  vorher ungenutzt waren), wirken im eigenen Domänennetz. `homeBonus` und
  `RULES.tiefeVoll` entfernt.
- KI: Wellen und Leibwache nach Heereswert statt Kopfzahl, Angriff nur mit
  Überlegenheit gegen den Verteidiger samt Schreinen, Heer geht vor Sparen,
  höchstens acht eigene Anker.
- **3D-Ansicht** `dist/drei-reiche-3d.html`: WebGL 2 ohne Bibliothek,
  Modelle aus Grundkörpern für alle Einheiten und Gebäude, Interpolation
  zwischen den Ticks, Domänen per Stencil, RTS-Kamera, dieselbe Steuerung.
  Eigener Smoke-Test.
- Messung: Menschen 51 : Gott 106; ohne Kommandant 160 : 0.

## 0.9 — Kommandanten

- Held (Menschen) und Waldgott: je einer, einmalig, nach Vorbild der ACU aus
  Supreme Commander. 6000 Leben, starke Waffe, baut die nächste eigene
  Baustelle mit voller Kraft — auch außerhalb der Domäne (Außenposten).
  Fällt er, ist die Partie verloren.
- KI: Kommandant geht nicht mit Wellen, hat eine Leibwache, zieht sich unter
  halbem Leben zurück. Stil Sturm schickt ihn nach vorn (Außenposten an den
  Adern), Standard und Burg lassen ihn beim Hauptgebäude bauen.
- UI: `K` wählt ihn aus, Baulinie zur Baustelle, Lebensbalken, HUD-Zeile.
- Messung: Menschen 28 : Gott 122 (ohne Kommandant 60 : 100); der Held
  fällt meist zu Hause. Spiegeltest vergleicht jetzt bis zur ersten
  Ader-Belegung statt fester Tickzahl.

## 0.8 — Werkzeuge für den Selbsttest

- Startbildschirm: die eine Frage, beide Fraktionen, Zahlen aus `defs.js`;
  Gegner-Stil wählbar (Sturm, Standard, Burg).
- Auswertung (`I`, am Ende automatisch): Reibung durch gedrosselte und
  stillstehende Baustellen, Kampfort, Anker, erstes Götterblut.
- Domänengrenze als eine Außenkante der Kreisvereinigung; gepunkteter
  Vorschauring zeigt, wie weit wachsende Anker in zwei Minuten reichen.
- KI-Stile und Stil-Matrix im Sweep. Befund: früher Angriff dominiert.

## 0.7 — Spielbarkeit

- Angriffsbewegung (`A` + Klick); die KI nutzt sie für Wellen und Abwehr.
- Einheiten verfolgen Feinde nahe ihres Befehlspunkts (an der Leine).
- Gebäude sind Hindernisse, Einheiten gleiten seitlich herum.
- Zuschauen-Modus: KI gegen KI in der Oberfläche.
- KI greift gegnerische Götterblut-Förderung gezielt an.
- Experimente `RULES.ankerKraft` und `RULES.tiefeVoll` (aus): beide lassen
  `max` wirkungslos.

## 0.6 — Balance

- Gott-Startradius 900 → 950: ausgeglichen bei 160 Partien (76 : 84), bevor
  die Angriffsbewegung kam (danach 60 : 100).

## 0.5 — Fairness und Götterblut

- Sitz 0 gewann bis zu 66 von 80 Partien. Ursachen: Rundung der Summe statt
  des Versatzes, feste Befehlsreihenfolge, Kampf und Wegschieben
  nacheinander, Spawnwinkel nach Entitäts-ID. Alles behoben, Spiegeltest
  als Unit-Test.
- Götterblut: Blutschacht und Blutwurz auf den Adern der Mittelachse,
  brauchen versorgte Domäne. **Designentscheidung:** schwere Einheiten
  kosten 10 Götterblut, ihr Fron-Preis sinkt auf 130/135 (vorher pro Fron
  schlechter als leichte).
- Kosten allgemein über alle Ressourcen, Abriss erstattet auch Götterblut.

## 0.4 — Abriss, fremder Boden, Fläche *(Ursprungssitzung)*

- Abriss mit Teilerstattung (`Entf`).
- `RULES.fremdMalus`: Schaden in fremder Domäne, offene Konzeptfrage (aus).
- HUD zeigt Domänenfläche beider Seiten mit Verlauf.
- KI setzt Anker an den Domänenrand und sammelt sich an der Front.
- `match.mjs` misst die echte Fläche (Vereinigung) und den Kampfort.

## 0.3 — Die alten Befunde waren ein Fehler

- `npm test` fand unter Windows 0 Tests und meldete Erfolg.
- Mindestfluss für Baustellen: Segen konnte alle Gegenwart binden; die
  Baustelle der rettenden Quelle stand für immer still. Daran scheiterte
  die Menschen-KI in jeder Partie — „der Gott gewinnt immer“ war kein
  Balance-Befund.
- Tempo: Förderung pro Minute statt pro Tick, Bauzeiten ×6 bzw. ×5;
  Partien dauern nun lange genug, dass Wachstum wirkt.
- Schaden an Baustellen bleibt bestehen; KI nur noch mit Ganzzahlen.

## 0.2 — Ausgangsstand aus `drei-reiche.zip`
