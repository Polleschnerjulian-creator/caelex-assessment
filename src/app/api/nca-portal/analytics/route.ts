/**
 * NCA Portal Analytics API
 * GET - User-level submission analytics
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAnalytics } from "@/lib/services/nca-portal-service";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const analytics = await getAnalytics(session.user.id);

    return NextResponse.json(analytics);
  } catch (error) {
    console.error("Failed to fetch analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 },
    );
  }
}
