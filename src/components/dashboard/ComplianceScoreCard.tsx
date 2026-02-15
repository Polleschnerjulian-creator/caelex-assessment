"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  AlertTriangle,
  Loader2,
  TrendingUp,
  HelpCircle,
} from "lucide-react";
import Link from "next/link";
import DownloadReportButton from "./DownloadReportButton";
import { useLanguage } from "@/components/providers/LanguageProvider";

interface ModuleScore {
  score: number;
  weight: number;
  weightedScore: number;
  status: "compliant" | "partial" | "non_compliant" | "not_started";
}

interface Recommendation {
  priority: "critical" | "high" | "medium" | "low";
  module: string;
  action: string;
  impact: string;
  estimatedEffort: "low" | "medium" | "high";
}

interface ComplianceScoreData {
  overall: number;
  grade: "A" | "B" | "C" | "D" | "F";
  status: string;
  breakdown: Record<string, ModuleScore>;
  recommendations: Recommendation[];
}

const gradeColors: Record<string, string> = {
  A: "from-emerald-500 to-emerald-600 text-white",
  B: "from-green-500 to-green-600 text-white",
  C: "from-amber-500 to-amber-600 text-white",
  D: "from-orange-500 to-orange-600 text-white",
  F: "from-red-500 to-red-600 text-white",
};

const gradeRingColors: Record<string, string> = {
  A: "text-emerald-500",
  B: "text-green-500",
  C: "text-amber-500",
  D: "text-orange-500",
  F: "text-red-500",
};

const moduleKeyMap: Record<string, string> = {
  authorization: "modules.authorization",
  debris: "modules.debris",
  cybersecurity: "modules.cybersecurity",
  insurance: "modules.insurance",
  environmental: "modules.environmental",
  reporting: "modules.reporting",
};

const statusBarColors: Record<string, string> = {
  compliant: "bg-emerald-500",
  partial: "bg-amber-500",
  non_compliant: "bg-red-500",
  not_started: "bg-white/10",
};

const priorityColors: Record<string, string> = {
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  medium: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  low: "bg-white/10 text-white/50 border-white/10",
};

export default function ComplianceScoreCard() {
  const { t } = useLanguage();
  const [data, setData] = useState<ComplianceScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchScore() {
      try {
        const res = await fetch("/api/dashboard/compliance-score");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchScore();
  }, []);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 mb-8"
      >
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
        </div>
      </motion.div>
    );
  }

  if (error || !data) {
    return null;
  }

  const topRecommendations = data.recommendations.slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 mb-8"
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
            {t("dashboard.complianceScore")}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <DownloadReportButton />
          <Link
            href="/dashboard/compliance-methodology"
            className="flex items-center gap-1 text-[11px] text-white/30 hover:text-white/60 transition-colors"
          >
            <HelpCircle className="w-3 h-3" />
            <span>{t("dashboard.methodology")}</span>
          </Link>
          <div className="flex items-center gap-1 text-[11px] text-white/30">
            <TrendingUp className="w-3 h-3" />
            <span>{t("dashboard.updatedLive")}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr_1fr] gap-8">
        {/* Left: Grade + Score */}
        <div className="flex items-center gap-5">
          <div className="relative">
            <div
              className={`w-20 h-20 rounded-full bg-gradient-to-br ${gradeColors[data.grade]} flex items-center justify-center shadow-lg`}
            >
              <span className="text-[32px] font-bold leading-none">
                {data.grade}
              </span>
            </div>
            <svg
              className={`absolute inset-0 w-20 h-20 -rotate-90 ${gradeRingColors[data.grade]}`}
            >
              <circle
                cx="40"
                cy="40"
                r="36"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray={`${(data.overall / 100) * 226} 226`}
                strokeLinecap="round"
                opacity={0.3}
              />
            </svg>
          </div>
          <div>
            <p className="text-[36px] font-mono font-semibold text-white leading-none">
              {data.overall}
            </p>
            <p className="text-[11px] text-white/50 mt-1">
              {t("dashboard.outOf100")}
            </p>
          </div>
        </div>

        {/* Center: Module Breakdown */}
        <div className="space-y-2.5">
          {Object.entries(data.breakdown).map(([key, mod]) => (
            <div key={key} className="flex items-center gap-3">
              <span className="text-[11px] text-white/50 w-24 truncate">
                {t(moduleKeyMap[key] || `modules.${key}`)}
              </span>
              <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${statusBarColors[mod.status]}`}
                  style={{ width: `${mod.score}%` }}
                />
              </div>
              <span className="text-[11px] font-mono text-white/60 w-8 text-right">
                {mod.score}
              </span>
            </div>
          ))}
        </div>

        {/* Right: Top Recommendations */}
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-white/40 mb-2">
            {t("dashboard.topRecommendations")}
          </p>
          {topRecommendations.length > 0 ? (
            <div className="space-y-2">
              {topRecommendations.map((rec, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 text-[11px] leading-snug"
                >
                  <span
                    className={`shrink-0 mt-0.5 text-[8px] font-mono uppercase px-1.5 py-0.5 rounded border ${priorityColors[rec.priority]}`}
                  >
                    {t(`common.${rec.priority}`)}
                  </span>
                  <span className="text-white/60">{rec.action}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[11px] text-emerald-400/70">
              <AlertTriangle className="w-3 h-3" />
              <span>{t("dashboard.allOnTrack")}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
