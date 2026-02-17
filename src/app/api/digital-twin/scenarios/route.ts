import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  simulateScenario,
  type ScenarioInput,
} from "@/lib/services/whatif-simulation-service";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const scenarios = await prisma.whatIfScenario.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ success: true, data: scenarios });
  } catch (error) {
    console.error("Digital Twin scenarios GET error:", error);
    return NextResponse.json(
      { error: "Failed to load scenarios" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { scenarioType, name, parameters } = body as ScenarioInput;

    if (!scenarioType || !name || !parameters) {
      return NextResponse.json(
        { error: "Missing required fields: scenarioType, name, parameters" },
        { status: 400 },
      );
    }

    const validTypes = [
      "add_jurisdiction",
      "change_operator_type",
      "add_satellites",
      "expand_operations",
    ];
    if (!validTypes.includes(scenarioType)) {
      return NextResponse.json(
        { error: `Invalid scenarioType. Valid: ${validTypes.join(", ")}` },
        { status: 400 },
      );
    }

    // Run simulation
    const result = await simulateScenario(session.user.id, {
      scenarioType,
      name,
      parameters,
    });

    // Get organization membership
    const orgMember = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });

    // Save scenario
    const scenario = await prisma.whatIfScenario.create({
      data: {
        userId: session.user.id,
        organizationId: orgMember?.organizationId || null,
        name,
        scenarioType,
        parameters: JSON.stringify(parameters),
        baselineScore: result.baselineScore,
        projectedScore: result.projectedScore,
        scoreDelta: result.scoreDelta,
        results: JSON.stringify(result),
        computedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        scenario,
        result,
      },
    });
  } catch (error) {
    console.error("Digital Twin scenarios POST error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to run simulation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
