/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET    /api/atlas/mandate/[id] — full detail (chats + members + counts).
 * PATCH  /api/atlas/mandate/[id] — update mutable fields (name, instructions,
 *                                    jurisdiction, status …).
 * DELETE /api/atlas/mandate/[id] — soft-archive (sets status=archived +
 *                                    archivedAt). Use ?hard=true to actually
 *                                    delete (cascade chats + files + members).
 *
 * Auth: getAtlasAuth + caller must be owner OR explicit member.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { logger } from "@/lib/logger";
import { deleteMandateAndR2Files } from "@/lib/atlas/document-processor.server";
/* SEC-T0-1 step 2 — encryption-at-rest for PII fields on AtlasMandate.
   See docs/AUDIT-ATLAS-V2.md for the full audit-fix plan. */
import {
  encryptAtlasField,
  decryptAtlasField,
} from "@/lib/atlas/atlas-encryption";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PatchBody = z.object({
  name: z.string().min(1).max(200).optional(),
  clientName: z.string().max(200).nullable().optional(),
  clientContact: z.string().max(200).nullable().optional(),
  customInstructions: z.string().max(8_000).nullable().optional(),
  jurisdiction: z.string().max(8).nullable().optional(),
  operatorType: z.string().max(64).nullable().optional(),
  primaryAuthority: z.string().max(64).nullable().optional(),
  status: z.enum(["active", "archived", "closed"]).optional(),
});

/* ── Membership-gated load. Used by GET, PATCH, DELETE handlers. ──── */
async function loadMandateForUser(
  id: string,
  userId: string,
  organizationId: string,
) {
  return prisma.atlasMandate.findFirst({
    where: {
      id,
      organizationId,
      OR: [{ ownerUserId: userId }, { members: { some: { userId } } }],
    },
    select: {
      id: true,
      ownerUserId: true,
      organizationId: true,
    },
  });
}

/* ── GET ───────────────────────────────────────────────────────────── */

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;

  const mandate = await prisma.atlasMandate.findFirst({
    where: {
      id,
      organizationId: atlas.organizationId,
      OR: [
        { ownerUserId: atlas.userId },
        { members: { some: { userId: atlas.userId } } },
      ],
    },
    select: {
      id: true,
      name: true,
      clientName: true,
      clientContact: true,
      customInstructions: true,
      jurisdiction: true,
      operatorType: true,
      primaryAuthority: true,
      status: true,
      archivedAt: true,
      closedAt: true,
      createdAt: true,
      updatedAt: true,
      ownerUserId: true,
      owner: {
        select: { id: true, name: true, email: true },
      },
      members: {
        orderBy: { addedAt: "asc" },
        select: {
          id: true,
          role: true,
          addedAt: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
      chats: {
        where: { archivedAt: null },
        orderBy: { updatedAt: "desc" },
        take: 50,
        select: {
          id: true,
          title: true,
          updatedAt: true,
          createdAt: true,
        },
      },
      _count: {
        select: { chats: true, files: true, members: true },
      },
    },
  });

  if (!mandate) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  /* SEC-T0-1: decrypt all 3 PII fields (clientName, clientContact,
     customInstructions) before responding. Three sequential awaits
     would also work but Promise.all is cheaper and parallelizable
     since each field's decryption is independent. */
  const [clientName, clientContact, customInstructions] = await Promise.all([
    decryptAtlasField(mandate.clientName),
    decryptAtlasField(mandate.clientContact),
    decryptAtlasField(mandate.customInstructions),
  ]);
  return NextResponse.json({
    mandate: { ...mandate, clientName, clientContact, customInstructions },
  });
}

/* ── PATCH ─────────────────────────────────────────────────────────── */

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PatchBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Bad request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  /* Status-transition side-effects: track archivedAt / closedAt
     timestamps automatically when status flips. */
  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.status === "archived") {
    data.archivedAt = new Date();
  }
  if (parsed.data.status === "closed") {
    data.closedAt = new Date();
  }

  /* SEC-H7 (wave 11B): role-based field-level edit gating.

     Before this fix, any mandate member could PATCH any field —
     including `customInstructions` which gets injected into Claude's
     system-prompt for EVERY chat in this mandate. That made any
     bona-fide member (external counsel for one workstream, paralegal,
     etc.) a prompt-injection vector against the partner running the
     mandate.

     Role policy:
       - owner (ownerUserId or members.role==="owner") → all fields
       - reviewer (members.role==="reviewer")          → all fields
       - collaborator                                  → status/tags only
       - viewer                                        → no PATCH (403)

     Sensitive fields: name, clientName, clientContact, customInstructions.
     Non-sensitive: status, jurisdiction, operatorType, primaryAuthority. */
  const ownerRow = await prisma.atlasMandate.findFirst({
    where: { id, organizationId: atlas.organizationId },
    select: { ownerUserId: true },
  });
  const isOwner = ownerRow?.ownerUserId === atlas.userId;
  let role: string | null = null;
  if (!isOwner) {
    const member = await prisma.atlasMandateMember.findFirst({
      where: { mandateId: id, userId: atlas.userId },
      select: { role: true },
    });
    role = member?.role ?? null;
  }
  const canEditAll = isOwner || role === "owner" || role === "reviewer";
  const canEditSafe = canEditAll || role === "collaborator";
  if (!canEditSafe) {
    /* viewer or no membership at all — refuse the whole PATCH. */
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const SENSITIVE_FIELDS = [
    "name",
    "clientName",
    "clientContact",
    "customInstructions",
  ] as const;
  if (!canEditAll) {
    /* collaborator path — strip sensitive fields. Surface as 403 if
       the caller TRIED to send a sensitive field; silent strip would
       be confusing UX. */
    const attempted = SENSITIVE_FIELDS.filter((f) => f in parsed.data);
    if (attempted.length > 0) {
      return NextResponse.json(
        {
          error: "Forbidden — reviewer or owner role required",
          fields: attempted,
        },
        { status: 403 },
      );
    }
  }

  /* SEC-T0-1: encrypt PII fields before persisting the update. We
     overwrite only the keys the caller actually sent — keeping null
     vs undefined semantics so a PATCH that omits clientName leaves
     it untouched, while a PATCH that sends clientName: null clears
     it (encryptAtlasField passes null through unchanged). */
  if ("clientName" in parsed.data) {
    data.clientName = await encryptAtlasField(
      parsed.data.clientName,
      atlas.organizationId,
    );
  }
  if ("clientContact" in parsed.data) {
    data.clientContact = await encryptAtlasField(
      parsed.data.clientContact,
      atlas.organizationId,
    );
  }
  if ("customInstructions" in parsed.data) {
    data.customInstructions = await encryptAtlasField(
      parsed.data.customInstructions,
      atlas.organizationId,
    );
  }
  if (parsed.data.status === "active") {
    data.archivedAt = null;
    data.closedAt = null;
  }

  /* AUDIT-FIX H11: Collapse the prior loadMandateForUser-then-update
     into a single updateMany + lookup. updateMany supports the org +
     membership `where` clause directly so the auth-gate and the
     mutation share one round-trip; if count===0 the gate filtered
     the row out → 404. Then a single primary-key lookup returns the
     row shape the UI needs. Net: 2 queries (was: find + update = 2
     queries) — same total but the first round-trip now does real
     work (the actual update) instead of pure gating, so a stuck
     update-roundtrip doesn't waste a separate gate roundtrip. The
     find-after-update is unavoidable because updateMany doesn't
     return rows; a returning-style update would need findFirst +
     update (still 2). The trade-off is negligible at single-row
     scale and the comment serves as a marker so future changes
     don't accidentally re-introduce a third roundtrip. */
  try {
    const updated = await prisma.atlasMandate.updateMany({
      where: {
        id,
        organizationId: atlas.organizationId,
        OR: [
          { ownerUserId: atlas.userId },
          { members: { some: { userId: atlas.userId } } },
        ],
      },
      data,
    });
    if (updated.count === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const mandate = await prisma.atlasMandate.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        clientName: true,
        customInstructions: true,
        jurisdiction: true,
        operatorType: true,
        primaryAuthority: true,
        status: true,
        updatedAt: true,
      },
    });
    /* SEC-T0-1: decrypt the 2 sensitive fields in the response. */
    if (!mandate) return NextResponse.json({ mandate });
    const [clientName, customInstructions] = await Promise.all([
      decryptAtlasField(mandate.clientName),
      decryptAtlasField(mandate.customInstructions),
    ]);
    return NextResponse.json({
      mandate: { ...mandate, clientName, customInstructions },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("[atlas/mandate/id] PATCH failed", {
      userId: atlas.userId,
      mandateId: id,
      error: msg,
    });
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

/* ── DELETE ────────────────────────────────────────────────────────── */

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  const url = new URL(req.url);
  const hard = url.searchParams.get("hard") === "true";

  /* AUDIT-FIX H11: Hard-delete still needs the row's ownerUserId
     pre-fetched (to enforce owner-only on the destructive branch),
     so we keep loadMandateForUser for the hard-path. The soft-archive
     branch below collapses to a single updateMany — count===0 on the
     membership-gate gives us the same 404 with one fewer query. */
  if (hard) {
    const access = await loadMandateForUser(
      id,
      atlas.userId,
      atlas.organizationId,
    );
    if (!access) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    /* Hard-delete is owner-only — collaborators can soft-archive but
       not destroy the audit trail. */
    if (access.ownerUserId !== atlas.userId) {
      return NextResponse.json(
        { error: "Only the mandate owner can hard-delete" },
        { status: 403 },
      );
    }

    try {
      /* AUDIT-FIX C6: route through deleteMandateAndR2Files so the
         R2 binaries are removed BEFORE the Prisma cascade drops the
         AtlasMandateFile rows. Bare prisma.delete leaks R2 objects
         (storage cost + GDPR right-to-erasure violation). */
      const result = await deleteMandateAndR2Files({
        mandateId: id,
        userId: atlas.userId,
        organizationId: atlas.organizationId,
      });
      if (!result.deleted) {
        return NextResponse.json(
          { error: "Delete failed", r2DeletionErrors: result.r2DeletionErrors },
          { status: 500 },
        );
      }
      return NextResponse.json({
        ok: true,
        deleted: true,
        r2DeletionErrors: result.r2DeletionErrors,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error("[atlas/mandate/id] DELETE failed", {
        userId: atlas.userId,
        mandateId: id,
        error: msg,
      });
      return NextResponse.json({ error: "Delete failed" }, { status: 500 });
    }
  }

  /* AUDIT-FIX H11: Soft-archive is a single updateMany with the
     membership gate inline — count===0 means the gate filtered the
     row (not-found OR no access, same 404 either way). The response
     doesn't need the row, so no follow-up select required. Net: 1
     query (was: find + update = 2 queries). */
  try {
    const updated = await prisma.atlasMandate.updateMany({
      where: {
        id,
        organizationId: atlas.organizationId,
        OR: [
          { ownerUserId: atlas.userId },
          { members: { some: { userId: atlas.userId } } },
        ],
      },
      data: { status: "archived", archivedAt: new Date() },
    });
    if (updated.count === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, archived: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("[atlas/mandate/id] DELETE failed", {
      userId: atlas.userId,
      mandateId: id,
      error: msg,
    });
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
