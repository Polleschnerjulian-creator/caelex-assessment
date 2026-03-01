/**
 * Assure Request Access API
 *
 * POST /api/assure/request-access — Submit an access request for Caelex Assure
 *
 * Public endpoint with rate limiting.
 * Creates a DemoRequest record (source: "assure") and sends confirmation + admin emails.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
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

const requestSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Invalid email format").max(320),
  company: z.string().min(1, "Company name is required").max(200),
  role: z.string().max(200).optional(),
  fundingStage: z.string().max(200).optional(),
  operatorType: z.string().max(200).optional(),
  message: z.string().max(5000).optional(),
  _hp: z.string().max(0).optional(), // honeypot
});

export async function POST(request: NextRequest) {
  try {
    const ip = getIdentifier(request);
    const rateLimitResult = await checkRateLimit("public_api", ip);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    // Honeypot check
    if (parsed.data._hp) {
      return NextResponse.json({ success: true });
    }

    const { name, email, company, role, fundingStage, operatorType, message } =
      parsed.data;

    const followUpAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const demoRequest = await prisma.demoRequest.create({
      data: {
        name,
        email,
        company,
        role: [role, fundingStage, operatorType].filter(Boolean).join(" · "),
        message: message || null,
        source: "assure",
        status: "NEW",
        followUpAt,
      },
    });

    logger.info("Assure access request created", {
      id: demoRequest.id,
      email,
      company,
    });

    // Confirmation email
    await sendEmail({
      to: email,
      subject: "Your Caelex Assure access request — we'll be in touch",
      html: `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <div style="padding: 32px 0; border-bottom: 1px solid #eee;">
            <h2 style="color: #10B981; margin: 0; font-size: 20px;">Caelex Assure</h2>
          </div>
          <div style="padding: 32px 0;">
            <p style="line-height: 1.7; margin: 0 0 16px 0;">
              Hi ${escapeHtml(name)},
            </p>
            <p style="line-height: 1.7; margin: 0 0 16px 0;">
              Thank you for your interest in Caelex Assure. We've received your request
              and our team will reach out within 24 hours to schedule a personalized onboarding.
            </p>
            <p style="line-height: 1.7; margin: 0 0 24px 0;">
              In the meantime, you can explore our free
              <a href="https://caelex.eu/assessment" style="color: #10B981; text-decoration: none; font-weight: 500;">compliance assessment</a>
              to get a head start on your regulatory profile.
            </p>
            <div style="background: #f8faf9; border-radius: 12px; padding: 20px; border: 1px solid #e5ebe8;">
              <p style="margin: 0 0 8px 0; font-weight: 600; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">What happens next</p>
              <ol style="margin: 0; padding: 0 0 0 20px; line-height: 1.8; color: #555;">
                <li>Our team reviews your profile (within 24h)</li>
                <li>We schedule a brief onboarding call</li>
                <li>You get full access to Caelex Assure</li>
              </ol>
            </div>
          </div>
          <div style="padding: 24px 0; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #999; margin: 0;">
              Caelex — Space Regulatory Compliance & Investment Readiness Platform
            </p>
          </div>
        </div>
      `,
    });

    // Admin notification
    await sendEmail({
      to: "cs@caelex.eu",
      subject: `🚀 Assure Access Request: ${escapeHtml(name)} — ${escapeHtml(company)}`,
      html: `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #111; margin-bottom: 24px;">New Assure Access Request</h2>
          <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin-bottom: 20px; border: 1px solid #bbf7d0;">
            <p style="margin: 0 0 10px 0;"><strong>Name:</strong> ${escapeHtml(name)}</p>
            <p style="margin: 0 0 10px 0;"><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
            <p style="margin: 0 0 10px 0;"><strong>Company:</strong> ${escapeHtml(company)}</p>
            ${role ? `<p style="margin: 0 0 10px 0;"><strong>Role:</strong> ${escapeHtml(role)}</p>` : ""}
            ${fundingStage ? `<p style="margin: 0 0 10px 0;"><strong>Funding Stage:</strong> ${escapeHtml(fundingStage)}</p>` : ""}
            ${operatorType ? `<p style="margin: 0 0 10px 0;"><strong>Operator Type:</strong> ${escapeHtml(operatorType)}</p>` : ""}
          </div>
          ${
            message
              ? `
          <div style="background: #fff; border: 1px solid #e5e5e5; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
            <p style="margin: 0 0 8px 0; font-weight: 600; color: #666; font-size: 12px; text-transform: uppercase;">Message</p>
            <p style="margin: 0; white-space: pre-wrap; color: #333; line-height: 1.6;">${escapeHtml(message)}</p>
          </div>
          `
              : ""
          }
          <p style="font-size: 12px; color: #999;">
            Follow-up by ${followUpAt.toISOString().split("T")[0]}.
            <a href="https://caelex.eu/dashboard/admin" style="color: #10B981;">Open admin panel →</a>
          </p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Assure access request failed", error);
    return NextResponse.json(
      {
        error: getSafeErrorMessage(
          error,
          "Failed to submit request. Please try again.",
        ),
      },
      { status: 500 },
    );
  }
}
