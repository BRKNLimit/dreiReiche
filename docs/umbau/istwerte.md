# Ist-Werte der Völker

Erzeugt von `node tools/istwerte.mjs` aus `src/sim/voelker/*.js` — **nicht von Hand ändern**.
Grundlage für jeden Entwurf: Was hier steht, ist im Spiel. Änderungen in Entwürfen als „alt → neu“ angeben.

## Menschen (`mensch`)

- Domäne: growth {start:2600, max:2600, perTick:0} · Kommandant `held` · Hauptgebäude `halle`
- Rollen: anker: `grenzstein`, kraft: `schmiede`, fron: `saege`, blut: `schacht`, fabrik: `kaserne`, zorn: `banner`, wehr: `kapelle`, turm: `wachturm`, forschung: `skriptorium`, posten: `spaehposten`, bauer: `bauer`, leicht: `soldat`, fern: `jaeger`, schwer: `soeldner`, belagerung: `katapult`
- Fähigkeiten: `schlachtruf` {name:Schlachtruf, art:ruf, radius:900, dauer:150, wert:300, abklingen:900}; `schildwall` {name:Schildwall, art:wehr, radius:900, dauer:150, wert:350, abklingen:900}; `ansturm` {name:Ansturm, art:tempo, radius:900, dauer:100, wert:500, abklingen:700}

### Gebäude

| Schlüssel | name | hp | radius | cost | buildTime | gegenwartIn | gegenwartOut | fronOut | blutOut | weapon | buff | buildList | sicht | forschung | anchor | needs | schild | schlag | abwehr |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `halle` | Thingstätte | 5000 | 90 | {fron:0} | 0 |  | 24 |  |  |  |  | [bauer, soldat] | 1300 |  | true |  |  |  |  |
| `grenzstein` | Grenzstein | 800 | 48 | {fron:120} | 150 |  |  |  |  |  |  |  | 900 |  | true |  |  |  |  |
| `wachturm` | Wachturm | 3000 | 40 | {fron:300} | 250 | 10 |  |  |  | {range:900, damage:60, cooldown:4} |  |  | 1200 |  |  |  |  |  |  |
| `spaehposten` | Spähposten | 500 | 30 | {fron:90} | 120 |  |  |  |  |  |  |  | 2000 |  |  |  |  |  |  |
| `schmiede` | Schmiede | 900 | 60 | {fron:280} | 230 |  | 40 |  |  |  |  |  |  |  |  |  |  |  |  |
| `saege` | Sägewerk | 700 | 55 | {fron:150} | 170 | 14 |  | 360 |  |  |  |  |  |  |  | fron |  |  |  |
| `kaserne` | Kaserne | 1500 | 80 | {fron:400} | 340 | 55 |  |  |  |  |  | [soldat, jaeger, soeldner, katapult] |  |  |  |  |  |  |  |
| `schacht` | Blutschacht | 900 | 60 | {fron:250} | 210 | 20 |  |  | 40 |  |  |  |  |  |  | goetterblut |  |  |  |
| `banner` | Kriegsbanner | 600 | 40 | {fron:160} | 170 | 15 |  |  |  |  | {zorn:250, radius:3000} |  |  |  |  |  |  |  |  |
| `kapelle` | Kapelle | 700 | 50 | {fron:160} | 170 | 15 |  |  |  |  | {wehr:200, radius:3000} |  |  |  |  |  |  |  |  |
| `skriptorium` | Skriptorium | 900 | 55 | {fron:250} | 230 | 20 |  |  |  |  |  |  |  | 500 |  |  |  |  |  |

### Einheiten

| Schlüssel | name | hp | radius | speed | cost | unterhalt | buildTime | kampf | weapon | sicht | build | fliegt | hoechstens |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `bauer` | Bauer | 150 | 24 | 30 | {fron:40} | 3 | 80 | nah | {range:20, damage:4, cooldown:8} |  | {power:400} |  |  |
| `soldat` | Soldat | 215 | 26 | 30 | {fron:45} | 7 | 80 | nah | {range:20, damage:9, cooldown:6} |  |  |  |  |
| `jaeger` | Jäger | 180 | 24 | 32 | {fron:55} | 8 | 100 | fern | {range:480, damage:13, cooldown:8} | 1000 |  |  |  |
| `soeldner` | Söldner | 620 | 32 | 26 | {fron:130, goetterblut:10} | 18 | 190 | nah | {range:25, damage:26, cooldown:8} |  |  |  |  |
| `held` | Held | 6000 | 36 | 24 | {fron:0} |  | 0 | nah | {range:30, damage:45, cooldown:6} | 1000 | {power:1000} |  |  |
| `katapult` | Balliste | 500 | 40 | 14 | {fron:250} | 30 | 300 | fern | {range:1000, damage:8, cooldown:30, gebaeude:260, vorrang:gebaeude} | 700 |  |  |  |

### Skills

| Schlüssel | name | ast | kosten | braucht | frei | wirkung | faehigkeit |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `belagerungsbau` | Belagerungsbau | einheiten | 2 | [bogenbau] | [katapult] |  |  |
| `bogenbau` | Bogenbau | einheiten | 1 |  | [jaeger] |  |  |
| `soeldnervertraege` | Söldnerverträge | einheiten | 2 | [bogenbau] | [soeldner] |  |  |
| `kriegsbanner` | Kriegsbanner | gebaeude | 1 |  | [banner] |  |  |
| `kapellenbau` | Kapellenbau | gebaeude | 1 |  | [kapelle] |  |  |
| `klingen` | Geschliffene Klingen | verbesserung | 1 |  |  | {schaden:100} |  |
| `kettenhemden` | Kettenhemden | verbesserung | 1 | [klingen] |  | {schutz:100} |  |
| `fronvoegte` | Fronvögte | verbesserung | 1 |  |  | {foerderung:200} |  |
| `drillmeister` | Drillmeister | verbesserung | 1 | [fronvoegte] |  | {ausbildung:250} |  |
| `sold` | Sold und Ordnung | verbesserung | 2 | [drillmeister] |  | {unterhalt:250} |  |
| `heldenmut` | Heldenmut | kommandant | 1 |  |  | {kdtSchutz:200} |  |
| `schlachtruf` | Schlachtruf | kommandant | 2 | [heldenmut] |  |  | schlachtruf |
| `schildwall` | Schildwall | kommandant | 2 | [heldenmut] |  |  | schildwall |
| `ansturm` | Ansturm | kommandant | 2 | [schlachtruf] |  |  | ansturm |

## Wald- und Wiesengott (`gott`)

- Domäne: growth {start:950, max:5200, perTick:1} · Kommandant `waldgott` · Hauptgebäude `herzbaum`
- Rollen: anker: `hain`, kraft: `quelle`, fron: `moos`, blut: `blutwurz`, fabrik: `dickicht`, zorn: `dornenschrein`, wehr: `steinkreis`, turm: `waechterbaum`, forschung: `eiche`, posten: `wipfelausguck`, bauer: `dryade`, leicht: `wolf`, fern: `waldgeist`, schwer: `ent`, belagerung: `wurzelbrecher`, rabe: `rabe`
- Fähigkeiten: `wurzelgriff` {name:Wurzelgriff, art:griff, reichweite:1600, radius:600, dauer:80, abklingen:700}; `lebenssaft` {name:Lebenssaft, art:heilung, radius:900, wert:300, abklingen:900}; `rudelruf` {name:Rudelruf, art:rufen, einheit:wolf, anzahl:3, dauer:400, abklingen:1200}

### Gebäude

| Schlüssel | name | hp | radius | cost | buildTime | gegenwartIn | gegenwartOut | fronOut | blutOut | weapon | buff | buildList | sicht | forschung | anchor | needs | schild | schlag | abwehr |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `herzbaum` | Herzbaum | 5000 | 90 | {fron:0} | 0 |  | 24 |  |  |  |  | [dryade, wolf, rabe] | 1300 |  | true |  |  |  |  |
| `hain` | Hain | 600 | 48 | {fron:110} | 190 |  |  |  |  |  |  |  | 900 |  | true |  |  |  |  |
| `waechterbaum` | Wächterbaum | 3000 | 40 | {fron:300} | 250 | 10 |  |  |  | {range:900, damage:60, cooldown:4} |  |  | 1200 |  |  |  |  |  |  |
| `quelle` | Quellgrund | 800 | 60 | {fron:280} | 230 |  | 40 |  |  |  |  |  |  |  |  |  |  |  |  |
| `moos` | Moosgrube | 700 | 55 | {fron:150} | 170 | 14 |  | 360 |  |  |  |  |  |  |  | fron |  |  |  |
| `dickicht` | Dickicht | 1500 | 80 | {fron:400} | 340 | 55 |  |  |  |  |  | [wolf, waldgeist, ent, wurzelbrecher] |  |  |  |  |  |  |  |
| `blutwurz` | Blutwurz | 900 | 60 | {fron:250} | 210 | 20 |  |  | 40 |  |  |  |  |  |  | goetterblut |  |  |  |
| `dornenschrein` | Dornenschrein | 600 | 40 | {fron:160} | 170 | 15 |  |  |  |  | {zorn:450, radius:3000} |  |  |  |  |  |  |  |  |
| `steinkreis` | Steinkreis | 700 | 50 | {fron:160} | 170 | 15 |  |  |  |  | {wehr:300, radius:3000} |  |  |  |  |  |  |  |  |
| `eiche` | Raunende Eiche | 900 | 55 | {fron:250} | 230 | 20 |  |  |  |  |  |  |  | 500 |  |  |  |  |  |
| `wipfelausguck` | Wipfelausguck | 400 | 26 | {fron:70} | 90 |  |  |  |  |  |  |  | 2100 |  |  |  |  |  |  |

### Einheiten

| Schlüssel | name | hp | radius | speed | cost | unterhalt | buildTime | kampf | weapon | sicht | build | fliegt | hoechstens |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `waldgott` | Waldgott | 6000 | 40 | 22 | {fron:0} |  | 0 | fern | {range:380, damage:42, cooldown:6} | 1000 | {power:1000} |  |  |
| `dryade` | Dryade | 350 | 28 | 28 | {fron:90} | 12 | 180 | nah | {range:20, damage:8, cooldown:7} |  | {power:700} |  |  |
| `wolf` | Wolf | 540 | 30 | 34 | {fron:130} | 24 | 210 | nah | {range:20, damage:22, cooldown:6} |  |  |  |  |
| `rabe` | Rabe | 8 | 12 | 52 | {fron:35} | 2 | 60 |  |  | 1000 |  | true |  |
| `waldgeist` | Waldgeist | 480 | 30 | 26 | {fron:130} | 24 | 240 | fern | {range:520, damage:24, cooldown:8} | 1000 |  |  |  |
| `ent` | Ent | 2100 | 66 | 16 | {fron:300, goetterblut:20} | 56 | 480 | nah | {range:40, damage:52, cooldown:10} |  |  |  |  |
| `wurzelbrecher` | Wurzelbrecher | 3200 | 50 | 14 | {fron:280} | 32 | 320 | nah | {range:30, damage:12, cooldown:10, gebaeude:240, vorrang:gebaeude} |  |  |  |  |

### Skills

| Schlüssel | name | ast | kosten | braucht | frei | wirkung | faehigkeit |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `wurzelbrecher` | Wurzelbrecher wecken | einheiten | 2 | [waldgeister] | [wurzelbrecher] |  |  |
| `waldgeister` | Waldgeister rufen | einheiten | 1 |  | [waldgeist] |  |  |
| `ents` | Ents erwecken | einheiten | 2 | [waldgeister] | [ent] |  |  |
| `dornen` | Dornenschrein | gebaeude | 1 |  | [dornenschrein] |  |  |
| `steine` | Steinkreis | gebaeude | 1 |  | [steinkreis] |  |  |
| `faenge` | Scharfe Fänge | verbesserung | 1 |  |  | {schaden:100} |  |
| `borke` | Borkenhaut | verbesserung | 1 | [faenge] |  | {schutz:100} |  |
| `saftfluss` | Saftfluss | verbesserung | 1 |  |  | {foerderung:200} |  |
| `keimkraft` | Keimkraft | verbesserung | 1 | [saftfluss] |  | {ausbildung:250} |  |
| `genuegsamkeit` | Genügsamkeit | verbesserung | 2 | [keimkraft] |  | {unterhalt:250} |  |
| `rinde` | Uralte Rinde | kommandant | 1 |  |  | {kdtSchutz:200} |  |
| `wurzelgriff` | Wurzelgriff | kommandant | 2 | [rinde] |  |  | wurzelgriff |
| `lebenssaft` | Lebenssaft | kommandant | 2 | [rinde] |  |  | lebenssaft |
| `rudelruf` | Rudelruf | kommandant | 2 | [wurzelgriff] |  |  | rudelruf |

## Todesgott (`tod`)

- Domäne: growth {start:1400, max:5000, perTick:0, perTod:180} · Kommandant `todesgott` · Hauptgebäude `nekropole`
- Rollen: anker: `grabhuegel`, kraft: `seelenbrunnen`, fron: `knochenmuehle`, blut: `fleischwurz`, fabrik: `katakombe`, zorn: `pestaltar`, wehr: `ossuarium`, turm: `knochenturm`, forschung: `totenarchiv`, posten: `geisterturm`, bauer: `totengraeber`, leicht: `skelettkrieger`, fern: `klageweib`, schwer: `grabwaechter`, belagerung: `knochentitan`, rabe: `aasgeier`
- Fähigkeiten: `grabeskaelte` {name:Grabeskälte, art:griff, reichweite:1600, radius:700, dauer:90, abklingen:750}; `seelenrausch` {name:Seelenrausch, art:ruf, radius:900, dauer:140, wert:350, abklingen:900}; `knochensturm` {name:Knochensturm, art:rufen, einheit:skelettkrieger, anzahl:4, dauer:300, abklingen:1100}

### Gebäude

| Schlüssel | name | hp | radius | cost | buildTime | gegenwartIn | gegenwartOut | fronOut | blutOut | weapon | buff | buildList | sicht | forschung | anchor | needs | schild | schlag | abwehr |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `nekropole` | Nekropole | 5000 | 90 | {fron:0} | 0 |  | 24 |  |  |  |  | [totengraeber, skelettkrieger, aasgeier] | 1300 |  | true |  |  |  |  |
| `grabhuegel` | Grabhügel | 650 | 48 | {fron:115} | 160 |  |  |  |  |  |  |  | 900 |  | true |  |  |  |  |
| `knochenturm` | Knochenturm | 3000 | 40 | {fron:300} | 250 | 10 |  |  |  | {range:900, damage:60, cooldown:4} |  |  | 1200 |  |  |  |  |  |  |
| `seelenbrunnen` | Seelenbrunnen | 800 | 60 | {fron:280} | 230 |  | 40 |  |  |  |  |  |  |  |  |  |  |  |  |
| `knochenmuehle` | Knochenmühle | 700 | 55 | {fron:150} | 170 | 14 |  | 360 |  |  |  |  |  |  |  | fron |  |  |  |
| `fleischwurz` | Fleischwurz | 900 | 60 | {fron:250} | 210 | 20 |  |  | 40 |  |  |  |  |  |  | goetterblut |  |  |  |
| `katakombe` | Katakombe | 1500 | 80 | {fron:400} | 340 | 55 |  |  |  |  |  | [skelettkrieger, klageweib, grabwaechter, knochentitan] |  |  |  |  |  |  |  |
| `pestaltar` | Pestaltar | 600 | 40 | {fron:160} | 170 | 15 |  |  |  |  | {zorn:300, radius:3000} |  |  |  |  |  |  |  |  |
| `ossuarium` | Ossuarium | 700 | 50 | {fron:160} | 170 | 15 |  |  |  |  | {wehr:250, radius:3000} |  |  |  |  |  |  |  |  |
| `totenarchiv` | Totenarchiv | 900 | 55 | {fron:250} | 230 | 20 |  |  |  |  |  |  |  | 500 |  |  |  |  |  |
| `geisterturm` | Geisterturm | 380 | 26 | {fron:70} | 90 |  |  |  |  |  |  |  | 2100 |  |  |  |  |  |  |

### Einheiten

| Schlüssel | name | hp | radius | speed | cost | unterhalt | buildTime | kampf | weapon | sicht | build | fliegt | hoechstens |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `todesgott` | Todesgott | 6000 | 40 | 22 | {fron:0} |  | 0 | fern | {range:360, damage:44, cooldown:6} | 1000 | {power:1000} |  |  |
| `totengraeber` | Totengräber | 200 | 24 | 28 | {fron:50} | 5 | 90 | nah | {range:20, damage:6, cooldown:7} |  | {power:500} |  |  |
| `skelettkrieger` | Skelettkrieger | 180 | 25 | 31 | {fron:45} | 7 | 70 | nah | {range:20, damage:9, cooldown:6} |  |  |  |  |
| `aasgeier` | Aasgeier | 8 | 12 | 50 | {fron:35} | 2 | 60 |  |  | 1000 |  | true |  |
| `klageweib` | Klageweib | 220 | 26 | 27 | {fron:70} | 10 | 120 | fern | {range:460, damage:15, cooldown:7} |  |  |  |  |
| `grabwaechter` | Grabwächter | 850 | 34 | 22 | {fron:160, goetterblut:12} | 22 | 230 | nah | {range:28, damage:32, cooldown:8} |  |  |  |  |
| `knochentitan` | Knochentitan | 1800 | 52 | 14 | {fron:270} | 30 | 310 | nah | {range:32, damage:14, cooldown:10, gebaeude:250, vorrang:gebaeude} | 700 |  |  |  |

### Skills

| Schlüssel | name | ast | kosten | braucht | frei | wirkung | faehigkeit |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `klageweiber` | Klageweiber wecken | einheiten | 1 |  | [klageweib] |  |  |
| `grabwaechterweihe` | Grabwächter weihen | einheiten | 2 | [klageweiber] | [grabwaechter] |  |  |
| `titanenform` | Knochentitan formen | einheiten | 2 | [klageweiber] | [knochentitan] |  |  |
| `pestweihe` | Pestaltar | gebaeude | 1 |  | [pestaltar] |  |  |
| `beinhaus` | Ossuarium | gebaeude | 1 |  | [ossuarium] |  |  |
| `pestodem` | Pestodem | verbesserung | 1 |  |  | {schaden:100} |  |
| `knochenhaertung` | Knochenhärtung | verbesserung | 1 | [pestodem] |  | {schutz:100} |  |
| `seelenernte` | Seelenernte | verbesserung | 1 |  |  | {foerderung:200} |  |
| `grabeskuehle` | Grabeskühle | verbesserung | 1 | [seelenernte] |  | {ausbildung:250} |  |
| `ewigerDienst` | Ewiger Dienst | verbesserung | 2 | [grabeskuehle] |  | {unterhalt:250} |  |
| `nekromantie` | Nekromantische Aura | kommandant | 1 |  |  | {kdtSchutz:200} |  |
| `grabeskaelte` | Grabeskälte | kommandant | 2 | [nekromantie] |  |  | grabeskaelte |
| `seelenrausch` | Seelenrausch | kommandant | 2 | [nekromantie] |  |  | seelenrausch |
| `knochensturm` | Knochensturm | kommandant | 2 | [grabeskaelte] |  |  | knochensturm |
