import { redirect } from "next/navigation";
import { UserCog } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/super-admin";
import { listDeemedExportAuthorizations } from "@/lib/trade/deemed-export/deemed-export-service";
import { DeemedExportListPanel } from "./_components/DeemedExportListPanel";

export const metadata = {
  title: "Deemed Exports — Passage",
};

/**
 * /trade/deemed-exports — list of every TradeDeemedExportAuthorization
 * in the org (Z13b, Tier 6).
 *
 * A "deemed export" occurs when controlled US technology is RELEASED
 * IN-COUNTRY to a foreign national (EAR § 734.13 / § 734.20, ITAR
 * § 120.50). The release is "deemed" to be an export to the foreign
 * national's most-recent country of citizenship and requires the
 * same authorisation a physical export would.
 *
 * Read-only for VIEWER + MEMBER roles. MANAGER+ can create new
 * authorisations and toggle status (ACTIVE / REVOKED).
 */
export default async function TradeDeemedExportsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=%2Ftrade%2Fdeemed-exports");
  }

  const { orgId, canEdit } = await resolveSessionContext(
    session.user.id,
    session.user.email,
  );

  const rows = await listDeemedExportAuthorizations(orgId);

  return (
    <div className="space-y-5 px-8 py-10">
      <header className="mb-2 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-trade-accent">
            Passage — Personnel
          </p>
          <div className="mt-2 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-trade-accent-soft text-trade-accent-strong">
              <UserCog size={16} />
            </div>
            <h1 className="text-[28px] font-bold tracking-tight text-trade-text-primary">
              Deemed Exports
            </h1>
          </div>
          <p className="mt-1 max-w-2xl text-[13px] text-trade-text-secondary">
            Authorisations for foreign-national employees to access
            US-controlled technology in-country. Required under EAR § 734.13 / §
            734.20 and ITAR § 120.50 whenever controlled tech is released to a
            non-US-national engineer working at a US facility.
            {canEdit
              ? " Add new authorisations and manage status from this view."
              : " Read-only view — MANAGER+ role required to manage."}
          </p>
        </div>
      </header>

      <DeemedExportListPanel rows={rows} canEdit={canEdit} />
    </div>
  );
}

const EDITOR_ROLES: ReadonlyArray<string> = ["OWNER", "ADMIN", "MANAGER"];

async function resolveSessionContext(
  userId: string,
  email: string | null | undefined,
): Promise<{ orgId: string; canEdit: boolean }> {
  if (isSuperAdmin(email)) {
    const anyOrg = await prisma.organization.findFirst({
      where: { isActive: true },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    return { orgId: anyOrg?.id ?? "super-admin-no-org", canEdit: true };
  }
  const membership = await prisma.organizationMember.findFirst({
    where: { userId, organization: { isActive: true } },
    select: { organization: { select: { id: true } }, role: true },
    orderBy: { joinedAt: "asc" },
  });
  return {
    orgId: membership?.organization.id ?? "no-org",
    canEdit: membership ? EDITOR_ROLES.includes(membership.role) : false,
  };
}
