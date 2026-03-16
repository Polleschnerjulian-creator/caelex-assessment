# Generate 2.0 Intelligence Layer — Design Spec

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan.

## Overview

Five features that make the document generator fundamentally smarter. All features are **additive** — the existing generation flow (`initGeneration → generateSection × N → complete`) remains untouched. New features layer on top.

### Features

1. **Reasoning Plan** — Structured pre-generation plan computed from assessment data (deterministic, no AI call)
2. **Reasoning Preview** — UI showing the plan before generation, with inline data input and verdict overrides
3. **NCA-Targeting** — NCA-specific profiles that modify focus, depth, and expectations per target authority
4. **Consistency Check** — Post-generation validation (deterministic + AI) finding contradictions and gaps
5. **Impact Analysis** — Change propagation showing which documents/sections are affected when data changes
6. **Smart Section Order** — Topological sort of document generation order for optimal cross-references

### Implementation Order

```
Phase 1: Reasoning Plan engine + data model           ← Foundation
Phase 2: Reasoning Preview UI                          ← User sees the plan
Phase 3: NCA-Targeting (profiles + plan modification)  ← Plan becomes NCA-specific
Phase 4: Consistency Check (post-generation)            ← Plan gets verified
Phase 5: Impact Analysis (change propagation)           ← Plan becomes reactive
Phase 6: Smart Section Order (package optimization)     ← Plan goes package-wide
```

### Backwards Compatibility

Hard requirement: the existing generator must continue to work unchanged.

- Reasoning Plan is an **optional** step before `initGeneration()`. If skipped (or feature-flagged off), the existing flow runs identically
- All new data lives in **new DB tables/fields**. Existing tables are not modified except for one optional foreign key on `NCADocument`
- The existing `panelState` machine gets one new state (`"planning"`) inserted between `"pre-generation"` and `"generating"`
- Users can opt out of the planning step via a "Skip planning" option

```
EXISTING (untouched):
  User clicks Generate → initGeneration() → generateSection() × N → complete

NEW (inserted before):
  User clicks Generate → computeReasoningPlan() → [Preview] → initGeneration(plan) → ...
```

---

## Feature 1: Reasoning Plan (Engine + Data Model)

### Purpose

A structured plan computed **before** text generation that answers for each section: what data is available, what compliance status to assign, and what writing strategy to use. Gives Claude precise instructions instead of "generate section 7 based on the data."

### Data Model

```typescript
interface ReasoningPlan {
  documentId: string;
  documentType: NCADocumentType;
  targetNCA: string | null;
  overallStrategy: string;
  estimatedComplianceLevel: "high" | "medium" | "low";
  sections: SectionPlan[];
  crossReferences: CrossReference[];
  createdAt: Date;
}

interface SectionPlan {
  sectionIndex: number;
  sectionTitle: string;
  availableData: DataPoint[];
  availableEvidence: EvidenceRef[];
  missingData: MissingDataPoint[];
  complianceVerdict:
    | "compliant"
    | "substantially_compliant"
    | "partially_compliant"
    | "non_compliant"
    | "not_applicable";
  confidenceLevel: "high" | "medium" | "low";
  verdictRationale: string;
  writingStrategy: string;
  warnings: PlanWarning[];
  estimatedActionRequired: number;
}

interface DataPoint {
  source: "debris" | "cybersecurity" | "spacecraft" | "user" | "evidence";
  field: string;
  value: string | number | boolean;
  articleRef: string;
}

interface PlanWarning {
  type:
    | "missing_critical_data"
    | "default_assumption"
    | "conflicting_data"
    | "nca_specific";
  message: string;
  actionable: boolean;
  suggestion: string | null;
}

interface CrossReference {
  fromSection: number;
  toDocumentType: NCADocumentType;
  toSection: number | null;
  relationship: "references" | "depends_on" | "supersedes" | "conflicts_with";
  description: string;
}
```

### Computation Logic

No AI call — purely deterministic, computed from assessment data in ~200ms:

```
computeReasoningPlan(documentType, dataBundle, existingDocuments)
  │
  ├── For each section:
  │   ├── mapDataToSection(sectionDef, dataBundle)
  │   │   → Lookup table: which assessment fields are relevant for this section
  │   │
  │   ├── computeVerdict(availableData, missingData)
  │   │   → All critical fields + evidence: "compliant"
  │   │   → Critical fields but no evidence: "substantially_compliant"
  │   │   → Critical fields missing: "partially_compliant" or "non_compliant"
  │   │
  │   ├── determineStrategy(verdict, confidenceLevel)
  │   │   → high: "Present definitive compliance claim with evidence"
  │   │   → medium: "Present claim with ACTION REQUIRED for verification"
  │   │   → low: "Present regulatory requirements with industry best practices"
  │   │
  │   └── generateWarnings(missingData, assumptions)
  │       → "Using default Cd=2.2 — manufacturer value would strengthen claim"
  │
  └── computeCrossReferences(documentType, existingDocuments)
      → A2 Section 7 depends_on A1 Section 5
```

### Section-to-Data Mapping

New file `src/lib/generate/section-data-map.ts` — maps each section of each document type to the assessment fields it needs. Extends the existing `READINESS_SCHEMAS` pattern but at section granularity instead of document granularity.

### Prompt Integration

The plan is injected as additional context between the Operator Context (Layer 3) and the Section Prompt:

```
SECTION PLAN (follow this plan precisely):
- Compliance Verdict: SUBSTANTIALLY COMPLIANT
- Available Data: orbitType=LEO, altitudeKm=550, plannedDurationYears=7
- Available Evidence: STELA Report v2.1 (uploaded 2026-03-10)
- Missing: Exact drag coefficient (using default Cd=2.2)
- Strategy: Present quantitative 25-year analysis referencing STELA output.
  Flag Cd assumption as ACTION REQUIRED.
- Cross-References to include:
  - "See Document A4, Section 4.2" (disposal budget)
  - "See Document A1, Section 5" (lifetime summary)
```

### DB Schema

```prisma
model NCAReasoningPlan {
  id                       String          @id @default(cuid())
  documentId               String
  document                 NCADocument     @relation(fields: [documentId], references: [id])
  userId                   String
  organizationId           String
  documentType             NCADocumentType
  targetNCA                String?
  overallStrategy          String
  estimatedComplianceLevel String
  sections                 Json
  crossReferences          Json
  userModified             Boolean         @default(false)
  createdAt                DateTime        @default(now())

  @@index([documentId])
  @@index([userId, organizationId])
}
```

New optional field on `NCADocument`:

```prisma
model NCADocument {
  // ... existing fields unchanged ...
  reasoningPlanId String?
}
```

### API

```
POST /api/generate2/reasoning-plan
  Body: { documentType, targetNCA? }
  Response: { plan: ReasoningPlan }
  ~200ms, no AI call, generate2 rate limit tier
```

Extension of existing init endpoint:

```
POST /api/generate2/documents
  Body: { documentType, language, packageId, reasoningPlanId? }
  If reasoningPlanId: load plan from DB, embed in prompt context
  If not: existing flow without plan
```

### Files to Create

- `src/lib/generate/reasoning-plan.ts` — `computeReasoningPlan()` engine
- `src/lib/generate/section-data-map.ts` — Section-to-data field mapping
- `src/lib/generate/reasoning-prompt.ts` — `buildSectionPromptWithPlan()` extending existing `buildSectionPrompt()`

### Files to Modify

- `src/lib/generate/prompt-builder.ts` — Add `buildSectionPromptWithPlan()` export
- `src/lib/generate/index.ts` — Accept optional `reasoningPlanId` in `initGeneration()`, store in prompt context
- `src/app/api/generate2/documents/route.ts` — Accept `reasoningPlanId` in POST body
- `src/app/api/generate2/documents/[id]/section/route.ts` — Load plan from document, pass to `buildSectionPromptWithPlan()`
- `prisma/schema.prisma` — Add `NCAReasoningPlan` model, optional FK on `NCADocument`

---

## Feature 2: Reasoning Preview (UI)

### Purpose

Shows the Reasoning Plan to the user before generation starts. User can provide missing data inline, override verdicts, and confirm before generation begins.

### Panel State Extension

```typescript
type PanelState =
  | "empty"
  | "pre-generation"
  | "planning"
  | "generating"
  | "completed";
//                                              ^^^^^^^^ NEW
```

### Preview UI

When panelState is `"planning"`, DocumentPreviewPanel renders a `ReasoningPreview` component showing:

- Overall strategy and estimated compliance level
- Each section as a card with: available data, confidence level, verdict, strategy, warnings
- Actionable warnings with inline inputs (e.g., "Enter Cd value: [____]")
- Verdict override dropdowns (user can change "partially_compliant" to "compliant" with note)
- Cross-reference list
- "Back to Overview" and "Confirm & Generate" buttons
- "Skip planning in future" checkbox

### User Interactions

1. **Provide data** — Inline inputs on warnings update the plan locally (no API call). Confidence levels and verdicts recalculate in the browser.
2. **Override verdict** — Dropdown per section. Sets `userModified: true` on the plan. Strategy adjusts: "Present definitive compliance claim (user override)."
3. **Skip** — "Back to Overview" returns to pre-generation state. "Skip planning" checkbox persists preference in localStorage.

### Components to Create

- `src/components/generate2/ReasoningPreview.tsx` — Main preview component
- `src/components/generate2/SectionPlanCard.tsx` — Individual section plan card
- `src/components/generate2/PlanWarningInline.tsx` — Actionable warning with input
- `src/components/generate2/CrossReferenceList.tsx` — Planned cross-references display

### Components to Modify

- `src/components/generate2/Generate2Page.tsx` — Add `"planning"` to panelState, wire up plan computation and confirmation
- `src/components/generate2/DocumentPreviewPanel.tsx` — Add rendering case for `panelState === "planning"`

### API

```
POST /api/generate2/reasoning-plan
  Body: { documentType, targetNCA? }
  Response: { plan: ReasoningPlan }

PATCH /api/generate2/reasoning-plan/[id]
  Body: { sections?: Partial<SectionPlan>[], userModified: true }
  Response: { plan: ReasoningPlan }
  (Saves user overrides before generation)
```

---

## Feature 3: NCA-Targeting

### Purpose

User selects a target NCA (CNES, BNetzA, UKSA, etc.) and Caelex adjusts focus, depth, preferred standards, and expected evidence accordingly. Same compliance content, different presentation optimized for the reviewer.

### NCA Profile Data Model

```typescript
interface NCAProfile {
  id: string;
  name: string;
  country: string;
  language: string;
  executiveSummaryLanguage: string;
  rigor: Record<DocumentCategory, 1 | 2 | 3 | 4 | 5>;
  focusAreas: FocusArea[];
  preferredStandards: string[];
  preferredEvidence: PreferredEvidence[];
  documentGuidance: Partial<Record<NCADocumentType, NCADocumentGuidance>>;
}

interface FocusArea {
  articleRange: string;
  weight: "critical" | "high" | "normal";
  description: string;
}

interface PreferredEvidence {
  type: string;
  description: string;
  acceptedAsShortcut: boolean;
}

interface NCADocumentGuidance {
  depthExpectation: "standard" | "detailed" | "extensive";
  specificRequirements: string[];
  commonRejectionReasons: string[];
}
```

### Initial Profiles (5)

Stored as static data in `src/data/nca-profiles.ts`:

| NCA    | Country     | Debris Rigor | Cyber Rigor | Key Focus                                                    |
| ------ | ----------- | ------------ | ----------- | ------------------------------------------------------------ |
| CNES   | France      | 5/5          | 3/5         | Quantitative analysis, STELA validation, French exec summary |
| BNetzA | Germany     | 3/5          | 5/5         | NIS2 mapping, ISO 27001 as shortcut, process documentation   |
| UKSA   | UK          | 4/5          | 4/5         | Risk-based approach, casualty risk quantification, NASA DAS  |
| BELSPO | Belgium     | 3/5          | 3/5         | Insurance/liability focus, Belgian Space Law 2005            |
| NSO    | Netherlands | 3/5          | 3/5         | Financial risk analysis, insurance coverage                  |

### How NCA-Targeting Modifies the Plan

```typescript
function applyNCATargeting(plan: ReasoningPlan, nca: NCAProfile): ReasoningPlan;
```

Three modifications:

1. **Depth adjustment** — Sections in the NCA's focus areas get strategy modifier: "Use maximum detail — this NCA expects extensive coverage"
2. **NCA-specific warnings** — `specificRequirements` and `commonRejectionReasons` added as `nca_specific` warnings to relevant sections
3. **Evidence shortcuts** — If user has evidence that the NCA accepts as shortcut (e.g., ISO 27001 cert for BNetzA), confidence levels increase

### Prompt Injection

New prompt block added to section generation:

```
NCA TARGET: CNES (France)
- Scrutiny level for this category: 5/5
- CNES-specific requirements for this section:
  - [requirements from profile]
- Common rejection reasons to actively prevent:
  - [rejection reasons from profile]
- Preferred standards: [standards list]
```

### UI Integration

NCA dropdown in the pre-generation state of DocumentPreviewPanel, below the readiness score:

```
Target NCA: [ CNES (France)  ▾ ]
ℹ CNES profile: High scrutiny on debris (5/5). Expects STELA validation.
```

Default: `null` (no NCA targeting, generic output — same as today).

### Files to Create

- `src/data/nca-profiles.ts` — 5 NCA profile definitions
- `src/lib/generate/nca-targeting.ts` — `applyNCATargeting()` function

### Files to Modify

- `src/lib/generate/reasoning-plan.ts` — Call `applyNCATargeting()` when targetNCA is set
- `src/lib/generate/reasoning-prompt.ts` — Inject NCA context block into section prompt
- `src/components/generate2/DocumentPreviewPanel.tsx` — NCA dropdown in pre-generation state
- `src/components/generate2/Generate2Page.tsx` — State for selected NCA, pass to plan computation

---

## Feature 4: Consistency Check

### Purpose

After generation, validate the document (and optionally the full package) for contradictions, missing cross-references, and logical inconsistencies. Two phases: deterministic checks (~100ms) + AI review (~30s).

### Check Categories

| Category                | Method             | Examples                                                                              |
| ----------------------- | ------------------ | ------------------------------------------------------------------------------------- |
| Internal Consistency    | Deterministic + AI | Matrix says "Compliant" but text describes gap; numbers differ between sections       |
| Cross-Document          | Deterministic + AI | DMP says "controlled re-entry" but EOL Plan says "graveyard orbit"                    |
| Regulatory Completeness | Deterministic      | Applicable article not addressed; compliance matrix has gaps                          |
| Evidence Consistency    | Deterministic      | Claim references "v2.1" but upload is "v1.3"; resolved EVIDENCE markers still present |
| Formatting              | Deterministic      | Article reference formats inconsistent; cross-reference targets don't exist           |

### Finding Data Model

```typescript
interface ConsistencyFinding {
  id: string;
  category:
    | "internal"
    | "cross_document"
    | "regulatory"
    | "evidence"
    | "formatting";
  severity: "error" | "warning" | "info";
  documentType: NCADocumentType;
  sectionIndex: number | null;
  title: string;
  description: string;
  autoFixable: boolean;
  autoFixDescription: string | null;
}
```

### Phase A: Deterministic Checks

```typescript
function runDeterministicChecks(
  document: NCADocument,
  allDocuments: NCADocument[],
  reasoningPlan: ReasoningPlan | null,
): ConsistencyFinding[];
```

Checks:

1. Compliance Matrix verdicts vs. Reasoning Plan verdicts (if plan exists)
2. Cross-reference validation — regex `"See Document [A-Z]\d"` → verify document exists
3. Article reference consistency — normalize and find format mismatches
4. Number consistency — extract all `XXXkm`, `XXX satellites` etc., find contradictions
5. Evidence markers vs. uploaded evidence — find resolvable `[EVIDENCE: ...]` markers

### Phase B: AI Consistency Review

Single Claude call reading the full document:

```typescript
function buildConsistencyCheckPrompt(
  document: ParsedSection[],
  reasoningPlan: ReasoningPlan | null,
  relatedDocuments: Array<{ type: NCADocumentType; summary: string }>,
): string;
```

Prompt instructs Claude to find only genuine inconsistencies (not style preferences), output structured findings in `FINDING|severity|sectionIndex|title|description` format.

Model: `claude-sonnet-4-6`, temperature 0, max_tokens 2048.

### Auto-Fix

For `autoFixable: true` findings:

- Number contradictions: replace inconsistent value with assessment source value
- Missing cross-references: insert standard format reference
- Article format normalization: replace all variants with standard format

Auto-fix creates new document version with diff display. User confirms or rejects.

### Triggers

1. **Automatic** — after `complete` endpoint succeeds, check runs in background. Badge appears: "3 findings"
2. **On-demand** — "Run Consistency Check" button in completed state
3. **Package-level** — after last document completes, cross-document check runs

### DB Schema

```prisma
model NCAConsistencyCheck {
  id              String   @id @default(cuid())
  documentId      String
  document        NCADocument @relation(fields: [documentId], references: [id])
  packageId       String?
  userId          String
  organizationId  String
  findings        Json
  findingCount    Int
  errorCount      Int
  warningCount    Int
  infoCount       Int
  aiModelUsed     String?
  aiTokensUsed    Int?
  durationMs      Int
  createdAt       DateTime @default(now())

  @@index([documentId])
  @@index([packageId])
}
```

### API

```
POST /api/generate2/documents/[id]/consistency-check
  Response: { checkId, findings: ConsistencyFinding[] }

POST /api/generate2/documents/[id]/auto-fix
  Body: { findingIds: string[] }
  Response: { updatedSections, diff }

POST /api/generate2/package/[id]/consistency-check
  Response: { checkId, findings: ConsistencyFinding[] }
```

### UI

Consistency findings banner in completed state of DocumentPreviewPanel, above the document content. Each finding is clickable — "Go" scrolls to the affected section, "Auto-Fix" applies the fix with confirmation.

### Files to Create

- `src/lib/generate/consistency-check.ts` — `runDeterministicChecks()` + `buildConsistencyCheckPrompt()`
- `src/lib/generate/auto-fix.ts` — `applyAutoFixes()` function
- `src/components/generate2/ConsistencyReport.tsx` — Findings banner UI
- `src/components/generate2/ConsistencyFindingCard.tsx` — Individual finding display
- `src/app/api/generate2/documents/[id]/consistency-check/route.ts`
- `src/app/api/generate2/documents/[id]/auto-fix/route.ts`
- `src/app/api/generate2/package/[id]/consistency-check/route.ts`

### Files to Modify

- `src/components/generate2/DocumentPreviewPanel.tsx` — Add consistency report rendering in completed state
- `src/components/generate2/Generate2Page.tsx` — State for consistency findings, auto-trigger after generation
- `prisma/schema.prisma` — Add `NCAConsistencyCheck` model

---

## Feature 5: Impact Analysis

### Purpose

When assessment data changes, immediately show which documents and sections are affected — before the user manually checks anything.

### Dependency Map

Static lookup table defining which data field affects which sections in which documents.

New file: `src/lib/generate/impact-dependencies.ts`

Key mappings:

| Field                     | Source        | Affected Sections          | Impact                                                                               |
| ------------------------- | ------------- | -------------------------- | ------------------------------------------------------------------------------------ |
| `altitudeKm`              | debris        | 10 sections in 6 documents | A2 Sections 3,6,7 invalidated; A4 Sections 4,5 invalidated; A1 Section 5 invalidated |
| `orbitType`               | debris        | 7 sections in 5 documents  | Regime change invalidates most debris documents                                      |
| `deorbitStrategy`         | debris        | 5 sections in 3 documents  | Disposal and re-entry documents invalidated                                          |
| `satelliteCount`          | debris        | 5 sections in 5 documents  | Insurance, environmental, supply chain affected                                      |
| `hasPropulsion`           | debris        | 5 sections in 4 documents  | Collision avoidance, disposal, passivation affected                                  |
| `organizationSize`        | cybersecurity | 3 sections in 3 documents  | Policy scope, access control, authorization profile                                  |
| `hasIncidentResponsePlan` | cybersecurity | 3 sections in 3 documents  | Incident response, EUSRN, compliance matrix                                          |
| `isSimplifiedRegime`      | cybersecurity | 4 sections in 4 documents  | Scope and requirements change fundamentally                                          |

### Impact Engine

```typescript
function computeImpact(
  changedFields: Array<{
    field: string;
    source: string;
    oldValue: unknown;
    newValue: unknown;
  }>,
  existingDocuments: Set<NCADocumentType>,
): ImpactResult[];
```

Pure lookup + grouping. No AI call. ~50ms.

```typescript
interface ImpactResult {
  changedField: string;
  oldValue: unknown;
  newValue: unknown;
  affectedDocuments: AffectedDocument[];
  totalSectionsAffected: number;
  estimatedRegenerationTime: string;
}

interface AffectedDocument {
  documentType: NCADocumentType;
  documentTitle: string;
  hasExistingDocument: boolean;
  sections: AffectedSection[];
}

interface AffectedSection {
  sectionIndex: number;
  sectionTitle: string;
  impactLevel: "invalidates" | "requires_review" | "minor_update";
  reason: string;
}
```

### "What-If" Mode

User can ask "what happens if I change X to Y?" without actually changing data:

```
POST /api/generate2/impact-analysis
  Body: { changes: [{ field, source, oldValue, newValue }] }
  Response: { impacts: ImpactResult[] }
  ~50ms, no AI call
```

### Persistent Impact Alerts

When assessment data actually changes, impacts are stored for display until resolved:

```prisma
model NCAImpactAlert {
  id              String   @id @default(cuid())
  userId          String
  organizationId  String
  changedField    String
  changedSource   String
  oldValue        String?
  newValue        String?
  affectedDocuments Json
  totalSections   Int
  resolved        Boolean  @default(false)
  createdAt       DateTime @default(now())
  resolvedAt      DateTime?

  @@index([userId, organizationId, resolved])
}
```

### UI Integration Points

1. **Assessment Wizard** — Inline impact notification when user changes a value: "This change affects 10 sections in 6 documents. [Save & Regenerate Affected] [Save Only]"
2. **Document Generator** — Persistent banner when unresolved impacts exist: "2 data changes since last generation — [View Impact] [Regenerate All Affected]"

### Files to Create

- `src/lib/generate/impact-dependencies.ts` — Full dependency map
- `src/lib/generate/impact-analysis.ts` — `computeImpact()` engine
- `src/components/generate2/ImpactNotification.tsx` — Impact display component
- `src/app/api/generate2/impact-analysis/route.ts`

### Files to Modify

- `src/components/generate2/Generate2Page.tsx` — Load and display pending impact alerts
- Assessment save handlers (debris, cybersecurity) — Trigger impact computation after save
- `prisma/schema.prisma` — Add `NCAImpactAlert` model

---

## Feature 6: Smart Section Order

### Purpose

When generating a full package, determine the optimal document order so later documents can reference specific findings from earlier documents — not generic "See Document A2" but "See Document A2, Section 7, Table 7.1: 25-year compliance confirmed with 18.3-year predicted decay."

### Document Dependencies

New file: `src/lib/generate/document-order.ts`

Key dependency chains:

```
Debris Chain:
  A2 Orbital Lifetime → A4 EOL Disposal → A5 Passivation
  A2 → A6 Re-Entry Risk
  A2, A3, A4, A5 → A1 DMP (master)
  A1 → A7 Supply Chain

Cybersecurity Chain:
  B1 Policy → B2 Risk Assessment → B3 Incident Response → B4 BCP
  B1 → B5 Access Control
  B2 → B6 Supply Chain Security
  B3 → B7 EUSRN Procedures
  B1, B2 → B8 Compliance Matrix

Cross-Cutting:
  A1, B1, C2, C3 → C1 Authorization Application
  A2 → C3 Insurance Compliance
```

### Topological Sort

```typescript
function computeOptimalOrder(
  documentsToGenerate: NCADocumentType[],
): NCADocumentType[];
```

Kahn's algorithm with priority-based tiebreaking (P0 before P1 before P2).

### Resulting Order (Full Package)

| Phase             | Documents              | Rationale           |
| ----------------- | ---------------------- | ------------------- |
| 1 — Foundations   | A2, A3, A8, B1, C2     | No dependencies     |
| 2 — Core          | A4, A5, A6, B2, C3     | Depend on Phase 1   |
| 3 — Dependent     | A1, B3, B4, B5, B6, B7 | Depend on Phase 1+2 |
| 4 — Consolidation | A7, B8, C1             | Depend on masters   |

### Cross-Reference Data Flow

After each document generation, key findings are extracted and made available to subsequent documents:

```typescript
interface DocumentOutput {
  documentType: NCADocumentType;
  keyFindings: KeyFinding[];
}

interface KeyFinding {
  sectionIndex: number;
  sectionTitle: string;
  findingType:
    | "compliance_determination"
    | "quantitative_result"
    | "strategy_decision"
    | "gap_identified";
  summary: string;
  referenceable: string;
}
```

Key findings are injected into prompts for later documents:

```
CROSS-REFERENCE DATA (from previously generated documents):

Document A2, Section 7: "25-year compliance confirmed with predicted orbital
decay of 18.3 years. Reference: Document A2, Section 7, Table 7.1"

Use these SPECIFIC findings when cross-referencing. Do NOT use generic
references — cite the specific section, table, and finding.
```

### Integration

Minimal change to `Generate2Page.tsx`:

```typescript
// Replace:
const typesToGenerate = (documentTypes || ALL_NCA_DOC_TYPES).filter(
  (t) => !completedDocs.has(t),
);

// With:
const typesToGenerate = computeOptimalOrder(
  (documentTypes || ALL_NCA_DOC_TYPES).filter((t) => !completedDocs.has(t)),
);
```

Package generation loop: after each document completes, extract key findings and accumulate in `packageContext` array passed to subsequent documents.

### Files to Create

- `src/lib/generate/document-order.ts` — Dependencies + `computeOptimalOrder()`
- `src/lib/generate/key-findings.ts` — `extractKeyFindings()` from generated content

### Files to Modify

- `src/components/generate2/Generate2Page.tsx` — Use `computeOptimalOrder()` in `handleGeneratePackage()`, accumulate and pass `packageContext`
- `src/lib/generate/reasoning-prompt.ts` — Accept and inject cross-reference data from previous documents

---

## Summary: New Files

| File                                                              | Feature | Purpose                                       |
| ----------------------------------------------------------------- | ------- | --------------------------------------------- |
| `src/lib/generate/reasoning-plan.ts`                              | 1       | Reasoning Plan computation engine             |
| `src/lib/generate/section-data-map.ts`                            | 1       | Section-to-data field mapping                 |
| `src/lib/generate/reasoning-prompt.ts`                            | 1,3,6   | Plan-aware and NCA-aware prompt building      |
| `src/data/nca-profiles.ts`                                        | 3       | 5 NCA profile definitions                     |
| `src/lib/generate/nca-targeting.ts`                               | 3       | Plan modification based on NCA profile        |
| `src/lib/generate/consistency-check.ts`                           | 4       | Deterministic + AI consistency validation     |
| `src/lib/generate/auto-fix.ts`                                    | 4       | Auto-fix application for consistency findings |
| `src/lib/generate/impact-dependencies.ts`                         | 5       | Full data-to-section dependency map           |
| `src/lib/generate/impact-analysis.ts`                             | 5       | Impact computation engine                     |
| `src/lib/generate/document-order.ts`                              | 6       | Document dependencies + topological sort      |
| `src/lib/generate/key-findings.ts`                                | 6       | Key finding extraction from generated docs    |
| `src/components/generate2/ReasoningPreview.tsx`                   | 2       | Main planning preview component               |
| `src/components/generate2/SectionPlanCard.tsx`                    | 2       | Individual section plan card                  |
| `src/components/generate2/PlanWarningInline.tsx`                  | 2       | Actionable warning with inline input          |
| `src/components/generate2/CrossReferenceList.tsx`                 | 2       | Cross-reference display                       |
| `src/components/generate2/ConsistencyReport.tsx`                  | 4       | Findings banner in completed state            |
| `src/components/generate2/ConsistencyFindingCard.tsx`             | 4       | Individual finding display                    |
| `src/components/generate2/ImpactNotification.tsx`                 | 5       | Impact alert display                          |
| `src/app/api/generate2/reasoning-plan/route.ts`                   | 1,2     | Reasoning plan CRUD                           |
| `src/app/api/generate2/documents/[id]/consistency-check/route.ts` | 4       | Trigger consistency check                     |
| `src/app/api/generate2/documents/[id]/auto-fix/route.ts`          | 4       | Apply auto-fixes                              |
| `src/app/api/generate2/package/[id]/consistency-check/route.ts`   | 4       | Cross-document check                          |
| `src/app/api/generate2/impact-analysis/route.ts`                  | 5       | Impact computation + what-if                  |

## Summary: Modified Files

| File                                                    | Features | Changes                                                                                              |
| ------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------- |
| `prisma/schema.prisma`                                  | 1,4,5    | Add `NCAReasoningPlan`, `NCAConsistencyCheck`, `NCAImpactAlert` models; optional FK on `NCADocument` |
| `src/lib/generate/index.ts`                             | 1        | Accept optional `reasoningPlanId` in `initGeneration()`                                              |
| `src/lib/generate/prompt-builder.ts`                    | 1        | Export `buildSectionPromptWithPlan()`                                                                |
| `src/app/api/generate2/documents/route.ts`              | 1        | Accept `reasoningPlanId` in POST body                                                                |
| `src/app/api/generate2/documents/[id]/section/route.ts` | 1        | Load plan, pass to prompt builder                                                                    |
| `src/components/generate2/Generate2Page.tsx`            | 2,4,5,6  | New `"planning"` state, NCA selection, consistency trigger, impact alerts, smart order               |
| `src/components/generate2/DocumentPreviewPanel.tsx`     | 2,3      | Render planning state, NCA dropdown                                                                  |

## Summary: DB Migrations

3 new models, 1 optional field addition:

```
NCAReasoningPlan     — stores pre-generation plans
NCAConsistencyCheck  — stores validation results
NCAImpactAlert       — stores pending data change impacts
NCADocument.reasoningPlanId — optional FK to plan
```
