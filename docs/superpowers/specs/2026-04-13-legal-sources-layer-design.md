# Legal Sources Data Layer — Design Spec

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a generic, multi-jurisdiction legal sources database that maps every applicable law, treaty, standard, and policy document to Caelex's compliance engines — starting with Germany as the first complete dataset (38 sources).

**Architecture:** Static TypeScript data files in `src/data/legal-sources/`, one file per jurisdiction, with a shared interface and lookup functions. No Prisma, no DB migration.

**Why:** The current Caelex data layer covers operational compliance (what to file, which authority, what deadline) but not the underlying legal basis (which treaty, which BGBl. reference, which article). Law firms like BHO Legal need the legal sources layer to verify Caelex's outputs against primary sources.

---

## 1. File Structure

```
src/data/legal-sources/
  types.ts              — LegalSource + Authority interfaces
  index.ts              — Re-exports, lookup functions, aggregation
  sources/
    de.ts               — Germany: 38 legal sources + 8 authorities
    _template.ts        — Empty template for new jurisdictions
```

Future additions (one file per jurisdiction, same interface):

```
    fr.ts               — France (LOS 2008, CNES framework, etc.)
    uk.ts               — UK (SIA 2018, OSA 1986, CAA guidance, etc.)
    it.ts               — Italy (Law 89/2025, MIMIT framework, etc.)
    eu.ts               — EU-level (Space Act, NIS2, CRA, etc.)
    international.ts    — Treaties (OST, Liability Conv, Registration Conv, etc.)
```

---

## 2. Data Model

### 2.1 `LegalSource` Interface

```typescript
export type LegalSourceType =
  | "international_treaty"
  | "federal_law"
  | "federal_regulation" // Verordnung, Durchführungsbestimmung
  | "technical_standard" // BSI TR, ISO, ECSS
  | "eu_regulation" // Directly applicable EU regulation
  | "eu_directive" // Requires national transposition
  | "policy_document" // Strategy papers, coalition agreements
  | "draft_legislation"; // Published drafts not yet enacted

export type LegalSourceStatus =
  | "in_force"
  | "draft"
  | "proposed"
  | "superseded"
  | "planned"
  | "not_ratified"
  | "expired";

export type RelevanceLevel =
  | "fundamental" // International treaties, constitutional basis
  | "critical" // Primary applicable law (SatDSiG, NIS2, CRA)
  | "high" // Directly affects compliance obligations
  | "medium" // Indirect or conditional relevance
  | "low"; // Background / context only

export type ComplianceArea =
  | "licensing"
  | "registration"
  | "liability"
  | "insurance"
  | "cybersecurity"
  | "export_control"
  | "data_security"
  | "frequency_spectrum"
  | "environmental"
  | "debris_mitigation"
  | "space_traffic_management"
  | "human_spaceflight"
  | "military_dual_use";

export type OperatorApplicability =
  | "satellite_operator"
  | "launch_provider"
  | "ground_segment"
  | "data_provider"
  | "in_orbit_services"
  | "constellation_operator"
  | "space_resource_operator"
  | "all";

export interface KeyProvision {
  section: string; // "Art. VI", "§ 3", "Part 2", "Section 4.1"
  title: string; // "State responsibility for private activities"
  summary: string; // 1-3 sentences explaining the obligation
  complianceImplication?: string; // What this means for operators
}

export interface LegalSource {
  id: string; // "DE-SATDSIG-2007", "INT-OST-1967"
  jurisdiction: string; // ISO 3166-1 alpha-2 or "INT" / "EU"
  type: LegalSourceType;
  status: LegalSourceStatus;

  // Titles
  title_en: string; // English title
  title_local?: string; // Original language title

  // Dates
  date_enacted?: string; // ISO date: "2007-11-23"
  date_in_force?: string; // May differ from enacted
  date_last_amended?: string; // Latest amendment
  date_published?: string; // For drafts/proposals

  // Official references
  official_reference?: string; // "BGBl. I S. 2590", "OJ L 333"
  parliamentary_reference?: string; // "BT-Drs. 20/12775"
  un_reference?: string; // "Resolution 2222 (XXI)"
  source_url: string; // Official publication URL

  // Institutional
  issuing_body: string; // "Bundestag", "European Commission", "UN GA"
  competent_authorities: string[]; // Authority IDs: ["DE-BMWK", "DE-BAFA"]

  // Classification
  relevance_level: RelevanceLevel;
  applicable_to: OperatorApplicability[];
  compliance_areas: ComplianceArea[];

  // Content
  key_provisions: KeyProvision[];
  scope_description?: string; // What the law covers / doesn't cover

  // Cross-references
  related_sources: string[]; // IDs of related legal sources
  amends?: string; // ID of the source this amends
  amended_by?: string[]; // IDs of sources that amend this
  implements?: string; // EU directive this law implements
  superseded_by?: string; // ID of replacing source

  // Caelex integration
  caelex_engine_mapping?: string[]; // ["engine.server", "nis2-engine.server"]
  caelex_data_file_mapping?: string[]; // ["national-space-laws.ts", "cybersecurity-requirements.ts"]

  // Metadata
  notes?: string[]; // Free-form annotations
  last_verified: string; // ISO date: when Caelex last verified accuracy
}
```

### 2.2 `Authority` Interface

```typescript
export interface Authority {
  id: string; // "DE-BMWK", "DE-BAFA", "FR-CNES"
  jurisdiction: string; // "DE", "FR"
  name_en: string;
  name_local: string;
  abbreviation: string; // "BMWK", "BAFA", "CNES"
  parent_ministry?: string;
  website: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  space_mandate: string; // 1-2 sentences: what they regulate
  legal_basis?: string; // Which law establishes their authority
  applicable_areas: ComplianceArea[];
}
```

---

## 3. Germany Dataset (38 Sources)

### 3.1 International Treaties (7)

| ID                      | Title                         | Status       | Relevance   |
| ----------------------- | ----------------------------- | ------------ | ----------- |
| `INT-OST-1967`          | Outer Space Treaty            | in_force     | fundamental |
| `INT-RESCUE-1968`       | Rescue Agreement              | in_force     | medium      |
| `INT-LIABILITY-1972`    | Liability Convention          | in_force     | critical    |
| `INT-REGISTRATION-1975` | Registration Convention       | in_force     | critical    |
| `INT-MOON-1979`         | Moon Agreement                | not_ratified | low         |
| `INT-PTBT-1963`         | Partial Test Ban Treaty       | in_force     | low         |
| `INT-ITU-CONST`         | ITU Constitution & Convention | in_force     | critical    |

Each treaty entry includes:

- BGBl. Fundstelle (e.g., "BGBl. 1969 II S. 1967" for OST)
- Key provisions with article-by-article summaries
- DE ratification status and date
- Cross-references to national implementing legislation

### 3.2 National German Laws (10)

| ID                | Title                                | Status   | Relevance |
| ----------------- | ------------------------------------ | -------- | --------- |
| `DE-SATDSIG-2007` | Satellitendatensicherheitsgesetz     | in_force | critical  |
| `DE-LUFTVG`       | Luftverkehrsgesetz                   | in_force | high      |
| `DE-TKG-2021`     | Telekommunikationsgesetz             | in_force | critical  |
| `DE-AWG-2013`     | Außenwirtschaftsgesetz               | in_force | high      |
| `DE-AWV-2013`     | Außenwirtschaftsverordnung           | in_force | high      |
| `DE-DUALUSE-2021` | EU Dual-Use Verordnung (2021/821)    | in_force | high      |
| `DE-KWKG`         | Kriegswaffenkontrollgesetz           | in_force | medium    |
| `DE-BSIG-NIS2`    | BSI-Gesetz (mit NIS2-Umsetzung)      | in_force | critical  |
| `DE-UVPG`         | Umweltverträglichkeitsprüfungsgesetz | in_force | medium    |
| `DE-PRODHAFTG`    | Produkthaftungsgesetz                | in_force | medium    |

Each national law entry includes:

- Full BGBl. reference including latest amendment
- gesetze-im-internet.de URL
- Competent authority mapping
- Key sections with space-relevance summaries
- Cross-reference to EU directives being implemented (where applicable)

### 3.3 BSI Technical Standards (6)

| ID                         | Title                                   | Status   | Relevance |
| -------------------------- | --------------------------------------- | -------- | --------- |
| `DE-BSI-TR-03184-1`        | TR-03184 Part 1: Space Segment          | in_force | critical  |
| `DE-BSI-TR-03184-2`        | TR-03184 Part 2: Ground Segment         | in_force | critical  |
| `DE-BSI-TR-03184-AUDIT`    | TR-03184 Audit/Prüfvorschrift           | in_force | high      |
| `DE-BSI-TR-03140`          | SatDSiG Konformitätsbewertung           | in_force | high      |
| `DE-BSI-GRUNDSCHUTZ-SPACE` | IT-Grundschutz Profile Space            | in_force | high      |
| `DE-BSI-POSITION-SPACE`    | Positionspapier Weltrauminfrastrukturen | in_force | medium    |

### 3.4 EU Law with Space Relevance (6)

| ID                   | Title                              | Status   | Relevance |
| -------------------- | ---------------------------------- | -------- | --------- |
| `EU-SPACE-ACT`       | EU Space Act (COM(2025) 335)       | proposed | critical  |
| `EU-SPACE-PROG-2021` | EU Space Programme Regulation      | in_force | high      |
| `EU-NIS2-2022`       | NIS2 Directive (2022/2555)         | in_force | critical  |
| `EU-CRA-2024`        | Cyber Resilience Act (2024/2847)   | in_force | high      |
| `EU-DORA-2022`       | Digital Operational Resilience Act | in_force | low       |
| `EU-EASA-2018`       | EASA Basic Regulation              | in_force | medium    |

### 3.5 Policy Documents (3)

| ID                           | Title                                  | Status     | Relevance |
| ---------------------------- | -------------------------------------- | ---------- | --------- |
| `DE-RAUMFAHRTSTRATEGIE-2023` | Raumfahrtstrategie der Bundesregierung | in_force   | medium    |
| `DE-WRG-ECKPUNKTE-2024`      | Eckpunktepapier Weltraumgesetz         | superseded | high      |
| `DE-KOALITIONSVERTRAG-2025`  | Koalitionsvertrag CDU/CSU-SPD 2025     | in_force   | medium    |

### 3.6 German Authorities (8)

| ID          | Name                                    | Abbreviation | Space Mandate                                   |
| ----------- | --------------------------------------- | ------------ | ----------------------------------------------- |
| `DE-BMWK`   | Federal Ministry for Economic Affairs   | BMWK         | Space policy, future licensing authority        |
| `DE-DLR`    | German Aerospace Center                 | DLR          | Space agency, ESA delegation, technical support |
| `DE-BAFA`   | Federal Office for Economic Affairs     | BAFA         | SatDSiG licensing, export control               |
| `DE-BSI`    | Federal Office for Information Security | BSI          | Cybersecurity standards, NIS2 supervision       |
| `DE-BNETZA` | Federal Network Agency                  | BNetzA       | Spectrum allocation, ITU filings                |
| `DE-LBA`    | Federal Aviation Authority              | LBA          | Airspace transit for launches                   |
| `DE-BMVG`   | Federal Ministry of Defence             | BMVg         | Military space, Weltraumkommando                |
| `DE-AA`     | Federal Foreign Office                  | AA           | COPUOS representation, treaty obligations       |

---

## 4. Lookup Functions

```typescript
// Get all legal sources for a jurisdiction
function getLegalSourcesByJurisdiction(code: string): LegalSource[];

// Get sources applicable to a specific compliance area
function getLegalSourcesByComplianceArea(
  jurisdiction: string,
  area: ComplianceArea,
): LegalSource[];

// Get sources by type across all jurisdictions
function getLegalSourcesByType(type: LegalSourceType): LegalSource[];

// Get a single source by ID
function getLegalSourceById(id: string): LegalSource | undefined;

// Get all authorities for a jurisdiction
function getAuthoritiesByJurisdiction(code: string): Authority[];

// Get authority by ID
function getAuthorityById(id: string): Authority | undefined;

// Get the legal basis chain for a compliance obligation
// e.g., "satellite frequency licensing in DE" →
//   INT-ITU-CONST → DE-TKG-2021 (§91) → DE-BNETZA
function getLegalBasisChain(
  jurisdiction: string,
  complianceArea: ComplianceArea,
): LegalSource[];

// Get all sources that reference a specific source
function getRelatedSources(sourceId: string): LegalSource[];

// Count sources by jurisdiction (for ATLAS stats)
function getLegalSourceStats(): Record<
  string,
  {
    total: number;
    byType: Record<LegalSourceType, number>;
    byStatus: Record<LegalSourceStatus, number>;
  }
>;
```

---

## 5. ATLAS Integration

### 5.1 Jurisdiction Deep Dive (`/atlas/jurisdictions/[code]`)

New section "Legal Framework" showing:

- All legal sources for the jurisdiction, grouped by type
- Each source: title, status badge, relevance badge, date, authority
- Click → expands to show key provisions
- Cross-reference links between sources
- "View Official Text" links to source_url

### 5.2 Comparator

New comparison dimension "Legal Framework":

- Number of space-specific laws
- Treaty ratification status
- Cybersecurity standards applicable
- Export control regime
- Upcoming legislation (draft/proposed sources)

### 5.3 ATLAS Command Center

Legal sources count in QuickStats: "156 Legal Sources Tracked"

---

## 6. Quality Standards

Every `LegalSource` entry MUST have:

- Accurate `official_reference` (BGBl., OJ L, etc.) — verifiable by a lawyer
- Working `source_url` pointing to the official publication
- `last_verified` date within 6 months
- At least 2 `key_provisions` entries with article references
- Correct `status` reflecting the current legal state
- `competent_authorities` linked to valid Authority IDs

The `notes` field carries context that a lawyer needs but doesn't fit structured fields (e.g., "The Eckpunktepapier was abandoned after the Ampel coalition collapsed in December 2024. The CDU/SPD coalition agreement 2025 announced a new attempt.").

---

## 7. Template for New Jurisdictions

`_template.ts` exports an empty skeleton:

```typescript
import type { LegalSource, Authority } from "../types";

// ─── [COUNTRY] Legal Sources ───
// Status: NOT YET POPULATED
// Sources needed: [list from research]

export const LEGAL_SOURCES_XX: LegalSource[] = [];
export const AUTHORITIES_XX: Authority[] = [];
```

Each new jurisdiction follows the same pattern as DE:

1. Research all applicable legal sources (international + national + EU + standards)
2. Fill the template with structured data
3. Cross-reference with existing jurisdiction data in `national-space-laws.ts`
4. Add tests in `regulatory-accuracy.test.ts`

---

## 8. Testing

Add to `tests/unit/data/regulatory-accuracy.test.ts`:

- Every DE legal source has a valid `source_url` (not empty)
- Every DE legal source has at least 2 `key_provisions`
- All `competent_authorities` IDs map to valid Authority entries
- All `related_sources` IDs map to existing LegalSource entries
- BGBl. references follow the correct format pattern
- No duplicate IDs across all jurisdiction files
- International treaties appear consistently across jurisdictions that ratified them
- `getLegalBasisChain()` returns non-empty for all critical compliance areas in DE

---

## 9. Implementation Order

1. Create `types.ts` with all interfaces and type definitions
2. Create `sources/de.ts` with all 38 German legal sources + 8 authorities
3. Create `index.ts` with all lookup functions
4. Create `_template.ts` as empty skeleton
5. Add regulatory accuracy tests
6. Wire into ATLAS jurisdiction deep dive page
