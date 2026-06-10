/**
 * Tests for buildQuickProjection (plan Task 2.2 — the §6b quick redaction).
 * (Not executed here — the orchestrator runs the suite centrally.)
 *
 * Honesty contract under test:
 *  - clusters carry COUNTS + ONE headline — never full finding bodies
 *    (no why/wherefore/whyTrace/evidenceExamples under clusters);
 *  - the headline keeps citation + rulebook pin (invariant 5);
 *  - contested headlines render the collapsed chip data only — flux POSITIONS
 *    never ship on the quick wire (founder §11.4);
 *  - unknowns ship as a COUNT;
 *  - aggregation disclosures are never dropped;
 *  - NO key matches /score/i (invariant 6).
 */

import { describe, it, expect } from "vitest";
import {
  buildQuickProjection,
  type ObligationMapResult,
} from "@/lib/assessment/verdict-pipeline.server";
import type {
  AssessmentFinding,
  ClusterId,
  FindingConfidence,
  FindingVerdict,
} from "@/lib/assessment/finding";

// ── Fixture builders ──

function finding(
  overrides: Partial<AssessmentFinding> & {
    what: string;
    verdict: FindingVerdict;
    confidence: FindingConfidence;
    cluster: ClusterId;
  },
): AssessmentFinding {
  return {
    value: overrides.what,
    why: "Because the matched rule applies to your answers.",
    wherefore: "Prepare the corresponding evidence.",
    whyTrace: [
      { questionId: "q1_1_roles", answerLabel: "Spacecraft operator" },
    ],
    sources: [
      {
        label: "EU Space Act proposal — Commission text",
        citation: "COM(2025) 335 Art. 23",
        asOf: "2025-06-25",
        verified: true,
      },
    ],
    rulebookVersion: "1.0.0",
    ...overrides,
  };
}

const RESULT: ObligationMapResult = {
  rulebookVersion: "1.0.0",
  computedAt: "2026-06-10T12:00:00.000Z",
  tier: "quick",
  scope: [
    finding({
      what: "In scope of the EU Space Act proposal.",
      verdict: "applicable",
      confidence: "DETERMINED",
      cluster: "authorization_registration",
      evidenceExamples: ["scope memo"], // must be stripped on the wire
    }),
  ],
  nis2Gateway: finding({
    what: "NIS2 classification needs clarification.",
    verdict: "conditional",
    confidence: "INDETERMINATE",
    cluster: "resilience_cyber",
  }) as ObligationMapResult["nis2Gateway"],
  regime: finding({
    what: "Likely light regime — verify group structure.",
    verdict: "conditional",
    confidence: "PROBABLE",
    cluster: "authorization_registration",
  }) as ObligationMapResult["regime"],
  clusters: [
    {
      id: "authorization_registration",
      label: "Authorisation & registration",
      findings: [
        finding({
          what: "Advisory only.",
          verdict: "advisory",
          confidence: "PROBABLE",
          cluster: "authorization_registration",
        }),
        finding({
          what: "Authorisation required before launch.",
          verdict: "applicable",
          confidence: "DETERMINED",
          cluster: "authorization_registration",
          evidenceExamples: ["national license reference", "registry extract"],
        }),
      ],
      counts: { applicable: 1, conditional: 0, contested: 0, advisory: 1 },
    },
    {
      id: "resilience_cyber",
      label: "Resilience & cyber",
      findings: [
        finding({
          what: "Resilience chapter routing is contested.",
          verdict: "contested",
          confidence: "PROBABLE",
          cluster: "resilience_cyber",
          fluxFlag: {
            summary: "contested — conservative reading shown",
            conservativeReading: "Space Act resilience chapter applies.",
            positions: [
              { source: "com-2025-335", position: "lex specialis" },
              { source: "ep-itre-draft", position: "chapter deleted" },
            ],
          },
        }),
      ],
      counts: { applicable: 0, conditional: 0, contested: 1, advisory: 0 },
    },
    {
      id: "un_registration",
      label: "UN registration",
      findings: [],
      counts: { applicable: 0, conditional: 0, contested: 0, advisory: 0 },
    },
  ],
  crossFrameworkOverlaps: [],
  noneIdentifiedOverlaps: true,
  unknowns: [
    {
      questionId: "q9_1_rf_spectrum",
      question: "Do you use RF spectrum?",
      whatAnsweringChanges: "Spectrum obligations are existential.",
      priority: "high",
    },
    {
      questionId: "q4_3_ground_segment",
      question: "Ground segment?",
      whatAnsweringChanges: "NIS2 Annex I attachment.",
      priority: "medium",
    },
    {
      questionId: "q8_1_tpl_insurance",
      question: "TPL insurance?",
      whatAnsweringChanges: "Insurance minimums.",
      priority: "medium",
    },
  ],
  aggregationDisclosures: [
    "Heterogeneous fleet: the most restrictive orbital regime governs the merged verdict.",
  ],
  contradictions: [],
};

describe("buildQuickProjection — redaction", () => {
  const projection = buildQuickProjection(RESULT);

  it("marks itself as the quick projection and pins the rulebook", () => {
    expect(projection.kind).toBe("quick_projection");
    expect(projection.rulebookVersion).toBe("1.0.0");
    expect(projection.computedAt).toBe("2026-06-10T12:00:00.000Z");
  });

  it("clusters carry counts + headline ONLY — no full finding bodies", () => {
    for (const cluster of projection.clusters) {
      expect("findings" in cluster).toBe(false);
    }
    const clusterJson = JSON.stringify(projection.clusters);
    expect(clusterJson).not.toContain("whyTrace");
    expect(clusterJson).not.toContain("wherefore");
    expect(clusterJson).not.toContain("evidenceExamples");
    expect(clusterJson).not.toContain("Because the matched rule");
  });

  it("preserves counts and finding totals per cluster", () => {
    const auth = projection.clusters.find(
      (c) => c.id === "authorization_registration",
    )!;
    expect(auth.counts).toEqual({
      applicable: 1,
      conditional: 0,
      contested: 0,
      advisory: 1,
    });
    expect(auth.findingsCount).toBe(2);
  });

  it("picks the most actionable finding as the headline (applicable beats advisory)", () => {
    const auth = projection.clusters.find(
      (c) => c.id === "authorization_registration",
    )!;
    expect(auth.topFinding?.what).toBe("Authorisation required before launch.");
    expect(auth.topFinding?.verdict).toBe("applicable");
    expect(auth.topFinding?.confidence).toBe("DETERMINED");
  });

  it("headlines keep citation + rulebook pin (invariant 5)", () => {
    const auth = projection.clusters.find(
      (c) => c.id === "authorization_registration",
    )!;
    expect(auth.topFinding?.sources[0].citation).toBe("COM(2025) 335 Art. 23");
    expect(auth.topFinding?.sources[0].asOf).toBe("2025-06-25");
    expect(auth.topFinding?.rulebookVersion).toBe("1.0.0");
  });

  it("contested headlines carry the collapsed chip — NEVER the flux positions", () => {
    const cyber = projection.clusters.find((c) => c.id === "resilience_cyber")!;
    expect(cyber.topFinding?.contested).toBe(true);
    expect(cyber.topFinding?.fluxSummary).toBe(
      "contested — conservative reading shown",
    );
    const json = JSON.stringify(cyber);
    expect(json).not.toContain("positions");
    expect(json).not.toContain("lex specialis");
  });

  it("an empty cluster has an honest null headline (no fabricated findings)", () => {
    const un = projection.clusters.find((c) => c.id === "un_registration")!;
    expect(un.topFinding).toBeNull();
    expect(un.findingsCount).toBe(0);
  });

  it("unknowns ship as a COUNT only", () => {
    expect(projection.unknownsCount).toBe(3);
    expect("unknowns" in projection).toBe(false);
  });

  it("scope / gateway / regime ship as full envelopes WITHOUT evidenceExamples", () => {
    expect(projection.scope[0].why).toContain("matched rule");
    expect(projection.scope[0].evidenceExamples).toBeUndefined();
    expect("evidenceExamples" in projection.scope[0]).toBe(false);
    expect(projection.nis2Gateway.what).toContain("needs clarification");
    expect(projection.regime.what).toContain("light regime");
  });

  it("aggregation disclosures are never dropped (honesty over conversion)", () => {
    expect(projection.aggregationDisclosures).toEqual(
      RESULT.aggregationDisclosures,
    );
  });

  it("contains NO key matching /score/i and no overall aggregate (invariant 6)", () => {
    const keys = new Set<string>();
    const walk = (v: unknown): void => {
      if (Array.isArray(v)) return v.forEach(walk);
      if (v !== null && typeof v === "object") {
        for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
          keys.add(k);
          walk(val);
        }
      }
    };
    walk(projection);
    for (const k of keys) expect(k).not.toMatch(/score/i);
  });

  it("is pure — the input result is not mutated", () => {
    const before = JSON.stringify(RESULT);
    buildQuickProjection(RESULT);
    expect(JSON.stringify(RESULT)).toBe(before);
  });
});
