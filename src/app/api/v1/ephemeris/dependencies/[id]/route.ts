import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/v1/ephemeris/dependencies/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify the dependency belongs to this org
    const dependency = await prisma.entityDependency.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      },
    });

    if (!dependency) {
      return NextResponse.json(
        { error: "Dependency not found" },
        { status: 404 },
      );
    }

    await prisma.entityDependency.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete dependency:", error);
    return NextResponse.json(
      { error: "Failed to delete dependency" },
      { status: 500 },
    );
  }
}
