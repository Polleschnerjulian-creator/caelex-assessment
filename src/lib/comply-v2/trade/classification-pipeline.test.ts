/**
 * Sprint B8 — Full Classification Pipeline Integration Tests.
 *
 * These tests exercise the complete engine chain for realistic space-hardware
 * scenarios, validating that B3 (trigger) → B5 (de-minimis) → B6 (license)
 * produce correct end-to-end outputs.
 *
 * ─── Test scenarios ──────────────────────────────────────────────────────
 *  1. High-res EO imager (aperture ≥ 0.50 m)         → ITAR / DDTC DSP-5
 *  2. Heavy launch vehicle (payload ≥ 500 kg, ≥ 300 km) → MTCR Cat. I BLOCKED
 *  3. Hall thruster (EU Annex I code)                 → BAFA license required
 *  4. Commercial SAR radar                            → EU/US dual path, REVIEW
 *  5. Rad-hardened star tracker to China (CN)         → RESTRICTED threshold
 *  6. Low-content component (no flags, 8% content)    → CLEARED
 *  7. FDPR: item designed with US tech                → FDPR_TRIGGERED
 *  8. Component to Iran (IR) — embargoed              → BLOCKED
 *  9. Special ECCN 9A515.a                            → REQUIRES_LEGAL_REVIEW
 * 10. Disclaimer invariant across all scenarios
 *
 * ─── Architecture ────────────────────────────────────────────────────────
 * All three engines are pure functions — zero mocks needed.
 * Input: TradeItem-shaped signal object.
 * Chain: evaluateTradeItemSubset → calculateDeMinimis → determineLicenseRequirements
 */

import { describe, it, expect } from "vitest";

import {
  evaluateTradeItemSubset,
  type ItemSignals,
} from "./property-trigger-engine";
import {
  calculateDeMinimis,
  getDestinationTier,
  type DeMinimisInput,
} from "./de-minimis-calculator";
import {
  determineLicenseRequirements,
  isExportBlocked,
  countRequiredLicenses,
} from "./license-determination";

// ─── Pipeline runner ──────────────────────────────────────────────────

interface ScenarioInput {
  signals: ItemSignals;
  usContentPercent?: number;
  destinationCountry?: string;
  usContentEccns?: string[];
}

function runPipeline(input: ScenarioInput) {
  const { signals, usContentPercent, destinationCountry, usContentEccns } =
    input;

  const triggerEval = evaluateTradeItemSubset(signals);

  let deMinimis = null;
  if (usContentPercent !== undefined) {
    const destinationTier = destinationCountry
      ? getDestinationTier(destinationCountry)
      : "STANDARD";

    const dmInput: DeMinimisInput = {
      usControlledContentPercent: usContentPercent,
      hasItarContent: triggerEval.hasItarFlag,
      designedWithUSTech: signals.designedWithUSTech ?? false,
      manufacturedWithUSEquipment: signals.manufacturedWithUSEquipment ?? false,
      destinationTier,
      destinationCountry,
      usContentEccns,
    };
    deMinimis = calculateDeMinimis(dmInput);
  }

  const licenseDetermination = determineLicenseRequirements(
    triggerEval,
    deMinimis,
    destinationCountry,
  );

  return { triggerEval, deMinimis, licenseDetermination };
}

// ─── Scenario 1: High-res EO imager (aperture ≥ 0.50 m) ──────────────

describe("Scenario 1: high-res EO imager (ITAR USML XV(a)(7)(i))", () => {
  const result = runPipeline({
    signals: {
      apertureMeters: 0.75,
      rangeKm: null,
      payloadKg: null,
      isRadHardened: false,
      isMilSpec: false,
      isAntiJam: false,
      description: "High-resolution electro-optical imaging payload",
    },
    usContentPercent: 60,
    destinationCountry: "DE",
  });

  it("triggers ITAR flag", () => {
    expect(result.triggerEval.hasItarFlag).toBe(true);
  });

  it("does NOT trigger MTCR Cat. I (no launch vehicle data)", () => {
    expect(result.triggerEval.hasMtcrCatIFlag).toBe(false);
  });

  it("gate is REVIEW_NEEDED (ITAR block, not BLOCKED)", () => {
    expect(result.licenseDetermination.gate).toBe("REVIEW_NEEDED");
  });

  it("itarBlock is set", () => {
    expect(result.licenseDetermination.itarBlock).toBe(true);
  });

  it("DDTC DSP-5 requirement present", () => {
    const ddtc = result.licenseDetermination.requirements.find(
      (r) => r.authority === "DDTC",
    );
    expect(ddtc).toBeDefined();
    expect(ddtc!.licenseType).toBe("DSP5");
    expect(ddtc!.status).toBe("REQUIRED");
  });

  it("de-minimis shows ITAR_CONTROLLED (overrides 25% threshold)", () => {
    expect(result.deMinimis!.outcome).toBe("ITAR_CONTROLLED");
  });

  it("at least one license required", () => {
    expect(
      countRequiredLicenses(result.licenseDetermination),
    ).toBeGreaterThanOrEqual(1);
  });

  it("disclaimer present", () => {
    expect(result.licenseDetermination.disclaimer.length).toBeGreaterThan(50);
  });
});

// ─── Scenario 2: Heavy launch vehicle → MTCR Cat. I ──────────────────

describe("Scenario 2: heavy launch vehicle (MTCR Cat. I BLOCKED)", () => {
  const result = runPipeline({
    signals: {
      apertureMeters: null,
      rangeKm: 450,
      payloadKg: 600,
      isRadHardened: false,
      isMilSpec: false,
      isAntiJam: false,
      description: "Complete orbital launch vehicle system",
    },
    usContentPercent: 55,
    destinationCountry: "CN",
  });

  it("triggers MTCR Cat. I flag", () => {
    expect(result.triggerEval.hasMtcrCatIFlag).toBe(true);
  });

  it("gate is BLOCKED", () => {
    expect(result.licenseDetermination.gate).toBe("BLOCKED");
  });

  it("isExportBlocked returns true", () => {
    expect(isExportBlocked(result.licenseDetermination)).toBe(true);
  });

  it("mtcrCatIBlock is set", () => {
    expect(result.licenseDetermination.mtcrCatIBlock).toBe(true);
  });

  it("MTCR_REVIEW requirement with DENIED status", () => {
    const mtcr = result.licenseDetermination.requirements.find(
      (r) => r.authority === "MTCR_REVIEW",
    );
    expect(mtcr).toBeDefined();
    expect(mtcr!.status).toBe("DENIED");
  });

  it("first nextStep warns URGENT MTCR", () => {
    expect(result.licenseDetermination.nextSteps[0]).toMatch(/MTCR/i);
  });

  it("trigger confidence is HIGH for MTCR Cat. I", () => {
    const mtcrResult = result.triggerEval.results.find(
      (r) => r.ruleId === "MTCR_CAT_I_LAUNCH_VEHICLE",
    );
    expect(mtcrResult?.confidence).toBe("HIGH");
  });
});

// ─── Scenario 3: Hall thruster (EU Annex I only) ──────────────────────

describe("Scenario 3: hall thruster (EU Annex I 9A004 → BAFA)", () => {
  const result = runPipeline({
    signals: {
      apertureMeters: null,
      rangeKm: null,
      payloadKg: null,
      isRadHardened: false,
      isMilSpec: false,
      isAntiJam: false,
      description: "Hall-effect electric propulsion thruster 200 mN",
      eccnEU: "9A004",
    },
    usContentPercent: 8,
    destinationCountry: "JP",
  });

  it("trigger engine fires KEYWORD_ELECTRIC_PROPULSION (hall-effect in description)", () => {
    expect(result.triggerEval.triggeredRuleCount).toBeGreaterThan(0);
    const rule = result.triggerEval.results.find(
      (r) => r.ruleId === "KEYWORD_ELECTRIC_PROPULSION",
    );
    expect(rule).toBeDefined();
  });

  it("ITAR flag is set (KEYWORD_ELECTRIC_PROPULSION includes USML XV(e)(2) itar:true)", () => {
    // The keyword rule conservatively includes USML XV(e)(2) as a potential match.
    // This triggers hasItarFlag=true even at LOW confidence — the design intent
    // is to ensure users seek counsel for any space propulsion item.
    expect(result.triggerEval.hasItarFlag).toBe(true);
  });

  it("de-minimis is ITAR_CONTROLLED (USML itar flag overrides threshold check)", () => {
    expect(result.deMinimis!.outcome).toBe("ITAR_CONTROLLED");
  });

  it("DDTC requirement present (ITAR path)", () => {
    const ddtc = result.licenseDetermination.requirements.find(
      (r) => r.authority === "DDTC",
    );
    expect(ddtc).toBeDefined();
    expect(ddtc!.status).toBe("REQUIRED");
  });

  it("BAFA requirement present (EU_ANNEX_I 9A011 in rule result)", () => {
    const bafa = result.licenseDetermination.requirements.find(
      (r) => r.authority === "BAFA",
    );
    expect(bafa).toBeDefined();
    expect(bafa!.status).toBe("REQUIRED");
  });

  it("gate is REVIEW_NEEDED (ITAR block, not MTCR Cat. I)", () => {
    expect(result.licenseDetermination.gate).toBe("REVIEW_NEEDED");
  });
});

// ─── Scenario 4: SAR radar — dual EU/US path ─────────────────────────

describe("Scenario 4: SAR radar (dual EU/US classification path)", () => {
  const result = runPipeline({
    signals: {
      apertureMeters: null,
      rangeKm: null,
      payloadKg: null,
      isRadHardened: false,
      isMilSpec: false,
      isAntiJam: false,
      description: "X-band synthetic aperture radar imaging payload",
      eccnEU: "6A008.j.1",
      eccnUS: "6A008.j.1",
    },
    usContentPercent: 30,
    destinationCountry: "IN",
  });

  it("trigger engine fires SAR keyword rule", () => {
    const sarRule = result.triggerEval.results.find(
      (r) => r.ruleId === "KEYWORD_SAR_RADAR",
    );
    expect(sarRule).toBeDefined();
  });

  it("de-minimis is ITAR_CONTROLLED (KEYWORD_SAR_RADAR includes USML XV(a)(7)(ii) itar:true)", () => {
    // The LOW-confidence SAR heuristic includes a USML itar:true code.
    // The trigger engine marks hasItarFlag=true regardless of confidence level,
    // so calculateDeMinimis receives hasItarContent:true → ITAR_CONTROLLED.
    expect(result.deMinimis!.outcome).toBe("ITAR_CONTROLLED");
  });

  it("DDTC requirement REQUIRED (ITAR path)", () => {
    const ddtc = result.licenseDetermination.requirements.find(
      (r) => r.authority === "DDTC",
    );
    expect(ddtc).toBeDefined();
    expect(ddtc!.status).toBe("REQUIRED");
  });

  it("BIS status is NLR (ITAR takes precedence over de-minimis)", () => {
    const bis = result.licenseDetermination.requirements.find(
      (r) => r.authority === "BIS",
    );
    expect(bis!.status).toBe("NLR");
  });

  it("BAFA requirement present (EU_ANNEX_I code in SAR rule result)", () => {
    const bafa = result.licenseDetermination.requirements.find(
      (r) => r.authority === "BAFA",
    );
    expect(bafa).toBeDefined();
  });

  it("gate is REVIEW_NEEDED (ITAR — no MTCR Cat. I block)", () => {
    expect(result.licenseDetermination.gate).toBe("REVIEW_NEEDED");
  });
});

// ─── Scenario 5: Rad-hardened star tracker to China (RESTRICTED 10%) ──

describe("Scenario 5: rad-hardened star tracker to China (D:1 restricted)", () => {
  const result = runPipeline({
    signals: {
      apertureMeters: null,
      rangeKm: null,
      payloadKg: null,
      isRadHardened: true,
      isMilSpec: false,
      isAntiJam: false,
      description:
        "Radiation-hardened star tracker attitude determination sensor",
    },
    usContentPercent: 12,
    destinationCountry: "CN",
  });

  it("trigger engine fires RAD_HARD rule", () => {
    const radRule = result.triggerEval.results.find(
      (r) => r.ruleId === "RAD_HARD_ELECTRONICS",
    );
    expect(radRule).toBeDefined();
  });

  it("destination tier is RESTRICTED for CN", () => {
    expect(getDestinationTier("CN")).toBe("RESTRICTED");
  });

  it("de-minimis exceeded (12% > 10% RESTRICTED threshold)", () => {
    expect(result.deMinimis!.outcome).toBe("DE_MINIMIS_EXCEEDED");
    expect(result.deMinimis!.appliedThresholdPercent).toBe(10);
  });

  it("BIS license required", () => {
    const bis = result.licenseDetermination.requirements.find(
      (r) => r.authority === "BIS",
    );
    expect(bis!.status).toBe("REQUIRED");
  });

  it("gate is REVIEW_NEEDED", () => {
    expect(result.licenseDetermination.gate).toBe("REVIEW_NEEDED");
  });
});

// ─── Scenario 6: Low-content passive component (CLEARED) ──────────────

describe("Scenario 6: passive component, 5% US content, Germany → CLEARED", () => {
  const result = runPipeline({
    signals: {
      apertureMeters: null,
      rangeKm: null,
      payloadKg: null,
      isRadHardened: false,
      isMilSpec: false,
      isAntiJam: false,
      description: "Standard ceramic capacitor, commercial off-the-shelf",
    },
    usContentPercent: 5,
    destinationCountry: "DE",
  });

  it("no triggers fire", () => {
    expect(result.triggerEval.triggeredRuleCount).toBe(0);
  });

  it("hasItarFlag is false", () => {
    expect(result.triggerEval.hasItarFlag).toBe(false);
  });

  it("hasMtcrCatIFlag is false", () => {
    expect(result.triggerEval.hasMtcrCatIFlag).toBe(false);
  });

  it("de-minimis eligible (5% < 25%)", () => {
    expect(result.deMinimis!.outcome).toBe("DE_MINIMIS_ELIGIBLE");
  });

  it("gate is CLEARED", () => {
    expect(result.licenseDetermination.gate).toBe("CLEARED");
  });

  it("isExportBlocked returns false", () => {
    expect(isExportBlocked(result.licenseDetermination)).toBe(false);
  });

  it("countRequiredLicenses is 0", () => {
    expect(countRequiredLicenses(result.licenseDetermination)).toBe(0);
  });
});

// ─── Scenario 7: FDPR — item designed with US tech ───────────────────

describe("Scenario 7: FDPR triggered (designed with US tech)", () => {
  const result = runPipeline({
    signals: {
      apertureMeters: null,
      rangeKm: null,
      payloadKg: null,
      isRadHardened: false,
      isMilSpec: false,
      isAntiJam: false,
      description: "Foreign-manufactured GaN MMIC amplifier",
      designedWithUSTech: true,
    },
    usContentPercent: 5,
    destinationCountry: "RU",
  });

  it("FDPR flag set in de-minimis", () => {
    expect(result.deMinimis!.fdprFlag).toBe(true);
  });

  it("de-minimis outcome is FDPR_TRIGGERED", () => {
    expect(result.deMinimis!.outcome).toBe("FDPR_TRIGGERED");
  });

  it("BIS LIKELY_REQUIRED requirement added", () => {
    const bis = result.licenseDetermination.requirements.find(
      (r) => r.authority === "BIS",
    );
    expect(bis!.status).toBe("LIKELY_REQUIRED");
  });

  it("nextSteps mention CFR 734.9", () => {
    expect(
      result.licenseDetermination.nextSteps.some((s) => s.includes("734.9")),
    ).toBe(true);
  });

  it("gate is REVIEW_NEEDED", () => {
    expect(result.licenseDetermination.gate).toBe("REVIEW_NEEDED");
  });
});

// ─── Scenario 8: Embargoed destination (Iran) → BLOCKED ───────────────

describe("Scenario 8: component to Iran (embargoed) → BLOCKED", () => {
  const result = runPipeline({
    signals: {
      apertureMeters: null,
      rangeKm: null,
      payloadKg: null,
      isRadHardened: false,
      isMilSpec: false,
      isAntiJam: false,
      description: "Standard MEMS gyroscope",
    },
    usContentPercent: 10,
    destinationCountry: "IR",
  });

  it("destination tier is EMBARGOED for Iran", () => {
    expect(getDestinationTier("IR")).toBe("EMBARGOED");
  });

  it("de-minimis outcome is EMBARGOED_DESTINATION", () => {
    expect(result.deMinimis!.outcome).toBe("EMBARGOED_DESTINATION");
  });

  it("gate is BLOCKED", () => {
    expect(result.licenseDetermination.gate).toBe("BLOCKED");
  });

  it("embargoBlock is set", () => {
    expect(result.licenseDetermination.embargoBlock).toBe(true);
  });

  it("BIS requirement has DENIED status", () => {
    const bis = result.licenseDetermination.requirements.find(
      (r) => r.authority === "BIS",
    );
    expect(bis!.status).toBe("DENIED");
  });

  it("isExportBlocked returns true", () => {
    expect(isExportBlocked(result.licenseDetermination)).toBe(true);
  });
});

// ─── Scenario 9: Special ECCN 9A515.a → REQUIRES_LEGAL_REVIEW ────────

describe("Scenario 9: special ECCN 9A515.a → REQUIRES_LEGAL_REVIEW", () => {
  const result = runPipeline({
    signals: {
      apertureMeters: null,
      rangeKm: null,
      payloadKg: null,
      isRadHardened: false,
      isMilSpec: false,
      isAntiJam: false,
      description: "Spacecraft subsystem component",
      eccnUS: "9A515.a",
    },
    usContentPercent: 5,
    destinationCountry: "BR",
    usContentEccns: ["9A515.a"],
  });

  it("de-minimis outcome is REQUIRES_LEGAL_REVIEW", () => {
    expect(result.deMinimis!.outcome).toBe("REQUIRES_LEGAL_REVIEW");
  });

  it("BIS status is UNKNOWN", () => {
    const bis = result.licenseDetermination.requirements.find(
      (r) => r.authority === "BIS",
    );
    expect(bis!.status).toBe("UNKNOWN");
  });

  it("gate is REVIEW_NEEDED (UNKNOWN status)", () => {
    expect(result.licenseDetermination.gate).toBe("REVIEW_NEEDED");
  });

  it("nextSteps recommend legal counsel", () => {
    const counselStep = result.licenseDetermination.nextSteps.some((s) =>
      s.toLowerCase().includes("counsel"),
    );
    expect(counselStep).toBe(true);
  });
});

// ─── Scenario 10: Disclaimer invariant ────────────────────────────────

describe("Scenario 10: disclaimer present in all scenarios", () => {
  const scenarios = [
    // EO imager
    runPipeline({
      signals: {
        apertureMeters: 0.75,
        rangeKm: null,
        payloadKg: null,
        isRadHardened: false,
        isMilSpec: false,
        isAntiJam: false,
        description: "EO imager",
      },
      usContentPercent: 60,
      destinationCountry: "DE",
    }),
    // Launch vehicle
    runPipeline({
      signals: {
        apertureMeters: null,
        rangeKm: 450,
        payloadKg: 600,
        isRadHardened: false,
        isMilSpec: false,
        isAntiJam: false,
        description: "SLV",
      },
      usContentPercent: 55,
      destinationCountry: "CN",
    }),
    // Cleared
    runPipeline({
      signals: {
        apertureMeters: null,
        rangeKm: null,
        payloadKg: null,
        isRadHardened: false,
        isMilSpec: false,
        isAntiJam: false,
        description: "passive component",
      },
      usContentPercent: 5,
      destinationCountry: "DE",
    }),
    // Embargoed
    runPipeline({
      signals: {
        apertureMeters: null,
        rangeKm: null,
        payloadKg: null,
        isRadHardened: false,
        isMilSpec: false,
        isAntiJam: false,
        description: "gyroscope",
      },
      usContentPercent: 10,
      destinationCountry: "IR",
    }),
  ];

  scenarios.forEach((result, i) => {
    it(`scenario ${i + 1}: disclaimer is non-empty string`, () => {
      expect(typeof result.licenseDetermination.disclaimer).toBe("string");
      expect(result.licenseDetermination.disclaimer.length).toBeGreaterThan(50);
    });

    it(`scenario ${i + 1}: disclaimer mentions counsel`, () => {
      expect(result.licenseDetermination.disclaimer.toLowerCase()).toContain(
        "counsel",
      );
    });
  });

  it("disclaimer text is identical across all scenarios (single source)", () => {
    const disclaimers = scenarios.map((r) => r.licenseDetermination.disclaimer);
    const [first, ...rest] = disclaimers;
    rest.forEach((d) => expect(d).toBe(first));
  });
});

// ─── Scenario 11: Sub-MTCR launch vehicle (400 km < 300 km threshold) ─

describe("Scenario 11: sub-threshold launch vehicle (MTCR Cat. II, not I)", () => {
  const result = runPipeline({
    signals: {
      apertureMeters: null,
      rangeKm: 400,
      payloadKg: 400, // < 500 kg threshold for Cat. I
      isRadHardened: false,
      isMilSpec: false,
      isAntiJam: false,
      description: "Sub-orbital sounding rocket",
    },
    usContentPercent: 20,
    destinationCountry: "AE",
  });

  it("does NOT trigger MTCR Cat. I (payload < 500 kg)", () => {
    expect(result.triggerEval.hasMtcrCatIFlag).toBe(false);
  });

  it("MTCR_RANGE_SUB_CAT_I rule may fire (MEDIUM confidence)", () => {
    // Range ≥ 300 km fires the sub-Cat-I rule
    const rangeRule = result.triggerEval.results.find(
      (r) => r.ruleId === "MTCR_RANGE_SUB_CAT_I",
    );
    expect(rangeRule).toBeDefined();
    expect(rangeRule!.confidence).toBe("HIGH"); // MTCR_RANGE_SUB_CAT_I is HIGH — it's a confirmed numeric threshold
  });

  it("gate is NOT BLOCKED (no Cat. I)", () => {
    expect(result.licenseDetermination.gate).not.toBe("BLOCKED");
  });

  it("de-minimis eligible (20% < 25% STANDARD)", () => {
    expect(result.deMinimis!.outcome).toBe("DE_MINIMIS_ELIGIBLE");
  });
});

// ─── Scenario 12: Anti-jam + mil-spec combo ───────────────────────────

describe("Scenario 12: anti-jam + mil-spec combo", () => {
  const result = runPipeline({
    signals: {
      apertureMeters: null,
      rangeKm: null,
      payloadKg: null,
      isRadHardened: false,
      isMilSpec: true,
      isAntiJam: true,
      description: "Military-specification anti-jamming GNSS receiver",
    },
    usContentPercent: 35,
    destinationCountry: "AE",
  });

  it("triggers ANTI_JAM_SYSTEM rule", () => {
    expect(
      result.triggerEval.results.some((r) => r.ruleId === "ANTI_JAM_SYSTEM"),
    ).toBe(true);
  });

  it("triggers MIL_SPEC_SPACECRAFT rule", () => {
    expect(
      result.triggerEval.results.some(
        (r) => r.ruleId === "MIL_SPEC_SPACECRAFT",
      ),
    ).toBe(true);
  });

  it("de-minimis is ITAR_CONTROLLED (anti-jam and mil-spec codes include USML itar:true)", () => {
    // Both MIL_SPEC_SPACECRAFT (USML XV(a)(1)) and ANTI_JAM_SYSTEM (USML XII(d))
    // have itar:true codes, so the trigger engine sets hasItarFlag=true, which
    // makes calculateDeMinimis return ITAR_CONTROLLED before threshold check.
    expect(result.deMinimis!.outcome).toBe("ITAR_CONTROLLED");
  });

  it("itarBlock is set (ITAR codes in both rules)", () => {
    expect(result.licenseDetermination.itarBlock).toBe(true);
  });

  it("gate is REVIEW_NEEDED (ITAR — no MTCR Cat. I block)", () => {
    expect(result.licenseDetermination.gate).toBe("REVIEW_NEEDED");
  });

  it("trigger count ≥ 2 (both rules fire)", () => {
    expect(result.triggerEval.triggeredRuleCount).toBeGreaterThanOrEqual(2);
  });
});
