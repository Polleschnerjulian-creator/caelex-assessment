/**
 * GET /api/v1/lineage/:type/:id (Sprint C1)
 *
 * Returns the provenance subgraph for a subject (ComplianceItem,
 * OperatorProfile field, AstraProposal, or AuditLog entry).
 *
 * Requires API key with `read:compliance` scope.
 *
 * Response: LineageGraphResult { subject, nodes[], edges[], meta }
 */

import { NextRequest } from "next/server";
import { withApiAuth, apiSuccess, ApiContext } from "@/lib/api-auth";
import {
  buildLineageGraph,
  type LineageSubjectType,
} from "@/lib/lineage/build-lineage-graph";

const VALID_TYPES: ReadonlyArray<LineageSubjectType> = [
  "compliance-item",
  "operator-profile-field",
  "astra-proposal",
  "audit-log-entry",
];

function isValidType(s: string): s is LineageSubjectType {
  return (VALID_TYPES as readonly string[]).includes(s);
}

export const GET = withApiAuth(
  async (
    _request: NextRequest,
    context: ApiContext,
    routeParams?: { params: Promise<{ type: string; id: string }> },
  ) => {
    if (!routeParams?.params) {
      return apiSuccess({ error: "Missing route params" });
    }

    const { type, id } = await routeParams.params;
    if (!isValidType(type)) {
      return apiSuccess({
        error: `Invalid subject type: ${type}. Valid: ${VALID_TYPES.join(", ")}`,
      });
    }
    if (!id) {
      return apiSuccess({ error: "Missing subject id" });
    }

    const result = await buildLineageGraph(context.organizationId, {
      type,
      id,
    });
    return apiSuccess(result);
  },
  { requiredScopes: ["read:compliance"] },
);
