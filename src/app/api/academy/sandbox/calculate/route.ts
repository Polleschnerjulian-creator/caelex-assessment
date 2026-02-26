/**
 * Academy Sandbox Calculation API
 * POST: Free-form engine calculation for sandbox mode
 *
 * Auth required, rate limited.
 * Body: { engine: "eu-space-act" | "nis2" | "space-law", answers: object }
 *
 * Calls the appropriate compliance engine and returns full results.
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import {
  calculateCompliance,
  loadSpaceActDataFromDisk,
} from "@/lib/engine.server";
import { calculateNIS2Compliance } from "@/lib/nis2-engine.server";
import { calculateSpaceLawCompliance } from "@/lib/space-law-engine.server";

export const runtime = "nodejs";

const VALID_ENGINES = ["eu-space-act", "nis2", "space-law"] as const;
type EngineType = (typeof VALID_ENGINES)[number];

export async function POST(request: Request) {
  try {
    // Auth
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    // Rate limit
    const identifier = getIdentifier(request, userId);
    const rateLimit = await checkRateLimit("academy", identifier);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Parse body
    const body = await request.json();
    const { engine, answers } = body as {
      engine: string;
      answers: Record<string, unknown>;
    };

    if (!engine || !answers) {
      return NextResponse.json(
        { error: "engine and answers are required" },
        { status: 400 },
      );
    }

    if (!VALID_ENGINES.includes(engine as EngineType)) {
      return NextResponse.json(
        {
          error: `Invalid engine. Must be one of: ${VALID_ENGINES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    let result: unknown;

    switch (engine as EngineType) {
      case "eu-space-act": {
        const spaceActData = loadSpaceActDataFromDisk();
        result = calculateCompliance(
          answers as unknown as Parameters<typeof calculateCompliance>[0],
          spaceActData,
        );
        break;
      }

      case "nis2": {
        result = await calculateNIS2Compliance(
          answers as unknown as Parameters<typeof calculateNIS2Compliance>[0],
        );
        break;
      }

      case "space-law": {
        result = await calculateSpaceLawCompliance(
          answers as unknown as Parameters<
            typeof calculateSpaceLawCompliance
          >[0],
        );
        break;
      }
    }

    return NextResponse.json({
      engine,
      result,
      calculatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Academy Sandbox Calculate POST]", error);
    return NextResponse.json(
      { error: "Failed to calculate compliance" },
      { status: 500 },
    );
  }
}
