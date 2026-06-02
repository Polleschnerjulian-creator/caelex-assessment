# Trade UI Redesign — Phase 3C Implementation Plan (Screening Batch-Triage)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a dedicated `/trade/screening` triage surface built on the Phase-3A `TradeTable<T>` primitive — an urgency-ordered queue of parties needing sanctions triage, batch **re-screen** (reusing `screenParty()`, zero external cost), bulk false-positive dismiss, and a guided per-party **resolution drawer** that drives the existing `decide` state machine (`POTENTIAL_MATCH → CLEAR / CONFIRMED_HIT(block)`). Plus a sidebar entry reusing the existing `partiesNeedingReview` badge.

**Architecture:** One pure node-tested module (`screening-triage.ts` — queue derivation + urgency order + resolution-reason validation + bulk-dismiss eligibility), one additive batch route (`screen-batch` — sequential `screenParty()` loop, identical to the stale-rescreen cron), and gated UI (page + table + drawer + promoted `ScreeningBadge`). **No Prisma migration, no engine change, no decide-route change, no new dependency.**

**Tech Stack:** Next.js 15 / React / TypeScript, Tailwind `--trade-*` tokens, lucide-react, Vitest (node for the pure module + the route; jsdom hangs on this machine, so component correctness is gated by `tsc --noEmit` + `npm run lint` + source review — same as Phases 1/2/3A). German UI strings. Commitlint: **lowercase** subjects.

**Branch:** `fix/trade-to-92`. Commit locally per task; deploy the whole batch at the end (Task 8) per the batched-deploy policy.

**Verified facts (trust these — already read from the codebase):**

- `screenParty(partyId, { scoreThreshold?, systemDecisionUserId? }): Promise<ScreenPartyResult>` (`src/lib/comply-v2/trade/screening/screen-party.server.ts`) — in-memory Jaro-Winkler against cached `allLatestSnapshots()`, inserts a `TradeScreeningResult`, updates `party.screeningStatus`+`lastScreenedAt` atomically. **Zero external cost.** `ScreenPartyResult.summary = { hitCount, topScore, decision, cascadeHit, ... }`. Already looped sequentially by `src/app/api/cron/trade-rescreen-stale/route.ts` (`try/catch` per item, never aborts).
- Score bands (`fuzzy-match.ts`): `SCORE_CONFIRMED_HIT = 0.95`, `SCORE_POTENTIAL_MATCH = 0.85`, `SCORE_WEAK_MATCH = 0.75`. `classifyScore(score)` → `"confirmed"|"potential"|"weak"|"none"`. `FuzzyHit = { entryId; score; matchedFields: string[] }`, persisted as `{ ...FuzzyHit, list }`.
- Decide route `POST /api/trade/parties/[id]/screenings/[screeningId]/decide`: body `{ decision: "CONFIRMED_HIT"|"FALSE_POSITIVE_DISMISSED", notes: string(1..2000) }`; org-scoped; only a `POTENTIAL_MATCH` screening is decidable (else 409); `CONFIRMED_HIT` ⇒ `party.status=BLOCKED`+`blockedReason`, `FALSE_POSITIVE_DISMISSED` ⇒ `screeningStatus=CLEAR`; writes `decidedById/decidedAt/notes`; emits `trade.screening.decided` (+ `trade.party.blocked`). **Reuse as-is.**
- `GET /api/trade/parties/[id]` already `include`s `screenings` (latest 10, desc) with `{ id, decision, decidedAt, createdAt, snapshotHash, hits, cascade, notes, decidedBy }` — the drawer payload.
- `GET /api/trade/parties?screening=<STATUS>&q=…` server-filters; list `select` returns `{ id, legalName, tradeName, countryCode, status, screeningStatus, isUSPerson, isHighRiskCountry, lastScreenedAt, createdAt, updatedAt }`.
- `getTradeAuth()` → `{ userId, organizationId, role } | null`. Rate-limit helpers: `checkRateLimit(tier, getIdentifier(req, userId))`, `createRateLimitResponse(rl)`. `emitTradeEvent(type, { organizationId, summary, data })`. `getSidebarBadgeCounts().partiesNeedingReview` already exists + drives the `Stammdaten` badge.
- `TradeTable<T>` props (3A): `rows, columns: TradeColumn<T>[] ({key;header;render;sortBy?;align?}), getRowId, rowHref?, selectable, selectedIds, onSelectionChange, bulkActions?, bulkNoun?, search?, filters?, resultCount?, loading?, emptyState?, initialSort?`. Owns toolbar + tri-state select-all + `BulkActionsBar`. `BulkActionsBar` props: `{ count; onClear; actions; noun? }`. `ListSkeleton` from `./Skeletons`. `useTradeDensity` global.
- `ScreeningBadge` is currently a **private** function inside `src/app/(trade)/trade/parties/page.tsx` (lines ~380-439) — must be promoted to a shared component before both pages can use it.
- Sidebar `SECTIONS` (`TradeSidebar.tsx`) — items carry `badgeKey: keyof SidebarBadgeCounts`; `badgeKeyLabel("partiesNeedingReview")` already returns "need screening review".

---

## Task 1: Pure `screening-triage.ts` — queue derivation, urgency order, validation, eligibility

**Files:**

- Create: `src/lib/trade/screening-triage.ts`
- Test: `src/lib/trade/screening-triage.test.ts`

- [ ] **Step 1: Write the failing test** at `src/lib/trade/screening-triage.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  urgencyRank,
  deriveTriageQueue,
  triageReason,
  validateResolutionReason,
  isBulkDismissEligible,
  type TriageInputRow,
} from "./screening-triage";

const NOW = new Date("2026-05-31T12:00:00.000Z");
const daysAgo = (n: number) =>
  new Date(NOW.getTime() - n * 86_400_000).toISOString();

function row(p: Partial<TriageInputRow>): TriageInputRow {
  return {
    id: "p1",
    legalName: "Acme",
    tradeName: null,
    countryCode: "DE",
    status: "ACTIVE",
    screeningStatus: "POTENTIAL_MATCH",
    isUSPerson: false,
    isHighRiskCountry: false,
    lastScreenedAt: daysAgo(1),
    screeningHits: null,
    ...p,
  };
}

describe("urgencyRank", () => {
  it("orders POTENTIAL_MATCH < STALE < NOT_SCREENED < CONFIRMED_HIT < CLEAR", () => {
    expect(urgencyRank("POTENTIAL_MATCH")).toBeLessThan(urgencyRank("STALE"));
    expect(urgencyRank("STALE")).toBeLessThan(urgencyRank("NOT_SCREENED"));
    expect(urgencyRank("NOT_SCREENED")).toBeLessThan(
      urgencyRank("CONFIRMED_HIT"),
    );
    expect(urgencyRank("CONFIRMED_HIT")).toBeLessThan(urgencyRank("CLEAR"));
  });
});

describe("deriveTriageQueue", () => {
  it("keeps POTENTIAL_MATCH / STALE / NOT_SCREENED and drops CLEAR + CONFIRMED_HIT by default", () => {
    const out = deriveTriageQueue(
      [
        row({ id: "a", screeningStatus: "POTENTIAL_MATCH" }),
        row({ id: "b", screeningStatus: "STALE", lastScreenedAt: daysAgo(40) }),
        row({ id: "c", screeningStatus: "NOT_SCREENED", lastScreenedAt: null }),
        row({ id: "d", screeningStatus: "CLEAR" }),
        row({ id: "e", screeningStatus: "CONFIRMED_HIT" }),
      ],
      NOW,
    );
    expect(out.map((r) => r.id)).toEqual(["a", "b", "c"]);
  });

  it("orders by urgency, then most-stale-first within a bucket, then name", () => {
    const out = deriveTriageQueue(
      [
        row({
          id: "stale-recent",
          screeningStatus: "STALE",
          lastScreenedAt: daysAgo(31),
        }),
        row({
          id: "stale-old",
          screeningStatus: "STALE",
          lastScreenedAt: daysAgo(90),
        }),
        row({
          id: "pm-z",
          legalName: "Zeta",
          screeningStatus: "POTENTIAL_MATCH",
        }),
        row({
          id: "pm-a",
          legalName: "Alpha",
          screeningStatus: "POTENTIAL_MATCH",
        }),
        row({
          id: "new",
          screeningStatus: "NOT_SCREENED",
          lastScreenedAt: null,
        }),
      ],
      NOW,
    );
    // POTENTIAL_MATCH first (Alpha before Zeta), then STALE (older first), then NOT_SCREENED.
    expect(out.map((r) => r.id)).toEqual([
      "pm-a",
      "pm-z",
      "stale-old",
      "stale-recent",
      "new",
    ]);
  });

  it("treats never-screened as most-stale within its bucket (lastScreenedMs = Infinity)", () => {
    const out = deriveTriageQueue(
      [
        row({
          id: "screened",
          screeningStatus: "NOT_SCREENED",
          lastScreenedAt: daysAgo(5),
        }),
        row({
          id: "never",
          screeningStatus: "NOT_SCREENED",
          lastScreenedAt: null,
        }),
      ],
      NOW,
    );
    expect(out[0].id).toBe("never");
    expect(out[0].lastScreenedMs).toBe(Infinity);
  });

  it("is deterministic for an injected now (no Date.now())", () => {
    const r = row({ screeningStatus: "STALE", lastScreenedAt: daysAgo(10) });
    const a = deriveTriageQueue([r], NOW)[0].lastScreenedMs;
    const b = deriveTriageQueue([r], NOW)[0].lastScreenedMs;
    expect(a).toBe(b);
    expect(a).toBe(10 * 86_400_000);
  });
});

describe("triageReason", () => {
  it("describes a potential match with its top hit list + score", () => {
    const r = deriveTriageQueue(
      [
        row({
          screeningStatus: "POTENTIAL_MATCH",
          screeningHits: [
            {
              list: "OFAC_SDN",
              entryId: "1",
              score: 0.97,
              matchedFields: ["name"],
            },
          ],
        }),
      ],
      NOW,
    )[0];
    expect(triageReason(r)).toMatch(/potential match/i);
    expect(triageReason(r)).toMatch(/0\.97/);
    expect(triageReason(r)).toMatch(/OFAC_SDN/);
  });
  it("describes staleness with an age", () => {
    const r = deriveTriageQueue(
      [row({ screeningStatus: "STALE", lastScreenedAt: daysAgo(42) })],
      NOW,
    )[0];
    expect(triageReason(r)).toMatch(/stale/i);
    expect(triageReason(r)).toMatch(/42/);
  });
  it("describes never-screened", () => {
    const r = deriveTriageQueue(
      [row({ screeningStatus: "NOT_SCREENED", lastScreenedAt: null })],
      NOW,
    )[0];
    expect(triageReason(r)).toMatch(/never screened/i);
  });
});

describe("validateResolutionReason", () => {
  it("rejects empty / whitespace", () => {
    expect(validateResolutionReason("").ok).toBe(false);
    expect(validateResolutionReason("   ").ok).toBe(false);
  });
  it("rejects > 2000 chars", () => {
    expect(validateResolutionReason("x".repeat(2001)).ok).toBe(false);
  });
  it("accepts a real justification", () => {
    expect(
      validateResolutionReason(
        "Distinct entity — different country/registration.",
      ).ok,
    ).toBe(true);
  });
});

describe("isBulkDismissEligible", () => {
  const pm = (hits: unknown, cascadeHit = false) =>
    deriveTriageQueue(
      [
        row({
          screeningStatus: "POTENTIAL_MATCH",
          screeningHits: hits as never,
          cascadeHit,
        }),
      ],
      NOW,
    )[0];

  it("true for a below-confirmed-band potential match with no cascade", () => {
    expect(
      isBulkDismissEligible(
        pm([
          {
            list: "OFAC_SDN",
            entryId: "1",
            score: 0.86,
            matchedFields: ["name"],
          },
        ]),
      ),
    ).toBe(true);
  });
  it("false when the top hit is in the confirmed band (>= 0.95)", () => {
    expect(
      isBulkDismissEligible(
        pm([
          {
            list: "OFAC_SDN",
            entryId: "1",
            score: 0.98,
            matchedFields: ["name"],
          },
        ]),
      ),
    ).toBe(false);
  });
  it("false when a cascade hit is present", () => {
    expect(
      isBulkDismissEligible(
        pm(
          [
            {
              list: "OFAC_SDN",
              entryId: "1",
              score: 0.86,
              matchedFields: ["name"],
            },
          ],
          true,
        ),
      ),
    ).toBe(false);
  });
  it("false for non-POTENTIAL_MATCH rows", () => {
    expect(
      isBulkDismissEligible(
        deriveTriageQueue(
          [row({ screeningStatus: "STALE", lastScreenedAt: daysAgo(40) })],
          NOW,
        )[0],
      ),
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails** (module does not exist yet): `npx vitest run src/lib/trade/screening-triage.test.ts`.

- [ ] **Step 3: Implement** `src/lib/trade/screening-triage.ts` — COMPLETE:

```ts
/**
 * Caelex Trade — Screening Triage (UI Phase 3C).
 *
 * Pure functions that turn the raw TradeParty screening cohort (the same
 * rows the parties list + sidebar badge already read) into an urgency-
 * ordered triage queue, plus the small validation/eligibility predicates
 * the resolution UI needs.
 *
 * Why pure (no `server-only`, no Prisma, no React):
 *   - The triage page fetches the parties itself via the existing
 *     /api/trade/parties endpoint; this module only *orders + describes*.
 *   - jsdom component tests hang on this machine — so ALL correctness that
 *     can be node-tested lives here and is covered by the co-located test.
 *   - `now` is injected so ordering is deterministic.
 *
 * NO new sanctions data, NO new scoring — match scores come from the
 * existing engine (TradeParty.screeningHits). We reuse the engine's score
 * bands (fuzzy-match.ts) to decide bulk-dismiss eligibility.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { SCORE_CONFIRMED_HIT } from "@/lib/comply-v2/trade/screening/fuzzy-match";

export type TriageScreeningStatus =
  | "NOT_SCREENED"
  | "CLEAR"
  | "POTENTIAL_MATCH"
  | "CONFIRMED_HIT"
  | "STALE";

/** One hit as denormalized onto TradeParty.screeningHits (top-N). */
export interface TriageHit {
  list: string;
  entryId: string;
  score: number;
  matchedFields: string[];
}

/** Shape fetched from GET /api/trade/parties (+ optional cascade flag). */
export interface TriageInputRow {
  id: string;
  legalName: string;
  tradeName: string | null;
  countryCode: string;
  status: "ACTIVE" | "ARCHIVED" | "BLOCKED";
  screeningStatus: TriageScreeningStatus;
  isUSPerson: boolean;
  isHighRiskCountry: boolean;
  lastScreenedAt: string | null;
  /** Top-N hits (TradeParty.screeningHits JSON) — may be absent. */
  screeningHits?: TriageHit[] | null;
  /** Whether the latest screening flagged a 50%-rule cascade hit. Optional;
   *  the list endpoint doesn't return it today, so callers default false. */
  cascadeHit?: boolean;
}

/** Derived row consumed by the triage table + drawer. */
export interface TriageRow extends TriageInputRow {
  /** 0 = most urgent. */
  urgencyRank: number;
  /** ms since lastScreenedAt; Infinity when never screened. */
  lastScreenedMs: number;
  /** Top hit by score, if any. */
  topHit: TriageHit | null;
}

/** Statuses that belong in the default "needs action" queue. */
export const TRIAGE_QUEUE_STATUSES: ReadonlySet<TriageScreeningStatus> =
  new Set(["POTENTIAL_MATCH", "STALE", "NOT_SCREENED"]);

const RANK: Record<TriageScreeningStatus, number> = {
  POTENTIAL_MATCH: 0,
  STALE: 1,
  NOT_SCREENED: 2,
  CONFIRMED_HIT: 3,
  CLEAR: 4,
};

export function urgencyRank(status: TriageScreeningStatus): number {
  return RANK[status];
}

function topHitOf(row: TriageInputRow): TriageHit | null {
  const hits = row.screeningHits;
  if (!hits || hits.length === 0) return null;
  return hits.reduce((best, h) => (h.score > best.score ? h : best), hits[0]);
}

function msSince(now: Date, iso: string | null): number {
  if (!iso) return Infinity; // never screened ⇒ maximally stale
  return now.getTime() - new Date(iso).getTime();
}

/**
 * Filter to the queue set, derive urgency/staleness/top-hit, and return a
 * NEW array sorted: urgencyRank asc → most-stale first → legalName asc.
 * Never mutates the input. Pass `includeStatuses` to override the default
 * queue (e.g. add CONFIRMED_HIT when the user picks that filter chip).
 */
export function deriveTriageQueue(
  rows: ReadonlyArray<TriageInputRow>,
  now: Date,
  includeStatuses: ReadonlySet<TriageScreeningStatus> = TRIAGE_QUEUE_STATUSES,
): TriageRow[] {
  const derived: TriageRow[] = rows
    .filter((r) => includeStatuses.has(r.screeningStatus))
    .map((r) => ({
      ...r,
      urgencyRank: urgencyRank(r.screeningStatus),
      lastScreenedMs: msSince(now, r.lastScreenedAt),
      topHit: topHitOf(r),
    }));
  derived.sort(compareTriage);
  return derived;
}

/** Sort comparator: urgency asc → most-stale first → name asc. */
export function compareTriage(a: TriageRow, b: TriageRow): number {
  if (a.urgencyRank !== b.urgencyRank) return a.urgencyRank - b.urgencyRank;
  // Most-stale first: larger lastScreenedMs (incl. Infinity) sorts earlier.
  if (a.lastScreenedMs !== b.lastScreenedMs) {
    return b.lastScreenedMs - a.lastScreenedMs;
  }
  return a.legalName.localeCompare(b.legalName);
}

/** One-line "why is this in the queue" string for the table cell. */
export function triageReason(row: TriageRow): string {
  switch (row.screeningStatus) {
    case "POTENTIAL_MATCH": {
      if (row.topHit) {
        return `Potential match — top ${row.topHit.score.toFixed(2)} (${row.topHit.list})`;
      }
      return "Potential match — needs review";
    }
    case "STALE": {
      const days =
        row.lastScreenedMs === Infinity
          ? null
          : Math.round(row.lastScreenedMs / 86_400_000);
      return days === null
        ? "Stale — screening data out of date"
        : `Stale — last screened ${days} d ago`;
    }
    case "NOT_SCREENED":
      return "Never screened — run the first screen";
    case "CONFIRMED_HIT":
      return "Confirmed sanctions hit — party blocked";
    case "CLEAR":
      return "Clear";
  }
}

/** Reason validation mirroring (not replacing) the server Zod min(1).max(2000). */
export function validateResolutionReason(
  notes: string,
): { ok: true } | { ok: false; error: string } {
  const trimmed = notes.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "A justification is required." };
  }
  if (notes.length > 2000) {
    return {
      ok: false,
      error: "Justification must be 2000 characters or fewer.",
    };
  }
  return { ok: true };
}

/**
 * Whether a row may be cleared via the BULK false-positive action.
 * Conservative by construction: only a POTENTIAL_MATCH whose top hit is
 * BELOW the confirmed band (< 0.95) AND with no 50%-rule cascade hit.
 * Anything high-confidence or cascade-flagged must go through the
 * per-party drawer with an individual justification.
 */
export function isBulkDismissEligible(row: TriageRow): boolean {
  if (row.screeningStatus !== "POTENTIAL_MATCH") return false;
  if (row.cascadeHit) return false;
  if (!row.topHit) return false; // no concrete hit to characterize ⇒ require manual review
  return row.topHit.score < SCORE_CONFIRMED_HIT;
}

/** Summarize a batch-screen response for the success toast. */
export function summarizeBatch(
  items: ReadonlyArray<{ ok: boolean; decision?: string }>,
): {
  total: number;
  ok: number;
  failed: number;
  newPotentialMatches: number;
} {
  let ok = 0;
  let failed = 0;
  let newPotentialMatches = 0;
  for (const it of items) {
    if (it.ok) ok++;
    else failed++;
    if (it.decision === "POTENTIAL_MATCH") newPotentialMatches++;
  }
  return { total: items.length, ok, failed, newPotentialMatches };
}

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
```

- [ ] **Step 4: Run the test, confirm green:** `npx vitest run src/lib/trade/screening-triage.test.ts`. Then `npx tsc --noEmit` (confirm the `SCORE_CONFIRMED_HIT` import path resolves; if `fuzzy-match.ts` is `server-only`-gated, inline the `0.95` constant with a comment instead of importing — verify during Step 3).
- [ ] **Step 5: Commit** — `feat(trade): pure screening-triage helpers — queue order + resolution rules (ui phase 3c)`.

---

## Task 2: Promote `ScreeningBadge` to a shared component

**Files:**

- Create: `src/app/(trade)/trade/_components/ScreeningBadge.tsx`
- Edit: `src/app/(trade)/trade/parties/page.tsx` (delete the private fn, import the shared one)

- [ ] **Step 1:** Move the existing `ScreeningBadge` (currently private in `parties/page.tsx`, ~lines 380-439) into `_components/ScreeningBadge.tsx` **verbatim** — same icons, same `tradeStatusLabel` tooltip/a11y wrapping. Export it. Keep the `status` prop type = the 5 screening statuses.
- [ ] **Step 2:** In `parties/page.tsx`, delete the private `ScreeningBadge` function and add `import { ScreeningBadge } from "../_components/ScreeningBadge";`. No other change — the JSX usage stays identical.
- [ ] **Step 3: Verify** — `npx tsc --noEmit` + `npm run lint` + run the existing parties route test (`npx vitest run src/app/api/trade/parties/route.test.ts`) to confirm no regression. Source-review the parties page renders unchanged.
- [ ] **Step 4: Commit** — `refactor(trade): extract shared screeningbadge component (ui phase 3c)`.

---

## Task 3: Additive batch re-screen route

**Files:**

- Create: `src/app/api/trade/parties/screen-batch/route.ts`
- Test: `src/app/api/trade/parties/screen-batch/route.test.ts`

- [ ] **Step 1: Write the failing route test** (`route.test.ts`) — model it on the existing `src/app/api/trade/parties/[id]/screen/route.test.ts`. Mock `@/lib/trade/trade-auth` (`getTradeAuth`), `@/lib/prisma` (`tradeParty.findMany`), `@/lib/comply-v2/trade/screening/screen-party.server` (`screenParty`), `@/lib/comply-v2/trade/ops-events.server` (`emitTradeEvent`), and `@/lib/ratelimit`. Cases:
  - 403 when `getTradeAuth` → null.
  - 400 when `partyIds` empty or > 50 (Zod).
  - org-scoping: `findMany` returns only `["a"]` for a request of `["a","foreign"]` ⇒ `screenParty` called **once** with `"a"`; response `summary.total === 1`.
  - per-item failure: `screenParty` rejects for `"b"` but resolves for `"a"` ⇒ `summary.ok === 1`, `summary.failed === 1`, HTTP 200 (batch not aborted).
  - `summary.newPotentialMatches` counts items whose `summary.decision === "POTENTIAL_MATCH"`.

- [ ] **Step 2: Confirm it fails** (route absent): `npx vitest run src/app/api/trade/parties/screen-batch/route.test.ts`.

- [ ] **Step 3: Implement** `route.ts` — COMPLETE (mirrors the `[id]/screen` route + the cron's accumulation):

```ts
/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * POST /api/trade/parties/screen-batch — re-screen many parties in one call.
 *
 * Reuses the existing screenParty() engine (in-memory Jaro-Winkler against
 * cached sanctions snapshots) in a SEQUENTIAL loop — identical to the
 * trade-rescreen-stale cron. ZERO external cost: no network, no new list,
 * no new dependency. One TradeScreeningResult is inserted per party
 * (insert-only audit trail proving "re-checked on date X vs snapshot Y").
 *
 * Rate-limited "sensitive" (5/hr/user) — one batch of <=50 ids = one token,
 * bounding write amplification on the audit table.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  createRateLimitResponse,
  getIdentifier,
} from "@/lib/ratelimit";
import { getTradeAuth } from "@/lib/trade/trade-auth";
import { screenParty } from "@/lib/comply-v2/trade/screening/screen-party.server";
import { emitTradeEvent } from "@/lib/comply-v2/trade/ops-events.server";

export const runtime = "nodejs";
// <=50 ids * ~50ms in-memory ~= 2.5s; generous ceiling for cold snapshots.
export const maxDuration = 60;

const BatchSchema = z.object({
  partyIds: z.array(z.string().min(1)).min(1).max(50),
});

interface BatchItem {
  partyId: string;
  ok: boolean;
  decision?: string;
  hitCount?: number;
  error?: string;
}

export async function POST(req: Request) {
  try {
    const tradeAuth = await getTradeAuth();
    if (!tradeAuth) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rl = await checkRateLimit(
      "sensitive",
      getIdentifier(req, tradeAuth.userId),
    );
    if (!rl.success) return createRateLimitResponse(rl);

    const body = await req.json();
    const parsed = BatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    // Org-scope ALL ids in one query; silently drop foreign/unknown ids so
    // we never leak cross-tenant existence.
    const inOrg = await prisma.tradeParty.findMany({
      where: {
        id: { in: parsed.data.partyIds },
        organizationId: tradeAuth.organizationId,
      },
      select: { id: true },
    });

    const items: BatchItem[] = [];
    let ok = 0;
    let failed = 0;
    let newPotentialMatches = 0;

    for (const { id } of inOrg) {
      try {
        const result = await screenParty(id, {
          systemDecisionUserId: tradeAuth.userId,
        });
        items.push({
          partyId: id,
          ok: true,
          decision: result.summary.decision,
          hitCount: result.summary.hitCount,
        });
        ok++;
        if (result.summary.decision === "POTENTIAL_MATCH")
          newPotentialMatches++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        items.push({ partyId: id, ok: false, error: message });
        failed++;
        logger.error(
          { partyId: id, err: message },
          "screen-batch: item failed",
        );
      }
    }

    const summary = { total: inOrg.length, ok, failed, newPotentialMatches };

    await emitTradeEvent("trade.screening.batch", {
      organizationId: tradeAuth.organizationId,
      summary: `Batch re-screen · ${ok}/${inOrg.length} ok · ${newPotentialMatches} new potential matches`,
      data: { ...summary, userId: tradeAuth.userId },
    });

    logger.info({ ...summary, userId: tradeAuth.userId }, "screen-batch: done");
    return NextResponse.json({ summary, items });
  } catch (err) {
    logger.error({ err }, "POST /api/trade/parties/screen-batch failed");
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run the test green** + `npx tsc --noEmit`. (Confirm `emitTradeEvent` accepts the `trade.screening.batch` type — `ops-events.server.ts` uses a string union; if it's a closed union, add the new literal there in the same task and note it in the commit.)
- [ ] **Step 5: Commit** — `feat(trade): batch re-screen api reusing screenparty engine (ui phase 3c)`.

---

## Task 4: Resolution drawer component

**Files:**

- Create: `src/app/(trade)/trade/screening/ResolutionDrawer.tsx`

- [ ] **Step 1:** Build a focused right-side drawer (no Drawer primitive exists; follow `TradeCommandPalette` a11y: `role="dialog"`, `aria-modal`, focus trap, Esc-to-close, click-backdrop-to-close, `--trade-*` tokens / `glass-floating`). **Recipe / sketch:**

```tsx
"use client";

import { useEffect, useState } from "react";
import { X, ShieldAlert, ShieldCheck, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { validateResolutionReason } from "@/lib/trade/screening-triage";

interface ScreeningHit {
  list: string;
  entryId: string;
  score: number;
  matchedFields: string[];
}
interface LatestScreening {
  id: string;
  decision: string;
  hits: ScreeningHit[];
  cascade: {
    ancestors?: {
      ancestorName: string;
      effectivePercent: number;
      screeningStatus: string;
    }[];
  } | null;
}
interface PartyDetail {
  id: string;
  legalName: string;
  tradeName: string | null;
  countryCode: string;
  canonicalName: string;
  leiCode: string | null;
  vatNumber: string | null;
  screenings: LatestScreening[];
}

interface Props {
  partyId: string;
  onClose: () => void;
  /** Called after a successful decide so the queue re-fetches. */
  onResolved: () => void;
}

export function ResolutionDrawer({ partyId, onClose, onResolved }: Props) {
  const toast = useToast();
  const [party, setParty] = useState<PartyDetail | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState<null | "CLEAR" | "CONFIRMED">(
    null,
  );

  // Load full detail (includes screenings w/ hits + cascade) on open.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/trade/parties/${partyId}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setParty(d.party);
      });
    return () => {
      cancelled = true;
    };
  }, [partyId]);

  // Esc-to-close.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  // The screening we decide on = latest POTENTIAL_MATCH.
  const screening =
    party?.screenings.find((s) => s.decision === "POTENTIAL_MATCH") ?? null;

  async function decide(
    decision: "CONFIRMED_HIT" | "FALSE_POSITIVE_DISMISSED",
  ) {
    const v = validateResolutionReason(notes);
    if (!v.ok) {
      toast.warning("Justification required", v.error);
      return;
    }
    if (!screening) return;
    setSubmitting(decision === "CONFIRMED_HIT" ? "CONFIRMED" : "CLEAR");
    try {
      const res = await fetch(
        `/api/trade/parties/${partyId}/screenings/${screening.id}/decide`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ decision, notes }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error("Could not resolve", data.error ?? "Failed");
        return;
      }
      toast.success(
        decision === "CONFIRMED_HIT" ? "Party blocked" : "Marked clear",
        decision === "CONFIRMED_HIT"
          ? `${party?.legalName} is now BLOCKED from new operations.`
          : `${party?.legalName} returned to CLEAR.`,
      );
      onResolved();
      onClose();
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Resolve screening match"
        className="fixed inset-y-0 right-0 z-50 w-full max-w-xl overflow-y-auto border-l border-trade-border-subtle bg-trade-bg-panel glass-floating p-6"
      >
        {/* header: party name/country + close button */}
        {/* banner: "Potential sanctions match — auto-prepared, you confirm" */}
        {/* side-by-side compare: each screening.hits[] → matched entity (list, entryId, matchedFields, score) vs party (canonicalName, country, identifiers) */}
        {/* cascade chain if screening.cascade?.ancestors present */}
        {/* justification <textarea> bound to notes */}
        {/* two buttons: "Mark CLEAR (false positive)" → decide(FALSE_POSITIVE_DISMISSED);
            "Confirm hit — blocks party" → decide(CONFIRMED_HIT) (red, with inline warning).
            Both disabled while !validateResolutionReason(notes).ok or submitting. */}
      </aside>
    </>
  );
}
```

- [ ] **Step 2: Verify** — `npx tsc --noEmit` + `npm run lint`. Fill in the JSX comments with real markup using `--trade-*` tokens (match the parties-page cell visuals for the party side; render hits with `ScreeningBadge`-adjacent styling). No jsdom test (gated).
- [ ] **Step 3: Commit** — `feat(trade): screening resolution drawer — clear/confirm with audit reason (ui phase 3c)`.

---

## Task 5: Triage table (client) on `TradeTable`

**Files:**

- Create: `src/app/(trade)/trade/screening/ScreeningTriageTable.tsx`

- [ ] **Step 1:** Build the client table. It owns: fetch (queue statuses), `selectedIds`, status-filter chips, the open-drawer partyId, and the bulk handlers. **Recipe / sketch:**

```tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { TradeTable, type TradeColumn } from "../_components/TradeTable";
import { ScreeningBadge } from "../_components/ScreeningBadge";
import { EmptyStateRich } from "../_components/EmptyStateRich";
import { ResolutionDrawer } from "./ResolutionDrawer";
import { ScanLine, RefreshCw, ShieldOff } from "lucide-react";
import {
  deriveTriageQueue,
  triageReason,
  isBulkDismissEligible,
  summarizeBatch,
  TRIAGE_QUEUE_STATUSES,
  type TriageInputRow,
  type TriageRow,
} from "@/lib/trade/screening-triage";

const FILTERS = [
  { key: "ALL", label: "All" },
  { key: "POTENTIAL_MATCH", label: "Potential" },
  { key: "STALE", label: "Stale" },
  { key: "NOT_SCREENED", label: "Not screened" },
  { key: "CONFIRMED_HIT", label: "Confirmed" },
] as const;

export function ScreeningTriageTable() {
  const toast = useToast();
  const [raw, setRaw] = useState<TriageInputRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterKey, setFilterKey] =
    useState<(typeof FILTERS)[number]["key"]>("ALL");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [drawerId, setDrawerId] = useState<string | null>(null);

  // Fetch the queue. ALL ⇒ fetch the 3 queue statuses + merge; a specific
  // chip ⇒ single ?screening= server call (incl. CONFIRMED_HIT on demand).
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const statuses =
        filterKey === "ALL" ? [...TRIAGE_QUEUE_STATUSES] : [filterKey];
      const results = await Promise.all(
        statuses.map((s) => {
          const p = new URLSearchParams({ screening: s, limit: "50" });
          if (search) p.set("q", search);
          return fetch(`/api/trade/parties?${p}`).then((r) => r.json());
        }),
      );
      const merged: TriageInputRow[] = results.flatMap((d) => d.parties ?? []);
      setRaw(merged);
    } finally {
      setLoading(false);
    }
  }, [filterKey, search]);

  useEffect(() => {
    void reload();
  }, [reload]);
  useEffect(() => {
    setSelectedIds(new Set());
  }, [filterKey, search]);

  const now = useMemo(() => new Date(), [raw]); // stable per data load
  const include =
    filterKey === "ALL"
      ? TRIAGE_QUEUE_STATUSES
      : new Set([filterKey as TriageRow["screeningStatus"]]);
  const rows = useMemo(
    () => deriveTriageQueue(raw, now, include),
    [raw, now, include],
  );

  const selectedRows = rows.filter((r) => selectedIds.has(r.id));
  const allDismissEligible =
    selectedRows.length > 0 && selectedRows.every(isBulkDismissEligible);

  async function rescreenSelected() {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    const res = await fetch("/api/trade/parties/screen-batch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ partyIds: ids }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error("Re-screen failed", data.error ?? "Failed");
      return;
    }
    const s = data.summary ?? summarizeBatch(data.items ?? []);
    toast.success(
      "Re-screen complete",
      `${s.ok}/${s.total} screened · ${s.newPotentialMatches} new potential match(es).`,
    );
    setSelectedIds(new Set());
    void reload();
  }

  async function bulkDismiss() {
    // Eligibility-gated false-positive sweep: one shared justification,
    // one decide() call per selected party's latest POTENTIAL_MATCH.
    // (Open a small prompt/modal for the shared `notes`; validate via
    //  validateResolutionReason before firing. Fetch each party's detail
    //  to find its current POTENTIAL_MATCH screeningId, then POST decide
    //  with decision=FALSE_POSITIVE_DISMISSED. Tally ok/failed → toast.)
    // Confirms (CONFIRMED_HIT) are NEVER bulk — only via the drawer.
  }

  const columns: TradeColumn<TriageRow>[] = [
    {
      key: "screeningStatus",
      header: "Screening",
      sortBy: (r) => r.urgencyRank,
      render: (r) => <ScreeningBadge status={r.screeningStatus} />,
    },
    {
      key: "legalName",
      header: "Counterparty",
      sortBy: (r) => r.legalName.toLowerCase(),
      render: (r) =>
        /* port the parties-list legal-name cell: name + trade name + country + high-risk/US markers */ null,
    },
    {
      key: "reason",
      header: "Why",
      sortBy: (r) => r.urgencyRank,
      render: (r) => (
        <span className="text-[12px] text-trade-text-secondary">
          {triageReason(r)}
        </span>
      ),
    },
    {
      key: "lastScreened",
      header: "Last screened",
      sortBy: (r) => r.lastScreenedMs,
      render: (r) => /* relative date or "—" */ null,
    },
    {
      key: "actions",
      header: "",
      render: (r) =>
        r.screeningStatus === "POTENTIAL_MATCH" ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setDrawerId(r.id);
            }}
            className="rounded-md border border-trade-border bg-trade-bg-panel px-2.5 py-1 text-[12px] font-medium text-trade-text-secondary hover:text-trade-text-primary"
          >
            Review
          </button>
        ) : null,
    },
  ];

  const filterSlot = FILTERS.map((f) => (
    <button
      key={f.key}
      onClick={() => setFilterKey(f.key)}
      aria-pressed={filterKey === f.key}
      className={/* same pill styling as parties/page.tsx filter chips */ ""}
    >
      {f.label}
    </button>
  ));

  return (
    <>
      <TradeTable<TriageRow>
        rows={rows}
        columns={columns}
        getRowId={(r) => r.id}
        // NOTE: no rowHref — the "Review" button opens the drawer; whole-row
        // navigation to the party detail would compete with selection + the
        // drawer. (If row-click-to-detail is wanted, gate it off the actions cell.)
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        bulkNoun="party"
        bulkActions={
          <>
            <button
              type="button"
              onClick={rescreenSelected}
              className="inline-flex items-center gap-1.5 rounded-full bg-trade-accent px-3 py-1 text-[12px] font-semibold text-white hover:bg-trade-accent-strong"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Re-screen
            </button>
            <button
              type="button"
              onClick={bulkDismiss}
              disabled={!allDismissEligible}
              title={
                allDismissEligible
                  ? undefined
                  : "Bulk-dismiss only allowed for low-confidence, non-cascade potential matches"
              }
              className="inline-flex items-center gap-1.5 rounded-full border border-trade-border px-3 py-1 text-[12px] font-semibold text-trade-text-secondary hover:text-trade-text-primary disabled:opacity-40"
            >
              <ShieldOff className="h-3.5 w-3.5" /> Dismiss false positives
            </button>
          </>
        }
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Search counterparties…",
        }}
        filters={
          <div className="flex flex-wrap items-center gap-1.5">
            {filterSlot}
          </div>
        }
        resultCount={rows.length}
        loading={loading}
        initialSort={{ key: "screeningStatus", dir: "asc" }}
        emptyState={
          <EmptyStateRich
            icon={ScanLine}
            title="Nothing to triage"
            description="No potential matches, stale, or unscreened counterparties. New sanctions hits surface here the moment screening flags them."
          />
        }
      />
      {drawerId && (
        <ResolutionDrawer
          partyId={drawerId}
          onClose={() => setDrawerId(null)}
          onResolved={() => {
            void reload();
          }}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: Verify** — `npx tsc --noEmit` + `npm run lint`. Fill the `null`-placeholder cells with real markup (port from `parties/page.tsx`). Confirm the bulk-dismiss `notes` prompt validates via `validateResolutionReason` before firing.
- [ ] **Step 3: Commit** — `feat(trade): screening triage table — queue, filters, bulk re-screen (ui phase 3c)`.

---

## Task 6: Triage page (RSC shell) + route

**Files:**

- Create: `src/app/(trade)/trade/screening/page.tsx`

- [ ] **Step 1:** RSC shell mirroring the parties-page header (breadcrumb, title "Sanctions Screening Triage", the German decision-support disclaimer) that renders `<ScreeningTriageTable />`. **Recipe:**

```tsx
import Link from "next/link";
import { ScreeningTriageTable } from "./ScreeningTriageTable";
import { Term } from "../_components/Term";

export const metadata = { title: "Screening Triage · Caelex Trade" };

export default function ScreeningTriagePage() {
  return (
    <div className="mx-auto max-w-screen-2xl px-8 py-8">
      <header className="mb-7 border-b border-trade-border-subtle pb-5">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-trade-text-muted">
          <Link
            href="/trade"
            className="transition hover:text-trade-text-primary"
          >
            Trade Operations
          </Link>{" "}
          <span className="text-trade-border-strong">/</span>{" "}
          <span className="text-trade-text-secondary">Screening Triage</span>
        </div>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-trade-text-primary">
          Sanctions Screening Triage
        </h1>
        <p className="mt-1.5 max-w-2xl text-[14px] text-trade-text-secondary">
          Potential matches, stale, and unscreened counterparties — ordered by
          urgency. Re-screen in bulk (free, in-memory) and resolve each hit with
          an audited decision.
        </p>
      </header>

      <ScreeningTriageTable />

      <p
        lang="de"
        className="mt-8 max-w-3xl text-[11px] leading-relaxed text-trade-text-muted"
      >
        Sanctions-Screening ist ein Werkzeug zur Decision-Support, kein Counsel.
        Treffer erfordern menschliche Triage durch qualifizierten AV. Bestätigte
        Treffer blockieren den Partner für neue Vorgänge. Verstöße gegen{" "}
        <Term>OFAC</Term>/EU-Sanktionen können zu erheblichen Bußen führen.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Verify** — `npx tsc --noEmit` + `npm run lint`. (If the route group enforces auth via layout, confirm `/trade/screening` inherits the same shell/sidebar as `/trade/parties` — it lives under the same `(trade)/trade` group, so it does.)
- [ ] **Step 3: Commit** — `feat(trade): /trade/screening triage page shell (ui phase 3c)`.

---

## Task 7: Sidebar nav entry (reuse existing badge)

**Files:**

- Edit: `src/app/(trade)/trade/_components/TradeSidebar.tsx`

- [ ] **Step 1:** Add to the **Arbeit** section `items` array (after `master-data`), reusing the existing `partiesNeedingReview` badge key + `ScanLine` icon import:

```ts
{
  href: "/trade/screening",
  label: "Screening",
  icon: ScanLine, // add to the lucide-react import
  match: (p) => p.startsWith("/trade/screening"),
  tooltip:
    "Sanktions-Treffer triagieren — Potential Matches, veraltete & ungescreente Partner.",
  badgeKey: "partiesNeedingReview",
},
```

- [ ] **Step 2:** `badgeKeyLabel("partiesNeedingReview")` already returns "need screening review" — no change needed. Confirm `ScanLine` (or chosen icon) is imported.
- [ ] **Step 3: Verify** — `npx tsc --noEmit` + `npm run lint`. Source-review: the new row renders with the same pill as `Stammdaten` (intended — same backlog, different drill-in).
- [ ] **Step 4: Commit** — `feat(trade): add screening triage to sidebar nav (ui phase 3c)`.

---

## Task 8: Full verification + batched deploy

- [ ] **Step 1:** `npx vitest run src/lib/trade/screening-triage.test.ts src/app/api/trade/parties/screen-batch/route.test.ts src/app/api/trade/parties/route.test.ts` — all green.
- [ ] **Step 2:** `npx tsc --noEmit` — no NEW errors on touched files (note any pre-existing unrelated errors, do not block).
- [ ] **Step 3:** `npm run lint` — clean on touched files.
- [ ] **Step 4: Manual source review** against the spec's verified contracts: drawer decides on the latest `POTENTIAL_MATCH` screening; `CONFIRMED_HIT` path warns about blocking; bulk-dismiss is eligibility-gated and never confirms; batch route is org-scoped + per-item-fault-tolerant; sidebar badge reuses `partiesNeedingReview`.
- [ ] **Step 5:** Confirm `git status` clean (all 7 task commits present). This is task batch #? toward the 6-8 threshold — **per the batched-deploy policy, deploy only if the threshold is reached OR the user says "deploy now"**:
  ```bash
  git checkout main
  git pull --ff-only origin main
  git merge fix/trade-to-92 --no-edit
  git push origin main          # production deploy (skip feature-branch push → no preview build)
  ```
  Then return to `fix/trade-to-92`. **Do not push the feature branch** (avoids the Vercel preview build).

---

## Commit summary (8 independently-committable units)

1. `feat(trade): pure screening-triage helpers — queue order + resolution rules (ui phase 3c)`
2. `refactor(trade): extract shared screeningbadge component (ui phase 3c)`
3. `feat(trade): batch re-screen api reusing screenparty engine (ui phase 3c)`
4. `feat(trade): screening resolution drawer — clear/confirm with audit reason (ui phase 3c)`
5. `feat(trade): screening triage table — queue, filters, bulk re-screen (ui phase 3c)`
6. `feat(trade): /trade/screening triage page shell (ui phase 3c)`
7. `feat(trade): add screening triage to sidebar nav (ui phase 3c)`
8. (verification only — no code; deploy commit/merge if batch threshold reached)

**No Prisma migration. No engine change. No decide-route change. No new runtime dependency. No new external screening cost.**
