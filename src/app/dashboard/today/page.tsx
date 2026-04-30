import { redirect } from "next/navigation";
import Link from "next/link";
import { Inbox, Calendar, Eye, ArrowRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { resolveComplyUiVersion } from "@/lib/comply-ui-version.server";
import { getTodayInboxForUser } from "@/lib/comply-v2/compliance-item.server";
import {
  type ComplianceItem,
  type ComplianceStatus,
  REGULATION_LABELS,
} from "@/lib/comply-v2/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/v2/card";
import { Badge } from "@/components/ui/v2/badge";
import { Button } from "@/components/ui/v2/button";

export const metadata = {
  title: "Today — Caelex Comply",
  description: "What needs your attention this week.",
};

/**
 * Today inbox — the Mercury-pattern landing surface for Comply v2.
 *
 * Default landing for v2 users (Phase 1 will redirect /dashboard →
 * /dashboard/today when complyUiVersion === "v2"). For Phase 0 it's
 * reachable via Cmd-K and the V2Shell's preview banner.
 *
 * Three sections:
 *   • URGENT      — items the user should action today
 *   • THIS WEEK   — items needing attention by EOW
 *   • WATCHING    — items in flight (under review or draft)
 *
 * Items are ComplianceItem objects normalized across all 8 regimes.
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
          <ItemCard key={item.id} item={item} />
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
          <ItemCard key={item.id} item={item} />
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
          <ItemCard key={item.id} item={item} />
        ))}
      </Section>
    </div>
  );
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

function statusVariant(status: ComplianceStatus) {
  switch (status) {
    case "PENDING":
      return "pending";
    case "DRAFT":
      return "draft";
    case "EVIDENCE_REQUIRED":
      return "evidenceRequired";
    case "UNDER_REVIEW":
      return "underReview";
    case "ATTESTED":
      return "attested";
    case "EXPIRED":
      return "expired";
    case "NOT_APPLICABLE":
      return "outline";
    default:
      return "default";
  }
}

const STATUS_LABELS: Record<ComplianceStatus, string> = {
  PENDING: "Pending",
  DRAFT: "Draft",
  EVIDENCE_REQUIRED: "Evidence req.",
  UNDER_REVIEW: "Under review",
  ATTESTED: "Attested",
  EXPIRED: "Expired",
  NOT_APPLICABLE: "N/A",
};

function ItemCard({ item }: { item: ComplianceItem }) {
  const tone = item.priority === "URGENT" ? "emerald" : "slate";
  const noteSnippet =
    item.notes?.slice(0, 140) || item.evidenceNotes?.slice(0, 140);
  return (
    <Card tone={tone} className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="mb-1 flex items-start justify-between gap-2">
          <Badge variant={statusVariant(item.status)}>
            {STATUS_LABELS[item.status]}
          </Badge>
          <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
            {item.regulation}
          </span>
        </div>
        <CardTitle className="leading-snug">{item.requirementId}</CardTitle>
        <CardDescription className="text-xs">
          {REGULATION_LABELS[item.regulation]}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-4 pt-1">
        {noteSnippet ? (
          <p className="line-clamp-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            {noteSnippet}
          </p>
        ) : (
          <p className="text-xs italic text-slate-400 dark:text-slate-500">
            No notes yet.
          </p>
        )}
        {item.targetDate ? (
          <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
            <Calendar className="h-3 w-3" />
            Due {item.targetDate.toLocaleDateString()}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
