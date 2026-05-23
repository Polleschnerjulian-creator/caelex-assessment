import { redirect } from "next/navigation";
import { Layers } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/super-admin";
import { listSammelgenehmigungen } from "@/lib/trade/sammelgenehmigung/sammelgenehmigung-service";
import { SammelgenehmigungListPanel } from "./_components/SammelgenehmigungListPanel";

export const metadata = {
  title: "Sammelgenehmigungen — Caelex Trade",
};

/**
 * /trade/sammelgenehmigungen — list of every TradeSammelgenehmigung
 * row in the org (Z11c). Mirrors /trade/euc + /trade/reexport-consents
 * structurally.
 *
 * Sammelgenehmigungen are BAFA bulk-export-authorizations that cover
 * multiple shipments of the same goods to the same end-user(s) over a
 * defined validity window (typically 12-24 months). Read-only for
 * VIEWER + MEMBER roles; MANAGER+ can create + advance lifecycle.
 *
 * Sources: § 7 AWG + § 8 AWV + 19. AWV-ÄndVO 2024.
 */
export default async function SammelgenehmigungenPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=%2Ftrade%2Fsammelgenehmigungen");
  }

  const { orgId, canEdit } = await resolveSessionContext(
    session.user.id,
    session.user.email,
  );

  const rows = await listSammelgenehmigungen(orgId);

  return (
    <div className="space-y-5 px-8 py-10">
      <header className="mb-2 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-trade-accent">
            Caelex Trade — Authorizations
          </p>
          <div className="mt-2 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-trade-accent-soft text-trade-accent-strong">
              <Layers size={16} />
            </div>
            <h1 className="text-[28px] font-bold tracking-tight text-trade-text-primary">
              Sammelgenehmigungen
            </h1>
          </div>
          <p className="mt-1 max-w-2xl text-[13px] text-trade-text-secondary">
            BAFA bulk-export-authorizations covering recurring shipments to
            named end-users over a defined validity window. Required under § 7
            AWG + § 8 AWV; current scope set by the 19. AWV-ÄndVO 2024.
            {canEdit
              ? " Add new authorizations and record draw-downs from this view."
              : " Read-only view — MANAGER+ role required to manage."}
          </p>
        </div>
      </header>

      <SammelgenehmigungListPanel rows={rows} canEdit={canEdit} />
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
