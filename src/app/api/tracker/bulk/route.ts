import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ArticleStatusEnum } from "@/lib/validations";

const BulkUpdateSchema = z.object({
  updates: z
    .array(
      z.object({
        articleId: z.string().min(1).max(50),
        status: ArticleStatusEnum,
      }),
    )
    .min(1, "At least one update is required")
    .max(500, "Too many updates"),
});

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const body = await request.json();
    const parsed = BulkUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { updates } = parsed.data;

    // Use transaction for bulk upsert
    const results = await prisma.$transaction(
      updates.map((update) =>
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
