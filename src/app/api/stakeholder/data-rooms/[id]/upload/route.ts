import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  validateToken,
  logStakeholderAccess,
} from "@/lib/services/stakeholder-engagement";
import { logger } from "@/lib/logger";
import {
  getDataRoomsForStakeholder,
  logDataRoomAccess,
} from "@/lib/services/data-room";

// POST /api/stakeholder/data-rooms/[id]/upload — Upload a file to a data room
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const token =
      request.headers.get("authorization")?.replace("Bearer ", "") ||
      (process.env.NODE_ENV === "development"
        ? new URL(request.url).searchParams.get("token")
        : null);

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 401 });
    }

    const xff = request.headers.get("x-forwarded-for");
    const ipAddress = xff
      ? xff.split(",").pop()?.trim() || "unknown"
      : request.headers.get("x-real-ip") || "unknown";
    const userAgent = request.headers.get("user-agent") || undefined;

    const result = await validateToken(token, ipAddress);
    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }

    const engagement = result.engagement;

    // Verify the data room belongs to this engagement
    const dataRooms = await getDataRoomsForStakeholder(engagement.id);
    const dataRoom = dataRooms.find((room) => room.id === id);

    if (!dataRoom) {
      return NextResponse.json(
        { error: "Data room not found or not accessible" },
        { status: 404 },
      );
    }

    // Check access level — must be CONTRIBUTE or FULL_ACCESS to upload
    if (
      dataRoom.accessLevel !== "CONTRIBUTE" &&
      dataRoom.accessLevel !== "FULL_ACCESS"
    ) {
      return NextResponse.json(
        {
          error:
            "Insufficient access level. Upload requires CONTRIBUTE or FULL_ACCESS permission.",
        },
        { status: 403 },
      );
    }

    // Parse upload metadata from request body
    const schema = z.object({
      fileName: z.string().min(1),
      fileSize: z.number().positive(),
      mimeType: z.string().min(1),
      category: z.string().optional(),
      description: z.string().optional(),
    });

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { fileName, fileSize, mimeType, category, description } = parsed.data;

    // Log the upload access
    await logDataRoomAccess(id, "file_uploaded", "stakeholder", engagement.id, {
      ipAddress,
      userAgent,
      metadata: { fileName, fileSize, mimeType },
    });

    await logStakeholderAccess(engagement.id, "file_uploaded", {
      entityType: "data_room",
      entityId: id,
      ipAddress,
      userAgent,
      metadata: { fileName, fileSize, mimeType },
    });

    // Return success with upload info
    // Actual file upload would go to R2/S3 storage layer
    // The client would typically receive a presigned URL for direct upload
    return NextResponse.json({
      success: true,
      message: "Upload metadata accepted",
      upload: {
        dataRoomId: id,
        fileName,
        fileSize,
        mimeType,
        category: category || "general",
        description: description || null,
        uploadedBy: engagement.companyName,
        uploadedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error("Stakeholder upload error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
