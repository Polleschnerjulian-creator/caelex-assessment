# EPHEMERIS — Comprehensive System Analysis

**Caelex Predictive Compliance Intelligence Engine**
Report Date: 8 March 2026 | Classification: Internal — Executive & Engineering

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Strategic Positioning](#2-strategic-positioning)
3. [System Architecture Overview](#3-system-architecture-overview)
4. [Data Ingestion Pipeline](#4-data-ingestion-pipeline)
5. [Physics & Statistical Models](#5-physics--statistical-models)
6. [Scoring Engine & Safety Gate](#6-scoring-engine--safety-gate)
7. [Forecast Engine](#7-forecast-engine)
8. [Simulation Engine (What-If)](#8-simulation-engine-what-if)
9. [Advanced Analytics Layer](#9-advanced-analytics-layer)
10. [Frontend Architecture](#10-frontend-architecture)
11. [Database Schema](#11-database-schema)
12. [API Surface](#12-api-surface)
13. [Cross-Feature Integration Map](#13-cross-feature-integration-map)
14. [Complete Data Lifecycle](#14-complete-data-lifecycle)
15. [Competitive Moat Analysis](#15-competitive-moat-analysis)
16. [Technical Debt & Gaps](#16-technical-debt--gaps)
17. [Strategic Recommendations](#17-strategic-recommendations)
18. [Appendix A — File Inventory](#appendix-a--file-inventory)
19. [Appendix B — Type System Reference](#appendix-b--type-system-reference)
20. [Appendix C — Scenario Block Registry](#appendix-c--scenario-block-registry)

---

## 1. Executive Summary

Ephemeris is Caelex's predictive compliance intelligence engine — a subsystem that answers one question satellite operators cannot answer today: **"How many days until my satellite breaches a regulatory threshold?"**

The system ingests real-time orbital mechanics data from CelesTrak, solar weather indices from NOAA, cryptographically verified telemetry from Sentinel agents, self-reported assessment data, and Verity attestations. It processes these through five physics and statistical models across eight compliance modules, producing:

- A single **Compliance Score** (0–100) per satellite with safety gate enforcement
- A **Compliance Horizon** — the number of days until first regulatory breach with confidence bands
- **5-year forecast curves** with P10/P50/P90 uncertainty envelopes per regulation
- **What-if scenario simulation** with 55 configurable scenario blocks across 7 categories
- **Regulatory cascade propagation** modeling how a single regulatory change ripples through a dependency graph
- **Fleet-level intelligence** with risk distribution, correlation matrices, and industry benchmarking
- **Anomaly detection** using z-score analysis, moving-average crossover, and fleet correlation

### Key Metrics

| Dimension              | Value                                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Total codebase         | ~12,000 lines TypeScript (engine + UI)                                                                              |
| Backend engine files   | 28 server-only modules                                                                                              |
| Frontend components    | 18 components + 10 marketing page files                                                                             |
| Prediction models      | 5 (orbital decay, fuel depletion, subsystem degradation, deadline events, regulatory change)                        |
| Compliance modules     | 8 (orbital, fuel, subsystems, cyber, ground, documentation, insurance, registration)                                |
| What-if scenario types | 55 blocks across 7 categories (49 in type system)                                                                   |
| Database models        | 7 (SatelliteComplianceState, History, EphemerisForecast, SatelliteAlert, OrbitalData, SolarFluxRecord + Spacecraft) |
| API endpoints          | 13 authenticated routes                                                                                             |
| Cron jobs              | 3 daily (04:00, 05:00, 06:00 UTC)                                                                                   |
| External data sources  | 2 (CelesTrak GP API, NOAA SWPC)                                                                                     |
| Forecast horizon       | 1,825 days (5 years), 7-day resolution                                                                              |

### The Paradigm Shift

Traditional compliance is retrospective — "Are we compliant today?" Ephemeris makes it prospective — "When will we stop being compliant, and what can we do about it now?" This transforms compliance from a cost center (annual audits, reactive fixes) into a strategic planning tool (predictive maintenance, regulatory arbitrage, evidence-based NCA negotiations).

---

## 2. Strategic Positioning

### Market Context

The EU Space Act (COM(2025) 335) introduces for the first time continuous compliance obligations for satellite operators — not just at launch authorization but throughout the mission lifecycle. Articles 64, 68, 70, and 72 impose ongoing requirements around orbital lifetime limits, passivation fuel reserves, subsystem health, and debris mitigation. NIS2 Directive (EU 2022/2555) adds cybersecurity obligations with incident reporting timelines.

No existing space compliance tool provides forward-looking analysis. Current solutions (manual spreadsheets, point-in-time audits) cannot answer "Will we still be compliant in 18 months given current fuel consumption trends and upcoming regulatory changes?"

### Value Proposition Matrix

| Stakeholder                      | Value Delivered                                                                                |
| -------------------------------- | ---------------------------------------------------------------------------------------------- |
| **Satellite Operator**           | Predictive maintenance scheduling, regulatory risk quantification, evidence-based NCA dialogue |
| **National Competent Authority** | Risk-based supervision prioritization, fleet-level oversight, automated alert escalation       |
| **Insurer**                      | Evidence-based underwriting, continuous risk monitoring, claims prevention                     |
| **Investor**                     | Quantified regulatory risk, portfolio-level fleet intelligence, due diligence data             |

### Competitive Differentiation

Ephemeris operates at the intersection of three domains that no competitor combines:

1. **Orbital mechanics** — Real atmospheric drag models with solar flux correction, not just TLE propagation
2. **Regulatory knowledge** — Anchored to specific articles (EU Space Act Art. 68, 70, 72; NIS2 Art. 21; IADC 5.3.1)
3. **Cryptographic evidence** — Sentinel tamper-evident telemetry chain provides verifiable data provenance

---

## 3. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL DATA SOURCES                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  CelesTrak   │  │  NOAA SWPC   │  │  Sentinel Agents         │  │
│  │  GP API      │  │  F10.7 Index  │  │  (Customer-deployed)     │  │
│  │  (TLE/GP)    │  │  (Solar Flux) │  │  Ed25519 signed packets  │  │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬──────────────┘  │
└─────────┼──────────────────┼──────────────────────┼─────────────────┘
          │                  │                      │
          ▼                  ▼                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        DATA ADAPTERS (6 modules)                    │
│  celestrak-adapter.ts │ solar-flux-adapter.ts │ sentinel-adapter.ts │
│  assessment-adapter.ts│ verity-adapter.ts     │ eurlex-adapter.ts   │
│  ─────────────────────────────────────────────────────────────────  │
│  4h in-mem cache      │ 24h cache + DB fallback│ 30s agent-ID cache │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     PREDICTION MODELS (5 modules)                   │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────────┐│
│  │ Orbital Decay│ │Fuel Depletion│ │ Subsystem Degradation        ││
│  │ Semi-analyt. │ │ Lin. regress.│ │ Thruster/Battery/Solar       ││
│  │ atmo. drag   │ │ R² confidence│ │ Weibull failure probability  ││
│  └──────────────┘ └──────────────┘ └──────────────────────────────┘│
│  ┌──────────────┐ ┌──────────────┐                                 │
│  │Deadline Evts │ │ Reg. Change  │                                 │
│  │ Calendar-    │ │ EUR-Lex →    │                                 │
│  │ based NIS2   │ │ factor map   │                                 │
│  └──────────────┘ └──────────────┘                                 │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SCORING ENGINE + SAFETY GATE                     │
│                                                                     │
│  8 Modules (weighted):                                              │
│  fuel(20%) > orbital(15%) = subsystems(15%) > cyber(10%)            │
│  = ground(10%) > documentation(8%) > insurance(7%) > registration(5%)│
│                                                                     │
│  Safety Gate: orbital/fuel/subsystems NON_COMPLIANT → cap at 49     │
│  Horizon: min(daysToThreshold) across all factors                   │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
               ┌──────────────┼──────────────┐
               ▼              ▼              ▼
┌──────────────────┐ ┌────────────────┐ ┌─────────────────┐
│ FORECAST ENGINE  │ │ SIMULATION     │ │ ADVANCED         │
│                  │ │ ENGINE         │ │ ANALYTICS        │
│ 5-year curves    │ │ 55 scenario    │ │ Fleet intel      │
│ P10/P50/P90      │ │ blocks         │ │ Anomaly detect   │
│ Threshold cross  │ │ Jurisdiction   │ │ Cascade prop.    │
│ Compliance events│ │ simulation     │ │ Conflict detect  │
└──────────────────┘ └────────────────┘ └─────────────────┘
               │              │              │
               └──────────────┼──────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         PERSISTENCE LAYER                           │
│  SatelliteComplianceState (live snapshot, upsert)                   │
│  SatelliteComplianceStateHistory (append-only, P10/P50/P90)         │
│  EphemerisForecast (cached curves, 24h TTL)                         │
│  SatelliteAlert (hysteresis dedup, resolved tracking)               │
│  OrbitalData (TLE time-series)                                      │
│  SolarFluxRecord (F10.7 history)                                    │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         API LAYER (13 routes)                       │
│  /state /fleet /forecast /horizon /history /alerts /recalculate     │
│  /what-if /simulate /cascade /anomalies /fleet/intelligence         │
│  All: session auth + org membership + satellite ownership           │
│  Data leakage prevention: toPublicState() strips currentValue       │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (2 surfaces)                       │
│  /dashboard/ephemeris          │  /systems/ephemeris                │
│  Fleet Command + Satellite     │  Marketing/Product page            │
│  Detail + Scenario Builder     │  Animated SVG forecast curves      │
│  Bloomberg Terminal aesthetic   │  White minimalist aesthetic        │
│  IBM Plex Mono, self-contained │  Framer Motion scroll animations  │
│  theme                         │                                    │
└─────────────────────────────────────────────────────────────────────┘
```

### File Count by Layer

| Layer                         | Files   | Total LOC (approx) |
| ----------------------------- | ------- | ------------------ |
| Core engine (`core/`)         | 4       | ~1,570             |
| Data adapters (`data/`)       | 6       | ~834               |
| Prediction models (`models/`) | 5       | ~1,498             |
| Forecast (`forecast/`)        | 3       | ~541               |
| Simulation (`simulation/`)    | 8+      | ~1,500+            |
| Advanced analytics            | 4       | ~800+              |
| Cron jobs                     | 3       | ~400               |
| API routes                    | 13      | ~1,500+            |
| Dashboard frontend            | 14      | ~5,300             |
| Marketing frontend            | 10      | ~1,240             |
| **Total**                     | **~70** | **~15,000+**       |

---

## 4. Data Ingestion Pipeline

The Ephemeris engine relies on a precisely ordered daily cron pipeline that transforms raw external data into actionable compliance intelligence.

### Pipeline Execution Order

```
04:00 UTC ─── SOLAR FLUX POLLING ──────────────────────────────────
│  Source: NOAA SWPC (services.swpc.noaa.gov)
│  Data:   F10.7 solar flux index (Solar Flux Units)
│  Target: SolarFluxRecord table (upsert, monthly granularity)
│  Purpose: Calibrates atmospheric density model for orbital decay
│  Fallback: F107_REFERENCE = 150 SFU (solar cycle average)
│
05:00 UTC ─── CELESTRAK POLLING ───────────────────────────────────
│  Source: CelesTrak GP API (celestrak.org/NORAD/elements/gp.php)
│  Data:   General Perturbation orbital elements per NORAD ID
│          (semimajor axis, eccentricity, inclination, RAAN,
│           arg perigee, mean anomaly, mean motion, BSTAR, epoch)
│  Target: OrbitalData table (append, daily time-series)
│          + Spacecraft.altitudeKm / inclinationDeg (denormalized)
│  Purpose: Source of truth for orbital decay model
│  Note:   Only fetches satellites belonging to active organizations
│
06:00 UTC ─── EPHEMERIS DAILY ─────────────────────────────────────
│  maxDuration: 300 seconds (5 minutes)
│  For each organization with registered spacecraft:
│    1. calculateSatelliteComplianceState()
│       └─ 14 parallel data fetches (see §3 architecture)
│       └─ 5 prediction models
│       └─ 8 module scoring + safety gate
│       └─ Compliance horizon calculation
│    2. persistState() → upsert SatelliteComplianceState
│    3. appendHistory() → create SatelliteComplianceStateHistory
│       └─ P10/P50/P90 derived from confidence:
│          HIGH → ±10%, MEDIUM → ±30%, LOW → ±50%
│    4. processAlerts() → alert hysteresis
│       └─ Generate alert conditions from module statuses
│       └─ Dedup via dedupeKey: "{noradId}_{status}_{moduleKey}"
│       └─ New condition → create SatelliteAlert + notify
│       └─ Severity upgrade → update existing alert
│       └─ Condition resolved → set resolvedAt = now()
│       └─ Notification type: CRITICAL → COMPLIANCE_ACTION_REQUIRED
│                              HIGH → COMPLIANCE_SCORE_DROPPED
```

### Data Source Hierarchy (Confidence Tiers)

The engine implements a three-tier trust hierarchy for each compliance domain:

| Tier            | Source     | Trust Level                              | Example                                          |
| --------------- | ---------- | ---------------------------------------- | ------------------------------------------------ |
| **1 (Highest)** | Sentinel   | Cryptographically verified, continuous   | Fuel level: 23.7% (Ed25519 signed, hash-chained) |
| **2**           | Verity     | Cryptographic attestation, point-in-time | "NIS2 penetration test completed 2026-01-15"     |
| **3 (Lowest)**  | Assessment | Self-reported form data                  | "We have a deorbit plan" (checkbox)              |

When higher-tier data is unavailable, the engine gracefully degrades to lower tiers with reduced confidence scoring. The `buildUnknownModule()` function ensures the system always returns a score (score=0, status=UNKNOWN) — never fails silently.

### Caching Architecture

| Cache                       | TTL        | Scope            | Purpose                                           |
| --------------------------- | ---------- | ---------------- | ------------------------------------------------- |
| CelesTrak GP in-memory      | 4 hours    | Per NORAD ID     | Avoid redundant HTTP calls during recalculation   |
| NOAA F10.7 in-memory        | 24 hours   | Global singleton | F10.7 changes slowly (monthly cadence)            |
| Sentinel agent-ID           | 30 seconds | Per request      | Prevent 6–8 identical agent lookups per satellite |
| SatelliteComplianceState DB | 2 hours    | Per satellite    | Fast path for `/api/v1/ephemeris/state`           |
| Fleet state DB              | 25 hours   | Per org          | Fast path for `/api/v1/ephemeris/fleet`           |

---

## 5. Physics & Statistical Models

### Model 1: Orbital Decay (Semi-Analytical Atmospheric Drag)

**File:** `src/lib/ephemeris/models/orbital-decay.ts` (~370 LOC)

**Purpose:** Predict when a satellite's altitude will decay below regulatory thresholds, triggering EU Space Act Art. 68 (25-year orbital lifetime limit) violations.

**Algorithm:** This is explicitly **not** SGP4 (which is designed for short-term <7 day precision propagation). Instead, it implements a semi-analytical atmospheric drag model suitable for multi-year forecasting:

**Step 1 — Atmospheric Density Lookup**

Uses a CIRA/COSPAR 9-layer exponential atmosphere model (200–1000 km):

```
ρ(h) = ρ₀ × exp(-(h - h₀) / H)
```

Where:

- `ρ₀` = base density at reference altitude (kg/m³)
- `h₀` = reference altitude (km)
- `H` = scale height (km)

Layer table (selected):

| Base Altitude | Base Density (kg/m³) | Scale Height (km) |
| ------------- | -------------------- | ----------------- |
| 200 km        | 2.541e-10            | 37.105            |
| 400 km        | 2.803e-11            | 58.515            |
| 600 km        | 2.137e-13            | 71.835            |
| 800 km        | 1.170e-14            | 88.667            |
| 1000 km       | 7.248e-16            | 124.64            |

**Step 2 — Solar Flux Correction**

Atmospheric density varies significantly with solar activity (solar cycle ~11 years):

```
ρ_effective = ρ × (1 + 0.003 × (F10.7 - 150))
```

Where F10.7 is the 10.7 cm solar radio flux in Solar Flux Units. At solar maximum (~200 SFU), density increases by ~15%; at solar minimum (~70 SFU), density decreases by ~24%.

**Step 3 — Drag-Induced Orbital Decay**

```
da/dt = -2π × a² × ρ × (A/m) × Cᴅ × v
v = √(μ/a)
```

Where:

- `a` = semi-major axis (meters)
- `A/m` = area-to-mass ratio (default 0.01 m²/kg — typical LEO satellite)
- `Cᴅ` = drag coefficient (default 2.2)
- `μ` = 3.986004418×10¹⁴ m³/s² (Earth gravitational parameter)

**Step 4 — Euler Integration**

The model advances in 7-day time steps over 1,825 days (5-year horizon), computing:

- `altitudeKm` at each step
- `reentry` flag when altitude < 120 km (DESTRUCTION_ALTITUDE_KM)
- `warning` flag when altitude < 200 km (WARNING_ALTITUDE_KM)

**Uncertainty Bands:**

- Best case: F10.7 × 0.8 (lower solar activity → less drag)
- Worst case: F10.7 × 1.3 (higher solar activity → more drag)

**Regulatory Mapping:**

- `orbital_lifetime`: EU Space Act Art. 68 — COMPLIANT if predicted reentry < 25 years from epoch
- `orbital_altitude`: WARNING below 200 km, NON_COMPLIANT below 120 km

**High-Orbit Handling:** Satellites above 1000 km are treated as having 100-year lifetime with constant altitude — effectively exempt from atmospheric drag concern.

**Confidence:** TLE freshness → HIGH (<24h), MEDIUM (<168h), LOW (>168h)

---

### Model 2: Fuel Depletion (Linear Regression)

**File:** `src/lib/ephemeris/models/fuel-depletion.ts` (~403 LOC)

**Purpose:** Predict when remaining fuel will cross regulatory thresholds for passivation readiness and disposal capability.

**Algorithm:** Pure TypeScript implementation of ordinary least squares linear regression — no external ML libraries.

**Step 1 — Linear Regression on Sentinel Fuel Time Series**

```
slope = (n·ΣXY - ΣX·ΣY) / (n·ΣX² - (ΣX)²)
intercept = (ΣY - slope·ΣX) / n
R² = 1 - SS_res/SS_tot
```

Where X = timestamp (ms), Y = fuel percentage (from Sentinel `remaining_fuel_pct`).

**Step 2 — Consumption Rate Derivation**

```
nominalRate = |slope| × 86,400,000 (ms → per-day)
worstCaseRate = nominalRate × 1.5 (50% higher consumption)
bestCaseRate = nominalRate × 0.7 (30% lower consumption)
collisionAvoidanceRate = nominalRate × 1.1 (10% overhead for CAM)
```

**Step 3 — Threshold Crossing Prediction**

Three regulatory thresholds, each checked against three consumption scenarios:

| Threshold | Level                 | Regulation           | Significance                                   |
| --------- | --------------------- | -------------------- | ---------------------------------------------- |
| 25% fuel  | Disposal capability   | EU Space Act Art. 72 | Must retain enough fuel for controlled deorbit |
| 15% fuel  | Passivation readiness | EU Space Act Art. 70 | Must be able to passivate spacecraft           |
| 10% fuel  | Passivation reserve   | IADC Guideline 5.3.1 | Industry best practice minimum                 |

Crossing date formula:

```
days = (currentFuel - threshold) / consumptionRate
```

**Confidence Calibration:**

- HIGH: ≥30 data points AND R² > 0.8
- MEDIUM: ≥10 data points AND R² > 0.5
- LOW: fewer data points or poor fit

**Minimum Data Requirement:** 2 data points. Returns UNKNOWN module if fewer.

---

### Model 3: Subsystem Degradation

**File:** `src/lib/ephemeris/models/subsystem-degradation.ts` (~400 LOC)

**Purpose:** Predict health trajectory of three critical subsystems and their impact on compliance.

**Three analyzers, weighted: Thruster (40%) + Battery (35%) + Solar Array (25%)**

**Thruster Analysis:**

- Binary status from latest telemetry: ≥0.9 → NOMINAL, ≥0.7 → DEGRADING, else → CRITICAL
- Anomaly frequency = count(value < 0.8) / weekSpan
- Failure probability (12-month horizon): CRITICAL=60%, DEGRADING=15%, NOMINAL=2%
- Default degradation uses mission age and mean lifetime cycles (50,000)
- Failure-to-days uses exponential distribution: `P = 1 - exp(-λt)` → `expectedDays = 1/λ`

**Battery Analysis:**

- Linear trend: first-to-last delta over observed timespan
- Default degradation: 2.5% capacity loss per year
- Critical threshold: 60% of nominal capacity
- Projection: days until capacity hits critical threshold

**Solar Array Analysis:**

- Same trend approach as battery
- Default degradation: 2.75% power loss per year
- Critical threshold: 70% of nominal power
- Higher degradation rate reflects radiation damage in LEO

**Regulatory Mapping:**

- All subsystem factors mapped to EU Space Act Art. 64 (operational capability requirements)
- Overall subsystem NON_COMPLIANT triggers safety gate → score capped at 49

---

### Model 4: Deadline Events (Calendar-Based)

**File:** `src/lib/ephemeris/models/deadline-events.ts` (~191 LOC)

**Purpose:** Track compliance deadlines with escalating severity as deadlines approach.

**Six tracked deadlines:**

| Deadline              | Regulation          | Frequency | Lead Time | Base Severity |
| --------------------- | ------------------- | --------- | --------- | ------------- |
| Penetration Test      | NIS2 Art. 21        | Annual    | 56 days   | HIGH          |
| Vulnerability Scan    | NIS2 Art. 21        | 90 days   | 7 days    | MEDIUM        |
| Access Review         | NIS2 Art. 21        | 180 days  | 14 days   | MEDIUM        |
| Security Training     | NIS2 Art. 21        | Annual    | 30 days   | MEDIUM        |
| TPL Insurance Renewal | EU Space Act Art. 8 | Annual    | 90 days   | CRITICAL      |
| Frequency License     | ITU                 | 5 years   | 180 days  | HIGH          |

**Severity Escalation Logic:**

- Overdue → CRITICAL (regardless of base severity)
- Within 25% of lead time → HIGH
- Within lead time → Base severity
- Outside lead time → LOW

Also tracks: Authorization renewal (Art. 5, 6-month lead time).

---

### Model 5: Regulatory Change Impact

**File:** `src/lib/ephemeris/models/regulatory-change.ts` (~134 LOC)

**Purpose:** Incorporate recent regulatory developments into compliance scoring.

Reads `RegulatoryUpdate` records (written by the `regulatory-feed` cron) from the last 30 days. Maps severity levels:

- CRITICAL → NON_COMPLIANT factor
- HIGH → WARNING factor
- MEDIUM/LOW → COMPLIANT (informational only)

Generates `ComplianceEvent` entries only for CRITICAL and HIGH changes.

---

## 6. Scoring Engine & Safety Gate

### Module Weight Distribution

```
fuel:           ████████████████████  20%   Safety-critical
orbital:        ███████████████       15%   Safety-critical
subsystems:     ███████████████       15%   Safety-critical
cyber:          ██████████            10%
ground:         ██████████            10%   (Phase 2 — currently UNKNOWN)
documentation:  ████████               8%
insurance:      ███████                7%
registration:   █████                  5%   (Phase 2 — currently UNKNOWN)
```

### Scoring Algorithm

**Per-Factor Scoring:**

- COMPLIANT → 100 points
- WARNING → 60 points
- NON_COMPLIANT → 20 points
- UNKNOWN → 50 points

**Per-Module:** Average of all factor scores. Module status = worst factor status (one NON_COMPLIANT factor → NON_COMPLIANT module).

**Overall Score:** Weighted average across all 8 modules.

### Safety Gate (SAFETY_GATE_MAX_SCORE = 49)

**Critical design decision:** If any of the three safety-critical modules (orbital, fuel, subsystems) is NON_COMPLIANT, the overall compliance score is **capped at 49** regardless of how high other module scores are.

**Rationale:** A satellite with excellent documentation, insurance, and cybersecurity but a failed thruster and no deorbit fuel is fundamentally non-compliant. The safety gate prevents a misleading high score from masking a critical physical-layer failure.

**Risk categorization from overall score:**

| Score Range | Risk Category | Color  |
| ----------- | ------------- | ------ |
| 80–100      | NOMINAL       | Green  |
| 60–79       | WATCH         | Yellow |
| 40–59       | WARNING       | Orange |
| 0–39        | CRITICAL      | Red    |

### Compliance Horizon Calculation

The horizon is the minimum positive `daysToThreshold` across all factors in all modules. It represents the earliest predicted regulatory breach.

**Confidence downgrade:** If fewer than 3 data sources are active, confidence is degraded (HIGH → MEDIUM with <3 sources, → LOW with <2 sources).

**Already-breached detection:** If any factor has `daysToThreshold ≤ 0` AND status = NON_COMPLIANT, horizon = 0 days (immediate breach).

**Human-readable format:** "847d until Passivation Fuel Reserve (Art. 70)" or "No compliance breach predicted within forecast horizon."

---

## 7. Forecast Engine

**File:** `src/lib/ephemeris/forecast/forecast-engine.ts` (~257 LOC)

### Purpose

Transforms prediction model outputs into two visualization-ready data structures:

1. **ForecastCurve[]** — Time-series data for chart rendering (altitude vs time, fuel % vs time)
2. **ComplianceEvent[]** — Sorted list of predicted compliance events with severity, regulation, and recommended action

### Execution

Runs orbital decay, fuel depletion, and subsystem models in parallel, then:

1. Builds altitude forecast curve from orbital decay (if orbital elements available)
2. Builds fuel forecast curves for each threshold (Art. 72 @ 25%, Art. 70 @ 15%, IADC @ 10%)
3. Adds compliance events for:
   - Atmospheric reentry prediction (always CRITICAL)
   - Fuel threshold crossings (CRITICAL if <90 days, HIGH if <365 days, MEDIUM otherwise)
   - Battery/solar critical degradation (HIGH if <180 days, MEDIUM otherwise)

### ForecastCurve Structure

Each curve contains:

- `regulationRef` — e.g., "eu_space_act_art_70"
- `regulationName` — e.g., "Passivation Fuel Reserve"
- `metric`, `unit` — e.g., "remaining_fuel_pct", "%"
- `thresholdValue` — the regulatory limit (e.g., 15)
- `dataPoints[]` — each point has `daysFromNow`, `nominal` (P50), `bestCase` (P90), `worstCase` (P10), `isHistorical`
- `crossingDate` / `crossingDaysFromNow` — when nominal curve crosses threshold

### Forecast Resolution

- Horizon: 1,825 days (5 years)
- Resolution: 7-day intervals
- Points per curve: ~261

---

## 8. Simulation Engine (What-If)

### Architecture

The simulation engine allows operators to model hypothetical scenarios and see their impact on compliance scores and timelines. It operates through two interfaces:

1. **Programmatic API** — `runWhatIfScenario()` function for single-scenario evaluation
2. **Pipeline UI** — Drag-and-drop scenario builder for composing multi-step scenarios

### What-If Engine (`src/lib/ephemeris/simulation/what-if-engine.ts`, ~277 LOC)

**Flow:**

1. Calculate live baseline state for the satellite
2. Apply scenario modifications
3. Compute delta (horizon change, module impacts, cost estimate)
4. Return `WhatIfResult` with before/after comparison

**Five Legacy Handlers (inline):**

| Scenario            | Logic                                                                             | Key Output                                                |
| ------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------- |
| JURISDICTION_CHANGE | Calls `simulateJurisdictionChange()`, maps scoreDelta to ±30 days                 | New requirements, removed requirements, approval timeline |
| ORBIT_RAISE         | `lifetimeExtension = (altDelta/50) × 5 × 365 days`, fuel cost from Art. 70 factor | Altitude curve shift, fuel consumption                    |
| FUEL_BURN           | `horizonReduction = baseline × (burnPct / currentFuel)`                           | Art. 70 threshold risk assessment                         |
| THRUSTER_FAILURE    | Immediate zero horizon, NON_COMPLIANT on Art. 64 + Art. 70, safety gate trigger   | CRITICAL severity, ADR cost estimate                      |
| EOL_EXTENSION       | `horizonDelta = additionalDays × -0.3` (net negative)                             | Accelerated degradation modeling                          |

### Handler Modules (`simulation/handlers/`)

**Hardware Handlers** (`hardware.ts`, ~596 LOC) — 12 scenario types:

| Scenario                 | Severity              | Horizon Impact                            | Key Detail                             |
| ------------------------ | --------------------- | ----------------------------------------- | -------------------------------------- |
| Reaction Wheel Failure   | CRITICAL (3+ wheels)  | -100% (3+), -60% (2), -20% (1)            | Per-wheel degradation model            |
| Solar Panel Degradation  | CRITICAL (>30% loss)  | -70% (>30%), -30% (>10%)                  | Power budget impact                    |
| Battery Degradation      | CRITICAL (>35% loss)  | -80% (>35%), -50% (>25%)                  | Capacity trend projection              |
| Antenna Degradation      | CRITICAL (>12dB loss) | -80% (>12dB), -30% (>6dB)                 | Link margin analysis                   |
| Attitude Control Anomaly | CRITICAL (tumble)     | -100% (tumble), -40% (drift), -15% (bias) | Three failure modes                    |
| Thermal Control Failure  | CRITICAL              | -40%                                      | Confidence band ×0.7/×1.5              |
| Sensor Degradation       | HIGH (failed)         | -50% (failed), -15% (degraded)            | —                                      |
| Payload Failure          | HIGH                  | 0% (compliance unchanged)                 | $50M primary / $10M secondary cost     |
| Passivation Failure      | CRITICAL              | -100% (immediate)                         | Art. 70 + IADC violation, $5M ADR cost |
| Propellant Leak          | CRITICAL (<3mo)       | Projects days to Art. 70 threshold        | Rate-based projection                  |
| Power Bus Anomaly        | CRITICAL (shutdown)   | -100% (shutdown), -30% (brownout)         | Two failure modes                      |

**Additional handler categories** (orbital, environment, communication, financial, operational, regulatory) — totaling **49 scenario types** in the type system.

### Scenario Builder UI (Frontend)

**55 drag-and-drop blocks** organized in 7 categories:

| Category      | Block Count | Examples                                                                 |
| ------------- | ----------- | ------------------------------------------------------------------------ |
| Orbital       | 8           | Orbit Raise, Plane Change, Deorbit Execute, Constellation Resize         |
| Hardware      | 12          | Thruster Failure, Battery, Solar Panel, Passivation, Propellant Leak     |
| Environment   | 6           | Solar Storm, CME, Debris Cloud, Micrometeoroid                           |
| Communication | 5           | Comm Failure, Ground Station Loss, Cyber Incident                        |
| Regulatory    | 12          | Jurisdiction Change, NCA Audit, Spectrum Reallocation, NIS2 Notification |
| Operational   | 7           | EOL Extension, Launch Delay, Software Anomaly                            |
| Financial     | 5           | Insurance Premium, Supply Chain Disruption, Budget Cut                   |

Each block has configurable parameters (sliders, selects) defined in `block-definitions.ts` (1,336 LOC).

**Pipeline execution:** Sequential — posts each block individually to `POST /api/v1/ephemeris/what-if`, collects `StepResult` objects, then aggregates: deduplicates regulations, computes `overallSeverity`, sums `totalCostEstimate`.

### Jurisdiction Simulator

**File:** `src/lib/ephemeris/simulation/jurisdiction-simulator.ts`

Compares compliance requirements when re-flagging a satellite between 7 European jurisdictions: DE, NO, GB, LU, FR, IT, SE. Returns:

- Score delta (before/after)
- New requirements introduced
- Requirements removed
- Estimated approval duration
- Compliance work estimate

---

## 9. Advanced Analytics Layer

### Fleet Intelligence

**File:** `src/lib/ephemeris/fleet/fleet-intelligence.ts`

Computes fleet-level aggregations from individual satellite states:

| Metric             | Method                                                             |
| ------------------ | ------------------------------------------------------------------ |
| Fleet Score        | Equal-weight average of all satellite scores                       |
| Risk Distribution  | Count per category (NOMINAL/WATCH/WARNING/CRITICAL)                |
| Weakest Links      | Top 3 satellites by fleet impact (lowest scores × highest weight)  |
| Correlation Matrix | Pearson correlation on 30-day score deltas between satellite pairs |
| Fleet Horizon      | Earliest breach across all fleet satellites                        |
| Trend              | 7-day short-term delta + 30-day long-term trend direction          |
| Module Averages    | Per-module average across fleet                                    |

**Benchmark data** compares fleet score against industry average (peer percentile, rank, vs-average delta).

### Anomaly Detection

**File:** `src/lib/ephemeris/anomaly/anomaly-detector.ts`

Three statistical methods running on `SatelliteComplianceStateHistory`:

| Method                   | Description                                             | Threshold                         |
| ------------------------ | ------------------------------------------------------- | --------------------------------- |
| Z-score                  | Deviation from mean on overall score and rate-of-change | Configurable 2σ/3σ                |
| Moving-Average Crossover | 7-day MA crosses below 30-day MA                        | Cross event = anomaly             |
| Fleet Correlation        | Pearson r > 0.8 on score deltas across ≥3 satellites    | Correlated degradation = systemic |

Also validates observed scores against stored P10/P90 forecast percentile bands from history.

### Regulatory Cascade Engine

**File:** `src/lib/ephemeris/cascade/dependency-graph.ts`, `conflict-detector.ts`

**Dependency Graph:** DAG of regulatory requirement nodes. A change in one node (e.g., "EU Space Act Art. 70 threshold lowered from 15% to 20%") propagates impact multipliers downstream to dependent requirements.

**Conflict Detection:** Cross-jurisdiction requirement comparison. Static knowledge base of 18 requirements across EU Space Act, NIS2, IADC, French LOI, UK SIA, German SatDSiG, Norwegian Space Act. Detects:

- **CONFLICT** — Irreconcilable requirements between jurisdictions
- **OVERLAP** — Same domain, stricter requirement dominates
- **COMPATIBLE** — No conflict

**API:** `GET /api/v1/ephemeris/cascade` returns the graph. `POST /api/v1/ephemeris/cascade` with a simulated change returns: total impact score, affected nodes count, per-satellite score deltas, propagation path, and optional conflict report.

---

## 10. Frontend Architecture

### Design Philosophy

Ephemeris deliberately **breaks away** from the main Caelex design system. Where the rest of the platform uses Tailwind classes with CSS custom properties, Ephemeris uses:

- **IBM Plex Mono** for all data/metrics (Bloomberg Terminal aesthetic)
- **Inline styles exclusively** — no Tailwind class usage in data-heavy components
- **Self-contained theme system** (`useEphemerisTheme()`) that auto-detects OS dark/light mode
- **Fullscreen layout** — TopBar suppressed, no content padding, no max-width constraint

This is a deliberate product decision: Ephemeris is positioned as a professional instrument, not a consumer dashboard.

### Layout Integration

In `src/app/dashboard/layout.tsx`, Ephemeris receives special treatment:

```typescript
const isEphemerisPage = pathname.startsWith("/dashboard/ephemeris");
const isFullscreenPage = ... || isEphemerisPage;
```

Consequences:

- TopBar is **suppressed entirely** (Ephemeris renders its own 48px top bar)
- No `p-6 lg:p-10` padding
- No `max-w-[1360px]` content constraint
- Direct `ErrorBoundary` wrap without width container

### Fleet Command Center (`/dashboard/ephemeris`)

**File:** `src/app/dashboard/ephemeris/page.tsx` (~700 LOC)

**Progressive data loading:**

1. Phase 1 (fast): `GET /api/v1/ephemeris/fleet` → satellite cards render immediately
2. Phase 2 (background): `GET /api/v1/ephemeris/fleet/intelligence?include_benchmark=true&lookback_days=90` → intelligence tab populates

**UI Structure:**

```
┌─────────────────────────────────────────────────────────────────┐
│ EPHEMERIS    Fleet Command    v3.1.0    CALCULATED 06:00:12 UTC │
├─────────────────────────────────────────────────────────────────┤
│ Fleet Score: 73 ▲+2.1  │ Horizon: 847d │ Sats: 12/14 │ Alerts: 3 │
├─────────────────────────────────────────────────────────────────┤
│  FLEET  │  ALERTS  │  INTELLIGENCE                              │
├─────────────────────────────────────────────────────────────────┤
│ NAME        SCORE   HORIZON   RISK      ALERTS   WEAKEST       │
│ EUTELSAT-7  87      1,247d    NOMINAL   0        Insurance     │
│ SAT-ALPHA   42      127d      WARNING   2        Fuel          │
│ ORBCOMM-3   31      23d       CRITICAL  5        Orbital       │
└─────────────────────────────────────────────────────────────────┘
```

Each row links to the satellite detail page. Sortable by all columns.

### Satellite Detail Page (`/dashboard/ephemeris/[noradId]`)

**File:** `src/app/dashboard/ephemeris/[noradId]/page.tsx` (~1,700 LOC)

**The most data-rich page in the entire Caelex platform.**

**Progressive data loading (three parallel streams):**

1. State (fast): `GET /api/v1/ephemeris/state?norad_id=X`
2. Forecast + History (parallel, non-blocking): `GET /api/v1/ephemeris/forecast` + `GET /api/v1/ephemeris/history`
3. Recalculate (manual trigger): `POST /api/v1/ephemeris/recalculate`

**5-Tab Interface:**

| Tab              | Content                                                                                                          |
| ---------------- | ---------------------------------------------------------------------------------------------------------------- |
| **FORECAST**     | Recharts `ComposedChart` with P10/P50/P90 confidence envelope, threshold reference line, compliance events table |
| **MODULES**      | 8 module score bars (sorted worst-first) + factor details table with regulation refs and days-to-threshold       |
| **SCENARIOS**    | Full `ScenarioBuilder` component (drag-and-drop pipeline editor)                                                 |
| **CASCADE**      | Regulatory dependency graph query + cascade propagation simulation                                               |
| **DATA SOURCES** | Connection status cards for Sentinel, CelesTrak, Verity, Assessment, Solar Flux                                  |

**Forecast Chart Detail:**

```
  ▲ Fuel %
  │
  │ ┌──────────── P90 (best case, 30% opacity)
  │ │   ╔══════════════╗ P10–P90 confidence band (8% opacity fill)
30│─│───║──────────────║────────────── Art. 72 threshold (dashed red)
  │ │   ║   ┌──── P50 (nominal, solid, strokeWidth 2)
  │ │   ║   │
15│─│───║───│──────────║────────────── Art. 70 threshold (dashed red)
  │ │   ║   │          ║
10│─│───║───│──────────║────────────── IADC 5.3.1 threshold
  │ └───║───│──────────║
  │     ╚═══│══════════╝
  │         └──── P10 (worst case, 30% opacity)
  └────────────────────────────────────────────► Days
    0    365   730   1095   1460   1825
```

### Scenario Builder

A six-component subsystem implementing a drag-and-drop pipeline editor:

```
┌──────────────┐  ┌──────────────────────────┐  ┌───────────────────────┐
│ BLOCK PALETTE│  │ SCENARIO PIPELINE         │  │ RESULTS PANEL         │
│ (260px)      │  │ (flex-1)                  │  │ (360px)               │
│              │  │                           │  │                       │
│ 🔍 Search    │  │ ┌──────────────────────┐  │  │ Severity: WARNING     │
│              │  │ │ ① Orbit Raise        │  │  │ Horizon: +127d        │
│ ▼ Orbital    │  │ │   ▲ Alt: +50km       │  │  │ Fuel: -2.1 kg        │
│   Orbit Raise│  │ └──────────────────────┘  │  │                       │
│   Plane Chg  │  │          │                │  │ ┌─ Compliance Timeline │
│   Collision  │  │ ┌──────────────────────┐  │  │ │  ╱──baseline        │
│              │  │ │ ② Solar Storm        │  │  │ │ ╱  ╲──projected     │
│ ▼ Hardware   │  │ │   ⚡ Intensity: 0.7  │  │  │ └────────────────────│
│   Thruster   │  │ └──────────────────────┘  │  │                       │
│   Battery    │  │          │                │  │ Risk Heatmap          │
│   Solar      │  │ ┌──────────────────────┐  │  │ █ █ █ ░ ░ █ █ ░     │
│              │  │ │ ③ NCA Audit          │  │  │                       │
│ ▼ Environment│  │ │   📋 Scope: Full     │  │  │ Step Breakdown        │
│ ▼ Regulatory │  │ └──────────────────────┘  │  │ ① +127d (NOMINAL)    │
│ ▼ Operational│  │                           │  │ ② -45d (WARNING)     │
│ ▼ Financial  │  │ ┌─── Drop zone ────────┐  │  │ ③ -12d (MEDIUM)      │
│              │  │ │ Drop blocks here      │  │  │                       │
└──────────────┘  └──────────────────────────┘  └───────────────────────┘
```

**Key architectural decisions:**

- `@dnd-kit` for drag-and-drop (PointerSensor, 5px activation distance)
- Sequential block execution (not parallel) — each block modifies the baseline for the next
- Results aggregation: deduplicates affected regulations, sums cost estimates, takes worst severity
- Custom SVG compliance timeline chart (hand-drawn, 280×120px, `requestAnimationFrame` animation)

### Alerts Sidebar

**File:** `src/app/dashboard/ephemeris/components/alerts-sidebar.tsx` (477 LOC)

Collapsible right panel (40px collapsed / 300px expanded). Two tabs: ALERTS and ANOMALIES. Alert cards color-coded by severity with `borderLeft: 3px solid`. Sorted by severity (CRITICAL first).

### Marketing Page (`/systems/ephemeris`)

Completely separate from the dashboard — a public marketing page with white minimalist design, Framer Motion scroll animations, and signature animated SVG forecast curve (800×420 viewBox, 2,500ms draw animation, gradient-colored line from green → amber → red, pulsing crossover point at Art. 70 threshold).

---

## 11. Database Schema

### Core Ephemeris Models

```prisma
model SatelliteComplianceState {
  id                 String    @id @default(cuid())
  noradId            String
  operatorId         String
  overallScore       Int       // 0-100
  moduleScores       Json      // { orbital: {score, status, factors[]}, ... }
  dataSources        Json      // { sentinel: {...}, celestrak: {...}, ... }
  horizonDays        Int?      // Days until first breach (null = no breach)
  horizonRegulation  String?   // e.g., "eu_space_act_art_70"
  horizonConfidence  String    // HIGH / MEDIUM / LOW
  dataFreshness      String    // LIVE / RECENT / STALE / NO_DATA
  stateJson          Json?     // Full public state snapshot
  satelliteName      String?
  calculatedAt       DateTime

  @@unique([noradId, operatorId])
  @@index([operatorId])
  @@index([horizonDays])
}

model SatelliteComplianceStateHistory {
  id                 String    @id @default(cuid())
  noradId            String
  operatorId         String
  overallScore       Int
  moduleScores       Json
  horizonDays        Int?
  horizonRegulation  String?
  dataFreshness      String
  stateJson          Json?
  alerts             Json?     // Serialized activeAlerts snapshot
  forecastP10        Float?    // Pessimistic percentile
  forecastP50        Float?    // Nominal percentile
  forecastP90        Float?    // Optimistic percentile
  inputsHash         String?   // SHA-256 over computation inputs
  calculatedAt       DateTime

  @@index([noradId, calculatedAt])
  @@index([operatorId, calculatedAt])
}

model EphemerisForecast {
  id                 String    @id @default(cuid())
  noradId            String
  operatorId         String
  forecastCurves     Json      // Array<ForecastCurve>
  complianceEvents   Json      // Array<ComplianceEvent>
  horizonDays        Int?
  f107Used           Float     // Solar flux used for computation
  modelVersion       String    @default("1.0")
  calculatedAt       DateTime
  expiresAt          DateTime  // 24-hour TTL

  @@index([noradId])
  @@index([calculatedAt])
}

model SatelliteAlert {
  id                 String    @id @default(cuid())
  noradId            String
  operatorId         String
  type               String    // FUEL_LOW, ORBIT_DECAY, etc.
  severity           String    // CRITICAL / HIGH / MEDIUM / LOW
  title              String
  description        String    @db.Text
  regulationRef      String?
  dedupeKey          String    // Prevents duplicate alerts
  triggeredAt        DateTime  @default(now())
  resolvedAt         DateTime?
  acknowledged       Boolean   @default(false)
  acknowledgedAt     DateTime?

  @@index([noradId])
  @@index([operatorId, severity])
  @@index([resolvedAt])
  @@index([dedupeKey])
}

model OrbitalData {
  id                 String     @id @default(cuid())
  spacecraftId       String
  noradId            String?
  altitude           Float?     // km (denormalized)
  inclination        Float?     // degrees
  eccentricity       Float?
  period             Float?     // minutes
  epoch              DateTime?
  rawGp              Json?      // Full CelesTrak GP JSON
  createdAt          DateTime   @default(now())

  @@index([spacecraftId, createdAt])
  @@index([noradId, epoch])
}

model SolarFluxRecord {
  id                 String    @id @default(cuid())
  f107               Float     // Solar Flux Units (SFU)
  observedAt         DateTime
  source             String    @default("NOAA_SWPC")
  createdAt          DateTime  @default(now())

  @@unique([observedAt, source])
  @@index([observedAt])
}
```

### Related Models (Not Ephemeris-Owned)

| Model                                     | Relation to Ephemeris                                      |
| ----------------------------------------- | ---------------------------------------------------------- |
| `Spacecraft`                              | Root entity — provides NORAD ID, launch date, orbit type   |
| `SentinelAgent` / `SentinelPacket`        | Telemetry source for fuel, subsystem, cyber modules        |
| `VerityAttestation`                       | Cryptographic evidence for cyber and documentation modules |
| `DebrisAssessment`                        | Deorbit/passivation plan data for documentation module     |
| `CybersecurityAssessment`                 | Fallback cyber scoring when Sentinel unavailable           |
| `InsuranceAssessment` / `InsurancePolicy` | TPL policy data for insurance module                       |
| `EnvironmentalAssessment`                 | Environmental impact assessment status                     |
| `NIS2Assessment`                          | NIS2 classification and compliance score                   |
| `RegulatoryUpdate`                        | EUR-Lex regulatory changes for regulatory-change model     |

---

## 12. API Surface

All routes under `/api/v1/ephemeris/` require session authentication and verify organization membership before any data access. The `toPublicState()` function strips `currentValue` from all compliance factors before responding.

### Endpoint Reference

| Endpoint                                               | Method | Cache  | Purpose                                                           |
| ------------------------------------------------------ | ------ | ------ | ----------------------------------------------------------------- |
| `/api/v1/ephemeris/state?norad_id=X`                   | GET    | 2h DB  | Current compliance state for one satellite                        |
| `/api/v1/ephemeris/state?norad_id=X&refresh=true`      | GET    | None   | Force live recalculation                                          |
| `/api/v1/ephemeris/fleet`                              | GET    | 25h DB | All org satellites' cached compliance states                      |
| `/api/v1/ephemeris/fleet/intelligence`                 | GET    | None   | Fleet analytics: risk distribution, correlation, trend, benchmark |
| `/api/v1/ephemeris/forecast?norad_id=X`                | GET    | None   | 5-year forecast curves + compliance events                        |
| `/api/v1/ephemeris/horizon?norad_id=X`                 | GET    | None   | Compliance horizon + human-readable summary                       |
| `/api/v1/ephemeris/history?norad_id=X&lookback_days=N` | GET    | None   | Historical state snapshots for trend charts                       |
| `/api/v1/ephemeris/alerts?norad_id=X&severity=Y`       | GET    | None   | Active (unresolved) alerts with optional filters                  |
| `/api/v1/ephemeris/recalculate`                        | POST   | None   | Force recalculation + persistence + forecast regen                |
| `/api/v1/ephemeris/what-if`                            | POST   | None   | Run single scenario against live baseline                         |
| `/api/v1/ephemeris/simulate`                           | POST   | None   | Jurisdiction re-flagging simulation                               |
| `/api/v1/ephemeris/cascade`                            | GET    | None   | Regulatory dependency graph nodes                                 |
| `/api/v1/ephemeris/cascade`                            | POST   | None   | Cascade propagation simulation                                    |
| `/api/v1/ephemeris/anomalies`                          | GET    | None   | z-score anomaly detection on historical data                      |
| `/api/v1/ephemeris/anomalies`                          | POST   | None   | Custom anomaly detection config + alert gen                       |
| `/api/satellites/celestrak`                            | GET    | 2h     | Full CelesTrak active catalog proxy (Edge Runtime)                |
| `/api/satellites/fleet`                                | GET    | None   | Org's spacecraft with NORAD IDs                                   |

### Data Leakage Prevention

The `ComplianceFactorInternal` type contains `currentValue: number | null` — raw sensor readings (e.g., fuel 23.7%, battery SOC 0.78). The public `ComplianceFactor` type omits this field. The `toPublicFactor()` and `toPublicState()` functions enforce this boundary at the type system level. No API endpoint ever returns internal types.

---

## 13. Cross-Feature Integration Map

```
                           ┌────────────────────────┐
                           │     EPHEMERIS           │
                           │  Compliance Intelligence│
                           └───────────┬────────────┘
                                       │
              ┌────────────────────────┼────────────────────────┐
              │                        │                        │
              ▼                        ▼                        ▼
   ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
   │   SENTINEL        │   │   VERITY          │   │   ASSESSMENTS    │
   │   (Tier 1 data)   │   │   (Tier 2 data)   │   │   (Tier 3 data)  │
   │                    │   │                    │   │                  │
   │ SentinelPacket →   │   │ VerityAttestation→│   │ Debris/Cyber/    │
   │ fuel, thruster,    │   │ NIS2 compliance,  │   │ Insurance/Env/   │
   │ battery, solar,    │   │ EU Space Act      │   │ NIS2 assessments │
   │ patch, MFA         │   │ attestations      │   │                  │
   └──────────────────┘   └──────────────────┘   └──────────────────┘

              ┌────────────────────────┼────────────────────────┐
              │                        │                        │
              ▼                        ▼                        ▼
   ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
   │ MISSION CONTROL   │   │ REGULATORY FEED   │   │   ASTRA AI       │
   │                    │   │                    │   │                  │
   │ Shares NORAD ID   │   │ RegulatoryUpdate → │   │ ⚠ NOT INTEGRATED │
   │ as common key.    │   │ feeds regulatory-  │   │ No ephemeris     │
   │ Independent 3D    │   │ change model.      │   │ tools defined.   │
   │ viz (satellite.js) │   │ Cascade engine.    │   │ Gap identified.  │
   └──────────────────┘   └──────────────────┘   └──────────────────┘

              ┌────────────────────────┼────────────────────────┐
              │                        │                        │
              ▼                        ▼                        ▼
   ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
   │ DASHBOARD MAIN    │   │   OPTIMIZER       │   │   NOTIFICATIONS  │
   │                    │   │                    │   │                  │
   │ ⚠ NOT INTEGRATED  │   │ OptimizationResult │   │ notifyOrg() from │
   │ Main dashboard     │   │ references         │   │ ephemeris-daily  │
   │ shows assessment   │   │ Spacecraft but     │   │ cron for new     │
   │ scores, not        │   │ doesn't feed back  │   │ CRITICAL/HIGH    │
   │ Ephemeris scores.  │   │ into Ephemeris.    │   │ alerts.          │
   └──────────────────┘   └──────────────────┘   └──────────────────┘
```

### Integration Details

**Sentinel → Ephemeris (Primary Data Source)**

- Sentinel agents deployed at customer ops sites collect cryptographically signed, hash-chained evidence packets
- 7 metric types consumed: `remaining_fuel_pct`, `thruster_status`, `battery_state_of_charge`, `solar_array_power_pct`, `patch_compliance_pct`, `mfa_adoption_pct`, `critical_vulns_unpatched`
- `trustScore` on each packet propagates into `confidence` on `ComplianceFactor`
- Chain integrity verifiable via `/api/v1/sentinel/chain/verify`

**Verity → Ephemeris (Secondary Data Source)**

- Verity attestations for NIS2 regulation refs → cyber module
- Verity attestations for EU Space Act refs → documentation module
- Attestations expiring within 30 days excluded via `isExpiringSoon()` guard

**Assessment Modules → Ephemeris (Tertiary Data Source)**

- `DebrisAssessment` → documentation module (deorbit plan, passivation plan)
- `CybersecurityAssessment` → cyber module (assessment-level fallback only)
- `InsuranceAssessment` + `InsurancePolicy` → insurance module (active TPL policy, coverage, expiry)
- `EnvironmentalAssessment` → documentation module (impact assessment status)
- `NIS2Assessment` → cyber module (entity classification, compliance score)

**Mission Control ↔ Ephemeris (Independent)**

- Shared key: NORAD ID
- Mission Control uses CelesTrak data directly via `satellite.js` (SGP4 propagation, client-side)
- Ephemeris uses CelesTrak data for long-term drag model (server-side)
- No data exchange between the two systems at runtime

**Regulatory Feed → Ephemeris**

- `regulatory-feed` cron (07:00 UTC) writes `RegulatoryUpdate` rows
- `eurlex-adapter.ts` reads last 30 days and feeds into regulatory-change model
- Cascade engine uses dependency graph to propagate regulatory changes to satellite scores

---

## 14. Complete Data Lifecycle

### From Satellite Registration to Compliance Alert

```
REGISTRATION                 DATA COLLECTION              COMPUTATION
─────────────                ───────────────              ───────────

User registers               Daily cron pipeline:         Daily at 06:00 UTC:
Spacecraft with              04:00 → NOAA F10.7           calculateSatelliteComplianceState()
NORAD ID                     05:00 → CelesTrak GP         │
     │                       Continuous:                   ├─ 14 parallel data fetches
     │                       Sentinel evidence packets     ├─ 5 prediction models
     │                       (Ed25519 signed,              ├─ 8 module scores
     │                        hash-chained)                ├─ Safety gate check
     │                                                     ├─ Compliance horizon
     │                                                     │
     ▼                                                     ▼

PERSISTENCE                  ALERTING                     PRESENTATION
───────────                  ────────                     ────────────

SatelliteComplianceState     Alert hysteresis:            /dashboard/ephemeris
(upsert, live snapshot)      dedupeKey matching           Fleet Command Center
                             │                            │
SatelliteComplianceState     ├─ New → create +            /dashboard/ephemeris/[noradId]
History (append-only,        │   notifyOrg()              Satellite Detail:
P10/P50/P90 percentiles,    │                            - Forecast curves
inputsHash for repro)       ├─ Severity upgrade          - Module breakdown
                             │   → update                 - Scenario builder
EphemerisForecast            │                            - Cascade analysis
(on-demand, 24h TTL)        ├─ Stale → resolve           - Data source status
                             │   (resolvedAt=now)
                             │
                             └─ CRITICAL alerts →
                                COMPLIANCE_ACTION_REQUIRED
                                notification with
                                actionUrl to detail page
```

### Timing Diagram (One Day)

```
UTC  Event                              Duration    Output
───  ─────                              ────────    ──────
04:00  solar-flux-polling                ~5s         SolarFluxRecord (upsert)
05:00  celestrak-polling                 ~30s        OrbitalData (per satellite)
                                                     Spacecraft.altitudeKm update
06:00  ephemeris-daily                   ≤300s       SatelliteComplianceState (upsert)
                                                     ...History (append)
                                                     SatelliteAlert (create/update/resolve)
                                                     Notifications (CRITICAL/HIGH only)

Any    GET /api/v1/ephemeris/state       ~100ms      Cached if <2h old
       (user opens satellite detail)     ~2-5s       Live recalculation if stale

Any    POST /api/v1/ephemeris/what-if    ~2-5s       Scenario result
       (user runs scenario)

Any    POST /api/v1/ephemeris/recalculate ~3-8s      Full recalculation + persistence
       (user clicks RECALCULATE)
```

---

## 15. Competitive Moat Analysis

### Four Defensible Moats

**1. Regulatory Knowledge Base**

- Compliance thresholds anchored to specific regulation articles (Art. 68, 70, 72, NIS2 Art. 21, IADC 5.3.1)
- Not just "compliance scores" but regulation-specific factor tracking with days-to-threshold
- Cross-jurisdiction conflict detection (18 requirements across 7 frameworks)
- This knowledge is expensive to build and maintain — requires regulatory domain experts

**2. Continuous Operational Data (Sentinel)**

- Cryptographically signed, hash-chained evidence packets
- Three-tier confidence hierarchy (Sentinel > Verity > Assessment)
- Time-series data enables statistical models (linear regression, trend analysis, anomaly detection)
- Competitors offering point-in-time audits cannot match continuous data quality

**3. Verified Evidence History**

- `SatelliteComplianceStateHistory` provides append-only, reproducible computation records
- `inputsHash` (SHA-256 over computation inputs) enables forensic reproducibility
- P10/P50/P90 percentile bands stored for each daily calculation
- This evidence trail is valuable for NCA negotiations, insurance claims, and investor due diligence

**4. Regulatory Genome (Cascade + Conflict Detection)**

- Dependency graph of regulatory requirements enables forward-looking impact analysis
- "If Art. 70 threshold changes from 15% to 20%, which of my satellites are affected?"
- No competitor models regulatory interdependencies as a computable graph

### Network Effects

As more operators use Ephemeris, the **benchmark dataset** grows:

- Fleet intelligence includes `operatorRanking` (percentile vs. industry average)
- Anomaly detection uses fleet correlation (systemic degradation detection)
- More data → better anomaly baselines → more accurate alerts → higher switching costs

---

## 16. Technical Debt & Gaps

### Critical Gaps

| #   | Gap                                                                                                                      | Impact                                                                                       | Priority       |
| --- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | -------------- |
| 1   | **Ground module is a stub** — returns UNKNOWN unconditionally                                                            | 10% weight contributing 0 → artificially deflates all scores                                 | HIGH           |
| 2   | **Registration module is a stub** — `SpaceObjectRegistration` data never consulted                                       | 5% weight wasted; Art. 24 compliance unchecked                                               | HIGH           |
| 3   | **Astra AI has no ephemeris tools** — operators cannot ask the AI about satellite compliance state, forecasts, or alerts | Significant capability gap; most feature-rich subsystem is unreachable via conversational AI | HIGH           |
| 4   | **EphemerisForecast cache never read** — `generateForecast()` always recomputes live despite DB cache model existing     | Unnecessary computation on every forecast request                                            | MEDIUM         |
| 5   | **SatelliteAlert field name mismatch** — cron writes `message` but Prisma model uses `description`                       | Potential runtime error on alert creation in production                                      | CRITICAL (bug) |
| 6   | **Main dashboard not integrated** — `/dashboard` shows assessment scores, not Ephemeris scores                           | Users don't see predictive data on the primary landing page                                  | MEDIUM         |
| 7   | **Optimizer ↔ Ephemeris disconnected** — `OptimizationResult` references `Spacecraft` but doesn't feed back              | Regulatory arbitrage analysis doesn't incorporate live compliance state                      | LOW            |

### Architectural Observations

| Observation                             | Assessment                                                                                                                                                                                                                                                         |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Score deflation from stub modules**   | Ground (10%) and Registration (5%) both score 0/UNKNOWN, reducing overall score by up to 15 points. Operators see artificially low scores until Phase 2 ships. Consider temporarily reducing these weights to 0 and redistributing.                                |
| **J2 perturbation defined but unused**  | `EARTH_J2 = 1.08263e-3` is in constants but not used in the orbital decay model. For LEO satellites, J2 causes ~7 km/day RAAN precession — not critical for altitude decay but relevant for sun-synchronous orbit maintenance compliance.                          |
| **No SGP4 integration in backend**      | The orbital decay model uses semi-analytical drag, which is appropriate for multi-year horizons. However, short-term (~7-day) propagation errors are larger than SGP4 would produce. Consider SGP4 for near-term compliance verification.                          |
| **Dynamic Prisma model access pattern** | Uses `prisma as unknown as Record<string, unknown>` for migration guard. This bypasses type safety and will silently fail if models are renamed.                                                                                                                   |
| **In-memory cache on serverless**       | CelesTrak (4h) and NOAA (24h) caches are in-memory. On Vercel serverless, each cold start loses the cache. The DB fallback for NOAA mitigates this; CelesTrak has no DB fallback for the in-memory cache (but the daily OrbitalData rows provide historical data). |
| **Sequential scenario execution**       | The Scenario Builder executes blocks sequentially (each POST waits for response). For pipelines with 5+ blocks, this creates 10-25 second wait times. Consider batch API endpoint.                                                                                 |

---

## 17. Strategic Recommendations

### Immediate (0–30 days)

1. **Fix SatelliteAlert field name mismatch** — Change `message` to `description` in the cron alert creation code. This is a production bug.

2. **Implement EphemerisForecast read cache** — The model exists with `expiresAt` TTL. Add a cache lookup before `generateForecast()` computation. Eliminates ~3-5 seconds of unnecessary computation per forecast request.

3. **Redistribute module weights** — Set ground and registration weights to 0, redistribute their 15% proportionally to other modules. Eliminates the score deflation problem immediately while Phase 2 is in development.

### Short-Term (30–90 days)

4. **Wire Ephemeris into Astra AI** — Define `get_satellite_compliance_state`, `get_compliance_forecast`, `run_what_if_scenario` tools in `tool-definitions.ts`. This makes the most data-rich subsystem accessible via natural language.

5. **Surface Ephemeris on main dashboard** — Add a "Fleet Health" card to `/dashboard` that shows fleet score, earliest horizon, and active CRITICAL alerts. Link to `/dashboard/ephemeris`.

6. **Implement ground module** — Query Sentinel `ground_station_*` data points (already in the collector spec). Map to Art. 64 ground segment requirements.

### Medium-Term (90–180 days)

7. **Implement registration module** — Query `SpaceObjectRegistration` completeness against Art. 24 requirements. Boolean factor checks: UN registry submitted, COSPAR ID assigned, jurisdiction declared.

8. **Batch scenario API** — Add `POST /api/v1/ephemeris/what-if/batch` accepting an array of scenarios. Eliminates the sequential-execution latency for the Scenario Builder pipeline.

9. **Connect Optimizer → Ephemeris** — Pass live compliance state and forecast data into the Regulatory Arbitrage Optimizer. Currently the optimizer operates on static assessment data only.

### Long-Term (180+ days)

10. **Solar cycle forecasting** — Replace static F10.7 with NOAA Solar Cycle 26 forecast data. The atmospheric density model's accuracy degrades significantly across multi-year horizons without solar cycle projection.

11. **Machine learning fuel model** — Replace linear regression with a model that accounts for maneuver events (collision avoidance, station-keeping). Current model assumes constant consumption rate, which breaks down when operators perform unplanned burns.

12. **NCA data sharing API** — Expose compliance state (read-only, consent-gated) to National Competent Authorities. Enables risk-based supervision prioritization — NCAs can focus audits on operators whose Ephemeris horizon is <180 days.

---

## Appendix A — File Inventory

### Backend Engine (~28 files)

| File                                                     | LOC  | Role                                            |
| -------------------------------------------------------- | ---- | ----------------------------------------------- |
| `src/lib/ephemeris/core/types.ts`                        | ~584 | Canonical type contracts, internal/public split |
| `src/lib/ephemeris/core/constants.ts`                    | ~207 | Physical constants, module weights, thresholds  |
| `src/lib/ephemeris/core/scoring.ts`                      | ~178 | Weighted scoring, safety gate, data freshness   |
| `src/lib/ephemeris/core/satellite-compliance-state.ts`   | ~600 | Central orchestrator (14 parallel fetches)      |
| `src/lib/ephemeris/models/orbital-decay.ts`              | ~370 | Semi-analytical atmospheric drag                |
| `src/lib/ephemeris/models/fuel-depletion.ts`             | ~403 | Linear regression fuel prediction               |
| `src/lib/ephemeris/models/subsystem-degradation.ts`      | ~400 | Thruster/battery/solar analysis                 |
| `src/lib/ephemeris/models/deadline-events.ts`            | ~191 | Calendar-based compliance deadlines             |
| `src/lib/ephemeris/models/regulatory-change.ts`          | ~134 | EUR-Lex → compliance factor mapping             |
| `src/lib/ephemeris/data/celestrak-adapter.ts`            | ~116 | CelesTrak GP API, 4h cache                      |
| `src/lib/ephemeris/data/solar-flux-adapter.ts`           | ~128 | NOAA F10.7, 24h cache + DB fallback             |
| `src/lib/ephemeris/data/sentinel-adapter.ts`             | ~231 | Sentinel telemetry time series                  |
| `src/lib/ephemeris/data/assessment-adapter.ts`           | ~228 | 5-domain assessment normalization               |
| `src/lib/ephemeris/data/verity-adapter.ts`               | ~104 | Attestation loading                             |
| `src/lib/ephemeris/data/eurlex-adapter.ts`               | ~127 | Regulatory update ingestion                     |
| `src/lib/ephemeris/forecast/forecast-engine.ts`          | ~257 | Forecast curve + event orchestration            |
| `src/lib/ephemeris/forecast/compliance-horizon.ts`       | ~141 | "N days until breach" calculation               |
| `src/lib/ephemeris/forecast/forecast-curve.ts`           | ~143 | Curve construction, crossing detection          |
| `src/lib/ephemeris/simulation/what-if-engine.ts`         | ~277 | What-if scenario dispatcher                     |
| `src/lib/ephemeris/simulation/jurisdiction-simulator.ts` | —    | Jurisdiction re-flagging                        |
| `src/lib/ephemeris/simulation/handlers/hardware.ts`      | ~596 | 12 hardware failure scenarios                   |
| `src/lib/ephemeris/simulation/handlers/orbital.ts`       | —    | Orbital maneuver scenarios                      |
| `src/lib/ephemeris/simulation/handlers/environment.ts`   | —    | Space environment scenarios                     |
| `src/lib/ephemeris/simulation/handlers/communication.ts` | —    | Communication failure scenarios                 |
| `src/lib/ephemeris/simulation/handlers/financial.ts`     | —    | Financial risk scenarios                        |
| `src/lib/ephemeris/simulation/handlers/operational.ts`   | —    | Operational scenarios                           |
| `src/lib/ephemeris/simulation/handlers/regulatory.ts`    | —    | Regulatory change scenarios                     |
| `src/lib/ephemeris/fleet/fleet-intelligence.ts`          | —    | Fleet analytics + correlation                   |
| `src/lib/ephemeris/fleet/benchmark.ts`                   | —    | Industry benchmarking                           |
| `src/lib/ephemeris/anomaly/anomaly-detector.ts`          | —    | z-score + MA crossover + fleet correlation      |
| `src/lib/ephemeris/cascade/dependency-graph.ts`          | —    | Regulatory DAG                                  |
| `src/lib/ephemeris/cascade/conflict-detector.ts`         | —    | Cross-jurisdiction conflict detection           |

### Cron Jobs (3 files)

| File                                           | Schedule  | Purpose                     |
| ---------------------------------------------- | --------- | --------------------------- |
| `src/app/api/cron/solar-flux-polling/route.ts` | 04:00 UTC | NOAA F10.7 ingestion        |
| `src/app/api/cron/celestrak-polling/route.ts`  | 05:00 UTC | TLE/GP data ingestion       |
| `src/app/api/cron/ephemeris-daily/route.ts`    | 06:00 UTC | Full recalculation pipeline |

### API Routes (13+ files)

| Route                                           | Files                          |
| ----------------------------------------------- | ------------------------------ |
| `/api/v1/ephemeris/state/route.ts`              | State endpoint                 |
| `/api/v1/ephemeris/fleet/route.ts`              | Fleet endpoint                 |
| `/api/v1/ephemeris/fleet/intelligence/route.ts` | Intelligence endpoint          |
| `/api/v1/ephemeris/forecast/route.ts`           | Forecast endpoint              |
| `/api/v1/ephemeris/horizon/route.ts`            | Horizon endpoint               |
| `/api/v1/ephemeris/history/route.ts`            | History endpoint               |
| `/api/v1/ephemeris/alerts/route.ts`             | Alerts endpoint                |
| `/api/v1/ephemeris/recalculate/route.ts`        | Recalculate endpoint           |
| `/api/v1/ephemeris/what-if/route.ts`            | What-if endpoint               |
| `/api/v1/ephemeris/simulate/route.ts`           | Simulation endpoint            |
| `/api/v1/ephemeris/cascade/route.ts`            | Cascade endpoint               |
| `/api/v1/ephemeris/anomalies/route.ts`          | Anomalies endpoint             |
| `/api/satellites/celestrak/route.ts`            | CelesTrak proxy (Edge Runtime) |

### Frontend — Dashboard (14 files)

| File                                                                               | LOC    | Role                        |
| ---------------------------------------------------------------------------------- | ------ | --------------------------- |
| `src/app/dashboard/ephemeris/page.tsx`                                             | ~700   | Fleet Command Center        |
| `src/app/dashboard/ephemeris/[noradId]/page.tsx`                                   | ~1,700 | Satellite Detail (5 tabs)   |
| `src/app/dashboard/ephemeris/theme.ts`                                             | 59     | Self-contained theme system |
| `src/app/dashboard/ephemeris/components/alerts-sidebar.tsx`                        | 477    | Collapsible alert panel     |
| `src/app/dashboard/ephemeris/components/fleet-overview.tsx`                        | 67     | Fleet card grid             |
| `src/app/dashboard/ephemeris/components/jurisdiction-simulator.tsx`                | 271    | Jurisdiction comparison     |
| `src/app/dashboard/ephemeris/components/scenario-builder/block-definitions.ts`     | 1,336  | 55-block registry           |
| `src/app/dashboard/ephemeris/components/scenario-builder/ScenarioBuilder.tsx`      | 263    | DnD container               |
| `src/app/dashboard/ephemeris/components/scenario-builder/useScenarioSimulation.ts` | 291    | Pipeline state + API        |
| `src/app/dashboard/ephemeris/components/scenario-builder/ResultsPanel.tsx`         | 1,070  | Rich results visualization  |
| `src/app/dashboard/ephemeris/components/scenario-builder/BlockPalette.tsx`         | 317    | Searchable block library    |
| `src/app/dashboard/ephemeris/components/scenario-builder/PipelineBlock.tsx`        | 289    | Sortable block card         |
| `src/app/dashboard/ephemeris/components/scenario-builder/ScenarioPipeline.tsx`     | 130    | Drop zone + sortable list   |

### Frontend — Marketing (10 files)

| File                                                            | LOC | Role                          |
| --------------------------------------------------------------- | --- | ----------------------------- |
| `src/app/systems/ephemeris/page.tsx`                            | 111 | Marketing page orchestrator   |
| `src/app/systems/ephemeris/components/ephemeris-hero.tsx`       | 84  | Hero section                  |
| `src/app/systems/ephemeris/components/horizon-badge.tsx`        | 50  | Large metric display          |
| `src/app/systems/ephemeris/components/animated-counter.tsx`     | 56  | RAF counter animation         |
| `src/app/systems/ephemeris/components/forecast-curve.tsx`       | 365 | Signature animated SVG chart  |
| `src/app/systems/ephemeris/components/paradigm-shift.tsx`       | 103 | Before/after comparison       |
| `src/app/systems/ephemeris/components/prediction-models.tsx`    | 170 | 5-model explainer cards       |
| `src/app/systems/ephemeris/components/jurisdiction-section.tsx` | 176 | Jurisdiction comparison table |
| `src/app/systems/ephemeris/components/moat-section.tsx`         | 179 | Competitive moat narrative    |
| `src/app/systems/ephemeris/components/closing-section.tsx`      | 58  | Closing typography            |

---

## Appendix B — Type System Reference

### Core Primitives

```typescript
type ModuleStatus = "COMPLIANT" | "WARNING" | "NON_COMPLIANT" | "UNKNOWN";
type AlertSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
type DataFreshness = "LIVE" | "RECENT" | "STALE" | "NO_DATA";
type Confidence = "HIGH" | "MEDIUM" | "LOW";
type DataSource = "sentinel" | "assessment" | "verity" | "derived" | "none";

type ModuleKey =
  | "orbital"
  | "fuel"
  | "subsystems"
  | "cyber"
  | "ground"
  | "documentation"
  | "insurance"
  | "registration";
```

### Internal vs Public Split

```typescript
// INTERNAL — contains raw sensor data (never sent to API)
interface ComplianceFactorInternal {
  key: string;
  label: string;
  regulationRef: string;
  status: ModuleStatus;
  currentValue: number | null; // ← RAW SENSOR READING (stripped in public)
  thresholdValue: number | null;
  unit: string;
  daysToThreshold: number | null;
  confidence: number;
  dataSource: DataSource;
  lastUpdated: Date | null;
}

// PUBLIC — safe for API responses
interface ComplianceFactor {
  key: string;
  label: string;
  regulationRef: string;
  status: ModuleStatus;
  // NO currentValue
  thresholdValue: number | null;
  unit: string;
  daysToThreshold: number | null;
  confidence: number;
  dataSource: DataSource;
  lastUpdated: Date | null;
}

// Enforced via:
function toPublicFactor(f: ComplianceFactorInternal): ComplianceFactor;
function toPublicState(
  s: SatelliteComplianceStateInternal,
): SatelliteComplianceState;
```

---

## Appendix C — Scenario Block Registry

### 55 Blocks Across 7 Categories

**Orbital (8 blocks)**
Orbit Raise, Orbit Lower, Orbital Plane Change, Slot Change, Collision Avoidance Maneuver, Deorbit Execute, Constellation Resize, Atmospheric Drag Increase

**Hardware (12 blocks)**
Thruster Failure, Reaction Wheel Failure, Solar Panel Degradation, Battery Degradation, Antenna Degradation, Attitude Control Anomaly, Thermal Control Failure, Sensor Degradation, Payload Failure, Passivation Failure, Propellant Leak, Power Bus Anomaly

**Environment (6 blocks)**
Solar Storm, Coronal Mass Ejection (CME), Solar Particle Event, Debris Cloud Encounter, Micrometeoroid Impact, Electrostatic Discharge

**Communication (5 blocks)**
Communication Failure, Ground Station Loss, Frequency Interference, Cyber Incident, Data Breach

**Regulatory (12 blocks)**
Jurisdiction Change, Operator Type Change, Regulatory Change, Insurance Lapse, NCA Audit, Licensing Condition Change, Debris Remediation Order, Mandatory Maneuver Directive, Spectrum Reallocation, Treaty Change, Liability Claim, NIS2 Notification Deadline

**Operational (7 blocks)**
End-of-Life Extension, Launch Delay, Mission Scope Change, Software Anomaly, Service Interruption, Operations Team Change, Frequency Band Migration

**Financial (5 blocks)**
Insurance Premium Increase, Supply Chain Disruption, Sanctions/Export Control, Budget Cut, Partner Default

---

_Report compiled from full codebase analysis of `/Users/julianpolleschner/caelex-assessment/src/lib/ephemeris/`, `/src/app/dashboard/ephemeris/`, `/src/app/api/v1/ephemeris/`, `/src/app/api/cron/`, `/src/app/systems/ephemeris/`, and `/prisma/schema.prisma`._

_Analysis performed: 8 March 2026_
