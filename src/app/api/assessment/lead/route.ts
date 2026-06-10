/**
 * Assessment Lead Capture API
 *
 * POST /api/assessment/lead — Persist the email-gate submission from the
 * public assessment results page (the gate the visitor passes to download
 * their PDF compliance report).
 *
 * Honesty hotfix 2026-06-10: this lead was previously saved ONLY to the
 * visitor's own localStorage while the UI copy implied server-side
 * handling. This route makes the lead capture real and the consent
 * record durable.
 *
 * Public endpoint with rate limiting (contact tier: 5/hour per IP) and
 * honeypot bot protection.
 *
 * Flow:
 *   1. Rate limit by IP
 *   2. Validate input with Zod
 *   3. Check honeypot — silently succeed if filled (bot)
 *   4. Persist AssessmentLead record FIRST (leads must never be lost)
 *   5. If the visitor explicitly opted in to the newsletter (checkbox is
 *      UNCHECKED by default — GDPR Art. 7), start the existing
 *      NewsletterSubscription DOUBLE-OPT-IN flow. The subscription only
 *      becomes ACTIVE after the visitor clicks the confirmation link;
 *      this route never activates a subscription directly.
 *   6. Return success
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { logger, maskEmail } from "@/lib/logger";
import { getSafeErrorMessage } from "@/lib/validations";
import { sendNewsletterConfirmation } from "@/lib/email/templates/newsletter-confirmation";

const assessmentLeadSchema = z.object({
  email: z.string().email("Invalid email format").max(320),
  company: z.string().max(200).optional(),
  role: z.string().max(200).optional(),
  assessmentType: z
    .enum(["eu-space-act", "nis2", "space-law", "unified"])
    .optional()
    .default("eu-space-act"),
  consentNewsletter: z.boolean().optional().default(false),
  _hp: z.string().optional(),
});

/**
 * Start (or restart) the newsletter double-opt-in flow for an email.
 *
 * Mirrors the POST /api/newsletter behavior: never sets ACTIVE directly —
 * the subscription stays PENDING until the visitor confirms via the
 * emailed link (UWG §7, DSGVO Art. 7).
 */
async function startNewsletterDoubleOptIn(email: string): Promise<void> {
  const existing = await prisma.newsletterSubscription.findUnique({
    where: { email },
  });

  if (existing?.status === "ACTIVE") {
    // Already a confirmed subscriber — nothing to do.
    return;
  }

  const confirmationToken = randomUUID();
  const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  if (existing) {
    // PENDING (re-send with fresh token) or UNSUBSCRIBED (re-subscribe
    // with double opt-in).
    await prisma.newsletterSubscription.update({
      where: { id: existing.id },
      data: {
        status: "PENDING",
        confirmationToken,
        tokenExpiresAt,
        confirmedAt: null,
        unsubscribedAt: null,
        source: "assessment-results",
      },
    });
  } else {
    await prisma.newsletterSubscription.create({
      data: {
        email,
        source: "assessment-results",
        status: "PENDING",
        confirmationToken,
        tokenExpiresAt,
      },
    });
  }

  // Send confirmation email (fire-and-forget, don't block the response)
  sendNewsletterConfirmation(email, confirmationToken).catch((err) => {
    logger.error("Failed to send newsletter confirmation email", err);
  });
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 per hour per IP (same tier as the contact form)
    const identifier = getIdentifier(request);
    const rateLimitResult = await checkRateLimit("contact", identifier);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = assessmentLeadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    // Honeypot: reject if hidden field is filled (bots fill all fields)
    if (parsed.data._hp) {
      // Silently succeed to not tip off the bot
      return NextResponse.json({ success: true });
    }

    const { email, company, role, assessmentType, consentNewsletter } =
      parsed.data;
    const normalizedEmail = email.toLowerCase();

    // ─── Persist to database FIRST — leads must never be lost ────────────
    const userAgent = request.headers.get("user-agent") || null;
    const lead = await prisma.assessmentLead.create({
      data: {
        email: normalizedEmail,
        company: company || null,
        role: role || null,
        assessmentType,
        consentNewsletter,
        source: "assessment-results",
        ipAddress: identifier === "unknown" ? null : identifier,
        userAgent: userAgent ? userAgent.slice(0, 500) : null,
      },
    });

    logger.info("Assessment lead created", {
      id: lead.id,
      email: maskEmail(normalizedEmail),
      assessmentType,
      consentNewsletter,
    });

    // ─── Newsletter opt-in (explicit consent only) ────────────────────────
    if (consentNewsletter) {
      try {
        await startNewsletterDoubleOptIn(normalizedEmail);
      } catch (err) {
        // The consent flag is already recorded on the lead row, so the
        // opt-in can be processed manually — never lose the lead over it.
        logger.error("Newsletter opt-in wiring failed (non-blocking)", {
          error: err,
          leadId: lead.id,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Assessment lead capture error", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to save your details") },
      { status: 500 },
    );
  }
}
