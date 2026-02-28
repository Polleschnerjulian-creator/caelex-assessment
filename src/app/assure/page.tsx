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
  CheckCircle,
  Zap,
  Globe,
} from "lucide-react";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";
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

const STATS = [
  { value: "6", label: "Integrated Modules" },
  { value: "100+", label: "Benchmark Metrics" },
  { value: "<5min", label: "Setup Time" },
  { value: "A+", label: "Max IRS Grade" },
];

// ─── Component ───

export default function AssureLandingPage() {
  return (
    <div className="min-h-screen bg-black">
      {/* Shared Navigation */}
      <Navigation />

      {/* Hero — offset for fixed nav */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-emerald-500/[0.04] rounded-full blur-[128px] pointer-events-none" />

        <div className="relative max-w-[1400px] mx-auto px-6 md:px-12">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
            className="text-center max-w-3xl mx-auto"
          >
            {/* Pill badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-8">
              <Sparkles size={14} className="text-emerald-400" />
              <span className="text-small font-medium text-emerald-400 tracking-wide">
                Investment Readiness Platform
              </span>
            </div>

            <h1 className="text-display-lg font-bold text-white leading-[1.08] tracking-[-0.03em] mb-6">
              Investment Readiness
              <br />
              <span className="text-emerald-400">for New Space</span>
            </h1>

            <p className="text-body-lg text-white/45 leading-relaxed max-w-2xl mx-auto mb-10">
              Quantify your investment readiness with an IRS score, build a
              compelling company profile, manage risks intelligently, and
              present your data room to investors — all in one platform
              purpose-built for space companies.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/assure/onboarding"
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-subtitle px-8 py-3.5 rounded-full transition-all flex items-center gap-2 shadow-[0_0_24px_rgba(16,185,129,0.25)]"
              >
                Get Started
                <ArrowRight size={18} />
              </Link>
              <Link
                href="/assure/dashboard"
                className="glass-surface border border-white/10 hover:border-white/20 text-white/60 hover:text-white font-medium text-subtitle px-8 py-3.5 rounded-full transition-all backdrop-blur-xl"
              >
                View Dashboard
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-y border-white/[0.06]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.08 }}
                className="text-center"
              >
                <div className="text-display-sm font-bold text-white mb-1">
                  {stat.value}
                </div>
                <div className="text-small text-white/35">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="text-center mb-16">
              <h2 className="text-display font-bold text-white tracking-[-0.02em] mb-4">
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
                    <GlassCard className="p-7 h-full" hover={false}>
                      <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-5">
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
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 border-t border-white/[0.06]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="text-center mb-16">
            <h2 className="text-display font-bold text-white tracking-[-0.02em] mb-4">
              How It Works
            </h2>
            <p className="text-body-lg text-white/40 max-w-lg mx-auto">
              Three steps to becoming investment-ready.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                icon: Zap,
                title: "Connect Comply Data",
                description:
                  "Your existing compliance assessments automatically feed into your investment readiness profile.",
              },
              {
                step: "02",
                icon: Globe,
                title: "Complete Your Profile",
                description:
                  "Fill in 8 company dimensions — technology, market, team, financials, and more.",
              },
              {
                step: "03",
                icon: CheckCircle,
                title: "Share with Investors",
                description:
                  "Generate materials, open your data room, and share a live IRS score with prospective investors.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.12 }}
                className="relative"
              >
                <div className="relative glass-surface rounded-xl border border-white/[0.08] p-7">
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
                      <item.icon size={18} className="text-emerald-400" />
                    </div>
                    <span className="text-caption font-medium text-white/25 tabular-nums">
                      Step {item.step}
                    </span>
                  </div>
                  <h3 className="text-title font-semibold text-white mb-2">
                    {item.title}
                  </h3>
                  <p className="text-body text-white/40 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 border-t border-white/[0.06]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="relative glass-elevated rounded-2xl border border-white/[0.08] p-12 md:p-16 text-center overflow-hidden">
            {/* Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-emerald-500/[0.06] rounded-full blur-[80px] pointer-events-none" />

            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                <Shield size={24} className="text-emerald-400" />
              </div>
              <h3 className="text-display-sm font-bold text-white tracking-[-0.02em] mb-4">
                Ready to get investment-ready?
              </h3>
              <p className="text-body-lg text-white/40 mb-8 max-w-md mx-auto">
                Set up your Assure profile in under 5 minutes. Free with any
                Caelex plan.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/assure/onboarding"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-subtitle px-8 py-3.5 rounded-full transition-all inline-flex items-center gap-2 shadow-[0_0_24px_rgba(16,185,129,0.25)]"
                >
                  Get Started
                  <ArrowRight size={18} />
                </Link>
                <Link
                  href="/dashboard"
                  className="text-body-lg text-white/40 hover:text-white/70 transition-colors"
                >
                  Back to Comply →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Shared Footer */}
      <Footer />
    </div>
  );
}
