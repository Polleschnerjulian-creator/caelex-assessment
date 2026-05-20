/**
 * /dashboard/day1 (Sprint Day1.UI — banner + action surface)
 *
 * Server-rendered "Day-1 magic moment" page. Calls runDay1MagicMoment()
 * for the authenticated org and renders:
 *
 *   ┌─────────────────────────────────────────────────────┐
 *   │ Welcome <Org>. Identity confirmed across N sources. │
 *   │ M supervising NCAs auto-detected · P items (Q urgent)│
 *   └─────────────────────────────────────────────────────┘
 *
 *   ┌─────────────────┬─────────────────┬─────────────────┐
 *   │  ENRICHMENT     │  TRILATERAL     │  ROADMAP        │
 *   │  (sources)      │  (NCAs, counsel)│  (top items)    │
 *   └─────────────────┴─────────────────┴─────────────────┘
 *
 * No DB writes by default — toggleable via `?persist=1`.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { runDay1MagicMoment } from "@/lib/day1/run-day1";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    persist?: string;
  }>;
}

export default async function Day1Page({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/day1");
  }

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id },
    select: { organizationId: true },
  });
  if (!membership) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold text-slate-100 mb-2">
          Day-1 Magic Moment
        </h1>
        <p className="text-slate-400 text-sm">
          You're not a member of any organization yet. Complete onboarding
          first.
        </p>
      </div>
    );
  }

  const sp = await searchParams;
  const persist = sp.persist === "1" || sp.persist === "true";

  const result = await runDay1MagicMoment({
    organizationId: membership.organizationId,
    persist,
    maxItems: 25,
  });

  const urgentCount = result.roadmap?.stats.itemsByPriority.URGENT ?? 0;
  const enrichmentHits =
    result.enrichment?.sourceAttempts.filter((a) => a.success).length ?? 0;
  const ncaCount = result.discovery?.authorities.length ?? 0;
  const counselCount =
    result.discovery?.counsel.filter((c) => c.matchStrategy !== "stub")
      .length ?? 0;
  const itemsCount = result.roadmap?.stats.itemsGenerated ?? 0;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* ─── Banner ───────────────────────────────────────────── */}
      <header className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-cyan-500/5 p-6">
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-widest text-emerald-400 mb-2">
              Day-1 Magic Moment
            </p>
            <h1 className="text-2xl font-semibold text-slate-100">
              {result.bannerSummary}
            </h1>
          </div>
          <div className="text-xs text-slate-500 font-mono">
            ran in {result.durationMs}ms
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <KpiTile
            label="Sources confirmed"
            value={enrichmentHits}
            accent="emerald"
          />
          <KpiTile label="Supervising NCAs" value={ncaCount} accent="cyan" />
          <KpiTile
            label="Counsel suggestions"
            value={counselCount}
            accent="violet"
          />
          <KpiTile
            label="Compliance items"
            value={itemsCount}
            sublabel={urgentCount > 0 ? `${urgentCount} urgent` : undefined}
            accent={urgentCount > 0 ? "amber" : "emerald"}
          />
        </div>
      </header>

      {/* ─── Top actions ─────────────────────────────────────── */}
      {result.topActions.length > 0 && (
        <section>
          <h2 className="text-sm uppercase tracking-wide text-slate-500 mb-3">
            First moves
          </h2>
          <div className="space-y-2">
            {result.topActions.map((a) => (
              <Link
                key={a.itemId}
                href={`/dashboard/lineage?type=compliance-item&id=${encodeURIComponent(a.itemId)}`}
                className="block rounded-lg border border-slate-800 bg-slate-900/40 hover:border-emerald-500/40 transition px-4 py-3"
              >
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-100 text-sm font-medium truncate">
                      {a.title}
                    </p>
                    <p className="text-slate-500 text-xs mt-1 font-mono truncate">
                      {a.regulation} · {a.reasoning}
                    </p>
                  </div>
                  <div className="flex-shrink-0 flex items-baseline gap-2 text-xs">
                    <PriorityBadge priority={a.priority} />
                    {a.targetDate && (
                      <span className="text-slate-500">
                        due {new Date(a.targetDate).toISOString().slice(0, 10)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ─── Three columns: Enrichment · Discovery · Roadmap ── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Column title="Enrichment">
          {result.enrichment ? (
            <>
              <KvRow label="Status" value={result.enrichment.status} />
              {result.enrichment.profile.legalName && (
                <KvRow
                  label="Legal name"
                  value={result.enrichment.profile.legalName.value}
                />
              )}
              {result.enrichment.profile.countryCode && (
                <KvRow
                  label="Country"
                  value={result.enrichment.profile.countryCode.value}
                />
              )}
              {result.enrichment.profile.vatId && (
                <KvRow
                  label="VAT"
                  value={result.enrichment.profile.vatId.value}
                />
              )}
              {result.enrichment.profile.lei && (
                <KvRow
                  label="LEI"
                  value={result.enrichment.profile.lei.value}
                />
              )}
              <div className="border-t border-slate-800 mt-3 pt-3">
                <p className="text-xs text-slate-500 mb-2">Source attempts</p>
                {result.enrichment.sourceAttempts.map((a) => (
                  <div
                    key={a.source}
                    className="flex justify-between text-xs py-0.5"
                  >
                    <span className="text-slate-400 font-mono">{a.source}</span>
                    <span
                      className={
                        a.success ? "text-emerald-400" : "text-slate-600"
                      }
                    >
                      {a.success ? "✓" : "—"} {a.fieldsContributed} fields
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyText>Enrichment skipped (no identifiers)</EmptyText>
          )}
        </Column>

        <Column title="Trilateral">
          {result.discovery && result.discovery.authorities.length > 0 ? (
            <>
              <p className="text-xs text-slate-500 mb-2">Supervising NCAs</p>
              {result.discovery.authorities.map((a) => (
                <div
                  key={a.ncaId}
                  className="text-sm py-1 flex items-baseline justify-between"
                >
                  <span className="text-slate-200">{a.name}</span>
                  <span className="text-xs text-slate-500 font-mono">
                    {a.primary ? "primary" : "secondary"} · {a.countryCode}
                  </span>
                </div>
              ))}
              {result.discovery.counsel.filter(
                (c) => c.matchStrategy !== "stub",
              ).length > 0 && (
                <>
                  <p className="text-xs text-slate-500 mt-3 mb-2">
                    Counsel suggestions
                  </p>
                  {result.discovery.counsel
                    .filter((c) => c.matchStrategy !== "stub")
                    .map((c) => (
                      <div
                        key={c.firmName}
                        className="text-sm py-1 flex items-baseline justify-between"
                      >
                        <span className="text-slate-200">{c.firmName}</span>
                        <span className="text-xs text-slate-500 font-mono">
                          {(c.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    ))}
                </>
              )}
            </>
          ) : (
            <EmptyText>
              Operator profile incomplete — discovery skipped
            </EmptyText>
          )}
        </Column>

        <Column title="Roadmap">
          {result.roadmap && result.roadmap.status === "SUCCESS" ? (
            <>
              <p className="text-xs text-slate-500 mb-2">By priority</p>
              {(
                Object.entries(result.roadmap.stats.itemsByPriority) as [
                  string,
                  number,
                ][]
              )
                .filter(([, n]) => n > 0)
                .map(([priority, n]) => (
                  <div
                    key={priority}
                    className="flex justify-between text-xs py-0.5"
                  >
                    <PriorityBadge priority={priority} />
                    <span className="text-slate-400 font-mono">{n}</span>
                  </div>
                ))}
              <p className="text-xs text-slate-500 mt-3 mb-2">By regulation</p>
              {Object.entries(result.roadmap.stats.itemsByRegulation).map(
                ([reg, n]) => (
                  <div
                    key={reg}
                    className="flex justify-between text-xs py-0.5"
                  >
                    <span className="text-slate-300 font-mono">{reg}</span>
                    <span className="text-slate-500 font-mono">{n}</span>
                  </div>
                ),
              )}
            </>
          ) : (
            <EmptyText>
              Roadmap unavailable
              {result.roadmap?.status ? ` (${result.roadmap.status})` : ""}
            </EmptyText>
          )}
        </Column>
      </section>

      {/* ─── Persistence toggle hint ──────────────────────────── */}
      {!persist && (
        <p className="text-xs text-slate-500 text-center pt-2">
          Tip: append <code>?persist=1</code> to upsert the enrichment data to
          AssureCompanyProfile.
        </p>
      )}
    </div>
  );
}

// ─── UI primitives ─────────────────────────────────────────────────────────

function KpiTile({
  label,
  value,
  sublabel,
  accent,
}: {
  label: string;
  value: number;
  sublabel?: string;
  accent: "emerald" | "cyan" | "violet" | "amber";
}) {
  const tone = {
    emerald: "text-emerald-400",
    cyan: "text-cyan-400",
    violet: "text-violet-300",
    amber: "text-amber-300",
  }[accent];

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3">
      <p className={`text-3xl font-semibold ${tone}`}>{value}</p>
      <p className="text-xs text-slate-400 mt-1">{label}</p>
      {sublabel && <p className="text-xs text-amber-400 mt-0.5">{sublabel}</p>}
    </div>
  );
}

function Column({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-4">
      <h3 className="text-sm uppercase tracking-wide text-slate-400 mb-3">
        {title}
      </h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function KvRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm py-1 gap-3">
      <span className="text-slate-500 flex-shrink-0">{label}</span>
      <span className="text-slate-200 text-right truncate">{value}</span>
    </div>
  );
}

function EmptyText({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-500 italic py-2">{children}</p>;
}

function PriorityBadge({ priority }: { priority: string }) {
  const tone =
    (
      {
        URGENT: "bg-red-500/10 text-red-400 border-red-500/30",
        HIGH: "bg-amber-500/10 text-amber-400 border-amber-500/30",
        MEDIUM: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
        LOW: "bg-slate-500/10 text-slate-400 border-slate-500/30",
        WATCHING: "bg-slate-800/30 text-slate-500 border-slate-700/30",
      } as Record<string, string>
    )[priority] ?? "bg-slate-800/30 text-slate-400 border-slate-700/30";

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-mono border ${tone}`}
    >
      {priority}
    </span>
  );
}
