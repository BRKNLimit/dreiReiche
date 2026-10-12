# Resonit — Technisches Datenmodell

Spezifikation der Datenstrukturen für die deterministische Integer-Simulation in `src/sim/`.

---

## 1. Ressourcen

```javascript
export const RESOURCES = {
  // Lagerbarer Bestand. Wird von Extraktoren gefördert und in Chassis/Module verbaut.
  masse: { typ: 'bestand', maxStart: 2000 },
  // Flussressource pro Tick (10 Ticks = 1 Sekunde). Nicht global speicherbar.
  energie: { typ: 'fluss', speicher: 'regional' },
  // Strategisches Mineral. Nur durch Besetzen von Resonit-Quellen auf der Karte.
  resonit: { typ: 'strategisch', gebunden: true },
};
```

---

## 2. Rümpfe (Chassis)

Ein Chassis definiert den nackten Fahrzeug- oder Schiffskörper. Es besitzt eigene Lebenspunkte, Panzerung, Höchstgeschwindigkeit, Wenderate und Hardpoint-Slots.

```javascript
export const CHASSIS = {
  // Terran Vanguard
  vanguard_picket: {
    faction: 'vanguard',
    name: 'Picket (PK-2)',
    klasse: 'leicht',
    domaene: 'boden',
    hp: 450,
    speed: 32, // dm/s
    masse: 120,
    slots: [
      { id: 's1', typ: 'klein', pos: [0, 12, 0] },
    ],
    crewSlots: 1,
  },
  vanguard_palisade: {
    faction: 'vanguard',
    name: 'Palisade (PL-4)',
    klasse: 'mittel',
    domaene: 'boden',
    hp: 1200,
    speed: 20,
    masse: 350,
    slots: [
      { id: 's1', typ: 'gross', pos: [0, 16, 0] },
      { id: 's2', typ: 'klein', pos: [8, 12, -4] },
    ],
    crewSlots: 2,
  },
  vanguard_redoubt: {
    faction: 'vanguard',
    name: 'Redoubt (RD-7)',
    klasse: 'schwer',
    domaene: 'boden',
    hp: 3800,
    speed: 13,
    masse: 1100,
    slots: [
      { id: 's1', typ: 'gross', pos: [-8, 20, 0] },
      { id: 's2', typ: 'gross', pos: [8, 20, 0] },
      { id: 's3', typ: 'klein', pos: [-12, 14, -8] },
      { id: 's4', typ: 'klein', pos: [12, 14, -8] },
    ],
    crewSlots: 4,
    ketten: 4, // Geschwindigkeitsverlust stufenweise je Kettenschaden
  },

  // Kranor Deep-Union
  kranor_auger: {
    faction: 'kranor',
    name: 'Auger',
    klasse: 'leicht',
    domaene: 'boden',
    hp: 550,
    speed: 26,
    masse: 140,
    slots: [{ id: 's1', typ: 'klein' }],
  },
  kranor_ripper: {
    faction: 'kranor',
    name: 'Ripper',
    klasse: 'mittel',
    domaene: 'boden',
    hp: 1600,
    speed: 18,
    masse: 480,
    slots: [{ id: 's1', typ: 'gross' }],
  },
  kranor_dragline: {
    faction: 'kranor',
    name: 'Dragline',
    klasse: 'schwer',
    domaene: 'boden',
    hp: 5200,
    speed: 8,
    masse: 1600,
    slots: [
      { id: 's1', typ: 'gross' },
      { id: 's2', typ: 'gross' },
    ],
  },
};
```

---

## 3. Module (Hardpoint-Aufsätze)

Module werden in Werkstätten auf die Slots der Chassis montiert.

```javascript
export const MODULES = {
  // Vanguard Waffen
  kanone_90mm: {
    name: '90 mm Kanone',
    slot: 'gross',
    art: 'waffe',
    schaden: 85,
    reichweite: 2800, // dm (280 m)
    kadenz: 14, // Ticks zwischen Schüssen
    energieBedarf: 0,
    ballistik: 'flach',
  },
  haubitze_140mm: {
    name: '140 mm Kurzhaubitze',
    slot: 'gross',
    art: 'waffe',
    schaden: 140,
    radius: 400, // Flächenschaden
    reichweite: 4200,
    kadenz: 30,
    energieBedarf: 5,
    ballistik: 'bogen',
  },
  coilgun: {
    name: 'Schwere Coilgun',
    slot: 'gross',
    nurChassis: ['vanguard_redoubt'],
    art: 'waffe',
    schaden: 420,
    reichweite: 7500,
    kadenz: 65,
    energieBedarf: 120, // Benötigt massiven Energieschub
    energiePuffer: 120,
  },
  moerser: {
    name: 'Mörser',
    slot: 'klein',
    art: 'waffe',
    schaden: 60,
    mindestReichweite: 800,
    reichweite: 3200,
    kadenz: 22,
    ballistik: 'steil',
  },
  lenkrakete: {
    name: 'Lenkraketen-Pod',
    slot: 'klein',
    art: 'waffe',
    schaden: 90,
    reichweite: 6000,
    kadenz: 45,
    brauchtSpotter: true, // Trifft nur mit markiertem Ziel!
  },

  // Vanguard Support
  radarmast: {
    name: 'Radarmast',
    slot: 'klein',
    art: 'support',
    sichtPlus: 3500,
    radarReichweite: 9000,
    feuerleitNetz: true, // Markiert Ziele für Mörser/Schlachtschiffe
    energieDauer: 8, // Energieverbrauch pro Sekunde
  },
  bergungskran: {
    name: 'Bergungskran',
    slot: 'klein',
    art: 'support',
    bergung: true,
    bergungsRate: 40, // Masse/Sekunde aus Wracks
    crewRettung: true,
  },
  kondensator: {
    name: 'Kondensator-Pack',
    slot: 'klein',
    art: 'support',
    energieKapazitaet: 300, // Lokaler Puffer gegen Netzdrosselung
  },

  // Kranor Anbaugeräte
  brechschaufel: {
    name: 'Hydraulische Brechschaufel',
    slot: 'gross',
    art: 'waffe',
    schaden: 180,
    reichweite: 240, // Nahkampf
    schildIgnorieren: 400, // 40 % Schaden geht direkt durch Schilde
    kadenz: 12,
  },
  bohrkopf: {
    name: 'Industrie-Bohrkopf',
    slot: 'gross',
    art: 'support',
    tunnelGraben: true, // Erlaubt das Anlegen von Tunneln
    schaden: 90,
  },
};
```

---

## 4. Wrack-System (Masse & Beute)

Bei Zerstörung eines Fahrzeugs entsteht ein `wrack`-Objekt.

```javascript
export function erzeugeWrack(world, einheit) {
  return {
    id: world.nextId++,
    kind: 'wrack',
    x: einheit.x,
    y: einheit.y,
    rot: einheit.rot,
    chassis: einheit.chassis,
    masseRest: (einheit.masse * 0.75) | 0, // 75 % Masse rückgewinnbar
    module: einheit.module.slice(), // Von Rostbrut plünderbar!
    besatzungUeberlebt: einheit.faction === 'vanguard' && Math.random() < 0.65,
    veteranenStufe: einheit.crewExperience || 0,
  };
}
```

---

## 5. Regionales Energienetzwerk

Jedes Gebäude meldet seine Erzeugung und seinen Verbrauch an den lokalen Netzknoten.

```javascript
export function netzBerechnen(world, player) {
  // 1. Zusammenhängende Teilgraphen (Regionen) über Leitungsradien ermitteln
  // 2. Erzeugung vs. Verbrauch je Region bilanzieren
  // 3. Bei Defizit: Drosselungsfaktor ermitteln (Brownout-Kaskade):
  //    - Fabriken zuerst (0.1 .. 1.0)
  //    - Radar / Schilde (Abschaltung wenn < 50 % Deckung)
  //    - Geschütze zuletzt
}
```
