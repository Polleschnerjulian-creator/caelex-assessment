/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * GET  /api/atlas/settings/organizations
 *   List the orgs the caller is a member of that qualify for Atlas
 *   (orgType IN LAW_FIRM/BOTH). Drives the org-switcher dropdown.
 *   Super-admins also see EVERY active LAW_FIRM/BOTH org so they can
 *   debug any customer.
 *
 * POST /api/atlas/settings/organizations/switch
 *   Body: { organizationId }. Sets the `atlas_active_org` cookie so
 *   future getAtlasAuth() calls scope to the chosen org. Verifies
 *   membership (or super-admin) before writing the cookie.
 *
 * Two endpoints in one file via separate route handlers below.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/super-admin";
import { ACTIVE_ORG_COOKIE } from "@/lib/atlas-auth";
import { cookies } from "next/headers";
import { logger } from "@/lib/logger";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface OrgEntry {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  orgType: string;
  /** True if the caller is an actual member; false when surfaced via
   *  super-admin override (lets the UI show a clear "platform admin
   *  view" badge on those rows). */
  isMember: boolean;
  role: string | null;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value ?? null;

  const memberships = await prisma.organizationMember.findMany({
    where: {
      userId: session.user.id,
      organization: {
        isActive: true,
        orgType: { in: ["LAW_FIRM", "BOTH"] },
      },
    },
    select: {
      role: true,
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          orgType: true,
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  const orgs: OrgEntry[] = memberships.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    slug: m.organization.slug ?? "",
    logoUrl: m.organization.logoUrl,
    orgType: m.organization.orgType,
    isMember: true,
    role: m.role,
  }));

  // Super-admin: surface every other Atlas-flavoured org as a "view as"
  // option, separately marked so the UI can render a distinct row.
  if (isSuperAdmin(session.user.email)) {
    const memberIds = new Set(orgs.map((o) => o.id));
    const others = await prisma.organization.findMany({
      where: {
        isActive: true,
        orgType: { in: ["LAW_FIRM", "BOTH"] },
        id: { notIn: Array.from(memberIds) },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        orgType: true,
      },
      orderBy: { name: "asc" },
      take: 200, // hard cap so the dropdown doesn't render thousands
    });
    for (const o of others) {
      orgs.push({
        id: o.id,
        name: o.name,
        slug: o.slug ?? "",
        logoUrl: o.logoUrl,
        orgType: o.orgType,
        isMember: false,
        role: null,
      });
    }
  }

  return NextResponse.json({
    organizations: orgs,
    activeOrgId,
  });
}

const SwitchSchema = z.object({
  organizationId: z.string().min(1).max(64),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = SwitchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { organizationId } = parsed.data;

  // Authorisation: must be a member of the target org, OR a super-
  // admin (who can switch into any active LAW_FIRM/BOTH org).
  const isAdmin = isSuperAdmin(session.user.email);
  let allowed = isAdmin;

  if (!allowed) {
    const membership = await prisma.organizationMember.findFirst({
      where: {
        userId: session.user.id,
        organizationId,
        organization: {
          isActive: true,
          orgType: { in: ["LAW_FIRM", "BOTH"] },
        },
      },
      select: { id: true },
    });
    allowed = !!membership;
  } else {
    // Super-admin still must point at an existing active LAW_FIRM/BOTH
    // org — guarantees the cookie value is meaningful.
    const exists = await prisma.organization.findFirst({
      where: {
        id: organizationId,
        isActive: true,
        orgType: { in: ["LAW_FIRM", "BOTH"] },
      },
      select: { id: true },
    });
    allowed = !!exists;
  }

  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    // 90-day persistence — switching is rare, but a fresh login
    // preserves the choice.
    maxAge: 60 * 60 * 24 * 90,
  });

  logger.info("[atlas] active org switched", {
    userId: session.user.id,
    organizationId,
    superAdmin: isAdmin,
  });

  return NextResponse.json({ ok: true });
}
