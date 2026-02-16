"use client";

import { useState, useEffect, useCallback } from "react";
import { csrfHeaders } from "@/lib/csrf-client";
import { Copy, Check, Send, Users, Gift } from "lucide-react";

interface Referral {
  id: string;
  referredEmail: string;
  code: string;
  status: "PENDING" | "SIGNED_UP" | "CONVERTED" | "EXPIRED";
  rewardGranted: boolean;
  createdAt: string;
  convertedAt: string | null;
}

export default function ReferralsPage() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://app.caelex.eu";

  const fetchReferrals = useCallback(async () => {
    try {
      const res = await fetch("/api/referrals");
      if (!res.ok) throw new Error("Failed to fetch referrals");
      const data = await res.json();
      setReferrals(data.referrals || []);
    } catch (err) {
      console.error("Failed to load referrals:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  const referralLink =
    referrals.length > 0 ? `${baseUrl}/signup?ref=${referrals[0].code}` : null;

  const handleCopy = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for insecure contexts
      const textarea = document.createElement("textarea");
      textarea.value = referralLink;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email.trim()) {
      setError("Please enter an email address.");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/referrals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...csrfHeaders(),
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send invite");
      }

      setSuccess(`Invite sent to ${email.trim()}`);
      setEmail("");
      fetchReferrals();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invite");
    } finally {
      setSending(false);
    }
  };

  // Stats
  const totalReferrals = referrals.length;
  const signedUp = referrals.filter(
    (r) => r.status === "SIGNED_UP" || r.status === "CONVERTED",
  ).length;
  const converted = referrals.filter((r) => r.status === "CONVERTED").length;

  const statusBadge = (status: Referral["status"]) => {
    switch (status) {
      case "CONVERTED":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
            Converted
          </span>
        );
      case "SIGNED_UP":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Signed Up
          </span>
        );
      case "EXPIRED":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
            Expired
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
            Pending
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Referral Program
        </h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">
          Invite colleagues to Caelex and earn rewards when they subscribe.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Total Referrals
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {totalReferrals}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Send className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Signed Up
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {signedUp}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Gift className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Converted
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {converted}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Referral Link */}
      <div className="bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Your Referral Link
        </h2>
        {referralLink ? (
          <div className="flex items-center gap-3">
            <input
              type="text"
              readOnly
              value={referralLink}
              className="flex-1 bg-slate-100 dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-slate-300 font-mono"
            />
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy
                </>
              )}
            </button>
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Send your first invite below to generate your referral link.
          </p>
        )}
      </div>

      {/* Invite by Email */}
      <div className="bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Invite by Email
        </h2>
        <form onSubmit={handleInvite} className="flex items-start gap-3">
          <div className="flex-1">
            <input
              type="email"
              placeholder="colleague@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-100 dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            disabled={sending}
            className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
          >
            <Send className="w-4 h-4" />
            {sending ? "Sending..." : "Send Invite"}
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        {success && <p className="mt-3 text-sm text-green-400">{success}</p>}
      </div>

      {/* Referral Table */}
      <div className="bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-navy-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Referral History
          </h2>
        </div>
        {referrals.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Users className="w-10 h-10 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              No referrals yet. Send your first invite to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-navy-700">
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Invited
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Converted
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-navy-700">
                {referrals.map((referral) => (
                  <tr
                    key={referral.id}
                    className="hover:bg-slate-50 dark:hover:bg-navy-700/50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-200">
                      {referral.referredEmail}
                    </td>
                    <td className="px-6 py-4">
                      {statusBadge(referral.status)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                      {new Date(referral.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                      {referral.convertedAt
                        ? new Date(referral.convertedAt).toLocaleDateString()
                        : "\u2014"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
