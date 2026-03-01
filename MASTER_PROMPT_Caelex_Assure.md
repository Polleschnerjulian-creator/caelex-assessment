# Caelex Assure — Master Implementation Prompt

## Context

You are building **Caelex Assure** — a standalone platform within the Caelex ecosystem. Read `CLAUDE.md` in the project root for the complete technical specification of the existing codebase.

**Caelex has two products:**

- **Caelex Comply** (already built) — Space regulatory compliance management. Operators use it to manage their own compliance with EU Space Act, NIS2, national space laws. Inward-facing. Target user: Compliance Officer, CTO.
- **Caelex Assure** (what you are building) — Investment readiness platform for New Space companies. Helps space startups, launch providers, and satellite operators convince investors to fund them. Outward-facing. Target user: CEO, CFO, Head of Business Development.

**Critical distinction:** Assure is NOT a compliance tool. It is an **investor conviction tool**. The core question Assure answers is:

> "Why should an investor put money into THIS space company — despite the industry being high-risk, capital-intensive, and regulatory-complex?"

Compliance data from Comply is ONE input signal (and a uniquely powerful one because it's verified), but Assure covers the full spectrum: market opportunity, technology maturity, team strength, financial health, risk management, competitive positioning, traction, and regulatory moat.

**Cost constraint:** Zero additional infrastructure costs. Build within the existing Next.js 15 app, same Vercel deployment, same Neon PostgreSQL database, same Prisma ORM. No paid third-party APIs at runtime (no OpenAI/Anthropic API calls from the platform). All intelligence comes from data models, scoring algorithms, and deterministic templates. PDF generation uses the existing `@react-pdf/renderer` stack. File storage uses existing R2/S3.

---

## The Product

### Elevator Pitch

Caelex Assure is TurboTax for space fundraising. It guides a New Space CEO through building their complete investment case — step by step, data-driven, with space-industry-specific intelligence — and outputs everything an investor needs to say yes: a verified company profile, an Investment Readiness Score, a comprehensive risk analysis, professional materials, and a secure data room. All benchmarked against the only real dataset of space company performance that exists.

### User Journey

1. **CEO signs up** → Creates company profile (or links existing Comply account)
2. **Guided Assessment** → 8-module wizard walks through every dimension an investor evaluates
3. **Investment Readiness Score** → Composite score (0-100) shows where they stand and what to improve
4. **Materials Generation** → Platform generates pitch-ready documents from their data
5. **Data Room Setup** → Organized virtual data room pre-populated from their profile
6. **Investor Outreach** → Shareable company profile with access controls and analytics
7. **Ongoing Updates** → Living profile that tracks milestones, metrics, and investor engagement

---

## Architecture

Assure lives within the same Next.js application but has its own route group, navigation, and user experience. It shares the authentication system (NextAuth v5), database, and design system with Comply.

### Route Structure

```
/assure                           → Assure landing / marketing page
/assure/onboarding                → Guided setup wizard
/assure/dashboard                 → Main Assure dashboard (Investment Readiness overview)
/assure/profile                   → Company Intelligence Profile (edit)
/assure/profile/[section]         → Individual profile sections
/assure/score                     → Investment Readiness Score detail + improvement plan
/assure/risks                     → Risk Intelligence dashboard
/assure/risks/[category]          → Risk category deep dive
/assure/materials                 → Investor materials library
/assure/materials/generator       → Material generation wizard
/assure/dataroom                  → Virtual Data Room management
/assure/dataroom/[id]             → Specific data room
/assure/benchmarks                → Benchmark Intelligence
/assure/investors                 → Investor Relations & engagement tracking
/assure/settings                  → Assure-specific settings

/assure/view/[token]              → Public: Investor-facing company profile view
/assure/dataroom/view/[token]     → Public: Investor-facing data room access
```

### Separate Navigation

Assure gets its own sidebar navigation, separate from Comply's dashboard. The sidebar should include:

- Dashboard (overview)
- Company Profile
- Investment Readiness
- Risk Intelligence
- Materials
- Data Room
- Benchmarks
- Investor Relations
- Settings

Add a "Switch to Comply" / "Switch to Assure" toggle in the top navigation when a user has both products. Users who only have Assure should never see Comply UI.

---

## Module 1: Company Intelligence Profile

### Purpose

A structured, living database of everything an investor needs to know about the company. NOT a pitch deck — a queryable, verifiable, always-current source of truth.

### Profile Sections

Build each section as a separate page (`/assure/profile/[section]`) with guided input, validation, and completion tracking.

#### 1.1 Company Overview

```prisma
model AssureCompanyProfile {
  id                String   @id @default(cuid())
  organizationId    String   @unique
  organization      Organization @relation(fields: [organizationId], references: [id])

  // Core Identity
  companyName       String
  legalName         String?
  foundedDate       DateTime?
  headquarters      String          // City, Country
  legalForm         String?         // GmbH, SAS, Ltd, etc.
  registrationNumber String?
  website           String?
  linkedIn          String?

  // Classification
  operatorType      String[]        // SCO, LO, LSO, ISOS, CAP, PDP, TCO
  subsector         String[]        // "Launch Services", "Earth Observation", "Satellite Communications", etc.
  stage             CompanyStage
  employeeCount     Int?
  employeeGrowth6M  Float?          // % growth last 6 months

  // Mission Statement
  oneLiner          String?         // One sentence: what the company does
  missionStatement  String?   @db.Text
  problemStatement  String?   @db.Text   // What problem do you solve?
  solutionStatement String?   @db.Text   // How do you solve it?

  completionScore   Float    @default(0)  // 0-1, auto-computed from filled fields

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

enum CompanyStage {
  PRE_SEED          // Idea stage, no product
  SEED              // MVP, early traction
  SERIES_A          // Product-market fit, scaling
  SERIES_B          // Growth stage
  SERIES_C_PLUS     // Late stage
  PRE_IPO           // Preparing for public markets
  PUBLIC            // Already listed
}
```

#### 1.2 Technology & Product

```prisma
model AssureTechProfile {
  id                String   @id @default(cuid())
  profileId         String
  profile           AssureCompanyProfile @relation(fields: [profileId], references: [id])

  // Technology Readiness
  trlLevel          Int?            // 1-9 (NASA TRL scale)
  trlJustification  String?  @db.Text
  trlEvidence       Json?           // Document references

  // Product
  productName       String?
  productDescription String? @db.Text
  productStatus     ProductStatus?
  launchDate        DateTime?       // Actual or expected first launch/deployment
  keyFeatures       Json?           // String[]
  technicalSpecs    Json?           // Key-value pairs of specs

  // IP Portfolio
  patents           Json?           // { filed: Int, granted: Int, descriptions: String[] }
  tradeSecrets      String?  @db.Text
  ipStrategy        String?  @db.Text

  // Technical Milestones
  milestones        Json?           // { date, description, status }[]

  completionScore   Float    @default(0)

  @@unique([profileId])
}

enum ProductStatus {
  CONCEPT
  PROTOTYPE
  TESTING
  BETA
  PRODUCTION
  OPERATIONAL
}
```

#### 1.3 Market & Opportunity

```prisma
model AssureMarketProfile {
  id                String   @id @default(cuid())
  profileId         String   @unique
  profile           AssureCompanyProfile @relation(fields: [profileId], references: [id])

  // Market Sizing
  tamValue          Float?          // Total Addressable Market (EUR)
  tamSource         String?         // Source/methodology
  samValue          Float?          // Serviceable Addressable Market
  somValue          Float?          // Serviceable Obtainable Market
  marketGrowthRate  Float?          // Annual CAGR %

  // Market Timing
  whyNow            String?  @db.Text   // Why is now the right time?
  marketDrivers     Json?           // String[] - what's driving the market

  // Customer Segments
  targetCustomers   Json?           // { segment, description, size, status }[]
  customerCount     Int?
  pipelineValue     Float?          // EUR, total pipeline
  contractedRevenue Float?          // EUR, signed contracts/LOIs

  // Go-to-Market
  gtmStrategy       String?  @db.Text
  salesCycle        String?         // "3-6 months", "12-18 months"
  distributionChannels Json?        // String[]

  completionScore   Float    @default(0)
}
```

#### 1.4 Team & Leadership

```prisma
model AssureTeamProfile {
  id                String   @id @default(cuid())
  profileId         String   @unique
  profile           AssureCompanyProfile @relation(fields: [profileId], references: [id])

  // Leadership Team
  founders          Json?           // { name, role, background, linkedIn, yearsExperience, priorExits }[]
  cSuite            Json?           // { name, role, background, startDate }[]
  keyHires          Json?           // { name, role, background, startDate }[]

  // Board & Advisors
  boardMembers      Json?           // { name, role, affiliation, background }[]
  advisors          Json?           // { name, expertise, affiliation }[]

  // Team Strength
  teamSize          Int?
  engineeringRatio  Float?          // % of team that's engineering
  averageExperience Float?          // Years in space industry
  keyPersonRisk     String?  @db.Text   // Who is critical, what's the bus factor?
  hiringPlan        Json?           // { role, timeline, priority }[]

  // Culture & Retention
  employeeTurnover  Float?          // Annual %
  glassdoorRating   Float?

  completionScore   Float    @default(0)
}
```

#### 1.5 Financial Health

```prisma
model AssureFinancialProfile {
  id                String   @id @default(cuid())
  profileId         String   @unique
  profile           AssureCompanyProfile @relation(fields: [profileId], references: [id])

  // Current State
  annualRevenue     Float?          // EUR, trailing 12 months
  revenueGrowthYoY Float?          // %
  monthlyBurnRate   Float?          // EUR
  runway            Int?            // Months at current burn
  grossMargin       Float?          // %
  cashPosition      Float?          // EUR, current

  // Revenue Model
  revenueModel      String?         // "SaaS", "Per-launch", "Data licensing", "Hardware + services"
  revenueStreams     Json?           // { stream, description, percentage, recurring: boolean }[]
  unitEconomics      Json?           // { metric, value, description }[]

  // Funding History
  totalRaised       Float?          // EUR, lifetime
  fundingRounds     Json?           // { round, date, amount, valuation, leadInvestor, investors[] }[]
  currentValuation  Float?          // EUR, last round

  // Current Raise
  isRaising         Boolean  @default(false)
  targetRaise       Float?          // EUR
  targetValuation   Float?          // EUR, pre-money
  roundType         String?         // "Seed", "Series A", etc.
  useOfFunds        Json?           // { category, amount, percentage, description }[]
  targetCloseDate   DateTime?

  // Projections (3-year)
  revenueProjections Json?          // { year, revenue, growth, assumptions }[]
  profitabilityTimeline String?     // "Q3 2028", "2029"
  breakEvenDate     DateTime?

  completionScore   Float    @default(0)
}
```

#### 1.6 Regulatory & Compliance Position

```prisma
model AssureRegulatoryProfile {
  id                String   @id @default(cuid())
  profileId         String   @unique
  profile           AssureCompanyProfile @relation(fields: [profileId], references: [id])

  // Comply Integration
  complyLinked      Boolean  @default(false)
  complyOrgId       String?         // Link to Comply organization
  rrsScore          Float?          // Pulled from Comply if linked
  rrsComponents     Json?           // Component breakdown from Comply

  // Manual Input (if no Comply account)
  jurisdictions     String[]        // Operating jurisdictions
  authorizationStatus String?       // "Active", "Pending", "Not yet applied"
  authorizationDetails String? @db.Text
  nis2Status        String?         // "Compliant", "In progress", "Not started"
  spaceDebrisCompliance String?
  insuranceStatus   String?

  // Regulatory Moat
  regulatoryMoatDescription String? @db.Text  // How compliance creates competitive advantage
  barrierToEntry    String?  @db.Text          // What competitors would need to replicate
  timeToReplicate   String?                     // "12-24 months"

  // Regulatory Risks
  regulatoryRisks   Json?           // { risk, probability, impact, mitigation }[]

  completionScore   Float    @default(0)
}
```

#### 1.7 Competitive Landscape

```prisma
model AssureCompetitiveProfile {
  id                String   @id @default(cuid())
  profileId         String   @unique
  profile           AssureCompanyProfile @relation(fields: [profileId], references: [id])

  // Competitors
  competitors       Json?           // { name, description, stage, funding, strengths, weaknesses, differentiation }[]

  // Positioning
  competitiveAdvantage String? @db.Text  // Why we win
  moats              Json?          // String[] - what makes us defensible
  differentiators    Json?          // String[] - what makes us different
  marketPosition     String?        // "First mover", "Fast follower", "Category creator"

  // Win/Loss
  winRate           Float?          // % of competitive situations won
  keyWins           Json?           // { customer, competitor, reason }[]
  keyLosses         Json?           // { customer, competitor, reason }[]

  completionScore   Float    @default(0)
}
```

#### 1.8 Traction & Milestones

```prisma
model AssureTractionProfile {
  id                String   @id @default(cuid())
  profileId         String   @unique
  profile           AssureCompanyProfile @relation(fields: [profileId], references: [id])

  // Key Metrics
  keyMetrics        Json?           // { name, value, unit, trend, period }[]

  // Milestones Achieved
  milestonesAchieved Json?          // { date, title, description, category, evidence }[]

  // Partnerships & Contracts
  partnerships      Json?           // { partner, type, value, status, description }[]
  lois              Int?            // Letters of Intent
  signedContracts   Int?
  pilotPrograms     Int?

  // Awards & Recognition
  awards            Json?           // { name, date, issuer }[]
  mediaFeatures     Json?           // { title, publication, date, url }[]
  conferences       Json?           // { name, date, role }[]  (speaker, exhibitor, etc.)

  // Upcoming Milestones
  upcomingMilestones Json?          // { targetDate, title, description, dependencies }[]

  completionScore   Float    @default(0)
}
```

### Profile Completion Engine

Build at `src/lib/assure/profile-engine.server.ts`:

Each section has a `completionScore` (0–1) computed from filled fields. Weight fields by importance:

- **Critical fields** (weight 3): companyName, operatorType, stage, oneLiner, trlLevel, productStatus, targetRaise, teamSize, founders
- **Important fields** (weight 2): revenueModel, competitiveAdvantage, tam/sam/som, fundingRounds, jurisdictions
- **Supporting fields** (weight 1): everything else

Compute an **overall profile completeness** as a weighted average across all 8 sections. Display as a progress indicator on the dashboard. Show "Next step" recommendations based on what's missing.

### Comply Integration

If the user also has a Caelex Comply account (same Organization), auto-populate the Regulatory Profile section:

1. Pull current RRS score and component breakdown
2. Pull authorization status from `AuthorizationWorkflow`
3. Pull NIS2 status from `NIS2Assessment`
4. Pull insurance status from `InsuranceAssessment`
5. Mark regulatory data as "Verified by Caelex Comply" with a green badge

This is the killer differentiator: no competitor can offer verified, real-time compliance data. When an investor sees "Regulatory Position: Verified", that's trust that no PDF or self-reported checkbox can match.

---

## Module 2: Investment Readiness Score (IRS)

### Purpose

A single composite score (0–100) that quantifies how "investable" a company is. Not a credit rating, not a compliance score — an **investment readiness** score. The IRS answers: "How prepared is this company to receive and justify investment?"

### Engine

Build at `src/lib/assure/irs-engine.server.ts` (server-only):

```typescript
interface InvestmentReadinessScore {
  organizationId: string;
  overallScore: number; // 0-100
  grade: IRSGrade; // A+ to D
  components: IRSComponent[];
  benchmarkPercentile: number; // vs. peer cohort
  topStrengths: string[]; // Top 3
  topWeaknesses: string[]; // Top 3
  improvementPlan: IRSImprovement[];
  computedAt: Date;
}

type IRSGrade = "A+" | "A" | "A-" | "B+" | "B" | "B-" | "C+" | "C" | "C-" | "D";
// A+ (90-100): Exceptional — investor-ready, compelling case
// A  (80-89):  Strong — minor gaps, fundable
// B+ (70-79):  Good — needs work, but solid foundation
// B  (60-69):  Developing — significant gaps, but trajectory positive
// C  (40-59):  Early — major areas need development
// D  (0-39):   Not ready — fundamental gaps in investment case

interface IRSComponent {
  id: string;
  name: string;
  weight: number;
  score: number; // 0-100
  maxScore: number; // 100
  dataCompleteness: number; // 0-1
  subScores: IRSSubScore[];
  keyFindings: string[];
  recommendations: string[];
}

interface IRSSubScore {
  name: string;
  score: number;
  weight: number;
  description: string;
}

interface IRSImprovement {
  component: string;
  action: string;
  impact: number; // Estimated IRS points gained
  effort: "LOW" | "MEDIUM" | "HIGH";
  timeframe: string; // "1 week", "1 month", "3 months"
  priority: number; // 1 = highest
}
```

### IRS Components & Weights

| Component                 | Weight | What It Measures                                                                                          | Data Source                                         |
| ------------------------- | ------ | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| **Market Opportunity**    | 20%    | TAM/SAM/SOM credibility, market timing, growth drivers, customer validation                               | `AssureMarketProfile`                               |
| **Technology & Product**  | 20%    | TRL level, product status, IP portfolio, technical milestones, product-market fit signals                 | `AssureTechProfile`                                 |
| **Team & Leadership**     | 15%    | Founder experience, team completeness, advisory board, key person risk, hiring plan                       | `AssureTeamProfile`                                 |
| **Financial Health**      | 15%    | Revenue model clarity, unit economics, burn rate sustainability, funding history, projections credibility | `AssureFinancialProfile`                            |
| **Regulatory Position**   | 15%    | Authorization status, compliance maturity, regulatory moat, jurisdiction coverage                         | `AssureRegulatoryProfile` (+ Comply data if linked) |
| **Traction & Validation** | 15%    | Customer count, pipeline, partnerships, awards, media, key metrics trajectory                             | `AssureTractionProfile`                             |

### Sub-Score Definitions

For each component, define 4-6 sub-scores. Example for **Market Opportunity (20%)**:

| Sub-Score               | Weight within component | Score 90-100                                      | Score 50-69                            | Score 0-29                      |
| ----------------------- | ----------------------- | ------------------------------------------------- | -------------------------------------- | ------------------------------- |
| TAM/SAM/SOM Credibility | 25%                     | Bottom-up analysis with sources, realistic sizing | Top-down estimate with some validation | No sizing or wildly unrealistic |
| Market Timing           | 20%                     | Clear "why now" with 3+ market drivers            | Some timing rationale                  | No timing justification         |
| Customer Validation     | 30%                     | Paying customers + growing pipeline               | LOIs or pilot programs                 | No customer contact             |
| Competitive Clarity     | 15%                     | Clear differentiation vs. named competitors       | Awareness of competition               | "We have no competition"        |
| Go-to-Market            | 10%                     | Defined channels with early traction              | Strategy exists on paper               | No GTM thinking                 |

Define similar sub-score tables for all 6 components. Each sub-score is computed from the corresponding profile data using rule-based logic (NOT AI/LLM at runtime).

### Scoring Rules

1. **Data completeness penalty:** If a component has <30% data completeness, cap that component's score at 30. The investor can't evaluate what doesn't exist.
2. **Cross-component consistency:** Flag contradictions (e.g., "Series A stage" but zero revenue and no customers → penalty on Financial and Traction). Implement at least 5 consistency checks.
3. **Stage-appropriate scoring:** A Pre-Seed company shouldn't be penalized for not having revenue. Adjust scoring thresholds based on `CompanyStage`. Define separate rubrics per stage.
4. **Comply bonus:** If Regulatory Position data comes from verified Comply link, add 5 bonus points to that component (capped at 100). Verified data is worth more than self-reported data.
5. **Deterministic:** Same input → same output. No randomness. Document every rule.

### Prisma Schema

```prisma
model InvestmentReadinessScore {
  id                String   @id @default(cuid())
  organizationId    String
  organization      Organization @relation(fields: [organizationId], references: [id])

  overallScore      Float
  grade             String          // "A+", "B-", etc.
  components        Json            // IRSComponent[]
  topStrengths      Json            // String[]
  topWeaknesses     Json            // String[]
  improvementPlan   Json            // IRSImprovement[]

  profileCompleteness Float         // 0-1
  stage             CompanyStage
  benchmarkPercentile Float?        // 0-100

  computedAt        DateTime @default(now())

  @@index([organizationId, computedAt])
  @@index([grade])
}
```

### Improvement Plan Logic

After computing the IRS, generate a prioritized improvement plan:

1. For each component below 70/100, identify the lowest-scoring sub-scores
2. For each low sub-score, map to specific profile fields that need filling or improving
3. Estimate impact: `weight × (targetScore - currentScore) / 100 × componentWeight × 100` = IRS points gained
4. Sort by impact/effort ratio (highest first)
5. Present as actionable steps: "Add 3 customer references to increase Traction by ~8 IRS points (estimated effort: 1 week)"

---

## Module 3: Risk Intelligence Engine

### Purpose

The #1 reason investors say no is **unmanaged risk**. This module doesn't hide risk — it maps EVERY risk, quantifies it, and shows a concrete mitigation strategy. The message to investors is: "We know exactly what could go wrong, and here's exactly how we're handling it."

### Risk Taxonomy

Build at `src/lib/assure/risk-engine.server.ts`:

Define 7 risk categories with pre-defined risk templates for space companies:

#### 3.1 Technology Risk

- Launch vehicle failure / satellite malfunction
- Technology readiness gaps (TRL < target)
- Supply chain dependency (single-source components)
- Obsolescence risk
- Testing/qualification gaps

#### 3.2 Market Risk

- Market size overestimation
- Timing risk (too early / too late)
- Customer concentration
- Price pressure / margin erosion
- Demand uncertainty

#### 3.3 Regulatory Risk

- Authorization delays or denial
- EU Space Act compliance gaps
- NIS2 non-compliance penalties
- Cross-jurisdiction complexity
- Regulatory change impact
- Export control restrictions

#### 3.4 Financial Risk

- Runway insufficiency
- Revenue model unproven
- Cost overruns (typical in space)
- Currency risk (multi-jurisdiction)
- Dependency on future funding

#### 3.5 Operational Risk

- Key person dependency
- Talent acquisition in competitive market
- Manufacturing/production scaling
- Ground infrastructure reliability
- Insurance coverage gaps

#### 3.6 Competitive Risk

- New entrant with more capital
- Incumbent pivot into market
- Technology leapfrog
- Price war
- Customer switching costs too low

#### 3.7 Geopolitical Risk

- Launch site access restrictions
- Sanctions / export controls
- Government contract dependency
- Spectrum allocation disputes
- International cooperation breakdowns

### Risk Data Model

```prisma
model AssureRisk {
  id                String   @id @default(cuid())
  profileId         String
  profile           AssureCompanyProfile @relation(fields: [profileId], references: [id])

  category          RiskCategory
  title             String
  description       String   @db.Text

  // Quantification
  probability       RiskProbability
  impact            RiskImpact
  riskScore         Float           // probability × impact (1-25)
  financialExposure Float?          // EUR estimate of worst case

  // Mitigation
  mitigationStrategy String? @db.Text
  mitigationStatus  MitigationStatus @default(IDENTIFIED)
  mitigationEvidence Json?          // Document references, links
  residualRisk      Float?          // Risk score after mitigation (1-25)

  // Context
  timeHorizon       String?         // "6 months", "1-2 years", "3+ years"
  triggerEvents     Json?           // String[] - what would cause this risk to materialize
  earlyWarnings     Json?           // String[] - leading indicators

  // Source
  isPreDefined      Boolean  @default(false)  // From template library
  isFromComply      Boolean  @default(false)  // Pulled from Comply risk data

  sortOrder         Int      @default(0)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([profileId, category])
  @@index([riskScore])
}

enum RiskCategory {
  TECHNOLOGY
  MARKET
  REGULATORY
  FINANCIAL
  OPERATIONAL
  COMPETITIVE
  GEOPOLITICAL
}

enum RiskProbability {
  VERY_LOW          // 1 - <10% chance
  LOW               // 2 - 10-25%
  MODERATE          // 3 - 25-50%
  HIGH              // 4 - 50-75%
  VERY_HIGH         // 5 - >75%
}

enum RiskImpact {
  NEGLIGIBLE        // 1 - Minor inconvenience
  MINOR             // 2 - Manageable setback
  MODERATE          // 3 - Significant but survivable
  MAJOR             // 4 - Threatens business plan
  CATASTROPHIC      // 5 - Existential threat
}

enum MitigationStatus {
  IDENTIFIED        // Risk known, no plan yet
  PLANNED           // Mitigation plan defined
  IN_PROGRESS       // Actively being mitigated
  MITIGATED         // Residual risk acceptable
  ACCEPTED          // Consciously accepted without mitigation
  TRANSFERRED       // Transferred (insurance, contract)
}
```

### Risk Assessment Flow

1. **Auto-populate** risks from pre-defined templates based on `operatorType` and `stage`
2. User reviews, adjusts, adds custom risks
3. For each risk, user scores probability and impact
4. User defines mitigation strategy
5. Engine computes: risk heat map, total exposure, mitigation coverage %, top unmitigated risks
6. If Comply is linked: auto-import regulatory risks with verified scores

### Scenario Analysis

Build a lightweight scenario simulator:

```typescript
interface RiskScenario {
  id: string;
  name: string;
  description: string;
  triggeredRisks: string[]; // Risk IDs that materialize
  financialImpact: {
    bestCase: number; // EUR
    mostLikely: number;
    worstCase: number;
  };
  timeToRecover: string;
  mitigationEffectiveness: number; // 0-1, how much mitigation reduces impact
}
```

Pre-define 5 space-specific scenarios:

1. **Launch Failure** — Technology risks materialize, +6 month delay, insurance claim
2. **Regulatory Delay** — Authorization takes 12 months longer than expected
3. **Key Person Departure** — CTO leaves, 6-month knowledge gap
4. **Market Downturn** — Space investment drops 40% (as in 2023)
5. **Cyber Incident** — Ground systems compromised, NIS2 reporting triggered

Each scenario shows: which risks are triggered, total financial impact range, timeline impact, and how existing mitigations reduce the damage.

---

## Module 4: Investor Materials Generator

### Purpose

Generate professional, data-driven investor materials directly from the Company Profile. Not static templates — living documents that update when data changes.

### Material Types

#### 4.1 Executive Summary (One-Pager)

A single-page PDF that contains:

- Company name, logo placeholder, one-liner
- Key metrics (revenue, team size, funding raised, runway)
- IRS grade badge
- Market size (TAM/SAM/SOM)
- Current raise details (amount, valuation, use of funds)
- Top 3 competitive advantages
- Key milestones (last 12 months + next 12 months)
- Contact details

Template: `src/lib/pdf/assure/executive-summary.tsx`

#### 4.2 Investment Teaser (3-5 pages)

An expanded document:

- Everything from Executive Summary
- Problem/Solution/Market deep dive
- Technology overview with TRL badge
- Team profiles (founders + key hires)
- Financial summary (revenue, projections chart)
- Use of funds breakdown
- Regulatory position summary
- Top risks with mitigation summary

Template: `src/lib/pdf/assure/investment-teaser.tsx`

#### 4.3 Detailed Company Profile (10-15 pages)

Full deep dive:

- All sections from Investment Teaser
- Complete competitive landscape analysis
- Full risk register with heat map
- Detailed financial projections (3 years)
- Regulatory position detail (with Comply badge if verified)
- Partnership and customer details
- Full team with backgrounds
- IP portfolio summary
- Milestone timeline (past + future)
- Appendices

Template: `src/lib/pdf/assure/company-profile.tsx`

#### 4.4 Risk Report

Standalone risk report for risk-focused investors:

- Risk heat map (probability × impact grid)
- All risks by category
- Mitigation coverage analysis
- Scenario analysis results
- Financial exposure summary
- Regulatory risk detail (from Comply if linked)

Template: `src/lib/pdf/assure/risk-report.tsx`

### Generation Flow

1. User selects material type
2. System checks profile completeness — warns about missing data
3. Generates preview (rendered in browser, NOT PDF yet)
4. User can customize: toggle sections on/off, edit narratives, choose data points
5. Generates final PDF via `@react-pdf/renderer`
6. Stores in `Document` model (existing document vault) and makes available in Data Room

### Prisma Addition

```prisma
model AssureMaterial {
  id                String   @id @default(cuid())
  organizationId    String
  organization      Organization @relation(fields: [organizationId], references: [id])
  createdById       String
  createdBy         User     @relation(fields: [createdById], references: [id])

  type              MaterialType
  title             String
  version           Int      @default(1)

  // Configuration
  includedSections  Json            // String[] - which sections are included
  customizations    Json?           // Section-level overrides

  // Output
  pdfUrl            String?         // Stored in R2
  pdfGeneratedAt    DateTime?

  // Snapshot: profile data at generation time
  profileSnapshot   Json            // Frozen profile data used for this version

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([organizationId, type])
}

enum MaterialType {
  EXECUTIVE_SUMMARY
  INVESTMENT_TEASER
  COMPANY_PROFILE
  RISK_REPORT
  CUSTOM
}
```

---

## Module 5: Virtual Data Room

### Purpose

A secure, organized space where investors can access due diligence documents. Pre-structured with space-industry-specific categories and a completion checklist.

### Data Room Structure

Pre-defined folder structure (customizable):

```
📁 1. Corporate & Legal
   ├── Certificate of Incorporation
   ├── Articles of Association
   ├── Shareholder Agreement
   ├── Cap Table
   ├── Board Minutes (last 12 months)
   └── Key Contracts

📁 2. Financial
   ├── Audited Financial Statements
   ├── Management Accounts (last 12 months)
   ├── Financial Model
   ├── Budget vs. Actual
   └── Tax Returns

📁 3. Technology & IP
   ├── Technical Architecture
   ├── Patent Portfolio
   ├── IP Assignment Agreements
   └── Technical Due Diligence Report

📁 4. Regulatory & Compliance
   ├── Space Authorization Documents
   ├── NIS2 Compliance Status
   ├── Insurance Certificates
   ├── Environmental Assessments
   ├── Spectrum Licenses
   └── [Auto-populated from Comply]

📁 5. Team & HR
   ├── Key Employment Contracts
   ├── ESOP Plan
   ├── Organization Chart
   └── Key Person Insurance

📁 6. Commercial
   ├── Customer Contracts
   ├── Letters of Intent
   ├── Partnership Agreements
   └── Pipeline Summary

📁 7. Caelex Assure Reports
   ├── Investment Readiness Report
   ├── Risk Analysis
   ├── Executive Summary
   └── [Auto-generated materials]
```

### Prisma Schema

```prisma
model AssureDataRoom {
  id                String   @id @default(cuid())
  organizationId    String
  organization      Organization @relation(fields: [organizationId], references: [id])

  name              String   @default("Investor Data Room")
  description       String?

  // Access configuration
  accessLinks       AssureDataRoomLink[]
  documents         AssureDataRoomDocument[]
  folders           Json            // Folder structure definition

  // Checklist
  checklistItems    Json            // { folder, item, required, uploaded, documentId? }[]
  completionRate    Float    @default(0)

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([organizationId])
}

model AssureDataRoomLink {
  id          String   @id @default(cuid())
  dataRoomId  String
  dataRoom    AssureDataRoom @relation(fields: [dataRoomId], references: [id])

  // Recipient
  recipientName  String
  recipientEmail String
  recipientOrg   String?

  // Access
  token       String   @unique
  pin         String?           // Optional PIN protection (hashed)
  expiresAt   DateTime
  isActive    Boolean  @default(true)

  // Permissions
  canDownload Boolean  @default(false)  // Can download documents
  canPrint    Boolean  @default(false)
  watermark   Boolean  @default(true)   // Watermark with viewer email

  // Folder-level access
  accessibleFolders Json?       // null = all, String[] = specific folders

  // Analytics
  views       AssureDataRoomView[]
  totalViews  Int      @default(0)
  lastViewedAt DateTime?

  createdAt   DateTime @default(now())

  @@index([token])
  @@index([dataRoomId])
}

model AssureDataRoomView {
  id          String   @id @default(cuid())
  linkId      String
  link        AssureDataRoomLink @relation(fields: [linkId], references: [id])
  documentId  String?         // null = general access, specific = document view
  action      DataRoomAction
  durationSec Int?            // Time spent viewing
  ipAddress   String?         // Encrypted
  userAgent   String?
  viewedAt    DateTime @default(now())

  @@index([linkId, viewedAt])
}

enum DataRoomAction {
  ROOM_ACCESSED
  DOCUMENT_VIEWED
  DOCUMENT_DOWNLOADED
  FOLDER_BROWSED
}

model AssureDataRoomDocument {
  id          String   @id @default(cuid())
  dataRoomId  String
  dataRoom    AssureDataRoom @relation(fields: [dataRoomId], references: [id])
  documentId  String?        // Link to existing Document model (vault)
  folder      String         // "1. Corporate & Legal"
  fileName    String
  fileSize    Int?
  fileUrl     String?        // R2 storage URL
  uploadedById String
  uploadedAt  DateTime @default(now())

  @@index([dataRoomId, folder])
}
```

### Data Room Analytics

Track investor engagement in real-time:

- Which documents were viewed and for how long
- Which investor viewed what
- Download events
- Access patterns (time of day, frequency)

Display as an analytics dashboard for the CEO:

- "Investor A spent 12 minutes on Financial Model, 8 minutes on Technical Architecture"
- "3 of 5 investors have not yet viewed the Risk Report"
- This intelligence helps CEOs know which investors are serious and what questions to prepare for.

---

## Module 6: Benchmark Intelligence

### Purpose

Answer the question: "How does my company compare to other space companies that successfully raised capital?"

### Data Sources

Two tiers:

1. **Internal benchmarks** (from Caelex ecosystem): Anonymized aggregate data from all Assure users. Same privacy model as described in the SSC Data Intelligence prompt — k-anonymity, minimum cohort of 5, no individual company identifiable.

2. **Public benchmarks** (curated dataset): A manually curated dataset of publicly available space company metrics. Build this as a static data file (`src/data/assure/space-benchmarks.ts`) that gets updated periodically.

```typescript
interface SpaceBenchmark {
  category: string; // "Funding", "Team", "Technology", etc.
  metric: string; // "Seed round median", "Time to first launch"
  value: number | string;
  source: string; // "SpaceNews", "Bryce Tech", "Pitchbook"
  year: number;
  segment?: string; // "Launch", "EO", "Satcom", "ISS"
}
```

Include at minimum 50 benchmark data points covering:

- Median funding round sizes by stage (Seed, A, B) for European space
- Typical team sizes at each stage
- Time from founding to first launch/deployment
- Revenue multiples for space companies
- TRL levels at each funding stage
- Customer count benchmarks at each stage

### "My Position" View

Show the company's metrics overlaid on benchmark distributions:

- Spider/radar chart: 6 IRS components vs. peer median
- Bar chart: Key metrics vs. benchmark ranges
- Traffic light indicators: Above/at/below benchmark for each metric

---

## Module 7: Investor Relations Dashboard

### Purpose

After raising capital, maintain ongoing investor relations through structured reporting and milestone tracking.

### Features

#### Milestone Tracker

```prisma
model AssureMilestone {
  id                String   @id @default(cuid())
  organizationId    String
  organization      Organization @relation(fields: [organizationId], references: [id])

  title             String
  description       String?  @db.Text
  category          MilestoneCategory
  targetDate        DateTime
  completedDate     DateTime?
  status            MilestoneStatus @default(ON_TRACK)

  // Evidence
  evidence          Json?           // { type, description, documentId }[]

  // Investor visibility
  isInvestorVisible Boolean  @default(true)  // Show to investors
  investorNote      String?  @db.Text        // Additional context for investors

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([organizationId, status])
  @@index([targetDate])
}

enum MilestoneCategory {
  PRODUCT
  BUSINESS
  FINANCIAL
  REGULATORY
  TEAM
  PARTNERSHIP
}

enum MilestoneStatus {
  ON_TRACK
  AT_RISK
  DELAYED
  COMPLETED
  CANCELLED
}
```

#### Investor Update Generator

Template-based quarterly/monthly update generator that pulls live data:

- Key metrics vs. last period
- Milestone progress
- Financial summary (burn, runway, revenue)
- Key wins
- Challenges & asks
- Upcoming milestones

Generate as PDF using `@react-pdf/renderer` or as a shareable web page.

#### Investor Access Portal

Investors with active data room links can also see:

- Latest IRS score and trend
- Milestone timeline with status
- Key metrics dashboard
- Published updates

---

## API Routes

### Profile APIs

```
GET    /api/assure/profile                    → Get company profile overview
PUT    /api/assure/profile/[section]          → Update profile section
GET    /api/assure/profile/completeness       → Get completion scores per section
POST   /api/assure/profile/import-comply      → Link & import Comply data
```

### IRS APIs

```
POST   /api/assure/score/compute              → Compute IRS
GET    /api/assure/score/current              → Current IRS
GET    /api/assure/score/history              → Historical IRS scores
GET    /api/assure/score/improvements         → Improvement plan
```

### Risk APIs

```
GET    /api/assure/risks                      → List all risks
POST   /api/assure/risks                      → Add risk
PUT    /api/assure/risks/[id]                 → Update risk
DELETE /api/assure/risks/[id]                 → Delete risk
POST   /api/assure/risks/auto-populate        → Auto-populate from templates
GET    /api/assure/risks/scenarios             → List scenarios
POST   /api/assure/risks/scenarios/[id]/run   → Run scenario
GET    /api/assure/risks/heatmap              → Risk heat map data
```

### Materials APIs

```
GET    /api/assure/materials                  → List generated materials
POST   /api/assure/materials/generate         → Generate new material
GET    /api/assure/materials/[id]             → Get material
GET    /api/assure/materials/[id]/export      → Export as PDF
DELETE /api/assure/materials/[id]             → Delete material
```

### Data Room APIs

```
GET    /api/assure/dataroom                   → Get data room
POST   /api/assure/dataroom/documents         → Upload document
DELETE /api/assure/dataroom/documents/[id]    → Remove document
POST   /api/assure/dataroom/links             → Create access link
GET    /api/assure/dataroom/links             → List access links
PATCH  /api/assure/dataroom/links/[id]        → Update/deactivate link
GET    /api/assure/dataroom/analytics         → View engagement analytics
```

### Benchmark APIs

```
GET    /api/assure/benchmarks                 → Get benchmarks for company's stage/type
GET    /api/assure/benchmarks/position        → Company position vs. benchmarks
```

### Milestone APIs

```
GET    /api/assure/milestones                 → List milestones
POST   /api/assure/milestones                 → Add milestone
PUT    /api/assure/milestones/[id]            → Update milestone
DELETE /api/assure/milestones/[id]            → Delete milestone
```

### Investor Update APIs

```
POST   /api/assure/updates/generate           → Generate investor update
GET    /api/assure/updates                    → List updates
GET    /api/assure/updates/[id]/export        → Export as PDF
```

### Public Views (no auth, token-based)

```
GET    /assure/view/[token]                   → Investor view of company profile
GET    /assure/dataroom/view/[token]          → Investor data room access
POST   /assure/dataroom/view/[token]/verify   → PIN verification for data room
```

---

## UI Components

Build all Assure-specific components in `src/components/assure/`:

### Dashboard Components

- `AssureDashboard` — Main overview: IRS score, profile completeness, recent activity
- `IRSScoreBadge` — Large grade display (A+/B-/etc.) with color coding
- `IRSScoreGauge` — Animated circular gauge (0-100)
- `ProfileCompletenessRing` — Radial progress per section
- `NextStepsCard` — Prioritized actions to improve IRS

### Profile Components

- `ProfileSectionEditor` — Generic section editor with field-level guidance
- `ProfileCompletionBar` — Section-level progress bars
- `ComplyIntegrationBanner` — "Link your Comply account for verified data" CTA
- `ComplyVerifiedBadge` — Green checkmark for Comply-sourced data

### Risk Components

- `RiskHeatMap` — 5×5 probability/impact grid with plotted risks
- `RiskRegisterTable` — Sortable, filterable risk table
- `RiskCategoryBreakdown` — Stacked bar chart by category
- `MitigationCoverageGauge` — % of risks with active mitigation
- `ScenarioAnalysisCard` — Scenario with triggered risks and impact range

### Materials Components

- `MaterialsLibrary` — Grid of generated materials with thumbnails
- `MaterialPreview` — In-browser preview before PDF generation
- `MaterialTypeSelector` — Choose material type with descriptions

### Data Room Components

- `DataRoomExplorer` — Folder-based document browser
- `DataRoomChecklist` — DD checklist with completion tracking
- `AccessLinkManager` — Create/manage investor access links
- `DataRoomAnalytics` — Engagement analytics dashboard
- `ViewerActivityTimeline` — Per-investor activity log

### Benchmark Components

- `BenchmarkRadarChart` — Spider chart: company vs. peer median
- `MetricComparisonBars` — Bar chart with benchmark ranges
- `BenchmarkTrafficLights` — RAG indicators per metric

### Investor Relations Components

- `MilestoneTimeline` — Visual timeline with status badges
- `InvestorUpdateEditor` — Template-based update composer
- `InvestorPortalPreview` — Preview of what investors see

---

## Design Direction

Assure has the same dark, premium aesthetic as Comply (navy palette, emerald accents) but feels DIFFERENT — more executive, more polished, less technical. Think:

- **Comply** = Bloomberg Terminal (data-dense, technical, operational)
- **Assure** = Pitch (clean, storytelling, persuasive)

Key differences:

- Larger type sizes for headlines
- More whitespace
- Data visualizations are simpler, more impactful (one big number, not 12 small charts)
- IRS grade is PROMINENT everywhere (like a credit score on a banking app)
- More use of the emerald accent for positive signals
- "Verified by Caelex Comply" badges stand out visually

Follow the existing design system from `CLAUDE.md` (colors, type scale, component patterns) but lean toward the marketing/executive end of the spectrum.

---

## Implementation Guidelines

1. **Same app, separate experience:** Build within the existing Next.js app. Use route groups (`/assure/...`) for Assure pages. Share auth, database, design system. Separate navigation sidebar.

2. **Server-only engines:** `irs-engine.server.ts`, `risk-engine.server.ts`, `profile-engine.server.ts` all import `server-only`. Follow existing engine patterns.

3. **Zero runtime costs:** No external API calls from the platform. No AI/LLM calls at runtime. All intelligence comes from data models and deterministic scoring algorithms. PDF generation uses existing `@react-pdf/renderer`. File storage uses existing R2.

4. **Comply integration is optional:** Assure works fully standalone. If a user also has Comply, the Regulatory Position section gets enriched with verified data. If not, they fill it manually.

5. **Validation:** Zod schemas for all inputs in `src/lib/assure/validations.ts`.

6. **Audit logging:** Log profile edits, IRS computations, material generations, data room access via existing audit service.

7. **Rate limiting:** Reuse existing tiers. Public views use `api` tier. Profile edits use `sensitive` tier.

8. **Permissions:** Profile editing requires ADMIN+. Material generation requires MANAGER+. Data room link creation requires ADMIN+. Investor views require valid token.

9. **Testing:** Unit tests for IRS scoring engine (all rubrics, stage-adjusted scoring, consistency checks). Integration tests for profile CRUD, material generation, data room access flow. Test Comply integration path.

10. **Encryption:** Investor email addresses and IP addresses in data room views must be encrypted. Use existing encryption utilities.

---

## What NOT to Build

- Do NOT build a separate authentication system — use existing NextAuth v5
- Do NOT build a separate database — use existing Neon PostgreSQL
- Do NOT call external AI APIs (OpenAI, Anthropic, etc.) at runtime — all intelligence is algorithmic
- Do NOT build investor matching / marketplace — that's Phase 2
- Do NOT build payment processing for Assure (yet) — build the product first, monetize later
- Do NOT build email campaigns to investors — Assure shows data, it doesn't spam
- Do NOT build pitch deck SLIDES (.pptx) — focus on PDF documents
- Do NOT duplicate any Comply features — Assure READS from Comply data, never writes to it

---

## File Structure

```
src/
  app/
    assure/
      page.tsx                              # Landing / marketing
      onboarding/page.tsx                   # Setup wizard
      dashboard/page.tsx                    # Main dashboard
      profile/
        page.tsx                            # Profile overview
        [section]/page.tsx                  # Section editors (8 sections)
      score/
        page.tsx                            # IRS detail + improvement plan
      risks/
        page.tsx                            # Risk intelligence dashboard
        [category]/page.tsx                 # Category deep dive
        scenarios/page.tsx                  # Scenario analysis
      materials/
        page.tsx                            # Materials library
        generator/page.tsx                  # Generation wizard
      dataroom/
        page.tsx                            # Data room management
        analytics/page.tsx                  # Engagement analytics
      benchmarks/page.tsx                   # Benchmark intelligence
      investors/
        page.tsx                            # Investor relations dashboard
        milestones/page.tsx                 # Milestone tracker
        updates/page.tsx                    # Update generator
      settings/page.tsx                     # Assure settings
      view/[token]/page.tsx                 # Public: investor company view
      dataroom/view/[token]/page.tsx        # Public: investor data room

    api/
      assure/
        profile/
          route.ts                          # GET overview
          [section]/route.ts                # PUT section
          completeness/route.ts             # GET completeness
          import-comply/route.ts            # POST import
        score/
          compute/route.ts                  # POST compute
          current/route.ts                  # GET current
          history/route.ts                  # GET history
          improvements/route.ts             # GET plan
        risks/
          route.ts                          # GET, POST
          [id]/route.ts                     # PUT, DELETE
          auto-populate/route.ts            # POST
          heatmap/route.ts                  # GET
          scenarios/route.ts                # GET
          scenarios/[id]/run/route.ts       # POST
        materials/
          route.ts                          # GET list
          generate/route.ts                 # POST
          [id]/route.ts                     # GET, DELETE
          [id]/export/route.ts              # GET PDF
        dataroom/
          route.ts                          # GET
          documents/route.ts                # POST upload
          documents/[id]/route.ts           # DELETE
          links/route.ts                    # GET, POST
          links/[id]/route.ts              # PATCH
          analytics/route.ts                # GET
        benchmarks/
          route.ts                          # GET
          position/route.ts                 # GET
        milestones/
          route.ts                          # GET, POST
          [id]/route.ts                     # PUT, DELETE
        updates/
          generate/route.ts                 # POST
          route.ts                          # GET
          [id]/export/route.ts              # GET PDF

  lib/
    assure/
      profile-engine.server.ts              # Profile completion engine
      irs-engine.server.ts                  # Investment Readiness Score engine
      risk-engine.server.ts                 # Risk analysis engine
      benchmark-engine.server.ts            # Benchmark computation
      validations.ts                        # Zod schemas for Assure

    pdf/
      assure/
        executive-summary.tsx               # One-pager template
        investment-teaser.tsx               # 3-5 page teaser
        company-profile.tsx                 # Full company profile
        risk-report.tsx                     # Risk analysis report
        investor-update.tsx                 # Quarterly/monthly update

  data/
    assure/
      space-benchmarks.ts                   # Curated benchmark dataset (50+ data points)
      risk-templates.ts                     # Pre-defined risk library per operator type
      dataroom-structure.ts                 # Default folder structure + checklist

  components/
    assure/
      # Dashboard
      AssureDashboard.tsx
      AssureSidebar.tsx                     # Separate navigation
      IRSScoreBadge.tsx
      IRSScoreGauge.tsx
      ProfileCompletenessRing.tsx
      NextStepsCard.tsx

      # Profile
      ProfileSectionEditor.tsx
      ProfileCompletionBar.tsx
      ComplyIntegrationBanner.tsx
      ComplyVerifiedBadge.tsx

      # Risk
      RiskHeatMap.tsx
      RiskRegisterTable.tsx
      RiskCategoryBreakdown.tsx
      MitigationCoverageGauge.tsx
      ScenarioAnalysisCard.tsx

      # Materials
      MaterialsLibrary.tsx
      MaterialPreview.tsx
      MaterialTypeSelector.tsx

      # Data Room
      DataRoomExplorer.tsx
      DataRoomChecklist.tsx
      AccessLinkManager.tsx
      DataRoomAnalytics.tsx
      ViewerActivityTimeline.tsx

      # Benchmarks
      BenchmarkRadarChart.tsx
      MetricComparisonBars.tsx
      BenchmarkTrafficLights.tsx

      # Investor Relations
      MilestoneTimeline.tsx
      InvestorUpdateEditor.tsx
      InvestorPortalPreview.tsx
```

---

## Priority Order

Build in this sequence:

### Phase 1: Foundation (Week 1-2)

1. Prisma schema (all Assure models) + `db:push`
2. Assure route structure + sidebar navigation + layout
3. Company Intelligence Profile — all 8 section editors with persistence
4. Profile completion engine
5. Basic dashboard showing profile completeness

### Phase 2: Intelligence (Week 3)

6. IRS engine — full scoring with all rubrics and stage-adjusted rules
7. IRS dashboard page with score, components, improvement plan
8. Comply integration — data import for Regulatory Position
9. Risk engine — pre-defined templates, risk CRUD, heat map
10. Scenario analysis (5 pre-defined scenarios)

### Phase 3: Output (Week 4)

11. PDF templates — Executive Summary, Investment Teaser, Company Profile, Risk Report
12. Materials generation flow (preview → customize → export)
13. Virtual Data Room — folder structure, document upload, checklist
14. Data Room access links with PIN protection and analytics
15. Investor view pages (public token-based access)

### Phase 4: Polish (Week 5)

16. Benchmark intelligence — curated dataset, "My Position" view
17. Milestone tracker
18. Investor update generator
19. Data room engagement analytics dashboard
20. Tests
