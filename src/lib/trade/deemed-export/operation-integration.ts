import "server-only";
import { prisma } from "@/lib/prisma";
import { checkDeemedExportCoverage } from "./deemed-export-service";

/**
 * Z13 — Operation integration hook.
 *
 * Called by the operation license-determination engine AFTER classification
 * is complete. When `operation.hasForeignNationalAccess` is true, this
 * function walks every classified line on the operation and, for each
 * line + each declared foreign-national-employee on the org, asks
 * `checkDeemedExportCoverage` whether the release is authorised.
 *
 * Returns a structured recommendation the engine surfaces to the operator:
 *   - `requiresCheck`: whether the engine flagged this operation
 *   - `coverageGaps`: lines lacking a covering authorisation
 *   - `recommendation`: human-readable next-step (UI banner copy)
 *
 * This function is read-only and side-effect free — it does NOT mutate
 * the operation or auto-block shipping. The legal call remains with
 * the operator + counsel; this just surfaces the risk.
 *
 * Performance: at MOST O(lines × employees). Real orgs have <100 lines
 * and <50 cleared FNs so a worst-case 5000-row check is fine without
 * pagination. If the math changes, batch via a single findMany over
 * the cartesian set rather than per-pair queries.
 */

export interface OperationCoverageInput {
  organizationId: string;
  operationId: string;
  /** Override the list of foreign-national employees to check against.
   *  When omitted, the function pulls all distinct employee IDs from
   *  the org's ACTIVE TradeDeemedExportAuthorization rows. */
  foreignNationalEmployeeIds?: string[];
}

export interface OperationCoverageGap {
  lineId: string;
  itemReference: string;
  eccn: string | null;
  usmlCategory: string | null;
  /** Employee IDs lacking a covering authorisation for this line. */
  uncoveredEmployeeIds: string[];
}

export interface OperationCoverageResult {
  requiresCheck: boolean;
  /** Lines with at least one employee lacking coverage. */
  coverageGaps: OperationCoverageGap[];
  /** Total (line, employee) pairs that lacked coverage. */
  totalGapCount: number;
  /** Short banner text for the UI. */
  recommendation: string;
}

export async function evaluateOperationDeemedExportCoverage(
  input: OperationCoverageInput,
): Promise<OperationCoverageResult> {
  // Pull the operation + its lines + each line's item ECCN / USML.
  // TradeItem identity uses `name` (+ optional `internalSku`); the US
  // CCL classification lives on `eccnUS` (vs EU Annex I on `eccnEU`).
  // For deemed-export coverage we use the US-side classification since
  // EAR § 734.20 is US-law and the foreign-national check is US-scoped.
  const operation = await prisma.tradeOperation.findFirst({
    where: { id: input.operationId, organizationId: input.organizationId },
    select: {
      id: true,
      hasForeignNationalAccess: true,
      lines: {
        select: {
          id: true,
          item: {
            select: {
              id: true,
              name: true,
              internalSku: true,
              eccnUS: true,
              usmlCategory: true,
            },
          },
        },
      },
    },
  });

  if (!operation) {
    throw new Error("Operation not found in this organisation");
  }

  // Short-circuit when the operator hasn't declared FN access — the
  // engine does NOT proactively check unless the operator declared it.
  if (!operation.hasForeignNationalAccess) {
    return {
      requiresCheck: false,
      coverageGaps: [],
      totalGapCount: 0,
      recommendation:
        "Operation not declared as exposing technology to foreign nationals — no deemed-export check required.",
    };
  }

  // Resolve employees to check against.
  let employeeIds = input.foreignNationalEmployeeIds;
  if (!employeeIds) {
    const distinctRows = await prisma.tradeDeemedExportAuthorization.findMany({
      where: {
        organizationId: input.organizationId,
        status: "ACTIVE",
      },
      select: { foreignNationalEmployeeId: true },
      distinct: ["foreignNationalEmployeeId"],
    });
    employeeIds = distinctRows.map((r) => r.foreignNationalEmployeeId);
  }

  // No employees declared on the org? Recommend setting up the roster
  // before allowing FN-access-enabled operations to ship.
  if (employeeIds.length === 0) {
    return {
      requiresCheck: true,
      coverageGaps: [],
      totalGapCount: 0,
      recommendation:
        "Operation exposes technology to foreign nationals but no deemed-export authorisations exist for this organisation. Add authorisations under /trade/deemed-exports before shipping.",
    };
  }

  // Classified lines only — unclassified items can't be coverage-checked
  // because we don't know what control list bucket they fall in.
  const classifiedLines = operation.lines.filter(
    (l) =>
      (l.item.eccnUS && l.item.eccnUS.length > 0) ||
      (l.item.usmlCategory && l.item.usmlCategory.length > 0),
  );

  const gaps: OperationCoverageGap[] = [];
  let totalGapCount = 0;

  for (const line of classifiedLines) {
    const uncovered: string[] = [];
    for (const empId of employeeIds) {
      const cov = await checkDeemedExportCoverage({
        organizationId: input.organizationId,
        foreignNationalEmployeeId: empId,
        eccn: line.item.eccnUS ?? null,
        usmlCategory: line.item.usmlCategory ?? null,
      });
      if (!cov.covered) {
        uncovered.push(empId);
        totalGapCount += 1;
      }
    }
    if (uncovered.length > 0) {
      gaps.push({
        lineId: line.id,
        itemReference: line.item.internalSku ?? line.item.name,
        eccn: line.item.eccnUS ?? null,
        usmlCategory: line.item.usmlCategory ?? null,
        uncoveredEmployeeIds: uncovered,
      });
    }
  }

  const recommendation =
    gaps.length === 0
      ? `All ${classifiedLines.length} classified line${classifiedLines.length === 1 ? "" : "s"} have deemed-export coverage for the ${employeeIds.length} foreign-national employee${employeeIds.length === 1 ? "" : "s"} on file.`
      : `${gaps.length} line${gaps.length === 1 ? "" : "s"} lack deemed-export coverage for one or more foreign-national employees. Review and apply for a deemed-export licence or document an applicable exemption before release.`;

  return {
    requiresCheck: true,
    coverageGaps: gaps,
    totalGapCount,
    recommendation,
  };
}
