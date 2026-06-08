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
