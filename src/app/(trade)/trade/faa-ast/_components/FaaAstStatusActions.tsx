"use client";

import { useState, useTransition } from "react";
import { TradeFaaAstLicenseStatus } from "@prisma/client";
import { transitionFaaAstStatusAction } from "@/lib/trade/faa-ast/faa-ast-actions";
import { STATUS_LABELS } from "./FaaAstListPanel";

/**
 * Lifecycle action buttons for FAA AST detail page (Z38-US).
 *
 * Renders only the transitions valid from the current status so the
 * operator can't accidentally pick a forbidden state. Mirrors the
 * service-side state machine in faa-ast-service.ts.
 */

interface FaaAstStatusActionsProps {
  licenseId: string;
  currentStatus: TradeFaaAstLicenseStatus;
  faaReferenceSet: boolean;
}

const NEXT_STEPS: Record<TradeFaaAstLicenseStatus, TradeFaaAstLicenseStatus[]> =
  {
    DRAFT: ["PRE_APP_CONSULTATION", "REVOKED"],
    PRE_APP_CONSULTATION: ["APPLICATION_SUBMITTED", "DRAFT", "REVOKED"],
    APPLICATION_SUBMITTED: ["ENVIRONMENTAL_REVIEW", "REJECTED", "REVOKED"],
    ENVIRONMENTAL_REVIEW: ["UNDER_REVIEW", "REJECTED", "REVOKED"],
    UNDER_REVIEW: ["APPROVED", "REJECTED", "REVOKED"],
    APPROVED: ["EXPIRED", "REVOKED"],
    REJECTED: [],
    EXPIRED: [],
    REVOKED: [],
  };

export function FaaAstStatusActions({
  licenseId,
  currentStatus,
  faaReferenceSet,
}: FaaAstStatusActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pickedNext, setPickedNext] = useState<TradeFaaAstLicenseStatus | null>(
    null,
  );

  const options = NEXT_STEPS[currentStatus];
  if (options.length === 0) {
    return (
      <p className="text-[12px] italic text-trade-text-muted">
        {STATUS_LABELS[currentStatus]} is a terminal state — no further
        lifecycle transitions are available.
      </p>
    );
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    formData.set("licenseId", licenseId);
    if (pickedNext) formData.set("nextStatus", pickedNext);
    startTransition(async () => {
      const result = await transitionFaaAstStatusAction(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPickedNext(null);
    });
  }

  return (
    <section className="rounded-xl border border-trade-border-subtle bg-trade-bg-elevated p-5">
      <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-trade-text-muted">
        Lifecycle actions
      </h2>

      <div className="mb-3 flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => setPickedNext(opt)}
            disabled={isPending}
            className={`rounded-md border px-3 py-1.5 text-[12.5px] font-semibold transition-colors disabled:opacity-50 ${
              pickedNext === opt
                ? "border-trade-accent bg-trade-accent text-white"
                : "border-trade-border text-trade-text-secondary hover:bg-trade-hover"
            }`}
          >
            → {STATUS_LABELS[opt]}
          </button>
        ))}
      </div>

      {pickedNext && (
        <form action={handleSubmit} className="space-y-3 text-[12.5px]">
          {pickedNext === "APPROVED" && !faaReferenceSet && (
            <label className="block">
              <span className="mb-1 block text-[11.5px] font-semibold uppercase tracking-wide text-trade-text-muted">
                FAA reference (required)
              </span>
              <input
                type="text"
                name="faaReference"
                required
                placeholder="LRLO 22-119 / VOL 23-095"
                className="w-full rounded-md border border-trade-border px-2 py-1.5"
              />
            </label>
          )}

          {pickedNext === "APPROVED" && (
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-[11.5px] font-semibold uppercase tracking-wide text-trade-text-muted">
                  Valid from
                </span>
                <input
                  type="date"
                  name="validFrom"
                  className="w-full rounded-md border border-trade-border px-2 py-1.5"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11.5px] font-semibold uppercase tracking-wide text-trade-text-muted">
                  Valid until
                </span>
                <input
                  type="date"
                  name="validUntil"
                  className="w-full rounded-md border border-trade-border px-2 py-1.5"
                />
              </label>
            </div>
          )}

          <label className="block">
            <span className="mb-1 block text-[11.5px] font-semibold uppercase tracking-wide text-trade-text-muted">
              Note (optional, appended to the licence)
            </span>
            <textarea
              name="notes"
              rows={2}
              className="w-full rounded-md border border-trade-border px-2 py-1.5"
            />
          </label>

          {error && (
            <p className="rounded-md trade-chip-danger px-3 py-2">{error}</p>
          )}

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-trade-accent px-3 py-1.5 font-semibold text-white hover:bg-trade-accent-strong disabled:opacity-50"
            >
              {isPending
                ? "Updating…"
                : `Confirm → ${STATUS_LABELS[pickedNext]}`}
            </button>
            <button
              type="button"
              onClick={() => setPickedNext(null)}
              disabled={isPending}
              className="rounded-md border border-trade-border px-3 py-1.5 text-trade-text-secondary hover:bg-trade-hover"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
