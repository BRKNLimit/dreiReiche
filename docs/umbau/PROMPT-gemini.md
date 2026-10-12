# Prompt für Gemini (zum Kopieren)

Starte Gemini im Ordner `drei-reiche/resonit-gemini` mit `gemini --yolo`
(oder Strg+Y), dann diesen Text einfügen:

---

Neue Richtung: Das Spiel wird **Resonit** (dein Sci-Fi-Kompendium), gebaut
auf dem Kern dieses Repos. Hol dir zuerst den neuen Stand:
`git fetch && git merge origin/main`. Lies danach neu: `GEMINI.md`,
`docs/resonit/plan.md` und deinen Auftrag `docs/resonit/auftrag-gemini.md`
(Meilenstein 1: Vanguard gegen Kranor — S1 Daten, S2 Grafik, S3 Galerie,
S4 Wünsche). Die Fantasy-Runde 2 entfällt. Ohne Rückfragen: entscheide
selbst, schreib Entscheidungen und Messungen vollständig ins Protokoll
(`docs/grafik/protokoll.md`), committe klein und pushe auf `gemini/grafik`.
Vor jedem Commit `npm test && npm run smoke` grün und die Galerie im Browser
geprüft. Messen nur mit
`node tools/sweep.mjs 36 45 Ausgang stile voelker=vanguard-kranor`.
