"use client";

import { useState } from "react";
import { X, Send, Copy, Check, Loader2 } from "lucide-react";
import { RoleSelector } from "./RoleSelector";
import { csrfHeaders } from "@/lib/csrf-client";

type OrganizationRole = "OWNER" | "ADMIN" | "MANAGER" | "MEMBER" | "VIEWER";

interface InviteMemberDialogProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  organizationName: string;
  onInviteSent?: () => void;
}

export function InviteMemberDialog({
  isOpen,
  onClose,
  organizationId,
  organizationName,
  onInviteSent,
}: InviteMemberDialogProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrganizationRole>("MEMBER");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/invitations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...csrfHeaders() },
          body: JSON.stringify({ email, role }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send invitation");
      }

      setInviteUrl(data.invitation.inviteUrl);
      onInviteSent?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to send invitation",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCopyLink() {
    if (!inviteUrl) return;

    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error("Failed to copy");
    }
  }

  function handleClose() {
    setEmail("");
    setRole("MEMBER");
    setError(null);
    setInviteUrl(null);
    setCopied(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">
            Invite Team Member
          </h2>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/50 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {inviteUrl ? (
            // Success state
            <div className="space-y-4">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <div className="flex items-center gap-2 text-emerald-400 mb-2">
                  <Check size={16} />
                  <span className="font-medium">Invitation Created</span>
                </div>
                <p className="text-sm text-white/70">
                  An invitation has been created for{" "}
                  <span className="text-white">{email}</span> to join{" "}
                  <span className="text-white">{organizationName}</span>.
                </p>
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Invitation Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={inviteUrl}
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white/70 truncate"
                  />
                  <button
                    onClick={handleCopyLink}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                      transition-colors
                      ${
                        copied
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-white/10 text-white hover:bg-white/20"
                      }
                    `}
                  >
                    {copied ? (
                      <>
                        <Check size={14} />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <p className="mt-2 text-xs text-white/50">
                  Share this link with {email}. It expires in 7 days.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    setInviteUrl(null);
                    setEmail("");
                  }}
                  className="px-4 py-2 text-sm text-white/70 hover:text-white transition-colors"
                >
                  Invite Another
                </button>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            // Form state
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                  {error}
                </div>
              )}

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-white/70 mb-1.5"
                >
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  required
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">
                  Role
                </label>
                <RoleSelector
                  value={role}
                  onChange={setRole}
                  excludeOwner={true}
                />
                <p className="mt-1.5 text-xs text-white/50">
                  Choose the level of access for this team member.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm text-white/70 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !email}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      Send Invitation
                    </>
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

export default InviteMemberDialog;
