"use client";

import { useState } from "react";
import {
  DndContext,
  closestCorners,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { KanbanColumn } from "./KanbanColumn";
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
  creator: { id: string; name: string | null; image: string | null };
  taskLabels: { label: { id: string; name: string; color: string } }[];
  _count: { comments: number };
}

const COLUMNS = [
  { id: "TODO", label: "To Do" },
  { id: "IN_PROGRESS", label: "In Progress" },
  { id: "IN_REVIEW", label: "In Review" },
  { id: "DONE", label: "Done" },
] as const;

interface KanbanBoardProps {
  tasks: TaskItem[];
  onTaskClick: (taskId: string) => void;
  onReorder: (
    updates: { id: string; status: string; position: number }[],
  ) => void;
}

export function KanbanBoard({
  tasks,
  onTaskClick,
  onReorder,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localTasks, setLocalTasks] = useState<TaskItem[]>(tasks);

  // Keep localTasks in sync when parent tasks prop changes
  // (simple approach: update when task count or ids change)
  const taskIds = tasks.map((t) => t.id).join(",");
  const localTaskIds = localTasks.map((t) => t.id).join(",");
  if (taskIds !== localTaskIds) {
    setLocalTasks(tasks);
  }

  const activeTask = activeId
    ? localTasks.find((t) => t.id === activeId)
    : null;

  function getColumnTasks(columnId: string): TaskItem[] {
    return localTasks
      .filter((t) => t.status === columnId)
      .sort((a, b) => a.position - b.position);
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeTaskId = active.id as string;
    const overId = over.id as string;

    const activeTask = localTasks.find((t) => t.id === activeTaskId);
    if (!activeTask) return;

    // Determine target column: either a column id or get the status of the task being dropped on
    const isColumnId = COLUMNS.some((c) => c.id === overId);
    const targetColumnId = isColumnId
      ? overId
      : (localTasks.find((t) => t.id === overId)?.status ?? activeTask.status);

    const sourceColumnId = activeTask.status;

    if (sourceColumnId === targetColumnId) {
      // Same column reorder
      const columnTasks = getColumnTasks(sourceColumnId);
      const oldIndex = columnTasks.findIndex((t) => t.id === activeTaskId);
      const newIndex = isColumnId
        ? columnTasks.length - 1
        : columnTasks.findIndex((t) => t.id === overId);

      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

      const reordered = arrayMove(columnTasks, oldIndex, newIndex);
      const updates: { id: string; status: string; position: number }[] =
        reordered.map((t, idx) => ({
          id: t.id,
          status: t.status,
          position: idx,
        }));

      setLocalTasks((prev) => {
        const otherTasks = prev.filter((t) => t.status !== sourceColumnId);
        const updatedColumn = reordered.map((t, idx) => ({
          ...t,
          position: idx,
        }));
        return [...otherTasks, ...updatedColumn];
      });

      onReorder(updates);
    } else {
      // Moving to a different column
      const targetColumnTasks = getColumnTasks(targetColumnId);
      const newPosition = isColumnId
        ? targetColumnTasks.length
        : targetColumnTasks.findIndex((t) => t.id === overId);

      const insertPosition =
        newPosition === -1 ? targetColumnTasks.length : newPosition;

      setLocalTasks((prev) => {
        // Remove from source, insert into target
        const withoutActive = prev.filter((t) => t.id !== activeTaskId);
        const newTargetTasks = withoutActive
          .filter((t) => t.status === targetColumnId)
          .sort((a, b) => a.position - b.position);

        newTargetTasks.splice(insertPosition, 0, {
          ...activeTask,
          status: targetColumnId,
        });

        const updates = newTargetTasks.map((t, idx) => ({
          ...t,
          status: targetColumnId,
          position: idx,
        }));

        const otherTasks = withoutActive.filter(
          (t) => t.status !== targetColumnId,
        );
        return [...otherTasks, ...updates];
      });

      // Build updates for all affected tasks
      const withoutActive = localTasks.filter((t) => t.id !== activeTaskId);
      const newTargetTasks = withoutActive
        .filter((t) => t.status === targetColumnId)
        .sort((a, b) => a.position - b.position);
      newTargetTasks.splice(insertPosition, 0, {
        ...activeTask,
        status: targetColumnId,
      });

      const updatedSourceTasks = withoutActive
        .filter((t) => t.status === sourceColumnId)
        .sort((a, b) => a.position - b.position);

      const updates: { id: string; status: string; position: number }[] = [
        { id: activeTaskId, status: targetColumnId, position: insertPosition },
        ...newTargetTasks
          .filter((t) => t.id !== activeTaskId)
          .map((t, idx) => ({
            id: t.id,
            status: targetColumnId,
            position: idx >= insertPosition ? idx + 1 : idx,
          })),
        ...updatedSourceTasks.map((t, idx) => ({
          id: t.id,
          status: sourceColumnId,
          position: idx,
        })),
      ];

      onReorder(updates);
    }
  }

  return (
    <DndContext
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 h-full overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            id={col.id}
            label={col.label}
            tasks={getColumnTasks(col.id)}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="rotate-2 scale-105">
            <TaskCard task={activeTask} isDragging={false} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
