import "server-only";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  classifyItemForOperation,
  type ClassifiableItem,
  type ClassificationResult,
} from "@/lib/trade/classification/classify-item";
import {
  deriveVerdict,
  type LineAssessment,
  type ScreeningAssessment,
  type VerdictResult,
} from "@/lib/trade/operation-assistant-verdict";
import { resolveExporterSeat } from "@/lib/trade/exporter-seat";
import { originRegimes } from "@/lib/comply-v2/trade/classification/origin-regime-map";

export class OperationNotFoundError extends Error {
  constructor(operationId: string) {
    super(`Trade operation ${operationId} not found in organization scope`);
    this.name = "OperationNotFoundError";
  }
}

export interface OperationAssessment extends VerdictResult {
  operationId: string;
  counterpartyId: string;
  lines: Array<{
    lineId: string;
    itemId: string;
    itemName: string;
    classification: ClassificationResult | null;
  }>;
}

/** Classified once the item has a status or any control code. */
function isClassified(item: {
  status: string;
  eccnEU: string | null;
  eccnUS: string | null;
  usmlCategory: string | null;
}): boolean {
  return (
    item.status === "CLASSIFIED" ||
    Boolean(item.eccnEU) ||
    Boolean(item.eccnUS) ||
    Boolean(item.usmlCategory)
  );
}

export async function assessOperation(
  operationId: string,
  ctx: { organizationId: string },
): Promise<OperationAssessment> {
  const operation = await prisma.tradeOperation.findFirst({
    where: { id: operationId, organizationId: ctx.organizationId },
    include: {
      counterparty: {
        select: {
          legalName: true,
          screeningStatus: true,
          status: true,
          lastScreenedAt: true,
        },
      },
      lines: { include: { item: true } },
    },
  });
  if (!operation) throw new OperationNotFoundError(operationId);

  const destinationCountry = operation.shipToCountry ?? null;

  // ── Gate 0 threading (G6): EU 833/2014 Annex IV Art. 2b prohibition ──
  // The per-line license gate can only fire the non-derogable Annex IV
  // PROHIBITION when it is told which sanctions lists the counterparty
  // matched. Fetch the LATEST persisted screening for the counterparty and
  // extract the distinct sanctions lists from its hits. This can only ADD a
  // block — it never removes one. CONSERVATIVE: if no screening exists yet
  // we pass `undefined` (the gate simply does not fire — never an invented
  // clear). The hits JSON is an array of { list: TradeSanctionsList, … }.
  let screeningContext: { sanctionsLists: string[] } | undefined;
  try {
    const latestScreening = await prisma.tradeScreeningResult.findFirst({
      where: { partyId: operation.counterpartyId },
      orderBy: { createdAt: "desc" },
      select: { hits: true },
    });
    if (latestScreening) {
      const hits = Array.isArray(latestScreening.hits)
        ? (latestScreening.hits as Array<{ list?: unknown }>)
        : [];
      const sanctionsLists = Array.from(
        new Set(
          hits
            .map((h) => (typeof h?.list === "string" ? h.list : null))
            .filter((l): l is string => l !== null),
        ),
      );
      // Only build a context when at least one list is present; an empty
      // list array would be indistinguishable from "no Annex IV" and adds
      // nothing — keeping it undefined avoids a misleading empty context.
      if (sanctionsLists.length > 0) {
        screeningContext = { sanctionsLists };
      }
    }
  } catch (err) {
    // A screening-lookup failure must NEVER weaken the verdict. We log and
    // fall through with screeningContext undefined: the Annex IV gate then
    // does not fire (fail-safe in the SAFE direction — it cannot invent a
    // clear, only fail to add the extra block, which the human still owns).
    logger.error(
      "assessOperation: latest-screening lookup failed; Annex IV gate not threaded",
      err,
      { counterpartyId: operation.counterpartyId },
    );
  }

  const screening: ScreeningAssessment = {
    status: operation.counterparty.screeningStatus,
    partyName: operation.counterparty.legalName,
    partyBlocked: operation.counterparty.status === "BLOCKED",
    lastScreenedAt: operation.counterparty.lastScreenedAt,
  };

  // ── Origin-seat resolution (Spec §4.3b + §4.7 / S0 Task 6) ────────────────
  // Fetch the org's billingAddress to determine which export-control regime
  // applies. The three cases are strictly fail-closed:
  //   1. Supported seat (e.g. DE): assessedUnder = dualUsePrimary. No new gap.
  //   2. Unsupported seat (e.g. BR): push a "origin-unsupported" Pendenz so
  //      deriveVerdict's existing "any gap ⇒ REVIEW" rule fires. assessedUnder = null.
  //   3. Null seat (no/unparseable billingAddress): behavior-equal to today —
  //      no new Pendenz, no gap. originNotice set; assessedUnder = null.
  //
  // IMPORTANT (S0 Task 7): resolvedExporterOrigin is resolved BEFORE
  // lineAssessments so it is available when classifyItemForOperation is called
  // for each line. Moving this block above lineAssessments avoids the TDZ issue
  // that would otherwise silently degrade all lines to "unclassified".
  let assessedUnder: string | null = null;
  let originNotice: string | null = null;
  const originPendenzen: VerdictResult["pendenzen"] = [];
  // S0 Task 7: resolved OriginRegimeRouting forwarded to classifyItemForOperation
  // so Gate 4.5 can fire. Set only for supported seats (Case 1); undefined otherwise.
  let resolvedExporterOrigin:
    | import("@/lib/comply-v2/trade/classification/origin-regime-map").OriginRegimeRouting
    | undefined;
  // The resolved exporter seat ISO-2 (the same value fed to originRegimes()).
  // Threaded into the origin-determination stage so modules resolving an EU
  // member-state → NCA see the SEAT, never the destination. Undefined for
  // null/unparseable seats → legacy behavior.
  let resolvedExporterSeat: string | undefined;

  try {
    const org = await prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      select: { billingAddress: true },
    });

    const seat = resolveExporterSeat(org);

    if (seat === null) {
      // Case 3: null seat — behavior-equal, only a notice
      originNotice =
        "Exporteur-Sitz im Org-Profil nicht gesetzt — Bewertung nimmt EU-Standard an";
    } else {
      // Capture the resolved seat for the origin-determination stage. This is
      // the EXPORTER's seat ISO-2 (the same value fed to originRegimes below),
      // NOT the destination. Set for any resolved seat — modules treat an
      // unsupported/unmodelled seat fail-closed.
      resolvedExporterSeat = seat;
      const regime = originRegimes(seat);
      if (regime.supported) {
        // Case 1: supported seat — set assessedUnder, no Pendenz, forward regime
        // to Gate 4.5 via classifyItemForOperation (Task 7 wire-through).
        assessedUnder = regime.dualUsePrimary;
        resolvedExporterOrigin = regime;
      } else {
        // Case 2: unsupported seat — push a gap Pendenz (triggers REVIEW via deriveVerdict)
        originPendenzen.push({
          id: "origin-unsupported",
          label: `Exporteur-Sitz ${seat} wird von Passage noch nicht unterstützt — Ausfuhrrecht manuell prüfen`,
        });
        // Do NOT forward exporterOrigin: unsupported.supported === false,
        // and Gate 4.5 only fires for supported seats.
      }
    }
  } catch (err) {
    // A seat-lookup failure must NEVER silently drop the assessment. We log and
    // fall through with null seat (behavior-equal — same as case 3). Fail-safe:
    // worst case the notice is missing, but no false GO is ever produced.
    logger.error(
      "assessOperation: org billingAddress lookup failed; origin-seat not resolved",
      err,
      { organizationId: ctx.organizationId },
    );
    originNotice =
      "Exporteur-Sitz im Org-Profil nicht gesetzt — Bewertung nimmt EU-Standard an";
  }

  // ── Line assessments (built AFTER origin resolution so exporterOrigin is set) ─
  const lineAssessments: LineAssessment[] = operation.lines.map((l) => {
    const item = l.item;
    let classified = isClassified(item);
    let classification: ClassificationResult | null = null;
    if (classified) {
      try {
        classification = classifyItemForOperation(
          item as unknown as ClassifiableItem,
          {
            destinationCountry,
            screeningContext,
            // S0 Task 7: pass the resolved exporter origin to Gate 4.5.
            // Only set when seat resolved AND regime.supported (Case 1).
            // Undefined for null/unsupported seats → legacy behavior.
            exporterOrigin: resolvedExporterOrigin,
            // Thread the REAL exporter seat ISO-2 (NOT the destination) into
            // the origin-determination stage. Set for any resolved seat;
            // undefined for null/unparseable seats → legacy behavior.
            exporterSeat: resolvedExporterSeat,
          },
        );
      } catch (err) {
        // Engine failure must never produce a false GO: degrade to a gap so the
        // verdict becomes REVIEW, and the operation stays resumable.
        logger.error("classifyItemForOperation failed", err, {
          itemId: item.id,
        });
        classified = false;
        classification = null;
      }
    }
    return {
      lineId: l.id,
      itemId: item.id,
      itemName: item.name,
      classified,
      classification,
    };
  });

  const verdict = deriveVerdict(lineAssessments, screening);

  // Merge origin pendenzen AFTER deriveVerdict — do NOT pass them into
  // deriveVerdict to avoid touching its logic. Instead we inject them here
  // and recalculate the verdict manually so the "any gap ⇒ REVIEW" rule fires.
  const allPendenzen = [...verdict.pendenzen, ...originPendenzen];

  // Re-derive verdict only if we added a new gap (unsupported seat).
  // Build the effective verdict from the merged pendenzen + existing steps.
  let effectiveVerdict = verdict.verdict;
  if (originPendenzen.length > 0 && effectiveVerdict === "GO") {
    effectiveVerdict = "REVIEW";
  }

  return {
    operationId: operation.id,
    counterpartyId: operation.counterpartyId,
    ...verdict,
    verdict: effectiveVerdict,
    pendenzen: allPendenzen,
    assessedUnder,
    originNotice,
    lines: lineAssessments.map((l) => ({
      lineId: l.lineId,
      itemId: l.itemId,
      itemName: l.itemName,
      classification: l.classification,
    })),
  };
}
