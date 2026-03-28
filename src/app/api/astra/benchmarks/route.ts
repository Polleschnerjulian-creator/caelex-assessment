import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateBenchmarkReport } from "@/lib/astra/benchmark-engine.server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });

    const report = await generateBenchmarkReport(
      membership?.organizationId || "",
      session.user.id,
    );

    return NextResponse.json({ data: { report } });
  } catch (error) {
    console.error("[astra-benchmarks]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
