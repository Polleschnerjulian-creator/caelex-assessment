import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, createRateLimitResponse } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import { calculateCasualtyRisk } from "@/lib/debris/casualty-risk-calculator.server";

const casualtyRiskSchema = z.object({
  spacecraftDryMassKg: z
    .number()
    .positive("Dry mass must be positive")
    .max(100000, "Dry mass exceeds reasonable limit"),
  numberOfSurvivingComponents: z
    .number()
    .int()
    .positive("Must have at least 1 surviving component")
    .max(10000, "Component count exceeds reasonable limit"),
  averageSurvivingAreaM2: z
    .number()
    .positive("Surviving area must be positive")
    .max(1000, "Area exceeds reasonable limit"),
  reentryInclinationDeg: z
    .number()
    .min(0, "Inclination must be >= 0")
    .max(180, "Inclination must be <= 180"),
  isControlledReentry: z.boolean(),
  targetLatitudeDeg: z.number().min(-90).max(90).optional(),
  targetLongitudeDeg: z.number().min(-180).max(180).optional(),
});

// POST /api/debris/casualty-risk — Calculate expected casualty risk E[c]
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Rate limit: use "assessment" tier (10/hr) for calculation endpoints
    const rateLimitResult = await checkRateLimit("assessment", userId);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const body = await request.json();
    const parsed = casualtyRiskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const input = parsed.data;

    // Validate controlled reentry has target coordinates
    if (
      input.isControlledReentry &&
      (input.targetLatitudeDeg === undefined ||
        input.targetLongitudeDeg === undefined)
    ) {
      return NextResponse.json(
        {
          error: "Controlled reentry requires target latitude and longitude",
        },
        { status: 400 },
      );
    }

    const result = calculateCasualtyRisk(input);

    return NextResponse.json({ result });
  } catch (error) {
    logger.error("Error calculating casualty risk", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
