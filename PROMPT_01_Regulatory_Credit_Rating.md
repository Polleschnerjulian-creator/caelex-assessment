# Caelex Assure — Regulatory Credit Rating System

## Prompt for Claude Code

### Context

You are working on **Caelex**, a full-stack space regulatory compliance SaaS platform. Read `CLAUDE.md` in the project root for the complete technical specification. The codebase is Next.js 15 (App Router), TypeScript strict, PostgreSQL (Neon), Prisma ORM, NextAuth v5, Tailwind CSS. The project has 44 page routes, 138 API route handlers, 100+ Prisma models, and eight server-only compliance engines.

**Caelex Assure** is the outward-facing product line — it transforms internal compliance data into externally consumable intelligence. The base Assure layer (RRS scoring, share links, DD packages) already exists. Read `PROMPT_Caelex_Assure_Implementation.md` for full context on what's built.

---

### What to Build

Build the **Regulatory Credit Rating (RCR) System** — a standardized, methodology-backed rating that functions like a credit rating (S&P, Moody's) but for space regulatory compliance. This transforms Caelex from a compliance tool into **the rating agency for the space industry**.

**Strategic Intent:** The RCR becomes the universal language between operators, investors, insurers, and regulators. When an investor asks "Is this company compliant?", the answer is a Caelex RCR grade. When an insurer prices a policy, they reference the RCR. The RCR must be rigorous enough for institutional adoption and transparent enough for regulatory acceptance.

**Important:** The RRS (Regulatory Readiness Score, 0–100) already exists in `src/lib/rrs-engine.server.ts`. The RCR builds ON TOP of the RRS but adds: (1) a letter-grade taxonomy, (2) a peer-reviewed methodology document, (3) historical rating actions (upgrades/downgrades), (4) a publication engine for rating reports, and (5) an appeals/review process. Do NOT rebuild the RRS — extend it.

---

### Core: Rating Taxonomy

Define the rating scale in `src/lib/rcr-engine.server.ts` (server-only):

| Grade | RRS Range | Label      | Meaning                                                             |
| ----- | --------- | ---------- | ------------------------------------------------------------------- |
| AAA   | 95–100    | Exemplary  | Full compliance, best-in-class governance, exceeds all requirements |
| AA    | 85–94     | Superior   | Near-complete compliance, minor gaps with active remediation        |
| A     | 75–84     | Strong     | Substantial compliance, identified gaps with credible action plans  |
| BBB   | 65–74     | Adequate   | Baseline compliance achieved, material gaps remain                  |
| BB    | 50–64     | Developing | Partial compliance, significant gaps, trajectory positive           |
| B     | 35–49     | Weak       | Below baseline, major regulatory risks, limited remediation         |
| CCC   | 20–34     | Critical   | Severe non-compliance, immediate regulatory action likely           |
| CC    | 10–19     | Distressed | Near-total non-compliance                                           |
| D     | 0–9       | Default    | No meaningful compliance activity                                   |

Add a **+/−** modifier within each grade (e.g., AA+, AA, AA−) based on position within the RRS range.

Add a **Rating Outlook**: POSITIVE, STABLE, NEGATIVE, DEVELOPING — computed from `RegulatoryTrajectory` component trend over 90 days.

Add a **Rating Watch**: boolean flag for organizations undergoing significant regulatory changes (new authorization application, major incident, regime change). Triggers: score change >10 points in 30 days, new incident report filed, authorization workflow status change.

---

### Feature 1: Rating Methodology Engine

Build at `src/lib/rcr-engine.server.ts`:

```typescript
// Core types
interface RegulatoryCredit Rating {
  organizationId: string;
  grade: string;           // "AA+", "BBB-", etc.
  numericScore: number;    // RRS 0-100
  outlook: 'POSITIVE' | 'STABLE' | 'NEGATIVE' | 'DEVELOPING';
  onWatch: boolean;
  watchReason?: string;
  components: RCRComponentScore[];  // 6 component breakdowns
  methodology Version: string;      // "1.0.0" — versioned methodology
  computedAt: Date;
  validUntil: Date;        // Rating valid for 30 days, then stale
  confidence: number;      // 0-1, based on data completeness
}

interface RCRComponentScore {
  component: string;
  weight: number;
  rawScore: number;
  weightedScore: number;
  dataCompleteness: number;  // 0-1, how much source data exists
  keyFindings: string[];
  risks: RCRRisk[];
}

interface RCRRisk {
  id: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  likelihood: 'VERY_LIKELY' | 'LIKELY' | 'POSSIBLE' | 'UNLIKELY';
  mitigationStatus: 'UNADDRESSED' | 'IN_PROGRESS' | 'MITIGATED';
  regulatoryReference: string;  // e.g., "EU Space Act Art. 4(1)"
}
```

**Scoring Enhancements over base RRS:**

1. **Data Completeness Penalty**: If a component has <50% data completeness (e.g., no cybersecurity assessment completed), apply a penalty that caps that component at 40/100 regardless of what exists. This prevents high scores from incomplete data.

2. **Cross-Component Correlation**: If cybersecurity score is <50 but authorization score is >80, flag inconsistency — you can't be authorization-ready without cybersecurity. Add correlation checks between logically dependent components.

3. **Regulatory Event Adjustments**: Pull from `IncidentReport`, `NCASubmission`, `NCACorrespondence` — active incidents deduct from the score. An unresolved NCA submission with status PENDING_RESPONSE deducts 5-15 points depending on severity.

4. **Temporal Decay**: Assessments older than 180 days lose 10% relevance per additional month. Stale data means lower confidence, not necessarily lower score.

5. **Peer Benchmarking**: Compare against anonymized cohort statistics stored in `RCRBenchmark` model. Position the organization as percentile within its operator type cohort.

---

### Feature 2: Rating Actions & History

#### Prisma Schema Additions

```prisma
model RegulatoryCredit Rating {
  id                String   @id @default(cuid())
  organizationId    String
  organization      Organization @relation(fields: [organizationId], references: [id])

  grade             String   // "AA+", "BBB-", etc.
  previousGrade     String?  // For tracking changes
  numericScore      Float
  outlook           RatingOutlook @default(STABLE)
  onWatch           Boolean  @default(false)
  watchReason       String?

  methodologyVersion String  @default("1.0.0")
  confidence        Float    // 0-1
  validUntil        DateTime

  // Component scores stored as JSON
  componentScores   Json     // RCRComponentScore[]
  riskRegister      Json     // RCRRisk[]
  peerPercentile    Float?   // 0-100

  // Rating action
  actionType        RatingAction  // INITIAL, AFFIRM, UPGRADE, DOWNGRADE, WATCH_ON, WATCH_OFF
  actionRationale   String?       // Why the rating changed

  computedAt        DateTime @default(now())
  publishedAt       DateTime?
  isPublished       Boolean  @default(false)

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([organizationId, computedAt])
  @@index([grade])
}

enum RatingOutlook {
  POSITIVE
  STABLE
  NEGATIVE
  DEVELOPING
}

enum RatingAction {
  INITIAL       // First rating
  AFFIRM        // No change
  UPGRADE       // Grade improved
  DOWNGRADE     // Grade worsened
  WATCH_ON      // Placed on watch
  WATCH_OFF     // Removed from watch
  WITHDRAWN     // Rating withdrawn (org inactive)
}

model RCRBenchmark {
  id              String   @id @default(cuid())
  operatorType    String   // SCO, LO, LSO, etc.
  period          String   // "2026-Q1"

  // Anonymized cohort statistics
  count           Int
  meanScore       Float
  medianScore     Float
  p25Score        Float
  p75Score        Float
  stdDev          Float

  gradeDistribution Json   // { "AAA": 2, "AA": 5, ... }
  componentMeans    Json   // { "authorization": 72.3, ... }

  computedAt      DateTime @default(now())

  @@unique([operatorType, period])
}

model RCRAppeal {
  id              String   @id @default(cuid())
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id])
  ratingId        String
  reason          String   @db.Text
  supportingDocs  Json?    // Document IDs from vault
  status          AppealStatus @default(SUBMITTED)
  reviewNotes     String?  @db.Text
  resolvedAt      DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

enum AppealStatus {
  SUBMITTED
  UNDER_REVIEW
  ACCEPTED       // Rating will be recomputed
  REJECTED       // Rating stands
  WITHDRAWN
}
```

#### Rating Action Detection Logic

In the RCR engine, after computing a new rating, compare against the most recent published rating:

1. **Grade changed upward** → `UPGRADE` action, auto-generate rationale from component delta analysis
2. **Grade changed downward** → `DOWNGRADE` action, auto-generate rationale, trigger notification to org admins
3. **Grade unchanged** → `AFFIRM` action
4. **Score volatility >10 points in 30 days** → Set `onWatch = true`, action = `WATCH_ON`
5. **Watch condition resolved** → `WATCH_OFF`

Store every rating computation as a historical record. Never overwrite — always append. This creates a complete audit trail of rating actions, like S&P maintains for every rated entity.

---

### Feature 3: Rating Report Publication Engine

#### API Routes

- `POST /api/assure/rcr/compute` — Compute current RCR (auth required, MANAGER+)
- `GET /api/assure/rcr/current` — Get current published rating
- `GET /api/assure/rcr/history` — Full rating action history
- `GET /api/assure/rcr/report/[id]` — Get a specific rating report
- `GET /api/assure/rcr/report/[id]/export` — Export rating report as PDF
- `POST /api/assure/rcr/publish` — Publish current rating (ADMIN+, makes it available via share links)
- `GET /api/assure/rcr/benchmark` — Get anonymized peer benchmark for org's operator type
- `POST /api/assure/rcr/appeal` — Submit rating appeal
- `GET /api/assure/rcr/methodology` — Return current methodology document as JSON

#### Rating Report PDF

Add a new PDF template at `src/lib/pdf/rcr-report.tsx` following existing patterns. The report must contain:

1. **Cover Page** — Organization name, RCR grade (large, prominent), date, "Caelex Regulatory Credit Rating Report", methodology version
2. **Rating Summary** — Grade, outlook, watch status, numeric score, valid-until date, confidence level
3. **Component Breakdown** — 6 components with individual scores, data completeness, key findings
4. **Rating Action** — What changed since last rating, rationale
5. **Risk Register** — Top 10 risks by severity × likelihood, with regulatory references and mitigation status
6. **Peer Comparison** — Percentile position within operator type cohort (anonymized)
7. **Trend Analysis** — 12-month score chart, rating action timeline
8. **Methodology Appendix** — Complete scoring methodology (weights, formulas, data sources, penalties) — this is critical for institutional credibility

Use Caelex branding: Black (#000000) + Emerald (#10B981). Clean, institutional look — think S&P rating report, not startup dashboard.

---

### Feature 4: Dashboard Pages

#### Pages

- `/dashboard/assure/rating` — RCR overview with grade display, outlook, history timeline
- `/dashboard/assure/rating/report` — Full interactive rating report
- `/dashboard/assure/rating/methodology` — Interactive methodology explorer
- `/dashboard/assure/rating/appeal` — Submit and track appeals

#### UI Components (in `src/components/assure/`)

- `RCRGradeBadge` — Large, prominent letter grade display with color coding (AAA=emerald, BBB=amber, CCC=red, D=dark red). Used across dashboard and public views.
- `RCROutlookIndicator` — Arrow icon (up=positive, right=stable, down=negative) with label
- `RatingActionTimeline` — Vertical timeline of all rating actions (upgrade/downgrade/affirm) with dates and rationale
- `PeerBenchmarkChart` — Bell curve or box plot showing org's position within cohort
- `RCRMethodologyExplorer` — Expandable sections showing each component's scoring formula, data sources, and weight justification
- `RatingWatchBanner` — Alert banner shown when org is on Rating Watch

Follow existing design system: dark theme, navy palette, `GlassCard`, Framer Motion transitions. Look at existing dashboard modules for patterns.

---

### Feature 5: Cron Job for Rating Computation

Add endpoint at `/api/cron/compute-rcr`:

1. Iterate all organizations with active subscriptions AND published RRS scores
2. Compute RCR for each
3. Detect rating actions (upgrade/downgrade/watch)
4. Store rating record
5. Send notifications for: downgrades, watch placement, rating approaching expiry
6. Compute quarterly benchmarks (aggregate anonymized cohort stats)

Schedule: Daily at 7:30 AM UTC (after RRS computation at 7:00 AM).

Add quarterly benchmark computation: first day of each quarter at 8:00 AM UTC.

---

### Feature 6: Public Rating View Enhancement

Extend the existing public share view (`/assure/view/[token]`) to display the RCR grade prominently when `includeRRS` is enabled on the share link. The public view should show:

- Large grade badge (center, prominent)
- Outlook indicator
- Component breakdown (if granularity >= COMPONENT)
- Peer percentile (if granularity >= DETAILED)
- Rating action history (if granularity >= DETAILED)
- "Methodology" link that renders the methodology appendix inline
- Timestamp: "Rating computed on [date], valid until [date]"
- Confidence indicator: "Data completeness: [X]%"

---

### Implementation Guidelines

1. **Server-only engine:** `rcr-engine.server.ts` must import `server-only`. Follow existing engine patterns.
2. **Methodology versioning:** Store methodology version in every rating. If methodology changes, all ratings become stale and must be recomputed. Use semver: patch = weight tweaks, minor = new components, major = fundamental changes.
3. **Deterministic computation:** Same input → same output. No randomness. Document every formula.
4. **Audit trail:** Log every rating computation, publication, and appeal via existing audit service.
5. **Rate limiting:** Add `rcr` tier — same as `sensitive` tier. Public methodology endpoint uses `api` tier.
6. **Permissions:** Rating computation requires MANAGER+. Publication requires ADMIN+. Appeal submission requires ADMIN+.
7. **Validation:** Zod schemas in `src/lib/validations.ts` for all inputs.
8. **Testing:** Unit tests for grade mapping, outlook computation, cross-component correlation, temporal decay, and data completeness penalties. Integration tests for full rating cycle (compute → publish → appeal → recompute).

---

### What NOT to Build

- Do NOT build external agency submission (NCA filing of ratings) — that's Phase 3
- Do NOT build multi-org portfolio rating aggregation — that's the Portfolio Intelligence feature
- Do NOT build automated regulatory filing based on ratings — that's Phase 3
- Do NOT rebuild the RRS engine — extend it via composition

---

### File Structure

```
src/
  app/
    dashboard/
      assure/
        rating/
          page.tsx                    # RCR overview
          report/page.tsx             # Full rating report
          methodology/page.tsx        # Methodology explorer
          appeal/page.tsx             # Appeal management
    api/
      assure/
        rcr/
          compute/route.ts            # POST compute
          current/route.ts            # GET current
          history/route.ts            # GET history
          report/[id]/route.ts        # GET report
          report/[id]/export/route.ts # GET PDF export
          publish/route.ts            # POST publish
          benchmark/route.ts          # GET benchmark
          appeal/route.ts             # POST appeal
          methodology/route.ts        # GET methodology
      cron/
        compute-rcr/route.ts          # Daily computation

  lib/
    rcr-engine.server.ts              # Rating engine (server-only)
    pdf/
      rcr-report.tsx                  # PDF template

  components/
    assure/
      RCRGradeBadge.tsx
      RCROutlookIndicator.tsx
      RatingActionTimeline.tsx
      PeerBenchmarkChart.tsx
      RCRMethodologyExplorer.tsx
      RatingWatchBanner.tsx
```

### Priority Order

1. Prisma schema additions + `db:push`
2. RCR engine (`rcr-engine.server.ts`) — grade mapping, outlook, watch detection, cross-component checks
3. API routes (compute, current, history)
4. Dashboard pages (rating overview first)
5. Rating report PDF template
6. Publication flow + public view enhancement
7. Benchmark computation + cron
8. Appeal system
9. Tests
