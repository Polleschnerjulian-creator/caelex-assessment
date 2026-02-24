"use client";

import { motion } from "framer-motion";
import {
  FileText,
  FilePieChart,
  FileBarChart,
  FileSearch,
  ArrowRight,
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";

// ─── Types ───

interface MaterialTypeSelectorProps {
  onSelect: (type: string) => void;
}

interface MaterialOption {
  type: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  accent: string;
}

// ─── Material Options ───

const MATERIAL_OPTIONS: MaterialOption[] = [
  {
    type: "executive_summary",
    title: "Executive Summary",
    description:
      "A concise overview of your company, market position, traction, and investment opportunity for busy investors.",
    icon: <FileText size={24} />,
    accent: "emerald",
  },
  {
    type: "investment_teaser",
    title: "Investment Teaser",
    description:
      "A compelling 2-page teaser highlighting your value proposition, key metrics, and fundraising details.",
    icon: <FilePieChart size={24} />,
    accent: "blue",
  },
  {
    type: "company_profile",
    title: "Company Profile",
    description:
      "A comprehensive company profile including team, technology, market analysis, and competitive landscape.",
    icon: <FileBarChart size={24} />,
    accent: "purple",
  },
  {
    type: "risk_report",
    title: "Risk Report",
    description:
      "A detailed risk assessment report covering regulatory, operational, market, and financial risks with mitigation strategies.",
    icon: <FileSearch size={24} />,
    accent: "amber",
  },
];

const ACCENT_CLASSES: Record<
  string,
  { icon: string; hover: string; border: string }
> = {
  emerald: {
    icon: "text-emerald-400",
    hover: "group-hover:border-emerald-500/30 group-hover:shadow-emerald-500/5",
    border: "border-emerald-500/10",
  },
  blue: {
    icon: "text-blue-400",
    hover: "group-hover:border-blue-500/30 group-hover:shadow-blue-500/5",
    border: "border-blue-500/10",
  },
  purple: {
    icon: "text-purple-400",
    hover: "group-hover:border-purple-500/30 group-hover:shadow-purple-500/5",
    border: "border-purple-500/10",
  },
  amber: {
    icon: "text-amber-400",
    hover: "group-hover:border-amber-500/30 group-hover:shadow-amber-500/5",
    border: "border-amber-500/10",
  },
};

// ─── Component ───

export default function MaterialTypeSelector({
  onSelect,
}: MaterialTypeSelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {MATERIAL_OPTIONS.map((option, index) => {
        const accent = ACCENT_CLASSES[option.accent] || ACCENT_CLASSES.emerald;

        return (
          <motion.div
            key={option.type}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
          >
            <button
              onClick={() => onSelect(option.type)}
              className="w-full text-left group"
            >
              <GlassCard
                hover
                className={`p-6 h-full ${accent.hover} transition-all duration-300`}
              >
                {/* Icon */}
                <div
                  className={`w-12 h-12 rounded-xl bg-white/5 border ${accent.border} flex items-center justify-center mb-4`}
                >
                  <span className={accent.icon}>{option.icon}</span>
                </div>

                {/* Title */}
                <h4 className="text-title font-semibold text-white mb-2">
                  {option.title}
                </h4>

                {/* Description */}
                <p className="text-small text-white/45 leading-relaxed mb-4">
                  {option.description}
                </p>

                {/* Generate CTA */}
                <div className="flex items-center gap-1.5 text-small font-medium text-emerald-400 group-hover:text-emerald-300 transition-colors">
                  Generate
                  <ArrowRight
                    size={14}
                    className="group-hover:translate-x-0.5 transition-transform"
                  />
                </div>
              </GlassCard>
            </button>
          </motion.div>
        );
      })}
    </div>
  );
}
