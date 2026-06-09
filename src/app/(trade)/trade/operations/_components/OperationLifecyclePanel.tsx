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
import {
  OperationStepper,
  happyPathNext,
  nextActionLabel,
  type OperationStatus,
} from "./OperationStepper";
import { ExplainedPanel } from "@/components/trade/ExplainedPanel";
import type { ExplainedResult } from "@/lib/comply-v2/trade/explained-result";

// Re-export so existing imports `import { OperationStatus } from "./OperationLifecyclePanel"`
// keep working without ripple changes elsewhere in the tree.
export type { OperationStatus };

/**
 * Shape of one unresolved pre-ship precondition reason returned by the
 * server gate (mirror of ShipGateReason in
 * `src/lib/trade/ship-gate-precondition.server.ts`). UI-only mirror — the
 * server is the source of truth.
 */
interface ShipGateReason {
  code: string;
  message: string;
  severity: "BLOCKING" | "GAP";
  lineId?: string;
  itemName?: string;
}

/** The 409 body the gate returns when LICENSED → EXECUTED is refused. */
interface ShipGateBlock {
  reasons: ShipGateReason[];
  overridable: boolean;
  /**
   * The FULL ExplainedResult envelope (WHAT/WHY/WHEREFORE/CONFIDENCE/SOURCE/
   * OVERRIDE) the server gate returned. Rendered through <ExplainedPanel>,
   * which withholds an incomplete envelope — so the withhold-on-incomplete
   * guarantee applies at the ship moment too. Typed loosely as the value is
   * an opaque server payload; <ExplainedPanel> re-validates it via isExplained.
   */
  explained?: ExplainedResult<unknown>;
}

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
    textClass: "text-trade-accent-warn",
    bgClass: "trade-chip-warn",
    description:
      "All lines need classification codes (ECCN/USML/MTCR/AL) before screening.",
  },
  SCREENING: {
    label: "Screening",
    icon: FileSearch,
    textClass: "text-trade-accent-warn",
    bgClass: "trade-chip-warn",
    description:
      "Counterparty sanctions screening must complete CLEAR before license determination.",
  },
  AWAITING_LICENSE: {
    label: "License",
    icon: FileSearch,
    textClass: "text-trade-accent-warn",
    bgClass: "trade-chip-warn",
    description:
      "Each line needs an applied license (or eligibility under an AGG/EUGEA).",
  },
  LICENSED: {
    label: "Licensed",
    icon: ShieldCheck,
    textClass: "text-trade-link",
    bgClass: "trade-chip-info",
    description:
      "All lines covered by valid licenses. Ready to execute (ship goods).",
  },
  EXECUTED: {
    label: "Executed",
    icon: Truck,
    textClass: "text-trade-accent-success",
    bgClass: "trade-chip-success",
    description:
      "Goods physically shipped. Operation is closed but discoverable in audit.",
  },
  BLOCKED: {
    label: "Blocked",
    icon: XCircle,
    textClass: "text-trade-accent-danger",
    bgClass: "trade-chip-danger",
    description:
      "Sanctions hit, license denied, or operator-blocked. No further shipment.",
  },
  VOLUNTARY_DISCLOSURE_FILED: {
    label: "VDisc Filed",
    icon: AlertTriangle,
    textClass: "text-trade-accent-danger",
    bgClass: "trade-chip-danger",
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
  // Pre-ship gate (fix G1): when LICENSED → EXECUTED is refused 409, the
  // server returns the SPECIFIC unresolved reasons. We hold them here so the
  // confirm dialog can surface them and (for GAP-level outcomes) collect a
  // conscious, logged override justification before re-submitting.
  const [shipGateBlock, setShipGateBlock] = useState<ShipGateBlock | null>(
    null,
  );

  const allowed = ALLOWED_TRANSITIONS[status] ?? [];
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  // Promote ONE allowed transition to the primary CTA — the "happy
  // path" forward step. Demote the rest to a secondary row so the
  // user always sees a single obvious next move instead of a wall
  // of buttons of equal weight.
  const happyNext = happyPathNext(status);
  const primaryNext: OperationStatus | null =
    happyNext && allowed.includes(happyNext) ? happyNext : null;
  const secondaryActions = allowed.filter((t) => t !== primaryNext);
  const [showSecondary, setShowSecondary] = useState(false);

  async function performTransition(
    target: OperationStatus,
    shipGateOverride?: { justification: string },
  ) {
    setSubmitting(true);
    setErr(null);
    try {
      const res = await fetch(`/api/trade/operations/${operationId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status: target,
          ...(shipGateOverride ? { shipGateOverride } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Pre-ship gate refusal: surface the specific reasons in the dialog
        // instead of a bare error string. SHIP_GATE_BLOCKED is a hard block
        // (no override); SHIP_GATE_UNRESOLVED offers a logged-override path.
        if (
          res.status === 409 &&
          (data.code === "SHIP_GATE_UNRESOLVED" ||
            data.code === "SHIP_GATE_BLOCKED") &&
          Array.isArray(data.reasons)
        ) {
          setShipGateBlock({
            reasons: data.reasons,
            overridable: Boolean(data.overridable),
            explained: data.explained,
          });
          setErr(null);
          return;
        }
        setErr(data.error ?? "Failed to transition status");
        return;
      }
      setPendingTransition(null);
      setShipGateBlock(null);
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

      {/* Pipeline visualization — proper horizontal stepper (U-HIGH-6) */}
      <div className="px-5 py-4">
        <OperationStepper status={status} />
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

      {/* Action area — primary "Next" CTA + collapsed secondary actions.
          Single recommended path beats a wall-of-buttons for daily ops; the
          full "Move to" row is one click away under "More actions". */}
      {allowed.length > 0 && (
        <div className="border-t border-trade-border-subtle px-5 py-3">
          {primaryNext ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-trade-text-muted">
                Next
              </span>
              <button
                onClick={() => setPendingTransition(primaryNext)}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-md bg-trade-accent px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-trade-accent-strong disabled:opacity-50"
              >
                {nextActionLabel(primaryNext)}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              {secondaryActions.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowSecondary((v) => !v)}
                  aria-expanded={showSecondary}
                  aria-controls="lifecycle-secondary-actions"
                  className="ml-auto text-[11px] text-trade-text-secondary underline-offset-2 transition hover:text-trade-text-primary hover:underline"
                >
                  {showSecondary ? "Hide" : "More actions"}
                  {showSecondary ? " ↑" : ` (${secondaryActions.length}) ↓`}
                </button>
              )}
            </div>
          ) : (
            // No happy-path forward — surface all allowed actions equally
            // (e.g. EXECUTED with only "BLOCKED" available).
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-trade-text-muted">
                Available
              </span>
              {secondaryActions.map((target) => (
                <TransitionButton
                  key={target}
                  target={target}
                  onClick={() => setPendingTransition(target)}
                  submitting={submitting}
                />
              ))}
            </div>
          )}

          {/* Secondary action drawer — visible after toggle. Kept inside
              the panel chrome to preserve the disclosure visual model. */}
          {primaryNext && showSecondary && secondaryActions.length > 0 ? (
            <div
              id="lifecycle-secondary-actions"
              className="mt-3 flex flex-wrap gap-2 border-t border-dashed border-trade-border-subtle pt-3"
            >
              {secondaryActions.map((target) => (
                <TransitionButton
                  key={target}
                  target={target}
                  onClick={() => setPendingTransition(target)}
                  submitting={submitting}
                />
              ))}
            </div>
          ) : null}
        </div>
      )}

      {err && (
        <div className="trade-chip-danger border-t px-5 py-2 text-[12px]">
          {err}
        </div>
      )}

      {pendingTransition && (
        <ConfirmTransition
          from={status}
          to={pendingTransition}
          submitting={submitting}
          shipGateBlock={shipGateBlock}
          onConfirm={(override) =>
            performTransition(pendingTransition, override)
          }
          onCancel={() => {
            setPendingTransition(null);
            setShipGateBlock(null);
            setErr(null);
          }}
        />
      )}
    </section>
  );
}

/**
 * Renders one transition action button with hue-by-target styling.
 * Extracted so both the "primary next" path and the "more actions"
 * disclosure use the same visual + interaction.
 */
function TransitionButton({
  target,
  onClick,
  submitting,
}: {
  target: OperationStatus;
  onClick: () => void;
  submitting: boolean;
}) {
  const isBlocking =
    target === "BLOCKED" || target === "VOLUNTARY_DISCLOSURE_FILED";
  const targetMeta = STATUS_META[target];
  const buttonClass = isBlocking
    ? "trade-chip-danger border"
    : target === "EXECUTED"
      ? "trade-chip-success border"
      : "trade-chip-info border";
  return (
    <button
      onClick={onClick}
      disabled={submitting}
      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold transition disabled:opacity-50 ${buttonClass}`}
    >
      {targetMeta.label}
      <ArrowRight className="h-3 w-3" aria-hidden="true" />
    </button>
  );
}

/** Minimum justification length — mirrors the server Zod `.min(10)`. */
const MIN_OVERRIDE_JUSTIFICATION = 10;

function ConfirmTransition({
  from,
  to,
  submitting,
  shipGateBlock,
  onConfirm,
  onCancel,
}: {
  from: OperationStatus;
  to: OperationStatus;
  submitting: boolean;
  shipGateBlock: ShipGateBlock | null;
  onConfirm: (override?: { justification: string }) => void;
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
      ? "trade-chip-success border"
      : isHighStakes
        ? "trade-chip-danger border"
        : "trade-chip-info border";

  const [justification, setJustification] = useState("");
  const hasGate = Boolean(shipGateBlock);
  const hardBlocked = Boolean(shipGateBlock && !shipGateBlock.overridable);
  const overridable = Boolean(shipGateBlock && shipGateBlock.overridable);
  const justificationValid =
    justification.trim().length >= MIN_OVERRIDE_JUSTIFICATION;

  // Confirm is disabled while submitting, and — when a GAP-level gate is
  // showing — until a sufficient justification is entered. A hard block can
  // never be confirmed at all.
  const confirmDisabled =
    submitting || hardBlocked || (overridable && !justificationValid);

  function handleConfirm() {
    if (overridable) {
      onConfirm({ justification: justification.trim() });
    } else if (!hasGate) {
      onConfirm();
    }
  }

  return (
    <div className="border-t border-trade-border-subtle bg-trade-bg-subtle p-4">
      <div className="mb-3 text-[12px] text-trade-text-primary">
        Move from <span className={fromMeta.textClass}>{fromMeta.label}</span> →{" "}
        <span className={toMeta.textClass}>{toMeta.label}</span>?
      </div>
      <p className="mb-3 text-[11px] text-trade-text-secondary">
        {toMeta.description}
      </p>
      {isHighStakes && !hasGate && (
        <div className="trade-chip-warn mb-3 rounded-md border px-3 py-2 text-[11px]">
          <AlertTriangle className="mr-1.5 inline h-3 w-3" />
          {to === "EXECUTED" &&
            "Confirms goods physically shipped. Auto-sets actualShipDate + closedAt."}
          {to === "BLOCKED" &&
            "Operation is blocked from further movement. Existing lines/licenses stay attached for audit."}
          {to === "VOLUNTARY_DISCLOSURE_FILED" &&
            "Final state. Indicates operator filed voluntary self-disclosure with BAFA/BIS regarding past non-compliance on this operation."}
        </div>
      )}

      {/* Pre-ship precondition gate (fix G1): the server re-ran the
          conservative assessment and refused this LICENSED → EXECUTED move.
          Surface the SPECIFIC unresolved reasons; a hard block cannot be
          overridden, a GAP-level block needs a conscious, logged
          justification recorded against the named human. */}
      {hasGate && shipGateBlock && (
        <div className="mb-3 space-y-3">
          {/* The FULL Explanation Envelope (WHAT/WHY/WHEREFORE/CONFIDENCE/
              SOURCE/OVERRIDE) the server gate returned, rendered through the
              SAME <ExplainedPanel> enforcement boundary used elsewhere. If the
              envelope is incomplete the panel withholds the verdict — so the
              withhold-on-incomplete guarantee now applies at the ship moment.
              A hard block surfaces an un-collapsible red banner. */}
          {shipGateBlock.explained ? (
            <ExplainedPanel
              result={shipGateBlock.explained}
              kind="Versand-Vorprüfung"
              hardBanner={
                hardBlocked
                  ? "Versand gesperrt — EXECUTED ist nicht möglich (harte Sperre)."
                  : undefined
              }
              defaultOpen
            />
          ) : null}

          {/* Structured per-reason list — machine codes + per-line severity +
              the affected item name. Complements the envelope's prose WHY with
              the exact, itemised unresolved preconditions for the operator. */}
          <div
            className={`rounded-md border px-3 py-2.5 ${
              hardBlocked ? "trade-chip-danger" : "trade-chip-warn"
            }`}
          >
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide">
              <AlertTriangle className="h-3.5 w-3.5" />
              {hardBlocked
                ? "Versand gesperrt — EXECUTED nicht möglich"
                : "Offene Versand-Voraussetzungen"}
            </div>
            <ul className="space-y-1.5">
              {shipGateBlock.reasons.map((r, i) => (
                <li
                  key={`${r.code}-${r.lineId ?? i}`}
                  className="flex items-start gap-1.5 text-[11px] text-trade-text-primary"
                >
                  <span
                    className={`mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                      r.severity === "BLOCKING"
                        ? "bg-trade-accent-danger"
                        : "bg-trade-accent-warn"
                    }`}
                    aria-hidden="true"
                  />
                  <span>
                    {r.itemName ? (
                      <span className="font-semibold">{r.itemName}: </span>
                    ) : null}
                    {r.message}
                    <span className="ml-1 font-mono text-[10px] text-trade-text-muted">
                      [{r.code}]
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Conscious-override justification — only for GAP-level outcomes.
          A hard block never shows this field. */}
      {overridable && (
        <div className="mb-3">
          <label
            htmlFor="ship-gate-justification"
            className="mb-1 block text-[11px] font-semibold text-trade-text-primary"
          >
            Begründung für die bewusste Freigabe (wird protokolliert)
          </label>
          <textarea
            id="ship-gate-justification"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            rows={3}
            minLength={MIN_OVERRIDE_JUSTIFICATION}
            maxLength={2000}
            placeholder="Warum darf trotz offener Punkte versendet werden? Diese Begründung wird mit deinem Namen im Audit-Log gespeichert."
            className="w-full rounded-md border border-trade-border-subtle bg-trade-bg-panel px-2.5 py-2 text-[11px] text-trade-text-primary placeholder:text-trade-text-muted focus:border-trade-accent focus:outline-none"
          />
          <p className="mt-1 text-[10px] text-trade-text-muted">
            Mindestens {MIN_OVERRIDE_JUSTIFICATION} Zeichen. Du bleibst die
            verantwortliche, im Audit-Log benannte Person.
          </p>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          disabled={submitting}
          className="rounded-md px-3 py-1.5 text-[11px] text-trade-text-secondary transition hover:text-trade-text-primary"
        >
          {hardBlocked ? "Schließen" : "Cancel"}
        </button>
        {!hardBlocked && (
          <button
            onClick={handleConfirm}
            disabled={confirmDisabled}
            className={`rounded-md px-3 py-1.5 text-[11px] font-semibold transition disabled:opacity-50 ${confirmClass}`}
          >
            {submitting
              ? "Moving…"
              : overridable
                ? "Trotzdem freigeben (protokolliert)"
                : `Move to ${toMeta.label}`}
          </button>
        )}
      </div>
    </div>
  );
}
