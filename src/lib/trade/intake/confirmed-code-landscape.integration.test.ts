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

/**
 * B4 — the regression guard the cluster slipped through. The original test
 * above only exercised `EU:9A004`, the SINGLE regime that maps to an
 * engine-readable cell (`eccnEU`). 7 of 10 surfaceable regimes map to an
 * unread/empty cell — MTCR/DE-AL go onto `mtcrCategory`/`germanAlEntry` (which
 * the engine did NOT consume), and JP-METI/NSG/RU-833/Wassenaar resolved to no
 * cell at all (`confirmedCodeCell` returned `{}`) → the confirmed controlled
 * item reached the landscape code-less → classified UNCONTROLLED → fail-open GO
 * incl. to RU/BY.
 *
 * This parametrizes over every surfaceable regime. A confirmed control code on
 * ANY regime is a CONTROLLED good and MUST fail closed: RU + BY BLOCKED (never
 * GO), and the result is never all-GO. RED before B1/B2/B3, GREEN after.
 */
describe("INTEGRATION [B4]: a confirmed code on ANY regime cell fails closed (no GO to RU/BY)", () => {
  // A representative confirmable code per regime, paired with the RegimeName
  // string `confirmedCodeCell` routes on. The codes are realistic space-domain
  // entries; the test does NOT depend on them resolving in the corpus — the
  // fail-closed principle is: a DECLARED code is a CONTROLLED good regardless.
  const cases: Array<{ regime: string; canonicalId: string; label: string }> = [
    {
      regime: "MTCR-ANNEX",
      canonicalId: "MTCR:Item-3.A.3",
      label: "rocket nozzle (MTCR Cat. II)",
    },
    {
      regime: "DE-AL-TEIL-IB",
      canonicalId: "DE-AL:0009",
      label: "German Ausfuhrliste 0009",
    },
    {
      regime: "JP-METI",
      canonicalId: "JP-METI:4(1)",
      label: "Japan METI Schedule 1",
    },
    {
      regime: "NSG-TRIGGER",
      canonicalId: "NSG:1.1",
      label: "NSG Trigger List",
    },
    { regime: "NSG-DU", canonicalId: "NSG:2.A.1", label: "NSG Dual-Use Annex" },
    {
      regime: "RUSSIA-833-VII",
      canonicalId: "RU833:VII.9A004",
      label: "Russia 833 Annex VII",
    },
    {
      regime: "WASSENAAR",
      canonicalId: "WASSENAAR:9A004",
      label: "Wassenaar Cat. 9",
    },
  ];

  for (const { regime, canonicalId, label } of cases) {
    it(`${regime} (${label}) → RU + BY BLOCKED, not all-GO`, () => {
      const cell = confirmedCodeCell({ canonicalId, regime });
      // A confirmed code is NEVER silently dropped — the patch is non-empty so
      // the controlled good is carried onto the item the engine sees.
      expect(Object.keys(cell).length).toBeGreaterThan(0);

      const landscapeItem: ClassifiableItem = {
        ...scopedItem,
        ...cell,
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
      // A declared control code is a controlled good — never a clean GO sweep.
      expect(r.go.length).toBeLessThan(total);
    });
  }
});
