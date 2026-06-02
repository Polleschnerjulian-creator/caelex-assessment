/**
 * attached-clauses-store.test.ts
 *
 * Unit tests for the Atlas Drafting Chat attached-clauses session store
 * (A-H9). Uses the real jsdom localStorage (default vitest env) so we
 * exercise the actual serialisation/deserialisation path.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  ATTACHED_CLAUSES_KEY,
  getAttachedClauseIds,
  attachClause,
  detachClause,
  clearAttachedClauses,
} from "./attached-clauses-store";

beforeEach(() => {
  window.localStorage.clear();
});

describe("getAttachedClauseIds", () => {
  it("returns an empty array when nothing is stored", () => {
    expect(getAttachedClauseIds()).toEqual([]);
  });

  it("returns the stored ids in order", () => {
    window.localStorage.setItem(
      ATTACHED_CLAUSES_KEY,
      JSON.stringify(["clause-1", "clause-2"]),
    );
    expect(getAttachedClauseIds()).toEqual(["clause-1", "clause-2"]);
  });

  it("filters out non-string values stored in localStorage (corrupt data)", () => {
    window.localStorage.setItem(
      ATTACHED_CLAUSES_KEY,
      JSON.stringify(["clause-1", 42, null, true, "clause-2"]),
    );
    expect(getAttachedClauseIds()).toEqual(["clause-1", "clause-2"]);
  });

  it("returns empty array when stored value is not an array", () => {
    window.localStorage.setItem(
      ATTACHED_CLAUSES_KEY,
      JSON.stringify({ id: "clause-1" }),
    );
    expect(getAttachedClauseIds()).toEqual([]);
  });

  it("returns empty array on invalid JSON", () => {
    window.localStorage.setItem(ATTACHED_CLAUSES_KEY, "not-valid-json{{{");
    expect(getAttachedClauseIds()).toEqual([]);
  });
});

describe("attachClause", () => {
  it("adds a clause id", () => {
    attachClause("clause-a");
    expect(getAttachedClauseIds()).toContain("clause-a");
  });

  it("prepends new ids so the most recent is first", () => {
    attachClause("clause-a");
    attachClause("clause-b");
    const ids = getAttachedClauseIds();
    expect(ids[0]).toBe("clause-b");
    expect(ids[1]).toBe("clause-a");
  });

  it("is idempotent — attaching the same id twice keeps exactly one copy", () => {
    attachClause("clause-dup");
    attachClause("clause-dup");
    const ids = getAttachedClauseIds();
    expect(ids.filter((x) => x === "clause-dup")).toHaveLength(1);
  });

  it("caps the list at 25 entries", () => {
    for (let i = 0; i < 30; i++) {
      attachClause(`clause-${i}`);
    }
    expect(getAttachedClauseIds().length).toBeLessThanOrEqual(25);
  });
});

describe("detachClause", () => {
  it("removes the specified id", () => {
    attachClause("clause-a");
    attachClause("clause-b");
    detachClause("clause-a");
    expect(getAttachedClauseIds()).not.toContain("clause-a");
    expect(getAttachedClauseIds()).toContain("clause-b");
  });

  it("is a no-op when the id is not present", () => {
    attachClause("clause-a");
    detachClause("clause-nonexistent");
    expect(getAttachedClauseIds()).toEqual(["clause-a"]);
  });
});

describe("clearAttachedClauses", () => {
  it("removes all attached clause ids", () => {
    attachClause("clause-a");
    attachClause("clause-b");
    clearAttachedClauses();
    expect(getAttachedClauseIds()).toEqual([]);
  });

  it("is safe to call when already empty", () => {
    expect(() => clearAttachedClauses()).not.toThrow();
    expect(getAttachedClauseIds()).toEqual([]);
  });
});

describe("round-trip integrity", () => {
  it("attach → detach → attach round-trips correctly", () => {
    attachClause("clause-x");
    detachClause("clause-x");
    expect(getAttachedClauseIds()).toEqual([]);
    attachClause("clause-x");
    expect(getAttachedClauseIds()).toEqual(["clause-x"]);
  });

  it("persists through separate getAttachedClauseIds calls", () => {
    attachClause("clause-persist");
    // Simulate a second read (no store reset)
    expect(getAttachedClauseIds()).toEqual(["clause-persist"]);
    expect(getAttachedClauseIds()).toEqual(["clause-persist"]);
  });
});
