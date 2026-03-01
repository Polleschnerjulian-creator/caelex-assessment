"use client";

import { motion } from "framer-motion";
import { Link2, ShieldCheck, ArrowRight, Sparkles } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";

// ─── Types ───

interface ComplyIntegrationBannerProps {
  isLinked: boolean;
  onLink?: () => void;
  rrsScore?: number;
}

// ─── Component ───

export default function ComplyIntegrationBanner({
  isLinked,
  onLink,
  rrsScore,
}: ComplyIntegrationBannerProps) {
  if (isLinked) {
    return (
      <GlassCard hover={false} highlighted className="p-5">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={20} className="text-emerald-400" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h4 className="text-body-lg font-semibold text-white">
                Caelex Comply Connected
              </h4>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-micro font-medium text-emerald-400">
                <ShieldCheck size={10} />
                Verified
              </span>
            </div>
            <p className="text-small text-white/45">
              Regulatory data is automatically synced and verified from your
              Comply account.
            </p>
          </div>

          {typeof rrsScore === "number" && (
            <div className="flex flex-col items-center flex-shrink-0">
              <span className="text-display-sm font-bold text-emerald-400">
                {rrsScore}
              </span>
              <span className="text-micro text-white/40 uppercase tracking-wider">
                RRS Score
              </span>
            </div>
          )}
        </div>
      </GlassCard>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <GlassCard hover className="p-5 cursor-pointer" onClick={onLink}>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
            <Link2 size={20} className="text-white/50" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h4 className="text-body-lg font-semibold text-white">
                Link your Caelex Comply Account
              </h4>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-micro font-medium text-emerald-400">
                <Sparkles size={10} />
                Recommended
              </span>
            </div>
            <p className="text-small text-white/45">
              Get verified regulatory data and boost your Investment Readiness
              Score automatically.
            </p>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onLink?.();
            }}
            className="inline-flex items-center gap-2 bg-emerald-500 text-white text-body font-medium px-4 py-2.5 rounded-lg hover:bg-emerald-600 transition-all flex-shrink-0"
          >
            Connect
            <ArrowRight size={14} />
          </button>
        </div>
      </GlassCard>
    </motion.div>
  );
}
