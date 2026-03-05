import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  validateToken,
  logStakeholderAccess,
} from "@/lib/services/stakeholder-engagement";
import {
  getDataRoomsForStakeholder,
  logDataRoomAccess,
} from "@/lib/services/data-room";
import { logger } from "@/lib/logger";

// GET /api/stakeholder/data-rooms/[id] — Get a specific data room for this stakeholder
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

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

    // Fetch all data rooms for this engagement and find the requested one
    const dataRooms = await getDataRoomsForStakeholder(engagement.id);
    const dataRoom = dataRooms.find((room) => room.id === id);

    if (!dataRoom) {
      return NextResponse.json(
        { error: "Data room not found or not accessible" },
        { status: 404 },
      );
    }

    // Log data room access
    await logDataRoomAccess(id, "room_opened", "stakeholder", engagement.id, {
      ipAddress,
      userAgent,
    });

    await logStakeholderAccess(engagement.id, "room_opened", {
      entityType: "data_room",
      entityId: id,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ dataRoom });
  } catch (error) {
    logger.error("Stakeholder data room detail error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
