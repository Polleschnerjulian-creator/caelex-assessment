"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Fingerprint,
  Plus,
  Trash2,
  Loader2,
  Smartphone,
  Monitor,
  Key,
  Edit2,
  Check,
  X,
} from "lucide-react";
import { startRegistration } from "@simplewebauthn/browser";
import { useToast } from "@/components/ui/Toast";
import { csrfHeaders } from "@/lib/csrf-client";

interface Passkey {
  id: string;
  deviceName: string | null;
  deviceType: string | null;
  createdAt: string;
  lastUsedAt: string | null;
}

export function PasskeyManagementCard() {
  const toast = useToast();
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState("");
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchPasskeys = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/auth/passkey");
      if (res.ok) {
        const data = await res.json();
        setPasskeys(data.passkeys || []);
      }
    } catch {
      toast.error("Failed to load passkeys");
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPasskeys();
  }, [fetchPasskeys]);

  const registerPasskey = async () => {
    try {
      setIsRegistering(true);

      // Get registration options from server
      const optionsRes = await fetch("/api/auth/passkey/register-options", {
        method: "POST",
        headers: csrfHeaders(),
      });

      if (!optionsRes.ok) {
        throw new Error("Failed to get registration options");
      }

      const options = await optionsRes.json();

      // Start WebAuthn registration
      const credential = await startRegistration({ optionsJSON: options });

      // Send credential to server for verification
      const verifyRes = await fetch("/api/auth/passkey/register-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({
          response: credential,
          deviceName: newDeviceName || undefined,
        }),
      });

      if (!verifyRes.ok) {
        const data = await verifyRes.json();
        throw new Error(data.error || "Failed to register passkey");
      }

      toast.success(
        "Passkey registered",
        "You can now use this passkey to sign in.",
      );
      setShowRegisterForm(false);
      setNewDeviceName("");
      fetchPasskeys();
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === "NotAllowedError") {
          toast.error(
            "Registration cancelled",
            "You cancelled the passkey registration.",
          );
        } else if (error.name === "NotSupportedError") {
          toast.error(
            "Not supported",
            "Your browser or device doesn't support passkeys.",
          );
        } else {
          toast.error("Registration failed", error.message);
        }
      } else {
        toast.error("Registration failed", "An unexpected error occurred.");
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const renamePasskey = async (id: string) => {
    if (!editName.trim()) {
      return;
    }

    try {
      const res = await fetch("/api/auth/passkey", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ credentialId: id, name: editName }),
      });

      if (res.ok) {
        toast.success("Passkey renamed");
        setEditingId(null);
        setEditName("");
        fetchPasskeys();
      } else {
        toast.error("Failed to rename passkey");
      }
    } catch {
      toast.error("Failed to rename passkey");
    }
  };

  const deletePasskey = async (id: string) => {
    try {
      setDeletingId(id);
      const res = await fetch("/api/auth/passkey", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ credentialId: id }),
      });

      if (res.ok) {
        toast.success("Passkey removed");
        fetchPasskeys();
      } else {
        toast.error("Failed to remove passkey");
      }
    } catch {
      toast.error("Failed to remove passkey");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getDeviceIcon = (deviceType: string | null) => {
    if (deviceType === "cross-platform") {
      return <Key className="w-5 h-5" />;
    }
    if (deviceType?.toLowerCase().includes("mobile")) {
      return <Smartphone className="w-5 h-5" />;
    }
    return <Monitor className="w-5 h-5" />;
  };

  // Check if WebAuthn is supported
  const isWebAuthnSupported =
    typeof window !== "undefined" && window.PublicKeyCredential !== undefined;

  if (!isWebAuthnSupported) {
    return (
      <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-6 mt-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-white/10 flex items-center justify-center">
            <Fingerprint className="w-5 h-5 text-slate-400 dark:text-white/40" />
          </div>
          <div>
            <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-600 dark:text-white/70">
              PASSKEYS
            </h2>
            <p className="text-[13px] text-slate-500 dark:text-white/50 mt-0.5">
              Passwordless sign-in
            </p>
          </div>
        </div>
        <p className="text-[14px] text-slate-500 dark:text-white/50">
          Your browser or device doesn&apos;t support passkeys. Try using a
          modern browser like Chrome, Safari, or Edge.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-6 mt-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-500/10 flex items-center justify-center">
          <Fingerprint className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div className="flex-1">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-600 dark:text-white/70">
            PASSKEYS
          </h2>
          <p className="text-[13px] text-slate-500 dark:text-white/50 mt-0.5">
            Sign in with Face ID, Touch ID, or security keys
          </p>
        </div>
        {!showRegisterForm && (
          <button
            onClick={() => setShowRegisterForm(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 hover:bg-purple-100 dark:hover:bg-purple-500/20 border border-purple-200 dark:border-purple-500/20 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Passkey
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {showRegisterForm ? (
          <motion.div
            key="register"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4 p-4 bg-slate-50 dark:bg-white/[0.02] rounded-lg border border-slate-200 dark:border-white/10"
          >
            <div>
              <label className="block text-[13px] text-slate-500 dark:text-white/60 mb-1.5">
                Device Name (optional)
              </label>
              <input
                type="text"
                value={newDeviceName}
                onChange={(e) => setNewDeviceName(e.target.value)}
                placeholder="e.g., MacBook Pro, iPhone"
                className="w-full bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-[14px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
              />
              <p className="text-[11px] text-slate-400 dark:text-white/30 mt-1.5">
                Give your passkey a name to identify it later
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={registerPasskey}
                disabled={isRegistering}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white text-[13px] font-medium transition-colors"
              >
                {isRegistering ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Fingerprint className="w-4 h-4" />
                )}
                {isRegistering ? "Registering..." : "Create Passkey"}
              </button>
              <button
                onClick={() => {
                  setShowRegisterForm(false);
                  setNewDeviceName("");
                }}
                className="px-4 py-2.5 rounded-lg text-[13px] font-medium text-slate-600 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
              </div>
            ) : passkeys.length === 0 ? (
              <div className="text-center py-8">
                <Fingerprint className="w-12 h-12 mx-auto text-slate-300 dark:text-white/20 mb-3" />
                <p className="text-[14px] text-slate-500 dark:text-white/50 mb-1">
                  No passkeys registered
                </p>
                <p className="text-[12px] text-slate-400 dark:text-white/30">
                  Add a passkey to sign in without a password using Face ID,
                  Touch ID, or a security key.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {passkeys.map((passkey) => (
                  <div
                    key={passkey.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5"
                  >
                    <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
                      {getDeviceIcon(passkey.deviceType)}
                    </div>

                    <div className="flex-1 min-w-0">
                      {editingId === passkey.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="flex-1 bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded px-2 py-1 text-[13px] text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") renamePasskey(passkey.id);
                              if (e.key === "Escape") {
                                setEditingId(null);
                                setEditName("");
                              }
                            }}
                          />
                          <button
                            onClick={() => renamePasskey(passkey.id)}
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/10"
                          >
                            <Check className="w-4 h-4 text-emerald-500" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(null);
                              setEditName("");
                            }}
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/10"
                          >
                            <X className="w-4 h-4 text-slate-400" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className="text-[13px] text-slate-900 dark:text-white font-medium truncate">
                            {passkey.deviceName || "Unnamed Passkey"}
                          </p>
                          <p className="text-[11px] text-slate-400 dark:text-white/30">
                            Added {formatDate(passkey.createdAt)}
                            {passkey.lastUsedAt &&
                              ` • Last used ${formatDate(passkey.lastUsedAt)}`}
                          </p>
                        </>
                      )}
                    </div>

                    {editingId !== passkey.id && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingId(passkey.id);
                            setEditName(passkey.deviceName || "");
                          }}
                          className="p-1.5 rounded-lg text-slate-400 dark:text-white/30 hover:text-slate-600 dark:hover:text-white/50 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                          title="Rename"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deletePasskey(passkey.id)}
                          disabled={deletingId === passkey.id}
                          className="p-1.5 rounded-lg text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50"
                          title="Remove"
                        >
                          {deletingId === passkey.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
