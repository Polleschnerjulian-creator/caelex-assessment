"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ArrowLeft } from "lucide-react";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";
import CalendarPicker from "@/components/assure/booking/CalendarPicker";
import type { Slot } from "@/components/assure/booking/CalendarPicker";

// ─── Interest Options ───

const INTERESTS = [
  "EU Space Act Compliance",
  "NIS2 Cybersecurity",
  "Space Debris Mitigation",
  "Regulatory Licensing",
  "Full Platform Demo",
  "Investment Due Diligence",
] as const;

// ─── Animation Variants ───

const stepVariants = {
  enter: { x: 60, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: -60, opacity: 0 },
};

const springTransition = {
  type: "spring" as const,
  stiffness: 300,
  damping: 30,
  mass: 0.8,
};

// ═══════════════════════════════════════════
// ─── PAGE ─────────────────────────────────
// ═══════════════════════════════════════════

export default function GetStartedPage() {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    _hp: "",
  });
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [showMessage, setShowMessage] = useState(false);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest],
    );
  };

  const canProceedStep0 = formData.name.trim() && formData.email.trim();
  const canProceedStep1 = selectedInterests.length > 0;

  const handleNext = () => {
    if (step < 2) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSubmit = async (withBooking: boolean) => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    const interestsText = selectedInterests.join(", ");
    const fullMessage = message
      ? `Interests: ${interestsText}\n\n${message}`
      : `Interests: ${interestsText}`;

    try {
      if (withBooking && selectedSlot) {
        // POST to /api/assure/book
        const payload = {
          name: formData.name,
          email: formData.email,
          company: formData.company || "Not specified",
          operatorType: "inquiry",
          fundingStage: "unknown",
          isRaising: false,
          message: fullMessage,
          scheduledAt: selectedSlot.dateTime,
          _hp: formData._hp,
        };

        const res = await fetch("/api/assure/book", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (res.status === 409) {
            setError("This slot was just booked. Please select another time.");
            setSelectedSlot(null);
            setSubmitting(false);
            return;
          }
          setError(data.error || "Something went wrong. Please try again.");
          setSubmitting(false);
          return;
        }
      } else {
        // POST to /api/demo
        const payload = {
          name: formData.name,
          email: formData.email,
          company: formData.company || undefined,
          message: fullMessage,
          _hp: formData._hp,
        };

        const res = await fetch("/api/demo", {
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
      }

      setSubmitted(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClasses =
    "w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3.5 text-white placeholder:text-white/30 outline-none focus:border-emerald-500/40 focus:bg-white/[0.06] focus:ring-2 focus:ring-emerald-500/10 transition-all duration-200";
  const labelClasses = "block text-body font-medium text-white/60 mb-2";

  return (
    <div className="min-h-screen bg-[#0A0F1E]">
      <Navigation />

      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-120px] left-1/2 -translate-x-1/2 w-[900px] h-[700px] bg-emerald-500/[0.03] rounded-full blur-[180px]" />
        <div className="absolute bottom-[-200px] right-[-100px] w-[600px] h-[600px] bg-emerald-500/[0.02] rounded-full blur-[160px]" />
      </div>

      <section className="relative pt-36 pb-28 overflow-hidden">
        <div className="relative max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="grid lg:grid-cols-[1fr_400px] gap-12 lg:gap-16 items-start">
            {/* Left — Form Area */}
            <div>
              {/* Step Indicator */}
              {!submitted && (
                <motion.div
                  className="flex items-center gap-3 mb-10"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          if (i < step) setStep(i);
                        }}
                        disabled={i > step}
                        className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${
                          i === step
                            ? "bg-emerald-400 scale-125 shadow-[0_0_12px_rgba(52,211,153,0.4)]"
                            : i < step
                              ? "bg-emerald-500/60 cursor-pointer hover:bg-emerald-400/80"
                              : "bg-white/[0.12]"
                        }`}
                        aria-label={`Step ${i + 1}`}
                      />
                      {i < 2 && (
                        <div
                          className={`w-12 h-px transition-all duration-500 ${
                            i < step ? "bg-emerald-500/40" : "bg-white/[0.06]"
                          }`}
                        />
                      )}
                    </div>
                  ))}
                  <span className="text-caption text-white/30 ml-3">
                    Step {step + 1} of 3
                  </span>
                </motion.div>
              )}

              {/* Glass Card */}
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-b from-emerald-500/[0.06] via-transparent to-transparent rounded-3xl blur-2xl pointer-events-none" />

                <div className="relative bg-white/[0.03] backdrop-blur-md border border-white/[0.06] rounded-2xl overflow-hidden">
                  <AnimatePresence mode="wait">
                    {submitted ? (
                      /* ─── Success State ─── */
                      <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="p-10 md:p-14 text-center"
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{
                            type: "spring",
                            stiffness: 200,
                            damping: 15,
                            delay: 0.2,
                          }}
                          className="w-20 h-20 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center mx-auto mb-8"
                        >
                          <CheckCircle2
                            size={36}
                            className="text-emerald-400"
                          />
                        </motion.div>

                        <h2 className="text-display-sm font-bold text-white tracking-[-0.02em] mb-4">
                          {selectedSlot
                            ? "Call Confirmed"
                            : "We've got your details"}
                        </h2>

                        <p className="text-body-lg text-white/45 leading-relaxed max-w-md mx-auto mb-4">
                          Thank you,{" "}
                          <span className="text-white/70">{formData.name}</span>
                          .{" "}
                          {selectedSlot ? (
                            <>
                              Your call is scheduled for{" "}
                              <span className="text-emerald-400 font-medium">
                                {selectedSlot.date} at {selectedSlot.time} CET
                              </span>
                              . We&apos;ll send you a calendar invite by email.
                            </>
                          ) : (
                            <>
                              We&apos;ll be in touch within 24 hours to discuss
                              your needs.
                            </>
                          )}
                        </p>

                        <p className="text-body text-white/30 mb-10">
                          A confirmation has been sent to{" "}
                          <span className="text-white/50">
                            {formData.email}
                          </span>
                        </p>

                        <div className="space-y-3 max-w-xs mx-auto">
                          <Link
                            href="/assessment"
                            className="group w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-body-lg px-6 py-3.5 rounded-full transition-all flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(16,185,129,0.2)]"
                          >
                            Explore our free assessment
                            <ArrowRight
                              size={16}
                              className="group-hover:translate-x-0.5 transition-transform"
                            />
                          </Link>
                          <Link
                            href="/"
                            className="w-full text-body text-white/35 hover:text-white/60 transition-colors flex items-center justify-center gap-1.5 py-2"
                          >
                            <ArrowLeft size={13} />
                            Back to homepage
                          </Link>
                        </div>
                      </motion.div>
                    ) : step === 0 ? (
                      /* ─── Step 1: About You ─── */
                      <motion.div
                        key="step-0"
                        variants={stepVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={springTransition}
                      >
                        <div className="p-8 pb-0 md:p-10 md:pb-0">
                          <h2 className="text-heading font-bold text-white mb-1">
                            Tell us about you
                          </h2>
                          <p className="text-body text-white/40">
                            We&apos;ll use this to tailor our conversation.
                          </p>
                        </div>

                        <div className="p-8 pt-6 md:p-10 md:pt-6 space-y-5">
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

                          <div>
                            <label className={labelClasses}>Full Name *</label>
                            <input
                              type="text"
                              value={formData.name}
                              onChange={(e) =>
                                updateField("name", e.target.value)
                              }
                              placeholder="Jane Smith"
                              required
                              className={inputClasses}
                              autoFocus
                            />
                          </div>

                          <div>
                            <label className={labelClasses}>Work Email *</label>
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

                          <div>
                            <label className={labelClasses}>
                              Company{" "}
                              <span className="text-white/25">(optional)</span>
                            </label>
                            <input
                              type="text"
                              value={formData.company}
                              onChange={(e) =>
                                updateField("company", e.target.value)
                              }
                              placeholder="Orbital Dynamics GmbH"
                              className={inputClasses}
                            />
                          </div>

                          <button
                            onClick={handleNext}
                            disabled={!canProceedStep0}
                            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 disabled:hover:bg-emerald-500 text-white font-medium text-body py-3.5 rounded-full shadow-[0_0_24px_rgba(16,185,129,0.15)] transition-all flex items-center justify-center gap-2"
                          >
                            Continue
                            <ArrowRight size={15} />
                          </button>
                        </div>
                      </motion.div>
                    ) : step === 1 ? (
                      /* ─── Step 2: Interests ─── */
                      <motion.div
                        key="step-1"
                        variants={stepVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={springTransition}
                      >
                        <div className="p-8 pb-0 md:p-10 md:pb-0">
                          <button
                            onClick={handleBack}
                            className="inline-flex items-center gap-1.5 text-small text-white/30 hover:text-white/60 transition-colors mb-5"
                          >
                            <ArrowLeft size={13} />
                            Back
                          </button>
                          <h2 className="text-heading font-bold text-white mb-1">
                            What are you interested in?
                          </h2>
                          <p className="text-body text-white/40">
                            Select all that apply. This helps us prepare for
                            your conversation.
                          </p>
                        </div>

                        <div className="p-8 pt-6 md:p-10 md:pt-6 space-y-6">
                          <div className="flex flex-wrap gap-2.5">
                            {INTERESTS.map((interest) => {
                              const isSelected =
                                selectedInterests.includes(interest);
                              return (
                                <motion.button
                                  key={interest}
                                  type="button"
                                  onClick={() => toggleInterest(interest)}
                                  whileHover={{ scale: 1.03 }}
                                  whileTap={{ scale: 0.97 }}
                                  className={`px-4 py-2.5 rounded-full text-body font-medium transition-all duration-200 border ${
                                    isSelected
                                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.1)]"
                                      : "bg-white/[0.03] border-white/[0.08] text-white/60 hover:bg-white/[0.06] hover:border-white/[0.12] hover:text-white/80"
                                  }`}
                                >
                                  {isSelected && (
                                    <span className="mr-1.5">&#10003;</span>
                                  )}
                                  {interest}
                                </motion.button>
                              );
                            })}
                          </div>

                          <button
                            onClick={handleNext}
                            disabled={!canProceedStep1}
                            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 disabled:hover:bg-emerald-500 text-white font-medium text-body py-3.5 rounded-full shadow-[0_0_24px_rgba(16,185,129,0.15)] transition-all flex items-center justify-center gap-2"
                          >
                            Continue
                            <ArrowRight size={15} />
                          </button>
                        </div>
                      </motion.div>
                    ) : (
                      /* ─── Step 3: Book a Call ─── */
                      <motion.div
                        key="step-2"
                        variants={stepVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={springTransition}
                      >
                        <div className="p-8 pb-0 md:p-10 md:pb-0">
                          <button
                            onClick={handleBack}
                            className="inline-flex items-center gap-1.5 text-small text-white/30 hover:text-white/60 transition-colors mb-5"
                          >
                            <ArrowLeft size={13} />
                            Back
                          </button>
                          <h2 className="text-heading font-bold text-white mb-1">
                            Book a call
                          </h2>
                          <p className="text-body text-white/40">
                            Pick a time that works for you, or send us a message
                            instead.
                          </p>
                        </div>

                        <div className="p-8 pt-6 md:p-10 md:pt-6 space-y-5">
                          {/* Calendar Picker (inline) */}
                          {!showMessage && (
                            <div>
                              <CalendarPicker
                                selectedSlot={selectedSlot}
                                onSelectSlot={setSelectedSlot}
                              />

                              {/* Or send message link */}
                              <button
                                type="button"
                                onClick={() => setShowMessage(true)}
                                className="mt-4 text-small text-white/35 hover:text-white/60 transition-colors underline underline-offset-4 decoration-white/15 hover:decoration-white/40"
                              >
                                Or send us a message instead
                              </button>
                            </div>
                          )}

                          {/* Message textarea */}
                          {showMessage && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              transition={{ duration: 0.3 }}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <label className={labelClasses}>
                                  Your message
                                </label>
                                <button
                                  type="button"
                                  onClick={() => setShowMessage(false)}
                                  className="text-small text-white/35 hover:text-white/60 transition-colors underline underline-offset-4 decoration-white/15"
                                >
                                  Pick a time instead
                                </button>
                              </div>
                              <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Tell us about your compliance needs, timeline, or questions..."
                                rows={4}
                                className={`${inputClasses} resize-none`}
                                autoFocus
                              />
                            </motion.div>
                          )}

                          {/* Submit buttons */}
                          <div className="space-y-3 pt-2">
                            {selectedSlot && !showMessage && (
                              <button
                                onClick={() => handleSubmit(true)}
                                disabled={submitting}
                                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-medium text-body py-3.5 rounded-full shadow-[0_0_24px_rgba(16,185,129,0.2)] transition-all flex items-center justify-center gap-2"
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
                                    Booking...
                                  </span>
                                ) : (
                                  <>
                                    Book Call — {selectedSlot.date} at{" "}
                                    {selectedSlot.time}
                                    <ArrowRight size={15} />
                                  </>
                                )}
                              </button>
                            )}

                            {showMessage && (
                              <button
                                onClick={() => handleSubmit(false)}
                                disabled={submitting}
                                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-medium text-body py-3.5 rounded-full shadow-[0_0_24px_rgba(16,185,129,0.2)] transition-all flex items-center justify-center gap-2"
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
                                    Sending...
                                  </span>
                                ) : (
                                  <>
                                    Send Message
                                    <ArrowRight size={15} />
                                  </>
                                )}
                              </button>
                            )}

                            {!showMessage && !selectedSlot && (
                              <button
                                onClick={() => handleSubmit(false)}
                                disabled={submitting}
                                className="w-full bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] hover:border-white/[0.15] text-white/70 hover:text-white font-medium text-body py-3.5 rounded-full transition-all flex items-center justify-center gap-2"
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
                                  "Submit without booking"
                                )}
                              </button>
                            )}
                          </div>

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
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Right — Ambient Visual */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.3 }}
              className="hidden lg:flex flex-col items-center justify-center lg:sticky lg:top-32"
            >
              <div className="relative w-full max-w-[360px] aspect-square flex items-center justify-center">
                {/* Outer emerald ring — slow rotate */}
                <motion.div
                  className="absolute inset-0 rounded-full border border-emerald-500/[0.12]"
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 60,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />

                {/* Middle ring */}
                <motion.div
                  className="absolute inset-8 rounded-full border border-emerald-500/[0.08]"
                  animate={{ rotate: -360 }}
                  transition={{
                    duration: 90,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />

                {/* Inner glow */}
                <div className="absolute inset-16 rounded-full bg-emerald-500/[0.04] blur-xl" />

                {/* Center Logo mark */}
                <div className="relative z-10 flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center backdrop-blur-sm">
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-emerald-400"
                    >
                      <path
                        d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>

                  <div className="text-center">
                    <p className="text-body font-semibold text-white/80 tracking-wide">
                      Caelex
                    </p>
                    <p className="text-caption text-white/30 mt-0.5">
                      Space Compliance OS
                    </p>
                  </div>
                </div>

                {/* Floating particles */}
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 rounded-full bg-emerald-400/40"
                    style={{
                      top: `${20 + i * 25}%`,
                      left: `${10 + i * 30}%`,
                    }}
                    animate={{
                      y: [0, -10, 0],
                      opacity: [0.3, 0.7, 0.3],
                    }}
                    transition={{
                      duration: 3 + i,
                      repeat: Infinity,
                      delay: i * 0.8,
                    }}
                  />
                ))}
              </div>

              {/* Trust signals */}
              <div className="mt-12 text-center space-y-3">
                <p className="text-caption text-white/25 uppercase tracking-[0.15em]">
                  Trusted by
                </p>
                <div className="flex items-center gap-6">
                  {["ESA Partners", "EU Operators", "DLR Alumni"].map(
                    (label) => (
                      <span
                        key={label}
                        className="text-small text-white/20 font-medium"
                      >
                        {label}
                      </span>
                    ),
                  )}
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
