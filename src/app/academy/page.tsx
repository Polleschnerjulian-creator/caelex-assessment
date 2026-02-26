"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import {
  BookOpen,
  Cpu,
  FlaskConical,
  Shield,
  BarChart3,
  Award,
  Rocket,
  Clock,
  Users,
  ChevronRight,
  Satellite,
  Scale,
  Globe,
} from "lucide-react";

// ─── Constants ───

const FEATURES = [
  {
    icon: BookOpen,
    title: "Interactive Courses",
    description:
      "Step-by-step modules covering EU Space Act, NIS2, and national space laws with rich content, embedded questions, and real-world case studies.",
  },
  {
    icon: Cpu,
    title: "Compliance Simulations",
    description:
      "Play as a satellite operator, launch provider, or ground service company. Make regulatory decisions and see how they affect your compliance score.",
  },
  {
    icon: FlaskConical,
    title: "Real Engine Practice",
    description:
      "Use the actual Caelex compliance engine in a sandbox environment. Calculate compliance profiles for any operator scenario.",
  },
  {
    icon: Shield,
    title: "Regulatory Sandbox",
    description:
      "Experiment with different operator profiles, jurisdictions, and regulatory parameters. See how each variable affects compliance outcomes.",
  },
  {
    icon: BarChart3,
    title: "Progress Tracking",
    description:
      "Track your learning journey with detailed analytics, streaks, badges, and module-by-module progress across all courses.",
  },
  {
    icon: Award,
    title: "Certifiable Knowledge",
    description:
      "Earn badges and demonstrate mastery. Share progress with your team or organization to prove regulatory competence.",
  },
];

const SAMPLE_COURSES = [
  {
    title: "EU Space Act Fundamentals",
    subtitle:
      "Understand the regulatory framework shaping European space activities",
    level: "BEGINNER",
    duration: "4 hours",
    icon: Satellite,
    category: "EU Space Act",
  },
  {
    title: "NIS2 for Space Operators",
    subtitle:
      "Cybersecurity obligations under the NIS2 Directive for space entities",
    level: "INTERMEDIATE",
    duration: "3 hours",
    icon: Shield,
    category: "NIS2",
  },
  {
    title: "Cross-Regulatory Compliance",
    subtitle:
      "Navigate overlapping requirements across EU Space Act, NIS2, and national laws",
    level: "ADVANCED",
    duration: "6 hours",
    icon: Scale,
    category: "Cross-Regulatory",
  },
];

const LEVEL_COLORS: Record<string, string> = {
  BEGINNER: "bg-green-500/20 text-green-400 border-green-500/30",
  INTERMEDIATE: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  ADVANCED: "bg-red-500/20 text-red-400 border-red-500/30",
  EXPERT: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

// ─── Animation Variants ───

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  visible: {
    transition: { staggerChildren: 0.1 },
  },
};

// ─── Section Components ───

function AnimatedSection({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={stagger}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Main Page ───

export default function AcademyLandingPage() {
  return (
    <div className="min-h-screen bg-navy-950 text-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-navy-950 to-cyan-500/5" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px]" />

        <div className="relative max-w-6xl mx-auto px-6 pt-32 pb-24">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-8">
              <Rocket className="w-4 h-4 text-emerald-400" />
              <span className="text-caption text-emerald-400 uppercase tracking-wider">
                Now Available
              </span>
            </div>

            <h1 className="text-display-lg font-bold mb-6 leading-tight">
              <span className="text-white">Caelex </span>
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                Academy
              </span>
            </h1>

            <p className="text-display-sm font-light text-white/70 mb-4 max-w-2xl mx-auto">
              Master Space Regulatory Compliance
            </p>

            <p className="text-body-lg text-white/45 mb-10 max-w-xl mx-auto">
              Interactive courses, compliance simulations, and real engine
              practice for EU Space Act, NIS2, and national space law
              professionals.
            </p>

            <div className="flex items-center justify-center gap-4">
              <Link
                href="/login?callbackUrl=/dashboard/academy"
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-subtitle px-8 py-4 rounded-xl transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 flex items-center gap-2"
              >
                Start Learning Free
                <ChevronRight className="w-5 h-5" />
              </Link>
              <Link
                href="#features"
                className="border border-white/20 text-white/70 hover:text-white hover:border-white/40 font-medium text-subtitle px-8 py-4 rounded-xl transition-all"
              >
                Explore Features
              </Link>
            </div>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="grid grid-cols-3 gap-8 mt-20 max-w-lg mx-auto"
          >
            {[
              { value: "12+", label: "Courses" },
              { value: "50+", label: "Lessons" },
              { value: "20+", label: "Simulations" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-display-sm font-semibold text-white">
                  {stat.value}
                </p>
                <p className="text-caption text-white/45 uppercase tracking-wider">
                  {stat.label}
                </p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <motion.p
              variants={fadeUp}
              className="text-caption text-emerald-400 uppercase tracking-[0.2em] mb-4"
            >
              Platform Features
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className="text-display font-semibold text-white mb-4"
            >
              Everything You Need to Master Compliance
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="text-body-lg text-white/45 max-w-2xl mx-auto"
            >
              From theory to practice, the Academy provides a complete learning
              environment for space regulatory professionals.
            </motion.p>
          </AnimatedSection>

          <AnimatedSection className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                variants={fadeUp}
                transition={{ delay: i * 0.05 }}
                className="bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:bg-white/10 hover:border-white/20 transition-all duration-500 group"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-title font-medium text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-body text-white/45 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </AnimatedSection>
        </div>
      </section>

      {/* Course Preview */}
      <section className="py-24 px-6 bg-navy-900/50">
        <div className="max-w-6xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <motion.p
              variants={fadeUp}
              className="text-caption text-emerald-400 uppercase tracking-[0.2em] mb-4"
            >
              Course Catalog
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className="text-display font-semibold text-white mb-4"
            >
              Featured Courses
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="text-body-lg text-white/45 max-w-2xl mx-auto"
            >
              Start with fundamentals or dive deep into specific regulatory
              frameworks. New courses added regularly.
            </motion.p>
          </AnimatedSection>

          <AnimatedSection className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {SAMPLE_COURSES.map((course, i) => (
              <motion.div
                key={course.title}
                variants={fadeUp}
                transition={{ delay: i * 0.1 }}
                className="bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:bg-white/10 hover:border-white/20 transition-all duration-500 group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-emerald-500/30 transition-colors">
                    <course.icon className="w-6 h-6 text-emerald-400" />
                  </div>
                  <span
                    className={`text-micro uppercase px-2.5 py-1 rounded-full border ${LEVEL_COLORS[course.level]}`}
                  >
                    {course.level}
                  </span>
                </div>

                <p className="text-micro text-emerald-400 uppercase tracking-wider mb-2">
                  {course.category}
                </p>
                <h3 className="text-title font-medium text-white mb-2">
                  {course.title}
                </h3>
                <p className="text-body text-white/45 mb-4">
                  {course.subtitle}
                </p>

                <div className="flex items-center gap-4 pt-4 border-t border-white/10">
                  <div className="flex items-center gap-1.5 text-small text-white/45">
                    <Clock className="w-3.5 h-3.5" />
                    {course.duration}
                  </div>
                  <div className="flex items-center gap-1.5 text-small text-white/45">
                    <Users className="w-3.5 h-3.5" />
                    {Math.floor(Math.random() * 500) + 100} enrolled
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatedSection>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <AnimatedSection className="text-center">
            <motion.div
              variants={fadeUp}
              className="bg-gradient-to-br from-emerald-500/10 via-navy-900 to-cyan-500/10 rounded-2xl p-12 border border-white/10"
            >
              <Globe className="w-12 h-12 text-emerald-400 mx-auto mb-6" />
              <h2 className="text-display font-semibold text-white mb-4">
                Join Thousands of Space Professionals Mastering Compliance
              </h2>
              <p className="text-body-lg text-white/45 mb-8 max-w-lg mx-auto">
                Whether you are a satellite operator, launch provider, or
                regulatory consultant, the Academy has the courses you need.
              </p>
              <Link
                href="/signup?callbackUrl=/dashboard/academy"
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-subtitle px-8 py-4 rounded-xl transition-all shadow-lg shadow-emerald-500/20"
              >
                Create Free Account
                <ChevronRight className="w-5 h-5" />
              </Link>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>
    </div>
  );
}
