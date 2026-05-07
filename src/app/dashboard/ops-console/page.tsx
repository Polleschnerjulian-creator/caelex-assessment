import { redirect } from "next/navigation";
import { Activity } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveComplyUiVersion } from "@/lib/comply-ui-version.server";
import { OpsConsoleClient } from "@/components/dashboard/v2/OpsConsoleClient";

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
 * updates, Astra reasoning). The client renders an inverted-time-
 * order log with type-aware colour-coding.
 *
 * Why server-rendered shell + client island: the SSE connection
 * needs window.EventSource and lives entirely on the client. The
 * page itself is a thin auth gate + V2 redirect.
 */
export default async function OpsConsolePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?next=/dashboard/ops-console");
  }
  const ui = await resolveComplyUiVersion();
  if (ui === "v1") redirect("/dashboard");

  // Empty-org guard: a user without an organization can't subscribe
  // to the SSE feed (the feed scopes events to their org). Showing
  // the live console would mount an EventSource that gets 401'd
  // every reconnect — silent failure UX. Better: pre-empt with a
  // clear empty state.
  const member = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id },
    select: { organizationId: true },
  });

  const sansFont =
    'var(--font-inter), -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif';
  const displayFont =
    'var(--font-inter), -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif';

  if (!member) {
    return (
      <div
        className="mx-auto max-w-screen-2xl px-8 py-8"
        style={{ fontFamily: sansFont, letterSpacing: "-0.005em" }}
      >
        <header
          className="mb-7 flex items-end justify-between gap-6 pb-5"
          style={{ borderBottom: "0.5px solid rgba(255, 255, 255, 0.08)" }}
        >
          <div className="min-w-0">
            <h1
              className="text-[28px] font-semibold text-white"
              style={{
                fontFamily: displayFont,
                letterSpacing: "-0.022em",
                lineHeight: 1.15,
              }}
            >
              Ops Console
            </h1>
            <p
              className="mt-1.5 max-w-2xl text-[14px]"
              style={{ color: "rgba(255, 255, 255, 0.55)" }}
            >
              Real-time feed of proposals, mission phases, and Astra reasoning.
            </p>
          </div>
        </header>
        <div
          className="max-w-xl rounded-2xl p-8"
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            boxShadow:
              "inset 0 1px 0 0 rgba(255, 255, 255, 0.06), 0 0 0 0.5px rgba(255, 255, 255, 0.06)",
          }}
        >
          <div
            className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl"
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              boxShadow:
                "inset 0 1px 0 0 rgba(255, 255, 255, 0.12), inset 0 -1px 0 0 rgba(0, 0, 0, 0.25)",
            }}
          >
            <Activity
              className="h-[18px] w-[18px]"
              strokeWidth={1.75}
              style={{ color: "rgba(255, 255, 255, 0.85)" }}
            />
          </div>
          <h2
            className="mb-1.5 text-[17px] font-semibold text-white"
            style={{ letterSpacing: "-0.018em" }}
          >
            You need an organization first
          </h2>
          <p
            className="mb-5 max-w-md text-[13px] leading-relaxed"
            style={{ color: "rgba(255, 255, 255, 0.55)" }}
          >
            The Ops Console streams events scoped to your organization. Set up
            your org to start receiving the live feed.
          </p>
          <a
            href="/onboarding"
            className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors"
            style={{
              background: "rgba(255, 255, 255, 0.92)",
              color: "rgb(20, 20, 22)",
            }}
          >
            Set up organization
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      className="mx-auto max-w-screen-2xl px-8 py-8"
      style={{ fontFamily: sansFont, letterSpacing: "-0.005em" }}
    >
      <header
        className="mb-7 flex items-end justify-between gap-6 pb-5"
        style={{ borderBottom: "0.5px solid rgba(255, 255, 255, 0.08)" }}
      >
        <div className="min-w-0">
          <h1
            className="text-[28px] font-semibold text-white"
            style={{
              fontFamily: displayFont,
              letterSpacing: "-0.022em",
              lineHeight: 1.15,
            }}
          >
            Ops Console
          </h1>
          <p
            className="mt-1.5 max-w-2xl text-[14px]"
            style={{ color: "rgba(255, 255, 255, 0.55)" }}
          >
            Real-time feed of proposals, mission phases, and Astra reasoning.
            Events stream via Server-Sent-Events from Postgres LISTEN/NOTIFY.
          </p>
        </div>
        <span
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium"
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            color: "rgba(255, 255, 255, 0.85)",
          }}
        >
          <span
            aria-hidden
            className="h-1.5 w-1.5 animate-pulse rounded-full"
            style={{ background: "var(--ios-green)" }}
          />
          Live
        </span>
      </header>

      <OpsConsoleClient />
    </div>
  );
}
