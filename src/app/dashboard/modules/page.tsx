import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Layers,
  ShieldCheck,
  Trash2,
  Lock,
  Wind,
  Coins,
  Globe,
  Eye,
  Scale,
  Briefcase,
  Plane,
  Radio,
  Building2,
  ArrowUpRight,
  AlertTriangle,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { resolveComplyUiVersion } from "@/lib/comply-ui-version.server";
import {
  PageContainer,
  PageHeader,
} from "@/components/dashboard/v2/ui/PageChrome";
import { getPostureForUser } from "@/lib/comply-v2/posture.server";
import type { RegulationKey } from "@/lib/comply-v2/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Modules — Caelex Comply",
  description:
    "All compliance modules in one place. Click a module to drill into requirements, evidence, and assessments.",
};

interface ModuleEntry {
  href: string;
  title: string;
  short: string;
  body: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  category: "core" | "operational" | "specialised";
  jurisdictions: string[];
  /**
   * Sprint UF31 (P1-P3) — link from a module entry to the V2
   * RegulationKey it aggregates from. When set, ModuleCard shows
   * live counts (open / attested / total / score). When null,
   * the card stays brochure-style (those modules don't map to a
   * V2 ComplianceItem table — authorization, registration,
   * environmental, insurance, copuos use their own
   * *Assessment-Status models that aren't in posture aggregator).
   */
  regulationKey: RegulationKey | null;
}

const MODULES: ModuleEntry[] = [
  {
    href: "/dashboard/modules/authorization",
    title: "Authorization",
    short: "NCA permits + license workflow state machine.",
    body: "EU Space Act Art. 5–10. Track your authorization application from draft → submitted → under review → approved across primary + secondary NCAs.",
    icon: ShieldCheck,
    category: "core",
    jurisdictions: ["EU", "DE", "FR", "IT", "ES", "+5"],
    regulationKey: null, // workflow-state-machine, not ComplianceItem-backed
  },
  {
    href: "/dashboard/modules/registration",
    title: "Registration",
    short: "UN registry + URSO obligations.",
    body: "EU Space Act Art. 21–25. Register space objects with UNOOSA + national registries. Format the COSPAR / NORAD identifiers and track filing.",
    icon: Building2,
    category: "core",
    jurisdictions: ["UN", "EU"],
    regulationKey: null,
  },
  {
    href: "/dashboard/modules/debris",
    title: "Debris Mitigation",
    short: "End-of-life disposal + 25-year rule.",
    body: "EU Space Act Art. 31–37, IADC + ISO 24113. Calculate casualty risk, plan deorbit, document passivation. Required for every operator with anything above 100 km.",
    icon: Trash2,
    category: "core",
    jurisdictions: ["EU", "UN-IADC", "ISO"],
    regulationKey: "DEBRIS",
  },
  {
    href: "/dashboard/modules/cybersecurity",
    title: "Cybersecurity",
    short: "Command-link + ground-segment hardening.",
    body: "EU Space Act Art. 21, 74, 75, 83 + ENISA + ISO 27001. Maturity assessment across encryption, MFA, incident-response, vulnerability management.",
    icon: Lock,
    category: "core",
    jurisdictions: ["EU", "ENISA", "ISO"],
    regulationKey: "CYBERSECURITY",
  },
  {
    href: "/dashboard/modules/nis2",
    title: "NIS2 Directive",
    short: "Network + information security baseline.",
    body: "Directive 2022/2555. Auto-classifies your entity (essential / important / out-of-scope). Tracks 24h / 72h / 1-month incident reporting cadence under Art. 23.",
    icon: ShieldCheck,
    category: "core",
    jurisdictions: ["EU"],
    regulationKey: "NIS2",
  },
  {
    href: "/dashboard/modules/insurance",
    title: "Insurance",
    short: "Third-party liability coverage + caps.",
    body: "EU Space Act Art. 56–60. Calculate required TPL (typically €60M for orbital, scales with mission profile). Track policy validity + renewal deadlines.",
    icon: Coins,
    category: "core",
    jurisdictions: ["EU", "national"],
    regulationKey: null,
  },
  {
    href: "/dashboard/modules/environmental",
    title: "Environmental",
    short: "Atmospheric + ground-environmental impact.",
    body: "Greenhouse gases per launch + atmospheric ozone impact (especially solid rockets). National regulations vary; baseline is EU + ICAO Annex 16.",
    icon: Wind,
    category: "core",
    jurisdictions: ["EU", "ICAO"],
    regulationKey: null,
  },
  {
    href: "/dashboard/modules/supervision",
    title: "Supervision",
    short: "Annual reports + ongoing supervision duties.",
    body: "Per-NCA reporting cadence. EUSPA wants annual compliance reports, BAFA wants per-export reports, FCC wants spectrum-coordination updates.",
    icon: Eye,
    category: "operational",
    jurisdictions: ["EU", "national"],
    regulationKey: null,
  },
  {
    href: "/dashboard/modules/copuos",
    title: "COPUOS / IADC",
    short: "UN debris-mitigation guidelines + 5 OST treaties.",
    body: "Outer Space Treaty, Liability Convention, Registration Convention, Moon Agreement, Rescue Agreement. Plus IADC space-debris guidelines.",
    icon: Globe,
    category: "specialised",
    jurisdictions: ["UN"],
    regulationKey: null,
  },
  {
    href: "/dashboard/modules/export-control",
    title: "Export Control (ITAR/EAR)",
    short: "ECCN/USML/MTCR classification + license requirements.",
    body: "US Commerce CCL (EAR), State Department USML (ITAR), MTCR Annex (international). Posture-layer pairs with the Trade module's operations-layer for actual shipments.",
    icon: Briefcase,
    category: "specialised",
    jurisdictions: ["US", "international"],
    regulationKey: "EXPORT_CONTROL",
  },
  {
    href: "/dashboard/modules/spectrum",
    title: "Spectrum / ITU",
    short: "Frequency coordination + ITU-R filings.",
    body: "API/A, Coordination Request, Notification + Recording. National regulators (BNetzA, FCC) handle the local coordination; ITU handles the international.",
    icon: Radio,
    category: "specialised",
    jurisdictions: ["ITU", "national"],
    regulationKey: "SPECTRUM",
  },
  {
    href: "/dashboard/modules/uk-space",
    title: "UK Space Industry Act 2018",
    short: "UK-specific authorization + insurance caps.",
    body: "Outerspace Act 1986 → SIA 2018. CAA-administered. Different risk-pooling regime + indemnification approach than EU operators are used to.",
    icon: Scale,
    category: "specialised",
    jurisdictions: ["UK"],
    regulationKey: "UK_SPACE_ACT",
  },
  {
    href: "/dashboard/modules/us-regulatory",
    title: "US Regulatory (FCC / FAA)",
    short: "FCC for spectrum, FAA for launch + reentry.",
    body: "FCC IBFS for satellite licensing, FAA AST for launch + reentry licenses. Foreign operators need a US-based representative for both.",
    icon: Plane,
    category: "specialised",
    jurisdictions: ["US"],
    regulationKey: "US_REGULATORY",
  },
  {
    href: "/dashboard/modules/cra",
    title: "Cyber Resilience Act",
    short: "EU 2024/2847 — cyber resilience for products.",
    body: "Class I / Class II classification, conformity assessment, SBOM (CycloneDX / SPDX), post-market vulnerability handling. Applies to ground-segment software products.",
    icon: ShieldCheck,
    category: "specialised",
    jurisdictions: ["EU"],
    regulationKey: "CRA",
  },
];

const CATEGORY_META: Record<
  ModuleEntry["category"],
  { label: string; description: string }
> = {
  core: {
    label: "Core",
    description:
      "Required for every European space operator. Start here on day 1.",
  },
  operational: {
    label: "Operational",
    description:
      "Triggered once you're authorized + active. Annual + per-event reports.",
  },
  specialised: {
    label: "Specialised",
    description:
      "Triggered by specific operations — exporting outside EU, US-touching transactions, UK launches, ITU spectrum filings.",
  },
};

// Sprint UF31 (P1-P3) — live per-module stats source.
//
// Returns a Map keyed by RegulationKey so the renderer can lookup
// stats per module in O(1). Entries that don't exist mean "no live
// data for this regulation" → card stays brochure-style.
//
// We don't try to mix in the legacy *Assessment tables for
// authorization/registration/insurance/etc. Those use a different
// data-shape (single-record-per-user, status-text fields) that
// would need a separate aggregator. UF31 ships with the V2-mapped
// 7 modules; the brochure 7 retain the previous behaviour.
interface ModuleLiveStats {
  total: number;
  countable: number;
  attested: number;
  evidenceRequired: number;
  pending: number;
  /** 0-100. Same formula as Posture: attested / (total - N/A). */
  score: number;
}

async function getModuleLiveStats(
  userId: string,
): Promise<Map<RegulationKey, ModuleLiveStats>> {
  const map = new Map<RegulationKey, ModuleLiveStats>();
  try {
    const posture = await getPostureForUser(userId);
    for (const r of posture.regulationBreakdown) {
      map.set(r.regulation, {
        total: r.total,
        countable: r.countable,
        attested: r.attested,
        evidenceRequired: r.evidenceRequired,
        pending: r.pending,
        score: r.score,
      });
    }
  } catch {
    // Defensive: if the posture aggregator throws (e.g. on a fresh
    // org with no items + edge-case), the modules page should still
    // render the brochure-style cards. Just return empty map.
  }
  return map;
}

export default async function ModulesIndexPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?next=/dashboard/modules");
  }
  const ui = await resolveComplyUiVersion();
  if (ui === "v1") redirect("/dashboard");

  // Sprint UF31 — fetch live stats once for the page load.
  const liveStats = await getModuleLiveStats(session.user.id);

  const grouped = {
    core: MODULES.filter((m) => m.category === "core"),
    operational: MODULES.filter((m) => m.category === "operational"),
    specialised: MODULES.filter((m) => m.category === "specialised"),
  };

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Modules"
        eyebrowIcon={Layers}
        title="Compliance Modules"
        description={
          <>
            Every compliance regime Caelex covers, grouped by relevance. Click a
            module to drill into its requirements, run an assessment, or attach
            evidence.
          </>
        }
      />

      {(["core", "operational", "specialised"] as const).map((cat) => (
        <section key={cat} className="mb-10">
          <header className="mb-3">
            <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              {CATEGORY_META[cat].label}
              <span className="rounded-full bg-white/[0.05] px-1.5 py-0.5 text-[10px] tabular-nums text-slate-300">
                {grouped[cat].length}
              </span>
            </h2>
            <p className="mt-0.5 text-[12px] text-slate-500">
              {CATEGORY_META[cat].description}
            </p>
          </header>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {grouped[cat].map((m) => (
              <ModuleCard
                key={m.href}
                module={m}
                stats={
                  m.regulationKey
                    ? (liveStats.get(m.regulationKey) ?? null)
                    : null
                }
              />
            ))}
          </div>
        </section>
      ))}
    </PageContainer>
  );
}

function ModuleCard({
  module: m,
  stats,
}: {
  module: ModuleEntry;
  stats: ModuleLiveStats | null;
}) {
  const Icon = m.icon;

  // Sprint UF31 — derive a tier-color for the score badge so the
  // module index turns into a triage surface, not just a directory.
  // <50 = rose (urgent attention), 50-79 = amber, ≥80 = emerald,
  // 0/0 (no items yet) → slate (neutral hint, not "bad").
  const scoreTier =
    !stats || stats.total === 0
      ? "neutral"
      : stats.score >= 80
        ? "emerald"
        : stats.score >= 50
          ? "amber"
          : "rose";

  const scoreColor =
    scoreTier === "emerald"
      ? "text-emerald-300"
      : scoreTier === "amber"
        ? "text-amber-300"
        : scoreTier === "rose"
          ? "text-rose-300"
          : "text-slate-500";

  // Open work counter — items that aren't attested. Drives the
  // "X open" pill at the top of the card. Includes pending,
  // evidence_required, draft, under_review.
  const openCount = stats ? stats.countable - stats.attested : 0;

  return (
    <Link
      href={m.href}
      className="group flex flex-col gap-2 overflow-hidden rounded-xl border border-white/[0.06] bg-gradient-to-b from-white/[0.025] to-white/[0.012] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:border-white/[0.14] hover:from-white/[0.04]"
    >
      <header className="flex items-start justify-between gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-300 ring-1 ring-inset ring-emerald-500/20">
          <Icon className="h-3.5 w-3.5" />
        </div>
        {/* Sprint UF31 (P1-P3) — live status pills.
            For V2-mapped modules: score (color-tier) + open-count.
            For brochure modules: just the chevron as before, plus a
            small italic "browse" hint so the user knows live data
            isn't available here yet.

            Audit P1-P3 said the index was "pure brochure" with no
            triage signal. Now: a CO scanning the modules can spot
            "Cybersecurity 32% · 18 open" and prioritize. */}
        <div className="flex items-center gap-2">
          {stats ? (
            stats.total > 0 ? (
              <>
                {openCount > 0 ? (
                  <span
                    className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300 ring-1 ring-inset ring-amber-500/20"
                    title={`${openCount} requirement${openCount === 1 ? "" : "s"} still open`}
                  >
                    <AlertTriangle className="h-2.5 w-2.5" strokeWidth={2.4} />
                    {openCount}
                  </span>
                ) : null}
                <span
                  className={`text-[12px] font-semibold tabular-nums ${scoreColor}`}
                  title={`${stats.attested} of ${stats.countable} attested`}
                >
                  {stats.score}%
                </span>
              </>
            ) : (
              <span className="text-[10px] italic text-slate-600">
                no items yet
              </span>
            )
          ) : null}
          <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-500 transition group-hover:text-slate-300" />
        </div>
      </header>
      <h3 className="text-[14px] font-semibold tracking-tight text-slate-100">
        {m.title}
      </h3>
      <p className="text-[12px] font-medium text-slate-300">{m.short}</p>
      <p className="text-[11.5px] leading-relaxed text-slate-500">{m.body}</p>

      {/* Sprint UF31 — live counters row, only when stats present
          and there are items. Compact mono-formatted numbers with
          slate semantics: "12/27 attested · 5 evidence-required ·
          2 pending". Auditor can read this in 2 seconds. */}
      {stats && stats.total > 0 ? (
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-slate-500">
          <span className="tabular-nums">
            <span className="text-slate-300">{stats.attested}</span>
            <span className="text-slate-600">/{stats.countable}</span> attested
          </span>
          {stats.evidenceRequired > 0 ? (
            <span className="tabular-nums">
              <span className="text-amber-300">{stats.evidenceRequired}</span>{" "}
              evidence-required
            </span>
          ) : null}
          {stats.pending > 0 ? (
            <span className="tabular-nums">
              <span className="text-slate-300">{stats.pending}</span> pending
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="mt-1 flex flex-wrap gap-1.5 border-t border-white/[0.04] pt-2">
        {m.jurisdictions.map((j) => (
          <span
            key={j}
            className="rounded-full bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-medium text-slate-400 ring-1 ring-inset ring-white/[0.06]"
          >
            {j}
          </span>
        ))}
      </div>
    </Link>
  );
}
