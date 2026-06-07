"use client";

import { Suspense, useState } from "react";
import { getSession, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown, Eye, EyeOff } from "lucide-react";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";
import Logo from "@/components/ui/Logo";
import { analytics } from "@/lib/analytics";
import { safeScholarUrl } from "@/lib/safe-redirect";
import { translateAuthError } from "@/lib/auth-errors";

/**
 * Caelex Scholar — Login.
 *
 * Two-section page in the spirit of palantir.com/platforms/aip:
 *
 *   1. Hero (100vh): the shared landing-page <Navigation fullWidth> (edge-to-edge
 *      liquid-glass bar, Caelex logo) over a full-bleed Apollo 17 lunar-rover
 *      photo (NASA / public domain). A large tight-set SCHOLAR wordmark sits at
 *      the bottom-left, a Palantir-style meta-label column at the bottom-right,
 *      and a "scroll to sign in" cue.
 *   2. Sign-in (scroll down): the actual form on a black backdrop that matches
 *      the grayscale hero — no colour shift.
 *
 * The fixed Navigation keeps a white logo in dark mode, so BOTH sections are
 * dark/black (WCAG 1.4.3).
 *
 * Auth is unchanged: NextAuth credentials + Google, MFA hand-off, callbackUrl
 * + email prefill. safeScholarUrl rejects callbacks outside /scholar so
 * `?callbackUrl=https://evil.com` (or /dashboard) can't smuggle the session.
 *
 * WCAG 2.2 AA:
 *   - decorative hero image has alt="" (1.1.1)
 *   - single <h1> = product name (sr-only "Caelex " for full context)
 *   - sign-in section uses <h2>; every input has an associated <label>
 *   - focus-visible rings on all interactive elements (2.4.7)
 *   - target size ≥24px via py-2.5 on inputs/buttons (2.5.8)
 *   - error region uses role="alert" (4.1.3)
 */

const HERO_SRC = "/scholar-hero.jpg";

interface SignInResult {
  error?: string;
}

// ─── Shared field styles ────────────────────────────────────────────────────

const INPUT_CLS =
  "w-full rounded-lg border border-white/15 bg-white/[0.06] px-3.5 py-2.5 text-[14px] text-white placeholder-white/35 outline-none transition-colors hover:border-white/25 focus-visible:border-white/40 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-0";
const LABEL_CLS = "mb-1.5 block text-[12px] font-medium text-white/70";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // safeScholarUrl restricts callbacks to the Scholar surface — an absolute or
  // off-surface callbackUrl falls back to "/scholar".
  const callbackUrl = safeScholarUrl(
    searchParams.get("callbackUrl"),
    "/scholar",
  );
  const prefilledEmail = searchParams.get("email") ?? "";

  const [email, setEmail] = useState(prefilledEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const initialError = translateAuthError(
    searchParams.get("code") || searchParams.get("error"),
  );
  const [error, setError] = useState(initialError);
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
        const code =
          (result as { code?: string }).code ??
          result.error ??
          "CredentialsSignin";
        setError(translateAuthError(code));
        setLoading(false);
        return;
      }

      analytics.track(
        "login",
        { provider: "credentials" },
        { category: "conversion" },
      );

      // MFA-required accounts go through the challenge first, carrying the
      // same callbackUrl so the final destination is preserved.
      const session = await getSession();
      if (session?.user?.mfaRequired && !session?.user?.mfaVerified) {
        router.push(
          `/auth/mfa-challenge?callbackUrl=${encodeURIComponent(callbackUrl)}`,
        );
      } else {
        // Hard nav — router.push races the cookie write on slow links and can
        // leave the user stuck on /scholar-login with a live session.
        window.location.assign(callbackUrl);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl });
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div>
        <label className={LABEL_CLS} htmlFor="login-email">
          Email
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@university.edu"
          required
          className={INPUT_CLS}
        />
      </div>

      <div>
        <label
          className="mb-1.5 flex items-center justify-between text-[12px] font-medium text-white/70"
          htmlFor="login-password"
        >
          <span>Password</span>
          <Link
            href="/forgot-password"
            className="rounded font-normal text-white/50 transition-colors hover:text-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            Forgot password?
          </Link>
        </label>
        <div className="relative">
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className={`${INPUT_CLS} pr-10`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded text-white/40 transition-colors hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            {showPassword ? (
              <EyeOff size={15} strokeWidth={1.5} />
            ) : (
              <Eye size={15} strokeWidth={1.5} />
            )}
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2.5 text-[13px] text-red-200"
        >
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-[14px] font-semibold text-gray-900 transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <>
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-900/30 border-t-gray-900" />
            Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </button>

      <div className="flex items-center gap-3 py-0.5 text-[11px] text-white/35">
        <span className="h-px flex-1 bg-white/10" />
        or
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-white/15 bg-white/[0.04] px-4 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-[18px] w-[18px]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
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

      <p className="pt-1 text-[11px] leading-relaxed text-white/50">
        University not on Scholar yet?{" "}
        <Link
          href="/scholar-access"
          className="rounded text-white/65 underline-offset-2 transition-colors hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          Request access for your institution
        </Link>
        . By signing in you agree to our{" "}
        <Link
          href="/legal/terms"
          className="rounded text-white/65 underline-offset-2 transition-colors hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          Terms
        </Link>{" "}
        and{" "}
        <Link
          href="/legal/privacy"
          className="rounded text-white/65 underline-offset-2 transition-colors hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          Privacy Policy
        </Link>
        .
      </p>
    </form>
  );
}

/** Palantir-style meta label: a thin left rule + 1–2 small lines. */
function MetaItem({ lines }: { lines: string[] }) {
  return (
    <div className="border-l border-white/25 pl-3 leading-[1.35]">
      {lines.map((line, i) => (
        <p
          key={i}
          className="text-[10px] font-medium uppercase tracking-[0.08em] text-white/55"
        >
          {line}
        </p>
      ))}
    </div>
  );
}

export default function ScholarLoginPage() {
  return (
    <div className="scholar-auth bg-black text-white antialiased">
      {/* Shared landing-page navigation — edge-to-edge, transparent, ghost
          buttons (floats over the hero like Palantir). */}
      <Navigation theme="dark" fullWidth ghost />

      {/* ── Section 1: cinematic hero (full viewport) ───────────────────── */}
      <section className="relative h-screen w-full overflow-hidden">
        <Image
          src={HERO_SRC}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[center_36%] grayscale"
        />
        {/* Contrast scrims: light touch at top (nav) + bottom (wordmark/labels)
            so the photograph stays visible through the middle. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-transparent"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"
        />

        {/* Giant wordmark — bottom-left, tight-set (Palantir "AIP" style). */}
        <h1 className="absolute bottom-7 left-0 z-10 px-5 font-semibold leading-[0.8] tracking-[-0.05em] text-white text-[clamp(56px,12vw,210px)] sm:bottom-9 sm:px-10 lg:px-14">
          <span className="sr-only">Caelex </span>SCHOLAR
        </h1>

        {/* Meta-label column — bottom-right, with a scroll-to-sign-in cue. */}
        <div className="absolute bottom-9 right-5 z-10 hidden flex-col items-start gap-4 md:flex lg:right-14">
          <a
            href="#login"
            className="group flex items-center gap-2 rounded text-[11px] font-medium uppercase tracking-[0.1em] text-white/75 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            Sign in
            <ChevronDown
              size={14}
              className="motion-safe:animate-bounce"
              aria-hidden="true"
            />
          </a>
          <MetaItem lines={["Searchable", "legal database"]} />
          <MetaItem lines={["For universities", "& research"]} />
          <MetaItem lines={["Powered by Atlas"]} />
          <MetaItem lines={["© 2026 Caelex", "Technologies"]} />
        </div>
      </section>

      {/* ── Section 2: sign-in (revealed on scroll) ─────────────────────── */}
      <section
        id="login"
        className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-black px-6 py-28"
      >
        {/* Ambient depth — soft spotlight + faded dot grid, monochrome to match
            the grayscale hero. Decorative only. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
        >
          <div className="absolute left-1/2 top-1/2 h-[820px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.07),transparent_62%)] blur-2xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.05)_1px,transparent_0)] [background-size:26px_26px] [mask-image:radial-gradient(ellipse_55%_50%_at_50%_45%,#000,transparent)] [-webkit-mask-image:radial-gradient(ellipse_55%_50%_at_50%_45%,#000,transparent)]" />
        </div>

        <div className="relative w-full max-w-md">
          {/* Brand mark */}
          <div className="mb-7 flex justify-center">
            <Logo size={40} className="text-white" />
          </div>

          <div className="mb-7 text-center">
            <h2 className="text-[28px] font-semibold leading-[1.1] tracking-[-0.025em] text-white">
              Sign in to Scholar
            </h2>
            <p className="mx-auto mt-2.5 max-w-xs text-[14px] leading-relaxed text-white/55">
              The searchable space-law database for universities and research.
            </p>
          </div>

          {/* Card — hairline gradient border (light from above) + soft glow */}
          <div className="rounded-[20px] bg-gradient-to-b from-white/[0.18] to-white/[0.04] p-px shadow-[0_30px_80px_-24px_rgba(0,0,0,0.85)]">
            <div className="rounded-[19px] bg-[#0A0A0C]/85 p-6 backdrop-blur-2xl sm:p-8">
              <Suspense
                fallback={
                  <div
                    aria-hidden="true"
                    className="h-[340px] animate-pulse rounded-lg bg-white/[0.03]"
                  />
                }
              >
                <LoginForm />
              </Suspense>
            </div>
          </div>

          <p className="mt-7 text-center text-[11px] tracking-[0.06em] text-white/50">
            Caelex Scholar · Powered by Atlas
          </p>
        </div>
      </section>

      {/* Full landing-page footer, dark/inverted to match the Scholar theme. */}
      <Footer theme="dark" />
    </div>
  );
}
