import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { getUserOrgId } from "@/lib/hub/queries";
import { z } from "zod";

// ─── Validation ───

const createMitigationSchema = z.object({
  type: z.enum(["TECHNICAL", "OPERATIONAL", "PROCEDURAL"]),
  description: z.string().min(1),
  implementedAt: z
    .string()
    .datetime()
    .transform((v) => new Date(v))
    .optional(),
  verifiedBy: z.string().optional(),
});

// ─── Route params type ───

type RouteParams = { params: Promise<{ hazardId: string }> };

// ─── POST: Add a mitigation to a HazardEntry ───

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const rl = await checkRateLimit(
      "hub",
      getIdentifier(request, session.user.id),
    );
    if (!rl.success) return createRateLimitResponse(rl);

    const orgId = await getUserOrgId(session.user.id);
    if (!orgId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 },
      );
    }

    const { hazardId } = await params;

    // Verify the hazard entry exists and belongs to the user's organization
    const hazardEntry = await prisma.hazardEntry.findFirst({
      where: {
        id: hazardId,
        organizationId: orgId,
      },
      select: { id: true },
    });

    if (!hazardEntry) {
      return NextResponse.json(
        { error: "Hazard entry not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const parsed = createMitigationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { type, description, implementedAt, verifiedBy } = parsed.data;

    const mitigation = await prisma.hazardMitigation.create({
      data: {
        hazardEntryId: hazardEntry.id,
        type,
        description,
        implementedAt: implementedAt ?? null,
        verifiedBy: verifiedBy ?? null,
      },
    });

    return NextResponse.json({ mitigation }, { status: 201 });
  } catch (err) {
    console.error("[hazards/[hazardId]/mitigations] POST error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
