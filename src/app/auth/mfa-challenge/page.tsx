"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { csrfHeaders } from "@/lib/csrf-client";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  KeyRound,
  AlertTriangle,
  ArrowLeft,
  Loader2,
} from "lucide-react";

function MfaChallengeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [isBackupCode, setIsBackupCode] = useState(false);
  const [backupCode, setBackupCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(30);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for TOTP validity
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = 30 - (now % 30);
      setCountdown(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Focus first input on mount
  useEffect(() => {
    if (!isBackupCode && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [isBackupCode]);

  const handleInputChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Only allow digits

    const newCode = [...code];
    newCode[index] = value.slice(-1); // Only keep last digit
    setCode(newCode);
    setError(null);

    // Auto-focus next input
    if (value && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
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
      // Focus the next empty input
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
          userId,
          isBackupCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Invalid code");
        setIsLoading(false);
        // Clear code on error
        if (!isBackupCode) {
          setCode(["", "", "", "", "", ""]);
          inputRefs.current[0]?.focus();
        }
        return;
      }

      // Success - redirect to callback URL
      router.push(callbackUrl);
    } catch {
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Two-Factor Authentication
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              {isBackupCode
                ? "Enter one of your backup codes"
                : "Enter the 6-digit code from your authenticator app"}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {!isBackupCode ? (
              <motion.div
                key="totp"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                {/* TOTP Code Input */}
                <div
                  className="flex justify-center gap-2 mb-4"
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
                        bg-slate-50 dark:bg-slate-900
                        border-2 border-slate-200 dark:border-slate-600
                        rounded-lg
                        focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20
                        text-slate-900 dark:text-white
                        disabled:opacity-50 disabled:cursor-not-allowed
                        transition-all duration-200"
                    />
                  ))}
                </div>

                {/* Countdown Timer */}
                <div className="flex items-center justify-center gap-2 mb-6">
                  <div
                    className={`text-sm font-medium ${
                      countdown <= 5
                        ? "text-red-500 dark:text-red-400"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    Code expires in {countdown}s
                  </div>
                  <div className="w-24 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full ${
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
                initial={{ opacity: 0, x: 20 }}
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
                      bg-slate-50 dark:bg-slate-900
                      border-2 border-slate-200 dark:border-slate-600
                      rounded-lg
                      focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20
                      text-slate-900 dark:text-white
                      placeholder:text-slate-400 dark:placeholder:text-slate-500
                      disabled:opacity-50 disabled:cursor-not-allowed
                      transition-all duration-200"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 p-3 mb-4 bg-red-50 dark:bg-red-900/20
                border border-red-200 dark:border-red-800 rounded-lg"
            >
              <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400" />
              <span className="text-sm text-red-700 dark:text-red-300">
                {error}
              </span>
            </motion.div>
          )}

          {/* Submit Button */}
          {isBackupCode && (
            <button
              onClick={() => handleSubmit()}
              disabled={isLoading || !backupCode}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700
                text-white font-medium rounded-lg
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors duration-200
                flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <KeyRound className="w-5 h-5" />
                  Verify Backup Code
                </>
              )}
            </button>
          )}

          {/* Toggle Backup Code */}
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={() => {
                setIsBackupCode(!isBackupCode);
                setError(null);
                setCode(["", "", "", "", "", ""]);
                setBackupCode("");
              }}
              className="w-full text-center text-sm text-slate-600 dark:text-slate-400
                hover:text-emerald-600 dark:hover:text-emerald-400
                transition-colors duration-200"
            >
              {isBackupCode
                ? "← Use authenticator app instead"
                : "Lost access to your authenticator? Use a backup code →"}
            </button>
          </div>

          {/* Back to Login */}
          <div className="mt-4 text-center">
            <button
              onClick={() => router.push("/auth/signin")}
              className="inline-flex items-center gap-1 text-sm text-slate-500 dark:text-slate-500
                hover:text-slate-700 dark:hover:text-slate-300
                transition-colors duration-200"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to login
            </button>
          </div>
        </div>

        {/* Help Text */}
        <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-500">
          Having trouble?{" "}
          <a
            href="/support"
            className="text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Contact support
          </a>
        </p>
      </motion.div>
    </div>
  );
}

// Loading fallback for Suspense
function MfaChallengeLoading() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Main export wrapped in Suspense
export default function MfaChallengePage() {
  return (
    <Suspense fallback={<MfaChallengeLoading />}>
      <MfaChallengeContent />
    </Suspense>
  );
}
