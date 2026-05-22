"use client";

/**
 * /trade/operations/[id] — Detail placeholder (Sprint A3a interim).
 *
 * The full Operation detail view (Lines / Lifecycle / Licenses tabs +
 * BAFA PDF generator) ships in Sprint A3b. That sprint needs three
 * sizeable light-theme panels (OperationLinesPanel 643 LOC,
 * OperationLifecyclePanel 496 LOC, OperationLicensesPanel 710 LOC)
 * which are heavy enough to warrant their own commit.
 *
 * For A3a we ship this placeholder so:
 *   1. The list-page Operation row click target works (no 404)
 *   2. The user gets a clear pointer to the legacy detail surface,
 *      which is still production-ready in Welt A
 *   3. The route is reserved in the Trade brand surface so external
 *      links keep working when A3b lands
 */

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Construction } from "lucide-react";

export default function OperationDetailPlaceholder({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <div className="mx-auto max-w-screen-lg px-8 py-10">
      <Link
        href="/trade/operations"
        className="mb-6 inline-flex items-center gap-1.5 text-[12px] text-trade-text-secondary transition hover:text-trade-text-primary"
      >
        <ArrowLeft className="h-3 w-3" /> Operations
      </Link>

      <div className="rounded-md border border-trade-border-subtle bg-trade-bg-elevated p-10">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-trade-accent-soft text-trade-accent-strong">
          <Construction size={24} />
        </div>

        <h1 className="text-[24px] font-bold leading-tight tracking-tight text-trade-text-primary">
          Operation detail — coming in Sprint A3b
        </h1>
        <p className="mt-2 max-w-2xl text-[14px] text-trade-text-secondary">
          Three large sub-panels (Lines, Lifecycle, Licenses) plus the BAFA
          ELAN-K2 PDF generator need light-theme variants before the full
          Operation detail surface can ship here. Until then, the read-only
          legacy detail is fully functional in the Comply dashboard.
        </p>

        <Link
          href={`/dashboard/trade/operations/${id}`}
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-trade-accent px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-trade-accent-strong"
        >
          Open in Comply dashboard
          <ArrowRight className="h-4 w-4" />
        </Link>

        <p className="mt-4 text-[11px] text-trade-text-muted">
          Operation reference is preserved across both surfaces. Status
          transitions, line adds, and license attachments executed in the
          dashboard view will be visible here once A3b lands.
        </p>
      </div>
    </div>
  );
}
