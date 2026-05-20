/**
 * Time-Travel Service (Sprint C2 — partial, no schema migration)
 *
 * "What was true on date X?" — reconstructs historical state from the
 * existing append-only chains (DerivationTrace, AstraProposal,
 * AuditLog). No TSTZRANGE columns needed — we exploit the fact that
 * every meaningful state-bearing entity is already write-append-only.
 *
 * This is the pragmatic 80/20 of the full bi-temporal plan: ships a
 * working "as-of" query today; full TSTZRANGE on the 10+
 * *RequirementStatus tables remains an open follow-up.
 *
 * Public API:
 *   snapshotOperatorProfile(orgId, asOf?)  → field state at asOf
 *   snapshotProposals(orgId, asOf?)        → proposals known at asOf
 *   snapshotAuditChain(orgId, asOf?, n?)   → last N audit entries
 *                                            relative to asOf
 */

import "server-only";

import { prisma } from "@/lib/prisma";
import { safeLog } from "@/lib/verity/utils/redaction";

// ─── Public types ──────────────────────────────────────────────────────────

export interface OperatorProfileSnapshot {
  organizationId: string;
  asOf: string;
  /** Field name → most-recent value as of the asOf date. */
  fields: Record<string, FieldStateAtTime>;
  /** Telemetry. */
  meta: SnapshotMeta;
}

export interface FieldStateAtTime {
  value: unknown;
  origin: string;
  confidence: number | null;
  verificationTier: string | null;
  derivedAt: string;
  /** Was this superseded by a later derivation (relative to asOf)? */
  superseded: boolean;
}

export interface ProposalsSnapshot {
  organizationId: string;
  asOf: string;
  pending: ProposalAtTime[];
  applied: ProposalAtTime[];
  rejected: ProposalAtTime[];
  expired: ProposalAtTime[];
  meta: SnapshotMeta;
}

export interface ProposalAtTime {
  id: string;
  actionName: string;
  statusAtTime: string;
  itemId: string | null;
  rationale: string | null;
  createdAt: string;
  expiresAt: string | null;
}

export interface AuditChainSnapshot {
  organizationId: string;
  asOf: string;
  entries: AuditEntryAtTime[];
  meta: SnapshotMeta;
}

export interface AuditEntryAtTime {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  timestamp: string;
  userId: string | null;
}

export interface SnapshotMeta {
  startedAt: string;
  durationMs: number;
  rowsScanned: number;
  /** Surfaces e.g. "asOf is in the future — returning current state". */
  warnings: string[];
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * OperatorProfile state as it would have appeared on asOf.
 *
 * Walks DerivationTrace rows ordered by derivedAt DESC and keeps the
 * first entry per fieldName. Older entries are marked superseded.
 */
export async function snapshotOperatorProfile(
  organizationId: string,
  asOf?: Date,
): Promise<OperatorProfileSnapshot> {
  const startedAt = new Date().toISOString();
  const t0 = Date.now();
  const warnings: string[] = [];
  const cutoff = asOf ?? new Date();
  if (asOf && asOf.getTime() > Date.now()) {
    warnings.push("asOf is in the future — clamping to now");
  }
  const effectiveCutoff =
    asOf && asOf.getTime() <= Date.now() ? asOf : new Date();

  let rows: Array<{
    fieldName: string;
    value: string;
    origin: string;
    confidence: number | null;
    verificationTier: string | null;
    derivedAt: Date;
  }> = [];
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rows = (await (prisma as any).derivationTrace.findMany({
      where: {
        organizationId,
        entityType: "operator_profile",
        derivedAt: { lte: effectiveCutoff },
      },
      select: {
        fieldName: true,
        value: true,
        origin: true,
        confidence: true,
        verificationTier: true,
        derivedAt: true,
      },
      orderBy: { derivedAt: "desc" },
      take: 500,
    })) as typeof rows;
  } catch (err) {
    warnings.push(
      `DerivationTrace lookup soft-failed: ${err instanceof Error ? err.message : "unknown"}`,
    );
    safeLog("time-travel.operator-profile.fail", {
      organizationId,
      error: err instanceof Error ? err.message : "unknown",
    });
  }

  const fields: Record<string, FieldStateAtTime> = {};
  const seen = new Set<string>();
  for (const row of rows) {
    const isMostRecent = !seen.has(row.fieldName);
    if (isMostRecent) {
      seen.add(row.fieldName);
      fields[row.fieldName] = {
        value: parseValue(row.value),
        origin: row.origin,
        confidence: row.confidence,
        verificationTier: row.verificationTier,
        derivedAt: row.derivedAt.toISOString(),
        superseded: false,
      };
    }
  }

  return {
    organizationId,
    asOf: effectiveCutoff.toISOString(),
    fields,
    meta: {
      startedAt,
      durationMs: Date.now() - t0,
      rowsScanned: rows.length,
      warnings,
    },
  };
}

/**
 * AstraProposal state as it would have appeared on asOf.
 *
 * A proposal is bucketed by what its status WOULD have been at the
 * asOf time:
 *   - PENDING if createdAt ≤ asOf < expiresAt and updatedAt ≤ asOf
 *   - APPLIED / REJECTED if updatedAt ≤ asOf and status reflects that
 *   - EXPIRED if expiresAt ≤ asOf and never resolved by then
 */
export async function snapshotProposals(
  organizationId: string,
  asOf?: Date,
): Promise<ProposalsSnapshot> {
  const startedAt = new Date().toISOString();
  const t0 = Date.now();
  const warnings: string[] = [];
  const effectiveCutoff =
    asOf && asOf.getTime() <= Date.now() ? asOf : new Date();

  let proposals: Array<{
    id: string;
    actionName: string;
    status: string;
    itemId: string | null;
    rationale: string | null;
    createdAt: Date;
    updatedAt: Date;
    expiresAt: Date | null;
    userId: string | null;
  }> = [];
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    proposals = (await (prisma as any).astraProposal.findMany({
      where: {
        createdAt: { lte: effectiveCutoff },
        user: {
          organizationMemberships: { some: { organizationId } },
        },
      },
      select: {
        id: true,
        actionName: true,
        status: true,
        itemId: true,
        rationale: true,
        createdAt: true,
        updatedAt: true,
        expiresAt: true,
        userId: true,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    })) as typeof proposals;
  } catch (err) {
    warnings.push(
      `AstraProposal lookup soft-failed: ${err instanceof Error ? err.message : "unknown"}`,
    );
  }

  const buckets = {
    pending: [] as ProposalAtTime[],
    applied: [] as ProposalAtTime[],
    rejected: [] as ProposalAtTime[],
    expired: [] as ProposalAtTime[],
  };

  for (const p of proposals) {
    const statusAtTime = computeProposalStatusAt(
      p.status,
      p.createdAt,
      p.updatedAt,
      p.expiresAt,
      effectiveCutoff,
    );
    const entry: ProposalAtTime = {
      id: p.id,
      actionName: p.actionName,
      statusAtTime,
      itemId: p.itemId,
      rationale: p.rationale,
      createdAt: p.createdAt.toISOString(),
      expiresAt: p.expiresAt?.toISOString() ?? null,
    };
    if (statusAtTime === "PENDING") buckets.pending.push(entry);
    else if (statusAtTime === "APPLIED") buckets.applied.push(entry);
    else if (statusAtTime === "REJECTED") buckets.rejected.push(entry);
    else if (statusAtTime === "EXPIRED") buckets.expired.push(entry);
  }

  return {
    organizationId,
    asOf: effectiveCutoff.toISOString(),
    ...buckets,
    meta: {
      startedAt,
      durationMs: Date.now() - t0,
      rowsScanned: proposals.length,
      warnings,
    },
  };
}

/**
 * Audit chain entries as of asOf. Useful for "show me everything that
 * had happened by date X" — particularly for regulator audits asking
 * "prove your state on day Y".
 */
export async function snapshotAuditChain(
  organizationId: string,
  asOf?: Date,
  n: number = 50,
): Promise<AuditChainSnapshot> {
  const startedAt = new Date().toISOString();
  const t0 = Date.now();
  const warnings: string[] = [];
  const effectiveCutoff =
    asOf && asOf.getTime() <= Date.now() ? asOf : new Date();
  const limit = Math.max(1, Math.min(n, 500));

  let rows: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    timestamp: Date;
    userId: string | null;
  }> = [];
  try {
    rows = (await prisma.auditLog.findMany({
      where: {
        organizationId,
        timestamp: { lte: effectiveCutoff },
      },
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        timestamp: true,
        userId: true,
      },
      orderBy: { timestamp: "desc" },
      take: limit,
    })) as typeof rows;
  } catch (err) {
    warnings.push(
      `AuditLog lookup soft-failed: ${err instanceof Error ? err.message : "unknown"}`,
    );
  }

  return {
    organizationId,
    asOf: effectiveCutoff.toISOString(),
    entries: rows.map((r) => ({
      id: r.id,
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      timestamp: r.timestamp.toISOString(),
      userId: r.userId,
    })),
    meta: {
      startedAt,
      durationMs: Date.now() - t0,
      rowsScanned: rows.length,
      warnings,
    },
  };
}

// ─── Internals ─────────────────────────────────────────────────────────────

function parseValue(s: string): unknown {
  if (s === "null") return null;
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

function computeProposalStatusAt(
  currentStatus: string,
  createdAt: Date,
  updatedAt: Date,
  expiresAt: Date | null,
  asOf: Date,
): string {
  // If the current status (final) update was before asOf, that status holds.
  if (updatedAt.getTime() <= asOf.getTime() && currentStatus !== "PENDING") {
    return currentStatus;
  }
  // If expiresAt has passed by asOf and still PENDING, treat as EXPIRED for
  // the snapshot view (this matches the lifecycle cron's behavior).
  if (
    expiresAt &&
    expiresAt.getTime() <= asOf.getTime() &&
    currentStatus === "PENDING"
  ) {
    return "EXPIRED";
  }
  // Otherwise: if created by asOf, it was PENDING at asOf.
  if (createdAt.getTime() <= asOf.getTime()) {
    return "PENDING";
  }
  return "NOT_YET_EXISTING";
}
