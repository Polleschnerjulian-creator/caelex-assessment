import Link from "next/link";
import type { CaseStudy } from "@/data/landing-rights";

export function CaseStudyCard({ cs }: { cs: CaseStudy }) {
  return (
    <Link
      href={`/atlas/landing-rights/case-studies/${cs.id}`}
      className="flex flex-col gap-2 p-5 rounded-xl bg-white border border-gray-100 hover:border-gray-300 hover:shadow-sm transition"
    >
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-bold text-gray-900 bg-gray-100 rounded-md px-2 py-0.5">
          {cs.jurisdiction}
        </span>
        <span className="text-[11px] text-gray-500">{cs.operator}</span>
        <span className="text-[10px] uppercase tracking-wider text-gray-400">
          {cs.outcome}
        </span>
      </div>
      <h3 className="text-[15px] font-semibold text-gray-900 leading-snug">
        {cs.title}
      </h3>
      <p className="text-[11px] text-gray-500">
        {cs.date_range.from} → {cs.date_range.to ?? "ongoing"}
      </p>
    </Link>
  );
}
