/**
 * INTEGRATION — the load-bearing fail-open guard.
 *
 * Reproduces what AssessFlow.handleConfirm builds for the landscape: a scoped
 * item (name + scoped attributes folded as itemFromScoped does) merged with the
 * confirmed control code via `confirmedCodeCell`. Then runs the SAME engine the
 * UI hits (runDestinationLandscape) and proves a CONFIRMED controlled item
 * (EU:9A004 spacecraft) BLOCKS the embargoed destinations.
 *
 * The bug this guards: the UI used to pass a code-less item to the landscape,
 * so a confirmed controlled item classified as UNCONTROLLED → GO to RU/BY.
 * The Task-16 unit test missed it because it hand-set eccnEU on the item; the
 * real handleConfirm path never threaded the confirmed code. This test builds
 * the item the way the UI does, so it catches the integration the unit missed.
 */
import { describe, it, expect } from "vitest";
import { confirmedCodeCell } from "./confirmed-code-cell";
import { runDestinationLandscape } from "@/lib/trade/landscape.server";
import type { ClassifiableItem } from "@/lib/trade/classification/classify-item";

/**
 * The scoped attributes an operator might enter — none of which carry a control
 * code. Folded the way AssessFlow.itemFromScoped does (typed columns + a
 * parametric bag). The point: WITHOUT the confirmed code, this item is
 * parametrically UNCONTROLLED → GO everywhere.
 */
const scopedItem: ClassifiableItem = {
  name: "Sternsensor ST-300",
  description: "",
  parametricAttributes: { starTrackerAccuracyArcsec: 10 },
} as ClassifiableItem;

describe("INTEGRATION: confirmed code threaded onto the landscape item (fail-closed)", () => {
  it("REGRESSION GUARD — WITHOUT the confirmed code, the code-less item is GO to RU (this is the fail-open)", () => {
    // This documents the bug: the old code-less item lets RU through as GO.
    const r = runDestinationLandscape(scopedItem, { exporterSeat: "DE" });
    const go = r.go.map((c) => c.country);
    expect(go).toContain("RU");
  });

  it("WITH confirmedCodeCell merged (as handleConfirm now does), a confirmed EU:9A004 item BLOCKS RU and BY", () => {
    const landscapeItem: ClassifiableItem = {
      ...scopedItem,
      ...confirmedCodeCell({ canonicalId: "EU:9A004", regime: "EU-ANNEX-I" }),
    } as ClassifiableItem;

    const r = runDestinationLandscape(landscapeItem, { exporterSeat: "DE" });
    const blocked = r.blocked.map((c) => c.country);
    const go = r.go.map((c) => c.country);
    const total = r.go.length + r.review.length + r.blocked.length;

    // FAIL-CLOSED: the embargoed destinations are BLOCKED, NOT GO.
    expect(blocked).toContain("RU");
    expect(blocked).toContain("BY");
    expect(go).not.toContain("RU");
    expect(go).not.toContain("BY");
    // NOT all-GO — a controlled item cannot be a clean green light everywhere.
    expect(r.go.length).toBeLessThan(total);
  });
});
