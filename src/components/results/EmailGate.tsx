"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, FileDown, Mail, Building, User } from "lucide-react";
import Button from "@/components/ui/Button";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate a brief delay for UX
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
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-navy-900 border border-navy-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
              {/* Header */}
              <div className="relative px-6 pt-6 pb-4">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-navy-800"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
                  <FileDown className="w-7 h-7 text-blue-400" />
                </div>

                <h2 className="text-xl font-semibold text-white mb-2">
                  Get Your Compliance Report
                </h2>
                <p className="text-slate-400 text-sm">
                  Enter your email to download your personalized EU Space Act
                  compliance report.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="px-6 pb-6">
                {/* Email (required) */}
                <div className="mb-4">
                  <label className="block text-sm text-slate-400 mb-2">
                    Email <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full pl-11 pr-4 py-3 bg-navy-800 border border-navy-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Company (optional) */}
                <div className="mb-4">
                  <label className="block text-sm text-slate-400 mb-2">
                    Company <span className="text-slate-600">(optional)</span>
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="Your organization"
                      className="w-full pl-11 pr-4 py-3 bg-navy-800 border border-navy-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Role (optional) */}
                <div className="mb-6">
                  <label className="block text-sm text-slate-400 mb-2">
                    Role <span className="text-slate-600">(optional)</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      type="text"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      placeholder="Your role"
                      className="w-full pl-11 pr-4 py-3 bg-navy-800 border border-navy-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
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
                    <div className="w-5 h-5 rounded border-2 border-navy-600 bg-navy-800 peer-checked:bg-blue-500 peer-checked:border-blue-500 transition-colors" />
                    <svg
                      className={`absolute inset-0 w-5 h-5 text-white transition-opacity ${
                        subscribe ? "opacity-100" : "opacity-0"
                      }`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <span className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                    Notify me when Caelex launches (we&apos;ll never spam you)
                  </span>
                </label>

                {/* Submit */}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting || !email}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileDown className="w-4 h-4 mr-2" />
                      Download Report
                    </>
                  )}
                </Button>

                {/* Privacy note */}
                <p className="text-xs text-slate-600 text-center mt-4">
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
