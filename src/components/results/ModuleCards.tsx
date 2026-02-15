"use client";

import { motion } from "framer-motion";
import { getIcon } from "@/lib/icons";
import { ModuleStatus, ModuleStatusType } from "@/lib/types";

interface ModuleCardsProps {
  modules: ModuleStatus[];
}

const statusStyles: Record<
  ModuleStatusType,
  { bg: string; border: string; text: string; badge: string }
> = {
  required: {
    bg: "bg-white/[0.06]",
    border: "border-white/[0.20]",
    text: "text-white",
    badge: "bg-white/[0.15] text-white",
  },
  simplified: {
    bg: "bg-white/[0.04]",
    border: "border-white/[0.15]",
    text: "text-white/80",
    badge: "bg-white/[0.10] text-white/80",
  },
  recommended: {
    bg: "bg-white/[0.03]",
    border: "border-white/[0.12]",
    text: "text-white/70",
    badge: "bg-white/[0.08] text-white/70",
  },
  not_applicable: {
    bg: "bg-white/[0.02]",
    border: "border-white/[0.08]",
    text: "text-white/50",
    badge: "bg-white/[0.05] text-white/50",
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
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">
          Compliance Modules
        </span>
        <span className="font-mono text-[11px] text-white/50">
          {modules.length} modules analyzed
        </span>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
      >
        {modules.map((module) => {
          const style = statusStyles[module.status];
          const IconComponent = module.icon ? getIcon(module.icon) : null;

          return (
            <motion.div key={module.id} variants={item}>
              <div
                className={`${style.bg} border ${style.border} rounded-xl overflow-hidden h-full`}
              >
                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center ${style.badge}`}
                      aria-hidden="true"
                    >
                      {IconComponent && <IconComponent className="w-4 h-4" />}
                    </div>
                    <span
                      className={`text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded-full ${style.badge}`}
                    >
                      {statusLabels[module.status]}
                    </span>
                  </div>

                  {/* Content */}
                  <h4 className="text-[14px] text-white font-medium mb-1">
                    {module.name}
                  </h4>
                  <p className="text-[12px] text-white/60 mb-3 leading-relaxed">
                    {module.description}
                  </p>

                  {/* Stats */}
                  <div className="flex items-center justify-between pt-3 border-t border-white/[0.10]">
                    <span className="text-[11px] text-white/50">
                      Relevant articles
                    </span>
                    <span className={`font-mono text-[12px] ${style.text}`}>
                      {module.articleCount}
                    </span>
                  </div>
                </div>

                {/* Summary bar */}
                {module.status !== "not_applicable" && (
                  <div className="px-5 py-3 bg-white/[0.03] border-t border-white/[0.08]">
                    <p className="text-[12px] text-white/60 leading-relaxed">
                      {module.summary}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}
