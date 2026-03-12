"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TaskCard } from "./TaskCard";

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

interface KanbanColumnProps {
  id: string;
  label: string;
  tasks: TaskItem[];
  onTaskClick: (taskId: string) => void;
}

function SortableTaskItem({
  task,
  onTaskClick,
}: {
  task: TaskItem;
  onTaskClick: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard
        task={task}
        onClick={() => onTaskClick(task.id)}
        isDragging={isDragging}
      />
    </div>
  );
}

export function KanbanColumn({
  id,
  label,
  tasks,
  onTaskClick,
}: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id });

  const taskIds = tasks.map((t) => t.id);

  return (
    <div className="flex-1 min-w-[250px] flex flex-col bg-[#f5f5f7] rounded-2xl border border-[#e5e5ea]">
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#e5e5ea]">
        <span className="text-[13px] font-medium text-[#1d1d1f]">{label}</span>
        <span className="text-[11px] bg-white rounded px-1.5 py-0.5 text-[#86868b] font-medium">
          {tasks.length}
        </span>
      </div>

      {/* Column body */}
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className="flex-1 overflow-y-auto space-y-2 p-2 min-h-[200px]"
        >
          {tasks.map((task) => (
            <SortableTaskItem
              key={task.id}
              task={task}
              onTaskClick={onTaskClick}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
