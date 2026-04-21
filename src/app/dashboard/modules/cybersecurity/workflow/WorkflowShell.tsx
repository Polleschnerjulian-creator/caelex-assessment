"use client";

/**
 * WorkflowShell — top-level layout for the Tier-C orchestrated view.
 *
 * Structure:
 *   ┌──────────────── Header band: ProgressStrip ────────────────┐
 *   │ Today's Focus (collapsible hero) when there's work open    │
 *   ├────────────────┬─────────────────────────────────────────┤
 *   │ ControlNavList │ ControlDetailPanel (Why/Assess/Evidence/  │
 *   │  (260–320px)   │  Discuss tabs)                            │
 *   ├────────────────┴─────────────────────────────────────────┤
 *   │ ShortcutsBar footer: j/k/s/1-4/?                           │
 *   └───────────────────────────────────────────────────────────┘
 *
 * Keyboard-first. URL-less routing via local state so focus doesn't
 * jump during typing.
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type {
  CybersecurityProfile,
  RequirementStatus,
} from "@/data/cybersecurity-requirements";
import type { WorkflowQueue } from "@/lib/provenance/workflow-queue";
import { describeQueueState } from "@/lib/provenance/workflow-queue";
import { ModuleWhySidebar } from "@/components/provenance";
import { describeModuleScope } from "@/lib/provenance/cybersecurity-provenance";
import { ProgressStrip } from "./components/ProgressStrip";
import { TodaysFocus } from "./components/TodaysFocus";
import { ControlNavList } from "./components/ControlNavList";
import { ControlDetailPanel } from "./components/ControlDetailPanel";
import { ShortcutsBar } from "./components/ShortcutsBar";
import type { WorkflowTabKey } from "./components/ControlDetailPanel";

interface WorkflowShellProps {
  queue: WorkflowQueue;
  profile: CybersecurityProfile;
  isSimplified: boolean;
  totalCatalogueSize: number;
  onStatusChange: (
    requirementId: string,
    status: RequirementStatus,
  ) => Promise<void>;
  savingId: string | null;
}

export function WorkflowShell({
  queue,
  profile,
  isSimplified,
  totalCatalogueSize,
  onStatusChange,
  savingId,
}: WorkflowShellProps) {
  // Default selection: first item of focus queue, or first item overall.
  const initialId = queue.focus[0]?.req.id ?? queue.all[0]?.req.id ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(initialId);
  const [activeTab, setActiveTab] = useState<WorkflowTabKey>("why");
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  const selectedItem =
    queue.all.find((i) => i.req.id === selectedId) ?? queue.all[0] ?? null;

  // Reset to "why" whenever selection changes.
  const selectControl = useCallback((id: string) => {
    setSelectedId(id);
    setActiveTab("why");
  }, []);

  // Keyboard nav: build ordered id list once per queue.
  const orderedIds = useMemo(() => queue.all.map((i) => i.req.id), [queue.all]);

  const move = useCallback(
    (delta: number) => {
      if (!selectedId) return;
      const idx = orderedIds.indexOf(selectedId);
      const next = idx === -1 ? 0 : idx + delta;
      const clamped = Math.max(0, Math.min(orderedIds.length - 1, next));
      selectControl(orderedIds[clamped]);
    },
    [orderedIds, selectedId, selectControl],
  );

  // Global keyboard handler.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Skip when user is typing into an input or textarea.
      const tag = (e.target as HTMLElement)?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case "j":
        case "J":
          e.preventDefault();
          move(1);
          break;
        case "k":
        case "K":
          e.preventDefault();
          move(-1);
          break;
        case "1":
          setActiveTab("why");
          break;
        case "2":
          setActiveTab("assess");
          break;
        case "3":
          setActiveTab("evidence");
          break;
        case "4":
          setActiveTab("discuss");
          break;
        case "?":
          e.preventDefault();
          setShowShortcutsHelp((v) => !v);
          break;
        case "Escape":
          setShowShortcutsHelp(false);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move]);

  const scope = describeModuleScope({
    profile,
    isSimplified,
    applicableCount: queue.counts.total,
    totalCount: totalCatalogueSize,
  });

  return (
    <div className="flex flex-col min-h-screen bg-[var(--surface-base)]">
      {/* ─── Top strip ─── */}
      <div className="border-b border-[var(--border-default)] bg-[var(--surface-raised)]">
        <div className="max-w-[1400px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href="/dashboard/modules/cybersecurity"
                className="p-1.5 rounded hover:bg-[var(--fill-soft)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                aria-label="Back to classic view"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <h1 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
                Cybersecurity
              </h1>
              <span className="text-xs text-[var(--text-tertiary)]">
                {describeQueueState(queue)}
              </span>
            </div>
          </div>

          <ProgressStrip counts={queue.counts} />
        </div>
      </div>

      {/* ─── Today's Focus (only if there's work to do) ─── */}
      {queue.focus.length > 0 && (
        <div className="border-b border-[var(--border-default)] bg-[var(--surface-sunken)]">
          <div className="max-w-[1400px] mx-auto px-6 py-5">
            <TodaysFocus
              focus={queue.focus}
              blockedCount={queue.blocked.length}
              hours={queue.estimatedHoursToday}
              onSelect={selectControl}
              selectedId={selectedId}
            />
          </div>
        </div>
      )}

      {/* ─── Two-pane body ─── */}
      <div className="flex-1 max-w-[1400px] w-full mx-auto px-6 py-6">
        <div className="mb-4">
          <ModuleWhySidebar
            scope={scope}
            editHref="/dashboard/settings?tab=profile"
          />
        </div>

        <div className="grid grid-cols-[280px_1fr] gap-6 items-start">
          <aside className="sticky top-4">
            <ControlNavList
              items={queue.all}
              selectedId={selectedId}
              onSelect={selectControl}
            />
          </aside>
          <main className="min-w-0">
            {selectedItem ? (
              <ControlDetailPanel
                item={selectedItem}
                profile={profile}
                isSimplified={isSimplified}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onStatusChange={onStatusChange}
                saving={savingId === selectedItem.req.id}
              />
            ) : (
              <div className="rounded-2xl border border-[var(--border-default)] p-12 text-center text-sm text-[var(--text-tertiary)]">
                No controls to display.
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ─── Shortcuts footer ─── */}
      <ShortcutsBar
        expanded={showShortcutsHelp}
        onToggle={() => setShowShortcutsHelp((v) => !v)}
      />
    </div>
  );
}

export default WorkflowShell;
