# Inhaltsentwurf: Todesgott (Das Totenreich)

Stand: 12. Oktober 2026  
Status: **Entwurf (Paket G2)** zur Prüfung und Abnahme durch den Nutzer.  
Regelprüfung: Alle Felder sind strikt annotiert mit **[da]** (in `FELDER` vorhanden) oder **[Mx]** (geplante Mechanik aus `docs/umbau/konzept.md`).

---

## 1. Volksübersicht & Identität

* **Volksschlüssel**: `tod` **[da]**
* **Name**: `Todesgott` **[da]** (Das Totenreich)
* **Farbe**: `#a9c4e0` **[da]** (Kaltes Knochen-Blau / Geisterfrost, mit Knochenweiß `#f8fafc` und Seelenfeuer `#38bdf8`)
* **Domäne**: Seelen- & Friedhofsboden (`growth: { start: 1400, max: 5000, perTick: 0, perTod: 180 }` **[da]**). Die Domäne wächst nicht passiv über die Zeit, sondern dehnt sich durch jeden Gefallenen (Freund oder Feind) im Umkreis um `perTod: 180` dm aus. Stirbt niemand, stagniert das Reich; toben blutige Schlachten, verschlingt der Todesboden in rasantem Tempo die Karte.
* **Kommandant**: `todesgott` **[da]** (Düsterer Schnitter mit Sense, weißgebleichter Totenkopfmaske, fließendem Obsidian-Gewand und eisig blauem Seelenfeuer)
* **Hauptgebäude**: `nekropole` **[da]** (Monumentales Gruftmonument mit Knochenobelisken)
* **Wesenszug & Spezialisierung**: Kälte, Nekromantie, Knochenarchitektur, Auszehrung und Schwarmtaktik. Das Totenreich wirft zahllose billige Skelettkrieger ins Gefecht, fängt gegnerische Fernschläge durch geisterhafte Schattenschirme ab und entfesselt mit dem Seuchenmörser verheerende Giftwolken.
* **Spielgefühl**: Unausweichlich, bedrohlich und zehrend. Das Totenreich profitiert von Verlusten, nutzt Opfer als Expansionsmotor und überrollt den Feind mit endlosen Skelettkolonnen, unterstützt von Klageweibern, Knochentitanen und dem gewaltigen Knochendrachen.

---

## 2. Die gemeinsame Basis (Rollen-Besetzung)

Jede Rolle aus der gemeinsamen Basis wird vom Totenreich mit einem maßgeschneiderten Gebäude bzw. einer Einheit ausgefüllt.

### 2.1 Gebäude der Basis

| Rolle | Schlüssel | Name | Zweck | Werte & Mechaniken | Begründung & Vergleich |
|---|---|---|---|---|---|
| `haupt` | `nekropole` | Nekropole | Hauptgebäude, Ausbildungsstätte | `hp: 5000` **[da]**, `radius: 90` **[da]**, `anchor: true` **[da]**, `anchorMin: 4000` **[da]**, `gegenwartOut: 24` **[da]**, `cost: { fron: 0 }` **[da]**, `buildTime: 0` **[da]**, `buildList: ['totengraeber', 'skelettkrieger', 'aasgeier']` **[da]**, `vital: true` **[da]` | Etablierter Standard; bildet Totengräber, Skelettkrieger und Aasgeier aus. |
| `anker` | `grabhuegel` | Grabhügel | Todbasiertes Domänenwachstum | `hp: 650` **[da]**, `radius: 48` **[da]**, `anchor: true` **[da]**, `cost: { fron: 115 }` **[da]**, `buildTime: 160` **[da]** | Startet bei 140 m Radius (`growth.start`), dehnt sich mit jedem Gefallenen um 18 m weiter aus bis 500 m. |
| `kraft` | `seelenbrunnen` | Seelenbrunnen | Gegenwarts-Erzeugung | `hp: 800` **[da]**, `radius: 60` **[da]**, `gegenwartOut: 40` **[da]**, `cost: { fron: 280 }` **[da]**, `buildTime: 230` **[da]** | Speist ätherische Seelenenergie in die Domäne ein. |
| `fron` | `knochenmuehle` | Knochenmühle | Fron-Förderung auf Vorkommen | `hp: 700` **[da]**, `radius: 55` **[da]**, `needs: 'fron'` **[da]**, `gegenwartIn: 14` **[da]**, `fronOut: 360` **[da]**, `cost: { fron: 150 }` **[da]**, `buildTime: 170` **[da]** | Mahlt Knochen und Fels zu verwertbarem Fron. Sehr günstig im Bau. |
| `blut` | `fleischwurz` | Fleischwurz | Götterblut-Förderung | `hp: 900` **[da]**, `radius: 60` **[da]**, `needs: 'goetterblut'` **[da]**, `gegenwartIn: 20` **[da]**, `blutOut: 40` **[da]**, `cost: { fron: 250 }` **[da]**, `buildTime: 210` **[da]** | Wuchernde organische Ader, die Götterblut aus dem Untergrund saugt. |
| `fabrik` | `katakombe` | Katakombe | Ausbildung Landstreitkräfte | `hp: 1500` **[da]**, `radius: 80` **[da]**, `gegenwartIn: 55` **[da]**, `cost: { fron: 400 }` **[da]**, `buildTime: 340` **[da]**, `buildList: ['skelettkrieger', 'klageweib', 'grabwaechter', 'knochentitan']` **[da]** | Ruft Ruhelose und Konstrukte aus den Tiefen der Grüfte. |
| `turm` | `knochenturm` | Knochenturm | Boden- und Punktverteidigung | `hp: 3000` **[da]**, `radius: 40` **[da]**, `gegenwartIn: 10` **[da]**, `prio: 1` **[da]**, `cost: { fron: 300 }` **[da]**, `buildTime: 250` **[da]**, `kampf: 'fern'` **[da]**, `weapon: { range: 900, damage: 60, cooldown: 4 }` **[da]** | Schleudert verfluchte Knochenspeere mit hoher Frequenz auf Angreifer. |
| `zorn` | `pestaltar` | Pestaltar | Offensive Aura | `hp: 600` **[da]**, `radius: 40` **[da]**, `gegenwartIn: 15` **[da]**, `buff: { zorn: 300, radius: 3000 }` **[da]**, `cost: { fron: 160 }` **[da]**, `buildTime: 170` **[da]** | Erhöht den Schaden befreundeter Einheiten im Umkreis um 30 %. |
| `wehr` | `ossuarium` | Ossuarium | Defensive Aura | `hp: 700` **[da]**, `radius: 50` **[da]**, `gegenwartIn: 15` **[da]**, `buff: { wehr: 250, radius: 3000 }` **[da]**, `cost: { fron: 160 }` **[da]**, `buildTime: 170` **[da]** | Reduziert den erlittenen Schaden befreundeter Einheiten um 25 %. |
| `forschung` | `totenarchiv` | Totenarchiv | Forschung & Skilltakt | `hp: 900` **[da]**, `radius: 55` **[da]**, `gegenwartIn: 20` **[da]**, `forschung: 500` **[da]**, `cost: { fron: 250 }` **[da]**, `buildTime: 230` **[da]** | Gewährt 50 % schnellere Skillpunkte durch das uralte Wissen der Ahnen. |
| `posten` | `geisterturm` | Geisterturm | Weitsicht-Aufklärung | `hp: 450` **[da]**, `radius: 28` **[da]**, `sicht: 2100` **[da]**, `cost: { fron: 85 }` **[da]**, `buildTime: 110` **[da]** | Schmaler Knochenturm mit schwebendem Geisterfeuer; deckt 210 m weite Zonen auf. |
| `luftfabrik` | `knochenhorst` | Knochenhorst | Werft für Flugeinheiten | `hp: 2000` **[da]**, `radius: 72` **[da]**, `gegenwartIn: 15` **[da]**, `cost: { fron: 400, goetterblut: 50 }` **[da]**, `buildTime: 290` **[da]**, `buildList: ['schattenflieger', 'pestschwinge']` **[da]** | Aus Knochenrippen erbauter Nistplatz für Flugsaurier und Schattenwesen (Mechanik M1). |
| `flak` | `seelenspeier` | Seelenspeier | Spezialisierte Luftabwehr | `hp: 2300` **[da]**, `radius: 40` **[da]**, `gegenwartIn: 12` **[da]**, `prio: 1` **[da]**, `cost: { fron: 310, goetterblut: 40 }` **[da]**, `buildTime: 250` **[da]**, `kampf: 'fern'` **[da]**, `weapon: { range: 1150, damage: 70, cooldown: 3, ziele: 'luft' }` **[da/M1]** | Feuert zielsuchende Geisterschädel exklusiv gegen fliegende Feinde. Höchste Flak-Reichweite. |
| `schild` | `seelenkuppel` | Seelenkuppel | Schutzkuppel-Generator | `hp: 1700` **[da]**, `radius: 44` **[da]**, `gegenwartIn: 18` **[da]**, `prio: 2` **[da]**, `cost: { fron: 420, goetterblut: 70 }` **[da]**, `buildTime: 310` **[da]**, `schild: { kapazitaet: 2800, radius: 1100, laden: 30 }` **[M2]** | Erzeugt eine ätherisch blaue Seelenbarriere, die sich sehr schnell regeneriert (+30/Tick). |
| `umwandler` | `entropieofen` | Entropieofen | Gegenwart → Fron Wandlung | `hp: 1100` **[da]**, `radius: 48` **[da]**, `gegenwartIn: 26` **[da]**, `fronOut: 380` **[da]**, `cost: { fron: 360, goetterblut: 45 }` **[da]**, `buildTime: 260` **[da]** | Verbrennt ruhelose Seelen und Gegenwart zu Knochenstaub-Fron. |
| `werkstatt` | `fossilienwerk` | Fossilienwerk | Konstruktion des Prototyps | `hp: 3000` **[da]**, `radius: 78` **[da]**, `gegenwartIn: 24` **[da]**, `cost: { fron: 580, goetterblut: 160 }` **[da]**, `buildTime: 390` **[da]**, `buildList: ['knochendrache']` **[da]** | Monumentale Knochenschmiede zur Erweckung des Knochendrachen (Mechanik M5). |
| `schlag` | `seuchenmoerser` | Seuchenmörser | Weitreichender Fernschlag | `hp: 1900` **[da]**, `radius: 52` **[da]**, `gegenwartIn: 20` **[da]**, `cost: { fron: 680, goetterblut: 260 }` **[da]**, `buildTime: 440` **[da]**, `schlag: { laden: 1150, kosten: { fron: 280, goetterblut: 110 }, reichweite: 11500, radius: 750, schaden: 2600 }` **[M4]** | Katapultiert gigantische Seuchenfässer über 115 m Distanz mit gewaltigem Wirkungsradius (75 m). |
| `abwehr` | `schattenschirm` | Schattenschirm | Abfangstation für Schläge | `hp: 1550` **[da]**, `radius: 44` **[da]**, `gegenwartIn: 15` **[da]**, `cost: { fron: 430, goetterblut: 110 }` **[da]**, `buildTime: 310` **[da]**, `abwehr: { radius: 2400, laden: 580 }` **[M4]** | Zieht herannahende Bombardements in einen astralen Mahlstrom und neutralisiert sie. |

---

### 2.2 Einheiten der Basis

| Rolle | Schlüssel | Name | Zweck | Werte & Mechaniken | Begründung & Vergleich |
|---|---|---|---|---|---|
| `bauer` | `totengraeber` | Totengräber | Erbauer & Reparatur | `hp: 200` **[da]**, `radius: 24` **[da]**, `speed: 28` **[da]**, `sicht: 900` **[da]**, `cost: { fron: 50 }` **[da]**, `unterhalt: 5` **[da]**, `buildTime: 90` **[da]**, `worker: true` **[da]**, `build: { power: 500 }` **[da]**, `kampf: 'nah'` **[da]**, `weapon: { range: 20, damage: 6, cooldown: 7 }` **[da]** | Sehr agiler Arbeiter, der Schaufeln und Knochenwerkzeuge nutzt. Kann außerhalb der Domäne bauen. |
| `leicht` | `skelettkrieger` | Skelettkrieger | Frühe Masse & Nahkampf | `hp: 180` **[da]**, `radius: 25` **[da]**, `speed: 31` **[da]**, `sicht: 900` **[da]**, `cost: { fron: 45 }` **[da]**, `unterhalt: 7` **[da]**, `buildTime: 70` **[da]**, `kampf: 'nah'` **[da]**, `weapon: { range: 20, damage: 9, cooldown: 6, ziele: 'boden' }` **[da/M1]** | Schnellste und günstigste Standardeinheit (45 Fron). Perfekt für stetigen Druck und Überzahl. |
| `fern` | `klageweib` | Klageweib | Linien-Fernkampf | `hp: 220` **[da]**, `radius: 26` **[da]**, `speed: 27` **[da]**, `sicht: 900` **[da]**, `cost: { fron: 70 }` **[da]**, `unterhalt: 10` **[da]**, `buildTime: 120` **[da]**, `kampf: 'fern'` **[da]**, `weapon: { range: 460, damage: 15, cooldown: 7, ziele: 'beide' }` **[da/M1]** | Ätherischer Schrei trifft Boden- und Lufteinheiten (`ziele: 'beide'`). Hohe Feuerrate (Cooldown 7). |
| `schwer` | `grabwaechter` | Grabwächter | Schwerer Panzer-Nahkampf | `hp: 850` **[da]**, `radius: 34` **[da]**, `speed: 22` **[da]**, `sicht: 900` **[da]**, `cost: { fron: 160, goetterblut: 12 }` **[da]**, `unterhalt: 22` **[da]**, `buildTime: 230` **[da]**, `kampf: 'nah'` **[da]**, `weapon: { range: 28, damage: 32, cooldown: 8, ziele: 'boden' }` **[da/M1]** | Obsidianverstärkter Wächter. Extrem zäh und wuchtig. |
| `belagerung` | `knochentitan` | Knochentitan | Belagerungs-Nahkampf | `hp: 1800` **[da]**, `radius: 52` **[da]**, `speed: 14` **[da]**, `sicht: 700` **[da]**, `cost: { fron: 270 }` **[da]**, `unterhalt: 30` **[da]**, `buildTime: 310` **[da]**, `kampf: 'nah'` **[da]**, `weapon: { range: 32, damage: 14, cooldown: 10, gebaeude: 250, vorrang: 'gebaeude', ziele: 'boden' }` **[da/M1]** | Kolossaler Knochengolem, der Mauern und Gebäude mit massiven Rammschlägen (250 Schaden) einreißt. |
| `spaeher` | `aasgeier` | Aasgeier | Luftaufklärung | `hp: 8` **[da]**, `radius: 12` **[da]**, `speed: 50` **[da]**, `sicht: 1000` **[da]**, `cost: { fron: 35 }` **[da]**, `unterhalt: 2` **[da]**, `buildTime: 60` **[da]**, `fliegt: true` **[da]** | Fliegt über jedes Terrain hinweg, extrem schnell (Speed 50), stirbt bei Feindkontakt sofort. |
| `luftjaeger` | `schattenflieger` | Schattenflieger | Luftüberlegenheit | `hp: 420` **[da]**, `radius: 20` **[da]**, `speed: 46` **[da]**, `sicht: 1100` **[da]**, `cost: { fron: 190, goetterblut: 45 }` **[da]**, `unterhalt: 22` **[da]**, `buildTime: 170` **[da]**, `fliegt: true` **[da/M1]**, `kampf: 'fern'` **[da]**, `weapon: { range: 500, damage: 32, cooldown: 6, ziele: 'luft' }` **[da/M1]** | Geisterhafter Jäger aus Fledermausschwingen und Knochen. Fängt Hornissenschwärme und Fluggleiter im Luftraum ab. |
| `bomber` | `pestschwinge` | Pestschwinge | Luft-Boden-Bombardierung | `hp: 680` **[da]**, `radius: 24` **[da]**, `speed: 34` **[da]**, `sicht: 1000` **[da]**, `cost: { fron: 280, goetterblut: 75 }` **[da]**, `unterhalt: 34` **[da]**, `buildTime: 240` **[da]**, `fliegt: true` **[da/M1]**, `kampf: 'fern'` **[da]**, `weapon: { range: 180, damage: 60, cooldown: 18, gebaeude: 160, vorrang: 'gebaeude', ziele: 'boden' }` **[da/M1]** | Lässt Fäulnisbomben auf gegnerische Befestigungen und Infanterieansammlungen herabregnen. |
| `prototyp` | `knochendrache` | Knochendrache | Fliegender Apex-Prädator | `hp: 4600` **[da]**, `radius: 50` **[da]**, `speed: 28` **[da]**, `sicht: 1200` **[da]**, `cost: { fron: 1100, goetterblut: 420 }` **[da]**, `unterhalt: 110` **[da]**, `buildTime: 550` **[da]**, `fliegt: true` **[da/M1]**, `prototyp: true` **[M5]**, `maxBau: 1` **[M5]**, `kampf: 'fern'` **[da]**, `weapon: { range: 600, damage: 130, cooldown: 12, gebaeude: 260, ziele: 'beide' }` **[da/M1]** | Einziger fliegender Prototyp im Spiel. Speit verheerenden Frost- und Geisteratem gegen Land- und Luftziele (`ziele: 'beide'`). Kann Schluchten und Flüsse mühelos überqueren. |

---

## 3. Der große Technologie-Baum (28 Knoten)

Der Totenreich-Baum fokussiert sich auf Massenerweckung, Seelenwandlung, Fäulnis/Gift und die Macht des Todesgottes.

```
       [AST 1: EINHEITEN]          [AST 2: GEBÄUDE]          [AST 3: VERBESSERUNGEN]      [AST 4: KOMMANDANT]
              │                            │                            │                          │
       (1. klageweiber)             (1. pestweihe)               (1. pestodem)              (1. nekromantie)
              │                            │                            │                          │
       (2. grabwaechterweihe)       (2. beinhaus)                (2. knochenhaertung)       (2. grabeskaelte)
              │                            │                            │                          │
       (3. titanenform)             (3. seelenernte)             (3. grabeskuehle)          (3. seelenrausch)
              │                            │                            │                          │
       (4. schattenfluegel) [M1]    (4. entropiewandlung) [da]   (4. ewigerDienst)          (4. knochensturm)
              │                            │                            │                          │
       (5. pestschwingenbrut) [M1]  (5. schattenkuppel) [M2]     (5. verwesungsaura) [M6]   (5. todesblick) [M3]
              │                            │                            │                          │
       (6. ewige_knochen) [M6]      (6. seuchenkatapult) [M4]    (6. seelenzehrung) [M6]    (6. seelenfresser) [M6]
              │                            │                            │                          │
       (7. knochendrache) [M5]      (7. schattensphaere) [M4]    (7. todeshauch) [M6]       (7. avatar_des_todes) [da]
```

### Ast 1: Einheiten (Untote & Seelenschwingen)

1. **`klageweiber`** **[da]**
   * **Kosten**: 1 **[da]** | **Braucht**: — **[da]**
   * **Frei**: `['klageweib']` **[da]**
   * **Beschreibung**: Erweckt Klageweiber in den Katakomben für magischen Distanzschaden.
2. **`grabwaechterweihe`** **[da]**
   * **Kosten**: 2 **[da]** | **Braucht**: `['klageweiber']` **[da]**
   * **Frei**: `['grabwaechter']` **[da]**
   * **Beschreibung**: Schaltet gepanzerte Grabwächter aus geschwärztem Knochen und Obsidian frei.
3. **`titanenform`** **[da]**
   * **Kosten**: 2 **[da]** | **Braucht**: `['grabwaechterweihe']` **[da]**
   * **Frei**: `['knochentitan']` **[da]**
   * **Beschreibung**: Ermöglicht den Bau des gewaltigen Knochentitans zur Belagerung feindlicher Basen.
4. **`schattenfluegel`** **[M1]**
   * **Kosten**: 2 **[da]** | **Braucht**: `['titanenform']` **[da]**
   * **Frei**: `['knochenhorst', 'schattenflieger']` **[da/M1]**
   * **Beschreibung**: Errichtet den Knochenhorst und ruft lautlose Schattenflieger zur Jagd auf feindliche Flieger.
5. **`pestschwingenbrut`** **[M1]**
   * **Kosten**: 2 **[da]** | **Braucht**: `['schattenfluegel']` **[da]**
   * **Frei**: `['pestschwinge']` **[da/M1]**
   * **Beschreibung**: Züchtet schwere Pestschwingen zum Bombardement feindlicher Verteidigungslinien.
6. **`ewige_knochen`** **[M6]**
   * **Kosten**: 2 **[da]** | **Braucht**: `['pestschwingenbrut']` **[da]**
   * **Wirkung**: `{ schutz: 200 }` **[da]**, `nur: ['skelettkrieger', 'grabwaechter']` **[M6]**
   * **Beschreibung**: Magisch gehärtete Gebeine verleihen Skelettkriegern und Grabwächtern +20 % Rüstungsschutz.
7. **`knochendrache`** **[M5]**
   * **Kosten**: 3 **[da]** | **Braucht**: `['ewige_knochen']` **[da]**
   * **Frei**: `['fossilienwerk', 'knochendrache']` **[da/M5]**
   * **Beschreibung**: Schaltet das Fossilienwerk frei und erweckt den furchterregenden Knochendrachen.

---

### Ast 2: Gebäude (Krypten & Seelenbauten)

1. **`pestweihe`** **[da]**
   * **Kosten**: 1 **[da]** | **Braucht**: — **[da]**
   * **Frei**: `['pestaltar']` **[da]**
   * **Beschreibung**: Erlaubt den Bau des Pestaltars (+30 % Schaden im 300 m Umkreis).
2. **`beinhaus`** **[da]**
   * **Kosten**: 1 **[da]** | **Braucht**: `['pestweihe']` **[da]**
   * **Frei**: `['ossuarium']` **[da]**
   * **Beschreibung**: Schaltet das Ossuarium frei (-25 % erlittener Schaden für Verbündete).
3. **`seelenernte`** **[da]**
   * **Kosten**: 1 **[da]** | **Braucht**: `['beinhaus']` **[da]**
   * **Wirkung**: `{ foerderung: 200 }` **[da]**
   * **Beschreibung**: Erhöht den Förderertrag von Knochenmühlen und Fleischwurzeln um 20 %.
4. **`entropiewandlung`** **[da]**
   * **Kosten**: 2 **[da]** | **Braucht**: `['seelenernte']` **[da]**
   * **Frei**: `['entropieofen']` **[da]**
   * **Beschreibung**: Ermöglicht den Bau des Entropieofens zur Wandlung von überschüssiger Gegenwart in Fron.
5. **`schattenkuppel`** **[M2]**
   * **Kosten**: 2 **[da]** | **Braucht**: `['entropiewandlung']` **[da]**
   * **Frei**: `['seelenkuppel', 'seelenspeier']` **[da/M1/M2]**
   * **Beschreibung**: Schaltet die Seelenkuppel (Schutzschirm) und Seelenspeier (Flak) frei.
6. **`seuchenkatapult`** **[M4]**
   * **Kosten**: 3 **[da]** | **Braucht**: `['schattenkuppel']` **[da]**
   * **Frei**: `['seuchenmoerser']` **[da/M4]**
   * **Beschreibung**: Schaltet den Seuchenmörser für globale Bombardements über enorme Distanzen frei.
7. **`schattensphaere`** **[M4]**
   * **Kosten**: 2 **[da]** | **Braucht**: `['seuchenkatapult']` **[da]**
   * **Frei**: `['schattenschirm']` **[da/M4]**
   * **Beschreibung**: Errichtet Schattenschirme zum Abfangen feindlicher Fernschläge.

---

### Ast 3: Verbesserungen (Verwesung & Nekromantische Macht)

1. **`pestodem`** **[da]**
   * **Kosten**: 1 **[da]** | **Braucht**: — **[da]**
   * **Wirkung**: `{ schaden: 100 }` **[da]**
   * **Beschreibung**: Giftige Klingen und Klauen steigern den Angriffsschaden aller Einheiten um 10 %.
2. **`knochenhaertung`** **[da]**
   * **Kosten**: 1 **[da]** | **Braucht**: `['pestodem']` **[da]**
   * **Wirkung**: `{ schutz: 100 }` **[da]**
   * **Beschreibung**: Versteinerte Knochenstrukturen senken den erlittenen Schaden aller Einheiten um 10 %.
3. **`grabeskuehle`** **[da]**
   * **Kosten**: 1 **[da]** | **Braucht**: `['knochenhaertung']` **[da]**
   * **Wirkung**: `{ ausbildung: 250 }` **[da]**
   * **Beschreibung**: Die Toten steigen um 25 % schneller aus ihren Grabstätten empor.
4. **`ewigerDienst`** **[da]**
   * **Kosten**: 2 **[da]** | **Braucht**: `['grabeskuehle']` **[da]**
   * **Wirkung**: `{ unterhalt: 250 }` **[da]**
   * **Beschreibung**: Tote fordern keine Nahrung — senkt die Unterhaltskosten aller Truppen um 25 %.
5. **`verwesungsaura`** **[M6]**
   * **Kosten**: 2 **[da]** | **Braucht**: `['ewigerDienst']` **[da]**
   * **Wirkung**: `{ gift: 150 }` **[M6]**
   * **Beschreibung**: Nahe Feinde erleiden im Gefecht kontinuierlichen Verwesungsschaden (Gift tickt über Zeit).
6. **`seelenzehrung`** **[M6]**
   * **Kosten**: 2 **[da]** | **Braucht**: `['verwesungsaura']` **[da]**
   * **Wirkung**: `{ vampir: 150 }` **[M6]**
   * **Beschreibung**: 15 % des durch eigene Einheiten verursachten Schadens regenerieren deren Trefferpunkte.
7. **`todeshauch`** **[M6]**
   * **Kosten**: 3 **[da]** | **Braucht**: `['seelenzehrung']` **[da]**
   * **Wirkung**: `{ schaden: 200, tempo: 100 }` **[da/M6]**
   * **Beschreibung**: Ein eisiger Wind treibt die Heere an (+20 % Schaden, +10 % Marschgeschwindigkeit).

---

### Ast 4: Kommandant (Todesgott & Totenfürst)

1. **`nekromantie`** **[da]**
   * **Kosten**: 1 **[da]** | **Braucht**: — **[da]**
   * **Wirkung**: `{ kdtSchutz: 200 }` **[da]**
   * **Beschreibung**: Ein astraler Schleier hüllt den Todesgott ein (+20 % Rüstungsschutz).
2. **`grabeskaelte`** **[da]**
   * **Kosten**: 2 **[da]** | **Braucht**: `['nekromantie']` **[da]**
   * **Fähigkeit**: `grabeskaelte` **[da]** (Art: `griff`, Reichweite: 160 m, Radius: 70 m, Dauer: 9 s, Cooldown: 75 s)
   * **Beschreibung**: Lässt den Boden gefrieren und hält alle Feinde im Wirkungsbereich bewegungsunfähig fest.
3. **`seelenrausch`** **[da]**
   * **Kosten**: 2 **[da]** | **Braucht**: `['nekromantie']` **[da]**
   * **Fähigkeit**: `seelenrausch` **[da]** (Art: `ruf`, Radius: 90 m, Dauer: 14 s, Wert: +35 % Schaden, Cooldown: 90 s)
   * **Beschreibung**: Entfesselt die Wut der Ruhelosen und treibt Verbündete in einen verheerenden Kampfrausch.
4. **`knochensturm`** **[da]**
   * **Kosten**: 2 **[da]** | **Braucht**: `['grabeskaelte']` **[da]**
   * **Fähigkeit**: `knochensturm` **[da]** (Art: `rufen`, Ruft 4 Skelettkrieger für 30 s, Cooldown: 110 s)
   * **Beschreibung**: Reißt den Erdboden auf und beschwört sofort ein Gefolge aus 4 Skelettkriegern an die Seite des Gottes.
5. **`todesblick`** **[M3]**
   * **Kosten**: 2 **[da]** | **Braucht**: `['knochensturm']` **[da]**
   * **Fähigkeit**: `todesblick` **[M3]** (Art: `zielschlag`, Reichweite: 800 dm, Schaden: 600, Cooldown: 60 s)
   * **Beschreibung**: Fokussiert den Blick des Schnitters auf ein feindliches Ziel und zerreißt dessen Lebenskraft augenblicklich.
6. **`seelenfresser`** **[M6]**
   * **Kosten**: 2 **[da]** | **Braucht**: `['todesblick']` **[da]**
   * **Wirkung**: `{ kdtRegen: 300 }` **[M6]**
   * **Beschreibung**: Jede in Gegenwart des Todesgottes vernichtete Seele heilt ihn um 300 HP.
7. **`avatar_des_todes`** **[da]**
   * **Kosten**: 3 **[da]** | **Braucht**: `['seelenfresser']` **[da]**
   * **Wirkung**: `{ kdtHp: 500, kdtSchaden: 250 }` **[da]**
   * **Beschreibung**: Erweckt die vollständige Avatar-Gestalt des Todesgottes (+50 % Trefferpunkte, +25 % Seelenlanzen-Schaden).

---

## 4. Volkseigenes & Spezialisierung

1. **Expansionsdynamik durch Gefallene**:
   * Wo Menschen auf feste Grenzsteine setzen und der Waldgott langsam, aber kontinuierlich über Zeit wurzelt, dehnt sich das Totenreich über Schlachten aus (`growth.perTod: 180`). Ein Angriff auf das Totenreich nährt dessen Boden direkt an der Frontlinie.
2. **Aggressive Massenökonomie & Unterhalt**:
   * Skelettkrieger kosten lediglich 45 Fron und 7 Unterhalt. Mit dem Skill `ewigerDienst` sinkt dieser Unterhalt drastisch, wodurch das Totenreich gigantische Rotten aufstellen kann.
3. **Fliegender Prototyp (Knochendrache)**:
   * Während Dampfkoloss (Mensch) und Weltenbaum-Ent (Gott) schwere Bodengiganten sind, fliegt der Knochendrache (`fliegt: true`). Er ignoriert Klippen, Seen und Engpässe und schlägt aus dem Hinterhalt im Rücken der gegnerischen Basis zu.
4. **Schadenskompensation durch Schilde & Seuchen**:
   * Die Seelenkuppel lädt mit +30/Tick schneller nach als menschliche oder göttliche Schirme, um die schwächere Einheitenpanzerung durch kontinuierliche Schildregeneration auszugleichen.
   * Der Seuchenmörser bietet den größten Einschlagsradius (75 m) unter den Fernschlägen und dezimiert dichte gegnerische Linienformationen.
