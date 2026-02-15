"use client";

import { useState } from "react";
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
}

export default function EmailGate({
  isOpen,
  onClose,
  onSubmit,
}: EmailGateProps) {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [subscribe, setSubscribe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

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
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    onSubmit(email, company || undefined, role || undefined, subscribe);
    setIsSubmitting(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="email-gate-title"
              className="bg-[#0a0a0a] border border-white/[0.15] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              {/* Header */}
              <div className="relative px-6 pt-6 pb-4">
                <button
                  onClick={onClose}
                  aria-label="Close dialog"
                  className="absolute top-4 right-4 p-2 text-white/50 hover:text-white transition-colors rounded-lg hover:bg-white/[0.08]"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>

                <div
                  className="w-12 h-12 rounded-xl bg-white/[0.08] flex items-center justify-center mb-4"
                  aria-hidden="true"
                >
                  <FileDown className="w-6 h-6 text-white/80" />
                </div>

                <h2
                  id="email-gate-title"
                  className="text-[18px] font-light text-white mb-2"
                >
                  Get Your Compliance Report
                </h2>
                <p className="text-[14px] text-white/70">
                  Enter your email to download your personalized EU Space Act
                  compliance report.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="px-6 pb-6">
                {/* Email (required) */}
                <div className="mb-4">
                  <label className="block font-mono text-[10px] uppercase tracking-[0.15em] text-white/50 mb-2">
                    Email <span className="text-white/70">*</span>
                  </label>
                  <div className="relative">
                    <Mail
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40"
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
                      className="w-full pl-10 pr-4 py-3 bg-white/[0.04] border border-white/[0.12] rounded-lg text-[14px] text-white placeholder-white/40 focus:outline-none focus:border-white/[0.25] transition-colors"
                    />
                  </div>
                  {emailError && (
                    <p role="alert" className="mt-1.5 text-[12px] text-red-400">
                      {emailError}
                    </p>
                  )}
                </div>

                {/* Company (optional) */}
                <div className="mb-4">
                  <label className="block font-mono text-[10px] uppercase tracking-[0.15em] text-white/50 mb-2">
                    Company <span className="text-white/40">(optional)</span>
                  </label>
                  <div className="relative">
                    <Building
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40"
                      aria-hidden="true"
                    />
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="Your organization"
                      className="w-full pl-10 pr-4 py-3 bg-white/[0.04] border border-white/[0.12] rounded-lg text-[14px] text-white placeholder-white/40 focus:outline-none focus:border-white/[0.25] transition-colors"
                    />
                  </div>
                </div>

                {/* Role (optional) */}
                <div className="mb-6">
                  <label className="block font-mono text-[10px] uppercase tracking-[0.15em] text-white/50 mb-2">
                    Role <span className="text-white/40">(optional)</span>
                  </label>
                  <div className="relative">
                    <User
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40"
                      aria-hidden="true"
                    />
                    <input
                      type="text"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      placeholder="Your role"
                      className="w-full pl-10 pr-4 py-3 bg-white/[0.04] border border-white/[0.12] rounded-lg text-[14px] text-white placeholder-white/40 focus:outline-none focus:border-white/[0.25] transition-colors"
                    />
                  </div>
                </div>

                {/* Subscribe checkbox */}
                <label className="flex items-start gap-3 mb-6 cursor-pointer group">
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
                  <span className="text-[13px] text-white/70 group-hover:text-white transition-colors">
                    Notify me when Caelex launches (we&apos;ll never spam you)
                  </span>
                </label>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSubmitting || !email}
                  className="w-full inline-flex items-center justify-center gap-2 bg-white text-black text-[13px] font-medium px-6 py-3 rounded-full hover:bg-white/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <div
                        className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"
                        aria-hidden="true"
                      />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileDown size={14} aria-hidden="true" />
                      Download Report
                    </>
                  )}
                </button>

                {/* Privacy note */}
                <p className="text-[11px] text-white/50 text-center mt-4">
                  We respect your privacy. Your data is not stored or shared.
                </p>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
