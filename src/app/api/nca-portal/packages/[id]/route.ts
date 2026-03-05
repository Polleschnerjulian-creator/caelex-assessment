/**
 * NCA Portal Package Detail API
 * GET - Package detail with completeness analysis
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPackage } from "@/lib/services/nca-portal-service";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";

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
    const pkg = await getPackage(id, session.user.id);

    return NextResponse.json({ package: pkg });
  } catch (error) {
    if (error instanceof Error && error.message === "Package not found") {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }
    logger.error("Failed to fetch package", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to fetch package") },
      { status: 500 },
    );
  }
}
