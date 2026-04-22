"use client";

import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Check,
  Loader2,
  Calendar,
  Clock,
  Video,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
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

const DAYS_PER_PAGE = 5;

// ─── Types ───

interface AvailabilitySlot {
  startIso: string;
  endIso: string;
  hour: number;
  available: boolean;
}

interface AvailabilityDay {
  date: string;
  dayName: string;
  dayOfMonth: number;
  monthShort: string;
  slots: AvailabilitySlot[];
}

interface AvailabilityResponse {
  timezone: string;
  durationMinutes: number;
  days: AvailabilityDay[];
}

interface ConfirmedBooking {
  id: string;
  scheduledAt: string;
  slotLabel: string;
  meetLink: string | null;
}

// ─── Component ───

function GetStartedContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedSlotIso, setSelectedSlotIso] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Availability state
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(
    null,
  );
  const [loadingAvailability, setLoadingAvailability] = useState(true);
  const [availabilityError, setAvailabilityError] = useState<string | null>(
    null,
  );
  const [weekOffset, setWeekOffset] = useState(0);

  // Confirmed booking (populated on success)
  const [confirmed, setConfirmed] = useState<ConfirmedBooking | null>(null);

  // ─── Load availability on mount ───
  useEffect(() => {
    let cancelled = false;

    async function fetchAvailability() {
      try {
        const res = await fetch("/api/demo/availability", {
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = (await res.json()) as AvailabilityResponse;
        if (!cancelled) {
          setAvailability(data);
          setAvailabilityError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setAvailabilityError(
            "Could not load available times. You can still submit — we'll get back to you with a slot.",
          );
          // eslint-disable-next-line no-console
          console.error("Failed to load availability", err);
        }
      } finally {
        if (!cancelled) {
          setLoadingAvailability(false);
        }
      }
    }

    fetchAvailability();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest],
    );
  };

  // ─── Paginated day view (5 at a time) ───
  const allDays = availability?.days ?? [];
  const totalPages = Math.max(1, Math.ceil(allDays.length / DAYS_PER_PAGE));
  const visibleDays = allDays.slice(
    weekOffset * DAYS_PER_PAGE,
    weekOffset * DAYS_PER_PAGE + DAYS_PER_PAGE,
  );
  const canGoBack = weekOffset > 0;
  const canGoForward = weekOffset < totalPages - 1;

  // ─── Selected slot label ───
  const selectedSlot = allDays
    .flatMap((day) => day.slots)
    .find((slot) => slot.startIso === selectedSlotIso);

  const selectedSlotLabel = selectedSlot
    ? (() => {
        const day = allDays.find((d) =>
          d.slots.some((s) => s.startIso === selectedSlotIso),
        );
        if (!day) return null;
        const hour = String(selectedSlot.hour).padStart(2, "0");
        return `${day.dayName} ${day.dayOfMonth} ${day.monthShort}, ${hour}:00 CET`;
      })()
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name || submitting) return;

    setSubmitting(true);
    setError(null);

    const messageParts: string[] = [];
    if (selectedInterests.length > 0) {
      messageParts.push(`Interested in: ${selectedInterests.join(", ")}`);
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
          scheduledAtIso: selectedSlotIso || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.code === "SLOT_UNAVAILABLE") {
          setError(
            "Sorry, this slot was just booked by someone else. Please pick another time.",
          );
          // Refresh availability
          setSelectedSlotIso(null);
          try {
            const refresh = await fetch("/api/demo/availability", {
              cache: "no-store",
            });
            if (refresh.ok) {
              setAvailability(await refresh.json());
            }
          } catch {
            // ignore
          }
        } else {
          setError(data.error || "Something went wrong. Please try again.");
        }
        setSubmitting(false);
        return;
      }

      if (data.booking) {
        setConfirmed(data.booking as ConfirmedBooking);
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
    return (
      <div className="min-h-screen bg-[#F7F8FA] relative overflow-hidden">
        <BreadcrumbJsonLd
          items={[
            { name: "Home", url: "https://www.caelex.eu" },
            { name: "Get Started", url: "https://www.caelex.eu/get-started" },
          ]}
        />

        <section className="relative z-10 pt-44 pb-20 px-6 md:px-12">
          <div className="max-w-[560px] mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white border border-[#e5e7eb] rounded-2xl shadow-sm p-8 md:p-12 text-center"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <div className="w-16 h-16 rounded-full bg-[#111827] flex items-center justify-center mx-auto mb-8">
                  <Check size={28} className="text-white" />
                </div>
              </motion.div>

              <h2 className="text-display-sm font-semibold text-[#111827] mb-3">
                {confirmed ? "Termin bestätigt" : "Termin angefragt"}
              </h2>
              <p className="text-body-lg text-[#6b7280] mb-6">
                {confirmed
                  ? "Sie erhalten in Kürze eine Kalender-Einladung."
                  : "Wir melden uns innerhalb von 24 Stunden bei Ihnen."}
              </p>

              {confirmed && (
                <div className="bg-[#f9fafb] border border-[#e5e7eb] rounded-xl p-5 mb-8 text-left">
                  <p className="text-caption font-semibold uppercase tracking-[0.15em] text-[#9ca3af] mb-1.5">
                    When
                  </p>
                  <p className="text-body-lg font-medium text-[#111827] mb-4">
                    {confirmed.slotLabel}
                  </p>

                  {confirmed.meetLink && (
                    <>
                      <p className="text-caption font-semibold uppercase tracking-[0.15em] text-[#9ca3af] mb-1.5">
                        Join the call
                      </p>
                      <a
                        href={confirmed.meetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-body text-[#111827] hover:text-black transition-colors font-medium break-all"
                      >
                        <Video size={14} className="flex-shrink-0" />
                        {confirmed.meetLink}
                      </a>
                    </>
                  )}
                </div>
              )}

              <Link
                href="/cra/classify"
                className="inline-flex items-center gap-2 bg-[#111827] hover:bg-black text-white rounded-xl px-6 py-3 text-body-lg font-medium transition-colors duration-200"
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
    <div className="min-h-screen bg-[#F7F8FA] relative overflow-hidden">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://www.caelex.eu" },
          { name: "Get Started", url: "https://www.caelex.eu/get-started" },
        ]}
      />

      {/* Content */}
      <div className="relative z-10">
        <section className="pt-44 pb-20 md:pb-28 px-6 md:px-12">
          <div className="max-w-[1400px] mx-auto">
            {/* Subscription required banner */}
            {reason === "no-subscription" && (
              <div className="p-4 rounded-xl border border-[#e5e7eb] bg-[#f9fafb] mb-8">
                <p className="text-body font-medium text-[#111827]">
                  Sie benötigen ein aktives Abonnement um auf das Dashboard
                  zuzugreifen.
                </p>
                <p className="text-small text-[#6b7280] mt-1">
                  Kontaktieren Sie uns für ein individuelles Angebot.
                </p>
              </div>
            )}

            <div className="grid lg:grid-cols-[1fr_0.7fr] gap-12 lg:gap-16 items-start">
              {/* ── Left Column — Headline + Calendar ── */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="space-y-10"
              >
                {/* Headline */}
                <div>
                  <p className="text-caption font-semibold uppercase tracking-[0.15em] text-[#9ca3af] mb-4">
                    Get Started
                  </p>
                  <h1 className="text-[clamp(1.75rem,4vw,2.75rem)] font-semibold text-[#111827] leading-[1.15] mb-4">
                    Get Started with Caelex
                  </h1>
                  <p className="text-body-lg text-[#6b7280] leading-relaxed max-w-[540px]">
                    Schedule a free 15-minute consultation. We&apos;ll show you
                    how Caelex maps to your specific compliance needs.
                  </p>
                </div>

                {/* Calendar Card */}
                <div className="bg-white border border-[#e5e7eb] rounded-2xl shadow-sm p-6 md:p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <Calendar size={18} className="text-[#111827]" />
                      <h2 className="text-title font-semibold text-[#111827]">
                        Choose a time slot
                      </h2>
                    </div>
                    {totalPages > 1 && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setWeekOffset((p) => Math.max(0, p - 1))
                          }
                          disabled={!canGoBack}
                          aria-label="Previous week"
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#e5e7eb] text-[#6b7280] hover:border-[#111827] hover:text-[#111827] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setWeekOffset((p) =>
                              Math.min(totalPages - 1, p + 1),
                            )
                          }
                          disabled={!canGoForward}
                          aria-label="Next week"
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#e5e7eb] text-[#6b7280] hover:border-[#111827] hover:text-[#111827] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Loading state */}
                  {loadingAvailability && (
                    <div className="flex items-center justify-center gap-2 py-16 text-body text-[#9ca3af]">
                      <Loader2 size={16} className="animate-spin" />
                      Loading available times…
                    </div>
                  )}

                  {/* Error state */}
                  {!loadingAvailability && availabilityError && (
                    <div className="py-10 text-center text-body text-[#6b7280] bg-[#f9fafb] rounded-xl border border-[#e5e7eb]">
                      {availabilityError}
                    </div>
                  )}

                  {/* Calendar Grid */}
                  {!loadingAvailability && !availabilityError && (
                    <div className="overflow-x-auto -mx-2 px-2 pb-2">
                      <div className="grid grid-cols-5 gap-3 min-w-[480px]">
                        {/* Day headers */}
                        {visibleDays.map((day) => (
                          <div
                            key={day.date}
                            className="text-center pb-3 border-b border-[#e5e7eb]"
                          >
                            <p className="text-caption font-semibold text-[#9ca3af] uppercase tracking-wider">
                              {day.dayName}
                            </p>
                            <p className="text-body-lg font-medium text-[#111827] mt-0.5">
                              {day.dayOfMonth} {day.monthShort}
                            </p>
                          </div>
                        ))}

                        {/* Time slots — rendered row by row so all 10:00 align */}
                        {[10, 14, 16].map((hour) =>
                          visibleDays.map((day) => {
                            const slot = day.slots.find((s) => s.hour === hour);
                            if (!slot) {
                              return (
                                <div key={`${day.date}-${hour}`} aria-hidden />
                              );
                            }
                            const isSelected =
                              selectedSlotIso === slot.startIso;
                            const disabled = !slot.available;

                            return (
                              <button
                                key={`${day.date}-${hour}`}
                                type="button"
                                disabled={disabled}
                                onClick={() =>
                                  setSelectedSlotIso(
                                    isSelected ? null : slot.startIso,
                                  )
                                }
                                aria-label={
                                  disabled
                                    ? `${hour}:00 on ${day.dayName} ${day.dayOfMonth} ${day.monthShort} — unavailable`
                                    : `${hour}:00 on ${day.dayName} ${day.dayOfMonth} ${day.monthShort} — available`
                                }
                                className={`
                                  flex items-center justify-center gap-1.5 py-3 rounded-xl text-body font-medium transition-all duration-200
                                  ${
                                    disabled
                                      ? "opacity-30 cursor-not-allowed bg-[#f9fafb] border border-[#e5e7eb] text-[#9ca3af] line-through"
                                      : isSelected
                                        ? "bg-[#111827] border border-[#111827] text-white"
                                        : "bg-[#f9fafb] border border-[#e5e7eb] text-[#6b7280] hover:border-[#111827] cursor-pointer"
                                  }
                                `}
                              >
                                <Clock
                                  size={12}
                                  className={
                                    isSelected ? "text-white" : "text-[#9ca3af]"
                                  }
                                />
                                {String(hour).padStart(2, "0")}:00
                              </button>
                            );
                          }),
                        )}
                      </div>
                    </div>
                  )}

                  {/* Selected slot indicator */}
                  <AnimatePresence>
                    {selectedSlotLabel && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="text-body text-[#111827] mt-4 flex items-center gap-2"
                      >
                        <Check size={14} />
                        {selectedSlotLabel}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {/* Trust signals */}
                <div className="flex items-center gap-3 text-body text-[#9ca3af]">
                  <span>15 min</span>
                  <span aria-hidden="true">&middot;</span>
                  <span>Free</span>
                  <span aria-hidden="true">&middot;</span>
                  <span>No commitment</span>
                  <span aria-hidden="true">&middot;</span>
                  <span>Google Meet</span>
                </div>
              </motion.div>

              {/* ── Right Column — Form ── */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.15 }}
              >
                <div className="bg-white border border-[#e5e7eb] rounded-2xl shadow-sm p-8 md:p-10">
                  <div className="mb-8">
                    <h2 className="text-heading font-semibold text-[#111827] mb-1">
                      Book your call
                    </h2>
                    <p className="text-body-lg text-[#9ca3af]">
                      Free &middot; 15 minutes
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Full Name */}
                    <div>
                      <label
                        htmlFor="gs-name"
                        className="block text-caption font-semibold uppercase tracking-[0.15em] text-[#9ca3af] mb-2.5"
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
                        className="w-full bg-[#f9fafb] border border-[#e5e7eb] rounded-xl px-5 py-3.5 text-body-lg text-[#111827] placeholder:text-[#9ca3af] focus:border-[#111827] focus:outline-none transition-colors duration-200"
                      />
                    </div>

                    {/* Work Email */}
                    <div>
                      <label
                        htmlFor="gs-email"
                        className="block text-caption font-semibold uppercase tracking-[0.15em] text-[#9ca3af] mb-2.5"
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
                        className="w-full bg-[#f9fafb] border border-[#e5e7eb] rounded-xl px-5 py-3.5 text-body-lg text-[#111827] placeholder:text-[#9ca3af] focus:border-[#111827] focus:outline-none transition-colors duration-200"
                      />
                    </div>

                    {/* Company */}
                    <div>
                      <label
                        htmlFor="gs-company"
                        className="block text-caption font-semibold uppercase tracking-[0.15em] text-[#9ca3af] mb-2.5"
                      >
                        Company{" "}
                        <span className="normal-case tracking-normal font-normal text-[#6b7280]">
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
                        className="w-full bg-[#f9fafb] border border-[#e5e7eb] rounded-xl px-5 py-3.5 text-body-lg text-[#111827] placeholder:text-[#9ca3af] focus:border-[#111827] focus:outline-none transition-colors duration-200"
                      />
                    </div>

                    {/* Interest chips */}
                    <div>
                      <label className="block text-caption font-semibold uppercase tracking-[0.15em] text-[#9ca3af] mb-3">
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
                                  ? "bg-[#111827] border-[#111827] text-white font-medium"
                                  : "bg-[#f3f4f6] border-[#e5e7eb] text-[#6b7280] hover:border-[#111827] hover:text-[#111827]"
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
                        className="block text-caption font-semibold uppercase tracking-[0.15em] text-[#9ca3af] mb-2.5"
                      >
                        Message{" "}
                        <span className="normal-case tracking-normal font-normal text-[#6b7280]">
                          (optional)
                        </span>
                      </label>
                      <textarea
                        id="gs-message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Tell us about your compliance needs..."
                        rows={3}
                        className="w-full bg-[#f9fafb] border border-[#e5e7eb] rounded-xl px-5 py-3.5 text-body-lg text-[#111827] placeholder:text-[#9ca3af] focus:border-[#111827] focus:outline-none transition-colors duration-200 resize-none"
                      />
                    </div>

                    {/* Error */}
                    <AnimatePresence>
                      {error && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="text-body text-red-600 bg-red-50 border border-red-200 rounded-xl px-5 py-3.5"
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
                      className="w-full flex items-center justify-center gap-2.5 bg-[#111827] hover:bg-black text-white rounded-xl py-3 text-body-lg font-semibold transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          {selectedSlotIso ? "Confirm Booking" : "Send Request"}
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>
                  </form>

                  <p className="text-body text-[#9ca3af] text-center mt-6">
                    Or email us directly at{" "}
                    <a
                      href="mailto:cs@caelex.eu"
                      className="text-[#6b7280] hover:text-[#111827] transition-colors duration-200"
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

export default function GetStartedPage() {
  return (
    <Suspense>
      <GetStartedContent />
    </Suspense>
  );
}
