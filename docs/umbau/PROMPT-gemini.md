# Prompt für Gemini (zum Kopieren)

Starte Gemini im Ordner `drei-reiche/resonit-gemini` mit `gemini --yolo`
(oder Strg+Y), dann diesen Text einfügen:

---

Hol dir zuerst den neuen Stand: `git fetch && git merge origin/main`. Lies
danach neu: `GEMINI.md`, `docs/grafik/rueckmeldung.md` (oben: Rückmeldung zu
deinen Runden 26–28 — bitte ernst nehmen), `docs/umbau/stand.md` und
`docs/umbau/istwerte.md`. Dein Auftrag ist „Runde 2“ in
`docs/umbau/auftrag-gemini.md`: G2b, G3a, Messen, G4. Ohne Rückfragen:
entscheide selbst, schreib Entscheidungen und Messungen vollständig ins
Protokoll (`docs/grafik/protokoll.md`), committe klein und pushe auf
`gemini/grafik`. Vor jedem Commit `npm test && npm run smoke` grün und die
Galerie im Browser geprüft. Ist-Werte nur aus `docs/umbau/istwerte.md`
(nach Änderungen an den Volksdateien neu erzeugen: `node tools/istwerte.mjs`).
Messen nur mit `node tools/sweep.mjs 36 45 Ausgang stile voelker=…`, alle
drei Paarungen.
