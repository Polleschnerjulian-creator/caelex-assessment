"use client";

import { motion } from "framer-motion";
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
  // Dynamically get the icon component
  const IconComponent = icon ? getIcon(icon) : null;

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={`
        w-full p-5 rounded-xl border-2 text-left transition-all duration-200
        ${
          isSelected
            ? "bg-blue-500/10 border-blue-500 shadow-lg shadow-blue-500/10"
            : "bg-navy-800 border-navy-700 hover:border-navy-600 hover:bg-navy-800/80"
        }
      `}
    >
      <div className="flex items-start gap-4">
        {IconComponent && (
          <div
            className={`
              w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0
              ${isSelected ? "bg-blue-500/20" : "bg-navy-700"}
            `}
          >
            <IconComponent
              className={`w-6 h-6 ${isSelected ? "text-blue-400" : "text-slate-400"}`}
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3
            className={`
              font-semibold text-lg mb-1
              ${isSelected ? "text-white" : "text-slate-200"}
            `}
          >
            {label}
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            {description}
          </p>
        </div>
        {/* Selection indicator */}
        <div
          className={`
            w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0
            ${
              isSelected
                ? "border-blue-500 bg-blue-500"
                : "border-navy-600 bg-transparent"
            }
          `}
        >
          {isSelected && (
            <motion.svg
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-4 h-4 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </motion.svg>
          )}
        </div>
      </div>
    </motion.button>
  );
}
