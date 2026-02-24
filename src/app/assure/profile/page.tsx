"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Building2,
  Cpu,
  Globe,
  Users,
  DollarSign,
  Scale,
  Swords,
  Rocket,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import ProfileCompletionBar from "@/components/assure/ProfileCompletionBar";
import ComplyIntegrationBanner from "@/components/assure/ComplyIntegrationBanner";

// ─── Types ───

interface SectionInfo {
  key: string;
  label: string;
  icon: React.ReactNode;
  completion: number;
  fields: string[];
}

interface CompletenessData {
  overall: number;
  sections: Array<{ name: string; completion: number }>;
  isComplyLinked?: boolean;
}

// ─── Section Config ───

const SECTION_CONFIG: Array<{
  key: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}> = [
  {
    key: "overview",
    label: "Overview",
    icon: <Building2 size={18} />,
    description: "Company name, legal entity, founding date, headquarters.",
  },
  {
    key: "technology",
    label: "Technology",
    icon: <Cpu size={18} />,
    description: "TRL level, product name, product status, IP portfolio.",
  },
  {
    key: "market",
    label: "Market",
    icon: <Globe size={18} />,
    description: "TAM, SAM, SOM, market growth rate, target segments.",
  },
  {
    key: "team",
    label: "Team",
    icon: <Users size={18} />,
    description: "Founders, team size, engineering ratio, key hires.",
  },
  {
    key: "financial",
    label: "Financial",
    icon: <DollarSign size={18} />,
    description: "Annual revenue, monthly burn, runway, unit economics.",
  },
  {
    key: "regulatory",
    label: "Regulatory",
    icon: <Scale size={18} />,
    description: "Jurisdictions, authorization status, compliance posture.",
  },
  {
    key: "competitive",
    label: "Competitive",
    icon: <Swords size={18} />,
    description: "Competitors, competitive advantage, moats, differentiation.",
  },
  {
    key: "traction",
    label: "Traction",
    icon: <Rocket size={18} />,
    description: "Key metrics, partnerships, contracts, milestones.",
  },
];

// ─── Skeleton ───

function ProfileSkeleton() {
  return (
    <div
      className="animate-pulse space-y-6"
      role="status"
      aria-label="Loading profile"
    >
      <div className="h-10 bg-white/5 rounded-lg w-1/3" />
      <div className="h-20 bg-white/5 rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-40 bg-white/5 rounded-xl" />
        ))}
      </div>
      <span className="sr-only">Loading profile...</span>
    </div>
  );
}

// ─── Component ───

export default function AssureProfilePage() {
  const [completeness, setCompleteness] = useState<CompletenessData | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/assure/profile/completeness");
        if (res.ok) {
          const data = await res.json();
          setCompleteness(data);
        }
      } catch (err) {
        console.error("Failed to fetch completeness:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <ProfileSkeleton />;

  const getSectionCompletion = (key: string): number => {
    if (!completeness?.sections) return 0;
    const section = completeness.sections.find(
      (s) => s.name.toLowerCase() === key.toLowerCase(),
    );
    return section?.completion ?? 0;
  };

  const overallCompletion = completeness?.overall ?? 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-display font-bold text-white mb-2"
        >
          Company Profile
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="text-body-lg text-white/40"
        >
          Complete all 8 sections to maximize your Investment Readiness Score.
        </motion.p>
      </div>

      {/* Overall completion */}
      <GlassCard hover={false} className="p-6 mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-heading font-semibold text-white">
            Overall Completion
          </h2>
          <span
            className={`text-display-sm font-bold ${
              overallCompletion >= 80
                ? "text-emerald-400"
                : overallCompletion >= 50
                  ? "text-amber-400"
                  : "text-red-400"
            }`}
          >
            {overallCompletion}%
          </span>
        </div>
        <ProfileCompletionBar
          sections={SECTION_CONFIG.map((s) => ({
            name: s.label,
            completion: getSectionCompletion(s.key),
          }))}
        />
      </GlassCard>

      {/* Comply integration */}
      {!completeness?.isComplyLinked && (
        <div className="mb-8">
          <ComplyIntegrationBanner isLinked={false} />
        </div>
      )}

      {/* Section cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SECTION_CONFIG.map((section, index) => {
          const completion = getSectionCompletion(section.key);
          const isComplete = completion >= 100;

          return (
            <motion.div
              key={section.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <Link href={`/assure/profile/${section.key}`}>
                <GlassCard className="p-5 h-full">
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isComplete
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-white/5 text-white/40 border border-white/10"
                      }`}
                    >
                      {isComplete ? <CheckCircle size={18} /> : section.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-body-lg font-semibold text-white">
                          {section.label}
                        </h3>
                        <span
                          className={`text-small font-semibold ${
                            completion >= 80
                              ? "text-emerald-400"
                              : completion >= 50
                                ? "text-amber-400"
                                : completion > 0
                                  ? "text-red-400"
                                  : "text-white/20"
                          }`}
                        >
                          {completion}%
                        </span>
                      </div>
                      <p className="text-small text-white/35 mb-3">
                        {section.description}
                      </p>

                      {/* Mini progress bar */}
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${
                            completion >= 80
                              ? "bg-emerald-500"
                              : completion >= 50
                                ? "bg-amber-500"
                                : completion > 0
                                  ? "bg-red-500"
                                  : "bg-white/10"
                          }`}
                          initial={{ width: 0 }}
                          animate={{ width: `${completion}%` }}
                          transition={{
                            duration: 0.6,
                            delay: 0.1 + index * 0.04,
                          }}
                        />
                      </div>

                      <div className="mt-3 flex items-center gap-1 text-small text-emerald-400/70 hover:text-emerald-400 transition-colors">
                        {completion === 0 ? "Start" : "Edit"} section
                        <ArrowRight size={12} />
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
