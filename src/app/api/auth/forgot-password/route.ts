import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";

/**
 * POST /api/auth/forgot-password
 *
 * Accepts an email, responds 200 with {success: true} regardless of
 * whether that email maps to an existing account. This anti-enumeration
 * contract is deliberate: a public endpoint that leaks "account exists"
 * / "doesn't exist" gives attackers a trivial email-harvesting tool.
 *
 * TODO (follow-up): when an account exists, generate a secure reset
 * token (crypto.randomBytes(32).toString('hex')), persist it with an
 * expiry (≤ 60 min), and dispatch a Resend email pointing to
 * /atlas-reset-password?token=…. The /atlas-reset-password page + the
 * token-consuming POST /api/auth/reset-password endpoint round out the
 * flow. This stub intentionally defers that work — the UI is live so
 * Atlas users can discover the flow, and the API is shaped correctly
 * so wiring the real sender is a body-of-function change, not an
 * interface change.
 */

export const runtime = "nodejs";

const Schema = z.object({
  email: z.string().email().max(254).toLowerCase(),
});

export async function POST(request: NextRequest) {
  // Tight rate-limit — `sensitive` (5/hr) prevents mass-scanning the
  // endpoint for reset-email traffic generation. Without this, an
  // attacker could spray requests at random emails to DOS a Resend
  // quota or generate support noise.
  const rl = await checkRateLimit("sensitive", getIdentifier(request));
  if (!rl.success) return createRateLimitResponse(rl);

  const body = await request.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    // Schema errors still respond 200 {success:true} so a malformed
    // request can't be used to distinguish "bad email" from "no
    // account" — the only signal back is "we took your request."
    return NextResponse.json({ success: true });
  }

  const email = parsed.data.email;

  // Stub: log-only. Real implementation will:
  //   1. findUnique on User by email
  //   2. if exists → create PasswordResetToken row + send Resend email
  //   3. always return 200
  logger.info("forgot-password requested (stub — no email sent yet)", {
    email,
  });

  return NextResponse.json({ success: true });
}
