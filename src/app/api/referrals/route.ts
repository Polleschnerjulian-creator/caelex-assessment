/**
 * Referrals API
 * GET: List current user's referrals
 * POST: Create a new referral invite
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import {
  getUserReferrals,
  createReferral,
} from "@/lib/services/referral-service";
import { sendEmail } from "@/lib/email";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const referrals = await getUserReferrals(session.user.id);
    return NextResponse.json({ referrals });
  } catch (error) {
    console.error("Failed to fetch referrals:", error);
    return NextResponse.json(
      { error: "Failed to fetch referrals" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 },
      );
    }

    const referral = await createReferral(session.user.id, email);

    const baseUrl = process.env.AUTH_URL || "https://app.caelex.eu";
    const referralLink = `${baseUrl}/signup?ref=${referral.code}`;

    // Send invite email (best-effort, don't fail the request if email fails)
    try {
      await sendEmail({
        to: email,
        subject: `${session.user.name || "Someone"} invited you to Caelex`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background: #0F172A; color: #E2E8F0; border-radius: 12px;">
            <h1 style="color: #F8FAFC; font-size: 24px; margin-bottom: 16px;">You&rsquo;ve been invited to Caelex</h1>
            <p style="color: #94A3B8; font-size: 16px; line-height: 1.6;">
              ${session.user.name || "A colleague"} thinks you&rsquo;d benefit from Caelex &mdash; the space regulatory compliance platform for EU Space Act, NIS2, and national space laws.
            </p>
            <a href="${referralLink}" style="display: inline-block; margin-top: 24px; padding: 12px 28px; background: #3B82F6; color: #FFFFFF; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Get Started
            </a>
            <p style="color: #64748B; font-size: 13px; margin-top: 32px;">
              Or copy this link: <a href="${referralLink}" style="color: #3B82F6;">${referralLink}</a>
            </p>
          </div>
        `,
        text: `${session.user.name || "Someone"} invited you to Caelex. Sign up here: ${referralLink}`,
      });
    } catch (emailError) {
      console.warn("Failed to send referral invite email:", emailError);
    }

    return NextResponse.json({ referral, referralLink }, { status: 201 });
  } catch (error) {
    console.error("Failed to create referral:", error);
    return NextResponse.json(
      { error: "Failed to create referral" },
      { status: 500 },
    );
  }
}
