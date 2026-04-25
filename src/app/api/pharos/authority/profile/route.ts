/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * GET  /api/pharos/authority/profile  — read caller's authority profile
 * POST /api/pharos/authority/profile  — create authority profile
 *                                       (caller's org must be AUTHORITY type)
 * PATCH /api/pharos/authority/profile — update profile
 *
 * The profile is 1:1 to Organization. Only org admins (OWNER / ADMIN
 * role) can create or update it. The orgType=AUTHORITY check is
 * enforced — you can't have an AuthorityProfile on a non-AUTHORITY org.
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

const AuthorityTypeSchema = z.enum([
  "BAFA",
  "BNETZA",
  "BMWK",
  "BMVG",
  "BSI",
  "BAFIN",
  "ESA_LIAISON",
  "EU_COMMISSION",
  "NATO_NCIA",
  "EU_MEMBER_STATE",
  "OTHER",
]);

const ScopeCategorySchema = z.enum([
  "COMPLIANCE_ASSESSMENTS",
  "AUTHORIZATION_WORKFLOWS",
  "DOCUMENTS",
  "TIMELINE_DEADLINES",
  "INCIDENTS",
  "SPACECRAFT_REGISTRY",
  "AUDIT_LOGS",
]);

const PostBody = z.object({
  authorityType: AuthorityTypeSchema,
  jurisdiction: z.string().min(2).max(20),
  oversightCategories: z.array(ScopeCategorySchema).min(1),
  contactEmail: z.string().email(),
  publicWebsite: z.string().url().optional(),
  legalReference: z.string().max(500).optional(),
});

const PatchBody = PostBody.partial();

/** Resolve the caller's organisation membership. Returns null if no
 *  membership exists OR if caller's role isn't OWNER/ADMIN (only those
 *  may manage the AuthorityProfile). */
async function resolveOrgAdmin(userId: string) {
  const membership = await prisma.organizationMember.findFirst({
    where: { userId },
    select: {
      organizationId: true,
      role: true,
      organization: {
        select: { id: true, orgType: true, name: true, isActive: true },
      },
    },
    orderBy: { joinedAt: "asc" },
  });
  if (!membership) return null;
  return membership;
}

// ─── GET ─────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await resolveOrgAdmin(session.user.id);
    if (!membership) {
      return NextResponse.json({ error: "No active org" }, { status: 403 });
    }
    if (membership.organization.orgType !== "AUTHORITY") {
      return NextResponse.json(
        {
          error:
            "Caller's organisation is not an AUTHORITY — Pharos only available for authorities",
          code: "NOT_AUTHORITY_ORG",
        },
        { status: 403 },
      );
    }

    const profile = await prisma.authorityProfile.findUnique({
      where: { organizationId: membership.organizationId },
    });

    return NextResponse.json({ profile });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Pharos authority profile GET failed: ${msg}`);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

// ─── POST ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await resolveOrgAdmin(session.user.id);
    if (!membership) {
      return NextResponse.json({ error: "No active org" }, { status: 403 });
    }
    if (membership.organization.orgType !== "AUTHORITY") {
      return NextResponse.json(
        { error: "Org is not AUTHORITY", code: "NOT_AUTHORITY_ORG" },
        { status: 403 },
      );
    }
    if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only org admins may set up the authority profile" },
        { status: 403 },
      );
    }

    const raw = await request.json().catch(() => null);
    const parsed = PostBody.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    // Reject duplicate profile (1:1 constraint)
    const existing = await prisma.authorityProfile.findUnique({
      where: { organizationId: membership.organizationId },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Profile already exists — use PATCH to update" },
        { status: 409 },
      );
    }

    const created = await prisma.authorityProfile.create({
      data: {
        organizationId: membership.organizationId,
        authorityType: parsed.data.authorityType,
        jurisdiction: parsed.data.jurisdiction,
        oversightCategories: parsed.data.oversightCategories,
        contactEmail: parsed.data.contactEmail,
        publicWebsite: parsed.data.publicWebsite,
        legalReference: parsed.data.legalReference,
      },
    });

    return NextResponse.json({ profile: created });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Pharos authority profile POST failed: ${msg}`);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}

// ─── PATCH ───────────────────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await resolveOrgAdmin(session.user.id);
    if (!membership) {
      return NextResponse.json({ error: "No active org" }, { status: 403 });
    }
    if (membership.organization.orgType !== "AUTHORITY") {
      return NextResponse.json(
        { error: "Org is not AUTHORITY", code: "NOT_AUTHORITY_ORG" },
        { status: 403 },
      );
    }
    if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only org admins may update the authority profile" },
        { status: 403 },
      );
    }

    const raw = await request.json().catch(() => null);
    const parsed = PatchBody.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const updated = await prisma.authorityProfile.update({
      where: { organizationId: membership.organizationId },
      data: parsed.data,
    });

    return NextResponse.json({ profile: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Pharos authority profile PATCH failed: ${msg}`);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
