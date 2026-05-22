"use client";

import { useState, useTransition } from "react";
import { Plus, ChevronDown } from "lucide-react";
import { TradeEUCFormType, TradeEUCStatus } from "@prisma/client";
import type { EucWithRelations } from "@/lib/trade/euc-service";
import { createEuc, advanceEucStatus } from "@/lib/trade/euc-actions";
import { EditSectionDrawer } from "../../program/_components/EditSectionDrawer";

/**
 * EUC list panel (Sprint E5b).
 *
 * Server component (page.tsx) passes the data; this client wrapper
 * owns the create-drawer + per-row status transition popover state.
 */

interface EucListPanelProps {
  eucs: EucWithRelations[];
  parties: { id: string; canonicalName: string; countryCode: string }[];
  operations: { id: string; reference: string }[];
  canEdit: boolean;
}

const FORM_TYPE_LABELS: Record<TradeEUCFormType, string> = {
  BAFA_C1: "BAFA C1 (basic)",
  BAFA_C6: "BAFA C6 (re-export)",
  BAFA_C7: "BAFA C7 (Hong Kong)",
  BIS_711: "BIS Form 711",
  DDTC_DS83: "DDTC DS-83",
  OTHER: "Other",
};

const STATUS_LABELS: Record<TradeEUCStatus, string> = {
  REQUESTED: "Requested",
  SENT_TO_PARTY: "Sent",
  RECEIVED: "Received",
  VALIDATED: "Validated",
  EXPIRED: "Expired",
  REVOKED: "Revoked",
};

export function EucListPanel({
  eucs,
  parties,
  operations,
  canEdit,
}: EucListPanelProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <section className="rounded-xl border border-trade-border-subtle bg-trade-bg-elevated px-6 py-5">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-trade-text-primary">
            All certificates
          </h2>
          <p className="mt-0.5 text-[12px] text-trade-text-muted">
            {eucs.length} {eucs.length === 1 ? "record" : "records"}
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-trade-accent px-3 py-1.5 text-[12.5px] font-semibold text-white shadow-sm transition-colors hover:bg-trade-accent-strong"
          >
            <Plus size={13} />
            New EUC
          </button>
        )}
      </header>

      {eucs.length === 0 ? (
        <p className="text-[13px] italic text-trade-text-muted">
          No EUCs yet.{" "}
          {canEdit
            ? "Use “New EUC” above to start tracking your first end-use certificate."
            : "Ask a MANAGER+ teammate to create the first EUC."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-trade-border-subtle text-left text-[11px] font-medium uppercase tracking-wide text-trade-text-muted">
                <th className="pb-2 pr-4 font-medium">Form</th>
                <th className="pb-2 pr-4 font-medium">Counterparty</th>
                <th className="pb-2 pr-4 font-medium">Operation</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 pr-4 font-medium">Valid until</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-trade-border-subtle">
              {eucs.map((e) => (
                <tr key={e.id}>
                  <td className="py-3 pr-4">
                    <span className="font-medium text-trade-text-primary">
                      {FORM_TYPE_LABELS[e.formType]}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="text-trade-text-primary">
                      {e.party.canonicalName}
                    </span>
                    <span className="ml-2 text-[11px] text-trade-text-muted">
                      {e.party.countryCode}
                    </span>
                  </td>
                  <td className="py-3 pr-4 font-mono text-[11.5px] text-trade-text-secondary">
                    {e.operation?.reference ?? "—"}
                  </td>
                  <td className="py-3 pr-4">
                    {canEdit ? (
                      <StatusTransitionMenu row={e} />
                    ) : (
                      <StatusPill status={e.status} />
                    )}
                  </td>
                  <td className="py-3 pr-4 text-trade-text-secondary">
                    {e.validUntil
                      ? new Date(e.validUntil).toISOString().slice(0, 10)
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
        title="New End-Use Certificate"
        description="Track a new EUC issuance. Choose the form type, the foreign counterparty signing the certificate, and (optionally) tie it to a specific operation."
      >
        <CreateEucForm
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

function StatusPill({ status }: { status: TradeEUCStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-sm px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${toneFor(status)}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function toneFor(status: TradeEUCStatus): string {
  switch (status) {
    case "REQUESTED":
      return "bg-slate-100 text-slate-700";
    case "SENT_TO_PARTY":
      return "bg-indigo-100 text-indigo-700";
    case "RECEIVED":
      return "bg-amber-100 text-amber-700";
    case "VALIDATED":
      return "bg-emerald-100 text-emerald-700";
    case "EXPIRED":
      return "bg-slate-200 text-slate-500";
    case "REVOKED":
      return "bg-red-100 text-red-700";
  }
}

// ─── Status transition menu (per-row) ───────────────────────────────

function StatusTransitionMenu({ row }: { row: EucWithRelations }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  const options = allowedNextStatuses(row.status);

  function transitionTo(next: TradeEUCStatus) {
    setError(undefined);
    startTransition(async () => {
      const result = await advanceEucStatus({
        eucId: row.id,
        nextStatus: next,
      });
      if (result.ok) {
        setOpen(false);
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
        <div className="absolute left-0 top-[calc(100%+4px)] z-20 w-44 rounded-md border border-trade-border bg-trade-bg-panel py-1 shadow-lg">
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
            <p className="border-t border-trade-border-subtle px-3 py-2 text-[11px] text-red-700">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function allowedNextStatuses(current: TradeEUCStatus): TradeEUCStatus[] {
  switch (current) {
    case "REQUESTED":
      return ["SENT_TO_PARTY", "REVOKED"];
    case "SENT_TO_PARTY":
      return ["RECEIVED", "REVOKED"];
    case "RECEIVED":
      return ["VALIDATED", "REVOKED"];
    case "VALIDATED":
      return ["EXPIRED", "REVOKED"];
    default:
      return [];
  }
}

function arrowLabelFor(s: TradeEUCStatus): string {
  if (s === "REVOKED") return "↳ Revoke";
  return `→ ${STATUS_LABELS[s]}`;
}

// ─── Create EUC form ────────────────────────────────────────────────

interface CreateEucFormProps {
  parties: { id: string; canonicalName: string; countryCode: string }[];
  operations: { id: string; reference: string }[];
  onSuccess: () => void;
  onCancel: () => void;
}

function CreateEucForm({
  parties,
  operations,
  onSuccess,
  onCancel,
}: CreateEucFormProps) {
  const [formType, setFormType] = useState<TradeEUCFormType>("BAFA_C1");
  const [partyId, setPartyId] = useState(parties[0]?.id ?? "");
  const [operationId, setOperationId] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    startTransition(async () => {
      const result = await createEuc({
        formType,
        partyId,
        operationId: operationId || undefined,
        validUntil: validUntil || undefined,
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
        <label className={labelClass}>Form type</label>
        <select
          value={formType}
          onChange={(e) => setFormType(e.target.value as TradeEUCFormType)}
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
        <label className={labelClass}>Counterparty</label>
        <select
          value={partyId}
          onChange={(e) => setPartyId(e.target.value)}
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
        {parties.length === 0 && (
          <p className="mt-1 text-[11.5px] text-trade-text-muted">
            Add a counterparty in /trade/counterparties first.
          </p>
        )}
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
        <label className={labelClass}>Valid until (optional)</label>
        <input
          type="date"
          value={validUntil}
          onChange={(e) => setValidUntil(e.target.value)}
          className={fieldClass}
        />
        <p className="mt-1 text-[11.5px] text-trade-text-muted">
          BAFA forms typically expire 1–2 years from signing date.
        </p>
      </div>

      <div>
        <label className={labelClass}>Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className={fieldClass}
          placeholder="Operator notes, follow-ups, …"
        />
      </div>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] text-red-700">
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
          disabled={isPending || !partyId}
          className="rounded-md bg-trade-accent px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-trade-accent-strong disabled:opacity-60"
        >
          {isPending ? "Creating…" : "Create EUC"}
        </button>
      </div>
    </form>
  );
}

const labelClass =
  "block text-[11.5px] font-medium uppercase tracking-wide text-trade-text-muted";
const fieldClass =
  "mt-1 w-full rounded-md border border-trade-border bg-trade-bg-page px-3 py-2 text-[13px] text-trade-text-primary placeholder:text-trade-text-muted focus:border-trade-accent focus:outline-none focus:ring-1 focus:ring-trade-accent";
