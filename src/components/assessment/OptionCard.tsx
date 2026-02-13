"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { getIcon } from "@/lib/icons";

interface OptionCardProps {
  label: string;
  description: string;
  icon?: string;
  isSelected?: boolean;
  onClick: () => void;
}

export default function OptionCard({
  label,
  description,
  icon,
  isSelected = false,
  onClick,
}: OptionCardProps) {
  const IconComponent = icon ? getIcon(icon) : null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <motion.button
      role="radio"
      aria-checked={isSelected}
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      whileTap={{ scale: 0.995 }}
      className={`
        w-full p-5 rounded-xl text-left transition-all duration-300 group backdrop-blur-[10px]
        ${
          isSelected
            ? "bg-emerald-500/[0.12] border border-emerald-500/30"
            : "bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.15]"
        }
      `}
      style={{
        boxShadow: isSelected
          ? "inset 0 1px 0 rgba(16,185,129,0.1), 0 4px 24px rgba(0,0,0,0.2)"
          : "inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.2)",
      }}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        {IconComponent && (
          <div
            className={`
              p-2.5 rounded-lg transition-colors
              ${
                isSelected
                  ? "bg-emerald-500/20"
                  : "bg-white/[0.06] group-hover:bg-white/[0.10]"
              }
            `}
          >
            <IconComponent
              size={20}
              className={isSelected ? "text-emerald-400" : "text-white/70"}
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3
            className={`text-[15px] font-medium mb-1 ${
              isSelected ? "text-emerald-400" : "text-white"
            }`}
          >
            {label}
          </h3>
          <p className="text-[14px] text-white/50 leading-relaxed">
            {description}
          </p>
        </div>

        {/* Selection Indicator */}
        <div
          className={`
            w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center transition-all
            ${isSelected ? "bg-emerald-500" : "border border-white/[0.25]"}
          `}
        >
          {isSelected && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
              <Check size={12} className="text-white" />
            </motion.div>
          )}
        </div>
      </div>
    </motion.button>
  );
}
