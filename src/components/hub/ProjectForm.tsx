"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { csrfHeaders } from "@/lib/csrf-client";

interface ProjectFormProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  initialData?: {
    id: string;
    name: string;
    description?: string | null;
    color?: string | null;
  };
}

const COLOR_PRESETS = [
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#F59E0B",
  "#10B981",
  "#EF4444",
  "#06B6D4",
  "#F97316",
];

export default function ProjectForm({
  open,
  onClose,
  onCreated,
  initialData,
}: ProjectFormProps) {
  const isEdit = !!initialData?.id;

  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(
    initialData?.description ?? "",
  );
  const [color, setColor] = useState(initialData?.color ?? COLOR_PRESETS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(initialData?.name ?? "");
    setDescription(initialData?.description ?? "");
    setColor(initialData?.color ?? COLOR_PRESETS[0]);
    setError(null);
  }, [initialData, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const url = isEdit
        ? `/api/v1/hub/projects/${initialData!.id}`
        : "/api/v1/hub/projects";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...csrfHeaders(),
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          color,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Something went wrong");
        return;
      }

      onCreated();
      onClose();
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="project-form-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={handleBackdropClick}
        >
          <motion.div
            key="project-form-modal"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="bg-white w-full max-w-md rounded-2xl border border-[#e5e5ea] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.08),0_12px_48px_rgba(0,0,0,0.12)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[17px] font-semibold text-[#1d1d1f]">
                {isEdit ? "Edit Project" : "New Project"}
              </h2>
              <button
                onClick={onClose}
                className="p-1.5 text-[#86868b] hover:text-[#1d1d1f] rounded-lg hover:bg-[#f5f5f7] transition-colors"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name */}
              <div>
                <label
                  htmlFor="project-name"
                  className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5"
                >
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="project-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  required
                  placeholder="Project name"
                  className="w-full bg-white border border-[#e5e5ea] rounded-xl px-3 py-2.5 text-[15px] text-[#1d1d1f] placeholder:text-[#86868b]/50 focus:outline-none focus:border-[#1d1d1f]/30 focus:ring-1 focus:ring-[#1d1d1f]/10 transition-colors"
                />
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="project-description"
                  className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5"
                >
                  Description
                  <span className="text-[#86868b] ml-1">(optional)</span>
                </label>
                <textarea
                  id="project-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={5000}
                  rows={3}
                  placeholder="Describe the project…"
                  className="w-full bg-white border border-[#e5e5ea] rounded-xl px-3 py-2.5 text-[15px] text-[#1d1d1f] placeholder:text-[#86868b]/50 focus:outline-none focus:border-[#1d1d1f]/30 focus:ring-1 focus:ring-[#1d1d1f]/10 transition-colors resize-none"
                />
              </div>

              {/* Color picker */}
              <div>
                <p className="text-[13px] font-medium text-[#1d1d1f] mb-2">
                  Color
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setColor(preset)}
                      className={`w-7 h-7 rounded-full transition-all duration-150 flex-shrink-0 ${
                        color === preset
                          ? "ring-2 ring-[#1d1d1f] ring-offset-2 ring-offset-white scale-110"
                          : "hover:scale-105 opacity-80 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: preset }}
                      aria-label={`Select color ${preset}`}
                      aria-pressed={color === preset}
                    />
                  ))}
                </div>
              </div>

              {/* Error */}
              {error && (
                <p className="text-[13px] text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2.5 text-[14px] font-medium text-[#1d1d1f] rounded-full bg-[#f5f5f7] hover:bg-[#e8e8ed] transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#1d1d1f] hover:bg-[#000000] text-white text-[14px] font-medium rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading && <Loader2 size={14} className="animate-spin" />}
                  {isEdit ? "Save Changes" : "Create Project"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
