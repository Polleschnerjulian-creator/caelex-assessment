import Link from "next/link";
import {
  getDeepDives,
  getCaseStudiesFor,
  getConductFor,
  type LandingRightsProfile,
  type LandingRightsCategory,
} from "@/data/landing-rights";
import { DepthBadge } from "./DepthBadge";
import { LastVerifiedStamp } from "./LastVerifiedStamp";
import { LandingRightsStatusBadge } from "./LandingRightsStatusBadge";
import { SourceLink } from "./SourceLink";
import { ITUFilingCard } from "./ITUFilingCard";
import { getITUFilingsByOperator } from "@/data/landing-rights/itu-filings";
import { BookmarkButton } from "@/app/(atlas)/atlas/_components/BookmarkButton";

const CATEGORIES: LandingRightsCategory[] = [
  "market_access",
  "itu_coordination",
  "earth_station",
  "re_entry",
];

const CATEGORY_LABELS: Record<LandingRightsCategory, string> = {
  market_access: "Market Access",
  itu_coordination: "ITU Coordination",
  earth_station: "Earth Station & ESIM",
  re_entry: "Re-entry",
};

export function JurisdictionProfileView({
  profile,
  embed = false,
}: {
  profile: LandingRightsProfile;
  embed?: boolean;
}) {
  const deepDives = getDeepDives(profile.jurisdiction);
  const deepDiveCategories = new Set(deepDives.map((d) => d.category));
  const caseStudies = getCaseStudiesFor(profile.jurisdiction);
  const conduct = getConductFor(profile.jurisdiction);
  const code = profile.jurisdiction.toLowerCase();

  return (
    <div className="flex flex-col gap-6">
      {!embed && (
        <header className="flex items-baseline gap-4 flex-wrap">
          <h1 className="text-[40px] font-light tracking-tight text-gray-900">
            {profile.jurisdiction}
          </h1>
          <DepthBadge depth={profile.depth} />
          <LastVerifiedStamp date={profile.last_verified} />
          <div className="ml-auto">
            <BookmarkButton
              item={{
                id: `landing-rights:${profile.jurisdiction}`,
                type: "jurisdiction",
                title: `${profile.jurisdiction} — Landing Rights`,
                subtitle: profile.overview.regime_type.replace("_", " "),
                href: `/atlas/landing-rights/${profile.jurisdiction.toLowerCase()}`,
              }}
            />
          </div>
        </header>
      )}

      <section className="rounded-xl bg-white border border-gray-100 p-6">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 mb-3">
          Overview
        </h2>
        <p className="text-[14px] leading-relaxed text-gray-800">
          {profile.overview.summary}
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-[11px] text-gray-500">
          <span>Regime: {profile.overview.regime_type.replace("_", " ")}</span>
          {profile.overview.in_force_date && (
            <span>In force: {profile.overview.in_force_date}</span>
          )}
          {profile.overview.last_major_change && (
            <span>Last change: {profile.overview.last_major_change}</span>
          )}
        </div>
      </section>

      <section className="rounded-xl bg-white border border-gray-100 p-6">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 mb-3">
          Regulators
        </h2>
        <ul className="space-y-2">
          {profile.regulators.map((r) => (
            <li key={r.abbreviation} className="flex items-center gap-3">
              <span className="text-[12px] font-bold bg-gray-100 rounded-md px-2 py-1">
                {r.abbreviation}
              </span>
              <span className="text-[14px] text-gray-800">{r.name}</span>
              <span className="text-[10px] uppercase tracking-wider text-gray-400">
                {r.role.replace("_", " ")}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {profile.legal_basis.length > 0 && (
        <section className="rounded-xl bg-white border border-gray-100 p-6">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 mb-3">
            Legal basis
          </h2>
          <ul className="space-y-2">
            {profile.legal_basis.map((lb) => (
              <li key={lb.source_id}>
                <SourceLink
                  sourceId={lb.source_id}
                  title={lb.title}
                  citation={lb.citation}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-xl bg-white border border-gray-100 p-6">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 mb-3">
          Category deep-dives
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIES.map((cat) => {
            const has = deepDiveCategories.has(cat);
            return has ? (
              <Link
                key={cat}
                href={`/atlas/landing-rights/${code}/${cat.replace("_", "-")}`}
                className="flex items-center justify-between px-4 py-3 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 transition"
              >
                <span className="text-[13px] font-medium text-gray-900">
                  {CATEGORY_LABELS[cat]}
                </span>
                <span className="text-[11px] text-emerald-600">→</span>
              </Link>
            ) : (
              <div
                key={cat}
                className="flex items-center justify-between px-4 py-3 rounded-lg bg-gray-50/50 border border-gray-100 opacity-60"
              >
                <span className="text-[13px] text-gray-500">
                  {CATEGORY_LABELS[cat]}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-gray-400">
                  Coverage pending
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl bg-white border border-gray-100 p-6">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 mb-3">
          Fees & Timeline
        </h2>
        <dl className="grid grid-cols-2 gap-4 text-[13px]">
          <div>
            <dt className="text-gray-500 text-[11px]">Application fee</dt>
            <dd className="text-gray-900">
              {profile.fees.application
                ? `${profile.fees.application.min ?? "—"}–${profile.fees.application.max ?? "—"} ${profile.fees.application.currency}`
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500 text-[11px]">Typical timeline</dt>
            <dd className="text-gray-900">
              {profile.timeline.typical_duration_months.min}–
              {profile.timeline.typical_duration_months.max} months
            </dd>
          </div>
          <div>
            <dt className="text-gray-500 text-[11px]">Foreign ownership cap</dt>
            <dd className="text-gray-900">
              {profile.foreign_ownership.cap_percent == null
                ? "No cap"
                : `${profile.foreign_ownership.cap_percent}%`}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500 text-[11px]">Renewal term</dt>
            <dd className="text-gray-900">
              {profile.renewal.term_years
                ? `${profile.renewal.term_years} years`
                : "—"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl bg-white border border-gray-100 p-6">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 mb-3">
          Operator status
        </h2>
        <ul className="space-y-2">
          {(["starlink", "kuiper", "oneweb"] as const).map((op) => {
            const snap = profile.operator_snapshots[op];
            if (!snap) return null;
            return (
              <li key={op} className="flex items-center gap-3">
                <span className="text-[13px] font-medium capitalize w-20">
                  {op}
                </span>
                <LandingRightsStatusBadge status={snap.status} label />
                {snap.since && (
                  <span className="text-[11px] text-gray-500">
                    since {snap.since}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {conduct.length > 0 && (
        <section className="rounded-xl bg-white border border-gray-100 p-6">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 mb-3">
            Conduct conditions
          </h2>
          <ul className="space-y-3">
            {conduct.map((c) => (
              <li key={c.id} className="border-l-2 border-amber-200 pl-3">
                <p className="text-[13px] font-semibold text-gray-900">
                  {c.title}
                </p>
                <p className="text-[12px] text-gray-700 leading-relaxed">
                  {c.requirement}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(() => {
        const activeOperators = (
          ["starlink", "kuiper", "oneweb"] as const
        ).filter(
          (op) =>
            profile.operator_snapshots[op]?.status === "licensed" ||
            profile.operator_snapshots[op]?.status === "pending",
        );
        const filings = activeOperators.flatMap((op) =>
          getITUFilingsByOperator(op),
        );
        if (filings.length === 0) return null;
        return (
          <section className="rounded-xl bg-white border border-gray-100 p-6">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 mb-3">
              ITU filings covering this market
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filings.map((f) => (
                <ITUFilingCard key={f.id} filing={f} />
              ))}
            </div>
          </section>
        );
      })()}

      {caseStudies.length > 0 && (
        <section className="rounded-xl bg-white border border-gray-100 p-6">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 mb-3">
            Related case studies
          </h2>
          <ul className="space-y-2">
            {caseStudies.map((cs) => (
              <li key={cs.id}>
                <Link
                  href={`/atlas/landing-rights/case-studies/${cs.id}`}
                  className="text-[13px] text-gray-800 hover:text-gray-900 hover:underline"
                >
                  {cs.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
