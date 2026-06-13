import "server-only";
import {
  classifyItemForOperation,
  type ClassifiableItem,
  type ClassifyOptions,
} from "./classification/classify-item";
import {
  deriveVerdict,
  type LineAssessment,
  type ScreeningAssessment,
} from "./operation-assistant-verdict";
import { originRegimes } from "@/lib/comply-v2/trade/classification/origin-regime-map";
import {
  LANDSCAPE_DESTINATIONS,
  LANDSCAPE_CAPTION,
  type LandscapeCell,
  type LandscapeResult,
} from "./landscape";

/**
 * Synthetic all-CLEAR screening — the landscape is party-less by design
 * (the clean-buyer assumption). Mirrors the golden harness's
 * SYNTHETIC_CLEAR_SCREENING: `lastScreenedAt: null` means "freshness unknown",
 * which deriveVerdict does NOT downgrade to a gap, so the screening never
 * artificially inflates the verdict.
 */
const CLEAN: ScreeningAssessment = {
  status: "CLEAR",
  partyName: "Landscape (clean-buyer assumption)",
  partyBlocked: false,
  lastScreenedAt: null,
};

/** The cited detail line for a cell — the origin/licence requirement reason. */
function cellDetail(
  classification: ReturnType<typeof classifyItemForOperation>,
): string {
  const reqs = classification.licenseDetermination.requirements;
  // Prefer an origin-determination row (carries the cited licence), else the first.
  const origin = reqs.find((r) => (r.triggerCode ?? "").startsWith("ORIGIN_"));
  return (origin ?? reqs[0])?.reason ?? "Keine Genehmigung erforderlich.";
}

/**
 * Run the engine over LANDSCAPE_DESTINATIONS for one classified item under a
 * clean-buyer assumption, bucketed GO/REVIEW/BLOCKED. Pure (no DB / AI / HTTP).
 *
 * `opts` carries the exporter seat; the exporter origin is resolved here (only
 * forwarded when supported, matching the server source + golden harness).
 */
export function runDestinationLandscape(
  item: ClassifiableItem,
  opts: { exporterSeat?: string } = {},
): LandscapeResult {
  const origin = opts.exporterSeat
    ? originRegimes(opts.exporterSeat)
    : undefined;
  // Mirror the single-verdict engine for an unresolvable Kreis-A origin: when
  // the seat is unsupported OR absent (origin not resolved / not supported),
  // the server pushes an origin-unsupported Pendenz that upgrades a GO to
  // REVIEW (operation-assistant.server.ts:177-184 + 250-252). We reproduce that
  // GO→REVIEW upgrade here so the landscape never diverges from the real
  // verdict (spec §5 "same engine, no divergence"). The supported-seat path is
  // byte-identical to before.
  const originUnsupported = !origin?.supported;
  const go: LandscapeCell[] = [];
  const review: LandscapeCell[] = [];
  const blocked: LandscapeCell[] = [];

  for (const country of LANDSCAPE_DESTINATIONS) {
    const classifyOpts: ClassifyOptions = {
      destinationCountry: country,
      exporterSeat: opts.exporterSeat,
      ...(origin?.supported ? { exporterOrigin: origin } : {}),
    };
    const classification = classifyItemForOperation(item, classifyOpts);
    const line: LineAssessment = {
      lineId: `landscape-${country}`,
      itemId: "landscape",
      itemName: item.name,
      classified: true,
      classification,
    };
    const { verdict } = deriveVerdict([line], CLEAN);
    // Fail-closed origin upgrade: a GO under an unresolvable origin becomes a
    // cited REVIEW (never a synthesised BLOCKED — the engine's own BLOCKED/
    // REVIEW verdicts pass through unchanged).
    if (verdict === "GO" && originUnsupported) {
      review.push({
        country,
        verdict: "REVIEW",
        detail:
          "Exporteur-Sitz nicht als Kreis-A-Ursprung bestimmbar — Einzelfallprüfung.",
      });
      continue;
    }
    const cell: LandscapeCell = {
      country,
      verdict,
      detail: cellDetail(classification),
    };
    if (verdict === "GO") go.push(cell);
    else if (verdict === "REVIEW") review.push(cell);
    else blocked.push(cell);
  }

  return { go, review, blocked, caption: LANDSCAPE_CAPTION };
}
