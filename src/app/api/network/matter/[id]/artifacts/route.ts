/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * GET /api/network/matter/:id/artifacts — list pinboard cards
 * POST /api/network/matter/:id/artifacts — create a manual TEXT card
 * PATCH /api/network/matter/:id/artifacts — batch reorder positions
 *
 * Artifacts are normally created server-side when Claude calls a tool
 * (Phase 5), but Phase B adds two user-driven flows:
 *   - POST: lawyer can pin their own free-form notes as TEXT cards
 *   - PATCH: drag-and-drop reorder — client sends [{id, position}, …]
 *     in display order, server applies in a single transaction
 *
 * Both POST + PATCH still respect the Phase 5 firm-side gate. Only
 * the law-firm-org members can manage their pinboard.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
      orderBy: { joinedAt: "asc" },
    });
    if (!membership) {
      return NextResponse.json({ error: "No active org" }, { status: 403 });
    }
    const matter = await prisma.legalMatter.findUnique({
      where: { id },
      select: { lawFirmOrgId: true },
    });
    if (!matter || matter.lawFirmOrgId !== membership.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const artifacts = await prisma.matterArtifact.findMany({
      where: { matterId: id },
      orderBy: [{ pinned: "desc" }, { position: "asc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({ artifacts });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Matter artifacts list failed: ${msg}`);
    return NextResponse.json(
      { error: "Failed to load artifacts" },
      { status: 500 },
    );
  }
}

// ─── POST — manual TEXT card ─────────────────────────────────────────
//
// Restricted to TEXT kind by design: COMPLIANCE_OVERVIEW / CITATIONS /
// MEMO carry structured payloads created by tool execution (with the
// scope-gated audit log). Letting the client POST those bypasses the
// `requireActiveMatter` gate, which would defeat the entire matter-
// scoped data model. TEXT carries no privileged data — it's a sticky
// note — so it's safe to expose.

const PostBody = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(10_000),
});

async function gateMatter(userId: string, matterId: string) {
  const [membership, matter] = await Promise.all([
    prisma.organizationMember.findFirst({
      where: { userId },
      select: { organizationId: true },
      orderBy: { joinedAt: "asc" },
    }),
    prisma.legalMatter.findUnique({
      where: { id: matterId },
      select: { lawFirmOrgId: true },
    }),
  ]);
  if (!membership || !matter) return null;
  if (matter.lawFirmOrgId !== membership.organizationId) return null;
  return membership.organizationId;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(await gateMatter(session.user.id, id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const raw = await req.json().catch(() => null);
    const parsed = PostBody.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    // Position = last + 1, identical to the executor's persistArtifact
    // helper (matter-tool-executor.ts).
    const last = await prisma.matterArtifact.findFirst({
      where: { matterId: id },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const artifact = await prisma.matterArtifact.create({
      data: {
        matterId: id,
        kind: "TEXT",
        title: parsed.data.title,
        payload: { text: parsed.data.content },
        widthHint: "medium",
        position: (last?.position ?? 0) + 1,
        createdBy: session.user.id,
      },
    });
    return NextResponse.json({ artifact });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Matter artifacts POST (manual) failed: ${msg}`);
    return NextResponse.json(
      { error: "Failed to create note card" },
      { status: 500 },
    );
  }
}

// ─── PATCH — batch reorder ───────────────────────────────────────────
//
// Drag-and-drop sends the new order of all visible cards. We apply
// each position update in a single transaction so a half-failed
// reorder doesn't leave the board in an inconsistent state. We also
// validate that every artifactId belongs to this matter — otherwise
// a client could PATCH another matter's cards through this endpoint.

const PatchBody = z.object({
  order: z
    .array(
      z.object({
        id: z.string().cuid(),
        position: z.number().int().min(0).max(10_000),
      }),
    )
    .min(1)
    .max(100),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(await gateMatter(session.user.id, id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const raw = await req.json().catch(() => null);
    const parsed = PatchBody.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    // Tenant-isolation check: every id in the order must belong to
    // this matter. One indexed query, then assertion.
    const ids = parsed.data.order.map((o) => o.id);
    const owned = await prisma.matterArtifact.findMany({
      where: { id: { in: ids }, matterId: id },
      select: { id: true },
    });
    if (owned.length !== ids.length) {
      return NextResponse.json(
        { error: "Some artifacts do not belong to this matter" },
        { status: 400 },
      );
    }

    await prisma.$transaction(
      parsed.data.order.map((o) =>
        prisma.matterArtifact.update({
          where: { id: o.id },
          data: { position: o.position },
        }),
      ),
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Matter artifacts PATCH (reorder) failed: ${msg}`);
    return NextResponse.json({ error: "Failed to reorder" }, { status: 500 });
  }
}
