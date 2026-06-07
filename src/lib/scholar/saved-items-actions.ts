"use server";

/**
 * Scholar saved-items server actions.
 *
 * Thin "use server" wrappers around the IDOR-safe data layer in
 * `saved-items.server.ts`. Each action:
 *   1. resolves the current user via `auth()` → session.user.id;
 *      if there is no session, it returns { ok: false } (no throw).
 *   2. calls the service with that userId (the service does the per-user
 *      filtering — these wrappers never trust a userId from the client).
 *   3. revalidates the affected routes so the saved/list/detail surfaces
 *      reflect the mutation.
 *
 * Args are plain serialisable strings (NOT FormData) so client components
 * can call these directly.
 */

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import {
  toggleBookmark,
  createReadingList as createReadingListSvc,
  renameReadingList as renameReadingListSvc,
  deleteReadingList as deleteReadingListSvc,
  addToReadingList as addToReadingListSvc,
  removeFromReadingList as removeFromReadingListSvc,
  type ScholarItemType,
} from "@/lib/scholar/saved-items.server";

/** Resolve the signed-in user id, or null when there is no session. */
async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/**
 * Revalidate the detail page for an item so its bookmark/star state
 * re-renders after a mutation. Mirrors resolveItem()'s href mapping.
 */
function revalidateDetailPath(itemType: ScholarItemType, itemId: string): void {
  if (itemType === "source") {
    revalidatePath(`/scholar/sources/${itemId}`);
  } else if (itemType === "case") {
    revalidatePath(`/scholar/cases/${itemId}`);
  }
}

// ─── Bookmarks ─────────────────────────────────────────────────────────────────

/**
 * Toggle a bookmark for the current user. Returns the new state.
 * { ok: false } when there is no session.
 */
export async function toggleBookmarkAction(
  itemType: ScholarItemType,
  itemId: string,
): Promise<{ ok: boolean; bookmarked?: boolean }> {
  const userId = await currentUserId();
  if (!userId) return { ok: false };

  const { bookmarked } = await toggleBookmark(userId, itemType, itemId);

  revalidatePath("/scholar/saved");
  revalidateDetailPath(itemType, itemId);
  return { ok: true, bookmarked };
}

/**
 * Remove a bookmark (idempotent — used by the saved list's remove control).
 * Implemented by ensuring the bookmark ends up absent: if toggling would
 * re-create it, we toggle a second time so the net effect is "removed".
 */
export async function removeBookmarkAction(
  itemType: ScholarItemType,
  itemId: string,
): Promise<{ ok: boolean }> {
  const userId = await currentUserId();
  if (!userId) return { ok: false };

  // toggleBookmark returns the resulting state. If it came back `true` the
  // row was absent and we just created it — toggle again to remove. The
  // delete branch is keyed off the @@unique([userId,…]) so it stays per-user.
  const first = await toggleBookmark(userId, itemType, itemId);
  if (first.bookmarked) {
    await toggleBookmark(userId, itemType, itemId);
  }

  revalidatePath("/scholar/saved");
  revalidateDetailPath(itemType, itemId);
  return { ok: true };
}

// ─── Reading lists ───────────────────────────────────────────────────────────

/** Create a new reading list for the current user. */
export async function createListAction(
  name: string,
  description?: string,
): Promise<{ ok: boolean; id?: string }> {
  const userId = await currentUserId();
  if (!userId) return { ok: false };

  const trimmed = name.trim();
  if (!trimmed) return { ok: false };

  const { id } = await createReadingListSvc(userId, trimmed, description);

  revalidatePath("/scholar/saved");
  return { ok: true, id };
}

/** Rename a reading list owned by the current user. */
export async function renameListAction(
  listId: string,
  name: string,
): Promise<{ ok: boolean }> {
  const userId = await currentUserId();
  if (!userId) return { ok: false };

  const trimmed = name.trim();
  if (!trimmed) return { ok: false };

  const ok = await renameReadingListSvc(userId, listId, trimmed);

  revalidatePath("/scholar/saved");
  revalidatePath(`/scholar/lists/${listId}`);
  return { ok };
}

/** Delete a reading list owned by the current user (items cascade). */
export async function deleteListAction(
  listId: string,
): Promise<{ ok: boolean }> {
  const userId = await currentUserId();
  if (!userId) return { ok: false };

  const ok = await deleteReadingListSvc(userId, listId);

  revalidatePath("/scholar/saved");
  revalidatePath(`/scholar/lists/${listId}`);
  return { ok };
}

/** Add an item to a reading list owned by the current user. */
export async function addToListAction(
  listId: string,
  itemType: ScholarItemType,
  itemId: string,
  note?: string,
): Promise<{ ok: boolean }> {
  const userId = await currentUserId();
  if (!userId) return { ok: false };

  const ok = await addToReadingListSvc(userId, listId, itemType, itemId, note);

  revalidatePath("/scholar/saved");
  revalidatePath(`/scholar/lists/${listId}`);
  revalidateDetailPath(itemType, itemId);
  return { ok };
}

/** Remove an item from a reading list owned by the current user. */
export async function removeFromListAction(
  listId: string,
  itemType: ScholarItemType,
  itemId: string,
): Promise<{ ok: boolean }> {
  const userId = await currentUserId();
  if (!userId) return { ok: false };

  const ok = await removeFromReadingListSvc(userId, listId, itemType, itemId);

  revalidatePath("/scholar/saved");
  revalidatePath(`/scholar/lists/${listId}`);
  revalidateDetailPath(itemType, itemId);
  return { ok };
}
