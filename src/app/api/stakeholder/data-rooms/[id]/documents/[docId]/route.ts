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
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import { getFileBuffer, isR2Configured } from "@/lib/storage/upload-service";
import { addWatermarkToPdf } from "@/lib/pdf/watermark";

// GET /api/stakeholder/data-rooms/[id]/documents/[docId] — Access/download a document
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  try {
    // Rate limit: supplier tier for stakeholder portal (30/hr)
    const rl = await checkRateLimit("supplier", getIdentifier(request));
    if (!rl.success) return createRateLimitResponse(rl);

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

    // ─── Server-side PDF watermarking for download requests ───
    // If the data room has watermark enabled, the document is a PDF, and R2 is
    // configured, fetch the file, stamp it, and return the watermarked bytes
    // directly instead of a presigned URL.
    const doc = dataRoomDoc.document;
    const isPdf =
      doc.mimeType === "application/pdf" ||
      doc.fileName?.toLowerCase().endsWith(".pdf");

    if (
      isDownload &&
      dataRoom.watermark &&
      isPdf &&
      doc.storagePath &&
      isR2Configured()
    ) {
      try {
        const file = await getFileBuffer(doc.storagePath);
        if (file) {
          const watermarked = await addWatermarkToPdf(file.buffer, {
            text: `CONFIDENTIAL — ${engagement.contactName} — ${new Date().toISOString().split("T")[0]}`,
          });

          return new NextResponse(new Uint8Array(watermarked), {
            status: 200,
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `attachment; filename="${doc.fileName || "document.pdf"}"`,
              "Content-Length": String(watermarked.byteLength),
              "Cache-Control": "no-store",
            },
          });
        }
      } catch (wmErr) {
        // If watermarking fails, fall through to the normal metadata response
        logger.error("PDF watermarking failed, returning metadata", wmErr);
      }
    }

    // Return document metadata (default — client fetches file via presigned URL)
    return NextResponse.json({
      document: doc,
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
