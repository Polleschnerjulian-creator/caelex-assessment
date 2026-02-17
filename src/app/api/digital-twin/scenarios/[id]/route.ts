import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const scenario = await prisma.whatIfScenario.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!scenario) {
      return NextResponse.json(
        { error: "Scenario not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...scenario,
        results: JSON.parse(scenario.results),
        parameters: JSON.parse(scenario.parameters),
      },
    });
  } catch (error) {
    console.error("Digital Twin scenario GET error:", error);
    return NextResponse.json(
      { error: "Failed to load scenario" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const scenario = await prisma.whatIfScenario.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!scenario) {
      return NextResponse.json(
        { error: "Scenario not found" },
        { status: 404 },
      );
    }

    await prisma.whatIfScenario.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Digital Twin scenario DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete scenario" },
      { status: 500 },
    );
  }
}
