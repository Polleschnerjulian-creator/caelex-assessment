import "server-only";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Legal-Network — matter authorisation middleware.
 *
 * This is the single chokepoint for all Atlas-initiated access to
 * operator data. Any route handler that reads or exports operator-
 * owned resources MUST go through `requireActiveMatter`. Phase 1
 * establishes the seam; Phase 3 hooks the data layer into it.
 *
 * The contract:
 *   - Given a matterId and a required (category, permission) check,
 *     return the active LegalMatter if all conditions hold.
 *   - On any failure — missing matter, wrong caller org, inactive
 *     status, expired window, scope-insufficient — throw a typed
 *     error that the route handler maps to an HTTP response.
 *   - On success, emit a LegalMatterAccessLog entry with a correctly
 *     hash-chained `entryHash`.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { prisma } from "@/lib/prisma";
import { computeAccessLogEntryHash } from "./handshake";
import {
  scopeAuthorizes,
  ScopeSchema,
  type ScopeCategory,
  type ScopeItem,
  type ScopePermission,
} from "./scope";
import type {
  LegalMatter,
  LegalMatterAction,
  NetworkSide,
} from "@prisma/client";

// ─── Error types ──────────────────────────────────────────────────────

export type MatterAccessErrorCode =
  | "MATTER_NOT_FOUND"
  | "MATTER_NOT_ACTIVE"
  | "MATTER_EXPIRED"
  | "CALLER_NOT_PARTY"
  | "SCOPE_INSUFFICIENT";

export class MatterAccessError extends Error {
  constructor(
    public readonly code: MatterAccessErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "MatterAccessError";
  }
}

// ─── Check parameters ─────────────────────────────────────────────────

export interface RequireActiveMatterInput {
  matterId: string;
  /** The org that's asking — should be one of the two parties on the matter. */
  callerOrgId: string;
  /** Which side of the network the caller is on. */
  callerSide: NetworkSide;
  /** What category of data they want to touch. */
  category: ScopeCategory;
  /** What permission they need on that category. */
  permission: ScopePermission;
}

// ─── The check ────────────────────────────────────────────────────────

export async function requireActiveMatter(
  input: RequireActiveMatterInput,
): Promise<{ matter: LegalMatter; scope: ScopeItem[] }> {
  const matter = await prisma.legalMatter.findUnique({
    where: { id: input.matterId },
  });

  if (!matter) {
    throw new MatterAccessError("MATTER_NOT_FOUND", "Matter does not exist");
  }

  // Caller must be one of the two parties. A law firm is never
  // allowed to act on behalf of a client it doesn't represent; an
  // operator's access through this path is for introspection (e.g.
  // the audit-log viewer).
  const isFirm =
    input.callerSide === "ATLAS" && matter.lawFirmOrgId === input.callerOrgId;
  const isClient =
    input.callerSide === "CAELEX" && matter.clientOrgId === input.callerOrgId;
  if (!isFirm && !isClient) {
    throw new MatterAccessError(
      "CALLER_NOT_PARTY",
      "Caller organisation is not a party to this matter",
    );
  }

  if (matter.status !== "ACTIVE") {
    throw new MatterAccessError(
      "MATTER_NOT_ACTIVE",
      `Matter status is ${matter.status}, not ACTIVE`,
    );
  }

  if (matter.effectiveUntil && matter.effectiveUntil.getTime() < Date.now()) {
    throw new MatterAccessError(
      "MATTER_EXPIRED",
      "Matter has passed its effectiveUntil window",
    );
  }

  // The scope check applies only to law-firm-initiated reads of client
  // data. An operator inspecting their own matter doesn't need to be
  // inside the scope — they're looking AT the scope from the outside.
  const scopeParse = ScopeSchema.safeParse(matter.scope);
  if (!scopeParse.success) {
    throw new MatterAccessError(
      "SCOPE_INSUFFICIENT",
      "Stored scope failed schema validation",
    );
  }

  if (isFirm) {
    if (!scopeAuthorizes(scopeParse.data, input.category, input.permission)) {
      throw new MatterAccessError(
        "SCOPE_INSUFFICIENT",
        `Scope does not grant ${input.permission} on ${input.category}`,
      );
    }
  }

  return { matter, scope: scopeParse.data };
}

// ─── Audit-log writer ─────────────────────────────────────────────────
//
// Pair with the check: on successful access, emit an audit-log entry
// that hash-chains off the matter's current log head (or the
// handshakeHash for the first entry ever).

export interface EmitAccessLogInput {
  matter: LegalMatter;
  actorUserId: string | null;
  actorOrgId: string;
  actorSide: NetworkSide;
  action: LegalMatterAction;
  resourceType: string;
  resourceId?: string | null;
  matterScope: ScopeCategory;
  context?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function emitAccessLog(input: EmitAccessLogInput): Promise<void> {
  // Find the current chain head: last entry for this matter, or the
  // matter's handshakeHash if this is the first one ever.
  const lastEntry = await prisma.legalMatterAccessLog.findFirst({
    where: { matterId: input.matter.id },
    orderBy: { createdAt: "desc" },
    select: { entryHash: true },
  });
  // For STANDALONE matters handshakeHash is null until Promote — anchor
  // the chain at a deterministic per-matter sentinel so `previousHash`
  // never canonicalises to JSON null.
  const previousHash =
    lastEntry?.entryHash ??
    input.matter.handshakeHash ??
    `standalone-anchor:${input.matter.id}`;

  const createdAt = new Date();

  const entryHash = computeAccessLogEntryHash({
    previousHash,
    matterId: input.matter.id,
    actorUserId: input.actorUserId,
    actorOrgId: input.actorOrgId,
    actorSide: input.actorSide,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId ?? null,
    matterScope: input.matterScope,
    context: input.context ?? null,
    createdAt,
  });

  await prisma.legalMatterAccessLog.create({
    data: {
      matterId: input.matter.id,
      actorUserId: input.actorUserId,
      actorOrgId: input.actorOrgId,
      actorSide: input.actorSide,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId ?? null,
      matterScope: input.matterScope,
      context: (input.context ?? null) as object,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      previousHash,
      entryHash,
      createdAt,
    },
  });
}
