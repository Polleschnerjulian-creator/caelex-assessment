/**
 * Create Stripe Customer Portal Session
 * POST /api/stripe/create-portal-session
 *
 * Creates a Stripe Customer Portal session for subscription management.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createPortalSession } from "@/lib/services/subscription-service";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { CuidSchema } from "@/lib/validations";
import { logger } from "@/lib/logger";

const PortalSessionBodySchema = z.object({
  organizationId: CuidSchema,
  returnUrl: z.string().url().max(2048).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = PortalSessionBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { organizationId } = parsed.data;

    // Verify user has access to organization
    const membership = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId: session.user.id,
        role: { in: ["OWNER", "ADMIN"] },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Only organization owners and admins can manage billing" },
        { status: 403 },
      );
    }

    // Get base URL for return URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://caelex.eu";

    const result = await createPortalSession(
      organizationId,
      `${baseUrl}/dashboard/settings/billing`,
    );

    return NextResponse.json(result);
  } catch (error) {
    logger.error("Error creating portal session", error);
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 },
    );
  }
}
