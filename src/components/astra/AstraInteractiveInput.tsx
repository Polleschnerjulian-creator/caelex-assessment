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
                        ? "bg-gray-900 text-white"
                        : submitted
                          ? "bg-gray-50 border border-gray-200 text-gray-400 cursor-not-allowed"
                          : "bg-white border border-gray-200 text-gray-700 hover:border-gray-300 hover:text-gray-900"
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
            className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-caption text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-400 bg-white"
          />
          <button
            onClick={handleTextSubmit}
            disabled={!textValue.trim()}
            className="p-1.5 rounded-lg bg-gray-900 text-white hover:bg-black transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Send size={12} />
          </button>
        </div>
      )}

      {/* Submitted text value display */}
      {hasTextInput && submitted && selectedValue && (
        <div className="flex items-center gap-1.5 mt-1.5 px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-lg">
          <Check size={10} className="text-gray-600" />
          <span className="text-caption text-gray-700">{selectedValue}</span>
        </div>
      )}
    </div>
  );
}
