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
  const hintColorVar =
    hintTone === "ok"
      ? "var(--trade-accent-success)"
      : hintTone === "warn"
        ? "var(--trade-accent-warn)"
        : "var(--trade-label-tertiary)";

  return (
    <Link
      href={href}
      className="group relative flex flex-col items-center gap-3 rounded-[12px] p-6 transition-colors"
      style={{
        background: "var(--trade-surface-secondary)",
        border: "1px solid var(--trade-separator)",
        transitionTimingFunction: "var(--trade-ease-out-quad)",
        transitionDuration: "var(--trade-dur-fast)",
      }}
      data-apple-card="quick-start"
    >
      <div className="flex h-20 w-20 items-center justify-center">
        {illustration}
      </div>
      <div className="flex flex-col items-center gap-0.5">
        <p
          className="text-[12px] font-medium uppercase tracking-[0.06em]"
          style={{ color: "var(--trade-label-tertiary)" }}
        >
          {label}
        </p>
        <p
          className="text-[28px] leading-none tracking-[-0.022em] tabular-nums"
          style={{ color: "var(--trade-label)", fontWeight: 600 }}
        >
          {value}
        </p>
        <p className="mt-0.5 text-[13px]" style={{ color: hintColorVar }}>
          {hint}
        </p>
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
        <h2
          className="text-[13px] font-semibold uppercase tracking-[0.06em]"
          style={{ color: "var(--trade-label-tertiary)" }}
        >
          Quick start
        </h2>
        <p
          className="text-[12px]"
          style={{ color: "var(--trade-label-tertiary)" }}
        >
          Tap to open
        </p>
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
