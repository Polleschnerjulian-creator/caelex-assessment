# Regulatory Arbitrage Optimizer — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Multi-objective optimization engine that ranks 10 European jurisdictions for satellite registration, with configurable weight profiles, interactive visualizations, and migration paths.

**Architecture:** Engine Extension — new `regulatory-optimizer.server.ts` layered on existing `space-law-engine.server.ts`. Reuses `JURISDICTION_DATA`, `calculateSpaceLawCompliance()`, and `ComparisonMatrix`. Adds parametrizable weights, normalized dimension scoring, and migration path generation. UI is a 3-column dashboard page at `/dashboard/optimizer` with pure SVG charts.

**Tech Stack:** TypeScript, Next.js 15 App Router, Prisma 5, Vitest, `@react-pdf/renderer`, pure SVG (no chart libs), Ephemeris theme + Glass Design System.

---

## Task 1: Prisma Schema — Add OptimizationResult Model

**Files:**

- Modify: `prisma/schema.prisma`

**Step 1: Add the OptimizationResult model to the schema**

Open `prisma/schema.prisma`. Add after the last model (around line 6200+):

```prisma
model OptimizationResult {
  id                  String        @id @default(cuid())
  organizationId      String
  organization        Organization  @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  // Input Snapshot
  inputJson           Json
  weightProfile       String        // "startup" | "enterprise" | "government" | "balanced" | "custom"

  // Re-Flagging Context
  spacecraftId        String?
  spacecraft          Spacecraft?   @relation(fields: [spacecraftId], references: [id])
  currentJurisdiction String?

  // Results
  resultJson          Json
  topJurisdiction     String
  topScore            Float

  createdAt           DateTime      @default(now())

  @@index([organizationId, createdAt])
}
```

Then add the reverse relation fields:

In the `Organization` model (around line 2444), add inside the relations block:

```prisma
  optimizationResults OptimizationResult[]
```

In the `Spacecraft` model (around line 2643), add inside the relations block:

```prisma
  optimizationResults OptimizationResult[]
```

**Step 2: Validate and generate**

Run: `npx prisma validate`
Expected: "The schema is valid."

Run: `npx prisma generate`
Expected: "✔ Generated Prisma Client"

**Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(optimizer): add OptimizationResult prisma model"
```

---

## Task 2: Types & Weight Presets

**Files:**

- Create: `src/lib/optimizer/types.ts`
- Create: `src/lib/optimizer/weight-presets.ts`

**Step 1: Create the types file**

Create `src/lib/optimizer/types.ts`:

```typescript
import type {
  SpaceLawActivityType,
  EntityNationality,
  SpaceLawCountryCode,
} from "@/lib/space-law-types";

// ── Input ─────────────────────────────────────────────────────────

export interface OptimizationInput {
  // Satellite Specs
  activityType: SpaceLawActivityType;
  entityNationality: EntityNationality;
  entitySize: "small" | "medium" | "large";
  primaryOrbit: "LEO" | "MEO" | "GEO" | "beyond";
  constellationSize: number;
  missionDurationYears: number;
  hasDesignForDemise: boolean;

  // Optimization Preferences
  weightProfile: WeightProfileName;
  customWeights?: OptimizationWeights;

  // Re-Flagging Context (optional)
  currentJurisdiction?: SpaceLawCountryCode;
  currentNoradId?: string;
}

export type WeightProfileName =
  | "startup"
  | "enterprise"
  | "government"
  | "balanced"
  | "custom";

export interface OptimizationWeights {
  timeline: number; // 0-100
  cost: number; // 0-100
  compliance: number; // 0-100
  insurance: number; // 0-100
  liability: number; // 0-100
  debrisFlex: number; // 0-100
}

// ── Output ────────────────────────────────────────────────────────

export interface OptimizationOutput {
  rankings: JurisdictionRanking[];
  tradeOffData: TradeOffPoint[];
  migrationPath?: MigrationStep[];
  summary: {
    bestOverall: string;
    bestForTimeline: string;
    bestForCost: string;
    bestForCompliance: string;
  };
}

export interface JurisdictionRanking {
  jurisdiction: SpaceLawCountryCode;
  jurisdictionName: string;
  flagEmoji: string;
  totalScore: number; // 0-100 weighted composite
  dimensionScores: {
    timeline: number;
    cost: number;
    compliance: number;
    insurance: number;
    liability: number;
    debris: number;
  };
  badges: OptimizerBadge[];
  timeline: { min: number; max: number }; // Weeks
  estimatedCost: { application: string; annual: string };
  keyAdvantages: string[];
  keyRisks: string[];
}

export type OptimizerBadge =
  | "BEST_OVERALL"
  | "FASTEST"
  | "CHEAPEST"
  | "MOST_COMPLIANT"
  | "BEST_LIABILITY"
  | "BEST_INSURANCE";

export interface TradeOffPoint {
  jurisdiction: SpaceLawCountryCode;
  x: number; // Normalized cost (0-1)
  y: number; // Compliance score (0-100)
  size: number; // Timeline weeks (for bubble size)
  label: string; // Country name
}

export interface MigrationStep {
  order: number;
  title: string;
  description: string;
  estimatedDuration: string;
  documents: string[];
  cost?: string;
  authority?: string;
}
```

**Step 2: Create the weight presets file**

Create `src/lib/optimizer/weight-presets.ts`:

```typescript
import type { OptimizationWeights, WeightProfileName } from "./types";

export interface WeightPreset {
  name: WeightProfileName;
  label: string;
  description: string;
  weights: OptimizationWeights;
}

export const WEIGHT_PRESETS: Record<
  Exclude<WeightProfileName, "custom">,
  WeightPreset
> = {
  startup: {
    name: "startup",
    label: "Startup",
    description:
      "Optimizes for speed-to-market and low upfront costs. Best for early-stage companies launching first missions.",
    weights: {
      timeline: 35,
      cost: 30,
      compliance: 15,
      insurance: 10,
      liability: 5,
      debrisFlex: 5,
    },
  },
  enterprise: {
    name: "enterprise",
    label: "Enterprise",
    description:
      "Prioritizes regulatory compliance and insurance coverage. Best for established operators with large fleets.",
    weights: {
      timeline: 10,
      cost: 15,
      compliance: 30,
      insurance: 20,
      liability: 15,
      debrisFlex: 10,
    },
  },
  government: {
    name: "government",
    label: "Government",
    description:
      "Maximizes compliance and debris mitigation standards. Best for government and institutional missions.",
    weights: {
      timeline: 5,
      cost: 5,
      compliance: 35,
      insurance: 15,
      liability: 15,
      debrisFlex: 25,
    },
  },
  balanced: {
    name: "balanced",
    label: "Balanced",
    description:
      "Equal weighting across all dimensions. Good starting point for exploring trade-offs.",
    weights: {
      timeline: 20,
      cost: 20,
      compliance: 20,
      insurance: 15,
      liability: 15,
      debrisFlex: 10,
    },
  },
};

/** Normalize weights so they sum to 100. */
export function normalizeWeights(w: OptimizationWeights): OptimizationWeights {
  const sum =
    w.timeline +
    w.cost +
    w.compliance +
    w.insurance +
    w.liability +
    w.debrisFlex;
  if (sum === 0) return WEIGHT_PRESETS.balanced.weights;
  const factor = 100 / sum;
  return {
    timeline: w.timeline * factor,
    cost: w.cost * factor,
    compliance: w.compliance * factor,
    insurance: w.insurance * factor,
    liability: w.liability * factor,
    debrisFlex: w.debrisFlex * factor,
  };
}

/** Resolve a weight profile name to concrete weights. */
export function resolveWeights(
  profile: WeightProfileName,
  customWeights?: OptimizationWeights,
): OptimizationWeights {
  if (profile === "custom" && customWeights) {
    return normalizeWeights(customWeights);
  }
  if (profile === "custom") {
    return WEIGHT_PRESETS.balanced.weights;
  }
  return WEIGHT_PRESETS[profile].weights;
}
```

**Step 3: Run typecheck**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `src/lib/optimizer/`

**Step 4: Commit**

```bash
git add src/lib/optimizer/types.ts src/lib/optimizer/weight-presets.ts
git commit -m "feat(optimizer): add types and weight presets"
```

---

## Task 3: Optimizer Engine — Core Logic

**Files:**

- Create: `src/lib/optimizer/regulatory-optimizer.server.ts`
- Create: `src/lib/optimizer/regulatory-optimizer.server.test.ts`

**Context:**

- The engine reads jurisdiction data from `JURISDICTION_DATA` (Map of 10 `JurisdictionLaw` objects) in `src/data/national-space-laws.ts`
- It calls `calculateSpaceLawCompliance()` from `src/lib/space-law-engine.server.ts` to get per-jurisdiction compliance results
- It then computes 6 normalized dimension scores (0-100) for each jurisdiction, applies user weights, and ranks them

**Step 1: Write the failing test file**

Create `src/lib/optimizer/regulatory-optimizer.server.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  SpaceLawCountryCode,
  JurisdictionLaw,
  SpaceLawComplianceResult,
} from "@/lib/space-law-types";
import type { OptimizationInput } from "./types";

vi.mock("server-only", () => ({}));

// ── Mock jurisdiction data (3 jurisdictions for testing) ──────────

const FR_LAW: JurisdictionLaw = {
  countryCode: "FR",
  countryName: "France",
  flagEmoji: "🇫🇷",
  legislation: {
    name: "Loi relative aux opérations spatiales",
    nameLocal: "Loi relative aux opérations spatiales",
    yearEnacted: 2008,
    status: "enacted",
  },
  licensingAuthority: {
    name: "CNES",
    nameLocal: "CNES",
    website: "https://cnes.fr",
    contactEmail: "contact@cnes.fr",
  },
  licensingRequirements: [],
  applicabilityRules: [],
  insuranceLiability: {
    mandatoryInsurance: true,
    minimumCoverage: "€60,000,000",
    governmentIndemnification: true,
    liabilityRegime: "capped" as const,
    thirdPartyRequired: true,
  },
  debrisMitigation: {
    deorbitRequirement: true,
    deorbitTimeline: "25 years",
    passivationRequired: true,
    debrisMitigationPlan: true,
    collisionAvoidance: true,
  },
  dataSensing: {
    remoteSensingLicense: true,
    dataDistributionRestrictions: false,
  },
  timeline: {
    typicalProcessingWeeks: { min: 12, max: 26 },
    applicationFee: "€80,000",
    annualFee: "€10,000",
  },
  registration: {
    nationalRegistryExists: true,
    unRegistrationRequired: true,
  },
  euSpaceActCrossRef: {
    relationship: "complementary",
    description: "French law complements EU Space Act",
  },
  lastUpdated: "2024-01-01",
};

const LU_LAW: JurisdictionLaw = {
  countryCode: "LU",
  countryName: "Luxembourg",
  flagEmoji: "🇱🇺",
  legislation: {
    name: "Space Law",
    nameLocal: "Loi spatiale",
    yearEnacted: 2020,
    status: "enacted",
  },
  licensingAuthority: {
    name: "LSA",
    nameLocal: "LSA",
    website: "https://space-agency.lu",
    contactEmail: "info@lsa.lu",
  },
  licensingRequirements: [],
  applicabilityRules: [],
  insuranceLiability: {
    mandatoryInsurance: true,
    minimumCoverage: "€20,000,000",
    governmentIndemnification: false,
    liabilityRegime: "negotiable" as const,
    thirdPartyRequired: true,
  },
  debrisMitigation: {
    deorbitRequirement: false,
    passivationRequired: false,
    debrisMitigationPlan: false,
    collisionAvoidance: false,
  },
  dataSensing: {
    remoteSensingLicense: false,
    dataDistributionRestrictions: false,
  },
  timeline: {
    typicalProcessingWeeks: { min: 4, max: 8 },
    applicationFee: "€5,000",
    annualFee: "€2,000",
  },
  registration: {
    nationalRegistryExists: true,
    unRegistrationRequired: true,
  },
  euSpaceActCrossRef: {
    relationship: "complementary",
    description: "Luxembourg law complements EU Space Act",
  },
  lastUpdated: "2024-01-01",
};

const UK_LAW: JurisdictionLaw = {
  countryCode: "UK",
  countryName: "United Kingdom",
  flagEmoji: "🇬🇧",
  legislation: {
    name: "Space Industry Act 2018",
    nameLocal: "Space Industry Act 2018",
    yearEnacted: 2018,
    status: "enacted",
  },
  licensingAuthority: {
    name: "UK CAA",
    nameLocal: "UK CAA",
    website: "https://caa.co.uk",
    contactEmail: "space@caa.co.uk",
  },
  licensingRequirements: [],
  applicabilityRules: [],
  insuranceLiability: {
    mandatoryInsurance: true,
    minimumCoverage: "€100,000,000",
    governmentIndemnification: true,
    indemnificationCap: "Unlimited",
    liabilityRegime: "unlimited" as const,
    thirdPartyRequired: true,
  },
  debrisMitigation: {
    deorbitRequirement: true,
    deorbitTimeline: "25 years",
    passivationRequired: true,
    debrisMitigationPlan: true,
    collisionAvoidance: true,
  },
  dataSensing: {
    remoteSensingLicense: true,
    dataDistributionRestrictions: true,
  },
  timeline: {
    typicalProcessingWeeks: { min: 16, max: 30 },
    applicationFee: "€120,000",
    annualFee: "€15,000",
  },
  registration: {
    nationalRegistryExists: true,
    unRegistrationRequired: true,
  },
  euSpaceActCrossRef: {
    relationship: "parallel",
    description: "UK no longer subject to EU Space Act",
  },
  lastUpdated: "2024-01-01",
};

const MOCK_JURISDICTIONS = new Map<SpaceLawCountryCode, JurisdictionLaw>([
  ["FR", FR_LAW],
  ["LU", LU_LAW],
  ["UK", UK_LAW],
]);

vi.mock("@/data/national-space-laws", () => ({
  JURISDICTION_DATA: MOCK_JURISDICTIONS,
}));

vi.mock("@/lib/space-law-engine.server", () => ({
  calculateSpaceLawCompliance: vi.fn().mockResolvedValue({
    jurisdictions: [
      {
        countryCode: "FR",
        isApplicable: true,
        favorabilityScore: 78,
        authority: { name: "CNES" },
        totalRequirements: 5,
        mandatoryRequirements: 4,
        insurance: { mandatory: true, minimumCoverage: "€60,000,000" },
        debris: { deorbitRequired: true },
        estimatedTimeline: { min: 12, max: 26 },
        estimatedCost: "Application: €80,000 | Annual: €10,000",
      },
      {
        countryCode: "LU",
        isApplicable: true,
        favorabilityScore: 65,
        authority: { name: "LSA" },
        totalRequirements: 3,
        mandatoryRequirements: 2,
        insurance: { mandatory: true, minimumCoverage: "€20,000,000" },
        debris: { deorbitRequired: false },
        estimatedTimeline: { min: 4, max: 8 },
        estimatedCost: "Application: €5,000 | Annual: €2,000",
      },
      {
        countryCode: "UK",
        isApplicable: true,
        favorabilityScore: 60,
        authority: { name: "UK CAA" },
        totalRequirements: 6,
        mandatoryRequirements: 5,
        insurance: { mandatory: true, minimumCoverage: "€100,000,000" },
        debris: { deorbitRequired: true },
        estimatedTimeline: { min: 16, max: 30 },
        estimatedCost: "Application: €120,000 | Annual: €15,000",
      },
    ],
    comparisonMatrix: { criteria: [] },
  } as unknown as SpaceLawComplianceResult),
}));

vi.mock("@/data/space-law-cross-references", () => ({
  SPACE_LAW_CROSS_REFERENCES: [],
}));

const { runOptimization } = await import("./regulatory-optimizer.server");

function defaultInput(
  overrides: Partial<OptimizationInput> = {},
): OptimizationInput {
  return {
    activityType: "spacecraft_operation",
    entityNationality: "domestic",
    entitySize: "medium",
    primaryOrbit: "LEO",
    constellationSize: 1,
    missionDurationYears: 5,
    hasDesignForDemise: true,
    weightProfile: "balanced",
    ...overrides,
  };
}

describe("Regulatory Optimizer Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("runOptimization", () => {
    it("returns rankings for all jurisdictions sorted by total score", async () => {
      const result = await runOptimization(defaultInput());

      expect(result.rankings).toHaveLength(3);
      // Rankings should be sorted descending by totalScore
      for (let i = 1; i < result.rankings.length; i++) {
        expect(result.rankings[i - 1]!.totalScore).toBeGreaterThanOrEqual(
          result.rankings[i]!.totalScore,
        );
      }
    });

    it("includes all 6 dimension scores per jurisdiction", async () => {
      const result = await runOptimization(defaultInput());
      const first = result.rankings[0]!;

      expect(first.dimensionScores).toHaveProperty("timeline");
      expect(first.dimensionScores).toHaveProperty("cost");
      expect(first.dimensionScores).toHaveProperty("compliance");
      expect(first.dimensionScores).toHaveProperty("insurance");
      expect(first.dimensionScores).toHaveProperty("liability");
      expect(first.dimensionScores).toHaveProperty("debris");

      // All dimension scores should be 0-100
      for (const score of Object.values(first.dimensionScores)) {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      }
    });

    it("assigns BEST_OVERALL badge to first-ranked jurisdiction", async () => {
      const result = await runOptimization(defaultInput());

      expect(result.rankings[0]!.badges).toContain("BEST_OVERALL");
      expect(result.rankings[1]!.badges).not.toContain("BEST_OVERALL");
    });

    it("assigns FASTEST badge to jurisdiction with shortest timeline", async () => {
      const result = await runOptimization(defaultInput());
      const fastest = result.rankings.find((r) => r.badges.includes("FASTEST"));

      // LU has min 4 weeks — should be fastest
      expect(fastest?.jurisdiction).toBe("LU");
    });

    it("assigns CHEAPEST badge to lowest-cost jurisdiction", async () => {
      const result = await runOptimization(defaultInput());
      const cheapest = result.rankings.find((r) =>
        r.badges.includes("CHEAPEST"),
      );

      // LU has €5,000 application fee — should be cheapest
      expect(cheapest?.jurisdiction).toBe("LU");
    });

    it("populates summary with best-per-dimension jurisdictions", async () => {
      const result = await runOptimization(defaultInput());

      expect(result.summary.bestOverall).toBeDefined();
      expect(result.summary.bestForTimeline).toBeDefined();
      expect(result.summary.bestForCost).toBeDefined();
      expect(result.summary.bestForCompliance).toBeDefined();
    });

    it("generates trade-off data for scatter plot", async () => {
      const result = await runOptimization(defaultInput());

      expect(result.tradeOffData).toHaveLength(3);
      for (const point of result.tradeOffData) {
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.x).toBeLessThanOrEqual(1);
        expect(point.y).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeLessThanOrEqual(100);
        expect(point.size).toBeGreaterThan(0);
        expect(point.label).toBeTruthy();
      }
    });

    it("respects startup weight profile (favors timeline + cost)", async () => {
      const result = await runOptimization(
        defaultInput({ weightProfile: "startup" }),
      );

      // LU should rank highest for startup: fastest (4 weeks) + cheapest (€5k)
      expect(result.rankings[0]!.jurisdiction).toBe("LU");
    });

    it("includes key advantages and risks", async () => {
      const result = await runOptimization(defaultInput());
      const fr = result.rankings.find((r) => r.jurisdiction === "FR")!;

      expect(fr.keyAdvantages.length).toBeGreaterThan(0);
      // FR has government indemnification → should be an advantage
      expect(
        fr.keyAdvantages.some((a) =>
          a.toLowerCase().includes("indemnification"),
        ),
      ).toBe(true);
    });

    it("generates migration path when currentJurisdiction is provided", async () => {
      const result = await runOptimization(
        defaultInput({ currentJurisdiction: "UK" }),
      );

      expect(result.migrationPath).toBeDefined();
      expect(result.migrationPath!.length).toBeGreaterThan(0);
      expect(result.migrationPath![0]!.order).toBe(1);
      expect(result.migrationPath![0]!.title).toBeTruthy();
    });

    it("omits migration path when no currentJurisdiction", async () => {
      const result = await runOptimization(defaultInput());
      expect(result.migrationPath).toBeUndefined();
    });

    it("includes timeline and cost estimates per jurisdiction", async () => {
      const result = await runOptimization(defaultInput());
      const lu = result.rankings.find((r) => r.jurisdiction === "LU")!;

      expect(lu.timeline).toEqual({ min: 4, max: 8 });
      expect(lu.estimatedCost.application).toContain("5,000");
    });
  });
});
```

**Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/optimizer/regulatory-optimizer.server.test.ts 2>&1 | tail -15`
Expected: FAIL — cannot find module `./regulatory-optimizer.server`

**Step 3: Write the optimizer engine implementation**

Create `src/lib/optimizer/regulatory-optimizer.server.ts`:

```typescript
import "server-only";

import { JURISDICTION_DATA } from "@/data/national-space-laws";
import { calculateSpaceLawCompliance } from "@/lib/space-law-engine.server";
import type {
  SpaceLawCountryCode,
  JurisdictionLaw,
  SpaceLawAssessmentAnswers,
} from "@/lib/space-law-types";
import type {
  OptimizationInput,
  OptimizationOutput,
  OptimizationWeights,
  JurisdictionRanking,
  TradeOffPoint,
  MigrationStep,
  OptimizerBadge,
} from "./types";
import { resolveWeights } from "./weight-presets";

// ── Public API ────────────────────────────────────────────────────

export async function runOptimization(
  input: OptimizationInput,
): Promise<OptimizationOutput> {
  const weights = resolveWeights(input.weightProfile, input.customWeights);
  const allCodes = Array.from(JURISDICTION_DATA.keys());

  // 1. Get compliance results from existing engine
  const answers: SpaceLawAssessmentAnswers = {
    selectedJurisdictions: allCodes,
    activityType: input.activityType,
    entityNationality: input.entityNationality,
    entitySize: input.entitySize,
    primaryOrbit: input.primaryOrbit,
    constellationSize: input.constellationSize,
    licensingStatus: "new_application",
  };

  const complianceResult = await calculateSpaceLawCompliance(answers);

  // 2. Build raw dimension scores per jurisdiction
  const rawScores = allCodes.map((code) => {
    const law = JURISDICTION_DATA.get(code)!;
    const jResult = complianceResult.jurisdictions.find(
      (j) => j.countryCode === code,
    );
    return {
      code,
      law,
      compliance: jResult?.favorabilityScore ?? 0,
      timeline: computeTimelineScore(law),
      cost: computeCostScore(law),
      insurance: computeInsuranceScore(law),
      liability: computeLiabilityScore(law),
      debris: computeDebrisFlexScore(law, input),
    };
  });

  // 3. Normalize each dimension to 0-100 across all jurisdictions
  const normalized = normalizeDimensions(rawScores);

  // 4. Apply weights and rank
  const rankings: JurisdictionRanking[] = normalized
    .map((s) => {
      const totalScore = computeWeightedScore(s.scores, weights);
      return buildRanking(s.code, s.law, s.scores, totalScore);
    })
    .sort((a, b) => b.totalScore - a.totalScore);

  // 5. Assign badges
  assignBadges(rankings);

  // 6. Build trade-off data
  const tradeOffData: TradeOffPoint[] = rankings.map((r) => ({
    jurisdiction: r.jurisdiction,
    x: 1 - r.dimensionScores.cost / 100, // Invert: high cost score → low x
    y: r.dimensionScores.compliance,
    size: (r.timeline.min + r.timeline.max) / 2,
    label: r.jurisdictionName,
  }));

  // 7. Build migration path if re-flagging
  const migrationPath = input.currentJurisdiction
    ? buildMigrationPath(
        input.currentJurisdiction,
        rankings[0]!.jurisdiction,
        rankings[0]!,
      )
    : undefined;

  // 8. Summary
  const summary = {
    bestOverall: rankings[0]!.jurisdiction,
    bestForTimeline: findBestFor(rankings, "timeline"),
    bestForCost: findBestFor(rankings, "cost"),
    bestForCompliance: findBestFor(rankings, "compliance"),
  };

  return { rankings, tradeOffData, migrationPath, summary };
}

// ── Dimension Scoring ─────────────────────────────────────────────

/** Timeline score: lower weeks = higher score. */
function computeTimelineScore(law: JurisdictionLaw): number {
  const avg =
    (law.timeline.typicalProcessingWeeks.min +
      law.timeline.typicalProcessingWeeks.max) /
    2;
  // Map 0-52 weeks to 100-0 score
  return Math.max(0, Math.min(100, 100 - (avg / 52) * 100));
}

/** Cost score: lower total cost = higher score. */
function computeCostScore(law: JurisdictionLaw): number {
  const appFee = parseCurrencyToNumber(law.timeline.applicationFee);
  const annualFee = parseCurrencyToNumber(law.timeline.annualFee);
  const totalCost = appFee + annualFee * 5; // 5-year TCO
  // Map €0-€500k to 100-0
  return Math.max(0, Math.min(100, 100 - (totalCost / 500_000) * 100));
}

/** Insurance score: considers coverage amount, indemnification, regime. */
function computeInsuranceScore(law: JurisdictionLaw): number {
  let score = 50;
  const ins = law.insuranceLiability;

  if (ins.governmentIndemnification) score += 25;
  if (ins.liabilityRegime === "capped") score += 15;
  else if (ins.liabilityRegime === "negotiable") score += 10;
  else if (ins.liabilityRegime === "tiered") score += 5;

  const coverage = parseCurrencyToNumber(ins.minimumCoverage);
  // Lower mandatory coverage = more favorable (less upfront cost)
  if (coverage < 30_000_000) score += 10;
  else if (coverage > 80_000_000) score -= 10;

  return Math.max(0, Math.min(100, score));
}

/** Liability score: capped > tiered > negotiable > unlimited. */
function computeLiabilityScore(law: JurisdictionLaw): number {
  const regimeScores: Record<string, number> = {
    capped: 90,
    tiered: 70,
    negotiable: 50,
    unlimited: 20,
  };
  let score = regimeScores[law.insuranceLiability.liabilityRegime] ?? 50;
  if (law.insuranceLiability.governmentIndemnification) score += 10;
  return Math.max(0, Math.min(100, score));
}

/** Debris flexibility score: fewer mandatory requirements = more flexible. */
function computeDebrisFlexScore(
  law: JurisdictionLaw,
  input: OptimizationInput,
): number {
  let score = 50;
  const debris = law.debrisMitigation;

  // Mandatory debris plan is stricter → lower flex score
  if (!debris.debrisMitigationPlan) score += 20;
  if (!debris.deorbitRequirement) score += 15;
  if (!debris.passivationRequired) score += 10;
  if (!debris.collisionAvoidance) score += 5;

  // If operator already has design-for-demise, strict rules are less burdensome
  if (input.hasDesignForDemise && debris.deorbitRequirement) score += 10;

  return Math.max(0, Math.min(100, score));
}

// ── Normalization ─────────────────────────────────────────────────

interface RawJurisdictionScores {
  code: SpaceLawCountryCode;
  law: JurisdictionLaw;
  timeline: number;
  cost: number;
  compliance: number;
  insurance: number;
  liability: number;
  debris: number;
}

interface NormalizedJurisdictionScores {
  code: SpaceLawCountryCode;
  law: JurisdictionLaw;
  scores: {
    timeline: number;
    cost: number;
    compliance: number;
    insurance: number;
    liability: number;
    debris: number;
  };
}

function normalizeDimensions(
  raw: RawJurisdictionScores[],
): NormalizedJurisdictionScores[] {
  const dims = [
    "timeline",
    "cost",
    "compliance",
    "insurance",
    "liability",
    "debris",
  ] as const;

  // Find min/max per dimension
  const ranges = Object.fromEntries(
    dims.map((d) => {
      const values = raw.map((r) => r[d]);
      return [d, { min: Math.min(...values), max: Math.max(...values) }];
    }),
  ) as Record<(typeof dims)[number], { min: number; max: number }>;

  return raw.map((r) => ({
    code: r.code,
    law: r.law,
    scores: Object.fromEntries(
      dims.map((d) => {
        const range = ranges[d]!;
        const span = range.max - range.min;
        // If all values are the same, give everyone 50
        const normalized = span === 0 ? 50 : ((r[d] - range.min) / span) * 100;
        return [d, Math.round(normalized * 10) / 10];
      }),
    ) as NormalizedJurisdictionScores["scores"],
  }));
}

// ── Weighted Score ────────────────────────────────────────────────

function computeWeightedScore(
  scores: NormalizedJurisdictionScores["scores"],
  weights: OptimizationWeights,
): number {
  const total =
    (scores.timeline * weights.timeline +
      scores.cost * weights.cost +
      scores.compliance * weights.compliance +
      scores.insurance * weights.insurance +
      scores.liability * weights.liability +
      scores.debris * weights.debrisFlex) /
    100;

  return Math.round(total * 10) / 10;
}

// ── Ranking Builder ───────────────────────────────────────────────

function buildRanking(
  code: SpaceLawCountryCode,
  law: JurisdictionLaw,
  scores: NormalizedJurisdictionScores["scores"],
  totalScore: number,
): JurisdictionRanking {
  return {
    jurisdiction: code,
    jurisdictionName: law.countryName,
    flagEmoji: law.flagEmoji,
    totalScore,
    dimensionScores: scores,
    badges: [],
    timeline: law.timeline.typicalProcessingWeeks,
    estimatedCost: {
      application: law.timeline.applicationFee ?? "N/A",
      annual: law.timeline.annualFee ?? "N/A",
    },
    keyAdvantages: computeAdvantages(law),
    keyRisks: computeRisks(law),
  };
}

function computeAdvantages(law: JurisdictionLaw): string[] {
  const adv: string[] = [];
  if (law.insuranceLiability.governmentIndemnification)
    adv.push("Government indemnification available");
  if (law.insuranceLiability.liabilityRegime === "capped")
    adv.push("Capped liability regime");
  if (law.timeline.typicalProcessingWeeks.max <= 12)
    adv.push("Fast processing (under 12 weeks)");
  if (!law.debrisMitigation.debrisMitigationPlan)
    adv.push("No mandatory debris mitigation plan");
  if (law.registration.nationalRegistryExists)
    adv.push("Established national registry");
  const appFee = parseCurrencyToNumber(law.timeline.applicationFee);
  if (appFee > 0 && appFee < 20_000) adv.push("Low application fee");
  return adv;
}

function computeRisks(law: JurisdictionLaw): string[] {
  const risks: string[] = [];
  if (law.insuranceLiability.liabilityRegime === "unlimited")
    risks.push("Unlimited liability exposure");
  if (law.timeline.typicalProcessingWeeks.min > 12)
    risks.push("Long minimum processing time");
  const coverage = parseCurrencyToNumber(
    law.insuranceLiability.minimumCoverage,
  );
  if (coverage >= 80_000_000) risks.push("High minimum insurance coverage");
  if (law.dataSensing.dataDistributionRestrictions)
    risks.push("Data distribution restrictions apply");
  if (
    law.euSpaceActCrossRef.relationship === "parallel" ||
    law.euSpaceActCrossRef.relationship === "gap"
  )
    risks.push("May require dual compliance with EU Space Act");
  return risks;
}

// ── Badges ────────────────────────────────────────────────────────

function assignBadges(rankings: JurisdictionRanking[]): void {
  if (rankings.length === 0) return;

  rankings[0]!.badges.push("BEST_OVERALL");

  const fastest = [...rankings].sort(
    (a, b) => a.timeline.min - b.timeline.min,
  )[0]!;
  fastest.badges.push("FASTEST");

  const cheapest = [...rankings].sort((a, b) => {
    const aCost = parseCurrencyToNumber(a.estimatedCost.application);
    const bCost = parseCurrencyToNumber(b.estimatedCost.application);
    return aCost - bCost;
  })[0]!;
  cheapest.badges.push("CHEAPEST");

  const mostCompliant = [...rankings].sort(
    (a, b) => b.dimensionScores.compliance - a.dimensionScores.compliance,
  )[0]!;
  mostCompliant.badges.push("MOST_COMPLIANT");
}

// ── Migration Path ────────────────────────────────────────────────

function buildMigrationPath(
  fromCode: SpaceLawCountryCode,
  toCode: SpaceLawCountryCode,
  targetRanking: JurisdictionRanking,
): MigrationStep[] {
  const toLaw = JURISDICTION_DATA.get(toCode);
  const fromLaw = JURISDICTION_DATA.get(fromCode);
  if (!toLaw || !fromLaw) return [];

  const steps: MigrationStep[] = [
    {
      order: 1,
      title: "Regulatory Assessment",
      description: `Review ${toLaw.countryName} space law requirements and compare with current ${fromLaw.countryName} obligations.`,
      estimatedDuration: "1-2 weeks",
      documents: [
        "Current license documentation",
        "Mission specification sheet",
      ],
    },
    {
      order: 2,
      title: `Apply to ${toLaw.licensingAuthority.name}`,
      description: `Submit new license application to ${toLaw.licensingAuthority.name} (${toLaw.countryName}).`,
      estimatedDuration: `${toLaw.timeline.typicalProcessingWeeks.min}-${toLaw.timeline.typicalProcessingWeeks.max} weeks`,
      documents: [
        "License application form",
        "Technical documentation",
        "Insurance certificate",
        "Debris mitigation plan",
      ],
      cost: targetRanking.estimatedCost.application,
      authority: toLaw.licensingAuthority.name,
    },
    {
      order: 3,
      title: "Insurance Transfer",
      description: `Arrange insurance coverage meeting ${toLaw.countryName} minimum requirements${toLaw.insuranceLiability.minimumCoverage ? ` (${toLaw.insuranceLiability.minimumCoverage})` : ""}.`,
      estimatedDuration: "2-4 weeks",
      documents: ["Insurance policy proposal", "Coverage confirmation letter"],
    },
    {
      order: 4,
      title: "Registration Transfer",
      description: `Transfer registration from ${fromLaw.countryName} registry to ${toLaw.countryName} registry. Update UN registration.`,
      estimatedDuration: "4-8 weeks",
      documents: [
        "De-registration request (current jurisdiction)",
        "Registration application (new jurisdiction)",
        "UN registration update notification",
      ],
      authority:
        toLaw.registration.registryName ?? toLaw.licensingAuthority.name,
    },
    {
      order: 5,
      title: "Surrender Current License",
      description: `Formally surrender ${fromLaw.countryName} license and confirm transfer completion.`,
      estimatedDuration: "2-4 weeks",
      documents: [
        "License surrender notification",
        "Transfer completion certificate",
      ],
      authority: fromLaw.licensingAuthority.name,
    },
  ];

  return steps;
}

// ── Helpers ───────────────────────────────────────────────────────

function findBestFor(
  rankings: JurisdictionRanking[],
  dim: keyof JurisdictionRanking["dimensionScores"],
): string {
  return [...rankings].sort(
    (a, b) => b.dimensionScores[dim] - a.dimensionScores[dim],
  )[0]!.jurisdiction;
}

function parseCurrencyToNumber(value?: string): number {
  if (!value) return 0;
  const cleaned = value.replace(/[^0-9.]/g, "");
  return parseFloat(cleaned) || 0;
}
```

**Step 4: Run the tests**

Run: `npx vitest run src/lib/optimizer/regulatory-optimizer.server.test.ts 2>&1 | tail -20`
Expected: All tests PASS

**Step 5: Run typecheck**

Run: `npx tsc --noEmit --pretty 2>&1 | grep -i "error" | head -10`
Expected: No errors in optimizer files

**Step 6: Commit**

```bash
git add src/lib/optimizer/regulatory-optimizer.server.ts src/lib/optimizer/regulatory-optimizer.server.test.ts
git commit -m "feat(optimizer): implement core optimization engine with TDD"
```

---

## Task 4: API Route — /api/v1/optimizer/analyze

**Files:**

- Create: `src/app/api/v1/optimizer/analyze/route.ts`
- Create: `src/app/api/v1/optimizer/analyze/route.test.ts`

**Step 1: Write the failing test**

Create `src/app/api/v1/optimizer/analyze/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { OptimizationOutput } from "@/lib/optimizer/types";

vi.mock("server-only", () => ({}));

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: (...a: unknown[]) => mockAuth(...a) }));

const mockPrisma = {
  organizationMember: { findFirst: vi.fn() },
  optimizationResult: { create: vi.fn() },
};
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

const mockRunOptimization = vi.fn();
vi.mock("@/lib/optimizer/regulatory-optimizer.server", () => ({
  runOptimization: (...a: unknown[]) => mockRunOptimization(...a),
}));

vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 9 }),
  getIdentifier: vi.fn().mockReturnValue("test-ip"),
  createRateLimitResponse: vi.fn(),
}));

vi.mock("@/lib/verity/utils/redaction", () => ({
  safeLog: vi.fn(),
}));

import { POST } from "./route";

const MOCK_RESULT: OptimizationOutput = {
  rankings: [
    {
      jurisdiction: "LU",
      jurisdictionName: "Luxembourg",
      flagEmoji: "🇱🇺",
      totalScore: 82.5,
      dimensionScores: {
        timeline: 90,
        cost: 85,
        compliance: 60,
        insurance: 70,
        liability: 50,
        debris: 80,
      },
      badges: ["BEST_OVERALL", "FASTEST", "CHEAPEST"],
      timeline: { min: 4, max: 8 },
      estimatedCost: { application: "€5,000", annual: "€2,000" },
      keyAdvantages: ["Fast processing"],
      keyRisks: [],
    },
  ],
  tradeOffData: [
    { jurisdiction: "LU", x: 0.15, y: 60, size: 6, label: "Luxembourg" },
  ],
  summary: {
    bestOverall: "LU",
    bestForTimeline: "LU",
    bestForCost: "LU",
    bestForCompliance: "FR",
  },
};

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/v1/optimizer/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  activityType: "spacecraft_operation",
  entityNationality: "domestic",
  entitySize: "medium",
  primaryOrbit: "LEO",
  constellationSize: 1,
  missionDurationYears: 5,
  hasDesignForDemise: true,
  weightProfile: "balanced",
};

describe("POST /api/v1/optimizer/analyze", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: { id: "user-1", email: "test@test.com" },
    });
    mockPrisma.organizationMember.findFirst.mockResolvedValue({
      organizationId: "org-1",
    });
    mockRunOptimization.mockResolvedValue(MOCK_RESULT);
    mockPrisma.optimizationResult.create.mockResolvedValue({ id: "opt-1" });
  });

  it("returns 200 with optimization results", async () => {
    const res = await POST(makePost(validBody));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.data.rankings).toHaveLength(1);
    expect(data.data.summary.bestOverall).toBe("LU");
  });

  it("returns 401 without session", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(makePost(validBody));
    expect(res.status).toBe(401);
  });

  it("returns 403 without organization", async () => {
    mockPrisma.organizationMember.findFirst.mockResolvedValue(null);
    const res = await POST(makePost(validBody));
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid body", async () => {
    const res = await POST(makePost({ activityType: "invalid" }));
    expect(res.status).toBe(400);
  });

  it("persists result to database", async () => {
    await POST(makePost(validBody));
    expect(mockPrisma.optimizationResult.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org-1",
        weightProfile: "balanced",
        topJurisdiction: "LU",
      }),
    });
  });

  it("calls engine with parsed input", async () => {
    await POST(makePost(validBody));
    expect(mockRunOptimization).toHaveBeenCalledWith(
      expect.objectContaining({
        activityType: "spacecraft_operation",
        weightProfile: "balanced",
      }),
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/v1/optimizer/analyze/route.test.ts 2>&1 | tail -10`
Expected: FAIL — cannot find module `./route`

**Step 3: Implement the route**

Create `src/app/api/v1/optimizer/analyze/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { safeLog } from "@/lib/verity/utils/redaction";
import { runOptimization } from "@/lib/optimizer/regulatory-optimizer.server";
import type {
  OptimizationInput,
  WeightProfileName,
} from "@/lib/optimizer/types";
import type {
  SpaceLawActivityType,
  EntityNationality,
  SpaceLawCountryCode,
} from "@/lib/space-law-types";

const VALID_ACTIVITY_TYPES: SpaceLawActivityType[] = [
  "spacecraft_operation",
  "launch_vehicle",
  "launch_site",
  "in_orbit_services",
  "earth_observation",
  "satellite_communications",
  "space_resources",
];

const VALID_NATIONALITIES: EntityNationality[] = [
  "domestic",
  "eu_other",
  "non_eu",
  "esa_member",
];

const VALID_SIZES = ["small", "medium", "large"] as const;
const VALID_ORBITS = ["LEO", "MEO", "GEO", "beyond"] as const;
const VALID_PROFILES: WeightProfileName[] = [
  "startup",
  "enterprise",
  "government",
  "balanced",
  "custom",
];

export async function POST(request: NextRequest) {
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
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = parseInput(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.issues },
        { status: 400 },
      );
    }

    const result = await runOptimization(parsed.data);

    // Persist result
    await prisma.optimizationResult.create({
      data: {
        organizationId: membership.organizationId,
        inputJson: body as object,
        weightProfile: parsed.data.weightProfile,
        spacecraftId: null,
        currentJurisdiction: parsed.data.currentJurisdiction ?? null,
        resultJson: result as unknown as object,
        topJurisdiction: result.rankings[0]?.jurisdiction ?? "N/A",
        topScore: result.rankings[0]?.totalScore ?? 0,
      },
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    safeLog("Optimizer analyze error", {
      error: error instanceof Error ? error.message : "Unknown",
    });
    return NextResponse.json({ error: "Optimization failed" }, { status: 500 });
  }
}

// ── Input Validation ──────────────────────────────────────────────

function parseInput(
  body: unknown,
):
  | { success: true; data: OptimizationInput }
  | { success: false; issues: string[] } {
  if (!body || typeof body !== "object") {
    return { success: false, issues: ["Body must be a JSON object"] };
  }

  const b = body as Record<string, unknown>;
  const issues: string[] = [];

  if (!VALID_ACTIVITY_TYPES.includes(b.activityType as SpaceLawActivityType)) {
    issues.push(
      `activityType must be one of: ${VALID_ACTIVITY_TYPES.join(", ")}`,
    );
  }
  if (!VALID_NATIONALITIES.includes(b.entityNationality as EntityNationality)) {
    issues.push(
      `entityNationality must be one of: ${VALID_NATIONALITIES.join(", ")}`,
    );
  }
  if (!VALID_SIZES.includes(b.entitySize as (typeof VALID_SIZES)[number])) {
    issues.push(`entitySize must be one of: ${VALID_SIZES.join(", ")}`);
  }
  if (!VALID_ORBITS.includes(b.primaryOrbit as (typeof VALID_ORBITS)[number])) {
    issues.push(`primaryOrbit must be one of: ${VALID_ORBITS.join(", ")}`);
  }
  if (typeof b.constellationSize !== "number" || b.constellationSize < 1) {
    issues.push("constellationSize must be a positive number");
  }
  if (
    typeof b.missionDurationYears !== "number" ||
    b.missionDurationYears < 1
  ) {
    issues.push("missionDurationYears must be a positive number");
  }
  if (typeof b.hasDesignForDemise !== "boolean") {
    issues.push("hasDesignForDemise must be a boolean");
  }
  if (!VALID_PROFILES.includes(b.weightProfile as WeightProfileName)) {
    issues.push(`weightProfile must be one of: ${VALID_PROFILES.join(", ")}`);
  }

  if (issues.length > 0) return { success: false, issues };

  return {
    success: true,
    data: {
      activityType: b.activityType as SpaceLawActivityType,
      entityNationality: b.entityNationality as EntityNationality,
      entitySize: b.entitySize as "small" | "medium" | "large",
      primaryOrbit: b.primaryOrbit as "LEO" | "MEO" | "GEO" | "beyond",
      constellationSize: b.constellationSize as number,
      missionDurationYears: b.missionDurationYears as number,
      hasDesignForDemise: b.hasDesignForDemise as boolean,
      weightProfile: b.weightProfile as WeightProfileName,
      customWeights: b.customWeights as OptimizationInput["customWeights"],
      currentJurisdiction: b.currentJurisdiction as
        | SpaceLawCountryCode
        | undefined,
      currentNoradId: b.currentNoradId as string | undefined,
    },
  };
}
```

**Step 4: Run tests**

Run: `npx vitest run src/app/api/v1/optimizer/analyze/route.test.ts 2>&1 | tail -15`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/app/api/v1/optimizer/analyze/
git commit -m "feat(optimizer): add /api/v1/optimizer/analyze endpoint with TDD"
```

---

## Task 5: API Route — /api/v1/optimizer/presets

**Files:**

- Create: `src/app/api/v1/optimizer/presets/route.ts`

**Step 1: Implement the presets endpoint**

Create `src/app/api/v1/optimizer/presets/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { WEIGHT_PRESETS } from "@/lib/optimizer/weight-presets";

export async function GET() {
  const presets = Object.values(WEIGHT_PRESETS).map((p) => ({
    name: p.name,
    label: p.label,
    description: p.description,
    weights: p.weights,
  }));

  return NextResponse.json({ data: presets });
}
```

**Step 2: Run typecheck**

Run: `npx tsc --noEmit --pretty 2>&1 | grep "optimizer" | head -5`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/api/v1/optimizer/presets/
git commit -m "feat(optimizer): add /api/v1/optimizer/presets endpoint"
```

---

## Task 6: API Route — /api/v1/optimizer/history

**Files:**

- Create: `src/app/api/v1/optimizer/history/route.ts`

**Step 1: Implement the history endpoint**

Create `src/app/api/v1/optimizer/history/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { safeLog } from "@/lib/verity/utils/redaction";

export async function GET(request: NextRequest) {
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
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    const limit = Math.min(
      parseInt(request.nextUrl.searchParams.get("limit") ?? "20", 10),
      50,
    );

    const results = await prisma.optimizationResult.findMany({
      where: { organizationId: membership.organizationId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        weightProfile: true,
        topJurisdiction: true,
        topScore: true,
        createdAt: true,
        inputJson: true,
      },
    });

    return NextResponse.json({ data: results });
  } catch (error) {
    safeLog("Optimizer history error", {
      error: error instanceof Error ? error.message : "Unknown",
    });
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 },
    );
  }
}
```

**Step 2: Run typecheck**

Run: `npx tsc --noEmit --pretty 2>&1 | grep "optimizer" | head -5`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/api/v1/optimizer/history/
git commit -m "feat(optimizer): add /api/v1/optimizer/history endpoint"
```

---

## Task 7: UI — SVG Radar Chart Component

**Files:**

- Create: `src/components/optimizer/RadarChart.tsx`

**Step 1: Implement the SVG radar chart**

Create `src/components/optimizer/RadarChart.tsx`:

```tsx
"use client";

import { useMemo } from "react";

interface RadarChartProps {
  scores: {
    timeline: number;
    cost: number;
    compliance: number;
    insurance: number;
    liability: number;
    debris: number;
  };
  size?: number;
  color?: string;
}

const AXES = [
  { key: "timeline", label: "Timeline" },
  { key: "cost", label: "Cost" },
  { key: "compliance", label: "Compliance" },
  { key: "insurance", label: "Insurance" },
  { key: "liability", label: "Liability" },
  { key: "debris", label: "Debris" },
] as const;

const LEVELS = [20, 40, 60, 80, 100];

export default function RadarChart({
  scores,
  size = 240,
  color = "#10B981",
}: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 32;

  const angleStep = (2 * Math.PI) / AXES.length;
  const startAngle = -Math.PI / 2; // Start from top

  const getPoint = useMemo(
    () => (axisIndex: number, value: number) => {
      const angle = startAngle + axisIndex * angleStep;
      const r = (value / 100) * radius;
      return {
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
      };
    },
    [cx, cy, radius, angleStep],
  );

  // Grid rings
  const gridRings = LEVELS.map((level) => {
    const points = AXES.map((_, i) => {
      const p = getPoint(i, level);
      return `${p.x},${p.y}`;
    }).join(" ");
    return { level, points };
  });

  // Data polygon
  const dataPoints = AXES.map((axis, i) => {
    const p = getPoint(i, scores[axis.key]);
    return `${p.x},${p.y}`;
  }).join(" ");

  // Axis lines and labels
  const axisLines = AXES.map((axis, i) => {
    const endPoint = getPoint(i, 100);
    const labelPoint = getPoint(i, 118);
    return { axis, endPoint, labelPoint };
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="overflow-visible"
    >
      {/* Grid rings */}
      {gridRings.map(({ level, points }) => (
        <polygon
          key={level}
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth={0.5}
          className="text-slate-700"
          opacity={0.3}
        />
      ))}

      {/* Axis lines */}
      {axisLines.map(({ axis, endPoint }) => (
        <line
          key={axis.key}
          x1={cx}
          y1={cy}
          x2={endPoint.x}
          y2={endPoint.y}
          stroke="currentColor"
          strokeWidth={0.5}
          className="text-slate-700"
          opacity={0.3}
        />
      ))}

      {/* Data polygon */}
      <polygon
        points={dataPoints}
        fill={color}
        fillOpacity={0.15}
        stroke={color}
        strokeWidth={2}
      />

      {/* Data points */}
      {AXES.map((axis, i) => {
        const p = getPoint(i, scores[axis.key]);
        return <circle key={axis.key} cx={p.x} cy={p.y} r={3} fill={color} />;
      })}

      {/* Labels */}
      {axisLines.map(({ axis, labelPoint }) => (
        <text
          key={axis.key}
          x={labelPoint.x}
          y={labelPoint.y}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-slate-400"
          style={{ fontSize: "10px", fontFamily: "IBM Plex Mono, monospace" }}
        >
          {axis.label}
        </text>
      ))}
    </svg>
  );
}
```

**Step 2: Run typecheck**

Run: `npx tsc --noEmit --pretty 2>&1 | grep "RadarChart" | head -5`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/optimizer/RadarChart.tsx
git commit -m "feat(optimizer): add SVG radar chart component"
```

---

## Task 8: UI — SVG Trade-off Scatter Plot

**Files:**

- Create: `src/components/optimizer/TradeOffChart.tsx`

**Step 1: Implement the SVG scatter plot**

Create `src/components/optimizer/TradeOffChart.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { TradeOffPoint } from "@/lib/optimizer/types";
import type { SpaceLawCountryCode } from "@/lib/space-law-types";

interface TradeOffChartProps {
  data: TradeOffPoint[];
  selectedJurisdiction?: SpaceLawCountryCode;
  onSelect: (jurisdiction: SpaceLawCountryCode) => void;
  accentColor?: string;
}

const WIDTH = 600;
const HEIGHT = 400;
const PADDING = { top: 24, right: 24, bottom: 48, left: 56 };
const PLOT_W = WIDTH - PADDING.left - PADDING.right;
const PLOT_H = HEIGHT - PADDING.top - PADDING.bottom;

export default function TradeOffChart({
  data,
  selectedJurisdiction,
  onSelect,
  accentColor = "#10B981",
}: TradeOffChartProps) {
  const [hovered, setHovered] = useState<SpaceLawCountryCode | null>(null);

  const scaleX = (v: number) => PADDING.left + v * PLOT_W;
  const scaleY = (v: number) => PADDING.top + PLOT_H - (v / 100) * PLOT_H;
  const scaleR = (weeks: number) => Math.max(6, Math.min(24, 30 - weeks));

  // Grid lines
  const xTicks = [0, 0.25, 0.5, 0.75, 1];
  const yTicks = [0, 25, 50, 75, 100];

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="overflow-visible"
    >
      {/* Grid */}
      {xTicks.map((t) => (
        <line
          key={`xg-${t}`}
          x1={scaleX(t)}
          y1={PADDING.top}
          x2={scaleX(t)}
          y2={PADDING.top + PLOT_H}
          stroke="currentColor"
          strokeWidth={0.5}
          className="text-slate-700"
          opacity={0.2}
        />
      ))}
      {yTicks.map((t) => (
        <line
          key={`yg-${t}`}
          x1={PADDING.left}
          y1={scaleY(t)}
          x2={PADDING.left + PLOT_W}
          y2={scaleY(t)}
          stroke="currentColor"
          strokeWidth={0.5}
          className="text-slate-700"
          opacity={0.2}
        />
      ))}

      {/* Axis labels */}
      {xTicks.map((t) => (
        <text
          key={`xl-${t}`}
          x={scaleX(t)}
          y={HEIGHT - 8}
          textAnchor="middle"
          className="fill-slate-500"
          style={{ fontSize: "10px", fontFamily: "IBM Plex Mono, monospace" }}
        >
          {t === 0 ? "Low" : t === 1 ? "High" : ""}
        </text>
      ))}
      {yTicks.map((t) => (
        <text
          key={`yl-${t}`}
          x={PADDING.left - 8}
          y={scaleY(t) + 3}
          textAnchor="end"
          className="fill-slate-500"
          style={{ fontSize: "10px", fontFamily: "IBM Plex Mono, monospace" }}
        >
          {t}
        </text>
      ))}

      {/* Axis titles */}
      <text
        x={PADDING.left + PLOT_W / 2}
        y={HEIGHT - 0}
        textAnchor="middle"
        className="fill-slate-400"
        style={{ fontSize: "11px", fontFamily: "IBM Plex Mono, monospace" }}
      >
        Cost →
      </text>
      <text
        x={12}
        y={PADDING.top + PLOT_H / 2}
        textAnchor="middle"
        className="fill-slate-400"
        style={{
          fontSize: "11px",
          fontFamily: "IBM Plex Mono, monospace",
          writingMode: "vertical-rl",
        }}
        transform={`rotate(-90, 12, ${PADDING.top + PLOT_H / 2})`}
      >
        Compliance →
      </text>

      {/* Data bubbles */}
      {data.map((point) => {
        const isSelected = point.jurisdiction === selectedJurisdiction;
        const isHovered = point.jurisdiction === hovered;
        const r = scaleR(point.size);

        return (
          <g
            key={point.jurisdiction}
            onMouseEnter={() => setHovered(point.jurisdiction)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onSelect(point.jurisdiction)}
            style={{ cursor: "pointer" }}
          >
            <circle
              cx={scaleX(point.x)}
              cy={scaleY(point.y)}
              r={r}
              fill={isSelected ? accentColor : "#64748B"}
              fillOpacity={isSelected ? 0.8 : 0.5}
              stroke={isSelected ? accentColor : isHovered ? "#94A3B8" : "none"}
              strokeWidth={isSelected ? 2 : isHovered ? 1.5 : 0}
            />
            <text
              x={scaleX(point.x)}
              y={scaleY(point.y) - r - 4}
              textAnchor="middle"
              className="fill-slate-300"
              style={{
                fontSize: "10px",
                fontFamily: "IBM Plex Mono, monospace",
                opacity: isSelected || isHovered ? 1 : 0.6,
              }}
            >
              {point.jurisdiction}
            </text>

            {/* Tooltip on hover */}
            {isHovered && (
              <g>
                <rect
                  x={scaleX(point.x) + r + 6}
                  y={scaleY(point.y) - 28}
                  width={140}
                  height={56}
                  rx={4}
                  className="fill-navy-800"
                  stroke="currentColor"
                  strokeWidth={0.5}
                />
                <text
                  x={scaleX(point.x) + r + 14}
                  y={scaleY(point.y) - 12}
                  className="fill-slate-200"
                  style={{
                    fontSize: "11px",
                    fontFamily: "IBM Plex Mono, monospace",
                    fontWeight: 600,
                  }}
                >
                  {point.label}
                </text>
                <text
                  x={scaleX(point.x) + r + 14}
                  y={scaleY(point.y) + 4}
                  className="fill-slate-400"
                  style={{
                    fontSize: "10px",
                    fontFamily: "IBM Plex Mono, monospace",
                  }}
                >
                  Compliance: {point.y.toFixed(0)}
                </text>
                <text
                  x={scaleX(point.x) + r + 14}
                  y={scaleY(point.y) + 18}
                  className="fill-slate-400"
                  style={{
                    fontSize: "10px",
                    fontFamily: "IBM Plex Mono, monospace",
                  }}
                >
                  ~{point.size.toFixed(0)} weeks
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
```

**Step 2: Run typecheck**

Run: `npx tsc --noEmit --pretty 2>&1 | grep "TradeOffChart" | head -5`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/optimizer/TradeOffChart.tsx
git commit -m "feat(optimizer): add SVG trade-off scatter plot component"
```

---

## Task 9: UI — Rankings List Component

**Files:**

- Create: `src/components/optimizer/RankingsList.tsx`

**Step 1: Implement the rankings list**

Create `src/components/optimizer/RankingsList.tsx`:

```tsx
"use client";

import type { JurisdictionRanking } from "@/lib/optimizer/types";
import type { SpaceLawCountryCode } from "@/lib/space-law-types";

interface RankingsListProps {
  rankings: JurisdictionRanking[];
  selectedJurisdiction?: SpaceLawCountryCode;
  onSelect: (jurisdiction: SpaceLawCountryCode) => void;
  accentColor?: string;
}

const BADGE_LABELS: Record<string, string> = {
  BEST_OVERALL: "Best Overall",
  FASTEST: "Fastest",
  CHEAPEST: "Cheapest",
  MOST_COMPLIANT: "Most Compliant",
  BEST_LIABILITY: "Best Liability",
  BEST_INSURANCE: "Best Insurance",
};

const BADGE_COLORS: Record<string, string> = {
  BEST_OVERALL: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  FASTEST: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  CHEAPEST: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  MOST_COMPLIANT: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  BEST_LIABILITY: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  BEST_INSURANCE: "bg-pink-500/20 text-pink-400 border-pink-500/30",
};

export default function RankingsList({
  rankings,
  selectedJurisdiction,
  onSelect,
  accentColor = "#10B981",
}: RankingsListProps) {
  return (
    <div className="space-y-2">
      {rankings.map((r, index) => {
        const isSelected = r.jurisdiction === selectedJurisdiction;
        const isTop3 = index < 3;

        return (
          <button
            key={r.jurisdiction}
            onClick={() => onSelect(r.jurisdiction)}
            className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
              isSelected
                ? "glass-elevated glass-accent border-emerald-500/40"
                : isTop3
                  ? "glass-elevated border-white/10 hover:border-white/20"
                  : "glass-surface border-white/5 hover:border-white/10"
            }`}
          >
            <div className="flex items-center gap-3">
              {/* Rank number */}
              <span
                className="text-xs font-mono w-5 text-center"
                style={{ color: isTop3 ? accentColor : "#64748B" }}
              >
                {index + 1}
              </span>

              {/* Flag + Name */}
              <span className="text-lg">{r.flagEmoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-200 truncate">
                    {r.jurisdictionName}
                  </span>
                  <span className="text-xs font-mono text-slate-500">
                    {r.jurisdiction}
                  </span>
                </div>

                {/* Badges */}
                {r.badges.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {r.badges.map((badge) => (
                      <span
                        key={badge}
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${BADGE_COLORS[badge] ?? "bg-slate-500/20 text-slate-400 border-slate-500/30"}`}
                      >
                        {BADGE_LABELS[badge] ?? badge}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Score */}
              <div className="text-right">
                <div
                  className="text-lg font-mono font-semibold"
                  style={{ color: isTop3 ? accentColor : "#94A3B8" }}
                >
                  {r.totalScore.toFixed(1)}
                </div>
                <div className="text-[10px] font-mono text-slate-500">
                  / 100
                </div>
              </div>
            </div>

            {/* Score bar */}
            <div className="mt-2 h-1 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${r.totalScore}%`,
                  backgroundColor: isTop3 ? accentColor : "#475569",
                }}
              />
            </div>

            {/* Mini dimension breakdown */}
            <div className="mt-2 grid grid-cols-6 gap-1">
              {(
                [
                  "timeline",
                  "cost",
                  "compliance",
                  "insurance",
                  "liability",
                  "debris",
                ] as const
              ).map((dim) => (
                <div key={dim} className="text-center">
                  <div className="text-[9px] font-mono text-slate-600 truncate">
                    {dim.slice(0, 4)}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    {r.dimensionScores[dim].toFixed(0)}
                  </div>
                </div>
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}
```

**Step 2: Run typecheck**

Run: `npx tsc --noEmit --pretty 2>&1 | grep "RankingsList" | head -5`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/optimizer/RankingsList.tsx
git commit -m "feat(optimizer): add rankings list component"
```

---

## Task 10: UI — Input Panel, Detail Panel, and Dashboard Page

**Files:**

- Create: `src/components/optimizer/InputPanel.tsx`
- Create: `src/components/optimizer/DetailPanel.tsx`
- Create: `src/app/dashboard/optimizer/page.tsx`

This is the largest task — it wires everything together.

**Step 1: Create the Input Panel**

Create `src/components/optimizer/InputPanel.tsx`:

```tsx
"use client";

import { useState } from "react";
import type {
  OptimizationInput,
  OptimizationWeights,
  WeightProfileName,
} from "@/lib/optimizer/types";
import type {
  SpaceLawActivityType,
  EntityNationality,
} from "@/lib/space-law-types";
import { WEIGHT_PRESETS } from "@/lib/optimizer/weight-presets";

interface InputPanelProps {
  onAnalyze: (input: OptimizationInput) => void;
  isLoading: boolean;
  accentColor?: string;
}

const ACTIVITY_OPTIONS: { value: SpaceLawActivityType; label: string }[] = [
  { value: "spacecraft_operation", label: "Spacecraft Operation" },
  { value: "launch_vehicle", label: "Launch Vehicle" },
  { value: "launch_site", label: "Launch Site" },
  { value: "in_orbit_services", label: "In-Orbit Services" },
  { value: "earth_observation", label: "Earth Observation" },
  { value: "satellite_communications", label: "Satellite Communications" },
  { value: "space_resources", label: "Space Resources" },
];

const ORBIT_OPTIONS = [
  { value: "LEO", label: "LEO" },
  { value: "MEO", label: "MEO" },
  { value: "GEO", label: "GEO" },
  { value: "beyond", label: "Beyond GEO" },
] as const;

export default function InputPanel({
  onAnalyze,
  isLoading,
  accentColor = "#10B981",
}: InputPanelProps) {
  const [activityType, setActivityType] = useState<SpaceLawActivityType>(
    "spacecraft_operation",
  );
  const [entityNationality, setEntityNationality] =
    useState<EntityNationality>("domestic");
  const [entitySize, setEntitySize] = useState<"small" | "medium" | "large">(
    "medium",
  );
  const [primaryOrbit, setPrimaryOrbit] = useState<
    "LEO" | "MEO" | "GEO" | "beyond"
  >("LEO");
  const [constellationSize, setConstellationSize] = useState(1);
  const [missionDuration, setMissionDuration] = useState(5);
  const [hasDesignForDemise, setHasDesignForDemise] = useState(true);
  const [weightProfile, setWeightProfile] =
    useState<WeightProfileName>("balanced");
  const [customWeights, setCustomWeights] = useState<OptimizationWeights>({
    timeline: 20,
    cost: 20,
    compliance: 20,
    insurance: 15,
    liability: 15,
    debrisFlex: 10,
  });
  const [isReFlagging, setIsReFlagging] = useState(false);
  const [currentJurisdiction, setCurrentJurisdiction] = useState("");

  const handleSubmit = () => {
    const input: OptimizationInput = {
      activityType,
      entityNationality,
      entitySize,
      primaryOrbit,
      constellationSize,
      missionDurationYears: missionDuration,
      hasDesignForDemise,
      weightProfile,
      customWeights: weightProfile === "custom" ? customWeights : undefined,
      currentJurisdiction:
        isReFlagging && currentJurisdiction
          ? (currentJurisdiction as OptimizationInput["currentJurisdiction"])
          : undefined,
    };
    onAnalyze(input);
  };

  const handleSliderChange = (
    key: keyof OptimizationWeights,
    value: number,
  ) => {
    setCustomWeights((prev) => ({ ...prev, [key]: value }));
  };

  const selectClass =
    "w-full px-3 py-2 rounded-lg glass-surface border border-white/10 text-sm text-slate-200 bg-transparent font-mono focus:outline-none focus:border-emerald-500/50";
  const labelClass =
    "block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1";

  return (
    <div className="space-y-5">
      {/* Mission Specs */}
      <div>
        <h3
          className="text-xs font-mono uppercase tracking-widest mb-3"
          style={{ color: accentColor }}
        >
          Mission Specs
        </h3>

        <div className="space-y-3">
          <div>
            <label className={labelClass}>Activity Type</label>
            <select
              value={activityType}
              onChange={(e) =>
                setActivityType(e.target.value as SpaceLawActivityType)
              }
              className={selectClass}
            >
              {ACTIVITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Orbit</label>
            <div className="grid grid-cols-4 gap-1">
              {ORBIT_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => setPrimaryOrbit(o.value)}
                  className={`px-2 py-1.5 rounded text-xs font-mono border transition-all ${
                    primaryOrbit === o.value
                      ? "border-emerald-500/50 text-emerald-400 bg-emerald-500/10"
                      : "border-white/10 text-slate-400 hover:border-white/20"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass}>Entity Size</label>
            <div className="grid grid-cols-3 gap-1">
              {(["small", "medium", "large"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setEntitySize(s)}
                  className={`px-2 py-1.5 rounded text-xs font-mono border capitalize transition-all ${
                    entitySize === s
                      ? "border-emerald-500/50 text-emerald-400 bg-emerald-500/10"
                      : "border-white/10 text-slate-400 hover:border-white/20"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass}>Entity Nationality</label>
            <select
              value={entityNationality}
              onChange={(e) =>
                setEntityNationality(e.target.value as EntityNationality)
              }
              className={selectClass}
            >
              <option value="domestic">Domestic (EU)</option>
              <option value="eu_other">Other EU Member</option>
              <option value="non_eu">Non-EU</option>
              <option value="esa_member">ESA Member</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Constellation</label>
              <input
                type="number"
                min={1}
                value={constellationSize}
                onChange={(e) =>
                  setConstellationSize(parseInt(e.target.value) || 1)
                }
                className={selectClass}
              />
            </div>
            <div>
              <label className={labelClass}>Duration (yr)</label>
              <input
                type="number"
                min={1}
                value={missionDuration}
                onChange={(e) =>
                  setMissionDuration(parseInt(e.target.value) || 1)
                }
                className={selectClass}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hasDesignForDemise}
              onChange={(e) => setHasDesignForDemise(e.target.checked)}
              className="rounded border-white/20 bg-transparent text-emerald-500 focus:ring-emerald-500/50"
            />
            <span className="text-xs text-slate-400 font-mono">
              Design for Demise
            </span>
          </label>
        </div>
      </div>

      {/* Weight Profile */}
      <div>
        <h3
          className="text-xs font-mono uppercase tracking-widest mb-3"
          style={{ color: accentColor }}
        >
          Weight Profile
        </h3>

        <div className="grid grid-cols-2 gap-1.5">
          {(
            Object.keys(WEIGHT_PRESETS) as Array<keyof typeof WEIGHT_PRESETS>
          ).map((key) => (
            <button
              key={key}
              onClick={() => setWeightProfile(key)}
              className={`px-3 py-2 rounded-lg text-xs font-mono border transition-all ${
                weightProfile === key
                  ? "border-emerald-500/50 text-emerald-400 bg-emerald-500/10"
                  : "border-white/10 text-slate-400 hover:border-white/20"
              }`}
            >
              {WEIGHT_PRESETS[key].label}
            </button>
          ))}
          <button
            onClick={() => setWeightProfile("custom")}
            className={`px-3 py-2 rounded-lg text-xs font-mono border col-span-2 transition-all ${
              weightProfile === "custom"
                ? "border-emerald-500/50 text-emerald-400 bg-emerald-500/10"
                : "border-white/10 text-slate-400 hover:border-white/20"
            }`}
          >
            Custom
          </button>
        </div>

        {/* Custom sliders */}
        {weightProfile === "custom" && (
          <div className="mt-3 space-y-2">
            {(
              [
                { key: "timeline", label: "Timeline" },
                { key: "cost", label: "Cost" },
                { key: "compliance", label: "Compliance" },
                { key: "insurance", label: "Insurance" },
                { key: "liability", label: "Liability" },
                { key: "debrisFlex", label: "Debris Flex" },
              ] as const
            ).map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-500 w-16 shrink-0">
                  {label}
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={customWeights[key]}
                  onChange={(e) =>
                    handleSliderChange(key, parseInt(e.target.value))
                  }
                  className="flex-1 h-1 accent-emerald-500"
                />
                <span className="text-[10px] font-mono text-slate-400 w-6 text-right">
                  {customWeights[key]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Re-Flagging Toggle */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer mb-2">
          <input
            type="checkbox"
            checked={isReFlagging}
            onChange={(e) => setIsReFlagging(e.target.checked)}
            className="rounded border-white/20 bg-transparent text-emerald-500 focus:ring-emerald-500/50"
          />
          <span className="text-xs text-slate-400 font-mono">
            Existing Satellite (Re-Flagging)
          </span>
        </label>

        {isReFlagging && (
          <div>
            <label className={labelClass}>Current Jurisdiction</label>
            <select
              value={currentJurisdiction}
              onChange={(e) => setCurrentJurisdiction(e.target.value)}
              className={selectClass}
            >
              <option value="">Select...</option>
              {["FR", "UK", "BE", "NL", "LU", "AT", "DK", "DE", "IT", "NO"].map(
                (code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ),
              )}
            </select>
          </div>
        )}
      </div>

      {/* Analyze Button */}
      <button
        onClick={handleSubmit}
        disabled={isLoading}
        className="w-full py-3 rounded-lg font-mono text-sm font-semibold text-white transition-all disabled:opacity-50"
        style={{ backgroundColor: accentColor }}
      >
        {isLoading ? "Analyzing..." : "Analyze"}
      </button>
    </div>
  );
}
```

**Step 2: Create the Detail Panel**

Create `src/components/optimizer/DetailPanel.tsx`:

```tsx
"use client";

import type { JurisdictionRanking, MigrationStep } from "@/lib/optimizer/types";
import RadarChart from "./RadarChart";

interface DetailPanelProps {
  ranking: JurisdictionRanking | null;
  migrationPath?: MigrationStep[];
  accentColor?: string;
}

export default function DetailPanel({
  ranking,
  migrationPath,
  accentColor = "#10B981",
}: DetailPanelProps) {
  if (!ranking) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-600 font-mono text-sm">
        Select a jurisdiction to view details
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="text-3xl">{ranking.flagEmoji}</span>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-200">
            {ranking.jurisdictionName}
          </h3>
          <span className="text-xs font-mono text-slate-500">
            {ranking.jurisdiction}
          </span>
        </div>
        <div
          className="text-2xl font-mono font-bold"
          style={{ color: accentColor }}
        >
          {ranking.totalScore.toFixed(1)}
        </div>
      </div>

      {/* Radar Chart */}
      <div className="flex justify-center">
        <RadarChart scores={ranking.dimensionScores} color={accentColor} />
      </div>

      {/* Key Advantages */}
      {ranking.keyAdvantages.length > 0 && (
        <div>
          <h4
            className="text-[10px] font-mono uppercase tracking-widest mb-2"
            style={{ color: accentColor }}
          >
            Advantages
          </h4>
          <div className="space-y-1">
            {ranking.keyAdvantages.map((adv, i) => (
              <div
                key={i}
                className="text-xs font-mono text-slate-300 flex items-start gap-2"
              >
                <span className="text-emerald-500 mt-0.5">+</span>
                {adv}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Risks */}
      {ranking.keyRisks.length > 0 && (
        <div>
          <h4 className="text-[10px] font-mono uppercase tracking-widest text-amber-500 mb-2">
            Risks
          </h4>
          <div className="space-y-1">
            {ranking.keyRisks.map((risk, i) => (
              <div
                key={i}
                className="text-xs font-mono text-slate-300 flex items-start gap-2"
              >
                <span className="text-amber-500 mt-0.5">!</span>
                {risk}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline & Cost */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-surface rounded-lg p-3 border border-white/5">
          <div className="text-[10px] font-mono text-slate-500 uppercase">
            Processing
          </div>
          <div className="text-sm font-mono text-slate-200 mt-1">
            {ranking.timeline.min}–{ranking.timeline.max} weeks
          </div>
        </div>
        <div className="glass-surface rounded-lg p-3 border border-white/5">
          <div className="text-[10px] font-mono text-slate-500 uppercase">
            Application Fee
          </div>
          <div className="text-sm font-mono text-slate-200 mt-1">
            {ranking.estimatedCost.application}
          </div>
        </div>
      </div>

      {/* Migration Path */}
      {migrationPath && migrationPath.length > 0 && (
        <div>
          <h4
            className="text-[10px] font-mono uppercase tracking-widest mb-3"
            style={{ color: accentColor }}
          >
            Migration Path
          </h4>
          <div className="space-y-3">
            {migrationPath.map((step) => (
              <div
                key={step.order}
                className="glass-surface rounded-lg p-3 border border-white/5"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold text-white"
                    style={{ backgroundColor: accentColor }}
                  >
                    {step.order}
                  </span>
                  <span className="text-xs font-medium text-slate-200">
                    {step.title}
                  </span>
                </div>
                <p className="text-[11px] font-mono text-slate-400 ml-7">
                  {step.description}
                </p>
                <div className="ml-7 mt-1.5 flex items-center gap-3">
                  <span className="text-[10px] font-mono text-slate-500">
                    {step.estimatedDuration}
                  </span>
                  {step.cost && (
                    <span className="text-[10px] font-mono text-slate-500">
                      {step.cost}
                    </span>
                  )}
                </div>
                {step.documents.length > 0 && (
                  <div className="ml-7 mt-1.5 space-y-0.5">
                    {step.documents.map((doc, i) => (
                      <div
                        key={i}
                        className="text-[10px] font-mono text-slate-600 flex items-center gap-1.5"
                      >
                        <span className="w-3 h-3 rounded border border-white/10 shrink-0" />
                        {doc}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 3: Create the dashboard page**

Create `src/app/dashboard/optimizer/page.tsx`:

```tsx
"use client";

import { useState, useCallback } from "react";
import { useEphemerisTheme } from "@/app/dashboard/ephemeris/theme";
import InputPanel from "@/components/optimizer/InputPanel";
import RankingsList from "@/components/optimizer/RankingsList";
import TradeOffChart from "@/components/optimizer/TradeOffChart";
import DetailPanel from "@/components/optimizer/DetailPanel";
import type {
  OptimizationInput,
  OptimizationOutput,
} from "@/lib/optimizer/types";
import type { SpaceLawCountryCode } from "@/lib/space-law-types";

type ResultsTab = "rankings" | "tradeoff";

export default function OptimizerPage() {
  const theme = useEphemerisTheme();
  const [result, setResult] = useState<OptimizationOutput | null>(null);
  const [selectedJurisdiction, setSelectedJurisdiction] =
    useState<SpaceLawCountryCode | null>(null);
  const [activeTab, setActiveTab] = useState<ResultsTab>("rankings");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = useCallback(async (input: OptimizationInput) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/optimizer/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }

      const data = await res.json();
      setResult(data.data);
      setSelectedJurisdiction(data.data.rankings[0]?.jurisdiction ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Optimization failed");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const selectedRanking =
    result?.rankings.find((r) => r.jurisdiction === selectedJurisdiction) ??
    null;

  const tabBtnClass = (tab: ResultsTab) =>
    `px-4 py-1.5 text-xs font-mono rounded-lg transition-all ${
      activeTab === tab
        ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/30"
        : "text-slate-500 hover:text-slate-400 border border-transparent"
    }`;

  return (
    <div
      className="min-h-screen p-6"
      style={{ backgroundColor: theme.bg, color: theme.textPrimary }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-100">
            Regulatory Arbitrage Optimizer
          </h1>
          <p className="text-xs font-mono text-slate-500 mt-1">
            Find the optimal jurisdiction for your spacecraft registration
          </p>
        </div>
      </div>

      {/* 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr_360px] gap-6">
        {/* Left: Input Panel */}
        <div className="glass-elevated rounded-xl p-5 border border-white/10 h-fit">
          <InputPanel
            onAnalyze={handleAnalyze}
            isLoading={isLoading}
            accentColor={theme.accent}
          />
        </div>

        {/* Center: Results */}
        <div className="glass-elevated rounded-xl p-5 border border-white/10 min-h-[500px]">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono">
              {error}
            </div>
          )}

          {!result && !isLoading && (
            <div className="flex items-center justify-center h-full text-slate-600 font-mono text-sm">
              Configure parameters and click Analyze
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div
                  className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3"
                  style={{
                    borderColor: theme.accent,
                    borderTopColor: "transparent",
                  }}
                />
                <p className="text-xs font-mono text-slate-500">
                  Analyzing 10 jurisdictions...
                </p>
              </div>
            </div>
          )}

          {result && !isLoading && (
            <>
              {/* Tabs */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setActiveTab("rankings")}
                  className={tabBtnClass("rankings")}
                >
                  Rankings
                </button>
                <button
                  onClick={() => setActiveTab("tradeoff")}
                  className={tabBtnClass("tradeoff")}
                >
                  Trade-off Map
                </button>
              </div>

              {activeTab === "rankings" && (
                <RankingsList
                  rankings={result.rankings}
                  selectedJurisdiction={selectedJurisdiction ?? undefined}
                  onSelect={setSelectedJurisdiction}
                  accentColor={theme.accent}
                />
              )}

              {activeTab === "tradeoff" && (
                <div className="aspect-[3/2]">
                  <TradeOffChart
                    data={result.tradeOffData}
                    selectedJurisdiction={selectedJurisdiction ?? undefined}
                    onSelect={setSelectedJurisdiction}
                    accentColor={theme.accent}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Right: Detail Panel */}
        <div className="glass-elevated rounded-xl p-5 border border-white/10 h-fit">
          <DetailPanel
            ranking={selectedRanking}
            migrationPath={result?.migrationPath}
            accentColor={theme.accent}
          />
        </div>
      </div>
    </div>
  );
}
```

**Step 4: Run typecheck**

Run: `npx tsc --noEmit --pretty 2>&1 | grep -i "error" | head -10`
Expected: No errors in optimizer files

**Step 5: Commit**

```bash
git add src/components/optimizer/InputPanel.tsx src/components/optimizer/DetailPanel.tsx src/app/dashboard/optimizer/page.tsx
git commit -m "feat(optimizer): add dashboard page with input panel, detail panel, and 3-column layout"
```

---

## Task 11: Navigation — Add Optimizer to Sidebar

**Files:**

- Modify: `src/app/dashboard/layout.tsx` (add to `ROUTE_TITLE_MAP`)
- Modify: `src/components/dashboard/Sidebar.tsx` (add nav item)

**Step 1: Add route title mapping**

In `src/app/dashboard/layout.tsx`, find the `ROUTE_TITLE_MAP` object (around line 18) and add:

```typescript
  "/dashboard/optimizer": "_literal:Regulatory Arbitrage Optimizer",
```

**Step 2: Add sidebar nav item**

In `src/components/dashboard/Sidebar.tsx`, find the "AI Agent" section (containing Astra, Sentinel, Ephemeris). After the Ephemeris `NavItem` or `CompactModuleItem`, add a new item:

```tsx
<CompactModuleItem
  href="/dashboard/optimizer"
  icon={<ScaleIcon className="w-4 h-4" />}
  label="Optimizer"
  onClick={onClose}
/>
```

Import `ScaleIcon` from `lucide-react` at the top of the file (or use an existing icon like `BarChart3` or `Target`):

```typescript
import { Scale } from "lucide-react";
```

If `Scale` is not available, use `Target` or `BarChart3` which are commonly available in Lucide.

**Step 3: Run typecheck**

Run: `npx tsc --noEmit --pretty 2>&1 | grep -i "error" | head -5`
Expected: No errors

**Step 4: Commit**

```bash
git add src/app/dashboard/layout.tsx src/components/dashboard/Sidebar.tsx
git commit -m "feat(optimizer): add Optimizer to sidebar navigation"
```

---

## Task 12: PDF Export — Optimization Report

**Files:**

- Create: `src/lib/pdf/reports/optimization-report.tsx`

**Step 1: Implement the PDF report builder**

Create `src/lib/pdf/reports/optimization-report.tsx`:

```typescript
import type { ReportConfig, ReportSection } from "@/lib/pdf/types";
import type {
  OptimizationOutput,
  JurisdictionRanking,
} from "@/lib/optimizer/types";

export interface OptimizationReportData {
  result: OptimizationOutput;
  weightProfile: string;
  generatedAt: string;
  organizationName?: string;
}

export function buildOptimizationReportConfig(
  data: OptimizationReportData,
): ReportConfig {
  const sections: ReportSection[] = [
    {
      title: "Optimization Summary",
      content: [
        { type: "heading", text: "Overview" },
        {
          type: "keyValue",
          items: [
            { key: "Weight Profile", value: data.weightProfile },
            {
              key: "Best Overall",
              value: `${data.result.summary.bestOverall}`,
            },
            {
              key: "Best for Timeline",
              value: data.result.summary.bestForTimeline,
            },
            { key: "Best for Cost", value: data.result.summary.bestForCost },
            {
              key: "Best for Compliance",
              value: data.result.summary.bestForCompliance,
            },
            { key: "Generated", value: data.generatedAt },
          ],
        },
      ],
    },
    {
      title: "Jurisdiction Rankings",
      content: [
        {
          type: "table",
          headers: [
            "Rank",
            "Jurisdiction",
            "Score",
            "Timeline",
            "App. Fee",
            "Badges",
          ],
          rows: data.result.rankings.map(
            (r: JurisdictionRanking, i: number) => [
              `${i + 1}`,
              `${r.flagEmoji} ${r.jurisdictionName} (${r.jurisdiction})`,
              r.totalScore.toFixed(1),
              `${r.timeline.min}-${r.timeline.max}w`,
              r.estimatedCost.application,
              r.badges.join(", ") || "—",
            ],
          ),
        },
      ],
    },
    {
      title: "Top Jurisdiction Analysis",
      content: buildTopAnalysis(data.result.rankings.slice(0, 3)),
    },
  ];

  if (data.result.migrationPath && data.result.migrationPath.length > 0) {
    sections.push({
      title: "Migration Path",
      content: data.result.migrationPath.map((step) => ({
        type: "text" as const,
        text: `${step.order}. ${step.title} (${step.estimatedDuration})\n${step.description}${step.cost ? `\nEstimated cost: ${step.cost}` : ""}`,
      })),
    });
  }

  return {
    title: "Regulatory Arbitrage Optimization Report",
    subtitle: data.organizationName
      ? `Prepared for ${data.organizationName}`
      : undefined,
    date: data.generatedAt,
    sections,
  };
}

function buildTopAnalysis(
  top3: JurisdictionRanking[],
): ReportSection["content"] {
  return top3.flatMap((r, i) => [
    {
      type: "heading" as const,
      text: `#${i + 1} — ${r.flagEmoji} ${r.jurisdictionName}`,
    },
    {
      type: "keyValue" as const,
      items: [
        { key: "Total Score", value: r.totalScore.toFixed(1) },
        { key: "Timeline", value: `${r.dimensionScores.timeline.toFixed(0)}` },
        { key: "Cost", value: `${r.dimensionScores.cost.toFixed(0)}` },
        {
          key: "Compliance",
          value: `${r.dimensionScores.compliance.toFixed(0)}`,
        },
        {
          key: "Processing",
          value: `${r.timeline.min}-${r.timeline.max} weeks`,
        },
        {
          key: "Application Fee",
          value: r.estimatedCost.application,
        },
      ],
    },
    ...(r.keyAdvantages.length > 0
      ? [
          {
            type: "list" as const,
            title: "Advantages",
            items: r.keyAdvantages,
          },
        ]
      : []),
    ...(r.keyRisks.length > 0
      ? [
          {
            type: "list" as const,
            title: "Risks",
            items: r.keyRisks,
          },
        ]
      : []),
    { type: "divider" as const },
  ]);
}
```

**Step 2: Run typecheck**

Run: `npx tsc --noEmit --pretty 2>&1 | grep "optimization-report" | head -5`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/pdf/reports/optimization-report.tsx
git commit -m "feat(optimizer): add PDF report builder for optimization results"
```

---

## Task 13: Final Verification & Integration Test

**Step 1: Run all optimizer tests**

Run: `npx vitest run src/lib/optimizer/ src/app/api/v1/optimizer/ 2>&1 | tail -20`
Expected: All tests PASS

**Step 2: Run full typecheck**

Run: `npm run typecheck 2>&1 | tail -10`
Expected: No errors

**Step 3: Run full test suite for regressions**

Run: `npx vitest run 2>&1 | tail -20`
Expected: No new failures (pre-existing failures acceptable)

**Step 4: Run lint**

Run: `npm run lint 2>&1 | tail -10`
Expected: Clean or only pre-existing warnings

**Step 5: Verify Prisma schema**

Run: `npx prisma validate`
Expected: "The schema is valid."

**Step 6: Final commit (if any fixes were needed)**

```bash
git add -A
git commit -m "fix(optimizer): address lint/type issues from integration"
```
