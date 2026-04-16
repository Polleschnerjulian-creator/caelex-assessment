# Atlas Landing Rights — Tasks T1–T7

Parent plan: [2026-04-17-atlas-landing-rights.md](./2026-04-17-atlas-landing-rights.md)

---

### Task 1: Types + Zod schemas

**Files:**

- Create: `src/data/landing-rights/types.ts`
- Create: `src/data/landing-rights/_helpers.ts`
- Create: `src/data/landing-rights/types.test.ts`

- [ ] **Step 1: Create `_helpers.ts` with JurisdictionCode union**

```ts
// src/data/landing-rights/_helpers.ts

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

export const JURISDICTION_CODES = [
  // EU/EFTA (19)
  "DE",
  "FR",
  "UK",
  "IT",
  "LU",
  "NL",
  "BE",
  "ES",
  "NO",
  "SE",
  "FI",
  "DK",
  "AT",
  "CH",
  "PT",
  "IE",
  "GR",
  "CZ",
  "PL",
  // Priority Non-EU (10)
  "US",
  "IN",
  "AE",
  "SA",
  "BR",
  "JP",
  "SG",
  "AU",
  "CA",
  "ZA",
] as const;

export type JurisdictionCode = (typeof JURISDICTION_CODES)[number];

export function isJurisdictionCode(v: string): v is JurisdictionCode {
  return (JURISDICTION_CODES as readonly string[]).includes(v);
}
```

- [ ] **Step 2: Write the failing schema test**

```ts
// src/data/landing-rights/types.test.ts

import { describe, it, expect } from "vitest";
import {
  LandingRightsProfileSchema,
  CategoryDeepDiveSchema,
  CaseStudySchema,
  OperatorMatrixRowSchema,
  ConductConditionSchema,
} from "./types";

describe("Landing Rights schemas", () => {
  it("accepts a minimal valid profile", () => {
    const profile = {
      jurisdiction: "DE",
      depth: "stub",
      last_verified: "2026-04-17",
      overview: { summary: "x", regime_type: "telecoms_only" },
      regulators: [],
      legal_basis: [],
      fees: {},
      timeline: { typical_duration_months: { min: 3, max: 6 } },
      foreign_ownership: {},
      renewal: {},
      security_review: { required: false },
      operator_snapshots: {},
    };
    expect(() => LandingRightsProfileSchema.parse(profile)).not.toThrow();
  });

  it("rejects a profile with invalid jurisdiction", () => {
    const bad = { jurisdiction: "XX" };
    expect(() => LandingRightsProfileSchema.parse(bad)).toThrow();
  });

  it("accepts a minimal valid case study", () => {
    const cs = {
      id: "test-case",
      title: "Test",
      jurisdiction: "DE",
      operator: "Starlink",
      categories: ["market_access"],
      date_range: { from: "2020-01-01" },
      narrative: "...",
      takeaways: [],
      outcome: "licensed",
      last_verified: "2026-04-17",
    };
    expect(() => CaseStudySchema.parse(cs)).not.toThrow();
  });

  it("accepts a minimal valid conduct condition", () => {
    const cc = {
      id: "test-cond",
      jurisdiction: "IN",
      type: "lawful_intercept",
      title: "Test",
      requirement: "...",
      applies_to: "all_operators",
      last_verified: "2026-04-17",
    };
    expect(() => ConductConditionSchema.parse(cc)).not.toThrow();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/data/landing-rights/types.test.ts`
Expected: FAIL — `./types` module not found.

- [ ] **Step 4: Implement `types.ts`**

```ts
// src/data/landing-rights/types.ts

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 *
 * Landing Rights type system. Zod schemas double as runtime validators
 * (used in types.test.ts to catch malformed content files at test time).
 */

import { z } from "zod";
import { JURISDICTION_CODES } from "./_helpers";

export const LandingRightsCategorySchema = z.enum([
  "market_access",
  "itu_coordination",
  "earth_station",
  "re_entry",
]);
export type LandingRightsCategory = z.infer<typeof LandingRightsCategorySchema>;

export const RegimeTypeSchema = z.enum([
  "two_track",
  "telecoms_only",
  "space_act_only",
  "emerging",
]);
export type RegimeType = z.infer<typeof RegimeTypeSchema>;

export const CoverageDepthSchema = z.enum(["deep", "standard", "stub"]);
export type CoverageDepth = z.infer<typeof CoverageDepthSchema>;

export const OperatorStatusSchema = z.enum([
  "licensed",
  "pending",
  "denied",
  "sector_limited",
  "not_entered",
  "unknown",
]);
export type OperatorStatus = z.infer<typeof OperatorStatusSchema>;

export const JurisdictionCodeSchema = z.enum(JURISDICTION_CODES);

const FeeRangeSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  currency: z.string(),
  note: z.string().optional(),
});

export const LandingRightsProfileSchema = z.object({
  jurisdiction: JurisdictionCodeSchema,
  depth: CoverageDepthSchema,
  last_verified: z.string(),
  overview: z.object({
    summary: z.string(),
    regime_type: RegimeTypeSchema,
    in_force_date: z.string().optional(),
    last_major_change: z.string().optional(),
  }),
  regulators: z.array(
    z.object({
      name: z.string(),
      abbreviation: z.string(),
      role: z.enum(["primary", "co_authority", "security_review"]),
      url: z.string().optional(),
    }),
  ),
  legal_basis: z.array(
    z.object({
      source_id: z.string(),
      title: z.string(),
      citation: z.string().optional(),
    }),
  ),
  fees: z.object({
    application: FeeRangeSchema.optional(),
    annual: FeeRangeSchema.optional(),
    note: z.string().optional(),
  }),
  timeline: z.object({
    typical_duration_months: z.object({ min: z.number(), max: z.number() }),
    statutory_window_days: z.number().optional(),
    note: z.string().optional(),
  }),
  foreign_ownership: z.object({
    cap_percent: z.number().nullable().optional(),
    note: z.string().optional(),
    workaround: z.string().optional(),
  }),
  renewal: z.object({
    term_years: z.number().optional(),
    note: z.string().optional(),
  }),
  security_review: z.object({
    required: z.boolean(),
    authority: z.string().optional(),
    framework: z.string().optional(),
  }),
  operator_snapshots: z.record(
    z.enum(["starlink", "kuiper", "oneweb"]),
    z.object({
      status: OperatorStatusSchema,
      since: z.string().optional(),
      note: z.string().optional(),
    }),
  ),
});
export type LandingRightsProfile = z.infer<typeof LandingRightsProfileSchema>;

export const CategoryDeepDiveSchema = z.object({
  jurisdiction: JurisdictionCodeSchema,
  category: LandingRightsCategorySchema,
  title: z.string(),
  summary: z.string(),
  key_provisions: z.array(
    z.object({
      title: z.string(),
      body: z.string(),
      citation: z.string().optional(),
    }),
  ),
  practical_notes: z.string().optional(),
  last_verified: z.string(),
});
export type CategoryDeepDive = z.infer<typeof CategoryDeepDiveSchema>;

export const CaseStudySchema = z.object({
  id: z.string(),
  title: z.string(),
  jurisdiction: JurisdictionCodeSchema,
  operator: z.string(),
  categories: z.array(LandingRightsCategorySchema),
  date_range: z.object({ from: z.string(), to: z.string().optional() }),
  narrative: z.string(),
  takeaways: z.array(z.string()),
  outcome: z.enum(["licensed", "pending", "denied", "compromise"]),
  last_verified: z.string(),
});
export type CaseStudy = z.infer<typeof CaseStudySchema>;

export const OperatorMatrixRowSchema = z.object({
  operator: z.string(),
  statuses: z.record(
    JurisdictionCodeSchema,
    z.object({
      status: OperatorStatusSchema,
      since: z.string().optional(),
      note: z.string().optional(),
    }),
  ),
  last_verified: z.string(),
});
export type OperatorMatrixRow = z.infer<typeof OperatorMatrixRowSchema>;

export const ConductConditionSchema = z.object({
  id: z.string(),
  jurisdiction: JurisdictionCodeSchema,
  type: z.enum([
    "data_localization",
    "lawful_intercept",
    "geo_fencing",
    "indigenization",
    "suspension_capability",
    "local_content",
    "other",
  ]),
  title: z.string(),
  requirement: z.string(),
  legal_source_id: z.string().optional(),
  effective_date: z.string().optional(),
  applies_to: z.enum([
    "all_operators",
    "mssp",
    "ngso",
    "gso",
    "gateway",
    "specific",
  ]),
  operators_affected: z.array(z.string()).optional(),
  last_verified: z.string(),
});
export type ConductCondition = z.infer<typeof ConductConditionSchema>;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/data/landing-rights/types.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/data/landing-rights/types.ts src/data/landing-rights/_helpers.ts src/data/landing-rights/types.test.ts
git commit -m "feat(atlas): add landing rights type system + zod schemas"
```

---

### Task 2: Helpers, index, and aggregation

**Files:**

- Create: `src/data/landing-rights/index.ts`
- Create: `src/data/landing-rights/index.test.ts`

- [ ] **Step 1: Write the failing helper test**

```ts
// src/data/landing-rights/index.test.ts

import { describe, it, expect } from "vitest";
import {
  getProfile,
  getDeepDives,
  getDeepDive,
  getCaseStudiesFor,
  getConductFor,
  getOperatorStatus,
  ALL_LANDING_RIGHTS_PROFILES,
} from "./index";

describe("Landing Rights lookups", () => {
  it("exports an array of profiles", () => {
    expect(Array.isArray(ALL_LANDING_RIGHTS_PROFILES)).toBe(true);
  });

  it("returns undefined for unknown jurisdiction profile", () => {
    // @ts-expect-error — testing runtime behaviour
    expect(getProfile("XX")).toBeUndefined();
  });

  it("returns empty array for deep-dives of unknown jurisdiction", () => {
    // @ts-expect-error
    expect(getDeepDives("XX")).toEqual([]);
  });

  it("returns empty array for case studies of unknown jurisdiction", () => {
    // @ts-expect-error
    expect(getCaseStudiesFor("XX")).toEqual([]);
  });

  it("returns empty array for conduct conditions of unknown jurisdiction", () => {
    // @ts-expect-error
    expect(getConductFor("XX")).toEqual([]);
  });

  it("returns undefined for unknown operator status", () => {
    expect(getOperatorStatus("UnknownOp", "DE")).toBeUndefined();
  });

  it("returns undefined for unknown deep-dive category pair", () => {
    // @ts-expect-error
    expect(getDeepDive("XX", "market_access")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/landing-rights/index.test.ts`
Expected: FAIL — `./index` module not found.

- [ ] **Step 3: Implement `index.ts`**

```ts
// src/data/landing-rights/index.ts

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 *
 * Landing Rights aggregation and lookup. All content is statically
 * imported from per-country / per-entity files — no async, no cache.
 */

import type {
  LandingRightsProfile,
  CategoryDeepDive,
  CaseStudy,
  OperatorMatrixRow,
  ConductCondition,
  LandingRightsCategory,
  OperatorStatus,
} from "./types";
import type { JurisdictionCode } from "./_helpers";

// ─── Profile imports ─────────────────────────────────────────────────
import { PROFILE_DE } from "./profiles/de";
import { PROFILE_US } from "./profiles/us";
import { PROFILE_IN } from "./profiles/in";

// ─── Category deep-dive imports ──────────────────────────────────────
import { MARKET_ACCESS_DEEP_DIVES } from "./category-deep-dives/market-access";
import { ITU_COORDINATION_DEEP_DIVES } from "./category-deep-dives/itu-coordination";
import { EARTH_STATION_DEEP_DIVES } from "./category-deep-dives/earth-station";
import { RE_ENTRY_DEEP_DIVES } from "./category-deep-dives/re-entry";

// ─── Other entities ──────────────────────────────────────────────────
import { CASE_STUDIES } from "./case-studies";
import { OPERATOR_MATRIX_ROWS } from "./operator-matrix";
import { CONDUCT_CONDITIONS } from "./conduct-conditions";

export type {
  LandingRightsProfile,
  CategoryDeepDive,
  CaseStudy,
  OperatorMatrixRow,
  ConductCondition,
  LandingRightsCategory,
  OperatorStatus,
  JurisdictionCode,
  RegimeType,
  CoverageDepth,
  ConductType,
} from "./types";

// ─── Aggregated arrays ───────────────────────────────────────────────

export const ALL_LANDING_RIGHTS_PROFILES: LandingRightsProfile[] = [
  PROFILE_DE,
  PROFILE_US,
  PROFILE_IN,
];

export const ALL_DEEP_DIVES: CategoryDeepDive[] = [
  ...MARKET_ACCESS_DEEP_DIVES,
  ...ITU_COORDINATION_DEEP_DIVES,
  ...EARTH_STATION_DEEP_DIVES,
  ...RE_ENTRY_DEEP_DIVES,
];

export const ALL_CASE_STUDIES: CaseStudy[] = CASE_STUDIES;
export const OPERATOR_MATRIX: OperatorMatrixRow[] = OPERATOR_MATRIX_ROWS;
export const ALL_CONDUCT_CONDITIONS: ConductCondition[] = CONDUCT_CONDITIONS;

// ─── Lookup functions ────────────────────────────────────────────────

export function getProfile(
  code: JurisdictionCode,
): LandingRightsProfile | undefined {
  return ALL_LANDING_RIGHTS_PROFILES.find((p) => p.jurisdiction === code);
}

export function getDeepDives(code: JurisdictionCode): CategoryDeepDive[] {
  return ALL_DEEP_DIVES.filter((d) => d.jurisdiction === code);
}

export function getDeepDive(
  code: JurisdictionCode,
  category: LandingRightsCategory,
): CategoryDeepDive | undefined {
  return ALL_DEEP_DIVES.find(
    (d) => d.jurisdiction === code && d.category === category,
  );
}

export function getCaseStudiesFor(code: JurisdictionCode): CaseStudy[] {
  return ALL_CASE_STUDIES.filter((c) => c.jurisdiction === code);
}

export function getConductFor(code: JurisdictionCode): ConductCondition[] {
  return ALL_CONDUCT_CONDITIONS.filter((c) => c.jurisdiction === code);
}

export function getOperatorStatus(
  operator: string,
  code: JurisdictionCode,
): OperatorStatus | undefined {
  const row = OPERATOR_MATRIX.find(
    (r) => r.operator.toLowerCase() === operator.toLowerCase(),
  );
  return row?.statuses[code]?.status;
}
```

- [ ] **Step 4: Create all category-deep-dive stubs + other empties**

```ts
// src/data/landing-rights/category-deep-dives/market-access.ts
import type { CategoryDeepDive } from "../types";
export const MARKET_ACCESS_DEEP_DIVES: CategoryDeepDive[] = [];
```

```ts
// src/data/landing-rights/category-deep-dives/itu-coordination.ts
import type { CategoryDeepDive } from "../types";
export const ITU_COORDINATION_DEEP_DIVES: CategoryDeepDive[] = [];
```

```ts
// src/data/landing-rights/category-deep-dives/earth-station.ts
import type { CategoryDeepDive } from "../types";
export const EARTH_STATION_DEEP_DIVES: CategoryDeepDive[] = [];
```

```ts
// src/data/landing-rights/category-deep-dives/re-entry.ts
import type { CategoryDeepDive } from "../types";
export const RE_ENTRY_DEEP_DIVES: CategoryDeepDive[] = [];
```

```ts
// src/data/landing-rights/case-studies.ts
import type { CaseStudy } from "./types";
export const CASE_STUDIES: CaseStudy[] = [];
```

```ts
// src/data/landing-rights/operator-matrix.ts
import type { OperatorMatrixRow } from "./types";
export const OPERATOR_MATRIX_ROWS: OperatorMatrixRow[] = [];
```

```ts
// src/data/landing-rights/conduct-conditions.ts
import type { ConductCondition } from "./types";
export const CONDUCT_CONDITIONS: ConductCondition[] = [];
```

- [ ] **Step 5: Run test to verify it passes (still fails because profile files missing)**

Run: `npx vitest run src/data/landing-rights/index.test.ts`
Expected: FAIL — `./profiles/de` not found. This is expected; Task 3 seeds profiles. Skip forward. The test will pass after T3.

- [ ] **Step 6: Commit**

```bash
git add src/data/landing-rights/index.ts src/data/landing-rights/index.test.ts src/data/landing-rights/category-deep-dives src/data/landing-rights/case-studies.ts src/data/landing-rights/operator-matrix.ts src/data/landing-rights/conduct-conditions.ts
git commit -m "feat(atlas): landing rights index + lookup helpers + empty seed containers"
```

---

### Task 3: Seed data — 3 profiles + 1 case study + 2 conduct conditions + operator matrix

**Files:**

- Create: `src/data/landing-rights/profiles/_template.ts`
- Create: `src/data/landing-rights/profiles/de.ts`
- Create: `src/data/landing-rights/profiles/us.ts`
- Create: `src/data/landing-rights/profiles/in.ts`
- Modify: `src/data/landing-rights/case-studies.ts`
- Modify: `src/data/landing-rights/conduct-conditions.ts`
- Modify: `src/data/landing-rights/operator-matrix.ts`
- Modify: `src/data/landing-rights/category-deep-dives/market-access.ts`

- [ ] **Step 1: Create `profiles/_template.ts`**

```ts
// src/data/landing-rights/profiles/_template.ts

/**
 * Template for adding a new jurisdiction to Landing Rights.
 *
 * 1. Copy to `profiles/<lowercase-code>.ts` (e.g., `fr.ts`)
 * 2. Replace all XX / placeholders
 * 3. Set `depth` honestly: 'stub' if only skeleton, 'standard' if researched, 'deep' if lawyer-reviewed
 * 4. Update `last_verified` to today's ISO date
 * 5. Register in `src/data/landing-rights/index.ts`
 */

import type { LandingRightsProfile } from "../types";

export const PROFILE_XX: LandingRightsProfile = {
  jurisdiction: "DE", // replace
  depth: "stub",
  last_verified: "2026-04-17",
  overview: {
    summary: "...",
    regime_type: "two_track",
  },
  regulators: [],
  legal_basis: [],
  fees: {},
  timeline: { typical_duration_months: { min: 6, max: 12 } },
  foreign_ownership: {},
  renewal: {},
  security_review: { required: false },
  operator_snapshots: {},
};
```

- [ ] **Step 2: Create `profiles/de.ts`**

```ts
// src/data/landing-rights/profiles/de.ts

import type { LandingRightsProfile } from "../types";

export const PROFILE_DE: LandingRightsProfile = {
  jurisdiction: "DE",
  depth: "standard",
  last_verified: "2026-04-17",
  overview: {
    summary:
      "Germany currently operates a telecoms-only regime for satellite market access. BNetzA licenses spectrum and ITU filings; a dedicated Space Act (Weltraumgesetz, WRG) has been in draft since September 2024. Once enacted, it will introduce a licensing, liability, and insurance regime applicable to German-established operators.",
    regime_type: "emerging",
    last_major_change: "2024-09-04",
  },
  regulators: [
    {
      name: "Bundesnetzagentur",
      abbreviation: "BNetzA",
      role: "primary",
      url: "https://www.bundesnetzagentur.de/",
    },
    {
      name: "Bundesministerium für Wirtschaft und Klimaschutz",
      abbreviation: "BMWK",
      role: "co_authority",
    },
  ],
  legal_basis: [
    {
      source_id: "de-telekommunikationsgesetz",
      title: "Telekommunikationsgesetz (TKG)",
      citation: "§§ 52, 55 TKG (spectrum authorisation)",
    },
    {
      source_id: "de-awv",
      title: "Außenwirtschaftsverordnung (AWV)",
      citation: "§§ 55–57 AWV (FDI screening)",
    },
  ],
  fees: {
    application: {
      currency: "EUR",
      note: "BNetzA schedule, typically €1k–€10k depending on band",
    },
    note: "No space-licence fee until WRG enactment.",
  },
  timeline: {
    typical_duration_months: { min: 4, max: 9 },
    note: "Driven by ITU coordination status and BNetzA queue.",
  },
  foreign_ownership: {
    cap_percent: null,
    note: "No sector-specific cap; AWV screening triggers at ≥10% stake for sensitive sectors including aerospace.",
  },
  renewal: { term_years: 10 },
  security_review: {
    required: true,
    authority: "BMWK",
    framework: "AWV cross-sectoral FDI screening (expanded 2020/21)",
  },
  operator_snapshots: {
    starlink: {
      status: "licensed",
      since: "2020-12",
      note: "BNetzA market authorisation granted December 2020.",
    },
    kuiper: { status: "pending" },
    oneweb: { status: "licensed" },
  },
};
```

- [ ] **Step 3: Create `profiles/us.ts`**

```ts
// src/data/landing-rights/profiles/us.ts

import type { LandingRightsProfile } from "../types";

export const PROFILE_US: LandingRightsProfile = {
  jurisdiction: "US",
  depth: "standard",
  last_verified: "2026-04-17",
  overview: {
    summary:
      "The US separates three regulatory tracks: FCC market access under 47 CFR § 25.137 (PDR for foreign-licensed networks), FAA Part 450 for launch/re-entry, and Executive Order 13913 Team Telecom review for foreign-ownership risk. First formal FCC Team Telecom enforcement landed in January 2026 (Marlink).",
    regime_type: "two_track",
    in_force_date: "1934-06-19",
    last_major_change: "2026-01",
  },
  regulators: [
    {
      name: "Federal Communications Commission",
      abbreviation: "FCC",
      role: "primary",
      url: "https://www.fcc.gov/space",
    },
    {
      name: "Federal Aviation Administration — Office of Commercial Space Transportation",
      abbreviation: "FAA AST",
      role: "co_authority",
    },
    {
      name: "Committee for the Assessment of Foreign Participation",
      abbreviation: "Team Telecom",
      role: "security_review",
    },
  ],
  legal_basis: [
    {
      source_id: "us-communications-act-310b",
      title: "Communications Act § 310(b) (foreign ownership)",
    },
    {
      source_id: "us-cfr-25-137",
      title: "47 CFR § 25.137 — foreign-licensed satellite networks",
    },
    { source_id: "us-eo-13913", title: "Executive Order 13913 (April 2020)" },
    { source_id: "us-cfr-14-450", title: "14 CFR Part 450 — launch & reentry" },
  ],
  fees: {
    application: {
      min: 525,
      max: 471575,
      currency: "USD",
      note: "FCC fee schedule; major NGSO filings top range.",
    },
    annual: {
      currency: "USD",
      note: "Regulatory fees per FCC Report & Order.",
    },
  },
  timeline: {
    typical_duration_months: { min: 9, max: 24 },
    statutory_window_days: 120,
    note: "Team Telecom initial review 120 days + possible 90-day extension.",
  },
  foreign_ownership: {
    cap_percent: 20,
    note: "§ 310(b) benchmarks: 20% direct / 25% indirect; routinely waived with Team Telecom mitigation.",
  },
  renewal: { term_years: 15 },
  security_review: {
    required: true,
    authority: "Team Telecom (DOJ / DoD / DHS)",
    framework: "Executive Order 13913",
  },
  operator_snapshots: {
    starlink: {
      status: "licensed",
      since: "2019-03",
      note: "Gen-1 and Gen-2 authorised.",
    },
    kuiper: {
      status: "licensed",
      since: "2020-07",
      note: "3,236 satellites; milestone deadlines 2026-07-30 (50%) and 2029-07-30 (100%).",
    },
    oneweb: { status: "licensed" },
  },
};
```

- [ ] **Step 4: Create `profiles/in.ts`**

```ts
// src/data/landing-rights/profiles/in.ts

import type { LandingRightsProfile } from "../types";

export const PROFILE_IN: LandingRightsProfile = {
  jurisdiction: "IN",
  depth: "deep",
  last_verified: "2026-04-17",
  overview: {
    summary:
      "India operates a three-approval regime: DoT GMPCS licence under the Telecommunications Act 2023, IN-SPACe authorisation under the Indian Space Policy 2023, and TRAI recommendations on spectrum assignment. Plus a mandatory security clearance from MHA. Starlink illustrates the timeline: filed 2021, commercial authorisation July 2025.",
    regime_type: "two_track",
    in_force_date: "2023-12-24",
    last_major_change: "2025-07-08",
  },
  regulators: [
    {
      name: "Department of Telecommunications",
      abbreviation: "DoT",
      role: "primary",
    },
    {
      name: "Indian National Space Promotion and Authorization Centre",
      abbreviation: "IN-SPACe",
      role: "co_authority",
    },
    {
      name: "Telecom Regulatory Authority of India",
      abbreviation: "TRAI",
      role: "co_authority",
    },
    {
      name: "Ministry of Home Affairs",
      abbreviation: "MHA",
      role: "security_review",
    },
  ],
  legal_basis: [
    {
      source_id: "in-telecommunications-act-2023",
      title: "Telecommunications Act, 2023",
    },
    { source_id: "in-space-policy-2023", title: "Indian Space Policy 2023" },
    {
      source_id: "in-dot-gmpcs-2022",
      title: "DoT 2022 Guidelines for satcom GMPCS networks",
    },
  ],
  fees: {
    annual: {
      currency: "INR",
      note: "TRAI recommends 4% of AGR + INR 500/subscriber/year urban surcharge.",
    },
  },
  timeline: {
    typical_duration_months: { min: 24, max: 48 },
    note: "Starlink: 4 years end-to-end. OneWeb/Jio-SES ~2–3 years.",
  },
  foreign_ownership: {
    cap_percent: null,
    note: "100% automatic route for satellite manufacturing/operation since March 2024 (Press Note 1).",
  },
  renewal: { term_years: 5 },
  security_review: {
    required: true,
    authority: "MHA",
    framework:
      "Mandatory clearance + per-terminal registration, lawful intercept, geo-fencing.",
  },
  operator_snapshots: {
    starlink: { status: "licensed", since: "2025-07-08" },
    kuiper: { status: "pending" },
    oneweb: { status: "licensed", since: "2023-11" },
  },
};
```

- [ ] **Step 5: Replace `case-studies.ts` with seed**

```ts
// src/data/landing-rights/case-studies.ts

import type { CaseStudy } from "./types";

export const CASE_STUDIES: CaseStudy[] = [
  {
    id: "starlink-india-gmpcs-2021-2025",
    title: "Starlink India — the 4-year benchmark for regulatory friction",
    jurisdiction: "IN",
    operator: "Starlink",
    categories: ["market_access"],
    date_range: { from: "2021-11", to: "2025-07-08" },
    narrative:
      "Starlink opened India pre-orders in November 2021 and was immediately reprimanded by DoT, prompting refunds. A GMPCS application followed in 2022; the 2022 DoT Guidelines and March 2024 FDI liberalisation (100% auto route) progressively unlocked structural barriers. TRAI's October 2024 recommendation favoured administrative allocation. DoT Letter of Intent arrived May 2025; GMPCS Licence June 2025; IN-SPACe 5-year authorisation 8 July 2025 — third operator cleared after Eutelsat OneWeb (Nov 2023) and Jio-SES (June 2024). Security conditions require per-terminal registration, geo-fencing, traffic metadata logging, lawful interception gateways, 50-km border/coastal special monitoring, 20% indigenous ground-segment content, NavIC support by 2029, and service-suspension capability during emergencies.",
    takeaways: [
      "End-to-end timeline: ~44 months from first marketing to operational authorisation.",
      "Conduct-based conditionality imposes tens of millions of USD in operator-specific compliance CAPEX beyond headline licensing fees.",
      "20% indigenisation requirement is a novel quasi-trade barrier likely to be replicated across BRICS.",
    ],
    outcome: "licensed",
    last_verified: "2026-04-17",
  },
];
```

- [ ] **Step 6: Replace `conduct-conditions.ts` with seed**

```ts
// src/data/landing-rights/conduct-conditions.ts

import type { ConductCondition } from "./types";

export const CONDUCT_CONDITIONS: ConductCondition[] = [
  {
    id: "in-lawful-intercept-gateway",
    jurisdiction: "IN",
    type: "lawful_intercept",
    title: "Lawful interception gateway",
    requirement:
      "Operators must deploy gateways that enable DoT-ordered lawful interception of traffic metadata and content, including service-suspension capability for national emergencies.",
    legal_source_id: "in-dot-gmpcs-2022",
    applies_to: "all_operators",
    operators_affected: ["Starlink", "OneWeb", "Jio-SES"],
    last_verified: "2026-04-17",
  },
  {
    id: "in-20-percent-indigenisation",
    jurisdiction: "IN",
    type: "indigenization",
    title: "20% indigenous ground-segment content",
    requirement:
      "Minimum 20% of ground-segment infrastructure (gateways, user terminals, control systems) must be sourced from Indian suppliers.",
    legal_source_id: "in-dot-gmpcs-2022",
    applies_to: "all_operators",
    last_verified: "2026-04-17",
  },
];
```

- [ ] **Step 7: Replace `operator-matrix.ts` with seed**

```ts
// src/data/landing-rights/operator-matrix.ts

import type { OperatorMatrixRow } from "./types";

export const OPERATOR_MATRIX_ROWS: OperatorMatrixRow[] = [
  {
    operator: "Starlink",
    statuses: {
      DE: { status: "licensed", since: "2020-12" },
      US: { status: "licensed", since: "2019-03" },
      IN: { status: "licensed", since: "2025-07-08" },
    },
    last_verified: "2026-04-17",
  },
];
```

- [ ] **Step 8: Add one market-access deep-dive (India example)**

```ts
// src/data/landing-rights/category-deep-dives/market-access.ts

import type { CategoryDeepDive } from "../types";

export const MARKET_ACCESS_DEEP_DIVES: CategoryDeepDive[] = [
  {
    jurisdiction: "IN",
    category: "market_access",
    title: "GMPCS + IN-SPACe + TRAI — the three-approval regime",
    summary:
      "India's commercial satcom market access requires parallel approvals from DoT (GMPCS licence), IN-SPACe (space-activity authorisation), and TRAI-recommended spectrum pricing, plus an MHA security clearance.",
    key_provisions: [
      {
        title: "DoT GMPCS licence",
        body: "Five-year licence under the Telecommunications Act 2023 with per-subscriber registration, geo-fencing, lawful intercept, and emergency-suspension capabilities.",
        citation: "DoT 2022 Guidelines; Telecommunications Act 2023 § 3",
      },
      {
        title: "IN-SPACe authorisation",
        body: "Five-year authorisation under the Indian Space Policy 2023 covering the space-activity aspect, separate from the DoT spectrum/commercial licence.",
        citation: "Indian Space Policy 2023",
      },
      {
        title: "TRAI spectrum recommendation",
        body: "October 2024 recommendation favours administrative allocation at 4% of AGR plus INR 500/subscriber/year urban surcharge over a five-year term.",
      },
    ],
    practical_notes:
      "End-to-end timeline observed at 24–48 months. Operators should treat MHA clearance as critical-path, not parallel.",
    last_verified: "2026-04-17",
  },
];
```

- [ ] **Step 9: Re-run tests**

Run: `npx vitest run src/data/landing-rights/`
Expected: PASS for both types.test.ts and index.test.ts (11 tests total).

- [ ] **Step 10: Commit**

```bash
git add src/data/landing-rights/profiles src/data/landing-rights/case-studies.ts src/data/landing-rights/conduct-conditions.ts src/data/landing-rights/operator-matrix.ts src/data/landing-rights/category-deep-dives/market-access.ts
git commit -m "feat(atlas): seed landing rights content — DE, US, IN profiles + Starlink-India case study"
```

---

### Task 4: UI primitives — badges, stamp, disclaimer + i18n

**Files:**

- Create: `src/components/atlas/landing-rights/LandingRightsStatusBadge.tsx`
- Create: `src/components/atlas/landing-rights/DepthBadge.tsx`
- Create: `src/components/atlas/landing-rights/LastVerifiedStamp.tsx`
- Create: `src/components/atlas/landing-rights/LandingRightsDisclaimer.tsx`
- Modify: `src/app/(atlas)/atlas/i18n-labels.ts`

- [ ] **Step 1: Add i18n keys**

Open `src/app/(atlas)/atlas/i18n-labels.ts` and add under the existing `atlas.*` namespace (exact insertion point and existing shape will vary — append these keys to each language object):

```ts
// Landing Rights
"atlas.landing_rights": "Landing Rights",
"atlas.landing_rights.title": "Landing Rights Database",
"atlas.landing_rights.subtitle": "National authorisations for satellite market access across 29 jurisdictions",
"atlas.landing_rights.depth_deep": "Deep coverage",
"atlas.landing_rights.depth_standard": "Standard coverage",
"atlas.landing_rights.depth_stub": "Limited coverage",
"atlas.landing_rights.depth_stub_note": "Not independently verified",
"atlas.landing_rights.status_licensed": "Licensed",
"atlas.landing_rights.status_pending": "Pending",
"atlas.landing_rights.status_denied": "Denied",
"atlas.landing_rights.status_sector_limited": "Sector-limited",
"atlas.landing_rights.status_not_entered": "Not entered",
"atlas.landing_rights.status_unknown": "Unknown",
"atlas.landing_rights.category_market_access": "Market Access",
"atlas.landing_rights.category_itu_coordination": "ITU Coordination",
"atlas.landing_rights.category_earth_station": "Earth Station & ESIM",
"atlas.landing_rights.category_re_entry": "Re-entry",
"atlas.landing_rights.case_studies": "Case Studies",
"atlas.landing_rights.operators": "Operator Matrix",
"atlas.landing_rights.conduct": "Conduct Conditions",
"atlas.landing_rights.last_verified": "Last verified",
"atlas.landing_rights.coverage_pending": "Coverage pending",
"atlas.landing_rights.disclaimer_extra": "Landing-rights regimes change frequently. Verify with licensed counsel before operational decisions.",
```

Replicate the same keys into the German, French, and Spanish language maps (copy English values as stubs — translation is editorial follow-up).

- [ ] **Step 2: Implement `LandingRightsStatusBadge.tsx`**

```tsx
// src/components/atlas/landing-rights/LandingRightsStatusBadge.tsx

"use client";

import type { OperatorStatus } from "@/data/landing-rights";
import { useLanguage } from "@/components/providers/LanguageProvider";

const STATUS_COLORS: Record<OperatorStatus, string> = {
  licensed: "bg-emerald-500",
  pending: "bg-amber-500",
  denied: "bg-red-500",
  sector_limited: "bg-blue-500",
  not_entered: "bg-gray-300",
  unknown: "bg-gray-200",
};

export function LandingRightsStatusBadge({
  status,
  label,
}: {
  status: OperatorStatus;
  label?: boolean;
}) {
  const { t } = useLanguage();
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`h-2 w-2 rounded-full flex-shrink-0 ${STATUS_COLORS[status]}`}
        aria-label={t(`atlas.landing_rights.status_${status}`)}
      />
      {label && (
        <span className="text-[11px] text-gray-600">
          {t(`atlas.landing_rights.status_${status}`)}
        </span>
      )}
    </span>
  );
}
```

- [ ] **Step 3: Implement `DepthBadge.tsx`**

```tsx
// src/components/atlas/landing-rights/DepthBadge.tsx

"use client";

import type { CoverageDepth } from "@/data/landing-rights";
import { useLanguage } from "@/components/providers/LanguageProvider";

const DEPTH_STYLES: Record<CoverageDepth, string> = {
  deep: "bg-emerald-50 text-emerald-700 border-emerald-200",
  standard: "bg-gray-50 text-gray-700 border-gray-200",
  stub: "bg-amber-50 text-amber-800 border-amber-200",
};

export function DepthBadge({ depth }: { depth: CoverageDepth }) {
  const { t } = useLanguage();
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-medium uppercase tracking-wider ${DEPTH_STYLES[depth]}`}
      title={
        depth === "stub" ? t("atlas.landing_rights.depth_stub_note") : undefined
      }
    >
      {t(`atlas.landing_rights.depth_${depth}`)}
    </span>
  );
}
```

- [ ] **Step 4: Implement `LastVerifiedStamp.tsx`**

```tsx
// src/components/atlas/landing-rights/LastVerifiedStamp.tsx

"use client";

import { useLanguage } from "@/components/providers/LanguageProvider";

function daysSince(iso: string): number {
  const then = new Date(iso).getTime();
  const now = Date.now();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}

export function LastVerifiedStamp({ date }: { date: string }) {
  const { t } = useLanguage();
  const age = daysSince(date);
  const color =
    age > 180 ? "text-red-600" : age > 90 ? "text-amber-600" : "text-gray-500";
  return (
    <span className={`text-[10px] font-medium ${color}`}>
      {t("atlas.landing_rights.last_verified")}: {date}
    </span>
  );
}
```

- [ ] **Step 5: Implement `LandingRightsDisclaimer.tsx`**

```tsx
// src/components/atlas/landing-rights/LandingRightsDisclaimer.tsx

"use client";

import { useLanguage } from "@/components/providers/LanguageProvider";

export function LandingRightsDisclaimer() {
  const { t } = useLanguage();
  return (
    <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3">
      <p className="text-[11px] leading-relaxed text-amber-900">
        <span className="font-semibold uppercase tracking-wider">
          {t("atlas.disclaimer_no_legal_advice")}.
        </span>{" "}
        {t("atlas.landing_rights.disclaimer_extra")}
      </p>
    </div>
  );
}
```

- [ ] **Step 6: Manual smoke check**

Run: `npm run typecheck`
Expected: PASS (no TS errors).

- [ ] **Step 7: Commit**

```bash
git add src/components/atlas/landing-rights src/app/(atlas)/atlas/i18n-labels.ts
git commit -m "feat(atlas): landing rights UI primitives + i18n keys"
```

---

### Task 5: List route `/atlas/landing-rights` + filters + card

**Files:**

- Create: `src/app/(atlas)/atlas/landing-rights/layout.tsx`
- Create: `src/app/(atlas)/atlas/landing-rights/page.tsx`
- Create: `src/components/atlas/landing-rights/LandingRightsList.tsx`
- Create: `src/components/atlas/landing-rights/LandingRightsFilters.tsx`
- Create: `src/components/atlas/landing-rights/JurisdictionCard.tsx`

- [ ] **Step 1: Create `layout.tsx` that wraps LR routes with disclaimer**

```tsx
// src/app/(atlas)/atlas/landing-rights/layout.tsx

import { LandingRightsDisclaimer } from "@/components/atlas/landing-rights/LandingRightsDisclaimer";

export default function LandingRightsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="px-8 lg:px-16 py-8">
      <LandingRightsDisclaimer />
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Implement `JurisdictionCard.tsx`**

```tsx
// src/components/atlas/landing-rights/JurisdictionCard.tsx

"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { LandingRightsProfile } from "@/data/landing-rights";
import { LandingRightsStatusBadge } from "./LandingRightsStatusBadge";
import { DepthBadge } from "./DepthBadge";
import { LastVerifiedStamp } from "./LastVerifiedStamp";

export function JurisdictionCard({
  profile,
}: {
  profile: LandingRightsProfile;
}) {
  const primary = profile.regulators.find((r) => r.role === "primary");
  return (
    <Link
      href={`/atlas/landing-rights/${profile.jurisdiction.toLowerCase()}`}
      className="group flex flex-col gap-3 p-5 rounded-xl bg-white border border-gray-100 hover:border-gray-300 hover:shadow-sm transition-all duration-200"
    >
      <div className="flex items-center justify-between">
        <span className="text-[22px] font-bold text-gray-900">
          {profile.jurisdiction}
        </span>
        <DepthBadge depth={profile.depth} />
      </div>
      <p className="text-[13px] text-gray-600 line-clamp-3 leading-relaxed">
        {profile.overview.summary}
      </p>
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <span className="text-[11px] font-medium text-gray-500">
          {primary?.abbreviation ?? "—"}
        </span>
        <div className="flex items-center gap-3">
          {profile.operator_snapshots.starlink && (
            <LandingRightsStatusBadge
              status={profile.operator_snapshots.starlink.status}
            />
          )}
          <ArrowRight
            size={14}
            className="text-gray-400 group-hover:text-gray-900 transition-colors"
          />
        </div>
      </div>
      <LastVerifiedStamp date={profile.last_verified} />
    </Link>
  );
}
```

- [ ] **Step 3: Implement `LandingRightsFilters.tsx`**

```tsx
// src/components/atlas/landing-rights/LandingRightsFilters.tsx

"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

const REGIONS = [
  { value: "all", label: "All regions" },
  { value: "eu", label: "EU/EFTA" },
  { value: "non-eu", label: "Non-EU" },
];

const DEPTHS = [
  { value: "all", label: "All depth" },
  { value: "deep", label: "Deep" },
  { value: "standard", label: "Standard" },
  { value: "stub", label: "Stub" },
];

export function LandingRightsFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params?.toString() ?? "");
    if (value === "all" || !value) next.delete(key);
    else next.set(key, value);
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  }

  const region = params?.get("region") ?? "all";
  const depth = params?.get("depth") ?? "all";

  return (
    <aside className="flex flex-col gap-4 p-4 rounded-xl bg-white border border-gray-100">
      <div>
        <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 block mb-2">
          Region
        </label>
        <select
          value={region}
          onChange={(e) => setParam("region", e.target.value)}
          className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-[13px]"
        >
          {REGIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 block mb-2">
          Coverage depth
        </label>
        <select
          value={depth}
          onChange={(e) => setParam("depth", e.target.value)}
          className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-[13px]"
        >
          {DEPTHS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </div>
    </aside>
  );
}
```

- [ ] **Step 4: Implement `LandingRightsList.tsx`**

```tsx
// src/components/atlas/landing-rights/LandingRightsList.tsx

import type { LandingRightsProfile } from "@/data/landing-rights";
import { JurisdictionCard } from "./JurisdictionCard";

export function LandingRightsList({
  profiles,
}: {
  profiles: LandingRightsProfile[];
}) {
  if (profiles.length === 0) {
    return (
      <div className="rounded-xl bg-white border border-gray-100 p-12 text-center text-gray-500">
        No jurisdictions match the current filters.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {profiles.map((p) => (
        <JurisdictionCard key={p.jurisdiction} profile={p} />
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Implement list `page.tsx` with server-side filtering**

```tsx
// src/app/(atlas)/atlas/landing-rights/page.tsx

import {
  ALL_LANDING_RIGHTS_PROFILES,
  type LandingRightsProfile,
  type CoverageDepth,
} from "@/data/landing-rights";
import { LandingRightsFilters } from "@/components/atlas/landing-rights/LandingRightsFilters";
import { LandingRightsList } from "@/components/atlas/landing-rights/LandingRightsList";

const EU_CODES = new Set([
  "DE",
  "FR",
  "UK",
  "IT",
  "LU",
  "NL",
  "BE",
  "ES",
  "NO",
  "SE",
  "FI",
  "DK",
  "AT",
  "CH",
  "PT",
  "IE",
  "GR",
  "CZ",
  "PL",
]);

function filterProfiles(
  all: LandingRightsProfile[],
  region: string | undefined,
  depth: string | undefined,
): LandingRightsProfile[] {
  return all.filter((p) => {
    if (region === "eu" && !EU_CODES.has(p.jurisdiction)) return false;
    if (region === "non-eu" && EU_CODES.has(p.jurisdiction)) return false;
    if (depth && depth !== "all" && p.depth !== (depth as CoverageDepth))
      return false;
    return true;
  });
}

export const metadata = {
  title: "Landing Rights — Atlas",
};

export default async function LandingRightsPage({
  searchParams,
}: {
  searchParams: Promise<{ region?: string; depth?: string }>;
}) {
  const params = await searchParams;
  const filtered = filterProfiles(
    ALL_LANDING_RIGHTS_PROFILES,
    params.region,
    params.depth,
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
      <LandingRightsFilters />
      <div>
        <div className="mb-4 flex items-baseline justify-between">
          <h1 className="text-[28px] font-light tracking-tight text-gray-900">
            Landing Rights
          </h1>
          <span className="text-[11px] text-gray-500">
            {filtered.length} / {ALL_LANDING_RIGHTS_PROFILES.length}{" "}
            jurisdictions
          </span>
        </div>
        <LandingRightsList profiles={filtered} />
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Typecheck and smoke test**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/(atlas)/atlas/landing-rights/layout.tsx src/app/(atlas)/atlas/landing-rights/page.tsx src/components/atlas/landing-rights/LandingRightsList.tsx src/components/atlas/landing-rights/LandingRightsFilters.tsx src/components/atlas/landing-rights/JurisdictionCard.tsx
git commit -m "feat(atlas): landing rights list route with URL-synced filters"
```

---

### Task 6: Country detail route `/atlas/landing-rights/[jurisdiction]`

**Files:**

- Create: `src/app/(atlas)/atlas/landing-rights/[jurisdiction]/page.tsx`
- Create: `src/components/atlas/landing-rights/JurisdictionProfileView.tsx`

- [ ] **Step 1: Implement `JurisdictionProfileView.tsx`**

```tsx
// src/components/atlas/landing-rights/JurisdictionProfileView.tsx

import Link from "next/link";
import {
  getDeepDives,
  getCaseStudiesFor,
  getConductFor,
  type LandingRightsProfile,
  type LandingRightsCategory,
} from "@/data/landing-rights";
import { DepthBadge } from "./DepthBadge";
import { LastVerifiedStamp } from "./LastVerifiedStamp";
import { LandingRightsStatusBadge } from "./LandingRightsStatusBadge";

const CATEGORIES: LandingRightsCategory[] = [
  "market_access",
  "itu_coordination",
  "earth_station",
  "re_entry",
];

const CATEGORY_LABELS: Record<LandingRightsCategory, string> = {
  market_access: "Market Access",
  itu_coordination: "ITU Coordination",
  earth_station: "Earth Station & ESIM",
  re_entry: "Re-entry",
};

export function JurisdictionProfileView({
  profile,
  embed = false,
}: {
  profile: LandingRightsProfile;
  embed?: boolean;
}) {
  const deepDives = getDeepDives(profile.jurisdiction);
  const deepDiveCategories = new Set(deepDives.map((d) => d.category));
  const caseStudies = getCaseStudiesFor(profile.jurisdiction);
  const conduct = getConductFor(profile.jurisdiction);
  const code = profile.jurisdiction.toLowerCase();

  return (
    <div className="flex flex-col gap-6">
      {!embed && (
        <header className="flex items-baseline gap-4">
          <h1 className="text-[40px] font-light tracking-tight text-gray-900">
            {profile.jurisdiction}
          </h1>
          <DepthBadge depth={profile.depth} />
          <LastVerifiedStamp date={profile.last_verified} />
        </header>
      )}

      <section className="rounded-xl bg-white border border-gray-100 p-6">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 mb-3">
          Overview
        </h2>
        <p className="text-[14px] leading-relaxed text-gray-800">
          {profile.overview.summary}
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-[11px] text-gray-500">
          <span>Regime: {profile.overview.regime_type.replace("_", " ")}</span>
          {profile.overview.in_force_date && (
            <span>In force: {profile.overview.in_force_date}</span>
          )}
          {profile.overview.last_major_change && (
            <span>Last change: {profile.overview.last_major_change}</span>
          )}
        </div>
      </section>

      <section className="rounded-xl bg-white border border-gray-100 p-6">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 mb-3">
          Regulators
        </h2>
        <ul className="space-y-2">
          {profile.regulators.map((r) => (
            <li key={r.abbreviation} className="flex items-center gap-3">
              <span className="text-[12px] font-bold bg-gray-100 rounded-md px-2 py-1">
                {r.abbreviation}
              </span>
              <span className="text-[14px] text-gray-800">{r.name}</span>
              <span className="text-[10px] uppercase tracking-wider text-gray-400">
                {r.role.replace("_", " ")}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl bg-white border border-gray-100 p-6">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 mb-3">
          Category deep-dives
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIES.map((cat) => {
            const has = deepDiveCategories.has(cat);
            return has ? (
              <Link
                key={cat}
                href={`/atlas/landing-rights/${code}/${cat.replace("_", "-")}`}
                className="flex items-center justify-between px-4 py-3 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 transition"
              >
                <span className="text-[13px] font-medium text-gray-900">
                  {CATEGORY_LABELS[cat]}
                </span>
                <span className="text-[11px] text-emerald-600">→</span>
              </Link>
            ) : (
              <div
                key={cat}
                className="flex items-center justify-between px-4 py-3 rounded-lg bg-gray-50/50 border border-gray-100 opacity-60"
              >
                <span className="text-[13px] text-gray-500">
                  {CATEGORY_LABELS[cat]}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-gray-400">
                  Coverage pending
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl bg-white border border-gray-100 p-6">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 mb-3">
          Fees & Timeline
        </h2>
        <dl className="grid grid-cols-2 gap-4 text-[13px]">
          <div>
            <dt className="text-gray-500 text-[11px]">Application fee</dt>
            <dd className="text-gray-900">
              {profile.fees.application
                ? `${profile.fees.application.min ?? "—"}–${profile.fees.application.max ?? "—"} ${profile.fees.application.currency}`
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500 text-[11px]">Typical timeline</dt>
            <dd className="text-gray-900">
              {profile.timeline.typical_duration_months.min}–
              {profile.timeline.typical_duration_months.max} months
            </dd>
          </div>
          <div>
            <dt className="text-gray-500 text-[11px]">Foreign ownership cap</dt>
            <dd className="text-gray-900">
              {profile.foreign_ownership.cap_percent == null
                ? "No cap"
                : `${profile.foreign_ownership.cap_percent}%`}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500 text-[11px]">Renewal term</dt>
            <dd className="text-gray-900">
              {profile.renewal.term_years
                ? `${profile.renewal.term_years} years`
                : "—"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl bg-white border border-gray-100 p-6">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 mb-3">
          Operator status
        </h2>
        <ul className="space-y-2">
          {(["starlink", "kuiper", "oneweb"] as const).map((op) => {
            const snap = profile.operator_snapshots[op];
            if (!snap) return null;
            return (
              <li key={op} className="flex items-center gap-3">
                <span className="text-[13px] font-medium capitalize w-20">
                  {op}
                </span>
                <LandingRightsStatusBadge status={snap.status} label />
                {snap.since && (
                  <span className="text-[11px] text-gray-500">
                    since {snap.since}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {conduct.length > 0 && (
        <section className="rounded-xl bg-white border border-gray-100 p-6">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 mb-3">
            Conduct conditions
          </h2>
          <ul className="space-y-3">
            {conduct.map((c) => (
              <li key={c.id} className="border-l-2 border-amber-200 pl-3">
                <p className="text-[13px] font-semibold text-gray-900">
                  {c.title}
                </p>
                <p className="text-[12px] text-gray-700 leading-relaxed">
                  {c.requirement}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {caseStudies.length > 0 && (
        <section className="rounded-xl bg-white border border-gray-100 p-6">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 mb-3">
            Related case studies
          </h2>
          <ul className="space-y-2">
            {caseStudies.map((cs) => (
              <li key={cs.id}>
                <Link
                  href={`/atlas/landing-rights/case-studies/${cs.id}`}
                  className="text-[13px] text-gray-800 hover:text-gray-900 hover:underline"
                >
                  {cs.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Implement the detail `page.tsx` with `generateStaticParams`**

```tsx
// src/app/(atlas)/atlas/landing-rights/[jurisdiction]/page.tsx

import { notFound } from "next/navigation";
import {
  ALL_LANDING_RIGHTS_PROFILES,
  getProfile,
  type JurisdictionCode,
} from "@/data/landing-rights";
import { JurisdictionProfileView } from "@/components/atlas/landing-rights/JurisdictionProfileView";

export function generateStaticParams() {
  return ALL_LANDING_RIGHTS_PROFILES.map((p) => ({
    jurisdiction: p.jurisdiction.toLowerCase(),
  }));
}

export default async function Page({
  params,
}: {
  params: Promise<{ jurisdiction: string }>;
}) {
  const { jurisdiction } = await params;
  const code = jurisdiction.toUpperCase() as JurisdictionCode;
  const profile = getProfile(code);
  if (!profile) return notFound();
  return <JurisdictionProfileView profile={profile} />;
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/(atlas)/atlas/landing-rights/\[jurisdiction\] src/components/atlas/landing-rights/JurisdictionProfileView.tsx
git commit -m "feat(atlas): landing rights country detail route with category gateway"
```

---

### Task 7: Category deep-dive route `/atlas/landing-rights/[jurisdiction]/[category]`

**Files:**

- Create: `src/app/(atlas)/atlas/landing-rights/[jurisdiction]/[category]/page.tsx`
- Create: `src/components/atlas/landing-rights/CategoryDeepDiveView.tsx`

- [ ] **Step 1: Implement `CategoryDeepDiveView.tsx`**

```tsx
// src/components/atlas/landing-rights/CategoryDeepDiveView.tsx

import type { CategoryDeepDive } from "@/data/landing-rights";
import { LastVerifiedStamp } from "./LastVerifiedStamp";

export function CategoryDeepDiveView({ entry }: { entry: CategoryDeepDive }) {
  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <header>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">
            {entry.category.replace("_", " ")}
          </span>
          <span className="text-[22px] font-bold text-gray-900">
            {entry.jurisdiction}
          </span>
        </div>
        <h1 className="text-[28px] font-light tracking-tight text-gray-900">
          {entry.title}
        </h1>
        <div className="mt-2">
          <LastVerifiedStamp date={entry.last_verified} />
        </div>
      </header>
      <p className="text-[15px] leading-relaxed text-gray-800">
        {entry.summary}
      </p>
      <section>
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 mb-3">
          Key provisions
        </h2>
        <div className="space-y-4">
          {entry.key_provisions.map((p, i) => (
            <div
              key={i}
              className="rounded-xl bg-white border border-gray-100 p-5"
            >
              <h3 className="text-[14px] font-semibold text-gray-900 mb-1">
                {p.title}
              </h3>
              <p className="text-[13px] text-gray-700 leading-relaxed">
                {p.body}
              </p>
              {p.citation && (
                <p className="mt-2 text-[11px] font-medium text-gray-500">
                  {p.citation}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>
      {entry.practical_notes && (
        <section className="rounded-xl bg-amber-50/40 border border-amber-100 p-5">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-700 mb-2">
            Practical notes
          </h2>
          <p className="text-[13px] text-amber-900 leading-relaxed">
            {entry.practical_notes}
          </p>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Implement the deep-dive `page.tsx`**

```tsx
// src/app/(atlas)/atlas/landing-rights/[jurisdiction]/[category]/page.tsx

import { notFound } from "next/navigation";
import {
  ALL_DEEP_DIVES,
  getDeepDive,
  type JurisdictionCode,
  type LandingRightsCategory,
} from "@/data/landing-rights";
import { CategoryDeepDiveView } from "@/components/atlas/landing-rights/CategoryDeepDiveView";

export function generateStaticParams() {
  return ALL_DEEP_DIVES.map((d) => ({
    jurisdiction: d.jurisdiction.toLowerCase(),
    category: d.category.replace("_", "-"),
  }));
}

export default async function Page({
  params,
}: {
  params: Promise<{ jurisdiction: string; category: string }>;
}) {
  const { jurisdiction, category } = await params;
  const code = jurisdiction.toUpperCase() as JurisdictionCode;
  const cat = category.replace("-", "_") as LandingRightsCategory;
  const entry = getDeepDive(code, cat);
  if (!entry) return notFound();
  return <CategoryDeepDiveView entry={entry} />;
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/(atlas)/atlas/landing-rights/\[jurisdiction\]/\[category\] src/components/atlas/landing-rights/CategoryDeepDiveView.tsx
git commit -m "feat(atlas): landing rights category deep-dive route"
```

---

**Continued in [Part 2 — Tasks T8–T13](./2026-04-17-atlas-landing-rights-tasks-part2.md).**
