import type { CaseStudy } from "@/data/landing-rights";
import { LastVerifiedStamp } from "./LastVerifiedStamp";

export function CaseStudyView({ cs }: { cs: CaseStudy }) {
  return (
    <article className="flex flex-col gap-6 max-w-3xl">
      <header>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[12px] font-bold text-gray-900 bg-gray-100 rounded-md px-2 py-1">
            {cs.jurisdiction}
          </span>
          <span className="text-[13px] text-gray-600">{cs.operator}</span>
          <span className="text-[11px] uppercase tracking-wider text-gray-400">
            {cs.outcome}
          </span>
        </div>
        <h1 className="text-[32px] font-light tracking-tight text-gray-900 leading-tight">
          {cs.title}
        </h1>
        <p className="mt-2 text-[12px] text-gray-500">
          {cs.date_range.from} → {cs.date_range.to ?? "ongoing"}
        </p>
        <div className="mt-2">
          <LastVerifiedStamp date={cs.last_verified} />
        </div>
      </header>

      <div className="text-[15px] leading-relaxed text-gray-800 whitespace-pre-line">
        {cs.narrative}
      </div>

      {cs.takeaways.length > 0 && (
        <section className="rounded-xl bg-emerald-50/40 border border-emerald-100 p-5">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700 mb-3">
            Takeaways
          </h2>
          <ul className="space-y-2">
            {cs.takeaways.map((t, i) => (
              <li
                key={i}
                className="text-[13px] text-emerald-900 leading-relaxed"
              >
                • {t}
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
