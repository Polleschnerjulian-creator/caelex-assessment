"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Check, Loader2, Calendar, Clock } from "lucide-react";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";

// ─── Constants ───

const INTERESTS = [
  "EU Space Act",
  "NIS2 Directive",
  "Cyber Resilience Act",
  "Cybersecurity Suite",
  "Debris Mitigation",
  "Platform Demo",
] as const;

// ─── Calendar Helpers ───

function getNextBusinessDays(count: number): Date[] {
  const days: Date[] = [];
  const now = new Date();
  const current = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // Start from tomorrow if today is already past 16:00 CET, otherwise start today
  current.setDate(current.getDate() + 1);

  while (days.length < count) {
    const dow = current.getDay();
    if (dow !== 0 && dow !== 6) {
      days.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }
  return days;
}

const SLOT_HOURS = [10, 14, 16] as const;

function formatDayHeader(date: Date): string {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${dayNames[date.getDay()]} ${date.getDate()} ${monthNames[date.getMonth()]}`;
}

function formatSlotForDisplay(date: Date, hour: number): string {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${dayNames[date.getDay()]} ${date.getDate()} ${monthNames[date.getMonth()]}, ${String(hour).padStart(2, "0")}:00 CET`;
}

function isSlotPast(date: Date, hour: number): boolean {
  const now = new Date();
  const slotTime = new Date(date);
  slotTime.setHours(hour, 0, 0, 0);
  return slotTime <= now;
}

// ─── Types ───

interface SlotKey {
  dateIdx: number;
  hour: number;
}

// ─── Component ───

export default function GetStartedPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<SlotKey | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const businessDays = useMemo(() => getNextBusinessDays(5), []);

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name || submitting) return;

    setSubmitting(true);
    setError(null);

    const messageParts: string[] = [];
    if (selectedInterests.length > 0) {
      messageParts.push(`Interested in: ${selectedInterests.join(", ")}`);
    }
    if (selectedSlot !== null) {
      const slotDate = businessDays[selectedSlot.dateIdx];
      const slotLabel = formatSlotForDisplay(slotDate, selectedSlot.hour);
      messageParts.push(`Preferred slot: ${slotLabel}`);
    }
    if (message.trim()) {
      messageParts.push(message.trim());
    }
    const fullMessage =
      messageParts.length > 0 ? messageParts.join(". ") : undefined;

    try {
      const res = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          company: company || undefined,
          message: fullMessage,
        }),
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

  // ─── Success State ───

  if (submitted) {
    const slotLabel =
      selectedSlot !== null
        ? formatSlotForDisplay(
            businessDays[selectedSlot.dateIdx],
            selectedSlot.hour,
          )
        : null;

    return (
      <div className="min-h-screen bg-[#0A0F1E] relative overflow-hidden">
        <BreadcrumbJsonLd
          items={[
            { name: "Home", url: "https://caelex.eu" },
            { name: "Get Started", url: "https://caelex.eu/get-started" },
          ]}
        />

        {/* Subtle gradient glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-emerald-500/[0.04] rounded-full blur-[120px] pointer-events-none"
          aria-hidden="true"
        />

        <section className="relative z-10 pt-44 pb-20 px-6 md:px-12">
          <div className="max-w-[560px] mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl rounded-2xl p-8 md:p-12 text-center"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-8">
                  <Check size={28} className="text-emerald-400" />
                </div>
              </motion.div>

              <h2 className="text-display-sm font-semibold text-white mb-3">
                Termin angefragt
              </h2>
              <p className="text-body-lg text-slate-400 mb-2">
                Wir melden uns innerhalb von 24 Stunden bei Ihnen.
              </p>

              {slotLabel && (
                <p className="text-body text-slate-500 mb-10">
                  Gewählter Termin: {slotLabel}
                </p>
              )}

              {!slotLabel && <div className="mb-10" />}

              <Link
                href="/cra/classify"
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-6 py-3 text-body-lg font-medium transition-colors duration-200"
              >
                CRA Classification ausprobieren
                <ArrowRight size={16} />
              </Link>
            </motion.div>
          </div>
        </section>
      </div>
    );
  }

  // ─── Main Form ───

  return (
    <div className="min-h-screen bg-[#0A0F1E] relative overflow-hidden">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://caelex.eu" },
          { name: "Get Started", url: "https://caelex.eu/get-started" },
        ]}
      />

      {/* Subtle gradient glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-emerald-500/[0.04] rounded-full blur-[120px] pointer-events-none"
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative z-10">
        <section className="pt-44 pb-20 md:pb-28 px-6 md:px-12">
          <div className="max-w-[1400px] mx-auto">
            <div className="grid lg:grid-cols-[1fr_0.7fr] gap-12 lg:gap-16 items-start">
              {/* ── Left Column (60%) — Headline + Calendar ── */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="space-y-10"
              >
                {/* Headline */}
                <div>
                  <p className="text-caption font-semibold uppercase tracking-[0.15em] text-slate-500 mb-4">
                    Get Started
                  </p>
                  <h1 className="text-[clamp(1.75rem,4vw,2.75rem)] font-semibold text-white leading-[1.15] mb-4">
                    Get Started with Caelex
                  </h1>
                  <p className="text-body-lg text-slate-400 leading-relaxed max-w-[540px]">
                    Schedule a free 15-minute consultation. We&apos;ll show you
                    how Caelex maps to your specific compliance needs.
                  </p>
                </div>

                {/* Calendar Card */}
                <div className="bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl rounded-2xl p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <Calendar size={18} className="text-emerald-400" />
                    <h2 className="text-title font-semibold text-white">
                      Choose a time slot
                    </h2>
                  </div>

                  {/* Calendar Grid */}
                  <div className="overflow-x-auto -mx-2 px-2 pb-2">
                    <div className="grid grid-cols-5 gap-3 min-w-[480px]">
                      {/* Day headers */}
                      {businessDays.map((day, dayIdx) => (
                        <div
                          key={dayIdx}
                          className="text-center pb-3 border-b border-white/[0.06]"
                        >
                          <p className="text-caption font-semibold text-slate-400 uppercase tracking-wider">
                            {formatDayHeader(day).split(" ")[0]}
                          </p>
                          <p className="text-body-lg font-medium text-slate-300 mt-0.5">
                            {formatDayHeader(day).split(" ").slice(1).join(" ")}
                          </p>
                        </div>
                      ))}

                      {/* Time slots */}
                      {SLOT_HOURS.map((hour) =>
                        businessDays.map((day, dayIdx) => {
                          const past = isSlotPast(day, hour);
                          const isSelected =
                            selectedSlot?.dateIdx === dayIdx &&
                            selectedSlot?.hour === hour;

                          return (
                            <button
                              key={`${dayIdx}-${hour}`}
                              type="button"
                              disabled={past}
                              onClick={() =>
                                setSelectedSlot(
                                  isSelected ? null : { dateIdx: dayIdx, hour },
                                )
                              }
                              className={`
                                flex items-center justify-center gap-1.5 py-3 rounded-xl text-body font-medium transition-all duration-200
                                ${
                                  past
                                    ? "opacity-30 cursor-not-allowed bg-white/[0.02] border border-white/[0.04] text-slate-600"
                                    : isSelected
                                      ? "bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.1)]"
                                      : "bg-white/[0.04] border border-white/[0.08] text-slate-300 hover:border-emerald-500/30 hover:text-slate-200 cursor-pointer"
                                }
                              `}
                            >
                              <Clock
                                size={12}
                                className={
                                  isSelected
                                    ? "text-emerald-400"
                                    : "text-slate-500"
                                }
                              />
                              {String(hour).padStart(2, "0")}:00
                            </button>
                          );
                        }),
                      )}
                    </div>
                  </div>

                  {/* Selected slot indicator */}
                  <AnimatePresence>
                    {selectedSlot !== null && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="text-body text-emerald-400/80 mt-4 flex items-center gap-2"
                      >
                        <Check size={14} />
                        {formatSlotForDisplay(
                          businessDays[selectedSlot.dateIdx],
                          selectedSlot.hour,
                        )}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {/* Trust signals */}
                <div className="flex items-center gap-3 text-body text-slate-500">
                  <span>15 min</span>
                  <span aria-hidden="true">&middot;</span>
                  <span>Free</span>
                  <span aria-hidden="true">&middot;</span>
                  <span>No commitment</span>
                  <span aria-hidden="true">&middot;</span>
                  <span>Response within 24h</span>
                </div>
              </motion.div>

              {/* ── Right Column (40%) — Form ── */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.15 }}
              >
                <div className="bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl rounded-2xl p-8 md:p-10">
                  <div className="mb-8">
                    <h2 className="text-heading font-semibold text-white mb-1">
                      Book your call
                    </h2>
                    <p className="text-body-lg text-slate-500">
                      Free &middot; 15 minutes
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Full Name */}
                    <div>
                      <label
                        htmlFor="gs-name"
                        className="block text-caption font-semibold uppercase tracking-[0.15em] text-slate-500 mb-2.5"
                      >
                        Full Name *
                      </label>
                      <input
                        type="text"
                        id="gs-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your full name"
                        required
                        autoComplete="name"
                        className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-5 py-3.5 text-body-lg text-white placeholder:text-white/25 focus:border-emerald-500/50 focus:outline-none transition-colors duration-200"
                      />
                    </div>

                    {/* Work Email */}
                    <div>
                      <label
                        htmlFor="gs-email"
                        className="block text-caption font-semibold uppercase tracking-[0.15em] text-slate-500 mb-2.5"
                      >
                        Work Email *
                      </label>
                      <input
                        type="email"
                        id="gs-email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        required
                        autoComplete="email"
                        className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-5 py-3.5 text-body-lg text-white placeholder:text-white/25 focus:border-emerald-500/50 focus:outline-none transition-colors duration-200"
                      />
                    </div>

                    {/* Company */}
                    <div>
                      <label
                        htmlFor="gs-company"
                        className="block text-caption font-semibold uppercase tracking-[0.15em] text-slate-500 mb-2.5"
                      >
                        Company{" "}
                        <span className="normal-case tracking-normal font-normal text-slate-600">
                          (optional)
                        </span>
                      </label>
                      <input
                        type="text"
                        id="gs-company"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="Company name"
                        autoComplete="organization"
                        className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-5 py-3.5 text-body-lg text-white placeholder:text-white/25 focus:border-emerald-500/50 focus:outline-none transition-colors duration-200"
                      />
                    </div>

                    {/* Interest chips */}
                    <div>
                      <label className="block text-caption font-semibold uppercase tracking-[0.15em] text-slate-500 mb-3">
                        What interests you?
                      </label>
                      <div className="flex flex-wrap gap-2.5">
                        {INTERESTS.map((interest) => {
                          const isSelected =
                            selectedInterests.includes(interest);
                          return (
                            <button
                              key={interest}
                              type="button"
                              onClick={() => toggleInterest(interest)}
                              className={`rounded-full px-4 py-2 text-body cursor-pointer transition-all duration-200 border ${
                                isSelected
                                  ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400 font-medium"
                                  : "bg-white/[0.06] border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-300"
                              }`}
                            >
                              {interest}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Message */}
                    <div>
                      <label
                        htmlFor="gs-message"
                        className="block text-caption font-semibold uppercase tracking-[0.15em] text-slate-500 mb-2.5"
                      >
                        Message{" "}
                        <span className="normal-case tracking-normal font-normal text-slate-600">
                          (optional)
                        </span>
                      </label>
                      <textarea
                        id="gs-message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Tell us about your compliance needs..."
                        rows={3}
                        className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-5 py-3.5 text-body-lg text-white placeholder:text-white/25 focus:border-emerald-500/50 focus:outline-none transition-colors duration-200 resize-none"
                      />
                    </div>

                    {/* Error */}
                    <AnimatePresence>
                      {error && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="text-body text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-5 py-3.5"
                          role="alert"
                        >
                          {error}
                        </motion.p>
                      )}
                    </AnimatePresence>

                    {/* Submit button */}
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full flex items-center justify-center gap-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-3 text-body-lg font-semibold transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          Send Request
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>
                  </form>

                  <p className="text-body text-slate-500 text-center mt-6">
                    Or email us directly at{" "}
                    <a
                      href="mailto:cs@caelex.eu"
                      className="text-slate-400 hover:text-white transition-colors duration-200"
                    >
                      cs@caelex.eu
                    </a>
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
