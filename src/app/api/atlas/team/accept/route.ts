import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { acceptInvitation } from "@/lib/services/organization-service";

// POST /api/atlas/team/accept — accept an invitation
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { token } = body;

  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  try {
    const member = await acceptInvitation(token, session.user.id);
    return NextResponse.json({
      success: true,
      organizationId: member.organizationId,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to accept invitation";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
