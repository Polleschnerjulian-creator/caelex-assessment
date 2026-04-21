"use client";

/**
 * ControlDetailPanel — right pane. Title line + status picker + 4 tabs.
 * Keeps content narrow/focused: one control, one thing at a time.
 */

import { useMemo } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  FileText,
  MessageSquare,
  ArrowUpRight,
} from "lucide-react";
import type {
  CybersecurityProfile,
  RequirementStatus,
} from "@/data/cybersecurity-requirements";
import type { QueueItem } from "@/lib/provenance/workflow-queue";
import {
  ControlContextWindow,
  CausalBreadcrumb,
} from "@/components/provenance";
import {
  describeApplicabilityReason,
  buildControlContext,
} from "@/lib/provenance/cybersecurity-provenance";
import { StatusPicker } from "./StatusPicker";

export type WorkflowTabKey = "why" | "assess" | "evidence" | "discuss";

interface ControlDetailPanelProps {
  item: QueueItem;
  profile: CybersecurityProfile;
  isSimplified: boolean;
  activeTab: WorkflowTabKey;
  onTabChange: (next: WorkflowTabKey) => void;
  onStatusChange: (
    requirementId: string,
    status: RequirementStatus,
  ) => Promise<void>;
  saving: boolean;
}

const SEVERITY_PILL: Record<string, string> = {
  critical: "text-red-600 dark:text-red-400 border-red-500/30 bg-red-500/5",
  major:
    "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/5",
  minor:
    "text-[var(--text-tertiary)] border-[var(--border-default)] bg-transparent",
};

const TABS: Array<{ key: WorkflowTabKey; label: string; shortcut: string }> = [
  { key: "why", label: "Why", shortcut: "1" },
  { key: "assess", label: "Assess", shortcut: "2" },
  { key: "evidence", label: "Evidence", shortcut: "3" },
  { key: "discuss", label: "Discuss", shortcut: "4" },
];

export function ControlDetailPanel({
  item,
  profile,
  isSimplified,
  activeTab,
  onTabChange,
  onStatusChange,
  saving,
}: ControlDetailPanelProps) {
  const { req, status } = item;

  const reason = useMemo(
    () => describeApplicabilityReason(req, profile, isSimplified),
    [req, profile, isSimplified],
  );

  const context = useMemo(
    () => buildControlContext({ req, reason }),
    [req, reason],
  );

  return (
    <section
      key={req.id /* remount on selection change → re-trigger animations */}
      className="pb-16"
    >
      {/* ── Header — no boxed card, pure text flow ── */}
      <header className="pb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <span className="text-[12px] tracking-wide text-[var(--text-tertiary)]">
                {req.articleRef}
              </span>
              <span
                className={[
                  "text-[10px] uppercase tracking-[0.14em]",
                  req.severity === "critical"
                    ? "text-red-500"
                    : req.severity === "major"
                      ? "text-amber-500"
                      : "text-[var(--text-tertiary)]",
                ].join(" ")}
              >
                {req.severity}
              </span>
            </div>
            <h2 className="mt-1 text-[26px] font-semibold tracking-tight text-[var(--text-primary)] leading-tight">
              {req.title}
            </h2>
            {reason && (
              <div className="mt-2">
                <CausalBreadcrumb
                  origin={reason.origin}
                  reason={reason.summary}
                />
              </div>
            )}
          </div>
          <div className="flex-shrink-0">
            <StatusPicker
              value={status}
              onChange={(next) => onStatusChange(req.id, next)}
              saving={saving}
            />
          </div>
        </div>
      </header>

      {/* ── Tabs — underline only ── */}
      <div
        role="tablist"
        aria-label="Control sections"
        className="flex border-b border-[var(--border-default)]"
      >
        {TABS.map((t) => {
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              onClick={() => onTabChange(t.key)}
              className={[
                "relative py-2.5 mr-6 text-[13px] font-medium transition-colors -mb-px border-b-2",
                active
                  ? "text-[var(--text-primary)] border-emerald-500"
                  : "text-[var(--text-tertiary)] border-transparent hover:text-[var(--text-secondary)]",
              ].join(" ")}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab body ── */}
      <div className="pt-7">
        {activeTab === "why" && (
          <ControlContextWindow context={context} hideTopRule />
        )}
        {activeTab === "assess" && <AssessPlaceholder req={req} />}
        {activeTab === "evidence" && <EvidencePlaceholder req={req} />}
        {activeTab === "discuss" && <DiscussPlaceholder />}
      </div>
    </section>
  );
}

// ─── Temporary tab bodies ─────────────────────────────────────────────
// These are intentionally scaffolded — the "why" tab is the headline
// experience for the Tier-C pilot. The other three bodies are placeholders
// that point to the classic module's full functionality; wiring them
// inline is follow-up work (Phase 10B).

function AssessPlaceholder({ req }: { req: QueueItem["req"] }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-[10px] font-semibold tracking-[0.24em] uppercase text-[var(--text-tertiary)] mb-2">
          Compliance question
        </h3>
        <p className="text-[15px] leading-relaxed text-[var(--text-primary)]">
          {req.complianceQuestion}
        </p>
      </div>
      {req.tips.length > 0 && (
        <div>
          <h3 className="text-[10px] font-semibold tracking-[0.24em] uppercase text-[var(--text-tertiary)] mb-2">
            Tips
          </h3>
          <ul className="space-y-1.5">
            {req.tips.map((tip, i) => (
              <li
                key={i}
                className="text-sm text-[var(--text-secondary)] flex items-start gap-2 leading-relaxed"
              >
                <Sparkles className="w-3 h-3 text-emerald-500 mt-1.5 flex-shrink-0" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <ClassicFallback label="Answer assessment fields" />
    </div>
  );
}

function EvidencePlaceholder({ req }: { req: QueueItem["req"] }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-[10px] font-semibold tracking-[0.24em] uppercase text-[var(--text-tertiary)] mb-2">
          Evidence required
        </h3>
        {req.evidenceRequired.length > 0 ? (
          <ul className="space-y-1.5">
            {req.evidenceRequired.map((e, i) => (
              <li
                key={i}
                className="text-sm text-[var(--text-secondary)] flex items-start gap-2 leading-relaxed"
              >
                <FileText className="w-3 h-3 text-[var(--text-tertiary)] mt-1.5 flex-shrink-0" />
                <span>{e}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--text-tertiary)]">
            No specific evidence required — narrative + status sufficient.
          </p>
        )}
      </div>
      <ClassicFallback label="Upload evidence" />
    </div>
  );
}

function DiscussPlaceholder() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-[10px] font-semibold tracking-[0.24em] uppercase text-[var(--text-tertiary)] mb-2">
          Discuss
        </h3>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-lg">
          ASTRA suggestion, change-log per control, and inline comments will
          live here.
        </p>
      </div>
      <ClassicFallback label="Use ASTRA suggestions" />
    </div>
  );
}

/**
 * Inline link to the classic view when a tab body hasn't been fully
 * ported yet. Unobtrusive — looks like a ghosted button at the bottom
 * of the tab content.
 */
function ClassicFallback({ label }: { label: string }) {
  return (
    <Link
      href="/dashboard/modules/cybersecurity/classic"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] border border-[var(--border-default)] hover:border-[var(--text-tertiary)]/40 rounded-lg transition-colors"
    >
      {label} in classic view
      <ArrowUpRight className="w-3 h-3" />
    </Link>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _ICON_IMPORTS_USED = { ShieldAlert, ShieldCheck };

export default ControlDetailPanel;
