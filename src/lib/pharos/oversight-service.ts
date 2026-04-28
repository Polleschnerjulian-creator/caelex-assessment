import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Pharos Oversight Service — bilateral lifecycle für Behörden-Operator-
 * Aufsichtsbeziehungen. Mirrors the LegalMatter service in
 * @/lib/legal-network/matter-service, with Pharos-specific semantics
 * (Mandatory Disclosure Floor non-negotiable, authority initiates).
 *
 * Operations
 *   - initiateOversight  — Behörde startet Aufsicht (status: PENDING_OPERATOR_ACCEPT)
 *   - previewOversightInvite — Operator sieht den Invite vor Accept
 *   - acceptOversight    — Operator akzeptiert MDF + amenden VDF
 *   - disputeOversight   — Operator widerspricht (Eskalation)
 *   - endOversight       — Behörde beendet (CLOSED / REVOKED)
 *   - emitOversightAccessLog — hash-chain audit entry
 *
 * Reuse: hashToken, mintInviteToken, isExpired aus
 * @/lib/legal-network/tokens (kryptografisch identisch). Nur die
 * Bundle-Form ist Pharos-spezifisch (siehe ./handshake.ts).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { prisma } from "@/lib/prisma";
import type {
  OversightStatus,
  OversightAccessAction,
  Prisma,
} from "@prisma/client";
import { ScopeSchema, type ScopeItem } from "@/lib/legal-network/scope";
import {
  mintInviteToken,
  hashToken,
  isExpired,
} from "@/lib/legal-network/tokens";
import {
  computeOversightHandshakeHash,
  computeOversightAccessLogEntryHash,
  type OversightHandshakeBundle,
} from "./handshake";
import { OversightScopeSchema, vdfAmendmentIsValid } from "./oversight-scope";
import { logger } from "@/lib/logger";

/**
 * Custom error class so callers can map service-level error codes to
 * HTTP statuses without leaking internal Prisma details.
 */
export class OversightServiceError extends Error {
  constructor(
    public readonly code:
      | "AUTHORITY_NOT_FOUND"
      | "OPERATOR_NOT_FOUND"
      | "OPERATOR_INACTIVE"
      | "INVALID_SCOPE"
      | "ALREADY_EXISTS"
      | "INVITE_TOKEN_EXPIRED"
      | "INVITE_TOKEN_INVALID"
      | "OVERSIGHT_NOT_FOUND"
      | "OVERSIGHT_WRONG_STATE"
      | "VDF_AMENDMENT_INVALID"
      | "NOT_AUTHORIZED",
    message: string,
  ) {
    super(message);
    this.name = "OversightServiceError";
  }
}

const DEFAULT_DURATION_MONTHS = 12;
const TOKEN_EXPIRY_HOURS = 168; // 7 days — Behörden brauchen Bearbeitungszeit

/**
 * Initiate a new oversight. Authority creates an OversightRelationship
 * in PENDING_OPERATOR_ACCEPT status and gets back a one-time accept-
 * token (raw) to send to the operator. The hash of that token is stored
 * on the row; the raw token is never persisted.
 */
export async function initiateOversight(input: {
  authorityProfileId: string;
  operatorOrgId: string;
  oversightTitle: string;
  oversightReference?: string;
  legalReference: string;
  mandatoryDisclosure: ScopeItem[];
  voluntaryDisclosure?: ScopeItem[];
  durationMonths?: number;
  initiatedBy: string;
}): Promise<{ oversightId: string; rawAcceptToken: string; expiresAt: Date }> {
  // Validate scope shape upfront so we don't write garbage to DB
  const parsed = OversightScopeSchema.safeParse({
    mandatoryDisclosure: input.mandatoryDisclosure,
    voluntaryDisclosure: input.voluntaryDisclosure ?? [],
  });
  if (!parsed.success) {
    throw new OversightServiceError(
      "INVALID_SCOPE",
      `Scope validation failed: ${parsed.error.message}`,
    );
  }

  // Sanity: authority profile + operator must exist + active
  const [authorityProfile, operatorOrg] = await Promise.all([
    prisma.authorityProfile.findUnique({
      where: { id: input.authorityProfileId },
      select: { id: true, organizationId: true, authorityType: true },
    }),
    prisma.organization.findUnique({
      where: { id: input.operatorOrgId },
      select: { id: true, isActive: true, name: true },
    }),
  ]);

  if (!authorityProfile) {
    throw new OversightServiceError(
      "AUTHORITY_NOT_FOUND",
      "Authority profile not found",
    );
  }
  if (!operatorOrg || !operatorOrg.isActive) {
    throw new OversightServiceError(
      "OPERATOR_NOT_FOUND",
      "Operator organisation not found or inactive",
    );
  }

  // Check for existing oversight with same reference
  if (input.oversightReference) {
    const existing = await prisma.oversightRelationship.findFirst({
      where: {
        authorityProfileId: input.authorityProfileId,
        operatorOrgId: input.operatorOrgId,
        oversightReference: input.oversightReference,
      },
      select: { id: true, status: true },
    });
    if (
      existing &&
      existing.status !== "REVOKED" &&
      existing.status !== "CLOSED"
    ) {
      throw new OversightServiceError(
        "ALREADY_EXISTS",
        `An oversight with reference ${input.oversightReference} already exists in active state`,
      );
    }
  }

  const token = mintInviteToken();
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  // Create the row in PENDING state. handshakeHash gets computed at
  // ACCEPT time (uses acceptedBy + acceptedAt as inputs); we still
  // need a placeholder for the NOT NULL constraint — set it to a
  // pre-accept marker that gets overwritten on accept.
  const placeholderHash = computeOversightHandshakeHash({
    oversightId: "pending",
    authorityProfileId: input.authorityProfileId,
    operatorOrgId: input.operatorOrgId,
    mandatoryDisclosure: parsed.data.mandatoryDisclosure,
    voluntaryDisclosure: parsed.data.voluntaryDisclosure,
    effectiveFrom: new Date(0),
    effectiveUntil: new Date(0),
    initiatedBy: input.initiatedBy,
    acceptedBy: "pending",
    acceptedAt: new Date(0),
    legalReference: input.legalReference,
  });

  const created = await prisma.oversightRelationship.create({
    data: {
      authorityProfileId: input.authorityProfileId,
      operatorOrgId: input.operatorOrgId,
      oversightTitle: input.oversightTitle,
      oversightReference: input.oversightReference,
      legalReference: input.legalReference,
      mandatoryDisclosure: parsed.data
        .mandatoryDisclosure as Prisma.InputJsonValue,
      voluntaryDisclosure: parsed.data
        .voluntaryDisclosure as Prisma.InputJsonValue,
      status: "PENDING_OPERATOR_ACCEPT",
      initiatedBy: input.initiatedBy,
      handshakeHash: placeholderHash,
      acceptanceTokenHash: hashToken(token.raw),
      acceptanceTokenExpiresAt: expiresAt,
    },
    select: { id: true },
  });

  // Audit-log: oversight initiated event. previousHash = placeholder
  // (we'll re-root the chain at accept time to handshakeHash).
  await emitOversightAccessLog({
    oversightId: created.id,
    actorUserId: input.initiatedBy,
    actorOrgId: authorityProfile.organizationId,
    action: "OVERSIGHT_INITIATED",
    resourceType: "OversightRelationship",
    resourceId: created.id,
    matterScope: "AUDIT_LOGS",
    context: {
      oversightTitle: input.oversightTitle,
      legalReference: input.legalReference,
      mdfCategoryCount: parsed.data.mandatoryDisclosure.length,
      vdfCategoryCount: parsed.data.voluntaryDisclosure.length,
    },
    rootHash: placeholderHash,
  });

  return {
    oversightId: created.id,
    rawAcceptToken: token.raw,
    expiresAt,
  };
}

/**
 * Preview the oversight invitation (operator-side) before accept.
 * Returns the MDF, the proposed VDF, and the lifecycle metadata so
 * the operator can decide whether to accept, dispute, or amend VDF.
 */
export async function previewOversightInvite(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  const oversight = await prisma.oversightRelationship.findUnique({
    where: { acceptanceTokenHash: tokenHash },
    include: {
      authorityProfile: {
        include: {
          organization: { select: { id: true, name: true, slug: true } },
        },
      },
      operatorOrg: { select: { id: true, name: true, slug: true } },
    },
  });

  if (!oversight) {
    throw new OversightServiceError(
      "INVITE_TOKEN_INVALID",
      "Token unbekannt oder bereits konsumiert",
    );
  }

  if (
    oversight.acceptanceTokenExpiresAt &&
    isExpired(oversight.acceptanceTokenExpiresAt)
  ) {
    throw new OversightServiceError(
      "INVITE_TOKEN_EXPIRED",
      "Token ist abgelaufen — Behörde muss neu initiieren",
    );
  }

  if (oversight.status !== "PENDING_OPERATOR_ACCEPT") {
    throw new OversightServiceError(
      "OVERSIGHT_WRONG_STATE",
      `Oversight is in state ${oversight.status}, not awaiting accept`,
    );
  }

  return {
    oversight: {
      id: oversight.id,
      oversightTitle: oversight.oversightTitle,
      oversightReference: oversight.oversightReference,
      legalReference: oversight.legalReference,
      mandatoryDisclosure: oversight.mandatoryDisclosure as ScopeItem[],
      voluntaryDisclosure: oversight.voluntaryDisclosure as ScopeItem[],
      initiatedAt: oversight.initiatedAt,
      expiresAt: oversight.acceptanceTokenExpiresAt,
    },
    authority: {
      id: oversight.authorityProfile.organization.id,
      name: oversight.authorityProfile.organization.name,
      authorityType: oversight.authorityProfile.authorityType,
      jurisdiction: oversight.authorityProfile.jurisdiction,
    },
    operator: oversight.operatorOrg,
  };
}

/**
 * Operator accepts an oversight invite. Optionally amends VDF (cannot
 * touch MDF). Computes the final handshakeHash and rolls forward the
 * audit chain to root at it.
 */
export async function acceptOversight(input: {
  rawToken: string;
  acceptedBy: string;
  acceptingOrgId: string;
  amendedVoluntaryDisclosure?: ScopeItem[];
}): Promise<{ oversightId: string; handshakeHash: string }> {
  const tokenHash = hashToken(input.rawToken);
  const oversight = await prisma.oversightRelationship.findUnique({
    where: { acceptanceTokenHash: tokenHash },
  });

  if (!oversight) {
    throw new OversightServiceError("INVITE_TOKEN_INVALID", "Token unbekannt");
  }

  if (
    oversight.acceptanceTokenExpiresAt &&
    isExpired(oversight.acceptanceTokenExpiresAt)
  ) {
    throw new OversightServiceError("INVITE_TOKEN_EXPIRED", "Token abgelaufen");
  }

  if (oversight.status !== "PENDING_OPERATOR_ACCEPT") {
    throw new OversightServiceError(
      "OVERSIGHT_WRONG_STATE",
      `Cannot accept — current state: ${oversight.status}`,
    );
  }

  if (oversight.operatorOrgId !== input.acceptingOrgId) {
    throw new OversightServiceError(
      "NOT_AUTHORIZED",
      "Caller's org is not the operator on this oversight",
    );
  }

  const mdf = oversight.mandatoryDisclosure as ScopeItem[];
  const finalVdf =
    input.amendedVoluntaryDisclosure ??
    (oversight.voluntaryDisclosure as ScopeItem[]);

  // Validate amended VDF
  const vdfCheck = vdfAmendmentIsValid(mdf, finalVdf);
  if (!vdfCheck.valid) {
    throw new OversightServiceError(
      "VDF_AMENDMENT_INVALID",
      vdfCheck.reason ?? "VDF amendment invalid",
    );
  }

  // Compute effective window
  const now = new Date();
  const effectiveFrom = now;
  const effectiveUntil = new Date(now);
  effectiveUntil.setMonth(effectiveUntil.getMonth() + DEFAULT_DURATION_MONTHS);

  // Compute final handshake hash
  const bundle: OversightHandshakeBundle = {
    oversightId: oversight.id,
    authorityProfileId: oversight.authorityProfileId,
    operatorOrgId: oversight.operatorOrgId,
    mandatoryDisclosure: mdf,
    voluntaryDisclosure: finalVdf,
    effectiveFrom,
    effectiveUntil,
    initiatedBy: oversight.initiatedBy,
    acceptedBy: input.acceptedBy,
    acceptedAt: now,
    legalReference: oversight.legalReference,
  };
  const handshakeHash = computeOversightHandshakeHash(bundle);

  const updated = await prisma.oversightRelationship.update({
    where: { id: oversight.id },
    data: {
      status: "ACTIVE",
      acceptedAt: now,
      acceptedBy: input.acceptedBy,
      voluntaryDisclosure: finalVdf as Prisma.InputJsonValue,
      effectiveFrom,
      effectiveUntil,
      handshakeHash,
      // Burn the token — single-use
      acceptanceTokenHash: null,
      acceptanceTokenExpiresAt: null,
    },
    select: { id: true, handshakeHash: true },
  });
  // Map prisma result shape to the function's promised return shape
  const returnValue = {
    oversightId: updated.id,
    handshakeHash: updated.handshakeHash,
  };

  await emitOversightAccessLog({
    oversightId: oversight.id,
    actorUserId: input.acceptedBy,
    actorOrgId: input.acceptingOrgId,
    action: "OVERSIGHT_ACCEPTED",
    resourceType: "OversightRelationship",
    resourceId: oversight.id,
    matterScope: "AUDIT_LOGS",
    context: {
      effectiveFrom: effectiveFrom.toISOString(),
      effectiveUntil: effectiveUntil.toISOString(),
      vdfAmended: input.amendedVoluntaryDisclosure ? true : false,
    },
    rootHash: handshakeHash,
  });

  return returnValue;
}

/**
 * Operator disputes the oversight (e.g. believes MDF exceeds gesetzliche
 * Pflicht). Status → DISPUTED, kein Accept, Audit-Eintrag.
 */
export async function disputeOversight(input: {
  oversightId: string;
  disputingOrgId: string;
  disputingUserId: string;
  reason: string;
}) {
  const oversight = await prisma.oversightRelationship.findUnique({
    where: { id: input.oversightId },
  });
  if (!oversight) {
    throw new OversightServiceError(
      "OVERSIGHT_NOT_FOUND",
      "Oversight not found",
    );
  }
  if (oversight.operatorOrgId !== input.disputingOrgId) {
    throw new OversightServiceError(
      "NOT_AUTHORIZED",
      "Only the operator-org may dispute its own oversight",
    );
  }
  if (
    oversight.status !== "PENDING_OPERATOR_ACCEPT" &&
    oversight.status !== "ACTIVE"
  ) {
    throw new OversightServiceError(
      "OVERSIGHT_WRONG_STATE",
      `Cannot dispute — current state: ${oversight.status}`,
    );
  }

  const updated = await prisma.oversightRelationship.update({
    where: { id: input.oversightId },
    data: {
      status: "DISPUTED",
      disputedAt: new Date(),
      disputeReason: input.reason,
    },
    select: { id: true, status: true },
  });

  await emitOversightAccessLog({
    oversightId: oversight.id,
    actorUserId: input.disputingUserId,
    actorOrgId: input.disputingOrgId,
    action: "OVERSIGHT_DISPUTED",
    resourceType: "OversightRelationship",
    resourceId: oversight.id,
    matterScope: "AUDIT_LOGS",
    context: { reason: input.reason },
  });

  return updated;
}

/**
 * Authority-side ends the oversight. Variants:
 *   - status = CLOSED → normal Beendigung
 *   - status = REVOKED → außerordentlich (z.B. Misuse)
 *   - status = SUSPENDED → temporär pausiert
 */
export async function setOversightStatus(input: {
  oversightId: string;
  nextStatus: "CLOSED" | "REVOKED" | "SUSPENDED" | "ACTIVE";
  actingOrgId: string; // muss authority-side sein für CLOSED/REVOKED/SUSPENDED, kann beidseitig sein für ACTIVE-resume
  actingUserId: string;
  reason?: string;
}) {
  const oversight = await prisma.oversightRelationship.findUnique({
    where: { id: input.oversightId },
    include: {
      authorityProfile: { select: { organizationId: true } },
    },
  });
  if (!oversight) {
    throw new OversightServiceError(
      "OVERSIGHT_NOT_FOUND",
      "Oversight not found",
    );
  }
  // Only authority-side can change status (operator can only dispute)
  if (oversight.authorityProfile.organizationId !== input.actingOrgId) {
    throw new OversightServiceError(
      "NOT_AUTHORIZED",
      "Only the authority-org may change oversight status",
    );
  }

  const updated = await prisma.oversightRelationship.update({
    where: { id: input.oversightId },
    data: {
      status: input.nextStatus as OversightStatus,
      ...(input.nextStatus === "CLOSED" || input.nextStatus === "REVOKED"
        ? {
            endedAt: new Date(),
            endedBy: input.actingUserId,
            endReason: input.reason ?? null,
          }
        : {}),
    },
    select: { id: true, status: true },
  });

  const action: OversightAccessAction =
    input.nextStatus === "CLOSED"
      ? "OVERSIGHT_CLOSED"
      : input.nextStatus === "REVOKED"
        ? "OVERSIGHT_REVOKED"
        : input.nextStatus === "SUSPENDED"
          ? "OVERSIGHT_SUSPENDED"
          : "OVERSIGHT_RESUMED";

  await emitOversightAccessLog({
    oversightId: oversight.id,
    actorUserId: input.actingUserId,
    actorOrgId: input.actingOrgId,
    action,
    resourceType: "OversightRelationship",
    resourceId: oversight.id,
    matterScope: "AUDIT_LOGS",
    context: { reason: input.reason ?? null },
  });

  return updated;
}

/**
 * Append an entry to the OversightAccessLog hash-chain. Identical
 * pattern to legal-network/require-matter#emitAccessLog.
 *
 * On the FIRST entry of a chain, previousHash is the relationship's
 * handshakeHash (passed as `rootHash`). For all subsequent entries it
 * comes from the previous log entry's entryHash.
 */
export async function emitOversightAccessLog(input: {
  oversightId: string;
  actorUserId: string | null;
  actorOrgId: string;
  action: OversightAccessAction;
  resourceType: string;
  resourceId?: string | null;
  matterScope: string;
  context?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
  /** Optional: handshakeHash to use as root for first entries. If
   *  omitted, the prior log entry's entryHash is fetched. */
  rootHash?: string;
}) {
  // Lookup the prior chain head — either provided rootHash, or the
  // most recent log entry's entryHash, or fall back to the relationship's
  // handshakeHash.
  let previousHash: string;
  if (input.rootHash) {
    previousHash = input.rootHash;
  } else {
    const prior = await prisma.oversightAccessLog.findFirst({
      where: { oversightId: input.oversightId },
      orderBy: { createdAt: "desc" },
      select: { entryHash: true },
    });
    if (prior) {
      previousHash = prior.entryHash;
    } else {
      const ov = await prisma.oversightRelationship.findUnique({
        where: { id: input.oversightId },
        select: { handshakeHash: true },
      });
      if (!ov) {
        throw new OversightServiceError(
          "OVERSIGHT_NOT_FOUND",
          "Cannot emit log — oversight not found",
        );
      }
      previousHash = ov.handshakeHash;
    }
  }

  const createdAt = new Date();
  const entryHash = computeOversightAccessLogEntryHash({
    previousHash,
    oversightId: input.oversightId,
    actorUserId: input.actorUserId,
    actorOrgId: input.actorOrgId,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId ?? null,
    matterScope: input.matterScope,
    context: input.context,
    createdAt,
  });

  try {
    await prisma.oversightAccessLog.create({
      data: {
        oversightId: input.oversightId,
        actorUserId: input.actorUserId,
        actorOrgId: input.actorOrgId,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        matterScope: input.matterScope,
        context: input.context as Prisma.InputJsonValue,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        previousHash,
        entryHash,
        createdAt,
      },
    });
  } catch (err) {
    // Audit log writes are best-effort but failures should be loud
    logger.error(
      `OversightAccessLog write failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    throw err;
  }
}

/**
 * List active oversights for an authority. Used by the Pharos
 * operator-roster view.
 */
export async function listOversightsByAuthority(
  authorityProfileId: string,
  opts: { statuses?: OversightStatus[] } = {},
) {
  const statuses = opts.statuses ?? [
    "ACTIVE",
    "PENDING_OPERATOR_ACCEPT",
    "DISPUTED",
  ];
  return prisma.oversightRelationship.findMany({
    where: {
      authorityProfileId,
      status: { in: statuses },
    },
    include: {
      operatorOrg: {
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          isActive: true,
        },
      },
      _count: { select: { accessLogs: true } },
    },
    orderBy: { initiatedAt: "desc" },
  });
}

/**
 * List oversights for an operator. Used by the operator-side
 * /dashboard/network/oversight view.
 */
export async function listOversightsByOperator(operatorOrgId: string) {
  return prisma.oversightRelationship.findMany({
    where: { operatorOrgId },
    include: {
      authorityProfile: {
        include: {
          organization: { select: { id: true, name: true, logoUrl: true } },
        },
      },
      _count: { select: { accessLogs: true } },
    },
    orderBy: { initiatedAt: "desc" },
  });
}
