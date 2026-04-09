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
  timeAgo: string;
}

const IMPACT_BADGES: Record<
  string,
  { emoji: string; label: string; color: string }
> = {
  breaking: { emoji: "\u{1F534}", label: "BREAKING", color: "text-red-400" },
  significant: {
    emoji: "\u{1F7E1}",
    label: "SIGNIFICANT",
    color: "text-amber-400",
  },
  minor: { emoji: "\u{1F535}", label: "MINOR", color: "text-blue-400" },
};

// ─── Generate feed entries from real jurisdiction data ───

function generateFeedEntries(): FeedEntry[] {
  const entries: FeedEntry[] = [];

  JURISDICTION_DATA.forEach((law) => {
    const code = law.countryCode;
    const lastUpdated = law.lastUpdated;
    const [year, month] = lastUpdated.split("-").map(Number);
    const updateDate = new Date(year, month - 1, 15);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - updateDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    let timeAgo: string;
    if (diffDays <= 0) timeAgo = "Today";
    else if (diffDays === 1) timeAgo = "1d ago";
    else if (diffDays < 7) timeAgo = `${diffDays}d ago`;
    else if (diffDays < 30) timeAgo = `${Math.floor(diffDays / 7)}w ago`;
    else if (diffDays < 365) timeAgo = `${Math.floor(diffDays / 30)}mo ago`;
    else timeAgo = `${Math.floor(diffDays / 365)}y ago`;

    // Primary entry: legislation status
    if (law.legislation.status === "enacted") {
      if (law.legislation.yearAmended) {
        entries.push({
          id: `${code}-amendment`,
          flag: law.flagEmoji,
          country: law.countryName,
          countryCode: code,
          title: `${law.legislation.name} amended (${law.legislation.yearAmended})`,
          impact: diffDays < 90 ? "significant" : "minor",
          timeAgo,
        });
      } else {
        entries.push({
          id: `${code}-enacted`,
          flag: law.flagEmoji,
          country: law.countryName,
          countryCode: code,
          title: `${law.legislation.name} in force`,
          impact: "minor",
          timeAgo,
        });
      }
    } else if (law.legislation.status === "none") {
      entries.push({
        id: `${code}-gap`,
        flag: law.flagEmoji,
        country: law.countryName,
        countryCode: code,
        title: `No comprehensive space law \u2014 regulatory gap identified`,
        impact: "breaking",
        timeAgo,
      });
    }

    // EU Space Act cross-reference entries for recently updated jurisdictions
    if (
      diffDays < 120 &&
      law.euSpaceActCrossRef.relationship !== "complementary"
    ) {
      entries.push({
        id: `${code}-eu-crossref`,
        flag: law.flagEmoji,
        country: law.countryName,
        countryCode: code,
        title: `EU Space Act relationship: ${law.euSpaceActCrossRef.relationship}`,
        impact:
          law.euSpaceActCrossRef.relationship === "gap"
            ? "breaking"
            : "significant",
        timeAgo,
      });
    }

    // Insurance/liability changes for recently updated
    if (
      diffDays < 120 &&
      law.insuranceLiability.mandatoryInsurance &&
      law.insuranceLiability.minimumCoverage
    ) {
      entries.push({
        id: `${code}-insurance`,
        flag: law.flagEmoji,
        country: law.countryName,
        countryCode: code,
        title: `Insurance requirement: ${law.insuranceLiability.minimumCoverage}`,
        impact: "minor",
        timeAgo,
      });
    }

    // Debris mitigation updates
    if (
      diffDays < 120 &&
      law.debrisMitigation.deorbitRequirement &&
      law.debrisMitigation.deorbitTimeline
    ) {
      entries.push({
        id: `${code}-debris`,
        flag: law.flagEmoji,
        country: law.countryName,
        countryCode: code,
        title: `Deorbit mandate: ${law.debrisMitigation.deorbitTimeline}`,
        impact: "significant",
        timeAgo,
      });
    }
  });

  // Sort by impact priority then recency
  const impactOrder: Record<string, number> = {
    breaking: 0,
    significant: 1,
    minor: 2,
  };
  entries.sort((a, b) => {
    const ia = impactOrder[a.impact] ?? 3;
    const ib = impactOrder[b.impact] ?? 3;
    if (ia !== ib) return ia - ib;
    return 0; // preserve insertion order within same impact
  });

  return entries;
}

// ─── Feed Entry Component ───

function FeedEntryCard({ entry }: { entry: FeedEntry }) {
  const badge = IMPACT_BADGES[entry.impact];

  return (
    <div className="glass-elevated rounded-lg px-3 py-2.5 border border-white/[0.06] hover:border-white/[0.12] transition-all duration-200">
      <div className="flex items-start gap-2.5">
        {/* Flag */}
        <span className="text-base leading-none mt-0.5 shrink-0">
          {entry.flag}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-200 truncate">
              {entry.country}
            </span>
            <span className="text-[10px] font-mono text-slate-500 shrink-0">
              {entry.timeAgo}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 leading-snug line-clamp-2">
            {entry.title}
          </p>
        </div>
      </div>

      {/* Impact badge */}
      <div className="mt-1.5 flex justify-end">
        <span
          className={`inline-flex items-center gap-1 text-[9px] font-mono font-semibold tracking-wider ${badge.color}`}
        >
          {badge.emoji} {badge.label}
        </span>
      </div>
    </div>
  );
}

// ─── Main Component ───

export default function LiveFeed() {
  const entries = useMemo(() => generateFeedEntries(), []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="text-xs font-semibold font-mono text-slate-200 uppercase tracking-wider">
            Live Regulatory Feed
          </h3>
        </div>
        <span className="text-[10px] font-mono text-slate-500">
          {entries.length} events
        </span>
      </div>

      {/* Scrollable feed */}
      <div
        className="flex-1 overflow-y-auto p-3 space-y-2"
        style={{ maxHeight: "480px" }}
      >
        {entries.map((entry) => (
          <FeedEntryCard key={entry.id} entry={entry} />
        ))}

        {entries.length === 0 && (
          <div className="text-center py-8">
            <p className="text-xs text-slate-500 font-mono">
              No regulatory events
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-white/[0.06]">
        <p className="text-[9px] font-mono text-slate-600 text-center">
          SOURCED FROM {JURISDICTION_DATA.size} JURISDICTION DATABASES
        </p>
      </div>
    </div>
  );
}
