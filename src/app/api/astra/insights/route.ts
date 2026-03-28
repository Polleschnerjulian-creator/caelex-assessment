import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateInsightsForUser } from "@/lib/astra/proactive-engine.server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id },
    select: { organizationId: true },
  });

  const insights = await generateInsightsForUser(
    session.user.id,
    membership?.organizationId || "",
  );

  return NextResponse.json({ data: { insights, count: insights.length } });
}
