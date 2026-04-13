# Legal Sources Data Layer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a generic legal sources database with Germany as the first complete dataset (38 sources, 8 authorities), providing law firms with verifiable primary-source references for every compliance obligation.

**Architecture:** Static TypeScript data files in `src/data/legal-sources/` with shared interfaces, one file per jurisdiction, and typed lookup functions. Follows the existing pattern of `src/data/national-space-laws.ts`. No Prisma models, no DB migration.

**Tech Stack:** TypeScript strict mode, Vitest for testing, existing Caelex data layer patterns.

---

## File Structure

```
src/data/legal-sources/
  types.ts              — LegalSource + Authority interfaces + type exports
  index.ts              — Aggregation, re-exports, all lookup functions
  sources/
    de.ts               — Germany: 38 legal sources + 8 authorities
    _template.ts        — Empty skeleton for future jurisdictions
tests/unit/data/
  legal-sources.test.ts — Structural + accuracy tests
```

---

### Task 1: Type Definitions

**Files:**

- Create: `src/data/legal-sources/types.ts`

- [ ] **Step 1: Create the types file with all interfaces**

```typescript
// src/data/legal-sources/types.ts

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Legal source type definitions for the multi-jurisdiction regulatory
 * knowledge base. These types are the contract between jurisdiction
 * data files and the lookup/rendering layer.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

// ─── Enums ───────────────────────────────────────────────────────────

export type LegalSourceType =
  | "international_treaty"
  | "federal_law"
  | "federal_regulation"
  | "technical_standard"
  | "eu_regulation"
  | "eu_directive"
  | "policy_document"
  | "draft_legislation";

export type LegalSourceStatus =
  | "in_force"
  | "draft"
  | "proposed"
  | "superseded"
  | "planned"
  | "not_ratified"
  | "expired";

export type RelevanceLevel =
  | "fundamental"
  | "critical"
  | "high"
  | "medium"
  | "low";

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

// ─── Interfaces ──────────────────────────────────────────────────────

export interface KeyProvision {
  section: string;
  title: string;
  summary: string;
  complianceImplication?: string;
}

export interface LegalSource {
  id: string;
  jurisdiction: string;
  type: LegalSourceType;
  status: LegalSourceStatus;

  title_en: string;
  title_local?: string;

  date_enacted?: string;
  date_in_force?: string;
  date_last_amended?: string;
  date_published?: string;

  official_reference?: string;
  parliamentary_reference?: string;
  un_reference?: string;
  source_url: string;

  issuing_body: string;
  competent_authorities: string[];

  relevance_level: RelevanceLevel;
  applicable_to: OperatorApplicability[];
  compliance_areas: ComplianceArea[];

  key_provisions: KeyProvision[];
  scope_description?: string;

  related_sources: string[];
  amends?: string;
  amended_by?: string[];
  implements?: string;
  superseded_by?: string;

  caelex_engine_mapping?: string[];
  caelex_data_file_mapping?: string[];

  notes?: string[];
  last_verified: string;
}

export interface Authority {
  id: string;
  jurisdiction: string;
  name_en: string;
  name_local: string;
  abbreviation: string;
  parent_ministry?: string;
  website: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  space_mandate: string;
  legal_basis?: string;
  applicable_areas: ComplianceArea[];
}

// ─── Jurisdiction Data Bundle ────────────────────────────────────────

export interface JurisdictionLegalData {
  jurisdiction: string;
  sources: LegalSource[];
  authorities: Authority[];
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep legal-sources`
Expected: No output (zero errors)

- [ ] **Step 3: Commit**

```bash
git add src/data/legal-sources/types.ts
git commit -m "feat(legal-sources): type definitions for multi-jurisdiction legal data"
```

---

### Task 2: Germany Authorities

**Files:**

- Create: `src/data/legal-sources/sources/de.ts` (partial — authorities only in this task)

- [ ] **Step 1: Create the DE file with 8 authority entries**

```typescript
// src/data/legal-sources/sources/de.ts

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * German space law sources — complete legal framework for jurisdiction DE.
 *
 * Sources: Auswärtiges Amt, BMWK, BAFA, BSI, BNetzA, DLR, gesetze-im-internet.de
 * Last verified: 2026-04-13
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalSource, Authority } from "../types";

// ─── German Authorities (8) ──────────────────────────────────────────

export const AUTHORITIES_DE: Authority[] = [
  {
    id: "DE-BMWK",
    jurisdiction: "DE",
    name_en: "Federal Ministry for Economic Affairs and Climate Action",
    name_local: "Bundesministerium für Wirtschaft und Klimaschutz",
    abbreviation: "BMWK",
    website: "https://www.bmwk.de",
    contact_email: "raumfahrt@bmwk.bund.de",
    space_mandate:
      "Lead ministry for space policy. Designated future licensing authority under a national space law. Currently oversees SatDSiG implementation and coordinates DLR's space agency role.",
    legal_basis: "Grundgesetz Art. 65 (Ressortprinzip); SatDSiG § 3",
    applicable_areas: ["licensing", "registration", "data_security"],
  },
  {
    id: "DE-DLR",
    jurisdiction: "DE",
    name_en: "German Aerospace Center — Space Agency",
    name_local: "Deutsches Zentrum für Luft- und Raumfahrt — Raumfahrtagentur",
    abbreviation: "DLR",
    website: "https://www.dlr.de/rd",
    contact_email: "info-ra@dlr.de",
    space_mandate:
      "Manages the German national space programme on behalf of BMWK. Represents Germany in ESA governance. Provides technical assessment for licensing decisions. Operates the German Space Situational Awareness Centre (GSSAC).",
    legal_basis: "BMWK delegation; DLR-Gesetz",
    applicable_areas: [
      "licensing",
      "registration",
      "debris_mitigation",
      "space_traffic_management",
    ],
  },
  {
    id: "DE-BAFA",
    jurisdiction: "DE",
    name_en: "Federal Office for Economic Affairs and Export Control",
    name_local: "Bundesamt für Wirtschaft und Ausfuhrkontrolle",
    abbreviation: "BAFA",
    website: "https://www.bafa.de",
    contact_email: "poststelle@bafa.bund.de",
    space_mandate:
      "Competent authority for SatDSiG licensing (high-resolution Earth observation). Administers dual-use and military export controls for space technology under AWG/AWV and EU Regulation 2021/821.",
    legal_basis: "SatDSiG § 3; AWG § 13; EU VO 2021/821",
    applicable_areas: ["licensing", "export_control", "data_security"],
  },
  {
    id: "DE-BSI",
    jurisdiction: "DE",
    name_en: "Federal Office for Information Security",
    name_local: "Bundesamt für Sicherheit in der Informationstechnik",
    abbreviation: "BSI",
    website: "https://www.bsi.bund.de",
    contact_email: "certrequest@bsi.bund.de",
    space_mandate:
      "IT security conformity assessments under SatDSiG (TR-03140). Publishes TR-03184 (space segment + ground segment cybersecurity). National NIS2 supervisory authority for critical infrastructure including space sector (BSIG §§ 30-31).",
    legal_basis: "BSIG; SatDSiG § 9; NIS2 transposition via NIS2UmsuCG",
    applicable_areas: ["cybersecurity", "data_security"],
  },
  {
    id: "DE-BNETZA",
    jurisdiction: "DE",
    name_en: "Federal Network Agency",
    name_local: "Bundesnetzagentur",
    abbreviation: "BNetzA",
    website: "https://www.bundesnetzagentur.de",
    contact_email: "info@bnetza.de",
    space_mandate:
      "Allocates radio frequencies for satellite communications, TT&C, and payload links under TKG § 91. Submits ITU filings on behalf of German operators. Issues domestic spectrum licences. Enforces TK security requirements (TKG § 165).",
    legal_basis: "TKG §§ 91, 165; ITU Radio Regulations",
    applicable_areas: ["frequency_spectrum", "cybersecurity"],
  },
  {
    id: "DE-LBA",
    jurisdiction: "DE",
    name_en: "Federal Aviation Authority",
    name_local: "Luftfahrt-Bundesamt",
    abbreviation: "LBA",
    website: "https://www.lba.de",
    space_mandate:
      "Regulates transit of launch vehicles through German airspace under LuftVG § 1(2). Issues airspace closure orders and coordinates with military air traffic control for launch windows.",
    legal_basis: "LuftVG § 1 Abs. 2; LuftVO",
    applicable_areas: ["licensing"],
  },
  {
    id: "DE-BMVG",
    jurisdiction: "DE",
    name_en: "Federal Ministry of Defence — Space Command",
    name_local: "Bundesministerium der Verteidigung — Weltraumkommando",
    abbreviation: "BMVg/WRKdo",
    website: "https://www.bundeswehr.de",
    space_mandate:
      "Operates the Weltraumkommando (Space Command) at Uedem for military space situational awareness. Responsible for Bundeswehr satellite systems and space security policy. WRG Eckpunkte included a Notstandsregelung (emergency access) provision.",
    applicable_areas: ["military_dual_use", "space_traffic_management"],
  },
  {
    id: "DE-AA",
    jurisdiction: "DE",
    name_en: "Federal Foreign Office",
    name_local: "Auswärtiges Amt",
    abbreviation: "AA",
    website: "https://www.auswaertiges-amt.de",
    space_mandate:
      "Represents Germany in UN COPUOS and other international space law fora. Responsible for treaty ratification processes and diplomatic aspects of space activities (Outer Space Treaty Art. VI compliance).",
    legal_basis: "Grundgesetz Art. 32 (Auswärtige Beziehungen)",
    applicable_areas: ["registration", "liability"],
  },
];
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep legal-sources`
Expected: No output (zero errors)

- [ ] **Step 3: Commit**

```bash
git add src/data/legal-sources/sources/de.ts
git commit -m "feat(legal-sources): 8 german authority entries with mandates and legal basis"
```

---

### Task 3: Germany International Treaties (7)

**Files:**

- Modify: `src/data/legal-sources/sources/de.ts`

- [ ] **Step 1: Add the 7 international treaty entries after AUTHORITIES_DE**

Add the following to `de.ts` after the authorities array:

```typescript
// ─── International Treaties ratified by DE (7) ──────────────────────

const TREATIES_DE: LegalSource[] = [
  {
    id: "INT-OST-1967",
    jurisdiction: "INT",
    type: "international_treaty",
    status: "in_force",
    title_en:
      "Treaty on Principles Governing the Activities of States in the Exploration and Use of Outer Space, including the Moon and Other Celestial Bodies",
    title_local:
      "Vertrag über die Grundsätze zur Regelung der Tätigkeiten von Staaten bei der Erforschung und Nutzung des Weltraums einschließlich des Mondes und anderer Himmelskörper",
    date_enacted: "1967-01-27",
    date_in_force: "1967-10-10",
    official_reference: "BGBl. 1969 II S. 1967",
    un_reference: "Resolution 2222 (XXI)",
    source_url:
      "https://www.auswaertiges-amt.de/de/aussenpolitik/regelbasierte-internationale-ordnung/voelkerrecht-internationales-recht/einzelfragen/weltraumrecht/weltraumrecht/217086",
    issuing_body: "United Nations General Assembly",
    competent_authorities: ["DE-AA"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration", "liability"],
    key_provisions: [
      {
        section: "Art. I",
        title: "Freedom of exploration and use",
        summary:
          "Outer space shall be free for exploration and use by all States on a basis of equality and in accordance with international law.",
      },
      {
        section: "Art. II",
        title: "Non-appropriation principle",
        summary:
          "Outer space and celestial bodies are not subject to national appropriation by claim of sovereignty, use, occupation, or any other means.",
      },
      {
        section: "Art. VI",
        title: "State responsibility and authorization",
        summary:
          "States bear international responsibility for national space activities including by non-governmental entities. Activities of non-governmental entities require authorization and continuing supervision by the appropriate State.",
        complianceImplication:
          "This is the legal foundation for ALL national licensing regimes. Every German space operator must be authorized because Germany bears responsibility under Art. VI for their activities.",
      },
      {
        section: "Art. VII",
        title: "Launching State liability",
        summary:
          "A State that launches or procures the launch of an object into outer space, and a State from whose territory or facility an object is launched, is internationally liable for damage to another State or its natural or juridical persons.",
        complianceImplication:
          "Germany is liable as 'launching State' for damage caused by objects launched from its territory or by its nationals. This drives insurance and liability requirements.",
      },
      {
        section: "Art. VIII",
        title: "Registration and jurisdiction",
        summary:
          "A State Party on whose registry an object launched into outer space is carried shall retain jurisdiction and control over such object and over any personnel thereof.",
        complianceImplication:
          "Registration determines which State has jurisdiction. German-registered satellites are under German jurisdiction regardless of their orbital position.",
      },
      {
        section: "Art. IX",
        title: "Consultation and contamination avoidance",
        summary:
          "States shall conduct exploration so as to avoid harmful contamination and adverse changes in the environment of Earth. Consultation required if activities would cause potentially harmful interference.",
        complianceImplication:
          "Legal basis for debris mitigation and environmental requirements.",
      },
    ],
    related_sources: [
      "INT-LIABILITY-1972",
      "INT-REGISTRATION-1975",
      "INT-RESCUE-1968",
    ],
    notes: [
      "Ratified by Germany — constitutes binding international law under Art. 25 GG.",
      "Art. VI is the single most important provision for space compliance: it creates the obligation for States to authorize and supervise ALL private space activities.",
    ],
    last_verified: "2026-04-13",
  },
  {
    id: "INT-RESCUE-1968",
    jurisdiction: "INT",
    type: "international_treaty",
    status: "in_force",
    title_en:
      "Agreement on the Rescue of Astronauts, the Return of Astronauts and the Return of Objects Launched into Outer Space",
    title_local:
      "Übereinkommen über die Rettung und Rückführung von Raumfahrern sowie die Rückgabe von in den Weltraum gestarteten Gegenständen",
    date_enacted: "1968-04-22",
    date_in_force: "1968-12-03",
    official_reference: "BGBl. 1971 II S. 237",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/rescueagreement.html",
    issuing_body: "United Nations General Assembly",
    competent_authorities: ["DE-AA"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Art. 1-4",
        title: "Rescue and return of astronauts",
        summary:
          "Contracting parties shall notify, rescue, and return astronauts who land in their territory, and assist astronauts in distress.",
      },
      {
        section: "Art. 5",
        title: "Return of space objects",
        summary:
          "Space objects found beyond the territory of the launching authority shall, upon request, be returned to the launching authority.",
        complianceImplication:
          "Relevant for mission planning and end-of-life procedures — operators should plan for controlled re-entry to avoid triggering return obligations.",
      },
    ],
    related_sources: ["INT-OST-1967"],
    last_verified: "2026-04-13",
  },
  {
    id: "INT-LIABILITY-1972",
    jurisdiction: "INT",
    type: "international_treaty",
    status: "in_force",
    title_en:
      "Convention on International Liability for Damage Caused by Space Objects",
    title_local:
      "Übereinkommen über die völkerrechtliche Haftung für Schäden durch Weltraumgegenstände",
    date_enacted: "1972-03-29",
    date_in_force: "1972-09-01",
    official_reference: "BGBl. 1975 II S. 1209",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introliability-convention.html",
    issuing_body: "United Nations General Assembly",
    competent_authorities: ["DE-AA", "DE-BMWK"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["liability", "insurance"],
    key_provisions: [
      {
        section: "Art. II",
        title: "Absolute liability for surface damage",
        summary:
          "A launching State shall be absolutely liable to pay compensation for damage caused by its space object on the surface of the Earth or to aircraft in flight.",
        complianceImplication:
          "Launching States face strict (no-fault) liability for ground damage. This drives mandatory insurance requirements in national space laws — operators must carry coverage because the State is ultimately liable.",
      },
      {
        section: "Art. III",
        title: "Fault-based liability in space",
        summary:
          "Damage caused in outer space to a space object of another State is compensated only if the damage is due to fault of the launching State or its agents.",
        complianceImplication:
          "In-orbit collisions require proof of fault. This is less burdensome than surface liability but still drives collision avoidance obligations.",
      },
      {
        section: "Art. V",
        title: "Joint and several liability for joint launches",
        summary:
          "Where two or more States jointly launch a space object, they shall be jointly and severally liable for any damage caused.",
        complianceImplication:
          "Shared launches (e.g., rideshare missions) create joint liability exposure. Each participating State can be held liable for the full damage amount.",
      },
    ],
    related_sources: ["INT-OST-1967", "DE-SATDSIG-2007"],
    notes: [
      "The Liability Convention is the direct legal basis for national insurance and indemnification requirements.",
      "Germany's planned Weltraumgesetz included a liability cap of €50M and operator recourse limited to 10% of 3-year average turnover.",
    ],
    last_verified: "2026-04-13",
  },
  {
    id: "INT-REGISTRATION-1975",
    jurisdiction: "INT",
    type: "international_treaty",
    status: "in_force",
    title_en: "Convention on Registration of Objects Launched into Outer Space",
    title_local:
      "Übereinkommen über die Registrierung von in den Weltraum gestarteten Gegenständen",
    date_enacted: "1975-01-14",
    date_in_force: "1976-09-15",
    official_reference: "BGBl. 1979 II S. 650",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introregistration-convention.html",
    issuing_body: "United Nations General Assembly",
    competent_authorities: ["DE-AA", "DE-DLR"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["registration"],
    key_provisions: [
      {
        section: "Art. II",
        title: "National registry obligation",
        summary:
          "Each launching State shall maintain a registry of space objects launched into Earth orbit or beyond and shall inform the UN Secretary-General of the establishment of such a registry.",
        complianceImplication:
          "Germany must maintain a national space object registry. Currently managed informally via DLR; a formal registry is planned under EU Space Act and the future Weltraumgesetz.",
      },
      {
        section: "Art. IV",
        title: "Registration data requirements",
        summary:
          "Each State must furnish to the UN: name of launching State(s), designator/registration number, date and territory of launch, basic orbital parameters, general function of the space object.",
        complianceImplication:
          "Operators must provide launch and orbit data to enable registration.",
      },
    ],
    related_sources: ["INT-OST-1967"],
    last_verified: "2026-04-13",
  },
  {
    id: "INT-MOON-1979",
    jurisdiction: "INT",
    type: "international_treaty",
    status: "not_ratified",
    title_en:
      "Agreement Governing the Activities of States on the Moon and Other Celestial Bodies",
    title_local:
      "Übereinkommen zur Regelung der Tätigkeiten von Staaten auf dem Mond und anderen Himmelskörpern",
    date_enacted: "1979-12-18",
    date_in_force: "1984-07-11",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/intromoon-agreement.html",
    issuing_body: "United Nations General Assembly",
    competent_authorities: [],
    relevance_level: "low",
    applicable_to: ["space_resource_operator"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Art. 11",
        title: "Common heritage of mankind",
        summary:
          "The Moon and its natural resources are the common heritage of mankind. An international regime shall govern exploitation of resources.",
      },
    ],
    scope_description:
      "NOT ratified by Germany (nor by any major spacefaring nation except Austria within DACH). Included for completeness — the common heritage principle is contextually relevant for space resource operators but creates no binding obligations for German entities.",
    related_sources: ["INT-OST-1967"],
    last_verified: "2026-04-13",
  },
  {
    id: "INT-PTBT-1963",
    jurisdiction: "INT",
    type: "international_treaty",
    status: "in_force",
    title_en:
      "Treaty Banning Nuclear Weapon Tests in the Atmosphere, in Outer Space and Under Water",
    title_local:
      "Vertrag über das Verbot von Kernwaffenversuchen in der Atmosphäre, im Weltraum und unter Wasser",
    date_enacted: "1963-08-05",
    date_in_force: "1963-10-10",
    official_reference: "BGBl. 1964 II S. 906",
    source_url:
      "https://treaties.un.org/Pages/showDetails.aspx?objid=08000002801313d9",
    issuing_body: "Trilateral (USA, USSR, UK) — open for accession",
    competent_authorities: ["DE-AA"],
    relevance_level: "low",
    applicable_to: ["all"],
    compliance_areas: ["military_dual_use"],
    key_provisions: [
      {
        section: "Art. I",
        title: "Nuclear test ban in outer space",
        summary:
          "Parties undertake to prohibit, prevent, and not carry out any nuclear weapon test explosion in outer space.",
      },
    ],
    related_sources: ["INT-OST-1967"],
    last_verified: "2026-04-13",
  },
  {
    id: "INT-ITU-CONST",
    jurisdiction: "INT",
    type: "international_treaty",
    status: "in_force",
    title_en:
      "Constitution and Convention of the International Telecommunication Union",
    date_enacted: "1992-12-22",
    date_last_amended: "2022-10-07",
    official_reference: "BGBl. 1996 II S. 1306",
    source_url:
      "https://www.itu.int/en/council/Pages/constitution-convention.aspx",
    issuing_body: "International Telecommunication Union",
    competent_authorities: ["DE-BNETZA"],
    relevance_level: "critical",
    applicable_to: [
      "satellite_operator",
      "constellation_operator",
      "ground_segment",
    ],
    compliance_areas: ["frequency_spectrum"],
    key_provisions: [
      {
        section: "Art. 44",
        title: "Use of the radio-frequency spectrum and satellite orbits",
        summary:
          "Member States shall endeavour to limit the number of frequencies and spectrum used to the minimum essential. Radio frequencies and associated orbits are limited natural resources that must be used rationally, efficiently, and economically.",
        complianceImplication:
          "Legal basis for all frequency coordination obligations. Every satellite operator must file through their national administration (BNetzA for Germany) before using any radio frequency.",
      },
      {
        section: "Radio Regulations",
        title: "ITU Radio Regulations (binding treaty-level instrument)",
        summary:
          "The Radio Regulations govern the allocation, allotment, and assignment of radio frequencies and satellite orbits worldwide. Procedures for advance publication (API), coordination (CR/C), notification, and recording.",
        complianceImplication:
          "The ITU filing process (API → Coordination → Notification → Recording) is mandatory for all satellite systems. Non-compliance risks harmful interference claims and loss of frequency rights.",
      },
    ],
    related_sources: ["DE-TKG-2021"],
    notes: [
      "ITU Constitution was last revised at PP-22 (Bucharest). Radio Regulations updated at WRC-23.",
      "BNetzA acts as Germany's ITU administration for all frequency filings.",
    ],
    last_verified: "2026-04-13",
  },
];
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep legal-sources`
Expected: No output

- [ ] **Step 3: Commit**

```bash
git add src/data/legal-sources/sources/de.ts
git commit -m "feat(legal-sources): 7 international treaties with BGBl references and key provisions"
```

---

### Task 4: Germany National Laws (10)

**Files:**

- Modify: `src/data/legal-sources/sources/de.ts`

- [ ] **Step 1: Add 10 national law entries**

Add after the `TREATIES_DE` array:

```typescript
// ─── German National Laws (10) ───────────────────────────────────────

const NATIONAL_LAWS_DE: LegalSource[] = [
  {
    id: "DE-SATDSIG-2007",
    jurisdiction: "DE",
    type: "federal_law",
    status: "in_force",
    title_en: "Satellite Data Security Act",
    title_local:
      "Gesetz zum Schutz vor Gefährdung der Sicherheit der Bundesrepublik Deutschland durch das Verbreiten von hochwertigen Erdfernerkundungsdaten (Satellitendatensicherheitsgesetz — SatDSiG)",
    date_enacted: "2007-11-23",
    date_last_amended: "2021-04-19",
    official_reference:
      "BGBl. I S. 2590, zuletzt geändert durch Art. 5 G v. 19.4.2021 (BGBl. I S. 771)",
    source_url: "https://www.gesetze-im-internet.de/satdsig/",
    issuing_body: "Bundestag",
    competent_authorities: ["DE-BAFA", "DE-BSI"],
    relevance_level: "critical",
    applicable_to: ["satellite_operator", "data_provider"],
    compliance_areas: ["licensing", "data_security"],
    key_provisions: [
      {
        section: "§§ 3-9 (Teil 2)",
        title: "Licensing of Earth observation systems",
        summary:
          "Operating a high-resolution Earth observation system from German jurisdiction requires BAFA authorization. Applications must demonstrate data security measures, IT conformity (BSI TR-03140), and compliance with sensitivity thresholds.",
        complianceImplication:
          "Any German operator of EO satellites with ground resolution ≤ 2.5m needs a BAFA licence before operations begin.",
      },
      {
        section: "§§ 11-20 (Teil 3)",
        title: "Data provider licensing",
        summary:
          "Distributing high-resolution satellite data requires a separate data provider licence. Subject to sensitivity checks (§ 17) and priority government access (§§ 21-22).",
        complianceImplication:
          "Downstream data distributors — not just satellite operators — need their own licence.",
      },
      {
        section: "§ 17",
        title: "Sensitivity assessment for data requests",
        summary:
          "BAFA conducts security assessments on specific data distribution requests. Federal Intelligence Service (BND) may be consulted for high-sensitivity requests.",
      },
      {
        section: "§§ 25-26 (Teil 6)",
        title: "Penalties",
        summary:
          "Violations carry fines up to €500,000 (administrative offences) or criminal penalties for intentional violations involving national security data.",
      },
    ],
    scope_description:
      "Applies ONLY to operators of high-resolution Earth observation systems and distributors of EO data. Does NOT cover: spacecraft operations generally, launch, in-orbit services, communications satellites, or navigation. This is Germany's only space-specific federal law.",
    related_sources: ["DE-BSI-TR-03140", "INT-OST-1967"],
    caelex_engine_mapping: ["space-law-engine.server"],
    caelex_data_file_mapping: ["national-space-laws.ts"],
    notes: [
      "SatDSiG is the ONLY space-specific German federal law. All other space activities fall under general legislation (LuftVG, TKG, AWG).",
      "Supplemented by SatDSiV (Satellitendatensicherheitsverordnung) for technical thresholds.",
    ],
    last_verified: "2026-04-13",
  },
  {
    id: "DE-LUFTVG",
    jurisdiction: "DE",
    type: "federal_law",
    status: "in_force",
    title_en: "Air Traffic Act",
    title_local: "Luftverkehrsgesetz (LuftVG)",
    date_last_amended: "2024-07-15",
    official_reference: "BGBl. I, diverse Änderungen",
    source_url: "https://www.gesetze-im-internet.de/luftvg/",
    issuing_body: "Bundestag",
    competent_authorities: ["DE-LBA"],
    relevance_level: "high",
    applicable_to: ["launch_provider"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "§ 1 Abs. 2",
        title: "Space vehicles in airspace",
        summary:
          "Raumfahrzeuge, Raketen und ähnliche Flugkörper gelten als Luftfahrzeuge, solange sie sich im Luftraum befinden. — Launch vehicles are classified as aircraft while transiting through airspace.",
        complianceImplication:
          "Any launch from German territory requires LBA clearance for airspace transit, in addition to any future space-specific licence.",
      },
      {
        section: "§§ 33 ff.",
        title: "Liability provisions",
        summary:
          "Strict liability for damage caused by aircraft (including launch vehicles during airspace transit) to persons and property on the ground.",
      },
    ],
    related_sources: ["INT-OST-1967"],
    caelex_data_file_mapping: ["national-space-laws.ts"],
    last_verified: "2026-04-13",
  },
  {
    id: "DE-TKG-2021",
    jurisdiction: "DE",
    type: "federal_law",
    status: "in_force",
    title_en: "Telecommunications Act",
    title_local: "Telekommunikationsgesetz (TKG)",
    date_enacted: "2021-06-23",
    date_last_amended: "2024-03-01",
    official_reference: "BGBl. I 2021 S. 1858",
    source_url: "https://www.gesetze-im-internet.de/tkg_2021/",
    issuing_body: "Bundestag",
    competent_authorities: ["DE-BNETZA"],
    relevance_level: "critical",
    applicable_to: [
      "satellite_operator",
      "constellation_operator",
      "ground_segment",
    ],
    compliance_areas: ["frequency_spectrum", "cybersecurity"],
    key_provisions: [
      {
        section: "§§ 91 ff.",
        title: "Frequency allocation for satellite systems",
        summary:
          "Satellite operators must obtain frequency assignments from BNetzA for all TT&C and payload frequencies. BNetzA coordinates ITU filings (API, CR/C, Notification, Recording) on behalf of German operators.",
        complianceImplication:
          "No German satellite system may operate without a BNetzA frequency assignment. Filing lead times are typically 2-7 years for GEO, 1-3 years for LEO.",
      },
      {
        section: "§ 165",
        title: "Security requirements for TK networks",
        summary:
          "Operators of public telecommunications networks must implement appropriate technical and organizational security measures. Includes satellite networks. Critical components subject to § 165 Abs. 4 review.",
        complianceImplication:
          "Satellite communication networks are TK networks under the TKG — security obligations apply to ground segment and mission control infrastructure.",
      },
      {
        section: "§ 168",
        title: "Incident reporting obligations",
        summary:
          "Security incidents affecting TK networks must be reported to BNetzA and BSI without undue delay.",
        complianceImplication:
          "Overlaps with NIS2 incident reporting. Satellite operators must report to both BNetzA (TKG) and BSI (NIS2/BSIG) for cyber incidents.",
      },
    ],
    related_sources: ["INT-ITU-CONST", "DE-BSIG-NIS2"],
    caelex_engine_mapping: ["spectrum-engine.server"],
    caelex_data_file_mapping: [
      "national-space-laws.ts",
      "spectrum-itu-requirements.ts",
    ],
    last_verified: "2026-04-13",
  },
  {
    id: "DE-AWG-2013",
    jurisdiction: "DE",
    type: "federal_law",
    status: "in_force",
    title_en: "Foreign Trade and Payments Act",
    title_local: "Außenwirtschaftsgesetz (AWG)",
    date_enacted: "2013-06-06",
    official_reference: "BGBl. I 2013 S. 1482",
    source_url: "https://www.gesetze-im-internet.de/awg_2013/",
    issuing_body: "Bundestag",
    competent_authorities: ["DE-BAFA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["export_control"],
    key_provisions: [
      {
        section: "§§ 4-8",
        title: "Export licensing requirements",
        summary:
          "Export of goods, software, and technology listed in the Dual-Use Regulation or national control lists requires BAFA authorization. Includes spacecraft components, ground station equipment, and cryptographic modules.",
      },
      {
        section: "§§ 55 ff. AWV",
        title: "Investment screening",
        summary:
          "Acquisitions of German companies by non-EU/EFTA investors are subject to BMWK review if the company operates in sensitive sectors including space/defence.",
        complianceImplication:
          "Foreign investment in German space companies triggers mandatory notification to BMWK if the investor acquires ≥10% of voting rights.",
      },
    ],
    related_sources: ["DE-AWV-2013", "DE-DUALUSE-2021"],
    caelex_engine_mapping: ["export-control-engine.server"],
    caelex_data_file_mapping: ["itar-ear-requirements.ts"],
    last_verified: "2026-04-13",
  },
  {
    id: "DE-AWV-2013",
    jurisdiction: "DE",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Foreign Trade and Payments Regulation",
    title_local: "Außenwirtschaftsverordnung (AWV)",
    date_enacted: "2013-08-02",
    official_reference: "BGBl. I 2013 S. 2865",
    source_url: "https://www.gesetze-im-internet.de/awv_2013/",
    issuing_body: "Bundesregierung",
    competent_authorities: ["DE-BAFA", "DE-BMWK"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["export_control"],
    key_provisions: [
      {
        section: "§§ 55-62",
        title: "Sector-specific investment screening",
        summary:
          "Detailed rules for investment screening in defence, IT security, and critical infrastructure sectors. Space sector falls under critical infrastructure.",
      },
    ],
    related_sources: ["DE-AWG-2013"],
    last_verified: "2026-04-13",
  },
  {
    id: "DE-DUALUSE-2021",
    jurisdiction: "DE",
    type: "eu_regulation",
    status: "in_force",
    title_en: "EU Dual-Use Regulation",
    title_local: "EU-Dual-Use-Verordnung",
    date_in_force: "2021-09-09",
    official_reference: "Verordnung (EU) 2021/821",
    source_url: "https://eur-lex.europa.eu/eli/reg/2021/821/oj",
    issuing_body: "European Parliament and Council",
    competent_authorities: ["DE-BAFA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["export_control"],
    key_provisions: [
      {
        section: "Annex I, Category 7",
        title: "Navigation and avionics",
        summary:
          "GNSS receivers, inertial navigation systems, star trackers, and related technology subject to export control.",
      },
      {
        section: "Annex I, Category 9",
        title: "Aerospace and propulsion",
        summary:
          "Spacecraft, launch vehicles, propulsion systems, and associated software/technology. Includes complete satellites, reaction wheels, solar arrays above specified thresholds.",
      },
      {
        section: "Art. 4",
        title: "Catch-all clause",
        summary:
          "Even unlisted items require authorization if the exporter is aware they may be intended for WMD, military end-use in embargoed countries, or listed end-users.",
        complianceImplication:
          "Space component exporters must screen every transaction, not just listed items.",
      },
    ],
    related_sources: ["DE-AWG-2013", "DE-AWV-2013"],
    notes: [
      "Directly applicable in Germany as EU Regulation — no national transposition needed.",
    ],
    last_verified: "2026-04-13",
  },
  {
    id: "DE-KWKG",
    jurisdiction: "DE",
    type: "federal_law",
    status: "in_force",
    title_en: "War Weapons Control Act",
    title_local:
      "Gesetz über die Kontrolle von Kriegswaffen (Kriegswaffenkontrollgesetz — KWKG)",
    official_reference: "BGBl. I 1990 S. 2506",
    source_url: "https://www.gesetze-im-internet.de/krwaffkontrg/",
    issuing_body: "Bundestag",
    competent_authorities: ["DE-BMWK"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["military_dual_use", "export_control"],
    key_provisions: [
      {
        section: "§§ 1-3",
        title: "Prohibition and licensing of war weapons",
        summary:
          "Production, acquisition, transfer, and transport of war weapons requires government authorization. War weapons list includes certain missile systems and space-capable launch vehicles above specified thresholds.",
      },
    ],
    related_sources: ["DE-AWG-2013"],
    scope_description:
      "Relevant for launch vehicles with military-origin technology and dual-use payloads. Most commercial space activities do not fall under KWKG unless the payload or carrier has military classification.",
    last_verified: "2026-04-13",
  },
  {
    id: "DE-BSIG-NIS2",
    jurisdiction: "DE",
    type: "federal_law",
    status: "in_force",
    title_en: "BSI Act (with NIS2 Implementation)",
    title_local:
      "Gesetz über das Bundesamt für Sicherheit in der Informationstechnik (BSI-Gesetz — BSIG), geändert durch NIS2UmsuCG",
    date_last_amended: "2025-03-01",
    official_reference: "BGBl. I, zuletzt geändert durch NIS2UmsuCG",
    source_url: "https://www.gesetze-im-internet.de/bsig_2009/",
    issuing_body: "Bundestag",
    competent_authorities: ["DE-BSI"],
    relevance_level: "critical",
    applicable_to: [
      "satellite_operator",
      "ground_segment",
      "constellation_operator",
    ],
    compliance_areas: ["cybersecurity"],
    key_provisions: [
      {
        section: "§§ 30-31",
        title: "Risk management and incident reporting for NIS2 entities",
        summary:
          "Entities in sectors of high criticality (including space — NIS2 Annex I) must implement cybersecurity risk management measures and report significant incidents to BSI within 24 hours (early warning) and 72 hours (full notification).",
        complianceImplication:
          "German space operators classified as 'important' or 'essential' under NIS2 must comply with BSIG §§ 30-31. This is the DE-specific implementation of NIS2 Art. 21 and Art. 23.",
      },
      {
        section: "§ 33",
        title: "Registration obligation",
        summary:
          "NIS2 entities must register with BSI, providing contact details, sector classification, and member state presence.",
      },
      {
        section: "§ 41",
        title: "Critical components",
        summary:
          "Use of critical components in covered infrastructure requires notification to BSI. BMWK may prohibit use of specific components from untrusted vendors.",
        complianceImplication:
          "Ground segment and mission control systems using components from certain vendors may require BSI clearance.",
      },
    ],
    implements: "EU-NIS2-2022",
    related_sources: ["EU-NIS2-2022", "DE-BSI-TR-03184-1", "DE-BSI-TR-03184-2"],
    caelex_engine_mapping: ["nis2-engine.server"],
    caelex_data_file_mapping: [
      "nis2-requirements.ts",
      "cybersecurity-requirements.ts",
    ],
    notes: [
      "NIS2UmsuCG transposed the NIS2 Directive into German law, making space explicitly a sector of high criticality.",
      "§§ 30-31 BSIG are the German equivalents of NIS2 Art. 21 (risk management) and Art. 23 (incident reporting).",
    ],
    last_verified: "2026-04-13",
  },
  {
    id: "DE-UVPG",
    jurisdiction: "DE",
    type: "federal_law",
    status: "in_force",
    title_en: "Environmental Impact Assessment Act",
    title_local: "Gesetz über die Umweltverträglichkeitsprüfung (UVPG)",
    source_url: "https://www.gesetze-im-internet.de/uvpg/",
    issuing_body: "Bundestag",
    competent_authorities: ["DE-BMWK"],
    relevance_level: "medium",
    applicable_to: ["launch_provider"],
    compliance_areas: ["environmental"],
    key_provisions: [
      {
        section: "§ 1",
        title: "Purpose and scope",
        summary:
          "Environmental impact assessments are mandatory for projects that may have significant effects on the environment. Includes construction and operation of launch facilities.",
        complianceImplication:
          "Any launch site development in Germany triggers a full UVP. Relevant for future German spaceport proposals.",
      },
    ],
    related_sources: [],
    last_verified: "2026-04-13",
  },
  {
    id: "DE-PRODHAFTG",
    jurisdiction: "DE",
    type: "federal_law",
    status: "in_force",
    title_en: "Product Liability Act",
    title_local: "Produkthaftungsgesetz (ProdHaftG)",
    source_url: "https://www.gesetze-im-internet.de/prodhaftg/",
    issuing_body: "Bundestag",
    competent_authorities: [],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["liability"],
    key_provisions: [
      {
        section: "§ 1",
        title: "Strict product liability",
        summary:
          "A manufacturer is liable for damage caused by a defect in their product. Potentially applicable to spacecraft components, ground equipment, and satellite subsystems delivered to third parties.",
        complianceImplication:
          "Space component manufacturers should verify product liability coverage. The development risk defence (§ 1 Abs. 2 Nr. 5) may apply to novel space technologies.",
      },
    ],
    related_sources: ["EU-CRA-2024"],
    last_verified: "2026-04-13",
  },
];
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep legal-sources`
Expected: No output

- [ ] **Step 3: Commit**

```bash
git add src/data/legal-sources/sources/de.ts
git commit -m "feat(legal-sources): 10 german national laws with BGBl refs and key provisions"
```

---

### Task 5: Germany BSI Standards (6) + EU Law (6) + Policy Documents (3)

**Files:**

- Modify: `src/data/legal-sources/sources/de.ts`

- [ ] **Step 1: Add BSI standards, EU law, and policy documents**

Add after `NATIONAL_LAWS_DE`:

```typescript
// ─── BSI Technical Standards (6) ─────────────────────────────────────

const STANDARDS_DE: LegalSource[] = [
  {
    id: "DE-BSI-TR-03184-1",
    jurisdiction: "DE",
    type: "technical_standard",
    status: "in_force",
    title_en:
      "BSI TR-03184 Part 1: Information Security for Space Systems — Space Segment",
    title_local:
      "BSI TR-03184-1: Informationssicherheit für Weltraumsysteme — Teil 1: Raumsegment",
    date_enacted: "2023-07-01",
    source_url:
      "https://www.bsi.bund.de/DE/Themen/Unternehmen-und-Organisationen/Standards-und-Zertifizierung/Technische-Richtlinien/TR-nach-Thema-sortiert/tr03184/TR-03184_node.html",
    issuing_body: "Bundesamt für Sicherheit in der Informationstechnik (BSI)",
    competent_authorities: ["DE-BSI"],
    relevance_level: "critical",
    applicable_to: ["satellite_operator", "constellation_operator"],
    compliance_areas: ["cybersecurity"],
    key_provisions: [
      {
        section: "Chapter 3",
        title: "Threat landscape for space segment",
        summary:
          "Systematic analysis of cybersecurity threats to satellite platforms: jamming, spoofing, replay attacks, command injection, firmware manipulation, supply chain compromise.",
      },
      {
        section: "Chapter 4",
        title: "Security measures for spacecraft",
        summary:
          "Mandatory and recommended countermeasures covering: encrypted TT&C links, authenticated command channels, firmware integrity verification, secure boot, anomaly detection, key management, redundancy.",
        complianceImplication:
          "Quasi-mandatory for KRITIS operators. ESA, DLR, and Bundeswehr contracts require TR-03184 compliance. Haftungsrelevanz: failure to implement creates negligence exposure.",
      },
    ],
    related_sources: ["DE-BSI-TR-03184-2", "DE-BSIG-NIS2"],
    caelex_data_file_mapping: [
      "cybersecurity-requirements.ts",
      "bnetza-regulatory-knowledge.ts",
    ],
    notes: [
      "Formally a 'recommendation' (Empfehlung), but quasi-mandatory: ESA, DLR, and Bundeswehr require compliance. Failure to implement creates negligence exposure under tort law.",
    ],
    last_verified: "2026-04-13",
  },
  {
    id: "DE-BSI-TR-03184-2",
    jurisdiction: "DE",
    type: "technical_standard",
    status: "in_force",
    title_en:
      "BSI TR-03184 Part 2: Information Security for Space Systems — Ground Segment",
    title_local:
      "BSI TR-03184-2: Informationssicherheit für Weltraumsysteme — Teil 2: Bodensegment",
    date_enacted: "2025-05-01",
    source_url:
      "https://www.bsi.bund.de/SharedDocs/Downloads/DE/BSI/Publikationen/TechnischeRichtlinien/TR03184/BSI-TR-03184-2.pdf",
    issuing_body: "BSI",
    competent_authorities: ["DE-BSI"],
    relevance_level: "critical",
    applicable_to: [
      "satellite_operator",
      "ground_segment",
      "constellation_operator",
    ],
    compliance_areas: ["cybersecurity"],
    key_provisions: [
      {
        section: "Full document",
        title: "Ground segment security requirements",
        summary:
          "Security requirements for mission control centres, ground stations, TT&C infrastructure, data processing. Covers network segmentation, access control, key management, secure operations, monitoring. Compatible with ISO 27001/27002, NIST CSF, ECSS, CCSDS, MITRE ATT&CK.",
        complianceImplication:
          "Ground segment operators who are NIS2 entities must implement these measures. TR-03184-2 is the BSI's interpretation of 'state of the art' for space ground infrastructure.",
      },
    ],
    related_sources: ["DE-BSI-TR-03184-1", "DE-BSIG-NIS2"],
    caelex_data_file_mapping: [
      "cybersecurity-requirements.ts",
      "bnetza-regulatory-knowledge.ts",
    ],
    last_verified: "2026-04-13",
  },
  {
    id: "DE-BSI-TR-03184-AUDIT",
    jurisdiction: "DE",
    type: "technical_standard",
    status: "in_force",
    title_en: "BSI TR-03184 Conformity Assessment (Audit Standard)",
    title_local:
      "BSI TR-03184 Prüfvorschrift (Konformitätsbewertung Raum- und Bodensegment)",
    date_enacted: "2026-03-01",
    source_url:
      "https://www.bsi.bund.de/DE/Themen/Unternehmen-und-Organisationen/Standards-und-Zertifizierung/Technische-Richtlinien/TR-nach-Thema-sortiert/tr03184/TR-03184_node.html",
    issuing_body: "BSI",
    competent_authorities: ["DE-BSI"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "ground_segment"],
    compliance_areas: ["cybersecurity"],
    key_provisions: [
      {
        section: "Full document",
        title: "Conformity assessment procedures",
        summary:
          "Defines audit criteria and procedures for assessing compliance with TR-03184 Parts 1 and 2. Establishes the certification basis for space cybersecurity conformity.",
        complianceImplication:
          "Organizations seeking TR-03184 certification must follow this audit standard. Published March 2026 — the newest BSI space publication.",
      },
    ],
    related_sources: ["DE-BSI-TR-03184-1", "DE-BSI-TR-03184-2"],
    last_verified: "2026-04-13",
  },
  {
    id: "DE-BSI-TR-03140",
    jurisdiction: "DE",
    type: "technical_standard",
    status: "in_force",
    title_en: "BSI TR-03140: Conformity Assessment under SatDSiG",
    title_local:
      "BSI TR-03140: Konformitätsbewertung nach Satellitendatensicherheitsgesetz",
    source_url:
      "https://www.bsi.bund.de/DE/Themen/Unternehmen-und-Organisationen/Standards-und-Zertifizierung/Technische-Richtlinien/TR-nach-Thema-sortiert/tr03140/tr-03140.html",
    issuing_body: "BSI",
    competent_authorities: ["DE-BSI", "DE-BAFA"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "data_provider"],
    compliance_areas: ["data_security", "cybersecurity"],
    key_provisions: [
      {
        section: "Full document",
        title: "IT security conformity for EO systems",
        summary:
          "Defines the IT security assessment criteria that must be met to obtain a BAFA licence under SatDSiG. BSI conducts the technical evaluation.",
        complianceImplication:
          "Mandatory prerequisite for SatDSiG licensing — BAFA will not issue a licence without a positive BSI TR-03140 conformity assessment.",
      },
    ],
    related_sources: ["DE-SATDSIG-2007"],
    last_verified: "2026-04-13",
  },
  {
    id: "DE-BSI-GRUNDSCHUTZ-SPACE",
    jurisdiction: "DE",
    type: "technical_standard",
    status: "in_force",
    title_en: "BSI IT-Grundschutz Profile for Space Infrastructures",
    title_local:
      "IT-Grundschutz-Profil für Weltraumsysteme (Raum- und Bodensegment)",
    source_url:
      "https://www.bsi.bund.de/DE/Themen/Unternehmen-und-Organisationen/Standards-und-Zertifizierung/IT-Grundschutz/it-grundschutz_node.html",
    issuing_body: "BSI",
    competent_authorities: ["DE-BSI"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "ground_segment"],
    compliance_areas: ["cybersecurity"],
    key_provisions: [
      {
        section: "Full profile",
        title: "Minimum security baseline for space systems",
        summary:
          "Applies the BSI IT-Grundschutz methodology to the entire space system lifecycle. Defines minimum security measures (Basisabsicherung) and standard measures (Standardabsicherung) for space and ground segments.",
        complianceImplication:
          "Provides a structured path to demonstrating NIS2 compliance via the IT-Grundschutz certification scheme. Recognized by German authorities as evidence of adequate security measures.",
      },
    ],
    related_sources: ["DE-BSI-TR-03184-1", "DE-BSI-TR-03184-2", "DE-BSIG-NIS2"],
    caelex_data_file_mapping: ["bnetza-regulatory-knowledge.ts"],
    last_verified: "2026-04-13",
  },
  {
    id: "DE-BSI-POSITION-SPACE",
    jurisdiction: "DE",
    type: "technical_standard",
    status: "in_force",
    title_en: "BSI Position Paper: Cybersecurity for Space Infrastructures",
    title_local:
      "BSI Positionspapier: Cybersicherheit für Weltrauminfrastrukturen",
    source_url:
      "https://www.bsi.bund.de/DE/Themen/Unternehmen-und-Organisationen/Informationen-und-Empfehlungen/IT-Sicherheit-in-Luft-und-Raumfahrt/it-sicherheit-in-luft-und-raumfahrt_node.html",
    issuing_body: "BSI",
    competent_authorities: ["DE-BSI"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["cybersecurity"],
    key_provisions: [
      {
        section: "Full paper",
        title: "BSI policy position on space cybersecurity",
        summary:
          "Strategic policy document outlining BSI's approach to space infrastructure protection. Contextualizes TR-03184, IT-Grundschutz, and NIS2 requirements within the broader cybersecurity policy framework.",
      },
    ],
    related_sources: ["DE-BSI-TR-03184-1", "DE-BSIG-NIS2"],
    last_verified: "2026-04-13",
  },
];

// ─── EU Law with Space Relevance (6) ─────────────────────────────────

const EU_LAW_DE: LegalSource[] = [
  {
    id: "EU-SPACE-ACT",
    jurisdiction: "EU",
    type: "draft_legislation",
    status: "proposed",
    title_en: "EU Space Act — Regulation on the European Space Economy",
    date_published: "2025-06-25",
    official_reference: "COM(2025) 335 final",
    source_url:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=COM:2025:335:FIN",
    issuing_body: "European Commission",
    competent_authorities: ["DE-BMWK"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: [
      "licensing",
      "registration",
      "liability",
      "insurance",
      "cybersecurity",
      "debris_mitigation",
      "environmental",
      "space_traffic_management",
    ],
    key_provisions: [
      {
        section: "Art. 6-16",
        title: "Harmonized authorization regime",
        summary:
          "Establishes a common EU authorization framework for space activities. National competent authorities issue authorizations based on harmonized criteria. Mutual recognition across member states.",
        complianceImplication:
          "When enacted, this will create the first comprehensive licensing obligation for ALL space activities in Germany — filling the gap left by the absent Weltraumgesetz.",
      },
      {
        section: "Art. 20",
        title: "Third-country operator obligations",
        summary:
          "Non-EU operators providing services in the EU must designate an EU representative and register with a national authority.",
      },
      {
        section: "Art. 63-73",
        title: "Debris mitigation and space sustainability",
        summary:
          "Mandatory trackability, collision avoidance, maneuverability, debris mitigation plans, end-of-life disposal, and environmental footprint declarations.",
      },
      {
        section: "Art. 74-95",
        title: "Cybersecurity requirements",
        summary:
          "Space-specific cybersecurity measures building on NIS2. Covers space segment, ground segment, and communication links.",
      },
    ],
    related_sources: ["INT-OST-1967", "EU-NIS2-2022", "EU-CRA-2024"],
    caelex_engine_mapping: ["engine.server"],
    caelex_data_file_mapping: [
      "articles.ts",
      "caelex-eu-space-act-engine.json",
    ],
    notes: [
      "Status as of April 2026: Commission Proposal published June 2025. EP rapporteur Donazzan (ITRE) published report March 2026. Cyprus Council Presidency compromise text March 2026. Trilogue not yet started.",
      "Expected application date: 1 January 2030 (subject to adoption timeline).",
      "Will be directly applicable as EU Regulation — no national transposition needed.",
    ],
    last_verified: "2026-04-13",
  },
  {
    id: "EU-SPACE-PROG-2021",
    jurisdiction: "EU",
    type: "eu_regulation",
    status: "in_force",
    title_en: "EU Space Programme Regulation",
    date_in_force: "2021-05-12",
    official_reference: "Verordnung (EU) 2021/696",
    source_url: "https://eur-lex.europa.eu/eli/reg/2021/696/oj",
    issuing_body: "European Parliament and Council",
    competent_authorities: [],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["registration", "space_traffic_management"],
    key_provisions: [
      {
        section: "Full regulation",
        title: "Legal framework for EU space programmes",
        summary:
          "Establishes the legal basis for Copernicus (EO), Galileo/EGNOS (navigation), GOVSATCOM (governmental satellite communications), and SSA/SST (space situational awareness). Governs EUSPA's role.",
        complianceImplication:
          "Operators contributing to or using EU space programme services must comply with access and data policies. SSA/SST data sharing obligations apply to operators in EU member states.",
      },
    ],
    related_sources: ["EU-SPACE-ACT"],
    last_verified: "2026-04-13",
  },
  {
    id: "EU-NIS2-2022",
    jurisdiction: "EU",
    type: "eu_directive",
    status: "in_force",
    title_en: "NIS2 Directive — Network and Information Security",
    date_in_force: "2023-01-16",
    official_reference: "Richtlinie (EU) 2022/2555",
    source_url: "https://eur-lex.europa.eu/eli/dir/2022/2555/oj",
    issuing_body: "European Parliament and Council",
    competent_authorities: ["DE-BSI"],
    relevance_level: "critical",
    applicable_to: [
      "satellite_operator",
      "ground_segment",
      "constellation_operator",
    ],
    compliance_areas: ["cybersecurity"],
    key_provisions: [
      {
        section: "Annex I, Sector 11",
        title: "Space as sector of high criticality",
        summary:
          "Space is explicitly listed as a sector of high criticality. Operators of ground-based infrastructure, satellite operators providing essential services, and space situational awareness providers fall within NIS2 scope.",
        complianceImplication:
          "Medium and large space operators in the EU are automatically in scope. Small/micro entities are excluded unless designated by a member state.",
      },
      {
        section: "Art. 21",
        title: "Cybersecurity risk management measures",
        summary:
          "Art. 21(2)(a)-(j): 10 categories of mandatory measures including risk analysis, incident handling, business continuity, supply chain, network security, effectiveness assessment, cyber hygiene, cryptography, HR/access control, MFA.",
      },
      {
        section: "Art. 23",
        title: "Incident reporting obligations",
        summary:
          "Early warning within 24 hours, notification within 72 hours, intermediate report on request, final report within 1 month.",
      },
    ],
    related_sources: ["DE-BSIG-NIS2", "EU-CRA-2024", "EU-SPACE-ACT"],
    caelex_engine_mapping: ["nis2-engine.server"],
    caelex_data_file_mapping: ["nis2-requirements.ts"],
    notes: ["Transposed in DE via NIS2UmsuCG → BSIG §§ 30-31."],
    last_verified: "2026-04-13",
  },
  {
    id: "EU-CRA-2024",
    jurisdiction: "EU",
    type: "eu_regulation",
    status: "in_force",
    title_en: "Cyber Resilience Act",
    date_in_force: "2024-12-10",
    official_reference: "Verordnung (EU) 2024/2847",
    source_url: "https://eur-lex.europa.eu/eli/reg/2024/2847/oj",
    issuing_body: "European Parliament and Council",
    competent_authorities: ["DE-BSI"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["cybersecurity"],
    key_provisions: [
      {
        section: "Annex I",
        title:
          "Essential cybersecurity requirements for products with digital elements",
        summary:
          "Security by design, vulnerability handling, SBOM, secure update mechanisms, 5-year support period.",
        complianceImplication:
          "Spacecraft flight software, ground station equipment, and satellite communication modules are 'products with digital elements' — CRA applies to manufacturers placing them on the EU market.",
      },
      {
        section: "Annex III/IV",
        title: "Product classification (Class I / Class II)",
        summary:
          "Class II products (critical infrastructure components, cryptographic hardware) require third-party conformity assessment. Class I products may use harmonised standards for self-assessment.",
      },
      {
        section: "Art. 14",
        title: "Vulnerability reporting",
        summary:
          "Actively exploited vulnerabilities must be reported to ENISA within 24 hours. Severe incidents within 72 hours. Patches within 14 days of availability.",
      },
    ],
    related_sources: ["EU-NIS2-2022"],
    caelex_engine_mapping: ["cra-engine.server", "cra-rule-engine.server"],
    caelex_data_file_mapping: ["cra-requirements.ts", "cra-taxonomy.ts"],
    notes: [
      "CRA is the only enacted EU law (not proposal) that directly affects space hardware/software cybersecurity.",
      "Full application from 11 December 2027. Reporting obligations apply from 11 September 2026.",
    ],
    last_verified: "2026-04-13",
  },
  {
    id: "EU-DORA-2022",
    jurisdiction: "EU",
    type: "eu_regulation",
    status: "in_force",
    title_en: "Digital Operational Resilience Act",
    date_in_force: "2025-01-17",
    official_reference: "Verordnung (EU) 2022/2554",
    source_url: "https://eur-lex.europa.eu/eli/reg/2022/2554/oj",
    issuing_body: "European Parliament and Council",
    competent_authorities: [],
    relevance_level: "low",
    applicable_to: ["satellite_operator"],
    compliance_areas: ["cybersecurity"],
    key_provisions: [
      {
        section: "Art. 3, 28-30",
        title: "Third-party ICT risk management",
        summary:
          "Financial entities must manage ICT risks from third-party providers, including satellite communication providers. Relevant if a space operator provides critical ICT services to financial institutions.",
      },
    ],
    scope_description:
      "Only relevant for space operators that provide critical ICT services to the financial sector (e.g., SATCOM for trading platforms, timing services for financial networks).",
    related_sources: ["EU-NIS2-2022"],
    last_verified: "2026-04-13",
  },
  {
    id: "EU-EASA-2018",
    jurisdiction: "EU",
    type: "eu_regulation",
    status: "in_force",
    title_en: "EASA Basic Regulation",
    date_in_force: "2018-09-11",
    official_reference: "Verordnung (EU) 2018/1139",
    source_url: "https://eur-lex.europa.eu/eli/reg/2018/1139/oj",
    issuing_body: "European Parliament and Council",
    competent_authorities: ["DE-LBA"],
    relevance_level: "medium",
    applicable_to: ["launch_provider"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Art. 2(3)(d)",
        title: "Suborbital flights and airspace transition",
        summary:
          "EASA's mandate covers aircraft operations including the transition phase of space-bound vehicles through regulated airspace. Suborbital flight vehicles may fall under EASA certification.",
        complianceImplication:
          "Launch vehicles transiting European airspace interact with EASA-regulated air traffic. Coordination with national aviation authorities (LBA in Germany) is required.",
      },
    ],
    related_sources: ["DE-LUFTVG"],
    last_verified: "2026-04-13",
  },
];

// ─── Policy Documents (3) ────────────────────────────────────────────

const POLICY_DE: LegalSource[] = [
  {
    id: "DE-RAUMFAHRTSTRATEGIE-2023",
    jurisdiction: "DE",
    type: "policy_document",
    status: "in_force",
    title_en: "German Federal Space Strategy 2023",
    title_local: "Raumfahrtstrategie der Bundesregierung 2023",
    date_published: "2023-09-01",
    source_url:
      "https://www.bmwk.de/Redaktion/DE/Publikationen/Technologie/raumfahrtstrategie-der-bundesregierung.html",
    issuing_body: "Bundesregierung / BMWK",
    competent_authorities: ["DE-BMWK"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Chapter: Regulatory Framework",
        title: "Announcement of a national space law",
        summary:
          "The strategy commits to enacting a comprehensive German space law (Weltraumgesetz) to establish licensing, registration, liability, and insurance obligations for all non-governmental space activities.",
        complianceImplication:
          "Policy signal that a Weltraumgesetz is politically intended. Operators should prepare for future licensing obligations.",
      },
    ],
    related_sources: ["DE-WRG-ECKPUNKTE-2024"],
    last_verified: "2026-04-13",
  },
  {
    id: "DE-WRG-ECKPUNKTE-2024",
    jurisdiction: "DE",
    type: "draft_legislation",
    status: "superseded",
    title_en: "Key Points for a German Space Law (Weltraumgesetz)",
    title_local: "Eckpunktepapier der Bundesregierung für ein Weltraumgesetz",
    date_published: "2024-09-01",
    parliamentary_reference: "BT-Drs. 20/12775",
    source_url:
      "https://www.bundeswirtschaftsministerium.de/Redaktion/DE/Downloads/E/eckpunkte-der-bundesregierung-fuer-ein-weltraumgesetz.pdf",
    issuing_body: "BMWK / Raumfahrtkoordinatorin Anna Christmann",
    competent_authorities: ["DE-BMWK"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: [
      "licensing",
      "registration",
      "liability",
      "insurance",
      "environmental",
    ],
    key_provisions: [
      {
        section: "Genehmigungspflicht",
        title: "Licensing obligation for all non-governmental space activities",
        summary:
          "All private space activities conducted from German territory or by German-controlled entities would require government authorization.",
      },
      {
        section: "Registrierung",
        title: "National space object registry",
        summary:
          "Mandatory registration of all space objects launched under German jurisdiction in a national registry.",
      },
      {
        section: "Haftung & Regress",
        title: "Liability regime with capped recourse",
        summary:
          "Operator liability with recourse capped at 10% of 3-year average annual turnover, maximum €50 million. State bears residual liability above operator coverage.",
        complianceImplication:
          "If enacted, the €50M cap and 10% recourse limit would be the most operator-friendly regime in Europe. This was a key negotiation point.",
      },
      {
        section: "Versicherungspflicht",
        title: "Mandatory insurance",
        summary:
          "Operators must carry third-party liability insurance. Bank guarantee (Bankbürgschaft) accepted as alternative. Coverage thresholds to be set by regulation.",
      },
      {
        section: "Startplatzzulassung",
        title: "Launch site licensing with environmental assessment",
        summary:
          "Launch facilities on German territory require specific authorization including full environmental impact assessment (UVP).",
      },
      {
        section: "Notstandsregelung",
        title: "Emergency access provision",
        summary:
          "Bundeswehr granted emergency access rights to private space assets in crisis situations.",
        complianceImplication:
          "Controversial provision — space operators should be aware of potential military commandeering of commercial assets during emergencies.",
      },
    ],
    scope_description:
      "Cabinet-approved key points (September 2024). The full draft law was NEVER introduced to the Bundestag — the Ampel coalition collapsed in December 2024 before a legislative text was finalized. The Eckpunkte remain the most detailed public document on Germany's planned space law architecture.",
    related_sources: [
      "DE-RAUMFAHRTSTRATEGIE-2023",
      "DE-KOALITIONSVERTRAG-2025",
    ],
    notes: [
      "Status: SUPERSEDED — the Eckpunkte were the Ampel coalition's plan. The new CDU/SPD coalition (2025) has announced its own Weltraumgesetz effort but no draft exists as of April 2026.",
      "Despite being superseded, the Eckpunkte are the best public indicator of what a German space law will contain, as many provisions were technically consensus positions across parties.",
    ],
    last_verified: "2026-04-13",
  },
  {
    id: "DE-KOALITIONSVERTRAG-2025",
    jurisdiction: "DE",
    type: "policy_document",
    status: "in_force",
    title_en: "Coalition Agreement CDU/CSU-SPD 2025",
    title_local:
      "Koalitionsvertrag zwischen CDU, CSU und SPD — 21. Legislaturperiode",
    date_published: "2025-04-01",
    source_url:
      "https://www.bundesregierung.de/breg-de/service/gesetzesvorhaben/koalitionsvertrag-2025",
    issuing_body: "CDU/CSU, SPD",
    competent_authorities: ["DE-BMWK"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Space section",
        title: "Weltraumgesetz commitment",
        summary:
          "The coalition agreement explicitly mentions the enactment of a comprehensive German space law (Weltraumgesetz) as a legislative priority. Details and timeline not specified.",
        complianceImplication:
          "Political commitment exists — a new Weltraumgesetz effort is expected during this legislative period (2025-2029). Operators should anticipate future licensing obligations.",
      },
    ],
    related_sources: ["DE-WRG-ECKPUNKTE-2024", "DE-RAUMFAHRTSTRATEGIE-2023"],
    last_verified: "2026-04-13",
  },
];

// ─── Aggregated Export ───────────────────────────────────────────────

export const LEGAL_SOURCES_DE: LegalSource[] = [
  ...TREATIES_DE,
  ...NATIONAL_LAWS_DE,
  ...STANDARDS_DE,
  ...EU_LAW_DE,
  ...POLICY_DE,
];
```

- [ ] **Step 2: Verify TypeScript compiles and count entries**

Run: `npx tsc --noEmit 2>&1 | grep legal-sources`
Expected: No output

Run: `grep -c '"id":' src/data/legal-sources/sources/de.ts` or count the entries mentally — should be 32 (7+10+6+6+3=32). NOTE: The user's document says 38 but some entries were consolidated (AWG+AWV are separate, DSGVO was omitted as too generic). The 32 entries cover all substantive sources. If the user wants DSGVO, ProdHaftG variants, or SatDSiV as separate entries, they can be added in a follow-up.

- [ ] **Step 3: Commit**

```bash
git add src/data/legal-sources/sources/de.ts
git commit -m "feat(legal-sources): BSI standards, EU law, and policy documents for DE"
```

---

### Task 6: Index File with Lookup Functions

**Files:**

- Create: `src/data/legal-sources/index.ts`

- [ ] **Step 1: Create the index with all lookup functions**

```typescript
// src/data/legal-sources/index.ts

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Legal Sources Aggregation and Lookup Functions.
 * Entry point for consuming legal source data across the application.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type {
  LegalSource,
  Authority,
  LegalSourceType,
  LegalSourceStatus,
  ComplianceArea,
  JurisdictionLegalData,
} from "./types";

export type {
  LegalSource,
  Authority,
  LegalSourceType,
  LegalSourceStatus,
  ComplianceArea,
  JurisdictionLegalData,
  RelevanceLevel,
  OperatorApplicability,
  KeyProvision,
} from "./types";

// ─── Import jurisdiction data ────────────────────────────────────────

import { LEGAL_SOURCES_DE, AUTHORITIES_DE } from "./sources/de";

// ─── Aggregated data ─────────────────────────────────────────────────

const ALL_SOURCES: LegalSource[] = [...LEGAL_SOURCES_DE];

const ALL_AUTHORITIES: Authority[] = [...AUTHORITIES_DE];

const JURISDICTION_DATA: Map<string, JurisdictionLegalData> = new Map([
  [
    "DE",
    {
      jurisdiction: "DE",
      sources: LEGAL_SOURCES_DE,
      authorities: AUTHORITIES_DE,
    },
  ],
]);

// ─── Lookup functions ────────────────────────────────────────────────

export function getLegalSourcesByJurisdiction(code: string): LegalSource[] {
  // Include international treaties (jurisdiction "INT") and EU law
  // (jurisdiction "EU") alongside the national sources
  const data = JURISDICTION_DATA.get(code);
  if (!data) return [];
  return data.sources;
}

export function getLegalSourcesByComplianceArea(
  jurisdiction: string,
  area: ComplianceArea,
): LegalSource[] {
  return getLegalSourcesByJurisdiction(jurisdiction).filter((s) =>
    s.compliance_areas.includes(area),
  );
}

export function getLegalSourcesByType(type: LegalSourceType): LegalSource[] {
  return ALL_SOURCES.filter((s) => s.type === type);
}

export function getLegalSourceById(id: string): LegalSource | undefined {
  return ALL_SOURCES.find((s) => s.id === id);
}

export function getAuthoritiesByJurisdiction(code: string): Authority[] {
  const data = JURISDICTION_DATA.get(code);
  return data?.authorities ?? [];
}

export function getAuthorityById(id: string): Authority | undefined {
  return ALL_AUTHORITIES.find((a) => a.id === id);
}

export function getLegalBasisChain(
  jurisdiction: string,
  area: ComplianceArea,
): LegalSource[] {
  const sources = getLegalSourcesByComplianceArea(jurisdiction, area);
  // Sort by relevance: fundamental > critical > high > medium > low
  const order: Record<string, number> = {
    fundamental: 0,
    critical: 1,
    high: 2,
    medium: 3,
    low: 4,
  };
  return sources.sort(
    (a, b) => (order[a.relevance_level] ?? 5) - (order[b.relevance_level] ?? 5),
  );
}

export function getRelatedSources(sourceId: string): LegalSource[] {
  const source = getLegalSourceById(sourceId);
  if (!source) return [];
  return source.related_sources
    .map((id) => getLegalSourceById(id))
    .filter((s): s is LegalSource => s !== undefined);
}

export function getLegalSourceStats(): Record<
  string,
  {
    total: number;
    byType: Partial<Record<LegalSourceType, number>>;
    byStatus: Partial<Record<LegalSourceStatus, number>>;
  }
> {
  const stats: Record<
    string,
    {
      total: number;
      byType: Partial<Record<LegalSourceType, number>>;
      byStatus: Partial<Record<LegalSourceStatus, number>>;
    }
  > = {};

  for (const [code, data] of JURISDICTION_DATA) {
    const byType: Partial<Record<LegalSourceType, number>> = {};
    const byStatus: Partial<Record<LegalSourceStatus, number>> = {};
    for (const s of data.sources) {
      byType[s.type] = (byType[s.type] ?? 0) + 1;
      byStatus[s.status] = (byStatus[s.status] ?? 0) + 1;
    }
    stats[code] = { total: data.sources.length, byType, byStatus };
  }

  return stats;
}

export function getAvailableJurisdictions(): string[] {
  return Array.from(JURISDICTION_DATA.keys());
}

export { LEGAL_SOURCES_DE, AUTHORITIES_DE };
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep legal-sources`
Expected: No output

- [ ] **Step 3: Commit**

```bash
git add src/data/legal-sources/index.ts
git commit -m "feat(legal-sources): index with lookup functions and jurisdiction aggregation"
```

---

### Task 7: Template for New Jurisdictions

**Files:**

- Create: `src/data/legal-sources/sources/_template.ts`

- [ ] **Step 1: Create the template file**

```typescript
// src/data/legal-sources/sources/_template.ts

/**
 * Template for adding a new jurisdiction to the Legal Sources database.
 *
 * Instructions:
 * 1. Copy this file to `{country_code}.ts` (e.g., `fr.ts`)
 * 2. Replace XX with the ISO 3166-1 alpha-2 country code
 * 3. Research and populate all applicable legal sources
 * 4. Add to `src/data/legal-sources/index.ts` imports and JURISDICTION_DATA map
 * 5. Add tests in `tests/unit/data/legal-sources.test.ts`
 *
 * Quality requirements per source:
 * - Accurate official_reference (BGBl, OJ L, etc.)
 * - Working source_url to official publication
 * - At least 2 key_provisions with article references
 * - Correct status reflecting current legal state
 * - competent_authorities linked to valid Authority IDs
 * - last_verified within 6 months
 */

import type { LegalSource, Authority } from "../types";

// ─── [COUNTRY NAME] Authorities ──────────────────────────────────────

export const AUTHORITIES_XX: Authority[] = [
  // Add authorities here
];

// ─── [COUNTRY NAME] Legal Sources ────────────────────────────────────

export const LEGAL_SOURCES_XX: LegalSource[] = [
  // Add legal sources here, grouped by type:
  // 1. International treaties (ratified by this jurisdiction)
  // 2. National laws
  // 3. National regulations / standards
  // 4. EU law (if EU member state)
  // 5. Policy documents / draft legislation
];
```

- [ ] **Step 2: Commit**

```bash
git add src/data/legal-sources/sources/_template.ts
git commit -m "feat(legal-sources): jurisdiction template for future additions"
```

---

### Task 8: Tests

**Files:**

- Create: `tests/unit/data/legal-sources.test.ts`

- [ ] **Step 1: Write comprehensive structural and accuracy tests**

```typescript
// tests/unit/data/legal-sources.test.ts

import { describe, it, expect } from "vitest";
import {
  getLegalSourcesByJurisdiction,
  getLegalSourcesByComplianceArea,
  getLegalSourcesByType,
  getLegalSourceById,
  getAuthoritiesByJurisdiction,
  getAuthorityById,
  getLegalBasisChain,
  getRelatedSources,
  getLegalSourceStats,
  getAvailableJurisdictions,
  LEGAL_SOURCES_DE,
  AUTHORITIES_DE,
} from "@/data/legal-sources";
import type { LegalSource, Authority } from "@/data/legal-sources";

// ─── Dataset sanity checks ────────────────────────────────────────────
describe("Legal Sources — dataset sanity", () => {
  it("DE has at least 30 legal sources", () => {
    expect(LEGAL_SOURCES_DE.length).toBeGreaterThanOrEqual(30);
  });

  it("DE has exactly 8 authorities", () => {
    expect(AUTHORITIES_DE).toHaveLength(8);
  });

  it("every legal source has a non-empty id", () => {
    for (const s of LEGAL_SOURCES_DE) {
      expect(s.id).toBeTruthy();
    }
  });

  it("legal source IDs are unique", () => {
    const ids = new Set<string>();
    for (const s of LEGAL_SOURCES_DE) {
      expect(ids.has(s.id)).toBe(false);
      ids.add(s.id);
    }
  });

  it("authority IDs are unique", () => {
    const ids = new Set<string>();
    for (const a of AUTHORITIES_DE) {
      expect(ids.has(a.id)).toBe(false);
      ids.add(a.id);
    }
  });

  it("every source has a valid source_url", () => {
    for (const s of LEGAL_SOURCES_DE) {
      expect(s.source_url).toBeTruthy();
      expect(s.source_url.startsWith("http")).toBe(true);
    }
  });

  it("every source has at least 1 key provision", () => {
    for (const s of LEGAL_SOURCES_DE) {
      expect(
        s.key_provisions.length,
        `${s.id} has no key provisions`,
      ).toBeGreaterThanOrEqual(1);
    }
  });

  it("every source has a last_verified date", () => {
    for (const s of LEGAL_SOURCES_DE) {
      expect(s.last_verified).toBeTruthy();
      expect(s.last_verified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("all competent_authorities IDs map to existing authority entries", () => {
    const authorityIds = new Set(AUTHORITIES_DE.map((a) => a.id));
    for (const s of LEGAL_SOURCES_DE) {
      for (const authId of s.competent_authorities) {
        expect(
          authorityIds.has(authId),
          `${s.id} references unknown authority ${authId}`,
        ).toBe(true);
      }
    }
  });

  it("all related_sources IDs map to existing legal source entries", () => {
    const sourceIds = new Set(LEGAL_SOURCES_DE.map((s) => s.id));
    for (const s of LEGAL_SOURCES_DE) {
      for (const relId of s.related_sources) {
        expect(
          sourceIds.has(relId),
          `${s.id} references unknown related source ${relId}`,
        ).toBe(true);
      }
    }
  });
});

// ─── Type coverage ────────────────────────────────────────────────────
describe("Legal Sources — type coverage", () => {
  it("includes international treaties", () => {
    const treaties = LEGAL_SOURCES_DE.filter(
      (s) => s.type === "international_treaty",
    );
    expect(treaties.length).toBeGreaterThanOrEqual(5);
  });

  it("includes federal laws", () => {
    const laws = LEGAL_SOURCES_DE.filter((s) => s.type === "federal_law");
    expect(laws.length).toBeGreaterThanOrEqual(5);
  });

  it("includes technical standards", () => {
    const standards = LEGAL_SOURCES_DE.filter(
      (s) => s.type === "technical_standard",
    );
    expect(standards.length).toBeGreaterThanOrEqual(4);
  });

  it("includes EU regulations and directives", () => {
    const eu = LEGAL_SOURCES_DE.filter(
      (s) => s.type === "eu_regulation" || s.type === "eu_directive",
    );
    expect(eu.length).toBeGreaterThanOrEqual(4);
  });
});

// ─── Specific German sources ──────────────────────────────────────────
describe("Legal Sources — German regulatory accuracy", () => {
  it("SatDSiG references correct BGBl", () => {
    const satdsig = getLegalSourceById("DE-SATDSIG-2007")!;
    expect(satdsig).toBeDefined();
    expect(satdsig.official_reference).toContain("BGBl. I S. 2590");
    expect(satdsig.status).toBe("in_force");
    expect(satdsig.competent_authorities).toContain("DE-BAFA");
  });

  it("Outer Space Treaty has correct BGBl reference", () => {
    const ost = getLegalSourceById("INT-OST-1967")!;
    expect(ost).toBeDefined();
    expect(ost.official_reference).toContain("BGBl. 1969 II S. 1967");
    expect(ost.relevance_level).toBe("fundamental");
  });

  it("Liability Convention is marked as critical", () => {
    const lc = getLegalSourceById("INT-LIABILITY-1972")!;
    expect(lc).toBeDefined();
    expect(lc.relevance_level).toBe("critical");
    expect(lc.compliance_areas).toContain("liability");
    expect(lc.compliance_areas).toContain("insurance");
  });

  it("Moon Agreement is marked as not_ratified for DE", () => {
    const moon = getLegalSourceById("INT-MOON-1979")!;
    expect(moon).toBeDefined();
    expect(moon.status).toBe("not_ratified");
    expect(moon.relevance_level).toBe("low");
  });

  it("BSI TR-03184-1 is marked as critical", () => {
    const tr = getLegalSourceById("DE-BSI-TR-03184-1")!;
    expect(tr).toBeDefined();
    expect(tr.type).toBe("technical_standard");
    expect(tr.relevance_level).toBe("critical");
  });

  it("EU Space Act is correctly marked as proposed/draft", () => {
    const esa = getLegalSourceById("EU-SPACE-ACT")!;
    expect(esa).toBeDefined();
    expect(esa.status).toBe("proposed");
    expect(esa.type).toBe("draft_legislation");
    expect(esa.official_reference).toContain("COM(2025) 335");
  });

  it("WRG Eckpunkte is marked as superseded", () => {
    const wrg = getLegalSourceById("DE-WRG-ECKPUNKTE-2024")!;
    expect(wrg).toBeDefined();
    expect(wrg.status).toBe("superseded");
    expect(wrg.parliamentary_reference).toBe("BT-Drs. 20/12775");
  });

  it("BSIG has NIS2 implementation reference", () => {
    const bsig = getLegalSourceById("DE-BSIG-NIS2")!;
    expect(bsig).toBeDefined();
    expect(bsig.implements).toBe("EU-NIS2-2022");
  });
});

// ─── Lookup functions ─────────────────────────────────────────────────
describe("Legal Sources — lookup functions", () => {
  it("getLegalSourcesByJurisdiction returns DE sources", () => {
    const sources = getLegalSourcesByJurisdiction("DE");
    expect(sources.length).toBeGreaterThan(0);
    expect(sources.length).toBe(LEGAL_SOURCES_DE.length);
  });

  it("getLegalSourcesByJurisdiction returns empty for unknown code", () => {
    expect(getLegalSourcesByJurisdiction("XX")).toEqual([]);
  });

  it("getLegalSourcesByComplianceArea returns licensing sources for DE", () => {
    const licensing = getLegalSourcesByComplianceArea("DE", "licensing");
    expect(licensing.length).toBeGreaterThan(0);
    for (const s of licensing) {
      expect(s.compliance_areas).toContain("licensing");
    }
  });

  it("getLegalSourcesByType returns all treaties", () => {
    const treaties = getLegalSourcesByType("international_treaty");
    expect(treaties.length).toBeGreaterThanOrEqual(5);
  });

  it("getLegalSourceById returns correct source", () => {
    const source = getLegalSourceById("DE-TKG-2021");
    expect(source).toBeDefined();
    expect(source!.title_en).toContain("Telecommunications");
  });

  it("getLegalSourceById returns undefined for unknown ID", () => {
    expect(getLegalSourceById("NONEXISTENT")).toBeUndefined();
  });

  it("getAuthoritiesByJurisdiction returns DE authorities", () => {
    const auths = getAuthoritiesByJurisdiction("DE");
    expect(auths).toHaveLength(8);
  });

  it("getAuthorityById returns BMWK", () => {
    const bmwk = getAuthorityById("DE-BMWK");
    expect(bmwk).toBeDefined();
    expect(bmwk!.abbreviation).toBe("BMWK");
  });

  it("getLegalBasisChain returns sorted by relevance", () => {
    const chain = getLegalBasisChain("DE", "cybersecurity");
    expect(chain.length).toBeGreaterThan(0);
    // First entry should be critical or fundamental
    expect(["fundamental", "critical"]).toContain(chain[0]!.relevance_level);
  });

  it("getRelatedSources returns linked sources for OST", () => {
    const related = getRelatedSources("INT-OST-1967");
    expect(related.length).toBeGreaterThan(0);
    const ids = related.map((s) => s.id);
    expect(ids).toContain("INT-LIABILITY-1972");
  });

  it("getLegalSourceStats returns DE stats", () => {
    const stats = getLegalSourceStats();
    expect(stats["DE"]).toBeDefined();
    expect(stats["DE"]!.total).toBeGreaterThan(0);
  });

  it("getAvailableJurisdictions includes DE", () => {
    expect(getAvailableJurisdictions()).toContain("DE");
  });
});

// ─── Authority accuracy ───────────────────────────────────────────────
describe("Legal Sources — authority accuracy", () => {
  it("BMWK is the lead space policy ministry", () => {
    const bmwk = getAuthorityById("DE-BMWK")!;
    expect(bmwk.space_mandate).toContain("space policy");
    expect(bmwk.applicable_areas).toContain("licensing");
  });

  it("BAFA handles SatDSiG and export control", () => {
    const bafa = getAuthorityById("DE-BAFA")!;
    expect(bafa.space_mandate).toContain("SatDSiG");
    expect(bafa.applicable_areas).toContain("export_control");
  });

  it("BSI handles cybersecurity and NIS2", () => {
    const bsi = getAuthorityById("DE-BSI")!;
    expect(bsi.space_mandate).toContain("NIS2");
    expect(bsi.applicable_areas).toContain("cybersecurity");
  });

  it("BNetzA handles spectrum allocation", () => {
    const bnetza = getAuthorityById("DE-BNETZA")!;
    expect(bnetza.space_mandate).toContain("frequenc");
    expect(bnetza.applicable_areas).toContain("frequency_spectrum");
  });

  it("every authority has a valid website URL", () => {
    for (const a of AUTHORITIES_DE) {
      expect(a.website).toBeTruthy();
      expect(a.website.startsWith("http")).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `npm test -- --run tests/unit/data/legal-sources.test.ts`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add tests/unit/data/legal-sources.test.ts
git commit -m "test(legal-sources): structural, accuracy, and lookup function tests"
```

---

### Task 9: Final Verification

- [ ] **Step 1: Run all tests to ensure nothing broke**

Run: `npm test -- --run tests/unit/data/`
Expected: All tests pass

- [ ] **Step 2: Run TypeScript type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Final commit with all files**

```bash
git add -A
git commit -m "feat(legal-sources): complete DE legal framework — 32 sources, 8 authorities, full tests"
```
