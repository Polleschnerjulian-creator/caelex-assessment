"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle,
  Loader2,
  Clock,
  Shield,
  Calendar,
} from "lucide-react";
import CalendarPicker from "@/components/assure/booking/CalendarPicker";
import type { Slot } from "@/components/assure/booking/CalendarPicker";
import { format } from "date-fns";

const INTERESTS = [
  "EU Space Act",
  "NIS2",
  "Debris Mitigation",
  "Licensing",
  "Platform Demo",
  "Other",
] as const;

export default function GetStartedPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookedTime, setBookedTime] = useState<string | null>(null);

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest],
    );
  };

  const handleSubmit = async (e: React.FormEvent, withBooking: boolean) => {
    e.preventDefault();
    if (!email || !name || submitting) return;

    setSubmitting(true);
    setError(null);

    const messageParts: string[] = [];
    if (selectedInterests.length > 0) {
      messageParts.push(`Interested in: ${selectedInterests.join(", ")}`);
    }
    const fullMessage =
      messageParts.length > 0 ? messageParts.join("\n\n") : undefined;

    try {
      if (withBooking && selectedSlot) {
        // POST to /api/assure/book
        const res = await fetch("/api/assure/book", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email,
            company: company || "Not specified",
            message: fullMessage,
            scheduledAt: selectedSlot.dateTime,
            operatorType: "inquiry",
            fundingStage: "unknown",
            isRaising: false,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || "Something went wrong. Please try again.");
          setSubmitting(false);
          return;
        }

        setBookedTime(
          format(new Date(selectedSlot.dateTime), "EEEE, d MMMM 'at' HH:mm"),
        );
      } else {
        // POST to /api/demo
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
      }

      setSubmitted(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Giant Caelex logo watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <Image
          src="/images/logo-caelex.png"
          alt=""
          width={800}
          height={800}
          className="opacity-[0.04] select-none"
          priority
          aria-hidden="true"
        />
      </div>

      {/* Glass overlay + content */}
      <div className="relative z-10 backdrop-blur-[2px]">
        {/* Hero */}
        <section className="pt-44 pb-10 px-6 md:px-12">
          <div className="max-w-[1400px] mx-auto">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="text-micro uppercase tracking-[0.2em] text-[#86868b] mb-6"
            >
              Get Started
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-[clamp(2rem,5vw,3.5rem)] font-semibold tracking-[-0.03em] text-[#1d1d1f] max-w-3xl leading-[1.1]"
            >
              Talk to the Caelex team.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-heading text-[#6e6e73] mt-6 max-w-2xl leading-relaxed font-normal"
            >
              Book a call or send us a message.
            </motion.p>
          </div>
        </section>

        {/* Separator */}
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="w-full h-px bg-[#d2d2d7]" />
        </div>

        {/* Two-column layout */}
        <section className="py-20 md:py-28 px-6 md:px-12">
          <div className="max-w-[1400px] mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 lg:gap-24">
              {/* Left column: What to expect */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <p className="text-micro uppercase tracking-[0.2em] text-[#86868b] mb-10">
                  What to expect
                </p>

                <div className="space-y-10">
                  {[
                    {
                      number: "01",
                      title: "Compliance profile",
                      description:
                        "Live walkthrough of the assessment and dashboard tailored to your operator type and mission parameters.",
                    },
                    {
                      number: "02",
                      title: "Jurisdiction review",
                      description:
                        "Side-by-side analysis of licensing requirements across 10 European space law jurisdictions.",
                    },
                    {
                      number: "03",
                      title: "Live platform demo",
                      description:
                        "Full walkthrough of dashboards, document generation, Astra AI, and fleet-level compliance tracking.",
                    },
                    {
                      number: "04",
                      title: "Regulatory roadmap",
                      description:
                        "Prioritized action plan mapping 119 EU Space Act articles and 51 NIS2 requirements to your operations.",
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

              {/* Right column: Form + CalendarPicker */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <div className="bg-[#FAFAFA] rounded-2xl p-8 md:p-10 border border-[#E5E7EB]">
                  {submitted ? (
                    <div className="text-center py-8">
                      <div className="w-14 h-14 rounded-full bg-[#1d1d1f] flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={24} className="text-white" />
                      </div>
                      <h3 className="text-display-sm font-semibold text-[#1d1d1f] mb-2">
                        {bookedTime
                          ? "You\u2019re booked."
                          : "We\u2019ve got your message."}
                      </h3>
                      <p className="text-body-lg text-[#6e6e73] mb-2 max-w-sm mx-auto">
                        We&apos;ll reach out within 24 hours.
                      </p>
                      {bookedTime && (
                        <p className="text-body-lg text-[#1d1d1f] font-medium mb-8 max-w-sm mx-auto">
                          {bookedTime}
                        </p>
                      )}
                      {!bookedTime && <div className="mb-8" />}
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
                          Book Your Call
                        </h2>
                        <p className="text-body-lg text-[#86868b]">
                          Free &middot; 15 minutes &middot; No commitment
                        </p>
                      </div>

                      <form
                        onSubmit={(e) => handleSubmit(e, selectedSlot !== null)}
                        className="space-y-5"
                      >
                        {/* Name */}
                        <div>
                          <label
                            htmlFor="gs-name"
                            className="block text-micro font-medium text-[#6e6e73] uppercase tracking-[0.1em] mb-2"
                          >
                            Name
                          </label>
                          <input
                            type="text"
                            id="gs-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Your name"
                            required
                            autoComplete="name"
                            className="w-full bg-white rounded-xl px-4 py-3.5 text-body-lg text-[#1d1d1f] placeholder:text-[#d2d2d7] border border-[#E5E7EB] outline-none transition-colors duration-200 focus:border-[#1d1d1f]"
                          />
                        </div>

                        {/* Email */}
                        <div>
                          <label
                            htmlFor="gs-email"
                            className="block text-micro font-medium text-[#6e6e73] uppercase tracking-[0.1em] mb-2"
                          >
                            Work Email
                          </label>
                          <input
                            type="email"
                            id="gs-email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@company.com"
                            required
                            autoComplete="email"
                            className="w-full bg-white rounded-xl px-4 py-3.5 text-body-lg text-[#1d1d1f] placeholder:text-[#d2d2d7] border border-[#E5E7EB] outline-none transition-colors duration-200 focus:border-[#1d1d1f]"
                          />
                        </div>

                        {/* Company */}
                        <div>
                          <label
                            htmlFor="gs-company"
                            className="block text-micro font-medium text-[#6e6e73] uppercase tracking-[0.1em] mb-2"
                          >
                            Company
                          </label>
                          <input
                            type="text"
                            id="gs-company"
                            value={company}
                            onChange={(e) => setCompany(e.target.value)}
                            placeholder="Company name"
                            autoComplete="organization"
                            className="w-full bg-white rounded-xl px-4 py-3.5 text-body-lg text-[#1d1d1f] placeholder:text-[#d2d2d7] border border-[#E5E7EB] outline-none transition-colors duration-200 focus:border-[#1d1d1f]"
                          />
                        </div>

                        {/* Interest chips */}
                        <div>
                          <label className="block text-micro font-medium text-[#6e6e73] uppercase tracking-[0.1em] mb-3">
                            What interests you?
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {INTERESTS.map((interest) => {
                              const isSelected =
                                selectedInterests.includes(interest);
                              return (
                                <button
                                  key={interest}
                                  type="button"
                                  onClick={() => toggleInterest(interest)}
                                  className={`rounded-full px-4 py-2 text-body transition-colors cursor-pointer border ${
                                    isSelected
                                      ? "border-[#1d1d1f] bg-[#1d1d1f] text-white"
                                      : "border-[#E5E7EB] text-[#6e6e73] hover:border-[#1d1d1f] hover:text-[#1d1d1f]"
                                  }`}
                                >
                                  {interest}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Calendar picker in dark container */}
                        <div>
                          <label className="block text-micro font-medium text-[#6e6e73] uppercase tracking-[0.1em] mb-3">
                            Pick a time
                          </label>
                          <div className="bg-[#1d1d1f] rounded-2xl p-4">
                            <CalendarPicker
                              selectedSlot={selectedSlot}
                              onSelectSlot={setSelectedSlot}
                            />
                          </div>
                        </div>

                        {/* Error */}
                        {error && (
                          <p
                            className="text-body text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3"
                            role="alert"
                          >
                            {error}
                          </p>
                        )}

                        {/* Submit button */}
                        <button
                          type="submit"
                          disabled={submitting}
                          className="w-full flex items-center justify-center gap-2 bg-[#1d1d1f] text-white text-body-lg font-medium px-7 py-4 rounded-full transition-colors duration-200 disabled:opacity-50 mt-2 hover:bg-[#424245]"
                        >
                          {submitting ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              {selectedSlot ? "Booking..." : "Sending..."}
                            </>
                          ) : (
                            <>
                              {selectedSlot ? "Book Call" : "Send Request"}
                              <ArrowRight size={14} />
                            </>
                          )}
                        </button>

                        {/* Send without booking link */}
                        {selectedSlot && (
                          <div className="text-center">
                            <button
                              type="button"
                              disabled={submitting}
                              onClick={() => {
                                const syntheticEvent = {
                                  preventDefault: () => {},
                                } as React.FormEvent;
                                handleSubmit(syntheticEvent, false);
                              }}
                              className="text-body text-[#86868b] hover:text-[#1d1d1f] underline transition-colors disabled:opacity-50"
                            >
                              Send without booking
                            </button>
                          </div>
                        )}
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
      </div>
    </div>
  );
}
