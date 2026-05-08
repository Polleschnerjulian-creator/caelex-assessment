import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { resolveComplyUiVersion } from "@/lib/comply-ui-version.server";
import { prisma } from "@/lib/prisma";
import {
  PageContainer,
  PageHeader,
  Card,
  EmptyState,
  StatusPill,
} from "@/components/dashboard/v2/ui/PageChrome";
import {
  getSystemHealthSnapshot,
  formatRelativeAge,
  type HealthTier,
  type HealthMetric,
} from "@/lib/comply-v2/system-health.server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "System health — Caelex Comply",
  description:
    "Heartbeat of Caelex's data pipelines: notifications, audit log, regulatory feed, sanctions sync, Bitcoin anchor.",
};

/**
 * System Health Dashboard — Sprint E4.
 *
 * Caelex doesn't have a cron-run-log table (Vercel cron output lives
 * in platform logs). We infer health from "is the data flowing?"
 * across 6 subsystems:
 *
 *   - Notifications     (org-scoped)
 *   - Audit log         (org-scoped)
 *   - Regulatory feed   (global — daily EUR-Lex / BAFA / FCC poll)
 *   - Sanctions sync    (global — daily OFAC / BIS / DDTC / EU / UK / UN)
 *   - Bitcoin anchor    (org-scoped, quarterly OpenTimestamps commit)
 *   - NIS2 phases       (org-scoped — count of phases needing attention)
 *
 * Tiered: GREEN within expected cadence, AMBER stale, ROSE very stale
 * or attention-required. Worst-tier wins for the page-level badge.
 */
export default async function SystemHealthPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?next=/dashboard/system-health");
  }
  const ui = await resolveComplyUiVersion();
  if (ui === "v1") redirect("/dashboard");

  const member = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id },
    orderBy: { joinedAt: "asc" },
    select: { organizationId: true },
  });
  if (!member) {
    return (
      <PageContainer>
        <PageHeader
          eyebrow="System health"
          eyebrowIcon={Activity}
          title="System health"
          description="Heartbeat of Caelex's data pipelines: notifications, audit log, regulatory feed, sanctions sync, Bitcoin anchor."
        />
        <Card className="max-w-xl">
          <EmptyState
            icon={Activity}
            title="You don't have an organization yet"
            description="System health is org-scoped. Set up your organization to start monitoring."
            cta={{ label: "Set up organization", href: "/onboarding" }}
          />
        </Card>
      </PageContainer>
    );
  }

  const snapshot = await getSystemHealthSnapshot(member.organizationId);
  const now = snapshot.generatedAt;

  return (
    <PageContainer>
      <PageHeader
        eyebrow="System health"
        eyebrowIcon={Activity}
        title="System health"
        description={
          <>
            Heartbeat of the data pipelines feeding your compliance posture.
            Tiered <strong className="text-emerald-300">GREEN</strong> /
            <strong className="text-amber-300"> AMBER</strong> /
            <strong className="text-rose-300"> ROSE</strong> per subsystem.
            Snapshot is recomputed on every page load — no caching.
          </>
        }
        actions={<TopBadge tier={snapshot.worstTier} />}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {snapshot.metrics.map((m) => (
          <HealthCard key={m.id} metric={m} now={now} />
        ))}
      </div>

      <p className="mt-6 text-[11.5px] leading-relaxed text-slate-500">
        Caelex doesn&apos;t persist cron-run logs; this dashboard infers health
        from data freshness instead. Vercel platform logs hold per-cron success
        / failure / duration at{" "}
        <span className="font-mono">vercel.com/dashboard</span> for the deploy.
        Sentry mirrors the error stream; LogSnag the event stream.
      </p>
    </PageContainer>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────────

function TopBadge({ tier }: { tier: HealthTier }) {
  if (tier === "GREEN") {
    return (
      <StatusPill tone="emerald">
        <CheckCircle2 className="h-3 w-3" />
        All systems nominal
      </StatusPill>
    );
  }
  if (tier === "AMBER") {
    return (
      <StatusPill tone="amber">
        <AlertTriangle className="h-3 w-3" />
        One or more subsystems stale
      </StatusPill>
    );
  }
  return (
    <StatusPill tone="rose">
      <ShieldAlert className="h-3 w-3" />
      Attention required
    </StatusPill>
  );
}

function HealthCard({ metric, now }: { metric: HealthMetric; now: Date }) {
  const tone = metricTone(metric.tier);

  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    metric.href ? (
      <Link
        href={metric.href}
        className={`group flex flex-col gap-3 overflow-hidden rounded-xl border ${tone.border} ${tone.bg} p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:border-white/[0.16]`}
      >
        {children}
      </Link>
    ) : (
      <div
        className={`flex flex-col gap-3 overflow-hidden rounded-xl border ${tone.border} ${tone.bg} p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]`}
      >
        {children}
      </div>
    );

  return (
    <Wrapper>
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-[13px] font-semibold tracking-tight text-slate-100">
            {metric.label}
          </h3>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-slate-400">
            {metric.description}
          </p>
        </div>
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ring-1 ring-inset ${tone.iconBg}`}
        >
          {metric.tier === "GREEN" ? (
            <CheckCircle2 className={`h-3 w-3 ${tone.icon}`} />
          ) : metric.tier === "AMBER" ? (
            <AlertTriangle className={`h-3 w-3 ${tone.icon}`} />
          ) : (
            <ShieldAlert className={`h-3 w-3 ${tone.icon}`} />
          )}
        </span>
      </header>

      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          {metric.count24h !== null ? (
            <div
              className={`text-[24px] font-semibold leading-none tracking-tight tabular-nums ${tone.value}`}
            >
              {metric.count24h}
            </div>
          ) : null}
          {metric.secondary ? (
            <div className="mt-1 text-[11px] text-slate-500">
              {metric.secondary}
            </div>
          ) : null}
        </div>
        <div className="text-right">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Last activity
          </div>
          <div className="text-[12px] font-medium text-slate-300">
            {formatRelativeAge(metric.lastActivityAt, now)}
          </div>
        </div>
      </div>

      {metric.href ? (
        <footer className="flex items-center justify-between border-t border-white/[0.04] pt-3 text-[11.5px]">
          <span className="text-slate-500">Open source view</span>
          <ArrowUpRight className="h-3.5 w-3.5 text-slate-500 transition group-hover:text-slate-300" />
        </footer>
      ) : null}
    </Wrapper>
  );
}

function metricTone(tier: HealthTier): {
  border: string;
  bg: string;
  iconBg: string;
  icon: string;
  value: string;
} {
  switch (tier) {
    case "GREEN":
      return {
        border: "border-white/[0.06]",
        bg: "bg-gradient-to-b from-white/[0.025] to-white/[0.012]",
        iconBg: "bg-emerald-500/10 ring-emerald-500/20",
        icon: "text-emerald-300",
        value: "text-slate-50",
      };
    case "AMBER":
      return {
        border: "border-amber-500/20",
        bg: "bg-gradient-to-b from-amber-500/[0.04] to-amber-500/[0.012]",
        iconBg: "bg-amber-500/10 ring-amber-500/20",
        icon: "text-amber-300",
        value: "text-amber-200",
      };
    case "ROSE":
      return {
        border: "border-rose-500/25",
        bg: "bg-gradient-to-b from-rose-500/[0.05] to-rose-500/[0.012]",
        iconBg: "bg-rose-500/10 ring-rose-500/20",
        icon: "text-rose-300",
        value: "text-rose-200",
      };
  }
}
