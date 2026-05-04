import { redirect } from "next/navigation";
import { Activity } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveComplyUiVersion } from "@/lib/comply-ui-version.server";
import { getHealthPulseSnapshot } from "@/lib/comply-v2/health-pulse.server";
import { HealthPulseClient } from "@/components/dashboard/v2/HealthPulseClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Health Pulse — Caelex Comply",
  description:
    "Live heartbeat of compliance activity — last-hour event flow with real-time SSE updates.",
};

/**
 * Compliance Health Pulse — Sprint 10D (Wow-Pattern #9)
 *
 * Heartbeat-style pulse-line of the operator's compliance activity
 * over the last hour. Server-renders the initial 12-bucket
 * (5-min granularity) snapshot, then the client subscribes to the
 * Sprint 7D ops-console SSE stream and animates a pulse on every
 * incoming event.
 */
export default async function HealthPulsePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?next=/dashboard/health-pulse");
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

  const snapshot = orgId
    ? await getHealthPulseSnapshot(orgId)
    : {
        totalEvents: 0,
        buckets: [],
        lastEventAt: null,
        baselineEventsPerHour: 0,
      };

  return (
    <div className="mx-auto max-w-screen-2xl px-6 py-6">
      <header className="mb-6 flex items-end justify-between gap-6 border-b border-white/[0.06] pb-4">
        <div>
          <div className="mb-1.5 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-400">
            <Activity className="h-3 w-3" />
            HEALTH PULSE · LIVE
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-100">
            Compliance heartbeat
          </h1>
          <p className="mt-1 max-w-2xl text-xs text-slate-500">
            Last-hour event flow, 5-minute buckets. Animates in real-time as new
            audit events fire — same SSE feed as the Ops Console, just a
            different rendering.
          </p>
        </div>
      </header>

      <HealthPulseClient initialSnapshot={snapshot} hasOrg={Boolean(orgId)} />
    </div>
  );
}
