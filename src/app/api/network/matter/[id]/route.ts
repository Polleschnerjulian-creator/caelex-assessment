/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * GET   /api/network/matter/:id          — full detail
 * POST  /api/network/matter/:id/revoke   — end matter
 * POST  /api/network/matter/:id/suspend  — pause (operator only)
 * POST  /api/network/matter/:id/resume   — resume (operator only)
 *
 * All routes check the caller is a party to the matter before acting.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
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
    include: {
      lawFirmOrg: {
        select: { id: true, name: true, slug: true, logoUrl: true },
      },
      clientOrg: {
        select: { id: true, name: true, slug: true, logoUrl: true },
      },
      _count: { select: { accessLogs: true, invitations: true } },
    },
  });
  if (!matter) {
    return NextResponse.json({ error: "Matter not found" }, { status: 404 });
  }
  if (
    matter.lawFirmOrgId !== membership.organizationId &&
    matter.clientOrgId !== membership.organizationId
  ) {
    return NextResponse.json(
      { error: "Not a party to this matter" },
      { status: 403 },
    );
  }

  return NextResponse.json({ matter });
}
