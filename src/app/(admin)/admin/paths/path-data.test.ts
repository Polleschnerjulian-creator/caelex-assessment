/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Unit tests for the Path/Flow list's pure data shaping. These pin the relative
 * bar-width (fraction of the busiest edge), the share-of-total, the entry/exit
 * sentinel detection, and the path-shortening rule — plus the zero-traffic guard
 * so an empty product never renders NaN-width bars.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import {
  isEntry,
  isExit,
  shortPathLabel,
  buildPathRows,
  groupOutflows,
  worstExits,
  topEntries,
  isPathProduct,
  ENTRY_SENTINEL,
  EXIT_SENTINEL,
  PATH_PRODUCTS,
} from "./path-data";
import type { PathEdgeView } from "@/lib/admin/analytics-types";

describe("entry/exit sentinels", () => {
  it("detects the entry sentinel only", () => {
    expect(isEntry(ENTRY_SENTINEL)).toBe(true);
    expect(isEntry("/dashboard")).toBe(false);
    expect(isEntry(EXIT_SENTINEL)).toBe(false);
  });

  it("detects the exit sentinel only", () => {
    expect(isExit(EXIT_SENTINEL)).toBe(true);
    expect(isExit("/dashboard")).toBe(false);
    expect(isExit(ENTRY_SENTINEL)).toBe(false);
  });
});

describe("shortPathLabel", () => {
  it("passes the sentinels through untouched", () => {
    expect(shortPathLabel(ENTRY_SENTINEL)).toBe(ENTRY_SENTINEL);
    expect(shortPathLabel(EXIT_SENTINEL)).toBe(EXIT_SENTINEL);
  });

  it("keeps the root and short paths verbatim", () => {
    expect(shortPathLabel("/")).toBe("/");
    expect(shortPathLabel("/dashboard")).toBe("/dashboard");
    expect(shortPathLabel("/admin/paths")).toBe("/admin/paths");
    expect(shortPathLabel("/a/b/c")).toBe("/a/b/c"); // exactly maxSegments
  });

  it("elides the middle of a deep path", () => {
    expect(shortPathLabel("/a/b/c/d/e")).toBe("/a/…/e");
    expect(shortPathLabel("/dashboard/modules/debris/evidence")).toBe(
      "/dashboard/…/evidence",
    );
  });

  it("ignores a trailing slash when counting segments", () => {
    expect(shortPathLabel("/a/b/c/")).toBe("/a/b/c/"); // 3 segments → verbatim
  });

  it("honours a custom maxSegments threshold", () => {
    expect(shortPathLabel("/a/b/c", 2)).toBe("/a/…/c");
  });

  it("treats an empty string as the root", () => {
    expect(shortPathLabel("")).toBe("/");
  });
});

describe("buildPathRows", () => {
  const edges: PathEdgeView[] = [
    { fromPath: "(entry)", toPath: "/dashboard", transitions: 100 },
    { fromPath: "/dashboard", toPath: "/dashboard/timeline", transitions: 50 },
    { fromPath: "/dashboard/timeline", toPath: "(exit)", transitions: 25 },
  ];

  it("normalises bar width against the busiest edge", () => {
    const rows = buildPathRows(edges);
    expect(rows).toHaveLength(3);
    expect(rows[0].widthFrac).toBe(1); // 100/100 — the max
    expect(rows[1].widthFrac).toBe(0.5); // 50/100
    expect(rows[2].widthFrac).toBe(0.25); // 25/100
  });

  it("computes each edge's share of total transitions", () => {
    const rows = buildPathRows(edges); // total = 175
    expect(rows[0].share).toBeCloseTo(100 / 175, 10);
    expect(rows[1].share).toBeCloseTo(50 / 175, 10);
    expect(rows[2].share).toBeCloseTo(25 / 175, 10);
    // Shares sum to 1.
    expect(rows.reduce((s, r) => s + r.share, 0)).toBeCloseTo(1, 10);
  });

  it("flags entry/exit endpoints on the right rows", () => {
    const rows = buildPathRows(edges);
    expect(rows[0].fromIsEntry).toBe(true);
    expect(rows[0].toIsExit).toBe(false);
    expect(rows[2].fromIsEntry).toBe(false);
    expect(rows[2].toIsExit).toBe(true);
    expect(rows[1].fromIsEntry).toBe(false);
    expect(rows[1].toIsExit).toBe(false);
  });

  it("finds the max even when edges are not sorted desc", () => {
    const unsorted: PathEdgeView[] = [
      { fromPath: "/a", toPath: "/b", transitions: 10 },
      { fromPath: "/b", toPath: "/c", transitions: 40 },
      { fromPath: "/c", toPath: "/d", transitions: 20 },
    ];
    const rows = buildPathRows(unsorted);
    expect(rows[0].widthFrac).toBe(0.25); // 10/40
    expect(rows[1].widthFrac).toBe(1); // 40/40
    expect(rows[2].widthFrac).toBe(0.5); // 20/40
  });

  it("degrades to flat zero-width bars when there is no traffic", () => {
    const zero: PathEdgeView[] = [
      { fromPath: "/a", toPath: "/b", transitions: 0 },
      { fromPath: "/b", toPath: "/c", transitions: 0 },
    ];
    const rows = buildPathRows(zero);
    expect(rows.every((r) => r.widthFrac === 0)).toBe(true);
    expect(rows.every((r) => r.share === 0)).toBe(true);
  });

  it("treats a non-finite transition count as 0", () => {
    const bad: PathEdgeView[] = [
      { fromPath: "/a", toPath: "/b", transitions: 100 },
      { fromPath: "/b", toPath: "/c", transitions: NaN as unknown as number },
    ];
    const rows = buildPathRows(bad);
    expect(rows[1].transitions).toBe(0);
    expect(rows[1].widthFrac).toBe(0);
  });

  it("does not mutate the caller's array", () => {
    const input = [...edges];
    buildPathRows(input);
    expect(input).toEqual(edges);
  });

  it("returns an empty array for no edges", () => {
    expect(buildPathRows([])).toEqual([]);
  });
});

describe("groupOutflows", () => {
  // /dashboard fans out to two pages; /a is a separate, smaller source.
  const edges: PathEdgeView[] = [
    { fromPath: "(entry)", toPath: "/dashboard", transitions: 100 },
    { fromPath: "/dashboard", toPath: "/dashboard/timeline", transitions: 60 },
    { fromPath: "/dashboard", toPath: "/dashboard/incidents", transitions: 30 },
    { fromPath: "/dashboard", toPath: "(exit)", transitions: 10 },
    { fromPath: "/a", toPath: "/b", transitions: 20 },
  ];

  it("groups edges by their source node", () => {
    const groups = groupOutflows(edges);
    // Three distinct sources: (entry), /dashboard, /a.
    expect(groups.map((g) => g.fromPath).sort()).toEqual([
      "(entry)",
      "/a",
      "/dashboard",
    ]);
  });

  it("sorts groups by total outflow desc, then source asc", () => {
    const groups = groupOutflows(edges);
    // /dashboard outflow = 100, (entry) = 100, /a = 20.
    // /dashboard and (entry) tie at 100 → tie-break by name: "(entry)" < "/dashboard".
    expect(groups.map((g) => g.fromPath)).toEqual([
      "(entry)",
      "/dashboard",
      "/a",
    ]);
    expect(groups[0].totalOut).toBe(100);
    expect(groups[2].totalOut).toBe(20);
  });

  it("sizes each out-edge as a share of ITS source's outflow", () => {
    const groups = groupOutflows(edges);
    const dash = groups.find((g) => g.fromPath === "/dashboard")!;
    expect(dash.totalOut).toBe(100);
    // outEdges sorted busiest-first: 60, 30, 10.
    expect(dash.outEdges.map((o) => o.transitions)).toEqual([60, 30, 10]);
    expect(dash.outEdges[0].shareOfSource).toBeCloseTo(0.6, 10);
    expect(dash.outEdges[1].shareOfSource).toBeCloseTo(0.3, 10);
    expect(dash.outEdges[2].shareOfSource).toBeCloseTo(0.1, 10);
    // Shares within a source sum to 1.
    expect(dash.outEdges.reduce((s, o) => s + o.shareOfSource, 0)).toBeCloseTo(
      1,
      10,
    );
  });

  it("normalises group widthFrac against the busiest source", () => {
    const groups = groupOutflows(edges);
    const dash = groups.find((g) => g.fromPath === "/dashboard")!;
    const a = groups.find((g) => g.fromPath === "/a")!;
    expect(dash.widthFrac).toBe(1); // 100/100
    expect(a.widthFrac).toBe(0.2); // 20/100
  });

  it("flags the entry source and exit destinations", () => {
    const groups = groupOutflows(edges);
    const entry = groups.find((g) => g.fromPath === "(entry)")!;
    expect(entry.isEntry).toBe(true);
    const dash = groups.find((g) => g.fromPath === "/dashboard")!;
    expect(dash.isEntry).toBe(false);
    const exitEdge = dash.outEdges.find((o) => o.toPath === "(exit)")!;
    expect(exitEdge.isExit).toBe(true);
    expect(
      dash.outEdges.find((o) => o.toPath === "/dashboard/timeline")!.isExit,
    ).toBe(false);
  });

  it("degrades to zero widths with no traffic and does not mutate input", () => {
    const zero: PathEdgeView[] = [
      { fromPath: "/a", toPath: "/b", transitions: 0 },
      { fromPath: "/a", toPath: "/c", transitions: 0 },
    ];
    const snapshot = JSON.parse(JSON.stringify(zero));
    const groups = groupOutflows(zero);
    expect(groups[0].widthFrac).toBe(0);
    expect(groups[0].outEdges.every((o) => o.shareOfSource === 0)).toBe(true);
    expect(zero).toEqual(snapshot);
    expect(groupOutflows([])).toEqual([]);
  });

  it("coerces a non-finite transition count to 0", () => {
    const bad: PathEdgeView[] = [
      { fromPath: "/a", toPath: "/b", transitions: 40 },
      { fromPath: "/a", toPath: "/c", transitions: NaN as unknown as number },
    ];
    const groups = groupOutflows(bad);
    const a = groups[0];
    expect(a.totalOut).toBe(40);
    const c = a.outEdges.find((o) => o.toPath === "/c")!;
    expect(c.transitions).toBe(0);
    expect(c.shareOfSource).toBe(0);
  });
});

describe("worstExits", () => {
  const edges: PathEdgeView[] = [
    // /dashboard: 90 stay, 10 exit → 10% drop-off, high traffic.
    { fromPath: "/dashboard", toPath: "/dashboard/timeline", transitions: 90 },
    { fromPath: "/dashboard", toPath: "(exit)", transitions: 10 },
    // /pricing: 2 stay, 8 exit → 80% drop-off, low traffic but bleeds.
    { fromPath: "/pricing", toPath: "/contact", transitions: 2 },
    { fromPath: "/pricing", toPath: "(exit)", transitions: 8 },
    // An entry→exit bounce — must be EXCLUDED (no page to attribute to).
    { fromPath: "(entry)", toPath: "(exit)", transitions: 50 },
  ];

  it("ranks real pages by absolute exit volume desc", () => {
    const rows = worstExits(edges);
    expect(rows.map((r) => r.fromPath)).toEqual(["/dashboard", "/pricing"]);
    expect(rows[0].transitions).toBe(10);
    expect(rows[1].transitions).toBe(8);
  });

  it("excludes the entry→exit bounce edge", () => {
    const rows = worstExits(edges);
    expect(rows.some((r) => r.fromPath === "(entry)")).toBe(false);
  });

  it("computes exitRate as the page's drop-off across ALL its outflow", () => {
    const rows = worstExits(edges);
    const dash = rows.find((r) => r.fromPath === "/dashboard")!;
    const pricing = rows.find((r) => r.fromPath === "/pricing")!;
    expect(dash.exitRate).toBeCloseTo(10 / 100, 10); // 10%
    expect(pricing.exitRate).toBeCloseTo(8 / 10, 10); // 80%
  });

  it("normalises widthFrac against the biggest exit edge", () => {
    const rows = worstExits(edges);
    expect(rows[0].widthFrac).toBe(1); // 10 is the biggest exit
    expect(rows[1].widthFrac).toBe(0.8); // 8/10
  });

  it("honours the limit and returns empty when there are no exits", () => {
    expect(worstExits(edges, 1)).toHaveLength(1);
    const noExits: PathEdgeView[] = [
      { fromPath: "/a", toPath: "/b", transitions: 5 },
    ];
    expect(worstExits(noExits)).toEqual([]);
  });

  it("does not mutate the caller's array", () => {
    const snapshot = JSON.parse(JSON.stringify(edges));
    worstExits(edges);
    expect(edges).toEqual(snapshot);
  });
});

describe("topEntries", () => {
  const edges: PathEdgeView[] = [
    { fromPath: "(entry)", toPath: "/dashboard", transitions: 70 },
    { fromPath: "(entry)", toPath: "/pricing", transitions: 30 },
    // An entry→exit bounce — must be EXCLUDED (no landing page).
    { fromPath: "(entry)", toPath: "(exit)", transitions: 15 },
    // A non-entry edge — irrelevant to entries.
    { fromPath: "/dashboard", toPath: "/dashboard/timeline", transitions: 40 },
  ];

  it("ranks real landing pages by entry volume desc", () => {
    const rows = topEntries(edges);
    expect(rows.map((r) => r.toPath)).toEqual(["/dashboard", "/pricing"]);
    expect(rows[0].transitions).toBe(70);
  });

  it("excludes the entry→exit bounce and non-entry edges", () => {
    const rows = topEntries(edges);
    expect(rows.some((r) => r.toPath === "(exit)")).toBe(false);
    expect(rows.some((r) => r.toPath === "/dashboard/timeline")).toBe(false);
  });

  it("computes share of total entry volume and relative width", () => {
    const rows = topEntries(edges); // entry total = 100 (70 + 30)
    expect(rows[0].share).toBeCloseTo(0.7, 10);
    expect(rows[1].share).toBeCloseTo(0.3, 10);
    expect(rows[0].widthFrac).toBe(1); // 70 is the biggest
    expect(rows[1].widthFrac).toBeCloseTo(30 / 70, 10);
  });

  it("honours the limit and returns empty with no entries", () => {
    expect(topEntries(edges, 1)).toHaveLength(1);
    const none: PathEdgeView[] = [
      { fromPath: "/a", toPath: "/b", transitions: 5 },
    ];
    expect(topEntries(none)).toEqual([]);
  });
});

describe("isPathProduct", () => {
  it("accepts every known product code", () => {
    for (const p of PATH_PRODUCTS) {
      expect(isPathProduct(p)).toBe(true);
    }
  });

  it("rejects unknown / non-string values", () => {
    expect(isPathProduct("nope")).toBe(false);
    expect(isPathProduct("")).toBe(false);
    expect(isPathProduct(null)).toBe(false);
    expect(isPathProduct(42)).toBe(false);
  });
});
