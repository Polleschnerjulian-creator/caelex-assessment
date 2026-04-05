import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, createRateLimitResponse } from "@/lib/ratelimit";
import { estimateOrbitalLifetime } from "@/lib/debris/ephemeris-integration.server";
import { logger } from "@/lib/logger";

const orbitalLifetimeSchema = z.object({
  altitudeKm: z.number().min(150).max(50000),
  inclinationDeg: z.number().min(0).max(180),
  ballisticCoefficientKgPerM2: z.number().min(1).max(1000).optional(),
  solarFluxF107: z.number().min(50).max(400).optional(),
});

/**
 * POST /api/debris/orbital-lifetime
 *
 * Estimate post-mission orbital lifetime using the Ephemeris atmospheric
 * density model. Used by the debris module to validate 25-year rule
 * compliance (Art. 68 EU Space Act) without relying on self-declaration.
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResult = await checkRateLimit("api", session.user.id);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const body = await request.json();
    const parsed = orbitalLifetimeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const estimate = estimateOrbitalLifetime(parsed.data);

    return NextResponse.json({ estimate });
  } catch (error) {
    logger.error("Error estimating orbital lifetime", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
