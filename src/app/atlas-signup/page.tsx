"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff, Mail } from "lucide-react";
import {
  ALL_SOURCES,
  ALL_AUTHORITIES,
  getAvailableJurisdictions,
} from "@/data/legal-sources";
import styles from "./atlas-signup.module.css";

/**
 * /atlas-signup — Atlas-branded create-account page.
 *
 * Same dark stage as /login, but the left column carries a pitch +
 * three live stat chips derived from the legal-source barrel. The
 * stats compile to literal numbers at build time (no runtime fetch)
 * so the page has zero network dependencies on first paint.
 *
 * Supports the invite-redemption flow via ?inviteToken=… &email=…
 * query params: the invite banner replaces the org field and locks
 * the email to the address the invite was addressed to.
 *
 * The generic /signup page remains for dashboard-first signups; this
 * one exists specifically for Atlas onboarding and reflects the Atlas
 * brand (dark stage, caelex wordmark, ATLAS lockup footer).
 */

/** Live inventory — evaluated at module load from static data files. */
const ATLAS_STATS = {
  sources: ALL_SOURCES.length,
  authorities: ALL_AUTHORITIES.length,
  jurisdictions: getAvailableJurisdictions().length,
};

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

    // Different seed from /login so the two pages have distinct
    // bar layouts — feels less like a clone when users navigate
    // between them.
    let seed = 137;
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

interface InviteContext {
  organizationName: string;
  inviterName: string;
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("inviteToken") ?? "";
  const prefilledEmail = searchParams.get("email") ?? "";
  const isInvite = Boolean(inviteToken);

  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [email, setEmail] = useState(prefilledEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptAnalytics, setAcceptAnalytics] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [inviteCtx, setInviteCtx] = useState<InviteContext | null>(null);

  // Validate the invite token on mount and lock the email to the
  // invited address. Same contract as /signup — see the invite-info
  // endpoint for the shape.
  useEffect(() => {
    if (!inviteToken) return;
    let cancelled = false;
    fetch(
      `/api/atlas/team/invite-info?token=${encodeURIComponent(inviteToken)}`,
    )
      .then(async (res) => {
        if (!res.ok) {
          if (!cancelled) router.replace(`/accept-invite?token=${inviteToken}`);
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setInviteCtx({
            organizationName: data.organizationName,
            inviterName: data.inviterName,
          });
          if (data.email) setEmail(data.email);
        }
      })
      .catch(() => {
        if (!cancelled) router.replace(`/accept-invite?token=${inviteToken}`);
      });
    return () => {
      cancelled = true;
    };
  }, [inviteToken, router]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!allChecksMet) {
      setError("Password does not meet all requirements");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          organization: isInvite ? undefined : organization,
          acceptTerms,
          acceptAnalytics,
          inviteToken: isInvite ? inviteToken : undefined,
          intent: "atlas",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.details && Array.isArray(data.details)) {
          setError(data.details.join(". "));
        } else {
          setError(data.error || "Something went wrong");
        }
        setLoading(false);
        return;
      }
      // Auto sign-in after successful account creation
      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (signInResult && "error" in signInResult && signInResult.error) {
        setError("Account created but could not sign in");
        setLoading(false);
        return;
      }
      // Hard nav so the freshly written session cookie is included in the
      // GET that follows. router.push races the cookie write on slow
      // connections and the user gets stuck on /atlas-signup with a
      // valid cookie they can't see.
      window.location.assign("/atlas");
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    // Google OAuth doesn't carry inviteToken through the redirect —
    // Atlas access still requires an active membership, so Google-
    // signed-up users will land on /atlas-no-access until invited.
    signIn("google", { callbackUrl: "/atlas" });
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <button
        type="button"
        className={styles.btnSecondary}
        onClick={handleGoogleSignIn}
      >
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.97 10.97 0 0 0 1 12c0 1.77.42 3.44 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
            fill="#EA4335"
          />
        </svg>
        Continue with Google
      </button>

      <div className={styles.divider}>or</div>

      {isInvite && inviteCtx && (
        <div className={styles.inviteBanner}>
          <Mail size={14} style={{ marginTop: 2, flexShrink: 0 }} />
          <span>
            Invited by <strong>{inviteCtx.inviterName}</strong> to{" "}
            <strong>{inviteCtx.organizationName}</strong>. Your account will be
            added to this organisation automatically.
          </span>
        </div>
      )}

      <div className={isInvite ? styles.field : styles.fieldRow}>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="signup-name">
            Full Name
          </label>
          <input
            id="signup-name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Max Mustermann"
            required
          />
        </div>
        {!isInvite && (
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="signup-org">
              Organization
            </label>
            <input
              id="signup-org"
              type="text"
              autoComplete="organization"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="Optional"
            />
          </div>
        )}
      </div>

      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="signup-email">
          Email
        </label>
        <input
          id="signup-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => (isInvite ? undefined : setEmail(e.target.value))}
          readOnly={isInvite}
          placeholder="you@firm.eu"
          required
        />
        {isInvite && (
          <span className={styles.fieldHint}>
            Locked to the invited address.
          </span>
        )}
      </div>

      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="signup-password">
          Password
        </label>
        <div className={styles.passwordWrap}>
          <input
            id="signup-password"
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

      <div className={styles.consent}>
        <label className={styles.consentItem}>
          <input
            type="checkbox"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            required
          />
          <span>
            I accept the <Link href="/legal/terms">Terms</Link> and{" "}
            <Link href="/legal/privacy">Privacy Policy</Link>{" "}
            <span className={styles.required}>*</span>
          </span>
        </label>
        <label className={styles.consentItem}>
          <input
            type="checkbox"
            checked={acceptAnalytics}
            onChange={(e) => setAcceptAnalytics(e.target.checked)}
          />
          <span>I consent to anonymous usage analytics (optional)</span>
        </label>
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
        disabled={loading || !acceptTerms || !allChecksMet}
      >
        {loading ? (
          <>
            <span className={styles.spinner} />
            Creating account…
          </>
        ) : (
          <>
            Create Account <span className={styles.arrow}>→</span>
          </>
        )}
      </button>

      <p className={styles.signinHint}>
        Already have an account? <Link href="/atlas-login">Sign in</Link>
      </p>
    </form>
  );
}

export default function AtlasSignupPage() {
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
          href="https://www.caelex.eu"
          aria-label="Caelex home"
        >
          <CaelexWordmark height={28} />
        </Link>

        <div className={styles.center}>
          <div className={styles.headline}>
            <h1>
              Start your
              <br />
              compliance
              <br />
              journey.
            </h1>
            <p>
              The searchable space law database for law firms. Continuously
              updated, always current.
            </p>
            <div className={styles.stats}>
              <div className={styles.stat}>
                <span className={styles.num}>{ATLAS_STATS.sources}</span>
                <span className={styles.statLabel}>
                  Legal
                  <br />
                  sources
                </span>
              </div>
              <div className={styles.stat}>
                <span className={styles.num}>{ATLAS_STATS.authorities}</span>
                <span className={styles.statLabel}>
                  Authorities
                  <br />
                  tracked
                </span>
              </div>
              <div className={styles.stat}>
                <span className={styles.num}>{ATLAS_STATS.jurisdictions}</span>
                <span className={styles.statLabel}>
                  Jurisdictions
                  <br />
                  covered
                </span>
              </div>
            </div>
          </div>

          <div>
            <div className={styles.card}>
              <h2>Create your account</h2>
              <p className={styles.kicker}>
                Get started with ATLAS in minutes.
              </p>
              <Suspense
                fallback={
                  <div style={{ height: 420, opacity: 0.4 }}>Loading…</div>
                }
              >
                <SignupForm />
              </Suspense>
            </div>
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
