"use client";

import Link from "next/link";

/**
 * HomeOnboarding — the first-run "workflow" for a brand-new org.
 *
 * Neon-console style (light): a white rounded card with a titled header, the
 * three steps as clean list rows (numbered chip + title/desc + blue link
 * trail), and a footer carrying the verdict legend + a secondary CTA into a
 * guided operation. The three steps are Passage's signature flow:
 * classify → screen → verdict.
 */

const STEPS = [
  {
    n: 1,
    title: "Was lieferst du?",
    body: "Artikel anlegen — automatische Klassifizierung nach ECCN / USML.",
    trail: "Artikel",
    href: "/trade/items",
  },
  {
    n: 2,
    title: "An wen?",
    body: "Partner anlegen — Screening gegen Sanktions- und Denied-Party-Listen.",
    trail: "Partner",
    href: "/trade/parties",
  },
  {
    n: 3,
    title: "Darf ich liefern?",
    body: "Geführter Vorgang — ein klares Urteil in einem Flow.",
    trail: "Vorgang",
    href: "/trade/operations/new",
  },
] as const;

const VERDICTS = [
  { label: "Freigegeben", color: "var(--trade-accent-success)" },
  { label: "Auflage", color: "var(--trade-accent-warn)" },
  { label: "Blockiert", color: "var(--trade-accent-danger)" },
] as const;

export function HomeOnboarding() {
  return (
    <section
      data-testid="home-onboarding"
      className="overflow-hidden rounded-xl border border-trade-border bg-trade-bg-panel shadow-[var(--trade-shadow-card)]"
    >
      <div className="flex items-center justify-between border-b border-trade-border-subtle px-5 py-4">
        <h2 className="text-[14px] font-semibold text-trade-text-primary">
          Erste Schritte
        </h2>
        <span className="text-[12px] text-trade-text-muted">Workflow</span>
      </div>

      {/* steps as clean list rows */}
      <div>
        {STEPS.map((s) => (
          <Link
            key={s.n}
            href={s.href}
            className="group flex items-center gap-4 border-b border-trade-border-subtle px-5 py-4 transition last:border-b-0 hover:bg-trade-hover"
          >
            <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-trade-bg-subtle text-[12px] font-semibold text-trade-text-secondary">
              {s.n}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-semibold text-trade-text-primary">
                {s.title}
              </div>
              <div className="mt-0.5 text-[12.5px] leading-snug text-trade-text-muted">
                {s.body}
              </div>
            </div>
            <span
              className="flex items-center gap-1.5 whitespace-nowrap text-[12.5px] font-medium"
              style={{ color: "var(--trade-link)" }}
            >
              {s.trail}
              <span className="transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </span>
          </Link>
        ))}
      </div>

      {/* footer: verdict legend + secondary CTA */}
      <div className="flex flex-col gap-3 border-t border-trade-border-subtle px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-trade-text-muted">
          <span className="font-medium text-trade-text-secondary">Urteil</span>
          {VERDICTS.map((v) => (
            <span key={v.label} className="inline-flex items-center gap-1.5">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: v.color }}
                aria-hidden="true"
              />
              {v.label}
            </span>
          ))}
        </div>
        <Link
          href="/trade/operations/new"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-trade-border bg-trade-bg-panel px-4 text-[13px] font-medium text-trade-text-primary transition hover:bg-trade-hover"
        >
          Ersten Vorgang starten
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
