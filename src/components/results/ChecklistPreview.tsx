"use client";

import { motion } from "framer-motion";
import { Circle, FileDown } from "lucide-react";
import { ChecklistItem } from "@/lib/types";

interface ChecklistPreviewProps {
  checklist: ChecklistItem[];
  onDownloadClick: () => void;
}

export default function ChecklistPreview({
  checklist,
  onDownloadClick,
}: ChecklistPreviewProps) {
  const previewItems = checklist.slice(0, 5);
  const totalItems = checklist.length;
  const remainingItems = totalItems - previewItems.length;

  const phases = new Set(
    checklist.map((item) => {
      if (item.articles.includes("pre") || parseInt(item.articles) < 28) {
        return "pre_authorization";
      }
      if (item.articles.includes("end") || item.articles.includes("72")) {
        return "end_of_life";
      }
      return "ongoing";
    }),
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className="flex items-center justify-between mb-6">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">
          Your Next Steps
        </span>
        <span className="font-mono text-[11px] text-white/50">
          Top 5 of {totalItems} action items
        </span>
      </div>

      <div className="bg-white/[0.05] border border-white/[0.12] rounded-xl overflow-hidden">
        {/* Checklist items */}
        <div className="divide-y divide-white/[0.08]">
          {previewItems.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.05 }}
              className="p-4 flex items-start gap-4"
            >
              <div className="flex-shrink-0 mt-0.5" aria-hidden="true">
                <Circle className="w-4 h-4 text-white/40" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] text-white/90 leading-relaxed">
                  {item.requirement}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="font-mono text-[10px] text-white/70 bg-white/[0.08] px-2 py-0.5 rounded">
                    Art. {item.articles}
                  </span>
                  <span className="text-[11px] text-white/50">
                    {item.module.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* More items indicator */}
        {remainingItems > 0 && (
          <div className="px-4 py-3 bg-white/[0.03] border-t border-white/[0.08]">
            <p className="text-[13px] text-white/60 text-center">
              Your full compliance checklist contains{" "}
              <span className="text-white font-medium">
                {totalItems} action items
              </span>{" "}
              across {phases.size} phases.
            </p>
          </div>
        )}

        {/* CTA */}
        <div className="p-6 border-t border-white/[0.12] text-center">
          <p className="text-[13px] text-white/70 mb-4">
            Get the complete checklist with deadlines and article references.
          </p>
          <button
            onClick={onDownloadClick}
            className="inline-flex items-center gap-2 bg-white text-black text-[13px] font-medium px-5 py-2 rounded-full hover:bg-white/90 transition-all"
          >
            <FileDown size={14} aria-hidden="true" />
            Download PDF Report
          </button>
        </div>
      </div>
    </motion.div>
  );
}
