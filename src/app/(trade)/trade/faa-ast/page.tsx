import { redirect } from "next/navigation";
import { Rocket } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/super-admin";
import { listFaaAstLicenses } from "@/lib/trade/faa-ast/faa-ast-service";
import { FaaAstListPanel } from "./_components/FaaAstListPanel";

export const metadata = {
  title: "FAA AST Licences — Caelex Trade",
};

/**
 * /trade/faa-ast — FAA Office of Commercial Space Transportation
 * (FAA AST) licence list.
 *
 * Lists every TradeFaaAstLicense in the org with create / advance-
 * lifecycle controls. Read-only for VIEWER + MEMBER roles; MANAGER+
 * can create new licences and advance status.
 *
 * Backing model: TradeFaaAstLicense (Z38-US).
 * Backing service: faa-ast-service.ts.
 */
export default async function TradeFaaAstPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/trade-login?callbackUrl=%2Ftrade%2Ffaa-ast");
  }

  const { orgId, canEdit } = await resolveSessionContext(
    session.user.id,
    session.user.email,
  );

  const licenses = await listFaaAstLicenses(orgId);

  return (
    <div className="space-y-5 px-8 py-10">
      <header className="mb-2 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-trade-accent">
            Caelex Trade — Reports &amp; Workflows
          </p>
          <div className="mt-2 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-trade-accent-soft text-trade-accent-strong">
              <Rocket size={16} />
            </div>
            <h1 className="text-[28px] font-bold tracking-tight text-trade-text-primary">
              FAA AST Launch Licences
            </h1>
          </div>
          <p className="mt-1 max-w-2xl text-[13px] text-trade-text-secondary">
            Lifecycle of FAA Office of Commercial Space Transportation (AST)
            licences under 14 CFR Part 450 — the Streamlined Launch &amp;
            Re-entry Licensing Rule covering US commercial launch providers,
            vehicle operators, and reusable suborbital RLVs. Tracks the § 450.31
            pre-application consultation, NEPA environmental review, § 450.101
            Maximum Probability of Casualty (Ec ≤ 1×10⁻⁴) ceiling, and § 440 Max
            Probable Loss financial responsibility.
            {canEdit
              ? " Create new applications and advance lifecycle from this view."
              : " Read-only view — MANAGER+ role required to manage."}
          </p>
        </div>
      </header>

      <FaaAstListPanel licenses={licenses} canEdit={canEdit} />
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
