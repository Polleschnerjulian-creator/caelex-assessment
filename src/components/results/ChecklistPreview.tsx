"use client";

import { motion } from "framer-motion";
import { CheckCircle, Circle, FileDown } from "lucide-react";
import { ChecklistItem } from "@/lib/types";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

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

  // Count phases
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
        <h3 className="text-xl font-semibold text-white">Your Next Steps</h3>
        <div className="text-sm text-slate-500">
          Top 5 of {totalItems} action items
        </div>
      </div>

      <Card variant="default" padding="none">
        {/* Checklist items */}
        <div className="divide-y divide-navy-700">
          {previewItems.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.05 }}
              className="p-4 flex items-start gap-4"
            >
              <div className="flex-shrink-0 mt-0.5">
                <Circle className="w-5 h-5 text-slate-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-200 text-sm">{item.requirement}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                    Art. {item.articles}
                  </span>
                  <span className="text-xs text-slate-500">
                    {item.module.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* More items indicator */}
        {remainingItems > 0 && (
          <div className="px-4 py-3 bg-navy-900/50 border-t border-navy-700">
            <p className="text-sm text-slate-400 text-center">
              Your full compliance checklist contains{" "}
              <span className="text-white font-semibold">
                {totalItems} action items
              </span>{" "}
              across {phases.size} phases.
            </p>
          </div>
        )}

        {/* CTA */}
        <div className="p-6 border-t border-navy-700 text-center">
          <p className="text-slate-400 text-sm mb-4">
            Get the complete checklist with deadlines and article references.
          </p>
          <Button onClick={onDownloadClick}>
            <FileDown className="w-4 h-4 mr-2" />
            Download PDF Report
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
