/**
 * Unread NCA Correspondence API
 * GET - Get all unread inbound correspondence for the current user
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUnreadCorrespondence } from "@/lib/services/nca-correspondence-service";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const correspondence = await getUnreadCorrespondence(session.user.id);

    return NextResponse.json({ correspondence, count: correspondence.length });
  } catch (error) {
    logger.error("Failed to fetch unread correspondence", error);
    return NextResponse.json(
      {
        error: getSafeErrorMessage(
          error,
          "Failed to fetch unread correspondence",
        ),
      },
      { status: 500 },
    );
  }
}
