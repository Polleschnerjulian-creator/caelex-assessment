"use client";

import { useState, useCallback, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import DealCard, { type DealCardData } from "./DealCard";
import {
  KANBAN_STAGES,
  DEAL_STAGE_LABELS,
  DEAL_STAGE_PROBABILITY,
} from "@/lib/crm/types";
import type { CrmDealStage } from "@prisma/client";

interface KanbanBoardProps {
  deals: DealCardData[];
  onStageChange: (dealId: string, newStage: CrmDealStage) => Promise<void>;
}

function KanbanColumn({
  stage,
  deals,
}: {
  stage: CrmDealStage;
  deals: DealCardData[];
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${stage}`,
    data: { type: "column", stage },
  });

  const totalValue = deals.reduce((sum, d) => sum + (d.valueCents || 0), 0);
  const weightedValue = deals.reduce((sum, d) => {
    const value = d.valueCents || 0;
    const probability = DEAL_STAGE_PROBABILITY[stage] / 100;
    return sum + value * probability;
  }, 0);

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-[280px] rounded-xl border p-3 transition-colors ${
        isOver ? "ring-2 ring-[var(--accent-primary)]" : ""
      }`}
      style={{
        background: "var(--surface-sunken)",
        borderColor: "var(--border-default)",
      }}
    >
      {/* Column header */}
      <div
        className="mb-3 pb-3 border-b"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <div className="flex items-center justify-between mb-1">
          <p className="text-caption font-semibold uppercase tracking-wider text-[var(--text-primary)]">
            {DEAL_STAGE_LABELS[stage]}
          </p>
          <span className="text-small text-[var(--text-tertiary)]">
            {deals.length}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="text-[var(--text-secondary)]">
            {totalValue > 0
              ? `€${(totalValue / 100).toLocaleString("de-DE", { maximumFractionDigits: 0 })}`
              : "—"}
          </span>
          {weightedValue > 0 && weightedValue !== totalValue && (
            <span className="text-[var(--text-tertiary)]">
              · weighted €
              {(weightedValue / 100).toLocaleString("de-DE", {
                maximumFractionDigits: 0,
              })}
            </span>
          )}
        </div>
      </div>

      {/* Deals */}
      <SortableContext
        items={deals.map((d) => d.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2 min-h-[100px]">
          {deals.length === 0 ? (
            <div className="text-center py-6 text-caption text-[var(--text-tertiary)]">
              No deals
            </div>
          ) : (
            deals.map((deal) => <DealCard key={deal.id} deal={deal} />)
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export default function KanbanBoard({
  deals: initialDeals,
  onStageChange,
}: KanbanBoardProps) {
  const [deals, setDeals] = useState(initialDeals);
  const [activeDeal, setActiveDeal] = useState<DealCardData | null>(null);

  // Keep local state in sync when parent refreshes
  useMemo(() => {
    setDeals(initialDeals);
  }, [initialDeals]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const dealsByStage = useMemo(() => {
    const map = new Map<CrmDealStage, DealCardData[]>();
    for (const stage of KANBAN_STAGES) {
      map.set(stage, []);
    }
    for (const deal of deals) {
      if (KANBAN_STAGES.includes(deal.stage)) {
        map.get(deal.stage)!.push(deal);
      }
    }
    return map;
  }, [deals]);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const deal = deals.find((d) => d.id === event.active.id);
      if (deal) setActiveDeal(deal);
    },
    [deals],
  );

  const handleDragOver = useCallback((_event: DragOverEvent) => {
    // Intentionally empty — visual feedback is provided by isOver on the column.
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveDeal(null);
      const { active, over } = event;
      if (!over) return;

      const activeDealId = active.id as string;
      const activeData = active.data.current as
        | { type: "deal"; deal: DealCardData }
        | undefined;
      if (!activeData || activeData.type !== "deal") return;

      // Determine target stage
      let targetStage: CrmDealStage | null = null;
      const overData = over.data.current as
        | { type: "deal"; deal: DealCardData }
        | { type: "column"; stage: CrmDealStage }
        | undefined;

      if (overData?.type === "column") {
        targetStage = overData.stage;
      } else if (overData?.type === "deal") {
        targetStage = overData.deal.stage;
      }

      if (!targetStage || targetStage === activeData.deal.stage) return;

      // Optimistic update
      setDeals((prev) =>
        prev.map((d) =>
          d.id === activeDealId
            ? {
                ...d,
                stage: targetStage!,
                stageChangedAt: new Date().toISOString(),
              }
            : d,
        ),
      );

      // Persist
      try {
        await onStageChange(activeDealId, targetStage);
      } catch (err) {
        // Rollback on error
        console.error("Failed to update deal stage", err);
        setDeals((prev) =>
          prev.map((d) =>
            d.id === activeDealId ? { ...d, stage: activeData.deal.stage } : d,
          ),
        );
      }
    },
    [onStageChange],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4">
        {KANBAN_STAGES.map((stage) => (
          <KanbanColumn
            key={stage}
            stage={stage}
            deals={dealsByStage.get(stage) || []}
          />
        ))}
      </div>
      <DragOverlay>
        {activeDeal ? <DealCard deal={activeDeal} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}
