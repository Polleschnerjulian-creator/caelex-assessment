/**
 * Assure DD Package Detail API
 * GET: Get a specific Due Diligence package by ID
 *
 * Auth required — verifies the package belongs to the user's organization.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";

export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    // Auth
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit
    const identifier = getIdentifier(request, session.user.id);
    const rateLimit = await checkRateLimit("api", identifier);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { id } = await params;

    // Get user's organization membership
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
    });
    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    // Fetch the DD package
    const ddPackage = await prisma.assureDDPackage.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!ddPackage) {
      return NextResponse.json(
        { error: "DD package not found" },
        { status: 404 },
      );
    }

    // Verify package belongs to user's organization
    if (ddPackage.organizationId !== membership.organizationId) {
      return NextResponse.json(
        { error: "DD package not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      id: ddPackage.id,
      title: ddPackage.title,
      rrsScore: ddPackage.rrsScore,
      grade: ddPackage.grade,
      status: ddPackage.status,
      content: ddPackage.content,
      generatedAt: ddPackage.generatedAt,
      createdBy: ddPackage.createdBy,
    });
  } catch (error) {
    console.error("DD package detail API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
