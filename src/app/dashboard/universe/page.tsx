import { redirect } from "next/navigation";
import { Orbit } from "lucide-react";
// Renamed to avoid collision with the `dynamic` route-segment-config
// export below — Next.js inspects the literal name `dynamic` so we
// can't shadow it with the import.
import nextDynamic from "next/dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveComplyUiVersion } from "@/lib/comply-ui-version.server";
import { getOperatorUniverse } from "@/lib/comply-v2/operator-universe.server";

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
 * page itself is a server component (auth + data fetch + meta), and
 * the heavy R3F renderer is a client component loaded via
 * `next/dynamic` with `ssr: false` so Three.js doesn't trip up
 * Next.js's RSC boundary.
 *
 * # Why ssr:false on the R3F component
 *
 * R3F initialises a WebGL context in the constructor of <Canvas>,
 * which does `document.createElement("canvas")` — that throws on
 * the server. Marking the import as `dynamic({ ssr: false })` tells
 * Next.js to skip server rendering for this child and only mount it
 * after hydration on the client. The page shell is still server-
 * rendered for fast TTFB + correct meta.
 */

// Heavy R3F bundle — load client-side only.
const OperatorUniverse = nextDynamic(
  () =>
    import("@/components/dashboard/v2/OperatorUniverse").then(
      (m) => m.OperatorUniverse,
    ),
  {
    ssr: false,
    loading: () => (
      <div
        data-testid="universe-skeleton"
        className="palantir-surface h-[640px] w-full animate-pulse rounded-md"
      />
    ),
  },
);

export default async function UniversePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?next=/dashboard/universe");
  }
  const ui = await resolveComplyUiVersion();
  if (ui === "v1") redirect("/dashboard");

  // Resolve primary org (same convention as /dashboard/network/graph
  // and /dashboard/health-pulse).
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
    <div className="mx-auto max-w-screen-2xl px-6 py-6">
      <header className="mb-6 flex items-end justify-between gap-6 border-b border-white/[0.06] pb-4">
        <div>
          <div className="mb-1.5 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-400">
            <Orbit className="h-3 w-3" />
            OPERATOR UNIVERSE · 3D
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-100">
            Your mission at a glance
          </h1>
          <p className="mt-1 max-w-2xl text-xs text-slate-500">
            Your operator org sits at the centre. Satellites orbit by altitude
            band — LEO closest, HEO farthest. Status drives colour: emerald
            operational, cyan launched, amber pre-launch, slate end-of-life.
            Stakeholders sit on the outer ring. Click and drag to look around;
            the camera auto-rotates by default.
          </p>
        </div>
      </header>

      {!orgId || !universe ? (
        <div className="palantir-surface mx-auto max-w-md rounded-md p-12 text-center">
          <Orbit className="mx-auto mb-3 h-5 w-5 text-emerald-400" />
          <p className="text-sm text-slate-200">No organization membership</p>
          <p className="mt-2 text-xs text-slate-500">
            Once you join an organization, your spacecraft + stakeholders
            populate this view as a 3D star system.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <OperatorUniverse universe={universe} />
          <UniverseSummary universe={universe} />
        </div>
      )}
    </div>
  );
}

/**
 * Below-the-canvas summary. Server-rendered so it shows up before
 * the R3F bundle finishes hydrating — gives the user immediate
 * confidence that the data loaded.
 */
function UniverseSummary({
  universe,
}: {
  universe: NonNullable<Awaited<ReturnType<typeof getOperatorUniverse>>>;
}) {
  const status = universe.totals.spacecraftByStatus;

  const statusItems: { label: string; value: number; tone: string }[] = [
    {
      label: "Operational",
      value: status.OPERATIONAL,
      tone: "text-emerald-400",
    },
    { label: "Launched", value: status.LAUNCHED, tone: "text-cyan-400" },
    { label: "Pre-launch", value: status.PRE_LAUNCH, tone: "text-amber-400" },
    {
      label: "Decommissioning",
      value: status.DECOMMISSIONING,
      tone: "text-orange-400",
    },
    { label: "Deorbited", value: status.DEORBITED, tone: "text-slate-500" },
    { label: "Lost", value: status.LOST, tone: "text-red-400" },
  ];

  return (
    <div className="palantir-surface grid gap-3 rounded-md p-4 sm:grid-cols-3 lg:grid-cols-6">
      {statusItems.map((item) => (
        <div key={item.label} className="flex flex-col gap-0.5">
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500">
            {item.label}
          </span>
          <span
            className={`font-mono text-2xl font-bold tabular-nums ${item.tone}`}
          >
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}
