# Caelex Platform Overview

> Last updated: April 2026

---

## 1. Platform Summary

Caelex is a full-stack space regulatory compliance SaaS platform that helps satellite operators, launch providers, and space service companies assess and manage compliance with the EU Space Act (COM(2025) 335), NIS2 Directive (EU 2022/2555), Cyber Resilience Act, national space laws across 19 jurisdictions, COPUOS/IADC guidelines, export control regimes (ITAR/EAR), spectrum/ITU regulations, and UK/US-specific frameworks. The platform combines automated compliance assessment engines, AI-powered advisory, investor due diligence scoring, training, satellite tracking, and a complete SaaS infrastructure for multi-tenant organizations.

### Tech Stack

| Layer         | Technology                                                         |
| ------------- | ------------------------------------------------------------------ |
| Framework     | Next.js 15 (App Router)                                            |
| Language      | TypeScript (strict mode)                                           |
| Database      | PostgreSQL via Neon Serverless                                     |
| ORM           | Prisma 5.22                                                        |
| Auth          | NextAuth v5 (credentials + Google OAuth + SSO SAML/OIDC)           |
| Payments      | Stripe (checkout, portal, webhooks)                                |
| Storage       | Cloudflare R2 / S3-compatible (via AWS SDK)                        |
| AI            | Anthropic Claude (claude-sonnet-4-6) for Astra AI copilot          |
| Rate Limiting | Upstash Redis (sliding window, 19 tiers)                           |
| Encryption    | AES-256-GCM (scrypt key derivation)                                |
| Email         | Resend (primary) / Nodemailer SMTP (fallback)                      |
| PDF           | @react-pdf/renderer (client) + jsPDF (server)                      |
| 3D            | Three.js (@react-three/fiber)                                      |
| Charts        | Recharts                                                           |
| Satellite     | satellite.js for orbital mechanics                                 |
| Animations    | Framer Motion                                                      |
| Validation    | Zod                                                                |
| Styling       | Tailwind CSS (dark mode, navy palette, liquid glass design system) |
| Testing       | Vitest + Playwright + MSW                                          |
| CI/CD         | GitHub Actions + Husky + Vercel auto-deploy                        |
| Monitoring    | Sentry + LogSnag + Vercel Analytics                                |

### Key Metrics

| Metric                                         | Count              |
| ---------------------------------------------- | ------------------ |
| Page routes (`page.tsx`)                       | 205                |
| API route files (`route.ts`)                   | 589                |
| Prisma models                                  | 210                |
| Prisma enums                                   | 115                |
| Database indices                               | 545                |
| Schema lines                                   | 8,080              |
| React components (`.tsx` in `src/components/`) | 361                |
| Component subdirectories                       | 51                 |
| Server-only engine files (`*.server.ts`)       | 31                 |
| Service files (`src/lib/services/`)            | 78 (incl. tests)   |
| Regulatory data files (`src/data/`)            | 49+                |
| Total TypeScript files                         | 2,035              |
| Total lines of TypeScript code                 | ~248,923           |
| Test files                                     | 232                |
| PDF report templates                           | 24                 |
| Email templates                                | 7 (+ base layout)  |
| Cron jobs (vercel.json)                        | 26                 |
| Public API v1 routes                           | 93                 |
| i18n languages                                 | 4 (EN, DE, FR, ES) |
| Custom React hooks                             | 4                  |
| Astra AI tools                                 | 44                 |

---

## 2. Dashboard Architecture

### Layout Structure

The authenticated dashboard uses a shell-based architecture:

- **`DashboardShell`** -- Top-level layout wrapping all `/dashboard/*` routes
- **`Sidebar`** -- Left navigation with collapsible module groups, active state indicators, and org switcher
- **`TopBar`** -- Header bar with search, notifications bell (unread count badge), Astra AI quick-access, user menu
- **`Score Circle`** -- Animated SVG ring showing overall compliance percentage (0-100) on the main dashboard
- **`Operator Profile`** -- Displays operator type classification, active regulations, jurisdiction context

### Main Dashboard (`/dashboard`)

The main dashboard page includes:

- Compliance score circle (overall percentage)
- 6 analytics charts (Recharts): compliance trends, module breakdown, risk distribution, timeline, regulation coverage, gap analysis
- Module overview cards (15 compliance modules with status indicators)
- Recent activity feed
- Upcoming deadlines widget
- Alerts panel

---

## 3. Assessment System

The platform includes 5 distinct assessment flows, each backed by a dedicated compliance engine:

### 3.1 EU Space Act Assessment (`/assessment/eu-space-act`)

- **8 questions** covering operator type, mission profile, orbital regime, spacecraft capabilities, data handling, service scope, ground segment, and organization size
- Maps answers to **119 EU Space Act articles** (67 grouped entries in `src/data/articles.ts`)
- **7 operator types**: satellite operator, launch provider, ground segment operator, SSA provider, STM provider, data service provider, in-orbit servicing
- Standard/light regime classification based on operator size
- Engine: `engine.server.ts` -- `calculateCompliance()`, `loadSpaceActDataFromDisk()`, `redactArticlesForClient()`

### 3.2 NIS2 Assessment (`/assessment/nis2`)

- Classifies entities as essential/important/out-of-scope
- **51 NIS2 requirements** (3,973 LOC in `src/data/nis2-requirements.ts`)
- Incident timeline generation
- Engine: `nis2-engine.server.ts` -- `classifyNIS2Entity()`, `calculateNIS2Compliance()`, `redactNIS2ResultForClient()`
- Auto-assessment: `nis2-auto-assessment.server.ts` -- `generateAutoAssessments()`, `generateRecommendations()`

### 3.3 National Space Law Assessment (`/assessment/space-law`)

- **10 jurisdiction data files** (Austria, Belgium, Denmark, France, Germany, Italy, Luxembourg, Netherlands, Norway, UK)
- Favorability scoring per jurisdiction
- 47 cross-references between national laws and EU Space Act
- Engine: `space-law-engine.server.ts` -- `calculateSpaceLawCompliance()`, `redactSpaceLawResultForClient()`

### 3.4 CRA Assessment (`/cra`, `/cra/classify`)

- Cyber Resilience Act product classification
- CRA taxonomy and requirement mapping (`src/data/cra-requirements.ts`, `src/data/cra-taxonomy.ts`)
- SBOM (Software Bill of Materials) analysis
- NVD vulnerability checking
- Evidence matching
- Engines:
  - `cra-engine.server.ts` -- `classifyCRAProduct()`, `calculateCRACompliance()`, `redactCRAResultForClient()`
  - `cra-rule-engine.server.ts` -- `classifyByRules()`, `detectClassificationConflict()`
  - `cra-auto-assessment.server.ts` -- `generateCRAAutoAssessments()`, `generateNIS2PropagatedAssessments()`
  - `cra-benchmark-service.server.ts` -- `calculateCRABenchmark()`
  - `cra-evidence-matcher.server.ts` -- `matchDocumentToCRA()`
  - `cra-nvd-service.server.ts` -- `checkComponentsForCVEs()`
  - `cra-sbom-service.server.ts` -- `parseSBOM()`, `assessSBOMCompliance()`

### 3.5 Unified Multi-Regulation Assessment (`/assessment/unified`)

- Combines EU Space Act, NIS2, and national space law into a single assessment flow
- Multi-activity result aggregation with confidence scoring
- Engine: `unified-engine-merger.server.ts` -- `mergeMultiActivityResults()`, `buildUnifiedResult()`, `calculateConfidenceScore()`, `calculateOverallRisk()`
- Mappers: `unified-assessment-mappers.server.ts`

### Results Storage

Assessment results are saved to their respective Prisma models (e.g., `CybersecurityAssessment`, `DebrisAssessment`, `NIS2Assessment`, `CRAAssessment`, etc.), each with child `*RequirementStatus` models tracking per-requirement compliance state. Results can be imported into the dashboard tracker via `/api/tracker/import-assessment`.

---

## 4. Compliance Engines (Detailed)

### 4.1 EU Space Act Engine (`src/lib/engine.server.ts`)

- **Purpose**: Core assessment engine for EU Space Act (COM(2025) 335)
- **Inputs**: Operator profile (type, mission, orbit, size), 8-question answers
- **Outputs**: Applicable articles, compliance status per article, module mapping, standard/light regime
- **Key functions**: `loadSpaceActDataFromDisk()`, `calculateCompliance()`, `redactArticlesForClient()`
- **Coverage**: 7 operator types, 119 articles, 9 compliance modules

### 4.2 NIS2 Engine (`src/lib/nis2-engine.server.ts`)

- **Purpose**: NIS2 Directive (EU 2022/2555) compliance assessment for space sector
- **Inputs**: Entity classification answers (sector, size, criticality)
- **Outputs**: Essential/important/out-of-scope classification, 51 requirement statuses, incident timeline
- **Key functions**: `classifyNIS2Entity()`, `calculateNIS2Compliance()`, `redactNIS2ResultForClient()`

### 4.3 NIS2 Auto-Assessment Engine (`src/lib/nis2-auto-assessment.server.ts`)

- **Purpose**: Automated NIS2 classification from existing operator profile without manual questionnaire
- **Inputs**: Operator profile data
- **Outputs**: Auto-generated assessment results, implementation phases, smart recommendations
- **Key functions**: `generateAutoAssessments()`, `generateRecommendations()`

### 4.4 National Space Law Engine (`src/lib/space-law-engine.server.ts`)

- **Purpose**: Multi-jurisdiction space law compliance comparison
- **Inputs**: Operator profile, selected jurisdictions
- **Outputs**: Per-jurisdiction compliance scores, favorability ranking, cross-references to EU Space Act
- **Key functions**: `calculateSpaceLawCompliance()`, `redactSpaceLawResultForClient()`
- **Data**: 10 jurisdictions (1,681 LOC in `national-space-laws.ts`), 47 cross-references

### 4.5 CRA Engine (`src/lib/cra-engine.server.ts`)

- **Purpose**: Cyber Resilience Act product classification and compliance
- **Inputs**: Product classification answers, SBOM data
- **Outputs**: Product category (default/important Class I/II/critical), requirement gaps, compliance score
- **Key functions**: `classifyCRAProduct()`, `calculateCRACompliance()`, `redactCRAResultForClient()`

### 4.6 CRA Rule Engine (`src/lib/cra-rule-engine.server.ts`)

- **Purpose**: Deterministic CRA classification using rule-based approach
- **Inputs**: CRA assessment answers
- **Outputs**: Classification result, conflict detection between rule-based and AI-based classification
- **Key functions**: `classifyByRules()`, `detectClassificationConflict()`

### 4.7 COPUOS/IADC Engine (`src/lib/copuos-engine.server.ts`)

- **Purpose**: COPUOS Long-Term Sustainability guidelines and IADC debris mitigation compliance
- **Inputs**: Mission profile (orbit, deorbit plan, debris mitigation measures)
- **Outputs**: Guideline compliance scores, risk levels, gap analysis, cross-references to EU Space Act debris module, recommendations
- **Key functions**: `validateMissionProfile()`, `calculateComplianceScore()`, `determineRiskLevel()`, `generateGapAnalysis()`, `findEuSpaceActCrossReferences()`, `generateRecommendations()`, `performAssessment()`, `getDebrisRelatedGuidelines()`, `mapToEuSpaceActDebrisModule()`, `generateComplianceSummary()`

### 4.8 Export Control Engine (`src/lib/export-control-engine.server.ts`)

- **Purpose**: ITAR (US) and EAR (US) export control compliance
- **Inputs**: Export control profile (item classification, destination, end-use, parties)
- **Outputs**: Compliance scores per regulation, gap analysis, license exception analysis, deemed export risk, screening requirements, TCP (Technology Control Plan) assessment, documentation checklist, penalty assessment
- **Key functions**: `validateExportControlProfile()`, `calculateComplianceScore()`, `generateGapAnalysis()`, `performAssessment()`, `assessDeemedExportRisks()`, `assessScreeningRequirements()`, `assessTCPRequirements()`, `analyzeLicenseExceptions()`, `generateDocumentationChecklist()`

### 4.9 Spectrum/ITU Engine (`src/lib/spectrum-engine.server.ts`)

- **Purpose**: ITU Radio Regulations and national spectrum licensing compliance
- **Inputs**: Spectrum profile (frequency bands, service types, filing status, coordination)
- **Outputs**: Compliance scores, filing status summary, coordination summary, frequency band analysis, recommendations
- **Key functions**: `validateSpectrumProfile()`, `calculateComplianceScore()`, `generateGapAnalysis()`, `analyzeFrequencyBands()`, `generateFilingStatusSummary()`, `generateCoordinationSummary()`, `performAssessment()`, `recommendServiceTypes()`, `generateFilingTimelineReport()`

### 4.10 UK Space Industry Act Engine (`src/lib/uk-space-engine.server.ts`)

- **Purpose**: UK Space Industry Act 2018 compliance and CAA licensing
- **Inputs**: UK-specific operator profile (license type, activities, risk category)
- **Outputs**: License requirements, compliance scores, UK-EU comparison, CAA documentation checklist
- **Key functions**: `validateOperatorProfile()`, `determineRequiredLicenses()`, `calculateComplianceScore()`, `determineRiskLevel()`, `generateGapAnalysis()`, `findEuSpaceActCrossReferences()`, `performAssessment()`, `getUkEuComparisonSummary()`, `generateCaaDocumentationChecklist()`

### 4.11 US Regulatory Engine (`src/lib/us-regulatory-engine.server.ts`)

- **Purpose**: FCC, FAA, and ITAR/EAR compliance for US operations
- **Inputs**: US operator profile (agency requirements, deorbit plan, license types)
- **Outputs**: Per-agency compliance status, deorbit compliance, license requirement summaries, cross-references to EU Space Act and COPUOS
- **Key functions**: `validateOperatorProfile()`, `calculateComplianceScore()`, `determineRiskLevel()`, `generateGapAnalysis()`, `generateAgencyStatus()`, `checkDeorbitCompliance()`, `findEuSpaceActCrossReferences()`, `findCopuosCrossReferences()`, `performAssessment()`, `calculateDeorbitRequirements()`

### 4.12 Unified Engine Merger (`src/lib/unified-engine-merger.server.ts`)

- **Purpose**: Aggregates results from multiple regulation engines into a unified compliance view
- **Inputs**: Individual engine results (EU Space Act, NIS2, space law, CRA, etc.)
- **Outputs**: Merged articles with multi-regulation annotations, confidence scoring, overall risk calculation
- **Key functions**: `mergeMultiActivityResults()`, `calculateConfidenceScore()`, `buildUnifiedResult()`, `calculateOverallRisk()`

### 4.13 RRS Engine (`src/lib/rrs-engine.server.ts`)

- **Purpose**: Regulatory Readiness Score for Assure investor due diligence
- **Inputs**: Organization ID (pulls compliance data from DB)
- **Outputs**: 0-100 score with component breakdowns, factor-level analysis, recommendations, methodology appendix
- **Key functions**: `computeRRS()`, `computeAndSaveRRS()`, `getRRSHistory()`, `getRRSMethodologyAppendix()`

### 4.14 RCR Engine (`src/lib/rcr-engine.server.ts`)

- **Purpose**: Regulatory Credit Rating (letter grades AAA through D) for investor reporting
- **Inputs**: Organization ID
- **Outputs**: Letter grade, score, outlook (positive/stable/negative/developing), component scores, risk factors, methodology document
- **Key functions**: `mapScoreToGrade()`, `computeOutlook()`, `computeRCR()`, `computeAndSaveRCR()`, `publishRating()`, `getCurrentRating()`, `getRatingHistory()`, `getRCRMethodologyDocument()`

### 4.15 IRPE Engine (`src/lib/irpe-engine.server.ts`)

- **Purpose**: Insurance Risk Profile Evaluation scoring
- **Inputs**: Assessment data
- **Outputs**: IRPE score
- **Key functions**: `calculateIRPEScore()`

---

## 5. Dashboard Modules

All 17 compliance modules accessible under `/dashboard/modules/*`:

### 5.1 Authorization (`/dashboard/modules/authorization`)

- Authorization workflow state machine (draft -> submitted -> review -> approved/rejected)
- Document management for authorization applications
- Completeness evaluation engine
- Workflow definitions in `src/lib/workflow/` (authorization, incident, notified-body)
- Service: `authorization-service.ts`, `authorization-document-sync.server.ts`

### 5.2 Cybersecurity (`/dashboard/modules/cybersecurity`)

- ENISA/NIS2 cybersecurity controls tracking
- 3,418 LOC of requirements in `cybersecurity-requirements.ts`
- ENISA space controls from `enisa-space-controls.ts`
- Framework generation (AI-powered)
- Cyber Suite aggregate view at `/dashboard/cyber-suite`
- Services: `cybersecurity-score.ts`, `cyber-suite-actions.server.ts`, `cyber-suite-score.server.ts`

### 5.3 Debris Mitigation (`/dashboard/modules/debris`)

- Debris mitigation plan generation
- Orbital lifetime calculation
- Casualty risk assessment
- Maneuver planning
- Requirements from `debris-requirements.ts`
- COPUOS/IADC cross-references

### 5.4 Environmental (`/dashboard/modules/environmental`)

- Environmental impact assessment
- Copernicus data integration (map visualization)
- Supplier management with batch outreach
- Environmental report generation (PDF)
- Requirements from `environmental-requirements.ts`

### 5.5 Insurance (`/dashboard/modules/insurance`)

- Insurance policy management
- IRPE (Insurance Risk Profile Evaluation) scoring
- Compliance report generation
- Requirements from `insurance-requirements.ts`

### 5.6 NIS2 (`/dashboard/modules/nis2`, `/dashboard/modules/nis2/[id]`)

- NIS2 Directive compliance tracker with drill-down per assessment
- Crosswalk mapping to EU Space Act
- 51 requirements tracking
- Auto-classification from operator profile

### 5.7 Registration (`/dashboard/modules/registration`)

- Space object registration (UN Registry)
- COSPAR ID generation
- Status history tracking
- CSV export
- Service: `registration-service.ts`

### 5.8 Supervision (`/dashboard/modules/supervision`)

- Supervision configuration
- Report generation (scheduled + on-demand)
- Calendar event management
- Incident management with NIS2 phases (`/dashboard/incidents`)
- Breach notification service with NIS2-compliant timelines
- Services: `incident-response-service.ts`, `incident-autopilot.ts`, `breach-notification-service.ts`

### 5.9 COPUOS/IADC (`/dashboard/modules/copuos`)

- COPUOS Long-Term Sustainability guideline tracking
- IADC debris mitigation guideline compliance
- Cross-reference mapping to EU Space Act
- Requirements from `copuos-iadc-requirements.ts`

### 5.10 Export Control (`/dashboard/modules/export-control`)

- ITAR/EAR compliance tracking
- Deemed export risk assessment
- Screening requirements
- Technology Control Plan assessment
- License exception analysis
- Requirements from `itar-ear-requirements.ts`

### 5.11 Spectrum/ITU (`/dashboard/modules/spectrum`)

- ITU Radio Regulations compliance
- Frequency band analysis
- Filing status tracking
- Coordination summary
- Requirements from `spectrum-itu-requirements.ts`

### 5.12 UK Space Industry Act (`/dashboard/modules/uk-space`)

- UK Space Industry Act 2018 compliance
- CAA licensing requirements
- UK-EU regulatory comparison
- Requirements from `uk-space-industry-act.ts`

### 5.13 US Regulatory (`/dashboard/modules/us-regulatory`)

- FCC, FAA compliance
- Deorbit requirement calculator
- Per-agency compliance status
- Requirements from `us-space-regulations.ts`

### 5.14 CRA (`/dashboard/modules/cra`, `/dashboard/modules/cra/[id]`)

- Cyber Resilience Act product management
- Product classification (default/important/critical)
- SBOM analysis
- NVD vulnerability scanning
- Notified body workflow
- Benchmark comparison
- EU Declaration of Conformity generation
- Crosswalk mapping to NIS2

### 5.15 Digital Twin (`/dashboard/digital-twin`)

- Compliance digital twin visualization
- Multi-framework regulatory modeling
- What-if scenario simulation and comparison
- Timeline projection
- Risk assessment

### 5.16 Evidence (`/dashboard/evidence`)

- Compliance evidence management
- Evidence-to-requirement mapping
- Coverage analysis and gap identification
- Service: `ace-evidence-service.server.ts`

### 5.17 Hazards (`/dashboard/hazards`)

- Hazard register with mitigation tracking
- Hazard entry management (accept/reject workflow)
- Mission-level hazard synchronization
- Hazard report generation (PDF)

---

## 6. ATLAS -- Regulatory Intelligence Dashboard

ATLAS is a standalone regulatory intelligence platform accessible at `/atlas` with its own shell layout (`AtlasShell.tsx`).

### Pages

| Route                         | Purpose                                                        |
| ----------------------------- | -------------------------------------------------------------- |
| `/atlas`                      | Command center -- regulatory intelligence overview             |
| `/atlas/comparator`           | Side-by-side jurisdiction comparison tool                      |
| `/atlas/jurisdictions`        | Browse all covered jurisdictions                               |
| `/atlas/jurisdictions/[code]` | Deep-dive into a specific jurisdiction's regulatory framework  |
| `/atlas/eu-space-act`         | EU Space Act tracker and article browser                       |
| `/atlas/cyber-standards`      | Cybersecurity standards matrix (ENISA, ISO 27001, CCSDS, NIS2) |
| `/atlas/sustainability`       | Space sustainability regulatory landscape                      |
| `/atlas/alerts`               | Regulatory change alerts and notifications                     |
| `/atlas/api-access`           | API access management for ATLAS data                           |
| `/atlas/settings`             | ATLAS configuration                                            |

### Data Sources

ATLAS draws from the `src/data/regulatory/` directory:

- `eu-space-act-proposal.ts` -- Full EU Space Act text and structure
- `regulatory-map.ts` -- Cross-regulation mapping
- `jurisdictions/` -- 10 jurisdiction-specific data files (Austria, Belgium, Denmark, France, Germany, Italy, Luxembourg, Netherlands, Norway, UK)
- `standards/` -- 8 standards files (CCSDS Security, COPUOS LTS, IADC Guidelines, ISO 24113, ISO 27001, ITAR/EAR, ITU Radio Regulations, NIS2 Directive)

Additional regulatory data:

- `bnetza-regulatory-knowledge.ts` -- BNetzA (German Federal Network Agency)
- `cnes-regulatory-knowledge.ts` -- CNES (French Space Agency)
- `national-authorities.ts` -- NCAs across jurisdictions
- `nca-profiles.ts` -- NCA profile data
- `ncas.ts` -- NCA reference data

---

## 7. Assure -- Investor Due Diligence Platform

Assure is a comprehensive investor due diligence platform for space companies, accessible at `/assure/*`.

### Pages (22 routes)

| Route                           | Purpose                                                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `/assure`                       | Landing/marketing page                                                                                  |
| `/assure/dashboard`             | Main Assure dashboard                                                                                   |
| `/assure/onboarding`            | Guided onboarding flow                                                                                  |
| `/assure/profile`               | Company profile overview                                                                                |
| `/assure/profile/[section]`     | Profile builder (8 sections: company, tech, market, team, financial, regulatory, competitive, traction) |
| `/assure/score`                 | Regulatory Readiness Score (RRS) detail                                                                 |
| `/assure/benchmarks`            | Peer benchmark comparison                                                                               |
| `/assure/risks`                 | Risk register                                                                                           |
| `/assure/risks/[category]`      | Category-specific risk view                                                                             |
| `/assure/risks/scenarios`       | Scenario analysis and simulation                                                                        |
| `/assure/materials`             | Due diligence materials library                                                                         |
| `/assure/materials/generator`   | AI-powered material generation                                                                          |
| `/assure/dataroom`              | Virtual data room management                                                                            |
| `/assure/dataroom/analytics`    | Data room access analytics                                                                              |
| `/assure/dataroom/view/[token]` | Investor data room view (token-gated)                                                                   |
| `/assure/investors`             | Investor management                                                                                     |
| `/assure/investors/milestones`  | Milestone tracking                                                                                      |
| `/assure/investors/updates`     | Investor update distribution                                                                            |
| `/assure/settings`              | Assure settings                                                                                         |
| `/assure/book`                  | Booking page                                                                                            |
| `/assure/demo`                  | Demo page                                                                                               |
| `/assure/request-access`        | Access request page                                                                                     |
| `/assure/view/[token]`          | Public share view (token-gated)                                                                         |

### RRS (Regulatory Readiness Score)

- Computed by `rrs-engine.server.ts`
- 0-100 numeric score with component breakdowns
- Factor-level analysis across regulatory domains
- Automated daily computation via cron (`/api/cron/compute-rrs`)
- Historical snapshots stored in `RRSSnapshot` model
- Methodology appendix generation

### RCR (Regulatory Credit Rating)

- Computed by `rcr-engine.server.ts`
- Letter grades: AAA, AA, A, BBB, BB, B, CCC, CC, C, D
- Outlook: Positive, Stable, Negative, Developing
- Correlation rules between components
- Appeal process (operators can challenge ratings)
- Publishable ratings with benchmark comparison
- Daily computation via cron (`/api/cron/compute-rcr`)

### Additional Assure Engines (`src/lib/assure/`)

| File                           | Purpose                                |
| ------------------------------ | -------------------------------------- |
| `benchmark-engine.server.ts`   | Peer benchmark calculations            |
| `irs-engine.server.ts`         | Investment Readiness Score computation |
| `irs-preview-calculator.ts`    | IRS preview without full save          |
| `profile-engine.server.ts`     | Profile completeness and scoring       |
| `risk-engine.server.ts`        | Risk assessment and scenario analysis  |
| `onboarding-astra-messages.ts` | AI onboarding guidance                 |
| `validations.ts`               | Assure-specific Zod schemas            |

### Data Room

- Virtual data room with document management
- Share links with token-based access control
- Access analytics (who viewed what, when)
- Structured folders from `src/data/assure/dataroom-structure.ts`

### PDF Reports (Assure-specific, `src/lib/pdf/assure/`)

| File                   | Report Type                 |
| ---------------------- | --------------------------- |
| `company-profile.ts`   | Company profile PDF         |
| `executive-summary.ts` | Executive summary PDF       |
| `investment-teaser.ts` | Investment teaser one-pager |
| `investor-update.ts`   | Periodic investor update    |
| `risk-report.ts`       | Risk assessment report      |
| `format.ts`            | Shared formatting utilities |

### Dashboard Integration (`/dashboard/assure/*`)

| Route                                  | Purpose                              |
| -------------------------------------- | ------------------------------------ |
| `/dashboard/assure`                    | Dashboard-integrated Assure overview |
| `/dashboard/assure/score`              | RRS score in dashboard context       |
| `/dashboard/assure/rating`             | RCR rating view                      |
| `/dashboard/assure/rating/methodology` | RCR methodology explanation          |
| `/dashboard/assure/rating/report`      | Rating report                        |
| `/dashboard/assure/rating/appeal`      | Appeal process                       |
| `/dashboard/assure/packages`           | DD packages                          |
| `/dashboard/assure/share`              | Share management                     |

---

## 8. Academy -- Training Platform

Academy is a learning management system for regulatory compliance training, accessible at `/academy/*`.

### Pages (18 routes)

| Route                                                    | Purpose                         |
| -------------------------------------------------------- | ------------------------------- |
| `/academy`                                               | Academy landing page            |
| `/academy/dashboard`                                     | Learner progress dashboard      |
| `/academy/courses`                                       | Course catalog                  |
| `/academy/courses/[courseSlug]`                          | Course detail page              |
| `/academy/courses/[courseSlug]/learn`                    | Course learning interface       |
| `/academy/courses/[courseSlug]/learn/[lessonSlug]`       | Individual lesson view          |
| `/academy/classroom`                                     | Classroom browser               |
| `/academy/classroom/join`                                | Join a classroom                |
| `/academy/classroom/[classroomId]`                       | Classroom detail                |
| `/academy/simulations`                                   | Simulation browser              |
| `/academy/simulations/[scenarioId]`                      | Run a simulation scenario       |
| `/academy/sandbox`                                       | Compliance calculation sandbox  |
| `/academy/progress`                                      | Progress tracker                |
| `/academy/instructor`                                    | Instructor portal               |
| `/academy/instructor/classrooms`                         | Instructor classroom management |
| `/academy/instructor/classrooms/new`                     | Create new classroom            |
| `/academy/instructor/classrooms/[classroomId]`           | Manage specific classroom       |
| `/academy/instructor/classrooms/[classroomId]/analytics` | Classroom analytics             |

### Features

- **Courses**: Multi-module courses with lessons, defined in `src/data/academy/courses.ts`
- **Lessons**: Individual learning units with completion tracking (`AcademyLessonCompletion` model)
- **Quizzes**: Questions attached to lessons (`AcademyQuestion` model)
- **Simulations**: Scenario-based compliance exercises, defined in `src/data/academy/scenarios.ts`
- **Classrooms**: Group learning with instructor management, student enrollment, join codes
- **Badges**: Achievement badges earned through course completion and activities (`AcademyBadge` model)
- **Sandbox**: Interactive compliance calculator for experimentation
- **Instructor Portal**: Create classrooms, track student progress, view analytics
- **Progress Tracking**: Per-user enrollment, completion percentage, badge collection

### API Endpoints (16 routes)

`/api/academy/courses`, `/api/academy/courses/[courseSlug]`, `/api/academy/courses/[courseSlug]/enroll`, `/api/academy/lessons/[lessonId]`, `/api/academy/lessons/[lessonId]/complete`, `/api/academy/classrooms`, `/api/academy/classrooms/join`, `/api/academy/classrooms/[classroomId]`, `/api/academy/classrooms/[classroomId]/students`, `/api/academy/classrooms/[classroomId]/analytics`, `/api/academy/simulations`, `/api/academy/simulations/run`, `/api/academy/simulations/[runId]`, `/api/academy/progress`, `/api/academy/progress/badges`, `/api/academy/sandbox/calculate`

---

## 9. Astra -- AI Compliance Copilot

Astra is a Claude-powered AI assistant specialized in space regulatory compliance. Located at `/dashboard/astra` (full-page chat) and accessible via the TopBar quick-access.

### Architecture (`src/lib/astra/`)

| File                              | Purpose                                                                               | LOC   |
| --------------------------------- | ------------------------------------------------------------------------------------- | ----- |
| `engine.ts`                       | `AstraEngine` class -- Anthropic tool-use loop (max 10 iterations), claude-sonnet-4-6 | --    |
| `tool-executor.ts`                | Tool execution dispatch                                                               | 2,902 |
| `tool-definitions.ts`             | 44 tool definitions passed to Anthropic API                                           | --    |
| `context-builder.ts`              | Fetches compliance scores, assessments, workflows from DB                             | --    |
| `conversation-manager.ts`         | Prisma-backed persistence with auto-summarization                                     | --    |
| `system-prompt.ts`                | System prompt construction                                                            | --    |
| `response-formatter.ts`           | Response formatting and markdown rendering                                            | --    |
| `article-context.ts`              | EU Space Act article context retrieval                                                | --    |
| `sanitize.ts`                     | Input sanitization                                                                    | --    |
| `mock-responses.ts`               | Development mock responses                                                            | --    |
| `benchmark-engine.server.ts`      | AI-powered benchmark analysis                                                         | --    |
| `document-intelligence.server.ts` | Document analysis and intelligence                                                    | --    |
| `guided-workflows.server.ts`      | Guided compliance workflows                                                           | --    |
| `proactive-engine.server.ts`      | Proactive insight generation                                                          | --    |

### Regulatory Knowledge Base (`src/lib/astra/regulatory-knowledge/`)

| File                      | Coverage                                         |
| ------------------------- | ------------------------------------------------ |
| `eu-space-act.ts`         | EU Space Act articles, structure, key provisions |
| `nis2.ts`                 | NIS2 Directive requirements and obligations      |
| `cra.ts`                  | Cyber Resilience Act requirements                |
| `jurisdictions.ts`        | National space law summaries                     |
| `glossary.ts`             | Regulatory term definitions                      |
| `cross-regulation-map.ts` | Cross-references between all regulations         |

### 44 Available Tools

**Compliance Status Tools:**
`check_compliance_status`, `get_article_requirements`, `run_gap_analysis`, `check_cross_regulation_overlap`, `compare_jurisdictions`, `get_deadline_timeline`, `get_assessment_results`, `get_operator_classification`, `get_nis2_classification`

**Document Tools:**
`list_documents`, `check_document_completeness`

**Generation Tools:**
`generate_compliance_report`, `generate_authorization_application`, `generate_debris_mitigation_plan`, `generate_cybersecurity_framework`, `generate_environmental_report`, `generate_insurance_report`, `generate_nis2_report`

**Regulatory Research Tools:**
`search_regulation`, `get_article_detail`, `get_cross_references`, `explain_term`, `assess_regulatory_impact`, `suggest_compliance_path`, `estimate_compliance_cost_time`

**CRA-Specific Tools:**
`get_cra_assessment_status`, `get_cra_product_classification`, `get_cra_requirement_gaps`, `get_cra_nis2_overlap`, `get_cra_sbom_analysis`

Plus additional tools (44 total) for benchmarking, document intelligence, guided workflows, and proactive insights.

### API Endpoints (6 routes)

`/api/astra/chat`, `/api/astra/analyze-document`, `/api/astra/benchmarks`, `/api/astra/insights`, `/api/astra/mcp`, `/api/astra/workflows`

---

## 10. Mission Control, Ephemeris & Shield

### 10.1 Mission Control (`/dashboard/mission-control`)

- **3D satellite tracking globe** using Three.js (@react-three/fiber)
- Real-time orbital visualization
- CelesTrak TLE data integration
- Fleet management view
- 11 components in `src/components/mission-control/`

### 10.2 Ephemeris -- Compliance Forecasting (`/dashboard/ephemeris`, `/dashboard/ephemeris/[noradId]`)

The Ephemeris subsystem (`src/lib/ephemeris/`) is a comprehensive satellite compliance forecasting engine:

**Core (`ephemeris/core/`):**

- `satellite-compliance-state.ts` -- Live compliance state from orbital data
- `cap-compliance-state.ts` -- CAP (Collision Avoidance Provider) compliance
- `isos-compliance-state.ts` -- ISOS compliance
- `launch-compliance-state.ts` -- Launch operator compliance
- `lso-compliance-state.ts` -- LSO compliance
- `pdp-compliance-state.ts` -- PDP compliance
- `tco-compliance-state.ts` -- TCO compliance
- `module-registry.ts` -- Module registration system
- `scoring.ts` -- Compliance scoring algorithms
- `entity-adapter.ts` -- Entity type adaptation
- `sync-entities.ts` -- Entity synchronization

**Physics Models (`ephemeris/models/`):**

- `orbital-decay.ts` -- Orbital decay prediction
- `fuel-depletion.ts` -- Fuel consumption modeling
- `subsystem-degradation.ts` -- Component degradation curves
- `deadline-events.ts` -- Deadline-driven events
- `regulatory-change.ts` -- Regulatory change impact modeling

**Forecasting (`ephemeris/forecast/`):**

- `forecast-engine.ts` -- Main forecast computation
- `forecast-curve.ts` -- Compliance trajectory curves
- `compliance-horizon.ts` -- Compliance horizon analysis

**Simulation (`ephemeris/simulation/`):**

- `what-if-engine.ts` -- Scenario simulation engine
- `jurisdiction-simulator.ts` -- Jurisdiction change simulation
- `jurisdiction-data.ts` -- Jurisdiction-specific simulation data
- 15 scenario handlers in `simulation/handlers/`: `cap.ts`, `communication.ts`, `dependency.ts`, `environment.ts`, `financial.ts`, `hardware.ts`, `isos.ts`, `launch.ts`, `lso.ts`, `operational.ts`, `orbital.ts`, `pdp.ts`, `regulatory.ts`, `tco.ts`, `index.ts`

**Fleet Intelligence (`ephemeris/fleet/`):**

- `fleet-intelligence.ts` -- Fleet-level compliance insights
- `cross-type-intelligence.ts` -- Cross-entity-type analysis
- `benchmark.ts` -- Fleet benchmarking

**Data Adapters (`ephemeris/data/`):**

- `celestrak-adapter.ts` -- CelesTrak TLE data
- `assessment-adapter.ts` -- Assessment data
- `eurlex-adapter.ts` -- EUR-Lex regulatory data
- `solar-flux-adapter.ts` -- Solar flux for atmospheric drag
- `sentinel-adapter.ts` -- Sentinel telemetry data
- `verity-adapter.ts` -- Verity attestation data
- `shield-adapter.ts` -- Shield conjunction data

**Anomaly Detection (`ephemeris/anomaly/`):**

- `anomaly-detector.ts` -- Anomaly detection in compliance forecasts

**Cascade Analysis (`ephemeris/cascade/`):**

- `conflict-detector.ts` -- Regulatory conflict detection
- `dependency-graph.ts` -- Entity dependency graph

**Cross-Type Analysis (`ephemeris/cross-type/`):**

- `auto-detect.ts` -- Automatic entity type detection
- `dependency-graph.ts` -- Cross-type dependency mapping
- `impact-propagation.ts` -- Impact cascade propagation

### 10.3 Sentinel -- Satellite Telemetry Monitoring (`/dashboard/sentinel`)

- Agent-based satellite monitoring system
- Telemetry packet ingestion and storage
- Cross-verification of compliance claims
- Data erasure support (GDPR)
- Hash chain verification for data integrity
- Health monitoring and heartbeat
- Services: `sentinel-service.server.ts`, `cross-verification.server.ts`
- Models: `SentinelAgent`, `SentinelPacket`, `CrossVerification`

### 10.4 Shield -- Conjunction Assessment (`/dashboard/shield`, `/dashboard/shield/[eventId]`)

Shield is a conjunction assessment and collision avoidance system:

**API Endpoints (23 routes under `/api/shield/`):**

- Event management (create, view, close)
- CDM (Conjunction Data Message) tracking
- Compliance evaluation per event
- Maneuver calculation and execution tracking
- NCA notification
- Threat object identification
- Timeline tracking
- Decision support (decide endpoint)
- Verification
- Factor analysis
- Coordination with other operators
- Fleet summary and maneuver summary
- Forecast integration
- Priority queue management
- Anomaly detection
- Analytics and statistics

**Cron Jobs:**

- `/api/cron/cdm-polling` -- Every 4 hours, polls for new CDMs
- `/api/cron/ca-cleanup` -- Weekly, cleans up resolved events
- `/api/cron/ca-digest` -- Daily, conjunction assessment digest

**Models:** `ConjunctionEvent`, `CDMRecord`, `CAEscalationLog`, `CAConfig`

---

## 11. Additional Dashboard Systems

### 11.1 Hub -- Project Management (`/dashboard/hub/*`)

- Project management with task boards
- Calendar integration
- Timesheet tracking
- Drag-and-drop task reordering (@dnd-kit)
- Labels and comments
- Team member management

**Routes:** `/dashboard/hub`, `/dashboard/hub/projects`, `/dashboard/hub/projects/[id]`, `/dashboard/hub/tasks`, `/dashboard/hub/calendar`, `/dashboard/hub/timesheet`

**Models:** `HubProject`, `HubProjectMember`, `HubTask`, `HubTaskComment`, `HubLabel`, `HubTaskLabel`, `HubTimeEntry`, `HubCalendarEvent`

### 11.2 Nexus -- Asset Registry (`/dashboard/nexus`, `/dashboard/nexus/[id]`)

- Asset management with requirements, dependencies, suppliers, vulnerabilities, personnel
- Dependency graph visualization
- SPOF (Single Point of Failure) detection
- Spacecraft synchronization
- Auto-detection of asset types
- Security metrics: MFA rate, patch rate, supply chain, training

**Models:** `Asset`, `AssetRequirement`, `AssetDependency`, `AssetSupplier`, `AssetVulnerability`, `AssetPersonnel`

### 11.3 Ontology -- Regulatory Knowledge Graph (`/dashboard/ontology`)

- Regulatory ontology graph visualization
- Obligation mapping
- Conflict detection between regulations
- Impact analysis
- Node-level detail view
- Seeding from regulatory data

**Models:** `OntologyNode`, `OntologyEdge`, `OntologyVersion`

### 11.4 Optimizer -- Regulatory Arbitrage (`/dashboard/optimizer`)

- Jurisdiction comparison and optimization
- Regulatory arbitrage analysis
- Preset configurations
- Historical analysis tracking
- PDF report generation

**Model:** `OptimizationResult`

### 11.5 Verity -- Compliance Certificates (`/dashboard/verity`)

A compliance attestation and certificate system:

- Certificate issuance and verification
- Attestation generation (auto and manual)
- P2P (peer-to-peer) verification requests
- Compliance passport generation
- NCA evidence bundle generation
- Public key infrastructure
- Audit chain with hash-chain integrity
- Score computation per operator

**Public routes:** `/verity`, `/verity/verify`, `/verity/passport/[passportId]`

**Models:** `VerityAttestation`, `VerityCertificate`, `VerityCertificateClaim`, `VerityPassport`, `VerityP2PRequest`, `VerityAuditChainEntry`, `VerityIssuerKey`

### 11.6 Network -- Stakeholder Management (`/dashboard/network/*`)

- Stakeholder engagement management
- Data room creation and sharing
- Compliance attestations (request, issue, revoke, verify)
- Legal engagement management with attorney assignment
- Access logging
- Activity feed

**Routes:** `/dashboard/network`, `/dashboard/network/[id]`, `/dashboard/network/data-room/[id]`, `/dashboard/network/legal`, `/dashboard/network/legal/[engagementId]`

**External portal:** `/stakeholder/portal`, `/stakeholder/portal/attest/[id]`, `/stakeholder/portal/data-room/[id]`

**Models:** `StakeholderEngagement`, `DataRoom`, `DataRoomDocument`, `ComplianceAttestation`, `StakeholderAccessLog`, `DataRoomAccessLog`, `LegalFirm`, `LegalAttorney`, `LegalEngagement`, `LegalEngagementAttorney`, `LegalAccessLog`, `LegalReviewComment`

### 11.7 NCA Portal (`/dashboard/nca-portal/*`)

- NCA (National Competent Authority) submission pipeline
- Package creation and submission
- Correspondence management (per-submission threads)
- Submission timeline tracking
- Priority management
- Analytics dashboard
- Deadline monitoring via cron

**Routes:** `/dashboard/nca-portal`, `/dashboard/nca-portal/packages/new`, `/dashboard/nca-portal/submissions/[id]`

**Models:** `NCASubmission`, `NCACorrespondence`, `NCADocument`, `NCADocPackage`, `NCAReasoningPlan`, `NCAConsistencyCheck`, `NCAImpactAlert`, `SubmissionPackage`

### 11.8 Documents (`/dashboard/documents/*`)

- Document vault with upload/download
- Presigned URL upload (R2/S3)
- Document compliance checking
- AI document generation studio (`/dashboard/generate`)
- Advanced generation (`/dashboard/documents/generate`, `/dashboard/documents/generate/[id]`)
- Template-based generation
- Access logging

**Models:** `Document`, `DocumentTemplate`, `DocumentAccessLog`, `DocumentComment`, `DocumentShare`, `GeneratedDocument`

### 11.9 Additional Dashboard Pages

| Route                               | Purpose                                                          |
| ----------------------------------- | ---------------------------------------------------------------- |
| `/dashboard/tracker`                | Article-level compliance tracker with bulk status updates        |
| `/dashboard/timeline`               | Mission timeline, deadlines, milestones, mission phases          |
| `/dashboard/regulatory-feed`        | Regulatory update feed with read tracking                        |
| `/dashboard/audit-center`           | Audit logs, evidence management, hash-chain verification, export |
| `/dashboard/compliance-methodology` | Compliance scoring methodology explanation                       |
| `/dashboard/settings`               | User settings                                                    |
| `/dashboard/settings/billing`       | Stripe subscription management                                   |
| `/dashboard/settings/api-keys`      | API key management                                               |
| `/dashboard/settings/security-log`  | Security event log                                               |
| `/dashboard/settings/widget`        | Embeddable widget configuration                                  |

---

## 12. API System

### 12.1 Public API v1 (`/api/v1/*`) -- 93 routes

Organized into domains:

**Compliance (10 routes):**
`/api/v1/compliance`, `/api/v1/compliance/assess`, `/api/v1/compliance/articles`, `/api/v1/compliance/modules`, `/api/v1/compliance/score`, `/api/v1/compliance/nis2/assess`, `/api/v1/compliance/nis2/classify`, `/api/v1/compliance/cra/assess`, `/api/v1/compliance/cra/classify`, `/api/v1/compliance/space-law/assess`

**Ephemeris (22 routes):**
Forecast, state, history, simulate, what-if, recalculate, horizon, alerts, anomalies, cascade, fleet intelligence, cross-type, dependencies (CRUD + graph + auto-detect + impact), launch state, jurisdiction compare

**Evidence (5 routes):**
CRUD, coverage analysis, gap analysis, scoring

**Hub (18 routes):**
Projects (CRUD + members), tasks (CRUD + comments + reorder), labels, time entries, calendar events, dashboard, members

**Sentinel (10 routes):**
Agent registration, packet ingestion, cross-verification, chain verification, health, status, tokens, data erasure

**Verity (20 routes):**
Attestation (generate, list, verify, revoke, manual), certificate (issue, list, verify, revoke, visibility), audit chain (operator history, verify), P2P (request, respond, verify), passport (generate, view), NCA bundle, public key, score

**Keys (2 routes):**
API key management

**Optimizer (3 routes):**
Analyze, history, presets

**Spacecraft (1 route):**
Spacecraft data

**Webhooks (3 routes):**
CRUD + delivery history

### 12.2 Authentication

- **API Key auth**: `src/lib/api-auth.ts` -- API keys stored hashed in `ApiKey` model, validated per request
- **Request logging**: `ApiRequest` model tracks all API calls
- **Webhook delivery**: `Webhook` + `WebhookDelivery` models for event dispatch

### 12.3 Rate Limiting (`src/lib/ratelimit.ts`)

19 tiers with Upstash Redis sliding window:

| Tier                  | Limit   | Purpose              |
| --------------------- | ------- | -------------------- |
| `api`                 | 100/min | General API          |
| `auth`                | 5/min   | Authentication       |
| `registration`        | 3/hr    | Account creation     |
| `assessment`          | 10/hr   | Assessment runs      |
| `export`              | 20/hr   | Data exports         |
| `sensitive`           | 5/hr    | Sensitive operations |
| `supplier`            | 30/hr   | Supplier portal      |
| `document_generation` | 5/hr    | Doc generation       |
| `nca_portal`          | 30/hr   | NCA portal           |
| `nca_package`         | 10/hr   | NCA packages         |
| `public_api`          | 5/hr    | Public API           |
| `widget`              | 30/hr   | Widget               |
| `mfa`                 | 5/min   | MFA attempts         |
| `generate2`           | 20/hr   | Advanced generation  |
| `admin`               | 30/min  | Admin operations     |
| `contact`             | 5/hr    | Contact form         |
| `assure`              | 30/hr   | Assure platform      |
| `assure_public`       | 10/hr   | Assure public        |
| `academy`             | 30/min  | Academy              |

In-memory fallback with ~50% lower limits for development.

### 12.4 Internal API Domains (589 total routes across 60+ domains)

Major internal API domains: `academy`, `admin`, `analytics`, `assessment`, `assure`, `astra`, `audit`, `audit-center`, `auth`, `authorization`, `calendar`, `careers`, `contact`, `copuos`, `cra`, `cron`, `cyber-suite`, `cybersecurity`, `dashboard`, `debris`, `demo`, `digital-twin`, `documents`, `environmental`, `export-control`, `generate2`, `hazards`, `health`, `insurance`, `invitations`, `legal`, `legal-engagements`, `missions`, `nca`, `nca-portal`, `network`, `newsletter`, `nexus`, `nis2`, `notifications`, `onboarding`, `ontology`, `organization`, `organizations`, `public`, `registration`, `regulatory-feed`, `reports`, `satellites`, `security`, `sessions`, `shield`, `space-law`, `spectrum`, `sso`, `stakeholder`, `stripe`, `supervision`, `supplier`, `timeline`, `tracker`, `uk-space`, `unified`, `us-regulatory`, `user`, `v1`, `verity`, `widget`

---

## 13. Infrastructure

### 13.1 Authentication (`src/lib/auth.ts`)

- **NextAuth v5** with App Router integration
- **Credential login**: Email + password (bcrypt 12 rounds)
- **Google OAuth**: Optional social login
- **SSO**: SAML ACS + OIDC callback (`/api/sso/saml/acs`, `/api/sso/oidc/callback`, `/api/sso/saml/metadata`)
- **MFA**: TOTP with QR setup + backup codes (`src/lib/mfa.server.ts`)
- **WebAuthn/FIDO2**: Hardware key registration and login (`src/lib/webauthn.server.ts`)
- **Brute force protection**: 5 attempts per 15 minutes, `LoginAttempt` + `LoginEvent` models (`src/lib/login-security.server.ts`)
- **Session management**: `UserSession` model, revoke-all capability
- **MFA challenge**: `/auth/mfa-challenge` page

### 13.2 Multi-Tenancy

- **Organization model**: Multi-tenant with `Organization` as top-level entity
- **RBAC**: 5 roles -- OWNER, ADMIN, MANAGER, MEMBER, VIEWER (`src/lib/permissions.ts`)
- **Invitations**: Email-based org invitations with token-based acceptance
- **Per-org encryption**: Unique encryption key per tenant derived from org ID + master key
- **SSO connections**: Per-org SSO configuration

### 13.3 Billing (`src/lib/stripe/`)

| File             | Purpose                   |
| ---------------- | ------------------------- |
| `client.ts`      | Stripe SDK initialization |
| `client-side.ts` | Client-side Stripe.js     |
| `pricing.ts`     | Product/price definitions |

- Checkout session creation (`/api/stripe/create-checkout-session`)
- Customer portal sessions (`/api/stripe/create-portal-session`)
- Subscription management (`/api/stripe/subscription`)
- Webhook handling (`/api/stripe/webhooks`)
- `Subscription` model linked to `Organization`

### 13.4 Email System (`src/lib/email/`)

**Clients:**

- `resend-client.ts` -- Resend API integration (primary)
- `index.ts` -- SMTP via Nodemailer (fallback)

**Templates (`src/lib/email/templates/`):**

- `base-layout.tsx` -- Shared email layout
- `deadline-reminder.tsx` -- Upcoming deadline notifications
- `document-expiry.tsx` -- Document expiration alerts
- `incident-alert.tsx` -- Incident notifications
- `newsletter-confirmation.tsx` -- Newsletter double opt-in
- `supplier-data-request.tsx` -- Supplier outreach
- `suspicious-login.tsx` -- Suspicious login alerts
- `weekly-digest.tsx` -- Weekly compliance digest

### 13.5 Storage (`src/lib/storage/`)

- `r2-client.ts` -- Cloudflare R2 / S3-compatible storage client (AWS SDK)
- `upload-service.ts` -- Presigned URL generation, file upload/download management
- Used by document vault, data rooms, evidence uploads

### 13.6 Encryption (`src/lib/encryption.ts`)

- **AES-256-GCM** symmetric encryption
- **Scrypt key derivation** from master key + salt
- **Per-org encryption keys** derived from org ID + master key
- Encrypts: VAT numbers, bank accounts, tax IDs, policy numbers
- Environment variables: `ENCRYPTION_KEY`, `ENCRYPTION_SALT`

### 13.7 Audit Trail (`src/lib/audit.ts`, `src/lib/audit-hash.server.ts`)

- Full audit logging with IP, user-agent, entity changes
- **SHA-256 hash chain**: Each `AuditLog` entry references previous hash (tamper-evident)
- Audit chain anchoring via cron (`/api/cron/audit-chain-anchor`)
- Verification endpoint (`/api/audit/verify`)
- Export capability (CSV/JSON via `/api/audit/export`)
- Security audit log (`SecurityAuditLog` model)
- Services: `audit-center-service.server.ts`, `audit-export-service.ts`, `audit-package-service.server.ts`

### 13.8 Cron Jobs (26 scheduled tasks in `vercel.json`)

| Route                                  | Schedule           | Purpose                               |
| -------------------------------------- | ------------------ | ------------------------------------- |
| `/api/cron/compliance-snapshot`        | Daily 01:00        | Snapshot org compliance scores        |
| `/api/cron/analytics-aggregate`        | Daily 02:00        | Aggregate analytics events            |
| `/api/cron/ca-cleanup`                 | Weekly Sun 02:00   | Clean up resolved conjunction events  |
| `/api/cron/data-retention-cleanup`     | Daily 03:00        | GDPR data retention cleanup           |
| `/api/cron/audit-chain-anchor`         | Daily 03:00        | Anchor audit hash chain               |
| `/api/cron/solar-flux-polling`         | Daily 04:00        | Fetch solar flux data for ephemeris   |
| `/api/cron/celestrak-polling`          | Daily 05:00        | Fetch TLE data from CelesTrak         |
| `/api/cron/cra-vulnerability-scan`     | Daily 05:30        | CRA vulnerability scanning            |
| `/api/cron/ephemeris-daily`            | Daily 06:00        | Run daily ephemeris forecasts         |
| `/api/cron/generate-scheduled-reports` | Mon 06:00          | Generate scheduled compliance reports |
| `/api/cron/regulatory-feed`            | Daily 07:00        | Poll regulatory update sources        |
| `/api/cron/compute-rrs`                | Daily 07:10        | Compute Regulatory Readiness Scores   |
| `/api/cron/nca-deadlines`              | Daily 07:20        | NCA submission deadline tracking      |
| `/api/cron/compute-rcr`                | Daily 07:30        | Compute Regulatory Credit Ratings     |
| `/api/cron/ca-digest`                  | Daily 07:30        | Conjunction assessment digest         |
| `/api/cron/deadline-reminders`         | Daily 08:00        | Email deadline reminders              |
| `/api/cron/cra-deadlines`              | Daily 08:30        | CRA deadline reminders                |
| `/api/cron/document-expiry`            | Daily 09:00        | Document expiration notifications     |
| `/api/cron/onboarding-emails`          | Daily 10:00        | Drip onboarding email sequences       |
| `/api/cron/churn-detection`            | Daily 10:00        | At-risk customer detection            |
| `/api/cron/reengagement`               | Daily 11:00        | Re-engagement campaigns               |
| `/api/cron/demo-followup`              | Daily 12:00        | Demo request follow-up                |
| `/api/cron/sentinel-cross-verify`      | Every 4 hrs        | Sentinel cross-verification           |
| `/api/cron/sentinel-auto-attest`       | Every 4 hrs (+30m) | Sentinel auto-attestation             |
| `/api/cron/cdm-polling`                | Every 4 hrs        | CDM data polling                      |
| `/api/cron/sentinel-heartbeat`         | Daily 00:30        | Sentinel agent heartbeat              |

### 13.9 PDF Generation (`src/lib/pdf/`)

**General Reports (`src/lib/pdf/reports/`):**

| File                                | Report                             |
| ----------------------------------- | ---------------------------------- |
| `audit-center-report.tsx`           | Audit center evidence report       |
| `audit-report.tsx`                  | General audit report               |
| `authorization-application.tsx`     | Authorization application document |
| `compliance-certificate.tsx`        | Compliance certificate             |
| `compliance-summary.tsx`            | Compliance summary report          |
| `cra-compliance-summary.ts`         | CRA compliance summary             |
| `cra-eu-declaration.ts`             | CRA EU Declaration of Conformity   |
| `debris-mitigation-plan.tsx`        | Debris mitigation plan             |
| `hazard-report.tsx`                 | Hazard assessment report           |
| `insurance-compliance-report.tsx`   | Insurance compliance report        |
| `nca-annual-compliance-report.tsx`  | NCA annual compliance report       |
| `nca-incident-report.tsx`           | NCA incident report                |
| `nca-significant-change-report.tsx` | NCA significant change report      |
| `optimization-report.tsx`           | Optimization/arbitrage report      |

**Assure Reports (`src/lib/pdf/assure/`):**
`company-profile.ts`, `executive-summary.ts`, `investment-teaser.ts`, `investor-update.ts`, `risk-report.ts`

**Templates:** `base-report.tsx` -- shared report template/layout

**Infrastructure:** `client-generator.tsx` (React-PDF client), `jspdf-generator.ts` (jsPDF server), `watermark.ts`, `types.ts`

### 13.10 Internationalization (`src/lib/i18n/`)

- 4 languages: English (`en.json`), German (`de.json`), French (`fr.json`), Spanish (`es.json`)
- `useTranslation` hook at `src/hooks/useTranslation.ts`

### 13.11 Analytics

- `AnalyticsEvent` model for event tracking
- `AnalyticsDailyAggregate` for aggregated metrics
- `CustomerHealthScore` for churn prediction
- `FeatureUsageDaily` for feature adoption tracking
- `SystemHealthMetric` for infrastructure monitoring
- `ApiEndpointMetrics` for API performance
- `AcquisitionEvent` for funnel tracking
- `FinancialEntry` + `RevenueSnapshot` for revenue analytics
- `useAnalyticsTracking` hook for client-side tracking

---

## 14. Regulatory Data Coverage

### 14.1 EU Space Act (COM(2025) 335)

- **119 articles** organized in 67 grouped entries
- Source: `src/data/articles.ts`
- Full proposal text: `src/data/regulatory/eu-space-act-proposal.ts`
- JSON data: `src/data/caelex-eu-space-act-engine.json`
- Cross-references: `src/data/cross-references.ts`

### 14.2 NIS2 Directive (EU 2022/2555)

- **51 requirements** in `src/data/nis2-requirements.ts` (3,973 LOC)
- Cybersecurity controls: `src/data/cybersecurity-requirements.ts` (3,418 LOC)
- ENISA space-specific controls: `src/data/enisa-space-controls.ts`

### 14.3 Cyber Resilience Act

- Requirements: `src/data/cra-requirements.ts`
- Taxonomy: `src/data/cra-taxonomy.ts`
- Crosswalk to NIS2 via API

### 14.4 National Space Laws

- **10 jurisdictions** in `src/data/national-space-laws.ts` (1,681 LOC)
- Detailed jurisdiction files in `src/data/regulatory/jurisdictions/`: Austria, Belgium, Denmark, France, Germany, Italy, Luxembourg, Netherlands, Norway, UK
- Cross-references: `src/data/space-law-cross-references.ts`
- National authorities: `src/data/national-authorities.ts`

### 14.5 COPUOS/IADC

- COPUOS/IADC guidelines: `src/data/copuos-iadc-requirements.ts`
- Standards: `src/data/regulatory/standards/copuos-lts.ts`, `iadc-guidelines.ts`, `iso-24113.ts`

### 14.6 Export Control

- ITAR/EAR: `src/data/itar-ear-requirements.ts`
- Standards: `src/data/regulatory/standards/itar-ear.ts`

### 14.7 Spectrum/ITU

- ITU requirements: `src/data/spectrum-itu-requirements.ts`
- Standards: `src/data/regulatory/standards/itu-radio-regulations.ts`

### 14.8 UK Space Industry Act

- Requirements: `src/data/uk-space-industry-act.ts`

### 14.9 US Space Regulations

- FCC/FAA requirements: `src/data/us-space-regulations.ts`

### 14.10 Additional Standards

- ISO 27001: `src/data/regulatory/standards/iso-27001.ts`
- CCSDS Security: `src/data/regulatory/standards/ccsds-security.ts`
- NIS2 Directive standard: `src/data/regulatory/standards/nis2-directive.ts`

### 14.11 Additional Data Files

| File                              | Content                                            |
| --------------------------------- | -------------------------------------------------- |
| `authorization-documents.ts`      | Authorization document templates                   |
| `cap-requirements.ts`             | Collision Avoidance Provider requirements          |
| `checklists.ts`                   | Compliance checklists                              |
| `debris-requirements.ts`          | Debris mitigation requirements                     |
| `document-vault.ts`               | Document vault structure                           |
| `environmental-requirements.ts`   | Environmental requirements                         |
| `insurance-requirements.ts`       | Insurance requirements                             |
| `isos-requirements.ts`            | ISOS requirements                                  |
| `launch-operator-requirements.ts` | Launch operator requirements                       |
| `launch-sites.ts`                 | Launch site data                                   |
| `lso-requirements.ts`             | LSO requirements                                   |
| `pdp-requirements.ts`             | PDP requirements                                   |
| `tco-requirements.ts`             | TCO requirements                                   |
| `regulation-timeline.ts`          | Regulatory timeline milestones                     |
| `timeline-deadlines.ts`           | Deadline definitions                               |
| `module-details.ts`               | Module metadata                                    |
| `module-faqs.ts`                  | Per-module FAQs                                    |
| `module-page-data.ts`             | Module page content                                |
| `modules.ts`                      | Module definitions + compliance type normalization |

### 14.12 Cross-Regulation Intelligence

- `src/data/cross-references.ts` -- Cross-references between regulations
- `src/data/regulatory/regulatory-map.ts` -- Full regulatory map
- `src/lib/astra/regulatory-knowledge/cross-regulation-map.ts` -- AI-accessible cross-regulation knowledge
- `src/lib/services/cross-regulation-service.ts` -- Cross-regulation analysis service
- `src/lib/services/cross-regulation-alert-service.ts` -- Cross-regulation alert generation

---

## 15. Security

### Authentication Security

- **Password hashing**: Bcrypt with 12 rounds
- **Brute force protection**: 5 login attempts per 15 minutes, `LoginAttempt` + `LoginEvent` logging
- **MFA**: TOTP with QR setup + backup codes
- **WebAuthn/FIDO2**: Hardware security keys
- **Session management**: Multiple active sessions, revoke-all capability

### Network Security

- **CSRF**: Origin header validation in middleware + CSRF tokens on state-changing requests
- **CORS**: Configurable CORS policy (`src/lib/cors.server.ts`)
- **Rate limiting**: 19-tier Upstash Redis sliding window (IP + user-based)
- **Bot detection**: User-Agent blocking + timing validation on assessment endpoints
- **HMAC signing**: Request signing for webhook deliveries (`src/lib/hmac-signing.server.ts`)

### Data Security

- **Encryption at rest**: AES-256-GCM with scrypt key derivation for sensitive DB fields
- **Per-org encryption**: Unique key per tenant derived from org ID + master key
- **Audit hash chain**: SHA-256 linking -- each AuditLog references previous hash (tamper-evident)
- **Honey tokens**: `HoneyToken` + `HoneyTokenTrigger` models for intrusion detection (`src/lib/honey-tokens.server.ts`)
- **Anomaly detection**: Behavioral analysis engine (`src/lib/anomaly-detection.server.ts`)

### HTTP Security Headers

- Content Security Policy (CSP)
- HSTS (2-year preload)
- X-Frame-Options: DENY
- Permissions-Policy
- Source maps disabled in production (`hideSourceMaps: true`)

### CI/CD Security

- GitHub Actions: CodeQL analysis, TruffleHog secret scanning, OWASP dependency checks
- Husky + lint-staged: Pre-commit ESLint + TypeScript checks
- npm audit (moderate+)

### Data Privacy

- GDPR data retention cleanup (cron)
- User data export (`/api/user/export`)
- User data deletion (`/api/user/delete`)
- Consent management (`UserConsent` model)
- Breach reporting (`BreachReport` model, `/api/security/breach-report`)
- Sentinel data erasure support

---

## 16. Admin Panel (`/dashboard/admin/*`)

### Pages

| Route                                 | Purpose                                                                                                                |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `/dashboard/admin`                    | Admin overview dashboard                                                                                               |
| `/dashboard/admin/users`              | User management (list, edit, delete)                                                                                   |
| `/dashboard/admin/organizations`      | Organization management                                                                                                |
| `/dashboard/admin/analytics`          | Platform analytics (7 sub-routes: overview, revenue, financial-entry, customers, product, acquisition, infrastructure) |
| `/dashboard/admin/audit`              | Audit log viewer                                                                                                       |
| `/dashboard/admin/bookings`           | Booking management                                                                                                     |
| `/dashboard/admin/contact-requests`   | Contact request management                                                                                             |
| `/dashboard/admin/crm`                | Built-in CRM system                                                                                                    |
| `/dashboard/admin/crm/companies/[id]` | Company detail                                                                                                         |
| `/dashboard/admin/crm/contacts/[id]`  | Contact detail                                                                                                         |
| `/dashboard/admin/crm/deals/[id]`     | Deal detail                                                                                                            |

### CRM System

Full-featured CRM built into the admin panel:

- Companies, contacts, deals management
- Activity tracking
- Notes and tasks
- AI-powered features: draft email, next action suggestion, company research
- Lead scoring
- Search across all entities
- Statistics dashboard

**Models:** `CrmCompany`, `CrmContact`, `CrmDeal`, `CrmActivity`, `CrmNote`, `CrmTask`, `CrmScoreEvent`

### Admin API Endpoints

42 admin routes including: user CRUD, organization CRUD, analytics (7 domains), audit, bookings, contact requests, CRM (companies/contacts/deals/notes/tasks/search/stats/AI), demo management, honey token management, interventions, newsletter management, quick actions, conjunction simulation, stats

---

## 17. Public / Marketing Pages

| Route                                     | Purpose                                                                         |
| ----------------------------------------- | ------------------------------------------------------------------------------- |
| `/`                                       | Landing page (Hero, BlogShowcase, MissionStatement, SoftwareShowcase, 3D scene) |
| `/about`                                  | About page                                                                      |
| `/platform`                               | Platform overview                                                               |
| `/security`                               | Security information                                                            |
| `/contact`                                | Contact form                                                                    |
| `/pricing`                                | Pricing tiers                                                                   |
| `/demo`                                   | Demo request page (liquid glass design)                                         |
| `/get-started`                            | Getting started flow                                                            |
| `/login`                                  | Login page                                                                      |
| `/signup`                                 | Signup page                                                                     |
| `/onboarding`                             | Post-signup onboarding wizard                                                   |
| `/blog`                                   | Blog listing                                                                    |
| `/blog/[slug]`                            | Blog post                                                                       |
| `/blog/agentic-system`                    | Agentic system article                                                          |
| `/careers`                                | Careers page                                                                    |
| `/careers/[id]`                           | Job posting detail                                                              |
| `/careers/apply`                          | Application form                                                                |
| `/glossary`, `/glossary/[term]`           | Glossary                                                                        |
| `/guides`, `/guides/[slug]`               | Guides                                                                          |
| `/modules`, `/modules/[slug]`             | Module marketing pages                                                          |
| `/jurisdictions`, `/jurisdictions/[slug]` | Jurisdiction pages                                                              |
| `/resources`                              | Resources hub                                                                   |
| `/resources/faq`                          | FAQ                                                                             |
| `/resources/glossary`                     | Resources glossary                                                              |
| `/resources/timeline`                     | Regulation timeline                                                             |
| `/resources/eu-space-act`                 | EU Space Act overview                                                           |
| `/solutions/[slug]`                       | Solution pages                                                                  |
| `/industries/[slug]`                      | Industry pages                                                                  |
| `/capabilities/[slug]`                    | Capability pages                                                                |
| `/docs/api`                               | API documentation (Swagger UI)                                                  |
| `/governance`                             | Governance page                                                                 |
| `/network`                                | Network page                                                                    |
| `/legal-network`                          | Legal network page                                                              |
| `/comply`                                 | Comply landing page                                                             |
| `/sentinel`                               | Sentinel landing page                                                           |
| `/verity`                                 | Verity landing page                                                             |
| `/systems/ephemeris`                      | Ephemeris system page                                                           |
| `/logos`                                  | Logo assets                                                                     |
| `/linkedin-banner`                        | LinkedIn banner generator                                                       |

### Legal Pages (bilingual DE + EN)

| Route                     | Purpose                  |
| ------------------------- | ------------------------ |
| `/legal/impressum`        | German Impressum         |
| `/legal/privacy`          | German Datenschutz       |
| `/legal/privacy-en`       | English Privacy Policy   |
| `/legal/terms`            | German AGB               |
| `/legal/terms-en`         | English Terms of Service |
| `/legal/cookies`          | German Cookie Policy     |
| `/legal/cookies-en`       | English Cookie Policy    |
| `/legal/accessibility`    | English Accessibility    |
| `/legal/barrierefreiheit` | German Accessibility     |
| `/legal/ai-disclosure`    | AI Disclosure            |
| `/legal/content-policy`   | Content Policy           |

### Legal Client Portal

| Route                           | Purpose                  |
| ------------------------------- | ------------------------ |
| `/legal/login`                  | Legal portal login       |
| `/legal/dashboard`              | Legal dashboard          |
| `/legal/clients/[engagementId]` | Client engagement detail |

---

## 18. Content System

### Blog (`src/content/blog/`)

- Blog posts with dynamic slug routing
- Blog showcase on landing page

### Guides (`src/content/guides/`)

- Compliance guides with slug-based routing

### Glossary (`src/content/glossary/`)

- Regulatory term definitions

### FAQ (`src/content/faq/`)

- Frequently asked questions

### Marketing Data

| File                             | Purpose                 |
| -------------------------------- | ----------------------- |
| `src/data/capabilities-pages.ts` | Capability page content |
| `src/data/industries-pages.ts`   | Industry page content   |
| `src/data/solutions-pages.ts`    | Solution page content   |
| `src/data/topic-clusters.ts`     | SEO topic clusters      |
| `src/data/demo-tour-steps.ts`    | Demo tour steps         |

---

## 19. Widget System

- Embeddable compliance widget for external websites
- Configuration management (`/dashboard/settings/widget`)
- Widget tracking (`/api/public/widget/track`)
- Widget analytics (`/api/widget/analytics`)
- Build script: `npm run build:widget`
- `WidgetConfig` model

---

## 20. Supplier Portal

- Token-gated external portal at `/supplier/[token]`
- Data request management
- Token validation
- Models: `SupplierDataRequest`, `SupplierPortalToken`
- Service: `supplier-outreach-service.ts`

---

## 21. Space Weather

- Space weather event tracking (`SpaceWeatherEvent` model)
- Solar flux polling for ephemeris drag calculations
- Service: `space-weather-service.server.ts`
- Adapter: `src/lib/ephemeris/data/solar-flux-adapter.ts`
