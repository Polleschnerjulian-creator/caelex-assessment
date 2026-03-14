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
      <div className="space-y-8">
        <div>
          <p className="text-[13px] font-medium text-slate-500 dark:text-white/40 uppercase tracking-wider mb-3 px-1">
            Passkeys
          </p>
          <div className="rounded-2xl bg-white/60 dark:bg-white/[0.035] border border-black/[0.04] dark:border-white/[0.06] overflow-hidden">
            <div className="px-5 py-5">
              <p className="text-[15px] text-slate-500 dark:text-white/40">
                Your browser or device doesn&apos;t support passkeys. Try using
                a modern browser like Chrome, Safari, or Edge.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AnimatePresence mode="wait">
        {showRegisterForm ? (
          <motion.div
            key="register"
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <p className="text-[13px] font-medium text-slate-500 dark:text-white/40 uppercase tracking-wider mb-3 px-1">
              Add Passkey
            </p>
            <div className="rounded-2xl bg-white/60 dark:bg-white/[0.035] border border-black/[0.04] dark:border-white/[0.06] overflow-hidden">
              <div className="px-5 py-5 space-y-5">
                <div>
                  <label
                    htmlFor="passkey-device-name"
                    className="block text-[13px] font-medium text-slate-500 dark:text-white/40 mb-2"
                  >
                    Device Name (optional)
                  </label>
                  <input
                    id="passkey-device-name"
                    type="text"
                    value={newDeviceName}
                    onChange={(e) => setNewDeviceName(e.target.value)}
                    placeholder="e.g., MacBook Pro, iPhone"
                    className="w-full bg-white/80 dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-4 py-2.5 text-[15px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/25 focus:border-slate-400 dark:focus:border-white/25 focus:outline-none transition-colors"
                  />
                  <p className="text-[12px] text-slate-400 dark:text-white/25 mt-1.5">
                    Give your passkey a name to identify it later
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={registerPasskey}
                    disabled={isRegistering}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 dark:bg-white hover:bg-slate-700 dark:hover:bg-white/90 disabled:opacity-50 text-white dark:text-slate-900 text-[15px] font-medium transition-colors"
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
                    className="px-5 py-2.5 rounded-xl text-[15px] font-medium text-slate-600 dark:text-white/60 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Passkey List */}
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <p className="text-[13px] font-medium text-slate-500 dark:text-white/40 uppercase tracking-wider">
                  Passkeys
                </p>
                <button
                  onClick={() => setShowRegisterForm(true)}
                  className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/60 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </button>
              </div>

              <div className="rounded-2xl bg-white/60 dark:bg-white/[0.035] border border-black/[0.04] dark:border-white/[0.06] divide-y divide-black/[0.04] dark:divide-white/[0.06] overflow-hidden">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 text-slate-400 dark:text-white/30 animate-spin" />
                  </div>
                ) : passkeys.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <Fingerprint className="w-10 h-10 mx-auto text-slate-300 dark:text-white/15 mb-3" />
                    <p className="text-[15px] text-slate-500 dark:text-white/40 mb-1">
                      No passkeys registered
                    </p>
                    <p className="text-[13px] text-slate-400 dark:text-white/25">
                      Add a passkey to sign in without a password using Face ID,
                      Touch ID, or a security key.
                    </p>
                  </div>
                ) : (
                  passkeys.map((passkey) => (
                    <div
                      key={passkey.id}
                      className="flex items-center justify-between px-5 py-3.5"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center text-slate-500 dark:text-white/50 flex-shrink-0">
                          {getDeviceIcon(passkey.deviceType)}
                        </div>

                        <div className="flex-1 min-w-0">
                          {editingId === passkey.id ? (
                            <div className="flex items-center gap-2">
                              <label
                                htmlFor={`passkey-rename-${passkey.id}`}
                                className="sr-only"
                              >
                                Rename passkey
                              </label>
                              <input
                                id={`passkey-rename-${passkey.id}`}
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="flex-1 bg-white/80 dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.1] rounded-lg px-3 py-1.5 text-[15px] text-slate-900 dark:text-white focus:border-slate-400 dark:focus:border-white/25 focus:outline-none transition-colors"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter")
                                    renamePasskey(passkey.id);
                                  if (e.key === "Escape") {
                                    setEditingId(null);
                                    setEditName("");
                                  }
                                }}
                              />
                              <button
                                onClick={() => renamePasskey(passkey.id)}
                                className="p-1.5 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
                                aria-label="Confirm rename"
                              >
                                <Check
                                  className="w-4 h-4 text-green-500"
                                  aria-hidden="true"
                                />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingId(null);
                                  setEditName("");
                                }}
                                className="p-1.5 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
                                aria-label="Cancel rename"
                              >
                                <X
                                  className="w-4 h-4 text-slate-400 dark:text-white/40"
                                  aria-hidden="true"
                                />
                              </button>
                            </div>
                          ) : (
                            <>
                              <p className="text-[15px] text-slate-900 dark:text-white font-medium truncate">
                                {passkey.deviceName || "Unnamed Passkey"}
                              </p>
                              <p className="text-[12px] text-slate-400 dark:text-white/25">
                                Added {formatDate(passkey.createdAt)}
                                {passkey.lastUsedAt &&
                                  ` \u00B7 Last used ${formatDate(passkey.lastUsedAt)}`}
                              </p>
                            </>
                          )}
                        </div>
                      </div>

                      {editingId !== passkey.id && (
                        <div className="flex items-center gap-1 flex-shrink-0 ml-3">
                          <button
                            onClick={() => {
                              setEditingId(passkey.id);
                              setEditName(passkey.deviceName || "");
                            }}
                            className="p-1.5 rounded-lg text-slate-400 dark:text-white/25 hover:text-slate-600 dark:hover:text-white/60 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
                            title="Rename"
                            aria-label={`Rename passkey ${passkey.deviceName || "Unnamed Passkey"}`}
                          >
                            <Edit2 className="w-4 h-4" aria-hidden="true" />
                          </button>
                          <button
                            onClick={() => deletePasskey(passkey.id)}
                            disabled={deletingId === passkey.id}
                            className="p-1.5 rounded-lg text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50"
                            title="Remove"
                            aria-label={`Remove passkey ${passkey.deviceName || "Unnamed Passkey"}`}
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
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
