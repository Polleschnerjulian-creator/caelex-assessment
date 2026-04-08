/**
 * Admin CRM: Global Search API (Cmd+K command palette)
 *
 * GET /api/admin/crm/search?q=...
 *
 * Returns up to 5 matches each for: contacts, companies, deals.
 * Used by the command palette for keyboard-driven navigation.
 */

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/dal";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await requireRole(["admin"]);

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();

    if (!q || q.length < 2) {
      return NextResponse.json({
        contacts: [],
        companies: [],
        deals: [],
      });
    }

    const [contacts, companies, deals] = await Promise.all([
      prisma.crmContact.findMany({
        where: {
          deletedAt: null,
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
          ],
        },
        orderBy: { leadScore: "desc" },
        take: 5,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          title: true,
          leadScore: true,
          lifecycleStage: true,
          company: { select: { name: true } },
        },
      }),
      prisma.crmCompany.findMany({
        where: {
          deletedAt: null,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { domain: { contains: q, mode: "insensitive" } },
          ],
        },
        orderBy: { leadScore: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          domain: true,
          operatorType: true,
          leadScore: true,
          lifecycleStage: true,
        },
      }),
      prisma.crmDeal.findMany({
        where: {
          deletedAt: null,
          title: { contains: q, mode: "insensitive" },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          stage: true,
          status: true,
          valueCents: true,
          currency: true,
          company: { select: { id: true, name: true } },
        },
      }),
    ]);

    return NextResponse.json({
      contacts,
      companies,
      deals: deals.map((d) => ({
        ...d,
        valueCents: d.valueCents !== null ? Number(d.valueCents) : null,
      })),
    });
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
    logger.error("CRM search failed", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Search failed") },
      { status: 500 },
    );
  }
}
