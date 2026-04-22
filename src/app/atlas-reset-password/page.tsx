"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Eye, EyeOff } from "lucide-react";
import styles from "./atlas-reset-password.module.css";

/**
 * /atlas-reset-password — token-consuming leg of the password-reset
 * flow wired up as part of audit C-4.
 *
 * Same dark stage as /login, /atlas-signup, /atlas-forgot-password.
 * Seed 401 for the light bars so the layout reads as its own page,
 * not a rehash of forgot-password.
 *
 * State machine:
 *   • initial  → has token, waiting for user to enter new password
 *   • success  → password updated, CTA to /login
 *   • invalid  → token missing / expired / already used — CTA back
 *                to /atlas-forgot-password to request a new one
 *
 * The page intentionally doesn't tell the user which failure mode
 * hit them (matches the API's unified error) — that distinction
 * would hand attackers a probing oracle.
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

    // Seed 401 → unique bar layout, continuing the prime sequence
    // 42 / 137 / 211 / 307 / 401 across the auth flow so each page
    // carries its own visual signature.
    let seed = 401;
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

type Stage = "form" | "success" | "invalid";

function ResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [stage, setStage] = useState<Stage>(token ? "form" : "invalid");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Mirrors the signup-page policy strings verbatim so users reading
  // both flows see the same language. Must stay in lockstep with
  // RegisterSchema.password in src/lib/validations.ts.
  const passwordChecks = useMemo(
    () => [
      { label: "12+ chars", met: password.length >= 12 },
      { label: "A–Z", met: /[A-Z]/.test(password) },
      { label: "a–z", met: /[a-z]/.test(password) },
      { label: "0–9", met: /[0-9]/.test(password) },
      { label: "Special", met: /[^a-zA-Z0-9]/.test(password) },
    ],
    [password],
  );
  const allChecksMet = passwordChecks.every((c) => c.met);
  const matches = password.length > 0 && password === confirm;
  const canSubmit = allChecksMet && matches && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!allChecksMet) {
      setError("Password does not meet all requirements.");
      return;
    }
    if (!matches) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data?.code === "INVALID_TOKEN") {
          setStage("invalid");
          return;
        }
        setError(
          data?.error || "We couldn't reset your password. Please try again.",
        );
        setLoading(false);
        return;
      }
      setStage("success");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (stage === "success") {
    return (
      <>
        <div className={styles.successIcon} aria-hidden="true">
          <CheckCircle2 size={28} strokeWidth={1.5} />
        </div>
        <h1>
          Password
          <br />
          updated.
        </h1>
        <p className={styles.sub}>
          You can now sign in to ATLAS with your new password.
        </p>
        <div style={{ textAlign: "center" }}>
          <Link href="/login" className={styles.successCTA}>
            Continue to sign in →
          </Link>
        </div>
      </>
    );
  }

  if (stage === "invalid") {
    return (
      <>
        <h1>
          This link
          <br />
          is not valid.
        </h1>
        <p className={styles.sub}>
          The reset link is missing, expired, or already used. Request a new one
          and we&rsquo;ll send a fresh link.
        </p>
        <div style={{ textAlign: "center" }}>
          <Link href="/atlas-forgot-password" className={styles.successCTA}>
            Request a new link →
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <h1>
        Set a new
        <br />
        password.
      </h1>
      <p className={styles.sub}>
        Choose a strong password for your ATLAS account. This link expires 60
        minutes after it was sent and can only be used once.
      </p>

      <div className={styles.card}>
        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="reset-password">
              New password
            </label>
            <div className={styles.passwordWrap}>
              <input
                id="reset-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a strong password"
                required
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff size={16} strokeWidth={1.5} />
                ) : (
                  <Eye size={16} strokeWidth={1.5} />
                )}
              </button>
            </div>
            {password.length > 0 && (
              <div className={styles.passwordChecks}>
                {passwordChecks.map((c) => (
                  <span
                    key={c.label}
                    className={`${styles.passwordCheck} ${c.met ? styles.passwordCheckMet : ""}`}
                  >
                    {c.met ? "✓" : "·"} {c.label}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className={styles.field} style={{ marginTop: 16 }}>
            <label className={styles.fieldLabel} htmlFor="reset-confirm">
              Confirm password
            </label>
            <input
              id="reset-confirm"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat it"
              required
            />
          </div>

          {error && (
            <div className={styles.errorBanner} role="alert">
              <span className={styles.errorDot} />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className={styles.btn} disabled={!canSubmit}>
            {loading ? (
              <>
                <span className={styles.spinner} />
                Updating…
              </>
            ) : (
              <>
                Update password <span className={styles.arrow}>→</span>
              </>
            )}
          </button>
        </form>
      </div>
    </>
  );
}

export default function AtlasResetPasswordPage() {
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
            <Suspense
              fallback={
                <div style={{ height: 320, opacity: 0.4 }}>Loading…</div>
              }
            >
              <ResetForm />
            </Suspense>
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
