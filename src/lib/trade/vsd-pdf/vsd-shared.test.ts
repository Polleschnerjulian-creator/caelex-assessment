/**
 * Tests for src/lib/trade/vsd-pdf/vsd-shared.ts — shared helpers used
 * by the three Z6b-d VSD templates.
 *
 * Caelex Trade Sprint Z6b-d (Tier 5). Coverage (5 cases):
 *   1. humanViolationType returns human strings for every enum case
 *   2. humanAuthority returns human strings for every enum case
 *   3. formatVsdAddress folds a line array into a single line
 *   4. adaptVsdForBuilder maps Prisma rows → builder input with all
 *      relations null-safely
 *   5. formatItemLine encodes the optional ECCN / USML decorations
 */

import { describe, it, expect } from "vitest";
import type { TradeVoluntaryDisclosure } from "@prisma/client";
import {
  humanViolationType,
  humanAuthority,
  formatVsdAddress,
  formatItemLine,
  formatCounterpartyLine,
  adaptVsdForBuilder,
} from "./vsd-shared";

describe("humanViolationType", () => {
  it("returns a non-empty human label for every violation enum value", () => {
    const cases = [
      "UNLICENSED_EXPORT",
      "MISCLASSIFICATION",
      "PROHIBITED_PARTY",
      "INVALID_LICENSE_EXCEPTION",
      "DEEMED_EXPORT",
      "CATCH_ALL_OMISSION",
      "UNAUTHORIZED_REEXPORT",
      "END_USE_VIOLATION",
      "OTHER",
    ] as const;
    for (const v of cases) {
      const label = humanViolationType(v);
      expect(label.length).toBeGreaterThan(3);
    }
    expect(humanViolationType("PROHIBITED_PARTY")).toMatch(/prohibited/i);
    expect(humanViolationType("DEEMED_EXPORT")).toMatch(/deemed/i);
  });
});

describe("humanAuthority", () => {
  it("returns a non-empty human label for every authority enum value", () => {
    expect(humanAuthority("OFAC")).toMatch(/Office of Foreign Assets/i);
    expect(humanAuthority("BIS")).toMatch(/Bureau of Industry/i);
    expect(humanAuthority("DDTC")).toMatch(/Defense Trade Controls/i);
    expect(humanAuthority("BAFA")).toMatch(/Bundesamt/i);
    expect(humanAuthority("EU_COMPETENT_AUTHORITY")).toMatch(/EU/);
    expect(humanAuthority("OTHER").length).toBeGreaterThan(3);
  });
});

describe("formatVsdAddress", () => {
  it("folds non-empty address lines into a single string", () => {
    expect(formatVsdAddress(["Line 1", "Line 2", "Line 3"])).toBe(
      "Line 1, Line 2, Line 3",
    );
    expect(formatVsdAddress(["Line 1", "", "  ", "Line 4"])).toBe(
      "Line 1, Line 4",
    );
  });

  it("returns a placeholder when the array is empty / undefined", () => {
    expect(formatVsdAddress(undefined)).toContain("[Address");
    expect(formatVsdAddress([])).toContain("[Address");
  });
});

describe("formatItemLine + formatCounterpartyLine", () => {
  it("returns placeholders when the entity is null", () => {
    expect(formatItemLine(null)).toContain("[Item");
    expect(formatCounterpartyLine(null)).toContain("[Counterparty");
  });

  it("encodes ECCN / USML / EU-Annex / SKU decorations on item line", () => {
    const line = formatItemLine({
      name: "Inertial Reference Unit",
      internalSku: "IRU-7",
      eccnEU: "7A003",
      eccnUS: "7A003.a",
      usmlCategory: "XV(c)",
    });
    expect(line).toContain("Inertial Reference Unit");
    expect(line).toContain("SKU IRU-7");
    expect(line).toContain("US ECCN 7A003.a");
    expect(line).toContain("USML XV(c)");
    expect(line).toContain("EU Annex I 7A003");
  });

  it("encodes trade name + country on counterparty line", () => {
    const line = formatCounterpartyLine({
      legalName: "Trio Aerospace GmbH",
      tradeName: "Trio",
      countryCode: "DE",
    });
    expect(line).toContain("Trio Aerospace GmbH");
    expect(line).toContain("trading as Trio");
    expect(line).toContain("DE");
  });
});

describe("adaptVsdForBuilder", () => {
  it("maps Prisma rows + nullable relations into builder input", () => {
    const fakeVsd = {
      id: "vsd_x",
      organizationId: "org_y",
      authority: "BIS",
      violationType: "UNLICENSED_EXPORT",
      title: "Test",
      description: "Narrative",
      discoveredAt: new Date("2026-04-01T00:00:00Z"),
      occurredAt: new Date("2026-02-01T00:00:00Z"),
      operationId: null,
      itemId: null,
      partyId: null,
      status: "DRAFTED",
      investigatingAt: null,
      draftedAt: null,
      submittedAt: null,
      filingReference: null,
      acknowledgedAt: null,
      resolvedAt: null,
      outcome: null,
      penaltyAmountUsd: null,
      outcomeNotes: null,
      lastActionById: null,
      filingDocumentId: null,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as TradeVoluntaryDisclosure;

    const input = adaptVsdForBuilder({
      vsd: fakeVsd,
      party: null,
      operation: null,
      item: null,
      filerOrgName: "Acme Corp",
    });

    expect(input.vsd.id).toBe("vsd_x");
    expect(input.vsd.authority).toBe("BIS");
    expect(input.counterparty).toBeNull();
    expect(input.operation).toBeNull();
    expect(input.item).toBeNull();
    expect(input.filerOrgName).toBe("Acme Corp");

    // Field passes through narrative + dates unmutated.
    expect(input.vsd.description).toBe("Narrative");
    expect(input.vsd.discoveredAt.toISOString()).toBe(
      "2026-04-01T00:00:00.000Z",
    );
  });

  it("propagates all relations when present", () => {
    const fakeVsd = {
      id: "vsd_full",
      organizationId: "org_y",
      authority: "DDTC",
      violationType: "DEEMED_EXPORT",
      title: "Full",
      description: "Full narrative",
      discoveredAt: new Date(),
      occurredAt: new Date(),
      operationId: "op",
      itemId: "it",
      partyId: "pt",
      status: "DRAFTED",
      investigatingAt: null,
      draftedAt: null,
      submittedAt: null,
      filingReference: null,
      acknowledgedAt: null,
      resolvedAt: null,
      outcome: null,
      penaltyAmountUsd: null,
      outcomeNotes: null,
      lastActionById: null,
      filingDocumentId: null,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as TradeVoluntaryDisclosure;

    const input = adaptVsdForBuilder({
      vsd: fakeVsd,
      party: {
        legalName: "X",
        tradeName: null,
        countryCode: "FR",
        addressLines: ["1 rue de Paris"],
      },
      operation: {
        reference: "OP-1",
        description: "desc",
        shipToCountry: "FR",
      },
      item: {
        name: "Item",
        internalSku: "SKU",
        eccnEU: null,
        eccnUS: null,
        usmlCategory: "XV(e)",
      },
      filerOrgName: "Acme",
    });

    expect(input.counterparty?.legalName).toBe("X");
    expect(input.operation?.reference).toBe("OP-1");
    expect(input.item?.usmlCategory).toBe("XV(e)");
  });
});
