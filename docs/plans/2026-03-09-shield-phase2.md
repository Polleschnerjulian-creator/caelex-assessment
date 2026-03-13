# Shield Phase 2 — Dashboard + Decisions — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the full Shield dashboard (Events/Analytics/Settings tabs), event detail page (Overview/Decision/Documentation/Coordination tabs), decision engine, compliance PDF reporter, and all remaining Phase 2 API routes.

**Architecture:** Phase 1 delivered the core engine (risk classifier, Pc trend, conjunction tracker, Space-Track client) and foundation API routes (events list/detail/CDMs, stats, config). Phase 2 layers the decision-support engine, PDF report generation, 6 new API routes for decision workflows, and two full dashboard pages with charts, forms, and real-time state management. All new server modules use `*.server.ts` + `import "server-only"`. Frontend uses glass design system, Recharts (dynamically imported), and Framer Motion.

**Tech Stack:** Next.js 15 App Router, TypeScript, Prisma (cAConfig, conjunctionEvent, cDMRecord, cAEscalationLog), jsPDF + jspdf-autotable (PDF), Recharts (charts), Zod (validation), Framer Motion (animation), Lucide React (icons), glass design system.

---

## Context for Implementers

### Prisma accessor casing

Prisma lowercases the first letter: `CDMRecord` → `prisma.cDMRecord`, `CAEscalationLog` → `prisma.cAEscalationLog`, `CAConfig` → `prisma.cAConfig`, `ConjunctionEvent` → `prisma.conjunctionEvent`.

### Existing Shield modules (Phase 1)

- `src/lib/shield/types.ts` — All type definitions (SpaceTrackCDM, ParsedCDM, PcTrend, RiskThresholds, ShieldStats, etc.)
- `src/lib/shield/risk-classifier.server.ts` — `classifyRisk()`, `TIER_RANK`, `thresholdsFromConfig()`
- `src/lib/shield/pc-trend.server.ts` — `analyzePcTrend(cdms)` returns PcTrend with direction, slope, confidence, projectedPcAtTca
- `src/lib/shield/conjunction-tracker.server.ts` — `computeNextStatus()`, `shouldAutoEscalate()`, `shouldAutoClose()`
- `src/lib/shield/space-track-client.server.ts` — `parseCDM()`, `fetchCDMs()`, `isSpaceTrackConfigured()`

### Auth pattern (API routes)

```typescript
const session = await auth();
if (!session?.user?.id)
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const membership = await prisma.organizationMember.findFirst({
  where: { userId: session.user.id },
  select: { organizationId: true, role: true },
});
if (!membership)
  return NextResponse.json({ error: "No organization" }, { status: 404 });
// RBAC for MANAGER+:
const MANAGER_ROLES = new Set(["OWNER", "ADMIN", "MANAGER"]);
if (!MANAGER_ROLES.has(membership.role))
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
```

### Audit logging

```typescript
import { logAuditEvent } from "@/lib/audit";
await logAuditEvent({
  userId,
  action: "shield_decision_recorded",
  entityType: "conjunction_event",
  entityId: event.id,
  newValue: { decision, rationale },
  description: "...",
  organizationId,
});
```

### CSRF (client-side mutations)

```typescript
import { csrfHeaders } from "@/lib/csrf-client";
const res = await fetch("/api/shield/events/[id]/decide", {
  method: "POST",
  headers: { "Content-Type": "application/json", ...csrfHeaders() },
  body: JSON.stringify(data),
});
```

### Glass design system

- `glass-surface` (sidebar, inputs), `glass-elevated` (cards, panels), `glass-floating` (modals)
- `GlassCard` from `@/components/ui/GlassCard` (props: `hover`, `highlighted`)
- `GlassMotion`, `GlassStagger`, `glassItemVariants` from `@/components/ui/GlassMotion`
- `Card`, `CardHeader`, `CardTitle`, `CardContent` from `@/components/ui/Card`
- `Button` from `@/components/ui/Button` (variants: primary, secondary, ghost, danger, success)
- `Input` from `@/components/ui/Input`

### Recharts pattern (SSR-safe)

```typescript
import dynamic from "next/dynamic";
const DynamicChart = dynamic(() => import("../components/MyChart"), {
  ssr: false,
});
```

---

## Task 1: Decision Engine (TDD)

**Files:**

- Create: `src/lib/shield/decision-engine.server.ts`
- Create: `tests/unit/shield/decision-engine.test.ts`

### Step 1: Write the failing tests

```typescript
// tests/unit/shield/decision-engine.test.ts
import { describe, it, expect } from "vitest";
import {
  computeUrgency,
  computeMissDistanceTrend,
  computeDataConfidence,
  generateRecommendation,
  computeDecisionFactors,
} from "@/lib/shield/decision-engine.server";

describe("computeUrgency", () => {
  it("returns CRITICAL when TCA < 24h and tier rank >= 4 (HIGH)", () => {
    expect(computeUrgency(12, 4)).toBe("CRITICAL");
    expect(computeUrgency(23.9, 5)).toBe("CRITICAL"); // EMERGENCY rank
  });

  it("returns URGENT when TCA < 48h and tier rank >= 3 (ELEVATED)", () => {
    expect(computeUrgency(36, 3)).toBe("URGENT");
    expect(computeUrgency(47, 4)).toBe("URGENT");
  });

  it("returns ELEVATED when TCA < 72h or tier >= 3", () => {
    expect(computeUrgency(60, 2)).toBe("ELEVATED"); // < 72h
    expect(computeUrgency(200, 3)).toBe("ELEVATED"); // tier >= 3
  });

  it("returns ROUTINE for low tier and distant TCA", () => {
    expect(computeUrgency(200, 1)).toBe("ROUTINE");
    expect(computeUrgency(500, 2)).toBe("ROUTINE");
  });
});

describe("computeMissDistanceTrend", () => {
  const makeDate = (hoursAgo: number) =>
    new Date(Date.now() - hoursAgo * 3600 * 1000);

  it("returns STABLE for single CDM", () => {
    expect(
      computeMissDistanceTrend([
        { missDistance: 500, creationDate: makeDate(1), tca: makeDate(-24) },
      ]),
    ).toBe("STABLE");
  });

  it("returns INCREASING when miss distance grows > 10%", () => {
    expect(
      computeMissDistanceTrend([
        { missDistance: 500, creationDate: makeDate(48), tca: makeDate(-24) },
        { missDistance: 600, creationDate: makeDate(24), tca: makeDate(-24) },
        { missDistance: 800, creationDate: makeDate(1), tca: makeDate(-24) },
      ]),
    ).toBe("INCREASING");
  });

  it("returns DECREASING when miss distance shrinks > 10%", () => {
    expect(
      computeMissDistanceTrend([
        { missDistance: 800, creationDate: makeDate(48), tca: makeDate(-24) },
        { missDistance: 600, creationDate: makeDate(24), tca: makeDate(-24) },
        { missDistance: 400, creationDate: makeDate(1), tca: makeDate(-24) },
      ]),
    ).toBe("DECREASING");
  });

  it("returns STABLE when change is within 10%", () => {
    expect(
      computeMissDistanceTrend([
        { missDistance: 500, creationDate: makeDate(48), tca: makeDate(-24) },
        { missDistance: 510, creationDate: makeDate(1), tca: makeDate(-24) },
      ]),
    ).toBe("STABLE");
  });
});

describe("computeDataConfidence", () => {
  it("returns HIGH when >= 5 CDMs and confidence > 0.7", () => {
    expect(computeDataConfidence(5, 0.8)).toBe("HIGH");
    expect(computeDataConfidence(10, 0.9)).toBe("HIGH");
  });

  it("returns MEDIUM when >= 3 CDMs and confidence > 0.3", () => {
    expect(computeDataConfidence(3, 0.5)).toBe("MEDIUM");
    expect(computeDataConfidence(4, 0.4)).toBe("MEDIUM");
  });

  it("returns LOW for few CDMs or low confidence", () => {
    expect(computeDataConfidence(1, 0.1)).toBe("LOW");
    expect(computeDataConfidence(2, 0.2)).toBe("LOW");
  });
});

describe("generateRecommendation", () => {
  it("returns CRITICAL message for CRITICAL urgency", () => {
    const rec = generateRecommendation({
      timeToTcaHours: 12,
      urgency: "CRITICAL",
      currentTier: "EMERGENCY",
      pcTrend: {
        direction: "INCREASING",
        slope: 1.0,
        confidence: 0.9,
        projectedPcAtTca: 0.01,
        dataPoints: 5,
        history: [],
      },
      cdmCount: 5,
      latestPc: 0.002,
      peakPc: 0.003,
      latestMissDistance: 80,
      relativeSpeed: null,
      threatManeuverable: null,
      missDistanceTrend: "DECREASING",
      dataConfidence: "HIGH",
    });
    expect(rec).toContain("CRITICAL");
    expect(rec).toContain("12");
  });

  it("returns increasing Pc warning for non-CRITICAL upward trends", () => {
    const rec = generateRecommendation({
      timeToTcaHours: 60,
      urgency: "ELEVATED",
      currentTier: "ELEVATED",
      pcTrend: {
        direction: "INCREASING",
        slope: 0.8,
        confidence: 0.7,
        projectedPcAtTca: 0.001,
        dataPoints: 4,
        history: [],
      },
      cdmCount: 4,
      latestPc: 0.00005,
      peakPc: 0.0001,
      latestMissDistance: 800,
      relativeSpeed: null,
      threatManeuverable: null,
      missDistanceTrend: "STABLE",
      dataConfidence: "MEDIUM",
    });
    expect(rec).toContain("trending upward");
  });

  it("returns decreasing message for DECREASING trend", () => {
    const rec = generateRecommendation({
      timeToTcaHours: 100,
      urgency: "ROUTINE",
      currentTier: "MONITOR",
      pcTrend: {
        direction: "DECREASING",
        slope: -0.6,
        confidence: 0.8,
        projectedPcAtTca: 1e-9,
        dataPoints: 6,
        history: [],
      },
      cdmCount: 6,
      latestPc: 1e-7,
      peakPc: 1e-5,
      latestMissDistance: 5000,
      relativeSpeed: null,
      threatManeuverable: null,
      missDistanceTrend: "INCREASING",
      dataConfidence: "HIGH",
    });
    expect(rec).toContain("decreasing");
  });
});

describe("computeDecisionFactors", () => {
  const makeDate = (hoursAgo: number) =>
    new Date(Date.now() - hoursAgo * 3600 * 1000);
  const futureDate = (hoursAhead: number) =>
    new Date(Date.now() + hoursAhead * 3600 * 1000);

  it("computes full factors from event and CDMs", () => {
    const event = {
      riskTier: "HIGH" as const,
      latestPc: 5e-4,
      peakPc: 8e-4,
      latestMissDistance: 350,
      tca: futureDate(36),
      relativeSpeed: 14500,
    };
    const cdms = [
      {
        collisionProbability: 1e-5,
        missDistance: 800,
        creationDate: makeDate(72),
        tca: futureDate(36),
        sat2Maneuverable: "YES",
      },
      {
        collisionProbability: 1e-4,
        missDistance: 500,
        creationDate: makeDate(48),
        tca: futureDate(36),
        sat2Maneuverable: "YES",
      },
      {
        collisionProbability: 5e-4,
        missDistance: 350,
        creationDate: makeDate(24),
        tca: futureDate(36),
        sat2Maneuverable: "YES",
      },
    ];

    const factors = computeDecisionFactors(event, cdms);

    expect(factors.urgency).toBe("URGENT"); // TCA ~36h, tier rank 4
    expect(factors.cdmCount).toBe(3);
    expect(factors.latestPc).toBe(5e-4);
    expect(factors.peakPc).toBe(8e-4);
    expect(factors.currentTier).toBe("HIGH");
    expect(factors.threatManeuverable).toBe(true);
    expect(factors.recommendation).toBeTruthy();
    expect(typeof factors.timeToTcaHours).toBe("number");
    expect(factors.pcTrend.direction).toBeDefined();
    expect(factors.missDistanceTrend).toBeDefined();
    expect(factors.dataConfidence).toBeDefined();
  });
});
```

### Step 2: Run tests to verify they fail

```bash
npx vitest run tests/unit/shield/decision-engine.test.ts
```

Expected: FAIL — module not found

### Step 3: Write the implementation

```typescript
// src/lib/shield/decision-engine.server.ts
import "server-only";
import { analyzePcTrend } from "./pc-trend.server";
import { TIER_RANK } from "./risk-classifier.server";
import type { PcTrend } from "./types";

// ─── Types ──────────────────────────────────────────────────────────────────

export type UrgencyLevel = "CRITICAL" | "URGENT" | "ELEVATED" | "ROUTINE";
export type MissDistanceTrend = "INCREASING" | "DECREASING" | "STABLE";
export type DataConfidence = "HIGH" | "MEDIUM" | "LOW";

export interface DecisionFactors {
  timeToTcaHours: number;
  urgency: UrgencyLevel;
  pcTrend: PcTrend;
  currentTier: string;
  cdmCount: number;
  latestPc: number;
  peakPc: number;
  latestMissDistance: number;
  relativeSpeed: number | null;
  threatManeuverable: boolean | null;
  missDistanceTrend: MissDistanceTrend;
  dataConfidence: DataConfidence;
  recommendation: string;
}

interface CDMInput {
  collisionProbability: number;
  missDistance: number;
  creationDate: Date;
  tca: Date;
  relativeSpeed?: number | null;
  sat2Maneuverable?: string | null;
}

// ─── Pure Functions ─────────────────────────────────────────────────────────

export function computeUrgency(
  timeToTcaHours: number,
  tierRank: number,
): UrgencyLevel {
  if (timeToTcaHours < 24 && tierRank >= 4) return "CRITICAL";
  if (timeToTcaHours < 48 && tierRank >= 3) return "URGENT";
  if (timeToTcaHours < 72 || tierRank >= 3) return "ELEVATED";
  return "ROUTINE";
}

export function computeMissDistanceTrend(
  cdms: Array<{ missDistance: number; creationDate: Date; tca: Date }>,
): MissDistanceTrend {
  if (cdms.length < 2) return "STABLE";
  const sorted = [...cdms].sort(
    (a, b) => a.creationDate.getTime() - b.creationDate.getTime(),
  );
  const first = sorted[0]!.missDistance;
  const last = sorted[sorted.length - 1]!.missDistance;
  if (first === 0) return "STABLE";
  const change = (last - first) / first;
  if (change > 0.1) return "INCREASING";
  if (change < -0.1) return "DECREASING";
  return "STABLE";
}

export function computeDataConfidence(
  cdmCount: number,
  trendConfidence: number,
): DataConfidence {
  if (cdmCount >= 5 && trendConfidence > 0.7) return "HIGH";
  if (cdmCount >= 3 && trendConfidence > 0.3) return "MEDIUM";
  return "LOW";
}

export function generateRecommendation(
  factors: Omit<DecisionFactors, "recommendation">,
): string {
  if (factors.urgency === "CRITICAL") {
    return `CRITICAL: TCA in ${factors.timeToTcaHours.toFixed(0)}h with ${factors.currentTier} risk. Immediate assessment required.`;
  }
  if (
    factors.pcTrend.direction === "INCREASING" &&
    factors.urgency !== "ROUTINE"
  ) {
    return `Collision probability trending upward (slope: ${factors.pcTrend.slope.toFixed(3)}/day). Active monitoring recommended.`;
  }
  if (factors.pcTrend.direction === "DECREASING") {
    return `Collision probability decreasing. Continue monitoring — situation may resolve naturally.`;
  }
  if (factors.dataConfidence === "LOW") {
    return `Limited data (${factors.cdmCount} CDMs). Await additional conjunction data before deciding.`;
  }
  return `${factors.currentTier} risk event. ${factors.cdmCount} CDMs received. Review factors and decide.`;
}

// ─── Main Entry Point ───────────────────────────────────────────────────────

export function computeDecisionFactors(
  event: {
    riskTier: string;
    latestPc: number;
    peakPc: number;
    latestMissDistance: number;
    tca: Date;
    relativeSpeed: number | null;
  },
  cdms: CDMInput[],
): DecisionFactors {
  const timeToTcaHours = Math.max(
    0,
    (event.tca.getTime() - Date.now()) / (1000 * 60 * 60),
  );
  const tierRank = TIER_RANK[event.riskTier as keyof typeof TIER_RANK] ?? 1;

  const pcTrend = analyzePcTrend(
    cdms.map((c) => ({
      collisionProbability: c.collisionProbability,
      creationDate: c.creationDate,
      tca: c.tca,
      missDistance: c.missDistance,
    })),
  );

  const urgency = computeUrgency(timeToTcaHours, tierRank);
  const missDistanceTrend = computeMissDistanceTrend(cdms);
  const dataConfidence = computeDataConfidence(cdms.length, pcTrend.confidence);

  const latestCdm =
    cdms.length > 0
      ? [...cdms].sort(
          (a, b) => b.creationDate.getTime() - a.creationDate.getTime(),
        )[0]
      : null;

  const threatManeuverable = latestCdm?.sat2Maneuverable
    ? latestCdm.sat2Maneuverable !== "N/A" &&
      latestCdm.sat2Maneuverable !== "NO"
    : null;

  const factorsWithoutRec = {
    timeToTcaHours,
    urgency,
    pcTrend,
    currentTier: event.riskTier,
    cdmCount: cdms.length,
    latestPc: event.latestPc,
    peakPc: event.peakPc,
    latestMissDistance: event.latestMissDistance,
    relativeSpeed: event.relativeSpeed,
    threatManeuverable,
    missDistanceTrend,
    dataConfidence,
  };

  return {
    ...factorsWithoutRec,
    recommendation: generateRecommendation(factorsWithoutRec),
  };
}
```

### Step 4: Run tests to verify they pass

```bash
npx vitest run tests/unit/shield/decision-engine.test.ts
```

Expected: All 13 tests PASS

### Step 5: Commit

```bash
git add src/lib/shield/decision-engine.server.ts tests/unit/shield/decision-engine.test.ts
git commit -m "feat(shield): add decision engine with urgency, trend, and confidence factors"
```

---

## Task 2: Compliance Reporter (PDF)

**Files:**

- Create: `src/lib/shield/compliance-reporter.server.ts`
- Create: `tests/unit/shield/compliance-reporter.test.ts`

### Step 1: Write the failing tests

```typescript
// tests/unit/shield/compliance-reporter.test.ts
import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  buildCAReportSections,
  formatPcScientific,
} from "@/lib/shield/compliance-reporter.server";

describe("formatPcScientific", () => {
  it("formats small Pc values in scientific notation", () => {
    expect(formatPcScientific(1.5e-5)).toBe("1.50e-5");
    expect(formatPcScientific(3.2e-4)).toBe("3.20e-4");
  });

  it("handles zero", () => {
    expect(formatPcScientific(0)).toBe("0.00e+0");
  });
});

describe("buildCAReportSections", () => {
  const baseEvent = {
    id: "evt-1",
    conjunctionId: "25544-99999-2026-03-15",
    noradId: "25544",
    threatNoradId: "99999",
    threatObjectName: "COSMOS DEB",
    threatObjectType: "DEBRIS",
    status: "DECISION_MADE" as const,
    riskTier: "HIGH" as const,
    peakPc: 5e-4,
    latestPc: 3e-4,
    latestMissDistance: 350,
    tca: new Date("2026-03-20T14:30:00Z"),
    relativeSpeed: 14500,
    decision: "MANEUVER" as const,
    decisionBy: "operator@example.com",
    decisionAt: new Date("2026-03-18T10:00:00Z"),
    decisionRationale:
      "Pc exceeds operational threshold; maneuver window available.",
    createdAt: new Date("2026-03-15T08:00:00Z"),
  };

  const cdms = [
    {
      cdmId: "CDM-001",
      creationDate: new Date("2026-03-15T08:00:00Z"),
      collisionProbability: 1e-5,
      missDistance: 800,
      riskTier: "MONITOR" as const,
    },
    {
      cdmId: "CDM-002",
      creationDate: new Date("2026-03-17T08:00:00Z"),
      collisionProbability: 5e-4,
      missDistance: 350,
      riskTier: "HIGH" as const,
    },
  ];

  const escalationLog = [
    {
      previousTier: "MONITOR" as const,
      newTier: "HIGH" as const,
      previousStatus: "MONITORING" as const,
      newStatus: "ASSESSMENT_REQUIRED" as const,
      triggeredBy: "CDM_UPDATE",
      createdAt: new Date("2026-03-17T08:00:00Z"),
    },
  ];

  it("returns an array of report sections", () => {
    const sections = buildCAReportSections(baseEvent, cdms, escalationLog);
    expect(Array.isArray(sections)).toBe(true);
    expect(sections.length).toBeGreaterThanOrEqual(4);
  });

  it("includes Event Summary section with key data", () => {
    const sections = buildCAReportSections(baseEvent, cdms, escalationLog);
    const summary = sections.find((s) => s.title.includes("Event Summary"));
    expect(summary).toBeDefined();
  });

  it("includes CDM History section", () => {
    const sections = buildCAReportSections(baseEvent, cdms, escalationLog);
    const cdmSection = sections.find((s) => s.title.includes("CDM"));
    expect(cdmSection).toBeDefined();
  });

  it("includes Decision Record section when decision exists", () => {
    const sections = buildCAReportSections(baseEvent, cdms, escalationLog);
    const decision = sections.find((s) => s.title.includes("Decision"));
    expect(decision).toBeDefined();
  });

  it("includes Escalation History section", () => {
    const sections = buildCAReportSections(baseEvent, cdms, escalationLog);
    const escalation = sections.find((s) => s.title.includes("Escalation"));
    expect(escalation).toBeDefined();
  });
});
```

### Step 2: Run tests to verify they fail

```bash
npx vitest run tests/unit/shield/compliance-reporter.test.ts
```

Expected: FAIL — module not found

### Step 3: Write the implementation

```typescript
// src/lib/shield/compliance-reporter.server.ts
import "server-only";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Layout Constants (mm) ───

const PAGE_W = 210;
const MARGIN_L = 20;
const MARGIN_R = 20;
const MARGIN_T = 25;
const MARGIN_B = 35;
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R;
const PAGE_H = 297;
const MAX_Y = PAGE_H - MARGIN_B;

const COL = {
  primary: [30, 58, 95] as [number, number, number],
  body: [45, 55, 72] as [number, number, number],
  secondary: [74, 85, 104] as [number, number, number],
  muted: [113, 128, 150] as [number, number, number],
  light: [160, 174, 192] as [number, number, number],
  border: [226, 232, 240] as [number, number, number],
  red: [229, 62, 62] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  headerBg: [247, 250, 252] as [number, number, number],
  emergencyBg: [254, 226, 226] as [number, number, number],
  highBg: [254, 243, 199] as [number, number, number],
};

// ─── Helpers ───

export function formatPcScientific(pc: number): string {
  if (pc === 0) return "0.00e+0";
  const exp = Math.floor(Math.log10(Math.abs(pc)));
  const mantissa = pc / Math.pow(10, exp);
  return `${mantissa.toFixed(2)}e${exp >= 0 ? "+" : ""}${exp}`;
}

function formatDate(d: Date): string {
  return d.toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

// ─── Report Section Builder ───

export interface ReportSection {
  title: string;
  content: Array<Record<string, unknown>>;
}

interface EventInput {
  id: string;
  conjunctionId: string;
  noradId: string;
  threatNoradId: string;
  threatObjectName: string | null;
  threatObjectType: string;
  status: string;
  riskTier: string;
  peakPc: number;
  latestPc: number;
  latestMissDistance: number;
  tca: Date;
  relativeSpeed: number | null;
  decision: string | null;
  decisionBy: string | null;
  decisionAt: Date | null;
  decisionRationale: string | null;
  createdAt: Date;
}

interface CDMInput {
  cdmId: string;
  creationDate: Date;
  collisionProbability: number;
  missDistance: number;
  riskTier: string;
}

interface EscalationInput {
  previousTier: string;
  newTier: string;
  previousStatus: string;
  newStatus: string;
  triggeredBy: string;
  createdAt: Date;
}

export function buildCAReportSections(
  event: EventInput,
  cdms: CDMInput[],
  escalationLog: EscalationInput[],
): ReportSection[] {
  const sections: ReportSection[] = [];

  // 1. Event Summary
  sections.push({
    title: "1. Event Summary",
    content: [
      {
        type: "keyValue",
        items: [
          { key: "Conjunction ID", value: event.conjunctionId },
          { key: "Protected Object (NORAD)", value: event.noradId },
          { key: "Threat Object (NORAD)", value: event.threatNoradId },
          {
            key: "Threat Object Name",
            value: event.threatObjectName ?? "Unknown",
          },
          { key: "Threat Type", value: event.threatObjectType },
          { key: "TCA", value: formatDate(event.tca) },
          { key: "Risk Tier", value: event.riskTier },
          { key: "Status", value: event.status.replace(/_/g, " ") },
          { key: "Peak Pc", value: formatPcScientific(event.peakPc) },
          { key: "Latest Pc", value: formatPcScientific(event.latestPc) },
          {
            key: "Miss Distance",
            value: `${event.latestMissDistance.toFixed(0)} m`,
          },
          {
            key: "Relative Speed",
            value: event.relativeSpeed
              ? `${event.relativeSpeed.toFixed(0)} m/s`
              : "N/A",
          },
          { key: "Event Created", value: formatDate(event.createdAt) },
        ],
      },
    ],
  });

  // 2. CDM History
  const sortedCdms = [...cdms].sort(
    (a, b) => a.creationDate.getTime() - b.creationDate.getTime(),
  );
  sections.push({
    title: "2. CDM History",
    content: [
      {
        type: "text",
        value: `${cdms.length} Conjunction Data Message(s) received.`,
      },
      {
        type: "table",
        headers: ["CDM ID", "Date", "Pc", "Miss (m)", "Tier"],
        rows: sortedCdms.map((c) => [
          c.cdmId,
          formatDate(c.creationDate),
          formatPcScientific(c.collisionProbability),
          c.missDistance.toFixed(0),
          c.riskTier,
        ]),
      },
    ],
  });

  // 3. Decision Record
  if (event.decision) {
    sections.push({
      title: "3. Decision Record",
      content: [
        {
          type: "keyValue",
          items: [
            { key: "Decision", value: event.decision.replace(/_/g, " ") },
            { key: "Decided By", value: event.decisionBy ?? "Unknown" },
            {
              key: "Decided At",
              value: event.decisionAt ? formatDate(event.decisionAt) : "N/A",
            },
            {
              key: "Rationale",
              value: event.decisionRationale ?? "None provided",
            },
          ],
        },
      ],
    });
  } else {
    sections.push({
      title: "3. Decision Record",
      content: [
        {
          type: "text",
          value: "No decision has been recorded for this event.",
        },
      ],
    });
  }

  // 4. Escalation History
  const sortedLog = [...escalationLog].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );
  sections.push({
    title: "4. Escalation History",
    content: [
      {
        type: "text",
        value: `${escalationLog.length} escalation event(s) recorded.`,
      },
      ...(sortedLog.length > 0
        ? [
            {
              type: "table",
              headers: ["Date", "Tier Change", "Status Change", "Trigger"],
              rows: sortedLog.map((e) => [
                formatDate(e.createdAt),
                `${e.previousTier} → ${e.newTier}`,
                `${e.previousStatus.replace(/_/g, " ")} → ${e.newStatus.replace(/_/g, " ")}`,
                e.triggeredBy,
              ]),
            },
          ]
        : []),
    ],
  });

  // 5. Compliance Note
  sections.push({
    title: "5. Compliance Note",
    content: [
      {
        type: "text",
        value:
          "This report is generated by Caelex Shield for compliance documentation purposes in accordance with EU Space Act (COM(2025) 335) collision avoidance requirements. It documents the conjunction assessment workflow, data received, and decisions taken. This report does not constitute operational advice.",
      },
    ],
  });

  return sections;
}

// ─── PDF Generation ─────────────────────────────────────────────────────────

export function generateCAReportPDF(
  event: EventInput,
  cdms: CDMInput[],
  escalationLog: EscalationInput[],
): Buffer {
  const sections = buildCAReportSections(event, cdms, escalationLog);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let y = MARGIN_T;
  let pageNum = 1;

  function checkPageBreak(needed: number) {
    if (y + needed > MAX_Y) {
      addFooter();
      doc.addPage();
      pageNum++;
      y = MARGIN_T;
    }
  }

  function addFooter() {
    const footerY = PAGE_H - 20;
    doc.setDrawColor(...COL.border);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_L, footerY, PAGE_W - MARGIN_R, footerY);
    doc.setFontSize(7);
    doc.setTextColor(...COL.light);
    doc.text("Generated by Caelex Shield (caelex.eu)", MARGIN_L, footerY + 4);
    doc.setFontSize(6);
    doc.setTextColor(...COL.red);
    doc.setFont("helvetica", "bold");
    doc.text("CONFIDENTIAL", PAGE_W / 2, footerY + 4, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COL.secondary);
    doc.text(`Page ${pageNum}`, PAGE_W - MARGIN_R, footerY + 4, {
      align: "right",
    });
  }

  // Title
  doc.setFontSize(18);
  doc.setTextColor(...COL.primary);
  doc.setFont("helvetica", "bold");
  doc.text("Collision Avoidance Report", MARGIN_L, y);
  y += 9;

  // Subtitle
  doc.setFontSize(11);
  doc.setTextColor(...COL.secondary);
  doc.setFont("helvetica", "normal");
  doc.text(`Conjunction: ${event.conjunctionId}`, MARGIN_L, y);
  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(...COL.muted);
  doc.text(
    `Report Date: ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}`,
    MARGIN_L,
    y,
  );
  y += 4;
  doc.setDrawColor(...COL.primary);
  doc.setLineWidth(0.8);
  doc.line(MARGIN_L, y, PAGE_W - MARGIN_R, y);
  y += 10;

  // Sections
  for (const section of sections) {
    checkPageBreak(20);
    doc.setFontSize(13);
    doc.setTextColor(...COL.primary);
    doc.setFont("helvetica", "bold");
    doc.text(section.title, MARGIN_L, y);
    y += 5;
    doc.setDrawColor(...COL.border);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_L, y, PAGE_W - MARGIN_R, y);
    y += 6;

    for (const block of section.content) {
      const b = block as Record<string, unknown>;
      if (b.type === "text") {
        checkPageBreak(10);
        doc.setFontSize(10);
        doc.setTextColor(...COL.body);
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(String(b.value), CONTENT_W);
        doc.text(lines, MARGIN_L, y);
        y += lines.length * 4.5 + 3;
      } else if (b.type === "keyValue") {
        const items = b.items as Array<{ key: string; value: string }>;
        for (const item of items) {
          checkPageBreak(6);
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...COL.secondary);
          doc.text(`${item.key}:`, MARGIN_L, y);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...COL.body);
          doc.text(String(item.value), MARGIN_L + 50, y);
          y += 5;
        }
        y += 3;
      } else if (b.type === "table") {
        const headers = b.headers as string[];
        const rows = b.rows as string[][];
        checkPageBreak(15);
        autoTable(doc, {
          startY: y,
          head: [headers],
          body: rows,
          margin: { left: MARGIN_L, right: MARGIN_R },
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: {
            fillColor: COL.primary,
            textColor: COL.white,
            fontStyle: "bold",
          },
          alternateRowStyles: { fillColor: COL.headerBg },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        y = (doc as any).lastAutoTable?.finalY + 5 || y + 20;
      }
    }
    y += 4;
  }

  addFooter();
  return Buffer.from(doc.output("arraybuffer"));
}
```

### Step 4: Run tests

```bash
npx vitest run tests/unit/shield/compliance-reporter.test.ts
```

Expected: All 7 tests PASS

### Step 5: Commit

```bash
git add src/lib/shield/compliance-reporter.server.ts tests/unit/shield/compliance-reporter.test.ts
git commit -m "feat(shield): add compliance reporter with CA report PDF generation"
```

---

## Task 3: Decision Action API Routes

**Files:**

- Create: `src/app/api/shield/events/[eventId]/decide/route.ts`
- Create: `src/app/api/shield/events/[eventId]/maneuver-executed/route.ts`
- Create: `src/app/api/shield/events/[eventId]/verify/route.ts`
- Create: `src/app/api/shield/events/[eventId]/close/route.ts`

**Dependencies:** None (uses Prisma directly)

### Step 1: Write all four routes

**Important notes:**

- All four routes follow the same pattern: session auth → org membership → MANAGER+ RBAC → Zod validation → state transition check → Prisma update → escalation log → audit log → response.
- Decision transitions: ASSESSMENT_REQUIRED → DECISION_MADE, then DECISION_MADE → MANEUVER_PLANNED (if decision=MANEUVER), etc.
- Use `logAuditEvent` for all state changes.
- Next.js 15 async params: `{ params }: { params: Promise<{ eventId: string }> }`.

#### decide/route.ts

```typescript
// src/app/api/shield/events/[eventId]/decide/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";

const decideSchema = z.object({
  decision: z.enum(["MANEUVER", "ACCEPT_RISK", "MONITOR", "COORDINATE"]),
  rationale: z.string().min(10).max(2000),
});

const MANAGER_ROLES = new Set(["OWNER", "ADMIN", "MANAGER"]);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
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

    if (!MANAGER_ROLES.has(membership.role)) {
      return NextResponse.json(
        { error: "Forbidden: MANAGER role required" },
        { status: 403 },
      );
    }

    const { eventId } = await params;
    const body = await req.json();
    const parseResult = decideSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parseResult.error.flatten() },
        { status: 400 },
      );
    }

    const { decision, rationale } = parseResult.data;

    const event = await prisma.conjunctionEvent.findFirst({
      where: { id: eventId, organizationId: membership.organizationId },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.decision) {
      return NextResponse.json(
        { error: "Decision already recorded" },
        { status: 409 },
      );
    }

    const newStatus =
      decision === "MANEUVER" ? "MANEUVER_PLANNED" : "DECISION_MADE";

    const updated = await prisma.conjunctionEvent.update({
      where: { id: eventId },
      data: {
        decision,
        decisionBy: session.user.email ?? session.user.id,
        decisionAt: new Date(),
        decisionRationale: rationale,
        status: newStatus,
      },
    });

    await prisma.cAEscalationLog.create({
      data: {
        conjunctionEventId: eventId,
        previousTier: event.riskTier,
        newTier: event.riskTier,
        previousStatus: event.status,
        newStatus,
        triggeredBy: "OPERATOR_DECISION",
        details: `Decision: ${decision} — ${rationale.slice(0, 100)}`,
      },
    });

    await logAuditEvent({
      userId: session.user.id,
      action: "shield_decision_recorded",
      entityType: "conjunction_event",
      entityId: eventId,
      newValue: { decision, rationale },
      description: `Shield decision recorded: ${decision}`,
      organizationId: membership.organizationId,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    logger.error("Failed to record decision", error);
    return NextResponse.json(
      { error: "Failed to record decision" },
      { status: 500 },
    );
  }
}
```

#### maneuver-executed/route.ts

```typescript
// src/app/api/shield/events/[eventId]/maneuver-executed/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";

const maneuverSchema = z.object({
  fuelConsumedPct: z.number().min(0).max(100).optional(),
  notes: z.string().max(2000).optional(),
});

const MANAGER_ROLES = new Set(["OWNER", "ADMIN", "MANAGER"]);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
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

    if (!MANAGER_ROLES.has(membership.role)) {
      return NextResponse.json(
        { error: "Forbidden: MANAGER role required" },
        { status: 403 },
      );
    }

    const { eventId } = await params;
    const body = await req.json();
    const parseResult = maneuverSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parseResult.error.flatten() },
        { status: 400 },
      );
    }

    const event = await prisma.conjunctionEvent.findFirst({
      where: { id: eventId, organizationId: membership.organizationId },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.status !== "MANEUVER_PLANNED") {
      return NextResponse.json(
        { error: `Cannot confirm execution: event is ${event.status}` },
        { status: 409 },
      );
    }

    const updated = await prisma.conjunctionEvent.update({
      where: { id: eventId },
      data: {
        status: "MANEUVER_EXECUTED",
        maneuverExecutedAt: new Date(),
        fuelConsumedPct: parseResult.data.fuelConsumedPct ?? null,
      },
    });

    await prisma.cAEscalationLog.create({
      data: {
        conjunctionEventId: eventId,
        previousTier: event.riskTier,
        newTier: event.riskTier,
        previousStatus: "MANEUVER_PLANNED",
        newStatus: "MANEUVER_EXECUTED",
        triggeredBy: "MANEUVER_CONFIRMATION",
        details: parseResult.data.notes ?? "Maneuver execution confirmed",
      },
    });

    await logAuditEvent({
      userId: session.user.id,
      action: "shield_maneuver_executed",
      entityType: "conjunction_event",
      entityId: eventId,
      newValue: { fuelConsumedPct: parseResult.data.fuelConsumedPct },
      description: "Shield maneuver execution confirmed",
      organizationId: membership.organizationId,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    logger.error("Failed to confirm maneuver execution", error);
    return NextResponse.json(
      { error: "Failed to confirm maneuver execution" },
      { status: 500 },
    );
  }
}
```

#### verify/route.ts

```typescript
// src/app/api/shield/events/[eventId]/verify/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";

const verifySchema = z.object({
  verified: z.boolean(),
  notes: z.string().max(2000).optional(),
});

const MANAGER_ROLES = new Set(["OWNER", "ADMIN", "MANAGER"]);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
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

    if (!MANAGER_ROLES.has(membership.role)) {
      return NextResponse.json(
        { error: "Forbidden: MANAGER role required" },
        { status: 403 },
      );
    }

    const { eventId } = await params;
    const body = await req.json();
    const parseResult = verifySchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parseResult.error.flatten() },
        { status: 400 },
      );
    }

    const event = await prisma.conjunctionEvent.findFirst({
      where: { id: eventId, organizationId: membership.organizationId },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.status !== "MANEUVER_EXECUTED") {
      return NextResponse.json(
        { error: `Cannot verify: event is ${event.status}` },
        { status: 409 },
      );
    }

    const newStatus = parseResult.data.verified
      ? "MANEUVER_VERIFIED"
      : "MANEUVER_EXECUTED";

    const updated = await prisma.conjunctionEvent.update({
      where: { id: eventId },
      data: {
        status: newStatus,
        maneuverVerified: parseResult.data.verified,
      },
    });

    await prisma.cAEscalationLog.create({
      data: {
        conjunctionEventId: eventId,
        previousTier: event.riskTier,
        newTier: event.riskTier,
        previousStatus: "MANEUVER_EXECUTED",
        newStatus,
        triggeredBy: "POST_MANEUVER_VERIFICATION",
        details:
          parseResult.data.notes ??
          (parseResult.data.verified
            ? "Maneuver verified"
            : "Verification pending"),
      },
    });

    await logAuditEvent({
      userId: session.user.id,
      action: "shield_maneuver_verified",
      entityType: "conjunction_event",
      entityId: eventId,
      newValue: { verified: parseResult.data.verified },
      description: `Shield post-maneuver verification: ${parseResult.data.verified ? "confirmed" : "not confirmed"}`,
      organizationId: membership.organizationId,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    logger.error("Failed to verify maneuver", error);
    return NextResponse.json(
      { error: "Failed to verify maneuver" },
      { status: 500 },
    );
  }
}
```

#### close/route.ts

```typescript
// src/app/api/shield/events/[eventId]/close/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";

const closeSchema = z.object({
  reason: z.string().min(5).max(2000),
});

const MANAGER_ROLES = new Set(["OWNER", "ADMIN", "MANAGER"]);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
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

    if (!MANAGER_ROLES.has(membership.role)) {
      return NextResponse.json(
        { error: "Forbidden: MANAGER role required" },
        { status: 403 },
      );
    }

    const { eventId } = await params;
    const body = await req.json();
    const parseResult = closeSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parseResult.error.flatten() },
        { status: 400 },
      );
    }

    const event = await prisma.conjunctionEvent.findFirst({
      where: { id: eventId, organizationId: membership.organizationId },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.status === "CLOSED") {
      return NextResponse.json(
        { error: "Event already closed" },
        { status: 409 },
      );
    }

    const updated = await prisma.conjunctionEvent.update({
      where: { id: eventId },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
        closedReason: parseResult.data.reason,
      },
    });

    await prisma.cAEscalationLog.create({
      data: {
        conjunctionEventId: eventId,
        previousTier: event.riskTier,
        newTier: event.riskTier,
        previousStatus: event.status,
        newStatus: "CLOSED",
        triggeredBy: "MANUAL_CLOSE",
        details: parseResult.data.reason.slice(0, 200),
      },
    });

    await logAuditEvent({
      userId: session.user.id,
      action: "shield_event_closed",
      entityType: "conjunction_event",
      entityId: eventId,
      newValue: { reason: parseResult.data.reason },
      description: "Shield conjunction event manually closed",
      organizationId: membership.organizationId,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    logger.error("Failed to close event", error);
    return NextResponse.json(
      { error: "Failed to close event" },
      { status: 500 },
    );
  }
}
```

### Step 2: Verify build compiles

```bash
npx vitest run tests/unit/shield/ && npm run typecheck 2>&1 | grep -i shield
```

### Step 3: Commit

```bash
git add src/app/api/shield/events/\[eventId\]/decide/ src/app/api/shield/events/\[eventId\]/maneuver-executed/ src/app/api/shield/events/\[eventId\]/verify/ src/app/api/shield/events/\[eventId\]/close/
git commit -m "feat(shield): add decision action API routes (decide, maneuver-executed, verify, close)"
```

---

## Task 4: Report + NCA + Analytics API Routes

**Files:**

- Create: `src/app/api/shield/events/[eventId]/report/route.ts`
- Create: `src/app/api/shield/events/[eventId]/nca-notify/route.ts`
- Create: `src/app/api/shield/analytics/route.ts`

### Step 1: Write all three routes

#### report/route.ts

```typescript
// src/app/api/shield/events/[eventId]/report/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { logAuditEvent } from "@/lib/audit";
import { generateCAReportPDF } from "@/lib/shield/compliance-reporter.server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
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

    const { eventId } = await params;

    const event = await prisma.conjunctionEvent.findFirst({
      where: { id: eventId, organizationId: membership.organizationId },
      include: {
        cdmRecords: { orderBy: { creationDate: "asc" } },
        escalationLog: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const pdfBuffer = generateCAReportPDF(
      {
        id: event.id,
        conjunctionId: event.conjunctionId,
        noradId: event.noradId,
        threatNoradId: event.threatNoradId,
        threatObjectName: event.threatObjectName,
        threatObjectType: event.threatObjectType,
        status: event.status,
        riskTier: event.riskTier,
        peakPc: event.peakPc,
        latestPc: event.latestPc,
        latestMissDistance: event.latestMissDistance,
        tca: event.tca,
        relativeSpeed: event.relativeSpeed,
        decision: event.decision,
        decisionBy: event.decisionBy,
        decisionAt: event.decisionAt,
        decisionRationale: event.decisionRationale,
        createdAt: event.createdAt,
      },
      event.cdmRecords.map((c) => ({
        cdmId: c.cdmId,
        creationDate: c.creationDate,
        collisionProbability: c.collisionProbability,
        missDistance: c.missDistance,
        riskTier: c.riskTier,
      })),
      event.escalationLog.map((e) => ({
        previousTier: e.previousTier,
        newTier: e.newTier,
        previousStatus: e.previousStatus,
        newStatus: e.newStatus,
        triggeredBy: e.triggeredBy,
        createdAt: e.createdAt,
      })),
    );

    // Mark report as generated
    await prisma.conjunctionEvent.update({
      where: { id: eventId },
      data: { reportGenerated: true },
    });

    await logAuditEvent({
      userId: session.user.id,
      action: "shield_report_generated",
      entityType: "conjunction_event",
      entityId: eventId,
      description: "Shield CA report PDF generated",
      organizationId: membership.organizationId,
    });

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="ca-report-${event.conjunctionId}.pdf"`,
      },
    });
  } catch (error) {
    logger.error("Failed to generate report", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 },
    );
  }
}
```

#### nca-notify/route.ts

```typescript
// src/app/api/shield/events/[eventId]/nca-notify/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { logAuditEvent } from "@/lib/audit";

const MANAGER_ROLES = new Set(["OWNER", "ADMIN", "MANAGER"]);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
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

    if (!MANAGER_ROLES.has(membership.role)) {
      return NextResponse.json(
        { error: "Forbidden: MANAGER role required" },
        { status: 403 },
      );
    }

    const { eventId } = await params;

    const event = await prisma.conjunctionEvent.findFirst({
      where: { id: eventId, organizationId: membership.organizationId },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.ncaNotified) {
      return NextResponse.json(
        { error: "NCA already notified" },
        { status: 409 },
      );
    }

    const updated = await prisma.conjunctionEvent.update({
      where: { id: eventId },
      data: {
        ncaNotified: true,
        ncaNotifiedAt: new Date(),
      },
    });

    await logAuditEvent({
      userId: session.user.id,
      action: "shield_nca_notified",
      entityType: "conjunction_event",
      entityId: eventId,
      description: "NCA notification sent for conjunction event",
      organizationId: membership.organizationId,
    });

    return NextResponse.json({
      data: updated,
      message: "NCA notification recorded",
    });
  } catch (error) {
    logger.error("Failed to notify NCA", error);
    return NextResponse.json(
      { error: "Failed to notify NCA" },
      { status: 500 },
    );
  }
}
```

#### analytics/route.ts

```typescript
// src/app/api/shield/analytics/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

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

    // Run all analytics queries in parallel
    const [
      eventsByStatus,
      eventsByTier,
      decisionBreakdown,
      recentEvents,
      cdmCounts,
    ] = await Promise.all([
      // Events by status
      prisma.conjunctionEvent.groupBy({
        by: ["status"],
        where: { organizationId: orgId },
        _count: { status: true },
      }),
      // Events by risk tier
      prisma.conjunctionEvent.groupBy({
        by: ["riskTier"],
        where: { organizationId: orgId, status: { not: "CLOSED" } },
        _count: { riskTier: true },
      }),
      // Decision breakdown
      prisma.conjunctionEvent.groupBy({
        by: ["decision"],
        where: { organizationId: orgId, decision: { not: null } },
        _count: { decision: true },
      }),
      // Recent events (last 90 days) for timeline
      prisma.conjunctionEvent.findMany({
        where: {
          organizationId: orgId,
          createdAt: { gte: new Date(Date.now() - 90 * 24 * 3600 * 1000) },
        },
        select: {
          id: true,
          riskTier: true,
          status: true,
          latestPc: true,
          tca: true,
          createdAt: true,
          decision: true,
          fuelConsumedPct: true,
          decisionAt: true,
        },
        orderBy: { createdAt: "asc" },
      }),
      // CDM counts by week (last 12 weeks)
      prisma.cDMRecord.groupBy({
        by: ["creationDate"],
        where: {
          conjunctionEvent: { organizationId: orgId },
          creationDate: { gte: new Date(Date.now() - 84 * 24 * 3600 * 1000) },
        },
        _count: { id: true },
      }),
    ]);

    // Aggregate CDMs by week
    const cdmsPerWeek: Record<string, number> = {};
    for (const cdm of cdmCounts) {
      const d = new Date(cdm.creationDate);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().slice(0, 10);
      cdmsPerWeek[key] = (cdmsPerWeek[key] ?? 0) + cdm._count.id;
    }

    // Compute response times (createdAt → decisionAt)
    const responseTimes = recentEvents
      .filter((e) => e.decisionAt)
      .map((e) => ({
        hours:
          (e.decisionAt!.getTime() - e.createdAt.getTime()) / (3600 * 1000),
        tier: e.riskTier,
      }));

    const avgResponseTimeHours =
      responseTimes.length > 0
        ? responseTimes.reduce((s, r) => s + r.hours, 0) / responseTimes.length
        : null;

    // Fuel consumed by events with maneuvers
    const fuelEvents = recentEvents.filter(
      (e) => e.fuelConsumedPct != null && e.fuelConsumedPct > 0,
    );
    const totalFuelConsumedPct = fuelEvents.reduce(
      (s, e) => s + (e.fuelConsumedPct ?? 0),
      0,
    );

    // Pc distribution buckets
    const pcBuckets = [
      { label: "≥1e-3", min: 1e-3, max: Infinity, count: 0 },
      { label: "1e-4–1e-3", min: 1e-4, max: 1e-3, count: 0 },
      { label: "1e-5–1e-4", min: 1e-5, max: 1e-4, count: 0 },
      { label: "1e-7–1e-5", min: 1e-7, max: 1e-5, count: 0 },
      { label: "<1e-7", min: 0, max: 1e-7, count: 0 },
    ];
    for (const e of recentEvents) {
      for (const bucket of pcBuckets) {
        if (e.latestPc >= bucket.min && e.latestPc < bucket.max) {
          bucket.count++;
          break;
        }
      }
    }

    return NextResponse.json({
      data: {
        eventsByStatus: eventsByStatus.map((e) => ({
          status: e.status,
          count: e._count.status,
        })),
        eventsByTier: eventsByTier.map((e) => ({
          tier: e.riskTier,
          count: e._count.riskTier,
        })),
        decisionBreakdown: decisionBreakdown.map((e) => ({
          decision: e.decision,
          count: e._count.decision,
        })),
        cdmsPerWeek: Object.entries(cdmsPerWeek)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([week, count]) => ({ week, count })),
        avgResponseTimeHours,
        totalFuelConsumedPct,
        maneuverCount: fuelEvents.length,
        pcDistribution: pcBuckets.map((b) => ({
          label: b.label,
          count: b.count,
        })),
        eventsTimeline: recentEvents.map((e) => ({
          id: e.id,
          tier: e.riskTier,
          status: e.status,
          pc: e.latestPc,
          tca: e.tca.toISOString(),
          createdAt: e.createdAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    logger.error("Failed to get shield analytics", error);
    return NextResponse.json(
      { error: "Failed to get shield analytics" },
      { status: 500 },
    );
  }
}
```

### Step 2: Verify build

```bash
npm run typecheck 2>&1 | grep -i shield
```

### Step 3: Commit

```bash
git add src/app/api/shield/events/\[eventId\]/report/ src/app/api/shield/events/\[eventId\]/nca-notify/ src/app/api/shield/analytics/
git commit -m "feat(shield): add report, NCA notification, and analytics API routes"
```

---

## Task 5: Shield Dashboard Page

**Files:**

- Rewrite: `src/app/dashboard/shield/page.tsx`

**Dependencies:** Tasks 1-4 (API routes must exist)

This task replaces the placeholder page with a full 3-tab dashboard. It is a `"use client"` component that fetches data from the Phase 1+2 API routes.

### Step 1: Write the full dashboard page

The page has:

- **Header** with title, description, quick stats row
- **Three tabs**: Events | Analytics | Settings
- **Events tab**: Filter bar (status, tier, search) + event cards sorted by urgency + pagination
- **Analytics tab**: 6 Recharts charts (dynamically imported)
- **Settings tab**: CAConfig form

**Key patterns:**

- Fetch data with `useEffect` + `useState`
- Use `glass-elevated` for main containers
- Color-code risk tiers: EMERGENCY=red-500, HIGH=amber-500, ELEVATED=yellow-500, MONITOR=blue-500, INFORMATIONAL=slate-500
- Use `csrfHeaders()` for PUT/POST calls
- Dynamic import Recharts to avoid SSR issues

The full page component should be written as a single `"use client"` file at `src/app/dashboard/shield/page.tsx`. It is intentionally a large file (similar to `src/app/dashboard/page.tsx` at 44KB) — this matches the codebase convention.

**Implementation requirements:**

1. **Stats header**: Fetch from `GET /api/shield/stats` — show activeEvents, emergencyCount, highCount, elevatedCount, monitorCount, overdueDecisions as metric cards.

2. **Events tab**: Fetch from `GET /api/shield/events?limit=20&offset=0` with filter params. Each event card shows: conjunctionId, riskTier badge, status badge, NORAD IDs, TCA countdown, latestPc in scientific notation. Cards are clickable → navigate to `/dashboard/shield/[eventId]`. Sort: EMERGENCY first, then by TCA ascending.

3. **Analytics tab**: Fetch from `GET /api/shield/analytics`. Render 6 charts:
   - CDMs per week (BarChart)
   - Events by status (PieChart)
   - Events by risk tier (PieChart)
   - Decision breakdown (BarChart)
   - Pc distribution (BarChart)
   - Events timeline (AreaChart)

4. **Settings tab**: Fetch from `GET /api/shield/config`. Form fields for all CAConfig properties. Save via `PUT /api/shield/config` with `csrfHeaders()`. Show success/error toast.

**Risk tier badge colors:**

```typescript
const TIER_COLORS: Record<string, string> = {
  EMERGENCY: "bg-red-500/20 text-red-400 border-red-500/30",
  HIGH: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  ELEVATED: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  MONITOR: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  INFORMATIONAL: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};
```

**Status badge colors:**

```typescript
const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-500/20 text-blue-400",
  MONITORING: "bg-cyan-500/20 text-cyan-400",
  ASSESSMENT_REQUIRED: "bg-amber-500/20 text-amber-400",
  DECISION_MADE: "bg-purple-500/20 text-purple-400",
  MANEUVER_PLANNED: "bg-orange-500/20 text-orange-400",
  MANEUVER_EXECUTED: "bg-emerald-500/20 text-emerald-400",
  MANEUVER_VERIFIED: "bg-green-500/20 text-green-400",
  CLOSED: "bg-slate-500/20 text-slate-400",
};
```

**Imports needed:**

```typescript
"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Shield,
  AlertTriangle,
  Activity,
  Clock,
  Settings,
  BarChart3,
  Filter,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Save,
  Loader2,
  X,
} from "lucide-react";
import Card, { CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { GlassMotion, GlassStagger } from "@/components/ui/GlassMotion";
import { csrfHeaders } from "@/lib/csrf-client";
```

**Chart dynamic imports:**

```typescript
const BarChartComponent = dynamic(
  () => import("recharts").then((mod) => {
    const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } = mod;
    return { default: ({ data, dataKey, nameKey, colors }: any) => (
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis dataKey={nameKey} tick={{ fill: "#94A3B8", fontSize: 11 }} />
          <YAxis tick={{ fill: "#94A3B8", fontSize: 11 }} />
          <Tooltip contentStyle={{ backgroundColor: "#1E293B", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#E2E8F0" }} />
          <Bar dataKey={dataKey} radius={[4, 4, 0, 0]}>
            {data.map((_: any, i: number) => (
              <Cell key={i} fill={colors?.[i] ?? "#10B981"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    )};
  }),
  { ssr: false },
);
```

Build similar dynamic wrappers for PieChart and AreaChart.

**Empty state**: When no events exist, show a centered card with Shield icon and message: "No conjunction events yet. Shield will automatically detect and track conjunction events when CDMs are received from Space-Track."

### Step 2: Run full test suite + typecheck

```bash
npx vitest run tests/unit/shield/ && npm run typecheck 2>&1 | grep shield
```

### Step 3: Commit

```bash
git add src/app/dashboard/shield/page.tsx
git commit -m "feat(shield): add full Shield dashboard with Events, Analytics, and Settings tabs"
```

---

## Task 6: Event Detail Page — Overview + Decision Tabs

**Files:**

- Create: `src/app/dashboard/shield/[eventId]/page.tsx`

**Dependencies:** Tasks 1-4 (decision engine + API routes)

This is the event detail page with 4 tabs. This task implements the first two: **Overview** and **Decision**.

### Implementation requirements:

**Page structure:**

- Back button → `/dashboard/shield`
- Event header: conjunctionId, risk tier badge, status badge, TCA countdown
- Four tab buttons: Overview | Decision | Documentation | Coordination
- Tab content area

**Overview tab:**

1. **Key Metrics Row** — 4 metric cards: Latest Pc (scientific notation), Peak Pc, Miss Distance (m), Relative Speed (m/s or "N/A")
2. **Pc Evolution Chart** — Recharts LineChart (log scale Y-axis via `scale="log"` and `domain={['auto', 'auto']}`) showing Pc values over time from CDM records. X-axis: creation date. Reference line at TCA.
3. **Miss Distance Chart** — Recharts LineChart showing miss distance over time.
4. **CDM History Table** — Sortable table of all CDM records: CDM ID, Date, Pc, Miss Distance (m), Tier badge
5. **Threat Object Card** — threatNoradId, threatObjectName, threatObjectType, sat2Maneuverable
6. **Pc Trend Card** — Show trend direction (INCREASING/DECREASING/STABLE/VOLATILE), slope, confidence, projected Pc at TCA. Color-code: INCREASING=red, DECREASING=green, STABLE=blue, VOLATILE=amber.
7. **Event Timeline** — Escalation log entries rendered as a vertical timeline with colored dots per tier.

**Decision tab:**

1. **Decision Factors Panel** — Fetch via client-side computation (the factors are computed from event + CDM data that's already loaded from the detail API). Show: urgency level, Pc trend, miss distance trend, data confidence, threat maneuverability, CDM count, recommendation text. Each factor as a card with icon + label + value.
2. **Decision Form** (when `event.decision === null` and `status === "ASSESSMENT_REQUIRED"`):
   - Radio buttons for CADecision: MANEUVER, ACCEPT_RISK, MONITOR, COORDINATE
   - Textarea for rationale (min 10 chars)
   - Submit button → `POST /api/shield/events/[eventId]/decide`
   - On success: refresh event data, show success message
3. **Decision Display** (when `event.decision !== null`):
   - Read-only display of recorded decision: type, rationale, decided by, decided at
   - If status is MANEUVER_PLANNED: Show "Confirm Maneuver Execution" button → `POST .../maneuver-executed`
   - If status is MANEUVER_EXECUTED: Show "Verify Maneuver" button → `POST .../verify`
   - If status is not CLOSED: Show "Close Event" button → `POST .../close`

**Data fetching:**

```typescript
const [event, setEvent] = useState<any>(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetch(`/api/shield/events/${eventId}`)
    .then((r) => r.json())
    .then((d) => setEvent(d.data))
    .finally(() => setLoading(false));
}, [eventId]);
```

**Decision factors (client-side):**
Note: The decision engine uses `import "server-only"` so it cannot be imported on the client. Instead, compute the factors inline on the client with a simplified version, OR add a new API endpoint. **Recommended approach:** Add a lightweight `/api/shield/events/[eventId]/factors` GET endpoint that returns computed factors. The implementer should create this as part of this task:

```typescript
// src/app/api/shield/events/[eventId]/factors/route.ts
// Uses computeDecisionFactors from decision-engine.server.ts
// Returns JSON with all DecisionFactors fields
```

**Imports:**

```typescript
"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  Shield,
  Clock,
  Target,
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  FileText,
  MessageSquare,
  Loader2,
} from "lucide-react";
import Card, { CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { GlassMotion } from "@/components/ui/GlassMotion";
import { csrfHeaders } from "@/lib/csrf-client";
```

### Step 1: Write the page + factors API route

### Step 2: Run tests + typecheck

```bash
npx vitest run tests/unit/shield/ && npm run typecheck 2>&1 | grep shield
```

### Step 3: Commit

```bash
git add src/app/dashboard/shield/\[eventId\]/ src/app/api/shield/events/\[eventId\]/factors/
git commit -m "feat(shield): add event detail page with Overview and Decision tabs"
```

---

## Task 7: Event Detail Page — Documentation + Coordination Tabs

**Files:**

- Modify: `src/app/dashboard/shield/[eventId]/page.tsx`

**Dependencies:** Task 6 (extends the detail page)

### Implementation requirements:

**Documentation tab:**

1. **Generate CA Report** button → `POST /api/shield/events/[eventId]/report`. Returns PDF blob. On click, create download link. Show `reportGenerated` status.
2. **NCA Notification** section — "Notify NCA" button → `POST .../nca-notify`. Show `ncaNotified` / `ncaNotifiedAt` status. Disabled if already notified.
3. **Raw CDM Archive** — Expandable section showing raw CDM JSON for each CDM record. Use `<pre>` with `glass-surface` styling. Collapsible per CDM.

**Coordination tab:**

1. **Communication Log** — A simple append-only log for recording coordination exchanges. Since there's no dedicated DB model for this yet, use a client-side-only notepad pattern (localStorage or a textarea that doesn't persist). Show a note: "Communication log is for session reference only. For permanent records, use the CA Report."
2. **Quick Actions** — Button row: "Copy Event Summary" (copies key metrics to clipboard), "Export CDMs as CSV" (generates and downloads CSV from CDM data).

**Report download pattern:**

```typescript
const handleGenerateReport = async () => {
  setGenerating(true);
  try {
    const res = await fetch(`/api/shield/events/${eventId}/report`, {
      method: "POST",
      headers: csrfHeaders(),
    });
    if (!res.ok) throw new Error("Failed to generate report");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ca-report-${event.conjunctionId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    // Refresh event to show reportGenerated=true
    refreshEvent();
  } finally {
    setGenerating(false);
  }
};
```

**CSV export pattern:**

```typescript
const handleExportCSV = () => {
  const headers = ["CDM ID", "Date", "Pc", "Miss Distance (m)", "Tier"];
  const rows = event.cdmRecords.map((c: any) => [
    c.cdmId,
    new Date(c.creationDate).toISOString(),
    c.collisionProbability,
    c.missDistance,
    c.riskTier,
  ]);
  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cdms-${event.conjunctionId}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
```

### Step 1: Add Documentation + Coordination tabs to the detail page

### Step 2: Run tests + typecheck

```bash
npx vitest run tests/unit/shield/ && npm run typecheck 2>&1 | grep shield
```

### Step 3: Commit

```bash
git add src/app/dashboard/shield/\[eventId\]/page.tsx
git commit -m "feat(shield): add Documentation and Coordination tabs to event detail page"
```

---

## Task 8: Build, Test, Deploy Phase 2

### Step 1: Run all Shield tests

```bash
npx vitest run tests/unit/shield/
```

Expected: All tests pass (55 from Phase 1 + ~20 new from Phase 2)

### Step 2: Run full test suite for regression

```bash
npm run test:run 2>&1 | tail -20
```

### Step 3: Typecheck

```bash
npm run typecheck 2>&1 | grep shield
```

Expected: No Shield-related errors

### Step 4: Build

```bash
npm run build
```

Expected: Build succeeds. New routes visible:

- `/api/shield/events/[eventId]/decide`
- `/api/shield/events/[eventId]/maneuver-executed`
- `/api/shield/events/[eventId]/verify`
- `/api/shield/events/[eventId]/close`
- `/api/shield/events/[eventId]/report`
- `/api/shield/events/[eventId]/nca-notify`
- `/api/shield/events/[eventId]/factors`
- `/api/shield/analytics`
- `/dashboard/shield`
- `/dashboard/shield/[eventId]`

### Step 5: Commit and push

```bash
git add -A
git commit -m "feat(shield): Phase 2 complete — Dashboard + Decisions"
git push
```
