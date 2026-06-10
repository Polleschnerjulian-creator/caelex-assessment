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
      aria-label={`${label}: ${description}`}
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      whileTap={{ scale: 0.995 }}
      className={`
        w-full p-5 rounded-xl text-left transition-all duration-300 group backdrop-blur-[10px]
        ${
          isSelected
            ? "bg-black/[0.05] border border-black"
            : "bg-white border border-black/[0.08] hover:bg-black/[0.04] hover:border-black/[0.15]"
        }
      `}
      style={{
        boxShadow: isSelected
          ? "0 4px 16px rgba(0,0,0,0.10)"
          : "0 2px 12px rgba(0,0,0,0.05)",
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
                  ? "bg-black/[0.08]"
                  : "bg-black/[0.04] group-hover:bg-black/[0.06]"
              }
            `}
          >
            <IconComponent
              size={20}
              aria-hidden="true"
              className={isSelected ? "text-[#1d1d1f]" : "text-black/70"}
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3
            className={`text-subtitle font-medium mb-1 ${
              isSelected ? "text-[#1d1d1f]" : "text-[#1d1d1f]"
            }`}
          >
            {label}
          </h3>
          <p className="text-body-lg text-black/45 leading-relaxed">
            {description}
          </p>
        </div>

        {/* Selection Indicator */}
        <div
          className={`
            w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center transition-all
            ${isSelected ? "bg-[#1d1d1f]" : "border border-black/[0.30]"}
          `}
        >
          {isSelected && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
              <Check size={12} className="text-white" aria-hidden="true" />
            </motion.div>
          )}
        </div>
      </div>
    </motion.button>
  );
}
