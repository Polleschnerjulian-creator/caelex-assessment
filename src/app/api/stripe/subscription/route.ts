/**
 * Subscription API
 * GET /api/stripe/subscription - Get current subscription
 * POST /api/stripe/subscription/cancel - Cancel subscription
 * POST /api/stripe/subscription/reactivate - Reactivate subscription
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getSubscription,
  cancelSubscription,
  reactivateSubscription,
  checkLimitUsage,
} from "@/lib/services/subscription-service";
import { PRICING_TIERS } from "@/lib/stripe/pricing";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId is required" },
        { status: 400 },
      );
    }

    // Verify user has access to organization
    const membership = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId: session.user.id,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const subscription = await getSubscription(organizationId);

    // Get usage limits
    const [userUsage, spacecraftUsage] = await Promise.all([
      checkLimitUsage(organizationId, "users"),
      checkLimitUsage(organizationId, "spacecraft"),
    ]);

    const plan = subscription?.plan || "FREE";
    const planConfig = PRICING_TIERS[plan as keyof typeof PRICING_TIERS];

    return NextResponse.json({
      subscription: subscription
        ? {
            id: subscription.id,
            plan: subscription.plan,
            status: subscription.status,
            currentPeriodStart: subscription.currentPeriodStart,
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            trialEnd: subscription.trialEnd,
          }
        : null,
      planDetails: {
        name: planConfig.name,
        price: planConfig.price,
        features: planConfig.features,
      },
      usage: {
        users: userUsage,
        spacecraft: spacecraftUsage,
      },
    });
  } catch (error) {
    console.error("Error getting subscription:", error);
    return NextResponse.json(
      { error: "Failed to get subscription" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { organizationId, action } = body;

    if (!organizationId || !action) {
      return NextResponse.json(
        { error: "organizationId and action are required" },
        { status: 400 },
      );
    }

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

    switch (action) {
      case "cancel":
        await cancelSubscription(organizationId);
        return NextResponse.json({
          success: true,
          message: "Subscription will be canceled at period end",
        });

      case "reactivate":
        await reactivateSubscription(organizationId);
        return NextResponse.json({
          success: true,
          message: "Subscription reactivated",
        });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error managing subscription:", error);
    return NextResponse.json(
      { error: "Failed to manage subscription" },
      { status: 500 },
    );
  }
}
