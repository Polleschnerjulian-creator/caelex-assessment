/**
 * Newsletter Subscription API
 *
 * POST /api/newsletter — Subscribe an email to the newsletter (double opt-in)
 * DELETE /api/newsletter — Unsubscribe an email from the newsletter
 *
 * Public endpoint. Rate limited: 5 requests/hour per IP.
 *
 * Double opt-in flow (required by German law: UWG §7, DSGVO Art. 7):
 * 1. User submits email → status set to PENDING, confirmation email sent
 * 2. User clicks confirmation link → status set to ACTIVE
 */

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import { randomUUID } from "crypto";
import { sendNewsletterConfirmation } from "@/lib/email/templates/newsletter-confirmation";

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = getIdentifier(request);
    const rl = await checkRateLimit("public_api", ip);
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Parse and validate body
    const newsletterSchema = z.object({
      email: z.string().email("Invalid email format"),
      source: z.string().max(100).optional().default("footer"),
    });

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = newsletterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { email, source } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    // Check if subscription already exists
    const existing = await prisma.newsletterSubscription.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      if (existing.status === "ACTIVE") {
        // Already confirmed — don't leak this info, just show same message
        return NextResponse.json({
          success: true,
          message: "Please check your email to confirm your subscription.",
        });
      }

      if (existing.status === "PENDING") {
        // Re-send confirmation email with a fresh token
        const token = randomUUID();
        const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        await prisma.newsletterSubscription.update({
          where: { id: existing.id },
          data: {
            confirmationToken: token,
            tokenExpiresAt,
            source,
          },
        });

        // Send confirmation email (fire-and-forget, don't block response)
        sendNewsletterConfirmation(normalizedEmail, token).catch((err) => {
          logger.error("Failed to send newsletter confirmation email", err);
        });

        return NextResponse.json({
          success: true,
          message: "Please check your email to confirm your subscription.",
        });
      }

      // UNSUBSCRIBED — re-subscribe with double opt-in
      const token = randomUUID();
      const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await prisma.newsletterSubscription.update({
        where: { id: existing.id },
        data: {
          status: "PENDING",
          confirmationToken: token,
          tokenExpiresAt,
          unsubscribedAt: null,
          confirmedAt: null,
          source,
        },
      });

      sendNewsletterConfirmation(normalizedEmail, token).catch((err) => {
        logger.error("Failed to send newsletter confirmation email", err);
      });

      return NextResponse.json({
        success: true,
        message: "Please check your email to confirm your subscription.",
      });
    }

    // Create new subscription in PENDING state
    const token = randomUUID();
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.newsletterSubscription.create({
      data: {
        email: normalizedEmail,
        source,
        status: "PENDING",
        confirmationToken: token,
        tokenExpiresAt,
      },
    });

    // Send confirmation email
    sendNewsletterConfirmation(normalizedEmail, token).catch((err) => {
      logger.error("Failed to send newsletter confirmation email", err);
    });

    return NextResponse.json({
      success: true,
      message: "Please check your email to confirm your subscription.",
    });
  } catch (error) {
    logger.error("Newsletter subscribe error", error);
    return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Rate limiting to prevent mass unsubscription attacks
    const ip = getIdentifier(request);
    const rl = await checkRateLimit("public_api", ip);
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 },
      );
    }

    // Use updateMany-style update to avoid leaking whether the email exists
    // Always return the same success response regardless of email existence
    await prisma.newsletterSubscription.updateMany({
      where: { email: email.toLowerCase(), status: "ACTIVE" },
      data: {
        status: "UNSUBSCRIBED",
        unsubscribedAt: new Date(),
        confirmationToken: null,
        tokenExpiresAt: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Newsletter unsubscribe error", error);
    return NextResponse.json(
      { error: "Failed to unsubscribe" },
      { status: 500 },
    );
  }
}
