/**
 * Re-Verification Dispatcher (Sprint 2A)
 *
 * Bridges Sprint 1C's stale-row cron with Sprint 2A's adapter framework.
 * Groups stale evidence rows by organisation, gathers identity hints from
 * the existing OperatorProfile, and invokes `runAutoDetection()`.
 *
 * **Why a dispatcher (instead of putting this in the cron route):**
 *
 *   1. Reusable — Sprint 4's pulse-tool will call dispatchOne() for a
 *      live operator-typed VAT-ID without going through the cron
 *   2. Testable — the cron stays small and focused on enumeration; the
 *      dispatcher gets its own unit tests
 *   3. Rate-limit-aware — adapter rate-limits are managed at this layer,
 *      not duplicated across cron + sync paths
 *
 * **Sprint 2A scope:**
 *
 *   - One identity-hint source: OperatorProfile column values (VAT-ID
 *     stored in evidence rows; legal name + establishment from columns)
 *   - Sequential dispatch across orgs (rate-limit-friendly)
 *   - Hard cap: MAX_ORGS_PER_DISPATCH per call to keep cron runtime bounded
 *
 * Reference: ADR-009 (VIES first), Sprint 1C cron skeleton at
 * `src/app/api/cron/evidence-reverification/route.ts`
 */

import "server-only";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import type { StaleEvidenceRow } from "../evidence.server";
import { runAutoDetection } from "./cross-verifier.server";
import type { AdapterInput, CrossVerificationResult } from "./types";

/** Hard cap — protects cron function-execution budget. */
export const MAX_ORGS_PER_DISPATCH = 50;

export interface DispatchSummary {
  orgsProcessed: number;
  orgsSkipped: number;
  adaptersInvoked: number;
  fieldsRefreshed: number;
  failures: number;
  truncated: boolean;
  perOrg: Array<{
    organizationId: string;
    adaptersRun: number;
    fieldsRefreshed: number;
    failures: number;
  }>;
}

/**
 * Run re-verification across the orgs whose evidence rows are stale.
 * Stable, idempotent: re-running with the same input produces the same
 * appends (the chain detects no-op writes via `mirrorValueToLegacyColumn`'s
 * `force` check, but evidence rows are still appended — they ARE the
 * audit trail of "we re-checked at time T").
 */
export async function dispatchReverificationForStaleRows(
  rows: StaleEvidenceRow[],
  options: { maxOrgs?: number } = {},
): Promise<DispatchSummary> {
  const maxOrgs = options.maxOrgs ?? MAX_ORGS_PER_DISPATCH;

  // Group by org
  const byOrg = new Map<string, StaleEvidenceRow[]>();
  for (const r of rows) {
    const list = byOrg.get(r.organizationId) ?? [];
    list.push(r);
    byOrg.set(r.organizationId, list);
  }

  const orgIds = [...byOrg.keys()];
  const orgIdsToProcess = orgIds.slice(0, maxOrgs);
  const truncated = orgIds.length > maxOrgs;

  const summary: DispatchSummary = {
    orgsProcessed: 0,
    orgsSkipped: 0,
    adaptersInvoked: 0,
    fieldsRefreshed: 0,
    failures: 0,
    truncated,
    perOrg: [],
  };

  // Sequential — VIES has shared rate-limits; concurrent dispatch would
  // hammer it. Sprint 2E may parallelise once we have per-source rate-limit
  // handling.
  for (const orgId of orgIdsToProcess) {
    try {
      const input = await buildAdapterInput(orgId);
      if (!hasAnyHint(input)) {
        // No identity hints → nothing to re-verify automatically.
        // Sprint 2B/2C/2D adapters that don't need vatId will still skip
        // here at this point — they'll have their own input requirements.
        summary.orgsSkipped += 1;
        continue;
      }
      const result = await runAutoDetection(input);
      const refreshed = result.mergedFields.length;
      summary.orgsProcessed += 1;
      summary.adaptersInvoked += result.successfulOutcomes.length;
      summary.fieldsRefreshed += refreshed;
      summary.failures += result.failures.length;
      summary.perOrg.push({
        organizationId: orgId,
        adaptersRun: result.successfulOutcomes.length,
        fieldsRefreshed: refreshed,
        failures: result.failures.length,
      });
    } catch (err) {
      // Adapters are designed not to throw; the dispatcher should not
      // either. If a Prisma read for the OperatorProfile fails, log and
      // move on — one org's broken DB row should not stop the entire cron.
      logger.error("[dispatcher] failed to process org", { orgId, err });
      summary.failures += 1;
      summary.perOrg.push({
        organizationId: orgId,
        adaptersRun: 0,
        fieldsRefreshed: 0,
        failures: 1,
      });
    }
  }

  logger.info("[dispatcher] reverification complete", {
    orgsProcessed: summary.orgsProcessed,
    orgsSkipped: summary.orgsSkipped,
    adaptersInvoked: summary.adaptersInvoked,
    fieldsRefreshed: summary.fieldsRefreshed,
    failures: summary.failures,
    truncated,
  });

  return summary;
}

/**
 * One-shot dispatch for a single org. Used by Sprint 4's pulse-tool which
 * captures a VAT-ID + name from a public form and runs detection live.
 */
export async function dispatchOne(
  organizationId: string,
  hintsOverride?: Partial<AdapterInput>,
): Promise<CrossVerificationResult> {
  const input = await buildAdapterInput(organizationId);
  return runAutoDetection({ ...input, ...hintsOverride });
}

// ─── Internals ─────────────────────────────────────────────────────────────

/**
 * Build the AdapterInput shape from whatever we know about an org. Reads
 * the legacy OperatorProfile column values plus any prior evidence rows
 * that captured a VAT-ID or legal name.
 *
 * Sprint 1B mirrors verified values into the OperatorProfile columns, so
 * for orgs that have used the verified-tier system the columns are
 * authoritative. Pre-Sprint-1B orgs may have populated columns from the
 * legacy `operator-profile-service.updateProfile()` flow; either source
 * is fine.
 */
async function buildAdapterInput(
  organizationId: string,
): Promise<AdapterInput> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const operatorProfile = (prisma as any).operatorProfile;
  const profile = await operatorProfile.findUnique({
    where: { organizationId },
    select: {
      establishment: true,
    },
  });

  // VAT-ID is not currently a column on OperatorProfile. We look for it in
  // DerivationTrace evidence rows under fieldName="vatId" (set when an
  // earlier adapter run or operator-input flagged it). If none found, the
  // VIES adapter will reject with errorKind:missing-input — which is fine.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const derivationTrace = (prisma as any).derivationTrace;
  const vatTrace = await derivationTrace.findFirst({
    where: {
      organizationId,
      entityType: "operator_profile",
      fieldName: "vatId",
      revokedAt: null,
    },
    orderBy: [{ derivedAt: "desc" }, { id: "desc" }],
    select: { value: true },
  });

  let vatId: string | undefined;
  if (vatTrace?.value) {
    try {
      const parsed = JSON.parse(vatTrace.value as string) as unknown;
      if (typeof parsed === "string") vatId = parsed;
    } catch {
      // value not JSON — treat as raw string (defensive for hand-written rows)
      vatId = String(vatTrace.value);
    }
  }

  return {
    organizationId,
    establishment: profile?.establishment ?? undefined,
    vatId,
  };
}

function hasAnyHint(input: AdapterInput): boolean {
  return Boolean(
    input.vatId ||
    input.legalName ||
    input.establishment ||
    input.registryNumber ||
    input.unoosaId ||
    input.bafaLicenceId,
  );
}
