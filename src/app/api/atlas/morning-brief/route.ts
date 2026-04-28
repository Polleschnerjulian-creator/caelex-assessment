/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET /api/atlas/morning-brief
 *
 * Phase 1 — Welcome-Back Briefing. When the lawyer opens Atlas idle
 * mode, instead of waiting for them to type, we surface a one-line
 * briefing about what's actually relevant in their matters today.
 *
 * Atlas stops being purely reactive ("ask me anything") and becomes
 * proactive ("here's what you should look at first").
 *
 * Data sources (matter-scoped to the caller's law firm)
 *   1. Open MatterTasks with dueDate in the next 7 days, ordered by
 *      proximity. Most actionable signal — overdue / due-soon = urgent.
 *   2. Recent counterparty activity — MatterAccessLog entries from
 *      the CAELEX side in the last 24h. Indicates the operator is
 *      actively reading / pulling docs, which often means they want
 *      something soon.
 *   3. Recently-active matters — sorted by updatedAt desc. Lawyer
 *      remembers the matter and gets dropped back into context.
 *
 * Output shape
 *   { brief: string, cta?: { label: string, href: string } }
 *
 * The cta is optional — when there's a clear single-matter focus,
 * the chip becomes a direct deep-link into that matter's workspace.
 * For an empty firm or quiet day, the briefing is informational only.
 *
 * Caching: none for MVP. The endpoint is cheap (a few prisma queries +
 * heuristic synthesis, no LLM call). If usage shows hot-path cost,
 * we can add a per-user 1h memo via Upstash later.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTIVITY_LOOKBACK_HOURS = 24;
const TASK_LOOKAHEAD_DAYS = 7;
const RECENT_MATTER_LIMIT = 5;

interface BriefCta {
  label: string;
  href: string;
}

interface BriefResponse {
  /** Localised greeting based on time-of-day. */
  greeting: string;
  /** One-line summary of what's most relevant right now. */
  brief: string;
  /** Optional deep-link CTA (e.g. "→ ABC-Mandat öffnen"). */
  cta?: BriefCta;
}

function greetingForHour(hour: number): string {
  if (hour < 5) return "Späte Stunde";
  if (hour < 12) return "Guten Morgen";
  if (hour < 18) return "Guten Tag";
  return "Guten Abend";
}

/** Approximate "in N Tagen" / "heute" / "morgen" / "überfällig". */
function relativeDays(target: Date, from: Date): string {
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(target) - startOfDay(from)) / 86_400_000);
  if (days < 0) return `überfällig (${-days}d)`;
  if (days === 0) return "heute";
  if (days === 1) return "morgen";
  return `in ${days} Tagen`;
}

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
      orderBy: { joinedAt: "asc" },
    });
    if (!membership) {
      return NextResponse.json({ error: "No active org" }, { status: 403 });
    }

    const now = new Date();
    const greeting = greetingForHour(now.getHours());

    // Active matters where caller's org is on the LAW_FIRM side.
    // Atlas-side briefing only — operator-side has its own dashboard
    // for the same data.
    const activeMatters = await prisma.legalMatter.findMany({
      where: {
        lawFirmOrgId: membership.organizationId,
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        clientOrgId: true,
        updatedAt: true,
        clientOrg: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 30,
    });

    // Empty / new firm — friendly default message.
    if (activeMatters.length === 0) {
      return NextResponse.json<BriefResponse>({
        greeting,
        brief:
          "Noch keine aktiven Mandate. Lade einen Mandanten ein um zu starten.",
        cta: {
          label: "Mandant einladen",
          href: "/atlas/network/invite",
        },
      });
    }

    const matterIds = activeMatters.map((m) => m.id);

    // Signal 1: open tasks due in the next 7 days, sorted by proximity.
    const lookaheadEnd = new Date(
      now.getTime() + TASK_LOOKAHEAD_DAYS * 86_400_000,
    );
    const upcomingTasks = await prisma.matterTask.findMany({
      where: {
        matterId: { in: matterIds },
        status: { in: ["OPEN", "IN_PROGRESS"] },
        dueDate: { not: null, lte: lookaheadEnd },
      },
      select: {
        id: true,
        matterId: true,
        title: true,
        dueDate: true,
        priority: true,
      },
      orderBy: { dueDate: "asc" },
      take: 5,
    });

    // Signal 2: recent counterparty (CAELEX) activity in the last 24h.
    // Tells the lawyer "the operator is reading" without forcing them
    // to open the audit log.
    const lookbackStart = new Date(
      now.getTime() - ACTIVITY_LOOKBACK_HOURS * 3_600_000,
    );
    const recentCaelexActivity = await prisma.legalMatterAccessLog.groupBy({
      by: ["matterId"],
      where: {
        matterId: { in: matterIds },
        actorSide: "CAELEX",
        createdAt: { gte: lookbackStart },
      },
      _count: { _all: true },
    });

    // ── Synthesis ───────────────────────────────────────────────
    // Pick the highest-priority signal. Tasks beat activity because
    // a task has a deadline; activity is informational. Within tasks,
    // the soonest-due wins. Within activity, the busiest matter wins.

    if (upcomingTasks.length > 0) {
      const t = upcomingTasks[0];
      const matter = activeMatters.find((m) => m.id === t.matterId);
      const matterName = matter?.name ?? "Mandat";
      const when = t.dueDate ? relativeDays(t.dueDate, now) : "demnächst";
      return NextResponse.json<BriefResponse>({
        greeting,
        brief: `${matterName}: „${t.title}" ${when}.`,
        cta: matter
          ? {
              label: "→ Mandat öffnen",
              href: `/atlas/network/${matter.id}/workspace`,
            }
          : undefined,
      });
    }

    if (recentCaelexActivity.length > 0) {
      // Sort by activity count descending, prefer the most-active.
      const top = recentCaelexActivity.sort(
        (a, b) => b._count._all - a._count._all,
      )[0];
      const matter = activeMatters.find((m) => m.id === top.matterId);
      const matterName = matter?.name ?? "Ein Mandat";
      const clientName = matter?.clientOrg?.name ?? "Mandant";
      const count = top._count._all;
      return NextResponse.json<BriefResponse>({
        greeting,
        brief: `${clientName} war seit gestern ${count} Mal in „${matterName}" aktiv.`,
        cta: matter
          ? {
              label: "→ Mandat öffnen",
              href: `/atlas/network/${matter.id}/workspace`,
            }
          : undefined,
      });
    }

    // Fallback: most-recently-updated active matter, no urgent signal.
    const recent = activeMatters.slice(0, RECENT_MATTER_LIMIT);
    const top = recent[0];
    const others = recent.length - 1;
    const tail =
      others > 0 ? ` · ${others} weitere${others === 1 ? "s" : ""}` : "";
    return NextResponse.json<BriefResponse>({
      greeting,
      brief: `${activeMatters.length} aktive Mandat${
        activeMatters.length === 1 ? "" : "e"
      }. Zuletzt: „${top.name}"${tail}.`,
      cta: {
        label: "→ Mandat öffnen",
        href: `/atlas/network/${top.id}/workspace`,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Morning brief failed: ${msg}`);
    // Soft fail — the briefing is best-effort. Returning 200 with a
    // benign greeting keeps the idle screen clean rather than showing
    // an error.
    return NextResponse.json<BriefResponse>({
      greeting: "Willkommen",
      brief: "",
    });
  }
}
