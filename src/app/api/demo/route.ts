/**
 * Demo Request API
 *
 * POST /api/demo — Submit a demo request
 *
 * Public endpoint with rate limiting.
 * Creates a DemoRequest record and sends confirmation + admin notification emails.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { getSafeErrorMessage } from "@/lib/validations";
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
    // Rate limit
    const ip = getIdentifier(request);
    const rateLimitResult = await checkRateLimit("public_api", ip);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const body = await request.json();
    const { name, email, company, role, message } = body;

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json(
        { error: "Missing required fields: name and email are required" },
        { status: 400 },
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 },
      );
    }

    // Create demo request with 48h follow-up
    const followUpAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const demoRequest = await prisma.demoRequest.create({
      data: {
        name,
        email,
        company: company || null,
        role: role || null,
        message: message || null,
        source: "website",
        status: "NEW",
        followUpAt,
      },
    });

    logger.info("Demo request created", { id: demoRequest.id, email });

    // Send confirmation email to requester
    await sendEmail({
      to: email,
      subject: "Thank you for requesting a demo — Caelex",
      html: `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3B82F6; margin-bottom: 24px;">Thank you for requesting a demo</h2>
          <p style="color: #333; line-height: 1.6;">
            Hi ${escapeHtml(name)},
          </p>
          <p style="color: #333; line-height: 1.6;">
            We have received your demo request and our team will be in touch within 48 hours
            to schedule a personalized walkthrough of the Caelex platform.
          </p>
          <p style="color: #333; line-height: 1.6;">
            In the meantime, feel free to explore our
            <a href="https://caelex.eu/resources/faq" style="color: #3B82F6;">FAQ</a>
            or run a free
            <a href="https://caelex.eu/assessment" style="color: #3B82F6;">compliance assessment</a>.
          </p>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
          <p style="font-size: 12px; color: #999;">
            Caelex — Space Regulatory Compliance Platform
          </p>
        </div>
      `,
    });

    // Send admin notification email
    await sendEmail({
      to: "cs@caelex.eu",
      subject: `New Demo Request: ${escapeHtml(name)}${company ? ` (${escapeHtml(company)})` : ""}`,
      html: `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #111; margin-bottom: 24px;">New Demo Request</h2>

          <div style="background: #f8f8f8; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <p style="margin: 0 0 12px 0;"><strong>Name:</strong> ${escapeHtml(name)}</p>
            <p style="margin: 0 0 12px 0;"><strong>Email:</strong> ${escapeHtml(email)}</p>
            ${company ? `<p style="margin: 0 0 12px 0;"><strong>Company:</strong> ${escapeHtml(company)}</p>` : ""}
            ${role ? `<p style="margin: 0 0 12px 0;"><strong>Role:</strong> ${escapeHtml(role)}</p>` : ""}
          </div>

          ${
            message
              ? `
          <div style="background: #fff; border: 1px solid #e5e5e5; border-radius: 8px; padding: 20px;">
            <p style="margin: 0 0 8px 0; font-weight: 600; color: #666;">Message:</p>
            <p style="margin: 0; white-space: pre-wrap; color: #333;">${escapeHtml(message)}</p>
          </div>
          `
              : ""
          }

          <p style="margin-top: 24px; font-size: 12px; color: #999;">
            Follow-up scheduled for ${followUpAt.toISOString().split("T")[0]}.
            Manage in the <a href="https://caelex.eu/dashboard/admin" style="color: #3B82F6;">admin panel</a>.
          </p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Demo request failed", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to submit demo request") },
      { status: 500 },
    );
  }
}
