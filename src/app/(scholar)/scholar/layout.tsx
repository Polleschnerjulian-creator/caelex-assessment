import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";
import { hasProductAccess } from "@/lib/products";
import { isSuperAdmin } from "@/lib/super-admin";
import ScholarShell from "./ScholarShell";
import { getScholarLocale } from "./_i18n/locale.server";
import { ScholarLocaleProvider } from "./_i18n/LocaleProvider";

/**
 * Caelex Scholar — Route-group layout (Tasks 3.1/3.2).
 *
 * Auth-gated at two layers:
 *   1. Session — unauthenticated visitors go to /scholar-login with callback.
 *   2. Product access — orgs without an ACTIVE/TRIAL OrganizationProductAccess
 *      row for `SCHOLAR` land on /scholar-no-access.
 *
 * Super-admins (platform owners) bypass the product entitlement check so
 * they can debug customer flows. Mirrors the Trade and Atlas layout patterns.
 *
 * Chrome (sidebar + full-page shell) is provided by the client component
 * ScholarShell, mirroring the pattern used by the old AtlasShell.
 *
 * i18n: the UI locale is resolved ONCE here from the user's persisted
 * preference (getScholarLocale) and provided to the whole client subtree via
 * ScholarLocaleProvider. Client components read it with useScholarLocale();
 * server pages resolve their own locale with getScholarLocale and pass it down
 * as a prop. The <html lang> for the surface is set on ScholarShell's wrapper.
 */
export default async function ScholarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/scholar-login?callbackUrl=%2Fscholar");
  }

  // MFA gate (page layer): a session that passed password but not the TOTP
  // second factor (mfaRequired && !mfaVerified) is sent to finish the challenge
  // before any Scholar page renders. getScholarAuth() enforces the same
  // condition for /api/scholar/* and the server actions; this redirect is the
  // page-level counterpart (mirrors the middleware /dashboard MFA gate).
  if (session.user.mfaRequired && !session.user.mfaVerified) {
    redirect("/auth/mfa-challenge?callbackUrl=%2Fscholar");
  }

  // Super-admins (platform owners) reach Scholar regardless of entitlement.
  if (!isSuperAdmin(session.user.email)) {
    const org = await getCurrentOrganization(session.user.id);
    const ok = org
      ? await hasProductAccess(org.organizationId, "SCHOLAR")
      : false;
    if (!ok) redirect("/scholar-no-access");
  }

  const locale = await getScholarLocale(session.user.id);

  // ScholarShell is a client component; it reads the locale from context via
  // useScholarLocale() (per the wiring contract: client comps use the hook, not
  // props). The provider must therefore wrap it.
  return (
    <ScholarLocaleProvider locale={locale}>
      <ScholarShell>{children}</ScholarShell>
    </ScholarLocaleProvider>
  );
}
