/**
 * Task 3.5 — single-source tracker import. Binding:
 *  - applicability derives ONLY from the snapshot's module statuses;
 *  - "recommended" never marks articles applicable (advisory ≠ duty);
 *  - the module imports NOTHING from @/data/articles (dual-dataset kill).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

import { deriveArticleRows, countRows } from "./tracker-import";

const CATALOG = [
  { id: "art-6", module: "authorization" },
  { id: "art-24", module: "registration" },
  { id: "art-58", module: "debris" },
  { id: "art-96", module: "environmental" },
];

describe("deriveArticleRows", () => {
  it("required + simplified modules mark their articles applicable", () => {
    const rows = deriveArticleRows(CATALOG, [
      { id: "authorization", status: "required" },
      { id: "registration", status: "simplified" },
      { id: "debris", status: "not_applicable" },
    ]);
    expect(rows).toEqual([
      { articleId: "art-6", status: "not_started" },
      { articleId: "art-24", status: "not_started" },
      { articleId: "art-58", status: "not_applicable" },
      { articleId: "art-96", status: "not_applicable" },
    ]);
    expect(countRows(rows)).toEqual({ applicable: 2, notApplicable: 2 });
  });

  it("'recommended' is advisory — never marks articles applicable", () => {
    const rows = deriveArticleRows(CATALOG, [
      { id: "debris", status: "recommended" },
    ]);
    expect(rows.every((r) => r.status === "not_applicable")).toBe(true);
  });

  it("missing/empty module statuses → everything not_applicable (never a guess)", () => {
    expect(
      deriveArticleRows(CATALOG, undefined).every(
        (r) => r.status === "not_applicable",
      ),
    ).toBe(true);
    expect(
      deriveArticleRows(CATALOG, []).every(
        (r) => r.status === "not_applicable",
      ),
    ).toBe(true);
  });

  it("unknown module ids in the snapshot affect nothing", () => {
    const rows = deriveArticleRows(CATALOG, [
      { id: "atlantis_module", status: "required" },
    ]);
    expect(rows.every((r) => r.status === "not_applicable")).toBe(true);
  });
});

describe("dual-dataset kill (plan Task 3.5)", () => {
  it("tracker-import.ts imports nothing from @/data/articles", () => {
    const source = readFileSync(join(__dirname, "tracker-import.ts"), "utf-8");
    // Assert on CODE only — the doc comments NAME the dataset while
    // documenting that it is not used. Strip block + line comments first.
    const code = source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\n]*/g, "");
    expect(code).not.toMatch(/@\/data\/articles/);
    expect(code).not.toMatch(/\bappliesTo\b/);
  });
});
