/**
 * POST /api/public/pulse/detect — Sprint 4A
 *
 * Anonymous cross-verification entry point. Funnel-stage-1: a prospect
 * lands on caelex.eu/pulse, types their company name + VAT-ID + email,
 * we run the same VIES + GLEIF + UNOOSA + CelesTrak detection that the
 * authenticated app uses, and return the verification summary.
 *
 * **No authentication.** Rate-limited per-IP (3/hr Redis, 1/hr in-memory
 * fallback). Each call:
 *
 *   1. Validates input with Zod (rejects garbage before hitting external APIs)
 *   2. Captures a PulseLead row with email + IP + UTM tracking
 *   3. Calls `dispatchAnonymous()` — runs all four adapters with
 *      `persist: false` (no evidence rows written; the prospect doesn't
 *      have an org yet)
 *   4. Stores the detection result back onto the lead row
 *   5. Returns a sanitized PulseDetectResponse (no rawArtifact leakage)
 *
 * **Privacy:** the only PII we capture is email + legalName + vatId. No
 * cookies, no tracking pixels, no third-party analytics calls.
 *
 * **Idempotence:** every call creates a new PulseLead row, even from the
 * same email. That's intentional — the analytics value is per-attempt
 * funnel data, not a deduped contact list. Sprint 5+ may add dedup logic.
 *
 * **CORS:** `*` because the funnel page lives on a different subdomain
 * (caelex.eu/pulse vs app.caelex.com).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  applyCorsHeaders,
  handleCorsPreflightResponse,
} from "@/lib/cors.server";
import {
  checkRateLimit,
  createRateLimitHeaders,
  createRateLimitResponse,
  getIdentifier,
} from "@/lib/ratelimit";
import {
  PulseDetectSchema,
  type PulseDetectResponse,
} from "@/lib/validations/pulse";
import { dispatchAnonymous } from "@/lib/operator-profile/auto-detection/dispatcher.server";
import type { CrossVerificationResult } from "@/lib/operator-profile/auto-detection/types";

export const runtime = "nodejs";
export const maxDuration = 30;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pulseLead = (prisma as any).pulseLead;

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return handleCorsPreflightResponse(origin, "*");
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");

  // 1. Rate-limit per IP — pulse tier (3/hr Redis, 1/hr in-memory)
  const identifier = getIdentifier(request);
  const rateLimit = await checkRateLimit("pulse", identifier);
  if (!rateLimit.success) {
    return applyCorsHeaders(createRateLimitResponse(rateLimit), origin, "*");
  }

  // 2. Parse + validate
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return applyCorsHeaders(
      NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
      origin,
      "*",
    );
  }

  const parsed = PulseDetectSchema.safeParse(body);
  if (!parsed.success) {
    return applyCorsHeaders(
      NextResponse.json(
        {
          error: "Validation failed",
          issues: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 },
      ),
      origin,
      "*",
    );
  }

  const input = parsed.data;

  // 3. Create lead row first (so we still capture the prospect's info
  //    even if external sources are down). detectionResult populated later.
  const ipAddress = identifier.startsWith("ip:")
    ? identifier.slice(3)
    : identifier;
  const userAgent = request.headers.get("user-agent") ?? null;

  let lead: { id: string; createdAt: Date };
  try {
    lead = await pulseLead.create({
      data: {
        legalName: input.legalName,
        vatId: input.vatId ?? null,
        email: input.email,
        ipAddress,
        userAgent,
        utmSource: input.utmSource ?? null,
        utmMedium: input.utmMedium ?? null,
        utmCampaign: input.utmCampaign ?? null,
        referrer: input.referrer ?? null,
      },
      select: { id: true, createdAt: true },
    });
  } catch (err) {
    logger.error("[pulse-detect] PulseLead create failed", err);
    return applyCorsHeaders(
      NextResponse.json(
        { error: "Lead capture failed; please try again later" },
        { status: 500 },
      ),
      origin,
      "*",
    );
  }

  // 4. Run anonymous cross-verification
  let detection: CrossVerificationResult;
  try {
    detection = await dispatchAnonymous({
      legalName: input.legalName,
      vatId: input.vatId,
      establishment: input.establishment,
    });
  } catch (err) {
    // dispatchAnonymous shouldn't throw (adapters return structured outcomes)
    // but guard for runtime issues with logger / DB / etc. Lead row stays;
    // we just return a partial response.
    logger.error("[pulse-detect] dispatchAnonymous threw unexpectedly", {
      leadId: lead.id,
      err: (err as Error).message ?? String(err),
    });
    return applyCorsHeaders(
      NextResponse.json(
        {
          leadId: lead.id,
          receivedAt: lead.createdAt.toISOString(),
          successfulSources: [],
          failedSources: [],
          mergedFields: [],
          warnings: [
            "Detection failed — your information was captured. We'll follow up by email.",
          ],
          bestPossibleTier: "T0_UNVERIFIED" as const,
        } satisfies PulseDetectResponse,
        { status: 200 },
      ),
      origin,
      "*",
    );
  }

  // 5. Update lead with detection snapshot (best-effort — failure here
  //    doesn't block the response).
  const successfulSources = detection.successfulOutcomes.map((o) => o.source);
  const failedSources = detection.failures.map((f) => ({
    source: f.source,
    errorKind: f.errorKind,
    message: f.message,
  }));
  const mergedFields = detection.mergedFields.map((m) => ({
    fieldName: m.fieldName,
    value: m.chosenValue,
    agreementCount: m.agreementCount,
    contributingAdapters: m.contributingAdapters,
  }));
  const warnings: string[] = detection.successfulOutcomes.flatMap(
    (o) => o.warnings,
  );

  try {
    await pulseLead.update({
      where: { id: lead.id },
      data: {
        detectionResult: {
          successfulSources,
          failedSources,
          mergedFields,
          warnings,
          startedAt: detection.startedAt.toISOString(),
          finishedAt: detection.finishedAt.toISOString(),
        },
      },
    });
  } catch (err) {
    logger.warn("[pulse-detect] lead-snapshot update failed (non-fatal)", {
      error: (err as Error).message ?? String(err),
    });
  }

  // 6. Build sanitized response. bestPossibleTier is T2_SOURCE_VERIFIED
  //    when ≥1 field merged; T0_UNVERIFIED otherwise.
  const bestPossibleTier =
    mergedFields.length > 0 ? "T2_SOURCE_VERIFIED" : "T0_UNVERIFIED";

  const response: PulseDetectResponse = {
    leadId: lead.id,
    receivedAt: lead.createdAt.toISOString(),
    successfulSources,
    failedSources,
    mergedFields,
    warnings,
    bestPossibleTier,
  };

  const corsResponse = applyCorsHeaders(
    NextResponse.json(response, { status: 200 }),
    origin,
    "*",
  );
  // Surface rate-limit headers so the frontend can show "X requests left".
  // createRateLimitHeaders returns a `Headers` object — iterate it directly.
  const rateLimitHeaders = createRateLimitHeaders(rateLimit);
  rateLimitHeaders.forEach((value, key) => {
    corsResponse.headers.set(key, value);
  });
  return corsResponse;
}
