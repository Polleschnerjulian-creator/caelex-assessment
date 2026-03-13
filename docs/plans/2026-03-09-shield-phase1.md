# CAELEX SHIELD Phase 1 — Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build Shield's data foundation — Prisma schema, Space-Track client, core engine (risk classifier, Pc trend, conjunction tracker), CDM polling cron, and basic API routes.

**Architecture:** Shield is a new top-level subsystem alongside Ephemeris. Phase 1 creates the data pipeline: Space-Track CDMs are fetched by cron, parsed, classified by risk, and stored as ConjunctionEvents with full CDM audit trail. Basic API routes expose events to the frontend (built in Phase 2).

**Tech Stack:** Prisma 5 (PostgreSQL), Zod validation, Node.js crypto, Vitest (TDD), Next.js App Router API routes, Vercel cron

**Design doc:** `docs/plans/2026-03-09-shield-design.md`

---

### Task 1: Prisma Schema — Shield Models

**Files:**

- Modify: `prisma/schema.prisma`

**Step 1: Add enums**

Add before the Shield models section (after existing enums, around line 6360+):

```prisma
// ============================================================
// SHIELD — Conjunction Assessment & Collision Avoidance
// ============================================================

enum ConjunctionStatus {
  NEW
  MONITORING
  ASSESSMENT_REQUIRED
  DECISION_MADE
  MANEUVER_PLANNED
  MANEUVER_EXECUTED
  MANEUVER_VERIFIED
  CLOSED
}

enum RiskTier {
  EMERGENCY
  HIGH
  ELEVATED
  MONITOR
  INFORMATIONAL
}

enum CADecision {
  MANEUVER
  ACCEPT_RISK
  MONITOR
  COORDINATE
}
```

**Step 2: Add ConjunctionEvent model**

```prisma
model ConjunctionEvent {
  id                  String              @id @default(cuid())
  organizationId      String
  spacecraftId        String
  noradId             String
  threatNoradId       String
  threatObjectName    String?
  threatObjectType    String
  conjunctionId       String
  status              ConjunctionStatus   @default(NEW)
  riskTier            RiskTier

  peakPc              Float
  peakPcAt            DateTime
  latestPc            Float
  latestMissDistance  Float
  tca                 DateTime
  relativeSpeed       Float?

  decision            CADecision?
  decisionBy          String?
  decisionAt          DateTime?
  decisionRationale   String?             @db.Text

  maneuverPlan        Json?
  maneuverExecutedAt  DateTime?
  maneuverVerified    Boolean             @default(false)
  fuelConsumedPct     Float?

  ncaNotified         Boolean             @default(false)
  ncaNotifiedAt       DateTime?
  reportGenerated     Boolean             @default(false)
  verityAttestationId String?

  closedAt            DateTime?
  closedReason        String?
  createdAt           DateTime            @default(now())
  updatedAt           DateTime            @updatedAt

  organization        Organization        @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  cdmRecords          CDMRecord[]
  escalationLog       CAEscalationLog[]

  @@unique([organizationId, conjunctionId])
  @@index([organizationId, status])
  @@index([spacecraftId, status])
  @@index([noradId, tca])
  @@index([riskTier, status])
  @@index([tca])
}
```

**Step 3: Add CDMRecord model**

```prisma
model CDMRecord {
  id                    String            @id @default(cuid())
  conjunctionEventId    String
  cdmId                 String            @unique
  creationDate          DateTime
  tca                   DateTime
  missDistance           Float
  relativeSpeed         Float?
  collisionProbability  Float
  probabilityMethod     String?

  sat1StateVector       Json?
  sat1Covariance        Json?
  sat2StateVector       Json?
  sat2Covariance        Json?
  sat2Maneuverable      String?

  rawCdm                Json
  riskTier              RiskTier
  createdAt             DateTime          @default(now())

  conjunctionEvent      ConjunctionEvent  @relation(fields: [conjunctionEventId], references: [id], onDelete: Cascade)

  @@index([conjunctionEventId, creationDate])
}
```

**Step 4: Add CAEscalationLog model**

```prisma
model CAEscalationLog {
  id                    String            @id @default(cuid())
  conjunctionEventId    String
  previousTier          RiskTier
  newTier               RiskTier
  previousStatus        ConjunctionStatus
  newStatus             ConjunctionStatus
  triggeredBy           String
  details               String?
  createdAt             DateTime          @default(now())

  conjunctionEvent      ConjunctionEvent  @relation(fields: [conjunctionEventId], references: [id], onDelete: Cascade)

  @@index([conjunctionEventId, createdAt])
}
```

**Step 5: Add CAConfig model**

```prisma
model CAConfig {
  id                    String            @id @default(cuid())
  organizationId        String            @unique

  emergencyPcThreshold  Float             @default(0.001)
  highPcThreshold       Float             @default(0.0001)
  elevatedPcThreshold   Float             @default(0.00001)
  monitorPcThreshold    Float             @default(0.0000001)

  notifyOnTier          RiskTier          @default(HIGH)
  emergencyEmailAll     Boolean           @default(true)

  autoCloseAfterTcaHours Int              @default(24)

  ncaAutoNotify         Boolean           @default(false)
  ncaJurisdiction       String?

  defaultAssigneeId     String?

  createdAt             DateTime          @default(now())
  updatedAt             DateTime          @updatedAt

  organization          Organization      @relation(fields: [organizationId], references: [id], onDelete: Cascade)
}
```

**Step 6: Add relation fields to Organization model**

Find the Organization model (around line 2444) and add these two lines in the relations section (around line 2589, before closing `}`):

```prisma
  conjunctionEvents     ConjunctionEvent[]
  caConfig              CAConfig?
```

**Step 7: Generate and push**

Run: `npx prisma generate && npx prisma db push`
Expected: No errors, Prisma client regenerated with new models.

**Step 8: Verify typecheck**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No new type errors from schema changes.

**Step 9: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(shield): add Prisma schema — ConjunctionEvent, CDMRecord, CAEscalationLog, CAConfig"
```

---

### Task 2: Shield Types

**Files:**

- Create: `src/lib/shield/types.ts`

**Step 1: Create types file**

```typescript
/**
 * SHIELD — Conjunction Assessment & Collision Avoidance
 * Type definitions for the Shield subsystem.
 */

// Re-export Prisma enums for convenience
export type { ConjunctionStatus, RiskTier, CADecision } from "@prisma/client";

// ─── Space-Track CDM ─────────────────────────────────────────────────────────

/** Raw CDM record from Space-Track API */
export interface SpaceTrackCDM {
  CDM_ID: string;
  CREATION_DATE: string;
  TCA: string;
  MIN_RNG: string; // km — convert to meters internally
  PC: string; // collision probability as string
  PC_METHOD: string | null;
  SAT_1_ID: string;
  SAT_1_NAME: string;
  SAT1_OBJECT_TYPE: string;
  SAT_1_RCS: string | null;
  SAT_2_ID: string;
  SAT_2_NAME: string;
  SAT2_OBJECT_TYPE: string;
  SAT_2_RCS: string | null;
  RELATIVE_SPEED: string | null; // km/s
  SAT2_MANEUVERABLE: string | null; // YES, NO, N/A
  // State vectors (optional, may not be in public CDM)
  SAT_1_X?: string;
  SAT_1_Y?: string;
  SAT_1_Z?: string;
  SAT_1_X_DOT?: string;
  SAT_1_Y_DOT?: string;
  SAT_1_Z_DOT?: string;
  SAT_2_X?: string;
  SAT_2_Y?: string;
  SAT_2_Z?: string;
  SAT_2_X_DOT?: string;
  SAT_2_Y_DOT?: string;
  SAT_2_Z_DOT?: string;
}

/** Parsed CDM in canonical Caelex format */
export interface ParsedCDM {
  cdmId: string;
  creationDate: Date;
  tca: Date;
  missDistanceMeters: number;
  collisionProbability: number;
  probabilityMethod: string | null;
  relativeSpeedMs: number | null;
  sat1NoradId: string;
  sat1Name: string;
  sat1ObjectType: string;
  sat2NoradId: string;
  sat2Name: string;
  sat2ObjectType: string;
  sat2Maneuverable: string | null;
  rawCdm: SpaceTrackCDM;
}

// ─── Pc Trend ────────────────────────────────────────────────────────────────

export type PcTrendDirection =
  | "INCREASING"
  | "DECREASING"
  | "STABLE"
  | "VOLATILE";

export interface PcTrend {
  direction: PcTrendDirection;
  slope: number; // Pc change per day on log10 scale
  confidence: number; // R² of linear fit
  projectedPcAtTca: number;
  dataPoints: number;
  history: Array<{ timestamp: Date; pc: number; missDistance: number }>;
}

// ─── Risk Classification ─────────────────────────────────────────────────────

export interface RiskThresholds {
  emergencyPc: number;
  highPc: number;
  elevatedPc: number;
  monitorPc: number;
  emergencyMiss: number; // meters
  highMiss: number;
  elevatedMiss: number;
  monitorMiss: number;
}

export const DEFAULT_THRESHOLDS: RiskThresholds = {
  emergencyPc: 1e-3,
  highPc: 1e-4,
  elevatedPc: 1e-5,
  monitorPc: 1e-7,
  emergencyMiss: 100,
  highMiss: 500,
  elevatedMiss: 1000,
  monitorMiss: 5000,
};

// ─── Conjunction Tracker ─────────────────────────────────────────────────────

export interface EscalationResult {
  tierChanged: boolean;
  statusChanged: boolean;
  previousTier: import("@prisma/client").RiskTier;
  newTier: import("@prisma/client").RiskTier;
  previousStatus: import("@prisma/client").ConjunctionStatus;
  newStatus: import("@prisma/client").ConjunctionStatus;
  trigger: string;
}

// ─── CDM Polling ─────────────────────────────────────────────────────────────

export interface CDMPollingResult {
  cdmsProcessed: number;
  newEvents: number;
  updatedEvents: number;
  escalations: number;
  autoClosures: number;
  errors: string[];
  durationMs: number;
}

// ─── API Responses ───────────────────────────────────────────────────────────

export interface ShieldStats {
  activeEvents: number;
  emergencyCount: number;
  highCount: number;
  elevatedCount: number;
  monitorCount: number;
  overdueDecisions: number;
  lastPollAt: string | null;
}
```

**Step 2: Commit**

```bash
git add src/lib/shield/types.ts
git commit -m "feat(shield): add TypeScript types for Shield subsystem"
```

---

### Task 3: Risk Classifier (TDD)

**Files:**

- Create: `tests/unit/shield/risk-classifier.test.ts`
- Create: `src/lib/shield/risk-classifier.server.ts`

**Step 1: Write failing tests**

```typescript
/**
 * Shield Risk Classifier Tests
 */
import { describe, it, expect } from "vitest";
import { classifyRisk } from "@/lib/shield/risk-classifier.server";
import type { RiskThresholds } from "@/lib/shield/types";

describe("classifyRisk", () => {
  // ─── Pc-based classification ─────────────────────────────────────

  it("classifies Pc >= 1e-3 as EMERGENCY", () => {
    expect(classifyRisk(1e-3, 10000)).toBe("EMERGENCY");
    expect(classifyRisk(5e-3, 10000)).toBe("EMERGENCY");
  });

  it("classifies Pc >= 1e-4 as HIGH", () => {
    expect(classifyRisk(1e-4, 10000)).toBe("HIGH");
    expect(classifyRisk(5e-4, 10000)).toBe("HIGH");
  });

  it("classifies Pc >= 1e-5 as ELEVATED", () => {
    expect(classifyRisk(1e-5, 10000)).toBe("ELEVATED");
    expect(classifyRisk(5e-5, 10000)).toBe("ELEVATED");
  });

  it("classifies Pc >= 1e-7 as MONITOR", () => {
    expect(classifyRisk(1e-7, 10000)).toBe("MONITOR");
    expect(classifyRisk(5e-6, 10000)).toBe("MONITOR");
  });

  it("classifies Pc < 1e-7 as INFORMATIONAL", () => {
    expect(classifyRisk(1e-8, 10000)).toBe("INFORMATIONAL");
    expect(classifyRisk(1e-10, 10000)).toBe("INFORMATIONAL");
  });

  // ─── Miss distance override ──────────────────────────────────────

  it("miss < 100m overrides to EMERGENCY regardless of Pc", () => {
    expect(classifyRisk(1e-8, 80)).toBe("EMERGENCY");
  });

  it("miss < 500m overrides to at least HIGH", () => {
    expect(classifyRisk(1e-8, 300)).toBe("HIGH");
  });

  it("miss < 1000m overrides to at least ELEVATED", () => {
    expect(classifyRisk(1e-8, 800)).toBe("ELEVATED");
  });

  it("miss < 5000m overrides to at least MONITOR", () => {
    expect(classifyRisk(1e-10, 4000)).toBe("MONITOR");
  });

  // ─── Combined: takes the higher tier ─────────────────────────────

  it("Pc=5e-4 miss=80m → EMERGENCY (miss wins)", () => {
    expect(classifyRisk(5e-4, 80)).toBe("EMERGENCY");
  });

  it("Pc=1e-3 miss=10000m → EMERGENCY (Pc wins)", () => {
    expect(classifyRisk(1e-3, 10000)).toBe("EMERGENCY");
  });

  // ─── Custom thresholds ───────────────────────────────────────────

  it("uses custom thresholds from CAConfig when provided", () => {
    const custom: RiskThresholds = {
      emergencyPc: 1e-2, // More lenient
      highPc: 1e-3,
      elevatedPc: 1e-4,
      monitorPc: 1e-6,
      emergencyMiss: 50,
      highMiss: 200,
      elevatedMiss: 500,
      monitorMiss: 2000,
    };

    // 1e-3 would be EMERGENCY with defaults, but HIGH with custom
    expect(classifyRisk(1e-3, 10000, custom)).toBe("HIGH");
  });

  // ─── Edge cases ──────────────────────────────────────────────────

  it("Pc = 0 and large miss → INFORMATIONAL", () => {
    expect(classifyRisk(0, 100000)).toBe("INFORMATIONAL");
  });

  it("handles very small Pc values", () => {
    expect(classifyRisk(1e-20, 100000)).toBe("INFORMATIONAL");
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/shield/risk-classifier.test.ts`
Expected: FAIL — module not found

**Step 3: Implement risk classifier**

```typescript
import "server-only";
import type { RiskTier } from "@prisma/client";
import { DEFAULT_THRESHOLDS, type RiskThresholds } from "./types";

/**
 * Classify collision risk from Pc (collision probability) and miss distance.
 * Takes the HIGHER tier between Pc-based and miss-distance-based classification.
 * Optionally accepts org-specific thresholds from CAConfig.
 */
export function classifyRisk(
  pc: number,
  missDistanceMeters: number,
  thresholds?: RiskThresholds,
): RiskTier {
  const t = thresholds ?? DEFAULT_THRESHOLDS;

  const pcTier = classifyByPc(pc, t);
  const missTier = classifyByMissDistance(missDistanceMeters, t);

  // Return the higher (more severe) tier
  return TIER_RANK[pcTier] >= TIER_RANK[missTier] ? pcTier : missTier;
}

/**
 * Build RiskThresholds from a CAConfig record (Prisma model).
 */
export function thresholdsFromConfig(config: {
  emergencyPcThreshold: number;
  highPcThreshold: number;
  elevatedPcThreshold: number;
  monitorPcThreshold: number;
}): RiskThresholds {
  return {
    emergencyPc: config.emergencyPcThreshold,
    highPc: config.highPcThreshold,
    elevatedPc: config.elevatedPcThreshold,
    monitorPc: config.monitorPcThreshold,
    // Miss distance thresholds are not configurable per org (use defaults)
    emergencyMiss: DEFAULT_THRESHOLDS.emergencyMiss,
    highMiss: DEFAULT_THRESHOLDS.highMiss,
    elevatedMiss: DEFAULT_THRESHOLDS.elevatedMiss,
    monitorMiss: DEFAULT_THRESHOLDS.monitorMiss,
  };
}

// ─── Internal ────────────────────────────────────────────────────────────────

const TIER_RANK: Record<RiskTier, number> = {
  EMERGENCY: 5,
  HIGH: 4,
  ELEVATED: 3,
  MONITOR: 2,
  INFORMATIONAL: 1,
};

export { TIER_RANK };

function classifyByPc(pc: number, t: RiskThresholds): RiskTier {
  if (pc >= t.emergencyPc) return "EMERGENCY";
  if (pc >= t.highPc) return "HIGH";
  if (pc >= t.elevatedPc) return "ELEVATED";
  if (pc >= t.monitorPc) return "MONITOR";
  return "INFORMATIONAL";
}

function classifyByMissDistance(meters: number, t: RiskThresholds): RiskTier {
  if (meters < t.emergencyMiss) return "EMERGENCY";
  if (meters < t.highMiss) return "HIGH";
  if (meters < t.elevatedMiss) return "ELEVATED";
  if (meters < t.monitorMiss) return "MONITOR";
  return "INFORMATIONAL";
}
```

**Step 4: Add `server-only` mock for tests**

The test needs to mock `server-only`. Add to the test file at the top (after imports):

```typescript
import { vi } from "vitest";
vi.mock("server-only", () => ({}));
```

**Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/unit/shield/risk-classifier.test.ts`
Expected: All 13 tests PASS

**Step 6: Commit**

```bash
git add tests/unit/shield/risk-classifier.test.ts src/lib/shield/risk-classifier.server.ts
git commit -m "feat(shield): add risk classifier with TDD — Pc + miss distance → RiskTier"
```

---

### Task 4: Pc Trend Analyzer (TDD)

**Files:**

- Create: `tests/unit/shield/pc-trend.test.ts`
- Create: `src/lib/shield/pc-trend.server.ts`

**Step 1: Write failing tests**

```typescript
/**
 * Shield Pc Trend Analyzer Tests
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { analyzePcTrend } from "@/lib/shield/pc-trend.server";

// Helper: create mock CDM records with given Pc values over time
function makeCDMs(
  pcValues: number[],
  intervalHours: number = 6,
  tcaDate?: Date,
): Array<{
  creationDate: Date;
  tca: Date;
  collisionProbability: number;
  missDistance: number;
}> {
  const tca = tcaDate ?? new Date("2026-03-15T12:00:00Z");
  const baseTime = new Date("2026-03-10T00:00:00Z");
  return pcValues.map((pc, i) => ({
    creationDate: new Date(baseTime.getTime() + i * intervalHours * 3600000),
    tca,
    collisionProbability: pc,
    missDistance: 1000 / pc, // Inverse correlation for realism
  }));
}

describe("analyzePcTrend", () => {
  it("detects INCREASING trend with 3 rising CDMs", () => {
    const cdms = makeCDMs([1e-7, 1e-6, 1e-5]);
    const trend = analyzePcTrend(cdms);
    expect(trend.direction).toBe("INCREASING");
    expect(trend.slope).toBeGreaterThan(0);
    expect(trend.dataPoints).toBe(3);
  });

  it("detects DECREASING trend with 3 falling CDMs", () => {
    const cdms = makeCDMs([1e-4, 1e-5, 1e-6]);
    const trend = analyzePcTrend(cdms);
    expect(trend.direction).toBe("DECREASING");
    expect(trend.slope).toBeLessThan(0);
  });

  it("detects STABLE trend with similar CDMs", () => {
    const cdms = makeCDMs([1e-5, 1.1e-5, 0.9e-5, 1.05e-5, 0.95e-5]);
    const trend = analyzePcTrend(cdms);
    expect(trend.direction).toBe("STABLE");
    expect(Math.abs(trend.slope)).toBeLessThan(0.5);
  });

  it("detects VOLATILE trend with oscillating CDMs", () => {
    const cdms = makeCDMs([1e-7, 1e-4, 1e-8, 1e-3, 1e-7]);
    const trend = analyzePcTrend(cdms);
    expect(trend.direction).toBe("VOLATILE");
    expect(trend.confidence).toBeLessThan(0.3);
  });

  it("returns STABLE with low confidence for single CDM", () => {
    const cdms = makeCDMs([1e-5]);
    const trend = analyzePcTrend(cdms);
    expect(trend.direction).toBe("STABLE");
    expect(trend.confidence).toBe(0);
    expect(trend.dataPoints).toBe(1);
  });

  it("projects Pc at TCA using trend extrapolation", () => {
    // Steadily increasing Pc
    const cdms = makeCDMs([1e-7, 1e-6, 1e-5]);
    const trend = analyzePcTrend(cdms);
    expect(trend.projectedPcAtTca).toBeGreaterThan(1e-5);
  });

  it("includes history array with all data points", () => {
    const cdms = makeCDMs([1e-7, 1e-6, 1e-5]);
    const trend = analyzePcTrend(cdms);
    expect(trend.history).toHaveLength(3);
    expect(trend.history[0]).toHaveProperty("timestamp");
    expect(trend.history[0]).toHaveProperty("pc");
    expect(trend.history[0]).toHaveProperty("missDistance");
  });

  it("handles two CDMs (minimum for regression)", () => {
    const cdms = makeCDMs([1e-7, 1e-5]);
    const trend = analyzePcTrend(cdms);
    expect(trend.direction).toBe("INCREASING");
    expect(trend.dataPoints).toBe(2);
    // R² is always 1.0 for exactly 2 points
    expect(trend.confidence).toBe(1);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/shield/pc-trend.test.ts`
Expected: FAIL — module not found

**Step 3: Implement Pc trend analyzer**

```typescript
import "server-only";
import type { PcTrend, PcTrendDirection } from "./types";

interface CDMInput {
  creationDate: Date;
  tca: Date;
  collisionProbability: number;
  missDistance: number;
}

/**
 * Analyze collision probability trend across sequential CDMs.
 * Uses linear regression on log10(Pc) vs time (days).
 *
 * Direction classification:
 *   |slope| < 0.5/day AND R² irrelevant → STABLE
 *   slope > 0.5/day AND R² > 0.5 → INCREASING
 *   slope < -0.5/day AND R² > 0.5 → DECREASING
 *   R² < 0.3 (with significant slope) → VOLATILE
 */
export function analyzePcTrend(cdms: CDMInput[]): PcTrend {
  // Sort by creation date ascending
  const sorted = [...cdms].sort(
    (a, b) => a.creationDate.getTime() - b.creationDate.getTime(),
  );

  const history = sorted.map((c) => ({
    timestamp: c.creationDate,
    pc: c.collisionProbability,
    missDistance: c.missDistance,
  }));

  // Single CDM — no trend possible
  if (sorted.length < 2) {
    const pc = sorted[0]?.collisionProbability ?? 0;
    return {
      direction: "STABLE",
      slope: 0,
      confidence: 0,
      projectedPcAtTca: pc,
      dataPoints: sorted.length,
      history,
    };
  }

  // Convert to regression inputs: x = days from first CDM, y = log10(Pc)
  const t0 = sorted[0]!.creationDate.getTime();
  const tca = sorted[0]!.tca.getTime();

  const xs: number[] = [];
  const ys: number[] = [];

  for (const cdm of sorted) {
    const daysSinceFirst =
      (cdm.creationDate.getTime() - t0) / (24 * 3600 * 1000);
    const logPc = Math.log10(Math.max(cdm.collisionProbability, 1e-30));
    xs.push(daysSinceFirst);
    ys.push(logPc);
  }

  // Linear regression: y = slope * x + intercept
  const { slope, intercept, rSquared } = linearRegression(xs, ys);

  // Classify direction
  const direction = classifyDirection(slope, rSquared);

  // Project Pc at TCA
  const daysToTca = (tca - t0) / (24 * 3600 * 1000);
  const projectedLogPc = slope * daysToTca + intercept;
  const projectedPcAtTca = Math.pow(10, projectedLogPc);

  return {
    direction,
    slope,
    confidence: rSquared,
    projectedPcAtTca: Math.min(projectedPcAtTca, 1), // Cap at 1
    dataPoints: sorted.length,
    history,
  };
}

// ─── Internal ────────────────────────────────────────────────────────────────

function classifyDirection(slope: number, rSquared: number): PcTrendDirection {
  const SLOPE_THRESHOLD = 0.5; // log10(Pc) change per day
  const R2_THRESHOLD = 0.3;

  if (Math.abs(slope) < SLOPE_THRESHOLD) return "STABLE";
  if (rSquared < R2_THRESHOLD) return "VOLATILE";
  return slope > 0 ? "INCREASING" : "DECREASING";
}

function linearRegression(
  xs: number[],
  ys: number[],
): { slope: number; intercept: number; rSquared: number } {
  const n = xs.length;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  let sumYY = 0;

  for (let i = 0; i < n; i++) {
    sumX += xs[i]!;
    sumY += ys[i]!;
    sumXY += xs[i]! * ys[i]!;
    sumXX += xs[i]! * xs[i]!;
    sumYY += ys[i]! * ys[i]!;
  }

  const denom = n * sumXX - sumX * sumX;
  if (Math.abs(denom) < 1e-15) {
    // All x-values identical (shouldn't happen with real timestamps)
    return { slope: 0, intercept: sumY / n, rSquared: 0 };
  }

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // R² = 1 - SS_res / SS_tot
  const meanY = sumY / n;
  let ssTot = 0;
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * xs[i]! + intercept;
    ssRes += (ys[i]! - predicted) ** 2;
    ssTot += (ys[i]! - meanY) ** 2;
  }

  const rSquared = ssTot < 1e-15 ? 1 : Math.max(0, 1 - ssRes / ssTot);

  return { slope, intercept, rSquared };
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/shield/pc-trend.test.ts`
Expected: All 8 tests PASS

**Step 5: Commit**

```bash
git add tests/unit/shield/pc-trend.test.ts src/lib/shield/pc-trend.server.ts
git commit -m "feat(shield): add Pc trend analyzer with TDD — log10 regression + direction classification"
```

---

### Task 5: Conjunction Tracker — State Machine (TDD)

**Files:**

- Create: `tests/unit/shield/conjunction-tracker.test.ts`
- Create: `src/lib/shield/conjunction-tracker.server.ts`

**Step 1: Write failing tests**

```typescript
/**
 * Shield Conjunction Tracker Tests — Event lifecycle state machine
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  computeNextStatus,
  shouldAutoEscalate,
  shouldAutoClose,
} from "@/lib/shield/conjunction-tracker.server";
import type { ConjunctionStatus, RiskTier } from "@prisma/client";

describe("computeNextStatus", () => {
  // ─── NEW transitions ─────────────────────────────────────────────

  it("NEW + MONITOR tier → MONITORING", () => {
    expect(computeNextStatus("NEW", "MONITOR")).toBe("MONITORING");
  });

  it("NEW + INFORMATIONAL tier → MONITORING", () => {
    expect(computeNextStatus("NEW", "INFORMATIONAL")).toBe("MONITORING");
  });

  it("NEW + ELEVATED tier → ASSESSMENT_REQUIRED", () => {
    expect(computeNextStatus("NEW", "ELEVATED")).toBe("ASSESSMENT_REQUIRED");
  });

  it("NEW + HIGH tier → ASSESSMENT_REQUIRED", () => {
    expect(computeNextStatus("NEW", "HIGH")).toBe("ASSESSMENT_REQUIRED");
  });

  it("NEW + EMERGENCY tier → ASSESSMENT_REQUIRED", () => {
    expect(computeNextStatus("NEW", "EMERGENCY")).toBe("ASSESSMENT_REQUIRED");
  });

  // ─── MONITORING escalation ───────────────────────────────────────

  it("MONITORING + tier escalates to ELEVATED → ASSESSMENT_REQUIRED", () => {
    expect(computeNextStatus("MONITORING", "ELEVATED")).toBe(
      "ASSESSMENT_REQUIRED",
    );
  });

  it("MONITORING + tier stays MONITOR → MONITORING (no change)", () => {
    expect(computeNextStatus("MONITORING", "MONITOR")).toBe("MONITORING");
  });

  // ─── ASSESSMENT_REQUIRED de-escalation ────────────────────────────

  it("ASSESSMENT_REQUIRED + tier drops to MONITOR → stays ASSESSMENT_REQUIRED", () => {
    expect(computeNextStatus("ASSESSMENT_REQUIRED", "MONITOR")).toBe(
      "ASSESSMENT_REQUIRED",
    );
  });

  it("ASSESSMENT_REQUIRED + tier drops to INFORMATIONAL → stays ASSESSMENT_REQUIRED", () => {
    expect(computeNextStatus("ASSESSMENT_REQUIRED", "INFORMATIONAL")).toBe(
      "ASSESSMENT_REQUIRED",
    );
  });

  // ─── Already decided — status locked ─────────────────────────────

  it("DECISION_MADE + any tier → stays DECISION_MADE", () => {
    expect(computeNextStatus("DECISION_MADE", "EMERGENCY")).toBe(
      "DECISION_MADE",
    );
  });

  it("MANEUVER_PLANNED + any tier → stays MANEUVER_PLANNED", () => {
    expect(computeNextStatus("MANEUVER_PLANNED", "MONITOR")).toBe(
      "MANEUVER_PLANNED",
    );
  });

  it("CLOSED + any tier → stays CLOSED", () => {
    expect(computeNextStatus("CLOSED", "EMERGENCY")).toBe("CLOSED");
  });
});

describe("shouldAutoEscalate", () => {
  it("returns true when TCA < 24h AND tier >= ELEVATED AND status < ASSESSMENT_REQUIRED", () => {
    const tca = new Date(Date.now() + 12 * 3600 * 1000); // 12h from now
    expect(shouldAutoEscalate("MONITORING", "ELEVATED", tca)).toBe(true);
  });

  it("returns true when TCA < 24h AND tier >= HIGH AND status is MONITORING", () => {
    const tca = new Date(Date.now() + 6 * 3600 * 1000); // 6h
    expect(shouldAutoEscalate("MONITORING", "HIGH", tca)).toBe(true);
  });

  it("returns false when TCA > 24h", () => {
    const tca = new Date(Date.now() + 48 * 3600 * 1000); // 48h
    expect(shouldAutoEscalate("MONITORING", "ELEVATED", tca)).toBe(false);
  });

  it("returns false when already at ASSESSMENT_REQUIRED", () => {
    const tca = new Date(Date.now() + 6 * 3600 * 1000);
    expect(shouldAutoEscalate("ASSESSMENT_REQUIRED", "HIGH", tca)).toBe(false);
  });

  it("returns false when tier is MONITOR", () => {
    const tca = new Date(Date.now() + 6 * 3600 * 1000);
    expect(shouldAutoEscalate("MONITORING", "MONITOR", tca)).toBe(false);
  });
});

describe("shouldAutoClose", () => {
  it("returns true when TCA passed + autoCloseHours elapsed + not EMERGENCY", () => {
    const tcaPast = new Date(Date.now() - 48 * 3600 * 1000); // 48h ago
    expect(shouldAutoClose("MONITORING", "MONITOR", tcaPast, 24)).toBe(true);
  });

  it("returns false when TCA has not passed", () => {
    const tcaFuture = new Date(Date.now() + 24 * 3600 * 1000);
    expect(shouldAutoClose("MONITORING", "MONITOR", tcaFuture, 24)).toBe(false);
  });

  it("returns false when TCA passed but within autoCloseHours", () => {
    const tcaRecent = new Date(Date.now() - 6 * 3600 * 1000); // 6h ago
    expect(shouldAutoClose("MONITORING", "MONITOR", tcaRecent, 24)).toBe(false);
  });

  it("returns false for EMERGENCY tier even if TCA passed", () => {
    const tcaPast = new Date(Date.now() - 48 * 3600 * 1000);
    expect(shouldAutoClose("MONITORING", "EMERGENCY", tcaPast, 24)).toBe(false);
  });

  it("returns false for already CLOSED events", () => {
    const tcaPast = new Date(Date.now() - 48 * 3600 * 1000);
    expect(shouldAutoClose("CLOSED", "MONITOR", tcaPast, 24)).toBe(false);
  });

  it("returns false for DECISION_MADE or later statuses", () => {
    const tcaPast = new Date(Date.now() - 48 * 3600 * 1000);
    expect(shouldAutoClose("DECISION_MADE", "MONITOR", tcaPast, 24)).toBe(
      false,
    );
    expect(shouldAutoClose("MANEUVER_PLANNED", "MONITOR", tcaPast, 24)).toBe(
      false,
    );
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/shield/conjunction-tracker.test.ts`
Expected: FAIL — module not found

**Step 3: Implement conjunction tracker**

```typescript
import "server-only";
import type { ConjunctionStatus, RiskTier } from "@prisma/client";
import { TIER_RANK } from "./risk-classifier.server";

// Status ranks for ordering (higher = further in lifecycle)
const STATUS_RANK: Record<ConjunctionStatus, number> = {
  NEW: 0,
  MONITORING: 1,
  ASSESSMENT_REQUIRED: 2,
  DECISION_MADE: 3,
  MANEUVER_PLANNED: 4,
  MANEUVER_EXECUTED: 5,
  MANEUVER_VERIFIED: 6,
  CLOSED: 7,
};

/**
 * Determine the next status for a conjunction event given its current status
 * and the newly classified risk tier.
 *
 * Rules:
 * - Once at DECISION_MADE or beyond, tier changes don't affect status
 * - Once at ASSESSMENT_REQUIRED, status never goes below that (no de-escalation)
 * - NEW → MONITORING for low tiers, ASSESSMENT_REQUIRED for ELEVATED+
 * - MONITORING → ASSESSMENT_REQUIRED on escalation to ELEVATED+
 */
export function computeNextStatus(
  currentStatus: ConjunctionStatus,
  newTier: RiskTier,
): ConjunctionStatus {
  // Locked statuses — once past ASSESSMENT_REQUIRED, tier changes don't matter
  if (STATUS_RANK[currentStatus] >= STATUS_RANK["DECISION_MADE"]) {
    return currentStatus;
  }

  // ASSESSMENT_REQUIRED is sticky — never goes back below
  if (currentStatus === "ASSESSMENT_REQUIRED") {
    return "ASSESSMENT_REQUIRED";
  }

  // Determine if tier requires assessment
  const requiresAssessment = TIER_RANK[newTier] >= TIER_RANK["ELEVATED"];

  if (currentStatus === "NEW") {
    return requiresAssessment ? "ASSESSMENT_REQUIRED" : "MONITORING";
  }

  // MONITORING → check for escalation
  if (currentStatus === "MONITORING") {
    return requiresAssessment ? "ASSESSMENT_REQUIRED" : "MONITORING";
  }

  return currentStatus;
}

/**
 * Check if an event should be auto-escalated to ASSESSMENT_REQUIRED.
 * Triggers when: TCA < 24h AND tier >= ELEVATED AND status < ASSESSMENT_REQUIRED.
 */
export function shouldAutoEscalate(
  currentStatus: ConjunctionStatus,
  currentTier: RiskTier,
  tca: Date,
): boolean {
  // Only escalate if below ASSESSMENT_REQUIRED
  if (STATUS_RANK[currentStatus] >= STATUS_RANK["ASSESSMENT_REQUIRED"]) {
    return false;
  }

  // Only for ELEVATED+ tiers
  if (TIER_RANK[currentTier] < TIER_RANK["ELEVATED"]) {
    return false;
  }

  // TCA must be within 24 hours
  const hoursToTca = (tca.getTime() - Date.now()) / (3600 * 1000);
  return hoursToTca > 0 && hoursToTca < 24;
}

/**
 * Check if an event should be auto-closed.
 * Triggers when: TCA passed + autoCloseHours elapsed + not EMERGENCY + status is MONITORING or NEW.
 */
export function shouldAutoClose(
  currentStatus: ConjunctionStatus,
  currentTier: RiskTier,
  tca: Date,
  autoCloseAfterTcaHours: number,
): boolean {
  // Don't close if already closed
  if (currentStatus === "CLOSED") return false;

  // Don't close if a decision has been made (needs manual closure)
  if (STATUS_RANK[currentStatus] >= STATUS_RANK["DECISION_MADE"]) return false;

  // Don't auto-close EMERGENCY events
  if (currentTier === "EMERGENCY") return false;

  // TCA must have passed
  const hoursSinceTca = (Date.now() - tca.getTime()) / (3600 * 1000);
  return hoursSinceTca >= autoCloseAfterTcaHours;
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/shield/conjunction-tracker.test.ts`
Expected: All 18 tests PASS

**Step 5: Commit**

```bash
git add tests/unit/shield/conjunction-tracker.test.ts src/lib/shield/conjunction-tracker.server.ts
git commit -m "feat(shield): add conjunction tracker state machine with TDD — lifecycle transitions + auto-escalation"
```

---

### Task 6: Space-Track CDM Parser (TDD)

**Files:**

- Create: `tests/unit/shield/space-track-parser.test.ts`
- Create: `src/lib/shield/space-track-client.server.ts`

**Step 1: Write failing tests for the parser**

```typescript
/**
 * Shield Space-Track CDM Parser Tests
 * Tests the pure parsing functions (no network calls).
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  parseCDM,
  parseSpaceTrackResponse,
} from "@/lib/shield/space-track-client.server";
import type { SpaceTrackCDM } from "@/lib/shield/types";

const SAMPLE_CDM: SpaceTrackCDM = {
  CDM_ID: "cdm-2026-001",
  CREATION_DATE: "2026-03-09T10:30:00",
  TCA: "2026-03-12T14:22:33",
  MIN_RNG: "0.127", // km
  PC: "4.1e-4",
  PC_METHOD: "FOSTER-1992",
  SAT_1_ID: "25544",
  SAT_1_NAME: "ISS (ZARYA)",
  SAT1_OBJECT_TYPE: "PAYLOAD",
  SAT_1_RCS: "400.0",
  SAT_2_ID: "99999",
  SAT_2_NAME: "COSMOS-2251 DEB",
  SAT2_OBJECT_TYPE: "DEBRIS",
  SAT_2_RCS: "0.5",
  RELATIVE_SPEED: "14.2", // km/s
  SAT2_MANEUVERABLE: "NO",
};

describe("parseCDM", () => {
  it("parses a valid Space-Track CDM into canonical format", () => {
    const result = parseCDM(SAMPLE_CDM);

    expect(result.cdmId).toBe("cdm-2026-001");
    expect(result.collisionProbability).toBeCloseTo(4.1e-4);
    expect(result.missDistanceMeters).toBeCloseTo(127); // 0.127 km → 127 m
    expect(result.relativeSpeedMs).toBeCloseTo(14200); // 14.2 km/s → 14200 m/s
    expect(result.sat1NoradId).toBe("25544");
    expect(result.sat1Name).toBe("ISS (ZARYA)");
    expect(result.sat2NoradId).toBe("99999");
    expect(result.sat2ObjectType).toBe("DEBRIS");
    expect(result.sat2Maneuverable).toBe("NO");
    expect(result.probabilityMethod).toBe("FOSTER-1992");
    expect(result.rawCdm).toEqual(SAMPLE_CDM);
  });

  it("converts MIN_RNG from km to meters", () => {
    const cdm = { ...SAMPLE_CDM, MIN_RNG: "1.5" }; // 1.5 km
    expect(parseCDM(cdm).missDistanceMeters).toBeCloseTo(1500);
  });

  it("converts RELATIVE_SPEED from km/s to m/s", () => {
    const cdm = { ...SAMPLE_CDM, RELATIVE_SPEED: "7.8" }; // 7.8 km/s
    expect(parseCDM(cdm).relativeSpeedMs).toBeCloseTo(7800);
  });

  it("handles null RELATIVE_SPEED", () => {
    const cdm = { ...SAMPLE_CDM, RELATIVE_SPEED: null };
    expect(parseCDM(cdm).relativeSpeedMs).toBeNull();
  });

  it("handles null PC_METHOD", () => {
    const cdm = { ...SAMPLE_CDM, PC_METHOD: null };
    expect(parseCDM(cdm).probabilityMethod).toBeNull();
  });

  it("parses scientific notation Pc strings", () => {
    expect(
      parseCDM({ ...SAMPLE_CDM, PC: "1.23e-7" }).collisionProbability,
    ).toBeCloseTo(1.23e-7);
    expect(
      parseCDM({ ...SAMPLE_CDM, PC: "0.001" }).collisionProbability,
    ).toBeCloseTo(0.001);
  });

  it("parses creation date and TCA as Date objects", () => {
    const result = parseCDM(SAMPLE_CDM);
    expect(result.creationDate).toBeInstanceOf(Date);
    expect(result.tca).toBeInstanceOf(Date);
    expect(result.creationDate.toISOString()).toContain("2026-03-09");
    expect(result.tca.toISOString()).toContain("2026-03-12");
  });
});

describe("parseSpaceTrackResponse", () => {
  it("parses an array of CDMs", () => {
    const response = [SAMPLE_CDM, { ...SAMPLE_CDM, CDM_ID: "cdm-002" }];
    const results = parseSpaceTrackResponse(response);
    expect(results).toHaveLength(2);
    expect(results[0]!.cdmId).toBe("cdm-2026-001");
    expect(results[1]!.cdmId).toBe("cdm-002");
  });

  it("returns empty array for empty response", () => {
    expect(parseSpaceTrackResponse([])).toEqual([]);
  });

  it("skips CDMs with invalid Pc (NaN)", () => {
    const bad = { ...SAMPLE_CDM, PC: "not-a-number" };
    const results = parseSpaceTrackResponse([SAMPLE_CDM, bad]);
    expect(results).toHaveLength(1);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/shield/space-track-parser.test.ts`
Expected: FAIL — module not found

**Step 3: Implement Space-Track client**

```typescript
import "server-only";
import { logger } from "@/lib/logger";
import type { SpaceTrackCDM, ParsedCDM } from "./types";

// ─── Configuration ───────────────────────────────────────────────────────────

const SPACETRACK_BASE = "https://www.space-track.org";
const SPACETRACK_LOGIN = `${SPACETRACK_BASE}/ajaxauth/login`;
const SPACETRACK_CDM_CLASS = `${SPACETRACK_BASE}/basicspacedata/query/class/cdm_public`;

const MAX_NORAD_IDS_PER_QUERY = 50;
const REQUEST_DELAY_MS = 2000; // 30 req/min → ~2s between requests

// ─── Session Management ─────────────────────────────────────────────────────

let sessionCookie: string | null = null;
let sessionExpiresAt: number = 0;

async function ensureSession(): Promise<string> {
  if (sessionCookie && Date.now() < sessionExpiresAt) {
    return sessionCookie;
  }

  const identity = process.env.SPACETRACK_IDENTITY;
  const password = process.env.SPACETRACK_PASSWORD;

  if (!identity || !password) {
    throw new Error("SPACETRACK_IDENTITY and SPACETRACK_PASSWORD must be set");
  }

  const response = await fetch(SPACETRACK_LOGIN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ identity, password }).toString(),
  });

  if (!response.ok) {
    throw new Error(`Space-Track login failed: ${response.status}`);
  }

  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) {
    throw new Error("Space-Track login did not return session cookie");
  }

  sessionCookie = setCookie.split(";")[0]!;
  sessionExpiresAt = Date.now() + 2 * 3600 * 1000; // 2 hour session

  return sessionCookie;
}

// ─── CDM Fetching ───────────────────────────────────────────────────────────

/**
 * Fetch CDMs from Space-Track for the given NORAD IDs.
 * Returns parsed CDMs sorted by creation date descending.
 * Batches IDs into groups of 50 to stay within URL limits.
 */
export async function fetchCDMs(
  noradIds: string[],
  sinceDays: number = 1,
): Promise<ParsedCDM[]> {
  if (noradIds.length === 0) return [];

  const enabled = process.env.SPACETRACK_ENABLED !== "false";
  if (!enabled) {
    logger.info(
      "[Shield] Space-Track polling disabled (SPACETRACK_ENABLED=false)",
    );
    return [];
  }

  const cookie = await ensureSession();
  const allCDMs: ParsedCDM[] = [];

  // Batch NORAD IDs
  for (let i = 0; i < noradIds.length; i += MAX_NORAD_IDS_PER_QUERY) {
    const batch = noradIds.slice(i, i + MAX_NORAD_IDS_PER_QUERY);
    const batchCDMs = await fetchCDMBatch(batch, sinceDays, cookie);
    allCDMs.push(...batchCDMs);

    // Rate limiting delay between batches
    if (i + MAX_NORAD_IDS_PER_QUERY < noradIds.length) {
      await delay(REQUEST_DELAY_MS);
    }
  }

  return allCDMs;
}

async function fetchCDMBatch(
  noradIds: string[],
  sinceDays: number,
  cookie: string,
): Promise<ParsedCDM[]> {
  const idList = noradIds.join(",");
  const sinceDate = new Date(Date.now() - sinceDays * 24 * 3600 * 1000)
    .toISOString()
    .split("T")[0];

  const url = `${SPACETRACK_CDM_CLASS}/SAT_1_ID/${idList}/CREATION_DATE/>${sinceDate}/orderby/CREATION_DATE desc/limit/500/format/json`;

  let retries = 0;
  const maxRetries = 3;

  while (retries <= maxRetries) {
    const response = await fetch(url, {
      headers: { Cookie: cookie },
    });

    if (response.status === 429) {
      // Rate limited — exponential backoff
      const waitMs = Math.min(1000 * Math.pow(2, retries), 30000);
      logger.warn(`[Shield] Space-Track rate limited, waiting ${waitMs}ms`);
      await delay(waitMs);
      retries++;
      continue;
    }

    if (response.status === 401) {
      // Session expired — re-authenticate
      sessionCookie = null;
      const newCookie = await ensureSession();
      return fetchCDMBatch(noradIds, sinceDays, newCookie);
    }

    if (!response.ok) {
      throw new Error(`Space-Track CDM fetch failed: ${response.status}`);
    }

    const data = (await response.json()) as SpaceTrackCDM[];
    return parseSpaceTrackResponse(data);
  }

  throw new Error("Space-Track CDM fetch failed after max retries");
}

// ─── CDM Parsing ────────────────────────────────────────────────────────────

/**
 * Parse a single Space-Track CDM into canonical Caelex format.
 */
export function parseCDM(raw: SpaceTrackCDM): ParsedCDM {
  return {
    cdmId: raw.CDM_ID,
    creationDate: new Date(raw.CREATION_DATE),
    tca: new Date(raw.TCA),
    missDistanceMeters: parseFloat(raw.MIN_RNG) * 1000, // km → meters
    collisionProbability: parseFloat(raw.PC),
    probabilityMethod: raw.PC_METHOD ?? null,
    relativeSpeedMs: raw.RELATIVE_SPEED
      ? parseFloat(raw.RELATIVE_SPEED) * 1000 // km/s → m/s
      : null,
    sat1NoradId: raw.SAT_1_ID,
    sat1Name: raw.SAT_1_NAME,
    sat1ObjectType: raw.SAT1_OBJECT_TYPE,
    sat2NoradId: raw.SAT_2_ID,
    sat2Name: raw.SAT_2_NAME,
    sat2ObjectType: raw.SAT2_OBJECT_TYPE,
    sat2Maneuverable: raw.SAT2_MANEUVERABLE ?? null,
    rawCdm: raw,
  };
}

/**
 * Parse an array of Space-Track CDMs, filtering out invalid entries.
 */
export function parseSpaceTrackResponse(data: SpaceTrackCDM[]): ParsedCDM[] {
  const results: ParsedCDM[] = [];
  for (const raw of data) {
    const parsed = parseCDM(raw);
    if (isNaN(parsed.collisionProbability)) {
      logger.warn(
        `[Shield] Skipping CDM ${raw.CDM_ID}: invalid Pc "${raw.PC}"`,
      );
      continue;
    }
    results.push(parsed);
  }
  return results;
}

/**
 * Check if Space-Track credentials are configured.
 */
export function isSpaceTrackConfigured(): boolean {
  return !!(process.env.SPACETRACK_IDENTITY && process.env.SPACETRACK_PASSWORD);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/shield/space-track-parser.test.ts`
Expected: All 10 tests PASS

**Step 5: Commit**

```bash
git add tests/unit/shield/space-track-parser.test.ts src/lib/shield/space-track-client.server.ts
git commit -m "feat(shield): add Space-Track API client with CDM parser — session auth, rate limiting, km→m conversion"
```

---

### Task 7: CDM Polling Cron

**Files:**

- Create: `src/app/api/cron/cdm-polling/route.ts`
- Modify: `vercel.json` (add cron entry)

**Step 1: Create CDM polling cron route**

```typescript
import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";
import {
  fetchCDMs,
  isSpaceTrackConfigured,
} from "@/lib/shield/space-track-client.server";
import {
  classifyRisk,
  thresholdsFromConfig,
} from "@/lib/shield/risk-classifier.server";
import {
  computeNextStatus,
  shouldAutoEscalate,
  shouldAutoClose,
} from "@/lib/shield/conjunction-tracker.server";
import type { ParsedCDM, CDMPollingResult } from "@/lib/shield/types";
import type { RiskTier, ConjunctionStatus } from "@prisma/client";

export const runtime = "nodejs";
export const maxDuration = 60;

function isValidCronSecret(header: string, secret: string): boolean {
  try {
    const headerBuffer = Buffer.from(header);
    const expectedBuffer = Buffer.from(`Bearer ${secret}`);
    if (headerBuffer.length !== expectedBuffer.length) return false;
    return timingSafeEqual(headerBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

export async function GET(req: Request) {
  const startTime = Date.now();

  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    logger.error("[Shield] CRON_SECRET not configured");
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  if (!isValidCronSecret(authHeader || "", cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSpaceTrackConfigured()) {
    logger.info(
      "[Shield] Space-Track credentials not configured, skipping CDM poll",
    );
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: "SPACETRACK_IDENTITY/SPACETRACK_PASSWORD not set",
      processedAt: new Date().toISOString(),
    });
  }

  try {
    logger.info("[Shield] Starting CDM polling...");
    const result = await pollCDMs();

    logger.info("[Shield] CDM polling complete", {
      cdmsProcessed: result.cdmsProcessed,
      newEvents: result.newEvents,
      updatedEvents: result.updatedEvents,
      escalations: result.escalations,
      autoClosures: result.autoClosures,
      errors: result.errors.length,
      duration: `${result.durationMs}ms`,
    });

    return NextResponse.json({
      success: true,
      ...result,
      processedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[Shield] CDM polling failed", error);
    return NextResponse.json(
      {
        success: false,
        error: getSafeErrorMessage(error, "CDM polling failed"),
        processedAt: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  return GET(req);
}

// ─── Core Polling Logic ──────────────────────────────────────────────────────

async function pollCDMs(): Promise<CDMPollingResult> {
  const startTime = Date.now();
  let cdmsProcessed = 0;
  let newEvents = 0;
  let updatedEvents = 0;
  let escalations = 0;
  let autoClosures = 0;
  const errors: string[] = [];

  // Find all organizations with spacecraft that have NORAD IDs
  const orgs = await prisma.organization.findMany({
    where: {
      isActive: true,
      spacecraft: { some: { noradId: { not: null } } },
    },
    select: {
      id: true,
      spacecraft: {
        where: { noradId: { not: null } },
        select: { id: true, noradId: true, name: true },
      },
      caConfig: true,
    },
  });

  for (const org of orgs) {
    try {
      const noradIds = org.spacecraft.map((sc) => sc.noradId!).filter(Boolean);

      if (noradIds.length === 0) continue;

      // Build NORAD ID → spacecraft mapping
      const scByNorad = new Map(org.spacecraft.map((sc) => [sc.noradId!, sc]));

      // Fetch CDMs from Space-Track
      const cdms = await fetchCDMs(noradIds, 1); // Last 24h

      // Build thresholds from org config
      const thresholds = org.caConfig
        ? thresholdsFromConfig(org.caConfig)
        : undefined;

      const autoCloseHours = org.caConfig?.autoCloseAfterTcaHours ?? 24;

      // Process each CDM
      for (const cdm of cdms) {
        try {
          // Determine which of our satellites this CDM involves
          const ourNoradId = noradIds.includes(cdm.sat1NoradId)
            ? cdm.sat1NoradId
            : noradIds.includes(cdm.sat2NoradId)
              ? cdm.sat2NoradId
              : null;

          if (!ourNoradId) continue;

          const threatNoradId =
            ourNoradId === cdm.sat1NoradId ? cdm.sat2NoradId : cdm.sat1NoradId;
          const threatName =
            ourNoradId === cdm.sat1NoradId ? cdm.sat2Name : cdm.sat1Name;
          const threatType =
            ourNoradId === cdm.sat1NoradId
              ? cdm.sat2ObjectType
              : cdm.sat1ObjectType;

          const sc = scByNorad.get(ourNoradId);
          if (!sc) continue;

          // Classify risk
          const tier = classifyRisk(
            cdm.collisionProbability,
            cdm.missDistanceMeters,
            thresholds,
          );

          // Check for duplicate CDM
          const existingCDM = await prisma.cDMRecord.findUnique({
            where: { cdmId: cdm.cdmId },
          });
          if (existingCDM) continue;

          // Find or create conjunction event
          const conjunctionId = `${ourNoradId}-${threatNoradId}-${cdm.tca.toISOString().split("T")[0]}`;

          let event = await prisma.conjunctionEvent.findUnique({
            where: {
              organizationId_conjunctionId: {
                organizationId: org.id,
                conjunctionId,
              },
            },
          });

          if (!event) {
            // Create new event
            const initialStatus = computeNextStatus("NEW", tier);
            event = await prisma.conjunctionEvent.create({
              data: {
                organizationId: org.id,
                spacecraftId: sc.id,
                noradId: ourNoradId,
                threatNoradId,
                threatObjectName: threatName,
                threatObjectType: threatType,
                conjunctionId,
                status: initialStatus,
                riskTier: tier,
                peakPc: cdm.collisionProbability,
                peakPcAt: cdm.creationDate,
                latestPc: cdm.collisionProbability,
                latestMissDistance: cdm.missDistanceMeters,
                tca: cdm.tca,
                relativeSpeed: cdm.relativeSpeedMs,
              },
            });
            newEvents++;
          } else {
            // Update existing event with new CDM data
            const previousTier = event.riskTier;
            const previousStatus = event.status;
            const newStatus = computeNextStatus(event.status, tier);

            // Check auto-escalation
            const autoEscalate =
              shouldAutoEscalate(event.status, tier, cdm.tca) &&
              newStatus !== "ASSESSMENT_REQUIRED";

            const finalStatus = autoEscalate
              ? "ASSESSMENT_REQUIRED"
              : newStatus;

            const updatePeakPc = cdm.collisionProbability > event.peakPc;

            await prisma.conjunctionEvent.update({
              where: { id: event.id },
              data: {
                latestPc: cdm.collisionProbability,
                latestMissDistance: cdm.missDistanceMeters,
                tca: cdm.tca,
                relativeSpeed: cdm.relativeSpeedMs,
                riskTier: tier,
                status: finalStatus,
                ...(updatePeakPc && {
                  peakPc: cdm.collisionProbability,
                  peakPcAt: cdm.creationDate,
                }),
              },
            });

            // Log escalation/de-escalation if tier changed
            if (tier !== previousTier || finalStatus !== previousStatus) {
              await prisma.cAEscalationLog.create({
                data: {
                  conjunctionEventId: event.id,
                  previousTier: previousTier,
                  newTier: tier,
                  previousStatus: previousStatus,
                  newStatus: finalStatus,
                  triggeredBy: autoEscalate ? "TCA_APPROACHING" : "CDM_UPDATE",
                  details: `Pc: ${cdm.collisionProbability.toExponential(2)}, Miss: ${Math.round(cdm.missDistanceMeters)}m`,
                },
              });
              escalations++;
            }

            updatedEvents++;
          }

          // Create CDM record
          await prisma.cDMRecord.create({
            data: {
              conjunctionEventId: event.id,
              cdmId: cdm.cdmId,
              creationDate: cdm.creationDate,
              tca: cdm.tca,
              missDistance: cdm.missDistanceMeters,
              relativeSpeed: cdm.relativeSpeedMs,
              collisionProbability: cdm.collisionProbability,
              probabilityMethod: cdm.probabilityMethod,
              sat2Maneuverable: cdm.sat2Maneuverable,
              rawCdm: cdm.rawCdm as Record<string, unknown>,
              riskTier: tier,
            },
          });

          cdmsProcessed++;
        } catch (error) {
          const msg = `CDM ${cdm.cdmId}: ${error instanceof Error ? error.message : "Unknown"}`;
          errors.push(msg);
          logger.error(`[Shield] ${msg}`);
        }
      }

      // Auto-close stale events
      const openEvents = await prisma.conjunctionEvent.findMany({
        where: {
          organizationId: org.id,
          status: { in: ["NEW", "MONITORING"] },
          closedAt: null,
        },
      });

      for (const evt of openEvents) {
        if (
          shouldAutoClose(evt.status, evt.riskTier, evt.tca, autoCloseHours)
        ) {
          await prisma.conjunctionEvent.update({
            where: { id: evt.id },
            data: {
              status: "CLOSED",
              closedAt: new Date(),
              closedReason: "TCA_PASSED",
            },
          });
          autoClosures++;
        }
      }
    } catch (error) {
      const msg = `Org ${org.id}: ${error instanceof Error ? error.message : "Unknown"}`;
      errors.push(msg);
      logger.error(`[Shield] ${msg}`);
    }
  }

  return {
    cdmsProcessed,
    newEvents,
    updatedEvents,
    escalations,
    autoClosures,
    errors: errors.slice(0, 20),
    durationMs: Date.now() - startTime,
  };
}
```

**Step 2: Add cron entry to vercel.json**

Add to the `crons` array in `vercel.json`:

```json
{
  "path": "/api/cron/cdm-polling",
  "schedule": "*/30 * * * *"
}
```

**Step 3: Verify typecheck**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No new type errors

**Step 4: Commit**

```bash
git add src/app/api/cron/cdm-polling/route.ts vercel.json
git commit -m "feat(shield): add CDM polling cron — Space-Track fetch, event creation, auto-escalation, auto-close"
```

---

### Task 8: API Routes — Events List, Detail, CDMs

**Files:**

- Create: `src/app/api/shield/events/route.ts`
- Create: `src/app/api/shield/events/[eventId]/route.ts`
- Create: `src/app/api/shield/events/[eventId]/cdms/route.ts`

**Step 1: Create events list route**

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

const querySchema = z.object({
  status: z.string().optional(),
  riskTier: z.string().optional(),
  noradId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const url = new URL(req.url);
    const params = querySchema.safeParse(Object.fromEntries(url.searchParams));
    if (!params.success) {
      return NextResponse.json(
        {
          error: "Invalid parameters",
          details: params.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { status, riskTier, noradId, limit, offset } = params.data;

    const where: Prisma.ConjunctionEventWhereInput = {
      organizationId: membership.organizationId,
      ...(status && {
        status: status as Prisma.ConjunctionEventWhereInput["status"],
      }),
      ...(riskTier && {
        riskTier: riskTier as Prisma.ConjunctionEventWhereInput["riskTier"],
      }),
      ...(noradId && { noradId }),
    };

    const [events, total] = await Promise.all([
      prisma.conjunctionEvent.findMany({
        where,
        orderBy: [
          { riskTier: "asc" }, // EMERGENCY first (alphabetical: E < H < M)
          { tca: "asc" }, // Soonest TCA first
        ],
        take: limit,
        skip: offset,
        include: {
          _count: { select: { cdmRecords: true } },
        },
      }),
      prisma.conjunctionEvent.count({ where }),
    ]);

    return NextResponse.json({
      data: events,
      meta: { total, limit, offset },
    });
  } catch (error) {
    logger.error("[Shield] Events list failed", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
```

**Step 2: Create event detail route**

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { eventId } = await params;

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const event = await prisma.conjunctionEvent.findFirst({
      where: {
        id: eventId,
        organizationId: membership.organizationId,
      },
      include: {
        cdmRecords: {
          orderBy: { creationDate: "desc" },
        },
        escalationLog: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({ data: event });
  } catch (error) {
    logger.error("[Shield] Event detail failed", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
```

**Step 3: Create CDMs route**

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { eventId } = await params;

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    // Verify event belongs to org
    const event = await prisma.conjunctionEvent.findFirst({
      where: {
        id: eventId,
        organizationId: membership.organizationId,
      },
      select: { id: true },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const cdms = await prisma.cDMRecord.findMany({
      where: { conjunctionEventId: eventId },
      orderBy: { creationDate: "desc" },
    });

    return NextResponse.json({ data: cdms });
  } catch (error) {
    logger.error("[Shield] CDMs fetch failed", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
```

**Step 4: Verify typecheck**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No type errors

**Step 5: Commit**

```bash
git add src/app/api/shield/events/route.ts src/app/api/shield/events/\[eventId\]/route.ts src/app/api/shield/events/\[eventId\]/cdms/route.ts
git commit -m "feat(shield): add API routes — events list, event detail, CDM history"
```

---

### Task 9: API Routes — Stats & Config

**Files:**

- Create: `src/app/api/shield/stats/route.ts`
- Create: `src/app/api/shield/config/route.ts`

**Step 1: Create stats route**

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type { ShieldStats } from "@/lib/shield/types";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const orgId = membership.organizationId;

    // Count active events by tier
    const [active, emergency, high, elevated, monitor, overdue] =
      await Promise.all([
        prisma.conjunctionEvent.count({
          where: { organizationId: orgId, status: { not: "CLOSED" } },
        }),
        prisma.conjunctionEvent.count({
          where: {
            organizationId: orgId,
            status: { not: "CLOSED" },
            riskTier: "EMERGENCY",
          },
        }),
        prisma.conjunctionEvent.count({
          where: {
            organizationId: orgId,
            status: { not: "CLOSED" },
            riskTier: "HIGH",
          },
        }),
        prisma.conjunctionEvent.count({
          where: {
            organizationId: orgId,
            status: { not: "CLOSED" },
            riskTier: "ELEVATED",
          },
        }),
        prisma.conjunctionEvent.count({
          where: {
            organizationId: orgId,
            status: { not: "CLOSED" },
            riskTier: "MONITOR",
          },
        }),
        prisma.conjunctionEvent.count({
          where: {
            organizationId: orgId,
            status: "ASSESSMENT_REQUIRED",
            updatedAt: {
              lt: new Date(Date.now() - 24 * 3600 * 1000), // >24h old
            },
          },
        }),
      ]);

    // Last CDM poll timestamp
    const lastCDM = await prisma.cDMRecord.findFirst({
      where: {
        conjunctionEvent: { organizationId: orgId },
      },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    const stats: ShieldStats = {
      activeEvents: active,
      emergencyCount: emergency,
      highCount: high,
      elevatedCount: elevated,
      monitorCount: monitor,
      overdueDecisions: overdue,
      lastPollAt: lastCDM?.createdAt.toISOString() ?? null,
    };

    return NextResponse.json({ data: stats });
  } catch (error) {
    logger.error("[Shield] Stats fetch failed", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
```

**Step 2: Create config route (GET + PUT)**

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { logAuditEvent } from "@/lib/audit";

const configUpdateSchema = z.object({
  emergencyPcThreshold: z.number().positive().max(1).optional(),
  highPcThreshold: z.number().positive().max(1).optional(),
  elevatedPcThreshold: z.number().positive().max(1).optional(),
  monitorPcThreshold: z.number().positive().max(1).optional(),
  notifyOnTier: z
    .enum(["EMERGENCY", "HIGH", "ELEVATED", "MONITOR", "INFORMATIONAL"])
    .optional(),
  emergencyEmailAll: z.boolean().optional(),
  autoCloseAfterTcaHours: z.number().int().min(1).max(168).optional(),
  ncaAutoNotify: z.boolean().optional(),
  ncaJurisdiction: z.string().max(10).nullable().optional(),
  defaultAssigneeId: z.string().nullable().optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true, role: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const config = await prisma.cAConfig.findUnique({
      where: { organizationId: membership.organizationId },
    });

    return NextResponse.json({
      data: config ?? {
        // Return defaults if no config exists
        emergencyPcThreshold: 0.001,
        highPcThreshold: 0.0001,
        elevatedPcThreshold: 0.00001,
        monitorPcThreshold: 0.0000001,
        notifyOnTier: "HIGH",
        emergencyEmailAll: true,
        autoCloseAfterTcaHours: 24,
        ncaAutoNotify: false,
        ncaJurisdiction: null,
        defaultAssigneeId: null,
      },
    });
  } catch (error) {
    logger.error("[Shield] Config fetch failed", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true, role: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    // ADMIN+ required for config changes
    if (!["OWNER", "ADMIN"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions — ADMIN required" },
        { status: 403 },
      );
    }

    const body = await req.json();
    const parsed = configUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid config",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const config = await prisma.cAConfig.upsert({
      where: { organizationId: membership.organizationId },
      update: parsed.data,
      create: {
        organizationId: membership.organizationId,
        ...parsed.data,
      },
    });

    await logAuditEvent({
      userId: session.user.id,
      action: "shield_config_updated",
      entityType: "ca_config",
      entityId: config.id,
      newValue: parsed.data,
      organizationId: membership.organizationId,
    });

    return NextResponse.json({ data: config });
  } catch (error) {
    logger.error("[Shield] Config update failed", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
```

**Step 3: Verify typecheck**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No type errors

**Step 4: Commit**

```bash
git add src/app/api/shield/stats/route.ts src/app/api/shield/config/route.ts
git commit -m "feat(shield): add API routes — stats endpoint, config GET/PUT with RBAC"
```

---

### Task 10: Dashboard Sidebar Entry

**Files:**

- Modify: `src/components/dashboard/Sidebar.tsx`

**Step 1: Add Shield nav item**

Find the Predictive Modeling section (around line 799-814). After the Ephemeris NavItem, add:

```tsx
<NavItem
  href="/dashboard/shield"
  icon={<Shield size={18} strokeWidth={1.5} />}
  onClick={handleNavClick}
  collapsed={collapsed}
>
  Shield
</NavItem>
```

Verify that `Shield` is already imported from `lucide-react` at the top of the file. If not, add it to the import.

**Step 2: Create empty Shield dashboard page**

Create: `src/app/dashboard/shield/page.tsx`

```tsx
"use client";

export default function ShieldPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-display-sm font-bold text-white">Shield</h1>
        <p className="text-slate-400 text-body-lg mt-1">
          Conjunction Assessment & Collision Avoidance Compliance
        </p>
      </div>

      <div className="glass-elevated rounded-xl p-8 text-center">
        <p className="text-slate-400 text-body-lg">
          Shield dashboard — Phase 2 implementation.
        </p>
        <p className="text-slate-500 text-small mt-2">
          CDM polling is active. Events are being tracked in the background.
        </p>
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/components/dashboard/Sidebar.tsx src/app/dashboard/shield/page.tsx
git commit -m "feat(shield): add Shield entry to dashboard sidebar + placeholder page"
```

---

### Task 11: Build, Test, Deploy Phase 1

**Step 1: Run all Shield tests**

Run: `npx vitest run tests/unit/shield/`
Expected: All tests pass (risk-classifier: 13, pc-trend: 8, conjunction-tracker: 18, space-track-parser: 10 = ~49 tests)

**Step 2: Run existing tests to ensure no regression**

Run: `npx vitest run --reporter=verbose 2>&1 | tail -30`
Expected: All existing tests still pass

**Step 3: Typecheck**

Run: `npm run typecheck`
Expected: No errors

**Step 4: Build**

Run: `npm run build`
Expected: Build succeeds

**Step 5: Commit and deploy**

```bash
git add -A
git commit -m "feat(shield): Phase 1 complete — foundation (schema, engine, cron, API routes)"
```

Deploy:

```bash
git push origin main
```

Verify deployment at https://www.caelex.eu — check that:

- Shield appears in dashboard sidebar
- `/dashboard/shield` loads the placeholder page
- No console errors

---

## Phase 1 Summary

| Component           | Files        | Tests         |
| ------------------- | ------------ | ------------- |
| Prisma Schema       | 1 modified   | —             |
| Types               | 1 created    | —             |
| Risk Classifier     | 1 created    | 13 tests      |
| Pc Trend Analyzer   | 1 created    | 8 tests       |
| Conjunction Tracker | 1 created    | 18 tests      |
| Space-Track Client  | 1 created    | 10 tests      |
| CDM Polling Cron    | 1 created    | —             |
| API Routes (5)      | 5 created    | —             |
| Dashboard Sidebar   | 1 modified   | —             |
| Placeholder Page    | 1 created    | —             |
| vercel.json         | 1 modified   | —             |
| **Total**           | **15 files** | **~49 tests** |

**Next:** Phase 2 — Dashboard + Decision workflow (full frontend, decision engine, PDF reports)
