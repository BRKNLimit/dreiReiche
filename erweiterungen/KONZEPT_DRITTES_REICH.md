# Konzept: Das Dritte Reich — Der Todesgott & Die Knochenwacht

> *„Aus Erde geboren, von Holz und Eisen genährt, kehrt alles in die Stille zurück.“*

---

## 1. Prämisse & Narrative Einbettung

In der Welt von *Die drei Reiche* gibt es kein stereotypes Gut gegen Böse:
- **Die Menschen** kämpfen um ihr irdisches Überleben, errichten Gehöfte, roden Wälder gegen den tödlichen Frost und erwecken das schlafende Land mit Äxten, Schmiedefeuern und Gesetzen.
- **Der Wald- und Wiesengott** ist das pulsierende Urleben selbst — ein majestätischer, archaischer Titan, für den Siedlungen Schnittwunden im Erdreich sind, die überwuchert und geheilt werden müssen.
- **Der Todesgott (Die Asche- und Knochenfürsten)** ist weder grausam noch herrschsüchtig. Er verkörpert die unvermeidliche Entropie, die ewige Ruhe nach der Schlacht und das Gedächtnis all jener, die je gelebt haben. Seine Krieger spüren keinen Schmerz, seine Erbauer kennen keine Müdigkeit. Er beginnt keinen Krieg — er folgt ihm dorthin, wo das Land von den Kämpfen der beiden anderen Reiche verwüstet wurde.

---

## 2. Die Spielmechanik: Dieselben Regeln, eine entscheidende Variable

Wie im Grundkonzept festgelegt, darf keine Fraktion über Sondersysteme verfügen, die das Balancing zerstören. Alle drei Mächte teilen sich **dieselben drei Ressourcen**:
1. **Gegenwart** (Fluss, nicht lagerbar — aus Ankern und Gegenwartserzeugern)
2. **Fron** (Bestand, lagerbar — aus Handarbeit, Knochen, Stein und Eisen)
3. **Götterblut** (Hochtechnologie/Elite-Ressource — aus seltenen Adern)

### Die Wachstumsregel der Anker
Die gesamte Asymmetrie liegt im Wachstumsverhalten des Domänenankers:

| Fraktion | Anker-Gebäude | Radius-Verhalten | Spielgefühl & Taktik |
| --- | --- | --- | --- |
| **Menschen** | `grenzstein` | Fest bei Bauende (ca. 420 dm) | Sofortige Stabilität, planbar, erfordert viele Anker zur Expansion. |
| **Waldgott** | `hain` | Wächst kontinuierlich mit der Zeit ($r = r_0 + c \cdot t$) | Frühe Verwundbarkeit, aber nach 15 Minuten uneinnehmbare Urwälder. |
| **Todesgott** | `grabhuegel` | **Wächst durch Tode im Umkreis** ($r = r_0 + k \cdot \text{Tode}$) | Startet winzig ($r_0 \approx 120\text{ dm}$); wächst explosionsartig an Brennpunkten der Schlacht. |

#### Die Dynamik des Grabhügels
- Wird ein `grabhuegel` auf unberührtem Boden errichtet, spendet er kaum Domäne.
- Entbrennt jedoch ein Gefecht um eine strategische Furt oder eine Götterblutader und fallen dort Soldaten, Wölfe oder Bauern, saugt der Grabhügel die Seelenkraft auf: Pro Gefallenem wächst der Radius um ca. 18 dm (bis zu einer Obergrenze von 550 dm).
- **Strategische Konsequenz**: Der Todesgott expandiert dorthin, wo gekämpft wird. Seine stärksten Stellungen entstehen genau dort, wo die anderen beiden Fraktionen gegeneinander verbluten.

---

## 3. Die Zehn Gebäuderollen des Todesgotts

Identische Rollenverteilung wie bei Menschen und Waldgott (nach dem Supreme-Commander-Prinzip):

| Rolle | Menschen | Waldgott | **Todesgott (Neu)** | Beschreibung |
| --- | --- | --- | --- | --- |
| **Hauptgebäude** *(vital)* | Thingstätte | Herzbaum | **Nekropole** | Monumentales Basalt-Mausoleum mit schwebendem Seelenmonolithen und vier Urnenfeuern. Niederlage bei Verlust. |
| **Anker** *(Domäne)* | Grenzstein | Hain | **Grabhügel** | Uralter Grabhügel mit Steinkranz und smaragdgrünem Seelenfeuer. Wächst durch Tode. |
| **Verteidigung** *(Fernkampf)* | Wachturm | Wächterbaum | **Knochenturm** | Aufragende Säule aus Rippenknochen; schießt Seelenspeere und Knochengeschosse. |
| **Gegenwart** *(Erzeuger)* | Schmiede | Quellgrund | **Seelenbrunnen** | In den Fels geschlagener Schacht mit aufsteigenden ätherischen Geisterflammen. |
| **Fron** *(Förderung)* | Sägewerk | Moosgrube | **Knochenmühle** | Mahlwerk aus Schiefer- und Eisenrädern auf Steinlagern; zermalmt Knochen und Fels zu Fron. |
| **Götterblut** *(Ader)* | Blutschacht | Blutwurz | **Fleischwurz** | Tiefe Gruft mit bleichen Grabkrallen, die das Götterblut der Erde in Zinnbecken auffangen. |
| **Fabrik** *(Ausbildung)* | Kaserne | Dickicht | **Katakombe** | Steingewölbe mit Gruftöffnungen, aus denen Skeletthorden und Grabwächter emporsteigen. |
| **Schrein des Zorns** | Kriegsbanner | Dornenschrein | **Pestaltar** | Opferstein mit Richtschwert und Weihrauchfässern mit Moderqualm (+Schaden im Umkreis). |
| **Schrein der Wehr** | Kapelle | Steinkreis | **Ossuarium** | Beinhäuschen aus gestapelten Schädeln und Grabplatten (-erlittener Schaden im Umkreis). |
| **Forschung** *(Skillpunkte)* | Skriptorium | Raunende Eiche | **Totenarchiv** | Gruftbibliothek mit Ahnenstelen, Schriftrollen und Sarkophag-Regalen. |

---

## 4. Die Einheiten des Todesgotts

### 1. Kommandant: Der Schnitter (`todesgott`)
- **Erscheinung**: Ein schwebender Fürst des Übergangs in zerfetzten aschgrauen und nachtschwarzen Roben. Ein gebleichter Schädel mit intensiv türkis/smaragdgrün glühenden Augenhöhlen, gekrönt von einem Diadem aus geschwungenen Gebeinen. In seinen Klauenhänden ruht die *Seelensense des Verfalls*.
- **Werte**: HP 2.800, Nahkampf-Schaden 45, Bau-Kraft 1.000 (identisch mit König und Waldgott).
- **Fähigkeiten im Skillbaum**:
  1. **Seelenernte** (Tier 1): Entzieht feindlichen Einheiten im Umkreis von 350 dm Leben und heilt den Todesgott sowie Verbündete.
  2. **Grabeskälte** (Tier 2): Lässt den Boden gefrieren; verringert das Lauftempo aller Feinde im Umkreis um 40% für 8 Sekunden.
  3. **Totenerweckung** (Tier 3): Lässt an den Positionen naher Gefallener für 20 Sekunden 4 Skelettkrieger auferstehen (kosten keinen Unterhalt).

### 2. Arbeiter: Totengräber (`totengraeber`)
- Krummbeiniger Leichensammler in Mönchskutte mit eiserner Spatenklinge, Grablaterne und hölzerner Knochentrage.
- Baut Gebäude, schaufelt Gräber und repariert Bauwerke.

### 3. Leichte Infanterie: Skelettkrieger (`skelettkrieger`)
- Verrostetes Kettenhemd, Schartig-Schild, antikes Kurzschwert.
- Sehr geringe Fronkosten (35 Fron), minimaler Unterhalt (2 Fron/min), wird in großen Scharen ausgebildet.

### 4. Fernkämpferin: Klageweib / Banshee (`klageweib`)
- Spektrale Geistergestalt im Schwebeflug mit zerrissenen Schleiern und weit geöffnetem Schrei-Mund.
- Schießt zielsuchende spektrale Kältegeschosse aus der Distanz (Reichweite 460 dm, Schaden 12).

### 5. Schwere Infanterie: Grabwächter (`grabwaechter`)
- Schwarzstahl-Harnisch, geplättete Panzerhandschuhe, Richtschwert / Henkersaxt und ein Stundenglas am Gürtel.
- Hohe Rüstung, schwere Hiebe (Schaden 22, HP 340, benötigt Götterblut).

### 6. Belagerungseinheit: Knochentitan (`knochentitan`)
- Kolossales vierbeiniges Skelett-Monstrum aus Mammut- und Riesenknochen mit einem Rammkopf aus fossilen Stoßzähnen.
- Zerschmettert Befestigungen und Gebäude (Gebäudeschaden 75, Reichweite 18 dm).

### 7. Späher: Aasgeier (`aasgeier`)
- Großer, zerfledderter Geiervogel mit kahlrotem Hals und scharfen Krallen.
- Fliegt über jedes Hindernis hinweg, schnell (Tempo 48 dm/s), deckt den Nebel des Krieges weit auf.

---

## 5. Elitäre Einheiten für die bestehenden Reiche

Um das Spätspiel und den Skillbaum zu vertiefen, erhalten Menschen und Waldgott je vier hochkarätige Elite-Einheiten:

### Menschen (Sonnenreich)
1. **Paladin des Lichts (`paladin`)**:
   - Vollständig vergoldeter Prunk-Ritter mit geschlossener Visierhaube, Löwenwappenschild und strahlendem Sonnenstreitkolben (`GLUEHT`).
   - Schocktruppe: Zieht feindliches Feuer auf sich, absorbiert massiven Schaden und teilt Flächenhiebe aus.
2. **Wagenburg (`wagenburg`)**:
   - Fahrbare schwere Festung aus Eichenbohlen mit Eisenbeschlägen auf 4 Rädern.
   - Feuert Armbrust-Salven in alle Himmelsrichtungen und bietet nahen Soldaten Deckung vor Fernkampfangriffen.
3. **Meister-Scharfschütze (`scharfschuetze`)**:
   - Elite-Armbruster mit schwerer Winden-Stahlarmbrust und Setz-Pavese.
   - Extrem hohe Reichweite (620 dm) und panzerbrechende Bolzen gegen schwere Einheiten und Helden.
4. **Lichtpriester (`priester`)**:
   - Weiß-goldene Priestergewänder, Sonnenstab und Weihrauchkessel.
   - Unterstützer: Heilt verwundete Verbündete und stabilisiert die Gegenwart im Domänennetz.

### Wald- und Wiesengott (Naturreich)
1. **Moosbär (`moosbaer`)**:
   - Monumentaler Riesen-Höhlenbär mit dichtem Moosfell, Granit-Schulterpanzern und gewaltigen Pratzen.
   - Berserker-Nahkämpfer mit enormen Lebenspunkten (HP 650), der gegnerische Formationen mit Wuchtstößen zerschlägt.
2. **Flüsterer des Dickichts (`fluesterer`)**:
   - Uralter schamanischer Geist mit geschnitzter Holztiermaske und Schlingpflanzenmantel.
   - Manipulator: Lässt Wurzelnetze unter Feinden emporwachsen und tarnt verbündete Einheiten in Baum-Nähe.
3. **Kronenhirsch (`kronenhirsch`)**:
   - Erhabener weißer Hirsch-Avatar mit einem gigantischen, sonnengolden leuchtenden Geweih.
   - Mobiler Fernkämpfer: Schleudert magische Lichtlanzen über weite Distanzen und sprintet flink über das Schlachtfeld.
4. **Dornenhydra (`dornenhydra`)**:
   - Furchterregende dreiköpfige lebende Artillerie aus sich windenden Eisenholzdornen und fleischfressenden Blütenmäulern.
   - Verschießt Salven aus ätzenden Giftstacheln, die Feinde verlangsamen und Gebäude zerfressen.

---

## 6. Ästhetische Identität im Spiel

- **Menschen**: Gotik, Mittelalter, Holz, Schiefer, gehauener Kalkstein, Eisen und leuchtendes Sonnen-Gold (`#d8b06a`).
- **Waldgott**: Lebendiges Holz, Ranken, Moos, Bernstein-Glut (`#f59e0b`), Laubgrün (`#8fb86a`) und tiefe Erdtöne.
- **Todesgott**: Dunkler Basalt (`#1e232a`), alte Knochen (`#d9d3c7`), Asche (`#3d444d`), rostiges Eisen und **kaltes smaragdgrünes / türkisblaues Seelenleuchten** (`#10b981`, `#06b6d4`, `GLUEHT`).
