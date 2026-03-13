# Shield Phase 3 — Integration + Polish — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate Shield into the Ephemeris compliance scoring pipeline (collision avoidance module + scenario builder), add Verity attestation for closed events, wire notifications, build digest and cleanup crons, and add email templates.

**Architecture:** Phase 3 connects Shield to the two adjacent subsystems — Ephemeris (compliance scoring) and Verity (attestation). A new data adapter (`shield-adapter.ts`) feeds conjunction data into the Ephemeris module scoring pipeline. A new Verity integration module creates compliance attestations when CA events close with documented decisions. Two new cron jobs handle daily digests and weekly cleanup. The notification service gets Shield-specific types for real-time alerting.

**Tech Stack:** Prisma (existing models), Ephemeris engine (module-registry, scoring, satellite-compliance-state, what-if-engine), Verity attestation API, notification-service, email templates (Resend/SMTP), jsPDF, Zod, vercel.json cron config.

---

## Context for Implementers

### Prisma accessor casing

`prisma.conjunctionEvent`, `prisma.cDMRecord`, `prisma.cAEscalationLog`, `prisma.cAConfig`, `prisma.verityAttestation`, `prisma.satelliteComplianceState`, `prisma.satelliteAlert`.

### Existing Shield modules (Phase 1+2)

- `src/lib/shield/types.ts` — All Shield types
- `src/lib/shield/risk-classifier.server.ts` — `classifyRisk()`, `TIER_RANK`
- `src/lib/shield/pc-trend.server.ts` — `analyzePcTrend()`
- `src/lib/shield/conjunction-tracker.server.ts` — State machine functions
- `src/lib/shield/decision-engine.server.ts` — `computeDecisionFactors()`, `computeUrgency()`
- `src/lib/shield/compliance-reporter.server.ts` — `generateCAReportPDF()`, `buildCAReportSections()`
- `src/lib/shield/space-track-client.server.ts` — CDM fetching

### Ephemeris engine entry points

- `src/lib/ephemeris/core/module-registry.ts` — `MODULE_REGISTRY` object keyed by OperatorType, each value is `ModuleRegistration[]`
- `src/lib/ephemeris/core/scoring.ts` — `calculateModuleScore(factors, dataSource)`, `calculateOverallScore()`, safety gate
- `src/lib/ephemeris/core/satellite-compliance-state.ts` — `calculateEntityComplianceState()` orchestrator
- `src/lib/ephemeris/data/` — Adapters: `sentinel-adapter.ts`, `verity-adapter.ts`, `celestrak-adapter.ts`, etc.
- `src/lib/ephemeris/simulation/what-if-engine.ts` — `runWhatIfScenario()`, `SCENARIO_HANDLERS` registry

### Notification service

```typescript
import { notifyOrganization } from "@/lib/services/notification-service";
await notifyOrganization(
  orgId,
  "SHIELD_EMERGENCY",
  "Emergency Conjunction",
  "Details...",
  { actionUrl: "/dashboard/shield/EVENT_ID" },
);
```

### Email service

```typescript
import { sendEmail, isEmailConfigured } from "@/lib/email";
await sendEmail({ to, subject, html, userId, notificationType, entityType });
```

### Cron auth pattern

```typescript
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { timingSafeEqual } from "node:crypto";

export const maxDuration = 30;

export async function GET() {
  const headersList = await headers();
  const authHeader = headersList.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || !authHeader)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const token = authHeader.replace("Bearer ", "");
  const valid = timingSafeEqual(Buffer.from(token), Buffer.from(cronSecret));
  if (!valid)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // ... cron logic
}
```

---

## Task 1: Shield Ephemeris Adapter (TDD)

**Files:**

- Create: `src/lib/ephemeris/data/shield-adapter.ts`
- Create: `tests/unit/shield/shield-adapter.test.ts`

### What this does

Creates a data adapter that pulls conjunction event data from Shield into the Ephemeris compliance scoring pipeline. Follows the same pattern as `verity-adapter.ts` and `sentinel-adapter.ts`.

### Step 1: Write the failing tests

```typescript
// tests/unit/shield/shield-adapter.test.ts
import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  mapTierToStatus,
  computeCAComplianceFactor,
  getShieldStatus,
} from "@/lib/ephemeris/data/shield-adapter";

describe("mapTierToStatus", () => {
  it("maps EMERGENCY to NON_COMPLIANT", () => {
    expect(mapTierToStatus("EMERGENCY")).toBe("NON_COMPLIANT");
  });

  it("maps HIGH to WARNING", () => {
    expect(mapTierToStatus("HIGH")).toBe("WARNING");
  });

  it("maps ELEVATED to WARNING", () => {
    expect(mapTierToStatus("ELEVATED")).toBe("WARNING");
  });

  it("maps MONITOR to COMPLIANT", () => {
    expect(mapTierToStatus("MONITOR")).toBe("COMPLIANT");
  });

  it("maps INFORMATIONAL to COMPLIANT", () => {
    expect(mapTierToStatus("INFORMATIONAL")).toBe("COMPLIANT");
  });
});

describe("computeCAComplianceFactor", () => {
  it("returns COMPLIANT with score 100 when no active events", () => {
    const factor = computeCAComplianceFactor([]);
    expect(factor.status).toBe("COMPLIANT");
    expect(factor.score).toBe(100);
  });

  it("returns NON_COMPLIANT for EMERGENCY events", () => {
    const factor = computeCAComplianceFactor([
      {
        riskTier: "EMERGENCY",
        status: "ASSESSMENT_REQUIRED",
        tca: new Date(Date.now() + 86400000),
        latestPc: 0.002,
        decision: null,
      },
    ]);
    expect(factor.status).toBe("NON_COMPLIANT");
    expect(factor.score).toBeLessThan(30);
  });

  it("returns WARNING for HIGH events", () => {
    const factor = computeCAComplianceFactor([
      {
        riskTier: "HIGH",
        status: "MONITORING",
        tca: new Date(Date.now() + 172800000),
        latestPc: 5e-4,
        decision: null,
      },
    ]);
    expect(factor.status).toBe("WARNING");
  });

  it("returns COMPLIANT when all events have decisions", () => {
    const factor = computeCAComplianceFactor([
      {
        riskTier: "HIGH",
        status: "DECISION_MADE",
        tca: new Date(Date.now() + 86400000),
        latestPc: 5e-4,
        decision: "MANEUVER",
      },
    ]);
    expect(factor.status).toBe("COMPLIANT");
    expect(factor.score).toBeGreaterThanOrEqual(70);
  });

  it("uses worst-case tier across multiple events", () => {
    const factor = computeCAComplianceFactor([
      {
        riskTier: "MONITOR",
        status: "MONITORING",
        tca: new Date(Date.now() + 604800000),
        latestPc: 1e-6,
        decision: null,
      },
      {
        riskTier: "EMERGENCY",
        status: "NEW",
        tca: new Date(Date.now() + 43200000),
        latestPc: 0.005,
        decision: null,
      },
    ]);
    expect(factor.status).toBe("NON_COMPLIANT");
  });
});

describe("getShieldStatus", () => {
  it("returns disconnected when no events and no config", () => {
    const status = getShieldStatus(0, false);
    expect(status.connected).toBe(false);
  });

  it("returns connected when config exists", () => {
    const status = getShieldStatus(0, true);
    expect(status.connected).toBe(true);
    expect(status.activeEvents).toBe(0);
  });

  it("includes event count", () => {
    const status = getShieldStatus(5, true);
    expect(status.activeEvents).toBe(5);
  });
});
```

### Step 2: Run tests to verify they fail

```bash
npx vitest run tests/unit/shield/shield-adapter.test.ts
```

### Step 3: Write the implementation

```typescript
// src/lib/ephemeris/data/shield-adapter.ts
import "server-only";
import type { PrismaClient } from "@prisma/client";

// ─── Types ──────────────────────────────────────────────────────────────────

type ComplianceStatus = "COMPLIANT" | "WARNING" | "NON_COMPLIANT" | "UNKNOWN";

interface CAComplianceFactor {
  key: string;
  label: string;
  status: ComplianceStatus;
  score: number;
  detail: string;
  measuredAt: Date;
}

interface ShieldEventInput {
  riskTier: string;
  status: string;
  tca: Date;
  latestPc: number;
  decision: string | null;
}

interface ShieldStatusResult {
  connected: boolean;
  activeEvents: number;
  lastPollAt: string | null;
  source: string;
}

// ─── Pure Functions (exported for testing) ──────────────────────────────────

export function mapTierToStatus(riskTier: string): ComplianceStatus {
  switch (riskTier) {
    case "EMERGENCY":
      return "NON_COMPLIANT";
    case "HIGH":
    case "ELEVATED":
      return "WARNING";
    case "MONITOR":
    case "INFORMATIONAL":
      return "COMPLIANT";
    default:
      return "UNKNOWN";
  }
}

export function computeCAComplianceFactor(
  activeEvents: ShieldEventInput[],
): CAComplianceFactor {
  if (activeEvents.length === 0) {
    return {
      key: "collision_avoidance",
      label: "Collision Avoidance",
      status: "COMPLIANT",
      score: 100,
      detail: "No active conjunction events",
      measuredAt: new Date(),
    };
  }

  // Find worst-case event (by tier rank)
  const TIER_RANK: Record<string, number> = {
    EMERGENCY: 5,
    HIGH: 4,
    ELEVATED: 3,
    MONITOR: 2,
    INFORMATIONAL: 1,
  };

  const sorted = [...activeEvents].sort(
    (a, b) => (TIER_RANK[b.riskTier] ?? 0) - (TIER_RANK[a.riskTier] ?? 0),
  );
  const worst = sorted[0]!;

  // Events with decisions are "handled" — boost score
  const allDecided = activeEvents.every((e) => e.decision !== null);
  if (allDecided) {
    return {
      key: "collision_avoidance",
      label: "Collision Avoidance",
      status: "COMPLIANT",
      score: Math.max(70, 100 - activeEvents.length * 5),
      detail: `${activeEvents.length} event(s) with documented decisions`,
      measuredAt: new Date(),
    };
  }

  const baseStatus = mapTierToStatus(worst.riskTier);
  const undecidedCount = activeEvents.filter((e) => e.decision === null).length;

  // Score: NON_COMPLIANT=20, WARNING=60, COMPLIANT=90
  let score =
    baseStatus === "NON_COMPLIANT" ? 20 : baseStatus === "WARNING" ? 60 : 90;
  score = Math.max(0, score - undecidedCount * 5);

  return {
    key: "collision_avoidance",
    label: "Collision Avoidance",
    status: baseStatus,
    score,
    detail: `${activeEvents.length} active event(s), ${undecidedCount} pending decision`,
    measuredAt: new Date(),
  };
}

export function getShieldStatus(
  activeEventCount: number,
  configExists: boolean,
): ShieldStatusResult {
  return {
    connected: configExists,
    activeEvents: activeEventCount,
    lastPollAt: null, // populated by caller
    source: "Shield CDM Polling",
  };
}

// ─── Database Functions ─────────────────────────────────────────────────────

export async function getShieldComplianceFactors(
  prisma: PrismaClient,
  orgId: string,
  noradId: string,
): Promise<CAComplianceFactor> {
  const activeEvents = await prisma.conjunctionEvent.findMany({
    where: {
      organizationId: orgId,
      noradId,
      status: { not: "CLOSED" },
    },
    select: {
      riskTier: true,
      status: true,
      tca: true,
      latestPc: true,
      decision: true,
    },
  });

  return computeCAComplianceFactor(activeEvents);
}

export async function getShieldDataSourceStatus(
  prisma: PrismaClient,
  orgId: string,
): Promise<ShieldStatusResult> {
  const [config, activeCount] = await Promise.all([
    prisma.cAConfig.findUnique({ where: { organizationId: orgId } }),
    prisma.conjunctionEvent.count({
      where: { organizationId: orgId, status: { not: "CLOSED" } },
    }),
  ]);

  return {
    connected: config !== null,
    activeEvents: activeCount,
    lastPollAt: null,
    source: "Shield CDM Polling",
  };
}
```

### Step 4: Run tests

```bash
npx vitest run tests/unit/shield/shield-adapter.test.ts
```

Expected: All 11 tests PASS

### Step 5: Commit

```bash
git add src/lib/ephemeris/data/shield-adapter.ts tests/unit/shield/shield-adapter.test.ts
git commit -m "feat(shield): add Ephemeris data adapter for collision avoidance compliance"
```

---

## Task 2: Verity Integration (TDD)

**Files:**

- Create: `src/lib/shield/verity-integration.server.ts`
- Create: `tests/unit/shield/verity-integration.test.ts`

### What this does

When a Shield conjunction event is closed with a documented decision, create a Verity attestation that certifies the CA workflow was followed. This provides an auditable compliance certificate.

### Step 1: Read for context

- `src/app/api/v1/verity/attestation/generate/route.ts` — How attestations are created
- `src/lib/shield/types.ts` — Shield types

### Step 2: Write the failing tests

```typescript
// tests/unit/shield/verity-integration.test.ts
import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  buildAttestationPayload,
  shouldCreateAttestation,
} from "@/lib/shield/verity-integration.server";

describe("shouldCreateAttestation", () => {
  it("returns true for CLOSED event with decision and no existing attestation", () => {
    expect(shouldCreateAttestation("CLOSED", "MANEUVER", null)).toBe(true);
    expect(shouldCreateAttestation("CLOSED", "ACCEPT_RISK", null)).toBe(true);
  });

  it("returns false for non-CLOSED events", () => {
    expect(shouldCreateAttestation("MONITORING", null, null)).toBe(false);
    expect(shouldCreateAttestation("DECISION_MADE", "MANEUVER", null)).toBe(
      false,
    );
  });

  it("returns false when attestation already exists", () => {
    expect(shouldCreateAttestation("CLOSED", "MANEUVER", "attest-123")).toBe(
      false,
    );
  });

  it("returns false when no decision recorded", () => {
    expect(shouldCreateAttestation("CLOSED", null, null)).toBe(false);
  });
});

describe("buildAttestationPayload", () => {
  const event = {
    id: "evt-1",
    conjunctionId: "25544-99999-2026-03-15",
    noradId: "25544",
    threatNoradId: "99999",
    riskTier: "HIGH",
    status: "CLOSED",
    decision: "MANEUVER",
    decisionBy: "operator@example.com",
    decisionAt: new Date("2026-03-18T10:00:00Z"),
    decisionRationale: "Pc exceeds threshold",
    peakPc: 5e-4,
    latestPc: 3e-4,
    latestMissDistance: 350,
    tca: new Date("2026-03-20T14:30:00Z"),
    closedAt: new Date("2026-03-21T08:00:00Z"),
    closedReason: "TCA passed, maneuver verified",
    cdmCount: 5,
    reportGenerated: true,
  };

  it("builds payload with regulation_ref ca_compliance", () => {
    const payload = buildAttestationPayload(event);
    expect(payload.regulation_ref).toBe("ca_compliance");
  });

  it("includes conjunction ID and NORAD IDs", () => {
    const payload = buildAttestationPayload(event);
    expect(payload.data_point).toBe("collision_avoidance");
    expect(payload.satellite_norad_id).toBe("25544");
  });

  it("sets result to COMPLIANT when decision was documented", () => {
    const payload = buildAttestationPayload(event);
    expect(payload.result).toBe("COMPLIANT");
  });

  it("includes event summary in evidence", () => {
    const payload = buildAttestationPayload(event);
    expect(payload.evidence.conjunctionId).toBe("25544-99999-2026-03-15");
    expect(payload.evidence.decision).toBe("MANEUVER");
    expect(payload.evidence.peakPc).toBe(5e-4);
    expect(payload.evidence.cdmCount).toBe(5);
  });
});
```

### Step 3: Write the implementation

```typescript
// src/lib/shield/verity-integration.server.ts
import "server-only";
import type { PrismaClient } from "@prisma/client";
import { logger } from "@/lib/logger";

// ─── Types ──────────────────────────────────────────────────────────────────

interface EventInput {
  id: string;
  conjunctionId: string;
  noradId: string;
  threatNoradId: string;
  riskTier: string;
  status: string;
  decision: string | null;
  decisionBy: string | null;
  decisionAt: Date | null;
  decisionRationale: string | null;
  peakPc: number;
  latestPc: number;
  latestMissDistance: number;
  tca: Date;
  closedAt: Date | null;
  closedReason: string | null;
  cdmCount: number;
  reportGenerated: boolean;
}

interface AttestationPayload {
  regulation_ref: string;
  data_point: string;
  satellite_norad_id: string;
  result: "COMPLIANT" | "NON_COMPLIANT" | "WARNING";
  evidence: Record<string, unknown>;
  expires_in_days: number;
}

// ─── Pure Functions ─────────────────────────────────────────────────────────

export function shouldCreateAttestation(
  status: string,
  decision: string | null,
  existingAttestationId: string | null,
): boolean {
  if (status !== "CLOSED") return false;
  if (!decision) return false;
  if (existingAttestationId) return false;
  return true;
}

export function buildAttestationPayload(event: EventInput): AttestationPayload {
  return {
    regulation_ref: "ca_compliance",
    data_point: "collision_avoidance",
    satellite_norad_id: event.noradId,
    result: "COMPLIANT",
    evidence: {
      conjunctionId: event.conjunctionId,
      threatNoradId: event.threatNoradId,
      riskTier: event.riskTier,
      decision: event.decision,
      decisionBy: event.decisionBy,
      decisionAt: event.decisionAt?.toISOString() ?? null,
      decisionRationale: event.decisionRationale,
      peakPc: event.peakPc,
      latestPc: event.latestPc,
      latestMissDistance: event.latestMissDistance,
      tca: event.tca.toISOString(),
      closedAt: event.closedAt?.toISOString() ?? null,
      closedReason: event.closedReason,
      cdmCount: event.cdmCount,
      reportGenerated: event.reportGenerated,
    },
    expires_in_days: 365,
  };
}

// ─── Database Function ──────────────────────────────────────────────────────

/**
 * Create a Verity attestation for a closed conjunction event.
 * Called after an event is closed with a documented decision.
 * Returns the attestation ID if created, null otherwise.
 */
export async function createCAAttestation(
  prisma: PrismaClient,
  organizationId: string,
  event: EventInput,
): Promise<string | null> {
  if (!shouldCreateAttestation(event.status, event.decision, null)) {
    return null;
  }

  try {
    const payload = buildAttestationPayload(event);

    // Create attestation directly in DB (internal, not via API)
    const attestation = await prisma.verityAttestation.create({
      data: {
        organizationId,
        regulationRef: payload.regulation_ref,
        dataPoint: payload.data_point,
        satelliteNoradId: payload.satellite_norad_id,
        result: payload.result,
        evidence: payload.evidence,
        expiresAt: new Date(Date.now() + payload.expires_in_days * 86400000),
        source: "shield",
      },
    });

    // Link attestation to event
    await prisma.conjunctionEvent.update({
      where: { id: event.id },
      data: { verityAttestationId: attestation.id },
    });

    return attestation.id;
  } catch (error) {
    logger.error("Failed to create CA attestation", {
      eventId: event.id,
      error,
    });
    return null;
  }
}
```

**Important:** The `verityAttestation.create` call depends on the exact Prisma model fields. Read the VerityAttestation model in `prisma/schema.prisma` before implementing to match field names exactly. If fields differ (e.g., `evidence` might not exist, or `source` might not exist), adapt accordingly — the attestation should store the CA evidence in whatever JSON field is available (likely `metadata` or `evidence`).

### Step 4: Run tests

```bash
npx vitest run tests/unit/shield/verity-integration.test.ts
```

### Step 5: Commit

```bash
git add src/lib/shield/verity-integration.server.ts tests/unit/shield/verity-integration.test.ts
git commit -m "feat(shield): add Verity integration for CA attestations on closed events"
```

---

## Task 3: Ephemeris Module Registration + Wiring

**Files:**

- Modify: `src/lib/ephemeris/core/module-registry.ts`
- Modify: `src/lib/ephemeris/core/satellite-compliance-state.ts` (add Shield adapter call)

### What this does

Registers a "Collision Avoidance Compliance" module in the Ephemeris MODULE_REGISTRY for SCO operator types, and wires the Shield adapter into the satellite compliance state calculation.

### Step 1: Read the files first

- Read `src/lib/ephemeris/core/module-registry.ts` to understand the exact structure and where to add the new module
- Read `src/lib/ephemeris/core/satellite-compliance-state.ts` to find where data adapters are called and module scores are built

### Step 2: Add module registration

Add to MODULE_REGISTRY for SCO (Satellite/Constellation Operator):

```typescript
{
  key: "collision_avoidance",
  label: "Collision Avoidance Compliance",
  weight: 15,
  safetyCritical: true,
  regulationRefs: ["eu_space_act_art_63", "eu_space_act_art_64", "iadc_ca_guidelines"],
  requiredDataSources: ["shield"],
  predictionModel: "collision-avoidance-risk",
}
```

This should be added to the SCO array. Also consider adding to ISOS (In-Orbit Servicing) and CAP (Constellation Access Provider) as they also need CA compliance.

### Step 3: Wire Shield adapter into satellite-compliance-state

In the `calculateEntityComplianceState` function (or the sub-function that builds module scores), add a call to `getShieldComplianceFactors()`:

```typescript
import { getShieldComplianceFactors } from "../data/shield-adapter";

// In the data loading section (parallel Promise.all):
const shieldFactor = await getShieldComplianceFactors(prisma, orgId, noradId);

// In the module score building section:
// Add shieldFactor to the collision_avoidance module's factors array
```

The exact integration point depends on how the existing code structures its data loading and module score building. Read the file carefully to find the right insertion points.

### Step 4: Run existing Ephemeris tests to ensure no regression

```bash
npx vitest run tests/unit/shield/ && npm run typecheck 2>&1 | grep -E "shield|ephemeris"
```

### Step 5: Commit

```bash
git add src/lib/ephemeris/core/module-registry.ts src/lib/ephemeris/core/satellite-compliance-state.ts
git commit -m "feat(shield): register collision avoidance module in Ephemeris + wire adapter"
```

---

## Task 4: Scenario Builder — COLLISION_AVOIDANCE Handler

**Files:**

- Modify: `src/lib/ephemeris/simulation/what-if-engine.ts`

### What this does

Adds a handler for the `COLLISION_AVOIDANCE` scenario type (already defined in the WhatIfScenarioType enum). This handler simulates the compliance impact of a collision avoidance maneuver — fuel burn, attitude control, post-maneuver verification.

### Step 1: Read the file

Read `src/lib/ephemeris/simulation/what-if-engine.ts` to understand:

- The `SCENARIO_HANDLERS` registry pattern
- How existing handlers (ORBIT_RAISE, FUEL_BURN, THRUSTER_FAILURE) are structured
- The `WhatIfResult` return type
- What `baselineState` provides

### Step 2: Add the handler

The COLLISION_AVOIDANCE handler should:

1. Accept scenario params: `{ deltaV: number; frequency: number }` (m/s of delta-V per maneuver, maneuvers per year)
2. Calculate fuel impact: `deltaV * frequency * fuelCostPerDeltaV` (estimate fuel percentage consumed)
3. Determine compliance impact:
   - If fuel drops below critical threshold → fuel module goes WARNING/NON_COMPLIANT
   - CA compliance module → COMPLIANT (maneuver planned)
   - EOL compliance may be affected (shorter mission duration)
4. Return `WhatIfResult` with horizon delta, affected regulations, fuel impact, recommendation

### Step 3: Run typecheck

```bash
npm run typecheck 2>&1 | grep "what-if"
```

### Step 4: Commit

```bash
git add src/lib/ephemeris/simulation/what-if-engine.ts
git commit -m "feat(shield): add COLLISION_AVOIDANCE handler to scenario builder"
```

---

## Task 5: CA Digest Cron

**Files:**

- Create: `src/app/api/cron/ca-digest/route.ts`
- Modify: `vercel.json` (add cron schedule)

### What this does

Daily cron (07:30 UTC) that sends a summary email to org members about active Shield conjunction events.

### Step 1: Write the cron route

```typescript
// src/app/api/cron/ca-digest/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { sendEmail, isEmailConfigured } from "@/lib/email";

export const maxDuration = 30;

export async function GET() {
  try {
    const headersList = await headers();
    const authHeader = headersList.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || !authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const valid = timingSafeEqual(Buffer.from(token), Buffer.from(cronSecret));

    if (!valid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isEmailConfigured()) {
      return NextResponse.json({
        message: "Email not configured, skipping digest",
      });
    }

    // Find all orgs with active non-CLOSED events
    const orgsWithEvents = await prisma.conjunctionEvent.groupBy({
      by: ["organizationId"],
      where: { status: { not: "CLOSED" } },
      _count: { id: true },
    });

    let emailsSent = 0;

    for (const org of orgsWithEvents) {
      const events = await prisma.conjunctionEvent.findMany({
        where: {
          organizationId: org.organizationId,
          status: { not: "CLOSED" },
        },
        orderBy: [{ riskTier: "asc" }, { tca: "asc" }],
        take: 20,
      });

      if (events.length === 0) continue;

      const emergencyCount = events.filter(
        (e) => e.riskTier === "EMERGENCY",
      ).length;
      const highCount = events.filter((e) => e.riskTier === "HIGH").length;
      const overdueCount = events.filter(
        (e) => e.status === "ASSESSMENT_REQUIRED" && !e.decision,
      ).length;

      // Build HTML digest
      const html = buildDigestHtml(
        events,
        emergencyCount,
        highCount,
        overdueCount,
      );

      // Get org admins/managers to email
      const members = await prisma.organizationMember.findMany({
        where: {
          organizationId: org.organizationId,
          role: { in: ["OWNER", "ADMIN", "MANAGER"] },
        },
        include: { user: { select: { email: true, id: true } } },
      });

      for (const member of members) {
        if (!member.user.email) continue;
        await sendEmail({
          to: member.user.email,
          subject: `Shield CA Digest: ${events.length} active event(s)${emergencyCount > 0 ? " — EMERGENCY" : ""}`,
          html,
          userId: member.user.id,
          notificationType: "shield_digest",
          entityType: "conjunction_event",
        });
        emailsSent++;
      }
    }

    return NextResponse.json({
      message: "CA digest sent",
      orgsProcessed: orgsWithEvents.length,
      emailsSent,
    });
  } catch (error) {
    logger.error("CA digest cron failed", error);
    return NextResponse.json({ error: "CA digest failed" }, { status: 500 });
  }
}

function buildDigestHtml(
  events: Array<{
    conjunctionId: string;
    riskTier: string;
    status: string;
    tca: Date;
    latestPc: number;
    noradId: string;
    threatNoradId: string;
  }>,
  emergencyCount: number,
  highCount: number,
  overdueCount: number,
): string {
  const tierColor: Record<string, string> = {
    EMERGENCY: "#EF4444",
    HIGH: "#F59E0B",
    ELEVATED: "#EAB308",
    MONITOR: "#3B82F6",
    INFORMATIONAL: "#64748B",
  };

  const eventRows = events
    .slice(0, 10)
    .map(
      (e) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #E2E8F0">
          <span style="color:${tierColor[e.riskTier] ?? "#64748B"};font-weight:bold">${e.riskTier}</span>
        </td>
        <td style="padding:8px;border-bottom:1px solid #E2E8F0">${e.noradId} ↔ ${e.threatNoradId}</td>
        <td style="padding:8px;border-bottom:1px solid #E2E8F0">${e.latestPc.toExponential(2)}</td>
        <td style="padding:8px;border-bottom:1px solid #E2E8F0">${new Date(e.tca).toISOString().slice(0, 16)} UTC</td>
        <td style="padding:8px;border-bottom:1px solid #E2E8F0">${e.status.replace(/_/g, " ")}</td>
      </tr>`,
    )
    .join("");

  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <div style="background:${emergencyCount > 0 ? "#EF4444" : "#1E3A5F"};padding:16px 24px;border-radius:8px 8px 0 0">
        <h1 style="color:white;margin:0;font-size:20px">Shield — Daily CA Digest</h1>
      </div>
      <div style="padding:24px;background:#F8FAFC;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 8px 8px">
        <p style="color:#2D3748;margin:0 0 16px">
          <strong>${events.length}</strong> active conjunction event(s)
          ${emergencyCount > 0 ? ` — <span style="color:#EF4444;font-weight:bold">${emergencyCount} EMERGENCY</span>` : ""}
          ${highCount > 0 ? ` — <span style="color:#F59E0B;font-weight:bold">${highCount} HIGH</span>` : ""}
          ${overdueCount > 0 ? ` — <span style="color:#F59E0B">${overdueCount} pending decision</span>` : ""}
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:13px;color:#2D3748">
          <thead>
            <tr style="background:#EDF2F7">
              <th style="padding:8px;text-align:left">Tier</th>
              <th style="padding:8px;text-align:left">Objects</th>
              <th style="padding:8px;text-align:left">Pc</th>
              <th style="padding:8px;text-align:left">TCA</th>
              <th style="padding:8px;text-align:left">Status</th>
            </tr>
          </thead>
          <tbody>${eventRows}</tbody>
        </table>
        ${events.length > 10 ? `<p style="color:#718096;font-size:12px;margin-top:8px">+ ${events.length - 10} more event(s)</p>` : ""}
        <div style="margin-top:24px;text-align:center">
          <a href="${process.env.NEXT_PUBLIC_APP_URL ?? ""}/dashboard/shield"
             style="background:#10B981;color:white;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block">
            View Shield Dashboard
          </a>
        </div>
        <p style="color:#A0AEC0;font-size:11px;margin-top:24px;text-align:center">
          Generated by Caelex Shield — caelex.eu
        </p>
      </div>
    </div>
  `;
}
```

### Step 2: Add to vercel.json

Add entry to the crons array:

```json
{ "path": "/api/cron/ca-digest", "schedule": "30 7 * * *" }
```

### Step 3: Commit

```bash
git add src/app/api/cron/ca-digest/route.ts vercel.json
git commit -m "feat(shield): add daily CA digest cron with email summary"
```

---

## Task 6: CA Cleanup Cron

**Files:**

- Create: `src/app/api/cron/ca-cleanup/route.ts`
- Modify: `vercel.json` (add cron schedule)

### What this does

Weekly cron (Sunday 02:00 UTC) that cleans up old closed conjunction events by archiving CDM records and removing stale data.

### Implementation

```typescript
// src/app/api/cron/ca-cleanup/route.ts
// Auth: CRON_SECRET Bearer token (same pattern as ca-digest)
// maxDuration: 30

// Logic:
// 1. Find CLOSED events where closedAt > 90 days ago
// 2. For each: delete CDMRecords (raw data no longer needed, event summary preserved)
// 3. Delete CAEscalationLog entries older than 180 days for closed events
// 4. Return stats: { eventsProcessed, cdmsDeleted, logsDeleted }
```

Key points:

- Only delete CDM raw data for events closed > 90 days ago
- Keep the ConjunctionEvent record (summary data) indefinitely
- Keep escalation logs for 180 days for audit trail
- Use `prisma.cDMRecord.deleteMany()` for batch deletion
- Log the cleanup counts

### Add to vercel.json

```json
{ "path": "/api/cron/ca-cleanup", "schedule": "0 2 * * 0" }
```

### Commit

```bash
git add src/app/api/cron/ca-cleanup/route.ts vercel.json
git commit -m "feat(shield): add weekly CA cleanup cron for old CDM data"
```

---

## Task 7: Shield Notifications

**Files:**

- Modify: `src/app/api/cron/cdm-polling/route.ts` (add notification calls)

### What this does

Wire Shield event detection into the existing notification system. When CDM polling creates or escalates events to HIGH or EMERGENCY, notify the organization.

### Step 1: Read the existing CDM polling cron

Read `src/app/api/cron/cdm-polling/route.ts` to understand where new events are created and escalations happen.

### Step 2: Add notification calls

Import the notification service:

```typescript
import { notifyOrganization } from "@/lib/services/notification-service";
```

After creating a new EMERGENCY event or escalating to EMERGENCY/HIGH:

```typescript
if (newTier === "EMERGENCY" || newTier === "HIGH") {
  await notifyOrganization(
    orgId,
    newTier === "EMERGENCY" ? "SHIELD_EMERGENCY" : "SHIELD_HIGH",
    `Shield: ${newTier} Conjunction — ${noradId} ↔ ${threatNoradId}`,
    `Conjunction event ${conjunctionId} classified as ${newTier}. Pc: ${latestPc.toExponential(2)}, TCA: ${tca.toISOString().slice(0, 16)} UTC.`,
    { actionUrl: `/dashboard/shield/${eventId}` },
  ).catch((err) => {
    logger.error("Failed to send Shield notification", err);
  });
}
```

**Important:** The `notifyOrganization` function may need new notification types. Check if it accepts arbitrary type strings or if they need to be registered. If it requires a fixed enum, skip adding the type and use a generic one like `"COMPLIANCE_ACTION_REQUIRED"` instead. Do NOT modify notification-service.ts if it would break other code.

### Step 3: Commit

```bash
git add src/app/api/cron/cdm-polling/route.ts
git commit -m "feat(shield): add notifications for HIGH/EMERGENCY conjunction events"
```

---

## Task 8: Build, Test, Deploy Phase 3

### Step 1: Run all Shield tests

```bash
npx vitest run tests/unit/shield/
```

Expected: All tests pass (79 from Phase 1+2 + new from Phase 3)

### Step 2: Typecheck

```bash
npm run typecheck 2>&1 | grep -i shield
```

Expected: No Shield errors

### Step 3: Build

```bash
npm run build
```

Expected: Build succeeds with all Shield + new cron routes

### Step 4: Verify new routes in build

```bash
npm run build 2>&1 | grep -E "shield|ca-digest|ca-cleanup"
```

Expected: All existing Shield routes + `/api/cron/ca-digest` + `/api/cron/ca-cleanup`

### Step 5: Final commit

```bash
git add -A
git commit -m "feat(shield): Phase 3 complete — Integration + Polish"
```
