# Compliance Engine Hardening — Design Spec

**Date:** 2026-03-27
**Scope:** Full Compliance Stack — Engines, API Routes, Scoring Algorithms, Workflow
**Approach:** Infrastructure First (Phase 1 → 2 → 3)
**Constraint:** No external costs — no new services, packages, or infrastructure

---

## Problem Statement

The Caelex compliance engine stack (10+ engines, 400+ API routes, 4 assessment wizards) has accumulated inconsistencies across validation, error handling, response formats, and scoring algorithms. These issues impact:

- **Product readiness:** Silent failures (NIS2 data not loading → empty report without warning)
- **Investor/audit credibility:** RRS/RCR scoring weights undocumented, overlap estimates unsubstantiated
- **Scalability:** N+1 queries in auto-assessment, no concurrency protection on workflows
- **Regulatory correctness:** Article deduplication loses multi-activity context, risk scoring ignores gap severity

---

## Phase 1: Foundation

### 1.1 Centralized Assessment Validation Schemas

**File:** `src/lib/validations.ts` (extend existing)

Add 4 missing assessment schemas:

**`EUSpaceActAnswersSchema`**

- `activityTypes`: `z.array(z.enum(["spacecraft", "launch_vehicle", "launch_site", "isos", "data_provider"]))` (required, min 1)
- `entitySize`: `z.enum(["micro", "small", "medium", "large"])` (required)
- `primaryOrbit`: `z.enum(["LEO", "MEO", "GEO", "HEO", "SSO", "cislunar", "deep_space"]).nullable()`
- `establishmentCountry`: `z.string().min(2).max(3)` (required)
- `isEUBased`: `z.boolean()`
- `constellationSize`: `z.number().int().min(0).max(100000).nullable()`
- `isResearchInstitution`: `z.boolean()`
- `operatesInEU`: `z.boolean()`

**`NIS2AssessmentAnswersSchema`**

- `sector`: `z.enum(["space"])`
- `subSector`: `z.enum(["ground_infrastructure", "satellite_communications", ...])`
- `entitySize`: `z.enum(["micro", "small", "medium", "large"])`
- `employeeCount`: `z.number().int().min(0).nullable()`
- `annualTurnover`: `z.number().min(0).nullable()`
- `operatesSatComms`: `z.boolean()`
- `operatesGroundInfra`: `z.boolean()`
- `hasISO27001`: `z.boolean()`
- `hasExistingCSIRT`: `z.boolean()`
- `hasRiskManagement`: `z.boolean()`
- `isEUBased`: `z.boolean()`
- `servesEU`: `z.boolean()`
- `memberStateCount`: `z.number().int().min(0).nullable()`

**`SpaceLawAnswersSchema`**

- `selectedJurisdictions`: `z.array(z.enum(["FR", "DE", "UK", "NL", "AT", "BE", "DK", "IT", "LU", "NO"]))` (required, min 1)
- `activityType`: `z.enum([...])` (required)
- `entitySize`: `z.enum(["micro", "small", "medium", "large"])`

**`UnifiedAssessmentAnswersSchema`**

- Composition of the 3 above via `z.intersection()` or `z.object()` merge
- Additional: `startedAt: z.number()` for anti-bot timing

**Migration:**

- All 9 routes with `as` type assertions → replace with `schema.parse(body)`
- Delete `validateNIS2Answers()` function (~70 LOC) in `/api/nis2/calculate/route.ts`
- Zod inferred types replace manual interface definitions where possible

### 1.2 Unified Response Helpers

**New file:** `src/lib/api-response.ts`

```typescript
// Success responses
function createSuccessResponse<T>(data: T, status = 200): NextResponse;
// → { data: T }

// Error responses
function createErrorResponse(
  message: string,
  code: ErrorCode,
  status = 500,
  details?: Record<string, unknown>,
): NextResponse;
// → { error: string, code: ErrorCode, details?: {...} }

// Validation errors (from Zod)
function createValidationError(zodError: z.ZodError): NextResponse;
// → { error: "Validation failed", code: "VALIDATION_ERROR", details: fieldErrors }
// → Status 400
```

**Error codes (enum `ErrorCode`):**

- `VALIDATION_ERROR` — Input failed schema validation
- `UNAUTHORIZED` — No valid session
- `FORBIDDEN` — Insufficient permissions
- `NOT_FOUND` — Resource doesn't exist
- `RATE_LIMITED` — Rate limit exceeded
- `ENGINE_ERROR` — Compliance engine internal failure
- `ENGINE_DATA_UNAVAILABLE` — Regulatory data failed to load
- `CONFLICT` — Optimistic lock conflict (concurrent workflow update)

**Response envelope convention:**

- Calculations (public): `{ data: { result: {...} } }`
- Collections (authenticated): `{ data: { [plural]: [...] } }`
- Single items (authenticated): `{ data: { [singular]: {...} } }`
- Mutations: `{ data: { [singular]: {...} } }`
- Errors: `{ error: string, code: ErrorCode, details?: {...} }`

**Migration:** All compliance API routes adopt these helpers. Existing `getSafeErrorMessage()` is used inside `createErrorResponse()` for production error sanitization.

### 1.3 Shared Engine Utilities

**New file:** `src/lib/engines/shared.server.ts`

**`calculateFavorabilityScore(input: FavorabilityInput): FavorabilityResult`**

- Extracted from `space-law-engine.server.ts` (generic) and `uk-space-engine.server.ts` (UK-specific)
- Eliminates ~60 LOC duplication
- Input interface:
  ```
  processingWeeks: { min: number; max: number }
  hasGovernmentIndemnification: boolean
  liabilityRegime: 'capped' | 'negotiable' | 'unlimited'
  regulatoryMaturityYear: number
  specialProvisions?: { spaceResources?: boolean; smallEntity?: boolean }
  ```
- Output: `{ score: number; factors: string[] }` (clamped 0-100)
- Both engines call this shared function; UK engine passes UK-adapted inputs

**`getOrgMemberUserIds(organizationId: string): Promise<string[]>`**

- Single Prisma query: `organizationMember.findMany({ where: { organizationId }, select: { userId: true } })`
- Used by RRS, RCR, and Space Law engines instead of each doing their own query

**`mapScoreToGrade(score: number, scale: 'rrs' | 'rcr'): GradeResult`**

- RRS scale: A-F (6 bands)
- RCR scale: AAA-D (9 bands with +/- modifiers)
- Single source of truth for grading logic
- Output: `{ grade: string; modifier?: '+' | '-'; band: string }`

**`clampScore(score: number, min = 0, max = 100): number`**

- Replaces all `Math.max(0, Math.min(100, score))` occurrences

**`ASSESSMENT_MIN_DURATION_MS = 3000`**

- Constant for anti-bot timing validation
- Imported by all assessment routes (replaces hardcoded 3000/5000 values)

**`EngineDataError extends Error`**

- Custom error type for regulatory data loading failures
- Used by all engines when required data files fail to import

---

## Phase 2: Engine Correctness

### 2.1 Article Deduplication with Multi-Activity Context

**File:** `src/lib/unified-engine-merger.server.ts`

**Current behavior:** Deduplicates by `String(article.number)`, keeps first occurrence only.

**New behavior:**

- Deduplication key remains `article.number`
- When duplicate found: merge `applicableActivities` arrays
- New field on merged article: `applicableActivities: string[]` (e.g. `["SCO", "LO"]`)
- New field: `activityContexts: Array<{ activity: string; complianceType: string; priority: string }>`
- Most restrictive `complianceType` and `priority` wins for the merged article

**Impact:** Multi-activity operators (e.g., spacecraft operator + launch operator) see each article once but with full context of which activities trigger it.

### 2.2 Confidence Score with Quality Weighting

**File:** `src/lib/unified-engine-merger.server.ts`

**Current:** Binary presence check across 18 fields → `(answered / 18) * 100`

**New scoring:**

- Per-field quality assessment:
  - `0` — Not answered, null, undefined, empty string, empty array
  - `0.5` — Answered with low specificity (single item in multi-select, default/generic value)
  - `1.0` — Fully and specifically answered
- Field importance weights:
  - Weight `2`: `activityTypes`, `entitySize`, `establishmentCountry` (required for correct classification)
  - Weight `1.5`: `primaryOrbit`, `constellationSize`, `isEUBased` (affects regime/scope)
  - Weight `1`: All remaining fields
- Formula: `Σ(fieldQuality × fieldWeight) / Σ(fieldWeight) * 100`

### 2.3 Risk Scoring with Gap Severity

**File:** `src/lib/unified-engine-merger.server.ts`

**Current:** Count-based thresholds (6 gaps = high, 7 = critical).

**New: Weighted gap scoring.**

Gap severity weights (defined in config object, not hardcoded):

```
cybersecurity_policy: 3       — Core NIS2 requirement
incident_response: 3          — Legal obligation (24h/72h reporting)
debris_mitigation: 2          — EU Space Act mandatory
spacecraft_registration: 2    — Legal prerequisite
insurance_coverage: 1.5       — Financial compliance
environmental_footprint: 1    — Reporting obligation
administrative_docs: 1        — Supporting documentation
```

`weightedGapScore = Σ(gapPresent × gapWeight)`

Thresholds:

- Critical: ≥ 12
- High: ≥ 8
- Medium: ≥ 4
- Low: < 4

Config object `RISK_SCORING_CONFIG` with weights + thresholds + rationale strings.

### 2.4 RRS/RCR Scoring Transparency

**Files:** `src/lib/rrs-engine.server.ts`, `src/lib/rcr-engine.server.ts`

**New config objects:**

```
RRS_SCORING_CONFIG = {
  components: {
    authorizationReadiness: {
      weight: 0.25,
      rationale: "Authorization is the regulatory prerequisite for any space activity — without it, operations are illegal",
      factors: {
        workflow: { maxPoints: 40, rationale: "Workflow completion is the primary readiness indicator" },
        documents: { maxPoints: 35, rationale: "Document completeness drives NCA submission success" },
        articles: { maxPoints: 25, rationale: "Article-level tracking shows depth of understanding" },
      }
    },
    // ... same pattern for all 6 components
  }
}

RCR_PENALTY_CONFIG = {
  incidentPenaltyPer: { value: 3, rationale: "Each unresolved incident signals active regulatory risk" },
  maxIncidentPenalty: { value: 15, rationale: "Capped to prevent single-dimension domination" },
  temporalDecayRatePerMonth: { value: 0.1, rationale: "10% per month reflects data staleness risk" },
  correlationRules: [
    {
      condition: "cybersecurityPosture < 50 && authorizationReadiness > 80",
      adjustment: -5,
      rationale: "High auth readiness with poor cybersecurity indicates superficial compliance"
    },
    // ... data-driven rules instead of hardcoded if/else
  ]
}
```

Engines read from these config objects instead of inline constants.

### 2.5 NIS2 Overlap Estimates Parameterized

**File:** `src/lib/nis2-engine.server.ts`

**New config object:**

```
OVERLAP_CONFIG = {
  supersedes: {
    estimatedSavingsWeeks: 3,
    confidenceLevel: 'estimated' as const,
    source: "Internal estimate — not empirically validated. Based on assumption that superseding requirement eliminates full duplication."
  },
  overlaps: {
    estimatedSavingsWeeks: 1.5,
    confidenceLevel: 'estimated' as const,
    source: "Internal estimate — not empirically validated. Based on assumption that overlapping requirements share ~50% implementation effort."
  }
}
```

Engine output includes `confidenceLevel` and `source` so UI can display appropriate caveats.

---

## Phase 3: Robustness

### 3.1 EngineDataError for Silent Failures

**Files:** All engines with lazy data imports

**Pattern:**

```typescript
try {
  const { NIS2_REQUIREMENTS } = await import("@/data/nis2-requirements");
} catch (error) {
  throw new EngineDataError("NIS2 requirements data could not be loaded", {
    engine: "nis2",
    dataFile: "nis2-requirements.ts",
    cause: error,
  });
}
```

**Applied to:**

- `nis2-engine.server.ts` — NIS2 requirements import
- `engine.server.ts` — EU Space Act articles import
- `space-law-engine.server.ts` — National space laws import
- `nis2-auto-assessment.server.ts` — Requirements import

**API-side:** `EngineDataError` caught and returned as `{ error: "...", code: "ENGINE_DATA_UNAVAILABLE" }` with status 503.

### 3.2 Workflow Optimistic Locking

**File:** `prisma/schema.prisma` + `src/lib/workflow/engine.ts`

**Schema change:**

```prisma
model AuthorizationWorkflow {
  // ... existing fields
  version Int @default(0)  // NEW
}
```

**Transition logic:**

```
1. Read workflow (including version)
2. Validate transition
3. Update WHERE { id, version } SET { status, version: version + 1 }
4. If updateCount === 0 → return 409 Conflict
```

No external dependencies. Pure Prisma/Postgres.

### 3.3 NIS2 Auto-Assessment Batch Optimization

**File:** `src/app/api/nis2/route.ts`

**Current:** 51 individual `prisma.nIS2RequirementStatus.updateMany()` calls in `Promise.all`.

**New:** Group by target status, batch into 2-3 queries:

```
const partialIds = autoAssessments.filter(a => a.status === "partial").map(a => a.requirementId);
const notAssessedIds = autoAssessments.filter(a => a.status === "not_assessed").map(a => a.requirementId);

await prisma.$transaction([
  prisma.nIS2RequirementStatus.updateMany({
    where: { assessmentId, requirementId: { in: partialIds } },
    data: { status: "partial", autoAssessmentNotes: "..." }
  }),
  prisma.nIS2RequirementStatus.updateMany({
    where: { assessmentId, requirementId: { in: notAssessedIds } },
    data: { status: "not_assessed" }
  }),
]);
```

Reduces 51 queries → 2-3 queries.

### 3.4 Error-Path & Boundary Tests

Added to existing test files (no new test directories):

**Engine Error Paths (in existing `*.test.ts` files):**

- EU Space Act: Empty articles data → `EngineDataError`
- NIS2: Requirements load failure → `EngineDataError`
- Unified Merger: Empty activity types after filter → graceful fallback with warning
- RRS/RCR: No workflows/assessments in DB → Score 0 with `dataCompleteness: 0` flag

**Boundary Conditions:**

- `constellationSize`: 0, 1, 2, 10, 100, 1000, 100000
- `employeeCount`: 9 (micro), 10 (small), 49 (small), 50 (medium), 249 (medium), 250 (large)
- Favorability score: all bonuses → exactly 100, all maluses → exactly 0
- Confidence score: all fields empty → 0, all fields default values → partial score
- Grade boundaries: score exactly 95 (AAA vs AA+), exactly 0 (D), exactly 100 (AAA)

**API Error Paths:**

- Malformed JSON → 400 with `VALIDATION_ERROR`
- Missing required fields → 400 with specific field errors
- Rate limit → 429 with `RATE_LIMITED` code and `Retry-After`
- Concurrent workflow update → 409 with `CONFLICT`

### 3.5 Anti-Bot Timing Unified

All assessment routes import `ASSESSMENT_MIN_DURATION_MS` from `src/lib/engines/shared.server.ts` instead of hardcoded values. Single constant, single source of truth.

---

## Files Changed (Summary)

| Action     | File                                         | Phase |
| ---------- | -------------------------------------------- | ----- |
| **Extend** | `src/lib/validations.ts`                     | 1     |
| **Create** | `src/lib/api-response.ts`                    | 1     |
| **Create** | `src/lib/engines/shared.server.ts`           | 1     |
| **Modify** | `src/lib/unified-engine-merger.server.ts`    | 2     |
| **Modify** | `src/lib/nis2-engine.server.ts`              | 2     |
| **Modify** | `src/lib/rrs-engine.server.ts`               | 2     |
| **Modify** | `src/lib/rcr-engine.server.ts`               | 2     |
| **Modify** | `src/lib/space-law-engine.server.ts`         | 1+2   |
| **Modify** | `src/lib/uk-space-engine.server.ts`          | 1     |
| **Modify** | `src/lib/engine.server.ts`                   | 3     |
| **Modify** | `src/lib/nis2-auto-assessment.server.ts`     | 3     |
| **Modify** | `src/lib/workflow/engine.ts`                 | 3     |
| **Modify** | `prisma/schema.prisma` (add `version` field) | 3     |
| **Modify** | `src/app/api/assessment/calculate/route.ts`  | 1     |
| **Modify** | `src/app/api/nis2/calculate/route.ts`        | 1     |
| **Modify** | `src/app/api/nis2/route.ts`                  | 1+3   |
| **Modify** | `src/app/api/nis2/requirements/route.ts`     | 1     |
| **Modify** | `src/app/api/nis2/[assessmentId]/route.ts`   | 1     |
| **Modify** | `src/app/api/nis2/crosswalk/route.ts`        | 1     |
| **Modify** | `src/app/api/unified/calculate/route.ts`     | 1     |
| **Modify** | `src/app/api/authorization/route.ts`         | 1     |
| **Modify** | `src/app/api/space-law/calculate/route.ts`   | 1     |
| **Modify** | `src/app/api/copuos/route.ts`                | 1     |
| **Extend** | Existing test files (engine + API tests)     | 3     |

**Total:** 2 new files, 1 schema change, ~22 file modifications

---

## What This Does NOT Cover

- UI/frontend changes (glass design, components)
- New compliance engines or regulatory frameworks
- Astra AI engine modifications
- Ephemeris/Sentinel subsystem
- Academy platform
- Email templates or PDF generation
- Stripe/billing logic
- New external services or packages
