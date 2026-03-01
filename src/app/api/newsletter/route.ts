/**
 * Newsletter Subscription API
 *
 * POST /api/newsletter — Subscribe an email to the newsletter
 * DELETE /api/newsletter — Unsubscribe an email from the newsletter
 *
 * Public endpoint. Rate limited: 5 requests/hour per IP.
 */

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";

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

    // Check if subscription already exists
    const existing = await prisma.newsletterSubscription.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      if (existing.status === "ACTIVE") {
        // Idempotent: already subscribed
        return NextResponse.json({ success: true });
      }

      // Reactivate unsubscribed email
      await prisma.newsletterSubscription.update({
        where: { id: existing.id },
        data: {
          status: "ACTIVE",
          unsubscribedAt: null,
          source,
        },
      });

      return NextResponse.json({ success: true });
    }

    // Create new subscription
    await prisma.newsletterSubscription.create({
      data: {
        email: email.toLowerCase(),
        source,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Newsletter subscribe error:", error);
    return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
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

    // Use deleteMany-style update to avoid leaking whether the email exists
    // Always return the same success response regardless of email existence
    await prisma.newsletterSubscription.updateMany({
      where: { email: email.toLowerCase(), status: "ACTIVE" },
      data: {
        status: "UNSUBSCRIBED",
        unsubscribedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Newsletter unsubscribe error:", error);
    return NextResponse.json(
      { error: "Failed to unsubscribe" },
      { status: 500 },
    );
  }
}
