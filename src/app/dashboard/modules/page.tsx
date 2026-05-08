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
} from "lucide-react";
import { auth } from "@/lib/auth";
import { resolveComplyUiVersion } from "@/lib/comply-ui-version.server";
import {
  PageContainer,
  PageHeader,
} from "@/components/dashboard/v2/ui/PageChrome";

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
  },
  {
    href: "/dashboard/modules/registration",
    title: "Registration",
    short: "UN registry + URSO obligations.",
    body: "EU Space Act Art. 21–25. Register space objects with UNOOSA + national registries. Format the COSPAR / NORAD identifiers and track filing.",
    icon: Building2,
    category: "core",
    jurisdictions: ["UN", "EU"],
  },
  {
    href: "/dashboard/modules/debris",
    title: "Debris Mitigation",
    short: "End-of-life disposal + 25-year rule.",
    body: "EU Space Act Art. 31–37, IADC + ISO 24113. Calculate casualty risk, plan deorbit, document passivation. Required for every operator with anything above 100 km.",
    icon: Trash2,
    category: "core",
    jurisdictions: ["EU", "UN-IADC", "ISO"],
  },
  {
    href: "/dashboard/modules/cybersecurity",
    title: "Cybersecurity",
    short: "Command-link + ground-segment hardening.",
    body: "EU Space Act Art. 21, 74, 75, 83 + ENISA + ISO 27001. Maturity assessment across encryption, MFA, incident-response, vulnerability management.",
    icon: Lock,
    category: "core",
    jurisdictions: ["EU", "ENISA", "ISO"],
  },
  {
    href: "/dashboard/modules/nis2",
    title: "NIS2 Directive",
    short: "Network + information security baseline.",
    body: "Directive 2022/2555. Auto-classifies your entity (essential / important / out-of-scope). Tracks 24h / 72h / 1-month incident reporting cadence under Art. 23.",
    icon: ShieldCheck,
    category: "core",
    jurisdictions: ["EU"],
  },
  {
    href: "/dashboard/modules/insurance",
    title: "Insurance",
    short: "Third-party liability coverage + caps.",
    body: "EU Space Act Art. 56–60. Calculate required TPL (typically €60M for orbital, scales with mission profile). Track policy validity + renewal deadlines.",
    icon: Coins,
    category: "core",
    jurisdictions: ["EU", "national"],
  },
  {
    href: "/dashboard/modules/environmental",
    title: "Environmental",
    short: "Atmospheric + ground-environmental impact.",
    body: "Greenhouse gases per launch + atmospheric ozone impact (especially solid rockets). National regulations vary; baseline is EU + ICAO Annex 16.",
    icon: Wind,
    category: "core",
    jurisdictions: ["EU", "ICAO"],
  },
  {
    href: "/dashboard/modules/supervision",
    title: "Supervision",
    short: "Annual reports + ongoing supervision duties.",
    body: "Per-NCA reporting cadence. EUSPA wants annual compliance reports, BAFA wants per-export reports, FCC wants spectrum-coordination updates.",
    icon: Eye,
    category: "operational",
    jurisdictions: ["EU", "national"],
  },
  {
    href: "/dashboard/modules/copuos",
    title: "COPUOS / IADC",
    short: "UN debris-mitigation guidelines + 5 OST treaties.",
    body: "Outer Space Treaty, Liability Convention, Registration Convention, Moon Agreement, Rescue Agreement. Plus IADC space-debris guidelines.",
    icon: Globe,
    category: "specialised",
    jurisdictions: ["UN"],
  },
  {
    href: "/dashboard/modules/export-control",
    title: "Export Control (ITAR/EAR)",
    short: "ECCN/USML/MTCR classification + license requirements.",
    body: "US Commerce CCL (EAR), State Department USML (ITAR), MTCR Annex (international). Posture-layer pairs with the Trade module's operations-layer for actual shipments.",
    icon: Briefcase,
    category: "specialised",
    jurisdictions: ["US", "international"],
  },
  {
    href: "/dashboard/modules/spectrum",
    title: "Spectrum / ITU",
    short: "Frequency coordination + ITU-R filings.",
    body: "API/A, Coordination Request, Notification + Recording. National regulators (BNetzA, FCC) handle the local coordination; ITU handles the international.",
    icon: Radio,
    category: "specialised",
    jurisdictions: ["ITU", "national"],
  },
  {
    href: "/dashboard/modules/uk-space",
    title: "UK Space Industry Act 2018",
    short: "UK-specific authorization + insurance caps.",
    body: "Outerspace Act 1986 → SIA 2018. CAA-administered. Different risk-pooling regime + indemnification approach than EU operators are used to.",
    icon: Scale,
    category: "specialised",
    jurisdictions: ["UK"],
  },
  {
    href: "/dashboard/modules/us-regulatory",
    title: "US Regulatory (FCC / FAA)",
    short: "FCC for spectrum, FAA for launch + reentry.",
    body: "FCC IBFS for satellite licensing, FAA AST for launch + reentry licenses. Foreign operators need a US-based representative for both.",
    icon: Plane,
    category: "specialised",
    jurisdictions: ["US"],
  },
  {
    href: "/dashboard/modules/cra",
    title: "Cyber Resilience Act",
    short: "EU 2024/2847 — cyber resilience for products.",
    body: "Class I / Class II classification, conformity assessment, SBOM (CycloneDX / SPDX), post-market vulnerability handling. Applies to ground-segment software products.",
    icon: ShieldCheck,
    category: "specialised",
    jurisdictions: ["EU"],
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

export default async function ModulesIndexPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?next=/dashboard/modules");
  }
  const ui = await resolveComplyUiVersion();
  if (ui === "v1") redirect("/dashboard");

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
              <ModuleCard key={m.href} module={m} />
            ))}
          </div>
        </section>
      ))}
    </PageContainer>
  );
}

function ModuleCard({ module: m }: { module: ModuleEntry }) {
  const Icon = m.icon;
  return (
    <Link
      href={m.href}
      className="group flex flex-col gap-2 overflow-hidden rounded-xl border border-white/[0.06] bg-gradient-to-b from-white/[0.025] to-white/[0.012] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:border-white/[0.14] hover:from-white/[0.04]"
    >
      <header className="flex items-start justify-between gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-300 ring-1 ring-inset ring-emerald-500/20">
          <Icon className="h-3.5 w-3.5" />
        </div>
        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-500 transition group-hover:text-slate-300" />
      </header>
      <h3 className="text-[14px] font-semibold tracking-tight text-slate-100">
        {m.title}
      </h3>
      <p className="text-[12px] font-medium text-slate-300">{m.short}</p>
      <p className="text-[11.5px] leading-relaxed text-slate-500">{m.body}</p>
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
