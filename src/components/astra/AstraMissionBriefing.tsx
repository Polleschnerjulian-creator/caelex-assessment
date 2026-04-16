"use client";

import React, { useEffect, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useSession } from "next-auth/react";
import {
  AlertTriangle,
  Clock,
  Shield,
  FileText,
  BarChart3,
  Globe,
  Zap,
  ChevronRight,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Insight {
  id: string;
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  actionUrl?: string;
  actionLabel?: string;
}

interface InsightsData {
  rrsScore: number;
  deadlineCount: number;
  insights: Insight[];
}

// ─── Severity Config ────────────────────────────────────────────────────────

const SEVERITY_CONFIG = {
  critical: {
    border: "border-l-red-400",
    icon: AlertTriangle,
    iconColor: "text-red-500",
  },
  high: {
    border: "border-l-amber-400",
    icon: Clock,
    iconColor: "text-amber-500",
  },
  medium: {
    border: "border-l-gray-300",
    icon: Shield,
    iconColor: "text-gray-400",
  },
  low: {
    border: "border-l-gray-300",
    icon: Shield,
    iconColor: "text-gray-400",
  },
};

// ─── Fallback Quick Actions ─────────────────────────────────────────────────

const GENERIC_ACTIONS = [
  {
    icon: BarChart3,
    label: "Compliance Score",
    prompt: "Show me my current compliance overview with all module scores",
  },
  {
    icon: FileText,
    label: "Report generieren",
    prompt: "Help me generate a compliance report for my organization",
  },
  {
    icon: Shield,
    label: "NIS2 Check",
    prompt: "What are my NIS2 obligations and what steps should I take next?",
  },
  {
    icon: Globe,
    label: "Jurisdiktionen",
    prompt:
      "Compare the regulatory frameworks of the top 3 jurisdictions for my operator type",
  },
];

// ─── Compliance Score Ring ──────────────────────────────────────────────────

function ComplianceRing({ score }: { score: number }) {
  const motionScore = useMotionValue(0);
  const displayScore = useTransform(motionScore, (v) => Math.round(v));
  const [rendered, setRendered] = useState(0);

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = useTransform(
    motionScore,
    (v) => circumference - (v / 100) * circumference,
  );

  useEffect(() => {
    const controls = animate(motionScore, score, {
      duration: 1.4,
      ease: [0.16, 1, 0.3, 1],
    });
    const unsubscribe = displayScore.on("change", (v) => setRendered(v));
    return () => {
      controls.stop();
      unsubscribe();
    };
  }, [score, motionScore, displayScore]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex items-center justify-center"
      style={{ width: 100, height: 100 }}
    >
      <svg width={100} height={100} className="absolute inset-0 -rotate-90">
        <defs>
          <linearGradient id="rrs-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#111827" />
            <stop offset="100%" stopColor="#6B7280" />
          </linearGradient>
        </defs>
        {/* Background track */}
        <circle
          cx={50}
          cy={50}
          r={radius}
          fill="none"
          stroke="rgba(0,0,0,0.06)"
          strokeWidth={5}
        />
        {/* Score arc */}
        <motion.circle
          cx={50}
          cy={50}
          r={radius}
          fill="none"
          stroke="url(#rrs-gradient)"
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ strokeDashoffset }}
        />
      </svg>
      <div className="flex flex-col items-center z-10">
        <span className="text-display font-bold text-gray-900 leading-none">
          {rendered}
        </span>
        <span className="text-micro text-gray-400 uppercase tracking-wider mt-0.5">
          RRS
        </span>
      </div>
    </motion.div>
  );
}

// ─── Skeleton Loader ────────────────────────────────────────────────────────

function BriefingSkeleton() {
  return (
    <div className="flex flex-col items-center px-6 py-8 gap-6">
      {/* Ring skeleton */}
      <div className="w-[100px] h-[100px] rounded-full bg-gray-100 animate-pulse" />
      {/* Greeting skeleton */}
      <div className="flex flex-col items-center gap-2">
        <div className="h-5 w-48 rounded bg-gray-100 animate-pulse" />
        <div className="h-3 w-36 rounded bg-gray-100 animate-pulse" />
      </div>
      {/* Card skeletons */}
      <div className="w-full flex flex-col gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

interface AstraMissionBriefingProps {
  onSendMessage: (text: string) => void;
}

export default function AstraMissionBriefing({
  onSendMessage,
}: AstraMissionBriefingProps) {
  const { data: session } = useSession();
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Time-based greeting
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Guten Morgen" : hour < 18 ? "Guten Tag" : "Guten Abend";
  const userName = session?.user?.name?.split(" ")[0] || null;

  // Fetch insights
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/astra/insights");
        if (!res.ok) throw new Error("fetch failed");
        const json = await res.json();
        if (!cancelled) {
          // API returns { rrsScore, deadlineCount, insights } directly
          setData({
            rrsScore: json.rrsScore ?? 0,
            deadlineCount: json.deadlineCount ?? 0,
            insights: json.insights ?? [],
          });
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Derive quick actions from insights
  function getQuickActions() {
    if (!data || data.insights.length === 0) return GENERIC_ACTIONS;

    const actions: typeof GENERIC_ACTIONS = [];
    const seen = new Set<string>();

    for (const insight of data.insights) {
      if (actions.length >= 4) break;
      if (insight.type === "assessment" && !seen.has("assessment")) {
        seen.add("assessment");
        actions.push({
          icon: Zap,
          label: "Assessment starten",
          prompt:
            insight.actionLabel || "Start the missing compliance assessment",
        });
      } else if (insight.type === "deadline" && !seen.has("deadline")) {
        seen.add("deadline");
        actions.push({
          icon: Clock,
          label: "Deadlines pruefen",
          prompt: "Show me all upcoming compliance deadlines",
        });
      } else if (!seen.has(insight.type)) {
        seen.add(insight.type);
        actions.push({
          icon: Shield,
          label: insight.actionLabel || insight.title,
          prompt: insight.description,
        });
      }
    }

    // Fill remainder with generic actions
    for (const ga of GENERIC_ACTIONS) {
      if (actions.length >= 4) break;
      if (!actions.some((a) => a.label === ga.label)) {
        actions.push(ga);
      }
    }

    return actions.slice(0, 4);
  }

  if (loading) return <BriefingSkeleton />;

  const rrsScore = data?.rrsScore ?? 0;
  const deadlineCount = data?.deadlineCount ?? 0;
  const insights = data?.insights ?? [];
  const quickActions = error ? GENERIC_ACTIONS : getQuickActions();
  const topInsights = insights.slice(0, 3);

  return (
    <div className="flex flex-col items-center px-6 py-8 gap-5">
      {/* ─── Compliance Score Ring ─── */}
      <ComplianceRing score={rrsScore} />

      {/* ─── Greeting ─── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center gap-1"
      >
        <h2 className="text-heading font-medium text-gray-900">
          {greeting}
          {userName ? `, ${userName}.` : "."}
        </h2>
        <p className="text-body text-gray-500">
          {deadlineCount > 0
            ? `${deadlineCount} Deadline${deadlineCount !== 1 ? "s" : ""}`
            : "Keine Deadlines"}
          {" \u00B7 "}
          RRS {rrsScore}/100
        </p>
      </motion.div>

      {/* ─── Insight Cards ─── */}
      {topInsights.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          className="w-full flex flex-col gap-2"
        >
          {topInsights.map((insight, i) => {
            const config =
              SEVERITY_CONFIG[insight.severity] || SEVERITY_CONFIG.medium;
            const Icon = config.icon;

            return (
              <motion.button
                key={insight.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.4 + i * 0.08,
                  duration: 0.4,
                  ease: [0.16, 1, 0.3, 1],
                }}
                onClick={() => {
                  if (insight.actionUrl) {
                    window.location.href = insight.actionUrl;
                  } else {
                    onSendMessage(
                      insight.actionLabel || `Tell me about: ${insight.title}`,
                    );
                  }
                }}
                className={`
                  group w-full text-left rounded-xl
                  bg-white border border-gray-200
                  hover:border-gray-300 hover:shadow-sm transition-all duration-200
                  border-l-2 ${config.border}
                  p-3.5 flex items-start gap-3 cursor-pointer
                `}
              >
                <div className={`mt-0.5 ${config.iconColor} flex-shrink-0`}>
                  <Icon size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-small font-medium text-gray-800 truncate">
                    {insight.title}
                  </div>
                  <div className="text-caption text-gray-500 truncate mt-0.5">
                    {insight.description}
                  </div>
                </div>
                <ChevronRight
                  size={14}
                  className="text-gray-300 group-hover:text-gray-500 transition-colors mt-0.5 flex-shrink-0"
                />
              </motion.button>
            );
          })}
        </motion.div>
      )}

      {/* ─── Quick Actions ─── */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full flex flex-wrap gap-2 justify-center"
      >
        {quickActions.map((action) => (
          <button
            key={action.label}
            onClick={() => onSendMessage(action.prompt)}
            className="
              bg-white hover:bg-gray-50
              border border-gray-200 rounded-xl
              px-4 py-2 flex items-center gap-2
              text-caption font-medium text-gray-600
              hover:text-gray-800 hover:border-gray-300 transition-all duration-200 cursor-pointer
            "
          >
            <action.icon size={13} className="text-gray-400" />
            {action.label}
          </button>
        ))}
      </motion.div>
    </div>
  );
}
