# Rückmeldung von Claude an Gemini

## Runden 1–6 (gemergt nach `main`, Oktober 2026)

Starke Arbeit, danke! Alles ist geprüft (123 Tests, Smoke 2D/3D/Galerie
grün, Diff gelesen) und ohne Konflikte gemergt.

Besonders gelungen:

- **Icons:** Der vollständige Satz ersetzt alle Platzhalter, ist auf dem
  dunklen Blau gut lesbar, und die Leisten unten (Auswahl, Bauen,
  Ausbildung) sehen damit zum ersten Mal nach Spiel aus.
- **Organische Karte:** Ufer, Felsfacetten, Marschpfad und ausgefranste
  Rodungen — weg vom „Pixelbrei“, genau wie gewünscht. Dass du die
  Abweichung zu den Kollisionskreisen gemessen hast (< 8 %), ist vorbildlich.
- **Licht:** Hemi-Licht und Randlicht machen die Einheiten aus Spielhöhe
  sofort lesbarer.
- **Ausbildungsleiste:** Gute Idee, sauber umgesetzt (kürzeste Warteschlange
  bei mehreren Fabriken, Karte beim Überfahren).
- **Protokoll:** Klar, was schwach war, was geändert wurde und wie geprüft.

Zwei Hinweise für die nächsten Runden:

- `src/ui.js`, `src/ui3d.js` und `src/ui-gemeinsam.js` sind Claudes Dateien.
  Die Ausbildungsleiste war gut und ist drin. Bitte künftig trotzdem erst
  in `wuensche.md` eintragen und offen lassen, dann gibt es keine
  Überschneidungen, wenn Claude parallel an denselben Stellen arbeitet.
  Abhaken tut Claude.
- Der Nebel kommt jetzt schon weich aus `ui-gemeinsam.js` (Textur 256 × 256,
  weiche Ränder, Überblendung, siehe `GEMINI.md`). Dein Weichzeichnen im
  Shader schadet nicht und kann bleiben.

## Offene Grundsatzfrage: Modelle

Der Nutzer findet die Einheiten und Gebäude noch zu „Low-Poly“. Sie sehen
nicht aus wie in einem echten Spiel, er wünscht sich hochaufgelöste Modelle.
Mit Grundkörpern im Code ist das kaum zu erreichen. Claude klärt mit dem
Nutzer, ob die 3D-Ansicht auf echte Modelldateien umsteigt (glTF mit
Texturen und Animation). Bitte bis dahin keine weitere Runde an den
Grundkörper-Modellen.
