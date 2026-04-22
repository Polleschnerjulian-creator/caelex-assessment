import type { CategoryDeepDive } from "@/data/landing-rights";
import { LastVerifiedStamp } from "./LastVerifiedStamp";

export function CategoryDeepDiveView({ entry }: { entry: CategoryDeepDive }) {
  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <header>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--atlas-text-faint)]">
            {entry.category.replace("_", " ")}
          </span>
          <span className="text-[22px] font-bold text-[var(--atlas-text-primary)]">
            {entry.jurisdiction}
          </span>
        </div>
        <h1 className="text-[28px] font-light tracking-tight text-[var(--atlas-text-primary)]">
          {entry.title}
        </h1>
        <div className="mt-2">
          <LastVerifiedStamp date={entry.last_verified} />
        </div>
      </header>
      <p className="text-[15px] leading-relaxed text-[var(--atlas-text-primary)]">
        {entry.summary}
      </p>
      <section>
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--atlas-text-faint)] mb-3">
          Key provisions
        </h2>
        <div className="space-y-4">
          {entry.key_provisions.map((p, i) => (
            <div
              key={i}
              className="rounded-xl bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border-subtle)] p-5"
            >
              <h3 className="text-[14px] font-semibold text-[var(--atlas-text-primary)] mb-1">
                {p.title}
              </h3>
              <p className="text-[13px] text-[var(--atlas-text-secondary)] leading-relaxed">
                {p.body}
              </p>
              {p.citation && (
                <p className="mt-2 text-[11px] font-medium text-[var(--atlas-text-muted)]">
                  {p.citation}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>
      {entry.practical_notes && (
        <section className="rounded-xl bg-amber-50/40 border border-amber-100 p-5">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-700 mb-2">
            Practical notes
          </h2>
          <p className="text-[13px] text-amber-900 leading-relaxed">
            {entry.practical_notes}
          </p>
        </section>
      )}
    </div>
  );
}
