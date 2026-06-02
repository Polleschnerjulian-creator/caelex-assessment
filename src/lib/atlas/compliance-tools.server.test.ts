import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V3 — compliance-tools bundle test coverage (T1.A retrofit).
 *
 * The 8 compliance tools were shipped in V2 Sprint 3 without a test
 * suite. This suite covers:
 *   - Schema invariants (tool count + required-fields)
 *   - isComplianceToolName guard
 *   - executeComplianceTool dispatcher (unknown-name branch)
 *   - Per-tool: validation errors + 1-3 happy-path branches each
 *
 * Pure-data handlers — no DB, no external services, no mocks needed.
 * Zero external cost per master-plan § 2 C-1.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import {
  COMPLIANCE_TOOLS,
  isComplianceToolName,
  executeComplianceTool,
} from "./compliance-tools.server";

/** Convenience: parse the JSON-string content payload. */
function parse(content: string): Record<string, unknown> {
  return JSON.parse(content) as Record<string, unknown>;
}

describe("compliance-tools schema", () => {
  it("exports exactly 8 tools", () => {
    expect(COMPLIANCE_TOOLS).toHaveLength(8);
  });

  it("tool names match the T1.A master-plan list", () => {
    const names = COMPLIANCE_TOOLS.map((t) => t.name).sort();
    expect(names).toEqual([
      "assess_eu_space_act",
      "assess_national_space_law",
      "assess_uk_space_industry",
      "assess_us_regulatory",
      "check_copuos_compliance",
      "check_spectrum_filing",
      "classify_export_control",
      "classify_nis2",
    ]);
  });

  it("every tool has a non-empty description and input_schema", () => {
    for (const t of COMPLIANCE_TOOLS) {
      expect((t.description ?? "").length).toBeGreaterThan(20);
      expect(t.input_schema).toBeDefined();
      expect((t.input_schema as { type?: string }).type).toBe("object");
    }
  });
});

describe("isComplianceToolName", () => {
  it("returns true for all 8 compliance tools", () => {
    expect(isComplianceToolName("assess_eu_space_act")).toBe(true);
    expect(isComplianceToolName("classify_nis2")).toBe(true);
    expect(isComplianceToolName("assess_national_space_law")).toBe(true);
    expect(isComplianceToolName("assess_uk_space_industry")).toBe(true);
    expect(isComplianceToolName("assess_us_regulatory")).toBe(true);
    expect(isComplianceToolName("classify_export_control")).toBe(true);
    expect(isComplianceToolName("check_spectrum_filing")).toBe(true);
    expect(isComplianceToolName("check_copuos_compliance")).toBe(true);
  });

  it("returns false for unrelated names", () => {
    expect(isComplianceToolName("find_or_open_matter")).toBe(false);
    expect(isComplianceToolName("web_search")).toBe(false);
    expect(isComplianceToolName("")).toBe(false);
    expect(isComplianceToolName("assess_eu_space")).toBe(false); // close but wrong
  });
});

describe("executeComplianceTool dispatcher", () => {
  it("returns isError for an unknown tool name", async () => {
    const result = await executeComplianceTool("bogus_tool_xyz", {});
    expect(result.isError).toBe(true);
    expect(parse(result.content).error).toContain("Unknown compliance tool");
  });
});

/* ── assess_eu_space_act ────────────────────────────────────────────── */

describe("assess_eu_space_act", () => {
  it("validates: missing operatorType returns error", async () => {
    const result = await executeComplianceTool("assess_eu_space_act", {
      establishment: "eu",
    });
    expect(result.isError).toBe(true);
    expect(parse(result.content).error).toContain("operatorType");
  });

  it("validates: missing establishment returns error", async () => {
    const result = await executeComplianceTool("assess_eu_space_act", {
      operatorType: "spacecraft_operator",
    });
    expect(result.isError).toBe(true);
  });

  it("defence-only operator → OUT_OF_SCOPE_DEFENCE", async () => {
    const result = await executeComplianceTool("assess_eu_space_act", {
      operatorType: "spacecraft_operator",
      establishment: "eu",
      defenceOnly: true,
    });
    expect(result.isError).toBe(false);
    const payload = parse(result.content);
    expect(payload.applicableRegime).toBe("OUT_OF_SCOPE_DEFENCE");
    expect((payload.applicableArticles as string[])[0]).toContain("Art.2(3)");
  });

  it("third-country no EU services → OUT_OF_SCOPE_TERRITORIAL", async () => {
    const result = await executeComplianceTool("assess_eu_space_act", {
      operatorType: "spacecraft_operator",
      establishment: "third_country_no_eu",
    });
    expect(result.isError).toBe(false);
    const payload = parse(result.content);
    expect(payload.applicableRegime).toBe("OUT_OF_SCOPE_TERRITORIAL");
  });

  it("EU spacecraft_operator → STANDARD_REGIME with debris obligations", async () => {
    const result = await executeComplianceTool("assess_eu_space_act", {
      operatorType: "spacecraft_operator",
      establishment: "eu",
    });
    expect(result.isError).toBe(false);
    const payload = parse(result.content);
    expect(payload.applicableRegime).toBe("STANDARD_REGIME");
    const obs = payload.keyObligations as string[];
    expect(obs.some((o) => o.includes("Debris-mitigation"))).toBe(true);
    expect(obs.some((o) => o.includes("End-of-life de-orbit"))).toBe(true);
  });

  it("EU ground_segment_operator → LIGHT_REGIME", async () => {
    const result = await executeComplianceTool("assess_eu_space_act", {
      operatorType: "ground_segment_operator",
      establishment: "eu",
    });
    expect(result.isError).toBe(false);
    const payload = parse(result.content);
    expect(payload.applicableRegime).toBe("LIGHT_REGIME");
  });

  it("EU launch_operator → STANDARD_REGIME with range-safety", async () => {
    const result = await executeComplianceTool("assess_eu_space_act", {
      operatorType: "launch_operator",
      establishment: "eu",
    });
    const payload = parse(result.content);
    const obs = payload.keyObligations as string[];
    expect(obs.some((o) => o.includes("Range-safety"))).toBe(true);
  });
});

/* ── classify_nis2 ──────────────────────────────────────────────────── */

describe("classify_nis2", () => {
  it("validates: missing fields returns error", async () => {
    const result = await executeComplianceTool("classify_nis2", {
      sector: "space",
    });
    expect(result.isError).toBe(true);
  });

  it("space + large → essential", async () => {
    const result = await executeComplianceTool("classify_nis2", {
      sector: "space",
      sizeClass: "large",
      memberState: "DE",
    });
    expect(result.isError).toBe(false);
    const payload = parse(result.content);
    expect(payload.classification).toBe("essential");
    expect(payload.annex).toBe("I");
  });

  it("space + medium + not critical → important", async () => {
    const result = await executeComplianceTool("classify_nis2", {
      sector: "space",
      sizeClass: "medium",
      memberState: "FR",
    });
    const payload = parse(result.content);
    expect(payload.classification).toBe("important");
  });

  it("space + small (not critical) → out_of_scope", async () => {
    const result = await executeComplianceTool("classify_nis2", {
      sector: "space",
      sizeClass: "small",
      memberState: "IT",
    });
    const payload = parse(result.content);
    expect(payload.classification).toBe("out_of_scope");
  });

  it("space + small + criticalForSocietalFunction → essential", async () => {
    const result = await executeComplianceTool("classify_nis2", {
      sector: "space",
      sizeClass: "small",
      memberState: "DE",
      criticalForSocietalFunction: true,
    });
    const payload = parse(result.content);
    expect(payload.classification).toBe("essential");
  });

  it("non-listed sector → out_of_scope reasoning", async () => {
    const result = await executeComplianceTool("classify_nis2", {
      sector: "other",
      sizeClass: "large",
      memberState: "DE",
    });
    const payload = parse(result.content);
    expect(payload.classification).toBe("out_of_scope");
  });
});

/* ── assess_national_space_law ──────────────────────────────────────── */

describe("assess_national_space_law", () => {
  it("validates: missing fields returns error", async () => {
    const result = await executeComplianceTool("assess_national_space_law", {
      jurisdiction: "DE",
    });
    expect(result.isError).toBe(true);
  });

  it("known jurisdiction (DE) returns structured brief", async () => {
    const result = await executeComplianceTool("assess_national_space_law", {
      jurisdiction: "DE",
      operatorType: "spacecraft_operator",
    });
    expect(result.isError).toBe(false);
    const payload = parse(result.content);
    expect(payload.lawName).toContain("Weltraum");
    expect(payload.authority).toContain("BMWK");
  });

  it("unknown jurisdiction → fallback hint", async () => {
    const result = await executeComplianceTool("assess_national_space_law", {
      jurisdiction: "ZZ",
      operatorType: "spacecraft_operator",
    });
    expect(result.isError).toBe(false);
    const payload = parse(result.content);
    expect(payload.summary).toContain("No structured");
    expect(payload.summary).toContain("search_legal_sources");
  });

  it("focus=liability_insurance filters output", async () => {
    const result = await executeComplianceTool("assess_national_space_law", {
      jurisdiction: "FR",
      operatorType: "spacecraft_operator",
      focus: "liability_insurance",
    });
    const payload = parse(result.content);
    expect(payload.insuranceMin).toBeDefined();
    expect(payload.liabilityCap).toBeDefined();
    expect(payload.keyArticles).toBeUndefined();
  });
});

/* ── assess_uk_space_industry ───────────────────────────────────────── */

describe("assess_uk_space_industry", () => {
  it("validates: missing activityType returns error", async () => {
    const result = await executeComplianceTool("assess_uk_space_industry", {});
    expect(result.isError).toBe(true);
  });

  it("launch → Launch Operator Licence", async () => {
    const result = await executeComplianceTool("assess_uk_space_industry", {
      activityType: "launch",
    });
    expect(result.isError).toBe(false);
    const payload = parse(result.content);
    expect((payload.licence as string).toLowerCase()).toContain("launch");
    expect((payload.licence as string).toLowerCase()).toContain("caa");
  });

  it("spaceport → Spaceport Licence", async () => {
    const result = await executeComplianceTool("assess_uk_space_industry", {
      activityType: "spaceport",
    });
    const payload = parse(result.content);
    expect((payload.licence as string).toLowerCase()).toContain("spaceport");
  });
});

/* ── assess_us_regulatory ───────────────────────────────────────────── */

describe("assess_us_regulatory", () => {
  it("validates: missing activityType returns error", async () => {
    const result = await executeComplianceTool("assess_us_regulatory", {});
    expect(result.isError).toBe(true);
  });

  it("satellite_communications → FCC", async () => {
    const result = await executeComplianceTool("assess_us_regulatory", {
      activityType: "satellite_communications",
    });
    expect(result.isError).toBe(false);
    const payload = parse(result.content);
    expect(payload.agency).toContain("FCC");
  });

  it("launch → FAA AST", async () => {
    const result = await executeComplianceTool("assess_us_regulatory", {
      activityType: "launch",
    });
    const payload = parse(result.content);
    expect(payload.agency).toContain("FAA");
  });

  it("non-US-established operator hint", async () => {
    const result = await executeComplianceTool("assess_us_regulatory", {
      activityType: "satellite_communications",
      usEstablished: false,
    });
    const payload = parse(result.content);
    const next = payload.nextSteps as string[];
    expect(next[0]).toContain("US-licensed counsel");
  });
});

/* ── classify_export_control ────────────────────────────────────────── */

describe("classify_export_control", () => {
  it("validates: missing item returns error", async () => {
    const result = await executeComplianceTool("classify_export_control", {});
    expect(result.isError).toBe(true);
  });

  it("space-qualified component → ITAR-likely", async () => {
    const result = await executeComplianceTool("classify_export_control", {
      item: "Space-qualified rad-hardened FPGA",
      endUse: "dual_use",
    });
    expect(result.isError).toBe(false);
    const payload = parse(result.content);
    expect(payload.itarLikely).toBe(true);
    expect((payload.usmlCategoryHints as string[]).length).toBeGreaterThan(0);
  });

  it("civilian item → EAR-likely", async () => {
    const result = await executeComplianceTool("classify_export_control", {
      item: "Commercial GPS receiver",
      endUse: "civil",
    });
    const payload = parse(result.content);
    expect(payload.itarLikely).toBe(false);
    expect(payload.earLikely).toBe(true);
  });

  it("sanctioned destination → comprehensive warning", async () => {
    const result = await executeComplianceTool("classify_export_control", {
      item: "RF transmitter",
      destinationCountry: "RU",
    });
    const payload = parse(result.content);
    expect(payload.sanctionsCheck as string).toContain("comprehensive");
  });
});

/* ── check_spectrum_filing ──────────────────────────────────────────── */

describe("check_spectrum_filing", () => {
  it("validates: missing fields returns error", async () => {
    const result = await executeComplianceTool("check_spectrum_filing", {
      frequencyBand: "Ka",
    });
    expect(result.isError).toBe(true);
  });

  it("GEO Ka-band → Coordination Request (CR)", async () => {
    const result = await executeComplianceTool("check_spectrum_filing", {
      frequencyBand: "Ka",
      orbitType: "GEO",
    });
    expect(result.isError).toBe(false);
    const payload = parse(result.content);
    expect(payload.coordinationProcess).toContain("Coordination Request");
  });

  it("LEO Ku-band → API + N-notice", async () => {
    const result = await executeComplianceTool("check_spectrum_filing", {
      frequencyBand: "Ku",
      orbitType: "LEO",
    });
    const payload = parse(result.content);
    expect(payload.coordinationProcess as string).toContain(
      "Advance Publication",
    );
  });

  it("known notifying administration (DE) → BNetzA", async () => {
    const result = await executeComplianceTool("check_spectrum_filing", {
      frequencyBand: "Ka",
      orbitType: "GEO",
      notifyingAdministration: "DE",
    });
    const payload = parse(result.content);
    expect(payload.notifyingAdministration as string).toContain("BNetzA");
  });
});

/* ── check_copuos_compliance ────────────────────────────────────────── */

describe("check_copuos_compliance", () => {
  it("validates: missing altitude returns error", async () => {
    const result = await executeComplianceTool("check_copuos_compliance", {});
    expect(result.isError).toBe(true);
  });

  it("LEO 500km → 25-year disposal rule applies", async () => {
    const result = await executeComplianceTool("check_copuos_compliance", {
      orbitalAltitudeKm: 500,
    });
    expect(result.isError).toBe(false);
    const payload = parse(result.content);
    expect(payload.region as string).toContain("LEO Protected");
    expect(
      (payload.obligations as string[]).some((o) => o.includes("25-year")),
    ).toBe(true);
  });

  it("GEO ring → graveyard orbit re-orbit ≥235 km", async () => {
    const result = await executeComplianceTool("check_copuos_compliance", {
      orbitalAltitudeKm: 35786,
    });
    const payload = parse(result.content);
    expect(payload.region as string).toContain("GEO Protected");
    expect(
      (payload.obligations as string[]).some((o) => o.includes("graveyard")),
    ).toBe(true);
  });

  it("LEO + cold_gas → warning about passive de-orbit", async () => {
    const result = await executeComplianceTool("check_copuos_compliance", {
      orbitalAltitudeKm: 600,
      propulsionType: "cold_gas",
    });
    const payload = parse(result.content);
    expect(
      (payload.obligations as string[]).some((o) => o.includes("WARNING")),
    ).toBe(true);
  });

  it("uncontrolled re-entry of ≥100 kg → casualty-risk assessment", async () => {
    const result = await executeComplianceTool("check_copuos_compliance", {
      orbitalAltitudeKm: 500,
      massKg: 250,
      controlledReentry: false,
    });
    const payload = parse(result.content);
    expect(
      (payload.obligations as string[]).some((o) =>
        o.toLowerCase().includes("casualty-risk"),
      ),
    ).toBe(true);
  });

  it("MEO altitude → outside protected regions", async () => {
    const result = await executeComplianceTool("check_copuos_compliance", {
      orbitalAltitudeKm: 10000,
    });
    const payload = parse(result.content);
    expect(payload.region as string).toContain("Outside protected");
  });
});

/* ── A-M21: Zod input validation for compliance tools ───────────────── */

describe("A-M21 — Zod input validation for compliance tools", () => {
  it("assess_eu_space_act: rejects invalid operatorType enum value", async () => {
    /* Before: `rawInput as SpaceActInput` would accept any string for operatorType.
       After: Zod enum validates and rejects unknown values. */
    const result = await executeComplianceTool("assess_eu_space_act", {
      operatorType: "INVALID_OPERATOR",
      establishment: "eu",
    });
    expect(result.isError).toBe(true);
    expect(parse(result.content).error).toContain("operatorType");
  });

  it("assess_eu_space_act: rejects invalid establishment enum value", async () => {
    const result = await executeComplianceTool("assess_eu_space_act", {
      operatorType: "spacecraft_operator",
      establishment: "INVALID_ESTABLISHMENT",
    });
    expect(result.isError).toBe(true);
  });

  it("classify_nis2: rejects invalid sizeClass enum value", async () => {
    const result = await executeComplianceTool("classify_nis2", {
      sector: "space",
      sizeClass: "INVALID_SIZE",
      memberState: "DE",
    });
    expect(result.isError).toBe(true);
  });

  it("classify_nis2: rejects missing memberState", async () => {
    const result = await executeComplianceTool("classify_nis2", {
      sector: "space",
      sizeClass: "large",
    });
    expect(result.isError).toBe(true);
  });

  it("classify_export_control: rejects over-long item string", async () => {
    const result = await executeComplianceTool("classify_export_control", {
      item: "x".repeat(501),
    });
    expect(result.isError).toBe(true);
  });

  it("check_spectrum_filing: rejects invalid frequencyBand", async () => {
    const result = await executeComplianceTool("check_spectrum_filing", {
      frequencyBand: "X-INVALID",
      orbitType: "LEO",
    });
    expect(result.isError).toBe(true);
  });

  it("check_copuos_compliance: rejects non-numeric orbitalAltitudeKm", async () => {
    const result = await executeComplianceTool("check_copuos_compliance", {
      orbitalAltitudeKm: "not-a-number" as unknown as number,
    });
    expect(result.isError).toBe(true);
  });

  it("assess_uk_space_industry: rejects invalid activityType enum", async () => {
    const result = await executeComplianceTool("assess_uk_space_industry", {
      activityType: "bogus_type",
    });
    expect(result.isError).toBe(true);
  });

  it("assess_us_regulatory: rejects invalid activityType enum", async () => {
    const result = await executeComplianceTool("assess_us_regulatory", {
      activityType: "bogus_type",
    });
    expect(result.isError).toBe(true);
  });

  it("assess_national_space_law: rejects over-long operatorType", async () => {
    const result = await executeComplianceTool("assess_national_space_law", {
      jurisdiction: "DE",
      operatorType: "x".repeat(101),
    });
    expect(result.isError).toBe(true);
  });
});
