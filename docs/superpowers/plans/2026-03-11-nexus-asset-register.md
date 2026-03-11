# NEXUS — Space Asset Register Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an asset-centric compliance register that connects all Caelex modules through a dependency graph of space assets, each with its own compliance score, risk assessment, and regulatory mapping.

**Architecture:** New Prisma models (6 tables, 12 enums) → server-only service layer (5 files) → Next.js API routes (22 files) → React dashboard pages (3 pages + components) → cross-module bridges (3 integration files). All data flows through the existing AuditLog and ComplianceEvidence systems.

**Tech Stack:** Prisma 5.22, Next.js 15 App Router, TypeScript strict, Zod validation, Framer Motion, Recharts, Lucide icons, Liquid Glass design system.

**Spec:** `docs/superpowers/specs/2026-03-11-nexus-asset-register-design.md`

---

## File Map

### New Files

```
src/lib/nexus/
  types.ts                          — Asset taxonomy, category config, NIS2 mapping
  validations.ts                    — Zod schemas for all NEXUS API inputs
  asset-service.server.ts           — Asset CRUD, score calculation, auto-mapping
  dependency-service.server.ts      — Dependency graph, cycle detection, SPOF, impact analysis
  vulnerability-service.server.ts   — Vuln CRUD, patch rate, MTTR
  supplier-service.server.ts        — Supplier CRUD, supply chain risk
  personnel-service.server.ts       — Personnel CRUD, MFA rate, training
  integrations/
    ephemeris-bridge.ts             — NEXUS ↔ Ephemeris score sync
    incident-bridge.ts              — NEXUS ↔ Incident impact analysis
    nis2-sync.ts                    — NEXUS ↔ NIS2 requirement status sync

src/app/api/nexus/
  assets/route.ts                   — GET (list), POST (create)
  assets/[id]/route.ts              — GET, PATCH, DELETE
  assets/[id]/score/route.ts        — GET (scores)
  assets/[id]/requirements/route.ts — GET, POST (bulk)
  assets/[id]/requirements/[reqId]/route.ts — PATCH, DELETE
  assets/[id]/dependencies/route.ts — GET, POST
  assets/[id]/dependencies/[depId]/route.ts — DELETE
  assets/[id]/suppliers/route.ts    — GET, POST
  assets/[id]/suppliers/[supId]/route.ts — PATCH, DELETE
  assets/[id]/vulnerabilities/route.ts — GET, POST
  assets/[id]/vulnerabilities/[vulnId]/route.ts — PATCH, DELETE
  assets/[id]/personnel/route.ts    — GET, POST
  assets/[id]/personnel/[persId]/route.ts — PATCH, DELETE
  assets/[id]/impact/route.ts       — GET (impact analysis)
  overview/route.ts                 — GET (org dashboard)
  graph/route.ts                    — GET (dependency graph)
  spof/route.ts                     — GET (single points of failure)
  auto-detect/route.ts              — POST (auto-detect dependencies)
  metrics/patch-rate/route.ts       — GET
  metrics/mfa-rate/route.ts         — GET
  metrics/training/route.ts         — GET
  metrics/supply-chain/route.ts     — GET

src/app/dashboard/nexus/
  page.tsx                          — Overview page (metrics, table, chart)
  [id]/page.tsx                     — Detail page (5 tabs)

src/components/nexus/
  AssetTable.tsx                    — Sortable, filterable asset table
  AssetMetricsBar.tsx               — 4 metric cards
  RiskDistributionChart.tsx         — Donut chart
  AddAssetWizard.tsx                — 3-step creation wizard
  AssetOverviewTab.tsx              — Detail: overview tab
  AssetRequirementsTab.tsx          — Detail: requirements tab
  AssetDependenciesTab.tsx          — Detail: dependency graph + impact
  AssetSecurityTab.tsx              — Detail: vulns, suppliers, personnel
  AssetAuditTab.tsx                 — Detail: audit trail
  DependencyGraph.tsx               — SVG dependency visualization

tests/unit/lib/nexus/
  asset-service.test.ts
  dependency-service.test.ts
  vulnerability-service.test.ts
  supplier-service.test.ts
  personnel-service.test.ts

tests/integration/nexus/
  assets-api.test.ts
  metrics-api.test.ts
  auto-detect-api.test.ts
```

### Modified Files

```
prisma/schema.prisma                — Add 12 enums, 6 models, 5 back-relations
src/lib/audit.ts                    — Add nexus action + entity types
src/lib/ratelimit.ts                — Add nexus rate limit tier
src/components/dashboard/Sidebar.tsx — Add NEXUS nav item
```

---

## Chunk 1: Foundation (Schema, Types, Infrastructure)

### Task 1: Add NEXUS Prisma Enums

**Files:**

- Modify: `prisma/schema.prisma` (after line 6421, where last enum `CADecision` ends)

- [ ] **Step 1: Add all 12 NEXUS enums to schema.prisma**

Add after the closing `}` of `CADecision` enum (line 6421):

```prisma
// ═══════════════════════════════════════════════════════════
// NEXUS — Space Asset Register
// ═══════════════════════════════════════════════════════════

enum AssetType {
  SPACECRAFT
  PAYLOAD
  PROPULSION
  CONSTELLATION_ELEMENT
  GROUND_STATION
  ANTENNA
  MISSION_CONTROL
  DATA_CENTER
  LAUNCH_PAD
  TTC_UPLINK
  TTC_DOWNLINK
  PAYLOAD_DATA_LINK
  INTER_SATELLITE_LINK
  GROUND_NETWORK
  FLIGHT_SOFTWARE
  GROUND_SOFTWARE
  DATA_PROCESSING
  CLOUD_INFRASTRUCTURE
  ENCRYPTION_SYSTEM
  MONITORING_SYSTEM
  THIRD_PARTY_SERVICE
  LAUNCH_SERVICE
  INSURANCE_PROVIDER
  FREQUENCY_ALLOCATION
}

enum AssetCategory {
  SPACE_SEGMENT
  GROUND_SEGMENT
  LINK_SEGMENT
  SOFTWARE_DATA
  ORGANISATIONAL
}

enum AssetCriticality {
  CRITICAL
  HIGH
  MEDIUM
  LOW
}

enum AssetOperationalStatus {
  ACTIVE
  STANDBY
  MAINTENANCE
  DECOMMISSIONED
  PLANNED
}

enum DataClassification {
  PUBLIC
  INTERNAL
  CONFIDENTIAL
  RESTRICTED
}

enum ComplianceStatus {
  NOT_ASSESSED
  COMPLIANT
  PARTIAL
  NON_COMPLIANT
  NOT_APPLICABLE
}

enum NexusDependencyType {
  REQUIRES
  COMMUNICATES_WITH
  CONTROLLED_BY
  PROCESSES_DATA_FROM
  POWERED_BY
  BACKS_UP
}

enum NexusDependencyStrength {
  HARD
  SOFT
  REDUNDANT
}

enum SupplierType {
  MANUFACTURER
  SOFTWARE_VENDOR
  SERVICE_PROVIDER
  COMPONENT_SUPPLIER
  CLOUD_PROVIDER
}

enum VulnerabilityStatus {
  OPEN
  IN_PROGRESS
  MITIGATED
  RESOLVED
  ACCEPTED
  FALSE_POSITIVE
}

enum PersonnelRole {
  OPERATOR
  ADMINISTRATOR
  VIEWER
  MAINTENANCE
  VENDOR_ACCESS
}

enum PersonnelAccessLevel {
  FULL
  READ_ONLY
  PHYSICAL_ONLY
  REMOTE_ONLY
}
```

- [ ] **Step 2: Validate schema parses**

Run: `cd /Users/julianpolleschner/caelex-assessment && npx prisma format`
Expected: No errors

---

### Task 2: Add NEXUS Models to Prisma Schema

**Files:**

- Modify: `prisma/schema.prisma` (after the new enums from Task 1)

- [ ] **Step 1: Add all 6 NEXUS models**

Add after the enums from Task 1:

```prisma
// ── NEXUS: Central Asset Registry ──

model Asset {
  id                 String                 @id @default(cuid())
  organizationId     String
  organization       Organization           @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  name               String
  assetType          AssetType
  category           AssetCategory
  description        String?                @db.Text
  externalId         String?

  criticality        AssetCriticality       @default(MEDIUM)
  dataClassification DataClassification     @default(INTERNAL)
  operationalStatus  AssetOperationalStatus @default(ACTIVE)

  nis2Relevant       Boolean  @default(false)
  euSpaceActRelevant Boolean  @default(false)
  nis2Subsector      String?

  location           String?
  jurisdiction       String?
  manufacturer       String?
  commissionedDate   DateTime?
  expectedEolDate    DateTime?

  complianceScore    Float?
  riskScore          Float?
  lastAssessedAt     DateTime?

  spacecraftId       String?
  spacecraft         Spacecraft?            @relation(fields: [spacecraftId], references: [id])
  operatorEntityId   String?
  operatorEntity     OperatorEntity?        @relation(fields: [operatorEntityId], references: [id])

  metadata           Json?
  isDeleted          Boolean  @default(false)
  deletedAt          DateTime?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
  createdBy          String?

  requirements       AssetRequirement[]
  dependenciesFrom   AssetDependency[]      @relation("NexusDependencySource")
  dependenciesTo     AssetDependency[]      @relation("NexusDependencyTarget")
  suppliers          AssetSupplier[]
  vulnerabilities    AssetVulnerability[]
  personnel          AssetPersonnel[]
  incidentAssets     IncidentAsset[]

  @@unique([organizationId, name])
  @@index([organizationId])
  @@index([organizationId, assetType])
  @@index([organizationId, criticality])
  @@index([organizationId, complianceScore])
  @@index([spacecraftId])
  @@index([operatorEntityId])
  @@index([isDeleted])
}

model AssetRequirement {
  id                  String           @id @default(cuid())
  assetId             String
  asset               Asset            @relation(fields: [assetId], references: [id], onDelete: Cascade)

  regulationFramework String
  requirementId       String
  requirementLabel    String

  status              ComplianceStatus @default(NOT_ASSESSED)

  evidenceId          String?
  evidence            ComplianceEvidence? @relation(fields: [evidenceId], references: [id])
  evidenceFiles       String[]

  assessedAt          DateTime?
  assessedBy          String?
  nextReviewDate      DateTime?
  notes               String?          @db.Text

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@unique([assetId, regulationFramework, requirementId])
  @@index([assetId])
  @@index([status])
}

model AssetDependency {
  id              String                  @id @default(cuid())
  sourceAssetId   String
  sourceAsset     Asset                   @relation("NexusDependencySource", fields: [sourceAssetId], references: [id], onDelete: Cascade)
  targetAssetId   String
  targetAsset     Asset                   @relation("NexusDependencyTarget", fields: [targetAssetId], references: [id], onDelete: Cascade)

  dependencyType  NexusDependencyType
  strength        NexusDependencyStrength @default(HARD)
  description     String?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([sourceAssetId, targetAssetId, dependencyType])
  @@index([sourceAssetId])
  @@index([targetAssetId])
}

model AssetSupplier {
  id                   String           @id @default(cuid())
  assetId              String
  asset                Asset            @relation(fields: [assetId], references: [id], onDelete: Cascade)

  supplierName         String
  supplierType         SupplierType
  jurisdiction         String?

  riskLevel            AssetCriticality @default(MEDIUM)
  certifications       String[]
  lastAssessed         DateTime?
  contractExpiry       DateTime?
  singlePointOfFailure Boolean          @default(false)
  alternativeAvailable Boolean          @default(false)

  notes                String?          @db.Text
  createdAt            DateTime         @default(now())
  updatedAt            DateTime         @updatedAt

  @@index([assetId])
  @@index([riskLevel])
}

model AssetVulnerability {
  id                String              @id @default(cuid())
  assetId           String
  asset             Asset               @relation(fields: [assetId], references: [id], onDelete: Cascade)

  cveId             String?
  title             String
  severity          AssetCriticality
  cvssScore         Float?

  status            VulnerabilityStatus @default(OPEN)
  discoveredAt      DateTime            @default(now())
  mitigatedAt       DateTime?
  resolvedAt        DateTime?

  affectedComponent String?
  patchAvailable    Boolean  @default(false)
  patchApplied      Boolean  @default(false)
  patchVersion      String?
  workaround        String?  @db.Text

  notes             String?  @db.Text
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([assetId])
  @@index([severity])
  @@index([status])
  @@index([discoveredAt])
}

model AssetPersonnel {
  id               String               @id @default(cuid())
  assetId          String
  asset            Asset                @relation(fields: [assetId], references: [id], onDelete: Cascade)

  personName       String
  role             PersonnelRole
  accessLevel      PersonnelAccessLevel
  mfaEnabled       Boolean  @default(false)
  lastTraining     DateTime?
  trainingRequired Boolean  @default(true)
  clearanceLevel   String?

  accessGrantedAt  DateTime @default(now())
  accessExpiresAt  DateTime?
  isActive         Boolean  @default(true)

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@index([assetId])
  @@index([isActive])
}
```

- [ ] **Step 2: Validate schema parses**

Run: `npx prisma format`
Expected: No errors

---

### Task 3: Add Back-Relations to Existing Models

**Files:**

- Modify: `prisma/schema.prisma` — 5 existing models need back-relations

- [ ] **Step 1: Add `assets Asset[]` to Organization model**

Find `conjunctionEvents ConjunctionEvent[]` (~line 2550) in the Organization model. Add after it:

```prisma
  assets              Asset[]
```

- [ ] **Step 2: Add `assets Asset[]` to Spacecraft model**

Find `optimizationResults OptimizationResult[]` (~line 2694) in the Spacecraft model. Add after it:

```prisma
  assets              Asset[]
```

- [ ] **Step 3: Add `assets Asset[]` to OperatorEntity model**

Find `dependenciesAsTarget  EntityDependency[] @relation("DependencyTarget")` (~line 2729) in the OperatorEntity model. Add after it:

```prisma
  assets              Asset[]
```

- [ ] **Step 4: Add `nexusAssetId` and relation to IncidentAsset model**

Find the IncidentAsset model (~line 1481). Add before `@@index([incidentId])`:

```prisma
  nexusAssetId String?
  nexusAsset   Asset?   @relation(fields: [nexusAssetId], references: [id])

  @@index([nexusAssetId])
```

- [ ] **Step 5: Add `assetRequirements AssetRequirement[]` to ComplianceEvidence model**

Find `requirementMappings EvidenceRequirementMapping[]` (~line 3768) in the ComplianceEvidence model. Add after it:

```prisma
  assetRequirements   AssetRequirement[]
```

- [ ] **Step 6: Validate and generate**

Run: `npx prisma format && npx prisma generate`
Expected: No errors, Prisma client regenerated

---

### Task 4: Run Migration

- [ ] **Step 1: Create migration**

Run: `npx prisma migrate dev --name add-nexus-asset-register`
Expected: Migration created, database schema updated

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors (existing errors may remain but no new ones from NEXUS)

---

### Task 5: Add NEXUS Audit Types

**Files:**

- Modify: `src/lib/audit.ts`

- [ ] **Step 1: Add NEXUS action types**

Find `| "ace_chain_verified";` (line 105). Change to:

```typescript
  | "ace_chain_verified"
  | "nexus_asset_created"
  | "nexus_asset_updated"
  | "nexus_asset_deleted"
  | "nexus_requirement_assessed"
  | "nexus_requirement_synced"
  | "nexus_dependency_added"
  | "nexus_dependency_removed"
  | "nexus_vulnerability_added"
  | "nexus_vulnerability_updated"
  | "nexus_supplier_added"
  | "nexus_supplier_updated"
  | "nexus_personnel_added"
  | "nexus_personnel_updated"
  | "nexus_scores_recalculated";
```

- [ ] **Step 2: Add NEXUS entity types**

Find the last entry in `AuditEntityType` (~line 145). Add:

```typescript
  | "nexus_asset"
  | "nexus_requirement"
  | "nexus_dependency"
  | "nexus_vulnerability"
  | "nexus_supplier"
  | "nexus_personnel";
```

---

### Task 6: Add NEXUS Rate Limit Tier

**Files:**

- Modify: `src/lib/ratelimit.ts`

- [ ] **Step 1: Add `nexus` to RateLimitType**

Find the last entry in the `RateLimitType` union (~line 376). Add `| "nexus"` to the union.

- [ ] **Step 2: Add `nexus` to rateLimiters object**

Inside the `rateLimiters` object (before line 251 closing), add:

```typescript
    nexus: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, "1 h"),
      prefix: "ratelimit:nexus",
    }),
```

- [ ] **Step 3: Add `nexus` to fallbackLimiters**

Inside the `fallbackLimiters` object (before line 348 closing), add:

```typescript
  nexus: { limit: 15, window: 3600000 },
```

---

### Task 7: Create NEXUS Types File

**Files:**

- Create: `src/lib/nexus/types.ts`

- [ ] **Step 1: Create directory and types file**

Run: `mkdir -p /Users/julianpolleschner/caelex-assessment/src/lib/nexus/integrations`

- [ ] **Step 2: Write types.ts**

Create `src/lib/nexus/types.ts` with asset taxonomy definitions, NIS2 requirement mapping per asset type, criticality weights, and helper types. Contents:

```typescript
import type {
  AssetType,
  AssetCategory,
  AssetCriticality,
  ComplianceStatus,
} from "@prisma/client";

// ═══════════════════════════════════════════════════════════
// NEXUS — Space Asset Taxonomy
// ═══════════════════════════════════════════════════════════

export interface AssetTypeConfig {
  id: AssetType;
  label: string;
  nis2Relevant: boolean;
  euSpaceActRelevant: boolean;
  defaultNis2Requirements: string[];
}

export interface AssetCategoryConfig {
  id: AssetCategory;
  label: string;
  description: string;
  icon: string; // Lucide icon name
  types: AssetTypeConfig[];
}

export const ASSET_CATEGORIES: AssetCategoryConfig[] = [
  {
    id: "SPACE_SEGMENT",
    label: "Space Segment",
    description: "Orbital assets and payloads",
    icon: "Satellite",
    types: [
      {
        id: "SPACECRAFT",
        label: "Spacecraft / Satellite",
        nis2Relevant: true,
        euSpaceActRelevant: true,
        defaultNis2Requirements: [
          "art_21_2_a",
          "art_21_2_b",
          "art_21_2_c",
          "art_21_2_e",
          "art_21_2_h",
        ],
      },
      {
        id: "PAYLOAD",
        label: "Payload Instrument",
        nis2Relevant: true,
        euSpaceActRelevant: true,
        defaultNis2Requirements: ["art_21_2_a", "art_21_2_b"],
      },
      {
        id: "PROPULSION",
        label: "Propulsion System",
        nis2Relevant: false,
        euSpaceActRelevant: true,
        defaultNis2Requirements: ["art_21_2_a", "art_21_2_b"],
      },
      {
        id: "CONSTELLATION_ELEMENT",
        label: "Constellation Element",
        nis2Relevant: true,
        euSpaceActRelevant: true,
        defaultNis2Requirements: [
          "art_21_2_a",
          "art_21_2_b",
          "art_21_2_c",
          "art_21_2_e",
          "art_21_2_h",
        ],
      },
    ],
  },
  {
    id: "GROUND_SEGMENT",
    label: "Ground Segment",
    description: "Earth-based infrastructure",
    icon: "Radio",
    types: [
      {
        id: "GROUND_STATION",
        label: "Ground Station",
        nis2Relevant: true,
        euSpaceActRelevant: true,
        defaultNis2Requirements: [
          "art_21_2_a",
          "art_21_2_b",
          "art_21_2_c",
          "art_21_2_d",
          "art_21_2_e",
          "art_21_2_f",
          "art_21_2_h",
          "art_21_2_i",
          "art_21_2_j",
        ],
      },
      {
        id: "ANTENNA",
        label: "Antenna System",
        nis2Relevant: true,
        euSpaceActRelevant: true,
        defaultNis2Requirements: ["art_21_2_a", "art_21_2_b"],
      },
      {
        id: "MISSION_CONTROL",
        label: "Mission Control Center",
        nis2Relevant: true,
        euSpaceActRelevant: true,
        defaultNis2Requirements: [
          "art_21_2_a",
          "art_21_2_b",
          "art_21_2_c",
          "art_21_2_e",
          "art_21_2_f",
          "art_21_2_g",
          "art_21_2_h",
          "art_21_2_i",
          "art_21_2_j",
        ],
      },
      {
        id: "DATA_CENTER",
        label: "Data Center / Processing Facility",
        nis2Relevant: true,
        euSpaceActRelevant: false,
        defaultNis2Requirements: [
          "art_21_2_a",
          "art_21_2_b",
          "art_21_2_c",
          "art_21_2_e",
          "art_21_2_h",
          "art_21_2_i",
        ],
      },
      {
        id: "LAUNCH_PAD",
        label: "Launch Pad / Range",
        nis2Relevant: true,
        euSpaceActRelevant: true,
        defaultNis2Requirements: ["art_21_2_a", "art_21_2_b"],
      },
    ],
  },
  {
    id: "LINK_SEGMENT",
    label: "Link Segment",
    description: "Communication links and data paths",
    icon: "Link",
    types: [
      {
        id: "TTC_UPLINK",
        label: "TT&C Uplink",
        nis2Relevant: true,
        euSpaceActRelevant: true,
        defaultNis2Requirements: [
          "art_21_2_a",
          "art_21_2_b",
          "art_21_2_e",
          "art_21_2_h",
          "art_21_2_i",
        ],
      },
      {
        id: "TTC_DOWNLINK",
        label: "TT&C Downlink",
        nis2Relevant: true,
        euSpaceActRelevant: true,
        defaultNis2Requirements: [
          "art_21_2_a",
          "art_21_2_b",
          "art_21_2_e",
          "art_21_2_h",
          "art_21_2_i",
        ],
      },
      {
        id: "PAYLOAD_DATA_LINK",
        label: "Payload Data Link",
        nis2Relevant: true,
        euSpaceActRelevant: true,
        defaultNis2Requirements: [
          "art_21_2_a",
          "art_21_2_b",
          "art_21_2_e",
          "art_21_2_h",
        ],
      },
      {
        id: "INTER_SATELLITE_LINK",
        label: "Inter-Satellite Link (ISL)",
        nis2Relevant: true,
        euSpaceActRelevant: true,
        defaultNis2Requirements: [
          "art_21_2_a",
          "art_21_2_b",
          "art_21_2_e",
          "art_21_2_h",
        ],
      },
      {
        id: "GROUND_NETWORK",
        label: "Ground Network / VPN",
        nis2Relevant: true,
        euSpaceActRelevant: false,
        defaultNis2Requirements: [
          "art_21_2_a",
          "art_21_2_b",
          "art_21_2_e",
          "art_21_2_h",
          "art_21_2_i",
        ],
      },
    ],
  },
  {
    id: "SOFTWARE_DATA",
    label: "Software & Data Systems",
    description: "Software, databases, and processing systems",
    icon: "Server",
    types: [
      {
        id: "FLIGHT_SOFTWARE",
        label: "Flight Software (FSW)",
        nis2Relevant: true,
        euSpaceActRelevant: true,
        defaultNis2Requirements: [
          "art_21_2_a",
          "art_21_2_e",
          "art_21_2_f",
          "art_21_2_h",
          "art_21_2_i",
        ],
      },
      {
        id: "GROUND_SOFTWARE",
        label: "Ground Control Software",
        nis2Relevant: true,
        euSpaceActRelevant: true,
        defaultNis2Requirements: [
          "art_21_2_a",
          "art_21_2_e",
          "art_21_2_f",
          "art_21_2_h",
          "art_21_2_i",
        ],
      },
      {
        id: "DATA_PROCESSING",
        label: "Data Processing Pipeline",
        nis2Relevant: true,
        euSpaceActRelevant: false,
        defaultNis2Requirements: ["art_21_2_a", "art_21_2_b", "art_21_2_e"],
      },
      {
        id: "CLOUD_INFRASTRUCTURE",
        label: "Cloud Infrastructure",
        nis2Relevant: true,
        euSpaceActRelevant: false,
        defaultNis2Requirements: [
          "art_21_2_a",
          "art_21_2_c",
          "art_21_2_d",
          "art_21_2_e",
          "art_21_2_h",
          "art_21_2_i",
        ],
      },
      {
        id: "ENCRYPTION_SYSTEM",
        label: "Encryption / Key Management",
        nis2Relevant: true,
        euSpaceActRelevant: true,
        defaultNis2Requirements: ["art_21_2_h", "art_21_2_j"],
      },
      {
        id: "MONITORING_SYSTEM",
        label: "Monitoring / SIEM",
        nis2Relevant: true,
        euSpaceActRelevant: false,
        defaultNis2Requirements: ["art_21_2_a", "art_21_2_b", "art_21_2_f"],
      },
    ],
  },
  {
    id: "ORGANISATIONAL",
    label: "Organisational Assets",
    description: "Processes, personnel, and third parties",
    icon: "Building2",
    types: [
      {
        id: "THIRD_PARTY_SERVICE",
        label: "Third-Party Service Provider",
        nis2Relevant: true,
        euSpaceActRelevant: false,
        defaultNis2Requirements: ["art_21_2_a", "art_21_2_b", "art_21_2_d"],
      },
      {
        id: "LAUNCH_SERVICE",
        label: "Launch Service Provider",
        nis2Relevant: true,
        euSpaceActRelevant: true,
        defaultNis2Requirements: ["art_21_2_a", "art_21_2_b", "art_21_2_d"],
      },
      {
        id: "INSURANCE_PROVIDER",
        label: "Insurance Provider",
        nis2Relevant: false,
        euSpaceActRelevant: true,
        defaultNis2Requirements: ["art_21_2_a", "art_21_2_b", "art_21_2_d"],
      },
      {
        id: "FREQUENCY_ALLOCATION",
        label: "Frequency Allocation / ITU Filing",
        nis2Relevant: false,
        euSpaceActRelevant: true,
        defaultNis2Requirements: ["art_21_2_a", "art_21_2_b"],
      },
    ],
  },
];

// Flat lookup: AssetType → config
export function getAssetTypeConfig(
  assetType: AssetType,
): AssetTypeConfig | undefined {
  for (const cat of ASSET_CATEGORIES) {
    const found = cat.types.find((t) => t.id === assetType);
    if (found) return found;
  }
  return undefined;
}

// Flat lookup: AssetType → AssetCategory
export function getCategoryForType(assetType: AssetType): AssetCategory {
  for (const cat of ASSET_CATEGORIES) {
    if (cat.types.some((t) => t.id === assetType)) return cat.id;
  }
  return "ORGANISATIONAL"; // fallback
}

// NIS2 requirement label lookup
export const NIS2_REQUIREMENT_LABELS: Record<string, string> = {
  art_21_2_a:
    "Art. 21(2)(a) — Policies on risk analysis and information system security",
  art_21_2_b: "Art. 21(2)(b) — Incident handling",
  art_21_2_c: "Art. 21(2)(c) — Business continuity and crisis management",
  art_21_2_d: "Art. 21(2)(d) — Supply chain security",
  art_21_2_e:
    "Art. 21(2)(e) — Security in acquisition, development and maintenance",
  art_21_2_f:
    "Art. 21(2)(f) — Policies to assess the effectiveness of cybersecurity measures",
  art_21_2_g:
    "Art. 21(2)(g) — Basic cyber hygiene practices and cybersecurity training",
  art_21_2_h:
    "Art. 21(2)(h) — Policies on the use of cryptography and encryption",
  art_21_2_i:
    "Art. 21(2)(i) — Human resources security, access control policies",
  art_21_2_j:
    "Art. 21(2)(j) — Use of multi-factor authentication, secured communications",
};

// Criticality weights for risk calculation
export const CRITICALITY_WEIGHTS: Record<AssetCriticality, number> = {
  CRITICAL: 1.0,
  HIGH: 0.75,
  MEDIUM: 0.5,
  LOW: 0.25,
};

// NIS2 status string → ComplianceStatus enum mapping (for sync with NIS2 module)
export function nis2StatusToComplianceStatus(status: string): ComplianceStatus {
  const map: Record<string, ComplianceStatus> = {
    compliant: "COMPLIANT",
    partial: "PARTIAL",
    non_compliant: "NON_COMPLIANT",
    not_assessed: "NOT_ASSESSED",
    not_applicable: "NOT_APPLICABLE",
  };
  return map[status] ?? "NOT_ASSESSED";
}

// Impact analysis result type
export interface ImpactAnalysisResult {
  assetId: string;
  assetName: string;
  impactLevel: "DIRECT" | "INDIRECT_1HOP" | "INDIRECT_2HOP";
  dependencyType: string;
  strength: string;
}

// Auto-detect suggestion type
export interface DependencySuggestion {
  sourceAssetId: string;
  sourceAssetName: string;
  targetAssetId: string;
  targetAssetName: string;
  dependencyType: string;
  strength: string;
  reason: string;
}
```

- [ ] **Step 3: Verify TypeScript**

Run: `npx tsc --noEmit 2>&1 | grep "nexus" | head -10`
Expected: No errors from nexus files

---

### Task 8: Create Zod Validation Schemas

**Files:**

- Create: `src/lib/nexus/validations.ts`

- [ ] **Step 1: Write validations.ts**

Create `src/lib/nexus/validations.ts` with Zod schemas for all NEXUS API inputs:

```typescript
import { z } from "zod";

// ── Asset ──
export const CreateAssetSchema = z.object({
  name: z.string().min(1).max(200),
  assetType: z.string(), // Validated against AssetType enum at service layer
  description: z.string().max(5000).optional(),
  externalId: z.string().max(100).optional(),
  criticality: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
  dataClassification: z
    .enum(["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"])
    .default("INTERNAL"),
  operationalStatus: z
    .enum(["ACTIVE", "STANDBY", "MAINTENANCE", "DECOMMISSIONED", "PLANNED"])
    .default("ACTIVE"),
  location: z.string().max(500).optional(),
  jurisdiction: z.string().length(2).optional(), // ISO 3166-1 alpha-2
  manufacturer: z.string().max(200).optional(),
  commissionedDate: z.string().datetime().optional(),
  expectedEolDate: z.string().datetime().optional(),
  spacecraftId: z.string().optional(),
  operatorEntityId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const UpdateAssetSchema = CreateAssetSchema.partial();

export const AssetFiltersSchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(), // comma-separated
  assetType: z.string().optional(),
  criticality: z.string().optional(), // comma-separated
  operationalStatus: z.string().optional(),
  minComplianceScore: z.coerce.number().min(0).max(100).optional(),
  maxComplianceScore: z.coerce.number().min(0).max(100).optional(),
  showDecommissioned: z.coerce.boolean().default(false),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  sortBy: z
    .enum(["name", "criticality", "complianceScore", "riskScore", "updatedAt"])
    .default("name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

// ── Requirement ──
export const BulkCreateRequirementsSchema = z.object({
  requirements: z.array(
    z.object({
      regulationFramework: z.string().min(1),
      requirementId: z.string().min(1),
      requirementLabel: z.string().min(1),
      status: z
        .enum([
          "NOT_ASSESSED",
          "COMPLIANT",
          "PARTIAL",
          "NON_COMPLIANT",
          "NOT_APPLICABLE",
        ])
        .default("NOT_ASSESSED"),
    }),
  ),
});

export const UpdateRequirementSchema = z.object({
  status: z
    .enum([
      "NOT_ASSESSED",
      "COMPLIANT",
      "PARTIAL",
      "NON_COMPLIANT",
      "NOT_APPLICABLE",
    ])
    .optional(),
  evidenceId: z.string().nullable().optional(),
  notes: z.string().max(5000).optional(),
  nextReviewDate: z.string().datetime().optional(),
});

// ── Dependency ──
export const CreateDependencySchema = z.object({
  targetAssetId: z.string().min(1),
  dependencyType: z.enum([
    "REQUIRES",
    "COMMUNICATES_WITH",
    "CONTROLLED_BY",
    "PROCESSES_DATA_FROM",
    "POWERED_BY",
    "BACKS_UP",
  ]),
  strength: z.enum(["HARD", "SOFT", "REDUNDANT"]).default("HARD"),
  description: z.string().max(500).optional(),
});

// ── Supplier ──
export const CreateSupplierSchema = z.object({
  supplierName: z.string().min(1).max(200),
  supplierType: z.enum([
    "MANUFACTURER",
    "SOFTWARE_VENDOR",
    "SERVICE_PROVIDER",
    "COMPONENT_SUPPLIER",
    "CLOUD_PROVIDER",
  ]),
  jurisdiction: z.string().length(2).optional(),
  riskLevel: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
  certifications: z.array(z.string()).default([]),
  contractExpiry: z.string().datetime().optional(),
  singlePointOfFailure: z.boolean().default(false),
  alternativeAvailable: z.boolean().default(false),
  notes: z.string().max(5000).optional(),
});

export const UpdateSupplierSchema = CreateSupplierSchema.partial();

// ── Vulnerability ──
export const CreateVulnerabilitySchema = z.object({
  cveId: z.string().max(20).optional(),
  title: z.string().min(1).max(300),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
  cvssScore: z.number().min(0).max(10).optional(),
  affectedComponent: z.string().max(200).optional(),
  patchAvailable: z.boolean().default(false),
  workaround: z.string().max(5000).optional(),
  notes: z.string().max(5000).optional(),
});

export const UpdateVulnerabilitySchema =
  CreateVulnerabilitySchema.partial().extend({
    status: z
      .enum([
        "OPEN",
        "IN_PROGRESS",
        "MITIGATED",
        "RESOLVED",
        "ACCEPTED",
        "FALSE_POSITIVE",
      ])
      .optional(),
    patchApplied: z.boolean().optional(),
    patchVersion: z.string().max(100).optional(),
  });

// ── Personnel ──
export const CreatePersonnelSchema = z.object({
  personName: z.string().min(1).max(200),
  role: z.enum([
    "OPERATOR",
    "ADMINISTRATOR",
    "VIEWER",
    "MAINTENANCE",
    "VENDOR_ACCESS",
  ]),
  accessLevel: z.enum(["FULL", "READ_ONLY", "PHYSICAL_ONLY", "REMOTE_ONLY"]),
  mfaEnabled: z.boolean().default(false),
  lastTraining: z.string().datetime().optional(),
  trainingRequired: z.boolean().default(true),
  clearanceLevel: z.string().max(50).optional(),
  accessExpiresAt: z.string().datetime().optional(),
});

export const UpdatePersonnelSchema = CreatePersonnelSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type CreateAssetInput = z.infer<typeof CreateAssetSchema>;
export type UpdateAssetInput = z.infer<typeof UpdateAssetSchema>;
export type AssetFiltersInput = z.infer<typeof AssetFiltersSchema>;
```

---

### Task 9: Commit Phase 1

- [ ] **Step 1: Run full validation**

Run: `npx prisma generate && npx tsc --noEmit 2>&1 | tail -5`
Expected: No new TypeScript errors

- [ ] **Step 2: Run existing tests**

Run: `npm run test:run 2>&1 | tail -10`
Expected: All existing tests still pass

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma src/lib/audit.ts src/lib/ratelimit.ts src/lib/nexus/
git commit -m "feat(nexus): phase 1 — prisma schema, types, and infrastructure

Add 12 enums, 6 models (Asset, AssetRequirement, AssetDependency,
AssetSupplier, AssetVulnerability, AssetPersonnel) with back-relations
to Organization, Spacecraft, OperatorEntity, ComplianceEvidence,
and IncidentAsset. Add NEXUS audit types, rate limit tier, asset
taxonomy with NIS2 requirement mapping, and Zod validation schemas.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 2: Service Layer

### Task 10: Asset Service

**Files:**

- Create: `src/lib/nexus/asset-service.server.ts`
- Test: `tests/unit/lib/nexus/asset-service.test.ts`

- [ ] **Step 1: Write asset service tests**

Create `tests/unit/lib/nexus/asset-service.test.ts` covering:

- `createAsset` — creates asset, auto-maps NIS2 requirements based on type, sets nis2Relevant flag
- `calculateAssetComplianceScore` — weighted score: COMPLIANT=1.0, PARTIAL=0.5, severity weighting
- `calculateAssetRiskScore` — criticality × (100 - compliance) × vuln factor × SPOF factor
- `getAssetsByOrganization` — filters by category, criticality, search text

Mock Prisma client using the existing `tests/mocks/` patterns. Use `vi.mock("@/lib/prisma")`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/lib/nexus/asset-service.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement asset-service.server.ts**

Create `src/lib/nexus/asset-service.server.ts` with `import "server-only"`. Implement all functions from the spec (section 4.1):

- `createAsset`: Create asset → lookup type config → bulk-create AssetRequirements → log audit
- `updateAsset`: Diff old vs new → update → log each changed field to AuditLog
- `softDeleteAsset`: Check open incidents → set isDeleted + deletedAt → log
- `getAssetById`: findFirst with all includes (requirements, dependencies, suppliers, vulns, personnel)
- `getAssetsByOrganization`: Prisma query with dynamic where clause from filters, pagination, sorting
- `calculateAssetComplianceScore`: Query requirements → lookup severity from nis2-requirements data → weighted average
- `calculateAssetRiskScore`: Use criticality weight × (100 - compliance) × vuln factor × SPOF factor
- `recalculateOrganizationScores`: Loop all non-deleted assets → recalculate → batch update
- `getOrganizationRiskOverview`: Aggregate counts, averages, top-risk assets

Use `logAuditEvent` from `@/lib/audit` for all write operations. Use `encrypt`/`decrypt` from `@/lib/encryption` for notes fields.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/lib/nexus/asset-service.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/nexus/asset-service.server.ts tests/unit/lib/nexus/asset-service.test.ts
git commit -m "feat(nexus): phase 2.1 — asset service with score calculation

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 11: Dependency Service

**Files:**

- Create: `src/lib/nexus/dependency-service.server.ts`
- Test: `tests/unit/lib/nexus/dependency-service.test.ts`

- [ ] **Step 1: Write dependency service tests**

Test coverage:

- `addDependency` — creates dependency, rejects circular dependency (A→B→C→A)
- `getImpactAnalysis` — BFS returns DIRECT, 1HOP, 2HOP affected assets
- `getSinglePointsOfFailure` — finds assets with HARD deps and no REDUNDANT backup
- `autoDetectDependencies` — suggests spacecraft→uplink→ground station chain

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/lib/nexus/dependency-service.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement dependency-service.server.ts**

Key algorithms:

- **Circularity check**: DFS from target back to source. If source is reachable, reject.
- **Impact analysis**: BFS from asset. Level 0 = DIRECT (immediate dependents), Level 1 = 1HOP, Level 2 = 2HOP. Only follow HARD and SOFT edges (not REDUNDANT).
- **SPOF detection**: Find all assets that are targetAsset in HARD dependencies. For each, check if any dependency to the same source has strength=REDUNDANT. If not → SPOF.
- **Auto-detect**: Query all assets by org. For each SPACECRAFT asset, suggest dependencies to TTC_UPLINK, TTC_DOWNLINK, GROUND_STATION, FLIGHT_SOFTWARE assets in the same org.

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/unit/lib/nexus/dependency-service.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/nexus/dependency-service.server.ts tests/unit/lib/nexus/dependency-service.test.ts
git commit -m "feat(nexus): phase 2.2 — dependency service with cycle detection and impact analysis

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 12: Vulnerability, Supplier, and Personnel Services

**Files:**

- Create: `src/lib/nexus/vulnerability-service.server.ts`
- Create: `src/lib/nexus/supplier-service.server.ts`
- Create: `src/lib/nexus/personnel-service.server.ts`
- Test: `tests/unit/lib/nexus/vulnerability-service.test.ts`
- Test: `tests/unit/lib/nexus/supplier-service.test.ts`
- Test: `tests/unit/lib/nexus/personnel-service.test.ts`

- [ ] **Step 1: Write tests for all three services**

Vulnerability tests: CRUD, `getPatchComplianceRate` (% patched), `getVulnerabilityDashboard` (aggregates), MTTR calculation.

Supplier tests: CRUD, `getSupplyChainRiskDashboard` (SPOFs, jurisdiction risks, expiring contracts).

Personnel tests: CRUD, `getMfaAdoptionRate` (% with MFA), `getTrainingDashboard` (overdue training).

- [ ] **Step 2: Implement all three services**

Each service follows the same pattern: `import "server-only"`, Prisma queries, audit logging, encryption for notes/sensitive fields.

Key metrics:

- **Patch rate**: `count(patchApplied=true) / count(patchAvailable=true) * 100`
- **MTTR**: Average of `(resolvedAt - discoveredAt)` for resolved vulnerabilities in last 90 days
- **MFA rate**: `count(mfaEnabled=true, isActive=true) / count(isActive=true) * 100`
- **Training compliance**: `count(lastTraining > now() - 1year, isActive=true) / count(trainingRequired=true, isActive=true) * 100`

- [ ] **Step 3: Run all tests**

Run: `npx vitest run tests/unit/lib/nexus/`
Expected: All PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/nexus/vulnerability-service.server.ts src/lib/nexus/supplier-service.server.ts src/lib/nexus/personnel-service.server.ts tests/unit/lib/nexus/
git commit -m "feat(nexus): phase 2.3 — vulnerability, supplier, and personnel services

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 3: API Routes

### Task 13: Core Asset API Routes

**Files:**

- Create: `src/app/api/nexus/assets/route.ts` — GET list, POST create
- Create: `src/app/api/nexus/assets/[id]/route.ts` — GET, PATCH, DELETE
- Create: `src/app/api/nexus/assets/[id]/score/route.ts` — GET scores
- Create: `src/app/api/nexus/assets/[id]/impact/route.ts` — GET impact analysis
- Test: `tests/integration/nexus/assets-api.test.ts`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p src/app/api/nexus/assets/[id]/{score,impact,requirements/[reqId],dependencies/[depId],suppliers/[supId],vulnerabilities/[vulnId],personnel/[persId]}
mkdir -p src/app/api/nexus/{overview,graph,spof,auto-detect,metrics/{patch-rate,mfa-rate,training,supply-chain}}
```

- [ ] **Step 2: Implement all API routes**

Every route follows this pattern (from existing codebase):

```typescript
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ... org membership check, Zod validation, service call, response
}
```

Implement all 22 route files following this pattern. Each route:

1. Auth check (`session.user.id`)
2. Org membership check (verify user belongs to the asset's org)
3. Zod validation (parse request body/params with schemas from `validations.ts`)
4. Service call (delegate to appropriate service function)
5. Return JSON response

- [ ] **Step 3: Write integration tests**

Create `tests/integration/nexus/assets-api.test.ts` testing:

- POST `/api/nexus/assets` — creates asset + auto requirements
- GET `/api/nexus/overview` — returns aggregated data
- GET `/api/nexus/metrics/patch-rate` — correct calculation

Use mocked Prisma client following existing integration test patterns.

- [ ] **Step 4: Run integration tests**

Run: `npx vitest run tests/integration/nexus/`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/nexus/ tests/integration/nexus/
git commit -m "feat(nexus): phase 3 — all API routes (22 files)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 4: Frontend

### Task 14: Sidebar Navigation

**Files:**

- Modify: `src/components/dashboard/Sidebar.tsx` (~line 826, after Shield nav item)

- [ ] **Step 1: Add NEXUS nav item**

Find the Shield `NavItem` block (ending ~line 826). Add after it:

```tsx
<NavItem
  href="/dashboard/nexus"
  icon={<Network size={18} strokeWidth={1.5} />}
  onClick={handleNavClick}
  collapsed={collapsed}
>
  Asset Register
</NavItem>
```

Add `Network` to the lucide-react import at the top of the file.

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/Sidebar.tsx
git commit -m "feat(nexus): add Asset Register to sidebar navigation

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 15: NEXUS Components

**Files:**

- Create: `src/components/nexus/AssetMetricsBar.tsx`
- Create: `src/components/nexus/AssetTable.tsx`
- Create: `src/components/nexus/RiskDistributionChart.tsx`
- Create: `src/components/nexus/AddAssetWizard.tsx`
- Create: `src/components/nexus/AssetOverviewTab.tsx`
- Create: `src/components/nexus/AssetRequirementsTab.tsx`
- Create: `src/components/nexus/AssetDependenciesTab.tsx`
- Create: `src/components/nexus/AssetSecurityTab.tsx`
- Create: `src/components/nexus/AssetAuditTab.tsx`
- Create: `src/components/nexus/DependencyGraph.tsx`

- [ ] **Step 1: Create component directory**

```bash
mkdir -p src/components/nexus
```

- [ ] **Step 2: Implement all components**

Follow the existing design system strictly:

- Use `Card`, `GlassCard` from `@/components/ui/`
- Use `GlassMotion`, `GlassStagger`, `glassItemVariants` from `@/components/ui/GlassMotion`
- Use glass classes: `glass-surface`, `glass-elevated`, `glass-floating`
- Use semantic type tokens: `text-body`, `text-heading`, `text-title`, `text-display-sm`
- Use CSS custom properties for colors, not hardcoded hex
- Use Framer Motion `AnimatePresence` for wizard steps
- Use Recharts for the donut chart
- Use Lucide icons

**DependencyGraph.tsx**: Custom SVG component. Center node (current asset) at center. Connected nodes in a radial layout. Edges colored by strength. Uses simple trigonometric positioning (no D3 needed).

**AddAssetWizard.tsx**: 3-step modal wizard. Step 1: 5 category cards + type dropdown. Step 2: Classification dropdowns. Step 3: Review + requirement count preview.

- [ ] **Step 3: Commit**

```bash
git add src/components/nexus/
git commit -m "feat(nexus): phase 4.1 — all NEXUS React components

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 16: Overview Page

**Files:**

- Create: `src/app/dashboard/nexus/page.tsx`

- [ ] **Step 1: Implement overview page**

`"use client"` component. Fetches data from `GET /api/nexus/overview` and `GET /api/nexus/assets`. Renders:

1. `AssetMetricsBar` (top)
2. `AssetTable` with filter bar (center)
3. `RiskDistributionChart` (side/bottom)
4. Quick action buttons (Add Asset opens `AddAssetWizard` modal)

Follow the pattern from `src/app/dashboard/modules/nis2/page.tsx` for data fetching, loading states, and error handling.

- [ ] **Step 2: Commit**

```bash
git add src/app/dashboard/nexus/
git commit -m "feat(nexus): phase 4.2 — overview page

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 17: Asset Detail Page

**Files:**

- Create: `src/app/dashboard/nexus/[id]/page.tsx`

- [ ] **Step 1: Implement detail page**

`"use client"` component. Fetches from `GET /api/nexus/assets/[id]`. 5-tab layout using local state for active tab, Framer Motion for tab transitions.

Tabs render: `AssetOverviewTab`, `AssetRequirementsTab`, `AssetDependenciesTab`, `AssetSecurityTab`, `AssetAuditTab`.

Each tab fetches its own data lazily (only when activated).

- [ ] **Step 2: Commit**

```bash
git add src/app/dashboard/nexus/[id]/
git commit -m "feat(nexus): phase 4.3 — asset detail page with 5 tabs

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 5: Cross-Module Integration

### Task 18: Integration Bridges

**Files:**

- Create: `src/lib/nexus/integrations/ephemeris-bridge.ts`
- Create: `src/lib/nexus/integrations/incident-bridge.ts`
- Create: `src/lib/nexus/integrations/nis2-sync.ts`

- [ ] **Step 1: Implement NIS2 sync**

`nis2-sync.ts` exports:

- `syncNis2StatusToNexus(requirementId: string, newStatus: string, orgId: string)` — Find all AssetRequirements matching this requirementId → update status using `nis2StatusToComplianceStatus` mapper → recalculate affected asset scores
- `syncNexusStatusToNis2(assetId: string, requirementId: string, newStatus: ComplianceStatus)` — Optional reverse sync (log only, don't auto-change NIS2 status)

- [ ] **Step 2: Implement incident bridge**

`incident-bridge.ts` exports:

- `getImpactForIncident(incidentId: string)` — Query IncidentAsset where nexusAssetId is set → run impact analysis on each → return combined cascade
- `checkDecommissionSafety(assetId: string)` — Check for open incidents referencing this asset

- [ ] **Step 3: Implement Ephemeris bridge**

`ephemeris-bridge.ts` exports:

- `getNexusMetricsForEphemeris(orgId: string)` — Returns { patchRate, mfaRate, openCriticalVulns, mttrMinutes } for consumption by Ephemeris adapter
- `getSpacecraftComplianceFromNexus(spacecraftId: string)` — Returns NEXUS compliance score for a spacecraft asset

- [ ] **Step 4: Commit**

```bash
git add src/lib/nexus/integrations/
git commit -m "feat(nexus): phase 5 — cross-module integration bridges

NIS2 sync, incident impact analysis, and Ephemeris metrics bridge.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 6: Final Validation

### Task 19: Full Validation and Final Commit

- [ ] **Step 1: Run type check**

Run: `npx tsc --noEmit 2>&1 | tail -20`
Expected: No new errors

- [ ] **Step 2: Run all tests**

Run: `npm run test:run 2>&1 | tail -20`
Expected: All tests pass (existing + new NEXUS tests)

- [ ] **Step 3: Run linter**

Run: `npm run lint 2>&1 | tail -10`
Expected: No new lint errors

- [ ] **Step 4: Test build**

Run: `npm run build 2>&1 | tail -10`
Expected: Build succeeds

- [ ] **Step 5: Final integration commit if any fixes were needed**

```bash
git add -A
git commit -m "feat(nexus): phase 6 — final validation and fixes

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```
