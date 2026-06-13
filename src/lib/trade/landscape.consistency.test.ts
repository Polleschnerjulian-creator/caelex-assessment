/**
 * Passage Liefer-Landkarte — landscape↔single-verdict consistency wrap.
 *
 * Pins spec §9 (consistency) + §7.3 (honesty / tighten-never-loosen):
 *
 *   1. CONSISTENCY — for a fixture item and a chosen destination D, the
 *      single-verdict path (classifyItemForOperation + deriveVerdict with the
 *      same CLEAN/clean-buyer screening the landscape uses) MUST equal the
 *      landscape bucket for D. They are the same engine, so they must agree —
 *      any divergence is a regression, not a flaky test.
 *
 *   2. TIGHTEN-NEVER-LOOSEN — with a *tainted* screening (a blocked party) the
 *      real single verdict is at least as severe as the landscape cell for D.
 *      The landscape assumes a clean buyer; the real screening can only ever
 *      tighten the verdict, never relax it. (No false-CLEARED: a GO on the
 *      landscape can become REVIEW/BLOCKED for a real buyer, never the reverse.)
 *
 * This is a pure unit test (no DB / AI / HTTP / jsdom) — it reconstructs the
 * landscape runner's exact single-verdict call so the equality assertion
 * compares like with like.
 */
import { describe, it, expect } from "vitest";
import { runDestinationLandscape } from "./landscape.server";
import { LANDSCAPE_DESTINATIONS } from "./landscape";
import {
  classifyItemForOperation,
  type ClassifiableItem,
  type ClassifyOptions,
} from "./classification/classify-item";
import {
  deriveVerdict,
  type LineAssessment,
  type ScreeningAssessment,
  type Verdict,
} from "./operation-assistant-verdict";
import { originRegimes } from "@/lib/comply-v2/trade/classification/origin-regime-map";

// Severity ladder — GO is the loosest, BLOCKED the strictest. Mirrors the
// golden harness's SEV map; lets us assert "at least as severe".
const SEV: Record<Verdict, number> = { GO: 0, REVIEW: 1, BLOCKED: 2 } as const;

// A DE-seated exporter — matches the golden harness origin + the landscape
// runner's supported-seat path (no origin-unsupported GO→REVIEW upgrade).
const SEAT = "DE";

/** The clean-buyer screening the landscape uses (mirrors landscape.server CLEAN). */
const CLEAN: ScreeningAssessment = {
  status: "CLEAR",
  partyName: "Landscape (clean-buyer assumption)",
  partyBlocked: false,
  lastScreenedAt: null,
};

/** A tainted screening — a confirmed sanctions hit on the real buyer. */
const TAINTED: ScreeningAssessment = {
  status: "CONFIRMED_HIT",
  partyName: "Sanctioned end-user GmbH",
  partyBlocked: true,
  lastScreenedAt: new Date(),
};

/**
 * The single-verdict path for one item / destination / screening, reconstructed
 * to be byte-identical to what `runDestinationLandscape` builds per cell under a
 * supported seat (classify-options + LineAssessment + deriveVerdict). Same engine
 * → must agree with the landscape bucket when fed the CLEAN screening.
 */
function singleVerdict(
  item: ClassifiableItem,
  destination: string,
  screening: ScreeningAssessment,
): Verdict {
  const origin = originRegimes(SEAT);
  const classifyOpts: ClassifyOptions = {
    destinationCountry: destination,
    exporterSeat: SEAT,
    ...(origin.supported ? { exporterOrigin: origin } : {}),
  };
  const classification = classifyItemForOperation(item, classifyOpts);
  const line: LineAssessment = {
    lineId: `single-${destination}`,
    itemId: "single",
    itemName: item.name,
    classified: true,
    classification,
  };
  return deriveVerdict([line], screening).verdict;
}

/** Find which bucket a destination landed in on a LandscapeResult. */
function landscapeVerdict(
  r: ReturnType<typeof runDestinationLandscape>,
  destination: string,
): Verdict | undefined {
  if (r.go.some((c) => c.country === destination)) return "GO";
  if (r.review.some((c) => c.country === destination)) return "REVIEW";
  if (r.blocked.some((c) => c.country === destination)) return "BLOCKED";
  return undefined;
}

// A spread of items across the verdict ladder: an uncontrolled GO item, an
// EU001-eligible crypto item, and a hard-blocked Annex-IV/MTCR sat-bus.
const FIXTURES: { label: string; item: ClassifiableItem }[] = [
  {
    label: "uncontrolled reaction wheel",
    item: { name: "Reaction wheel 1 Nms", description: "AOCS wheel" },
  },
  {
    label: "5A002 crypto ground station",
    item: {
      name: "TT&C Ground station AES-256",
      description: "Uplink encryption AES-256",
      eccnEU: "5A002",
    },
  },
  {
    label: "9A004 satellite bus (Annex IV / MTCR)",
    item: {
      name: "500kg LEO Satellitenbus",
      description: "3-axis stabilized, S-band TT&C",
      payloadKg: 500,
      eccnEU: "9A004",
    },
  },
];

describe("landscape ↔ single-verdict consistency", () => {
  it("the single-verdict path equals the landscape bucket for every destination (same engine, no divergence)", () => {
    for (const { label, item } of FIXTURES) {
      const r = runDestinationLandscape(item, { exporterSeat: SEAT });
      for (const dest of LANDSCAPE_DESTINATIONS) {
        const landscape = landscapeVerdict(r, dest);
        expect(landscape, `${label} → ${dest} must be bucketed`).toBeDefined();
        const single = singleVerdict(item, dest, CLEAN);
        expect(
          single,
          `${label} → ${dest}: single verdict ${single} must equal landscape ${landscape}`,
        ).toBe(landscape);
      }
    }
  });

  it("a tainted (blocked) buyer tightens, never loosens, the verdict vs the clean-buyer landscape", () => {
    for (const { label, item } of FIXTURES) {
      const r = runDestinationLandscape(item, { exporterSeat: SEAT });
      for (const dest of LANDSCAPE_DESTINATIONS) {
        const landscape = landscapeVerdict(r, dest);
        expect(landscape).toBeDefined();
        const tainted = singleVerdict(item, dest, TAINTED);
        // The real verdict with a blocked buyer is at least as severe as the
        // clean-buyer landscape cell — the screening can only tighten.
        expect(
          SEV[tainted],
          `${label} → ${dest}: tainted ${tainted} must be ≥ severity of landscape ${landscape}`,
        ).toBeGreaterThanOrEqual(SEV[landscape as Verdict]);
      }
    }
  });

  it("a confirmed sanctions hit forces BLOCKED even where the clean-buyer landscape was GO (no false-CLEARED)", () => {
    // The uncontrolled wheel is a clean GO to friendly allies on the landscape;
    // a confirmed-hit buyer must turn that into BLOCKED, proving the clean-buyer
    // assumption is never trusted for the real single verdict.
    const wheel: ClassifiableItem = {
      name: "Reaction wheel 1 Nms",
      description: "AOCS wheel",
    };
    const r = runDestinationLandscape(wheel, { exporterSeat: SEAT });
    const usOnLandscape = landscapeVerdict(r, "US");
    expect(usOnLandscape).toBe("GO");
    expect(singleVerdict(wheel, "US", TAINTED)).toBe("BLOCKED");
  });
});
