"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy,
  Check,
  Trash2,
  Ban,
  Plus,
  ExternalLink,
  Eye,
  Clock,
  Shield,
  AlertCircle,
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";

export interface ShareLink {
  id: string;
  token: string;
  label: string;
  granularity: "SUMMARY" | "COMPONENT" | "DETAILED";
  expiresAt: string;
  maxViews: number | null;
  viewCount: number;
  isRevoked: boolean;
  includeRRS: boolean;
  includeGapAnalysis: boolean;
  includeTimeline: boolean;
  includeRiskRegister: boolean;
  includeTrend: boolean;
  createdAt: string;
}

interface ShareLinkManagerProps {
  links: ShareLink[];
  onCreateNew: () => void;
  onRevoke: (id: string) => void;
  onDelete: (id: string) => void;
}

function getLinkStatus(link: ShareLink): {
  label: string;
  color: string;
  icon: typeof Shield;
} {
  if (link.isRevoked)
    return {
      label: "Revoked",
      color:
        "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
      icon: Ban,
    };
  if (new Date(link.expiresAt) < new Date())
    return {
      label: "Expired",
      color:
        "bg-slate-100 text-slate-500 border-slate-200 dark:bg-white/5 dark:text-white/40 dark:border-[--glass-border-subtle]",
      icon: Clock,
    };
  if (link.maxViews && link.viewCount >= link.maxViews)
    return {
      label: "View Limit Reached",
      color:
        "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
      icon: Eye,
    };
  return {
    label: "Active",
    color:
      "bg-green-50 text-green-600 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20",
    icon: Shield,
  };
}

function getGranularityLabel(g: string): string {
  switch (g) {
    case "SUMMARY":
      return "Summary";
    case "COMPONENT":
      return "Component";
    case "DETAILED":
      return "Detailed";
    default:
      return g;
  }
}

function ShareLinkRow({
  link,
  onRevoke,
  onDelete,
}: {
  link: ShareLink;
  onRevoke: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const status = getLinkStatus(link);
  const StatusIcon = status.icon;
  const isActive =
    !link.isRevoked &&
    new Date(link.expiresAt) > new Date() &&
    (!link.maxViews || link.viewCount < link.maxViews);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/assure/share/${link.token}`
      : `/assure/share/${link.token}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement("input");
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDelete = () => {
    if (confirmDelete) {
      onDelete(link.id);
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  return (
    <motion.tr
      initial={false}
      animate={{ opacity: 1 }}
      className="border-b border-slate-100 dark:border-white/5 last:border-0"
    >
      {/* Label */}
      <td className="py-3 pr-3">
        <div className="flex flex-col">
          <span className="text-body font-medium text-slate-800 dark:text-white/80 truncate max-w-[200px]">
            {link.label}
          </span>
          <span className="text-micro text-slate-400 dark:text-white/30 mt-0.5">
            {getGranularityLabel(link.granularity)}
          </span>
        </div>
      </td>

      {/* Created */}
      <td className="py-3 px-3">
        <span className="text-small text-slate-500 dark:text-white/45">
          {new Date(link.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      </td>

      {/* Expires */}
      <td className="py-3 px-3">
        <span className="text-small text-slate-500 dark:text-white/45">
          {new Date(link.expiresAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      </td>

      {/* Views */}
      <td className="py-3 px-3 text-center">
        <span className="text-body text-slate-700 dark:text-white/60">
          {link.viewCount}
          {link.maxViews ? (
            <span className="text-slate-400 dark:text-white/30">
              /{link.maxViews}
            </span>
          ) : null}
        </span>
      </td>

      {/* Status */}
      <td className="py-3 px-3">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-micro font-medium ${status.color}`}
        >
          <StatusIcon className="w-3 h-3" />
          {status.label}
        </span>
      </td>

      {/* Actions */}
      <td className="py-3 pl-3">
        <div className="flex items-center gap-1">
          {/* Copy link */}
          <button
            onClick={handleCopy}
            disabled={!isActive}
            className="p-1.5 rounded-md text-slate-400 dark:text-white/30 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            title="Copy share link"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>

          {/* Open in new tab */}
          {isActive && (
            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-md text-slate-400 dark:text-white/30 hover:text-slate-600 dark:hover:text-white/50 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
              title="Open share link"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}

          {/* Revoke */}
          {isActive && (
            <button
              onClick={() => onRevoke(link.id)}
              className="p-1.5 rounded-md text-slate-400 dark:text-white/30 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
              title="Revoke link"
            >
              <Ban className="w-4 h-4" />
            </button>
          )}

          {/* Delete */}
          <button
            onClick={handleDelete}
            className={`p-1.5 rounded-md transition-all ${
              confirmDelete
                ? "text-red-500 bg-red-50 dark:bg-red-500/10"
                : "text-slate-400 dark:text-white/30 hover:text-red-500 dark:hover:text-red-400 hover:bg-slate-50 dark:hover:bg-white/5"
            }`}
            title={
              confirmDelete ? "Click again to confirm delete" : "Delete link"
            }
          >
            {confirmDelete ? (
              <AlertCircle className="w-4 h-4" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </td>
    </motion.tr>
  );
}

export default function ShareLinkManager({
  links,
  onCreateNew,
  onRevoke,
  onDelete,
}: ShareLinkManagerProps) {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-heading font-medium text-slate-900 dark:text-white">
            Share Links
          </h2>
          <p className="text-body text-slate-500 dark:text-white/45 mt-1">
            Generate secure, time-limited links to share your compliance posture
            with investors and partners.
          </p>
        </div>
        <button
          onClick={onCreateNew}
          className="inline-flex items-center gap-2 bg-emerald-500 text-white text-body font-medium px-4 py-2.5 rounded-lg hover:bg-emerald-600 transition-all"
        >
          <Plus className="w-4 h-4" />
          Create Link
        </button>
      </div>

      {/* Table */}
      {links.length > 0 ? (
        <GlassCard hover={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" role="table">
              <thead>
                <tr className="border-b border-slate-100 dark:border-[--glass-border-subtle]">
                  <th className="text-left text-micro uppercase tracking-wider text-slate-400 dark:text-white/40 p-3 pb-2 font-medium">
                    Label
                  </th>
                  <th className="text-left text-micro uppercase tracking-wider text-slate-400 dark:text-white/40 p-3 pb-2 font-medium">
                    Created
                  </th>
                  <th className="text-left text-micro uppercase tracking-wider text-slate-400 dark:text-white/40 p-3 pb-2 font-medium">
                    Expires
                  </th>
                  <th className="text-center text-micro uppercase tracking-wider text-slate-400 dark:text-white/40 p-3 pb-2 font-medium">
                    Views
                  </th>
                  <th className="text-left text-micro uppercase tracking-wider text-slate-400 dark:text-white/40 p-3 pb-2 font-medium">
                    Status
                  </th>
                  <th className="text-left text-micro uppercase tracking-wider text-slate-400 dark:text-white/40 p-3 pb-2 font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {links.map((link) => (
                  <ShareLinkRow
                    key={link.id}
                    link={link}
                    onRevoke={onRevoke}
                    onDelete={onDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      ) : (
        <GlassCard hover={false} className="p-10">
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center mb-4">
              <ExternalLink className="w-6 h-6 text-slate-400 dark:text-white/30" />
            </div>
            <h3 className="text-body-lg font-medium text-slate-700 dark:text-white/70 mb-1">
              No Share Links Yet
            </h3>
            <p className="text-small text-slate-500 dark:text-white/45 mb-4 max-w-sm">
              Create a share link to let investors view your Regulatory
              Readiness Score and compliance posture through a secure,
              time-limited URL.
            </p>
            <button
              onClick={onCreateNew}
              className="inline-flex items-center gap-2 bg-emerald-500 text-white text-small font-medium px-4 py-2 rounded-lg hover:bg-emerald-600 transition-all"
            >
              <Plus className="w-4 h-4" />
              Create Your First Link
            </button>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
