/**
 * GET /api/public/pulse/report/[leadId] — Sprint 4D
 *
 * Streams a 15-page branded PDF report for a previous Pulse run. Used
 * by the "Download report" button on /pulse + by the email-nurture flow
 * (Sprint 4E) which links to this URL.
 *
 * **Auth:** none — the leadId itself is the access token. CUIDs are
 * cryptographically opaque enough that knowing one is consent. We do
 * NOT enumerate (`/report` without a leadId returns 404). Each leadId
 * maps to exactly one PulseLead row; we never expose another user's
 * report.
 *
 * **Rate limit:** soft. Re-downloads of an existing report are cheap
 * (no external API hits — just renders the stored PulseLead.detectionResult
 * snapshot). We use the existing `pulse` tier so a malicious actor
 * who exhausted their detection-runs can't bypass via report-spam.
 *
 * **No external API calls during render** — the PDF is generated from
 * the lead's stored detection-snapshot. If the lead has no detection
 * (lead row created but adapters never ran), we render a placeholder
 * PDF that surfaces the empty state.
 *
 * **Privacy:** PDF prints the operator's legalName + vatId only.
 * email + IP + UA stay server-side on PulseLead.
 */

import React from "react";
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  applyCorsHeaders,
  handleCorsPreflightResponse,
} from "@/lib/cors.server";
import {
  checkRateLimit,
  createRateLimitResponse,
  getIdentifier,
} from "@/lib/ratelimit";
import {
  PulsePdfReport,
  type PulsePdfData,
} from "@/lib/pdf/reports/pulse/pulse-report";

export const runtime = "nodejs";
export const maxDuration = 30;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pulseLead = (prisma as any).pulseLead;

interface DetectionSnapshot {
  successfulSources?: string[];
  failedSources?: Array<{
    source: string;
    errorKind: string;
    message?: string;
  }>;
  mergedFields?: Array<{
    fieldName: string;
    value: unknown;
    agreementCount: number;
    contributingAdapters: string[];
  }>;
  warnings?: string[];
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return handleCorsPreflightResponse(origin, "*");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> },
) {
  const origin = request.headers.get("origin");
  const { leadId } = await params;

  // 1. Rate-limit (re-uses pulse tier — same identifier ceiling)
  const identifier = getIdentifier(request);
  const rateLimit = await checkRateLimit("pulse", identifier);
  if (!rateLimit.success) {
    return applyCorsHeaders(createRateLimitResponse(rateLimit), origin, "*");
  }

  // 2. Validate leadId shape — basic length check guards against
  //    obvious garbage / SQL-style probes
  if (!leadId || leadId.length < 8 || leadId.length > 64) {
    return applyCorsHeaders(
      NextResponse.json({ error: "Not found" }, { status: 404 }),
      origin,
      "*",
    );
  }

  // 3. Look up the lead
  let lead: {
    id: string;
    legalName: string;
    vatId: string | null;
    email: string;
    detectionResult: unknown;
    createdAt: Date;
  } | null;
  try {
    lead = await pulseLead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        legalName: true,
        vatId: true,
        email: true,
        detectionResult: true,
        createdAt: true,
      },
    });
  } catch (err) {
    logger.error("[pulse-report] PulseLead lookup failed", err);
    return applyCorsHeaders(
      NextResponse.json({ error: "Internal error" }, { status: 500 }),
      origin,
      "*",
    );
  }

  if (!lead) {
    return applyCorsHeaders(
      NextResponse.json({ error: "Not found" }, { status: 404 }),
      origin,
      "*",
    );
  }

  // 4. Build PulsePdfData from snapshot (defensive: snapshot may be null
  //    if the lead was captured but detection never ran)
  const snapshot = (lead.detectionResult ?? {}) as DetectionSnapshot;
  const successfulSources = snapshot.successfulSources ?? [];
  const mergedFields = snapshot.mergedFields ?? [];

  const pdfData: PulsePdfData = {
    leadId: lead.id,
    generatedAt: new Date(),
    legalName: lead.legalName,
    vatId: lead.vatId,
    email: lead.email,
    successfulSources,
    failedSources: snapshot.failedSources ?? [],
    mergedFields,
    warnings: snapshot.warnings ?? [],
    bestPossibleTier:
      mergedFields.length > 0 ? "T2_SOURCE_VERIFIED" : "T0_UNVERIFIED",
  };

  // 5. Render PDF
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await renderToBuffer(<PulsePdfReport data={pdfData} />);
  } catch (err) {
    logger.error("[pulse-report] PDF render failed", err);
    return applyCorsHeaders(
      NextResponse.json({ error: "PDF generation failed" }, { status: 500 }),
      origin,
      "*",
    );
  }

  // 6. Stream back as application/pdf with a sensible filename
  const filenameSafe = lead.legalName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const filename = `caelex-pulse-${filenameSafe || "report"}-${lead.createdAt.toISOString().slice(0, 10)}.pdf`;

  const response = new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "private, no-cache",
    },
  });
  return applyCorsHeaders(response, origin, "*");
}
