/**
 * Tests for action-inbox-aggregator (U-HIGH-1).
 *
 * Pure-function aggregator — easy to exhaustively test the severity
 * classification, sort order, and cohort transformation.
 */

import { describe, it, expect } from "vitest";
import {
  aggregateActionItems,
  severityToneClass,
  severityChipBg,
  severityLabel,
  type AggregatorInput,
  type ActionItem,
} from "./action-inbox-aggregator";

const now = new Date("2026-05-24T12:00:00Z");

/** Minimal aggregator input with all cohorts empty. */
function emptyInput(): AggregatorInput {
  return {
    blockedOperations: [],
    licensesExpiringSoon: [],
    eucsAwaitingAction: [],
    partiesNeedingReview: [],
    vsdDeadlinesNear: [],
    vsdsNeedingInvestigation: [],
    now,
  };
}

/** Date `n` days from now. */
function daysFromNow(n: number): Date {
  return new Date(now.getTime() + n * 24 * 60 * 60 * 1000);
}

describe("aggregateActionItems — empty input", () => {
  it("returns an empty list when no cohorts have items", () => {
    expect(aggregateActionItems(emptyInput())).toEqual([]);
  });
});

describe("aggregateActionItems — BLOCKED operations", () => {
  it("always marks blocked operations as critical", () => {
    const items = aggregateActionItems({
      ...emptyInput(),
      blockedOperations: [
        { id: "op-1", reference: "OP-2026-001", counterpartyName: "Acme" },
      ],
    });
    expect(items).toHaveLength(1);
    expect(items[0].severity).toBe("critical");
    expect(items[0].kind).toBe("operation-blocked");
    expect(items[0].title).toContain("OP-2026-001");
    expect(items[0].subtitle).toContain("Acme");
    expect(items[0].href).toBe("/trade/operations/op-1");
  });

  it("uses a fallback subtitle when counterparty is missing", () => {
    const items = aggregateActionItems({
      ...emptyInput(),
      blockedOperations: [
        { id: "op-2", reference: "OP-X", counterpartyName: null },
      ],
    });
    expect(items[0].subtitle).toMatch(/Release the block/);
  });
});

describe("aggregateActionItems — expiring licenses", () => {
  it("flags ≤14 days as critical", () => {
    const items = aggregateActionItems({
      ...emptyInput(),
      licensesExpiringSoon: [
        {
          id: "lic-1",
          licenseNumber: "BAFA-G-2026-77",
          licenseType: "BAFA_EINZEL",
          validUntil: daysFromNow(10),
        },
      ],
    });
    expect(items[0].severity).toBe("critical");
    expect(items[0].countdown).toBe("in 10d");
  });

  it("flags 15-30 days as warning", () => {
    const items = aggregateActionItems({
      ...emptyInput(),
      licensesExpiringSoon: [
        {
          id: "lic-2",
          licenseNumber: "BIS-1234",
          licenseType: "BIS_EAR",
          validUntil: daysFromNow(20),
        },
      ],
    });
    expect(items[0].severity).toBe("warning");
  });

  it("drops licenses expiring beyond 30 days", () => {
    const items = aggregateActionItems({
      ...emptyInput(),
      licensesExpiringSoon: [
        {
          id: "lic-3",
          licenseNumber: "DDTC-DSP5-7",
          licenseType: "DDTC_DSP5",
          validUntil: daysFromNow(60),
        },
      ],
    });
    expect(items).toEqual([]);
  });

  it("falls back to licenseType when licenseNumber is null", () => {
    const items = aggregateActionItems({
      ...emptyInput(),
      licensesExpiringSoon: [
        {
          id: "lic-4",
          licenseNumber: null,
          licenseType: "BAFA_AGG_12",
          validUntil: daysFromNow(5),
        },
      ],
    });
    expect(items[0].title).toContain("BAFA_AGG_12");
  });
});

describe("aggregateActionItems — EUCs awaiting signature", () => {
  it("ignores EUCs sent <7 days ago (counterparty still has time)", () => {
    const items = aggregateActionItems({
      ...emptyInput(),
      eucsAwaitingAction: [
        { id: "euc-1", sentAt: daysFromNow(-3), partyName: "DLR" },
      ],
    });
    expect(items).toEqual([]);
  });

  it("warns when 7-21 days have elapsed", () => {
    const items = aggregateActionItems({
      ...emptyInput(),
      eucsAwaitingAction: [
        { id: "euc-2", sentAt: daysFromNow(-12), partyName: "DLR" },
      ],
    });
    expect(items[0].severity).toBe("warning");
    expect(items[0].title).toContain("DLR");
    expect(items[0].countdown).toBe("sent 12d ago");
  });

  it("escalates to critical when >21 days elapsed", () => {
    const items = aggregateActionItems({
      ...emptyInput(),
      eucsAwaitingAction: [
        { id: "euc-3", sentAt: daysFromNow(-30), partyName: "DLR" },
      ],
    });
    expect(items[0].severity).toBe("critical");
  });

  it("skips EUCs without a sentAt timestamp", () => {
    const items = aggregateActionItems({
      ...emptyInput(),
      eucsAwaitingAction: [{ id: "euc-4", sentAt: null, partyName: "DLR" }],
    });
    expect(items).toEqual([]);
  });
});

describe("aggregateActionItems — parties needing screening", () => {
  it("marks POTENTIAL_MATCH as critical", () => {
    const items = aggregateActionItems({
      ...emptyInput(),
      partiesNeedingReview: [
        { id: "p-1", legalName: "Foo", screeningStatus: "POTENTIAL_MATCH" },
      ],
    });
    expect(items[0].severity).toBe("critical");
    expect(items[0].title).toContain("Foo");
    expect(items[0].title).toContain("potential sanctions match");
  });

  it("marks STALE + CONFIRMED_HIT as warning (not critical)", () => {
    const items = aggregateActionItems({
      ...emptyInput(),
      partiesNeedingReview: [
        { id: "p-2", legalName: "Bar", screeningStatus: "STALE" },
        {
          id: "p-3",
          legalName: "Baz",
          screeningStatus: "CONFIRMED_HIT",
        },
      ],
    });
    expect(items.every((i) => i.severity === "warning")).toBe(true);
  });
});

describe("aggregateActionItems — VSD deadlines", () => {
  it("marks VSD deadlines ≤14d as critical", () => {
    const items = aggregateActionItems({
      ...emptyInput(),
      vsdDeadlinesNear: [
        {
          id: "vsd-1",
          title: "Q1 shipment",
          authority: "OFAC",
          deadlineAt: daysFromNow(7),
        },
      ],
    });
    expect(items[0].severity).toBe("critical");
    expect(items[0].title).toContain("OFAC");
    expect(items[0].countdown).toBe("in 7d");
  });

  it("escalates VSD discovery to critical after 14 days untouched", () => {
    const items = aggregateActionItems({
      ...emptyInput(),
      vsdsNeedingInvestigation: [
        { id: "vsd-2", title: "Aug 2025", discoveredAt: daysFromNow(-20) },
      ],
    });
    expect(items[0].severity).toBe("critical");
    expect(items[0].countdown).toBe("discovered 20d ago");
  });
});

describe("aggregateActionItems — sort order", () => {
  it("returns critical items before warnings", () => {
    const items = aggregateActionItems({
      ...emptyInput(),
      licensesExpiringSoon: [
        // 20d → warning
        {
          id: "lic-a",
          licenseNumber: "WARN-LIC",
          licenseType: "BIS_EAR",
          validUntil: daysFromNow(20),
        },
      ],
      blockedOperations: [
        { id: "op-a", reference: "BLOCKED-OP", counterpartyName: "X" },
      ],
    });
    expect(items.map((i) => i.severity)).toEqual(["critical", "warning"]);
  });

  it("within the same severity, smaller days-left sorts first", () => {
    const items = aggregateActionItems({
      ...emptyInput(),
      licensesExpiringSoon: [
        {
          id: "lic-far",
          licenseNumber: "FAR",
          licenseType: "BIS_EAR",
          validUntil: daysFromNow(13),
        },
        {
          id: "lic-near",
          licenseNumber: "NEAR",
          licenseType: "BIS_EAR",
          validUntil: daysFromNow(3),
        },
      ],
    });
    // Both critical (≤14d), so NEAR (3d) should beat FAR (13d).
    expect(items[0].title).toContain("NEAR");
    expect(items[1].title).toContain("FAR");
  });
});

describe("presentation helpers", () => {
  it("severityToneClass maps to expected Tailwind colours", () => {
    expect(severityToneClass("critical")).toBe("text-red-600");
    expect(severityToneClass("warning")).toBe("text-amber-600");
    expect(severityToneClass("info")).toBe("text-blue-600");
  });

  it("severityChipBg maps to expected Tailwind backgrounds", () => {
    expect(severityChipBg("critical")).toBe("bg-red-50");
    expect(severityChipBg("warning")).toBe("bg-amber-50");
    expect(severityChipBg("info")).toBe("bg-blue-50");
  });

  it("severityLabel returns capitalised short labels for aria use", () => {
    expect(severityLabel("critical")).toBe("Critical");
    expect(severityLabel("warning")).toBe("Warning");
    expect(severityLabel("info")).toBe("Info");
  });
});

describe("ActionItem id uniqueness", () => {
  it("uses kind+sourceId so React reconciler never collides", () => {
    const items = aggregateActionItems({
      ...emptyInput(),
      blockedOperations: [
        { id: "shared-id", reference: "OP-1", counterpartyName: "X" },
      ],
      vsdsNeedingInvestigation: [
        { id: "shared-id", title: "VSD-1", discoveredAt: daysFromNow(-10) },
      ],
    });
    const ids = items.map((i: ActionItem) => i.id);
    expect(ids).toContain("operation-blocked:shared-id");
    expect(ids).toContain("vsd-needs-investigation:shared-id");
    expect(new Set(ids).size).toBe(ids.length);
  });
});
