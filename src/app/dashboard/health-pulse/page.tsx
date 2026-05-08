import { redirect } from "next/navigation";
import { Activity } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveComplyUiVersion } from "@/lib/comply-ui-version.server";
import { getHealthPulseSnapshot } from "@/lib/comply-v2/health-pulse.server";
import { HealthPulseClient } from "@/components/dashboard/v2/HealthPulseClient";
import {
  PageContainer,
  PageHeader,
  StatusPill,
} from "@/components/dashboard/v2/ui/PageChrome";

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
    <PageContainer>
      <PageHeader
        eyebrow="Health pulse"
        eyebrowIcon={Activity}
        title="Compliance heartbeat"
        description="Last-hour event flow, 5-minute buckets. Animates in real-time as new audit events fire — same SSE feed as the Ops Console, just a different rendering."
        actions={<StatusPill tone="emerald">Live</StatusPill>}
      />

      <HealthPulseClient initialSnapshot={snapshot} hasOrg={Boolean(orgId)} />
    </PageContainer>
  );
}
