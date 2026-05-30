import { NextRequest, NextResponse } from "next/server";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { z } from "zod";

/**
 * Atlas Mandate Conflict-of-Interest — clearance API.
 *
 * POST /api/atlas/mandate/[id]/conflicts/clear — record the lawyer's
 * documented clearance decision for one conflict pair. High-severity
 * conflicts require a justification (professional-conduct record).
 *
 * Spec: docs/superpowers/specs/2026-05-30-atlas-mandate-conflict-check-design.md
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */
const ClearInput = z.object({
  matchedMandateId: z.string().min(1).max(40),
  normalizedName: z.string().min(1).max(200),
  severity: z.enum(["high", "medium", "info"]),
  status: z.enum(["cleared", "waived", "declined"]).default("cleared"),
  reason: z.string().max(5000).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: mandateId } = await params;

  const mandate = await prisma.atlasMandate.findFirst({
    where: { id: mandateId, organizationId: atlas.organizationId },
    select: { id: true },
  });
  if (!mandate) {
    return NextResponse.json({ error: "Mandate not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ClearInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { matchedMandateId, normalizedName, severity, status, reason } =
    parsed.data;

  // Professional-conduct rule: a high-severity conflict (acting against an
  // active client) cannot be cleared without a documented justification.
  if (severity === "high" && !reason?.trim()) {
    return NextResponse.json(
      {
        error: "A justification is required to clear a high-severity conflict.",
      },
      { status: 400 },
    );
  }

  // The matched mandate must also belong to the caller's org — prevents
  // injecting a clearance that references a foreign-tenant mandate id.
  const matched = await prisma.atlasMandate.findFirst({
    where: { id: matchedMandateId, organizationId: atlas.organizationId },
    select: { id: true },
  });
  if (!matched) {
    return NextResponse.json(
      { error: "Matched mandate not found" },
      { status: 404 },
    );
  }

  try {
    const clearance = await prisma.atlasConflictClearance.upsert({
      where: {
        mandateId_matchedMandateId_normalizedName: {
          mandateId,
          matchedMandateId,
          normalizedName,
        },
      },
      create: {
        organizationId: atlas.organizationId,
        mandateId,
        matchedMandateId,
        normalizedName,
        severity,
        status,
        clearanceReason: reason ?? null,
        clearedByUserId: atlas.userId,
      },
      update: {
        status,
        clearanceReason: reason ?? null,
        clearedByUserId: atlas.userId,
        clearedAt: new Date(),
      },
    });
    logger.info("[atlas/conflicts] cleared", {
      mandateId,
      userId: atlas.userId,
      matchedMandateId,
      severity,
      status,
    });
    return NextResponse.json({ clearance });
  } catch (err) {
    logger.error("[atlas/conflicts] clear failed", {
      mandateId,
      userId: atlas.userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Failed to record clearance" },
      { status: 500 },
    );
  }
}
