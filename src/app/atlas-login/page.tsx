"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { getSession, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import { analytics } from "@/lib/analytics";
import { safeInternalUrl } from "@/lib/safe-redirect";
import styles from "./atlas-login.module.css";

/**
 * Official brand assets. Drop the authoritative PNGs at these paths
 * in /public/brand/ — see the note at the top of page.tsx for the
 * expected sizes and background treatment.
 */
const CAELEX_ICON_SRC = "/brand/caelex-icon.png";
const CAELEX_WORDMARK_SRC = "/brand/caelex-wordmark.png";

/**
 * Atlas-branded login.
 *
 * Full-viewport dark stage with animated light bars, stars, vignette +
 * a glass card on the right. Uses the existing NextAuth credentials +
 * Google providers. Preserves callbackUrl + email prefill so the
 * /accept-invite flow can deep-link people straight here with their
 * invited address already filled.
 *
 * Keyframes + layout live in login.module.css so nothing leaks out of
 * the /login route.
 */

interface SignInResult {
  error?: string;
}

/**
 * Caelex brand icon — renders the official PNG at /public/brand/caelex-icon.png.
 * We fetch it through next/image so the CDN caches + optimises it per
 * viewport. size prop drives both the rendered box and the optimised
 * source (next/image picks the closest srcset width).
 */
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
  // Wordmark is wider than tall — width is fluid, height is the anchor.
  // Using a generous width budget (height × 5) covers the "caelex"
  // aspect without cropping on common render sizes.
  return (
    <Image
      src={CAELEX_WORDMARK_SRC}
      alt="caelex"
      width={height * 5}
      height={height}
      priority
      style={{ height, width: "auto" }}
    />
  );
}

/**
 * Generates the animated light bars once on mount. Seeded RNG so the
 * layout is deterministic — important for SSR/CSR parity and for
 * visual continuity between reloads (users don't see the bars
 * jumping around).
 */
function LightBars() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const COUNT = 100;
    const W_MIN = 1;
    const W_MAX = 2.4;
    const H_MIN = 15;
    const H_MAX = 62;
    const O_MIN = 0.25;
    const O_MAX = 0.92;
    const HEIGHT_DUR_MIN = 4;
    const HEIGHT_DUR_MAX = 9;
    const LIFE_DUR_MIN = 10;
    const LIFE_DUR_MAX = 22;
    const DELAY_MAX = 16;

    // Seeded pseudo-random — same layout every render. Using a plain
    // LCG instead of crypto because we want deterministic output, not
    // cryptographic strength.
    let seed = 42;
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

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Whitelist: only same-origin relative paths. Absolute URLs like
  // `?callbackUrl=https://evil.com` would otherwise cause router.push
  // to do a full-document navigation to the attacker's origin with
  // the session cookie live. Audit C-2.
  // Default post-login destination for the ATLAS-branded login is the
  // ATLAS app, not the Caelex compliance dashboard. safeInternalUrl
  // keeps us safe from `?callbackUrl=https://evil.com` since
  // router.push with an absolute URL would do a full-document
  // navigation that middleware can't intercept.
  const callbackUrl = safeInternalUrl(
    searchParams.get("callbackUrl"),
    "/atlas",
  );
  const prefilledEmail = searchParams.get("email") ?? "";

  const [email, setEmail] = useState(prefilledEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = (await signIn("credentials", {
        email,
        password,
        redirect: false,
      })) as SignInResult | undefined;

      if (result?.error) {
        setError("Invalid email or password");
        setLoading(false);
        return;
      }

      analytics.track(
        "login",
        { provider: "credentials" },
        { category: "conversion" },
      );

      // MFA-required accounts go through the challenge first, carrying
      // the same callbackUrl so the final destination is preserved.
      const session = await getSession();
      if (session?.user?.mfaRequired && !session?.user?.mfaVerified) {
        router.push(
          `/auth/mfa-challenge?callbackUrl=${encodeURIComponent(callbackUrl)}`,
        );
      } else {
        router.push(callbackUrl);
      }
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    // Google OAuth — can't carry MFA state through the redirect, so we
    // just let NextAuth handle the full flow back to callbackUrl.
    signIn("google", { callbackUrl });
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="login-email">
          Email
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@firm.eu"
          required
        />
      </div>

      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="login-password">
          <span>Password</span>
          <Link href="/atlas-forgot-password">Forgot password?</Link>
        </label>
        <div className={styles.passwordWrap}>
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff size={14} strokeWidth={1.5} />
            ) : (
              <Eye size={14} strokeWidth={1.5} />
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className={styles.errorBanner} role="alert">
          <span className={styles.errorDot} />
          <span>{error}</span>
        </div>
      )}

      <button type="submit" className={styles.btn} disabled={loading}>
        {loading ? (
          <>
            <span className={styles.spinner} />
            Signing in…
          </>
        ) : (
          "Continue"
        )}
      </button>

      <div className={styles.divider}>or</div>

      <button
        type="button"
        className={styles.btnSecondary}
        onClick={handleGoogleSignIn}
      >
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M21.6 12.23c0-.75-.07-1.48-.2-2.18H12v4.13h5.39c-.23 1.24-.94 2.29-2 2.99v2.48h3.24c1.9-1.75 2.97-4.32 2.97-7.42z"
            fill="#f5f5f4"
          />
          <path
            d="M12 22c2.7 0 4.96-.9 6.61-2.43l-3.24-2.48c-.9.6-2.04.96-3.37.96-2.59 0-4.78-1.75-5.56-4.1H3.1v2.57A9.98 9.98 0 0 0 12 22z"
            fill="#f5f5f4"
          />
          <path
            d="M6.44 13.95A5.98 5.98 0 0 1 6.12 12c0-.68.12-1.34.32-1.95V7.48H3.1A10 10 0 0 0 2 12c0 1.61.38 3.13 1.1 4.52l3.34-2.57z"
            fill="#f5f5f4"
          />
          <path
            d="M12 6.36c1.46 0 2.78.5 3.82 1.49l2.86-2.86C16.96 3.42 14.7 2.5 12 2.5A9.98 9.98 0 0 0 3.1 7.48l3.34 2.57C7.22 8.1 9.41 6.36 12 6.36z"
            fill="#f5f5f4"
          />
        </svg>
        Continue with Google
      </button>

      <p className={styles.tiny}>
        Invited to a firm? <Link href="/atlas-signup">Redeem your invite</Link>
        <br />
        New to ATLAS? <Link href="/atlas-access">Book a free demo</Link>
        <br />
        By continuing you agree to our <Link href="/legal/terms">
          Terms
        </Link>{" "}
        and <Link href="/legal/privacy">Privacy Policy</Link>.
      </p>
    </form>
  );
}

export default function LoginPage() {
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
          {/* Wordmark carries the brand on its own — no icon in the
              top-left lockup. Height 28 keeps a strong presence next
              to the 104px 'Navigate' headline without competing with
              it. */}
          <CaelexWordmark height={28} />
        </Link>

        <div className={styles.center}>
          <div className={styles.headline}>
            <h1>
              Navigate
              <br />
              the orbital
              <br />
              frontier.
            </h1>
            <p>
              The searchable space law database for law firms. Continuously
              updated, always current.
            </p>
          </div>

          <div>
            <div className={styles.card}>
              <h2>Sign in to ATLAS</h2>
              <p className={styles.kicker}>Continue to your workspace.</p>

              <Suspense
                fallback={
                  <div style={{ height: 320, opacity: 0.4 }}>Loading…</div>
                }
              >
                <LoginForm />
              </Suspense>
            </div>
          </div>
        </div>

        <div className={styles.productLockup}>
          <CaelexMark size={22} className={styles.caelexMark} />
          <span className={styles.atlasName}>ATLAS</span>
          <span className={styles.sep} />
          {/* 'by Caelex' text replaced with the actual wordmark so the
              whole lockup reads as one branded unit. 'by' stays as
              typography — it's a preposition, not part of the logo. */}
          <span className={styles.attribution}>by</span>
          <CaelexWordmark height={14} />
        </div>
      </main>
    </div>
  );
}
