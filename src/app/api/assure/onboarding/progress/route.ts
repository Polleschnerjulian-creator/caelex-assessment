/**
 * Assure Onboarding Progress API
 *
 * GET:  Load current onboarding step + profile + pre-fill data from DemoRequest.
 * PATCH: Save step progress (upsert AssureCompanyProfile with new step number).
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  validateCsrfToken,
} from "@/lib/csrf";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const progressSchema = z.object({
  step: z.number().int().min(0).max(7),
  data: z.record(z.string(), z.unknown()).optional(),
});

/**
 * GET /api/assure/onboarding/progress
 *
 * Returns the current onboarding step, the AssureCompanyProfile (if any),
 * and pre-fill data from the most recent DemoRequest with source "assure-demo"
 * matching the authenticated user's email.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const identifier = getIdentifier(req, session.user.id);
    const rateLimit = await checkRateLimit("api", identifier);
    if (!rateLimit.success) {
      return createRateLimitResponse(rateLimit);
    }

    // Resolve organization via membership
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      include: { organization: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    const organizationId = membership.organizationId;

    // Load existing profile (may be null if onboarding has not started)
    const profile = await prisma.assureCompanyProfile.findUnique({
      where: { organizationId },
    });

    // Look up most recent DemoRequest by user email with source "assure-demo"
    // for pre-filling onboarding wizard fields
    let preFill: Record<string, unknown> | null = null;

    if (session.user.email) {
      const demoRequest = await prisma.demoRequest.findFirst({
        where: {
          email: session.user.email,
          source: "assure-demo",
        },
        orderBy: { createdAt: "desc" },
      });

      if (demoRequest) {
        preFill = {
          name: demoRequest.name,
          email: demoRequest.email,
          company: demoRequest.company,
          role: demoRequest.role,
          companyWebsite: demoRequest.companyWebsite,
          operatorType: demoRequest.operatorType,
          fundingStage: demoRequest.fundingStage,
          isRaising: demoRequest.isRaising,
          targetRaise: demoRequest.targetRaise,
          message: demoRequest.message,
        };
      }
    }

    return NextResponse.json({
      currentStep: profile?.onboardingStep ?? 0,
      profile,
      preFill,
    });
  } catch (error) {
    logger.error("Assure onboarding progress GET error", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Internal server error") },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/assure/onboarding/progress
 *
 * Updates the onboarding step for the user's organization.
 * Upserts AssureCompanyProfile so it works for first-time and returning users.
 *
 * Body: { step: number (0-7), data?: Record<string, unknown> }
 */
export async function PATCH(req: NextRequest) {
  try {
    // Defense-in-depth CSRF check (middleware enforces this for all mutating requests)
    const cookieStore = await cookies();
    const csrfCookie = cookieStore.get(CSRF_COOKIE_NAME)?.value;
    const csrfHeader = req.headers.get(CSRF_HEADER_NAME);
    if (!(await validateCsrfToken(csrfCookie, csrfHeader))) {
      return NextResponse.json(
        { error: "Invalid CSRF token" },
        { status: 403 },
      );
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const identifier = getIdentifier(req, session.user.id);
    const rateLimit = await checkRateLimit("api", identifier);
    if (!rateLimit.success) {
      return createRateLimitResponse(rateLimit);
    }

    // Parse and validate request body
    const body = await req.json();
    const parsed = progressSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { step } = parsed.data;

    // Resolve organization via membership
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      include: { organization: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    const organizationId = membership.organizationId;

    // Upsert profile with new onboarding step
    await prisma.assureCompanyProfile.upsert({
      where: { organizationId },
      create: {
        organizationId,
        companyName: membership.organization.name,
        onboardingStep: step,
      },
      update: {
        onboardingStep: step,
      },
    });

    return NextResponse.json({ success: true, step });
  } catch (error) {
    logger.error("Assure onboarding progress PATCH error", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Internal server error") },
      { status: 500 },
    );
  }
}
