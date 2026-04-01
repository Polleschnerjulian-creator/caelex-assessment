# CRA Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add EU Cyber Resilience Act (CRA) compliance module with Space Product Taxonomy, product classification engine, and bidirectional NIS2 cross-mapping.

**Architecture:** NIS2-Clone with Cross-Mapping Layer (Ansatz C). Independent files replicating the NIS2 engine pattern, with a dedicated cross-regulation layer for CRA↔NIS2 bidirectional mapping. No shared-core refactoring.

**Tech Stack:** Next.js 15 (App Router), TypeScript (strict), Prisma 5, Vitest, Zod, AES-256-GCM encryption.

**Spec:** `docs/superpowers/specs/2026-04-01-cra-engine-design.md`

---

## File Map

### New Files (16)

| File                                              | Responsibility                                                                   |
| ------------------------------------------------- | -------------------------------------------------------------------------------- |
| `src/lib/cra-types.ts`                            | All CRA type definitions (classifications, answers, requirements, results)       |
| `src/data/cra-taxonomy.ts`                        | 19 Space product types with classification reasoning chains                      |
| `src/data/cra-requirements.ts`                    | ~40 CRA requirements (Annex I + Art. 13-14) with assessment fields               |
| `src/lib/cra-rule-engine.server.ts`               | Rule-based product classification for hybrid/unlisted products                   |
| `src/lib/cra-engine.server.ts`                    | Scope check + classification orchestration + compliance calculation              |
| `src/lib/cra-auto-assessment.server.ts`           | 5-rule auto-assessment (IEC 62443, CC, ISO 27001, NIS2 overlap, proportionality) |
| `src/app/api/cra/route.ts`                        | List + create CRA assessments (authenticated)                                    |
| `src/app/api/cra/[assessmentId]/route.ts`         | Get + update + delete individual assessment                                      |
| `src/app/api/cra/requirements/route.ts`           | Requirement status CRUD with encryption                                          |
| `src/app/api/cra/crosswalk/route.ts`              | CRA↔NIS2 compliance matrix                                                       |
| `src/app/api/cra/classify/route.ts`               | Authenticated stateless classification                                           |
| `src/app/api/v1/compliance/cra/classify/route.ts` | Public unauthenticated classification (top-of-funnel)                            |
| `src/app/api/v1/compliance/cra/assess/route.ts`   | Public API: full assessment (API key, redacted)                                  |
| `src/app/dashboard/modules/cra/page.tsx`          | Dashboard list + inline wizard                                                   |
| `src/app/dashboard/modules/cra/[id]/page.tsx`     | Requirement tracking detail page                                                 |
| `src/lib/astra/regulatory-knowledge/cra.ts`       | ASTRA AI CRA knowledge file                                                      |

### Modified Files (9)

| File                                               | Change                                                     |
| -------------------------------------------------- | ---------------------------------------------------------- |
| `src/data/articles.ts:22-32`                       | Add `"cra"` to `ComplianceModule` union                    |
| `src/data/modules.ts:113-122`                      | Add CRA entry after NIS2 in `modules[]`                    |
| `src/lib/nis2-types.ts:144-150`                    | Add `"cra"` to `RegulationType` union                      |
| `src/data/cross-references.ts:708-720`             | Add ~30 CRA↔NIS2 cross-reference entries after `xref-047`  |
| `src/lib/unified-assessment-mappers.server.ts:219` | Add `mapToCRAAnswers()` function                           |
| `src/lib/validations/api-compliance.ts:63`         | Add `CRAAssessSchema` + `CRAClassifySchema`                |
| `prisma/schema.prisma:510`                         | Add `CRAAssessment` + `CRARequirementStatus` models        |
| `prisma/schema.prisma:54`                          | Add `craAssessments CRAAssessment[]` to User model         |
| `prisma/schema.prisma:2544`                        | Add `craAssessments CRAAssessment[]` to Organization model |

---

## Task 1: CRA Type System

**Files:**

- Create: `src/lib/cra-types.ts`

This is the foundation. Every other file imports from here.

- [ ] **Step 1: Create CRA type definitions**

Create `src/lib/cra-types.ts` with the complete type system. This file mirrors `src/lib/nis2-types.ts` but is product-centric instead of entity-centric.

```typescript
/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * CRA (EU) 2024/2847 compliance type definitions.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { NIS2SpaceSubSector } from "./nis2-types";
import type { AssessmentField, ComplianceRule } from "@/lib/compliance/types";

// ─── CRA Product Classification ───

export type CRAProductClass = "default" | "class_I" | "class_II";

export type CRAConformityRoute =
  | "self_assessment" // Default: Annex VIII (internal control)
  | "harmonised_standard" // Class I Option A: Annex VIII + harmonised standard
  | "third_party_type_exam" // Class I Option B / Class II: Annex VII (EU type examination)
  | "full_quality_assurance"; // Class II alternative: Annex VI

export type CRAEconomicOperatorRole =
  | "manufacturer"
  | "importer"
  | "distributor";

// ─── Space Product Segment ───

export type SpaceProductSegment = "space" | "ground" | "link" | "user";

// ─── Classification Reasoning Chain ───

export interface ClassificationStep {
  criterion: string;
  legalBasis: string;
  annexRef: string;
  annexCategory?: string;
  satisfied: boolean;
  reasoning: string;
}

// ─── Space Product Taxonomy Entry ───

export interface CRASpaceProductType {
  id: string;
  name: string;
  segments: SpaceProductSegment[];
  description: string;
  classification: CRAProductClass;
  conformityRoute: CRAConformityRoute;
  classificationReasoning: ClassificationStep[];
  nis2SubSectors: NIS2SpaceSubSector[];
}

// ─── Classification Conflict ───

export interface ClassificationConflict {
  taxonomyClass: CRAProductClass;
  ruleEngineClass: CRAProductClass;
  conflictingSteps: ClassificationStep[];
  recommendation: string;
}

// ─── Assessment Input ───

export interface CRAAssessmentAnswers {
  economicOperatorRole: CRAEconomicOperatorRole;
  isEUEstablished: boolean | null;

  spaceProductTypeId: string | null;
  productName: string;
  productVersion?: string;

  hasNetworkFunction: boolean | null;
  processesAuthData: boolean | null;
  usedInCriticalInfra: boolean | null;
  performsCryptoOps: boolean | null;
  controlsPhysicalSystem: boolean | null;
  hasMicrocontroller: boolean | null;
  isOSSComponent: boolean | null;
  isCommerciallySupplied: boolean | null;

  segments: SpaceProductSegment[];
  isSafetyCritical: boolean | null;
  hasRedundancy: boolean | null;
  processesClassifiedData: boolean | null;

  hasIEC62443: boolean | null;
  hasETSIEN303645: boolean | null;
  hasCommonCriteria: boolean | null;
  hasISO27001: boolean | null;
}

// ─── CRA Requirement Categories (Annex I structure) ───

export type CRARequirementCategory =
  | "security_by_design"
  | "vulnerability_handling"
  | "documentation"
  | "conformity_assessment"
  | "incident_reporting"
  | "post_market_obligations"
  | "software_update"
  | "sbom"
  | "support_period";

export type CRARequirementSeverity = "critical" | "major" | "minor";

// ─── CRA Requirement ───

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
  nis2Ref?: string;
  nis2RequirementIds?: string[];
  iso27001Ref?: string;
  iec62443Ref?: string;
  ecssRef?: string;
  assessmentFields: AssessmentField[];
  complianceRule: ComplianceRule;
  severity: CRARequirementSeverity;
  implementationTimeWeeks: number;
  canBeSimplified: boolean;
}

// ─── Engine Output ───

export interface CRAComplianceResult {
  productClassification: CRAProductClass;
  classificationReasoning: ClassificationStep[];
  conformityRoute: CRAConformityRoute;
  conflict?: ClassificationConflict;
  applicableRequirements: CRARequirement[];
  nis2Overlap: {
    overlappingRequirementCount: number;
    overlappingRequirements: Array<{
      craRequirementId: string;
      nis2RequirementId: string;
      relationship: "implements" | "overlaps" | "extends";
    }>;
    estimatedSavingsRange: { min: number; max: number };
    disclaimer: string;
  };
  supportPeriodYears: number;
  reportingTimeline: {
    activelyExploitedVuln: string;
    severeIncident: string;
    patchRelease: string;
  };
  penalties: {
    maxFine: string;
    calculationBasis: string;
  };
  keyDates: Array<{ date: string; description: string; articleRef: string }>;
}

export interface RedactedCRAComplianceResult {
  productClassification: CRAProductClass;
  classificationReasoning: ClassificationStep[];
  conformityRoute: CRAConformityRoute;
  applicableRequirementCount: number;
  nis2OverlapCount: number;
}

// ─── Auto-Assessment Types ───

export interface CRAAutoAssessmentResult {
  requirementId: string;
  suggestedStatus: "partial" | "not_assessed";
  reason: string;
  proportionalityNote?: string;
  priorityFlags: string[];
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit src/lib/cra-types.ts 2>&1 | head -20`

Expected: No errors (or only errors from missing imports that will be resolved in later tasks). The imports from `./nis2-types` and `@/lib/compliance/types` should resolve since those files exist.

- [ ] **Step 3: Commit**

```bash
git add src/lib/cra-types.ts
git commit -m "feat(cra): add CRA type system

Product-centric type definitions for EU Cyber Resilience Act (CRA)
compliance module. Includes classification types, reasoning chain
interface, assessment answers, requirement structure, and engine output."
```

---

## Task 2: Space Product Taxonomy

**Files:**

- Create: `src/data/cra-taxonomy.ts`

The 19 curated Space product types with full Notified-Body-grade classification reasoning chains. This is the differentiating asset.

- [ ] **Step 1: Create taxonomy file with all 19 product types**

Create `src/data/cra-taxonomy.ts`. Each entry must have a complete `classificationReasoning: ClassificationStep[]` array with legal references. The file is organized by classification class (II → I → Default).

```typescript
/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Space Product Taxonomy for CRA (EU) 2024/2847 classification.
 * 19 curated product types with Notified-Body-grade reasoning chains.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { CRASpaceProductType } from "@/lib/cra-types";

// ─── Class II Products — Third-Party Assessment Mandatory (Annex IV) ───

const CLASS_II_PRODUCTS: CRASpaceProductType[] = [
  {
    id: "obc",
    name: "On-board Computer",
    segments: ["space"],
    description:
      "Central spacecraft bus computer controlling AOCS, thermal management, TT&C routing, and payload scheduling. Executes flight software and processes telecommand authentication.",
    classification: "class_II",
    conformityRoute: "third_party_type_exam",
    classificationReasoning: [
      {
        criterion: "Product with digital elements",
        legalBasis: "Art. 3 Nr. 1 CRA (EU) 2024/2847",
        annexRef: "N/A",
        satisfied: true,
        reasoning:
          "On-board Computer is hardware with embedded software that maintains a data connection to the spacecraft bus (SpaceWire/MIL-STD-1553).",
      },
      {
        criterion:
          "Product controlling physical systems in critical infrastructure",
        legalBasis: "Art. 7(2) i.V.m. Annex IV Kategorie 1",
        annexRef: "Annex IV",
        annexCategory: "1",
        satisfied: true,
        reasoning:
          "Satellite systems are critical infrastructure under NIS2 Annex I Sector 11 (Space). The OBC controls central spacecraft bus logic including AOCS, thermal management, and TT&C routing — failure leads to complete mission loss.",
      },
      {
        criterion: "Product whose failure can generate space debris",
        legalBasis: "Erwägungsgrund 29 CRA i.V.m. Annex IV Kategorie 1",
        annexRef: "Annex IV",
        annexCategory: "1",
        satisfied: true,
        reasoning:
          "OBC failure during collision avoidance maneuvers can result in conjunction events and debris generation (IADC Guideline 5.2.3). Unlike ground-based systems, OBC failures in orbit are irreversible.",
      },
      {
        criterion: "Product processing authentication data",
        legalBasis: "Annex IV Kategorie 2",
        annexRef: "Annex IV",
        annexCategory: "2",
        satisfied: true,
        reasoning:
          "OBC processes TT&C authentication sequences for telecommand verification — unauthorized access enables complete spacecraft control.",
      },
    ],
    nis2SubSectors: ["ground_infrastructure", "satellite_communications"],
  },
  {
    id: "aocs_flight_sw",
    name: "AOCS Flight Software",
    segments: ["space"],
    description:
      "Attitude and Orbit Control System flight software. Controls spacecraft attitude determination, orbit maintenance, and collision avoidance maneuvers.",
    classification: "class_II",
    conformityRoute: "third_party_type_exam",
    classificationReasoning: [
      {
        criterion: "Product with digital elements",
        legalBasis: "Art. 3 Nr. 1 CRA (EU) 2024/2847",
        annexRef: "N/A",
        satisfied: true,
        reasoning:
          "AOCS flight software is embedded software that maintains a data connection to spacecraft bus sensors (star trackers, gyroscopes) and actuators (reaction wheels, thrusters).",
      },
      {
        criterion:
          "Product controlling physical systems in critical infrastructure",
        legalBasis: "Art. 7(2) i.V.m. Annex IV Kategorie 1",
        annexRef: "Annex IV",
        annexCategory: "1",
        satisfied: true,
        reasoning:
          "AOCS directly controls spacecraft attitude and orbital position. Satellite systems are critical infrastructure under NIS2 Annex I Sector 11. AOCS malfunction has immediate physical consequences: uncontrolled tumbling, orbit deviation, collision risk.",
      },
      {
        criterion: "Product whose failure can generate space debris",
        legalBasis: "Erwägungsgrund 29 CRA i.V.m. Annex IV Kategorie 1",
        annexRef: "Annex IV",
        annexCategory: "1",
        satisfied: true,
        reasoning:
          "AOCS failure during collision avoidance maneuvers can result in conjunction events and debris generation (IADC Guideline 5.2.3). Unlike ground-based industrial control, AOCS failures in orbit are irreversible — no physical intervention possible.",
      },
      {
        criterion: "Product performing safety-critical computations",
        legalBasis: "Annex IV Kategorie 1, ECSS-Q-ST-80C",
        annexRef: "Annex IV",
        annexCategory: "1",
        satisfied: true,
        reasoning:
          "AOCS performs real-time attitude determination and orbit propagation calculations. Error in attitude knowledge directly affects pointing accuracy for communication antennas and solar arrays, potentially leading to loss of mission.",
      },
    ],
    nis2SubSectors: ["ground_infrastructure", "satellite_communications"],
  },
  {
    id: "ttc_ground_system",
    name: "TT&C Ground System",
    segments: ["ground"],
    description:
      "Telemetry, Tracking & Command ground system. Processes spacecraft telemetry, generates and authenticates telecommands, manages encryption keys for uplink/downlink.",
    classification: "class_II",
    conformityRoute: "third_party_type_exam",
    classificationReasoning: [
      {
        criterion: "Product with digital elements",
        legalBasis: "Art. 3 Nr. 1 CRA (EU) 2024/2847",
        annexRef: "N/A",
        satisfied: true,
        reasoning:
          "TT&C ground system is software/hardware that maintains network connections to antenna systems, spacecraft via RF link, and mission control networks.",
      },
      {
        criterion: "Product processing authentication and authorization data",
        legalBasis: "Annex IV Kategorie 2",
        annexRef: "Annex IV",
        annexCategory: "2",
        satisfied: true,
        reasoning:
          "TT&C ground systems process spacecraft authentication sequences, command authorization tokens, and telecommand encryption keys. Compromise enables unauthorized spacecraft control.",
      },
      {
        criterion:
          "Product performing cryptographic operations for critical infrastructure",
        legalBasis: "Annex IV Kategorie 3",
        annexRef: "Annex IV",
        annexCategory: "3",
        satisfied: true,
        reasoning:
          "TT&C systems perform encryption/decryption of telecommand uplinks and telemetry downlinks using space-grade cryptographic algorithms. Key management is integral to spacecraft security.",
      },
    ],
    nis2SubSectors: ["ground_infrastructure"],
  },
  {
    id: "mission_control_sw",
    name: "Mission Control Software",
    segments: ["ground"],
    description:
      "Central command and control software for satellite fleet management. Manages mission planning, pass scheduling, anomaly detection, and operator workflows.",
    classification: "class_II",
    conformityRoute: "third_party_type_exam",
    classificationReasoning: [
      {
        criterion: "Product with digital elements",
        legalBasis: "Art. 3 Nr. 1 CRA (EU) 2024/2847",
        annexRef: "N/A",
        satisfied: true,
        reasoning:
          "Mission control software is networked software connecting operators, ground stations, spacecraft interfaces, and mission databases.",
      },
      {
        criterion: "Product controlling critical infrastructure systems",
        legalBasis: "Art. 7(2) i.V.m. Annex IV Kategorie 1",
        annexRef: "Annex IV",
        annexCategory: "1",
        satisfied: true,
        reasoning:
          "Mission control is the central C2 system for satellite fleet operations. It orchestrates all spacecraft commanding, health monitoring, and contingency responses. Compromise or failure affects the entire satellite constellation.",
      },
      {
        criterion: "Network management system for critical infrastructure",
        legalBasis: "Annex IV Kategorie 1",
        annexRef: "Annex IV",
        annexCategory: "1",
        satisfied: true,
        reasoning:
          "Mission control manages the ground segment network topology, ground station scheduling, and inter-facility communications — meeting the CRA definition of network management for critical infrastructure.",
      },
    ],
    nis2SubSectors: ["ground_infrastructure"],
  },
  {
    id: "satellite_c2",
    name: "Satellite Command & Control System",
    segments: ["ground"],
    description:
      "Dedicated system for spacecraft commanding and telemetry processing. Handles command authorization, authentication, and real-time spacecraft state monitoring.",
    classification: "class_II",
    conformityRoute: "third_party_type_exam",
    classificationReasoning: [
      {
        criterion: "Product with digital elements",
        legalBasis: "Art. 3 Nr. 1 CRA (EU) 2024/2847",
        annexRef: "N/A",
        satisfied: true,
        reasoning:
          "Satellite C2 is networked software processing spacecraft telemetry and generating authenticated telecommands.",
      },
      {
        criterion: "Product processing authentication and authorization data",
        legalBasis: "Annex IV Kategorie 2",
        annexRef: "Annex IV",
        annexCategory: "2",
        satisfied: true,
        reasoning:
          "C2 system manages operator authentication, command authorization workflows, and spacecraft access control. Unauthorized access to C2 enables direct spacecraft commanding.",
      },
      {
        criterion: "Product in critical infrastructure with control function",
        legalBasis: "Art. 7(2) i.V.m. Annex IV Kategorie 1",
        annexRef: "Annex IV",
        annexCategory: "1",
        satisfied: true,
        reasoning:
          "C2 system directly controls spacecraft operations. Loss of C2 integrity can result in unauthorized maneuvers, telemetry spoofing, or mission disruption.",
      },
    ],
    nis2SubSectors: ["ground_infrastructure", "satellite_communications"],
  },
  {
    id: "hsm_space",
    name: "Hardware Security Module (Space-grade)",
    segments: ["space"],
    description:
      "Radiation-hardened cryptographic hardware module for on-board key management, telecommand authentication, and payload data encryption.",
    classification: "class_II",
    conformityRoute: "third_party_type_exam",
    classificationReasoning: [
      {
        criterion: "Product with digital elements",
        legalBasis: "Art. 3 Nr. 1 CRA (EU) 2024/2847",
        annexRef: "N/A",
        satisfied: true,
        reasoning:
          "Space-grade HSM is hardware with embedded firmware performing cryptographic operations on the spacecraft bus.",
      },
      {
        criterion: "Cryptographic device for key management",
        legalBasis: "Annex IV Kategorie 3",
        annexRef: "Annex IV",
        annexCategory: "3",
        satisfied: true,
        reasoning:
          "HSM performs key generation, storage, and cryptographic operations for spacecraft authentication. Compromise of the HSM invalidates all on-board security mechanisms.",
      },
      {
        criterion: "Product in critical infrastructure",
        legalBasis: "Art. 7(2) i.V.m. Annex IV Kategorie 3",
        annexRef: "Annex IV",
        annexCategory: "3",
        satisfied: true,
        reasoning:
          "Space-grade HSMs protect the cryptographic foundation of satellite communications, which are NIS2 Annex I Sector 11 critical infrastructure.",
      },
    ],
    nis2SubSectors: ["satellite_communications"],
  },
];

// ─── Class I Products — Harmonised Standard or Third-Party (Annex III) ───

const CLASS_I_PRODUCTS: CRASpaceProductType[] = [
  {
    id: "sdr",
    name: "Software-Defined Radio",
    segments: ["space", "link"],
    description:
      "Reconfigurable radio transceiver for intersatellite links and ground communication. Supports multiple waveforms and frequency bands via software updates.",
    classification: "class_I",
    conformityRoute: "harmonised_standard",
    classificationReasoning: [
      {
        criterion: "Product with digital elements",
        legalBasis: "Art. 3 Nr. 1 CRA (EU) 2024/2847",
        annexRef: "N/A",
        satisfied: true,
        reasoning:
          "SDR is hardware with embedded software maintaining RF communication links between spacecraft and ground stations or other satellites.",
      },
      {
        criterion: "Network-capable product in critical infrastructure",
        legalBasis: "Annex III Kategorie 2.1",
        annexRef: "Annex III",
        annexCategory: "2.1",
        satisfied: true,
        reasoning:
          "SDR provides the physical network interface for satellite communications. It is a configurable network device deployed in NIS2 Annex I critical infrastructure.",
      },
      {
        criterion: "Product performing cryptographic communication",
        legalBasis: "Annex III Kategorie 2.3",
        annexRef: "Annex III",
        annexCategory: "2.3",
        satisfied: true,
        reasoning:
          "SDRs typically perform link-layer encryption for intersatellite and ground links, meeting the definition of products implementing cryptographic protocols.",
      },
    ],
    nis2SubSectors: ["satellite_communications"],
  },
  {
    id: "gnss_receiver",
    name: "GNSS Receiver (embedded)",
    segments: ["space", "user"],
    description:
      "Embedded GNSS receiver for spacecraft position determination. Used in orbit determination, autonomous navigation, and timing synchronization.",
    classification: "class_I",
    conformityRoute: "harmonised_standard",
    classificationReasoning: [
      {
        criterion: "Product with digital elements",
        legalBasis: "Art. 3 Nr. 1 CRA (EU) 2024/2847",
        annexRef: "N/A",
        satisfied: true,
        reasoning:
          "GNSS receiver is hardware with embedded software processing satellite navigation signals and outputting position/velocity/time data to the spacecraft bus.",
      },
      {
        criterion:
          "Product processing positioning data in safety-relevant context",
        legalBasis: "Annex III Kategorie 2.4",
        annexRef: "Annex III",
        annexCategory: "2.4",
        satisfied: true,
        reasoning:
          "GNSS receivers on spacecraft provide positioning data used for orbit determination and collision avoidance — safety-relevant applications where spoofed or degraded signals can lead to incorrect maneuver decisions.",
      },
    ],
    nis2SubSectors: ["navigation", "space_situational_awareness"],
  },
  {
    id: "ground_station_sw",
    name: "Ground Station Software",
    segments: ["ground"],
    description:
      "Software for antenna tracking, RF signal processing, and ground station automation. Manages pass scheduling, signal acquisition, and data routing.",
    classification: "class_I",
    conformityRoute: "harmonised_standard",
    classificationReasoning: [
      {
        criterion: "Product with digital elements",
        legalBasis: "Art. 3 Nr. 1 CRA (EU) 2024/2847",
        annexRef: "N/A",
        satisfied: true,
        reasoning:
          "Ground station software is networked software controlling antenna systems, RF equipment, and data routing infrastructure.",
      },
      {
        criterion: "Network management product",
        legalBasis: "Annex III Kategorie 2.2",
        annexRef: "Annex III",
        annexCategory: "2.2",
        satisfied: true,
        reasoning:
          "Ground station software manages the configuration and operation of antenna systems and RF network equipment, meeting the CRA definition of network management software.",
      },
    ],
    nis2SubSectors: ["ground_infrastructure"],
  },
  {
    id: "data_handling_unit",
    name: "Data Handling Unit",
    segments: ["space"],
    description:
      "Spacecraft data handling subsystem. Manages onboard data routing, packetization, and storage. Interfaces with payload instruments and spacecraft bus via SpaceWire or similar.",
    classification: "class_I",
    conformityRoute: "harmonised_standard",
    classificationReasoning: [
      {
        criterion: "Product with digital elements",
        legalBasis: "Art. 3 Nr. 1 CRA (EU) 2024/2847",
        annexRef: "N/A",
        satisfied: true,
        reasoning:
          "Data handling unit is hardware with embedded software maintaining data connections across the spacecraft bus network.",
      },
      {
        criterion: "Network-capable product with microcontroller",
        legalBasis: "Annex III Kategorie 2.1",
        annexRef: "Annex III",
        annexCategory: "2.1",
        satisfied: true,
        reasoning:
          "DHU contains a microcontroller with network interfaces (SpaceWire/MIL-STD-1553) to the spacecraft bus, routing data between payload instruments and the OBC/downlink chain.",
      },
    ],
    nis2SubSectors: ["satellite_communications", "earth_observation"],
  },
  {
    id: "intersatellite_link",
    name: "Intersatellite Link Terminal",
    segments: ["link"],
    description:
      "Optical or RF terminal for direct satellite-to-satellite communication. Enables mesh networking in constellations and data relay between spacecraft.",
    classification: "class_I",
    conformityRoute: "harmonised_standard",
    classificationReasoning: [
      {
        criterion: "Product with digital elements",
        legalBasis: "Art. 3 Nr. 1 CRA (EU) 2024/2847",
        annexRef: "N/A",
        satisfied: true,
        reasoning:
          "ISL terminal is hardware with embedded software establishing and maintaining data links between spacecraft.",
      },
      {
        criterion: "Network interface product",
        legalBasis: "Annex III Kategorie 2.1",
        annexRef: "Annex III",
        annexCategory: "2.1",
        satisfied: true,
        reasoning:
          "ISL terminals are the network interface devices enabling intersatellite communication networks, directly meeting the definition of network-capable products.",
      },
      {
        criterion: "Product implementing cryptographic protocols",
        legalBasis: "Annex III Kategorie 2.3",
        annexRef: "Annex III",
        annexCategory: "2.3",
        satisfied: true,
        reasoning:
          "ISL terminals typically implement link-layer encryption for data relay between spacecraft, using space-grade cryptographic protocols.",
      },
    ],
    nis2SubSectors: ["satellite_communications"],
  },
  {
    id: "flight_software",
    name: "Flight Software (non-AOCS)",
    segments: ["space"],
    description:
      "General spacecraft flight software for housekeeping, thermal control, power management, and mode transitions. Excludes AOCS which is a separate Class II product.",
    classification: "class_I",
    conformityRoute: "harmonised_standard",
    classificationReasoning: [
      {
        criterion: "Product with digital elements",
        legalBasis: "Art. 3 Nr. 1 CRA (EU) 2024/2847",
        annexRef: "N/A",
        satisfied: true,
        reasoning:
          "Flight software is embedded software running on the OBC that interfaces with spacecraft subsystems via the bus network.",
      },
      {
        criterion: "Embedded software with network function",
        legalBasis: "Annex III Kategorie 2.1",
        annexRef: "Annex III",
        annexCategory: "2.1",
        satisfied: true,
        reasoning:
          "Flight software communicates over the spacecraft bus (SpaceWire/CAN/MIL-STD-1553), managing subsystem commands and telemetry collection. While not safety-critical like AOCS, it controls power and thermal subsystems critical to mission success.",
      },
    ],
    nis2SubSectors: ["satellite_communications"],
  },
  {
    id: "payload_processor",
    name: "Payload Data Processor",
    segments: ["space"],
    description:
      "Onboard processor for mission payload data. Performs data compression, formatting, encryption, and buffering for downlink. Used in EO, SAR, and SIGINT missions.",
    classification: "class_I",
    conformityRoute: "harmonised_standard",
    classificationReasoning: [
      {
        criterion: "Product with digital elements",
        legalBasis: "Art. 3 Nr. 1 CRA (EU) 2024/2847",
        annexRef: "N/A",
        satisfied: true,
        reasoning:
          "Payload data processor is hardware with embedded software that receives, processes, and routes mission data for downlink.",
      },
      {
        criterion: "Network-capable product with microcontroller",
        legalBasis: "Annex III Kategorie 2.1",
        annexRef: "Annex III",
        annexCategory: "2.1",
        satisfied: true,
        reasoning:
          "Payload processor contains microcontrollers with network interfaces to the spacecraft bus and downlink chain. Processes potentially sensitive EO/SAR data requiring data integrity guarantees.",
      },
    ],
    nis2SubSectors: ["earth_observation"],
  },
  {
    id: "ground_network_infra",
    name: "Ground Network Infrastructure",
    segments: ["ground"],
    description:
      "Network equipment in the ground segment: firewalls, routers, switches, and VPN gateways connecting ground stations, mission control, and data centers.",
    classification: "class_I",
    conformityRoute: "harmonised_standard",
    classificationReasoning: [
      {
        criterion: "Product with digital elements",
        legalBasis: "Art. 3 Nr. 1 CRA (EU) 2024/2847",
        annexRef: "N/A",
        satisfied: true,
        reasoning:
          "Network infrastructure devices are hardware/software products with network connectivity by definition.",
      },
      {
        criterion: "Network management and security product",
        legalBasis: "Annex III Kategorie 2.2",
        annexRef: "Annex III",
        annexCategory: "2.2",
        satisfied: true,
        reasoning:
          "Firewalls, routers, and switches in the space ground segment are network security products explicitly listed in CRA Annex III Category 2.2.",
      },
    ],
    nis2SubSectors: ["ground_infrastructure"],
  },
  {
    id: "key_management_sw",
    name: "Key Management Software",
    segments: ["ground"],
    description:
      "Software for managing cryptographic keys used in spacecraft commanding, telemetry decryption, and intersatellite link encryption. Handles key generation, distribution, rotation, and revocation.",
    classification: "class_I",
    conformityRoute: "harmonised_standard",
    classificationReasoning: [
      {
        criterion: "Product with digital elements",
        legalBasis: "Art. 3 Nr. 1 CRA (EU) 2024/2847",
        annexRef: "N/A",
        satisfied: true,
        reasoning:
          "Key management software is a networked application managing cryptographic material across ground segment systems.",
      },
      {
        criterion: "Product performing cryptographic operations",
        legalBasis: "Annex III Kategorie 2.3",
        annexRef: "Annex III",
        annexCategory: "2.3",
        satisfied: true,
        reasoning:
          "Key management software generates, stores, and distributes cryptographic keys. While not a hardware HSM (which would be Class II under Annex IV Kat. 3), the software component handles key lifecycle operations that are critical to spacecraft communication security.",
      },
    ],
    nis2SubSectors: ["ground_infrastructure", "satellite_communications"],
  },
];

// ─── Default Products — Self-Assessment (Annex VIII) ───

const DEFAULT_PRODUCTS: CRASpaceProductType[] = [
  {
    id: "star_tracker",
    name: "Star Tracker",
    segments: ["space"],
    description:
      "Optical sensor for spacecraft attitude determination. Captures star field images and matches against onboard star catalog to compute pointing direction.",
    classification: "default",
    conformityRoute: "self_assessment",
    classificationReasoning: [
      {
        criterion: "Product with digital elements",
        legalBasis: "Art. 3 Nr. 1 CRA (EU) 2024/2847",
        annexRef: "N/A",
        satisfied: true,
        reasoning:
          "Star tracker contains embedded processing for star pattern recognition, meeting the basic CRA product definition.",
      },
      {
        criterion: "Network-capable product",
        legalBasis: "Annex III Kategorie 2.1",
        annexRef: "Annex III",
        annexCategory: "2.1",
        satisfied: false,
        reasoning:
          "Star tracker provides attitude data over the spacecraft bus but does not have an independent network function. It is a sensor providing unidirectional data output, not a networked device.",
      },
      {
        criterion: "Product processing authentication data",
        legalBasis: "Annex IV Kategorie 2",
        annexRef: "Annex IV",
        annexCategory: "2",
        satisfied: false,
        reasoning:
          "Star tracker does not process authentication credentials, authorization tokens, or cryptographic material.",
      },
    ],
    nis2SubSectors: [],
  },
  {
    id: "reaction_wheel",
    name: "Reaction Wheel (with embedded controller)",
    segments: ["space"],
    description:
      "Momentum exchange actuator for spacecraft attitude control. Contains an embedded motor controller but no independent processing or network capability.",
    classification: "default",
    conformityRoute: "self_assessment",
    classificationReasoning: [
      {
        criterion: "Product with digital elements",
        legalBasis: "Art. 3 Nr. 1 CRA (EU) 2024/2847",
        annexRef: "N/A",
        satisfied: true,
        reasoning:
          "Reaction wheel contains an embedded motor controller with firmware, meeting the basic CRA product definition.",
      },
      {
        criterion: "Network-capable product",
        legalBasis: "Annex III Kategorie 2.1",
        annexRef: "Annex III",
        annexCategory: "2.1",
        satisfied: false,
        reasoning:
          "Reaction wheel's embedded controller receives commanded torque values from the OBC but has no independent network function. It is a peripheral actuator, not a networked device.",
      },
    ],
    nis2SubSectors: [],
  },
  {
    id: "solar_array_driver",
    name: "Solar Array Drive Mechanism (SADM)",
    segments: ["space"],
    description:
      "Electromechanical actuator for solar panel positioning. Contains simple control electronics for motor driving and position sensing.",
    classification: "default",
    conformityRoute: "self_assessment",
    classificationReasoning: [
      {
        criterion: "Product with digital elements",
        legalBasis: "Art. 3 Nr. 1 CRA (EU) 2024/2847",
        annexRef: "N/A",
        satisfied: true,
        reasoning:
          "SADM contains simple control electronics with firmware for motor driving and position feedback.",
      },
      {
        criterion: "Network-capable product",
        legalBasis: "Annex III Kategorie 2.1",
        annexRef: "Annex III",
        annexCategory: "2.1",
        satisfied: false,
        reasoning:
          "SADM receives positioning commands from the OBC over a simple command interface. No independent network function, no data processing beyond motor control.",
      },
    ],
    nis2SubSectors: [],
  },
  {
    id: "ground_monitoring_tool",
    name: "Ground Monitoring/Visualization Tool",
    segments: ["ground"],
    description:
      "Display and visualization software for spacecraft telemetry, orbit tracks, and ground station status. Read-only tool with no commanding or control capability.",
    classification: "default",
    conformityRoute: "self_assessment",
    classificationReasoning: [
      {
        criterion: "Product with digital elements",
        legalBasis: "Art. 3 Nr. 1 CRA (EU) 2024/2847",
        annexRef: "N/A",
        satisfied: true,
        reasoning:
          "Monitoring tool is software with network connectivity for receiving telemetry feeds.",
      },
      {
        criterion: "Network management product",
        legalBasis: "Annex III Kategorie 2.2",
        annexRef: "Annex III",
        annexCategory: "2.2",
        satisfied: false,
        reasoning:
          "Monitoring tool is read-only — it visualizes data but does not manage, configure, or control network equipment or spacecraft systems. No commanding capability.",
      },
      {
        criterion: "Product in critical infrastructure with control function",
        legalBasis: "Art. 7(2) i.V.m. Annex IV Kategorie 1",
        annexRef: "Annex IV",
        annexCategory: "1",
        satisfied: false,
        reasoning:
          "Tool has no control function. It cannot send commands, modify configurations, or affect spacecraft operations. Pure visualization.",
      },
    ],
    nis2SubSectors: [],
  },
];

// ─── Consolidated Taxonomy ───

export const SPACE_PRODUCT_TAXONOMY: CRASpaceProductType[] = [
  ...CLASS_II_PRODUCTS,
  ...CLASS_I_PRODUCTS,
  ...DEFAULT_PRODUCTS,
];

// ─── Lookup Helpers ───

export function getSpaceProductById(
  id: string,
): CRASpaceProductType | undefined {
  return SPACE_PRODUCT_TAXONOMY.find((p) => p.id === id);
}

export function getSpaceProductsByClass(
  classification: "default" | "class_I" | "class_II",
): CRASpaceProductType[] {
  return SPACE_PRODUCT_TAXONOMY.filter(
    (p) => p.classification === classification,
  );
}

export function getSpaceProductsBySegment(
  segment: "space" | "ground" | "link" | "user",
): CRASpaceProductType[] {
  return SPACE_PRODUCT_TAXONOMY.filter((p) => p.segments.includes(segment));
}
```

- [ ] **Step 2: Verify taxonomy counts**

Run: `node -e "const t = require('./src/data/cra-taxonomy.ts'); console.log('Total:', t.SPACE_PRODUCT_TAXONOMY.length);"` — this won't work directly with TS, so instead:

Run: `grep -c '"id":' src/data/cra-taxonomy.ts` or count the entries manually.

Expected: 19 total (6 Class II + 9 Class I + 4 Default).

- [ ] **Step 3: Commit**

```bash
git add src/data/cra-taxonomy.ts
git commit -m "feat(cra): add Space Product Taxonomy with 19 product types

6 Class II (OBC, AOCS, TT&C Ground, Mission Control, Satellite C2, HSM)
9 Class I (SDR, GNSS, Ground Station SW, DHU, ISL, Flight SW, Payload, Ground Infra, Key Mgmt)
4 Default (Star Tracker, Reaction Wheel, SADM, Ground Monitoring)

Each type includes Notified-Body-grade classification reasoning chains
with full legal references (Art. X i.V.m. Annex Y Kategorie Z)."
```

---

## Task 3: Module Registration

**Files:**

- Modify: `src/data/articles.ts:22-32`
- Modify: `src/data/modules.ts:113-122`
- Modify: `src/lib/nis2-types.ts:144-150`

Register the CRA module in existing infrastructure.

- [ ] **Step 1: Add "cra" to ComplianceModule union**

In `src/data/articles.ts`, extend the `ComplianceModule` type at line 32:

```typescript
// Before (line 32):
  | "nis2";

// After:
  | "nis2"
  | "cra";
```

- [ ] **Step 2: Add CRA to modules array**

In `src/data/modules.ts`, add after the last entry (NIS2, line 122):

```typescript
  {
    id: "cra",
    number: "10",
    name: "Cyber Resilience Act",
    shortName: "CRA",
    icon: "ShieldCheck",
    description:
      "EU Cyber Resilience Act (EU) 2024/2847 — product cybersecurity for space hardware and software",
    articleRange: "Art. 6–14, Annex I–IV",
    color: "rgba(168,139,255,0.5)",
  },
```

- [ ] **Step 3: Add "cra" to RegulationType union**

In `src/lib/nis2-types.ts`, extend the `RegulationType` type at line 150:

```typescript
// Before (line 150):
  | "ecss";

// After:
  | "ecss"
  | "cra";
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -30`

Expected: No new errors from these changes.

- [ ] **Step 5: Commit**

```bash
git add src/data/articles.ts src/data/modules.ts src/lib/nis2-types.ts
git commit -m "feat(cra): register CRA module in ComplianceModule, modules array, and RegulationType"
```

---

## Task 4: CRA Rule Engine

**Files:**

- Create: `src/lib/cra-rule-engine.server.ts`

Rule-based classification for products not in the taxonomy. Also used as validation layer for taxonomy selections.

- [ ] **Step 1: Create rule engine**

Create `src/lib/cra-rule-engine.server.ts`:

```typescript
/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * SERVER-ONLY CRA Rule-Based Classification Engine
 *
 * Classifies products with digital elements into CRA product classes
 * based on Annex III (Class I) and Annex IV (Class II) criteria.
 * Used for products not in the curated taxonomy and as validation
 * for taxonomy selections.
 *
 * PROPRIETARY AND CONFIDENTIAL
 */

import "server-only";

import type {
  CRAAssessmentAnswers,
  CRAProductClass,
  CRAConformityRoute,
  ClassificationStep,
  ClassificationConflict,
} from "./cra-types";

// ─── Rule Definition ───

interface ClassificationRule {
  id: string;
  annexRef: "Annex III" | "Annex IV";
  annexCategory: string;
  criterion: string;
  legalBasis: string;
  test: (answers: CRAAssessmentAnswers) => boolean;
  reasoning: string;
}

// ─── Annex IV Rules (Class II) — Evaluated First ───

const ANNEX_IV_RULES: ClassificationRule[] = [
  {
    id: "annex_iv_kat_1_industrial_control",
    annexRef: "Annex IV",
    annexCategory: "1",
    criterion:
      "Product controlling physical systems in critical infrastructure",
    legalBasis: "Art. 7(2) i.V.m. Annex IV Kategorie 1",
    test: (a) =>
      a.controlsPhysicalSystem === true && a.usedInCriticalInfra === true,
    reasoning:
      "Product controls physical systems (actuators, thrusters, mechanisms) and is deployed in critical infrastructure (NIS2 Annex I Sector 11 Space). CRA Annex IV Category 1 applies to industrial automation and control systems in critical infrastructure.",
  },
  {
    id: "annex_iv_kat_2_auth_critical",
    annexRef: "Annex IV",
    annexCategory: "2",
    criterion:
      "Product processing authentication data in critical infrastructure",
    legalBasis: "Annex IV Kategorie 2",
    test: (a) => a.processesAuthData === true && a.usedInCriticalInfra === true,
    reasoning:
      "Product processes authentication credentials, authorization tokens, or access control data within critical infrastructure. Compromise enables unauthorized access to space systems.",
  },
  {
    id: "annex_iv_kat_3_crypto_safety",
    annexRef: "Annex IV",
    annexCategory: "3",
    criterion: "Cryptographic device in safety-critical application",
    legalBasis: "Annex IV Kategorie 3",
    test: (a) => a.performsCryptoOps === true && a.isSafetyCritical === true,
    reasoning:
      "Product performs cryptographic operations (key management, encryption, digital signatures) in a safety-critical context. Cryptographic failure in space systems can compromise entire communication chains.",
  },
];

// ─── Annex III Rules (Class I) — Evaluated If No Annex IV Match ───

const ANNEX_III_RULES: ClassificationRule[] = [
  {
    id: "annex_iii_kat_2_1_network_critical",
    annexRef: "Annex III",
    annexCategory: "2.1",
    criterion: "Network-capable product in critical infrastructure",
    legalBasis: "Annex III Kategorie 2.1",
    test: (a) =>
      a.hasNetworkFunction === true && a.usedInCriticalInfra === true,
    reasoning:
      "Product has network connectivity (SpaceWire, CAN, Ethernet, RF) and operates within critical infrastructure. CRA Annex III Category 2.1 covers network-capable products with elevated risk.",
  },
  {
    id: "annex_iii_kat_2_3_network_crypto",
    annexRef: "Annex III",
    annexCategory: "2.3",
    criterion: "Network-capable product with cryptographic functions",
    legalBasis: "Annex III Kategorie 2.3",
    test: (a) => a.hasNetworkFunction === true && a.performsCryptoOps === true,
    reasoning:
      "Product combines network connectivity with cryptographic operations (link-layer encryption, authenticated communications). CRA Annex III Category 2.3 covers products implementing cryptographic protocols.",
  },
  {
    id: "annex_iii_kat_2_1_microcontroller_network",
    annexRef: "Annex III",
    annexCategory: "2.1",
    criterion: "Microcontroller-based product with network function",
    legalBasis: "Annex III Kategorie 2.1",
    test: (a) => a.hasMicrocontroller === true && a.hasNetworkFunction === true,
    reasoning:
      "Product contains a microcontroller with network interface to spacecraft bus or ground network. Embedded devices with network connectivity fall under CRA Annex III Category 2.1.",
  },
];

// ─── OSS Scope Check ───

function checkOSSScope(
  answers: CRAAssessmentAnswers,
): ClassificationStep | null {
  if (answers.isOSSComponent !== true) return null;

  if (answers.isCommerciallySupplied === true) {
    return {
      criterion: "Open source but commercially supplied",
      legalBasis: "Art. 3 Nr. 12-14, Recital 18-20 CRA (EU) 2024/2847",
      annexRef: "N/A",
      satisfied: false,
      reasoning:
        "Product is open-source software but is commercially supplied (e.g., as part of a commercial product or service). Commercially supplied OSS is NOT excluded from CRA scope per Art. 3 Nr. 12.",
    };
  }

  return {
    criterion: "Non-commercially supplied open-source software",
    legalBasis: "Art. 3 Nr. 12-14, Recital 18-20 CRA (EU) 2024/2847",
    annexRef: "N/A",
    satisfied: true,
    reasoning:
      "Product is open-source software that is not commercially supplied. Non-commercial OSS is excluded from CRA scope per Art. 3 Nr. 12-14 and Recitals 18-20.",
  };
}

// ─── Main Classification Function ───

export function classifyByRules(answers: CRAAssessmentAnswers): {
  classification: CRAProductClass;
  conformityRoute: CRAConformityRoute;
  steps: ClassificationStep[];
  isOutOfScope: boolean;
  outOfScopeReason?: string;
} {
  const steps: ClassificationStep[] = [];

  // Step 0: Product with digital elements (always true if we're here)
  steps.push({
    criterion: "Product with digital elements",
    legalBasis: "Art. 3 Nr. 1 CRA (EU) 2024/2847",
    annexRef: "N/A",
    satisfied: true,
    reasoning:
      "Product contains or consists of software and/or hardware with a data connection — meets the CRA definition of a product with digital elements.",
  });

  // Step 1: OSS scope check
  const ossStep = checkOSSScope(answers);
  if (ossStep) {
    steps.push(ossStep);
    if (ossStep.satisfied) {
      return {
        classification: "default",
        conformityRoute: "self_assessment",
        steps,
        isOutOfScope: true,
        outOfScopeReason:
          "Non-commercially supplied open-source software is excluded from CRA scope (Art. 3 Nr. 12-14, Recital 18-20).",
      };
    }
  }

  // Step 2: Check Annex IV rules (Class II)
  let matchedClassII = false;
  for (const rule of ANNEX_IV_RULES) {
    const satisfied = rule.test(answers);
    steps.push({
      criterion: rule.criterion,
      legalBasis: rule.legalBasis,
      annexRef: rule.annexRef,
      annexCategory: rule.annexCategory,
      satisfied,
      reasoning: satisfied
        ? rule.reasoning
        : `Criterion not met: ${rule.criterion.toLowerCase()}.`,
    });
    if (satisfied) matchedClassII = true;
  }

  if (matchedClassII) {
    return {
      classification: "class_II",
      conformityRoute: "third_party_type_exam",
      steps,
      isOutOfScope: false,
    };
  }

  // Step 3: Check Annex III rules (Class I)
  let matchedClassI = false;
  for (const rule of ANNEX_III_RULES) {
    const satisfied = rule.test(answers);
    steps.push({
      criterion: rule.criterion,
      legalBasis: rule.legalBasis,
      annexRef: rule.annexRef,
      annexCategory: rule.annexCategory,
      satisfied,
      reasoning: satisfied
        ? rule.reasoning
        : `Criterion not met: ${rule.criterion.toLowerCase()}.`,
    });
    if (satisfied) matchedClassI = true;
  }

  if (matchedClassI) {
    return {
      classification: "class_I",
      conformityRoute: "harmonised_standard",
      steps,
      isOutOfScope: false,
    };
  }

  // Step 4: Default
  return {
    classification: "default",
    conformityRoute: "self_assessment",
    steps,
    isOutOfScope: false,
  };
}

// ─── Conflict Detection ───

export function detectClassificationConflict(
  taxonomyClass: CRAProductClass,
  ruleResult: { classification: CRAProductClass; steps: ClassificationStep[] },
): ClassificationConflict | undefined {
  if (taxonomyClass === ruleResult.classification) return undefined;

  const conflictingSteps = ruleResult.steps.filter((s) => s.satisfied);

  return {
    taxonomyClass,
    ruleEngineClass: ruleResult.classification,
    conflictingSteps,
    recommendation:
      ruleResult.classification === "class_II"
        ? `Rule engine classified this product as Class II based on your answers. This is a higher classification than the taxonomy suggestion (${taxonomyClass}). We recommend using the Class II classification to ensure regulatory compliance.`
        : ruleResult.classification === "class_I" && taxonomyClass === "default"
          ? `Rule engine classified this product as Class I based on your answers. The taxonomy suggests Default classification. Review whether the product has network capabilities or operates in critical infrastructure.`
          : `Taxonomy and rule engine disagree. The taxonomy classifies as ${taxonomyClass}, the rule engine as ${ruleResult.classification}. Review the conflicting criteria below.`,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/cra-rule-engine.server.ts
git commit -m "feat(cra): add rule-based classification engine

Annex IV rules (Class II): industrial control, auth processing, crypto devices
Annex III rules (Class I): network-capable, crypto protocols, microcontroller
OSS scope check: Art. 3 Nr. 12-14 exclusion for non-commercial OSS
Conflict detection between taxonomy and rule engine results"
```

---

## Task 5: CRA Main Engine

**Files:**

- Create: `src/lib/cra-engine.server.ts`

Three-phase pipeline: scope check → classification → compliance calculation.

- [ ] **Step 1: Create main engine**

Create `src/lib/cra-engine.server.ts`:

```typescript
/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * SERVER-ONLY CRA Compliance Calculation Engine
 *
 * Three-phase pipeline:
 * 1. Scope check (OSS, EU establishment, economic operator role)
 * 2. Product classification (taxonomy + rule engine validation)
 * 3. Compliance calculation (requirements, NIS2 overlap, timelines)
 *
 * PROPRIETARY AND CONFIDENTIAL
 */

import "server-only";

import type {
  CRAAssessmentAnswers,
  CRAProductClass,
  CRAConformityRoute,
  CRAComplianceResult,
  CRARequirement,
  ClassificationStep,
  ClassificationConflict,
  RedactedCRAComplianceResult,
} from "./cra-types";
import { getSpaceProductById } from "@/data/cra-taxonomy";
import {
  classifyByRules,
  detectClassificationConflict,
} from "./cra-rule-engine.server";
import { CROSS_REFERENCES } from "@/data/cross-references";
import { EngineDataError } from "@/lib/engines/shared.server";

// ─── Lazy import for CRA requirements ───

let _craRequirementsModule: typeof import("@/data/cra-requirements") | null =
  null;

async function getCRARequirementsModule() {
  if (!_craRequirementsModule) {
    try {
      _craRequirementsModule = await import("@/data/cra-requirements");
    } catch (error) {
      throw new EngineDataError("CRA requirements data could not be loaded", {
        engine: "cra",
        dataFile: "cra-requirements.ts",
        cause: error,
      });
    }
  }
  return _craRequirementsModule;
}

// ─── Phase 1: Scope Check ───

function checkScope(answers: CRAAssessmentAnswers): {
  isOutOfScope: boolean;
  outOfScopeReason?: string;
  scopeSteps: ClassificationStep[];
  flags: string[];
} {
  const scopeSteps: ClassificationStep[] = [];
  const flags: string[] = [];

  // OSS check
  if (
    answers.isOSSComponent === true &&
    answers.isCommerciallySupplied !== true
  ) {
    scopeSteps.push({
      criterion: "Non-commercially supplied open-source software",
      legalBasis: "Art. 3 Nr. 12-14, Recital 18-20 CRA (EU) 2024/2847",
      annexRef: "N/A",
      satisfied: true,
      reasoning: "Product is non-commercial OSS — excluded from CRA scope.",
    });
    return {
      isOutOfScope: true,
      outOfScopeReason:
        "Non-commercially supplied open-source software is excluded from CRA scope (Art. 3 Nr. 12-14, Recital 18-20).",
      scopeSteps,
      flags,
    };
  }

  // EU establishment check
  if (answers.isEUEstablished === false) {
    flags.push("authorized_representative_required");
    scopeSteps.push({
      criterion: "Non-EU manufacturer placing product on EU market",
      legalBasis: "Art. 4(2) CRA (EU) 2024/2847",
      annexRef: "N/A",
      satisfied: true,
      reasoning:
        "Manufacturer is established outside the EU. CRA still applies to products placed on the EU market, but an authorized representative in the EU is required under Art. 4(2).",
    });
  }

  // Economic operator role check (Phase 1: manufacturer only)
  if (answers.economicOperatorRole !== "manufacturer") {
    return {
      isOutOfScope: true,
      outOfScopeReason: `CRA assessment for ${answers.economicOperatorRole} role is planned for Phase 2. Phase 1 covers manufacturer obligations only.`,
      scopeSteps,
      flags,
    };
  }

  return { isOutOfScope: false, scopeSteps, flags };
}

// ─── Phase 2: Product Classification ───

export function classifyCRAProduct(answers: CRAAssessmentAnswers): {
  classification: CRAProductClass;
  classificationReasoning: ClassificationStep[];
  conformityRoute: CRAConformityRoute;
  conflict?: ClassificationConflict;
  isOutOfScope: boolean;
  outOfScopeReason?: string;
} {
  // Phase 1: Scope check
  const scope = checkScope(answers);
  if (scope.isOutOfScope) {
    return {
      classification: "default",
      classificationReasoning: scope.scopeSteps,
      conformityRoute: "self_assessment",
      isOutOfScope: true,
      outOfScopeReason: scope.outOfScopeReason,
    };
  }

  // Phase 2a: Taxonomy path
  if (answers.spaceProductTypeId) {
    const taxonomyProduct = getSpaceProductById(answers.spaceProductTypeId);
    if (taxonomyProduct) {
      // Run rule engine as validation
      const ruleResult = classifyByRules(answers);
      const conflict = detectClassificationConflict(
        taxonomyProduct.classification,
        ruleResult,
      );

      return {
        classification: taxonomyProduct.classification,
        classificationReasoning: taxonomyProduct.classificationReasoning,
        conformityRoute: taxonomyProduct.conformityRoute,
        conflict,
        isOutOfScope: false,
      };
    }
    // Taxonomy ID not found — fall through to rule engine
  }

  // Phase 2b: Rule engine path
  const ruleResult = classifyByRules(answers);
  return {
    classification: ruleResult.classification,
    classificationReasoning: ruleResult.steps,
    conformityRoute: ruleResult.conformityRoute,
    isOutOfScope: ruleResult.isOutOfScope,
    outOfScopeReason: ruleResult.outOfScopeReason,
  };
}

// ─── Phase 3: Compliance Calculation ───

export async function calculateCRACompliance(
  answers: CRAAssessmentAnswers,
): Promise<CRAComplianceResult> {
  // Classify
  const classification = classifyCRAProduct(answers);

  // Load requirements
  const reqModule = await getCRARequirementsModule();
  const applicableRequirements = reqModule.getApplicableCRARequirements(
    classification.classification,
    answers,
  );

  // Calculate NIS2 overlap
  const nis2Overlap = calculateNIS2Overlap(applicableRequirements);

  return {
    productClassification: classification.classification,
    classificationReasoning: classification.classificationReasoning,
    conformityRoute: classification.conformityRoute,
    conflict: classification.conflict,
    applicableRequirements,
    nis2Overlap,
    supportPeriodYears: 5,
    reportingTimeline: {
      activelyExploitedVuln: "24h to ENISA (Art. 14(2)(a))",
      severeIncident: "72h to ENISA (Art. 14(2)(b))",
      patchRelease: "14 days after patch availability (Art. 14(2)(c))",
    },
    penalties: {
      maxFine: "EUR 15,000,000 or 2.5% of worldwide annual turnover",
      calculationBasis:
        "Art. 64(1) CRA — for non-compliance with essential requirements in Annex I",
    },
    keyDates: [
      {
        date: "2024-12-10",
        description: "CRA entered into force",
        articleRef: "Art. 71",
      },
      {
        date: "2026-09-11",
        description:
          "Reporting obligations for actively exploited vulnerabilities apply",
        articleRef: "Art. 14, Art. 71(2)",
      },
      {
        date: "2027-12-11",
        description: "Full application of all CRA requirements",
        articleRef: "Art. 71(2)",
      },
    ],
  };
}

// ─── NIS2 Overlap Calculation ───

function calculateNIS2Overlap(
  requirements: CRARequirement[],
): CRAComplianceResult["nis2Overlap"] {
  const overlapping: CRAComplianceResult["nis2Overlap"]["overlappingRequirements"] =
    [];
  let savingsMin = 0;
  let savingsMax = 0;

  // From cross-references
  const craCrossRefs = CROSS_REFERENCES.filter(
    (ref) =>
      (ref.sourceRegulation === "cra" && ref.targetRegulation === "nis2") ||
      (ref.sourceRegulation === "nis2" && ref.targetRegulation === "cra"),
  );

  for (const req of requirements) {
    if (!req.nis2RequirementIds || req.nis2RequirementIds.length === 0)
      continue;

    for (const nis2Id of req.nis2RequirementIds) {
      // Find relationship type from cross-references
      const xref = craCrossRefs.find(
        (ref) =>
          ref.sourceArticle.includes(req.articleRef.split(" ")[1] || "") ||
          ref.targetArticle.includes(req.articleRef.split(" ")[1] || ""),
      );

      const relationship =
        (xref?.relationship as "implements" | "overlaps" | "extends") ||
        "overlaps";

      overlapping.push({
        craRequirementId: req.id,
        nis2RequirementId: nis2Id,
        relationship,
      });

      // Calculate savings range based on relationship
      const weeks = req.implementationTimeWeeks;
      switch (relationship) {
        case "implements":
          savingsMin += weeks * 0.7;
          savingsMax += weeks * 0.9;
          break;
        case "overlaps":
          savingsMin += weeks * 0.4;
          savingsMax += weeks * 0.6;
          break;
        case "extends":
          savingsMin += weeks * 0.1;
          savingsMax += weeks * 0.3;
          break;
      }
    }
  }

  return {
    overlappingRequirementCount: overlapping.length,
    overlappingRequirements: overlapping,
    estimatedSavingsRange: {
      min: Math.round(savingsMin),
      max: Math.round(savingsMax),
    },
    disclaimer:
      "Schätzung basierend auf typischen Implementierungsaufwänden. Tatsächliche Einsparungen hängen von der Tiefe Ihrer bestehenden NIS2-Compliance ab.",
  };
}

// ─── Redaction for Public API ───

export function redactCRAResultForClient(
  result: CRAComplianceResult,
): RedactedCRAComplianceResult {
  return {
    productClassification: result.productClassification,
    classificationReasoning: result.classificationReasoning,
    conformityRoute: result.conformityRoute,
    applicableRequirementCount: result.applicableRequirements.length,
    nis2OverlapCount: result.nis2Overlap.overlappingRequirementCount,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/cra-engine.server.ts
git commit -m "feat(cra): add main CRA compliance engine

Three-phase pipeline: scope check (OSS, EU, role) → product
classification (taxonomy + rule validation) → compliance calculation
(requirements, NIS2 overlap with savings ranges, timelines, penalties).
Includes redaction layer for public API endpoints."
```

---

## Task 6: CRA Requirements Data

**Files:**

- Create: `src/data/cra-requirements.ts`

~40 requirements based on CRA Annex I essential cybersecurity requirements. Each requirement carries `nis2RequirementIds` for cross-mapping.

- [ ] **Step 1: Create requirements data file**

Create `src/data/cra-requirements.ts` with the full set of CRA requirements. Structure mirrors `src/data/nis2-requirements.ts`. The requirements map to CRA Annex I Part I (security properties), Part II (vulnerability handling), and Articles 13-14 (manufacturer obligations).

The file must export:

- `CRA_REQUIREMENTS: CRARequirement[]` — the full array
- `getApplicableCRARequirements(classification, answers)` — filter function

Each requirement needs: `id` (pattern: `"cra-001"` through `"cra-040"`), `articleRef`, `category`, `title`, `description`, `complianceQuestion`, `spaceSpecificGuidance`, `applicableTo`, NIS2 cross-refs where applicable, `assessmentFields` (2-4 boolean/date fields per requirement), `complianceRule`, `severity`, `implementationTimeWeeks`, `canBeSimplified`.

The requirements should cover these CRA sections with the following distribution:

**Annex I Part I §1 — Security by Design (cra-001 through cra-010):**

- Access control mechanisms (cra-001) → NIS2 Art. 21(2)(i)
- Data protection at rest and in transit (cra-002) → NIS2 Art. 21(2)(h)
- Minimized attack surface (cra-003)
- Secure default configuration (cra-004)
- Integrity protection (cra-005)
- Availability and resilience (cra-006) → NIS2 Art. 21(2)(c)
- Logging and monitoring (cra-007) → NIS2 Art. 21(2)(f)
- Secure communication (cra-008) → NIS2 Art. 21(2)(h)
- Secure update mechanism (cra-009) → links to software_update category
- Data minimization (cra-010)

**Annex I Part I §2 — Vulnerability Handling (cra-011 through cra-016):**

- Vulnerability identification process (cra-011) → NIS2 Art. 21(2)(e)
- Vulnerability remediation timeline (cra-012)
- Security testing (cra-013)
- Vulnerability disclosure policy (cra-014)
- SBOM maintenance (cra-015) → NIS2 Art. 21(2)(d)
- Third-party component tracking (cra-016) → NIS2 Art. 21(2)(d)

**Annex I Part I §3 — Documentation (cra-017 through cra-020):**

- Technical documentation (cra-017)
- Risk assessment documentation (cra-018) → NIS2 Art. 21(2)(a)
- Security architecture documentation (cra-019)
- User information and instructions (cra-020)

**Art. 32-34 — Conformity Assessment (cra-021 through cra-025):**

- Conformity assessment procedure selection (cra-021)
- EU declaration of conformity (cra-022)
- CE marking (cra-023)
- Notified body engagement (cra-024, Class I/II only)
- Technical file preparation (cra-025)

**Art. 14 — Incident Reporting (cra-026 through cra-029):**

- Actively exploited vulnerability reporting (cra-026) — 24h to ENISA
- Severe incident notification (cra-027) — 72h to ENISA
- Patch availability notification (cra-028) — 14 days
- Coordinated vulnerability disclosure (cra-029) → NIS2 Art. 23

**Art. 13 — Post-Market Obligations (cra-030 through cra-034):**

- Support period commitment (cra-030)
- Security update delivery (cra-031)
- Market surveillance cooperation (cra-032)
- Product recall and withdrawal procedures (cra-033)
- Post-market monitoring system (cra-034)

**Annex I Part II — Software Update & SBOM (cra-035 through cra-040):**

- Automatic update capability (cra-035)
- Update integrity verification (cra-036)
- Rollback capability (cra-037)
- SBOM generation and delivery (cra-038) → NIS2 Art. 21(2)(d)
- Open-source component license compliance (cra-039)
- Dependency vulnerability monitoring (cra-040)

**Implementation note for the executing agent:** Each requirement follows the exact same structure as the NIS2 requirements in `src/data/nis2-requirements.ts`. Use the first NIS2 requirement (`nis2-001`) as a structural template. Every requirement must have at least 2 `assessmentFields` (boolean type with `requiredTrue` in `complianceRule`). The `spaceSpecificGuidance` field must contain Space-sector-specific interpretation — this is what differentiates Caelex from generic CRA tools.

For requirements with NIS2 overlap, set `nis2RequirementIds` to the corresponding NIS2 requirement IDs (e.g., `["nis2-001"]` for risk analysis overlap). These IDs must match existing entries in `src/data/nis2-requirements.ts`.

The `getApplicableCRARequirements` function filters by:

- `applicableTo.productClasses` — must include the product's class
- `applicableTo.segments` — must intersect with the product's segments (if specified)
- `applicableTo.roles` — must include the economic operator role

- [ ] **Step 2: Verify requirement count and structure**

Run: `grep -c '"id": "cra-' src/data/cra-requirements.ts`

Expected: 40 requirements.

- [ ] **Step 3: Commit**

```bash
git add src/data/cra-requirements.ts
git commit -m "feat(cra): add 40 CRA requirements with NIS2 cross-mapping

Covers Annex I Part I (security by design, vulnerability handling,
documentation), Art. 32-34 (conformity assessment), Art. 14 (incident
reporting), Art. 13 (post-market), Annex I Part II (updates, SBOM).
Each requirement includes space-specific guidance and NIS2 requirement
ID cross-references for overlap calculation."
```

---

## Task 7: Cross-References

**Files:**

- Modify: `src/data/cross-references.ts`

Add ~30 CRA↔NIS2 cross-reference entries for bidirectional overlap mapping.

- [ ] **Step 1: Add CRA cross-references**

In `src/data/cross-references.ts`, append after the last entry (`xref-047` at line 720, before the closing `];`). Add entries `xref-048` through `xref-055` (8 key cross-references per the spec's mapping table):

```typescript
  // ─── CRA ↔ NIS2 Cross-References ───
  {
    id: "xref-048",
    sourceRegulation: "cra",
    sourceArticle: "Annex I Part I §1",
    sourceTitle: "Security by Design — Risk Analysis",
    targetRegulation: "nis2",
    targetArticle: "Art. 21(2)(a)",
    targetTitle: "Policies on risk analysis and information system security",
    relationship: "overlaps",
    description:
      "Both require systematic cybersecurity risk analysis. CRA is product-scoped (risk to the product), NIS2 is entity-scoped (risk to the organization). Overlap in methodology and documentation.",
    confidence: "confirmed",
  },
  {
    id: "xref-049",
    sourceRegulation: "cra",
    sourceArticle: "Annex I Part I §2",
    sourceTitle: "Vulnerability Handling Process",
    targetRegulation: "nis2",
    targetArticle: "Art. 21(2)(e)",
    targetTitle: "Network and information system maintenance",
    relationship: "implements",
    description:
      "CRA vulnerability handling (identification, remediation, testing, disclosure) directly implements NIS2 requirements for network and information system maintenance at the product level.",
    confidence: "confirmed",
  },
  {
    id: "xref-050",
    sourceRegulation: "cra",
    sourceArticle: "Annex I Part II §2",
    sourceTitle: "Software Bill of Materials (SBOM)",
    targetRegulation: "nis2",
    targetArticle: "Art. 21(2)(d)",
    targetTitle: "Supply chain security",
    relationship: "extends",
    description:
      "CRA SBOM requirement extends significantly beyond NIS2's general supply chain security obligation. CRA mandates machine-readable SBOM delivery; NIS2 requires supply chain risk management without SBOM specifics.",
    confidence: "confirmed",
  },
  {
    id: "xref-051",
    sourceRegulation: "cra",
    sourceArticle: "Art. 14",
    sourceTitle: "Incident and Vulnerability Reporting",
    targetRegulation: "nis2",
    targetArticle: "Art. 23",
    targetTitle: "Incident reporting obligations",
    relationship: "overlaps",
    description:
      "Both mandate incident reporting with similar timelines (24h/72h). CRA reports to ENISA for product vulnerabilities; NIS2 reports to national CSIRT for entity incidents. Overlapping processes but different recipients.",
    confidence: "confirmed",
  },
  {
    id: "xref-052",
    sourceRegulation: "cra",
    sourceArticle: "Annex I Part I §1(c)",
    sourceTitle: "Access Control Mechanisms",
    targetRegulation: "nis2",
    targetArticle: "Art. 21(2)(i)",
    targetTitle: "Human resources security, access control, asset management",
    relationship: "overlaps",
    description:
      "CRA product-level access control overlaps with NIS2 entity-level access management. CRA focuses on product authentication mechanisms; NIS2 on organizational access policies.",
    confidence: "confirmed",
  },
  {
    id: "xref-053",
    sourceRegulation: "cra",
    sourceArticle: "Annex I Part I §1(d)",
    sourceTitle: "Cryptographic Protection",
    targetRegulation: "nis2",
    targetArticle: "Art. 21(2)(h)",
    targetTitle: "Cryptography and encryption policies",
    relationship: "implements",
    description:
      "CRA product-level cryptographic requirements implement NIS2's encryption obligations at the product level. CRA specifies secure defaults and state-of-the-art crypto for products.",
    confidence: "confirmed",
  },
  {
    id: "xref-054",
    sourceRegulation: "cra",
    sourceArticle: "Art. 13(8)",
    sourceTitle: "Support Period and Lifecycle",
    targetRegulation: "nis2",
    targetArticle: "Art. 21(2)(c)",
    targetTitle: "Business continuity and crisis management",
    relationship: "extends",
    description:
      "CRA mandates minimum 5-year product support period with security updates. This extends NIS2's general business continuity requirement by setting concrete product lifecycle obligations.",
    confidence: "confirmed",
  },
  {
    id: "xref-055",
    sourceRegulation: "cra",
    sourceArticle: "Annex I Part II §1",
    sourceTitle: "Secure Software Update Mechanism",
    targetRegulation: "nis2",
    targetArticle: "Art. 21(2)(e)",
    targetTitle: "Network and information system maintenance",
    relationship: "implements",
    description:
      "CRA's secure update mechanism requirement (integrity verification, rollback capability, automatic delivery) implements NIS2's system maintenance obligations at the product level.",
    confidence: "confirmed",
  },
```

- [ ] **Step 2: Commit**

```bash
git add src/data/cross-references.ts
git commit -m "feat(cra): add 8 CRA↔NIS2 cross-references

Bidirectional mapping: Security by Design↔Risk Analysis, Vulnerability
Handling↔System Maintenance, SBOM↔Supply Chain, Incident Reporting,
Access Control, Cryptography, Support Period↔Business Continuity,
Software Updates↔Maintenance."
```

---

## Task 8: Prisma Schema + Migration

**Files:**

- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add CRA models to Prisma schema**

Add the `CRAAssessment` and `CRARequirementStatus` models after the `NIS2RequirementStatus` model (after line 529 in `prisma/schema.prisma`). Also add relation fields to the `User` model (after line 54) and `Organization` model (after line 2544).

**User model addition (after the `nis2Assessments` field at line 54):**

```prisma
  craAssessments           CRAAssessment[]
```

**Organization model addition (after the `nis2Assessments` field at line 2544):**

```prisma
  craAssessments           CRAAssessment[]
```

**New models (insert after line 529):**

```prisma
// ─── CRA (EU) 2024/2847 — Cyber Resilience Act Assessment ───

model CRAAssessment {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  userId         String
  user           User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id])

  // Product identification
  productName        String
  productVersion     String?
  spaceProductTypeId String?

  // Classification
  economicOperatorRole    String
  productClassification   String
  conformityRoute         String
  classificationReasoning Json
  classificationConflict  Json?
  isOutOfScope            Boolean @default(false)
  outOfScopeReason        String?

  // Product profile
  segments                String  // JSON: SpaceProductSegment[]
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
  hasIEC62443     Boolean?
  hasETSIEN303645 Boolean?
  hasCommonCriteria Boolean?
  hasISO27001     Boolean?

  // Scores
  complianceScore Int?
  maturityScore   Int?
  riskLevel       String?

  // NIS2 cross-link
  nis2OverlapCount Int?
  nis2AssessmentId String?

  // Report
  reportGenerated   Boolean   @default(false)
  reportGeneratedAt DateTime?

  requirements CRARequirementStatus[]

  @@index([userId])
  @@index([organizationId])
  @@index([productClassification])
}

model CRARequirementStatus {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  assessmentId String
  assessment   CRAAssessment @relation(fields: [assessmentId], references: [id], onDelete: Cascade)

  requirementId String
  status        String  // not_assessed | compliant | partial | non_compliant | not_applicable
  notes         String? @db.Text
  evidenceNotes String? @db.Text
  responses     Json?

  @@unique([assessmentId, requirementId])
  @@index([assessmentId])
}
```

- [ ] **Step 2: Generate Prisma client**

Run: `npx prisma generate`

Expected: `✔ Generated Prisma Client`

- [ ] **Step 3: Push schema to database**

Run: `npx prisma db push`

Expected: Schema changes applied. Two new tables created.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(cra): add CRAAssessment and CRARequirementStatus to Prisma schema

Per-product assessment model (not per-org) with product classification,
reasoning chain (JSON), NIS2 cross-link, encrypted notes fields.
Relations added to User and Organization models."
```

---

## Task 9: Validation Schemas

**Files:**

- Modify: `src/lib/validations/api-compliance.ts`

- [ ] **Step 1: Add CRA validation schemas**

Add after the existing schemas in `src/lib/validations/api-compliance.ts`:

```typescript
// ─── CRA Schemas ───

export const CRAClassifySchema = z.object({
  spaceProductTypeId: z.string().optional().nullable(),
  productName: z.string().min(1).max(200).optional().default("Unnamed Product"),
  economicOperatorRole: z
    .enum(["manufacturer", "importer", "distributor"])
    .optional()
    .default("manufacturer"),
  segments: z
    .array(z.enum(["space", "ground", "link", "user"]))
    .optional()
    .default(["space"]),
  hasNetworkFunction: z.boolean().nullable().optional(),
  processesAuthData: z.boolean().nullable().optional(),
  usedInCriticalInfra: z.boolean().nullable().optional(),
  performsCryptoOps: z.boolean().nullable().optional(),
  controlsPhysicalSystem: z.boolean().nullable().optional(),
  hasMicrocontroller: z.boolean().nullable().optional(),
  isOSSComponent: z.boolean().nullable().optional(),
  isCommerciallySupplied: z.boolean().nullable().optional(),
  isSafetyCritical: z.boolean().nullable().optional(),
  isEUEstablished: z.boolean().nullable().optional(),
});

export const CRAAssessSchema = CRAClassifySchema.extend({
  productVersion: z.string().max(50).optional(),
  hasRedundancy: z.boolean().nullable().optional(),
  processesClassifiedData: z.boolean().nullable().optional(),
  hasIEC62443: z.boolean().nullable().optional(),
  hasETSIEN303645: z.boolean().nullable().optional(),
  hasCommonCriteria: z.boolean().nullable().optional(),
  hasISO27001: z.boolean().nullable().optional(),
});
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/validations/api-compliance.ts
git commit -m "feat(cra): add CRA Zod validation schemas for classify and assess endpoints"
```

---

## Task 10: API Routes — Internal

**Files:**

- Create: `src/app/api/cra/route.ts`
- Create: `src/app/api/cra/[assessmentId]/route.ts`
- Create: `src/app/api/cra/requirements/route.ts`
- Create: `src/app/api/cra/crosswalk/route.ts`
- Create: `src/app/api/cra/classify/route.ts`

These routes follow the exact pattern from `src/app/api/nis2/route.ts`. The executing agent should read the NIS2 route files as a template and replicate with CRA-specific types and engine calls.

- [ ] **Step 1: Create `/api/cra/route.ts` (list + create)**

Follow the pattern from `src/app/api/nis2/route.ts`. Key differences:

- Import `calculateCRACompliance`, `classifyCRAProduct` from `@/lib/cra-engine.server`
- Import `generateCRAAutoAssessments` from `@/lib/cra-auto-assessment.server` (created in Task 11)
- Use `CRAAssessSchema` for Zod validation
- Create `prisma.cRAAssessment` (note Prisma auto-lowercases the first letter)
- Create `prisma.cRARequirementStatus.createMany()`
- Maturity score formula: `Math.round(((compliant + 0.5 * partial) / total) * 100)`
- Audit event: `"CRA_ASSESSMENT_CREATED"`

**GET handler:** Query `prisma.cRAAssessment.findMany({ where: { userId, ...orgScope }, include: { requirements: true }, orderBy: { createdAt: "desc" } })`. Decrypt notes fields.

**POST handler:** Validate → classify → calculate → create assessment → createMany requirements → auto-assess → update statuses → recalc maturity → audit log → respond.

- [ ] **Step 2: Create `/api/cra/[assessmentId]/route.ts` (get + update + delete)**

Follow `src/app/api/nis2/[assessmentId]/route.ts` pattern:

- GET: fetch assessment + enrich with requirement metadata from `CRA_REQUIREMENTS`
- PATCH: update profile fields → reclassify → regenerate requirements
- DELETE: `prisma.cRAAssessment.delete()` + audit log

- [ ] **Step 3: Create `/api/cra/requirements/route.ts`**

Follow `src/app/api/nis2/requirements/route.ts` pattern:

- GET: fetch requirement statuses for an assessment, decrypt notes
- PATCH: upsert requirement status (encrypt notes/evidenceNotes), recalculate maturity score

- [ ] **Step 4: Create `/api/cra/crosswalk/route.ts`**

Follow `src/app/api/nis2/crosswalk/route.ts` pattern:

- GET: reconstruct answers from assessment fields → calculate CRA compliance → build unified compliance matrix with NIS2 overlap

- [ ] **Step 5: Create `/api/cra/classify/route.ts` (authenticated)**

Stateless classification endpoint. Accept `CRAClassifySchema` body, call `classifyCRAProduct()`, return full classification with reasoning chain. This is the authenticated version; the public version is in Task 11.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/cra/
git commit -m "feat(cra): add internal dashboard API routes

5 route files: list/create, get/update/delete, requirements CRUD,
crosswalk matrix, and stateless classification. All routes follow
NIS2 pattern with auth, multi-tenant scoping, encryption, and audit."
```

---

## Task 11: Auto-Assessment Engine

**Files:**

- Create: `src/lib/cra-auto-assessment.server.ts`

- [ ] **Step 1: Create auto-assessment engine**

Create `src/lib/cra-auto-assessment.server.ts`. Follow the pattern from `src/lib/nis2-auto-assessment.server.ts`.

Five rule passes:

```typescript
/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * SERVER-ONLY CRA Auto-Assessment Engine
 *
 * PROPRIETARY AND CONFIDENTIAL
 */

import "server-only";

import type {
  CRAAssessmentAnswers,
  CRARequirement,
  CRAAutoAssessmentResult,
} from "./cra-types";

export function generateCRAAutoAssessments(
  requirements: CRARequirement[],
  answers: CRAAssessmentAnswers,
): CRAAutoAssessmentResult[] {
  const results: CRAAutoAssessmentResult[] = [];

  for (const req of requirements) {
    let suggestedStatus: "partial" | "not_assessed" = "not_assessed";
    const reasons: string[] = [];
    let proportionalityNote: string | undefined;
    const priorityFlags: string[] = [];

    // Rule 1: IEC 62443 coverage
    if (answers.hasIEC62443 && req.iec62443Ref) {
      suggestedStatus = "partial";
      reasons.push(
        `IEC 62443 certification provides partial coverage for ${req.iec62443Ref}. Review product-specific applicability.`,
      );
    }

    // Rule 2: Common Criteria coverage
    if (
      answers.hasCommonCriteria &&
      (req.category === "security_by_design" ||
        req.category === "vulnerability_handling")
    ) {
      suggestedStatus = "partial";
      reasons.push(
        "Common Criteria evaluation covers design assurance and vulnerability analysis relevant to this requirement.",
      );
    }

    // Rule 3: ISO 27001 coverage
    if (answers.hasISO27001 && req.iso27001Ref) {
      suggestedStatus = "partial";
      reasons.push(
        `ISO 27001 certification provides organizational-level coverage for ${req.iso27001Ref}. Product-level evidence still needed.`,
      );
    }

    // Rule 4: NIS2 overlap (requirement-level, not assessment-level)
    if (req.nis2RequirementIds && req.nis2RequirementIds.length > 0) {
      priorityFlags.push("nis2_overlap");
    }

    // Rule 5: Proportionality for default-class products
    if (answers.spaceProductTypeId && req.canBeSimplified) {
      // Check if taxonomy product is default class
      // (This is a simplified check — the full proportionality is in the engine)
      proportionalityNote =
        "Default-class products may use simplified self-assessment under Annex VIII. Proportionate implementation measures apply.";
    }

    // Severity-based priority
    if (req.severity === "critical") {
      priorityFlags.push("critical_severity");
    }

    results.push({
      requirementId: req.id,
      suggestedStatus,
      reason: reasons.length > 0 ? `[Auto-assessed] ${reasons.join(" ")}` : "",
      proportionalityNote,
      priorityFlags,
    });
  }

  return results;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/cra-auto-assessment.server.ts
git commit -m "feat(cra): add auto-assessment engine with 5 rules

IEC 62443, Common Criteria, ISO 27001 coverage detection,
NIS2 overlap flagging, and proportionality for default-class products."
```

---

## Task 12: Public API Routes

**Files:**

- Create: `src/app/api/v1/compliance/cra/classify/route.ts`
- Create: `src/app/api/v1/compliance/cra/assess/route.ts`

- [ ] **Step 1: Create public classify endpoint (top-of-funnel)**

Create `src/app/api/v1/compliance/cra/classify/route.ts`. This is the **unauthenticated** endpoint that returns full classification + reasoning chain. Follow the pattern from `src/app/api/v1/compliance/nis2/classify/route.ts` but with rate limiting instead of API key auth.

```typescript
/**
 * Public CRA Product Classification Endpoint
 *
 * Unauthenticated, rate-limited. Returns full classification with
 * reasoning chain — no teaser gate. This is the top-of-funnel.
 */

import { NextRequest, NextResponse } from "next/server";
import { classifyCRAProduct } from "@/lib/cra-engine.server";
import { CRAClassifySchema } from "@/lib/validations/api-compliance";
import type { CRAAssessmentAnswers } from "@/lib/cra-types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CRAClassifySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const answers: CRAAssessmentAnswers = {
      economicOperatorRole: parsed.data.economicOperatorRole ?? "manufacturer",
      isEUEstablished: parsed.data.isEUEstablished ?? null,
      spaceProductTypeId: parsed.data.spaceProductTypeId ?? null,
      productName: parsed.data.productName ?? "Unnamed Product",
      segments: parsed.data.segments ?? ["space"],
      hasNetworkFunction: parsed.data.hasNetworkFunction ?? null,
      processesAuthData: parsed.data.processesAuthData ?? null,
      usedInCriticalInfra: parsed.data.usedInCriticalInfra ?? null,
      performsCryptoOps: parsed.data.performsCryptoOps ?? null,
      controlsPhysicalSystem: parsed.data.controlsPhysicalSystem ?? null,
      hasMicrocontroller: parsed.data.hasMicrocontroller ?? null,
      isOSSComponent: parsed.data.isOSSComponent ?? null,
      isCommerciallySupplied: parsed.data.isCommerciallySupplied ?? null,
      isSafetyCritical: parsed.data.isSafetyCritical ?? null,
      hasRedundancy: null,
      processesClassifiedData: null,
      hasIEC62443: null,
      hasETSIEN303645: null,
      hasCommonCriteria: null,
      hasISO27001: null,
    };

    const result = classifyCRAProduct(answers);

    return NextResponse.json({
      success: true,
      data: {
        productClassification: result.classification,
        classificationReasoning: result.classificationReasoning,
        conformityRoute: result.conformityRoute,
        conflict: result.conflict ?? null,
        isOutOfScope: result.isOutOfScope,
        outOfScopeReason: result.outOfScopeReason ?? null,
      },
      meta: {
        engine: "cra",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Classification failed" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Create public assess endpoint (API key required)**

Create `src/app/api/v1/compliance/cra/assess/route.ts`. Follow `src/app/api/v1/compliance/nis2/assess/route.ts` pattern with `withApiAuth` and `requiredScopes: ["read:compliance"]`. Calls `calculateCRACompliance()` and returns `redactCRAResultForClient()`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/v1/compliance/cra/
git commit -m "feat(cra): add public API endpoints for CRA classification and assessment

/v1/compliance/cra/classify — unauthenticated, full reasoning chain (top-of-funnel)
/v1/compliance/cra/assess — API key auth, full assessment with redacted result"
```

---

## Task 13: Unified Assessment Mapper

**Files:**

- Modify: `src/lib/unified-assessment-mappers.server.ts`

- [ ] **Step 1: Add CRA mapper**

Add `mapToCRAAnswers` function after the existing `mapToSpaceLawAnswers` function (after ~line 400). Import CRA types at the top of the file.

Add to imports:

```typescript
import type { CRAAssessmentAnswers, SpaceProductSegment } from "./cra-types";
```

Add mapper function:

```typescript
// ─── CRA Mapper ───

export function mapToCRAAnswers(
  unified: Partial<UnifiedAssessmentAnswers>,
): CRAAssessmentAnswers {
  const serviceTypes = unified.serviceTypes ?? [];
  const activityTypes = unified.activityTypes ?? [];

  // Derive segments from service types
  const segments: SpaceProductSegment[] = [];
  if (serviceTypes.includes("SATCOM") || serviceTypes.includes("EO")) {
    segments.push("space");
  }
  if (serviceTypes.includes("NAV") || serviceTypes.includes("SSA")) {
    segments.push("ground");
  }
  if (segments.length === 0) segments.push("space"); // default

  return {
    economicOperatorRole: activityTypes.includes("SCO")
      ? "manufacturer"
      : "manufacturer", // Phase 1: always manufacturer
    isEUEstablished: unified.establishmentCountry
      ? EU_MEMBER_STATES.includes(
          unified.establishmentCountry as (typeof EU_MEMBER_STATES)[number],
        )
      : null,
    spaceProductTypeId: null, // Must be selected separately in CRA wizard
    productName: unified.organizationName ?? "Unnamed Product",
    segments,
    hasNetworkFunction: null,
    processesAuthData: null,
    usedInCriticalInfra: true, // Space is always critical infra (NIS2 Annex I)
    performsCryptoOps: null,
    controlsPhysicalSystem: null,
    hasMicrocontroller: null,
    isOSSComponent: null,
    isCommerciallySupplied: null,
    isSafetyCritical: null,
    hasRedundancy: null,
    processesClassifiedData: null,
    hasIEC62443: null,
    hasETSIEN303645: null,
    hasCommonCriteria: null,
    hasISO27001: unified.existingCertifications?.includes("ISO27001") ?? null,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/unified-assessment-mappers.server.ts
git commit -m "feat(cra): add CRA mapper to unified assessment system"
```

---

## Task 14: Dashboard Module

**Files:**

- Create: `src/app/dashboard/modules/cra/page.tsx`
- Create: `src/app/dashboard/modules/cra/[id]/page.tsx`

These are large UI files. The executing agent should read `src/app/dashboard/modules/nis2/page.tsx` and `src/app/dashboard/modules/nis2/[id]/page.tsx` as templates and replicate with CRA-specific content.

- [ ] **Step 1: Create CRA list + wizard page**

Create `src/app/dashboard/modules/cra/page.tsx`. Key differences from NIS2:

- **Wizard has 6 steps** (not NIS2's inline questions):
  1. Product identification (name, version)
  2. Space Product Type selector (cards grouped by segment, with "Not listed" option)
  3. Product properties (rule-engine path, only shown when "Not listed")
  4. Deployment context (segments, critical infra, OSS)
  5. Existing certifications (IEC 62443, CC, ETSI, ISO 27001)
  6. Classification result (instant display with reasoning chain)

- **Step 2 instant preview:** When user selects a taxonomy product type, show classification badge immediately (before clicking Next). Import `getSpaceProductById` from `@/data/cra-taxonomy` and display `classification` + first reasoning step.

- **Assessment cards** show: product name, classification badge (Default/I/II), conformity route, maturity score, NIS2 overlap count. A manufacturer can have multiple assessments (one per product).

- **NIS2 null-state:** When CRA assessment has no linked NIS2 assessment, show: "Du hast noch kein NIS2-Assessment. Basierend auf deinem Produktprofil als Hersteller in der Space-Branche wärst du wahrscheinlich NIS2-pflichtig (Annex I, Sektor 11). Starte ein NIS2-Assessment um bis zu X Requirements automatisch vorzubelegen." with a link button to `/dashboard/modules/nis2`.

Use `csrfHeaders()` on all mutating fetch calls. Use `FeatureGate` wrapper. Use Framer Motion for wizard transitions.

- [ ] **Step 2: Create CRA detail/tracking page**

Create `src/app/dashboard/modules/cra/[id]/page.tsx`. Key differences from NIS2:

- **Category tabs:** Security by Design, Vulnerability Handling, Documentation, Conformity Assessment, Incident Reporting, Post-Market, Software Update, SBOM, Support Period
- **NIS2 overlap badge** per requirement: if `nis2RequirementIds` exists, show "Partially fulfilled by NIS2 Art. 21(2)(X)" with link to NIS2 module
- **Conformity route section** at the top: step-by-step guide for the applicable conformity assessment procedure (self-assessment vs. notified body)
- **Classification reasoning chain** displayed in a collapsible section

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/modules/cra/
git commit -m "feat(cra): add CRA dashboard module with wizard and tracking pages

6-step product wizard with taxonomy selector and instant classification preview.
Requirement tracking with NIS2 overlap badges and conformity route guidance.
NIS2 null-state with cross-module upsell."
```

---

## Task 15: ASTRA Knowledge File

**Files:**

- Create: `src/lib/astra/regulatory-knowledge/cra.ts`

- [ ] **Step 1: Create CRA knowledge file**

Create `src/lib/astra/regulatory-knowledge/cra.ts`. Follow the pattern from `src/lib/astra/regulatory-knowledge/nis2.ts`. Contains static knowledge for the AI copilot:

```typescript
/**
 * CRA (EU) 2024/2847 — Cyber Resilience Act
 * Static knowledge for ASTRA AI copilot
 */

export const CRA_KNOWLEDGE = {
  regulation: {
    name: "Cyber Resilience Act",
    reference: "Regulation (EU) 2024/2847",
    entryIntoForce: "2024-12-10",
    reportingObligationsDate: "2026-09-11",
    fullApplicationDate: "2027-12-11",
    scope:
      "Products with digital elements placed on the EU market. Applies to manufacturers, importers, and distributors. Excludes non-commercial open-source software.",
  },

  productClasses: {
    default: {
      name: "Default",
      conformityRoute: "Self-assessment (Annex VIII)",
      description:
        "Products with digital elements that do not fall into Class I or Class II. Manufacturer performs internal control and self-declares conformity.",
    },
    class_I: {
      name: "Class I (Important Product)",
      conformityRoute:
        "Harmonised standard (Annex VIII) or EU type examination (Annex VII)",
      description:
        "Products listed in CRA Annex III. Higher cybersecurity risk. Can self-assess if using harmonised standards, otherwise requires third-party assessment.",
      annexIIICategories: [
        "2.1: Network-capable products",
        "2.2: Network management/security products",
        "2.3: Products with cryptographic functions",
        "2.4: Products processing positioning/timing data",
      ],
    },
    class_II: {
      name: "Class II (Critical Product)",
      conformityRoute:
        "Mandatory third-party assessment: EU type examination (Annex VII) or full quality assurance (Annex VI)",
      description:
        "Products listed in CRA Annex IV. Highest cybersecurity risk. Must undergo assessment by a Notified Body.",
      annexIVCategories: [
        "1: Industrial automation and control systems in critical infrastructure",
        "2: Products processing authentication/authorization data in critical infrastructure",
        "3: Cryptographic devices and key management systems",
      ],
    },
  },

  spaceContext: {
    overview:
      "The CRA applies to satellite components with digital elements: on-board computers, ground segment software, software-defined radios, AOCS flight software, TT&C systems, and more. Space products are particularly affected because satellite systems are critical infrastructure under NIS2 Annex I Sector 11.",
    classIIExamples: [
      "On-board Computer (OBC) — controls safety-critical spacecraft functions",
      "AOCS Flight Software — controls attitude and orbit, debris generation risk",
      "TT&C Ground System — processes spacecraft authentication and encryption",
      "Mission Control Software — central C2 for satellite fleet",
      "Hardware Security Module (space-grade) — cryptographic key management",
    ],
    classIExamples: [
      "Software-Defined Radio — network interface with crypto",
      "GNSS Receiver — positioning data in safety context",
      "Intersatellite Link Terminal — network + crypto",
      "Ground Station Software — network management",
      "Payload Data Processor — data processing with bus interface",
    ],
    defaultExamples: [
      "Star Tracker — sensor, no network function",
      "Reaction Wheel — actuator with simple controller",
      "Ground Monitoring Tool — read-only visualization",
    ],
  },

  nis2Overlap: {
    overview:
      "CRA and NIS2 have significant overlap. NIS2 regulates the entity (operator), CRA regulates the product. A spacecraft manufacturer may be subject to both. Key overlaps: risk analysis, vulnerability handling, incident reporting, cryptography, supply chain/SBOM.",
    keyOverlaps: [
      {
        cra: "Annex I Part I §1 (Security by Design)",
        nis2: "Art. 21(2)(a) (Risk Analysis)",
        relationship: "overlaps",
      },
      {
        cra: "Annex I Part I §2 (Vulnerability Handling)",
        nis2: "Art. 21(2)(e) (System Maintenance)",
        relationship: "implements",
      },
      {
        cra: "Annex I Part II §2 (SBOM)",
        nis2: "Art. 21(2)(d) (Supply Chain)",
        relationship: "extends",
      },
      {
        cra: "Art. 14 (Incident Reporting)",
        nis2: "Art. 23 (Incident Reporting)",
        relationship: "overlaps",
      },
    ],
  },

  penalties: {
    annexIViolation: "EUR 15,000,000 or 2.5% of worldwide annual turnover",
    otherViolation: "EUR 10,000,000 or 2% of worldwide annual turnover",
    incorrectInfo: "EUR 5,000,000 or 1% of worldwide annual turnover",
  },

  timeline: [
    { date: "2024-12-10", event: "CRA entered into force (Art. 71)" },
    {
      date: "2026-09-11",
      event:
        "Reporting obligations for actively exploited vulnerabilities (Art. 14)",
    },
    {
      date: "2027-12-11",
      event: "Full application of all requirements (Art. 71(2))",
    },
  ],
};
```

- [ ] **Step 2: Register in ASTRA knowledge index**

Add import to `src/lib/astra/regulatory-knowledge/index.ts`:

```typescript
export { CRA_KNOWLEDGE } from "./cra";
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/astra/regulatory-knowledge/cra.ts src/lib/astra/regulatory-knowledge/index.ts
git commit -m "feat(cra): add ASTRA AI knowledge file for CRA

Static knowledge covering product classes, space context with examples,
NIS2 overlap mapping, penalties, and timeline. Registered in ASTRA index."
```

---

## Task 16: Type Check and Build Verification

- [ ] **Step 1: Run type check**

Run: `npx tsc --noEmit 2>&1 | head -50`

Fix any type errors. Common issues:

- Missing imports in new files
- Prisma client not regenerated after schema change
- Type mismatches between engine output and API route expectations

- [ ] **Step 2: Run build**

Run: `npm run build 2>&1 | tail -30`

Expected: Build succeeds. If it fails, fix errors and re-run.

- [ ] **Step 3: Run existing tests**

Run: `npm run test:run 2>&1 | tail -20`

Expected: All existing tests pass. New CRA code has no tests yet (tests would be added in a follow-up task).

- [ ] **Step 4: Final commit if any fixes**

```bash
git add -A
git commit -m "fix(cra): resolve type errors and build issues from CRA module integration"
```
