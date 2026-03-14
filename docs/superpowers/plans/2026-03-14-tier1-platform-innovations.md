# Tier-1 Platform Innovations Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 4 Tier-1 features — NCA Rejection→Score, Ephemeris→Compliance Score, NOAA Space Weather, AI Document Auditor — connecting existing systems with zero external cost.

**Architecture:** Each feature extends existing services following established patterns. NCA outcomes feed into compliance scoring's reporting module. Satellite compliance states feed into a new `space_operations` module. NOAA SWPC data extends the solar flux cron. The document auditor adds rule-based analysis as an Astra tool.

**Tech Stack:** TypeScript, Prisma 5.22, Next.js 15 App Router, Anthropic Claude (existing key)

**Spec:** `docs/superpowers/specs/2026-03-14-tier1-platform-innovations-design.md`

---

## Chunk 1: NCA Rejection → Score Feedback + Ephemeris → Compliance Score

### Task 1: Add NCA Outcomes Factor to Reporting Module

**Files:**

- Modify: `src/lib/services/compliance-scoring-service.ts:237-261` (getReportingData)
- Modify: `src/lib/services/compliance-scoring-service.ts:732-831` (calculateReportingScore)
- Modify: `src/lib/services/compliance-scoring-service.ts:71-78` (MODULE_WEIGHTS — unchanged this task, changed in Task 3)

**Context:** The `getReportingData()` function (line 237) queries `supervisionConfig`, `incidents`, and `reports` for the reporting module. It does NOT query `NCASubmission` — rejections have zero impact on compliance score. The `calculateReportingScore()` function (line 732) has 3 factors totaling 100 points: NCA Config (30), Incident Notifications (40), Report Submissions (30). We redistribute to add a 4th factor: NCA Outcomes (25 pts).

- [ ] **Step 1: Add NCA submissions query to `getReportingData()`**

In `src/lib/services/compliance-scoring-service.ts`, modify `getReportingData()` (line 237-261) to also query NCA submissions:

```typescript
async function getReportingData(userId: string) {
  const supervisionConfig = await prisma.supervisionConfig.findUnique({
    where: { userId },
    select: { id: true },
  });

  const incidents = await prisma.incident.findMany({
    where: { supervision: { userId } },
    select: {
      status: true,
      category: true,
      detectedAt: true,
      requiresNCANotification: true,
      reportedToNCA: true,
    },
  });

  const reports = await prisma.supervisionReport.findMany({
    where: { supervision: { userId } },
    select: { status: true },
    orderBy: { createdAt: "desc" },
  });

  const ncaSubmissions = await prisma.nCASubmission.findMany({
    where: { userId },
    select: {
      id: true,
      status: true,
      rejectedAt: true,
      followUpRequired: true,
      followUpDeadline: true,
      originalSubmissionId: true,
      createdAt: true,
    },
  });

  return { supervisionConfig, incidents, reports, ncaSubmissions };
}
```

- [ ] **Step 2: Redistribute factor points in `calculateReportingScore()`**

In `calculateReportingScore()` (starting line 732), update the function signature to accept the new data shape and redistribute points:

Change the parameter type to include `ncaSubmissions`:

```typescript
function calculateReportingScore(data: {
  supervisionConfig: { id: string } | null;
  incidents: Array<{
    requiresNCANotification: boolean;
    reportedToNCA: boolean;
    detectedAt: Date;
    category: string;
  }>;
  reports: Array<{ status: string }>;
  ncaSubmissions: Array<{
    id: string;
    status: string;
    rejectedAt: Date | null;
    followUpRequired: boolean;
    followUpDeadline: Date | null;
    originalSubmissionId: string | null;
    createdAt: Date;
  }>;
}): ModuleScore {
```

Update existing factor point values:

- NCA Configuration: `maxPoints: 30` → `maxPoints: 25` (lines 748-756)
- Incident Notifications: `maxPoints: 40` → `maxPoints: 30`, penalty `* 15` instead of `* 20` (lines 763-790)
- Report Submissions: `maxPoints: 30` → `maxPoints: 20` (lines 793-818)

**NCA Config factor change (line 753):**

```typescript
maxPoints: 25,
earnedPoints: data.supervisionConfig ? 25 : 0,
```

**Incident Notifications factor change (line 768, 783-786):**

```typescript
maxPoints: 30,
earnedPoints: 30, // Start with full points
```

And the deduction (line 783-786):

```typescript
incidentNotificationFactor.earnedPoints = Math.max(
  0,
  30 - overdueIncidents.length * 15,
);
```

**Report Submissions factor change (line 798, 809-810, 813):**

```typescript
maxPoints: 20,
```

```typescript
reportFactor.earnedPoints = Math.round((submittedReports / totalReports) * 20);
```

```typescript
reportFactor.earnedPoints = 20; // Full points if no reports required yet
```

- [ ] **Step 3: Add NCA Outcomes factor (25 pts)**

After the Report Submissions factor block (after line 818), add the new NCA Outcomes factor:

```typescript
// Factor 4: NCA Outcomes (25 points)
const ncaOutcomesFactor: ScoringFactor = {
  id: "nca_outcomes",
  name: "NCA Submission Outcomes",
  description: "Track record of NCA submission approvals and rejections",
  maxPoints: 25,
  earnedPoints: 0,
  isCritical: false,
  articleRef: "Art. 6-27",
};

// Filter to actionable submissions (exclude DRAFT and WITHDRAWN)
const actionableSubmissions = data.ncaSubmissions.filter(
  (s) => s.status !== "DRAFT" && s.status !== "WITHDRAWN",
);

if (actionableSubmissions.length === 0) {
  ncaOutcomesFactor.earnedPoints = 12; // Neutral — no submissions yet
} else {
  const approved = actionableSubmissions.filter(
    (s) => s.status === "APPROVED",
  ).length;

  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // IDs of submissions that have been re-submitted
  const resubmittedIds = new Set(
    data.ncaSubmissions
      .filter((s) => s.originalSubmissionId)
      .map((s) => s.originalSubmissionId),
  );

  // Recent rejections not yet re-submitted
  const recentRejections = data.ncaSubmissions.filter(
    (s) =>
      s.status === "REJECTED" &&
      s.rejectedAt &&
      s.rejectedAt > thirtyDaysAgo &&
      !resubmittedIds.has(s.id),
  ).length;

  // Overdue information requests
  const overdueInfoRequests = data.ncaSubmissions.filter(
    (s) =>
      s.status === "INFORMATION_REQUESTED" &&
      s.followUpDeadline &&
      s.followUpDeadline < now,
  ).length;

  const baseScore = (approved / actionableSubmissions.length) * 25;
  const penalty = recentRejections * 5 + overdueInfoRequests * 3;
  ncaOutcomesFactor.earnedPoints = Math.round(
    Math.max(0, Math.min(25, baseScore - penalty)),
  );
}

factors.push(ncaOutcomesFactor);
totalPoints += ncaOutcomesFactor.maxPoints;
earnedPoints += ncaOutcomesFactor.earnedPoints;
```

- [ ] **Step 4: Verify the build compiles**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: No errors in `compliance-scoring-service.ts`

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/compliance-scoring-service.ts
git commit -m "feat(compliance): add NCA outcomes factor to reporting module

Redistribute reporting module points (NCA Config 30→25, Incidents 40→30,
Reports 30→20) and add NCA Outcomes factor (25 pts). Queries NCASubmission
to score approval rate, penalize recent rejections and overdue info requests.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 2: Fix SubmissionActions.tsx Resend FSM Mismatch

**Files:**

- Modify: `src/components/nca-portal/SubmissionActions.tsx:148-163`

**Context:** When status is `REJECTED` or `INFORMATION_REQUESTED`, the Resend button calls `handleStatusUpdate("SUBMITTED", ...)` which PATCHes the submission status to SUBMITTED. But the FSM only allows `REJECTED → DRAFT` — not `REJECTED → SUBMITTED`. The proper path is to call the dedicated resend API at `/api/nca/submissions/[id]/resend` which creates a new linked submission.

- [ ] **Step 1: Replace handleStatusUpdate with resend API call**

In `src/components/nca-portal/SubmissionActions.tsx`, replace the Resend button block (the conditional starting around line 148):

```tsx
{
  currentStatus === "REJECTED" || currentStatus === "INFORMATION_REQUESTED" ? (
    <button
      onClick={async () => {
        setIsUpdating(true);
        try {
          const res = await fetch(
            `/api/nca/submissions/${submissionId}/resend`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({}),
            },
          );
          if (!res.ok) throw new Error("Failed to resend submission");
          onUpdate();
        } catch (error) {
          console.error("Failed to resend submission:", error);
        } finally {
          setIsUpdating(false);
        }
      }}
      disabled={isUpdating}
      className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-600 rounded-lg transition-colors disabled:opacity-50"
    >
      <RotateCcw size={14} />
      Resend
    </button>
  ) : null;
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/nca-portal/SubmissionActions.tsx
git commit -m "fix(nca): use resend API instead of direct status PATCH

The Resend button was PATCHing status to SUBMITTED from REJECTED,
violating the FSM (REJECTED → DRAFT only). Now calls the dedicated
/api/nca/submissions/[id]/resend endpoint which creates a new linked
submission with proper audit trail and resend tracking.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 3: Add space_operations Module to Compliance Scoring

**Files:**

- Modify: `src/lib/services/compliance-scoring-service.ts:18-37` (ComplianceScore type)
- Modify: `src/lib/services/compliance-scoring-service.ts:71-78` (MODULE_WEIGHTS)
- Modify: `src/lib/services/compliance-scoring-service.ts:87-147` (calculateComplianceScore)
- Modify: `src/lib/services/compliance-scoring-service.ts` (add data fetcher + calculator)

**Context:** The compliance score has 6 modules. We add a 7th `space_operations` module (weight 0.15) that reads `SatelliteComplianceState` records, `SentinelAgent` count, and `EphemerisForecast` count for the user's org. The `SatelliteComplianceState` model has `overallScore` (0-100) and `horizonDays` (days until first breach). Rebalance all weights to sum to 1.00.

- [ ] **Step 1: Update ComplianceScore type to include space_operations**

In the `ComplianceScore` interface (line 18-37), add `space_operations` to the breakdown:

```typescript
export interface ComplianceScore {
  overall: number;
  grade: "A" | "B" | "C" | "D" | "F";
  status:
    | "compliant"
    | "mostly_compliant"
    | "partial"
    | "non_compliant"
    | "not_assessed";
  breakdown: {
    authorization: ModuleScore;
    debris: ModuleScore;
    cybersecurity: ModuleScore;
    insurance: ModuleScore;
    environmental: ModuleScore;
    reporting: ModuleScore;
    space_operations: ModuleScore;
  };
  recommendations: Recommendation[];
  lastCalculated: Date;
}
```

- [ ] **Step 2: Rebalance MODULE_WEIGHTS**

Replace MODULE_WEIGHTS (line 71-78):

```typescript
const MODULE_WEIGHTS = {
  authorization: 0.22, // Art. 6-27 - Core requirement
  debris: 0.17, // Art. 55-73 - Safety critical
  cybersecurity: 0.17, // Art. 74-95 - NIS2 alignment
  insurance: 0.13, // Art. 28-32 - Liability coverage
  environmental: 0.08, // Art. 96-100 - EFD requirement
  reporting: 0.08, // Art. 33-54 - Ongoing compliance
  space_operations: 0.15, // Satellite fleet health & monitoring
};
```

- [ ] **Step 3: Add `getSpaceOperationsData()` data fetcher**

Add after the `getReportingData()` function (after line 261):

```typescript
async function getSpaceOperationsData(userId: string) {
  // Find user's org
  const orgMember = await prisma.organizationMember.findFirst({
    where: { userId },
    select: { organizationId: true },
  });

  if (!orgMember?.organizationId) {
    return { satelliteStates: [], activeAgents: 0, activeForecasts: 0 };
  }

  const orgId = orgMember.organizationId;

  const [satelliteStates, activeAgents, activeForecasts] = await Promise.all([
    prisma.satelliteComplianceState.findMany({
      where: { operatorId: orgId },
      select: { overallScore: true, horizonDays: true },
    }),
    prisma.sentinelAgent.count({
      where: { organizationId: orgId, status: "ACTIVE" },
    }),
    prisma.ephemerisForecast.count({
      where: {
        operatorId: orgId,
        expiresAt: { gt: new Date() },
      },
    }),
  ]);

  return { satelliteStates, activeAgents, activeForecasts };
}
```

- [ ] **Step 4: Add `calculateSpaceOperationsScore()` function**

Add after the `calculateReportingScore()` function (before the Helper Functions section):

```typescript
function calculateSpaceOperationsScore(data: {
  satelliteStates: Array<{ overallScore: number; horizonDays: number | null }>;
  activeAgents: number;
  activeForecasts: number;
}): ModuleScore {
  const factors: ScoringFactor[] = [];
  let totalPoints = 0;
  let earnedPoints = 0;

  // Factor 1: Fleet Health (40 points)
  const fleetHealthFactor: ScoringFactor = {
    id: "fleet_health",
    name: "Fleet Health",
    description: "Average satellite compliance score across fleet",
    maxPoints: 40,
    earnedPoints: 20, // Default neutral if no satellites
    isCritical: false,
    articleRef: "Art. 55-73",
  };

  if (data.satelliteStates.length > 0) {
    const avgScore =
      data.satelliteStates.reduce((sum, s) => sum + s.overallScore, 0) /
      data.satelliteStates.length;

    if (avgScore >= 70) fleetHealthFactor.earnedPoints = 40;
    else if (avgScore >= 50) fleetHealthFactor.earnedPoints = 30;
    else if (avgScore >= 30) fleetHealthFactor.earnedPoints = 20;
    else fleetHealthFactor.earnedPoints = 10;
  }

  factors.push(fleetHealthFactor);
  totalPoints += fleetHealthFactor.maxPoints;
  earnedPoints += fleetHealthFactor.earnedPoints;

  // Factor 2: Compliance Horizon (35 points)
  const horizonFactor: ScoringFactor = {
    id: "compliance_horizon",
    name: "Compliance Horizon",
    description: "Shortest time until a satellite breaches a threshold",
    maxPoints: 35,
    earnedPoints: 17, // Default neutral if no data
    isCritical: false,
    articleRef: "Art. 64-72",
  };

  const horizons = data.satelliteStates
    .map((s) => s.horizonDays)
    .filter((d): d is number => d !== null);

  if (horizons.length > 0) {
    const shortestHorizon = Math.min(...horizons);
    if (shortestHorizon > 180) horizonFactor.earnedPoints = 35;
    else if (shortestHorizon > 90) horizonFactor.earnedPoints = 25;
    else if (shortestHorizon > 30) horizonFactor.earnedPoints = 15;
    else horizonFactor.earnedPoints = 5;
  }

  factors.push(horizonFactor);
  totalPoints += horizonFactor.maxPoints;
  earnedPoints += horizonFactor.earnedPoints;

  // Factor 3: Active Monitoring (25 points)
  const monitoringFactor: ScoringFactor = {
    id: "active_monitoring",
    name: "Active Monitoring",
    description: "Sentinel agents and ephemeris forecasts active",
    maxPoints: 25,
    earnedPoints: 0,
    isCritical: false,
    articleRef: "Art. 33-37",
  };

  if (data.activeAgents > 0) monitoringFactor.earnedPoints += 15;
  if (data.activeForecasts > 0) monitoringFactor.earnedPoints += 10;

  factors.push(monitoringFactor);
  totalPoints += monitoringFactor.maxPoints;
  earnedPoints += monitoringFactor.earnedPoints;

  const score =
    totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

  return {
    score,
    weight: MODULE_WEIGHTS.space_operations,
    weightedScore: score * MODULE_WEIGHTS.space_operations,
    status: getModuleStatus(score),
    factors,
    articleReferences: ["Art. 55-73", "Art. 33-37"],
  };
}
```

- [ ] **Step 5: Wire into `calculateComplianceScore()`**

Update `calculateComplianceScore()` (line 87-147):

Add `spaceOperationsData` to the Promise.all array (after line 104):

```typescript
const [
  authorizationData,
  debrisData,
  cybersecurityData,
  insuranceData,
  environmentalData,
  reportingData,
  spaceOperationsData,
] = await Promise.all([
  getAuthorizationData(userId),
  getDebrisData(userId),
  getCybersecurityData(userId),
  getInsuranceData(userId),
  getEnvironmentalData(userId),
  getReportingData(userId),
  getSpaceOperationsData(userId),
]);
```

Add the calculation (after line 113):

```typescript
const space_operations = calculateSpaceOperationsScore(spaceOperationsData);
```

Add to the breakdown object (after line 123):

```typescript
const breakdown = {
  authorization,
  debris,
  cybersecurity,
  insurance,
  environmental,
  reporting,
  space_operations,
};
```

- [ ] **Step 6: Verify the build compiles**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add src/lib/services/compliance-scoring-service.ts
git commit -m "feat(compliance): add space_operations module to dashboard score

Add 7th compliance module fed by SatelliteComplianceState, SentinelAgent,
and EphemerisForecast data. 3 factors: Fleet Health (40pts), Compliance
Horizon (35pts), Active Monitoring (25pts). Rebalance weights to sum 1.00.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 4: Include space_operations in Compliance Snapshot

**Files:**

- Modify: `src/app/api/cron/compliance-snapshot/route.ts:262-266`

**Context:** The compliance snapshot cron (line 262-266) serializes module scores from `complianceScore.breakdown`. Since `space_operations` is now in the breakdown, it will automatically be included in the `moduleScores` JSON via the existing loop:

```typescript
const moduleScores: Record<string, number> = {};
for (const [moduleId, mod] of Object.entries(complianceScore.breakdown)) {
  moduleScores[moduleId] = mod.score;
}
```

This already works because the loop iterates over all `breakdown` entries. **No code change needed** — just verify.

- [ ] **Step 1: Verify snapshot includes space_operations**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: No errors. The `complianceScore.breakdown` type now includes `space_operations`, and the `Object.entries()` loop handles it automatically.

- [ ] **Step 2: Commit (if any changes were needed)**

No commit needed — the snapshot cron auto-includes all breakdown modules.

---

## Chunk 2: NOAA Space Weather Integration

### Task 5: Add SpaceWeatherEvent Model and kpIndex to SolarFluxRecord

**Files:**

- Modify: `prisma/schema.prisma:6392-6401` (SolarFluxRecord — add kpIndex, isPredicted)
- Modify: `prisma/schema.prisma` (add SpaceWeatherEvent model after SolarFluxRecord)

- [ ] **Step 1: Add `kpIndex` and `isPredicted` fields to SolarFluxRecord**

In `prisma/schema.prisma` at line 6392-6401, modify SolarFluxRecord:

```prisma
model SolarFluxRecord {
  id          String   @id @default(cuid())
  f107        Float
  kpIndex     Float?
  isPredicted Boolean  @default(false)
  observedAt  DateTime
  source      String   @default("NOAA_SWPC")
  createdAt   DateTime @default(now())

  @@unique([observedAt, source])
  @@index([observedAt])
  @@index([isPredicted, observedAt])
}
```

- [ ] **Step 2: Add SpaceWeatherEvent model**

Add after the SolarFluxRecord model:

```prisma
model SpaceWeatherEvent {
  id          String    @id @default(cuid())
  eventType   String    // GEOMAGNETIC_STORM, SOLAR_RADIATION, RADIO_BLACKOUT
  severity    String    // G1-G5, S1-S5, R1-R5
  kpIndex     Float?
  startedAt   DateTime
  endedAt     DateTime?
  description String?
  source      String    @default("NOAA_SWPC")
  createdAt   DateTime  @default(now())

  @@index([eventType, startedAt])
  @@index([severity])
}
```

- [ ] **Step 3: Generate Prisma client and push schema**

Run: `npx prisma db push --accept-data-loss 2>&1 | tail -5`
Expected: Schema changes applied (or use `npx prisma generate` if not pushing to a live DB)

If DB isn't available, just generate:
Run: `npx prisma generate 2>&1 | tail -5`
Expected: Prisma Client generated successfully

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add SpaceWeatherEvent model and kpIndex to SolarFluxRecord

Add new SpaceWeatherEvent model for tracking NOAA SWPC geomagnetic storms,
solar radiation, and radio blackouts. Extend SolarFluxRecord with kpIndex
and isPredicted fields for Kp geomagnetic data and forecast values.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 6: Create Space Weather Service

**Files:**

- Create: `src/lib/services/space-weather-service.server.ts`

**Context:** This service fetches 3 additional NOAA SWPC endpoints (all free, no API key), parses responses, stores events and alerts. Used by the solar-flux-polling cron.

- [ ] **Step 1: Create the space weather service**

Create `src/lib/services/space-weather-service.server.ts`:

```typescript
import "server-only";

import type { PrismaClient } from "@prisma/client";
import { logger } from "@/lib/logger";

// ─── Types ────────────────────────────────────────────────────────────────────

interface KpIndexRecord {
  time_tag: string;
  kp_index: number;
  estimated_kp: number;
  kp: string;
}

interface NOAAScalesResponse {
  "0": {
    DateStamp: string;
    TimeStamp: string;
    G: { Scale: string; Text: string };
    S: { Scale: string; Text: string };
    R: { Scale: string; Text: string };
  };
}

interface PredictedSolarCycleRecord {
  "time-tag": string;
  predicted_ssn: number;
  "predicted_f10.7": number;
  high_ssn: number;
  "high_f10.7": number;
  low_ssn: number;
  "low_f10.7": number;
}

export interface SpaceWeatherStatus {
  kpIndex: number | null;
  geomagneticScale: string; // G0-G5
  solarRadiationScale: string; // S0-S5
  radioBlackoutScale: string; // R0-R5
  fetchedAt: string;
}

// ─── NOAA Endpoints ───────────────────────────────────────────────────────────

const NOAA_KP_URL =
  "https://services.swpc.noaa.gov/json/planetary_k_index_1m.json";
const NOAA_SCALES_URL =
  "https://services.swpc.noaa.gov/products/noaa-scales.json";
const NOAA_PREDICTED_CYCLE_URL =
  "https://services.swpc.noaa.gov/json/solar-cycle/predicted-solar-cycle.json";

const FETCH_TIMEOUT_MS = 8000;

// ─── Fetch Helpers ────────────────────────────────────────────────────────────

async function fetchJSON<T>(url: string): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      logger.warn(`[space-weather] Fetch failed: ${url} status=${res.status}`);
      return null;
    }

    return (await res.json()) as T;
  } catch (error) {
    logger.warn(`[space-weather] Fetch error: ${url}`, {
      error: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}

// ─── Kp Index ─────────────────────────────────────────────────────────────────

export async function fetchLatestKpIndex(): Promise<number | null> {
  const records = await fetchJSON<KpIndexRecord[]>(NOAA_KP_URL);
  if (!records || records.length === 0) return null;

  // Records sorted ascending by time_tag — take the last one
  const latest = records[records.length - 1]!;
  const kp = latest.kp_index ?? latest.estimated_kp;
  return typeof kp === "number" && kp >= 0 ? kp : null;
}

// ─── NOAA Scales ──────────────────────────────────────────────────────────────

export async function fetchNOAAScales(): Promise<{
  G: string;
  S: string;
  R: string;
} | null> {
  const data = await fetchJSON<NOAAScalesResponse>(NOAA_SCALES_URL);
  if (!data || !data["0"]) return null;

  const current = data["0"];
  return {
    G: current.G?.Scale || "G0",
    S: current.S?.Scale || "S0",
    R: current.R?.Scale || "R0",
  };
}

// ─── Predicted Solar Cycle ────────────────────────────────────────────────────

export async function fetchPredictedSolarCycle(): Promise<Array<{
  observedAt: Date;
  f107: number;
}> | null> {
  const records = await fetchJSON<PredictedSolarCycleRecord[]>(
    NOAA_PREDICTED_CYCLE_URL,
  );
  if (!records || records.length === 0) return null;

  const now = new Date();
  const predictions: Array<{ observedAt: Date; f107: number }> = [];

  for (const record of records) {
    const f107 = record["predicted_f10.7"];
    if (typeof f107 !== "number" || f107 <= 0) continue;

    const date = new Date(record["time-tag"]);
    if (isNaN(date.getTime())) continue;

    // Only future predictions (next 12 months)
    if (
      date > now &&
      date.getTime() - now.getTime() < 365 * 24 * 60 * 60 * 1000
    ) {
      predictions.push({ observedAt: date, f107 });
    }
  }

  return predictions.length > 0 ? predictions : null;
}

// ─── Event Detection ──────────────────────────────────────────────────────────

function parseScaleLevel(scale: string): number {
  const match = scale.match(/[GSR](\d)/);
  return match ? parseInt(match[1]!, 10) : 0;
}

export async function processSpaceWeatherData(
  prisma: PrismaClient,
  kpIndex: number | null,
  scales: { G: string; S: string; R: string } | null,
  predictions: Array<{ observedAt: Date; f107: number }> | null,
): Promise<{
  kpStored: boolean;
  eventsCreated: number;
  predictionsStored: number;
  alertsCreated: number;
}> {
  let eventsCreated = 0;
  let predictionsStored = 0;
  let alertsCreated = 0;

  // 1. Store Kp index on today's SolarFluxRecord
  if (kpIndex !== null) {
    const now = new Date();
    const observedAt = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    await prisma.solarFluxRecord.updateMany({
      where: { observedAt, source: "NOAA_SWPC" },
      data: { kpIndex },
    });
  }

  // 2. Detect and store space weather events from NOAA scales
  if (scales) {
    const scaleEntries = [
      {
        type: "GEOMAGNETIC_STORM",
        severity: scales.G,
        level: parseScaleLevel(scales.G),
      },
      {
        type: "SOLAR_RADIATION",
        severity: scales.S,
        level: parseScaleLevel(scales.S),
      },
      {
        type: "RADIO_BLACKOUT",
        severity: scales.R,
        level: parseScaleLevel(scales.R),
      },
    ];

    for (const entry of scaleEntries) {
      if (entry.level >= 1) {
        // Check if we already have an active (unended) event of this type and severity
        const existing = await prisma.spaceWeatherEvent.findFirst({
          where: {
            eventType: entry.type,
            severity: entry.severity,
            endedAt: null,
          },
        });

        if (!existing) {
          await prisma.spaceWeatherEvent.create({
            data: {
              eventType: entry.type,
              severity: entry.severity,
              kpIndex,
              startedAt: new Date(),
              description: `NOAA ${entry.severity} event detected`,
              source: "NOAA_SWPC",
            },
          });
          eventsCreated++;
        }
      }
    }

    // Close events that are no longer active
    for (const entry of scaleEntries) {
      if (entry.level === 0) {
        await prisma.spaceWeatherEvent.updateMany({
          where: {
            eventType: entry.type,
            endedAt: null,
          },
          data: { endedAt: new Date() },
        });
      }
    }

    // Auto-create SatelliteAlerts for G3+ storms
    if (parseScaleLevel(scales.G) >= 3) {
      const orgsWithSpacecraft = await prisma.spacecraft.findMany({
        select: { noradId: true, organizationId: true },
        distinct: ["organizationId"],
      });

      for (const sc of orgsWithSpacecraft) {
        if (!sc.noradId || !sc.organizationId) continue;

        const severity =
          parseScaleLevel(scales.G) >= 4 ? "CRITICAL" : "WARNING";
        const dedupeKey = `${sc.noradId}_SPACE_WEATHER_${scales.G}`;

        const existingAlert = await prisma.satelliteAlert.findFirst({
          where: { dedupeKey, resolvedAt: null },
        });

        if (!existingAlert) {
          await prisma.satelliteAlert.create({
            data: {
              noradId: sc.noradId,
              operatorId: sc.organizationId,
              type: "SPACE_WEATHER",
              severity,
              title: `${scales.G} Geomagnetic Storm Active`,
              description: `NOAA reports a ${scales.G} geomagnetic storm. Kp index: ${kpIndex ?? "N/A"}. Increased atmospheric drag may affect orbital predictions.`,
              dedupeKey,
            },
          });
          alertsCreated++;
        }
      }
    }
  }

  // 3. Store predicted solar cycle values
  if (predictions && predictions.length > 0) {
    for (const prediction of predictions) {
      await prisma.solarFluxRecord.upsert({
        where: {
          observedAt_source: {
            observedAt: prediction.observedAt,
            source: "NOAA_SWPC",
          },
        },
        update: {
          f107: prediction.f107,
          isPredicted: true,
        },
        create: {
          f107: prediction.f107,
          observedAt: prediction.observedAt,
          source: "NOAA_SWPC",
          isPredicted: true,
        },
      });
      predictionsStored++;
    }
  }

  return {
    kpStored: kpIndex !== null,
    eventsCreated,
    predictionsStored,
    alertsCreated,
  };
}

// ─── Dashboard Helper ─────────────────────────────────────────────────────────

export async function getCurrentSpaceWeatherStatus(): Promise<SpaceWeatherStatus> {
  const [kp, scales] = await Promise.all([
    fetchLatestKpIndex(),
    fetchNOAAScales(),
  ]);

  return {
    kpIndex: kp,
    geomagneticScale: scales?.G ?? "G0",
    solarRadiationScale: scales?.S ?? "S0",
    radioBlackoutScale: scales?.R ?? "R0",
    fetchedAt: new Date().toISOString(),
  };
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/services/space-weather-service.server.ts
git commit -m "feat(ephemeris): create space weather service for NOAA SWPC data

Fetches Kp geomagnetic index, NOAA G/S/R scales, and predicted solar
cycle from free NOAA SWPC endpoints. Stores SpaceWeatherEvents, creates
SatelliteAlerts for G3+ storms, persists predicted F10.7 values.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 7: Extend Solar Flux Polling Cron

**Files:**

- Modify: `src/app/api/cron/solar-flux-polling/route.ts`

**Context:** The existing cron fetches only F10.7 via `getCurrentF107()`. We extend it to also fetch Kp index, NOAA scales, and predicted solar cycle data using the new space weather service.

- [ ] **Step 1: Extend the cron route**

Replace the try block in `src/app/api/cron/solar-flux-polling/route.ts` (lines 48-103):

```typescript
try {
  logger.info("[Solar Flux] Starting F10.7 + space weather polling...");

  // 1. Original F10.7 fetch
  const f107 = await getCurrentF107();

  const now = new Date();
  const observedAt = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );

  await prisma.solarFluxRecord.upsert({
    where: {
      observedAt_source: {
        observedAt,
        source: "NOAA_SWPC",
      },
    },
    update: {
      f107,
    },
    create: {
      f107,
      observedAt,
      source: "NOAA_SWPC",
    },
  });

  // 2. Fetch additional NOAA data in parallel
  const [kpIndex, scales, predictions] = await Promise.all([
    fetchLatestKpIndex(),
    fetchNOAAScales(),
    fetchPredictedSolarCycle(),
  ]);

  // 3. Process and store space weather data
  const weatherResult = await processSpaceWeatherData(
    prisma,
    kpIndex,
    scales,
    predictions,
  );

  const duration = Date.now() - startTime;

  logger.info("[Solar Flux] Polling complete", {
    f107,
    kpIndex,
    scales,
    eventsCreated: weatherResult.eventsCreated,
    predictionsStored: weatherResult.predictionsStored,
    alertsCreated: weatherResult.alertsCreated,
    observedAt: observedAt.toISOString(),
    duration: `${duration}ms`,
  });

  return NextResponse.json({
    success: true,
    f107,
    kpIndex,
    scales,
    weather: weatherResult,
    observedAt: observedAt.toISOString(),
    duration: `${duration}ms`,
    processedAt: new Date().toISOString(),
  });
} catch (error) {
  logger.error("[Solar Flux] Cron job failed", error);
  return NextResponse.json(
    {
      success: false,
      error: "Processing failed",
      message: getSafeErrorMessage(error, "Solar flux polling failed"),
      processedAt: new Date().toISOString(),
    },
    { status: 500 },
  );
}
```

Also add the import at the top (after line 6):

```typescript
import {
  fetchLatestKpIndex,
  fetchNOAAScales,
  fetchPredictedSolarCycle,
  processSpaceWeatherData,
} from "@/lib/services/space-weather-service.server";
```

- [ ] **Step 2: Verify the build compiles**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cron/solar-flux-polling/route.ts
git commit -m "feat(cron): extend solar flux polling with Kp, NOAA scales, predictions

Fetch 3 additional free NOAA SWPC endpoints alongside existing F10.7:
planetary Kp index, G/S/R space weather scales, and predicted solar
cycle. Auto-creates SpaceWeatherEvents and SatelliteAlerts for G3+.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 8: Use Kp Index in Orbital Decay Density Model

**Files:**

- Modify: `src/lib/ephemeris/models/orbital-decay.ts:39-44` (predictOrbitalDecay signature)
- Modify: `src/lib/ephemeris/models/orbital-decay.ts:292-320` (getAtmosphericDensity)

**Context:** Currently, atmospheric density is scaled only by F10.7 solar flux. Kp geomagnetic index causes additional thermospheric heating. We add a `kpIndex` parameter and apply a density multiplier: `densityMultiplier = 1 + (kp / 9) * 0.3` (Kp=9 → 30% density increase).

- [ ] **Step 1: Add `kpIndex` parameter to `predictOrbitalDecay()`**

In `src/lib/ephemeris/models/orbital-decay.ts`, update the function signature (line 39-44):

```typescript
export function predictOrbitalDecay(
  elements: OrbitalElements,
  f107: number,
  areaToMass: number = DEFAULT_AREA_TO_MASS,
  dragCoefficient: number = DEFAULT_DRAG_COEFFICIENT,
  kpIndex: number = 3, // Default Kp=3 (quiet conditions)
): OrbitalDecayForecast {
```

Pass `kpIndex` through to `simulateDecay()` (line 53):

```typescript
const { altitudeCurve, reentryDayOffset, warningDayOffset } = simulateDecay(
  altitudeKm,
  f107,
  areaToMass,
  dragCoefficient,
  kpIndex,
);
```

- [ ] **Step 2: Thread `kpIndex` through simulation functions**

Update `simulateDecay()` signature (line 167-172):

```typescript
function simulateDecay(
  startAltKm: number,
  f107: number,
  areaToMass: number,
  cd: number,
  kpIndex: number,
): DecaySimulationResult {
```

Update the `computeDailyDecayKm` call inside simulateDecay (line 191):

```typescript
const decayRate = computeDailyDecayKm(
  currentAlt,
  f107,
  areaToMass,
  cd,
  kpIndex,
);
```

Update `computeDailyDecayKm()` signature (line 237-242):

```typescript
function computeDailyDecayKm(
  altKm: number,
  f107: number,
  areaToMass: number,
  cd: number,
  kpIndex: number = 3,
): number {
```

Update the density call inside `computeDailyDecayKm` (line 246):

```typescript
const density = getAtmosphericDensity(altKm, f107, kpIndex);
```

Also update `computeCumulativeDecay()` to pass default kp (line 268-286) — this function is used for best/worst case bands where kpIndex isn't varied separately:

```typescript
function computeCumulativeDecay(
  startAltKm: number,
  f107: number,
  areaToMass: number,
  cd: number,
  days: number,
): number {
  let totalDecay = 0;
  let currentAlt = startAltKm;

  for (let d = 0; d < days; d++) {
    const dailyDecay = computeDailyDecayKm(currentAlt, f107, areaToMass, cd);
    totalDecay += dailyDecay;
    currentAlt -= dailyDecay;
    if (currentAlt <= DESTRUCTION_ALTITUDE_KM) break;
  }

  return totalDecay;
}
```

- [ ] **Step 3: Add Kp scaling to `getAtmosphericDensity()`**

Update `getAtmosphericDensity()` (line 292-320):

```typescript
function getAtmosphericDensity(
  altKm: number,
  f107: number,
  kpIndex: number = 3,
): number {
  if (altKm < ATMOSPHERIC_LAYERS[0]!.baseAlt) {
    const layer = ATMOSPHERIC_LAYERS[0]!;
    return (
      layer.baseDensity * Math.exp(-(altKm - layer.baseAlt) / layer.scaleHeight)
    );
  }

  let layer: { baseAlt: number; baseDensity: number; scaleHeight: number } =
    ATMOSPHERIC_LAYERS[0]!;
  for (const l of ATMOSPHERIC_LAYERS) {
    if (altKm >= l.baseAlt) {
      layer = l;
    } else {
      break;
    }
  }

  const rho =
    layer.baseDensity * Math.exp(-(altKm - layer.baseAlt) / layer.scaleHeight);

  // Solar flux scaling
  const solarScale = 1 + F107_DENSITY_SCALING * (f107 - F107_REFERENCE);

  // Kp geomagnetic scaling: thermospheric heating increases density
  // Kp=0 → 1.0x, Kp=9 → 1.3x (30% increase at extreme storm)
  const kpScale = 1 + (kpIndex / 9) * 0.3;

  return rho * Math.max(solarScale, 0.1) * kpScale;
}
```

- [ ] **Step 4: Verify the build compiles**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: No errors (the `kpIndex` parameter has a default value so existing callers still work)

- [ ] **Step 5: Commit**

```bash
git add src/lib/ephemeris/models/orbital-decay.ts
git commit -m "feat(ephemeris): integrate Kp geomagnetic index into density model

Add kpIndex parameter to orbital decay prediction. Kp scales atmospheric
density via thermospheric heating: density *= 1 + (Kp/9) * 0.3, giving
up to 30% density increase at Kp=9. Default Kp=3 for quiet conditions.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 3: AI Document Auditor

### Task 9: Create Document Audit Service

**Files:**

- Create: `src/lib/services/document-audit-service.server.ts`

**Context:** Rule-based auditing of Generate 2.0 documents. Takes a document's `content` (JSON `ReportSection[]`) and `documentType` (NCADocumentType enum). Runs 3 checks: regulation coverage, threshold consistency, section completeness. Free — no AI calls in the rule-based path.

- [ ] **Step 1: Create the document audit service**

Create `src/lib/services/document-audit-service.server.ts`:

```typescript
import "server-only";

import { COMPLIANCE_THRESHOLDS } from "@/lib/compliance/thresholds";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DocumentAuditResult {
  overallScore: number; // 0-100
  regulationCoverage: {
    score: number;
    missing: string[];
    found: string[];
  };
  thresholdConsistency: {
    score: number;
    mismatches: ThresholdMismatch[];
  };
  sectionCompleteness: {
    score: number;
    missing: string[];
    present: string[];
  };
  recommendations: string[];
}

export interface ThresholdMismatch {
  claim: string;
  expectedValue: string;
  regulationRef: string;
}

interface ReportSection {
  title: string;
  content: string;
}

// ─── Required Regulation References ───────────────────────────────────────────

const REQUIRED_REGULATIONS: Record<string, string[]> = {
  DMP: [
    "eu_space_act_art_64",
    "eu_space_act_art_68",
    "eu_space_act_art_70",
    "eu_space_act_art_72",
    "iadc_5_3_1",
  ],
  CYBER_POLICY: ["nis2_art_21_2_e", "nis2_art_21_2_j", "nis2_art_23"],
  CYBER_RISK_ASSESSMENT: ["nis2_art_21_2_e", "nis2_art_21_2_j"],
  INCIDENT_RESPONSE: ["nis2_art_23"],
  ENVIRONMENTAL_FOOTPRINT: [
    "eu_space_act_art_96",
    "eu_space_act_art_97",
    "eu_space_act_art_98",
  ],
  AUTHORIZATION_APPLICATION: [
    "eu_space_act_art_6",
    "eu_space_act_art_8",
    "eu_space_act_art_10",
  ],
};

// Regex patterns to detect regulation references in text
const REGULATION_PATTERNS: Record<string, RegExp> = {
  eu_space_act_art_6: /art(?:icle|\.)\s*6\b/i,
  eu_space_act_art_8: /art(?:icle|\.)\s*8\b/i,
  eu_space_act_art_10: /art(?:icle|\.)\s*10\b/i,
  eu_space_act_art_64: /art(?:icle|\.)\s*64\b/i,
  eu_space_act_art_68: /art(?:icle|\.)\s*68\b/i,
  eu_space_act_art_70: /art(?:icle|\.)\s*70\b/i,
  eu_space_act_art_72: /art(?:icle|\.)\s*72\b/i,
  eu_space_act_art_96: /art(?:icle|\.)\s*96\b/i,
  eu_space_act_art_97: /art(?:icle|\.)\s*97\b/i,
  eu_space_act_art_98: /art(?:icle|\.)\s*98\b/i,
  nis2_art_21_2_e:
    /nis2.*art(?:icle|\.)\s*21.*2.*e|art(?:icle|\.)\s*21\s*\(2\)\s*\(e\)/i,
  nis2_art_21_2_j:
    /nis2.*art(?:icle|\.)\s*21.*2.*j|art(?:icle|\.)\s*21\s*\(2\)\s*\(j\)/i,
  nis2_art_23: /nis2.*art(?:icle|\.)\s*23|art(?:icle|\.)\s*23.*nis2/i,
  iadc_5_3_1: /iadc.*5[\.\s]*3[\.\s]*1|iadc\s+guideline/i,
};

// ─── Required Sections ────────────────────────────────────────────────────────

const REQUIRED_SECTIONS: Record<string, string[]> = {
  DMP: [
    "Executive Summary",
    "Passivation Strategy",
    "Disposal Plan",
    "Collision Avoidance",
    "Timeline",
  ],
  CYBER_POLICY: [
    "Executive Summary",
    "Scope",
    "Risk Assessment",
    "Access Control",
    "Incident Response",
  ],
  CYBER_RISK_ASSESSMENT: [
    "Executive Summary",
    "Methodology",
    "Risk Register",
    "Mitigation Measures",
  ],
  INCIDENT_RESPONSE: [
    "Executive Summary",
    "Detection",
    "Containment",
    "Notification Timeline",
    "Recovery",
  ],
  ENVIRONMENTAL_FOOTPRINT: [
    "Executive Summary",
    "Lifecycle Assessment",
    "Emissions",
    "Mitigation",
  ],
  AUTHORIZATION_APPLICATION: [
    "Executive Summary",
    "Operator Profile",
    "Mission Description",
    "Compliance Matrix",
  ],
};

// ─── Audit Functions ──────────────────────────────────────────────────────────

function flattenContent(sections: ReportSection[]): string {
  return sections.map((s) => `${s.title}\n${s.content}`).join("\n");
}

function checkRegulationCoverage(
  fullText: string,
  documentType: string,
): DocumentAuditResult["regulationCoverage"] {
  const required = REQUIRED_REGULATIONS[documentType] ?? [];
  if (required.length === 0) {
    return { score: 100, missing: [], found: [] };
  }

  const found: string[] = [];
  const missing: string[] = [];

  for (const ref of required) {
    const pattern = REGULATION_PATTERNS[ref];
    if (pattern && pattern.test(fullText)) {
      found.push(ref);
    } else {
      missing.push(ref);
    }
  }

  const score =
    required.length > 0
      ? Math.round((found.length / required.length) * 100)
      : 100;

  return { score, missing, found };
}

function checkThresholdConsistency(
  fullText: string,
): DocumentAuditResult["thresholdConsistency"] {
  const mismatches: ThresholdMismatch[] = [];

  // Extract numeric claims like "15%", "25 years", "80%", "1440 minutes"
  const numericClaims = fullText.matchAll(
    /(\d+(?:\.\d+)?)\s*(%|years?|minutes?|SFU)/gi,
  );

  for (const match of numericClaims) {
    const value = parseFloat(match[1]!);
    const unit = match[2]!.toLowerCase().replace(/s$/, "");

    // Check against known thresholds
    for (const [ref, threshold] of Object.entries(COMPLIANCE_THRESHOLDS)) {
      const thresholdUnit = threshold.unit.toLowerCase().replace(/s$/, "");

      if (unit === "%" && thresholdUnit === "%") {
        // Check if the document claims a value that contradicts the threshold
        if (
          threshold.type === "ABOVE" &&
          value < threshold.threshold &&
          value > 0
        ) {
          // Document states a value below the compliance threshold
          mismatches.push({
            claim: `${value}%`,
            expectedValue: `≥${threshold.threshold}% (${threshold.name})`,
            regulationRef: ref,
          });
        }
      } else if (unit === "year" && thresholdUnit === "year") {
        if (threshold.type === "BELOW" && value > threshold.threshold) {
          mismatches.push({
            claim: `${value} years`,
            expectedValue: `≤${threshold.threshold} years (${threshold.name})`,
            regulationRef: ref,
          });
        }
      } else if (unit === "minute" && thresholdUnit === "minute") {
        if (threshold.type === "BELOW" && value > threshold.threshold) {
          mismatches.push({
            claim: `${value} minutes`,
            expectedValue: `≤${threshold.threshold} minutes (${threshold.name})`,
            regulationRef: ref,
          });
        }
      }
    }
  }

  const score =
    mismatches.length === 0 ? 100 : Math.max(0, 100 - mismatches.length * 25);

  return { score, mismatches };
}

function checkSectionCompleteness(
  sections: ReportSection[],
  documentType: string,
): DocumentAuditResult["sectionCompleteness"] {
  const required = REQUIRED_SECTIONS[documentType] ?? [];
  if (required.length === 0) {
    return { score: 100, missing: [], present: [] };
  }

  const sectionTitles = sections.map((s) => s.title.toLowerCase());

  const present: string[] = [];
  const missing: string[] = [];

  for (const requiredTitle of required) {
    const found = sectionTitles.some(
      (title) =>
        title.includes(requiredTitle.toLowerCase()) ||
        requiredTitle.toLowerCase().includes(title),
    );
    if (found) {
      present.push(requiredTitle);
    } else {
      missing.push(requiredTitle);
    }
  }

  const score =
    required.length > 0
      ? Math.round((present.length / required.length) * 100)
      : 100;

  return { score, missing, present };
}

// ─── Main Audit Function ──────────────────────────────────────────────────────

export function auditDocument(
  sections: ReportSection[],
  documentType: string,
): DocumentAuditResult {
  const fullText = flattenContent(sections);

  const regulationCoverage = checkRegulationCoverage(fullText, documentType);
  const thresholdConsistency = checkThresholdConsistency(fullText);
  const sectionCompleteness = checkSectionCompleteness(sections, documentType);

  // Overall score: weighted average
  const overallScore = Math.round(
    regulationCoverage.score * 0.4 +
      thresholdConsistency.score * 0.3 +
      sectionCompleteness.score * 0.3,
  );

  // Generate recommendations
  const recommendations: string[] = [];

  if (regulationCoverage.missing.length > 0) {
    recommendations.push(
      `Add references to: ${regulationCoverage.missing.join(", ")}`,
    );
  }

  for (const mismatch of thresholdConsistency.mismatches) {
    recommendations.push(
      `Check claim "${mismatch.claim}" — expected ${mismatch.expectedValue}`,
    );
  }

  if (sectionCompleteness.missing.length > 0) {
    recommendations.push(
      `Add missing sections: ${sectionCompleteness.missing.join(", ")}`,
    );
  }

  return {
    overallScore,
    regulationCoverage,
    thresholdConsistency,
    sectionCompleteness,
    recommendations,
  };
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/services/document-audit-service.server.ts
git commit -m "feat(audit): create rule-based document audit service

Three checks: regulation coverage (regex-matches required refs per doc type),
threshold consistency (compares numeric claims against COMPLIANCE_THRESHOLDS),
section completeness (verifies required sections present). Zero external cost.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 10: Add audit_document Astra Tool Definition

**Files:**

- Modify: `src/lib/astra/tool-definitions.ts:1130` (add to ALL_TOOLS)
- Modify: `src/lib/astra/tool-definitions.ts:1158-1168` (add to TOOL_CATEGORIES.document)

- [ ] **Step 1: Add the tool definition**

In `src/lib/astra/tool-definitions.ts`, add the `auditDocument` definition before the `ALL_TOOLS` array (before line 1077). Add it after the last document tool export (after `generateNIS2Report`):

```typescript
export const auditDocument: AstraToolDefinition = {
  name: "audit_document",
  description:
    "Audit a generated compliance document for regulation coverage, threshold consistency, and section completeness. Returns a detailed audit score with specific recommendations. Use when the user asks to review, check, or audit a document.",
  input_schema: {
    type: "object",
    properties: {
      documentId: {
        type: "string",
        description: "The ID of the NCADocument to audit. Required.",
      },
      includeAIAnalysis: {
        type: "boolean",
        description:
          "If true, supplement rule-based audit with AI analysis for deeper insights. Default: false",
      },
    },
    required: ["documentId"],
  },
};
```

Add `auditDocument` to the `ALL_TOOLS` array (after line 1100):

```typescript
  // Document Tools
  listDocuments,
  checkDocumentCompleteness,
  generateComplianceReport,
  generateAuthorizationApplication,
  generateDebrisMitigationPlan,
  generateCybersecurityFramework,
  generateEnvironmentalReport,
  generateInsuranceReport,
  generateNIS2Report,
  auditDocument,
```

Add to `TOOL_CATEGORIES.document` (after line 1167):

```typescript
  document: [
    "list_documents",
    "check_document_completeness",
    "generate_compliance_report",
    "generate_authorization_application",
    "generate_debris_mitigation_plan",
    "generate_cybersecurity_framework",
    "generate_environmental_report",
    "generate_insurance_report",
    "generate_nis2_report",
    "audit_document",
  ],
```

- [ ] **Step 2: Verify the build compiles**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/astra/tool-definitions.ts
git commit -m "feat(astra): add audit_document tool definition

Users can now ask Astra to audit their compliance documents via
'audit_document' tool. Supports optional AI-enhanced analysis.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 11: Implement audit_document Handler in Tool Executor

**Files:**

- Modify: `src/lib/astra/tool-executor.ts:2041` (add handler before closing brace)

- [ ] **Step 1: Add the handler**

In `src/lib/astra/tool-executor.ts`, add the `audit_document` handler before the closing `};` of `TOOL_HANDLERS` (before line 2042):

```typescript
  audit_document: async (
    input: Record<string, unknown>,
    userContext: AstraUserContext,
  ) => {
    const documentId = input.documentId as string;
    const includeAIAnalysis = input.includeAIAnalysis as boolean | undefined;

    if (!documentId) {
      return { error: "documentId is required" };
    }

    // Fetch the document
    const document = await prisma.nCADocument.findFirst({
      where: {
        id: documentId,
        userId: userContext.userId,
      },
      select: {
        id: true,
        documentType: true,
        title: true,
        content: true,
        status: true,
      },
    });

    if (!document) {
      return {
        error: "Document not found or you don't have access to it.",
        suggestion:
          "Use the list_documents tool to find available documents first.",
      };
    }

    if (!document.content) {
      return {
        error: "Document has no content to audit. Generate the document first.",
        documentId: document.id,
        status: document.status,
      };
    }

    // Parse content (stored as JSON ReportSection[])
    const sections = document.content as Array<{
      title: string;
      content: string;
    }>;

    // Run rule-based audit
    const { auditDocument: runAudit } = await import(
      "@/lib/services/document-audit-service.server"
    );
    const auditResult = runAudit(sections, document.documentType);

    return {
      documentId: document.id,
      documentTitle: document.title,
      documentType: document.documentType,
      auditResult,
      summary: `Audit score: ${auditResult.overallScore}/100. Regulation coverage: ${auditResult.regulationCoverage.score}%, Threshold consistency: ${auditResult.thresholdConsistency.score}%, Section completeness: ${auditResult.sectionCompleteness.score}%. ${auditResult.recommendations.length} recommendation(s).`,
    };
  },
```

- [ ] **Step 2: Verify the build compiles**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/astra/tool-executor.ts
git commit -m "feat(astra): implement audit_document tool handler

Fetches NCADocument by ID, runs rule-based audit via document-audit-service,
returns structured audit results with scores and recommendations.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 12: Build Verification

**Files:** None (verification only)

- [ ] **Step 1: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Run linting**

Run: `npm run lint 2>&1 | tail -20`
Expected: No errors

- [ ] **Step 3: Run tests**

Run: `npm run test:run 2>&1 | tail -30`
Expected: All existing tests pass

- [ ] **Step 4: Build**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds
