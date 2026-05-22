"use client";

/**
 * OperationLifecyclePanel — Trade light-theme variant (Sprint A3b).
 *
 * Light Indigo port of `src/components/trade/OperationLifecyclePanel.tsx`.
 * Same behaviour: visual pipeline of the TradeOperation status state
 * machine, ALLOWED_TRANSITIONS-aware action buttons, confirmation dialog
 * for high-stakes moves (EXECUTED / BLOCKED / VDISC).
 *
 * Server-side ALLOWED_TRANSITIONS in /api/trade/operations/[id]/route.ts
 * is the source of truth — this UI mirrors it so we don't show buttons
 * that would 400.
 */

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
  type LucideIcon,
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
    icon: LucideIcon;
    textClass: string;
    bgClass: string;
    description: string;
  }
> = {
  DRAFT: {
    label: "Draft",
    icon: Edit3,
    textClass: "text-trade-text-secondary",
    bgClass: "bg-trade-bg-subtle ring-trade-border-subtle",
    description: "Operation is being composed. Add lines and counterparty.",
  },
  AWAITING_CLASSIFICATION: {
    label: "Classification",
    icon: ScanSearch,
    textClass: "text-amber-700",
    bgClass: "bg-amber-50 ring-amber-200",
    description:
      "All lines need classification codes (ECCN/USML/MTCR/AL) before screening.",
  },
  SCREENING: {
    label: "Screening",
    icon: FileSearch,
    textClass: "text-amber-700",
    bgClass: "bg-amber-50 ring-amber-200",
    description:
      "Counterparty sanctions screening must complete CLEAR before license determination.",
  },
  AWAITING_LICENSE: {
    label: "License",
    icon: FileSearch,
    textClass: "text-amber-700",
    bgClass: "bg-amber-50 ring-amber-200",
    description:
      "Each line needs an applied license (or eligibility under an AGG/EUGEA).",
  },
  LICENSED: {
    label: "Licensed",
    icon: ShieldCheck,
    textClass: "text-blue-700",
    bgClass: "bg-blue-50 ring-blue-200",
    description:
      "All lines covered by valid licenses. Ready to execute (ship goods).",
  },
  EXECUTED: {
    label: "Executed",
    icon: Truck,
    textClass: "text-emerald-700",
    bgClass: "bg-emerald-50 ring-emerald-200",
    description:
      "Goods physically shipped. Operation is closed but discoverable in audit.",
  },
  BLOCKED: {
    label: "Blocked",
    icon: XCircle,
    textClass: "text-red-700",
    bgClass: "bg-red-50 ring-red-200",
    description:
      "Sanctions hit, license denied, or operator-blocked. No further shipment.",
  },
  VOLUNTARY_DISCLOSURE_FILED: {
    label: "VDisc Filed",
    icon: AlertTriangle,
    textClass: "text-red-700",
    bgClass: "bg-red-50 ring-red-200",
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
    <section className="rounded-md border border-trade-border-subtle bg-trade-bg-panel">
      <div className="border-b border-trade-border-subtle px-5 py-3">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-trade-text-secondary">
          Lifecycle
        </h2>
        <p className="mt-0.5 text-[11px] text-trade-text-muted">
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
            <div className="h-px w-6 shrink-0 bg-red-200" />
            <PipelineStep status={status} isCurrent isPast={false} isLast />
          </>
        )}
      </div>

      {/* Current state description */}
      <div className="border-t border-trade-border-subtle px-5 py-3">
        <div className="flex items-start gap-3">
          <Icon
            className={`mt-0.5 h-4 w-4 shrink-0 ${meta.textClass}`}
            strokeWidth={1.75}
          />
          <div className="flex-1">
            <div
              className={`text-[12px] font-semibold uppercase tracking-widest ${meta.textClass}`}
            >
              {meta.label}
            </div>
            <p className="mt-1 text-[12px] text-trade-text-secondary">
              {meta.description}
            </p>
          </div>
        </div>
      </div>

      {/* Action buttons (allowed transitions) */}
      {allowed.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-trade-border-subtle px-5 py-3">
          <span className="self-center text-[10px] font-semibold uppercase tracking-[0.14em] text-trade-text-muted">
            Move to:
          </span>
          {allowed.map((target) => {
            const isBlocking =
              target === "BLOCKED" || target === "VOLUNTARY_DISCLOSURE_FILED";
            const targetMeta = STATUS_META[target];
            const buttonClass = isBlocking
              ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
              : target === "EXECUTED"
                ? "border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                : "border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100";
            return (
              <button
                key={target}
                onClick={() => setPendingTransition(target)}
                disabled={submitting}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold transition disabled:opacity-50 ${buttonClass}`}
              >
                {targetMeta.label}
                <ArrowRight className="h-3 w-3" />
              </button>
            );
          })}
        </div>
      )}

      {err && (
        <div className="border-t border-red-200 bg-red-50 px-5 py-2 text-[12px] text-red-700">
          {err}
        </div>
      )}

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

  const stepClass = isCurrent
    ? `${meta.bgClass} ${meta.textClass} ring-1`
    : isPast
      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
      : "bg-trade-bg-subtle text-trade-text-muted ring-1 ring-trade-border-subtle";

  return (
    <>
      <div
        className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 ${stepClass}`}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
        <span className="text-[10px] font-semibold uppercase tracking-widest">
          {meta.label}
        </span>
        {isCurrent && (
          <span
            className={`ml-1 h-1.5 w-1.5 rounded-full ${
              isCurrent ? meta.textClass.replace("text-", "bg-") : ""
            }`}
            style={{
              backgroundColor: "currentColor",
            }}
          />
        )}
      </div>
      {!isLast && (
        <div
          className={`h-px w-4 shrink-0 ${
            isPast ? "bg-emerald-300" : "bg-trade-border-subtle"
          }`}
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

  const confirmClass =
    to === "EXECUTED"
      ? "border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
      : isHighStakes
        ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
        : "border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100";

  return (
    <div className="border-t border-trade-border-subtle bg-trade-bg-subtle p-4">
      <div className="mb-3 text-[12px] text-trade-text-primary">
        Move from <span className={fromMeta.textClass}>{fromMeta.label}</span> →{" "}
        <span className={toMeta.textClass}>{toMeta.label}</span>?
      </div>
      <p className="mb-3 text-[11px] text-trade-text-secondary">
        {toMeta.description}
      </p>
      {isHighStakes && (
        <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
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
          className="rounded-md px-3 py-1.5 text-[11px] text-trade-text-secondary transition hover:text-trade-text-primary"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={submitting}
          className={`rounded-md px-3 py-1.5 text-[11px] font-semibold transition disabled:opacity-50 ${confirmClass}`}
        >
          {submitting ? "Moving…" : `Move to ${toMeta.label}`}
        </button>
      </div>
    </div>
  );
}
