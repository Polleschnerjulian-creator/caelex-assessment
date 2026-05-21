"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Mail } from "lucide-react";
import { TradeAuthShell } from "../trade-login/_components/TradeAuthShell";

/**
 * /trade-forgot-password — Sprint T7.
 *
 * Indigo-branded version of the forgot-password flow. Posts to the
 * shared /api/auth/forgot-password endpoint with `intent: "trade"`,
 * which routes the reset-email link to /trade-reset-password and
 * brands the email as "Caelex Trade".
 *
 * The endpoint always returns 200 (no account-enumeration oracle), so
 * the success state is shown for any email submission.
 */

export default function TradeForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, intent: "trade" }),
      });
      if (!res.ok && res.status !== 200) {
        setError("Something went wrong. Try again in a moment.");
        setSubmitting(false);
        return;
      }
      setSent(true);
    } catch {
      setError("Couldn't reach the server. Check your connection.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <TradeAuthShell
      title={sent ? "Check your inbox" : "Reset your password"}
      subtitle={
        sent
          ? null
          : "Enter the email on your Caelex Trade account and we'll send a one-time reset link."
      }
      footer={
        <Link
          href="/trade-login"
          className="text-zinc-400 transition-colors hover:text-indigo-300"
        >
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
            <CheckCircle2 size={24} />
          </div>
          <p className="font-body text-[14px] text-zinc-300">
            We've sent a reset link to{" "}
            <span className="font-medium text-zinc-100">{email}</span>.
          </p>
          <p className="font-body text-[12px] text-zinc-500">
            The link expires in 60 minutes. Didn't get it? Check spam or try
            again.
          </p>
          <button
            type="button"
            onClick={() => {
              setSent(false);
              setEmail("");
            }}
            className="mt-2 text-[13px] font-medium text-indigo-400 transition-colors hover:text-indigo-300"
          >
            Try a different email
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="font-body text-[12px] font-medium uppercase tracking-wide text-zinc-400">
              Email
            </span>
            <div className="relative">
              <Mail
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-11 w-full rounded-md border border-white/[0.1] bg-white/[0.04] px-3 pl-9 font-body text-[14px] text-zinc-50 placeholder:text-zinc-600 outline-none transition-colors focus:border-indigo-500/60 focus:bg-white/[0.06]"
                placeholder="you@example.com"
              />
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
            {submitting ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
    </TradeAuthShell>
  );
}
