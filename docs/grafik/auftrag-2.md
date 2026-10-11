# Auftrag 2 für Gemini: alle Modelle auf G.2-Niveau

Diesen Text als erste Nachricht an Gemini geben. Gemini CLI im Ordner
`C:\Users\lars2\Documents\dreiReiche\drei-reiche\resonit-gemini` starten, und
zwar **mit `gemini --yolo`** (oder im laufenden Gemini **Strg+Y**). Dann führt
Gemini Befehle aus, ohne jedes Mal um Erlaubnis zu fragen. Der Ordner ist
Geminis eigene Kopie auf einem eigenen Branch; Claude prüft alles vor dem
Merge.

---

Du bist der Grafik-Entwickler für das Browser-RTS „Die drei Reiche“. Lies
zuerst `GEMINI.md` vollständig (besonders „Arbeitsweise“ und „Stil“), dann
`docs/grafik/rueckmeldung.md` und dieses Dokument.

**Arbeite ohne Rückfragen, von Anfang bis Ende.** Frag nicht, ob du etwas
tun darfst, frag nicht nach Bestätigung, warte auf nichts. Entscheide selbst,
halte die Entscheidung im Protokoll fest und mach weiter. Du bist fertig, wenn
alle Aufgaben unten erledigt, getestet, committet und gepusht sind — danach
gehst du jede Aufgabe noch einmal durch und machst sie besser, solange dein
Budget reicht.

Hol dir zuerst den neuesten Stand: `git fetch && git merge origin/main`.

## Der Maßstab: Waldgott G.2 und der Rabe

Der Nutzer hat **G.2 Glutherz** als Stil gewählt. G.2 und dein Rabe sind
das Niveau, auf das jetzt **jedes** Modell kommt — Einheiten und Gebäude:

- Fließende Formen aus vielen Segmenten statt gestapelter Klötze; Kegel und
  Zylinder mit 8–12 Segmenten, Teile leicht gedreht und geneigt.
- Echte Anatomie: Gliedmaßen mit Gelenken, Hände, Köpfe mit Gesicht oder
  Maske, Kleidung mit Falten und Saum.
- Akzente, die leuchten (`GLUEHT`), sparsam und gezielt: Augen, Glut, Runen.
- Klare Silhouette aus Spielhöhe (etwa 60 px hoch), Fraktionsfarbe sichtbar.
- Budget je Modell: Einheiten 6000 Ecken, Gebäude 9000 (Test prüft das).

## Aufgaben

**1. Kein Schwanken mehr.** In der Galerie schwanken alle Modelle, „als wären
sie besoffen“ (Zitat Nutzer). In der Galerie stehen Modelle **still**; nur
wer will, schaltet über einen Knopf „Gehen“ die Gehbewegung zu. Im Spiel
bewegt sich nur, wer läuft — und dann laufen **Beine**, nicht der ganze
Körper. Nur der Waldgott atmet im Stand.

**2. Beine und echter Gang.** Menschen gehen auf zwei Beinen, die sich
abwechselnd vorwärts bewegen (linkes und rechtes Bein gegenphasig), Wölfe und
der Wurzelbrecher auf vier (diagonal gegenphasig), der Ent auf zwei langen
Baumbeinen. Kein Verschieben wie Schachfiguren. Die Schrittphase kommt wie
bisher als `schritt` (−1..1) aus `ui3d.js`; wie du daraus im Shader die Beine
bewegst (Seite aus der Lage im Modell, Kennung über Teamwert-Bereiche wie
beim Waldgott), entscheidest du. Brauchst du von `ui3d.js` etwas Neues: in
`wuensche.md`.

**3. Menschen menschlicher.** Bauer, Soldat, Jäger, Söldner: zwei Beine,
Rumpf, Arme, Kopf, passende Ausrüstung (Bauer Werkzeug und Hut, Soldat Helm,
Schild und Speer, Jäger Bogen und Köcher, Söldner schwere Rüstung und
Zweihänder). Mittelalter: Holz, Leinen, Leder, Eisen.

**4. Held pompöser.** Der Kommandant der Menschen: glänzende verzierte
Rüstung mit goldenen Kanten, langer Umhang, Helm mit Federbusch oder Krone,
großes Schwert, Wappen auf Brust oder Schild. Er soll neben dem Waldgott
bestehen.

**5. Gott-Einheiten nach Vorlage** (Bilder in `docs/bilder/vorlagen/`, nur
lokal — lesbare Fassungen: `.jpg` und `.png`):
- **Ent** (`Ent-Vorlage.webp`): sehr hoher, hagerer Baumriese in
  Menschengestalt — lange Beine und Arme aus Holz, Rindenfasern, Moos,
  Astgeweih statt Krone an Schultern und Kopf, leere Augen. Er geht.
- **Dryade** (`Vorlage-Dryade.webp`): schlanke Frauengestalt aus Rinde und
  Wurzeln, langes Wurzelhaar, das Gewand läuft unten in Wurzeln aus.
- **Wolf** (`Wolf-Vorlage.jpg`): großer, dunkelbrauner, zotteliger Wolf mit
  Mähne, bernsteinfarbenen Augen, vier Beinen mit Gelenken.
- **Wurzelbrecher** (`Wurzelbrecher-Vorlage.jpg`): massiges vierbeiniges
  Holz-Ungetüm, gebeugt, mit Astzacken auf dem Rücken, dicken Wurzelbeinen,
  moosgrün-gelblich.
- **Waldgeist** (`Waldgeist-Vorlage.png`): elfenhafte Bogenschützen in
  Laubgewändern — **vier Jahreszeiten-Varianten** als eigene Modelle:
  `waldgeist_fruehling` (frisches Grün), `waldgeist_sommer` (Gold),
  `waldgeist_herbst` (Orange-Rot), `waldgeist_winter` (Eisblau, Frost).
  `waldgeist` selbst bleibt als Standard (z. B. der Frühling). Die Oberfläche
  wählt die Variante je Einheit (das hat Claude schon eingebaut); in der
  Galerie zeigst du alle vier nebeneinander.
- **Waldgott:** G.2 bleibt, nur das Schwanken weg (Aufgabe 1).

**6. Balliste statt Katapult.** Die Belagerungseinheit der Menschen heißt
jetzt Balliste (`katapult` bleibt der Schlüssel). Modell nach
`Balliste-Vorlage.jpg`: fahrbare Holzballiste mit gebogenem Bogen, Seilen,
Eisenbeschlägen, großem Bolzen, vier Rädern, Kurbel.

**7. Alles andere auf dasselbe Niveau.** Alle Gebäude beider Seiten, der
Rabe bleibt wie er ist. Gebäude der Menschen: Fachwerk, Stein, Holz, Dächer
mit Schindeln; des Gottes: gewachsen, Rinde, Wurzeln, golden glühende
Akzente.

**8. Icons nachziehen**, wo sich ein Modell stark verändert hat (Balliste,
Held), und ein Icon je Waldgeist-Jahreszeit ist nicht nötig.

Nach jeder Aufgabe: `npm test && npm run smoke` (ein Aufruf), Protokoll in
`docs/grafik/protokoll.md`, Commit, Push. Nicht auf Claude oder den Nutzer
warten.
