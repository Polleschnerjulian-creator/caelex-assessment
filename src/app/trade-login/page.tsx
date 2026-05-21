"use client";

import { Suspense, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
import { safeTradeUrl } from "@/lib/safe-redirect";
import { translateAuthError } from "@/lib/auth-errors";
import { TradeAuthShell } from "./_components/TradeAuthShell";

/**
 * /trade-login — Caelex Trade sign-in (Sprint T7).
 *
 * Indigo-branded equivalent of /atlas-login. Uses the same NextAuth
 * credentials + Google providers as the rest of Caelex. callbackUrl
 * is validated via safeTradeUrl to keep brand-isolation: a hostile
 * `?callbackUrl=https://evil.com` falls back to /trade.
 *
 * Pre-fills email from `?email=` (used for deep-links out of sales
 * mails). Reset-success state is shown via `?reset=success`.
 */

export default function TradeLoginPage() {
  return (
    <Suspense
      fallback={<TradeAuthShell title="Sign in">{null}</TradeAuthShell>}
    >
      <TradeLoginInner />
    </Suspense>
  );
}

function TradeLoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const callbackUrl = safeTradeUrl(searchParams.get("callbackUrl"));
  const initialEmail = searchParams.get("email") ?? "";
  const errorCode = searchParams.get("error") ?? searchParams.get("code");
  const resetSuccess = searchParams.get("reset") === "success";

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (errorCode) setError(translateAuthError(errorCode));
  }, [errorCode]);

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        callbackUrl,
        redirect: false,
      });
      if (result?.error) {
        setError(translateAuthError(result.error));
        setSubmitting(false);
        return;
      }
      if (result?.ok) {
        router.push(result.url ?? callbackUrl);
        return;
      }
      setSubmitting(false);
    } catch {
      setError(translateAuthError("Default"));
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setError("");
    setSubmitting(true);
    await signIn("google", { callbackUrl });
    // signIn navigates; if it returns here, something failed silently.
    setSubmitting(false);
  }

  return (
    <TradeAuthShell
      title="Sign in to Caelex Trade"
      subtitle="Klassifizieren. Lizenzieren. Liefern."
      footer={
        <span>
          New to Caelex Trade?{" "}
          <a
            href="mailto:sales@caelex.eu?subject=Caelex%20Trade%20Access"
            className="font-medium text-indigo-400 hover:text-indigo-300"
          >
            Talk to Sales
          </a>
        </span>
      }
    >
      {resetSuccess ? (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[13px] text-emerald-200">
          <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />
          <span>Password updated. You can sign in now.</span>
        </div>
      ) : null}

      <form onSubmit={handleCredentials} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="font-body text-[12px] font-medium uppercase tracking-wide text-zinc-400">
            Email
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="h-11 rounded-md border border-white/[0.1] bg-white/[0.04] px-3 font-body text-[14px] text-zinc-50 placeholder:text-zinc-600 outline-none transition-colors focus:border-indigo-500/60 focus:bg-white/[0.06]"
            placeholder="you@example.com"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="font-body text-[12px] font-medium uppercase tracking-wide text-zinc-400">
            Password
          </span>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="h-11 w-full rounded-md border border-white/[0.1] bg-white/[0.04] px-3 pr-10 font-body text-[14px] text-zinc-50 placeholder:text-zinc-600 outline-none transition-colors focus:border-indigo-500/60 focus:bg-white/[0.06]"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors hover:text-zinc-300"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>

        {error ? (
          <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-[13px] text-red-200">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="mt-1 h-11 rounded-md bg-indigo-500 font-body text-[14px] font-semibold text-white transition-all hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-white/[0.08]" />
        <span className="font-body text-[11px] uppercase tracking-wider text-zinc-500">
          or
        </span>
        <div className="h-px flex-1 bg-white/[0.08]" />
      </div>

      <button
        type="button"
        onClick={handleGoogle}
        disabled={submitting}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-white/[0.12] bg-white/[0.04] font-body text-[14px] font-medium text-zinc-100 transition-colors hover:border-white/[0.18] hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <GoogleGlyph />
        Continue with Google
      </button>

      <div className="mt-5 text-center">
        <Link
          href="/trade-forgot-password"
          className="font-body text-[13px] text-zinc-400 transition-colors hover:text-indigo-300"
        >
          Forgot password?
        </Link>
      </div>
    </TradeAuthShell>
  );
}

function GoogleGlyph() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23Z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18A10.99 10.99 0 0 0 1 12c0 1.77.42 3.45 1.18 4.94l3.66-2.84Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
        fill="#EA4335"
      />
    </svg>
  );
}
