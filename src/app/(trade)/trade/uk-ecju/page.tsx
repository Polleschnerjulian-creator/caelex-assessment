import { redirect } from "next/navigation";
import { FileCheck } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/super-admin";
import { listUkEcjuLicenses } from "@/lib/trade/uk-ecju/uk-ecju-service";
import { UkEcjuListPanel } from "./_components/UkEcjuListPanel";

export const metadata = {
  title: "UK ECJU Licences — Passage",
};

/**
 * /trade/uk-ecju — UK Export Control Joint Unit (ECJU) licence list.
 *
 * Lists every TradeUkEcjuLicense in the org with create / advance-
 * lifecycle controls. Read-only for VIEWER + MEMBER roles; MANAGER+
 * can create new licences and advance status.
 *
 * Backing model: TradeUkEcjuLicense (Z37-UK).
 * Backing service: uk-ecju-service.ts.
 */
export default async function TradeUkEcjuPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/trade-login?callbackUrl=%2Ftrade%2Fuk-ecju");
  }

  const { orgId, canEdit } = await resolveSessionContext(
    session.user.id,
    session.user.email,
  );

  const licenses = await listUkEcjuLicenses(orgId);

  return (
    <div className="space-y-5 px-8 py-10">
      <header className="mb-2 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-trade-accent">
            Passage — Reports &amp; Workflows
          </p>
          <div className="mt-2 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-trade-accent-soft text-trade-accent-strong">
              <FileCheck size={16} />
            </div>
            <h1 className="text-[28px] font-bold tracking-tight text-trade-text-primary">
              UK ECJU Licences
            </h1>
          </div>
          <p className="mt-1 max-w-2xl text-[13px] text-trade-text-secondary">
            Lifecycle of UK Export Control Joint Unit licences — SIEL, OIEL,
            OGEL, SIEL-TC, and OITCL. ECJU is part of the UK Department for
            Business and Trade and administers UK strategic export controls
            under the Export Control Act 2002.
            {canEdit
              ? " Create new applications and advance lifecycle from this view."
              : " Read-only view — MANAGER+ role required to manage."}
          </p>
        </div>
      </header>

      <UkEcjuListPanel licenses={licenses} canEdit={canEdit} />
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
