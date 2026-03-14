"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  QrCode,
  Copy,
  Check,
  Loader2,
  AlertTriangle,
  Key,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { csrfHeaders } from "@/lib/csrf-client";

interface MfaStatus {
  enabled: boolean;
  verifiedAt: string | null;
  remainingBackupCodes: number;
}

export function MfaSetupCard() {
  const toast = useToast();
  const [status, setStatus] = useState<MfaStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Setup flow states
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setupStep, setSetupStep] = useState<"qr" | "verify" | "backup">("qr");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [secretCopied, setSecretCopied] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [backupCodesCopied, setBackupCodesCopied] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Disable flow states
  const [isDisabling, setIsDisabling] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);

  // Regenerate backup codes states
  const [showRegenerateBackupCodes, setShowRegenerateBackupCodes] =
    useState(false);
  const [regenerateCode, setRegenerateCode] = useState("");
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    fetchMfaStatus();
  }, []);

  const fetchMfaStatus = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/auth/mfa/status");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch {
      toast.error("Failed to load MFA status");
    } finally {
      setIsLoading(false);
    }
  };

  const startSetup = async () => {
    try {
      setIsSettingUp(true);
      setSetupStep("qr");
      setError(null);

      const res = await fetch("/api/auth/mfa/setup", {
        method: "POST",
        headers: csrfHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setQrCodeDataUrl(data.qrCodeDataUrl);
        setSecret(data.secret);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to start MFA setup");
        setIsSettingUp(false);
      }
    } catch {
      setError("Failed to start MFA setup");
      setIsSettingUp(false);
    }
  };

  const verifySetup = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError("Please enter a valid 6-digit code");
      return;
    }

    try {
      setVerifying(true);
      setError(null);

      const res = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ code: verificationCode }),
      });

      if (res.ok) {
        const data = await res.json();
        setBackupCodes(data.backupCodes || []);
        setSetupStep("backup");
        toast.success(
          "MFA enabled",
          "Two-factor authentication is now active.",
        );
      } else {
        const data = await res.json();
        setError(data.error || "Invalid verification code");
      }
    } catch {
      setError("Failed to verify code");
    } finally {
      setVerifying(false);
    }
  };

  const finishSetup = () => {
    setIsSettingUp(false);
    setSetupStep("qr");
    setQrCodeDataUrl(null);
    setSecret(null);
    setVerificationCode("");
    setBackupCodes([]);
    fetchMfaStatus();
  };

  const copySecret = async () => {
    if (secret) {
      await navigator.clipboard.writeText(secret);
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 2000);
    }
  };

  const copyBackupCodes = async () => {
    const codesText = backupCodes.join("\n");
    await navigator.clipboard.writeText(codesText);
    setBackupCodesCopied(true);
    setTimeout(() => setBackupCodesCopied(false), 2000);
    toast.success("Copied", "Backup codes copied to clipboard");
  };

  const disableMfa = async () => {
    if (!disablePassword) {
      setError("Password is required");
      return;
    }

    try {
      setIsDisabling(true);
      setError(null);

      const res = await fetch("/api/auth/mfa/disable", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ password: disablePassword }),
      });

      if (res.ok) {
        toast.success(
          "MFA disabled",
          "Two-factor authentication has been disabled.",
        );
        setShowDisableConfirm(false);
        setDisablePassword("");
        fetchMfaStatus();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to disable MFA");
      }
    } catch {
      setError("Failed to disable MFA");
    } finally {
      setIsDisabling(false);
    }
  };

  const regenerateBackupCodes = async () => {
    if (!regenerateCode || regenerateCode.length !== 6) {
      setError("Please enter a valid 6-digit code");
      return;
    }

    try {
      setRegenerating(true);
      setError(null);

      const res = await fetch("/api/auth/mfa/backup-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ code: regenerateCode }),
      });

      if (res.ok) {
        const data = await res.json();
        setBackupCodes(data.backupCodes || []);
        setShowRegenerateBackupCodes(false);
        setRegenerateCode("");
        setSetupStep("backup");
        setIsSettingUp(true);
        toast.success(
          "Backup codes regenerated",
          "Your old backup codes are no longer valid.",
        );
      } else {
        const data = await res.json();
        setError(data.error || "Invalid code");
      }
    } catch {
      setError("Failed to regenerate backup codes");
    } finally {
      setRegenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="rounded-2xl bg-white/60 dark:bg-white/[0.035] border border-black/[0.04] dark:border-white/[0.06] overflow-hidden">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-slate-400 dark:text-white/30 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AnimatePresence mode="wait">
        {!isSettingUp && !showDisableConfirm && !showRegenerateBackupCodes ? (
          <motion.div
            key="status"
            initial={false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-8"
          >
            {status?.enabled ? (
              <>
                {/* Status Section */}
                <div>
                  <p className="text-[13px] font-medium text-slate-500 dark:text-white/40 uppercase tracking-wider mb-3 px-1">
                    Status
                  </p>
                  <div className="rounded-2xl bg-white/60 dark:bg-white/[0.035] border border-black/[0.04] dark:border-white/[0.06] overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                          <Check className="w-4 h-4 text-green-500" />
                        </div>
                        <div>
                          <p className="text-[15px] font-medium text-slate-900 dark:text-white">
                            Two-factor authentication is enabled
                          </p>
                          <p className="text-[13px] text-slate-500 dark:text-white/40 mt-0.5">
                            {status.remainingBackupCodes} backup codes remaining
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Low Backup Codes Warning */}
                {status.remainingBackupCodes <= 3 && (
                  <div className="rounded-2xl bg-white/60 dark:bg-white/[0.035] border border-black/[0.04] dark:border-white/[0.06] overflow-hidden">
                    <div className="flex items-start gap-3 px-5 py-3.5">
                      <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[15px] font-medium text-slate-900 dark:text-white">
                          Low backup codes
                        </p>
                        <p className="text-[13px] text-slate-500 dark:text-white/40 mt-1">
                          Consider regenerating your backup codes to ensure you
                          can always access your account.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions Section */}
                <div>
                  <p className="text-[13px] font-medium text-slate-500 dark:text-white/40 uppercase tracking-wider mb-3 px-1">
                    Actions
                  </p>
                  <div className="rounded-2xl bg-white/60 dark:bg-white/[0.035] border border-black/[0.04] dark:border-white/[0.06] divide-y divide-black/[0.04] dark:divide-white/[0.06] overflow-hidden">
                    <button
                      onClick={() => setShowRegenerateBackupCodes(true)}
                      className="flex items-center justify-between px-5 py-3.5 w-full text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <RefreshCw className="w-[18px] h-[18px] text-slate-500 dark:text-white/50" />
                        <span className="text-[15px] text-slate-900 dark:text-white">
                          Regenerate Backup Codes
                        </span>
                      </div>
                      <svg
                        className="w-4 h-4 text-slate-400 dark:text-white/25"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => setShowDisableConfirm(true)}
                      className="flex items-center justify-between px-5 py-3.5 w-full text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Trash2 className="w-[18px] h-[18px] text-red-500 dark:text-red-400" />
                        <span className="text-[15px] text-red-600 dark:text-red-400">
                          Disable MFA
                        </span>
                      </div>
                      <svg
                        className="w-4 h-4 text-slate-400 dark:text-white/25"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div>
                <p className="text-[13px] font-medium text-slate-500 dark:text-white/40 uppercase tracking-wider mb-3 px-1">
                  Two-Factor Authentication
                </p>
                <div className="rounded-2xl bg-white/60 dark:bg-white/[0.035] border border-black/[0.04] dark:border-white/[0.06] overflow-hidden">
                  <div className="px-5 py-5">
                    <p className="text-[15px] text-slate-600 dark:text-white/60 mb-5">
                      Two-factor authentication adds an additional layer of
                      security by requiring a verification code from your
                      authenticator app when signing in.
                    </p>
                    <button
                      onClick={startSetup}
                      className="px-5 py-2.5 rounded-xl bg-slate-800 dark:bg-white hover:bg-slate-700 dark:hover:bg-white/90 text-white dark:text-slate-900 text-[15px] font-medium transition-colors"
                    >
                      Enable Two-Factor Authentication
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        ) : showDisableConfirm ? (
          <motion.div
            key="disable"
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            <div>
              <p className="text-[13px] font-medium text-slate-500 dark:text-white/40 uppercase tracking-wider mb-3 px-1">
                Disable MFA
              </p>
              <div className="rounded-2xl bg-white/60 dark:bg-white/[0.035] border border-black/[0.04] dark:border-white/[0.06] overflow-hidden">
                <div className="px-5 py-5 space-y-5">
                  {/* Warning */}
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200/60 dark:border-red-500/15">
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[15px] font-medium text-red-700 dark:text-red-300">
                        Disable Two-Factor Authentication?
                      </p>
                      <p className="text-[13px] text-red-600 dark:text-red-400 mt-1">
                        This will make your account less secure. Enter your
                        password to confirm.
                      </p>
                    </div>
                  </div>

                  {/* Password Input */}
                  <div>
                    <label
                      htmlFor="mfa-disable-password"
                      className="block text-[13px] font-medium text-slate-500 dark:text-white/40 mb-2"
                    >
                      Password
                    </label>
                    <input
                      id="mfa-disable-password"
                      type="password"
                      value={disablePassword}
                      aria-required="true"
                      onChange={(e) => {
                        setDisablePassword(e.target.value);
                        setError(null);
                      }}
                      placeholder="Enter your password"
                      className="w-full bg-white/80 dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-4 py-2.5 text-[15px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/25 focus:border-slate-400 dark:focus:border-white/25 focus:outline-none transition-colors"
                    />
                  </div>

                  {error && (
                    <p
                      role="alert"
                      className="text-[13px] text-red-500 dark:text-red-400"
                    >
                      {error}
                    </p>
                  )}

                  {/* Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={disableMfa}
                      disabled={isDisabling}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-[15px] font-medium transition-colors"
                    >
                      {isDisabling ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      Disable MFA
                    </button>
                    <button
                      onClick={() => {
                        setShowDisableConfirm(false);
                        setDisablePassword("");
                        setError(null);
                      }}
                      className="px-5 py-2.5 rounded-xl text-[15px] font-medium text-slate-600 dark:text-white/60 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : showRegenerateBackupCodes ? (
          <motion.div
            key="regenerate"
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            <div>
              <p className="text-[13px] font-medium text-slate-500 dark:text-white/40 uppercase tracking-wider mb-3 px-1">
                Regenerate Backup Codes
              </p>
              <div className="rounded-2xl bg-white/60 dark:bg-white/[0.035] border border-black/[0.04] dark:border-white/[0.06] overflow-hidden">
                <div className="px-5 py-5 space-y-5">
                  <p className="text-[15px] text-slate-600 dark:text-white/60">
                    Enter your current authenticator code to generate new backup
                    codes. Your old backup codes will be invalidated.
                  </p>

                  <div>
                    <label
                      htmlFor="mfa-regenerate-code"
                      className="block text-[13px] font-medium text-slate-500 dark:text-white/40 mb-2"
                    >
                      Authenticator Code
                    </label>
                    <input
                      id="mfa-regenerate-code"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={regenerateCode}
                      aria-required="true"
                      onChange={(e) => {
                        setRegenerateCode(e.target.value.replace(/\D/g, ""));
                        setError(null);
                      }}
                      placeholder="000000"
                      className="w-full max-w-[200px] bg-white/80 dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-4 py-2.5 text-[15px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/25 focus:border-slate-400 dark:focus:border-white/25 focus:outline-none transition-colors font-mono tracking-widest"
                    />
                  </div>

                  {error && (
                    <p
                      role="alert"
                      className="text-[13px] text-red-500 dark:text-red-400"
                    >
                      {error}
                    </p>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={regenerateBackupCodes}
                      disabled={regenerating || regenerateCode.length !== 6}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 dark:bg-white hover:bg-slate-700 dark:hover:bg-white/90 disabled:opacity-50 text-white dark:text-slate-900 text-[15px] font-medium transition-colors"
                    >
                      {regenerating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      Generate New Codes
                    </button>
                    <button
                      onClick={() => {
                        setShowRegenerateBackupCodes(false);
                        setRegenerateCode("");
                        setError(null);
                      }}
                      className="px-5 py-2.5 rounded-xl text-[15px] font-medium text-slate-600 dark:text-white/60 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="setup"
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            <AnimatePresence mode="wait">
              {setupStep === "qr" && (
                <motion.div
                  key="step-qr"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div>
                    <p className="text-[13px] font-medium text-slate-500 dark:text-white/40 uppercase tracking-wider mb-3 px-1">
                      Step 1 — Scan QR Code
                    </p>
                    <div className="rounded-2xl bg-white/60 dark:bg-white/[0.035] border border-black/[0.04] dark:border-white/[0.06] overflow-hidden">
                      <div className="px-5 py-6">
                        <p className="text-[15px] text-slate-600 dark:text-white/60 text-center mb-1">
                          Scan this QR code with your authenticator app
                        </p>
                        <p className="text-[13px] text-slate-400 dark:text-white/30 text-center mb-5">
                          Google Authenticator, Authy, 1Password, etc.
                        </p>

                        <div className="flex justify-center">
                          {qrCodeDataUrl ? (
                            <div className="p-4 bg-white rounded-2xl shadow-sm">
                              <img
                                src={qrCodeDataUrl}
                                alt="MFA QR Code"
                                className="w-48 h-48"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center justify-center w-56 h-56 bg-black/[0.03] dark:bg-white/[0.06] rounded-2xl">
                              <Loader2 className="w-8 h-8 text-slate-400 dark:text-white/30 animate-spin" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Manual Entry Secret */}
                  {secret && (
                    <div>
                      <p className="text-[13px] font-medium text-slate-500 dark:text-white/40 uppercase tracking-wider mb-3 px-1">
                        Manual Entry
                      </p>
                      <div className="rounded-2xl bg-white/60 dark:bg-white/[0.035] border border-black/[0.04] dark:border-white/[0.06] overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3.5">
                          <code className="flex-1 text-[13px] font-mono text-slate-900 dark:text-white break-all mr-3">
                            {secret}
                          </code>
                          <button
                            onClick={copySecret}
                            className="p-2 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors flex-shrink-0"
                            aria-label={
                              secretCopied
                                ? "Secret copied"
                                : "Copy secret to clipboard"
                            }
                          >
                            {secretCopied ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4 text-slate-400 dark:text-white/40" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => setSetupStep("verify")}
                    className="w-full px-5 py-2.5 rounded-xl bg-slate-800 dark:bg-white hover:bg-slate-700 dark:hover:bg-white/90 text-white dark:text-slate-900 text-[15px] font-medium transition-colors"
                  >
                    Continue
                  </button>

                  <button
                    onClick={() => {
                      setIsSettingUp(false);
                      setSetupStep("qr");
                      setQrCodeDataUrl(null);
                      setSecret(null);
                      setVerificationCode("");
                      setError(null);
                    }}
                    className="w-full py-2 text-[15px] text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/60 transition-colors"
                  >
                    Cancel Setup
                  </button>
                </motion.div>
              )}

              {setupStep === "verify" && (
                <motion.div
                  key="step-verify"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div>
                    <p className="text-[13px] font-medium text-slate-500 dark:text-white/40 uppercase tracking-wider mb-3 px-1">
                      Step 2 — Verify Code
                    </p>
                    <div className="rounded-2xl bg-white/60 dark:bg-white/[0.035] border border-black/[0.04] dark:border-white/[0.06] overflow-hidden">
                      <div className="px-5 py-6 space-y-5">
                        <p className="text-[15px] text-slate-600 dark:text-white/60 text-center">
                          Enter the 6-digit code from your authenticator app
                        </p>

                        <div>
                          <label
                            htmlFor="mfa-verification-code"
                            className="sr-only"
                          >
                            Enter 6-digit verification code
                          </label>
                          <input
                            id="mfa-verification-code"
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            value={verificationCode}
                            aria-required="true"
                            onChange={(e) => {
                              setVerificationCode(
                                e.target.value.replace(/\D/g, ""),
                              );
                              setError(null);
                            }}
                            placeholder="000000"
                            className="w-full text-center bg-white/80 dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-4 py-3 text-2xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/25 focus:border-slate-400 dark:focus:border-white/25 focus:outline-none transition-colors font-mono tracking-[0.5em]"
                          />
                        </div>

                        {error && (
                          <p
                            role="alert"
                            className="text-[13px] text-red-500 dark:text-red-400 text-center"
                          >
                            {error}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setSetupStep("qr")}
                      className="flex-1 py-2.5 rounded-xl text-[15px] font-medium text-slate-600 dark:text-white/60 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={verifySetup}
                      disabled={verifying || verificationCode.length !== 6}
                      className="flex-1 px-5 py-2.5 rounded-xl bg-slate-800 dark:bg-white hover:bg-slate-700 dark:hover:bg-white/90 disabled:opacity-50 text-white dark:text-slate-900 text-[15px] font-medium transition-colors"
                    >
                      {verifying ? (
                        <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                      ) : (
                        "Verify & Enable"
                      )}
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setIsSettingUp(false);
                      setSetupStep("qr");
                      setQrCodeDataUrl(null);
                      setSecret(null);
                      setVerificationCode("");
                      setError(null);
                    }}
                    className="w-full py-2 text-[15px] text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/60 transition-colors"
                  >
                    Cancel Setup
                  </button>
                </motion.div>
              )}

              {setupStep === "backup" && (
                <motion.div
                  key="step-backup"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div>
                    <p className="text-[13px] font-medium text-slate-500 dark:text-white/40 uppercase tracking-wider mb-3 px-1">
                      Backup Codes
                    </p>
                    <div className="rounded-2xl bg-white/60 dark:bg-white/[0.035] border border-black/[0.04] dark:border-white/[0.06] overflow-hidden">
                      <div className="px-5 py-5 space-y-4">
                        <div className="text-center">
                          <p className="text-[15px] font-medium text-slate-900 dark:text-white mb-1">
                            Save Your Backup Codes
                          </p>
                          <p className="text-[13px] text-slate-500 dark:text-white/40">
                            Store these codes in a safe place. Each code can
                            only be used once.
                          </p>
                        </div>

                        {/* Backup codes grid */}
                        <div className="rounded-xl bg-black/[0.03] dark:bg-white/[0.04] p-4">
                          <div className="grid grid-cols-2 gap-2">
                            {backupCodes.map((code, index) => (
                              <div
                                key={index}
                                className="px-3 py-2 rounded-lg bg-white/80 dark:bg-white/[0.06] text-center text-[14px] font-mono text-slate-900 dark:text-white"
                              >
                                {code}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Copy button */}
                        <button
                          onClick={copyBackupCodes}
                          className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-[15px] font-medium text-slate-600 dark:text-white/60 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
                        >
                          {backupCodesCopied ? (
                            <>
                              <Check className="w-4 h-4 text-green-500" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              Copy All Codes
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Warning */}
                  <div className="rounded-2xl bg-white/60 dark:bg-white/[0.035] border border-black/[0.04] dark:border-white/[0.06] overflow-hidden">
                    <div className="flex items-start gap-3 px-5 py-3.5">
                      <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <p className="text-[13px] text-slate-600 dark:text-white/50">
                        Keep these codes safe. You won&apos;t be able to see
                        them again after closing this dialog.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={finishSetup}
                    className="w-full px-5 py-2.5 rounded-xl bg-slate-800 dark:bg-white hover:bg-slate-700 dark:hover:bg-white/90 text-white dark:text-slate-900 text-[15px] font-medium transition-colors"
                  >
                    I&apos;ve Saved My Codes
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
