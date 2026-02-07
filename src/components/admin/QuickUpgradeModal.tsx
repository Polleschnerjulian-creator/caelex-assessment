"use client";

import { useState } from "react";
import { X, Crown, CheckCircle, AlertCircle, Zap } from "lucide-react";

interface Props {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function QuickUpgradeModal({ onClose, onSuccess }: Props) {
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState("ENTERPRISE");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{
    message: string;
    orgName: string;
    previousPlan: string;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/quick-actions/upgrade-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          plan,
          reason: reason.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to upgrade plan");
      }

      setSuccess({
        message: data.message,
        orgName: data.organization?.name || "",
        previousPlan: data.previousPlan || "FREE",
      });

      setTimeout(() => {
        onSuccess?.();
      }, 2500);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "An error occurred";
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-xl max-w-md w-full shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-500/10 rounded-lg flex items-center justify-center">
              <Zap size={18} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">
                Quick Plan Upgrade
              </h2>
              <p className="text-[12px] text-slate-500 dark:text-white/50">
                Upgrade a user&apos;s organization plan by email
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/[0.06] rounded-lg transition-colors"
          >
            <X size={18} className="text-slate-500 dark:text-white/50" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {success ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={28} className="text-emerald-500" />
              </div>
              <p className="text-[15px] font-medium text-slate-900 dark:text-white mb-2">
                Upgrade Successful
              </p>
              <p className="text-[13px] text-slate-600 dark:text-white/60">
                {success.orgName} upgraded from{" "}
                <span className="font-mono text-[12px] text-slate-500 dark:text-white/50">
                  {success.previousPlan}
                </span>{" "}
                to{" "}
                <span className="font-mono text-[12px] font-medium text-emerald-600 dark:text-emerald-400">
                  {plan}
                </span>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-[13px] font-medium text-slate-700 dark:text-white/80 mb-1.5">
                  User Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  autoFocus
                  className="w-full px-3 py-2.5 bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-lg text-[13px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                  required
                />
              </div>

              {/* Plan Selection */}
              <div>
                <label className="block text-[13px] font-medium text-slate-700 dark:text-white/80 mb-1.5">
                  Target Plan
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { value: "FREE", label: "Free", color: "slate" },
                      { value: "STARTER", label: "Starter", color: "blue" },
                      {
                        value: "PROFESSIONAL",
                        label: "Professional",
                        color: "purple",
                      },
                      {
                        value: "ENTERPRISE",
                        label: "Enterprise",
                        color: "amber",
                      },
                    ] as const
                  ).map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPlan(p.value)}
                      className={`px-3 py-2.5 rounded-lg border text-[13px] font-medium transition-all ${
                        plan === p.value
                          ? p.value === "ENTERPRISE"
                            ? "border-amber-500 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-2 ring-amber-500/30"
                            : p.value === "PROFESSIONAL"
                              ? "border-purple-500 bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 ring-2 ring-purple-500/30"
                              : p.value === "STARTER"
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 ring-2 ring-blue-500/30"
                                : "border-slate-400 bg-slate-50 dark:bg-white/[0.06] text-slate-700 dark:text-white/70 ring-2 ring-slate-400/30"
                          : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60 hover:border-slate-300 dark:hover:border-white/20"
                      }`}
                    >
                      {p.value === "ENTERPRISE" && (
                        <Crown size={13} className="inline mr-1.5 -mt-0.5" />
                      )}
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-[13px] font-medium text-slate-700 dark:text-white/80 mb-1.5">
                  Reason{" "}
                  <span className="font-normal text-slate-500 dark:text-white/40">
                    (optional)
                  </span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., Customer request, partnership, trial extension"
                  className="w-full px-3 py-2.5 bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-lg text-[13px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 resize-none"
                  rows={2}
                />
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg">
                  <AlertCircle
                    size={16}
                    className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
                  />
                  <p className="text-[13px] text-red-700 dark:text-red-400">
                    {error}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-700 dark:text-white/80 text-[13px] font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !email}
                  className="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[13px] font-medium rounded-lg transition-colors"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Upgrading...
                    </span>
                  ) : (
                    "Upgrade Plan"
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
