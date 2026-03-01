"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Copy,
  Check,
  Ban,
  AlertCircle,
  Clock,
  Mail,
  Shield,
  ExternalLink,
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";

// ─── Types ───

interface DataRoomLinkRow {
  id: string;
  recipientName: string;
  recipientEmail: string;
  expiresAt: string;
  viewCount: number;
  isActive: boolean;
  createdAt: string;
  token: string;
}

interface AccessLinkManagerProps {
  links: DataRoomLinkRow[];
  onCreate?: () => void;
  onRevoke?: (id: string) => void;
}

// ─── Helpers ───

function getLinkStatus(link: DataRoomLinkRow): {
  label: string;
  color: string;
  icon: typeof Shield;
} {
  if (!link.isActive) {
    return {
      label: "Revoked",
      color: "bg-red-500/10 text-red-400 border-red-500/20",
      icon: Ban,
    };
  }
  if (new Date(link.expiresAt) < new Date()) {
    return {
      label: "Expired",
      color: "bg-white/5 text-white/40 border-white/10",
      icon: Clock,
    };
  }
  return {
    label: "Active",
    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    icon: Shield,
  };
}

// ─── Row Component ───

function LinkRow({
  link,
  onRevoke,
}: {
  link: DataRoomLinkRow;
  onRevoke?: (id: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const status = getLinkStatus(link);
  const StatusIcon = status.icon;
  const isLive = link.isActive && new Date(link.expiresAt) > new Date();

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/assure/dataroom/view/${link.token}`
      : `/assure/dataroom/view/${link.token}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <motion.tr
      initial={false}
      animate={{ opacity: 1 }}
      className="border-b border-white/5 last:border-0"
    >
      {/* Recipient */}
      <td className="py-3 pr-3">
        <div className="flex flex-col">
          <span className="text-body font-medium text-white/80 truncate max-w-[180px]">
            {link.recipientName}
          </span>
          <span className="text-micro text-white/30 flex items-center gap-1 mt-0.5">
            <Mail size={10} />
            {link.recipientEmail}
          </span>
        </div>
      </td>

      {/* Expires */}
      <td className="py-3 px-3">
        <span className="text-small text-white/45">
          {new Date(link.expiresAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      </td>

      {/* Views */}
      <td className="py-3 px-3 text-center">
        <span className="text-body text-white/60">{link.viewCount}</span>
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
          <button
            onClick={handleCopy}
            disabled={!isLive}
            className="p-1.5 rounded-md text-white/30 hover:text-emerald-400 hover:bg-white/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            title="Copy access link"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>

          {isLive && (
            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-md text-white/30 hover:text-white/50 hover:bg-white/5 transition-all"
              title="Open link"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}

          {isLive && onRevoke && (
            <button
              onClick={() => onRevoke(link.id)}
              className="p-1.5 rounded-md text-white/30 hover:text-amber-400 hover:bg-white/5 transition-all"
              title="Revoke access"
            >
              <Ban className="w-4 h-4" />
            </button>
          )}
        </div>
      </td>
    </motion.tr>
  );
}

// ─── Component ───

export default function AccessLinkManager({
  links,
  onCreate,
  onRevoke,
}: AccessLinkManagerProps) {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-heading font-medium text-white">
            Data Room Access Links
          </h2>
          <p className="text-body text-white/45 mt-1">
            Create and manage secure access links for investors to view your
            data room.
          </p>
        </div>
        {onCreate && (
          <button
            onClick={onCreate}
            className="inline-flex items-center gap-2 bg-emerald-500 text-white text-body font-medium px-4 py-2.5 rounded-lg hover:bg-emerald-600 transition-all"
          >
            <Plus className="w-4 h-4" />
            Create Link
          </button>
        )}
      </div>

      {/* Table */}
      {links.length > 0 ? (
        <GlassCard hover={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" role="table">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-micro uppercase tracking-wider text-white/40 p-3 pb-2 font-medium">
                    Recipient
                  </th>
                  <th className="text-left text-micro uppercase tracking-wider text-white/40 p-3 pb-2 font-medium">
                    Expires
                  </th>
                  <th className="text-center text-micro uppercase tracking-wider text-white/40 p-3 pb-2 font-medium">
                    Views
                  </th>
                  <th className="text-left text-micro uppercase tracking-wider text-white/40 p-3 pb-2 font-medium">
                    Status
                  </th>
                  <th className="text-left text-micro uppercase tracking-wider text-white/40 p-3 pb-2 font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {links.map((link) => (
                  <LinkRow key={link.id} link={link} onRevoke={onRevoke} />
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      ) : (
        <GlassCard hover={false} className="p-10">
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <ExternalLink className="w-6 h-6 text-white/20" />
            </div>
            <h3 className="text-body-lg font-medium text-white/70 mb-1">
              No Access Links Yet
            </h3>
            <p className="text-small text-white/40 mb-4 max-w-sm">
              Create an access link to let investors securely view your data
              room documents.
            </p>
            {onCreate && (
              <button
                onClick={onCreate}
                className="inline-flex items-center gap-2 bg-emerald-500 text-white text-small font-medium px-4 py-2 rounded-lg hover:bg-emerald-600 transition-all"
              >
                <Plus className="w-4 h-4" />
                Create Your First Link
              </button>
            )}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
