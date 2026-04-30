import { redirect } from "next/navigation";
import Link from "next/link";
import { Inbox, Calendar, Eye, ArrowRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { resolveComplyUiVersion } from "@/lib/comply-ui-version.server";
import { getTodayInboxForUser } from "@/lib/comply-v2/compliance-item.server";
import { type ComplianceItem, REGULATION_LABELS } from "@/lib/comply-v2/types";
import { Button } from "@/components/ui/v2/button";
import { ComplianceItemCard } from "@/components/dashboard/v2/ComplianceItemCard";

export const metadata = {
  title: "Today — Caelex Comply",
  description: "What needs your attention this week.",
};

/**
 * Today inbox — the Mercury-pattern landing surface for Comply v2.
 *
 * Default landing for v2 users (Phase 2 will redirect /dashboard →
 * /dashboard/today when complyUiVersion === "v2"). Today reachable
 * via Cmd-K and the V2Shell preview banner.
 *
 * Three sections:
 *   • URGENT      — items the user should action today
 *   • THIS WEEK   — items needing attention by EOW
 *   • WATCHING    — items in flight (under review or draft)
 *                   plus any items the user has explicitly snoozed
 *
 * Each card has an action menu (Snooze / Wake / Note) wired to
 * Server Actions in `./server-actions.ts`. Actions are defined via
 * the defineAction() framework in src/lib/comply-v2/actions/.
 */
export default async function TodayInboxPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?next=/dashboard/today");
  }

  const ui = await resolveComplyUiVersion();
  if (ui === "v1") {
    // Today is V2-only. V1 users land back on the legacy dashboard.
    redirect("/dashboard");
  }

  const inbox = await getTodayInboxForUser(session.user.id);
  const total =
    inbox.urgent.length + inbox.thisWeek.length + inbox.watching.length;

  return (
    <div className="mx-auto max-w-screen-xl px-6 py-8">
      <header className="mb-8 flex items-end justify-between gap-6">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            <Inbox className="h-3.5 w-3.5" />
            Today
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            What needs you this week
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {total} item{total === 1 ? "" : "s"} across{" "}
            {Object.keys(REGULATION_LABELS).length} compliance regimes.
          </p>
        </div>
        <Button variant="outline" asChild size="sm">
          <Link href="/dashboard">
            Open legacy dashboard
            <ArrowRight />
          </Link>
        </Button>
      </header>

      <Section
        title="Urgent"
        count={inbox.urgent.length}
        emptyMessage="Nothing urgent. Take a breath."
        accent="emerald"
        icon={Inbox}
      >
        {inbox.urgent.map((item) => (
          <ComplianceItemCard
            key={item.id}
            item={serializableItem(item)}
            snoozedUntil={inbox.snoozedUntilByItemId[item.id] ?? null}
          />
        ))}
      </Section>

      <Section
        title="This week"
        count={inbox.thisWeek.length}
        emptyMessage="Nothing on the radar this week."
        accent="slate"
        icon={Calendar}
      >
        {inbox.thisWeek.map((item) => (
          <ComplianceItemCard
            key={item.id}
            item={serializableItem(item)}
            snoozedUntil={inbox.snoozedUntilByItemId[item.id] ?? null}
          />
        ))}
      </Section>

      <Section
        title="Watching"
        count={inbox.watching.length}
        emptyMessage="Nothing in flight."
        accent="slate"
        icon={Eye}
      >
        {inbox.watching.map((item) => (
          <ComplianceItemCard
            key={item.id}
            item={serializableItem(item)}
            snoozedUntil={inbox.snoozedUntilByItemId[item.id] ?? null}
          />
        ))}
      </Section>
    </div>
  );
}

/**
 * Serialize Date fields → string for client-component consumption.
 * Server Components can pass Date objects through React's RSC payload,
 * but Date instances are not stable across the wire — converting at
 * the boundary keeps the Client Component prop-shape obvious.
 */
function serializableItem(item: ComplianceItem): ComplianceItem {
  return {
    ...item,
    targetDate: item.targetDate ? new Date(item.targetDate) : null,
    updatedAt: new Date(item.updatedAt),
  };
}

function Section({
  title,
  count,
  emptyMessage,
  accent,
  icon: Icon,
  children,
}: {
  title: string;
  count: number;
  emptyMessage: string;
  accent: "emerald" | "slate";
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
        <Icon
          className={
            accent === "emerald"
              ? "h-4 w-4 text-emerald-500"
              : "h-4 w-4 text-slate-400"
          }
        />
        {title}
        <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {count}
        </span>
      </h2>
      {count === 0 ? (
        <p className="ml-6 text-sm text-slate-400 dark:text-slate-500">
          {emptyMessage}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {children}
        </div>
      )}
    </section>
  );
}
