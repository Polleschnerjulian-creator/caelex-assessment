"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";
import {
  MapPin,
  Clock,
  Users,
  Rocket,
  Code,
  Briefcase,
  ArrowRight,
  Sparkles,
  Globe,
  Zap,
  Heart,
} from "lucide-react";

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

const positions = [
  {
    id: "cto-cofounder",
    title: "Co-Founder & CTO",
    type: "Co-Founder",
    location: "Berlin / Remote (EU)",
    commitment: "Full-time",
    description:
      "We're looking for a technical co-founder to scale the Caelex platform to enterprise-grade and drive the technical vision forward.",
    icon: Code,
    tags: ["Engineering", "Leadership", "Architecture"],
  },
  {
    id: "coo-cofounder",
    title: "Co-Founder & COO",
    type: "Co-Founder",
    location: "Berlin / Munich / Remote (EU)",
    commitment: "Full-time",
    description:
      "We're looking for an operational co-founder with expertise in Space Law or B2B SaaS to build customer relationships and lead go-to-market strategy.",
    icon: Briefcase,
    tags: ["Operations", "Sales", "Strategy"],
  },
];

const benefits = [
  {
    icon: Rocket,
    title: "Ground Floor Opportunity",
    description: "Join as a founding team member with significant equity",
  },
  {
    icon: Globe,
    title: "Remote-First",
    description: "Work from anywhere in the EU with flexible hours",
  },
  {
    icon: Zap,
    title: "High Impact",
    description: "Shape the future of European space regulation",
  },
  {
    icon: Heart,
    title: "Mission-Driven",
    description: "Build something meaningful for the space industry",
  },
];

const values = [
  "We move fast but think carefully",
  "We prioritize customer outcomes",
  "We embrace regulatory complexity",
  "We build for the long term",
];

export default function CareersPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navigation />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 80% 50% at 50% 20%, rgba(16, 185, 129, 0.08) 0%, transparent 60%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 60% 40% at 80% 80%, rgba(16, 185, 129, 0.05) 0%, transparent 50%)",
            }}
          />
        </div>

        {/* Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative z-10 max-w-[1200px] mx-auto px-6 md:px-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-[800px]"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[12px] text-emerald-400 mb-6">
              <Users size={14} />
              <span>We're building the founding team</span>
            </div>

            <h1 className="text-[clamp(2.5rem,6vw,4.5rem)] font-medium tracking-[-0.03em] leading-[1.1] mb-6">
              Shape the Future of{" "}
              <span className="text-emerald-400">Space Compliance</span>
            </h1>

            <p className="text-[18px] md:text-[20px] text-white/50 leading-relaxed max-w-[600px] mb-10">
              Caelex is the first compliance platform for the EU Space Act.
              We're looking for co-founders to transform the European space
              market with us.
            </p>

            <div className="flex flex-wrap gap-4">
              <a
                href="#positions"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-emerald-500 text-white text-[14px] font-medium transition-all duration-300 hover:bg-emerald-400 hover:shadow-[0_0_30px_rgba(16,185,129,0.3)]"
              >
                View Open Positions
                <ArrowRight size={16} />
              </a>
              <Link
                href="/about"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-white/[0.05] backdrop-blur-xl border border-white/[0.12] text-white text-[14px] font-medium transition-all duration-300 hover:bg-white/[0.1] hover:border-white/[0.2]"
              >
                Learn About Us
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="relative py-20 px-6 md:px-12">
        <div className="max-w-[1200px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="inline-block text-[11px] font-medium text-emerald-400 uppercase tracking-[0.2em] mb-4">
              Why Join Us
            </span>
            <h2 className="text-[clamp(1.75rem,4vw,2.5rem)] font-medium tracking-[-0.02em] text-white">
              Build something meaningful
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {benefits.map((benefit, i) => {
              const Icon = benefit.icon;
              return (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <GlassCard className="p-6 h-full">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
                      <Icon size={24} className="text-emerald-400" />
                    </div>
                    <h3 className="text-[16px] font-medium text-white mb-2">
                      {benefit.title}
                    </h3>
                    <p className="text-[13px] text-white/50 leading-relaxed">
                      {benefit.description}
                    </p>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section
        id="positions"
        className="relative py-20 px-6 md:px-12 scroll-mt-24"
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% 50%, rgba(16, 185, 129, 0.04) 0%, transparent 60%)",
          }}
        />

        <div className="relative z-10 max-w-[1000px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center gap-3 mb-10"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Rocket size={20} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="text-[24px] font-medium tracking-[-0.02em] text-white">
                Open Positions
              </h2>
              <p className="text-[13px] text-white/40">
                Co-Founder opportunities
              </p>
            </div>
          </motion.div>

          <div className="space-y-5">
            {positions.map((position, index) => {
              const Icon = position.icon;
              return (
                <motion.div
                  key={position.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link href={`/careers/${position.id}`}>
                    <GlassCard className="p-6 md:p-8 group">
                      <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                        <div className="flex-shrink-0">
                          <div className="w-14 h-14 rounded-xl bg-emerald-500/10 flex items-center justify-center transition-all duration-300 group-hover:bg-emerald-500/20 group-hover:scale-110">
                            <Icon size={26} className="text-emerald-400" />
                          </div>
                        </div>

                        <div className="flex-grow">
                          <div className="flex flex-wrap items-center gap-3 mb-2">
                            <h3 className="text-[20px] font-medium text-white group-hover:text-emerald-400 transition-colors">
                              {position.title}
                            </h3>
                            <span className="px-2.5 py-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 rounded-full uppercase tracking-wider">
                              {position.type}
                            </span>
                          </div>

                          <p className="text-[14px] text-white/50 mb-4 max-w-[600px]">
                            {position.description}
                          </p>

                          <div className="flex flex-wrap gap-4 text-[13px] text-white/40">
                            <span className="flex items-center gap-1.5">
                              <MapPin size={14} />
                              {position.location}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Clock size={14} />
                              {position.commitment}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2 mt-4">
                            {position.tags.map((tag) => (
                              <span
                                key={tag}
                                className="px-3 py-1 text-[11px] text-white/50 bg-white/[0.05] rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex-shrink-0 hidden lg:block">
                          <div className="w-12 h-12 rounded-full bg-white/[0.05] flex items-center justify-center transition-all duration-300 group-hover:bg-emerald-500/20">
                            <ArrowRight
                              size={20}
                              className="text-white/40 group-hover:text-emerald-400 transition-colors"
                            />
                          </div>
                        </div>
                      </div>
                    </GlassCard>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="relative py-20 px-6 md:px-12">
        <div className="max-w-[800px] mx-auto">
          <GlassCard className="p-8 md:p-12" hover={false}>
            <div className="text-center mb-10">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-5">
                <Sparkles size={26} className="text-emerald-400" />
              </div>
              <h2 className="text-[24px] font-medium text-white mb-3">
                Our Values
              </h2>
              <p className="text-[15px] text-white/50">
                What we believe in as a team
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {values.map((value, i) => (
                <motion.div
                  key={value}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                >
                  <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                  <span className="text-[14px] text-white/70">{value}</span>
                </motion.div>
              ))}
            </div>
          </GlassCard>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 px-6 md:px-12">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% 100%, rgba(16, 185, 129, 0.08) 0%, transparent 60%)",
          }}
        />

        <div className="relative z-10 max-w-[600px] mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-[clamp(1.75rem,4vw,2.5rem)] font-medium tracking-[-0.02em] text-white mb-4">
              Ready to transform the space industry?
            </h2>
            <p className="text-[16px] text-white/50 mb-8">
              Select a position above to learn more and apply, or reach out
              directly.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white/[0.05] backdrop-blur-xl border border-white/[0.12] text-white text-[15px] font-medium transition-all duration-300 hover:bg-white/[0.1] hover:border-white/[0.2]"
            >
              Get in Touch
              <ArrowRight size={18} />
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
