import { redirect } from "next/navigation";
import { Activity } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveComplyUiVersion } from "@/lib/comply-ui-version.server";
import { OpsConsoleClient } from "@/components/dashboard/v2/OpsConsoleClient";
import {
  PageContainer,
  PageHeader,
  Card,
  EmptyState,
  StatusPill,
} from "@/components/dashboard/v2/ui/PageChrome";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Mission Ops Console — Caelex Comply",
  description:
    "Live event feed for proposals, mission phases, and Astra reasoning streams.",
};

/**
 * Mission Ops Console — Sprint 7D (Wow-Pattern #3)
 *
 * Bloomberg-Terminal-style live feed of every event happening across
 * the operator's compliance posture. Subscribes to the SSE endpoint
 * at /api/dashboard/ops-console/stream which forwards every Postgres
 * NOTIFY on the known channels (proposal lifecycle, mission phase
 * updates, Astra reasoning).
 */
export default async function OpsConsolePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?next=/dashboard/ops-console");
  }
  const ui = await resolveComplyUiVersion();
  if (ui === "v1") redirect("/dashboard");

  // Empty-org guard: a user without an organization can't subscribe
  // to the SSE feed (the feed scopes events to their org).
  const member = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id },
    select: { organizationId: true },
  });

  if (!member) {
    return (
      <PageContainer>
        <PageHeader
          eyebrow="Ops Console"
          eyebrowIcon={Activity}
          title="Ops Console"
          description="Real-time feed of proposals, mission phases, and Astra reasoning."
        />
        <Card className="max-w-xl">
          <EmptyState
            icon={Activity}
            title="You need an organization first"
            description="The Ops Console streams events scoped to your organization. Set up your org to start receiving the live feed."
            cta={{ label: "Set up organization", href: "/onboarding" }}
          />
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Ops Console"
        eyebrowIcon={Activity}
        title="Ops Console"
        helpTerm="Ops Console"
        description="Real-time feed of proposals, mission phases, and Astra reasoning. Events stream via Server-Sent-Events from Postgres LISTEN/NOTIFY."
        actions={<StatusPill tone="emerald">Live</StatusPill>}
      />

      <OpsConsoleClient />
    </PageContainer>
  );
}
