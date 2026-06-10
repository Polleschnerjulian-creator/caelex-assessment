/**
 * Honesty hotfix — focused regression tests.
 *
 * Covers the three live-funnel fixes:
 *
 *  FIX 1 — client-only hard-stops are now enforced server-side:
 *    (a) gate fields are REQUIRED in the Zod schemas → missing field = 400
 *        validation error, never a confident verdict from silent defaults;
 *    (b) a payload that bypasses a client gate (direct API call) gets the
 *        same honest out-of-scope verdict, with its legal citation.
 *
 *  FIX 2 — the anti-bot timing check is no longer decorative:
 *    startedAt is REQUIRED in all assessment schemas, and the shared
 *    isAssessmentTooFast() helper rejects too-fast submissions.
 *
 *  FIX 3 — honesty disclaimers survive redaction:
 *    redactNIS2ResultForClient keeps the "Internal estimate — not
 *    empirically validated" note (confidenceLevel + estimationSource) on
 *    the EU Space Act overlap savings figure while still stripping the
 *    proprietary requirement details.
 *
 * Invariant under test (CONSERVATIVE-ONLY): a gate fires only on an explicit
 * gate answer; unknown/null never produces a definitive out-of-scope verdict
 * — it rounds UP toward in-scope (more obligations) or fails validation.
 */

import { describe, it, expect, vi } from "vitest";
import type { AssessmentAnswers, SpaceActData } from "@/lib/types";
import type { NIS2AssessmentAnswers } from "@/lib/nis2-types";

// ─── Mock server-only so engine modules can be imported in Vitest ───
vi.mock("server-only", () => ({}));

const { calculateCompliance, redactArticlesForClient } =
  await import("@/lib/engine.server");
const { calculateNIS2Compliance, redactNIS2ResultForClient } =
  await import("@/lib/nis2-engine.server");
const { isAssessmentTooFast, ASSESSMENT_MIN_DURATION_MS } =
  await import("@/lib/engines/shared.server");
const {
  EUSpaceActCalculateSchema,
  NIS2CalculateSchema,
  UnifiedCalculateSchema,
} = await import("@/lib/validations");

// ═══════════════════════════════════════════
// Fixtures
// ═══════════════════════════════════════════

/** Minimal structurally-valid SpaceActData — gates return before article
 *  filtering, and the in-scope path tolerates empty titles/checklists. */
const minimalSpaceActData = {
  metadata: { total_articles: 119 },
  titles: [],
  compliance_checklist_by_operator_type: {
    spacecraft_operator_eu: {
      pre_authorization: [],
      ongoing: [],
      end_of_life: [],
    },
    launch_operator_eu: { pre_authorization: [], operational: [] },
    third_country_operator: { pre_registration: [], ongoing: [] },
  },
} as unknown as SpaceActData;

function makeEUSpaceActAnswers(
  overrides: Partial<AssessmentAnswers> = {},
): AssessmentAnswers {
  return {
    activityType: "spacecraft",
    isDefenseOnly: false,
    hasPostLaunchAssets: true,
    establishment: "eu",
    entitySize: "medium",
    operatesConstellation: false,
    constellationSize: null,
    primaryOrbit: "LEO",
    offersEUServices: true,
    ...overrides,
  } as AssessmentAnswers;
}

function makeNIS2Answers(
  overrides: Partial<NIS2AssessmentAnswers> = {},
): NIS2AssessmentAnswers {
  return {
    sector: "space",
    spaceSubSector: "ground_infrastructure",
    operatesGroundInfra: true,
    operatesSatComms: null,
    manufacturesSpacecraft: null,
    providesLaunchServices: null,
    providesEOData: null,
    entitySize: "medium",
    employeeCount: 120,
    annualRevenue: null,
    memberStateCount: 1,
    isEUEstablished: true,
    offersServicesInEU: null,
    designatedByMemberState: null,
    providesDigitalInfrastructure: null,
    euControlledEntity: null,
    hasISO27001: null,
    hasExistingCSIRT: null,
    hasRiskManagement: null,
    ...overrides,
  } as NIS2AssessmentAnswers;
}

/** A valid public payload for the EU Space Act calculate endpoint. */
const validEUSpaceActBody = {
  answers: {
    activityType: "spacecraft",
    entitySize: "medium",
    primaryOrbit: "LEO",
    establishment: "eu",
    constellationSize: null,
    isDefenseOnly: false,
    hasPostLaunchAssets: true,
    operatesConstellation: false,
    offersEUServices: true,
  },
  startedAt: Date.now() - 60_000,
};

const validNIS2Body = {
  answers: {
    sector: "space",
    spaceSubSector: "ground_infrastructure",
    entitySize: "medium",
    memberStateCount: 1,
    isEUEstablished: true,
    operatesGroundInfra: true,
    hasISO27001: false,
    hasExistingCSIRT: false,
  },
  startedAt: Date.now() - 60_000,
};

const validUnifiedBody = {
  answers: {
    establishmentCountry: "DE",
    entitySize: "small",
    activityTypes: ["SCO"],
    isDefenseOnly: false,
    defenseInvolvement: "none",
    servesEUCustomers: true,
  },
  startedAt: Date.now() - 60_000,
};

function omit<T extends Record<string, unknown>>(
  obj: T,
  key: string,
): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...obj };
  delete copy[key];
  return copy;
}

// ═══════════════════════════════════════════
// FIX 1(a) — gate fields are required in the schemas
// ═══════════════════════════════════════════

describe("FIX 1(a): gate fields are required (missing gate data → 400, never a verdict)", () => {
  describe("EUSpaceActCalculateSchema", () => {
    it("accepts a complete wizard payload", () => {
      expect(
        EUSpaceActCalculateSchema.safeParse(validEUSpaceActBody).success,
      ).toBe(true);
    });

    it("rejects a payload missing hasPostLaunchAssets (pre-2030 gate)", () => {
      const body = {
        ...validEUSpaceActBody,
        answers: omit(validEUSpaceActBody.answers, "hasPostLaunchAssets"),
      };
      expect(EUSpaceActCalculateSchema.safeParse(body).success).toBe(false);
    });

    it("rejects a payload missing isDefenseOnly (defense gate)", () => {
      const body = {
        ...validEUSpaceActBody,
        answers: omit(validEUSpaceActBody.answers, "isDefenseOnly"),
      };
      expect(EUSpaceActCalculateSchema.safeParse(body).success).toBe(false);
    });

    it("rejects a payload missing establishment (third-country gate)", () => {
      const body = {
        ...validEUSpaceActBody,
        answers: omit(validEUSpaceActBody.answers, "establishment"),
      };
      expect(EUSpaceActCalculateSchema.safeParse(body).success).toBe(false);
    });

    it("rejects null gate values (unknown must not pass as an answer)", () => {
      const body = {
        ...validEUSpaceActBody,
        answers: { ...validEUSpaceActBody.answers, hasPostLaunchAssets: null },
      };
      expect(EUSpaceActCalculateSchema.safeParse(body).success).toBe(false);
    });

    it("rejects an empty answers object (no confident verdict from defaults)", () => {
      const body = { answers: {}, startedAt: Date.now() - 60_000 };
      expect(EUSpaceActCalculateSchema.safeParse(body).success).toBe(false);
    });
  });

  describe("NIS2CalculateSchema", () => {
    it("accepts a complete wizard payload", () => {
      expect(NIS2CalculateSchema.safeParse(validNIS2Body).success).toBe(true);
    });

    it("rejects a payload missing isEUEstablished (establishment gate)", () => {
      const body = {
        ...validNIS2Body,
        answers: omit(validNIS2Body.answers, "isEUEstablished"),
      };
      expect(NIS2CalculateSchema.safeParse(body).success).toBe(false);
    });

    it("rejects a payload missing entitySize (size-cap classification input)", () => {
      const body = {
        ...validNIS2Body,
        answers: omit(validNIS2Body.answers, "entitySize"),
      };
      expect(NIS2CalculateSchema.safeParse(body).success).toBe(false);
    });
  });

  describe("UnifiedCalculateSchema", () => {
    it("accepts a complete wizard payload", () => {
      expect(UnifiedCalculateSchema.safeParse(validUnifiedBody).success).toBe(
        true,
      );
    });

    it("rejects a payload missing defenseInvolvement (defense gate)", () => {
      const body = {
        ...validUnifiedBody,
        answers: omit(validUnifiedBody.answers, "defenseInvolvement"),
      };
      expect(UnifiedCalculateSchema.safeParse(body).success).toBe(false);
    });

    it("rejects a payload missing isDefenseOnly (defense gate)", () => {
      const body = {
        ...validUnifiedBody,
        answers: omit(validUnifiedBody.answers, "isDefenseOnly"),
      };
      expect(UnifiedCalculateSchema.safeParse(body).success).toBe(false);
    });

    it("rejects a payload missing servesEUCustomers (EU-market gate)", () => {
      const body = {
        ...validUnifiedBody,
        answers: omit(validUnifiedBody.answers, "servesEUCustomers"),
      };
      expect(UnifiedCalculateSchema.safeParse(body).success).toBe(false);
    });

    it("rejects an empty activityTypes list (would mislabel the operator out-of-scope)", () => {
      const body = {
        ...validUnifiedBody,
        answers: { ...validUnifiedBody.answers, activityTypes: [] },
      };
      expect(UnifiedCalculateSchema.safeParse(body).success).toBe(false);
    });

    it("accepts the wizard's literal 'OTHER' establishment country (Other Country option)", () => {
      // The wizard offers "Other Country" with value "OTHER" (5 chars). The
      // previous min(2).max(3) bound 400-ed every such visitor at completion.
      // "OTHER" flows through the mappers as a non-EU establishment (it never
      // matches EU/EEA/ESA membership lists).
      const body = {
        ...validUnifiedBody,
        answers: { ...validUnifiedBody.answers, establishmentCountry: "OTHER" },
      };
      expect(UnifiedCalculateSchema.safeParse(body).success).toBe(true);
    });

    it("still rejects malformed establishment country values", () => {
      for (const bad of ["D", "DEUT", "SOMETHING", ""]) {
        const body = {
          ...validUnifiedBody,
          answers: { ...validUnifiedBody.answers, establishmentCountry: bad },
        };
        expect(UnifiedCalculateSchema.safeParse(body).success).toBe(false);
      }
    });
  });
});

// ═══════════════════════════════════════════
// FIX 1(b) — gates are enforced in the engine itself
// ═══════════════════════════════════════════

describe("FIX 1(b): a payload bypassing a client gate gets the honest out-of-scope verdict", () => {
  it("hasPostLaunchAssets=false → out-of-scope with Art. 2(3)(d) citation", () => {
    const result = calculateCompliance(
      makeEUSpaceActAnswers({ hasPostLaunchAssets: false }),
      minimalSpaceActData,
    );
    expect(result.regime).toBe("out_of_scope");
    expect(result.regimeReason).toContain("2(3)(d)");
    expect(result.regimeReason).toContain("1 January 2030");
    expect(result.applicableCount).toBe(0);
    expect(result.applicableArticles).toEqual([]);
    expect(result.moduleStatuses).toEqual([]);
    expect(result.estimatedAuthorizationCost).toContain("out of scope");
  });

  it("isDefenseOnly=true → out-of-scope with Art. 2(3) citation (precedence over other gates)", () => {
    const result = calculateCompliance(
      makeEUSpaceActAnswers({
        isDefenseOnly: true,
        hasPostLaunchAssets: false,
      }),
      minimalSpaceActData,
    );
    expect(result.regime).toBe("out_of_scope");
    expect(result.regimeReason).toContain("Art. 2(3)");
    expect(result.regimeReason).toContain("defense");
  });

  it("establishment=third_country_no_eu → out-of-scope (Art. 2 scope test)", () => {
    const result = calculateCompliance(
      makeEUSpaceActAnswers({ establishment: "third_country_no_eu" }),
      minimalSpaceActData,
    );
    expect(result.regime).toBe("out_of_scope");
    expect(result.applicableCount).toBe(0);
  });

  it("CONSERVATIVE: unknown (null) hasPostLaunchAssets does NOT fire the gate — rounds up to in-scope", () => {
    const result = calculateCompliance(
      makeEUSpaceActAnswers({ hasPostLaunchAssets: null }),
      minimalSpaceActData,
    );
    expect(result.regime).not.toBe("out_of_scope");
  });

  it("the out-of-scope verdict (and its citation) survives redaction to the client", () => {
    const result = calculateCompliance(
      makeEUSpaceActAnswers({ hasPostLaunchAssets: false }),
      minimalSpaceActData,
    );
    const redacted = redactArticlesForClient(result);
    expect(redacted.regime).toBe("out_of_scope");
    expect(redacted.regimeReason).toContain("2(3)(d)");
  });

  it("NIS2: non-EU with no EU services → out-of-scope with Art. 2(4) citation, surviving redaction", async () => {
    const result = await calculateNIS2Compliance(
      makeNIS2Answers({ isEUEstablished: false, offersServicesInEU: null }),
    );
    expect(result.entityClassification).toBe("out_of_scope");
    expect(result.classificationReason).toContain("Art. 2(4)");

    const redacted = redactNIS2ResultForClient(result);
    expect(redacted.entityClassification).toBe("out_of_scope");
    expect(redacted.classificationReason).toContain("Art. 2(4)");
  });

  it("NIS2 CONSERVATIVE: non-EU but offering EU services stays IN scope (important, Art. 26)", async () => {
    const result = await calculateNIS2Compliance(
      makeNIS2Answers({ isEUEstablished: false, offersServicesInEU: true }),
    );
    expect(result.entityClassification).toBe("important");
  });
});

// ═══════════════════════════════════════════
// FIX 2 — anti-bot timing check is real
// ═══════════════════════════════════════════

describe("FIX 2: startedAt is required and the timing check rejects too-fast submissions", () => {
  it("EUSpaceActCalculateSchema rejects a payload without startedAt", () => {
    expect(
      EUSpaceActCalculateSchema.safeParse(
        omit(validEUSpaceActBody, "startedAt"),
      ).success,
    ).toBe(false);
  });

  it("NIS2CalculateSchema rejects a payload without startedAt", () => {
    expect(
      NIS2CalculateSchema.safeParse(omit(validNIS2Body, "startedAt")).success,
    ).toBe(false);
  });

  it("UnifiedCalculateSchema rejects a payload without startedAt", () => {
    expect(
      UnifiedCalculateSchema.safeParse(omit(validUnifiedBody, "startedAt"))
        .success,
    ).toBe(false);
  });

  it("rejects non-integer / non-positive startedAt values", () => {
    expect(
      EUSpaceActCalculateSchema.safeParse({
        ...validEUSpaceActBody,
        startedAt: 0,
      }).success,
    ).toBe(false);
    expect(
      EUSpaceActCalculateSchema.safeParse({
        ...validEUSpaceActBody,
        startedAt: -5,
      }).success,
    ).toBe(false);
    expect(
      EUSpaceActCalculateSchema.safeParse({
        ...validEUSpaceActBody,
        startedAt: "now",
      }).success,
    ).toBe(false);
  });

  it("isAssessmentTooFast flags submissions under the minimum duration", () => {
    const now = 1_000_000_000;
    expect(isAssessmentTooFast(now - 1000, now)).toBe(true);
    expect(
      isAssessmentTooFast(now - (ASSESSMENT_MIN_DURATION_MS - 1), now),
    ).toBe(true);
  });

  it("isAssessmentTooFast passes submissions at/above the minimum duration", () => {
    const now = 1_000_000_000;
    expect(isAssessmentTooFast(now - ASSESSMENT_MIN_DURATION_MS, now)).toBe(
      false,
    );
    expect(isAssessmentTooFast(now - 120_000, now)).toBe(false);
  });

  it("isAssessmentTooFast flags clock-skewed future startedAt (negative elapsed)", () => {
    const now = 1_000_000_000;
    expect(isAssessmentTooFast(now + 60_000, now)).toBe(true);
  });
});

// ═══════════════════════════════════════════
// FIX 3 — honesty disclaimers survive redaction
// ═══════════════════════════════════════════

describe("FIX 3: redaction preserves honesty disclaimers while stripping proprietary content", () => {
  it("NIS2 overlap savings keep the 'not empirically validated' disclaimer after redaction", async () => {
    const result = await calculateNIS2Compliance(makeNIS2Answers());
    // Engine attaches the disclaimer…
    expect(result.euSpaceActOverlap.confidenceLevel).toBe("estimated");
    expect(result.euSpaceActOverlap.estimationSource).toContain(
      "not empirically validated",
    );

    // …and redaction must NOT strip it.
    const redacted = redactNIS2ResultForClient(result);
    expect(redacted.euSpaceActOverlap.confidenceLevel).toBe("estimated");
    expect(redacted.euSpaceActOverlap.estimationSource).toContain(
      "not empirically validated",
    );
  });

  it("redaction still strips the proprietary overlap requirement details", async () => {
    const result = await calculateNIS2Compliance(makeNIS2Answers());
    const redacted = redactNIS2ResultForClient(result) as unknown as Record<
      string,
      unknown
    >;
    const overlap = redacted.euSpaceActOverlap as Record<string, unknown>;
    expect(overlap.overlappingRequirements).toBeUndefined();
  });

  it("redaction still strips proprietary NIS2 requirement fields", async () => {
    const result = await calculateNIS2Compliance(makeNIS2Answers());
    const redacted = redactNIS2ResultForClient(result);
    for (const req of redacted.applicableRequirements) {
      const raw = req as unknown as Record<string, unknown>;
      expect(raw.description).toBeUndefined();
      expect(raw.spaceSpecificGuidance).toBeUndefined();
      expect(raw.tips).toBeUndefined();
      expect(raw.evidenceRequired).toBeUndefined();
    }
  });
});
