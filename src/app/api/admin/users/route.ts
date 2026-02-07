/**
 * Admin: User Management API
 *
 * GET /api/admin/users — List all users with search/filter/pagination
 */

import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requireRole(["admin"]);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const role = searchParams.get("role") || undefined;
    const isActiveParam = searchParams.get("isActive");
    const isActive =
      isActiveParam !== null ? isActiveParam === "true" : undefined;
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "50", 10),
      100,
    );
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const where: Prisma.UserWhereInput = {
      ...(role && { role }),
      ...(typeof isActive === "boolean" && { isActive }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
          { organization: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          organization: true,
          operatorType: true,
          createdAt: true,
          updatedAt: true,
          organizationMemberships: {
            select: {
              role: true,
              organization: {
                select: {
                  id: true,
                  name: true,
                  plan: true,
                },
              },
            },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({ users, total });
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
    console.error("Admin: Error fetching users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
