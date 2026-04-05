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

// GET /api/stakeholder/data-rooms/[id]/documents/[docId] — Access/download a document
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  try {
    const { id, docId } = await params;

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

    // Find the document within the data room
    const dataRoomDoc = dataRoom.documents.find(
      (doc) => doc.document.id === docId,
    );

    if (!dataRoomDoc) {
      return NextResponse.json(
        { error: "Document not found in this data room" },
        { status: 404 },
      );
    }

    // Determine if this is a download request
    const { searchParams } = new URL(request.url);
    const isDownload = searchParams.get("download") === "true";

    // Check if downloads are permitted
    if (isDownload && !dataRoom.downloadable) {
      return NextResponse.json(
        { error: "Downloads are not permitted for this data room" },
        { status: 403 },
      );
    }

    const action = isDownload ? "document_downloaded" : "document_viewed";

    // Log document access on the data room
    await logDataRoomAccess(id, action, "stakeholder", engagement.id, {
      documentId: docId,
      ipAddress,
      userAgent,
    });

    // Log on the stakeholder engagement
    await logStakeholderAccess(engagement.id, action, {
      entityType: "document",
      entityId: docId,
      ipAddress,
      userAgent,
      metadata: { dataRoomId: id },
    });

    // Return document metadata
    // Actual file serving would be handled by the storage layer (R2/S3)
    return NextResponse.json({
      document: dataRoomDoc.document,
      dataRoom: {
        id: dataRoom.id,
        name: dataRoom.name,
        watermark: dataRoom.watermark,
        downloadable: dataRoom.downloadable,
        printable: dataRoom.printable,
      },
      action,
    });
  } catch (error) {
    logger.error("Stakeholder document access error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
