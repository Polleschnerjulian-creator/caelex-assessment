import "server-only";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Best-effort email dispatchers for the bilateral handshake. Both
 * routes (/api/network/accept token-flow and /api/network/invitations
 * inbox-flow) call into the SAME function so the dispatch semantics
 * are identical regardless of how the operator amended.
 *
 * "Best-effort" means: a Resend outage MUST NOT tank the amendment
 * itself. The matter is already in PENDING_CONSENT in the DB, the
 * inbox-badge will pop up in ≤60s on the lawyer's side anyway, and
 * the email is just a latency-shortener. So we log + swallow.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { renderLegalMatterCounterSignEmail } from "@/lib/email/legal-matter-counter-sign";
import { logger } from "@/lib/logger";
import {
  ScopeSchema,
  type ScopeItem,
  type ScopeCategory,
  type ScopePermission,
} from "./scope";

// ─── Recipient lookup ────────────────────────────────────────────────
// OWNER first, ADMIN as fallback. Matches /api/network/invite findRecipient.

async function findOrgOwner(
  orgId: string,
): Promise<{ email: string; name: string | null; orgName: string } | null> {
  const owner = await prisma.organizationMember.findFirst({
    where: { organizationId: orgId, role: "OWNER" },
    include: {
      user: { select: { email: true, name: true } },
      organization: { select: { name: true } },
    },
    orderBy: { joinedAt: "asc" },
  });
  if (owner?.user.email) {
    return {
      email: owner.user.email,
      name: owner.user.name,
      orgName: owner.organization.name,
    };
  }
  const admin = await prisma.organizationMember.findFirst({
    where: { organizationId: orgId, role: "ADMIN" },
    include: {
      user: { select: { email: true, name: true } },
      organization: { select: { name: true } },
    },
    orderBy: { joinedAt: "asc" },
  });
  if (admin?.user.email) {
    return {
      email: admin.user.email,
      name: admin.user.name,
      orgName: admin.organization.name,
    };
  }
  return null;
}

// ─── Scope humanisation ──────────────────────────────────────────────

const CATEGORY_LABEL: Record<ScopeCategory, string> = {
  COMPLIANCE_ASSESSMENTS: "Compliance",
  AUTHORIZATION_WORKFLOWS: "Genehmigungen",
  DOCUMENTS: "Dokumente",
  TIMELINE_DEADLINES: "Fristen",
  INCIDENTS: "Vorfälle",
  SPACECRAFT_REGISTRY: "Satelliten",
  AUDIT_LOGS: "Audit",
};

const PERMISSION_LABEL: Record<ScopePermission, string> = {
  READ: "Lesen",
  READ_SUMMARY: "Übersicht",
  EXPORT: "Export",
  ANNOTATE: "Notizen",
};

function humaniseScope(scope: ScopeItem[]): string {
  if (scope.length === 0) return "—";
  return scope
    .map(
      (s) =>
        `${CATEGORY_LABEL[s.category]} (${s.permissions
          .map((p) => PERMISSION_LABEL[p])
          .join("/")})`,
    )
    .join(" · ");
}

/** Computes a human-readable summary of what the amendment REMOVED.
 *  Returns empty string if the diff is structurally empty (rare —
 *  amend should only fire if the new scope is strictly narrower). */
function diffScope(original: ScopeItem[], amended: ScopeItem[]): string {
  const changes: string[] = [];

  for (const orig of original) {
    const am = amended.find((a) => a.category === orig.category);
    if (!am) {
      changes.push(`${CATEGORY_LABEL[orig.category]} — Kategorie entfernt`);
      continue;
    }
    const removedPerms = orig.permissions.filter(
      (p) => !am.permissions.includes(p),
    );
    if (removedPerms.length > 0) {
      changes.push(
        `${CATEGORY_LABEL[orig.category]} — ${removedPerms
          .map((p) => `${PERMISSION_LABEL[p]} entzogen`)
          .join(", ")}`,
      );
    }
    // resourceFilter narrowing — emit a generic "auf Subset eingegrenzt"
    if (
      !orig.resourceFilter &&
      am.resourceFilter &&
      Object.keys(am.resourceFilter).length > 0
    ) {
      changes.push(
        `${CATEGORY_LABEL[orig.category]} — auf bestimmte Ressourcen begrenzt`,
      );
    }
  }
  return changes.join(" · ");
}

// ─── Main dispatcher ────────────────────────────────────────────────

interface DispatchCounterSignInput {
  /** ID of the new (counter) invitation that was just created in the
   *  amend transaction. We use it to fetch the post-amend scope and
   *  resolve the original via amendmentOf. */
  counterInvitationId: string;
  /** The user who clicked "Anpassen" (operator-side most often). Used
   *  for the "Vorgeschlagen von …" attribution line. */
  amendingUserId: string;
}

export async function dispatchCounterSignEmail(
  input: DispatchCounterSignInput,
): Promise<void> {
  try {
    const counter = await prisma.legalMatterInvitation.findUnique({
      where: { id: input.counterInvitationId },
      include: {
        matter: {
          include: {
            lawFirmOrg: { select: { id: true, name: true } },
            clientOrg: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!counter || !counter.amendmentOf) {
      logger.warn(
        `Counter-sign email: invitation ${input.counterInvitationId} is not an amendment, skipping`,
      );
      return;
    }

    const original = await prisma.legalMatterInvitation.findUnique({
      where: { id: counter.amendmentOf },
      select: {
        proposedScope: true,
        proposedDurationMonths: true,
      },
    });
    if (!original) {
      logger.warn(
        `Counter-sign email: original invitation ${counter.amendmentOf} missing`,
      );
      return;
    }

    // Parse both scopes through Zod so type-narrowing is safe even
    // though the JSON column is loosely typed.
    const originalScopeParse = ScopeSchema.safeParse(original.proposedScope);
    const amendedScopeParse = ScopeSchema.safeParse(counter.proposedScope);
    if (!originalScopeParse.success || !amendedScopeParse.success) {
      logger.warn(`Counter-sign email: scope JSON failed validation, skipping`);
      return;
    }
    const originalScope = originalScopeParse.data;
    const amendedScope = amendedScopeParse.data;

    // ─── Direction logic ──────────────────────────────────────
    // The ORIGINAL inviter is the side that initiated the matter:
    //   invitedFrom=ATLAS  → law firm initiated → recipient = lawFirmOrg
    //   invitedFrom=CAELEX → operator initiated → recipient = clientOrg
    const recipientOrgId =
      counter.matter.invitedFrom === "ATLAS"
        ? counter.matter.lawFirmOrgId
        : counter.matter.clientOrgId;
    const amendingOrgId =
      counter.matter.invitedFrom === "ATLAS"
        ? counter.matter.clientOrgId // operator amended
        : counter.matter.lawFirmOrgId; // law firm amended

    const [recipient, amendingOrg, amendingUser] = await Promise.all([
      findOrgOwner(recipientOrgId),
      prisma.organization.findUnique({
        where: { id: amendingOrgId },
        select: { name: true },
      }),
      prisma.user.findUnique({
        where: { id: input.amendingUserId },
        select: { name: true, email: true },
      }),
    ]);

    if (!recipient) {
      logger.warn(
        `Counter-sign email: no OWNER/ADMIN email for org ${recipientOrgId}`,
      );
      return;
    }

    const amendedDuration =
      counter.proposedDurationMonths ?? original.proposedDurationMonths ?? 12;
    const originalDuration = original.proposedDurationMonths ?? null;
    const durationChanged =
      counter.proposedDurationMonths !== null &&
      counter.proposedDurationMonths !== original.proposedDurationMonths;

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ??
      "https://www.caelex.eu";
    const inboxUrl = `${baseUrl}/dashboard/network/inbox`;

    const { subject, html, text } = renderLegalMatterCounterSignEmail({
      amendingOrgName: amendingOrg?.name ?? "Mandant",
      amendingUserName:
        amendingUser?.name ?? amendingUser?.email ?? "Ein Mitglied",
      recipientOrgName: recipient.orgName,
      matterName: counter.matter.name,
      matterReference: counter.matter.reference,
      scopeChangesSummary: diffScope(originalScope, amendedScope),
      amendedScopeSummary: humaniseScope(amendedScope),
      amendedDurationMonths: amendedDuration,
      durationChanged,
      originalDurationMonths: originalDuration,
      inboxUrl,
      originalDirection:
        counter.matter.invitedFrom === "ATLAS"
          ? "ATLAS_INVITES_CAELEX"
          : "CAELEX_INVITES_ATLAS",
    });

    await sendEmail({
      to: recipient.email,
      subject,
      html,
      text,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Counter-sign email dispatch failed: ${msg}`);
    // Swallow — see file header.
  }
}
