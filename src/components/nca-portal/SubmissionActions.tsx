"use client";

import { useState } from "react";
import { CheckCircle, RotateCcw, XCircle, ChevronDown } from "lucide-react";

interface SubmissionActionsProps {
  submissionId: string;
  currentStatus: string;
  currentPriority: string;
  onUpdate: () => void;
}

const PRIORITY_OPTIONS = [
  { value: "URGENT", label: "Urgent", color: "text-red-400" },
  { value: "HIGH", label: "High", color: "text-amber-400" },
  { value: "NORMAL", label: "Normal", color: "text-blue-400" },
  { value: "LOW", label: "Low", color: "text-slate-400" },
];

export default function SubmissionActions({
  submissionId,
  currentStatus,
  currentPriority,
  onUpdate,
}: SubmissionActionsProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showPriority, setShowPriority] = useState(false);

  const handlePriorityChange = async (priority: string) => {
    setIsUpdating(true);
    try {
      const res = await fetch(
        `/api/nca-portal/submissions/${submissionId}/priority`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priority }),
        },
      );
      if (!res.ok) throw new Error("Failed to update priority");
      setShowPriority(false);
      onUpdate();
    } catch (error) {
      console.error("Failed to update priority:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStatusUpdate = async (status: string, notes?: string) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/nca/submissions/${submissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      onUpdate();
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const isTerminal = ["APPROVED", "REJECTED", "WITHDRAWN"].includes(
    currentStatus,
  );

  return (
    <div className="space-y-3">
      {/* Priority selector */}
      <div className="relative">
        <button
          onClick={() => setShowPriority(!showPriority)}
          className="w-full flex items-center justify-between px-3 py-2 text-sm bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-lg text-slate-900 dark:text-white hover:border-slate-300 dark:hover:border-navy-600 transition-colors"
        >
          <span>
            Priority:{" "}
            <span
              className={
                PRIORITY_OPTIONS.find((p) => p.value === currentPriority)
                  ?.color || ""
              }
            >
              {currentPriority}
            </span>
          </span>
          <ChevronDown size={14} />
        </button>
        {showPriority && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-lg shadow-lg z-10 overflow-hidden">
            {PRIORITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handlePriorityChange(opt.value)}
                disabled={isUpdating}
                className={`
                  w-full text-left px-3 py-2 text-sm transition-colors
                  ${opt.value === currentPriority ? "bg-blue-50 dark:bg-blue-500/10" : "hover:bg-slate-50 dark:hover:bg-white/[0.04]"}
                  ${opt.color}
                `}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      {!isTerminal && (
        <div className="space-y-2">
          {currentStatus === "SUBMITTED" && (
            <button
              onClick={() =>
                handleStatusUpdate("RECEIVED", "Receipt confirmed")
              }
              disabled={isUpdating}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 rounded-lg transition-colors disabled:opacity-50"
            >
              <CheckCircle size={14} />
              Mark as Received
            </button>
          )}

          {(currentStatus === "SUBMITTED" ||
            currentStatus === "RECEIVED" ||
            currentStatus === "UNDER_REVIEW") && (
            <button
              onClick={() =>
                handleStatusUpdate("WITHDRAWN", "Withdrawn by operator")
              }
              disabled={isUpdating}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/[0.08] rounded-lg transition-colors disabled:opacity-50"
            >
              <XCircle size={14} />
              Withdraw
            </button>
          )}

          {currentStatus === "REJECTED" ||
          currentStatus === "INFORMATION_REQUESTED" ? (
            <button
              onClick={() =>
                handleStatusUpdate("SUBMITTED", "Resubmitted with updates")
              }
              disabled={isUpdating}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50"
            >
              <RotateCcw size={14} />
              Resend
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
