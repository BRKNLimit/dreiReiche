# Einheiten- und Gebäudekatalog: Das Totenreich & Elite-Einheiten

Alle Werte sind exakt auf das Balancing von `src/sim/defs.js` (Maßeinheiten: Dezimeter `dm`, Ticks, Promille, Minuten) abgestimmt.

---

## 1. Gebäude des Todesgotts (`faction: 'tod'`)

| Schlüssel | Name | HP | Radius | Kosten | Bauzeit | Prio / Funktion | Besonderheit |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `nekropole` | **Nekropole** *(Hauptgebäude)* | 2.500 | 120 | – | – | Hauptbasis | Vital. Erzeugt 40 Gegenwart. Fällt sie, ist das Spiel verloren. |
| `grabhuegel` | **Grabhügel** *(Anker)* | 450 | 45 | 90 Fron | 120 | Anker | Radius startet bei 140 dm; wächst um +18 dm je Gefallenem im 600-dm-Umkreis bis max. 520 dm. |
| `knochenturm` | **Knochenturm** *(Verteidigung)* | 650 | 50 | 140 Fron | 180 | Zorn | Reichweite 520 dm, Schaden 16, Cooldown 7. Braucht Gegenwart. |
| `seelenbrunnen`| **Seelenbrunnen** *(Gegenwart)* | 420 | 45 | 110 Fron | 160 | Segen | Erzeugt 65 Gegenwart, ortsunabhängig. |
| `knochenmuehle`| **Knochenmühle** *(Fron)* | 500 | 45 | 120 Fron | 170 | Segen | Steht auf Steinvorkommen; fördert 120 Fron/min in versorgter Domäne. |
| `fleischwurz` | **Fleischwurz** *(Götterblut)* | 600 | 50 | 160 Fron | 210 | Segen | Steht auf Götterblutader; fördert 18 Götterblut/min. |
| `katakombe` | **Katakombe** *(Fabrik)* | 900 | 80 | 180 Fron | 220 | Werk | Bildet `totengraeber`, `skelettkrieger`, `klageweib`, `grabwaechter`, `knochentitan` aus. |
| `pestaltar` | **Pestaltar** *(Schrein des Zorns)* | 550 | 55 | 160 Fron | 200 | Zorn | Erhöht Angriffsschaden eigener Einheiten im 300-dm-Umkreis um 25%. |
| `ossuarium` | **Ossuarium** *(Schrein der Wehr)* | 550 | 55 | 160 Fron | 200 | Wehr | Verringert erlittenen Schaden eigener Einheiten im 300-dm-Umkreis um 20%. |
| `totenarchiv` | **Totenarchiv** *(Forschung)* | 850 | 55 | 240 Fron | 220 | Segen | Beschleunigt Skillpunkte-Erwerb um +500 Promille. Braucht Gegenwart. |

---

## 2. Einheiten des Todesgotts (`faction: 'tod'`)

### Kommandant
- **`todesgott` (Der Schnitter / Herr der Gräber)**:
  - `hp`: 2.800, `radius`: 45, `speed`: 26 dm/s
  - `kampf`: 'nah', `weapon`: { range: 24, damage: 45, cooldown: 12 }
  - `commander`: true, `build`: { power: 1.000 }
  - *Fähigkeiten*: Seelenernte (Leben saugen), Grabeskälte (Verlangsamen), Totenerweckung (Skelette beschwören).

### Reguläre Truppen
- **`totengraeber` (Arbeiter)**:
  - `hp`: 140, `radius`: 22, `speed`: 30 dm/s, `cost`: { fron: 35 }, `unterhalt`: 3 Fron/min, `buildTime`: 75
  - `worker`: true, `build`: { power: 380 }
  - `kampf`: 'nah', `weapon`: { range: 18, damage: 4, cooldown: 8 }
- **`skelettkrieger` (Leichte Nahkampf-Infanterie)**:
  - `hp`: 170, `radius`: 24, `speed`: 32 dm/s, `cost`: { fron: 38 }, `unterhalt`: 5 Fron/min, `buildTime`: 65
  - `kampf`: 'nah', `weapon`: { range: 18, damage: 8, cooldown: 5 }
- **`klageweib` (Banshee / Fernkämpferin)**:
  - `hp`: 165, `radius`: 22, `speed`: 33 dm/s, `cost`: { fron: 55 }, `unterhalt`: 8 Fron/min, `buildTime`: 95
  - `kampf`: 'fern', `weapon`: { range: 460, damage: 12, cooldown: 8 }
- **`grabwaechter` (Schwere Infanterie)**:
  - `hp`: 340, `radius`: 28, `speed`: 25 dm/s, `cost`: { fron: 95, goetterblut: 12 }, `unterhalt`: 14 Fron/min, `buildTime`: 140
  - `kampf`: 'nah', `weapon`: { range: 22, damage: 22, cooldown: 7 }
- **`knochentitan` (Belagerungskoloss)**:
  - `hp`: 850, `radius`: 48, `speed`: 18 dm/s, `cost`: { fron: 220, goetterblut: 25 }, `unterhalt`: 26 Fron/min, `buildTime`: 230
  - `kampf`: 'nah', `weapon`: { range: 24, damage: 20, gebaeude: 80, vorrang: 'gebaeude', cooldown: 14 }
- **`aasgeier` (Fliegender Späher)**:
  - `hp`: 80, `radius`: 20, `speed`: 48 dm/s, `cost`: { fron: 45 }, `unterhalt`: 4 Fron/min, `buildTime`: 60
  - `fliegt`: true, `sicht`: 1.200 dm, unbewaffnet.

---

## 3. Elitäre Einheiten für die Menschen (`faction: 'mensch'`)

- **`paladin` (Ritter des Sonnenordens)**:
  - `hp`: 420, `radius`: 30, `speed`: 28 dm/s
  - `cost`: { fron: 115, goetterblut: 15 }, `unterhalt`: 16 Fron/min, `buildTime`: 150
  - `kampf`: 'nah', `weapon`: { range: 22, damage: 25, cooldown: 6 }
  - *Rolle*: Fängt feindliche Angriffe ab; hält massiven Schaden stand.
- **`wagenburg` (Fahrbare Bastion)**:
  - `hp`: 720, `radius`: 46, `speed`: 16 dm/s
  - `cost`: { fron: 180, goetterblut: 18 }, `unterhalt`: 22 Fron/min, `buildTime`: 210
  - `kampf`: 'fern', `weapon`: { range: 420, damage: 16, cooldown: 6 }
  - *Rolle*: Schwerer Schützenpanzerwagen; schützt nahe verbündete Infanterie vor Pfeilen.
- **`scharfschuetze` (Meisterarmbrustschütze)**:
  - `hp`: 190, `radius`: 24, `speed`: 26 dm/s
  - `cost`: { fron: 85, goetterblut: 10 }, `unterhalt`: 12 Fron/min, `buildTime`: 125
  - `kampf`: 'fern', `weapon`: { range: 620, damage: 32, cooldown: 15 }
  - *Rolle*: Extrem hohe Schussweite und hoher Einzelschaden gegen Panzerung und Helden.
- **`priester` (Lichtpriester / Feldgeistlicher)**:
  - `hp`: 175, `radius`: 22, `speed`: 30 dm/s
  - `cost`: { fron: 75, goetterblut: 8 }, `unterhalt`: 9 Fron/min, `buildTime`: 110
  - `kampf`: 'nah', `weapon`: { range: 18, damage: 5, cooldown: 8 }
  - *Heilung*: Regeneriert im Umkreis von 200 dm kontinuierlich +6 HP/s bei verwundeten Verbündeten.

---

## 4. Elitäre Einheiten für den Wald- und Wiesengott (`faction: 'gott'`)

- **`moosbaer` (Ur-Bär des Hochwaldes)**:
  - `hp`: 680, `radius`: 42, `speed`: 27 dm/s
  - `cost`: { fron: 140, goetterblut: 18 }, `unterhalt`: 18 Fron/min, `buildTime`: 170
  - `kampf`: 'nah', `weapon`: { range: 26, damage: 32, cooldown: 8 }
  - *Rolle*: Zäh wie ein Fels, wirft feindliche Infanteristen zurück.
- **`fluesterer` (Flüsterer des Dickichts)**:
  - `hp`: 210, `radius`: 24, `speed`: 30 dm/s
  - `cost`: { fron: 90, goetterblut: 12 }, `unterhalt`: 11 Fron/min, `buildTime`: 130
  - `kampf`: 'fern', `weapon`: { range: 480, damage: 14, cooldown: 8 }
  - *Aura*: Verleiht nahen Verbündeten in Wald- oder Baum-Nähe Schleier-Tarnung (später aufgedeckt im Nebel).
- **`kronenhirsch` (Erhabener Sonnenhirsch)**:
  - `hp`: 460, `radius`: 34, `speed`: 38 dm/s
  - `cost`: { fron: 125, goetterblut: 16 }, `unterhalt`: 16 Fron/min, `buildTime`: 160
  - `kampf`: 'fern', `weapon`: { range: 520, damage: 24, cooldown: 7 }
  - *Rolle*: Schnelle mobile Kavallerie-Artillerie; schießt gleißende Lichtlanzen aus seinem Sonnengeweih.
- **`dornenhydra` (Lebende Dornenartillerie)**:
  - `hp`: 580, `radius`: 44, `speed`: 19 dm/s
  - `cost`: { fron: 190, goetterblut: 22 }, `unterhalt`: 24 Fron/min, `buildTime`: 220
  - `kampf`: 'fern', `weapon`: { range: 480, damage: 15, gebaeude: 45, cooldown: 8 }
  - *Säurespucke*: Schießt drei Giftstacheln gleichzeitig; verlangsamt getroffene Feinde für 3 Sekunden.
