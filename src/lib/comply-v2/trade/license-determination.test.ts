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
