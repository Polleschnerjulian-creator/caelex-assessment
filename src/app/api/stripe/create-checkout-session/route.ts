/**
 * Create Stripe Checkout Session
 * POST /api/stripe/create-checkout-session
 *
 * Creates a Stripe Checkout Session for subscription upgrade.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { createCheckoutSession } from "@/lib/services/subscription-service";
import { prisma } from "@/lib/prisma";
import {
  CuidSchema,
  getSafeErrorMessage,
  formatZodErrors,
} from "@/lib/validations";

// Validation schema
const CheckoutSessionSchema = z.object({
  priceId: z
    .string()
    .min(1, "Price ID is required")
    .max(100)
    .regex(/^price_[a-zA-Z0-9]+$/, "Invalid price ID format"),
  organizationId: CuidSchema,
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate input
    const validation = CheckoutSessionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: formatZodErrors(validation.error),
        },
        { status: 400 },
      );
    }

    const { priceId, organizationId } = validation.data;

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

    // Get base URL for success/cancel URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const result = await createCheckoutSession({
      organizationId,
      priceId,
      userId: session.user.id,
      successUrl: `${baseUrl}/dashboard/settings/billing?success=true`,
      cancelUrl: `${baseUrl}/dashboard/settings/billing?canceled=true`,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      {
        error: getSafeErrorMessage(error, "Failed to create checkout session"),
      },
      { status: 500 },
    );
  }
}
