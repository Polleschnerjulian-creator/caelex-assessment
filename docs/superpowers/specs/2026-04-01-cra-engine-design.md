# CRA Engine Design — EU Cyber Resilience Act Compliance Module

**Date:** 2026-04-01
**Status:** Approved
**Phase:** Phase 1 (Manufacturer Perspective)
**Architecture:** Ansatz C — NIS2-Clone mit Cross-Mapping-Layer

---

## 1. Overview

The EU Cyber Resilience Act (CRA, Regulation (EU) 2024/2847) establishes cybersecurity requirements for products with digital elements placed on the EU market. This module adds CRA compliance assessment to the Caelex platform, with a manufacturer-first perspective and deep NIS2 cross-mapping from day one.

**Why this matters for Space:** The CRA applies to satellite components (on-board computers, ground segment software, software-defined radios) but uses generic product categories that don't map 1:1 to space hardware. Caelex provides the Space-specific interpretation layer — the Curated Space Product Taxonomy — that no competitor offers.

**Key dates:**

- 10 December 2024: CRA entered into force
- 11 September 2026: Reporting obligations for actively exploited vulnerabilities (Art. 14)
- 11 December 2027: Full application of all requirements

**Phase 1 scope:** Manufacturer perspective — "Is my product CRA-compliant?"
**Phase 2 (future):** Procurer perspective — "Has my supplier fulfilled CRA obligations?" (Inverted assessment on same data, links to NIS2 Art. 21(2)(d) Supply Chain Security)

---

## 2. Architecture Decision

**Ansatz C: NIS2-Clone mit Cross-Mapping-Layer.**

Replicates the proven NIS2 engine architecture (types → data → engine → auto-assessment → API → dashboard) as independent files, with a dedicated cross-regulation layer for bidirectional CRA↔NIS2 mapping.

**Why not Shared Core (Ansatz B):** At 580k+ LOC, refactoring the NIS2 engine into a shared framework to build the second engine is premature abstraction. The shared framework emerges organically when engine 3 or 4 arrives and the common kernel is known from repetition, not guessing.

**Why not pure NIS2-Clone (Ansatz A):** Cross-regulation overlap is CRA's highest-value feature. Every `CRARequirement` carries `nis2RequirementIds` for direct linkage. The bidirectional mapping generates "estimated savings" that justify the platform's existence — "14 of 23 CRA requirements partially fulfilled by your NIS2 compliance."

---

## 3. Type System (`src/lib/cra-types.ts`)

### Product Classification

```typescript
export type CRAProductClass = "default" | "class_I" | "class_II";

export type CRAConformityRoute =
  | "self_assessment" // Default: Annex VIII (internal control)
  | "harmonised_standard" // Class I Option A: Annex VIII + harmonised standard
  | "third_party_type_exam" // Class I Option B / Class II: Annex VII (EU type examination)
  | "full_quality_assurance"; // Class II alternative: Annex VI

export type CRAEconomicOperatorRole =
  | "manufacturer" // Phase 1: full obligations
  | "importer" // Phase 2
  | "distributor"; // Phase 2
```

### Classification Reasoning Chain

Every classification produces an auditable, Notified-Body-grade reasoning chain:

```typescript
export interface ClassificationStep {
  criterion: string; // Human-readable criterion description
  legalBasis: string; // Full legal reference chain, e.g. "Art. 7(2) i.V.m. Annex III Kategorie 2.1"
  annexRef: string; // "Annex III" | "Annex IV" | "N/A"
  annexCategory?: string; // Subcategory, e.g. "2.1"
  satisfied: boolean; // Was this criterion met?
  reasoning: string; // Space-specific justification
}
```

Each step carries a `legalBasis` with full Normkette (Art. X i.V.m. Annex Y Kategorie Z) — the language a Notified Body expects. The `reasoning` field provides the Space-specific interpretation that connects generic CRA criteria to concrete satellite hardware characteristics.

This structure is Verity-attestation-ready: a `ClassificationStep[]` with legal references and boolean outcomes is a deterministic, hashable chain that can be cryptographically attested.

### Space Product Taxonomy Types

```typescript
export type SpaceProductSegment = "space" | "ground" | "link" | "user";

export interface CRASpaceProductType {
  id: string; // "obc" | "aocs_flight_sw" | ...
  name: string; // "On-board Computer"
  segments: SpaceProductSegment[]; // Array: product can span segments
  description: string;
  classification: CRAProductClass;
  conformityRoute: CRAConformityRoute;
  classificationReasoning: ClassificationStep[];
  nis2SubSectors: NIS2SpaceSubSector[]; // Which NIS2 sub-sectors affected
}
```

Note: `segments` is an array, not a single value. Products like SDR (space + link) or GNSS Receiver (space + user) span multiple segments, and classification may depend on deployment context.

### Assessment Input

```typescript
export interface CRAAssessmentAnswers {
  // Operator context (from unified assessment)
  economicOperatorRole: CRAEconomicOperatorRole;
  isEUEstablished: boolean | null;

  // Product identification
  spaceProductTypeId: string | null; // Curated Taxonomy selection, null = rule engine
  productName: string;
  productVersion?: string;

  // Rule-based override (when no taxonomy match)
  hasNetworkFunction: boolean | null;
  processesAuthData: boolean | null;
  usedInCriticalInfra: boolean | null;
  performsCryptoOps: boolean | null;
  controlsPhysicalSystem: boolean | null; // Safety-critical
  hasMicrocontroller: boolean | null;
  isOSSComponent: boolean | null;
  isCommerciallySupplied: boolean | null; // For OSS scope check

  // Space-specific
  segments: SpaceProductSegment[];
  isSafetyCritical: boolean | null;
  hasRedundancy: boolean | null;
  processesClassifiedData: boolean | null;

  // Existing certifications (auto-assessment input)
  hasIEC62443: boolean | null;
  hasETSIEN303645: boolean | null;
  hasCommonCriteria: boolean | null;
  hasISO27001: boolean | null;
}
```

### Requirement Structure

```typescript
export type CRARequirementCategory =
  | "security_by_design" // Annex I Part I §1: Design, Development, Production
  | "vulnerability_handling" // Annex I Part I §2: Vulnerability Handling
  | "documentation" // Annex I Part I §3: Technical Documentation
  | "conformity_assessment" // Art. 32-34: Conformity Assessment Procedures
  | "incident_reporting" // Art. 14: Reporting Obligations
  | "post_market_obligations" // Art. 13(8), Art. 14: Manufacturer post-market duties
  | "software_update" // Annex I Part II §1: Update Obligation
  | "sbom" // Annex I Part II §2: Software Bill of Materials
  | "support_period"; // Art. 13(8): Support Period

export interface CRARequirement {
  id: string;
  articleRef: string;
  category: CRARequirementCategory;
  title: string;
  description: string;
  complianceQuestion: string;
  spaceSpecificGuidance: string;
  applicableTo: {
    productClasses?: CRAProductClass[];
    segments?: SpaceProductSegment[];
    roles?: CRAEconomicOperatorRole[];
  };
  // Cross-regulation references
  nis2Ref?: string;
  nis2RequirementIds?: string[];
  iso27001Ref?: string;
  iec62443Ref?: string;
  ecssRef?: string;
  // Assessment
  assessmentFields: AssessmentField[];
  complianceRule: ComplianceRule;
  severity: "critical" | "major" | "minor";
  implementationTimeWeeks: number;
  canBeSimplified: boolean;
}
```

### Engine Output

```typescript
export interface CRAComplianceResult {
  productClassification: CRAProductClass;
  classificationReasoning: ClassificationStep[];
  conformityRoute: CRAConformityRoute;
  conflict?: ClassificationConflict;
  applicableRequirements: CRARequirement[];

  // NIS2 Overlap
  nis2Overlap: {
    overlappingRequirementCount: number;
    overlappingRequirements: Array<{
      craRequirementId: string;
      nis2RequirementId: string;
      relationship: "implements" | "overlaps" | "extends";
    }>;
    estimatedSavingsRange: { min: number; max: number }; // Weeks, displayed as range
    disclaimer: string; // "Estimate based on typical implementation efforts"
  };

  // Timelines
  supportPeriodYears: number;
  reportingTimeline: {
    activelyExploitedVuln: string; // "24h to ENISA (Art. 14(2)(a))"
    severeIncident: string; // "72h to ENISA (Art. 14(2)(b))"
    patchRelease: string; // "14 days after patch (Art. 14(2)(c))"
  };

  // Penalties
  penalties: {
    maxFine: string; // "EUR 15M or 2.5% annual turnover"
    calculationBasis: string;
  };

  keyDates: Array<{ date: string; description: string; articleRef: string }>;
}

export interface ClassificationConflict {
  taxonomyClass: CRAProductClass;
  ruleEngineClass: CRAProductClass;
  conflictingSteps: ClassificationStep[];
  recommendation: string;
}

export interface RedactedCRAComplianceResult {
  // Client-safe subset: strips spaceSpecificGuidance, reasoning details,
  // cross-refs, tips, evidenceRequired from requirements.
  // Used by public API endpoints.
  productClassification: CRAProductClass;
  classificationReasoning: ClassificationStep[]; // KEPT — this is the public value
  conformityRoute: CRAConformityRoute;
  applicableRequirementCount: number;
  nis2OverlapCount: number;
}
```

**Important:** `classificationReasoning` is NOT redacted in the public result. The reasoning chain is the top-of-funnel value — the `/classify` endpoint returns it fully visible without authentication. The detailed requirement guidance and cross-references are what require login.

---

## 4. Space Product Taxonomy (`src/data/cra-taxonomy.ts`)

19 curated Space product types with full classification reasoning chains.

### Class II — Third-Party Assessment Mandatory (Annex IV)

**6 products:**

| ID                   | Name                                   | Segments     | Annex IV Categories                                              |
| -------------------- | -------------------------------------- | ------------ | ---------------------------------------------------------------- |
| `obc`                | On-board Computer                      | `["space"]`  | Kat. 1 (Industrial Automation/Control), Kat. 2 (Auth Processing) |
| `aocs_flight_sw`     | AOCS Flight Software                   | `["space"]`  | Kat. 1 (Controls physical system with safety implications)       |
| `ttc_ground_system`  | TT&C Ground System                     | `["ground"]` | Kat. 2 (Auth/Crypto processing), Kat. 3 (Cryptographic device)   |
| `mission_control_sw` | Mission Control Software               | `["ground"]` | Kat. 1 (Central C2 for satellite fleet)                          |
| `satellite_c2`       | Satellite Command & Control System     | `["ground"]` | Kat. 2 (Auth/Authorization for spacecraft access)                |
| `hsm_space`          | Hardware Security Module (Space-grade) | `["space"]`  | Kat. 3 (Cryptographic device for key management)                 |

**Example reasoning chain for `aocs_flight_sw`:**

```typescript
{
  id: "aocs_flight_sw",
  name: "AOCS Flight Software",
  segments: ["space"],
  description: "Attitude and Orbit Control System flight software. Controls spacecraft attitude determination, orbit maintenance, and collision avoidance maneuvers.",
  classification: "class_II",
  conformityRoute: "third_party_type_exam",
  classificationReasoning: [
    {
      criterion: "Product with digital elements",
      legalBasis: "Art. 3 Nr. 1 CRA (EU) 2024/2847",
      annexRef: "N/A",
      satisfied: true,
      reasoning: "AOCS flight software is embedded software that maintains a data connection to spacecraft bus sensors (star trackers, gyroscopes) and actuators (reaction wheels, thrusters)."
    },
    {
      criterion: "Product controlling physical systems in critical infrastructure",
      legalBasis: "Art. 7(2) i.V.m. Annex IV Kategorie 1",
      annexRef: "Annex IV",
      annexCategory: "1",
      satisfied: true,
      reasoning: "AOCS directly controls spacecraft attitude and orbital position. Satellite systems are critical infrastructure under NIS2 Annex I Sector 11 (Space). AOCS malfunction has immediate physical consequences: uncontrolled tumbling, orbit deviation, collision risk with other space objects."
    },
    {
      criterion: "Product whose failure can generate space debris",
      legalBasis: "Erwägungsgrund 29 CRA i.V.m. Annex IV Kategorie 1",
      annexRef: "Annex IV",
      annexCategory: "1",
      satisfied: true,
      reasoning: "AOCS failure during collision avoidance maneuvers can result in conjunction events and debris generation (IADC Guideline 5.2.3). Unlike ground-based industrial control, AOCS failures in orbit are irreversible — no physical intervention possible."
    },
    {
      criterion: "Product performing safety-critical computations",
      legalBasis: "Annex IV Kategorie 1, ECSS-Q-ST-80C",
      annexRef: "Annex IV",
      annexCategory: "1",
      satisfied: true,
      reasoning: "AOCS performs real-time attitude determination and orbit propagation calculations. Error in attitude knowledge directly affects pointing accuracy for communication antennas and solar arrays, potentially leading to loss of mission."
    }
  ],
  nis2SubSectors: ["ground_infrastructure", "satellite_communications"]
}
```

### Class I — Harmonised Standard or Third-Party (Annex III)

**9 products:**

| ID                     | Name                          | Segments            | Annex III Categories                          |
| ---------------------- | ----------------------------- | ------------------- | --------------------------------------------- |
| `sdr`                  | Software-Defined Radio        | `["space", "link"]` | Kat. 2.1 (Network-capable), Kat. 2.3 (Crypto) |
| `gnss_receiver`        | GNSS Receiver (embedded)      | `["space", "user"]` | Kat. 2.4 (Safety-relevant positioning)        |
| `ground_station_sw`    | Ground Station Software       | `["ground"]`        | Kat. 2.2 (Network management)                 |
| `data_handling_unit`   | Data Handling Unit            | `["space"]`         | Kat. 2.1 (Microcontroller + network)          |
| `intersatellite_link`  | Intersatellite Link Terminal  | `["link"]`          | Kat. 2.1 + 2.3 (Network + crypto)             |
| `flight_software`      | Flight Software (non-AOCS)    | `["space"]`         | Kat. 2.1 (Embedded + network to bus)          |
| `payload_processor`    | Payload Data Processor        | `["space"]`         | Kat. 2.1 (Microcontroller + downlink)         |
| `ground_network_infra` | Ground Network Infrastructure | `["ground"]`        | Kat. 2.2 (Firewalls, routers, switches)       |
| `key_management_sw`    | Key Management Software       | `["ground"]`        | Kat. 2.3 (Crypto operations)                  |

### Default — Self-Assessment (Annex VIII)

**4 products:**

| ID                       | Name                                      | Segments     | Reasoning                                                            |
| ------------------------ | ----------------------------------------- | ------------ | -------------------------------------------------------------------- |
| `star_tracker`           | Star Tracker                              | `["space"]`  | Sensor, no independent network function, no auth data, no crypto ops |
| `reaction_wheel`         | Reaction Wheel (with embedded controller) | `["space"]`  | Actuator with simple controller, no independent network function     |
| `solar_array_driver`     | Solar Array Drive Mechanism (SADM)        | `["space"]`  | Mechanical actuator with simple control electronics                  |
| `ground_monitoring_tool` | Ground Monitoring/Visualization Tool      | `["ground"]` | Display-only tool, no control function, no network-critical role     |

**Total: 19 Space product types** (6 Class II + 9 Class I + 4 Default).

---

## 5. Engine Architecture (`src/lib/cra-engine.server.ts`)

Three-phase pipeline:

### Phase 1: Scope Check

```
Input: CRAAssessmentAnswers
  │
  ├─ isOSSComponent && !isCommerciallySupplied?
  │    → out_of_scope
  │    → Reason: "Non-commercially supplied open-source software is excluded
  │      from CRA scope (Art. 3 Nr. 12-14, Recital 18-20)"
  │    → classificationReasoning contains the OSS exclusion step
  │
  ├─ isEUEstablished === false?
  │    → NOT out_of_scope, but flag "authorized_representative_required"
  │    → CRA applies to products placed on EU market regardless of
  │      manufacturer location, but Art. 4(2) requires an authorized
  │      representative in the EU
  │
  ├─ economicOperatorRole !== "manufacturer"?
  │    → Return with note: "Phase 2 (Procurer perspective) not yet available.
  │      Your role as [importer/distributor] has different obligations."
  │
  └─ Continue to classification
```

### Phase 2: Product Classification

Two paths, both produce `ClassificationStep[]`:

```
spaceProductTypeId !== null?
  │
  ├─ YES → Taxonomy Path
  │    Lookup in SPACE_PRODUCT_TAXONOMY by id
  │    → classification, conformityRoute, classificationReasoning
  │      from taxonomy entry
  │    → Rule engine runs as VALIDATION (not override):
  │      Compare taxonomy class with what rule engine would produce
  │      from the assessment answers
  │    → If conflict: return ClassificationConflict with both results
  │      + recommendation (rule engine result recommended)
  │
  └─ NO → Rule Engine Path
       Sequential evaluation:
       1. Annex IV triggers (Class II) — checked first, highest class wins
          IF (controlsPhysicalSystem AND usedInCriticalInfra) → Kat. 1
          IF (performsCryptoOps AND isSafetyCritical) → Kat. 3
          IF (processesAuthData AND usedInCriticalInfra) → Kat. 2
       2. Annex III triggers (Class I)
          IF (hasNetworkFunction AND usedInCriticalInfra) → Kat. 2.1
          IF (hasNetworkFunction AND performsCryptoOps) → Kat. 2.3
          IF (hasMicrocontroller AND hasNetworkFunction) → Kat. 2.1
       3. Default (Annex VIII)
       → Every rule checked is added to ClassificationStep[]
         (including non-satisfied rules, with satisfied: false)
```

The taxonomy-path validation is a "trust but verify" pattern: taxonomy gives instant results, rule engine catches inconsistent inputs (e.g., user selects "Star Tracker" but answers "yes" to network function → conflict alert).

### Phase 3: Requirement Calculation + NIS2 Overlap

```
classifyCRAProduct(answers)
  │ → classification, reasoning, conformityRoute, conflict?
  │
  ▼
getApplicableCRARequirements(classification, answers)
  │ → Filter CRA_REQUIREMENTS by:
  │   - applicableTo.productClasses (contains classification?)
  │   - applicableTo.segments (intersection with answers.segments?)
  │   - applicableTo.roles (contains "manufacturer"?)
  │
  ▼
calculateNIS2Overlap(applicableRequirements)
  │ → For each CRA requirement with nis2RequirementIds:
  │   - Lookup in CROSS_REFERENCES for relationship type
  │   - Calculate savings range per relationship type:
  │     "implements" → min 70%, max 90% of implementationTimeWeeks saved
  │     "overlaps"   → min 40%, max 60% saved
  │     "extends"    → min 10%, max 30% saved (CRA goes further than NIS2)
  │   - Sum min/max across all overlapping requirements
  │   - Attach disclaimer text
  │
  ▼
buildCRAComplianceResult()
  │ → supportPeriodYears: min 5 years or expected product lifetime
  │ → reportingTimeline: 24h/72h/14d per Art. 14
  │ → penalties: EUR 15M or 2.5% annual turnover (Annex I violations)
  │ → keyDates:
  │     { date: "2024-12-10", description: "CRA entered into force", articleRef: "Art. 71" }
  │     { date: "2026-09-11", description: "Reporting obligations apply", articleRef: "Art. 14" }
  │     { date: "2027-12-11", description: "Full application", articleRef: "Art. 71(2)" }
  │
  ▼
redactCRAResultForClient(result)
  │ → Strips spaceSpecificGuidance, nis2RequirementIds, tips, evidenceRequired
  │ → KEEPS classificationReasoning (public value, top-of-funnel)
```

### NIS2 Overlap Savings Calculation

Savings are displayed as **ranges**, not precise numbers:

```typescript
estimatedSavingsRange: {
  min: number; // Conservative estimate (lower bound of each relationship)
  max: number; // Optimistic estimate (upper bound)
}
disclaimer: "Schätzung basierend auf typischen Implementierungsaufwänden. Tatsächliche Einsparungen hängen von der Tiefe Ihrer bestehenden NIS2-Compliance ab.";
```

### Engine Exports

```typescript
export function classifyCRAProduct(answers: CRAAssessmentAnswers): {
  classification: CRAProductClass;
  classificationReasoning: ClassificationStep[];
  conformityRoute: CRAConformityRoute;
  conflict?: ClassificationConflict;
  isOutOfScope: boolean;
  outOfScopeReason?: string;
};

export async function calculateCRACompliance(
  answers: CRAAssessmentAnswers,
): Promise<CRAComplianceResult>;

export function redactCRAResultForClient(
  result: CRAComplianceResult,
): RedactedCRAComplianceResult;
```

---

## 6. NIS2 Cross-Reference Mapping

### Bidirectional Cross-References

Added to `src/data/cross-references.ts`. `RegulationType` union extended with `"cra"`.

| CRA Requirement                            | NIS2 Requirement                          | Relationship | Rationale                                                                           |
| ------------------------------------------ | ----------------------------------------- | ------------ | ----------------------------------------------------------------------------------- |
| Annex I Part I §1 (Security by Design)     | Art. 21(2)(a) (Risk Analysis & IS Policy) | `overlaps`   | Both require systematic risk analysis; CRA is product-scoped, NIS2 is entity-scoped |
| Annex I Part I §2 (Vulnerability Handling) | Art. 21(2)(e) (Network/IS Maintenance)    | `implements` | CRA vulnerability handling directly fulfills NIS2 maintenance requirements          |
| Annex I Part II §2 (SBOM)                  | Art. 21(2)(d) (Supply Chain Security)     | `extends`    | CRA SBOM goes significantly further than NIS2's general supply chain obligation     |
| Art. 14 (Incident Reporting)               | Art. 23 (NIS2 Incident Reporting)         | `overlaps`   | Different timelines (CRA: 24h to ENISA, NIS2: 24h to CSIRT) but same intent         |
| Annex I Part I §1(c) (Access Control)      | Art. 21(2)(i) (HR, Access, Asset Mgmt)    | `overlaps`   | CRA product-level access control overlaps NIS2 entity-level access management       |
| Annex I Part I §1(d) (Cryptography)        | Art. 21(2)(h) (Cryptography & Encryption) | `implements` | CRA crypto requirements implement NIS2's encryption obligations at product level    |
| Art. 13(8) (Support Period)                | Art. 21(2)(c) (Business Continuity)       | `extends`    | CRA mandates 5-year minimum support; NIS2 requires continuity planning generally    |
| Annex I Part II §1 (Software Updates)      | Art. 21(2)(e) (Network/IS Maintenance)    | `implements` | CRA secure update mechanism directly implements NIS2 network maintenance            |

### Bidirectional Integration

The NIS2 engine result (`NIS2ComplianceResult`) will also gain a `craOverlap` section showing which NIS2 requirements have CRA equivalents. Implementation: add a `calculateCRAOverlap()` call in `nis2-engine.server.ts` that filters `CROSS_REFERENCES` for `(source=nis2, target=cra) OR (source=cra, target=nis2)`.

---

## 7. Rule Engine (`src/lib/cra-rule-engine.server.ts`)

Separate file for the rule-based classification logic. Used by the main engine for both standalone classification (no taxonomy match) and taxonomy validation.

### Pre-Gate: OSS Scope Check

```typescript
function checkOSSScope(answers: CRAAssessmentAnswers): ClassificationStep {
  // Art. 3 Nr. 12-14, Recital 18-20
  // Non-commercially supplied OSS is out of CRA scope
  // Commercially supplied OSS (e.g., Red Hat) IS in scope
}
```

### Classification Rules

Rules are evaluated sequentially. Each rule produces a `ClassificationStep` regardless of outcome:

```typescript
// Annex IV (Class II) — evaluated first
const ANNEX_IV_RULES: ClassificationRule[] = [
  {
    id: "annex_iv_kat_1_industrial_control",
    test: (a) => a.controlsPhysicalSystem && a.usedInCriticalInfra,
    legalBasis: "Art. 7(2) i.V.m. Annex IV Kategorie 1",
    // ...
  },
  {
    id: "annex_iv_kat_2_auth_processing",
    test: (a) => a.processesAuthData && a.usedInCriticalInfra,
    legalBasis: "Annex IV Kategorie 2",
    // ...
  },
  {
    id: "annex_iv_kat_3_crypto_device",
    test: (a) => a.performsCryptoOps && a.isSafetyCritical,
    legalBasis: "Annex IV Kategorie 3",
    // ...
  },
];

// Annex III (Class I) — evaluated if no Annex IV match
const ANNEX_III_RULES: ClassificationRule[] = [
  {
    id: "annex_iii_kat_2_1_network_critical",
    test: (a) => a.hasNetworkFunction && a.usedInCriticalInfra,
    legalBasis: "Annex III Kategorie 2.1",
    // ...
  },
  {
    id: "annex_iii_kat_2_2_network_mgmt",
    test: (a) => a.hasNetworkFunction && a.performsCryptoOps,
    legalBasis: "Annex III Kategorie 2.3",
    // ...
  },
  {
    id: "annex_iii_kat_2_1_microcontroller",
    test: (a) => a.hasMicrocontroller && a.hasNetworkFunction,
    legalBasis: "Annex III Kategorie 2.1",
    // ...
  },
];
```

### Conflict Detection

```typescript
export interface ClassificationConflict {
  taxonomyClass: CRAProductClass;
  ruleEngineClass: CRAProductClass;
  conflictingSteps: ClassificationStep[];
  recommendation: string;
}
```

When taxonomy selection and rule engine disagree, the conflict is surfaced with both results. The engine recommends the rule-engine result (data-driven) but the user decides.

---

## 8. Auto-Assessment Engine (`src/lib/cra-auto-assessment.server.ts`)

Five rule passes, analogous to NIS2:

### Rule 1: IEC 62443 Coverage

`hasIEC62443 && req.iec62443Ref` → `partial`
Rationale: IEC 62443 (industrial cybersecurity) has high overlap with CRA Security by Design requirements.

### Rule 2: Common Criteria Coverage

`hasCommonCriteria && category in [security_by_design, vulnerability_handling]` → `partial`
Rationale: CC EAL certification covers design assurance and vulnerability analysis.

### Rule 3: ISO 27001 Coverage

`hasISO27001 && req.iso27001Ref` → `partial`
Rationale: ISO 27001 organizational controls overlap with CRA product-level requirements.

### Rule 4: NIS2 Overlap Propagation

If `nis2AssessmentId` is set AND the corresponding NIS2 requirement status is `compliant` → `partial` with note "Teilerfüllt durch NIS2-Compliance (Art. 21(2)(X))".
This reads the linked NIS2 assessment from the database and propagates compliance status — not just a count, but actual pre-population of requirement statuses.

### Rule 5: Proportionality

`classification === "default" && req.canBeSimplified` → add `proportionalityNote`.
Default-class products may use simplified conformity assessment (Annex VIII).

---

## 9. Database Schema

### New Models (added to `prisma/schema.prisma`)

```prisma
model CRAAssessment {
  id              String   @id @default(cuid())
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  organizationId  String?
  organization    Organization? @relation(fields: [organizationId], references: [id])

  // Product identification (per product, not per org)
  productName          String
  productVersion       String?
  spaceProductTypeId   String?

  // Classification
  economicOperatorRole    String    // manufacturer | importer | distributor
  productClassification   String    // default | class_I | class_II
  conformityRoute         String
  classificationReasoning Json      // ClassificationStep[]
  classificationConflict  Json?     // ClassificationConflict | null
  isOutOfScope            Boolean   @default(false)
  outOfScopeReason        String?

  // Product profile
  segments                String    // JSON: SpaceProductSegment[]
  hasNetworkFunction      Boolean?
  processesAuthData       Boolean?
  usedInCriticalInfra     Boolean?
  performsCryptoOps       Boolean?
  controlsPhysicalSystem  Boolean?
  hasMicrocontroller      Boolean?
  isOSSComponent          Boolean?
  isCommerciallySupplied  Boolean?
  isSafetyCritical        Boolean?
  hasRedundancy           Boolean?
  processesClassifiedData Boolean?
  isEUEstablished         Boolean?

  // Existing certifications
  hasIEC62443       Boolean?
  hasETSIEN303645   Boolean?
  hasCommonCriteria Boolean?
  hasISO27001       Boolean?

  // Scores
  complianceScore   Int?
  maturityScore     Int?
  riskLevel         String?

  // NIS2 cross-link
  nis2OverlapCount  Int?
  nis2AssessmentId  String?

  // Report
  reportGenerated   Boolean  @default(false)
  reportGeneratedAt DateTime?

  requirements CRARequirementStatus[]

  @@index([userId])
  @@index([organizationId])
  @@index([productClassification])
}

model CRARequirementStatus {
  id            String   @id @default(cuid())
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  assessmentId  String
  assessment    CRAAssessment @relation(fields: [assessmentId], references: [id], onDelete: Cascade)

  requirementId String
  status        String   // not_assessed | compliant | partial | non_compliant | not_applicable
  notes         String?  @db.Text  // Encrypted (AES-256-GCM)
  evidenceNotes String?  @db.Text  // Encrypted
  responses     Json?

  @@unique([assessmentId, requirementId])
  @@index([assessmentId])
}
```

### Relation Additions

- `User` model: add `craAssessments CRAAssessment[]`
- `Organization` model: add `craAssessments CRAAssessment[]`

---

## 10. API Routes

### Internal Dashboard API

```
POST   /api/cra                  Create CRA assessment
GET    /api/cra                  List assessments for user/org
GET    /api/cra/[assessmentId]   Get assessment with enriched requirements
PATCH  /api/cra/[assessmentId]   Update assessment profile, reclassify
DELETE /api/cra/[assessmentId]   Delete assessment
GET    /api/cra/requirements     Get requirement statuses (decrypted)
PATCH  /api/cra/requirements     Upsert requirement status + recalc maturity
GET    /api/cra/crosswalk        CRA↔NIS2 compliance matrix
POST   /api/cra/classify         Stateless product classification (authenticated)
```

### Public API (rate-limited, no auth)

```
POST   /api/v1/compliance/cra/classify   Stateless classification + reasoning chain
POST   /api/v1/compliance/cra/assess     Full assessment (API key required, redacted)
```

### The `/classify` Endpoint — Top of Funnel

**This is the strategically most important endpoint in the entire design.**

`POST /api/v1/compliance/cra/classify` is unauthenticated and rate-limited. It accepts a product type ID or rule-engine answers, and returns:

- `productClassification` (default / class_I / class_II)
- `conformityRoute` (which assessment procedure)
- `classificationReasoning: ClassificationStep[]` — **FULL reasoning chain, no truncation**
- `conflict?` (if taxonomy + answers disagree)

**No teaser gate.** No "log in to see full analysis." The classification with complete legal reasoning is the hook. The requirement tracking, NIS2 overlap calculation, maturity scoring, and evidence management are the reasons to create an account.

Rate limit: `public_classify` tier (30/hr per IP).

### POST /api/cra Orchestration

```
Zod validation (CRAAssessmentSchema)
  → classifyCRAProduct(answers)
  → calculateCRACompliance(answers) [if not out_of_scope]
  → prisma.cRAAssessment.create(...)
  → prisma.cRARequirementStatus.createMany(...)
  → generateCRAAutoAssessments(requirements, answers)
  → Batch-update statuses + encrypted notes
  → Recalculate maturityScore
  → logAuditEvent("CRA_ASSESSMENT_CREATED", ...)
  → Response: { assessment, classification, applicableRequirementIds }
```

---

## 11. Dashboard Module

### List Page: `/dashboard/modules/cra/page.tsx`

Client component with inline wizard (6 steps) and assessment list.

**Wizard flow:**

1. **Product Identification** — Name, version, description
2. **Space Product Type** — Curated taxonomy cards grouped by segment (Space / Ground / Link / User). Option: "My product is not listed" → rule engine path
3. **Product Properties** (rule engine path only) — Network function, crypto, safety-critical, etc.
4. **Deployment Context** — Segment(s), critical infrastructure, OSS component
5. **Existing Certifications** — IEC 62443, Common Criteria, ETSI EN 303 645, ISO 27001
6. **Result** — Classification + full reasoning chain + conformity route + NIS2 overlap summary

**Step 2 instant preview:** When user selects a taxonomy product type, the classification result appears immediately on the right side — before clicking "Next." This is the in-product equivalent of the `/classify` endpoint experience.

**Conflict handling:** If taxonomy selection and step 3/4 answers conflict, an alert banner appears with both classifications and a recommendation.

**Assessment cards** show: product name, classification badge (Default/I/II), conformity route, maturity score, NIS2 overlap count.

**Multiple assessments per org** — prominently supported. A manufacturer with 5 products creates 5 CRA assessments.

### Detail Page: `/dashboard/modules/cra/[id]/page.tsx`

Requirement tracking per assessment:

- Requirement list with category tabs (Security by Design, Vulnerability Handling, SBOM, etc.)
- Per requirement: status toggle, notes (encrypted), evidence upload
- **NIS2 overlap badge** per requirement — "Partially fulfilled by NIS2 Art. 21(2)(e)" with link to NIS2 assessment
- Maturity score progress bar
- Conformity route display with step-by-step guidance

### NIS2 Null-State

When a CRA assessment has no linked NIS2 assessment (`nis2AssessmentId === null`):

Do NOT leave the overlap section empty. Instead, display:

> "Du hast noch kein NIS2-Assessment. Basierend auf deinem Produktprofil als Hersteller in der Space-Branche wärst du wahrscheinlich NIS2-pflichtig (Annex I, Sektor 11). Starte ein NIS2-Assessment um bis zu X Requirements automatisch vorzubelegen."
> [Button: NIS2-Assessment starten →]

This is simultaneously honest (the customer likely IS NIS2-obligated) and an in-platform upsell.

---

## 12. ASTRA Integration

New knowledge file: `src/lib/astra/regulatory-knowledge/cra.ts`

Contains static CRA knowledge for the AI copilot:

- CRA product class definitions and thresholds
- Conformity assessment routes per class
- Space product taxonomy summary
- CRA↔NIS2 overlap mapping
- Key timelines and penalty structures

ASTRA can answer questions like:

- "Brauche ich für meinen Star Tracker eine Drittprüfung?"
- "Was ist der Unterschied zwischen CRA und NIS2 Vulnerability Handling?"
- "Welche CRA-Klasse gilt für Intersatellite Link Terminals?"

No new ASTRA tools needed — existing search and regulatory knowledge tools work with the new knowledge file.

---

## 13. Existing File Modifications

| File                                             | Change                                                                                                          |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `src/data/articles.ts`                           | Extend `ComplianceModule` union with `"cra"`                                                                    |
| `src/data/modules.ts`                            | Add CRA entry to `modules[]` array (id: "cra", number: "16", name: "Cyber Resilience Act", icon: "ShieldCheck") |
| `src/data/cross-references.ts`                   | Add ~30 CRA↔NIS2 `CrossReference` entries                                                                       |
| `src/lib/nis2-types.ts`                          | Extend `RegulationType` union with `"cra"`                                                                      |
| `src/lib/nis2-engine.server.ts`                  | Add `calculateCRAOverlap()` call for bidirectional cross-mapping                                                |
| `src/lib/unified-assessment-mappers.server.ts`   | Add `mapToCRAAnswers(unified)` function                                                                         |
| `src/lib/services/compliance-scoring-service.ts` | Add CRA module to score aggregation + weight rebalancing                                                        |
| `src/lib/validations/api-compliance.ts`          | Add `CRAAssessSchema` + `CRAClassifySchema`                                                                     |
| `prisma/schema.prisma`                           | Add `CRAAssessment` + `CRARequirementStatus` models, relations to User/Organization                             |

---

## 14. New Files Summary

| File                                              | Purpose                                                                  |
| ------------------------------------------------- | ------------------------------------------------------------------------ |
| `src/lib/cra-types.ts`                            | Type system (classifications, answers, requirements, results)            |
| `src/data/cra-taxonomy.ts`                        | 19 Space product types with classification reasoning chains              |
| `src/data/cra-requirements.ts`                    | ~35-45 CRA requirements (Annex I + Art. 13-14)                           |
| `src/lib/cra-engine.server.ts`                    | Scope check + classification + compliance calculation                    |
| `src/lib/cra-rule-engine.server.ts`               | Rule-based classification for hybrid products                            |
| `src/lib/cra-auto-assessment.server.ts`           | 5-rule auto-assessment (IEC 62443, CC, ISO 27001, NIS2, proportionality) |
| `src/app/api/cra/route.ts`                        | List + create assessments                                                |
| `src/app/api/cra/[assessmentId]/route.ts`         | Get + update + delete assessment                                         |
| `src/app/api/cra/requirements/route.ts`           | Requirement status CRUD                                                  |
| `src/app/api/cra/crosswalk/route.ts`              | CRA↔NIS2 compliance matrix                                               |
| `src/app/api/cra/classify/route.ts`               | Authenticated stateless classification                                   |
| `src/app/api/v1/compliance/cra/assess/route.ts`   | Public API: full assessment (redacted)                                   |
| `src/app/api/v1/compliance/cra/classify/route.ts` | Public API: classification + reasoning (top-of-funnel)                   |
| `src/app/dashboard/modules/cra/page.tsx`          | Dashboard list + wizard                                                  |
| `src/app/dashboard/modules/cra/[id]/page.tsx`     | Requirement tracking detail page                                         |
| `src/lib/astra/regulatory-knowledge/cra.ts`       | ASTRA AI knowledge file                                                  |

**Total: 16 new files, 9 modified files.**

---

## 15. Out of Scope (Phase 2+)

- **Procurer/Importer perspective** — inverted assessment: "Has my supplier fulfilled CRA?" Links to NIS2 Art. 21(2)(d) supply chain security.
- **Verity CRA attestation** — cryptographic attestation of classification reasoning chains.
- **Automated SBOM analysis** — parse uploaded SBOMs and map components to CRA requirements.
- **Notified Body workflow** — document preparation and submission tracking for Class II conformity assessment.
- **CRA + EU Space Act triple-mapping** — extend cross-references to include EU Space Act articles on cybersecurity.
- **Taxonomy expansion** — community-contributed product type submissions with review workflow.
