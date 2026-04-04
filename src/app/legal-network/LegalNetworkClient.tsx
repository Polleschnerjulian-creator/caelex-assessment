"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { MapPin, ArrowRight, ExternalLink, Mail } from "lucide-react";

// ─── Types ───

interface Firm {
  id: string;
  name: string;
  city: string;
  country: string;
  specializations: string[];
  jurisdictions: string[];
  description: string;
  website: string;
  contactEmail: string;
  isPlaceholder: boolean;
}

// ─── Data ───

const PLACEHOLDER_FIRMS: Firm[] = [
  {
    id: "placeholder-1",
    name: "Partner Law Firm",
    city: "München",
    country: "Germany",
    specializations: ["Space Law", "EU Space Act", "Licensing"],
    jurisdictions: ["Germany", "Austria"],
    description:
      "Placeholder — partnership details pending. Specializing in German and Austrian space regulation, licensing, and authorization workflows.",
    website: "#",
    contactEmail: "cs@caelex.eu",
    isPlaceholder: true,
  },
  {
    id: "placeholder-2",
    name: "Partner Law Firm",
    city: "Paris",
    country: "France",
    specializations: ["Space Law", "CNES Regulation", "Insurance"],
    jurisdictions: ["France", "Belgium"],
    description:
      "Placeholder — partnership details pending. French space law expertise including CNES authorization procedures and launch liability.",
    website: "#",
    contactEmail: "cs@caelex.eu",
    isPlaceholder: true,
  },
  {
    id: "placeholder-3",
    name: "Partner Law Firm",
    city: "The Hague",
    country: "Netherlands",
    specializations: ["Space Law", "International Law", "ESA Legal"],
    jurisdictions: ["Netherlands", "Luxembourg"],
    description:
      "Placeholder — partnership details pending. International space law and ESA-related legal matters.",
    website: "#",
    contactEmail: "cs@caelex.eu",
    isPlaceholder: true,
  },
  {
    id: "placeholder-4",
    name: "Partner Law Firm",
    city: "London",
    country: "UK",
    specializations: ["UK Space Industry Act", "Export Control", "Insurance"],
    jurisdictions: ["UK"],
    description:
      "Placeholder — partnership details pending. UK Space Industry Act compliance, ITAR/EAR export control, and space insurance.",
    website: "#",
    contactEmail: "cs@caelex.eu",
    isPlaceholder: true,
  },
  {
    id: "placeholder-5",
    name: "Partner Law Firm",
    city: "Brussels",
    country: "Belgium",
    specializations: ["EU Regulatory", "NIS2", "Cyber Resilience Act"],
    jurisdictions: ["Belgium", "EU-wide"],
    description:
      "Placeholder — partnership details pending. EU-level regulatory compliance, NIS2 and CRA advisory for space operators.",
    website: "#",
    contactEmail: "cs@caelex.eu",
    isPlaceholder: true,
  },
  {
    id: "placeholder-6",
    name: "Partner Law Firm",
    city: "Rome",
    country: "Italy",
    specializations: ["Space Law", "ASI Regulation", "Defence"],
    jurisdictions: ["Italy"],
    description:
      "Placeholder — partnership details pending. Italian space regulatory framework and ASI authorization procedures.",
    website: "#",
    contactEmail: "cs@caelex.eu",
    isPlaceholder: true,
  },
  {
    id: "placeholder-7",
    name: "Partner Law Firm",
    city: "Stockholm",
    country: "Sweden",
    specializations: ["Space Law", "Nordic Regulation", "Environmental"],
    jurisdictions: ["Sweden", "Norway", "Finland"],
    description:
      "Placeholder — partnership details pending. Nordic space regulation and environmental compliance for launch activities.",
    website: "#",
    contactEmail: "cs@caelex.eu",
    isPlaceholder: true,
  },
  {
    id: "placeholder-8",
    name: "Partner Law Firm",
    city: "Madrid",
    country: "Spain",
    specializations: ["Space Law", "Spectrum/ITU", "Telecommunications"],
    jurisdictions: ["Spain"],
    description:
      "Placeholder — partnership details pending. Spanish space regulation and ITU frequency coordination.",
    website: "#",
    contactEmail: "cs@caelex.eu",
    isPlaceholder: true,
  },
];

const JURISDICTIONS = [
  "All",
  "Germany",
  "France",
  "Netherlands",
  "Luxembourg",
  "UK",
  "Belgium",
  "Italy",
  "Spain",
  "Austria",
  "Sweden",
];

const SPECIALIZATIONS = [
  "All",
  "Space Law",
  "Cybersecurity/NIS2",
  "CRA/Product Compliance",
  "Export Control",
  "Insurance",
  "Licensing",
];

// ─── Firm Card ───

function FirmCard({ firm, index }: { firm: Firm; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
      className={`bg-white rounded-2xl shadow-sm flex flex-col h-full ${
        firm.isPlaceholder
          ? "border border-dashed border-[#d1d5db]"
          : "border border-[#e5e7eb]"
      }`}
    >
      <div className="p-6 flex flex-col gap-4 flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="text-[#111827] font-semibold text-[16px] leading-tight">
                {firm.name}
              </h3>
              {firm.isPlaceholder && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide uppercase bg-[#f3f4f6] text-[#9ca3af] border border-[#e5e7eb]">
                  Partnership pending
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[13px] text-[#6b7280]">
              <MapPin size={12} className="shrink-0" />
              <span>
                {firm.city}, {firm.country}
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-[13px] text-[#6b7280] leading-relaxed line-clamp-3">
          {firm.description}
        </p>

        {/* Specializations */}
        <div>
          <p className="text-[10px] uppercase tracking-[0.12em] text-[#9ca3af] font-medium mb-2">
            Specializations
          </p>
          <div className="flex flex-wrap gap-1.5">
            {firm.specializations.map((spec) => (
              <span
                key={spec}
                className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#f3f4f6] text-[#6b7280] border border-[#e5e7eb]"
              >
                {spec}
              </span>
            ))}
          </div>
        </div>

        {/* Jurisdictions */}
        <div>
          <p className="text-[10px] uppercase tracking-[0.12em] text-[#9ca3af] font-medium mb-2">
            Jurisdictions
          </p>
          <div className="flex flex-wrap gap-1.5">
            {firm.jurisdictions.map((jur) => (
              <span
                key={jur}
                className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#f9fafb] text-[#9ca3af] border border-[#e5e7eb]"
              >
                {jur}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 pb-6 pt-3 flex items-center justify-between border-t border-[#f3f4f6] mt-auto">
        <a
          href={`mailto:${firm.contactEmail}?subject=Caelex Legal Network — Inquiry`}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#111827] hover:bg-black text-white rounded-xl text-[12px] font-medium transition-colors"
        >
          <Mail size={12} />
          Kontakt aufnehmen
          <ArrowRight size={12} />
        </a>

        {firm.website !== "#" ? (
          <a
            href={firm.website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[12px] text-[#9ca3af] hover:text-[#111827] transition-colors"
          >
            Profil ansehen
            <ExternalLink size={11} />
          </a>
        ) : (
          <span className="inline-flex items-center gap-1 text-[12px] text-[#d1d5db] cursor-not-allowed select-none">
            Profil ansehen
            <ExternalLink size={11} />
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main Client Component ───

export default function LegalNetworkClient() {
  const [activeJurisdiction, setActiveJurisdiction] = useState("All");
  const [activeSpecialization, setActiveSpecialization] = useState("All");

  const filtered = useMemo(() => {
    return PLACEHOLDER_FIRMS.filter((firm) => {
      const matchesJurisdiction =
        activeJurisdiction === "All" ||
        firm.jurisdictions.some(
          (j) =>
            j.toLowerCase() === activeJurisdiction.toLowerCase() ||
            j === "EU-wide",
        );

      const matchesSpecialization =
        activeSpecialization === "All" ||
        firm.specializations.some((s) => {
          const sl = s.toLowerCase();
          const al = activeSpecialization.toLowerCase();
          if (activeSpecialization === "Cybersecurity/NIS2")
            return sl.includes("nis2") || sl.includes("cyber");
          if (activeSpecialization === "CRA/Product Compliance")
            return sl.includes("cra") || sl.includes("cyber resilience");
          if (activeSpecialization === "Export Control")
            return sl.includes("export");
          if (activeSpecialization === "Insurance")
            return sl.includes("insurance");
          if (activeSpecialization === "Licensing")
            return sl.includes("licensing") || sl.includes("licens");
          if (activeSpecialization === "Space Law") return s === "Space Law";
          return sl.includes(al);
        });

      return matchesJurisdiction && matchesSpecialization;
    });
  }, [activeJurisdiction, activeSpecialization]);

  const filterButtonClass = (isActive: boolean) =>
    `px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors whitespace-nowrap cursor-pointer ${
      isActive
        ? "bg-[#111827] text-white"
        : "bg-[#f3f4f6] text-[#6b7280] hover:bg-[#e5e7eb] border border-[#e5e7eb]"
    }`;

  const hasActiveFilters =
    activeJurisdiction !== "All" || activeSpecialization !== "All";

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      {/* Hero */}
      <div className="bg-white border-b border-[#e5e7eb]">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-20">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="max-w-2xl"
          >
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#9ca3af] font-medium mb-4">
              Caelex Legal Network
            </p>
            <h1 className="text-[36px] md:text-[48px] font-semibold text-[#111827] leading-tight tracking-[-0.02em] mb-5">
              Legal Network
            </h1>
            <p className="text-[16px] text-[#6b7280] leading-relaxed mb-6 max-w-xl">
              Caelex connects you with leading space law firms across Europe.
              Our compliance data, their legal expertise.
            </p>
            <p className="text-[12px] text-[#9ca3af] leading-relaxed max-w-lg border-l-2 border-[#e5e7eb] pl-4">
              Caelex provides regulatory guidance, not legal advice. For binding
              compliance decisions, work with qualified legal professionals.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Filter Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-white border border-[#e5e7eb] rounded-2xl p-5 mb-8 shadow-sm space-y-4"
        >
          {/* Jurisdiction filter */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-[#9ca3af] font-medium mb-3">
              Jurisdiction
            </p>
            <div className="flex flex-wrap gap-2">
              {JURISDICTIONS.map((j) => (
                <button
                  key={j}
                  onClick={() => setActiveJurisdiction(j)}
                  className={filterButtonClass(activeJurisdiction === j)}
                >
                  {j}
                </button>
              ))}
            </div>
          </div>

          {/* Specialization filter */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-[#9ca3af] font-medium mb-3">
              Specialization
            </p>
            <div className="flex flex-wrap gap-2">
              {SPECIALIZATIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setActiveSpecialization(s)}
                  className={filterButtonClass(activeSpecialization === s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Results bar */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-[13px] text-[#9ca3af]">
            {filtered.length} {filtered.length === 1 ? "firm" : "firms"} found
          </p>
          {hasActiveFilters && (
            <button
              onClick={() => {
                setActiveJurisdiction("All");
                setActiveSpecialization("All");
              }}
              className="text-[12px] text-[#9ca3af] hover:text-[#111827] transition-colors underline underline-offset-2 cursor-pointer"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Firms Grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-16">
            {filtered.map((firm, i) => (
              <FirmCard key={firm.id} firm={firm} index={i} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 mb-16">
            <p className="text-[15px] font-medium text-[#111827] mb-2">
              No firms match your filters
            </p>
            <p className="text-[13px] text-[#9ca3af]">
              Try adjusting the jurisdiction or specialization.
            </p>
          </div>
        )}

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="bg-white border border-[#e5e7eb] rounded-2xl shadow-sm p-10 text-center mb-10"
        >
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#9ca3af] font-medium mb-4">
            Für Kanzleien
          </p>
          <h2 className="text-[24px] font-semibold text-[#111827] mb-3 tracking-[-0.01em]">
            Sind Sie eine Kanzlei mit Space-Law-Expertise?
          </h2>
          <p className="text-[14px] text-[#6b7280] leading-relaxed max-w-lg mx-auto mb-8">
            Werden Sie Teil des Caelex Legal Network. Erhalten Sie qualifizierte
            Mandantenanfragen direkt aus unserer Compliance-Plattform.
          </p>
          <a
            href="mailto:cs@caelex.eu?subject=Caelex Legal Network Partnership"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#111827] hover:bg-black text-white rounded-xl text-[13px] font-medium transition-colors"
          >
            Partnerschaft anfragen
            <ArrowRight size={14} />
          </a>
        </motion.div>
      </div>
    </div>
  );
}
