"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle,
  ArrowLeft,
  Loader2,
  Shield,
  Calendar,
  Clock,
  FileCheck,
  Globe,
  Scale,
  Satellite,
} from "lucide-react";
import { CaelexIcon } from "@/components/ui/Logo";

export default function DemoPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, company }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const features = [
    {
      icon: FileCheck,
      title: "Your compliance profile",
      description:
        "Live walkthrough of the assessment and dashboard for your operator type",
    },
    {
      icon: Globe,
      title: "Jurisdiction comparison",
      description:
        "Side-by-side analysis of licensing requirements across 10+ European space laws",
    },
    {
      icon: Scale,
      title: "Regulatory mapping",
      description:
        "How 119 EU Space Act articles and NIS2 requirements map to your operations",
    },
    {
      icon: Satellite,
      title: "Fleet-level tracking",
      description:
        "Per-satellite compliance state, deadline tracking, and audit trail",
    },
  ];

  const stats = [
    { value: "119", label: "EU Space Act Articles" },
    { value: "10+", label: "Jurisdictions" },
    { value: "51", label: "NIS2 Requirements" },
    { value: "7", label: "Operator Types" },
  ];

  return (
    <div className="landing-light min-h-screen bg-[#ecedf1] text-[#111118] relative overflow-hidden">
      {/* Navigation */}
      <motion.nav
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-12 pt-8 flex items-center justify-between"
      >
        <Link href="/" className="flex items-center gap-2.5">
          <CaelexIcon size={28} className="text-[#111118]" />
          <span
            className="text-[18px] font-semibold text-[#111118]"
            style={{ letterSpacing: "-0.01em" }}
          >
            caelex
          </span>
        </Link>
        <Link
          href="/"
          className="flex items-center gap-2 text-[13px] text-[#8e8ea0] hover:text-[#111118] transition-colors duration-200"
        >
          <ArrowLeft size={14} />
          Back
        </Link>
      </motion.nav>

      {/* Hero — Form + Value Prop */}
      <section className="relative z-10 pt-16 pb-24 md:pt-24 md:pb-32">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-start">
            {/* Left: Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-block font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-[#8e8ea0] mb-6">
                Book a Demo
              </span>

              <h1
                className="font-bold leading-[1.05] tracking-[-0.03em] mb-6"
                style={{ fontSize: "clamp(32px, 5vw, 56px)" }}
              >
                <span className="text-[#111118]">See the platform</span>
                <br />
                <span className="text-[#b8b8c8]">before you commit.</span>
              </h1>

              <p
                className="text-[#5c5c72] leading-relaxed max-w-lg mb-12"
                style={{ fontSize: "clamp(15px, 1.8vw, 17px)" }}
              >
                15 minutes. Tailored to your operator type, jurisdiction, and
                mission profile. We show you exactly how Caelex maps to your
                compliance obligations.
              </p>

              {/* What you'll see */}
              <div className="space-y-5 mb-12">
                {features.map((item, i) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
                    className="flex gap-4"
                  >
                    <div
                      className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{
                        background: "rgba(255,255,255,0.7)",
                        backdropFilter: "blur(12px)",
                        WebkitBackdropFilter: "blur(12px)",
                        border: "1px solid rgba(255,255,255,0.8)",
                        boxShadow:
                          "0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)",
                      }}
                    >
                      <item.icon size={16} className="text-[#111118]" />
                    </div>
                    <div>
                      <h3 className="text-[14px] font-semibold text-[#111118] mb-0.5">
                        {item.title}
                      </h3>
                      <p className="text-[13px] text-[#8e8ea0] leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Trust signals */}
              <div className="flex items-center gap-5 text-[12px] text-[#8e8ea0]">
                <div className="flex items-center gap-1.5">
                  <Clock size={12} />
                  <span>15 min</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Shield size={12} />
                  <span>No commitment</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar size={12} />
                  <span>Respond within 24h</span>
                </div>
              </div>
            </motion.div>

            {/* Right: Glass Form Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="lg:sticky lg:top-32"
            >
              <div
                className="rounded-[22px] p-8 md:p-10"
                style={{
                  background: "rgba(255,255,255,0.72)",
                  backdropFilter: "blur(40px) saturate(1.8)",
                  WebkitBackdropFilter: "blur(40px) saturate(1.8)",
                  border: "1px solid rgba(255,255,255,0.75)",
                  boxShadow:
                    "0 8px 32px rgba(0,0,0,0.05), 0 2px 8px rgba(0,0,0,0.03), inset 0 1.5px 0 rgba(255,255,255,0.85), inset 0 -1px 0 rgba(0,0,0,0.015)",
                }}
              >
                {submitted ? (
                  <div className="text-center py-6">
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
                      style={{
                        background: "rgba(0,0,0,0.04)",
                        border: "1px solid rgba(0,0,0,0.06)",
                      }}
                    >
                      <CheckCircle size={28} className="text-[#111118]" />
                    </div>
                    <h3
                      className="font-bold text-[#111118] mb-2"
                      style={{ fontSize: "clamp(18px, 2.5vw, 24px)" }}
                    >
                      You&apos;re on the list.
                    </h3>
                    <p className="text-[14px] text-[#5c5c72] mb-8 max-w-sm mx-auto">
                      We&apos;ll reach out within 24 hours to schedule your
                      personalized walkthrough.
                    </p>
                    <Link
                      href="/assessment"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#111118] text-white text-[14px] font-medium transition-all duration-200 hover:bg-[#2a2a3a] hover:-translate-y-px"
                    >
                      Try Free Assessment
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="mb-8">
                      <h2 className="text-[20px] font-bold text-[#111118] mb-1">
                        Request a demo
                      </h2>
                      <p className="text-[13px] text-[#8e8ea0]">
                        Free &middot; 15 minutes &middot; No credit card
                      </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label
                          htmlFor="demo-name"
                          className="block text-[11px] font-semibold text-[#5c5c72] uppercase tracking-[0.1em] mb-2"
                        >
                          Name
                        </label>
                        <input
                          type="text"
                          id="demo-name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Your name"
                          required
                          autoComplete="name"
                          className="w-full rounded-xl px-4 py-3.5 text-[14px] text-[#111118] placeholder:text-[#b8b8c8] outline-none transition-colors duration-200 focus:border-[#111118]"
                          style={{
                            background: "rgba(0,0,0,0.025)",
                            border: "1px solid rgba(0,0,0,0.06)",
                          }}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="demo-email"
                          className="block text-[11px] font-semibold text-[#5c5c72] uppercase tracking-[0.1em] mb-2"
                        >
                          Work email
                        </label>
                        <input
                          type="email"
                          id="demo-email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@company.com"
                          required
                          autoComplete="email"
                          className="w-full rounded-xl px-4 py-3.5 text-[14px] text-[#111118] placeholder:text-[#b8b8c8] outline-none transition-colors duration-200 focus:border-[#111118]"
                          style={{
                            background: "rgba(0,0,0,0.025)",
                            border: "1px solid rgba(0,0,0,0.06)",
                          }}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="demo-company"
                          className="block text-[11px] font-semibold text-[#5c5c72] uppercase tracking-[0.1em] mb-2"
                        >
                          Company
                        </label>
                        <input
                          type="text"
                          id="demo-company"
                          value={company}
                          onChange={(e) => setCompany(e.target.value)}
                          placeholder="Company name"
                          required
                          autoComplete="organization"
                          className="w-full rounded-xl px-4 py-3.5 text-[14px] text-[#111118] placeholder:text-[#b8b8c8] outline-none transition-colors duration-200 focus:border-[#111118]"
                          style={{
                            background: "rgba(0,0,0,0.025)",
                            border: "1px solid rgba(0,0,0,0.06)",
                          }}
                        />
                      </div>

                      {error && (
                        <p
                          className="text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5"
                          role="alert"
                        >
                          {error}
                        </p>
                      )}

                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full flex items-center justify-center gap-2 bg-[#111118] text-white text-[14px] font-medium px-6 py-4 rounded-xl transition-all duration-200 disabled:opacity-50 mt-2 hover:bg-[#2a2a3a] hover:-translate-y-px"
                      >
                        {submitting ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            Request Demo
                            <ArrowRight size={14} />
                          </>
                        )}
                      </button>
                    </form>

                    <p className="text-[11px] text-[#b8b8c8] text-center mt-5">
                      By submitting, you agree to our{" "}
                      <Link
                        href="/legal/privacy"
                        className="underline hover:text-[#5c5c72] transition-colors"
                      >
                        Privacy Policy
                      </Link>
                    </p>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Numbers strip — glass card */}
      <section className="relative z-10 py-20">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <div
            className="rounded-[22px] p-10 md:p-14"
            style={{
              background: "rgba(255,255,255,0.65)",
              border: "1px solid rgba(255,255,255,0.75)",
              backdropFilter: "blur(24px) saturate(1.6)",
              WebkitBackdropFilter: "blur(24px) saturate(1.6)",
              boxShadow:
                "0 4px 24px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.8)",
            }}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                  className="text-center"
                >
                  <div
                    className="font-bold text-[#111118] tracking-[-0.02em]"
                    style={{ fontSize: "clamp(28px, 4vw, 44px)" }}
                  >
                    {stat.value}
                  </div>
                  <div className="font-mono text-[11px] text-[#8e8ea0] uppercase tracking-[0.1em] mt-2">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA strip */}
      <section className="relative z-10 py-24 md:py-32">
        <div className="max-w-[720px] mx-auto px-6 md:px-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2
              className="font-bold leading-[1.1] tracking-[-0.03em] mb-4"
              style={{ fontSize: "clamp(24px, 4vw, 40px)" }}
            >
              <span className="text-[#111118]">
                Rather explore on your own?
              </span>
            </h2>
            <p className="text-[15px] text-[#5c5c72] leading-relaxed mb-10 max-w-md mx-auto">
              The free assessment takes 5 minutes and gives you a full
              compliance profile — no account required.
            </p>
            <Link
              href="/assessment"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-[14px] font-medium transition-all duration-200 hover:-translate-y-px"
              style={{
                background: "rgba(255,255,255,0.7)",
                border: "1px solid rgba(255,255,255,0.8)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                boxShadow:
                  "0 2px 12px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)",
                color: "#111118",
              }}
            >
              Start Free Assessment
              <ArrowRight size={14} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer line */}
      <div className="relative z-10 pb-12 text-center">
        <p className="text-[11px] text-[#b8b8c8]">
          &copy; {new Date().getFullYear()} Caelex. All rights reserved.
        </p>
      </div>
    </div>
  );
}
