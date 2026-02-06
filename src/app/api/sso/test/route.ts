/**
 * SSO Test API
 * POST - Test SSO configuration
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { testSSOConnection } from "@/lib/services/sso-service";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { organizationId } = body;

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 },
      );
    }

    const result = await testSSOConnection(organizationId, session.user.id);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error testing SSO:", error);
    return NextResponse.json(
      { error: "Failed to test SSO configuration" },
      { status: 500 },
    );
  }
}
