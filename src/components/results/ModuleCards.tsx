"use client";

import { motion } from "framer-motion";
import { getIcon } from "@/lib/icons";
import { ModuleStatus, ModuleStatusType } from "@/lib/types";
import Card from "@/components/ui/Card";

interface ModuleCardsProps {
  modules: ModuleStatus[];
}

const statusStyles: Record<
  ModuleStatusType,
  { bg: string; border: string; text: string; badge: string }
> = {
  required: {
    bg: "bg-red-500/5",
    border: "border-red-500/30",
    text: "text-red-400",
    badge: "bg-red-500/20 text-red-400",
  },
  simplified: {
    bg: "bg-amber-500/5",
    border: "border-amber-500/30",
    text: "text-amber-400",
    badge: "bg-amber-500/20 text-amber-400",
  },
  recommended: {
    bg: "bg-blue-500/5",
    border: "border-blue-500/30",
    text: "text-blue-400",
    badge: "bg-blue-500/20 text-blue-400",
  },
  not_applicable: {
    bg: "bg-slate-500/5",
    border: "border-slate-500/20",
    text: "text-slate-500",
    badge: "bg-slate-500/20 text-slate-500",
  },
};

const statusLabels: Record<ModuleStatusType, string> = {
  required: "Required",
  simplified: "Simplified",
  recommended: "Recommended",
  not_applicable: "Not Applicable",
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

export default function ModuleCards({ modules }: ModuleCardsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-white">Compliance Modules</h3>
        <div className="text-sm text-slate-500">7 modules analyzed</div>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      >
        {modules.map((module) => {
          const style = statusStyles[module.status];
          const IconComponent = module.icon ? getIcon(module.icon) : null;

          return (
            <motion.div key={module.id} variants={item}>
              <Card
                variant="default"
                padding="none"
                className={`${style.bg} ${style.border} overflow-hidden h-full`}
              >
                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${style.badge}`}
                    >
                      {IconComponent && <IconComponent className="w-5 h-5" />}
                    </div>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${style.badge}`}
                    >
                      {statusLabels[module.status]}
                    </span>
                  </div>

                  {/* Content */}
                  <h4 className="text-white font-medium mb-1">{module.name}</h4>
                  <p className="text-xs text-slate-500 mb-3">
                    {module.description}
                  </p>

                  {/* Stats */}
                  <div className="flex items-center justify-between pt-3 border-t border-navy-700">
                    <span className="text-xs text-slate-500">
                      Relevant articles
                    </span>
                    <span className={`text-sm font-mono ${style.text}`}>
                      {module.articleCount}
                    </span>
                  </div>
                </div>

                {/* Summary bar */}
                {module.status !== "not_applicable" && (
                  <div className="px-5 py-3 bg-navy-900/50 border-t border-navy-700">
                    <p className="text-xs text-slate-400">{module.summary}</p>
                  </div>
                )}
              </Card>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}
