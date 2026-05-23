import Link from "next/link";
import { redirect } from "next/navigation";
import { Rocket, AlertTriangle } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/super-admin";
import { listLosAuthorisations } from "@/lib/trade/france-los/france-los-service";
import { FranceLosListPanel } from "./_components/FranceLosListPanel";

export const metadata = {
  title: "France LOS — Caelex Trade",
};

/**
 * /trade/france-los — France LOS (Loi sur les Opérations Spatiales)
 * authorisations list (Z34-FR, Tier 4).
 *
 * Reads from the org-scoped service helper, eager-loads launch
 * vehicle + last-action user, and renders the list panel. The detail
 * page (`/trade/france-los/[id]`) handles the per-row lifecycle.
 *
 * Read-only for VIEWER + MEMBER roles. MANAGER+ can advance the
 * lifecycle from the detail page.
 */
export default async function TradeFranceLosPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=%2Ftrade%2Ffrance-los");
  }

  const { orgId, canEdit } = await resolveSessionContext(
    session.user.id,
    session.user.email,
  );

  const losRows = await listLosAuthorisations(orgId);

  return (
    <div className="space-y-5 px-8 py-10">
      <header className="mb-2 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-trade-accent">
            Caelex Trade — Lifecycle Documents
          </p>
          <div className="mt-2 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-trade-accent-soft text-trade-accent-strong">
              <Rocket size={16} />
            </div>
            <h1 className="text-[28px] font-bold tracking-tight text-trade-text-primary">
              France LOS Authorisations
            </h1>
          </div>
          <p className="mt-1 max-w-2xl text-[13px] text-trade-text-secondary">
            Lifecycle of CNES-administered authorisations under{" "}
            <em>Loi 2008-518 — Loi sur les Opérations Spatiales</em>. Required
            before launching, operating in orbit, or re-entering a spacecraft
            under Code de l&apos;espace L. 331-2.
            {canEdit
              ? " Manage lifecycle from each row's detail page."
              : " Read-only view — MANAGER+ role required to manage."}
          </p>
        </div>
      </header>

      <aside className="flex items-start gap-2 rounded-md border border-trade-border-subtle bg-trade-bg-page px-4 py-3 text-[12.5px] text-trade-text-secondary">
        <AlertTriangle
          className="mt-0.5 shrink-0 text-trade-amber"
          size={14}
          aria-hidden="true"
        />
        <p>
          <strong className="text-trade-text-primary">Liability cap:</strong>{" "}
          €60M operator self-insurance, €120M state backstop above (Code de
          l&apos;espace L. 331-2 to L. 331-6).{" "}
          <strong className="text-trade-text-primary">
            Casualty-risk threshold:
          </strong>{" "}
          1 in 10⁴ per re-entry (LOS Art. R. 331-21).{" "}
          <strong className="text-trade-text-primary">Debris:</strong> 25-year
          LEO deorbit or graveyard orbit for GEO (Arrêté 31 mars 2011).
        </p>
      </aside>

      <FranceLosListPanel losRows={losRows} canEdit={canEdit} />

      <footer className="text-[11px] text-trade-text-muted">
        <Link href="/trade" className="hover:text-trade-accent-strong">
          ← Back to Today
        </Link>
      </footer>
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
