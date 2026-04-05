# Ephemeris Redesign — Konzeptpapier

**Date:** 2026-04-05
**Status:** Draft — Review Required
**Scope:** Komplettes UI/UX Redesign der Ephemeris Platform

---

## 1. Was Ephemeris ist

Ephemeris ist eine **eigenständige Fleet Compliance Intelligence Platform** innerhalb von Caelex. Sie ist nicht nur für Satelliten — sie trackt, forecasted und simuliert Compliance für alle 7 EU Space Act Operator-Typen: Spacecraft Operators, Launch Operators, Launch Site Operators, In-Space Service Operators, Capacity Providers, Data Providers, und Telecommand/Control Operators.

**Kernversprechen:** "Wir sagen dir WANN du non-compliant wirst, WARUM, und WAS du dagegen tun kannst — bevor es passiert."

---

## 2. Design-Sprache

**Hintergrund:** Pure Black `#000000`
**Cards:** `rgba(255,255,255,0.03)` mit `1px solid rgba(255,255,255,0.06)`, Radius 16px
**Text:** Weiß in 4 Abstufungen (0.9 / 0.5 / 0.3 / 0.25)
**Zahlen:** Groß, light (weight 300), Monospace
**Farbe:** Nur als Daten-Indikator (6px Dots: grün/amber/rot), nie als Design-Akzent
**Logo:** Weißes Quadrat mit schwarzem "e"
**Font:** Inter für UI, JetBrains Mono für Daten

Ephemeris ist eine **eigene App** — eigene Sidebar, eigenes Layout, losgelöst vom Caelex Dashboard. "← Back to Caelex" Link am Sidebar-Ende.

---

## 3. Naming-Korrektur

Das aktuelle Naming ist Satelliten-zentrisch. Das neue Naming ist operator-agnostisch:

| Alt                     | Neu                                                     |
| ----------------------- | ------------------------------------------------------- |
| Fleet Overview          | Fleet Overview (bleibt — "Fleet" umfasst alle Entities) |
| Satellite Card          | Entity Card                                             |
| Satellite Detail        | Entity Detail                                           |
| NORAD ID                | Entity ID (NORAD ID als Sub-Label für SCO)              |
| Satellite Name          | Entity Name                                             |
| Fleet Score             | Fleet Score (bleibt)                                    |
| Type Filter: SCO / LO   | Type Filter: Alle 7 Typen                               |
| "Satellite Detail Page" | Entity Intelligence                                     |

---

## 4. Informationsarchitektur

### Sidebar Navigation

```
[e] Logo

Fleet Overview              (Startseite)
Entity Intelligence         (Detail pro Entity, nicht in Sidebar — via Klick)
Alerts                  12  (Badge mit Count)
Forecast
Scenario Builder            (Forge)
Dependencies
Space Weather               (NEU)

──

← Back to Caelex
```

### Seitenstruktur

```
/dashboard/ephemeris                    → Fleet Overview (Startseite)
/dashboard/ephemeris/alerts             → Alerts Vollansicht
/dashboard/ephemeris/forecast           → Fleet-weiter Forecast
/dashboard/ephemeris/forge              → Scenario Builder
/dashboard/ephemeris/dependencies       → Cross-Type Dependencies
/dashboard/ephemeris/weather            → Space Weather (NEU)
/dashboard/ephemeris/[entityId]         → Entity Intelligence (Detail)
/dashboard/ephemeris/[entityId]/forecast → Entity Forecast
/dashboard/ephemeris/[entityId]/cascade  → Entity Cascade Analysis
```

---

## 5. Seiten-Konzepte

### 5.1 Fleet Overview (Startseite)

Die wichtigste Seite. Der Operator sieht seine gesamte Flotte auf einen Blick.

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  FLEET OVERVIEW                        Updated 14:32 ↻  │
│                                                         │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌───────┐│
│  │ SCORE  │ │HORIZON │ │ALERTS  │ │ SIZE   │ │ TREND ││
│  │   87   │ │  142d  │ │   3    │ │   12   │ │  ↑4.2 ││
│  └────────┘ └────────┘ └────────┘ └────────┘ └───────┘│
│                                                         │
│  ┌─────────────────────────────┐ ┌─────────────────────┐│
│  │                             │ │                     ││
│  │      ORBITAL TWIN           │ │   COMPLIANCE        ││
│  │      (3D Globe)             │ │   HEATMAP           ││
│  │                             │ │   (Kalender)        ││
│  │  Entities auf Orbits        │ │   Deadlines/Monat   ││
│  │  Farbe = Compliance         │ │   farbkodiert       ││
│  │  Klick = Detail             │ │                     ││
│  │                             │ │                     ││
│  └─────────────────────────────┘ └─────────────────────┘│
│                                                         │
│  ┌──────────────────────────────────────────────────────┐│
│  │  FLEET TABLE                                        ││
│  │                                                      ││
│  │  Filter: [All Types ▾] [All Status ▾] [Search...]   ││
│  │                                                      ││
│  │  TYPE  NAME           SCORE  HORIZON  STATUS  ALERTS ││
│  │  SCO   ALPHA-1          92    ∞       ●       0     ││
│  │  SCO   BETA-3           67    142d    ●       2     ││
│  │  LO    ARIANE-6-L12     81    365d    ●       0     ││
│  │  LSO   KOUROU-ELA3      94    ∞       ●       0     ││
│  │  ISOS  SERVICER-1       45    30d     ●       3     ││
│  │                                                      ││
│  └──────────────────────────────────────────────────────┘│
│                                                         │
│  ┌──────────────────────┐ ┌────────────────────────────┐│
│  │  INTELLIGENCE        │ │  AI ADVISOR                ││
│  │                      │ │                            ││
│  │  Risk Distribution   │ │  "BETA-3 wird in 90 Tagen ││
│  │  ████████░░ 67% NOM  │ │   Insurance non-compliant. ││
│  │  ███░░░░░░░ 25% WAR  │ │   Renewal jetzt starten." ││
│  │  █░░░░░░░░░  8% CRI  │ │                            ││
│  │                      │ │  "SERVICER-1 hat 3 offene  ││
│  │  Weakest Links       │ │   Critical Alerts. Sofort  ││
│  │  1. SERVICER-1  45   │ │   handeln."                ││
│  │  2. BETA-3      67   │ │                            ││
│  │                      │ │  [Ask Ephemeris AI →]      ││
│  └──────────────────────┘ └────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

**Neue Elemente:**

**Orbital Twin (3D Globe)**

- Three.js Globe mit Entities auf ihren Orbits (für SCO)
- Entities als farbige Dots (Compliance-Status)
- Klick auf Entity → navigiert zu Entity Intelligence
- Nicht-orbitale Entities (LSO, Ground-basiert) als Punkte auf der Erdoberfläche
- Optional: Orbit-Trails als dünne Linien
- Rotate/Zoom via Maus
- Kann minimiert/maximiert werden

**Compliance Deadline Heatmap**

- Kalender-Grid (nächste 12 Monate)
- Jeder Tag/Woche farbkodiert nach Deadline-Dichte und Kritikalität
- Hover → zeigt welche Deadlines
- Klick → öffnet Detail

**AI Advisor Panel**

- Proaktive Empfehlungen basierend auf Fleet-Daten
- Auto-generiert bei jedem Page Load
- Top 3 Insights, sortiert nach Urgency
- "Ask Ephemeris AI →" Button öffnet ASTRA mit Ephemeris-Kontext

### 5.2 Entity Intelligence (Detail)

Wenn ein Operator auf eine Entity klickt (egal ob Satellit, Launch Vehicle, oder Ground Station), öffnet sich die Entity Intelligence Seite.

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│  ← Fleet    ENTITY NAME    NORAD 55001    SCO           │
│                                                         │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌───────┐│
│  │ SCORE  │ │HORIZON │ │ TREND  │ │ALERTS  │ │MODULES││
│  │   67   │ │  142d  │ │  ↓2.1  │ │   2    │ │  8    ││
│  └────────┘ └────────┘ └────────┘ └────────┘ └───────┘│
│                                                         │
│  ┌──── Forecast ── Modules ── Scenarios ── Cascade ────┐│
│  │                                                      ││
│  │  [Aktiver Tab Content]                               ││
│  │                                                      ││
│  └──────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

**Tabs:**

1. **Forecast** — P10/P50/P90 Kurven, Breach-Prediction, Compliance Timeline, Module Forecast Table (wie jetzt, aber im neuen Design)

2. **Modules** — Compliance-Module als Karten statt Tabelle. Jede Karte zeigt: Modul-Name, Score-Ring (kreisförmig), Status, Trend-Pfeil, Schwächster Faktor. Expandierbar für Faktor-Details.

3. **Scenarios** — Forge (React Flow Canvas). Komplett eigener Modus — Sidebar und Header verschwinden, Forge füllt den gesamten Viewport.

4. **Cascade** — Regulatorische Kaskaden-Simulation. "Was passiert wenn Art. 68 sich ändert?" → zeigt Impact auf alle Module.

### 5.3 Alerts (Vollansicht)

Eigene Seite statt Sidebar-Tab. Zeigt alle Alerts über die gesamte Flotte.

**Layout:**

```
┌──────────────────────────────────────────────────────────┐
│  ALERTS                                    12 active     │
│                                                          │
│  [Critical 3] [High 4] [Medium 3] [Low 2] [All]         │
│                                                          │
│  ┌──────────────────────────────────────────────────────┐│
│  │ ● CRITICAL  SERVICER-1    Fuel Below 10%            ││
│  │             Art. 70       Breach in 14 days          ││
│  │             [Acknowledge] [View Entity →]            ││
│  ├──────────────────────────────────────────────────────┤│
│  │ ● CRITICAL  BETA-3        Insurance Expiring         ││
│  │             Art. 28       Breach in 30 days          ││
│  │             [Acknowledge] [View Entity →]            ││
│  ├──────────────────────────────────────────────────────┤│
│  │ ● HIGH      ALPHA-1       Attestation Expiring       ││
│  │             ...                                      ││
│  └──────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────┘
```

**Neu:** Acknowledge-Funktion. Alerts können bestätigt werden ohne sie zu resolven.

### 5.4 Fleet Forecast

Eigene Seite für fleet-weiten Forecast (aktuell nur pro Entity).

**Zeigt:**

- Fleet Score Prognose über 30d/90d/180d/1y
- Welche Entities zuerst breachen (Timeline)
- Aggregierte Breach-Wahrscheinlichkeit
- "Wenn keine Aktion → Fleet Score in 90d: 52 (aktuell: 87)"

### 5.5 Space Weather (NEU)

Eigene Seite für Space Weather Monitoring.

**Zeigt:**

- Aktueller F10.7 Solar Flux Index
- Kp Geomagnetic Index
- NOAA Scales (G/S/R Stufen)
- Space Weather Events (Geomagnetic Storms, Solar Radiation, Radio Blackouts)
- **Impact auf Fleet:** "Geomagnetischer Sturm G3 → Erhöhter atmosphärischer Drag → LEO-Satelliten verlieren 0.2km/Tag statt 0.05km/Tag → Impact auf Orbital Decay Forecast"
- Solar Cycle Prognose (wo sind wir im 11-Jahres-Zyklus)

Daten vorhanden: SolarFluxRecord + SpaceWeatherEvent Models, NOAA Cron existiert.

### 5.6 Dependencies

Cross-Type Intelligence. Wie aktuell, aber im neuen Design:

- Force-Directed Graph auf schwarzem Hintergrund
- Entity-Typen als verschiedene Formen (Circle=SCO, Diamond=LO, Square=LSO, etc.)
- SPOF Detection
- Cascade Risk Chains

---

## 6. Neue Features im Redesign

### 6.1 Orbital Twin (3D Globe)

Auf der Fleet Overview Startseite. ~60% der Breite.

**Technisch:**

- `@react-three/fiber` + `@react-three/drei` (schon im Stack)
- Earth-Sphere mit Textur (oder simpel: dunkle Kugel mit Kontinent-Outlines)
- Entities als Punkte auf Orbits
- SCO: auf Orbit-Höhe, bewegen sich entlang ihrer Bahn
- LO/LSO: als Punkte auf der Erdoberfläche (Launch Sites)
- ISOS: auf Orbit (wie SCO)
- Farbkodierung: Compliance Score → grün/amber/rot
- Interaktion: Hover zeigt Name + Score, Klick navigiert

**Fallback:** Wenn Three.js Performance-Probleme macht → 2D Weltkarte mit Dots.

### 6.2 AI Advisor

Auto-generierte Insights bei Page Load.

**Logik:**

- Sortiere Entities nach Urgency (niedrigster Horizon zuerst)
- Für die Top 3: Generiere eine konkrete Handlungsempfehlung
- Template-basiert (kein AI-Call nötig):
  - "ENTITY wird in Nd MODULE non-compliant. Empfohlene Aktion: ACTION."
  - "ENTITY hat N Critical Alerts. Sofort handeln."
  - "Fleet Score Trend: ↓X.X pts in 7 Tagen. Hauptursache: ENTITY (MODULE)."

### 6.3 Compliance Heatmap

Kalender-Grid für die nächsten 12 Monate.

**Daten:** Aggregiere alle Deadlines (aus Timeline-Modul) + alle Breach-Predictions (aus Forecast Engine) nach Monat.

**Rendering:** 12 Spalten × 4-5 Reihen (Wochen). Jede Zelle: Intensität = Anzahl Events, Farbe = höchste Kritikalität.

### 6.4 Compliance Playback

Timeline-Slider auf der Fleet Overview.

**Daten:** `SatelliteComplianceStateHistory` hat tägliche Snapshots.

**UI:** Slider von "vor 12 Monaten" bis "heute". Zieht man den Slider, aktualisiert sich die Fleet-Tabelle und der Globe mit den historischen Scores. Man sieht wie sich Compliance über die Zeit entwickelt hat.

### 6.5 Space Weather Dashboard

Eigene Seite mit:

- F10.7 Chart (Verlauf letzte 90 Tage)
- Kp Index Live-Anzeige
- NOAA Scales (G/S/R) als Ampel-System
- Event-Liste (letzte 30 Tage)
- Impact-Analyse: "Aktueller Solar Flux → Impact auf deine LEO-Entities"
- Solar Cycle Position (wo im 11-Jahres-Zyklus, was bedeutet das)

---

## 7. Entity-Typ-spezifische Anpassungen

Nicht jeder Operator-Typ braucht dieselben Module. Die Entity Intelligence Seite passt sich an:

| Typ  | Relevante Module                                                 | Spezifische Features                     |
| ---- | ---------------------------------------------------------------- | ---------------------------------------- |
| SCO  | Orbital, Fuel, Subsystems, Collision Avoidance, Cyber, Insurance | Orbital Twin, Decay Forecast, CA Manöver |
| LO   | Launch Compliance, Range Safety, Insurance, Environmental        | Launch Timeline, Vehicle Readiness       |
| LSO  | Site Infrastructure, Environmental, Safety                       | Site Status Map, Weather Integration     |
| ISOS | Proximity Ops, Target Interface, Insurance                       | Rendezvous Visualization                 |
| CAP  | Service Level, Capacity, Cyber                                   | Capacity Dashboard, SLA Tracking         |
| PDP  | Data Operations, Security, Privacy                               | Data Flow Visualization                  |
| TCO  | Ground Ops, Command Chain, Cyber                                 | Ground Station Status, Link Budget       |

---

## 8. Responsive Verhalten

**Desktop (>1280px):** Volle Ansicht mit Sidebar, Globe, Heatmap nebeneinander
**Tablet (768-1280px):** Globe über Heatmap gestapelt, Tabelle volle Breite
**Mobile (<768px):** Kein Globe (zu schwer), KPI Cards als Scroll-Strip, Tabelle als Card-Liste

---

## 9. Performance-Überlegungen

- **Globe:** Lazy-loaded, nur auf Desktop, max 200 Entities rendern (darüber → 2D Fallback)
- **Fleet Table:** Virtualisiert für >50 Entities (`react-window` oder `@tanstack/react-virtual`)
- **Forecast Charts:** Recharts bleibt (bewährt), aber Daten gecached
- **History Playback:** Client-Side nur, kein Server-Call pro Frame — alle History-Daten auf einmal laden
- **Heatmap:** SVG, nicht Canvas — bleibt crisp bei jedem Zoom

---

## 10. Migration

Das Redesign ist inkrementell:

1. **Phase 1:** Fleet Overview neu (Globe, Heatmap, AI Advisor, Entity-agnostisches Naming)
2. **Phase 2:** Entity Intelligence neu (Module als Cards, Forecast im neuen Design)
3. **Phase 3:** Alerts als eigene Seite, Space Weather Seite
4. **Phase 4:** Forge im neuen Design, Dependencies im neuen Design
5. **Phase 5:** Compliance Playback, Fleet Forecast

Jede Phase ist eigenständig deploybar.

---

## 11. Was NICHT geändert wird

- **Forecast Engine** — die Physik-Modelle (Orbital Decay, Fuel Depletion, Subsystem Degradation) bleiben
- **Compliance State Engine** — die 7 Operator-Typ-Engines bleiben
- **API Surface** — alle 22+ Endpoints bleiben
- **Cron Jobs** — Solar Flux, CelesTrak, Daily Recalc bleiben
- **Scenario Builder (Forge)** — die React Flow Logik bleibt, nur das Visual Theme wird angepasst
- **Datenmodelle** — keine Schema-Änderungen nötig
