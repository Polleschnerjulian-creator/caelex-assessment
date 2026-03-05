import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  validateToken,
  logStakeholderAccess,
} from "@/lib/services/stakeholder-engagement";
import { getDataRoomsForStakeholder } from "@/lib/services/data-room";
import { logger } from "@/lib/logger";

// GET /api/stakeholder/data-rooms — List data rooms for this stakeholder
export async function GET(request: NextRequest) {
  try {
    const token =
      request.headers.get("authorization")?.replace("Bearer ", "") ||
      new URL(request.url).searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 401 });
    }

    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      undefined;
    const userAgent = request.headers.get("user-agent") || undefined;

    const result = await validateToken(token, ipAddress);
    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }

    const engagement = result.engagement;

    const dataRooms = await getDataRoomsForStakeholder(engagement.id);

    // Log access
    await logStakeholderAccess(engagement.id, "data_rooms_listed", {
      ipAddress,
      userAgent,
      metadata: { count: dataRooms.length },
    });

    return NextResponse.json({ dataRooms });
  } catch (error) {
    logger.error("Stakeholder data rooms list error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
