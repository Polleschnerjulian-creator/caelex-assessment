import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck, ArrowLeft, Mail } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasProductAccess } from "@/lib/products";

/**
 * /trade-no-access — fallback for authenticated users who don't have
 * (or have lost) access to Caelex Trade. Reached via the auth guard
 * in (trade)/trade/layout.tsx.
 *
 * Two reasons land here:
 *   - ?reason=no-org           — user has no active org membership
 *   - ?reason=no-subscription  — user's org has no ACTIVE TRADE row in
 *                                OrganizationProductAccess
 *
 * Re-check membership + access on every render so a user whose access
 * was granted between the redirect and the page load is bounced
 * straight into Trade without a manual reload.
 */

export const metadata = {
  title: "Caelex Trade — Kein Zugang",
};

interface PageProps {
  searchParams: Promise<{ reason?: string }>;
}

export default async function TradeNoAccessPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=%2Ftrade");
  }

  // Re-check: a user who got access right after the redirect should
  // be sent into Trade rather than left staring at the upgrade page.
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId: session.user.id,
      organization: { isActive: true },
    },
    select: { organization: { select: { id: true } } },
    orderBy: { joinedAt: "asc" },
  });

  if (membership) {
    const access = await hasProductAccess(membership.organization.id, "TRADE");
    if (access) {
      redirect("/trade");
    }
  }

  const { reason } = await searchParams;
  const isOrgIssue = reason === "no-org" || !membership;

  return (
    <div className="trade-themed flex min-h-screen items-center justify-center bg-trade-bg-page px-6 py-12 text-trade-text-primary">
      <div className="max-w-lg text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-trade-accent-soft text-trade-accent-strong">
          <ShieldCheck size={28} />
        </div>

        <h1 className="mt-6 text-[32px] font-bold leading-tight tracking-tight">
          {isOrgIssue
            ? "Caelex Trade braucht eine Organisation"
            : "Caelex Trade — Upgrade erforderlich"}
        </h1>

        <p className="mt-3 text-[15px] text-trade-text-secondary">
          {isOrgIssue
            ? "Dein Account ist aktiv, gehört aber noch zu keiner Organisation. Bitte einer Organisation beitreten oder eine neue erstellen — danach kannst du Trade aktivieren."
            : "Caelex Trade ist nicht Teil deines aktuellen Abos. Operatoren-Kunden, die heute Export Control im Comply-Modul nutzen, erhalten 6 Monate kostenlosen Trade-Starter-Access — kontaktiere uns für die Migration."}
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="mailto:sales@caelex.eu?subject=Caelex%20Trade%20Access"
            className="inline-flex items-center gap-2 rounded-md bg-trade-accent px-4 py-2 text-[14px] font-semibold text-white transition hover:bg-trade-accent-strong"
          >
            <Mail size={16} />
            Sales kontaktieren
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-md border border-trade-border-strong px-4 py-2 text-[14px] font-semibold text-trade-text-secondary transition hover:bg-trade-hover"
          >
            <ArrowLeft size={16} />
            Zum Comply Dashboard
          </Link>
        </div>

        <p className="mt-10 text-[12px] text-trade-text-muted">
          Du bist angemeldet als {session.user.email}.
        </p>
      </div>
    </div>
  );
}
