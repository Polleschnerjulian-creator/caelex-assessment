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

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Module stubs — must appear before any dynamic import of the route ──────────

// Stub server-only so it doesn't throw in the test environment
vi.mock("server-only", () => ({}));

// Stub prisma — computeClassification is pure and never calls DB, but the
// module-level import of prisma must not fail. tradeOperation.findMany is used
// by the Tier 1.8 recompute-on-classification fan-out in PATCH.
vi.mock("@/lib/prisma", () => ({
  prisma: {
    tradeItem: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    tradeItemNote: {
      create: vi.fn().mockResolvedValue({ id: "note-1" }),
    },
    tradeOperation: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

// Stub the recompute hub — Tier 1.8 fans out to it per affected operation.
vi.mock("@/lib/comply-v2/trade/operations/recompute.server", () => ({
  recomputeOperation: vi.fn().mockResolvedValue({ statusChange: null }),
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
import { computeClassification, PATCH } from "./route";
import { prisma } from "@/lib/prisma";
import { getTradeAuth } from "@/lib/trade/trade-auth";
import { recomputeOperation } from "@/lib/comply-v2/trade/operations/recompute.server";

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

// ── Tier 1.8: classifying an item recomputes the operations that use it ──────────

describe("PATCH /api/trade/items/[id] — Tier 1.8 recompute-on-classification", () => {
  const auth = {
    userId: "user-1",
    organizationId: "org-1",
    role: "MANAGER" as import("@prisma/client").OrganizationRole,
  };

  function req(body: unknown): Request {
    return new Request("http://localhost/api/trade/items/item-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }
  const ctx = (id = "item-1") => ({ params: Promise.resolve({ id }) });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTradeAuth).mockResolvedValue(auth);
    vi.mocked(prisma.tradeOperation.findMany).mockResolvedValue([] as never);
    vi.mocked(recomputeOperation).mockResolvedValue({
      statusChange: null,
    } as never);
  });

  it("recomputes every non-terminal operation that includes a freshly-classified item", async () => {
    // Existing item is DRAFT; the PATCH sets a control code → auto-advances to CLASSIFIED.
    vi.mocked(prisma.tradeItem.findFirst).mockResolvedValue({
      id: "item-1",
      organizationId: "org-1",
      status: "DRAFT",
    } as never);
    vi.mocked(prisma.tradeItem.update).mockResolvedValue({
      id: "item-1",
      status: "CLASSIFIED",
    } as never);
    vi.mocked(prisma.tradeOperation.findMany).mockResolvedValue([
      { id: "op-1" },
      { id: "op-2" },
    ] as never);

    // A human definitive classification → the T-M18 gate requires an audited
    // source + justification (the matcher/copilot supply these). With them the
    // DRAFT item auto-advances to CLASSIFIED and the fan-out recomputes.
    const res = await PATCH(
      req({
        eccnEU: "9A004",
        overrideSource: "BAFA Güterliste — Pos. 9A004",
        overrideJustification:
          "Erstklassifizierung nach Datenblatt-Review (Erdbeobachtungs-Nutzlast).",
      }),
      ctx(),
    );
    expect(res.status).toBe(200);

    // Fan-out filter: this item's lines, this org, excluding terminal/halted states.
    expect(prisma.tradeOperation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-1",
          lines: { some: { itemId: "item-1" } },
          status: {
            notIn: ["EXECUTED", "VOLUNTARY_DISCLOSURE_FILED", "BLOCKED"],
          },
        }),
      }),
    );
    expect(recomputeOperation).toHaveBeenCalledTimes(2);
    expect(recomputeOperation).toHaveBeenCalledWith("op-1", "org-1");
    expect(recomputeOperation).toHaveBeenCalledWith("op-2", "org-1");
  });

  it("accepts an AI suggestion (ASTRA_SUGGESTED) without a justification, parks it in review, and still recomputes", async () => {
    // The matcher "Übernehmen" / create-from-datasheet path: an AI proposal is
    // accepted into REQUIRES_REVIEW — exempt from the T-M18 justification gate
    // (the audited reasoning is captured at the human CONFIRM step) and it must
    // NEVER silently become CLASSIFIED. The code change still triggers the
    // operation recompute fan-out.
    vi.mocked(prisma.tradeItem.findFirst).mockResolvedValue({
      id: "item-1",
      organizationId: "org-1",
      status: "DRAFT",
    } as never);
    vi.mocked(prisma.tradeItem.update).mockResolvedValue({
      id: "item-1",
      status: "REQUIRES_REVIEW",
    } as never);
    vi.mocked(prisma.tradeOperation.findMany).mockResolvedValue([
      { id: "op-1" },
    ] as never);

    const res = await PATCH(
      req({ eccnEU: "9A004", classificationSource: "ASTRA_SUGGESTED" }),
      ctx(),
    );
    expect(res.status).toBe(200);

    // The update must NOT have auto-advanced an un-justified AI suggestion to
    // CLASSIFIED — the second half of the exemption guard.
    const updateArg = vi.mocked(prisma.tradeItem.update).mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(updateArg.data.status).not.toBe("CLASSIFIED");

    // …but the code change still recomputes the operations the item rides on.
    expect(recomputeOperation).toHaveBeenCalledTimes(1);
    expect(recomputeOperation).toHaveBeenCalledWith("op-1", "org-1");
  });

  it("rejects a human control-code change that lacks an audited justification (400, no recompute)", async () => {
    // A definitive human classification with no source/justification and no
    // ASTRA_SUGGESTED marker is exactly the silent-overwrite leak T-M18 closes.
    vi.mocked(prisma.tradeItem.findFirst).mockResolvedValue({
      id: "item-1",
      organizationId: "org-1",
      status: "DRAFT",
    } as never);

    const res = await PATCH(req({ eccnEU: "9A004" }), ctx());
    expect(res.status).toBe(400);
    const body = (await res.json()) as { code?: string };
    expect(body.code).toBe("OVERRIDE_REASONING_REQUIRED");
    expect(recomputeOperation).not.toHaveBeenCalled();
  });

  it("does NOT recompute when the PATCH changes no classification-relevant field", async () => {
    // A name-only edit: not classified, status unchanged → no fan-out.
    vi.mocked(prisma.tradeItem.findFirst).mockResolvedValue({
      id: "item-1",
      organizationId: "org-1",
      status: "CLASSIFIED",
    } as never);
    vi.mocked(prisma.tradeItem.update).mockResolvedValue({
      id: "item-1",
      status: "CLASSIFIED",
    } as never);

    const res = await PATCH(req({ name: "Renamed Widget" }), ctx());
    expect(res.status).toBe(200);
    expect(prisma.tradeOperation.findMany).not.toHaveBeenCalled();
    expect(recomputeOperation).not.toHaveBeenCalled();
  });

  it("a recompute failure is non-fatal — the item PATCH still succeeds (200)", async () => {
    vi.mocked(prisma.tradeItem.findFirst).mockResolvedValue({
      id: "item-1",
      organizationId: "org-1",
      status: "DRAFT",
    } as never);
    vi.mocked(prisma.tradeItem.update).mockResolvedValue({
      id: "item-1",
      status: "CLASSIFIED",
    } as never);
    vi.mocked(prisma.tradeOperation.findMany).mockResolvedValue([
      { id: "op-1" },
    ] as never);
    vi.mocked(recomputeOperation).mockRejectedValue(new Error("boom"));

    const res = await PATCH(
      req({
        eccnUS: "9A515.a",
        overrideSource: "BAFA",
        overrideJustification: "reason",
      }),
      ctx(),
    );
    expect(res.status).toBe(200);
  });
});

// ── T-M18: raw control-code override must carry audited reasoning ─────────────

describe("PATCH /api/trade/items/[id] — T-M18 override-reasoning gate", () => {
  const auth = {
    userId: "user-1",
    organizationId: "org-1",
    role: "MANAGER" as import("@prisma/client").OrganizationRole,
  };

  function req(body: unknown): Request {
    return new Request("http://localhost/api/trade/items/item-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }
  const ctx = (id = "item-1") => ({ params: Promise.resolve({ id }) });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTradeAuth).mockResolvedValue(auth);
    vi.mocked(prisma.tradeOperation.findMany).mockResolvedValue([] as never);
    vi.mocked(recomputeOperation).mockResolvedValue({
      statusChange: null,
    } as never);
    vi.mocked(prisma.tradeItemNote.create).mockResolvedValue({
      id: "note-1",
    } as never);
  });

  it("REJECTS (400) a control-code CHANGE with no source / justification", async () => {
    // Existing item has eccnEU=null; the PATCH sets it → a real change.
    vi.mocked(prisma.tradeItem.findFirst).mockResolvedValue({
      id: "item-1",
      organizationId: "org-1",
      status: "DRAFT",
      eccnEU: null,
      eccnUS: null,
      usmlCategory: null,
      mtcrCategory: null,
      germanAlEntry: null,
    } as never);

    const res = await PATCH(req({ eccnEU: "9A004" }), ctx());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("OVERRIDE_REASONING_REQUIRED");
    expect(body.changedFields).toContain("eccnEU");
    // The silent write was refused.
    expect(prisma.tradeItem.update).not.toHaveBeenCalled();
  });

  it("ALLOWS a control-code change WITH source + justification and records an audit note", async () => {
    vi.mocked(prisma.tradeItem.findFirst).mockResolvedValue({
      id: "item-1",
      organizationId: "org-1",
      status: "DRAFT",
      eccnEU: null,
      eccnUS: null,
      usmlCategory: null,
      mtcrCategory: null,
      germanAlEntry: null,
    } as never);
    vi.mocked(prisma.tradeItem.update).mockResolvedValue({
      id: "item-1",
      status: "CLASSIFIED",
    } as never);

    const res = await PATCH(
      req({
        eccnEU: "9A004",
        overrideSource: "BAFA AzG 2025-0042",
        overrideJustification:
          "Aperture confirmed sub-threshold per datasheet.",
      }),
      ctx(),
    );
    expect(res.status).toBe(200);
    expect(prisma.tradeItem.update).toHaveBeenCalledOnce();

    // The override reasoning is recorded on the audit trail with the human.
    expect(prisma.tradeItemNote.create).toHaveBeenCalledOnce();
    const noteArgs = vi.mocked(prisma.tradeItemNote.create).mock.calls[0][0];
    expect(noteArgs.data.itemId).toBe("item-1");
    expect(noteArgs.data.userId).toBe("user-1");
    expect(noteArgs.data.body).toContain("eccnEU");
    expect(noteArgs.data.body).toContain("BAFA AzG 2025-0042");
    expect(noteArgs.data.body).toContain("sub-threshold");

    // The audit-note's `overrideSource`/`overrideJustification` are NOT
    // forwarded to the TradeItem update (they are not columns).
    const updateArgs = vi.mocked(prisma.tradeItem.update).mock.calls[0][0];
    expect(updateArgs.data).not.toHaveProperty("overrideSource");
    expect(updateArgs.data).not.toHaveProperty("overrideJustification");
  });

  it("does NOT require reasoning for a non-code change (e.g. name only)", async () => {
    vi.mocked(prisma.tradeItem.findFirst).mockResolvedValue({
      id: "item-1",
      organizationId: "org-1",
      status: "CLASSIFIED",
      eccnEU: "9A004",
      eccnUS: null,
      usmlCategory: null,
      mtcrCategory: null,
      germanAlEntry: null,
    } as never);
    vi.mocked(prisma.tradeItem.update).mockResolvedValue({
      id: "item-1",
      status: "CLASSIFIED",
    } as never);

    const res = await PATCH(req({ name: "Renamed" }), ctx());
    expect(res.status).toBe(200);
    expect(prisma.tradeItemNote.create).not.toHaveBeenCalled();
  });

  it("the 400 validation body does not leak raw Zod issues", async () => {
    vi.mocked(prisma.tradeItem.findFirst).mockResolvedValue({
      id: "item-1",
      organizationId: "org-1",
      status: "DRAFT",
      eccnEU: null,
      eccnUS: null,
      usmlCategory: null,
      mtcrCategory: null,
      germanAlEntry: null,
    } as never);

    // usContentPercent out of range (>100) → schema validation fails.
    const res = await PATCH(req({ usContentPercent: 9999 }), ctx());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).not.toHaveProperty("issues");
    expect(typeof body.error).toBe("string");
    expect(prisma.tradeItem.update).not.toHaveBeenCalled();
  });

  it("rejects a non-ISO-2 countryOfOrigin (lowercase) with 400", async () => {
    vi.mocked(prisma.tradeItem.findFirst).mockResolvedValue({
      id: "item-1",
      organizationId: "org-1",
      status: "DRAFT",
      eccnEU: null,
      eccnUS: null,
      usmlCategory: null,
      mtcrCategory: null,
      germanAlEntry: null,
    } as never);

    const res = await PATCH(req({ countryOfOrigin: "de" }), ctx());
    expect(res.status).toBe(400);
    expect(prisma.tradeItem.update).not.toHaveBeenCalled();
  });

  it("does NOT require reasoning for a same-value (no-op) code write", async () => {
    // PATCH sends the SAME eccnEU value that's already on the item.
    vi.mocked(prisma.tradeItem.findFirst).mockResolvedValue({
      id: "item-1",
      organizationId: "org-1",
      status: "CLASSIFIED",
      eccnEU: "9A004",
      eccnUS: null,
      usmlCategory: null,
      mtcrCategory: null,
      germanAlEntry: null,
    } as never);
    vi.mocked(prisma.tradeItem.update).mockResolvedValue({
      id: "item-1",
      status: "CLASSIFIED",
    } as never);

    const res = await PATCH(req({ eccnEU: "9A004" }), ctx());
    expect(res.status).toBe(200);
    expect(prisma.tradeItemNote.create).not.toHaveBeenCalled();
  });
});
