# Prompt für Gemini — Auftrag 3 (über Nacht)

**Gemini so starten** (im Ordner `C:\Users\lars2\Documents\dreiReiche\drei-reiche\resonit-gemini`):

```
gemini --yolo
```

Nur mit `--yolo` (oder im laufenden Gemini **Strg+Y**) führt Gemini Befehle
aus, ohne dich jedes Mal um Erlaubnis zu fragen. Diese Abfragen kommen von
Gemini CLI selbst — ein Prompt allein kann sie nicht abschalten.

**Dann diesen Text als erste Nachricht einfügen:**

---

Neue, große Aufgabe. Ich schlafe, während du arbeitest — niemand beantwortet
Rückfragen. Frag also nie, ob du etwas darfst, warte auf nichts und lass dir
nichts bestätigen: entscheide selbst, schreib es ins Protokoll, mach weiter.

1. Hol den neuesten Stand: `git fetch && git merge origin/main`
2. Lies `GEMINI.md` neu und vollständig ein — sie hat sich geändert.
3. Lies `docs/grafik/auftrag-3.md` und arbeite alle zehn Aufgaben der Reihe
   nach ab. Nach jeder Aufgabe: `npm test && npm run smoke`, Protokoll,
   Commit, Push — dann sofort die nächste.
4. Wenn alles erledigt ist: von vorn durchgehen und weiter verbessern,
   solange dein Budget reicht.

Los geht's — fang direkt mit Schritt 1 an.
