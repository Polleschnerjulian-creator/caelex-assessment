/**
 * Newsletter Double Opt-In Confirmation
 *
 * GET /api/newsletter/confirm?token=<token>
 *
 * Confirms a pending newsletter subscription. Required by German law
 * (UWG §7, DSGVO Art. 7) for newsletter subscriptions.
 *
 * Redirects to homepage with query parameter indicating result.
 */

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.caelex.eu";

  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.redirect(`${baseUrl}/?newsletter=invalid`);
    }

    // Look up subscription by confirmation token
    const subscription = await prisma.newsletterSubscription.findUnique({
      where: { confirmationToken: token },
    });

    if (!subscription) {
      // Token not found — may have been already used or never existed
      return NextResponse.redirect(`${baseUrl}/?newsletter=invalid`);
    }

    if (subscription.status === "ACTIVE") {
      // Already confirmed
      return NextResponse.redirect(`${baseUrl}/?newsletter=already-confirmed`);
    }

    // Check token expiry (24 hours)
    if (
      subscription.tokenExpiresAt &&
      new Date() > subscription.tokenExpiresAt
    ) {
      return NextResponse.redirect(`${baseUrl}/?newsletter=expired`);
    }

    // Confirm the subscription
    await prisma.newsletterSubscription.update({
      where: { id: subscription.id },
      data: {
        status: "ACTIVE",
        confirmationToken: null,
        tokenExpiresAt: null,
        confirmedAt: new Date(),
      },
    });

    logger.info(`Newsletter subscription confirmed: ${subscription.email}`);

    return NextResponse.redirect(`${baseUrl}/?newsletter=confirmed`);
  } catch (error) {
    logger.error("Newsletter confirmation error", error);
    return NextResponse.redirect(`${baseUrl}/?newsletter=error`);
  }
}
