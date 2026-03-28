"use client";

import { useState } from "react";
import { Check, Send } from "lucide-react";
import type { AstraInteractiveOption } from "@/lib/astra/types";
import { useAstra } from "./AstraProvider";

interface AstraInteractiveInputProps {
  field: string;
  options: AstraInteractiveOption[];
}

export default function AstraInteractiveInput({
  field,
  options,
}: AstraInteractiveInputProps) {
  const { updateMissionData, sendMessage } = useAstra();
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  const [textValue, setTextValue] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleChipSelect = (option: AstraInteractiveOption) => {
    if (submitted) return;
    const value = option.value || option.label;
    setSelectedValue(value);
    setSubmitted(true);
    updateMissionData({ [field]: value });
    sendMessage(value);
  };

  const handleTextSubmit = () => {
    if (submitted || !textValue.trim()) return;
    const value = textValue.trim();
    setSelectedValue(value);
    setSubmitted(true);

    // Parse numeric fields
    const numericFields = ["altitudeKm", "satelliteCount"];
    const parsedValue = numericFields.includes(field)
      ? Number(value) || value
      : value;
    updateMissionData({ [field]: parsedValue });
    sendMessage(value);
  };

  // Render based on option types
  const hasChips = options.some((o) => o.type === "chip");
  const hasTextInput = options.some((o) => o.type === "text_input");

  return (
    <div className="my-2">
      {/* Chip buttons */}
      {hasChips && (
        <div className="flex flex-wrap gap-1.5">
          {options
            .filter((o) => o.type === "chip")
            .map((option) => {
              const isSelected =
                selectedValue === (option.value || option.label);
              return (
                <button
                  key={option.id}
                  onClick={() => handleChipSelect(option)}
                  disabled={submitted}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-full text-caption font-medium
                    transition-all duration-150
                    ${
                      isSelected
                        ? "glass-accent text-emerald-300"
                        : submitted
                          ? "bg-white/[0.02] border border-white/[0.04] text-white/40 cursor-not-allowed"
                          : "glass-surface glass-interactive text-white/70 hover:text-white"
                    }
                  `}
                >
                  {isSelected && <Check size={10} />}
                  {option.label}
                </button>
              );
            })}
        </div>
      )}

      {/* Text input */}
      {hasTextInput && !submitted && (
        <div className="flex items-center gap-2 mt-1.5">
          <input
            type="text"
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleTextSubmit()}
            placeholder={
              options.find((o) => o.type === "text_input")?.label ||
              "Eingabe..."
            }
            className="flex-1 glass-elevated rounded-lg px-3 py-1.5 text-caption text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/30"
          />
          <button
            onClick={handleTextSubmit}
            disabled={!textValue.trim()}
            className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Send size={12} />
          </button>
        </div>
      )}

      {/* Submitted text value display */}
      {hasTextInput && submitted && selectedValue && (
        <div className="flex items-center gap-1.5 mt-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <Check size={10} className="text-emerald-400" />
          <span className="text-caption text-emerald-300">{selectedValue}</span>
        </div>
      )}
    </div>
  );
}
