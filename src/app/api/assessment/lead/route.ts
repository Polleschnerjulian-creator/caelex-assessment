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
 * Plan Task 2.4 (ultimate-assessment rebuild): the persistence flow moved
 * VERBATIM into `src/lib/assessment/lead-capture.server.ts` so the
 * email-gated quick-PDF route reuses the exact same logic; this route's
 * behavior is unchanged. The `assessmentType` enum gained the spine tiers
 * ("quick-check", "full").
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
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import { getSafeErrorMessage } from "@/lib/validations";
import { captureAssessmentLead } from "@/lib/assessment/lead-capture.server";

const assessmentLeadSchema = z.object({
  email: z.string().email("Invalid email format").max(320),
  company: z.string().max(200).optional(),
  role: z.string().max(200).optional(),
  // "quick-check" / "full" = the spine assessment tiers (plan Task 2.4).
  assessmentType: z
    .enum([
      "eu-space-act",
      "nis2",
      "space-law",
      "unified",
      "quick-check",
      "full",
    ])
    .optional()
    .default("eu-space-act"),
  consentNewsletter: z.boolean().optional().default(false),
  _hp: z.string().optional(),
});

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

    // Persist lead FIRST + (consent-only) newsletter double-opt-in — the
    // shared capture logic (lead-capture.server.ts). Throws on lead-write
    // failure → honest 500 below, never a fake success.
    const userAgent = request.headers.get("user-agent") || null;
    await captureAssessmentLead({
      email,
      company,
      role,
      assessmentType,
      consentNewsletter,
      ipAddress: identifier === "unknown" ? null : identifier,
      userAgent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Assessment lead capture error", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to save your details") },
      { status: 500 },
    );
  }
}
