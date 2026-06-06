import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";
import { hasProductAccess } from "@/lib/products";
import { isSuperAdmin } from "@/lib/super-admin";

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

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-gray-900">
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-sm px-8 lg:px-16 py-3 flex items-center justify-between sticky top-0 z-10">
        <a href="/scholar" className="flex items-baseline gap-2">
          <span className="text-[14px] font-semibold text-gray-900 tracking-[-0.01em]">
            Caelex Scholar
          </span>
          <span className="text-[10px] text-gray-400 font-normal">
            powered by Atlas
          </span>
        </a>
      </header>
      <main>{children}</main>
    </div>
  );
}
