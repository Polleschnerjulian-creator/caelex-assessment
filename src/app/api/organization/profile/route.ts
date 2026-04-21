/**
 * Operator Profile API
 *
 * GET  /api/organization/profile — Returns the operator profile (creates empty if none)
 * PATCH /api/organization/profile — Partially updates the operator profile
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import {
  getOrCreateProfile,
  updateProfile,
} from "@/lib/services/operator-profile-service";
import {
  getCurrentTracesForEntity,
  readTraceValue,
} from "@/lib/services/derivation-trace-service";

// ─── Zod schema for PATCH body ───

const operatorProfilePatchSchema = z.object({
  operatorType: z.string().nullable().optional(),
  euOperatorCode: z.string().nullable().optional(),
  entitySize: z
    .enum(["micro", "small", "medium", "large"])
    .nullable()
    .optional(),
  isResearch: z.boolean().optional(),
  isDefenseOnly: z.boolean().optional(),
  primaryOrbit: z.string().nullable().optional(),
  orbitAltitudeKm: z.number().min(0).nullable().optional(),
  satelliteMassKg: z.number().min(0).nullable().optional(),
  isConstellation: z.boolean().optional(),
  constellationSize: z.number().int().min(1).nullable().optional(),
  missionDurationMonths: z.number().int().min(1).nullable().optional(),
  plannedLaunchDate: z.string().datetime().nullable().optional(),
  establishment: z.string().max(10).nullable().optional(),
  operatingJurisdictions: z.array(z.string().max(10)).optional(),
  offersEUServices: z.boolean().optional(),
});

// ─── Helpers ───

async function getSessionAndOrg() {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id },
    orderBy: { joinedAt: "desc" },
    include: {
      organization: {
        select: { id: true, isActive: true },
      },
    },
  });

  if (!membership?.organization?.isActive) {
    return {
      error: NextResponse.json(
        { error: "No active organization" },
        { status: 403 },
      ),
    };
  }

  return {
    userId: session.user.id,
    organizationId: membership.organization.id,
  };
}

// ─── GET ───

export async function GET(request: NextRequest) {
  try {
    // Rate limit
    const rateLimitResult = await checkRateLimit("api", getIdentifier(request));
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    // Auth
    const result = await getSessionAndOrg();
    if ("error" in result) return result.error;

    const profile = await getOrCreateProfile(result.organizationId);

    // Opt-in trace inclusion. Query param keeps the default payload
    // unchanged for existing callers. See docs/CONTEXT-OMNIPRESENCE-INTEGRATION.md.
    const includeTraces =
      request.nextUrl.searchParams.get("includeTraces") === "true";

    if (!includeTraces) {
      return NextResponse.json({ profile });
    }

    // Fetch current traces for this profile (latest-per-field) and shape
    // the payload into a field-indexed object so the client can look up
    // `traces.operatorType` directly without a linear scan.
    const rawTraces = await getCurrentTracesForEntity(
      "operator_profile",
      profile.id,
    );

    const traces: Record<
      string,
      {
        id: string;
        origin: string;
        sourceRef: unknown;
        confidence: number | null;
        modelVersion: string | null;
        derivedAt: string;
        expiresAt: string | null;
        value: unknown;
      }
    > = {};

    for (const t of rawTraces) {
      traces[t.fieldName] = {
        id: t.id,
        origin: t.origin,
        sourceRef: t.sourceRef,
        confidence: t.confidence,
        modelVersion: t.modelVersion,
        derivedAt: t.derivedAt.toISOString(),
        expiresAt: t.expiresAt ? t.expiresAt.toISOString() : null,
        value: readTraceValue(t.value),
      };
    }

    return NextResponse.json({ profile, traces });
  } catch (error) {
    logger.error("Error fetching operator profile", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ─── PATCH ───

export async function PATCH(request: NextRequest) {
  try {
    // Rate limit
    const rateLimitResult = await checkRateLimit("api", getIdentifier(request));
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    // Auth
    const result = await getSessionAndOrg();
    if ("error" in result) return result.error;

    // Parse and validate body
    const body = await request.json();
    const parsed = operatorProfilePatchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const profile = await updateProfile(result.organizationId, parsed.data, {
      via: "user-edit",
      userId: result.userId,
    });

    return NextResponse.json({ profile });
  } catch (error) {
    logger.error("Error updating operator profile", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
