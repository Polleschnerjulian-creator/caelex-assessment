# NEXUS — Space Asset Register & Compliance Nerve Center

> Design Spec | 2026-03-11 | Status: Approved

## 1. Overview

NEXUS is Caelex's Space Asset Register — the connective tissue of the platform. Every asset (spacecraft, ground station, data link, software system, supplier) becomes a living node in a compliance network. Each node carries its own compliance score, linked regulations, risk assessments, and connections to all other Caelex modules.

### Why This Matters

No space-compliance tool offers an asset-centric compliance model. Existing solutions are regulation-centric ("Do we meet Art. 21(2)(a)?"). NEXUS flips the perspective: "Which assets are at risk, which regulations affect them, and what's the impact if one fails?"

### Architectural Position

NEXUS is a **Tier-2 Analysis System** (same level as Ephemeris/Shield), not a core assessment module:

```
Tier-0: Compliance Foundation (EU Space Act, NIS2 assessments)
Tier-1: Core Modules (Authorization, Cybersecurity, NIS2, Debris, etc.)
Tier-2: Analysis Systems (Ephemeris, Shield, NEXUS)
Tier-3: Intelligence (Optimizer, Astra AI, Mission Control)
```

### Relationship to Existing Models

| Existing Model                 | Abstraction Level               | NEXUS Relationship                                     |
| ------------------------------ | ------------------------------- | ------------------------------------------------------ |
| `OperatorEntity` (Ephemeris)   | Business: "Who operates what?"  | Asset links to OperatorEntity via `operatorEntityId`   |
| `EntityDependency` (Ephemeris) | Strategic: operator-to-operator | NEXUS adds technical asset-to-asset dependencies       |
| `Spacecraft`                   | Physical: orbital object        | Asset links to Spacecraft via `spacecraftId`           |
| `ComplianceEvidence`           | Evidence: proof of compliance   | AssetRequirement links to ComplianceEvidence           |
| `IncidentAsset`                | Incident: affected assets       | Extended with `nexusAssetId` for NEXUS bridge          |
| `AuditLog`                     | Audit: all changes              | Reused with new action types (no separate audit model) |

### Cost

$0 additional. Built entirely on the existing stack (Prisma, PostgreSQL/Neon, Next.js, Zod, Framer Motion, Recharts, Lucide). No new paid dependencies. No AI API calls. No external services.

---

## 2. Data Model

### 2.1 New Prisma Enums

```prisma
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

// Note: Prefixed with "Nexus" to avoid collision with existing
// DependencyType and DependencyStrength enums (used by Ephemeris EntityDependency)
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

### 2.2 Core Models

#### Asset (central node)

```prisma
model Asset {
  id                 String                 @id @default(cuid())
  organizationId     String
  organization       Organization           @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  // Identification
  name               String
  assetType          AssetType
  category           AssetCategory
  description        String?                @db.Text
  externalId         String?                // NORAD ID, ITU Filing, serial number

  // Classification
  criticality        AssetCriticality       @default(MEDIUM)
  dataClassification DataClassification     @default(INTERNAL)
  operationalStatus  AssetOperationalStatus @default(ACTIVE)

  // Regulatory
  nis2Relevant       Boolean  @default(false)
  euSpaceActRelevant Boolean  @default(false)
  nis2Subsector      String?

  // Technical
  location           String?
  jurisdiction       String?                // ISO 3166-1 alpha-2
  manufacturer       String?
  commissionedDate   DateTime?
  expectedEolDate    DateTime?

  // Compliance (cached, computed)
  complianceScore    Float?                 // 0-100
  riskScore          Float?                 // 0-100
  lastAssessedAt     DateTime?

  // Links to existing models
  spacecraftId       String?
  spacecraft         Spacecraft?            @relation(fields: [spacecraftId], references: [id])
  operatorEntityId   String?
  operatorEntity     OperatorEntity?        @relation(fields: [operatorEntityId], references: [id])

  // Metadata
  metadata           Json?
  isDeleted          Boolean  @default(false)
  deletedAt          DateTime?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
  createdBy          String?

  // Relations
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
```

#### AssetRequirement (compliance mapping per asset)

```prisma
model AssetRequirement {
  id                  String           @id @default(cuid())
  assetId             String
  asset               Asset            @relation(fields: [assetId], references: [id], onDelete: Cascade)

  regulationFramework String           // "NIS2", "EU_SPACE_ACT", "IADC", "ISO_24113"
  requirementId       String           // e.g. "nis2_art_21_2_a"
  requirementLabel    String

  status              ComplianceStatus @default(NOT_ASSESSED)

  // Link to existing ComplianceEvidence (reuse, don't duplicate)
  evidenceId          String?
  evidence            ComplianceEvidence?    @relation(fields: [evidenceId], references: [id])
  evidenceFiles       String[]

  assessedAt          DateTime?
  assessedBy          String?
  nextReviewDate      DateTime?
  notes               String?          @db.Text  // Encrypted at application layer

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@unique([assetId, regulationFramework, requirementId])
  @@index([assetId])
  @@index([status])
}
```

#### AssetDependency (technical dependency graph)

```prisma
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
```

#### AssetSupplier (supply chain security — NIS2 Art. 21(2)(d))

```prisma
model AssetSupplier {
  id                   String       @id @default(cuid())
  assetId              String
  asset                Asset        @relation(fields: [assetId], references: [id], onDelete: Cascade)

  supplierName         String
  supplierType         SupplierType
  jurisdiction         String?

  riskLevel            AssetCriticality @default(MEDIUM)
  certifications       String[]
  lastAssessed         DateTime?
  contractExpiry       DateTime?
  singlePointOfFailure Boolean      @default(false)
  alternativeAvailable Boolean      @default(false)

  notes                String?      @db.Text
  createdAt            DateTime     @default(now())
  updatedAt            DateTime     @updatedAt

  @@index([assetId])
  @@index([riskLevel])
}
```

#### AssetVulnerability (NIS2 Art. 21(2)(e))

```prisma
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
```

#### AssetPersonnel (NIS2 Art. 21(2)(i))

```prisma
model AssetPersonnel {
  id               String              @id @default(cuid())
  assetId          String
  asset            Asset               @relation(fields: [assetId], references: [id], onDelete: Cascade)

  personName       String              // Encrypted at application layer
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

### 2.3 Modifications to Existing Models

**Organization:** Add `assets Asset[]` relation

**Spacecraft:** Add `assets Asset[]` back-relation

**OperatorEntity:** Add `assets Asset[]` back-relation

**ComplianceEvidence:** Add `assetRequirements AssetRequirement[]` back-relation

**IncidentAsset:** Add:

- `nexusAssetId String?`
- `nexusAsset Asset? @relation(fields: [nexusAssetId], references: [id])`
- `@@index([nexusAssetId])`

**AuditLog action types to add:**

- `nexus_asset_created`, `nexus_asset_updated`, `nexus_asset_deleted`
- `nexus_requirement_assessed`, `nexus_requirement_synced`
- `nexus_dependency_added`, `nexus_dependency_removed`
- `nexus_vulnerability_added`, `nexus_vulnerability_updated`
- `nexus_supplier_added`, `nexus_supplier_updated`
- `nexus_personnel_added`, `nexus_personnel_updated`
- `nexus_scores_recalculated`

**AuditLog entity types to add:**

- `nexus_asset`, `nexus_requirement`, `nexus_dependency`
- `nexus_vulnerability`, `nexus_supplier`, `nexus_personnel`

---

## 3. Asset Taxonomy & Automatic Requirement Mapping

### 3.1 Categories & Types

File: `src/lib/nexus/types.ts`

5 categories, 24 asset types. Each type has:

- `nis2Relevant: boolean` — auto-flags asset
- `euSpaceActRelevant: boolean` — auto-flags asset
- `icon: string` — Lucide icon name
- `defaultNis2Requirements: string[]` — auto-mapped on creation

### 3.2 Auto-Mapping Logic

When an asset is created:

1. Look up asset type in taxonomy → get `defaultNis2Requirements`
2. For each mapped requirement ID, create `AssetRequirement` with `status: NOT_ASSESSED`
3. If org has an existing `NIS2Assessment`, sync status from `NIS2RequirementStatus` where matching
4. If `euSpaceActRelevant`, add EU Space Act article requirements similarly
5. Log `nexus_asset_created` to AuditLog

### 3.3 NIS2 Requirement Mapping by Asset Type

| Asset Type                                                                                           | NIS2 Requirements (Art. 21(2)) |
| ---------------------------------------------------------------------------------------------------- | ------------------------------ |
| GROUND_STATION                                                                                       | a, b, c, d, e, f, h, i, j      |
| MISSION_CONTROL                                                                                      | a, b, c, e, f, g, h, i, j      |
| TTC_UPLINK / TTC_DOWNLINK                                                                            | a, b, e, h, i                  |
| FLIGHT_SOFTWARE / GROUND_SOFTWARE                                                                    | a, e, f, h, i                  |
| CLOUD_INFRASTRUCTURE                                                                                 | a, c, d, e, h, i               |
| ENCRYPTION_SYSTEM                                                                                    | h, j                           |
| SPACECRAFT                                                                                           | a, b, c, e, h                  |
| ORGANISATIONAL types (THIRD_PARTY_SERVICE, LAUNCH_SERVICE, INSURANCE_PROVIDER, FREQUENCY_ALLOCATION) | a, b, d                        |
| All others (minimum)                                                                                 | a, b                           |

### 3.4 Score Calculations

**Compliance Score** (0-100):

```
For each requirement:
  // severity is looked up from the regulatory data file (e.g. nis2-requirements.ts)
  // by matching requirementId. Field: requirement.severity ("critical" | "major" | "minor")
  weight = severity == "critical" ? 2.0 : severity == "major" ? 1.5 : 1.0
  score  = COMPLIANT ? 1.0 : PARTIAL ? 0.5 : 0.0
Total = (sum(score * weight) / sum(weight)) * 100
```

**Risk Score** (0-100):

```
base = criticality_weight * (100 - complianceScore)
vuln_factor = 1 + (open_critical_vulns * 0.15) + (open_high_vulns * 0.05)
spof_factor = has_spof_supplier ? 1.2 : 1.0
riskScore = min(100, base * vuln_factor * spof_factor)
```

Where `criticality_weight`: CRITICAL=1.0, HIGH=0.75, MEDIUM=0.5, LOW=0.25

---

## 4. Service Layer

All services are `*.server.ts` files with `import "server-only"`.

### 4.1 Asset Service (`src/lib/nexus/asset-service.server.ts`)

| Function                                  | Purpose                                                                  |
| ----------------------------------------- | ------------------------------------------------------------------------ |
| `createAsset(orgId, data)`                | Create + auto-map requirements + audit log                               |
| `updateAsset(assetId, data)`              | Update with diff-based audit trail                                       |
| `softDeleteAsset(assetId)`                | Set `isDeleted` + `deletedAt` + check for open incidents                 |
| `getAssetById(assetId, orgId)`            | Full asset with all relations                                            |
| `getAssetsByOrganization(orgId, filters)` | Filtered list (type, category, criticality, status, score range, search) |
| `calculateAssetComplianceScore(assetId)`  | Weighted requirement compliance                                          |
| `calculateAssetRiskScore(assetId)`        | Criticality × gaps × vulns × SPOF                                        |
| `recalculateOrganizationScores(orgId)`    | Batch recalc all assets                                                  |
| `getOrganizationRiskOverview(orgId)`      | Aggregated metrics for dashboard                                         |

### 4.2 Dependency Service (`src/lib/nexus/dependency-service.server.ts`)

| Function                                            | Purpose                                                     |
| --------------------------------------------------- | ----------------------------------------------------------- |
| `addDependency(sourceId, targetId, type, strength)` | Create + circularity check (DFS)                            |
| `removeDependency(depId)`                           | Delete                                                      |
| `getDependencyGraph(orgId)`                         | Full graph as adjacency list                                |
| `getImpactAnalysis(assetId)`                        | BFS: affected assets if this one fails (DIRECT, 1HOP, 2HOP) |
| `getSinglePointsOfFailure(orgId)`                   | Assets with HARD inbound deps + no REDUNDANT backup         |
| `autoDetectDependencies(orgId)`                     | Heuristic suggestions (spacecraft→uplink→ground station)    |

### 4.3 Vulnerability Service (`src/lib/nexus/vulnerability-service.server.ts`)

| Function                           | Purpose                                                 |
| ---------------------------------- | ------------------------------------------------------- |
| CRUD                               | Standard create/update/delete per asset                 |
| `getVulnerabilityDashboard(orgId)` | Open by severity, MTTR, patch coverage, 30-day trend    |
| `getPatchComplianceRate(orgId)`    | % patched systems — live metric for Ephemeris threshold |

### 4.4 Supplier Service (`src/lib/nexus/supplier-service.server.ts`)

| Function                             | Purpose                                       |
| ------------------------------------ | --------------------------------------------- |
| CRUD                                 | Standard per asset                            |
| `getSupplyChainRiskDashboard(orgId)` | SPOFs, jurisdiction risks, expiring contracts |

### 4.5 Personnel Service (`src/lib/nexus/personnel-service.server.ts`)

| Function                      | Purpose                                 |
| ----------------------------- | --------------------------------------- |
| CRUD                          | Standard per asset                      |
| `getMfaAdoptionRate(orgId)`   | % with MFA — live metric for Ephemeris  |
| `getTrainingDashboard(orgId)` | Training compliance, overdue refreshers |

---

## 5. API Routes

All under `src/app/api/nexus/`. Auth: NextAuth session + org membership. Validation: Zod. CSRF protection on state-changing requests.

```
/api/nexus/assets                        GET (list), POST (create)
/api/nexus/assets/[id]                   GET, PATCH, DELETE (soft)
/api/nexus/assets/[id]/score             GET (compliance + risk)
/api/nexus/assets/[id]/requirements           GET, POST (bulk)
/api/nexus/assets/[id]/requirements/[reqId]  PATCH, DELETE
/api/nexus/assets/[id]/dependencies          GET, POST
/api/nexus/assets/[id]/dependencies/[depId]  DELETE
/api/nexus/assets/[id]/suppliers             GET, POST
/api/nexus/assets/[id]/suppliers/[supId]     PATCH, DELETE
/api/nexus/assets/[id]/vulnerabilities       GET, POST
/api/nexus/assets/[id]/vulnerabilities/[vulnId]  PATCH, DELETE
/api/nexus/assets/[id]/personnel             GET, POST
/api/nexus/assets/[id]/personnel/[persId]    PATCH, DELETE
/api/nexus/assets/[id]/impact            GET (impact analysis)
/api/nexus/overview                      GET (org dashboard data)
/api/nexus/graph                         GET (dependency graph)
/api/nexus/spof                          GET (single points of failure)
/api/nexus/auto-detect                   POST (auto-detect dependencies)
/api/nexus/metrics/patch-rate            GET
/api/nexus/metrics/mfa-rate              GET
/api/nexus/metrics/training              GET
/api/nexus/metrics/supply-chain          GET
```

Rate limiting: Add `nexus` tier to `src/lib/ratelimit.ts` — 30 requests per hour (matches `assure` tier pattern). Must also add `"nexus"` to `RateLimitType` union. This is Phase 1 scope.

---

## 6. Frontend

### 6.1 Navigation

Add to `src/components/dashboard/Sidebar.tsx` in a new group or under existing "Predictive Modeling":

- Label: "Asset Register"
- Icon: `Network` (lucide-react)
- Path: `/dashboard/nexus`
- Plan gate: PROFESSIONAL+ (same as Ephemeris)

### 6.2 Overview Page (`/dashboard/nexus/page.tsx`)

**Layout: 4 areas**

**Area 1 — Metrics bar (top)**
4 metric cards using `Card variant="metric"`:

- Org Compliance Score (color ring)
- Total Assets (breakdown by category)
- Critical Gaps (NON_COMPLIANT requirements on CRITICAL assets)
- Open Vulnerabilities (by severity)

**Area 2 — Asset table (center, main)**
Sortable, filterable table with columns: Name, Type, Category, Criticality, Compliance %, Risk, Status, Actions.

Filter bar: search, category multi-select, criticality, status, compliance score range slider, "show decommissioned" toggle.

**Area 3 — Risk distribution (side/bottom)**
Donut chart (Recharts) showing asset distribution by risk tier:

- NOMINAL ≥85, WATCH ≥70, WARNING ≥50, CRITICAL <50

**Area 4 — Quick actions**

- "Add Asset" (primary button)
- "Auto-Detect Dependencies"
- "Export Register" (CSV)

### 6.3 Asset Detail Page (`/dashboard/nexus/[id]/page.tsx`)

**5-tab layout:**

| Tab              | Content                                                                                              |
| ---------------- | ---------------------------------------------------------------------------------------------------- |
| **Overview**     | Asset info card, compliance + risk scores, requirement status breakdown, recent audit entries        |
| **Requirements** | Full requirement list with inline status editing, evidence linking, progress bar                     |
| **Dependencies** | SVG-based dependency visualization (this asset as center node), impact analysis panel, SPOF warnings |
| **Security**     | Vulnerabilities table, suppliers cards, personnel table, patch/MFA/training metrics                  |
| **Audit**        | Chronological AuditLog entries filtered to this asset                                                |

### 6.4 Add Asset Wizard (Modal)

3-step wizard using Framer Motion `AnimatePresence`:

1. **Basics** — Name, category (5 large clickable cards), type (dynamic), description
2. **Classification** — Criticality, data classification, status, jurisdiction, spacecraft link
3. **Review** — Summary + "X NIS2 requirements and Y EU Space Act requirements will be auto-assigned"

### 6.5 Design System Compliance

- Dark-mode-first with Liquid Glass: `glass-surface`, `glass-elevated`, `glass-floating`
- Typography: semantic tokens (`text-body`, `text-heading`, `text-title`)
- Colors: CSS custom properties, not hardcoded hex
- Animations: Framer Motion (`GlassMotion`, `GlassStagger`, `glassItemVariants`)
- Components: `Card`, `GlassCard`, `Badge`, `Button` from `@/components/ui/`
- Charts: Recharts for donut/ring charts

### 6.6 Dependency Graph Visualization

**Approach:** Custom SVG + React (no D3 needed for this scope).

- Center node = current asset (highlighted, larger)
- Direct dependencies shown as connected nodes
- Edges colored by strength (HARD=red, SOFT=amber, REDUNDANT=green)
- Hover shows dependency type label
- Click navigates to target asset
- Impact analysis: highlighted cascade path on hover

This avoids a new dependency while fitting the existing component patterns. If more complex graph layouts are needed later, D3 can be added incrementally.

---

## 7. Cross-Module Integration

### 7.1 Ephemeris Bridge (`src/lib/nexus/integrations/ephemeris-bridge.ts`)

- Asset with `spacecraftId` → read `SatelliteComplianceState` score
- NEXUS metrics (patch-rate, MFA-rate) feed into Ephemeris as data source (trust level 2, between Sentinel and Assessment)
- New `nexus-adapter.ts` in `src/lib/ephemeris/data/` reads from NEXUS metrics API

### 7.2 Incident Bridge (`src/lib/nexus/integrations/incident-bridge.ts`)

- On incident creation: match `IncidentAsset.nexusAssetId` to NEXUS assets
- Run impact analysis on affected assets → show cascade in incident view
- On asset DECOMMISSIONED: warn if open incidents exist

### 7.3 NIS2 Sync (`src/lib/nexus/integrations/nis2-sync.ts`)

- NIS2RequirementStatus change → find NEXUS assets with matching requirement → update AssetRequirement status
- AssetRequirement status change → recalculate asset scores → optionally propagate to NIS2 maturity score
- Sync is eventual-consistency (triggered on write, not real-time subscription)
- **Status mapping:** `NIS2RequirementStatus.status` uses lowercase strings (`"compliant"`, `"partial"`, `"non_compliant"`, `"not_assessed"`, `"not_applicable"`). `AssetRequirement.status` uses the `ComplianceStatus` Prisma enum (`COMPLIANT`, `PARTIAL`, `NON_COMPLIANT`, `NOT_ASSESSED`, `NOT_APPLICABLE`). The sync service must map between these formats. Mapping function: `nis2StatusToComplianceStatus(s: string): ComplianceStatus`

### 7.4 Live Metrics for Ephemeris Thresholds

| Ephemeris Threshold                  | Old Source               | NEXUS Source                                  |
| ------------------------------------ | ------------------------ | --------------------------------------------- |
| `nis2_art_21_2_e_patch: 80%`         | Self-assessment checkbox | `GET /api/nexus/metrics/patch-rate`           |
| `nis2_art_21_2_j: 95%`               | Self-assessment checkbox | `GET /api/nexus/metrics/mfa-rate`             |
| `nis2_art_21_2_e_vulns: <1 critical` | Self-assessment checkbox | Real vuln count from AssetVulnerability       |
| `nis2_art_23: MTTR <1440min`         | Self-assessment checkbox | Real MTTR from vulnerability resolution times |

---

## 8. Testing Strategy

### 8.1 Unit Tests

| File                            | Coverage                                                      |
| ------------------------------- | ------------------------------------------------------------- |
| `asset-service.test.ts`         | CRUD, score calculation, auto requirement mapping             |
| `dependency-service.test.ts`    | Graph ops, circularity check, SPOF detection, impact analysis |
| `vulnerability-service.test.ts` | Dashboard aggregation, patch rate, MTTR                       |
| `supplier-service.test.ts`      | Risk score, SPOF detection                                    |
| `personnel-service.test.ts`     | MFA rate, training compliance                                 |

### 8.2 API Route Tests

| Route                               | Test                              |
| ----------------------------------- | --------------------------------- |
| `POST /api/nexus/assets`            | Creates asset + auto requirements |
| `GET /api/nexus/overview`           | Returns correct aggregated data   |
| `GET /api/nexus/metrics/patch-rate` | Correct calculation               |
| `POST /api/nexus/auto-detect`       | Correct heuristic suggestions     |
| `GET /api/nexus/assets/[id]/impact` | Correct BFS traversal             |

### 8.3 Integration Tests

- NIS2 sync: changing NIS2RequirementStatus propagates to NEXUS
- Score recalculation on requirement status change
- Soft delete cascading behavior

---

## 9. Implementation Phases & Timeline

| Phase     | Scope                                                                  | Estimate       |
| --------- | ---------------------------------------------------------------------- | -------------- |
| **1**     | Prisma schema + enums + types + migration + ratelimit.ts + audit types | 3-4 hours      |
| **2**     | Service layer (5 services)                                             | 3-4 days       |
| **3**     | API routes (22 route files incl. sub-ID routes)                        | 2-3 days       |
| **4**     | Frontend (overview + detail + wizard)                                  | 5-7 days       |
| **5**     | Cross-module integration (bridges + adapters)                          | 3-4 days       |
| **6**     | Tests (unit + API + integration)                                       | 2-3 days       |
| **Total** |                                                                        | **~4-5 weeks** |

### Commit Strategy

One commit per sub-phase:

- `feat(nexus): phase 1 — prisma schema and types`
- `feat(nexus): phase 2.1 — asset service`
- `feat(nexus): phase 2.2 — dependency service`
- etc.

---

## 10. Constraints

- No new paid dependencies
- Prisma Enums for all status/type fields (no string enums)
- Reuse existing AuditLog (no separate audit model)
- Reuse existing ComplianceEvidence (link, don't duplicate)
- TypeScript strict mode must pass: `npx tsc --noEmit`
- Existing tests must not break
- Encryption for sensitive fields (notes, personnel names) via `src/lib/encryption.ts`
- Audit logging for all write operations via `src/lib/audit.ts`
- Zod validation for all API inputs
- CSRF protection on state-changing requests
- Dark-mode-first Liquid Glass design system
- Framer Motion for animations
