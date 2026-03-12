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
  creator: { id: string; name: string | null; image: string | null } | null;
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
        "bg-white rounded-xl p-3 cursor-pointer border border-[#e5e5ea] hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all",
        isDragging ? "opacity-50 ring-2 ring-[#1d1d1f]" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Title */}
      <p className="text-[13px] font-medium text-[#1d1d1f] line-clamp-1 mb-2">
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
          <span className="text-[11px] text-[#86868b]">+{extraLabels}</span>
        )}

        <div className="flex-1" />

        {task._count.comments > 0 && (
          <span className="inline-flex items-center gap-0.5 text-[11px] text-[#86868b]">
            <MessageSquare size={10} strokeWidth={2} />
            {task._count.comments}
          </span>
        )}

        {task.assignee && (
          <span
            className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#f5f5f7] text-[#1d1d1f] text-[10px] font-semibold flex-shrink-0"
            title={task.assignee.name ?? undefined}
          >
            {getInitial(task.assignee.name)}
          </span>
        )}
      </div>

      {/* Due date */}
      {task.dueDate && (
        <div
          className={`flex items-center gap-1 mt-2 ${overdue ? "text-red-500" : "text-[#86868b]"}`}
        >
          <Calendar size={10} strokeWidth={2} />
          <span className="text-[11px]">{formatDate(task.dueDate)}</span>
        </div>
      )}
    </div>
  );
}
