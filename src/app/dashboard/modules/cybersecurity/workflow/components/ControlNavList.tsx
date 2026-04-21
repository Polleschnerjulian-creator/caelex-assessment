"use client";

/**
 * ControlNavList — left pane listing every applicable control,
 * grouped by category, with per-category completion counts.
 *
 * Minimal rows: status dot + article ref + title (truncated). Click
 * snaps the detail panel to that control. Keyboard arrows handled by
 * the shell, not here.
 */

import { useMemo } from "react";
import type { QueueItem } from "@/lib/provenance/workflow-queue";
import { categoryConfig } from "@/data/cybersecurity-requirements";
import type { RequirementCategory } from "@/data/cybersecurity-requirements";

interface ControlNavListProps {
  items: QueueItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const STATUS_DOT: Record<string, string> = {
  compliant: "bg-emerald-500",
  partial: "bg-amber-400",
  non_compliant: "bg-red-500",
  not_assessed: "bg-[var(--text-tertiary)]/30",
};

const SEVERITY_TINT: Record<string, string> = {
  critical: "text-red-500",
  major: "text-amber-500",
  minor: "text-[var(--text-tertiary)]",
};

interface Group {
  key: RequirementCategory;
  label: string;
  items: QueueItem[];
  compliantCount: number;
}

export function ControlNavList({
  items,
  selectedId,
  onSelect,
}: ControlNavListProps) {
  const groups: Group[] = useMemo(() => {
    const byCategory = new Map<RequirementCategory, QueueItem[]>();
    for (const item of items) {
      const cat = item.req.category;
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(item);
    }

    // Preserve categoryConfig order (governance first, eusrn last).
    const orderedKeys = Object.keys(categoryConfig) as RequirementCategory[];
    return orderedKeys
      .filter((k) => byCategory.has(k))
      .map((k) => {
        const groupItems = byCategory.get(k)!;
        return {
          key: k,
          label: categoryConfig[k]?.label ?? k,
          items: groupItems,
          compliantCount: groupItems.filter((i) => i.status === "compliant")
            .length,
        };
      });
  }, [items]);

  return (
    <nav
      aria-label="Controls"
      className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-raised)] overflow-hidden"
    >
      <div className="px-4 pt-4 pb-2">
        <span className="text-[10px] font-semibold tracking-[0.24em] uppercase text-[var(--text-tertiary)]">
          Controls
        </span>
      </div>
      <ul className="pb-2 max-h-[70vh] overflow-y-auto">
        {groups.map((group) => (
          <li key={group.key} className="mb-1">
            <div className="px-4 py-2 flex items-center justify-between text-[11px] text-[var(--text-tertiary)] sticky top-0 bg-[var(--surface-raised)] z-10">
              <span className="font-medium">{group.label}</span>
              <span>
                {group.compliantCount}/{group.items.length}
              </span>
            </div>
            <ul>
              {group.items.map((item) => {
                const isSelected = selectedId === item.req.id;
                return (
                  <li key={item.req.id}>
                    <button
                      onClick={() => onSelect(item.req.id)}
                      className={[
                        "w-full text-left flex items-start gap-2.5 px-4 py-2 transition-colors",
                        isSelected
                          ? "bg-emerald-500/10"
                          : "hover:bg-[var(--fill-soft)]",
                      ].join(" ")}
                    >
                      {/* Status dot */}
                      <span
                        className={[
                          "mt-1.5 w-2 h-2 rounded-full flex-shrink-0",
                          STATUS_DOT[item.status] ?? "bg-slate-400",
                        ].join(" ")}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="text-[10px] text-[var(--text-tertiary)]">
                            {item.req.articleRef}
                          </span>
                          {item.req.severity === "critical" && (
                            <span
                              className={`text-[9px] uppercase tracking-wider ${SEVERITY_TINT[item.req.severity]}`}
                            >
                              Critical
                            </span>
                          )}
                        </span>
                        <span
                          className={[
                            "block text-[13px] leading-snug truncate",
                            isSelected
                              ? "text-[var(--text-primary)] font-medium"
                              : "text-[var(--text-secondary)]",
                          ].join(" ")}
                        >
                          {item.req.title}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default ControlNavList;
