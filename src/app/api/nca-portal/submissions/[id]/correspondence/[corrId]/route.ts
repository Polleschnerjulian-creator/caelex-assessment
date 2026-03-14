/**
 * Individual NCA Correspondence API
 * PATCH - Mark correspondence as read or responded
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  markAsRead,
  markAsResponded,
} from "@/lib/services/nca-correspondence-service";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ id: string; corrId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { corrId } = await params;
    const body = await request.json();
    const { action } = body;

    if (action !== "read" && action !== "responded") {
      return NextResponse.json(
        { error: 'action must be "read" or "responded"' },
        { status: 400 },
      );
    }

    const correspondence =
      action === "read"
        ? await markAsRead(corrId, session.user.id)
        : await markAsResponded(corrId, session.user.id);

    return NextResponse.json({ correspondence });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Correspondence not found"
    ) {
      return NextResponse.json(
        { error: "Correspondence not found" },
        { status: 404 },
      );
    }
    logger.error("Failed to update correspondence", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to update correspondence") },
      { status: 500 },
    );
  }
}
