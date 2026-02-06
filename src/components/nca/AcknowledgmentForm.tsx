"use client";

import { useState } from "react";
import { CheckCircle2, X, AlertCircle, Loader2 } from "lucide-react";

interface AcknowledgmentFormProps {
  submissionId: string;
  ncaAuthorityLabel: string;
  onSubmit: (data: {
    ncaReference: string;
    acknowledgedBy?: string;
    notes?: string;
  }) => Promise<void>;
  onCancel: () => void;
  isOpen: boolean;
}

export function AcknowledgmentForm({
  submissionId,
  ncaAuthorityLabel,
  onSubmit,
  onCancel,
  isOpen,
}: AcknowledgmentFormProps) {
  const [ncaReference, setNcaReference] = useState("");
  const [acknowledgedBy, setAcknowledgedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!ncaReference.trim()) {
      setError("NCA reference number is required");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        ncaReference: ncaReference.trim(),
        acknowledgedBy: acknowledgedBy.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to record acknowledgment",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-navy-800 border border-navy-700 rounded-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-navy-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-200">
              Record Acknowledgment
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-navy-700 rounded transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <p className="text-sm text-slate-400">
            Record the acknowledgment received from{" "}
            <strong>{ncaAuthorityLabel}</strong> for submission{" "}
            <code className="text-xs bg-navy-900 px-1 py-0.5 rounded">
              {submissionId}
            </code>
          </p>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-sm text-red-400">{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              NCA Reference Number *
            </label>
            <input
              type="text"
              value={ncaReference}
              onChange={(e) => setNcaReference(e.target.value)}
              placeholder="e.g., NCA-2026-001234"
              className="w-full px-4 py-2 bg-navy-900 border border-navy-600 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              required
            />
            <p className="text-xs text-slate-500 mt-1">
              The reference number assigned by the NCA
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Acknowledged By
            </label>
            <input
              type="text"
              value={acknowledgedBy}
              onChange={(e) => setAcknowledgedBy(e.target.value)}
              placeholder="e.g., Dr. Schmidt, Space Division"
              className="w-full px-4 py-2 bg-navy-900 border border-navy-600 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-slate-500 mt-1">
              Name or department of the NCA contact (optional)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes about the acknowledgment..."
              rows={3}
              className="w-full px-4 py-2 bg-navy-900 border border-navy-600 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-navy-700 hover:bg-navy-600 text-slate-300 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Record Acknowledgment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AcknowledgmentForm;
