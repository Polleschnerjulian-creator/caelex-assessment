"use client";

import { useState, useTransition } from "react";
import { Plus, ChevronDown, Download } from "lucide-react";
import {
  TradeVSDAuthority,
  TradeVSDViolationType,
  TradeVSDStatus,
  TradeVSDOutcome,
} from "@prisma/client";
import type { VSDWithRelations } from "@/lib/trade/vsd-service";
import { createVsdAction, advanceVsdStatus } from "@/lib/trade/vsd-actions";
import { EditSectionDrawer } from "../../program/_components/EditSectionDrawer";

interface VsdListPanelProps {
  vsds: VSDWithRelations[];
  operations: { id: string; reference: string }[];
  items: { id: string; name: string; internalSku: string | null }[];
  parties: { id: string; canonicalName: string; countryCode: string }[];
  canEdit: boolean;
}

const AUTHORITY_LABELS: Record<TradeVSDAuthority, string> = {
  BIS: "BIS",
  DDTC: "DDTC",
  OFAC: "OFAC",
  BAFA: "BAFA",
  EU_COMPETENT_AUTHORITY: "EU Competent Authority",
  OTHER: "Other",
};

const VIOLATION_LABELS: Record<TradeVSDViolationType, string> = {
  UNLICENSED_EXPORT: "Unlicensed export",
  MISCLASSIFICATION: "Misclassification",
  PROHIBITED_PARTY: "Prohibited party",
  INVALID_LICENSE_EXCEPTION: "Invalid license exception",
  DEEMED_EXPORT: "Deemed export",
  CATCH_ALL_OMISSION: "Catch-all omission",
  UNAUTHORIZED_REEXPORT: "Unauthorized re-export",
  END_USE_VIOLATION: "End-use violation",
  OTHER: "Other",
};

const STATUS_LABELS: Record<TradeVSDStatus, string> = {
  DISCOVERED: "Discovered",
  INVESTIGATING: "Investigating",
  DRAFTED: "Drafted",
  SUBMITTED: "Submitted",
  ACKNOWLEDGED: "Acknowledged",
  RESOLVED: "Resolved",
  WITHDRAWN: "Withdrawn",
};

const OUTCOME_LABELS: Record<TradeVSDOutcome, string> = {
  NO_ACTION: "No action",
  WARNING_LETTER: "Warning letter",
  CIVIL_PENALTY: "Civil penalty",
  SETTLEMENT: "Settlement",
  CRIMINAL_REFERRAL: "Criminal referral",
  WITHDRAWN: "Withdrawn",
};

export function VsdListPanel({
  vsds,
  operations,
  items,
  parties,
  canEdit,
}: VsdListPanelProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <section className="rounded-xl border border-trade-border-subtle bg-trade-bg-elevated px-6 py-5">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-trade-text-primary">
            All disclosures
          </h2>
          <p className="mt-0.5 text-[12px] text-trade-text-muted">
            {vsds.length} {vsds.length === 1 ? "record" : "records"}
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-trade-accent px-3 py-1.5 text-[12.5px] font-semibold text-white shadow-sm transition-colors hover:bg-trade-accent-strong"
          >
            <Plus size={13} />
            New disclosure
          </button>
        )}
      </header>

      {vsds.length === 0 ? (
        <p className="text-[13px] italic text-trade-text-muted">
          No disclosures yet. Voluntary self-disclosure is a powerful mitigation
          tool — promptly filed VSDs typically cut penalties 60-80% and avoid
          criminal referral.
          {canEdit ? " Use “New disclosure” above to start tracking." : ""}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-trade-border-subtle text-left text-[11px] font-medium uppercase tracking-wide text-trade-text-muted">
                <th className="pb-2 pr-4 font-medium">Title</th>
                <th className="pb-2 pr-4 font-medium">Authority</th>
                <th className="pb-2 pr-4 font-medium">Violation</th>
                <th className="pb-2 pr-4 font-medium">Discovered</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 pr-4 font-medium">Outcome</th>
                <th className="pb-2 pr-4 font-medium">Filing PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-trade-border-subtle">
              {vsds.map((v) => (
                <tr key={v.id}>
                  <td className="py-3 pr-4">
                    <span className="font-medium text-trade-text-primary">
                      {v.title}
                    </span>
                    {v.filingReference && (
                      <div className="font-mono text-[10.5px] text-trade-text-muted">
                        {v.filingReference}
                      </div>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-trade-text-secondary">
                    {AUTHORITY_LABELS[v.authority]}
                  </td>
                  <td className="py-3 pr-4 text-trade-text-secondary">
                    {VIOLATION_LABELS[v.violationType]}
                  </td>
                  <td className="py-3 pr-4 text-trade-text-secondary">
                    {new Date(v.discoveredAt).toISOString().slice(0, 10)}
                  </td>
                  <td className="py-3 pr-4">
                    {canEdit ? (
                      <StatusTransitionMenu row={v} />
                    ) : (
                      <StatusPill status={v.status} />
                    )}
                  </td>
                  <td className="py-3 pr-4 text-trade-text-secondary">
                    {v.outcome ? OUTCOME_LABELS[v.outcome] : "—"}
                    {v.penaltyAmountUsd ? (
                      <div className="text-[10.5px] text-trade-text-muted">
                        $
                        {v.penaltyAmountUsd.toLocaleString("en-US", {
                          maximumFractionDigits: 0,
                        })}
                      </div>
                    ) : null}
                  </td>
                  <td className="py-3 pr-4">
                    <FilingPdfMenu row={v} />
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
        title="New Voluntary Self-Disclosure"
        description="Log a potential violation for internal investigation and (eventually) formal disclosure to the responsible authority. Keep notes private — this is privileged compliance work-product."
      >
        <CreateVsdForm
          operations={operations}
          items={items}
          parties={parties}
          onSuccess={() => setDrawerOpen(false)}
          onCancel={() => setDrawerOpen(false)}
        />
      </EditSectionDrawer>
    </section>
  );
}

// ─── Status pill ────────────────────────────────────────────────────

function StatusPill({ status }: { status: TradeVSDStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-sm px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${toneFor(status)}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function toneFor(status: TradeVSDStatus): string {
  switch (status) {
    case "DISCOVERED":
      return "bg-red-100 text-red-700";
    case "INVESTIGATING":
      return "bg-amber-100 text-amber-700";
    case "DRAFTED":
      return "bg-slate-100 text-slate-700";
    case "SUBMITTED":
      return "bg-slate-200 text-slate-700";
    case "ACKNOWLEDGED":
      return "bg-slate-300 text-slate-800";
    case "RESOLVED":
      return "bg-emerald-100 text-emerald-700";
    case "WITHDRAWN":
      return "bg-slate-200 text-slate-500";
  }
}

// ─── Status transition menu (per-row) ───────────────────────────────

function StatusTransitionMenu({ row }: { row: VSDWithRelations }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();
  const [submitMode, setSubmitMode] = useState(false);
  const [filingReference, setFilingReference] = useState("");
  const [resolveMode, setResolveMode] = useState(false);
  const [outcome, setOutcome] = useState<TradeVSDOutcome>("NO_ACTION");
  const [penaltyUsd, setPenaltyUsd] = useState("");
  const [outcomeNotes, setOutcomeNotes] = useState("");

  const options = allowedNextStatuses(row.status);

  function startTransitionFor(next: TradeVSDStatus) {
    if (next === "SUBMITTED") {
      setSubmitMode(true);
      return;
    }
    if (next === "RESOLVED") {
      setResolveMode(true);
      return;
    }
    setError(undefined);
    startTransition(async () => {
      const result = await advanceVsdStatus({
        vsdId: row.id,
        nextStatus: next,
      });
      if (result.ok) {
        setOpen(false);
      } else {
        setError(result.error);
      }
    });
  }

  function submitWithFiling(e: React.FormEvent) {
    e.preventDefault();
    if (!filingReference.trim()) {
      setError("Filing reference required");
      return;
    }
    setError(undefined);
    startTransition(async () => {
      const result = await advanceVsdStatus({
        vsdId: row.id,
        nextStatus: "SUBMITTED",
        filingReference,
      });
      if (result.ok) {
        setOpen(false);
        setSubmitMode(false);
        setFilingReference("");
      } else {
        setError(result.error);
      }
    });
  }

  function submitResolve(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    startTransition(async () => {
      const result = await advanceVsdStatus({
        vsdId: row.id,
        nextStatus: "RESOLVED",
        outcome,
        penaltyAmountUsd: penaltyUsd || undefined,
        outcomeNotes: outcomeNotes || undefined,
      });
      if (result.ok) {
        setOpen(false);
        setResolveMode(false);
        setPenaltyUsd("");
        setOutcomeNotes("");
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
        <div className="absolute left-0 top-[calc(100%+4px)] z-20 w-64 rounded-md border border-trade-border bg-trade-bg-panel py-1 shadow-lg">
          {submitMode ? (
            <form onSubmit={submitWithFiling} className="p-3">
              <label className="block text-[11px] font-medium uppercase tracking-wide text-trade-text-muted">
                Filing reference
              </label>
              <input
                type="text"
                value={filingReference}
                onChange={(e) => setFilingReference(e.target.value)}
                placeholder="e.g. BIS-VSD-2026-001"
                className="mt-1 w-full rounded-md border border-trade-border bg-trade-bg-page px-2 py-1.5 text-[12px] focus:border-trade-accent focus:outline-none focus:ring-1 focus:ring-trade-accent"
                autoFocus
              />
              {error && (
                <p className="mt-2 rounded border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-700">
                  {error}
                </p>
              )}
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSubmitMode(false);
                    setError(undefined);
                  }}
                  disabled={isPending}
                  className="text-[11.5px] text-trade-text-secondary hover:text-trade-text-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-md bg-trade-accent px-2.5 py-1 text-[11.5px] font-semibold text-white hover:bg-trade-accent-strong disabled:opacity-60"
                >
                  {isPending ? "Saving…" : "Submit"}
                </button>
              </div>
            </form>
          ) : resolveMode ? (
            <form onSubmit={submitResolve} className="p-3">
              <label className="block text-[11px] font-medium uppercase tracking-wide text-trade-text-muted">
                Outcome
              </label>
              <select
                value={outcome}
                onChange={(e) => setOutcome(e.target.value as TradeVSDOutcome)}
                className="mt-1 w-full rounded-md border border-trade-border bg-trade-bg-page px-2 py-1.5 text-[12px] focus:border-trade-accent focus:outline-none focus:ring-1 focus:ring-trade-accent"
              >
                {Object.entries(OUTCOME_LABELS)
                  .filter(([k]) => k !== "WITHDRAWN")
                  .map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
              </select>

              {(outcome === "CIVIL_PENALTY" || outcome === "SETTLEMENT") && (
                <>
                  <label className="mt-3 block text-[11px] font-medium uppercase tracking-wide text-trade-text-muted">
                    Penalty (USD)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={penaltyUsd}
                    onChange={(e) => setPenaltyUsd(e.target.value)}
                    className="mt-1 w-full rounded-md border border-trade-border bg-trade-bg-page px-2 py-1.5 text-[12px] focus:border-trade-accent focus:outline-none focus:ring-1 focus:ring-trade-accent"
                    placeholder="0"
                  />
                </>
              )}

              <label className="mt-3 block text-[11px] font-medium uppercase tracking-wide text-trade-text-muted">
                Outcome notes (optional)
              </label>
              <textarea
                value={outcomeNotes}
                onChange={(e) => setOutcomeNotes(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-md border border-trade-border bg-trade-bg-page px-2 py-1.5 text-[12px] focus:border-trade-accent focus:outline-none focus:ring-1 focus:ring-trade-accent"
                placeholder="Settlement terms, closing letter language, …"
              />

              {error && (
                <p className="mt-2 rounded border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-700">
                  {error}
                </p>
              )}
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setResolveMode(false);
                    setError(undefined);
                  }}
                  disabled={isPending}
                  className="text-[11.5px] text-trade-text-secondary hover:text-trade-text-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-md bg-emerald-600 px-2.5 py-1 text-[11.5px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {isPending ? "Saving…" : "Resolve"}
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
                  onClick={() => startTransitionFor(nextStatus)}
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
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Filing PDF dropdown (per-row) ──────────────────────────────────

/**
 * Z6b-d: download the filing PDF for the disclosure. The default
 * jurisdiction is derived from the VSD's `authority` (OFAC → OFAC
 * template, BIS → BIS template, DDTC → DDTC template). The dropdown
 * also exposes the other two for cases where the operator wants to
 * preview an alternate format (e.g. concurrent BIS + OFAC filing).
 */
function FilingPdfMenu({ row }: { row: VSDWithRelations }) {
  const [open, setOpen] = useState(false);

  const supportsAuto =
    row.authority === "OFAC" ||
    row.authority === "BIS" ||
    row.authority === "DDTC";

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-sm border border-trade-border bg-trade-bg-page px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-trade-text-primary transition-colors hover:bg-trade-hover"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Download size={11} />
        Filing PDF
        <ChevronDown size={11} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+4px)] z-20 w-56 rounded-md border border-trade-border bg-trade-bg-panel py-1 shadow-lg"
        >
          {supportsAuto && (
            <a
              role="menuitem"
              href={`/api/trade/vsd/${row.id}/pdf`}
              download
              onClick={() => setOpen(false)}
              className="block px-3 py-1.5 text-left text-[12px] text-trade-text-primary transition-colors hover:bg-trade-hover"
            >
              ↓ Filing for {AUTHORITY_LABELS[row.authority]}
            </a>
          )}
          <a
            role="menuitem"
            href={`/api/trade/vsd/${row.id}/pdf?jurisdiction=ofac`}
            download
            onClick={() => setOpen(false)}
            className="block px-3 py-1.5 text-left text-[12px] text-trade-text-primary transition-colors hover:bg-trade-hover"
          >
            ↓ OFAC (31 CFR § 501.806)
          </a>
          <a
            role="menuitem"
            href={`/api/trade/vsd/${row.id}/pdf?jurisdiction=bis`}
            download
            onClick={() => setOpen(false)}
            className="block px-3 py-1.5 text-left text-[12px] text-trade-text-primary transition-colors hover:bg-trade-hover"
          >
            ↓ BIS (15 CFR § 764.5)
          </a>
          <a
            role="menuitem"
            href={`/api/trade/vsd/${row.id}/pdf?jurisdiction=ddtc`}
            download
            onClick={() => setOpen(false)}
            className="block px-3 py-1.5 text-left text-[12px] text-trade-text-primary transition-colors hover:bg-trade-hover"
          >
            ↓ DDTC (22 CFR § 127.12)
          </a>
        </div>
      )}
    </div>
  );
}

function allowedNextStatuses(current: TradeVSDStatus): TradeVSDStatus[] {
  switch (current) {
    case "DISCOVERED":
      return ["INVESTIGATING", "WITHDRAWN"];
    case "INVESTIGATING":
      return ["DRAFTED", "WITHDRAWN"];
    case "DRAFTED":
      return ["SUBMITTED", "WITHDRAWN"];
    case "SUBMITTED":
      return ["ACKNOWLEDGED", "WITHDRAWN"];
    case "ACKNOWLEDGED":
      return ["RESOLVED"];
    default:
      return [];
  }
}

function arrowLabelFor(s: TradeVSDStatus): string {
  if (s === "WITHDRAWN") return "↳ Withdraw";
  if (s === "SUBMITTED") return "→ Submit (needs filing ref)";
  if (s === "RESOLVED") return "✓ Resolve (needs outcome)";
  return `→ ${STATUS_LABELS[s]}`;
}

// ─── Create form ────────────────────────────────────────────────────

interface CreateVsdFormProps {
  operations: { id: string; reference: string }[];
  items: { id: string; name: string; internalSku: string | null }[];
  parties: { id: string; canonicalName: string; countryCode: string }[];
  onSuccess: () => void;
  onCancel: () => void;
}

function CreateVsdForm({
  operations,
  items,
  parties,
  onSuccess,
  onCancel,
}: CreateVsdFormProps) {
  const [authority, setAuthority] = useState<TradeVSDAuthority>("BIS");
  const [violationType, setViolationType] =
    useState<TradeVSDViolationType>("UNLICENSED_EXPORT");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [discoveredAt, setDiscoveredAt] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [occurredAt, setOccurredAt] = useState("");
  const [operationId, setOperationId] = useState("");
  const [itemId, setItemId] = useState("");
  const [partyId, setPartyId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    startTransition(async () => {
      const result = await createVsdAction({
        authority,
        violationType,
        title,
        description,
        discoveredAt,
        occurredAt: occurredAt || undefined,
        operationId: operationId || undefined,
        itemId: itemId || undefined,
        partyId: partyId || undefined,
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
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Authority</label>
          <select
            value={authority}
            onChange={(e) => setAuthority(e.target.value as TradeVSDAuthority)}
            className={fieldClass}
          >
            {Object.entries(AUTHORITY_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Violation type</label>
          <select
            value={violationType}
            onChange={(e) =>
              setViolationType(e.target.value as TradeVSDViolationType)
            }
            className={fieldClass}
          >
            {Object.entries(VIOLATION_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Shipped 5A002.a to RU without license, Aug 2025"
          className={fieldClass}
          required
          maxLength={200}
        />
      </div>

      <div>
        <label className={labelClass}>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Plain-text narrative of the suspected violation. The formatted authority filing is rendered later from these fields."
          className={fieldClass}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Discovered</label>
          <input
            type="date"
            value={discoveredAt}
            onChange={(e) => setDiscoveredAt(e.target.value)}
            className={fieldClass}
            required
          />
          <p className="mt-1 text-[11px] text-trade-text-muted">
            Starts the BIS §764.5 “as soon as possible” / OFAC 60-day clock.
          </p>
        </div>
        <div>
          <label className={labelClass}>Occurred (optional)</label>
          <input
            type="date"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
            className={fieldClass}
          />
          <p className="mt-1 text-[11px] text-trade-text-muted">
            When the underlying violation happened, if known.
          </p>
        </div>
      </div>

      <div>
        <label className={labelClass}>Related operation (optional)</label>
        <select
          value={operationId}
          onChange={(e) => setOperationId(e.target.value)}
          className={fieldClass}
        >
          <option value="">— None</option>
          {operations.map((o) => (
            <option key={o.id} value={o.id}>
              {o.reference}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>Related item (optional)</label>
        <select
          value={itemId}
          onChange={(e) => setItemId(e.target.value)}
          className={fieldClass}
        >
          <option value="">— None</option>
          {items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
              {i.internalSku ? ` (${i.internalSku})` : ""}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>Related party (optional)</label>
        <select
          value={partyId}
          onChange={(e) => setPartyId(e.target.value)}
          className={fieldClass}
        >
          <option value="">— None</option>
          {parties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.canonicalName} ({p.countryCode})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>Privileged notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Internal investigation notes, counsel communications, etc. NOT shared with the authority."
          className={fieldClass}
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
          disabled={isPending || !title || !description}
          className="rounded-md bg-trade-accent px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-trade-accent-strong disabled:opacity-60"
        >
          {isPending ? "Creating…" : "Log disclosure"}
        </button>
      </div>
    </form>
  );
}

const labelClass =
  "block text-[11.5px] font-medium uppercase tracking-wide text-trade-text-muted";
const fieldClass =
  "mt-1 w-full rounded-md border border-trade-border bg-trade-bg-page px-3 py-2 text-[13px] text-trade-text-primary placeholder:text-trade-text-muted focus:border-trade-accent focus:outline-none focus:ring-1 focus:ring-trade-accent";
