import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";

/**
 * Sentinel thrown from inside the interactive transaction to signal
 * quota exhaustion — caught at the outer layer to return a 409 without
 * leaking stack/Prisma internals. Keeping it module-scoped so the
 * `instanceof` check survives transpilation.
 */
class QuotaExceededError extends Error {
  constructor(public readonly currentCount: number) {
    super("Bookmark quota exceeded");
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** H4: restrict href to http(s) only — blocks javascript:/data: URIs. */
const SafeHrefSchema = z
  .string()
  .min(1)
  .max(500)
  .refine((v) => /^(https?:)?\/\//.test(v) || v.startsWith("/"), {
    message: "href must be http(s) or a site-relative path",
  });

const BookmarkSchema = z.object({
  itemId: z.string().min(1).max(200),
  itemType: z.enum(["source", "jurisdiction", "authority"]),
  title: z.string().min(1).max(500),
  subtitle: z.string().max(500).nullish(),
  href: SafeHrefSchema,
  note: z.string().max(2000).nullish(),
});

const BulkImportSchema = z.object({
  items: z.array(BookmarkSchema).max(500),
});

/** M10: hard cap per user — prevents DB bloat from abusive clients. */
const MAX_BOOKMARKS_PER_USER = 1000;

// ─── GET /api/atlas/bookmarks ─────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ bookmarks: [] });
    }

    // Audit L4: rate-limit the read path too. Without this, an authed
    // user (or leaked token) can enumerate bookmarks in a tight loop
    // for DB-load DoS or for exfiltration of the full item-id namespace.
    const rl = await checkRateLimit("api", getIdentifier(req, session.user.id));
    if (!rl.success) return createRateLimitResponse(rl);

    const rows = await prisma.atlasBookmark.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        itemId: true,
        itemType: true,
        title: true,
        subtitle: true,
        href: true,
        note: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      bookmarks: rows.map((r) => ({
        id: r.itemId, // expose itemId as id on the client (BookmarkRef shape)
        dbId: r.id,
        type: r.itemType,
        title: r.title,
        subtitle: r.subtitle,
        href: r.href,
        note: r.note,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    logger.error("Atlas bookmarks GET failed", { error: err });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// ─── POST /api/atlas/bookmarks (create or bulk import) ────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // H1: user-keyed rate-limit on writes
    const rl = await checkRateLimit("api", getIdentifier(req, session.user.id));
    if (!rl.success) return createRateLimitResponse(rl);

    const body = await req.json().catch(() => ({}));

    // Support both single and bulk import
    const bulk = BulkImportSchema.safeParse(body);
    if (bulk.success) {
      // M-4 fix: prior version ran the count() outside the transaction,
      // so two concurrent imports could both pass the quota gate before
      // either one committed. Now the count happens *inside* a
      // Serializable interactive tx — Postgres rejects one of the
      // concurrent transactions on serialization-failure, which we
      // surface as a 409 just like an over-quota result.
      const userId = session.user.id;
      const items = bulk.data.items;
      try {
        const result = await prisma.$transaction(
          async (tx) => {
            // Only NEW itemIds consume quota — upsert'd updates don't
            // grow the row count, so gate on inserts only.
            const existing = await tx.atlasBookmark.findMany({
              where: {
                userId,
                itemId: { in: items.map((it) => it.itemId) },
              },
              select: { itemId: true },
            });
            const existingIds = new Set(existing.map((e) => e.itemId));
            const newCount = items.filter(
              (it) => !existingIds.has(it.itemId),
            ).length;
            const currentCount = await tx.atlasBookmark.count({
              where: { userId },
            });
            if (currentCount + newCount > MAX_BOOKMARKS_PER_USER) {
              throw new QuotaExceededError(currentCount);
            }
            return Promise.all(
              items.map((it) =>
                tx.atlasBookmark.upsert({
                  where: { userId_itemId: { userId, itemId: it.itemId } },
                  create: {
                    userId,
                    itemId: it.itemId,
                    itemType: it.itemType,
                    title: it.title,
                    subtitle: it.subtitle ?? null,
                    href: it.href,
                    note: it.note ?? null,
                  },
                  update: {
                    title: it.title,
                    subtitle: it.subtitle ?? null,
                    href: it.href,
                  },
                }),
              ),
            );
          },
          { isolationLevel: "Serializable" },
        );

        // H-2 fix: single audit entry per bulk call keeps the log
        // readable and makes import-activity traceable without spam.
        await logAuditEvent({
          userId,
          action: "atlas_bookmarks_imported",
          entityType: "atlas_bookmark",
          entityId: `bulk:${result.length}`,
          newValue: { count: result.length },
          description: `Imported ${result.length} bookmarks`,
        });

        return NextResponse.json({ imported: result.length });
      } catch (err) {
        if (err instanceof QuotaExceededError) {
          return NextResponse.json(
            {
              error: "Bookmark quota exceeded",
              limit: MAX_BOOKMARKS_PER_USER,
              current: err.currentCount,
            },
            { status: 409 },
          );
        }
        throw err;
      }
    }

    const single = BookmarkSchema.safeParse(body);
    if (!single.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: single.error.format() },
        { status: 400 },
      );
    }

    // M-2: All four DB ops (existence-check → quota-check → upsert) run
    // inside a Serializable transaction, matching the bulk-path pattern
    // above. Without this, two parallel POSTs with the same itemId saw
    // existedBefore=null in both, both attempted INSERT, one crashed
    // with P2002 surfaced as a 500 to the client. Now: one creates, the
    // other becomes a no-op update under serialisation.
    const userId = session.user.id;
    let row: Awaited<ReturnType<typeof prisma.atlasBookmark.upsert>>;
    let existedBefore: { id: string } | null = null;
    try {
      const txResult = await prisma.$transaction(
        async (tx) => {
          existedBefore = await tx.atlasBookmark.findUnique({
            where: { userId_itemId: { userId, itemId: single.data.itemId } },
            select: { id: true },
          });
          if (!existedBefore) {
            const currentCount = await tx.atlasBookmark.count({
              where: { userId },
            });
            if (currentCount >= MAX_BOOKMARKS_PER_USER) {
              throw new QuotaExceededError(currentCount);
            }
          }
          return tx.atlasBookmark.upsert({
            where: { userId_itemId: { userId, itemId: single.data.itemId } },
            create: {
              userId,
              itemId: single.data.itemId,
              itemType: single.data.itemType,
              title: single.data.title,
              subtitle: single.data.subtitle ?? null,
              href: single.data.href,
              note: single.data.note ?? null,
            },
            update: {
              title: single.data.title,
              subtitle: single.data.subtitle ?? null,
              href: single.data.href,
            },
          });
        },
        { isolationLevel: "Serializable" },
      );
      row = txResult;
    } catch (err) {
      if (err instanceof QuotaExceededError) {
        return NextResponse.json(
          {
            error: "Bookmark quota exceeded",
            limit: MAX_BOOKMARKS_PER_USER,
            current: err.currentCount,
          },
          { status: 409 },
        );
      }
      // Even with Serializable isolation, two writers can race and one
      // gets a P2002 unique-constraint violation — treat it as
      // idempotent: refetch the row that won and return it.
      const code =
        err && typeof err === "object" && "code" in err
          ? (err as { code?: string }).code
          : undefined;
      if (code === "P2002") {
        const winner = await prisma.atlasBookmark.findUnique({
          where: { userId_itemId: { userId, itemId: single.data.itemId } },
        });
        if (winner) {
          row = winner;
          existedBefore = { id: winner.id };
        } else {
          throw err;
        }
      } else {
        throw err;
      }
    }

    // H-2 fix: only audit-log true creates so updating a title in
    // place (common for a stale cached label) doesn't spam the chain.
    if (!existedBefore) {
      await logAuditEvent({
        userId: session.user.id,
        action: "atlas_bookmark_created",
        entityType: "atlas_bookmark",
        entityId: single.data.itemId,
        newValue: {
          itemType: single.data.itemType,
          title: single.data.title,
        },
        description: `Bookmarked ${single.data.itemType} ${single.data.itemId}`,
      });
    }

    return NextResponse.json({
      bookmark: {
        id: row.itemId,
        dbId: row.id,
        type: row.itemType,
        title: row.title,
        subtitle: row.subtitle,
        href: row.href,
      },
    });
  } catch (err) {
    logger.error("Atlas bookmarks POST failed", { error: err });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// ─── DELETE /api/atlas/bookmarks?itemId=... ───────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get("itemId");
    if (!itemId) {
      return NextResponse.json({ error: "itemId required" }, { status: 400 });
    }
    // H-2 fix: audit the delete only when a row actually existed,
    // so no-op deletes (idempotent retries, uninstall flows) don't
    // clutter the audit trail.
    const removed = await prisma.atlasBookmark
      .delete({
        where: { userId_itemId: { userId: session.user.id, itemId } },
        select: { itemType: true, title: true },
      })
      .catch(() => null);
    if (removed) {
      await logAuditEvent({
        userId: session.user.id,
        action: "atlas_bookmark_deleted",
        entityType: "atlas_bookmark",
        entityId: itemId,
        previousValue: removed,
        description: `Bookmark removed: ${removed.itemType} ${itemId}`,
      });
    }
    return NextResponse.json({ deleted: true });
  } catch (err) {
    logger.error("Atlas bookmarks DELETE failed", { error: err });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
