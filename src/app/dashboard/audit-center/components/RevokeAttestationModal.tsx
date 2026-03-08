"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, AlertTriangle, Loader2 } from "lucide-react";
import { csrfHeaders } from "@/lib/csrf-client";

interface Props {
  isOpen: boolean;
  attestationId: string;
  attestationDbId: string;
  regulationName: string;
  onClose: () => void;
  onRevoked: () => void;
}

export default function RevokeAttestationModal({
  isOpen,
  attestationId,
  attestationDbId,
  regulationName,
  onClose,
  onRevoked,
}: Props) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRevoke = async () => {
    if (!reason.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/v1/verity/attestation/${attestationDbId}/revoke`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...csrfHeaders() },
          body: JSON.stringify({ reason: reason.trim() }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to revoke");
      }
      onRevoked();
      onClose();
      setReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-[440px] glass-floating rounded-[var(--radius-xl)] border border-[var(--glass-border-medium)] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--separator)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--status-danger-bg)] flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-[var(--status-danger)]" />
            </div>
            <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
              Revoke Attestation
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--fill-light)] transition-colors"
          >
            <X size={16} className="text-[var(--text-tertiary)]" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          <div className="glass-inset rounded-[var(--radius-md)] p-3">
            <div className="text-[11px] text-[var(--text-tertiary)]">
              Attestation
            </div>
            <div className="text-[12px] font-mono text-[var(--text-secondary)] mt-0.5">
              {attestationId}
            </div>
            <div className="text-[11px] text-[var(--text-tertiary)] mt-1">
              {regulationName}
            </div>
          </div>

          <div className="p-3 bg-[var(--status-danger-bg)] border border-[var(--status-danger-border)] rounded-[var(--radius-md)]">
            <p className="text-[12px] text-[var(--status-danger)]">
              Revoking an attestation is permanent. The attestation will show as
              REVOKED in all verification checks.
            </p>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">
              Reason for revocation
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this attestation is being revoked..."
              rows={3}
              className="w-full px-3 py-2 text-[13px] bg-[var(--fill-light)] border border-[var(--fill-strong)] rounded-[var(--radius-sm)] text-[var(--text-primary)] placeholder:text-[var(--text-disabled)] focus:border-[var(--status-danger)] focus:outline-none transition-colors resize-none"
            />
          </div>

          {error && (
            <p className="text-[12px] text-[var(--status-danger)]">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--separator)] flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleRevoke}
            disabled={!reason.trim() || submitting}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--status-danger)] text-white text-[13px] font-medium rounded-[var(--radius-sm)] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            Revoke Attestation
          </button>
        </div>
      </motion.div>
    </div>
  );
}
