# PROMPT: What-If Simulator — World-Class Upgrade

## Mission

Transform the Caelex What-If Simulator from a hardcoded estimation tool into the most accurate, powerful compliance scenario engine in the space industry. After this upgrade, every simulation produces **exact** regulatory impact based on the real compliance engines — not approximations.

**Core Principle:** Zero hardcoded penalties, zero estimated article counts. Every simulation delta comes from running the real engines with modified parameters and computing the actual difference.

**Cost Constraint:** Everything must be implementable with zero external costs. No paid APIs, no paid services. Use only existing stack (Next.js, Prisma, PostgreSQL, localStorage, existing engines).

---

## Critical Context

### Files You Will Modify

| File                                            | Purpose                                                  | Current LOC |
| ----------------------------------------------- | -------------------------------------------------------- | ----------- |
| `src/lib/services/whatif-simulation-service.ts` | Simulation engine (4 scenario types, hardcoded profiles) | 839         |
| `src/app/dashboard/digital-twin/page.tsx`       | Digital Twin UI (5 tabs, scenario builder)               | 1,720       |
| `src/app/api/digital-twin/scenarios/route.ts`   | POST/GET scenarios API                                   | 105         |
| `src/lib/services/compliance-twin-service.ts`   | Twin state aggregation                                   | 1,171       |

### Files You Will Create

| File                                                  | Purpose                                              |
| ----------------------------------------------------- | ---------------------------------------------------- |
| `src/lib/services/whatif-engine-bridge.ts`            | Bridge between simulator and real compliance engines |
| `src/app/api/digital-twin/scenarios/compare/route.ts` | Side-by-side comparison endpoint                     |
| `src/app/api/digital-twin/scenarios/chain/route.ts`   | Scenario chain endpoint                              |
| `tests/unit/whatif-simulation.test.ts`                | Full test suite                                      |

### Files You Must Use (Read-Only Reference)

| File                                             | Purpose                                            |
| ------------------------------------------------ | -------------------------------------------------- |
| `src/lib/engine.server.ts`                       | Real EU Space Act engine — `calculateCompliance()` |
| `src/lib/nis2-engine.server.ts`                  | Real NIS2 engine — `calculateNIS2Compliance()`     |
| `src/lib/space-law-engine.server.ts`             | Real Space Law engine — `analyzeJurisdictions()`   |
| `src/data/caelex-eu-space-act-engine.json`       | 119 articles with applies_to fields                |
| `src/data/national-space-laws.ts`                | 10 jurisdictions with real data                    |
| `src/data/nis2-requirements.ts`                  | 51 NIS2 requirements                               |
| `src/lib/services/compliance-scoring-service.ts` | `calculateComplianceScore()` for baseline          |
| `src/lib/types.ts`                               | AssessmentAnswers, ComplianceResult, Article types |

---

## Phase 1: Real Engine Integration (CRITICAL — Do First)

### Problem

The entire simulation engine (839 LOC) is built on **hardcoded constants**:

```typescript
// CURRENT — Lines 72-226: 10 static jurisdiction profiles
const JURISDICTION_PROFILES: Record<string, JurisdictionProfile> = {
  FR: { requirementsCount: 12, favorabilityScore: 85, insuranceMinimum: 60_000_000, ... },
  // ...
};

// CURRENT — Lines 232-339: 7 static operator profiles
const OPERATOR_TYPE_PROFILES: Record<string, OperatorTypeProfile> = {
  SCO: { applicableArticleCount: 95, ... },
  // ...
};
```

And the scoring uses **magic number penalties**:

```typescript
// CURRENT — Lines 401-406: Arbitrary penalty values
const complexityPenalty =
  jurisdiction.authorizationComplexity === "complex"
    ? 15
    : jurisdiction.authorizationComplexity === "moderate"
      ? 10
      : 5;
```

None of this calls the real engines. The article counts don't match `engine.server.ts`.

### Solution: Create Engine Bridge

Create `src/lib/services/whatif-engine-bridge.ts`:

```typescript
/**
 * What-If Engine Bridge
 *
 * Bridges the scenario simulator with the real compliance engines.
 * Converts scenario parameters into engine inputs, runs both baseline
 * and scenario calculations, and computes exact deltas.
 */
import "server-only";
import {
  loadSpaceActDataFromDisk,
  calculateCompliance,
  redactArticlesForClient,
} from "@/lib/engine.server";
import type { AssessmentAnswers, ComplianceResult, Article } from "@/lib/types";

export interface EngineComparisonResult {
  baseline: {
    applicableArticles: number;
    moduleStatuses: ModuleStatusSummary[];
    regime: "standard" | "light" | "exempt";
    operatorTypes: string[];
  };
  scenario: {
    applicableArticles: number;
    moduleStatuses: ModuleStatusSummary[];
    regime: "standard" | "light" | "exempt";
    operatorTypes: string[];
  };
  delta: {
    articlesDelta: number;
    newArticles: ArticleDelta[];
    removedArticles: ArticleDelta[];
    changedModules: ModuleDelta[];
    regimeChanged: boolean;
  };
}

interface ArticleDelta {
  number: number;
  title: string;
  module: string;
  relevance: string;
}

interface ModuleDelta {
  id: string;
  name: string;
  previousStatus: string;
  newStatus: string;
  articleCountDelta: number;
}

interface ModuleStatusSummary {
  id: string;
  name: string;
  status: string;
  articleCount: number;
}

/**
 * Run the real EU Space Act engine with two different parameter sets
 * and return the exact delta between them.
 */
export function compareCompliance(
  baselineAnswers: AssessmentAnswers,
  scenarioAnswers: AssessmentAnswers,
): EngineComparisonResult {
  const data = loadSpaceActDataFromDisk();

  const baselineResult = calculateCompliance(baselineAnswers, data);
  const scenarioResult = calculateCompliance(scenarioAnswers, data);

  // Find articles in scenario but not in baseline (new requirements)
  const baselineArticleSet = new Set(
    baselineResult.applicableArticles.map((a) => a.number),
  );
  const scenarioArticleSet = new Set(
    scenarioResult.applicableArticles.map((a) => a.number),
  );

  const newArticles = scenarioResult.applicableArticles
    .filter((a) => !baselineArticleSet.has(a.number))
    .map((a) => ({
      number: a.number,
      title: a.title,
      module: a.module,
      relevance: a.relevance,
    }));

  const removedArticles = baselineResult.applicableArticles
    .filter((a) => !scenarioArticleSet.has(a.number))
    .map((a) => ({
      number: a.number,
      title: a.title,
      module: a.module,
      relevance: a.relevance,
    }));

  // Compare module statuses
  const changedModules: ModuleDelta[] = [];
  for (const scenarioModule of scenarioResult.moduleStatuses) {
    const baselineModule = baselineResult.moduleStatuses.find(
      (m) => m.id === scenarioModule.id,
    );
    if (
      !baselineModule ||
      baselineModule.status !== scenarioModule.status ||
      baselineModule.articleCount !== scenarioModule.articleCount
    ) {
      changedModules.push({
        id: scenarioModule.id,
        name: scenarioModule.name,
        previousStatus: baselineModule?.status || "not_applicable",
        newStatus: scenarioModule.status,
        articleCountDelta:
          scenarioModule.articleCount - (baselineModule?.articleCount || 0),
      });
    }
  }

  return {
    baseline: {
      applicableArticles: baselineResult.applicableCount,
      moduleStatuses: baselineResult.moduleStatuses.map((m) => ({
        id: m.id,
        name: m.name,
        status: m.status,
        articleCount: m.articleCount,
      })),
      regime: baselineResult.regime,
      operatorTypes: baselineResult.operatorTypes,
    },
    scenario: {
      applicableArticles: scenarioResult.applicableCount,
      moduleStatuses: scenarioResult.moduleStatuses.map((m) => ({
        id: m.id,
        name: m.name,
        status: m.status,
        articleCount: m.articleCount,
      })),
      regime: scenarioResult.regime,
      operatorTypes: scenarioResult.operatorTypes,
    },
    delta: {
      articlesDelta:
        scenarioResult.applicableCount - baselineResult.applicableCount,
      newArticles,
      removedArticles,
      changedModules,
      regimeChanged: baselineResult.regime !== scenarioResult.regime,
    },
  };
}
```

### Rewrite Each Scenario Function

**Replace `simulateAddJurisdiction()`** — Instead of hardcoded `JURISDICTION_PROFILES`, import the real jurisdiction data from `src/data/national-space-laws.ts` and call the real space law engine:

```typescript
async function simulateAddJurisdiction(
  userId: string, baselineScore: number, params: Record<string, unknown>,
  baseline: ComplianceScoreResult
): Promise<SimulationResult> {
  const code = (params.jurisdictionCode as string || "").toUpperCase();

  // Get user's current assessment answers from DB
  const userProfile = await getUserComplianceProfile(userId);

  // Run real space law engine for the new jurisdiction
  const currentJurisdictions = userProfile.jurisdictions || [];
  const newJurisdictions = [...currentJurisdictions, code];

  // Import real jurisdiction data instead of hardcoded profiles
  const { JURISDICTION_DATA } from "@/data/national-space-laws";
  const jurisdiction = JURISDICTION_DATA[code];

  // Run real EU Space Act engine with current vs. new jurisdiction context
  const engineComparison = compareCompliance(
    buildEngineAnswers(userProfile),
    buildEngineAnswers({ ...userProfile, jurisdictions: newJurisdictions })
  );

  // Compute REAL score delta based on actual article changes
  const articleImpact = engineComparison.delta.articlesDelta;
  const complianceGap = engineComparison.delta.newArticles.length;

  // New requirements are REAL articles, not hardcoded strings
  const newRequirements = engineComparison.delta.newArticles.map(article => ({
    id: `art-${article.number}`,
    title: `Art. ${article.number}: ${article.title}`,
    framework: article.module.includes("nis2") ? "NIS2 Directive" : "EU Space Act",
    type: "new" as const,
    impact: article.relevance === "mandatory" ? "high" as const : "medium" as const,
    description: `Newly applicable under ${jurisdiction.name} jurisdiction. Module: ${article.module}.`,
  }));

  // ... rest of function using real data
}
```

**Apply the same pattern to all 4 scenario functions.** Each one must:

1. Load the user's current compliance profile from DB
2. Build baseline `AssessmentAnswers` from current profile
3. Build scenario `AssessmentAnswers` with the modification applied
4. Call `compareCompliance()` for exact article-level delta
5. Use real article titles and numbers in `newRequirements`
6. Compute score delta from actual compliance gap, not magic numbers

### Delete All Hardcoded Profiles

After rewriting all 4 functions, **delete entirely**:

- `JURISDICTION_PROFILES` (lines 60-226) — replaced by real `national-space-laws.ts` data
- `OPERATOR_TYPE_PROFILES` (lines 232-339) — replaced by real `engine.server.ts` calls
- `JurisdictionProfile` interface (lines 60-70)
- `OperatorTypeProfile` interface (lines 232-240)

### Helper: Get User's Current Assessment Profile

```typescript
/**
 * Fetch user's current assessment answers from DB.
 * Falls back to reasonable defaults if no assessment exists.
 */
async function getUserComplianceProfile(
  userId: string,
): Promise<AssessmentAnswers> {
  // Check for unified assessment result first
  const org = await prisma.organizationMember.findFirst({
    where: { userId },
    include: { organization: true },
  });

  if (org) {
    // Try to find the most recent spacecraft/operator data
    const spacecraft = await prisma.spacecraft.findFirst({
      where: { organizationId: org.organizationId },
      orderBy: { createdAt: "desc" },
    });

    const workflow = await prisma.authorizationWorkflow.findFirst({
      where: { organizationId: org.organizationId },
      orderBy: { createdAt: "desc" },
    });

    // Build answers from actual DB data
    return {
      activityType: mapOperatorType(workflow?.operatorType),
      establishment: mapEstablishment(org.organization.country),
      entitySize: org.organization.entitySize || "medium",
      operatesConstellation: spacecraft?.isConstellation || false,
      constellationSize: mapConstellationSize(spacecraft?.constellationSize),
      primaryOrbit: spacecraft?.orbitType || "LEO",
      isDefenseOnly: false,
      hasPostLaunchAssets: true,
      offersEUServices: true,
    };
  }

  // Fallback defaults
  return {
    activityType: "spacecraft",
    establishment: "eu",
    entitySize: "medium",
    operatesConstellation: false,
    constellationSize: "none",
    primaryOrbit: "LEO",
    isDefenseOnly: false,
    hasPostLaunchAssets: true,
    offersEUServices: true,
  };
}
```

---

## Phase 2: Composite Scenarios (Multi-Change in One Run)

### Problem

Currently each scenario only supports ONE change. Real decisions combine multiple changes: "Expand to Luxembourg AND add 30 satellites AND start offering SATCOM."

### Solution: New Scenario Type `composite`

#### Add to ScenarioType

```typescript
export type ScenarioType =
  | "add_jurisdiction"
  | "change_operator_type"
  | "add_satellites"
  | "expand_operations"
  | "composite"; // NEW
```

#### Composite Input Structure

```typescript
export interface CompositeScenarioInput {
  steps: Array<{
    scenarioType: Exclude<ScenarioType, "composite">;
    parameters: Record<string, unknown>;
  }>;
}
```

#### Composite Simulation Logic

```typescript
async function simulateComposite(
  userId: string,
  baselineScore: number,
  params: Record<string, unknown>,
  baseline: ComplianceScoreResult,
): Promise<SimulationResult> {
  const steps = params.steps as CompositeScenarioInput["steps"];
  if (!steps || steps.length === 0) {
    throw new Error("Composite scenario requires at least one step");
  }
  if (steps.length > 5) {
    throw new Error("Maximum 5 steps per composite scenario");
  }

  // Get user's current profile
  const currentProfile = await getUserComplianceProfile(userId);
  let modifiedProfile = { ...currentProfile };

  // Apply each step's modifications to the profile sequentially
  const allNewRequirements: SimulationRequirement[] = [];
  const stepResults: Array<{ type: string; delta: number }> = [];

  for (const step of steps) {
    // Modify the profile based on this step
    modifiedProfile = applyScenarioToProfile(modifiedProfile, step);
  }

  // Run engines ONCE with fully modified profile vs. baseline
  const engineComparison = compareCompliance(
    buildEngineAnswers(currentProfile),
    buildEngineAnswers(modifiedProfile),
  );

  // This captures ALL interaction effects — not just sum of individual deltas
  // Example: Adding jurisdiction + changing operator type may trigger articles
  // that neither change alone would trigger

  const newRequirements = engineComparison.delta.newArticles.map((article) => ({
    id: `composite-art-${article.number}`,
    title: `Art. ${article.number}: ${article.title}`,
    framework: "EU Space Act",
    type: "new" as const,
    impact:
      article.relevance === "mandatory"
        ? ("high" as const)
        : ("medium" as const),
    description: `Newly applicable due to combined scenario changes.`,
  }));

  const removedRequirements = engineComparison.delta.removedArticles.map(
    (article) => ({
      id: `composite-removed-art-${article.number}`,
      title: `Art. ${article.number}: ${article.title}`,
      framework: "EU Space Act",
      type: "removed" as const,
      impact: "medium" as const,
      description: `No longer applicable after combined changes.`,
    }),
  );

  // Score from real compliance gap
  const complianceGap = engineComparison.delta.newArticles.length;
  const complianceRelief = engineComparison.delta.removedArticles.length;
  const netImpact = Math.round((complianceRelief - complianceGap) * 0.5);
  const projectedScore = Math.max(0, Math.min(100, baselineScore + netImpact));

  return {
    scenarioType: "composite",
    baselineScore,
    projectedScore,
    scoreDelta: projectedScore - baselineScore,
    newRequirements: [...newRequirements, ...removedRequirements],
    financialImpact: calculateCompositeFinancialImpact(
      currentProfile,
      modifiedProfile,
      engineComparison,
    ),
    riskAssessment: assessCompositeRisk(engineComparison, steps),
    recommendations: generateCompositeRecommendations(engineComparison, steps),
    details: {
      steps: steps.map((s) => ({ type: s.scenarioType, params: s.parameters })),
      engineDelta: {
        articlesAdded: engineComparison.delta.newArticles.length,
        articlesRemoved: engineComparison.delta.removedArticles.length,
        modulesChanged: engineComparison.delta.changedModules.length,
        regimeChanged: engineComparison.delta.regimeChanged,
      },
      interactionEffects: detectInteractionEffects(steps, engineComparison),
    },
  };
}

/**
 * Detect non-linear interaction effects that only occur
 * when multiple changes are combined.
 */
function detectInteractionEffects(
  steps: CompositeScenarioInput["steps"],
  comparison: EngineComparisonResult,
): string[] {
  const effects: string[] = [];

  // Example: Adding jurisdiction + constellation triggers multi-NCA constellation management
  const hasJurisdiction = steps.some(
    (s) => s.scenarioType === "add_jurisdiction",
  );
  const hasSatellites = steps.some((s) => s.scenarioType === "add_satellites");
  const hasOperatorChange = steps.some(
    (s) => s.scenarioType === "change_operator_type",
  );

  if (hasJurisdiction && hasSatellites) {
    effects.push(
      "Multi-jurisdiction constellation management creates compound regulatory complexity — each NCA may impose different debris and coordination requirements.",
    );
  }

  if (hasOperatorChange && hasJurisdiction) {
    effects.push(
      "Changing operator type while adding a jurisdiction may require a completely new authorization application instead of a modification.",
    );
  }

  if (comparison.delta.regimeChanged) {
    effects.push(
      "Combined changes triggered a regime change (standard ↔ light). This significantly alters the compliance pathway and deadlines.",
    );
  }

  return effects;
}
```

#### UI: Composite Scenario Builder

In `digital-twin/page.tsx`, add a new scenario type option "Combined Changes" that shows a multi-step form:

```tsx
{
  scenarioType === "composite" && (
    <div className="space-y-4">
      {compositeSteps.map((step, index) => (
        <div
          key={index}
          className="bg-navy-900 rounded-lg p-4 border border-navy-700"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-300 text-small">Step {index + 1}</span>
            {index > 0 && (
              <button
                onClick={() => removeStep(index)}
                className="text-red-400 text-small"
              >
                Remove
              </button>
            )}
          </div>
          {/* Reuse existing scenario type selector + parameter fields */}
          <ScenarioStepForm
            step={step}
            onChange={(s) => updateStep(index, s)}
          />
        </div>
      ))}
      {compositeSteps.length < 5 && (
        <button
          onClick={addStep}
          className="w-full py-2 border border-dashed border-navy-600 rounded-lg text-slate-400 hover:text-white hover:border-emerald-500 transition-colors"
        >
          + Add another change
        </button>
      )}
    </div>
  );
}
```

---

## Phase 3: Side-by-Side Scenario Comparison

### Problem

Users can save multiple scenarios but can't compare them visually. "Is Luxembourg better than Netherlands?" requires mentally comparing two separate result cards.

### Solution: Comparison View

#### New API Endpoint

Create `src/app/api/digital-twin/scenarios/compare/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { scenarioIds } = await request.json();
  if (!scenarioIds || scenarioIds.length < 2 || scenarioIds.length > 4) {
    return NextResponse.json(
      { error: "Select 2-4 scenarios to compare" },
      { status: 400 },
    );
  }

  const scenarios = await prisma.whatIfScenario.findMany({
    where: {
      id: { in: scenarioIds },
      userId: session.user.id,
    },
  });

  if (scenarios.length !== scenarioIds.length) {
    return NextResponse.json(
      { error: "Some scenarios not found" },
      { status: 404 },
    );
  }

  // Parse stored results
  const parsed = scenarios.map((s) => ({
    id: s.id,
    name: s.name,
    scenarioType: s.scenarioType,
    parameters: JSON.parse(s.parameters),
    results: JSON.parse(s.results),
    baselineScore: s.baselineScore,
    projectedScore: s.projectedScore,
    scoreDelta: s.scoreDelta,
    createdAt: s.createdAt,
  }));

  // Build comparison matrix
  const comparison = {
    scenarios: parsed,
    matrix: {
      scores: parsed.map((s) => ({
        name: s.name,
        baseline: s.baselineScore,
        projected: s.projectedScore,
        delta: s.scoreDelta,
      })),
      financials: parsed.map((s) => ({
        name: s.name,
        exposure: s.results.financialImpact?.projectedExposure || 0,
        delta: s.results.financialImpact?.delta || 0,
      })),
      risks: parsed.map((s) => ({
        name: s.name,
        level: s.results.riskAssessment?.level || "unknown",
      })),
      requirementCounts: parsed.map((s) => ({
        name: s.name,
        new:
          s.results.newRequirements?.filter((r: any) => r.type === "new")
            .length || 0,
        removed:
          s.results.newRequirements?.filter((r: any) => r.type === "removed")
            .length || 0,
      })),
    },
    recommendation: identifyBestScenario(parsed),
  };

  return NextResponse.json({ success: true, data: comparison });
}

function identifyBestScenario(scenarios: any[]) {
  // Rank by: highest projected score, lowest financial impact, lowest risk
  const ranked = scenarios
    .map((s) => ({
      name: s.name,
      id: s.id,
      compositeScore:
        s.projectedScore * 0.4 + // 40% weight on compliance score
        (100 -
          Math.min(100, (s.results.financialImpact?.delta || 0) / 100000)) *
          0.3 + // 30% on financial impact
        ({ low: 100, medium: 60, high: 30, critical: 0 }[
          s.results.riskAssessment?.level
        ] || 50) *
          0.3, // 30% on risk
    }))
    .sort((a, b) => b.compositeScore - a.compositeScore);

  return {
    best: ranked[0],
    reason: `${ranked[0].name} offers the best balance of compliance score, financial impact, and risk level.`,
    ranking: ranked,
  };
}
```

#### UI: Comparison View

Add a "Compare" tab or modal in the Digital Twin page. When user selects 2-4 saved scenarios via checkboxes:

```tsx
// Comparison Table
<div className="grid grid-cols-[200px_repeat(var(--scenario-count),1fr)] gap-0 border border-navy-700 rounded-xl overflow-hidden">
  {/* Header row */}
  <div className="bg-navy-900 p-3 text-slate-400 text-small font-medium">
    Metric
  </div>
  {scenarios.map((s) => (
    <div
      key={s.id}
      className="bg-navy-900 p-3 text-white text-body font-semibold border-l border-navy-700"
    >
      {s.name}
    </div>
  ))}

  {/* Score row */}
  <MetricRow
    label="Projected Score"
    values={scenarios.map((s) => `${s.projectedScore}/100`)}
    best={bestScoreId}
  />
  <MetricRow
    label="Score Delta"
    values={scenarios.map((s) => formatDelta(s.scoreDelta))}
    best={bestDeltaId}
  />
  <MetricRow
    label="New Requirements"
    values={scenarios.map((s) => `${s.newCount}`)}
    best={lowestNewReqId}
  />
  <MetricRow
    label="Financial Impact"
    values={scenarios.map((s) => formatEUR(s.financialDelta))}
    best={lowestFinId}
  />
  <MetricRow
    label="Risk Level"
    values={scenarios.map((s) => s.riskLevel)}
    best={lowestRiskId}
  />
  <MetricRow
    label="Processing Time"
    values={scenarios.map((s) => `${s.processingDays} days`)}
    best={fastestId}
  />
</div>;

{
  /* Radar Chart Overlay — all scenarios on one chart */
}
<RadarChart data={radarData} scenarios={scenarios.map((s) => s.name)} />;

{
  /* Recommendation Banner */
}
<div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mt-4">
  <span className="text-emerald-400 font-semibold">
    Recommended: {comparison.recommendation.best.name}
  </span>
  <p className="text-slate-300 text-small mt-1">
    {comparison.recommendation.reason}
  </p>
</div>;
```

Add checkboxes to each saved scenario card in the existing scenarios list, with a "Compare Selected" button that appears when 2+ are checked.

---

## Phase 4: Scenario Chains (Strategic Compliance Roadmap)

### The Breakthrough Feature

This is the feature **no one else has**. A scenario chain lets users build a multi-step strategic roadmap where each step's output becomes the next step's baseline:

```
Step 1: Get Luxembourg license (Q1 2031) → Score: 72 → 68
Step 2: Launch 20 satellites (Q3 2031)    → Score: 68 → 59
Step 3: Add SATCOM services (Q1 2032)     → Score: 59 → 51
Step 4: Achieve full compliance (Q3 2032) → Score: 51 → 85
```

Each step shows what changes, what's needed, and the cumulative effect.

#### New API Endpoint

Create `src/app/api/digital-twin/scenarios/chain/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { simulateScenario } from "@/lib/services/whatif-simulation-service";
import {
  compareCompliance,
  buildEngineAnswers,
} from "@/lib/services/whatif-engine-bridge";

export interface ChainStep {
  name: string;
  scenarioType: ScenarioType;
  parameters: Record<string, unknown>;
  targetDate: string; // ISO date
}

export interface ChainResult {
  id: string;
  name: string;
  steps: ChainStepResult[];
  summary: {
    startScore: number;
    finalScore: number;
    totalDelta: number;
    totalNewRequirements: number;
    totalRemovedRequirements: number;
    totalFinancialImpact: number;
    estimatedDuration: string;
    criticalPath: string[];
  };
  timeline: TimelineEvent[];
}

export interface ChainStepResult {
  stepNumber: number;
  name: string;
  targetDate: string;
  scenarioType: string;
  inputScore: number;
  outputScore: number;
  delta: number;
  newRequirements: SimulationRequirement[];
  removedRequirements: SimulationRequirement[];
  cumulativeRequirements: number;
  financialImpact: { exposure: number; delta: number };
  riskLevel: string;
  recommendations: string[];
  blockers: string[]; // Requirements from previous steps not yet met
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, steps } = await request.json();
  if (!steps || steps.length < 2 || steps.length > 8) {
    return NextResponse.json(
      { error: "Chain requires 2-8 steps" },
      { status: 400 },
    );
  }

  // Validate dates are chronological
  for (let i = 1; i < steps.length; i++) {
    if (new Date(steps[i].targetDate) <= new Date(steps[i - 1].targetDate)) {
      return NextResponse.json(
        { error: "Step dates must be chronological" },
        { status: 400 },
      );
    }
  }

  const userId = session.user.id;
  let currentProfile = await getUserComplianceProfile(userId);
  let currentScore = (await calculateComplianceScore(userId)).overall;
  const stepResults: ChainStepResult[] = [];
  const allNewReqs: Set<string> = new Set();
  let cumulativeFinancial = 0;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];

    // Apply this step's changes to the profile
    const modifiedProfile = applyScenarioToProfile(currentProfile, step);

    // Run real engine comparison
    const comparison = compareCompliance(
      buildEngineAnswers(currentProfile),
      buildEngineAnswers(modifiedProfile),
    );

    const newReqs = comparison.delta.newArticles.map((a) => ({
      id: `chain-${i}-art-${a.number}`,
      title: `Art. ${a.number}: ${a.title}`,
      framework: "EU Space Act",
      type: "new" as const,
      impact:
        a.relevance === "mandatory" ? ("high" as const) : ("medium" as const),
      description: `Triggered by: ${step.name}`,
    }));

    const removedReqs = comparison.delta.removedArticles.map((a) => ({
      id: `chain-${i}-removed-art-${a.number}`,
      title: `Art. ${a.number}: ${a.title}`,
      framework: "EU Space Act",
      type: "removed" as const,
      impact: "medium" as const,
      description: `Removed by: ${step.name}`,
    }));

    // Compute score delta from real gap
    const gapDelta =
      comparison.delta.newArticles.length -
      comparison.delta.removedArticles.length;
    const scoreDelta = Math.round(-gapDelta * 0.5);
    const newScore = Math.max(0, Math.min(100, currentScore + scoreDelta));

    // Detect blockers: requirements from previous steps that haven't been addressed
    const blockers = detectBlockers(allNewReqs, step);

    // Track cumulative requirements
    newReqs.forEach((r) => allNewReqs.add(r.title));
    removedReqs.forEach((r) => allNewReqs.delete(r.title));

    const stepFinancial = calculateStepFinancialImpact(comparison, step);
    cumulativeFinancial += stepFinancial;

    stepResults.push({
      stepNumber: i + 1,
      name: step.name,
      targetDate: step.targetDate,
      scenarioType: step.scenarioType,
      inputScore: currentScore,
      outputScore: newScore,
      delta: scoreDelta,
      newRequirements: newReqs,
      removedRequirements: removedReqs,
      cumulativeRequirements: allNewReqs.size,
      financialImpact: { exposure: cumulativeFinancial, delta: stepFinancial },
      riskLevel: assessStepRisk(comparison, blockers),
      recommendations: generateStepRecommendations(comparison, step, blockers),
      blockers,
    });

    // This step's output becomes next step's input
    currentProfile = modifiedProfile;
    currentScore = newScore;
  }

  // Build timeline events
  const timeline = stepResults.flatMap((step) => [
    {
      date: step.targetDate,
      type: "milestone" as const,
      title: step.name,
      score: step.outputScore,
      delta: step.delta,
    },
    ...step.newRequirements.slice(0, 3).map((req) => ({
      date: step.targetDate,
      type: "requirement" as const,
      title: req.title,
      score: null,
      delta: null,
    })),
  ]);

  // Identify critical path (steps with blockers or high risk)
  const criticalPath = stepResults
    .filter(
      (s) =>
        s.blockers.length > 0 ||
        s.riskLevel === "high" ||
        s.riskLevel === "critical",
    )
    .map((s) => s.name);

  const result: ChainResult = {
    id: "", // Will be set after DB save
    name,
    steps: stepResults,
    summary: {
      startScore: stepResults[0].inputScore,
      finalScore: stepResults[stepResults.length - 1].outputScore,
      totalDelta:
        stepResults[stepResults.length - 1].outputScore -
        stepResults[0].inputScore,
      totalNewRequirements: allNewReqs.size,
      totalRemovedRequirements: stepResults.reduce(
        (sum, s) => sum + s.removedRequirements.length,
        0,
      ),
      totalFinancialImpact: cumulativeFinancial,
      estimatedDuration: calculateDuration(
        steps[0].targetDate,
        steps[steps.length - 1].targetDate,
      ),
      criticalPath,
    },
    timeline,
  };

  // Save chain to DB
  const saved = await prisma.whatIfScenario.create({
    data: {
      userId,
      name,
      scenarioType: "chain",
      parameters: JSON.stringify({ steps }),
      baselineScore: result.summary.startScore,
      projectedScore: result.summary.finalScore,
      scoreDelta: result.summary.totalDelta,
      results: JSON.stringify(result),
      computedAt: new Date(),
    },
  });

  result.id = saved.id;

  return NextResponse.json({ success: true, data: result });
}
```

#### Add `chain` to ScenarioType

```typescript
export type ScenarioType =
  | "add_jurisdiction"
  | "change_operator_type"
  | "add_satellites"
  | "expand_operations"
  | "composite"
  | "chain";
```

Update the validation in `scenarios/route.ts` to include `"composite"` and `"chain"`.

#### UI: Chain Builder

Add a "Roadmap Builder" section to the scenarios tab. This is a vertical timeline builder:

```tsx
// Chain Builder UI
<div className="space-y-0">
  {chainSteps.map((step, index) => (
    <div key={index} className="relative">
      {/* Timeline connector */}
      {index > 0 && (
        <div className="absolute left-6 -top-4 w-0.5 h-8 bg-navy-600" />
      )}

      <div className="flex gap-4 items-start">
        {/* Timeline dot */}
        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
          index === 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-navy-700 text-slate-400"
        }`}>
          {index + 1}
        </div>

        {/* Step card */}
        <div className="flex-1 bg-navy-800 border border-navy-700 rounded-xl p-4 mb-4">
          <input
            placeholder="Step name (e.g., 'Get Luxembourg license')"
            className="w-full bg-transparent text-white text-body mb-2 outline-none"
            value={step.name}
            onChange={e => updateChainStep(index, "name", e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 text-small">Change Type</label>
              <select /* scenario type selector */ />
            </div>
            <div>
              <label className="text-slate-400 text-small">Target Date</label>
              <input type="date" min={index > 0 ? chainSteps[index - 1].targetDate : today} />
            </div>
          </div>

          {/* Dynamic parameters based on scenario type */}
          <ScenarioParameters type={step.scenarioType} params={step.parameters} onChange={...} />
        </div>
      </div>
    </div>
  ))}

  <button onClick={addChainStep} className="ml-16 w-[calc(100%-4rem)] py-3 border border-dashed border-navy-600 rounded-xl text-slate-400 hover:text-emerald-400 hover:border-emerald-500 transition-all">
    + Add next milestone
  </button>
</div>

{/* Chain Results: Visual Roadmap */}
{chainResult && (
  <div className="mt-8">
    {/* Score trajectory line chart */}
    <AreaChart data={chainResult.steps.map(s => ({
      name: s.name,
      date: s.targetDate,
      score: s.outputScore,
    }))} />

    {/* Summary banner */}
    <div className="grid grid-cols-4 gap-4 mt-4">
      <StatCard label="Start → End Score" value={`${chainResult.summary.startScore} → ${chainResult.summary.finalScore}`} />
      <StatCard label="Total Impact" value={formatDelta(chainResult.summary.totalDelta)} />
      <StatCard label="New Requirements" value={chainResult.summary.totalNewRequirements} />
      <StatCard label="Duration" value={chainResult.summary.estimatedDuration} />
    </div>

    {/* Step-by-step details */}
    {chainResult.steps.map(step => (
      <ChainStepCard key={step.stepNumber} step={step} />
    ))}

    {/* Critical path warning */}
    {chainResult.summary.criticalPath.length > 0 && (
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mt-4">
        <span className="text-amber-400 font-semibold">Critical Path</span>
        <p className="text-slate-300 text-small mt-1">
          These steps have blockers or high risk: {chainResult.summary.criticalPath.join(" → ")}
        </p>
      </div>
    )}
  </div>
)}
```

---

## Phase 5: Auto-Recompute on Regulatory Changes

### Problem

Saved scenarios become stale when regulations change. User saved "Expand to Italy" 3 months ago — Italy's requirements may have changed since then.

### Solution: Stale Detection + Auto-Recompute

#### Add Versioning

Add a `regulationVersion` field to track which version of the regulation data was used:

In `prisma/schema.prisma`, add to `WhatIfScenario`:

```prisma
regulationVersion  String?  // Hash of engine data at computation time
isStale           Boolean  @default(false)
```

#### Compute Data Version Hash

```typescript
// In whatif-engine-bridge.ts
import crypto from "crypto";

export function getRegulationDataHash(): string {
  const data = loadSpaceActDataFromDisk();
  const hash = crypto
    .createHash("md5")
    .update(JSON.stringify(data.articles?.length))
    .update(JSON.stringify(data.lastModified || ""))
    .digest("hex")
    .substring(0, 12);
  return hash;
}
```

#### Mark Stale on Load

When fetching saved scenarios, check if the regulation version has changed:

```typescript
// In GET /api/digital-twin/scenarios
const currentVersion = getRegulationDataHash();
const scenarios = await prisma.whatIfScenario.findMany({
  where: { userId: session.user.id },
  orderBy: { createdAt: "desc" },
  take: 50,
});

// Mark stale scenarios
const staleIds: string[] = [];
for (const scenario of scenarios) {
  if (
    scenario.regulationVersion &&
    scenario.regulationVersion !== currentVersion
  ) {
    staleIds.push(scenario.id);
  }
}

if (staleIds.length > 0) {
  await prisma.whatIfScenario.updateMany({
    where: { id: { in: staleIds } },
    data: { isStale: true },
  });
}
```

#### UI: Stale Indicator

In the saved scenarios list, show a warning badge on stale scenarios:

```tsx
{
  scenario.isStale && (
    <div className="flex items-center gap-1 text-amber-400 text-caption">
      <AlertTriangle className="w-3 h-3" />
      <span>Regulation data changed — results may be outdated</span>
      <button onClick={() => recompute(scenario.id)} className="underline ml-1">
        Recompute
      </button>
    </div>
  );
}
```

#### Recompute Endpoint

Add `PUT /api/digital-twin/scenarios/[id]/recompute`:

```typescript
export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  // Fetch original scenario parameters
  // Re-run simulateScenario() with same parameters
  // Update results, scores, regulationVersion, isStale = false
  // Return updated result
}
```

---

## Phase 6: Favorites & UI Polish

### 6A. Enable Favorites

The `isFavorite` field exists in the schema but is unused. Wire it up:

```typescript
// PATCH /api/digital-twin/scenarios/[id] — toggle favorite
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  const { isFavorite } = await request.json();

  await prisma.whatIfScenario.update({
    where: { id: params.id, userId: session.user.id },
    data: { isFavorite },
  });

  return NextResponse.json({ success: true });
}
```

Add a star icon to each saved scenario card. Favorites sort to the top.

### 6B. Scenario Export to PDF

Add a "Export as PDF" button on scenario results that generates a one-page summary using the existing PDF infrastructure in `src/lib/pdf/`. Include: scenario parameters, score comparison, new requirements list, financial impact, risk assessment, recommendations.

### 6C. Zod Validation for Parameters

Replace the loose `Record<string, unknown>` with proper Zod schemas:

```typescript
import { z } from "zod";

const AddJurisdictionParams = z.object({
  jurisdictionCode: z.string().length(2).toUpperCase(),
});

const ChangeOperatorTypeParams = z.object({
  currentOperatorType: z.enum([
    "SCO",
    "LO",
    "LSO",
    "ISOS",
    "CAP",
    "PDP",
    "TCO",
  ]),
  newOperatorType: z.enum(["SCO", "LO", "LSO", "ISOS", "CAP", "PDP", "TCO"]),
});

const AddSatellitesParams = z.object({
  additionalSatellites: z.number().int().min(1).max(10000),
  currentFleetSize: z.number().int().min(0),
});

const ExpandOperationsParams = z.object({
  newMemberStates: z.number().int().min(1).max(27),
  groundInfra: z.boolean().default(false),
  satcom: z.boolean().default(false),
});

const CompositeParams = z.object({
  steps: z
    .array(
      z.object({
        scenarioType: z.enum([
          "add_jurisdiction",
          "change_operator_type",
          "add_satellites",
          "expand_operations",
        ]),
        parameters: z.record(z.unknown()),
      }),
    )
    .min(1)
    .max(5),
});
```

Validate at the API level before calling `simulateScenario()`.

---

## Phase 7: Testing

### Unit Tests (`tests/unit/whatif-simulation.test.ts`)

```typescript
describe("What-If Simulator", () => {
  describe("Engine Bridge", () => {
    it("compareCompliance returns exact article delta for SCO → LO change", () => {
      const baseline = { activityType: "spacecraft", ... };
      const scenario = { activityType: "launch_vehicle", ... };
      const result = compareCompliance(baseline, scenario);

      expect(result.delta.newArticles.length).toBeGreaterThan(0);
      expect(result.delta.removedArticles.length).toBeGreaterThan(0);
      // Verify actual article numbers, not just counts
      expect(result.delta.newArticles.some(a => a.module === "authorization")).toBe(true);
    });

    it("detects regime change from standard to light", () => {
      const baseline = { entitySize: "large", ... };
      const scenario = { entitySize: "micro", ... };
      const result = compareCompliance(baseline, scenario);
      expect(result.delta.regimeChanged).toBe(true);
    });
  });

  describe("Composite Scenarios", () => {
    it("captures interaction effects between jurisdiction + satellites", () => { ... });
    it("composite result differs from sum of individual scenarios", () => { ... });
    it("rejects more than 5 steps", () => { ... });
  });

  describe("Scenario Chains", () => {
    it("each step uses previous step output as baseline", () => { ... });
    it("detects blockers from unresolved previous steps", () => { ... });
    it("enforces chronological dates", () => { ... });
    it("summary totals match step-by-step sums", () => { ... });
  });

  describe("Stale Detection", () => {
    it("marks scenario stale when regulation data changes", () => { ... });
    it("recompute produces updated results", () => { ... });
  });

  describe("Comparison", () => {
    it("identifies best scenario from 3 options", () => { ... });
    it("ranking weights score 40%, financial 30%, risk 30%", () => { ... });
  });
});
```

---

## Implementation Order

1. **Phase 1** — Engine bridge + rewrite all 4 scenario functions (CRITICAL, foundation for everything)
2. **Phase 6C** — Zod validation (quick win, prevents bugs during development)
3. **Phase 2** — Composite scenarios (new scenario type)
4. **Phase 4** — Scenario chains (the breakthrough feature)
5. **Phase 3** — Side-by-side comparison
6. **Phase 5** — Stale detection + auto-recompute
7. **Phase 6A/B** — Favorites + PDF export
8. **Phase 7** — Full test suite

## Quality Checklist

Before marking complete, verify:

- [ ] All hardcoded `JURISDICTION_PROFILES` and `OPERATOR_TYPE_PROFILES` are deleted
- [ ] Every scenario calls `compareCompliance()` from the engine bridge
- [ ] Article numbers in results are REAL articles from `caelex-eu-space-act-engine.json`
- [ ] Composite scenarios detect interaction effects
- [ ] Chain steps correctly cascade (step N output = step N+1 input)
- [ ] Chain dates enforce chronological order
- [ ] Comparison endpoint ranks scenarios by weighted composite score
- [ ] Stale scenarios are detected and marked in UI
- [ ] Recompute updates results with current regulation data
- [ ] Favorites toggle works and sorts to top
- [ ] All Zod schemas validate input at API level
- [ ] No paid services or APIs introduced
- [ ] TypeScript compiles with zero errors (`npm run typecheck`)
- [ ] All tests pass (`npm run test:run`)
- [ ] Build succeeds (`npm run build`)

## Prisma Schema Changes

```prisma
model WhatIfScenario {
  // ... existing fields ...
  regulationVersion  String?
  isStale           Boolean  @default(false)
  // Update scenarioType to also accept "composite" and "chain"
}
```

Run `npx prisma db push` after schema changes.
