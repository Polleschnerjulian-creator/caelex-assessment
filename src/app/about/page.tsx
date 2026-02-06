"use client";

import Link from "next/link";
import Logo from "@/components/ui/Logo";
import {
  ArrowLeft,
  ArrowRight,
  Target,
  Shield,
  Globe,
  Zap,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";

const values = [
  {
    icon: Target,
    title: "Precision",
    description:
      "We translate complex regulations into clear, actionable guidance. Every feature is built with regulatory accuracy in mind.",
  },
  {
    icon: Zap,
    title: "Efficiency",
    description:
      "We automate the tedious parts of compliance so our customers can focus on what matters — their space missions.",
  },
  {
    icon: Shield,
    title: "Trust",
    description:
      "We handle sensitive compliance data. Security and reliability aren't features — they're foundations.",
  },
  {
    icon: Users,
    title: "Partnership",
    description:
      "We succeed when our customers succeed. We're building long-term relationships, not just software.",
  },
];

export default function AboutPage() {
  return (
    <main className="dark-section min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="flex items-center justify-between h-16">
            <Link
              href="/"
              className="transition-opacity duration-300 hover:opacity-70"
            >
              <Logo size={24} className="text-white" />
            </Link>
            <Link
              href="/"
              className="flex items-center gap-2 text-[13px] text-white/50 hover:text-white transition-colors"
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 md:px-12">
        <div className="max-w-[1000px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-[12px] text-white/60 mb-6">
              <Globe size={14} />
              <span>Berlin, Germany</span>
            </div>
            <h1 className="text-[40px] md:text-[56px] font-light tracking-[-0.03em] leading-[1.1] mb-6">
              Building the compliance
              <br />
              <span className="text-white/40">infrastructure for space</span>
            </h1>
            <p className="text-[16px] md:text-[18px] text-white/50 leading-relaxed max-w-[600px]">
              Caelex is the first regulatory compliance platform designed
              specifically for the European space industry. We help satellite
              operators, launch providers, and space companies navigate the EU
              Space Act with confidence.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20 px-6 md:px-12 border-t border-white/[0.06]">
        <div className="max-w-[1000px] mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-[12px] text-white/40 uppercase tracking-wider mb-4">
                Our Mission
              </h2>
              <p className="text-[24px] md:text-[32px] font-light tracking-[-0.02em] leading-[1.3] text-white/90">
                Make EU Space Act compliance simple, efficient, and accessible
                for every space operator.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="space-y-6"
            >
              <p className="text-[15px] text-white/50 leading-relaxed">
                The EU Space Act introduces 119 regulatory articles covering
                authorization, registration, environmental assessment,
                cybersecurity, debris mitigation, and insurance. Non-compliance
                can result in penalties of up to 2% of global turnover.
              </p>
              <p className="text-[15px] text-white/50 leading-relaxed">
                We believe compliance shouldn't be a barrier to innovation.
                Caelex transforms complex regulatory requirements into guided
                workflows, automated tracking, and actionable insights — so
                space companies can focus on their missions.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* The Problem */}
      <section className="py-20 px-6 md:px-12 bg-white/[0.02]">
        <div className="max-w-[1000px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-[12px] text-white/40 uppercase tracking-wider mb-4">
              The Problem
            </h2>
            <p className="text-[24px] md:text-[32px] font-light tracking-[-0.02em] leading-[1.3] max-w-[700px] mx-auto">
              The European space industry faces a compliance challenge it's
              never seen before.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                stat: "119",
                label: "Regulatory Articles",
                description:
                  "Spanning authorization, registration, environment, cybersecurity, debris, and insurance",
              },
              {
                stat: "650+",
                label: "Affected Companies",
                description:
                  "Satellite operators, launch providers, and space data services across the EU",
              },
              {
                stat: "2030",
                label: "Enforcement Deadline",
                description:
                  "Less than 4 years to achieve full compliance with mandatory requirements",
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="p-6 rounded-xl bg-black/40 border border-white/[0.06]"
              >
                <div className="text-[48px] font-light tracking-[-0.02em] text-white mb-2">
                  {item.stat}
                </div>
                <div className="text-[14px] font-medium text-white/80 mb-2">
                  {item.label}
                </div>
                <p className="text-[13px] text-white/40">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Solution */}
      <section className="py-20 px-6 md:px-12">
        <div className="max-w-[1000px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-16"
          >
            <h2 className="text-[12px] text-white/40 uppercase tracking-wider mb-4">
              Our Solution
            </h2>
            <p className="text-[24px] md:text-[32px] font-light tracking-[-0.02em] leading-[1.3] max-w-[700px]">
              One platform. Eight modules. Complete EU Space Act coverage.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-4">
            {[
              {
                name: "Authorization Management",
                desc: "Space activity authorization workflows",
              },
              {
                name: "URSO Registration",
                desc: "Union Registry of Space Objects integration",
              },
              {
                name: "Environmental Assessment",
                desc: "EFD/LCA documentation and metrics",
              },
              {
                name: "Cybersecurity (NIS2)",
                desc: "Security alignment and assessment",
              },
              {
                name: "Debris Mitigation",
                desc: "Collision risk and end-of-life planning",
              },
              {
                name: "Insurance Compliance",
                desc: "Coverage verification and tracking",
              },
              {
                name: "Regulatory Supervision",
                desc: "Reporting and inspection management",
              },
              {
                name: "Document Vault",
                desc: "Secure storage with audit trails",
              },
            ].map((module, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-400/60" />
                <div>
                  <div className="text-[14px] font-medium text-white/80">
                    {module.name}
                  </div>
                  <div className="text-[12px] text-white/40">{module.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 px-6 md:px-12 border-t border-white/[0.06]">
        <div className="max-w-[1000px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-[12px] text-white/40 uppercase tracking-wider mb-4">
              Our Values
            </h2>
            <p className="text-[24px] md:text-[32px] font-light tracking-[-0.02em] leading-[1.3]">
              What drives us
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {values.map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="flex gap-5"
              >
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-xl bg-white/[0.05] flex items-center justify-center">
                    <value.icon size={22} className="text-white/50" />
                  </div>
                </div>
                <div>
                  <h3 className="text-[16px] font-medium mb-2">
                    {value.title}
                  </h3>
                  <p className="text-[14px] text-white/50 leading-relaxed">
                    {value.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why We Exist */}
      <section className="py-20 px-6 md:px-12 bg-white/[0.02]">
        <div className="max-w-[1000px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-16"
          >
            <h2 className="text-[12px] text-white/40 uppercase tracking-wider mb-4">
              Why We Exist
            </h2>
            <p className="text-[24px] md:text-[32px] font-light tracking-[-0.02em] leading-[1.3] max-w-[700px]">
              The space industry deserves better compliance tools.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              <p className="text-[15px] text-white/60 leading-relaxed">
                Today, space companies manage compliance with spreadsheets,
                email chains, and expensive consultants charging €200-500 per
                hour. Documentation lives in scattered folders. Deadlines are
                tracked manually. Audit preparation takes weeks.
              </p>
              <p className="text-[15px] text-white/60 leading-relaxed">
                This approach worked when space was a niche industry with a
                handful of government-backed operators. But with 150+ new
                European space startups since 2020 and comprehensive regulation
                on the horizon, the old way simply doesn't scale.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="space-y-6"
            >
              <p className="text-[15px] text-white/60 leading-relaxed">
                We believe every satellite operator — from a 10-person NewSpace
                startup to a multinational corporation — should have access to
                enterprise-grade compliance infrastructure. That's why we're
                building Caelex.
              </p>
              <p className="text-[15px] text-white/60 leading-relaxed">
                Our platform brings the same automation and intelligence that
                transformed financial compliance (think OneTrust, Vanta) to the
                space sector. Purpose-built for the EU Space Act, designed for
                how space companies actually work.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Our Approach */}
      <section className="py-20 px-6 md:px-12">
        <div className="max-w-[1000px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-16"
          >
            <h2 className="text-[12px] text-white/40 uppercase tracking-wider mb-4">
              Our Approach
            </h2>
            <p className="text-[24px] md:text-[32px] font-light tracking-[-0.02em] leading-[1.3] max-w-[700px]">
              Compliance as a competitive advantage, not a burden.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Regulatory Intelligence",
                description:
                  "We continuously monitor EU Space Act developments, interpretive guidance, and enforcement actions. Our platform stays current so you don't have to.",
              },
              {
                title: "Guided Workflows",
                description:
                  "Complex requirements become step-by-step processes. Authorization applications, environmental assessments, debris mitigation plans — all with built-in best practices.",
              },
              {
                title: "Audit-Ready Documentation",
                description:
                  "Every action is logged. Every document is versioned. When regulators come knocking, you're prepared with a complete compliance trail.",
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="p-6 rounded-xl bg-white/[0.02] border border-white/[0.06]"
              >
                <h3 className="text-[16px] font-medium mb-3">{item.title}</h3>
                <p className="text-[14px] text-white/50 leading-relaxed">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Built in Berlin */}
      <section className="py-20 px-6 md:px-12 border-t border-white/[0.06]">
        <div className="max-w-[1000px] mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-[12px] text-white/40 uppercase tracking-wider mb-4">
                Built in Berlin
              </h2>
              <p className="text-[24px] md:text-[32px] font-light tracking-[-0.02em] leading-[1.3] text-white/90 mb-6">
                European roots, global ambition.
              </p>
              <p className="text-[15px] text-white/50 leading-relaxed">
                We're headquartered in Berlin, at the heart of Europe's growing
                space ecosystem. Being close to EU institutions, national space
                agencies, and the NewSpace community means we understand the
                regulatory landscape firsthand — and can respond quickly as it
                evolves.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="grid grid-cols-2 gap-4"
            >
              {[
                { label: "Headquarters", value: "Berlin, DE" },
                { label: "Founded", value: "2025" },
                { label: "Focus", value: "EU Space Act" },
                { label: "Stage", value: "Pre-Seed" },
              ].map((item, index) => (
                <div
                  key={index}
                  className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]"
                >
                  <div className="text-[12px] text-white/40 mb-1">
                    {item.label}
                  </div>
                  <div className="text-[16px] font-medium">{item.value}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 md:px-12 bg-white/[0.02]">
        <div className="max-w-[600px] mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-[28px] md:text-[36px] font-light tracking-[-0.02em] mb-4">
              Join us on this journey
            </h2>
            <p className="text-[15px] text-white/50 mb-8">
              Whether you're a space company looking for compliance solutions or
              a talented individual wanting to shape the future of space
              regulation — we'd love to hear from you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white text-black text-[14px] font-medium hover:bg-white/90 transition-colors"
              >
                Get in Touch
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/careers"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white/[0.05] border border-white/[0.1] text-white text-[14px] font-medium hover:bg-white/[0.1] transition-colors"
              >
                View Open Positions
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
