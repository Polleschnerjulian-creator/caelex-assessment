/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * /pharos/oversights — full oversight list across all statuses.
 * Roughly the same view as the operator-roster but grouped by
 * status rather than by operator. Useful for compliance officers
 * who want to monitor pending and disputed cases.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const STATUS_GROUPS = [
  { key: "PENDING_OPERATOR_ACCEPT", label: "Wartet auf Annahme" },
  { key: "DISPUTED", label: "In Streit" },
  { key: "ACTIVE", label: "Aktiv" },
  { key: "SUSPENDED", label: "Pausiert" },
  { key: "CLOSED", label: "Beendet" },
  { key: "REVOKED", label: "Entzogen" },
] as const;

export default async function PharosOversightsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/pharos-login?callbackUrl=%2Fpharos");

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id },
    select: { organizationId: true },
    orderBy: { joinedAt: "asc" },
  });
  if (!membership) redirect("/pharos-no-access");

  const profile = await prisma.authorityProfile.findUnique({
    where: { organizationId: membership.organizationId },
  });
  if (!profile) redirect("/pharos/setup");

  const oversights = await prisma.oversightRelationship.findMany({
    where: { authorityProfileId: profile.id },
    include: {
      operatorOrg: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { initiatedAt: "desc" },
  });

  const grouped = STATUS_GROUPS.map((g) => ({
    ...g,
    items: oversights.filter((ov) => ov.status === g.key),
  }));

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] tracking-[0.22em] uppercase text-slate-700 dark:text-slate-400/70 font-semibold">
            Aufsichten
          </div>
          <h1 className="pharos-display text-3xl font-semibold mt-1 text-slate-900 dark:text-slate-100">
            {oversights.length}{" "}
            {oversights.length === 1 ? "Aufsicht" : "Aufsichten"} insgesamt
          </h1>
        </div>
        <Link
          href="/pharos/oversights/new"
          className="pharos-btn-primary inline-flex items-center h-9 px-4 text-sm font-medium"
        >
          Neue Aufsicht
        </Link>
      </div>

      {grouped
        .filter((g) => g.items.length > 0)
        .map((g) => (
          <section key={g.key}>
            <h2 className="text-[10px] uppercase tracking-[0.18em] text-slate-500 mb-2 font-semibold">
              {g.label} · {g.items.length}
            </h2>
            <div className="pharos-card divide-y divide-slate-200/60 dark:divide-white/5 overflow-hidden">
              {g.items.map((ov) => (
                <Link
                  key={ov.id}
                  href={`/pharos/operators/${ov.id}`}
                  className="flex items-center justify-between px-4 py-3.5 hover:bg-slate-50/60 dark:hover:bg-white/[0.03] transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate text-slate-900 dark:text-slate-100">
                      {ov.oversightTitle}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {ov.operatorOrg.name} · {ov.legalReference}
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500 ml-4 flex-shrink-0 tabular-nums">
                    {new Date(ov.initiatedAt).toLocaleDateString("de-DE")}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}

      {oversights.length === 0 && (
        <div className="pharos-card px-6 py-12 text-center text-sm text-slate-500">
          Du hast noch keine Aufsichten. Klicke „Neue Aufsicht", um die erste
          anzulegen.
        </div>
      )}
    </div>
  );
}
