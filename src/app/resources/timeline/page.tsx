"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Logo from "@/components/ui/Logo";
import {
  ArrowLeft,
  ChevronRight,
  Calendar,
  AlertCircle,
  Clock,
  Check,
} from "lucide-react";

const timelineEvents = [
  {
    date: "July 2025",
    title: "Regulation Published",
    description:
      "EU Space Act published in Official Journal of the European Union",
    status: "completed",
    details: [
      "Official publication in OJ L series",
      "20-day period before entry into force",
      "Beginning of awareness period for operators",
    ],
  },
  {
    date: "August 2025",
    title: "Entry into Force",
    description: "Regulation enters into force, transitional period begins",
    status: "completed",
    details: [
      "Regulation becomes legally binding",
      "NCAs begin setting up authorization procedures",
      "Transitional provisions apply to existing operators",
    ],
  },
  {
    date: "Q4 2025",
    title: "NCA Designation Deadline",
    description: "Member States must designate National Competent Authorities",
    status: "upcoming",
    details: [
      "Each Member State designates one or more NCAs",
      "NCAs must have adequate resources and expertise",
      "Contact points published on Commission website",
    ],
  },
  {
    date: "February 2026",
    title: "Delegated Acts Published",
    description: "Commission publishes detailed technical standards",
    status: "upcoming",
    details: [
      "Debris mitigation technical requirements",
      "Cybersecurity baseline standards",
      "Insurance minimum coverage amounts",
      "LCA methodology specifications",
    ],
  },
  {
    date: "August 2026",
    title: "New Operations Compliance",
    description: "All new space activities require authorization",
    status: "upcoming",
    critical: true,
    details: [
      "No space activity without prior authorization",
      "Applications must be submitted 6 months in advance",
      "Full compliance with all requirements",
    ],
  },
  {
    date: "Q4 2026",
    title: "Registry Operational",
    description: "EU Space Object Registry fully operational",
    status: "upcoming",
    details: [
      "Mandatory registration for all EU space objects",
      "Integration with national registries",
      "Connection to EU SST system",
    ],
  },
  {
    date: "August 2027",
    title: "Existing Operators Deadline",
    description: "Existing operators must obtain authorization",
    status: "upcoming",
    critical: true,
    details: [
      "2-year transition period ends",
      "All existing operations must be authorized",
      "Compliance plans must be approved",
    ],
  },
  {
    date: "2028",
    title: "First Compliance Audits",
    description: "NCAs begin systematic compliance audits",
    status: "future",
    details: [
      "Regular inspection programs begin",
      "Document retention requirements enforced",
      "Penalty framework fully operational",
    ],
  },
  {
    date: "2029",
    title: "5-Year Deorbit Rule",
    description: "Stricter deorbit timeline requirement takes effect",
    status: "future",
    details: [
      "LEO satellites must deorbit within 5 years of EOL",
      "Replaces previous 25-year guideline",
      "Applies to all new missions from this date",
    ],
  },
  {
    date: "2030",
    title: "First Review",
    description: "Commission reviews regulation effectiveness",
    status: "future",
    details: [
      "Assessment of implementation across Member States",
      "Evaluation of debris mitigation progress",
      "Potential amendments proposed",
    ],
  },
];

const criticalDeadlines = [
  {
    date: "August 2026",
    title: "Authorization Required for New Activities",
    daysLabel: "Days remaining",
    description:
      "All new space activities must be authorized before commencement",
  },
  {
    date: "August 2027",
    title: "Existing Operators Compliance",
    daysLabel: "Days remaining",
    description: "All existing operators must obtain authorization",
  },
];

function getDaysUntil(dateString: string): number {
  const targetDate = new Date(dateString);
  const today = new Date();
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export default function TimelinePage() {
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
              <span>Timeline</span>
            </Link>
            <h1 className="text-[clamp(2rem,4vw,3rem)] font-light tracking-[-0.02em] mb-6">
              Compliance Timeline
            </h1>
            <p className="text-[17px] text-white/50 leading-relaxed">
              Key dates and deadlines for EU Space Act implementation. Plan your
              compliance roadmap with these critical milestones.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Critical Deadlines */}
      <section className="py-12 px-6 md:px-12 border-b border-white/[0.06] bg-white/[0.01]">
        <div className="max-w-[900px] mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <AlertCircle size={18} className="text-amber-400" />
            <h2 className="text-[12px] text-amber-400 uppercase tracking-wider">
              Critical Deadlines
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {criticalDeadlines.map((deadline, index) => {
              const days = getDaysUntil(deadline.date);
              return (
                <motion.div
                  key={deadline.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="p-6 bg-amber-500/5 border border-amber-500/20 rounded-xl"
                >
                  <div className="flex items-center gap-2 text-[12px] text-amber-400 mb-3">
                    <Calendar size={14} />
                    <span>{deadline.date}</span>
                  </div>
                  <h3 className="text-[17px] font-medium text-white mb-2">
                    {deadline.title}
                  </h3>
                  <p className="text-[13px] text-white/50 mb-4">
                    {deadline.description}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[28px] font-light text-amber-400">
                      {days > 0 ? days : 0}
                    </span>
                    <span className="text-[12px] text-white/40">
                      {deadline.daysLabel}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Full Timeline */}
      <section className="py-16 px-6 md:px-12">
        <div className="max-w-[900px] mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Clock size={18} className="text-white/40" />
            <h2 className="text-[12px] text-white/40 uppercase tracking-wider">
              Full Implementation Timeline
            </h2>
          </div>

          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[19px] top-0 bottom-0 w-[2px] bg-white/[0.06]" />

            <div className="space-y-6">
              {timelineEvents.map((event, index) => (
                <motion.div
                  key={event.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 + index * 0.05 }}
                  className="relative pl-12"
                >
                  {/* Timeline dot */}
                  <div
                    className={`absolute left-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      event.status === "completed"
                        ? "bg-emerald-500/20"
                        : event.critical
                          ? "bg-amber-500/20"
                          : "bg-white/[0.05]"
                    }`}
                  >
                    {event.status === "completed" ? (
                      <Check size={18} className="text-emerald-400" />
                    ) : event.critical ? (
                      <AlertCircle size={18} className="text-amber-400" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-white/40" />
                    )}
                  </div>

                  {/* Content */}
                  <div
                    className={`p-5 rounded-xl border transition-colors ${
                      event.critical
                        ? "bg-amber-500/5 border-amber-500/20"
                        : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.03]"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-[12px] font-mono text-white/40">
                        {event.date}
                      </span>
                      {event.critical && (
                        <span className="text-[10px] font-mono text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
                          Critical
                        </span>
                      )}
                      {event.status === "completed" && (
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">
                          Completed
                        </span>
                      )}
                    </div>
                    <h3 className="text-[16px] font-medium text-white mb-2">
                      {event.title}
                    </h3>
                    <p className="text-[14px] text-white/50 mb-4">
                      {event.description}
                    </p>
                    <ul className="space-y-2">
                      {event.details.map((detail, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-[13px] text-white/40"
                        >
                          <span className="text-white/20 mt-1">•</span>
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 md:px-12 border-t border-white/[0.06]">
        <div className="max-w-[600px] mx-auto text-center">
          <h2 className="text-[24px] font-light mb-4">
            Don't wait until the deadline
          </h2>
          <p className="text-[15px] text-white/50 mb-8">
            Start your compliance journey today. Our assessment helps you
            identify requirements and build a realistic timeline.
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
