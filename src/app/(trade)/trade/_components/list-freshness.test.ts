/**
 * Node tests for the hub list-freshness helpers (ILA review item #6) and
 * the SAG-utilization action items (#10) — the trust-signal logic must
 * not silently regress.
 */
import { describe, it, expect } from "vitest";
import {
  freshnessBucket,
  freshnessAgeLabel,
  SANCTIONS_LIST_LABELS,
} from "./ListFreshnessStrip";
import { aggregateActionItems } from "@/lib/trade/action-inbox-aggregator";

const NOW = new Date("2026-06-10T22:00:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 60 * 60 * 1000);

describe("freshnessBucket", () => {
  it("≤48h is fresh, ≤7d aging, >7d stale, null never", () => {
    expect(freshnessBucket(NOW, hoursAgo(2))).toBe("fresh");
    expect(freshnessBucket(NOW, hoursAgo(47))).toBe("fresh");
    expect(freshnessBucket(NOW, hoursAgo(49))).toBe("aging");
    expect(freshnessBucket(NOW, hoursAgo(7 * 24 + 1))).toBe("stale");
    expect(freshnessBucket(NOW, null)).toBe("never");
  });

  it("a never-loaded list is labeled honestly", () => {
    expect(freshnessAgeLabel(NOW, null)).toBe("nie geladen");
  });

  it("has a label for every sanctions list in the enum (8)", () => {
    expect(Object.keys(SANCTIONS_LIST_LABELS)).toHaveLength(8);
  });
});

describe("aggregateActionItems — sag-utilization-high", () => {
  const base = {
    blockedOperations: [],
    licensesExpiringSoon: [],
    eucsAwaitingAction: [],
    partiesNeedingReview: [],
    vsdDeadlinesNear: [],
    vsdsNeedingInvestigation: [],
    now: NOW,
  };

  it("≥95% is critical, 80–94% is warning", () => {
    const items = aggregateActionItems({
      ...base,
      sagsHighUtilization: [
        { id: "a", title: "SAG A", bafaReference: "AGG-1", utilizationPct: 96 },
        { id: "b", title: "SAG B", bafaReference: null, utilizationPct: 82 },
      ],
    });
    const critical = items.find((i) => i.id === "sag-utilization-high:a");
    const warning = items.find((i) => i.id === "sag-utilization-high:b");
    expect(critical?.severity).toBe("critical");
    expect(critical?.title).toContain("AGG-1");
    expect(critical?.title).toContain("96%");
    expect(warning?.severity).toBe("warning");
    expect(warning?.href).toBe("/trade/sammelgenehmigungen/b");
  });

  it("omitting the cohort changes nothing (backwards compatible)", () => {
    expect(aggregateActionItems(base)).toHaveLength(0);
  });
});
