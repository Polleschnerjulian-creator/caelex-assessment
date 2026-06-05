"use client";

/**
 * LicenseApplicationModal — guided "Antrag vorbereiten" for a non-GO verdict.
 *
 * Structural clone of LicenseRenewalModal (UI Phase 3B), but seeded from a
 * LicenseApplicationDraft (operation/item/party context) instead of a prior
 * licence. On mount it calls the PURE buildLicenseApplicationDraft(target, ctx)
 * (no network) to pre-fill the fileable TradeLicenseType, the triggering codes,
 * the destination(s), the end-use restriction and a starting cap, stamping
 * conditions.applicationFor for operation↔draft lineage (no schema change).
 *
 * The operator reviews the carried fields (cap + notes editable; the structured
 * conditions are carried verbatim and surfaced read-only), optionally fills the
 * authority dates IF already issued, confirms, then POSTs to the EXISTING
 * POST /api/trade/licenses with status "DRAFT". Caelex never auto-files — the
 * mandatory disclaimer is shown verbatim, and on success the authority portal
 * deep-link surfaces so the human's next physical step is one click away.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useMemo, useState } from "react";
import { X, FileText, AlertTriangle, ExternalLink } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import {
  buildLicenseApplicationDraft,
  authorityPortal,
  type ApplicationTarget,
  type OperationContext,
} from "@/lib/trade/license-application";
import {
  TYPE_META,
  type LicenseType,
} from "@/app/(trade)/trade/licenses/_components/license-types";

// Shared input/label styling, mirrored from LicenseRenewalModal.
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

export function LicenseApplicationModal({
  target,
  ctx,
  onClose,
  onCreated,
}: {
  target: ApplicationTarget;
  ctx: OperationContext;
  onClose: () => void;
  onCreated?: () => void;
}) {
  const toast = useToast();
  // Pure clone — no network. Recomputed only if target/ctx change.
  const draft = useMemo(
    () => buildLicenseApplicationDraft(target, ctx),
    [target, ctx],
  );
  const portal = authorityPortal(target.requirement.authority);
  const typeMeta =
    TYPE_META[draft.licenseType as LicenseType] ?? TYPE_META.OTHER;

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
  const [created, setCreated] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
      // else (coveredCodes/coveredCountries/endUseRestrictions/applicationFor)
      // is carried verbatim by the pure builder.
      const conditions: Record<string, unknown> = { ...draft.conditions };
      if (notes.trim()) conditions.notes = notes.trim();
      else delete conditions.notes;
      const capValue = totalCapValue ? parseFloat(totalCapValue) : undefined;

      const res = await fetch("/api/trade/licenses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          licenseType: draft.licenseType,
          // NEVER send licenseNumber — unknown until the authority issues it.
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
        setErr(data.error ?? "Entwurf konnte nicht erstellt werden");
        return;
      }
      setCreated(true);
      onCreated?.();
      toast.success(
        "Antragsentwurf erstellt",
        "Ein DRAFT wurde unter „Genehmigungen“ angelegt. Reiche ihn selbst beim Behördenkanal ein und re-verifiziere alle Bedingungen vor jeder Lieferung.",
      );
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Netzwerkfehler");
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
            <FileText size={18} />
          </div>
          <div>
            <h2 className="text-[15px] font-bold text-trade-text-primary">
              Antrag vorbereiten
            </h2>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px] text-trade-text-secondary">
              <span className="font-semibold text-trade-text-primary">
                {typeMeta.label}
              </span>
              <span className="rounded bg-trade-bg-subtle px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-trade-text-secondary ring-1 ring-trade-border-subtle">
                {typeMeta.jurisdiction} · {target.requirement.authority}
              </span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Schließen"
          className="rounded-md p-1 text-trade-text-muted transition hover:bg-trade-hover hover:text-trade-text-primary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Approximate-type hedge */}
      {draft.approximate && (
        <p className="mb-3 rounded-md border px-3 py-2 text-[11px] trade-chip-warn">
          Wahrscheinliche Einstufung als {typeMeta.label}. Bestätige den genauen
          Lizenztyp vor der Einreichung.
        </p>
      )}

      <p className="mb-4 rounded-md border border-trade-border-subtle bg-trade-bg-panel px-3 py-2 text-[12px] leading-relaxed text-trade-text-secondary">
        {draft.carriedSummary}
      </p>

      <form onSubmit={submit}>
        {/* Carried conditions (read-only surface) */}
        <div className="mb-4">
          <span className={labelClass}>Übernommene Angaben</span>
          {coveredCodes.length === 0 &&
          coveredCountries.length === 0 &&
          endUseRestrictions.length === 0 ? (
            <p className="text-[12px] text-trade-text-muted">
              Keine strukturierten Angaben aus dem Vorgang.
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
                    Länder
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
                    Endverwendung
                  </span>
                  {endUseRestrictions.map((c) => (
                    <span
                      key={c}
                      className="rounded px-1.5 py-0.5 text-[11px] trade-chip-warn"
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
            <label className={labelClass}>Ausgestellt am (falls erteilt)</label>
            <input
              type="date"
              value={issuedAt}
              onChange={(e) => setIssuedAt(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Gültig bis (falls erteilt)</label>
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Wertobergrenze</label>
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                step="any"
                value={totalCapValue}
                onChange={(e) => setTotalCapValue(e.target.value)}
                placeholder="250000"
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
            <label className={labelClass}>Notiz</label>
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
          lang="de"
          className="mt-4 flex items-start gap-2 rounded-md border px-3 py-2 text-[11px] leading-relaxed trade-chip-warn"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{draft.disclaimer}</span>
        </p>

        {err && (
          <div className="mt-3 rounded-md px-3 py-2 text-[12px] trade-chip-danger">
            {err}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          {created && (
            <a
              href={portal.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-trade-border px-4 py-2 text-[13px] font-semibold text-trade-accent transition hover:bg-trade-hover"
            >
              {`Jetzt bei ${portal.label} einreichen`}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-trade-border bg-trade-bg-panel px-4 py-2 text-[13px] font-semibold text-trade-text-secondary transition hover:bg-trade-hover hover:text-trade-text-primary"
          >
            {created ? "Schließen" : "Abbrechen"}
          </button>
          {!created && (
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-trade-accent px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-trade-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Erstelle…" : "Entwurf erstellen"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
