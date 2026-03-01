"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Shield,
  Clock,
  Users,
  Lock,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";

// ─── Operator Type Options ───

const OPERATOR_TYPES = [
  { value: "satellite", label: "Satellite Operator" },
  { value: "launch", label: "Launch Service Provider" },
  { value: "ground", label: "Ground Segment Operator" },
  { value: "inorbit", label: "In-Orbit Servicing" },
  { value: "data", label: "Space Data Provider" },
  { value: "manufacturing", label: "Spacecraft Manufacturing" },
  { value: "other", label: "Other" },
];

const FUNDING_STAGES = [
  { value: "pre-seed", label: "Pre-Seed" },
  { value: "seed", label: "Seed" },
  { value: "series-a", label: "Series A" },
  { value: "series-b", label: "Series B+" },
  { value: "growth", label: "Growth / Late Stage" },
  { value: "not-raising", label: "Not currently raising" },
];

// ═══════════════════════════════════════════
// ─── PAGE ─────────────────────────────────
// ═══════════════════════════════════════════

export default function RequestAccessPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    role: "",
    fundingStage: "",
    operatorType: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/assure/request-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
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

  const inputClasses =
    "w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-5 py-3.5 text-body-lg text-white placeholder:text-white/25 outline-none focus:border-emerald-500/40 focus:bg-white/[0.06] focus:ring-2 focus:ring-emerald-500/10 transition-all duration-200";
  const labelClasses = "block text-body font-medium text-white/60 mb-2";
  const selectClasses =
    "w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-5 py-3.5 text-body-lg text-white outline-none focus:border-emerald-500/40 focus:bg-white/[0.06] focus:ring-2 focus:ring-emerald-500/10 transition-all duration-200 appearance-none cursor-pointer";

  return (
    <div className="min-h-screen bg-black">
      <Navigation />

      <section className="relative pt-36 pb-28 overflow-hidden">
        {/* Ambient glows */}
        <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-emerald-500/[0.03] rounded-full blur-[160px] pointer-events-none" />
        <div className="absolute bottom-0 right-[-200px] w-[400px] h-[400px] bg-blue-500/[0.02] rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="grid lg:grid-cols-[1fr_520px] gap-16 items-start">
            {/* Left — Copy */}
            <motion.div
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
              className="lg:sticky lg:top-32"
            >
              <Link
                href="/assure"
                className="inline-flex items-center gap-2 text-small text-white/35 hover:text-white/60 transition-colors mb-8"
              >
                <ArrowLeft size={14} />
                Back to Assure
              </Link>

              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-8">
                <Sparkles size={14} className="text-emerald-400" />
                <span className="text-small font-medium text-emerald-400 tracking-wide">
                  Early Access
                </span>
              </div>

              <h1 className="text-[42px] md:text-[52px] font-bold text-white leading-[1.08] tracking-[-0.035em] mb-6">
                Request access to
                <br />
                <span className="bg-gradient-to-r from-emerald-400 to-emerald-300 bg-clip-text text-transparent">
                  Caelex Assure
                </span>
              </h1>

              <p className="text-body-lg md:text-subtitle text-white/45 leading-relaxed max-w-[480px] mb-10">
                We work with a select number of space companies each quarter to
                ensure personalized onboarding. Tell us about your company and
                we'll get back to you within 24 hours.
              </p>

              {/* Trust indicators */}
              <div className="space-y-4 mb-12">
                {[
                  {
                    icon: Clock,
                    text: "Response within 24 hours",
                  },
                  {
                    icon: Users,
                    text: "Personalized onboarding call",
                  },
                  {
                    icon: Shield,
                    text: "Included with any Caelex plan",
                  },
                  {
                    icon: Lock,
                    text: "Your data stays confidential",
                  },
                ].map((item) => (
                  <div
                    key={item.text}
                    className="flex items-center gap-3 text-body-lg text-white/50"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                      <item.icon size={14} className="text-emerald-400/80" />
                    </div>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>

              {/* Quote */}
              <div className="hidden lg:block glass-surface rounded-xl border border-white/[0.06] p-6">
                <p className="text-body-lg text-white/50 italic leading-relaxed mb-4">
                  "Assure transformed how we present to investors. Our IRS score
                  and verified compliance data gave VCs the confidence they
                  needed to move fast."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center">
                    <span className="text-small font-semibold text-emerald-400">
                      M
                    </span>
                  </div>
                  <div>
                    <div className="text-body font-medium text-white/70">
                      Head of Strategy
                    </div>
                    <div className="text-small text-white/35">
                      European LEO Satellite Operator
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right — Form */}
            <motion.div
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.7,
                delay: 0.15,
                ease: [0.4, 0, 0.2, 1],
              }}
            >
              <div className="relative">
                {/* Subtle glow behind card */}
                <div className="absolute -inset-1 bg-gradient-to-b from-emerald-500/[0.08] via-transparent to-transparent rounded-3xl blur-2xl pointer-events-none" />

                <div className="relative glass-elevated rounded-2xl border border-white/[0.08] overflow-hidden">
                  <AnimatePresence mode="wait">
                    {submitted ? (
                      <motion.div
                        key="success"
                        initial={false}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="p-10 md:p-12 text-center"
                      >
                        <div className="w-20 h-20 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center mx-auto mb-8">
                          <CheckCircle2
                            size={36}
                            className="text-emerald-400"
                          />
                        </div>
                        <h2 className="text-display-sm font-bold text-white tracking-[-0.02em] mb-4">
                          Request received
                        </h2>
                        <p className="text-body-lg text-white/45 leading-relaxed max-w-sm mx-auto mb-4">
                          Thank you,{" "}
                          <span className="text-white/70">{formData.name}</span>
                          . We'll review your application and get back to you
                          within 24 hours.
                        </p>
                        <p className="text-body text-white/30 mb-10">
                          A confirmation has been sent to{" "}
                          <span className="text-white/50">
                            {formData.email}
                          </span>
                        </p>

                        <div className="space-y-3">
                          <Link
                            href="/assessment"
                            className="group w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-body-lg px-6 py-3.5 rounded-full transition-all flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(16,185,129,0.2)]"
                          >
                            Run Free Compliance Assessment
                            <ArrowRight
                              size={16}
                              className="group-hover:translate-x-0.5 transition-transform"
                            />
                          </Link>
                          <Link
                            href="/assure"
                            className="w-full text-body text-white/35 hover:text-white/60 transition-colors flex items-center justify-center gap-1.5 py-2"
                          >
                            <ArrowLeft size={13} />
                            Back to Assure
                          </Link>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="form"
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.3 }}
                      >
                        {/* Form Header */}
                        <div className="p-8 pb-0 md:p-10 md:pb-0">
                          <h2 className="text-heading font-bold text-white mb-1">
                            Request Access
                          </h2>
                          <p className="text-body text-white/40">
                            Tell us about your company. All fields marked * are
                            required.
                          </p>
                        </div>

                        {/* Form */}
                        <form
                          onSubmit={handleSubmit}
                          className="p-8 pt-6 md:p-10 md:pt-6 space-y-5"
                        >
                          {/* Honeypot */}
                          <div className="hidden" aria-hidden="true">
                            <input
                              type="text"
                              name="_hp"
                              tabIndex={-1}
                              autoComplete="off"
                            />
                          </div>

                          {/* Name + Email row */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div>
                              <label className={labelClasses}>
                                Full name *
                              </label>
                              <input
                                type="text"
                                value={formData.name}
                                onChange={(e) =>
                                  updateField("name", e.target.value)
                                }
                                placeholder="Jane Smith"
                                required
                                className={inputClasses}
                              />
                            </div>
                            <div>
                              <label className={labelClasses}>
                                Work email *
                              </label>
                              <input
                                type="email"
                                value={formData.email}
                                onChange={(e) =>
                                  updateField("email", e.target.value)
                                }
                                placeholder="jane@company.space"
                                required
                                className={inputClasses}
                              />
                            </div>
                          </div>

                          {/* Company + Role row */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div>
                              <label className={labelClasses}>
                                Company name *
                              </label>
                              <input
                                type="text"
                                value={formData.company}
                                onChange={(e) =>
                                  updateField("company", e.target.value)
                                }
                                placeholder="Orbital Dynamics GmbH"
                                required
                                className={inputClasses}
                              />
                            </div>
                            <div>
                              <label className={labelClasses}>Your role</label>
                              <input
                                type="text"
                                value={formData.role}
                                onChange={(e) =>
                                  updateField("role", e.target.value)
                                }
                                placeholder="CEO, CFO, Head of Strategy..."
                                className={inputClasses}
                              />
                            </div>
                          </div>

                          {/* Operator Type + Funding Stage row */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div>
                              <label className={labelClasses}>
                                Operator type
                              </label>
                              <div className="relative">
                                <select
                                  value={formData.operatorType}
                                  onChange={(e) =>
                                    updateField("operatorType", e.target.value)
                                  }
                                  className={`${selectClasses} ${!formData.operatorType ? "text-white/25" : ""}`}
                                >
                                  <option value="" disabled>
                                    Select type...
                                  </option>
                                  {OPERATOR_TYPES.map((type) => (
                                    <option
                                      key={type.value}
                                      value={type.value}
                                      className="bg-[#1a1a1a] text-white"
                                    >
                                      {type.label}
                                    </option>
                                  ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                  <svg
                                    width="12"
                                    height="12"
                                    viewBox="0 0 12 12"
                                    fill="none"
                                    className="text-white/30"
                                  >
                                    <path
                                      d="M3 4.5L6 7.5L9 4.5"
                                      stroke="currentColor"
                                      strokeWidth="1.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                </div>
                              </div>
                            </div>
                            <div>
                              <label className={labelClasses}>
                                Funding stage
                              </label>
                              <div className="relative">
                                <select
                                  value={formData.fundingStage}
                                  onChange={(e) =>
                                    updateField("fundingStage", e.target.value)
                                  }
                                  className={`${selectClasses} ${!formData.fundingStage ? "text-white/25" : ""}`}
                                >
                                  <option value="" disabled>
                                    Select stage...
                                  </option>
                                  {FUNDING_STAGES.map((stage) => (
                                    <option
                                      key={stage.value}
                                      value={stage.value}
                                      className="bg-[#1a1a1a] text-white"
                                    >
                                      {stage.label}
                                    </option>
                                  ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                  <svg
                                    width="12"
                                    height="12"
                                    viewBox="0 0 12 12"
                                    fill="none"
                                    className="text-white/30"
                                  >
                                    <path
                                      d="M3 4.5L6 7.5L9 4.5"
                                      stroke="currentColor"
                                      strokeWidth="1.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Message */}
                          <div>
                            <label className={labelClasses}>
                              Tell us about your fundraising goals
                            </label>
                            <textarea
                              value={formData.message}
                              onChange={(e) =>
                                updateField("message", e.target.value)
                              }
                              placeholder="What are you building? What stage are you at? How can Assure help you?"
                              rows={4}
                              className={`${inputClasses} resize-none`}
                            />
                          </div>

                          {/* Submit */}
                          <button
                            type="submit"
                            disabled={submitting}
                            className="group w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-body-lg px-6 py-4 rounded-full transition-all shadow-[0_0_24px_rgba(16,185,129,0.2)] hover:shadow-[0_0_40px_rgba(16,185,129,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            {submitting ? (
                              <span className="flex items-center gap-2">
                                <svg
                                  className="animate-spin h-4 w-4"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                >
                                  <circle
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    className="opacity-25"
                                  />
                                  <path
                                    d="M4 12a8 8 0 018-8"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    className="opacity-75"
                                  />
                                </svg>
                                Submitting...
                              </span>
                            ) : (
                              <>
                                Request Access
                                <ArrowRight
                                  size={16}
                                  className="group-hover:translate-x-0.5 transition-transform"
                                />
                              </>
                            )}
                          </button>

                          {error && (
                            <p
                              className="text-small text-red-400 text-center"
                              role="alert"
                            >
                              {error}
                            </p>
                          )}

                          <p className="text-caption text-white/25 text-center">
                            By submitting, you agree to our{" "}
                            <Link
                              href="/legal/privacy"
                              className="underline hover:text-white/50 transition-colors"
                            >
                              Privacy Policy
                            </Link>
                            . We'll never share your data with third parties.
                          </p>
                        </form>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
