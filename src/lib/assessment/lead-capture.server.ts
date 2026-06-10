/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Shared assessment lead capture (plan Task 2.4).
 *
 * Extracted VERBATIM from the 2026-06-10 honesty-hotfix lead route
 * (src/app/api/assessment/lead/route.ts) so the email-gated quick-PDF route
 * can persist the lead "via the lead route logic" instead of duplicating it:
 *
 *   1. Persist the AssessmentLead record FIRST — leads must never be lost.
 *   2. If (and only if) the visitor explicitly opted in to the newsletter
 *      (checkbox UNCHECKED by default — GDPR Art. 7), start the existing
 *      NewsletterSubscription DOUBLE-OPT-IN flow. The subscription becomes
 *      ACTIVE only after the visitor clicks the confirmation link; this
 *      module never activates a subscription directly.
 *   3. A newsletter-wiring failure is non-blocking: the consent flag is
 *      already recorded on the lead row, so the opt-in can be processed
 *      manually — never lose the lead over it.
 *
 * Optional dedupe (PDF-route path only): when `dedupeWindowMs` is set, an
 * identical recent lead (same email + assessmentType inside the window) is
 * NOT duplicated — the UI's EmailGate already posted the lead seconds
 * earlier; the PDF route still enforces the email gate server-side without
 * writing a second row.
 */

import "server-only";

import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { logger, maskEmail } from "@/lib/logger";
import { sendNewsletterConfirmation } from "@/lib/email/templates/newsletter-confirmation";

export interface AssessmentLeadInput {
  email: string; // validated upstream; normalized to lowercase here
  company?: string | null;
  role?: string | null;
  assessmentType: string;
  consentNewsletter: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  /** When set, skip creating a duplicate row if an identical lead (same
   *  email + assessmentType) was created within the window. */
  dedupeWindowMs?: number;
}

export interface AssessmentLeadResult {
  leadId: string;
  /** true = an identical recent lead already existed; no new row written. */
  deduped: boolean;
}

/**
 * Start (or restart) the newsletter double-opt-in flow for an email.
 *
 * Mirrors the POST /api/newsletter behavior: never sets ACTIVE directly —
 * the subscription stays PENDING until the visitor confirms via the
 * emailed link (UWG §7, DSGVO Art. 7).
 */
export async function startNewsletterDoubleOptIn(email: string): Promise<void> {
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

/**
 * Persist an assessment lead (+ optional newsletter double-opt-in start).
 * Throws when the LEAD write fails — callers must surface an honest error,
 * never a fake success. Newsletter wiring failures are non-blocking.
 */
export async function captureAssessmentLead(
  input: AssessmentLeadInput,
): Promise<AssessmentLeadResult> {
  const normalizedEmail = input.email.toLowerCase();

  // Optional dedupe — the PDF route's EmailGate already posted this lead.
  if (input.dedupeWindowMs && input.dedupeWindowMs > 0) {
    const recent = await prisma.assessmentLead.findFirst({
      where: {
        email: normalizedEmail,
        assessmentType: input.assessmentType,
        createdAt: { gte: new Date(Date.now() - input.dedupeWindowMs) },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (recent) {
      return { leadId: recent.id, deduped: true };
    }
  }

  // ─── Persist to database FIRST — leads must never be lost ────────────
  const lead = await prisma.assessmentLead.create({
    data: {
      email: normalizedEmail,
      company: input.company || null,
      role: input.role || null,
      assessmentType: input.assessmentType,
      consentNewsletter: input.consentNewsletter,
      source: "assessment-results",
      ipAddress: input.ipAddress,
      userAgent: input.userAgent ? input.userAgent.slice(0, 500) : null,
    },
  });

  logger.info("Assessment lead created", {
    id: lead.id,
    email: maskEmail(normalizedEmail),
    assessmentType: input.assessmentType,
    consentNewsletter: input.consentNewsletter,
  });

  // ─── Newsletter opt-in (explicit consent only) ────────────────────────
  if (input.consentNewsletter) {
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

  return { leadId: lead.id, deduped: false };
}
