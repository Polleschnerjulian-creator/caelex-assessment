"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Send, MessageSquare, Calendar, Tag } from "lucide-react";
import { PriorityIcon } from "./PriorityIcon";
import { LabelBadge } from "./LabelBadge";
import { MemberPicker } from "./MemberPicker";
import { csrfHeaders } from "@/lib/csrf-client";

interface TaskItem {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  position: number;
  dueDate?: string | null;
  project: { id: string; name: string; color: string | null };
  assignee?: { id: string; name: string | null; image: string | null } | null;
  creator: { id: string; name: string | null; image: string | null };
  taskLabels: { label: { id: string; name: string; color: string } }[];
  _count: { comments: number };
  comments?: {
    id: string;
    content: string;
    createdAt: string;
    author: { id: string; name: string | null; image: string | null };
  }[];
}

interface TaskDetailDrawerProps {
  taskId: string | null;
  onClose: () => void;
  onUpdated: () => void;
  members: { id: string; name: string | null; image: string | null }[];
}

const STATUSES = [
  { id: "TODO", label: "To Do" },
  { id: "IN_PROGRESS", label: "In Progress" },
  { id: "IN_REVIEW", label: "In Review" },
  { id: "DONE", label: "Done" },
] as const;

const PRIORITIES = ["URGENT", "HIGH", "MEDIUM", "LOW"] as const;

function getInitial(name: string | null): string {
  if (!name) return "?";
  return name.trim().charAt(0).toUpperCase();
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function TaskDetailDrawer({
  taskId,
  onClose,
  onUpdated,
  members,
}: TaskDetailDrawerProps) {
  const [task, setTask] = useState<TaskItem | null>(null);
  const [loading, setLoading] = useState(false);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [descDraft, setDescDraft] = useState("");
  const [newComment, setNewComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

  const titleInputRef = useRef<HTMLInputElement>(null);

  const fetchTask = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/hub/tasks/${id}`);
      if (!res.ok) throw new Error("Failed to fetch task");
      const data = await res.json();
      setTask(data);
      setTitleDraft(data.title ?? "");
      setDescDraft(data.description ?? "");
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (taskId) {
      fetchTask(taskId);
    } else {
      setTask(null);
    }
  }, [taskId, fetchTask]);

  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [editingTitle]);

  async function patchField(field: string, value: unknown) {
    if (!task) return;
    try {
      const res = await fetch(`/api/v1/hub/tasks/${task.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...csrfHeaders(),
        },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error("Failed to update task");
      const updated = await res.json();
      setTask(updated);
      onUpdated();
    } catch {
      // silently fail
    }
  }

  async function handleTitleBlur() {
    setEditingTitle(false);
    if (task && titleDraft.trim() && titleDraft.trim() !== task.title) {
      await patchField("title", titleDraft.trim());
    }
  }

  async function handleDescBlur() {
    if (task && descDraft !== (task.description ?? "")) {
      await patchField("description", descDraft || null);
    }
  }

  async function handleSendComment() {
    if (!task || !newComment.trim()) return;
    setSendingComment(true);
    try {
      const res = await fetch(`/api/v1/hub/tasks/${task.id}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...csrfHeaders(),
        },
        body: JSON.stringify({ content: newComment.trim() }),
      });
      if (!res.ok) throw new Error("Failed to post comment");
      setNewComment("");
      await fetchTask(task.id);
      onUpdated();
    } catch {
      // silently fail
    } finally {
      setSendingComment(false);
    }
  }

  return (
    <AnimatePresence>
      {taskId && (
        <>
          {/* Backdrop */}
          <motion.div
            key="drawer-backdrop"
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Drawer panel */}
          <motion.div
            key="drawer-panel"
            className="fixed right-0 top-0 h-full z-50 w-[480px] max-w-full bg-white border-l border-[#e5e5ea] shadow-[0_4px_24px_rgba(0,0,0,0.08),0_12px_48px_rgba(0,0,0,0.12)] flex flex-col"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#e5e5ea] flex-shrink-0">
              <span className="text-[12px] text-[#86868b] font-medium uppercase tracking-wider">
                Task Details
              </span>
              <button
                type="button"
                onClick={onClose}
                className="text-[#86868b] hover:text-[#1d1d1f] transition-colors"
              >
                <X size={16} strokeWidth={2} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {loading && (
                <div className="flex items-center justify-center h-32">
                  <div className="w-5 h-5 border-2 border-[#e5e5ea] border-t-[#1d1d1f] rounded-full animate-spin" />
                </div>
              )}

              {!loading && task && (
                <div className="px-5 py-4 space-y-5">
                  {/* Editable title */}
                  <div>
                    {editingTitle ? (
                      <input
                        ref={titleInputRef}
                        value={titleDraft}
                        onChange={(e) => setTitleDraft(e.target.value)}
                        onBlur={handleTitleBlur}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleTitleBlur();
                          }
                          if (e.key === "Escape") {
                            setEditingTitle(false);
                            setTitleDraft(task.title);
                          }
                        }}
                        className="w-full text-[17px] font-semibold text-[#1d1d1f] bg-transparent border-b-2 border-[#1d1d1f]/30 focus:outline-none pb-1"
                      />
                    ) : (
                      <h2
                        className="text-[17px] font-semibold text-[#1d1d1f] cursor-pointer hover:text-[#000000] transition-colors"
                        onClick={() => setEditingTitle(true)}
                      >
                        {task.title}
                      </h2>
                    )}
                    <p className="text-[11px] text-[#86868b]/60 mt-1">
                      Click title to edit
                    </p>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-[12px] text-[#86868b] mb-1.5">
                      Description
                    </label>
                    <textarea
                      value={descDraft}
                      onChange={(e) => setDescDraft(e.target.value)}
                      onBlur={handleDescBlur}
                      placeholder="Add a description..."
                      rows={3}
                      className="w-full bg-white rounded-xl px-3 py-2 text-[14px] text-[#1d1d1f] placeholder:text-[#86868b]/50 border border-[#e5e5ea] focus:border-[#1d1d1f]/30 focus:ring-1 focus:ring-[#1d1d1f]/10 focus:outline-none transition-colors resize-none"
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-[12px] text-[#86868b] mb-1.5">
                      Status
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {STATUSES.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => patchField("status", s.id)}
                          className={[
                            "px-3 py-1.5 rounded-lg text-[13px] border transition-colors",
                            task.status === s.id
                              ? "bg-[#f5f5f7] border-[#1d1d1f]/20 text-[#1d1d1f] font-medium"
                              : "bg-white border-[#e5e5ea] text-[#86868b] hover:border-[#1d1d1f]/15",
                          ].join(" ")}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-[12px] text-[#86868b] mb-1.5">
                      Priority
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {PRIORITIES.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => patchField("priority", p)}
                          className={[
                            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] border transition-colors",
                            task.priority === p
                              ? "bg-[#f5f5f7] border-[#1d1d1f]/20 text-[#1d1d1f]"
                              : "bg-white border-[#e5e5ea] text-[#86868b] hover:border-[#1d1d1f]/15",
                          ].join(" ")}
                        >
                          <PriorityIcon
                            priority={p as "URGENT" | "HIGH" | "MEDIUM" | "LOW"}
                            size={12}
                          />
                          <span className="text-[12px] capitalize">
                            {p.charAt(0) + p.slice(1).toLowerCase()}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Assignee */}
                  <div>
                    <label className="block text-[12px] text-[#86868b] mb-1.5">
                      Assignee
                    </label>
                    <MemberPicker
                      members={members}
                      value={task.assignee?.id ?? null}
                      onChange={(id) => patchField("assigneeId", id)}
                      placeholder="Unassigned"
                    />
                  </div>

                  {/* Due date */}
                  <div>
                    <label className="block text-[12px] text-[#86868b] mb-1.5">
                      <span className="flex items-center gap-1">
                        <Calendar size={11} strokeWidth={2} />
                        Due Date
                      </span>
                    </label>
                    <input
                      type="date"
                      defaultValue={
                        task.dueDate
                          ? new Date(task.dueDate).toISOString().split("T")[0]
                          : ""
                      }
                      onBlur={(e) =>
                        patchField("dueDate", e.target.value || null)
                      }
                      className="bg-white rounded-xl px-3 py-2 text-[14px] text-[#1d1d1f] border border-[#e5e5ea] focus:border-[#1d1d1f]/30 focus:ring-1 focus:ring-[#1d1d1f]/10 focus:outline-none transition-colors"
                    />
                  </div>

                  {/* Labels */}
                  {task.taskLabels.length > 0 && (
                    <div>
                      <label className="block text-[12px] text-[#86868b] mb-1.5">
                        <span className="flex items-center gap-1">
                          <Tag size={11} strokeWidth={2} />
                          Labels
                        </span>
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {task.taskLabels.map(({ label }) => (
                          <LabelBadge
                            key={label.id}
                            name={label.name}
                            color={label.color}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Project */}
                  <div>
                    <label className="block text-[12px] text-[#86868b] mb-1">
                      Project
                    </label>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: task.project.color ?? "#6B7280",
                        }}
                      />
                      <span className="text-[13px] text-[#1d1d1f]">
                        {task.project.name}
                      </span>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-[#e5e5ea] pt-2">
                    <div className="flex items-center gap-1.5 mb-3">
                      <MessageSquare
                        size={13}
                        strokeWidth={2}
                        className="text-[#86868b]"
                      />
                      <span className="text-[13px] font-medium text-[#1d1d1f]">
                        Comments
                        {(task._count.comments > 0 ||
                          (task.comments?.length ?? 0) > 0) && (
                          <span className="ml-1 text-[#86868b]">
                            ({task.comments?.length ?? task._count.comments})
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Comment list */}
                    <div className="space-y-3 mb-4">
                      {task.comments && task.comments.length > 0 ? (
                        task.comments.map((comment) => (
                          <div key={comment.id} className="flex gap-2.5">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#f5f5f7] text-[#1d1d1f] text-[10px] font-semibold flex-shrink-0 mt-0.5">
                              {getInitial(comment.author.name)}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-2">
                                <span className="text-[13px] font-medium text-[#1d1d1f]">
                                  {comment.author.name ?? "Unknown"}
                                </span>
                                <span className="text-[11px] text-[#86868b]/60">
                                  {formatDateTime(comment.createdAt)}
                                </span>
                              </div>
                              <p className="text-[13px] text-[#86868b] mt-0.5 leading-relaxed">
                                {comment.content}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-[13px] text-[#86868b]/60">
                          No comments yet.
                        </p>
                      )}
                    </div>

                    {/* New comment input */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendComment();
                          }
                        }}
                        className="flex-1 bg-white rounded-xl px-3 py-2 text-[13px] text-[#1d1d1f] placeholder:text-[#86868b]/50 border border-[#e5e5ea] focus:border-[#1d1d1f]/30 focus:ring-1 focus:ring-[#1d1d1f]/10 focus:outline-none transition-colors"
                      />
                      <button
                        type="button"
                        onClick={handleSendComment}
                        disabled={sendingComment || !newComment.trim()}
                        className="px-3 py-2 rounded-xl bg-[#1d1d1f] hover:bg-[#000000] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Send size={13} strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {!loading && !task && taskId && (
                <div className="flex items-center justify-center h-32">
                  <p className="text-[13px] text-[#86868b]">Task not found.</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
