import { ALL_CASE_STUDIES } from "@/data/landing-rights";
import { CaseStudyCard } from "@/components/atlas/landing-rights/CaseStudyCard";

export const metadata = { title: "Landing Rights Case Studies — Atlas" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-[28px] font-light tracking-tight text-[var(--atlas-text-primary)]">
          Case Studies
        </h1>
        <p className="mt-1 text-[13px] text-[var(--atlas-text-secondary)]">
          Narrative precedents illustrating how landing-rights regimes play out
          in practice.
        </p>
      </header>
      {ALL_CASE_STUDIES.length === 0 ? (
        <p className="text-[var(--atlas-text-muted)]">No case studies yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ALL_CASE_STUDIES.map((cs) => (
            <CaseStudyCard key={cs.id} cs={cs} />
          ))}
        </div>
      )}
    </div>
  );
}
