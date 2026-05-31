import "server-only";
import { prisma } from "@/lib/prisma";
import {
  type TradeSammelgenehmigung,
  type TradeSammelgenehmigungStatus,
  type TradeSammelgenehmigungDrawDown,
} from "@prisma/client";

/**
 * Caelex Trade — Sammelgenehmigung (BAFA bulk-export-authorization)
 * service (Z11, Tier 5).
 *
 * A Sammelgenehmigung covers multiple shipments of the same goods to
 * the same end-user(s) over a defined validity window (typically
 * 12-24 months), replacing the need for per-shipment Einzelgenehmigung
 * licences.
 *
 * Functional surface:
 *   - createSammelgenehmigung(input) — open a new DRAFT row.
 *   - activateSammelgenehmigung(id) — DRAFT → ACTIVE after BAFA grant.
 *   - recordDrawDown(id, operationId, valueEur) — debit the capacity
 *     ledger; auto-flips to EXHAUSTED when cap is reached.
 *   - getAvailableCapacity(id) — totalValueCap − drawnDownValue, EUR.
 *   - findCoveringSammelgenehmigungen(orgId, criteria) — soft helper
 *     for the operations engine: returns ACTIVE SAGs whose ECCN /
 *     destination / end-user filters match an operation.
 *   - listExpiring(orgId, days) — for the reminder cron.
 *   - markExpiredByCron(now) — bulk transition ACTIVE → EXPIRED.
 *   - revokeSammelgenehmigung(id, userId, reason) — manual override.
 *
 * All reads are org-scoped — the caller passes orgId resolved from the
 * session and the service refuses to fetch rows outside that boundary.
 *
 * Sources:
 *   - § 7 AWG (Außenwirtschaftsgesetz)
 *   - § 8 AWV (Außenwirtschaftsverordnung)
 *   - 19. AWV-ÄndVO 2024 (current allowance scope)
 *   - Art. 12 EU 2021/821 (EU framework underpinning national SAGs)
 *   - BAFA "Merkblatt zur Sammelausfuhrgenehmigung"
 */

// ─── Types ──────────────────────────────────────────────────────────

export type SammelgenehmigungWithRelations = TradeSammelgenehmigung & {
  allowedEndUsers: Array<{
    id: string;
    canonicalName: string;
    countryCode: string;
  }>;
  drawDowns: TradeSammelgenehmigungDrawDown[];
};

export interface SammelgenehmigungCreateInput {
  organizationId: string;
  title: string;
  bafaReference?: string | null;
  validFrom: Date;
  validUntil: Date;
  allowedECCNs?: string[];
  allowedDestinations?: string[];
  allowedEndUserIds?: string[];
  totalValueCapEur: number;
  grantDocumentId?: string | null;
  notes?: string | null;
  lastActionById: string;
}

export interface SammelgenehmigungActivateInput {
  organizationId: string;
  sammelgenehmigungId: string;
  bafaReference: string;
  lastActionById: string;
}

export interface DrawDownInput {
  organizationId: string;
  sammelgenehmigungId: string;
  operationId: string;
  valueEur: number;
  notes?: string | null;
}

export interface DrawDownResult {
  drawDown: TradeSammelgenehmigungDrawDown;
  remainingCapacityEur: number;
  triggeredExhausted: boolean;
}

export interface CoveringCriteria {
  eccn: string;
  destinationCountry: string;
  endUserId?: string | null;
  /** Operation value in EUR — used to filter out SAGs without capacity. */
  valueEur?: number;
}

// ─── Reads ──────────────────────────────────────────────────────────

/**
 * List Sammelgenehmigungen for an org, ordered by validUntil ascending
 * (soonest-expiring first so the UI surface tightest deadlines).
 */
export async function listSammelgenehmigungen(
  organizationId: string,
  options: { status?: TradeSammelgenehmigungStatus } = {},
): Promise<SammelgenehmigungWithRelations[]> {
  return prisma.tradeSammelgenehmigung.findMany({
    where: {
      organizationId,
      ...(options.status ? { status: options.status } : {}),
    },
    orderBy: { validUntil: "asc" },
    include: {
      allowedEndUsers: {
        select: { id: true, canonicalName: true, countryCode: true },
      },
      drawDowns: { orderBy: { drawnDownAt: "desc" } },
    },
  });
}

/**
 * Fetch one Sammelgenehmigung by id (org-scoped). Returns null when
 * the id doesn't belong to the org — callers must treat null as 404
 * to avoid leaking cross-org existence.
 */
export async function getSammelgenehmigung(
  organizationId: string,
  sammelgenehmigungId: string,
): Promise<SammelgenehmigungWithRelations | null> {
  return prisma.tradeSammelgenehmigung.findFirst({
    where: { id: sammelgenehmigungId, organizationId },
    include: {
      allowedEndUsers: {
        select: { id: true, canonicalName: true, countryCode: true },
      },
      drawDowns: { orderBy: { drawnDownAt: "desc" } },
    },
  });
}

/**
 * Available capacity = totalValueCapEur − drawnDownValueEur. Clamped
 * at 0 so we never report negative capacity (over-draw is prevented
 * by recordDrawDown, but defence in depth).
 */
export async function getAvailableCapacity(
  organizationId: string,
  sammelgenehmigungId: string,
): Promise<number | null> {
  const row = await prisma.tradeSammelgenehmigung.findFirst({
    where: { id: sammelgenehmigungId, organizationId },
    select: { totalValueCapEur: true, drawnDownValueEur: true },
  });
  if (!row) return null;
  return Math.max(0, row.totalValueCapEur - row.drawnDownValueEur);
}

/**
 * Find ACTIVE Sammelgenehmigungen that cover an operation's
 * (ECCN, destination, end-user) tuple. Used by the operations engine
 * as a "soft" helper — operations may or may not draw down against a
 * matching SAG; this just surfaces the candidates.
 *
 * Matching rules:
 *   - status must be ACTIVE (DRAFT not yet usable; EXHAUSTED / EXPIRED
 *     / REVOKED rule out coverage).
 *   - validity window covers today (validFrom ≤ now ≤ validUntil).
 *   - allowedECCNs contains the criterion ECCN (or empty list = wildcard,
 *     but we follow the strict "must list" rule because BAFA always
 *     requires explicit ECCN coverage).
 *   - allowedDestinations contains the criterion destination.
 *   - allowedEndUsers (if non-empty on the SAG) contains the criterion
 *     end-user. Empty allowedEndUsers list = "any end-user" — rare in
 *     practice but allowed for some general SAGs.
 *   - If a value is supplied, the remaining capacity must cover it.
 */
export async function findCoveringSammelgenehmigungen(
  organizationId: string,
  criteria: CoveringCriteria,
  now: Date = new Date(),
): Promise<SammelgenehmigungWithRelations[]> {
  const candidates = await prisma.tradeSammelgenehmigung.findMany({
    where: {
      organizationId,
      status: "ACTIVE",
      validFrom: { lte: now },
      validUntil: { gte: now },
      allowedECCNs: { has: criteria.eccn },
      allowedDestinations: { has: criteria.destinationCountry },
    },
    include: {
      allowedEndUsers: {
        select: { id: true, canonicalName: true, countryCode: true },
      },
      drawDowns: { orderBy: { drawnDownAt: "desc" } },
    },
  });

  return candidates.filter((sag) => {
    // End-user filter: if the SAG names end-users, the operation's
    // end-user must be in that list. Empty list = no restriction.
    if (sag.allowedEndUsers.length > 0 && criteria.endUserId) {
      const match = sag.allowedEndUsers.some(
        (eu) => eu.id === criteria.endUserId,
      );
      if (!match) return false;
    }
    // Capacity filter: if a value is supplied, remaining capacity must
    // cover it. We don't fail soft on equality — exactly-equals is
    // acceptable (draws SAG to zero remaining).
    if (criteria.valueEur !== undefined && criteria.valueEur > 0) {
      const remaining = Math.max(
        0,
        sag.totalValueCapEur - sag.drawnDownValueEur,
      );
      if (remaining < criteria.valueEur) return false;
    }
    return true;
  });
}

/**
 * List ACTIVE Sammelgenehmigungen expiring within `daysAhead` days
 * for the given org. Used by the UI dashboard widget; the cron uses
 * `listAllExpiringForCron` for the global scan.
 */
export async function listExpiring(
  organizationId: string,
  daysAhead: number,
  now: Date = new Date(),
): Promise<TradeSammelgenehmigung[]> {
  const cutoff = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  return prisma.tradeSammelgenehmigung.findMany({
    where: {
      organizationId,
      status: "ACTIVE",
      validUntil: { gte: now, lte: cutoff },
    },
    orderBy: { validUntil: "asc" },
  });
}

/**
 * Global cross-org scan of ACTIVE SAGs expiring within `daysAhead`
 * days. Used by the daily reminder cron.
 */
export async function listAllExpiringForCron(
  daysAhead: number,
  now: Date = new Date(),
): Promise<TradeSammelgenehmigung[]> {
  const cutoff = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  return prisma.tradeSammelgenehmigung.findMany({
    where: {
      status: "ACTIVE",
      validUntil: { gte: now, lte: cutoff },
    },
    orderBy: { validUntil: "asc" },
  });
}

// ─── Writes ─────────────────────────────────────────────────────────

/**
 * Create a new Sammelgenehmigung in DRAFT state. Validates that the
 * referenced end-user parties belong to the same org — defence in
 * depth against client-supplied IDs.
 */
export async function createSammelgenehmigung(
  input: SammelgenehmigungCreateInput,
): Promise<TradeSammelgenehmigung> {
  // Validity-window sanity check
  if (input.validUntil.getTime() <= input.validFrom.getTime()) {
    throw new Error("validUntil must be strictly after validFrom");
  }
  if (input.totalValueCapEur <= 0) {
    throw new Error("totalValueCapEur must be greater than zero");
  }

  // Verify all referenced end-users belong to the org
  const endUserIds = input.allowedEndUserIds ?? [];
  if (endUserIds.length > 0) {
    const parties = await prisma.tradeParty.findMany({
      where: {
        id: { in: endUserIds },
        organizationId: input.organizationId,
      },
      select: { id: true },
    });
    if (parties.length !== endUserIds.length) {
      throw new Error(
        "One or more end-user partyIds do not belong to this organisation",
      );
    }
  }

  return prisma.tradeSammelgenehmigung.create({
    data: {
      organizationId: input.organizationId,
      title: input.title,
      bafaReference: input.bafaReference ?? null,
      validFrom: input.validFrom,
      validUntil: input.validUntil,
      allowedECCNs: input.allowedECCNs ?? [],
      allowedDestinations: input.allowedDestinations ?? [],
      totalValueCapEur: input.totalValueCapEur,
      grantDocumentId: input.grantDocumentId ?? null,
      notes: input.notes ?? null,
      status: "DRAFT",
      lastActionById: input.lastActionById,
      ...(endUserIds.length > 0
        ? {
            allowedEndUsers: {
              connect: endUserIds.map((id) => ({ id })),
            },
          }
        : {}),
    },
  });
}

/**
 * Transition a DRAFT Sammelgenehmigung to ACTIVE once the BAFA grant
 * is confirmed. Refuses if the row is not DRAFT, or if mandatory
 * fields (bafaReference, allowedECCNs, allowedDestinations) are
 * missing — BAFA requires all three to be explicit on the grant.
 */
export async function activateSammelgenehmigung(
  input: SammelgenehmigungActivateInput,
): Promise<TradeSammelgenehmigung> {
  const current = await prisma.tradeSammelgenehmigung.findFirst({
    where: {
      id: input.sammelgenehmigungId,
      organizationId: input.organizationId,
    },
  });
  if (!current) {
    throw new Error("Sammelgenehmigung not found in this organisation");
  }
  if (current.status !== "DRAFT") {
    throw new Error(
      `Cannot activate Sammelgenehmigung: status is ${current.status}, not DRAFT`,
    );
  }
  if (current.allowedECCNs.length === 0) {
    throw new Error(
      "Cannot activate: allowedECCNs must list at least one code",
    );
  }
  if (current.allowedDestinations.length === 0) {
    throw new Error(
      "Cannot activate: allowedDestinations must list at least one country",
    );
  }
  if (!input.bafaReference || input.bafaReference.trim().length === 0) {
    throw new Error("Cannot activate: bafaReference is required");
  }

  return prisma.tradeSammelgenehmigung.update({
    where: { id: input.sammelgenehmigungId },
    data: {
      status: "ACTIVE",
      bafaReference: input.bafaReference.trim(),
      lastActionById: input.lastActionById,
    },
  });
}

/**
 * Record a draw-down ledger entry. Increments drawnDownValueEur on
 * the parent row in a transaction so the running total never drifts.
 * Auto-flips status to EXHAUSTED when the cap is reached or exceeded.
 *
 * Refuses:
 *   - negative or zero valueEur
 *   - SAG not in ACTIVE status (DRAFT / EXPIRED / REVOKED / EXHAUSTED)
 *   - operationId not in the org
 *   - draw-down that would exceed totalValueCapEur
 *
 * Returns the new ledger row + remaining capacity + a flag indicating
 * whether this draw-down triggered the EXHAUSTED transition.
 */
export async function recordDrawDown(
  input: DrawDownInput,
): Promise<DrawDownResult> {
  if (input.valueEur <= 0) {
    throw new Error("Draw-down value must be greater than zero");
  }

  // Verify operation belongs to the org before opening the transaction
  const operation = await prisma.tradeOperation.findFirst({
    where: { id: input.operationId, organizationId: input.organizationId },
    select: { id: true, reference: true },
  });
  if (!operation) {
    throw new Error("Operation not found in this organisation");
  }

  return prisma.$transaction(async (tx) => {
    // Read only the IMMUTABLE cap + status. totalValueCapEur never changes
    // after creation so the bound derived from it is race-safe. T-H7.
    const current = await tx.tradeSammelgenehmigung.findFirst({
      where: {
        id: input.sammelgenehmigungId,
        organizationId: input.organizationId,
      },
      select: { id: true, status: true, totalValueCapEur: true },
    });
    if (!current) {
      throw new Error("Sammelgenehmigung not found in this organisation");
    }
    if (current.status !== "ACTIVE") {
      throw new Error(
        `Cannot draw down: Sammelgenehmigung status is ${current.status}, not ACTIVE`,
      );
    }

    // ATOMIC GUARD (T-H7): increment only while drawnDownValueEur stays
    // within cap. The WHERE re-evaluates drawnDownValueEur at row-lock
    // time, so a concurrent draw that already moved the total past the
    // bound makes this match 0 rows → we reject. cap is immutable so
    // `bound` is race-safe.
    const bound = current.totalValueCapEur - input.valueEur;
    const incremented = await tx.tradeSammelgenehmigung.updateMany({
      where: {
        id: current.id,
        organizationId: input.organizationId,
        status: "ACTIVE",
        drawnDownValueEur: { lte: bound },
      },
      data: { drawnDownValueEur: { increment: input.valueEur } },
    });

    if (incremented.count === 0) {
      // Either a concurrent draw consumed the headroom, or this single
      // draw exceeds the cap. Read back to produce a precise message.
      const after = await tx.tradeSammelgenehmigung.findFirst({
        where: { id: current.id },
        select: { drawnDownValueEur: true, totalValueCapEur: true },
      });
      const wouldBe = (after?.drawnDownValueEur ?? 0) + input.valueEur;
      throw new Error(
        `Draw-down would exceed cap: ${wouldBe.toFixed(2)} EUR > ${(after?.totalValueCapEur ?? current.totalValueCapEur).toFixed(2)} EUR`,
      );
    }

    // Record the ledger entry (operation already org-verified above the tx).
    const drawDown = await tx.tradeSammelgenehmigungDrawDown.create({
      data: {
        sammelgenehmigungId: current.id,
        operationId: operation.id,
        operationReference: operation.reference,
        valueEur: input.valueEur,
        notes: input.notes ?? null,
      },
    });

    // Flip to EXHAUSTED iff the (now-updated) total reached the cap.
    // Atomic, idempotent: only matches while still ACTIVE and at/over cap.
    const exhaustedFlip = await tx.tradeSammelgenehmigung.updateMany({
      where: {
        id: current.id,
        status: "ACTIVE",
        drawnDownValueEur: { gte: current.totalValueCapEur },
      },
      data: { status: "EXHAUSTED" },
    });
    const triggeredExhausted = exhaustedFlip.count > 0;

    // Read back the authoritative remaining capacity.
    const fresh = await tx.tradeSammelgenehmigung.findFirst({
      where: { id: current.id },
      select: { drawnDownValueEur: true, totalValueCapEur: true },
    });
    const remainingCapacityEur = Math.max(
      0,
      (fresh?.totalValueCapEur ?? current.totalValueCapEur) -
        (fresh?.drawnDownValueEur ?? 0),
    );

    return { drawDown, remainingCapacityEur, triggeredExhausted };
  });
}

/**
 * Bulk-transition ACTIVE SAGs whose validUntil has passed to EXPIRED.
 * Called by the daily reminder cron. Idempotent — already-EXPIRED
 * rows are absorbing.
 *
 * Returns the count of rows transitioned.
 */
export async function markExpiredByCron(
  now: Date = new Date(),
): Promise<number> {
  const result = await prisma.tradeSammelgenehmigung.updateMany({
    where: {
      status: "ACTIVE",
      validUntil: { lt: now },
    },
    data: { status: "EXPIRED" },
  });
  return result.count;
}

/**
 * Manually revoke a Sammelgenehmigung. Refuses if the row is already
 * in a terminal state (REVOKED). EXPIRED + EXHAUSTED rows can still
 * be REVOKED for audit clarity (e.g. BAFA rescinded the grant after
 * we'd already burned through it).
 */
export async function revokeSammelgenehmigung(
  organizationId: string,
  sammelgenehmigungId: string,
  lastActionById: string,
  reason: string,
): Promise<TradeSammelgenehmigung> {
  const current = await prisma.tradeSammelgenehmigung.findFirst({
    where: { id: sammelgenehmigungId, organizationId },
  });
  if (!current) {
    throw new Error("Sammelgenehmigung not found in this organisation");
  }
  if (current.status === "REVOKED") {
    throw new Error("Sammelgenehmigung is already REVOKED");
  }
  const trimmed = reason.trim();
  if (trimmed.length === 0) {
    throw new Error("Revocation reason is required");
  }

  return prisma.tradeSammelgenehmigung.update({
    where: { id: sammelgenehmigungId },
    data: {
      status: "REVOKED",
      lastActionById,
      notes: current.notes
        ? `${current.notes}\n\n[REVOKED] ${trimmed}`
        : `[REVOKED] ${trimmed}`,
    },
  });
}
