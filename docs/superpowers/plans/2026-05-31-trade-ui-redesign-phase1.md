# Trade UI Redesign — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Caelex Trade navigation (18→6 task-oriented entries + ⌘K palette) and the Home page (Action Cockpit that tells the user the next action, with a first-run onboarding for the empty workspace), on tuned Linear×Bloomberg dark tokens.

**Architecture:** Pure logic first (`pickHeroAction`, `hasAnyTradeData`) with unit tests, then presentational components (HomeHero, HomeOnboarding, MiniStatsStrip, CommandPalette) wired into a rebuilt `page.tsx`, then the slim sidebar `SECTIONS` swap + new hub launcher pages. No new DB models, no migration — Phase 1 re-presents data the page already fetches (`aggregateActionItems`, KPIs) and surfaces existing automation.

**Tech Stack:** Next.js 15 (App Router, RSC), TypeScript strict, Tailwind (`--trade-*` tokens), Vitest + React Testing Library, lucide-react, Framer Motion. ES2017 target (use `BigInt()` not `0n` if any bigint appears).

**Spec:** `docs/superpowers/specs/2026-05-31-trade-ui-redesign-phase1-design.md`

---

## Conventions (read once)

- **Branch:** `fix/trade-to-92` (already checked out).
- **Run one test file:** `CI=true npx vitest run <path>` (the runner sometimes detaches; if no readable output, rely on source-correctness + `npx tsc --noEmit`).
- **Typecheck (heap-bumped, repo OOMs otherwise):** `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`. The repo carries ~733 pre-existing errors; the gate is **no NEW errors in touched files** (diff against baseline), NOT a clean global run.
- **Commit trailer (every commit):** `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`
- **Commitlint:** subject lowercase, conventional (`feat(trade): …`, `test(trade): …`).
- **Sequential write agents only** (if subagent-driven).
- **BigInt:** ES2017 target → `BigInt(0)` never `0n` (TS2737). (Unlikely needed here.)

## Verified facts this plan is built on (confirmed by read at planning time)

`ActionItem` + aggregator (`@/lib/trade/action-inbox-aggregator`, pure, no server-only):

```ts
export type ActionSeverity = "critical" | "warning" | "info";
export type ActionKind =
  | "operation-blocked"
  | "license-expiring"
  | "euc-awaiting"
  | "party-needs-screening"
  | "vsd-deadline-approaching"
  | "vsd-needs-investigation";
export interface ActionItem {
  id: string;
  kind: ActionKind;
  severity: ActionSeverity;
  title: string;
  subtitle?: string;
  href: string;
  countdown?: string;
}
export function aggregateActionItems(input: AggregatorInput): ActionItem[]; // severity-sorted (critical→warning→info)
```

Sidebar machinery (`src/app/(trade)/trade/_components/TradeSidebar.tsx`):

```ts
interface NavItem { href: string; label: string; icon: LucideIcon; tooltip?: string;
  match?: (pathname: string) => boolean; badgeKey?: keyof SidebarBadgeCounts; }
interface NavSection { label: string; items: NavItem[]; }
const SECTIONS: ReadonlyArray<NavSection> = [ … ]   // we replace ONLY the content
```

Badge keys (`@/lib/trade/sidebar-badge-counts.server` → `SidebarBadgeCounts`): `partiesNeedingReview`, `operationsBlocked`, `licensesExpiringSoon`, `eucAwaitingAction`, `vsdOpen` (all `number`).

Home page (`src/app/(trade)/trade/page.tsx`, 703 lines, `export default async function TradeDashboardPage()`): resolves org via `resolveOrgId`, runs ~20 parallel `prisma` queries, computes `const actionItems = aggregateActionItems({...})`, renders `<CompliancePostureCard />` + `<ActionInboxPanel items={actionItems} />` + KPI tiles. The item/party/operation **counts** are already fetched (`prisma.tradeItem.count`, `prisma.tradeParty.count`, `prisma.tradeOperation.count`).

Real routes under `(trade)/trade/` (the hub/area will link to these — none deleted): `items parties operations licenses astra program settings euc reexport-consents vsd sammelgenehmigungen france-los uk-ecju faa-ast deemed-exports classify audit-center reports research`.

Existing ⌘K precedent to mirror (do NOT invent): `src/components/dashboard/v2/V2TopBar.tsx` (the "⌘K Search Caelex…" pill) + `src/hooks/useKeyboardShortcuts.ts`. Trade RTL test pattern to mirror: `src/app/(trade)/trade/operations/new/_components/VerdictPanel.test.tsx` (lucide mocked via Proxy, `render`/`screen`, `CI=true` runner caveat).

Trade theme tokens (`tailwind.config.ts` → `trade-bg-page/panel/elevated/subtle`, `trade-border[-subtle/-strong]`, `trade-text-primary/secondary/muted`, `trade-accent[-soft/-strong]`, `trade-hover`; dark values in `globals.css` `--trade-*`).

---

## File Structure

| File                                                                      | Responsibility                                                                                                                         |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/trade/home-hero.ts` (new, **pure**)                              | `pickHeroAction(items, counts) → HeroState` — selects the single "next action" (or all-clear / onboarding-needed). The only new logic. |
| `src/lib/trade/home-hero.test.ts` (new)                                   | Exhaustive unit tests for hero selection.                                                                                              |
| `src/lib/trade/has-trade-data.server.ts` (new)                            | `hasAnyTradeData(orgId)` — counts items+parties+operations → cockpit-vs-onboarding.                                                    |
| `src/lib/trade/has-trade-data.server.test.ts` (new)                       | Unit test (prisma mocked).                                                                                                             |
| `src/app/(trade)/trade/_components/HomeHero.tsx` (new, client)            | Renders a `HeroState` — gradient/glass hero + CTA.                                                                                     |
| `src/app/(trade)/trade/_components/HomeHero.test.tsx` (new)               | Component test per hero variant.                                                                                                       |
| `src/app/(trade)/trade/_components/HomeOnboarding.tsx` (new, client)      | 3-step first-run checklist.                                                                                                            |
| `src/app/(trade)/trade/_components/HomeOnboarding.test.tsx` (new)         | Component test.                                                                                                                        |
| `src/app/(trade)/trade/_components/MiniStatsStrip.tsx` (new, client)      | 4 demoted KPI tiles.                                                                                                                   |
| `src/app/(trade)/trade/_components/MiniStatsStrip.test.tsx` (new)         | Component test.                                                                                                                        |
| `src/app/(trade)/trade/_components/TradeCommandPalette.tsx` (new, client) | ⌘K palette (mirrors dashboard pattern): action+nav registry, keyboard-driven.                                                          |
| `src/app/(trade)/trade/_components/TradeCommandPalette.test.tsx` (new)    | Component test (opens on ⌘K, filters, fires route).                                                                                    |
| `src/app/(trade)/trade/_components/ActionInboxPanel.tsx` (modify)         | Restyle to dense card + coloured left border per severity (keep `items: ActionItem[]` contract).                                       |
| `src/app/(trade)/trade/_components/TradeSidebar.tsx` (modify)             | Replace `SECTIONS` content with the 6-entry structure; add ⌘K trigger.                                                                 |
| `src/app/(trade)/trade/page.tsx` (rebuild the render half)                | Cockpit-vs-onboarding switch; compose Hero + Inbox + MiniStats. Keep the data-fetch half.                                              |
| `src/app/(trade)/trade/master-data/page.tsx` (new)                        | Thin launcher → tabs linking `/trade/items` + `/trade/parties`.                                                                        |
| `src/app/(trade)/trade/documents/page.tsx` (new)                          | Thin launcher → relevance-ordered cards linking the 8 authorisation routes.                                                            |
| `src/app/globals.css` (modify)                                            | Tune the dark `--trade-*` values toward deep-black Linear/Bloomberg.                                                                   |

---

## Task 1: `pickHeroAction` pure hero-selection logic

**Files:**

- Create: `src/lib/trade/home-hero.ts`
- Test: `src/lib/trade/home-hero.test.ts`

- [ ] **Step 1: Write the failing test** — `src/lib/trade/home-hero.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { pickHeroAction, type HeroState } from "./home-hero";
import type { ActionItem } from "@/lib/trade/action-inbox-aggregator";

function item(over: Partial<ActionItem> = {}): ActionItem {
  return {
    id: "operation-blocked:op1",
    kind: "operation-blocked",
    severity: "critical",
    title: "Vorgang AV-CN-7F blockiert",
    href: "/trade/operations/op1",
    ...over,
  };
}
const emptyCounts = { items: 0, parties: 0, operations: 0 };
const someCounts = { items: 5, parties: 3, operations: 2 };

describe("pickHeroAction", () => {
  it("returns onboarding when the workspace has no data", () => {
    const r = pickHeroAction([], emptyCounts);
    expect(r.variant).toBe("onboarding");
  });

  it("returns all-clear with a New-Vorgang CTA when there is data but no actions", () => {
    const r = pickHeroAction([], someCounts);
    expect(r.variant).toBe("all-clear");
    expect(r.cta.href).toBe("/trade/operations/new");
  });

  it("surfaces the single most-critical action as the hero", () => {
    const items = [
      item({
        id: "license-expiring:l1",
        kind: "license-expiring",
        severity: "warning",
        title: "Lizenz läuft ab",
        href: "/trade/licenses/l1",
      }),
      item({
        id: "operation-blocked:op1",
        severity: "critical",
        title: "Vorgang blockiert",
        href: "/trade/operations/op1",
      }),
    ];
    const r = pickHeroAction(items, someCounts);
    expect(r.variant).toBe("action");
    expect(r.title).toBe("Vorgang blockiert");
    expect(r.cta.href).toBe("/trade/operations/op1");
  });

  it("batches when several criticals of the same kind exist (confirm-batch headline)", () => {
    const items = [
      item({ id: "operation-blocked:op1", href: "/trade/operations/op1" }),
      item({ id: "operation-blocked:op2", href: "/trade/operations/op2" }),
      item({ id: "operation-blocked:op3", href: "/trade/operations/op3" }),
    ];
    const r = pickHeroAction(items, someCounts);
    expect(r.variant).toBe("action");
    expect(r.title).toMatch(/3/);
    // batch CTA points at the list, not a single item
    expect(r.cta.href).toBe("/trade/operations");
  });

  it("prefers the soonest within the top severity (aggregator already sorts, we take the head)", () => {
    const items = [
      item({
        id: "operation-blocked:opA",
        title: "A",
        href: "/trade/operations/opA",
      }),
      item({
        id: "party-needs-screening:p1",
        kind: "party-needs-screening",
        severity: "critical",
        title: "B",
        href: "/trade/parties/p1",
      }),
    ];
    const r = pickHeroAction(items, someCounts);
    expect(r.title).toBe("A"); // head of the already-sorted list wins when kinds differ
  });
});
```

- [ ] **Step 2: Run the test, verify it FAILS** — `CI=true npx vitest run src/lib/trade/home-hero.test.ts` → FAIL (`Cannot find module './home-hero'`).

- [ ] **Step 3: Write the implementation** — `src/lib/trade/home-hero.ts`:

```ts
import type { ActionItem } from "@/lib/trade/action-inbox-aggregator";

/** Counts that decide onboarding vs cockpit. */
export interface TradeDataCounts {
  items: number;
  parties: number;
  operations: number;
}

export interface HeroCta {
  label: string;
  href: string;
}

export type HeroState =
  | { variant: "onboarding" }
  | { variant: "all-clear"; title: string; subtitle: string; cta: HeroCta }
  | {
      variant: "action";
      severity: ActionItem["severity"];
      title: string;
      subtitle: string;
      cta: HeroCta;
    };

const LIST_HREF_BY_KIND: Record<ActionItem["kind"], string> = {
  "operation-blocked": "/trade/operations",
  "license-expiring": "/trade/licenses",
  "euc-awaiting": "/trade/euc",
  "party-needs-screening": "/trade/parties",
  "vsd-deadline-approaching": "/trade/vsd",
  "vsd-needs-investigation": "/trade/vsd",
};

/**
 * Select the single "next action" for the Home hero.
 *  - no data at all → onboarding
 *  - data but no actions → all-clear (push to create the next operation)
 *  - actions present → the head of the already-severity-sorted list, OR a
 *    confirm-batch headline when ≥2 items share the top item's kind+severity.
 * Pure: no I/O.
 */
export function pickHeroAction(
  items: ReadonlyArray<ActionItem>,
  counts: TradeDataCounts,
): HeroState {
  if (items.length === 0) {
    const hasData =
      counts.items > 0 || counts.parties > 0 || counts.operations > 0;
    if (!hasData) return { variant: "onboarding" };
    return {
      variant: "all-clear",
      title: "Alles erledigt 🎉",
      subtitle: "Keine offenen Punkte. Starte den nächsten Ausfuhrvorgang.",
      cta: { label: "Neuer Vorgang", href: "/trade/operations/new" },
    };
  }

  // The aggregator already sorts critical→warning→info, soonest-first.
  const head = items[0];
  const sameBucket = items.filter(
    (i) => i.kind === head.kind && i.severity === head.severity,
  );

  if (sameBucket.length >= 2) {
    return {
      variant: "action",
      severity: head.severity,
      title: `${sameBucket.length} Punkte: ${headlineForKind(head.kind)}`,
      subtitle: "Automatisch vorbereitet — du bestätigst nur.",
      cta: { label: "Alle ansehen", href: LIST_HREF_BY_KIND[head.kind] },
    };
  }

  return {
    variant: "action",
    severity: head.severity,
    title: head.title,
    subtitle: head.subtitle ?? "Automatisch vorbereitet — du bestätigst nur.",
    cta: { label: "Öffnen", href: head.href },
  };
}

function headlineForKind(kind: ActionItem["kind"]): string {
  switch (kind) {
    case "operation-blocked":
      return "Vorgänge brauchen Aufmerksamkeit";
    case "license-expiring":
      return "Lizenzen laufen ab";
    case "euc-awaiting":
      return "End-Use-Certificates offen";
    case "party-needs-screening":
      return "Partner prüfen";
    case "vsd-deadline-approaching":
      return "VSD-Fristen nahen";
    case "vsd-needs-investigation":
      return "VSDs zu untersuchen";
  }
}
```

- [ ] **Step 4: Run the test, verify it PASSES** — `CI=true npx vitest run src/lib/trade/home-hero.test.ts` → PASS (all describe blocks).

- [ ] **Step 5: Commit**

```bash
git add src/lib/trade/home-hero.ts src/lib/trade/home-hero.test.ts
git commit -m "feat(trade): pure pickHeroAction for the home action-cockpit (ui phase 1)"
```

---

## Task 2: `hasAnyTradeData` server helper

**Files:**

- Create: `src/lib/trade/has-trade-data.server.ts`
- Test: `src/lib/trade/has-trade-data.server.test.ts`

- [ ] **Step 1: Write the failing test** — `src/lib/trade/has-trade-data.server.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tradeItem: { count: vi.fn() },
    tradeParty: { count: vi.fn() },
    tradeOperation: { count: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { hasAnyTradeData } from "./has-trade-data.server";

const items = prisma.tradeItem.count as unknown as ReturnType<typeof vi.fn>;
const parties = prisma.tradeParty.count as unknown as ReturnType<typeof vi.fn>;
const ops = prisma.tradeOperation.count as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  items.mockReset();
  parties.mockReset();
  ops.mockReset();
});

describe("hasAnyTradeData", () => {
  it("returns false when every count is zero", async () => {
    items.mockResolvedValue(0);
    parties.mockResolvedValue(0);
    ops.mockResolvedValue(0);
    expect(await hasAnyTradeData("org1")).toBe(false);
  });

  it("returns true when any count is non-zero", async () => {
    items.mockResolvedValue(0);
    parties.mockResolvedValue(2);
    ops.mockResolvedValue(0);
    expect(await hasAnyTradeData("org1")).toBe(true);
  });

  it("scopes every count to the organization", async () => {
    items.mockResolvedValue(0);
    parties.mockResolvedValue(0);
    ops.mockResolvedValue(0);
    await hasAnyTradeData("org1");
    expect(items).toHaveBeenCalledWith({ where: { organizationId: "org1" } });
    expect(parties).toHaveBeenCalledWith({ where: { organizationId: "org1" } });
    expect(ops).toHaveBeenCalledWith({ where: { organizationId: "org1" } });
  });
});
```

- [ ] **Step 2: Run the test, verify it FAILS** — `CI=true npx vitest run src/lib/trade/has-trade-data.server.test.ts` → FAIL (`Cannot find module`).

- [ ] **Step 3: Write the implementation** — `src/lib/trade/has-trade-data.server.ts`:

```ts
import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * True if the org has ANY trade master/operational data — drives the
 * cockpit-vs-onboarding switch on the Home page. Three cheap counts in
 * parallel; org-scoped.
 */
export async function hasAnyTradeData(
  organizationId: string,
): Promise<boolean> {
  const [items, parties, operations] = await Promise.all([
    prisma.tradeItem.count({ where: { organizationId } }),
    prisma.tradeParty.count({ where: { organizationId } }),
    prisma.tradeOperation.count({ where: { organizationId } }),
  ]);
  return items > 0 || parties > 0 || operations > 0;
}
```

- [ ] **Step 4: Run the test, verify it PASSES** — `CI=true npx vitest run src/lib/trade/has-trade-data.server.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/trade/has-trade-data.server.ts src/lib/trade/has-trade-data.server.test.ts
git commit -m "feat(trade): hasAnyTradeData helper for cockpit-vs-onboarding switch (ui phase 1)"
```

---

## Task 3: `HomeHero` component

**Files:**

- Create: `src/app/(trade)/trade/_components/HomeHero.tsx`
- Test: `src/app/(trade)/trade/_components/HomeHero.test.tsx`

- [ ] **Step 1: Write the failing test** — `src/app/(trade)/trade/_components/HomeHero.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock(
  "lucide-react",
  () =>
    new Proxy(
      {},
      {
        get: (_t, n: string) => {
          const I = (p: Record<string, unknown>) => (
            <span data-testid={`icon-${String(n)}`} {...p} />
          );
          I.displayName = String(n);
          return I;
        },
      },
    ),
);
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

import { HomeHero } from "./HomeHero";

describe("HomeHero", () => {
  it("renders an action hero with its CTA", () => {
    render(
      <HomeHero
        state={{
          variant: "action",
          severity: "critical",
          title: "Vorgang blockiert",
          subtitle: "du bestätigst nur",
          cta: { label: "Öffnen", href: "/trade/operations/op1" },
        }}
      />,
    );
    expect(screen.getByText("Vorgang blockiert")).toBeTruthy();
    const link = screen.getByRole("link", { name: /Öffnen/i });
    expect(link.getAttribute("href")).toBe("/trade/operations/op1");
  });

  it("renders the all-clear state", () => {
    render(
      <HomeHero
        state={{
          variant: "all-clear",
          title: "Alles erledigt 🎉",
          subtitle: "Starte den nächsten Vorgang",
          cta: { label: "Neuer Vorgang", href: "/trade/operations/new" },
        }}
      />,
    );
    expect(screen.getByText(/Alles erledigt/)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /Neuer Vorgang/i }).getAttribute("href"),
    ).toBe("/trade/operations/new");
  });

  it("renders nothing for the onboarding variant (onboarding is a separate component)", () => {
    const { container } = render(
      <HomeHero state={{ variant: "onboarding" }} />,
    );
    expect(container.textContent).toBe("");
  });
});
```

- [ ] **Step 2: Run the test, verify it FAILS** — `CI=true npx vitest run "src/app/(trade)/trade/_components/HomeHero.test.tsx"` → FAIL (`Cannot find module './HomeHero'`).

- [ ] **Step 3: Write the implementation** — `src/app/(trade)/trade/_components/HomeHero.tsx`:

```tsx
"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { HeroState } from "@/lib/trade/home-hero";

const SEVERITY_GLOW: Record<"critical" | "warning" | "info", string> = {
  critical:
    "from-red-600/90 to-rose-600/80 shadow-[0_8px_30px_rgba(220,38,38,0.35)]",
  warning:
    "from-amber-600/90 to-orange-600/80 shadow-[0_8px_30px_rgba(217,119,6,0.30)]",
  info: "from-indigo-600 to-indigo-500 shadow-[0_8px_30px_rgba(79,70,229,0.35)]",
};

export function HomeHero({ state }: { state: HeroState }) {
  // Onboarding is rendered by HomeOnboarding, not here.
  if (state.variant === "onboarding") return null;

  const gradient =
    state.variant === "action"
      ? SEVERITY_GLOW[state.severity]
      : "from-indigo-600 to-indigo-500 shadow-[0_8px_30px_rgba(79,70,229,0.35)]";

  const label = state.variant === "action" ? "Deine nächste Aktion" : "Status";

  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${gradient} px-5 py-4`}
      data-testid="home-hero"
    >
      <div className="text-[10px] font-medium uppercase tracking-wide text-white/80">
        {label}
      </div>
      <div className="mt-1 text-base font-semibold text-white">
        {state.title}
      </div>
      <div className="text-xs text-white/90">{state.subtitle}</div>
      <Link
        href={state.cta.href}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-white/90"
      >
        {state.cta.label}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
```

- [ ] **Step 4: Run the test, verify it PASSES** — `CI=true npx vitest run "src/app/(trade)/trade/_components/HomeHero.test.tsx"` → PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add "src/app/(trade)/trade/_components/HomeHero.tsx" "src/app/(trade)/trade/_components/HomeHero.test.tsx"
git commit -m "feat(trade): HomeHero next-action card (ui phase 1)"
```

---

## Task 4: `HomeOnboarding` first-run checklist

**Files:**

- Create: `src/app/(trade)/trade/_components/HomeOnboarding.tsx`
- Test: `src/app/(trade)/trade/_components/HomeOnboarding.test.tsx`

- [ ] **Step 1: Write the failing test** — `src/app/(trade)/trade/_components/HomeOnboarding.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock(
  "lucide-react",
  () =>
    new Proxy(
      {},
      {
        get: (_t, n: string) => {
          const I = (p: Record<string, unknown>) => (
            <span data-testid={`icon-${String(n)}`} {...p} />
          );
          I.displayName = String(n);
          return I;
        },
      },
    ),
);
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

import { HomeOnboarding } from "./HomeOnboarding";

describe("HomeOnboarding", () => {
  it("renders the 3-step getting-started checklist with CTAs", () => {
    render(<HomeOnboarding />);
    expect(screen.getByText(/Willkommen bei Caelex Trade/i)).toBeTruthy();
    // three steps
    expect(screen.getByText(/Was lieferst du/i)).toBeTruthy();
    expect(screen.getByText(/An wen/i)).toBeTruthy();
    expect(screen.getByText(/Darf ich liefern/i)).toBeTruthy();
    // the primary CTA points at the guided assistant
    const cta = screen.getByRole("link", {
      name: /Vorgang starten|Ersten Vorgang|Loslegen/i,
    });
    expect(cta.getAttribute("href")).toBe("/trade/operations/new");
  });
});
```

- [ ] **Step 2: Run the test, verify it FAILS** — `CI=true npx vitest run "src/app/(trade)/trade/_components/HomeOnboarding.test.tsx"` → FAIL.

- [ ] **Step 3: Write the implementation** — `src/app/(trade)/trade/_components/HomeOnboarding.tsx`:

```tsx
"use client";

import Link from "next/link";
import { Package, Users, Rocket, ArrowRight } from "lucide-react";

const STEPS = [
  {
    icon: Package,
    title: "① Was lieferst du?",
    body: "Artikel anlegen — wird automatisch klassifiziert (ECCN/USML).",
    href: "/trade/items",
  },
  {
    icon: Users,
    title: "② An wen?",
    body: "Partner anlegen — wird automatisch gegen Sanktionslisten gescreent.",
    href: "/trade/parties",
  },
  {
    icon: Rocket,
    title: "③ Darf ich liefern?",
    body: "Geführten Vorgang starten → 🟢 / 🟡 / 🔴 Urteil in einem Flow.",
    href: "/trade/operations/new",
  },
] as const;

export function HomeOnboarding() {
  return (
    <section data-testid="home-onboarding" className="space-y-5">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-500 px-6 py-5 shadow-[0_8px_30px_rgba(79,70,229,0.35)]">
        <div className="text-[10px] font-medium uppercase tracking-wide text-white/80">
          Erste Schritte
        </div>
        <div className="mt-1 text-lg font-semibold text-white">
          Willkommen bei Caelex Trade 👋
        </div>
        <div className="text-sm text-white/90">
          Lass uns deinen ersten Ausfuhrvorgang prüfen — in drei Schritten.
        </div>
      </div>

      <ol className="space-y-2">
        {STEPS.map((s) => (
          <li key={s.title}>
            <Link
              href={s.href}
              className="flex items-center gap-3 rounded-lg border border-trade-border bg-trade-bg-panel px-4 py-3 transition hover:bg-trade-hover"
            >
              <s.icon className="h-5 w-5 text-trade-accent" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-trade-text-primary">
                  {s.title}
                </div>
                <div className="text-xs text-trade-text-muted">{s.body}</div>
              </div>
              <ArrowRight className="h-4 w-4 text-trade-text-muted" />
            </Link>
          </li>
        ))}
      </ol>

      <Link
        href="/trade/operations/new"
        className="inline-flex items-center gap-2 rounded-lg bg-trade-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-trade-accent-strong"
      >
        Ersten Vorgang starten
        <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
}
```

- [ ] **Step 4: Run the test, verify it PASSES** — `CI=true npx vitest run "src/app/(trade)/trade/_components/HomeOnboarding.test.tsx"` → PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(trade)/trade/_components/HomeOnboarding.tsx" "src/app/(trade)/trade/_components/HomeOnboarding.test.tsx"
git commit -m "feat(trade): HomeOnboarding first-run checklist for the empty workspace (ui phase 1)"
```

---

## Task 5: `MiniStatsStrip` component

**Files:**

- Create: `src/app/(trade)/trade/_components/MiniStatsStrip.tsx`
- Test: `src/app/(trade)/trade/_components/MiniStatsStrip.test.tsx`

- [ ] **Step 1: Write the failing test** — `src/app/(trade)/trade/_components/MiniStatsStrip.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock(
  "lucide-react",
  () =>
    new Proxy(
      {},
      {
        get: (_t, n: string) => {
          const I = (p: Record<string, unknown>) => (
            <span data-testid={`icon-${String(n)}`} {...p} />
          );
          I.displayName = String(n);
          return I;
        },
      },
    ),
);

import { MiniStatsStrip } from "./MiniStatsStrip";

describe("MiniStatsStrip", () => {
  it("renders the four stat tiles with their values", () => {
    render(
      <MiniStatsStrip
        stats={[
          { label: "Vorgänge aktiv", value: "12" },
          { label: "Compliance", value: "94%" },
          { label: "Artikel", value: "142" },
          { label: "Regime aktiv", value: "16" },
        ]}
      />,
    );
    expect(screen.getByText("12")).toBeTruthy();
    expect(screen.getByText("94%")).toBeTruthy();
    expect(screen.getByText("Artikel")).toBeTruthy();
    expect(screen.getByText("Regime aktiv")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test, verify it FAILS** — `CI=true npx vitest run "src/app/(trade)/trade/_components/MiniStatsStrip.test.tsx"` → FAIL.

- [ ] **Step 3: Write the implementation** — `src/app/(trade)/trade/_components/MiniStatsStrip.tsx`:

```tsx
"use client";

export interface MiniStat {
  label: string;
  value: string;
  accent?: "default" | "success";
}

export function MiniStatsStrip({ stats }: { stats: MiniStat[] }) {
  return (
    <div className="flex gap-2" data-testid="mini-stats">
      {stats.map((s) => (
        <div
          key={s.label}
          className="flex-1 rounded-lg border border-trade-border-subtle bg-trade-bg-panel px-3 py-2.5 text-center"
        >
          <div
            className={`text-lg font-semibold ${s.accent === "success" ? "text-green-500" : "text-trade-text-primary"}`}
          >
            {s.value}
          </div>
          <div className="text-[10px] text-trade-text-muted">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run the test, verify it PASSES** — `CI=true npx vitest run "src/app/(trade)/trade/_components/MiniStatsStrip.test.tsx"` → PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(trade)/trade/_components/MiniStatsStrip.tsx" "src/app/(trade)/trade/_components/MiniStatsStrip.test.tsx"
git commit -m "feat(trade): MiniStatsStrip demoted kpi tiles (ui phase 1)"
```

---

## Task 6: `TradeCommandPalette` (⌘K)

**Files:**

- Create: `src/app/(trade)/trade/_components/TradeCommandPalette.tsx`
- Test: `src/app/(trade)/trade/_components/TradeCommandPalette.test.tsx`

A self-contained client component: a button-pill that opens a modal list of actions+routes; ⌘K toggles it; typing filters; Enter/click navigates. Mirrors the dashboard ⌘K pattern but is self-contained (no shared dependency) to keep Phase 1 isolated.

- [ ] **Step 1: Write the failing test** — `src/app/(trade)/trade/_components/TradeCommandPalette.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock(
  "lucide-react",
  () =>
    new Proxy(
      {},
      {
        get: (_t, n: string) => {
          const I = (p: Record<string, unknown>) => (
            <span data-testid={`icon-${String(n)}`} {...p} />
          );
          I.displayName = String(n);
          return I;
        },
      },
    ),
);

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { TradeCommandPalette } from "./TradeCommandPalette";

beforeEach(() => push.mockReset());

describe("TradeCommandPalette", () => {
  it("is closed initially (pill visible, list hidden)", () => {
    render(<TradeCommandPalette />);
    expect(screen.getByTestId("cmdk-pill")).toBeTruthy();
    expect(screen.queryByTestId("cmdk-list")).toBeNull();
  });

  it("opens on ⌘K and lists actions", () => {
    render(<TradeCommandPalette />);
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    expect(screen.getByTestId("cmdk-list")).toBeTruthy();
    expect(screen.getByText(/Neuer Vorgang/i)).toBeTruthy();
  });

  it("filters by typed query", () => {
    render(<TradeCommandPalette />);
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    fireEvent.change(screen.getByTestId("cmdk-input"), {
      target: { value: "screen" },
    });
    expect(screen.getByText(/Partner screenen/i)).toBeTruthy();
    expect(screen.queryByText(/Neuer Vorgang/i)).toBeNull();
  });

  it("navigates on selecting an action", () => {
    render(<TradeCommandPalette />);
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    fireEvent.click(screen.getByText(/Neuer Vorgang/i));
    expect(push).toHaveBeenCalledWith("/trade/operations/new");
  });
});
```

- [ ] **Step 2: Run the test, verify it FAILS** — `CI=true npx vitest run "src/app/(trade)/trade/_components/TradeCommandPalette.test.tsx"` → FAIL.

- [ ] **Step 3: Write the implementation** — `src/app/(trade)/trade/_components/TradeCommandPalette.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

interface Command {
  label: string;
  href: string;
  keywords?: string;
}

const COMMANDS: Command[] = [
  {
    label: "Neuer Vorgang",
    href: "/trade/operations/new",
    keywords: "ausfuhr export anlegen",
  },
  {
    label: "Partner screenen",
    href: "/trade/parties",
    keywords: "counterparty sanktion screening",
  },
  {
    label: "Artikel klassifizieren",
    href: "/trade/items",
    keywords: "classify eccn usml item",
  },
  {
    label: "Pipeline öffnen",
    href: "/trade/operations",
    keywords: "vorgänge operations",
  },
  { label: "Lizenzen", href: "/trade/licenses", keywords: "license bafa" },
  {
    label: "Dokumente",
    href: "/trade/documents",
    keywords: "euc vsd genehmigung",
  },
  {
    label: "Astra fragen",
    href: "/trade/astra",
    keywords: "ai assistent frage",
  },
  {
    label: "Compliance-Programm",
    href: "/trade/program",
    keywords: "icp programm",
  },
  {
    label: "Einstellungen",
    href: "/trade/settings",
    keywords: "settings konfiguration",
  },
];

export function TradeCommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COMMANDS;
    return COMMANDS.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        (c.keywords ?? "").toLowerCase().includes(q),
    );
  }, [query]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery("");
      router.push(href);
    },
    [router],
  );

  return (
    <>
      <button
        data-testid="cmdk-pill"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-trade-border bg-trade-bg-elevated px-3 py-1.5 text-xs text-trade-text-muted transition hover:bg-trade-hover"
      >
        <Search className="h-3.5 w-3.5" />
        <span>⌘K&nbsp;&nbsp;Suchen oder Aktion…</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[15vh]"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-xl border border-trade-border bg-trade-bg-panel shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              data-testid="cmdk-input"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Was willst du tun?"
              className="w-full border-b border-trade-border bg-transparent px-4 py-3 text-sm text-trade-text-primary outline-none"
            />
            <ul
              data-testid="cmdk-list"
              className="max-h-80 overflow-y-auto py-1"
            >
              {results.map((c) => (
                <li key={c.href}>
                  <button
                    onClick={() => go(c.href)}
                    className="flex w-full items-center px-4 py-2.5 text-left text-sm text-trade-text-primary transition hover:bg-trade-hover"
                  >
                    {c.label}
                  </button>
                </li>
              ))}
              {results.length === 0 && (
                <li className="px-4 py-3 text-sm text-trade-text-muted">
                  Keine Treffer
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 4: Run the test, verify it PASSES** — `CI=true npx vitest run "src/app/(trade)/trade/_components/TradeCommandPalette.test.tsx"` → PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add "src/app/(trade)/trade/_components/TradeCommandPalette.tsx" "src/app/(trade)/trade/_components/TradeCommandPalette.test.tsx"
git commit -m "feat(trade): ⌘K command palette (ui phase 1)"
```

---

## Task 7: Slim sidebar — replace `SECTIONS` with 6 entries

**Files:**

- Modify: `src/app/(trade)/trade/_components/TradeSidebar.tsx`

- [ ] **Step 1: Read the file** to confirm the imported icons + the exact `SECTIONS` block boundaries (it spans from `const SECTIONS: ReadonlyArray<NavSection> = [` to its closing `];`). Note which lucide icons are already imported (Inbox, Sparkles, Package, Users, Workflow, FileCheck, …).

- [ ] **Step 2: Replace the `SECTIONS` array** with this 6-entry structure (keep every surrounding line — imports, the `NavItem`/`NavSection` interfaces, the render code — untouched). Ensure each icon used is imported from `lucide-react`; add any missing (`Home`, `FileText`, `ShieldCheck`, `Settings`, `Boxes`):

```ts
const SECTIONS: ReadonlyArray<NavSection> = [
  {
    label: "Start",
    items: [
      {
        href: "/trade",
        label: "Home",
        icon: Home,
        match: (p) => p === "/trade",
        tooltip: "Deine Schaltzentrale — was als Nächstes zu tun ist.",
      },
      {
        href: "/trade/astra",
        label: "Astra",
        icon: Sparkles,
        match: (p) => p.startsWith("/trade/astra"),
        tooltip: "Frag einfach — KI-Assistent für Export-Compliance.",
      },
    ],
  },
  {
    label: "Arbeit",
    items: [
      {
        href: "/trade/operations",
        label: "Vorgänge",
        icon: Workflow,
        match: (p) => p.startsWith("/trade/operations"),
        tooltip:
          "Ausfuhrvorgänge: Was? An wen? Wohin? → ein Urteil. + Pipeline + Lizenzen.",
        badgeKey: "operationsBlocked",
      },
      {
        href: "/trade/master-data",
        label: "Stammdaten",
        icon: Boxes,
        match: (p) =>
          p.startsWith("/trade/master-data") ||
          p.startsWith("/trade/items") ||
          p.startsWith("/trade/parties"),
        tooltip: "Artikel & Partner — automatisch klassifiziert & gescreent.",
        badgeKey: "partiesNeedingReview",
      },
      {
        href: "/trade/documents",
        label: "Dokumente",
        icon: FileText,
        match: (p) => p.startsWith("/trade/documents"),
        tooltip: "Alle Genehmigungen & Nachweise an einem Ort.",
        badgeKey: "eucAwaitingAction",
      },
    ],
  },
  {
    label: "Mehr",
    items: [
      {
        href: "/trade/program",
        label: "Compliance-Programm",
        icon: ShieldCheck,
        match: (p) => p.startsWith("/trade/program"),
        tooltip: "Dein ICP, Abdeckung & Regelwerk.",
      },
      {
        href: "/trade/settings",
        label: "Einstellungen",
        icon: Settings,
        match: (p) => p.startsWith("/trade/settings"),
        tooltip: "Organisation, BAFA-Profil, Mitglieder.",
      },
    ],
  },
];
```

- [ ] **Step 3: Typecheck** — `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit 2>&1 | grep TradeSidebar` → no new errors (every icon imported, `badgeKey`s are valid `SidebarBadgeCounts` keys).

- [ ] **Step 4: Smoke the sidebar test if one exists** — `CI=true npx vitest run "src/app/(trade)/trade/_components" 2>&1 | tail -5`. If a `TradeSidebar.test.tsx` exists and asserted the OLD labels, update it to the new ones.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(trade)/trade/_components/TradeSidebar.tsx"
git commit -m "feat(trade): slim sidebar to 6 task-oriented entries (ui phase 1)"
```

---

## Task 8: Hub launcher pages — `master-data` + `documents`

**Files:**

- Create: `src/app/(trade)/trade/master-data/page.tsx`
- Create: `src/app/(trade)/trade/documents/page.tsx`

- [ ] **Step 1: Write `master-data/page.tsx`** (a thin launcher with two cards linking the existing routes):

```tsx
import Link from "next/link";
import { Package, Users } from "lucide-react";

export const metadata = { title: "Stammdaten — Caelex Trade" };

const AREAS = [
  {
    icon: Package,
    label: "Artikel",
    body: "BoM-Positionen mit Multi-Jurisdiktions-Klassifizierung (ECCN/USML/AL).",
    href: "/trade/items",
  },
  {
    icon: Users,
    label: "Partner",
    body: "Kunden, Lieferanten — gescreent gegen OFAC/BIS/EU/UN/UK.",
    href: "/trade/parties",
  },
];

export default function MasterDataPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-xl font-semibold text-trade-text-primary">
        Stammdaten
      </h1>
      <p className="mt-1 text-sm text-trade-text-muted">
        Artikel & Partner — die Basis jedes Vorgangs.
      </p>
      <div className="mt-6 grid grid-cols-2 gap-4">
        {AREAS.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="rounded-xl border border-trade-border bg-trade-bg-panel p-5 transition hover:bg-trade-hover"
          >
            <a.icon className="h-6 w-6 text-trade-accent" />
            <div className="mt-3 text-base font-medium text-trade-text-primary">
              {a.label}
            </div>
            <div className="mt-1 text-xs text-trade-text-muted">{a.body}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write `documents/page.tsx`** (a relevance-ordered launcher for the authorisation types — links the existing leaf routes):

```tsx
import Link from "next/link";
import {
  FileCheck,
  RefreshCw,
  AlertOctagon,
  Layers,
  FileText,
  ShieldCheck,
  Rocket,
  UserCheck,
} from "lucide-react";

export const metadata = { title: "Dokumente — Caelex Trade" };

const DOC_TYPES = [
  {
    icon: FileCheck,
    label: "End-Use Certificates",
    body: "EUC anfordern & gegenzeichnen lassen.",
    href: "/trade/euc",
  },
  {
    icon: RefreshCw,
    label: "Re-Export Consents",
    body: "Zustimmungen für Re-Exporte.",
    href: "/trade/reexport-consents",
  },
  {
    icon: AlertOctagon,
    label: "Voluntary Self-Disclosures",
    body: "Selbstanzeigen bei BAFA/BIS.",
    href: "/trade/vsd",
  },
  {
    icon: Layers,
    label: "Sammelgenehmigungen",
    body: "BAFA-Sammelausfuhrgenehmigungen & Kapazität.",
    href: "/trade/sammelgenehmigungen",
  },
  {
    icon: FileText,
    label: "France LOS",
    body: "Licence d'exportation (Frankreich).",
    href: "/trade/france-los",
  },
  {
    icon: ShieldCheck,
    label: "UK ECJU",
    body: "UK Strategic Export Licences (OIEL/SIEL).",
    href: "/trade/uk-ecju",
  },
  {
    icon: Rocket,
    label: "FAA AST",
    body: "US Launch/Re-entry licensing (Part 450).",
    href: "/trade/faa-ast",
  },
  {
    icon: UserCheck,
    label: "Deemed Exports",
    body: "Technologie-Zugang ausländischer Mitarbeiter.",
    href: "/trade/deemed-exports",
  },
];

export default function DocumentsPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="text-xl font-semibold text-trade-text-primary">
        Dokumente
      </h1>
      <p className="mt-1 text-sm text-trade-text-muted">
        Alle Genehmigungen & Nachweise an einem Ort. Was du nicht brauchst,
        blendest du später aus.
      </p>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
        {DOC_TYPES.map((d) => (
          <Link
            key={d.href}
            href={d.href}
            className="rounded-xl border border-trade-border bg-trade-bg-panel p-4 transition hover:bg-trade-hover"
          >
            <d.icon className="h-5 w-5 text-trade-accent" />
            <div className="mt-2 text-sm font-medium text-trade-text-primary">
              {d.label}
            </div>
            <div className="mt-0.5 text-xs text-trade-text-muted">{d.body}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck** — `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit 2>&1 | grep -E "master-data|documents/page"` → no new errors. Confirm every icon is exported by `lucide-react` (Boxes, AlertOctagon, Layers, UserCheck exist; if any name errors, swap to a verified lucide icon).

- [ ] **Step 4: Commit**

```bash
git add "src/app/(trade)/trade/master-data/page.tsx" "src/app/(trade)/trade/documents/page.tsx"
git commit -m "feat(trade): master-data + documents hub launcher pages (ui phase 1)"
```

---

## Task 9: Restyle `ActionInboxPanel` (dense card + severity border)

**Files:**

- Modify: `src/app/(trade)/trade/_components/ActionInboxPanel.tsx`

- [ ] **Step 1: Read the file** — note its props (`items: ActionItem[]`) and current markup. Keep the `items` contract and any existing test IDs/aria.

- [ ] **Step 2: Restyle each row** to a dense card with a coloured left border keyed off `item.severity` (critical→red, warning→amber, info→indigo). Each row stays a `Link` to `item.href`, shows `title`, optional `subtitle`, optional `countdown`. Use the trade tokens (`bg-trade-bg-panel`, `text-trade-text-*`, `border-trade-border`). Add a per-severity left border, e.g.:

```tsx
const SEVERITY_BORDER: Record<"critical" | "warning" | "info", string> = {
  critical: "border-l-red-500",
  warning: "border-l-amber-500",
  info: "border-l-indigo-500",
};
// each row: className={`flex items-start gap-3 rounded-lg border border-trade-border border-l-[3px] ${SEVERITY_BORDER[item.severity]} bg-trade-bg-panel px-4 py-3 transition hover:bg-trade-hover`}
```

Preserve the existing section heading + empty-state. If there's an existing empty-state, keep it but reword to the encouraging "Keine offenen Punkte — alles erledigt." Do NOT change the data contract.

- [ ] **Step 3: Run its test if present** — `CI=true npx vitest run "src/app/(trade)/trade/_components/ActionInboxPanel.test.tsx" 2>&1 | tail -5` (if the file exists). If a test asserts old class names, update only the class assertions; keep behavioral assertions.

- [ ] **Step 4: Typecheck** — `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit 2>&1 | grep ActionInboxPanel` → no new errors.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(trade)/trade/_components/ActionInboxPanel.tsx"
git commit -m "feat(trade): restyle action inbox to dense severity-bordered cards (ui phase 1)"
```

---

## Task 10: Rebuild the Home page render (cockpit vs onboarding)

**Files:**

- Modify: `src/app/(trade)/trade/page.tsx`

Keep the entire data-fetch half (the org resolution + ~20 parallel queries + `const actionItems = aggregateActionItems({...})`). Replace only the `return (...)` render half + add the onboarding switch.

- [ ] **Step 1: Read** the current `page.tsx`. The confirmed variable names (from the `Promise.all` destructure ~line 78) are: **`itemsCount`**, **`partiesTotal`**, **`operationsTotal`**, `licensesActiveCount`, `org` (with `org?.name`), and `actionItems` (= `aggregateActionItems({...})`). The render boundary is `return (`. The page currently renders `<WorkspaceHeader orgName={org?.name ?? "your workspace"} />` + a KPI tiles component + `<CompliancePostureCard />` + `<ActionInboxPanel items={actionItems} />`.

- [ ] **Step 2: Add imports** at the top (alongside the existing imports):

```tsx
import { hasAnyTradeData } from "@/lib/trade/has-trade-data.server";
import { pickHeroAction } from "@/lib/trade/home-hero";
import { HomeHero } from "./_components/HomeHero";
import { HomeOnboarding } from "./_components/HomeOnboarding";
import { MiniStatsStrip } from "./_components/MiniStatsStrip";
import { TradeCommandPalette } from "./_components/TradeCommandPalette";
```

- [ ] **Step 3: Compute the hero + onboarding flags** right after `const actionItems = aggregateActionItems({...})`, using the confirmed names `itemsCount` / `partiesTotal` / `operationsTotal`:

```tsx
const counts = {
  items: itemsCount,
  parties: partiesTotal,
  operations: operationsTotal,
};
const heroState = pickHeroAction(actionItems, counts);
const showOnboarding = heroState.variant === "onboarding";
const miniStats = [
  { label: "Vorgänge aktiv", value: String(operationsTotal) },
  { label: "Artikel", value: String(itemsCount) },
  { label: "Partner", value: String(partiesTotal) },
  { label: "Regime aktiv", value: "16" },
];
```

(Note: `pickHeroAction` decides onboarding purely from the counts being all-zero, so this matches `hasAnyTradeData` semantically; we don't need a separate DB round-trip on the Home page — the counts are already fetched. `hasAnyTradeData` from Task 2 exists for any OTHER caller that needs the check without the full page fetch.)

- [ ] **Step 4: Replace the `return (...)` render** with the cockpit/onboarding layout. Keep the outer page container/classes the file already uses; swap the inner content:

```tsx
return (
  <div className="mx-auto max-w-4xl px-6 py-8">
    <div className="flex items-start justify-between">
      <div>
        <div className="text-xs text-trade-text-muted">
          {new Date().toLocaleDateString("de-DE", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}{" "}
          · {org?.name ?? "Workspace"}
        </div>
        <h1 className="mt-1 text-2xl font-semibold text-trade-text-primary">
          {showOnboarding ? "Willkommen 👋" : "Guten Tag 👋"}
        </h1>
      </div>
      <TradeCommandPalette />
    </div>

    {showOnboarding ? (
      <div className="mt-6">
        <HomeOnboarding />
      </div>
    ) : (
      <div className="mt-6 space-y-6">
        <HomeHero state={heroState} />
        <ActionInboxPanel items={actionItems} />
        <MiniStatsStrip stats={miniStats} />
      </div>
    )}
  </div>
);
```

(Use the real `orgName` variable if present; if the page doesn't already have the org name, drop that span — do not invent a query.)

- [ ] **Step 5: Typecheck** — `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit 2>&1 | grep "trade/page"` → no new errors. (If the removed `CompliancePostureCard`/old KPI imports are now unused, delete those import lines to avoid `no-unused-vars`.)

- [ ] **Step 6: Run the trade home/component suite** — `CI=true npx vitest run "src/app/(trade)/trade/_components" src/lib/trade/home-hero.test.ts src/lib/trade/has-trade-data.server.test.ts 2>&1 | tail -6`.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(trade)/trade/page.tsx"
git commit -m "feat(trade): rebuild home as the action cockpit with onboarding switch (ui phase 1)"
```

---

## Task 11: Tune the Linear×Bloomberg dark tokens

**Files:**

- Modify: `src/app/globals.css`

- [ ] **Step 1: Find the dark `--trade-*` block** — `rg -n "trade-bg-page|trade-bg-panel|trade-accent" src/app/globals.css`. There is a light block (~line 4766) and a dark block (the `.dark`/`[data-trade-theme="dark"]` scope). Edit ONLY the dark values.

- [ ] **Step 2: Tune the dark values** toward deep-black Linear/Bloomberg (keep the indigo accent). Set:

```css
--trade-bg-page: #08080c;
--trade-bg-panel: #0c0c11;
--trade-bg-elevated: #14141b;
--trade-bg-subtle: #101016;
--trade-border: #1c1c24;
--trade-border-subtle: #16161c;
--trade-border-strong: #2a2a35;
--trade-text-primary: #fafafa;
--trade-text-secondary: #a1a1aa;
--trade-text-muted: #52525b;
--trade-accent: #6366f1;
--trade-accent-soft: rgba(99, 102, 241, 0.14);
--trade-accent-strong: #4f46e5;
--trade-hover: #14141b;
```

Match the exact property names already present in the dark block — only change values, don't add/rename properties.

- [ ] **Step 3: Visual sanity** — `npm run dev` is not required for the gate; confirm no CSS syntax error via `npx eslint src/app/globals.css 2>&1 | tail -3` (or skip if globals.css isn't linted) and that the values are valid hex/rgba. The real check is the running app (reference: the brainstorm mockups).

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(trade): tune dark trade tokens to the linear×bloomberg palette (ui phase 1)"
```

---

## Task 12: Full-feature verification

**Files:** none.

- [ ] **Step 1: Run the whole Phase-1 test set**

```bash
CI=true npx vitest run \
  src/lib/trade/home-hero.test.ts \
  src/lib/trade/has-trade-data.server.test.ts \
  "src/app/(trade)/trade/_components/HomeHero.test.tsx" \
  "src/app/(trade)/trade/_components/HomeOnboarding.test.tsx" \
  "src/app/(trade)/trade/_components/MiniStatsStrip.test.tsx" \
  "src/app/(trade)/trade/_components/TradeCommandPalette.test.tsx" 2>&1 | tail -8
```

Expected: ALL green. (If the runner detaches with no output, run each file individually.)

- [ ] **Step 2: Scoped typecheck** — `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit > /tmp/tsc-p1.txt 2>&1; grep -E "home-hero|has-trade-data|HomeHero|HomeOnboarding|MiniStats|CommandPalette|trade/page|master-data|documents/page|TradeSidebar|ActionInboxPanel" /tmp/tsc-p1.txt | grep -v "\.test\."` → empty (no new source errors). Confirm total error count is ≤ the 733 baseline.

- [ ] **Step 3: Lint touched files**

```bash
npx eslint \
  src/lib/trade/home-hero.ts src/lib/trade/has-trade-data.server.ts \
  "src/app/(trade)/trade/_components/HomeHero.tsx" \
  "src/app/(trade)/trade/_components/HomeOnboarding.tsx" \
  "src/app/(trade)/trade/_components/MiniStatsStrip.tsx" \
  "src/app/(trade)/trade/_components/TradeCommandPalette.tsx" \
  "src/app/(trade)/trade/_components/TradeSidebar.tsx" \
  "src/app/(trade)/trade/_components/ActionInboxPanel.tsx" \
  "src/app/(trade)/trade/page.tsx" \
  "src/app/(trade)/trade/master-data/page.tsx" \
  "src/app/(trade)/trade/documents/page.tsx" 2>&1 | tail -10
```

Expected: clean (fix any warnings introduced).

- [ ] **Step 4: Final commit if anything was adjusted**

```bash
git add -A && git commit -m "test(trade): verify ui redesign phase 1 end-to-end" || echo "nothing to commit"
```

---

## Phase-1 scoping notes (faithful to the spec)

- **No new DB / migration.** Everything reads data the page already fetches; `hasAnyTradeData` adds 3 cheap counts (could later be derived from the existing counts to save the round-trip — kept separate here for a clean, testable unit).
- **No leaf route deleted.** The hubs link to the existing `/trade/{euc,vsd,…}` pages; only the _sidebar_ stops listing each one.
- **`pickHeroAction` is the only new logic.** Everything else is presentation + a token swap → risk lives in one unit-tested pure function.
- **Deep restyle of Items/Parties/Pipeline/Licenses internals + smart Documents filtering = Phase 3; flow polish = Phase 2.**

## Deliberately NOT in Phase 1 (YAGNI)

Restyling the deep data tables, smart-filtering the Documents hub by the org's destinations, end-to-end flow polish, deep ⌘K search across entities, any new automation engine. Phase 1 only re-presents what exists.
