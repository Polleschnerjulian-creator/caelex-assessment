"use client";

import { useState, useTransition } from "react";
import {
  TradeDeemedExportAuthorizationStatus,
  TradeDeemedExportAuthorizationType,
  type TradeDeemedExportAuthorization,
} from "@prisma/client";
import { updateDeemedExport } from "@/lib/trade/deemed-export/deemed-export-actions";

/**
 * Per-authorisation detail panel (Z13b, Tier 6).
 *
 * Renders the full record + lets MANAGER+ revoke or extend validity
 * inline. Read-only fields below the action row keep the legal
 * record visible for VIEWER + MEMBER roles.
 */

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

interface DetailPanelProps {
  row: TradeDeemedExportAuthorization;
  canEdit: boolean;
}

export function DeemedExportDetailPanel({ row, canEdit }: DetailPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();
  const [validUntilInput, setValidUntilInput] = useState(
    row.validUntil ? new Date(row.validUntil).toISOString().slice(0, 10) : "",
  );

  function revoke() {
    setError(undefined);
    if (
      !window.confirm(
        "Revoke this deemed-export authorisation? The employee will no longer be authorised to access the covered technology.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await updateDeemedExport({
        authorizationId: row.id,
        status: "REVOKED",
      });
      if (!result.ok) {
        setError(result.error);
      }
    });
  }

  function extendValidity(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    startTransition(async () => {
      const result = await updateDeemedExport({
        authorizationId: row.id,
        validUntil: validUntilInput || undefined,
      });
      if (!result.ok) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-trade-border-subtle bg-trade-bg-elevated px-6 py-5">
        <h2 className="text-[15px] font-semibold text-trade-text-primary">
          Authorisation details
        </h2>
        <dl className="mt-4 grid grid-cols-2 gap-y-3 gap-x-6 text-[12.5px]">
          <DT>Status</DT>
          <DD>
            <span
              className={`inline-flex items-center rounded-sm px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${toneFor(row.status)}`}
            >
              {STATUS_LABELS[row.status]}
            </span>
          </DD>

          <DT>Type</DT>
          <DD>{TYPE_LABELS[row.authorizationType]}</DD>

          {row.authorizationType === "EXEMPTION" ? (
            <>
              <DT>Exemption basis</DT>
              <DD>{row.exemptionBasis ?? "—"}</DD>
            </>
          ) : (
            <>
              <DT>Reference</DT>
              <DD className="font-mono">{row.authorizationReference ?? "—"}</DD>
            </>
          )}

          <DT>Most-recent citizenship</DT>
          <DD className="font-mono">{row.foreignNationality}</DD>

          <DT>Country of birth</DT>
          <DD className="font-mono">{row.nativeCountry}</DD>

          <DT>Valid from</DT>
          <DD>{new Date(row.validFrom).toISOString().slice(0, 10)}</DD>

          <DT>Valid until</DT>
          <DD>
            {row.validUntil
              ? new Date(row.validUntil).toISOString().slice(0, 10)
              : "no expiry"}
          </DD>

          <DT>Allowed ECCNs</DT>
          <DD className="font-mono">
            {row.allowedECCNs.length > 0 ? row.allowedECCNs.join(", ") : "—"}
          </DD>

          <DT>Allowed USML categories</DT>
          <DD className="font-mono">
            {row.allowedUSMLCategories.length > 0
              ? row.allowedUSMLCategories.join(", ")
              : "—"}
          </DD>

          <DT>Created</DT>
          <DD>{new Date(row.createdAt).toISOString().slice(0, 10)}</DD>

          <DT>Last updated</DT>
          <DD>{new Date(row.updatedAt).toISOString().slice(0, 10)}</DD>
        </dl>

        {row.notes && (
          <div className="mt-4 border-t border-trade-border-subtle pt-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-trade-text-muted">
              Notes
            </p>
            <p className="mt-1 whitespace-pre-wrap text-[12.5px] text-trade-text-secondary">
              {row.notes}
            </p>
          </div>
        )}
      </section>

      {canEdit && row.status === "ACTIVE" && (
        <section className="rounded-xl border border-trade-border-subtle bg-trade-bg-elevated px-6 py-5">
          <h2 className="text-[15px] font-semibold text-trade-text-primary">
            Manage
          </h2>

          <form onSubmit={extendValidity} className="mt-4 flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-[11.5px] font-medium uppercase tracking-wide text-trade-text-muted">
                Update validity end date
              </label>
              <input
                type="date"
                value={validUntilInput}
                onChange={(e) => setValidUntilInput(e.target.value)}
                className="mt-1 w-full rounded-md border border-trade-border bg-trade-bg-page px-3 py-2 text-[13px] text-trade-text-primary focus:border-trade-accent focus:outline-none focus:ring-1 focus:ring-trade-accent"
              />
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-trade-accent px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-trade-accent-strong disabled:opacity-60"
            >
              {isPending ? "Saving…" : "Save"}
            </button>
          </form>

          <div className="mt-4 border-t border-trade-border-subtle pt-4">
            <button
              type="button"
              onClick={revoke}
              disabled={isPending}
              className="rounded-md px-4 py-2 text-[12.5px] font-semibold transition-colors trade-chip-danger disabled:opacity-60"
            >
              Revoke authorisation
            </button>
            <p className="mt-1 text-[11.5px] text-trade-text-muted">
              Marks the row as REVOKED. The employee is no longer authorised to
              access the covered technology after this transition.
            </p>
          </div>

          {error && (
            <p className="mt-3 rounded-md px-3 py-2 text-[12.5px] trade-chip-danger">
              {error}
            </p>
          )}
        </section>
      )}
    </div>
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

function DT({ children }: { children: React.ReactNode }) {
  return (
    <dt className="text-[11px] font-medium uppercase tracking-wide text-trade-text-muted">
      {children}
    </dt>
  );
}

function DD({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <dd className={`text-[12.5px] text-trade-text-primary ${className}`}>
      {children}
    </dd>
  );
}
