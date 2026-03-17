# Shield Predictive Intelligence + Fleet Optimization — Design Spec

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan.

## Overview

Two features integrated into the existing Shield dashboard:

1. **Predictive Conjunction Intelligence** — CDM frequency statistics, conjunction forecasting, anomaly detection
2. **Fleet-Level Collision Avoidance** — fleet risk summary, priority queue, maneuver summary

No ML required — pure statistics (CDM frequency, rolling averages, Z-scores). No new DB models — all computed from existing ConjunctionEvent + CDMRecord data. Learns from day 1 of onboarding. Scales from 3 to 1000+ satellites.

### Constraints

- No new Prisma models — all computations are live queries/aggregations
- Integrated into existing Shield dashboard (new sections, not new pages)
- Works from day 1 — no minimum data threshold required (graceful degradation with limited data)
- Scales to mega-constellations (1000+ satellites)

---

## Feature A: Predictive Conjunction Intelligence

### A1: Conjunction Forecast

Predicts expected conjunction count per satellite for the next 7 days based on historical CDM frequency.

**Algorithm:**

```
For each satellite with ≥7 days of data:
  1. Count CDMs per day for the last 30 days (or available window)
  2. Compute 7-day rolling average CDM frequency
  3. Project forward: expected_conjunctions_7d = rolling_avg * 7
  4. Confidence: HIGH if ≥21 days data, MEDIUM if ≥7 days, LOW if <7 days

For satellites with <7 days of data:
  Return { forecast: null, confidence: "insufficient_data" }
```

**Output:**

```typescript
interface SatelliteForecast {
  noradId: string;
  satelliteName: string;
  expectedConjunctions7d: number;
  dailyAverage: number;
  confidence: "high" | "medium" | "low" | "insufficient_data";
  trend: "increasing" | "stable" | "decreasing";
  dataWindowDays: number;
}
```

### A2: Risk Heatmap

Rankings showing which satellites are in the highest-risk orbital environments.

**Algorithm:**

```
For each satellite:
  1. Count total conjunctions (last 30 days)
  2. Count HIGH/EMERGENCY tier events (last 30 days)
  3. Compute risk_score = total_conjunctions + (high_emergency * 5)
  4. Rank by risk_score descending
```

**Output:**

```typescript
interface SatelliteRiskRanking {
  noradId: string;
  satelliteName: string;
  totalConjunctions30d: number;
  highEmergencyCount30d: number;
  riskScore: number;
  rank: number;
}
```

### A3: Proactive Alerts (Anomaly Detection)

Detects when a satellite's conjunction frequency is abnormally high compared to its own baseline and the fleet average.

**Algorithm:**

```
For each satellite with ≥14 days of data:
  1. Compute satellite's mean CDM frequency (CDMs/day over last 30d)
  2. Compute fleet-wide mean CDM frequency
  3. Compute Z-score: z = (satellite_freq - fleet_mean) / fleet_stddev
  4. If z > 2.0: ANOMALY — "Significantly above fleet average"
  5. If z > 3.0: CRITICAL_ANOMALY — "Extreme conjunction frequency"

Also detect self-trend anomaly:
  1. Compare last 7 days frequency vs previous 7 days
  2. If increase > 100%: SURGE — "Conjunction frequency doubled"
```

**Output:**

```typescript
interface ConjunctionAnomaly {
  noradId: string;
  satelliteName: string;
  type: "fleet_anomaly" | "critical_anomaly" | "surge";
  message: string;
  currentFrequency: number;
  baselineFrequency: number;
  zScore: number | null;
  detectedAt: Date;
}
```

---

## Feature B: Fleet-Level Collision Avoidance

### B1: Fleet Risk Dashboard

Aggregated fleet overview showing each satellite's conjunction status at a glance.

**Data:**

```typescript
interface FleetRiskSummary {
  totalSatellites: number;
  satellitesWithActiveEvents: number;
  totalActiveEvents: number;
  emergencyCount: number;
  highCount: number;
  overdueDecisions: number;
  estimatedWeeklyFuelDeltaV: number; // m/s total across fleet
  satellites: FleetSatelliteStatus[];
}

interface FleetSatelliteStatus {
  noradId: string;
  name: string;
  activeEventCount: number;
  highestTier: RiskTier;
  oldestUnresolvedTca: Date | null;
  maneuversThisMonth: number;
  totalDeltaVThisMonth: number;
}
```

### B2: Priority Queue

Intelligent event sorting replacing the default chronological list.

**Algorithm:**

```
priority_score = tier_weight * urgency_factor * staleness_factor

tier_weight:
  EMERGENCY = 100
  HIGH = 50
  ELEVATED = 20
  MONITOR = 5
  INFORMATIONAL = 1

urgency_factor:
  TCA < 24h: 10
  TCA < 48h: 5
  TCA < 7d: 2
  TCA ≥ 7d: 1

staleness_factor (for events awaiting decision):
  > 24h without decision: 3
  > 12h: 2
  > 6h: 1.5
  otherwise: 1

Sort events by priority_score DESC
```

**Output:**

```typescript
interface PrioritizedEvent {
  eventId: string;
  priorityScore: number;
  conjunctionId: string;
  satelliteName: string;
  tier: RiskTier;
  status: ConjunctionStatus;
  tca: Date;
  hoursToTca: number;
  hoursWithoutDecision: number | null;
  pc: number;
}
```

### B3: Fleet Maneuver Summary

Weekly/monthly fleet-level metrics for CA operations.

**Data:**

```typescript
interface FleetManeuverSummary {
  period: "week" | "month";
  totalEvents: number;
  maneuversExecuted: number;
  risksAccepted: number;
  autoClosedEvents: number;
  totalDeltaV: number; // m/s across all maneuvers
  averageResponseTimeHours: number;
  fuelBudgetImpactPercent: number | null; // if fuel budget configured
}
```

---

## Implementation

### New File: `src/lib/shield/fleet-intelligence.server.ts`

Single server-only module with all computation functions:

```typescript
// Exported functions:
computeFleetRiskSummary(orgId: string): Promise<FleetRiskSummary>
computeConjunctionForecast(orgId: string): Promise<SatelliteForecast[]>
detectAnomalies(orgId: string): Promise<ConjunctionAnomaly[]>
prioritizeEvents(events: ConjunctionEvent[]): PrioritizedEvent[]
computeFleetManeuverSummary(orgId: string, period: "week" | "month"): Promise<FleetManeuverSummary>
```

All functions query existing `ConjunctionEvent`, `CDMRecord`, and `Spacecraft` tables. No new models needed.

### New File: `src/lib/shield/fleet-intelligence.test.ts`

Tests for prioritizeEvents (pure function) and anomaly detection logic.

### API Endpoints

| Route                                | Method | Purpose                                     |
| ------------------------------------ | ------ | ------------------------------------------- |
| `/api/shield/fleet-summary`          | GET    | Fleet risk summary + satellite status table |
| `/api/shield/forecast`               | GET    | 7-day conjunction forecast per satellite    |
| `/api/shield/anomalies`              | GET    | Active anomaly alerts                       |
| `/api/shield/priority-queue`         | GET    | Prioritized event list                      |
| `/api/shield/fleet-maneuver-summary` | GET    | Weekly/monthly maneuver metrics             |

All endpoints follow standard Shield pattern: auth → org check → rate limit → compute → return.

### UI Integration (existing Shield dashboard)

**Events Tab — New "Fleet Overview" section at top:**

- Fleet risk summary cards (total active, emergency count, overdue decisions)
- Satellite status table (sorted by highest tier, expandable per satellite)
- Priority queue replaces default event sort (toggle: "Sort by: Priority / Date")

**Analytics Tab — New "Forecast & Trends" section:**

- 7-day conjunction forecast chart (bar chart, one bar per satellite)
- Risk heatmap table (satellite ranking by risk score)
- Anomaly alerts banner (if any anomalies detected)
- Fleet maneuver summary cards (maneuvers this week/month, total delta-V, avg response time)

---

## Files to Create

| File                                                 | Purpose                       |
| ---------------------------------------------------- | ----------------------------- |
| `src/lib/shield/fleet-intelligence.server.ts`        | All computation functions     |
| `tests/unit/shield/fleet-intelligence.test.ts`       | Unit tests                    |
| `src/app/api/shield/fleet-summary/route.ts`          | Fleet risk summary endpoint   |
| `src/app/api/shield/forecast/route.ts`               | Conjunction forecast endpoint |
| `src/app/api/shield/anomalies/route.ts`              | Anomaly detection endpoint    |
| `src/app/api/shield/priority-queue/route.ts`         | Prioritized events endpoint   |
| `src/app/api/shield/fleet-maneuver-summary/route.ts` | Maneuver metrics endpoint     |

## Files to Modify

| File                                | Change                                 |
| ----------------------------------- | -------------------------------------- |
| `src/app/dashboard/shield/page.tsx` | Add Fleet Overview + Forecast sections |
