import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { articles, OperatorType } from "@/data/articles";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import { z } from "zod";
import { logger } from "@/lib/logger";
import {
  deriveArticleRows,
  countRows,
  type TrackerCatalogEntry,
  type SnapshotModuleStatus,
} from "@/lib/assessment/tracker-import";
import { upsertRoadmapDeadlines } from "@/lib/assessment/roadmap-deadlines.server";
import type { RoadmapItem } from "@/lib/assessment/roadmap.server";

/**
 * Two body variants (Task 3.5):
 *  - LEGACY { operatorType } — kept unchanged for old stored results; the
 *    applicability still derives from @/data/articles appliesTo. Unknown
 *    labels are a 400 now, never silently defaulted (§ honesty).
 *  - NEW { verdictSnapshotId } — applicability derives EXCLUSIVELY from the
 *    snapshot's own engine module statuses (the result the user saw); the
 *    articles dataset is consulted only as the tracker-id directory.
 */
const LegacySchema = z.object({
  operatorType: z.string().min(1, "operatorType is required").max(50),
});
const SnapshotSchema = z.object({
  verdictSnapshotId: z.string().min(1).max(64),
});

// Map assessment operator type to article OperatorType
const operatorTypeMap: Record<string, OperatorType> = {
  spacecraft_operator: "SCO",
  launch_operator: "LO",
  launch_site_operator: "LSO",
  isos_provider: "ISOS",
  collision_avoidance_provider: "CAP",
  primary_data_provider: "PDP",
  third_country_operator: "TCO",
};

/** The id directory injected into the pure mapping (NEVER appliesTo). */
const CATALOG: TrackerCatalogEntry[] = articles.map((a) => ({
  id: a.id,
  module: a.module,
}));

async function upsertArticleRows(
  userId: string,
  rows: { articleId: string; status: string }[],
): Promise<void> {
  await prisma.$transaction(
    rows.map((row) =>
      prisma.articleStatus.upsert({
        where: {
          userId_articleId: { userId, articleId: row.articleId },
        },
        update: { status: row.status },
        create: { userId, articleId: row.articleId, status: row.status },
      }),
    ),
  );
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const body = await request.json();

    // ── NEW variant: { verdictSnapshotId } — single-source import ──────────
    const snapshotParsed = SnapshotSchema.safeParse(body);
    if (snapshotParsed.success) {
      const snapshot = await prisma.assessmentVerdictSnapshot.findFirst({
        where: { id: snapshotParsed.data.verdictSnapshotId },
        select: {
          id: true,
          result: true,
          profile: { select: { id: true, userId: true } },
        },
      });
      // Ownership: the snapshot's profile must belong to the session user.
      // A foreign or unknown id is a 404 (no existence oracle).
      if (!snapshot || snapshot.profile.userId !== userId) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const result = (snapshot.result ?? {}) as {
        spaceActModules?: SnapshotModuleStatus[];
        roadmap?: RoadmapItem[];
      };
      if (!Array.isArray(result.spaceActModules)) {
        // Older snapshots predate the field — they import via the legacy
        // body. Never guess applicability.
        return NextResponse.json(
          {
            error:
              "This snapshot does not carry engine module statuses. Re-run the assessment to import it.",
          },
          { status: 422 },
        );
      }

      const rows = deriveArticleRows(CATALOG, result.spaceActModules);
      await upsertArticleRows(userId, rows);

      // Task 3.7: roadmap deadlines flow into the existing timeline —
      // save-to-dashboard is the single trigger.
      const deadlines = await upsertRoadmapDeadlines(
        userId,
        snapshot.profile.id,
        Array.isArray(result.roadmap) ? result.roadmap : [],
      );

      const counts = countRows(rows);
      const { ipAddress, userAgent } = getRequestContext(request);
      await logAuditEvent({
        userId,
        action: "assessment_imported",
        entityType: "user",
        entityId: userId,
        newValue: {
          source: "verdict_snapshot",
          snapshotId: snapshot.id,
          applicable: counts.applicable,
          notApplicable: counts.notApplicable,
          deadlinesCreated: deadlines.created,
          deadlinesUpdated: deadlines.updated,
        },
        description: `Imported verdict snapshot: ${counts.applicable} applicable articles, ${deadlines.created + deadlines.updated} roadmap deadlines`,
        ipAddress,
        userAgent,
      });

      return NextResponse.json({
        imported: true,
        articles: counts.applicable,
        deadlines: deadlines.created + deadlines.updated,
      });
    }

    // ── LEGACY variant: { operatorType } — unchanged behavior, hardened ────
    const parsed = LegacySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { operatorType } = parsed.data;
    const opType = operatorTypeMap[operatorType];
    if (!opType) {
      // Never silently default an unknown activity label (§ honesty).
      return NextResponse.json(
        { error: `Unknown operator type: ${operatorType}` },
        { status: 400 },
      );
    }

    const updates: { articleId: string; status: string }[] = [];
    let applicable = 0;
    let notApplicable = 0;
    for (const article of articles) {
      const applies =
        article.appliesTo.includes("ALL") || article.appliesTo.includes(opType);
      if (applies) {
        updates.push({ articleId: article.id, status: "not_started" });
        applicable++;
      } else {
        updates.push({ articleId: article.id, status: "not_applicable" });
        notApplicable++;
      }
    }

    await upsertArticleRows(userId, updates);

    await prisma.user.update({
      where: { id: userId },
      data: { operatorType: opType },
    });

    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "assessment_imported",
      entityType: "user",
      entityId: userId,
      newValue: {
        operatorType: opType,
        applicable,
        notApplicable,
        total: updates.length,
      },
      description: `Imported assessment: ${applicable} applicable articles, ${notApplicable} not applicable`,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      imported: updates.length,
      applicable,
      notApplicable,
    });
  } catch (error) {
    logger.error("Error importing assessment", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
