/**
 * Sprint B6 — License-Determination Engine tests.
 *
 * Tests cover:
 *   1. MTCR Cat. I block → gate=BLOCKED, authority=MTCR_REVIEW
 *   2. ITAR flag → DDTC DSP-5 requirement
 *   3. De-minimis: ITAR_CONTROLLED, EMBARGOED, DE_MINIMIS_EXCEEDED,
 *                  FDPR_TRIGGERED, DE_MINIMIS_ELIGIBLE, REQUIRES_LEGAL_REVIEW
 *   4. EU / DE codes → BAFA requirement (and BAFA denial for MTCR Cat. I)
 *   5. No de-minimis provided + triggered rules
 *   6. Gate logic (BLOCKED > REVIEW_NEEDED > CLEARED)
 *   7. isExportBlocked() and countRequiredLicenses() helpers
 *   8. Disclaimer always present
 */

import { describe, it, expect } from "vitest";

import {
  determineLicenseRequirements,
  isExportBlocked,
  countRequiredLicenses,
  type LicenseDetermination,
} from "./license-determination";
import type { TriggerEvaluation } from "./property-trigger-engine";
import type { DeMinimisResult } from "./de-minimis-calculator";
import type { OriginRegimeRouting } from "./classification/origin-regime-map";

// ─── Fixtures ─────────────────────────────────────────────────────────

/** A TriggerEvaluation with no flags and no triggered rules. */
const CLEAN_EVAL: TriggerEvaluation = {
  results: [],
  hasItarFlag: false,
  hasMtcrCatIFlag: false,
  requiresHumanReview: false,
  maxConfidence: null,
  triggeredRuleCount: 0,
};

/** A TriggerEvaluation with ITAR flag and one triggered result. */
const ITAR_EVAL: TriggerEvaluation = {
  results: [
    {
      ruleId: "USML_EO_HIGH_RES",
      reason: "Aperture ≥ 0.50 m triggers USML XV(a)(7)(i)",
      topicSlug: "electro-optical-imaging",
      suggestedCodes: [
        {
          code: "XV(a)(7)(i)",
          jurisdiction: "USML",
          itar: true,
          mtcrCatI: false,
          description: "EO imaging systems aperture ≥ 0.50 m",
        },
      ],
      confidence: "HIGH",
      requiresHumanReview: true,
      advisory: undefined,
    },
  ],
  hasItarFlag: true,
  hasMtcrCatIFlag: false,
  requiresHumanReview: true,
  maxConfidence: "HIGH",
  triggeredRuleCount: 1,
};

/** A TriggerEvaluation with MTCR Cat. I flag. */
const MTCR_CAT_I_EVAL: TriggerEvaluation = {
  results: [
    {
      ruleId: "MTCR_CAT_I_LAUNCH_VEHICLE",
      reason: "Payload ≥ 500 kg to orbit ≥ 300 km",
      topicSlug: "complete-launch-vehicles",
      suggestedCodes: [
        {
          code: "1.A.1",
          jurisdiction: "MTCR",
          itar: false,
          mtcrCatI: true,
          description: "Complete launch vehicle",
        },
        {
          code: "IV(a)(1)",
          jurisdiction: "USML",
          itar: true,
          mtcrCatI: true,
          description: "Complete launch vehicle USML",
        },
      ],
      confidence: "HIGH",
      requiresHumanReview: true,
    },
  ],
  hasItarFlag: true,
  hasMtcrCatIFlag: true,
  requiresHumanReview: true,
  maxConfidence: "HIGH",
  triggeredRuleCount: 1,
};

/** An eval with EU/DE codes but no ITAR/MTCR. */
const EU_ONLY_EVAL: TriggerEvaluation = {
  results: [
    {
      ruleId: "KEYWORD_ELECTRIC_PROPULSION",
      reason: "Keyword match: electric propulsion",
      topicSlug: "hall-thrusters-electric-propulsion",
      suggestedCodes: [
        {
          code: "9A004",
          jurisdiction: "EU_ANNEX_I",
          itar: false,
          mtcrCatI: false,
          description: "Spacecraft propulsion system",
        },
        {
          code: "9A004",
          jurisdiction: "DE_ANLAGE_AL",
          itar: false,
          mtcrCatI: false,
          description: "Spacecraft propulsion (DE)",
        },
      ],
      confidence: "LOW",
      requiresHumanReview: false,
    },
  ],
  hasItarFlag: false,
  hasMtcrCatIFlag: false,
  requiresHumanReview: false,
  maxConfidence: "LOW",
  triggeredRuleCount: 1,
};

/** EU eval with MTCR Cat. I codes in results. */
const EU_MTCR_EVAL: TriggerEvaluation = {
  results: [
    {
      ruleId: "MTCR_CAT_I_LAUNCH_VEHICLE",
      reason: "MTCR Cat. I trigger",
      topicSlug: "complete-launch-vehicles",
      suggestedCodes: [
        {
          code: "9A004",
          jurisdiction: "EU_ANNEX_I",
          itar: false,
          mtcrCatI: true,
          description: "Spacecraft system",
        },
      ],
      confidence: "HIGH",
      requiresHumanReview: true,
    },
  ],
  hasItarFlag: false,
  hasMtcrCatIFlag: true,
  requiresHumanReview: true,
  maxConfidence: "HIGH",
  triggeredRuleCount: 1,
};

// ─── De-minimis fixtures ───────────────────────────────────────────────

function makeDeMinimis(
  outcome: DeMinimisResult["outcome"],
  overrides: Partial<DeMinimisResult> = {},
): DeMinimisResult {
  return {
    outcome,
    appliedThresholdPercent: outcome === "DE_MINIMIS_EXCEEDED" ? 25 : 25,
    usControlledContentPercent: 30,
    fdprFlag: outcome === "FDPR_TRIGGERED",
    riskLevel: "MEDIUM",
    reasons: ["test reason"],
    recommendations: ["test recommendation"],
    disclaimer: "Disclaimer text for counsel.",
    ...overrides,
  };
}

// ─── 1. MTCR Cat. I block ─────────────────────────────────────────────

describe("MTCR Cat. I block", () => {
  it("gate is BLOCKED when hasMtcrCatIFlag is true", () => {
    const det = determineLicenseRequirements(MTCR_CAT_I_EVAL, null);
    expect(det.gate).toBe("BLOCKED");
  });

  it("mtcrCatIBlock is true", () => {
    const det = determineLicenseRequirements(MTCR_CAT_I_EVAL, null);
    expect(det.mtcrCatIBlock).toBe(true);
  });

  it("includes an MTCR_REVIEW requirement with DENIED status", () => {
    const det = determineLicenseRequirements(MTCR_CAT_I_EVAL, null);
    const mtcr = det.requirements.find((r) => r.authority === "MTCR_REVIEW");
    expect(mtcr).toBeDefined();
    expect(mtcr!.status).toBe("DENIED");
    expect(mtcr!.licenseType).toBeNull();
  });

  it("nextSteps includes URGENT MTCR warning", () => {
    const det = determineLicenseRequirements(MTCR_CAT_I_EVAL, null);
    expect(det.nextSteps[0]).toContain("MTCR");
  });

  it("MTCR block alone (no ITAR) still produces BLOCKED gate", () => {
    const onlyMtcr: TriggerEvaluation = {
      ...CLEAN_EVAL,
      hasMtcrCatIFlag: true,
      triggeredRuleCount: 1,
    };
    const det = determineLicenseRequirements(onlyMtcr, null);
    expect(det.gate).toBe("BLOCKED");
  });
});

// ─── 2. ITAR / USML ───────────────────────────────────────────────────

describe("ITAR / USML gate", () => {
  it("itarBlock is true when hasItarFlag is true", () => {
    const det = determineLicenseRequirements(ITAR_EVAL, null);
    expect(det.itarBlock).toBe(true);
  });

  it("includes a DDTC requirement", () => {
    const det = determineLicenseRequirements(ITAR_EVAL, null);
    const ddtc = det.requirements.find((r) => r.authority === "DDTC");
    expect(ddtc).toBeDefined();
  });

  it("DDTC requirement status is REQUIRED", () => {
    const det = determineLicenseRequirements(ITAR_EVAL, null);
    const ddtc = det.requirements.find((r) => r.authority === "DDTC");
    expect(ddtc!.status).toBe("REQUIRED");
  });

  it("DDTC licenseType is DSP5", () => {
    const det = determineLicenseRequirements(ITAR_EVAL, null);
    const ddtc = det.requirements.find((r) => r.authority === "DDTC");
    expect(ddtc!.licenseType).toBe("DSP5");
  });

  it("triggerCode includes the USML code", () => {
    const det = determineLicenseRequirements(ITAR_EVAL, null);
    const ddtc = det.requirements.find((r) => r.authority === "DDTC");
    expect(ddtc!.triggerCode).toContain("XV");
  });

  it("gate is REVIEW_NEEDED for ITAR (no MTCR block)", () => {
    const det = determineLicenseRequirements(ITAR_EVAL, null);
    expect(det.gate).toBe("REVIEW_NEEDED");
  });

  it("itarBlock is false when hasItarFlag is false", () => {
    const det = determineLicenseRequirements(CLEAN_EVAL, null);
    expect(det.itarBlock).toBe(false);
  });
});

// ─── 3. De-minimis outcome mapping ────────────────────────────────────

describe("de-minimis: ITAR_CONTROLLED", () => {
  it("adds BIS NLR note when de-minimis says ITAR_CONTROLLED", () => {
    const dm = makeDeMinimis("ITAR_CONTROLLED");
    const det = determineLicenseRequirements(ITAR_EVAL, dm);
    const bis = det.requirements.find((r) => r.authority === "BIS");
    expect(bis).toBeDefined();
    expect(bis!.status).toBe("NLR");
  });
});

describe("de-minimis: EMBARGOED_DESTINATION", () => {
  it("adds BIS DENIED requirement", () => {
    const dm = makeDeMinimis("EMBARGOED_DESTINATION");
    const det = determineLicenseRequirements(CLEAN_EVAL, dm, "KP");
    const bis = det.requirements.find((r) => r.authority === "BIS");
    expect(bis!.status).toBe("DENIED");
  });

  it("gate is BLOCKED for embargoed destination", () => {
    const dm = makeDeMinimis("EMBARGOED_DESTINATION");
    const det = determineLicenseRequirements(CLEAN_EVAL, dm, "KP");
    expect(det.gate).toBe("BLOCKED");
  });

  it("embargoBlock is true", () => {
    const dm = makeDeMinimis("EMBARGOED_DESTINATION");
    const det = determineLicenseRequirements(CLEAN_EVAL, dm, "IR");
    expect(det.embargoBlock).toBe(true);
  });

  it("reason mentions destination country", () => {
    const dm = makeDeMinimis("EMBARGOED_DESTINATION");
    const det = determineLicenseRequirements(CLEAN_EVAL, dm, "KP");
    const bis = det.requirements.find((r) => r.authority === "BIS");
    expect(bis!.reason).toContain("KP");
  });
});

describe("Gate 1.5 — standalone embargo destination (no de-minimis)", () => {
  it("BLOCKS an embargoed destination even when no de-minimis was computed", () => {
    // The bug this gate fixes: an EAR99-ish item (no triggers) shipped with
    // no usContentPercent → de-minimis is null → previously CLEARED. The
    // destination alone must block.
    const det = determineLicenseRequirements(CLEAN_EVAL, null, "IR");
    expect(det.gate).toBe("BLOCKED");
    expect(det.embargoBlock).toBe(true);
    const req = det.requirements.find(
      (r) => r.triggerCode === "EMBARGO_DESTINATION",
    );
    expect(req?.status).toBe("DENIED");
    expect(req?.reason).toContain("IR");
  });

  it("normalises destination case (lowercase ir → IR)", () => {
    const det = determineLicenseRequirements(CLEAN_EVAL, null, "ir");
    expect(det.embargoBlock).toBe(true);
    expect(det.gate).toBe("BLOCKED");
  });

  it("does NOT block a non-embargoed destination", () => {
    const det = determineLicenseRequirements(CLEAN_EVAL, null, "IN");
    expect(det.embargoBlock).toBe(false);
    expect(det.gate).toBe("CLEARED");
  });

  it("does not double-count when de-minimis ALSO reports EMBARGOED_DESTINATION", () => {
    const dm = makeDeMinimis("EMBARGOED_DESTINATION");
    const det = determineLicenseRequirements(CLEAN_EVAL, dm, "IR");
    const embargoReqs = det.requirements.filter(
      (r) =>
        r.status === "DENIED" &&
        r.jurisdiction.toLowerCase().includes("embargo"),
    );
    expect(embargoReqs).toHaveLength(1);
    expect(det.embargoBlock).toBe(true);
  });
});

describe("de-minimis: DE_MINIMIS_EXCEEDED", () => {
  it("adds BIS REQUIRED requirement", () => {
    const dm = makeDeMinimis("DE_MINIMIS_EXCEEDED", {
      usControlledContentPercent: 30,
      appliedThresholdPercent: 25,
    });
    const det = determineLicenseRequirements(CLEAN_EVAL, dm);
    const bis = det.requirements.find((r) => r.authority === "BIS");
    expect(bis!.status).toBe("REQUIRED");
  });

  it("licenseType is SPECIFIC_LICENSE when exceeded", () => {
    const dm = makeDeMinimis("DE_MINIMIS_EXCEEDED");
    const det = determineLicenseRequirements(CLEAN_EVAL, dm);
    const bis = det.requirements.find((r) => r.authority === "BIS");
    expect(bis!.licenseType).toBe("SPECIFIC_LICENSE");
  });

  it("gate is REVIEW_NEEDED when exceeded (no MTCR block)", () => {
    const dm = makeDeMinimis("DE_MINIMIS_EXCEEDED");
    const det = determineLicenseRequirements(CLEAN_EVAL, dm);
    expect(det.gate).toBe("REVIEW_NEEDED");
  });
});

describe("de-minimis: FDPR_TRIGGERED", () => {
  it("adds BIS LIKELY_REQUIRED requirement", () => {
    const dm = makeDeMinimis("FDPR_TRIGGERED");
    const det = determineLicenseRequirements(CLEAN_EVAL, dm);
    const bis = det.requirements.find((r) => r.authority === "BIS");
    expect(bis!.status).toBe("LIKELY_REQUIRED");
  });

  it("gate is REVIEW_NEEDED for FDPR", () => {
    const dm = makeDeMinimis("FDPR_TRIGGERED");
    const det = determineLicenseRequirements(CLEAN_EVAL, dm);
    expect(det.gate).toBe("REVIEW_NEEDED");
  });

  it("nextSteps mention 15 CFR § 734.9", () => {
    const dm = makeDeMinimis("FDPR_TRIGGERED");
    const det = determineLicenseRequirements(CLEAN_EVAL, dm);
    const fdprStep = det.nextSteps.some((s) => s.includes("734.9"));
    expect(fdprStep).toBe(true);
  });
});

describe("de-minimis: DE_MINIMIS_ELIGIBLE", () => {
  it("adds BIS EXCEPTION_MAY_APPLY requirement", () => {
    const dm = makeDeMinimis("DE_MINIMIS_ELIGIBLE", {
      usControlledContentPercent: 10,
      appliedThresholdPercent: 25,
    });
    const det = determineLicenseRequirements(CLEAN_EVAL, dm);
    const bis = det.requirements.find((r) => r.authority === "BIS");
    expect(bis!.status).toBe("EXCEPTION_MAY_APPLY");
  });
});

describe("de-minimis: REQUIRES_LEGAL_REVIEW", () => {
  it("adds BIS UNKNOWN requirement", () => {
    const dm = makeDeMinimis("REQUIRES_LEGAL_REVIEW");
    const det = determineLicenseRequirements(CLEAN_EVAL, dm);
    const bis = det.requirements.find((r) => r.authority === "BIS");
    expect(bis!.status).toBe("UNKNOWN");
  });

  it("gate is REVIEW_NEEDED for UNKNOWN status", () => {
    const dm = makeDeMinimis("REQUIRES_LEGAL_REVIEW");
    const det = determineLicenseRequirements(CLEAN_EVAL, dm);
    expect(det.gate).toBe("REVIEW_NEEDED");
  });
});

// ─── 4. EU / DE BAFA ──────────────────────────────────────────────────

describe("EU/DE BAFA gate", () => {
  it("adds BAFA requirement when EU_ANNEX_I codes present", () => {
    const det = determineLicenseRequirements(EU_ONLY_EVAL, null);
    const bafa = det.requirements.find((r) => r.authority === "BAFA");
    expect(bafa).toBeDefined();
  });

  it("BAFA status is REQUIRED for non-MTCR EU codes", () => {
    const det = determineLicenseRequirements(EU_ONLY_EVAL, null);
    const bafa = det.requirements.find((r) => r.authority === "BAFA");
    expect(bafa!.status).toBe("REQUIRED");
  });

  it("BAFA licenseType is BAFA_ANTRAG", () => {
    const det = determineLicenseRequirements(EU_ONLY_EVAL, null);
    const bafa = det.requirements.find((r) => r.authority === "BAFA");
    expect(bafa!.licenseType).toBe("BAFA_ANTRAG");
  });

  it("BAFA status is DENIED when MTCR Cat. I codes present in results", () => {
    const det = determineLicenseRequirements(EU_MTCR_EVAL, null);
    const bafa = det.requirements.find((r) => r.authority === "BAFA");
    expect(bafa!.status).toBe("DENIED");
  });

  it("no BAFA requirement when no EU/DE codes", () => {
    const det = determineLicenseRequirements(CLEAN_EVAL, null);
    const bafa = det.requirements.find((r) => r.authority === "BAFA");
    expect(bafa).toBeUndefined();
  });
});

// ─── 5. No de-minimis provided ────────────────────────────────────────

describe("no de-minimis provided", () => {
  it("adds BIS UNKNOWN when trigger fired but no de-minimis", () => {
    const evalWithTrigger: TriggerEvaluation = {
      ...CLEAN_EVAL,
      triggeredRuleCount: 1,
    };
    const det = determineLicenseRequirements(evalWithTrigger, null);
    const bis = det.requirements.find((r) => r.authority === "BIS");
    expect(bis!.status).toBe("UNKNOWN");
  });

  it("no BIS requirement added when no trigger and no de-minimis", () => {
    const det = determineLicenseRequirements(CLEAN_EVAL, null);
    const bis = det.requirements.find((r) => r.authority === "BIS");
    expect(bis).toBeUndefined();
  });

  it("ITAR eval skips BIS UNKNOWN (ITAR takes precedence)", () => {
    const det = determineLicenseRequirements(ITAR_EVAL, null);
    // With no de-minimis passed, itarBlock is true, triggeredRuleCount > 0
    // but the code only adds BIS UNKNOWN when !itarBlock
    const unknownBis = det.requirements.find(
      (r) => r.authority === "BIS" && r.status === "UNKNOWN",
    );
    expect(unknownBis).toBeUndefined();
  });
});

// ─── 6. Gate logic ────────────────────────────────────────────────────

describe("gate logic", () => {
  it("CLEARED when no rules triggered and no de-minimis", () => {
    const det = determineLicenseRequirements(CLEAN_EVAL, null);
    expect(det.gate).toBe("CLEARED");
  });

  it("BLOCKED takes priority over REVIEW_NEEDED", () => {
    // MTCR block + ITAR
    const det = determineLicenseRequirements(MTCR_CAT_I_EVAL, null);
    expect(det.gate).toBe("BLOCKED");
  });

  it("REVIEW_NEEDED when ITAR (no MTCR block)", () => {
    const det = determineLicenseRequirements(ITAR_EVAL, null);
    expect(det.gate).toBe("REVIEW_NEEDED");
  });

  it("REVIEW_NEEDED when de-minimis exceeded (no block)", () => {
    const dm = makeDeMinimis("DE_MINIMIS_EXCEEDED");
    const det = determineLicenseRequirements(CLEAN_EVAL, dm);
    expect(det.gate).toBe("REVIEW_NEEDED");
  });

  it("embargoBlock is false when no embargo", () => {
    const det = determineLicenseRequirements(CLEAN_EVAL, null);
    expect(det.embargoBlock).toBe(false);
  });
});

// ─── 7. isExportBlocked helper ────────────────────────────────────────

describe("isExportBlocked()", () => {
  it("returns true when gate is BLOCKED", () => {
    const det = determineLicenseRequirements(MTCR_CAT_I_EVAL, null);
    expect(isExportBlocked(det)).toBe(true);
  });

  it("returns false when gate is REVIEW_NEEDED", () => {
    const det = determineLicenseRequirements(ITAR_EVAL, null);
    expect(isExportBlocked(det)).toBe(false);
  });

  it("returns false when gate is CLEARED", () => {
    const det = determineLicenseRequirements(CLEAN_EVAL, null);
    expect(isExportBlocked(det)).toBe(false);
  });
});

// ─── 8. countRequiredLicenses helper ──────────────────────────────────

describe("countRequiredLicenses()", () => {
  it("returns 0 when cleared", () => {
    const det = determineLicenseRequirements(CLEAN_EVAL, null);
    expect(countRequiredLicenses(det)).toBe(0);
  });

  it("counts REQUIRED status", () => {
    const dm = makeDeMinimis("DE_MINIMIS_EXCEEDED");
    const det = determineLicenseRequirements(ITAR_EVAL, dm);
    // DDTC (REQUIRED) + BIS (REQUIRED from ITAR_CONTROLLED path via dm)
    const count = countRequiredLicenses(det);
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it("counts DENIED as requiring action", () => {
    const det = determineLicenseRequirements(MTCR_CAT_I_EVAL, null);
    // MTCR DENIED + DDTC REQUIRED
    expect(countRequiredLicenses(det)).toBeGreaterThanOrEqual(2);
  });
});

// ─── 9. Disclaimer ────────────────────────────────────────────────────

describe("disclaimer", () => {
  it("is always present and non-empty", () => {
    const inputs: [TriggerEvaluation, DeMinimisResult | null][] = [
      [CLEAN_EVAL, null],
      [ITAR_EVAL, null],
      [MTCR_CAT_I_EVAL, null],
      [EU_ONLY_EVAL, null],
      [CLEAN_EVAL, makeDeMinimis("DE_MINIMIS_EXCEEDED")],
    ];
    for (const [ev, dm] of inputs) {
      const det = determineLicenseRequirements(ev, dm);
      expect(det.disclaimer).toBeTruthy();
      expect(det.disclaimer.length).toBeGreaterThan(50);
    }
  });

  it("mentions legal counsel", () => {
    const det = determineLicenseRequirements(CLEAN_EVAL, null);
    expect(det.disclaimer.toLowerCase()).toContain("counsel");
  });
});

// ─── 10. Combined scenario ────────────────────────────────────────────

describe("combined scenario: ITAR + EU/DE codes", () => {
  it("includes both DDTC and BAFA requirements", () => {
    const combined: TriggerEvaluation = {
      ...ITAR_EVAL,
      results: [...ITAR_EVAL.results, ...EU_ONLY_EVAL.results],
    };
    const det = determineLicenseRequirements(combined, null);
    const ddtc = det.requirements.find((r) => r.authority === "DDTC");
    const bafa = det.requirements.find((r) => r.authority === "BAFA");
    expect(ddtc).toBeDefined();
    expect(bafa).toBeDefined();
  });
});

// ─── 11. Sprint D4 — license-exception-matrix integration ─────────────

describe("Sprint D4: exceptionContext downgrades REQUIRED → EXCEPTION_MAY_APPLY", () => {
  it("backward-compatible: no exceptionContext keeps pre-D4 behaviour", () => {
    const det = determineLicenseRequirements(
      EU_ONLY_EVAL,
      makeDeMinimis("DE_MINIMIS_EXCEEDED"),
      "FR",
    );
    // BIS REQUIRED + BAFA REQUIRED — no exception folded in
    const bis = det.requirements.find((r) => r.authority === "BIS");
    const bafa = det.requirements.find((r) => r.authority === "BAFA");
    expect(bis?.status).toBe("REQUIRED");
    expect(bafa?.status).toBe("REQUIRED");
    expect(det.applicableExceptions).toBeUndefined();
  });

  it("downgrades BAFA REQUIRED → EXCEPTION_MAY_APPLY when AGG-12 applies (EU destination)", () => {
    const det = determineLicenseRequirements(EU_ONLY_EVAL, null, "FR", {
      classification: {},
    });
    const bafa = det.requirements.find((r) => r.authority === "BAFA");
    expect(bafa?.status).toBe("EXCEPTION_MAY_APPLY");
    expect(bafa?.licenseType).toBe("LICENSE_EXCEPTION");
    expect(bafa?.applicableException?.code).toBe("BAFA_AGG_12");
    expect(bafa?.applicableException?.citation).toContain("AGG Nr. 12");
    expect(bafa?.applicableException?.conditions.length).toBeGreaterThan(0);
  });

  it("downgrades BIS REQUIRED → EXCEPTION_MAY_APPLY when STA applies (Country Group A:5)", () => {
    const det = determineLicenseRequirements(
      CLEAN_EVAL,
      makeDeMinimis("DE_MINIMIS_EXCEEDED"),
      "JP",
      { classification: { eccnUS: "5A002.a" } },
    );
    const bis = det.requirements.find((r) => r.authority === "BIS");
    expect(bis?.status).toBe("EXCEPTION_MAY_APPLY");
    expect(bis?.applicableException?.code).toMatch(
      /^BIS_LICENSE_EXCEPTION_(STA|ENC)$/,
    );
  });

  it("does NOT downgrade DENIED requirements (embargo / MTCR Cat I stays blocked)", () => {
    const det = determineLicenseRequirements(
      CLEAN_EVAL,
      makeDeMinimis("EMBARGOED_DESTINATION"),
      "IR",
      { classification: { eccnUS: "5A002.a" } },
    );
    const bis = det.requirements.find((r) => r.authority === "BIS");
    expect(bis?.status).toBe("DENIED");
    expect(bis?.applicableException).toBeUndefined();
  });

  it("does NOT downgrade LIKELY_REQUIRED (FDPR_TRIGGERED)", () => {
    const det = determineLicenseRequirements(
      CLEAN_EVAL,
      makeDeMinimis("FDPR_TRIGGERED"),
      "FR",
      { classification: { eccnUS: "5A002.a" } },
    );
    const bis = det.requirements.find((r) => r.authority === "BIS");
    expect(bis?.status).toBe("LIKELY_REQUIRED");
    expect(bis?.applicableException).toBeUndefined();
  });

  it("rolls all applicable exceptions to top-level applicableExceptions", () => {
    const det = determineLicenseRequirements(
      EU_ONLY_EVAL,
      makeDeMinimis("DE_MINIMIS_EXCEEDED"),
      "FR",
      { classification: { eccnUS: "5A002.a", eccnEU: "5A002.a" } },
    );
    expect(det.applicableExceptions).toBeDefined();
    expect(det.applicableExceptions!.length).toBeGreaterThan(0);
    const codes = det.applicableExceptions!.map((e) => e.code);
    // Multiple exceptions could fire (STA, ENC, AGG-12); at least one
    expect(codes.length).toBeGreaterThanOrEqual(1);
  });

  it("BAFA REQUIRED stays REQUIRED when no BAFA exception applies (CN outside EU/EEA + outside EU001)", () => {
    const det = determineLicenseRequirements(
      EU_ONLY_EVAL,
      makeDeMinimis("DE_MINIMIS_EXCEEDED"),
      "CN",
      { classification: { eccnUS: "9A515.a", eccnEU: "9A004" } },
    );
    const bafa = det.requirements.find((r) => r.authority === "BAFA");
    // AGG-12 rejects (CN not EU/EEA), AGG-27 rejects (not 4D/5D),
    // EUGEA EU001 rejects (CN not in EU001 allow-list)
    expect(bafa?.status).toBe("REQUIRED");
    expect(bafa?.applicableException).toBeUndefined();
  });

  it("augments reason + recommendedAction with exception detail", () => {
    const det = determineLicenseRequirements(EU_ONLY_EVAL, null, "DE", {
      classification: {},
    });
    const bafa = det.requirements.find((r) => r.authority === "BAFA");
    expect(bafa?.reason).toMatch(/AGG Nr\. 12/);
    expect(bafa?.recommendedAction).toMatch(/Evaluate.*AGG.*conditions/);
  });
});

// ─── evalWith helper (used by Gate 3.5 tests) ─────────────────────────────────
// Builds a TriggerEvaluation with no triggered results (equivalent to CLEAN_EVAL
// but callable as evalWith() per the gate-3.5 test spec).
function evalWith(
  results: TriggerEvaluation["results"] = [],
): TriggerEvaluation {
  return {
    results,
    hasItarFlag: false,
    hasMtcrCatIFlag: false,
    requiresHumanReview: results.length > 0,
    maxConfidence: results.length > 0 ? "HIGH" : null,
    triggeredRuleCount: results.length,
  };
}

// ─── Sprint Z2b — Annex IV Art. 2b hard prohibition gate ───────────

describe("Gate 0 — EU Reg. 833/2014 Annex IV Art. 2b", () => {
  const ANNEX_IV_HIT = { sanctionsLists: ["EU_ANNEX_IV"] };
  const NO_SANCTIONS = { sanctionsLists: [] };

  it("dual-use item + Annex IV counterparty → PROHIBITED, gate BLOCKED", () => {
    const det = determineLicenseRequirements(
      EU_ONLY_EVAL, // has 9A004 (EU_ANNEX_I)
      null,
      "RU",
      undefined,
      ANNEX_IV_HIT,
    );
    expect(det.annexIVBlock).toBe(true);
    expect(det.gate).toBe("BLOCKED");
    const prohibited = det.requirements.find((r) => r.status === "PROHIBITED");
    expect(prohibited).toBeDefined();
    expect(prohibited?.jurisdiction).toContain("Annex IV");
    expect(prohibited?.reason).toMatch(/Art(\.|icle) ?2b/);
  });

  it("PROHIBITED requirement is NOT downgraded by exception-matrix even when STA/ENC would otherwise apply", () => {
    // Pass an exceptionContext that would normally make STA/ENC apply
    // to a 9A004 to AU (low-risk destination) — but the Annex IV hit
    // should override and keep the PROHIBITED status.
    const det = determineLicenseRequirements(
      EU_ONLY_EVAL,
      null,
      "AU",
      { classification: { eccnUS: "5A002.a", eccnEU: "5A002.a" } },
      ANNEX_IV_HIT,
    );
    const prohibited = det.requirements.find((r) => r.status === "PROHIBITED");
    expect(prohibited).toBeDefined();
    // Even though exceptions may also be listed for other reqs,
    // the PROHIBITED one stays PROHIBITED (no applicableException).
    expect(prohibited?.applicableException).toBeUndefined();
  });

  it("no screeningContext → annexIVBlock false (backward compat)", () => {
    const det = determineLicenseRequirements(EU_ONLY_EVAL, null, "RU");
    expect(det.annexIVBlock).toBe(false);
    // This test pins Gate 0 (party-based Annex IV / Art. 2b) backward-compat:
    // without a screening hit, Gate 0 must not fire. The assertion is scoped
    // to the Gate 0 requirement specifically (triggerCode "EU 833/2014 Art. 2b"
    // / "Annex IV" jurisdiction). Note: as of Gate 1.6 (PF-1, destination-based
    // RU/BY dual-use ban), EU_ONLY_EVAL → RU now legitimately yields a SEPARATE
    // PROHIBITED requirement (triggerCode EU_RESTRICTIVE_RU_DUAL_USE) — that is
    // the intended new behaviour and must NOT be conflated with Gate 0.
    const gate0Prohibition = det.requirements.find(
      (r) => r.triggerCode === "EU 833/2014 Art. 2b",
    );
    expect(gate0Prohibition).toBeUndefined();
  });

  it("screeningContext with non-Annex-IV lists does not trigger Gate 0", () => {
    const det = determineLicenseRequirements(
      EU_ONLY_EVAL,
      null,
      "RU",
      undefined,
      { sanctionsLists: ["EU_FSF", "OFAC_SDN"] },
    );
    expect(det.annexIVBlock).toBe(false);
  });

  it("ITAR-only classification (no EU_ANNEX_I / US_CCL code) → Gate 0 does NOT fire", () => {
    // Items that are purely USML-classified fall outside Art. 2b
    // because Art. 2b targets Annex I dual-use items. ITAR + Annex IV
    // is handled by Gate 2 (DDTC) instead.
    const det = determineLicenseRequirements(
      ITAR_EVAL,
      null,
      "RU",
      undefined,
      ANNEX_IV_HIT,
    );
    expect(det.annexIVBlock).toBe(false);
  });

  it("nextSteps surfaces the BLOCKED message at the top", () => {
    const det = determineLicenseRequirements(
      EU_ONLY_EVAL,
      null,
      "RU",
      undefined,
      ANNEX_IV_HIT,
    );
    expect(det.nextSteps[0]).toMatch(/BLOCKED/);
    expect(det.nextSteps[0]).toMatch(/Art(\.|icle) ?2b/);
  });

  it("clean dual-use item + clean screening → annexIVBlock stays false", () => {
    const det = determineLicenseRequirements(
      EU_ONLY_EVAL,
      null,
      "FR",
      undefined,
      NO_SANCTIONS,
    );
    expect(det.annexIVBlock).toBe(false);
  });

  // ── T-M5: actual ECCN codes must fire Gate 0 even when trigger engine found nothing ──

  it("T-M5 positive: empty trigger results + actual eccnEU set + Annex IV → Art.2b PROHIBITED fires", () => {
    // Simulates a manually-classified dual-use item (eccnEU set by operator) with
    // ZERO heuristic trigger results (no aperture/keyword signal fired the engine).
    // Under EU Reg. 833/2014 Art. 2b the item IS dual-use (it has a real Annex-I ECCN)
    // and the counterparty IS on Annex IV, so the hard prohibition MUST fire.
    const det = determineLicenseRequirements(
      CLEAN_EVAL, // empty triggerEval.results — heuristic found nothing
      null,
      "RU",
      undefined,
      ANNEX_IV_HIT,
      { eccnEU: "5A002", eccnUS: null },
    );
    expect(det.annexIVBlock).toBe(true);
    expect(det.gate).toBe("BLOCKED");
    const prohibited = det.requirements.find((r) => r.status === "PROHIBITED");
    expect(prohibited).toBeDefined();
    expect(prohibited?.jurisdiction).toContain("Annex IV");
    expect(prohibited?.reason).toMatch(/Art(\.|icle) ?2b/);
  });

  it("T-M5 positive: empty trigger results + actual eccnUS set + Annex IV → Art.2b PROHIBITED fires", () => {
    const det = determineLicenseRequirements(
      CLEAN_EVAL,
      null,
      "RU",
      undefined,
      ANNEX_IV_HIT,
      { eccnEU: null, eccnUS: "3A001" },
    );
    expect(det.annexIVBlock).toBe(true);
    expect(det.gate).toBe("BLOCKED");
    const prohibited = det.requirements.find((r) => r.status === "PROHIBITED");
    expect(prohibited).toBeDefined();
  });

  it("T-M5 negative: empty trigger results + NO actual codes + Annex IV → Art.2b does NOT fire (unclassified item)", () => {
    // An item with no dual-use classification at all (no trigger suggestion, no actual ECCN)
    // must NOT trigger the Art. 2b hard prohibition — we cannot presume dual-use status.
    const det = determineLicenseRequirements(
      CLEAN_EVAL, // empty results, no flags
      null,
      "RU",
      undefined,
      ANNEX_IV_HIT,
      { eccnEU: null, eccnUS: null }, // no actual dual-use codes
    );
    expect(det.annexIVBlock).toBe(false);
    const prohibited = det.requirements.find((r) => r.status === "PROHIBITED");
    expect(prohibited).toBeUndefined();
  });

  it("T-M5 negative: empty trigger + no actualCodes arg + Annex IV → backward-compat, no false-fire", () => {
    // Omitting actualCodes entirely (old callers) must not break existing behaviour.
    const det = determineLicenseRequirements(
      CLEAN_EVAL,
      null,
      "RU",
      undefined,
      ANNEX_IV_HIT,
      // actualCodes omitted
    );
    expect(det.annexIVBlock).toBe(false);
  });

  it("T-M5 USML-only: ITAR-flagged item with no eccnEU/eccnUS + Annex IV → Art.2b still does NOT fire", () => {
    // USML/ITAR (munitions) items are not dual-use. Gate 0 keys on eccnEU/eccnUS
    // (dual-use lists). A purely ITAR item has no eccnEU or eccnUS; the DDTC
    // gate (Gate 2) handles it. Art. 2b must not be triggered by ITAR codes.
    const det = determineLicenseRequirements(
      ITAR_EVAL, // hasItarFlag=true, USML codes in results but no EU_ANNEX_I/US_CCL
      null,
      "RU",
      undefined,
      ANNEX_IV_HIT,
      { eccnEU: null, eccnUS: null }, // no actual dual-use ECCN
    );
    expect(det.annexIVBlock).toBe(false);
    const prohibited = det.requirements.find((r) => r.status === "PROHIBITED");
    expect(prohibited).toBeUndefined();
  });
});

describe("Gate 3.5 — declared control-code backstop (T-M5 completion)", () => {
  it("upgrades a declared dual-use eccnEU to REVIEW_NEEDED for a non-EU destination", () => {
    const det = determineLicenseRequirements(
      evalWith(),
      null,
      "CN",
      undefined,
      undefined,
      { eccnEU: "9A515.a" },
    );
    expect(det.gate).toBe("REVIEW_NEEDED");
    expect(
      det.requirements.some((r) => r.triggerCode === "ACTUAL_CODE_DECLARED"),
    ).toBe(true);
  });
  it("leaves a declared dual-use eccnEU CLEARED for an intra-EU destination", () => {
    const det = determineLicenseRequirements(
      evalWith(),
      null,
      "FR",
      undefined,
      undefined,
      { eccnEU: "9A515.a" },
    );
    expect(det.gate).toBe("CLEARED");
  });
  it("does not upgrade for an EAR99 US code", () => {
    const det = determineLicenseRequirements(
      evalWith(),
      null,
      "CN",
      undefined,
      undefined,
      { eccnUS: "EAR99" },
    );
    expect(det.gate).toBe("CLEARED");
  });
  it("does NOT fire the dual-use branch for an unknown destination (item-level, destination-agnostic)", () => {
    const det = determineLicenseRequirements(
      evalWith(),
      null,
      undefined,
      undefined,
      undefined,
      { eccnEU: "9A515.a" },
    );
    expect(det.gate).toBe("CLEARED");
  });
  it("treats Bulgaria as intra-EU (EU-27, not the space-law subset)", () => {
    const det = determineLicenseRequirements(
      evalWith(),
      null,
      "BG",
      undefined,
      undefined,
      { eccnEU: "9A515.a" },
    );
    expect(det.gate).toBe("CLEARED");
  });
  it("does not duplicate the DDTC requirement when heuristic ITAR already fired", () => {
    const det = determineLicenseRequirements(
      ITAR_EVAL,
      null,
      "CN",
      undefined,
      undefined,
      { usmlCategory: "XV(e)" },
    );
    const ddtc = det.requirements.filter((r) => r.authority === "DDTC");
    expect(ddtc).toHaveLength(1);
    expect(det.gate).not.toBe("CLEARED");
  });
  it("surfaces BOTH a DDTC and a BAFA requirement for an item that is ITAR and EU dual-use", () => {
    const det = determineLicenseRequirements(
      evalWith(),
      null,
      "CN",
      undefined,
      undefined,
      { eccnEU: "9A515.a", usmlCategory: "XV(e)" },
    );
    expect(
      det.requirements.some((r) => r.triggerCode === "ACTUAL_USML_DECLARED"),
    ).toBe(true);
    expect(
      det.requirements.some((r) => r.triggerCode === "ACTUAL_CODE_DECLARED"),
    ).toBe(true);
    expect(det.gate).toBe("REVIEW_NEEDED");
  });
  it("keeps the declared-ECCN requirement REQUIRED even when an exception context is supplied", () => {
    const det = determineLicenseRequirements(
      evalWith(),
      null,
      "CN",
      { classification: {} },
      undefined,
      { eccnEU: "9A515.a" },
    );
    const req = det.requirements.find(
      (r) => r.triggerCode === "ACTUAL_CODE_DECLARED",
    );
    expect(req).toBeDefined();
    expect(req!.status).toBe("REQUIRED");
    expect(det.gate).toBe("REVIEW_NEEDED");
  });
  it("upgrades a declared USML category to REVIEW_NEEDED regardless of destination", () => {
    const detEU = determineLicenseRequirements(
      evalWith(),
      null,
      "FR",
      undefined,
      undefined,
      { usmlCategory: "XV(e)" },
    );
    const detNonEU = determineLicenseRequirements(
      evalWith(),
      null,
      "CN",
      undefined,
      undefined,
      { usmlCategory: "XV(e)" },
    );
    expect(detEU.gate).toBe("REVIEW_NEEDED");
    expect(detNonEU.gate).toBe("REVIEW_NEEDED");
    expect(
      detEU.requirements.some((r) => r.triggerCode === "ACTUAL_USML_DECLARED"),
    ).toBe(true);
  });
});

// ─── Gate 4.5: Thin-origin-coverage fail-closed gate (S0 Task 7) ──────
//
// When the exporter's origin regime has maturity 3 ("dünn" = not yet
// deeply modelled) AND the item is control-suspicious, the gate fires
// a mandatory REQUIRES_REVIEW outcome so a human can confirm whether
// the origin jurisdiction's law creates an independent license obligation.

describe("Gate 4.5 — thin origin-regime coverage (fail-closed)", () => {
  // ─── Origin fixtures ──────────────────────────────────────────────
  /** GB = UK_STRATEGIC, maturity 3, supported */
  const GB_ORIGIN: OriginRegimeRouting = {
    dualUsePrimary: "UK_STRATEGIC",
    militaryPrimary: "UK_STRATEGIC",
    multilateralBaseline: ["WASSENAAR", "MTCR", "NSG", "AG"],
    supported: true,
  };
  /** DE = EU_ANNEX_I, maturity 2 (mature regime — gate must NOT fire) */
  const DE_ORIGIN: OriginRegimeRouting = {
    dualUsePrimary: "EU_ANNEX_I",
    militaryPrimary: "EU_CML",
    multilateralBaseline: ["WASSENAAR", "MTCR", "NSG", "AG"],
    supported: true,
  };
  /** JP = JP_METI, maturity 2 after the fan-out (jpOriginModule registered),
   * supported. The General Bulk Export Licence to Group-A states is now modelled,
   * so JP no longer hits Gate 4.5 — see the JP fan-out tests below. */
  const JP_ORIGIN: OriginRegimeRouting = {
    dualUsePrimary: "JP_METI",
    militaryPrimary: null,
    multilateralBaseline: ["WASSENAAR", "MTCR", "NSG", "AG"],
    supported: true,
  };

  it("GB origin (M-UK) + declared EU dual-use ECCN → US: UK module SIEL/REVIEW (no UK OGEL to the US), NOT Gate 4.5", () => {
    // M-UK: GB (UK_STRATEGIC maturity 2 + registered module) NO LONGER hits
    // Gate 4.5. 9A515.a is NOT on Annex IIg, but US is NOT an OGEL Schedule-2
    // destination (there is no UK OGEL covering general dual-use to the close
    // allies) → the UK module returns INDIVIDUAL/REVIEW (SIEL at the ECJU),
    // folded as ORIGIN_INDIVIDUAL_LICENCE. Outcome NOT CLEARED; no THIN_ORIGIN.
    const det = determineLicenseRequirements(
      evalWith(),
      null,
      "US", // non-EU, non-embargo destination to keep prior gates inactive
      undefined,
      undefined,
      { eccnEU: "9A515.a", eccnUS: null, usmlCategory: null },
      GB_ORIGIN,
      "GB",
    );
    expect(det.gate).not.toBe("CLEARED");
    expect(
      det.requirements.some((r) => r.triggerCode === "THIN_ORIGIN_REGIME"),
    ).toBe(false);
    const indiv = det.requirements.find(
      (r) => r.triggerCode === "ORIGIN_INDIVIDUAL_LICENCE",
    );
    expect(indiv).toBeDefined();
    expect(indiv!.reason).toMatch(/SIEL|ECJU/i);
  });

  it("GB origin (M-UK) + declared EU dual-use ECCN → DE: OGEL GENERAL/GO supersedes the generic REVIEW (CLEARED)", () => {
    // 9A515.a is NOT on Annex IIg and DE is an OGEL Schedule-2 destination →
    // the UK module returns GENERAL/GO under the OGEL (Export of Dual-Use items
    // to EU Member States). For an intra-EU destination Gate 3.5's dual-use leg
    // does not fire, so the OGEL GO leaves the gate CLEARED. The deliberate,
    // cited REVIEW→GO refinement (post-Brexit UK→EU is OGEL-covered).
    const det = determineLicenseRequirements(
      evalWith(),
      null,
      "DE",
      undefined,
      undefined,
      { eccnEU: "9A515.a", eccnUS: null, usmlCategory: null },
      GB_ORIGIN,
      "GB",
    );
    const ogel = det.requirements.find(
      (r) => r.triggerCode === "ORIGIN_GENERAL_LICENCE",
    );
    expect(ogel).toBeDefined();
    expect(ogel!.licenseType).toBe("GENERAL_LICENSE");
    expect(ogel!.applicableException?.code).toBe("OGEL_DUAL_USE_EU");
    expect(det.gate).toBe("CLEARED");
  });

  it("GB origin (M-UK) safety pin: 9A004 (Annex IIg/Annex IV) → DE stays REVIEW (SIEL, NOT OGEL)", () => {
    // THE load-bearing fail-closed pin. 9A004 (space launch vehicle) is in
    // Annex IV → Annex-IIg-excluded → no OGEL even to an EU member → SIEL/REVIEW
    // at the ECJU. No false-CLEARED on a sensitive MTCR launch item.
    const det = determineLicenseRequirements(
      evalWith(),
      null,
      "DE",
      undefined,
      undefined,
      { eccnEU: "9A004", eccnUS: null, usmlCategory: null },
      GB_ORIGIN,
      "GB",
    );
    expect(
      det.requirements.some((r) => r.triggerCode === "ORIGIN_GENERAL_LICENCE"),
    ).toBe(false);
    const indiv = det.requirements.find(
      (r) => r.triggerCode === "ORIGIN_INDIVIDUAL_LICENCE",
    );
    expect(indiv).toBeDefined();
    expect(indiv!.status).toBe("REQUIRED");
    expect(indiv!.reason).toMatch(/Annex IIg/);
    expect(det.gate).toBe("REVIEW_NEEDED");
  });

  it("GB origin (M-UK) safety pin: 9A004 → RU stays BLOCKED (Gate 1.6 overrides the UK module)", () => {
    // The UK module runs AFTER Gate 1.6 and is SKIPPED when it blocks. A GB
    // export of an EU-dual-use item (9A004) to RU is prohibited by Gate 1.6
    // (all-origins scope) — no OGEL GO row, verdict stays BLOCKED.
    const det = determineLicenseRequirements(
      evalWith(),
      null,
      "RU",
      undefined,
      undefined,
      { eccnEU: "9A004", eccnUS: null, usmlCategory: null },
      GB_ORIGIN,
      "GB",
    );
    expect(det.gate).toBe("BLOCKED");
    expect(det.embargoBlock).toBe(true);
    expect(
      det.requirements.some((r) => r.triggerCode === "ORIGIN_GENERAL_LICENCE"),
    ).toBe(false);
  });

  it("DE origin (M-EU) + declared EU001-eligible ECCN → EU001 GO supersedes the generic Gate-3.5 BAFA REVIEW", () => {
    // Pre-M-EU this asserted byte-identity (DE adds nothing). M-EU intentionally
    // REFINES: the EU origin module evaluates EUGEA EU001 — 9A515.a is not on
    // the Annex II Section I exclusion list and US is an EU001 destination → the
    // module returns GENERAL/GO under EU001, and the wiring SUPERSEDES the
    // generic Gate-3.5 BAFA `ACTUAL_CODE_DECLARED` REVIEW with that GO. The
    // generic individual-licence REVIEW must be GONE; exactly one EU001
    // general-licence row remains (CLEARED gate).
    const withoutOrigin = determineLicenseRequirements(
      evalWith(),
      null,
      "US",
      undefined,
      undefined,
      { eccnEU: "9A515.a", eccnUS: null, usmlCategory: null },
    );
    // Baseline (no origin): the generic Gate-3.5 BAFA REVIEW fires.
    expect(
      withoutOrigin.requirements.some(
        (r) => r.triggerCode === "ACTUAL_CODE_DECLARED",
      ),
    ).toBe(true);

    const withDeOrigin = determineLicenseRequirements(
      evalWith(),
      null,
      "US",
      undefined,
      undefined,
      { eccnEU: "9A515.a", eccnUS: null, usmlCategory: null },
      DE_ORIGIN,
      "DE",
    );
    // The generic REVIEW is superseded — replaced by the EU001 general licence.
    expect(
      withDeOrigin.requirements.some(
        (r) => r.triggerCode === "ACTUAL_CODE_DECLARED",
      ),
    ).toBe(false);
    const eu001 = withDeOrigin.requirements.find(
      (r) => r.triggerCode === "ORIGIN_GENERAL_LICENCE",
    );
    expect(eu001).toBeDefined();
    expect(eu001!.licenseType).toBe("GENERAL_LICENSE");
    expect(eu001!.applicableException?.code).toBe("EU001");
    expect(eu001!.authority).toBe("EU_COMPETENT_AUTHORITY");
    // The EU general-licence GO leaves the gate CLEARED (no REQUIRED survives).
    expect(withDeOrigin.gate).toBe("CLEARED");
  });

  it("DE origin (M-EU) + Section-I-excluded ECCN (9A106) → INDIVIDUAL REVIEW at the NCA, NEVER a guessed GO", () => {
    // Fail-closed (§4.5): 9A106 is on the Annex II Section I exclusion list
    // (MTCR rocket subsystem) → EU001 does NOT cover it even to a friendly
    // destination → the module returns INDIVIDUAL/REVIEW; no EU001 GO row.
    const det = determineLicenseRequirements(
      evalWith(),
      null,
      "US",
      undefined,
      undefined,
      { eccnEU: "9A106", eccnUS: null, usmlCategory: null },
      DE_ORIGIN,
      "DE",
    );
    expect(
      det.requirements.some((r) => r.triggerCode === "ORIGIN_GENERAL_LICENCE"),
    ).toBe(false);
    const indiv = det.requirements.find(
      (r) => r.triggerCode === "ORIGIN_INDIVIDUAL_LICENCE",
    );
    expect(indiv).toBeDefined();
    expect(indiv!.status).toBe("REQUIRED");
    expect(det.gate).toBe("REVIEW_NEEDED");
  });

  it("DE origin (M-EU) safety pin: EU001-eligible item to RU stays BLOCKED (Gate 1.6 overrides the module)", () => {
    // The origin module runs AFTER the hard-prohibition gates and is SKIPPED
    // when one already blocks. A DE export of an EU-dual-use item (9A515.a) to
    // RU is prohibited by Gate 1.6 (Art. 2/2a Reg 833/2014) — no EU001 GO row,
    // verdict stays BLOCKED.
    const det = determineLicenseRequirements(
      evalWith(),
      null,
      "RU",
      undefined,
      undefined,
      { eccnEU: "9A515.a", eccnUS: null, usmlCategory: null },
      DE_ORIGIN,
      "DE",
    );
    expect(
      det.requirements.some((r) => r.triggerCode === "ORIGIN_GENERAL_LICENCE"),
    ).toBe(false);
    expect(det.gate).toBe("BLOCKED");
    expect(det.embargoBlock).toBe(true);
  });

  it("no exporterOrigin → byte-identical legacy (deep-equal against result without origin param)", () => {
    const legacy = determineLicenseRequirements(
      EU_ONLY_EVAL,
      null,
      "JP",
      undefined,
      undefined,
      { eccnEU: "9A004", eccnUS: null, usmlCategory: null },
    );
    const withUndefined = determineLicenseRequirements(
      EU_ONLY_EVAL,
      null,
      "JP",
      undefined,
      undefined,
      { eccnEU: "9A004", eccnUS: null, usmlCategory: null },
      undefined,
    );
    expect(withUndefined).toEqual(legacy);
  });

  it("JP origin (fan-out, JP_METI maturity 2) + declared non-sensitive ECCN → US: General Bulk Licence GENERAL/GO supersedes the generic REVIEW (CLEARED), NOT Gate 4.5", () => {
    // The origin-determination fan-out (2026-06-13) lifted JP_METI 3 → 2 and
    // registered jpOriginModule. 9A515.a is NOT on the sensitive MTCR/Annex-IV
    // floor and the US is a Group-A state → the JP module returns GENERAL/GO under
    // the General Bulk Export Licence (一般包括許可). For a non-EU destination the
    // generic dual-use REVIEW is superseded by the module's cited GO → CLEARED.
    // No THIN_ORIGIN_REGIME (Gate 4.5 no longer fires for JP).
    const det = determineLicenseRequirements(
      evalWith(),
      null,
      "US",
      undefined,
      undefined,
      { eccnEU: null, eccnUS: "9A515.a", usmlCategory: null },
      JP_ORIGIN,
      "JP",
    );
    expect(det.gate).toBe("CLEARED");
    expect(
      det.requirements.some((r) => r.triggerCode === "THIN_ORIGIN_REGIME"),
    ).toBe(false);
    const general = det.requirements.find(
      (r) => r.triggerCode === "ORIGIN_GENERAL_LICENCE",
    );
    expect(general).toBeDefined();
    expect(general!.reason).toMatch(/Bulk|Group-A|METI|一般包括許可/i);
  });

  it("JP origin (fan-out) + declared non-sensitive ECCN → IN (NOT Group A): individual METI licence (REVIEW), NOT Gate 4.5", () => {
    // India is NOT a Group-A state → the General Bulk Export Licence does not
    // apply; the JP module returns INDIVIDUAL/REVIEW (個別許可 at METI), folded as
    // ORIGIN_INDIVIDUAL_LICENCE → REVIEW_NEEDED. No THIN_ORIGIN_REGIME.
    const det = determineLicenseRequirements(
      evalWith(),
      null,
      "IN",
      undefined,
      undefined,
      { eccnEU: null, eccnUS: "9A515.a", usmlCategory: null },
      JP_ORIGIN,
      "JP",
    );
    expect(det.gate).toBe("REVIEW_NEEDED");
    expect(
      det.requirements.some((r) => r.triggerCode === "THIN_ORIGIN_REGIME"),
    ).toBe(false);
    const indiv = det.requirements.find(
      (r) => r.triggerCode === "ORIGIN_INDIVIDUAL_LICENCE",
    );
    expect(indiv).toBeDefined();
    expect(indiv!.reason).toMatch(/METI|Group-A|Einzel/i);
  });

  it("GB origin + NO control signals (EAR99-like, no declared codes, CLEAN_EVAL) → unchanged vs without origin (gate must NOT blanket-review)", () => {
    const withoutOrigin = determineLicenseRequirements(CLEAN_EVAL, null, "US");
    const withGBNoSignals = determineLicenseRequirements(
      CLEAN_EVAL,
      null,
      "US",
      undefined,
      undefined,
      undefined,
      GB_ORIGIN,
    );
    expect(withGBNoSignals).toEqual(withoutOrigin);
  });

  // militärische Raumfahrt — der Fall, für den das EU_CML-Regime existiert.
  //
  // Data-Sprint S4 lifted EU_CML 3 → 2 (space slice curated, OJ C/2026/1640), so
  // the EU_CML MILITARY leg of Gate 4.5 no longer arms the THIN_ORIGIN_REGIME
  // gate. THE SAFETY PROPERTY THE LIFT RELIES ON: a declared usmlCategory is
  // independently caught by Gate 3.5 (DDTC, ITAR-controlled, no intra-EU
  // exemption, destination-independent) — so the DE-seat verdict stays
  // non-CLEARED via the DDTC path, NOT via the thin-origin path. This is the
  // empirically-proven guard (golden spike byte-identical 74/396/274 across the
  // lift). The test below documents the lift by asserting the new, true path.
  it("DE origin + declared USML item (no eccnEU/eccnUS) → still non-CLEARED, but via Gate 3.5 DDTC (NOT the EU_CML thin-origin leg, which S4's 3→2 lift retired)", () => {
    const det = determineLicenseRequirements(
      evalWith(),
      null,
      "US", // non-EU, non-embargo destination to keep prior gates inactive
      undefined,
      undefined,
      { eccnEU: null, eccnUS: null, usmlCategory: "XV(f)" },
      DE_ORIGIN,
    );
    // Safety net holds: the declared USML item is NOT cleared.
    expect(det.gate).not.toBe("CLEARED");
    // The independent guard is the DDTC (ITAR) requirement from Gate 3.5 —
    // present for ANY destination because ITAR control attaches to the item.
    const ddtcReq = det.requirements.find(
      (r) => r.triggerCode === "ACTUAL_USML_DECLARED",
    );
    expect(ddtcReq).toBeDefined();
    expect(ddtcReq!.authority).toBe("DDTC");
    expect(ddtcReq!.reason).toMatch(/ITAR|USML/i);
    // And the EU_CML thin-origin leg no longer fires (EU_CML is Tier 2 now): a
    // declared usmlCategory alone must NOT raise a THIN_ORIGIN_REGIME review for
    // an EU seat anymore — the lift retired exactly this path.
    const thinReq = det.requirements.find(
      (r) => r.triggerCode === "THIN_ORIGIN_REGIME",
    );
    expect(thinReq).toBeUndefined();
  });

  // Restores military-leg positive coverage after the EU_CML tier-2 retirement (W6 finding S4).
  // GB_ORIGIN has militaryPrimary: "UK_STRATEGIC" (tier 3) → the military branch of Gate 4.5
  // must still arm THIN_ORIGIN_REGIME for a GB-seated exporter with an ITAR-signal item.
  // Gate 3.5 also fires independently (ACTUAL_USML_DECLARED → DDTC REQUIRED), so both guards
  // are present in the same result. Asserting both here documents the dual-guard invariant.
  it("GB origin (M-UK) + declared usmlCategory (no eccnEU/eccnUS) → Gate-3.5 DDTC requirement (no THIN_ORIGIN, no UK OGEL)", () => {
    const det = determineLicenseRequirements(
      evalWith(),
      null,
      "US", // non-EU, non-embargo destination to keep prior gates inactive
      undefined,
      undefined,
      { eccnEU: null, eccnUS: null, usmlCategory: "XV(f)" },
      GB_ORIGIN,
      "GB",
    );
    // M-UK: GB no longer hits Gate 4.5. The UK module deliberately does NOT model
    // USML/ITAR items (ukControlledCode excludes usmlCategory — ITAR is US law,
    // handled by the upstream DDTC gate), so it returns NONE and folds nothing.
    expect(
      det.requirements.some((r) => r.triggerCode === "THIN_ORIGIN_REGIME"),
    ).toBe(false);
    expect(
      det.requirements.some((r) => r.triggerCode === "ORIGIN_GENERAL_LICENCE"),
    ).toBe(false);
    // Gate 3.5 DDTC guard fires independently (ITAR attaches to the item
    // regardless of origin) — this is the non-clearance guard for a USML item.
    const ddtcReq = det.requirements.find(
      (r) => r.triggerCode === "ACTUAL_USML_DECLARED",
    );
    expect(ddtcReq).toBeDefined();
    expect(ddtcReq!.authority).toBe("DDTC");
    // Verdict must not be CLEARED — the DDTC guard is active.
    expect(det.gate).not.toBe("CLEARED");
  });
});

// ─── Gate 1.6 — EU restrictive measures: RU/BY dual-use destination ban ────
//
// PF-1 (S0): the DESTINATION-based prohibition on exporting EU-dual-use
// items (Annex I of Reg. 2021/821) to Russia/Belarus. Legal basis:
//   • Council Reg. (EU) 833/2014 Art. 2 + Art. 2a (RU) — destination-based,
//     no listed counterparty required.
//   • Council Reg. (EC) 765/2006 Art. 1e/1f (BY) — analogous BY ban.
// This is DISTINCT from Gate 0 (party-based Annex IV / Art. 2b). Gate 1.6
// fires on destination + an EU-dual-use control signal, with NO screening
// hit needed. It is tightening-only (never weakens a stricter outcome) and
// scoped to ALL exporter origins (over-blocking acceptable; US/UK have
// equivalent RU prohibitions).
describe("Gate 1.6 — RU/BY destination ban on EU dual-use (Reg 833/2014 + 765/2006)", () => {
  it("DE + declared eccnEU 9A004 + RU → BLOCKED, reason cites 833/2014, embargo flag true", () => {
    const det = determineLicenseRequirements(
      evalWith(), // no heuristic trigger — declared code is the only signal
      null,
      "RU",
      undefined,
      undefined,
      { eccnEU: "9A004", eccnUS: null, usmlCategory: null },
    );
    expect(det.gate).toBe("BLOCKED");
    expect(det.embargoBlock).toBe(true);
    const ru = det.requirements.find(
      (r) => r.triggerCode === "EU_RESTRICTIVE_RU_DUAL_USE",
    );
    expect(ru).toBeDefined();
    expect(ru!.status).toBe("PROHIBITED");
    expect(ru!.reason).toMatch(/833\/2014/);
  });

  it("DE + declared eccnEU 9A004 + BY → BLOCKED, reason cites 765/2006", () => {
    const det = determineLicenseRequirements(
      evalWith(),
      null,
      "BY",
      undefined,
      undefined,
      { eccnEU: "9A004", eccnUS: null, usmlCategory: null },
    );
    expect(det.gate).toBe("BLOCKED");
    expect(det.embargoBlock).toBe(true);
    const by = det.requirements.find(
      (r) => r.triggerCode === "EU_RESTRICTIVE_BY_DUAL_USE",
    );
    expect(by).toBeDefined();
    expect(by!.status).toBe("PROHIBITED");
    expect(by!.reason).toMatch(/765\/2006/);
  });

  it("GB + declared eccnEU + RU → BLOCKED (all-origins scope pin)", () => {
    // Scope decision: the gate fires for ALL exporter origins, not only EU
    // seats. Over-blocking is acceptable by product principle; US/UK have
    // equivalent RU dual-use prohibitions. A non-EU honest-path would need
    // per-origin embargo-law modelling = out of S0 scope.
    const det = determineLicenseRequirements(
      evalWith(),
      null,
      "RU",
      undefined,
      undefined,
      { eccnEU: "9A004", eccnUS: null, usmlCategory: null },
      // GB origin: dual-use UK_STRATEGIC, supported. Gate 4.5 may also flag a
      // thin-origin review, but the RU ban must already force BLOCKED.
      {
        dualUsePrimary: "UK_STRATEGIC",
        militaryPrimary: "UK_STRATEGIC",
        multilateralBaseline: ["WASSENAAR", "MTCR", "NSG", "AG"],
        supported: true,
      },
    );
    expect(det.gate).toBe("BLOCKED");
    expect(det.embargoBlock).toBe(true);
    const ru = det.requirements.find(
      (r) => r.triggerCode === "EU_RESTRICTIVE_RU_DUAL_USE",
    );
    expect(ru?.status).toBe("PROHIBITED");
  });

  it("DE + declared eccnEU + CN → unchanged vs pre-gate snapshot (no creep)", () => {
    // CN is not RU/BY → Gate 1.6 must NOT fire. The result must deep-equal
    // the determination an unaffected destination produces. CN keeps the
    // ordinary Gate 3.5 dual-use REVIEW path.
    const args = (dest: string) =>
      determineLicenseRequirements(
        evalWith(),
        null,
        dest,
        undefined,
        undefined,
        {
          eccnEU: "9A004",
          eccnUS: null,
          usmlCategory: null,
        },
      );
    const cn = args("CN");
    expect(cn.gate).toBe("REVIEW_NEEDED");
    expect(cn.embargoBlock).toBe(false);
    expect(
      cn.requirements.some((r) => r.triggerCode?.startsWith("EU_RESTRICTIVE_")),
    ).toBe(false);
    // No 833/765 requirement anywhere.
    expect(
      cn.requirements.some((r) => /833\/2014|765\/2006/.test(r.reason)),
    ).toBe(false);
  });

  it("DE + NO control signals + RU → unchanged (uncontrolled stays uncontrolled at THIS layer)", () => {
    // An item with no declared code AND no heuristic trigger going to RU is
    // not caught by Gate 1.6 — we cannot presume EU Annex I control. The
    // Art. 2a advanced-tech leg (Annex XXIII et al.) is honestly out of scope
    // here (no reliable itemClass signal); S1+ corpus work will widen it.
    const det = determineLicenseRequirements(
      CLEAN_EVAL, // no trigger, no flags
      null,
      "RU",
      undefined,
      undefined,
      { eccnEU: null, eccnUS: null, usmlCategory: null },
    );
    expect(det.gate).toBe("CLEARED");
    expect(det.embargoBlock).toBe(false);
    expect(
      det.requirements.some((r) =>
        r.triggerCode?.startsWith("EU_RESTRICTIVE_"),
      ),
    ).toBe(false);
  });

  it("DE + declared usmlCategory ONLY (no eccnEU) + RU → does NOT gain the 833 requirement (boundary pin)", () => {
    // USML/ITAR-only signals are the US-law leg; AVA's itarBlock hard-blocks
    // them separately. Gate 1.6 (EU-dual-use ban) must NOT newly fire on a
    // purely USML-classified item — the EU Annex I signal is absent.
    const det = determineLicenseRequirements(
      evalWith(),
      null,
      "RU",
      undefined,
      undefined,
      { eccnEU: null, eccnUS: null, usmlCategory: "XV(e)" },
    );
    expect(
      det.requirements.some((r) =>
        r.triggerCode?.startsWith("EU_RESTRICTIVE_"),
      ),
    ).toBe(false);
    // The DDTC requirement (Gate 3.5 USML leg) still appears.
    expect(det.requirements.some((r) => r.authority === "DDTC")).toBe(true);
  });

  it("heuristic EU dual-use signal (EU_ONLY_EVAL, no declared code) + RU → BLOCKED via Gate 1.6", () => {
    // The gate also fires on the heuristic EU_ANNEX_I/US_CCL signal that
    // Gate 4.5 uses — not only on declared codes. EU_ONLY_EVAL carries a
    // 9A004 EU_ANNEX_I suggested code from the trigger engine.
    const det = determineLicenseRequirements(EU_ONLY_EVAL, null, "RU");
    expect(det.gate).toBe("BLOCKED");
    expect(det.embargoBlock).toBe(true);
    const ru = det.requirements.find(
      (r) => r.triggerCode === "EU_RESTRICTIVE_RU_DUAL_USE",
    );
    expect(ru?.status).toBe("PROHIBITED");
  });

  it("eccnUS = EAR99 + RU → does NOT fire (EAR99 is not a control signal)", () => {
    const det = determineLicenseRequirements(
      evalWith(),
      null,
      "RU",
      undefined,
      undefined,
      { eccnEU: null, eccnUS: "EAR99", usmlCategory: null },
    );
    expect(
      det.requirements.some((r) =>
        r.triggerCode?.startsWith("EU_RESTRICTIVE_"),
      ),
    ).toBe(false);
    expect(det.embargoBlock).toBe(false);
  });

  it("does not double-block when Gate 0 (Annex IV) already prohibits — idempotency/tightening", () => {
    // Party-based Gate 0 fires PROHIBITED first; Gate 1.6 must not add a
    // duplicate prohibition (alreadyProhibited guard). Still BLOCKED.
    const det = determineLicenseRequirements(
      EU_ONLY_EVAL,
      null,
      "RU",
      undefined,
      { sanctionsLists: ["EU_ANNEX_IV"] },
      { eccnEU: "9A004", eccnUS: null, usmlCategory: null },
    );
    expect(det.gate).toBe("BLOCKED");
    expect(det.annexIVBlock).toBe(true);
    const restrictive = det.requirements.filter(
      (r) => r.triggerCode === "EU_RESTRICTIVE_RU_DUAL_USE",
    );
    expect(restrictive).toHaveLength(0);
  });

  it("case-insensitive destination (lowercase ru) still fires", () => {
    const det = determineLicenseRequirements(
      evalWith(),
      null,
      "ru",
      undefined,
      undefined,
      { eccnEU: "9A004", eccnUS: null, usmlCategory: null },
    );
    expect(det.gate).toBe("BLOCKED");
    expect(det.embargoBlock).toBe(true);
  });

  // ── Review-finding 2026-06-12: qualified citation on US-ECCN-only path ──
  //
  // When the ONLY control signal is a declared non-EAR99 US ECCN (eccnUS set,
  // eccnEU null, no EU_ANNEX_I/US_CCL heuristic), we cannot assert that the
  // item is on EU Annex I. The gate still BLOCKs (conservative) but the reason
  // must use a qualified citation rather than an unconditional Annex I claim.
  //
  // (a) US-ECCN-only path (9A515.a) + RU → BLOCKED + embargoBlock + reason
  //     matches /konservativ.*soweit|soweit das Gut/ AND /833\/2014/
  it("US-ECCN-only path (eccnUS 9A515.a, eccnEU null, no heuristic) + RU → BLOCKED with qualified 'konservativ/soweit' citation", () => {
    const det = determineLicenseRequirements(
      evalWith(), // no heuristic EU_ANNEX_I/US_CCL signal
      null,
      "RU",
      undefined,
      undefined,
      { eccnEU: null, eccnUS: "9A515.a", usmlCategory: null },
    );
    expect(det.gate).toBe("BLOCKED");
    expect(det.embargoBlock).toBe(true);
    const ru = det.requirements.find(
      (r) => r.triggerCode === "EU_RESTRICTIVE_RU_DUAL_USE",
    );
    expect(ru).toBeDefined();
    expect(ru!.status).toBe("PROHIBITED");
    expect(ru!.reason).toMatch(/833\/2014/);
    // Must use the qualified (conservative) citation — not the unqualified Annex I claim
    expect(ru!.reason).toMatch(/konservativ.*soweit|soweit das Gut/i);
  });

  // (b) EU-signal path (eccnEU "9A004") + RU → reason UNCHANGED (unqualified).
  //     The differentiated text must NOT leak into this path.
  it("EU-signal path (eccnEU set) + RU → reason unchanged (unqualified Annex I citation, no 'konservativ')", () => {
    const det = determineLicenseRequirements(
      evalWith(),
      null,
      "RU",
      undefined,
      undefined,
      { eccnEU: "9A004", eccnUS: null, usmlCategory: null },
    );
    const ru = det.requirements.find(
      (r) => r.triggerCode === "EU_RESTRICTIVE_RU_DUAL_USE",
    );
    expect(ru).toBeDefined();
    // The EU-signal reason must assert Anhang I directly (unqualified)
    expect(ru!.reason).toMatch(/Anhang I VO 2021\/821/);
    // Must NOT contain the qualified/conservative wording
    expect(ru!.reason).not.toMatch(/konservativ.*soweit|soweit das Gut/i);
  });

  // (c) US-ECCN-only path + BY → BLOCKED with qualified citation referencing 765/2006
  it("US-ECCN-only path (eccnUS 9A515.a, eccnEU null, no heuristic) + BY → BLOCKED with qualified '765/2006' citation", () => {
    const det = determineLicenseRequirements(
      evalWith(),
      null,
      "BY",
      undefined,
      undefined,
      { eccnEU: null, eccnUS: "9A515.a", usmlCategory: null },
    );
    expect(det.gate).toBe("BLOCKED");
    expect(det.embargoBlock).toBe(true);
    const by = det.requirements.find(
      (r) => r.triggerCode === "EU_RESTRICTIVE_BY_DUAL_USE",
    );
    expect(by).toBeDefined();
    expect(by!.status).toBe("PROHIBITED");
    expect(by!.reason).toMatch(/765\/2006/);
    // Must use the qualified (conservative) citation
    expect(by!.reason).toMatch(/konservativ.*soweit|soweit das Gut/i);
  });
});
