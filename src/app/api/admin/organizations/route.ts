/**
 * Admin: Organization Management API
 *
 * GET /api/admin/organizations — List all organizations with search/filter/pagination
 */

import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import type { Prisma, OrganizationPlan } from "@prisma/client";

const VALID_PLANS: OrganizationPlan[] = [
  "FREE",
  "STARTER",
  "PROFESSIONAL",
  "ENTERPRISE",
];

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requireRole(["admin"]);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const plan = searchParams.get("plan") || undefined;
    const isActiveParam = searchParams.get("isActive");
    const isActive =
      isActiveParam !== null ? isActiveParam === "true" : undefined;
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "50", 10),
      100,
    );
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const where: Prisma.OrganizationWhereInput = {
      ...(plan &&
        VALID_PLANS.includes(plan as OrganizationPlan) && {
          plan: plan as OrganizationPlan,
        }),
      ...(typeof isActive === "boolean" && { isActive }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { slug: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [organizations, total] = await Promise.all([
      prisma.organization.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          plan: true,
          maxUsers: true,
          maxSpacecraft: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              members: true,
              spacecraft: true,
            },
          },
          members: {
            where: { role: "OWNER" },
            take: 1,
            select: {
              user: {
                select: {
                  email: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.organization.count({ where }),
    ]);

    return NextResponse.json({ organizations, total });
  } catch (error: unknown) {
    const errName = error instanceof Error ? error.name : "";
    if (errName === "UnauthorizedError") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (errName === "ForbiddenError") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }
    console.error("Admin: Error fetching organizations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
