import { NextRequest, NextResponse } from "next/server";
import {
  authenticateSentinelAgent,
  ingestPacket,
} from "@/lib/services/sentinel-service.server";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { checkRateLimit, createRateLimitResponse } from "@/lib/ratelimit";

const PacketSchema = z.object({
  packet_id: z.string(),
  version: z.string(),
  sentinel_id: z.string(),
  operator_id: z.string(),
  satellite_norad_id: z
    .string()
    .regex(/^\d{1,8}$/)
    .nullable(),
  data: z.object({
    data_point: z.string(),
    values: z.record(z.string(), z.unknown()),
    source_system: z.string(),
    collection_method: z.string(),
    collection_timestamp: z.string().datetime(),
    compliance_notes: z.array(z.string()),
  }),
  regulation_mapping: z.array(
    z.object({
      ref: z.string(),
      status: z.string(),
      note: z.string(),
    }),
  ),
  integrity: z.object({
    content_hash: z.string().startsWith("sha256:"),
    previous_hash: z.string(),
    chain_position: z.number().int().nonnegative(),
    signature: z.string(),
    agent_public_key: z.string(),
    timestamp_source: z.string(),
  }),
  metadata: z.object({
    sentinel_version: z.string(),
    collector: z.string(),
    config_hash: z.string(),
    uptime_seconds: z.number().nonnegative(),
    packets_sent_total: z.number().int().nonnegative(),
  }),
});

const MAX_TIMESTAMP_DRIFT_MS = 60 * 60 * 1000; // 1 hour

export async function POST(request: NextRequest) {
  try {
    // Auth
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json(
        { error: "Missing Authorization header" },
        { status: 401 },
      );
    }

    const rl = await checkRateLimit("sentinel_ingest", `token:${token}`);
    if (!rl.success) return createRateLimitResponse(rl);

    const agent = await authenticateSentinelAgent(token);
    if (!agent) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    if (agent.status !== "ACTIVE") {
      return NextResponse.json(
        { error: `Agent status: ${agent.status}` },
        { status: 403 },
      );
    }

    // Parse and validate packet
    const body = await request.json();
    const parseResult = PacketSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid packet format",
          details: parseResult.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 422 },
      );
    }

    const packet = parseResult.data;

    // Timestamp window check: reject if collection_timestamp is more than ±1 hour from server time
    const collectionTime = new Date(packet.data.collection_timestamp).getTime();
    const now = Date.now();
    if (Math.abs(collectionTime - now) > MAX_TIMESTAMP_DRIFT_MS) {
      return NextResponse.json(
        {
          error:
            "collection_timestamp is outside the acceptable ±1 hour window",
        },
        { status: 400 },
      );
    }

    // Verify sentinel_id matches
    if (packet.sentinel_id !== agent.sentinelId) {
      return NextResponse.json(
        { error: "Sentinel ID mismatch" },
        { status: 403 },
      );
    }

    // Ingest
    const result = await ingestPacket(agent.id, packet);

    if (!result.accepted) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      status: "accepted",
      chain_position: result.chain_position,
    });
  } catch (err) {
    logger.error("[sentinel/ingest]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
