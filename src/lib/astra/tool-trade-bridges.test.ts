/**
 * Tests for the 5 Trade-feature bridge tools added by the Trade
 * Knowledge Update sprint.
 *
 * Coverage:
 *  - Each tool is registered in ALL_TOOLS and TOOL_BY_NAME
 *  - Each tool appears under the "trade" category
 *  - input_schemas correctly mark required fields
 *  - Tool descriptions cite the relevant regulation
 *
 * Note: full handler integration tests would need a DB fixture; we
 * keep the executor tests light (definition shape only) — the
 * downstream services (screen-party, dcs-generator, predictor, etc.)
 * have their own unit-test suites that this sprint did NOT modify.
 */

import { describe, it, expect } from "vitest";
import {
  ALL_TOOLS,
  TOOL_BY_NAME,
  TOOL_CATEGORIES,
  checkSanctionsStatus,
  generateDcs,
  predictLicenseTimeTool,
  findCoveringLicense,
  evaluateShamRisk,
} from "./tool-definitions";

const NEW_TOOL_NAMES = [
  "check_sanctions_status",
  "generate_dcs",
  "predict_license_time",
  "find_covering_license",
  "evaluate_sham_risk",
] as const;

describe("Trade-feature bridge tool registration", () => {
  it("all 5 new tools are exported", () => {
    expect(checkSanctionsStatus.name).toBe("check_sanctions_status");
    expect(generateDcs.name).toBe("generate_dcs");
    expect(predictLicenseTimeTool.name).toBe("predict_license_time");
    expect(findCoveringLicense.name).toBe("find_covering_license");
    expect(evaluateShamRisk.name).toBe("evaluate_sham_risk");
  });

  it("each new tool is present in ALL_TOOLS exactly once", () => {
    for (const name of NEW_TOOL_NAMES) {
      const matches = ALL_TOOLS.filter((t) => t.name === name);
      expect(matches, `tool ${name} not in ALL_TOOLS`).toHaveLength(1);
    }
  });

  it("each new tool is in TOOL_BY_NAME lookup", () => {
    for (const name of NEW_TOOL_NAMES) {
      expect(TOOL_BY_NAME[name]).toBeDefined();
      expect(TOOL_BY_NAME[name].name).toBe(name);
    }
  });

  it("each new tool is registered in the 'trade' category", () => {
    for (const name of NEW_TOOL_NAMES) {
      expect(TOOL_CATEGORIES.trade).toContain(name);
    }
  });
});

describe("check_sanctions_status schema", () => {
  it("requires partyName", () => {
    expect(checkSanctionsStatus.input_schema.required).toContain("partyName");
  });

  it("documents the screening list set in the description", () => {
    const desc = checkSanctionsStatus.description.toLowerCase();
    expect(desc).toContain("ofac");
    expect(desc).toContain("bis");
    expect(desc).toContain("ddtc");
    expect(desc).toContain("opensanctions");
    expect(desc).toContain("ubo");
  });

  it("cites the 31 CFR § 510 cascade rule", () => {
    expect(checkSanctionsStatus.description).toContain("31 CFR § 510");
  });
});

describe("generate_dcs schema", () => {
  it("requires operationId", () => {
    expect(generateDcs.input_schema.required).toContain("operationId");
  });

  it("cites 15 CFR § 758.6 in the description", () => {
    expect(generateDcs.description).toContain("15 CFR § 758.6");
  });

  it("mentions 9x515 / 600-series detection", () => {
    const desc = generateDcs.description;
    expect(desc).toContain("9x515");
    expect(desc).toContain("600-series");
  });
});

describe("predict_license_time schema", () => {
  it("requires authority, destinationCountry, eccn", () => {
    expect(predictLicenseTimeTool.input_schema.required).toEqual(
      expect.arrayContaining(["authority", "destinationCountry", "eccn"]),
    );
  });

  it("enumerates all 4 supported authorities", () => {
    const authorityProp = predictLicenseTimeTool.input_schema.properties
      .authority as { enum?: string[] };
    expect(authorityProp.enum).toEqual(
      expect.arrayContaining(["BIS", "DDTC", "BAFA", "ECJU"]),
    );
  });

  it("enumerates form types per authority", () => {
    const formTypeProp = predictLicenseTimeTool.input_schema.properties
      .formType as { enum?: string[] };
    expect(formTypeProp.enum).toEqual(
      expect.arrayContaining([
        "BIS_STANDARD",
        "DDTC_DSP5",
        "BAFA_EINZEL",
        "ECJU_SIEL",
      ]),
    );
  });

  it("mentions the Bayesian-blend semantics in description", () => {
    const desc = predictLicenseTimeTool.description.toLowerCase();
    expect(desc).toContain("bayesian");
    expect(desc).toContain("p25");
    expect(desc).toContain("p75");
  });
});

describe("find_covering_license schema", () => {
  it("requires eccn and destinationCountry", () => {
    expect(findCoveringLicense.input_schema.required).toEqual(
      expect.arrayContaining(["eccn", "destinationCountry"]),
    );
  });

  it("supports both UK_ECJU and BAFA_SAG via authorities array", () => {
    const authProp = findCoveringLicense.input_schema.properties
      .authorities as { items?: { enum?: string[] } };
    expect(authProp.items?.enum).toEqual(
      expect.arrayContaining(["UK_ECJU", "BAFA_SAG"]),
    );
  });

  it("documents the search criteria in description", () => {
    const desc = findCoveringLicense.description.toLowerCase();
    expect(desc).toContain("siel");
    expect(desc).toContain("ogel");
    expect(desc).toContain("sammelgenehmigung");
  });
});

describe("evaluate_sham_risk schema", () => {
  it("requires operationId", () => {
    expect(evaluateShamRisk.input_schema.required).toContain("operationId");
  });

  it("cites 31 CFR § 501.601 and the OFAC enforcement update", () => {
    expect(evaluateShamRisk.description).toContain("31 CFR § 501.601");
    expect(evaluateShamRisk.description).toContain("JY-2026-013");
  });

  it("enumerates the 4 recommendation tiers", () => {
    const desc = evaluateShamRisk.description;
    expect(desc).toContain("PROCEED");
    expect(desc).toContain("ENHANCED_DUE_DILIGENCE");
    expect(desc).toContain("ESCALATE");
    expect(desc).toContain("REJECT");
  });
});

describe("ALL_TOOLS invariants", () => {
  it("the new tool count brings the total above 60", () => {
    expect(ALL_TOOLS.length).toBeGreaterThan(60);
  });

  it("all new tools use snake_case names", () => {
    for (const name of NEW_TOOL_NAMES) {
      expect(name).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });

  it("all new tools have non-empty descriptions and input_schemas", () => {
    for (const name of NEW_TOOL_NAMES) {
      const tool = TOOL_BY_NAME[name];
      expect(tool.description.length).toBeGreaterThan(50);
      expect(tool.input_schema.type).toBe("object");
      expect(typeof tool.input_schema.properties).toBe("object");
      expect(Array.isArray(tool.input_schema.required)).toBe(true);
    }
  });
});
