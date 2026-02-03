import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const { updates } = await request.json();

    if (!Array.isArray(updates)) {
      return NextResponse.json(
        { error: "Updates must be an array" },
        { status: 400 },
      );
    }

    // Use transaction for bulk upsert
    const results = await prisma.$transaction(
      updates.map((update: { articleId: string; status: string }) =>
        prisma.articleStatus.upsert({
          where: {
            userId_articleId: {
              userId: userId,
              articleId: update.articleId,
            },
          },
          update: {
            status: update.status,
          },
          create: {
            userId: userId,
            articleId: update.articleId,
            status: update.status,
          },
        }),
      ),
    );

    return NextResponse.json({ updated: results.length });
  } catch (error) {
    console.error("Error bulk updating article statuses:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
