"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { TradeAuthShell } from "../trade-login/_components/TradeAuthShell";

/**
 * /trade-reset-password — token-consuming leg of the password-reset
 * flow (Sprint T7). Posts to the shared /api/auth/reset-password
 * endpoint with `{ token, password }`. On success redirects to
 * /trade-login?reset=success so the user lands back inside the
 * Trade brand for sign-in.
 *
 * The endpoint returns the same generic error regardless of why a
 * token was rejected (missing, expired, already-used) — we mirror
 * that on the client: no oracle for attackers.
 */

export default function TradeResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <TradeAuthShell title="Set a new password">{null}</TradeAuthShell>
      }
    >
      <TradeResetPasswordInner />
    </Suspense>
  );
}

function TradeResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | string[]>("");
  const [submitting, setSubmitting] = useState(false);

  if (!token) {
    return (
      <TradeAuthShell
        title="Reset link not found"
        subtitle="This URL is missing the reset token. Request a fresh link to set a new password."
        footer={
          <Link
            href="/trade-forgot-password"
            className="text-zinc-400 transition-colors hover:text-indigo-300"
          >
            Request a new link
          </Link>
        }
      >
        {null}
      </TradeAuthShell>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (res.ok) {
        router.push("/trade-login?reset=success");
        return;
      }

      // 400 with field errors → render the password-policy hints.
      try {
        const data = (await res.json()) as {
          error?: string;
          fieldErrors?: Record<string, string[]>;
        };
        if (data.fieldErrors?.password?.length) {
          setError(data.fieldErrors.password);
        } else {
          setError(
            data.error ??
              "This reset link can't be used. Request a new one and try again.",
          );
        }
      } catch {
        setError("Couldn't process the response. Try again.");
      }
      setSubmitting(false);
    } catch {
      setError("Couldn't reach the server. Check your connection.");
      setSubmitting(false);
    }
  }

  return (
    <TradeAuthShell
      title="Set a new password"
      subtitle="Choose something memorable but unique to Caelex Trade."
      footer={
        <Link
          href="/trade-login"
          className="text-zinc-400 transition-colors hover:text-indigo-300"
        >
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="font-body text-[12px] font-medium uppercase tracking-wide text-zinc-400">
            New password
          </span>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              minLength={8}
              className="h-11 w-full rounded-md border border-white/[0.1] bg-white/[0.04] px-3 pr-10 font-body text-[14px] text-zinc-50 placeholder:text-zinc-600 outline-none transition-colors focus:border-indigo-500/60 focus:bg-white/[0.06]"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors hover:text-zinc-300"
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="font-body text-[12px] font-medium uppercase tracking-wide text-zinc-400">
            Confirm password
          </span>
          <input
            type={showPw ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
            minLength={8}
            className="h-11 w-full rounded-md border border-white/[0.1] bg-white/[0.04] px-3 font-body text-[14px] text-zinc-50 placeholder:text-zinc-600 outline-none transition-colors focus:border-indigo-500/60 focus:bg-white/[0.06]"
            placeholder="••••••••"
          />
        </label>

        {error ? (
          <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-[13px] text-red-200">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <div className="flex flex-col gap-0.5">
              {Array.isArray(error)
                ? error.map((e) => <span key={e}>{e}</span>)
                : error}
            </div>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="mt-1 h-11 rounded-md bg-indigo-500 font-body text-[14px] font-semibold text-white transition-all hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Updating…" : "Update password"}
        </button>
      </form>
    </TradeAuthShell>
  );
}
