"use client";

import { useMemo } from "react";
import { JURISDICTION_DATA } from "@/data/national-space-laws";

// ─── Types ───

interface FeedEntry {
  id: string;
  code: string;
  country: string;
  text: string;
  type: "new" | "update" | "gap";
  date: string; // "2025-06" etc
}

// ─── Generate entries from real data ───

function generateEntries(): FeedEntry[] {
  const entries: FeedEntry[] = [];

  JURISDICTION_DATA.forEach((law) => {
    const code = law.countryCode;

    if (
      law.legislation.status === "enacted" &&
      law.legislation.yearEnacted >= 2024
    ) {
      entries.push({
        id: `${code}-new`,
        code,
        country: law.countryName,
        text: law.legislation.name,
        type: "new",
        date: law.lastUpdated,
      });
    } else if (law.legislation.status === "none") {
      entries.push({
        id: `${code}-gap`,
        code,
        country: law.countryName,
        text: "No comprehensive space law",
        type: "gap",
        date: law.lastUpdated,
      });
    } else if (law.legislation.status === "enacted") {
      entries.push({
        id: `${code}-active`,
        code,
        country: law.countryName,
        text: `${law.legislation.name} (${law.legislation.yearEnacted})`,
        type: "update",
        date: law.lastUpdated,
      });
    }
  });

  entries.sort((a, b) => {
    const typeOrder = { new: 0, gap: 1, update: 2 };
    return (typeOrder[a.type] ?? 3) - (typeOrder[b.type] ?? 3);
  });

  return entries.slice(0, 12);
}

// ─── Component ───

const TYPE_DOT: Record<string, string> = {
  new: "bg-emerald-500",
  update: "bg-gray-300",
  gap: "bg-amber-400",
};

export default function LiveFeed() {
  const entries = useMemo(() => generateEntries(), []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-1.5">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="flex items-center gap-2.5 py-1.5 group cursor-default"
        >
          <span
            className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${TYPE_DOT[entry.type]}`}
          />
          <span className="text-[12px]  font-medium text-[var(--atlas-text-faint)] w-5 flex-shrink-0">
            {entry.code}
          </span>
          <span className="text-[12px] text-[var(--atlas-text-secondary)] truncate group-hover:text-[var(--atlas-text-primary)] transition-colors">
            {entry.text}
          </span>
        </div>
      ))}
    </div>
  );
}
