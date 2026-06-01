/**
 * T-H9 — buildApplicant conformance test.
 *
 * Verifies that the BAFA ELAN-K2 applicant block is fully populated from
 * the Organization row + TradeOrgProfileView, and that the helper degrades
 * gracefully when the profile is absent / billingAddress is empty.
 *
 * This is a PURE function test — no Prisma, no network.
 */

import { describe, it, expect } from "vitest";
import { buildApplicant } from "./applicant-from-org";
import type { TradeOrgProfileView } from "@/lib/trade/settings/org-profile-service";

// ─── Fixtures ─────────────────────────────────────────────────────

/** Minimal org shape as returned by the extended Prisma select in the route. */
type OrgLike = {
  id: string;
  name: string;
  vatNumber?: string | null;
  billingAddress?: unknown;
};

function fullOrg(): OrgLike {
  return {
    id: "org_abc",
    name: "Caelex Aerospace GmbH",
    vatNumber: "DE123456789",
    billingAddress: {
      street: "Beispielstraße 1",
      zip: "80331",
      city: "München",
      country: "DE",
    },
  };
}

function fullProfile(): TradeOrgProfileView {
  return {
    id: "prof_1",
    organizationId: "org_abc",
    bafaContactName: "Jane Doe",
    bafaContactRole: "Export Control Officer",
    bafaContactPhone: "+49 89 123456",
    bafaContactEmail: "jane@caelex.example",
    eoriNumber: null,
    dunsPlus4: null,
    primaryExportJurisdiction: "DE",
    preferredRegimes: ["BAFA"],
    applicabilityResultJson: null,
    applicabilityCompletedAt: null,
    applicabilityRuleVersion: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  };
}

// ─── Tests ────────────────────────────────────────────────────────

describe("T-H9 — buildApplicant (full org + profile)", () => {
  it("maps legalName from org.name", () => {
    const result = buildApplicant(fullOrg(), fullProfile());
    expect(result.legalName).toBe("Caelex Aerospace GmbH");
  });

  it("maps vatNumber from org.vatNumber", () => {
    const result = buildApplicant(fullOrg(), fullProfile());
    expect(result.vatNumber).toBe("DE123456789");
  });

  it("maps addressStreet from billingAddress.street", () => {
    const result = buildApplicant(fullOrg(), fullProfile());
    expect(result.addressStreet).toBe("Beispielstraße 1");
  });

  it("maps addressZip from billingAddress.zip", () => {
    const result = buildApplicant(fullOrg(), fullProfile());
    expect(result.addressZip).toBe("80331");
  });

  it("maps addressCity from billingAddress.city", () => {
    const result = buildApplicant(fullOrg(), fullProfile());
    expect(result.addressCity).toBe("München");
  });

  it("maps addressCountry from billingAddress.country", () => {
    const result = buildApplicant(fullOrg(), fullProfile());
    expect(result.addressCountry).toBe("DE");
  });

  it("maps contactPerson from bafaContactName (with role appended)", () => {
    const result = buildApplicant(fullOrg(), fullProfile());
    // Must contain at least the name; role may be appended
    expect(result.contactPerson).toContain("Jane Doe");
  });

  it("maps contactEmail from decrypted bafaContactEmail", () => {
    const result = buildApplicant(fullOrg(), fullProfile());
    expect(result.contactEmail).toBe("jane@caelex.example");
  });

  it("maps contactPhone from bafaContactPhone", () => {
    const result = buildApplicant(fullOrg(), fullProfile());
    expect(result.contactPhone).toBe("+49 89 123456");
  });
});

describe("T-H9 — buildApplicant (null profile — graceful degradation)", () => {
  it("does not throw when profile is null", () => {
    expect(() => buildApplicant(fullOrg(), null)).not.toThrow();
  });

  it("still returns legalName from org.name", () => {
    const result = buildApplicant(fullOrg(), null);
    expect(result.legalName).toBe("Caelex Aerospace GmbH");
  });

  it("still returns vatNumber from org.vatNumber", () => {
    const result = buildApplicant(fullOrg(), null);
    expect(result.vatNumber).toBe("DE123456789");
  });

  it("defaults addressCountry to DE when billingAddress has no country", () => {
    const org = { ...fullOrg(), billingAddress: {} };
    const result = buildApplicant(org, null);
    expect(result.addressCountry).toBe("DE");
  });

  it("sets contactPerson/contactEmail/contactPhone to undefined", () => {
    const result = buildApplicant(fullOrg(), null);
    expect(result.contactPerson).toBeUndefined();
    expect(result.contactEmail).toBeUndefined();
    expect(result.contactPhone).toBeUndefined();
  });
});

describe("T-H9 — buildApplicant (empty / missing billingAddress)", () => {
  it("does not throw when billingAddress is null", () => {
    const org = { ...fullOrg(), billingAddress: null };
    expect(() => buildApplicant(org, null)).not.toThrow();
  });

  it("does not throw when billingAddress is undefined", () => {
    const org = { ...fullOrg(), billingAddress: undefined };
    expect(() => buildApplicant(org, null)).not.toThrow();
  });

  it("defaults addressCountry to DE when billingAddress is null", () => {
    const org = { ...fullOrg(), billingAddress: null };
    const result = buildApplicant(org, null);
    expect(result.addressCountry).toBe("DE");
  });

  it("leaves addressStreet/Zip/City undefined when billingAddress is empty", () => {
    const org = { ...fullOrg(), billingAddress: {} };
    const result = buildApplicant(org, null);
    expect(result.addressStreet).toBeUndefined();
    expect(result.addressZip).toBeUndefined();
    expect(result.addressCity).toBeUndefined();
  });
});

describe("T-H9 — buildApplicant (alternative billingAddress key spellings)", () => {
  it("reads addressStreet key as fallback for street", () => {
    const org = {
      ...fullOrg(),
      billingAddress: {
        addressStreet: "Alt-Straße 9",
        city: "Berlin",
        zip: "10115",
      },
    };
    const result = buildApplicant(org, null);
    expect(result.addressStreet).toBe("Alt-Straße 9");
  });

  it("reads postalCode as fallback for zip", () => {
    const org = {
      ...fullOrg(),
      billingAddress: {
        street: "Hauptstraße 5",
        postalCode: "10117",
        city: "Berlin",
      },
    };
    const result = buildApplicant(org, null);
    expect(result.addressZip).toBe("10117");
  });
});
