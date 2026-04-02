/**
 * Public CRA Product Classification Endpoint
 *
 * Unauthenticated, rate-limited. Returns full classification with
 * reasoning chain — no teaser gate. This is the top-of-funnel.
 */

import { NextRequest, NextResponse } from "next/server";
import { classifyCRAProduct } from "@/lib/cra-engine.server";
import { CRAClassifySchema } from "@/lib/validations/api-compliance";
import type { CRAAssessmentAnswers } from "@/lib/cra-types";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";

export async function POST(request: NextRequest) {
  try {
    // Rate limit: public unauthenticated endpoint — 5/hr per IP
    const ip = getIdentifier(request);
    const rateLimitResult = await checkRateLimit("public_api", ip);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": "3600" } },
      );
    }

    const body = await request.json();
    const parsed = CRAClassifySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const answers: CRAAssessmentAnswers = {
      economicOperatorRole: parsed.data.economicOperatorRole ?? "manufacturer",
      isEUEstablished: parsed.data.isEUEstablished ?? null,
      spaceProductTypeId: parsed.data.spaceProductTypeId ?? null,
      productName: parsed.data.productName ?? "Unnamed Product",
      segments: (parsed.data.segments as CRAAssessmentAnswers["segments"]) ?? [
        "space",
      ],
      hasNetworkFunction: parsed.data.hasNetworkFunction ?? null,
      processesAuthData: parsed.data.processesAuthData ?? null,
      usedInCriticalInfra: parsed.data.usedInCriticalInfra ?? null,
      performsCryptoOps: parsed.data.performsCryptoOps ?? null,
      controlsPhysicalSystem: parsed.data.controlsPhysicalSystem ?? null,
      hasMicrocontroller: parsed.data.hasMicrocontroller ?? null,
      isOSSComponent: parsed.data.isOSSComponent ?? null,
      isCommerciallySupplied: parsed.data.isCommerciallySupplied ?? null,
      isSafetyCritical: parsed.data.isSafetyCritical ?? null,
      hasRedundancy: null,
      processesClassifiedData: null,
      hasIEC62443: null,
      hasETSIEN303645: null,
      hasCommonCriteria: null,
      hasISO27001: null,
    };

    const result = classifyCRAProduct(answers);

    return NextResponse.json({
      success: true,
      data: {
        productClassification: result.classification,
        classificationReasoning: result.classificationReasoning,
        conformityRoute: result.conformityRoute,
        conflict: result.conflict ?? null,
        isOutOfScope: result.isOutOfScope,
        outOfScopeReason: result.outOfScopeReason ?? null,
      },
      meta: {
        engine: "cra",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Classification failed" },
      { status: 500 },
    );
  }
}
