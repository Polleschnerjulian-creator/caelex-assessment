"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Logo from "@/components/ui/Logo";
import { ArrowLeft, ChevronRight, ChevronDown, HelpCircle } from "lucide-react";

const faqCategories = [
  {
    title: "General",
    faqs: [
      {
        question: "What is the EU Space Act?",
        answer: `The EU Space Act (COM(2025) 335) is a comprehensive regulation establishing a unified legal framework for commercial space activities in the European Union. It covers authorization requirements, safety standards, debris mitigation, cybersecurity, environmental sustainability, and liability rules for all space operators under EU jurisdiction. It's the first regulation of its kind in Europe, replacing the patchwork of national laws with a harmonized approach.`,
      },
      {
        question: "When does the EU Space Act come into effect?",
        answer: `The regulation was published in July 2025 and entered into force in August 2025. However, there are transitional periods: new space activities require authorization from August 2026, while existing operators have until August 2027 to obtain authorization. Some technical requirements, like the 5-year deorbit rule, have longer implementation timelines.`,
      },
      {
        question: "Does the EU Space Act apply to non-EU companies?",
        answer: `Yes, the regulation has extraterritorial reach. It applies to: (1) any space activity conducted from EU territory, regardless of the operator's nationality; (2) space activities by EU-registered entities anywhere in the world; (3) non-EU operators providing services to EU customers or using EU ground infrastructure. If you're unsure whether you're in scope, our assessment tool can help determine applicability.`,
      },
      {
        question: "What are the penalties for non-compliance?",
        answer: `Penalties can be severe: up to 2% of annual global turnover for serious violations, fixed fines of €10 million or more for specific breaches, and potential revocation of authorization for repeated non-compliance. National Competent Authorities have discretion in applying penalties based on the severity, duration, and intentionality of violations.`,
      },
    ],
  },
  {
    title: "Authorization",
    faqs: [
      {
        question: "Do I need authorization for every satellite I launch?",
        answer: `Each space activity requires authorization, but this doesn't necessarily mean one authorization per satellite. Constellation operators can obtain a single authorization covering multiple satellites of the same design and mission profile. The authorization specifies the number and type of objects, orbital parameters, and operational conditions. Material changes (like adding satellites or changing orbits) require authorization amendments.`,
      },
      {
        question: "How long does the authorization process take?",
        answer: `The regulation requires NCAs to process applications within 6 months of receiving a complete application. However, the clock stops if additional information is requested. In practice, well-prepared applications with complete documentation can be processed faster. We recommend submitting applications at least 9-12 months before planned operations to account for potential clarifications.`,
      },
      {
        question: "Can I transfer my authorization to another company?",
        answer: `Yes, authorizations can be transferred, but this requires NCA approval. The new operator must demonstrate they meet all the original authorization conditions, including technical capability, financial viability, and insurance coverage. The transfer process typically takes 2-3 months. Unauthorized transfers are a serious violation.`,
      },
      {
        question: "What happens if my authorization application is rejected?",
        answer: `If rejected, the NCA must provide written reasons for the decision. You have the right to appeal through administrative and judicial procedures in the relevant Member State. Common reasons for rejection include incomplete debris mitigation plans, inadequate insurance coverage, or concerns about the operator's technical or financial capability. Applications can usually be resubmitted after addressing the identified deficiencies.`,
      },
    ],
  },
  {
    title: "Debris Mitigation",
    faqs: [
      {
        question: "What is the 5-year deorbit rule?",
        answer: `The EU Space Act introduces a requirement for LEO satellites to deorbit within 5 years of end-of-mission, significantly stricter than the previous 25-year guideline. This applies to new missions authorized after 2029. Operators must demonstrate deorbit capability at the authorization stage, either through propulsive maneuvers, drag-enhancement devices, or natural decay for very low orbits.`,
      },
      {
        question: "What debris mitigation documentation do I need?",
        answer: `Authorization applications must include: (1) a Debris Mitigation Plan covering design-for-demise, passivation procedures, collision avoidance capability, and end-of-life disposal; (2) a Probability of Collision Assessment using standardized methodology; (3) demonstration of deorbit capability and timeline; (4) plans for tracking and conjunction management. The regulation references ISO 24113 and IADC guidelines as baseline standards.`,
      },
      {
        question: "How does collision avoidance work under the regulation?",
        answer: `Operators must participate in conjunction assessment processes, either through the EU SST system or equivalent commercial providers. When a conjunction warning is received, operators must assess the risk and perform avoidance maneuvers if the probability of collision exceeds defined thresholds. All maneuvers must be coordinated and reported. Failure to respond to conjunction warnings is a compliance violation.`,
      },
    ],
  },
  {
    title: "Cybersecurity",
    faqs: [
      {
        question: "What cybersecurity measures are required?",
        answer: `The regulation requires: (1) security-by-design in spacecraft and ground systems; (2) encryption of command links and telemetry for sensitive missions; (3) regular vulnerability assessments and penetration testing; (4) incident detection and response capabilities; (5) secure software development practices; (6) supply chain security measures. The specific requirements scale with mission criticality and data sensitivity.`,
      },
      {
        question: "How quickly must I report security incidents?",
        answer: `Significant cybersecurity incidents must be reported to the National Competent Authority and ENISA within 24 hours of detection. A full incident report, including root cause analysis and remediation measures, must be submitted within 72 hours. "Significant" incidents include unauthorized access to command systems, data breaches affecting EU citizens, and any incident affecting multiple operators or critical infrastructure.`,
      },
      {
        question: "Does this overlap with NIS2 requirements?",
        answer: `Yes, there is overlap. Space operators providing essential services may be subject to both the EU Space Act and the NIS2 Directive. The Space Act cybersecurity requirements are designed to be complementary, with specific provisions for space-unique threats. Compliance with NIS2 generally satisfies the ground segment cybersecurity requirements, but space segment security has additional considerations.`,
      },
    ],
  },
  {
    title: "Insurance & Liability",
    faqs: [
      {
        question: "How much insurance do I need?",
        answer: `Minimum coverage amounts depend on mission risk profile, including orbital regime, satellite mass, and proximity to other assets. Delegated acts specify the calculation methodology, but typical requirements range from €10-50 million for small LEO satellites to €100+ million for GEO missions or proximity operations. Higher-risk activities like in-orbit servicing or debris removal have elevated requirements.`,
      },
      {
        question: "What does third-party liability cover?",
        answer: `Third-party liability insurance must cover damage caused by your space object to other spacecraft, space stations, ground infrastructure, and persons or property on Earth. This includes damage from collisions, debris generation, re-entry incidents, and interference with other space operations. First-party coverage (damage to your own assets) is not mandated but is recommended.`,
      },
      {
        question: "Who is liable for collisions in orbit?",
        answer: `The regulation establishes a fault-based liability regime for in-orbit collisions between EU-authorized operators. If both operators followed conjunction assessment procedures, liability is apportioned based on the circumstances. If one operator failed to respond to collision warnings, they bear greater liability. For collisions involving non-EU objects, international space law (particularly the Liability Convention) applies.`,
      },
    ],
  },
  {
    title: "Environmental",
    faqs: [
      {
        question: "What is required for Life Cycle Assessment?",
        answer: `Operators must conduct LCAs covering: (1) manufacturing emissions and resource consumption; (2) launch vehicle environmental impact; (3) in-orbit operations including propellant usage; (4) end-of-life disposal, including re-entry emissions and ground impact. The methodology is specified in delegated acts and aligns with ISO 14040/14044 standards adapted for space activities.`,
      },
      {
        question: "How often must I submit environmental reports?",
        answer: `Annual sustainability reports are required for operators with more than 5 active spacecraft or annual revenues exceeding €10 million from space activities. Reports must include emissions data, debris generation metrics, and progress toward sustainability targets. Smaller operators have simplified reporting requirements on a biennial basis.`,
      },
      {
        question: "Does this affect launch provider selection?",
        answer: `The LCA requirement means operators must obtain environmental data from their launch providers. EU-based launch providers will need to provide standardized emissions data. For non-EU launches, operators may need to use default values or obtain data directly from providers. Over time, this creates incentives to choose lower-emission launch options.`,
      },
    ],
  },
];

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-white/[0.06] last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-start justify-between gap-4 py-5 text-left group"
      >
        <span className="text-[15px] text-white group-hover:text-white/80 transition-colors">
          {question}
        </span>
        <ChevronDown
          size={18}
          className={`text-white/40 flex-shrink-0 mt-1 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="text-[14px] text-white/50 leading-relaxed pb-5 whitespace-pre-line">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQPage() {
  return (
    <main className="min-h-screen bg-black text-white">
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
      <section className="pt-32 pb-12 px-6 md:px-12 border-b border-white/[0.06]">
        <div className="max-w-[800px] mx-auto">
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
              <span>FAQ</span>
            </Link>
            <h1 className="text-[clamp(2rem,4vw,3rem)] font-light tracking-[-0.02em] mb-6">
              Frequently Asked Questions
            </h1>
            <p className="text-[17px] text-white/50 leading-relaxed">
              Answers to the most common questions about EU Space Act
              compliance. Can't find what you're looking for?{" "}
              <Link
                href="/contact"
                className="text-white/70 hover:text-white underline"
              >
                Contact us
              </Link>
              .
            </p>
          </motion.div>
        </div>
      </section>

      {/* FAQ Categories */}
      <section className="py-12 px-6 md:px-12">
        <div className="max-w-[800px] mx-auto">
          {faqCategories.map((category, categoryIndex) => (
            <motion.div
              key={category.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: categoryIndex * 0.1 }}
              className="mb-12"
            >
              <div className="flex items-center gap-3 mb-4">
                <HelpCircle size={18} className="text-white/40" />
                <h2 className="text-[12px] text-white/40 uppercase tracking-wider">
                  {category.title}
                </h2>
              </div>
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-6">
                {category.faqs.map((faq) => (
                  <FAQItem
                    key={faq.question}
                    question={faq.question}
                    answer={faq.answer}
                  />
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 md:px-12 border-t border-white/[0.06]">
        <div className="max-w-[600px] mx-auto text-center">
          <h2 className="text-[24px] font-light mb-4">Still have questions?</h2>
          <p className="text-[15px] text-white/50 mb-8">
            Our team is here to help you navigate EU Space Act compliance.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 text-[15px] font-medium text-black bg-white px-8 py-4 rounded-full hover:bg-white/90 transition-all duration-300"
            >
              Contact Us
              <span>→</span>
            </Link>
            <Link
              href="/assessment"
              className="inline-flex items-center gap-2 text-[15px] text-white/60 hover:text-white transition-colors"
            >
              Take Assessment
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
