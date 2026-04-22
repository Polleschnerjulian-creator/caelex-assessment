"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Globe,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import styles from "./atlas-access.module.css";

/**
 * /atlas-access — sales-assisted onboarding for ATLAS.
 *
 * Access to ATLAS is manually granted after an intro call with Caelex.
 * This page is the public entry point: prospects pick a slot, submit
 * their firm details, and the request flows into the existing
 * DemoRequest + Booking + CRM pipeline (tagged source="atlas_access"
 * so admins can distinguish atlas prospects from generic platform
 * demos in the CRM dashboard).
 *
 * The calendar, slot grid, and form are rendered fully in-house so
 * the dark ATLAS brand is preserved end-to-end (no embedded third-
 * party widget that would break the aesthetic).
 *
 * Seed 307 for the light-bar layout — next prime after the sequence
 * used on /login (42), /atlas-signup (137), and /atlas-forgot-password
 * (211), so each page carries its own visual signature.
 */

const CAELEX_ICON_SRC = "/brand/caelex-icon.png";
const CAELEX_WORDMARK_SRC = "/brand/caelex-wordmark.png";

/** Europe/Berlin — Caelex HQ. All slots are rendered in this zone. */
const TIMEZONE = "Europe/Berlin";

const ROLE_OPTIONS = [
  { value: "", label: "Select your role" },
  { value: "partner", label: "Partner" },
  { value: "counsel", label: "Counsel" },
  { value: "associate", label: "Associate" },
  { value: "in-house", label: "In-house counsel" },
  { value: "paralegal", label: "Paralegal" },
  { value: "operations", label: "Operations / Knowledge management" },
  { value: "other", label: "Other" },
];

const TEAM_SIZE_OPTIONS = [
  { value: "", label: "Select team size" },
  { value: "1-5", label: "1–5" },
  { value: "6-20", label: "6–20" },
  { value: "21-50", label: "21–50" },
  { value: "51-200", label: "51–200" },
  { value: "200+", label: "200+" },
];

/** 12 slots: mornings 09:00-11:30 + afternoons 14:00-16:30, lunch skipped. */
const TIME_SLOTS = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
];

function CaelexMark({ size, className }: { size: number; className?: string }) {
  return (
    <Image
      src={CAELEX_ICON_SRC}
      alt="Caelex"
      width={size}
      height={size}
      priority
      className={className}
    />
  );
}

function CaelexWordmark({ height = 22 }: { height?: number }) {
  return (
    <Image
      src={CAELEX_WORDMARK_SRC}
      alt="caelex"
      width={height * 5}
      height={height}
      priority
      style={{ height, width: "auto", display: "block" }}
    />
  );
}

function LightBars() {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const COUNT = 100;
    const W_MIN = 1,
      W_MAX = 2.4;
    const H_MIN = 15,
      H_MAX = 62;
    const O_MIN = 0.25,
      O_MAX = 0.92;
    const HEIGHT_DUR_MIN = 4,
      HEIGHT_DUR_MAX = 9;
    const LIFE_DUR_MIN = 10,
      LIFE_DUR_MAX = 22;
    const DELAY_MAX = 16;

    // Seed 307 → distinct from /login (42), /atlas-signup (137), and
    // /atlas-forgot-password (211). Prime-number sequence keeps each
    // page's light-bar layout visually unique.
    let seed = 307;
    const rnd = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    container.innerHTML = "";
    for (let i = 0; i < COUNT; i++) {
      const bar = document.createElement("span");
      bar.className = styles.bar;
      const w = W_MIN + rnd() * (W_MAX - W_MIN);
      const h = H_MIN + rnd() * (H_MAX - H_MIN);
      const t = rnd() * (100 - h);
      const l = rnd() * 100;
      const o = O_MIN + rnd() * (O_MAX - O_MIN);
      const heightDur =
        HEIGHT_DUR_MIN + rnd() * (HEIGHT_DUR_MAX - HEIGHT_DUR_MIN);
      const lifeDur = LIFE_DUR_MIN + rnd() * (LIFE_DUR_MAX - LIFE_DUR_MIN);
      const delay = rnd() * DELAY_MAX;
      bar.style.setProperty("--w", `${w.toFixed(2)}px`);
      bar.style.setProperty("--h", `${h.toFixed(1)}%`);
      bar.style.setProperty("--t", `${t.toFixed(1)}%`);
      bar.style.setProperty("--l", `${l.toFixed(2)}%`);
      bar.style.setProperty("--o", o.toFixed(3));
      bar.style.setProperty("--dur", `${heightDur.toFixed(2)}s`);
      bar.style.setProperty("--life", `${lifeDur.toFixed(2)}s`);
      bar.style.setProperty("--delay", `-${delay.toFixed(2)}s`);
      container.appendChild(bar);
    }
    return () => {
      if (container) container.innerHTML = "";
    };
  }, []);
  return <div ref={containerRef} className={styles.bars} />;
}

interface Weekday {
  /** ISO date string YYYY-MM-DD (Berlin wall-clock day). */
  isoDate: string;
  /** Abbreviated day-of-week, e.g. "MON". */
  dow: string;
  /** Day of month, e.g. "14". */
  day: string;
  /** Abbreviated month, e.g. "APR". */
  month: string;
  /** Pretty full label for the summary widget. */
  longLabel: string;
}

/**
 * Builds the next `count` weekdays (skipping Sat/Sun) starting from
 * tomorrow. Rendered in the Europe/Berlin timezone so everyone sees
 * the same wall-clock slots regardless of their own zone — the
 * intro call happens on Berlin business hours.
 */
function buildUpcomingWeekdays(count: number): Weekday[] {
  const result: Weekday[] = [];
  const now = new Date();
  // Start from tomorrow so users can't book same-day (no time to
  // prep on our side). Move forward until we've collected `count`
  // weekdays.
  const cursor = new Date(now);
  cursor.setUTCDate(cursor.getUTCDate() + 1);

  const dowFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    weekday: "short",
  });
  const dayFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    day: "2-digit",
  });
  const monthFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    month: "short",
  });
  const longFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const ymdFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  // Guard against infinite loops in edge cases (e.g. DST transitions).
  let safety = 0;
  while (result.length < count && safety < 60) {
    safety += 1;
    const dow = dowFormatter.format(cursor);
    // Skip weekends — sales calls happen on weekdays.
    if (dow !== "Sat" && dow !== "Sun") {
      result.push({
        isoDate: ymdFormatter.format(cursor),
        dow: dow.toUpperCase(),
        day: dayFormatter.format(cursor),
        month: monthFormatter.format(cursor).toUpperCase(),
        longLabel: longFormatter.format(cursor),
      });
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return result;
}

/**
 * Converts a Berlin wall-clock slot (YYYY-MM-DD + HH:mm) into a UTC
 * ISO string. We build the server-side request with UTC so the API
 * can reconcile against Google Calendar without any timezone-math
 * ambiguity.
 *
 * Strategy: construct an ISO string assuming UTC, compute the
 * Europe/Berlin offset at that instant via Intl, then subtract it.
 * A library like date-fns-tz would do the same — we're avoiding an
 * extra dep on a page this brand-critical.
 */
function berlinWallClockToUtcIso(isoDate: string, hhmm: string): string {
  const [yyyy, mm, dd] = isoDate.split("-").map(Number);
  const [hh, min] = hhmm.split(":").map(Number);

  // Treat the wall-clock as UTC first, then shift back by the Berlin
  // offset (CET=+01:00 or CEST=+02:00) at that moment.
  const utcGuess = Date.UTC(yyyy, (mm ?? 1) - 1, dd ?? 1, hh ?? 0, min ?? 0);

  // Offset of Europe/Berlin at the guess instant, in minutes.
  const berlinParts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
    .formatToParts(new Date(utcGuess))
    .reduce<Record<string, string>>((acc, p) => {
      if (p.type !== "literal") acc[p.type] = p.value;
      return acc;
    }, {});

  const berlinAsUtcMs = Date.UTC(
    Number(berlinParts.year),
    Number(berlinParts.month) - 1,
    Number(berlinParts.day),
    Number(berlinParts.hour) === 24 ? 0 : Number(berlinParts.hour),
    Number(berlinParts.minute),
    Number(berlinParts.second),
  );

  const offsetMinutes = (berlinAsUtcMs - utcGuess) / 60_000;
  const actualUtcMs = utcGuess - offsetMinutes * 60_000;
  return new Date(actualUtcMs).toISOString();
}

type Stage = "form" | "success";

interface ConfirmedSlot {
  longLabel: string;
  time: string;
}

export default function AtlasAccessPage() {
  const weekdays = useMemo(() => buildUpcomingWeekdays(6), []);

  const [stage, setStage] = useState<Stage>("form");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [firm, setFirm] = useState("");
  const [role, setRole] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [notes, setNotes] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState<ConfirmedSlot | null>(null);

  const activeDay = useMemo(
    () => weekdays.find((d) => d.isoDate === selectedDate) ?? null,
    [weekdays, selectedDate],
  );

  const slotLabel = useMemo(() => {
    if (!activeDay || !selectedTime) return null;
    return `${activeDay.longLabel} · ${selectedTime} (CET/CEST)`;
  }, [activeDay, selectedTime]);

  const canSubmit =
    !!selectedDate &&
    !!selectedTime &&
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    firm.trim().length > 0 &&
    role.length > 0 &&
    !loading;

  const clearSlot = () => {
    setSelectedTime("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!canSubmit || !activeDay) {
      setError("Please fill in all required fields and pick a slot.");
      return;
    }
    setLoading(true);
    try {
      const scheduledAtIso = berlinWallClockToUtcIso(
        activeDay.isoDate,
        selectedTime,
      );
      const res = await fetch("/api/atlas-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          firm,
          role,
          teamSize: teamSize || undefined,
          notes: notes || undefined,
          scheduledAtIso,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data?.code === "SLOT_UNAVAILABLE") {
          setError(
            "That slot was just taken. Please pick a different time above.",
          );
          setSelectedTime("");
        } else {
          setError(
            data?.error ||
              "We couldn't submit your request. Please try again in a moment.",
          );
        }
        setLoading(false);
        return;
      }
      setConfirmed({
        longLabel: activeDay.longLabel,
        time: selectedTime,
      });
      setStage("success");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Friendly month header — pulls from the selected day, or the first
  // day in the list if nothing is picked yet, so users always see
  // which month they're looking at.
  const monthHeader = useMemo(() => {
    const ref = activeDay ?? weekdays[0];
    if (!ref) return "";
    const [yyyy, mm] = ref.isoDate.split("-").map(Number);
    return new Intl.DateTimeFormat("en-GB", {
      month: "long",
      year: "numeric",
    }).format(new Date(Date.UTC(yyyy ?? 0, (mm ?? 1) - 1, 1)));
  }, [activeDay, weekdays]);

  return (
    <div className={styles.root}>
      <div className={styles.stage}>
        <div className={styles.atmosphere} />
        <div className={styles.stars} />
        <LightBars />
        <div className={styles.slats} />
        <div className={styles.vignette} />
      </div>

      <main className={styles.content}>
        <Link
          className={styles.brandLockup}
          href="https://caelex.eu"
          aria-label="Caelex home"
        >
          <CaelexWordmark height={28} />
        </Link>

        <div className={styles.center}>
          {/* Left column — pitch + calendar */}
          <div className={styles.pitch}>
            <div className={styles.eyebrow}>
              <span className={styles.eyebrowDot} />
              Invite-only access
            </div>
            <h1>
              Get access
              <br />
              to ATLAS.
            </h1>
            <p>
              We onboard law firms one at a time. Book a 20-minute intro with
              Caelex and, once we&rsquo;ve confirmed fit, you&rsquo;ll receive
              personal workspace credentials — usually within one business day.
            </p>

            <ul className={styles.bullets}>
              <li className={styles.bullet}>
                <Sparkles size={15} className={styles.bulletIcon} />
                <span>
                  <strong>Personal walkthrough</strong> of ATLAS tailored to
                  your practice — space, defence, satellite, or cross-border.
                </span>
              </li>
              <li className={styles.bullet}>
                <ShieldCheck size={15} className={styles.bulletIcon} />
                <span>
                  <strong>Compliance-grade access</strong> — every seat is
                  provisioned manually with an audit trail, per-firm workspace,
                  and verified user identity.
                </span>
              </li>
              <li className={styles.bullet}>
                <Globe size={15} className={styles.bulletIcon} />
                <span>
                  <strong>Your jurisdictions, your language.</strong>{" "}
                  We&rsquo;ll make sure the sources you rely on are live before
                  you get the invite.
                </span>
              </li>
            </ul>

            <section className={styles.calendar}>
              <div className={styles.calendarHeader}>
                <div className={styles.calendarTitle}>
                  <span className={styles.calendarLabel}>
                    <CalendarIcon
                      size={10}
                      style={{
                        marginRight: 4,
                        verticalAlign: "middle",
                      }}
                    />
                    Choose a day
                  </span>
                  <span className={styles.calendarMonth}>{monthHeader}</span>
                </div>
                <span className={styles.tzChip}>
                  <Clock size={11} />
                  Europe/Berlin (CET/CEST)
                </span>
              </div>

              <div className={styles.dateRow}>
                {weekdays.map((d) => (
                  <button
                    key={d.isoDate}
                    type="button"
                    className={styles.dateCard}
                    data-active={selectedDate === d.isoDate}
                    onClick={() => {
                      setSelectedDate(d.isoDate);
                      // Reset time when switching day so the stale
                      // selection can't slip through.
                      setSelectedTime("");
                    }}
                  >
                    <span className={styles.dateDow}>{d.dow}</span>
                    <span className={styles.dateDay}>{d.day}</span>
                    <span className={styles.dateMonth}>{d.month}</span>
                  </button>
                ))}
              </div>

              {selectedDate && (
                <div className={styles.slotGrid}>
                  {TIME_SLOTS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={styles.slot}
                      data-active={selectedTime === t}
                      onClick={() => setSelectedTime(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Right column — form card */}
          <div>
            {stage === "form" ? (
              <div className={styles.card}>
                <h2>Request access</h2>
                <p className={styles.kicker}>
                  Tell us about your firm — we&rsquo;ll confirm your slot within
                  a few hours.
                </p>

                <div
                  className={styles.slotSummary}
                  data-filled={Boolean(slotLabel)}
                >
                  <CalendarIcon size={16} className={styles.slotSummaryIcon} />
                  <div className={styles.slotSummaryBody}>
                    <span className={styles.slotSummaryLabel}>
                      Selected slot
                    </span>
                    <span className={styles.slotSummaryValue}>
                      {slotLabel ??
                        "Pick a day and time on the left to continue."}
                    </span>
                  </div>
                  {slotLabel && (
                    <button
                      type="button"
                      className={styles.slotClear}
                      onClick={clearSlot}
                      aria-label="Clear selected slot"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <form onSubmit={handleSubmit} noValidate>
                  <div className={styles.fieldRow}>
                    <div className={styles.field}>
                      <label
                        className={styles.fieldLabel}
                        htmlFor="access-name"
                      >
                        Full name
                      </label>
                      <input
                        id="access-name"
                        type="text"
                        autoComplete="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Anna Schmidt"
                        required
                      />
                    </div>
                    <div className={styles.field}>
                      <label
                        className={styles.fieldLabel}
                        htmlFor="access-firm"
                      >
                        Firm
                      </label>
                      <input
                        id="access-firm"
                        type="text"
                        autoComplete="organization"
                        value={firm}
                        onChange={(e) => setFirm(e.target.value)}
                        placeholder="Schmidt & Partner"
                        required
                      />
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.fieldLabel} htmlFor="access-email">
                      Work email
                    </label>
                    <input
                      id="access-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="anna@firm.eu"
                      required
                    />
                  </div>

                  <div className={styles.fieldRow}>
                    <div className={styles.field}>
                      <label
                        className={styles.fieldLabel}
                        htmlFor="access-role"
                      >
                        Your role
                      </label>
                      <select
                        id="access-role"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        required
                      >
                        {ROLE_OPTIONS.map((o) => (
                          <option
                            key={o.value}
                            value={o.value}
                            disabled={o.value === ""}
                          >
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.field}>
                      <label
                        className={styles.fieldLabel}
                        htmlFor="access-team"
                      >
                        Team size
                      </label>
                      <select
                        id="access-team"
                        value={teamSize}
                        onChange={(e) => setTeamSize(e.target.value)}
                      >
                        {TEAM_SIZE_OPTIONS.map((o) => (
                          <option
                            key={o.value}
                            value={o.value}
                            disabled={o.value === ""}
                          >
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.fieldLabel} htmlFor="access-notes">
                      Anything we should know? (optional)
                    </label>
                    <textarea
                      id="access-notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Jurisdictions you focus on, current research pain points, matters we could help with…"
                      maxLength={1000}
                    />
                  </div>

                  {error && (
                    <div className={styles.errorBanner} role="alert">
                      <span className={styles.errorDot} />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className={styles.btn}
                    disabled={!canSubmit}
                  >
                    {loading ? (
                      <>
                        <span className={styles.spinner} />
                        Sending request…
                      </>
                    ) : (
                      <>
                        Book intro call <span className={styles.arrow}>→</span>
                      </>
                    )}
                  </button>

                  <p className={styles.fineprint}>
                    By submitting you agree to our{" "}
                    <Link href="/legal/privacy">Privacy Policy</Link>. We
                    won&rsquo;t share your details with anyone outside Caelex.
                  </p>
                </form>
              </div>
            ) : (
              <div className={`${styles.card} ${styles.successCard}`}>
                <div className={styles.successIcon} aria-hidden="true">
                  <CheckCircle2 size={28} strokeWidth={1.5} />
                </div>
                <h2>Your intro is booked.</h2>
                <p>
                  Thanks, {name.split(" ")[0] || "there"}. We&rsquo;ve sent a
                  confirmation to{" "}
                  <strong style={{ color: "var(--text)" }}>{email}</strong> and
                  a calendar invite is on its way.
                </p>
                {confirmed && (
                  <div className={styles.successSlot}>
                    <span className={styles.successSlotLabel}>When</span>
                    <span className={styles.successSlotValue}>
                      {confirmed.longLabel} · {confirmed.time} (CET/CEST)
                    </span>
                  </div>
                )}
                <p style={{ marginTop: 12 }}>
                  We&rsquo;ll review your firm&rsquo;s fit on the call. Once
                  approved, your ATLAS workspace is usually provisioned within
                  one business day.
                </p>
                <div className={styles.successActions}>
                  <Link href="https://caelex.eu">Back to caelex.eu →</Link>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={styles.productLockup}>
          <CaelexMark size={22} className={styles.caelexMark} />
          <span className={styles.atlasName}>ATLAS</span>
          <span className={styles.sep} />
          <span className={styles.attribution}>by</span>
          <CaelexWordmark height={14} />
        </div>
      </main>
    </div>
  );
}
