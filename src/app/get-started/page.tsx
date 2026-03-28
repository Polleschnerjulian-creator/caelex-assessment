"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle,
  Loader2,
  Clock,
  Shield,
  Calendar,
  ChevronDown,
} from "lucide-react";

const INTERESTS = [
  "EU Space Act",
  "NIS2",
  "Debris",
  "Licensing",
  "Platform Demo",
  "Other",
] as const;

export default function GetStartedPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [showTimeRequest, setShowTimeRequest] = useState(false);
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

    const parts: string[] = [];
    if (selectedInterests.length > 0) {
      parts.push(`Interested in: ${selectedInterests.join(", ")}`);
    }
    if (message.trim()) {
      parts.push(message.trim());
    }
    if (showTimeRequest) {
      parts.push(
        "Requested a specific call time — please send available slots.",
      );
    }

    const fullMessage = parts.length > 0 ? parts.join("\n\n") : undefined;

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
    <div className="min-h-screen bg-white">
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
            className="text-heading md:text-display-sm text-[#6e6e73] mt-6 max-w-2xl leading-relaxed font-normal"
          >
            Book a call or send us a message.
          </motion.p>
        </div>
      </section>

      {/* Separator */}
      <div className="max-w-[1400px] mx-auto px-6 md:px-12">
        <div className="w-full h-px bg-[#d2d2d7]" />
      </div>

      {/* Content + Form Grid */}
      <section className="py-20 md:py-28 px-6 md:px-12">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24">
            {/* Left: What to expect */}
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
                    title: "Compliance walkthrough",
                    description:
                      "Live demo tailored to your operator type, jurisdiction, and mission profile. See exactly how Caelex maps to your operations.",
                  },
                  {
                    number: "02",
                    title: "Regulatory mapping",
                    description:
                      "How 119 EU Space Act articles and 51 NIS2 requirements apply to your specific use case — with gap analysis and priority scoring.",
                  },
                  {
                    number: "03",
                    title: "Platform access",
                    description:
                      "Full trial access after your call. No credit card required. Explore dashboards, document generation, and Astra AI at your own pace.",
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
                      We&apos;ve got your message.
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
                        Get in touch
                      </h2>
                      <p className="text-body-lg text-[#86868b]">
                        Free &middot; No commitment
                      </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
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

                      <div>
                        <label
                          htmlFor="gs-company"
                          className="block text-micro font-medium text-[#6e6e73] uppercase tracking-[0.1em] mb-2"
                        >
                          Company{" "}
                          <span className="text-[#86868b] normal-case tracking-normal">
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
                          className="w-full bg-white rounded-xl px-4 py-3.5 text-body-lg text-[#1d1d1f] placeholder:text-[#d2d2d7] border border-[#E5E7EB] outline-none transition-colors duration-200 focus:border-[#1d1d1f]"
                        />
                      </div>

                      {/* Interest chips */}
                      <div>
                        <label className="block text-micro font-medium text-[#6e6e73] uppercase tracking-[0.1em] mb-3">
                          What are you interested in?
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

                      {/* Message */}
                      <div>
                        <label
                          htmlFor="gs-message"
                          className="block text-micro font-medium text-[#6e6e73] uppercase tracking-[0.1em] mb-2"
                        >
                          Message{" "}
                          <span className="text-[#86868b] normal-case tracking-normal">
                            (optional)
                          </span>
                        </label>
                        <textarea
                          id="gs-message"
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Tell us about your compliance needs..."
                          rows={3}
                          className="w-full bg-white rounded-xl px-4 py-3.5 text-body-lg text-[#1d1d1f] placeholder:text-[#d2d2d7] border border-[#E5E7EB] outline-none transition-colors duration-200 focus:border-[#1d1d1f] resize-none"
                        />
                      </div>

                      {/* Book a specific time toggle */}
                      <div>
                        <button
                          type="button"
                          onClick={() => setShowTimeRequest(!showTimeRequest)}
                          className="flex items-center gap-2 text-body text-[#6e6e73] hover:text-[#1d1d1f] transition-colors"
                        >
                          <ChevronDown
                            size={14}
                            className={`transition-transform duration-200 ${
                              showTimeRequest ? "rotate-180" : ""
                            }`}
                          />
                          Book a specific time?{" "}
                          <span className="text-[#86868b]">(optional)</span>
                        </button>

                        {showTimeRequest && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            transition={{ duration: 0.2 }}
                            className="mt-3"
                          >
                            <div className="bg-white rounded-xl border border-[#E5E7EB] px-4 py-3.5">
                              <p className="text-body-lg text-[#6e6e73]">
                                We&apos;ll send you available times within 24
                                hours of your request.
                              </p>
                            </div>
                          </motion.div>
                        )}
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
                        className="w-full flex items-center justify-center gap-2 bg-[#1d1d1f] text-white text-body-lg font-medium px-7 py-3.5 rounded-full transition-colors duration-200 disabled:opacity-50 mt-2 hover:bg-[#424245]"
                      >
                        {submitting ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            Send Request
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
