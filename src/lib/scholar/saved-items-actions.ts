"use server";

/**
 * Scholar saved-items server actions.
 *
 * Thin "use server" wrappers around the IDOR-safe data layer in
 * `saved-items.server.ts`. Each action:
 *   1. resolves the caller via getScholarAuth() — session → active org →
 *      SCHOLAR product entitlement (+ the MFA gate). It NEVER trusts a userId
 *      from the client; { ok: false } is returned when the caller is not an
 *      entitled, MFA-satisfied Scholar user (no throw). This matches the
 *      /api/scholar/* read routes — writes are gated on the SAME entitlement,
 *      not merely on session presence (closes the "logged-in non-Scholar user
 *      can still mutate Scholar rows" gap).
 *   2. enforces a per-user write rate limit (Upstash "scholar" tier). Server
 *      actions POST to page routes, which the API-only middleware limiter does
 *      NOT cover, so without this they were unthrottled (storage-spam vector).
 *   3. validates + bounds every input with Zod (itemType enum, itemId/listId
 *      length, name/description/note caps) before touching the data layer,
 *      which independently re-caps + corpus-validates as defense-in-depth.
 *   4. calls the service with the resolved userId and revalidates the affected
 *      routes so the saved/list/detail surfaces reflect the mutation.
 *
 * Args are plain serialisable strings (NOT FormData) so client components
 * can call these directly.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getScholarAuth } from "@/lib/scholar/scholar-auth";
import { checkRateLimit } from "@/lib/ratelimit";
import {
  toggleBookmark,
  createReadingList as createReadingListSvc,
  renameReadingList as renameReadingListSvc,
  deleteReadingList as deleteReadingListSvc,
  addToReadingList as addToReadingListSvc,
  removeFromReadingList as removeFromReadingListSvc,
  type ScholarItemType,
} from "@/lib/scholar/saved-items.server";

// ─── Auth + rate-limit + validation helpers ────────────────────────────────────

/**
 * Resolve the entitled Scholar user id (session → active org → SCHOLAR + MFA),
 * or null. Writes are gated on the same entitlement as the read routes.
 */
async function authedUserId(): Promise<string | null> {
  const ctx = await getScholarAuth();
  return ctx?.userId ?? null;
}

/**
 * Per-user write throttle. Server actions are not covered by the API-only
 * middleware rate limiter, so each mutating action is throttled here using the
 * existing Upstash "scholar" tier, keyed per-user.
 */
async function writeRateOk(userId: string): Promise<boolean> {
  const rl = await checkRateLimit("scholar", `scholar-write:${userId}`);
  return rl.success;
}

// itemId is not regex-constrained (corpus ids vary) — it is length-capped here
// and existence-checked against the corpus in the data layer (resolveItem), and
// only ever flows into parameterised Prisma queries + revalidatePath, so there
// is no injection surface. listId is a cuid.
const ItemTypeSchema = z.enum(["source", "case"]);
const ItemIdSchema = z.string().min(1).max(96);
const ListIdSchema = z.string().min(1).max(64);
const NameSchema = z.string().trim().min(1).max(120);
const DescriptionSchema = z.string().trim().max(500);
const NoteSchema = z.string().trim().max(500);

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
 * { ok: false } when the caller is unauthorised, rate-limited or sends bad input.
 */
export async function toggleBookmarkAction(
  itemType: ScholarItemType,
  itemId: string,
): Promise<{ ok: boolean; bookmarked?: boolean }> {
  const userId = await authedUserId();
  if (!userId) return { ok: false };
  if (!(await writeRateOk(userId))) return { ok: false };

  const parsed = z
    .object({ itemType: ItemTypeSchema, itemId: ItemIdSchema })
    .safeParse({ itemType, itemId });
  if (!parsed.success) return { ok: false };

  const { bookmarked } = await toggleBookmark(
    userId,
    parsed.data.itemType,
    parsed.data.itemId,
  );

  revalidatePath("/scholar/saved");
  revalidateDetailPath(parsed.data.itemType, parsed.data.itemId);
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
  const userId = await authedUserId();
  if (!userId) return { ok: false };
  if (!(await writeRateOk(userId))) return { ok: false };

  const parsed = z
    .object({ itemType: ItemTypeSchema, itemId: ItemIdSchema })
    .safeParse({ itemType, itemId });
  if (!parsed.success) return { ok: false };

  // toggleBookmark returns the resulting state. If it came back `true` the
  // row was absent and we just created it — toggle again to remove. The
  // delete branch is keyed off the @@unique([userId,…]) so it stays per-user.
  const first = await toggleBookmark(
    userId,
    parsed.data.itemType,
    parsed.data.itemId,
  );
  if (first.bookmarked) {
    await toggleBookmark(userId, parsed.data.itemType, parsed.data.itemId);
  }

  revalidatePath("/scholar/saved");
  revalidateDetailPath(parsed.data.itemType, parsed.data.itemId);
  return { ok: true };
}

// ─── Reading lists ───────────────────────────────────────────────────────────

/** Create a new reading list for the current user. */
export async function createListAction(
  name: string,
  description?: string,
): Promise<{ ok: boolean; id?: string }> {
  const userId = await authedUserId();
  if (!userId) return { ok: false };
  if (!(await writeRateOk(userId))) return { ok: false };

  const parsed = z
    .object({ name: NameSchema, description: DescriptionSchema.optional() })
    .safeParse({ name, description });
  if (!parsed.success) return { ok: false };

  try {
    const { id } = await createReadingListSvc(
      userId,
      parsed.data.name,
      parsed.data.description,
    );
    revalidatePath("/scholar/saved");
    return { ok: true, id };
  } catch {
    // e.g. per-user list cap reached
    return { ok: false };
  }
}

/** Rename a reading list owned by the current user. */
export async function renameListAction(
  listId: string,
  name: string,
): Promise<{ ok: boolean }> {
  const userId = await authedUserId();
  if (!userId) return { ok: false };
  if (!(await writeRateOk(userId))) return { ok: false };

  const parsed = z
    .object({ listId: ListIdSchema, name: NameSchema })
    .safeParse({ listId, name });
  if (!parsed.success) return { ok: false };

  const ok = await renameReadingListSvc(
    userId,
    parsed.data.listId,
    parsed.data.name,
  );

  revalidatePath("/scholar/saved");
  revalidatePath(`/scholar/lists/${parsed.data.listId}`);
  return { ok };
}

/** Delete a reading list owned by the current user (items cascade). */
export async function deleteListAction(
  listId: string,
): Promise<{ ok: boolean }> {
  const userId = await authedUserId();
  if (!userId) return { ok: false };
  if (!(await writeRateOk(userId))) return { ok: false };

  const parsed = ListIdSchema.safeParse(listId);
  if (!parsed.success) return { ok: false };

  const ok = await deleteReadingListSvc(userId, parsed.data);

  revalidatePath("/scholar/saved");
  revalidatePath(`/scholar/lists/${parsed.data}`);
  return { ok };
}

/** Add an item to a reading list owned by the current user. */
export async function addToListAction(
  listId: string,
  itemType: ScholarItemType,
  itemId: string,
  note?: string,
): Promise<{ ok: boolean }> {
  const userId = await authedUserId();
  if (!userId) return { ok: false };
  if (!(await writeRateOk(userId))) return { ok: false };

  const parsed = z
    .object({
      listId: ListIdSchema,
      itemType: ItemTypeSchema,
      itemId: ItemIdSchema,
      note: NoteSchema.optional(),
    })
    .safeParse({ listId, itemType, itemId, note });
  if (!parsed.success) return { ok: false };

  const ok = await addToReadingListSvc(
    userId,
    parsed.data.listId,
    parsed.data.itemType,
    parsed.data.itemId,
    parsed.data.note,
  );

  revalidatePath("/scholar/saved");
  revalidatePath(`/scholar/lists/${parsed.data.listId}`);
  revalidateDetailPath(parsed.data.itemType, parsed.data.itemId);
  return { ok };
}

/** Remove an item from a reading list owned by the current user. */
export async function removeFromListAction(
  listId: string,
  itemType: ScholarItemType,
  itemId: string,
): Promise<{ ok: boolean }> {
  const userId = await authedUserId();
  if (!userId) return { ok: false };
  if (!(await writeRateOk(userId))) return { ok: false };

  const parsed = z
    .object({
      listId: ListIdSchema,
      itemType: ItemTypeSchema,
      itemId: ItemIdSchema,
    })
    .safeParse({ listId, itemType, itemId });
  if (!parsed.success) return { ok: false };

  const ok = await removeFromReadingListSvc(
    userId,
    parsed.data.listId,
    parsed.data.itemType,
    parsed.data.itemId,
  );

  revalidatePath("/scholar/saved");
  revalidatePath(`/scholar/lists/${parsed.data.listId}`);
  revalidateDetailPath(parsed.data.itemType, parsed.data.itemId);
  return { ok };
}
