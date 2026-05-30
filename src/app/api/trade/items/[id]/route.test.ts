/**
 * T-H6 — Item classification must NOT treat countryOfOrigin as the export destination.
 *
 * Bug: computeClassification passed item.countryOfOrigin as the destination country
 * into both calculateDeMinimis (destinationTier + destinationCountry) and
 * determineLicenseRequirements (3rd arg). This caused e.g. a US-made item to be
 * assessed as destination=US, and a Iran-made item to fire embargo gates — all
 * wrong: origin ≠ destination.
 *
 * Item-level classification is destination-agnostic. Destination lives on
 * TradeOperation. The fix: destinationTier="STANDARD", destinationCountry=undefined,
 * and determineLicenseRequirements receives undefined for destinationCountry.
 */

import { describe, it, expect, vi } from "vitest";

// ── Module stubs — must appear before any dynamic import of the route ──────────

// Stub server-only so it doesn't throw in the test environment
vi.mock("server-only", () => ({}));

// Stub prisma — computeClassification is pure and never calls DB, but the
// module-level import of prisma must not fail.
vi.mock("@/lib/prisma", () => ({
  prisma: {
    tradeItem: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Stub auth/trade-auth — not used by computeClassification but needed for module import
vi.mock("@/lib/trade/trade-auth", () => ({
  getTradeAuth: vi.fn().mockResolvedValue(null),
}));

// Stub rate-limiting — not used by computeClassification
vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
  createRateLimitResponse: vi.fn(),
  getIdentifier: vi.fn().mockReturnValue("test-user"),
}));

// Stub logger — not used by computeClassification
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// ── Import the function under test ─────────────────────────────────────────────
import { computeClassification } from "./route";

// ── Minimal item shape matching Awaited<ReturnType<typeof getItemForOrg>> ─────

type MinimalItem = NonNullable<Parameters<typeof computeClassification>[0]>;

function makeItem(overrides: Partial<MinimalItem>): MinimalItem {
  return {
    id: "item-test-1",
    organizationId: "org-1",
    name: "Test Satellite Component",
    internalSku: null,
    manufacturerName: null,
    manufacturerPartNo: null,
    description: null,
    eccnEU: null,
    eccnUS: null,
    usmlCategory: null,
    mtcrCategory: null,
    germanAlEntry: null,
    countryOfOrigin: null,
    usContentPercent: null,
    designedWithUSTech: false,
    manufacturedWithUSEquipment: false,
    apertureMeters: null,
    rangeKm: null,
    payloadKg: null,
    isRadHardened: false,
    isMilSpec: false,
    isAntiJam: false,
    status: "DRAFT",
    classificationSource: null,
    classificationEvidenceUrl: null,
    classifiedAt: null,
    classifiedById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdById: "user-1",
    createdBy: { id: "user-1", name: "Test User", email: "test@example.com" },
    notes: [],
    ...overrides,
  } as MinimalItem;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("computeClassification — T-H6: origin must not be used as destination", () => {
  it("RED → GREEN: an Iran-made item (countryOfOrigin=IR) with US content must NOT fire EMBARGOED_DESTINATION", () => {
    // Iran is an embargoed country (Country Group E:1).
    // If the bug is present, passing countryOfOrigin="IR" as destinationCountry
    // causes deMinimis.outcome === "EMBARGOED_DESTINATION".
    // After the fix, the destination is unknown at item level (omitted), so
    // de-minimis evaluates only US-content %, returning a percentage-based outcome.
    const item = makeItem({
      countryOfOrigin: "IR", // Made in Iran — NOT the destination
      usContentPercent: 12, // 12% — within 25% STANDARD threshold
      designedWithUSTech: false,
      manufacturedWithUSEquipment: false,
    });

    const result = computeClassification(item);
    expect(result).not.toBeNull();
    expect(result!.deMinimis).not.toBeNull();

    // After the fix: destination is not known at item level → destinationTier="STANDARD" (25% threshold)
    // 12% < 25% → DE_MINIMIS_ELIGIBLE
    // MUST NOT be EMBARGOED_DESTINATION (that was the bug: treating "IR" as destination)
    expect(result!.deMinimis!.outcome).not.toBe("EMBARGOED_DESTINATION");

    // The 25% STANDARD threshold is applied (destination-agnostic)
    expect(result!.deMinimis!.appliedThresholdPercent).toBe(25);

    // Should be ELIGIBLE since 12% < 25% STANDARD threshold
    expect(result!.deMinimis!.outcome).toBe("DE_MINIMIS_ELIGIBLE");
  });

  it("RED → GREEN: a China-made item (countryOfOrigin=CN) with 15% US content must NOT fire DE_MINIMIS_EXCEEDED via restricted-country threshold", () => {
    // China is Country Group D:1 (10% threshold).
    // Bug: passing "CN" as destinationCountry would apply the 10% threshold → 15% > 10% → DE_MINIMIS_EXCEEDED.
    // After fix: destination is unknown → STANDARD 25% threshold → 15% < 25% → DE_MINIMIS_ELIGIBLE.
    const item = makeItem({
      countryOfOrigin: "CN", // Made in China — NOT the destination
      usContentPercent: 15,
      designedWithUSTech: false,
      manufacturedWithUSEquipment: false,
    });

    const result = computeClassification(item);
    expect(result).not.toBeNull();
    expect(result!.deMinimis).not.toBeNull();

    // After fix: STANDARD threshold (25%) is used — destination is unknown at item level
    expect(result!.deMinimis!.appliedThresholdPercent).toBe(25);

    // 15% < 25% → ELIGIBLE (not EXCEEDED as it would be under buggy 10% D:1 threshold)
    expect(result!.deMinimis!.outcome).toBe("DE_MINIMIS_ELIGIBLE");
  });

  it("de-minimis is null when usContentPercent is null (no change)", () => {
    // Sanity check: when there's no US content percent, deMinimis stays null regardless of origin
    const item = makeItem({
      countryOfOrigin: "IR",
      usContentPercent: null,
    });

    const result = computeClassification(item);
    expect(result).not.toBeNull();
    expect(result!.deMinimis).toBeNull();
  });

  it("license determination receives no destination country — embargoBlock must be false for Iran-made item", () => {
    // Even when countryOfOrigin is set, the license determination must not
    // fire an embargo block on the destination (since destination is unknown).
    const item = makeItem({
      countryOfOrigin: "IR", // Iran-made — NOT the destination
      usContentPercent: 5,
      usmlCategory: null, // no ITAR
    });

    const result = computeClassification(item);
    expect(result).not.toBeNull();

    // embargoBlock should NOT be true — destination is unknown at item level
    expect(result!.licenseDetermination.embargoBlock).toBe(false);

    // gate must NOT be BLOCKED purely due to origin being treated as destination
    expect(result!.licenseDetermination.gate).not.toBe("BLOCKED");
  });

  it("US-content percentage computation still works correctly after fix", () => {
    // The fix must not break the content-percentage math:
    // 30% US content > 25% STANDARD threshold → DE_MINIMIS_EXCEEDED
    const item = makeItem({
      countryOfOrigin: "DE", // Made in Germany — irrelevant to the computation
      usContentPercent: 30,
      designedWithUSTech: false,
      manufacturedWithUSEquipment: false,
    });

    const result = computeClassification(item);
    expect(result).not.toBeNull();
    expect(result!.deMinimis).not.toBeNull();

    // 30% > 25% STANDARD → still exceeds threshold
    expect(result!.deMinimis!.outcome).toBe("DE_MINIMIS_EXCEEDED");
    expect(result!.deMinimis!.appliedThresholdPercent).toBe(25);
    expect(result!.deMinimis!.usControlledContentPercent).toBe(30);
  });
});
