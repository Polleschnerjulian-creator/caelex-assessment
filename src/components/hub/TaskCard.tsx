"use client";

import { MessageSquare, Calendar } from "lucide-react";
import { PriorityIcon } from "./PriorityIcon";
import { LabelBadge } from "./LabelBadge";

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
}

interface TaskCardProps {
  task: TaskItem;
  onClick?: () => void;
  isDragging?: boolean;
}

function getInitial(name: string | null): string {
  if (!name) return "?";
  return name.trim().charAt(0).toUpperCase();
}

function isOverdue(dueDateStr: string): boolean {
  const due = new Date(dueDateStr);
  due.setHours(23, 59, 59, 999);
  return due < new Date();
}

function formatDate(dueDateStr: string): string {
  const d = new Date(dueDateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function TaskCard({ task, onClick, isDragging }: TaskCardProps) {
  const MAX_LABELS = 2;
  const visibleLabels = task.taskLabels.slice(0, MAX_LABELS);
  const extraLabels = task.taskLabels.length - MAX_LABELS;
  const overdue = task.dueDate ? isOverdue(task.dueDate) : false;

  return (
    <div
      onClick={onClick}
      className={[
        "glass-surface rounded-lg p-3 cursor-pointer hover:bg-white/[0.03] transition-all",
        isDragging ? "opacity-50 ring-2 ring-blue-500" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Title */}
      <p className="text-small font-medium text-slate-200 line-clamp-1 mb-2">
        {task.title}
      </p>

      {/* Row: priority + labels + spacer + comments + assignee */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <PriorityIcon
          priority={task.priority as "URGENT" | "HIGH" | "MEDIUM" | "LOW"}
          size={12}
        />

        {visibleLabels.map(({ label }) => (
          <LabelBadge key={label.id} name={label.name} color={label.color} />
        ))}

        {extraLabels > 0 && (
          <span className="text-caption text-slate-500">+{extraLabels}</span>
        )}

        <div className="flex-1" />

        {task._count.comments > 0 && (
          <span className="inline-flex items-center gap-0.5 text-caption text-slate-500">
            <MessageSquare size={10} strokeWidth={2} />
            {task._count.comments}
          </span>
        )}

        {task.assignee && (
          <span
            className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 text-caption font-semibold flex-shrink-0"
            title={task.assignee.name ?? undefined}
          >
            {getInitial(task.assignee.name)}
          </span>
        )}
      </div>

      {/* Due date */}
      {task.dueDate && (
        <div
          className={`flex items-center gap-1 mt-2 ${overdue ? "text-red-400" : "text-slate-500"}`}
        >
          <Calendar size={10} strokeWidth={2} />
          <span className="text-caption">{formatDate(task.dueDate)}</span>
        </div>
      )}
    </div>
  );
}
