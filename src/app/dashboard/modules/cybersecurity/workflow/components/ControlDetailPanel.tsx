"use client";

/**
 * ControlDetailPanel — the right pane of the Cybersecurity workflow
 * module, now rendered through the new TransparencyPanel shell per
 * the implementation brief (Part 3).
 *
 * Structure:
 *   Header   — AIBadge · article ref subtitle · status flag · ⋮ · reset · ✕
 *   Title    — control title + "applies because…" breadcrumb
 *   Body     — numbered sections 1–7 (phase 2 ships the "Why" section
 *              with real content; other sections ship as styled
 *              placeholders that Phases 3–10 will fill in)
 *   Footer   — model · regs synced · Flag · Export
 *
 * Keeps the StatusPicker in the header area so the operator can change
 * compliance status without leaving the panel.
 */

import { useMemo } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type {
  CybersecurityProfile,
  RequirementStatus,
} from "@/data/cybersecurity-requirements";
import type { QueueItem } from "@/lib/provenance/workflow-queue";
import { ControlContextWindow } from "@/components/provenance";
import {
  describeApplicabilityReason,
  buildControlContext,
} from "@/lib/provenance/cybersecurity-provenance";
import {
  TransparencyPanel,
  PanelSection,
} from "@/components/transparency/Panel";
import { usePanelWidth } from "@/lib/transparency/use-panel-width";
import { StatusPicker } from "./StatusPicker";

// Kept (as legacy) for the WorkflowShell tab wiring — unused in the
// new panel but the shell's state type still references it.
export type WorkflowTabKey = "why" | "assess" | "evidence" | "discuss";

interface ControlDetailPanelProps {
  item: QueueItem;
  profile: CybersecurityProfile;
  isSimplified: boolean;
  // Kept in the prop shape for backward-compat with WorkflowShell;
  // the new panel doesn't use tabs, but removing them from the shell
  // is a follow-up.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  activeTab: WorkflowTabKey;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onTabChange: (next: WorkflowTabKey) => void;
  onStatusChange: (
    requirementId: string,
    status: RequirementStatus,
  ) => Promise<void>;
  saving: boolean;
}

export function ControlDetailPanel({
  item,
  profile,
  isSimplified,
  onStatusChange,
  saving,
}: ControlDetailPanelProps) {
  const { req, status } = item;
  const { width, startDrag, reset } = usePanelWidth();

  const reason = useMemo(
    () => describeApplicabilityReason(req, profile, isSimplified),
    [req, profile, isSimplified],
  );

  const context = useMemo(
    () => buildControlContext({ req, reason }),
    [req, reason],
  );

  return (
    <TransparencyPanel
      key={req.id} /* remount on selection change so animations re-trigger */
      width={width}
      onResizeStart={startDrag}
      onResizeReset={reset}
      header={{
        compactTitle: req.title,
        subtitle: req.articleRef,
        aiModel: "claude-sonnet-4-6",
        aiCutoff: "2024-10",
      }}
      title={req.title}
      interpretation={reason?.summary}
      footer={{
        model: "claude-sonnet-4-6",
        regsSynced: "Apr 20 2026",
        onFlag: () => {
          /* wired in Phase 9 */
        },
        onExport: () => {
          /* wired in Phase 9 */
        },
      }}
    >
      {/* Status picker lives at the top of the body — not the footer,
          because it's the operator's primary state-changing action. */}
      <div className="pb-2 flex items-center justify-between gap-3">
        <span className="tp-text-xs text-[--n-9] uppercase tracking-[0.12em]">
          Compliance status
        </span>
        <StatusPicker
          value={status}
          onChange={(next) => onStatusChange(req.id, next)}
          saving={saving}
        />
      </div>

      {/* ── 01 Why this question ──────────────────────────────────── */}
      <PanelSection number={1} label="Why this question">
        <ControlContextWindow context={context} hideTopRule />
      </PanelSection>

      {/* ── 02 Regulatory chain ───────────────────────────────────── */}
      <PanelSection number={2} label="Regulatory chain">
        <PlaceholderSection
          phase="Phase 3"
          blurb="Horizontal mini-graph: Operator → Ontology → Law → Article → Question. Each node clickable, keyboard-walkable with ← → arrows."
        />
      </PanelSection>

      {/* ── 03 Ontology fragment ──────────────────────────────────── */}
      <PanelSection
        number={3}
        label="Ontology fragment"
        collapsible
        defaultOpen={false}
      >
        <PlaceholderSection
          phase="Phase 5"
          blurb="React Flow subgraph — 20–50 node neighbourhood of this control. Legend toggles semantic overlays (jurisdiction / regulation type / status)."
        />
      </PanelSection>

      {/* ── 04 Reasoning steps ────────────────────────────────────── */}
      <PanelSection
        number={4}
        label="Reasoning steps"
        collapsible
        defaultOpen={false}
      >
        <PlaceholderSection
          phase="Phase 6"
          blurb="Numbered vertical stack — curated ontology-hop steps, not raw LLM chain-of-thought. Each step: inputs · tool · output · citation."
        />
      </PanelSection>

      {/* ── 05 Sources ─────────────────────────────────────────────── */}
      <PanelSection number={5} label="Sources">
        <PlaceholderSection
          phase="Phase 3"
          blurb="Numbered citations with KeyCite-style status flags, regime badges, one-line excerpt in quote style, Open source / Copy citation affordances."
        />
      </PanelSection>

      {/* ── 06 Confidence ─────────────────────────────────────────── */}
      <PanelSection number={6} label="Confidence">
        <PlaceholderSection
          phase="Phase 3"
          blurb="Three-part qualitative indicator: Retrieval · Interpretation · Applicability. Plus explicit 'Not covered' coverage disclosure."
        />
      </PanelSection>

      {/* ── 07 Related questions ──────────────────────────────────── */}
      <PanelSection
        number={7}
        label="Related questions"
        collapsible
        defaultOpen={false}
      >
        <PlaceholderSection
          phase="Phase 3"
          blurb="Up to 3 related items with status dot + question text + article ID. Click navigates selection."
        />
      </PanelSection>

      {/* Classic-view fallback while the full sections are WIP */}
      <div className="pt-6 border-t border-[--n-6]">
        <Link
          href="/dashboard/modules/cybersecurity/classic"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[--tp-radius-sm] tp-text-xs text-[--n-9] hover:text-[--n-11] border border-[--n-6] hover:border-[--n-7] transition-colors duration-[--tp-dur-fast] ease-[--tp-ease-hover]"
        >
          Answer assessment fields in classic view
          <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>
    </TransparencyPanel>
  );
}

// ─── Placeholder for sections that will land in later phases ──────────

function PlaceholderSection({
  phase,
  blurb,
}: {
  phase: string;
  blurb: string;
}) {
  return (
    <div className="rounded-[--tp-radius-md] border border-[--n-6] bg-[--n-3] px-3 py-2.5">
      <p className="tp-mono-xs text-[--trust-11] mb-1">{phase}</p>
      <p className="tp-text-sm text-[--n-11] leading-relaxed">{blurb}</p>
    </div>
  );
}

export default ControlDetailPanel;
