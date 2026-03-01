# Caelex Assure — Insurance Risk Pricing Engine

## Prompt for Claude Code

### Context

You are working on **Caelex**, a full-stack space regulatory compliance SaaS platform. Read `CLAUDE.md` in the project root for the complete technical specification. The codebase is Next.js 15 (App Router), TypeScript strict, PostgreSQL (Neon), Prisma ORM, NextAuth v5, Tailwind CSS. The project has 44 page routes, 138 API route handlers, 100+ Prisma models, and eight server-only compliance engines.

**Caelex Assure** is the outward-facing product line. The base Assure layer (RRS, share links, DD packages), Regulatory Credit Rating (RCR), and State of Space Compliance (SSC) intelligence already exist.

---

### What to Build

Build the **Insurance Risk Pricing Engine (IRPE)** — a system that translates compliance data into actuarial risk factors that space insurance underwriters can use to price policies. This creates a direct economic incentive loop: better compliance → lower insurance premiums → operators invest in Caelex to improve their scores.

**Strategic Intent:** Space insurance is a $600M+ annual market dominated by a handful of underwriters (AXA XL, Marsh, Atrium, Munich Re Space). These underwriters currently have no standardized way to assess regulatory compliance risk. They rely on bespoke questionnaires and engineering reviews. Caelex becomes the bridge: operators submit their Caelex-verified compliance profile to their insurer, the insurer uses the IRPE risk factors to adjust premiums. Caelex captures value from both sides.

**Important:** Caelex does NOT become an insurance company or underwriter. The IRPE produces **risk factor reports** that insurers integrate into their existing pricing models. Think of it as a compliance-risk data feed for the insurance industry, similar to how Verisk provides data to property insurers.

---

### Core: Risk Factor Computation Engine

Build at `src/lib/irpe-engine.server.ts` (server-only):

#### Risk Factor Model

The IRPE computes a set of standardized risk factors from compliance data. Each factor maps to a dimension that insurers already consider in their underwriting:

```typescript
interface InsuranceRiskProfile {
  organizationId: string;
  computedAt: Date;
  validUntil: Date; // 90 days validity
  methodologyVersion: string;

  // Overall risk tier
  riskTier: "PREFERRED" | "STANDARD" | "SUBSTANDARD" | "DECLINE";
  overallRiskMultiplier: number; // 0.85 (discount) to 1.50 (surcharge)

  // Component risk factors
  factors: InsuranceRiskFactor[];

  // Premium impact estimate
  estimatedPremiumImpact: PremiumImpact;

  // Confidence
  dataCompleteness: number; // 0-1
  assessmentCurrency: number; // 0-1 (how recent the data is)
}

interface InsuranceRiskFactor {
  factorId: string;
  category: RiskFactorCategory;
  name: string;
  description: string;

  // Scoring
  rawScore: number; // 0-100 from compliance data
  riskMultiplier: number; // Impact on premium (0.9 = 10% discount, 1.1 = 10% surcharge)
  weight: number; // Relative importance in overall risk

  // Data source
  dataSource: string; // Which Prisma model/engine
  lastUpdated: Date;
  completeness: number; // 0-1

  // Underwriter context
  regulatoryBasis: string; // "EU Space Act Art. 8", "NIS2 Art. 21"
  industryBenchmark: number; // Average score for this factor across cohort
  percentileRank: number; // Org's position 0-100
}

type RiskFactorCategory =
  | "AUTHORIZATION" // Licensing and permit status
  | "CYBERSECURITY" // Cyber risk posture
  | "DEBRIS_MITIGATION" // Space debris compliance
  | "ENVIRONMENTAL" // Environmental impact measures
  | "INSURANCE_CURRENT" // Existing insurance adequacy
  | "OPERATIONAL" // Operational procedures and governance
  | "INCIDENT_HISTORY" // Past incidents and response quality
  | "REGULATORY_TREND" // Compliance trajectory
  | "JURISDICTIONAL"; // Multi-jurisdiction complexity risk

interface PremiumImpact {
  baselineScenario: string; // "Standard European satellite operator, 5yr GEO mission"
  estimatedAdjustment: number; // Percentage: -15% to +50%
  confidenceInterval: {
    low: number;
    high: number;
  };
  keyDrivers: string[]; // Top 3 factors driving the adjustment
  improvementOpportunities: {
    factor: string;
    currentScore: number;
    targetScore: number;
    estimatedPremiumSavings: string; // "5-10% reduction"
    requiredActions: string[];
  }[];
}
```

#### Risk Factor Definitions

Define these risk factors with their computation logic:

| Factor ID            | Category          | Data Source                              | Low Risk (multiplier <1)                     | High Risk (multiplier >1)                |
| -------------------- | ----------------- | ---------------------------------------- | -------------------------------------------- | ---------------------------------------- |
| `auth_status`        | AUTHORIZATION     | `AuthorizationWorkflow`                  | Active authorization, all permits current    | No authorization, expired permits        |
| `auth_completeness`  | AUTHORIZATION     | EU Space Act engine output               | All required articles addressed              | Major gaps in authorization requirements |
| `cyber_nis2`         | CYBERSECURITY     | `NIS2Assessment`, NIS2 engine            | Full NIS2 compliance, all Art.21 measures    | No NIS2 assessment, critical gaps        |
| `cyber_assessment`   | CYBERSECURITY     | `CybersecurityAssessment`                | Comprehensive security controls              | Minimal or no security assessment        |
| `debris_plan`        | DEBRIS_MITIGATION | `DebrisAssessment`                       | Full debris mitigation plan, IADC compliance | No debris plan, exceeds guidelines       |
| `environmental`      | ENVIRONMENTAL     | `EnvironmentalAssessment`                | Full environmental review, LCA complete      | No environmental assessment              |
| `insurance_adequacy` | INSURANCE_CURRENT | `InsuranceAssessment`, `InsurancePolicy` | Adequate coverage, current policies          | Underinsured or gaps in coverage         |
| `supervision`        | OPERATIONAL       | `SupervisionConfig`, `SupervisionReport` | Active supervision, regular reporting        | No supervision framework                 |
| `incident_history`   | INCIDENT_HISTORY  | `IncidentReport`, `NCASubmission`        | No incidents, or rapid response              | Multiple incidents, slow response        |
| `incident_response`  | INCIDENT_HISTORY  | `IncidentReport` NIS2 phases             | NIS2 timeline compliance (24h/72h/1mo)       | Missed notification deadlines            |
| `governance`         | OPERATIONAL       | `AuditLog`, `Document` vault             | Complete audit trail, all docs current       | Sparse logging, missing documents        |
| `trajectory`         | REGULATORY_TREND  | `ComplianceSnapshot`, RRS history        | Improving trend, >5pp/quarter                | Declining trend, stagnant                |
| `jurisdiction_risk`  | JURISDICTIONAL    | `SpaceLawAssessment`                     | Single, well-regulated jurisdiction          | Multi-jurisdiction, complex, unfavorable |
| `document_vault`     | OPERATIONAL       | `Document` model                         | All required documents uploaded, current     | Missing critical documents               |

#### Risk Tier Classification

```
PREFERRED:    overallRiskMultiplier <= 0.95  (top compliance, premium discount eligible)
STANDARD:     0.95 < multiplier <= 1.10      (baseline compliance, standard pricing)
SUBSTANDARD:  1.10 < multiplier <= 1.35      (material gaps, premium surcharge)
DECLINE:      multiplier > 1.35              (severe risk, insurer may decline coverage)
```

---

### Feature 1: Prisma Schema

```prisma
model InsuranceRiskProfile {
  id                String   @id @default(cuid())
  organizationId    String
  organization      Organization @relation(fields: [organizationId], references: [id])

  riskTier          InsuranceRiskTier
  overallMultiplier Float
  methodologyVersion String @default("1.0.0")
  dataCompleteness  Float
  assessmentCurrency Float

  factors           Json     // InsuranceRiskFactor[]
  premiumImpact     Json     // PremiumImpact

  validUntil        DateTime
  computedAt        DateTime @default(now())

  @@index([organizationId, computedAt])
  @@index([riskTier])
}

enum InsuranceRiskTier {
  PREFERRED
  STANDARD
  SUBSTANDARD
  DECLINE
}

model InsuranceRiskReport {
  id                String   @id @default(cuid())
  organizationId    String
  organization      Organization @relation(fields: [organizationId], references: [id])
  profileId         String
  createdById       String
  createdBy         User     @relation(fields: [createdById], references: [id])

  // Report configuration
  recipientType     InsuranceRecipientType  // UNDERWRITER, BROKER, INTERNAL
  recipientName     String?
  includeDetails    Boolean  @default(true)  // Full factor breakdown vs summary only
  includeRecommendations Boolean @default(true)

  // Sharing
  token             String   @unique
  expiresAt         DateTime
  viewCount         Int      @default(0)
  maxViews          Int?
  isRevoked         Boolean  @default(false)

  views             InsuranceReportView[]
  createdAt         DateTime @default(now())

  @@index([organizationId])
  @@index([token])
}

enum InsuranceRecipientType {
  UNDERWRITER
  BROKER
  INTERNAL
  BOARD
}

model InsuranceReportView {
  id          String   @id @default(cuid())
  reportId    String
  report      InsuranceRiskReport @relation(fields: [reportId], references: [id])
  viewerIp    String?  // Encrypted
  userAgent   String?
  viewedAt    DateTime @default(now())
}
```

---

### Feature 2: Premium Impact Calculator

Build a premium impact estimation model. This does NOT calculate actual premiums (that's the insurer's job). It estimates the DIRECTION and MAGNITUDE of how compliance status affects pricing.

#### Baseline Scenarios

Define baseline scenarios that operators can select for relevance:

```typescript
const BASELINE_SCENARIOS = {
  GEO_COMMS: {
    name: "GEO Communications Satellite",
    baselinePremiumRange: "2-4% of insured value",
    typicalInsuredValue: "EUR 150M-400M",
    missionDuration: "15 years",
    keyRiskFactors: [
      "authorization",
      "cybersecurity",
      "debris",
      "insurance_adequacy",
    ],
  },
  LEO_CONSTELLATION: {
    name: "LEO Constellation (50+ satellites)",
    baselinePremiumRange: "3-6% of annual insured value",
    typicalInsuredValue: "EUR 500M-2B portfolio",
    missionDuration: "5-7 years per satellite",
    keyRiskFactors: [
      "debris",
      "cybersecurity",
      "environmental",
      "incident_history",
    ],
  },
  LAUNCH_SERVICE: {
    name: "Launch Service Provider",
    baselinePremiumRange: "5-15% per launch",
    typicalInsuredValue: "EUR 100M-500M per launch",
    missionDuration: "Per launch",
    keyRiskFactors: [
      "authorization",
      "environmental",
      "insurance_adequacy",
      "incident_history",
    ],
  },
  IN_ORBIT_SERVICE: {
    name: "In-Orbit Servicing / Space Tug",
    baselinePremiumRange: "4-8% of mission value",
    typicalInsuredValue: "EUR 50M-200M",
    missionDuration: "3-10 years",
    keyRiskFactors: [
      "authorization",
      "debris",
      "cybersecurity",
      "jurisdiction_risk",
    ],
  },
};
```

#### Impact Calculation

For each factor, compute the premium impact:

1. Score the factor (0-100) from compliance data
2. Map to risk multiplier using a sigmoid curve (smooth transition, not step function)
3. Weight by the factor's importance for the selected baseline scenario
4. Compute weighted geometric mean of all multipliers → overall risk multiplier
5. Estimate premium adjustment: `(overallMultiplier - 1.0) * 100`% change from baseline

#### Improvement Roadmap

The most valuable output for operators: "If you improve factor X from score Y to score Z, your estimated premium savings are N%." This directly ties Caelex Comply usage to cost savings.

For each factor below the 75th percentile:

1. Calculate current multiplier
2. Calculate multiplier at target score (75th percentile or full compliance)
3. Difference = estimated premium savings
4. List specific actions needed (from compliance engine gap analysis)

---

### Feature 3: API Routes

- `POST /api/assure/insurance/compute` — Compute risk profile (MANAGER+)
- `GET /api/assure/insurance/current` — Current risk profile
- `GET /api/assure/insurance/history` — Risk profile history
- `POST /api/assure/insurance/report/generate` — Generate shareable report for insurer
- `GET /api/assure/insurance/report/[id]` — Get report
- `GET /api/assure/insurance/report/[id]/export` — PDF export
- `PATCH /api/assure/insurance/report/[id]` — Update/revoke report
- `GET /api/assure/insurance/scenarios` — List baseline scenarios
- `POST /api/assure/insurance/simulate` — Simulate premium impact for hypothetical improvements

#### Public Report View (no auth)

- `GET /assure/insurance/[token]` — Public view of insurance risk report (for underwriter)

---

### Feature 4: Dashboard Pages

- `/dashboard/assure/insurance` — Insurance risk overview (tier, multiplier, top factors)
- `/dashboard/assure/insurance/factors` — Detailed factor breakdown with improvement roadmap
- `/dashboard/assure/insurance/simulate` — Interactive simulator: "What if I improve X?"
- `/dashboard/assure/insurance/reports` — Manage generated reports for insurers

#### UI Components (in `src/components/assure/`)

- `RiskTierBadge` — Large badge showing PREFERRED/STANDARD/SUBSTANDARD/DECLINE with color coding (emerald/blue/amber/red)
- `RiskMultiplierGauge` — Semicircle gauge showing 0.85x to 1.50x with current position
- `RiskFactorTable` — Sortable table of all factors with scores, multipliers, benchmarks, and trend arrows
- `PremiumImpactCard` — Card showing estimated premium adjustment range with confidence interval
- `ImprovementRoadmap` — Ordered list of improvement opportunities with estimated savings
- `PremiumSimulator` — Interactive: slider for each factor, real-time recalculation of overall multiplier and estimated savings
- `InsuranceReportManager` — Table of generated reports with share/revoke actions

#### Public Underwriter View

The `/assure/insurance/[token]` page shows:

1. Risk tier badge (prominent)
2. Overall multiplier with confidence interval
3. Factor breakdown table (if `includeDetails` is true)
4. Peer benchmark comparison
5. Improvement roadmap (if `includeRecommendations` is true)
6. Data completeness and assessment currency indicators
7. Methodology link
8. "Powered by Caelex" footer

Design: Professional, institutional. Think Verisk BCEGS report. Dark theme with Caelex branding.

---

### Feature 5: PDF Report

Add template at `src/lib/pdf/insurance-risk-report.tsx`:

1. **Cover Page** — "Insurance Risk Assessment Report", org name, risk tier, date, Caelex branding
2. **Executive Summary** — Risk tier, overall multiplier, top 3 drivers, premium impact estimate
3. **Risk Factor Analysis** — Each factor with score, benchmark, trend, regulatory basis
4. **Premium Impact Estimation** — Baseline scenario, adjustment range, confidence interval, methodology
5. **Improvement Roadmap** — Prioritized actions with estimated premium savings
6. **Peer Comparison** — Anonymized position within operator type cohort
7. **Methodology Appendix** — Complete factor definitions, multiplier curves, weight justifications, data sources

---

### Feature 6: Cron Job

Add `/api/cron/compute-insurance-risk`:

- Daily at 8:00 AM UTC (after RRS at 7:00, RCR at 7:30)
- Compute risk profiles for all orgs with active subscriptions
- Detect tier changes (STANDARD → PREFERRED = good news notification, STANDARD → SUBSTANDARD = alert)
- Flag profiles approaching expiry (< 14 days validity)

---

### Implementation Guidelines

1. **Server-only:** `irpe-engine.server.ts` imports `server-only`. All computation server-side.
2. **No actual premium calculation:** Caelex estimates IMPACT, not premiums. Language throughout must be "estimated adjustment" not "premium quote". Include disclaimers.
3. **Methodology transparency:** Every multiplier curve, weight, and threshold must be documented and exportable. Insurers need to validate the methodology.
4. **Sigmoid curves:** Use sigmoid functions for score-to-multiplier mapping for smooth, non-arbitrary transitions. Document the curve parameters.
5. **Audit trail:** Log all risk profile computations, report generations, and report views.
6. **Encryption:** Viewer IP in report views must be encrypted (use existing encryption utilities).
7. **Rate limiting:** Report view endpoints: `api` tier. Computation: `sensitive` tier.
8. **Permissions:** Compute: MANAGER+. Report generation: ADMIN+. Revocation: ADMIN+.
9. **Testing:** Unit tests for multiplier curves, tier classification, premium impact estimation. Integration tests for report generation and sharing flow.

---

### What NOT to Build

- Do NOT build actual premium pricing or quoting capability — Caelex is a data provider, not an insurer
- Do NOT build insurer portal or multi-insurer comparison — that's Phase 3
- Do NOT build claims integration or loss history tracking — out of scope
- Do NOT build automated insurer API submission — manual report sharing via links is sufficient for now

---

### File Structure

```
src/
  app/
    assure/
      insurance/[token]/page.tsx        # Public underwriter view
    dashboard/
      assure/
        insurance/
          page.tsx                       # Risk overview
          factors/page.tsx               # Factor breakdown
          simulate/page.tsx              # Premium simulator
          reports/page.tsx               # Report management
    api/
      assure/
        insurance/
          compute/route.ts              # POST compute
          current/route.ts              # GET current
          history/route.ts              # GET history
          report/
            generate/route.ts           # POST generate
            [id]/route.ts               # GET, PATCH
            [id]/export/route.ts        # GET PDF
          scenarios/route.ts            # GET scenarios
          simulate/route.ts             # POST simulate
      cron/
        compute-insurance-risk/route.ts

  lib/
    irpe-engine.server.ts               # Risk pricing engine (server-only)
    pdf/
      insurance-risk-report.tsx         # PDF template

  components/
    assure/
      RiskTierBadge.tsx
      RiskMultiplierGauge.tsx
      RiskFactorTable.tsx
      PremiumImpactCard.tsx
      ImprovementRoadmap.tsx
      PremiumSimulator.tsx
      InsuranceReportManager.tsx
```

### Priority Order

1. Prisma schema additions + `db:push`
2. IRPE engine — factor computation, multiplier curves, tier classification
3. Premium impact calculator with baseline scenarios
4. API routes (compute, current, scenarios)
5. Dashboard pages (overview and factor breakdown first)
6. Premium simulator (interactive)
7. Report generation + PDF template + sharing flow
8. Public underwriter view
9. Cron job
10. Tests
