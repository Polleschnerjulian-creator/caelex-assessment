/**
 * Super-Admin allowlist — accounts that bypass every access gate in
 * the platform regardless of org membership, plan, orgType, or
 * subscription state.
 *
 * Why this tier exists: These are the platform owners. They need to debug any
 * customer flow (Caelex dashboard, Atlas, Pharos), inspect any org's data,
 * operate the cross-product /admin analytics center, and recover from
 * misconfigurations that would otherwise lock everyone out — including
 * themselves. The DB-backed `User.role` flag still exists for normal staff
 * admins; this is a stricter, code-level tier on top.
 *
 * ─── TWO-TIER ALLOWLIST (updated 2026-06-08) ──────────────────────
 *
 * The effective super-admin set is the UNION of:
 *
 *   1. A hardcoded FAILSAFE BASE of company `@caelex.eu` addresses. Kept in
 *      version control so (a) a misconfigured or empty env can NEVER lock the
 *      platform owners out, and (b) changes to the core owner set always leave
 *      a code-review trail. Only non-personal company addresses live here.
 *
 *   2. An ADDITIVE env allowlist `SUPERADMIN_EMAILS` (comma / semicolon /
 *      whitespace separated) the operator controls in Vercel. This grants or
 *      revokes super-admin to ADDITIONAL accounts — personal addresses,
 *      temporary staff — WITHOUT a code deploy. Personal addresses belong here,
 *      not in source.
 *
 * Removing the env var only drops the additive entries; the `@caelex.eu` base
 * always remains, so the platform can never be fully locked out by env drift
 * (the original objection to a pure env-var allowlist).
 *
 * ⚠️ OPERATIONAL NOTE: set `SUPERADMIN_EMAILS` in Vercel before relying on
 * /admin. Any owner who logs in with a personal (non-`@caelex.eu`) address must
 * be listed there or they will NOT pass the super-admin gate.
 *
 * ─── Privacy & DPA disclosure ─────────────────────────────────────
 *
 * The existence of platform-owner accounts with cross-tenant administrative
 * access is disclosed to data controllers in:
 *   - /legal/privacy § 5  (sub-processors + internal access)
 *   - /legal/dpa § 4.3    (TOMs — Restricted Administrative Access)
 *   - /legal/sub-processors (Caelex Platform Operations entry)
 *
 * Use of this bypass against a customer's data MUST be audit-logged via
 * `logSuperAdminAccess()` (see `lib/admin-auth.server.ts`). That produces a
 * tamper-evident trail (audit-log SHA-256 hash chain) the customer can review
 * on request under DPA § 5.
 *
 * The check is intentionally case-insensitive — Postgres email columns are
 * stored lowercase by the signup flow, but this is a defensive double-check.
 *
 * NOTE: this module is intentionally dependency-free (no `server-only`, no
 * Prisma) so it can be imported from client components that branch on
 * super-admin status (e.g. the dashboard SubscriptionGate). The audit write
 * lives in the server-only `lib/admin-auth.server.ts` to keep it that way.
 */

/**
 * Hardcoded failsafe base — company addresses only. Personal addresses are NOT
 * listed here; add them via the `SUPERADMIN_EMAILS` env var instead.
 */
const SUPER_ADMIN_BASE_RAW = [
  "julian@caelex.eu",
  "niklas@caelex.eu",
  "test-operator@caelex.eu",
] as const;

const SUPER_ADMIN_BASE: ReadonlySet<string> = new Set(
  SUPER_ADMIN_BASE_RAW.map((e) => e.toLowerCase()),
);

/**
 * Parse the additive `SUPERADMIN_EMAILS` env allowlist. Tolerant of comma /
 * semicolon / whitespace separators and surrounding spaces; lowercases every
 * entry and drops anything that does not look like an email. An unset or empty
 * value yields `[]`. Exported for unit testing.
 */
export function parseSuperAdminEnv(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0 && e.includes("@"));
}

/**
 * The effective super-admin set = hardcoded base ∪ `SUPERADMIN_EMAILS` env.
 * Computed per call (the env is re-read each time) so an env change is picked
 * up without a module reload, and so the env merge is unit-testable. The set is
 * tiny, so the per-call cost is negligible; when the env is unset we return the
 * pre-built base set directly with no allocation.
 */
function effectiveSuperAdmins(): ReadonlySet<string> {
  const env = parseSuperAdminEnv(process.env.SUPERADMIN_EMAILS);
  if (env.length === 0) return SUPER_ADMIN_BASE;
  return new Set([...SUPER_ADMIN_BASE, ...env]);
}

/**
 * Returns true when the email belongs to a super-admin (company base or the
 * `SUPERADMIN_EMAILS` env allowlist). Use this anywhere a "platform owner"
 * bypass is needed — dashboard subscription gate, Atlas org-type gate, the
 * /admin analytics center, etc. Always wrap behind explicit intent — don't
 * sprinkle this check into every API route reflexively, only into surfaces that
 * should be accessible to platform owners.
 */
export function isSuperAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return effectiveSuperAdmins().has(email.toLowerCase());
}

/**
 * Public accessor for the effective set — read-only, lowercase. Useful when a
 * caller needs to query Prisma directly (`{ email: { in: [...] } }`).
 */
export function getSuperAdminEmails(): readonly string[] {
  return [...effectiveSuperAdmins()];
}
