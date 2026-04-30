import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Gauge,
  ShieldCheck,
  AlertTriangle,
  Inbox,
  Clock,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { resolveComplyUiVersion } from "@/lib/comply-ui-version.server";
import { getPostureForUser } from "@/lib/comply-v2/posture.server";
import { REGULATION_LABELS } from "@/lib/comply-v2/types";
import {
  StatusDonut,
  RegulationBars,
} from "@/components/dashboard/v2/PostureCharts";

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

  const posture = await getPostureForUser(session.user.id);

  return (
    <div className="mx-auto max-w-screen-2xl px-6 py-6">
      <header className="mb-6 flex items-end justify-between gap-6 border-b border-white/[0.06] pb-4">
        <div>
          <div className="mb-1.5 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-400">
            <Gauge className="h-3 w-3" />
            POSTURE · LIVE
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-100">
            Compliance command center
          </h1>
          <p className="mt-1 max-w-2xl text-xs text-slate-500">
            Executive overview of where you stand right now. Click any tile to
            drill into the underlying ComplianceItems.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-slate-500">
          <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          UPDATED LIVE
        </div>
      </header>

      {/* KPI strip */}
      <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi
          label="Overall score"
          value={`${posture.overallScore}%`}
          subline={`${posture.attestedItems} of ${posture.countableItems} attested`}
          tone="emerald"
          icon={Gauge}
        />
        <Kpi
          label="Open proposals"
          value={posture.workflow.openProposals.toString()}
          subline="Awaiting review"
          tone={posture.workflow.openProposals > 0 ? "amber" : "slate"}
          icon={ShieldCheck}
          href="/dashboard/proposals"
        />
        <Kpi
          label="Triage signals"
          value={posture.workflow.openTriage.toString()}
          subline="To acknowledge"
          tone={posture.workflow.openTriage > 0 ? "amber" : "slate"}
          icon={AlertTriangle}
          href="/dashboard/triage"
        />
        <Kpi
          label="Snoozed items"
          value={posture.workflow.activeSnoozes.toString()}
          subline="Deferred"
          tone="slate"
          icon={Clock}
        />
        <Kpi
          label="Attested · 7d"
          value={posture.workflow.attestedThisWeek.toString()}
          subline="This week"
          tone="emerald"
          icon={CheckCircle2}
        />
      </section>

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
        <h2 className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
          Regulation breakdown
        </h2>
        {posture.regulationBreakdown.length === 0 ? (
          <p className="palantir-surface rounded-md p-6 text-center text-xs text-slate-500">
            No regulatory items yet. Start a module assessment to populate.
          </p>
        ) : (
          <div className="palantir-surface overflow-hidden rounded-md">
            <table className="w-full text-xs">
              <thead className="border-b border-white/[0.06] bg-white/[0.02] font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="px-4 py-2 text-left">Regulation</th>
                  <th className="px-4 py-2 text-right">Score</th>
                  <th className="px-4 py-2 text-right">Attested</th>
                  <th className="px-4 py-2 text-right">Evidence</th>
                  <th className="px-4 py-2 text-right">Pending</th>
                  <th className="px-4 py-2 text-right">Total</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {posture.regulationBreakdown.map((r) => (
                  <tr
                    key={r.regulation}
                    className="border-b border-white/[0.04] last:border-b-0 transition hover:bg-white/[0.03]"
                  >
                    <td className="px-4 py-2.5 text-slate-200">
                      <div className="flex items-center gap-2">
                        <ScoreDot score={r.score} />
                        <span>{REGULATION_LABELS[r.regulation]}</span>
                        <span className="font-mono text-[9px] uppercase tracking-wider text-slate-500">
                          {r.regulation}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-100">
                      {r.score}%
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-emerald-400">
                      {r.attested}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-amber-400">
                      {r.evidenceRequired}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-500">
                      {r.pending}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-500">
                      {r.total}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Link
                        href={`/dashboard/today?regulation=${r.regulation}`}
                        className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-emerald-400 transition hover:text-emerald-300"
                      >
                        Open
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return <div className="palantir-surface rounded-md p-4">{children}</div>;
}

function CardHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-3 border-b border-white/[0.06] pb-3">
      <h3 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-slate-300">
        {title}
      </h3>
      {subtitle ? (
        <p className="mt-1 font-mono text-[10px] text-slate-500">{subtitle}</p>
      ) : null}
    </header>
  );
}

function Kpi({
  label,
  value,
  subline,
  tone,
  icon: Icon,
  href,
}: {
  label: string;
  value: string;
  subline: string;
  tone: "emerald" | "amber" | "slate";
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
}) {
  const accentClass =
    tone === "emerald"
      ? "text-emerald-400"
      : tone === "amber"
        ? "text-amber-400"
        : "text-slate-500";

  const stripe =
    tone === "emerald"
      ? "palantir-stripe-emerald"
      : tone === "amber"
        ? "palantir-stripe-amber"
        : "";

  const inner = (
    <div
      className={`palantir-surface group flex flex-col gap-2 rounded-md p-4 transition ${stripe}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-slate-500">
          {label}
        </span>
        <Icon className={`h-3 w-3 ${accentClass}`} />
      </div>
      <div className="font-mono text-3xl font-bold tracking-tight text-slate-50 tabular-nums">
        {value}
      </div>
      <div className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
        {subline}
      </div>
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

function ScoreDot({ score }: { score: number }) {
  const cls =
    score >= 80
      ? "bg-emerald-500"
      : score >= 50
        ? "bg-amber-500"
        : "bg-red-500";
  return <span className={`inline-block h-2 w-2 rounded-full ${cls}`} />;
}
