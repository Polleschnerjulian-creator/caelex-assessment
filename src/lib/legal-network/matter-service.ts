import "server-only";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Legal-Network — matter lifecycle service.
 *
 * All DB-mutating operations (create invite, accept, reject, revoke,
 * suspend, amend scope) sit here. Route handlers stay thin and just
 * translate HTTP to service calls. Benefits:
 *   - One place to enforce state-machine invariants
 *   - One place to emit audit-log lifecycle events
 *   - Easier to unit-test without HTTP plumbing
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { prisma } from "@/lib/prisma";
import type {
  LegalMatter,
  LegalMatterInvitation,
  NetworkSide,
  MatterStatus,
  Prisma,
} from "@prisma/client";
import { computeHandshakeHash, computeAccessLogEntryHash } from "./handshake";
import { mintInviteToken, hashToken, isExpired } from "./tokens";
import { ScopeSchema, isNarrowerOrEqual, type ScopeItem } from "./scope";
import { emitAccessLog } from "./require-matter";

// ─── Errors ───────────────────────────────────────────────────────────

export type MatterServiceErrorCode =
  | "INVALID_SCOPE"
  | "COUNTERPARTY_NOT_FOUND"
  | "COUNTERPARTY_WRONG_TYPE"
  | "TOKEN_INVALID"
  | "TOKEN_CONSUMED"
  | "TOKEN_EXPIRED"
  | "MATTER_WRONG_STATE"
  | "SCOPE_WIDENED"
  | "NOT_AUTHORIZED";

export class MatterServiceError extends Error {
  constructor(
    public readonly code: MatterServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "MatterServiceError";
  }
}

// ─── Create invite ────────────────────────────────────────────────────

export interface CreateInviteInput {
  /** Org issuing the invite (the caller's org). */
  initiatorOrgId: string;
  /** User who clicked "Invite". */
  initiatorUserId: string;
  /** Which side of the network the initiator is on. */
  initiatorSide: NetworkSide;

  /** The counter-party org. For ATLAS→CAELEX invites this is an
   *  operator; for CAELEX→ATLAS invites it's a law firm. Resolved
   *  from email+type lookup in the caller. */
  counterpartyOrgId: string;

  name: string;
  reference?: string;
  description?: string;
  proposedScope: ScopeItem[];
  proposedDurationMonths?: number;
}

export interface CreateInviteResult {
  matter: LegalMatter;
  invitation: LegalMatterInvitation;
  /** Raw token — embed in the invitation email. Never persisted. */
  rawToken: string;
}

export async function createInvite(
  input: CreateInviteInput,
): Promise<CreateInviteResult> {
  const scopeParse = ScopeSchema.safeParse(input.proposedScope);
  if (!scopeParse.success) {
    throw new MatterServiceError(
      "INVALID_SCOPE",
      "Proposed scope failed schema validation",
    );
  }

  // Direction-derived identity assignment
  const lawFirmOrgId =
    input.initiatorSide === "ATLAS"
      ? input.initiatorOrgId
      : input.counterpartyOrgId;
  const clientOrgId =
    input.initiatorSide === "ATLAS"
      ? input.counterpartyOrgId
      : input.initiatorOrgId;

  // Sanity: verify the counterparty exists AND has the right org type.
  const [firm, client] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: lawFirmOrgId },
      select: { id: true, orgType: true, isActive: true, name: true },
    }),
    prisma.organization.findUnique({
      where: { id: clientOrgId },
      select: { id: true, orgType: true, isActive: true, name: true },
    }),
  ]);
  if (!firm || !firm.isActive) {
    throw new MatterServiceError(
      "COUNTERPARTY_NOT_FOUND",
      "Law firm organisation not found or inactive",
    );
  }
  if (!client || !client.isActive) {
    throw new MatterServiceError(
      "COUNTERPARTY_NOT_FOUND",
      "Client organisation not found or inactive",
    );
  }
  if (firm.orgType !== "LAW_FIRM" && firm.orgType !== "BOTH") {
    throw new MatterServiceError(
      "COUNTERPARTY_WRONG_TYPE",
      "The firm-side org is not flagged as LAW_FIRM",
    );
  }
  if (client.orgType !== "OPERATOR" && client.orgType !== "BOTH") {
    throw new MatterServiceError(
      "COUNTERPARTY_WRONG_TYPE",
      "The client-side org is not flagged as OPERATOR",
    );
  }

  const token = mintInviteToken();

  const matter = await prisma.legalMatter.create({
    data: {
      lawFirmOrgId,
      clientOrgId,
      name: input.name,
      reference: input.reference,
      description: input.description,
      scope: input.proposedScope as unknown as Prisma.InputJsonValue,
      status: "PENDING_INVITE",
      invitedBy: input.initiatorUserId,
      invitedFrom: input.initiatorSide,
      // handshakeHash is a placeholder until acceptance; we write a
      // provisional hash of the proposed bundle so we still have a
      // non-null root for the chain even if the invite is never
      // accepted (useful for audit-replay integrity).
      handshakeHash: `pending:${token.hash.slice(0, 16)}`,
    },
  });

  const invitation = await prisma.legalMatterInvitation.create({
    data: {
      matterId: matter.id,
      tokenHash: token.hash,
      expiresAt: token.expiresAt,
      proposedScope: input.proposedScope as unknown as Prisma.InputJsonValue,
      proposedDurationMonths: input.proposedDurationMonths ?? 12,
    },
  });

  return { matter, invitation, rawToken: token.raw };
}

// ─── Accept / Reject ──────────────────────────────────────────────────

export type AcceptInviteInput = InvitationLookup & {
  /** The accepting user (counter-signer). */
  acceptingUserId: string;
  acceptingOrgId: string;
  /** If the recipient wants to narrow the scope. Must be ⊆ proposed. */
  amendedScope?: ScopeItem[];
  /** Same for duration. */
  amendedDurationMonths?: number;
  ipAddress?: string | null;
  userAgent?: string | null;
};

/** Accept/reject can address the invitation by either token (for the
 *  email-link flow) OR by invitationId (for the session-authenticated
 *  inbox flow). Exactly one must be set. */
type InvitationLookup =
  | { rawToken: string; invitationId?: never }
  | { rawToken?: never; invitationId: string };

/** Look up a LegalMatterInvitation by token hash OR by id. Shared
 *  between accept + reject so both flows have identical resolution
 *  semantics regardless of entry point. */
async function resolveInvitation(lookup: InvitationLookup) {
  if (lookup.rawToken) {
    const tokenHash = hashToken(lookup.rawToken);
    return prisma.legalMatterInvitation.findUnique({
      where: { tokenHash },
      include: { matter: true },
    });
  }
  return prisma.legalMatterInvitation.findUnique({
    where: { id: lookup.invitationId },
    include: { matter: true },
  });
}

export interface AcceptInviteResult {
  matter: LegalMatter;
  /** If the recipient amended, we return PENDING_CONSENT and a NEW
   *  token for the original inviter to counter-sign. */
  counterToken?: string;
  /** ID of the new counter-invitation row. Set only on amend.
   *  Caller uses this to dispatch the counter-sign email outside
   *  the DB transaction so a Resend outage can't rollback state. */
  counterInvitationId?: string;
}

export async function acceptInvite(
  input: AcceptInviteInput,
): Promise<AcceptInviteResult> {
  const invitation = await resolveInvitation(input);
  if (!invitation) {
    throw new MatterServiceError("TOKEN_INVALID", "Invitation not found");
  }
  if (invitation.consumedAt) {
    throw new MatterServiceError(
      "TOKEN_CONSUMED",
      "Invitation has already been used",
    );
  }
  if (isExpired(invitation.expiresAt)) {
    throw new MatterServiceError("TOKEN_EXPIRED", "Invitation has expired");
  }

  const matter = invitation.matter;
  const isAmendment = invitation.amendmentOf !== null;

  // For original invitations, the counter-party (recipient) accepts.
  // For amendments, the ORIGINAL INVITER counter-signs the narrowed
  // scope — so the expected acceptor flips to the same side as the
  // matter's invitedFrom.
  const expectedAcceptorOrgId = isAmendment
    ? matter.invitedFrom === "ATLAS"
      ? matter.lawFirmOrgId
      : matter.clientOrgId
    : matter.invitedFrom === "ATLAS"
      ? matter.clientOrgId
      : matter.lawFirmOrgId;
  if (input.acceptingOrgId !== expectedAcceptorOrgId) {
    throw new MatterServiceError(
      "NOT_AUTHORIZED",
      isAmendment
        ? "Caller is not the original inviter; only they can counter-sign an amendment"
        : "Caller is not the counter-party",
    );
  }

  // Spec: 1 round of amendment maximum. The original inviter cannot
  // re-amend a counter-signing invitation — only ACCEPT or REJECT.
  if (isAmendment && input.amendedScope) {
    throw new MatterServiceError(
      "INVALID_SCOPE",
      "Cannot re-amend an amendment — only accept or reject (1 round limit)",
    );
  }
  if (
    matter.status !== "PENDING_INVITE" &&
    matter.status !== "PENDING_CONSENT"
  ) {
    throw new MatterServiceError(
      "MATTER_WRONG_STATE",
      `Matter is ${matter.status}; cannot accept`,
    );
  }

  const proposedScopeParse = ScopeSchema.safeParse(invitation.proposedScope);
  if (!proposedScopeParse.success) {
    throw new MatterServiceError(
      "INVALID_SCOPE",
      "Proposed scope in invitation failed validation",
    );
  }

  // Determine final scope: either the amendment (must be narrower)
  // or accept-as-proposed (direct ACTIVE transition).
  let finalScope = proposedScopeParse.data;
  let willAmend = false;
  if (input.amendedScope) {
    const amendedParse = ScopeSchema.safeParse(input.amendedScope);
    if (!amendedParse.success) {
      throw new MatterServiceError(
        "INVALID_SCOPE",
        "Amended scope failed validation",
      );
    }
    if (!isNarrowerOrEqual(proposedScopeParse.data, amendedParse.data)) {
      throw new MatterServiceError(
        "SCOPE_WIDENED",
        "Amended scope must be ⊆ proposed (narrowing only)",
      );
    }
    finalScope = amendedParse.data;
    // Check if it's actually different (else treat as straight accept)
    const unchanged =
      JSON.stringify(finalScope) === JSON.stringify(proposedScopeParse.data);
    willAmend = !unchanged;
  }

  const now = new Date();

  // Case A: straight accept → matter ACTIVE, compute final handshakeHash
  if (!willAmend) {
    const durationMonths = invitation.proposedDurationMonths ?? 12;
    const effectiveFrom = now;
    const effectiveUntil = new Date(
      now.getTime() + durationMonths * 30 * 24 * 3600 * 1000,
    );

    const handshakeHash = computeHandshakeHash({
      matterId: matter.id,
      lawFirmOrgId: matter.lawFirmOrgId,
      clientOrgId: matter.clientOrgId,
      scope: finalScope,
      effectiveFrom,
      effectiveUntil,
      invitedBy: matter.invitedBy,
      acceptedBy: input.acceptingUserId,
      acceptedAt: now,
    });

    const updated = await prisma.$transaction(async (tx) => {
      const m = await tx.legalMatter.update({
        where: { id: matter.id },
        data: {
          status: "ACTIVE",
          acceptedAt: now,
          acceptedBy: input.acceptingUserId,
          effectiveFrom,
          effectiveUntil,
          scope: finalScope as unknown as Prisma.InputJsonValue,
          handshakeHash,
        },
      });
      await tx.legalMatterInvitation.update({
        where: { id: invitation.id },
        data: { consumedAt: now },
      });
      return m;
    });

    return { matter: updated };
  }

  // Case B: amendment → new invitation for the original inviter
  const newToken = mintInviteToken();
  const { matter: updated, counterInvitationId } = await prisma.$transaction(
    async (tx) => {
      const m = await tx.legalMatter.update({
        where: { id: matter.id },
        data: {
          status: "PENDING_CONSENT",
          scope: finalScope as unknown as Prisma.InputJsonValue,
        },
      });
      await tx.legalMatterInvitation.update({
        where: { id: invitation.id },
        data: { consumedAt: now },
      });
      const counter = await tx.legalMatterInvitation.create({
        data: {
          matterId: matter.id,
          tokenHash: newToken.hash,
          expiresAt: newToken.expiresAt,
          proposedScope: finalScope as unknown as Prisma.InputJsonValue,
          proposedDurationMonths: input.amendedDurationMonths ?? null,
          amendmentOf: invitation.id,
        },
      });
      return { matter: m, counterInvitationId: counter.id };
    },
  );

  return {
    matter: updated,
    counterToken: newToken.raw,
    counterInvitationId,
  };
}

export type RejectInviteInput = InvitationLookup & {
  rejectingUserId: string;
  rejectingOrgId: string;
  reason?: string;
};

export async function rejectInvite(
  input: RejectInviteInput,
): Promise<LegalMatter> {
  const invitation = await resolveInvitation(input);
  if (!invitation) {
    throw new MatterServiceError("TOKEN_INVALID", "Invitation not found");
  }
  if (invitation.consumedAt) {
    throw new MatterServiceError(
      "TOKEN_CONSUMED",
      "Invitation has already been used",
    );
  }

  const matter = invitation.matter;
  // A reject from either counterparty is valid; but we still confirm
  // the caller org is one of the two parties.
  if (
    input.rejectingOrgId !== matter.lawFirmOrgId &&
    input.rejectingOrgId !== matter.clientOrgId
  ) {
    throw new MatterServiceError(
      "NOT_AUTHORIZED",
      "Caller is not a party to this matter",
    );
  }

  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const m = await tx.legalMatter.update({
      where: { id: matter.id },
      data: {
        status: "CLOSED",
        revokedAt: now,
        revokedBy: input.rejectingUserId,
        revocationReason: input.reason ?? "Rejected before activation",
      },
    });
    await tx.legalMatterInvitation.update({
      where: { id: invitation.id },
      data: { consumedAt: now },
    });
    return m;
  });
}

// ─── Revoke / Suspend / Resume ────────────────────────────────────────

export async function revokeMatter(input: {
  matterId: string;
  actorUserId: string;
  actorOrgId: string;
  actorSide: NetworkSide;
  reason: string;
}): Promise<LegalMatter> {
  const matter = await prisma.legalMatter.findUnique({
    where: { id: input.matterId },
  });
  if (!matter) {
    throw new MatterServiceError("MATTER_WRONG_STATE", "Matter not found");
  }
  // Both sides may revoke their own participation. (Operator obviously;
  // a law firm may also wish to withdraw — professional-conduct grounds.)
  if (
    input.actorOrgId !== matter.lawFirmOrgId &&
    input.actorOrgId !== matter.clientOrgId
  ) {
    throw new MatterServiceError("NOT_AUTHORIZED", "Caller is not a party");
  }
  if (matter.status === "REVOKED" || matter.status === "CLOSED") {
    throw new MatterServiceError(
      "MATTER_WRONG_STATE",
      `Matter is already ${matter.status}`,
    );
  }

  const now = new Date();
  const updated = await prisma.legalMatter.update({
    where: { id: input.matterId },
    data: {
      status: "REVOKED",
      revokedAt: now,
      revokedBy: input.actorUserId,
      revocationReason: input.reason,
    },
  });

  // Audit-log the lifecycle event. The hash chain must continue across
  // lifecycle events, otherwise an attacker who deletes all access
  // logs could hide the revocation. Use the scope category AUDIT_LOGS
  // as a proxy since lifecycle events aren't tied to data categories.
  await emitAccessLog({
    matter: updated,
    actorUserId: input.actorUserId,
    actorOrgId: input.actorOrgId,
    actorSide: input.actorSide,
    action: "MATTER_REVOKED",
    resourceType: "LegalMatter",
    resourceId: input.matterId,
    matterScope: "AUDIT_LOGS",
    context: { reason: input.reason },
  });

  return updated;
}

export async function setMatterStatus(input: {
  matterId: string;
  nextStatus: Extract<MatterStatus, "SUSPENDED" | "ACTIVE">;
  actorUserId: string;
  actorOrgId: string;
  actorSide: NetworkSide;
}): Promise<LegalMatter> {
  const matter = await prisma.legalMatter.findUnique({
    where: { id: input.matterId },
  });
  if (!matter) {
    throw new MatterServiceError("MATTER_WRONG_STATE", "Matter not found");
  }
  // Only the operator (client side) may suspend/resume.
  if (input.actorOrgId !== matter.clientOrgId) {
    throw new MatterServiceError(
      "NOT_AUTHORIZED",
      "Only the operator may suspend or resume",
    );
  }
  const allowedTransitions: Partial<Record<MatterStatus, MatterStatus[]>> = {
    ACTIVE: ["SUSPENDED"],
    SUSPENDED: ["ACTIVE"],
  };
  if (!allowedTransitions[matter.status]?.includes(input.nextStatus)) {
    throw new MatterServiceError(
      "MATTER_WRONG_STATE",
      `Cannot transition ${matter.status} → ${input.nextStatus}`,
    );
  }

  const updated = await prisma.legalMatter.update({
    where: { id: input.matterId },
    data: { status: input.nextStatus },
  });

  await emitAccessLog({
    matter: updated,
    actorUserId: input.actorUserId,
    actorOrgId: input.actorOrgId,
    actorSide: input.actorSide,
    action:
      input.nextStatus === "SUSPENDED" ? "MATTER_SUSPENDED" : "MATTER_RESUMED",
    resourceType: "LegalMatter",
    resourceId: input.matterId,
    matterScope: "AUDIT_LOGS",
  });

  return updated;
}
