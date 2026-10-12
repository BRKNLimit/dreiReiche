# Inhaltsentwurf: Menschen (Das Menschenreich)

Stand: 12. Oktober 2026  
Status: **Entwurf (Paket G2)** zur Prüfung und Abnahme durch den Nutzer.  
Regelprüfung: Alle Felder sind strikt annotiert mit **[da]** (in `FELDER` vorhanden) oder **[Mx]** (geplante Mechanik aus `docs/umbau/konzept.md`).

---

## 1. Volksübersicht & Identität

* **Volksschlüssel**: `mensch` **[da]**
* **Name**: `Menschen` **[da]**
* **Farbe**: `#d8b06a` **[da]** (Königliches Gold)
* **Domäne**: Fester Radius (`growth: { start: 2600, max: 2600, perTick: 0 }` **[da]**). Die Domäne steht sofort bei Bauabschluss in voller Größe zur Verfügung. Kein Warten auf Wachstum, kein Schrumpfen bei Verlusten — maximale taktische Berechenbarkeit und planbarer Stützpunktbau.
* **Kommandant**: `held` **[da]** (Königlicher Feldherr mit Langschwert, Prunkharnisch und taktischen Führungsrufen)
* **Hauptgebäude**: `halle` **[da]** (Thingstätte)
* **Wesenszug & Spezialisierung**: Technik, massive Befestigung, verheerende Belagerungs-Artillerie und Linientaktik. Menschen besitzen die widerstandsfähigsten Gebäude, hochentwickelte mechanische Schutzschirme und die stärksten Belagerungswaffen im Spiel.
* **Spielgefühl**: Methodisches Planen, systematisches Absichern von Rohstoffadern und Engpässen mit Wachtürmen und Schildkuppeln, gefolgt von unaufhaltsamen Durchbrüchen mit schwerem Belagerungsgerät und dem gewaltigen Dampfkoloss.

---

## 2. Die gemeinsame Basis (Rollen-Besetzung)

Jede Rolle aus der gemeinsamen Basis wird von den Menschen mit einem maßgeschneiderten Gebäude bzw. einer Einheit ausgefüllt.

### 2.1 Gebäude der Basis

| Rolle | Schlüssel | Name | Zweck | Werte & Mechaniken | Begründung & Vergleich |
|---|---|---|---|---|---|
| `haupt` | `halle` | Thingstätte | Hauptgebäude, Ausbildungsstätte | `hp: 5000` **[da]**, `radius: 90` **[da]**, `anchor: true` **[da]**, `anchorMin: 4000` **[da]**, `gegenwartOut: 24` **[da]**, `cost: { fron: 0 }` **[da]**, `buildTime: 0` **[da]**, `buildList: ['bauer', 'soldat']` **[da]**, `vital: true` **[da]** | Etablierter Standard; bildet Arbeiter und die erste Verteidigungslinie aus. |
| `anker` | `grenzstein` | Grenzstein | Feste Domänenausdehnung | `hp: 800` **[da]**, `radius: 48` **[da]**, `anchor: true` **[da]**, `cost: { fron: 120 }` **[da]**, `buildTime: 150` **[da]** | Solider Steinpfeiler; dehnt das Netz sofort um 260 m Durchmesser aus. Robuster als der Hain (600 HP) oder Grabhügel (650 HP). |
| `kraft` | `schmiede` | Schmiede | Gegenwarts-Erzeugung | `hp: 900` **[da]**, `radius: 60` **[da]**, `gegenwartOut: 40` **[da]**, `cost: { fron: 280 }` **[da]**, `buildTime: 230` **[da]** | Hohe Leistungskraft für energiehungrige menschliche Schilde und Belagerungsmotoren. |
| `fron` | `saege` | Sägewerk | Fron-Förderung auf Vorkommen | `hp: 1000` **[da]**, `radius: 54` **[da]**, `needs: 'fron'` **[da]**, `gegenwartIn: 12` **[da]**, `fronOut: 540` **[da]**, `cost: { fron: 240 }` **[da]**, `buildTime: 220` **[da]** | Industrielle Standardförderung aus Fronadern. |
| `blut` | `schacht` | Tiefer Schacht | Götterblut-Förderung | `hp: 1500` **[da]**, `radius: 60` **[da]**, `needs: 'goetterblut'` **[da]**, `gegenwartIn: 16` **[da]**, `blutOut: 140` **[da]**, `cost: { fron: 350 }` **[da]**, `buildTime: 280` **[da]** | Schwer gezimmerter Förderturm mit Seilwinde. |
| `fabrik` | `kaserne` | Kaserne | Ausbildung Landstreitkräfte | `hp: 2500` **[da]**, `radius: 72` **[da]**, `gegenwartIn: 12` **[da]**, `cost: { fron: 400 }` **[da]**, `buildTime: 280` **[da]**, `buildList: ['jaeger', 'soeldner', 'katapult']` **[da]** | Zentrale Kaserne für das formierte Heer. |
| `turm` | `wachturm` | Wachturm | Boden- und Punktverteidigung | `hp: 3000` **[da]**, `radius: 40` **[da]**, `gegenwartIn: 10` **[da]**, `prio: 1` **[da]**, `cost: { fron: 300 }` **[da]**, `buildTime: 250` **[da]**, `kampf: 'fern'` **[da]**, `weapon: { range: 900, damage: 60, cooldown: 4 }` **[da]** | Hohe Treffsicherheit und Widerstandskraft; hält feindliche Sturmangriffe auf. |
| `zorn` | `banner` | Kriegsbanner | Offensive Aura | `hp: 1200` **[da]**, `radius: 40` **[da]**, `gegenwartIn: 14` **[da]**, `buff: { zorn: 200, radius: 1000 }` **[da]**, `cost: { fron: 300 }` **[da]**, `buildTime: 240` **[da]** | Inspiriert Truppen im Umkreis (+20 % Schaden). |
| `wehr` | `kapelle` | Kapelle | Defensive Aura | `hp: 1200` **[da]**, `radius: 40` **[da]**, `gegenwartIn: 14` **[da]**, `buff: { wehr: 200, radius: 1000 }` **[da]**, `cost: { fron: 300 }` **[da]**, `buildTime: 240` **[da]** | Stärkt Rüstungen und Schilde im Umkreis (-20 % erlittener Schaden). |
| `forschung` | `skriptorium` | Skriptorium | Forschung & Skilltakt | `hp: 1100` **[da]**, `radius: 50` **[da]**, `gegenwartIn: 18` **[da]**, `forschung: 350` **[da]**, `cost: { fron: 320 }` **[da]**, `buildTime: 260` **[da]** | Beschleunigt das Erlangen von Skillpunkten um 35 %. |
| `posten` | `spaehposten` | Spähposten | Weitsicht-Aufklärung | `hp: 500` **[da]**, `radius: 30` **[da]**, `sicht: 2000` **[da]**, `cost: { fron: 90 }` **[da]**, `buildTime: 120` **[da]** | Sieht 200 m weit, unabhängig von Domäne und Gegenwart. |
| `luftfabrik` | `ballonhalle` | Ballonhalle | Werft für Fluggleiter & Bomber | `hp: 2200` **[da]**, `radius: 75` **[da]**, `gegenwartIn: 14` **[da]**, `cost: { fron: 420, goetterblut: 60 }` **[da]**, `buildTime: 300` **[da]**, `buildList: ['fluggleiter', 'brandballon']` **[da]** | Eigene Produktionsstätte für Luftstreitkräfte (Mechanik M1). Montagehalle mit Kranen. |
| `flak` | `flakbatterie` | Flakbatterie | Spezialisierte Luftabwehr | `hp: 2400` **[da]**, `radius: 42` **[da]**, `gegenwartIn: 12` **[da]**, `prio: 1` **[da]**, `cost: { fron: 320, goetterblut: 40 }` **[da]**, `buildTime: 260` **[da]**, `kampf: 'fern'` **[da]**, `weapon: { range: 1100, damage: 75, cooldown: 3, ziele: 'luft' }` **[da/M1]** | Schießt nur auf Luftziele (`ziele: 'luft'`), dafür mit enormer Kadenz und Reichweite. Hält Raben, Drachen und Schwingen auf Distanz. |
| `schild` | `schildturm` | Schildturm | Schutzkuppel-Generator | `hp: 1800` **[da]**, `radius: 45` **[da]**, `gegenwartIn: 20` **[da]**, `prio: 2` **[da]**, `cost: { fron: 450, goetterblut: 80 }` **[da]**, `buildTime: 320` **[da]**, `schild: { kapazitaet: 3500, radius: 1200, laden: 25 }` **[M2]** | Fängt Schäden an eigenen Einheiten und Gebäuden im 120 m Radius ab. Größte Schildkapazität im Spiel (Menschheits-Spezialisierung). |
| `umwandler` | `aetherwandler` | Ätherwandler | Gegenwart → Fron Wandlung | `hp: 1200` **[da]**, `radius: 50` **[da]**, `gegenwartIn: 28` **[da]**, `fronOut: 360` **[da]**, `cost: { fron: 380, goetterblut: 50 }` **[da]**, `buildTime: 270` **[da]** | Ermöglicht Fron-Gewinnung ohne Rohstoffader direkt aus überschüssiger Gegenwart. |
| `werkstatt` | `grossgiesserei` | Großgießerei | Konstruktion des Prototyps | `hp: 3200` **[da]**, `radius: 80` **[da]**, `gegenwartIn: 22` **[da]**, `cost: { fron: 600, goetterblut: 150 }` **[da]**, `buildTime: 400` **[da]**, `buildList: ['dampfkoloss']` **[da]** | Schwerste Industrie-Fertigung für den Dampfkoloss (Mechanik M5). |
| `schlag` | `belagerungsmoerser` | Belagerungsmörser | Weitreichender Fernschlag | `hp: 2000` **[da]**, `radius: 55` **[da]**, `gegenwartIn: 18` **[da]**, `cost: { fron: 700, goetterblut: 250 }` **[da]**, `buildTime: 450` **[da]**, `schlag: { laden: 1200, kosten: { fron: 300, goetterblut: 100 }, reichweite: 12000, radius: 600, schaden: 3000 }` **[M4]** | Lädt 2 Minuten (1200 Ticks) auf, feuert ein gigantisches Geschoss über die halbe Karte, das 3000 Flächenschaden anrichtet. |
| `abwehr` | `abfangposten` | Abfangposten | Abfangstation für Schläge | `hp: 1600` **[da]**, `radius: 46` **[da]**, `gegenwartIn: 16` **[da]**, `cost: { fron: 450, goetterblut: 120 }` **[da]**, `buildTime: 320` **[da]**, `abwehr: { radius: 2500, laden: 600 }` **[M4]** | Fängt feindliche Fernschläge im Umkreis von 250 m automatisch ab, benötigt 60s zum Nachladen einer Abfangrakete. |

---

### 2.2 Einheiten der Basis

| Rolle | Schlüssel | Name | Zweck | Werte & Mechaniken | Begründung & Vergleich |
|---|---|---|---|---|---|
| `bauer` | `bauer` | Bauer | Erbauer & Reparatur | `hp: 180` **[da]**, `radius: 12` **[da]**, `speed: 22` **[da]**, `sicht: 900` **[da]**, `cost: { fron: 90 }` **[da]**, `unterhalt: 12` **[da]**, `buildTime: 80` **[da]**, `worker: true` **[da]**, `build: { power: 10 }` **[da]** | Standard-Arbeiter; repariert beschädigte Festungen und errichtet Bauwerke. |
| `leicht` | `soldat` | Soldat | Frühe Masse & Nahkampf | `hp: 480` **[da]**, `radius: 13` **[da]**, `speed: 22` **[da]**, `sicht: 900` **[da]**, `cost: { fron: 110 }` **[da]**, `unterhalt: 16` **[da]**, `buildTime: 100` **[da]**, `kampf: 'nah'` **[da]**, `weapon: { range: 12, damage: 16, cooldown: 10, ziele: 'boden' }` **[da/M1]** | Bildet die bewährte Schildwand der Menschen. Mehr Leben als Skelettkrieger (380 HP) oder Wolf (420 HP). |
| `fern` | `jaeger` | Jäger | Linien-Fernkampf | `hp: 280` **[da]**, `radius: 12` **[da]**, `speed: 23` **[da]**, `sicht: 900` **[da]**, `cost: { fron: 140 }` **[da]**, `unterhalt: 20` **[da]**, `buildTime: 120` **[da]**, `kampf: 'fern'` **[da]**, `weapon: { range: 500, damage: 16, cooldown: 11, ziele: 'beide' }` **[da/M1]** | Bogenschütze gegen Boden und Luft (`ziele: 'beide'`). |
| `schwer` | `soeldner` | Söldner | Schwerer Panzer-Nahkampf | `hp: 1200` **[da]**, `radius: 15` **[da]**, `speed: 17` **[da]**, `sicht: 900` **[da]**, `cost: { fron: 250, goetterblut: 70 }` **[da]**, `unterhalt: 35` **[da]**, `buildTime: 260` **[da]**, `kampf: 'nah'` **[da]**, `weapon: { range: 14, damage: 45, cooldown: 12, ziele: 'boden' }` **[da/M1]** | Gepanzertes Bollwerk. Schlägt hart zu, bewegt sich bedächtig. |
| `belagerung` | `katapult` | Katapult | Reichweiten-Artillerie | `hp: 600` **[da]**, `radius: 18` **[da]**, `speed: 14` **[da]**, `sicht: 900` **[da]**, `cost: { fron: 320, goetterblut: 90 }` **[da]**, `unterhalt: 40` **[da]**, `buildTime: 320` **[da]**, `kampf: 'fern'` **[da]**, `weapon: { range: 1200, damage: 30, cooldown: 35, gebaeude: 220, vorrang: 'gebaeude', ziele: 'boden' }` **[da/M1]** | Zerstört Befestigungen aus sicherer Entfernung jenseits der Turmreichweite (900 dm). |
| `spaeher` | `spaehposten` / `held` | (Spähposten / Fluggleiter) | Aufklärung | Gebäude `spaehposten` übernimmt die Bodenaufklärung (2000 dm Sicht). In der Luft übernimmt der Fluggleiter die Jagdaufklärung. | Entspricht der Vorgabe: Menschen besitzen keinen schwachen Raben, sondern feste Spähposten und motorisierte Fluggeräte. |
| `luftjaeger` | `fluggleiter` | Fluggleiter | Abfangjäger (Luft-Luft) | `hp: 420` **[da]**, `radius: 14` **[da]**, `speed: 34` **[da]**, `sicht: 1100` **[da]**, `fliegt: true` **[da]**, `cost: { fron: 180, goetterblut: 40 }` **[da]**, `unterhalt: 25` **[da]**, `buildTime: 160` **[da]**, `kampf: 'fern'` **[da]**, `weapon: { range: 600, damage: 28, cooldown: 8, ziele: 'luft' }` **[da/M1]** | Extrem schnell (Speed 34). Spezialisiert auf Luftziele: fängt feindliche Bomber, Aasgeier und Insektenschwärme vor den eigenen Linien ab. |
| `bomber` | `brandballon` | Brandballon | Taktischer Bomber (Luft-Boden) | `hp: 850` **[da]**, `radius: 18` **[da]**, `speed: 18` **[da]**, `sicht: 1000` **[da]**, `fliegt: true` **[da]**, `cost: { fron: 340, goetterblut: 90 }` **[da]**, `unterhalt: 45` **[da]**, `buildTime: 300` **[da]**, `kampf: 'fern'` **[da]**, `weapon: { range: 250, damage: 80, cooldown: 25, gebaeude: 160, ziele: 'boden' }` **[da/M1]**, `flaechenschaden: { radius: 180, anteil: 600 }` **[M3]** | Zähes Starrluftschiff. Wirft Brandbomben auf Ansammlungen und Gebäude ab. Hohe Trefferwirkung, verwundbar durch Flak. |
| `prototyp` | `dampfkoloss` | Dampfkoloss | Titanischer Belagerungs-Mech | `hp: 8500` **[da]**, `radius: 28` **[da]**, `speed: 15` **[da]**, `sicht: 1200` **[da]**, `hoechstens: 1` **[M5]**, `cost: { fron: 1800, goetterblut: 600 }` **[da]**, `unterhalt: 120` **[da]**, `buildTime: 800` **[da]**, `kampf: 'fern'` **[da]**, `weapon: { range: 1000, damage: 180, cooldown: 20, gebaeude: 650, ziele: 'beide' }` **[da/M1]**, `flaechenschaden: { radius: 240, anteil: 500 }` **[M3]** | Einzigartiger Prototyp der Menschen. Dampfgetriebenes Monstrum auf zwei Schreitbeinen. Zwillings-Marinekanonen brechen Verteidigungslinien im Alleingang; kann nur einmal gleichzeitig existieren (`hoechstens: 1`). |

---

## 3. Der große Technologie-Baum (28 Knoten)

Der Baum ist in 4 spezialisierte Äste zu je 7 Knoten gegliedert. Er verbindet existierende Basisskills mit den neuen Einheiten, Gebäuden und gezielten Verbesserungen.

```
       [AST 1: EINHEITEN]          [AST 2: GEBÄUDE]          [AST 3: VERBESSERUNGEN]      [AST 4: KOMMANDANT]
              │                            │                            │                          │
       (1. bogenbau)                (1. kriegsbanner)             (1. klingen)               (1. heldenmut)
              │                            │                            │                          │
       (2. soeldnervertraege)       (2. kapellenbau)              (2. kettenhemden)          (2. schlachtruf)
              │                            │                            │                          │
       (3. belagerungsbau)          (3. fronvoegte)               (3. drillmeister)          (3. schildwall)
              │                            │                            │                          │
       (4. luftfahrt) [M1]          (4. aetherdestillation) [da]  (4. sold)                  (4. ansturm)
              │                            │                            │                          │
       (5. brandmunition) [M1]      (5. schildgeneratoren) [M2]   (5. flakoptik) [M6]        (5. feldapotheke) [M3]
              │                            │                            │                          │
       (6. verbundpanzerung) [M6]   (6. belagerungsartillerie)[M4](6. schildkondensator) [M6](6. ruestungsmeister)[M6]
              │                            │                            │                          │
       (7. dampfkoloss) [M5]        (7. raketenabfang) [M4]       (7. feuerleitsystem) [M6]  (7. koenigsbefehl) [da]
```

### Ast 1: Einheiten (Militärische Freischaltungen & Truppen)

1. **`bogenbau`** **[da]**
   * **Kosten**: 1 **[da]** | **Braucht**: — **[da]**
   * **Frei**: `['jaeger']` **[da]**
   * **Beschreibung**: Schaltet den Bau von Jägern in der Kaserne frei.
2. **`soeldnervertraege`** **[da]**
   * **Kosten**: 1 **[da]** | **Braucht**: `['bogenbau']` **[da]**
   * **Frei**: `['soeldner']` **[da]**
   * **Beschreibung**: Erlaubt die Anwerbung schwer gepanzerter Söldner gegen Fron und Götterblut.
3. **`belagerungsbau`** **[da]**
   * **Kosten**: 1 **[da]** | **Braucht**: `['soeldnervertraege']` **[da]**
   * **Frei**: `['katapult']` **[da]**
   * **Beschreibung**: Ermöglicht den Bau schwerer Belagerungskatapulte zur Schleifung feindlicher Stellungen.
4. **`luftfahrt`** **[M1]**
   * **Kosten**: 2 **[da]** | **Braucht**: `['belagerungsbau']` **[da]**
   * **Frei**: `['ballonhalle', 'fluggleiter']` **[da/M1]**
   * **Beschreibung**: Schaltet die Ballonhalle und die Ausbildung schneller Fluggleiter frei.
5. **`brandmunition`** **[M1]**
   * **Kosten**: 2 **[da]** | **Braucht**: `['luftfahrt']` **[da]**
   * **Frei**: `['brandballon']` **[da/M1]**
   * **Beschreibung**: Rüstet Starrluftschiffe mit Brandbomben aus; schaltet den Brandballon frei.
6. **`verbundpanzerung`** **[M6]**
   * **Kosten**: 2 **[da]** | **Braucht**: `['brandmunition']` **[da]**
   * **Wirkung**: `{ schutz: 150 }` **[da]**, `nur: ['soeldner', 'brandballon']` **[M6]**
   * **Beschreibung**: Verstärkt Söldner und Ballone mit gehärteten Stahlplatten (+15 % Rüstungsschutz).
7. **`dampfkoloss`** **[M5]**
   * **Kosten**: 3 **[da]** | **Braucht**: `['verbundpanzerung']` **[da]**
   * **Frei**: `['grossgiesserei', 'dampfkoloss']` **[da/M5]**
   * **Beschreibung**: Erschließt den Bau der Großgießerei und die Konstruktion des legendären Dampfkolosses.

### Ast 2: Gebäude (Infrastruktur & Verteidigungswerke)

1. **`kriegsbanner`** **[da]**
   * **Kosten**: 1 **[da]** | **Braucht**: — **[da]**
   * **Frei**: `['banner']` **[da]**
   * **Beschreibung**: Schaltet das Kriegsbanner frei, das verbündete Einheiten im Umkreis anspornt (+20 % Schaden).
2. **`kapellenbau`** **[da]**
   * **Kosten**: 1 **[da]** | **Braucht**: `['kriegsbanner']` **[da]**
   * **Frei**: `['kapelle']` **[da]**
   * **Beschreibung**: Erlaubt die Errichtung von Kapellen zur Segnung der Rüstung (-20 % Schaden).
3. **`fronvoegte`** **[da]**
   * **Kosten**: 1 **[da]** | **Braucht**: `['kapellenbau']` **[da]**
   * **Wirkung**: `{ foerderung: 200 }` **[da]**
   * **Beschreibung**: Straffere Aufsicht im Sägewerk und Schacht steigert den Rohstoffertrag um 20 %.
4. **`aetherdestillation`** **[da]**
   * **Kosten**: 2 **[da]** | **Braucht**: `['fronvoegte']` **[da]**
   * **Frei**: `['aetherwandler']` **[da]**
   * **Beschreibung**: Schaltet den Ätherwandler frei, um Gegenwart direkt in Fron umzuwandeln.
5. **`schildgeneratoren`** **[M2]**
   * **Kosten**: 2 **[da]** | **Braucht**: `['aetherdestillation']` **[da]**
   * **Frei**: `['schildturm', 'flakbatterie']` **[da/M1/M2]**
   * **Beschreibung**: Schaltet den Bau von Schildtürmen und automatischen Flakbatterien frei.
6. **`belagerungsartillerie`** **[M4]**
   * **Kosten**: 2 **[da]** | **Braucht**: `['schildgeneratoren']` **[da]**
   * **Frei**: `['belagerungsmoerser']` **[da/M4]**
   * **Beschreibung**: Ermöglicht den Bau des Belagerungsmörsers für weitreichende Flächenschläge.
7. **`raketenabfang`** **[M4]**
   * **Kosten**: 3 **[da]** | **Braucht**: `['belagerungsartillerie']` **[da]**
   * **Frei**: `['abfangposten']` **[da/M4]**
   * **Beschreibung**: Erlaubt den Bau von Abfangposten zur Neutralisierung feindlicher Fernschläge.

### Ast 3: Verbesserungen (Technologische Veredelung)

1. **`klingen`** **[da]**
   * **Kosten**: 1 **[da]** | **Braucht**: — **[da]**
   * **Wirkung**: `{ schaden: 150 }` **[da]**
   * **Beschreibung**: Gehärteter Stahl erhöht den ausgeteilten Schaden aller Einheiten um 15 %.
2. **`kettenhemden`** **[da]**
   * **Kosten**: 1 **[da]** | **Braucht**: `['klingen']` **[da]**
   * **Wirkung**: `{ schutz: 150 }` **[da]**
   * **Beschreibung**: Dichte Ringpanzerung senkt den erlittenen Schaden aller Einheiten um 15 %.
3. **`drillmeister`** **[da]**
   * **Kosten**: 1 **[da]** | **Braucht**: `['kettenhemden']` **[da]**
   * **Wirkung**: `{ ausbildung: 250 }` **[da]**
   * **Beschreibung**: Straffer Exerzierdienst beschleunigt die Ausbildung in Kasernen und Werften um 25 %.
4. **`sold`** **[da]**
   * **Kosten**: 1 **[da]** | **Braucht**: `['drillmeister']` **[da]**
   * **Wirkung**: `{ unterhalt: 200 }` **[da]**
   * **Beschreibung**: Effizientere Proviantlogistik senkt den Fron-Unterhalt aller Einheiten um 20 %.
5. **`flakoptik`** **[M6]**
   * **Kosten**: 2 **[da]** | **Braucht**: `['sold']` **[da]**
   * **Wirkung**: `{ reichweite: 200 }` **[M6]**, `nur: ['flakbatterie', 'wachturm']` **[M6]**
   * **Beschreibung**: Feinmechanische Zielfernrohre erhöhen die Schussreichweite von Wachtürmen und Flakbatterien um 20 %.
6. **`schildkondensator`** **[M6]**
   * **Kosten**: 2 **[da]** | **Braucht**: `['flakoptik']` **[da]**
   * **Wirkung**: `{ schutz: 200 }` **[da]**, `nur: ['schildturm']` **[M6]**
   * **Beschreibung**: Steigert die Schildregenerationsrate und Schildstärke des Schildturms um 20 %.
7. **`feuerleitsystem`** **[M6]**
   * **Kosten**: 3 **[da]** | **Braucht**: `['schildkondensator']` **[da]**
   * **Wirkung**: `{ schaden: 200 }` **[da]**, `nur: ['katapult', 'belagerungsmoerser', 'dampfkoloss']` **[M6]**
   * **Beschreibung**: Kartographische Triangulation steigert den Schaden aller Belagerungswaffen um weitere 20 %.

### Ast 4: Kommandant (Der Königliche Feldherr)

1. **`heldenmut`** **[da]**
   * **Kosten**: 1 **[da]** | **Braucht**: — **[da]**
   * **Wirkung**: `{ kdtSchutz: 250 }` **[da]**
   * **Beschreibung**: Stählt die Lebenskraft und Rüstung des Helden (-25 % erlittener Schaden).
2. **`schlachtruf`** **[da]**
   * **Kosten**: 1 **[da]** | **Braucht**: `['heldenmut']` **[da]**
   * **Fähigkeit**: `schlachtruf` **[da]** (Taste Q)
   * **Beschreibung**: Schaltet die aktive Fähigkeit frei: Erhöht den Schaden eigener Truppen im Umkreis von 60 m 15 Sekunden lang um 35 % (Cooldown 45s).
3. **`schildwall`** **[da]**
   * **Kosten**: 1 **[da]** | **Braucht**: `['schlachtruf']` **[da]**
   * **Fähigkeit**: `schildwall` **[da]** (Taste W)
   * **Beschreibung**: Schaltet die aktive Fähigkeit frei: Senkt den erlittenen Schaden verbündeter Truppen im Umkreis von 60 m 15 Sekunden lang um 35 % (Cooldown 60s).
4. **`ansturm`** **[da]**
   * **Kosten**: 1 **[da]** | **Braucht**: `['schildwall']` **[da]**
   * **Fähigkeit**: `ansturm` **[da]** (Taste E)
   * **Beschreibung**: Schaltet die aktive Fähigkeit frei: Verleiht eigenen Einheiten im Umkreis von 60 m einen Temposchub von +40 % für 8 Sekunden (Cooldown 40s).
5. **`feldapotheke`** **[M3]**
   * **Kosten**: 2 **[da]** | **Braucht**: `['ansturm']` **[da]**
   * **Wirkung**: `{ aura: { heilung: 120, radius: 600 } }` **[M3]**
   * **Beschreibung**: Der Held erhält eine ständige Heilaura: Regeneriert verbündete Einheiten in seiner Nähe mit 120 LP/min.
6. **`ruestungsmeister`** **[M6]**
   * **Kosten**: 2 **[da]** | **Braucht**: `['feldapotheke']` **[da]**
   * **Wirkung**: `{ baukraft: 500 }` **[M6]**, `nur: ['held', 'bauer']` **[M6]**
   * **Beschreibung**: Verdoppelt die Baukraft des Helden und erhöht die Reparaturgeschwindigkeit um 50 %.
7. **`koenigsbefehl`** **[da]**
   * **Kosten**: 3 **[da]** | **Braucht**: `['ruestungsmeister']` **[da]**
   * **Wirkung**: `{ schaden: 100, schutz: 100 }` **[da]**
   * **Beschreibung**: Der persönliche Befehl des Königs beflügelt das gesamte Heer dauerhaft mit +10 % Schaden und +10 % Schutz.
