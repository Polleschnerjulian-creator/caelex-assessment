/**
 * Apple-style QuickStart grid for the Trade welcome page.
 *
 * Replaces the flat KpiTile row with 4 hero cards that each surface
 * a primary entity (Items / Counterparties / Licenses / Operations)
 * via a 3D-style illustration + a single headline metric + tap-target
 * that navigates to the entity's list page.
 *
 * Visual rules (macOS Sonoma System Settings tile style):
 *   - Off-white card background, very subtle shadow
 *   - Rounded 14px corners
 *   - Illustration top, metric centered, sub-text muted
 *   - Hover: card lifts subtly via shadow + 1px translate
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import {
  ItemsIllustration,
  PartiesIllustration,
  LicensesIllustration,
  OperationsIllustration,
} from "./HeroIllustrations";

type HintTone = "ok" | "warn" | "neutral";

interface QuickStartCardProps {
  illustration: React.ReactNode;
  label: string;
  value: number | string;
  href: string;
  hint: string;
  hintTone?: HintTone;
}

function QuickStartCard({
  illustration,
  label,
  value,
  href,
  hint,
  hintTone = "neutral",
}: QuickStartCardProps) {
  const hintColor =
    hintTone === "ok"
      ? "text-emerald-600 dark:text-emerald-400"
      : hintTone === "warn"
        ? "text-amber-600 dark:text-amber-400"
        : "text-trade-text-muted";

  return (
    <Link
      href={href}
      className="group relative flex flex-col items-center gap-3 rounded-[14px] bg-trade-bg-panel p-6 ring-1 ring-black/[0.04] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.08)] dark:ring-white/[0.06]"
      style={{
        boxShadow:
          "0 1px 2px rgba(15, 23, 42, 0.04), 0 2px 6px rgba(15, 23, 42, 0.03)",
      }}
    >
      <div className="flex h-24 w-24 items-center justify-center">
        {illustration}
      </div>
      <div className="flex flex-col items-center gap-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-trade-text-muted">
          {label}
        </p>
        <p className="text-[28px] font-light leading-none tracking-tight text-trade-text-primary tabular-nums">
          {value}
        </p>
        <p className={`text-[12px] ${hintColor}`}>{hint}</p>
      </div>
    </Link>
  );
}

interface QuickStartGridProps {
  itemsCount: number;
  unclassifiedItemsCount: number;
  partiesTotal: number;
  partiesNeedingReview: number;
  licensesActiveCount: number;
  licensesExpiringCount: number;
  openOperations: number;
  operationsTotal: number;
}

export function QuickStartGrid({
  itemsCount,
  unclassifiedItemsCount,
  partiesTotal,
  partiesNeedingReview,
  licensesActiveCount,
  licensesExpiringCount,
  openOperations,
  operationsTotal,
}: QuickStartGridProps) {
  return (
    <section className="mb-12">
      <div className="mb-5 flex items-baseline justify-between">
        <h2 className="text-[13px] font-medium uppercase tracking-[0.08em] text-trade-text-muted">
          Quick start
        </h2>
        <p className="text-[12px] text-trade-text-muted">Tap to open</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickStartCard
          illustration={<ItemsIllustration />}
          label="Items"
          value={itemsCount}
          href="/trade/items"
          hint={
            unclassifiedItemsCount > 0
              ? `${unclassifiedItemsCount} need classification`
              : "All classified"
          }
          hintTone={unclassifiedItemsCount > 0 ? "warn" : "ok"}
        />

        <QuickStartCard
          illustration={<PartiesIllustration />}
          label="Counterparties"
          value={partiesTotal}
          href="/trade/counterparties"
          hint={
            partiesNeedingReview > 0
              ? `${partiesNeedingReview} need review`
              : "All screened"
          }
          hintTone={partiesNeedingReview > 0 ? "warn" : "ok"}
        />

        <QuickStartCard
          illustration={<LicensesIllustration />}
          label="Licenses"
          value={licensesActiveCount}
          href="/trade/licenses"
          hint={
            licensesExpiringCount > 0
              ? `${licensesExpiringCount} expiring ≤90d`
              : "No expiries ahead"
          }
          hintTone={licensesExpiringCount > 0 ? "warn" : "ok"}
        />

        <QuickStartCard
          illustration={<OperationsIllustration />}
          label="Operations"
          value={openOperations}
          href="/trade/operations"
          hint={`${operationsTotal} total · ${openOperations} active`}
          hintTone="neutral"
        />
      </div>
    </section>
  );
}

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
