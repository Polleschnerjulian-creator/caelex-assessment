import { ITU_FILINGS } from "@/data/landing-rights/itu-filings";
import { ITUFilingCard } from "@/components/atlas/landing-rights/ITUFilingCard";

export const metadata = {
  title: "ITU Filings — Atlas Landing Rights",
  description:
    "ITU satellite network filings indexed with BIU status, Resolution 35 milestones, and deep-links to the ITU Space Network Systems database.",
};

export default function ITUFilingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-[32px] font-light tracking-tight text-[var(--atlas-text-primary)]">
          ITU Filings
          {/* Atlas V3 T2.E.23 (2026-05-26): explicit Beta badge so
              lawyers know the dataset is curated by hand from public
              ITU portals and the dataset coverage is incomplete. */}
          <span
            className="ml-3 inline-block align-middle rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300"
            aria-label="Beta — limited dataset coverage"
          >
            Beta
          </span>
        </h1>
        <p className="mt-1 text-[13px] text-[var(--atlas-text-secondary)] max-w-2xl">
          ITU Radio Regulations filings for the major operators tracked in
          Atlas. BIU status and Resolution 35 milestone progress where publicly
          verified. Deep-links point to the ITU Space Network Systems (SRS)
          database.
        </p>
        <p className="mt-2 text-[12px] text-amber-300/80 max-w-2xl">
          Beta-Hinweis: Dieser Datensatz wird manuell aus dem öffentlichen ITU
          SRS-Portal gepflegt und deckt aktuell die größten EU-Betreiber ab. Die
          ITU-API ist nicht öffentlich, daher kann es bei jüngsten Filings zu
          Verzögerungen kommen. Verlassen Sie sich für anwaltliche Beratung
          immer auf den SRS-Deep-Link.
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
