import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { z } from "zod";

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

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ bookmarks: [] });
    }

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

    // Pre-fetch current count once for quota enforcement
    const currentCount = await prisma.atlasBookmark.count({
      where: { userId: session.user.id },
    });

    // Support both single and bulk import
    const bulk = BulkImportSchema.safeParse(body);
    if (bulk.success) {
      // M10: cap total rows per user
      if (currentCount + bulk.data.items.length > MAX_BOOKMARKS_PER_USER) {
        return NextResponse.json(
          {
            error: "Bookmark quota exceeded",
            limit: MAX_BOOKMARKS_PER_USER,
            current: currentCount,
          },
          { status: 409 },
        );
      }
      const result = await prisma.$transaction(
        bulk.data.items.map((it) =>
          prisma.atlasBookmark.upsert({
            where: {
              userId_itemId: {
                userId: session.user!.id,
                itemId: it.itemId,
              },
            },
            create: {
              userId: session.user!.id,
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
      return NextResponse.json({ imported: result.length });
    }

    const single = BookmarkSchema.safeParse(body);
    if (!single.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: single.error.format() },
        { status: 400 },
      );
    }

    // M10: per-user quota check (count here is approximate — upsert may
    // replace an existing row, in which case count doesn't grow)
    if (currentCount >= MAX_BOOKMARKS_PER_USER) {
      const existing = await prisma.atlasBookmark.findUnique({
        where: {
          userId_itemId: {
            userId: session.user.id,
            itemId: single.data.itemId,
          },
        },
        select: { id: true },
      });
      if (!existing) {
        return NextResponse.json(
          {
            error: "Bookmark quota exceeded",
            limit: MAX_BOOKMARKS_PER_USER,
            current: currentCount,
          },
          { status: 409 },
        );
      }
    }

    const row = await prisma.atlasBookmark.upsert({
      where: {
        userId_itemId: {
          userId: session.user.id,
          itemId: single.data.itemId,
        },
      },
      create: {
        userId: session.user.id,
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
    await prisma.atlasBookmark
      .delete({
        where: { userId_itemId: { userId: session.user.id, itemId } },
      })
      .catch(() => {
        /* idempotent: ignore missing */
      });
    return NextResponse.json({ deleted: true });
  } catch (err) {
    logger.error("Atlas bookmarks DELETE failed", { error: err });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
