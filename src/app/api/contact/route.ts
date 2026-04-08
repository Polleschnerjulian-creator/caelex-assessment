/**
 * Contact Form API
 *
 * POST /api/contact — Submit a contact form message.
 *
 * Public endpoint with rate limiting and honeypot bot protection.
 *
 * Flow:
 *   1. Validate input with Zod
 *   2. Check honeypot — silently succeed if filled (bot)
 *   3. Persist ContactRequest record (so no lead is lost if email fails)
 *   4. Send notification email to cs@caelex.eu
 *   5. Return success
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { logger, maskEmail } from "@/lib/logger";
import { getSafeErrorMessage } from "@/lib/validations";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Map the user-facing subject strings to the Prisma enum
const SUBJECT_MAP = {
  "General Inquiry": "GENERAL_INQUIRY",
  "Platform Demo": "PLATFORM_DEMO",
  "Enterprise Sales": "ENTERPRISE_SALES",
  Partnership: "PARTNERSHIP",
  Support: "SUPPORT",
} as const;

const contactSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Invalid email format").max(320),
  company: z.string().max(200).optional(),
  subject: z
    .enum([
      "General Inquiry",
      "Platform Demo",
      "Enterprise Sales",
      "Partnership",
      "Support",
      "",
    ])
    .optional(),
  message: z.string().min(1, "Message is required").max(5000),
  _hp: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 per hour per IP
    const identifier = getIdentifier(request);
    const rateLimitResult = await checkRateLimit("contact", identifier);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const body = await request.json();
    const parsed = contactSchema.safeParse(body);

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

    const { name, email, company, subject, message } = parsed.data;
    const subjectEnum =
      subject && subject in SUBJECT_MAP
        ? SUBJECT_MAP[subject as keyof typeof SUBJECT_MAP]
        : "OTHER";

    // ─── Persist to database FIRST — leads must never be lost ────────────
    const userAgent = request.headers.get("user-agent") || null;
    const contactRequest = await prisma.contactRequest.create({
      data: {
        name,
        email,
        company: company || null,
        subject: subjectEnum,
        message,
        source: "website",
        status: "NEW",
        ipAddress: identifier === "unknown" ? null : identifier,
        userAgent: userAgent ? userAgent.slice(0, 500) : null,
      },
    });

    logger.info("Contact request created", {
      id: contactRequest.id,
      email: maskEmail(email),
      subject: subjectEnum,
    });

    // ─── Send notification email ─────────────────────────────────────────
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        await resend.emails.send({
          from: "Caelex Contact <noreply@caelex.eu>",
          to: "cs@caelex.eu",
          replyTo: email,
          subject: `New Contact: ${escapeHtml(name)}${company ? ` (${escapeHtml(company)})` : ""} — ${subject || "General"}`,
          html: `
            <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; color: #111;">
              <h2 style="font-size: 20px; font-weight: 600; margin: 0 0 24px 0;">New contact form submission</h2>

              <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <p style="margin: 0 0 12px 0;"><strong>Name:</strong> ${escapeHtml(name)}</p>
                <p style="margin: 0 0 12px 0;"><strong>Email:</strong> ${escapeHtml(email)}</p>
                ${company ? `<p style="margin: 0 0 12px 0;"><strong>Company:</strong> ${escapeHtml(company)}</p>` : ""}
                <p style="margin: 0;"><strong>Subject:</strong> ${escapeHtml(subject || "General Inquiry")}</p>
              </div>

              <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px;">
                <p style="margin: 0 0 8px 0; font-weight: 600; color: #6b7280;">Message:</p>
                <p style="margin: 0; white-space: pre-wrap; color: #111;">${escapeHtml(message)}</p>
              </div>

              <p style="margin-top: 24px; font-size: 12px; color: #9ca3af;">
                Manage in the <a href="https://caelex.eu/dashboard/admin/contact-requests" style="color: #111;">admin panel</a>.
              </p>
            </div>
          `,
        });
      } catch (emailError) {
        // Email failed but the record is already saved — log and continue
        logger.error("Failed to send contact notification email", {
          error: emailError,
          contactRequestId: contactRequest.id,
        });
      }
    } else {
      logger.warn(
        "RESEND_API_KEY not configured — contact request saved without email",
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Contact form error", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to send message") },
      { status: 500 },
    );
  }
}
