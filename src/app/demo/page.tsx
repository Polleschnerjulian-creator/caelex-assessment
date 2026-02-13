"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle,
  Shield,
  Globe,
  Zap,
  Clock,
  Users,
  FileCheck,
  Sparkles,
  Play,
  Calendar,
} from "lucide-react";
import Navigation from "@/components/landing/Navigation";
import { CaelexIcon } from "@/components/ui/Logo";

const benefits = [
  {
    icon: Zap,
    title: "5-Minute Assessment",
    description: "Get your complete regulatory profile in minutes, not weeks",
  },
  {
    icon: Globe,
    title: "10 Jurisdictions",
    description: "Compare licensing requirements across European space laws",
  },
  {
    icon: Shield,
    title: "3 Frameworks",
    description: "EU Space Act, NIS2 Directive, and National Space Laws",
  },
  {
    icon: FileCheck,
    title: "119 Articles Mapped",
    description: "Every EU Space Act requirement tracked and explained",
  },
];

const stats = [
  { value: "2030", label: "Compliance Deadline" },
  { value: "119", label: "Articles Covered" },
  { value: "10", label: "Jurisdictions" },
  { value: "7", label: "Operator Types" },
];

const testimonials = [
  {
    quote:
      "Finally, a platform that understands the complexity of space regulatory compliance.",
    author: "Head of Regulatory Affairs",
    company: "European Satellite Operator",
  },
  {
    quote:
      "Cut our compliance research time by 80%. The jurisdiction comparison is invaluable.",
    author: "Legal Counsel",
    company: "Launch Service Provider",
  },
];

export default function DemoPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || submitting) return;

    setSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Store in localStorage for now (you can replace with actual API)
    try {
      const demos = JSON.parse(
        localStorage.getItem("caelex-demo-requests") || "[]",
      );
      demos.push({
        email,
        name,
        company,
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem("caelex-demo-requests", JSON.stringify(demos));
    } catch {
      // localStorage may be unavailable
    }

    setSubmitted(true);
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Navigation />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-[1400px] mx-auto px-6 md:px-12 relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.1] mb-6">
                <Sparkles size={14} className="text-amber-400" />
                <span className="text-[13px] text-white/60">
                  Trusted by leading space companies
                </span>
              </div>

              <h1 className="text-[42px] md:text-[56px] font-medium leading-[1.1] tracking-[-0.02em] text-white mb-6">
                See Caelex
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-300">
                  in Action
                </span>
              </h1>

              <p className="text-[17px] text-white/50 leading-relaxed mb-8 max-w-lg">
                Get a personalized walkthrough of how Caelex helps satellite
                operators, launch providers, and space service companies
                navigate EU Space Act, NIS2, and national space law compliance.
              </p>

              {/* Quick Stats */}
              <div className="grid grid-cols-4 gap-4 mb-8">
                {stats.map((stat, i) => (
                  <div key={i} className="text-center">
                    <div className="text-[24px] font-semibold text-white">
                      {stat.value}
                    </div>
                    <div className="text-[11px] text-white/40 uppercase tracking-wider">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Trust Indicators */}
              <div className="flex items-center gap-6 text-[13px] text-white/40">
                <div className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-400" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-emerald-400" />
                  <span>15 min demo</span>
                </div>
              </div>
            </motion.div>

            {/* Right: Form Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="relative">
                {/* Liquid Glass Card */}
                <div className="relative bg-white/[0.06] backdrop-blur-2xl border border-white/[0.12] rounded-3xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)]">
                  {/* Glow effect */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 via-emerald-400/20 to-emerald-500/20 rounded-3xl blur-xl opacity-50" />

                  <div className="relative">
                    {submitted ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-8"
                      >
                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                          <CheckCircle size={32} className="text-emerald-400" />
                        </div>
                        <h3 className="text-[22px] font-medium text-white mb-3">
                          You're on the list!
                        </h3>
                        <p className="text-[15px] text-white/50 mb-6">
                          We'll reach out within 24 hours to schedule your
                          personalized demo.
                        </p>
                        <Link
                          href="/assessment"
                          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black text-[14px] font-medium hover:bg-white/90 transition-all"
                        >
                          Try Free Assessment
                          <ArrowRight size={16} />
                        </Link>
                      </motion.div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-400 flex items-center justify-center">
                            <Calendar size={20} className="text-white" />
                          </div>
                          <div>
                            <h3 className="text-[18px] font-medium text-white">
                              Book Your Demo
                            </h3>
                            <p className="text-[13px] text-white/40">
                              Free • 15 minutes • No commitment
                            </p>
                          </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                          <div>
                            <input
                              type="text"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              placeholder="Your name"
                              required
                              className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-4 py-3.5 text-[14px] text-white placeholder:text-white/30 outline-none focus:border-white/25 transition-colors"
                            />
                          </div>
                          <div>
                            <input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="Work email"
                              required
                              className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-4 py-3.5 text-[14px] text-white placeholder:text-white/30 outline-none focus:border-white/25 transition-colors"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              value={company}
                              onChange={(e) => setCompany(e.target.value)}
                              placeholder="Company name"
                              required
                              className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-4 py-3.5 text-[14px] text-white placeholder:text-white/30 outline-none focus:border-white/25 transition-colors"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-gradient-to-r from-emerald-500 to-emerald-400 text-white text-[14px] font-medium px-6 py-4 rounded-xl hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {submitting ? (
                              <span>Submitting...</span>
                            ) : (
                              <>
                                Get Your Demo
                                <ArrowRight size={16} />
                              </>
                            )}
                          </button>
                        </form>

                        <p className="text-[11px] text-white/30 text-center mt-4">
                          By submitting, you agree to our{" "}
                          <Link
                            href="/legal/privacy"
                            className="underline hover:text-white/50"
                          >
                            Privacy Policy
                          </Link>
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Platform Preview Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-[32px] font-medium text-white mb-4">
              What You'll See in the Demo
            </h2>
            <p className="text-[16px] text-white/50 max-w-2xl mx-auto">
              A complete walkthrough of the platform tailored to your specific
              needs
            </p>
          </motion.div>

          {/* Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            {/* Glowing border effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/30 via-emerald-400/30 to-emerald-500/30 rounded-3xl blur-xl" />

            {/* Preview Container */}
            <div className="relative bg-white/[0.04] backdrop-blur-xl border border-white/[0.1] rounded-3xl p-2 overflow-hidden">
              {/* Browser Chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="px-4 py-1.5 rounded-lg bg-white/[0.06] text-[12px] text-white/40">
                    app.caelex.eu/dashboard
                  </div>
                </div>
              </div>

              {/* Dashboard Mockup */}
              <div className="p-6 bg-gradient-to-br from-[#0a0f1e] to-[#0f172a]">
                <div className="grid grid-cols-12 gap-4">
                  {/* Sidebar */}
                  <div className="col-span-2 space-y-2">
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.08]">
                      <CaelexIcon size={20} className="text-white" />
                      <span className="text-[13px] font-medium text-white">
                        caelex
                      </span>
                    </div>
                    {[
                      "Overview",
                      "Authorization",
                      "Registration",
                      "Cybersecurity",
                      "Debris",
                      "Insurance",
                    ].map((item, i) => (
                      <div
                        key={item}
                        className={`p-2.5 rounded-lg text-[12px] ${
                          i === 0
                            ? "bg-white/[0.08] text-white"
                            : "text-white/40"
                        }`}
                      >
                        {item}
                      </div>
                    ))}
                  </div>

                  {/* Main Content */}
                  <div className="col-span-10 space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[18px] font-medium text-white">
                          Compliance Dashboard
                        </div>
                        <div className="text-[12px] text-white/40">
                          EU Space Act • NIS2 • National Laws
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-[11px]">
                          78% Compliant
                        </div>
                      </div>
                    </div>

                    {/* Stat Cards */}
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        {
                          label: "Articles",
                          value: "84/119",
                          color: "emerald",
                        },
                        {
                          label: "NIS2 Status",
                          value: "Essential",
                          color: "emerald",
                        },
                        {
                          label: "Jurisdiction",
                          value: "France",
                          color: "amber",
                        },
                        { label: "Deadline", value: "2030", color: "emerald" },
                      ].map((stat) => (
                        <div
                          key={stat.label}
                          className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.06]"
                        >
                          <div className="text-[11px] text-white/40 mb-1">
                            {stat.label}
                          </div>
                          <div
                            className={`text-[18px] font-medium text-${stat.color}-400`}
                          >
                            {stat.value}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Progress Bars */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { module: "Authorization", progress: 65 },
                        { module: "Cybersecurity", progress: 82 },
                        { module: "Debris Mitigation", progress: 45 },
                        { module: "Insurance", progress: 90 },
                      ].map((item) => (
                        <div
                          key={item.module}
                          className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.06]"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] text-white/60">
                              {item.module}
                            </span>
                            <span className="text-[12px] text-white/40">
                              {item.progress}%
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/[0.1] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Play Button Overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity duration-300 cursor-pointer rounded-3xl">
                <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center border border-white/30">
                  <Play size={32} className="text-white ml-1" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="grid md:grid-cols-4 gap-6">
            {benefits.map((benefit, i) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group"
              >
                <div className="h-full p-6 rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-300">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-400/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <benefit.icon size={24} className="text-emerald-400" />
                  </div>
                  <h3 className="text-[16px] font-medium text-white mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-[13px] text-white/40 leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 border-t border-white/[0.04]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="grid md:grid-cols-2 gap-8">
            {testimonials.map((testimonial, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-8 rounded-2xl bg-white/[0.04] border border-white/[0.08]"
              >
                <p className="text-[17px] text-white/70 leading-relaxed mb-6 italic">
                  "{testimonial.quote}"
                </p>
                <div>
                  <div className="text-[14px] font-medium text-white">
                    {testimonial.author}
                  </div>
                  <div className="text-[13px] text-white/40">
                    {testimonial.company}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 border-t border-white/[0.04]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-[32px] font-medium text-white mb-4">
              Ready to simplify your compliance?
            </h2>
            <p className="text-[16px] text-white/50 mb-8 max-w-xl mx-auto">
              Join leading space companies who trust Caelex for their regulatory
              compliance.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link
                href="/assessment"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-black text-[14px] font-medium hover:bg-white/90 transition-all"
              >
                Start Free Assessment
                <ArrowRight size={16} />
              </Link>
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full border border-white/20 text-white text-[14px] font-medium hover:border-white/40 transition-all"
              >
                <Users size={16} />
                Book Demo
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer spacer */}
      <div className="h-20" />
    </div>
  );
}
