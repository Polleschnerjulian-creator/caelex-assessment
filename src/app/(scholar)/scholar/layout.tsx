import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";
import { hasProductAccess } from "@/lib/products";
import { isSuperAdmin } from "@/lib/super-admin";
import ScholarShell from "./ScholarShell";

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

  // Super-admins (platform owners) reach Scholar regardless of entitlement.
  if (!isSuperAdmin(session.user.email)) {
    const org = await getCurrentOrganization(session.user.id);
    const ok = org
      ? await hasProductAccess(org.organizationId, "SCHOLAR")
      : false;
    if (!ok) redirect("/scholar-no-access");
  }

  return <ScholarShell>{children}</ScholarShell>;
}
