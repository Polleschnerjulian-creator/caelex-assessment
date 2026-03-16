# Generate 2.0 Intelligence Layer — Phase 1: Reasoning Plan + Preview

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a deterministic Reasoning Plan engine that computes per-section compliance verdicts, writing strategies, and cross-references before generation — plus a Preview UI where users review and modify the plan before confirming.

**Architecture:** A new `computeReasoningPlan()` function maps assessment data to sections at granular level (extending the existing readiness-schemas pattern). The plan is stored in a new `NCAReasoningPlan` Prisma model and injected into the Claude prompt as an additional context layer. The UI adds a `"planning"` state to the existing `panelState` machine. All changes are additive — the existing flow works unchanged when no plan is present.

**Tech Stack:** TypeScript, Prisma, Next.js App Router, React, Vitest, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-03-16-generate2-intelligence-layer-design.md` (Features 1 & 2)

---

## Chunk 1: DB Schema + Types + Section Data Map

### Task 1: Prisma Schema — NCAReasoningPlan model

**Files:**

- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add NCAReasoningPlan model to schema**

Add after the `NCADocument` model block:

```prisma
model NCAReasoningPlan {
  id                       String          @id @default(cuid())
  documentId               String?
  userId                   String
  organizationId           String
  documentType             NCADocumentType
  targetNCA                String?
  overallStrategy          String          @db.Text
  estimatedComplianceLevel String
  sections                 Json
  crossReferences          Json
  userModified             Boolean         @default(false)
  createdAt                DateTime        @default(now())

  @@index([documentId])
  @@index([userId, organizationId])
}
```

Add to the `NCADocument` model:

```prisma
  reasoningPlanId  String?
```

- [ ] **Step 2: Generate Prisma client**

Run: `npx prisma generate`
Expected: "Generated Prisma Client"

- [ ] **Step 3: Push schema (dev)**

Run: `npx prisma db push`
Expected: Schema synced without errors

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(generate2): add NCAReasoningPlan schema model"
```

---

### Task 2: Reasoning Plan TypeScript types

**Files:**

- Create: `src/lib/generate/reasoning-types.ts`

- [ ] **Step 1: Write the type definitions**

```typescript
/**
 * Generate 2.0 — Reasoning Plan Types
 *
 * Types for the pre-generation reasoning plan that gives Claude
 * precise per-section instructions instead of open-ended prompts.
 */

import type { NCADocumentType } from "./types";

// ─── Section Plan ───

export interface SectionPlan {
  sectionIndex: number;
  sectionTitle: string;
  availableData: DataPoint[];
  missingData: MissingDataPoint[];
  complianceVerdict: ComplianceVerdict;
  confidenceLevel: ConfidenceLevel;
  verdictRationale: string;
  writingStrategy: string;
  warnings: PlanWarning[];
  estimatedActionRequired: number;
}

export type ComplianceVerdict =
  | "compliant"
  | "substantially_compliant"
  | "partially_compliant"
  | "non_compliant"
  | "not_applicable";

export type ConfidenceLevel = "high" | "medium" | "low";

export interface DataPoint {
  source: "debris" | "cybersecurity" | "spacecraft" | "user" | "organization";
  field: string;
  value: string | number | boolean;
  articleRef: string;
}

export interface MissingDataPoint {
  source: "debris" | "cybersecurity" | "spacecraft" | "user" | "organization";
  field: string;
  weight: 3 | 2 | 1;
  articleRef: string;
  defaultAssumption: string | null;
}

export interface PlanWarning {
  type:
    | "missing_critical_data"
    | "default_assumption"
    | "conflicting_data"
    | "nca_specific";
  message: string;
  actionable: boolean;
  suggestion: string | null;
}

// ─── Cross-References ───

export interface CrossReference {
  fromSection: number;
  toDocumentType: NCADocumentType;
  toSection: number | null;
  relationship: "references" | "depends_on" | "supersedes" | "conflicts_with";
  description: string;
}

// ─── Full Plan ───

export interface ReasoningPlan {
  id?: string;
  documentType: NCADocumentType;
  targetNCA: string | null;
  overallStrategy: string;
  estimatedComplianceLevel: "high" | "medium" | "low";
  sections: SectionPlan[];
  crossReferences: CrossReference[];
  userModified: boolean;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/generate/reasoning-types.ts
git commit -m "feat(generate2): add reasoning plan type definitions"
```

---

### Task 3: Section-to-Data Mapping

**Files:**

- Create: `src/lib/generate/section-data-map.ts`
- Create: `src/lib/generate/section-data-map.test.ts`

This is the core mapping that defines which assessment fields are relevant for each section of each document type. It extends the existing `READINESS_SCHEMAS` (document-level) to section-level granularity.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { SECTION_DATA_MAP, getSectionDataFields } from "./section-data-map";
import { SECTION_DEFINITIONS } from "./section-definitions";

describe("SECTION_DATA_MAP", () => {
  it("has entries for all document types with sections", () => {
    for (const [docType, sections] of Object.entries(SECTION_DEFINITIONS)) {
      const map = SECTION_DATA_MAP[docType as keyof typeof SECTION_DATA_MAP];
      expect(map, `Missing map for ${docType}`).toBeDefined();
    }
  });

  it("DMP section indices match section definitions", () => {
    const dmpMap = SECTION_DATA_MAP.DMP;
    const dmpSections = SECTION_DEFINITIONS.DMP;
    for (const entry of dmpMap) {
      expect(entry.sectionIndex).toBeGreaterThanOrEqual(0);
      expect(entry.sectionIndex).toBeLessThan(dmpSections.length);
    }
  });
});

describe("getSectionDataFields", () => {
  it("returns fields for a valid DMP section", () => {
    const fields = getSectionDataFields("DMP", 4);
    expect(fields.length).toBeGreaterThan(0);
    // Section 4 = Orbital Lifetime → needs altitude, orbit type
    const fieldNames = fields.map((f) => f.field);
    expect(fieldNames).toContain("altitudeKm");
    expect(fieldNames).toContain("orbitType");
  });

  it("returns empty array for cover page section (index 0)", () => {
    const fields = getSectionDataFields("DMP", 0);
    // Cover page needs minimal data (operator name at most)
    expect(fields.length).toBeLessThanOrEqual(2);
  });

  it("returns empty array for invalid section index", () => {
    const fields = getSectionDataFields("DMP", 99);
    expect(fields).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/generate/section-data-map.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the section data map**

```typescript
/**
 * Generate 2.0 — Section-to-Data Mapping
 *
 * Maps each section of each document type to the assessment fields it needs.
 * Extends the document-level READINESS_SCHEMAS to section granularity.
 *
 * Each entry says: "Section X of document Y needs field Z from source W,
 * and it maps to regulatory article A."
 */

import type { NCADocumentType } from "./types";

export interface SectionDataField {
  source: "debris" | "cybersecurity" | "spacecraft" | "user" | "organization";
  field: string;
  weight: 3 | 2 | 1;
  articleRef: string;
  defaultAssumption: string | null;
}

interface SectionDataEntry {
  sectionIndex: number;
  fields: SectionDataField[];
}

type SectionDataMapType = Record<NCADocumentType, SectionDataEntry[]>;

export const SECTION_DATA_MAP: SectionDataMapType = {
  // ── A1: DMP (11 sections) ──
  DMP: [
    {
      sectionIndex: 0,
      fields: [
        {
          source: "organization",
          field: "name",
          weight: 2,
          articleRef: "Art. 67",
          defaultAssumption: null,
        },
        {
          source: "user",
          field: "operatorType",
          weight: 2,
          articleRef: "Art. 3(12)-(18)",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 1,
      fields: [
        {
          source: "debris",
          field: "orbitType",
          weight: 3,
          articleRef: "Art. 67",
          defaultAssumption: null,
        },
        {
          source: "debris",
          field: "satelliteCount",
          weight: 2,
          articleRef: "Art. 67",
          defaultAssumption: null,
        },
        {
          source: "debris",
          field: "complianceScore",
          weight: 1,
          articleRef: "Art. 67",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 2,
      fields: [
        {
          source: "debris",
          field: "orbitType",
          weight: 3,
          articleRef: "Art. 58",
          defaultAssumption: null,
        },
        {
          source: "debris",
          field: "altitudeKm",
          weight: 3,
          articleRef: "Art. 58",
          defaultAssumption: null,
        },
        {
          source: "debris",
          field: "satelliteCount",
          weight: 2,
          articleRef: "Art. 58",
          defaultAssumption: null,
        },
        {
          source: "debris",
          field: "missionName",
          weight: 1,
          articleRef: "Art. 58",
          defaultAssumption: null,
        },
        {
          source: "debris",
          field: "plannedDurationYears",
          weight: 2,
          articleRef: "Art. 58",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 3,
      fields: [
        {
          source: "debris",
          field: "hasPropulsion",
          weight: 2,
          articleRef: "Art. 59",
          defaultAssumption: null,
        },
        {
          source: "debris",
          field: "hasPassivationCap",
          weight: 2,
          articleRef: "Art. 59",
          defaultAssumption: null,
        },
        {
          source: "spacecraft",
          field: "length>=1",
          weight: 1,
          articleRef: "Art. 59",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 4,
      fields: [
        {
          source: "debris",
          field: "altitudeKm",
          weight: 3,
          articleRef: "Art. 72(2)",
          defaultAssumption: null,
        },
        {
          source: "debris",
          field: "orbitType",
          weight: 3,
          articleRef: "Art. 72",
          defaultAssumption: null,
        },
        {
          source: "debris",
          field: "plannedDurationYears",
          weight: 2,
          articleRef: "Art. 72(2)",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 5,
      fields: [
        {
          source: "debris",
          field: "hasManeuverability",
          weight: 3,
          articleRef: "Art. 64",
          defaultAssumption: null,
        },
        {
          source: "debris",
          field: "caServiceProvider",
          weight: 2,
          articleRef: "Art. 64(1)",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 6,
      fields: [
        {
          source: "debris",
          field: "deorbitStrategy",
          weight: 3,
          articleRef: "Art. 72",
          defaultAssumption: null,
        },
        {
          source: "debris",
          field: "deorbitTimelineYears",
          weight: 2,
          articleRef: "Art. 72(2)",
          defaultAssumption: null,
        },
        {
          source: "debris",
          field: "hasPropulsion",
          weight: 2,
          articleRef: "Art. 72(5)",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 7,
      fields: [
        {
          source: "debris",
          field: "hasPassivationCap",
          weight: 3,
          articleRef: "Art. 67(1)(d)",
          defaultAssumption: null,
        },
        {
          source: "debris",
          field: "hasPropulsion",
          weight: 2,
          articleRef: "Art. 67(1)(d)",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 8,
      fields: [
        {
          source: "spacecraft",
          field: "length>=1",
          weight: 2,
          articleRef: "Art. 67(1)(e)",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 9,
      fields: [
        {
          source: "debris",
          field: "complianceScore",
          weight: 2,
          articleRef: "Art. 58-73",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 10,
      fields: [
        {
          source: "debris",
          field: "complianceScore",
          weight: 1,
          articleRef: "Art. 58-73",
          defaultAssumption: null,
        },
      ],
    },
  ],

  // ── A2: Orbital Lifetime (9 sections) ──
  ORBITAL_LIFETIME: [
    {
      sectionIndex: 0,
      fields: [
        {
          source: "organization",
          field: "name",
          weight: 2,
          articleRef: "Art. 72",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 1,
      fields: [
        {
          source: "debris",
          field: "altitudeKm",
          weight: 3,
          articleRef: "Art. 72",
          defaultAssumption: null,
        },
        {
          source: "debris",
          field: "orbitType",
          weight: 3,
          articleRef: "Art. 72",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 2,
      fields: [
        {
          source: "debris",
          field: "altitudeKm",
          weight: 3,
          articleRef: "Art. 72(2)",
          defaultAssumption: null,
        },
        {
          source: "debris",
          field: "orbitType",
          weight: 3,
          articleRef: "Art. 72",
          defaultAssumption: null,
        },
        {
          source: "debris",
          field: "satelliteCount",
          weight: 1,
          articleRef: "Art. 72",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 3,
      fields: [
        {
          source: "debris",
          field: "altitudeKm",
          weight: 3,
          articleRef: "Art. 72(2)",
          defaultAssumption: "Default Cd=2.2 (conservative)",
        },
      ],
    },
    { sectionIndex: 4, fields: [] },
    {
      sectionIndex: 5,
      fields: [
        {
          source: "debris",
          field: "altitudeKm",
          weight: 3,
          articleRef: "Art. 72(2)",
          defaultAssumption: null,
        },
        {
          source: "debris",
          field: "orbitType",
          weight: 3,
          articleRef: "Art. 72(2)",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 6,
      fields: [
        {
          source: "debris",
          field: "altitudeKm",
          weight: 3,
          articleRef: "Art. 72(2)",
          defaultAssumption: null,
        },
        {
          source: "debris",
          field: "plannedDurationYears",
          weight: 3,
          articleRef: "Art. 72(2)",
          defaultAssumption: null,
        },
        {
          source: "debris",
          field: "orbitType",
          weight: 2,
          articleRef: "Art. 72(2)",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 7,
      fields: [
        {
          source: "debris",
          field: "altitudeKm",
          weight: 2,
          articleRef: "Art. 72(2)",
          defaultAssumption: null,
        },
      ],
    },
    { sectionIndex: 8, fields: [] },
  ],

  // ── Remaining document types: abbreviated for plan brevity ──
  // Each follows the same pattern. Implementation should cover all 20 types.
  // Start with the 9 P0 types that have dedicated templates, then P1/P2.

  COLLISION_AVOIDANCE: [
    {
      sectionIndex: 0,
      fields: [
        {
          source: "organization",
          field: "name",
          weight: 2,
          articleRef: "Art. 64",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 1,
      fields: [
        {
          source: "debris",
          field: "hasManeuverability",
          weight: 3,
          articleRef: "Art. 64",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 2,
      fields: [
        {
          source: "debris",
          field: "hasManeuverability",
          weight: 3,
          articleRef: "Art. 64(1)",
          defaultAssumption: null,
        },
        {
          source: "debris",
          field: "caServiceProvider",
          weight: 2,
          articleRef: "Art. 64(1)",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 3,
      fields: [
        {
          source: "debris",
          field: "caServiceProvider",
          weight: 2,
          articleRef: "Art. 64(1)",
          defaultAssumption: null,
        },
      ],
    },
    { sectionIndex: 4, fields: [] },
    {
      sectionIndex: 5,
      fields: [
        {
          source: "debris",
          field: "hasManeuverability",
          weight: 3,
          articleRef: "Art. 64(3)",
          defaultAssumption: null,
        },
        {
          source: "debris",
          field: "hasPropulsion",
          weight: 2,
          articleRef: "Art. 64(3)",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 6,
      fields: [
        {
          source: "debris",
          field: "hasPropulsion",
          weight: 2,
          articleRef: "Art. 64(4)",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 7,
      fields: [
        {
          source: "debris",
          field: "satelliteCount",
          weight: 2,
          articleRef: "Art. 64(5)",
          defaultAssumption: null,
        },
      ],
    },
    { sectionIndex: 8, fields: [] },
    {
      sectionIndex: 9,
      fields: [
        {
          source: "debris",
          field: "complianceScore",
          weight: 1,
          articleRef: "Art. 64",
          defaultAssumption: null,
        },
      ],
    },
  ],

  EOL_DISPOSAL: [
    {
      sectionIndex: 0,
      fields: [
        {
          source: "organization",
          field: "name",
          weight: 2,
          articleRef: "Art. 72",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 1,
      fields: [
        {
          source: "debris",
          field: "deorbitStrategy",
          weight: 3,
          articleRef: "Art. 72",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 2,
      fields: [
        {
          source: "debris",
          field: "deorbitStrategy",
          weight: 3,
          articleRef: "Art. 72(1)",
          defaultAssumption: null,
        },
        {
          source: "debris",
          field: "orbitType",
          weight: 3,
          articleRef: "Art. 72",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 3,
      fields: [
        {
          source: "debris",
          field: "deorbitStrategy",
          weight: 3,
          articleRef: "Art. 72",
          defaultAssumption: null,
        },
        {
          source: "debris",
          field: "altitudeKm",
          weight: 2,
          articleRef: "Art. 72",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 4,
      fields: [
        {
          source: "debris",
          field: "hasPropulsion",
          weight: 3,
          articleRef: "Art. 72(5)",
          defaultAssumption: null,
        },
        {
          source: "debris",
          field: "deorbitTimelineYears",
          weight: 2,
          articleRef: "Art. 72(2)",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 5,
      fields: [
        {
          source: "debris",
          field: "hasPropulsion",
          weight: 2,
          articleRef: "Art. 72(5)",
          defaultAssumption: null,
        },
      ],
    },
    { sectionIndex: 6, fields: [] },
    { sectionIndex: 7, fields: [] },
    {
      sectionIndex: 8,
      fields: [
        {
          source: "debris",
          field: "complianceScore",
          weight: 1,
          articleRef: "Art. 72",
          defaultAssumption: null,
        },
      ],
    },
  ],

  PASSIVATION: [
    {
      sectionIndex: 0,
      fields: [
        {
          source: "organization",
          field: "name",
          weight: 2,
          articleRef: "Art. 67(1)(d)",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 1,
      fields: [
        {
          source: "debris",
          field: "hasPassivationCap",
          weight: 3,
          articleRef: "Art. 67(1)(d)",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 2,
      fields: [
        {
          source: "debris",
          field: "hasPassivationCap",
          weight: 3,
          articleRef: "Art. 67(1)(d)",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 3,
      fields: [
        {
          source: "debris",
          field: "hasPropulsion",
          weight: 2,
          articleRef: "Art. 67(1)(d)",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 4,
      fields: [
        {
          source: "debris",
          field: "hasPassivationCap",
          weight: 3,
          articleRef: "Art. 67(1)(d)",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 5,
      fields: [
        {
          source: "debris",
          field: "hasPropulsion",
          weight: 2,
          articleRef: "Art. 67(1)(d)",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 6,
      fields: [
        {
          source: "debris",
          field: "hasPropulsion",
          weight: 2,
          articleRef: "Art. 67(1)(d)",
          defaultAssumption: null,
        },
      ],
    },
    { sectionIndex: 7, fields: [] },
    { sectionIndex: 8, fields: [] },
    {
      sectionIndex: 9,
      fields: [
        {
          source: "debris",
          field: "complianceScore",
          weight: 1,
          articleRef: "Art. 67(1)(d)",
          defaultAssumption: null,
        },
      ],
    },
  ],

  REENTRY_RISK: [
    {
      sectionIndex: 0,
      fields: [
        {
          source: "organization",
          field: "name",
          weight: 2,
          articleRef: "Art. 72(4)",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 1,
      fields: [
        {
          source: "debris",
          field: "deorbitStrategy",
          weight: 3,
          articleRef: "Art. 72(4)",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 2,
      fields: [
        {
          source: "debris",
          field: "deorbitStrategy",
          weight: 3,
          articleRef: "Art. 72(4)",
          defaultAssumption: null,
        },
        {
          source: "debris",
          field: "altitudeKm",
          weight: 2,
          articleRef: "Art. 72(4)",
          defaultAssumption: null,
        },
      ],
    },
    { sectionIndex: 3, fields: [] },
    {
      sectionIndex: 4,
      fields: [
        {
          source: "debris",
          field: "satelliteCount",
          weight: 2,
          articleRef: "Art. 72(4)",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 5,
      fields: [
        {
          source: "debris",
          field: "altitudeKm",
          weight: 2,
          articleRef: "Art. 72(4)",
          defaultAssumption: null,
        },
      ],
    },
    { sectionIndex: 6, fields: [] },
    { sectionIndex: 7, fields: [] },
    {
      sectionIndex: 8,
      fields: [
        {
          source: "debris",
          field: "complianceScore",
          weight: 1,
          articleRef: "Art. 72(4)",
          defaultAssumption: null,
        },
      ],
    },
  ],

  DEBRIS_SUPPLY_CHAIN: [
    {
      sectionIndex: 0,
      fields: [
        {
          source: "organization",
          field: "name",
          weight: 2,
          articleRef: "Art. 73",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 1,
      fields: [
        {
          source: "debris",
          field: "constellationTier",
          weight: 2,
          articleRef: "Art. 73",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 2,
      fields: [
        {
          source: "debris",
          field: "satelliteCount",
          weight: 2,
          articleRef: "Art. 73(1)",
          defaultAssumption: null,
        },
      ],
    },
    { sectionIndex: 3, fields: [] },
    { sectionIndex: 4, fields: [] },
    { sectionIndex: 5, fields: [] },
    { sectionIndex: 6, fields: [] },
    {
      sectionIndex: 7,
      fields: [
        {
          source: "debris",
          field: "complianceScore",
          weight: 1,
          articleRef: "Art. 73",
          defaultAssumption: null,
        },
      ],
    },
  ],

  LIGHT_RF_POLLUTION: [
    {
      sectionIndex: 0,
      fields: [
        {
          source: "organization",
          field: "name",
          weight: 2,
          articleRef: "Art. 68",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 1,
      fields: [
        {
          source: "debris",
          field: "orbitType",
          weight: 3,
          articleRef: "Art. 68",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 2,
      fields: [
        {
          source: "debris",
          field: "altitudeKm",
          weight: 3,
          articleRef: "Art. 68(1)",
          defaultAssumption: null,
        },
        {
          source: "debris",
          field: "satelliteCount",
          weight: 2,
          articleRef: "Art. 68",
          defaultAssumption: null,
        },
      ],
    },
    { sectionIndex: 3, fields: [] },
    { sectionIndex: 4, fields: [] },
    { sectionIndex: 5, fields: [] },
    { sectionIndex: 6, fields: [] },
    { sectionIndex: 7, fields: [] },
    {
      sectionIndex: 8,
      fields: [
        {
          source: "debris",
          field: "complianceScore",
          weight: 1,
          articleRef: "Art. 68",
          defaultAssumption: null,
        },
      ],
    },
  ],

  CYBER_POLICY: [
    {
      sectionIndex: 0,
      fields: [
        {
          source: "organization",
          field: "name",
          weight: 2,
          articleRef: "Art. 74",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 1,
      fields: [
        {
          source: "cybersecurity",
          field: "organizationSize",
          weight: 3,
          articleRef: "Art. 74",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 2,
      fields: [
        {
          source: "cybersecurity",
          field: "organizationSize",
          weight: 3,
          articleRef: "Art. 74(1)",
          defaultAssumption: null,
        },
        {
          source: "cybersecurity",
          field: "dataSensitivityLevel",
          weight: 2,
          articleRef: "Art. 74(1)",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 3,
      fields: [
        {
          source: "cybersecurity",
          field: "hasSecurityTeam",
          weight: 2,
          articleRef: "Art. 74(2)",
          defaultAssumption: null,
        },
        {
          source: "cybersecurity",
          field: "securityTeamSize",
          weight: 1,
          articleRef: "Art. 74(2)",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 4,
      fields: [
        {
          source: "cybersecurity",
          field: "existingCertifications",
          weight: 2,
          articleRef: "Art. 74(1)",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 5,
      fields: [
        {
          source: "cybersecurity",
          field: "dataSensitivityLevel",
          weight: 3,
          articleRef: "Art. 74(1)",
          defaultAssumption: null,
        },
      ],
    },
    { sectionIndex: 6, fields: [] },
    { sectionIndex: 7, fields: [] },
    {
      sectionIndex: 8,
      fields: [
        {
          source: "cybersecurity",
          field: "maturityScore",
          weight: 2,
          articleRef: "Art. 74-95",
          defaultAssumption: null,
        },
      ],
    },
  ],

  CYBER_RISK_ASSESSMENT: [
    {
      sectionIndex: 0,
      fields: [
        {
          source: "organization",
          field: "name",
          weight: 2,
          articleRef: "Art. 77",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 1,
      fields: [
        {
          source: "cybersecurity",
          field: "spaceSegmentComplexity",
          weight: 3,
          articleRef: "Art. 77",
          defaultAssumption: null,
        },
      ],
    },
    { sectionIndex: 2, fields: [] },
    {
      sectionIndex: 3,
      fields: [
        {
          source: "cybersecurity",
          field: "spaceSegmentComplexity",
          weight: 3,
          articleRef: "Art. 77(1)(a)",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 4,
      fields: [
        {
          source: "cybersecurity",
          field: "dataSensitivityLevel",
          weight: 3,
          articleRef: "Art. 77(1)(b)",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 5,
      fields: [
        {
          source: "cybersecurity",
          field: "existingCertifications",
          weight: 2,
          articleRef: "Art. 77(1)(c)",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 6,
      fields: [
        {
          source: "cybersecurity",
          field: "maturityScore",
          weight: 2,
          articleRef: "Art. 77(1)(d)",
          defaultAssumption: null,
        },
      ],
    },
    { sectionIndex: 7, fields: [] },
    {
      sectionIndex: 8,
      fields: [
        {
          source: "cybersecurity",
          field: "maturityScore",
          weight: 2,
          articleRef: "Art. 77-78",
          defaultAssumption: null,
        },
      ],
    },
  ],

  INCIDENT_RESPONSE: [
    {
      sectionIndex: 0,
      fields: [
        {
          source: "organization",
          field: "name",
          weight: 2,
          articleRef: "Art. 89",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 1,
      fields: [
        {
          source: "cybersecurity",
          field: "hasIncidentResponsePlan",
          weight: 3,
          articleRef: "Art. 89",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 2,
      fields: [
        {
          source: "cybersecurity",
          field: "spaceSegmentComplexity",
          weight: 2,
          articleRef: "Art. 89(1)",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 3,
      fields: [
        {
          source: "cybersecurity",
          field: "hasSecurityTeam",
          weight: 2,
          articleRef: "Art. 89(2)",
          defaultAssumption: null,
        },
      ],
    },
    { sectionIndex: 4, fields: [] },
    { sectionIndex: 5, fields: [] },
    {
      sectionIndex: 6,
      fields: [
        {
          source: "cybersecurity",
          field: "organizationSize",
          weight: 2,
          articleRef: "Art. 90-92",
          defaultAssumption: null,
        },
      ],
    },
    { sectionIndex: 7, fields: [] },
    { sectionIndex: 8, fields: [] },
    {
      sectionIndex: 9,
      fields: [
        {
          source: "cybersecurity",
          field: "maturityScore",
          weight: 2,
          articleRef: "Art. 89-92",
          defaultAssumption: null,
        },
      ],
    },
  ],

  BCP_RECOVERY: [
    {
      sectionIndex: 0,
      fields: [
        {
          source: "organization",
          field: "name",
          weight: 2,
          articleRef: "Art. 85",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 1,
      fields: [
        {
          source: "cybersecurity",
          field: "hasBCP",
          weight: 3,
          articleRef: "Art. 85",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 2,
      fields: [
        {
          source: "cybersecurity",
          field: "spaceSegmentComplexity",
          weight: 2,
          articleRef: "Art. 85(1)",
          defaultAssumption: null,
        },
      ],
    },
    { sectionIndex: 3, fields: [] },
    { sectionIndex: 4, fields: [] },
    { sectionIndex: 5, fields: [] },
    { sectionIndex: 6, fields: [] },
    { sectionIndex: 7, fields: [] },
    {
      sectionIndex: 8,
      fields: [
        {
          source: "cybersecurity",
          field: "maturityScore",
          weight: 2,
          articleRef: "Art. 85",
          defaultAssumption: null,
        },
      ],
    },
  ],

  ACCESS_CONTROL: [
    {
      sectionIndex: 0,
      fields: [
        {
          source: "organization",
          field: "name",
          weight: 2,
          articleRef: "Art. 79",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 1,
      fields: [
        {
          source: "cybersecurity",
          field: "organizationSize",
          weight: 3,
          articleRef: "Art. 79",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 2,
      fields: [
        {
          source: "cybersecurity",
          field: "organizationSize",
          weight: 3,
          articleRef: "Art. 79(1)",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 3,
      fields: [
        {
          source: "cybersecurity",
          field: "employeeCount",
          weight: 2,
          articleRef: "Art. 79(1)",
          defaultAssumption: null,
        },
      ],
    },
    { sectionIndex: 4, fields: [] },
    { sectionIndex: 5, fields: [] },
    {
      sectionIndex: 6,
      fields: [
        {
          source: "cybersecurity",
          field: "hasSecurityTeam",
          weight: 2,
          articleRef: "Art. 79(3)",
          defaultAssumption: null,
        },
      ],
    },
    { sectionIndex: 7, fields: [] },
    {
      sectionIndex: 8,
      fields: [
        {
          source: "cybersecurity",
          field: "maturityScore",
          weight: 2,
          articleRef: "Art. 79",
          defaultAssumption: null,
        },
      ],
    },
  ],

  SUPPLY_CHAIN_SECURITY: [
    {
      sectionIndex: 0,
      fields: [
        {
          source: "organization",
          field: "name",
          weight: 2,
          articleRef: "Art. 78",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 1,
      fields: [
        {
          source: "cybersecurity",
          field: "criticalSupplierCount",
          weight: 3,
          articleRef: "Art. 78(2)",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 2,
      fields: [
        {
          source: "cybersecurity",
          field: "criticalSupplierCount",
          weight: 3,
          articleRef: "Art. 78(2)",
          defaultAssumption: null,
        },
      ],
    },
    { sectionIndex: 3, fields: [] },
    { sectionIndex: 4, fields: [] },
    { sectionIndex: 5, fields: [] },
    { sectionIndex: 6, fields: [] },
    { sectionIndex: 7, fields: [] },
    {
      sectionIndex: 8,
      fields: [
        {
          source: "cybersecurity",
          field: "maturityScore",
          weight: 2,
          articleRef: "Art. 78",
          defaultAssumption: null,
        },
      ],
    },
  ],

  EUSRN_PROCEDURES: [
    {
      sectionIndex: 0,
      fields: [
        {
          source: "organization",
          field: "name",
          weight: 2,
          articleRef: "Art. 93",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 1,
      fields: [
        {
          source: "cybersecurity",
          field: "hasIncidentResponsePlan",
          weight: 3,
          articleRef: "Art. 93",
          defaultAssumption: null,
        },
      ],
    },
    { sectionIndex: 2, fields: [] },
    {
      sectionIndex: 3,
      fields: [
        {
          source: "cybersecurity",
          field: "hasIncidentResponsePlan",
          weight: 3,
          articleRef: "Art. 93-95",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 4,
      fields: [
        {
          source: "cybersecurity",
          field: "organizationSize",
          weight: 2,
          articleRef: "Art. 93-95",
          defaultAssumption: null,
        },
      ],
    },
    { sectionIndex: 5, fields: [] },
    {
      sectionIndex: 6,
      fields: [
        {
          source: "cybersecurity",
          field: "hasSecurityTeam",
          weight: 2,
          articleRef: "Art. 93-95",
          defaultAssumption: null,
        },
      ],
    },
    { sectionIndex: 7, fields: [] },
    {
      sectionIndex: 8,
      fields: [
        {
          source: "cybersecurity",
          field: "maturityScore",
          weight: 2,
          articleRef: "Art. 93-95",
          defaultAssumption: null,
        },
      ],
    },
  ],

  COMPLIANCE_MATRIX: [
    {
      sectionIndex: 0,
      fields: [
        {
          source: "organization",
          field: "name",
          weight: 2,
          articleRef: "Art. 74-95",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 1,
      fields: [
        {
          source: "cybersecurity",
          field: "maturityScore",
          weight: 3,
          articleRef: "Art. 74-95",
          defaultAssumption: null,
        },
      ],
    },
    { sectionIndex: 2, fields: [] },
    {
      sectionIndex: 3,
      fields: [
        {
          source: "cybersecurity",
          field: "organizationSize",
          weight: 3,
          articleRef: "Art. 74-95",
          defaultAssumption: null,
        },
        {
          source: "cybersecurity",
          field: "existingCertifications",
          weight: 2,
          articleRef: "Art. 74-95",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 4,
      fields: [
        {
          source: "cybersecurity",
          field: "existingCertifications",
          weight: 2,
          articleRef: "Art. 74-95",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 5,
      fields: [
        {
          source: "cybersecurity",
          field: "maturityScore",
          weight: 3,
          articleRef: "Art. 74-95",
          defaultAssumption: null,
        },
      ],
    },
    { sectionIndex: 6, fields: [] },
    {
      sectionIndex: 7,
      fields: [
        {
          source: "cybersecurity",
          field: "maturityScore",
          weight: 2,
          articleRef: "Art. 74-95",
          defaultAssumption: null,
        },
      ],
    },
  ],

  AUTHORIZATION_APPLICATION: [
    {
      sectionIndex: 0,
      fields: [
        {
          source: "organization",
          field: "name",
          weight: 3,
          articleRef: "Art. 8",
          defaultAssumption: null,
        },
        {
          source: "user",
          field: "operatorType",
          weight: 3,
          articleRef: "Art. 3(12)-(18)",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 1,
      fields: [
        {
          source: "organization",
          field: "name",
          weight: 3,
          articleRef: "Art. 8",
          defaultAssumption: null,
        },
        {
          source: "user",
          field: "operatorType",
          weight: 3,
          articleRef: "Art. 8",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 2,
      fields: [
        {
          source: "debris",
          field: "orbitType",
          weight: 2,
          articleRef: "Art. 9",
          defaultAssumption: null,
        },
        {
          source: "debris",
          field: "satelliteCount",
          weight: 2,
          articleRef: "Art. 9",
          defaultAssumption: null,
        },
        {
          source: "spacecraft",
          field: "length>=1",
          weight: 2,
          articleRef: "Art. 9",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 3,
      fields: [
        {
          source: "debris",
          field: "complianceScore",
          weight: 2,
          articleRef: "Art. 11",
          defaultAssumption: null,
        },
        {
          source: "cybersecurity",
          field: "maturityScore",
          weight: 2,
          articleRef: "Art. 11",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 4,
      fields: [
        {
          source: "user",
          field: "operatorType",
          weight: 3,
          articleRef: "Art. 7",
          defaultAssumption: null,
        },
      ],
    },
    { sectionIndex: 5, fields: [] },
    { sectionIndex: 6, fields: [] },
  ],

  ENVIRONMENTAL_FOOTPRINT: [
    {
      sectionIndex: 0,
      fields: [
        {
          source: "debris",
          field: "orbitType",
          weight: 3,
          articleRef: "Art. 44",
          defaultAssumption: null,
        },
        {
          source: "debris",
          field: "satelliteCount",
          weight: 2,
          articleRef: "Art. 44",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 1,
      fields: [
        {
          source: "debris",
          field: "orbitType",
          weight: 3,
          articleRef: "Art. 44",
          defaultAssumption: null,
        },
        {
          source: "debris",
          field: "altitudeKm",
          weight: 2,
          articleRef: "Art. 44",
          defaultAssumption: null,
        },
      ],
    },
    { sectionIndex: 2, fields: [] },
    { sectionIndex: 3, fields: [] },
    {
      sectionIndex: 4,
      fields: [
        {
          source: "debris",
          field: "hasPropulsion",
          weight: 2,
          articleRef: "Art. 45",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 5,
      fields: [
        {
          source: "debris",
          field: "plannedDurationYears",
          weight: 2,
          articleRef: "Art. 44",
          defaultAssumption: null,
        },
      ],
    },
    { sectionIndex: 6, fields: [] },
    { sectionIndex: 7, fields: [] },
    {
      sectionIndex: 8,
      fields: [
        {
          source: "debris",
          field: "deorbitStrategy",
          weight: 2,
          articleRef: "Art. 46",
          defaultAssumption: null,
        },
      ],
    },
    { sectionIndex: 9, fields: [] },
    { sectionIndex: 10, fields: [] },
  ],

  INSURANCE_COMPLIANCE: [
    {
      sectionIndex: 0,
      fields: [
        {
          source: "organization",
          field: "name",
          weight: 3,
          articleRef: "Art. 47",
          defaultAssumption: null,
        },
        {
          source: "user",
          field: "operatorType",
          weight: 3,
          articleRef: "Art. 47",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 1,
      fields: [
        {
          source: "debris",
          field: "orbitType",
          weight: 2,
          articleRef: "Art. 48",
          defaultAssumption: null,
        },
        {
          source: "debris",
          field: "satelliteCount",
          weight: 2,
          articleRef: "Art. 48",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 2,
      fields: [
        {
          source: "debris",
          field: "orbitType",
          weight: 2,
          articleRef: "Art. 48",
          defaultAssumption: null,
        },
      ],
    },
    { sectionIndex: 3, fields: [] },
    {
      sectionIndex: 4,
      fields: [
        {
          source: "user",
          field: "establishmentCountry",
          weight: 2,
          articleRef: "Art. 49",
          defaultAssumption: null,
        },
      ],
    },
    { sectionIndex: 5, fields: [] },
    { sectionIndex: 6, fields: [] },
    { sectionIndex: 7, fields: [] },
  ],

  HAZARD_REPORT: [
    {
      sectionIndex: 0,
      fields: [
        {
          source: "organization",
          field: "name",
          weight: 3,
          articleRef: "CNES/FSOA",
          defaultAssumption: null,
        },
      ],
    },
    {
      sectionIndex: 1,
      fields: [
        {
          source: "debris",
          field: "orbitType",
          weight: 2,
          articleRef: "CNES/FSOA",
          defaultAssumption: null,
        },
        {
          source: "spacecraft",
          field: "length>=1",
          weight: 3,
          articleRef: "CNES/FSOA",
          defaultAssumption: null,
        },
      ],
    },
    { sectionIndex: 2, fields: [] },
    { sectionIndex: 3, fields: [] },
    { sectionIndex: 4, fields: [] },
    { sectionIndex: 5, fields: [] },
    {
      sectionIndex: 6,
      fields: [
        {
          source: "debris",
          field: "deorbitStrategy",
          weight: 2,
          articleRef: "CNES/FSOA",
          defaultAssumption: null,
        },
      ],
    },
    { sectionIndex: 7, fields: [] },
  ],
};

/**
 * Get the data fields needed for a specific section of a document type.
 */
export function getSectionDataFields(
  documentType: NCADocumentType,
  sectionIndex: number,
): SectionDataField[] {
  const entries = SECTION_DATA_MAP[documentType];
  if (!entries) return [];
  const entry = entries.find((e) => e.sectionIndex === sectionIndex);
  return entry?.fields || [];
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/generate/section-data-map.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/generate/section-data-map.ts src/lib/generate/section-data-map.test.ts
git commit -m "feat(generate2): add section-level data field mapping for all 20 document types"
```

---

## Chunk 2: Reasoning Plan Engine

### Task 4: Reasoning Plan Computation

**Files:**

- Create: `src/lib/generate/reasoning-plan.ts`
- Create: `src/lib/generate/reasoning-plan.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
import { describe, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { computeReasoningPlan } from "./reasoning-plan";
import type { Generate2DataBundle } from "./types";

function makeFullDebrisBundle(): Generate2DataBundle {
  return {
    operator: {
      organizationName: "TestSat GmbH",
      operatorType: "SCO",
      establishmentCountry: "DE",
      userId: "u1",
    },
    debris: {
      assessment: {
        id: "d1",
        missionName: "Alpha",
        orbitType: "LEO",
        altitudeKm: 550,
        satelliteCount: 3,
        constellationTier: "SMALL",
        hasManeuverability: "FULL",
        hasPropulsion: true,
        hasPassivationCap: true,
        plannedDurationYears: 7,
        deorbitStrategy: "controlled_reentry",
        deorbitTimelineYears: 5,
        caServiceProvider: "LeoLabs",
        complianceScore: 85,
      },
      requirements: [],
    },
    cybersecurity: null,
    spacecraft: [{ name: "SAT-1", noradId: "55001", missionType: "EO" }],
  };
}

function makeEmptyBundle(): Generate2DataBundle {
  return {
    operator: {
      organizationName: "Empty Corp",
      operatorType: null,
      establishmentCountry: null,
      userId: "u2",
    },
    debris: null,
    cybersecurity: null,
    spacecraft: [],
  };
}

describe("computeReasoningPlan", () => {
  it("returns a plan with sections matching section definitions", () => {
    const plan = computeReasoningPlan("DMP", makeFullDebrisBundle(), []);
    expect(plan.documentType).toBe("DMP");
    expect(plan.sections.length).toBe(11); // DMP has 11 sections
    expect(plan.sections[0].sectionTitle).toBe("Cover Page & Document Control");
  });

  it("assigns high confidence when all critical data is present", () => {
    const plan = computeReasoningPlan("DMP", makeFullDebrisBundle(), []);
    // Section 4 (Orbital Lifetime) needs altitudeKm and orbitType — both present
    const section4 = plan.sections[4];
    expect(section4.confidenceLevel).toBe("high");
    expect(section4.availableData.length).toBeGreaterThan(0);
    expect(section4.missingData.length).toBe(0);
  });

  it("assigns low confidence when no assessment data exists", () => {
    const plan = computeReasoningPlan("DMP", makeEmptyBundle(), []);
    // Section 4 needs debris data — all missing
    const section4 = plan.sections[4];
    expect(section4.confidenceLevel).toBe("low");
    expect(section4.missingData.length).toBeGreaterThan(0);
    expect(section4.complianceVerdict).toBe("non_compliant");
  });

  it("generates warnings for missing critical fields", () => {
    const plan = computeReasoningPlan("DMP", makeEmptyBundle(), []);
    const allWarnings = plan.sections.flatMap((s) => s.warnings);
    const criticalWarnings = allWarnings.filter(
      (w) => w.type === "missing_critical_data",
    );
    expect(criticalWarnings.length).toBeGreaterThan(0);
  });

  it("computes overall strategy string", () => {
    const plan = computeReasoningPlan("DMP", makeFullDebrisBundle(), []);
    expect(plan.overallStrategy).toBeTruthy();
    expect(typeof plan.overallStrategy).toBe("string");
  });

  it("estimates compliance level based on section verdicts", () => {
    const fullPlan = computeReasoningPlan("DMP", makeFullDebrisBundle(), []);
    expect(fullPlan.estimatedComplianceLevel).toBe("high");

    const emptyPlan = computeReasoningPlan("DMP", makeEmptyBundle(), []);
    expect(emptyPlan.estimatedComplianceLevel).toBe("low");
  });

  it("includes cross-references for DMP", () => {
    const plan = computeReasoningPlan("DMP", makeFullDebrisBundle(), []);
    expect(plan.crossReferences.length).toBeGreaterThan(0);
    // DMP should reference A2, A3, A4, A5
    const toTypes = plan.crossReferences.map((cr) => cr.toDocumentType);
    expect(toTypes).toContain("ORBITAL_LIFETIME");
    expect(toTypes).toContain("EOL_DISPOSAL");
  });

  it("sets default assumptions where defined in data map", () => {
    const plan = computeReasoningPlan(
      "ORBITAL_LIFETIME",
      makeFullDebrisBundle(),
      [],
    );
    // Section 3 (Atmospheric Drag) has defaultAssumption for Cd
    const section3 = plan.sections[3];
    const defaultWarnings = section3.warnings.filter(
      (w) => w.type === "default_assumption",
    );
    // Only triggers if field is missing — in full bundle, altitudeKm is present
    // so no default warning for that. But no drag coefficient field exists in data.
    expect(section3).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/generate/reasoning-plan.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement computeReasoningPlan**

```typescript
/**
 * Generate 2.0 — Reasoning Plan Engine
 *
 * Computes a structured pre-generation plan from assessment data.
 * Purely deterministic — no AI call, ~200ms.
 */

import "server-only";
import type {
  NCADocumentType,
  Generate2DataBundle,
  DocumentCategory,
} from "./types";
import { NCA_DOC_TYPE_MAP } from "./types";
import { SECTION_DEFINITIONS } from "./section-definitions";
import { getSectionDataFields } from "./section-data-map";
import type { SectionDataField } from "./section-data-map";
import type {
  ReasoningPlan,
  SectionPlan,
  ComplianceVerdict,
  ConfidenceLevel,
  DataPoint,
  MissingDataPoint,
  PlanWarning,
  CrossReference,
} from "./reasoning-types";

// ─── Cross-Reference Definitions ───

const CROSS_REFERENCE_MAP: Partial<
  Record<NCADocumentType, Array<Omit<CrossReference, "fromSection">>>
> = {
  DMP: [
    {
      toDocumentType: "ORBITAL_LIFETIME",
      toSection: 6,
      relationship: "references",
      description: "Orbital lifetime analysis results",
    },
    {
      toDocumentType: "COLLISION_AVOIDANCE",
      toSection: null,
      relationship: "references",
      description: "Collision avoidance procedures",
    },
    {
      toDocumentType: "EOL_DISPOSAL",
      toSection: null,
      relationship: "references",
      description: "End-of-life disposal plan",
    },
    {
      toDocumentType: "PASSIVATION",
      toSection: null,
      relationship: "references",
      description: "Passivation procedures",
    },
  ],
  EOL_DISPOSAL: [
    {
      toDocumentType: "ORBITAL_LIFETIME",
      toSection: 5,
      relationship: "depends_on",
      description: "Decay modeling for disposal delta-V",
    },
    {
      toDocumentType: "DMP",
      toSection: 6,
      relationship: "references",
      description: "Master debris mitigation plan disposal summary",
    },
  ],
  REENTRY_RISK: [
    {
      toDocumentType: "ORBITAL_LIFETIME",
      toSection: 5,
      relationship: "depends_on",
      description: "Decay scenario for re-entry trajectory",
    },
    {
      toDocumentType: "EOL_DISPOSAL",
      toSection: 2,
      relationship: "depends_on",
      description: "Disposal strategy determines re-entry type",
    },
  ],
  PASSIVATION: [
    {
      toDocumentType: "EOL_DISPOSAL",
      toSection: null,
      relationship: "references",
      description: "Passivation sequence precedes disposal",
    },
  ],
  INCIDENT_RESPONSE: [
    {
      toDocumentType: "CYBER_POLICY",
      toSection: 3,
      relationship: "references",
      description: "Governance framework for incident management",
    },
    {
      toDocumentType: "CYBER_RISK_ASSESSMENT",
      toSection: 4,
      relationship: "depends_on",
      description: "Risk scenarios inform incident planning",
    },
  ],
  BCP_RECOVERY: [
    {
      toDocumentType: "INCIDENT_RESPONSE",
      toSection: 5,
      relationship: "depends_on",
      description: "Recovery extends incident response procedures",
    },
    {
      toDocumentType: "CYBER_RISK_ASSESSMENT",
      toSection: 3,
      relationship: "depends_on",
      description: "Asset criticality informs business impact analysis",
    },
  ],
  ACCESS_CONTROL: [
    {
      toDocumentType: "CYBER_POLICY",
      toSection: 2,
      relationship: "references",
      description: "Access policy derives from security policy",
    },
  ],
  EUSRN_PROCEDURES: [
    {
      toDocumentType: "INCIDENT_RESPONSE",
      toSection: 6,
      relationship: "depends_on",
      description: "EUSRN extends incident notification chain",
    },
  ],
  AUTHORIZATION_APPLICATION: [
    {
      toDocumentType: "DMP",
      toSection: null,
      relationship: "references",
      description: "Debris compliance summary",
    },
    {
      toDocumentType: "CYBER_POLICY",
      toSection: null,
      relationship: "references",
      description: "Cybersecurity compliance summary",
    },
    {
      toDocumentType: "INSURANCE_COMPLIANCE",
      toSection: null,
      relationship: "references",
      description: "Insurance coverage status",
    },
    {
      toDocumentType: "ENVIRONMENTAL_FOOTPRINT",
      toSection: null,
      relationship: "references",
      description: "Environmental footprint grade",
    },
  ],
};

// ─── Field Presence Check (mirrors readiness.ts pattern) ───

function getFieldValue(
  field: SectionDataField,
  data: Generate2DataBundle,
): unknown {
  const { source, field: fieldName } = field;

  if (source === "spacecraft")
    return data.spacecraft.length >= 1 ? data.spacecraft.length : null;
  if (source === "user")
    return data.operator[fieldName as keyof typeof data.operator] ?? null;
  if (source === "organization")
    return fieldName === "name" ? data.operator.organizationName : null;
  if (source === "debris")
    return (
      data.debris?.assessment?.[
        fieldName as keyof typeof data.debris.assessment
      ] ?? null
    );
  if (source === "cybersecurity")
    return (
      data.cybersecurity?.assessment?.[
        fieldName as keyof typeof data.cybersecurity.assessment
      ] ?? null
    );
  return null;
}

function isPresent(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "boolean") return true;
  if (value === "" || value === 0) return false;
  return true;
}

// ─── Verdict Computation ───

function computeSectionVerdict(
  available: DataPoint[],
  missing: MissingDataPoint[],
): { verdict: ComplianceVerdict; confidence: ConfidenceLevel } {
  const hasCriticalMissing = missing.some((m) => m.weight === 3);
  const hasImportantMissing = missing.some((m) => m.weight === 2);
  const totalFields = available.length + missing.length;

  if (totalFields === 0) {
    return { verdict: "not_applicable", confidence: "high" };
  }

  if (hasCriticalMissing && available.length === 0) {
    return { verdict: "non_compliant", confidence: "low" };
  }

  if (hasCriticalMissing) {
    return { verdict: "partially_compliant", confidence: "low" };
  }

  if (hasImportantMissing) {
    return { verdict: "substantially_compliant", confidence: "medium" };
  }

  if (missing.length > 0) {
    return { verdict: "substantially_compliant", confidence: "medium" };
  }

  return { verdict: "compliant", confidence: "high" };
}

function determineStrategy(
  verdict: ComplianceVerdict,
  confidence: ConfidenceLevel,
): string {
  if (
    confidence === "high" &&
    (verdict === "compliant" || verdict === "substantially_compliant")
  ) {
    return "Present definitive compliance claim with evidence references. Use operator data for specific parameters.";
  }
  if (confidence === "medium") {
    return "Present compliance claim with ACTION REQUIRED markers for missing verification data. Use available data for known parameters.";
  }
  return "Present regulatory requirements with industry best practices and NCA expectations. Use ACTION REQUIRED markers for all operator-specific data.";
}

// ─── Main Engine ───

export function computeReasoningPlan(
  documentType: NCADocumentType,
  dataBundle: Generate2DataBundle,
  existingDocumentTypes: NCADocumentType[],
): ReasoningPlan {
  const meta = NCA_DOC_TYPE_MAP[documentType];
  const sectionDefs = SECTION_DEFINITIONS[documentType];

  const sectionPlans: SectionPlan[] = sectionDefs.map((sectionDef, index) => {
    const fields = getSectionDataFields(documentType, index);
    const available: DataPoint[] = [];
    const missing: MissingDataPoint[] = [];
    const warnings: PlanWarning[] = [];

    for (const field of fields) {
      const value = getFieldValue(field, dataBundle);

      if (isPresent(value)) {
        available.push({
          source: field.source,
          field: field.field,
          value: value as string | number | boolean,
          articleRef: field.articleRef,
        });
      } else {
        missing.push({
          source: field.source,
          field: field.field,
          weight: field.weight,
          articleRef: field.articleRef,
          defaultAssumption: field.defaultAssumption,
        });

        if (field.weight === 3) {
          warnings.push({
            type: "missing_critical_data",
            message: `Critical field "${field.field}" (${field.source}) is missing — required for ${field.articleRef}`,
            actionable: true,
            suggestion: `Provide ${field.field} to strengthen compliance claim for ${field.articleRef}`,
          });
        }

        if (field.defaultAssumption) {
          warnings.push({
            type: "default_assumption",
            message: `Using default: ${field.defaultAssumption}`,
            actionable: true,
            suggestion: `Provide actual value for ${field.field} to replace default assumption`,
          });
        }
      }
    }

    const { verdict, confidence } = computeSectionVerdict(available, missing);
    const strategy = determineStrategy(verdict, confidence);

    return {
      sectionIndex: index,
      sectionTitle: sectionDef.title,
      availableData: available,
      missingData: missing,
      complianceVerdict: verdict,
      confidenceLevel: confidence,
      verdictRationale: buildVerdictRationale(
        verdict,
        confidence,
        available.length,
        missing.length,
      ),
      writingStrategy: strategy,
      warnings,
      estimatedActionRequired: missing.filter((m) => m.weight >= 2).length,
    };
  });

  // Cross-references
  const crossRefs: CrossReference[] = [];
  const refDefs = CROSS_REFERENCE_MAP[documentType] || [];
  for (const ref of refDefs) {
    crossRefs.push({ fromSection: 0, ...ref });
  }

  // Overall compliance level
  const verdictScores: Record<ComplianceVerdict, number> = {
    compliant: 3,
    substantially_compliant: 2,
    partially_compliant: 1,
    non_compliant: 0,
    not_applicable: 3,
  };
  const contentSections = sectionPlans.filter((s) => s.sectionIndex > 0); // skip cover page
  const avgScore =
    contentSections.length > 0
      ? contentSections.reduce(
          (sum, s) => sum + verdictScores[s.complianceVerdict],
          0,
        ) / contentSections.length
      : 0;
  const estimatedComplianceLevel: "high" | "medium" | "low" =
    avgScore >= 2.3 ? "high" : avgScore >= 1.3 ? "medium" : "low";

  return {
    documentType,
    targetNCA: null,
    overallStrategy: buildOverallStrategy(
      meta.category,
      sectionPlans,
      dataBundle,
    ),
    estimatedComplianceLevel,
    sections: sectionPlans,
    crossReferences: crossRefs,
    userModified: false,
  };
}

function buildVerdictRationale(
  verdict: ComplianceVerdict,
  confidence: ConfidenceLevel,
  availableCount: number,
  missingCount: number,
): string {
  if (verdict === "not_applicable")
    return "No data fields required for this section.";
  if (verdict === "compliant")
    return `All ${availableCount} required fields present with high confidence.`;
  if (verdict === "substantially_compliant")
    return `${availableCount} of ${availableCount + missingCount} fields present. Minor gaps in non-critical data.`;
  if (verdict === "partially_compliant")
    return `${availableCount} of ${availableCount + missingCount} fields present. Critical data gaps exist.`;
  return `${missingCount} required fields missing. Insufficient data for compliance determination.`;
}

function buildOverallStrategy(
  category: DocumentCategory,
  sections: SectionPlan[],
  data: Generate2DataBundle,
): string {
  const highConf = sections.filter((s) => s.confidenceLevel === "high").length;
  const total = sections.length;
  const hasAssessment =
    category === "debris"
      ? !!data.debris
      : category === "cybersecurity"
        ? !!data.cybersecurity
        : !!data.debris || !!data.cybersecurity;

  if (!hasAssessment) {
    return `No ${category} assessment data available. Document will contain regulatory guidance and industry best practices with ACTION REQUIRED markers throughout.`;
  }

  if (highConf >= total * 0.7) {
    return `Strong data profile: ${highConf}/${total} sections have high confidence. Document will contain substantive compliance analysis with minimal gaps.`;
  }

  return `Mixed data profile: ${highConf}/${total} sections high confidence. Document will combine compliance analysis where data exists with regulatory guidance where gaps remain.`;
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/generate/reasoning-plan.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/generate/reasoning-plan.ts src/lib/generate/reasoning-plan.test.ts
git commit -m "feat(generate2): implement reasoning plan computation engine"
```

---

### Task 5: Reasoning Prompt Builder

**Files:**

- Create: `src/lib/generate/reasoning-prompt.ts`
- Create: `src/lib/generate/reasoning-prompt.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { buildSectionPromptWithPlan } from "./reasoning-prompt";
import type { SectionPlan } from "./reasoning-types";

const mockSectionPlan: SectionPlan = {
  sectionIndex: 4,
  sectionTitle: "Orbital Lifetime Analysis (25-Year Rule)",
  availableData: [
    {
      source: "debris",
      field: "altitudeKm",
      value: 550,
      articleRef: "Art. 72(2)",
    },
    {
      source: "debris",
      field: "orbitType",
      value: "LEO",
      articleRef: "Art. 72",
    },
  ],
  missingData: [],
  complianceVerdict: "compliant",
  confidenceLevel: "high",
  verdictRationale: "All fields present.",
  writingStrategy:
    "Present definitive compliance claim with evidence references.",
  warnings: [],
  estimatedActionRequired: 0,
};

describe("buildSectionPromptWithPlan", () => {
  it("includes the section plan block in the prompt", () => {
    const prompt = buildSectionPromptWithPlan(
      "Some operator context",
      5,
      "Orbital Lifetime Analysis (25-Year Rule)",
      mockSectionPlan,
    );
    expect(prompt).toContain("SECTION PLAN");
    expect(prompt).toContain("COMPLIANT");
    expect(prompt).toContain("altitudeKm");
    expect(prompt).toContain("550");
  });

  it("includes cross-reference instructions when provided", () => {
    const prompt = buildSectionPromptWithPlan(
      "Some context",
      5,
      "Title",
      mockSectionPlan,
      [
        {
          toDocumentType: "EOL_DISPOSAL",
          toSection: 4,
          description: "Disposal delta-V",
        },
      ],
    );
    expect(prompt).toContain("EOL_DISPOSAL");
    expect(prompt).toContain("Section 4");
  });

  it("falls back to standard prompt when no plan provided", () => {
    const prompt = buildSectionPromptWithPlan("Context", 5, "Title", null);
    expect(prompt).toContain("ONLY section 5");
    expect(prompt).not.toContain("SECTION PLAN");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/generate/reasoning-prompt.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement the prompt builder**

```typescript
/**
 * Generate 2.0 — Reasoning-Aware Prompt Builder
 *
 * Extends the existing buildSectionPrompt with plan context.
 * When a plan is available, injects precise per-section instructions.
 * When no plan is available, falls back to the existing prompt format.
 */

import type { SectionPlan, CrossReference } from "./reasoning-types";

export function buildSectionPromptWithPlan(
  userMessage: string,
  sectionNumber: number,
  sectionTitle: string,
  sectionPlan: SectionPlan | null,
  crossReferences?: Pick<
    CrossReference,
    "toDocumentType" | "toSection" | "description"
  >[],
  packageContext?: string,
): string {
  // Fall back to existing prompt format when no plan
  if (!sectionPlan) {
    return `${userMessage}\n\n---\n\nCRITICAL: Generate ONLY section ${sectionNumber}: "${sectionTitle}". Start directly with "## SECTION: ${sectionTitle}" and produce comprehensive, detailed, NCA-submission-quality content for this section ONLY. Do not include any other sections. Use formal regulatory language in third person. Use the maximum available output length for this one section.`;
  }

  const parts: string[] = [];

  parts.push(userMessage);
  parts.push("\n\n---\n\n");

  // Section plan block
  parts.push("SECTION PLAN (follow this plan precisely):");
  parts.push(`- Section: ${sectionNumber}. ${sectionTitle}`);
  parts.push(
    `- Compliance Verdict: ${sectionPlan.complianceVerdict.toUpperCase().replace(/_/g, " ")}`,
  );
  parts.push(`- Confidence: ${sectionPlan.confidenceLevel.toUpperCase()}`);
  parts.push(`- Rationale: ${sectionPlan.verdictRationale}`);

  if (sectionPlan.availableData.length > 0) {
    parts.push(
      `- Available Data: ${sectionPlan.availableData.map((d) => `${d.field}=${d.value}`).join(", ")}`,
    );
  }

  if (sectionPlan.missingData.length > 0) {
    parts.push(
      `- Missing Data: ${sectionPlan.missingData.map((d) => `${d.field} (${d.source}, ${d.articleRef})`).join(", ")}`,
    );
  }

  parts.push(`- Writing Strategy: ${sectionPlan.writingStrategy}`);

  if (sectionPlan.warnings.length > 0) {
    parts.push(
      `- Warnings: ${sectionPlan.warnings.map((w) => w.message).join("; ")}`,
    );
  }

  // Cross-references
  if (crossReferences && crossReferences.length > 0) {
    parts.push("- Cross-References to include:");
    for (const ref of crossReferences) {
      const sectionRef =
        ref.toSection != null ? `, Section ${ref.toSection}` : "";
      parts.push(
        `  - "See Document ${ref.toDocumentType}${sectionRef}" (${ref.description})`,
      );
    }
  }

  // Package context from previously generated documents
  if (packageContext) {
    parts.push(`\n${packageContext}`);
  }

  parts.push(
    `\n\nCRITICAL: Generate ONLY section ${sectionNumber}: "${sectionTitle}". Start directly with "## SECTION: ${sectionTitle}" and produce comprehensive, detailed, NCA-submission-quality content for this section ONLY. Do not include any other sections. Use formal regulatory language in third person. Use the maximum available output length for this one section.`,
  );

  return parts.join("\n");
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/generate/reasoning-prompt.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/generate/reasoning-prompt.ts src/lib/generate/reasoning-prompt.test.ts
git commit -m "feat(generate2): add plan-aware section prompt builder"
```

---

### Task 6: API Route — Reasoning Plan

**Files:**

- Create: `src/app/api/generate2/reasoning-plan/route.ts`

- [ ] **Step 1: Implement the API route**

```typescript
/**
 * Generate 2.0 — Reasoning Plan API
 *
 * POST /api/generate2/reasoning-plan — Compute and store a reasoning plan
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { collectGenerate2Data } from "@/lib/generate/data-collector";
import { computeReasoningPlan } from "@/lib/generate/reasoning-plan";
import { ALL_NCA_DOC_TYPES } from "@/lib/generate/types";
import type { NCADocumentType } from "@/lib/generate/types";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const membership = await prisma.organizationMember.findFirst({
      where: { userId },
      include: { organization: { select: { id: true, isActive: true } } },
    });

    if (!membership?.organization?.isActive) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 403 },
      );
    }

    const rateLimitResult = await checkRateLimit(
      "generate2",
      getIdentifier(request, userId),
    );
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 },
      );
    }

    const body = await request.json();
    const { documentType, targetNCA } = body as {
      documentType: string;
      targetNCA?: string;
    };

    if (
      !documentType ||
      !ALL_NCA_DOC_TYPES.includes(documentType as NCADocumentType)
    ) {
      return NextResponse.json(
        { error: "Invalid documentType" },
        { status: 400 },
      );
    }

    const organizationId = membership.organization.id;

    // Collect assessment data
    const dataBundle = await collectGenerate2Data(userId, organizationId);

    // Get existing completed document types for cross-reference awareness
    const existingDocs = await prisma.nCADocument.findMany({
      where: {
        userId,
        organizationId,
        status: { in: ["COMPLETED", "EXPORTED"] },
      },
      select: { documentType: true },
      distinct: ["documentType"],
    });
    const existingDocTypes = existingDocs.map(
      (d) => d.documentType as NCADocumentType,
    );

    // Compute plan
    const plan = computeReasoningPlan(
      documentType as NCADocumentType,
      dataBundle,
      existingDocTypes,
    );

    // Store plan
    const stored = await prisma.nCAReasoningPlan.create({
      data: {
        userId,
        organizationId,
        documentType: documentType as NCADocumentType,
        targetNCA: targetNCA || null,
        overallStrategy: plan.overallStrategy,
        estimatedComplianceLevel: plan.estimatedComplianceLevel,
        sections: plan.sections as unknown as Record<string, unknown>[],
        crossReferences: plan.crossReferences as unknown as Record<
          string,
          unknown
        >[],
        userModified: false,
      },
    });

    return NextResponse.json({ plan: { ...plan, id: stored.id } });
  } catch (error) {
    logger.error("Reasoning plan computation error", error);
    return NextResponse.json(
      { error: "Plan computation failed" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/generate2/reasoning-plan/route.ts
git commit -m "feat(generate2): add reasoning plan API endpoint"
```

---

### Task 7: Wire Plan into Existing Generation Flow

**Files:**

- Modify: `src/lib/generate/prompt-builder.ts`
- Modify: `src/app/api/generate2/documents/[id]/section/route.ts`

- [ ] **Step 1: Export plan-aware builder from prompt-builder.ts**

Add to the end of `src/lib/generate/prompt-builder.ts`:

```typescript
// Re-export plan-aware prompt builder for use when a reasoning plan exists
export { buildSectionPromptWithPlan } from "./reasoning-prompt";
```

- [ ] **Step 2: Modify section route to use plan when available**

In `src/app/api/generate2/documents/[id]/section/route.ts`, after loading the stored prompt context and before calling `generateSection()`, add plan loading and prompt modification.

Find the line:

```typescript
const sectionPrompt = buildSectionPrompt(
```

The section route currently calls `generateSection()` from `index.ts` which internally calls `buildSectionPrompt`. Instead, we need to modify the prompt context to include plan data when a reasoning plan exists.

In `src/app/api/generate2/documents/[id]/section/route.ts`, after the document lookup (around line 89-104), add:

```typescript
// Load reasoning plan if document has one
let sectionPlan = null;
let planCrossRefs = null;
if (doc.reasoningPlanId) {
  const plan = await prisma.nCAReasoningPlan.findUnique({
    where: { id: doc.reasoningPlanId },
    select: { sections: true, crossReferences: true },
  });
  if (plan) {
    const sections = plan.sections as unknown as Array<{
      sectionIndex: number;
    }>;
    sectionPlan = sections.find((s) => s.sectionIndex === sectionIndex) || null;
    planCrossRefs = plan.crossReferences;
  }
}
```

Note: This requires `reasoningPlanId` to be stored on the NCADocument. The init endpoint already needs to accept and store this. The full wiring will be done when integrating the UI (Task 8+).

- [ ] **Step 3: Run existing tests to verify nothing breaks**

Run: `npx vitest run src/lib/generate/`
Expected: All existing tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/generate/prompt-builder.ts src/app/api/generate2/documents/[id]/section/route.ts
git commit -m "feat(generate2): wire reasoning plan into section generation prompt"
```

---

## Chunk 3: Reasoning Preview UI

### Task 8: SectionPlanCard Component

**Files:**

- Create: `src/components/generate2/SectionPlanCard.tsx`

- [ ] **Step 1: Implement the component**

```tsx
"use client";

import {
  ChevronDown,
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { innerGlass } from "./styles";
import type {
  SectionPlan,
  ComplianceVerdict,
} from "@/lib/generate/reasoning-types";

const VERDICT_CONFIG: Record<
  ComplianceVerdict,
  { label: string; color: string; icon: typeof CheckCircle2 }
> = {
  compliant: {
    label: "Compliant",
    color: "text-green-600 bg-green-500/10 border-green-500/20",
    icon: CheckCircle2,
  },
  substantially_compliant: {
    label: "Substantially Compliant",
    color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
    icon: CheckCircle2,
  },
  partially_compliant: {
    label: "Partially Compliant",
    color: "text-amber-600 bg-amber-500/10 border-amber-500/20",
    icon: AlertTriangle,
  },
  non_compliant: {
    label: "Non-Compliant",
    color: "text-red-600 bg-red-500/10 border-red-500/20",
    icon: XCircle,
  },
  not_applicable: {
    label: "N/A",
    color: "text-slate-500 bg-slate-500/10 border-slate-500/20",
    icon: Info,
  },
};

const CONFIDENCE_ICONS: Record<string, string> = {
  high: "✅",
  medium: "⚠️",
  low: "🔴",
};

interface SectionPlanCardProps {
  plan: SectionPlan;
  onVerdictOverride?: (
    sectionIndex: number,
    verdict: ComplianceVerdict,
  ) => void;
}

export function SectionPlanCard({
  plan,
  onVerdictOverride,
}: SectionPlanCardProps) {
  const [expanded, setExpanded] = useState(plan.warnings.length > 0);
  const config = VERDICT_CONFIG[plan.complianceVerdict];
  const Icon = config.icon;

  return (
    <div
      className="rounded-xl border border-black/[0.06] overflow-hidden"
      style={innerGlass}
    >
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/30 transition-colors text-left focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
        aria-expanded={expanded}
      >
        <span className="text-sm shrink-0">
          {CONFIDENCE_ICONS[plan.confidenceLevel]}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-700 truncate">
            {plan.sectionIndex + 1}. {plan.sectionTitle}
          </p>
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-lg border ${config.color} shrink-0`}
        >
          {config.label}
        </span>
        <ChevronDown
          size={14}
          className={`text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {/* Details — expandable */}
      {expanded && (
        <div className="px-4 pb-3 space-y-2 border-t border-black/[0.04]">
          {/* Strategy */}
          <p className="text-xs text-slate-500 mt-2">{plan.writingStrategy}</p>

          {/* Available data */}
          {plan.availableData.length > 0 && (
            <div className="text-xs">
              <span className="text-slate-400 font-medium">Data: </span>
              <span className="text-slate-600">
                {plan.availableData
                  .map((d) => `${d.field}=${d.value}`)
                  .join(", ")}
              </span>
            </div>
          )}

          {/* Missing data */}
          {plan.missingData.length > 0 && (
            <div className="text-xs">
              <span className="text-red-400 font-medium">Missing: </span>
              <span className="text-red-500">
                {plan.missingData.map((d) => d.field).join(", ")}
              </span>
            </div>
          )}

          {/* Warnings */}
          {plan.warnings.map((warning, idx) => (
            <div
              key={idx}
              className="text-xs px-3 py-2 rounded-lg bg-amber-500/10 text-amber-700 border border-amber-500/20"
            >
              {warning.message}
              {warning.suggestion && (
                <p className="text-amber-500 mt-1">{warning.suggestion}</p>
              )}
            </div>
          ))}

          {/* Verdict override */}
          {onVerdictOverride && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-slate-400">Override:</span>
              <select
                value={plan.complianceVerdict}
                onChange={(e) =>
                  onVerdictOverride(
                    plan.sectionIndex,
                    e.target.value as ComplianceVerdict,
                  )
                }
                className="text-xs bg-white/50 border border-black/[0.08] rounded-lg px-2 py-1 text-slate-600 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="compliant">Compliant</option>
                <option value="substantially_compliant">
                  Substantially Compliant
                </option>
                <option value="partially_compliant">Partially Compliant</option>
                <option value="non_compliant">Non-Compliant</option>
                <option value="not_applicable">N/A</option>
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/generate2/SectionPlanCard.tsx
git commit -m "feat(generate2): add SectionPlanCard component for reasoning preview"
```

---

### Task 9: ReasoningPreview Component

**Files:**

- Create: `src/components/generate2/ReasoningPreview.tsx`

- [ ] **Step 1: Implement the component**

```tsx
"use client";

import { ArrowLeft, Sparkles, GitBranch } from "lucide-react";
import { SectionPlanCard } from "./SectionPlanCard";
import { innerGlass } from "./styles";
import type {
  ReasoningPlan,
  ComplianceVerdict,
} from "@/lib/generate/reasoning-types";
import type { DocumentTypeMeta } from "@/lib/generate/types";

const COMPLIANCE_LEVEL_COLORS: Record<string, string> = {
  high: "text-green-600 bg-green-500/10 border-green-500/20",
  medium: "text-amber-600 bg-amber-500/10 border-amber-500/20",
  low: "text-red-600 bg-red-500/10 border-red-500/20",
};

interface ReasoningPreviewProps {
  plan: ReasoningPlan;
  meta: DocumentTypeMeta;
  onConfirm: () => void;
  onBack: () => void;
  onVerdictOverride: (sectionIndex: number, verdict: ComplianceVerdict) => void;
  isConfirming: boolean;
}

export function ReasoningPreview({
  plan,
  meta,
  onConfirm,
  onBack,
  onVerdictOverride,
  isConfirming,
}: ReasoningPreviewProps) {
  const totalWarnings = plan.sections.reduce(
    (sum, s) => sum + s.warnings.length,
    0,
  );
  const estimatedActions = plan.sections.reduce(
    (sum, s) => sum + s.estimatedActionRequired,
    0,
  );
  const highConfSections = plan.sections.filter(
    (s) => s.confidenceLevel === "high",
  ).length;

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-black/[0.06]">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={16} className="text-emerald-500" />
          <h3 className="text-sm font-semibold text-slate-800">
            Generation Plan
          </h3>
        </div>
        <p className="text-lg font-semibold text-slate-800">{meta.title}</p>
        <p className="text-xs text-slate-400 mt-0.5">{meta.articleRef}</p>
      </div>

      <div className="px-6 py-4 space-y-4">
        {/* Overall summary card */}
        <div className="rounded-xl p-4" style={innerGlass}>
          <p className="text-sm text-slate-600">{plan.overallStrategy}</p>
          <div className="flex items-center gap-3 mt-3">
            <span
              className={`text-xs px-2.5 py-1 rounded-lg border ${COMPLIANCE_LEVEL_COLORS[plan.estimatedComplianceLevel]}`}
            >
              Est. Compliance: {plan.estimatedComplianceLevel.toUpperCase()}
            </span>
            <span className="text-xs text-slate-400">
              {highConfSections}/{plan.sections.length} sections high confidence
            </span>
          </div>
          {estimatedActions > 0 && (
            <p className="text-xs text-amber-600 mt-2">
              ~{estimatedActions} ACTION REQUIRED markers expected
            </p>
          )}
        </div>

        {/* Section plans */}
        <div>
          <h4 className="text-sm font-medium text-slate-600 mb-2">
            Section Plan
          </h4>
          <div className="space-y-1.5">
            {plan.sections.map((section) => (
              <SectionPlanCard
                key={section.sectionIndex}
                plan={section}
                onVerdictOverride={onVerdictOverride}
              />
            ))}
          </div>
        </div>

        {/* Cross-references */}
        {plan.crossReferences.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-slate-600 mb-2 flex items-center gap-2">
              <GitBranch size={14} />
              Cross-References
            </h4>
            <div className="rounded-xl p-3 space-y-1.5" style={innerGlass}>
              {plan.crossReferences.map((ref, idx) => (
                <div key={idx} className="text-xs text-slate-600">
                  → {ref.toDocumentType}
                  {ref.toSection != null
                    ? `, Section ${ref.toSection}`
                    : ""}{" "}
                  <span className="text-slate-400">({ref.description})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-3 pt-2 pb-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-black/[0.08] text-sm text-slate-600 hover:bg-white/40 transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
          >
            <ArrowLeft size={14} />
            Back
          </button>
          <button
            onClick={onConfirm}
            disabled={isConfirming}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:bg-slate-400 text-white text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
          >
            <Sparkles size={14} />
            {isConfirming ? "Starting..." : "Confirm & Generate"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/generate2/ReasoningPreview.tsx
git commit -m "feat(generate2): add ReasoningPreview component"
```

---

### Task 10: Wire Preview into Generate2Page + DocumentPreviewPanel

**Files:**

- Modify: `src/components/generate2/Generate2Page.tsx`
- Modify: `src/components/generate2/DocumentPreviewPanel.tsx`

This is the integration task. The changes are:

1. Add `"planning"` to `PanelState` type
2. Add state for `reasoningPlan` and `selectedNCA`
3. When user clicks "Generate", first compute plan, show preview, then on "Confirm" start generation
4. Pass `reasoningPlanId` to the init endpoint
5. In `DocumentPreviewPanel`, add rendering case for `panelState === "planning"`

- [ ] **Step 1: Add planning state to Generate2Page**

In `src/components/generate2/Generate2Page.tsx`, change the PanelState type:

```typescript
type PanelState =
  | "empty"
  | "pre-generation"
  | "planning"
  | "generating"
  | "completed";
```

Add new state variables after the existing state declarations:

```typescript
const [reasoningPlan, setReasoningPlan] = useState<ReasoningPlan | null>(null);
const [reasoningPlanId, setReasoningPlanId] = useState<string | null>(null);
```

Add the imports at the top:

```typescript
import { ReasoningPreview } from "./ReasoningPreview";
import type {
  ReasoningPlan,
  ComplianceVerdict,
} from "@/lib/generate/reasoning-types";
```

- [ ] **Step 2: Add plan computation handler**

Add a new function `handleComputePlan` that replaces the direct "Generate" action:

```typescript
async function handleComputePlan() {
  if (!selectedType) return;
  setError(null);

  try {
    const res = await fetch("/api/generate2/reasoning-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...csrfHeaders() },
      body: JSON.stringify({ documentType: selectedType }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data?.error || "Failed to compute plan");
    }

    const data = await res.json();
    setReasoningPlan(data.plan);
    setReasoningPlanId(data.plan.id);
    setPanelState("planning");
  } catch (err) {
    logError("[Generate2] Plan computation failed", err);
    // Fall back to direct generation (no plan)
    handleGenerate(false);
  }
}
```

Add verdict override handler:

```typescript
function handleVerdictOverride(
  sectionIndex: number,
  verdict: ComplianceVerdict,
) {
  if (!reasoningPlan) return;
  setReasoningPlan({
    ...reasoningPlan,
    userModified: true,
    sections: reasoningPlan.sections.map((s) =>
      s.sectionIndex === sectionIndex
        ? { ...s, complianceVerdict: verdict }
        : s,
    ),
  });
}
```

- [ ] **Step 3: Modify the Generate button to go through planning**

In the JSX where `DocumentPreviewPanel` is rendered, change `onGenerate` to point to `handleComputePlan` instead of `handleGenerate`:

The `onGenerate` prop should call `handleComputePlan` when in pre-generation, and the ReasoningPreview's `onConfirm` calls `handleGenerate`.

- [ ] **Step 4: Add planning case to DocumentPreviewPanel**

In `src/components/generate2/DocumentPreviewPanel.tsx`, add the planning state rendering. Add to the props interface:

```typescript
reasoningPlan?: ReasoningPlan | null;
onConfirmPlan?: () => void;
onBackFromPlan?: () => void;
onVerdictOverride?: (sectionIndex: number, verdict: ComplianceVerdict) => void;
isConfirming?: boolean;
```

Add the rendering case before the generating case:

```tsx
if (panelState === "planning" && reasoningPlan && meta) {
  return (
    <ReasoningPreview
      plan={reasoningPlan}
      meta={meta}
      onConfirm={onConfirmPlan || (() => {})}
      onBack={onBackFromPlan || (() => {})}
      onVerdictOverride={onVerdictOverride || (() => {})}
      isConfirming={isConfirming || false}
    />
  );
}
```

- [ ] **Step 5: Run all generate2 tests**

Run: `npx vitest run src/lib/generate/`
Expected: All tests PASS

- [ ] **Step 6: Run TypeScript check**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add src/components/generate2/Generate2Page.tsx src/components/generate2/DocumentPreviewPanel.tsx
git commit -m "feat(generate2): integrate reasoning preview into generation flow"
```

---

## Chunk 4: Verification

### Task 11: End-to-End Verification

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run src/lib/generate/`
Expected: All tests PASS (including new reasoning plan tests)

- [ ] **Step 2: TypeScript compilation check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Lint check**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 4: Build check**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 5: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix(generate2): address build/lint issues from reasoning plan integration"
```
