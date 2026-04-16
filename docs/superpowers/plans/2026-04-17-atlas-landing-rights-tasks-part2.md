# Atlas Landing Rights — Tasks T8–T13

Parent plan: [2026-04-17-atlas-landing-rights.md](./2026-04-17-atlas-landing-rights.md)
Previous: [Tasks T1–T7](./2026-04-17-atlas-landing-rights-tasks.md)

---

### Task 8: Case studies list + detail routes

**Files:**

- Create: `src/app/(atlas)/atlas/landing-rights/case-studies/page.tsx`
- Create: `src/app/(atlas)/atlas/landing-rights/case-studies/[id]/page.tsx`
- Create: `src/components/atlas/landing-rights/CaseStudyCard.tsx`
- Create: `src/components/atlas/landing-rights/CaseStudyView.tsx`

- [ ] **Step 1: Implement `CaseStudyCard.tsx`**

```tsx
// src/components/atlas/landing-rights/CaseStudyCard.tsx

import Link from "next/link";
import type { CaseStudy } from "@/data/landing-rights";

export function CaseStudyCard({ cs }: { cs: CaseStudy }) {
  return (
    <Link
      href={`/atlas/landing-rights/case-studies/${cs.id}`}
      className="flex flex-col gap-2 p-5 rounded-xl bg-white border border-gray-100 hover:border-gray-300 hover:shadow-sm transition"
    >
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-bold text-gray-900 bg-gray-100 rounded-md px-2 py-0.5">
          {cs.jurisdiction}
        </span>
        <span className="text-[11px] text-gray-500">{cs.operator}</span>
        <span className="text-[10px] uppercase tracking-wider text-gray-400">
          {cs.outcome}
        </span>
      </div>
      <h3 className="text-[15px] font-semibold text-gray-900 leading-snug">
        {cs.title}
      </h3>
      <p className="text-[11px] text-gray-500">
        {cs.date_range.from} → {cs.date_range.to ?? "ongoing"}
      </p>
    </Link>
  );
}
```

- [ ] **Step 2: Implement `CaseStudyView.tsx`**

```tsx
// src/components/atlas/landing-rights/CaseStudyView.tsx

import type { CaseStudy } from "@/data/landing-rights";
import { LastVerifiedStamp } from "./LastVerifiedStamp";

export function CaseStudyView({ cs }: { cs: CaseStudy }) {
  return (
    <article className="flex flex-col gap-6 max-w-3xl">
      <header>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[12px] font-bold text-gray-900 bg-gray-100 rounded-md px-2 py-1">
            {cs.jurisdiction}
          </span>
          <span className="text-[13px] text-gray-600">{cs.operator}</span>
          <span className="text-[11px] uppercase tracking-wider text-gray-400">
            {cs.outcome}
          </span>
        </div>
        <h1 className="text-[32px] font-light tracking-tight text-gray-900 leading-tight">
          {cs.title}
        </h1>
        <p className="mt-2 text-[12px] text-gray-500">
          {cs.date_range.from} → {cs.date_range.to ?? "ongoing"}
        </p>
        <div className="mt-2">
          <LastVerifiedStamp date={cs.last_verified} />
        </div>
      </header>

      <div className="text-[15px] leading-relaxed text-gray-800 whitespace-pre-line">
        {cs.narrative}
      </div>

      {cs.takeaways.length > 0 && (
        <section className="rounded-xl bg-emerald-50/40 border border-emerald-100 p-5">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700 mb-3">
            Takeaways
          </h2>
          <ul className="space-y-2">
            {cs.takeaways.map((t, i) => (
              <li
                key={i}
                className="text-[13px] text-emerald-900 leading-relaxed"
              >
                • {t}
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
```

- [ ] **Step 3: Implement list `page.tsx`**

```tsx
// src/app/(atlas)/atlas/landing-rights/case-studies/page.tsx

import { ALL_CASE_STUDIES } from "@/data/landing-rights";
import { CaseStudyCard } from "@/components/atlas/landing-rights/CaseStudyCard";

export const metadata = { title: "Landing Rights Case Studies — Atlas" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-[28px] font-light tracking-tight text-gray-900">
          Case Studies
        </h1>
        <p className="mt-1 text-[13px] text-gray-600">
          Narrative precedents illustrating how landing-rights regimes play out
          in practice.
        </p>
      </header>
      {ALL_CASE_STUDIES.length === 0 ? (
        <p className="text-gray-500">No case studies yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ALL_CASE_STUDIES.map((cs) => (
            <CaseStudyCard key={cs.id} cs={cs} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Implement detail `[id]/page.tsx`**

```tsx
// src/app/(atlas)/atlas/landing-rights/case-studies/[id]/page.tsx

import { notFound } from "next/navigation";
import { ALL_CASE_STUDIES } from "@/data/landing-rights";
import { CaseStudyView } from "@/components/atlas/landing-rights/CaseStudyView";

export function generateStaticParams() {
  return ALL_CASE_STUDIES.map((cs) => ({ id: cs.id }));
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cs = ALL_CASE_STUDIES.find((c) => c.id === id);
  if (!cs) return notFound();
  return <CaseStudyView cs={cs} />;
}
```

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/(atlas)/atlas/landing-rights/case-studies src/components/atlas/landing-rights/CaseStudyCard.tsx src/components/atlas/landing-rights/CaseStudyView.tsx
git commit -m "feat(atlas): landing rights case-studies routes"
```

---

### Task 9: Operator matrix + conduct conditions pages

**Files:**

- Create: `src/app/(atlas)/atlas/landing-rights/operators/page.tsx`
- Create: `src/app/(atlas)/atlas/landing-rights/conduct/page.tsx`
- Create: `src/components/atlas/landing-rights/OperatorMatrixTable.tsx`
- Create: `src/components/atlas/landing-rights/ConductTable.tsx`

- [ ] **Step 1: Implement `OperatorMatrixTable.tsx`**

```tsx
// src/components/atlas/landing-rights/OperatorMatrixTable.tsx

import {
  OPERATOR_MATRIX,
  ALL_LANDING_RIGHTS_PROFILES,
} from "@/data/landing-rights";
import { LandingRightsStatusBadge } from "./LandingRightsStatusBadge";

export function OperatorMatrixTable() {
  const jurisdictions = ALL_LANDING_RIGHTS_PROFILES.map((p) => p.jurisdiction);

  return (
    <div className="overflow-x-auto rounded-xl bg-white border border-gray-100">
      <table className="min-w-full text-[12px]">
        <thead className="bg-gray-50">
          <tr>
            <th className="sticky left-0 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-700">
              Operator
            </th>
            {jurisdictions.map((j) => (
              <th
                key={j}
                className="px-3 py-3 text-center font-semibold text-gray-600"
              >
                {j}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {OPERATOR_MATRIX.map((row) => (
            <tr key={row.operator} className="border-t border-gray-100">
              <td className="sticky left-0 bg-white px-4 py-3 font-medium text-gray-900">
                {row.operator}
              </td>
              {jurisdictions.map((j) => {
                const s = row.statuses[j];
                return (
                  <td key={j} className="px-3 py-3 text-center">
                    {s ? (
                      <span
                        title={`${s.status}${s.since ? ` since ${s.since}` : ""}${s.note ? ` — ${s.note}` : ""}`}
                      >
                        <LandingRightsStatusBadge status={s.status} />
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Implement `ConductTable.tsx`**

```tsx
// src/components/atlas/landing-rights/ConductTable.tsx

import { ALL_CONDUCT_CONDITIONS } from "@/data/landing-rights";

export function ConductTable() {
  return (
    <div className="overflow-x-auto rounded-xl bg-white border border-gray-100">
      <table className="min-w-full text-[13px]">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-gray-700">
              Jurisdiction
            </th>
            <th className="px-4 py-3 text-left font-semibold text-gray-700">
              Type
            </th>
            <th className="px-4 py-3 text-left font-semibold text-gray-700">
              Title
            </th>
            <th className="px-4 py-3 text-left font-semibold text-gray-700">
              Requirement
            </th>
            <th className="px-4 py-3 text-left font-semibold text-gray-700">
              Applies to
            </th>
          </tr>
        </thead>
        <tbody>
          {ALL_CONDUCT_CONDITIONS.map((c) => (
            <tr
              key={c.id}
              className="border-t border-gray-100 align-top hover:bg-gray-50"
            >
              <td className="px-4 py-3 font-semibold text-gray-900">
                {c.jurisdiction}
              </td>
              <td className="px-4 py-3 text-[11px] uppercase tracking-wider text-gray-600">
                {c.type.replace("_", " ")}
              </td>
              <td className="px-4 py-3 font-medium text-gray-900">{c.title}</td>
              <td className="px-4 py-3 text-gray-700 leading-relaxed max-w-md">
                {c.requirement}
              </td>
              <td className="px-4 py-3 text-[11px] uppercase tracking-wider text-gray-500">
                {c.applies_to.replace("_", " ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Implement `operators/page.tsx`**

```tsx
// src/app/(atlas)/atlas/landing-rights/operators/page.tsx

import { OperatorMatrixTable } from "@/components/atlas/landing-rights/OperatorMatrixTable";

export const metadata = { title: "Operator Matrix — Atlas Landing Rights" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-[28px] font-light tracking-tight text-gray-900">
          Operator Matrix
        </h1>
        <p className="mt-1 text-[13px] text-gray-600">
          Landing-rights status across jurisdictions for major satellite
          operators.
        </p>
      </header>
      <OperatorMatrixTable />
    </div>
  );
}
```

- [ ] **Step 4: Implement `conduct/page.tsx`**

```tsx
// src/app/(atlas)/atlas/landing-rights/conduct/page.tsx

import { ConductTable } from "@/components/atlas/landing-rights/ConductTable";

export const metadata = { title: "Conduct Conditions — Atlas Landing Rights" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-[28px] font-light tracking-tight text-gray-900">
          Conduct Conditions
        </h1>
        <p className="mt-1 text-[13px] text-gray-600">
          Regulatory obligations imposed beyond headline fees — data
          localisation, lawful intercept, geo-fencing, indigenisation,
          suspension capability.
        </p>
      </header>
      <ConductTable />
    </div>
  );
}
```

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/(atlas)/atlas/landing-rights/operators src/app/(atlas)/atlas/landing-rights/conduct src/components/atlas/landing-rights/OperatorMatrixTable.tsx src/components/atlas/landing-rights/ConductTable.tsx
git commit -m "feat(atlas): landing rights operator-matrix + conduct-conditions pages"
```

---

### Task 10: AtlasShell sidebar integration

**Files:**

- Modify: `src/app/(atlas)/atlas/AtlasShell.tsx`

- [ ] **Step 1: Add Ticket icon import and new nav entry**

Edit `src/app/(atlas)/atlas/AtlasShell.tsx`. Find the existing import:

```tsx
import { Search, BarChart3, Map, Newspaper, Settings } from "lucide-react";
```

Replace with:

```tsx
import {
  Search,
  BarChart3,
  Map,
  Ticket,
  Newspaper,
  Settings,
} from "lucide-react";
```

Find `MAIN_NAV`:

```tsx
const MAIN_NAV = [
  {
    labelKey: "atlas.search",
    href: "/atlas",
    icon: Search,
    exact: true,
  },
  { labelKey: "atlas.comparator", href: "/atlas/comparator", icon: BarChart3 },
  { labelKey: "atlas.jurisdictions", href: "/atlas/jurisdictions", icon: Map },
  { labelKey: "atlas.updates", href: "/atlas/updates", icon: Newspaper },
] as const;
```

Replace with:

```tsx
const MAIN_NAV = [
  {
    labelKey: "atlas.search",
    href: "/atlas",
    icon: Search,
    exact: true,
  },
  { labelKey: "atlas.comparator", href: "/atlas/comparator", icon: BarChart3 },
  { labelKey: "atlas.jurisdictions", href: "/atlas/jurisdictions", icon: Map },
  {
    labelKey: "atlas.landing_rights",
    href: "/atlas/landing-rights",
    icon: Ticket,
  },
  { labelKey: "atlas.updates", href: "/atlas/updates", icon: Newspaper },
] as const;
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Manual check — start dev server, visit `/atlas`**

Run: `npm run dev`
Visit: `http://localhost:3000/atlas`
Expected: sidebar shows Landing Rights entry between Jurisdictions and Updates.
Stop dev server after confirmation.

- [ ] **Step 4: Commit**

```bash
git add src/app/(atlas)/atlas/AtlasShell.tsx
git commit -m "feat(atlas): add Landing Rights to main navigation"
```

---

### Task 11: Jurisdiction page integration

**Files:**

- Modify: `src/app/(atlas)/atlas/jurisdictions/[code]/page.tsx`

- [ ] **Step 1: Read current file**

Run: `cat "src/app/(atlas)/atlas/jurisdictions/[code]/page.tsx"` — note the current structure (tabs vs plain sections).

- [ ] **Step 2: Add import + conditional Landing Rights section near the footer**

Near the top of the file, add:

```tsx
import { getProfile, type JurisdictionCode } from "@/data/landing-rights";
import { JurisdictionProfileView } from "@/components/atlas/landing-rights/JurisdictionProfileView";
import Link from "next/link";
```

Inside the page component, after the existing body content and before any footer/closing wrapper, insert:

```tsx
{
  (() => {
    const lrCode = code.toUpperCase() as JurisdictionCode;
    const lrProfile = getProfile(lrCode);
    if (!lrProfile) return null;
    return (
      <section className="mt-10 pt-8 border-t border-gray-100">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-[18px] font-semibold text-gray-900">
            Landing Rights
          </h2>
          <Link
            href={`/atlas/landing-rights/${code.toLowerCase()}`}
            className="text-[12px] text-emerald-600 hover:text-emerald-700"
          >
            Full view →
          </Link>
        </div>
        <JurisdictionProfileView profile={lrProfile} embed />
      </section>
    );
  })();
}
```

Where `code` is the existing variable holding the jurisdiction code on that page (check the current file — if the variable name differs, adapt accordingly).

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(atlas)/atlas/jurisdictions/[code]/page.tsx"
git commit -m "feat(atlas): embed Landing Rights section on jurisdiction detail pages"
```

---

### Task 12: Command-center search extension

**Files:**

- Modify: `src/app/(atlas)/atlas/page.tsx`

- [ ] **Step 1: Extend imports**

In `src/app/(atlas)/atlas/page.tsx`, add near the existing `@/data/legal-sources` imports:

```ts
import {
  ALL_LANDING_RIGHTS_PROFILES,
  ALL_CASE_STUDIES,
  ALL_CONDUCT_CONDITIONS,
  type LandingRightsProfile,
  type CaseStudy,
  type ConductCondition,
} from "@/data/landing-rights";
```

- [ ] **Step 2: Extend `SearchResults` interface**

Find the existing `interface SearchResults { ... }` and extend to:

```ts
interface SearchResults {
  jurisdictions: Array<
    [string, typeof JURISDICTION_DATA extends Map<string, infer V> ? V : never]
  >;
  sources: LegalSource[];
  authorities: Authority[];
  landingRightsProfiles: LandingRightsProfile[];
  landingRightsCaseStudies: CaseStudy[];
  landingRightsConduct: ConductCondition[];
}
```

- [ ] **Step 3: Extend `performSearch`**

In the existing `performSearch(query)` function, before the final return / empty-check, add:

```ts
const landingRightsProfiles = ALL_LANDING_RIGHTS_PROFILES.filter(
  (p) =>
    p.overview.summary.toLowerCase().includes(q) ||
    p.regulators.some(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.abbreviation.toLowerCase().includes(q),
    ) ||
    p.jurisdiction.toLowerCase() === q,
);

const landingRightsCaseStudies = ALL_CASE_STUDIES.filter(
  (cs) =>
    cs.title.toLowerCase().includes(q) ||
    cs.operator.toLowerCase().includes(q) ||
    cs.narrative.toLowerCase().includes(q),
);

const landingRightsConduct = ALL_CONDUCT_CONDITIONS.filter(
  (c) =>
    c.title.toLowerCase().includes(q) ||
    c.requirement.toLowerCase().includes(q),
);
```

Update the empty-check to:

```ts
if (
  jurisdictions.length === 0 &&
  sources.length === 0 &&
  authorities.length === 0 &&
  landingRightsProfiles.length === 0 &&
  landingRightsCaseStudies.length === 0 &&
  landingRightsConduct.length === 0
) {
  return null;
}
```

Return statement becomes:

```ts
return {
  jurisdictions,
  sources,
  authorities,
  landingRightsProfiles,
  landingRightsCaseStudies,
  landingRightsConduct,
};
```

- [ ] **Step 4: Render new result section**

After the existing Authorities `<section>` rendering block, add a new Landing Rights section. Insert before the closing `</div>` of results (the container after Authorities):

```tsx
{
  results.landingRightsProfiles.length > 0 && (
    <section>
      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-[10px] font-semibold text-gray-400 tracking-[0.2em] uppercase">
          Landing Rights — Profiles
        </h2>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {results.landingRightsProfiles.slice(0, 6).map((p) => (
          <button
            key={p.jurisdiction}
            onClick={() =>
              router.push(
                `/atlas/landing-rights/${p.jurisdiction.toLowerCase()}`,
              )
            }
            className="flex items-center gap-4 px-5 py-4 text-left rounded-xl bg-white border border-gray-100 hover:border-gray-300 transition"
          >
            <span className="text-[22px] font-bold text-gray-400 w-10">
              {p.jurisdiction}
            </span>
            <span className="text-[13px] text-gray-700 line-clamp-2 flex-1">
              {p.overview.summary}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

{
  results.landingRightsCaseStudies.length > 0 && (
    <section>
      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-[10px] font-semibold text-gray-400 tracking-[0.2em] uppercase">
          Landing Rights — Case Studies
        </h2>
      </div>
      <div className="space-y-1">
        {results.landingRightsCaseStudies.slice(0, 10).map((cs) => (
          <button
            key={cs.id}
            onClick={() =>
              router.push(`/atlas/landing-rights/case-studies/${cs.id}`)
            }
            className="w-full flex items-center gap-4 px-5 py-3 text-left rounded-xl bg-white border border-transparent hover:border-gray-200 transition"
          >
            <span className="text-[11px] font-bold text-gray-500 w-10">
              {cs.jurisdiction}
            </span>
            <span className="text-[13px] font-medium text-gray-800 flex-1">
              {cs.title}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

{
  results.landingRightsConduct.length > 0 && (
    <section>
      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-[10px] font-semibold text-gray-400 tracking-[0.2em] uppercase">
          Landing Rights — Conduct Conditions
        </h2>
      </div>
      <div className="space-y-1">
        {results.landingRightsConduct.slice(0, 10).map((c) => (
          <button
            key={c.id}
            onClick={() => router.push(`/atlas/landing-rights/conduct`)}
            className="w-full flex items-center gap-4 px-5 py-3 text-left rounded-xl bg-white border border-transparent hover:border-gray-200 transition"
          >
            <span className="text-[11px] font-bold text-gray-500 w-10">
              {c.jurisdiction}
            </span>
            <div className="flex-1">
              <span className="text-[13px] font-medium text-gray-800 block">
                {c.title}
              </span>
              <span className="text-[11px] text-gray-500">
                {c.type.replace("_", " ")}
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Update `totalResults` count**

Find:

```ts
const totalResults = hasResults
  ? results.jurisdictions.length +
    results.sources.length +
    results.authorities.length
  : 0;
```

Replace with:

```ts
const totalResults = hasResults
  ? results.jurisdictions.length +
    results.sources.length +
    results.authorities.length +
    results.landingRightsProfiles.length +
    results.landingRightsCaseStudies.length +
    results.landingRightsConduct.length
  : 0;
```

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(atlas)/atlas/page.tsx"
git commit -m "feat(atlas): extend command-center search with landing rights"
```

---

### Task 13: Playwright smoke E2E

**Files:**

- Create: `tests/e2e/atlas-landing-rights.spec.ts`

- [ ] **Step 1: Write the failing E2E test**

```ts
// tests/e2e/atlas-landing-rights.spec.ts

import { test, expect } from "@playwright/test";

test.describe("Atlas Landing Rights", () => {
  test("list page renders with seeded jurisdictions", async ({ page }) => {
    await page.goto("/atlas/landing-rights");
    await expect(
      page.getByRole("heading", { name: "Landing Rights" }),
    ).toBeVisible();
    await expect(page.getByText("DE")).toBeVisible();
    await expect(page.getByText("US")).toBeVisible();
    await expect(page.getByText("IN")).toBeVisible();
  });

  test("country detail renders regulators and categories", async ({ page }) => {
    await page.goto("/atlas/landing-rights/in");
    await expect(page.getByText("DoT")).toBeVisible();
    await expect(page.getByText("Market Access")).toBeVisible();
    await expect(page.getByText("ITU Coordination")).toBeVisible();
  });

  test("deep-dive link for IN market-access works", async ({ page }) => {
    await page.goto("/atlas/landing-rights/in/market-access");
    await expect(
      page.getByRole("heading", {
        name: /GMPCS \+ IN-SPACe \+ TRAI/i,
      }),
    ).toBeVisible();
  });

  test("case studies list shows Starlink India", async ({ page }) => {
    await page.goto("/atlas/landing-rights/case-studies");
    await expect(page.getByText(/Starlink India/)).toBeVisible();
  });

  test("operators page renders matrix", async ({ page }) => {
    await page.goto("/atlas/landing-rights/operators");
    await expect(page.getByText("Starlink")).toBeVisible();
  });

  test("conduct page lists conditions", async ({ page }) => {
    await page.goto("/atlas/landing-rights/conduct");
    await expect(page.getByText(/Lawful interception gateway/)).toBeVisible();
  });

  test("disclaimer is visible on LR pages", async ({ page }) => {
    await page.goto("/atlas/landing-rights");
    await expect(page.getByText(/change frequently/i)).toBeVisible();
  });
});
```

- [ ] **Step 2: Run the E2E (requires a dev server or build; skip if unable to start one locally — typecheck must still pass)**

Run: `npm run typecheck`
Expected: PASS (E2E will run in CI).

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/atlas-landing-rights.spec.ts
git commit -m "test(atlas): e2e smoke for landing rights routes"
```

---

## Done-criteria for the MVP PR

- All 13 tasks green (typecheck + vitest + playwright smoke pass)
- 3 profile seeds (DE/US/IN) at ≥`standard` depth
- 1 case study (Starlink India)
- 2 conduct conditions (IN lawful-intercept + IN indigenisation)
- 1 category deep-dive (IN market_access)
- Atlas sidebar updated
- Jurisdiction pages embed the LR section for DE/US/IN
- Command-center search returns LR hits

## Follow-up PRs (not this plan)

- 26 more profiles (one PR per country or batched per region)
- Deep-dives for Market Access across DE, FR, UK, IT, US
- Deep-dives for ITU Coordination, Earth Station, Re-entry
- 9 more case studies (OneWeb-Russia, Italy €1.5B, Starlink South Africa, Viasat-Inmarsat merger portfolio, Kuiper FCC milestones, Saudi 2025 approval, Brazil +7500-sat, India Starlink GMPCS (expanded), EU Space Act extraterritorial reach)
- Operator matrix: Kuiper, OneWeb/Eutelsat, SES, Viasat-Inmarsat, Intelsat, Hispasat, Telespazio, Rivada rows
- Conduct conditions: data-localisation, geo-fencing, suspension-capability entries for the other 8 priority jurisdictions
- EN/DE/FR/ES translations for all new i18n keys
