"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Shield,
  Clock,
  Lock,
  Zap,
} from "lucide-react";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";

// ─── Operator Type Options ───

const OPERATOR_TYPES = [
  { value: "SCO", label: "Satellite / Constellation Operator (SCO)" },
  { value: "LO", label: "Launch Operator (LO)" },
  { value: "LSO", label: "Launch Service Operator (LSO)" },
  { value: "ISOS", label: "In-Orbit Servicing (ISOS)" },
  { value: "CAP", label: "Capacity Provider (CAP)" },
  { value: "PDP", label: "Payload Data Provider (PDP)" },
  { value: "TCO", label: "Tracking & Command Operator (TCO)" },
];

const FUNDING_STAGES = [
  { value: "pre-seed", label: "Pre-Seed" },
  { value: "seed", label: "Seed" },
  { value: "series-a", label: "Series A" },
  { value: "series-b", label: "Series B+" },
  { value: "growth", label: "Growth / Late Stage" },
];

// ═══════════════════════════════════════════
// ─── PAGE ─────────────────────────────────
// ═══════════════════════════════════════════

export default function BookCallPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    companyWebsite: "",
    operatorType: "",
    fundingStage: "",
    isRaising: false,
    targetRaise: "",
    message: "",
    _hp: "",
  });
  const [demoTourCompleted, setDemoTourCompleted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track whether user arrived from the demo tour
  useEffect(() => {
    if (typeof document !== "undefined" && document.referrer) {
      if (document.referrer.includes("/assure/demo")) {
        setDemoTourCompleted(true);
      }
    }
  }, []);

  const updateField = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        name: formData.name,
        email: formData.email,
        company: formData.company,
        companyWebsite: formData.companyWebsite || undefined,
        operatorType: formData.operatorType,
        fundingStage: formData.fundingStage,
        isRaising: formData.isRaising,
        message: formData.message || undefined,
        demoTourCompleted,
        _hp: formData._hp,
      };

      if (formData.isRaising && formData.targetRaise) {
        payload.targetRaise = parseFloat(formData.targetRaise);
      }

      const res = await fetch("/api/assure/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-emerald-500/[0.03] rounded-full blur-[160px]" />
      </div>

      <section className="relative pt-36 pb-28 overflow-hidden">
        <div className="relative max-w-[1400px] mx-auto px-6 md:px-12">
          {/* Back link */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Link
              href="/assure/demo"
              className="inline-flex items-center gap-2 text-small text-white/35 hover:text-white/60 transition-colors mb-8"
            >
              <ArrowLeft size={14} />
              Back to demo
            </Link>
          </motion.div>

          <div className="grid lg:grid-cols-[1fr_420px] gap-16 items-start">
            {/* Left — Form Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="relative">
                {/* Subtle glow behind card */}
                <div className="absolute -inset-1 bg-gradient-to-b from-emerald-500/[0.08] via-transparent to-transparent rounded-3xl blur-2xl pointer-events-none" />

                <div className="relative glass-elevated rounded-2xl border border-white/[0.08] overflow-hidden">
                  <AnimatePresence mode="wait">
                    {submitted ? (
                      <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.96 }}
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
                          You&apos;re on the list!
                        </h2>
                        <p className="text-body-lg text-white/45 leading-relaxed max-w-sm mx-auto mb-4">
                          Thank you,{" "}
                          <span className="text-white/70">{formData.name}</span>
                          . We&apos;ll review your profile and get back to you
                          within 24 hours to schedule your onboarding call.
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
                            href="/assure/demo"
                            className="w-full text-body text-white/35 hover:text-white/60 transition-colors flex items-center justify-center gap-1.5 py-2"
                          >
                            <ArrowLeft size={13} />
                            Back to demo
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
                            Book Your Onboarding Call
                          </h2>
                          <p className="text-body text-white/40">
                            Tell us about your company so we can prepare a
                            tailored session. All fields marked * are required.
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
                              value={formData._hp}
                              onChange={(e) =>
                                updateField("_hp", e.target.value)
                              }
                            />
                          </div>

                          {/* Name + Email row */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div>
                              <label className={labelClasses}>
                                Full Name *
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
                                Work Email *
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

                          {/* Company + Website row */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div>
                              <label className={labelClasses}>
                                Company Name *
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
                              <label className={labelClasses}>
                                Company Website
                              </label>
                              <input
                                type="url"
                                value={formData.companyWebsite}
                                onChange={(e) =>
                                  updateField("companyWebsite", e.target.value)
                                }
                                placeholder="https://company.space"
                                className={inputClasses}
                              />
                            </div>
                          </div>

                          {/* Operator Type + Funding Stage row */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div>
                              <label className={labelClasses}>
                                Operator Type *
                              </label>
                              <div className="relative">
                                <select
                                  value={formData.operatorType}
                                  onChange={(e) =>
                                    updateField("operatorType", e.target.value)
                                  }
                                  required
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
                                Funding Stage *
                              </label>
                              <div className="relative">
                                <select
                                  value={formData.fundingStage}
                                  onChange={(e) =>
                                    updateField("fundingStage", e.target.value)
                                  }
                                  required
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

                          {/* Currently Raising toggle */}
                          <div>
                            <div className="flex items-center justify-between">
                              <label className={labelClasses}>
                                Currently Raising
                              </label>
                              <button
                                type="button"
                                role="switch"
                                aria-checked={formData.isRaising}
                                onClick={() =>
                                  updateField("isRaising", !formData.isRaising)
                                }
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                                  formData.isRaising
                                    ? "bg-emerald-500"
                                    : "bg-white/[0.08]"
                                }`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                                    formData.isRaising
                                      ? "translate-x-6"
                                      : "translate-x-1"
                                  }`}
                                />
                              </button>
                            </div>
                          </div>

                          {/* Target Raise (conditional) */}
                          {formData.isRaising && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <label className={labelClasses}>
                                Target Raise (EUR)
                              </label>
                              <input
                                type="number"
                                value={formData.targetRaise}
                                onChange={(e) =>
                                  updateField("targetRaise", e.target.value)
                                }
                                placeholder="e.g. 5000000"
                                min="0"
                                step="any"
                                className={inputClasses}
                              />
                            </motion.div>
                          )}

                          {/* Message */}
                          <div>
                            <label className={labelClasses}>Message</label>
                            <textarea
                              value={formData.message}
                              onChange={(e) =>
                                updateField("message", e.target.value)
                              }
                              placeholder="Anything you'd like us to prepare for the call?"
                              rows={4}
                              className={`${inputClasses} resize-none`}
                            />
                          </div>

                          {/* Submit */}
                          <button
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-medium text-body py-3.5 rounded-full shadow-[0_0_24px_rgba(16,185,129,0.2)] transition-all"
                          >
                            {submitting ? (
                              <span className="flex items-center justify-center gap-2">
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
                              "Book Your Call"
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
                            . We&apos;ll never share your data with third
                            parties.
                          </p>
                        </form>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>

            {/* Right — Trust Signals */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.7,
                delay: 0.15,
                ease: [0.4, 0, 0.2, 1],
              }}
              className="space-y-6 lg:sticky lg:top-32"
            >
              {/* What happens next */}
              <div className="glass-surface rounded-2xl border border-white/[0.08] p-6">
                <h3 className="text-title font-semibold text-white mb-5">
                  What happens next
                </h3>
                <div className="space-y-4">
                  {[
                    {
                      step: 1,
                      text: "We review your profile within 24 hours",
                    },
                    {
                      step: 2,
                      text: "We schedule a 30-minute onboarding call",
                    },
                    {
                      step: 3,
                      text: "We configure Assure for your operator type",
                    },
                    {
                      step: 4,
                      text: "You get full access and start your IRS journey",
                    },
                  ].map((item) => (
                    <div key={item.step} className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-small font-semibold text-emerald-400">
                          {item.step}
                        </span>
                      </div>
                      <p className="text-body-lg text-white/50 leading-relaxed">
                        {item.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Your data is safe */}
              <div className="glass-surface rounded-2xl border border-white/[0.08] p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                    <Shield size={16} className="text-emerald-400/80" />
                  </div>
                  <h3 className="text-title font-semibold text-white">
                    Your data is safe
                  </h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2.5">
                    <Lock size={13} className="text-white/30 flex-shrink-0" />
                    <span className="text-body text-white/40">
                      AES-256 encryption at rest
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Shield size={13} className="text-white/30 flex-shrink-0" />
                    <span className="text-body text-white/40">
                      GDPR compliant data processing
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Lock size={13} className="text-white/30 flex-shrink-0" />
                    <span className="text-body text-white/40">
                      No data shared with third parties
                    </span>
                  </div>
                </div>
              </div>

              {/* 30 min setup */}
              <div className="glass-surface rounded-2xl border border-white/[0.08] p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                    <Zap size={16} className="text-emerald-400/80" />
                  </div>
                  <h3 className="text-title font-semibold text-white">
                    30 min setup
                  </h3>
                </div>
                <p className="text-body text-white/40 leading-relaxed">
                  From call to fully operational. We handle the heavy lifting so
                  you can focus on your mission, not paperwork.
                </p>
              </div>

              {/* Quick stats */}
              <div className="glass-surface rounded-2xl border border-white/[0.08] p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                    <Clock size={16} className="text-emerald-400/80" />
                  </div>
                  <h3 className="text-title font-semibold text-white">
                    Response within 24h
                  </h3>
                </div>
                <p className="text-body text-white/40 leading-relaxed">
                  We work with a select number of space companies each quarter
                  to ensure personalized onboarding and attention.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
