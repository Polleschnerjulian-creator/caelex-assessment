import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ArticleStatusEnum } from "@/lib/validations";
import { logger } from "@/lib/logger";
// Sprint UF34 (P1-T3) — server-side RBAC for bulk mutations.
// Mirrors UF21's per-route guard on /api/tracker/articles + /checklist.
import { assertNotAuditor } from "@/lib/use-case-server";

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

    // Sprint UF34 — auditor RBAC. Same pattern as UF21 elsewhere:
    // server-side belt-and-suspenders, in addition to the
    // client-side disabled-state from UF9.
    const auditorBlock = await assertNotAuditor(userId);
    if (auditorBlock) return auditorBlock;

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
    logger.error("Error bulk updating article statuses", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
