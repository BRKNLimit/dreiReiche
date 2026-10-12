# Inhaltsentwurf: Wald- und Wiesengott (Das Waldreich)

Stand: 12. Oktober 2026  
Status: **Entwurf (Paket G2)** zur Prüfung und Abnahme durch den Nutzer.  
Regelprüfung: Alle Felder sind strikt annotiert mit **[da]** (in `FELDER` vorhanden) oder **[Mx]** (geplante Mechanik aus `docs/umbau/konzept.md`).

---

## 1. Volksübersicht & Identität

* **Volksschlüssel**: `gott` **[da]**
* **Name**: `Wald- und Wiesengott` **[da]**
* **Farbe**: `#8fb86a` **[da]** (Moosgrün / Waldgold)
* **Domäne**: Stetes, organisches Wachstum (`growth: { start: 950, max: 5200, perTick: 1 }` **[da]**). Die Domäne beginnt bei 95 m Radius und wächst kontinuierlich jeden Tick um 1 Dezimeter, bis sie nach ca. 7 Minuten ihr Maximum von über 500 Metern Durchmesser erreicht. Je länger eine Hainstellung steht, desto gewaltiger wird das von ihr beherrschte Territorium.
* **Kommandant**: `waldgott` **[da]** (Düsterer, unheimlicher Urwald-Avatar mit dunklem Wurzelsaum, leuchtendem Glutherz, goldenen Klauen und mächtigem Geweih)
* **Hauptgebäude**: `herzbaum` **[da]**
* **Wesenszug & Spezialisierung**: Leben, Regeneration, Schwarm-Einheiten und symbiotisches Wachstum. Der Wald heilt seine Wunden von selbst (`regeneration` **[M3]**), beschwört Naturgeister und überwältigt Feinde im späten Spiel mit gewaltigen titanischen Ents.
* **Spielgefühl**: Geduldiges Ausharren, Wurzeln schlagen, Nadelstiche durch schnelle Wölfe und Insektenschwärme setzen, Einheiten dank natürlicher Heilung am Leben halten und schließlich den Gegner mit einer unaufhaltsamen Lawine aus uraltem Holz und Bestien überrollen.

---

## 2. Die gemeinsame Basis (Rollen-Besetzung)

### 2.1 Gebäude der Basis

| Rolle | Schlüssel | Name | Zweck | Werte & Mechaniken | Begründung & Vergleich |
|---|---|---|---|---|---|
| `haupt` | `herzbaum` | Herzbaum | Hauptgebäude, Lebenszentrum | `hp: 5000` **[da]**, `radius: 90` **[da]**, `anchor: true` **[da]**, `anchorMin: 4000` **[da]**, `gegenwartOut: 24` **[da]**, `cost: { fron: 0 }` **[da]**, `buildTime: 0` **[da]**, `buildList: ['dryade', 'wolf', 'rabe']` **[da]**, `vital: true` **[da]** | Zentraler Weltenstamm. Zieht Dryaden, Wölfe und Späher-Raben heran. Domäne wächst stetig über das Minimum hinaus. |
| `anker` | `hain` | Hain | Wachsender Domänen-Anker | `hp: 600` **[da]**, `radius: 48` **[da]**, `anchor: true` **[da]**, `needsGrowth: true` **[da]**, `cost: { fron: 110 }` **[da]**, `buildTime: 190` **[da]** | Günstiger als der Grenzstein (110 vs 120 Fron), wächst dafür organisch und benötigt ungerodeten Waldboden. |
| `kraft` | `quelle` | Waldquelle | Gegenwarts-Erzeugung | `hp: 750` **[da]**, `radius: 56` **[da]**, `gegenwartOut: 40` **[da]**, `cost: { fron: 260 }` **[da]**, `buildTime: 210` **[da]** | Sprudelnde Quelle urzeitlichen Nährsafts; liefert Energie für Dickichte und Lebensbäume. |
| `fron` | `moos` | Moosstätte | Fron-Förderung auf Adern | `hp: 900` **[da]**, `radius: 50` **[da]**, `needs: 'fron'` **[da]**, `gegenwartIn: 12` **[da]**, `fronOut: 540` **[da]**, `cost: { fron: 230 }` **[da]**, `buildTime: 200` **[da]** | Flechten und Moose überwuchern die Fronader und ernten sie naturverbunden ab. |
| `blut` | `blutwurz` | Blutwurz | Götterblut-Förderung | `hp: 1300` **[da]**, `radius: 55` **[da]**, `needs: 'goetterblut'` **[da]**, `gegenwartIn: 16` **[da]**, `blutOut: 140` **[da]**, `cost: { fron: 330 }` **[da]**, `buildTime: 260` **[da]** | Tiefe Pfahlwurzeln zapfen das flüssige Götterblut im Gestein an. |
| `fabrik` | `dickicht` | Dickicht | Natur-Brutstätte für Truppen | `hp: 2200` **[da]**, `radius: 70` **[da]**, `gegenwartIn: 12` **[da]**, `cost: { fron: 380 }` **[da]**, `buildTime: 270` **[da]**, `buildList: ['waldgeist', 'ent', 'wurzelbrecher']` **[da]** | Verschlungene Hecken und Höhlen; zieht Geister, Ents und Wurzelbrecher heran. |
| `turm` | `waechterbaum` | Wächterbaum | Lebendige Verteidigung | `hp: 3000` **[da]**, `radius: 40` **[da]**, `gegenwartIn: 10` **[da]**, `prio: 1` **[da]**, `cost: { fron: 300 }` **[da]**, `buildTime: 250` **[da]**, `kampf: 'fern'` **[da]**, `weapon: { range: 900, damage: 60, cooldown: 4 }` **[da]** | Schießt gehärtete Dornen auf Eindringlinge. Besitzt hohe Haltbarkeit und schläft ohne Gegenwart ein. |
| `zorn` | `dornenschrein` | Dornenschrein | Zorn-Schrein (+20 % Schaden) | `hp: 1100` **[da]**, `radius: 38` **[da]**, `gegenwartIn: 14` **[da]**, `buff: { zorn: 200, radius: 1000 }` **[da]**, `cost: { fron: 290 }` **[da]**, `buildTime: 230` **[da]** | Schärft Klauen und Dornen im 100 m Umkreis. |
| `wehr` | `steinkreis` | Steinkreis | Wehr-Schrein (-20 % Schaden) | `hp: 1400` **[da]**, `radius: 42` **[da]**, `gegenwartIn: 14` **[da]**, `buff: { wehr: 200, radius: 1000 }` **[da]**, `cost: { fron: 310 }` **[da]**, `buildTime: 250` **[da]** | Ältere Megalithen schützen Verbündete mit einer dämpfenden Steinaura. |
| `forschung` | `eiche` | Uralte Eiche | Forschung & Skillpunkte | `hp: 1200` **[da]**, `radius: 52` **[da]**, `gegenwartIn: 18` **[da]**, `forschung: 350` **[da]**, `cost: { fron: 320 }` **[da]**, `buildTime: 260` **[da]** | Baum des Wissens; beschleunigt den Skilltakt um 35 %. |
| `posten` | `wipfelausguck` | Wipfelausguck | Wächterbaum-Weitsicht | `hp: 600` **[da]**, `radius: 32` **[da]**, `sicht: 2000` **[da]**, `cost: { fron: 95 }` **[da]**, `buildTime: 130` **[da]** | Hoher Mammutbaum mit Glühwürmchen; deckt 200 m auf, arbeitet ohne Domäne und Gegenwart. |
| `luftfabrik` | `wipfelhorst` | Wipfelhorst | Horst für Flugeinheiten | `hp: 2000` **[da]**, `radius: 72` **[da]**, `gegenwartIn: 14` **[da]**, `cost: { fron: 400, goetterblut: 50 }` **[da]**, `buildTime: 280` **[da]**, `buildList: ['hornissenschwarm', 'walddrache']` **[da]** | Hoch in den Baumkronen geflochtene Plattform für Schwärme und Flugechsen (Mechanik M1). |
| `flak` | `sporenwerfer` | Sporenwerfer | Biologische Flugabwehr | `hp: 2200` **[da]**, `radius: 40` **[da]**, `gegenwartIn: 12` **[da]**, `prio: 1` **[da]**, `cost: { fron: 310, goetterblut: 40 }` **[da]**, `buildTime: 250` **[da]**, `kampf: 'fern'` **[da]**, `weapon: { range: 1050, damage: 80, cooldown: 3, ziele: 'luft' }` **[da/M1]** | Schleudert explodierende Pollenhülsen steil nach oben. Tödlich gegen Gleiter, Ballone und Geier. |
| `schild` | `hainschild` | Hainschild | Schirm aus Lebensenergie | `hp: 1700` **[da]**, `radius: 44` **[da]**, `gegenwartIn: 20` **[da]**, `prio: 2` **[da]**, `cost: { fron: 420, goetterblut: 80 }` **[da]**, `buildTime: 310` **[da]**, `schild: { kapazitaet: 2800, radius: 1300, laden: 35 }` **[M2]** | Größerer Schutzradius (130 m) und schnellste Laderate (35/s) durch pulsierende Naturkraft. |
| `umwandler` | `bluetenkelch` | Blütenkelch | Nektarwandlung Gegenwart → Fron | `hp: 1100` **[da]**, `radius: 48` **[da]**, `gegenwartIn: 26` **[da]**, `fronOut: 360` **[da]**, `cost: { fron: 360, goetterblut: 40 }` **[da]**, `buildTime: 260` **[da]** | Destilliert fließende Gegenwart in klebriges Fron-Baumharz. |
| `werkstatt` | `lebensschmiede` | Lebensschmiede | Erweckung des Titanen | `hp: 3000` **[da]**, `radius: 80` **[da]**, `gegenwartIn: 22` **[da]**, `cost: { fron: 580, goetterblut: 140 }` **[da]**, `buildTime: 380` **[da]**, `buildList: ['weltenbaum_ent']` **[da]** | Heiliger Erdspalt, in dem uralte Urbaumsamen zu Titanen herangezogen werden (Mechanik M5). |
| `schlag` | `zornwurzel` | Zornwurzel | Seismischer Fernschlag | `hp: 1900` **[da]**, `radius: 52` **[da]**, `gegenwartIn: 18` **[da]**, `cost: { fron: 680, goetterblut: 240 }` **[da]**, `buildTime: 440` **[da]**, `schlag: { laden: 1200, kosten: { fron: 280, goetterblut: 110 }, reichweite: 11500, radius: 650, schaden: 2800 }` **[M4]** | Entfesselt ein fernes Wurzel-Erdbeben, das 2800 Schaden im weiten 65 m Radius verursacht. |
| `abwehr` | `himmelsdorn` | Himmelsdorn | Dornenspeer-Abfangspitze | `hp: 1500` **[da]**, `radius: 42` **[da]**, `gegenwartIn: 16` **[da]**, `cost: { fron: 430, goetterblut: 110 }` **[da]**, `buildTime: 310` **[da]**, `abwehr: { radius: 2400, laden: 580 }` **[M4]** | Schleudert gewaltige Himmelsdornen empor, um herabstürzende Geschosse abzufangen. |

---

### 2.2 Einheiten der Basis

| Rolle | Schlüssel | Name | Zweck | Werte & Mechaniken | Begründung & Vergleich |
|---|---|---|---|---|---|
| `bauer` | `dryade` | Dryade | Erbauerin & Pflegerin | `hp: 160` **[da]**, `radius: 11` **[da]**, `speed: 24` **[da]**, `sicht: 900` **[da]**, `cost: { fron: 85 }` **[da]**, `unterhalt: 11` **[da]**, `buildTime: 75` **[da]**, `worker: true` **[da]**, `build: { power: 10 }` **[da]**, `regeneration: 60` **[M3]** | Flinke Waldnymphe (Speed 24). Günstiger als der Bauer (85 vs 90 Fron), heilt sich selbst langsam. |
| `leicht` | `wolf` | Wolf | Schnelle Meute & Überfall | `hp: 420` **[da]**, `radius: 12` **[da]**, `speed: 27` **[da]**, `sicht: 950` **[da]**, `cost: { fron: 105 }` **[da]**, `unterhalt: 15` **[da]**, `buildTime: 95` **[da]**, `kampf: 'nah'` **[da]**, `weapon: { range: 12, damage: 17, cooldown: 9, ziele: 'boden' }` **[da/M1]**, `regeneration: 40` **[M3]** | Deutlich schneller als Soldat und Skelett (27 vs 22 Speed). Perfekt für Jagden und Flankenangriffe. |
| `fern` | `waldgeist` | Waldgeist | Magischer Fernkampf | `hp: 260` **[da]**, `radius: 12` **[da]**, `speed: 22` **[da]**, `sicht: 900` **[da]**, `cost: { fron: 145 }` **[da]**, `unterhalt: 20` **[da]**, `buildTime: 125` **[da]**, `kampf: 'fern'` **[da]**, `weapon: { range: 480, damage: 18, cooldown: 10, ziele: 'beide' }` **[da/M1]**, `regeneration: 50` **[M3]** | Erscheint in 4 Jahreszeiten-Stilen. Schießt Lichtpfeile auf Boden und Luft. |
| `schwer` | `ent` | Ent | Lebender Baumkrieger | `hp: 1400` **[da]**, `radius: 18` **[da]**, `speed: 15` **[da]**, `sicht: 900` **[da]**, `cost: { fron: 260, goetterblut: 75 }` **[da]**, `unterhalt: 36` **[da]**, `buildTime: 280` **[da]**, `kampf: 'nah'` **[da]**, `weapon: { range: 15, damage: 42, cooldown: 13, ziele: 'boden' }` **[da/M1]**, `regeneration: 120` **[M3]** | Höchste Lebenspunkte aller schweren Basiseinheiten (1400 HP) und massive Eigenheilung (120 LP/min). |
| `belagerung` | `wurzelbrecher` | Wurzelbrecher | Belagerungs-Bollwerk | `hp: 750` **[da]**, `radius: 19` **[da]**, `speed: 14` **[da]**, `sicht: 900` **[da]**, `cost: { fron: 310, goetterblut: 85 }` **[da]**, `unterhalt: 38` **[da]**, `buildTime: 310` **[da]**, `kampf: 'nah'` **[da]**, `weapon: { range: 18, damage: 35, cooldown: 20, gebaeude: 240, vorrang: 'gebaeude', ziele: 'boden' }` **[da/M1]**, `regeneration: 60` **[M3]** | Bricht Gebäude im Nahkontakt mit gewaltigen Rammwurzeln entzwei (240 Gebäudeschaden). |
| `spaeher` | `rabe` | Rabe | Fliegender Aufklärer | `hp: 120` **[da]**, `radius: 10` **[da]**, `speed: 36` **[da]**, `sicht: 1200` **[da]**, `fliegt: true` **[da]**, `cost: { fron: 70 }` **[da]**, `unterhalt: 8` **[da]**, `buildTime: 60` **[da]** | Fliegt unbeeindruckt über Flüsse und Felsen hinweg. Schneller Sichtspender. |
| `luftjaeger` | `hornissenschwarm` | Hornissenschwarm | Schwarm-Abfangjäger | `hp: 360` **[da]**, `radius: 14` **[da]**, `speed: 36` **[da]**, `sicht: 1100` **[da]**, `fliegt: true` **[da]**, `cost: { fron: 170, goetterblut: 35 }` **[da]**, `unterhalt: 22` **[da]**, `buildTime: 150` **[da]**, `kampf: 'nah'` **[da]**, `weapon: { range: 25, damage: 32, cooldown: 7, ziele: 'luft' }` **[da/M1]**, `regeneration: 60` **[M3]** | Höchst agiler Insektenschwarm (Speed 36, Angriffs-Cooldown 7). Zerbeißt feindliche Gleiter und Flieger im Nah-Luftkampf. |
| `bomber` | `walddrache` | Walddrache | Ätzharz-Flieger (Boden) | `hp: 920` **[da]**, `radius: 19` **[da]**, `speed: 21` **[da]**, `sicht: 1050` **[da]**, `fliegt: true` **[da]**, `cost: { fron: 360, goetterblut: 95 }` **[da]**, `unterhalt: 48` **[da]**, `buildTime: 310` **[da]**, `kampf: 'fern'` **[da]**, `weapon: { range: 300, damage: 75, cooldown: 22, gebaeude: 150, ziele: 'boden' }` **[da/M1]**, `regeneration: 80` **[M3]**, `verlangsamt: { dauer: 30, wert: 300 }` **[M3]** | Speit ätzenden Saft: Trifft Bodenziele schwer und verlangsamt sie für 3 Sekunden um 30 % (`verlangsamt` **[M3]**). |
| `prototyp` | `weltenbaum_ent` | Weltenbaum-Ent | Lebender Berg / Baumtitan | `hp: 9500` **[da]**, `radius: 30` **[da]**, `speed: 13` **[da]**, `sicht: 1300` **[da]**, `hoechstens: 1` **[M5]**, `cost: { fron: 1900, goetterblut: 650 }` **[da]**, `unterhalt: 130` **[da]**, `buildTime: 850` **[da]**, `kampf: 'nah'` **[da]**, `weapon: { range: 24, damage: 220, cooldown: 24, gebaeude: 750, ziele: 'boden' }` **[da/M1]**, `regeneration: 300` **[M3]**, `aura: { heilung: 240, radius: 1000 }` **[M3]** | Ungeheurer Baumtitan auf 4 Säulenbeinen. Trägt einen ganzen Hain auf den Schultern. Regeneriert 300 LP/min selbst und heilt alle eigenen Truppen im 100 m Umkreis mit 240 LP/min. Zermalmt Festungen mühelos. |

---

## 3. Der große Technologie-Baum (28 Knoten)

Der Gott-Baum fokussiert sich auf Regeneration, Naturkräfte, Schwarmkampf und die Ent-Stammbäume.

```
       [AST 1: EINHEITEN]          [AST 2: GEBÄUDE]          [AST 3: VERBESSERUNGEN]      [AST 4: KOMMANDANT]
              │                            │                            │                          │
       (1. waldgeister)             (1. dornenschrein)            (1. faenge)                (1. rinde)
              │                            │                            │                          │
       (2. ents)                    (2. steinkreis)               (2. borke)                 (2. wurzelgriff)
              │                            │                            │                          │
       (3. wurzelbrecher)           (3. saftfluss)                (3. keimkraft)             (3. lebenssaft)
              │                            │                            │                          │
       (4. insektenschwarm) [M1]    (4. bluetenalchemie) [da]     (4. genuegsamkeit)         (4. rudelruf)
              │                            │                            │                          │
       (5. walddrachenbrut) [M1]    (5. lebendiger_schirm) [M2]   (5. sporenwurf) [M6]       (5. glutherz_aura) [M3]
              │                            │                            │                          │
       (6. uraltes_holz) [M6]       (6. erdbebenwurzel) [M4]      (6. fotosynthese) [M6]     (6. waldvater) [M6]
              │                            │                            │                          │
       (7. weltenbaum_ent) [M5]     (7. himmelsstachel) [M4]      (7. urwuchs) [M6]          (7. segen_der_ahnen)[da]
```

### Ast 1: Einheiten (Kreaturen & Waldgänger)

1. **`waldgeister`** **[da]**
   * **Kosten**: 1 **[da]** | **Braucht**: — **[da]**
   * **Frei**: `['waldgeist']` **[da]**
   * **Beschreibung**: Schaltet Waldgeister im Dickicht frei.
2. **`ents`** **[da]**
   * **Kosten**: 1 **[da]** | **Braucht**: `['waldgeister']` **[da]**
   * **Frei**: `['ent']` **[da]**
   * **Beschreibung**: Erlaubt das Rufen gewaltiger Ents gegen Götterblut.
3. **`wurzelbrecher`** **[da]**
   * **Kosten**: 1 **[da]** | **Braucht**: `['ents']` **[da]**
   * **Frei**: `['wurzelbrecher']` **[da]**
   * **Beschreibung**: Schaltet schwere Wurzelbrecher zur Erstürmung feindlicher Türme frei.
4. **`insektenschwarm`** **[M1]**
   * **Kosten**: 2 **[da]** | **Braucht**: `['wurzelbrecher']` **[da]**
   * **Frei**: `['wipfelhorst', 'hornissenschwarm']` **[da/M1]**
   * **Beschreibung**: Ermöglicht den Bau des Wipfelhorstes und das Schlüpfen aggressiver Hornissenschwärme.
5. **`walddrachenbrut`** **[M1]**
   * **Kosten**: 2 **[da]** | **Braucht**: `['insektenschwarm']` **[da]**
   * **Frei**: `['walddrache']` **[da/M1]**
   * **Beschreibung**: Erweckt ätzharzspeiende Walddrachen im Wipfelhorst.
6. **`uraltes_holz`** **[M6]**
   * **Kosten**: 2 **[da]** | **Braucht**: `['walddrachenbrut']` **[da]**
   * **Wirkung**: `{ schutz: 200 }` **[da]**, `nur: ['ent', 'wurzelbrecher']` **[M6]**
   * **Beschreibung**: Versteinertes Kernholz stärkt Ents und Wurzelbrecher (+20 % Rüstungsschutz).
7. **`weltenbaum_ent`** **[M5]**
   * **Kosten**: 3 **[da]** | **Braucht**: `['uraltes_holz']` **[da]**
   * **Frei**: `['lebensschmiede', 'weltenbaum_ent']` **[da/M5]**
   * **Beschreibung**: Erschließt die Lebensschmiede und ruft den lebenden Weltenbaum-Ent herbei.

### Ast 2: Gebäude (Haine & Urgewalten)

1. **`dornenschrein`** **[da]**
   * **Kosten**: 1 **[da]** | **Braucht**: — **[da]**
   * **Frei**: `['dornenschrein']` **[da]**
   * **Beschreibung**: Schaltet den Dornenschrein frei (+20 % Schaden im Umkreis).
2. **`steinkreis`** **[da]**
   * **Kosten**: 1 **[da]** | **Braucht**: `['dornenschrein']` **[da]**
   * **Frei**: `['steinkreis']` **[da]**
   * **Beschreibung**: Erlaubt den Bau von Steinkreisen (-20 % Schaden im Umkreis).
3. **`saftfluss`** **[da]**
   * **Kosten**: 1 **[da]** | **Braucht**: `['steinkreis']` **[da]**
   * **Wirkung**: `{ foerderung: 200 }` **[da]**
   * **Beschreibung**: Gesteigerter Saftstrom in Moosstätten und Blutwurz erhöht den Rohstoffertrag um 20 %.
4. **`bluetenalchemie`** **[da]**
   * **Kosten**: 2 **[da]** | **Braucht**: `['saftfluss']` **[da]**
   * **Frei**: `['bluetenkelch']` **[da]**
   * **Beschreibung**: Ermöglicht den Bau des Blütenkelchs zur Wandlung von Gegenwart in Fronharz.
5. **`lebendiger_schirm`** **[M2]**
   * **Kosten**: 2 **[da]** | **Braucht**: `['bluetenalchemie']` **[da]**
   * **Frei**: `['hainschild', 'sporenwerfer']` **[da/M1/M2]**
   * **Beschreibung**: Schaltet schützende Hainschilde und abwehrende Sporenwerfer frei.
6. **`erdbebenwurzel`** **[M4]**
   * **Kosten**: 2 **[da]** | **Braucht**: `['lebendiger_schirm']` **[da]**
   * **Frei**: `['zornwurzel']` **[da/M4]**
   * **Beschreibung**: Erlaubt die Erweckung der Zornwurzel für vernichtende Fernschläge.
7. **`himmelsstachel`** **[M4]**
   * **Kosten**: 3 **[da]** | **Braucht**: `['erdbebenwurzel']` **[da]**
   * **Frei**: `['himmelsdorn']` **[da/M4]**
   * **Beschreibung**: Errichtet den Himmelsdorn zur zuverlässigen Abwehr feindlicher Kataklysmen.

### Ast 3: Verbesserungen (Biologische Auslese)

1. **`faenge`** **[da]**
   * **Kosten**: 1 **[da]** | **Braucht**: — **[da]**
   * **Wirkung**: `{ schaden: 150 }` **[da]**
   * **Beschreibung**: Rasiermesserscharfe Fänge und Dornen erhöhen den Schaden aller Einheiten um 15 %.
2. **`borke`** **[da]**
   * **Kosten**: 1 **[da]** | **Braucht**: `['faenge']` **[da]**
   * **Wirkung**: `{ schutz: 150 }` **[da]**
   * **Beschreibung**: Dicke Rindenschichten verringern den erlittenen Schaden aller Einheiten um 15 %.
3. **`keimkraft`** **[da]**
   * **Kosten**: 1 **[da]** | **Braucht**: `['borke']` **[da]**
   * **Wirkung**: `{ ausbildung: 250 }` **[da]**
   * **Beschreibung**: Schnelleres Wachstum verkürzt die Heranbildungszeit im Dickicht um 25 %.
4. **`genuegsamkeit`** **[da]**
   * **Kosten**: 1 **[da]** | **Braucht**: `['keimkraft']` **[da]**
   * **Wirkung**: `{ unterhalt: 200 }` **[da]**
   * **Beschreibung**: Waldwesen nähren sich vom Tau des Morgens (-20 % Fron-Unterhalt).
5. **`sporenwurf`** **[M6]**
   * **Kosten**: 2 **[da]** | **Braucht**: `['genuegsamkeit']` **[da]**
   * **Wirkung**: `{ reichweite: 200 }` **[M6]**, `nur: ['waechterbaum', 'sporenwerfer']` **[M6]**
   * **Beschreibung**: Treibende Gase steigern die Reichweite von Wächterbäumen und Sporenwerfern um 20 %.
6. **`fotosynthese`** **[M6]**
   * **Kosten**: 2 **[da]** | **Braucht**: `['sporenwurf']` **[da]**
   * **Wirkung**: `{ regeneration: 100 }` **[M6]**
   * **Beschreibung**: Sonnenlicht verstärkt die natürliche Lebensregeneration aller verbündeten Einheiten um +100 LP/min.
7. **`urwuchs`** **[M6]**
   * **Kosten**: 3 **[da]** | **Braucht**: `['fotosynthese']` **[da]**
   * **Wirkung**: `{ tempo: 150, schaden: 100 }` **[M6]**, `nur: ['wolf', 'hornissenschwarm', 'walddrache']` **[M6]**
   * **Beschreibung**: Wilde Raserei verleiht Wölfen und Fliegern +15 % Bewegungstempo und +10 % Schaden.

### Ast 4: Kommandant (Der Avatar des Glutherzens)

1. **`rinde`** **[da]**
   * **Kosten**: 1 **[da]** | **Braucht**: — **[da]**
   * **Wirkung**: `{ kdtSchutz: 250 }` **[da]**
   * **Beschreibung**: Verhärtet den Mantel des Waldgotts (-25 % erlittener Schaden).
2. **`wurzelgriff`** **[da]**
   * **Kosten**: 1 **[da]** | **Braucht**: `['rinde']` **[da]**
   * **Fähigkeit**: `wurzelgriff` **[da]** (Taste Q)
   * **Beschreibung**: Schaltet die aktive Fähigkeit frei: Schlingwurzeln halten Feinde im Zielgebiet 5 Sekunden lang fest (Cooldown 40s).
3. **`lebenssaft`** **[da]**
   * **Kosten**: 1 **[da]** | **Braucht**: `['wurzelgriff']` **[da]**
   * **Fähigkeit**: `lebenssaft` **[da]** (Taste W)
   * **Beschreibung**: Schaltet die aktive Fähigkeit frei: Heilt alle verbündeten Einheiten im Umkreis von 60 m sofort um 400 LP (Cooldown 50s).
4. **`rudelruf`** **[da]**
   * **Kosten**: 1 **[da]** | **Braucht**: `['lebenssaft']` **[da]**
   * **Fähigkeit**: `rudelruf` **[da]** (Taste E)
   * **Beschreibung**: Schaltet die aktive Fähigkeit frei: Ruft 3 temporäre Geistwölfe herbei, die 30 Sekunden lang kämpfen (Cooldown 60s).
5. **`glutherz_aura`** **[M3]**
   * **Kosten**: 2 **[da]** | **Braucht**: `['rudelruf']` **[da]**
   * **Wirkung**: `{ aura: { heilung: 150, radius: 700 } }` **[M3]**
   * **Beschreibung**: Das pulsierende Glutherz heilt umstehende Einheiten permanent mit 150 LP/min.
6. **`waldvater`** **[M6]**
   * **Kosten**: 2 **[da]** | **Braucht**: `['glutherz_aura']` **[da]**
   * **Wirkung**: `{ baukraft: 500 }` **[M6]**, `nur: ['waldgott', 'dryade']` **[M6]**
   * **Beschreibung**: Die Nähe des Gottes lässt Pflanzenbauten 50 % schneller sprießen und heilen.
7. **`segen_der_ahnen`** **[da]**
   * **Kosten**: 3 **[da]** | **Braucht**: `['waldvater']` **[da]**
   * **Wirkung**: `{ schaden: 100, schutz: 100 }` **[da]**
   * **Beschreibung**: Der uralte Segen stärkt alle Wesen des Waldes dauerhaft um +10 % Schaden und +10 % Schutz.
