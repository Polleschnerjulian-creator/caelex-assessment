"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  BookOpen,
  Cpu,
  FlaskConical,
  Shield,
  BarChart3,
  Award,
  ArrowRight,
  GraduationCap,
  Satellite,
  Scale,
  Clock,
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";

// ─── Feature Data ───

const FEATURES = [
  {
    icon: BookOpen,
    title: "Interactive Courses",
    description:
      "Step-by-step modules covering EU Space Act, NIS2, and national space laws with embedded questions and case studies.",
  },
  {
    icon: Cpu,
    title: "Compliance Simulations",
    description:
      "Play as a satellite operator, launch provider, or ground service company. Make decisions and see their regulatory impact.",
  },
  {
    icon: FlaskConical,
    title: "Compliance Sandbox",
    description:
      "Use the actual Caelex compliance engine to calculate profiles for any operator scenario in a safe environment.",
  },
  {
    icon: Shield,
    title: "Regulatory Deep Dives",
    description:
      "Explore operator profiles, jurisdictions, and parameters. Understand how each variable affects compliance outcomes.",
  },
  {
    icon: BarChart3,
    title: "Progress Tracking",
    description:
      "Detailed analytics, learning streaks, and module-by-module progress across all courses and simulations.",
  },
  {
    icon: Award,
    title: "Badges & Certification",
    description:
      "Earn badges for milestones and demonstrate mastery. Share progress with your team or organization.",
  },
];

const COURSES = [
  {
    title: "EU Space Act Fundamentals",
    description:
      "The regulatory framework shaping European space activities — authorization, supervision, and operator obligations.",
    level: "Beginner",
    duration: "4 hours",
    icon: Satellite,
    category: "EU Space Act",
  },
  {
    title: "NIS2 for Space Operators",
    description:
      "Cybersecurity obligations under the NIS2 Directive — incident reporting, security measures, and penalties.",
    level: "Intermediate",
    duration: "3 hours",
    icon: Shield,
    category: "NIS2",
  },
  {
    title: "Cross-Regulatory Compliance",
    description:
      "Navigate overlapping requirements across EU Space Act, NIS2, and national space laws of 10 jurisdictions.",
    level: "Advanced",
    duration: "6 hours",
    icon: Scale,
    category: "Cross-Regulatory",
  },
];

const LEVEL_STYLES: Record<string, string> = {
  Beginner: "text-green-400",
  Intermediate: "text-amber-400",
  Advanced: "text-red-400",
};

// ─── Component ───

export default function AcademyLandingPage() {
  return (
    <div className="min-h-screen bg-navy-950">
      {/* Nav */}
      <nav className="border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/academy" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <GraduationCap size={16} className="text-emerald-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-body-lg font-semibold text-white tracking-wide">
                CAELEX
              </span>
              <span className="text-micro font-medium text-emerald-400 tracking-[0.2em] -mt-0.5">
                ACADEMY
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
              href="/login?callbackUrl=/academy/dashboard"
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-body px-5 py-2.5 rounded-lg transition-all"
            >
              Start Learning
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
          <h1 className="text-display-lg font-bold text-white leading-tight mb-6">
            Master Space
            <br />
            <span className="text-emerald-400">Regulatory Compliance</span>
          </h1>

          <p className="text-body-lg text-white/45 leading-relaxed max-w-2xl mx-auto mb-10">
            Interactive courses, compliance simulations, and hands-on sandbox
            practice for EU Space Act, NIS2, and national space law
            professionals.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link
              href="/login?callbackUrl=/academy/dashboard"
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-subtitle px-8 py-3.5 rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              Start Learning
              <ArrowRight size={18} />
            </Link>
            <Link
              href="#courses"
              className="border border-white/10 hover:border-white/20 text-white/60 hover:text-white font-medium text-subtitle px-8 py-3.5 rounded-lg transition-all"
            >
              View Courses
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
              Six integrated modules designed to build real regulatory
              competence.
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

      {/* Courses */}
      <section id="courses" className="border-t border-white/5 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="text-center mb-14">
              <h2 className="text-display font-bold text-white mb-3">
                Featured Courses
              </h2>
              <p className="text-body-lg text-white/40 max-w-lg mx-auto">
                Start with fundamentals or go deep into specific regulatory
                frameworks.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {COURSES.map((course, index) => {
                const Icon = course.icon;
                return (
                  <motion.div
                    key={course.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + index * 0.08 }}
                  >
                    <GlassCard className="p-6 h-full flex flex-col">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                          <Icon size={20} className="text-emerald-400" />
                        </div>
                        <span
                          className={`text-micro font-medium ${LEVEL_STYLES[course.level] ?? "text-white/40"}`}
                        >
                          {course.level}
                        </span>
                      </div>

                      <p className="text-micro text-emerald-400/70 uppercase tracking-wider mb-1.5">
                        {course.category}
                      </p>
                      <h3 className="text-title font-semibold text-white mb-2">
                        {course.title}
                      </h3>
                      <p className="text-body text-white/40 leading-relaxed flex-1">
                        {course.description}
                      </p>

                      <div className="flex items-center gap-1.5 mt-4 pt-4 border-t border-white/5 text-small text-white/30">
                        <Clock size={13} />
                        <span>{course.duration}</span>
                      </div>
                    </GlassCard>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="border-t border-white/5 py-16">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h3 className="text-display-sm font-bold text-white mb-4">
            Ready to build regulatory expertise?
          </h3>
          <p className="text-body-lg text-white/40 mb-8">
            Free access to all courses. No credit card required.
          </p>
          <Link
            href="/signup?callbackUrl=/academy/dashboard"
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-subtitle px-8 py-3.5 rounded-lg transition-all inline-flex items-center gap-2"
          >
            Create Free Account
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
