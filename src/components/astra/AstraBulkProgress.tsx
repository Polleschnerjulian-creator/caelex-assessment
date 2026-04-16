"use client";

import { useState, useCallback } from "react";
import { Check, Loader2, AlertCircle, Square, CheckSquare } from "lucide-react";
import type { AstraBulkItem } from "@/lib/astra/types";
import { simulateBulkGeneration } from "@/lib/astra/mock-responses";

interface AstraBulkProgressProps {
  initialItems: AstraBulkItem[];
}

const statusIcons: Record<
  AstraBulkItem["status"],
  { icon: React.ReactNode; color: string }
> = {
  pending: {
    icon: <Square size={12} />,
    color: "text-gray-400",
  },
  generating: {
    icon: <Loader2 size={12} className="animate-spin" />,
    color: "text-amber-500",
  },
  complete: {
    icon: <Check size={12} />,
    color: "text-green-600",
  },
  error: {
    icon: <AlertCircle size={12} />,
    color: "text-red-500",
  },
};

export default function AstraBulkProgress({
  initialItems,
}: AstraBulkProgressProps) {
  const [items, setItems] = useState<AstraBulkItem[]>(initialItems);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const toggleItem = (id: string) => {
    if (isGenerating || isDone) return;
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item,
      ),
    );
  };

  const checkedCount = items.filter((i) => i.checked).length;
  const completedCount = items.filter((i) => i.status === "complete").length;

  const handleGenerate = useCallback(async () => {
    if (isGenerating || checkedCount === 0) return;
    setIsGenerating(true);

    const finalItems = await simulateBulkGeneration(items, (updated) => {
      setItems(updated);
    });

    setItems(finalItems);
    setIsGenerating(false);
    setIsDone(true);
  }, [items, isGenerating, checkedCount]);

  return (
    <div className="my-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
      {/* Item list */}
      <div className="space-y-1 mb-3">
        {items.map((item) => {
          const statusInfo = statusIcons[item.status];
          return (
            <div
              key={item.id}
              className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {/* Checkbox */}
              <button
                onClick={() => toggleItem(item.id)}
                disabled={isGenerating || isDone}
                className={`flex-shrink-0 ${
                  item.checked
                    ? "text-gray-900"
                    : "text-gray-400 hover:text-gray-600"
                } ${isGenerating || isDone ? "cursor-not-allowed" : ""}`}
              >
                {item.checked ? (
                  <CheckSquare size={14} />
                ) : (
                  <Square size={14} />
                )}
              </button>

              {/* Article info */}
              <span className="text-micro text-gray-500 w-14 flex-shrink-0">
                {item.articleRef}
              </span>
              <span className="text-caption text-gray-600 flex-1 truncate">
                {item.title}
              </span>

              {/* Status */}
              <span className={`flex-shrink-0 ${statusInfo.color}`}>
                {statusInfo.icon}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress bar (when generating) */}
      {isGenerating && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-micro text-gray-500 mb-1">
            <span>
              Generierung {completedCount}/{checkedCount}...
            </span>
          </div>
          <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gray-900 rounded-full transition-all duration-300"
              style={{
                width: `${checkedCount > 0 ? (completedCount / checkedCount) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Generate button */}
      {!isDone && (
        <button
          onClick={handleGenerate}
          disabled={isGenerating || checkedCount === 0}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-900 hover:bg-black rounded-lg text-caption font-medium text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <Loader2 size={12} className="animate-spin" />
              Generierung laeuft...
            </>
          ) : (
            <>Ausgewaehlte generieren ({checkedCount})</>
          )}
        </button>
      )}

      {/* Done message */}
      {isDone && (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
          <Check size={12} className="text-green-600" />
          <span className="text-caption text-green-700">
            {completedCount} Dokumente generiert (Framework-Modus)
          </span>
        </div>
      )}
    </div>
  );
}
