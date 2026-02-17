import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTimelineData } from "@/lib/services/compliance-twin-service";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await getTimelineData(session.user.id);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Digital Twin timeline error:", error);
    return NextResponse.json(
      { error: "Failed to load timeline data" },
      { status: 500 },
    );
  }
}
