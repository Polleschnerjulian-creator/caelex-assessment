/**
 * Shared placeholder layout for Trade skeleton pages (Sprint T2).
 *
 * Items, Counterparties, Operations and Licenses all render the same
 * pattern — a coloured icon disc, a section title, a one-line subtitle
 * describing what the page will eventually do, and a "Coming in …"
 * badge. Extracted so the four route files stay tiny and we have
 * one place to update the look once Wave B sprints replace the
 * placeholders with real UI.
 */

import type { LucideIcon } from "lucide-react";

interface PlaceholderShellProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  comingIn: string;
}

export function PlaceholderShell({
  icon: Icon,
  title,
  subtitle,
  comingIn,
}: PlaceholderShellProps) {
  return (
    <div className="px-8 py-10">
      <div className="rounded-xl border border-trade-border-subtle bg-trade-bg-elevated px-8 py-12">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-trade-accent-soft text-trade-accent-strong">
          <Icon size={28} />
        </div>
        <h1 className="mt-5 text-[28px] font-bold tracking-tight text-trade-text-primary">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-[14px] text-trade-text-secondary">
          {subtitle}
        </p>
        <span className="mt-5 inline-flex items-center gap-1.5 rounded-md border border-trade-border-subtle bg-trade-bg-subtle px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-trade-text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-trade-accent" />
          Coming in {comingIn}
        </span>
      </div>
    </div>
  );
}
