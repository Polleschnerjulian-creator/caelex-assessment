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
      <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-6 mt-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-6 mt-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-600 dark:text-white/70">
            TWO-FACTOR AUTHENTICATION
          </h2>
          <p className="text-[13px] text-slate-500 dark:text-white/50 mt-0.5">
            Add an extra layer of security to your account
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!isSettingUp && !showDisableConfirm && !showRegenerateBackupCodes ? (
          <motion.div
            key="status"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {status?.enabled ? (
              <div className="space-y-4">
                {/* Enabled Status */}
                <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg border border-emerald-200 dark:border-emerald-500/20">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                    <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[14px] font-medium text-emerald-800 dark:text-emerald-300">
                      Two-factor authentication is enabled
                    </p>
                    <p className="text-[12px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {status.remainingBackupCodes} backup codes remaining
                    </p>
                  </div>
                </div>

                {/* Backup Codes Warning */}
                {status.remainingBackupCodes <= 3 && (
                  <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-500/10 rounded-lg border border-amber-200 dark:border-amber-500/20">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[13px] text-amber-800 dark:text-amber-300">
                        Low backup codes
                      </p>
                      <p className="text-[12px] text-amber-600 dark:text-amber-400 mt-1">
                        Consider regenerating your backup codes to ensure you
                        can always access your account.
                      </p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setShowRegenerateBackupCodes(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-white/20 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Regenerate Backup Codes
                  </button>
                  <button
                    onClick={() => setShowDisableConfirm(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Disable MFA
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-[14px] text-slate-600 dark:text-white/70">
                  Two-factor authentication adds an additional layer of security
                  by requiring a verification code from your authenticator app
                  when signing in.
                </p>
                <button
                  onClick={startSetup}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[13px] font-medium transition-colors"
                >
                  <Shield className="w-4 h-4" />
                  Enable Two-Factor Authentication
                </button>
              </div>
            )}
          </motion.div>
        ) : showDisableConfirm ? (
          <motion.div
            key="disable"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="p-4 bg-red-50 dark:bg-red-500/10 rounded-lg border border-red-200 dark:border-red-500/20">
              <p className="text-[14px] font-medium text-red-800 dark:text-red-300 mb-2">
                Disable Two-Factor Authentication?
              </p>
              <p className="text-[13px] text-red-600 dark:text-red-400">
                This will make your account less secure. Enter your password to
                confirm.
              </p>
            </div>

            <div>
              <label className="block text-[13px] text-slate-500 dark:text-white/60 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={disablePassword}
                onChange={(e) => {
                  setDisablePassword(e.target.value);
                  setError(null);
                }}
                placeholder="Enter your password"
                className="w-full bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-[14px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500"
              />
            </div>

            {error && (
              <p className="text-[13px] text-red-500 dark:text-red-400">
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={disableMfa}
                disabled={isDisabling}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-[13px] font-medium transition-colors"
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
                className="px-4 py-2.5 rounded-lg text-[13px] font-medium text-slate-600 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        ) : showRegenerateBackupCodes ? (
          <motion.div
            key="regenerate"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <p className="text-[14px] text-slate-600 dark:text-white/70">
              Enter your current authenticator code to generate new backup
              codes. Your old backup codes will be invalidated.
            </p>

            <div>
              <label className="block text-[13px] text-slate-500 dark:text-white/60 mb-1.5">
                Authenticator Code
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={regenerateCode}
                onChange={(e) => {
                  setRegenerateCode(e.target.value.replace(/\D/g, ""));
                  setError(null);
                }}
                placeholder="000000"
                className="w-full max-w-[200px] bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-[14px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 font-mono tracking-widest"
              />
            </div>

            {error && (
              <p className="text-[13px] text-red-500 dark:text-red-400">
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={regenerateBackupCodes}
                disabled={regenerating || regenerateCode.length !== 6}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-[13px] font-medium transition-colors"
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
                className="px-4 py-2.5 rounded-lg text-[13px] font-medium text-slate-600 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {setupStep === "qr" && (
              <>
                <div className="text-center">
                  <p className="text-[14px] text-slate-600 dark:text-white/70 mb-4">
                    Scan this QR code with your authenticator app
                    <br />
                    <span className="text-[12px] text-slate-400 dark:text-white/40">
                      (Google Authenticator, Authy, 1Password, etc.)
                    </span>
                  </p>

                  {qrCodeDataUrl ? (
                    <div className="inline-block p-4 bg-white rounded-xl shadow-lg">
                      <img
                        src={qrCodeDataUrl}
                        alt="MFA QR Code"
                        className="w-48 h-48"
                      />
                    </div>
                  ) : (
                    <div className="inline-flex items-center justify-center w-56 h-56 bg-slate-100 dark:bg-white/10 rounded-xl">
                      <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                    </div>
                  )}
                </div>

                {/* Manual Entry */}
                {secret && (
                  <div className="p-4 bg-slate-50 dark:bg-white/[0.02] rounded-lg border border-slate-200 dark:border-white/10">
                    <p className="text-[12px] text-slate-500 dark:text-white/50 mb-2">
                      Or enter this code manually:
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-2 bg-white dark:bg-white/[0.04] rounded text-[12px] font-mono text-slate-900 dark:text-white break-all">
                        {secret}
                      </code>
                      <button
                        onClick={copySecret}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                      >
                        {secretCopied ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setSetupStep("verify")}
                  className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[13px] font-medium transition-colors"
                >
                  Continue
                </button>
              </>
            )}

            {setupStep === "verify" && (
              <>
                <div className="text-center">
                  <QrCode className="w-12 h-12 mx-auto text-emerald-500 mb-4" />
                  <p className="text-[14px] text-slate-600 dark:text-white/70">
                    Enter the 6-digit code from your authenticator app
                  </p>
                </div>

                <div>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => {
                      setVerificationCode(e.target.value.replace(/\D/g, ""));
                      setError(null);
                    }}
                    placeholder="000000"
                    className="w-full text-center bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-lg px-4 py-3 text-[20px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 font-mono tracking-[0.5em]"
                  />
                </div>

                {error && (
                  <p className="text-[13px] text-red-500 dark:text-red-400 text-center">
                    {error}
                  </p>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setSetupStep("qr")}
                    className="flex-1 py-2.5 rounded-lg text-[13px] font-medium text-slate-600 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={verifySetup}
                    disabled={verifying || verificationCode.length !== 6}
                    className="flex-1 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-[13px] font-medium transition-colors"
                  >
                    {verifying ? (
                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    ) : (
                      "Verify & Enable"
                    )}
                  </button>
                </div>
              </>
            )}

            {setupStep === "backup" && (
              <>
                <div className="text-center">
                  <Key className="w-12 h-12 mx-auto text-emerald-500 mb-4" />
                  <p className="text-[14px] font-medium text-slate-900 dark:text-white mb-2">
                    Save Your Backup Codes
                  </p>
                  <p className="text-[13px] text-slate-500 dark:text-white/50">
                    Store these codes in a safe place. Each code can only be
                    used once.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-white/[0.02] rounded-lg border border-slate-200 dark:border-white/10">
                  <div className="grid grid-cols-2 gap-2">
                    {backupCodes.map((code, index) => (
                      <code
                        key={index}
                        className="p-2 bg-white dark:bg-white/[0.04] rounded text-center text-[13px] font-mono text-slate-900 dark:text-white"
                      >
                        {code}
                      </code>
                    ))}
                  </div>
                  <button
                    onClick={copyBackupCodes}
                    className="w-full mt-3 inline-flex items-center justify-center gap-2 py-2 rounded-lg text-[13px] font-medium text-slate-600 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                  >
                    {backupCodesCopied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-500" />
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

                <div className="p-3 bg-amber-50 dark:bg-amber-500/10 rounded-lg border border-amber-200 dark:border-amber-500/20">
                  <p className="text-[12px] text-amber-700 dark:text-amber-300 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    Keep these codes safe. You won&apos;t be able to see them
                    again after closing this dialog.
                  </p>
                </div>

                <button
                  onClick={finishSetup}
                  className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[13px] font-medium transition-colors"
                >
                  I&apos;ve Saved My Codes
                </button>
              </>
            )}

            {/* Cancel button for setup flow */}
            {setupStep !== "backup" && (
              <button
                onClick={() => {
                  setIsSettingUp(false);
                  setSetupStep("qr");
                  setQrCodeDataUrl(null);
                  setSecret(null);
                  setVerificationCode("");
                  setError(null);
                }}
                className="w-full py-2 text-[13px] text-slate-500 dark:text-white/50 hover:text-slate-700 dark:hover:text-white/70 transition-colors"
              >
                Cancel Setup
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
