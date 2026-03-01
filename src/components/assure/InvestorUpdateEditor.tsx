"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Send,
  Calendar,
  BarChart3,
  Target,
  DollarSign,
  Sparkles,
  MessageSquare,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";

// ─── Types ───

interface UpdateConfig {
  period: "monthly" | "quarterly";
  sections: {
    metrics: boolean;
    milestones: boolean;
    financials: boolean;
    highlights: boolean;
    asks: boolean;
  };
  customNotes: string;
}

interface KeyMetric {
  name: string;
  value: string;
}

interface MilestoneEntry {
  title: string;
  status: string;
}

interface InvestorUpdateEditorProps {
  onGenerate: (config: UpdateConfig) => void;
  keyMetrics?: KeyMetric[];
  milestones?: MilestoneEntry[];
}

// ─── Section Toggle ───

function SectionToggle({
  label,
  description,
  icon,
  enabled,
  onToggle,
}: {
  label: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`
        w-full flex items-start gap-3 p-3 rounded-lg border transition-all
        ${
          enabled
            ? "bg-emerald-500/5 border-emerald-500/20"
            : "bg-white/[0.02] border-white/5 hover:border-white/10"
        }
      `}
    >
      <span
        className={`mt-0.5 ${enabled ? "text-emerald-400" : "text-white/30"}`}
      >
        {icon}
      </span>
      <div className="flex-1 text-left">
        <span
          className={`text-body font-medium block ${enabled ? "text-white/80" : "text-white/50"}`}
        >
          {label}
        </span>
        <span className="text-micro text-white/30">{description}</span>
      </div>
      {enabled ? (
        <ToggleRight
          size={20}
          className="text-emerald-400 flex-shrink-0 mt-0.5"
        />
      ) : (
        <ToggleLeft size={20} className="text-white/20 flex-shrink-0 mt-0.5" />
      )}
    </button>
  );
}

// ─── Component ───

export default function InvestorUpdateEditor({
  onGenerate,
  keyMetrics = [],
  milestones = [],
}: InvestorUpdateEditorProps) {
  const [period, setPeriod] = useState<"monthly" | "quarterly">("monthly");
  const [sections, setSections] = useState({
    metrics: true,
    milestones: true,
    financials: true,
    highlights: true,
    asks: false,
  });
  const [customNotes, setCustomNotes] = useState("");

  const toggleSection = (key: keyof typeof sections) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleGenerate = () => {
    onGenerate({ period, sections, customNotes });
  };

  const enabledCount = Object.values(sections).filter(Boolean).length;

  return (
    <GlassCard hover={false} className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles size={18} className="text-emerald-400" />
        <h3 className="text-heading font-semibold text-white">
          Investor Update Composer
        </h3>
      </div>

      {/* Period selector */}
      <div className="mb-5">
        <label className="text-small font-medium text-white/60 mb-2 block">
          Update Period
        </label>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPeriod("monthly")}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-body font-medium transition-all
              ${
                period === "monthly"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "text-white/40 hover:text-white/60 border border-white/5 hover:border-white/10"
              }
            `}
          >
            <Calendar size={14} />
            Monthly
          </button>
          <button
            onClick={() => setPeriod("quarterly")}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-body font-medium transition-all
              ${
                period === "quarterly"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "text-white/40 hover:text-white/60 border border-white/5 hover:border-white/10"
              }
            `}
          >
            <Calendar size={14} />
            Quarterly
          </button>
        </div>
      </div>

      {/* Section toggles */}
      <div className="mb-5">
        <label className="text-small font-medium text-white/60 mb-2 block">
          Include Sections ({enabledCount} selected)
        </label>
        <div className="space-y-2">
          <SectionToggle
            label="Key Metrics"
            description={`${keyMetrics.length} metrics available`}
            icon={<BarChart3 size={14} />}
            enabled={sections.metrics}
            onToggle={() => toggleSection("metrics")}
          />
          <SectionToggle
            label="Milestones"
            description={`${milestones.length} milestones tracked`}
            icon={<Target size={14} />}
            enabled={sections.milestones}
            onToggle={() => toggleSection("milestones")}
          />
          <SectionToggle
            label="Financial Overview"
            description="Revenue, burn rate, runway"
            icon={<DollarSign size={14} />}
            enabled={sections.financials}
            onToggle={() => toggleSection("financials")}
          />
          <SectionToggle
            label="Highlights & Wins"
            description="Key achievements this period"
            icon={<Sparkles size={14} />}
            enabled={sections.highlights}
            onToggle={() => toggleSection("highlights")}
          />
          <SectionToggle
            label="Asks & Support Needed"
            description="Hiring, intros, advice requests"
            icon={<MessageSquare size={14} />}
            enabled={sections.asks}
            onToggle={() => toggleSection("asks")}
          />
        </div>
      </div>

      {/* Custom notes */}
      <div className="mb-6">
        <label className="text-small font-medium text-white/60 mb-2 block">
          Custom Notes (optional)
        </label>
        <textarea
          value={customNotes}
          onChange={(e) => setCustomNotes(e.target.value)}
          placeholder="Add any additional context or specific topics to cover..."
          rows={3}
          className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2.5 text-body-lg text-white placeholder:text-white/25 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all resize-y"
        />
      </div>

      {/* Preview of included data */}
      {sections.metrics && keyMetrics.length > 0 && (
        <motion.div
          initial={false}
          animate={{ opacity: 1, height: "auto" }}
          className="mb-5 p-3 rounded-lg bg-white/[0.02] border border-white/5"
        >
          <span className="text-micro text-white/30 uppercase tracking-wider block mb-2">
            Metrics Preview
          </span>
          <div className="flex flex-wrap gap-3">
            {keyMetrics.slice(0, 6).map((m) => (
              <div key={m.name} className="flex items-center gap-1.5">
                <span className="text-small text-white/40">{m.name}:</span>
                <span className="text-small font-medium text-white/70">
                  {m.value}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={enabledCount === 0}
        className="w-full inline-flex items-center justify-center gap-2 bg-emerald-500 text-white text-subtitle font-medium px-6 py-3 rounded-lg hover:bg-emerald-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Send size={16} />
        Generate {period === "monthly" ? "Monthly" : "Quarterly"} Update
      </button>
    </GlassCard>
  );
}
