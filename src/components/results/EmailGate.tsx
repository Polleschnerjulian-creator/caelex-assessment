"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { X, FileDown, Mail, Building, User, Check } from "lucide-react";

interface EmailGateProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    email: string,
    company?: string,
    role?: string,
    subscribe?: boolean,
  ) => void;
  /** Which assessment wizard produced the report (for lead attribution). */
  assessmentType?: "eu-space-act" | "nis2" | "space-law" | "unified";
}

export default function EmailGate({
  isOpen,
  onClose,
  onSubmit,
  assessmentType = "eu-space-act",
}: EmailGateProps) {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  // GDPR Art. 7: newsletter consent must be an active opt-in — unchecked
  // by default.
  const [subscribe, setSubscribe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState("");

  const validateEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    setEmailError(null);
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/assessment/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          company: company || undefined,
          role: role || undefined,
          assessmentType,
          consentNewsletter: subscribe,
          _hp: honeypot || undefined,
        }),
      });

      if (!response.ok) {
        setSubmitError(
          response.status === 429
            ? "Too many requests — please wait a moment and try again."
            : "We couldn't save your details. Please try again.",
        );
        return;
      }

      onSubmit(email, company || undefined, role || undefined, subscribe);
    } catch {
      setSubmitError(
        "We couldn't reach the server. Please check your connection and try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={false}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="email-gate-title"
              className="bg-white dark:bg-dark-bg border border-slate-200 dark:border-white/[0.15] rounded-xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              {/* Header */}
              <div className="relative px-6 pt-6 pb-4">
                <button
                  onClick={onClose}
                  aria-label="Close dialog"
                  className="absolute top-4 right-4 p-2 text-slate-400 dark:text-white/45 hover:text-slate-900 dark:hover:text-white transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.08]"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>

                <div
                  className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-white/[0.08] flex items-center justify-center mb-4"
                  aria-hidden="true"
                >
                  <FileDown className="w-6 h-6 text-slate-600 dark:text-white/70" />
                </div>

                <h2
                  id="email-gate-title"
                  className="text-heading font-light text-slate-900 dark:text-white mb-2"
                >
                  Get Your Compliance Report
                </h2>
                <p className="text-body-lg text-slate-500 dark:text-white/70">
                  Enter your email to download your personalized EU Space Act
                  compliance report.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="px-6 pb-6">
                {/* Email (required) */}
                <div className="mb-4">
                  <label className="block text-micro uppercase tracking-[0.15em] text-slate-500 dark:text-white/45 mb-2">
                    Email{" "}
                    <span className="text-slate-700 dark:text-white/70">*</span>
                  </label>
                  <div className="relative">
                    <Mail
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-white/45"
                      aria-hidden="true"
                    />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (emailError) setEmailError(null);
                      }}
                      placeholder="you@company.com"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.12] rounded-lg text-body-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/40 focus:outline-none focus:border-slate-400 dark:focus:border-white/[0.25] transition-colors"
                    />
                  </div>
                  {emailError && (
                    <p role="alert" className="mt-1.5 text-small text-red-400">
                      {emailError}
                    </p>
                  )}
                </div>

                {/* Company (optional) */}
                <div className="mb-4">
                  <label className="block text-micro uppercase tracking-[0.15em] text-slate-500 dark:text-white/45 mb-2">
                    Company{" "}
                    <span className="text-slate-400 dark:text-white/45">
                      (optional)
                    </span>
                  </label>
                  <div className="relative">
                    <Building
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-white/45"
                      aria-hidden="true"
                    />
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="Your organization"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.12] rounded-lg text-body-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/40 focus:outline-none focus:border-slate-400 dark:focus:border-white/[0.25] transition-colors"
                    />
                  </div>
                </div>

                {/* Role (optional) */}
                <div className="mb-6">
                  <label className="block text-micro uppercase tracking-[0.15em] text-slate-500 dark:text-white/45 mb-2">
                    Role{" "}
                    <span className="text-slate-400 dark:text-white/45">
                      (optional)
                    </span>
                  </label>
                  <div className="relative">
                    <User
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-white/45"
                      aria-hidden="true"
                    />
                    <input
                      type="text"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      placeholder="Your role"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.12] rounded-lg text-body-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/40 focus:outline-none focus:border-slate-400 dark:focus:border-white/[0.25] transition-colors"
                    />
                  </div>
                </div>

                {/* Honeypot — hidden from humans, filled by bots */}
                <input
                  type="text"
                  name="_hp"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: "-9999px",
                    width: "1px",
                    height: "1px",
                    opacity: 0,
                  }}
                />

                {/* Optional newsletter consent — separate from the report
                    delivery email above. Opt-in only (unchecked by default,
                    GDPR Art. 7), confirmed via double opt-in email. */}
                <div className="mb-6 pt-4 border-t border-slate-200 dark:border-white/[0.12]">
                  <span className="block text-micro uppercase tracking-[0.15em] text-slate-500 dark:text-white/45 mb-2">
                    Newsletter{" "}
                    <span className="text-slate-400 dark:text-white/45">
                      (optional)
                    </span>
                  </span>
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative flex-shrink-0 mt-0.5">
                      <input
                        type="checkbox"
                        checked={subscribe}
                        onChange={(e) => setSubscribe(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div
                        className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                          subscribe
                            ? "bg-white border-white"
                            : "border-white/[0.25] bg-transparent"
                        }`}
                      >
                        {subscribe && (
                          <Check
                            size={12}
                            className="text-black"
                            aria-hidden="true"
                          />
                        )}
                      </div>
                    </div>
                    <span className="text-body text-slate-500 dark:text-white/70 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                      Also email me Caelex product updates. We&apos;ll send a
                      confirmation email first — unsubscribe anytime.
                    </span>
                  </label>
                </div>

                {/* Submission error */}
                {submitError && (
                  <p role="alert" className="mb-4 text-small text-red-400">
                    {submitError}
                  </p>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSubmitting || !email}
                  className="w-full inline-flex items-center justify-center gap-2 bg-white text-black text-body font-medium px-6 py-3 rounded-full hover:bg-white/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <div
                        className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"
                        aria-hidden="true"
                      />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <FileDown size={14} aria-hidden="true" />
                      Download Report
                    </>
                  )}
                </button>

                {/* Privacy note — GDPR Art. 13: describes the ACTUAL
                    processing. The report is generated in your browser and
                    downloaded directly — no email is sent to deliver it. The
                    details are stored server-side as a contact record. */}
                <p className="text-caption text-slate-400 dark:text-white/45 text-center mt-4">
                  We store your details to follow up about your assessment.
                  Newsletter emails only if you tick the box above. See our{" "}
                  <Link
                    href="/legal/privacy"
                    className="underline hover:text-slate-600 dark:hover:text-white/70 transition-colors"
                  >
                    Privacy Policy
                  </Link>
                  .
                </p>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
