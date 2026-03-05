import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { logger } from "@/lib/logger";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 per hour per IP
    const identifier = getIdentifier(request);
    const rateLimitResult = await checkRateLimit("contact", identifier);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const contactSchema = z.object({
      name: z.string().min(1, "Name is required").max(200),
      email: z.string().email("Invalid email format").max(320),
      company: z.string().max(200).optional(),
      message: z.string().min(1, "Message is required").max(5000),
      _hp: z.string().optional(),
    });

    const body = await request.json();
    const parsed = contactSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { name, email, company, message } = parsed.data;

    // Honeypot: reject if hidden field is filled (bots fill all fields)
    if (parsed.data._hp) {
      // Silently succeed to not tip off the bot
      return NextResponse.json({ success: true });
    }

    // Send email via Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      logger.error("RESEND_API_KEY not configured");
      return NextResponse.json(
        { error: "Service temporarily unavailable" },
        { status: 503 },
      );
    }

    const resend = new Resend(resendApiKey);
    await resend.emails.send({
      from: "Caelex Contact <noreply@caelex.eu>",
      to: "cs@caelex.eu",
      replyTo: email,
      subject: `New Contact Form: ${escapeHtml(name)}${company ? ` (${escapeHtml(company)})` : ""}`,
      html: `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #111; margin-bottom: 24px;">New Contact Form Submission</h2>

          <div style="background: #f8f8f8; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <p style="margin: 0 0 12px 0;"><strong>Name:</strong> ${escapeHtml(name)}</p>
            <p style="margin: 0 0 12px 0;"><strong>Email:</strong> ${escapeHtml(email)}</p>
            ${company ? `<p style="margin: 0 0 12px 0;"><strong>Company:</strong> ${escapeHtml(company)}</p>` : ""}
          </div>

          <div style="background: #fff; border: 1px solid #e5e5e5; border-radius: 8px; padding: 20px;">
            <p style="margin: 0 0 8px 0; font-weight: 600; color: #666;">Message:</p>
            <p style="margin: 0; white-space: pre-wrap; color: #333;">${escapeHtml(message)}</p>
          </div>

          <p style="margin-top: 24px; font-size: 12px; color: #999;">
            This message was sent via the Caelex contact form.
          </p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Contact form error", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 },
    );
  }
}
