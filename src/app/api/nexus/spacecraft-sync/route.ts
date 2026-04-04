/**
 * NEXUS Spacecraft Sync API
 *
 * POST /api/nexus/spacecraft-sync — Manually trigger NEXUS asset creation for a spacecraft
 *
 * Accepts { spacecraftId } and auto-creates standard NEXUS assets based on
 * the spacecraft's mission type. Idempotent: skips assets that already exist.
 */

import { z } from "zod";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";

const bodySchema = z.object({
  spacecraftId: z.string().min(1, "spacecraftId is required"),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgContext = await getCurrentOrganization(session.user.id);
    if (!orgContext?.organizationId) {
      return NextResponse.json(
        { error: "Organization required" },
        { status: 403 },
      );
    }

    const rl = await checkRateLimit(
      "api",
      getIdentifier(request, session.user.id),
    );
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { autoCreateAssetsForSpacecraft } =
      await import("@/lib/nexus/integrations/spacecraft-sync.server");

    const result = await autoCreateAssetsForSpacecraft(
      parsed.data.spacecraftId,
      orgContext.organizationId,
      session.user.id,
    );

    return NextResponse.json({
      ...result,
      message:
        result.created > 0
          ? `Created ${result.created} NEXUS assets`
          : "All assets already exist",
    });
  } catch (error) {
    logger.error("Error in spacecraft sync", error);
    const message = getSafeErrorMessage(
      error,
      "Failed to sync spacecraft assets",
    );
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
