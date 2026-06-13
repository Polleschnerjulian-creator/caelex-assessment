import { describe, it, expect } from "vitest";
import { runDestinationLandscape } from "./landscape.server";
import { LANDSCAPE_DESTINATIONS } from "./landscape";
import { EU27_MEMBER_STATES } from "@/lib/comply-v2/trade/eu-member-states";
import type { ClassifiableItem } from "./classification/classify-item";

// A DE-seated exporter (matches the golden harness origin).
const DE_OPTS = { exporterSeat: "DE" as const };

describe("runDestinationLandscape", () => {
  it("buckets a sensitive MTCR item (9A004 sat-bus) fail-closed: never GO; RU/embargoes BLOCKED", () => {
    const satBus: ClassifiableItem = {
      name: "500kg LEO Satellitenbus",
      description: "3-axis stabilized, S-band TT&C",
      payloadKg: 500,
      eccnEU: "9A004",
    };
    const r = runDestinationLandscape(satBus, DE_OPTS);
    const all = [...r.go, ...r.review, ...r.blocked];
    // Every destination is bucketed exactly once.
    expect(all).toHaveLength(LANDSCAPE_DESTINATIONS.length);
    // 9A004 is an EU Annex IV member → never a bare GO to ANY third country
    // (fail-closed). Only intra-EU-27 destinations may be GO; every third
    // country (US, GB, JP, IN, CN, …) must be REVIEW or BLOCKED, never GO.
    expect(r.go.find((c) => c.country === "US")).toBeUndefined();
    for (const cell of r.go) {
      expect(EU27_MEMBER_STATES.has(cell.country)).toBe(true);
    }
    // Hard-block destinations are BLOCKED.
    for (const iso of ["RU", "BY", "IR", "KP"]) {
      expect(r.blocked.map((c) => c.country)).toContain(iso);
    }
    // The honesty caption is always present.
    expect(r.caption).toContain("sauberer Endkunde");
  });

  it("an EU001-eligible non-sensitive item (5A002) is GO to friendly allies, BLOCKED to RU", () => {
    const crypto: ClassifiableItem = {
      name: "TT&C Ground station AES-256",
      description: "Uplink encryption AES-256",
      eccnEU: "5A002",
    };
    const r = runDestinationLandscape(crypto, DE_OPTS);
    expect(r.go.map((c) => c.country)).toEqual(
      expect.arrayContaining(["US", "JP"]),
    );
    expect(r.blocked.map((c) => c.country)).toContain("RU");
  });

  it("an uncontrolled item is GO to non-embargoed destinations; comprehensive embargoes stay BLOCKED (fail-closed, destination-driven)", () => {
    const wheel: ClassifiableItem = {
      name: "Reaction wheel 1 Nms",
      description: "AOCS wheel",
    };
    const r = runDestinationLandscape(wheel, DE_OPTS);
    // No item-driven control code → no REVIEW.
    expect(r.review).toHaveLength(0);
    // Comprehensive-embargo destinations (EAR Country Group E:1/E:2) are BLOCKED
    // regardless of the item — the embargo is destination-driven. NEVER a bare GO.
    // (Plan invariant: "embargo destinations must be BLOCKED"; landscape.ts's own
    //  comment: the hard-block set is "always red — proves the engine blocks them".)
    for (const iso of ["IR", "KP", "SY", "CU"]) {
      expect(r.go.map((c) => c.country)).not.toContain(iso);
      expect(r.blocked.map((c) => c.country)).toContain(iso);
    }
    // Everything that is NOT a comprehensive-embargo destination is a clean GO.
    expect(r.go).toHaveLength(LANDSCAPE_DESTINATIONS.length - r.blocked.length);
    expect(r.go.map((c) => c.country)).toEqual(
      expect.arrayContaining(["US", "JP", "DE", "FR", "IN", "CN"]),
    );
  });

  it("an unsupported exporter seat upgrades every GO to REVIEW (server parity, no divergence)", () => {
    // The uncontrolled reaction wheel is a clean GO to non-embargoed
    // destinations under a SUPPORTED (DE) seat — see the test above.
    const wheel: ClassifiableItem = {
      name: "Reaction wheel 1 Nms",
      description: "AOCS wheel",
    };
    // "ZZ" is not a Kreis-A origin → originRegimes("ZZ").supported === false.
    // The single-verdict engine (operation-assistant.server.ts:177-184 + 250-252)
    // pushes an origin-unsupported Pendenz that upgrades GO→REVIEW. The landscape
    // runner must mirror this exactly or it diverges from the real verdict.
    const r = runDestinationLandscape(wheel, { exporterSeat: "ZZ" });
    const all = [...r.go, ...r.review, ...r.blocked];
    expect(all).toHaveLength(LANDSCAPE_DESTINATIONS.length);
    // NO cell is GO — an unresolvable Kreis-A origin is never a clean GO.
    expect(r.go).toHaveLength(0);
    // The wheel that was GO under DE is now REVIEW (not BLOCKED) for a
    // non-embargoed destination, with a cited single-case-review reason.
    const usCell = r.review.find((c) => c.country === "US");
    expect(usCell).toBeDefined();
    expect(usCell?.detail).toContain("Einzelfallprüfung");
    // Comprehensive-embargo destinations stay BLOCKED (destination-driven).
    for (const iso of ["IR", "KP", "SY", "CU"]) {
      expect(r.blocked.map((c) => c.country)).toContain(iso);
    }
    // The honesty caption is always present.
    expect(r.caption).toContain("sauberer Endkunde");
  });
});
