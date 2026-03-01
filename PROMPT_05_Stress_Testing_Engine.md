# Caelex Assure — Regulatory Stress Testing Engine

## Prompt for Claude Code

### Context

You are working on **Caelex**, a full-stack space regulatory compliance SaaS platform. Read `CLAUDE.md` in the project root for the complete technical specification. The codebase is Next.js 15 (App Router), TypeScript strict, PostgreSQL (Neon), Prisma ORM, NextAuth v5, Tailwind CSS. The project has 44 page routes, 138 API route handlers, 100+ Prisma models, and eight server-only compliance engines.

**Caelex Assure** is the outward-facing product line. The base Assure layer, Regulatory Credit Rating (RCR), State of Space Compliance (SSC), Insurance Risk Pricing Engine (IRPE), and Regulatory Escrow already exist.

**Note:** The What-If/Compliance Digital Twin feature already exists in Caelex Comply (`src/lib/services/whatif-simulation-service.ts`, `src/lib/services/whatif-engine-bridge.ts`, `WhatIfScenario` Prisma model). The Stress Testing Engine builds on top of these existing simulation capabilities but adds: (1) investor-facing stress test reports, (2) standardized regulatory shock scenarios, (3) resilience scoring, and (4) Monte Carlo simulation for probabilistic outcomes.

---

### What to Build

Build the **Regulatory Stress Testing Engine** — a system that simulates how an organization's compliance status would be affected by regulatory shocks, policy changes, and adverse events. This is the compliance equivalent of bank stress tests (EBA/Fed CCAR): investors can see not just where a company stands today, but how resilient it is to future regulatory disruption.

**Strategic Intent:** Investors and board members need forward-looking intelligence. Current compliance is necessary but insufficient — they need to know: "What happens if the EU Space Act requirements tighten? What if NIS2 enforcement increases? What if there's a debris incident?" Stress testing answers these questions with quantified impact analysis. This makes Caelex indispensable for investor presentations, board reports, and capital allocation decisions.

---

### Core: Stress Test Scenarios

Build at `src/lib/stress-engine.server.ts` (server-only):

#### Pre-Defined Scenario Library

Create a library of standardized regulatory stress scenarios. Each scenario defines one or more "shocks" — hypothetical changes to the regulatory environment that affect compliance scores.

```typescript
interface StressScenario {
  id: string;
  name: string;
  description: string;
  category: ScenarioCategory;
  severity: "MILD" | "MODERATE" | "SEVERE" | "EXTREME";

  // What changes in this scenario
  shocks: RegulatoryShock[];

  // Expected timeline
  timeHorizon: "6M" | "1Y" | "2Y" | "5Y";

  // Probability assessment
  probabilityLabel: string; // "Likely within 2 years", "Possible but unlikely"
  probabilityScore: number; // 0-1

  // Basis
  regulatoryBasis: string; // Which regulation/proposal motivates this
  realWorldPrecedent?: string; // Historical parallel
}

interface RegulatoryShock {
  type: ShockType;
  target: string; // Which module/component is affected
  magnitude: number; // Severity multiplier (1.0 = no change, 2.0 = doubled requirements)
  description: string;
  affectedArticles?: string[]; // EU Space Act articles affected
}

type ScenarioCategory =
  | "EU_SPACE_ACT" // EU Space Act scope/requirement changes
  | "NIS2" // NIS2 enforcement/scope changes
  | "DEBRIS" // Debris regulation tightening
  | "ENVIRONMENTAL" // Environmental requirement expansion
  | "CROSS_BORDER" // Multi-jurisdiction complexity increase
  | "INCIDENT" // Major incident scenario
  | "MARKET" // Market-driven regulatory response
  | "GEOPOLITICAL"; // Geopolitical regulatory shifts

type ShockType =
  | "REQUIREMENT_INCREASE" // Existing requirements become stricter
  | "SCOPE_EXPANSION" // Regulation applies to more activities
  | "NEW_REGULATION" // Entirely new compliance requirement
  | "ENFORCEMENT_INCREASE" // Stricter enforcement of existing rules
  | "DEADLINE_ACCELERATION" // Compliance deadlines moved earlier
  | "PENALTY_INCREASE" // Fine/penalty amounts increased
  | "INCIDENT_IMPACT" // An incident affects compliance status
  | "AUTHORIZATION_REVOCATION"; // Authorization at risk
```

#### Scenario Library (Pre-Built)

Define at minimum these 12 standardized scenarios in `src/data/stress-scenarios.ts`:

1. **EU Space Act Full Enforcement** (MODERATE, EU_SPACE_ACT, 1Y)
   - All 119 articles actively enforced with NCA audits
   - Shocks: ENFORCEMENT_INCREASE on all authorization components × 1.3

2. **NIS2 Space-Specific Audit Wave** (SEVERE, NIS2, 6M)
   - ENISA/national CSIRT conducts sector-wide space audit
   - Shocks: ENFORCEMENT_INCREASE on cybersecurity × 1.5, DEADLINE_ACCELERATION on NIS2 measures

3. **Kessler Event / Major Debris Incident** (EXTREME, DEBRIS, 6M)
   - Major collision generates significant debris field
   - Shocks: REQUIREMENT_INCREASE on debris mitigation × 2.0, NEW_REGULATION for active debris removal, SCOPE_EXPANSION of liability

4. **GDPR-Style Penalty for Space Data** (SEVERE, NIS2, 1Y)
   - First major fine under NIS2 for a space operator
   - Shocks: PENALTY_INCREASE × 3.0, ENFORCEMENT_INCREASE on all NIS2 Art. 21 measures × 1.4

5. **Multi-Jurisdiction Harmonization Failure** (MODERATE, CROSS_BORDER, 2Y)
   - EU member states implement divergent national space laws
   - Shocks: SCOPE_EXPANSION on jurisdictional analysis × 1.5, REQUIREMENT_INCREASE on cross-border compliance

6. **Environmental Regulation Expansion** (MODERATE, ENVIRONMENTAL, 2Y)
   - EU extends environmental impact rules to cover atmospheric pollution from launches
   - Shocks: NEW_REGULATION for atmospheric impact, SCOPE_EXPANSION of environmental assessment × 1.4

7. **Cyber Attack on Ground Infrastructure** (SEVERE, INCIDENT, 6M)
   - Successful cyber attack on ground station/TT&C
   - Shocks: INCIDENT_IMPACT on cybersecurity score -30pts, ENFORCEMENT_INCREASE on NIS2 × 1.5, potential AUTHORIZATION_REVOCATION

8. **Insurance Market Hardening** (MODERATE, MARKET, 1Y)
   - Multiple space losses lead to premium increases industry-wide
   - Shocks: REQUIREMENT_INCREASE on insurance adequacy × 1.3, NEW_REGULATION for minimum coverage levels

9. **Authorization Regime Overhaul** (SEVERE, EU_SPACE_ACT, 2Y)
   - EU Space Act delegated acts require re-authorization for all existing operators
   - Shocks: DEADLINE_ACCELERATION on authorization, REQUIREMENT_INCREASE × 1.5 on authorization components

10. **Geopolitical Export Control Tightening** (MODERATE, GEOPOLITICAL, 1Y)
    - US/EU expand space technology export controls
    - Shocks: SCOPE_EXPANSION on export control compliance, NEW_REGULATION for dual-use technology

11. **SST/SSA Data Sharing Mandate** (MILD, EU_SPACE_ACT, 2Y)
    - Mandatory sharing of space situational awareness data with ESA/EU SST
    - Shocks: NEW_REGULATION for SSA data sharing, REQUIREMENT_INCREASE on supervision reporting × 1.2

12. **Compound Crisis: Incident + Regulatory Response** (EXTREME, INCIDENT, 1Y)
    - Major space incident triggers emergency regulatory measures
    - Shocks: All of scenario 3 + emergency authorization review + accelerated NIS2 enforcement + insurance mandate

---

### Feature 1: Simulation Engine

The stress test simulation applies scenario shocks to the current compliance state and computes the resulting impact:

```typescript
interface StressTestResult {
  id: string;
  organizationId: string;
  scenarioId: string;
  scenario: StressScenario;

  // Baseline (current state)
  baselineRRS: number;
  baselineRCR: string;
  baselineRiskTier: string; // Insurance risk tier

  // Stressed state
  stressedRRS: number;
  stressedRCR: string;
  stressedRiskTier: string;

  // Impact
  rrsImpact: number; // Percentage points change
  gradeImpact: number; // Number of notches (e.g., AA → A = -2 notches)
  riskTierImpact: string; // "No change" | "Downgraded from STANDARD to SUBSTANDARD"

  // Component-level impact
  componentImpacts: {
    component: string;
    baseline: number;
    stressed: number;
    impact: number;
    keyDrivers: string[]; // Which shocks affected this component most
  }[];

  // Financial impact
  estimatedRemediationCost: CostEstimate;
  estimatedPremiumImpact: number; // Percentage change in insurance premium
  estimatedTimeToRemediate: string; // "6-12 months"

  // Resilience assessment
  resilience: ResilienceAssessment;

  computedAt: Date;
}

interface CostEstimate {
  low: number; // EUR
  mid: number;
  high: number;
  breakdown: {
    category: string;
    description: string;
    estimate: number;
  }[];
}

interface ResilienceAssessment {
  overallScore: number; // 0-100
  rating:
    | "HIGHLY_RESILIENT"
    | "RESILIENT"
    | "MODERATE"
    | "VULNERABLE"
    | "FRAGILE";
  strengths: string[];
  vulnerabilities: string[];
  recommendations: string[];
}
```

#### Simulation Logic

For each shock in the scenario:

1. Identify which RRS components are affected by the shock's `target`
2. Apply the `magnitude` multiplier to the GAP (not the score): `newGap = currentGap × magnitude`
3. Recompute component scores with expanded gaps
4. Recompute weighted RRS
5. Map to new RCR grade and insurance risk tier
6. Calculate remediation cost estimates using gap size × industry cost benchmarks

**Important:** Use the existing What-If simulation service (`src/lib/services/whatif-simulation-service.ts`) as a foundation. The stress engine applies What-If shocks at a regulatory level (not article-by-article) and adds resilience scoring.

---

### Feature 2: Monte Carlo Simulation

For advanced users, implement probabilistic stress testing using Monte Carlo simulation:

1. For each scenario, define uncertainty ranges on shock magnitudes (±20%)
2. Run N iterations (default: 1,000) with randomized magnitudes within ranges
3. Compute distribution of outcomes (RRS, RCR grade, cost)
4. Report: P5, P25, P50 (median), P75, P95 outcomes
5. Generate probability density charts for key metrics

```typescript
interface MonteCarloResult {
  iterations: number;
  scenarioId: string;

  rrsDistribution: {
    p5: number;
    p25: number;
    median: number;
    p75: number;
    p95: number;
    mean: number;
    stdDev: number;
  };

  gradeDistribution: Record<string, number>; // { "A": 0.45, "BBB": 0.30, "BB": 0.25 }

  costDistribution: {
    p5: number;
    p25: number;
    median: number;
    p75: number;
    p95: number;
  };

  // Value at Risk (VaR)
  var95: number; // 95% confidence: maximum expected RRS loss
  cvar95: number; // Conditional VaR: expected loss in worst 5% of cases
}
```

Use Web Workers or split computation into chunks to avoid blocking the Node.js event loop. Keep iterations fast — each should be a simple re-scoring with perturbed inputs, not a full engine re-run.

---

### Feature 3: Prisma Schema

```prisma
model StressTest {
  id              String   @id @default(cuid())
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id])
  createdById     String
  createdBy       User     @relation(fields: [createdById], references: [id])

  scenarioId      String
  scenarioName    String
  scenarioConfig  Json     // Full scenario definition (frozen at test time)

  // Results
  baselineRRS     Float
  baselineRCR     String
  stressedRRS     Float
  stressedRCR     String
  rrsImpact       Float

  componentImpacts  Json   // ComponentImpact[]
  financialImpact   Json   // CostEstimate
  premiumImpact     Float?
  resilience        Json   // ResilienceAssessment

  // Monte Carlo (optional)
  monteCarloEnabled   Boolean @default(false)
  monteCarloResult    Json?   // MonteCarloResult
  monteCarloIterations Int?

  computedAt      DateTime @default(now())

  @@index([organizationId, computedAt])
  @@index([scenarioId])
}

model StressTestReport {
  id              String   @id @default(cuid())
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id])
  createdById     String
  createdBy       User     @relation(fields: [createdById], references: [id])

  // Can include multiple scenario results
  testIds         Json     // String[] - StressTest IDs included
  title           String
  narrative       String   @db.Text   // Executive summary

  // Sharing
  token           String   @unique
  expiresAt       DateTime
  viewCount       Int      @default(0)
  maxViews        Int?
  isRevoked       Boolean  @default(false)
  granularity     ShareGranularity @default(SUMMARY)

  views           StressTestReportView[]
  createdAt       DateTime @default(now())

  @@index([organizationId])
  @@index([token])
}

model StressTestReportView {
  id          String   @id @default(cuid())
  reportId    String
  report      StressTestReport @relation(fields: [reportId], references: [id])
  viewerIp    String?  // Encrypted
  userAgent   String?
  viewedAt    DateTime @default(now())
}
```

---

### Feature 4: API Routes

- `GET /api/assure/stress/scenarios` — List available stress scenarios
- `POST /api/assure/stress/run` — Run stress test (single scenario)
- `POST /api/assure/stress/run-batch` — Run multiple scenarios in parallel
- `POST /api/assure/stress/run-monte-carlo` — Run Monte Carlo simulation
- `GET /api/assure/stress/results` — List all test results for org
- `GET /api/assure/stress/results/[id]` — Get specific result
- `POST /api/assure/stress/report/generate` — Generate shareable stress test report (multi-scenario)
- `GET /api/assure/stress/report/[id]` — Get report
- `GET /api/assure/stress/report/[id]/export` — PDF export
- `PATCH /api/assure/stress/report/[id]` — Update/revoke report

#### Public View

- `GET /assure/stress/[token]` — Public view of stress test report

---

### Feature 5: Dashboard Pages

- `/dashboard/assure/stress` — Stress testing overview (recent results, scenario library)
- `/dashboard/assure/stress/run` — Run new stress test (select scenario, configure, execute)
- `/dashboard/assure/stress/results/[id]` — Interactive result explorer
- `/dashboard/assure/stress/compare` — Compare results across multiple scenarios
- `/dashboard/assure/stress/reports` — Manage generated reports

#### UI Components (in `src/components/assure/`)

- `ScenarioLibrary` — Grid of scenario cards with severity badges, category tags, and "Run" buttons
- `StressTestRunner` — Configuration panel: select scenario, toggle Monte Carlo, set iterations, execute
- `StressImpactDashboard` — Main result view: before/after comparison of RRS, RCR, risk tier with animated transitions
- `ComponentImpactChart` — Grouped bar chart: baseline vs. stressed scores per component
- `RemediationCostBreakdown` — Stacked bar or treemap of estimated remediation costs by category
- `MonteCarloDistribution` — Probability density chart (bell curve) for RRS outcome distribution with VaR markers
- `ResilienceScoreGauge` — Circular gauge for resilience rating (0-100)
- `ScenarioComparisonMatrix` — Table/heatmap comparing impacts across multiple scenarios
- `StressTestReportBuilder` — Select which scenarios to include, add narrative, configure sharing

Design: Match existing dark theme. Use red/amber for stress impacts, emerald for resilience. Animated transitions when showing before→after states. Think Bloomberg Terminal stress test visualization.

---

### Feature 6: PDF Report

Add template at `src/lib/pdf/stress-test-report.tsx`:

1. **Cover Page** — "Regulatory Stress Test Report", org name, date, Caelex branding, "CONFIDENTIAL" watermark
2. **Executive Summary** — Key findings: most impactful scenario, overall resilience rating, top 3 vulnerabilities
3. **Methodology** — How stress tests are computed, shock types, magnitude definitions
4. **Scenario Results** (one section per scenario):
   - Scenario description and probability assessment
   - Before/after dashboard: RRS, RCR, risk tier
   - Component-level impacts table
   - Remediation cost estimate
5. **Cross-Scenario Analysis** — Comparison matrix, worst-case scenario identification
6. **Resilience Assessment** — Overall resilience score, strengths, vulnerabilities
7. **Monte Carlo Analysis** (if applicable) — Distribution charts, VaR metrics, confidence intervals
8. **Recommendations** — Prioritized actions to improve resilience, estimated costs and timelines
9. **Disclaimer** — Stress tests are hypothetical, not predictions. Based on current data and assumptions.

---

### Implementation Guidelines

1. **Server-only:** `stress-engine.server.ts` imports `server-only`.
2. **Reuse What-If:** Build on `whatif-simulation-service.ts` and `whatif-engine-bridge.ts` for the underlying simulation mechanics. The stress engine adds the scenario library, batch execution, Monte Carlo, and resilience scoring layers.
3. **Performance:** Single-scenario stress test should complete in <5 seconds. Monte Carlo (1,000 iterations) should complete in <30 seconds. Use chunked computation if needed.
4. **Deterministic scenarios:** Pre-defined scenarios always produce the same results for the same input (no randomness except Monte Carlo). Monte Carlo uses a seedable PRNG for reproducibility.
5. **Scenario versioning:** Include scenario version in every result. If scenarios are updated, old results remain valid with their original scenario definition (frozen in `scenarioConfig`).
6. **Audit trail:** Log all stress test executions and report generations.
7. **Rate limiting:** Stress test execution: `sensitive` tier (computationally expensive). Report viewing: `api` tier.
8. **Permissions:** Run stress tests: MANAGER+. Generate reports: ADMIN+. View scenarios: MEMBER+.
9. **Testing:** Unit tests for shock application logic, resilience scoring, Monte Carlo convergence. Integration tests for end-to-end scenario execution.

---

### What NOT to Build

- Do NOT build custom scenario creation UI — pre-defined scenarios only for now (Phase 3 for custom)
- Do NOT build real-time continuous stress monitoring — on-demand execution is sufficient
- Do NOT build AI-generated scenario narratives — use deterministic templates
- Do NOT build comparison with other organizations' stress results — privacy concern
- Do NOT modify the existing What-If simulation service — compose on top of it

---

### File Structure

```
src/
  app/
    assure/
      stress/[token]/page.tsx           # Public report view
    dashboard/
      assure/
        stress/
          page.tsx                       # Overview
          run/page.tsx                   # Run new test
          results/[id]/page.tsx          # Result explorer
          compare/page.tsx               # Multi-scenario comparison
          reports/page.tsx               # Report management
    api/
      assure/
        stress/
          scenarios/route.ts             # GET scenarios
          run/route.ts                   # POST run single
          run-batch/route.ts             # POST run batch
          run-monte-carlo/route.ts       # POST Monte Carlo
          results/route.ts               # GET list
          results/[id]/route.ts          # GET specific
          report/
            generate/route.ts            # POST generate
            [id]/route.ts               # GET, PATCH
            [id]/export/route.ts        # GET PDF

  lib/
    stress-engine.server.ts              # Stress test engine (server-only)
    pdf/
      stress-test-report.tsx             # PDF template

  data/
    stress-scenarios.ts                  # Pre-defined scenario library

  components/
    assure/
      ScenarioLibrary.tsx
      StressTestRunner.tsx
      StressImpactDashboard.tsx
      ComponentImpactChart.tsx
      RemediationCostBreakdown.tsx
      MonteCarloDistribution.tsx
      ResilienceScoreGauge.tsx
      ScenarioComparisonMatrix.tsx
      StressTestReportBuilder.tsx
```

### Priority Order

1. Stress scenario data file (`stress-scenarios.ts`) with 12 pre-defined scenarios
2. Prisma schema additions + `db:push`
3. Stress engine — shock application, score recomputation, resilience scoring
4. Single-scenario execution API
5. Dashboard pages (overview + run + result explorer)
6. Batch execution + comparison view
7. Monte Carlo simulation
8. Report generation + PDF template + sharing
9. Public report view
10. Tests
