"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Mail } from "lucide-react";
import styles from "./atlas-forgot-password.module.css";

/**
 * /atlas-forgot-password — Atlas-branded password-reset request page.
 *
 * Same dark stage as /login and /atlas-signup. Single centred panel
 * with a two-state flow:
 *
 *   1. form     → user enters email, POST /api/auth/forgot-password
 *   2. success  → "check your inbox" confirmation (no account-enum
 *                 leak — the API always responds 200 whether or not
 *                 an account exists for the given email)
 *
 * The success panel appears even on API errors so a failing request
 * doesn't leak whether the email exists. Surface-level failures
 * (e.g. network) still show an inline error so the user can retry.
 */

const CAELEX_ICON_SRC = "/brand/caelex-icon.png";
const CAELEX_WORDMARK_SRC = "/brand/caelex-wordmark.png";

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

    // Seed 211 → distinct from /login (42) and /atlas-signup (137) so
    // the bar layout is its own visual signature per page.
    let seed = 211;
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

type Stage = "form" | "success";

export default function AtlasForgotPasswordPage() {
  const [stage, setStage] = useState<Stage>("form");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok && res.status !== 200) {
        // Surface-level failures only — server logic always returns 200
        // to avoid account enumeration, so a non-200 means the request
        // itself broke (malformed, rate-limited, or 5xx).
        const data = await res.json().catch(() => ({}));
        setError(
          data?.error ||
            "We couldn't send the reset link right now. Please try again.",
        );
        setLoading(false);
        return;
      }
      setSubmittedEmail(email);
      setStage("success");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStage("form");
    setError("");
  };

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
          <div className={styles.panel}>
            <div className={styles.eyebrow}>
              <Link href="/login" className={styles.backLink}>
                <span className={styles.backLinkIcon} aria-hidden="true">
                  <ArrowLeft size={14} strokeWidth={2} />
                </span>
                Back to sign in
              </Link>
            </div>

            {stage === "form" ? (
              <>
                <h1>
                  Reset your
                  <br />
                  password.
                </h1>
                <p className={styles.sub}>
                  Enter the email for your ATLAS account. We&rsquo;ll send you a
                  secure link to set a new password.
                </p>

                <div className={styles.card}>
                  <form onSubmit={handleSubmit} noValidate>
                    <div className={styles.field}>
                      <label
                        className={styles.fieldLabel}
                        htmlFor="forgot-email"
                      >
                        Email
                      </label>
                      <input
                        id="forgot-email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@firm.eu"
                        required
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
                      disabled={loading || !email.trim()}
                    >
                      {loading ? (
                        <>
                          <span className={styles.spinner} />
                          Sending link…
                        </>
                      ) : (
                        <>
                          Send reset link{" "}
                          <span className={styles.arrow}>→</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                <div className={styles.belowCard}>
                  <span>
                    Don&rsquo;t have an account?{" "}
                    <Link href="/atlas-signup">Create one</Link>
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className={styles.successIcon} aria-hidden="true">
                  <Mail size={28} strokeWidth={1.5} />
                </div>
                <h1>
                  Check your
                  <br />
                  inbox.
                </h1>
                <p className={styles.sub}>
                  If an ATLAS account exists for{" "}
                  <span className={styles.emailEcho}>
                    {submittedEmail || "your email"}
                  </span>
                  , we just sent a password-reset link. It expires in 60
                  minutes.
                </p>

                <div className={styles.belowCard}>
                  <span>
                    Didn&rsquo;t receive it? Check your spam folder, or{" "}
                    <button type="button" onClick={resetForm}>
                      try a different email
                    </button>
                    .
                  </span>
                </div>
              </>
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
