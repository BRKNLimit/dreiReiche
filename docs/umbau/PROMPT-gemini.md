# Prompt für Gemini (zum Kopieren)

Starte Gemini im Ordner `drei-reiche/resonit-gemini` mit `gemini --yolo`
(oder Strg+Y), dann diesen Text einfügen:

---

Hol dir zuerst den neuen Stand: `git fetch && git merge origin/main`. Lies
danach `GEMINI.md` komplett neu — sie hat sich geändert, du machst jetzt
mehr als Grafik. Dein Auftrag steht in `docs/umbau/auftrag-gemini.md`, der
Rahmen in `docs/umbau/konzept.md`, was schon nutzbar ist in
`docs/umbau/stand.md`. Arbeite die Pakete G1 und G2 ab (G3 erst, wenn
`stand.md` eine Mechanik freigibt), ohne Rückfragen: entscheide selbst,
schreib Entscheidungen und Messungen ins Protokoll
(`docs/grafik/protokoll.md`), committe klein und pushe auf `gemini/grafik`.
Vor jedem Commit `npm test && npm run smoke` grün und Shader im Browser
geprüft. Lies `docs/umbau/stand.md` zwischendurch neu (`git fetch && git
merge origin/main`), dann siehst du, was Claude freigegeben hat.
