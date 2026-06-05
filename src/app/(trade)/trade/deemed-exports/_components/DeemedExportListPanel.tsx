"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import {
  TradeDeemedExportAuthorizationStatus,
  TradeDeemedExportAuthorizationType,
  type TradeDeemedExportAuthorization,
} from "@prisma/client";
import { createDeemedExport } from "@/lib/trade/deemed-export/deemed-export-actions";
import { EditSectionDrawer } from "../../program/_components/EditSectionDrawer";

/**
 * Deemed-export list panel (Z13b, Tier 6).
 *
 * Server component (page.tsx) passes the data; this client wrapper
 * owns the create-drawer state and per-row status badges.
 */

interface DeemedExportListPanelProps {
  rows: TradeDeemedExportAuthorization[];
  canEdit: boolean;
}

const TYPE_LABELS: Record<TradeDeemedExportAuthorizationType, string> = {
  DEEMED_EXPORT_LICENSE: "Deemed Export Licence (BIS)",
  EAR_LICENSE: "EAR Licence",
  ITAR_TAA_OR_MLA: "ITAR TAA / MLA",
  EXEMPTION: "Exemption",
};

const STATUS_LABELS: Record<TradeDeemedExportAuthorizationStatus, string> = {
  ACTIVE: "Active",
  EXPIRED: "Expired",
  REVOKED: "Revoked",
};

export function DeemedExportListPanel({
  rows,
  canEdit,
}: DeemedExportListPanelProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <section className="rounded-xl border border-trade-border-subtle bg-trade-bg-elevated px-6 py-5">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-trade-text-primary">
            All authorisations
          </h2>
          <p className="mt-0.5 text-[12px] text-trade-text-muted">
            {rows.length} {rows.length === 1 ? "record" : "records"}
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-trade-accent px-3 py-1.5 text-[12.5px] font-semibold text-white shadow-sm transition-colors hover:bg-trade-accent-strong"
          >
            <Plus size={13} />
            New authorisation
          </button>
        )}
      </header>

      {rows.length === 0 ? (
        <p className="text-[13px] italic text-trade-text-muted">
          No deemed-export authorisations yet.{" "}
          {canEdit
            ? "Use “New authorisation” above to add your first row."
            : "Ask a MANAGER+ teammate to create the first authorisation."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-trade-border-subtle text-left text-[11px] font-medium uppercase tracking-wide text-trade-text-muted">
                <th className="pb-2 pr-4 font-medium">Employee</th>
                <th className="pb-2 pr-4 font-medium">Nationality</th>
                <th className="pb-2 pr-4 font-medium">Type</th>
                <th className="pb-2 pr-4 font-medium">Reference</th>
                <th className="pb-2 pr-4 font-medium">Coverage</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 pr-4 font-medium">Valid until</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-trade-border-subtle">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="py-3 pr-4">
                    <Link
                      href={`/trade/deemed-exports/${row.id}`}
                      className="font-medium text-trade-text-primary hover:text-trade-accent-strong hover:underline"
                    >
                      {row.foreignNationalName ?? row.foreignNationalEmployeeId}
                    </Link>
                    {row.foreignNationalName && (
                      <p className="text-[11px] text-trade-text-muted">
                        ID: {row.foreignNationalEmployeeId}
                      </p>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <span className="text-trade-text-primary">
                      {row.foreignNationality}
                    </span>
                    {row.nativeCountry !== row.foreignNationality && (
                      <span className="ml-1 text-[11px] text-trade-text-muted">
                        (born {row.nativeCountry})
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-trade-text-secondary">
                    {TYPE_LABELS[row.authorizationType]}
                  </td>
                  <td className="py-3 pr-4 font-mono text-[11.5px] text-trade-text-secondary">
                    {row.authorizationReference ??
                      (row.exemptionBasis
                        ? `Exempt: ${row.exemptionBasis}`
                        : "—")}
                  </td>
                  <td className="py-3 pr-4 text-trade-text-secondary">
                    <CoveragePills
                      eccns={row.allowedECCNs}
                      usmls={row.allowedUSMLCategories}
                    />
                  </td>
                  <td className="py-3 pr-4">
                    <StatusPill status={row.status} />
                  </td>
                  <td className="py-3 pr-4 text-trade-text-secondary">
                    {row.validUntil
                      ? new Date(row.validUntil).toISOString().slice(0, 10)
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
        title="New deemed-export authorisation"
        description="Authorise a foreign-national employee to access a specific scope of US-controlled technology in-country. Covers ECCN entries (EAR side) and/or USML categories (ITAR side)."
      >
        <CreateDeemedExportForm
          onSuccess={() => setDrawerOpen(false)}
          onCancel={() => setDrawerOpen(false)}
        />
      </EditSectionDrawer>
    </section>
  );
}

// ─── Coverage pills ─────────────────────────────────────────────────

function CoveragePills({ eccns, usmls }: { eccns: string[]; usmls: string[] }) {
  if (eccns.length === 0 && usmls.length === 0) {
    return (
      <span className="text-[11px] italic text-trade-text-muted">none</span>
    );
  }
  return (
    <div className="flex flex-wrap gap-1">
      {eccns.slice(0, 3).map((c) => (
        <span
          key={`e-${c}`}
          className="inline-flex items-center rounded bg-trade-accent-soft px-1.5 py-0.5 font-mono text-[10.5px] text-trade-accent-strong"
        >
          {c}
        </span>
      ))}
      {usmls.slice(0, 3).map((c) => (
        <span
          key={`u-${c}`}
          className="inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10.5px] trade-chip-warn"
        >
          USML {c}
        </span>
      ))}
      {eccns.length + usmls.length > 3 && (
        <span className="text-[10.5px] text-trade-text-muted">
          +{eccns.length + usmls.length - 3}
        </span>
      )}
    </div>
  );
}

// ─── Status pill ────────────────────────────────────────────────────

function StatusPill({
  status,
}: {
  status: TradeDeemedExportAuthorizationStatus;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-sm px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${toneFor(status)}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function toneFor(status: TradeDeemedExportAuthorizationStatus): string {
  switch (status) {
    case "ACTIVE":
      return "trade-chip-success";
    case "EXPIRED":
      return "trade-chip-neutral";
    case "REVOKED":
      return "trade-chip-danger";
  }
}

// ─── Create form ────────────────────────────────────────────────────

interface CreateFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

function CreateDeemedExportForm({ onSuccess, onCancel }: CreateFormProps) {
  const [authorizationType, setAuthorizationType] =
    useState<TradeDeemedExportAuthorizationType>("DEEMED_EXPORT_LICENSE");
  const [foreignNationalEmployeeId, setEmpId] = useState("");
  const [foreignNationalName, setEmpName] = useState("");
  const [foreignNationality, setNationality] = useState("");
  const [nativeCountry, setNative] = useState("");
  const [exemptionBasis, setExemptionBasis] = useState("");
  const [authorizationReference, setRef] = useState("");
  const [allowedECCNs, setEccns] = useState("");
  const [allowedUSMLCategories, setUsmls] = useState("");
  const [validFrom, setValidFrom] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    startTransition(async () => {
      const result = await createDeemedExport({
        foreignNationalEmployeeId,
        foreignNationalName: foreignNationalName || undefined,
        foreignNationality,
        nativeCountry: nativeCountry || foreignNationality,
        authorizationType,
        exemptionBasis: exemptionBasis || undefined,
        authorizationReference: authorizationReference || undefined,
        allowedECCNs: allowedECCNs || undefined,
        allowedUSMLCategories: allowedUSMLCategories || undefined,
        validFrom,
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

  const isExemption = authorizationType === "EXEMPTION";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Employee ID</label>
          <input
            type="text"
            value={foreignNationalEmployeeId}
            onChange={(e) => setEmpId(e.target.value)}
            placeholder="HR-12345"
            className={fieldClass}
            required
          />
          <p className="mt-1 text-[11.5px] text-trade-text-muted">
            Your HR employee ID — not a Caelex login.
          </p>
        </div>
        <div>
          <label className={labelClass}>Display name (optional)</label>
          <input
            type="text"
            value={foreignNationalName}
            onChange={(e) => setEmpName(e.target.value)}
            placeholder="Wei Chen"
            className={fieldClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Most-recent citizenship (ISO-2)</label>
          <input
            type="text"
            value={foreignNationality}
            onChange={(e) => setNationality(e.target.value.toUpperCase())}
            placeholder="CN"
            maxLength={2}
            className={`${fieldClass} font-mono uppercase`}
            required
          />
        </div>
        <div>
          <label className={labelClass}>Country of birth (ISO-2)</label>
          <input
            type="text"
            value={nativeCountry}
            onChange={(e) => setNative(e.target.value.toUpperCase())}
            placeholder="CN"
            maxLength={2}
            className={`${fieldClass} font-mono uppercase`}
          />
          <p className="mt-1 text-[11.5px] text-trade-text-muted">
            Defaults to citizenship if blank. Dual-nationality cases apply the
            more restrictive of the two (EAR Supplement No. 1 to Part 760).
          </p>
        </div>
      </div>

      <div>
        <label className={labelClass}>Authorisation type</label>
        <select
          value={authorizationType}
          onChange={(e) =>
            setAuthorizationType(
              e.target.value as TradeDeemedExportAuthorizationType,
            )
          }
          className={fieldClass}
        >
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {isExemption ? (
        <div>
          <label className={labelClass}>Exemption basis</label>
          <input
            type="text"
            value={exemptionBasis}
            onChange={(e) => setExemptionBasis(e.target.value)}
            placeholder="e.g. STA-740.20 / ENC-740.17 / country-of-birth-US-naturalised"
            className={fieldClass}
            required
          />
        </div>
      ) : (
        <div>
          <label className={labelClass}>Authorisation reference</label>
          <input
            type="text"
            value={authorizationReference}
            onChange={(e) => setRef(e.target.value)}
            placeholder="BIS D-12345 / DDTC TAA-67890"
            className={fieldClass}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Allowed ECCNs (comma-separated)</label>
          <input
            type="text"
            value={allowedECCNs}
            onChange={(e) => setEccns(e.target.value)}
            placeholder="9E515, 5E002"
            className={`${fieldClass} font-mono`}
          />
        </div>
        <div>
          <label className={labelClass}>Allowed USML categories</label>
          <input
            type="text"
            value={allowedUSMLCategories}
            onChange={(e) => setUsmls(e.target.value)}
            placeholder="XV, VIII"
            className={`${fieldClass} font-mono`}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Valid from</label>
          <input
            type="date"
            value={validFrom}
            onChange={(e) => setValidFrom(e.target.value)}
            className={fieldClass}
            required
          />
        </div>
        <div>
          <label className={labelClass}>Valid until (optional)</label>
          <input
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            className={fieldClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className={fieldClass}
          placeholder="Operator notes, follow-ups, counsel guidance, …"
        />
      </div>

      {error && (
        <p className="rounded-md px-3 py-2 text-[12.5px] trade-chip-danger">
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
          disabled={
            isPending || !foreignNationalEmployeeId || !foreignNationality
          }
          className="rounded-md bg-trade-accent px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-trade-accent-strong disabled:opacity-60"
        >
          {isPending ? "Creating…" : "Create authorisation"}
        </button>
      </div>
    </form>
  );
}

const labelClass =
  "block text-[11.5px] font-medium uppercase tracking-wide text-trade-text-muted";
const fieldClass =
  "mt-1 w-full rounded-md border border-trade-border bg-trade-bg-page px-3 py-2 text-[13px] text-trade-text-primary placeholder:text-trade-text-muted focus:border-trade-accent focus:outline-none focus:ring-1 focus:ring-trade-accent";
