# Caelex Assure — State of Space Compliance Data Intelligence Platform

## Prompt for Claude Code

### Context

You are working on **Caelex**, a full-stack space regulatory compliance SaaS platform. Read `CLAUDE.md` in the project root for the complete technical specification. The codebase is Next.js 15 (App Router), TypeScript strict, PostgreSQL (Neon), Prisma ORM, NextAuth v5, Tailwind CSS. The project has 44 page routes, 138 API route handlers, 100+ Prisma models, and eight server-only compliance engines.

**Caelex Assure** is the outward-facing product line. The base Assure layer (RRS scoring, share links, DD packages) and the Regulatory Credit Rating system already exist. Read `PROMPT_Caelex_Assure_Implementation.md` for context.

---

### What to Build

Build the **State of Space Compliance (SSC) Data Intelligence Platform** — an aggregate analytics system that transforms Caelex's multi-tenant compliance data into anonymized industry intelligence. This creates a **data monopoly**: Caelex becomes the only entity with a comprehensive, real-time view of how the European space industry is performing against regulatory requirements.

**Strategic Intent:** Every platform that aggregates user behavior data and publishes anonymized insights becomes indispensable. Bloomberg does this for financial markets. Glassdoor does this for employment. Caelex will do this for space regulatory compliance. The SSC Platform produces: (1) real-time industry dashboards, (2) an annual "State of Space Compliance" report, (3) regulatory trend analysis that informs policy-makers, and (4) benchmark datasets that operators need for their own compliance positioning.

**Data Ethics:** All aggregation is strictly anonymized. No individual organization's data is ever identifiable. Minimum cohort size of 5 organizations before any aggregate statistic is published. Differential privacy techniques where appropriate. Organizations must opt-in to contribute their data to the aggregate pool (default: opt-out).

---

### Core: Anonymized Data Aggregation Engine

Build at `src/lib/ssc-engine.server.ts` (server-only):

#### Data Collection Framework

The engine aggregates data across all opted-in organizations. It NEVER stores or transmits raw organization data. All aggregation happens server-side and only aggregate statistics are persisted.

```typescript
interface SSCDataPoint {
  dimension: string; // e.g., "authorization_readiness", "nis2_compliance"
  operatorType: string; // SCO, LO, LSO, ISOS, CAP, PDP, TCO
  jurisdiction: string; // FR, UK, BE, NL, LU, AT, DK, DE, IT, NO
  period: string; // "2026-Q1", "2026-02", "2026-W08"

  // Aggregate statistics only
  count: number; // Number of orgs contributing (must be >= 5)
  mean: number;
  median: number;
  p10: number;
  p25: number;
  p75: number;
  p90: number;
  stdDev: number;
  trend: number; // Change from previous period (percentage points)
}

interface SSCInsight {
  id: string;
  type: "TREND" | "ANOMALY" | "MILESTONE" | "RISK_SIGNAL" | "BENCHMARK";
  title: string;
  description: string;
  severity: "INFO" | "NOTABLE" | "SIGNIFICANT" | "CRITICAL";
  dataPoints: SSCDataPoint[];
  generatedAt: Date;
}
```

#### Aggregation Dimensions

Compute aggregate statistics across these dimensions (using existing data in Prisma models):

1. **RRS Score Distribution** — From `RegulatoryReadinessScore`: mean, median, quartiles by operator type, jurisdiction, and time period
2. **Component Scores** — Each of the 6 RRS components aggregated independently
3. **Authorization Pipeline** — From `AuthorizationWorkflow`: how many orgs at each stage, average time-to-authorization, bottleneck analysis
4. **Cybersecurity Maturity** — From `CybersecurityAssessment` + `NIS2Assessment`: NIS2 compliance rates by requirement category (Art. 21(2)(a)-(j))
5. **Operational Compliance** — From `DebrisAssessment`, `EnvironmentalAssessment`, `InsuranceAssessment`: compliance rates per module
6. **Jurisdictional Coverage** — From `SpaceLawAssessment`: which jurisdictions are most/least compliant, cross-border patterns
7. **Incident Landscape** — From `IncidentReport` (anonymized counts): incident types, response times, NIS2 timeline compliance
8. **Document Completeness** — From `Document`: average vault completeness, most/least uploaded document types
9. **Regulatory Trajectory** — From `ComplianceSnapshot`: industry-wide compliance trend over time

#### Privacy Safeguards

Implement in the engine:

1. **k-Anonymity**: Never publish statistics for cohorts with fewer than k=5 organizations
2. **Suppression**: If any single org contributes >30% of a cohort's data, suppress that statistic
3. **Rounding**: Round all percentages to nearest integer, counts to nearest 5
4. **Noise Addition**: For sensitive dimensions (incidents, penalties), add calibrated Laplacian noise
5. **Opt-in Tracking**: Check `Organization.dataShareConsent` (new field) before including any org's data

---

### Feature 1: Prisma Schema Additions

```prisma
// Add to Organization model
// dataShareConsent  Boolean @default(false)
// dataShareConsentAt DateTime?

model SSCAggregate {
  id              String   @id @default(cuid())
  dimension       String   // "rrs_score", "authorization_pipeline", etc.
  operatorType    String?  // null = all types
  jurisdiction    String?  // null = all jurisdictions
  period          String   // "2026-Q1", "2026-02"
  periodType      PeriodType // MONTHLY, QUARTERLY, ANNUAL

  // Statistics
  sampleSize      Int
  mean            Float
  median          Float
  p10             Float
  p25             Float
  p75             Float
  p90             Float
  stdDev          Float
  min             Float
  max             Float

  // Trend
  previousPeriodMean  Float?
  trendDirection      TrendDirection?
  trendMagnitude      Float?    // Percentage points change

  // Metadata
  suppressed      Boolean  @default(false)  // k-anonymity suppression
  computedAt      DateTime @default(now())

  @@unique([dimension, operatorType, jurisdiction, period])
  @@index([dimension, period])
  @@index([period])
}

enum PeriodType {
  WEEKLY
  MONTHLY
  QUARTERLY
  ANNUAL
}

enum TrendDirection {
  IMPROVING
  STABLE
  DECLINING
}

model SSCInsight {
  id              String   @id @default(cuid())
  type            InsightType
  title           String
  description     String   @db.Text
  severity        InsightSeverity
  dimension       String
  dataPoints      Json     // SSCDataPoint[]
  isPublished     Boolean  @default(false)
  publishedAt     DateTime?

  createdAt       DateTime @default(now())

  @@index([type, severity])
  @@index([isPublished, createdAt])
}

enum InsightType {
  TREND           // Multi-period directional change
  ANOMALY         // Unexpected deviation from norm
  MILESTONE       // Industry-wide achievement (e.g., 50% NIS2 compliance)
  RISK_SIGNAL     // Systemic risk indicator
  BENCHMARK       // Cohort comparison data
}

enum InsightSeverity {
  INFO
  NOTABLE
  SIGNIFICANT
  CRITICAL
}

model SSCReport {
  id              String   @id @default(cuid())
  title           String   // "State of Space Compliance Q1 2026"
  period          String   // "2026-Q1"
  periodType      PeriodType

  // Report content stored as structured JSON
  executiveSummary  String  @db.Text
  sections          Json    // Ordered report sections
  keyFindings       Json    // Top-line findings
  methodology       String  @db.Text

  sampleSize        Int     // Total contributing organizations
  coveragePercentage Float  // % of known European space operators

  status            ReportStatus @default(DRAFT)
  publishedAt       DateTime?
  pdfUrl            String?     // Stored in R2

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([period, periodType])
}

enum ReportStatus {
  DRAFT
  REVIEW
  PUBLISHED
  ARCHIVED
}
```

---

### Feature 2: Insight Generation Engine

The SSC engine should automatically detect and generate insights by analyzing aggregate trends:

1. **Trend Detection**: Compare current period vs. previous 3 periods. If a dimension changes by >5pp consistently, generate a TREND insight.
2. **Anomaly Detection**: Use z-score analysis on aggregates. If current period is >2 standard deviations from the 12-month rolling mean, generate an ANOMALY insight.
3. **Milestone Detection**: Track industry-wide thresholds (e.g., "50% of operators now have NIS2 assessment completed"). Use pre-defined milestone definitions.
4. **Risk Signal Detection**: If >30% of operators in a cohort show declining compliance trajectory, or if incident rates spike >2x from rolling average, generate a RISK_SIGNAL.

Implement insight generation as a pure function: `generateInsights(currentAggregates: SSCAggregate[], historicalAggregates: SSCAggregate[]): SSCInsight[]`

---

### Feature 3: Industry Dashboard (Public)

#### Pages

- `/assure/intelligence` — Public landing page for SSC data (no auth required)
- `/assure/intelligence/dashboard` — Interactive industry dashboard (free tier: limited, paid: full)
- `/assure/intelligence/reports` — Published SSC reports index
- `/assure/intelligence/reports/[id]` — Individual report view
- `/assure/intelligence/methodology` — Data methodology and privacy documentation

#### Dashboard Content

The public dashboard shows real-time aggregate compliance intelligence:

1. **Industry RRS Distribution** — Histogram/bell curve of RRS scores across all opted-in operators
2. **Compliance by Module** — Stacked bar chart showing compliance rates for each module (authorization, cybersecurity, debris, etc.)
3. **Jurisdictional Heat Map** — Map of Europe colored by average compliance score per jurisdiction
4. **Trend Lines** — 12-month compliance trajectory by operator type
5. **Authorization Pipeline** — Funnel chart showing industry-wide authorization stages
6. **NIS2 Readiness Meter** — Industry-wide NIS2 compliance percentage with Art. 21 breakdown
7. **Key Insights Feed** — Auto-generated insights from the engine, displayed as cards

Free tier shows: industry-wide aggregate scores, basic trend lines, published report summaries.
Paid tier (Assure Intelligence subscription) shows: full breakdown by operator type, jurisdiction drill-down, quarterly reports, API access to data, custom cohort comparisons.

---

### Feature 4: SSC Report Generator

Build a report generation engine at `src/lib/services/ssc-report-service.ts` that compiles aggregate data into a structured "State of Space Compliance" report.

The report generator should:

1. Pull all aggregates for the target period
2. Compare against previous periods for trend analysis
3. Generate narrative sections using structured templates (NOT AI-generated text — use deterministic template filling with data)
4. Compile key findings (top 5 insights by severity)
5. Generate visualizations as static chart data (rendered by PDF engine)

#### Report Sections

1. **Executive Summary** — One-page overview with headline statistics
2. **Industry Scorecard** — Overall compliance state with RAG ratings per module
3. **Operator Type Analysis** — Breakdown by SCO, LO, LSO, etc.
4. **Jurisdictional Analysis** — Per-country compliance landscape
5. **Module Deep Dives** — Authorization, Cybersecurity, Debris, Environmental, Insurance, NIS2
6. **Trend Analysis** — Year-over-year and quarter-over-quarter movements
7. **Risk Outlook** — Systemic risks identified from aggregate patterns
8. **Methodology** — Data sources, privacy measures, statistical methods

#### PDF Export

Add template at `src/lib/pdf/ssc-report.tsx`. This is a multi-page publication-quality report. Use Caelex branding with a focus on data visualization. Think McKinsey Global Institute report layout: clean, data-dense, professional.

---

### Feature 5: Operator's "My Position" View

Each opted-in organization gets a private view showing where they stand relative to industry aggregates.

#### Pages

- `/dashboard/assure/intelligence` — Organization's position within industry benchmarks

#### Content

1. **My RRS vs. Industry** — Overlay of org's RRS on the industry distribution curve, with percentile rank
2. **Module-by-Module Comparison** — Org score vs. industry median for each module
3. **Jurisdiction Peers** — How org compares to others in the same jurisdiction
4. **Operator Type Peers** — How org compares to same operator type
5. **Gap-to-Median Analysis** — Where the org is below industry median, with specific improvement recommendations
6. **Trend Comparison** — Org's trajectory vs. industry trajectory

This view is powerful because it creates competitive pressure: operators can see they're lagging behind peers, driving engagement with Caelex Comply to improve their scores.

---

### Feature 6: API Endpoints

- `GET /api/assure/intelligence/dashboard` — Aggregated dashboard data (public, rate-limited)
- `GET /api/assure/intelligence/aggregate` — Specific aggregate query (dimension, operatorType, jurisdiction, period)
- `GET /api/assure/intelligence/insights` — Published insights feed
- `GET /api/assure/intelligence/reports` — Published reports list
- `GET /api/assure/intelligence/reports/[id]` — Report detail
- `GET /api/assure/intelligence/reports/[id]/export` — PDF export
- `GET /api/assure/intelligence/my-position` — Authenticated: org's position vs. benchmarks
- `POST /api/assure/intelligence/opt-in` — Toggle data sharing consent (ADMIN+)
- `GET /api/assure/intelligence/methodology` — Methodology document

---

### Feature 7: Cron Jobs

1. **Weekly Aggregation** (`/api/cron/ssc-aggregate-weekly`): Every Monday at 4:00 AM UTC
   - Compute weekly aggregates for all dimensions
   - Generate automated insights
   - Update "My Position" benchmark data

2. **Monthly Aggregation** (`/api/cron/ssc-aggregate-monthly`): 1st of each month at 3:00 AM UTC
   - Compute monthly aggregates
   - Generate month-over-month trend insights
   - Archive previous month's data

3. **Quarterly Report** (`/api/cron/ssc-quarterly-report`): 1st day of Q1/Q2/Q3/Q4 at 5:00 AM UTC
   - Generate quarterly SSC report draft
   - Status: DRAFT (requires manual review before publishing)
   - Send notification to Caelex admin for review

---

### Implementation Guidelines

1. **Privacy first:** Every function that touches multi-org data must go through the privacy safeguard layer. No raw cross-org data should ever be accessible, even internally.
2. **Server-only:** `ssc-engine.server.ts` imports `server-only`. All aggregation runs server-side.
3. **Performance:** Aggregation queries can be expensive. Use `prisma.$queryRaw` with optimized SQL for aggregate computations. Consider materialized views if query time exceeds 5 seconds.
4. **Caching:** Use `src/lib/cache.server.ts` for public dashboard data (TTL: 1 hour). Industry aggregates don't change frequently.
5. **Audit logging:** Log all data opt-in/opt-out changes. Log report generation and publication.
6. **Rate limiting:** Public endpoints: `api` tier. Intelligence dashboard: new `intelligence` tier (100 req/min). Methodology: `api` tier.
7. **Permissions:** Opt-in toggle: ADMIN+. My Position view: MANAGER+. Report generation: Caelex internal admin only.
8. **Testing:** Unit tests for privacy safeguards (k-anonymity, suppression, noise). Integration tests for aggregation pipeline. Verify that no individual org data is recoverable from aggregates.

---

### What NOT to Build

- Do NOT build real-time streaming analytics — batch processing is sufficient for compliance data
- Do NOT build AI/LLM-generated narrative text — use deterministic templates
- Do NOT build custom cohort creation UI — that's Phase 3
- Do NOT build a marketplace for data access — simple subscription tier is sufficient
- Do NOT expose any API that returns data attributable to a specific organization

---

### File Structure

```
src/
  app/
    assure/
      intelligence/
        page.tsx                        # Public landing
        dashboard/page.tsx              # Public industry dashboard
        reports/page.tsx                # Reports index
        reports/[id]/page.tsx           # Report detail
        methodology/page.tsx            # Methodology docs
    dashboard/
      assure/
        intelligence/page.tsx           # My Position view
    api/
      assure/
        intelligence/
          dashboard/route.ts            # Public dashboard data
          aggregate/route.ts            # Aggregate query
          insights/route.ts             # Insights feed
          reports/route.ts              # Reports CRUD
          reports/[id]/route.ts         # Report detail
          reports/[id]/export/route.ts  # PDF export
          my-position/route.ts          # Org benchmarks
          opt-in/route.ts               # Data sharing toggle
          methodology/route.ts          # Methodology
      cron/
        ssc-aggregate-weekly/route.ts
        ssc-aggregate-monthly/route.ts
        ssc-quarterly-report/route.ts

  lib/
    ssc-engine.server.ts                # Aggregation engine (server-only)
    services/
      ssc-report-service.ts             # Report generation
    pdf/
      ssc-report.tsx                    # Report PDF template

  components/
    assure/
      IndustryRRSDistribution.tsx       # Histogram/bell curve
      ComplianceByModule.tsx            # Stacked bar chart
      JurisdictionalHeatMap.tsx         # Europe heat map
      IndustryTrendLines.tsx            # Trend chart
      AuthorizationPipeline.tsx         # Funnel chart
      NIS2ReadinessMeter.tsx            # Progress gauge
      InsightsFeed.tsx                  # Insight cards
      MyPositionOverlay.tsx             # Org vs. industry
      GapToMedianAnalysis.tsx           # Improvement areas
```

### Priority Order

1. Prisma schema additions (SSCAggregate, SSCInsight, SSCReport, Organization consent field) + `db:push`
2. SSC aggregation engine with privacy safeguards
3. Insight generation engine
4. API routes (public dashboard, aggregates, insights)
5. Public industry dashboard pages
6. My Position view (authenticated)
7. Report generation service + PDF template
8. Cron jobs (weekly, monthly, quarterly)
9. Opt-in management UI
10. Tests (privacy safeguards are critical to test)
