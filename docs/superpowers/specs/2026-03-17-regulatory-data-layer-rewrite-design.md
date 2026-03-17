# Regulatory Data Layer Rewrite — Design Spec

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan.

## Overview

Complete rewrite of the regulatory data layer from "EU Space Act Proposal-first" to "Enacted Law-first." The EU Space Act COM(2025) 335 remains as a secondary "readiness" mapping but is never presented as enacted law.

### Problem Statement

The entire platform currently bases its article references, compliance scoring, and document generation on COM(2025) 335 — a legislative proposal that has not been enacted. Article numbers are internally inconsistent across 5+ files. No legal disclaimer exists on outputs. An operator submitting documents that reference "Art. 67 EU Space Act" is referencing a law that doesn't exist.

### Design Principle

**Enacted law is the primary reference. Always.**

Every requirement, score, document section, and compliance matrix maps first to enacted international standards or national law. The EU Space Act proposal is a secondary mapping showing how current compliance prepares operators for the future regulation.

### Scope

- 4 new data layers (Standards, National Law, EU Space Act Proposal, Cross-References)
- 10 jurisdiction-specific data files replacing fragmented data across 6+ files
- Scoring engine rewrite: enacted compliance score + separate EU Space Act readiness
- Document template rewrite: enacted references primary, proposal references secondary
- Global disclaimer on every output

---

## Layer 1: International Standards (Enacted)

### Files to Create

| File                                                     | Source                          | Status    | Coverage                                   |
| -------------------------------------------------------- | ------------------------------- | --------- | ------------------------------------------ |
| `src/data/regulatory/standards/iadc-guidelines.ts`       | IADC-02-01 Rev.2 (2020)         | Published | Debris: 4 main areas, ~15 sub-requirements |
| `src/data/regulatory/standards/iso-24113.ts`             | ISO 24113:2019                  | Published | Debris: Section 6 core, ~25 requirements   |
| `src/data/regulatory/standards/copuos-lts.ts`            | COPUOS LTS Guidelines (2019)    | Published | Sustainability: A.1-A.7, B.1-B.10          |
| `src/data/regulatory/standards/nis2-directive.ts`        | (EU) 2022/2555                  | Enacted   | Cybersecurity: Art. 21(2)(a)-(j), Art. 23  |
| `src/data/regulatory/standards/iso-27001.ts`             | ISO/IEC 27001:2022              | Published | Cybersecurity: Annex A (93 controls)       |
| `src/data/regulatory/standards/ccsds-security.ts`        | CCSDS 350.1-G-3 (2022)          | Published | Space cyber threat taxonomy                |
| `src/data/regulatory/standards/itu-radio-regulations.ts` | ITU RR 2020 + WRC-23            | Enacted   | Spectrum allocation, filing process        |
| `src/data/regulatory/standards/itar-ear.ts`              | 22 CFR 120-130 / 15 CFR 730-774 | Enacted   | US export control                          |

### Requirement Data Model

```typescript
interface EnactedRequirement {
  id: string;
  source: {
    framework: string;
    reference: string;
    title: string;
    fullText: string;
    status: "enacted" | "published";
  };
  nationalImplementations: Array<{
    jurisdiction: string;
    reference: string;
    notes: string;
  }>;
  euSpaceActProposal: {
    articleRef: string | null;
    confidence: "direct" | "partial" | "inferred";
    disclaimer: "Based on COM(2025) 335 legislative proposal";
  } | null;
  category:
    | "debris"
    | "cybersecurity"
    | "spectrum"
    | "export_control"
    | "insurance"
    | "environmental";
  applicableTo: string[];
  priority: "mandatory" | "recommended" | "best_practice";
}
```

---

## Layer 2: National Law (Per Jurisdiction)

### Files to Create

| File                                               | Jurisdiction | Space Law                           | NCA            |
| -------------------------------------------------- | ------------ | ----------------------------------- | -------------- |
| `src/data/regulatory/jurisdictions/france.ts`      | FR           | LOS 2008 + RT 2024                  | CNES           |
| `src/data/regulatory/jurisdictions/germany.ts`     | DE           | SatDSiG + BSI-TR-03184 + NIS2UmsuCG | DLR/BSI/BNetzA |
| `src/data/regulatory/jurisdictions/uk.ts`          | GB           | SIA 2018 + OSA 1986                 | UKSA/CAA       |
| `src/data/regulatory/jurisdictions/netherlands.ts` | NL           | Space Activities Act 2007           | NSO            |
| `src/data/regulatory/jurisdictions/belgium.ts`     | BE           | Belgian Space Act 2005              | BELSPO         |
| `src/data/regulatory/jurisdictions/luxembourg.ts`  | LU           | Space Activities Act 2020           | LSA            |
| `src/data/regulatory/jurisdictions/austria.ts`     | AT           | Weltraumgesetz 2011                 | FFG            |
| `src/data/regulatory/jurisdictions/denmark.ts`     | DK           | Danish Outer Space Act 2016         | DTU Space      |
| `src/data/regulatory/jurisdictions/italy.ts`       | IT           | Legge Economia Spazio 2025          | ASI            |
| `src/data/regulatory/jurisdictions/norway.ts`      | NO           | Norwegian Space Act                 | NOSA           |

### Jurisdiction Data Model

```typescript
interface JurisdictionData {
  code: string;
  name: string;
  nca: {
    name: string;
    fullName: string;
    website: string;
    language: string;
    executiveSummaryLanguage: string;
  };
  spaceLaw: {
    name: string;
    citation: string;
    yearEnacted: number;
    yearAmended: number | null;
    status: "enacted" | "draft" | "none";
  } | null;
  additionalLaws: Array<{
    name: string;
    citation: string;
    scope: string;
    status: "enacted" | "draft";
  }>;
  requirements: NationalRequirement[];
  insurance: {
    minimumTPL: number | null;
    formula: string | null;
    cap: number | null;
    governmentGuarantee: boolean;
    legalBasis: string;
  };
  complianceMatrixFormat: {
    statusValues: string[];
    columns: string[];
    language: string;
  };
  rigor: Record<
    "debris" | "cybersecurity" | "general" | "safety",
    1 | 2 | 3 | 4 | 5
  >;
  requiredTools: Array<{
    name: string;
    description: string;
    mandatory: boolean;
  }>;
  acceptedEvidence: Array<{
    type: string;
    description: string;
    acceptedAsShortcut: boolean;
  }>;
  documentGuidance: Record<
    string,
    {
      depthExpectation: "standard" | "detailed" | "extensive";
      specificRequirements: string[];
      commonRejectionReasons: string[];
    }
  >;
  knowledgeBase: string;
}

interface NationalRequirement {
  id: string;
  nationalRef: {
    law: string;
    article: string;
    title: string;
    fullText: string;
  };
  standardsMapping: Array<{
    framework: string;
    reference: string;
    relationship: "implements" | "exceeds" | "equivalent";
  }>;
  euSpaceActProposal: {
    articleRef: string | null;
    confidence: "direct" | "partial" | "inferred";
  } | null;
  category:
    | "debris"
    | "cybersecurity"
    | "authorization"
    | "insurance"
    | "environmental"
    | "spectrum";
}
```

### Consolidation (what each jurisdiction file replaces)

**France:**

- `nca-profiles.ts` CNES profile → `france.ts` nca + rigor + documentGuidance
- `cnes-regulatory-knowledge.ts` → `france.ts` knowledgeBase
- `national-space-laws.ts` FR entry → `france.ts` spaceLaw + requirements
- `insurance-requirements.ts` FR entry → `france.ts` insurance

**Germany:**

- `nca-profiles.ts` BNetzA profile → `germany.ts` nca + rigor + documentGuidance
- `bnetza-regulatory-knowledge.ts` → `germany.ts` knowledgeBase
- `national-space-laws.ts` DE entry → `germany.ts` spaceLaw + requirements
- `insurance-requirements.ts` DE entry → `germany.ts` insurance

Same pattern for all 10 jurisdictions.

---

## Layer 3: EU Space Act Proposal

### File

`src/data/regulatory/eu-space-act-proposal.ts`

Single canonical file replacing `articles.ts`, the inconsistent article references in `debris-requirements.ts`, `cybersecurity-requirements.ts`, and the Astra knowledge base.

### Data Model

```typescript
interface EUSpaceActArticle {
  articleNumber: string;
  title: string;
  summary: string;
  titleNumber: number;
  chapter: string;
  status: "LEGISLATIVE_PROPOSAL";
  proposalRef: "COM(2025) 335";
  proposalDate: "2025-06-25";
  councilUpdate: "2025-12-05";
  disclaimer: string;
  enactedEquivalents: Array<{
    framework: string;
    reference: string;
    relationship: "codifies" | "extends" | "new_obligation";
  }>;
  category:
    | "debris"
    | "cybersecurity"
    | "authorization"
    | "insurance"
    | "environmental"
    | "spectrum"
    | "supervision"
    | "registration";
  applicableTo: string[];
}
```

### Relationship Types

| Type             | Meaning                                                        | User Message                                             |
| ---------------- | -------------------------------------------------------------- | -------------------------------------------------------- |
| `codifies`       | Enacted standard exists, EU Space Act makes it EU-wide binding | "You already need to comply with this"                   |
| `extends`        | Enacted standard exists, EU Space Act adds requirements        | "Current compliance covers ~80%, additional prep needed" |
| `new_obligation` | No enacted equivalent, entirely new EU Space Act requirement   | "No current obligation — future preparation only"        |

---

## Layer 4: Cross-Reference Map

### File

`src/data/regulatory/regulatory-map.ts`

### Data Model

```typescript
interface RegulatoryMapping {
  id: string;
  name: string;
  description: string;
  category: string;
  references: {
    international: Array<{
      framework: string;
      reference: string;
      status: "enacted" | "published";
    }>;
    national: Array<{
      jurisdiction: string;
      reference: string;
      status: "enacted";
    }>;
    euSpaceAct: {
      articleRef: string;
      relationship: "codifies" | "extends" | "new_obligation";
      status: "proposal";
    } | null;
  };
  confidence: "verified" | "interpreted";
}
```

---

## Scoring Engine Changes

### Enacted Compliance Score (Primary)

7 modules, all based on enacted law:

| Module                       | Weight | Based On                                                  |
| ---------------------------- | ------ | --------------------------------------------------------- |
| Debris Mitigation            | 20%    | IADC Guidelines + ISO 24113 + national (RT/SIA)           |
| Cybersecurity                | 20%    | NIS2 Art. 21 + ISO 27001 + national (BSI-TR/ANSSI)        |
| Authorization & Registration | 15%    | National space law + UN Registration Convention           |
| Insurance                    | 10%    | National TPL requirements                                 |
| Spectrum                     | 10%    | ITU RR + national frequency assignment                    |
| Export Control               | 10%    | ITAR/EAR compliance                                       |
| Space Operations             | 15%    | IADC Section 5.4 CA + Shield documentation + fleet health |

### EU Space Act Readiness Score (Separate)

Not part of the main compliance score. Computed as:

- Count enacted requirements that map to EU Space Act articles with `codifies` → already compliant
- Count enacted requirements that map with `extends` → partially ready
- Count `new_obligation` articles → not yet addressable
- Readiness % = (codifies_compliant + 0.5 \* extends_compliant) / total_mapped × 100

### Scoring Integrity Fixes

- `space_operations` module: score based on IADC CA compliance + Shield documentation (real facts), NOT feature activation
- `reporting` module: score based on national reporting obligations (RT Art. 36 Fait Technique, NIS2 Art. 23), NOT "zero reports = full score"
- `environmental` module: score based on ISO 14040/14044 LCA if applicable, NOT "zero suppliers = partial credit"
- No module scores based on platform engagement metrics (document upload count, audit log volume)

---

## Document Generator Changes

### Template Logic

When generating documents, the template system selects references based on jurisdiction:

```
IF jurisdiction selected:
  Primary: national law articles (RT Art. X, SIA Section Y)
  Secondary: international standards (IADC, ISO, NIS2)
  Tertiary: "Corresponds to EU Space Act Art. Z (COM(2025) 335, proposal)"
  Matrix format: national format (C/NC/PC/NA for FR, K/NK/TK/NA for DE)

IF no jurisdiction:
  Primary: international standards (IADC, ISO, NIS2)
  Secondary: "Corresponds to EU Space Act Art. Z (COM(2025) 335, proposal)"
  Matrix format: generic (Compliant/Non-Compliant/Partial/N-A)
```

### Compliance Matrix Format (in generated documents)

```
| Standard Reference | Requirement | National Implementation | Status | EU Space Act Mapping |
| IADC 5.1 / ISO 24113 §6.1 | Debris release prevention | RT Art. 40.1 (FR) | C | Art. 60 (Proposal) |
```

EU Space Act column is LAST, always marked "(Proposal)".

### Global Disclaimer

Every generated document includes:

```
REGULATORY BASIS: This document references enacted international standards
(IADC, ISO, COPUOS), enacted national law ([jurisdiction]), and the NIS2
Directive (EU) 2022/2555. EU Space Act references are based on the
legislative proposal COM(2025) 335 and may change during the legislative
process. This document does not constitute legal advice.
```

---

## Files to Create (New)

| Path                                                     | Purpose                                            |
| -------------------------------------------------------- | -------------------------------------------------- |
| `src/data/regulatory/standards/iadc-guidelines.ts`       | IADC debris requirements                           |
| `src/data/regulatory/standards/iso-24113.ts`             | ISO debris requirements                            |
| `src/data/regulatory/standards/copuos-lts.ts`            | COPUOS sustainability guidelines                   |
| `src/data/regulatory/standards/nis2-directive.ts`        | NIS2 cybersecurity requirements                    |
| `src/data/regulatory/standards/iso-27001.ts`             | ISO 27001 controls                                 |
| `src/data/regulatory/standards/ccsds-security.ts`        | Space cyber threat taxonomy                        |
| `src/data/regulatory/standards/itu-radio-regulations.ts` | ITU spectrum requirements                          |
| `src/data/regulatory/standards/itar-ear.ts`              | US export control requirements                     |
| `src/data/regulatory/jurisdictions/france.ts`            | FR: LOS + RT + CNES knowledge                      |
| `src/data/regulatory/jurisdictions/germany.ts`           | DE: SatDSiG + BSI-TR + NIS2UmsuCG knowledge        |
| `src/data/regulatory/jurisdictions/uk.ts`                | UK: SIA 2018 + OSA 1986                            |
| `src/data/regulatory/jurisdictions/netherlands.ts`       | NL: Space Activities Act 2007                      |
| `src/data/regulatory/jurisdictions/belgium.ts`           | BE: Belgian Space Act 2005                         |
| `src/data/regulatory/jurisdictions/luxembourg.ts`        | LU: Space Activities Act 2020                      |
| `src/data/regulatory/jurisdictions/austria.ts`           | AT: Weltraumgesetz 2011                            |
| `src/data/regulatory/jurisdictions/denmark.ts`           | DK: Danish Outer Space Act 2016                    |
| `src/data/regulatory/jurisdictions/italy.ts`             | IT: Legge Economia Spazio 2025                     |
| `src/data/regulatory/jurisdictions/norway.ts`            | NO: Norwegian Space Act                            |
| `src/data/regulatory/eu-space-act-proposal.ts`           | EU Space Act COM(2025) 335 (single canonical file) |
| `src/data/regulatory/regulatory-map.ts`                  | Cross-reference map connecting all layers          |
| `src/data/regulatory/index.ts`                           | Barrel exports + lookup functions                  |

## Files to Deprecate (Old)

| Path                                      | Replaced By                                                |
| ----------------------------------------- | ---------------------------------------------------------- |
| `src/data/articles.ts`                    | `eu-space-act-proposal.ts`                                 |
| `src/data/cybersecurity-requirements.ts`  | `standards/nis2-directive.ts` + `standards/iso-27001.ts`   |
| `src/data/debris-requirements.ts`         | `standards/iadc-guidelines.ts` + `standards/iso-24113.ts`  |
| `src/data/national-space-laws.ts`         | 10 jurisdiction files                                      |
| `src/data/insurance-requirements.ts`      | Insurance section in each jurisdiction file                |
| `src/data/nca-profiles.ts`                | NCA data in each jurisdiction file                         |
| `src/data/cnes-regulatory-knowledge.ts`   | `jurisdictions/france.ts` knowledgeBase                    |
| `src/data/bnetza-regulatory-knowledge.ts` | `jurisdictions/germany.ts` knowledgeBase                   |
| `src/data/copuos-iadc-requirements.ts`    | `standards/iadc-guidelines.ts` + `standards/copuos-lts.ts` |
| `src/data/environmental-requirements.ts`  | Distributed to relevant standards + jurisdictions          |
| `src/data/spectrum-itu-requirements.ts`   | `standards/itu-radio-regulations.ts`                       |
| `src/data/itar-ear-requirements.ts`       | `standards/itar-ear.ts`                                    |

## Files to Modify

| Path                                               | Change                                                   |
| -------------------------------------------------- | -------------------------------------------------------- |
| `src/lib/engine.server.ts`                         | Score against enacted standards, not proposal articles   |
| `src/lib/nis2-engine.server.ts`                    | Use consolidated NIS2 directive data                     |
| `src/lib/space-law-engine.server.ts`               | Use jurisdiction files instead of national-space-laws.ts |
| `src/lib/services/compliance-scoring-service.ts`   | Enacted score + separate readiness score                 |
| `src/lib/rrs-engine.server.ts`                     | Base on enacted compliance, not proposal                 |
| `src/lib/rcr-engine.server.ts`                     | Rating based on enacted compliance                       |
| `src/lib/generate/prompts/base-regulatory.ts`      | Reference enacted standards as primary                   |
| `src/lib/generate/prompts/quality-rules.ts`        | Compliance matrix with enacted primary columns           |
| `src/lib/generate/prompts/document-templates/*.ts` | All 9 P0 templates: enacted-first references             |
| `src/lib/generate/reasoning-prompt.ts`             | Use jurisdiction knowledgeBase instead of separate files |
| `src/lib/generate/nca-targeting.ts`                | Use jurisdiction data instead of nca-profiles            |
| `src/lib/astra/regulatory-knowledge/*.ts`          | Update to enacted-first knowledge                        |
| `src/components/generate2/Generate2Page.tsx`       | Add disclaimer to PDF export options                     |
| `src/app/dashboard/page.tsx`                       | Enacted score primary, readiness score secondary         |

## Implementation Phases

This is too large for a single implementation cycle. Recommended decomposition:

**Phase 1: Data Layer** (1-2 weeks)

- Create all Layer 1-4 files
- Build index.ts with lookup functions
- Tests for data consistency (no conflicting article numbers)

**Phase 2: Engine Migration** (1-2 weeks)

- Migrate compliance-scoring-service to enacted standards
- Add EU Space Act Readiness as separate score
- Fix scoring integrity issues (feature activation ≠ compliance)

**Phase 3: Document Generator Migration** (1 week)

- Update base-regulatory.ts and quality-rules.ts prompts
- Update 9 P0 document templates
- Update compliance matrix format
- Add global disclaimer

**Phase 4: UI + Astra + Cleanup** (1 week)

- Dashboard: show enacted score + readiness score
- Astra knowledge base: update to enacted-first
- Deprecate old data files
- Add disclaimers to all outputs
