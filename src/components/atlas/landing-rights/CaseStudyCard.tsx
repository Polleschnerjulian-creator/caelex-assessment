import Link from "next/link";
import type { CaseStudy } from "@/data/landing-rights";

export function CaseStudyCard({ cs }: { cs: CaseStudy }) {
  return (
    <Link
      href={`/atlas/landing-rights/case-studies/${cs.id}`}
      className="flex flex-col gap-2 p-5 rounded-xl bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border-subtle)] hover:border-[var(--atlas-border-strong)] hover:shadow-sm transition"
    >
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-bold text-[var(--atlas-text-primary)] bg-[var(--atlas-bg-inset)] rounded-md px-2 py-0.5">
          {cs.jurisdiction}
        </span>
        <span className="text-[11px] text-[var(--atlas-text-muted)]">
          {cs.operator}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-[var(--atlas-text-faint)]">
          {cs.outcome}
        </span>
      </div>
      <h3 className="text-[15px] font-semibold text-[var(--atlas-text-primary)] leading-snug">
        {cs.title}
      </h3>
      <p className="text-[11px] text-[var(--atlas-text-muted)]">
        {cs.date_range.from} → {cs.date_range.to ?? "ongoing"}
      </p>
    </Link>
  );
}
