"use client";

import { motion } from "framer-motion";
import { ArrowRight, Hash, XCircle, Link2 } from "lucide-react";

export interface HashChainNode {
  id: string;
  title: string;
  signatureHash: string;
  previousHash: string | null;
  issuedAt: string;
  isRevoked: boolean;
  signerName: string;
}

interface HashChainVisualizerProps {
  chain: HashChainNode[];
}

function abbreviateHash(hash: string): string {
  if (hash.length <= 12) return hash;
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function HashChainVisualizer({
  chain,
}: HashChainVisualizerProps) {
  const sorted = [...chain].sort(
    (a, b) => new Date(a.issuedAt).getTime() - new Date(b.issuedAt).getTime(),
  );

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Link2 size={32} className="text-slate-300 dark:text-white/20 mb-3" />
        <p className="text-body text-slate-500 dark:text-white/50">
          No hash chain entries yet.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex items-center gap-0 min-w-max px-2 py-4">
        {sorted.map((node, index) => (
          <div key={node.id} className="flex items-center">
            {/* Arrow from previous */}
            {index > 0 && (
              <div className="flex flex-col items-center mx-2">
                <ArrowRight
                  size={16}
                  className="text-slate-300 dark:text-white/20"
                />
                {node.previousHash && (
                  <span className="text-micro text-slate-400 dark:text-white/20 font-mono mt-0.5">
                    {abbreviateHash(node.previousHash)}
                  </span>
                )}
              </div>
            )}

            {/* Node */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
              className={`relative flex flex-col items-center p-3 rounded-xl border-2 min-w-[140px] ${
                node.isRevoked
                  ? "border-red-500/30 bg-red-500/5 dark:bg-red-500/10"
                  : "border-slate-200 dark:border-[--glass-border-subtle] bg-white dark:bg-[--glass-bg-elevated]"
              }`}
            >
              {/* Revoked indicator */}
              {node.isRevoked && (
                <div className="absolute -top-2 -right-2">
                  <XCircle
                    size={16}
                    className="text-red-500 bg-white dark:bg-slate-900 rounded-full"
                  />
                </div>
              )}

              {/* Hash */}
              <div
                className={`flex items-center gap-1 text-micro font-mono px-2 py-0.5 rounded ${
                  node.isRevoked
                    ? "bg-red-500/10 text-red-500 dark:text-red-400"
                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                }`}
              >
                <Hash size={10} />
                {abbreviateHash(node.signatureHash)}
              </div>

              {/* Title */}
              <p
                className={`text-caption font-medium text-slate-900 dark:text-white mt-2 text-center leading-tight ${
                  node.isRevoked ? "line-through opacity-60" : ""
                }`}
              >
                {node.title}
              </p>

              {/* Signer */}
              <p className="text-micro text-slate-500 dark:text-white/40 mt-1">
                {node.signerName}
              </p>

              {/* Date */}
              <p className="text-micro text-slate-400 dark:text-white/30 mt-0.5">
                {formatDate(node.issuedAt)}
              </p>
            </motion.div>
          </div>
        ))}
      </div>
    </div>
  );
}
