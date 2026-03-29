"use client";

import Link from "next/link";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
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
import GlassCard from "@/components/ui/GlassCard";

const values = [
  {
    icon: Target,
    title: "Precision",
    description:
      "We translate complex regulations into clear, actionable guidance. Every feature is built with regulatory accuracy in mind.",
    gradient: "from-[#F1F3F5] to-[#F1F3F5]",
    iconColor: "text-[#111827]",
  },
  {
    icon: Zap,
    title: "Efficiency",
    description:
      "We automate the tedious parts of compliance so our customers can focus on what matters — their space missions.",
    gradient: "from-[#F1F3F5] to-[#F1F3F5]",
    iconColor: "text-[#111827]",
  },
  {
    icon: Shield,
    title: "Trust",
    description:
      "We handle sensitive compliance data. Security and reliability aren't features — they're foundations.",
    gradient: "from-[#F1F3F5] to-[#F1F3F5]",
    iconColor: "text-[#111827]",
  },
  {
    icon: Users,
    title: "Partnership",
    description:
      "We succeed when our customers succeed. We're building long-term relationships, not just software.",
    gradient: "from-[#F1F3F5] to-[#F1F3F5]",
    iconColor: "text-[#111827]",
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
        initial={false}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="inline-block text-caption font-medium text-[#9CA3AF] uppercase tracking-[0.2em] mb-4"
      >
        {label}
      </motion.span>
      <motion.h2
        initial={false}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.1 }}
        className="text-[clamp(1.75rem,4vw,2.5rem)] font-medium tracking-[-0.02em] text-[#111827] mb-4"
      >
        {title}
      </motion.h2>
      {description && (
        <motion.p
          initial={false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className={`text-subtitle md:text-title text-[#4B5563] leading-relaxed ${center ? "max-w-[600px] mx-auto" : "max-w-[600px]"}`}
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
    <div className="min-h-screen landing-light bg-[#F7F8FA] text-[#111827]">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://caelex.eu" },
          { name: "About", url: "https://caelex.eu/about" },
        ]}
      />
      {/* Hero Section */}
      <section
        ref={heroRef}
        className="relative min-h-[90vh] flex items-center overflow-hidden"
      >
        {/* Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-12 pt-32 pb-20">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: Content */}
            <motion.div
              initial={false}
              animate={heroInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F1F3F5] border border-[#E5E7EB] text-small text-[#4B5563] mb-8">
                <MapPin size={14} className="text-[#111827]" />
                <span>Berlin, Germany</span>
                <span className="w-1 h-1 rounded-full bg-[#9CA3AF]" />
                <span>Founded 2025</span>
              </div>

              <h1 className="text-[clamp(2.5rem,6vw,4rem)] font-medium tracking-[-0.03em] leading-[1.1] mb-6">
                Building the compliance
                <br />
                <span className="text-[#111827]">infrastructure for space</span>
              </h1>

              <p className="text-title md:text-heading text-[#4B5563] leading-relaxed max-w-[520px] mb-8">
                Caelex is the first regulatory compliance platform designed
                specifically for the European space industry. We help satellite
                operators, launch providers, and space companies navigate
                complex regulations with confidence.
              </p>

              <div className="flex flex-wrap gap-4">
                <Link
                  href="/assessment"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#111827] text-white text-body-lg font-medium transition-all duration-300 hover:bg-[#374151] hover:scale-[1.02]"
                >
                  Start Free Assessment
                  <ArrowRight size={16} />
                </Link>
                <Link
                  href="/demo"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-white border border-[#D1D5DB] text-[#4B5563] text-body-lg font-medium transition-all duration-300 hover:bg-[#F1F3F5] hover:border-[#D1D5DB]"
                >
                  Request Demo
                </Link>
              </div>
            </motion.div>

            {/* Right: Stats Grid */}
            <motion.div
              initial={false}
              animate={heroInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="grid grid-cols-2 gap-4"
            >
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={false}
                  animate={heroInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
                >
                  <GlassCard className="p-6 h-full">
                    <div className="text-[36px] md:text-[42px] font-light tracking-[-0.02em] text-[#111827] mb-1">
                      {stat.value}
                    </div>
                    <div className="text-body-lg font-medium text-[#4B5563] mb-1">
                      {stat.label}
                    </div>
                    <div className="text-small text-[#4B5563]">
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
        <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <SectionHeader
                label="Our Mission"
                title="Make space compliance simple, efficient, and accessible."
                center={false}
              />
              <div className="mt-8 space-y-5">
                <p className="text-subtitle text-[#4B5563] leading-relaxed">
                  The EU Space Act introduces 119 regulatory articles covering
                  authorization, registration, environmental assessment,
                  cybersecurity, debris mitigation, and insurance.
                  Non-compliance can result in penalties of up to 2% of global
                  turnover.
                </p>
                <p className="text-subtitle text-[#4B5563] leading-relaxed">
                  We believe compliance shouldn't be a barrier to innovation.
                  Caelex transforms complex regulatory requirements into guided
                  workflows, automated tracking, and actionable insights.
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <GlassCard className="p-8" hover={false}>
                <div className="grid grid-cols-2 gap-4">
                  {modules.map((module, i) => (
                    <motion.div
                      key={module.name}
                      initial={false}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + i * 0.05 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-[#F1F3F5] border border-[#E5E7EB]"
                    >
                      <div className="w-9 h-9 rounded-lg bg-[#F1F3F5] flex items-center justify-center flex-shrink-0">
                        <module.icon size={18} className="text-[#111827]" />
                      </div>
                      <span className="text-small text-[#4B5563] leading-tight">
                        {module.name}
                      </span>
                    </motion.div>
                  ))}
                </div>
                <div className="mt-6 pt-6 border-t border-[#E5E7EB] text-center">
                  <span className="text-body text-[#4B5563]">
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
                initial={false}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <GlassCard className="p-6 h-full group">
                  <div
                    className={`w-14 h-14 rounded-xl bg-gradient-to-br ${value.gradient} flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110`}
                  >
                    <value.icon size={26} className={value.iconColor} />
                  </div>
                  <h3 className="text-heading font-medium text-[#111827] mb-3">
                    {value.title}
                  </h3>
                  <p className="text-body-lg text-[#4B5563] leading-relaxed">
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
        <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="grid lg:grid-cols-2 gap-16">
            <motion.div
              initial={false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <SectionHeader
                label="Why We Exist"
                title="The space industry deserves better compliance tools."
                center={false}
              />
              <div className="mt-8 space-y-5">
                <p className="text-subtitle text-[#4B5563] leading-relaxed">
                  Today, space companies manage compliance with spreadsheets,
                  email chains, and expensive consultants charging 200-500 EUR
                  per hour. Documentation lives in scattered folders. Deadlines
                  are tracked manually.
                </p>
                <p className="text-subtitle text-[#4B5563] leading-relaxed">
                  This approach worked when space was a niche industry. But with
                  150+ new European space startups since 2020 and comprehensive
                  regulation coming, the old way doesn't scale.
                </p>
                <p className="text-subtitle text-[#4B5563] leading-relaxed">
                  We believe every satellite operator — from a 10-person startup
                  to a multinational corporation — should have access to
                  enterprise-grade compliance infrastructure.
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={false}
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
                  initial={false}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                >
                  <GlassCard className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-xl bg-[#F1F3F5] flex items-center justify-center flex-shrink-0">
                        <item.icon size={22} className="text-[#111827]" />
                      </div>
                      <div>
                        <h4 className="text-subtitle font-medium text-[#111827] mb-1">
                          {item.title}
                        </h4>
                        <p className="text-body text-[#4B5563] leading-relaxed">
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
              <div className="absolute left-[19px] top-0 bottom-0 w-px bg-gradient-to-b from-[#111827] via-[#E5E7EB] to-transparent" />

              <div className="space-y-6">
                {timeline.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={false}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="relative pl-14"
                  >
                    {/* Dot */}
                    <div
                      className={`absolute left-[11px] top-5 w-4 h-4 rounded-full border-2 ${
                        item.status === "completed"
                          ? "bg-[#111827] border-[#111827]"
                          : item.status === "current"
                            ? "bg-[#111827]/30 border-[#111827] animate-pulse"
                            : "bg-transparent border-[#9CA3AF]"
                      }`}
                    />

                    <GlassCard className="p-5">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-[#4B5563]" />
                          <span className="text-body font-medium text-[#4B5563]">
                            {item.year}
                          </span>
                        </div>
                        {item.status === "current" && (
                          <span className="px-2 py-0.5 text-micro font-medium text-[#111827] bg-[#F1F3F5] rounded-full uppercase tracking-wider">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-subtitle text-[#111827] mt-2">
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
        <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-12">
          <GlassCard className="p-8 md:p-12" hover={false}>
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <span className="inline-block text-caption font-medium text-[#9CA3AF] uppercase tracking-[0.2em] mb-4">
                  Built in Berlin
                </span>
                <h2 className="text-[clamp(1.75rem,4vw,2.5rem)] font-medium tracking-[-0.02em] text-[#111827] mb-6">
                  European roots,
                  <br />
                  global ambition.
                </h2>
                <p className="text-subtitle text-[#4B5563] leading-relaxed mb-8">
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
                      className="p-4 rounded-xl bg-[#F1F3F5] border border-[#E5E7EB]"
                    >
                      <div className="text-caption text-[#4B5563] uppercase tracking-wider mb-1">
                        {item.label}
                      </div>
                      <div className="text-subtitle font-medium text-[#111827]">
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className="aspect-[4/3] rounded-xl overflow-hidden bg-[#F1F3F5] border border-[#E5E7EB] flex items-center justify-center">
                  <div className="text-center">
                    <Globe size={64} className="text-[#9CA3AF] mx-auto mb-4" />
                    <p className="text-body-lg text-[#4B5563]">
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
            initial={false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-[clamp(2rem,5vw,3rem)] font-medium tracking-[-0.02em] text-[#111827] mb-6">
              Join us on this journey
            </h2>
            <p className="text-title text-[#4B5563] mb-10 max-w-[500px] mx-auto">
              Whether you're a space company looking for compliance solutions or
              want to shape the future of space regulation — we'd love to hear
              from you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-[#111827] text-white text-subtitle font-medium transition-all duration-300 hover:bg-[#374151] hover:scale-[1.02]"
              >
                Get in Touch
                <ArrowRight size={18} />
              </Link>
              <Link
                href="/careers"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-white border border-[#D1D5DB] text-[#4B5563] text-subtitle font-medium transition-all duration-300 hover:bg-[#F1F3F5] hover:border-[#D1D5DB]"
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
