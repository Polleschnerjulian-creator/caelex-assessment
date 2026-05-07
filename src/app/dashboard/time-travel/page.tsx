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

  const sansFont =
    'var(--font-inter), -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif';
  const displayFont =
    'var(--font-inter), -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif';

  // Empty-state guard: a brand-new user has no V2PostureSnapshot rows
  // yet (the cron writes one per day from sign-up onward). Showing
  // "0 SNAPSHOTS · drag the slider" is confusing — instead give them
  // a clear empty state pointing at the route to populate the data.
  if (trend.length === 0) {
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
              Time Travel
            </h1>
            <p
              className="mt-1.5 max-w-2xl text-[14px]"
              style={{ color: "rgba(255, 255, 255, 0.55)" }}
            >
              Scrub through your daily compliance snapshots and watch your
              posture evolve over time.
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
            <Clock
              className="h-[18px] w-[18px]"
              strokeWidth={1.75}
              style={{ color: "rgba(255, 255, 255, 0.85)" }}
            />
          </div>
          <h2
            className="mb-1.5 text-[17px] font-semibold text-white"
            style={{ letterSpacing: "-0.018em" }}
          >
            No snapshots yet
          </h2>
          <p
            className="text-[13px] leading-relaxed"
            style={{ color: "rgba(255, 255, 255, 0.55)" }}
          >
            The nightly analytics cron writes one V2PostureSnapshot per day.
            Once you have a few days of data, this view becomes a slider you can
            scrub through. Run an applicability assessment to start building
            history.
          </p>
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
            Time Travel
          </h1>
          <p
            className="mt-1.5 max-w-2xl text-[14px]"
            style={{ color: "rgba(255, 255, 255, 0.55)" }}
          >
            Scrub through your daily compliance snapshots. {trend.length} day
            {trend.length === 1 ? "" : "s"} of history.
          </p>
        </div>
      </header>

      <TimeTravelClient trend={trend} />
    </div>
  );
}
