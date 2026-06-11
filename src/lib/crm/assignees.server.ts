/**
 * CRM task assignees — the set of people a CrmTask can be assigned to.
 *
 * For the 2-person founder team this is simply the platform-owner
 * allowlist (`getSuperAdminEmails()`) minus the synthetic test account.
 * Shared by GET /api/admin/crm/assignees (who is pickable) and the
 * tasks API (server-side validation of `assigneeId`), so both can never
 * drift apart.
 */

import "server-only";

import { getSuperAdminEmails } from "@/lib/super-admin";

/** Synthetic accounts that must never show up as assignable humans. */
const EXCLUDED_ASSIGNEE_EMAILS: ReadonlySet<string> = new Set([
  "test-operator@caelex.eu",
]);

/**
 * Lowercased emails of every assignable person (platform owners minus
 * excluded test accounts). Order is not significant.
 */
export function getAssignableEmails(): string[] {
  return getSuperAdminEmails().filter((e) => !EXCLUDED_ASSIGNEE_EMAILS.has(e));
}

/** True when the given email belongs to an assignable person. */
export function isAssignableEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAssignableEmails().includes(email.toLowerCase());
}
