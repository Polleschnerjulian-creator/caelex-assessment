"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import type {
  ChangelogEntry,
  ChangelogProduct,
} from "@/content/changelog/entries";

// Distinct, muted light-mode tint per product so a scanning reader can
// attribute a week's work at a glance without the pills shouting.
const PRODUCT_BADGE_CLASSES: Record<ChangelogProduct, string> = {
  Atlas: "bg-slate-50 text-slate-700 border border-slate-200",
  Comply: "bg-blue-50 text-blue-700 border border-blue-200",
  Passage: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  Scholar: "bg-violet-50 text-violet-700 border border-violet-200",
  Academy: "bg-amber-50 text-amber-700 border border-amber-200",
  Platform: "bg-gray-50 text-gray-600 border border-gray-200",
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Format "2026-06-01" → "June 1, 2026" without going through Date, so the
// output is deterministic across server/client timezones (no hydration drift).
function formatEntryDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day || month < 1 || month > 12) return isoDate;
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

// "2026-W23" → "W23"
function weekLabel(week: string): string {
  return week.split("-")[1] ?? week;
}

interface ChangelogTimelineProps {
  entries: ChangelogEntry[];
}

export function ChangelogTimeline({ entries }: ChangelogTimelineProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <div ref={ref} className="relative">
      {/* Timeline rail */}
      <div
        className="absolute left-[7px] top-3 bottom-3 w-[2px] bg-[#E5E7EB]"
        aria-hidden="true"
      />

      <div className="space-y-8">
        {entries.map((entry, index) => {
          // Entries arrive newest-first; the latest (or explicitly featured)
          // week gets the solid emerald dot.
          const isLead = Boolean(entry.featured) || index === 0;

          return (
            <motion.article
              key={entry.week}
              initial={false}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.05 + index * 0.06 }}
              className="relative pl-10"
            >
              {/* Timeline dot */}
              {isLead ? (
                <div
                  className="absolute left-0 top-7 w-4 h-4 rounded-full bg-emerald-500"
                  aria-hidden="true"
                />
              ) : (
                <div
                  className="absolute left-0 top-7 w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center"
                  aria-hidden="true"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                </div>
              )}

              {/* Entry card */}
              <div className="p-6 md:p-8 rounded-2xl bg-white border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-[#D1D5DB] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all">
                {/* Meta row: date + week badge, product pills */}
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <time
                      dateTime={entry.date}
                      className="text-small text-[#4B5563]"
                    >
                      {formatEntryDate(entry.date)}
                    </time>
                    <span className="text-micro font-medium tracking-wider text-[#9CA3AF] bg-[#F1F3F5] rounded px-1.5 py-0.5">
                      {weekLabel(entry.week)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {entry.products.map((product) => (
                      <span
                        key={product}
                        className={`rounded-full px-2.5 py-0.5 text-caption font-medium ${PRODUCT_BADGE_CLASSES[product]}`}
                      >
                        {product}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <h2 className="text-title font-medium text-[#111827] mb-2">
                  {entry.title}
                </h2>

                {/* Summary */}
                <p className="text-body text-[#4B5563] leading-relaxed mb-4">
                  {entry.summary}
                </p>

                {/* Highlights */}
                <ul className="space-y-1.5">
                  {entry.highlights.map((highlight) => (
                    <li
                      key={highlight}
                      className="flex items-start gap-2 text-body text-[#374151]"
                    >
                      <span
                        className="text-emerald-500 mt-px"
                        aria-hidden="true"
                      >
                        •
                      </span>
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.article>
          );
        })}
      </div>
    </div>
  );
}
