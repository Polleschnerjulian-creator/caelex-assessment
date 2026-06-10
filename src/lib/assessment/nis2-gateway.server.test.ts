/**
 * NIS2 gateway correction suite (plan Task 1.7).
 *
 * These tests codify the §7.1/§7.2 corrections and the cross-cutting honesty
 * invariants for the new gateway:
 *  - needs_clarification is first-class (insufficient data ≠ "does not apply")
 *  - balance-sheet AND-condition for "essential" (§7.1 #4)
 *  - group aggregation (linked enterprises) with monotonic round-up
 *  - member-state designation cites Art 2(2)(b)–(e), never 2(2)(f) (§7.1 #5)
 *  - ECN routing is "another NIS2 sector", never a clean does-not-apply (§7.2)
 *  - non-EU establishment rule corrected — NO Art 26 representative path for
 *    space operators (§7.1 #3)
 *  - transpositions from MS_TRANSPOSITIONS — act names never guessed
 *  - monotonicity: flipping any answered input to unsure never yields
 *    out_of_scope
 */

import { describe, expect, it } from "vitest";

import {
  classifyNIS2Gateway,
  gatewayInputFromAnswers,
  MS_TRANSPOSITIONS,
  type NIS2GatewayInput,
  type NIS2GatewayResult,
} from "./nis2-gateway.server";
import type { AnswerMap } from "@/lib/assessment/answers";

/** Fixed in-scope profile: EU-established, own ground segment, medium-sized →
 *  "important" via the headcount floor. */
function makeInput(
  overrides: Partial<NIS2GatewayInput> = {},
): NIS2GatewayInput {
  return {
    establishedInEU: true,
    euGroundStationCountries: ["de"],
    groundSegment: "own",
    publicECNProvider: false,
    headcountBand: "h_50_249",
    turnoverBand: "t_10_50m",
    balanceSheetBand: "bs_le_43m",
    partOfGroup: false,
    designatedByMemberState: false,
    soleProviderOrSocietalCritical: false,
    nis2ServiceStates: ["de"],
    ...overrides,
  };
}

/** Fully-answered below-caps profile (small/micro). */
function makeBelowCapsInput(
  overrides: Partial<NIS2GatewayInput> = {},
): NIS2GatewayInput {
  return makeInput({
    headcountBand: "h_10_49",
    turnoverBand: "t_lt_2m",
    balanceSheetBand: "bs_le_10m",
    ...overrides,
  });
}

describe("classifyNIS2Gateway — needs_clarification is first-class", () => {
  it("missing size bands → needs_clarification, NEVER out_of_scope", () => {
    const result = classifyNIS2Gateway(
      makeInput({
        headcountBand: null,
        turnoverBand: null,
        balanceSheetBand: null,
      }),
    );
    expect(result.classification).toBe("needs_clarification");
    expect(result.classification).not.toBe("out_of_scope");
    const ids = result.clarificationsNeeded.map((c) => c.questionId);
    expect(ids).toContain("q1_5_headcount");
    expect(ids).toContain("q1_5_turnover");
  });

  it("a decisive missing balance sheet (essential vs important) → needs_clarification naming q1_6", () => {
    // hc 50–249 + turnover >€50M: essential hinges entirely on the balance sheet.
    const result = classifyNIS2Gateway(
      makeInput({ turnoverBand: "t_gt_50m", balanceSheetBand: null }),
    );
    expect(result.classification).toBe("needs_clarification");
    expect(result.clarificationsNeeded.map((c) => c.questionId)).toContain(
      "q1_6_balance_sheet",
    );
  });
});

describe("classifyNIS2Gateway — balance-sheet AND-condition (§7.1 #4)", () => {
  it("headcount 50–249 + turnover >€50M + balance sheet ≤€43M → important, NOT essential", () => {
    const result = classifyNIS2Gateway(
      makeInput({
        headcountBand: "h_50_249",
        turnoverBand: "t_gt_50m",
        balanceSheetBand: "bs_le_43m",
      }),
    );
    expect(result.classification).toBe("important");
  });

  it("headcount ≥250 alone → essential", () => {
    const result = classifyNIS2Gateway(
      makeInput({ headcountBand: "h_250_plus" }),
    );
    expect(result.classification).toBe("essential");
  });

  it("turnover >€50M + balance sheet >€43M → essential (both prongs of the AND)", () => {
    const result = classifyNIS2Gateway(
      makeInput({ turnoverBand: "t_gt_50m", balanceSheetBand: "bs_gt_43m" }),
    );
    expect(result.classification).toBe("essential");
  });

  it("turnover >€50M + balance sheet unsure → essential-presumed with verifyNote (conservative round-up)", () => {
    const result = classifyNIS2Gateway(
      makeInput({ turnoverBand: "t_gt_50m", balanceSheetBand: "unsure" }),
    );
    expect(result.classification).toBe("essential");
    expect(result.verifyNotes.some((n) => /balance sheet/i.test(n))).toBe(true);
  });
});

describe("classifyNIS2Gateway — group aggregation", () => {
  it("partOfGroup yes + group bands large → classification from GROUP bands", () => {
    const result = classifyNIS2Gateway(
      makeBelowCapsInput({
        partOfGroup: true,
        groupHeadcountBand: "h_250_plus",
        groupTurnoverBand: "t_gt_50m",
      }),
    );
    expect(result.classification).toBe("essential");
  });

  it("partOfGroup unsure on an in-scope profile → classification kept (round up) + group verify flag", () => {
    const result = classifyNIS2Gateway(makeInput({ partOfGroup: "unsure" }));
    expect(result.classification).toBe("important");
    expect(result.verifyNotes.some((n) => /group/i.test(n))).toBe(true);
  });

  it("partOfGroup unsure on a below-caps profile → needs_clarification (aggregation could bring into scope)", () => {
    const result = classifyNIS2Gateway(
      makeBelowCapsInput({ partOfGroup: "unsure" }),
    );
    expect(result.classification).toBe("needs_clarification");
    expect(result.classification).not.toBe("out_of_scope");
    expect(result.clarificationsNeeded.map((c) => c.questionId)).toContain(
      "q1_7_group",
    );
  });

  it("partOfGroup yes with missing group figures on a below-caps profile → needs_clarification, never clean out", () => {
    const result = classifyNIS2Gateway(
      makeBelowCapsInput({
        partOfGroup: true,
        groupHeadcountBand: null,
        groupTurnoverBand: null,
      }),
    );
    expect(result.classification).toBe("needs_clarification");
  });
});

describe("classifyNIS2Gateway — member-state designation (§7.1 #5)", () => {
  it("designated yes → in scope regardless of size, citing Art 2(2)(b)–(e)", () => {
    const result = classifyNIS2Gateway(
      makeBelowCapsInput({ designatedByMemberState: true }),
    );
    expect(["essential", "important"]).toContain(result.classification);
    expect(
      result.citation.some((c) => c.citation.includes("2(2)(b)–(e)")),
    ).toBe(true);
  });

  it("designated yes + size independently essential → essential", () => {
    const result = classifyNIS2Gateway(
      makeInput({
        designatedByMemberState: true,
        headcountBand: "h_250_plus",
      }),
    );
    expect(result.classification).toBe("essential");
  });

  it("designated unsure below caps → needs_clarification with 'clarify with your NCA' — never a silent No", () => {
    const result = classifyNIS2Gateway(
      makeBelowCapsInput({ designatedByMemberState: "unsure" }),
    );
    expect(result.classification).toBe("needs_clarification");
    const allText = [
      result.reason,
      ...result.verifyNotes,
      ...result.clarificationsNeeded.map((c) => c.whatItWouldChange),
    ].join(" ");
    expect(allText.toLowerCase()).toContain("clarify with your nca");
    expect(result.clarificationsNeeded.map((c) => c.questionId)).toContain(
      "q6_2_ms_designation",
    );
  });

  it("designated unsure on an in-scope-by-size profile keeps the size classification (monotonic) + names the clarification", () => {
    const result = classifyNIS2Gateway(
      makeInput({ designatedByMemberState: "unsure" }),
    );
    expect(result.classification).toBe("important");
    expect(result.clarificationsNeeded.map((c) => c.questionId)).toContain(
      "q6_2_ms_designation",
    );
  });

  it("designation citations never cite Art 2(2)(f)", () => {
    const result = classifyNIS2Gateway(
      makeBelowCapsInput({ designatedByMemberState: true }),
    );
    for (const c of result.citation) {
      expect(c.citation).not.toContain("2(2)(f)");
    }
  });
});

describe("classifyNIS2Gateway — Art 2(2)(b)–(e) exceptions below the caps", () => {
  it("below caps + sole provider yes → in scope", () => {
    const result = classifyNIS2Gateway(
      makeBelowCapsInput({ soleProviderOrSocietalCritical: true }),
    );
    expect(["essential", "important"]).toContain(result.classification);
    expect(
      result.citation.some((c) => c.citation.includes("2(2)(b)–(e)")),
    ).toBe(true);
  });

  it("below caps + sole provider unsure → needs_clarification", () => {
    const result = classifyNIS2Gateway(
      makeBelowCapsInput({ soleProviderOrSocietalCritical: "unsure" }),
    );
    expect(result.classification).toBe("needs_clarification");
  });

  it("below caps + sole provider not asked (null) → needs_clarification, never a clean does-not-apply", () => {
    const result = classifyNIS2Gateway(
      makeBelowCapsInput({ soleProviderOrSocietalCritical: null }),
    );
    expect(result.classification).toBe("needs_clarification");
  });

  it("fully-answered below caps with every gate answered No → honest out_of_scope", () => {
    const result = classifyNIS2Gateway(makeBelowCapsInput());
    expect(result.classification).toBe("out_of_scope");
    expect(result.reason.toLowerCase()).toContain("below the nis2 size caps");
  });
});

describe("classifyNIS2Gateway — ECN routing (§7.2 gate fix)", () => {
  it("publicECN yes → routedToOtherSector with the exact routing reason; NOT out_of_scope", () => {
    const result = classifyNIS2Gateway(makeInput({ publicECNProvider: true }));
    expect(result.routedToOtherSector).toBe(true);
    expect(result.classification).not.toBe("out_of_scope");
    expect(result.reason).toContain(
      "in scope under another NIS2 sector — outside this tool's space-sector scope",
    );
  });

  it("publicECN unsure → needs_clarification (rounds up), never does-not-apply", () => {
    const result = classifyNIS2Gateway(
      makeInput({ publicECNProvider: "unsure" }),
    );
    expect(result.classification).toBe("needs_clarification");
    expect(result.classification).not.toBe("out_of_scope");
  });
});

describe("classifyNIS2Gateway — non-EU establishment (§7.1 #3)", () => {
  it("non-EU established + no EU ground infra → out_of_scope citing the Art 26(1) chapeau, no representative path", () => {
    const result = classifyNIS2Gateway(
      makeInput({ establishedInEU: false, euGroundStationCountries: [] }),
    );
    expect(result.classification).toBe("out_of_scope");
    expect(result.reason).toMatch(/establishment/i);
    expect(result.reason).toContain("Art. 26(1)");
    expect(result.reason).toMatch(/NO representative path/i);
  });

  it("NO path returns 'important via Art 26' — even a large non-EU operator without EU infra stays out_of_scope", () => {
    const result = classifyNIS2Gateway(
      makeInput({
        establishedInEU: false,
        euGroundStationCountries: [],
        headcountBand: "h_250_plus",
        turnoverBand: "t_gt_50m",
        balanceSheetBand: "bs_gt_43m",
      }),
    );
    expect(result.classification).toBe("out_of_scope");
    expect(result.classification).not.toBe("important");
  });

  it("non-EU + EU-country ground stations → needs_clarification (establishment analysis required)", () => {
    const result = classifyNIS2Gateway(
      makeInput({ establishedInEU: false, euGroundStationCountries: ["de"] }),
    );
    expect(result.classification).toBe("needs_clarification");
    expect(result.reason).toMatch(/establishment analysis/i);
  });

  it("non-EU + only non-EU ground stations → out_of_scope (third countries do not create EU establishment)", () => {
    const result = classifyNIS2Gateway(
      makeInput({
        establishedInEU: false,
        euGroundStationCountries: ["us", "uk"],
      }),
    );
    expect(result.classification).toBe("out_of_scope");
  });

  it("establishment unsure → proceeds presumed-EU (round up), classification from size, with a verify flag", () => {
    const result = classifyNIS2Gateway(
      makeInput({ establishedInEU: "unsure" }),
    );
    expect(result.classification).toBe("important");
    expect(result.verifyNotes.some((n) => /establish/i.test(n))).toBe(true);
  });
});

describe("classifyNIS2Gateway — Annex I attachment (ground segment)", () => {
  it("ground segment outsourced → NOT Annex-I-space; supplyChainFinding: true instead", () => {
    const result = classifyNIS2Gateway(
      makeInput({ groundSegment: "outsourced", publicECNProvider: null }),
    );
    expect(result.supplyChainFinding).toBe(true);
    expect(result.classification).toBe("out_of_scope");
    expect(result.reason).toMatch(/supply-chain/i);
  });

  it("own ground segment → no supply-chain finding", () => {
    const result = classifyNIS2Gateway(makeInput());
    expect(result.supplyChainFinding).toBe(false);
  });

  it("no ground-segment use → out_of_scope without a supply-chain finding", () => {
    const result = classifyNIS2Gateway(
      makeInput({ groundSegment: "none", publicECNProvider: null }),
    );
    expect(result.classification).toBe("out_of_scope");
    expect(result.supplyChainFinding).toBe(false);
  });

  it("ground segment unsure → needs_clarification, never out_of_scope", () => {
    const result = classifyNIS2Gateway(makeInput({ groundSegment: "unsure" }));
    expect(result.classification).toBe("needs_clarification");
  });
});

describe("classifyNIS2Gateway — member-state transpositions (Q6.4)", () => {
  it("['de','fr'] → DE in force (NIS2UmsuCG, 2025-12-06), FR honestly unverified with NO guessed act name", () => {
    const result = classifyNIS2Gateway(
      makeInput({ nis2ServiceStates: ["de", "fr"] }),
    );
    expect(result.transpositions).toEqual([
      {
        state: "de",
        actName: "NIS2UmsuCG",
        inForce: "2025-12-06",
        status: "in_force",
      },
      { state: "fr", actName: null, inForce: null, status: "unverified" },
    ]);
  });

  it("nis2ServiceStates [] (not asked) → transpositions []", () => {
    const result = classifyNIS2Gateway(makeInput({ nis2ServiceStates: [] }));
    expect(result.transpositions).toEqual([]);
  });

  it("transpositions are classification-independent (carried on out_of_scope results too)", () => {
    const result = classifyNIS2Gateway(
      makeInput({
        establishedInEU: false,
        euGroundStationCountries: [],
        nis2ServiceStates: ["de"],
      }),
    );
    expect(result.classification).toBe("out_of_scope");
    expect(result.transpositions).toHaveLength(1);
    expect(result.transpositions[0]).toMatchObject({
      state: "de",
      actName: "NIS2UmsuCG",
      status: "in_force",
    });
  });

  it("MS_TRANSPOSITIONS contains only verified entries — every entry with an act name is in_force with an ISO date", () => {
    for (const [state, entry] of Object.entries(MS_TRANSPOSITIONS)) {
      expect(state).toMatch(/^[a-z]{2}$/);
      expect(entry.status).toBe("in_force");
      expect(entry.actName).toBeTruthy();
      expect(entry.inForce).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

describe("classifyNIS2Gateway — monotonicity property (unknown rounds up)", () => {
  it("the fixed base profile is in scope (important)", () => {
    expect(classifyNIS2Gateway(makeInput()).classification).toBe("important");
  });

  it("flipping any single answered input to unsure never moves the classification to out_of_scope", () => {
    const flippable = [
      "establishedInEU",
      "groundSegment",
      "publicECNProvider",
      "headcountBand",
      "turnoverBand",
      "balanceSheetBand",
      "partOfGroup",
      "designatedByMemberState",
      "soleProviderOrSocietalCritical",
    ] as const satisfies readonly (keyof NIS2GatewayInput)[];

    for (const key of flippable) {
      const flipped = makeInput({
        [key]: "unsure",
      } as Partial<NIS2GatewayInput>);
      const result = classifyNIS2Gateway(flipped);
      expect(
        result.classification,
        `flipping ${key} to unsure must never yield out_of_scope`,
      ).not.toBe("out_of_scope");
    }
  });
});

describe("classifyNIS2Gateway — citation hygiene (§7.1-corrected cites only)", () => {
  const results: NIS2GatewayResult[] = [
    classifyNIS2Gateway(makeInput()),
    classifyNIS2Gateway(makeInput({ publicECNProvider: true })),
    classifyNIS2Gateway(
      makeInput({ establishedInEU: false, euGroundStationCountries: [] }),
    ),
    classifyNIS2Gateway(
      makeInput({ groundSegment: "outsourced", publicECNProvider: null }),
    ),
    classifyNIS2Gateway(makeBelowCapsInput({ designatedByMemberState: true })),
    classifyNIS2Gateway(
      makeBelowCapsInput({ soleProviderOrSocietalCritical: true }),
    ),
    classifyNIS2Gateway(
      makeInput({
        headcountBand: null,
        turnoverBand: null,
        balanceSheetBand: null,
      }),
    ),
    classifyNIS2Gateway(makeBelowCapsInput()),
  ];

  it("no citation ever contains the Art 2(2)(f) misreading or an Art 26(3) representative claim", () => {
    for (const result of results) {
      for (const source of result.citation) {
        expect(source.citation).not.toContain("2(2)(f)");
        expect(source.citation).not.toContain("26(3)");
      }
    }
  });

  it("every result carries ≥1 citation with label, ISO as-of date and a verified flag", () => {
    for (const result of results) {
      expect(result.citation.length).toBeGreaterThan(0);
      for (const source of result.citation) {
        expect(source.label.length).toBeGreaterThan(0);
        expect(source.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(typeof source.verified).toBe("boolean");
      }
    }
  });
});

describe("gatewayInputFromAnswers — tri-state adapter (Task 1.3 convention)", () => {
  it("maps answered values, translates {state:'unsure'} to adapter literals, and nulls not_asked/missing", () => {
    const answers: AnswerMap = {
      q1_2_establishment: { state: "answered", value: "eu" },
      q1_5_headcount: { state: "answered", value: "h_50_249" },
      q1_5_turnover: { state: "unsure" },
      q1_6_balance_sheet: { state: "not_asked" },
      q1_7_group: { state: "answered", value: "yes" },
      q1_7_group_headcount: { state: "answered", value: "h_250_plus" },
      q4_3_ground_segment: { state: "answered", value: "own" },
      q4_3b_ground_countries: { state: "answered", value: ["de", "us", "uk"] },
      q6_1_public_ecn: { state: "answered", value: "no" },
      q6_2_ms_designation: { state: "answered", value: "no" },
      q6_3_sole_provider: { state: "unsure" },
      q6_4_ms_transpositions: { state: "answered", value: ["de", "fr"] },
    };
    const input = gatewayInputFromAnswers(answers);
    expect(input.establishedInEU).toBe(true);
    expect(input.headcountBand).toBe("h_50_249");
    expect(input.turnoverBand).toBe("unsure"); // adapter-output literal, never a stored value
    expect(input.balanceSheetBand).toBeNull(); // not_asked → null
    expect(input.partOfGroup).toBe(true);
    expect(input.groupHeadcountBand).toBe("h_250_plus");
    expect(input.groundSegment).toBe("own");
    expect(input.euGroundStationCountries).toEqual(["de"]); // us/uk are not EU member states
    expect(input.publicECNProvider).toBe(false);
    expect(input.designatedByMemberState).toBe(false);
    expect(input.soleProviderOrSocietalCritical).toBe("unsure");
    expect(input.nis2ServiceStates).toEqual(["de", "fr"]);
  });

  it("non-EU establishment answers map to establishedInEU=false; unsure maps to 'unsure'", () => {
    expect(
      gatewayInputFromAnswers({
        q1_2_establishment: { state: "answered", value: "us" },
      }).establishedInEU,
    ).toBe(false);
    expect(
      gatewayInputFromAnswers({
        q1_2_establishment: { state: "unsure" },
      }).establishedInEU,
    ).toBe("unsure");
  });

  it("an empty answer map produces honest nulls/unknowns — never optimistic defaults", () => {
    const input = gatewayInputFromAnswers({});
    expect(input.establishedInEU).toBe("unsure"); // round up, never presume non-EU exit
    expect(input.groundSegment).toBe("unsure");
    expect(input.publicECNProvider).toBeNull();
    expect(input.headcountBand).toBeNull();
    expect(input.turnoverBand).toBeNull();
    expect(input.balanceSheetBand).toBeNull();
    expect(input.partOfGroup).toBeNull();
    expect(input.designatedByMemberState).toBeNull();
    expect(input.soleProviderOrSocietalCritical).toBeNull();
    expect(input.euGroundStationCountries).toEqual([]);
    expect(input.nis2ServiceStates).toEqual([]);
  });

  it("hidden ECN branch (not_asked) maps to null, not false", () => {
    const input = gatewayInputFromAnswers({
      q6_1_public_ecn: { state: "not_asked" },
    });
    expect(input.publicECNProvider).toBeNull();
  });

  it("adapter + classifier integration: group-large EU operator with own ground segment → essential", () => {
    const answers: AnswerMap = {
      q1_2_establishment: { state: "answered", value: "eu" },
      q1_5_headcount: { state: "answered", value: "h_10_49" },
      q1_5_turnover: { state: "answered", value: "t_2_10m" },
      q1_6_balance_sheet: { state: "answered", value: "bs_le_10m" },
      q1_7_group: { state: "answered", value: "yes" },
      q1_7_group_headcount: { state: "answered", value: "h_250_plus" },
      q1_7_group_turnover: { state: "answered", value: "t_gt_50m" },
      q4_3_ground_segment: { state: "answered", value: "own" },
      q4_3b_ground_countries: { state: "answered", value: ["de"] },
      q6_1_public_ecn: { state: "answered", value: "no" },
      q6_2_ms_designation: { state: "answered", value: "no" },
      q6_3_sole_provider: { state: "answered", value: "no" },
      q6_4_ms_transpositions: { state: "answered", value: ["de"] },
    };
    const result = classifyNIS2Gateway(gatewayInputFromAnswers(answers));
    expect(result.classification).toBe("essential");
    expect(result.transpositions[0]).toMatchObject({
      state: "de",
      actName: "NIS2UmsuCG",
      status: "in_force",
    });
  });
});
