/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET /api/pharos/operators
 *
 * Authority-side operator roster — every operator with an ACTIVE
 * oversight relationship to the calling authority. Each row carries:
 *   - operator identity
 *   - oversight metadata (title, reference, since-when, MDF size)
 *   - compliance score summary (computed from operator's data, gated
 *     by MDF/VDF scope)
 *   - last-activity timestamp
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function resolveAuthorityCaller(userId: string) {
  const membership = await prisma.organizationMember.findFirst({
    where: { userId },
    select: {
      organizationId: true,
      role: true,
      organization: { select: { orgType: true } },
    },
    orderBy: { joinedAt: "asc" },
  });
  if (!membership) return null;
  if (membership.organization.orgType !== "AUTHORITY") return null;
  // T1-P3 (Pharos audit fix 2026-05-05): the operator roster surfaces
  // every operator under oversight + their incident counts +
  // compliance summaries. That's PII-adjacent regulator data — gate
  // it behind MANAGER+ so a VIEWER or basic MEMBER of an authority
  // org cannot list it. The previous gate accepted any org member
  // regardless of role.
  if (
    membership.role !== "OWNER" &&
    membership.role !== "ADMIN" &&
    membership.role !== "MANAGER"
  ) {
    return { membership, profile: null, insufficientRole: true as const };
  }
  const profile = await prisma.authorityProfile.findUnique({
    where: { organizationId: membership.organizationId },
  });
  if (!profile) return null;
  return { membership, profile, insufficientRole: false as const };
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const caller = await resolveAuthorityCaller(session.user.id);
    if (!caller) {
      return NextResponse.json(
        { error: "Authority profile not configured" },
        { status: 403 },
      );
    }
    if (caller.insufficientRole || !caller.profile) {
      // T1-P3: caller is in an authority org but not at MANAGER+.
      return NextResponse.json(
        {
          error:
            "Insufficient permissions — operator roster requires MANAGER role or higher.",
        },
        { status: 403 },
      );
    }

    // Pull all active oversights for this authority. ACTIVE +
    // PENDING_OPERATOR_ACCEPT + DISPUTED appear in the roster
    // (Suspended / Closed / Revoked filtered out by default).
    const oversights = await prisma.oversightRelationship.findMany({
      where: {
        authorityProfileId: caller.profile.id,
        status: { in: ["ACTIVE", "PENDING_OPERATOR_ACCEPT", "DISPUTED"] },
      },
      include: {
        operatorOrg: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            isActive: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { initiatedAt: "desc" },
    });

    // Compute lightweight compliance summary per operator. We don't
    // load full per-module scores here — that's the operator-detail
    // endpoint's job. For the roster we want a fast "ready / drift /
    // overdue" tier.
    //
    // Note: Caelex's data model anchors most "compliance state" on
    // User (not Organization), via OrganizationMember. So to count
    // incidents / deadlines per operator-org we have to:
    //   1) resolve Org → all member User-IDs
    //   2) count Deadlines.userId in that set
    //   3) count Incidents via SupervisionConfig.userId in that set
    const summaries = await Promise.all(
      oversights.map(async (ov) => {
        const members = await prisma.organizationMember
          .findMany({
            where: { organizationId: ov.operatorOrgId },
            select: { userId: true },
          })
          .catch(() => [] as { userId: string }[]);
        const memberUserIds = members.map((m) => m.userId);

        const incidentCount =
          memberUserIds.length === 0
            ? 0
            : await prisma.incident
                .count({
                  where: {
                    supervision: { userId: { in: memberUserIds } },
                    // Open = anything that's not resolved/reported
                    status: {
                      in: ["detected", "investigating", "contained"],
                    },
                  },
                })
                .catch(() => 0);

        const overdueDeadlines =
          memberUserIds.length === 0
            ? 0
            : await prisma.deadline
                .count({
                  where: {
                    userId: { in: memberUserIds },
                    dueDate: { lt: new Date() },
                    completedAt: null,
                    status: { notIn: ["COMPLETED", "CANCELLED"] },
                  },
                })
                .catch(() => 0);

        // Composite score — for the heatmap. Range 0-100.
        // Each open incident -10, each overdue deadline -5, floor 0.
        const score = Math.max(
          0,
          100 - incidentCount * 10 - overdueDeadlines * 5,
        );
        const tier = score >= 90 ? "good" : score >= 70 ? "drift" : "alert";

        return {
          oversightId: ov.id,
          oversightTitle: ov.oversightTitle,
          oversightReference: ov.oversightReference,
          legalReference: ov.legalReference,
          status: ov.status,
          operator: ov.operatorOrg,
          mandatoryDisclosureSize: Array.isArray(ov.mandatoryDisclosure)
            ? (ov.mandatoryDisclosure as unknown[]).length
            : 0,
          voluntaryDisclosureSize: Array.isArray(ov.voluntaryDisclosure)
            ? (ov.voluntaryDisclosure as unknown[]).length
            : 0,
          initiatedAt: ov.initiatedAt,
          acceptedAt: ov.acceptedAt,
          effectiveUntil: ov.effectiveUntil,
          complianceScore: score,
          complianceTier: tier,
          openIncidents: incidentCount,
          overdueDeadlines,
        };
      }),
    );

    return NextResponse.json({
      authorityType: caller.profile.authorityType,
      jurisdiction: caller.profile.jurisdiction,
      operators: summaries,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Pharos operators GET failed: ${msg}`);
    return NextResponse.json(
      { error: "Failed to load roster" },
      { status: 500 },
    );
  }
}
