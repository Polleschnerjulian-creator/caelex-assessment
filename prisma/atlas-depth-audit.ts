/**
 * prisma/atlas-depth-audit.ts
 *
 * Read-only inventory of every Atlas-related table in the database.
 * No writes, no mutations. Safe to run against production.
 *
 * Counts rows + computes coverage stats for the eleven Atlas models:
 *   - AtlasBookmark, AtlasAnnotation, AtlasResearchEntry
 *   - AtlasWorkspace, AtlasWorkspaceCard
 *   - AtlasUpdate, AtlasNotification, AtlasAlertSubscription
 *   - AtlasSourceCheck, AtlasSourceCheckHistory
 *   - AtlasPendingSourceCandidate
 *
 * Pairs with the static-data inventory printed by this script's stdout
 * tail: the legal corpus itself (sources / cases / jurisdictions /
 * standards) lives in src/data/ as TypeScript modules, not in the DB.
 *
 * Run:
 *   npx tsx --env-file-if-exists=.env.local prisma/atlas-depth-audit.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function divider(title: string) {
  console.log(`\n──── ${title} ${"─".repeat(Math.max(0, 60 - title.length))}`);
}

async function main() {
  console.log(
    "\n╔══════════════════════════════════════════════════════════════╗",
  );
  console.log(
    "║  ATLAS DATABASE DEPTH AUDIT — READ-ONLY                      ║",
  );
  console.log(
    "╚══════════════════════════════════════════════════════════════╝",
  );

  /* ── Bookmarks ─────────────────────────────────────────────── */
  divider("AtlasBookmark");
  const bookmarkTotal = await prisma.atlasBookmark.count();
  const bookmarksByType = await prisma.atlasBookmark.groupBy({
    by: ["itemType"],
    _count: true,
  });
  const bookmarkUsers = await prisma.atlasBookmark.groupBy({
    by: ["userId"],
    _count: true,
    orderBy: { _count: { userId: "desc" } },
    take: 5,
  });
  console.log(`  total: ${bookmarkTotal}`);
  console.log(`  by type:`);
  for (const b of bookmarksByType)
    console.log(`    ${b.itemType.padEnd(15)} ${b._count}`);
  console.log(`  top 5 power-users (by # of bookmarks):`);
  for (const u of bookmarkUsers) {
    const user = await prisma.user.findUnique({
      where: { id: u.userId },
      select: { email: true },
    });
    console.log(`    ${(user?.email ?? u.userId).padEnd(40)} ${u._count}`);
  }

  /* ── Annotations ───────────────────────────────────────────── */
  divider("AtlasAnnotation");
  const annTotal = await prisma.atlasAnnotation.count();
  const annPerOrg = await prisma.atlasAnnotation.groupBy({
    by: ["organizationId"],
    _count: true,
    orderBy: { _count: { organizationId: "desc" } },
  });
  const annHotSources = await prisma.atlasAnnotation.groupBy({
    by: ["sourceId"],
    _count: true,
    orderBy: { _count: { sourceId: "desc" } },
    take: 10,
  });
  console.log(`  total: ${annTotal}`);
  console.log(`  per org (top 5):`);
  for (const o of annPerOrg.slice(0, 5)) {
    const org = await prisma.organization.findUnique({
      where: { id: o.organizationId },
      select: { name: true },
    });
    console.log(
      `    ${(org?.name ?? o.organizationId).padEnd(40)} ${o._count}`,
    );
  }
  console.log(`  most-annotated sources (top 10):`);
  for (const s of annHotSources)
    console.log(`    ${s.sourceId.padEnd(35)} ${s._count}`);

  /* ── Research entries ──────────────────────────────────────── */
  divider("AtlasResearchEntry");
  const reTotal = await prisma.atlasResearchEntry.count();
  const reBySource = await prisma.atlasResearchEntry.groupBy({
    by: ["sourceKind"],
    _count: true,
  });
  const reUsers = await prisma.atlasResearchEntry.groupBy({
    by: ["userId"],
    _count: true,
    orderBy: { _count: { userId: "desc" } },
    take: 5,
  });
  console.log(`  total: ${reTotal}`);
  console.log(`  by sourceKind:`);
  for (const r of reBySource)
    console.log(`    ${(r.sourceKind ?? "(null)").padEnd(20)} ${r._count}`);
  console.log(`  top researchers:`);
  for (const u of reUsers) {
    const user = await prisma.user.findUnique({
      where: { id: u.userId },
      select: { email: true },
    });
    console.log(`    ${(user?.email ?? u.userId).padEnd(40)} ${u._count}`);
  }

  /* ── Workspaces ────────────────────────────────────────────── */
  divider("AtlasWorkspace");
  const wsTotal = await prisma.atlasWorkspace.count();
  const wsArchived = await prisma.atlasWorkspace.count({
    where: { archived: true },
  });
  const wsShared = await prisma.atlasWorkspace.count({
    where: { shareToken: { not: null } },
  });
  const wsCards = await prisma.atlasWorkspaceCard.count();
  console.log(`  workspaces:      ${wsTotal}`);
  console.log(`    archived:      ${wsArchived}`);
  console.log(`    shared:        ${wsShared}`);
  console.log(`  cards (total):   ${wsCards}`);
  if (wsTotal > 0) {
    const avg = (wsCards / wsTotal).toFixed(1);
    console.log(`    avg per ws:    ${avg}`);
  }

  /* ── Updates (admin-published news) ────────────────────────── */
  divider("AtlasUpdate");
  const upTotal = await prisma.atlasUpdate.count();
  const upPublished = await prisma.atlasUpdate.count({
    where: { isPublished: true },
  });
  const upByCat = await prisma.atlasUpdate.groupBy({
    by: ["category"],
    _count: true,
  });
  const upByJur = await prisma.atlasUpdate.groupBy({
    by: ["jurisdiction"],
    _count: true,
    orderBy: { _count: { jurisdiction: "desc" } },
  });
  const newestUpdate = await prisma.atlasUpdate.findFirst({
    where: { isPublished: true },
    orderBy: { publishedAt: "desc" },
    select: { title: true, publishedAt: true, jurisdiction: true },
  });
  console.log(`  total: ${upTotal}  (published: ${upPublished})`);
  console.log(`  by category:`);
  for (const c of upByCat)
    console.log(`    ${c.category.padEnd(15)} ${c._count}`);
  console.log(`  by jurisdiction (top):`);
  for (const j of upByJur.slice(0, 10))
    console.log(`    ${(j.jurisdiction ?? "(global)").padEnd(8)} ${j._count}`);
  if (newestUpdate)
    console.log(
      `  most recent:   "${newestUpdate.title.slice(0, 50)}…" (${newestUpdate.jurisdiction ?? "global"}, ${newestUpdate.publishedAt.toISOString().slice(0, 10)})`,
    );

  /* ── Notifications ─────────────────────────────────────────── */
  divider("AtlasNotification");
  const nTotal = await prisma.atlasNotification.count();
  const nUnread = await prisma.atlasNotification.count({
    where: { readAt: null },
  });
  const nByKind = await prisma.atlasNotification.groupBy({
    by: ["kind"],
    _count: true,
  });
  console.log(`  total: ${nTotal}  (unread: ${nUnread})`);
  console.log(`  by kind:`);
  for (const k of nByKind) console.log(`    ${k.kind.padEnd(20)} ${k._count}`);

  /* ── Alert subscriptions ───────────────────────────────────── */
  divider("AtlasAlertSubscription");
  const subTotal = await prisma.atlasAlertSubscription.count();
  const subByType = await prisma.atlasAlertSubscription.groupBy({
    by: ["targetType"],
    _count: true,
  });
  const hotTargets = await prisma.atlasAlertSubscription.groupBy({
    by: ["targetType", "targetId"],
    _count: true,
    orderBy: { _count: { targetId: "desc" } },
    take: 10,
  });
  console.log(`  total: ${subTotal}`);
  console.log(`  by targetType:`);
  for (const t of subByType)
    console.log(`    ${t.targetType.padEnd(15)} ${t._count}`);
  console.log(`  most-watched targets:`);
  for (const t of hotTargets)
    console.log(
      `    ${t.targetType.padEnd(15)} ${t.targetId.padEnd(25)} ${t._count}`,
    );

  /* ── Source-check (link health) ────────────────────────────── */
  divider("AtlasSourceCheck");
  const scTotal = await prisma.atlasSourceCheck.count();
  const scByStatus = await prisma.atlasSourceCheck.groupBy({
    by: ["status"],
    _count: true,
  });
  const scWithChange = await prisma.atlasSourceCheck.count({
    where: { lastChanged: { not: null } },
  });
  const scOldestUnreviewed = await prisma.atlasSourceCheck.findFirst({
    where: { lastChanged: { not: null }, reviewedAt: null },
    orderBy: { lastChanged: "asc" },
    select: { sourceId: true, lastChanged: true, status: true },
  });
  console.log(`  total tracked sources: ${scTotal}`);
  console.log(`  by status:`);
  for (const s of scByStatus)
    console.log(`    ${s.status.padEnd(15)} ${s._count}`);
  console.log(`  ever-changed:           ${scWithChange}`);
  if (scOldestUnreviewed)
    console.log(
      `  oldest unreviewed change: ${scOldestUnreviewed.sourceId} (${scOldestUnreviewed.lastChanged?.toISOString().slice(0, 10)})`,
    );

  const schTotal = await prisma.atlasSourceCheckHistory.count();
  console.log(`  history entries (audit trail): ${schTotal}`);

  /* ── Pending source candidates ─────────────────────────────── */
  divider("AtlasPendingSourceCandidate");
  const pcTotal = await prisma.atlasPendingSourceCandidate.count();
  const pcByStatus = await prisma.atlasPendingSourceCandidate.groupBy({
    by: ["reviewStatus"],
    _count: true,
  });
  const pcByFeed = await prisma.atlasPendingSourceCandidate.groupBy({
    by: ["feedSource"],
    _count: true,
    orderBy: { _count: { feedSource: "desc" } },
  });
  console.log(`  total: ${pcTotal}`);
  console.log(`  by review-status:`);
  for (const r of pcByStatus)
    console.log(`    ${r.reviewStatus.padEnd(15)} ${r._count}`);
  console.log(`  by feed:`);
  for (const f of pcByFeed)
    console.log(`    ${f.feedSource.padEnd(25)} ${f._count}`);

  /* ── User-engagement summary ───────────────────────────────── */
  divider("ENGAGEMENT SUMMARY");
  const distinctUsers = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(DISTINCT "userId")::bigint as count FROM (
      SELECT "userId" FROM "AtlasBookmark"
      UNION SELECT "userId" FROM "AtlasAnnotation"
      UNION SELECT "userId" FROM "AtlasResearchEntry"
      UNION SELECT "userId" FROM "AtlasWorkspace"
      UNION SELECT "userId" FROM "AtlasAlertSubscription"
    ) t
  `;
  console.log(
    `  Distinct users with ANY Atlas footprint: ${distinctUsers[0]?.count ?? 0}`,
  );

  console.log(
    "\n══════════════════════════════════════════════════════════════\n",
  );
}

main()
  .catch((e) => {
    console.error("\n[atlas-depth-audit] failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
