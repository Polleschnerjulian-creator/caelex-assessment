"use client";

import { useState, useTransition } from "react";
import { Plus, ChevronDown } from "lucide-react";
import { TradeReexportFormType, TradeReexportStatus } from "@prisma/client";
import type { ReexportWithRelations } from "@/lib/trade/reexport-service";
import {
  createReexport,
  advanceReexportStatus,
} from "@/lib/trade/reexport-actions";
import { EditSectionDrawer } from "../../program/_components/EditSectionDrawer";

/**
 * Re-Export Consent list panel (Sprint E4b).
 *
 * Mirrors EucListPanel but for the re-export workflow. Key differences:
 *  - DENIED + APPROVED both reachable from SENT (vs EUC linear flow)
 *  - DENIED requires a reason — captured via a separate prompt-form
 *    when the operator picks "→ Deny"
 *  - Renders the origin→destination flow visually (left arrow with
 *    exporter country, right arrow with new destination)
 */

interface ReexportListPanelProps {
  consents: ReexportWithRelations[];
  parties: { id: string; canonicalName: string; countryCode: string }[];
  operations: { id: string; reference: string }[];
  canEdit: boolean;
}

const FORM_TYPE_LABELS: Record<TradeReexportFormType, string> = {
  BIS_REEXPORT_AUTH: "BIS re-export",
  BAFA_REEXPORT_AUTH: "BAFA §17 AWV",
  EU_INTRA_REEXPORT: "EU intra (Art. 11)",
  OTHER: "Other",
};

const STATUS_LABELS: Record<TradeReexportStatus, string> = {
  DRAFTED: "Drafted",
  SENT: "Sent",
  APPROVED: "Approved",
  DENIED: "Denied",
  EXPIRED: "Expired",
  REVOKED: "Revoked",
};

export function ReexportListPanel({
  consents,
  parties,
  operations,
  canEdit,
}: ReexportListPanelProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <section className="rounded-xl border border-trade-border-subtle bg-trade-bg-elevated px-6 py-5">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-trade-text-primary">
            All consent letters
          </h2>
          <p className="mt-0.5 text-[12px] text-trade-text-muted">
            {consents.length} {consents.length === 1 ? "record" : "records"}
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-trade-accent px-3 py-1.5 text-[12.5px] font-semibold text-white shadow-sm transition-colors hover:bg-trade-accent-strong"
          >
            <Plus size={13} />
            New consent letter
          </button>
        )}
      </header>

      {consents.length === 0 ? (
        <p className="text-[13px] italic text-trade-text-muted">
          No re-export consents yet.{" "}
          {canEdit
            ? "Use “New consent letter” above to track your first request."
            : "Ask a MANAGER+ teammate to create the first record."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-trade-border-subtle text-left text-[11px] font-medium uppercase tracking-wide text-trade-text-muted">
                <th className="pb-2 pr-4 font-medium">Track</th>
                <th className="pb-2 pr-4 font-medium">Requesting party</th>
                <th className="pb-2 pr-4 font-medium">Flow</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 pr-4 font-medium">Valid until</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-trade-border-subtle">
              {consents.map((c) => (
                <tr key={c.id}>
                  <td className="py-3 pr-4">
                    <span className="font-medium text-trade-text-primary">
                      {FORM_TYPE_LABELS[c.formType]}
                    </span>
                    {c.originalLicenseNumber && (
                      <div className="font-mono text-[10.5px] text-trade-text-muted">
                        {c.originalLicenseNumber}
                      </div>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <span className="text-trade-text-primary">
                      {c.requestingParty.canonicalName}
                    </span>
                    <span className="ml-2 text-[11px] text-trade-text-muted">
                      {c.requestingParty.countryCode}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="font-mono text-[11.5px] text-trade-text-secondary">
                      {c.originalExporterCountry}
                    </span>
                    <span className="mx-1 text-trade-text-muted">→</span>
                    <span className="font-mono text-[11.5px] text-trade-text-secondary">
                      {c.newDestinationCountry}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    {canEdit ? (
                      <StatusTransitionMenu row={c} />
                    ) : (
                      <StatusPill status={c.status} />
                    )}
                  </td>
                  <td className="py-3 pr-4 text-trade-text-secondary">
                    {c.validUntil
                      ? new Date(c.validUntil).toISOString().slice(0, 10)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <EditSectionDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="New Re-Export Consent Letter"
        description="Track a new re-export authorisation request. Identify the original exporter, the requesting party, and the new destination."
      >
        <CreateReexportForm
          parties={parties}
          operations={operations}
          onSuccess={() => setDrawerOpen(false)}
          onCancel={() => setDrawerOpen(false)}
        />
      </EditSectionDrawer>
    </section>
  );
}

// ─── Status pill ────────────────────────────────────────────────────

function StatusPill({ status }: { status: TradeReexportStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-sm px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${toneFor(status)}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function toneFor(status: TradeReexportStatus): string {
  switch (status) {
    case "DRAFTED":
      return "trade-chip-neutral";
    case "SENT":
      return "trade-chip-neutral";
    case "APPROVED":
      return "trade-chip-success";
    case "DENIED":
      return "trade-chip-danger";
    case "EXPIRED":
      return "trade-chip-neutral";
    case "REVOKED":
      return "trade-chip-danger";
  }
}

// ─── Status transition menu (per-row) ───────────────────────────────

function StatusTransitionMenu({ row }: { row: ReexportWithRelations }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();
  const [denialMode, setDenialMode] = useState(false);
  const [denialReason, setDenialReason] = useState("");

  const options = allowedNextStatuses(row.status);

  function transitionTo(next: TradeReexportStatus) {
    if (next === "DENIED") {
      setDenialMode(true);
      return;
    }
    setError(undefined);
    startTransition(async () => {
      const result = await advanceReexportStatus({
        reexportId: row.id,
        nextStatus: next,
      });
      if (result.ok) {
        setOpen(false);
      } else {
        setError(result.error);
      }
    });
  }

  function submitDenial(e: React.FormEvent) {
    e.preventDefault();
    if (!denialReason.trim()) {
      setError("Reason required for denial");
      return;
    }
    setError(undefined);
    startTransition(async () => {
      const result = await advanceReexportStatus({
        reexportId: row.id,
        nextStatus: "DENIED",
        denialReason,
      });
      if (result.ok) {
        setOpen(false);
        setDenialMode(false);
        setDenialReason("");
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider transition-colors ${toneFor(row.status)}`}
      >
        {STATUS_LABELS[row.status]}
        {options.length > 0 && <ChevronDown size={11} />}
      </button>

      {open && options.length > 0 && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-20 w-52 rounded-md border border-trade-border bg-trade-bg-panel py-1 shadow-lg">
          {denialMode ? (
            <form onSubmit={submitDenial} className="p-3">
              <label className="block text-[11px] font-medium uppercase tracking-wide text-trade-text-muted">
                Denial reason
              </label>
              <textarea
                value={denialReason}
                onChange={(e) => setDenialReason(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-md border border-trade-border bg-trade-bg-page px-2 py-1.5 text-[12px] text-trade-text-primary focus:border-trade-accent focus:outline-none focus:ring-1 focus:ring-trade-accent"
                placeholder="Reason given by the original exporter…"
                autoFocus
              />
              {error && (
                <p className="mt-2 rounded trade-chip-danger px-2 py-1 text-[11px]">
                  {error}
                </p>
              )}
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDenialMode(false);
                    setError(undefined);
                  }}
                  disabled={isPending}
                  className="text-[11.5px] text-trade-text-secondary hover:text-trade-text-primary disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-md bg-red-600 px-2.5 py-1 text-[11.5px] font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {isPending ? "Saving…" : "Save denial"}
                </button>
              </div>
            </form>
          ) : (
            <>
              {options.map((nextStatus) => (
                <button
                  key={nextStatus}
                  type="button"
                  disabled={isPending}
                  onClick={() => transitionTo(nextStatus)}
                  className="block w-full px-3 py-1.5 text-left text-[12px] text-trade-text-primary transition-colors hover:bg-trade-hover disabled:opacity-50"
                >
                  {arrowLabelFor(nextStatus)}
                </button>
              ))}
              {error && (
                <p className="border-t border-trade-border-subtle px-3 py-2 text-[11px] text-trade-accent-danger">
                  {error}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function allowedNextStatuses(
  current: TradeReexportStatus,
): TradeReexportStatus[] {
  switch (current) {
    case "DRAFTED":
      return ["SENT", "REVOKED"];
    case "SENT":
      return ["APPROVED", "DENIED", "REVOKED"];
    case "APPROVED":
      return ["EXPIRED", "REVOKED"];
    default:
      return [];
  }
}

function arrowLabelFor(s: TradeReexportStatus): string {
  if (s === "REVOKED") return "↳ Revoke";
  if (s === "DENIED") return "✗ Deny (needs reason)";
  return `→ ${STATUS_LABELS[s]}`;
}

// ─── Create form ────────────────────────────────────────────────────

interface CreateReexportFormProps {
  parties: { id: string; canonicalName: string; countryCode: string }[];
  operations: { id: string; reference: string }[];
  onSuccess: () => void;
  onCancel: () => void;
}

function CreateReexportForm({
  parties,
  operations,
  onSuccess,
  onCancel,
}: CreateReexportFormProps) {
  const [formType, setFormType] =
    useState<TradeReexportFormType>("BAFA_REEXPORT_AUTH");
  const [originalLicenseNumber, setOriginalLicenseNumber] = useState("");
  const [originalExporterName, setOriginalExporterName] = useState("");
  const [originalExporterCountry, setOriginalExporterCountry] = useState("");
  const [requestingPartyId, setRequestingPartyId] = useState(
    parties[0]?.id ?? "",
  );
  const [newDestinationCountry, setNewDestinationCountry] = useState("");
  const [newEndUserName, setNewEndUserName] = useState("");
  const [operationId, setOperationId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    startTransition(async () => {
      const result = await createReexport({
        formType,
        requestingPartyId,
        originalExporterName,
        originalExporterCountry,
        newDestinationCountry,
        newEndUserName,
        originalLicenseNumber: originalLicenseNumber || undefined,
        operationId: operationId || undefined,
        notes: notes || undefined,
      });
      if (result.ok) {
        onSuccess();
      } else {
        const fieldErrs = result.fieldErrors
          ? Object.entries(result.fieldErrors)
              .map(([k, v]) => `${k}: ${v.join(", ")}`)
              .join(" · ")
          : "";
        setError(fieldErrs ? `${result.error} — ${fieldErrs}` : result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className={labelClass}>Authority track</label>
        <select
          value={formType}
          onChange={(e) => setFormType(e.target.value as TradeReexportFormType)}
          className={fieldClass}
        >
          {Object.entries(FORM_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>Original license number (optional)</label>
        <input
          type="text"
          value={originalLicenseNumber}
          onChange={(e) => setOriginalLicenseNumber(e.target.value)}
          placeholder="e.g. D123456 or EUGEA EU001-2025-DE-0042"
          className={fieldClass}
        />
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-3">
        <div>
          <label className={labelClass}>Original exporter</label>
          <input
            type="text"
            value={originalExporterName}
            onChange={(e) => setOriginalExporterName(e.target.value)}
            placeholder="e.g. Lockheed Martin Space"
            className={fieldClass}
            required
          />
        </div>
        <div>
          <label className={labelClass}>Country</label>
          <input
            type="text"
            value={originalExporterCountry}
            onChange={(e) =>
              setOriginalExporterCountry(e.target.value.toUpperCase())
            }
            placeholder="US"
            maxLength={2}
            className={`${fieldClass} w-20 text-center uppercase`}
            required
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Requesting party</label>
        <select
          value={requestingPartyId}
          onChange={(e) => setRequestingPartyId(e.target.value)}
          className={fieldClass}
          required
        >
          {parties.length === 0 && (
            <option value="">(no counterparties)</option>
          )}
          {parties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.canonicalName} ({p.countryCode})
            </option>
          ))}
        </select>
        <p className="mt-1 text-[11.5px] text-trade-text-muted">
          The foreign-licensed party who received the original export and wants
          to re-export.
        </p>
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-3">
        <div>
          <label className={labelClass}>New end-user</label>
          <input
            type="text"
            value={newEndUserName}
            onChange={(e) => setNewEndUserName(e.target.value)}
            placeholder="e.g. Indian Space Research Organisation"
            className={fieldClass}
            required
          />
        </div>
        <div>
          <label className={labelClass}>Destination</label>
          <input
            type="text"
            value={newDestinationCountry}
            onChange={(e) =>
              setNewDestinationCountry(e.target.value.toUpperCase())
            }
            placeholder="IN"
            maxLength={2}
            className={`${fieldClass} w-20 text-center uppercase`}
            required
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Operation (optional)</label>
        <select
          value={operationId}
          onChange={(e) => setOperationId(e.target.value)}
          className={fieldClass}
        >
          <option value="">— Not tied to a specific operation</option>
          {operations.map((o) => (
            <option key={o.id} value={o.id}>
              {o.reference}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className={fieldClass}
          placeholder="Operator notes, dispatch plan, follow-ups…"
        />
      </div>

      {error && (
        <p className="rounded-md trade-chip-danger px-3 py-2 text-[12.5px]">
          {error}
        </p>
      )}

      <div className="mt-6 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="rounded-md px-4 py-2 text-[13px] font-medium text-trade-text-secondary hover:bg-trade-hover hover:text-trade-text-primary disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending || !requestingPartyId}
          className="rounded-md bg-trade-accent px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-trade-accent-strong disabled:opacity-60"
        >
          {isPending ? "Creating…" : "Create request"}
        </button>
      </div>
    </form>
  );
}

const labelClass =
  "block text-[11.5px] font-medium uppercase tracking-wide text-trade-text-muted";
const fieldClass =
  "mt-1 w-full rounded-md border border-trade-border bg-trade-bg-page px-3 py-2 text-[13px] text-trade-text-primary placeholder:text-trade-text-muted focus:border-trade-accent focus:outline-none focus:ring-1 focus:ring-trade-accent";
