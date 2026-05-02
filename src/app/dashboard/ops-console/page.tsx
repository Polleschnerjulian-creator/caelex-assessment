import { redirect } from "next/navigation";
import { Activity } from "lucide-react";
import { auth } from "@/lib/auth";
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

  return (
    <div className="mx-auto max-w-screen-2xl px-6 py-6">
      <header className="mb-6 flex items-end justify-between gap-6 border-b border-white/[0.06] pb-4">
        <div>
          <div className="mb-1.5 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-400">
            <Activity className="h-3 w-3" />
            OPS CONSOLE · LIVE
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-100">
            Mission operations console
          </h1>
          <p className="mt-1 max-w-2xl text-xs text-slate-500">
            Real-time feed of proposals, mission phases, and Astra reasoning.
            Streamed via Server-Sent-Events from Postgres LISTEN/NOTIFY — events
            appear here within milliseconds of the originating action.
          </p>
        </div>
      </header>

      <OpsConsoleClient />
    </div>
  );
}
