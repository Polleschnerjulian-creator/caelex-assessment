"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import {
  TradeUkEcjuLicenseStatus,
  TradeUkEcjuLicenseType,
} from "@prisma/client";
import type { UkEcjuLicenseWithCreator } from "@/lib/trade/uk-ecju/uk-ecju-service";
import { createUkEcjuLicenseAction } from "@/lib/trade/uk-ecju/uk-ecju-actions";

/**
 * UK ECJU licence list panel (Z37-UK, Tier 4).
 *
 * Server component (page.tsx) passes the data; this client wrapper
 * owns the create-drawer state and per-row navigation links.
 */

interface UkEcjuListPanelProps {
  licenses: UkEcjuLicenseWithCreator[];
  canEdit: boolean;
}

export const LICENSE_TYPE_LABELS: Record<TradeUkEcjuLicenseType, string> = {
  SIEL: "SIEL (Standard Individual)",
  OIEL: "OIEL (Open Individual)",
  OGEL: "OGEL (Open General)",
  SIEL_TC: "SIEL-TC (Temporary)",
  OITCL: "OITCL (Trade Control)",
};

export const STATUS_LABELS: Record<TradeUkEcjuLicenseStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
  REVOKED: "Revoked",
  EXHAUSTED: "Exhausted",
};

const STATUS_COLOURS: Record<TradeUkEcjuLicenseStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SUBMITTED: "bg-blue-100 text-blue-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-800",
  EXPIRED: "bg-amber-100 text-amber-800",
  REVOKED: "bg-zinc-200 text-zinc-700",
  EXHAUSTED: "bg-orange-100 text-orange-800",
};

export function UkEcjuListPanel({ licenses, canEdit }: UkEcjuListPanelProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <section className="rounded-xl border border-trade-border-subtle bg-trade-bg-elevated px-6 py-5">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-trade-text-primary">
            All ECJU licences
          </h2>
          <p className="mt-0.5 text-[12px] text-trade-text-muted">
            {licenses.length} {licenses.length === 1 ? "record" : "records"}
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-trade-accent px-3 py-1.5 text-[12.5px] font-semibold text-white shadow-sm transition-colors hover:bg-trade-accent-strong"
          >
            <Plus size={13} />
            New Licence
          </button>
        )}
      </header>

      {licenses.length === 0 ? (
        <p className="text-[13px] italic text-trade-text-muted">
          No ECJU licences yet.{" "}
          {canEdit
            ? 'Use "New Licence" above to draft your first SIEL, OIEL, or OGEL.'
            : "Ask a MANAGER+ teammate to create the first licence."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-trade-border-subtle text-left text-[11px] font-medium uppercase tracking-wide text-trade-text-muted">
                <th className="pb-2 pr-4 font-medium">Reference</th>
                <th className="pb-2 pr-4 font-medium">Type</th>
                <th className="pb-2 pr-4 font-medium">Applicant</th>
                <th className="pb-2 pr-4 font-medium">Destinations</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 pr-4 font-medium">Valid until</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-trade-border-subtle">
              {licenses.map((lic) => (
                <tr key={lic.id}>
                  <td className="py-3 pr-4">
                    <Link
                      href={`/trade/uk-ecju/${lic.id}`}
                      className="font-medium text-trade-text-primary hover:text-trade-accent-strong hover:underline"
                    >
                      {lic.ecjuReference ?? `(draft) ${lic.id.slice(-6)}`}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-trade-text-secondary">
                    {LICENSE_TYPE_LABELS[lic.licenseType]}
                  </td>
                  <td className="py-3 pr-4 text-trade-text-secondary">
                    {lic.applicantName}
                  </td>
                  <td className="py-3 pr-4 text-trade-text-secondary">
                    {lic.destinationCountries.length === 0
                      ? "—"
                      : lic.destinationCountries.slice(0, 4).join(", ") +
                        (lic.destinationCountries.length > 4
                          ? ` +${lic.destinationCountries.length - 4}`
                          : "")}
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLOURS[lic.status]}`}
                    >
                      {STATUS_LABELS[lic.status]}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-trade-text-secondary">
                    {lic.validUntil
                      ? lic.validUntil.toISOString().slice(0, 10)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {drawerOpen && canEdit && (
        <CreateLicenseDrawer onClose={() => setDrawerOpen(false)} />
      )}
    </section>
  );
}

interface CreateLicenseDrawerProps {
  onClose: () => void;
}

function CreateLicenseDrawer({ onClose }: CreateLicenseDrawerProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createUkEcjuLicenseAction(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-end bg-black/40"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="h-full w-full max-w-xl overflow-y-auto bg-trade-bg-elevated p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-4 flex items-center justify-between">
          <h3 className="text-[16px] font-semibold text-trade-text-primary">
            New UK ECJU Licence
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-trade-text-muted hover:bg-trade-hover hover:text-trade-text-primary"
            aria-label="Close drawer"
          >
            ×
          </button>
        </header>

        <form
          action={handleSubmit}
          className="space-y-3 text-[12.5px] text-trade-text-secondary"
        >
          <Field label="Licence type" name="licenseType">
            <select
              name="licenseType"
              required
              className="w-full rounded-md border border-trade-border px-2 py-1.5"
              defaultValue="SIEL"
            >
              {Object.entries(LICENSE_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Applicant name" name="applicantName">
            <input
              name="applicantName"
              required
              maxLength={500}
              className="w-full rounded-md border border-trade-border px-2 py-1.5"
            />
          </Field>

          <Field label="Applicant address" name="applicantAddress">
            <textarea
              name="applicantAddress"
              required
              maxLength={2000}
              rows={3}
              className="w-full rounded-md border border-trade-border px-2 py-1.5"
            />
          </Field>

          <Field
            label="Control-list entries (CSV)"
            name="controlListEntries"
            hint="e.g. PL5002A, ML10"
          >
            <input
              name="controlListEntries"
              className="w-full rounded-md border border-trade-border px-2 py-1.5"
            />
          </Field>

          <Field
            label="Destination countries (CSV, ISO-2)"
            name="destinationCountries"
            hint="e.g. IN, US, DE"
          >
            <input
              name="destinationCountries"
              className="w-full rounded-md border border-trade-border px-2 py-1.5"
            />
          </Field>

          <Field label="End-user name (required for SIEL)" name="endUserName">
            <input
              name="endUserName"
              maxLength={500}
              className="w-full rounded-md border border-trade-border px-2 py-1.5"
            />
          </Field>

          <Field label="End-user address" name="endUserAddress">
            <textarea
              name="endUserAddress"
              maxLength={2000}
              rows={2}
              className="w-full rounded-md border border-trade-border px-2 py-1.5"
            />
          </Field>

          <Field label="End-use description" name="endUseDescription">
            <textarea
              name="endUseDescription"
              maxLength={4000}
              rows={3}
              className="w-full rounded-md border border-trade-border px-2 py-1.5"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Valid from" name="validFrom">
              <input
                type="date"
                name="validFrom"
                className="w-full rounded-md border border-trade-border px-2 py-1.5"
              />
            </Field>
            <Field
              label="Valid until"
              name="validUntil"
              hint="Auto-defaults by licence type"
            >
              <input
                type="date"
                name="validUntil"
                className="w-full rounded-md border border-trade-border px-2 py-1.5"
              />
            </Field>
          </div>

          <Field
            label="Value cap (GBP pence)"
            name="capValueGbpPence"
            hint="Optional — multiply pounds by 100 (e.g. £10,000 → 1000000)"
          >
            <input
              type="number"
              name="capValueGbpPence"
              min="0"
              className="w-full rounded-md border border-trade-border px-2 py-1.5"
            />
          </Field>

          <Field label="Notes" name="notes">
            <textarea
              name="notes"
              maxLength={4000}
              rows={2}
              className="w-full rounded-md border border-trade-border px-2 py-1.5"
            />
          </Field>

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-red-700">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-trade-border px-3 py-1.5 text-trade-text-secondary hover:bg-trade-hover"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-trade-accent px-3 py-1.5 font-semibold text-white hover:bg-trade-accent-strong disabled:opacity-50"
            >
              {isPending ? "Creating…" : "Create draft"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  name: string;
  hint?: string;
  children: React.ReactNode;
}

function Field({ label, name, hint, children }: FieldProps) {
  return (
    <label className="block" htmlFor={name}>
      <span className="mb-1 block text-[11.5px] font-semibold uppercase tracking-wide text-trade-text-muted">
        {label}
      </span>
      {children}
      {hint && (
        <span className="mt-0.5 block text-[11px] text-trade-text-muted">
          {hint}
        </span>
      )}
    </label>
  );
}
