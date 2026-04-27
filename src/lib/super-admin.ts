/**
 * Super-Admin allowlist — three accounts that bypass every access gate
 * in the platform regardless of org membership, plan, orgType, or
 * subscription state.
 *
 * Why hardcoded: These are the platform owners. They need to debug any
 * customer flow (Caelex dashboard, Atlas, Pharos), inspect any org's
 * data, and recover from misconfigurations that would otherwise lock
 * everyone out — including themselves. The DB-backed `User.role` flag
 * still exists for normal staff admins; this is a stricter, code-level
 * tier on top.
 *
 * Why NOT env-var: A staging / fork env restored from prod could
 * accidentally elevate the wrong account if ADMIN_EMAILS were
 * mis-configured. Shipping the list in version control means changes
 * leave a code-review trail.
 *
 * The check is intentionally case-insensitive — Postgres email columns
 * are stored lowercase by the signup flow, but defensive double-check.
 *
 * Add new addresses by editing the literal array, opening a PR, and
 * deploying. Removal works the same way.
 */

const SUPER_ADMIN_EMAILS_RAW = [
  "julian@caelex.eu",
  "niklas@caelex.eu",
  "polleschnerjulian@gmail.com",
] as const;

const SUPER_ADMIN_EMAILS: ReadonlySet<string> = new Set(
  SUPER_ADMIN_EMAILS_RAW.map((e) => e.toLowerCase()),
);

/**
 * Returns true when the email belongs to a hardcoded super-admin.
 * Use this anywhere a "platform owner" bypass is needed — dashboard
 * subscription gate, Atlas org-type gate, Pharos jurisdiction filter,
 * etc. Always wrap behind explicit intent — don't sprinkle this check
 * into every API route reflexively, only into surfaces that should be
 * accessible to platform owners.
 */
export function isSuperAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.has(email.toLowerCase());
}

/**
 * Public accessor for the set — read-only, lowercase. Useful when a
 * caller needs to query Prisma directly (`{ email: { in: [...] } }`).
 */
export function getSuperAdminEmails(): readonly string[] {
  return [...SUPER_ADMIN_EMAILS];
}
