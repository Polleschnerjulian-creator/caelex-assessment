/**
 * GET /api/v1/time-travel/snapshot (Sprint C2)
 *
 * Returns historical state for the authenticated org as of a given date.
 *
 * Query parameters:
 *   asOf       — ISO-8601 date (defaults to now; future clamped to now)
 *   scope      — operator-profile | proposals | audit-chain | all
 *   auditLimit — max audit entries (default 50, max 500)
 *
 * Requires API key with read:compliance scope.
 */

import { NextRequest } from "next/server";
import { withApiAuth, apiSuccess, ApiContext } from "@/lib/api-auth";
import {
  snapshotOperatorProfile,
  snapshotProposals,
  snapshotAuditChain,
} from "@/lib/time-travel/snapshot";

export const GET = withApiAuth(
  async (request: NextRequest, context: ApiContext) => {
    const url = new URL(request.url);
    const asOfRaw = url.searchParams.get("asOf");
    const scope = url.searchParams.get("scope") ?? "all";
    const auditLimitRaw = Number(url.searchParams.get("auditLimit") ?? "50");
    const auditLimit = Number.isFinite(auditLimitRaw)
      ? Math.max(1, Math.min(auditLimitRaw, 500))
      : 50;

    let asOf: Date | undefined;
    if (asOfRaw) {
      const d = new Date(asOfRaw);
      if (!isNaN(d.getTime())) asOf = d;
    }

    const out: Record<string, unknown> = {
      asOf: (asOf ?? new Date()).toISOString(),
      scope,
    };

    if (scope === "operator-profile" || scope === "all") {
      out.operatorProfile = await snapshotOperatorProfile(
        context.organizationId,
        asOf,
      );
    }
    if (scope === "proposals" || scope === "all") {
      out.proposals = await snapshotProposals(context.organizationId, asOf);
    }
    if (scope === "audit-chain" || scope === "all") {
      out.auditChain = await snapshotAuditChain(
        context.organizationId,
        asOf,
        auditLimit,
      );
    }

    return apiSuccess(out);
  },
  { requiredScopes: ["read:compliance"] },
);
