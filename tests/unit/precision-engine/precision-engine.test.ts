import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

// Mock the ontology query — we control what "the graph would return".
vi.mock("@/lib/ontology/traverse", () => ({
  getObligationsForOperator: vi.fn(),
}));

import { runPrecisionEngine } from "@/lib/comply-v2/precision-engine";
import { resolveApplicability } from "@/lib/comply-v2/precision-engine/applicability-resolver";
import { generateItems } from "@/lib/comply-v2/precision-engine/item-generator";
import {
  resolveDependencies,
  explainDependency,
} from "@/lib/comply-v2/precision-engine/dependency-resolver";
import { planTimeBackward } from "@/lib/comply-v2/precision-engine/time-backward-planner";
import * as ontology from "@/lib/ontology/traverse";
import type { ObligationResult } from "@/lib/ontology/types";
import type { GeneratedComplianceItem } from "@/lib/comply-v2/precision-engine/types";

// ─── Helpers ───────────────────────────────────────────────────────────────

function obligation(
  overrides: Partial<ObligationResult> = {},
): ObligationResult {
  return {
    nodeId: overrides.nodeId ?? "node-1",
    code: overrides.code ?? "AUTHORIZATION-EU-001",
    label: overrides.label ?? "Authorization application",
    confidence: overrides.confidence ?? 0.95,
    source: overrides.source ?? {
      framework: "EU_SPACE_ACT",
      reference: "Art. 7",
    },
    domain: overrides.domain ?? "AUTHORIZATION",
    jurisdictions: overrides.jurisdictions ?? ["DE"],
    evidenceRequired: overrides.evidenceRequired ?? [],
    euSpaceActMapping: overrides.euSpaceActMapping ?? {
      articleRef: "Art. 7",
      relationship: "IMPLEMENTS",
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── applicability-resolver ────────────────────────────────────────────────

describe("applicability-resolver", () => {
  it("normalizes ISO country codes to upper-case", () => {
    const result = resolveApplicability({
      operatorType: "SCO",
      jurisdictions: ["de", "Fr"],
    });
    expect(result).not.toBeNull();
    expect(result!.context.jurisdictions).toEqual(["DE", "FR"]);
  });

  it("dedupes jurisdictions", () => {
    const result = resolveApplicability({
      operatorType: "SCO",
      jurisdictions: ["DE", "de", "DE"],
    });
    expect(result!.context.jurisdictions).toEqual(["DE"]);
  });

  it("returns null when operatorType is missing", () => {
    const result = resolveApplicability({
      operatorType: "",
      jurisdictions: ["DE"],
    });
    expect(result).toBeNull();
  });

  it("returns null when no jurisdiction signal available", () => {
    const result = resolveApplicability({
      operatorType: "SCO",
      jurisdictions: [],
    });
    expect(result).toBeNull();
  });

  it("falls back to enriched.countryCode when jurisdictions empty", () => {
    const result = resolveApplicability(
      { operatorType: "SCO", jurisdictions: [] },
      {
        countryCode: {
          value: "DE",
          confidence: 0.9,
          sources: [
            {
              system: "vies",
              id: "DE1",
              confidence: 0.9,
              fetchedAt: new Date().toISOString(),
            },
          ],
        },
      },
    );
    expect(result).not.toBeNull();
    expect(result!.context.jurisdictions).toEqual(["DE"]);
    expect(result!.warnings.length).toBeGreaterThan(0);
  });

  it("filters invalid country codes (must be 2 ASCII letters)", () => {
    const result = resolveApplicability({
      operatorType: "SCO",
      jurisdictions: ["DE", "XYZ", "1", "fr"],
    });
    expect(result!.context.jurisdictions.sort()).toEqual(["DE", "FR"]);
  });

  it("warns on invalid constellationSize but does not reject", () => {
    const result = resolveApplicability({
      operatorType: "SCO",
      jurisdictions: ["DE"],
      constellationSize: -5,
    });
    expect(result!.context.constellationSize).toBeUndefined();
    expect(result!.warnings.some((w) => w.includes("constellationSize"))).toBe(
      true,
    );
  });
});

// ─── item-generator ────────────────────────────────────────────────────────

describe("item-generator", () => {
  it("maps a single obligation to a GeneratedComplianceItem", async () => {
    const result = await generateItems(
      {
        operatorType: "SCO",
        jurisdictions: ["DE"],
      },
      { obligationsOverride: [obligation()] },
    );

    expect(result.items).toHaveLength(1);
    const item = result.items[0]!;
    expect(item.id).toBe("EU_SPACE_ACT:AUTHORIZATION-EU-001");
    expect(item.title).toBe("Authorization application");
    expect(item.regulationRef).toBe("EU_SPACE_ACT");
    expect(item.priority).toBe("URGENT"); // matches AUTHORIZATION pattern
    expect(item.origin.framework).toBe("EU_SPACE_ACT");
  });

  it("infers regulationRef for NIS2", async () => {
    const result = await generateItems(
      { operatorType: "SCO", jurisdictions: ["DE"] },
      {
        obligationsOverride: [
          obligation({
            code: "NIS2-RISK-001",
            label: "Risk management",
            domain: "CYBERSECURITY",
            source: { framework: "NIS2", reference: "Art. 21" },
            euSpaceActMapping: null,
          }),
        ],
      },
    );
    expect(result.items[0]!.regulationRef).toBe("NIS2");
  });

  it("infers regulationRef for DE_BWRG from framework prefix", async () => {
    const result = await generateItems(
      { operatorType: "SCO", jurisdictions: ["DE"] },
      {
        obligationsOverride: [
          obligation({
            code: "BWRG-12-01",
            source: { framework: "DE_BWRG_2024", reference: "§ 12 Abs. 1" },
            euSpaceActMapping: null,
          }),
        ],
      },
    );
    expect(result.items[0]!.regulationRef).toBe("DE_BWRG");
  });

  it("skips LEO-specific obligations for non-LEO operators", async () => {
    const result = await generateItems(
      {
        operatorType: "SCO",
        jurisdictions: ["DE"],
        primaryOrbit: "GEO",
      },
      {
        obligationsOverride: [
          obligation({ code: "LEO-DEORBIT-001", label: "LEO deorbit" }),
        ],
      },
    );

    expect(result.items).toHaveLength(0);
    expect(result.warnings.some((w) => w.includes("LEO-specific"))).toBe(true);
  });

  it("downgrades LEO-obligation confidence when no orbit signal", async () => {
    const result = await generateItems(
      { operatorType: "SCO", jurisdictions: ["DE"] }, // no primaryOrbit
      {
        obligationsOverride: [
          obligation({ code: "LEO-DEORBIT-001", confidence: 0.95 }),
        ],
      },
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.confidence).toBeLessThan(0.95);
  });

  it("bumps priority to URGENT for constellation operators on Art. 70", async () => {
    const result = await generateItems(
      {
        operatorType: "SCO",
        jurisdictions: ["DE"],
        constellationSize: 24,
      },
      {
        obligationsOverride: [
          obligation({
            code: "MEGA-CONSTELLATION-COORDINATION",
            label: "Constellation coordination",
            source: { framework: "EU_SPACE_ACT", reference: "Art. 70" },
            euSpaceActMapping: {
              articleRef: "Art. 70",
              relationship: "IMPLEMENTS",
            },
          }),
        ],
      },
    );
    expect(result.items[0]!.priority).toBe("URGENT");
  });

  it("dedupes obligations with the same code", async () => {
    const ob = obligation();
    const result = await generateItems(
      { operatorType: "SCO", jurisdictions: ["DE"] },
      { obligationsOverride: [ob, ob, ob] },
    );
    expect(result.items).toHaveLength(1);
  });
});

// ─── dependency-resolver ───────────────────────────────────────────────────

describe("dependency-resolver", () => {
  function makeItem(id: string): GeneratedComplianceItem {
    return {
      id,
      title: id,
      requirementCode: id.split(":")[1] ?? id,
      regulationRef: "EU_SPACE_ACT",
      domain: "AUTHORIZATION",
      jurisdictions: ["DE"],
      articleRef: "",
      confidence: 0.9,
      priority: "MEDIUM",
      targetDate: null,
      startDate: null,
      evidenceRequired: [],
      dependsOn: [],
      origin: {
        ontologyNodeId: "n",
        framework: "EU_SPACE_ACT",
        reference: "ref",
        match: "operator-type",
      },
    };
  }

  it("adds dependency: launch-license depends on authorization", () => {
    const items = [
      makeItem("EU_SPACE_ACT:LAUNCH-LICENSE-001"),
      makeItem("EU_SPACE_ACT:AUTHORIZATION-001"),
    ];
    const ordered = resolveDependencies(items);

    // Authorization first in topological order.
    expect(ordered[0]!.id).toBe("EU_SPACE_ACT:AUTHORIZATION-001");
    expect(ordered[1]!.id).toBe("EU_SPACE_ACT:LAUNCH-LICENSE-001");
    expect(ordered[1]!.dependsOn).toContain("EU_SPACE_ACT:AUTHORIZATION-001");
  });

  it("preserves input order for items without dependencies", () => {
    const items = [
      makeItem("NIS2:GOVERNANCE-01"),
      makeItem("NIS2:GOVERNANCE-02"),
      makeItem("NIS2:GOVERNANCE-03"),
    ];
    const ordered = resolveDependencies(items);
    expect(ordered.map((i) => i.id)).toEqual([
      "NIS2:GOVERNANCE-01",
      "NIS2:GOVERNANCE-02",
      "NIS2:GOVERNANCE-03",
    ]);
  });

  it("explainDependency returns the rule reason", () => {
    const reason = explainDependency(
      "EU_SPACE_ACT:AUTHORIZATION-001",
      "EU_SPACE_ACT:LAUNCH-LICENSE-001",
    );
    expect(reason).toMatch(/Authorization required before launch/);
  });

  it("explainDependency returns null when no rule matches", () => {
    const reason = explainDependency(
      "NIS2:GOVERNANCE-01",
      "NIS2:GOVERNANCE-02",
    );
    expect(reason).toBeNull();
  });

  it("handles 0 and 1 item arrays without crashing", () => {
    expect(resolveDependencies([])).toEqual([]);
    const single = [makeItem("X:Y")];
    expect(resolveDependencies(single)).toEqual(single);
  });
});

// ─── time-backward-planner ─────────────────────────────────────────────────

describe("time-backward-planner", () => {
  function authorizationItem(): GeneratedComplianceItem {
    return {
      id: "EU_SPACE_ACT:AUTHORIZATION-001",
      title: "Authorization",
      requirementCode: "AUTHORIZATION-001",
      regulationRef: "EU_SPACE_ACT",
      domain: "AUTHORIZATION",
      jurisdictions: ["DE"],
      articleRef: "Art. 7",
      confidence: 0.95,
      priority: "URGENT",
      targetDate: null,
      startDate: null,
      evidenceRequired: [],
      dependsOn: [],
      origin: {
        ontologyNodeId: "n",
        framework: "EU_SPACE_ACT",
        reference: "Art. 7",
        match: "operator-type",
      },
    };
  }

  it("plans 12 months before launch for AUTHORIZATION when launch is far enough out", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const launch = new Date("2028-01-01T00:00:00Z");

    const out = planTimeBackward(
      [authorizationItem()],
      {
        operatorType: "SCO",
        jurisdictions: ["DE"],
        plannedLaunchDate: launch,
      },
      { now },
    );

    expect(out[0]!.targetDate).toEqual(new Date("2027-01-01T00:00:00Z"));
  });

  it("falls back to rolling plan when no launch date", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const out = planTimeBackward(
      [authorizationItem()],
      { operatorType: "SCO", jurisdictions: ["DE"] },
      { now },
    );

    expect(out[0]!.targetDate).not.toBeNull();
    expect(out[0]!.startDate).not.toBeNull();
    expect(out[0]!.targetDate!.getTime()).toBeGreaterThan(now.getTime());
  });

  it("floors startDate to tomorrow when launch is very close", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const launch = new Date("2026-02-01T00:00:00Z"); // ~1 month — way too close
    const out = planTimeBackward(
      [authorizationItem()],
      {
        operatorType: "SCO",
        jurisdictions: ["DE"],
        plannedLaunchDate: launch,
      },
      { now },
    );

    expect(out[0]!.startDate!.getTime()).toBeGreaterThan(now.getTime());
  });

  it("uses different offsets per obligation type (SPECTRUM > AUTH > LAUNCH)", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const launch = new Date("2028-06-01T00:00:00Z");

    const items: GeneratedComplianceItem[] = [
      { ...authorizationItem(), id: "ITU:SPECTRUM-FILING-001" },
      { ...authorizationItem(), id: "EU_SPACE_ACT:AUTHORIZATION-001" },
      { ...authorizationItem(), id: "EU_SPACE_ACT:LAUNCH-LICENSE-001" },
    ];

    const out = planTimeBackward(
      items,
      {
        operatorType: "SCO",
        jurisdictions: ["DE"],
        plannedLaunchDate: launch,
      },
      { now },
    );

    // Spectrum should be earliest (target = launch - 18m), then authorization
    // (launch - 12m), then launch license (launch - 6m).
    const byId = Object.fromEntries(out.map((i) => [i.id, i]));
    expect(byId["ITU:SPECTRUM-FILING-001"]!.targetDate!.getTime()).toBeLessThan(
      byId["EU_SPACE_ACT:AUTHORIZATION-001"]!.targetDate!.getTime(),
    );
    expect(
      byId["EU_SPACE_ACT:AUTHORIZATION-001"]!.targetDate!.getTime(),
    ).toBeLessThan(
      byId["EU_SPACE_ACT:LAUNCH-LICENSE-001"]!.targetDate!.getTime(),
    );
  });
});

// ─── runPrecisionEngine (end-to-end) ───────────────────────────────────────

describe("runPrecisionEngine — full pipeline", () => {
  it("returns SUCCESS with items + stats for a valid operator", async () => {
    vi.mocked(ontology.getObligationsForOperator).mockResolvedValue([
      obligation({ code: "AUTH-001", label: "Authorization application" }),
      obligation({
        code: "NIS2-RISK-001",
        label: "Risk management",
        source: { framework: "NIS2", reference: "Art. 21" },
        domain: "CYBERSECURITY",
        euSpaceActMapping: null,
      }),
      obligation({
        code: "LAUNCH-LICENSE-001",
        label: "Launch license",
        euSpaceActMapping: { articleRef: "Art. 8", relationship: "IMPLEMENTS" },
      }),
    ]);

    const result = await runPrecisionEngine({
      organizationId: "org-1",
      applicability: {
        operatorType: "SCO",
        jurisdictions: ["DE"],
        plannedLaunchDate: new Date("2028-01-01T00:00:00Z"),
      },
      now: new Date("2026-01-01T00:00:00Z"),
    });

    expect(result.status).toBe("SUCCESS");
    expect(result.items).toHaveLength(3);
    expect(result.stats.itemsGenerated).toBe(3);
    expect(result.itemsByDomain.AUTHORIZATION).toBeDefined();
    expect(result.itemsByDomain.CYBERSECURITY).toBeDefined();

    // Authorization should be ordered before launch-license (dependency).
    const authIdx = result.items.findIndex(
      (i) => i.id === "EU_SPACE_ACT:AUTH-001",
    );
    const launchIdx = result.items.findIndex(
      (i) => i.id === "EU_SPACE_ACT:LAUNCH-LICENSE-001",
    );
    expect(authIdx).toBeLessThan(launchIdx);

    // Every item should have target + start dates set.
    for (const item of result.items) {
      expect(item.targetDate).not.toBeNull();
      expect(item.startDate).not.toBeNull();
    }
  });

  it("returns EMPTY when ontology returns no obligations", async () => {
    vi.mocked(ontology.getObligationsForOperator).mockResolvedValue([]);

    const result = await runPrecisionEngine({
      organizationId: "org-1",
      applicability: { operatorType: "SCO", jurisdictions: ["DE"] },
    });

    expect(result.status).toBe("EMPTY");
    expect(result.items).toEqual([]);
  });

  it("returns EMPTY when applicability cannot be resolved", async () => {
    const result = await runPrecisionEngine({
      organizationId: "org-1",
      applicability: { operatorType: "", jurisdictions: [] },
    });
    expect(result.status).toBe("EMPTY");
    expect(result.warnings[0]).toMatch(/lacks operatorType/);
  });

  it("returns FAILED if the ontology query throws", async () => {
    vi.mocked(ontology.getObligationsForOperator).mockRejectedValue(
      new Error("DB down"),
    );

    const result = await runPrecisionEngine({
      organizationId: "org-1",
      applicability: { operatorType: "SCO", jurisdictions: ["DE"] },
    });

    expect(result.status).toBe("FAILED");
    expect(result.warnings.some((w) => w.includes("DB down"))).toBe(true);
  });

  it("propagates domain filter to ontology query", async () => {
    vi.mocked(ontology.getObligationsForOperator).mockResolvedValue([]);

    await runPrecisionEngine({
      organizationId: "org-1",
      applicability: { operatorType: "SCO", jurisdictions: ["DE"] },
      domain: "CYBERSECURITY",
    });

    expect(ontology.getObligationsForOperator).toHaveBeenCalledWith(
      expect.objectContaining({ domain: "CYBERSECURITY" }),
    );
  });

  it("computes stats accurately", async () => {
    vi.mocked(ontology.getObligationsForOperator).mockResolvedValue([
      obligation({ code: "A-1", domain: "AUTHORIZATION" }),
      obligation({ code: "C-1", domain: "CYBERSECURITY" }),
      obligation({ code: "C-2", domain: "CYBERSECURITY" }),
    ]);

    const result = await runPrecisionEngine({
      organizationId: "org-1",
      applicability: { operatorType: "SCO", jurisdictions: ["DE"] },
    });

    expect(result.stats.itemsByRegulation.EU_SPACE_ACT).toBe(3);
    // A-1, C-1, C-2 codes don't match URGENT regex; with EU_SPACE_ACT framework
    // they default to MEDIUM bucket.
    expect(result.stats.itemsByPriority.MEDIUM).toBe(3);
  });
});
