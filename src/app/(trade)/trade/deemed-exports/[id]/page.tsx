import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, UserCog, AlertTriangle } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/super-admin";
import { getDeemedExportAuthorization } from "@/lib/trade/deemed-export/deemed-export-service";
import { DeemedExportDetailPanel } from "../_components/DeemedExportDetailPanel";

export const metadata = {
  title: "Deemed Export — Caelex Trade",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * /trade/deemed-exports/[id] — single authorisation detail view.
 *
 * Shows full record + lifecycle history + employee dual-nationality
 * warning (when nativeCountry !== foreignNationality). MANAGER+ can
 * revoke or extend validity from the panel.
 */
export default async function DeemedExportDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=%2Ftrade%2Fdeemed-exports");
  }

  const { id } = await params;
  const { orgId, canEdit } = await resolveSessionContext(
    session.user.id,
    session.user.email,
  );

  const row = await getDeemedExportAuthorization(orgId, id);
  if (!row) {
    notFound();
  }

  const isDualNationality = row.nativeCountry !== row.foreignNationality;
  const isExpiringSoon =
    row.validUntil &&
    row.validUntil.getTime() - Date.now() < 90 * 24 * 60 * 60 * 1000 &&
    row.validUntil.getTime() > Date.now();

  return (
    <div className="space-y-5 px-8 py-10">
      <Link
        href="/trade/deemed-exports"
        className="inline-flex items-center gap-1 text-[12px] font-medium text-trade-text-secondary hover:text-trade-accent-strong"
      >
        <ChevronLeft size={13} />
        All authorisations
      </Link>

      <header className="mb-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-trade-accent">
          Deemed-export authorisation
        </p>
        <div className="mt-2 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-trade-accent-soft text-trade-accent-strong">
            <UserCog size={16} />
          </div>
          <h1 className="text-[28px] font-bold tracking-tight text-trade-text-primary">
            {row.foreignNationalName ?? row.foreignNationalEmployeeId}
          </h1>
        </div>
        <p className="mt-1 max-w-2xl text-[13px] text-trade-text-secondary">
          Employee ID:{" "}
          <span className="font-mono text-trade-text-primary">
            {row.foreignNationalEmployeeId}
          </span>{" "}
          · Citizenship: <strong>{row.foreignNationality}</strong>
          {isDualNationality && (
            <>
              {" "}
              · Born: <strong>{row.nativeCountry}</strong>
            </>
          )}
        </p>
      </header>

      {isDualNationality && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12.5px] text-amber-800">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <div>
            <strong className="font-semibold">Dual-nationality notice.</strong>{" "}
            Country of birth ({row.nativeCountry}) differs from most-recent
            citizenship ({row.foreignNationality}). EAR Supplement No. 1 to Part
            760 requires applying the MORE RESTRICTIVE of the two when assessing
            foreign-national status for § 734.20 purposes.
          </div>
        </div>
      )}

      {isExpiringSoon && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12.5px] text-amber-800">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <div>
            <strong className="font-semibold">Expiring within 90 days.</strong>{" "}
            This authorisation expires on{" "}
            {row.validUntil
              ? new Date(row.validUntil).toISOString().slice(0, 10)
              : "—"}
            . Renew before that date to avoid exposure.
          </div>
        </div>
      )}

      <DeemedExportDetailPanel row={row} canEdit={canEdit} />
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
