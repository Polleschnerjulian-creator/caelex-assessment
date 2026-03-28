"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Loader2 } from "lucide-react";

const INTERESTS = [
  "EU Space Act",
  "NIS2",
  "Debris Mitigation",
  "Licensing",
  "Platform Demo",
  "Other",
] as const;

const TIME_PREFERENCES = [
  "Morning (9-12)",
  "Afternoon (13-17)",
  "Flexible",
] as const;

export default function GetStartedPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [timePreference, setTimePreference] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (timePreference) {
      messageParts.push(`Preferred time: ${timePreference}`);
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

  return (
    <div className="min-h-screen bg-[#E8EAED] relative overflow-hidden">
      {/* Giant Caelex logo watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <Image
          src="/images/logo-caelex.png"
          alt=""
          width={800}
          height={800}
          className="opacity-[0.035] select-none"
          priority
          aria-hidden="true"
        />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <section className="pt-44 pb-20 md:pb-28 px-6 md:px-12">
          <div className="max-w-[1400px] mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
              {/* Left column — What to expect */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="bg-[#E8EAED] rounded-3xl p-8 md:p-10 shadow-[8px_8px_16px_#c8cacd,-8px_-8px_16px_#ffffff]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#9a9ea3] mb-6">
                    Get Started
                  </p>

                  <h1 className="text-[clamp(1.75rem,4vw,2.75rem)] font-semibold text-[#2d2d2d] leading-[1.15] mb-4">
                    Talk to the Caelex team.
                  </h1>

                  <p className="text-body-lg text-[#6b6f73] leading-relaxed mb-12">
                    Schedule a free consultation and get a personalized
                    compliance assessment for your space operations.
                  </p>

                  <div className="space-y-8">
                    {[
                      {
                        number: "01",
                        title: "Compliance profile",
                        description:
                          "Tailored to your operator type and mission parameters.",
                      },
                      {
                        number: "02",
                        title: "Jurisdiction review",
                        description:
                          "10 EU space law jurisdictions compared side by side.",
                      },
                      {
                        number: "03",
                        title: "Live platform demo",
                        description:
                          "Full walkthrough of your compliance dashboard.",
                      },
                      {
                        number: "04",
                        title: "Regulatory roadmap",
                        description:
                          "Your personalized compliance plan and next steps.",
                      },
                    ].map((item, i) => (
                      <motion.div
                        key={item.number}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
                        className="flex gap-5"
                      >
                        <span className="text-body-lg text-[#9a9ea3] font-semibold tabular-nums flex-shrink-0 mt-0.5">
                          {item.number}
                        </span>
                        <div>
                          <h3 className="text-title font-semibold text-[#2d2d2d] mb-1">
                            {item.title}
                          </h3>
                          <p className="text-body-lg text-[#6b6f73] leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Separator */}
                  <div className="h-px bg-gradient-to-r from-transparent via-[#c8cacd] to-transparent my-10" />

                  {/* Trust signals */}
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                    {["15 min", "No commitment", "Response within 24h"].map(
                      (label) => (
                        <span
                          key={label}
                          className="text-body text-[#9a9ea3] font-medium"
                        >
                          {label}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Right column — Book Your Call */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.15 }}
              >
                <div className="bg-[#E8EAED] rounded-3xl p-8 md:p-10 shadow-[8px_8px_16px_#c8cacd,-8px_-8px_16px_#ffffff]">
                  {submitted ? (
                    /* Success state */
                    <div className="text-center py-12">
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.4 }}
                      >
                        <div className="w-20 h-20 rounded-full bg-[#E8EAED] shadow-[6px_6px_12px_#c8cacd,-6px_-6px_12px_#ffffff] flex items-center justify-center mx-auto mb-8">
                          <Check size={32} className="text-[#2d2d2d]" />
                        </div>
                      </motion.div>

                      <h3 className="text-display-sm font-semibold text-[#2d2d2d] mb-3">
                        Request sent.
                      </h3>
                      <p className="text-body-lg text-[#6b6f73] mb-2">
                        We&apos;ll reach out within 24 hours.
                      </p>
                      <p className="text-body text-[#9a9ea3] mb-10">
                        Check your inbox for confirmation.
                      </p>

                      <Link
                        href="/assessment"
                        className="inline-flex items-center gap-2 bg-[#E8EAED] rounded-2xl px-8 py-4 text-body-lg font-semibold text-[#2d2d2d] shadow-[6px_6px_12px_#c8cacd,-6px_-6px_12px_#ffffff] hover:shadow-[4px_4px_8px_#c8cacd,-4px_-4px_8px_#ffffff] active:shadow-[inset_4px_4px_8px_#c8cacd,inset_-4px_-4px_8px_#ffffff] transition-all duration-200"
                      >
                        Explore the free assessment
                        <ArrowRight size={16} />
                      </Link>
                    </div>
                  ) : (
                    <>
                      <div className="mb-8">
                        <h2 className="text-heading font-semibold text-[#2d2d2d] mb-1">
                          Book your call
                        </h2>
                        <p className="text-body-lg text-[#6b6f73]">
                          Free &middot; 15 minutes
                        </p>
                      </div>

                      <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Full Name */}
                        <div>
                          <label
                            htmlFor="gs-name"
                            className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-[#9a9ea3] mb-2.5"
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
                            className="w-full bg-[#E8EAED] rounded-xl px-5 py-4 text-body-lg text-[#2d2d2d] shadow-[inset_3px_3px_6px_#c8cacd,inset_-3px_-3px_6px_#ffffff] border-none outline-none placeholder:text-[#a0a4a8] focus:shadow-[inset_4px_4px_8px_#c0c2c5,inset_-4px_-4px_8px_#ffffff] transition-shadow duration-200"
                          />
                        </div>

                        {/* Work Email */}
                        <div>
                          <label
                            htmlFor="gs-email"
                            className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-[#9a9ea3] mb-2.5"
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
                            className="w-full bg-[#E8EAED] rounded-xl px-5 py-4 text-body-lg text-[#2d2d2d] shadow-[inset_3px_3px_6px_#c8cacd,inset_-3px_-3px_6px_#ffffff] border-none outline-none placeholder:text-[#a0a4a8] focus:shadow-[inset_4px_4px_8px_#c0c2c5,inset_-4px_-4px_8px_#ffffff] transition-shadow duration-200"
                          />
                        </div>

                        {/* Company */}
                        <div>
                          <label
                            htmlFor="gs-company"
                            className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-[#9a9ea3] mb-2.5"
                          >
                            Company{" "}
                            <span className="normal-case tracking-normal font-normal text-[#a0a4a8]">
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
                            className="w-full bg-[#E8EAED] rounded-xl px-5 py-4 text-body-lg text-[#2d2d2d] shadow-[inset_3px_3px_6px_#c8cacd,inset_-3px_-3px_6px_#ffffff] border-none outline-none placeholder:text-[#a0a4a8] focus:shadow-[inset_4px_4px_8px_#c0c2c5,inset_-4px_-4px_8px_#ffffff] transition-shadow duration-200"
                          />
                        </div>

                        {/* Interest chips */}
                        <div>
                          <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-[#9a9ea3] mb-3">
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
                                  className={`rounded-full px-5 py-2.5 text-body cursor-pointer transition-all duration-200 ${
                                    isSelected
                                      ? "font-medium text-[#2d2d2d] shadow-[inset_3px_3px_6px_#c8cacd,inset_-3px_-3px_6px_#ffffff]"
                                      : "text-[#6b6f73] shadow-[3px_3px_6px_#c8cacd,-3px_-3px_6px_#ffffff] hover:shadow-[2px_2px_4px_#c8cacd,-2px_-2px_4px_#ffffff]"
                                  } bg-[#E8EAED]`}
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
                            className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-[#9a9ea3] mb-2.5"
                          >
                            Message{" "}
                            <span className="normal-case tracking-normal font-normal text-[#a0a4a8]">
                              (optional)
                            </span>
                          </label>
                          <textarea
                            id="gs-message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Tell us about your compliance needs..."
                            rows={3}
                            className="w-full bg-[#E8EAED] rounded-xl px-5 py-4 text-body-lg text-[#2d2d2d] shadow-[inset_3px_3px_6px_#c8cacd,inset_-3px_-3px_6px_#ffffff] border-none outline-none placeholder:text-[#a0a4a8] focus:shadow-[inset_4px_4px_8px_#c0c2c5,inset_-4px_-4px_8px_#ffffff] transition-shadow duration-200 resize-none"
                          />
                        </div>

                        {/* Separator */}
                        <div className="h-px bg-gradient-to-r from-transparent via-[#c8cacd] to-transparent" />

                        {/* Pick a time */}
                        <div>
                          <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-[#9a9ea3] mb-3">
                            Pick a time
                          </label>
                          <div className="flex flex-wrap gap-2.5">
                            {TIME_PREFERENCES.map((pref) => {
                              const isSelected = timePreference === pref;
                              return (
                                <button
                                  key={pref}
                                  type="button"
                                  onClick={() =>
                                    setTimePreference(isSelected ? null : pref)
                                  }
                                  className={`rounded-full px-5 py-2.5 text-body cursor-pointer transition-all duration-200 ${
                                    isSelected
                                      ? "font-medium text-[#2d2d2d] shadow-[inset_3px_3px_6px_#c8cacd,inset_-3px_-3px_6px_#ffffff]"
                                      : "text-[#6b6f73] shadow-[3px_3px_6px_#c8cacd,-3px_-3px_6px_#ffffff] hover:shadow-[2px_2px_4px_#c8cacd,-2px_-2px_4px_#ffffff]"
                                  } bg-[#E8EAED]`}
                                >
                                  {pref}
                                </button>
                              );
                            })}
                          </div>
                          <p className="text-body text-[#9a9ea3] mt-3">
                            We&apos;ll send you available slots within 24 hours.
                          </p>
                        </div>

                        {/* Error */}
                        {error && (
                          <p
                            className="text-body text-[#2d2d2d] bg-[#E8EAED] rounded-xl px-5 py-4 shadow-[inset_3px_3px_6px_#c8cacd,inset_-3px_-3px_6px_#ffffff]"
                            role="alert"
                          >
                            {error}
                          </p>
                        )}

                        {/* Submit button */}
                        <button
                          type="submit"
                          disabled={submitting}
                          className="w-full flex items-center justify-center gap-2.5 bg-[#E8EAED] rounded-2xl px-8 py-4 text-body-lg font-semibold text-[#2d2d2d] shadow-[6px_6px_12px_#c8cacd,-6px_-6px_12px_#ffffff] hover:shadow-[4px_4px_8px_#c8cacd,-4px_-4px_8px_#ffffff] active:shadow-[inset_4px_4px_8px_#c8cacd,inset_-4px_-4px_8px_#ffffff] transition-all duration-200 disabled:opacity-50 mt-2"
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

                      <p className="text-body text-[#9a9ea3] text-center mt-6">
                        Or email us directly at{" "}
                        <a
                          href="mailto:cs@caelex.eu"
                          className="text-[#6b6f73] hover:text-[#2d2d2d] transition-colors duration-200"
                        >
                          cs@caelex.eu
                        </a>
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
