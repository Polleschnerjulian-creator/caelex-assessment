# EPHEMERIS — Executive Deep-Dive Analysis

**Predictive Compliance Intelligence Engine | Caelex Platform**

Berichtsdatum: 11. Marz 2026 | Klassifikation: Vertraulich — C-Level & Board
Verfasser: Technologie-Strategieanalyse | Umfang: Vollstandige System-Durchleuchtung

---

## Inhaltsverzeichnis

1. [Management Summary](#1-management-summary)
2. [Strategische Einordnung & Marktkontext](#2-strategische-einordnung--marktkontext)
3. [Systemarchitektur — Gesamtubersicht](#3-systemarchitektur--gesamtubersicht)
4. [Datenpipeline & Ingestion Layer](#4-datenpipeline--ingestion-layer)
5. [Physik- & Prognosemodelle](#5-physik---prognosemodelle)
6. [Scoring Engine & Safety Gate](#6-scoring-engine--safety-gate)
7. [Compliance Horizon — Das Kernprodukt](#7-compliance-horizon--das-kernprodukt)
8. [Simulationsengine (What-If & Forge)](#8-simulationsengine-what-if--forge)
9. [Advanced Analytics Layer](#9-advanced-analytics-layer)
10. [Frontend-Architektur & UX](#10-frontend-architektur--ux)
11. [API-Oberflache & Cron-Orchestrierung](#11-api-oberflache--cron-orchestrierung)
12. [Datenmodell & Persistenz](#12-datenmodell--persistenz)
13. [Regulatorische Wissensbasis](#13-regulatorische-wissensbasis)
14. [Test-Abdeckung & Qualitat](#14-test-abdeckung--qualitat)
15. [Wettbewerbsgraben (Competitive Moat)](#15-wettbewerbsgraben-competitive-moat)
16. [Technische Schulden & Lucken](#16-technische-schulden--lucken)
17. [Risikobewertung](#17-risikobewertung)
18. [Strategische Empfehlungen](#18-strategische-empfehlungen)
19. [Anhang A — Vollstandiges File-Inventar](#19-anhang-a--vollstandiges-file-inventar)
20. [Anhang B — Metriken auf einen Blick](#20-anhang-b--metriken-auf-einen-blick)

---

## 1. Management Summary

### Was Ephemeris ist

Ephemeris ist das predictive compliance intelligence subsystem der Caelex-Plattform. Es beantwortet die eine Frage, die kein bestehendes Produkt am Markt beantworten kann:

> **"In wie vielen Tagen wird mein Satellit eine regulatorische Schwelle uberschreiten — und was kann ich heute dagegen tun?"**

Das System transformiert Compliance von einem retrospektiven Kostenposten (jahrliche Audits, reaktive Korrekturen) zu einem prospektiven Planungsinstrument (vorausschauende Wartung, regulatorische Arbitrage, evidenzbasierte Verhandlungen mit nationalen Aufsichtsbehorden).

### Dimensionen auf einen Blick

| Dimension                 | Wert                                                                                                      |
| ------------------------- | --------------------------------------------------------------------------------------------------------- |
| Gesamtumfang Codebase     | ~15.000 Zeilen TypeScript (Engine + UI)                                                                   |
| Backend-Engine-Dateien    | 70+ server-only Module                                                                                    |
| Frontend-Komponenten      | 28 Dashboard + 10 Marketing-Seite                                                                         |
| Physik-/Prognosemodelle   | 5 (Orbitalzerfall, Treibstofferschopfung, Subsystem-Degradation, Deadline-Events, Regulatorischer Wandel) |
| Compliance-Module         | 8 (SCO) / bis zu 9 pro Operator-Typ, 7 Operator-Typen                                                     |
| What-If-Szenariotypen     | 131 Handler, 55 Block-Definitionen, 7 Kategorien                                                          |
| Datenbankmodelle          | 7 Ephemeris-spezifisch (+ Spacecraft, Sentinel, Verity)                                                   |
| API-Endpunkte             | 13 authentifizierte Routen + 3 Dependency-Routen                                                          |
| Cron-Jobs                 | 3 tagliche Jobs (04:00, 05:00, 06:00 UTC)                                                                 |
| Externe Datenquellen      | 2 (CelesTrak GP API, NOAA SWPC)                                                                           |
| Prognosehorizont          | 1.825 Tage (5 Jahre), 7-Tage-Auflosung                                                                    |
| Jurisdiktionsvergleiche   | 7 EU-Jurisdiktionen + 6 Launch-Jurisdiktionen                                                             |
| Regulatorische Referenzen | EU Space Act, NIS2, IADC, COPUOS, ISO 24113, FCC, FAA, ORBITS Act, 10+ nationale Weltraumgesetze          |
| Test-Dateien              | 43 Testdateien, ~4.000+ LOC Tests                                                                         |

### Der Paradigmenwechsel

Traditionelle Compliance fragt: _"Sind wir heute konform?"_ Ephemeris fragt: _"Wann werden wir aufhoren, konform zu sein?"_

Dieser Perspektivwechsel hat drei unmittelbare wirtschaftliche Auswirkungen:

1. **Fur Satellitenbetreiber:** Proaktive Wartungsplanung statt reaktiver Notfallmassnahmen. Ein Betreiber, der 847 Tage im Voraus weiss, dass Artikel 70 verletzt wird, kann eine kontrollierte Deorbit-Entscheidung 18 Monate fruher treffen — was die Kosten um geschatzte 40-60% reduziert.

2. **Fur Aufsichtsbehorden (NCAs):** Risikobasierte Priorisierung statt flachendeckender Inspektionen. Eine NCA mit 200 Satelliten unter Aufsicht kann die 15 mit dem kurzesten Compliance-Horizont priorisieren.

3. **Fur Versicherer:** Evidenzbasierte Underwriting-Entscheidungen statt jährlicher Fragebogen. Kontinuierliche Risikouberwachung mit kryptographisch verifizierter Datenherkunft.

---

## 2. Strategische Einordnung & Marktkontext

### Regulatorischer Katalysator

Die EU Space Regulation (COM(2025) 335) fuhrt erstmals **kontinuierliche Compliance-Pflichten** fur Satellitenbetreiber ein — nicht nur bei der Startgenehmigung, sondern uber den gesamten Missionslebenszyklus. Artikel 64, 68, 70 und 72 schreiben laufende Anforderungen an Orbitallebensdauer, Passivierungstreibstoffreserven, Subsystemgesundheit und Truummervermeidung vor. Die NIS2-Richtlinie (EU 2022/2555) fugt Cybersecurity-Pflichten mit Meldefristen hinzu.

### Wertversprechen-Matrix

| Stakeholder                    | Primarer Wert                                                | Sekundarer Wert                                       |
| ------------------------------ | ------------------------------------------------------------ | ----------------------------------------------------- |
| **Satellitenbetreiber**        | Predictive Maintenance, regulatorische Risikoquantifizierung | Evidenzbasierter NCA-Dialog, Jurisdiktionsoptimierung |
| **Nationale Aufsichtsbehorde** | Risikobasierte Aufsichtspriorisierung                        | Fleet-Level-Ubersicht, automatische Eskalation        |
| **Versicherer**                | Evidenzbasiertes Underwriting                                | Kontinuierliches Monitoring, Schadenspravention       |
| **Investor**                   | Quantifiziertes regulatorisches Risiko                       | Portfolio-Fleet-Intelligence, Due-Diligence-Daten     |
| **Launch Operator**            | Jurisdiktionsvergleich, Compliance-Planung                   | Kampagnenbasiertes Deadline-Management                |
| **In-Space-Servicing (ISOS)**  | Proximity-Operations-Compliance                              | Target-Consent-Tracking, Abort-Fuel-Monitoring        |

### Competitive Positioning

Ephemeris operiert an der Schnittstelle dreier Domanen, die kein Wettbewerber kombiniert:

1. **Orbitalmechanik** — Reale atmospharische Drag-Modelle mit Sonnenfluss-Korrektur (nicht nur TLE-Propagation)
2. **Regulatorisches Wissen** — Verankert in spezifischen Artikeln (EU Space Act Art. 68, 70, 72; NIS2 Art. 21; IADC 5.3.1), nicht generischen Compliance-Checklisten
3. **Kryptographische Evidenz** — Sentinel-tamper-evident Telemetriekette bietet verifizierbare Datenherkunft (Ed25519 signiert, Hash-verkettet)

**Kein existierendes Space-Compliance-Tool bietet vorausschauende Analyse.** Aktuelle Losungen (manuelle Spreadsheets, Point-in-Time-Audits) konnen die Frage "Werden wir in 18 Monaten noch konform sein, angesichts aktueller Treibstoffverbrauchstrends und kommender regulatorischer Anderungen?" nicht beantworten.

---

## 3. Systemarchitektur — Gesamtubersicht

### Schichtenmodell

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         EXTERNE DATENQUELLEN                              │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────────────┐  │
│  │  CelesTrak   │  │  NOAA SWPC   │  │  Sentinel Agents              │  │
│  │  GP API      │  │  F10.7 Index  │  │  (Kundenseitig deployt)       │  │
│  │  (TLE/GP)    │  │  (Solarfluss) │  │  Ed25519-signierte Pakete    │  │
│  └──────┬───────┘  └──────┬───────┘  └────────────┬──────────────────┘  │
│         │                 │                        │                     │
│  ┌──────┴───────┐  ┌──────┴───────┐  ┌────────────┴──────────────────┐  │
│  │  EUR-Lex     │  │  Verity      │  │  Assessment (Self-reported)    │  │
│  │  Reg. Feed   │  │  Attestation │  │  4 Module                     │  │
│  └──────┬───────┘  └──────┬───────┘  └────────────┬──────────────────┘  │
└─────────┼─────────────────┼────────────────────────┼─────────────────────┘
          │                 │                        │
          ▼                 ▼                        ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                     DATA ADAPTERS (6 Module)                              │
│                                                                          │
│  celestrak-adapter   sentinel-adapter   verity-adapter                   │
│  (4h In-Mem Cache)   (30s Agent-Cache)  (DB-Query)                      │
│                                                                          │
│  eurlex-adapter      assessment-adapter  shield-adapter                  │
│  (DB: 30-Tage)       (5 Parallel-Queries) (Fehler-isoliert)            │
│                                                                          │
│  solar-flux-adapter                                                      │
│  (24h Cache + DB-Fallback)                                               │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                    PREDICTION MODELS (5 Module)                           │
│                                                                          │
│  ┌─────────────────┐ ┌─────────────────┐ ┌────────────────────────────┐ │
│  │ Orbital Decay   │ │ Fuel Depletion  │ │ Subsystem Degradation      │ │
│  │ Semi-analytisch │ │ Lin. Regression │ │ Thruster/Battery/Solar     │ │
│  │ Atmo. Drag +    │ │ R²-Konfidenz   │ │ Weibull-Ausfallwahrsch.    │ │
│  │ F10.7-Korrektur │ │                 │ │                            │ │
│  └─────────────────┘ └─────────────────┘ └────────────────────────────┘ │
│  ┌─────────────────┐ ┌─────────────────┐                                │
│  │ Deadline Events │ │ Reg. Change     │                                │
│  │ Kalenderbasiert │ │ EUR-Lex →       │                                │
│  │ NIS2, Art. 8    │ │ Factor Map      │                                │
│  └─────────────────┘ └─────────────────┘                                │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                  SCORING ENGINE + SAFETY GATE                             │
│                                                                          │
│  7 Operatortypen × eigene Modulregistrierung:                            │
│  SCO: 9 Module (fuel:20% > orbital:15% = subsystems:15% ...)            │
│  LO:  9 Module (launch_auth:20% > range_safety:15% ...)                 │
│  ISOS: 9 Module (mission_auth:20% > proximity_ops:15% ...)              │
│  LSO/CAP/PDP/TCO: 8 Module jeweils                                      │
│                                                                          │
│  Safety Gate: Sicherheitskritisches Modul NON_COMPLIANT → Score ≤ 49    │
│  Horizon: min(daysToThreshold) uber alle Faktoren                        │
│                                                                          │
│  Daten-Leckschutz: toPublicState() entfernt currentValue                │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │
                  ┌──────────────┼──────────────┐
                  ▼              ▼              ▼
┌─────────────────────┐ ┌────────────────┐ ┌──────────────────────┐
│ FORECAST ENGINE     │ │ SIMULATION     │ │ ADVANCED ANALYTICS   │
│                     │ │ ENGINE         │ │                      │
│ 5-Jahres-Kurven     │ │ 131 Szenario-  │ │ Fleet Intelligence   │
│ P10/P50/P90         │ │ Handler        │ │ Anomaly Detection    │
│ Schwellenkreuzungen │ │ Jurisdiktion   │ │ Cascade Propagation  │
│ Compliance Events   │ │ EphemerisForge │ │ Conflict Detection   │
│                     │ │ (Node-Graph)   │ │ Cross-Type Intel     │
└─────────────────────┘ └────────────────┘ └──────────────────────┘
                  │              │              │
                  └──────────────┼──────────────┘
                                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                       PERSISTENZ (7 Modelle)                              │
│                                                                          │
│  SatelliteComplianceState        (Live-Snapshot, Upsert, 2h Cache)      │
│  SatelliteComplianceStateHistory (Append-only, P10/P50/P90, inputsHash) │
│  EphemerisForecast               (Kurven-Cache, 24h TTL, modelVersion)  │
│  SatelliteAlert                  (Hysterese-Dedup, resolvedAt-Tracking) │
│  OrbitalData                     (TLE-Zeitreihe, rawGp JSON)            │
│  SolarFluxRecord                 (F10.7-Historie, monatlich)            │
│  EntityDependency                (Cross-Type-Abhangigkeiten)            │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                       API LAYER (16 Routen)                               │
│                                                                          │
│  /state  /fleet  /forecast  /horizon  /history  /alerts  /recalculate   │
│  /what-if  /simulate  /cascade  /anomalies  /fleet/intelligence         │
│  /fleet/cross-type  /dependencies  /dependencies/auto-detect            │
│  /dependencies/impact  /dependencies/graph  /launch/*                   │
│                                                                          │
│  Alle: Session-Auth + Org-Mitgliedschaft + Satelliten-Eigentum          │
│  Daten-Leckschutz: toPublicState() entfernt currentValue               │
└──────────────────────────────────────────────────────────────────────────┘
```

### Datei-Inventar nach Schicht

| Schicht                       | Dateien  | LOC (ca.)    | Kernaufgabe                              |
| ----------------------------- | -------- | ------------ | ---------------------------------------- |
| Core Engine (`core/`)         | 10       | ~4.800       | Typen, Scoring, 7 Operator-Kalkulatoren  |
| Data Adapters (`data/`)       | 7        | ~1.100       | Externe Datenanbindung + Caching         |
| Prediction Models (`models/`) | 5        | ~1.500       | Physik- & statistische Modelle           |
| Forecast (`forecast/`)        | 3        | ~550         | 5-Jahres-Prognose-Orchestrierung         |
| Simulation (`simulation/`)    | 20+      | ~3.500+      | What-If, Handler, Jurisdiktionsvergleich |
| Advanced Analytics            | 5        | ~2.400       | Anomalie, Kaskade, Fleet, Cross-Type     |
| Cron Jobs                     | 3        | ~700         | Tagliche Pipeline-Orchestrierung         |
| API Routes                    | 16+      | ~2.500+      | RESTful Zugang + Autorisierung           |
| Dashboard Frontend            | 28       | ~8.500       | Fleet Command, Forge, Charts             |
| Marketing Frontend            | 10       | ~1.240       | Produkt-Landingpage                      |
| Regulatorische Daten          | 8        | ~4.000+      | Schwellen, Deadlines, Jurisdiktionen     |
| Tests                         | 43       | ~4.000+      | Unit, Integration, Co-located            |
| **Gesamt**                    | **~158** | **~35.000+** |                                          |

---

## 4. Datenpipeline & Ingestion Layer

### Tagliche Pipeline — Exakte Sequenz

Die Pipeline lauft in strenger zeitlicher Reihenfolge. Jeder Schritt hangt vom vorherigen ab:

```
04:00 UTC ─── SOLAR FLUX POLLING ─────────────────────────────────────
│  Quelle:    NOAA SWPC (services.swpc.noaa.gov)
│  Daten:     F10.7 Solarfluss-Index (Solar Flux Units)
│  Ziel:      SolarFluxRecord (Upsert, monatliche Granularitat)
│  Zweck:     Kalibriert Atmospharendichte fur Orbital-Decay-Modell
│  Fallback:  F107_REFERENCE = 150 SFU (Sonnenzyklus-Durchschnitt)
│  Timeout:   5 Sekunden, AbortController
│  Auth:      CRON_SECRET via timingSafeEqual (Timing-Attack-sicher)
│
05:00 UTC ─── CELESTRAK POLLING ──────────────────────────────────────
│  Quelle:    CelesTrak GP API (celestrak.org/NORAD/elements/gp.php)
│  Daten:     General Perturbation Orbitalelemente pro NORAD ID
│             (Halbachse, Exzentrizitat, Inklination, RAAN,
│              Arg. Perigaum, mittl. Anomalie, mittl. Bewegung, BSTAR)
│  Ziel:      OrbitalData (Append, tagliche Zeitreihe)
│             + Spacecraft.altitudeKm / inclinationDeg (denormalisiert)
│  Verarbeitung: Sequenziell (Rate-Limit-Schutz), ~2s pro Satellit
│  Fehlerbehandlung: Pro-Satellit try/catch, max 20 Fehler geloggt
│
06:00 UTC ─── EPHEMERIS DAILY ────────────────────────────────────────
│  maxDuration: 300 Sekunden (5 Minuten)
│  Fur jede aktive Organisation mit Spacecraft:
│    1. calculateSatelliteComplianceState()
│       └─ 14 parallele Datenabrufe (Promise.all)
│       └─ 5 Prognosemodelle
│       └─ 8-9 Modul-Scoring + Safety Gate
│       └─ Compliance-Horizont-Berechnung
│    2. Upsert → SatelliteComplianceState
│    3. Append → SatelliteComplianceStateHistory
│       └─ P10/P50/P90 aus Konfidenz:
│          HIGH ± 10%, MEDIUM ± 30%, LOW ± 50%
│    4. Alert-Hysterese:
│       └─ Neue Bedingung → SatelliteAlert + notifyOrganization()
│       └─ Severity-Upgrade → Update bestehender Alert
│       └─ Bedingung aufgelost → resolvedAt = now()
│    5. Cross-Type Impact Propagation:
│       └─ Score-Delta ≥ 5 Punkte → BFS uber EntityDependency-Graph
│       └─ Betroffene Downstream-Entitaten → Notification
```

### Datenquellen-Hierarchie (Vertrauensstufen)

Das System implementiert eine strikte Drei-Stufen-Vertrauenshierarchie:

| Stufe              | Quelle     | Vertrauensniveau                                 | Beispiel                                             |
| ------------------ | ---------- | ------------------------------------------------ | ---------------------------------------------------- |
| **1 (Hochste)**    | Sentinel   | Kryptographisch verifiziert, kontinuierlich      | Treibstoff: 23.7% (Ed25519 signiert, Hash-verkettet) |
| **2**              | Verity     | Kryptographische Attestierung, Zeitpunkt-basiert | "NIS2 Penetrationstest abgeschlossen 15.01.2026"     |
| **3 (Niedrigste)** | Assessment | Selbstberichtet (Formular)                       | "Wir haben einen Deorbit-Plan" (Checkbox)            |

Jeder Modul-Builder durchlauft die Kette von oben nach unten: Wenn Sentinel-Daten verfugbar sind, werden diese verwendet. Wenn nicht, fallt das System auf Verity zuruck. Wenn auch das fehlt, auf Assessment. Wenn keine Daten vorliegen, wird `buildUnknownModule()` aufgerufen — Score 0, Status UNKNOWN, Source "none". **Das System versagt nie stillschweigend.**

### Caching-Architektur

| Cache                       | TTL         | Scope              | Zweck                                                |
| --------------------------- | ----------- | ------------------ | ---------------------------------------------------- |
| CelesTrak GP In-Memory      | 4 Stunden   | Pro NORAD ID       | Vermeidet redundante HTTP-Calls bei Neuberechnung    |
| NOAA F10.7 In-Memory        | 24 Stunden  | Globaler Singleton | F10.7 andert sich langsam (monatliche Kadenz)        |
| Sentinel Agent-ID           | 30 Sekunden | Pro Request        | Verhindert 6-8 identische Agent-Lookups pro Satellit |
| SatelliteComplianceState DB | 2 Stunden   | Pro Satellit       | Fast-Path fur `/api/v1/ephemeris/state`              |
| Fleet State DB              | 25 Stunden  | Pro Organisation   | Fast-Path fur `/api/v1/ephemeris/fleet`              |

### Schutz-Mechanismen der Adapter

- **Prototype Pollution Protection** (Sentinel): `FORBIDDEN_KEYS` Set blockiert `__proto__`, `constructor`, `prototype`
- **Signatur-Validierung** (Sentinel): Nur Pakete mit `signatureValid: true` UND `chainValid: true` werden verwendet (SVA-64)
- **Fehler-Isolation** (Shield): Shield-Adapter in eigenem try/catch — Fehler degradiert collision_avoidance zu UNKNOWN, gesamte Berechnung lauft weiter
- **Timeout-Protection** (CelesTrak): 5-Sekunden `AbortController` verhindert Hanging bei langsamen Responses
- **Metrische Validierung** (Sentinel): `METRIC_RANGES` mit erwarteten Min/Max-Werten pro Datenpunkt, Out-of-Range-Telemetrie wird abgelehnt

---

## 5. Physik- & Prognosemodelle

### Modell 1: Orbitalzerfall (Semi-Analytischer Atmospharischer Drag)

**Datei:** `src/lib/ephemeris/models/orbital-decay.ts` (~370 LOC)

**Kernfrage:** Wann fallt die Orbitalhohe unter regulatorische Schwellen?

**Algorithmus-Kette:**

1. **Atmospharendichte-Lookup** — CIRA/COSPAR 9-Schichten-Exponentialmodell (200-1000 km):

   ```
   rho(h) = rho_0 × exp(-(h - h_0) / H)
   ```

   Neun Schichten von 200 km (rho = 2.541e-10 kg/m3, H = 37 km) bis 1000+ km (rho = 7.248e-16 kg/m3, H = 125 km).

2. **Solarfluss-Korrektur** — Atmospharendichte variiert mit Sonnenaktivitat:

   ```
   rho_eff = rho × (1 + 0.003 × (F10.7 - 150))
   ```

   Bei Sonnenmaximum (~200 SFU): +15% Dichte. Bei Sonnenminimum (~70 SFU): -24% Dichte.

3. **Drag-induzierter Zerfall:**

   ```
   da/dt = -2pi × a^2 × rho × (A/m) × Cd × v
   v = sqrt(mu/a)
   ```

   Standardparameter: A/m = 0.01 m2/kg, Cd = 2.2, mu = 3.986e14 m3/s2.

4. **Euler-Integration** — 7-Tage-Schritte uber 1.825 Tage. Drei Szenarien:
   - Best Case: F10.7 × 0.8 (ruhige Sonne)
   - Nominal: Aktueller F10.7
   - Worst Case: F10.7 × 1.3 (aktive Sonne)

**Regulatorische Schwellen:**

- Art. 68: Orbitale Lebensdauer > 25 Jahre → COMPLIANT
- Warning bei < 200 km Hohe, NON_COMPLIANT bei < 120 km
- Satelliten uber 1.000 km: 100-Jahre-Lebensdauer (vernachlassigbarer Drag)

**Konfidenz:** TLE-Alter → HIGH (<24h), MEDIUM (<7d), LOW (>7d)

### Modell 2: Treibstofferschopfung (Lineare Regression)

**Datei:** `src/lib/ephemeris/models/fuel-depletion.ts` (~403 LOC)

**Kernfrage:** Wann unterschreitet der Treibstoff regulatorische Schwellen?

**Algorithmus:**

- OLS-Lineare Regression auf Sentinel-Treibstoff-Zeitreihe (keine externen ML-Bibliotheken)
- Slope in %/Tag, R2 als Gute-Indikator
- Drei Verbrauchsszenarien: Worst (×1.5), Nominal, Best (×0.7)

**Drei-Stufen-Treibstoff-Kaskade** — Das regulatorisch nuancierteste Element des Systems:

| Schwelle       | Regulation           | Bedeutung                                   | Warning-Puffer  |
| -------------- | -------------------- | ------------------------------------------- | --------------- |
| 25% Treibstoff | EU Space Act Art. 72 | Disposal-Fahigkeit (kontrollierter Deorbit) | Warnung bei 30% |
| 15% Treibstoff | EU Space Act Art. 70 | Passivierungsbereitschaft                   | Warnung bei 20% |
| 10% Treibstoff | IADC Guideline 5.3.1 | Industrie-Best-Practice-Minimum             | Warnung bei 13% |

**Kritische Erkenntnis:** Ein Satellit mit 18% Treibstoff ist gleichzeitig:

- COMPLIANT fur Art. 72 (uber 25%-Schwelle: Nein → WARNING, da unter 30% Warning-Buffer)
- WARNING fur Art. 70 (uber 15%: Ja, aber unter 20% Warning-Buffer)
- COMPLIANT fur IADC 5.3.1 (uber 10%: Ja, uber 13% Warning-Buffer)

Diese Kaskade spiegelt die rechtliche Unterscheidung zwischen End-of-Life-Passivierung (niedrigere Reserve) und aktiver Disposal-Manovrierfahigkeit (hohere Reserve).

**Konfidenz:** HIGH bei ≥30 Datenpunkten UND R2 > 0.8; MEDIUM bei ≥10 UND R2 > 0.5; LOW sonst.

### Modell 3: Subsystem-Degradation

**Datei:** `src/lib/ephemeris/models/subsystem-degradation.ts` (~400 LOC)

Analysiert drei kritische Subsysteme mit gewichteter Aggregation:

| Subsystem  | Gewicht | Default-Degradation           | Kritische Schwelle    | Methode             |
| ---------- | ------- | ----------------------------- | --------------------- | ------------------- |
| Thruster   | 40%     | Mission-Alter / 50.000 Zyklen | Ausfallwahrsch. > 60% | Weibull-Exponential |
| Batterie   | 35%     | 2.5% Kapazitatsverlust/Jahr   | 60% Nominalkapazitat  | Lineartrend         |
| Solararray | 25%     | 2.75% Leistungsverlust/Jahr   | 70% Nominalleistung   | Lineartrend         |

**Regulatorische Zuordnung:** Alle Faktoren → EU Space Act Art. 64. Gesamtes Subsystem-Modul NON_COMPLIANT lost Safety Gate aus → Score ≤ 49.

### Modell 4: Deadline Events (Kalenderbasiert)

6 wiederkehrende Deadlines (NIS2 Art. 21, Art. 8, ITU) mit eskalierender Severity:

- Uberfällig → CRITICAL
- Innerhalb 25% der Vorlaufzeit → HIGH
- Innerhalb Vorlaufzeit → Basis-Severity
- Ausserhalb → LOW

### Modell 5: Regulatorischer Wandel

Liest `RegulatoryUpdate`-Eintrage der letzten 30 Tage (aus `regulatory-feed` Cron um 07:00 UTC).
CRITICAL-Updates → NON_COMPLIANT-Faktor. HIGH-Updates → WARNING-Faktor.

---

## 6. Scoring Engine & Safety Gate

### Gewichtete Aggregation pro Operatortyp

Die Modulregistrierung (`module-registry.ts`, 630 LOC) definiert fur jeden der 7 Operatortypen eine eigene Gewichtungsmatrix:

**SCO (Spacecraft Operator) — 9 Module:**

```
fuel:              ████████████████████  20%   ⚠ Safety Gate
orbital:           ███████████████       15%   ⚠ Safety Gate
subsystems:        ███████████████       15%   ⚠ Safety Gate
collision_avoidance: ███████████████     15%
cyber:             ██████████            10%
ground:            ██████████            10%
documentation:     ████████               8%
insurance:         ███████                7%
registration:      █████                  5%
                   (Summe: 105 — historische 90+15 Kompatibilitat)
```

**LO (Launch Operator) — 9 Module:**

- launch_authorization (20%), range_safety (15%) → Beide Safety-Critical
- third_party_liability (12%), environmental_impact (10%), payload_integration (10%)
- cyber (10%), documentation (8%), frequency_coordination (8%), export_control (7%)

**ISOS (In-Space Operations) — 9 Module:**

- mission_authorization (20%), proximity_operations (15%) → Beide Safety-Critical
- fuel (15%), target_compliance (10%), debris_risk (10%)
- cyber (8%), insurance (8%), documentation (7%), registration (7%)

**TCO (Tracking & Command) — 8 Module, 3 Safety-Critical:**
TCO hat die meisten Safety-Critical-Module aller Operatortypen. Dies spiegelt wider, dass Kommando- und Steuerungsverlust die katastrophalste Einzelfehlerquelle im Weltraumsektor ist.

### Safety Gate — Das Herzstuck

Wenn ein sicherheitskritisches Modul den Status `NON_COMPLIANT` hat, wird der Gesamtscore auf maximal 49 gekappt — **unabhangig davon, wie gut alle anderen Module abschneiden.**

```
Score ≥ 50 bedeutet verlasslich: "Keine aktive Sicherheitsverletzung"
Score < 50 bedeutet garantiert: "Mindestens ein Safety-Gate ausgelost"
```

**Design-Rationale:** Die 49-Punkte-Grenze ist kein Zufall. Sie wurde bewusst unter 50 gesetzt, damit jede Safety-Verletzung den Score in die untere Halfte zwingt. Ein Dashboard-Benutzer kann auf einen Blick erkennen, ob ein Sicherheitsproblem vorliegt.

### Scoring-Algorithmus

```
ModuleScore = worst_factor_wins(factors)
  → Jeder NON_COMPLIANT-Faktor → Modul NON_COMPLIANT
  → Numerisch: COMPLIANT=100, WARNING=60, NON_COMPLIANT=20, UNKNOWN=50

OverallScore = weighted_sum(modules, registry_weights)
  → Dann Safety Gate Check:
     if (any safety_critical module == NON_COMPLIANT):
       score = min(score, 49)
```

### Daten-Leckschutz (Public/Internal Split)

Zwei parallele Typ-Familien existieren:

- `ComplianceFactorInternal`: Enthalt `currentValue` (z.B. Treibstoff 23.7%) und `daysToThreshold`
- `ComplianceFactor`: Offentlich — `currentValue` entfernt

`toPublicState()` konvertiert Internal → Public vor jeder API-Antwort oder Persistierung. Dies verhindert, dass ein API-Konsument den Treibstoffstand oder die Orbitalhohe eines Satelliten aus Compliance-Daten rekonstruieren kann.

---

## 7. Compliance Horizon — Das Kernprodukt

Der **Compliance Horizon** ist die Antwort auf die zentrale Frage: _"Wie viele Tage bis zum ersten regulatorischen Bruch?"_

### Berechnung

1. Scanne alle `daysToThreshold`-Werte uber alle Faktoren aller Module
2. Filtere auf positive Werte wo Status ≠ COMPLIANT
3. Nimm das Minimum → `daysUntilFirstBreach`
4. Identifiziere die zugehorige Regulation → `firstBreachRegulation`

### Konfidenz-Bestimmung

Basiert auf der Anzahl der Module mit nicht-"none" Datenquellen:

- ≥ 6 Module mit Daten → HIGH
- ≥ 3 Module → MEDIUM
- < 3 Module → LOW

### Forecast Engine

`generateForecast()` orchestriert alle 3 Physikmodelle und produziert:

- **ForecastCurves[]:** Wochentliche Datenpunkte uber 5 Jahre (Hohe, Treibstoff, Batterie, Solararray)
- **ComplianceEvents[]:** Prognostizierte zukunftige Ereignisse, sortiert nach Dringlichkeit
- **HorizonDays:** Tage bis zum dringendsten Ereignis
- **P10/P50/P90-Konfidenzband:** Unsicherheits-Hullkurve

**Severity-Eskalation bei Treibstoff-Schwellenkreuzung:**

- < 90 Tage → CRITICAL
- < 365 Tage → HIGH
- > 365 Tage → MEDIUM

---

## 8. Simulationsengine (What-If & Forge)

### What-If-Engine — Backend

**Datei:** `src/lib/ephemeris/simulation/what-if-engine.ts` + `handlers/` (20+ Dateien, ~3.500 LOC)

Die Engine verarbeitet Szenarien uber ein **Dispatch-Table-Pattern** mit 131 registrierten Handlern:

```
SCENARIO_HANDLERS: Record<string, ScenarioHandler>
ScenarioHandler = (baseline, scenario) => WhatIfResult
```

### Szenario-Kategorien

| Kategorie          | Anzahl Handler | Beispiele                                                     |
| ------------------ | -------------- | ------------------------------------------------------------- |
| **Orbital (SCO)**  | 7              | Orbit Raise, Plane Change, Collision Avoidance, Deorbit       |
| **Hardware (SCO)** | 8              | Thruster Failure, Battery Degradation, Solar Array Damage     |
| **Environment**    | 6              | Solar Storm, Debris Impact, Atmospheric Drag Increase         |
| **Communication**  | 4              | Ground Station Loss, Telemetry Degradation                    |
| **Regulatory**     | 6              | Jurisdiction Change, New Requirement, Threshold Change        |
| **Operational**    | 5              | EOL Extension, Fuel Burn, Constellation Resize                |
| **Financial**      | 3              | Insurance Lapse, Budget Cut                                   |
| **Launch (LO)**    | 16             | Launch Delay, Engine Anomaly, FTS Activation, Fairing Failure |
| **ISOS**           | 12             | Target Maneuver, Docking Failure, Consent Withdrawal          |
| **LSO**            | 8              | Range Safety Violation, Environmental Protest                 |
| **CAP/PDP/TCO**    | 18             | Service Outage, Data Breach, Command Link Loss                |
| **Cross-Type**     | 6              | Dependency Failure, Cascade Trigger                           |

### Highlight-Szenarien

**FTS-Aktivierung (Launch):** Das schwerste Nicht-Konstellation-Szenario. Setzt `projectedHorizon: 0`, markiert Art. 62 und Art. 5 als NON_COMPLIANT. Empfehlung: "Pflicht-Untersuchungszeitraum 6-12 Monate". Geschatzte Kosten: $35M.

**Orbit-Ebenenänderung:** Modelliert extreme Treibstoffkosten von Inklinationsanderungen: Standard 8% pro Grad Inklination. Eine 10°-Anderung verbraucht 80% der Treibstoffreserven.

**Jurisdiktionswechsel:** Vergleicht spezifische Anforderungen zwischen 7 EU-Jurisdiktionen + 6 Launch-Jurisdiktionen. Score-Delta: neue Anforderung → -5 Pkt, entferne → +3 Pkt, Verschärfung → -3 Pkt, Lockerung → +2 Pkt.

### EphemerisForge — Frontend (Node-Graph-Canvas)

**Datei:** `src/app/dashboard/ephemeris/components/scenario-builder/` (~3.500 LOC)

Forge ist ein visueller Szenario-Builder auf Basis von `@xyflow/react` (ReactFlow). Der Benutzer baut Szenarien als gerichteten azyklischen Graphen (DAG):

**Architektur:**

```
┌─────────────────────────────────────────────────────────────┐
│  EphemerisForge (Orchestrator)                               │
│    ├── useForgeGraph (Reducer + Undo/Redo + Chain-Erkennung)│
│    ├── useForgeComputation (Auto-Compute + Debounce)        │
│    ├── ReactFlow Canvas                                      │
│    │     ├── SatelliteOriginNode (Wurzel, grun)             │
│    │     ├── ScenarioNode[] (Parametrisierbar)              │
│    │     ├── ResultNode[] (Aggregierte Ergebnisse)          │
│    │     └── ForgeEdge[] (Animiert, Severity-kodiert)       │
│    ├── BlockPalette (26 Kategorien, Drag & Drop)            │
│    ├── SlashCommand (Spotlight-Suche mit /)                 │
│    ├── RadialMenu (Rechtsklick-Kontextmenu)                 │
│    ├── ForgeToolbar (Speichern/Laden, Zoom, Minimap)        │
│    ├── ComparisonBar (Branch-Vergleich)                      │
│    └── ForgeAstraChat (AI-Assistent, draggbar)              │
└─────────────────────────────────────────────────────────────┘
```

**Kern-Mechanismen:**

1. **Graph-Fingerprinting:** Bei jeder Mutation wird ein Fingerprint aus Node-IDs, Definitionen, Parametern und Kanten erstellt. Anderung → Neuberechnung ausgelost.

2. **500ms Debounce + AbortController:** Jede Mutation startet einen 500ms-Timer. Neue Mutation bricht laufende API-Calls ab und startet neu.

3. **Chain-Erkennung (DAG-Walk):** BFS vom Origin-Node, identifiziert parallele Branches. Branches laufen parallel (`Promise.allSettled`), Steps innerhalb eines Branches sequenziell.

4. **Undo/Redo:** `useReducer` mit 50-Stufen-History. Nur strukturelle Anderungen (Add/Remove Node/Edge) in History. Compute-State-Updates uberspringen History.

5. **localStorage-Persistenz:** Szenarien werden pro NORAD ID in localStorage gespeichert — bewusste Entscheidung gegen DB-Writes fur explorative Szenarien.

6. **Zoom-adaptive Darstellung:** ScenarioNode zeigt bei Zoom ≥ 0.6 volle Slider-Controls, bei 0.5-0.6 Text-Summary, bei < 0.5 keine Parameter.

---

## 9. Advanced Analytics Layer

### 9.1 Anomalie-Erkennung

**Datei:** `src/lib/ephemeris/anomaly/anomaly-detector.ts` (640 LOC)

Vier Erkennungsmethoden pro Satellit + eine flottenweit:

| Methode                      | Erkennt                                              | Schwellwerte                          |
| ---------------------------- | ---------------------------------------------------- | ------------------------------------- |
| **Z-Score**                  | Score-Ausreisser + beschleunigte Verschlechterung    | Z > 2.0 → WARNING, Z > 3.0 → CRITICAL |
| **Moving Average Crossover** | Trendumkehr (7-Tage SMA kreuzt unter 30-Tage SMA)    | Gap ≥ 3 Punkte, widening              |
| **Forecast Miss**            | Modell-Divergenz (beobachtet ausserhalb P10-P90)     | Requires P10/P90 aus History          |
| **Module Spikes**            | Einzelmodul-Degradation                              | Per-Modul Z-Score                     |
| **Fleet Correlation**        | Systemische Probleme (Pearson > 0.8, ≥ 3 Satelliten) | Korrelierter Abwartstrend             |

**Design:** Singleton-Pattern mit konfigurierbaren Schwellen. Default: `minDataPoints: 7`, `zScoreWarning: 2.0`, `zScoreCritical: 3.0`, `shortMaWindow: 7`, `longMaWindow: 30`.

### 9.2 Regulatorische Kaskaden-Propagation

**Datei:** `src/lib/ephemeris/cascade/dependency-graph.ts` (563 LOC)

Ein statischer 24-Knoten regulatorischer Abhangigkeits-DAG uber 8 Frameworks:

```
EU Space Act (9 Knoten) ←→ NIS2 (3 Knoten) ←→ IADC (3 Knoten)
     ↕                         ↕                    ↕
DE-SatDSiG (2)           FR-LOS (2)           UK-SIA (2)
     ↕                                              ↕
NO-SpaceAct (1)                              ITU-RR (2)
```

**BFS-Propagationsalgorithmus:**

1. Starte am Trigger-Knoten
2. Traversiere Downstream-`dependents`-Kanten Level fur Level
3. 40% Dampfung pro Kaskadenlevel: `impact × 0.6^depth`
4. `changeType`-Multiplikatoren: new_requirement × 1.2, threshold_change × 1.0, deadline_change × 0.8, repeal × 0.5

**Score-Delta → Severity:** ≥20 → CRITICAL, ≥10 → HIGH, ≥5 → MEDIUM, sonst LOW.

### 9.3 Konflikt-Erkennung

**Datei:** `src/lib/ephemeris/cascade/conflict-detector.ts` (446 LOC)

Erkennt regulatorische Konflikte zwischen Jurisdiktionen. 19 bekannte Anforderungen mit quantitativen Schwellen. Vergleicht Richtungen: Wenn zwei Anforderungen gegenlaufig sind (≥ X UND ≤ Y) und X > Y → **unmoglicher Bereich** → CONFLICT (CRITICAL).

### 9.4 Fleet Intelligence

**Datei:** `src/lib/ephemeris/fleet/fleet-intelligence.ts` (471 LOC)

7 Analytiken:

1. Fleet Score (gewichteter Durchschnitt)
2. Risikoverteilung (NOMINAL ≥ 85, WATCH ≥ 70, WARNING ≥ 50, CRITICAL < 50)
3. Weakest Links (Top 3 Satelliten nach Fleet-Impact)
4. Korrelationsmatrix (Pearson auf Score-Deltas)
5. Fleet Horizon (Minimum uber alle Satelliten)
6. 7-Tage-Trend
7. 30-Tage-Trend (IMPROVING > +1, DECLINING < -1, STABLE)

### 9.5 Cross-Type Intelligence

**Datei:** `src/lib/ephemeris/fleet/cross-type-intelligence.ts` (287 LOC)

- **SPOF-Identifikation:** Jeder Knoten mit Abhangigen. Ranking nach Kritikalitat × (100 - Score).
- **Kaskaden-Risikobewertung:** DFS-Chain-Finding mit max Tiefe 5. High-Risk: Ketten-Wurzel Score < 70.
- **Typ-Korrelation:** Proxy = 1 - |avgScoreA - avgScoreB| / 100.

---

## 10. Frontend-Architektur & UX

### Zwei Oberflachen

| Eigenschaft     | Dashboard (`/dashboard/ephemeris`)       | Marketing (`/systems/ephemeris`) |
| --------------- | ---------------------------------------- | -------------------------------- |
| **Asthetik**    | Bloomberg Terminal, dunkel               | Weiss, minimalistisch            |
| **Font**        | IBM Plex Mono                            | System (Inter)                   |
| **Farbschema**  | `useEphemerisTheme()` (runtime JS)       | Tailwind-Klassen                 |
| **Animationen** | Keine (Performance-fokussiert)           | Framer Motion Scroll-Trigger     |
| **Seiten**      | Fleet Command + Satellite Detail + Forge | 8 Sektionen, animiert            |
| **Daten**       | Live API-Anbindung                       | Hardcodierte Demo-Werte          |

### Dashboard: Fleet Command (page.tsx, ~700 LOC)

Zwei-Phasen-Laden:

1. **Phase 1 (schnell):** Fleet aus DB-Cache → Tabelle sofort sichtbar
2. **Phase 2 (langsam):** Intelligence + Benchmark im Hintergrund

Vier Tabs: Fleet (sortierbare Tabelle), Alerts, Intelligence (Weakest Links, Korrelation, Trends), Dependencies (Force-Graph).

### Dashboard: Satellite Detail ([noradId]/page.tsx, ~700 LOC)

Funf Tabs:

1. **Forecast:** Recharts ComposedChart mit Konfidenzband + Threshold-Linien
2. **Modules:** Grid von Compliance-Modul-Karten mit erweiterbaren Faktor-Listen
3. **Scenarios:** Vollbild EphemerisForge Canvas
4. **Cascade:** JurisdictionSimulator + Regulatory Cascade Analyse
5. **Data Sources:** Dependency Management + Verbindungsstatus-Grid

### Dependency Graph View (1.374 LOC)

Eigene Force-Directed Layout-Berechnung (ohne D3):

- 50 Iterationen: Abstossung (8000/dist2), Anziehung (dist × 0.01), Dampfung (0.85)
- 7 Operatortyp-Farben, pulsierende Animation fur at-risk Knoten (Score < 70)
- 4 Sub-Tabs: Graph, SPOFs, Risk Concentrations, Cascades

### Design-System-Divergenz (Kritische Beobachtung)

Drei verschiedene Styling-Ansatze koexistieren innerhalb von Ephemeris:

1. **Dashboard-Seiten:** Komplett inline `style={{}}` mit `useEphemerisTheme()` JS-Objekten. Kein Tailwind, keine CSS-Variablen.
2. **Forge Canvas:** Mix aus inline Styles mit `FORGE`/`GLASS`-Konstanten + sporadische Tailwind-Klassen. Immer Hell-Theme.
3. **Jurisdiction Simulator:** Nutzt `GlassCard` + CSS-Variable-Tokens (`var(--accent-primary)`) + Tailwind — ausgerichtet am Plattform-Design-System.

Diese Inkonsistenz reflektiert, dass verschiedene Teile zu verschiedenen Zeitpunkten gebaut wurden.

---

## 11. API-Oberflache & Cron-Orchestrierung

### Authentifizierung

Alle 13 Haupt-Routen teilen ein identisches Zwei-Schichten-Sicherheitsmodell:

1. Session-Auth (NextAuth v5) → 401 wenn keine Session
2. Organisations-Mitgliedschaft → 403 wenn kein Org-Zugehorigkeit
3. Satelliten-Eigentum → 404 wenn Satellit nicht zur Organisation gehort

Cron-Routen: Bearer Token via `CRON_SECRET`, verglichen mit `timingSafeEqual` (Timing-Attack-sicher).

### Routen-Ubersicht

| Route                       | Methode      | Zweck                               | Cache              | Aufwand                       |
| --------------------------- | ------------ | ----------------------------------- | ------------------ | ----------------------------- |
| `/state`                    | GET          | Einzelsatellit-Compliance-State     | 2h DB              | Niedrig (Cache) / Hoch (Live) |
| `/fleet`                    | GET          | Flottenweiter State (SCO + LO)      | 25h DB             | Mittel                        |
| `/forecast`                 | GET          | 5-Jahres-Prognosekurven             | Keine              | Hoch (immer live)             |
| `/horizon`                  | GET          | Tage-bis-Bruch-Zusammenfassung      | Keine              | Hoch (redundant mit /state)   |
| `/history`                  | GET          | Historische Snapshots (30 Tage)     | N/A (DB-Read)      | Niedrig                       |
| `/alerts`                   | GET          | Aktive Alerts (ungelost)            | N/A (DB-Read)      | Niedrig                       |
| `/recalculate`              | POST         | Manuelle Neuberechnung + Persist    | Uberschreibt Cache | Hoch                          |
| `/what-if`                  | POST         | Szenario-Simulation                 | Keine              | Mittel                        |
| `/simulate`                 | POST         | Jurisdiktionswechsel-Simulation     | Keine              | Hoch (immer live)             |
| `/cascade`                  | GET/POST     | Regulatorische Kaskade              | Keine              | Mittel                        |
| `/anomalies`                | GET/POST     | Statistische Anomalie-Erkennung     | Keine              | Mittel-Hoch                   |
| `/fleet/intelligence`       | GET          | Fleet Analytics + Benchmark         | Keine              | Hoch                          |
| `/fleet/cross-type`         | GET          | Cross-Operator-Intelligence         | Keine              | Hoch                          |
| `/dependencies`             | GET/POST/DEL | Entity-Dependency CRUD              | N/A                | Niedrig                       |
| `/dependencies/auto-detect` | POST         | KI-gestutzte Abhangigkeitserkennung | Keine              | Mittel                        |

---

## 12. Datenmodell & Persistenz

### Ephemeris-spezifische Prisma-Modelle

| Modell                            | Typ                    | Schlusselfunktion                                                         |
| --------------------------------- | ---------------------- | ------------------------------------------------------------------------- |
| `SatelliteComplianceState`        | Live-Snapshot (Upsert) | `noradId + operatorId` unique, `stateJson`, `overallScore`, `horizonDays` |
| `SatelliteComplianceStateHistory` | Append-only            | `forecastP10/P50/P90`, `inputsHash` (SHA-256 fur Reproduzierbarkeit)      |
| `EphemerisForecast`               | Kurven-Cache (24h TTL) | `forecastCurves`, `complianceEvents`, `f107Used`, `modelVersion`          |
| `SatelliteAlert`                  | Alert-Lifecycle        | `dedupeKey` fur Hysterese, `resolvedAt` + `acknowledged`                  |
| `OrbitalData`                     | TLE-Zeitreihe          | `altitude`, `inclination`, `rawGp` (JSON), `epoch`                        |
| `SolarFluxRecord`                 | F10.7-Historie         | `f107`, `observedAt` (monatlich), `source`                                |
| `EntityDependency`                | Cross-Type-Graph       | `sourceEntityId` ↔ `targetEntityId`, `dependencyType`, `strength`         |

### Indexierung

- `SatelliteComplianceState`: Index auf `operatorId` + `horizonDays` — ermoglicht "sortiere Flotte nach nachstem Bruch"
- `SatelliteComplianceStateHistory`: Doppel-Index auf `noradId,calculatedAt` und `operatorId,calculatedAt`
- `SatelliteAlert`: Index auf `dedupeKey` — kritisch fur Hysterese-Logik
- `OrbitalData`: Index auf `noradId,epoch` — zeitgeordnete TLE-Abfragen

### Auditierbarkeit

`inputsHash` auf `SatelliteComplianceStateHistory` ist ein SHA-256 uber TLE-Alter + F10.7 + Sentinel-Zeitreihen-Hashes. Regulatoren konnen verifizieren, dass ein an einem bestimmten Tag gemeldeter Compliance-Score legitime TLE-Daten und Solarfluss-Werte verwendet hat.

---

## 13. Regulatorische Wissensbasis

### Schwellen-Datei (Shared Source of Truth)

`src/lib/compliance/thresholds.ts` — 9 quantitative Compliance-Grenzen, geteilt zwischen Verity (Pass/Fail-Attestierung) und Ephemeris (zweistufiges Warning-System):

| Schlüssel               | Metrik                   | Schwelle   | Typ   | Warning-Buffer |
| ----------------------- | ------------------------ | ---------- | ----- | -------------- |
| `eu_space_act_art_68`   | estimated_lifetime_yr    | 25         | BELOW | 3 Jahre        |
| `eu_space_act_art_70`   | remaining_fuel_pct       | 15%        | ABOVE | 5%             |
| `eu_space_act_art_72`   | remaining_fuel_pct       | 25%        | ABOVE | 5%             |
| `eu_space_act_art_64`   | ca_maneuver_capability   | 1          | ABOVE | 0 (binar)      |
| `nis2_art_21_2_e_patch` | patch_compliance_pct     | 80%        | ABOVE | 5%             |
| `nis2_art_21_2_j`       | mfa_adoption_pct         | 95%        | ABOVE | 2%             |
| `nis2_art_21_2_e_vulns` | critical_vulns_unpatched | 1          | BELOW | 0 (binar)      |
| `nis2_art_23`           | mttr_minutes             | 1440 (24h) | BELOW | 240 (4h)       |
| `iadc_5_3_1`            | remaining_fuel_pct       | 10%        | ABOVE | 3%             |

### Operator-spezifische Deadline-Registrierungen

6 Dateien definieren operator-spezifische Compliance-Deadlines:

| Datei                             | Operatortyp | Deadlines                   | Besonderheiten                                         |
| --------------------------------- | ----------- | --------------------------- | ------------------------------------------------------ |
| `tco-requirements.ts`             | TCO         | 14                          | Langste Vorlaufzeit: 270 Tage (Auth-Erneuerung)        |
| `pdp-requirements.ts`             | PDP         | 12                          | Einziger mit ITU + EU Dual-Use Referenzen              |
| `cap-requirements.ts`             | CAP         | 13                          | Kurzeste Vorlaufzeit: 14 Tage (Kundenbenachrichtigung) |
| `isos-requirements.ts`            | ISOS        | 12 + PROXIMITY_THRESHOLDS   | Einziger mit Physik-Konstanten (km, m/s)               |
| `lso-requirements.ts`             | LSO         | 14                          | Einziger mit national_civil_protection Referenz        |
| `launch-operator-requirements.ts` | LO          | 16 + 6 LAUNCH_JURISDICTIONS | Grosstes Deadline-Array, 5 per-campaign Items          |

### COPUOS/IADC-Brucke

`copuos-iadc-requirements.ts` — 21 COPUOS LTS Guidelines + IADC/ISO 24113 Guidelines mit `getApplicableGuidelines(profile)` Filter-Funktion. Verbindet internationale Standards mit EU Space Act-Artikeln uber `euSpaceActCrossRef`-Felder.

### US-Regulatorik & Harmonisierungslucken

`us-space-regulations.ts` — FCC, FAA, ORBITS Act 2025. Der kritischste Datenpunkt:

**5-Jahres vs. 25-Jahres Deorbit-Divergenz:** FCC/ORBITS Act verlangt 5-Jahres LEO-Deorbit. EU Space Act verlangt 25-Jahres Lebensdauer-Limit. Ein Betreiber mit sowohl FCC-Lizenz als auch EU Space Act-Genehmigung steht vor einem mathematisch unmoglichen Dual-Compliance-Szenario fur bestimmte Orbits.

---

## 14. Test-Abdeckung & Qualitat

### Ubersicht

| Kategorie            | Dateien | LOC (ca.)  | Abdeckung                                                  |
| -------------------- | ------- | ---------- | ---------------------------------------------------------- |
| Core Engine Tests    | 15      | ~2.000     | Compliance Horizon, alle 7 Operator-Typen, Scoring         |
| Physik-Modell Tests  | 6       | ~600       | Orbital Decay, Fuel Depletion, Shared Thresholds           |
| Simulation Tests     | 4       | ~500       | Scenario Builder, useScenarioSimulation, Block Definitions |
| Cron Tests           | 1       | ~200       | ephemeris-daily (umfassend)                                |
| Adapter Tests        | 3       | ~400       | CelesTrak, Shield, Cross-Verification                      |
| UI-Komponenten Tests | 8       | ~500       | Forecast Curve, Animated Counter, Marketing Components     |
| **Gesamt**           | **43**  | **~4.200** |                                                            |

### Starken

- **Compliance Horizon:** 23 Tests mit Factory-Funktionen, deckt alle Edge Cases (null-Horizont, bereits verletzt, negativer daysToThreshold)
- **Operator-Typ-Tests:** Jeder der 7 Typen hat dedizierte Operator-Tests (ISOS, LO, LSO, CAP, PDP, TCO)
- **Cron-Test:** `ephemeris-daily.route.test.ts` mockt die gesamte Pipeline (Prisma, calculateState, generateForecast, Alerts)
- **Shield-Adapter:** Reine Funktionen separat von DB-abhangigen Funktionen getestet
- **Threshold-Sharedness:** Testet, dass Ephemeris und Verity dieselben Schwellen verwenden

### Lucken

- **Forecast Engine:** Kein dedizierter Unit-Test (Logik uber Physikmodell-Tests abgedeckt, aber keine Integrations-Ebene)
- **What-If-Handler:** 131 Handler, aber nur Scenario Builder UI-Tests — keine Backend-Handler-Unit-Tests
- **Anomaly Detector:** Kein dedizierter Test (640 LOC Engine ohne Tests)
- **Dependency Graph / Conflict Detector:** Keine Tests (1.009 LOC)
- **Fleet Intelligence:** Kein dedizierter Test (471 LOC)
- **API-Routen:** Keine Route-Level-Integration-Tests

---

## 15. Wettbewerbsgraben (Competitive Moat)

### Vier strukturelle Vorteile

| #   | Moat                                              | Tiefe                                                                                                                             | Nachahmungsbarriere                                              |
| --- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 1   | **Regulatorische Wissensbasis**                   | 119 EU Space Act-Artikel, NIS2, COPUOS/IADC/ISO, 10+ nationale Gesetze, US FCC/FAA/ORBITS                                         | 12-18 Monate Aufbau durch Rechtsexperten, kontinuierliche Pflege |
| 2   | **Physik-Modelle mit regulatorischer Ankopplung** | Nicht SGP4 (Kurzzeitpropagation), sondern Langzeit-Drag-Modell mit Solarfluss-Korrektur, direkt an Artikelschwellen gekoppelt     | Seltene Kombination aus Orbitalmechanik- und Rechtsexpertise     |
| 3   | **Kryptographische Evidenzkette (Sentinel)**      | Ed25519-signierte, Hash-verkettete Telemetriepakete                                                                               | Erfordert Agent-Deployment beim Kunden, Netzwerkeffekt           |
| 4   | **Multi-Operatortyp-Compliance**                  | 7 Operatortypen (SCO, LO, ISOS, LSO, CAP, PDP, TCO) mit jeweils eigenen Modulgewichtungen, Safety Gates, Deadline-Registrierungen | Kein Wettbewerber deckt mehr als SCO ab                          |

### Netzwerkeffekte

- Jeder neue Sentinel-Agent verstarkt die Fleet-Correlation-Analyse
- Jede neue Jurisdiktion verbessert die Jurisdiktionsvergleiche
- Jede neue Verity-Attestierung erhoht die Vertrauensstufe der Datenbasis

---

## 16. Technische Schulden & Lucken

### Kritisch (Sofort adressieren)

| #   | Problem                                                                      | Impact                                                                                     | Aufwand                                        |
| --- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| 1   | **`/what-if` API validiert nur 5 von 131 Szenarien**                         | Forge-UI kann 131 Szenarien senden, API akzeptiert nur 5 → 400-Error fur 96% der Szenarien | 1-2 Stunden                                    |
| 2   | **Dynamischer Prisma-Zugriff** (`prisma as unknown as Record`) fur 3 Modelle | Stille Fehler (leere Daten statt Errors), inkonsistent (`/cascade` nutzt direkt)           | 4-8 Stunden (Schema-Migration + Regenerierung) |
| 3   | **CAP/PDP/TCO Stub-Module**                                                  | 11 Module geben `buildUnknownModule()` zuruck → Score immer 0 fur diese Module             | 2-3 Wochen pro Modul                           |
| 4   | **Keine Route-Level-Tests**                                                  | 16 API-Routen ohne Integration-Tests                                                       | 1-2 Wochen                                     |
| 5   | **Anomaly Detector ohne Tests**                                              | 640 LOC statistischer Code ohne Verifikation                                               | 3-5 Tage                                       |

### Hoch (Kurzfristig adressieren)

| #   | Problem                                 | Impact                                                                                         |
| --- | --------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 6   | `/horizon` redundant mit `/state`       | Gleiche teure Berechnung, nur Horizon-Feld zuruckgegeben                                       |
| 7   | `/recalculate` schreibt keine History   | History-Lucke zwischen Cron-Laufen, Anomaly Detection verliert Datenpunkte                     |
| 8   | CelesTrak-Polling sequenziell           | ~2s × n Satelliten, bei 50 Satelliten = 100s. Batch-Parallelisierung wurde auf ~20s reduzieren |
| 9   | Kein Cache-Invalidation bei Recalculate | Nach Recalculate liefert /state fur 2h alte Cache-Werte                                        |
| 10  | Inkonsistente Auth in `/dependencies`   | Liest `session.user.organizationId` direkt statt uber `organizationMember`-Query               |

### Mittel (Mittelfristig adressieren)

| #   | Problem                                  | Impact                                        |
| --- | ---------------------------------------- | --------------------------------------------- |
| 11  | 3 Design-Systeme in einem Feature        | Wartungsaufwand, visuelle Inkonsistenzen      |
| 12  | Statische 24-Knoten Regulatory DAG       | Manuelle Pflege bei neuen Artikeln            |
| 13  | Keine Rate-Limiting auf Ephemeris-Routen | DDoS-Risiko auf rechenintensive Endpunkte     |
| 14  | LSO Emergency Response immer UNKNOWN     | Modul-Builder nutzt keine Assessment-Daten    |
| 15  | block-definitions.ts = 97.7 KB           | Grosste Einzeldatei, sollte aufgeteilt werden |

---

## 17. Risikobewertung

### Betriebsrisiken

| Risiko                 | Wahrscheinlichkeit | Impact                            | Mitigation                                    |
| ---------------------- | ------------------ | --------------------------------- | --------------------------------------------- |
| CelesTrak-API-Ausfall  | Mittel             | Hoch (keine neuen TLE)            | 4h In-Mem-Cache + DB-Historie als Fallback    |
| NOAA-SWPC-Ausfall      | Niedrig            | Mittel (ungenauer Drag)           | F107_REFERENCE = 150 SFU Fallback             |
| Sentinel-Agent-Offline | Hoch               | Mittel (degradiert zu Assessment) | Drei-Stufen-Fallback-Kette                    |
| Cron-Job-Failure       | Mittel             | Hoch (veraltete States)           | 25h-Cache-Fenster toleriert eine Auslassung   |
| Prisma-Schema-Drift    | Hoch               | Mittel (stille leere Daten)       | Migration + Client-Regenerierung priorisieren |

### Regulatorische Risiken

| Risiko                                               | Wahrscheinlichkeit | Impact                                                   |
| ---------------------------------------------------- | ------------------ | -------------------------------------------------------- |
| EU Space Act Art. 68 Schwellenänderung (25→20 Jahre) | Mittel             | Einfach anpassbar uber `thresholds.ts`                   |
| Neue EU-Operatortyp-Kategorie                        | Niedrig            | 2-3 Wochen Implementierung (Architektur bereit)          |
| FCC/EU Divergenz verschärft sich                     | Hoch               | Ephemeris modelliert dies bereits uber `usEuComparisons` |
| NIS2 Scope-Erweiterung auf Space                     | Hoch               | Bereits vorbereitet (NIS2-Module in allen Operatortypen) |

---

## 18. Strategische Empfehlungen

### Sofort (0-4 Wochen)

1. **What-If API-Validierung auf alle 131 Typen erweitern** — Blockiert gesamte Forge-Funktionalitat. Fix: `VALID_SCENARIO_TYPES` Array erweitern oder Validierung gegen `WhatIfScenarioType` Union.

2. **Prisma-Schema-Migration abschliessen** — Alle 3 dynamisch zugegriffenen Modelle in generierten Client aufnehmen. Eliminiert stille Fehler und "model not yet available"-Fallbacks.

3. **`/horizon`-Redundanz eliminieren** — Route auf `/state`-Cache umstellen oder als Alias implementieren.

4. **Cache-Invalidation bei Recalculate** — `updatedAt`-Timestamp statt Alters-Check fur Cache-Freshness.

### Kurzfristig (1-3 Monate)

5. **Test-Abdeckung fur kritische Lucken** — Anomaly Detector, Dependency Graph, Fleet Intelligence, What-If Handler. Prioritat nach Business-Impact.

6. **CelesTrak-Batch-Parallelisierung** — Sequenziell → 5er-Batches mit 1s Pause. Reduziert Cron-Laufzeit um ~80%.

7. **Stub-Module schrittweise implementieren** — Prioritat: TCO (3 Safety-Critical-Module!), dann CAP, dann PDP.

8. **Rate-Limiting auf rechenintensive Endpunkte** — `/forecast`, `/fleet/intelligence`, `/anomalies`, `/cascade` mit `generate2`-Tier (20/hr) begrenzen.

### Mittelfristig (3-6 Monate)

9. **Design-System-Konsolidierung** — Drei Styling-Ansatze zu einem vereinheitlichen. Empfehlung: Ephemeris-Theme-Tokens in CSS-Variablen uberfuhren, kompatibel mit Plattform-GlassCard-System.

10. **Regulatorischer DAG dynamisch machen** — 24-Knoten-Graph als Konfigurationsdatei oder DB-Modell statt Hardcode. Ermoglicht NCA-Portal-Integration.

11. **History-Writes bei manueller Neuberechnung** — `/recalculate` soll auch `SatelliteComplianceStateHistory` schreiben. Verbessert Anomaly Detection.

12. **Real-Time Streaming fur Sentinel** — Aktuell Polling-basiert (Cron alle 24h). WebSocket/SSE fur kritische Metriken (Treibstoff, Thruster-Status) ermoglichen.

### Langfristig (6-12 Monate)

13. **Ensemble-Modelle fur Orbital Decay** — Aktuelles Semi-Analytisches Modell mit ML-basierter Korrektur erganzen (Training auf historischen TLE-Deltas).

14. **Multi-Tenant Regulatory Graph** — Jurisdiktionsprofile als per-Organisation konfigurierbare Entitaten. Ermoglicht Kunden-spezifische Schwellenanpassungen.

15. **Ephemeris-as-API-Product** — Eigenstandiges API-Produkt fur Versicherer und NCAs, unabhangig von Dashboard. Eigener Stripe-Tier.

---

## 19. Anhang A — Vollstandiges File-Inventar

### Core Engine

| Datei                                | LOC   | Funktion                               |
| ------------------------------------ | ----- | -------------------------------------- |
| `core/types.ts`                      | 1.112 | Alle Typen, Enums, Interfaces          |
| `core/constants.ts`                  | 207   | Physik-Konstanten, Schichtmodell       |
| `core/module-registry.ts`            | 630   | 7 Operatortyp-Modulregistrierungen     |
| `core/satellite-compliance-state.ts` | 720   | Zentrale Dispatch + SCO-Kalkulator     |
| `core/scoring.ts`                    | 187   | Scoring-Algorithmus + Safety Gate      |
| `core/entity-adapter.ts`             | 80    | Prisma → OperatorEntityInput Konverter |
| `core/launch-compliance-state.ts`    | 580   | LO-Kalkulator                          |
| `core/isos-compliance-state.ts`      | 767   | ISOS-Kalkulator (komplexester)         |
| `core/lso-compliance-state.ts`       | 694   | LSO-Kalkulator                         |
| `core/cap-compliance-state.ts`       | 309   | CAP-Kalkulator (Stubs)                 |
| `core/pdp-compliance-state.ts`       | 332   | PDP-Kalkulator (Stubs)                 |
| `core/tco-compliance-state.ts`       | 335   | TCO-Kalkulator (Stubs)                 |

### Data Adapters

| Datei                        | LOC  | Funktion                            |
| ---------------------------- | ---- | ----------------------------------- |
| `data/sentinel-adapter.ts`   | 239  | Telemetrie-Zeitreihen + Agent-Cache |
| `data/celestrak-adapter.ts`  | 116  | TLE/GP-Fetch + 4h Cache             |
| `data/eurlex-adapter.ts`     | 127  | Regulatorische Anderungen (DB-Read) |
| `data/assessment-adapter.ts` | 228  | 5 parallele Assessment-Queries      |
| `data/verity-adapter.ts`     | 106  | Attestation-Queries                 |
| `data/shield-adapter.ts`     | 245  | Collision Avoidance Events          |
| `data/solar-flux-adapter.ts` | ~100 | F10.7 NOAA + 24h Cache              |

### Prediction Models

| Datei                             | LOC | Funktion                          |
| --------------------------------- | --- | --------------------------------- |
| `models/orbital-decay.ts`         | 370 | Semi-analytischer Drag-Zerfall    |
| `models/fuel-depletion.ts`        | 403 | Lineare Regression auf Treibstoff |
| `models/subsystem-degradation.ts` | 400 | Thruster/Battery/Solar-Weibull    |
| `models/deadline-events.ts`       | 191 | Kalenderbasierte Deadlines        |
| `models/regulatory-change.ts`     | 134 | EUR-Lex Impact-Mapping            |

### Simulation

| Datei                                  | LOC    | Funktion                    |
| -------------------------------------- | ------ | --------------------------- |
| `simulation/what-if-engine.ts`         | 277    | Dispatcher + Legacy-Handler |
| `simulation/handlers/index.ts`         | 322    | 131-Handler Dispatch-Table  |
| `simulation/handlers/orbital.ts`       | 594    | 7 Orbital-Handler           |
| `simulation/handlers/launch.ts`        | 800    | 16 Launch-Handler           |
| `simulation/handlers/hardware.ts`      | ~300   | Hardware-Szenario-Handler   |
| `simulation/handlers/[11 weitere]`     | ~1.500 | Alle ubrigen Domanen        |
| `simulation/jurisdiction-simulator.ts` | 359    | Jurisdiktionsvergleich      |

### Advanced Analytics

| Datei                              | LOC | Funktion                                 |
| ---------------------------------- | --- | ---------------------------------------- |
| `anomaly/anomaly-detector.ts`      | 640 | Z-Score, MA Crossover, Fleet Correlation |
| `cascade/dependency-graph.ts`      | 563 | 24-Knoten Regulatory DAG + BFS           |
| `cascade/conflict-detector.ts`     | 446 | Cross-Jurisdiktion Konflikt-Erkennung    |
| `fleet/fleet-intelligence.ts`      | 471 | 7 Fleet-Analytiken                       |
| `fleet/cross-type-intelligence.ts` | 287 | SPOF, Cascades, Typ-Korrelation          |

### Frontend (Top-15 nach Komplexitat)

| Datei                                                | LOC     | Funktion                               |
| ---------------------------------------------------- | ------- | -------------------------------------- |
| `scenario-builder/block-definitions.ts`              | ~5.000+ | 55+ Block-Definitionen (97.7 KB)       |
| `components/dependency-graph-view.tsx`               | 1.374   | Force-Directed SVG + 4 Analyse-Panels  |
| `scenario-builder/useForgeGraph.ts`                  | 801     | Reducer + Undo/Redo + Chain-Walk       |
| `page.tsx` (Fleet Command)                           | ~700    | 4-Tab Fleet Dashboard                  |
| `[noradId]/page.tsx`                                 | ~700    | 5-Tab Satellite Detail                 |
| `components/dependency-management.tsx`               | 572     | Dependency CRUD + Auto-Detect          |
| `scenario-builder/useForgeComputation.ts`            | 539     | Auto-Compute + Debounce + Cancel       |
| `components/alerts-sidebar.tsx`                      | 477     | Kollabierbare Alert-Sidebar            |
| `overlays/ForgeToolbar.tsx`                          | 462     | Save/Load + Zoom + Minimap             |
| `scenario-builder/EphemerisForge.tsx`                | 428     | ReactFlow Canvas Orchestrator          |
| `components/scenario-builder/nodes/ScenarioNode.tsx` | 399     | Zoom-adaptiver Parametrisierbarer Node |
| `forecast-curve.tsx` (Marketing)                     | 366     | Animierte SVG Prognose-Kurve           |
| `overlays/BlockPalette.tsx`                          | 364     | 26-Kategorien Block-Palette            |
| `overlays/RadialMenu.tsx`                            | 339     | Radiales Kontextmenu                   |
| `overlays/SlashCommand.tsx`                          | 297     | Spotlight-Command-Palette              |

---

## 20. Anhang B — Metriken auf einen Blick

```
┌─────────────────────────────────────────────────────────────┐
│                EPHEMERIS — SYSTEM METRICS                     │
├─────────────────────────┬───────────────────────────────────┤
│ Total Files             │ ~158                              │
│ Total Lines of Code     │ ~35.000+                          │
│ Languages               │ TypeScript (100%)                 │
│ Operator Types          │ 7 (SCO, LO, ISOS, LSO, CAP,     │
│                         │    PDP, TCO)                      │
│ Compliance Modules      │ 60 (7-9 pro Operator × 7 Typen)  │
│ Safety-Critical Modules │ 14 (uber alle Operatortypen)      │
│ Physics Models          │ 5                                 │
│ What-If Scenario Types  │ 131 Handler                       │
│ Forge Block Definitions │ 55+ uber 26 Kategorien            │
│ API Endpoints           │ 16+ authentifizierte Routen       │
│ Cron Jobs               │ 3 tagliche (04:00, 05:00, 06:00) │
│ External APIs           │ 2 (CelesTrak, NOAA SWPC)         │
│ DB Models               │ 7 Ephemeris + 3 Upstream          │
│ Jurisdictions           │ 7 EU + 6 Launch + US              │
│ Regulatory Frameworks   │ 8+ (EU SA, NIS2, IADC, COPUOS,   │
│                         │     ISO, FCC, FAA, ORBITS, 10+    │
│                         │     nationale Gesetze)             │
│ Forecast Horizon        │ 1.825 Tage (5 Jahre)              │
│ Forecast Resolution     │ 7 Tage                            │
│ Test Files              │ 43                                │
│ Test LOC                │ ~4.200                            │
│ Max File Size           │ 97.7 KB (block-definitions.ts)   │
│ Regulatory Nodes (DAG)  │ 24 uber 8 Frameworks              │
│ Compliance Thresholds   │ 9 quantitative Grenzen            │
│ Deadline Registrations  │ 81 (uber alle Operatortypen)      │
│ Cache Layers            │ 5 (In-Mem + DB)                   │
│ Alert Types             │ 6 Kategorien                      │
│ Anomaly Detection       │ 5 Methoden                        │
├─────────────────────────┴───────────────────────────────────┤
│ BEWERTUNG: Ephemeris ist das technologisch anspruchsvollste │
│ und strategisch wertvollste Subsystem der Caelex-Plattform.│
│ Es kombiniert Orbitalmechanik, regulatorische Expertise und │
│ kryptographische Evidenz in einer Weise, die am Markt       │
│ einzigartig ist. Die Architektur ist solide erweiterbar fur │
│ zusatzliche Operatortypen und Jurisdiktionen.               │
│                                                              │
│ Prioritat 1: What-If API + Prisma-Migration + Tests         │
│ Prioritat 2: Stub-Module (TCO!), CelesTrak-Batch, Rate-Limit│
│ Prioritat 3: Design-Konsolidierung, Dynamischer Reg. DAG    │
└─────────────────────────────────────────────────────────────┘
```

---

_Bericht erstellt am 11. März 2026. Basierend auf vollständiger Quellcode-Analyse aller 158 Ephemeris-relevanten Dateien. Keine Anderungen am Code vorgenommen — reine Analyse._
