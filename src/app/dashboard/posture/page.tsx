import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Gauge,
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ArrowRight,
  EyeOff,
  FileWarning,
  type LucideIcon,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { resolveComplyUiVersion } from "@/lib/comply-ui-version.server";
import { getPostureForUser } from "@/lib/comply-v2/posture.server";
import { getPostureTrend } from "@/lib/comply-v2/posture-snapshot.server";
import { REGULATION_LABELS } from "@/lib/comply-v2/types";
import {
  StatusDonut,
  RegulationBars,
} from "@/components/dashboard/v2/PostureCharts";
import { PostureSparkline } from "@/components/dashboard/v2/PostureSparkline";
import {
  PageContainer,
  PageHeader,
  StatusPill,
} from "@/components/dashboard/v2/ui/PageChrome";

export const metadata = {
  title: "Posture — Caelex Comply",
  description:
    "Executive summary of compliance posture: score, distribution, open work.",
};

export const dynamic = "force-dynamic";

/**
 * Compliance Posture — Vercel-style executive overview.
 *
 * Three blocks:
 *   1. KPI strip — overall score, total items, open work counters
 *   2. Charts row — status donut (left) + regulation bars (right)
 *   3. Regulation table — sorted breakdown with "Open" link to a
 *      pre-filtered Today inbox
 *
 * Pure server component. Recharts widgets are lifted into a separate
 * Client Component because they depend on browser-only APIs.
 */
export default async function PosturePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?next=/dashboard/posture");
  }
  const ui = await resolveComplyUiVersion();
  if (ui === "v1") redirect("/dashboard");

  const [posture, trend] = await Promise.all([
    getPostureForUser(session.user.id),
    getPostureTrend(session.user.id, 30),
  ]);

  // Project the trend points into per-KPI series the sparklines need.
  // Each picks one numeric column from the snapshot history.
  const scoreSeries = trend.map((p) => ({
    date: p.date,
    value: p.overallScore,
  }));
  const proposalsSeries = trend.map((p) => ({
    date: p.date,
    value: p.openProposals,
  }));
  const triageSeries = trend.map((p) => ({
    date: p.date,
    value: p.openTriage,
  }));
  const snoozesSeries = trend.map((p) => ({
    date: p.date,
    value: p.activeSnoozes,
  }));

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Posture"
        eyebrowIcon={Gauge}
        title="Posture"
        helpTerm="Posture"
        description="Executive overview of where you stand right now. Click any tile to drill into the underlying ComplianceItems."
        actions={<StatusPill tone="emerald">Live</StatusPill>}
      />

      {/* KPI strip */}
      <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi
          label="Overall score"
          value={`${posture.overallScore}%`}
          subline={`${posture.attestedItems} of ${posture.countableItems} attested`}
          tone="emerald"
          icon={Gauge}
          sparkline={scoreSeries}
          sparklineDirection="up"
        />
        <Kpi
          label="Open proposals"
          value={posture.workflow.openProposals.toString()}
          subline="Awaiting review"
          tone={posture.workflow.openProposals > 0 ? "amber" : "slate"}
          icon={ShieldCheck}
          href="/dashboard/proposals"
          sparkline={proposalsSeries}
          sparklineDirection="down"
        />
        <Kpi
          label="Triage signals"
          value={posture.workflow.openTriage.toString()}
          subline="To acknowledge"
          tone={posture.workflow.openTriage > 0 ? "amber" : "slate"}
          icon={AlertTriangle}
          href="/dashboard/triage"
          sparkline={triageSeries}
          sparklineDirection="down"
        />
        <Kpi
          label="Snoozed items"
          value={posture.workflow.activeSnoozes.toString()}
          subline="Deferred"
          tone="slate"
          icon={Clock}
          sparkline={snoozesSeries}
          sparklineNeutral
        />
        <Kpi
          label="Attested · 7d"
          value={posture.workflow.attestedThisWeek.toString()}
          subline="This week"
          tone="emerald"
          icon={CheckCircle2}
        />
      </section>

      {/* Sprint UF7 — Trust indicators. Surfaces the two patterns
          that can artificially inflate the headline score: marking
          items as N/A (shrinks denominator) and accumulating stale
          DRAFT items (busy work that doesn't move attestation).
          Auditor-relevant: a 95% score with 60% N/A is theater. */}
      <TrustStrip trust={posture.trust} totalItems={posture.totalItems} />

      {/* Charts row */}
      <section className="mb-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Status distribution"
            subtitle={`${posture.totalItems} ComplianceItems total`}
          />
          <StatusDonut statusCounts={posture.statusCounts} />
        </Card>
        <Card>
          <CardHeader
            title="Score by regulation"
            subtitle="Attestation rate per regime"
          />
          <RegulationBars breakdown={posture.regulationBreakdown} />
        </Card>
      </section>

      {/* Regulation table */}
      <section>
        <h2
          className="mb-3 px-0.5"
          style={{
            color: "rgba(255, 255, 255, 0.45)",
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          Regulation breakdown
        </h2>
        {posture.regulationBreakdown.length === 0 ? (
          <div
            className="max-w-xl rounded-2xl p-8"
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              boxShadow:
                "inset 0 1px 0 0 rgba(255, 255, 255, 0.06), 0 0 0 0.5px rgba(255, 255, 255, 0.06)",
            }}
          >
            <p
              className="text-[13px]"
              style={{ color: "rgba(255, 255, 255, 0.55)" }}
            >
              No regulatory items yet. Start a module assessment to populate.
            </p>
          </div>
        ) : (
          <div
            className="overflow-hidden rounded-xl"
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              boxShadow:
                "inset 0 1px 0 0 rgba(255, 255, 255, 0.06), 0 0 0 0.5px rgba(255, 255, 255, 0.06)",
            }}
          >
            <table className="w-full text-[13px]">
              <thead>
                <tr
                  style={{
                    borderBottom: "0.5px solid rgba(255, 255, 255, 0.06)",
                    color: "rgba(255, 255, 255, 0.45)",
                    fontSize: "11px",
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  <th className="px-4 py-3 text-left">Regulation</th>
                  <th className="px-4 py-3 text-right">Score</th>
                  <th className="px-4 py-3 text-right">Attested</th>
                  <th className="px-4 py-3 text-right">Evidence</th>
                  <th className="px-4 py-3 text-right">Pending</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {posture.regulationBreakdown.map((r) => (
                  <tr
                    key={r.regulation}
                    className="transition-colors hover:bg-white/[0.025]"
                    style={{
                      borderBottom: "0.5px solid rgba(255, 255, 255, 0.04)",
                    }}
                  >
                    <td
                      className="px-4 py-3"
                      style={{ color: "rgba(255, 255, 255, 0.92)" }}
                    >
                      <div className="flex items-center gap-2">
                        <ScoreDot score={r.score} />
                        <span>{REGULATION_LABELS[r.regulation]}</span>
                        <span
                          className="text-[11px]"
                          style={{ color: "rgba(255, 255, 255, 0.4)" }}
                        >
                          {r.regulation}
                        </span>
                      </div>
                    </td>
                    <td
                      className="px-4 py-3 text-right tabular-nums font-medium"
                      style={{ color: "rgba(255, 255, 255, 0.92)" }}
                    >
                      {r.score}%
                    </td>
                    <td
                      className="px-4 py-3 text-right tabular-nums"
                      style={{ color: "rgba(255, 255, 255, 0.85)" }}
                    >
                      {r.attested}
                    </td>
                    <td
                      className="px-4 py-3 text-right tabular-nums"
                      style={{ color: "rgba(255, 255, 255, 0.85)" }}
                    >
                      {r.evidenceRequired}
                    </td>
                    <td
                      className="px-4 py-3 text-right tabular-nums"
                      style={{ color: "rgba(255, 255, 255, 0.55)" }}
                    >
                      {r.pending}
                    </td>
                    <td
                      className="px-4 py-3 text-right tabular-nums"
                      style={{ color: "rgba(255, 255, 255, 0.55)" }}
                    >
                      {r.total}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/today?regulation=${r.regulation}`}
                        className="inline-flex items-center gap-1 text-[12.5px] font-medium transition-colors hover:text-white"
                        style={{ color: "rgba(255, 255, 255, 0.65)" }}
                      >
                        Open
                        <ArrowRight className="h-3 w-3" strokeWidth={2.2} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PageContainer>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: "rgba(255, 255, 255, 0.03)",
        boxShadow:
          "inset 0 1px 0 0 rgba(255, 255, 255, 0.05), 0 0 0 0.5px rgba(255, 255, 255, 0.06)",
      }}
    >
      {children}
    </div>
  );
}

function CardHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header
      className="mb-4 pb-3"
      style={{ borderBottom: "0.5px solid rgba(255, 255, 255, 0.06)" }}
    >
      <h3
        className="text-[14px] font-semibold text-white"
        style={{ letterSpacing: "-0.011em" }}
      >
        {title}
      </h3>
      {subtitle ? (
        <p
          className="mt-0.5 text-[12px]"
          style={{ color: "rgba(255, 255, 255, 0.5)" }}
        >
          {subtitle}
        </p>
      ) : null}
    </header>
  );
}

function Kpi({
  label,
  value,
  subline,
  icon: Icon,
  href,
  sparkline,
  sparklineDirection = "up",
  sparklineNeutral = false,
}: {
  label: string;
  value: string;
  subline: string;
  tone?: "emerald" | "amber" | "slate";
  icon: LucideIcon;
  href?: string;
  sparkline?: Array<{ date: string; value: number }>;
  sparklineDirection?: "up" | "down";
  sparklineNeutral?: boolean;
}) {
  // Apple HIG: drop tone-based accent stripes + colored icons. All
  // KPIs use the same neutral surface; the value itself carries the
  // information. Hover lift on linked cards (translateY + brighter rim).
  const inner = (
    <div
      className="group flex flex-col gap-2 rounded-xl p-4 transition-transform"
      style={{
        background: "rgba(255, 255, 255, 0.03)",
        boxShadow:
          "inset 0 1px 0 0 rgba(255, 255, 255, 0.05), 0 0 0 0.5px rgba(255, 255, 255, 0.06)",
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          style={{
            color: "rgba(255, 255, 255, 0.45)",
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>
        <Icon
          className="h-3.5 w-3.5"
          strokeWidth={1.75}
          style={{ color: "rgba(255, 255, 255, 0.35)" }}
        />
      </div>
      <div
        className="text-[28px] font-semibold tabular-nums text-white"
        style={{ letterSpacing: "-0.022em", lineHeight: 1.1 }}
      >
        {value}
      </div>
      <div
        className="text-[12px]"
        style={{ color: "rgba(255, 255, 255, 0.45)" }}
      >
        {subline}
      </div>
      {sparkline ? (
        <PostureSparkline
          data={sparkline}
          direction={sparklineDirection}
          neutral={sparklineNeutral}
          className="mt-1"
        />
      ) : null}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}

// ─── Sprint UF7 — Trust strip ────────────────────────────────────────────
//
// Anti-gaming transparency. The headline overall-score has two
// inflation vehicles:
//
//   1. NOT_APPLICABLE inflation — operator marks items as N/A to
//      shrink the denominator. A 95% score with 60% items N/A is
//      statistical theater, not real compliance.
//   2. DRAFT accumulation — operator keeps items in DRAFT for months
//      so they look "in progress" without ever attesting or
//      escalating to EVIDENCE_REQUIRED.
//
// The strip is dezent — no panic. Just two compact KPIs with tier-
// coded badges that honest operators can show their auditor and
// say "look, only 8% N/A, 0 stale drafts". Auditors learn to ask
// for these numbers.

function TrustStrip({
  trust,
  totalItems,
}: {
  trust: {
    notApplicableCount: number;
    notApplicableShare: number;
    staleDraftsCount: number;
    totalDraftsCount: number;
  };
  totalItems: number;
}) {
  // Skip the whole strip on empty databases — irrelevant noise for
  // brand-new orgs.
  if (totalItems === 0) return null;

  const naTier =
    trust.notApplicableShare >= 40
      ? "rose"
      : trust.notApplicableShare >= 20
        ? "amber"
        : "emerald";
  const staleTier =
    trust.staleDraftsCount >= 10
      ? "rose"
      : trust.staleDraftsCount >= 3
        ? "amber"
        : "emerald";

  return (
    <section
      className="mb-8 rounded-xl p-4"
      style={{
        background: "rgba(255, 255, 255, 0.02)",
        boxShadow: "inset 0 0 0 0.5px rgba(255, 255, 255, 0.06)",
      }}
      aria-label="Score trust indicators"
    >
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3
          className="text-[11px] font-semibold uppercase"
          style={{
            color: "rgba(255, 255, 255, 0.55)",
            letterSpacing: "0.08em",
          }}
        >
          Score trust indicators
        </h3>
        <p
          className="text-[11px]"
          style={{ color: "rgba(255, 255, 255, 0.35)" }}
        >
          Surfaces patterns that can artificially inflate the headline score.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <TrustKpi
          icon={EyeOff}
          label="Marked Not-Applicable"
          value={`${trust.notApplicableShare}%`}
          subline={`${trust.notApplicableCount} of ${totalItems} items declared out-of-scope`}
          tier={naTier}
          hint={
            naTier === "rose"
              ? "High N/A share — auditor should ask for justifications."
              : naTier === "amber"
                ? "Moderate N/A share — review classifications."
                : "Healthy — most items remain in scope."
          }
        />
        <TrustKpi
          icon={FileWarning}
          label="Stale drafts (30d+)"
          value={trust.staleDraftsCount.toString()}
          subline={`of ${trust.totalDraftsCount} total drafts not touched in 30 days`}
          tier={staleTier}
          hint={
            staleTier === "rose"
              ? "Backlog rotting — close as attested or escalate to evidence-required."
              : staleTier === "amber"
                ? "Some drafts aging — review oldest."
                : "Healthy — drafts are moving."
          }
        />
      </div>
    </section>
  );
}

function TrustKpi({
  icon: Icon,
  label,
  value,
  subline,
  tier,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  subline: string;
  tier: "emerald" | "amber" | "rose";
  hint: string;
}) {
  const tierColor =
    tier === "rose"
      ? "rgba(244, 63, 94, 0.85)"
      : tier === "amber"
        ? "rgba(251, 191, 36, 0.85)"
        : "rgba(16, 185, 129, 0.85)";
  const tierBg =
    tier === "rose"
      ? "rgba(244, 63, 94, 0.06)"
      : tier === "amber"
        ? "rgba(251, 191, 36, 0.06)"
        : "rgba(16, 185, 129, 0.05)";

  return (
    <div
      className="rounded-lg p-3"
      style={{
        background: tierBg,
        boxShadow: "inset 0 0 0 0.5px rgba(255, 255, 255, 0.04)",
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Icon
            className="h-3 w-3"
            strokeWidth={2}
            style={{ color: tierColor }}
          />
          <span
            className="text-[11px] font-medium uppercase"
            style={{
              color: "rgba(255, 255, 255, 0.55)",
              letterSpacing: "0.06em",
            }}
          >
            {label}
          </span>
        </div>
        <span
          className="text-[18px] font-semibold tabular-nums"
          style={{ color: tierColor, letterSpacing: "-0.018em" }}
        >
          {value}
        </span>
      </div>
      <p
        className="mt-1 text-[11.5px]"
        style={{ color: "rgba(255, 255, 255, 0.5)" }}
      >
        {subline}
      </p>
      <p
        className="mt-1 text-[10.5px]"
        style={{ color: "rgba(255, 255, 255, 0.4)" }}
      >
        {hint}
      </p>
    </div>
  );
}

function ScoreDot({ score }: { score: number }) {
  // Three-tier score dot: green (good), amber (warning), red (bad).
  // These are semantic indicators where Apple WOULD use color —
  // status communication, not decoration.
  const color =
    score >= 80
      ? "var(--ios-green)"
      : score >= 50
        ? "var(--ios-orange)"
        : "var(--ios-red)";
  return (
    <span
      className="inline-block h-2 w-2 rounded-full"
      style={{ background: color }}
    />
  );
}
