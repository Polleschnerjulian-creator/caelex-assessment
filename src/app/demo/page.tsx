"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import {
  ArrowRight,
  CheckCircle,
  Loader2,
  Clock,
  Shield,
  Calendar,
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
    <div className="min-h-screen bg-white">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://www.caelex.eu" },
          { name: "Request a Demo", url: "https://www.caelex.eu/demo" },
        ]}
      />
      {/* Hero */}
      <section className="pt-44 pb-10 px-6 md:px-12">
        <div className="max-w-[1400px] mx-auto">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="text-micro uppercase tracking-[0.2em] text-[#86868b] mb-6"
          >
            Book a Demo
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-[clamp(2rem,5vw,3.5rem)] font-semibold tracking-[-0.03em] text-[#1d1d1f] max-w-3xl leading-[1.1]"
          >
            See the platform before you commit.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-heading md:text-display-sm text-[#6e6e73] mt-6 max-w-2xl leading-relaxed font-normal"
          >
            15 minutes. Tailored to your operator type, jurisdiction, and
            mission profile.
          </motion.p>
        </div>
      </section>

      {/* Separator */}
      <div className="max-w-[1400px] mx-auto px-6 md:px-12">
        <div className="w-full h-px bg-[#d2d2d7]" />
      </div>

      {/* Form + Content Grid */}
      <section className="py-20 md:py-28 px-6 md:px-12">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24">
            {/* Left: What you'll see */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <p className="text-micro uppercase tracking-[0.2em] text-[#86868b] mb-10">
                What you&apos;ll see
              </p>

              <div className="space-y-10">
                {[
                  {
                    number: "01",
                    title: "Your compliance profile",
                    description:
                      "Live walkthrough of the assessment and dashboard tailored to your operator type and mission parameters.",
                  },
                  {
                    number: "02",
                    title: "Jurisdiction comparison",
                    description:
                      "Side-by-side analysis of licensing requirements across 10 European space law jurisdictions.",
                  },
                  {
                    number: "03",
                    title: "Regulatory mapping",
                    description:
                      "How 119 EU Space Act articles and 51 NIS2 requirements map to your specific operations.",
                  },
                  {
                    number: "04",
                    title: "Fleet-level tracking",
                    description:
                      "Per-satellite compliance state, deadline tracking, document generation, and audit trail.",
                  },
                ].map((item, i) => (
                  <motion.div
                    key={item.number}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + i * 0.1, duration: 0.5 }}
                    className="flex gap-6"
                  >
                    <span className="text-body-lg text-[#d2d2d7] font-medium tabular-nums flex-shrink-0 mt-0.5">
                      {item.number}
                    </span>
                    <div>
                      <h3 className="text-title font-semibold text-[#1d1d1f] mb-1.5">
                        {item.title}
                      </h3>
                      <p className="text-body-lg text-[#6e6e73] leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Trust signals */}
              <div className="flex items-center gap-6 mt-14 pt-10 border-t border-[#d2d2d7]">
                {[
                  { icon: Clock, label: "15 minutes" },
                  { icon: Shield, label: "No commitment" },
                  { icon: Calendar, label: "Response within 24h" },
                ].map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="flex items-center gap-2 text-body text-[#86868b]"
                  >
                    <Icon size={14} />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Right: Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="lg:sticky lg:top-32 self-start"
            >
              <div className="bg-[#FAFAFA] rounded-2xl p-8 md:p-10 border border-[#E5E7EB]">
                {submitted ? (
                  <div className="text-center py-8">
                    <div className="w-14 h-14 rounded-full bg-[#1d1d1f] flex items-center justify-center mx-auto mb-6">
                      <CheckCircle size={24} className="text-white" />
                    </div>
                    <h3 className="text-display-sm font-semibold text-[#1d1d1f] mb-2">
                      You&apos;re on the list.
                    </h3>
                    <p className="text-body-lg text-[#6e6e73] mb-8 max-w-sm mx-auto">
                      We&apos;ll reach out within 24 hours to schedule your
                      personalized walkthrough.
                    </p>
                    <Link
                      href="/assessment"
                      className="inline-flex items-center gap-2 bg-[#1d1d1f] text-white text-body-lg font-medium px-7 py-3.5 rounded-full hover:bg-[#424245] transition-colors"
                    >
                      Try Free Assessment
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="mb-8">
                      <h2 className="text-heading font-semibold text-[#1d1d1f] mb-1">
                        Request a demo
                      </h2>
                      <p className="text-body-lg text-[#86868b]">
                        Free &middot; 15 minutes &middot; No credit card
                      </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div>
                        <label
                          htmlFor="demo-name"
                          className="block text-micro font-medium text-[#6e6e73] uppercase tracking-[0.1em] mb-2"
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
                          className="w-full bg-white rounded-xl px-4 py-3.5 text-body-lg text-[#1d1d1f] placeholder:text-[#d2d2d7] border border-[#E5E7EB] outline-none transition-colors duration-200 focus:border-[#1d1d1f]"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="demo-email"
                          className="block text-micro font-medium text-[#6e6e73] uppercase tracking-[0.1em] mb-2"
                        >
                          Work Email
                        </label>
                        <input
                          type="email"
                          id="demo-email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@company.com"
                          required
                          autoComplete="email"
                          className="w-full bg-white rounded-xl px-4 py-3.5 text-body-lg text-[#1d1d1f] placeholder:text-[#d2d2d7] border border-[#E5E7EB] outline-none transition-colors duration-200 focus:border-[#1d1d1f]"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="demo-company"
                          className="block text-micro font-medium text-[#6e6e73] uppercase tracking-[0.1em] mb-2"
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
                          className="w-full bg-white rounded-xl px-4 py-3.5 text-body-lg text-[#1d1d1f] placeholder:text-[#d2d2d7] border border-[#E5E7EB] outline-none transition-colors duration-200 focus:border-[#1d1d1f]"
                        />
                      </div>

                      {error && (
                        <p
                          className="text-body text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3"
                          role="alert"
                        >
                          {error}
                        </p>
                      )}

                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full flex items-center justify-center gap-2 bg-[#1d1d1f] text-white text-body-lg font-medium px-6 py-4 rounded-xl transition-colors duration-200 disabled:opacity-50 mt-2 hover:bg-[#424245]"
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

                    <p className="text-caption text-[#86868b] text-center mt-5">
                      By submitting, you agree to our{" "}
                      <Link
                        href="/legal/privacy"
                        className="underline hover:text-[#1d1d1f] transition-colors"
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

      {/* Bottom CTA */}
      <section className="py-24 md:py-32 px-6 md:px-12 bg-[#FAFAFA]">
        <div className="max-w-[1400px] mx-auto text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-display-sm md:text-display font-semibold tracking-[-0.02em] text-[#1d1d1f] mb-4"
          >
            Rather explore on your own?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-body-lg text-[#6e6e73] mb-10 max-w-md mx-auto"
          >
            The free assessment takes 5 minutes and gives you a full compliance
            profile — no account required.
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Link
              href="/assessment"
              className="inline-flex items-center gap-2 bg-[#1d1d1f] text-white text-body-lg font-medium px-8 py-4 rounded-full hover:bg-[#424245] transition-colors"
            >
              Start Free Assessment
              <ArrowRight size={16} />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
