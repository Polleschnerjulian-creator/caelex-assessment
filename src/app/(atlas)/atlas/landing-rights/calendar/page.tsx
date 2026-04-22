import {
  getAllCalendarEvents,
  getUpcomingEvents,
} from "@/data/landing-rights/calendar";
import { RenewalCalendar } from "@/components/atlas/landing-rights/RenewalCalendar";

export const metadata = {
  title: "Landing Rights Calendar — Atlas",
  description:
    "Auto-computed renewal deadlines, FCC milestones, WRC conferences, and regulatory-change dates across all tracked jurisdictions and operators.",
};

type SearchParams = {
  range?: string;
  type?: string;
  jurisdiction?: string;
  operator?: string;
};

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const range = sp.range ?? "upcoming";

  const allEvents = getAllCalendarEvents();
  let events =
    range === "all"
      ? allEvents
      : range === "90d"
        ? getUpcomingEvents(90)
        : range === "1y"
          ? getUpcomingEvents(365)
          : getUpcomingEvents(365 * 5);

  if (sp.type && sp.type !== "all") {
    events = events.filter((e) => e.type === sp.type);
  }
  if (sp.jurisdiction && sp.jurisdiction !== "all") {
    events = events.filter(
      (e) => e.jurisdiction?.toUpperCase() === sp.jurisdiction?.toUpperCase(),
    );
  }
  if (sp.operator && sp.operator !== "all") {
    events = events.filter(
      (e) => e.operator?.toLowerCase() === sp.operator?.toLowerCase(),
    );
  }

  const upcomingCount = events.filter((e) => e.status === "upcoming").length;
  const pastCount = events.filter((e) => e.status === "past").length;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-[32px] font-light tracking-tight text-[var(--atlas-text-primary)]">
          Calendar
        </h1>
        <p className="mt-1 text-[13px] text-[var(--atlas-text-secondary)] max-w-2xl">
          Renewal deadlines, deployment milestones, WRC conferences, and
          regulatory-change dates — auto-computed from profile data plus
          publicly-verified global milestones.
        </p>
        <div className="mt-4 flex items-center gap-4 text-[12px] text-[var(--atlas-text-muted)]">
          <span>
            <strong className="text-[var(--atlas-text-primary)]">
              {upcomingCount}
            </strong>{" "}
            upcoming
          </span>
          <span>
            <strong className="text-[var(--atlas-text-primary)]">
              {pastCount}
            </strong>{" "}
            past
          </span>
          <span>
            <strong className="text-[var(--atlas-text-primary)]">
              {events.length}
            </strong>{" "}
            shown
          </span>
        </div>
      </header>

      <CalendarFilters range={range} sp={sp} />

      {events.length === 0 ? (
        <div className="rounded-xl bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border-subtle)] p-12 text-center text-[var(--atlas-text-muted)]">
          No events match the current filters.
        </div>
      ) : (
        <RenewalCalendar events={events} />
      )}
    </div>
  );
}

function CalendarFilters({ range, sp }: { range: string; sp: SearchParams }) {
  const ranges = [
    { v: "90d", l: "Next 90 days" },
    { v: "1y", l: "Next year" },
    { v: "upcoming", l: "All upcoming" },
    { v: "all", l: "All (incl. past)" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {ranges.map((r) => {
        const isActive = range === r.v;
        const params = new URLSearchParams();
        if (r.v !== "upcoming") params.set("range", r.v);
        if (sp.type) params.set("type", sp.type);
        if (sp.jurisdiction) params.set("jurisdiction", sp.jurisdiction);
        if (sp.operator) params.set("operator", sp.operator);
        const href = `/atlas/landing-rights/calendar${params.toString() ? "?" + params.toString() : ""}`;
        return (
          <a
            key={r.v}
            href={href}
            className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${isActive ? "bg-gray-900 text-white" : "bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border)] text-[var(--atlas-text-secondary)] hover:border-[var(--atlas-border-strong)]"}`}
          >
            {r.l}
          </a>
        );
      })}
    </div>
  );
}
