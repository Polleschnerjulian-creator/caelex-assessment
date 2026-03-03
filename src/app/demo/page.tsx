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

  return (
    <div className="landing-light min-h-screen bg-white text-[#111827]">
      {/* Navigation back */}
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 pt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[#9CA3AF] hover:text-[#111827] transition-colors text-body"
        >
          <ArrowLeft size={14} />
          Back
        </Link>
      </div>

      {/* Hero — Form + Value Prop */}
      <section className="pt-16 pb-24 md:pt-24 md:pb-32">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-start">
            {/* Left: Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-block font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-[#9CA3AF] mb-6">
                Book a Demo
              </span>

              <h1
                className="font-bold leading-[1.05] tracking-[-0.03em] mb-6"
                style={{ fontSize: "clamp(32px, 5vw, 56px)" }}
              >
                <span className="text-[#111827]">See the platform</span>
                <br />
                <span className="text-[#9CA3AF]">before you commit.</span>
              </h1>

              <p
                className="text-[#4B5563] leading-relaxed max-w-lg mb-12"
                style={{ fontSize: "clamp(15px, 1.8vw, 17px)" }}
              >
                15 minutes. Tailored to your operator type, jurisdiction, and
                mission profile. We show you exactly how Caelex maps to your
                compliance obligations.
              </p>

              {/* What you'll see */}
              <div className="space-y-5 mb-12">
                {[
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
                ].map((item, i) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
                    className="flex gap-4"
                  >
                    <div className="w-9 h-9 rounded-lg bg-[#F1F3F5] border border-[#E5E7EB] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <item.icon size={16} className="text-[#111827]" />
                    </div>
                    <div>
                      <h3 className="text-[14px] font-semibold text-[#111827] mb-0.5">
                        {item.title}
                      </h3>
                      <p className="text-[13px] text-[#6B7280] leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Trust signals */}
              <div className="flex items-center gap-5 text-[12px] text-[#9CA3AF]">
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

            {/* Right: Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="lg:sticky lg:top-32"
            >
              <div
                className="rounded-2xl bg-white border border-[#E5E7EB] p-8 md:p-10"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
              >
                {submitted ? (
                  <div className="text-center py-6">
                    <div className="w-14 h-14 rounded-full bg-[#F1F3F5] border border-[#E5E7EB] flex items-center justify-center mx-auto mb-5">
                      <CheckCircle size={28} className="text-[#111827]" />
                    </div>
                    <h3
                      className="font-bold text-[#111827] mb-2"
                      style={{ fontSize: "clamp(18px, 2.5vw, 24px)" }}
                    >
                      You&apos;re on the list.
                    </h3>
                    <p className="text-[14px] text-[#4B5563] mb-8 max-w-sm mx-auto">
                      We&apos;ll reach out within 24 hours to schedule your
                      personalized walkthrough.
                    </p>
                    <Link
                      href="/assessment"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#111827] text-white text-[14px] font-medium hover:bg-[#374151] transition-all"
                    >
                      Try Free Assessment
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="mb-8">
                      <h2 className="text-[20px] font-bold text-[#111827] mb-1">
                        Request a demo
                      </h2>
                      <p className="text-[13px] text-[#6B7280]">
                        Free &middot; 15 minutes &middot; No credit card
                      </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label
                          htmlFor="demo-name"
                          className="block text-[11px] font-semibold text-[#4B5563] uppercase tracking-[0.1em] mb-2"
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
                          className="w-full bg-[#F7F8FA] border border-[#E5E7EB] rounded-xl px-4 py-3.5 text-[14px] text-[#111827] placeholder:text-[#9CA3AF] outline-none focus:border-[#111827] transition-colors"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="demo-email"
                          className="block text-[11px] font-semibold text-[#4B5563] uppercase tracking-[0.1em] mb-2"
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
                          className="w-full bg-[#F7F8FA] border border-[#E5E7EB] rounded-xl px-4 py-3.5 text-[14px] text-[#111827] placeholder:text-[#9CA3AF] outline-none focus:border-[#111827] transition-colors"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="demo-company"
                          className="block text-[11px] font-semibold text-[#4B5563] uppercase tracking-[0.1em] mb-2"
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
                          className="w-full bg-[#F7F8FA] border border-[#E5E7EB] rounded-xl px-4 py-3.5 text-[14px] text-[#111827] placeholder:text-[#9CA3AF] outline-none focus:border-[#111827] transition-colors"
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
                        className="w-full flex items-center justify-center gap-2 bg-[#111827] text-white text-[14px] font-medium px-6 py-4 rounded-xl hover:bg-[#374151] transition-all duration-300 disabled:opacity-50 mt-2"
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

                    <p className="text-[11px] text-[#9CA3AF] text-center mt-5">
                      By submitting, you agree to our{" "}
                      <Link
                        href="/legal/privacy"
                        className="underline hover:text-[#4B5563] transition-colors"
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

      {/* Numbers strip */}
      <section className="py-16 bg-[#F7F8FA] border-t border-[#E5E7EB]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: "119", label: "EU Space Act Articles" },
              { value: "10+", label: "Jurisdictions" },
              { value: "51", label: "NIS2 Requirements" },
              { value: "7", label: "Operator Types" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div
                  className="font-bold text-[#111827] tracking-[-0.02em]"
                  style={{ fontSize: "clamp(28px, 4vw, 40px)" }}
                >
                  {stat.value}
                </div>
                <div className="font-mono text-[11px] text-[#9CA3AF] uppercase tracking-[0.1em] mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA strip */}
      <section className="py-24 md:py-32 bg-white border-t border-[#E5E7EB]">
        <div className="max-w-[720px] mx-auto px-6 md:px-12 text-center">
          <h2
            className="font-bold leading-[1.1] tracking-[-0.03em] mb-4"
            style={{ fontSize: "clamp(24px, 4vw, 40px)" }}
          >
            <span className="text-[#111827]">Rather explore on your own?</span>
          </h2>
          <p className="text-[15px] text-[#4B5563] leading-relaxed mb-8 max-w-md mx-auto">
            The free assessment takes 5 minutes and gives you a full compliance
            profile — no account required.
          </p>
          <Link
            href="/assessment"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#111827] text-white text-[14px] font-medium hover:bg-[#374151] transition-all"
          >
            Start Free Assessment
            <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </div>
  );
}
