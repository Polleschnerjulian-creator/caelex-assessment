import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { registerSentinelAgent } from "@/lib/services/sentinel-service.server";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";

const RegisterSchema = z.object({
  sentinel_id: z.string().min(1),
  operator_id: z.string().min(1),
  public_key: z.string().min(1),
  version: z.string().min(1),
  collectors: z.array(z.string()),
});

export async function POST(request: NextRequest) {
  try {
    const rl = await checkRateLimit(
      "sentinel_register",
      getIdentifier(request),
    );
    if (!rl.success) return createRateLimitResponse(rl);

    // Auth: Bearer token
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json(
        { error: "Missing Authorization header" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    // Hash the token for storage/lookup
    const { createHash } = await import("node:crypto");
    const tokenHash = createHash("sha256").update(token).digest("hex");

    const result = await registerSentinelAgent({
      ...parsed.data,
      tokenHash,
    });

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    return NextResponse.json(
      {
        data: {
          sentinel_id: result.agent!.sentinelId,
          status: result.agent!.status,
        },
      },
      { status: result.status },
    );
  } catch (err) {
    logger.error("[sentinel/register]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
