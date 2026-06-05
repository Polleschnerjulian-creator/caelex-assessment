"use client";

/**
 * LicenseRenewalModal — guided licence renewal ("auto-prepare, human confirms").
 *
 * UI Phase 3B. Opened inline above the licences table when the operator
 * clicks "Renew" on an expiry-due licence. On mount it calls the PURE
 * buildLicenseRenewalDraft(prior) (no network) to clone the prior
 * licence's substance — licenseType / conditions / cap / currency —
 * into a new-licence create payload, stamping conditions.renewalOf so
 * the old→new lineage is queryable without a schema change.
 *
 * The operator reviews the carried fields (cap + notes editable; the
 * structured conditions are carried verbatim and surfaced read-only),
 * fills in the NEW authority dates (issuedAt / validUntil — never
 * carried), then submits. Submit POSTs to the EXISTING
 * POST /api/trade/licenses with status "DRAFT"; on success the new row
 * is handed back via onRenewed.
 *
 * Caelex never auto-files with BAFA / BIS / DDTC — the mandatory
 * disclaimer from buildLicenseRenewalDraft is shown verbatim.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useMemo, useState } from "react";
import { X, RefreshCw, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import {
  buildLicenseRenewalDraft,
  type RenewableLicense,
} from "@/lib/trade/license-renewal";
import { TYPE_META, type LicenseRow, type LicenseType } from "./license-types";

// Shared input/label styling, mirrored from NewLicenseForm (local consts there).
const inputClass =
  "w-full rounded-md border border-trade-border bg-trade-bg-panel px-3 py-2 text-[13px] text-trade-text-primary outline-none transition focus:border-trade-accent focus:ring-2 focus:ring-trade-accent/30";
const labelClass =
  "mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-trade-text-secondary";

/** Read covered codes / countries / restrictions from a conditions JSON. */
function readStringArray(
  conditions: Record<string, unknown>,
  key: string,
): string[] {
  const v = conditions[key];
  return Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string")
    : [];
}

export function LicenseRenewalModal({
  prior,
  onClose,
  onRenewed,
}: {
  prior: RenewableLicense & { licenseNumber: string | null };
  onClose: () => void;
  onRenewed: (newLicense: LicenseRow) => void;
}) {
  const toast = useToast();
  // Pure clone — no network. Recomputed only if `prior` changes.
  const draft = useMemo(() => buildLicenseRenewalDraft(prior), [prior]);

  // Editable form state, seeded from the draft.
  const [issuedAt, setIssuedAt] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [totalCapValue, setTotalCapValue] = useState(
    draft.totalCapValue !== null ? String(draft.totalCapValue) : "",
  );
  const [capCurrency, setCapCurrency] = useState(draft.capCurrency);
  const [notes, setNotes] = useState(
    typeof draft.conditions.notes === "string" ? draft.conditions.notes : "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const typeMeta =
    TYPE_META[prior.licenseType as LicenseType] ?? TYPE_META.OTHER;

  const coveredCodes = readStringArray(draft.conditions, "coveredCodes");
  const coveredCountries = readStringArray(
    draft.conditions,
    "coveredCountries",
  );
  const endUseRestrictions = readStringArray(
    draft.conditions,
    "endUseRestrictions",
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    try {
      // Merge the edited notes back into the carried conditions; everything
      // else (coveredCodes/coveredCountries/endUseRestrictions/valueCap/
      // renewalOf) is carried verbatim by the pure builder.
      const conditions: Record<string, unknown> = { ...draft.conditions };
      if (notes.trim()) conditions.notes = notes.trim();
      else delete conditions.notes;

      const capValue = totalCapValue ? parseFloat(totalCapValue) : undefined;

      const res = await fetch("/api/trade/licenses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          licenseType: draft.licenseType,
          // NEVER send licenseNumber — a renewal's authority no. is unknown
          // until the new Bescheid/licence is issued.
          issuedAt: issuedAt ? new Date(issuedAt).toISOString() : undefined,
          validUntil: validUntil
            ? new Date(validUntil).toISOString()
            : undefined,
          totalCapValue: capValue,
          capCurrency: capCurrency.toUpperCase(),
          conditions,
          status: "DRAFT",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Failed to create renewal draft");
        return;
      }
      // POST /create does not return _count — seed it like NewLicenseForm.
      const row: LicenseRow = {
        ...data.license,
        _count: { operations: 0 },
      };
      onRenewed(row);
      toast.success(
        "Renewal draft created",
        "A DRAFT renewal was added. Submit it through the authority's own channel and re-verify all conditions before any shipment.",
      );
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mb-6 rounded-md border border-trade-border-subtle bg-trade-bg-elevated p-5">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-trade-accent-soft text-trade-accent-strong">
            <RefreshCw size={18} />
          </div>
          <div>
            <h2 className="text-[15px] font-bold text-trade-text-primary">
              Renew licence
            </h2>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px] text-trade-text-secondary">
              <span className="font-semibold text-trade-text-primary">
                {typeMeta.label}
              </span>
              <span className="rounded bg-trade-bg-subtle px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-trade-text-secondary ring-1 ring-trade-border-subtle">
                {typeMeta.jurisdiction}
              </span>
              {prior.licenseNumber && (
                <span className="font-mono text-[11px] text-trade-text-muted">
                  {prior.licenseNumber}
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close renewal"
          className="rounded-md p-1 text-trade-text-muted transition hover:bg-trade-hover hover:text-trade-text-primary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* What was carried */}
      <p className="mb-4 rounded-md border border-trade-border-subtle bg-trade-bg-panel px-3 py-2 text-[12px] leading-relaxed text-trade-text-secondary">
        {draft.carriedSummary}
      </p>

      <form onSubmit={submit}>
        {/* Carried conditions (read-only surface) */}
        <div className="mb-4">
          <span className={labelClass}>Carried conditions</span>
          {coveredCodes.length === 0 &&
          coveredCountries.length === 0 &&
          endUseRestrictions.length === 0 ? (
            <p className="text-[12px] text-trade-text-muted">
              No structured conditions on the prior licence.
            </p>
          ) : (
            <div className="flex flex-col gap-2 text-[12px]">
              {coveredCodes.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-trade-text-muted">
                    Codes
                  </span>
                  {coveredCodes.map((c) => (
                    <span
                      key={c}
                      className="rounded bg-trade-bg-subtle px-1.5 py-0.5 font-mono text-[11px] text-trade-text-secondary ring-1 ring-trade-border-subtle"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}
              {coveredCountries.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-trade-text-muted">
                    Countries
                  </span>
                  {coveredCountries.map((c) => (
                    <span
                      key={c}
                      className="rounded bg-trade-bg-subtle px-1.5 py-0.5 font-mono text-[11px] text-trade-text-secondary ring-1 ring-trade-border-subtle"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}
              {endUseRestrictions.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-trade-text-muted">
                    End-use
                  </span>
                  {endUseRestrictions.map((c) => (
                    <span
                      key={c}
                      className="rounded trade-chip-warn px-1.5 py-0.5 text-[11px] ring-1 ring-trade-border-subtle"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Editable fields */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Issued at (new)</label>
            <input
              type="date"
              value={issuedAt}
              onChange={(e) => setIssuedAt(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Valid until (new)</label>
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Value cap</label>
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                step="any"
                value={totalCapValue}
                onChange={(e) => setTotalCapValue(e.target.value)}
                placeholder="500000"
                className={`${inputClass} font-mono`}
              />
              <input
                type="text"
                maxLength={3}
                value={capCurrency}
                onChange={(e) => setCapCurrency(e.target.value.toUpperCase())}
                className={`${inputClass} w-20 font-mono uppercase`}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="optional"
              className={inputClass}
            />
          </div>
        </div>

        {/* Mandatory disclaimer — carried verbatim from the pure builder. */}
        <p
          lang="en"
          className="mt-4 flex items-start gap-2 rounded-md trade-chip-warn px-3 py-2 text-[11px] leading-relaxed"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-current" />
          <span>{draft.disclaimer}</span>
        </p>

        {err && (
          <div className="mt-3 rounded-md trade-chip-danger px-3 py-2 text-[12px]">
            {err}
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-trade-border bg-trade-bg-panel px-4 py-2 text-[13px] font-semibold text-trade-text-secondary transition hover:bg-trade-hover hover:text-trade-text-primary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-trade-accent px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-trade-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Creating…" : "Create renewal draft"}
          </button>
        </div>
      </form>
    </div>
  );
}
