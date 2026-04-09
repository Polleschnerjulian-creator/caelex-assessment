"use client";

import { useMemo } from "react";
import { JURISDICTION_DATA } from "@/data/national-space-laws";

// ─── Types ───

interface FeedEntry {
  id: string;
  flag: string;
  country: string;
  countryCode: string;
  title: string;
  impact: "breaking" | "significant" | "minor";
  timestamp: number; // ms since epoch, for sorting
  timeAgo: string;
}

const IMPACT_BADGES: Record<
  string,
  { dot: string; label: string; color: string }
> = {
  breaking: {
    dot: "bg-red-500",
    label: "BREAKING",
    color: "text-red-600",
  },
  significant: {
    dot: "bg-amber-500",
    label: "SIGNIFICANT",
    color: "text-amber-600",
  },
  minor: {
    dot: "bg-blue-400",
    label: "UPDATE",
    color: "text-blue-500",
  },
};

// ─── Determine time-ago label ───

function formatTimeAgo(dateMs: number): string {
  const now = Date.now();
  const diffDays = Math.floor((now - dateMs) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "1d ago";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

// ─── Classify impact properly ───
//
// BREAKING: Only actual NEW legislation changes (recently enacted laws, new amendments)
// SIGNIFICANT: EU Space Act relationship changes, major amendments to existing law
// MINOR: Everything else — known gaps, cross-references, routine info

function generateFeedEntries(): FeedEntry[] {
  const entries: FeedEntry[] = [];

  JURISDICTION_DATA.forEach((law) => {
    const code = law.countryCode;
    const [year, month] = law.lastUpdated.split("-").map(Number);
    const updateDate = new Date(year, month - 1, 15);
    const timestamp = updateDate.getTime();
    const now = Date.now();
    const diffDays = Math.floor((now - timestamp) / (1000 * 60 * 60 * 24));

    // Recently enacted or new laws (within last ~180 days) = BREAKING
    // These represent actual regulatory changes operators need to know about
    if (
      law.legislation.status === "enacted" &&
      law.legislation.yearEnacted >= 2024 &&
      diffDays < 180
    ) {
      entries.push({
        id: `${code}-new-law`,
        flag: law.flagEmoji,
        country: law.countryName,
        countryCode: code,
        title: `${law.legislation.name} enacted`,
        impact: "breaking",
        timestamp,
        timeAgo: formatTimeAgo(timestamp),
      });
      return; // Don't duplicate with other entries for the same jurisdiction
    }

    // Recent amendments to existing laws = SIGNIFICANT
    if (
      law.legislation.status === "enacted" &&
      law.legislation.yearAmended &&
      law.legislation.yearAmended >= 2023
    ) {
      entries.push({
        id: `${code}-amendment`,
        flag: law.flagEmoji,
        country: law.countryName,
        countryCode: code,
        title: `${law.legislation.name} amended (${law.legislation.yearAmended})`,
        impact: diffDays < 120 ? "significant" : "minor",
        timestamp,
        timeAgo: formatTimeAgo(timestamp),
      });
      return;
    }

    // EU Space Act relationship notes for gap/parallel jurisdictions = SIGNIFICANT
    if (
      law.euSpaceActCrossRef.relationship === "gap" &&
      law.legislation.status === "enacted"
    ) {
      entries.push({
        id: `${code}-eu-gap`,
        flag: law.flagEmoji,
        country: law.countryName,
        countryCode: code,
        title: `EU Space Act alignment gap identified — ${law.euSpaceActCrossRef.description.slice(0, 80)}`,
        impact: "significant",
        timestamp,
        timeAgo: formatTimeAgo(timestamp),
      });
      return;
    }

    // Known regulatory gaps (no law) = MINOR, not breaking — these are known facts
    if (law.legislation.status === "none") {
      entries.push({
        id: `${code}-no-law`,
        flag: law.flagEmoji,
        country: law.countryName,
        countryCode: code,
        title: `No comprehensive space law — interim framework in use`,
        impact: "minor",
        timestamp,
        timeAgo: formatTimeAgo(timestamp),
      });
      return;
    }

    // Established laws — just note them as minor informational
    if (law.legislation.status === "enacted") {
      entries.push({
        id: `${code}-active`,
        flag: law.flagEmoji,
        country: law.countryName,
        countryCode: code,
        title: `${law.legislation.name} — active since ${law.legislation.yearEnacted}`,
        impact: "minor",
        timestamp,
        timeAgo: formatTimeAgo(timestamp),
      });
    }
  });

  // Sort by recency (newest first), then by impact level for same timestamp
  const impactOrder: Record<string, number> = {
    breaking: 0,
    significant: 1,
    minor: 2,
  };
  entries.sort((a, b) => {
    // Primary: recency
    const timeDiff = b.timestamp - a.timestamp;
    if (timeDiff !== 0) return timeDiff;
    // Secondary: impact
    return (impactOrder[a.impact] ?? 3) - (impactOrder[b.impact] ?? 3);
  });

  // Limit to 10 items
  return entries.slice(0, 10);
}

// ─── Feed Entry Component ───

function FeedEntryCard({ entry }: { entry: FeedEntry }) {
  const badge = IMPACT_BADGES[entry.impact];

  return (
    <div className="rounded-lg px-3 py-2.5 bg-gray-50/70 border border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-all duration-150">
      <div className="flex items-start gap-2.5">
        {/* Flag */}
        <span className="text-base leading-none mt-0.5 shrink-0">
          {entry.flag}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-gray-900 truncate">
              {entry.country}
            </span>
            <span className="text-[10px] font-mono text-gray-400 shrink-0">
              {entry.timeAgo}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mt-0.5 leading-snug line-clamp-2">
            {entry.title}
          </p>

          {/* Impact badge — inline */}
          <div className="mt-1.5">
            <span
              className={`inline-flex items-center gap-1 text-[9px] font-semibold tracking-wider ${badge.color}`}
            >
              <span className={`w-1 h-1 rounded-full ${badge.dot}`} />
              {badge.label}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───

export default function LiveFeed() {
  const entries = useMemo(() => generateFeedEntries(), []);

  const breakingCount = entries.filter((e) => e.impact === "breaking").length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
            Regulatory Feed
          </h3>
        </div>
        <span className="text-[10px] font-mono text-gray-400">
          {breakingCount > 0 ? (
            <span className="text-red-500 font-semibold">
              {breakingCount} breaking
            </span>
          ) : (
            `${entries.length} updates`
          )}
        </span>
      </div>

      {/* Scrollable feed */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {entries.map((entry) => (
          <FeedEntryCard key={entry.id} entry={entry} />
        ))}

        {entries.length === 0 && (
          <div className="text-center py-8">
            <p className="text-xs text-gray-400">No regulatory updates</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-100">
        <p className="text-[9px] text-gray-400 text-center tracking-wide">
          Sourced from {JURISDICTION_DATA.size} jurisdiction databases
        </p>
      </div>
    </div>
  );
}
