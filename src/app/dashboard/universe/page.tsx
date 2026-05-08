import { redirect } from "next/navigation";
import { Orbit } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveComplyUiVersion } from "@/lib/comply-ui-version.server";
import { getOperatorUniverse } from "@/lib/comply-v2/operator-universe.server";
// Hotfix 2026-05-04: the dynamic import with ssr:false now lives in a
// "use client" wrapper (`OperatorUniverseLazy`) — Next.js 15.5+ refuses
// `ssr: false` on `next/dynamic` from a Server Component.
import { OperatorUniverseLazy } from "@/components/dashboard/v2/OperatorUniverseLazy";
import {
  PageContainer,
  PageHeader,
  Card,
  StatTile,
  EmptyState,
} from "@/components/dashboard/v2/ui/PageChrome";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Operator Universe — Caelex Comply",
  description:
    "3D fly-over of your spacecraft fleet and stakeholder ecosystem. Operator at centre, satellites orbiting, partners on the outer ring.",
};

/**
 * /dashboard/universe — Sprint 10B (Wow-Pattern #6)
 *
 * 3D scene rendering the operator's mission as a star system. The
 * page itself is a Server Component (auth + data fetch + meta), and
 * the heavy R3F renderer mounts inside the OperatorUniverseLazy
 * client wrapper.
 */
export default async function UniversePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?next=/dashboard/universe");
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
  const universe = orgId ? await getOperatorUniverse(orgId) : null;

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Operator universe"
        eyebrowIcon={Orbit}
        title="Your mission at a glance"
        description="Your operator org sits at the centre. Satellites orbit by altitude band — LEO closest, HEO farthest. Status drives colour: emerald operational, cyan launched, amber pre-launch, slate end-of-life. Stakeholders sit on the outer ring. Click and drag to look around; the camera auto-rotates by default."
      />

      {!orgId || !universe ? (
        <Card className="mx-auto max-w-xl">
          <EmptyState
            icon={Orbit}
            title="No organization membership"
            description="Once you join an organization, your spacecraft + stakeholders populate this view as a 3D star system."
            cta={{
              label: "Open settings",
              href: "/dashboard/settings",
            }}
          />
        </Card>
      ) : (
        <div className="space-y-4">
          <OperatorUniverseLazy universe={universe} />
          <UniverseSummary universe={universe} />
        </div>
      )}
    </PageContainer>
  );
}

/**
 * Below-the-canvas summary. Server-rendered so it shows up before
 * the R3F bundle finishes hydrating.
 */
function UniverseSummary({
  universe,
}: {
  universe: NonNullable<Awaited<ReturnType<typeof getOperatorUniverse>>>;
}) {
  const status = universe.totals.spacecraftByStatus;
  return (
    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <StatTile label="Operational" value={status.OPERATIONAL} tone="emerald" />
      <StatTile label="Launched" value={status.LAUNCHED} tone="amber" />
      <StatTile label="Pre-launch" value={status.PRE_LAUNCH} tone="amber" />
      <StatTile
        label="Decommissioning"
        value={status.DECOMMISSIONING}
        tone="amber"
      />
      <StatTile label="Deorbited" value={status.DEORBITED} tone="slate" />
      <StatTile label="Lost" value={status.LOST} tone="rose" />
    </div>
  );
}
