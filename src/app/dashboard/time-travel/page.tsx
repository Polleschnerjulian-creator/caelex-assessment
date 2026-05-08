import { redirect } from "next/navigation";
import { Clock } from "lucide-react";

import { auth } from "@/lib/auth";
import { resolveComplyUiVersion } from "@/lib/comply-ui-version.server";
import { getPostureTrend } from "@/lib/comply-v2/posture-snapshot.server";
import { TimeTravelClient } from "@/components/dashboard/v2/TimeTravelClient";
import {
  PageContainer,
  PageHeader,
  Card,
  EmptyState,
  CountBadge,
} from "@/components/dashboard/v2/ui/PageChrome";

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
 */
export default async function TimeTravelPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?next=/dashboard/time-travel");
  }
  const ui = await resolveComplyUiVersion();
  if (ui === "v1") redirect("/dashboard");

  // 90 days of history — three months of context for trend reads.
  const trend = await getPostureTrend(session.user.id, 90);

  if (trend.length === 0) {
    return (
      <PageContainer>
        <PageHeader
          eyebrow="Time travel"
          eyebrowIcon={Clock}
          title="Time Travel"
          description="Scrub through your daily compliance snapshots and watch your posture evolve over time."
        />
        <Card className="max-w-xl">
          <EmptyState
            icon={Clock}
            title="No snapshots yet"
            description="The nightly analytics cron writes one V2PostureSnapshot per day. Once you have a few days of data, this view becomes a slider you can scrub through. Run an applicability assessment to start building history."
            cta={{
              label: "Run assessment",
              href: "/assessment/unified",
            }}
          />
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Time travel"
        eyebrowIcon={Clock}
        title="Time Travel"
        description={
          <>
            Scrub through your daily compliance snapshots. {trend.length} day
            {trend.length === 1 ? "" : "s"} of history captured.
          </>
        }
        actions={<CountBadge count={trend.length} />}
      />

      <TimeTravelClient trend={trend} />
    </PageContainer>
  );
}
