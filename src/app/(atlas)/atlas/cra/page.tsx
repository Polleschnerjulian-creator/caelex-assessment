import { ShieldCheck, Calendar, ExternalLink } from "lucide-react";

/**
 * EU Cyber Resilience Act (CRA) — Regulation (EU) 2024/2847
 *
 * Only verifiable data: structure from the official text and key dates
 * from Art. 71 (entry into force / application). No interpretive or
 * derived commentary. Links to the official sources at the bottom.
 */

export const metadata = {
  title: "Cyber Resilience Act — Atlas",
  description:
    "Regulation (EU) 2024/2847 — Cyber Resilience Act. Chapter structure and key application dates sourced from the official consolidated text.",
};

const CHAPTERS = [
  { num: "I", title: "General Provisions", articles: "1–7" },
  { num: "II", title: "Obligations of Economic Operators", articles: "13–25" },
  { num: "III", title: "Conformity of the Product", articles: "26–33" },
  { num: "IV", title: "Notification of Conformity Bodies", articles: "34–48" },
  { num: "V", title: "Market Surveillance & Enforcement", articles: "49–57" },
  { num: "VI", title: "Delegated Powers & Committee", articles: "58–60" },
  { num: "VII", title: "Confidentiality & Penalties", articles: "61–64" },
  { num: "VIII", title: "Transitional & Final Provisions", articles: "65–71" },
];

const KEY_DATES = [
  { date: "10 Dec 2024", label: "Entered into force (Art. 71)" },
  {
    date: "11 Jun 2026",
    label: "Notified bodies may be designated (Art. 71(2))",
  },
  {
    date: "11 Sep 2026",
    label: "Reporting obligations begin (Art. 14 + 71(2))",
  },
  {
    date: "11 Dec 2027",
    label: "Full application — all obligations apply (Art. 71(2))",
  },
];

export default function CRAPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[var(--atlas-bg-page)] p-4 gap-3">
      <header className="flex items-center gap-3">
        <ShieldCheck className="h-5 w-5 text-emerald-600" strokeWidth={1.5} />
        <h1 className="text-[18px] font-semibold tracking-tight text-[var(--atlas-text-primary)]">
          Cyber Resilience Act
        </h1>
        <span className="text-[11px] text-[var(--atlas-text-faint)]">
          Regulation (EU) 2024/2847
        </span>
      </header>

      {/* Key dates — sourced from Art. 71 of the regulation */}
      <div className="rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar
            className="h-3.5 w-3.5 text-emerald-600"
            strokeWidth={1.5}
          />
          <span className="text-[11px] font-semibold tracking-wider text-[var(--atlas-text-muted)] uppercase">
            Key Dates
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {KEY_DATES.map((d) => (
            <div
              key={d.date}
              className="rounded-lg border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface-muted)] p-3"
            >
              <div className="text-[11px] font-semibold tracking-wider text-[var(--atlas-text-secondary)] uppercase mb-1">
                {d.date}
              </div>
              <div className="text-[12px] text-[var(--atlas-text-primary)]">
                {d.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chapter structure — sourced from the official TOC */}
      <div>
        <div className="flex items-center gap-2 mb-2 px-1">
          <span className="text-[11px] font-semibold tracking-wider text-[var(--atlas-text-muted)] uppercase">
            Structure
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {CHAPTERS.map((ch) => (
            <div
              key={ch.num}
              className="rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] p-4 shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-emerald-600 tracking-wider">
                  Chapter {ch.num}
                </span>
                <span className="text-[10px] text-[var(--atlas-text-faint)]">
                  Articles {ch.articles}
                </span>
              </div>
              <h3 className="text-[13px] font-medium text-[var(--atlas-text-primary)]">
                {ch.title}
              </h3>
            </div>
          ))}
        </div>
      </div>

      {/* Official sources */}
      <div className="rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[11px] font-semibold tracking-wider text-[var(--atlas-text-muted)] uppercase">
            Official Sources
          </span>
        </div>
        <ul className="space-y-2 text-[12px]">
          <li>
            <a
              href="https://eur-lex.europa.eu/eli/reg/2024/2847/oj"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 hover:underline"
            >
              Regulation (EU) 2024/2847 — EUR-Lex official text
              <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
            </a>
          </li>
          <li>
            <a
              href="https://digital-strategy.ec.europa.eu/en/policies/cyber-resilience-act"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 hover:underline"
            >
              European Commission — Cyber Resilience Act overview
              <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
            </a>
          </li>
          <li>
            <a
              href="https://www.enisa.europa.eu/topics/cyber-resilience-act"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 hover:underline"
            >
              ENISA — CRA implementation guidance
              <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
