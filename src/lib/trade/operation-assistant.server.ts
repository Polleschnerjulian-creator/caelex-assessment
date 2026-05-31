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
        select: { legalName: true, screeningStatus: true, status: true },
      },
      lines: { include: { item: true } },
    },
  });
  if (!operation) throw new OperationNotFoundError(operationId);

  const destinationCountry = operation.shipToCountry ?? null;

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
          },
        );
      } catch (err) {
        // Engine failure must never produce a false GO: degrade to a gap so the
        // verdict becomes REVIEW, and the operation stays resumable.
        logger.error(
          { err, itemId: item.id },
          "classifyItemForOperation failed",
        );
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
