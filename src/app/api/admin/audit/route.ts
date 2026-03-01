/**
 * Admin Audit Logs API
 * GET: List all audit logs (platform admin-only, all users)
 *
 * Uses platform-level admin role (User.role === "admin") via the DAL.
 * This is a platform-wide operation, not scoped to a single organization.
 */

import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/dal";
import { NextResponse } from "next/server";
import { parsePaginationLimit } from "@/lib/validations";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify platform-level admin role via DAL (checks User.role, not org membership)
    await requireRole(["admin"]);

    const { searchParams } = new URL(request.url);
    const limit = parsePaginationLimit(searchParams.get("limit"));
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const entityType = searchParams.get("entityType") || undefined;
    const action = searchParams.get("action") || undefined;
    const search = searchParams.get("search") || undefined;

    const where: Record<string, unknown> = {};
    if (entityType) where.entityType = entityType;
    if (action) where.action = action;
    if (search) {
      where.OR = [
        { description: { contains: search, mode: "insensitive" } },
        { entityId: { contains: search, mode: "insensitive" } },
        { action: { contains: search, mode: "insensitive" } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { timestamp: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({ logs, total, limit, offset });
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
    console.error("Error fetching admin audit logs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
