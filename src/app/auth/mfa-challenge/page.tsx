"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSession } from "next-auth/react";
import { csrfHeaders } from "@/lib/csrf-client";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  KeyRound,
  AlertTriangle,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import Logo from "@/components/ui/Logo";

function MfaChallengeContent() {
  const { update: updateSession } = useSession();
  const searchParams = useSearchParams();
  const rawCallbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const callbackUrl =
    rawCallbackUrl.startsWith("/") &&
    !rawCallbackUrl.startsWith("//") &&
    !rawCallbackUrl.includes("://")
      ? rawCallbackUrl
      : "/dashboard";

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [isBackupCode, setIsBackupCode] = useState(false);
  const [backupCode, setBackupCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(30);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = 30 - (now % 30);
      setCountdown(remaining);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isBackupCode && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [isBackupCode]);

  const handleInputChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    setError(null);

    if (value && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }

    if (value && index === 5 && newCode.every((d) => d !== "")) {
      handleSubmit(newCode.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    const newCode = [...code];
    for (let i = 0; i < 6; i++) {
      newCode[i] = pasted[i] || "";
    }
    setCode(newCode);

    if (pasted.length === 6) {
      handleSubmit(pasted);
    } else {
      const nextEmpty = newCode.findIndex((d) => d === "");
      if (nextEmpty !== -1 && inputRefs.current[nextEmpty]) {
        inputRefs.current[nextEmpty]?.focus();
      }
    }
  };

  const handleSubmit = async (codeToSubmit?: string) => {
    const finalCode =
      codeToSubmit || (isBackupCode ? backupCode : code.join(""));

    if (!finalCode || (!isBackupCode && finalCode.length !== 6)) {
      setError("Please enter a valid code");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/mfa/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({
          code: finalCode,
          isBackupCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Invalid code");
        setIsLoading(false);
        if (!isBackupCode) {
          setCode(["", "", "", "", "", ""]);
          inputRefs.current[0]?.focus();
        }
        return;
      }

      // Server already updated the JWT cookie in the response.
      // Try updateSession for client-side state, but don't block on failure.
      try {
        await updateSession({ mfaVerified: true });
      } catch {
        // Non-critical: server already set the updated JWT cookie
      }

      window.location.href = callbackUrl;
    } catch (err) {
      console.error("MFA validation error:", err);
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
      {/* Background grid */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />

      {/* Glow */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-emerald-500/[0.06] rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Logo size={24} className="text-white" />
        </div>

        {/* Card */}
        <div className="bg-white/[0.03] backdrop-blur-sm border border-white/[0.08] rounded-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center mb-4">
              <Shield className="w-7 h-7 text-emerald-400" />
            </div>
            <h1 className="text-display-sm font-medium text-white">
              Two-Factor Authentication
            </h1>
            <p className="text-white/40 text-body-lg mt-2">
              {isBackupCode
                ? "Enter one of your backup codes"
                : "Enter the 6-digit code from your authenticator app"}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {!isBackupCode ? (
              <motion.div
                key="totp"
                initial={false}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                {/* TOTP Code Input */}
                <div
                  className="flex justify-center gap-2.5 mb-5"
                  onPaste={handlePaste}
                >
                  {code.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        inputRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleInputChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      disabled={isLoading}
                      className="w-12 h-14 text-center text-2xl font-mono font-semibold
                        bg-white/[0.03] border border-white/[0.08]
                        rounded-lg text-white
                        focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20
                        focus:bg-emerald-500/[0.03]
                        disabled:opacity-40 disabled:cursor-not-allowed
                        transition-all duration-200 outline-none"
                    />
                  ))}
                </div>

                {/* Countdown Timer */}
                <div className="flex items-center justify-center gap-3 mb-6">
                  <span
                    className={`text-small font-medium tabular-nums ${
                      countdown <= 5
                        ? "text-red-400"
                        : countdown <= 10
                          ? "text-amber-400"
                          : "text-white/30"
                    }`}
                  >
                    {countdown}s
                  </span>
                  <div className="w-24 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${
                        countdown <= 5
                          ? "bg-red-500"
                          : countdown <= 10
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                      }`}
                      initial={{ width: "100%" }}
                      animate={{ width: `${(countdown / 30) * 100}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="backup"
                initial={false}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {/* Backup Code Input */}
                <div className="mb-6">
                  <input
                    type="text"
                    value={backupCode}
                    onChange={(e) => {
                      setBackupCode(e.target.value.toUpperCase());
                      setError(null);
                    }}
                    placeholder="XXXXXXXX"
                    disabled={isLoading}
                    className="w-full h-14 text-center text-xl font-mono font-semibold tracking-widest
                      bg-white/[0.03] border border-white/[0.08]
                      rounded-lg text-white
                      focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20
                      placeholder:text-white/15
                      disabled:opacity-40 disabled:cursor-not-allowed
                      transition-all duration-200 outline-none"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 p-3 mb-4 bg-red-500/10
                border border-red-500/20 rounded-lg"
            >
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span className="text-small text-red-300">{error}</span>
            </motion.div>
          )}

          {/* Submit Button (only for backup code mode — TOTP auto-submits) */}
          {isBackupCode && (
            <button
              onClick={() => handleSubmit()}
              disabled={isLoading || !backupCode}
              className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600
                text-black font-semibold rounded-lg
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-all duration-200
                flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  Verify Backup Code
                </>
              )}
            </button>
          )}

          {/* Toggle Backup Code */}
          <div className="mt-6 pt-6 border-t border-white/[0.06]">
            <button
              onClick={() => {
                setIsBackupCode(!isBackupCode);
                setError(null);
                setCode(["", "", "", "", "", ""]);
                setBackupCode("");
              }}
              className="w-full text-center text-small text-white/30
                hover:text-emerald-400/80 transition-colors duration-200"
            >
              {isBackupCode
                ? "Use authenticator app instead"
                : "Lost access? Use a backup code"}
            </button>
          </div>
        </div>

        {/* Back to Login */}
        <div className="mt-6 text-center">
          <a
            href="/login"
            className="inline-flex items-center gap-1.5 text-small text-white/25
              hover:text-white/50 transition-colors duration-200"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to login
          </a>
        </div>
      </motion.div>
    </div>
  );
}

function MfaChallengeLoading() {
  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/[0.03] backdrop-blur-sm border border-white/[0.08] rounded-2xl p-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MfaChallengePage() {
  return (
    <Suspense fallback={<MfaChallengeLoading />}>
      <MfaChallengeContent />
    </Suspense>
  );
}
