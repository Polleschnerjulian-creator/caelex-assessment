// src/data/assessment/question-graph.test.ts — Tasks 1.5 + 1.6.
//
// Integrity tests for the question-graph dataset: the §7 corrections are
// LOCKED here so the regulatory errors cannot be recreated (banned ids, the
// no-option-value-"unsure" convention, citation hygiene, the corrected gate
// shapes, the new §7.2 cluster questions, and the §7.3 quick-tier screen
// arithmetic via countScreens).

import { describe, expect, it } from "vitest";

import {
  BATTERY_ITEM_STATUSES,
  QUESTION_GRAPH,
  QUESTION_IDS,
  UK_NEXUS,
} from "@/data/assessment/question-graph";
import type {
  Condition,
  QuestionNode,
} from "@/data/assessment/question-graph-types";
import type { AnswerMap } from "@/lib/assessment/answers";
import {
  countScreens,
  visibleQuestions,
} from "@/lib/assessment/graph-evaluator";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function nodeById(id: string): QuestionNode {
  const node = QUESTION_GRAPH.find((n) => n.id === id);
  if (!node) throw new Error(`Expected question "${id}" to exist in the graph`);
  return node;
}

interface ConditionLeaf {
  q: string;
  op: string;
  value?: unknown;
}

function conditionLeaves(cond: Condition): ConditionLeaf[] {
  if ("all" in cond) return cond.all.flatMap(conditionLeaves);
  if ("any" in cond) return cond.any.flatMap(conditionLeaves);
  if ("not" in cond) return conditionLeaves(cond.not);
  return [
    "value" in cond
      ? { q: cond.q, op: cond.op, value: cond.value }
      : { q: cond.q, op: cond.op },
  ];
}

function optionValues(node: QuestionNode): Set<string> {
  const values = new Set<string>();
  for (const o of node.options ?? []) values.add(o.value);
  for (const o of node.quickVariant?.options ?? []) values.add(o.value);
  return values;
}

const answered = (value: string | string[]): AnswerMap[string] => ({
  state: "answered",
  value,
});

// ─── Graph integrity (Task 1.5) ──────────────────────────────────────────────

describe("question-graph integrity", () => {
  it("has unique question ids", () => {
    const ids = QUESTION_GRAPH.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("QUESTION_IDS mirrors the graph", () => {
    expect(QUESTION_IDS.size).toBe(QUESTION_GRAPH.length);
    for (const node of QUESTION_GRAPH) {
      expect(QUESTION_IDS.has(node.id)).toBe(true);
    }
  });

  it("every showIf references only existing question ids", () => {
    for (const node of QUESTION_GRAPH) {
      if (!node.showIf) continue;
      for (const leaf of conditionLeaves(node.showIf)) {
        expect(
          QUESTION_IDS.has(leaf.q),
          `${node.id}.showIf references unknown question "${leaf.q}"`,
        ).toBe(true);
      }
    }
  });

  it("every derivedFrom id exists in the graph", () => {
    for (const node of QUESTION_GRAPH) {
      for (const ref of node.derivedFrom ?? []) {
        expect(
          QUESTION_IDS.has(ref),
          `${node.id}.derivedFrom references unknown question "${ref}"`,
        ).toBe(true);
      }
    }
  });

  it("every question has a non-empty why and >=1 citation with ISO asOf + boolean verified", () => {
    for (const node of QUESTION_GRAPH) {
      expect(
        node.why.trim().length,
        `${node.id} has empty why`,
      ).toBeGreaterThan(0);
      expect(
        node.citation.length,
        `${node.id} has no citation`,
      ).toBeGreaterThanOrEqual(1);
      for (const source of node.citation) {
        expect(source.label.trim().length).toBeGreaterThan(0);
        expect(source.citation.trim().length).toBeGreaterThan(0);
        expect(
          source.asOf,
          `${node.id} citation asOf "${source.asOf}" is not an ISO date`,
        ).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(typeof source.verified).toBe("boolean");
      }
    }
  });

  it("showIf option-value references resolve against the target's options", () => {
    const byId = new Map(QUESTION_GRAPH.map((n) => [n.id, n]));
    const conditions: Array<{ owner: string; cond: Condition }> = [
      ...QUESTION_GRAPH.filter((n) => n.showIf !== undefined).map((n) => ({
        owner: n.id,
        cond: n.showIf as Condition,
      })),
      { owner: "UK_NEXUS", cond: UK_NEXUS },
    ];
    for (const { owner, cond } of conditions) {
      for (const leaf of conditionLeaves(cond)) {
        if (!["eq", "neq", "in", "includes"].includes(leaf.op)) continue;
        const target = byId.get(leaf.q);
        if (!target) continue; // covered by the existing-id test
        const values = optionValues(target);
        if (values.size === 0) continue; // country_multi / text — free values
        const referenced = Array.isArray(leaf.value)
          ? leaf.value
          : [leaf.value];
        for (const v of referenced) {
          expect(
            values.has(String(v)),
            `${owner} references value "${String(v)}" not offered by ${leaf.q}`,
          ).toBe(true);
        }
      }
    }
  });
});

// ─── Banned ids (§7.3 cuts) + banned citations (§7.1) ────────────────────────

describe("§7.3 cut questions stay cut", () => {
  const BANNED_PREFIXES = ["q1_8", "q8_3", "q5_3", "q4_7", "q3_5"];

  it.each(BANNED_PREFIXES)("no question id %s exists", (banned) => {
    for (const id of QUESTION_IDS) {
      expect(
        id === banned || id.startsWith(`${banned}_`),
        `cut question "${banned}" reappeared as "${id}"`,
      ).toBe(false);
    }
  });

  it("no q1_5_size_bands node exists (two band nodes on one screen instead)", () => {
    expect(QUESTION_IDS.has("q1_5_size_bands")).toBe(false);
  });
});

describe("§7.1 citation hygiene", () => {
  const serialized = JSON.stringify(QUESTION_GRAPH);

  it("no string anywhere contains 'general approach' (no Council position exists)", () => {
    expect(serialized.toLowerCase()).not.toContain("general approach");
  });

  it("no string anywhere contains '75a' (unverified citation)", () => {
    expect(serialized).not.toContain("75a");
    expect(serialized).not.toContain("75 a");
  });
});

// ─── Unsure-encoding convention (Task 1.3, binding) ──────────────────────────

describe("unsure is never an option value", () => {
  it("no QuestionOption.value (base or quickVariant) equals 'unsure'", () => {
    for (const node of QUESTION_GRAPH) {
      for (const option of [
        ...(node.options ?? []),
        ...(node.quickVariant?.options ?? []),
      ]) {
        expect(
          option.value,
          `${node.id} encodes unsure as an option value — forbidden (Task 1.3 convention)`,
        ).not.toBe("unsure");
      }
    }
  });

  it("battery per-item statuses are a separate vocabulary (contains 'unsure' as a STATUS, not an option)", () => {
    // Documents the layering: the per-item readiness status "unsure" lives
    // inside the composite answered value of q6_6 — it is not a question
    // option and not a question-level answer state.
    expect(BATTERY_ITEM_STATUSES).toContain("unsure");
    expect(nodeById("q6_6_battery").options).toBeUndefined();
  });
});

// ─── §7-corrected shapes, sections 1–5 (Task 1.5) ────────────────────────────

describe("section 1 — identity & role", () => {
  it("q1_1_roles has exactly 10 options including component_supplier", () => {
    const node = nodeById("q1_1_roles");
    expect(node.options).toHaveLength(10);
    const values = optionValues(node);
    for (const required of [
      "spacecraft_operator",
      "launch_operator",
      "launch_site_operator",
      "in_space_service_provider",
      "collision_avoidance_provider",
      "data_provider",
      "ground_segment_operator",
      "hosted_payload_owner",
      "reseller_distributor",
      "component_supplier",
    ]) {
      expect(values.has(required), `missing role "${required}"`).toBe(true);
    }
  });

  it("q1_4_org_type folds research status + IGO into ONE question (§7.3)", () => {
    const node = nodeById("q1_4_org_type");
    expect(node.tier).toBe("both");
    expect(node.options).toHaveLength(4);
    const values = optionValues(node);
    expect(values.has("research_edu")).toBe(true);
    expect(values.has("igo")).toBe(true);
    // No separate q1_4-prefixed research question exists.
    const q14Nodes = [...QUESTION_IDS].filter((id) => id.startsWith("q1_4"));
    expect(q14Nodes).toEqual(["q1_4_org_type"]);
  });

  it("q1_5 size bands are TWO nodes sharing screenGroup q1_5_size", () => {
    const headcount = nodeById("q1_5_headcount");
    const turnover = nodeById("q1_5_turnover");
    expect(headcount.screenGroup).toBe("q1_5_size");
    expect(turnover.screenGroup).toBe("q1_5_size");
    expect(headcount.kind).toBe("bands");
    expect(turnover.kind).toBe("bands");
    expect(headcount.unsureMode).toBe("option");
    expect(turnover.unsureMode).toBe("option");
    expect([...optionValues(headcount)]).toEqual([
      "h_1_9",
      "h_10_49",
      "h_50_249",
      "h_250_plus",
    ]);
    expect([...optionValues(turnover)]).toEqual([
      "t_lt_2m",
      "t_2_10m",
      "t_10_50m",
      "t_gt_50m",
    ]);
  });

  it("q1_5_turnover why carries the §7.1 #4 AND-condition correction", () => {
    expect(nodeById("q1_5_turnover").why).toContain(
      "turnover >€50M AND balance sheet >€43M",
    );
  });

  it("q1_7 group structure is pushed to the full tier (§7.3 trim)", () => {
    expect(nodeById("q1_7_group").tier).toBe("full");
    expect(nodeById("q1_7_group_headcount").tier).toBe("full");
    expect(nodeById("q1_7_group_turnover").tier).toBe("full");
  });

  it("q1_9 defense gate is trinary with first-class dual_use + unsureMode option (§7.2/§7.4)", () => {
    const node = nodeById("q1_9_defense_exclusivity");
    expect(node.options).toHaveLength(3);
    const values = optionValues(node);
    expect(values.has("exclusively_defense")).toBe(true);
    expect(values.has("dual_use")).toBe(true);
    expect(values.has("no")).toBe(true);
    expect(node.unsureMode).toBe("option");
    expect(node.tier).toBe("both");
  });
});

describe("section 2 — activity & assets", () => {
  it("q2_3 propulsion is calibrated to mega/giga, not >=10 (§7.1 #6)", () => {
    const node = nodeById("q2_3_propulsion");
    expect(node.tier).toBe("full");
    expect([...optionValues(node)]).toEqual(["full", "limited", "none"]);
    expect(node.why).toContain("100–999");
    expect(node.why).toContain("NOT at ≥10");
    expect(node.why).toContain("recital 63");
    expect(node.citation[0]?.citation).toContain("recital 63");
  });

  it("q2_12 human spaceflight uses the shared UK_NEXUS condition", () => {
    expect(nodeById("q2_12_human_spaceflight").showIf).toBe(UK_NEXUS);
  });
});

describe("section 3 — orbit & mission", () => {
  it("q3_6 launch timing carries the THREE contested application-date positions (§7.1 #7)", () => {
    const node = nodeById("q3_6_launch_timing");
    expect(node.citation).toHaveLength(3);
    const joined = node.citation.map((c) => c.citation).join(" | ");
    expect(joined).toContain("1 Jan 2030");
    expect(joined).toContain("1 Jan 2032");
    expect(joined).toContain("36 months after entry into force");
    const labels = node.citation.map((c) => c.label).join(" | ");
    expect(labels).toContain("Danish Presidency compromise text");
    expect(labels).toContain("EP ITRE draft report");
    expect(node.unsureMode).toBe("option");
    expect([...optionValues(node)]).toEqual([
      "all_before",
      "some_or_all_after",
    ]);
  });

  it("q3_6 frames the soft gate (likely out of scope, PROBABLE) in why", () => {
    const why = nodeById("q3_6_launch_timing").why;
    expect(why).toContain("LIKELY-out-of-scope");
    expect(why).toContain("PROBABLE");
  });

  it("q3_1 offers cislunar_beyond in BOTH tiers with the advisory owed downstream (§7.2)", () => {
    const node = nodeById("q3_1_orbital_regimes");
    expect(optionValues(node).has("cislunar_beyond")).toBe(true);
    const quickValues = new Set(
      (node.quickVariant?.options ?? []).map((o) => o.value),
    );
    expect(quickValues.has("cislunar_beyond")).toBe(true);
    expect(node.why).toContain("planetary-protection advisory");
  });
});

describe("section 4 — jurisdiction & market", () => {
  it("q4_2 cites Space Act Art 23 ONLY — no NIS2 Art 26 claim (§7.1 #3)", () => {
    const node = nodeById("q4_2_eu_representative");
    expect(node.citation.length).toBeGreaterThanOrEqual(1);
    for (const source of node.citation) {
      expect(source.citation).toContain("Art. 23");
    }
    const serialized = JSON.stringify(node);
    expect(serialized).not.toContain("26");
    expect(serialized).not.toContain("unlocks");
  });

  it("q4_2 showIf matches the binding shape (neq eu + nexus yes-or-unsure)", () => {
    expect(nodeById("q4_2_eu_representative").showIf).toEqual({
      all: [
        { q: "q1_2_establishment", op: "neq", value: "eu" },
        {
          any: [
            { q: "q4_1_eu_nexus", op: "eq", value: "yes" },
            { q: "q4_1_eu_nexus", op: "unsure" },
          ],
        },
      ],
    });
  });

  it("q4_3 ground segment is a single-select own/outsourced/none — never Y/N (§7.2)", () => {
    const node = nodeById("q4_3_ground_segment");
    expect(node.kind).toBe("single");
    expect(node.tier).toBe("both");
    expect([...optionValues(node)]).toEqual(["own", "outsourced", "none"]);
    expect(node.unsureMode).toBe("option");
    expect(node.why).toContain("supply-chain finding");
  });

  it("q4_3b country follow-up exists for own AND outsourced ground segments", () => {
    const node = nodeById("q4_3b_ground_countries");
    expect(node.kind).toBe("country_multi");
    expect(node.tier).toBe("full");
    expect(node.showIf).toEqual({
      q: "q4_3_ground_segment",
      op: "in",
      value: ["own", "outsourced"],
    });
  });

  it("q4_10 transfer / change-of-control exists with the binding shape (§7.2 MUST-ADD)", () => {
    const node = nodeById("q4_10_transfer_change_of_control");
    expect(node.tier).toBe("full");
    expect([...optionValues(node)]).toEqual([
      "transfer_out",
      "acquisition",
      "change_of_control",
      "no",
    ]);
    expect(node.unsureMode).toBe("option");
    expect(node.showIf).toEqual({
      q: "q1_1_roles",
      op: "includes",
      value: "spacecraft_operator",
    });
    const labels = node.citation.map((c) => c.label).join(" | ");
    expect(labels).toContain("French Space Operations Act");
    expect(labels).toContain("UK Space Industry Act 2018");
  });

  it("UK_NEXUS uses the binding ids + option values", () => {
    expect(UK_NEXUS).toEqual({
      any: [
        { q: "q1_2_establishment", op: "eq", value: "uk" },
        { q: "q4_4_licenses_held", op: "includes", value: "uk_sia_osa" },
        { q: "q4_5_considered_jurisdictions", op: "includes", value: "uk" },
        { q: "q4_3b_ground_countries", op: "includes", value: "uk" },
      ],
    });
    expect(optionValues(nodeById("q4_4_licenses_held")).has("uk_sia_osa")).toBe(
      true,
    );
    expect(
      optionValues(nodeById("q4_5_considered_jurisdictions")).has("uk"),
    ).toBe(true);
  });
});

describe("section 5 — lifecycle (Q5.3 cut)", () => {
  it("q5_1 + the q5_2 key-date nodes exist; q5_2 dates share one screen", () => {
    expect(nodeById("q5_1_lifecycle_phase").tier).toBe("both");
    expect(nodeById("q5_2_target_launch_date").screenGroup).toBe(
      "q5_2_key_dates",
    );
    expect(nodeById("q5_2b_target_authorisation_date").screenGroup).toBe(
      "q5_2_key_dates",
    );
    expect(nodeById("q5_2c_license_expiry_dates").screenGroup).toBe(
      "q5_2_key_dates",
    );
  });
});

// ─── Sections 6–10 + quick-tier arithmetic (Task 1.6) ────────────────────────

describe("quick-tier arithmetic closes (§7.3)", () => {
  const euSpacecraftOperatorAnswers: AnswerMap = {
    q1_1_roles: answered(["spacecraft_operator"]),
    q1_2_establishment: answered("eu"),
  };
  const thirdCountrySpacecraftOperatorAnswers: AnswerMap = {
    q1_1_roles: answered(["spacecraft_operator"]),
    q1_2_establishment: answered("us"),
  };

  it("EU spacecraft operator sees <= 14 quick SCREENS (q1_5 pair = one screen)", () => {
    const visible = visibleQuestions(
      QUESTION_GRAPH,
      "quick",
      euSpacecraftOperatorAnswers,
    );
    expect(countScreens(visible)).toBeLessThanOrEqual(14);
    const ids = visible.map((n) => n.id);
    // The promised quick coverage is actually present:
    expect(ids).toContain("q6_5_cyber_programme");
    expect(ids).toContain("q8_1_tpl_insurance");
    expect(ids).toContain("q9_1_rf_spectrum");
    expect(ids).toContain("q3_6_launch_timing");
    expect(ids).toContain("q4_3_ground_segment");
    // EU profile: no third-country nexus question.
    expect(ids).not.toContain("q4_1_eu_nexus");
  });

  it("third-country spacecraft operator sees <= 15 quick screens (adds EU nexus)", () => {
    const visible = visibleQuestions(
      QUESTION_GRAPH,
      "quick",
      thirdCountrySpacecraftOperatorAnswers,
    );
    expect(countScreens(visible)).toBeLessThanOrEqual(15);
    expect(visible.map((n) => n.id)).toContain("q4_1_eu_nexus");
  });

  it("the §7.3 trims hold: Q1.4 fold, Q1.7 full-only, Q7.1 NOT in quick", () => {
    // Q1.4 fold — one org-type question covers research status + IGO.
    expect(QUESTION_IDS.has("q1_4_org_type")).toBe(true);
    // Q1.7 → full tier.
    expect(nodeById("q1_7_group").tier).toBe("full");
    // Quick-Q7.1 is derived from role + lifecycle in the pipeline — the
    // debris-plan question is full-tier only.
    expect(nodeById("q7_1_debris_plan").tier).toBe("full");
    const quickIds = visibleQuestions(
      QUESTION_GRAPH,
      "quick",
      euSpacecraftOperatorAnswers,
    ).map((n) => n.id);
    expect(quickIds).not.toContain("q7_1_debris_plan");
    expect(quickIds).not.toContain("q1_7_group");
    expect(quickIds).not.toContain("q1_6_balance_sheet");
  });
});

describe("section 6 — NIS2 gateway (§7 corrections)", () => {
  it("q6_1 ECN: Yes routes to another NIS2 sector — never a clean 'does not apply' (§7.2)", () => {
    const node = nodeById("q6_1_public_ecn");
    expect(node.why).toContain("in scope under another NIS2 sector");
    expect(node.why).toContain("outside this tool's space-sector scope");
    expect([...optionValues(node)]).toEqual(["yes", "no"]);
    expect(node.unsureMode).toBe("option");
    expect(node.showIf).toEqual({
      q: "q4_3_ground_segment",
      op: "eq",
      value: "own",
    });
  });

  it("q6_2 designation cites Art 2(2)(b)–(e), NEVER 2(2)(f) (§7.1 #5)", () => {
    const node = nodeById("q6_2_ms_designation");
    expect(JSON.stringify(node)).not.toContain("2(2)(f)");
    expect(node.why).toContain("2(2)(b)–(e)");
    expect(node.why).toContain("clarify with your NCA");
    expect([...optionValues(node)]).toEqual(["yes", "no"]);
    expect(node.unsureMode).toBe("option");
  });

  it("q6_4 transposition list is derived + confirm-only, citing the DE NIS2UmsuCG source", () => {
    const node = nodeById("q6_4_ms_transpositions");
    expect(node.kind).toBe("country_multi");
    expect(node.unsureMode).toBe("none");
    expect(node.derivedFrom).toEqual([
      "q1_2_establishment",
      "q4_3b_ground_countries",
      "q4_1_eu_nexus",
    ]);
    for (const ref of node.derivedFrom ?? []) {
      expect(QUESTION_IDS.has(ref)).toBe(true);
    }
    const hasDESource = node.citation.some(
      (c) => c.citation.includes("NIS2UmsuCG") && c.asOf === "2025-12-06",
    );
    expect(hasDESource).toBe(true);
  });

  it("q6_6 battery has exactly 10 items including management_body_accountability (§7.2 Art 20)", () => {
    const node = nodeById("q6_6_battery");
    expect(node.kind).toBe("battery");
    expect(node.items).toHaveLength(10);
    expect((node.items ?? []).map((i) => i.id)).toEqual([
      "risk_assessment",
      "incident_detection_reporting_chain",
      "business_continuity",
      "supply_chain",
      "cryptography",
      "access_control_identity",
      "security_training",
      "vulnerability_management",
      "ttc_link_protection",
      "management_body_accountability",
    ]);
    // The governance item is cited to NIS2 Art. 20.
    const joined = node.citation.map((c) => c.citation).join(" | ");
    expect(joined).toContain("Art. 20");
  });

  it("q6_8 NIS2 registration status exists with the binding shape (§7.2 MUST-ADD)", () => {
    const node = nodeById("q6_8_nis2_registration_status");
    expect(node.tier).toBe("full");
    expect([...optionValues(node)]).toEqual([
      "registered_all",
      "partial",
      "not_registered",
    ]);
    expect(node.unsureMode).toBe("option");
    expect(node.why).toContain("WITHOUT transition since 6 Dec 2025");
    expect(node.showIf).toEqual({
      any: [
        { q: "q6_2_ms_designation", op: "eq", value: "yes" },
        { q: "q1_5_headcount", op: "in", value: ["h_50_249", "h_250_plus"] },
        { q: "q1_5_turnover", op: "in", value: ["t_10_50m", "t_gt_50m"] },
      ],
    });
  });

  it("q6_5 quick cyber composite is quick-tier only (battery replaces it in full)", () => {
    expect(nodeById("q6_5_cyber_programme").tier).toBe("quick");
    expect(nodeById("q6_6_battery").tier).toBe("full");
  });
});

describe("section 7 — debris & environment", () => {
  it("q7_4 environmental assessment is generalized: UK AEE OR launch-site operator (§7.2)", () => {
    const node = nodeById("q7_4_environmental_assessment");
    expect(node.showIf).toEqual({
      any: [
        UK_NEXUS,
        { q: "q1_1_roles", op: "includes", value: "launch_site_operator" },
      ],
    });
    expect(node.why).toContain("public consultation");
    // FR/SE/NO EIA coverage is present; the SE/NO source is honestly unverified.
    const seNo = node.citation.find((c) => c.verified === false);
    expect(seNo).toBeDefined();
  });
});

describe("section 9 — spectrum & export control", () => {
  it("q9_5 showIf references only role values that exist in q1_1_roles (§7.2 orphan fix)", () => {
    const node = nodeById("q9_5_dual_use");
    const roleValues = optionValues(nodeById("q1_1_roles"));
    const leaves = conditionLeaves(node.showIf as Condition).filter(
      (l) => l.q === "q1_1_roles",
    );
    expect(leaves.length).toBeGreaterThan(0);
    for (const leaf of leaves) {
      expect(leaf.op).toBe("includes");
      expect(
        roleValues.has(String(leaf.value)),
        `q9_5 references phantom role "${String(leaf.value)}"`,
      ).toBe(true);
    }
    // The Sept 2025 mission-equipment expansion is noted (Delegated Reg 2025/2003).
    expect(node.why).toContain("mission equipment");
    const labels = node.citation.map((c) => c.citation).join(" | ");
    expect(labels).toContain("2025/2003");
  });

  it("q9_7 sanctions screening exists with the binding shape (§7.2 MUST-ADD)", () => {
    const node = nodeById("q9_7_sanctions_screening");
    expect(node.tier).toBe("full");
    expect([...optionValues(node)]).toEqual([
      "screening_in_place",
      "partial",
      "none",
    ]);
    expect(node.unsureMode).toBe("option");
    const joined = node.citation.map((c) => c.citation).join(" | ");
    expect(joined).toContain("833/2014");
    expect(joined).toContain("765/2006");
  });
});

describe("section 10 — review & living profile", () => {
  it("Q10.1 check-your-answers is a wizard step, not a question node", () => {
    for (const id of QUESTION_IDS) {
      expect(id.startsWith("q10_1")).toBe(false);
    }
  });

  it("q10_2 living-tier triggers exist, full tier, with the five §4 triggers", () => {
    const node = nodeById("q10_2_living_triggers");
    expect(node.tier).toBe("full");
    expect(node.section).toBe("review");
    expect([...optionValues(node)]).toEqual([
      "new_spacecraft",
      "new_jurisdiction",
      "new_service_line",
      "ownership_change",
      "rulebook_version_bump",
    ]);
  });
});

// ─── Cross-lane contract pins (gateway adapter / gates / regime modules) ─────

describe("cross-lane id + value contract", () => {
  it("the NIS2 gateway adapter's question ids all exist with the expected values", () => {
    // Pinned against src/lib/assessment/nis2-gateway.server.ts (Task 1.7).
    expect(optionValues(nodeById("q1_2_establishment")).has("eu")).toBe(true);
    expect([...optionValues(nodeById("q1_6_balance_sheet"))]).toEqual([
      "bs_le_10m",
      "bs_le_43m",
      "bs_gt_43m",
    ]);
    expect([...optionValues(nodeById("q1_7_group"))]).toEqual(["yes", "no"]);
    expect([...optionValues(nodeById("q1_7_group_headcount"))]).toEqual([
      "h_1_9",
      "h_10_49",
      "h_50_249",
      "h_250_plus",
    ]);
    expect([...optionValues(nodeById("q1_7_group_turnover"))]).toEqual([
      "t_lt_2m",
      "t_2_10m",
      "t_10_50m",
      "t_gt_50m",
    ]);
    expect(QUESTION_IDS.has("q6_3_sole_provider")).toBe(true);
  });

  it("the applicability gates' question ids all exist (Task 1.8)", () => {
    for (const id of [
      "q1_9_defense_exclusivity",
      "q1_2_establishment",
      "q4_1_eu_nexus",
      "q3_6_launch_timing",
    ]) {
      expect(QUESTION_IDS.has(id)).toBe(true);
    }
  });
});
