/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Cost-Tracking Admin View.
 *
 * Surfaces the AI-spend aggregation for Atlas. Reads from
 * `AtlasMessage.costUsd` (populated by the chat-engine after each
 * Anthropic turn) and groups by user + day so the operator can see:
 *
 *   • Today / This week / This month / All time totals
 *   • Top 10 users by spend (last 30 days)
 *   • Daily-cost bars (last 30 days)
 *
 * Platform-admin only. Non-admins get redirected to /atlas-no-access
 * via the parent route gate; we additionally check here in case the
 * gate ever loosens.
 *
 * Why this exists: knowing per-user spend is the foundation for
 * pricing tiers (free / pro / enterprise quotas) and for catching
 * runaway-cost anomalies before they bite the AWS bill.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, DollarSign, TrendingUp, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/atlas-auth";

export const dynamic = "force-dynamic";

/* Aggregation helpers. We keep these in this file (not a service)
   because they're page-specific — moving them would create indirection
   without payoff. */

function startOfDay(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function startOfWeek(): Date {
  const d = startOfDay();
  /* Week starts Monday for de-DE convention. JS getDay() is 0..6 with
     Sunday=0, so shift by 6 to align Monday=0. */
  const dayIdx = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dayIdx);
  return d;
}
function startOfMonth(): Date {
  const d = startOfDay();
  d.setDate(1);
  return d;
}
function daysAgo(n: number): Date {
  const d = startOfDay();
  d.setDate(d.getDate() - n);
  return d;
}

async function loadAggregates() {
  const [todaySum, weekSum, monthSum, allSum] = await Promise.all([
    prisma.atlasMessage.aggregate({
      where: { createdAt: { gte: startOfDay() } },
      _sum: { costUsd: true },
      _count: true,
    }),
    prisma.atlasMessage.aggregate({
      where: { createdAt: { gte: startOfWeek() } },
      _sum: { costUsd: true },
      _count: true,
    }),
    prisma.atlasMessage.aggregate({
      where: { createdAt: { gte: startOfMonth() } },
      _sum: { costUsd: true },
      _count: true,
    }),
    prisma.atlasMessage.aggregate({
      _sum: { costUsd: true, inputTokens: true, outputTokens: true },
      _count: true,
    }),
  ]);

  return {
    today: { sum: todaySum._sum.costUsd ?? 0, count: todaySum._count },
    week: { sum: weekSum._sum.costUsd ?? 0, count: weekSum._count },
    month: { sum: monthSum._sum.costUsd ?? 0, count: monthSum._count },
    all: {
      sum: allSum._sum.costUsd ?? 0,
      count: allSum._count,
      inputTokens: allSum._sum.inputTokens ?? 0,
      outputTokens: allSum._sum.outputTokens ?? 0,
    },
  };
}

async function loadTopUsers(): Promise<
  Array<{
    userId: string;
    email: string | null;
    name: string | null;
    sum: number;
    count: number;
  }>
> {
  /* `groupBy` keeps the aggregation in Postgres rather than streaming
     every row. Limit to last-30-days so the query stays bounded. */
  const grouped = await prisma.atlasMessage.groupBy({
    by: ["chatId"],
    where: { createdAt: { gte: daysAgo(30) } },
    _sum: { costUsd: true },
    _count: true,
  });

  /* AtlasMessage doesn't have userId — it's joined via AtlasChat.
     We need a second pass to resolve chatId → userId. We fetch the
     chat→user mapping for just the chatIds we saw. */
  const chatIds = grouped.map((g) => g.chatId);
  const chats = await prisma.atlasChat.findMany({
    where: { id: { in: chatIds } },
    select: {
      id: true,
      owner: { select: { id: true, email: true, name: true } },
    },
  });
  const chatToUser = new Map(chats.map((c) => [c.id, c.owner]));

  /* Sum-up per user. */
  const byUser = new Map<
    string,
    {
      userId: string;
      email: string | null;
      name: string | null;
      sum: number;
      count: number;
    }
  >();
  for (const g of grouped) {
    const u = chatToUser.get(g.chatId);
    if (!u) continue;
    const cur = byUser.get(u.id) ?? {
      userId: u.id,
      email: u.email,
      name: u.name,
      sum: 0,
      count: 0,
    };
    cur.sum += g._sum.costUsd ?? 0;
    cur.count += g._count;
    byUser.set(u.id, cur);
  }

  return [...byUser.values()].sort((a, b) => b.sum - a.sum).slice(0, 10);
}

async function loadDailySeries(): Promise<
  Array<{ day: string; sum: number; count: number }>
> {
  /* Last 30 days. We pull all messages in the window once + bucket
     in-process — cheaper than 30 separate aggregations. */
  const since = daysAgo(30);
  const rows = await prisma.atlasMessage.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true, costUsd: true },
  });
  const buckets = new Map<string, { sum: number; count: number }>();
  for (const r of rows) {
    const day = r.createdAt.toISOString().slice(0, 10);
    const cur = buckets.get(day) ?? { sum: 0, count: 0 };
    cur.sum += r.costUsd ?? 0;
    cur.count += 1;
    buckets.set(day, cur);
  }
  /* Fill in zeros for missing days so the bar chart has consistent
     spacing. Walk 30 days back to today. */
  const out: Array<{ day: string; sum: number; count: number }> = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const hit = buckets.get(key);
    out.push({ day: key, sum: hit?.sum ?? 0, count: hit?.count ?? 0 });
  }
  return out;
}

export default async function AtlasCostPage() {
  /* Auth gate — non-admin redirects to the atlas no-access page. */
  const admin = await requirePlatformAdmin();
  if (!admin) {
    redirect("/atlas");
  }

  const [agg, top, daily] = await Promise.all([
    loadAggregates(),
    loadTopUsers(),
    loadDailySeries(),
  ]);

  const maxDailySum = Math.max(...daily.map((d) => d.sum), 0.01);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 text-slate-900 dark:text-slate-100">
      <div className="mb-6">
        <Link
          href="/atlas/settings"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <ArrowLeft size={12} /> Zurück zu Einstellungen
        </Link>
      </div>

      <header className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          Operations · Cost Tracking
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          AI-Spend pro User · Tag · Monat
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          Aggregiert aus <code>AtlasMessage.costUsd</code> (pro Anthropic-Turn
          gespeichert durch die Chat-Engine). Daten in Echtzeit, keine
          Cache-Verzögerung. Nur für Platform-Admins sichtbar.
        </p>
      </header>

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          icon={<DollarSign size={14} />}
          label="Heute"
          value={fmtUsd(agg.today.sum)}
          hint={`${agg.today.count} Nachrichten`}
        />
        <Stat
          icon={<DollarSign size={14} />}
          label="Diese Woche"
          value={fmtUsd(agg.week.sum)}
          hint={`${agg.week.count} Nachrichten`}
        />
        <Stat
          icon={<DollarSign size={14} />}
          label="Dieser Monat"
          value={fmtUsd(agg.month.sum)}
          hint={`${agg.month.count} Nachrichten`}
        />
        <Stat
          icon={<TrendingUp size={14} />}
          label="All time"
          value={fmtUsd(agg.all.sum)}
          hint={`${fmtTokens(
            agg.all.inputTokens + agg.all.outputTokens,
          )} Tokens`}
        />
      </div>

      {/* Daily bars */}
      <h2 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
        Tageskosten · letzte 30 Tage
      </h2>
      <div className="mb-8 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700/60 dark:bg-slate-900/40">
        <div className="flex h-[120px] items-end gap-1">
          {daily.map((d) => {
            const pct = (d.sum / maxDailySum) * 100;
            return (
              <div
                key={d.day}
                title={`${d.day}: ${fmtUsd(d.sum)} (${d.count} Nachrichten)`}
                className="flex-1 rounded-t bg-slate-300 transition-colors hover:bg-slate-400 dark:bg-slate-700 dark:hover:bg-slate-600"
                style={{
                  height: `${Math.max(pct, 1)}%`,
                  /* Pull "today" out visually so the trend is readable. */
                  opacity: pct === 0 ? 0.15 : 1,
                }}
              />
            );
          })}
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-slate-500">
          <span>{daily[0]?.day}</span>
          <span>Max-Tag: {fmtUsd(maxDailySum)}</span>
          <span>{daily[daily.length - 1]?.day}</span>
        </div>
      </div>

      {/* Top users */}
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
        <Users size={13} />
        Top 10 User · letzte 30 Tage
      </h2>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700/60 dark:bg-slate-900/40">
        {top.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-slate-500">
            Noch keine Daten für die letzten 30 Tage.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-400">
              <tr>
                <th className="px-4 py-2 text-left">User</th>
                <th className="px-4 py-2 text-right">Nachrichten</th>
                <th className="px-4 py-2 text-right">Spend</th>
                <th className="px-4 py-2 text-right">Ø / Nachricht</th>
              </tr>
            </thead>
            <tbody>
              {top.map((u) => (
                <tr
                  key={u.userId}
                  className="border-b border-slate-200 last:border-0 dark:border-slate-800"
                >
                  <td className="px-4 py-2 text-slate-800 dark:text-slate-200">
                    <div className="line-clamp-1">
                      {u.name || u.email || "—"}
                    </div>
                    {u.name && u.email && (
                      <div className="text-[10px] text-slate-500">
                        {u.email}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-slate-700 dark:text-slate-300">
                    {u.count}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums font-medium text-slate-900 dark:text-slate-100">
                    {fmtUsd(u.sum)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-slate-500">
                    {u.count > 0 ? fmtUsd(u.sum / u.count) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700/60 dark:bg-slate-900/40">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500">
        <span className="opacity-70">{icon}</span>
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
        {value}
      </div>
      {hint && <div className="mt-0.5 text-[11px] text-slate-500">{hint}</div>}
    </div>
  );
}

function fmtUsd(n: number): string {
  if (n === 0) return "$0.00";
  if (n < 0.01) return `$${n.toFixed(4)}`;
  if (n < 1) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(2)}`;
}

function fmtTokens(n: number): string {
  if (n < 1000) return `${n}`;
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}K`;
  return `${(n / 1_000_000).toFixed(2)}M`;
}
