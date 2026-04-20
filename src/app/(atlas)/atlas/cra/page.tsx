import {
  ShieldCheck,
  Search,
  Filter,
  Calendar,
  AlertTriangle,
} from "lucide-react";

/**
 * EU Cyber Resilience Act (CRA) — Regulation (EU) 2024/2847
 *
 * Adopted 23 Oct 2024, entered into force 10 Dec 2024.
 * Key obligations apply 11 Dec 2027.
 * Reporting obligations begin 11 Sep 2026.
 *
 * Structure mirrors /atlas/eu-space-act (chapter grid + article browser
 * placeholder) so that navigation, aesthetics, and future article-viewer
 * integration remain consistent across EU-level regulatory pages.
 */

const CHAPTERS = [
  {
    num: "I",
    title: "General Provisions",
    articles: "1–7",
    status: "final",
    description:
      "Subject matter, scope, definitions, interaction with other EU law.",
  },
  {
    num: "II",
    title: "Obligations of Economic Operators",
    articles: "13–25",
    status: "final",
    description:
      "Manufacturer, importer, distributor duties; open-source stewards.",
  },
  {
    num: "III",
    title: "Conformity of the Product",
    articles: "26–33",
    status: "final",
    description:
      "Essential cybersecurity requirements, conformity assessment, CE marking.",
  },
  {
    num: "IV",
    title: "Notification of Conformity Bodies",
    articles: "34–48",
    status: "final",
    description:
      "Notified bodies, accreditation, designation of notifying authorities.",
  },
  {
    num: "V",
    title: "Market Surveillance & Enforcement",
    articles: "49–57",
    status: "final",
    description:
      "Market surveillance authorities, withdrawal procedures, sanctions.",
  },
  {
    num: "VI",
    title: "Delegated Powers & Committee",
    articles: "58–60",
    status: "final",
    description:
      "Delegated acts, Article 290 TFEU procedure, committee procedure.",
  },
  {
    num: "VII",
    title: "Confidentiality & Penalties",
    articles: "61–64",
    status: "final",
    description: "Administrative fines up to €15M or 2.5% global turnover.",
  },
  {
    num: "VIII",
    title: "Transitional & Final Provisions",
    articles: "65–71",
    status: "final",
    description: "Entry into force, application dates, review clauses.",
  },
];

const KEY_DATES = [
  {
    date: "10 Dec 2024",
    label: "Entered into force",
    status: "past",
  },
  {
    date: "11 Jun 2026",
    label: "Notified bodies can be designated",
    status: "upcoming",
  },
  {
    date: "11 Sep 2026",
    label: "Reporting obligations begin (Art. 14)",
    status: "upcoming",
  },
  {
    date: "11 Dec 2027",
    label: "Full application — all obligations in force",
    status: "critical",
  },
];

const SPACE_RELEVANCE = [
  {
    title: "Satellite software & flight software",
    body: "Flight software with remote uplink, payload control systems, and onboard AI agents are products with digital elements under Art. 3(1). Manufacturers must meet Annex I essential requirements from Dec 2027.",
  },
  {
    title: "Ground station software",
    body: "TT&C software, mission control, and data processing pipelines placed on the EU market fall under CRA. Applies even when the space segment itself is outside EU jurisdiction.",
  },
  {
    title: "IoT-enabled space hardware",
    body: "Inter-satellite links, edge compute modules, and sensor bus controllers with network interfaces are in scope. Class I/II classification determines conformity assessment route.",
  },
  {
    title: "Vulnerability handling",
    body: "Art. 13 + Annex I Part II require a coordinated vulnerability disclosure policy, SBOM, and active exploitation reporting to ENISA within 24 hours (incident) / 72 hours (detailed report).",
  },
];

export default function CRAPage() {
  return (
    <div className="flex flex-col h-full min-h-screen bg-[#F7F8FA] p-4 gap-3">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-emerald-600" strokeWidth={1.5} />
          <h1 className="text-[18px] font-semibold tracking-tight text-gray-900">
            Cyber Resilience Act
          </h1>
          <span className="text-[11px] text-gray-400">
            Regulation (EU) 2024/2847
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-md bg-white border border-gray-200 px-2.5 py-1.5 shadow-sm">
            <Search className="h-3 w-3 text-gray-400" strokeWidth={1.5} />
            <span className="text-[11px] text-gray-400">
              Search articles...
            </span>
          </div>
          <button className="flex items-center gap-1.5 rounded-md bg-white border border-gray-200 px-2.5 py-1.5 text-gray-500 hover:text-gray-700 transition-colors shadow-sm">
            <Filter className="h-3 w-3" strokeWidth={1.5} />
            <span className="text-[11px]">Filter</span>
          </button>
        </div>
      </header>

      {/* Key dates timeline */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar
            className="h-3.5 w-3.5 text-emerald-600"
            strokeWidth={1.5}
          />
          <span className="text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
            Key Dates
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {KEY_DATES.map((d) => (
            <div
              key={d.date}
              className={`rounded-lg border p-3 ${
                d.status === "past"
                  ? "border-gray-200 bg-gray-50"
                  : d.status === "critical"
                    ? "border-red-200 bg-red-50"
                    : "border-emerald-200 bg-emerald-50"
              }`}
            >
              <div
                className={`text-[11px] font-semibold tracking-wider uppercase mb-1 ${
                  d.status === "past"
                    ? "text-gray-500"
                    : d.status === "critical"
                      ? "text-red-700"
                      : "text-emerald-700"
                }`}
              >
                {d.date}
              </div>
              <div
                className={`text-[12px] ${
                  d.status === "past" ? "text-gray-600" : "text-gray-900"
                }`}
              >
                {d.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chapter grid */}
      <div>
        <div className="flex items-center gap-2 mb-2 px-1">
          <span className="text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
            Structure
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {CHAPTERS.map((ch) => (
            <div
              key={ch.num}
              className="
                group relative overflow-hidden rounded-xl border border-gray-200
                bg-white p-4 shadow-sm
                hover:border-emerald-300 hover:shadow-md
                transition-all duration-200 cursor-pointer
              "
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-emerald-600 tracking-wider">
                  Chapter {ch.num}
                </span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[9px] font-medium tracking-wider uppercase ${
                    ch.status === "final"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}
                >
                  {ch.status}
                </span>
              </div>
              <h3 className="text-[13px] font-medium text-gray-900 mb-1">
                {ch.title}
              </h3>
              <p className="text-[11px] text-gray-500 leading-snug mb-2">
                {ch.description}
              </p>
              <span className="text-[10px] text-gray-400">
                Articles {ch.articles}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Space-sector relevance */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle
            className="h-3.5 w-3.5 text-amber-600"
            strokeWidth={1.5}
          />
          <span className="text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
            Why This Matters for Space Operators
          </span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {SPACE_RELEVANCE.map((item) => (
            <div
              key={item.title}
              className="rounded-lg border border-gray-100 bg-[#FAFBFC] p-3"
            >
              <h3 className="text-[12px] font-medium text-gray-900 mb-1">
                {item.title}
              </h3>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Official sources */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
            Official Sources
          </span>
        </div>
        <ul className="space-y-2 text-[12px]">
          <li>
            <a
              href="https://eur-lex.europa.eu/eli/reg/2024/2847/oj"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-700 hover:text-emerald-800 hover:underline"
            >
              Regulation (EU) 2024/2847 — EUR-Lex official text
            </a>
            <span className="text-gray-400"> · consolidated version</span>
          </li>
          <li>
            <a
              href="https://digital-strategy.ec.europa.eu/en/policies/cyber-resilience-act"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-700 hover:text-emerald-800 hover:underline"
            >
              European Commission — Cyber Resilience Act overview
            </a>
          </li>
          <li>
            <a
              href="https://www.enisa.europa.eu/topics/cyber-resilience-act"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-700 hover:text-emerald-800 hover:underline"
            >
              ENISA — CRA implementation guidance
            </a>
          </li>
        </ul>
      </div>

      {/* Article browser skeleton */}
      <div className="flex-1 rounded-xl border border-gray-200 bg-white shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
            Article Browser
          </span>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <ShieldCheck
              className="h-8 w-8 text-emerald-200 mx-auto mb-3"
              strokeWidth={1}
            />
            <p className="text-[12px] text-gray-500">
              Select a chapter to browse its articles.
            </p>
            <p className="text-[11px] text-gray-400 mt-1">
              Full-text article viewer with compliance mapping and
              cross-references to NIS2, ENISA standards, and space-sector
              implementations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
