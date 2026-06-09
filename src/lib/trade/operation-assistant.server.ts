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

  const screening: ScreeningAssessment = {
    status: operation.counterparty.screeningStatus,
    partyName: operation.counterparty.legalName,
    partyBlocked: operation.counterparty.status === "BLOCKED",
    lastScreenedAt: operation.counterparty.lastScreenedAt,
  };

  const verdict = deriveVerdict(lineAssessments, screening);

  return {
    operationId: operation.id,
    counterpartyId: operation.counterpartyId,
    ...verdict,
    lines: lineAssessments.map((l) => ({
      lineId: l.lineId,
      itemId: l.itemId,
      itemName: l.itemName,
      classification: l.classification,
    })),
  };
}
