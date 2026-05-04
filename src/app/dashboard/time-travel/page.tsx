import { redirect } from "next/navigation";
import { Clock } from "lucide-react";

import { auth } from "@/lib/auth";
import { resolveComplyUiVersion } from "@/lib/comply-ui-version.server";
import { getPostureTrend } from "@/lib/comply-v2/posture-snapshot.server";
import { TimeTravelClient } from "@/components/dashboard/v2/TimeTravelClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Time Travel — Caelex Comply",
  description:
    "Scrub through your compliance posture over time. See exactly where you stood on any past day.",
};

/**
 * Time Travel — Sprint 10F (Wow-Pattern #12)
 *
 * Slider UI that lets the operator scrub through their compliance
 * posture history. Backed by V2PostureSnapshot (daily writes from
 * the existing analytics-aggregate cron). Each slider position is
 * one snapshot day; the page rerenders score, attested counts,
 * open-proposals, and triage signals for that day.
 *
 * Use case: "What did our compliance look like on April 3rd?" or
 * "Show me the trend after we onboarded the cyber-vendor on Mar 15."
 *
 * # Why no new server fetcher
 *
 * `getPostureTrend(userId, days)` already returns the array we
 * need — one PostureTrendPoint per day. The slider just picks an
 * index into that array. Sprint 10F is a client-side rendering
 * decision over an existing server data structure.
 */
export default async function TimeTravelPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?next=/dashboard/time-travel");
  }
  const ui = await resolveComplyUiVersion();
  if (ui === "v1") redirect("/dashboard");

  // 90 days of history — three months of context for trend reads.
  // Each point is one V2PostureSnapshot row written nightly by the
  // analytics-aggregate cron.
  const trend = await getPostureTrend(session.user.id, 90);

  return (
    <div className="mx-auto max-w-screen-2xl px-6 py-6">
      <header className="mb-6 flex items-end justify-between gap-6 border-b border-white/[0.06] pb-4">
        <div>
          <div className="mb-1.5 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-400">
            <Clock className="h-3 w-3" />
            TIME TRAVEL · {trend.length} SNAPSHOTS
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-100">
            Compliance posture over time
          </h1>
          <p className="mt-1 max-w-2xl text-xs text-slate-500">
            Scrub through your daily compliance snapshots. Each day is one
            V2PostureSnapshot row (nightly cron). Drag the slider or hit Play to
            watch your posture evolve.
          </p>
        </div>
      </header>

      <TimeTravelClient trend={trend} />
    </div>
  );
}
