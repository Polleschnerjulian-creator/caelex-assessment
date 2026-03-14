"use client";

import { useState, useRef } from "react";
import { X, Send, Paperclip, FileText } from "lucide-react";
import { csrfHeaders } from "@/lib/csrf-client";

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
  const [attachments, setAttachments] = useState<
    { fileName: string; fileSize: number; fileUrl: string }[]
  >([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        // Get presigned URL
        const presignRes = await fetch("/api/documents/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...csrfHeaders() },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
          }),
        });
        if (!presignRes.ok) throw new Error("Failed to get upload URL");
        const { uploadUrl, fileUrl } = await presignRes.json();

        // Upload to R2/S3
        await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });

        setAttachments((prev) => [
          ...prev,
          { fileName: file.name, fileSize: file.size, fileUrl },
        ]);
      }
    } catch (error) {
      console.error("File upload failed:", error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

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
            attachments: attachments.length > 0 ? attachments : undefined,
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
    <div
      className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="correspondence-form-title"
    >
      <div className="bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-dark-border">
          <h3
            id="correspondence-form-title"
            className="text-sm font-medium text-slate-900 dark:text-white"
          >
            Log Communication
          </h3>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded transition-colors"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="corr-direction"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
              >
                Direction
              </label>
              <select
                id="corr-direction"
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-lg text-slate-900 dark:text-white"
              >
                {DIRECTION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="corr-type"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
              >
                Type
              </label>
              <select
                id="corr-type"
                value={messageType}
                onChange={(e) => setMessageType(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-lg text-slate-900 dark:text-white"
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
            <label
              htmlFor="corr-subject"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
            >
              Subject
            </label>
            <input
              id="corr-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject of the communication"
              className="w-full px-3 py-2 text-sm bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-lg text-slate-900 dark:text-white placeholder-slate-400"
              required
              aria-required="true"
            />
          </div>

          <div>
            <label
              htmlFor="corr-content"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
            >
              Content
            </label>
            <textarea
              id="corr-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Content or summary of the communication"
              rows={4}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-lg text-slate-900 dark:text-white placeholder-slate-400 resize-none"
              required
              aria-required="true"
            />
          </div>

          {direction === "INBOUND" && (
            <div>
              <label
                htmlFor="corr-nca-contact"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
              >
                NCA Contact Name
              </label>
              <input
                id="corr-nca-contact"
                type="text"
                value={ncaContactName}
                onChange={(e) => setNcaContactName(e.target.value)}
                placeholder="Name of NCA contact person"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-lg text-slate-900 dark:text-white placeholder-slate-400"
              />
            </div>
          )}

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={requiresResponse}
                onChange={(e) => setRequiresResponse(e.target.checked)}
                className="rounded border-slate-300 dark:border-dark-border"
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
                aria-label="Response deadline"
                className="px-3 py-1.5 text-xs bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-lg text-slate-900 dark:text-white"
              />
            )}
          </div>

          {/* Attachments */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Attachments
            </label>
            {attachments.length > 0 && (
              <div className="space-y-1 mb-2">
                {attachments.map((att, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-3 py-1.5 bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-lg"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText
                        size={14}
                        className="text-slate-400 shrink-0"
                        aria-hidden="true"
                      />
                      <span className="text-xs text-slate-700 dark:text-slate-300 truncate">
                        {att.fileName}
                      </span>
                      <span className="text-xs text-slate-400">
                        {(att.fileSize / 1024).toFixed(0)} KB
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(i)}
                      className="p-0.5 text-slate-400 hover:text-red-500 transition-colors"
                      aria-label={`Remove ${att.fileName}`}
                    >
                      <X size={12} aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-dashed border-slate-300 dark:border-dark-border rounded-lg transition-colors disabled:opacity-50"
            >
              <Paperclip size={12} aria-hidden="true" />
              {isUploading ? "Uploading..." : "Attach files"}
            </button>
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
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Send size={14} aria-hidden="true" />
              {isSubmitting ? "Saving..." : "Save Entry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
