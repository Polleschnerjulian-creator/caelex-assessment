"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  ShieldCheck,
  AlertCircle,
  FolderOpen,
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";

// ─── Types ───

interface ChecklistItem {
  folder: string;
  name: string;
  required: boolean;
  uploaded: boolean;
  fromComply?: boolean;
}

interface DataRoomChecklistProps {
  items: ChecklistItem[];
}

// ─── Component ───

export default function DataRoomChecklist({ items }: DataRoomChecklistProps) {
  // Group by folder
  const grouped = useMemo(() => {
    const map: Record<string, ChecklistItem[]> = {};
    items.forEach((item) => {
      if (!map[item.folder]) map[item.folder] = [];
      map[item.folder].push(item);
    });
    return Object.entries(map);
  }, [items]);

  const totalRequired = items.filter((i) => i.required).length;
  const completedRequired = items.filter(
    (i) => i.required && i.uploaded,
  ).length;
  const totalUploaded = items.filter((i) => i.uploaded).length;
  const completionPct =
    totalRequired > 0
      ? Math.round((completedRequired / totalRequired) * 100)
      : 0;

  return (
    <div>
      {/* Summary bar */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-body font-medium text-white/70">
            {totalUploaded} of {items.length} documents uploaded
          </span>
          <span className="text-small text-white/30 ml-2">
            ({completedRequired}/{totalRequired} required)
          </span>
        </div>
        <span
          className={`text-small font-semibold ${
            completionPct >= 80
              ? "text-emerald-400"
              : completionPct >= 50
                ? "text-amber-400"
                : "text-red-400"
          }`}
        >
          {completionPct}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-white/5 rounded-full mb-6 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${completionPct}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className={`h-full rounded-full ${
            completionPct >= 80
              ? "bg-emerald-500"
              : completionPct >= 50
                ? "bg-amber-500"
                : "bg-red-500"
          }`}
        />
      </div>

      {/* Grouped checklist */}
      <div className="space-y-4">
        {grouped.map(([folder, folderItems], folderIdx) => {
          const folderComplete = folderItems.filter((i) => i.uploaded).length;

          return (
            <motion.div
              key={folder}
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: folderIdx * 0.05 }}
            >
              <GlassCard hover={false} className="p-4">
                {/* Folder header */}
                <div className="flex items-center gap-2 mb-3">
                  <FolderOpen size={14} className="text-emerald-400" />
                  <span className="text-body font-medium text-white/70">
                    {folder}
                  </span>
                  <span className="text-micro text-white/25 ml-auto">
                    {folderComplete}/{folderItems.length}
                  </span>
                </div>

                {/* Items */}
                <div className="space-y-1.5">
                  {folderItems.map((item, idx) => (
                    <div
                      key={`${folder}-${idx}`}
                      className="flex items-center gap-2.5 py-1"
                    >
                      {item.uploaded ? (
                        <CheckCircle2
                          size={16}
                          className="text-emerald-400 flex-shrink-0"
                        />
                      ) : item.required ? (
                        <AlertCircle
                          size={16}
                          className="text-red-400/60 flex-shrink-0"
                        />
                      ) : (
                        <Circle
                          size={16}
                          className="text-white/15 flex-shrink-0"
                        />
                      )}

                      <span
                        className={`text-small flex-1 ${
                          item.uploaded
                            ? "text-white/60 line-through decoration-white/20"
                            : "text-white/50"
                        }`}
                      >
                        {item.name}
                      </span>

                      {item.required && !item.uploaded && (
                        <span className="text-micro text-red-400/50 font-medium">
                          Required
                        </span>
                      )}

                      {item.fromComply && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                          <ShieldCheck size={10} className="text-emerald-400" />
                          <span className="text-micro text-emerald-400">
                            Comply
                          </span>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
