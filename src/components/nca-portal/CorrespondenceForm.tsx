"use client";

import { useState } from "react";
import { X, Send } from "lucide-react";

interface CorrespondenceFormProps {
  submissionId: string;
  onClose: () => void;
  onSubmit: () => void;
}

const DIRECTION_OPTIONS = [
  { value: "OUTBOUND", label: "Sent to NCA" },
  { value: "INBOUND", label: "Received from NCA" },
];

const MESSAGE_TYPE_OPTIONS = [
  { value: "EMAIL", label: "Email" },
  { value: "LETTER", label: "Letter" },
  { value: "PORTAL_MSG", label: "Portal Message" },
  { value: "PHONE_CALL", label: "Phone Call" },
  { value: "MEETING_NOTE", label: "Meeting Note" },
];

export default function CorrespondenceForm({
  submissionId,
  onClose,
  onSubmit,
}: CorrespondenceFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [direction, setDirection] = useState("OUTBOUND");
  const [messageType, setMessageType] = useState("EMAIL");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [ncaContactName, setNcaContactName] = useState("");
  const [requiresResponse, setRequiresResponse] = useState(false);
  const [responseDeadline, setResponseDeadline] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !content.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(
        `/api/nca-portal/submissions/${submissionId}/correspondence`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            direction,
            messageType,
            subject: subject.trim(),
            content: content.trim(),
            ncaContactName: ncaContactName.trim() || undefined,
            requiresResponse,
            responseDeadline: responseDeadline || undefined,
          }),
        },
      );

      if (!res.ok) throw new Error("Failed to create correspondence");

      onSubmit();
      onClose();
    } catch (error) {
      console.error("Failed to create correspondence:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-navy-700">
          <h3 className="text-sm font-medium text-slate-900 dark:text-white">
            Log Communication
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Direction
              </label>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-lg text-slate-900 dark:text-white"
              >
                {DIRECTION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Type
              </label>
              <select
                value={messageType}
                onChange={(e) => setMessageType(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-lg text-slate-900 dark:text-white"
              >
                {MESSAGE_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject of the communication"
              className="w-full px-3 py-2 text-sm bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Content or summary of the communication"
              rows={4}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 resize-none"
              required
            />
          </div>

          {direction === "INBOUND" && (
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                NCA Contact Name
              </label>
              <input
                type="text"
                value={ncaContactName}
                onChange={(e) => setNcaContactName(e.target.value)}
                placeholder="Name of NCA contact person"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400"
              />
            </div>
          )}

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={requiresResponse}
                onChange={(e) => setRequiresResponse(e.target.checked)}
                className="rounded border-slate-300 dark:border-navy-600"
              />
              <span className="text-xs text-slate-600 dark:text-slate-400">
                Requires response
              </span>
            </label>

            {requiresResponse && (
              <input
                type="date"
                value={responseDeadline}
                onChange={(e) => setResponseDeadline(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-lg text-slate-900 dark:text-white"
              />
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !subject.trim() || !content.trim()}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Send size={14} />
              {isSubmitting ? "Saving..." : "Save Entry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
