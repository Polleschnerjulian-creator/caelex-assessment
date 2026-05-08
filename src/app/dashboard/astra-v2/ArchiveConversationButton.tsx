"use client";

/**
 * Sprint UF36 (P1-D6) — Confirmation step before archiving an
 * Astra conversation.
 *
 * Audit P1-D6: the trash icon next to each conversation in the
 * sidebar fired the archive server-action on a single click. No
 * confirmation, no undo. Operators clicking too fast destroyed
 * conversation history. Archive is soft-delete (the conversation
 * still exists in DB), but it disappears from the sidebar and
 * comes back only via direct DB access.
 *
 * Two-stage UX (Linear / GitHub pattern):
 *
 *   stage 1 (idle):  hover-revealed Trash2 icon, click → stage 2
 *   stage 2 (armed): "Confirm?" pill is shown for 3 seconds with
 *                    a tiny X. Click confirm → fires server-action.
 *                    Click X or wait 3s → reverts to stage 1.
 *
 * Why no Radix Dialog modal: the conversation list lives in a
 * sidebar with dozens of rows. A modal feels heavy for a single-
 * row destructive action. The 2-stage pill is in-place + reversible
 * without a context-shift.
 */

import * as React from "react";
import { Trash2, Check, X } from "lucide-react";
import { archiveConversationAction } from "./server-actions";

const CONFIRM_TIMEOUT_MS = 3000;

export function ArchiveConversationButton({
  conversationId,
  conversationTitle,
}: {
  conversationId: string;
  conversationTitle: string;
}) {
  const [armed, setArmed] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-revert from "armed" state after 3s of inactivity. Prevents
  // accidentally-armed buttons from sitting in confirm-state forever.
  React.useEffect(() => {
    if (armed) {
      timerRef.current = setTimeout(() => setArmed(false), CONFIRM_TIMEOUT_MS);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [armed]);

  if (!armed) {
    return (
      <button
        type="button"
        aria-label={`Archive conversation "${conversationTitle}"`}
        onClick={(e) => {
          // Stop the parent Link from navigating when user clicks
          // the trash icon.
          e.preventDefault();
          e.stopPropagation();
          setArmed(true);
        }}
        className="opacity-0 transition group-hover/conv:opacity-100 rounded p-1 text-slate-500 hover:bg-red-500/15 hover:text-red-300"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={archiveConversationAction}
      onClick={(e) => e.stopPropagation()}
      className="flex items-center gap-0.5 rounded bg-rose-500/15 px-1 py-0.5 ring-1 ring-inset ring-rose-500/30"
    >
      <input type="hidden" name="conversationId" value={conversationId} />
      <button
        type="submit"
        aria-label={`Confirm archive of "${conversationTitle}"`}
        className="rounded px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-rose-200 transition hover:bg-rose-500/20"
      >
        <span className="inline-flex items-center gap-0.5">
          <Check className="h-2.5 w-2.5" />
          confirm
        </span>
      </button>
      <button
        type="button"
        aria-label="Cancel archive"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setArmed(false);
        }}
        className="rounded p-0.5 text-rose-300/70 transition hover:bg-rose-500/20 hover:text-rose-200"
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </form>
  );
}
