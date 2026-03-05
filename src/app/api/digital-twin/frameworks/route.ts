import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getFrameworkComparison } from "@/lib/services/compliance-twin-service";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await getFrameworkComparison(session.user.id);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("Digital Twin frameworks error", error);
    return NextResponse.json(
      { error: "Failed to load framework comparison" },
      { status: 500 },
    );
  }
}
