# Ephemeris System — Vollständige Technische Analyse

> **Interner Entwicklungsbericht** | Stand: 2026-03-14
> Zielgruppe: Entwickler, Architekten, Product Owner

---

## 1. Überblick

Das Ephemeris-System ist das **prädiktive Compliance-Intelligence-Subsystem** der Caelex-Plattform. Es berechnet in Echtzeit, wie lange ein Satellit noch regulatorisch konform operieren kann ("Compliance Horizon"), erkennt Anomalien, simuliert What-If-Szenarien und propagiert regulatorische Abhängigkeiten über Flotten hinweg.

### Kernfähigkeiten

| Fähigkeit              | Beschreibung                                                                   |
| ---------------------- | ------------------------------------------------------------------------------ |
| **Compliance State**   | Live-Berechnung des Konformitätsstatus pro Satellit (0-100 Score, 8 Module)    |
| **Forecast**           | Prognose-Kurven mit P10/P50/P90-Konfidenzintervallen                           |
| **What-If Simulation** | Szenario-basierte Auswirkungsanalyse (Orbitalmanöver, Hardware-Ausfälle, etc.) |
| **Anomaly Detection**  | Z-Score-basierte Erkennung von Abweichungen in historischen Daten              |
| **Cascade Analysis**   | Regulatorische Änderungs-Propagation durch Abhängigkeitsgraphen                |
| **Fleet Intelligence** | Flottenweite Aggregation, Benchmarking, Cross-Type-Analyse                     |
| **3D Tracking**        | Echtzeit-Satellitenverfolgung mit satellite.js + Three.js                      |

---

## 2. Architektur

### 2.1 Schichtenmodell

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRESENTATION                             │
│  Fleet Dashboard    Satellite Detail    EphemerisForge (Canvas)  │
│  Mission Control    AlertsSidebar       DependencyGraphView      │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                      API ROUTES (22 Endpunkte)                  │
│  /api/v1/ephemeris/*    /api/cron/*    /api/satellites/*         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                   ENGINE LAYER (server-only)                     │
│  satellite-compliance-state    forecast-engine    what-if-engine │
│  orbital-decay    fuel-depletion    subsystem-degradation        │
│  celestrak-adapter    solar-flux-adapter    anomaly-detector     │
│  dependency-graph    impact-propagation    auto-detect           │
│  cascade-graph    conflict-detector    benchmark-engine          │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                     PERSISTENCE (Prisma/Neon)                    │
│  SatelliteComplianceState    SatelliteComplianceStateHistory     │
│  EphemerisForecast    SatelliteAlert    OrbitalData              │
│  SolarFluxRecord    Spacecraft    EntityDependency               │
└─────────────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                    EXTERNE DATENQUELLEN                          │
│  CelesTrak GP API    NOAA SWPC (F10.7)    Sentinel Telemetrie   │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Datenfluss-Pipeline (täglich)

```
04:00 UTC ─ solar-flux-polling
            │ getCurrentF107() → NOAA SWPC API
            └─► SolarFluxRecord upsert (F10.7-Wert des Monats)

05:00 UTC ─ celestrak-polling
            │ getOrbitalElements(noradId) → CelesTrak GP API
            │ Pro Spacecraft mit noradId:
            ├─► OrbitalData create (Zeitreihe)
            └─► Spacecraft update (altitudeKm, inclinationDeg)

06:00 UTC ─ ephemeris-daily (abhängig von frischen Daten aus 04:00 + 05:00)
            │ Pro Satellit:
            │ calculateSatelliteComplianceState()
            ├─► SatelliteComplianceState upsert
            ├─► SatelliteComplianceStateHistory append (mit P10/P50/P90)
            ├─► SatelliteAlert create/upgrade/resolve
            │   └─► notifyOrganization() bei neuen/eskalierten Alerts
            └─► propagateImpact() bei Score-Drop ≥ 5 Punkte
```

---

## 3. Datenmodelle (Prisma)

### 3.1 SatelliteComplianceState

**Zweck:** Aktueller Compliance-Schnappschuss pro (noradId, operatorId). 2h Cache-TTL.

| Feld                | Typ      | Beschreibung                                                    |
| ------------------- | -------- | --------------------------------------------------------------- |
| `noradId`           | String   | NORAD Katalognummer                                             |
| `operatorId`        | String   | FK → Organization                                               |
| `overallScore`      | Int      | 0-100 Gesamtscore                                               |
| `moduleScores`      | Json     | `{ orbital: {...}, fuel: {...}, subsystems: {...}, ... }`       |
| `dataSources`       | Json     | `{ sentinel: {...}, verity: {...}, celestrak: {...} }`          |
| `horizonDays`       | Int?     | Tage bis zum ersten Regelverstoß (null = kein Verstoß absehbar) |
| `horizonRegulation` | String?  | Welche Regulierung zuerst verletzt wird                         |
| `horizonConfidence` | String   | HIGH / MEDIUM / LOW                                             |
| `dataFreshness`     | String   | LIVE / RECENT / STALE / NO_DATA                                 |
| `stateJson`         | Json?    | Vollständiger Public-State-Snapshot                             |
| `satelliteName`     | String?  | Anzeigename                                                     |
| `calculatedAt`      | DateTime | Zeitpunkt der Berechnung                                        |

**Unique Constraint:** `[noradId, operatorId]`

### 3.2 SatelliteComplianceStateHistory

Gleiche Felder wie State, plus:

| Feld          | Typ     | Beschreibung                              |
| ------------- | ------- | ----------------------------------------- |
| `forecastP10` | Int?    | 10. Perzentil Horizon-Prognose            |
| `forecastP50` | Int?    | 50. Perzentil (nominal)                   |
| `forecastP90` | Int?    | 90. Perzentil (optimistisch)              |
| `inputsHash`  | String? | Hash der Eingabedaten (Deduplizierung)    |
| `alerts`      | Json?   | Snapshot der aktiven Alerts zum Zeitpunkt |

### 3.3 EphemerisForecast

| Feld               | Typ       | Beschreibung                      |
| ------------------ | --------- | --------------------------------- |
| `noradId`          | String    | NORAD ID                          |
| `operatorId`       | String    | FK → Organization                 |
| `forecastCurves`   | Json      | Zeitreihen-Arrays pro Modul       |
| `complianceEvents` | Json      | Prognostizierte Compliance-Events |
| `horizonDays`      | Int?      | Tage bis Erstverstoß              |
| `f107Used`         | Float?    | Verwendeter Solar-Flux-Wert       |
| `modelVersion`     | String?   | Engine-Version                    |
| `expiresAt`        | DateTime? | 24h Ablaufzeit                    |

### 3.4 SatelliteAlert

| Feld            | Typ       | Beschreibung                                              |
| --------------- | --------- | --------------------------------------------------------- |
| `noradId`       | String    | NORAD ID                                                  |
| `operatorId`    | String    | FK → Organization                                         |
| `type`          | String    | Alert-Typ (NON_COMPLIANT, HORIZON_LOW, etc.)              |
| `severity`      | String    | CRITICAL / HIGH / MEDIUM / LOW                            |
| `title`         | String    | Kurzbeschreibung                                          |
| `description`   | String?   | Detailbeschreibung                                        |
| `regulationRef` | String?   | Betroffene Regulierung                                    |
| `dedupeKey`     | String    | `{noradId}_{type}_{regulationRef}` — verhindert Duplikate |
| `triggeredAt`   | DateTime  | Erstauslösung                                             |
| `resolvedAt`    | DateTime? | Auflösung (null = aktiv)                                  |
| `acknowledged`  | Boolean   | Vom Benutzer bestätigt                                    |

### 3.5 OrbitalData

| Feld           | Typ       | Beschreibung                |
| -------------- | --------- | --------------------------- |
| `spacecraftId` | String    | FK → Spacecraft             |
| `noradId`      | String    | NORAD ID                    |
| `altitude`     | Float?    | Höhe in km                  |
| `inclination`  | Float?    | Inklination in Grad         |
| `eccentricity` | Float?    | Exzentrizität               |
| `period`       | Float?    | Umlaufzeit in Minuten       |
| `epoch`        | DateTime? | TLE-Epoche                  |
| `rawGp`        | Json?     | Rohe GP-Daten von CelesTrak |

### 3.6 SolarFluxRecord

| Feld         | Typ      | Beschreibung           |
| ------------ | -------- | ---------------------- |
| `f107`       | Float    | F10.7 Solar-Flux-Index |
| `observedAt` | DateTime | Monatsbeginn           |
| `source`     | String   | `NOAA_SWPC`            |

**Unique Constraint:** `[observedAt, source]`

---

## 4. API-Endpunkte

### 4.1 Core Ephemeris (authentifiziert, Session + Org-Membership)

| Methode  | Route                                            | Zweck                                                                      |
| -------- | ------------------------------------------------ | -------------------------------------------------------------------------- |
| GET      | `/api/v1/ephemeris/state?norad_id=X`             | Compliance-State (2h Cache, `?refresh=true` erzwingt Neuberechnung)        |
| GET      | `/api/v1/ephemeris/forecast?norad_id=X`          | Prognose-Kurven + Compliance-Events                                        |
| GET      | `/api/v1/ephemeris/horizon?norad_id=X`           | Horizon-Summary aus DB-Cache (kein Live-Calc)                              |
| POST     | `/api/v1/ephemeris/recalculate`                  | Erzwingt Neuberechnung + persistiert State + History                       |
| POST     | `/api/v1/ephemeris/what-if`                      | Szenario-Simulation (Body: `{ norad_id, scenario: { type, parameters } }`) |
| POST     | `/api/v1/ephemeris/simulate`                     | Jurisdiktionswechsel-Simulation                                            |
| GET      | `/api/v1/ephemeris/alerts?norad_id=&severity=`   | Aktive Alerts (nur unresolvierte)                                          |
| GET/POST | `/api/v1/ephemeris/anomalies`                    | Anomalie-Erkennung (GET: Report, POST: Scan + Alert-Generierung)           |
| GET      | `/api/v1/ephemeris/history?norad_id=X&from=&to=` | Historische Compliance-Snapshots                                           |

### 4.2 Fleet

| Methode | Route                                  | Zweck                                         |
| ------- | -------------------------------------- | --------------------------------------------- |
| GET     | `/api/v1/ephemeris/fleet`              | Gesamtflotte mit Compliance-State pro Entität |
| GET     | `/api/v1/ephemeris/fleet/intelligence` | Fleet Intelligence + Industry Benchmark       |
| GET     | `/api/v1/ephemeris/fleet/cross-type`   | Cross-Type SCO/LO/ISOS Intelligence           |

### 4.3 Dependencies

| Methode  | Route                                        | Zweck                               |
| -------- | -------------------------------------------- | ----------------------------------- |
| GET/POST | `/api/v1/ephemeris/dependencies`             | CRUD für Entity-Dependencies        |
| DELETE   | `/api/v1/ephemeris/dependencies/[id]`        | Dependency löschen                  |
| GET      | `/api/v1/ephemeris/dependencies/graph`       | Vollständiger Dependency-Graph      |
| POST     | `/api/v1/ephemeris/dependencies/auto-detect` | KI-gestützte Auto-Erkennung         |
| POST     | `/api/v1/ephemeris/dependencies/impact`      | Score-Impact-Propagation simulieren |

### 4.4 Cascade & Launch

| Methode  | Route                                           | Zweck                                                            |
| -------- | ----------------------------------------------- | ---------------------------------------------------------------- |
| GET/POST | `/api/v1/ephemeris/cascade`                     | Regulatorischer Änderungs-Cascade (GET: Graph, POST: Simulation) |
| POST     | `/api/v1/ephemeris/launch/state`                | Launch-Vehicle Compliance State                                  |
| POST     | `/api/v1/ephemeris/launch/jurisdiction-compare` | Jurisdiktionsvergleich für Launch Ops                            |

### 4.5 Cron Jobs

| Route                          | Schedule  | Dauer    | Zweck                                   |
| ------------------------------ | --------- | -------- | --------------------------------------- |
| `/api/cron/solar-flux-polling` | 04:00 UTC | max 60s  | NOAA F10.7 Fetch                        |
| `/api/cron/celestrak-polling`  | 05:00 UTC | max 300s | CelesTrak TLE Fetch für alle Spacecraft |
| `/api/cron/ephemeris-daily`    | 06:00 UTC | max 300s | Fleet-weite Compliance-Neuberechnung    |

**Auth:** Alle Crons via `CRON_SECRET` Bearer Token (timing-safe Vergleich). Exempt von CSRF und Middleware-Rate-Limiting.

### 4.6 Öffentlich / Edge

| Methode | Route                       | Zweck                                                                          |
| ------- | --------------------------- | ------------------------------------------------------------------------------ |
| GET     | `/api/satellites/celestrak` | Vollständiger CelesTrak-Katalog (Edge Runtime, 2h Cache, komprimiertes Format) |

### 4.7 Downstream-Consumer (nutzen Ephemeris-Daten)

| Route                                  | Liest aus                                                                     |
| -------------------------------------- | ----------------------------------------------------------------------------- |
| `POST /api/missions/[id]/hazards/sync` | `SatelliteComplianceState.moduleScores`, `EphemerisForecast.complianceEvents` |
| `POST /api/reports/hazard-report/[id]` | `SatelliteComplianceState`, `EphemerisForecast` → PDF-Report                  |

---

## 5. Engine Layer (Server-Only)

### 5.1 Core Compliance Engine

**`src/lib/ephemeris/core/satellite-compliance-state.ts`**

Zentrale Berechnungsfunktion `calculateSatelliteComplianceState()`. Aggregiert:

- **Orbital-Modul:** Dekay-Compliance (25-Jahr-Regel, Art. 72 EU Space Act)
- **Fuel-Modul:** Manövrierfähigkeit, End-of-Life Disposal (Art. 66, 72)
- **Subsystem-Modul:** Passivierungsfähigkeit (Art. 67(d))
- **Cyber-Modul:** NIS2-Cybersecurity-Posture
- **Ground-Modul:** Bodenstationskonnektivität
- **Documentation-Modul:** Dokumentationsstatus
- **Insurance-Modul:** Versicherungsabdeckung
- **Registration-Modul:** Registrierungsstatus

Output: `SatelliteComplianceState` mit Score 0-100, per-Modul Scores, Horizon, Data Freshness.

`toPublicState()` transformiert den internen State in ein sicheres Public-Format.

### 5.2 Physik-Modelle

**`src/lib/ephemeris/models/orbital-decay.ts`**

- Berechnet orbitalen Zerfall basierend auf Höhe, Solar-Flux (F10.7), Ballistic Coefficient
- Nutzt `satellite.js` für Propagation
- Output: Deorbit-Zeitlinie, Compliance vs. 25-Jahr-Regel

**`src/lib/ephemeris/models/fuel-depletion.ts`**

- Modelliert Treibstoffverbrauch über Missionszeit
- Berücksichtigt Station-Keeping, Manöver-Budget, Reserven
- Output: Restliche Delta-V, Tage bis Erschöpfung

**`src/lib/ephemeris/models/subsystem-degradation.ts`**

- Zuverlässigkeitskurven für Subsysteme vs. Missionsdauer
- Solarpanel-Degradation, Batterie-Zyklen, Antennen-Linkbudget
- Output: Subsystem-Health-Score, erwartete Ausfallzeiten

### 5.3 Forecast Engine

**`src/lib/ephemeris/forecast/forecast-engine.ts`**

`generateForecast()` — projiziert den Compliance-State N Tage in die Zukunft:

- Generiert Prognose-Kurven pro Modul
- Berechnet Compliance-Events (Zeitpunkte, an denen Module non-compliant werden)
- P10/P50/P90 Konfidenzintervalle basierend auf `horizonConfidence`:
  - HIGH: ±10%
  - MEDIUM: ±30%
  - LOW: ±50%

### 5.4 What-If Engine

**`src/lib/ephemeris/simulation/what-if-engine.ts`**

`runWhatIfScenario()` — führt parameterisierte Szenarien aus:

- Registry: `SCENARIO_HANDLERS` (Map von scenarioType → Handler-Funktion)
- Berechnet Baseline-State, mutiert Parameter, berechnet neuen State
- Output: `WhatIfResult { horizonDelta, costEstimate, fuelDelta, regulationImpacts, recommendation, severityLevel }`

### 5.5 Daten-Adapter

**`src/lib/ephemeris/data/celestrak-adapter.ts`**

- `getOrbitalElements(noradId)` — Fetcht GP-Daten von CelesTrak API
- Parst JSON-Format, extrahiert Orbital-Parameter
- Timeout: 25s, mit Error-Handling für API-Ausfälle

**`src/lib/ephemeris/data/solar-flux-adapter.ts`**

- `getCurrentF107()` — Fetcht aktuellen F10.7-Wert von NOAA SWPC
- Source: `NOAA_SWPC`, monatliche Granularität

### 5.6 Anomalie-Erkennung

**Anomaly Detector** (referenziert in `/api/v1/ephemeris/anomalies`)

- Z-Score-basierte statistische Anomalie-Erkennung
- Konfigurierbar: `zScoreWarning` (Default: 2.0), `zScoreCritical` (Default: 3.0)
- Analysiert `SatelliteComplianceStateHistory` über konfigurierbaren Lookback (max 90 Tage)
- Output: `AnomalyReport` mit per-Satellit Anomalien

### 5.7 Cross-Type Intelligence

**`src/lib/ephemeris/cross-type/`**

- `dependency-graph.ts` — `buildDependencyGraph(orgId)`: Baut den vollständigen Entity-Dependency-Graphen
- `auto-detect.ts` — `autoDetectDependencies(orgId)`: Erkennt Abhängigkeiten automatisch basierend auf Shared Resources
- `impact-propagation.ts` — `propagateImpact(entityId, orgId, scoreDelta)`: Propagiert Score-Änderungen durch den Dependency-Graph
- `computeCrossTypeIntelligence(orgId)`: Aggregierte SCO/LO/ISOS-Analyse, SPOFs, Risk Concentrations

### 5.8 Cascade Engine

**Cascade Graph** (referenziert in `/api/v1/ephemeris/cascade`)

- Modelliert regulatorische Abhängigkeiten als Graph
- `propagate(nodeId, changeType, parameters)`: Simuliert Auswirkungen einer Regulierungsänderung
- `calculateSatelliteImpacts()`: Berechnet Auswirkungen auf individuelle Satelliten
- Alert-Generierung + Konflikt-Erkennung

### 5.9 Benchmark Engine

**Fleet Intelligence + Benchmark** (referenziert in `/api/v1/ephemeris/fleet/intelligence`)

- `getFleetIntelligence().analyze()`: Flottenweite Aggregation (Weakest Links, Correlations, Trends)
- `getDefaultBenchmarkEngine().generateReport()`: Anonymisierter Cross-Org-Vergleich (Industry Percentiles)

---

## 6. Frontend-Architektur

### 6.1 Seitenstruktur

```
/dashboard/ephemeris/                          ← Fleet Dashboard
├── page.tsx                                   ← Fleet-Tabelle, Alerts, Intelligence, Dependencies
│
/dashboard/ephemeris/[noradId]/                ← Satellite Detail
├── page.tsx                                   ← Score, Horizon, Forecast-Charts, Module-Breakdown
│   ├── Tab: Forecast                          ← Recharts ComposedChart mit P10/P50/P90
│   ├── Tab: Modules                           ← Per-Modul Accordion
│   ├── Tab: Scenarios                         ← EphemerisForge (nimmt vollen Viewport ein)
│   ├── Tab: Cascade                           ← DependencyManagement + Cascade-Risk
│   └── Tab: Data Sources                      ← Datenquellen-Status
│
/dashboard/mission-control/                    ← 3D Globe
├── MissionControlView.tsx                     ← Orchestrierung
├── GlobeScene.tsx                             ← React Three Fiber Canvas
├── SatellitePoints.tsx                        ← WebGL Points mit Custom Shaders
├── OrbitPath.tsx                              ← Orbitbahn-Linie
└── FleetLabels.tsx                            ← Floating HTML Labels
```

### 6.2 EphemerisForge — Szenario-Builder

Der Forge ist ein **node-basierter Canvas** gebaut auf `@xyflow/react` (ReactFlow v12). Benutzer bauen Ketten von Szenario-Blöcken, die sequentiell ausgewertet werden.

#### Architektur

```
EphemerisForge (ReactFlowProvider Wrapper)
└── EphemerisForgeInner
    ├── ReactFlow Canvas
    │   ├── SatelliteOriginNode (read-only, zeigt aktuellen State)
    │   ├── ScenarioNode[] (interaktiv, mit Slidern/Selects)
    │   ├── ResultNode[] (auto-generiert nach Berechnung)
    │   └── ForgeEdge[] (animiert, severity-farbig)
    │
    ├── ForgeToolbar (Save/Load/Reset/Zoom)
    ├── BlockPalette (linkes Panel, 26 Kategorien)
    ├── RadialMenu (Rechtsklick-Kontextmenü)
    ├── SlashCommand (/-Tastenkürzel)
    ├── ComparisonBar (Branch-Vergleich bei 2+ Results)
    └── ForgeAstraChat (AI-Chat im Canvas)
```

#### Hooks

**`useForgeGraph`** — Graph-State-Management:

- `useReducer` mit 50-Entry Undo/Redo History Stack
- 12 Reducer-Actions: `ADD_SCENARIO_NODE`, `REMOVE_NODE`, `UPDATE_NODE_DATA`, `SPAWN_RESULT_NODE`, `UNDO`, `REDO`, etc.
- Auto-Positioning: Neue Nodes +350px rechts vom letzten offenen Node
- Auto-Connecting: Automatische Edge-Erstellung zum Chain-Ende
- Persistence: `localStorage` unter `ephemeris-forge-scenarios-${noradId}`
- `getChains()`: Algorithmus, der verbundene Pfade vom Origin-Node durch den Edge-Graph traversiert

**`useForgeComputation`** — Berechnungs-Orchestrierung:

- Debounce: 500ms nach Graph-Änderung
- Fingerprinting: `buildGraphFingerprint()` — nur strukturelle Änderungen triggern Neuberechnung
- Mutation Version Counter: Verwirft veraltete Ergebnisse bei schnellen Änderungen
- AbortController: Bricht laufende Fetch-Requests bei neuer Berechnung ab
- Pro Chain: Sequentielle `POST /api/v1/ephemeris/what-if` Calls pro Szenario-Node
- Aggregation: `aggregateResults(steps)` → `SimulationResults` → `spawnResultNode()`

#### Block-Definitionen

**26 Kategorien** für alle Operator-Typen:

| Kategorie         | Beispiel-Blöcke                                                                                                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Orbital Mechanics | Orbit Raise, Orbit Lower, Plane Change, Slot Change, Collision Avoidance, Deorbit Execute, Constellation Resize, Atmospheric Drag Increase                                         |
| Hardware Failures | Thruster Failure, Reaction Wheel Failure, Solar Panel Degradation, Battery Degradation, Antenna Degradation, Attitude Control Anomaly, Thermal Control Failure, Sensor Degradation |
| Environment       | Solar Storm, Debris Impact, Radiation Belt Transit                                                                                                                                 |
| Communication     | Ground Station Outage, Link Margin Reduction                                                                                                                                       |
| Regulatory        | License Condition Change, New Requirement, Deadline Extension                                                                                                                      |
| Operational       | Mission Extension, Decommissioning Start                                                                                                                                           |
| Financial         | Insurance Lapse, Budget Reduction                                                                                                                                                  |
| Launch Operations | Launch Delay, Vehicle Anomaly                                                                                                                                                      |
| ...               | (+ 18 weitere Kategorien für LO, ISOS, LSO, CAP, PDP, TCO)                                                                                                                         |

Jeder Block hat:

- `id`, `name`, `description`, `category`, `icon`
- `scenarioType` (Maps auf What-If API Typ)
- `parameterDefs[]` (Slider oder Select)

#### Node-Komponenten

**SatelliteOriginNode** — Read-only Startknoten:

- Zeigt Satellitenname, NORAD ID, Score (große Monospace-Zahl), Horizon, Weakest Module
- Nur Source-Handle (rechts), nicht löschbar/verschiebbar
- Emerald-Border mit Glow-Effekt

**ScenarioNode** — Interaktiver Szenario-Block:

- Source + Target Handles
- Farbige Header (Kategorie-Farbe)
- Zoom-adaptive Parameter-Darstellung:
  - `zoom ≥ 0.6`: Volle Slider + Selects
  - `zoom 0.5-0.6`: Label/Value Summary
  - `zoom < 0.5`: Parameter ausgeblendet
- `nodrag nopan nowheel` CSS-Klassen auf Parameters-Container (verhindert ReactFlow Drag-Interference)
- Computing-State: Pulsierender Indikator
- Done-State: Horizon-Delta + Severity-Farbe

**ResultNode** — Auto-generierter Ergebnis-Knoten:

- Große Mono `totalHorizonDelta` (z.B. `+120d` / `-45d`)
- Regulations-Count Badge, Severity-Label
- Expandierbar: Cost, Fuel Delta, Per-Step Breakdown
- Critical-Pulse CSS Animation bei CRITICAL Severity

#### Edge-Komponente (ForgeEdge)

Animierte Bezier-Edges mit Severity-States:

| State       | Farbe             | Animation                         |
| ----------- | ----------------- | --------------------------------- |
| `idle`      | Grau (#94A3B8)    | Keine                             |
| `nominal`   | Emerald (#10B981) | Forward Pulse-Particle            |
| `warning`   | Amber (#F59E0B)   | Forward Pulse-Particle            |
| `critical`  | Rot (#EF4444)     | Forward + Reverse Pulse-Particles |
| `computing` | —                 | SVG Gradient Shimmer              |

### 6.3 Theme-System

Drei separate Design-Token-Objekte:

**`DARK` / `LIGHT`** — Ephemeris Dashboard (reagiert auf `prefers-color-scheme`):

- `bg, elevated, sunken, border, textPrimary/Secondary/Tertiary/Muted`
- `nominal (#10B981), watch (#F59E0B), warning (#F97316), critical (#EF4444)`

**`FORGE`** — Canvas-spezifisch (nur Light):

- `canvasBg, gridDot, nodeBg, nodeBorder`
- `edgeNominal, edgeWarning, edgeCritical, edgeComputing, edgeIdle`

**`GLASS`** — Glassmorphism für Forge-Overlays:

- `bg: rgba(255,255,255,0.72)`, `blur: 20px`
- `shadow`, `insetGlow`, `nodeRadius: 16px`, `panelRadius: 12px`

### 6.4 Mission Control (3D Globe)

**Stack:** React Three Fiber + satellite.js + @react-three/drei

**Komponenten:**

- `GlobeScene` — Canvas mit Starfield (3000 Punkte), EarthMesh, Controls
- `SatellitePoints` — WebGL Points mit Custom Vertex/Fragment Shaders
  - Position via `satellite.js` (`twoline2satrec` + `propagate`) in `useFrame` Loop
  - Fleet-Satelliten: Pulsierender Glow-Effekt (`sin(uTime * 3.0)`)
  - Click-Detection via Raycaster
- `OrbitPath` — 180-Punkte-Linie über eine volle Umlaufperiode
- `FleetLabels` — `@react-three/drei` `<Html>` Labels an 3D-Positionen

**Daten:**

- `useSatelliteData` Hook: Fetcht `/api/satellites/fleet` + `/api/satellites/celestrak`
- SessionStorage-Cache mit 30min TTL
- Komprimiertes Format (1-2 Char Keys) vom Edge-Runtime Endpoint

---

## 7. Alert-System

### 7.1 Alert-Generierung (ephemeris-daily Cron)

| Bedingung                | Severity | Alert-Typ        |
| ------------------------ | -------- | ---------------- |
| Modul `NON_COMPLIANT`    | CRITICAL | Modul-spezifisch |
| Modul `WARNING`          | HIGH     | Modul-spezifisch |
| Horizon < 30 Tage        | CRITICAL | `HORIZON_LOW`    |
| Horizon < 90 Tage        | HIGH     | `HORIZON_LOW`    |
| Data Freshness `STALE`   | MEDIUM   | `DATA_STALE`     |
| Data Freshness `NO_DATA` | HIGH     | `NO_DATA`        |

### 7.2 Alert-Lifecycle

1. **Erstellt:** Neuer `dedupeKey` → `SatelliteAlert` create + Notification
2. **Eskaliert:** Existierender Alert, höhere Severity → Update + Notification
3. **Aufgelöst:** Bedingung nicht mehr erfüllt → `resolvedAt` setzen
4. **Deduplizierung:** `dedupeKey = {noradId}_{type}_{regulationRef}` verhindert Dopplungen

### 7.3 Anomalie-Alerts

Separat über `POST /api/v1/ephemeris/anomalies`:

- `dedupeKey: {noradId}_ANOMALY_{type}`
- Generiert nur für CRITICAL/HIGH Anomalien

### 7.4 Cascade-Alerts

Separat über `POST /api/v1/ephemeris/cascade`:

- `dedupeKey: {noradId}_CASCADE_{trigger}`
- Generiert nur für CRITICAL/HIGH Satellite Impacts

---

## 8. Caching-Strategie

| Daten                      | Cache-Ort                            | TTL        | Invalidierung                       |
| -------------------------- | ------------------------------------ | ---------- | ----------------------------------- |
| Compliance State           | Prisma DB (SatelliteComplianceState) | 2 Stunden  | `?refresh=true` oder `/recalculate` |
| Fleet State                | Prisma DB                            | 25 Stunden | Toleriert Cron-Timing-Drift         |
| Forecast                   | Prisma DB (EphemerisForecast)        | 24 Stunden | `expiresAt` Feld                    |
| CelesTrak Katalog (public) | Edge Runtime In-Memory               | 2 Stunden  | Cache-Control Headers               |
| CelesTrak Katalog (client) | SessionStorage                       | 30 Minuten | `useSatelliteData` Hook             |
| Szenario-Szenarien         | localStorage                         | Unbegrenzt | Manuelles Löschen                   |

---

## 9. Rate Limiting

| Route-Gruppe               | Tier                  | Limit                               |
| -------------------------- | --------------------- | ----------------------------------- |
| Alle `/api/v1/ephemeris/*` | `api` (Middleware)    | 100 req/min per IP                  |
| Cron Jobs                  | Exempt                | Kein Limit                          |
| `POST /hazards/sync`       | `hub`                 | 60 req/min (Redis), 30/min (Memory) |
| `POST /hazard-report`      | `document_generation` | 5 req/h (Redis), 2/h (Memory)       |

**Hinweis:** Keine der Core-Ephemeris-Routen nutzt ein eigenes `checkRateLimit()` — sie verlassen sich ausschließlich auf das Middleware-Limit von 100/min. Für teure Operationen wie `/recalculate` oder `/what-if` sollte ein dediziertes Tier in Betracht gezogen werden.

---

## 10. Datei-Referenz

### Engine Layer (`src/lib/ephemeris/`)

| Datei                                | Zweck                                        |
| ------------------------------------ | -------------------------------------------- |
| `core/satellite-compliance-state.ts` | Compliance-State-Berechnung, toPublicState() |
| `forecast/forecast-engine.ts`        | Prognose-Kurven-Generierung                  |
| `models/orbital-decay.ts`            | Orbitaler Zerfall (satellite.js + F10.7)     |
| `models/fuel-depletion.ts`           | Treibstoff-Verbrauchsmodell                  |
| `models/subsystem-degradation.ts`    | Subsystem-Zuverlässigkeitskurven             |
| `simulation/what-if-engine.ts`       | Szenario-Simulation mit Handler-Registry     |
| `data/celestrak-adapter.ts`          | CelesTrak GP API Adapter                     |
| `data/solar-flux-adapter.ts`         | NOAA SWPC F10.7 Adapter                      |
| `cross-type/dependency-graph.ts`     | Entity-Dependency-Graph Builder              |
| `cross-type/auto-detect.ts`          | Automatische Dependency-Erkennung            |
| `cross-type/impact-propagation.ts`   | Score-Impact-Propagation                     |

### API Routes (`src/app/api/`)

| Datei                                               | Route                             |
| --------------------------------------------------- | --------------------------------- |
| `v1/ephemeris/state/route.ts`                       | GET /state                        |
| `v1/ephemeris/forecast/route.ts`                    | GET /forecast                     |
| `v1/ephemeris/horizon/route.ts`                     | GET /horizon                      |
| `v1/ephemeris/recalculate/route.ts`                 | POST /recalculate                 |
| `v1/ephemeris/what-if/route.ts`                     | POST /what-if                     |
| `v1/ephemeris/simulate/route.ts`                    | POST /simulate                    |
| `v1/ephemeris/alerts/route.ts`                      | GET /alerts                       |
| `v1/ephemeris/anomalies/route.ts`                   | GET+POST /anomalies               |
| `v1/ephemeris/history/route.ts`                     | GET /history                      |
| `v1/ephemeris/fleet/route.ts`                       | GET /fleet                        |
| `v1/ephemeris/fleet/intelligence/route.ts`          | GET /fleet/intelligence           |
| `v1/ephemeris/fleet/cross-type/route.ts`            | GET /fleet/cross-type             |
| `v1/ephemeris/dependencies/route.ts`                | GET+POST /dependencies            |
| `v1/ephemeris/dependencies/[id]/route.ts`           | DELETE /dependencies/:id          |
| `v1/ephemeris/dependencies/graph/route.ts`          | GET /dependencies/graph           |
| `v1/ephemeris/dependencies/auto-detect/route.ts`    | POST /dependencies/auto-detect    |
| `v1/ephemeris/dependencies/impact/route.ts`         | POST /dependencies/impact         |
| `v1/ephemeris/cascade/route.ts`                     | GET+POST /cascade                 |
| `v1/ephemeris/launch/state/route.ts`                | POST /launch/state                |
| `v1/ephemeris/launch/jurisdiction-compare/route.ts` | POST /launch/jurisdiction-compare |
| `cron/solar-flux-polling/route.ts`                  | Cron 04:00                        |
| `cron/celestrak-polling/route.ts`                   | Cron 05:00                        |
| `cron/ephemeris-daily/route.ts`                     | Cron 06:00                        |
| `satellites/celestrak/route.ts`                     | Public Edge Catalog               |

### Frontend (`src/app/dashboard/ephemeris/`)

| Datei                                                       | Zweck                               |
| ----------------------------------------------------------- | ----------------------------------- |
| `page.tsx`                                                  | Fleet Dashboard                     |
| `[noradId]/page.tsx`                                        | Satellite Detail (alle Tabs inline) |
| `theme.ts`                                                  | DARK/LIGHT/FORGE/GLASS Tokens       |
| `components/scenario-builder/EphemerisForge.tsx`            | Canvas Wrapper + ReactFlow          |
| `components/scenario-builder/useForgeGraph.ts`              | Graph State (Reducer + Undo/Redo)   |
| `components/scenario-builder/useForgeComputation.ts`        | Berechnungs-Orchestrierung          |
| `components/scenario-builder/types.ts`                      | TypeScript Types                    |
| `components/scenario-builder/block-definitions.ts`          | 26 Kategorien Block-Registry        |
| `components/scenario-builder/icon-map.ts`                   | Lucide Icon Mapping                 |
| `components/scenario-builder/nodes/SatelliteOriginNode.tsx` | Origin-Knoten                       |
| `components/scenario-builder/nodes/ScenarioNode.tsx`        | Szenario-Block                      |
| `components/scenario-builder/nodes/ResultNode.tsx`          | Ergebnis-Knoten                     |
| `components/scenario-builder/edges/ForgeEdge.tsx`           | Animierte Edges                     |
| `components/scenario-builder/overlays/ForgeToolbar.tsx`     | Toolbar                             |
| `components/scenario-builder/overlays/BlockPalette.tsx`     | Block-Palette                       |
| `components/scenario-builder/overlays/RadialMenu.tsx`       | Rechtsklick-Menü                    |
| `components/scenario-builder/overlays/SlashCommand.tsx`     | Slash-Command                       |
| `components/scenario-builder/overlays/ComparisonBar.tsx`    | Branch-Vergleich                    |
| `components/scenario-builder/overlays/ForgeAstraChat.tsx`   | AI-Chat                             |
| `components/alerts-sidebar.tsx`                             | Alert-Seitenleiste                  |
| `components/dependency-graph-view.tsx`                      | SVG Force-Directed Graph            |
| `components/dependency-management.tsx`                      | Dependency CRUD                     |
| `components/jurisdiction-simulator.tsx`                     | Jurisdiktions-Simulator             |
| `components/compliance-horizon-display.tsx`                 | Horizon-Anzeige                     |
| `components/forecast-chart.tsx`                             | Standalone Forecast-Chart           |
| `components/data-sources-panel.tsx`                         | Datenquellen-Status                 |
| `components/module-breakdown.tsx`                           | Modul-Accordion                     |
| `components/satellite-card.tsx`                             | Fleet-Grid Karte                    |
| `components/fleet-overview.tsx`                             | Fleet-Grid Layout                   |
| `components/alert-list.tsx`                                 | Inline Alert-Liste                  |

### Mission Control (`src/components/mission-control/`)

| Datei                       | Zweck                    |
| --------------------------- | ------------------------ |
| `MissionControlView.tsx`    | Top-Level Orchestrierung |
| `hooks/useSatelliteData.ts` | Daten-Fetch + Cache      |
| `GlobeScene.tsx`            | R3F Canvas + Starfield   |
| `SatellitePoints.tsx`       | WebGL Shader Points      |
| `OrbitPath.tsx`             | Orbitbahn-Visualisierung |
| `FleetLabels.tsx`           | 3D HTML Labels           |
| `EarthMesh.tsx`             | Erde Mesh + Textur       |
| `FilterPanel.tsx`           | Orbit/Object Filter      |
| `StatsBar.tsx`              | Statistik-Leiste         |
| `SatelliteInfoPanel.tsx`    | Detail-Panel             |
| `GlobeWidget.tsx`           | Kompakte Globe-Variante  |

---

## 11. Bekannte Einschränkungen & Empfehlungen

### Aktuelle Einschränkungen

1. **Kein dediziertes Rate Limiting** für teure Ephemeris-Operationen (`/recalculate`, `/what-if`, `/cascade POST`). Alle nutzen nur das 100/min Middleware-Limit.

2. **Hardcoded Baseline Score** in `/launch/jurisdiction-compare` (Zeile: `70`). Sollte aus dem Entity-State gelesen werden.

3. **Fleet Route Auth-Inkonsistenz:** `/fleet/cross-type` liest `organizationId` direkt aus `session.user` statt über `organizationMember` Lookup wie alle anderen Routen.

4. **Forecast TTL** von 24h könnte zu lang sein wenn Solar-Flux-Daten sich stark ändern. Kein explizites Invalidierungs-Event.

5. **Szenario-Persistenz** nur in `localStorage` — geht bei Browser-Wechsel oder Cache-Clear verloren. Keine Server-seitige Speicherung.

### Empfehlungen

1. **Rate Limiting Tier `ephemeris_expensive`** einführen (analog zu `sentinel_expensive`: 10/h) für `/recalculate`, `/what-if`, `/cascade POST`, `/anomalies POST`.

2. **Server-seitige Szenario-Speicherung** — neues Prisma-Modell `EphemerisScenario` mit `userId`, `noradId`, `name`, `graphJson`, `createdAt`.

3. **Webhook Events** für Ephemeris-Alerts hinzufügen: `ephemeris.alert.created`, `ephemeris.alert.resolved`, `ephemeris.state.changed`.

4. **Forecast-Invalidierung** über einen Event-Bus wenn Solar-Flux oder TLE-Daten aktualisiert werden.

5. **Batch-Recalculate** Endpoint für Fleet-weite manuelle Neuberechnung (statt pro Satellit).
