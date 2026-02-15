"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  MinusCircle,
  HelpCircle,
} from "lucide-react";
import type { EUSpaceActPreview } from "@/lib/space-law-types";

interface EUSpaceActCrossRefProps {
  preview: EUSpaceActPreview;
  jurisdictions: Array<{
    countryCode: string;
    countryName: string;
    flagEmoji: string;
  }>;
}

const RELATIONSHIP_CONFIG: Record<
  string,
  {
    label: string;
    badgeClass: string;
    icon: typeof AlertCircle;
  }
> = {
  superseded: {
    label: "Will be superseded",
    badgeClass: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    icon: AlertCircle,
  },
  complementary: {
    label: "Complementary",
    badgeClass: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    icon: CheckCircle2,
  },
  parallel: {
    label: "Independent",
    badgeClass: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    icon: MinusCircle,
  },
  gap: {
    label: "Fills gap",
    badgeClass: "bg-red-500/10 border-red-500/20 text-red-400",
    icon: HelpCircle,
  },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

export default function EUSpaceActCrossRef({
  preview,
  jurisdictions,
}: EUSpaceActCrossRefProps) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-6">
      {/* Section Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <ArrowRight className="h-4 w-4 text-blue-400" aria-hidden="true" />
          <h3 className="text-xs font-mono uppercase tracking-widest text-white/40">
            EU Space Act Cross-Reference
          </h3>
        </div>
        <p className="text-sm text-white/50">
          How the EU Space Act (2030) will interact with national provisions
        </p>
      </div>

      {/* Overall Relationship */}
      {preview.overallRelationship && (
        <p className="text-sm text-white/50 mb-6 leading-relaxed">
          {preview.overallRelationship}
        </p>
      )}

      {/* Per-jurisdiction Cards */}
      <motion.div
        className="space-y-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {jurisdictions.map((jurisdiction) => {
          const notes = preview.jurisdictionNotes[jurisdiction.countryCode];
          if (!notes) return null;

          const config =
            RELATIONSHIP_CONFIG[notes.relationship] ??
            RELATIONSHIP_CONFIG.parallel;
          const BadgeIcon = config.icon;

          return (
            <motion.div
              key={jurisdiction.countryCode}
              variants={cardVariants}
              className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-4"
            >
              {/* Header row: flag + name + badge */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{jurisdiction.flagEmoji}</span>
                  <span className="text-sm font-medium text-white/90">
                    {jurisdiction.countryName}
                  </span>
                </div>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.badgeClass}`}
                >
                  <BadgeIcon className="h-3 w-3" aria-hidden="true" />
                  {config.label}
                </span>
              </div>

              {/* Description */}
              <p className="text-sm text-white/50 leading-relaxed">
                {notes.description}
              </p>

              {/* Key Changes */}
              {notes.keyChanges && notes.keyChanges.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {notes.keyChanges.map((change, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-sm text-white/40"
                    >
                      <span
                        className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/30"
                        aria-hidden="true"
                      />
                      <span>{change}</span>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
