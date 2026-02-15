"use client";

import type { ReportSection, ReportSectionContent } from "@/lib/pdf/types";

/** Safely convert any value to a renderable string */
function str(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function ContentBlock({ block }: { block: ReportSectionContent }) {
  if (!block || typeof block !== "object" || !block.type) return null;

  switch (block.type) {
    case "text":
      return (
        <p className="text-sm text-slate-700 dark:text-white/70 leading-relaxed mb-3">
          {str(block.value)}
        </p>
      );

    case "heading":
      return block.level === 2 ? (
        <h3 className="text-base font-semibold text-slate-900 dark:text-white mt-4 mb-2">
          {str(block.value)}
        </h3>
      ) : (
        <h4 className="text-sm font-medium text-slate-800 dark:text-white/90 mt-3 mb-1.5">
          {str(block.value)}
        </h4>
      );

    case "list":
      return (
        <ul className="space-y-1.5 mb-3 pl-4">
          {(Array.isArray(block.items) ? block.items : []).map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-sm text-slate-700 dark:text-white/70"
            >
              <span className="text-slate-400 dark:text-white/30 mt-0.5 flex-shrink-0">
                {block.ordered ? `${i + 1}.` : "\u2022"}
              </span>
              <span>{str(item)}</span>
            </li>
          ))}
        </ul>
      );

    case "table":
      return (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-white/10 mb-3">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-white/[0.03]">
                {(Array.isArray(block.headers) ? block.headers : []).map(
                  (h, i) => (
                    <th
                      key={i}
                      className="px-3 py-2 text-left font-medium text-slate-600 dark:text-white/50 border-b border-slate-200 dark:border-white/10"
                    >
                      {str(h)}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(block.rows) ? block.rows : []).map((row, ri) => (
                <tr
                  key={ri}
                  className="border-b border-slate-100 dark:border-white/5 last:border-0"
                >
                  {(Array.isArray(row) ? row : []).map((cell, ci) => (
                    <td
                      key={ci}
                      className="px-3 py-2 text-slate-700 dark:text-white/60"
                    >
                      {str(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "keyValue":
      return (
        <div className="space-y-1.5 mb-3">
          {(Array.isArray(block.items) ? block.items : []).map((item, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <span className="font-medium text-slate-700 dark:text-white/70 min-w-[140px]">
                {str(item?.key)}:
              </span>
              <span className="text-slate-600 dark:text-white/50">
                {str(item?.value)}
              </span>
            </div>
          ))}
        </div>
      );

    case "alert":
      return (
        <div
          className={`px-4 py-3 rounded-lg text-sm mb-3 ${
            block.severity === "warning"
              ? "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20"
              : block.severity === "error"
                ? "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20"
                : "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20"
          }`}
        >
          {str(block.message)}
        </div>
      );

    case "divider":
      return <hr className="border-slate-200 dark:border-white/10 my-4" />;

    case "spacer":
      return <div style={{ height: block.height || 10 }} />;

    default:
      return null;
  }
}

export function SectionRenderer({ sections }: { sections: ReportSection[] }) {
  return (
    <div className="space-y-6">
      {sections.map((section, i) => (
        <div key={i}>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3 pb-2 border-b border-slate-200 dark:border-white/10">
            {str(section.title)}
          </h2>
          <div className="pl-1">
            {(Array.isArray(section.content) ? section.content : []).map(
              (block, bi) => (
                <ContentBlock key={bi} block={block} />
              ),
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
