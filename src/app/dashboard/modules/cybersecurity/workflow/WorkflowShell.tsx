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
import type {
  CybersecurityProfile,
  RequirementStatus,
} from "@/data/cybersecurity-requirements";
import type { WorkflowQueue } from "@/lib/provenance/workflow-queue";
import { describeQueueState } from "@/lib/provenance/workflow-queue";
import { ControlNavList } from "./components/ControlNavList";
import { ControlDetailPanel } from "./components/ControlDetailPanel";
import { ShortcutsBar } from "./components/ShortcutsBar";
import type { WorkflowTabKey } from "./components/ControlDetailPanel";

interface WorkflowShellProps {
  queue: WorkflowQueue;
  profile: CybersecurityProfile;
  isSimplified: boolean;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  return (
    <div className="flex flex-col min-h-screen bg-[var(--surface-base)]">
      {/* ─── Quiet editorial header ─── */}
      <header className="max-w-[1200px] w-full mx-auto px-6 pt-8 pb-5">
        <h1 className="text-[28px] font-semibold tracking-tight text-[var(--text-primary)]">
          Cybersecurity
        </h1>
        <p className="mt-1 text-[14px] text-[var(--text-tertiary)]">
          {describeQueueState(queue)}
        </p>
      </header>

      {/* ─── Two-pane body ─── */}
      <div className="flex-1 max-w-[1200px] w-full mx-auto px-6 pb-16">
        <div className="grid grid-cols-[240px_1fr] gap-8 items-start">
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

      {/* ─── Keyboard shortcuts (minimal footer) ─── */}
      <ShortcutsBar
        expanded={showShortcutsHelp}
        onToggle={() => setShowShortcutsHelp((v) => !v)}
      />
    </div>
  );
}

export default WorkflowShell;
