/**
 * Compliance Score API
 * GET: Calculate and return compliance score for authenticated user
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { calculateComplianceScore } from "@/lib/services/compliance-scoring-service";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const score = await calculateComplianceScore(session.user.id);

    return NextResponse.json(score);
  } catch (error) {
    console.error("Error calculating compliance score:", error);
    return NextResponse.json(
      { error: "Failed to calculate compliance score" },
      { status: 500 },
    );
  }
}
