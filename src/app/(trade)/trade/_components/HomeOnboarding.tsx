"use client";

import Link from "next/link";

/**
 * HomeOnboarding — the first-run "workflow" for a brand-new org.
 *
 * Premium technical language (Apple × Palantir, light): the three steps are
 * rendered as a numbered *pipeline* — connected nodes (node 1 = current) —
 * because they literally are a flow: classify → screen → verdict. No cards,
 * no emojis; hairline structure, monospace micro-labels, and the lone
 * functional colours live in the verdict legend (go / caution / stop).
 *
 * Each row is a Link to the step's surface; the trailing mono tag echoes the
 * destination. The single primary action ("Einschätzung starten") lives in
 * the sibling ApplicabilityGateBanner; this section closes with a quiet ghost
 * shortcut straight into a guided operation.
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
    <section data-testid="home-onboarding" className="py-7">
      <div className="mb-5 flex items-baseline justify-between">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-trade-text-muted">
          Erste Schritte
        </span>
        <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-trade-text-muted">
          Workflow
        </span>
      </div>

      {/* numbered pipeline — connected nodes, no cards */}
      <div>
        {STEPS.map((s, i) => (
          <Link
            key={s.n}
            href={s.href}
            className="group relative grid grid-cols-[28px_1fr_auto] items-center gap-[18px] rounded-lg py-[17px] pr-2 transition hover:bg-trade-hover"
          >
            {/* connector to the next node (relative → robust to row height) */}
            {i < STEPS.length - 1 ? (
              <span
                aria-hidden="true"
                className="absolute left-[14px] top-1/2 -z-0 h-full w-px -translate-x-1/2 bg-trade-border-strong"
              />
            ) : null}
            <span
              className={
                s.n === 1
                  ? "relative z-[1] flex h-7 w-7 items-center justify-center rounded-full bg-trade-text-primary font-mono text-[11px] text-trade-bg-panel"
                  : "relative z-[1] flex h-7 w-7 items-center justify-center rounded-full border border-trade-border-strong bg-trade-bg-page font-mono text-[11px] text-trade-text-muted"
              }
            >
              {s.n}
            </span>
            <div className="min-w-0">
              <div className="text-[14.5px] font-semibold tracking-[-0.012em] text-trade-text-primary">
                {s.title}
              </div>
              <div className="mt-0.5 text-[12.5px] leading-snug text-trade-text-muted">
                {s.body}
              </div>
            </div>
            <span className="flex items-center gap-2 whitespace-nowrap font-mono text-[10.5px] uppercase tracking-[0.12em] text-trade-text-muted transition group-hover:text-trade-text-secondary">
              {s.trail}
              <span className="text-[13px] transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </span>
          </Link>
        ))}
      </div>

      {/* verdict legend — the only colour, and it carries meaning */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 pl-[46px] font-mono text-[10.5px] uppercase tracking-[0.08em] text-trade-text-muted">
        <span className="text-trade-text-muted/70">Urteil</span>
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

      <hr className="mt-6 h-px border-0 bg-trade-border" />
      <div className="pt-6">
        <Link
          href="/trade/operations/new"
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-trade-border-strong px-[17px] text-[12.5px] font-semibold text-trade-text-primary transition hover:border-trade-text-muted hover:bg-trade-bg-elevated"
        >
          Ersten Vorgang starten
          <span className="font-mono opacity-80">→</span>
        </Link>
      </div>
    </section>
  );
}
