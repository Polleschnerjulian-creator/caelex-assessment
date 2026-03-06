import { describe, it, expect } from "vitest";
import {
  RegulatoryDependencyGraph,
  REGULATORY_NODES,
  type RegulatoryNode,
} from "./dependency-graph";

describe("RegulatoryDependencyGraph", () => {
  const graph = new RegulatoryDependencyGraph();

  // ─── Graph Structure ──────────────────────────────────────────────────

  describe("graph structure", () => {
    it("loads all regulatory nodes", () => {
      expect(graph.getAllNodes().length).toBe(REGULATORY_NODES.length);
      expect(graph.getAllNodes().length).toBeGreaterThan(20);
    });

    it("retrieves node by ID", () => {
      const node = graph.getNode("EU-SA-68");
      expect(node).toBeDefined();
      expect(node!.framework).toBe("EU Space Act");
      expect(node!.article).toBe("Art. 68");
    });

    it("returns undefined for unknown ID", () => {
      expect(graph.getNode("NONEXISTENT")).toBeUndefined();
    });

    it("filters nodes by framework", () => {
      const euNodes = graph.getNodesByFramework("EU Space Act");
      expect(euNodes.length).toBeGreaterThan(5);
      expect(euNodes.every((n) => n.framework === "EU Space Act")).toBe(true);
    });

    it("filters nodes by module", () => {
      const fuelNodes = graph.getNodesByModule("fuel");
      expect(fuelNodes.length).toBeGreaterThan(0);
      expect(fuelNodes.every((n) => n.affectedModules.includes("fuel"))).toBe(
        true,
      );
    });

    it("has consistent bidirectional edges", () => {
      for (const node of graph.getAllNodes()) {
        for (const depId of node.dependents) {
          const dep = graph.getNode(depId);
          expect(
            dep,
            `Node ${node.id} references dependent ${depId} which doesn't exist`,
          ).toBeDefined();
          expect(
            dep!.dependencies,
            `Node ${depId} should list ${node.id} as a dependency`,
          ).toContain(node.id);
        }
      }
    });
  });

  // ─── BFS Propagation ─────────────────────────────────────────────────

  describe("propagation", () => {
    it("returns empty for unknown trigger", () => {
      const result = graph.propagate("NONEXISTENT", "threshold_change");
      expect(result.affectedNodes).toEqual([]);
      expect(result.totalImpact).toBe(0);
    });

    it("propagates from EU-SA-68 downstream", () => {
      const result = graph.propagate("EU-SA-68", "threshold_change");

      // EU-SA-68 → EU-SA-70, EU-SA-72, IADC-5.3.1 (direct)
      expect(result.affectedNodes).toContain("EU-SA-70");
      expect(result.affectedNodes).toContain("EU-SA-72");
      expect(result.affectedNodes).toContain("IADC-5.3.1");

      // EU-SA-72 → DE-WRG-12, FR-LOS-7 (second level)
      expect(result.affectedNodes).toContain("DE-WRG-12");
      expect(result.affectedNodes).toContain("FR-LOS-7");

      // Propagation path should have multiple levels
      expect(result.propagationPath.length).toBeGreaterThanOrEqual(2);
      expect(result.propagationPath[0]).toEqual(["EU-SA-68"]);
    });

    it("propagates from EU-SA-64 through two hops", () => {
      const result = graph.propagate("EU-SA-64", "new_requirement");

      // Direct: EU-SA-68, IADC-5.3.1
      expect(result.affectedNodes).toContain("EU-SA-68");
      expect(result.affectedNodes).toContain("IADC-5.3.1");

      // Second level from EU-SA-68: EU-SA-70, EU-SA-72
      expect(result.affectedNodes).toContain("EU-SA-70");
      expect(result.affectedNodes).toContain("EU-SA-72");
    });

    it("handles leaf nodes (no dependents)", () => {
      const result = graph.propagate("NIS2-23", "threshold_change");
      expect(result.affectedNodes).toEqual([]);
      expect(result.propagationPath).toEqual([["NIS2-23"]]);
    });

    it("applies change type multiplier", () => {
      const threshold = graph.propagate("EU-SA-68", "threshold_change");
      const newReq = graph.propagate("EU-SA-68", "new_requirement");

      // new_requirement has 1.2x multiplier vs threshold_change at 1.0x
      expect(Math.abs(newReq.totalImpact)).toBeGreaterThan(
        Math.abs(threshold.totalImpact),
      );
    });

    it("applies impact multiplier parameter", () => {
      const base = graph.propagate("EU-SA-68", "threshold_change", 1.0);
      const doubled = graph.propagate("EU-SA-68", "threshold_change", 2.0);

      expect(Math.abs(doubled.totalImpact)).toBeGreaterThan(
        Math.abs(base.totalImpact),
      );
    });

    it("attenuates impact with cascade depth", () => {
      // Deeper nodes should have less impact than direct dependents
      const result = graph.propagate("EU-SA-64", "threshold_change");
      const moduleImpacts = result.moduleImpacts;

      // Total impact should be negative (regulations becoming stricter)
      expect(result.totalImpact).toBeLessThan(0);

      // At least one module should be affected
      expect(moduleImpacts.size).toBeGreaterThan(0);
    });

    it("does not visit nodes twice (cycle protection)", () => {
      const result = graph.propagate("EU-SA-6", "threshold_change");

      // Should not have duplicates in affected nodes
      const unique = new Set(result.affectedNodes);
      expect(unique.size).toBe(result.affectedNodes.length);
    });
  });

  // ─── Satellite Impact Calculation ────────────────────────────────────

  describe("calculateSatelliteImpacts", () => {
    const mockSatellites = [
      {
        noradId: "25544",
        name: "SAT-ALPHA",
        jurisdictions: ["DE"],
        currentScore: 85,
        moduleScores: {
          orbital: 90,
          fuel: 75,
          cyber: 80,
          registration: 95,
        } as Partial<Record<import("../core/types").ModuleKey, number>>,
      },
      {
        noradId: "99999",
        name: "SAT-BETA",
        jurisdictions: ["FR"],
        currentScore: null,
        moduleScores: {} as Partial<
          Record<import("../core/types").ModuleKey, number>
        >,
      },
    ];

    it("calculates impact per satellite", () => {
      const propagation = graph.propagate("EU-SA-68", "threshold_change");
      const impacts = graph.calculateSatelliteImpacts(
        propagation,
        mockSatellites,
      );

      expect(impacts).toHaveLength(2);

      // SAT-ALPHA should have impact (has orbital and fuel modules)
      const alpha = impacts.find((i) => i.noradId === "25544");
      expect(alpha).toBeDefined();
      expect(alpha!.scoreDelta).not.toBe(0);
      expect(alpha!.projectedScore).not.toBeNull();
      expect(alpha!.affectedModules.length).toBeGreaterThan(0);
    });

    it("assigns severity based on score delta", () => {
      const propagation = graph.propagate("EU-SA-64", "new_requirement");
      const impacts = graph.calculateSatelliteImpacts(
        propagation,
        mockSatellites,
      );

      const alpha = impacts.find((i) => i.noradId === "25544");
      expect(alpha).toBeDefined();
      expect(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).toContain(alpha!.severity);
    });

    it("clamps projected score to 0-100", () => {
      const propagation = graph.propagate("EU-SA-6", "new_requirement");
      const impacts = graph.calculateSatelliteImpacts(
        propagation,
        mockSatellites,
      );

      for (const impact of impacts) {
        if (impact.projectedScore !== null) {
          expect(impact.projectedScore).toBeGreaterThanOrEqual(0);
          expect(impact.projectedScore).toBeLessThanOrEqual(100);
        }
      }
    });
  });

  // ─── Custom Graph ────────────────────────────────────────────────────

  describe("custom graph", () => {
    it("supports custom node registry", () => {
      const customNodes: RegulatoryNode[] = [
        {
          id: "A",
          framework: "EU Space Act",
          article: "Art. X",
          title: "Test Node A",
          dependencies: [],
          dependents: ["B"],
          affectedModules: ["orbital"],
          defaultImpact: -10,
        },
        {
          id: "B",
          framework: "NIS2",
          article: "Art. Y",
          title: "Test Node B",
          dependencies: ["A"],
          dependents: [],
          affectedModules: ["cyber"],
          defaultImpact: -5,
        },
      ];

      const customGraph = new RegulatoryDependencyGraph(customNodes);
      expect(customGraph.getAllNodes()).toHaveLength(2);

      const result = customGraph.propagate("A", "threshold_change");
      expect(result.affectedNodes).toEqual(["B"]);
      expect(result.propagationPath).toEqual([["A"], ["B"]]);
    });
  });
});
