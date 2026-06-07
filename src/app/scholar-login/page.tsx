"use client";

import { Suspense, useState } from "react";
import { getSession, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import { analytics } from "@/lib/analytics";
import { safeScholarUrl } from "@/lib/safe-redirect";
import { translateAuthError } from "@/lib/auth-errors";

/**
 * Caelex Scholar — Login.
 *
 * Cinematic full-bleed hero (Apollo 17 lunar-rover photograph, NASA /
 * public domain) with a huge tight-set "SCHOLAR" wordmark lower-left, a
 * glass login panel beneath it, and a Palantir-style meta-label column
 * bottom-right. Layered gradients double as the contrast scrim so text
 * stays legible over the photo (WCAG 1.4.3).
 *
 * Auth is unchanged from the previous build: NextAuth credentials +
 * Google providers, MFA hand-off, callbackUrl + email prefill. The
 * destination is the Scholar surface; safeScholarUrl rejects callbacks
 * outside /scholar so `?callbackUrl=https://evil.com` (or /dashboard)
 * can't smuggle the session anywhere else.
 *
 * WCAG 2.2 AA:
 *   - lang="de" inherited from <html>; copy is German to match the app
 *   - decorative hero image has alt="" (1.1.1)
 *   - <h1> = product name (sr-only "Caelex " prefix for full context)
 *   - every input has an associated <label>; show/hide toggle is labelled
 *   - focus-visible rings on all interactive elements (2.4.7)
 *   - target size ≥24px via py-2.5 on inputs/buttons (2.5.8)
 *   - error region uses role="alert" (4.1.3)
 */

const CAELEX_WORDMARK_SRC = "/brand/caelex-wordmark.png";
const HERO_SRC = "/scholar-hero.jpg";

interface SignInResult {
  error?: string;
}

/** Caelex wordmark — official PNG, optimised + cached via next/image. */
function CaelexWordmark({ height = 24 }: { height?: number }) {
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

// ─── Shared field styles ────────────────────────────────────────────────────

const INPUT_CLS =
  "w-full rounded-lg border border-white/15 bg-white/[0.06] px-3.5 py-2.5 text-[14px] text-white placeholder-white/35 outline-none transition-colors hover:border-white/25 focus-visible:border-white/40 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-0";
const LABEL_CLS = "mb-1.5 block text-[12px] font-medium text-white/70";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // safeScholarUrl restricts callbacks to the Scholar surface — an
  // absolute or off-surface callbackUrl falls back to "/scholar".
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
        // Hard nav — router.push races the cookie write on slow links and
        // can leave the user stuck on /scholar-login with a live session.
        window.location.assign(callbackUrl);
      }
    } catch {
      setError("Etwas ist schiefgelaufen. Bitte erneut versuchen.");
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
          E-Mail
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="du@universitaet.eu"
          required
          className={INPUT_CLS}
        />
      </div>

      <div>
        <label
          className="mb-1.5 flex items-center justify-between text-[12px] font-medium text-white/70"
          htmlFor="login-password"
        >
          <span>Passwort</span>
          <Link
            href="/forgot-password"
            className="font-normal text-white/50 transition-colors hover:text-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded"
          >
            Passwort vergessen?
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
            aria-label={
              showPassword ? "Passwort verbergen" : "Passwort anzeigen"
            }
            className="absolute right-2 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded text-white/40 transition-colors hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
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
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-[14px] font-semibold text-gray-900 transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      >
        {loading ? (
          <>
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-900/30 border-t-gray-900" />
            Anmeldung…
          </>
        ) : (
          "Anmelden"
        )}
      </button>

      <div className="flex items-center gap-3 py-0.5 text-[11px] text-white/35">
        <span className="h-px flex-1 bg-white/10" />
        oder
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
        Mit Google fortfahren
      </button>

      <p className="pt-1 text-[11px] leading-relaxed text-white/40">
        Universität noch nicht dabei?{" "}
        <Link
          href="/scholar-access"
          className="text-white/65 underline-offset-2 transition-colors hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded"
        >
          Zugang für deine Institution anfragen
        </Link>
        . Mit der Anmeldung stimmst du unseren{" "}
        <Link
          href="/legal/terms"
          className="text-white/65 underline-offset-2 transition-colors hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded"
        >
          Nutzungsbedingungen
        </Link>{" "}
        und{" "}
        <Link
          href="/legal/privacy"
          className="text-white/65 underline-offset-2 transition-colors hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded"
        >
          Datenschutzhinweisen
        </Link>{" "}
        zu.
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
    <div className="relative min-h-screen w-full overflow-x-hidden bg-black text-white antialiased">
      {/* ── Cinematic hero (decorative) ─────────────────────────────────── */}
      <Image
        src={HERO_SRC}
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-[center_42%] grayscale"
      />
      {/* Contrast scrims — bottom + left fade to near-black so all copy is
          legible over the photo (WCAG 1.4.3). */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/20"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/25 to-transparent"
      />

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 py-6 sm:px-10 lg:px-16">
        <Link
          href="https://www.caelex.eu"
          aria-label="Caelex Startseite"
          className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          <CaelexWordmark height={26} />
        </Link>
        <Link
          href="/scholar-access"
          className="group inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-[12px] font-medium text-white/80 backdrop-blur-sm transition-colors hover:bg-white/[0.1] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          Für Universitäten
          <span
            aria-hidden="true"
            className="transition-transform group-hover:translate-x-0.5"
          >
            →
          </span>
        </Link>
      </header>

      {/* ── Main: wordmark + tagline + login, anchored lower-left ────────── */}
      <main className="relative z-10 flex min-h-screen flex-col justify-end px-6 pb-14 pt-28 sm:px-10 lg:px-16">
        <div className="w-full max-w-6xl">
          <h1 className="font-semibold leading-[0.85] tracking-[-0.045em] text-white text-[clamp(60px,12vw,168px)]">
            <span className="sr-only">Caelex </span>SCHOLAR
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-white/70 sm:text-[17px]">
            Die durchsuchbare Weltraumrecht-Datenbank für Universitäten und
            Forschung. Laufend gepflegt, immer auf dem aktuellen Stand.
          </p>

          <div className="mt-8 w-full max-w-sm">
            <div className="rounded-2xl border border-white/10 bg-black/45 p-6 shadow-2xl backdrop-blur-xl sm:p-7">
              <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-white">
                Anmelden
              </h2>
              <p className="mb-5 mt-1 text-[12px] text-white/50">
                Weiter zu deinem Arbeitsbereich.
              </p>
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
        </div>
      </main>

      {/* ── Bottom-right meta labels (Palantir-style) ───────────────────── */}
      <div className="pointer-events-none absolute bottom-14 right-6 z-10 hidden flex-col items-start gap-4 md:flex lg:right-16">
        <MetaItem lines={["Durchsuchbare", "Rechtsdatenbank"]} />
        <MetaItem lines={["Für Universitäten", "& Forschung"]} />
        <MetaItem lines={["Powered by Atlas"]} />
        <MetaItem lines={["© 2026 Caelex", "Technologies"]} />
      </div>
    </div>
  );
}
