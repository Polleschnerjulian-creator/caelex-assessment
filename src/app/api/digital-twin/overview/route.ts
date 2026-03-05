import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getComplianceTwinState } from "@/lib/services/compliance-twin-service";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const state = await getComplianceTwinState(session.user.id);

    return NextResponse.json({ success: true, data: state });
  } catch (error) {
    logger.error("Digital Twin overview error", error);
    return NextResponse.json(
      { error: "Failed to load compliance twin state" },
      { status: 500 },
    );
  }
}
