import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import {
  getAuditCenterOverview,
  getOrganizationId,
} from "@/lib/services/audit-center-service.server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const organizationId = await getOrganizationId(userId);
    if (!organizationId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 },
      );
    }

    const overview = await getAuditCenterOverview(organizationId, userId);

    return NextResponse.json(overview);
  } catch (error) {
    console.error("Audit center overview error:", error);
    return NextResponse.json(
      { error: "Failed to load audit center overview" },
      { status: 500 },
    );
  }
}
