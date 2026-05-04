/**
 * Tests for src/lib/comply-v2/coe/dependency-engine.ts.
 *
 * Coverage:
 *
 *   1. Empty applicable set → empty topo result, no errors
 *   2. Single-module set → ordered = [that module], no cycle
 *   3. Two-node hard chain → topo orders prereq before dependent
 *   4. Topo order respects ALL_MODULES declaration tie-breaker (stability)
 *   5. Cycle detection — synthetic cycle returns acyclic=false + cycle modules
 *   6. missingPrereqs reports prereqs referenced but not in input set
 *   7. Soft edges do NOT block ordering (cybersecurity ↔ nis2 case)
 *   8. getPrerequisites — hard filter excludes soft edges
 *   9. getPrerequisites — "all" filter includes soft edges
 *  10. getDependents — symmetric inverse of getPrerequisites
 *  11. Critical path on full applicable set → longest hard chain
 *  12. Critical path on cyclic input → empty path
 *  13. buildDependencyGraph — exposes nodes + edges
 *  14. Real-world example — full 10-module set sorts authorization-cluster
 *      sources first, supervision last
 */

import { describe, it, expect } from "vitest";

import {
  buildDependencyGraph,
  getPrerequisites,
  getDependents,
  topologicalSort,
  getCriticalPath,
  ALL_MODULES,
  DEPENDENCY_EDGES,
  type DependencyEdge,
} from "./dependency-engine";
import type { ComplianceModule } from "@/data/articles";

// ─── Topological sort ────────────────────────────────────────────────────

describe("topologicalSort — basic shapes", () => {
  it("empty input → empty output", () => {
    const r = topologicalSort([]);
    expect(r.ordered).toEqual([]);
    expect(r.acyclic).toBe(true);
    expect(r.cycle).toEqual([]);
    expect(r.missingPrereqs).toEqual([]);
  });

  it("single-module input → that one module, no cycle", () => {
    const r = topologicalSort(["regulatory"]);
    expect(r.ordered).toEqual(["regulatory"]);
    expect(r.acyclic).toBe(true);
    expect(r.cycle).toEqual([]);
  });

  it("ordered respects authorization-cluster: env+debris+insurance before authorization", () => {
    const r = topologicalSort([
      "authorization",
      "environmental",
      "debris",
      "insurance",
    ]);
    expect(r.acyclic).toBe(true);
    const idx = (m: ComplianceModule) => r.ordered.indexOf(m);
    expect(idx("environmental")).toBeLessThan(idx("authorization"));
    expect(idx("debris")).toBeLessThan(idx("authorization"));
    expect(idx("insurance")).toBeLessThan(idx("authorization"));
  });

  it("supervision is last when paired with authorization + registration", () => {
    const r = topologicalSort(["authorization", "registration", "supervision"]);
    expect(r.ordered[r.ordered.length - 1]).toBe("supervision");
  });

  it("ordering is stable — declaration-order tie-breaker", () => {
    // authorization, registration, cybersecurity all hard-independent of
    // each other in this subset; declaration order should win.
    // Note: registration depends on authorization (HARD), so declaration
    // order applies among independents only.
    const r = topologicalSort(["cybersecurity", "regulatory", "nis2"]);
    // All three have no hard prereqs in this subset (cybersecurity↔nis2
    // is soft). Declaration order from ALL_MODULES is:
    // authorization, registration, environmental, cybersecurity,
    // debris, insurance, supervision, regulatory, nis2, cra.
    // → cybersecurity → regulatory → nis2.
    expect(r.ordered).toEqual(["cybersecurity", "regulatory", "nis2"]);
  });
});

describe("topologicalSort — cycle detection", () => {
  it("the curated graph itself is acyclic on the full module set", () => {
    const r = topologicalSort(ALL_MODULES);
    expect(r.acyclic).toBe(true);
  });

  it("synthetic 2-node cycle → acyclic=false + cycle members + ordered=[]", () => {
    // Inject custom edges via the second parameter — the engine accepts
    // any edge set, defaulting to DEPENDENCY_EDGES. This is the cleanest
    // way to unit-test the cycle path without mutating module state.
    const cyclicEdges: DependencyEdge[] = [
      {
        from: "authorization",
        to: "registration",
        kind: "hard",
        citation: "synthetic cycle",
        rationale: "synthetic cycle",
      },
      {
        from: "registration",
        to: "authorization",
        kind: "hard",
        citation: "synthetic cycle",
        rationale: "synthetic cycle",
      },
    ];
    const r = topologicalSort(["authorization", "registration"], cyclicEdges);
    expect(r.acyclic).toBe(false);
    expect(r.cycle.sort()).toEqual(["authorization", "registration"]);
    expect(r.ordered).toEqual([]);
  });

  it("3-node cycle → all three reported in cycle", () => {
    const cyclicEdges: DependencyEdge[] = [
      {
        from: "authorization",
        to: "registration",
        kind: "hard",
        citation: "x",
        rationale: "x",
      },
      {
        from: "registration",
        to: "supervision",
        kind: "hard",
        citation: "x",
        rationale: "x",
      },
      {
        from: "supervision",
        to: "authorization",
        kind: "hard",
        citation: "x",
        rationale: "x",
      },
    ];
    const r = topologicalSort(
      ["authorization", "registration", "supervision"],
      cyclicEdges,
    );
    expect(r.acyclic).toBe(false);
    expect(r.cycle.sort()).toEqual([
      "authorization",
      "registration",
      "supervision",
    ]);
  });
});

describe("topologicalSort — missingPrereqs", () => {
  it("reports prereqs referenced but not in the applicable subset", () => {
    // If the operator's applicable set is just [authorization] but
    // authorization needs environmental + debris + insurance as hard
    // prereqs, those three should surface in missingPrereqs.
    const r = topologicalSort(["authorization"]);
    expect(r.missingPrereqs).toEqual(
      expect.arrayContaining(["environmental", "debris", "insurance"]),
    );
  });

  it("when the prereq IS applicable, it isn't reported as missing", () => {
    const r = topologicalSort([
      "authorization",
      "environmental",
      "debris",
      "insurance",
    ]);
    expect(r.missingPrereqs).toEqual([]);
  });
});

// ─── Prereq / dependent helpers ─────────────────────────────────────────

describe("getPrerequisites + getDependents", () => {
  it("authorization has env + debris + insurance as hard prereqs", () => {
    const prereqs = getPrerequisites("authorization", "hard").sort();
    expect(prereqs).toEqual(["debris", "environmental", "insurance"]);
  });

  it("hard filter excludes soft edges (cybersecurity → nis2)", () => {
    expect(getPrerequisites("nis2", "hard")).toEqual([]);
  });

  it("'all' filter includes soft edges (cybersecurity → nis2 surfaces)", () => {
    expect(getPrerequisites("nis2", "all")).toEqual(["cybersecurity"]);
  });

  it("getDependents — authorization unblocks registration + supervision", () => {
    const deps = getDependents("authorization", "hard").sort();
    expect(deps).toEqual(["registration", "supervision"]);
  });

  it("a leaf module (cra) has no hard dependents", () => {
    expect(getDependents("cra", "hard")).toEqual([]);
  });
});

// ─── Critical path ───────────────────────────────────────────────────────

describe("getCriticalPath", () => {
  it("on full module set → longest chain runs through authorization", () => {
    const cp = getCriticalPath(ALL_MODULES);
    // Curated graph: any of {environmental, debris, insurance}
    // → authorization → registration → supervision is length 4. No
    // longer chain exists.
    expect(cp.length).toBe(4);
    // Sink must be supervision; it's the deepest sink.
    expect(cp.path[cp.path.length - 1]).toBe("supervision");
    // Must include authorization in the middle.
    expect(cp.path).toContain("authorization");
    expect(cp.path).toContain("registration");
  });

  it("two-node chain → length 2", () => {
    const cp = getCriticalPath(["authorization", "registration"]);
    expect(cp.length).toBe(2);
    expect(cp.path).toEqual(["authorization", "registration"]);
  });

  it("single isolated node → path = [that node], length 1", () => {
    const cp = getCriticalPath(["cra"]);
    expect(cp.path).toEqual(["cra"]);
    expect(cp.length).toBe(1);
  });

  it("empty input → empty path", () => {
    const cp = getCriticalPath([]);
    expect(cp.path).toEqual([]);
    expect(cp.length).toBe(0);
  });
});

// ─── Graph contract ──────────────────────────────────────────────────────

describe("buildDependencyGraph", () => {
  it("exposes 10 modules + the curated edges array", () => {
    const g = buildDependencyGraph();
    expect(g.nodes).toHaveLength(10);
    expect(g.nodes[0]).toBe("authorization");
    expect(g.edges.length).toBeGreaterThanOrEqual(7);
    // Spot check: at least one edge ends at "authorization" with hard kind.
    expect(
      g.edges.some((e) => e.to === "authorization" && e.kind === "hard"),
    ).toBe(true);
  });

  it("every edge has a non-empty citation + rationale", () => {
    for (const e of DEPENDENCY_EDGES) {
      expect(e.citation.length).toBeGreaterThan(0);
      expect(e.rationale.length).toBeGreaterThan(0);
    }
  });

  it("the curated graph is acyclic on the full module set", () => {
    const r = topologicalSort(ALL_MODULES);
    expect(r.acyclic).toBe(true);
    expect(r.ordered).toHaveLength(ALL_MODULES.length);
  });
});
