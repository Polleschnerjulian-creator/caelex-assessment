import { redirect } from "next/navigation";
import Link from "next/link";
import { Network, ArrowLeft } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveComplyUiVersion } from "@/lib/comply-ui-version.server";
import { getStakeholderNetwork } from "@/lib/comply-v2/stakeholder-graph.server";
import { StakeholderNetworkGraph } from "@/components/dashboard/v2/StakeholderNetworkGraph";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Stakeholder Network — Caelex Comply",
  description:
    "Radial graph of your compliance ecosystem — operator, internal team, regulators, counsel, insurers, suppliers.",
};

/**
 * Stakeholder Network Graph — Sprint 10E (Wow-Pattern #11)
 *
 * Visual ecosystem map for the operator: operator at the centre,
 * external stakeholders (counsel, insurers, NCAs, etc.) on the
 * outer ring, internal team members on the inner ring. Engagement
 * intensity (data rooms + attestations) drives node size; type
 * drives node colour.
 *
 * Complements the existing list-based /dashboard/network surfaces
 * (inbox, oversight, legal-counsel) — same data, graph rendering
 * for the "see your whole network at once" use case.
 */
export default async function NetworkGraphPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?next=/dashboard/network/graph");
  }
  const ui = await resolveComplyUiVersion();
  if (ui === "v1") redirect("/dashboard");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      organizationMemberships: {
        take: 1,
        orderBy: { joinedAt: "asc" },
        select: { organizationId: true },
      },
    },
  });
  const orgId = user?.organizationMemberships[0]?.organizationId ?? null;

  const graph = orgId ? await getStakeholderNetwork(orgId) : null;

  return (
    <div className="mx-auto max-w-screen-2xl px-6 py-6">
      <div className="mb-4">
        <Link
          href="/dashboard/network"
          className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-slate-500 transition hover:text-emerald-400"
        >
          <ArrowLeft className="h-3 w-3" />
          BACK TO NETWORK
        </Link>
      </div>

      <header className="mb-6 flex items-end justify-between gap-6 border-b border-white/[0.06] pb-4">
        <div>
          <div className="mb-1.5 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-400">
            <Network className="h-3 w-3" />
            STAKEHOLDER NETWORK · GRAPH
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-100">
            Compliance ecosystem
          </h1>
          <p className="mt-1 max-w-2xl text-xs text-slate-500">
            Radial map of every actor in your compliance posture: your operator
            org, internal team, and active stakeholder engagements (legal
            counsel, insurers, NCAs, suppliers, auditors). Node size reflects
            data-room + attestation activity.
          </p>
        </div>
      </header>

      {!orgId || !graph ? (
        <div className="palantir-surface mx-auto max-w-md rounded-md p-12 text-center">
          <Network className="mx-auto mb-3 h-5 w-5 text-emerald-400" />
          <p className="text-sm text-slate-200">No organization membership</p>
          <p className="mt-2 text-xs text-slate-500">
            Once you join an organization, the graph populates with your team +
            active stakeholder engagements.
          </p>
        </div>
      ) : (
        <StakeholderNetworkGraph graph={graph} />
      )}
    </div>
  );
}
