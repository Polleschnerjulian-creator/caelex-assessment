import { NextRequest, NextResponse } from "next/server";
import {
  authenticateSentinelAgent,
  ingestPacket,
} from "@/lib/services/sentinel-service.server";

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

    // Parse packet
    const packet = await request.json();

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
    console.error("[sentinel/ingest]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
