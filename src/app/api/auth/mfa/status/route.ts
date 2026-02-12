/**
 * GET /api/auth/mfa/status
 * Returns the current MFA status for the user
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getMfaStatus } from "@/lib/mfa.server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const status = await getMfaStatus(session.user.id);

    return NextResponse.json(status);
  } catch (error) {
    console.error("Error getting MFA status:", error);
    return NextResponse.json(
      { error: "Failed to get MFA status" },
      { status: 500 },
    );
  }
}
