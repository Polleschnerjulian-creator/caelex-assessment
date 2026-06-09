/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Unit tests for the PURE DB-derived nightly aggregate arithmetic
 * (`./domain-rollups`).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Hand-built fixtures only — no Prisma, no clock, no DOM. We test the
 * deterministic counting/ratio math the nightly `analytics-aggregate` cron
 * depends on:
 *   - rollupDeadlines            (created / met / overdue, dense scalars)
 *   - rollupNcaSubmissions       (by status, sparse dimensional counts)
 *   - rollupDocumentsGenerated   (COMPLETED by type, sparse dimensional counts)
 *   - rollupAstraMessages        (scalar)
 *   - rollupActiveOrgs           (distinct orgs w/ value-event that day)
 *   - activeTenantsByProduct     (DAU/WAU/MAU window distinct-counting)
 *   - stickiness                 (DAU/MAU ratio, guarded)
 *   - rollupProductEngagement    (dense per-product 4-row block)
 *   - buildDomainRollups         (whole-pipeline composer)
 *
 * Determinism: every payload's `date` is the exact `Date` we pass in; empty days
 * emit ZEROS for the dense series, not nulls or gaps.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import {
  rollupDeadlines,
  rollupNcaSubmissions,
  rollupDocumentsGenerated,
  rollupAstraMessages,
  rollupActiveOrgs,
  activeTenantsByProduct,
  stickiness,
  rollupProductEngagement,
  buildDomainRollups,
  DOMAIN_METRIC_TYPES,
  DOMAIN_DIMENSIONS,
  type DeadlineRow,
  type NcaSubmissionRow,
  type GeneratedDocumentRow,
  type ProductActivity,
  type DailyAggregatePayload,
} from "./domain-rollups";
import { VALUE_PRODUCTS } from "@/lib/admin/value-events";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** UTC-midnight Date for a calendar day (month 1-based for readability). */
function utcDay(y: number, mo: number, d: number): Date {
  return new Date(Date.UTC(y, mo - 1, d));
}

/** UTC Date at an arbitrary intra-day time. */
function utc(y: number, mo: number, d: number, h = 0, mi = 0, s = 0): Date {
  return new Date(Date.UTC(y, mo - 1, d, h, mi, s));
}

/** The target day used across most tests. */
const DAY = utcDay(2026, 6, 8);
const NEXT_DAY = utcDay(2026, 6, 9);
const PREV_DAY = utcDay(2026, 6, 7);

/** Find the single scalar payload for a metricType (asserts uniqueness). */
function scalarOf(
  payloads: DailyAggregatePayload[],
  metricType: string,
): DailyAggregatePayload {
  const matches = payloads.filter(
    (p) => p.metricType === metricType && p.dimension === null,
  );
  expect(matches).toHaveLength(1);
  return matches[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// rollupDeadlines
// ─────────────────────────────────────────────────────────────────────────────

describe("rollupDeadlines", () => {
  it("empty input → three dense ZERO scalars (never omitted, never null)", () => {
    const out = rollupDeadlines([], DAY);
    expect(out).toHaveLength(3);
    for (const p of out) {
      expect(p.metricValue).toBe(0);
      expect(p.dimension).toBeNull();
      expect(p.dimensionValue).toBeNull();
      expect(p.date).toBe(DAY); // exact date echoed back
    }
    expect(out.map((p) => p.metricType).sort()).toEqual(
      [
        DOMAIN_METRIC_TYPES.deadlinesCreated,
        DOMAIN_METRIC_TYPES.deadlinesMet,
        DOMAIN_METRIC_TYPES.deadlinesOverdue,
      ].sort(),
    );
  });

  it("counts created by createdAt-in-day, ignoring adjacent days", () => {
    const rows: DeadlineRow[] = [
      {
        createdAt: utc(2026, 6, 8, 0, 0, 1),
        dueDate: NEXT_DAY,
        status: "UPCOMING",
        completedAt: null,
      },
      {
        createdAt: utc(2026, 6, 8, 23, 59),
        dueDate: NEXT_DAY,
        status: "UPCOMING",
        completedAt: null,
      },
      {
        createdAt: PREV_DAY,
        dueDate: NEXT_DAY,
        status: "UPCOMING",
        completedAt: null,
      }, // before day
      {
        createdAt: NEXT_DAY,
        dueDate: NEXT_DAY,
        status: "UPCOMING",
        completedAt: null,
      }, // after day
    ];
    const created = scalarOf(
      rollupDeadlines(rows, DAY),
      DOMAIN_METRIC_TYPES.deadlinesCreated,
    );
    expect(created.metricValue).toBe(2);
  });

  it("counts met only when COMPLETED AND completedAt-in-day", () => {
    const rows: DeadlineRow[] = [
      {
        createdAt: PREV_DAY,
        dueDate: DAY,
        status: "COMPLETED",
        completedAt: utc(2026, 6, 8, 9),
      }, // met
      {
        createdAt: PREV_DAY,
        dueDate: DAY,
        status: "COMPLETED",
        completedAt: NEXT_DAY,
      }, // completed but not today
      {
        createdAt: PREV_DAY,
        dueDate: DAY,
        status: "UPCOMING",
        completedAt: null,
      }, // not completed
      {
        createdAt: PREV_DAY,
        dueDate: DAY,
        status: "COMPLETED",
        completedAt: null,
      }, // completed w/o ts → not counted
    ];
    const met = scalarOf(
      rollupDeadlines(rows, DAY),
      DOMAIN_METRIC_TYPES.deadlinesMet,
    );
    expect(met.metricValue).toBe(1);
  });

  it("counts overdue = due-in-day AND not COMPLETED/CANCELLED", () => {
    const rows: DeadlineRow[] = [
      {
        createdAt: PREV_DAY,
        dueDate: utc(2026, 6, 8, 12),
        status: "OVERDUE",
        completedAt: null,
      }, // overdue
      {
        createdAt: PREV_DAY,
        dueDate: utc(2026, 6, 8, 12),
        status: "UPCOMING",
        completedAt: null,
      }, // due today, open
      {
        createdAt: PREV_DAY,
        dueDate: utc(2026, 6, 8, 12),
        status: "COMPLETED",
        completedAt: utc(2026, 6, 8, 8),
      }, // closed → not overdue
      {
        createdAt: PREV_DAY,
        dueDate: utc(2026, 6, 8, 12),
        status: "CANCELLED",
        completedAt: null,
      }, // cancelled → moot
      {
        createdAt: PREV_DAY,
        dueDate: NEXT_DAY,
        status: "UPCOMING",
        completedAt: null,
      }, // due tomorrow
    ];
    const overdue = scalarOf(
      rollupDeadlines(rows, DAY),
      DOMAIN_METRIC_TYPES.deadlinesOverdue,
    );
    expect(overdue.metricValue).toBe(2);
  });

  it("a single row can count toward more than one series (created+overdue)", () => {
    // Created today, due today, still open → counts as BOTH created and overdue.
    const rows: DeadlineRow[] = [
      {
        createdAt: utc(2026, 6, 8, 6),
        dueDate: utc(2026, 6, 8, 18),
        status: "DUE_SOON",
        completedAt: null,
      },
    ];
    const out = rollupDeadlines(rows, DAY);
    expect(
      scalarOf(out, DOMAIN_METRIC_TYPES.deadlinesCreated).metricValue,
    ).toBe(1);
    expect(
      scalarOf(out, DOMAIN_METRIC_TYPES.deadlinesOverdue).metricValue,
    ).toBe(1);
    expect(scalarOf(out, DOMAIN_METRIC_TYPES.deadlinesMet).metricValue).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// rollupNcaSubmissions
// ─────────────────────────────────────────────────────────────────────────────

describe("rollupNcaSubmissions", () => {
  it("empty input → no payloads (sparse dimensional series)", () => {
    expect(rollupNcaSubmissions([], DAY)).toEqual([]);
  });

  it("buckets by status, sorted, with day-windowed counts", () => {
    const rows: NcaSubmissionRow[] = [
      { status: "SUBMITTED", submittedAt: utc(2026, 6, 8, 1) },
      { status: "SUBMITTED", submittedAt: utc(2026, 6, 8, 2) },
      { status: "APPROVED", submittedAt: utc(2026, 6, 8, 3) },
      { status: "REJECTED", submittedAt: PREV_DAY }, // outside day → ignored
    ];
    const out = rollupNcaSubmissions(rows, DAY);
    expect(out).toHaveLength(2);
    // Sorted by status: APPROVED before SUBMITTED.
    expect(out.map((p) => p.dimensionValue)).toEqual(["APPROVED", "SUBMITTED"]);
    expect(out.every((p) => p.dimension === DOMAIN_DIMENSIONS.status)).toBe(
      true,
    );
    expect(
      out.every((p) => p.metricType === DOMAIN_METRIC_TYPES.ncaSubmissions),
    ).toBe(true);
    expect(out.find((p) => p.dimensionValue === "SUBMITTED")!.metricValue).toBe(
      2,
    );
    expect(out.find((p) => p.dimensionValue === "APPROVED")!.metricValue).toBe(
      1,
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// rollupDocumentsGenerated
// ─────────────────────────────────────────────────────────────────────────────

describe("rollupDocumentsGenerated", () => {
  it("empty input → no payloads (sparse dimensional series)", () => {
    expect(rollupDocumentsGenerated([], DAY)).toEqual([]);
  });

  it("counts only COMPLETED rows, bucketed by type, day-windowed", () => {
    const rows: GeneratedDocumentRow[] = [
      {
        documentType: "NIS2_ASSESSMENT",
        status: "COMPLETED",
        updatedAt: utc(2026, 6, 8, 4),
      },
      {
        documentType: "NIS2_ASSESSMENT",
        status: "COMPLETED",
        updatedAt: utc(2026, 6, 8, 5),
      },
      {
        documentType: "DEBRIS_MITIGATION_PLAN",
        status: "COMPLETED",
        updatedAt: utc(2026, 6, 8, 6),
      },
      {
        documentType: "NIS2_ASSESSMENT",
        status: "GENERATING",
        updatedAt: utc(2026, 6, 8, 7),
      }, // not completed
      {
        documentType: "NIS2_ASSESSMENT",
        status: "COMPLETED",
        updatedAt: NEXT_DAY,
      }, // outside day
    ];
    const out = rollupDocumentsGenerated(rows, DAY);
    expect(out).toHaveLength(2);
    expect(out.map((p) => p.dimensionValue)).toEqual([
      "DEBRIS_MITIGATION_PLAN",
      "NIS2_ASSESSMENT",
    ]); // sorted
    expect(out.every((p) => p.dimension === DOMAIN_DIMENSIONS.type)).toBe(true);
    expect(
      out.find((p) => p.dimensionValue === "NIS2_ASSESSMENT")!.metricValue,
    ).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// rollupAstraMessages
// ─────────────────────────────────────────────────────────────────────────────

describe("rollupAstraMessages", () => {
  it("empty input → ZERO scalar (dense)", () => {
    const p = rollupAstraMessages([], DAY);
    expect(p.metricType).toBe(DOMAIN_METRIC_TYPES.astraMessages);
    expect(p.metricValue).toBe(0);
    expect(p.dimension).toBeNull();
  });

  it("counts createdAt-in-day only", () => {
    const rows = [
      { createdAt: utc(2026, 6, 8, 0) },
      { createdAt: utc(2026, 6, 8, 23, 59, 59) },
      { createdAt: NEXT_DAY }, // boundary: start of next day is excluded
      { createdAt: PREV_DAY },
    ];
    expect(rollupAstraMessages(rows, DAY).metricValue).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// rollupActiveOrgs
// ─────────────────────────────────────────────────────────────────────────────

describe("rollupActiveOrgs", () => {
  const dayMs = DAY.getTime();

  it("empty input → ZERO scalar", () => {
    const p = rollupActiveOrgs([], DAY);
    expect(p.metricType).toBe(DOMAIN_METRIC_TYPES.activeOrgs);
    expect(p.metricValue).toBe(0);
  });

  it("counts DISTINCT orgKeys active that day; ignores other days + null orgs", () => {
    const activity: ProductActivity[] = [
      { product: "comply", actorKey: "org:A", orgKey: "A", dayMs },
      { product: "trade", actorKey: "org:A", orgKey: "A", dayMs }, // same org, diff product → still 1
      { product: "atlas", actorKey: "org:B", orgKey: "B", dayMs },
      { product: "scholar", actorKey: "user:s1", orgKey: null, dayMs }, // user-scoped → not an org
      {
        product: "comply",
        actorKey: "org:C",
        orgKey: "C",
        dayMs: PREV_DAY.getTime(),
      }, // other day
    ];
    expect(rollupActiveOrgs(activity, DAY).metricValue).toBe(2); // A, B
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// activeTenantsByProduct (DAU/WAU/MAU windows)
// ─────────────────────────────────────────────────────────────────────────────

describe("activeTenantsByProduct", () => {
  const dayMs = (d: Date) => d.getTime();

  it("empty input → every product 0 (dense map)", () => {
    const m = activeTenantsByProduct([], DAY, 1);
    for (const product of VALUE_PRODUCTS) expect(m[product]).toBe(0);
  });

  it("DAU (windowDays=1) counts distinct actors on the target day only", () => {
    const activity: ProductActivity[] = [
      { product: "trade", actorKey: "org:A", orgKey: "A", dayMs: dayMs(DAY) },
      { product: "trade", actorKey: "org:A", orgKey: "A", dayMs: dayMs(DAY) }, // dup actor
      { product: "trade", actorKey: "org:B", orgKey: "B", dayMs: dayMs(DAY) },
      {
        product: "trade",
        actorKey: "org:C",
        orgKey: "C",
        dayMs: dayMs(PREV_DAY),
      }, // yesterday → excluded from DAU
    ];
    const m = activeTenantsByProduct(activity, DAY, 1);
    expect(m.trade).toBe(2); // A, B
  });

  it("WAU (windowDays=7) includes the trailing 7 inclusive days, excludes day 7-back+", () => {
    const within = utcDay(2026, 6, 2); // 6 days before DAY (8th) → inside 7d window
    const justOutside = utcDay(2026, 6, 1); // 7 days before → outside
    const activity: ProductActivity[] = [
      { product: "atlas", actorKey: "org:A", orgKey: "A", dayMs: dayMs(DAY) },
      {
        product: "atlas",
        actorKey: "org:B",
        orgKey: "B",
        dayMs: dayMs(within),
      },
      {
        product: "atlas",
        actorKey: "org:C",
        orgKey: "C",
        dayMs: dayMs(justOutside),
      },
    ];
    expect(activeTenantsByProduct(activity, DAY, 7).atlas).toBe(2); // A, B
    expect(activeTenantsByProduct(activity, DAY, 30).atlas).toBe(3); // all within 30d
  });

  it("does not double-count an actor active on multiple days in the window", () => {
    const activity: ProductActivity[] = [
      { product: "comply", actorKey: "org:A", orgKey: "A", dayMs: dayMs(DAY) },
      {
        product: "comply",
        actorKey: "org:A",
        orgKey: "A",
        dayMs: dayMs(PREV_DAY),
      },
      {
        product: "comply",
        actorKey: "org:A",
        orgKey: "A",
        dayMs: dayMs(utcDay(2026, 6, 5)),
      },
    ];
    expect(activeTenantsByProduct(activity, DAY, 30).comply).toBe(1);
  });

  it("future activity (after the target day) is excluded from every window", () => {
    const activity: ProductActivity[] = [
      {
        product: "pharos",
        actorKey: "org:A",
        orgKey: "A",
        dayMs: dayMs(NEXT_DAY),
      },
    ];
    expect(activeTenantsByProduct(activity, DAY, 30).pharos).toBe(0);
  });

  it("ignores activity tagged with a product outside the catalogue", () => {
    const activity = [
      {
        product: "bogus" as unknown as (typeof VALUE_PRODUCTS)[number],
        actorKey: "org:A",
        orgKey: "A",
        dayMs: dayMs(DAY),
      },
    ];
    const m = activeTenantsByProduct(activity, DAY, 1);
    for (const product of VALUE_PRODUCTS) expect(m[product]).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// stickiness
// ─────────────────────────────────────────────────────────────────────────────

describe("stickiness", () => {
  it("DAU/MAU rounded to 3dp", () => {
    expect(stickiness(1, 3)).toBe(0.333);
    expect(stickiness(5, 20)).toBe(0.25);
    expect(stickiness(10, 10)).toBe(1);
  });

  it("MAU=0 (or non-finite) → 0, never NaN/Infinity", () => {
    expect(stickiness(0, 0)).toBe(0);
    expect(stickiness(5, 0)).toBe(0);
    expect(stickiness(Number.NaN, 10)).toBe(0);
    expect(stickiness(1, Number.POSITIVE_INFINITY)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// rollupProductEngagement
// ─────────────────────────────────────────────────────────────────────────────

describe("rollupProductEngagement", () => {
  it("emits a DENSE 4-row block for every product, even on an empty day", () => {
    const out = rollupProductEngagement([], DAY);
    // 5 products × 4 metricTypes.
    expect(out).toHaveLength(VALUE_PRODUCTS.length * 4);
    for (const product of VALUE_PRODUCTS) {
      const rows = out.filter((p) => p.dimensionValue === product);
      expect(rows).toHaveLength(4);
      expect(rows.every((p) => p.dimension === DOMAIN_DIMENSIONS.product)).toBe(
        true,
      );
      expect(rows.every((p) => p.metricValue === 0)).toBe(true);
      expect(new Set(rows.map((p) => p.metricType))).toEqual(
        new Set([
          DOMAIN_METRIC_TYPES.productDau,
          DOMAIN_METRIC_TYPES.productWau,
          DOMAIN_METRIC_TYPES.productMau,
          DOMAIN_METRIC_TYPES.productStickiness,
        ]),
      );
    }
  });

  it("computes dau/wau/mau/stickiness consistently for one product", () => {
    const dayMs = (d: Date) => d.getTime();
    const activity: ProductActivity[] = [
      // trade: actor A active today + 10 days ago; actor B active today.
      { product: "trade", actorKey: "org:A", orgKey: "A", dayMs: dayMs(DAY) },
      { product: "trade", actorKey: "org:B", orgKey: "B", dayMs: dayMs(DAY) },
      {
        product: "trade",
        actorKey: "org:A",
        orgKey: "A",
        dayMs: dayMs(utcDay(2026, 5, 29)),
      }, // 10d back
      // a far-past actor C only inside the 30d window’s start.
      {
        product: "trade",
        actorKey: "org:C",
        orgKey: "C",
        dayMs: dayMs(utcDay(2026, 5, 10)),
      }, // 29d back
    ];
    const out = rollupProductEngagement(activity, DAY);
    const get = (mt: string) =>
      out.find((p) => p.metricType === mt && p.dimensionValue === "trade")!
        .metricValue;

    expect(get(DOMAIN_METRIC_TYPES.productDau)).toBe(2); // A, B today
    expect(get(DOMAIN_METRIC_TYPES.productWau)).toBe(2); // A, B within 7d
    expect(get(DOMAIN_METRIC_TYPES.productMau)).toBe(3); // A, B, C within 30d
    // stickiness = dau/mau = 2/3 → 0.667
    expect(get(DOMAIN_METRIC_TYPES.productStickiness)).toBe(0.667);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildDomainRollups — whole-pipeline composer
// ─────────────────────────────────────────────────────────────────────────────

describe("buildDomainRollups", () => {
  it("empty everything → dense zeros for scalar/product series, no dimensional count rows", () => {
    const out = buildDomainRollups({
      date: DAY,
      deadlines: [],
      ncaSubmissions: [],
      documents: [],
      astraMessages: [],
      productActivity: [],
    });
    // 3 deadline scalars + 1 astra scalar + 1 active_orgs scalar + (5×4) product rows.
    expect(out).toHaveLength(3 + 1 + 1 + VALUE_PRODUCTS.length * 4);
    // Every payload carries the exact target date.
    expect(out.every((p) => p.date === DAY)).toBe(true);
    // No nca/doc dimensional rows on an empty day.
    expect(
      out.some((p) => p.metricType === DOMAIN_METRIC_TYPES.ncaSubmissions),
    ).toBe(false);
    expect(
      out.some((p) => p.metricType === DOMAIN_METRIC_TYPES.documentsGenerated),
    ).toBe(false);
  });

  it("active_orgs reads the SAME activity as DAU (no drift)", () => {
    const dayMs = DAY.getTime();
    const productActivity: ProductActivity[] = [
      { product: "comply", actorKey: "org:A", orgKey: "A", dayMs },
      { product: "trade", actorKey: "org:B", orgKey: "B", dayMs },
      { product: "scholar", actorKey: "user:s1", orgKey: null, dayMs }, // user-scoped: counts for DAU, not active_orgs
    ];
    const out = buildDomainRollups({
      date: DAY,
      deadlines: [],
      ncaSubmissions: [],
      documents: [],
      astraMessages: [],
      productActivity,
    });
    const activeOrgs = scalarOf(out, DOMAIN_METRIC_TYPES.activeOrgs);
    // org:A + org:B → 2 (scholar user-scoped row excluded).
    expect(activeOrgs.metricValue).toBe(2);
    // scholar DAU still reflects the user-scoped activity.
    const scholarDau = out.find(
      (p) =>
        p.metricType === DOMAIN_METRIC_TYPES.productDau &&
        p.dimensionValue === "scholar",
    )!;
    expect(scholarDau.metricValue).toBe(1);
  });

  it("every emitted payload has a coherent (dimension,dimensionValue) pairing", () => {
    const dayMs = DAY.getTime();
    const out = buildDomainRollups({
      date: DAY,
      deadlines: [
        {
          createdAt: utc(2026, 6, 8, 1),
          dueDate: NEXT_DAY,
          status: "UPCOMING",
          completedAt: null,
        },
      ],
      ncaSubmissions: [
        { status: "SUBMITTED", submittedAt: utc(2026, 6, 8, 2) },
      ],
      documents: [
        {
          documentType: "NIS2_ASSESSMENT",
          status: "COMPLETED",
          updatedAt: utc(2026, 6, 8, 3),
        },
      ],
      astraMessages: [{ createdAt: utc(2026, 6, 8, 4) }],
      productActivity: [
        { product: "comply", actorKey: "org:A", orgKey: "A", dayMs },
      ],
    });
    for (const p of out) {
      // dimension and dimensionValue are both-null or both-set — never one-sided.
      const bothNull = p.dimension === null && p.dimensionValue === null;
      const bothSet = p.dimension !== null && p.dimensionValue !== null;
      expect(bothNull || bothSet).toBe(true);
      expect(Number.isFinite(p.metricValue)).toBe(true);
    }
  });
});
