"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Shield,
  TrendingUp,
  Building2,
  ShieldAlert,
  FileText,
  FolderLock,
  BarChart3,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";

// ─── Feature Data ───

const FEATURES = [
  {
    icon: Building2,
    title: "Company Profile",
    description:
      "Build a comprehensive company profile across 8 key dimensions that investors evaluate.",
  },
  {
    icon: TrendingUp,
    title: "IRS Score",
    description:
      "Get a quantified Investment Readiness Score with actionable improvement steps.",
  },
  {
    icon: ShieldAlert,
    title: "Risk Intelligence",
    description:
      "AI-powered risk register with heat maps, scenario analysis, and mitigation tracking.",
  },
  {
    icon: FileText,
    title: "Investor Materials",
    description:
      "Auto-generate pitch decks, executive summaries, and investment memos.",
  },
  {
    icon: FolderLock,
    title: "Data Room",
    description:
      "Secure virtual data room with investor access links and engagement analytics.",
  },
  {
    icon: BarChart3,
    title: "Benchmarks",
    description:
      "See how you compare to peers across key metrics with radar charts and traffic lights.",
  },
];

// ─── Component ───

export default function AssureLandingPage() {
  return (
    <div className="min-h-screen bg-navy-950">
      {/* Nav */}
      <nav className="border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/assure" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <Shield size={16} className="text-emerald-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-body-lg font-semibold text-white tracking-wide">
                CAELEX
              </span>
              <span className="text-micro font-medium text-emerald-400 tracking-[0.2em] -mt-0.5">
                ASSURE
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-small text-white/40 hover:text-white/70 transition-colors"
            >
              Back to Comply
            </Link>
            <Link
              href="/assure/onboarding"
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-body px-5 py-2.5 rounded-lg transition-all"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-8">
            <Sparkles size={14} className="text-emerald-400" />
            <span className="text-small font-medium text-emerald-400">
              Investment Readiness Platform
            </span>
          </div>

          <h1 className="text-display-lg font-bold text-white leading-tight mb-6">
            Investment Readiness
            <br />
            <span className="text-emerald-400">for New Space</span>
          </h1>

          <p className="text-body-lg text-white/45 leading-relaxed max-w-2xl mx-auto mb-10">
            Quantify your investment readiness with an IRS score, build a
            compelling company profile, manage risks intelligently, and present
            your data room to investors -- all in one platform purpose-built for
            space companies.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link
              href="/assure/onboarding"
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-subtitle px-8 py-3.5 rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              Get Started
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/assure/dashboard"
              className="border border-white/10 hover:border-white/20 text-white/60 hover:text-white font-medium text-subtitle px-8 py-3.5 rounded-lg transition-all"
            >
              View Dashboard
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="text-center mb-14">
            <h2 className="text-display font-bold text-white mb-3">
              Everything You Need
            </h2>
            <p className="text-body-lg text-white/40 max-w-lg mx-auto">
              Six integrated modules designed to make space companies
              investment-ready.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.08 }}
                >
                  <GlassCard className="p-6 h-full">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                      <Icon size={20} className="text-emerald-400" />
                    </div>
                    <h3 className="text-title font-semibold text-white mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-body text-white/40 leading-relaxed">
                      {feature.description}
                    </p>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </section>

      {/* Footer CTA */}
      <section className="border-t border-white/5 py-16">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h3 className="text-display-sm font-bold text-white mb-4">
            Ready to get investment-ready?
          </h3>
          <p className="text-body-lg text-white/40 mb-8">
            Set up your Assure profile in under 5 minutes.
          </p>
          <Link
            href="/assure/onboarding"
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-subtitle px-8 py-3.5 rounded-lg transition-all inline-flex items-center gap-2"
          >
            Get Started
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
