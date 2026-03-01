"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  Building2,
  TrendingUp,
  ShieldAlert,
  FileText,
  FolderLock,
  BarChart3,
  Zap,
  Lock,
  Eye,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Target,
  LineChart,
  Users,
  ShieldCheck,
  Layers,
  Gauge,
  Activity,
  BrainCircuit,
  PieChart,
  Send,
  BadgeCheck,
} from "lucide-react";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";

// ─── Animated Score Ring ───

function ScoreRing({
  score,
  grade,
  delay = 0,
}: {
  score: number;
  grade: string;
  delay?: number;
}) {
  const size = 200;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
      className="relative inline-flex items-center justify-center"
    >
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        aria-hidden="true"
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="stroke-white/[0.06] fill-none"
        />
        {/* Progress */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="stroke-emerald-400 fill-none"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ delay: delay + 0.3, duration: 1.5, ease: "easeOut" }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <motion.span
          initial={false}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 0.8 }}
          className="text-[42px] font-bold text-white tabular-nums leading-none"
        >
          {score}
        </motion.span>
        <motion.span
          initial={false}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 1 }}
          className="text-emerald-400 font-semibold text-body-lg mt-1"
        >
          Grade {grade}
        </motion.span>
      </div>
    </motion.div>
  );
}

// ─── Section Wrapper with Scroll Animation ───

function AnimatedSection({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={false}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.7, delay, ease: [0.4, 0, 0.2, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Data ───

const PLATFORM_MODULES = [
  {
    icon: Building2,
    title: "Intelligence Profile",
    subtitle: "8 Dimensions",
    description:
      "Map your company across the 8 dimensions investors evaluate: Technology Readiness, Market Position, Team & Governance, Financial Health, Regulatory Compliance, IP & Defensibility, Operational Maturity, and ESG Impact.",
    highlights: [
      "Weighted field completion scoring",
      "Gap analysis with priority recommendations",
      "Auto-populated from Comply assessments",
    ],
    color: "emerald",
  },
  {
    icon: Gauge,
    title: "IRS Score Engine",
    subtitle: "0–100 Composite",
    description:
      "A single, quantified Investment Readiness Score computed from 6 weighted components — the credit score for fundraising. Investors see your grade (A+ to D) at a glance.",
    highlights: [
      "6 weighted scoring components",
      "A+ through D letter grading",
      "Historical trend tracking",
    ],
    color: "blue",
  },
  {
    icon: ShieldAlert,
    title: "Risk Intelligence",
    subtitle: "42 Risk Templates",
    description:
      "AI-powered risk register with 7 categories, 5×5 severity matrix, scenario modeling, and mitigation tracking. Turn your risk story from a liability into a strength.",
    highlights: [
      "Interactive 5×5 heat map",
      "Monte Carlo scenario analysis",
      "Mitigation coverage gauge",
    ],
    color: "amber",
  },
  {
    icon: FileText,
    title: "Materials Generator",
    subtitle: "4 Document Types",
    description:
      "Auto-generate investor-grade documents from your profile data: Executive Summary, Investment Teaser, Company Profile, and Risk Report. Export as PDF with your branding.",
    highlights: [
      "One-click PDF generation",
      "Custom branding & templates",
      "Regulatory compliance built-in",
    ],
    color: "purple",
  },
  {
    icon: FolderLock,
    title: "Virtual Data Room",
    subtitle: "Bank-Grade Security",
    description:
      "Token-based investor access with PIN protection, document-level permissions, watermarking, and real-time engagement analytics. Know exactly who viewed what.",
    highlights: [
      "Per-document granular access",
      "Real-time view tracking",
      "Automatic NDA collection",
    ],
    color: "red",
  },
  {
    icon: BarChart3,
    title: "Benchmark Engine",
    subtitle: "61 Industry Metrics",
    description:
      "Compare your metrics against 61 space industry benchmarks with traffic light indicators. Show investors exactly where you stand relative to peers.",
    highlights: [
      "Peer radar chart comparison",
      "Traffic light indicators",
      "Percentile ranking",
    ],
    color: "cyan",
  },
];

const INVESTOR_PAIN_POINTS = [
  {
    icon: Clock,
    problem: "6–12 months average fundraising cycle",
    solution: "Cut to 3–4 months with ready materials",
  },
  {
    icon: AlertTriangle,
    problem: "72% of decks get rejected in screening",
    solution: "Data-backed profiles pass due diligence",
  },
  {
    icon: Eye,
    problem: "No visibility into investor engagement",
    solution: "Real-time analytics on every document view",
  },
  {
    icon: ShieldAlert,
    problem: "Regulatory risk kills 30% of space deals",
    solution: "Verified compliance scores from Caelex Comply",
  },
];

const WORKFLOW_STEPS = [
  {
    step: "01",
    icon: Zap,
    title: "Connect Your Comply Data",
    description:
      "Your EU Space Act, NIS2, and national space law assessments automatically feed into your investment profile. Compliance scores verified, not self-reported.",
    time: "Instant",
  },
  {
    step: "02",
    icon: Layers,
    title: "Build Your Intelligence Profile",
    description:
      "Complete 8 company dimensions with guided forms. AI pre-fills from public data and your Comply assessments. Average completion time: 47 minutes.",
    time: "~45 min",
  },
  {
    step: "03",
    icon: BrainCircuit,
    title: "Get Your IRS Score",
    description:
      "Our engine computes your Investment Readiness Score across 6 weighted components. See exactly where you stand and what to improve for maximum impact.",
    time: "Instant",
  },
  {
    step: "04",
    icon: Send,
    title: "Share with Investors",
    description:
      "Generate pitch materials, open your secure data room, and share a live IRS dashboard. Track engagement in real-time and iterate based on investor signals.",
    time: "Minutes",
  },
];

const TESTIMONIAL_STATS = [
  {
    metric: "87",
    unit: "%",
    label: "Profile completion rate",
    sublabel: "within first session",
  },
  {
    metric: "3.2",
    unit: "×",
    label: "Faster due diligence",
    sublabel: "vs. manual preparation",
  },
  {
    metric: "61",
    unit: "",
    label: "Industry benchmarks",
    sublabel: "space-specific metrics",
  },
  {
    metric: "24",
    unit: "h",
    label: "From signup to pitch-ready",
    sublabel: "average time to launch",
  },
];

// ─── Color Maps ───

const iconBgColors: Record<string, string> = {
  emerald: "bg-emerald-500/10 border-emerald-500/20",
  blue: "bg-blue-500/10 border-blue-500/20",
  amber: "bg-amber-500/10 border-amber-500/20",
  purple: "bg-purple-500/10 border-purple-500/20",
  red: "bg-red-500/10 border-red-500/20",
  cyan: "bg-cyan-500/10 border-cyan-500/20",
};

const iconTextColors: Record<string, string> = {
  emerald: "text-emerald-400",
  blue: "text-blue-400",
  amber: "text-amber-400",
  purple: "text-purple-400",
  red: "text-red-400",
  cyan: "text-cyan-400",
};

// ═══════════════════════════════════════════
// ─── PAGE ─────────────────────────────────
// ═══════════════════════════════════════════

export default function AssureLandingPage() {
  return (
    <div className="min-h-screen bg-black overflow-x-hidden">
      <Navigation />

      {/* ═══ HERO ═══ */}
      <section className="relative pt-36 pb-28 overflow-hidden">
        {/* Ambient glows */}
        <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[1000px] h-[800px] bg-emerald-500/[0.03] rounded-full blur-[160px] pointer-events-none" />
        <div className="absolute top-[100px] right-[-200px] w-[400px] h-[400px] bg-blue-500/[0.02] rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="grid lg:grid-cols-[1fr_auto] gap-16 items-center">
            {/* Left — Copy */}
            <motion.div
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
            >
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-8">
                <Sparkles size={14} className="text-emerald-400" />
                <span className="text-small font-medium text-emerald-400 tracking-wide">
                  Caelex Assure — Investment Readiness Platform
                </span>
              </div>

              <h1 className="text-[52px] md:text-[64px] font-bold text-white leading-[1.05] tracking-[-0.035em] mb-6">
                The fundraising
                <br />
                platform for
                <br />
                <span className="bg-gradient-to-r from-emerald-400 to-emerald-300 bg-clip-text text-transparent">
                  New Space
                </span>
              </h1>

              <p className="text-body-lg md:text-subtitle text-white/50 leading-relaxed max-w-[540px] mb-10">
                Quantify your investment readiness. Generate pitch materials in
                minutes. Share a live, verified data room with investors.
                Purpose-built for space companies raising capital.
              </p>

              <div className="flex flex-col sm:flex-row items-start gap-4">
                <Link
                  href="/assure/demo"
                  className="group bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-subtitle px-8 py-4 rounded-full transition-all flex items-center gap-2.5 shadow-[0_0_32px_rgba(16,185,129,0.3)] hover:shadow-[0_0_48px_rgba(16,185,129,0.4)]"
                >
                  Experience Assure
                  <ArrowRight
                    size={18}
                    className="group-hover:translate-x-0.5 transition-transform"
                  />
                </Link>
                <Link
                  href="/assure/book"
                  className="glass-surface border border-white/10 hover:border-white/20 text-white/60 hover:text-white font-medium text-subtitle px-8 py-4 rounded-full transition-all backdrop-blur-xl"
                >
                  Book a Call
                </Link>
              </div>

              {/* Trust line */}
              <div className="flex items-center gap-3 mt-8 text-small text-white/30">
                <Lock size={13} className="text-white/25" />
                <span>No credit card required</span>
                <span className="text-white/15">·</span>
                <span>Setup in under 5 minutes</span>
                <span className="text-white/15">·</span>
                <span>Free with any Caelex plan</span>
              </div>
            </motion.div>

            {/* Right — Animated Score Ring */}
            <motion.div
              initial={false}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 1 }}
              className="hidden lg:flex flex-col items-center"
            >
              <div className="relative">
                {/* Glow behind ring */}
                <div className="absolute inset-0 bg-emerald-500/[0.08] rounded-full blur-[60px] scale-150 pointer-events-none" />
                <div className="relative glass-elevated rounded-3xl border border-white/[0.08] p-10">
                  <div className="text-center mb-4">
                    <span className="text-caption font-medium text-white/35 uppercase tracking-wider">
                      Investment Readiness Score
                    </span>
                  </div>
                  <ScoreRing score={84} grade="A" delay={0.6} />
                  <div className="mt-6 space-y-2.5">
                    {[
                      { label: "Regulatory", pct: 94 },
                      { label: "Technology", pct: 87 },
                      { label: "Market Fit", pct: 76 },
                      { label: "Team", pct: 82 },
                    ].map((dim) => (
                      <div key={dim.label} className="flex items-center gap-3">
                        <span className="text-caption text-white/40 w-[80px]">
                          {dim.label}
                        </span>
                        <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-emerald-500/60 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${dim.pct}%` }}
                            transition={{
                              delay: 1.2,
                              duration: 1,
                              ease: "easeOut",
                            }}
                          />
                        </div>
                        <span className="text-caption text-white/50 tabular-nums w-8 text-right">
                          {dim.pct}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══ METRICS BAR ═══ */}
      <section className="border-y border-white/[0.06] bg-white/[0.01]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
            {TESTIMONIAL_STATS.map((stat, i) => (
              <AnimatedSection key={stat.label} delay={i * 0.08}>
                <div className="text-center">
                  <div className="flex items-baseline justify-center gap-0.5 mb-1.5">
                    <span className="text-[36px] font-bold text-white tabular-nums leading-none">
                      {stat.metric}
                    </span>
                    {stat.unit && (
                      <span className="text-heading font-bold text-emerald-400">
                        {stat.unit}
                      </span>
                    )}
                  </div>
                  <div className="text-body font-medium text-white/60">
                    {stat.label}
                  </div>
                  <div className="text-small text-white/30 mt-0.5">
                    {stat.sublabel}
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ THE PROBLEM ═══ */}
      <section className="py-28">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <AnimatedSection>
            <div className="max-w-3xl mx-auto text-center mb-20">
              <span className="text-caption font-medium text-amber-400/70 uppercase tracking-wider mb-4 block">
                The Problem
              </span>
              <h2 className="text-display md:text-[40px] font-bold text-white tracking-[-0.03em] mb-5 leading-tight">
                Raising capital in space is
                <br />
                <span className="text-white/40">uniquely broken</span>
              </h2>
              <p className="text-body-lg text-white/40 leading-relaxed max-w-2xl mx-auto">
                Space companies face a paradox: investors want regulatory
                certainty before writing checks, but proving compliance is
                manual, fragmented, and takes months. Meanwhile, your
                competitors are closing rounds.
              </p>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {INVESTOR_PAIN_POINTS.map((item, i) => {
              const Icon = item.icon;
              return (
                <AnimatedSection key={i} delay={i * 0.1}>
                  <div className="glass-surface rounded-xl border border-white/[0.06] p-7 h-full">
                    <div className="flex gap-5">
                      <div className="w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                        <Icon size={20} className="text-red-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-body-lg text-white/50 mb-3 leading-relaxed">
                          {item.problem}
                        </p>
                        <div className="flex items-center gap-2">
                          <CheckCircle2
                            size={14}
                            className="text-emerald-400 flex-shrink-0"
                          />
                          <p className="text-body font-medium text-emerald-400/90">
                            {item.solution}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </AnimatedSection>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ PLATFORM MODULES (Deep Dives) ═══ */}
      <section className="py-28 border-t border-white/[0.06]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <AnimatedSection>
            <div className="max-w-3xl mx-auto text-center mb-20">
              <span className="text-caption font-medium text-emerald-400/70 uppercase tracking-wider mb-4 block">
                The Platform
              </span>
              <h2 className="text-display md:text-[40px] font-bold text-white tracking-[-0.03em] mb-5 leading-tight">
                Six modules. One mission.
                <br />
                <span className="text-white/40">Get you funded.</span>
              </h2>
              <p className="text-body-lg text-white/40 leading-relaxed max-w-2xl mx-auto">
                Every module is purpose-built for New Space fundraising. They
                work independently, but together they create the most complete
                investor-readiness platform in the industry.
              </p>
            </div>
          </AnimatedSection>

          <div className="space-y-6">
            {PLATFORM_MODULES.map((mod, i) => {
              const Icon = mod.icon;
              const isReversed = i % 2 === 1;
              return (
                <AnimatedSection key={mod.title} delay={0.1}>
                  <div
                    className={`glass-elevated rounded-2xl border border-white/[0.06] overflow-hidden ${
                      isReversed ? "md:flex-row-reverse" : ""
                    }`}
                  >
                    <div className="p-8 md:p-10">
                      <div className="flex flex-col md:flex-row md:items-start gap-8">
                        {/* Icon + Meta */}
                        <div className="flex-shrink-0">
                          <div
                            className={`w-14 h-14 rounded-2xl border flex items-center justify-center ${iconBgColors[mod.color]}`}
                          >
                            <Icon
                              size={24}
                              className={iconTextColors[mod.color]}
                            />
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-heading font-bold text-white">
                              {mod.title}
                            </h3>
                            <span
                              className={`text-micro font-medium px-2.5 py-0.5 rounded-full border ${iconBgColors[mod.color]} ${iconTextColors[mod.color]}`}
                            >
                              {mod.subtitle}
                            </span>
                          </div>
                          <p className="text-body-lg text-white/45 leading-relaxed mb-6 max-w-2xl">
                            {mod.description}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {mod.highlights.map((h) => (
                              <div
                                key={h}
                                className="flex items-center gap-2.5 text-body text-white/55"
                              >
                                <CheckCircle2
                                  size={14}
                                  className={`flex-shrink-0 ${iconTextColors[mod.color]}`}
                                />
                                <span>{h}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </AnimatedSection>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ COMPLY INTEGRATION ═══ */}
      <section className="py-28 border-t border-white/[0.06]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <AnimatedSection>
              <span className="text-caption font-medium text-blue-400/70 uppercase tracking-wider mb-4 block">
                Powered by Comply
              </span>
              <h2 className="text-display md:text-[40px] font-bold text-white tracking-[-0.03em] mb-5 leading-tight">
                Compliance scores that
                <br />
                <span className="text-blue-400">investors trust</span>
              </h2>
              <p className="text-body-lg text-white/45 leading-relaxed mb-8 max-w-lg">
                Unlike self-reported compliance claims, your Assure profile is
                backed by verified assessments from Caelex Comply. Investors see
                EU Space Act, NIS2, and national space law compliance scores
                computed from real regulatory analysis — not checkboxes.
              </p>
              <div className="space-y-4">
                {[
                  {
                    icon: ShieldCheck,
                    text: "EU Space Act compliance verified across 119 articles",
                  },
                  {
                    icon: Activity,
                    text: "NIS2 readiness scored against 51 requirements",
                  },
                  {
                    icon: Target,
                    text: "National space law analysis for 10 EU jurisdictions",
                  },
                  {
                    icon: BadgeCheck,
                    text: "Regulatory Credit Rating (AAA–D) for investor reporting",
                  },
                ].map((item) => (
                  <div
                    key={item.text}
                    className="flex items-center gap-3 text-body-lg text-white/60"
                  >
                    <item.icon
                      size={18}
                      className="text-blue-400 flex-shrink-0"
                    />
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            </AnimatedSection>

            <AnimatedSection delay={0.2}>
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500/[0.04] rounded-3xl blur-[60px] pointer-events-none" />
                <div className="relative glass-elevated rounded-2xl border border-white/[0.06] p-8">
                  <div className="text-caption font-medium text-white/30 uppercase tracking-wider mb-6">
                    Compliance Verification
                  </div>
                  <div className="space-y-4">
                    {[
                      { label: "EU Space Act", score: 94, status: "Compliant" },
                      {
                        label: "NIS2 Directive",
                        score: 87,
                        status: "In Progress",
                      },
                      {
                        label: "German Space Law",
                        score: 91,
                        status: "Compliant",
                      },
                      {
                        label: "French Space Law",
                        score: 78,
                        status: "In Progress",
                      },
                    ].map((item) => (
                      <div key={item.label}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-body font-medium text-white/70">
                            {item.label}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-body tabular-nums text-white/50">
                              {item.score}%
                            </span>
                            <span
                              className={`text-micro px-2 py-0.5 rounded-full ${
                                item.status === "Compliant"
                                  ? "bg-emerald-500/15 text-emerald-400"
                                  : "bg-amber-500/15 text-amber-400"
                              }`}
                            >
                              {item.status}
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${
                              item.status === "Compliant"
                                ? "bg-emerald-500/60"
                                : "bg-amber-500/60"
                            }`}
                            initial={{ width: 0 }}
                            whileInView={{ width: `${item.score}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 1, ease: "easeOut" }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 pt-5 border-t border-white/[0.06] flex items-center gap-2">
                    <ShieldCheck size={14} className="text-emerald-400" />
                    <span className="text-small text-white/40">
                      Verified by Caelex Comply engine — not self-reported
                    </span>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="py-28 border-t border-white/[0.06]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <AnimatedSection>
            <div className="max-w-3xl mx-auto text-center mb-20">
              <span className="text-caption font-medium text-emerald-400/70 uppercase tracking-wider mb-4 block">
                How It Works
              </span>
              <h2 className="text-display md:text-[40px] font-bold text-white tracking-[-0.03em] mb-5 leading-tight">
                From zero to pitch-ready
                <br />
                <span className="text-white/40">in 24 hours</span>
              </h2>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {WORKFLOW_STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <AnimatedSection key={step.step} delay={i * 0.1}>
                  <div className="relative glass-surface rounded-xl border border-white/[0.06] p-7 h-full">
                    {/* Step number */}
                    <div className="absolute top-6 right-6 text-[48px] font-bold text-white/[0.04] leading-none tabular-nums select-none">
                      {step.step}
                    </div>
                    <div className="relative">
                      <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-5">
                        <Icon size={20} className="text-emerald-400" />
                      </div>
                      <h3 className="text-title font-semibold text-white mb-2">
                        {step.title}
                      </h3>
                      <p className="text-body text-white/40 leading-relaxed mb-4">
                        {step.description}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className="text-white/25" />
                        <span className="text-small text-white/30">
                          {step.time}
                        </span>
                      </div>
                    </div>
                  </div>
                </AnimatedSection>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ DATA ROOM SECURITY ═══ */}
      <section className="py-28 border-t border-white/[0.06]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <AnimatedSection delay={0.1}>
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-500/[0.03] rounded-3xl blur-[80px] pointer-events-none" />
                <div className="relative glass-elevated rounded-2xl border border-white/[0.06] p-8">
                  <div className="text-caption font-medium text-white/30 uppercase tracking-wider mb-6">
                    Data Room Activity — Live
                  </div>
                  <div className="space-y-3">
                    {[
                      {
                        name: "Seraphim Capital",
                        action: "Viewed Executive Summary",
                        time: "2 min ago",
                        pages: "12 pages · 8m 34s",
                      },
                      {
                        name: "Airbus Ventures",
                        action: "Downloaded Risk Report",
                        time: "1 hour ago",
                        pages: "28 pages · 22m 12s",
                      },
                      {
                        name: "European Space Fund",
                        action: "Opened Data Room",
                        time: "3 hours ago",
                        pages: "First visit",
                      },
                      {
                        name: "D. Investor (Anonymous)",
                        action: "Viewed Financial Projections",
                        time: "Yesterday",
                        pages: "6 pages · 4m 51s",
                      },
                    ].map((activity, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-4 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]"
                      >
                        <div className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                          <Users size={14} className="text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-body font-medium text-white/70 truncate">
                              {activity.name}
                            </span>
                            <span className="text-micro text-white/25 flex-shrink-0">
                              {activity.time}
                            </span>
                          </div>
                          <div className="text-small text-white/35">
                            {activity.action} · {activity.pages}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </AnimatedSection>

            <AnimatedSection>
              <span className="text-caption font-medium text-emerald-400/70 uppercase tracking-wider mb-4 block">
                Virtual Data Room
              </span>
              <h2 className="text-display md:text-[40px] font-bold text-white tracking-[-0.03em] mb-5 leading-tight">
                Know exactly who
                <br />
                <span className="text-emerald-400">is reading what</span>
              </h2>
              <p className="text-body-lg text-white/45 leading-relaxed mb-8 max-w-lg">
                Your virtual data room tracks every interaction. See which
                investors opened your deck, how long they spent on each page,
                and what they downloaded. Use engagement signals to prioritize
                your follow-ups and close faster.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Lock, label: "Token-based access" },
                  { icon: Eye, label: "Per-page view tracking" },
                  { icon: LineChart, label: "Engagement analytics" },
                  { icon: PieChart, label: "Investor heatmaps" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-2.5 text-body text-white/55"
                  >
                    <item.icon
                      size={15}
                      className="text-emerald-400/80 flex-shrink-0"
                    />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ═══ COMPARISON ═══ */}
      <section className="py-28 border-t border-white/[0.06]">
        <div className="max-w-[1100px] mx-auto px-6 md:px-12">
          <AnimatedSection>
            <div className="text-center mb-16">
              <span className="text-caption font-medium text-white/30 uppercase tracking-wider mb-4 block">
                Before & After
              </span>
              <h2 className="text-display md:text-[40px] font-bold text-white tracking-[-0.03em] mb-5">
                Fundraising without Assure
                <span className="text-white/25"> vs. </span>
                <span className="text-emerald-400">with Assure</span>
              </h2>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.1}>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Without */}
              <div className="glass-surface rounded-xl border border-red-500/10 p-8">
                <div className="flex items-center gap-2 mb-6">
                  <AlertTriangle size={16} className="text-red-400" />
                  <span className="text-body-lg font-semibold text-red-400">
                    Without Assure
                  </span>
                </div>
                <div className="space-y-4">
                  {[
                    "Manually assemble 50+ page pitch deck",
                    "Self-reported compliance — investors skeptical",
                    "No insight into who opened your materials",
                    "6–12 months from first pitch to term sheet",
                    "Risk section is a vague paragraph",
                    "No peer benchmarks to prove market position",
                    "Data room is a Google Drive folder",
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 text-body text-white/40"
                    >
                      <span className="text-red-400/60 mt-0.5 flex-shrink-0">
                        ✕
                      </span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* With */}
              <div className="glass-elevated rounded-xl border border-emerald-500/15 p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-emerald-500/[0.04] rounded-full blur-[80px] pointer-events-none" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-6">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    <span className="text-body-lg font-semibold text-emerald-400">
                      With Assure
                    </span>
                  </div>
                  <div className="space-y-4">
                    {[
                      "AI-generated materials in minutes, not weeks",
                      "Verified compliance scores from Caelex Comply",
                      "Real-time engagement analytics per investor",
                      "3–4 months average from pitch to close",
                      "42-template risk register with heat maps",
                      "61 space industry benchmarks with peer ranking",
                      "Secure data room with PIN + token access",
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 text-body text-white/60"
                      >
                        <CheckCircle2
                          size={14}
                          className="text-emerald-400 mt-0.5 flex-shrink-0"
                        />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="py-28 border-t border-white/[0.06]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <AnimatedSection>
            <div className="relative glass-elevated rounded-3xl border border-white/[0.06] p-12 md:p-20 text-center overflow-hidden">
              {/* Ambient glows */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-500/[0.06] rounded-full blur-[100px] pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-blue-500/[0.03] rounded-full blur-[80px] pointer-events-none" />

              <div className="relative">
                <span className="text-caption font-medium text-emerald-400/70 uppercase tracking-wider mb-6 block">
                  Start Today
                </span>
                <h2 className="text-display md:text-[48px] font-bold text-white tracking-[-0.03em] mb-5 leading-tight">
                  Your next round starts here
                </h2>
                <p className="text-body-lg md:text-subtitle text-white/40 mb-10 max-w-xl mx-auto leading-relaxed">
                  Join the space companies using Assure to close rounds faster.
                  Free with any Caelex plan. Set up in under 5 minutes.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link
                    href="/assure/demo"
                    className="group bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-subtitle px-10 py-4 rounded-full transition-all inline-flex items-center gap-2.5 shadow-[0_0_40px_rgba(16,185,129,0.3)] hover:shadow-[0_0_60px_rgba(16,185,129,0.4)]"
                  >
                    Experience Assure
                    <ArrowRight
                      size={18}
                      className="group-hover:translate-x-0.5 transition-transform"
                    />
                  </Link>
                  <Link
                    href="/assure/book"
                    className="glass-surface border border-white/10 hover:border-white/20 text-white/60 hover:text-white font-medium text-subtitle px-10 py-4 rounded-full transition-all backdrop-blur-xl"
                  >
                    Book a Call
                  </Link>
                </div>
                <p className="text-small text-white/25 mt-6">
                  No credit card · Free with Comply · Setup in 5 minutes
                </p>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      <Footer />
    </div>
  );
}
