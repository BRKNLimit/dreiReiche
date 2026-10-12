# Resonit auf dem bestehenden Kern — Plan

Entscheidung des Nutzers (12.10.2026): Das Spiel wird **Resonit**, das
Sci-Fi-RTS im Stil von Supreme Commander. Grundlage ist das Kompendium
(`docs/resonit/kompendium.md`, übernommen aus Geminis Ordner
`resonit-scifi`). Gebaut wird **auf dem bestehenden Kern** dieses Repos,
nicht auf Geminis neuem Rohbau. Der Rohbau bleibt Konzept- und Grafikquelle;
er hat 5 Tests, die KI baut sofort fertig und sieht alles, und in 30
Minuten KI gegen KI kommt es zu keinem Kampf.

Die Arbeitsteilung bleibt: **Gemini** macht Inhalte und Grafik, ein
**Sonnet-Agent** baut Mechaniken, **Claude** macht Technik, Prüfung und
Merges.

## 1. Was der Kern schon kann

„Die drei Reiche“ war im Kern schon Resonit, nur im Fantasy-Gewand:

| Resonit (Kompendium) | Heute im Kern |
| --- | --- |
| Energie: Fluss, nicht lagerbar, regional | `gegenwart`, Regionen, `powered` |
| Drossel-Leiter: Fabriken → Sonstiges → Schilde → Geschütze | `PRIO` werk → segen → wehr → zorn, genau diese Reihenfolge |
| Masse: Bestand aus Extraktoren | `fron` aus Adern |
| Resonit: nur erobert, Qualitätsobergrenze | `goetterblut` aus umkämpften Adern |
| Netz wächst über Gebäude, Außenstelle braucht eigene Erzeugung | Anker und Domäne |
| Schilde, Flak und Luft, Nuke und Abwehr, Prototypen mit Limit, Werkstatt | M1–M5 |
| Wegpunktketten, angezeigte Routen | 0.39 |
| Nebel des Krieges, KI nur über die Kunde | ja |
| Lockstep-Netzspiel, Wiederholung, Speichern | ja |
| 2–4 Spieler | M9 läuft |

## 2. Was fehlt

### Mechaniken (Sonnet), in dieser Reihenfolge

- **R0 Rollen optional, KI robust:** „Keine Pendants“ — nicht jedes Volk
  hat jede Rolle. Pflicht bleiben nur Hauptgebäude, Netzknoten (`anker`),
  Kraftwerk, Extraktor, Fabrik und Erbauer. Die KI muss ohne die übrigen
  Rollen spielen (heute nimmt sie z. B. `zorn`, `wehr`, `forschung`,
  `belagerung` als gegeben).
- **R1 Wracks und Bergung:** Zerstörte Einheiten hinterlassen ein Wrack
  mit einem Teil ihrer Masse (Designzahl, z. B. 70 %). Erbauer und
  Bergungsfahrzeuge recyceln es. Wracks sind Hindernis und Deckung.
- **R2 Feuerleitnetz:** Waffen zielen nur auf das, was ihr Spieler gerade
  sieht. Artillerie, deren Reichweite größer ist als ihre Sicht, braucht
  einen Späher. Die Simulation braucht dafür eine Sicht je Spieler, und
  die muss deterministisch sein.
- **R3 Chassis und Module:** Rumpf mit Steckplätzen (klein, groß). Die
  Fabrik baut eine Standardbestückung, die Werkstatt rüstet gegen Masse und
  Zeit um. Waffe, Sicht, Schild und Support kommen aus den Modulen. Alles
  als Daten, Vorschlag in `docs/resonit/datenmodell-gemini.md`. Das ist das
  größte Paket.
- **R4 Maßstab:** zuerst eine Karte mit 10 × 10 km (heute 2 × 2), später
  40 × 40 km. Dazu ein strategischer Zoom, der beim Herauszoomen
  Taktik-Symbole statt Modelle zeigt. Wegfindung, Nebel und Raster müssen
  dafür schnell genug bleiben.
- **R5 Volksmechaniken:**
  - Vanguard: Besatzungen und Crew-Pods, Ferry-Transport
  - Kranor: Tunnel
  - Aethelion: Schildgitter, Lanzenmodi, Schweben
  - Rostbrut: Beute-Module, Überhitzung, Resonit verbrennen
- **R6 KI** für alles oben (das frühere M7), danach Balance.

### Technik (Claude)

- **T1 Begriffe an einer Stelle:** Namen der Ressourcen, Prio-Stufen und
  „Netz“ statt „Domäne“ kommen aus einer Tabelle. Titel „Resonit“. Erst
  nach dem Merge von M9, weil dieselben Dateien betroffen sind.
- **T2 Schlüssel umbenennen:** `gegenwart` → `energie`, `fron` →
  `masse`, `goetterblut` → `resonit`, in einem bitgleichen Schritt, wenn
  kein Zweig offen ist. Die Volksdateien zieht Claude dabei mechanisch mit.
- **T3 Fantasy-Völker:** bleiben spielbar, bis Vanguard und Kranor stehen.
  Danach verschwinden sie aus dem Menü, die Kampagne „Die Rodung“ ebenso.
  Der Code bleibt in der Git-Historie.
- **Kein Tech-Baum:** Das Kompendium will keinen. `RULES.skills` wird für
  Resonit abgeschaltet; die Technik dafür (M6) bleibt im Code.

### Inhalte und Grafik (Gemini)

- **Meilenstein 1: Vanguard gegen Kranor.** Die Daten kommen in
  `src/sim/voelker/vanguard.js` und `kranor.js`, nur mit Feldern aus
  `FELDER`. Zuerst werden die Rümpfe mit fester Bestückung als normale
  Einheiten angelegt, Module kommen mit R3. Dazu Sci-Fi-Modelle, Icons und
  2D-Figuren. Damit ist Sci-Fi sofort spielbar.
- Danach kommen Aethelion und Rostbrut, Gelände und Effekte im Sci-Fi-Stil
  und die Taktik-Symbole für den Zoom.

## 3. Reihenfolge

1. M9 Mehrspieler (Sonnet, läuft). Parallel arbeitet Gemini an Meilenstein
   1 (Vanguard und Kranor) mit den Mechaniken von heute.
2. Claude macht T1 und T2. Sonnet macht R0, danach R1.
3. Sonnet: R2, dann R3. Gemini stellt die Rümpfe auf Module um.
4. Sonnet: R4 (10 km, Zoom).
5. Gemini: Aethelion und Rostbrut. Sonnet: R5.
6. KI (R6) und Balance über alle Paarungen.
7. Port nach Godot 4 erst, wenn das Design steht. Die Entscheidung kommt
   später.

## 4. Offene Fragen an den Nutzer

- Kartengröße: Reichen 10 × 10 km als erster Schritt, oder soll es gleich
  in Richtung 40 km gehen?
- Kommandant: Ist der Verlust des Kommandanten das Aus (wie heute und wie
  die ACU in Supreme Commander), oder schmerzt er nur (Vorschlag des
  Kompendiums)?
- Wasser und Marine stehen im Kompendium. Wann kommen sie dran?
