import { ITU_FILINGS } from "@/data/landing-rights/itu-filings";
import { ITUFilingCard } from "@/components/atlas/landing-rights/ITUFilingCard";

export const metadata = {
  title: "ITU Filings — Atlas Landing Rights",
  description:
    "Statically curated ITU satellite network filings with BIU status, Resolution 35 milestones, and deep-links to the ITU Space Network Systems database.",
};

export default function ITUFilingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-[32px] font-light tracking-tight text-[var(--atlas-text-primary)]">
          ITU Filings
        </h1>
        <p className="mt-1 text-[13px] text-[var(--atlas-text-secondary)] max-w-2xl">
          ITU Radio Regulations filings for the major operators tracked in
          Atlas. BIU status and Resolution 35 milestone progress where publicly
          verified. Deep-links point to the ITU Space Network Systems (SRS)
          database.
        </p>
      </header>

      {ITU_FILINGS.length === 0 ? (
        <div className="rounded-xl bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border-subtle)] p-12 text-center text-[var(--atlas-text-muted)]">
          No filings seeded yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {ITU_FILINGS.map((filing) => (
            <ITUFilingCard key={filing.id} filing={filing} />
          ))}
        </div>
      )}
    </div>
  );
}
