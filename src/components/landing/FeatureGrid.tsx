"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  FolderOpen,
  CalendarClock,
  ListChecks,
  Users,
  Webhook,
  Globe,
} from "lucide-react";

const features = [
  {
    icon: FolderOpen,
    title: "Document Vault",
    description:
      "20+ document categories with expiry tracking, compliance checks, and version control. Upload once, reference across all modules.",
    highlight: "Expiry alerts 90/60/30 days before deadline",
  },
  {
    icon: CalendarClock,
    title: "Timeline & Deadlines",
    description:
      "Calendar view with configurable reminders, urgency tracking, and milestone management. Never miss a regulatory deadline again.",
    highlight: "Configurable alerts at 30, 14, 7, 3, 1 days",
  },
  {
    icon: ListChecks,
    title: "Compliance Tracker",
    description:
      "Track all 119 articles across 8 modules with status tracking, priority badges, and phase management from pre-authorization to end-of-life.",
    highlight: "Filter by module, status, and compliance type",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description:
      "Invite team members, assign compliance responsibilities, and manage organization-level access with role-based permissions.",
    highlight: "Organization management with RBAC",
  },
  {
    icon: Webhook,
    title: "API & Integrations",
    description:
      "REST API, webhook notifications, and automated workflows. Connect Caelex to your existing tools and processes.",
    highlight: "Webhook delivery logs and retry logic",
  },
  {
    icon: Globe,
    title: "NCA Routing Engine",
    description:
      "All 27 EU National Competent Authorities mapped with jurisdiction logic. Auto-determines which authority handles your authorization.",
    highlight: "Multi-authority coordination for complex cases",
  },
];

export default function FeatureGrid() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="relative py-32 md:py-40 bg-black">
      {/* Section number */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ duration: 0.8 }}
        className="absolute top-12 right-6 md:right-12"
      >
        <span className="font-mono text-[11px] text-white/30">08 / 12</span>
      </motion.div>

      <div className="max-w-[1200px] mx-auto px-6 md:px-12">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/40 block mb-6">
            Platform Capabilities
          </span>
          <h2 className="text-[clamp(1.75rem,3.5vw,2.75rem)] font-light tracking-[-0.02em] text-white leading-[1.2] max-w-[600px] mx-auto">
            Built for teams.
            <br />
            <span className="text-white/50">Built for scale.</span>
          </h2>
        </motion.div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 25 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.15 + i * 0.08 }}
                className="group bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 hover:bg-white/[0.04] hover:border-white/[0.12] transition-all duration-500"
              >
                {/* Icon */}
                <div className="p-2.5 rounded-lg bg-white/[0.04] group-hover:bg-white/[0.06] transition-colors w-fit mb-5">
                  <Icon size={18} className="text-white/50" />
                </div>

                {/* Title */}
                <h3 className="text-[15px] font-medium text-white mb-3 tracking-[-0.01em]">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-[13px] text-white/45 leading-[1.7] mb-4">
                  {feature.description}
                </p>

                {/* Highlight */}
                <div className="pt-4 border-t border-white/[0.06]">
                  <p className="font-mono text-[10px] text-white/30 leading-[1.5]">
                    {feature.highlight}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
