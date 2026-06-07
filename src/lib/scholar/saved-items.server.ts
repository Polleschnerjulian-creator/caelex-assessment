/**
 * Scholar saved items — server-only data layer.
 *
 * Backs the "Merkliste" (one-click bookmarks) and named reading lists
 * (course lists for teaching) on top of the ScholarBookmark /
 * ScholarReadingList / ScholarReadingListItem models.
 *
 * IDOR safety (non-negotiable): EVERY read and write filters by `userId`.
 *   - Bookmarks key off the @@unique([userId, itemType, itemId]).
 *   - List mutations are scoped with updateMany/deleteMany where {…, userId}
 *     so a row that belongs to another user is simply not matched (no throw,
 *     no leak — the count is 0 and we return false).
 *   - List-ITEM mutations first verify the parent list belongs to the caller
 *     (findFirst where {id: listId, userId}) BEFORE touching any item rows,
 *     so a caller can never add to / read / remove from a list they don't own.
 *
 * Item resolution: bookmarks and list items store only {itemType, itemId}.
 * resolveItem() looks the id up in the static corpus (legal sources / cases)
 * and returns a render-ready {title, href}. Items that no longer resolve
 * (e.g. a corpus id was retired) are dropped from list output rather than
 * rendered as dead links.
 */
import "server-only";
import { prisma } from "@/lib/prisma";
import { getLegalSourceById } from "@/data/legal-sources";
import { getCaseById } from "@/data/legal-cases";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ScholarItemType = "source" | "case";

/** A saved item resolved against the corpus — enough to render a link. */
export interface ResolvedItem {
  itemType: ScholarItemType;
  itemId: string;
  title: string;
  href: string;
}

// ─── Corpus resolution (private) ───────────────────────────────────────────────

/**
 * Resolve a stored {itemType, itemId} against the static corpus.
 *   - "source" → legal source, href `/scholar/sources/{id}`
 *   - "case"   → legal case,   href `/scholar/cases/{id}`
 * Returns null when the id no longer exists in the corpus so callers can
 * drop dead references instead of rendering broken links.
 */
function resolveItem(
  itemType: ScholarItemType,
  itemId: string,
): ResolvedItem | null {
  if (itemType === "source") {
    const s = getLegalSourceById(itemId);
    if (!s) return null;
    return {
      itemType,
      itemId,
      title: s.title_local ?? s.title_en,
      href: `/scholar/sources/${s.id}`,
    };
  }
  if (itemType === "case") {
    const c = getCaseById(itemId);
    if (!c) return null;
    return {
      itemType,
      itemId,
      title: c.title,
      href: `/scholar/cases/${c.id}`,
    };
  }
  return null;
}

// ─── Bookmarks ─────────────────────────────────────────────────────────────────

/**
 * Toggle a bookmark for the caller. Creates the row if absent (→ bookmarked
 * true), deletes it if present (→ bookmarked false). Keyed off the
 * @@unique([userId, itemType, itemId]) so it is per-user by construction.
 */
export async function toggleBookmark(
  userId: string,
  itemType: ScholarItemType,
  itemId: string,
): Promise<{ bookmarked: boolean }> {
  const existing = await prisma.scholarBookmark.findUnique({
    where: { userId_itemType_itemId: { userId, itemType, itemId } },
    select: { id: true },
  });

  if (existing) {
    await prisma.scholarBookmark.delete({ where: { id: existing.id } });
    return { bookmarked: false };
  }

  await prisma.scholarBookmark.create({ data: { userId, itemType, itemId } });
  return { bookmarked: true };
}

/** Whether the caller has bookmarked the given item. */
export async function isBookmarked(
  userId: string,
  itemType: ScholarItemType,
  itemId: string,
): Promise<boolean> {
  const row = await prisma.scholarBookmark.findUnique({
    where: { userId_itemType_itemId: { userId, itemType, itemId } },
    select: { id: true },
  });
  return row !== null;
}

/**
 * All of the caller's bookmarks, newest-first, resolved against the corpus.
 * Items that no longer resolve are dropped.
 */
export async function getBookmarks(userId: string): Promise<ResolvedItem[]> {
  const rows = await prisma.scholarBookmark.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { itemType: true, itemId: true },
  });

  const resolved: ResolvedItem[] = [];
  for (const row of rows) {
    const item = resolveItem(row.itemType as ScholarItemType, row.itemId);
    if (item) resolved.push(item);
  }
  return resolved;
}

// ─── Reading lists ───────────────────────────────────────────────────────────

/** Create a new reading list owned by the caller. */
export async function createReadingList(
  userId: string,
  name: string,
  description?: string,
): Promise<{ id: string }> {
  const list = await prisma.scholarReadingList.create({
    data: { userId, name, description: description ?? null },
    select: { id: true },
  });
  return { id: list.id };
}

/**
 * Rename a reading list. Scoped via updateMany where {id, userId}: a list
 * the caller doesn't own simply isn't matched (count 0 → false).
 */
export async function renameReadingList(
  userId: string,
  listId: string,
  name: string,
): Promise<boolean> {
  const res = await prisma.scholarReadingList.updateMany({
    where: { id: listId, userId },
    data: { name },
  });
  return res.count > 0;
}

/**
 * Delete a reading list (items cascade via the relation). Scoped via
 * deleteMany where {id, userId} so only the owner's row is removed.
 */
export async function deleteReadingList(
  userId: string,
  listId: string,
): Promise<boolean> {
  const res = await prisma.scholarReadingList.deleteMany({
    where: { id: listId, userId },
  });
  return res.count > 0;
}

/** Summaries of the caller's reading lists (newest-first) with item counts. */
export async function getReadingLists(
  userId: string,
): Promise<
  { id: string; name: string; description: string | null; itemCount: number }[]
> {
  const lists = await prisma.scholarReadingList.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      _count: { select: { items: true } },
    },
  });
  return lists.map((l) => ({
    id: l.id,
    name: l.name,
    description: l.description,
    itemCount: l._count.items,
  }));
}

/**
 * Full reading list (owned by the caller) with its resolved items in
 * position order. Returns null when the list doesn't exist or isn't owned
 * by the caller — the ownership filter is part of the same query.
 */
export async function getReadingList(
  userId: string,
  listId: string,
): Promise<{
  id: string;
  name: string;
  description: string | null;
  items: ResolvedItem[];
} | null> {
  const list = await prisma.scholarReadingList.findFirst({
    where: { id: listId, userId },
    select: {
      id: true,
      name: true,
      description: true,
      items: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        select: { itemType: true, itemId: true },
      },
    },
  });
  if (!list) return null;

  const items: ResolvedItem[] = [];
  for (const it of list.items) {
    const resolved = resolveItem(it.itemType as ScholarItemType, it.itemId);
    if (resolved) items.push(resolved);
  }

  return {
    id: list.id,
    name: list.name,
    description: list.description,
    items,
  };
}

/**
 * Add an item to a reading list. Verifies the list belongs to the caller
 * FIRST (ownership gate), then inserts. Duplicates are ignored via the
 * @@unique([listId, itemType, itemId]) — a repeat add is a no-op success.
 */
export async function addToReadingList(
  userId: string,
  listId: string,
  itemType: ScholarItemType,
  itemId: string,
  note?: string,
): Promise<boolean> {
  // Ownership gate — never mutate items on a list the caller doesn't own.
  const owned = await prisma.scholarReadingList.findFirst({
    where: { id: listId, userId },
    select: { id: true },
  });
  if (!owned) return false;

  await prisma.scholarReadingListItem.upsert({
    where: { listId_itemType_itemId: { listId, itemType, itemId } },
    create: { listId, itemType, itemId, note: note ?? null },
    update: {}, // dup add → leave the existing row untouched
  });
  return true;
}

/**
 * Remove an item from a reading list. Verifies the list belongs to the
 * caller FIRST, then deletes the matching item row.
 */
export async function removeFromReadingList(
  userId: string,
  listId: string,
  itemType: ScholarItemType,
  itemId: string,
): Promise<boolean> {
  // Ownership gate — never mutate items on a list the caller doesn't own.
  const owned = await prisma.scholarReadingList.findFirst({
    where: { id: listId, userId },
    select: { id: true },
  });
  if (!owned) return false;

  await prisma.scholarReadingListItem.deleteMany({
    where: { listId, itemType, itemId },
  });
  return true;
}
