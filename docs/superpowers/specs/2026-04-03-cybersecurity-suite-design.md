# Cybersecurity Suite Design

**Date:** 2026-04-03
**Status:** Approved

---

## 1. Overview

The Cybersecurity Suite is an aggregation layer that unifies three existing compliance modules — ENISA Controls (Cybersecurity), NIS2 Directive, and Cyber Resilience Act — into a single, action-oriented dashboard. It does not replace the individual modules; it provides a cross-regulation view that shows the customer their unified cyber compliance posture, prioritized actions, and requirement overlaps.

**Why:** A customer like OHB or Isar Aerospace must comply with all three simultaneously. The same penetration test report satisfies NIS2 Art. 21(2)(e), CRA Annex I Part I §2, and ENISA 3.1.1. Without a unified view, they do redundant work and miss overlaps.

---

## 2. Sidebar Restructuring

### New Structure

```
CYBERSECURITY  Suite
  ► Suite Overview         → /dashboard/cyber-suite     (NEW)
    ENISA Controls         → /dashboard/modules/cybersecurity
    NIS2 Directive         → /dashboard/modules/nis2
    Cyber Resilience Act   → /dashboard/modules/cra

EU REGULATIONS  10
    Authorization
    Debris Mitigation
    Environmental
    Insurance
    Supervision
    COPUOS/IADC
    Registration
    Export Control
    UK Space Act
    US Regulatory

EVIDENCE COLLECTION
    Sentinel
    Digital Twin
```

### Implementation

**File:** `src/components/dashboard/Sidebar.tsx`

- Create a new `ModuleGroup` for "Cybersecurity" with a "Suite" badge (emerald)
- Move Cybersecurity, NIS2, CRA out of the EU Regulations group
- Add "Suite Overview" as the first item (emerald accent, highlighted)
- EU Regulations count drops from 13 to 10
- Update `MODULE_MAP`, `EU_MODULES`, route arrays

---

## 3. Suite Overview Dashboard

**Route:** `/dashboard/cyber-suite`
**File:** `src/app/dashboard/cyber-suite/page.tsx`

### Layout (Action-First)

**Header Row:**

- Left: "Cybersecurity Suite" title + "3 Regulierungen · {N} Requirements"
- Right: Unified Cyber Score (large number + grade badge)

**Hero Section — Smart Actions:**

- "Nächste Aktionen (Highest Impact)" — emerald-bordered card
- Max 5 prioritized actions, each showing:
  - Action description (e.g., "SBOM hochladen")
  - Which requirements it satisfies across modules (e.g., "→ CRA-038 + NIS2 Art. 21(2)(d) + ENISA SC-01")
  - Estimated impact on Unified Score
- Link to the relevant module/action for each

**3-Module Cards (grid):**

- ENISA Controls: maturity score, requirement count (compliant/total), status badge
- NIS2 Directive: maturity score, entity classification, requirement count
- CRA: maturity score per product, product count, classification badges
- Each card links to the module page

**Cross-Regulation Matrix:**

- Rows: Compliance themes (Access Control, Cryptography, Incident Response, Supply Chain/SBOM, Risk Assessment, Business Continuity, Vulnerability Handling, Secure Updates, Monitoring/Logging, Documentation, Authentication/MFA, Governance)
- Columns: ENISA | NIS2 | CRA
- Cells: Status icon (green check / amber partial / red gap / gray N/A)
- Row-level status: "Complete" (all green) / "Partial" (mixed) / "Gap" (any red)
- Click on cell → navigate to the specific requirement in the relevant module

**Unified Timeline:**

- All cyber-relevant deadlines on one horizontal timeline
- NIS2: incident reporting deadlines (24h/72h)
- CRA: Sep 2026 reporting obligations, Dec 2027 full application
- Assessment-specific deadlines from all 3 modules
- Color-coded by urgency

**Evidence Coverage Bar:**

- Single progress bar: X% of cyber requirements have accepted evidence
- Breakdown: ENISA coverage / NIS2 coverage / CRA coverage
- Link to Audit Center evidence view

---

## 4. Unified Cyber Score

**Service:** `src/lib/services/cyber-suite-score.server.ts`

### Calculation: Requirement-Level Aggregation

1. Fetch all requirement statuses from:
   - `CybersecurityRequirementStatus` (ENISA)
   - `NIS2RequirementStatus` (NIS2)
   - `CRARequirementStatus` (CRA)
     for the user's organization

2. Build a unified requirement map:
   - Each requirement gets a key: `{module}:{requirementId}` (e.g., `nis2:nis2-001`, `cra:cra-001`)
   - For cross-referenced requirements (from `cross-references.ts` and CRA `nis2RequirementIds`), group them as a single "theme"
   - Within a theme, use the BEST status across modules (if NIS2 is compliant but CRA is not_assessed, the theme is partial)

3. Score calculation:

   ```
   totalThemes = count of deduplicated requirement themes
   compliantThemes = themes where all module requirements are compliant
   partialThemes = themes where at least one module requirement is compliant or partial

   score = ((compliantThemes + 0.5 * partialThemes) / totalThemes) * 100
   ```

4. Grade mapping: A (≥90), B (≥80), C (≥60), D (≥40), F (<40)

### Return Type

```typescript
interface CyberSuiteScore {
  unifiedScore: number; // 0-100
  grade: string; // A-F
  totalRequirements: number; // Before dedup
  deduplicatedThemes: number; // After dedup
  compliantThemes: number;
  partialThemes: number;
  gapThemes: number;
  moduleScores: {
    enisa: { score: number; total: number; compliant: number; partial: number };
    nis2: { score: number; total: number; compliant: number; partial: number };
    cra: { score: number; total: number; compliant: number; partial: number };
  };
  crossRegulationMatrix: CrossRegulationTheme[];
  evidenceCoverage: {
    total: number;
    covered: number;
    percent: number;
  };
}

interface CrossRegulationTheme {
  theme: string; // "Access Control", "Cryptography", etc.
  enisa: ThemeStatus | null; // null if no requirement in this module
  nis2: ThemeStatus | null;
  cra: ThemeStatus | null;
  overallStatus: "complete" | "partial" | "gap";
  relatedRequirementIds: string[]; // All requirement IDs in this theme
}

type ThemeStatus = "compliant" | "partial" | "non_compliant" | "not_assessed";
```

---

## 5. Smart Action Generator

**Service:** `src/lib/services/cyber-suite-actions.server.ts`

### Logic

1. Find all non-compliant/not-assessed requirements across 3 modules
2. For each requirement, check if it has cross-references to other modules
3. Group by "action theme" (e.g., all supply chain requirements → "SBOM hochladen")
4. Score each action by:
   - Number of modules it touches (3 > 2 > 1)
   - Severity of the requirements it satisfies (critical > major > minor)
   - Implementation time (shorter = more actionable)
5. Return top 5 sorted by impact

### Action Mapping

Predefined action-to-requirement mappings:

```typescript
const ACTION_TEMPLATES = [
  {
    action: "SBOM hochladen",
    satisfies: {
      cra: ["cra-038", "cra-039", "cra-040"],
      nis2: ["nis2-013"],
      enisa: ["SC-01"],
    },
    link: "/dashboard/modules/cra", // Where to go
  },
  {
    action: "Vulnerability Disclosure Policy erstellen",
    satisfies: { cra: ["cra-014"], nis2: ["nis2-017"], enisa: ["VH-04"] },
  },
  {
    action: "Incident Response Plan dokumentieren",
    satisfies: {
      cra: ["cra-026", "cra-027"],
      nis2: ["nis2-005", "nis2-006"],
      enisa: ["IR-01", "IR-02"],
    },
  },
  {
    action: "Penetration Test durchführen",
    satisfies: { cra: ["cra-013"], nis2: ["nis2-021"], enisa: ["ST-01"] },
  },
  {
    action: "Cryptographic Policy definieren",
    satisfies: {
      cra: ["cra-002", "cra-008"],
      nis2: ["nis2-033"],
      enisa: ["CR-01", "CR-02"],
    },
  },
  {
    action: "Risk Assessment durchführen",
    satisfies: {
      cra: ["cra-018"],
      nis2: ["nis2-001"],
      enisa: ["RA-01", "RA-02"],
    },
  },
  {
    action: "Access Control Mechanismen implementieren",
    satisfies: { cra: ["cra-001"], nis2: ["nis2-037"], enisa: ["AC-01"] },
  },
  {
    action: "Security Update Mechanismus einrichten",
    satisfies: {
      cra: ["cra-035", "cra-036", "cra-037"],
      nis2: ["nis2-017"],
      enisa: ["UM-01"],
    },
  },
];
```

For each action, check how many of its requirements are NOT compliant. If all are already compliant, skip. Sort remaining by count of non-compliant requirements × number of modules.

### Return Type

```typescript
interface SmartAction {
  action: string;
  description: string;
  modulesImpacted: number; // 1-3
  requirementsSatisfied: Array<{
    module: "enisa" | "nis2" | "cra";
    requirementId: string;
    currentStatus: string;
  }>;
  estimatedScoreImpact: number; // How much unified score would improve
  link?: string; // Where to go in the dashboard
}
```

---

## 6. API Route

**Route:** `GET /api/cyber-suite`
**File:** `src/app/api/cyber-suite/route.ts`

Auth + org-scoped. Returns:

```typescript
{
  score: CyberSuiteScore;
  actions: SmartAction[];
  timeline: CyberDeadline[];
  lastCalculated: string;
}
```

Fetches from all 3 assessment models in parallel, calculates score, generates actions, aggregates deadlines.

---

## 7. Files to Create

| File                                             | Purpose                                          |
| ------------------------------------------------ | ------------------------------------------------ |
| `src/lib/services/cyber-suite-score.server.ts`   | Unified score calculation with requirement dedup |
| `src/lib/services/cyber-suite-actions.server.ts` | Smart action generator                           |
| `src/app/api/cyber-suite/route.ts`               | API endpoint                                     |
| `src/app/dashboard/cyber-suite/page.tsx`         | Suite overview dashboard                         |

## 8. Files to Modify

| File                                   | Change                                                          |
| -------------------------------------- | --------------------------------------------------------------- |
| `src/components/dashboard/Sidebar.tsx` | New "Cybersecurity" section, move 3 modules, add Suite Overview |
| `src/data/modules.ts`                  | No change needed (modules stay registered)                      |

---

## 9. What This Is NOT

- Not a replacement for the 3 individual modules (they keep their own pages, engines, APIs)
- Not a new assessment engine (no new data model, no new requirements)
- Not a refactoring of existing scoring (MODULE_WEIGHTS stays unchanged)
- Pure aggregation + presentation layer
