/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * GET /api/network/matter/:id/artifacts — list pinboard cards
 *
 * Artifacts are created server-side when Claude calls a tool; this
 * endpoint just reads them back for the UI to render on the pinboard.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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
}
