import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { sendEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import crypto from "crypto";

// ─── POST /api/stakeholder/mfa — Send OTP to stakeholder email ───

const sendSchema = z.object({
  engagementId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limit: mfa tier (5/min) to prevent OTP spam
    const rl = await checkRateLimit("mfa", getIdentifier(request));
    if (!rl.success) return createRateLimitResponse(rl);

    const body = await request.json();
    const parsed = sendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { engagementId } = parsed.data;

    // Verify the engagement exists and MFA is required
    const engagement = await prisma.stakeholderEngagement.findUnique({
      where: { id: engagementId },
      select: {
        id: true,
        contactEmail: true,
        contactName: true,
        mfaRequired: true,
        organization: { select: { name: true } },
      },
    });

    if (!engagement) {
      return NextResponse.json(
        { error: "Engagement not found" },
        { status: 404 },
      );
    }

    if (!engagement.mfaRequired) {
      return NextResponse.json(
        { error: "MFA is not required for this engagement" },
        { status: 400 },
      );
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    const xff = request.headers.get("x-forwarded-for");
    const ipAddress = xff
      ? xff.split(",").pop()?.trim() || null
      : request.headers.get("x-real-ip") || null;

    // Store OTP hash in a StakeholderAccessLog entry (metadata field)
    await prisma.stakeholderAccessLog.create({
      data: {
        engagementId,
        action: "MFA_OTP_SENT",
        ipAddress,
        metadata: { otpHash },
      },
    });

    // Send email with OTP
    if (engagement.contactEmail) {
      try {
        await sendEmail({
          to: engagement.contactEmail,
          subject: "Caelex — Sicherheitscode / Security Code",
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-block; width: 48px; height: 48px; border-radius: 12px; background: #10B98115; line-height: 48px; font-size: 24px;">&#128274;</div>
              </div>
              <p style="color: #334155; font-size: 15px; line-height: 1.6;">
                Hello ${engagement.contactName || ""},
              </p>
              <p style="color: #334155; font-size: 15px; line-height: 1.6;">
                Your security code for the ${engagement.organization?.name || "Caelex"} Compliance Portal:
              </p>
              <div style="text-align: center; margin: 28px 0;">
                <span style="font-size: 36px; letter-spacing: 10px; font-family: 'SF Mono', 'Fira Code', monospace; color: #0F172A; font-weight: 600; background: #F1F5F9; padding: 12px 24px; border-radius: 12px; border: 1px solid #E2E8F0;">${otp}</span>
              </div>
              <p style="color: #64748B; font-size: 13px; line-height: 1.5;">
                This code expires in <strong>10 minutes</strong>. If you did not request this code, please ignore this message.
              </p>
              <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;" />
              <p style="color: #94A3B8; font-size: 11px; text-align: center;">
                Caelex Compliance Platform &mdash; Secure Stakeholder Access
              </p>
            </div>
          `,
        });
      } catch (emailErr) {
        logger.error("Failed to send stakeholder MFA OTP email", emailErr);
        // Still return success since OTP was generated -- stakeholder can request resend
      }
    }

    return NextResponse.json({ sent: true, expiresIn: 600 });
  } catch (error) {
    logger.error("Stakeholder MFA send error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ─── PUT /api/stakeholder/mfa — Verify OTP ───

const verifySchema = z.object({
  engagementId: z.string().min(1),
  otp: z
    .string()
    .length(6)
    .regex(/^\d{6}$/),
});

export async function PUT(request: NextRequest) {
  try {
    // Rate limit: mfa tier (5/min) to prevent brute force
    const rl = await checkRateLimit("mfa", getIdentifier(request));
    if (!rl.success) return createRateLimitResponse(rl);

    const body = await request.json();
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { valid: false, error: "Invalid code format" },
        { status: 400 },
      );
    }

    const { engagementId, otp } = parsed.data;
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    // Find the most recent OTP log entry within the 10-minute window
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const otpLog = await prisma.stakeholderAccessLog.findFirst({
      where: {
        engagementId,
        action: "MFA_OTP_SENT",
        createdAt: { gte: tenMinutesAgo },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otpLog || !otpLog.metadata) {
      return NextResponse.json(
        {
          valid: false,
          error: "No pending verification. Please request a new code.",
        },
        { status: 401 },
      );
    }

    // Compare hashes
    const storedHash = (otpLog.metadata as { otpHash?: string }).otpHash;
    if (!storedHash || storedHash !== otpHash) {
      return NextResponse.json(
        { valid: false, error: "Invalid or expired code" },
        { status: 401 },
      );
    }

    const xff = request.headers.get("x-forwarded-for");
    const ipAddress = xff
      ? xff.split(",").pop()?.trim() || null
      : request.headers.get("x-real-ip") || null;

    // Log successful verification
    await prisma.stakeholderAccessLog.create({
      data: {
        engagementId,
        action: "MFA_VERIFIED",
        ipAddress,
        metadata: { method: "email_otp" },
      },
    });

    return NextResponse.json({ valid: true });
  } catch (error) {
    logger.error("Stakeholder MFA verify error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
