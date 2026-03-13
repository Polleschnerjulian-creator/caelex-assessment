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
  Satellite,
  Scale,
  Clock,
} from "lucide-react";
import { CaelexIcon } from "@/components/ui/Logo";

// ─── Data ───

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
  Beginner: "text-emerald-600",
  Intermediate: "text-amber-600",
  Advanced: "text-red-500",
};

// ─── Liquid Glass Utility ───

const glass = {
  card: "bg-white border border-[#E5E7EB] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)]",
  cardHover:
    "hover:border-[#D1D5DB] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all duration-500",
  nav: "bg-white/80 backdrop-blur-2xl border-b border-[#E5E7EB]",
};

// ─── Component ───

export default function AcademyLandingPage() {
  return (
    <div className="min-h-screen landing-light bg-[#F7F8FA] text-[#111827] antialiased">
      {/* Nav — Liquid Glass */}
      <nav className={glass.nav}>
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/academy" className="flex items-center gap-3">
            <CaelexIcon size={28} className="text-[#111827]" />
            <div className="flex flex-col">
              <span className="text-[13px] font-medium text-[#111827] tracking-[-0.02em] leading-none">
                caelex
              </span>
              <span className="text-[9px] font-medium text-[#4B5563] tracking-[0.15em] leading-none mt-1 uppercase">
                Academy
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-5">
            <Link
              href="/dashboard"
              className="text-[13px] text-[#9CA3AF] hover:text-[#4B5563] transition-colors duration-300"
            >
              Back to Comply
            </Link>
            <Link
              href="/login?callbackUrl=/academy/dashboard"
              className="bg-[#111827] hover:bg-[#374151] text-white font-semibold text-[13px] px-5 py-2 rounded-full transition-all duration-300"
            >
              Start Learning
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative max-w-[1200px] mx-auto px-6 pt-28 pb-24">
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-center max-w-[680px] mx-auto"
        >
          <h1 className="text-[56px] font-bold text-[#111827] leading-[1.1] tracking-tight mb-5">
            Master Space
            <br />
            <span className="text-[#111827]">Regulatory Compliance</span>
          </h1>

          <p className="text-[17px] text-[#4B5563] leading-relaxed max-w-[520px] mx-auto mb-10 font-light">
            Interactive courses, compliance simulations, and hands-on practice
            for EU Space Act, NIS2, and national space law professionals.
          </p>

          <div className="flex items-center justify-center gap-3.5">
            <Link
              href="/login?callbackUrl=/academy/dashboard"
              className="bg-[#111827] hover:bg-[#374151] text-white font-semibold text-[15px] px-7 py-3 rounded-full transition-all duration-300 flex items-center gap-2.5"
            >
              Start Learning
              <ArrowRight size={16} strokeWidth={2.5} />
            </Link>
            <Link
              href="#courses"
              className="bg-white hover:bg-[#F1F3F5] border border-[#E5E7EB] hover:border-[#D1D5DB] text-[#4B5563] hover:text-[#111827] font-medium text-[15px] px-7 py-3 rounded-full transition-all duration-300"
            >
              View Courses
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="relative max-w-[1200px] mx-auto px-6 pb-28">
        <motion.div
          initial={false}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <div className="text-center mb-16">
            <h2 className="text-[36px] font-bold text-[#111827] tracking-tight mb-3">
              Everything You Need
            </h2>
            <p className="text-[16px] text-[#9CA3AF] max-w-[440px] mx-auto font-light">
              Six integrated modules designed to build real regulatory
              competence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.4 + index * 0.07,
                    duration: 0.5,
                    ease: [0.25, 0.46, 0.45, 0.94],
                  }}
                >
                  <div
                    className={`${glass.card} ${glass.cardHover} p-6 h-full`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#F1F3F5] border border-[#E5E7EB] flex items-center justify-center mb-5">
                      <Icon
                        size={18}
                        className="text-[#111827]"
                        strokeWidth={1.5}
                      />
                    </div>
                    <h3 className="text-[15px] font-semibold text-[#111827] mb-2 tracking-[-0.01em]">
                      {feature.title}
                    </h3>
                    <p className="text-[13px] text-[#4B5563] leading-[1.65] font-light">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </section>

      {/* Courses */}
      <section id="courses" className="relative pb-28">
        <div className="border-t border-[#E5E7EB]" />
        <div className="max-w-[1200px] mx-auto px-6 pt-28">
          <motion.div
            initial={false}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            <div className="text-center mb-16">
              <h2 className="text-[36px] font-bold text-[#111827] tracking-tight mb-3">
                Featured Courses
              </h2>
              <p className="text-[16px] text-[#9CA3AF] max-w-[440px] mx-auto font-light">
                Start with fundamentals or go deep into specific regulatory
                frameworks.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {COURSES.map((course, index) => {
                const Icon = course.icon;
                return (
                  <motion.div
                    key={course.title}
                    initial={false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: 0.6 + index * 0.07,
                      duration: 0.5,
                      ease: [0.25, 0.46, 0.45, 0.94],
                    }}
                  >
                    <div
                      className={`${glass.card} ${glass.cardHover} p-6 h-full flex flex-col`}
                    >
                      <div className="flex items-start justify-between mb-5">
                        <div className="w-10 h-10 rounded-xl bg-[#F1F3F5] border border-[#E5E7EB] flex items-center justify-center">
                          <Icon
                            size={18}
                            className="text-[#111827]"
                            strokeWidth={1.5}
                          />
                        </div>
                        <span
                          className={`text-[11px] font-medium tracking-wide ${LEVEL_STYLES[course.level] ?? "text-[#9CA3AF]"}`}
                        >
                          {course.level}
                        </span>
                      </div>

                      <p className="text-[10px] text-[#9CA3AF] uppercase tracking-[0.15em] mb-2 font-medium">
                        {course.category}
                      </p>
                      <h3 className="text-[15px] font-semibold text-[#111827] mb-2.5 tracking-[-0.01em]">
                        {course.title}
                      </h3>
                      <p className="text-[13px] text-[#4B5563] leading-[1.65] flex-1 font-light">
                        {course.description}
                      </p>

                      <div className="flex items-center gap-1.5 mt-5 pt-4 border-t border-[#E5E7EB] text-[12px] text-[#9CA3AF]">
                        <Clock size={12} strokeWidth={1.5} />
                        <span>{course.duration}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="relative pb-20">
        <div className="border-t border-[#E5E7EB]" />
        <div className="max-w-[1200px] mx-auto px-6 pt-20 text-center">
          <h3 className="text-[28px] font-bold text-[#111827] tracking-tight mb-4">
            Ready to build regulatory expertise?
          </h3>
          <p className="text-[16px] text-[#9CA3AF] mb-9 font-light">
            Free access to all courses. No credit card required.
          </p>
          <Link
            href="/signup?callbackUrl=/academy/dashboard"
            className="bg-[#111827] hover:bg-[#374151] text-white font-semibold text-[15px] px-7 py-3 rounded-full transition-all duration-300 inline-flex items-center gap-2.5"
          >
            Create Free Account
            <ArrowRight size={16} strokeWidth={2.5} />
          </Link>
        </div>
      </section>
    </div>
  );
}
