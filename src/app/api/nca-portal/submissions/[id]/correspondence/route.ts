/**
 * NCA Portal Submission Correspondence API
 * GET  - Get correspondence thread for a submission
 * POST - Add correspondence entry
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getCorrespondence,
  createCorrespondence,
} from "@/lib/services/nca-correspondence-service";
import type { CorrespondenceDirection, MessageType } from "@prisma/client";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const correspondence = await getCorrespondence(id, session.user.id);

    return NextResponse.json({ correspondence });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Submission not found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    console.error("Failed to fetch correspondence:", error);
    return NextResponse.json(
      { error: "Failed to fetch correspondence" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      direction,
      messageType,
      subject,
      content,
      attachments,
      sentAt,
      receivedAt,
      ncaContactName,
      ncaContactEmail,
      requiresResponse,
      responseDeadline,
    } = body;

    if (!direction || !messageType || !subject || !content) {
      return NextResponse.json(
        { error: "direction, messageType, subject, and content are required" },
        { status: 400 },
      );
    }

    const correspondence = await createCorrespondence(id, session.user.id, {
      submissionId: id,
      direction: direction as CorrespondenceDirection,
      messageType: messageType as MessageType,
      subject,
      content,
      attachments,
      sentAt: sentAt ? new Date(sentAt) : undefined,
      receivedAt: receivedAt ? new Date(receivedAt) : undefined,
      ncaContactName,
      ncaContactEmail,
      requiresResponse,
      responseDeadline: responseDeadline
        ? new Date(responseDeadline)
        : undefined,
    });

    return NextResponse.json({ correspondence }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Submission not found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    console.error("Failed to create correspondence:", error);
    return NextResponse.json(
      { error: "Failed to create correspondence" },
      { status: 500 },
    );
  }
}
