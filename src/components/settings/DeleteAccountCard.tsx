"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { csrfHeaders } from "@/lib/csrf-client";
import { Trash2, AlertTriangle, Loader2, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface DeleteAccountCardProps {
  isOAuthOnly?: boolean;
}

export function DeleteAccountCard({
  isOAuthOnly = false,
}: DeleteAccountCardProps) {
  const toast = useToast();
  const { data: session } = useSession();

  const [showModal, setShowModal] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDelete =
    confirmation === "DELETE MY ACCOUNT" &&
    (isOAuthOnly || password.length > 0);

  const handleDelete = async () => {
    if (!canDelete) return;

    setError(null);
    setIsDeleting(true);

    try {
      const res = await fetch("/api/user/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...csrfHeaders(),
        },
        body: JSON.stringify({
          password: isOAuthOnly ? undefined : password,
          confirmation,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to delete account");
        setIsDeleting(false);
        return;
      }

      toast.success("Account deleted successfully");

      // Sign out and redirect to home
      await signOut({ callbackUrl: "/" });
    } catch {
      setError("An error occurred. Please try again.");
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* Delete Account Card */}
      <div className="bg-white dark:bg-white/[0.04] border border-red-200 dark:border-red-500/20 rounded-xl p-6 mt-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-500/10 flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-red-600 dark:text-red-400">
              DANGER ZONE
            </h2>
            <p className="text-[13px] text-slate-500 dark:text-white/50 mt-0.5">
              Permanent account deletion
            </p>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20 mb-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[14px] text-red-700 dark:text-red-300 font-medium mb-1">
                This action is irreversible
              </p>
              <p className="text-[13px] text-red-600/80 dark:text-red-400/80">
                Deleting your account will permanently remove all your data,
                assessments, documents, and settings. This cannot be undone.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-[13px] font-medium transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Delete Account
        </button>
      </div>

      {/* Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-navy-900 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-slate-200 dark:border-white/10">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-red-50 dark:bg-red-500/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-[16px] font-medium text-slate-900 dark:text-white">
                    Delete Account
                  </h3>
                  <p className="text-[13px] text-slate-500 dark:text-white/50">
                    {session?.user?.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              <p className="text-[14px] text-slate-600 dark:text-white/70">
                You are about to permanently delete your account. This will:
              </p>
              <ul className="text-[13px] text-slate-600 dark:text-white/60 space-y-1.5 list-disc list-inside">
                <li>Delete all your assessments and compliance data</li>
                <li>Remove all uploaded documents</li>
                <li>Cancel any active subscriptions</li>
                <li>Remove you from all organizations</li>
                <li>Delete all audit logs and history</li>
              </ul>

              {/* Password field (for credentials users) */}
              {!isOAuthOnly && (
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 dark:text-white/80 mb-1.5">
                    Enter your password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Your current password"
                      className="w-full bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 pr-10 text-[14px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white/70"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Confirmation input */}
              <div>
                <label className="block text-[13px] font-medium text-slate-700 dark:text-white/80 mb-1.5">
                  Type{" "}
                  <span className="font-mono text-red-600 dark:text-red-400">
                    DELETE MY ACCOUNT
                  </span>{" "}
                  to confirm
                </label>
                <input
                  type="text"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  placeholder="DELETE MY ACCOUNT"
                  className="w-full bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-[14px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 font-mono"
                />
              </div>

              {/* Error message */}
              {error && (
                <div className="p-3 rounded-lg bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30">
                  <p className="text-[13px] text-red-600 dark:text-red-400">
                    {error}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setPassword("");
                  setConfirmation("");
                  setError(null);
                }}
                className="px-4 py-2 rounded-lg text-[13px] font-medium text-slate-700 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={!canDelete || isDeleting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[13px] font-medium transition-colors"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Permanently
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
