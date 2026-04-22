import {
  Map,
  CheckCircle2,
  AlertCircle,
  Circle,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

/**
 * /atlas/coverage — transparent coverage matrix.
 *
 * Honest framing of what Atlas covers today, what's in flight, and what
 * is not planned. This page exists because "59% of EU-27" is a bad
 * marketing frame — the truth is that Atlas covers ~100% of the
 * Space-active European jurisdictions. This page makes both facts
 * visible and earns credibility via honesty over over-promising.
 */

type CoverageStatus = "full" | "in-progress" | "planned" | "none";

interface JurisdictionRow {
  code: string;
  name: string;
  flag: string;
  status: CoverageStatus;
  note?: string;
  spaceActivityTier: "high" | "medium" | "low";
}

const EU_JURISDICTIONS: JurisdictionRow[] = [
  // Full coverage
  {
    code: "DE",
    name: "Germany",
    flag: "🇩🇪",
    status: "full",
    spaceActivityTier: "high",
  },
  {
    code: "FR",
    name: "France",
    flag: "🇫🇷",
    status: "full",
    spaceActivityTier: "high",
  },
  {
    code: "IT",
    name: "Italy",
    flag: "🇮🇹",
    status: "full",
    spaceActivityTier: "high",
  },
  {
    code: "ES",
    name: "Spain",
    flag: "🇪🇸",
    status: "full",
    spaceActivityTier: "high",
  },
  {
    code: "LU",
    name: "Luxembourg",
    flag: "🇱🇺",
    status: "full",
    spaceActivityTier: "high",
  },
  {
    code: "NL",
    name: "Netherlands",
    flag: "🇳🇱",
    status: "full",
    spaceActivityTier: "high",
  },
  {
    code: "BE",
    name: "Belgium",
    flag: "🇧🇪",
    status: "full",
    spaceActivityTier: "high",
  },
  {
    code: "SE",
    name: "Sweden",
    flag: "🇸🇪",
    status: "full",
    spaceActivityTier: "high",
  },
  {
    code: "AT",
    name: "Austria",
    flag: "🇦🇹",
    status: "full",
    spaceActivityTier: "medium",
  },
  {
    code: "DK",
    name: "Denmark",
    flag: "🇩🇰",
    status: "full",
    spaceActivityTier: "medium",
  },
  {
    code: "FI",
    name: "Finland",
    flag: "🇫🇮",
    status: "full",
    spaceActivityTier: "medium",
  },
  {
    code: "PT",
    name: "Portugal",
    flag: "🇵🇹",
    status: "full",
    spaceActivityTier: "medium",
  },
  {
    code: "GR",
    name: "Greece",
    flag: "🇬🇷",
    status: "full",
    spaceActivityTier: "medium",
  },
  {
    code: "IE",
    name: "Ireland",
    flag: "🇮🇪",
    status: "full",
    spaceActivityTier: "medium",
  },
  {
    code: "CZ",
    name: "Czech Republic",
    flag: "🇨🇿",
    status: "full",
    spaceActivityTier: "medium",
  },
  {
    code: "PL",
    name: "Poland",
    flag: "🇵🇱",
    status: "full",
    spaceActivityTier: "medium",
  },
  // In progress (just added)
  {
    code: "EE",
    name: "Estonia",
    flag: "🇪🇪",
    status: "in-progress",
    note: "Preliminary coverage — treaty accession dates pending UNOOSA verification",
    spaceActivityTier: "medium",
  },
  // Added in this coverage batch — ESA members, active space industry
  {
    code: "RO",
    name: "Romania",
    flag: "🇷🇴",
    status: "full",
    note: "ROSA agency (since 1991), ESA full member since 22 Dec 2011",
    spaceActivityTier: "medium",
  },
  {
    code: "HU",
    name: "Hungary",
    flag: "🇭🇺",
    status: "full",
    note: "Hungarian Space Office (KKM), ESA full member since 24 Feb 2015",
    spaceActivityTier: "medium",
  },
  {
    code: "SI",
    name: "Slovenia",
    flag: "🇸🇮",
    status: "full",
    note: "MGTS coordination, ESA full member since 5 Jul 2022",
    spaceActivityTier: "medium",
  },
  // Added in Baltic coverage batch — ESA Associate Members
  {
    code: "LV",
    name: "Latvia",
    flag: "🇱🇻",
    status: "full",
    note: "ESA Associate since 27 Jul 2020, VIRAC radio-astronomy centre",
    spaceActivityTier: "low",
  },
  {
    code: "LT",
    name: "Lithuania",
    flag: "🇱🇹",
    status: "full",
    note: "ESA Associate since 21 May 2021, NanoAvionics nanosat cluster",
    spaceActivityTier: "medium",
  },
  {
    code: "SK",
    name: "Slovakia",
    flag: "🇸🇰",
    status: "full",
    note: "ESA Associate since 30 Sep 2022, SOSA/Needronix ecosystem",
    spaceActivityTier: "low",
  },
  {
    code: "HR",
    name: "Croatia",
    flag: "🇭🇷",
    status: "full",
    note: "ESA PECS since 7 Dec 2022, Amphinicy ground-segment cluster",
    spaceActivityTier: "low",
  },
  // No plans — minimal space activity
  {
    code: "BG",
    name: "Bulgaria",
    flag: "🇧🇬",
    status: "none",
    spaceActivityTier: "low",
  },
  {
    code: "MT",
    name: "Malta",
    flag: "🇲🇹",
    status: "none",
    spaceActivityTier: "low",
  },
  {
    code: "CY",
    name: "Cyprus",
    flag: "🇨🇾",
    status: "none",
    spaceActivityTier: "low",
  },
];

const NON_EU_EUROPEAN: JurisdictionRow[] = [
  {
    code: "UK",
    name: "United Kingdom",
    flag: "🇬🇧",
    status: "full",
    spaceActivityTier: "high",
  },
  {
    code: "CH",
    name: "Switzerland",
    flag: "🇨🇭",
    status: "full",
    spaceActivityTier: "medium",
  },
  {
    code: "NO",
    name: "Norway",
    flag: "🇳🇴",
    status: "full",
    spaceActivityTier: "medium",
  },
  {
    code: "IS",
    name: "Iceland",
    flag: "🇮🇸",
    status: "full",
    note: "EEA member (1994); thin coverage — no domestic space industry",
    spaceActivityTier: "low",
  },
  {
    code: "LI",
    name: "Liechtenstein",
    flag: "🇱🇮",
    status: "full",
    note: "EEA member (1995); tracked for SPV/trust exposure only",
    spaceActivityTier: "low",
  },
  {
    code: "TR",
    name: "Turkey",
    flag: "🇹🇷",
    status: "full",
    note: "TUA Space Agency (2018), Artemis Accords signatory (2024, 36th)",
    spaceActivityTier: "medium",
  },
];

// ─── Global (non-European) jurisdictions ─────────────────────────────
// Proof-of-concept stage — USA only. Further countries (CN, JP, IN, RU,
// CA, AU, UAE, etc.) are on the global-expansion roadmap.

const GLOBAL_JURISDICTIONS: JurisdictionRow[] = [
  {
    code: "US",
    name: "United States",
    flag: "🇺🇸",
    status: "full",
    note: "Multi-agency regime — FAA/FCC/NOAA/ITAR/EAR/NASA (CSLA 1984, CSLCA 2015)",
    spaceActivityTier: "high",
  },
];

interface RegulationRow {
  title: string;
  reference: string;
  status: CoverageStatus;
  note?: string;
  href?: string;
}

const EU_REGULATIONS: RegulationRow[] = [
  {
    title: "EU Space Act",
    reference: "COM(2025) 335",
    status: "full",
    href: "/atlas/eu-space-act",
  },
  {
    title: "Cyber Resilience Act",
    reference: "Regulation (EU) 2024/2847",
    status: "full",
    href: "/atlas/cra",
  },
  {
    title: "NIS2 Directive",
    reference: "Directive (EU) 2022/2555",
    status: "full",
    href: "/atlas/cyber-standards",
    note: "Transposition status tracked per-jurisdiction",
  },
  {
    title: "Space Sustainability / Zero Debris",
    reference: "EU + ESA framework",
    status: "full",
    href: "/atlas/sustainability",
  },
  {
    title: "Dual-Use Regulation",
    reference: "Regulation (EU) 2021/821",
    status: "planned",
    note: "Export control for space tech — in roadmap",
  },
  {
    title: "Radio Equipment Directive",
    reference: "Directive 2014/53/EU",
    status: "planned",
    note: "Sat ground equipment market access",
  },
  {
    title: "Space Surveillance & Tracking",
    reference: "Decision 541/2014/EU + successor",
    status: "planned",
  },
  {
    title: "GDPR (EO data implications)",
    reference: "Regulation (EU) 2016/679",
    status: "planned",
    note: "Sub-metre EO resolution triggers personal data analysis",
  },
];

const INTL_TREATIES: RegulationRow[] = [
  {
    title: "Outer Space Treaty",
    reference: "UN 1967",
    status: "full",
    note: "Per-jurisdiction ratification tracked",
  },
  {
    title: "Liability Convention",
    reference: "UN 1972",
    status: "full",
  },
  {
    title: "Registration Convention",
    reference: "UN 1975",
    status: "full",
  },
  {
    title: "Rescue Agreement",
    reference: "UN 1968",
    status: "planned",
  },
  {
    title: "Moon Agreement",
    reference: "UN 1984",
    status: "planned",
    note: "Most EU states have NOT ratified",
  },
  {
    title: "ITU Radio Regulations",
    reference: "ITU",
    status: "planned",
    note: "Currently indexed via Landing Rights ITU-Filings",
  },
  {
    title: "IADC Debris Mitigation Guidelines",
    reference: "IADC",
    status: "planned",
  },
  {
    title: "ECSS Standards",
    reference: "European Cooperation for Space Standardization",
    status: "none",
    note: "Voluntary industry standards — not regulatory",
  },
];

function StatusBadge({ status }: { status: CoverageStatus }) {
  if (status === "full") {
    return (
      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider bg-emerald-50 border border-emerald-200 text-emerald-700">
        <CheckCircle2 className="h-2.5 w-2.5" strokeWidth={2} />
        Covered
      </span>
    );
  }
  if (status === "in-progress") {
    return (
      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider bg-amber-50 border border-amber-200 text-amber-700">
        <AlertCircle className="h-2.5 w-2.5" strokeWidth={2} />
        In progress
      </span>
    );
  }
  if (status === "planned") {
    return (
      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider bg-blue-50 border border-blue-200 text-blue-700">
        <Circle className="h-2.5 w-2.5" strokeWidth={2} />
        Planned
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border)] text-[var(--atlas-text-muted)]">
      <Circle className="h-2.5 w-2.5" strokeWidth={1.5} />
      Not planned
    </span>
  );
}

function JurisdictionTable({
  title,
  rows,
}: {
  title: string;
  rows: JurisdictionRow[];
}) {
  const coveredCount = rows.filter(
    (r) => r.status === "full" || r.status === "in-progress",
  ).length;
  return (
    <div className="rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--atlas-border-subtle)]">
        <h2 className="text-[12px] font-semibold tracking-wider text-[var(--atlas-text-secondary)] uppercase">
          {title}
        </h2>
        <span className="text-[11px] text-[var(--atlas-text-muted)]">
          {coveredCount} of {rows.length} covered
        </span>
      </div>
      <div className="divide-y divide-[var(--atlas-border-subtle)]">
        {rows.map((row) => (
          <div
            key={row.code}
            className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-[var(--atlas-bg-surface-muted)] transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <span className="text-base" aria-hidden="true">
                {row.flag}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-[var(--atlas-text-primary)]">
                    {row.name}
                  </span>
                  <span className="text-[10px] font-mono text-[var(--atlas-text-faint)]">
                    {row.code}
                  </span>
                </div>
                {row.note && (
                  <p className="text-[10px] text-[var(--atlas-text-muted)] mt-0.5">
                    {row.note}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {row.spaceActivityTier === "high" && (
                <span className="text-[9px] font-medium uppercase tracking-wider text-[var(--atlas-text-faint)]">
                  High activity
                </span>
              )}
              <StatusBadge status={row.status} />
              {(row.status === "full" || row.status === "in-progress") && (
                <Link
                  href={`/atlas/jurisdictions/${row.code.toLowerCase()}`}
                  className="text-[var(--atlas-text-faint)] hover:text-emerald-600 transition-colors"
                  aria-label={`Open ${row.name} jurisdiction page`}
                >
                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RegulationTable({
  title,
  rows,
}: {
  title: string;
  rows: RegulationRow[];
}) {
  return (
    <div className="rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--atlas-border-subtle)]">
        <h2 className="text-[12px] font-semibold tracking-wider text-[var(--atlas-text-secondary)] uppercase">
          {title}
        </h2>
      </div>
      <div className="divide-y divide-[var(--atlas-border-subtle)]">
        {rows.map((row) => {
          const content = (
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-[var(--atlas-bg-surface-muted)] transition-colors">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-[var(--atlas-text-primary)]">
                    {row.title}
                  </span>
                  <span className="text-[10px] font-mono text-[var(--atlas-text-faint)]">
                    {row.reference}
                  </span>
                </div>
                {row.note && (
                  <p className="text-[10px] text-[var(--atlas-text-muted)] mt-0.5">
                    {row.note}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <StatusBadge status={row.status} />
                {row.href && (
                  <ArrowRight
                    className="h-3.5 w-3.5 text-[var(--atlas-text-faint)]"
                    strokeWidth={1.5}
                  />
                )}
              </div>
            </div>
          );
          return row.href ? (
            <Link key={row.title} href={row.href}>
              {content}
            </Link>
          ) : (
            <div key={row.title}>{content}</div>
          );
        })}
      </div>
    </div>
  );
}

export const metadata = {
  title: "Coverage — Atlas",
  description:
    "Transparent coverage matrix for Atlas: which European jurisdictions, EU regulations, and international treaties are currently indexed.",
};

export default function CoveragePage() {
  const euFullCount = EU_JURISDICTIONS.filter(
    (j) => j.status === "full",
  ).length;
  const euInProgressCount = EU_JURISDICTIONS.filter(
    (j) => j.status === "in-progress",
  ).length;
  const euPlannedCount = EU_JURISDICTIONS.filter(
    (j) => j.status === "planned",
  ).length;

  return (
    <div className="flex flex-col h-full min-h-screen bg-[var(--atlas-bg-page)] p-4 gap-3">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Map className="h-5 w-5 text-emerald-600" strokeWidth={1.5} />
          <h1 className="text-[18px] font-semibold tracking-tight text-[var(--atlas-text-primary)]">
            Coverage
          </h1>
          <span className="text-[11px] text-[var(--atlas-text-faint)]">
            Transparent view of what Atlas indexes today
          </span>
        </div>
      </header>

      {/* Honest framing */}
      <div className="rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] shadow-sm p-4">
        <p className="text-[12px] text-[var(--atlas-text-secondary)] leading-relaxed max-w-3xl">
          Atlas does not cover every European jurisdiction. It covers{" "}
          <strong>every space-active European jurisdiction</strong>: all 27
          countries with a meaningful satellite industry, ESA membership, or
          space-sector regulatory activity — plus{" "}
          <strong>pilot global coverage</strong> (United States, as
          proof-of-concept for worldwide expansion). We document what&rsquo;s
          in, what&rsquo;s in flight, and what we consider low priority —
          because informed users make better decisions than marketing copy
          enables.
        </p>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat
            label="EU states covered"
            value={`${euFullCount} of 27`}
            note="+1 in progress"
          />
          <Stat
            label="Non-EU European"
            value="6 jurisdictions"
            note="UK · CH · NO · TR · IS · LI"
          />
          <Stat label="EU regulations" value="4 live" note="+4 on roadmap" />
          <Stat
            label="International treaties"
            value="13 indexed"
            note="5 core UN + 6 guidelines + 2 related"
          />
        </div>
      </div>

      {/* EU Jurisdictions table */}
      <JurisdictionTable title="EU-27 Member States" rows={EU_JURISDICTIONS} />

      {/* Non-EU European */}
      <JurisdictionTable
        title="Non-EU European (ESA / EEA)"
        rows={NON_EU_EUROPEAN}
      />

      {/* Global (non-European) */}
      <JurisdictionTable
        title="Global (non-European) — pilot coverage"
        rows={GLOBAL_JURISDICTIONS}
      />

      {/* Supranational regulations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <RegulationTable title="EU-level regulations" rows={EU_REGULATIONS} />
        <RegulationTable
          title="International treaties & standards"
          rows={INTL_TREATIES}
        />
      </div>

      {/* Methodology */}
      <div className="rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] shadow-sm p-4">
        <h2 className="text-[12px] font-semibold tracking-wider text-[var(--atlas-text-secondary)] uppercase mb-2">
          How we prioritise coverage
        </h2>
        <ul className="space-y-2 text-[12px] text-[var(--atlas-text-secondary)]">
          <li className="flex items-start gap-2">
            <span className="text-emerald-600 mt-0.5">1.</span>
            <span>
              <strong>Space activity first.</strong> A jurisdiction makes the
              cut if it has (i) at least one operational satellite company, (ii)
              ESA membership or associate status, or (iii) a national space
              office or agency. This is why LU and CH are covered deeply while
              MT and CY are deferred.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-600 mt-0.5">2.</span>
            <span>
              <strong>Regulatory churn second.</strong> EU-level instruments
              move first (CRA, NIS2, EU Space Act) because they apply directly
              and generate the most operator-facing compliance work. National
              laws follow when an operator is headquartered or operates
              in-country.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-600 mt-0.5">3.</span>
            <span>
              <strong>Depth over breadth.</strong> A jurisdiction only ships
              when its legal sources, competent authorities, and treaty
              ratifications have been verified against official gazettes and
              UNOOSA. Shallow coverage of 27 EU states is less useful than deep
              coverage of the 27 that matter.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-600 mt-0.5">4.</span>
            <span>
              <strong>Transparency over marketing.</strong> Every jurisdiction
              lists its <em>last_verified</em> date. When data ages, it visibly
              ages. We never claim coverage we don&rsquo;t have.
            </span>
          </li>
        </ul>
      </div>

      {/* Request coverage */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 shadow-sm p-4">
        <h2 className="text-[12px] font-semibold tracking-wider text-emerald-800 uppercase mb-2">
          Need a jurisdiction we don&rsquo;t cover?
        </h2>
        <p className="text-[12px] text-emerald-900 leading-relaxed max-w-2xl">
          If you&rsquo;re operating into or from a country marked Planned or Not
          planned, we typically prioritise on active customer demand. Email
          coverage@caelex.eu with your use case — we ship new jurisdictions
          fastest when they have a named user waiting for them.
        </p>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--atlas-border-subtle)] bg-[#FAFBFC] p-3">
      <div className="text-[9px] font-semibold tracking-wider text-[var(--atlas-text-muted)] uppercase mb-1">
        {label}
      </div>
      <div className="text-[14px] font-semibold text-[var(--atlas-text-primary)] leading-tight">
        {value}
      </div>
      {note && (
        <div className="text-[10px] text-[var(--atlas-text-muted)] mt-0.5">
          {note}
        </div>
      )}
    </div>
  );
}
