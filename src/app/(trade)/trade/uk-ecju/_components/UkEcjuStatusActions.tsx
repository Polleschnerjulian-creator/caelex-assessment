"use client";

import { useState, useTransition } from "react";
import { TradeUkEcjuLicenseStatus } from "@prisma/client";
import { transitionUkEcjuStatusAction } from "@/lib/trade/uk-ecju/uk-ecju-actions";
import { STATUS_LABELS } from "./UkEcjuListPanel";

/**
 * Lifecycle action buttons for UK ECJU detail page (Z37-UK).
 *
 * Renders only the transitions valid from the current status so the
 * operator can't accidentally pick a forbidden state. Mirrors the
 * service-side state machine in uk-ecju-service.ts.
 */

interface UkEcjuStatusActionsProps {
  licenseId: string;
  currentStatus: TradeUkEcjuLicenseStatus;
  ecjuReferenceSet: boolean;
}

const NEXT_STEPS: Record<TradeUkEcjuLicenseStatus, TradeUkEcjuLicenseStatus[]> =
  {
    DRAFT: ["SUBMITTED", "REVOKED"],
    SUBMITTED: ["APPROVED", "REJECTED", "REVOKED"],
    APPROVED: ["EXPIRED", "REVOKED", "EXHAUSTED"],
    REJECTED: [],
    EXPIRED: [],
    REVOKED: [],
    EXHAUSTED: ["EXPIRED"],
  };

export function UkEcjuStatusActions({
  licenseId,
  currentStatus,
  ecjuReferenceSet,
}: UkEcjuStatusActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pickedNext, setPickedNext] = useState<TradeUkEcjuLicenseStatus | null>(
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
      const result = await transitionUkEcjuStatusAction(formData);
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
          {pickedNext === "APPROVED" && !ecjuReferenceSet && (
            <label className="block">
              <span className="mb-1 block text-[11.5px] font-semibold uppercase tracking-wide text-trade-text-muted">
                ECJU reference (required)
              </span>
              <input
                type="text"
                name="ecjuReference"
                required
                placeholder="GBSIEL/2026/0012345"
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
            <p className="rounded-md bg-red-50 px-3 py-2 text-red-700">
              {error}
            </p>
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
