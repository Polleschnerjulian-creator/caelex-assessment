import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { logger, maskEmail } from "@/lib/logger";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";

/**
 * POST /api/auth/forgot-password
 *
 * Accepts an email and — if a matching account exists — generates a
 * single-use, 60-minute password-reset token, stores its SHA-256 hash,
 * and emails the raw token back to the user via Resend as a link to
 * /atlas-reset-password. Always responds 200 regardless of whether
 * the email exists: a public endpoint that distinguished the two
 * would be a trivial account-enumeration oracle.
 *
 * Audit: docs/security/atlas-audit-2026-04-22.md (C-4). Previously
 * this endpoint was a log-only stub — users had no self-service
 * recovery path.
 */

export const runtime = "nodejs";

const Schema = z.object({
  email: z.string().email().max(254).toLowerCase(),
  /// Which surface launched the reset. Drives both the link target
  /// (caelex → /reset-password, atlas → /atlas-reset-password) and the
  /// email branding. Defaults to atlas for backwards compat with
  /// existing /atlas-forgot-password requests that don't send it.
  intent: z.enum(["caelex", "atlas"]).optional().default("atlas"),
});

const TOKEN_TTL_MINUTES = 60;

function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export async function POST(request: NextRequest) {
  // `sensitive` tier = 5/hr/IP. Prevents mass email-generation attacks
  // against the Resend quota + keeps support noise down.
  const rl = await checkRateLimit("sensitive", getIdentifier(request));
  if (!rl.success) return createRateLimitResponse(rl);

  const body = await request.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  // Schema errors still respond 200 so a malformed request can't be
  // used to distinguish "bad email" from "no account".
  if (!parsed.success) {
    return NextResponse.json({ success: true });
  }

  const email = parsed.data.email;
  const intent = parsed.data.intent;
  const isAtlas = intent === "atlas";
  const productLabel = isAtlas ? "Caelex ATLAS" : "Caelex";
  const productLabelShort = isAtlas ? "ATLAS" : "Caelex";
  const resetPath = isAtlas ? "/atlas-reset-password" : "/reset-password";

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true },
    });

    // No user → silent success. Still log for analytics, but do it
    // with a masked email so log dumps can't feed enumeration.
    if (!user) {
      logger.info("forgot-password: no account", { email: maskEmail(email) });
      return NextResponse.json({ success: true });
    }

    // Invalidate any outstanding tokens for this user. Keeps the "one
    // active link at a time" contract simple and means an attacker
    // who intercepted an older link loses it the moment the user
    // (or attacker) hits forgot-password again.
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = sha256Hex(rawToken);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60_000);

    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    // Build the reset URL against the configured app URL — never
    // trust the Host header for link construction.
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXTAUTH_URL ||
      process.env.AUTH_URL ||
      "https://www.caelex.eu";
    const resetUrl = `${appUrl.replace(/\/+$/, "")}${resetPath}?token=${encodeURIComponent(rawToken)}`;

    // Send via Resend directly so we can stamp the Caelex ATLAS
    // sender + hi@caelex.eu reply-to (matches the invite flow).
    try {
      const { isEmailDispatchHalted, logHaltedEmail } =
        await import("@/lib/email/dispatch-halt");
      if (isEmailDispatchHalted()) {
        logHaltedEmail({
          to: email,
          subject: `Reset your ${productLabel} password`,
          origin: "api/auth/forgot-password",
        });
        return NextResponse.json({ ok: true }, { status: 200 });
      }
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      const greeting = user.name ? `Hi ${user.name.split(" ")[0]},` : "Hi,";
      await resend.emails.send({
        from: `${productLabel} <noreply@caelex.eu>`,
        to: email,
        replyTo: "hi@caelex.eu",
        subject: `Reset your ${productLabel} password`,
        html: `
          <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 560px; margin: 0 auto; color: #111;">
            <h2 style="font-size: 20px; font-weight: 600; margin: 0 0 20px 0;">
              Reset your ${productLabelShort} password
            </h2>
            <p style="line-height: 1.6; margin: 0 0 16px 0;">${greeting}</p>
            <p style="line-height: 1.6; margin: 0 0 16px 0;">
              We got a request to reset the password for your ${productLabel}
              account. Click the button below to set a new one — the link
              is valid for 60 minutes and can only be used once.
            </p>
            <p style="margin: 24px 0;">
              <a href="${resetUrl}"
                 style="display: inline-block; padding: 12px 20px; background: #0a0a0b; color: #f5f5f4; text-decoration: none; border-radius: 8px; font-weight: 500;">
                Reset password
              </a>
            </p>
            <p style="font-size: 13px; color: #6b7280; line-height: 1.55; margin: 16px 0 0 0;">
              Or copy this link into your browser:<br />
              <span style="word-break: break-all;">${resetUrl}</span>
            </p>
            <p style="font-size: 13px; color: #6b7280; line-height: 1.55; margin: 20px 0 0 0;">
              Didn&rsquo;t request this? You can safely ignore this email —
              your password won&rsquo;t change unless you click the link and
              choose a new one.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            <p style="font-size: 12px; color: #9ca3af;">
              ${
                isAtlas
                  ? "Caelex ATLAS — the searchable space-law database for law firms."
                  : "Caelex — the regulatory compliance platform for satellite operators."
              }<br />
              <a href="https://www.caelex.eu" style="color: #9ca3af;">caelex.eu</a>
            </p>
          </div>
        `,
      });
    } catch (emailErr) {
      // Email failure shouldn't leak through the 200 response — the
      // token stays valid in case Resend had a transient issue and
      // the retry on the user's end hits a working state.
      logger.warn("forgot-password email send failed (non-blocking)", {
        error: emailErr,
        userId: user.id,
      });
    }

    logger.info("forgot-password: reset token issued", {
      userId: user.id,
      email: maskEmail(email),
    });
  } catch (err) {
    logger.error("forgot-password handler failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    // Still 200 so the response shape never differs.
  }

  return NextResponse.json({ success: true });
}
