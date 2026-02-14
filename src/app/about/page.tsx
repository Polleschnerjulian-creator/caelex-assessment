"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  ArrowRight,
  Target,
  Shield,
  Zap,
  Users,
  Globe,
  Rocket,
  Scale,
  Brain,
  Building2,
  MapPin,
  Calendar,
  Sparkles,
} from "lucide-react";

const values = [
  {
    icon: Target,
    title: "Precision",
    description:
      "We translate complex regulations into clear, actionable guidance. Every feature is built with regulatory accuracy in mind.",
    gradient: "from-blue-500/20 to-cyan-500/20",
    iconColor: "text-blue-400",
  },
  {
    icon: Zap,
    title: "Efficiency",
    description:
      "We automate the tedious parts of compliance so our customers can focus on what matters — their space missions.",
    gradient: "from-amber-500/20 to-orange-500/20",
    iconColor: "text-amber-400",
  },
  {
    icon: Shield,
    title: "Trust",
    description:
      "We handle sensitive compliance data. Security and reliability aren't features — they're foundations.",
    gradient: "from-emerald-500/20 to-green-500/20",
    iconColor: "text-emerald-400",
  },
  {
    icon: Users,
    title: "Partnership",
    description:
      "We succeed when our customers succeed. We're building long-term relationships, not just software.",
    gradient: "from-purple-500/20 to-pink-500/20",
    iconColor: "text-purple-400",
  },
];

const stats = [
  {
    value: "119",
    label: "Regulatory Articles",
    sublabel: "EU Space Act coverage",
  },
  { value: "12", label: "Compliance Modules", sublabel: "End-to-end platform" },
  { value: "10+", label: "Jurisdictions", sublabel: "European space laws" },
  { value: "2030", label: "Enforcement Deadline", sublabel: "Time to comply" },
];

const modules = [
  { name: "Authorization Management", icon: Scale },
  { name: "URSO Registration", icon: Globe },
  { name: "Environmental Assessment", icon: Sparkles },
  { name: "Cybersecurity (NIS2)", icon: Shield },
  { name: "Debris Mitigation", icon: Rocket },
  { name: "Insurance Compliance", icon: Building2 },
];

const timeline = [
  { year: "2025", event: "Caelex founded in Berlin", status: "completed" },
  {
    year: "2025",
    event: "Platform launch & first customers",
    status: "current",
  },
  { year: "2026", event: "EU Space Act enters into force", status: "upcoming" },
  { year: "2030", event: "Full compliance deadline", status: "upcoming" },
];

function GlassCard({
  children,
  className = "",
  hover = true,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={`
        relative rounded-2xl
        bg-white/[0.03] backdrop-blur-xl
        border border-white/[0.08]
        ${hover ? "transition-all duration-500 hover:bg-white/[0.06] hover:border-white/[0.12] hover:shadow-[0_20px_60px_rgba(0,0,0,0.3)]" : ""}
        shadow-[0_8px_32px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.05)]
        ${className}
      `}
    >
      {children}
    </div>
  );
}

function SectionHeader({
  label,
  title,
  description,
  center = true,
}: {
  label: string;
  title: string;
  description?: string;
  center?: boolean;
}) {
  return (
    <div className={center ? "text-center" : ""}>
      <motion.span
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="inline-block text-[11px] font-medium text-emerald-400/70 uppercase tracking-[0.2em] mb-4"
      >
        {label}
      </motion.span>
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.1 }}
        className="text-[clamp(1.75rem,4vw,2.5rem)] font-medium tracking-[-0.02em] text-white mb-4"
      >
        {title}
      </motion.h2>
      {description && (
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className={`text-[15px] md:text-[16px] text-white/40 leading-relaxed ${center ? "max-w-[600px] mx-auto" : "max-w-[600px]"}`}
        >
          {description}
        </motion.p>
      )}
    </div>
  );
}

export default function AboutPage() {
  const heroRef = useRef(null);
  const heroInView = useInView(heroRef, { once: true });

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <section
        ref={heroRef}
        className="relative min-h-[90vh] flex items-center overflow-hidden"
      >
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 50% 30%, rgba(16, 185, 129, 0.12) 0%, transparent 60%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 60% 40% at 80% 70%, rgba(59, 130, 246, 0.08) 0%, transparent 50%)",
            }}
          />
        </div>

        {/* Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-12 pt-32 pb-20">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: Content */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={heroInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.05] backdrop-blur-xl border border-white/[0.08] text-[12px] text-white/60 mb-8">
                <MapPin size={14} className="text-emerald-400" />
                <span>Berlin, Germany</span>
                <span className="w-1 h-1 rounded-full bg-white/30" />
                <span>Founded 2025</span>
              </div>

              <h1 className="text-[clamp(2.5rem,6vw,4rem)] font-medium tracking-[-0.03em] leading-[1.1] mb-6">
                Building the compliance
                <br />
                <span className="text-emerald-400">
                  infrastructure for space
                </span>
              </h1>

              <p className="text-[17px] md:text-[18px] text-white/50 leading-relaxed max-w-[520px] mb-8">
                Caelex is the first regulatory compliance platform designed
                specifically for the European space industry. We help satellite
                operators, launch providers, and space companies navigate
                complex regulations with confidence.
              </p>

              <div className="flex flex-wrap gap-4">
                <Link
                  href="/assessment"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-white text-black text-[14px] font-medium transition-all duration-300 hover:bg-white/90 hover:scale-[1.02]"
                >
                  Start Free Assessment
                  <ArrowRight size={16} />
                </Link>
                <Link
                  href="/demo"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-white/[0.05] backdrop-blur-xl border border-white/[0.12] text-white text-[14px] font-medium transition-all duration-300 hover:bg-white/[0.1] hover:border-white/[0.2]"
                >
                  Request Demo
                </Link>
              </div>
            </motion.div>

            {/* Right: Stats Grid */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={heroInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="grid grid-cols-2 gap-4"
            >
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={heroInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
                >
                  <GlassCard className="p-6 h-full">
                    <div className="text-[36px] md:text-[42px] font-light tracking-[-0.02em] text-white mb-1">
                      {stat.value}
                    </div>
                    <div className="text-[14px] font-medium text-white/80 mb-1">
                      {stat.label}
                    </div>
                    <div className="text-[12px] text-white/40">
                      {stat.sublabel}
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 100% 50% at 0% 50%, rgba(16, 185, 129, 0.06) 0%, transparent 50%)",
          }}
        />

        <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <SectionHeader
                label="Our Mission"
                title="Make space compliance simple, efficient, and accessible."
                center={false}
              />
              <div className="mt-8 space-y-5">
                <p className="text-[15px] text-white/50 leading-relaxed">
                  The EU Space Act introduces 119 regulatory articles covering
                  authorization, registration, environmental assessment,
                  cybersecurity, debris mitigation, and insurance.
                  Non-compliance can result in penalties of up to 2% of global
                  turnover.
                </p>
                <p className="text-[15px] text-white/50 leading-relaxed">
                  We believe compliance shouldn't be a barrier to innovation.
                  Caelex transforms complex regulatory requirements into guided
                  workflows, automated tracking, and actionable insights.
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <GlassCard className="p-8" hover={false}>
                <div className="grid grid-cols-2 gap-4">
                  {modules.map((module, i) => (
                    <motion.div
                      key={module.name}
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + i * 0.05 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                    >
                      <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                        <module.icon size={18} className="text-emerald-400" />
                      </div>
                      <span className="text-[12px] text-white/70 leading-tight">
                        {module.name}
                      </span>
                    </motion.div>
                  ))}
                </div>
                <div className="mt-6 pt-6 border-t border-white/[0.06] text-center">
                  <span className="text-[13px] text-white/40">
                    One platform. Complete EU Space Act coverage.
                  </span>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="relative py-24 md:py-32">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <SectionHeader
            label="Our Values"
            title="What drives us every day"
            description="The principles that guide how we build products and serve our customers."
          />

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
            {values.map((value, i) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <GlassCard className="p-6 h-full group">
                  <div
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${value.gradient} flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110`}
                  >
                    <value.icon size={26} className={value.iconColor} />
                  </div>
                  <h3 className="text-[18px] font-medium text-white mb-3">
                    {value.title}
                  </h3>
                  <p className="text-[14px] text-white/40 leading-relaxed">
                    {value.description}
                  </p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Section */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 100% 50%, rgba(59, 130, 246, 0.06) 0%, transparent 50%)",
          }}
        />

        <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="grid lg:grid-cols-2 gap-16">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <SectionHeader
                label="Why We Exist"
                title="The space industry deserves better compliance tools."
                center={false}
              />
              <div className="mt-8 space-y-5">
                <p className="text-[15px] text-white/50 leading-relaxed">
                  Today, space companies manage compliance with spreadsheets,
                  email chains, and expensive consultants charging 200-500 EUR
                  per hour. Documentation lives in scattered folders. Deadlines
                  are tracked manually.
                </p>
                <p className="text-[15px] text-white/50 leading-relaxed">
                  This approach worked when space was a niche industry. But with
                  150+ new European space startups since 2020 and comprehensive
                  regulation coming, the old way doesn't scale.
                </p>
                <p className="text-[15px] text-white/50 leading-relaxed">
                  We believe every satellite operator — from a 10-person startup
                  to a multinational corporation — should have access to
                  enterprise-grade compliance infrastructure.
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="flex flex-col gap-4"
            >
              {[
                {
                  icon: Brain,
                  title: "Regulatory Intelligence",
                  description:
                    "We continuously monitor EU Space Act developments, interpretive guidance, and enforcement actions.",
                },
                {
                  icon: Rocket,
                  title: "Guided Workflows",
                  description:
                    "Complex requirements become step-by-step processes with built-in best practices.",
                },
                {
                  icon: Shield,
                  title: "Audit-Ready Documentation",
                  description:
                    "Every action is logged. Every document is versioned. Always prepared for regulators.",
                },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                >
                  <GlassCard className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                        <item.icon size={22} className="text-emerald-400" />
                      </div>
                      <div>
                        <h4 className="text-[15px] font-medium text-white mb-1">
                          {item.title}
                        </h4>
                        <p className="text-[13px] text-white/40 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="relative py-24 md:py-32">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <SectionHeader
            label="Our Journey"
            title="From Berlin to the stars"
            description="Key milestones on our path to becoming the standard for space compliance."
          />

          <div className="mt-16 max-w-[800px] mx-auto">
            <div className="relative">
              {/* Vertical Line */}
              <div className="absolute left-[19px] top-0 bottom-0 w-px bg-gradient-to-b from-emerald-500/50 via-white/10 to-transparent" />

              <div className="space-y-6">
                {timeline.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="relative pl-14"
                  >
                    {/* Dot */}
                    <div
                      className={`absolute left-[11px] top-5 w-4 h-4 rounded-full border-2 ${
                        item.status === "completed"
                          ? "bg-emerald-500 border-emerald-500"
                          : item.status === "current"
                            ? "bg-emerald-500/30 border-emerald-500 animate-pulse"
                            : "bg-transparent border-white/30"
                      }`}
                    />

                    <GlassCard className="p-5">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-white/40" />
                          <span className="text-[13px] font-medium text-white/60">
                            {item.year}
                          </span>
                        </div>
                        {item.status === "current" && (
                          <span className="px-2 py-0.5 text-[10px] font-medium text-emerald-400 bg-emerald-500/15 rounded-full uppercase tracking-wider">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-[15px] text-white mt-2">
                        {item.event}
                      </p>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Berlin Section */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 100%, rgba(16, 185, 129, 0.08) 0%, transparent 50%)",
          }}
        />

        <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-12">
          <GlassCard className="p-8 md:p-12" hover={false}>
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <span className="inline-block text-[11px] font-medium text-emerald-400/70 uppercase tracking-[0.2em] mb-4">
                  Built in Berlin
                </span>
                <h2 className="text-[clamp(1.75rem,4vw,2.5rem)] font-medium tracking-[-0.02em] text-white mb-6">
                  European roots,
                  <br />
                  global ambition.
                </h2>
                <p className="text-[15px] text-white/50 leading-relaxed mb-8">
                  We're headquartered in Berlin, at the heart of Europe's
                  growing space ecosystem. Being close to EU institutions,
                  national space agencies, and the NewSpace community means we
                  understand the regulatory landscape firsthand.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Headquarters", value: "Berlin, DE" },
                    { label: "Founded", value: "2025" },
                    { label: "Focus", value: "EU Space Act" },
                    { label: "Stage", value: "Early Stage" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                    >
                      <div className="text-[11px] text-white/40 uppercase tracking-wider mb-1">
                        {item.label}
                      </div>
                      <div className="text-[15px] font-medium text-white">
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-white/[0.08] flex items-center justify-center">
                  <div className="text-center">
                    <Globe
                      size={64}
                      className="text-emerald-400/50 mx-auto mb-4"
                    />
                    <p className="text-[14px] text-white/40">
                      Serving space operators across Europe
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 md:py-32">
        <div className="max-w-[800px] mx-auto px-6 md:px-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-[clamp(2rem,5vw,3rem)] font-medium tracking-[-0.02em] text-white mb-6">
              Join us on this journey
            </h2>
            <p className="text-[16px] text-white/50 mb-10 max-w-[500px] mx-auto">
              Whether you're a space company looking for compliance solutions or
              want to shape the future of space regulation — we'd love to hear
              from you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-white text-black text-[15px] font-medium transition-all duration-300 hover:bg-white/90 hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(255,255,255,0.2)]"
              >
                Get in Touch
                <ArrowRight size={18} />
              </Link>
              <Link
                href="/careers"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-white/[0.05] backdrop-blur-xl border border-white/[0.12] text-white text-[15px] font-medium transition-all duration-300 hover:bg-white/[0.1] hover:border-white/[0.2]"
              >
                View Open Positions
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
