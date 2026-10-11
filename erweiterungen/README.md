# Das Dritte Reich: Der Todesgott & Elitäre Einheiten

Dieses Verzeichnis enthält das vollständige Konzept, alle 3D-Modelle, SVG-Icons, 2D-Figuren und Simulationswerte für die geplante Erweiterung von **Die drei Reiche**:
1. **Das Dritte Reich: Der Todesgott (Die Knochenwacht / Das Totenreich)** — die dritte spielbare Fraktion, die den Dreier-Konflikt vervollständigt.
2. **Elitäre Einheiten & Erweiterungen** für die beiden bestehenden Reiche:
   - **Menschen**: *Paladin*, *Wagenburg*, *Meister-Scharfschütze*, *Lichtpriester*.
   - **Wald- und Wiesengott**: *Moosbär*, *Flüsterer des Dickichts*, *Kronenhirsch*, *Dornenhydra*.

---

## Übersicht der Dateien

| Datei | Inhalt |
| --- | --- |
| `KONZEPT_DRITTES_REICH.md` | Tiefgehendes Spieldesign- und Lore-Dokument: Philosophie, die Friedhofs-Domäne, Drosselleiter, Spielweise im Dreier-Konflikt. |
| `EINHEITEN_UND_GEBAEUDE.md` | Detaillierter Einheiten- und Gebäudekatalog mit Stats, Rollen, Kosten, Unterhalt, Reichweiten und Fähigkeiten. |
| `sim_defs.js` | Fertige JavaScript-Definitionen (`UNITS`, `BUILDINGS`, `FAEHIGKEITEN`, `SKILLS`) im Format von `src/sim/defs.js` für Claudes Spielsimulation. |
| `modelle.js` | Vollständige, hochauflösende 3D-Modelle (im WebGL2-Format von `src/modelle3d.js`) für alle Einheiten, den Todesgott und alle 10 Gebäude. |
| `icons.js` | Handgefertigte SVG-Icons (`viewBox="0 0 24 24"`) für alle neuen Einheiten, Gebäude und Fähigkeiten (lesbar auf `#021722`). |
| `figuren2d.js` | 2D-Zeichenroutinen für die taktische Draufsicht (`src/figuren2d.js`). |

---

## Kernphilosophie des Todesgotts

Wie in `docs/konzept.md` festgeschrieben:
> *„Drei Mächte teilen sich ein Land, unter dem etwas Älteres liegt. Keine von ihnen ist böse, und genau daraus entsteht der Konflikt.“*

- **Die Menschen** kämpfen ums Überleben und müssen roden.
- **Der Wald- und Wiesengott** verteidigt das Lebendige und nimmt die Natur zurück.
- **Der Todesgott** wartet und folgt dem Krieg. Er ist kein blutrünstiger Dämon, sondern die unumstößliche Ruhe nach dem Sturm: Die Asche, die Knochen, das Ausklingen aller Qual.

### Die eine Regel: Friedhofs-Wachstum
Die Asymmetrie aller drei Reiche beruht auf derselben Variablen — wie der Anker-Radius wächst:
- **Menschen (Grenzstein)**: Fester Radius ab Bauende. Planbar, überall sofort gleich groß.
- **Waldgott (Hain)**: Wächst kontinuierlich mit der Zeit. Früh schwach, spät gewaltig.
- **Todesgott (Grabhügel)**: Startet minimal und **wächst ausschließlich durch gefallene Einheiten im Umkreis**. Wo kein Blut floss, herrscht Leere. Doch dort, wo die Menschen und der Waldgott um eine Götterblutader ringen, entfaltet das Totenreich blitzschnell seine mächtige Domäne.
