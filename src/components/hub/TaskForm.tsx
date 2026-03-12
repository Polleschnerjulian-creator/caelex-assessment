"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { PriorityIcon } from "./PriorityIcon";
import { MemberPicker } from "./MemberPicker";
import { csrfHeaders } from "@/lib/csrf-client";

interface TaskFormProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  projectId?: string;
  projects: { id: string; name: string; color: string | null }[];
  members: { id: string; name: string | null; image: string | null }[];
  initialData?: {
    id: string;
    title: string;
    description?: string | null;
    priority: string;
    assigneeId?: string | null;
    dueDate?: string | null;
    projectId: string;
  };
}

const PRIORITIES = ["URGENT", "HIGH", "MEDIUM", "LOW"] as const;

export function TaskForm({
  open,
  onClose,
  onCreated,
  projectId,
  projects,
  members,
  initialData,
}: TaskFormProps) {
  const isEditing = Boolean(initialData);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState(projectId ?? "");
  const [priority, setPriority] = useState<string>("MEDIUM");
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate fields when editing
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setDescription(initialData.description ?? "");
      setSelectedProjectId(initialData.projectId);
      setPriority(initialData.priority);
      setAssigneeId(initialData.assigneeId ?? null);
      setDueDate(
        initialData.dueDate
          ? new Date(initialData.dueDate).toISOString().split("T")[0]
          : "",
      );
    } else {
      setTitle("");
      setDescription("");
      setSelectedProjectId(projectId ?? projects[0]?.id ?? "");
      setPriority("MEDIUM");
      setAssigneeId(null);
      setDueDate("");
    }
    setError(null);
  }, [initialData, open, projectId, projects]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    if (!selectedProjectId) {
      setError("Please select a project.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || null,
        projectId: selectedProjectId,
        priority,
        assigneeId: assigneeId || null,
        dueDate: dueDate || null,
      };

      const url = isEditing
        ? `/api/v1/hub/tasks/${initialData!.id}`
        : "/api/v1/hub/tasks";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...csrfHeaders(),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string }).error ?? "Failed to save task",
        );
      }

      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="glass-floating w-full max-w-lg rounded-xl border border-white/10 shadow-glass-elevated overflow-hidden"
              initial={{ scale: 0.96, y: 8 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 8 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                <h2 className="text-title font-semibold text-slate-100">
                  {isEditing ? "Edit Task" : "New Task"}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <X size={16} strokeWidth={2} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-caption text-slate-400 mb-1">
                    Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Task title"
                    required
                    className="w-full glass-surface rounded-lg px-3 py-2 text-body text-slate-200 placeholder:text-slate-600 border border-white/10 focus:border-blue-500/50 focus:outline-none transition-colors"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-caption text-slate-400 mb-1">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add a description..."
                    rows={3}
                    className="w-full glass-surface rounded-lg px-3 py-2 text-body text-slate-200 placeholder:text-slate-600 border border-white/10 focus:border-blue-500/50 focus:outline-none transition-colors resize-none"
                  />
                </div>

                {/* Project */}
                {!projectId && (
                  <div>
                    <label className="block text-caption text-slate-400 mb-1">
                      Project <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      required
                      className="w-full glass-surface rounded-lg px-3 py-2 text-body text-slate-200 border border-white/10 focus:border-blue-500/50 focus:outline-none transition-colors bg-transparent"
                    >
                      <option
                        value=""
                        disabled
                        className="bg-navy-900 text-slate-400"
                      >
                        Select a project
                      </option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id} className="bg-navy-900">
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Priority */}
                <div>
                  <label className="block text-caption text-slate-400 mb-1.5">
                    Priority
                  </label>
                  <div className="flex gap-2">
                    {PRIORITIES.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={[
                          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-small border transition-colors",
                          priority === p
                            ? "bg-blue-500/20 border-blue-500/50 text-slate-200"
                            : "glass-surface border-white/10 text-slate-400 hover:border-white/20",
                        ].join(" ")}
                      >
                        <PriorityIcon
                          priority={p as "URGENT" | "HIGH" | "MEDIUM" | "LOW"}
                          size={12}
                        />
                        <span className="capitalize text-caption">
                          {p.charAt(0) + p.slice(1).toLowerCase()}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Assignee + Due Date row */}
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-caption text-slate-400 mb-1.5">
                      Assignee
                    </label>
                    <MemberPicker
                      members={members}
                      value={assigneeId}
                      onChange={setAssigneeId}
                      placeholder="Unassigned"
                    />
                  </div>

                  <div className="flex-1">
                    <label className="block text-caption text-slate-400 mb-1.5">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full glass-surface rounded-lg px-3 py-2 text-body text-slate-200 border border-white/10 focus:border-blue-500/50 focus:outline-none transition-colors bg-transparent"
                    />
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <p className="text-small text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-small text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !title.trim()}
                    className="px-4 py-2 rounded-lg text-small font-medium bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {submitting
                      ? isEditing
                        ? "Saving..."
                        : "Creating..."
                      : isEditing
                        ? "Save Changes"
                        : "Create Task"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
