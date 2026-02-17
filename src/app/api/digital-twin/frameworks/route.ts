import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getFrameworkComparison } from "@/lib/services/compliance-twin-service";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await getFrameworkComparison(session.user.id);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Digital Twin frameworks error:", error);
    return NextResponse.json(
      { error: "Failed to load framework comparison" },
      { status: 500 },
    );
  }
}
