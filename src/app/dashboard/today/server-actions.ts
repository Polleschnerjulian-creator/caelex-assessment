"use server";

import {
  snoozeComplianceItem,
  unsnoozeComplianceItem,
  addComplianceItemNote,
  markAsAttested,
} from "@/lib/comply-v2/actions/compliance-item-actions";
import { logger } from "@/lib/logger";

/**
 * Thin Server Action wrappers that the Today inbox client components
 * post forms to. The actual logic, validation, auth, and DB writes
 * live in the defineAction()-built actions imported above.
 *
 * Why split: Server Actions need to live in a "use server" module
 * that's importable from Client Components. The defineAction()
 * factory produces `serverAction` methods, but those are properties
 * on the action object, not standalone exports — Next.js requires
 * standalone exports here.
 *
 * Why void return: React's `<form action>` prop expects a function
 * that returns `void | Promise<void>`. Our underlying action
 * returns a rich `{ ok, result }` discriminated union. We swallow
 * the result here and log failures server-side; UX feedback comes
 * via revalidatePath() inside the action handlers.
 *
 * TODO(phase-2): once we add a toast system to V2Shell, surface
 * `{ ok: false, error }` to the user via redirect-with-search-param.
 */

export async function snoozeAction(formData: FormData): Promise<void> {
  const result = await snoozeComplianceItem.serverAction(formData);
  if (!result.ok) {
    logger.warn("[comply-v2] snooze action failed", { error: result.error });
  }
}

export async function unsnoozeAction(formData: FormData): Promise<void> {
  const result = await unsnoozeComplianceItem.serverAction(formData);
  if (!result.ok) {
    logger.warn("[comply-v2] unsnooze action failed", { error: result.error });
  }
}

export async function addNoteAction(formData: FormData): Promise<void> {
  const result = await addComplianceItemNote.serverAction(formData);
  if (!result.ok) {
    logger.warn("[comply-v2] add-note action failed", { error: result.error });
  }
}

/**
 * Mark-attested has `requiresApproval: true` in its action config —
 * calling it from the form posts a proposal to /dashboard/proposals
 * instead of immediately changing the underlying status. The Today
 * card UI shows "Submitted for approval" feedback (Phase 2 — for now
 * the user sees the inbox refresh and the pending-proposal badge
 * tick up in the V2Shell header).
 */
export async function markAttestedAction(formData: FormData): Promise<void> {
  const result = await markAsAttested.serverAction(formData);
  if (!result.ok) {
    logger.warn("[comply-v2] mark-attested action failed", {
      error: result.error,
    });
  }
}
