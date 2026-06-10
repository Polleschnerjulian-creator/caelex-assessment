/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * POST /api/assessment/v2/pdf/quick — the email-gated quick-check summary PDF
 * (plan Task 2.4).
 *
 * Founder decision §11.2: the on-screen quick result is FREE without an
 * email; the PDF is email-gated. That gate is enforced HERE, server-side —
 * `email` is REQUIRED in the schema, so a direct API call cannot bypass the
 * gate the UI shows (the EmailGate modal).
 *
 * Contract:
 *   - PUBLIC route (anonymous quick tier) — `export` rate-limit tier,
 *     honeypot bot protection (silent success, no writes, no PDF).
 *   - Ownership, no enumeration: the profile must belong to the caller —
 *     either the httpOnly anonymous-profile cookie matches the profile's
 *     `anonymousId`, or the signed-in user owns it. Anything else is a 404
 *     (indistinguishable from "not found").
 *   - Persists the lead via the SAME logic as /api/assessment/lead
 *     (lead-capture.server.ts, the 2026-06-10 honesty hotfix): unchecked
 *     consent default, double-opt-in newsletter, lead row FIRST. A 15-minute
 *     dedupe window avoids double rows when the EmailGate modal already
 *     posted the lead seconds earlier.
 *   - Streams the PDF rendered from the STORED latest QUICK verdict snapshot
 *     — never recomputed from client-supplied answers (honesty invariant 3).
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  createRateLimitResponse,
  getIdentifier,
} from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import { captureAssessmentLead } from "@/lib/assessment/lead-capture.server";
import { readAssessmentProfileCookie } from "@/lib/assessment/assessment-profile";
import { buildQuickSummaryPdf } from "@/lib/pdf/assessment/quick-summary.server";

export const runtime = "nodejs";

/** EmailGate posts the lead itself moments earlier — don't write a 2nd row. */
const LEAD_DEDUPE_WINDOW_MS = 15 * 60 * 1000;

const bodySchema = z.object({
  profileId: z.string().min(1),
  // Email REQUIRED — the PDF gate is server-enforced (founder §11.2).
  email: z.string().email("Invalid email format").max(320),
  company: z.string().max(200).optional(),
  role: z.string().max(200).optional(),
  consentNewsletter: z.boolean().optional().default(false),
  // Acquisition attribution (utm_source carried via sessionStorage from the
  // landing URL). Slug-sanitized server-side; junk falls back to the default.
  source: z.string().max(60).optional(),
  _hp: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    // ─── Rate limit (export tier — generated-document download) ───
    const session = await auth().catch(() => null);
    const userId = session?.user?.id ?? undefined;
    const rl = await checkRateLimit("export", getIdentifier(request, userId));
    if (!rl.success) return createRateLimitResponse(rl);

    // ─── Parse + validate (email REQUIRED — the server-side gate) ───
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    // Honeypot: silently succeed — no writes, no PDF, nothing for the bot.
    if (parsed.data._hp) {
      return NextResponse.json({ success: true });
    }

    const { profileId, email, company, role, consentNewsletter, source } =
      parsed.data;

    // ─── Ownership (no enumeration — foreign/missing profile is one 404) ───
    const profile = await prisma.operatorAssessmentProfile.findUnique({
      where: { id: profileId },
      select: { id: true, anonymousId: true, userId: true },
    });
    const anonymousCookie = readAssessmentProfileCookie(request);
    const ownsProfile =
      profile !== null &&
      ((profile.anonymousId !== null &&
        anonymousCookie !== null &&
        profile.anonymousId === anonymousCookie) ||
        (profile.userId !== null &&
          userId !== undefined &&
          profile.userId === userId));
    if (!ownsProfile) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // ─── The STORED latest QUICK verdict — never recomputed from the client ───
    const snapshot = await prisma.assessmentVerdictSnapshot.findFirst({
      where: { profileId, tier: "QUICK" },
      orderBy: { createdAt: "desc" },
    });
    if (!snapshot) {
      return NextResponse.json(
        { error: "No quick-check result for this profile yet" },
        { status: 404 },
      );
    }

    // ─── Lead capture — the SAME logic as /api/assessment/lead (hotfix) ───
    const identifier = getIdentifier(request);
    const userAgent = request.headers.get("user-agent") || null;
    await captureAssessmentLead({
      email,
      company,
      role,
      assessmentType: "quick-check",
      consentNewsletter,
      source,
      ipAddress: identifier === "unknown" ? null : identifier,
      userAgent,
      dedupeWindowMs: LEAD_DEDUPE_WINDOW_MS,
    });

    // ─── Render the PDF from the stored result ───
    const pdf = buildQuickSummaryPdf(snapshot.result, { email, company });

    return new NextResponse(Buffer.from(pdf.bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${pdf.filename}"`,
        "Cache-Control": "no-store",
        "X-Caelex-Summary-Hash": pdf.contentHash,
      },
    });
  } catch (error) {
    logger.error("assessment v2 quick pdf failed", error);
    return NextResponse.json(
      { error: "Failed to generate the PDF summary" },
      { status: 500 },
    );
  }
}
