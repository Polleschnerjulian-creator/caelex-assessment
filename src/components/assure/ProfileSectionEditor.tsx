"use client";

import { motion } from "framer-motion";
import { Info, CheckCircle2, AlertCircle } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";

// ─── Types ───

interface FieldConfig {
  key: string;
  label: string;
  type:
    | "text"
    | "textarea"
    | "number"
    | "select"
    | "date"
    | "json-list"
    | "currency";
  required?: boolean;
  hint?: string;
  options?: string[];
}

interface ProfileSectionEditorProps {
  section: string;
  fields: FieldConfig[];
  values: Record<string, unknown>;
  onChange: (field: string, value: unknown) => void;
  completionScore: number;
}

// ─── Field Renderers ───

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldConfig;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const baseInputClasses =
    "w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2.5 text-body-lg text-white placeholder:text-white/25 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all";

  switch (field.type) {
    case "textarea":
      return (
        <textarea
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.hint || `Enter ${field.label.toLowerCase()}...`}
          rows={4}
          className={`${baseInputClasses} resize-y min-h-[80px]`}
        />
      );

    case "number":
      return (
        <input
          type="number"
          value={(value as number) ?? ""}
          onChange={(e) =>
            onChange(e.target.value === "" ? null : Number(e.target.value))
          }
          placeholder={field.hint || "0"}
          className={baseInputClasses}
        />
      );

    case "currency":
      return (
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-body-lg">
            $
          </span>
          <input
            type="number"
            value={(value as number) ?? ""}
            onChange={(e) =>
              onChange(e.target.value === "" ? null : Number(e.target.value))
            }
            placeholder={field.hint || "0.00"}
            className={`${baseInputClasses} pl-7`}
          />
        </div>
      );

    case "select":
      return (
        <select
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={`${baseInputClasses} appearance-none cursor-pointer`}
        >
          <option value="" className="bg-navy-900 text-white/40">
            Select {field.label.toLowerCase()}...
          </option>
          {field.options?.map((opt) => (
            <option key={opt} value={opt} className="bg-navy-900 text-white">
              {opt}
            </option>
          ))}
        </select>
      );

    case "date":
      return (
        <input
          type="date"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={`${baseInputClasses} [color-scheme:dark]`}
        />
      );

    case "json-list": {
      const listValue = Array.isArray(value) ? value : [];
      return (
        <div className="space-y-2">
          {listValue.map((item: string, idx: number) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                value={item}
                onChange={(e) => {
                  const newList = [...listValue];
                  newList[idx] = e.target.value;
                  onChange(newList);
                }}
                className={baseInputClasses}
              />
              <button
                onClick={() => {
                  const newList = listValue.filter(
                    (_: string, i: number) => i !== idx,
                  );
                  onChange(newList);
                }}
                className="p-2 text-white/30 hover:text-red-400 transition-colors flex-shrink-0"
                aria-label={`Remove item ${idx + 1}`}
              >
                &times;
              </button>
            </div>
          ))}
          <button
            onClick={() => onChange([...listValue, ""])}
            className="text-small text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            + Add item
          </button>
        </div>
      );
    }

    case "text":
    default:
      return (
        <input
          type="text"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.hint || `Enter ${field.label.toLowerCase()}...`}
          className={baseInputClasses}
        />
      );
  }
}

// ─── Component ───

export default function ProfileSectionEditor({
  section,
  fields,
  values,
  onChange,
  completionScore,
}: ProfileSectionEditorProps) {
  const filledCount = fields.filter((f) => {
    const val = values[f.key];
    if (val === null || val === undefined || val === "") return false;
    if (Array.isArray(val) && val.length === 0) return false;
    return true;
  }).length;

  return (
    <GlassCard hover={false} className="p-6">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-heading font-semibold text-white">{section}</h3>
          <p className="text-small text-white/40 mt-0.5">
            {filledCount} of {fields.length} fields completed
          </p>
        </div>

        {/* Completion badge */}
        <div
          className={`
          px-3 py-1.5 rounded-full text-small font-medium
          ${
            completionScore >= 80
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : completionScore >= 50
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                : "bg-red-500/10 text-red-400 border border-red-500/20"
          }
        `}
        >
          {completionScore}% complete
        </div>
      </div>

      {/* Completion bar */}
      <div className="w-full h-1 bg-white/5 rounded-full mb-6 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${completionScore}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={`h-full rounded-full ${
            completionScore >= 80
              ? "bg-emerald-500"
              : completionScore >= 50
                ? "bg-amber-500"
                : "bg-red-500"
          }`}
        />
      </div>

      {/* Fields */}
      <div className="space-y-5">
        {fields.map((field, index) => {
          const hasValue = (() => {
            const val = values[field.key];
            if (val === null || val === undefined || val === "") return false;
            if (Array.isArray(val) && val.length === 0) return false;
            return true;
          })();

          return (
            <motion.div
              key={field.key}
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              {/* Label row */}
              <div className="flex items-center gap-2 mb-1.5">
                {hasValue ? (
                  <CheckCircle2
                    size={14}
                    className="text-emerald-400 flex-shrink-0"
                  />
                ) : field.required ? (
                  <AlertCircle
                    size={14}
                    className="text-red-400 flex-shrink-0"
                  />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full border border-white/20 flex-shrink-0" />
                )}
                <label className="text-body font-medium text-white/80">
                  {field.label}
                  {field.required && (
                    <span className="text-red-400 ml-0.5">*</span>
                  )}
                </label>
              </div>

              {/* Hint */}
              {field.hint &&
                field.type !== "text" &&
                field.type !== "textarea" && (
                  <div className="flex items-start gap-1.5 mb-1.5 ml-5">
                    <Info
                      size={12}
                      className="text-white/20 mt-0.5 flex-shrink-0"
                    />
                    <span className="text-small text-white/30">
                      {field.hint}
                    </span>
                  </div>
                )}

              {/* Input */}
              <div className="ml-5">
                <FieldInput
                  field={field}
                  value={values[field.key]}
                  onChange={(val) => onChange(field.key, val)}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </GlassCard>
  );
}
