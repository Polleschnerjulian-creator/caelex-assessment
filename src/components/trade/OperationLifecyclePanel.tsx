/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * OperationLifecyclePanel — visual pipeline of the TradeOperation
 * status state-machine plus action buttons for the allowed next
 * transitions.
 *
 * The state-machine itself is enforced server-side by the PATCH
 * endpoint via ALLOWED_TRANSITIONS. This UI mirrors that table so
 * we only show legitimate buttons; the server still validates.
 *
 * Used by /dashboard/trade/operations/[id] (Sprint C3b).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

"use client";

import { useState } from "react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Edit3,
  ScanSearch,
  FileSearch,
  ShieldCheck,
  Truck,
  ArrowRight,
} from "lucide-react";

export type OperationStatus =
  | "DRAFT"
  | "AWAITING_CLASSIFICATION"
  | "SCREENING"
  | "AWAITING_LICENSE"
  | "LICENSED"
  | "EXECUTED"
  | "BLOCKED"
  | "VOLUNTARY_DISCLOSURE_FILED";

/**
 * Mirrors server-side ALLOWED_TRANSITIONS in
 * /api/trade/operations/[id]/route.ts. Keep in sync.
 */
const ALLOWED_TRANSITIONS: Record<OperationStatus, OperationStatus[]> = {
  DRAFT: ["AWAITING_CLASSIFICATION", "BLOCKED"],
  AWAITING_CLASSIFICATION: ["SCREENING", "DRAFT", "BLOCKED"],
  SCREENING: ["AWAITING_LICENSE", "AWAITING_CLASSIFICATION", "BLOCKED"],
  AWAITING_LICENSE: ["LICENSED", "SCREENING", "BLOCKED"],
  LICENSED: ["EXECUTED", "AWAITING_LICENSE", "BLOCKED"],
  EXECUTED: ["BLOCKED"],
  BLOCKED: ["VOLUNTARY_DISCLOSURE_FILED"],
  VOLUNTARY_DISCLOSURE_FILED: [],
};

/**
 * The "happy path" pipeline shown in the visual breadcrumb. BLOCKED
 * + VDISC are off-ramps shown separately. Do not render them in the
 * pipeline.
 */
const PIPELINE: OperationStatus[] = [
  "DRAFT",
  "AWAITING_CLASSIFICATION",
  "SCREENING",
  "AWAITING_LICENSE",
  "LICENSED",
  "EXECUTED",
];

const STATUS_META: Record<
  OperationStatus,
  {
    label: string;
    icon: typeof Clock;
    color: string;
    description: string;
  }
> = {
  DRAFT: {
    label: "Draft",
    icon: Edit3,
    color: "rgba(255,255,255,0.55)",
    description: "Operation is being composed. Add lines and counterparty.",
  },
  AWAITING_CLASSIFICATION: {
    label: "Classification",
    icon: ScanSearch,
    color: "rgb(251,191,36)",
    description:
      "All lines need classification codes (ECCN/USML/MTCR/AL) before screening.",
  },
  SCREENING: {
    label: "Screening",
    icon: FileSearch,
    color: "rgb(251,191,36)",
    description:
      "Counterparty sanctions screening must complete CLEAR before license determination.",
  },
  AWAITING_LICENSE: {
    label: "License",
    icon: FileSearch,
    color: "rgb(251,191,36)",
    description:
      "Each line needs an applied license (or eligibility under an AGG/EUGEA).",
  },
  LICENSED: {
    label: "Licensed",
    icon: ShieldCheck,
    color: "rgb(96,165,250)",
    description:
      "All lines covered by valid licenses. Ready to execute (ship goods).",
  },
  EXECUTED: {
    label: "Executed",
    icon: Truck,
    color: "rgb(52,211,153)",
    description:
      "Goods physically shipped. Operation is closed but discoverable in audit.",
  },
  BLOCKED: {
    label: "Blocked",
    icon: XCircle,
    color: "rgb(248,113,113)",
    description:
      "Sanctions hit, license denied, or operator-blocked. No further shipment.",
  },
  VOLUNTARY_DISCLOSURE_FILED: {
    label: "VDisc Filed",
    icon: AlertTriangle,
    color: "rgb(248,113,113)",
    description:
      "Operator filed voluntary self-disclosure with BAFA/BIS. Final state.",
  },
};

export function OperationLifecyclePanel({
  operationId,
  status,
  onStatusChanged,
}: {
  operationId: string;
  status: OperationStatus;
  onStatusChanged: () => void;
}) {
  const [pendingTransition, setPendingTransition] =
    useState<OperationStatus | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const allowed = ALLOWED_TRANSITIONS[status] ?? [];
  const meta = STATUS_META[status];
  const Icon = meta.icon;

  async function performTransition(target: OperationStatus) {
    setSubmitting(true);
    setErr(null);
    try {
      const res = await fetch(`/api/trade/operations/${operationId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: target }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Failed to transition status");
        return;
      }
      setPendingTransition(null);
      onStatusChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      className="rounded-2xl"
      style={{
        background: "rgba(255,255,255,0.025)",
        boxShadow:
          "inset 0 1px 0 0 rgba(255,255,255,0.06), 0 0 0 0.5px rgba(255,255,255,0.06)",
      }}
    >
      <div
        className="border-b px-5 py-3"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <h2
          className="text-[10px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          Lifecycle
        </h2>
        <p
          className="mt-0.5 text-[11px]"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          State machine enforced server-side. BLOCKED is the only off-ramp
          (requires VOLUNTARY_DISCLOSURE_FILED to fully close).
        </p>
      </div>

      {/* Pipeline visualization */}
      <div className="flex items-center gap-2 overflow-x-auto px-5 py-4">
        {PIPELINE.map((s, i) => (
          <PipelineStep
            key={s}
            status={s}
            isCurrent={s === status}
            isPast={
              PIPELINE.indexOf(status) > i &&
              status !== "BLOCKED" &&
              status !== "VOLUNTARY_DISCLOSURE_FILED"
            }
            isLast={i === PIPELINE.length - 1}
          />
        ))}
        {(status === "BLOCKED" || status === "VOLUNTARY_DISCLOSURE_FILED") && (
          <>
            <div
              className="h-px w-6 shrink-0"
              style={{ background: "rgba(239,68,68,0.40)" }}
            />
            <PipelineStep status={status} isCurrent isPast={false} isLast />
          </>
        )}
      </div>

      {/* Current state description */}
      <div
        className="border-t px-5 py-3"
        style={{ borderColor: "rgba(255,255,255,0.04)" }}
      >
        <div className="flex items-start gap-3">
          <Icon
            className="mt-0.5 h-4 w-4 shrink-0"
            strokeWidth={1.75}
            style={{ color: meta.color }}
          />
          <div className="flex-1">
            <div
              className="text-[12px] font-semibold uppercase tracking-widest"
              style={{ color: meta.color }}
            >
              {meta.label}
            </div>
            <p
              className="mt-1 text-[12px]"
              style={{ color: "rgba(255,255,255,0.65)" }}
            >
              {meta.description}
            </p>
          </div>
        </div>
      </div>

      {/* Action buttons (allowed transitions) */}
      {allowed.length > 0 && (
        <div
          className="flex flex-wrap gap-2 border-t px-5 py-3"
          style={{ borderColor: "rgba(255,255,255,0.04)" }}
        >
          <span
            className="self-center text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            Move to:
          </span>
          {allowed.map((target) => {
            const isBlocking =
              target === "BLOCKED" || target === "VOLUNTARY_DISCLOSURE_FILED";
            const targetMeta = STATUS_META[target];
            return (
              <button
                key={target}
                onClick={() => setPendingTransition(target)}
                disabled={submitting}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold transition-all disabled:opacity-50"
                style={{
                  background: isBlocking
                    ? "rgba(239,68,68,0.10)"
                    : target === "EXECUTED"
                      ? "rgba(16,185,129,0.12)"
                      : "rgba(96,165,250,0.10)",
                  color: targetMeta.color,
                  boxShadow: isBlocking
                    ? "inset 0 0 0 0.5px rgba(239,68,68,0.30)"
                    : target === "EXECUTED"
                      ? "inset 0 0 0 0.5px rgba(16,185,129,0.35)"
                      : "inset 0 0 0 0.5px rgba(96,165,250,0.30)",
                }}
              >
                {targetMeta.label}
                <ArrowRight className="h-3 w-3" />
              </button>
            );
          })}
        </div>
      )}

      {err && (
        <div
          className="border-t px-5 py-2 text-[12px]"
          style={{
            borderColor: "rgba(239,68,68,0.20)",
            background: "rgba(239,68,68,0.08)",
            color: "rgb(248,113,113)",
          }}
        >
          {err}
        </div>
      )}

      {/* Confirmation modal-like inline section */}
      {pendingTransition && (
        <ConfirmTransition
          from={status}
          to={pendingTransition}
          submitting={submitting}
          onConfirm={() => performTransition(pendingTransition)}
          onCancel={() => {
            setPendingTransition(null);
            setErr(null);
          }}
        />
      )}
    </section>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────

function PipelineStep({
  status,
  isCurrent,
  isPast,
  isLast,
}: {
  status: OperationStatus;
  isCurrent: boolean;
  isPast: boolean;
  isLast: boolean;
}) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  // Color logic: current = full color, past = green, future = muted
  const color = isCurrent
    ? meta.color
    : isPast
      ? "rgb(52,211,153)"
      : "rgba(255,255,255,0.25)";
  const bgColor = isCurrent
    ? `${meta.color.replace("rgb", "rgba").replace(")", ", 0.12)")}`
    : isPast
      ? "rgba(16,185,129,0.06)"
      : "rgba(255,255,255,0.025)";

  return (
    <>
      <div
        className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2"
        style={{
          background: bgColor,
          boxShadow: isCurrent
            ? `inset 0 0 0 0.5px ${color.replace("rgb(", "rgba(").replace(")", ", 0.40)")}`
            : "inset 0 0 0 0.5px rgba(255,255,255,0.05)",
        }}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={1.75} style={{ color }} />
        <span
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color }}
        >
          {meta.label}
        </span>
        {isCurrent && (
          <span
            className="ml-1 h-1.5 w-1.5 rounded-full"
            style={{ background: color }}
          />
        )}
      </div>
      {!isLast && (
        <div
          className="h-px w-4 shrink-0"
          style={{
            background: isPast
              ? "rgba(52,211,153,0.40)"
              : "rgba(255,255,255,0.10)",
          }}
        />
      )}
    </>
  );
}

function ConfirmTransition({
  from,
  to,
  submitting,
  onConfirm,
  onCancel,
}: {
  from: OperationStatus;
  to: OperationStatus;
  submitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const fromMeta = STATUS_META[from];
  const toMeta = STATUS_META[to];
  const isHighStakes =
    to === "BLOCKED" ||
    to === "VOLUNTARY_DISCLOSURE_FILED" ||
    to === "EXECUTED";

  return (
    <div
      className="border-t p-4"
      style={{
        borderColor: "rgba(255,255,255,0.06)",
        background: "rgba(0,0,0,0.20)",
      }}
    >
      <div
        className="mb-3 text-[12px]"
        style={{ color: "rgba(255,255,255,0.85)" }}
      >
        Move from{" "}
        <span style={{ color: fromMeta.color }}>{fromMeta.label}</span> →{" "}
        <span style={{ color: toMeta.color }}>{toMeta.label}</span>?
      </div>
      <p
        className="mb-3 text-[11px]"
        style={{ color: "rgba(255,255,255,0.55)" }}
      >
        {toMeta.description}
      </p>
      {isHighStakes && (
        <div
          className="mb-3 rounded-md px-3 py-2 text-[11px]"
          style={{
            background: "rgba(251,191,36,0.08)",
            color: "rgb(251,191,36)",
          }}
        >
          <AlertTriangle className="mr-1.5 inline h-3 w-3" />
          {to === "EXECUTED" &&
            "Confirms goods physically shipped. Auto-sets actualShipDate + closedAt."}
          {to === "BLOCKED" &&
            "Operation is blocked from further movement. Existing lines/licenses stay attached for audit."}
          {to === "VOLUNTARY_DISCLOSURE_FILED" &&
            "Final state. Indicates operator filed voluntary self-disclosure with BAFA/BIS regarding past non-compliance on this operation."}
        </div>
      )}
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          disabled={submitting}
          className="rounded-md px-3 py-1.5 text-[11px]"
          style={{ color: "rgba(255,255,255,0.6)" }}
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={submitting}
          className="rounded-md px-3 py-1.5 text-[11px] font-semibold transition-all disabled:opacity-50"
          style={{
            background: isHighStakes
              ? to === "EXECUTED"
                ? "rgba(16,185,129,0.18)"
                : "rgba(239,68,68,0.18)"
              : "rgba(96,165,250,0.18)",
            color: isHighStakes
              ? to === "EXECUTED"
                ? "rgb(52,211,153)"
                : "rgb(248,113,113)"
              : "rgb(96,165,250)",
            boxShadow: isHighStakes
              ? to === "EXECUTED"
                ? "inset 0 0 0 0.5px rgba(16,185,129,0.4)"
                : "inset 0 0 0 0.5px rgba(239,68,68,0.4)"
              : "inset 0 0 0 0.5px rgba(96,165,250,0.4)",
          }}
        >
          {submitting ? "Moving…" : `Move to ${toMeta.label}`}
        </button>
      </div>
    </div>
  );
}
