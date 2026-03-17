import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { testLeoLabsConnection } from "@/lib/shield/leolabs-client.server";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { role: true },
    });

    if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { apiKey } = body as { apiKey: string };

    if (!apiKey || typeof apiKey !== "string" || apiKey.length < 10) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 400 });
    }

    const result = await testLeoLabsConnection(apiKey);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "Test failed" }, { status: 500 });
  }
}
