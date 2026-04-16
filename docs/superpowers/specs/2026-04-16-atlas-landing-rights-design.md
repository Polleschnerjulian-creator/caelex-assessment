# ATLAS Landing Rights Database — Design Spec

## Goal

Build a structured landing-rights content layer inside ATLAS that covers the four categories of satellite regulatory authorisation (market access / downlink, ITU spectrum coordination, earth-station & ESIM, commercial re-entry) across 29 priority jurisdictions. The MVP is a read-only content product for lawyers and analysts — no operator-side workflow, no portfolio tracking, no ITU-filing linkage in Phase 1. Atlas consumers gain (a) a new top-level section `/atlas/landing-rights`, (b) a "Landing Rights" tab on existing jurisdiction detail pages, and (c) landing-rights results surfaced in the Atlas command-center search.

## Architecture

Extend the existing static-data pattern of Atlas. All landing-rights content lives as typed TypeScript in `src/data/landing-rights/` — one file per country profile, flat arrays per category deep-dive type. Next.js Server Components render all pages with `generateStaticParams` for zero runtime cost. Filter state is URL-query-synced for shareable links. No database models, no API routes, no admin UI. Editorial workflow is Git-based: PR → review → merge → Vercel rebuild.

## Tech Stack

- **Content storage**: TypeScript files in `src/data/landing-rights/` (existing Atlas pattern, mirrors `src/data/legal-sources/`)
- **Rendering**: Next.js 15 App Router, Server Components, `generateStaticParams`
- **Styling**: Tailwind, Atlas light-mode design tokens (existing)
- **i18n**: existing `LanguageProvider` + new `atlas.landing_rights.*` keys
- **Validation**: Zod schemas for content files, enforced in Vitest pre-commit
- **Testing**: Vitest (unit) + Playwright (E2E)
- **No new dependencies**

---

## 1. Data Model

Five TypeScript entities, all in `src/data/landing-rights/types.ts`. Optional fields explicitly typed — coverage per country is uneven and the model must tolerate that.

### `LandingRightsProfile` — one per jurisdiction

```ts
export type LandingRightsCategory =
  | "market_access"
  | "itu_coordination"
  | "earth_station"
  | "re_entry";

export type RegimeType =
  | "two_track" // telecoms + space act
  | "telecoms_only" // no space act yet
  | "space_act_only" // rare
  | "emerging"; // draft legislation in flight

export type CoverageDepth = "deep" | "standard" | "stub";

export type OperatorStatus =
  | "licensed"
  | "pending"
  | "denied"
  | "sector_limited"
  | "not_entered"
  | "unknown";

export interface LandingRightsProfile {
  jurisdiction: JurisdictionCode; // DE | FR | ... | US | IN | AE | SA | BR | JP | SG | AU | CA | ZA
  depth: CoverageDepth;
  last_verified: string; // ISO date — haftungsrelevant

  overview: {
    summary: string; // 1–3 paragraphs
    regime_type: RegimeType;
    in_force_date?: string;
    last_major_change?: string;
  };

  regulators: Array<{
    name: string;
    abbreviation: string;
    role: "primary" | "co_authority" | "security_review";
    url?: string;
  }>;

  legal_basis: Array<{
    source_id: string; // references existing LegalSource.id
    title: string;
    citation?: string;
  }>;

  fees: {
    application?: {
      min?: number;
      max?: number;
      currency: string;
      note?: string;
    };
    annual?: { min?: number; max?: number; currency: string; note?: string };
    note?: string;
  };

  timeline: {
    typical_duration_months: { min: number; max: number };
    statutory_window_days?: number;
    note?: string;
  };

  foreign_ownership: {
    cap_percent?: number | null; // null = no cap
    note?: string;
    workaround?: string; // e.g. "carrier-radio exemption (Japan)"
  };

  renewal: {
    term_years?: number;
    note?: string;
  };

  security_review: {
    required: boolean;
    authority?: string;
    framework?: string; // e.g. "Team Telecom / EO 13913"
  };

  operator_snapshots: Partial<
    Record<
      "starlink" | "kuiper" | "oneweb",
      { status: OperatorStatus; since?: string; note?: string }
    >
  >;
}
```

### `CategoryDeepDive` — one per (jurisdiction × category) where content exists

```ts
export interface CategoryDeepDive {
  jurisdiction: JurisdictionCode;
  category: LandingRightsCategory;
  title: string;
  summary: string;
  key_provisions: Array<{ title: string; body: string; citation?: string }>;
  practical_notes?: string;
  last_verified: string;
}
```

Not every jurisdiction has a deep-dive for every category. The category-tab in UI shows "Coverage pending" when absent.

### `CaseStudy` — narrative precedents

```ts
export interface CaseStudy {
  id: string; // "starlink-india-gmpcs-2021-2025"
  title: string;
  jurisdiction: JurisdictionCode;
  operator: string;
  categories: LandingRightsCategory[];
  date_range: { from: string; to?: string };
  narrative: string; // markdown
  takeaways: string[];
  outcome: "licensed" | "pending" | "denied" | "compromise";
  last_verified: string;
}
```

### `OperatorMatrixRow` — one per operator across all jurisdictions

```ts
export interface OperatorMatrixRow {
  operator: string; // "Starlink" | "Kuiper" | "OneWeb" | "SES" | ...
  statuses: Partial<
    Record<
      JurisdictionCode,
      {
        status: OperatorStatus;
        since?: string;
        note?: string;
      }
    >
  >;
  last_verified: string;
}
```

### `ConductCondition` — regulatory obligations beyond fees

```ts
export type ConductType =
  | "data_localization"
  | "lawful_intercept"
  | "geo_fencing"
  | "indigenization"
  | "suspension_capability"
  | "local_content"
  | "other";

export interface ConductCondition {
  id: string;
  jurisdiction: JurisdictionCode;
  type: ConductType;
  title: string;
  requirement: string;
  legal_source_id?: string;
  effective_date?: string;
  applies_to:
    | "all_operators"
    | "mssp"
    | "ngso"
    | "gso"
    | "gateway"
    | "specific";
  operators_affected?: string[];
  last_verified: string;
}
```

### Key model decisions

- **`depth` enum** surfaces editorial progress. Stubs get a "Limited coverage" badge in UI — readers know not to rely on them without external verification.
- **`last_verified`** per entity is mandatory. UI renders it as a stamp that turns amber after 90 days and red after 180.
- **`legal_basis.source_id`** references existing `LegalSource` entries — no content duplication between landing-rights and the existing legal-sources layer.
- **All timestamps are ISO date strings** (YYYY-MM-DD), parsed lazily at render time.

---

## 2. File Structure

Mirrors the existing `src/data/legal-sources/` pattern: one file per country profile.

```
src/data/landing-rights/
├── index.ts                              Re-exports + aggregated arrays
├── types.ts                              All TS interfaces (section 1)
├── profiles/
│   ├── _helpers.ts                       JurisdictionCode union, shared enums
│   ├── de.ts, fr.ts, uk.ts, it.ts,       19 EU/EFTA (existing Atlas jurisdictions)
│   │   lu.ts, nl.ts, be.ts, es.ts,
│   │   no.ts, se.ts, fi.ts, dk.ts,
│   │   at.ts, ch.ts, pt.ts, ie.ts,
│   │   gr.ts, cz.ts, pl.ts
│   └── us.ts, in.ts, ae.ts, sa.ts,       10 priority non-EU
│       br.ts, jp.ts, sg.ts, au.ts,
│       ca.ts, za.ts
├── category-deep-dives/
│   ├── market-access.ts                  flat array, one entry per jurisdiction where present
│   ├── itu-coordination.ts
│   ├── earth-station.ts
│   └── re-entry.ts
├── case-studies.ts                       ~10 entries (Starlink India, OneWeb-Russia, …)
├── operator-matrix.ts                    top-10 operators × 29 jurisdictions
└── conduct-conditions.ts                 ~50 entries
```

### `index.ts` public surface

```ts
export const ALL_LANDING_RIGHTS_PROFILES: LandingRightsProfile[];
export const ALL_DEEP_DIVES: CategoryDeepDive[];
export const ALL_CASE_STUDIES: CaseStudy[];
export const OPERATOR_MATRIX: OperatorMatrixRow[];
export const ALL_CONDUCT_CONDITIONS: ConductCondition[];

export function getProfile(
  code: JurisdictionCode,
): LandingRightsProfile | undefined;
export function getDeepDives(code: JurisdictionCode): CategoryDeepDive[];
export function getDeepDive(
  code: JurisdictionCode,
  category: LandingRightsCategory,
): CategoryDeepDive | undefined;
export function getCaseStudiesFor(code: JurisdictionCode): CaseStudy[];
export function getConductFor(code: JurisdictionCode): ConductCondition[];
export function getOperatorStatus(
  operator: string,
  code: JurisdictionCode,
): OperatorStatus | undefined;
```

### Rationale

- **Per-country files** (not one mega-array) → smaller Git diffs, parallel editorial work without merge conflicts, Next.js route-level code splitting.
- **Flat category-deep-dive arrays** (not nested per country) → ~60 entries across the four categories, easier to scan/edit than a `{ [code]: { [category]: ... } }` nested structure.

---

## 3. Routes

All routes are Server Components with `generateStaticParams`.

| Route                                             | Purpose                                                                                               |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `/atlas/landing-rights`                           | List view of all 29 profiles, filter sidebar, card grid / table toggle                                |
| `/atlas/landing-rights/[jurisdiction]`            | Country detail — overview, 4 category tabs, regulators, fees, timeline, conduct, related case studies |
| `/atlas/landing-rights/[jurisdiction]/[category]` | Full deep-dive for a single category                                                                  |
| `/atlas/landing-rights/case-studies`              | Case-studies list                                                                                     |
| `/atlas/landing-rights/case-studies/[id]`         | Single case study (narrative + takeaways)                                                             |
| `/atlas/landing-rights/operators`                 | Operator × jurisdiction matrix table                                                                  |
| `/atlas/landing-rights/conduct`                   | Conduct-conditionality database, sortable & filterable                                                |

### Integration points (edits, not new routes)

- **`src/app/(atlas)/atlas/AtlasShell.tsx`** — add new `MAIN_NAV` entry **"Landing Rights"** between `Jurisdictions` and `Updates`. Icon: `Ticket` from lucide-react.
- **`src/app/(atlas)/atlas/jurisdictions/[code]/page.tsx`** — add new "Landing Rights" tab (if page is already tabbed) or collapsible section above the footer, rendering `<JurisdictionProfileView embed />` with deep-link to the full page.
- **`src/app/(atlas)/atlas/page.tsx`** — extend `performSearch()` to include `ALL_LANDING_RIGHTS_PROFILES`, `ALL_CASE_STUDIES`, `ALL_CONDUCT_CONDITIONS`. New result section "Landing Rights" with three sub-buckets.
- **`src/app/(atlas)/atlas/i18n-labels.ts`** — new `atlas.landing_rights.*` namespace.

### Filter model for `/atlas/landing-rights`

URL-query synced via `useSearchParams` + `router.push`. Supported params:

- `region` (eu | efta | non-eu | all)
- `regime_type` (two_track | telecoms_only | space_act_only | emerging)
- `depth` (deep | standard | stub)
- `starlink` / `kuiper` / `oneweb` (licensed | pending | denied | sector_limited | not_entered)
- `has_foreign_cap` (yes | no)
- `security_review` (yes | no)

All filters combine via AND. Server Component reads `searchParams`, filters `ALL_LANDING_RIGHTS_PROFILES`, renders the grid. Filter UI (Client Component) pushes new query on change.

---

## 4. Components

New directory `src/components/atlas/landing-rights/`:

```
landing-rights/
├── LandingRightsList.tsx                 Grid/table toggle, integrates <LandingRightsFilters>
├── LandingRightsFilters.tsx              URL-query-synced filter sidebar
├── JurisdictionCard.tsx                  Card for grid view
├── JurisdictionProfileView.tsx           Full country detail (also embeddable on /atlas/jurisdictions/[code])
├── CategoryDeepDiveView.tsx              /[jurisdiction]/[category] page body
├── OperatorMatrixTable.tsx               Sticky-header matrix with tooltips
├── CaseStudyCard.tsx                     List-item
├── CaseStudyView.tsx                     Detail view with markdown narrative
├── ConductTable.tsx                      Sortable/filterable conditionality table
├── LandingRightsStatusBadge.tsx          Colored status dot + label
├── DepthBadge.tsx                        "Deep / Limited / Stub" pill
├── LastVerifiedStamp.tsx                 Date badge, amber >90d, red >180d
└── LandingRightsDisclaimer.tsx           Liability banner for all LR pages
```

### Shared patterns with existing Atlas

- Design language: Atlas light-mode (`bg-[#F7F8FA]`, `bg-white` cards, `rounded-xl`, `text-gray-900`). No new tokens.
- Status dot colours: `licensed`=emerald-500, `pending`=amber-500, `denied`=red-500, `sector_limited`=blue-500 striped, `not_entered`=gray-300, `unknown`=gray-200.
- Translation helpers follow existing `getTranslatedSource` / `getTranslatedAuthority` pattern in `src/data/legal-sources`.

---

## 5. Data Flow

### Read path (all user-facing reads)

```
Build time:         TS files → aggregated in index.ts
Request time:       Server Component imports getProfile(code), filters, renders
Client runtime:     Static HTML + hydration for filter UI only
```

- `generateStaticParams` pre-renders all 29 country pages + ~60 deep-dive pages + ~10 case studies at build time.
- Helper functions (`getProfile`, `getDeepDives`, etc.) are synchronous in-memory array filters — no async, no caching layer needed.
- Per-country file imports enable Next.js to code-split so a `/atlas/landing-rights/de` bundle contains only `profiles/de.ts` + referenced deep-dives, not all 29.

### Filter flow on list view

```
URL ?region=eu&depth=deep
  → Server Component reads searchParams
  → filters ALL_LANDING_RIGHTS_PROFILES
  → renders grid
<LandingRightsFilters> (Client) pushes new query
  → shallow navigation, no page reload
  → new Server render
```

Shareable, SEO-friendly, works without JS.

### Search integration on `/atlas`

`performSearch()` extended to match:

- Profiles: `overview.summary`, `regulators[].name/abbreviation`, `regulators[].name`, `jurisdiction`
- Case studies: `title`, `narrative`, `operator`, `takeaways`
- Conduct conditions: `title`, `requirement`

New fields on `SearchResults` interface:

```ts
landingRightsProfiles: LandingRightsProfile[];
landingRightsCaseStudies: CaseStudy[];
landingRightsConduct: ConductCondition[];
```

Max 10 per sub-bucket with "Show all" deep-linking to the relevant route.

### Write path (editorial)

No write path in app. Content updates are Git-based:

1. Author branches from `main`
2. Edits `src/data/landing-rights/profiles/de.ts` (or wherever)
3. Updates `last_verified` date on every touched entity
4. Opens PR → lawyer-review + approve → merge → Vercel rebuild & deploy

Phase 2 (not this spec) adds a Prisma-backed operator-tracker with admin UI for the operator-side workflow. The MVP stays pure static because (a) slow content-change frequency, (b) Git PR is a natural lawyer-review workflow, (c) no editorial tooling to build in MVP.

---

## 6. Liability, Edge Cases, Testing

### Three-layer liability mitigation

1. **`LandingRightsDisclaimer` banner** at the top of every LR page. Text from existing `atlas.disclaimer_*` i18n keys + new key `atlas.landing_rights.disclaimer_extra` ("Landing-rights regimes change frequently; verify with licensed counsel before operational decisions.").
2. **`LastVerifiedStamp` on every entity** — green <90d, amber 90–180d, red >180d. Prompts editorial refresh.
3. **`DepthBadge` stubs flagged** — "Limited coverage — not independently verified" so readers never mistake a stub for deep content.

### Edge cases

| Case                                    | Handling                                                                      |
| --------------------------------------- | ----------------------------------------------------------------------------- |
| Jurisdiction with no LR regime          | `regime_type: "telecoms_only"` + empty `legal_basis`, UI explains the absence |
| No deep-dive for (country × category)   | Category tab disabled with "Coverage pending" hint                            |
| Unknown operator status                 | `operator_snapshots.starlink = { status: "unknown", note: "..." }`            |
| Regulatory change after `last_verified` | No automation — manual. Red stamp triggers editorial review                   |
| User language not in EN/DE/FR/ES        | Fallback to EN (existing Atlas pattern)                                       |
| Zero search hits                        | Reuse existing empty state from `/atlas/page.tsx`                             |
| Invalid `[jurisdiction]` in URL         | `notFound()` → 404                                                            |
| Conflicting fees (e.g., two currencies) | `fees.note` free-text, structured min/max only for primary currency           |

### Testing

Minimal set — content feature, no complex logic.

**Unit (Vitest):**

- `landing-rights-types.test.ts` — Zod schemas validate all profile/deep-dive/case-study/conduct files at test run; prevents malformed content from shipping
- `landing-rights-search.test.ts` — `performSearch()` returns LR hits for known queries
- `landing-rights-filters.test.ts` — filter combinations over `ALL_LANDING_RIGHTS_PROFILES`

**E2E (Playwright):**

- `atlas-landing-rights.spec.ts` — navigate `/atlas/landing-rights`, apply filter, click card, see profile, click Market Access tab, see deep-dive
- `atlas-jurisdiction-integration.spec.ts` — on `/atlas/jurisdictions/de`, landing-rights tab visible and deep-links correctly

**Not tested:**

- Individual content correctness (editorial review job, not unit test)
- Bundle size (not MVP-critical)

### Performance guardrails

- `generateStaticParams` for all country + category routes
- No client JS for content rendering (filter UI only)
- `next/image` for flags
- CI bundle-budget warning if any country bundle >50 KB

---

## 7. Out of Scope (Phase 2+)

Explicitly **not** in this MVP — to be planned separately:

- **Operator portfolio tracker** — "my company's landing rights across 50 countries" with renewal calendar and milestone tracking. Requires Prisma models, org-scoped mutations, admin UI.
- **ITU-filing linkage** — cross-reference national landing rights to ITU SRS filings, BIU clocks, Resolution 35 milestones. Requires ITU data integration.
- **Regulator-change alert subscriptions** — email when a tracked jurisdiction has a regulatory change. Requires notification infrastructure.
- **National-security overlay workflow** — Team Telecom / NSIA / FIRB review submission tracking. Requires structured multi-step workflow.
- **CMS / admin UI** — editorial UI for non-engineers. MVP intentionally stays Git-based.
- **Coverage beyond 29 jurisdictions** — extended markets (China, South Korea, Indonesia, Mexico, etc.). Add on demand.

---

## 8. Migration & Rollout

No data migration — all content is new. Rollout is a single PR:

1. Types, helpers, `index.ts` skeleton
2. Seed 2–3 profile files (DE, US, IN) as editorial template
3. Routes + components + disclaimer banner
4. Atlas sidebar entry + jurisdiction-page integration + search extension
5. Remaining 26 profiles as follow-up PRs (parallel editorial work)
6. Deep-dives, case studies, operator matrix, conduct conditions as separate PRs

Phase-1 is shipped when all 29 profiles exist at ≥`standard` depth and at least 6 case studies cover the canonical operator episodes (Starlink India, OneWeb-Russia, Italy €1.5B, Viasat-Inmarsat, Kuiper FCC milestones, Starlink South Africa EEIP).

---

## 9. Success Criteria

- Lawyer evaluator: can look up Germany landing-rights regime, see regulators, fees, timeline, and foreign-ownership rules in under 30 seconds
- Operator evaluator: can filter to "licensed-in-India" for Starlink and see the 4-year narrative plus conduct conditions (lawful intercept, 20% indigenisation, NavIC mandate)
- SEO: every country and every category-deep-dive is statically pre-rendered and indexable
- Editorial: a new jurisdiction can be added with one PR touching one file under `profiles/`
- Liability: every visible entity carries a `last_verified` stamp and the disclaimer is visible above the fold on every LR page
