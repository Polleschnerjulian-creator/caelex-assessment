"use client";

import { useState, useEffect, useCallback } from "react";
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
  creator: { id: string; name: string | null; image: string | null } | null;
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

  // Sync localTasks when parent tasks prop changes (proper useEffect, not render-body setState)
  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const activeTask = activeId
    ? localTasks.find((t) => t.id === activeId)
    : null;

  const getColumnTasks = useCallback(
    (columnId: string): TaskItem[] => {
      return localTasks
        .filter((t) => t.status === columnId)
        .sort((a, b) => a.position - b.position);
    },
    [localTasks],
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeTaskId = active.id as string;
    const overId = over.id as string;

    const draggedTask = localTasks.find((t) => t.id === activeTaskId);
    if (!draggedTask) return;

    // Determine target column: either a column id or get the status of the task being dropped on
    const isColumnId = COLUMNS.some((c) => c.id === overId);
    const targetColumnId = isColumnId
      ? overId
      : (localTasks.find((t) => t.id === overId)?.status ?? draggedTask.status);

    const sourceColumnId = draggedTask.status;

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
      // Moving to a different column — compute updates from a single source of truth
      const withoutActive = localTasks.filter((t) => t.id !== activeTaskId);
      const targetColumnTasks = withoutActive
        .filter((t) => t.status === targetColumnId)
        .sort((a, b) => a.position - b.position);

      const rawPosition = isColumnId
        ? targetColumnTasks.length
        : targetColumnTasks.findIndex((t) => t.id === overId);
      const insertPosition =
        rawPosition === -1 ? targetColumnTasks.length : rawPosition;

      // Insert the moved task into target column
      targetColumnTasks.splice(insertPosition, 0, {
        ...draggedTask,
        status: targetColumnId,
      });

      // Reindex source column
      const updatedSourceTasks = withoutActive
        .filter((t) => t.status === sourceColumnId)
        .sort((a, b) => a.position - b.position);

      // Build the full updates array from the computed state
      const updates: { id: string; status: string; position: number }[] = [
        ...targetColumnTasks.map((t, idx) => ({
          id: t.id,
          status: targetColumnId,
          position: idx,
        })),
        ...updatedSourceTasks.map((t, idx) => ({
          id: t.id,
          status: sourceColumnId,
          position: idx,
        })),
      ];

      // Optimistic update using the same computed data
      setLocalTasks((prev) => {
        const otherTasks = prev.filter(
          (t) =>
            t.status !== targetColumnId &&
            t.status !== sourceColumnId &&
            t.id !== activeTaskId,
        );
        return [
          ...otherTasks,
          ...targetColumnTasks.map((t, idx) => ({
            ...t,
            status: targetColumnId,
            position: idx,
          })),
          ...updatedSourceTasks.map((t, idx) => ({ ...t, position: idx })),
        ];
      });

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
