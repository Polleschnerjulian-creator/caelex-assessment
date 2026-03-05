import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

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
    logger.error("Digital Twin scenario GET error", error);
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
    logger.error("Digital Twin scenario DELETE error", error);
    return NextResponse.json(
      { error: "Failed to delete scenario" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const scenario = await prisma.whatIfScenario.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!scenario) {
      return NextResponse.json(
        { error: "Scenario not found" },
        { status: 404 },
      );
    }

    // Allow toggling isFavorite and updating name
    const updateData: Record<string, unknown> = {};
    if (typeof body.isFavorite === "boolean") {
      updateData.isFavorite = body.isFavorite;
    }
    if (typeof body.name === "string" && body.name.trim().length > 0) {
      updateData.name = body.name.trim();
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    const updated = await prisma.whatIfScenario.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        results: JSON.parse(updated.results),
        parameters: JSON.parse(updated.parameters),
      },
    });
  } catch (error) {
    logger.error("Digital Twin scenario PATCH error", error);
    return NextResponse.json(
      { error: "Failed to update scenario" },
      { status: 500 },
    );
  }
}
