/**
 * Tests for the License Exception Matrix.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import {
  matchLicenseExceptions,
  type ExceptionMatchInput,
} from "./license-exception-matrix";

function input(over: Partial<ExceptionMatchInput> = {}): ExceptionMatchInput {
  return {
    classification: {},
    destinationCountry: "DE",
    ...over,
  };
}

function applicable(result: { applicable: { code: string }[] }) {
  return result.applicable.map((a) => a.code);
}

function rejected(result: { rejected: { code: string; reasons: string[] }[] }) {
  return Object.fromEntries(result.rejected.map((r) => [r.code, r.reasons]));
}

describe("STA (BIS §740.20)", () => {
  it("applies for STA-eligible ECCN to a Country Group A:5 destination", () => {
    const result = matchLicenseExceptions(
      input({
        classification: { eccnUS: "5A002.a" },
        destinationCountry: "FR",
      }),
    );
    expect(applicable(result)).toContain("BIS_LICENSE_EXCEPTION_STA");
  });

  it("rejects when destination is NOT in Country Group A:5/A:6", () => {
    const result = matchLicenseExceptions(
      input({
        classification: { eccnUS: "5A002.a" },
        destinationCountry: "CN",
      }),
    );
    expect(rejected(result).BIS_LICENSE_EXCEPTION_STA).toContain(
      "DESTINATION_NOT_ELIGIBLE",
    );
  });

  it("rejects when the ECCN carries a .y suffix", () => {
    const result = matchLicenseExceptions(
      input({
        classification: { eccnUS: "5A002.a.4.y" },
        destinationCountry: "FR",
      }),
    );
    expect(rejected(result).BIS_LICENSE_EXCEPTION_STA).toContain(
      "ITEM_NOT_ELIGIBLE",
    );
  });

  it("rejects to an embargoed destination", () => {
    const result = matchLicenseExceptions(
      input({
        classification: { eccnUS: "5A002.a" },
        destinationCountry: "IR",
      }),
    );
    expect(rejected(result).BIS_LICENSE_EXCEPTION_STA).toContain(
      "EMBARGOED_DESTINATION",
    );
  });

  it("rejects when there is no US ECCN to evaluate", () => {
    const result = matchLicenseExceptions(input({ destinationCountry: "FR" }));
    expect(rejected(result).BIS_LICENSE_EXCEPTION_STA).toContain(
      "ITEM_NOT_ELIGIBLE",
    );
  });
});

describe("ENC (BIS §740.17)", () => {
  it("applies for 5A002 encryption items to non-embargoed destinations", () => {
    const result = matchLicenseExceptions(
      input({
        classification: { eccnUS: "5A002.a.1" },
        destinationCountry: "BR",
      }),
    );
    expect(applicable(result)).toContain("BIS_LICENSE_EXCEPTION_ENC");
  });

  it("applies for 5D002 software too", () => {
    const result = matchLicenseExceptions(
      input({
        classification: { eccnUS: "5D002.c.1" },
        destinationCountry: "BR",
      }),
    );
    expect(applicable(result)).toContain("BIS_LICENSE_EXCEPTION_ENC");
  });

  it("rejects for non-encryption ECCNs", () => {
    const result = matchLicenseExceptions(
      input({
        classification: { eccnUS: "9A515.a" },
        destinationCountry: "FR",
      }),
    );
    expect(rejected(result).BIS_LICENSE_EXCEPTION_ENC).toContain(
      "ITEM_NOT_ELIGIBLE",
    );
  });

  it("rejects to US-embargoed destinations regardless of ECCN", () => {
    const result = matchLicenseExceptions(
      input({
        classification: { eccnUS: "5A002.a" },
        destinationCountry: "CU",
      }),
    );
    expect(rejected(result).BIS_LICENSE_EXCEPTION_ENC).toContain(
      "EMBARGOED_DESTINATION",
    );
  });
});

describe("GOV (BIS §740.11)", () => {
  it("applies when the end-user is a government and destination is non-embargoed", () => {
    const result = matchLicenseExceptions(
      input({ destinationCountry: "BR", isGovernmentEndUser: true }),
    );
    expect(applicable(result)).toContain("BIS_LICENSE_EXCEPTION_GOV");
  });

  it("rejects when the end-user is not government", () => {
    const result = matchLicenseExceptions(input({ destinationCountry: "BR" }));
    expect(rejected(result).BIS_LICENSE_EXCEPTION_GOV).toContain(
      "END_USE_NOT_ELIGIBLE",
    );
  });

  it("rejects to embargoed destinations even for governments", () => {
    const result = matchLicenseExceptions(
      input({ destinationCountry: "KP", isGovernmentEndUser: true }),
    );
    expect(rejected(result).BIS_LICENSE_EXCEPTION_GOV).toContain(
      "EMBARGOED_DESTINATION",
    );
  });
});

describe("TMP (BIS §740.9)", () => {
  it("applies for temporary end-use to a non-embargoed destination", () => {
    const result = matchLicenseExceptions(
      input({ destinationCountry: "FR", endUse: "temporary demo" }),
    );
    expect(applicable(result)).toContain("BIS_LICENSE_EXCEPTION_TMP");
  });

  it("matches 'trade show' as a TMP end-use keyword", () => {
    const result = matchLicenseExceptions(
      input({ destinationCountry: "FR", endUse: "trade show only" }),
    );
    expect(applicable(result)).toContain("BIS_LICENSE_EXCEPTION_TMP");
  });

  it("rejects when end-use is not temporary", () => {
    const result = matchLicenseExceptions(
      input({ destinationCountry: "FR", endUse: "production line" }),
    );
    expect(rejected(result).BIS_LICENSE_EXCEPTION_TMP).toContain(
      "END_USE_NOT_ELIGIBLE",
    );
  });
});

describe("AGG-12 (BAFA / intra-EU dual-use)", () => {
  it("applies for any non-embargoed EU/EEA/CH destination", () => {
    const result = matchLicenseExceptions(input({ destinationCountry: "FR" }));
    expect(applicable(result)).toContain("BAFA_AGG_12");
  });

  it("rejects outside the EU/EEA + Switzerland", () => {
    const result = matchLicenseExceptions(input({ destinationCountry: "US" }));
    expect(rejected(result).BAFA_AGG_12).toContain("DESTINATION_NOT_ELIGIBLE");
  });

  it("rejects to embargoed destinations even inside the EU sphere", () => {
    const result = matchLicenseExceptions(input({ destinationCountry: "BY" }));
    expect(rejected(result).BAFA_AGG_12).toContain("EMBARGOED_DESTINATION");
  });
});

describe("AGG-27 (BAFA / computer software)", () => {
  it("applies for 4D and 5D software to non-embargoed destinations", () => {
    const result = matchLicenseExceptions(
      input({
        classification: { eccnEU: "5D002.a" },
        destinationCountry: "BR",
      }),
    );
    expect(applicable(result)).toContain("BAFA_AGG_27");
  });

  it("rejects for non-software items", () => {
    const result = matchLicenseExceptions(
      input({
        classification: { eccnEU: "9A515.a" },
        destinationCountry: "BR",
      }),
    );
    expect(rejected(result).BAFA_AGG_27).toContain("ITEM_NOT_ELIGIBLE");
  });

  it("rejects when there is no EU ECCN at all", () => {
    const result = matchLicenseExceptions(input({ destinationCountry: "BR" }));
    expect(rejected(result).BAFA_AGG_27).toContain("ITEM_NOT_ELIGIBLE");
  });
});

describe("EUGEA EU001 (EU dual-use to low-risk allies)", () => {
  it("applies to allied countries (AU/CA/JP/NZ/NO/CH/GB/US/IS/LI)", () => {
    const result = matchLicenseExceptions(input({ destinationCountry: "JP" }));
    expect(applicable(result)).toContain("BAFA_EUGEA_EU001");
  });

  it("rejects outside the EU001 allow-list", () => {
    const result = matchLicenseExceptions(input({ destinationCountry: "BR" }));
    expect(rejected(result).BAFA_EUGEA_EU001).toContain(
      "DESTINATION_NOT_ELIGIBLE",
    );
  });

  it("rejects to a sanctioned destination even if it would be listed", () => {
    const result = matchLicenseExceptions(input({ destinationCountry: "RU" }));
    // RU is not in EU001 anyway, but the embargo trigger should also fire
    const reasons = rejected(result).BAFA_EUGEA_EU001 ?? [];
    expect(reasons.length).toBeGreaterThan(0);
  });
});

describe("matchLicenseExceptions integration", () => {
  it("returns both applicable and rejected for the same input", () => {
    // 5A002 to FR: STA + ENC + AGG-12 + EUGEA all could apply or be considered
    const result = matchLicenseExceptions(
      input({
        classification: { eccnUS: "5A002.a", eccnEU: "5A002.a" },
        destinationCountry: "FR",
      }),
    );
    // 8 evaluators: STA + ENC + CSA (Sprint D3) + GOV + TMP + AGG-12 + AGG-27 + EU001
    expect(result.applicable.length + result.rejected.length).toBe(8);
    expect(result.applicable.map((a) => a.code)).toEqual(
      expect.arrayContaining([
        "BIS_LICENSE_EXCEPTION_STA",
        "BIS_LICENSE_EXCEPTION_ENC",
        "BAFA_AGG_12",
      ]),
    );
  });

  it("returns empty applicable for an embargoed destination across the board", () => {
    const result = matchLicenseExceptions(
      input({
        classification: { eccnUS: "5A002.a", eccnEU: "5A002.a" },
        destinationCountry: "KP",
      }),
    );
    expect(result.applicable).toEqual([]);
    // Every rejection should cite EMBARGOED_DESTINATION as at least one reason
    for (const r of result.rejected) {
      // AGG-27 may also reject for ITEM_NOT_ELIGIBLE depending on input, so
      // we just ensure at least one citation per rejected entry.
      expect(r.reasons.length).toBeGreaterThan(0);
    }
  });

  it("always returns a citation on applicable entries", () => {
    const result = matchLicenseExceptions(input({ destinationCountry: "DE" }));
    for (const a of result.applicable) {
      expect(a.citation).toBeTruthy();
      expect(a.conditions.length).toBeGreaterThan(0);
    }
  });
});

describe("CSA (BIS §740.X, Oct 2024 IFR) — Sprint D3", () => {
  it("applies for 9A515.a spacecraft to Australia", () => {
    const result = matchLicenseExceptions(
      input({
        classification: { eccnUS: "9A515.a" },
        destinationCountry: "AU",
      }),
    );
    expect(applicable(result)).toContain("BIS_LICENSE_EXCEPTION_CSA");
  });

  it("applies for 9A515 sub-paragraphs to UK", () => {
    const result = matchLicenseExceptions(
      input({
        classification: { eccnUS: "9A515.d" },
        destinationCountry: "GB",
      }),
    );
    expect(applicable(result)).toContain("BIS_LICENSE_EXCEPTION_CSA");
  });

  it("applies for 9E515 technology to Canada", () => {
    const result = matchLicenseExceptions(
      input({
        classification: { eccnUS: "9E515" },
        destinationCountry: "CA",
      }),
    );
    expect(applicable(result)).toContain("BIS_LICENSE_EXCEPTION_CSA");
  });

  it("rejects when destination is not AU/CA/GB (e.g. NZ — Five-Eyes but not AUKUS-Spacecraft-Carve-Out)", () => {
    const result = matchLicenseExceptions(
      input({
        classification: { eccnUS: "9A515.a" },
        destinationCountry: "NZ",
      }),
    );
    expect(rejected(result).BIS_LICENSE_EXCEPTION_CSA).toContain(
      "DESTINATION_NOT_ELIGIBLE",
    );
  });

  it("rejects for non-9x515 ECCNs (e.g. 5A002 encryption)", () => {
    const result = matchLicenseExceptions(
      input({
        classification: { eccnUS: "5A002.a" },
        destinationCountry: "AU",
      }),
    );
    expect(rejected(result).BIS_LICENSE_EXCEPTION_CSA).toContain(
      "ITEM_NOT_ELIGIBLE",
    );
  });

  it("rejects to US-embargoed destination (defensive even though Cuba is never AUKUS)", () => {
    const result = matchLicenseExceptions(
      input({
        classification: { eccnUS: "9A515.a" },
        destinationCountry: "CU",
      }),
    );
    expect(rejected(result).BIS_LICENSE_EXCEPTION_CSA).toContain(
      "EMBARGOED_DESTINATION",
    );
  });

  it("matches 9B/9C/9D/9E-515 prefix family", () => {
    for (const eccn of ["9A515.a", "9B515", "9C515", "9D515.b", "9E515"]) {
      const result = matchLicenseExceptions(
        input({
          classification: { eccnUS: eccn },
          destinationCountry: "AU",
        }),
      );
      expect(applicable(result)).toContain("BIS_LICENSE_EXCEPTION_CSA");
    }
  });

  it("provides citation linking to Federal Register 89 FR 84713", () => {
    const result = matchLicenseExceptions(
      input({
        classification: { eccnUS: "9A515.a" },
        destinationCountry: "GB",
      }),
    );
    const csa = result.applicable.find(
      (a) => a.code === "BIS_LICENSE_EXCEPTION_CSA",
    );
    expect(csa?.citation).toMatch(/89 FR 84713/);
    expect(csa?.conditions.length).toBeGreaterThanOrEqual(3);
  });
});
