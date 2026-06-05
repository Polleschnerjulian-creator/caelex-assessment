"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import {
  TradeFaaAstLicenseStatus,
  TradeFaaAstLicenseType,
  TradeFaaAstVehicleType,
  TradeFaaAstFinancialResponsibilityType,
} from "@prisma/client";
import type { FaaAstLicenseWithCreator } from "@/lib/trade/faa-ast/faa-ast-service";
import { createFaaAstLicenseAction } from "@/lib/trade/faa-ast/faa-ast-actions";

/**
 * FAA AST licence list panel (Z38-US, Tier 4).
 *
 * Server component (page.tsx) passes the data; this client wrapper
 * owns the create-drawer state and per-row navigation links.
 */

interface FaaAstListPanelProps {
  licenses: FaaAstLicenseWithCreator[];
  canEdit: boolean;
}

export const LICENSE_TYPE_LABELS: Record<TradeFaaAstLicenseType, string> = {
  PART_450_LAUNCH: "Part 450 Launch",
  PART_450_REENTRY: "Part 450 Re-Entry",
  PART_450_VEHICLE_OPERATOR: "Part 450 Vehicle Operator",
  PART_435_REENTRY_REUSABLE: "Part 435 RLV Re-Entry",
};

export const VEHICLE_TYPE_LABELS: Record<TradeFaaAstVehicleType, string> = {
  SUB_ORBITAL: "Sub-Orbital",
  ORBITAL: "Orbital",
  REUSABLE: "Reusable",
  EXPENDABLE: "Expendable",
};

export const FIN_RESP_LABELS: Record<
  TradeFaaAstFinancialResponsibilityType,
  string
> = {
  MAX_PROBABLE_LOSS: "Max Probable Loss (§ 440.9(b))",
  FAA_DETERMINED: "FAA-Determined",
  SELF_INSURED: "Self-Insured (§ 440.9(c))",
};

export const STATUS_LABELS: Record<TradeFaaAstLicenseStatus, string> = {
  DRAFT: "Draft",
  PRE_APP_CONSULTATION: "Pre-App Consultation",
  APPLICATION_SUBMITTED: "Application Submitted",
  ENVIRONMENTAL_REVIEW: "NEPA Environmental Review",
  UNDER_REVIEW: "FAA Technical Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
  REVOKED: "Revoked",
};

const STATUS_COLOURS: Record<TradeFaaAstLicenseStatus, string> = {
  DRAFT: "trade-chip-neutral",
  PRE_APP_CONSULTATION: "trade-chip-info",
  APPLICATION_SUBMITTED: "trade-chip-info",
  ENVIRONMENTAL_REVIEW: "trade-chip-info",
  UNDER_REVIEW: "trade-chip-neutral",
  APPROVED: "trade-chip-success",
  REJECTED: "trade-chip-danger",
  EXPIRED: "trade-chip-warn",
  REVOKED: "trade-chip-neutral",
};

export function FaaAstListPanel({ licenses, canEdit }: FaaAstListPanelProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <section className="rounded-xl border border-trade-border-subtle bg-trade-bg-elevated px-6 py-5">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-trade-text-primary">
            All FAA AST licences
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
          No FAA AST licences yet.{" "}
          {canEdit
            ? 'Use "New Licence" above to draft your first Part 450 application.'
            : "Ask a MANAGER+ teammate to create the first licence."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-trade-border-subtle text-left text-[11px] font-medium uppercase tracking-wide text-trade-text-muted">
                <th className="pb-2 pr-4 font-medium">Reference</th>
                <th className="pb-2 pr-4 font-medium">Type</th>
                <th className="pb-2 pr-4 font-medium">Operator</th>
                <th className="pb-2 pr-4 font-medium">Vehicle</th>
                <th className="pb-2 pr-4 font-medium">Launch site</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 pr-4 font-medium">Valid until</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-trade-border-subtle">
              {licenses.map((lic) => (
                <tr key={lic.id}>
                  <td className="py-3 pr-4">
                    <Link
                      href={`/trade/faa-ast/${lic.id}`}
                      className="font-medium text-trade-text-primary hover:text-trade-accent-strong hover:underline"
                    >
                      {lic.faaReference ?? `(draft) ${lic.id.slice(-6)}`}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-trade-text-secondary">
                    {LICENSE_TYPE_LABELS[lic.licenseType]}
                  </td>
                  <td className="py-3 pr-4 text-trade-text-secondary">
                    {lic.operatorName}
                  </td>
                  <td className="py-3 pr-4 text-trade-text-secondary">
                    {lic.vehicleName}
                    <span className="ml-1 text-[10.5px] uppercase text-trade-text-muted">
                      ({VEHICLE_TYPE_LABELS[lic.vehicleType]})
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-trade-text-secondary">
                    {lic.launchSite}
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
      const result = await createFaaAstLicenseAction(formData);
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
            New FAA AST Licence
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
              defaultValue="PART_450_LAUNCH"
            >
              {Object.entries(LICENSE_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Operator name" name="operatorName">
            <input
              name="operatorName"
              required
              maxLength={500}
              placeholder="Space Exploration Technologies Corp."
              className="w-full rounded-md border border-trade-border px-2 py-1.5"
            />
          </Field>

          <Field label="Operator address" name="operatorAddress">
            <textarea
              name="operatorAddress"
              required
              maxLength={2000}
              rows={3}
              className="w-full rounded-md border border-trade-border px-2 py-1.5"
            />
          </Field>

          <Field
            label="Launch site"
            name="launchSite"
            hint="e.g. Cape Canaveral SFS LC-39A, VSFB SLC-4E, Boca Chica (Starbase)"
          >
            <input
              name="launchSite"
              required
              maxLength={200}
              className="w-full rounded-md border border-trade-border px-2 py-1.5"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Vehicle name" name="vehicleName">
              <input
                name="vehicleName"
                required
                maxLength={200}
                placeholder="Falcon 9, Electron, etc."
                className="w-full rounded-md border border-trade-border px-2 py-1.5"
              />
            </Field>
            <Field label="Vehicle type" name="vehicleType">
              <select
                name="vehicleType"
                required
                className="w-full rounded-md border border-trade-border px-2 py-1.5"
                defaultValue="ORBITAL"
              >
                {Object.entries(VEHICLE_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field
            label="Max Probability of Casualty (Ec)"
            name="maximumProbabilityOfCasualtyEc"
            hint="§ 450.101 ceiling: ≤ 1.0e-4. Decimal (e.g. 0.00005 = 5e-5)"
          >
            <input
              type="text"
              name="maximumProbabilityOfCasualtyEc"
              placeholder="0.00005"
              className="w-full rounded-md border border-trade-border px-2 py-1.5"
            />
          </Field>

          <Field
            label="Third-party liability cap (USD cents)"
            name="thirdPartyLiabilityCapUsdCents"
            hint="Optional — multiply USD by 100 (e.g. $500M → 50000000000)"
          >
            <input
              type="number"
              name="thirdPartyLiabilityCapUsdCents"
              min="0"
              className="w-full rounded-md border border-trade-border px-2 py-1.5"
            />
          </Field>

          <Field
            label="Financial responsibility type"
            name="financialResponsibilityType"
          >
            <select
              name="financialResponsibilityType"
              className="w-full rounded-md border border-trade-border px-2 py-1.5"
              defaultValue=""
            >
              <option value="">(not yet determined)</option>
              {Object.entries(FIN_RESP_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
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
              hint="Auto-defaults to 5 years (Part 450)"
            >
              <input
                type="date"
                name="validUntil"
                className="w-full rounded-md border border-trade-border px-2 py-1.5"
              />
            </Field>
          </div>

          <Field label="Notes" name="notes">
            <textarea
              name="notes"
              maxLength={4000}
              rows={2}
              className="w-full rounded-md border border-trade-border px-2 py-1.5"
            />
          </Field>

          {error && (
            <p className="rounded-md trade-chip-danger px-3 py-2">{error}</p>
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
