/**
 * Tests for the pure helper functions used by the Trade-feature
 * bridge tools (predict_license_time in particular). These functions
 * are exported from tool-executor.ts but contain no Prisma / network
 * dependencies — they map ISO country codes → EAR destination groups
 * and ECCN strings → predictor buckets.
 *
 * Coverage goals:
 *  - Sanctioned/embargoed countries map to "E"
 *  - CN/HK/MO collapse to "CHINA"; RU/BY to "RUSSIA"
 *  - EU member states map to "EU"; Five-Eyes to "ALLIED"
 *  - ECCN bucket recognises 9x515, 600-series, USML, encryption
 *  - defaultFormTypeFor + isValidFormTypeForAuthority are consistent
 */

import { describe, it, expect, vi } from "vitest";

// Mock server-only so the module imports cleanly under vitest.
vi.mock("server-only", () => ({}));

import {
  resolveDestinationGroup,
  resolveEccnBucket,
  defaultFormTypeFor,
  isValidFormTypeForAuthority,
} from "./tool-executor";

describe("resolveDestinationGroup", () => {
  it("maps embargoed countries to E", () => {
    expect(resolveDestinationGroup("CU")).toBe("E");
    expect(resolveDestinationGroup("IR")).toBe("E");
    expect(resolveDestinationGroup("KP")).toBe("E");
    expect(resolveDestinationGroup("SY")).toBe("E");
  });

  it("maps China + Hong Kong + Macau to CHINA", () => {
    expect(resolveDestinationGroup("CN")).toBe("CHINA");
    expect(resolveDestinationGroup("HK")).toBe("CHINA");
    expect(resolveDestinationGroup("MO")).toBe("CHINA");
  });

  it("maps Russia + Belarus to RUSSIA", () => {
    expect(resolveDestinationGroup("RU")).toBe("RUSSIA");
    expect(resolveDestinationGroup("BY")).toBe("RUSSIA");
  });

  it("maps EU member states to EU", () => {
    expect(resolveDestinationGroup("DE")).toBe("EU");
    expect(resolveDestinationGroup("FR")).toBe("EU");
    expect(resolveDestinationGroup("IT")).toBe("EU");
    expect(resolveDestinationGroup("PL")).toBe("EU");
  });

  it("maps EFTA (NO/CH/IS/LI) to EU bucket", () => {
    expect(resolveDestinationGroup("NO")).toBe("EU");
    expect(resolveDestinationGroup("CH")).toBe("EU");
    expect(resolveDestinationGroup("IS")).toBe("EU");
    expect(resolveDestinationGroup("LI")).toBe("EU");
  });

  it("maps Five-Eyes / UK to ALLIED", () => {
    expect(resolveDestinationGroup("AU")).toBe("ALLIED");
    expect(resolveDestinationGroup("CA")).toBe("ALLIED");
    expect(resolveDestinationGroup("NZ")).toBe("ALLIED");
    expect(resolveDestinationGroup("GB")).toBe("ALLIED");
  });

  it("maps Group A key allies (JP / KR / IL / SG) to A", () => {
    expect(resolveDestinationGroup("JP")).toBe("A");
    expect(resolveDestinationGroup("KR")).toBe("A");
    expect(resolveDestinationGroup("IL")).toBe("A");
    expect(resolveDestinationGroup("SG")).toBe("A");
  });

  it("maps restricted Group D (e.g. ZW / BN / VE) to D", () => {
    expect(resolveDestinationGroup("ZW")).toBe("D");
    expect(resolveDestinationGroup("VE")).toBe("D");
    expect(resolveDestinationGroup("BN")).toBe("D");
  });

  it("falls back to B for unknown countries", () => {
    expect(resolveDestinationGroup("ZZ")).toBe("B");
    expect(resolveDestinationGroup("XK")).toBe("B");
  });

  it("is case-insensitive on input", () => {
    expect(resolveDestinationGroup("de")).toBe("EU");
    expect(resolveDestinationGroup("cn")).toBe("CHINA");
  });
});

describe("resolveEccnBucket", () => {
  it("recognises 9x515 spacecraft codes", () => {
    expect(resolveEccnBucket("9A515.a")).toBe("9X515");
    expect(resolveEccnBucket("9D515")).toBe("9X515");
    expect(resolveEccnBucket("9E515.b")).toBe("9X515");
  });

  it("recognises 600-series defence codes (non-0Y prefixes)", () => {
    expect(resolveEccnBucket("9A610")).toBe("SIX_HUNDRED_SERIES");
    expect(resolveEccnBucket("3A611")).toBe("SIX_HUNDRED_SERIES");
    expect(resolveEccnBucket("1C608")).toBe("SIX_HUNDRED_SERIES");
  });

  it("recognises USML Roman-numeral categories", () => {
    expect(resolveEccnBucket("XV")).toBe("USML");
    expect(resolveEccnBucket("XII(d)")).toBe("USML");
    expect(resolveEccnBucket("IV(a)(1)")).toBe("USML");
  });

  it("recognises 0Y521 / 0Y6XX encryption-advanced codes", () => {
    expect(resolveEccnBucket("0A521")).toBe("0Y_SERIES");
    expect(resolveEccnBucket("0B521")).toBe("0Y_SERIES");
    // 0Y6XX is documented as 0Y_SERIES in historical-times.ts (the
    // encryption-advanced bucket), not 600-series, because BIS
    // publishes processing-time stats by ECCN-letter family rather
    // than the catch-all "6" digit. The resolver matches accordingly.
    expect(resolveEccnBucket("0A606")).toBe("0Y_SERIES");
  });

  it("recognises standard dual-use ECCNs", () => {
    expect(resolveEccnBucket("3A001")).toBe("STANDARD_DUAL_USE");
    expect(resolveEccnBucket("4A001")).toBe("STANDARD_DUAL_USE");
    expect(resolveEccnBucket("5A002")).toBe("STANDARD_DUAL_USE");
  });

  it("maps EAR99 and unrecognised input to EAR99", () => {
    expect(resolveEccnBucket("EAR99")).toBe("EAR99");
    expect(resolveEccnBucket("")).toBe("EAR99");
    expect(resolveEccnBucket("not-a-code")).toBe("EAR99");
  });

  it("is case-insensitive", () => {
    expect(resolveEccnBucket("9a515.a")).toBe("9X515");
    expect(resolveEccnBucket("xv")).toBe("USML");
  });
});

describe("defaultFormTypeFor", () => {
  it("returns the most-common operator-facing form per authority", () => {
    expect(defaultFormTypeFor("BIS")).toBe("BIS_STANDARD");
    expect(defaultFormTypeFor("DDTC")).toBe("DDTC_DSP5");
    expect(defaultFormTypeFor("BAFA")).toBe("BAFA_EINZEL");
    expect(defaultFormTypeFor("ECJU")).toBe("ECJU_SIEL");
  });

  it("falls back to BIS_STANDARD for unknown authority", () => {
    expect(defaultFormTypeFor("UNKNOWN")).toBe("BIS_STANDARD");
  });
});

describe("isValidFormTypeForAuthority", () => {
  it("accepts matching authority+form pairs", () => {
    expect(isValidFormTypeForAuthority("BIS_STANDARD", "BIS")).toBe(true);
    expect(isValidFormTypeForAuthority("DDTC_DSP5", "DDTC")).toBe(true);
    expect(isValidFormTypeForAuthority("BAFA_SAMMEL", "BAFA")).toBe(true);
    expect(isValidFormTypeForAuthority("ECJU_OIEL", "ECJU")).toBe(true);
  });

  it("rejects mismatched authority+form pairs", () => {
    expect(isValidFormTypeForAuthority("BIS_STANDARD", "DDTC")).toBe(false);
    expect(isValidFormTypeForAuthority("BAFA_EINZEL", "ECJU")).toBe(false);
    expect(isValidFormTypeForAuthority("DDTC_DSP5", "BAFA")).toBe(false);
  });
});
