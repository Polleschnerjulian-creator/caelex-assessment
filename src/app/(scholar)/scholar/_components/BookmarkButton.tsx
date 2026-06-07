"use client";

/**
 * BookmarkButton — one-click "Merkliste" toggle for a Scholar source/case.
 *
 * Sits in the detail-page header card next to the "Amtliche Quelle/Entscheidung
 * ansehen" link. Flips a bookmark on the current item via toggleBookmarkAction
 * (the server action resolves the user from the session — the client never sends
 * a userId). Optimistic: the icon + label update instantly inside a transition;
 * if the action reports a different resulting state (or fails) we reconcile to
 * the truthful value the server returns, so the UI never lies.
 *
 * Client component (local optimistic state + useTransition). No data imports.
 *
 * STRICTLY MONOCHROME: black / white / gray-* only — zero other hues. The
 * "saved" state reads as a FILLED gray-900 glyph + a weight/colour step on the
 * label, never a colour cue — matching Scholar's reading-surface palette.
 *   • Type token: text-small (12px) — the same reading-meta size used by
 *     CopyCitation, so the control sits flush with the citation row. Never an
 *     ad-hoc text-[Npx].
 *
 * Accessibility (light canvas: #F7F8FA page / white cards):
 *   • gray-700 idle / gray-900 active label on white ≥ 6.4:1 ✓ WCAG 1.4.3 AA.
 *   • gray-300 border ≈ 3.3:1 — load-bearing outline meets WCAG 1.4.11.
 *   • aria-pressed reflects the toggle state to assistive tech (WCAG 4.1.2);
 *     an aria-live region announces the transition.
 *   • focus-visible:ring-2 ring-gray-900 ring-offset-2 with an #F7F8FA offset.
 *   • Target ≥ 24px (px-2.5 + py-1 around a 12px line clears WCAG 2.5.8).
 *   • Glyphs are aria-hidden; the label carries the meaning. Motion honours
 *     prefers-reduced-motion (motion-safe:transition-colors).
 *
 * Resilience: while the action is in flight the button is disabled (no double
 * fire). If the action returns { ok: false } (e.g. no session) the optimistic
 * flip is rolled back to its previous value — never left in a fake state.
 */

import { useCallback, useState, useTransition } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { toggleBookmarkAction } from "@/lib/scholar/saved-items-actions";

export function BookmarkButton({
  itemType,
  itemId,
  initialBookmarked,
}: {
  itemType: "source" | "case";
  itemId: string;
  initialBookmarked: boolean;
}) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [isPending, startTransition] = useTransition();

  const handleToggle = useCallback(() => {
    // Optimistic flip — reverted/reconciled once the server responds.
    const previous = bookmarked;
    const optimistic = !previous;
    setBookmarked(optimistic);

    startTransition(async () => {
      try {
        const res = await toggleBookmarkAction(itemType, itemId);
        if (!res.ok) {
          // No session / failure → roll back to the truthful previous value.
          setBookmarked(previous);
          return;
        }
        // Reconcile to the server's resulting state (handles a lost race where
        // another tab toggled the same item).
        if (typeof res.bookmarked === "boolean") {
          setBookmarked(res.bookmarked);
        }
      } catch {
        // Network/server error — undo the optimistic flip.
        setBookmarked(previous);
      }
    });
  }, [bookmarked, itemType, itemId]);

  const label = bookmarked ? "Gemerkt" : "Merken";

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      // aria-pressed makes this a proper toggle button for assistive tech.
      aria-pressed={bookmarked}
      className={
        "inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-2.5 py-1 " +
        "text-small text-gray-700 hover:bg-gray-50 " +
        "disabled:cursor-not-allowed disabled:opacity-60 " +
        "motion-safe:transition-colors " +
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 " +
        "focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA]"
      }
    >
      {/* Glyph — decorative; the adjacent label carries the meaning. Filled
          gray-900 BookmarkCheck = saved; outline Bookmark = not saved. */}
      {bookmarked ? (
        <BookmarkCheck size={13} className="text-gray-900" aria-hidden={true} />
      ) : (
        <Bookmark size={13} className="text-gray-700" aria-hidden={true} />
      )}
      <span className={bookmarked ? "font-medium text-gray-900" : undefined}>
        {label}
      </span>
      {/* Polite live region so screen readers hear the state transition. */}
      <span className="sr-only" role="status" aria-live="polite">
        {bookmarked
          ? "Zur Merkliste hinzugefügt"
          : "Von der Merkliste entfernt"}
      </span>
    </button>
  );
}
