import Link from "next/link";
import { JURISDICTION_DATA } from "@/data/national-space-laws";
import { ALL_LANDING_RIGHTS_PROFILES } from "@/data/landing-rights";
import RegulatoryMapClient from "./RegulatoryMapClient";

// Skip static generation — (atlas) layout requires auth + Prisma DB access,
// which hangs the build-time prerender. Dynamic render is correct anyway
// because the layout enforces authentication at request time.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Regulatory Map — Atlas",
  description:
    "Interactive map of European space-law status: enacted, draft, no dedicated law. 19 jurisdictions with click-through to deep-dive coverage.",
};

export default function RegulatoryMapPage() {
  // Compute live stats at build time (static)
  const allLaws = [...JURISDICTION_DATA.values()];
  const enactedCount = allLaws.filter(
    (l) => l.legislation.status === "enacted",
  ).length;
  const draftCount = allLaws.filter(
    (l) =>
      l.legislation.status === "draft" || l.legislation.status === "pending",
  ).length;
  const noLawCount = Math.max(0, allLaws.length - enactedCount - draftCount);

  // Landing rights coverage
  const withLR = ALL_LANDING_RIGHTS_PROFILES.length;

  return (
    <div className="min-h-screen bg-[#F7F8FA] px-8 lg:px-16 py-10">
      <header className="mb-8 max-w-3xl">
        <h1 className="text-[32px] font-light tracking-tight text-gray-900">
          Regulatory Map
        </h1>
        <p className="mt-2 text-[14px] text-gray-600 leading-relaxed">
          Status of national space law across Europe. Green = enacted, amber =
          draft / pending enactment, grey = no dedicated space act (regime via
          telecoms law only). Non-EU ESA members shown in blue for context.
          Click any country for the full jurisdiction profile.
        </p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8 max-w-4xl">
        <StatCard
          label="Enacted space laws"
          value={enactedCount}
          total={allLaws.length}
          tone="emerald"
        />
        <StatCard
          label="Draft / pending"
          value={draftCount}
          total={allLaws.length}
          tone="amber"
        />
        <StatCard
          label="No dedicated law"
          value={noLawCount}
          total={allLaws.length}
          tone="gray"
        />
        <StatCard
          label="Landing rights coverage"
          value={withLR}
          total={29}
          tone="blue"
          sublabel="of 29 tracked"
        />
      </section>

      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-4 md:p-6">
        <RegulatoryMapClient />
      </div>

      <footer className="mt-8 text-[11px] text-gray-500 max-w-3xl leading-relaxed">
        Status reflects enactment of a dedicated national space act. Operators
        may still require telecoms authorisation (BNetzA, Ofcom, ARCEP, etc.)
        even in &quot;no dedicated law&quot; jurisdictions. For draft-status
        countries, timing of enactment is tracked separately in the{" "}
        <Link
          href="/atlas/landing-rights/calendar"
          className="text-emerald-700 hover:underline"
        >
          Landing Rights Calendar
        </Link>
        .
      </footer>
    </div>
  );
}

function StatCard({
  label,
  value,
  total,
  tone,
  sublabel,
}: {
  label: string;
  value: number;
  total: number;
  tone: "emerald" | "amber" | "gray" | "blue";
  sublabel?: string;
}) {
  const toneClasses = {
    emerald: "border-emerald-200 bg-emerald-50/50",
    amber: "border-amber-200 bg-amber-50/50",
    gray: "border-gray-200 bg-gray-50/50",
    blue: "border-blue-200 bg-blue-50/50",
  }[tone];
  const valueClasses = {
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    gray: "text-gray-700",
    blue: "text-blue-700",
  }[tone];
  const pct = Math.round((value / total) * 100);
  return (
    <div className={`flex flex-col gap-1 p-4 rounded-xl border ${toneClasses}`}>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
        {label}
      </span>
      <div className="flex items-baseline gap-2">
        <span className={`text-[28px] font-bold leading-none ${valueClasses}`}>
          {value}
        </span>
        <span className="text-[12px] text-gray-500">/ {total}</span>
        <span className="text-[11px] text-gray-400">· {pct}%</span>
      </div>
      {sublabel && (
        <span className="text-[10px] text-gray-500 mt-0.5">{sublabel}</span>
      )}
    </div>
  );
}
