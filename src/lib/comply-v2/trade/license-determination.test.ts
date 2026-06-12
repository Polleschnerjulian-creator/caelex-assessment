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
    expect(
      det.requirements.find((r) => r.status === "PROHIBITED"),
    ).toBeUndefined();
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
  /** JP = JP_METI, maturity 3, supported */
  const JP_ORIGIN: OriginRegimeRouting = {
    dualUsePrimary: "JP_METI",
    militaryPrimary: null,
    multilateralBaseline: ["WASSENAAR", "MTCR", "NSG", "AG"],
    supported: true,
  };

  it("GB origin + declared EU dual-use ECCN → outcome NOT CLEARED, reason mentions UK and thin coverage", () => {
    const det = determineLicenseRequirements(
      evalWith(),
      null,
      "US", // non-EU, non-embargo destination to keep prior gates inactive
      undefined,
      undefined,
      { eccnEU: "9A515.a", eccnUS: null, usmlCategory: null },
      GB_ORIGIN,
    );
    expect(det.gate).not.toBe("CLEARED");
    const thinReq = det.requirements.find(
      (r) => r.triggerCode === "THIN_ORIGIN_REGIME",
    );
    expect(thinReq).toBeDefined();
    expect(thinReq!.reason).toMatch(/UK.*nicht tief|noch nicht tief/i);
  });

  it("DE origin (EU_ANNEX_I maturity 2) + declared EU ECCN → result deep-equals result WITHOUT exporterOrigin (gate adds nothing)", () => {
    const withoutOrigin = determineLicenseRequirements(
      evalWith(),
      null,
      "US",
      undefined,
      undefined,
      { eccnEU: "9A515.a", eccnUS: null, usmlCategory: null },
    );
    const withDeOrigin = determineLicenseRequirements(
      evalWith(),
      null,
      "US",
      undefined,
      undefined,
      { eccnEU: "9A515.a", eccnUS: null, usmlCategory: null },
      DE_ORIGIN,
    );
    expect(withDeOrigin).toEqual(withoutOrigin);
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

  it("JP origin (JP_METI maturity 3) + declared ECCN → REQUIRES_REVIEW with JP reason", () => {
    const det = determineLicenseRequirements(
      evalWith(),
      null,
      "US",
      undefined,
      undefined,
      { eccnEU: null, eccnUS: "9A515.a", usmlCategory: null },
      JP_ORIGIN,
    );
    expect(det.gate).not.toBe("CLEARED");
    const thinReq = det.requirements.find(
      (r) => r.triggerCode === "THIN_ORIGIN_REGIME",
    );
    expect(thinReq).toBeDefined();
    expect(thinReq!.reason).toMatch(
      /JP.*nicht tief|Japan.*nicht tief|noch nicht tief.*JP|JP_METI/i,
    );
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
  it("DE origin + declared USML item (no eccnEU/eccnUS) → military leg arms EU_CML thin-coverage gate → REVIEW_NEEDED with THIN_ORIGIN_REGIME and EU_CML reason", () => {
    const det = determineLicenseRequirements(
      evalWith(),
      null,
      "US", // non-EU, non-embargo destination to keep prior gates inactive
      undefined,
      undefined,
      { eccnEU: null, eccnUS: null, usmlCategory: "XV(f)" },
      DE_ORIGIN,
    );
    expect(det.gate).not.toBe("CLEARED");
    const thinReq = det.requirements.find(
      (r) => r.triggerCode === "THIN_ORIGIN_REGIME",
    );
    expect(thinReq).toBeDefined();
    expect(thinReq!.reason).toMatch(
      /EU.?CML|Militärgüterliste|Common Military List/i,
    );
  });
});
