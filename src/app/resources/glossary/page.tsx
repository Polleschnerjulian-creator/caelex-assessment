"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import Logo from "@/components/ui/Logo";
import { ArrowLeft, ChevronRight, Search, BookMarked } from "lucide-react";

const glossaryTerms = [
  {
    term: "Authorization",
    definition:
      "The formal approval granted by a National Competent Authority (NCA) permitting an operator to conduct specific space activities. Required before commencing any space operation under the EU Space Act.",
    related: ["NCA", "Space Activity", "Operator"],
  },
  {
    term: "Collision Avoidance Maneuver (CAM)",
    definition:
      "An orbital adjustment performed by a spacecraft operator to reduce the probability of collision with another space object, typically executed when conjunction analysis indicates unacceptable risk levels.",
    related: ["Conjunction Assessment", "Space Debris"],
  },
  {
    term: "Conjunction Assessment",
    definition:
      "The process of analyzing predicted close approaches between space objects to determine collision probability and inform decisions about avoidance maneuvers. The EU SST system provides conjunction warnings to operators.",
    related: ["EU SST", "Collision Avoidance Maneuver"],
  },
  {
    term: "De-orbit",
    definition:
      "The controlled or uncontrolled descent of a spacecraft from orbit, resulting in atmospheric re-entry. The EU Space Act requires LEO satellites to de-orbit within 5 years of end-of-mission.",
    related: ["End-of-Life", "Passivation", "Space Debris"],
  },
  {
    term: "Delegated Acts",
    definition:
      "Secondary legislation adopted by the European Commission to supplement the EU Space Act with detailed technical requirements. These specify insurance minimums, debris mitigation standards, and reporting formats.",
    related: ["European Commission", "NCA"],
  },
  {
    term: "Design for Demise",
    definition:
      "Spacecraft design approach that ensures complete or near-complete destruction during atmospheric re-entry, minimizing the risk of debris surviving to reach Earth's surface.",
    related: ["De-orbit", "Space Debris", "Re-entry"],
  },
  {
    term: "End-of-Life (EOL)",
    definition:
      "The point at which a spacecraft ceases active operations, either due to mission completion, system failure, or operational decision. EOL triggers disposal obligations under the EU Space Act.",
    related: ["De-orbit", "Passivation", "Graveyard Orbit"],
  },
  {
    term: "EU SST (Space Surveillance and Tracking)",
    definition:
      "The European Union's system for monitoring space objects, providing conjunction warnings, and supporting space situational awareness. Operators must register with and respond to EU SST warnings.",
    related: ["Conjunction Assessment", "Space Object Registry"],
  },
  {
    term: "Geostationary Orbit (GEO)",
    definition:
      "A circular orbit approximately 35,786 km above Earth's equator where satellites appear stationary relative to a point on Earth. GEO satellites have specific disposal requirements involving transfer to graveyard orbits.",
    related: ["Graveyard Orbit", "LEO", "Orbital Regime"],
  },
  {
    term: "Graveyard Orbit",
    definition:
      "An orbit significantly above GEO (typically 300+ km higher) used for disposal of geostationary satellites at end-of-life. Transfer to graveyard orbit preserves the valuable GEO belt for active missions.",
    related: ["GEO", "End-of-Life", "De-orbit"],
  },
  {
    term: "In-Orbit Servicing (IOS)",
    definition:
      "Space activities involving close proximity operations with other spacecraft, including inspection, refueling, repair, upgrade, or relocation. Subject to enhanced authorization requirements due to collision risk.",
    related: ["Proximity Operations", "Authorization"],
  },
  {
    term: "IADC Guidelines",
    definition:
      "Space debris mitigation guidelines published by the Inter-Agency Space Debris Coordination Committee, referenced as baseline standards in the EU Space Act for debris prevention and disposal practices.",
    related: ["Space Debris", "De-orbit", "Passivation"],
  },
  {
    term: "LEO (Low Earth Orbit)",
    definition:
      "Orbital region from approximately 160 km to 2,000 km altitude. The EU Space Act's 5-year de-orbit requirement applies primarily to LEO satellites.",
    related: ["De-orbit", "GEO", "Orbital Regime"],
  },
  {
    term: "Life Cycle Assessment (LCA)",
    definition:
      "A systematic analysis of environmental impacts throughout a product's life, from raw material extraction through manufacturing, operation, and disposal. Required for spacecraft and launch vehicles under the EU Space Act.",
    related: ["Environmental Sustainability", "Sustainability Report"],
  },
  {
    term: "National Competent Authority (NCA)",
    definition:
      "The governmental body designated by each EU Member State to implement the EU Space Act, including processing authorization applications, conducting inspections, and enforcing compliance.",
    related: ["Authorization", "Member State"],
  },
  {
    term: "Operator",
    definition:
      "Any natural or legal person that conducts or intends to conduct space activities. This includes satellite operators, launch service providers, ground segment operators, and in-orbit servicing providers.",
    related: ["Authorization", "Space Activity"],
  },
  {
    term: "Orbital Regime",
    definition:
      "A classification of orbits based on altitude and characteristics, including LEO, MEO (Medium Earth Orbit), GEO, and HEO (Highly Elliptical Orbit). Different regimes have different regulatory requirements.",
    related: ["LEO", "GEO", "De-orbit"],
  },
  {
    term: "Passivation",
    definition:
      "The removal of all stored energy sources from a spacecraft at end-of-life, including depleting propellant, discharging batteries, and venting pressure vessels. Required to prevent fragmentation events.",
    related: ["End-of-Life", "Space Debris"],
  },
  {
    term: "Proximity Operations",
    definition:
      "Spacecraft maneuvers conducted in close vicinity to another space object, typically within a few kilometers. Subject to enhanced safety requirements and coordination obligations.",
    related: ["In-Orbit Servicing", "Conjunction Assessment"],
  },
  {
    term: "Re-entry",
    definition:
      "The return of a space object to Earth's atmosphere, either controlled (targeted to unpopulated areas) or uncontrolled (natural decay). The EU Space Act requires casualty risk assessment for all re-entries.",
    related: ["De-orbit", "Design for Demise"],
  },
  {
    term: "Space Activity",
    definition:
      "Under the EU Space Act, any activity involving the launch, operation, guidance, or return of a space object, including ground segment operations essential to spacecraft control.",
    related: ["Operator", "Authorization", "Space Object"],
  },
  {
    term: "Space Debris",
    definition:
      "Non-functional human-made objects in space, including defunct satellites, rocket bodies, fragmentation debris, and mission-related objects. Mitigation of debris generation is a core EU Space Act requirement.",
    related: ["De-orbit", "Passivation", "IADC Guidelines"],
  },
  {
    term: "Space Object",
    definition:
      "Any human-made object launched or intended to be launched into outer space, including satellites, launch vehicle stages, and any components thereof. All space objects must be registered under the EU Space Act.",
    related: ["Space Object Registry", "Registration"],
  },
  {
    term: "Space Object Registry",
    definition:
      "The EU database of space objects authorized or registered under Member State jurisdiction, containing orbital parameters, operator information, and mission status. Complements the UN Registry of Space Objects.",
    related: ["Space Object", "EU SST", "Registration"],
  },
  {
    term: "Space Situational Awareness (SSA)",
    definition:
      "The knowledge and characterization of the space environment, including tracking of space objects, space weather monitoring, and near-Earth object observation.",
    related: ["EU SST", "Conjunction Assessment"],
  },
  {
    term: "Sustainability Report",
    definition:
      "Annual or biennial report required from operators detailing environmental performance, including emissions data, debris generation metrics, and progress toward sustainability targets.",
    related: ["Life Cycle Assessment", "Environmental Sustainability"],
  },
  {
    term: "Third-Party Liability",
    definition:
      "Legal responsibility for damage caused to parties not involved in a space activity, including damage to other operators' spacecraft, ground infrastructure, or persons and property on Earth.",
    related: ["Insurance", "Liability Convention"],
  },
  {
    term: "Transfer of Authorization",
    definition:
      "The process by which an authorization is reassigned from one operator to another, requiring NCA approval and demonstration that the new operator meets all applicable requirements.",
    related: ["Authorization", "NCA"],
  },
];

export default function GlossaryPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredTerms = glossaryTerms.filter(
    (item) =>
      item.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.definition.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const termsByLetter = alphabet.reduce(
    (acc, letter) => {
      const terms = filteredTerms.filter((t) =>
        t.term.toUpperCase().startsWith(letter),
      );
      if (terms.length > 0) {
        acc[letter] = terms;
      }
      return acc;
    },
    {} as Record<string, typeof glossaryTerms>,
  );

  return (
    <main className="dark-section min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="flex items-center justify-between h-16">
            <Link
              href="/"
              className="transition-opacity duration-300 hover:opacity-70"
            >
              <Logo size={24} className="text-white" />
            </Link>
            <Link
              href="/resources"
              className="flex items-center gap-2 text-[13px] text-white/50 hover:text-white transition-colors"
            >
              <ArrowLeft size={16} />
              <span>Resources</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-8 px-6 md:px-12 border-b border-white/[0.06]">
        <div className="max-w-[900px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Link
              href="/resources"
              className="inline-flex items-center gap-2 text-[12px] text-white/40 hover:text-white/60 transition-colors mb-6"
            >
              <span>Resources</span>
              <ChevronRight size={12} />
              <span>Glossary</span>
            </Link>
            <div className="flex items-center gap-4 mb-6">
              <BookMarked size={32} className="text-white/60" />
              <h1 className="text-[clamp(2rem,4vw,3rem)] font-light tracking-[-0.02em]">
                Space Law Glossary
              </h1>
            </div>
            <p className="text-[17px] text-white/50 leading-relaxed mb-8">
              {glossaryTerms.length} essential terms for understanding EU Space
              Act compliance and space regulation terminology.
            </p>

            {/* Search */}
            <div className="relative">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
              />
              <input
                type="text"
                placeholder="Search terms..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-12 pr-4 py-3 text-[15px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 transition-colors"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Glossary Content */}
      <section className="py-12 px-6 md:px-12">
        <div className="max-w-[900px] mx-auto">
          {Object.keys(termsByLetter).length === 0 ? (
            <div className="text-center py-16">
              <p className="text-white/40">
                No terms found matching "{searchTerm}"
              </p>
            </div>
          ) : (
            Object.entries(termsByLetter).map(([letter, terms]) => (
              <motion.div
                key={letter}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="mb-12"
              >
                <div className="sticky top-16 bg-black/90 backdrop-blur-sm py-3 mb-4 z-10">
                  <span className="text-[24px] font-light text-white/80">
                    {letter}
                  </span>
                </div>
                <div className="space-y-4">
                  {terms.map((item) => (
                    <div
                      key={item.term}
                      className="p-5 bg-white/[0.02] border border-white/[0.06] rounded-xl hover:bg-white/[0.03] transition-colors"
                    >
                      <h3 className="text-[16px] font-medium text-white mb-2">
                        {item.term}
                      </h3>
                      <p className="text-[14px] text-white/50 leading-relaxed mb-3">
                        {item.definition}
                      </p>
                      {item.related.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] text-white/30">
                            Related:
                          </span>
                          {item.related.map((rel) => (
                            <span
                              key={rel}
                              className="text-[11px] text-white/50 bg-white/[0.05] px-2 py-1 rounded"
                            >
                              {rel}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 md:px-12 border-t border-white/[0.06]">
        <div className="max-w-[600px] mx-auto text-center">
          <h2 className="text-[24px] font-light mb-4">
            Ready to assess your compliance?
          </h2>
          <p className="text-[15px] text-white/50 mb-8">
            Use our free tool to understand which EU Space Act requirements
            apply to you.
          </p>
          <Link
            href="/assessment"
            className="inline-flex items-center gap-2 text-[15px] font-medium text-black bg-white px-8 py-4 rounded-full hover:bg-white/90 transition-all duration-300"
          >
            Start Assessment
            <span>→</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
